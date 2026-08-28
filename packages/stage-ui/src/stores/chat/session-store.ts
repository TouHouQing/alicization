import type { ChatHistoryItem } from '../../types/chat'
import type { ChatSessionMeta, ChatSessionRecord, ChatSessionsExport, ChatSessionsIndex } from '../../types/chat-session'

import { alicizationPrimaryConversationSessionId, isStageTamagotchi } from '@proj-alicization/stage-shared'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import { normalizeDialogueStructuredArtifact } from '../../composables/alicization-structured-output'
import { client } from '../../composables/api'
import { useLocalFirstRequest } from '../../composables/use-local-first'
import { chatSessionsRepo } from '../../database/repos/chat-sessions.repo'
import { useAuthStore } from '../auth'
import { useAiriCardStore } from '../modules/airi-card'
import { canonicalizeSessionMessages, mergeLoadedSessionMessages } from './session-message-merge'

export const useChatSessionStore = defineStore('chat-session', () => {
  const { userId, isAuthenticated } = storeToRefs(useAuthStore())
  const { activeCardId } = storeToRefs(useAiriCardStore())

  const activeSessionId = ref<string>('')
  const sessionMessages = ref<Record<string, ChatHistoryItem[]>>({})
  const sessionMetas = ref<Record<string, ChatSessionMeta>>({})
  const sessionGenerations = ref<Record<string, number>>({})
  const index = ref<ChatSessionsIndex | null>(null)

  const ready = ref(false)
  const isReady = computed(() => ready.value)
  const initializing = ref(false)
  let initializePromise: Promise<void> | null = null

  let persistQueue = Promise.resolve()
  let syncQueue = Promise.resolve()
  const loadedSessions = new Set<string>()
  const loadingSessions = new Map<string, Promise<void>>()

  function getCurrentUserId() {
    if (isStageTamagotchi())
      return 'local'
    return userId.value || 'local'
  }

  function getCurrentCharacterId() {
    return activeCardId.value || 'default'
  }

  function enqueuePersist(task: () => Promise<void>) {
    persistQueue = persistQueue.then(task, task)
    return persistQueue
  }

  function enqueueSync(task: () => Promise<void>) {
    syncQueue = syncQueue.then(task, task)
    return syncQueue
  }

  function snapshotMessages(messages: ChatHistoryItem[]) {
    return JSON.parse(JSON.stringify(messages)) as ChatHistoryItem[]
  }

  function isManualAbortErrorMessage(message: ChatHistoryItem) {
    return message.role === 'error'
      && typeof message.content === 'string'
      && message.content.includes('Alicization turn aborted (manual)')
  }

  function sanitizeSessionMessages(messages: ChatHistoryItem[]): ChatHistoryItem[] {
    return messages
      .filter(message => !isManualAbortErrorMessage(message))
      .map((message) => {
        if (message.role !== 'assistant' || !message.structured || typeof message.structured !== 'object')
          return message

        const structured = message.structured as unknown as Record<string, unknown>
        const nextStructured = normalizeDialogueStructuredArtifact(structured) as unknown as typeof message.structured

        if (JSON.stringify(nextStructured) === JSON.stringify(structured))
          return message

        return {
          ...message,
          structured: nextStructured,
        } as ChatHistoryItem
      })
  }

  function extractMessageContent(message: ChatHistoryItem) {
    if (typeof message.content === 'string')
      return message.content
    if (Array.isArray(message.content)) {
      return message.content.map((part) => {
        if (typeof part === 'string')
          return part
        if (part && typeof part === 'object' && 'text' in part)
          return String(part.text ?? '')
        return ''
      }).join('')
    }
    return ''
  }

  function ensureSessionMessageIds(sessionId: string) {
    const current = sessionMessages.value[sessionId] ?? []
    let changed = false
    const next = current.map((message) => {
      if (message.id)
        return message
      changed = true
      return {
        ...message,
        id: nanoid(),
      }
    })

    if (changed)
      sessionMessages.value[sessionId] = next

    return next
  }

  function normalizeMessagesWithIds(messages: ChatHistoryItem[]) {
    const sanitizedMessages = sanitizeSessionMessages(messages)
    let changed = false
    const normalizedWithIds = sanitizedMessages.map((message) => {
      if (message.id)
        return message
      changed = true
      return {
        ...message,
        id: nanoid(),
      }
    })
    const normalized = canonicalizeSessionMessages(normalizedWithIds)
    return {
      normalized,
      changed: changed
        || sanitizedMessages.length !== messages.length
        || normalized.length !== normalizedWithIds.length
        || JSON.stringify(normalized) !== JSON.stringify(normalizedWithIds),
    }
  }

  function buildSyncMessages(messages: ChatHistoryItem[]) {
    return messages.map(message => ({
      id: message.id ?? nanoid(),
      role: message.role,
      content: extractMessageContent(message),
      createdAt: message.createdAt,
    }))
  }

  async function syncSessionToRemote(sessionId: string) {
    let cachedRecord: ChatSessionRecord | null | undefined
    const request = useLocalFirstRequest({
      local: async () => {
        cachedRecord = await chatSessionsRepo.getSession(sessionId)
        return cachedRecord
      },
      remote: async () => {
        if (!cachedRecord)
          cachedRecord = await chatSessionsRepo.getSession(sessionId)
        if (!cachedRecord)
          return cachedRecord

        const members: Array<
          | { type: 'user', userId: string }
          | { type: 'character', characterId: string }
        > = [
          { type: 'user', userId: userId.value },
        ]

        if (cachedRecord.meta.characterId && cachedRecord.meta.characterId !== 'default') {
          members.push({
            type: 'character',
            characterId: cachedRecord.meta.characterId,
          })
        }

        const normalizedMessages = cachedRecord.messages.map(message => message.id ? message : { ...message, id: nanoid() })
        if (normalizedMessages.some((message, index) => cachedRecord?.messages[index]?.id !== message.id)) {
          cachedRecord = {
            ...cachedRecord,
            messages: normalizedMessages,
          }
          await chatSessionsRepo.saveSession(sessionId, cachedRecord)
        }

        const res = await client.api.chats.sync.$post({
          json: {
            chat: {
              id: cachedRecord.meta.sessionId,
              type: 'group',
              title: cachedRecord.meta.title,
              createdAt: cachedRecord.meta.createdAt,
              updatedAt: cachedRecord.meta.updatedAt,
            },
            members,
            messages: buildSyncMessages(cachedRecord.messages),
          },
        })

        if (!res.ok)
          throw new Error('Failed to sync chat session')
        return cachedRecord
      },
      allowRemote: () => isAuthenticated.value,
      lazy: true,
    })

    await request.execute()
  }

  function scheduleSync(sessionId: string) {
    void enqueueSync(async () => {
      try {
        await syncSessionToRemote(sessionId)
      }
      catch (error) {
        console.warn('Failed to sync chat session', error)
      }
    })
  }

  function ensureGeneration(sessionId: string) {
    if (sessionGenerations.value[sessionId] === undefined)
      sessionGenerations.value[sessionId] = 0
  }

  async function loadIndexForUser(currentUserId: string) {
    const stored = await chatSessionsRepo.getIndex(currentUserId)
    index.value = stored ?? {
      userId: currentUserId,
      characters: {},
    }
  }

  function getCharacterIndex(characterId: string) {
    if (!index.value)
      return null
    return index.value.characters[characterId] ?? null
  }

  async function persistIndex() {
    if (!index.value)
      return
    const snapshot = JSON.parse(JSON.stringify(index.value)) as ChatSessionsIndex
    await enqueuePersist(() => chatSessionsRepo.saveIndex(snapshot))
  }

  async function persistSession(sessionId: string) {
    const meta = sessionMetas.value[sessionId]
    if (!meta)
      return
    const currentMessages = ensureSessionMessageIds(sessionId)
    const canonicalMessages = canonicalizeSessionMessages(currentMessages)
    if (JSON.stringify(canonicalMessages) !== JSON.stringify(currentMessages)) {
      const current = sessionMessages.value[sessionId]
      if (current)
        current.splice(0, current.length, ...canonicalMessages)
    }
    const messages = snapshotMessages(sessionMessages.value[sessionId] ?? canonicalMessages)
    const now = Date.now()
    const updatedMeta = {
      ...meta,
      updatedAt: now,
    }

    sessionMetas.value[sessionId] = updatedMeta
    const characterIndex = index.value?.characters[meta.characterId]
    if (characterIndex)
      characterIndex.sessions[sessionId] = updatedMeta

    const record: ChatSessionRecord = {
      meta: updatedMeta,
      messages,
    }

    await enqueuePersist(() => chatSessionsRepo.saveSession(sessionId, record))
    await persistIndex()
    scheduleSync(sessionId)
  }

  function persistSessionMessages(sessionId: string) {
    void persistSession(sessionId)
  }

  function setSessionMessages(sessionId: string, next: ChatHistoryItem[]) {
    const sanitizedNext = sanitizeSessionMessages(next)
    const current = sessionMessages.value[sessionId]
    if (current) {
      current.splice(0, current.length, ...sanitizedNext)
    }
    else {
      sessionMessages.value[sessionId] = sanitizedNext
    }
    void persistSession(sessionId)
  }

  async function loadSession(sessionId: string) {
    if (loadedSessions.has(sessionId))
      return
    if (loadingSessions.has(sessionId)) {
      await loadingSessions.get(sessionId)
      return
    }

    const loadPromise = (async () => {
      const stored = await chatSessionsRepo.getSession(sessionId)
      if (stored) {
        const { normalized: normalizedStoredMessages, changed } = normalizeMessagesWithIds(stored.messages)
        if (changed) {
          await chatSessionsRepo.saveSession(sessionId, {
            ...stored,
            messages: normalizedStoredMessages,
          })
        }

        const localMessages = sanitizeSessionMessages(sessionMessages.value[sessionId] ?? [])
        const hasLocalMessages = localMessages.length > 0
        const mergedMessages = hasLocalMessages
          ? mergeLoadedSessionMessages(normalizedStoredMessages, localMessages)
          : canonicalizeSessionMessages(normalizedStoredMessages)

        sessionMetas.value[sessionId] = stored.meta
        const current = sessionMessages.value[sessionId]
        if (current) {
          current.splice(0, current.length, ...mergedMessages)
        }
        else {
          sessionMessages.value[sessionId] = mergedMessages
        }
        ensureGeneration(sessionId)
      }
      loadedSessions.add(sessionId)
    })()

    loadingSessions.set(sessionId, loadPromise)
    await loadPromise
    loadingSessions.delete(sessionId)
  }

  async function createPrimarySession(characterId: string, options?: { messages?: ChatHistoryItem[], title?: string }) {
    const currentUserId = getCurrentUserId()
    const sessionId = alicizationPrimaryConversationSessionId(characterId)
    const now = Date.now()
    const meta: ChatSessionMeta = {
      sessionId,
      userId: currentUserId,
      characterId,
      title: options?.title,
      createdAt: now,
      updatedAt: now,
    }

    const initialMessages = options?.messages?.length ? sanitizeSessionMessages(options.messages) : []

    sessionMetas.value[sessionId] = meta
    sessionMessages.value[sessionId] = initialMessages
    ensureGeneration(sessionId)

    if (!index.value)
      index.value = { userId: currentUserId, characters: {} }

    const characterIndex = index.value.characters[characterId] ?? {
      activeSessionId: sessionId,
      sessions: {},
    }
    characterIndex.sessions[sessionId] = meta
    characterIndex.activeSessionId = sessionId
    index.value.characters[characterId] = characterIndex

    const record: ChatSessionRecord = { meta, messages: initialMessages }

    activeSessionId.value = sessionId

    // NOTICE: mark the primary session as loaded to prevent async loadSession() from
    // clobbering fresh in-memory messages with a stale persisted snapshot during reset races.
    loadedSessions.add(sessionId)

    await enqueuePersist(() => chatSessionsRepo.saveSession(sessionId, record))
    await persistIndex()
    scheduleSync(sessionId)

    return sessionId
  }

  async function ensureExternalSession(sessionIdRaw: string, options?: { setActive?: boolean, title?: string }) {
    if (!sessionIdRaw.trim())
      return ''

    // Main-process delivery and replay may carry an older session id. It is
    // an event correlation value, never permission to create another dialogue.
    const primarySessionId = await ensureActiveSessionForCharacter(options?.title)
    return primarySessionId
  }

  async function ensureActiveSessionForCharacter(title?: string) {
    const currentUserId = getCurrentUserId()
    const characterId = getCurrentCharacterId()

    if (!index.value || index.value.userId !== currentUserId)
      await loadIndexForUser(currentUserId)

    const characterIndex = getCharacterIndex(characterId)
    if (!characterIndex) {
      return await createPrimarySession(characterId, { title })
    }

    const primarySessionId = alicizationPrimaryConversationSessionId(characterId)
    const legacySessionIds = Object.keys(characterIndex.sessions)
    const sourceSessionId = characterIndex.sessions[primarySessionId]
      ? primarySessionId
      : characterIndex.activeSessionId && characterIndex.sessions[characterIndex.activeSessionId]
        ? characterIndex.activeSessionId
        : legacySessionIds
          .map(sessionId => characterIndex.sessions[sessionId])
          .sort((left, right) =>
            right.updatedAt - left.updatedAt
            || right.createdAt - left.createdAt
            || left.sessionId.localeCompare(right.sessionId))[0]
          ?.sessionId

    if (!sourceSessionId) {
      return await createPrimarySession(characterId, { title })
    }

    const sourceRecord = loadedSessions.has(sourceSessionId)
      ? null
      : await chatSessionsRepo.getSession(sourceSessionId)
    const sourceMessages = sessionMessages.value[sourceSessionId]
      ?? sourceRecord?.messages
      ?? []
    const normalizedMessages = normalizeMessagesWithIds(sourceMessages).normalized
    const sourceMeta = sourceRecord?.meta ?? characterIndex.sessions[sourceSessionId]
    const now = Date.now()
    const primaryMeta: ChatSessionMeta = {
      sessionId: primarySessionId,
      userId: currentUserId,
      characterId,
      ...(sourceMeta?.title || title ? { title: sourceMeta?.title || title } : {}),
      createdAt: sourceMeta?.createdAt ?? now,
      updatedAt: Math.max(sourceMeta?.updatedAt ?? now, now),
    }

    sessionMetas.value[primarySessionId] = primaryMeta
    sessionMessages.value[primarySessionId] = normalizedMessages
    ensureGeneration(primarySessionId)
    loadedSessions.add(primarySessionId)

    characterIndex.activeSessionId = primarySessionId
    characterIndex.sessions = {
      [primarySessionId]: primaryMeta,
    }
    const currentIndex = index.value
    if (!currentIndex)
      return primarySessionId
    currentIndex.characters[characterId] = characterIndex
    activeSessionId.value = primarySessionId
    await enqueuePersist(() => chatSessionsRepo.saveSession(primarySessionId, {
      meta: primaryMeta,
      messages: snapshotMessages(normalizedMessages),
    }))
    await persistIndex()
    for (const sessionId of legacySessionIds) {
      if (sessionId !== primarySessionId) {
        await enqueuePersist(() => chatSessionsRepo.deleteSession(sessionId))
        delete sessionMessages.value[sessionId]
        delete sessionMetas.value[sessionId]
        delete sessionGenerations.value[sessionId]
        loadedSessions.delete(sessionId)
      }
    }
    scheduleSync(primarySessionId)
    return primarySessionId
  }

  async function initialize() {
    if (ready.value)
      return
    if (initializePromise)
      return initializePromise
    initializing.value = true
    initializePromise = (async () => {
      await ensureActiveSessionForCharacter()
      ready.value = true
    })()

    try {
      await initializePromise
    }
    finally {
      initializePromise = null
      initializing.value = false
    }
  }

  function ensureSession(sessionId: string) {
    ensureGeneration(sessionId)
    if (!sessionMessages.value[sessionId]) {
      sessionMessages.value[sessionId] = []
    }
  }

  const messages = computed<ChatHistoryItem[]>({
    get: () => {
      if (!activeSessionId.value)
        return []
      ensureSession(activeSessionId.value)
      return sessionMessages.value[activeSessionId.value] ?? []
    },
    set: (value) => {
      if (!activeSessionId.value)
        return
      const current = sessionMessages.value[activeSessionId.value]
      if (current) {
        current.splice(0, current.length, ...sanitizeSessionMessages(value))
      }
      else {
        sessionMessages.value[activeSessionId.value] = sanitizeSessionMessages(value)
      }
      void persistSession(activeSessionId.value)
    },
  })

  function setActiveSession(_sessionId: string) {
    const primarySessionId = alicizationPrimaryConversationSessionId(getCurrentCharacterId())
    activeSessionId.value = primarySessionId
    ensureSession(primarySessionId)

    const characterId = getCurrentCharacterId()
    const characterIndex = index.value?.characters[characterId]
    if (characterIndex) {
      characterIndex.activeSessionId = primarySessionId
      void persistIndex()
    }

    if (ready.value)
      void loadSession(primarySessionId)
  }

  function cleanupMessages(sessionId = activeSessionId.value) {
    ensureGeneration(sessionId)
    sessionGenerations.value[sessionId] += 1
    setSessionMessages(sessionId, [])
  }

  function getAllSessions() {
    return JSON.parse(JSON.stringify(sessionMessages.value)) as Record<string, ChatHistoryItem[]>
  }

  async function resetAllSessions() {
    const currentUserId = getCurrentUserId()
    const characterId = getCurrentCharacterId()
    const sessionIds = new Set<string>()

    if (index.value?.userId === currentUserId) {
      for (const character of Object.values(index.value.characters)) {
        for (const sessionId of Object.keys(character.sessions))
          sessionIds.add(sessionId)
      }
    }

    sessionMessages.value = {}
    sessionMetas.value = {}
    sessionGenerations.value = {}
    loadedSessions.clear()
    loadingSessions.clear()

    index.value = {
      userId: currentUserId,
      characters: {},
    }

    const nextActiveSessionId = await createPrimarySession(characterId)

    for (const sessionId of sessionIds) {
      if (sessionId === nextActiveSessionId)
        continue
      await enqueuePersist(() => chatSessionsRepo.deleteSession(sessionId))
    }
  }

  function getSessionMessages(sessionId: string) {
    ensureSession(sessionId)
    return sessionMessages.value[sessionId] ?? []
  }

  async function ensureSessionReady(sessionId: string) {
    ensureSession(sessionId)
    await loadSession(sessionId)
  }

  function getSessionGeneration(sessionId: string) {
    ensureGeneration(sessionId)
    return sessionGenerations.value[sessionId] ?? 0
  }

  function bumpSessionGeneration(sessionId: string) {
    ensureGeneration(sessionId)
    sessionGenerations.value[sessionId] += 1
    return sessionGenerations.value[sessionId]
  }

  function getSessionGenerationValue(sessionId?: string) {
    const target = sessionId ?? activeSessionId.value
    return getSessionGeneration(target)
  }

  async function forkSession(options: { fromSessionId: string, atIndex?: number, reason?: string, hidden?: boolean }) {
    // Forks would create a second continuity root. Keep the API as an internal
    // compatibility surface, but route every request back to the sole session.
    void options
    return await ensureActiveSessionForCharacter()
  }

  async function exportSessions(): Promise<ChatSessionsExport> {
    if (!ready.value)
      await initialize()

    if (!index.value) {
      return {
        format: 'chat-sessions-index:v1',
        index: { userId: getCurrentUserId(), characters: {} },
        sessions: {},
      }
    }

    const sessions: Record<string, ChatSessionRecord> = {}
    for (const character of Object.values(index.value.characters)) {
      for (const sessionId of Object.keys(character.sessions)) {
        const stored = await chatSessionsRepo.getSession(sessionId)
        if (stored) {
          sessions[sessionId] = stored
          continue
        }
        const meta = sessionMetas.value[sessionId]
        const messages = sessionMessages.value[sessionId]
        if (meta && messages)
          sessions[sessionId] = { meta, messages }
      }
    }

    return {
      format: 'chat-sessions-index:v1',
      index: index.value,
      sessions,
    }
  }

  async function importSessions(payload: ChatSessionsExport) {
    if (payload.format !== 'chat-sessions-index:v1')
      return

    index.value = payload.index
    sessionMessages.value = {}
    sessionMetas.value = {}
    sessionGenerations.value = {}
    loadedSessions.clear()
    loadingSessions.clear()

    await enqueuePersist(() => chatSessionsRepo.saveIndex(payload.index))

    for (const [sessionId, record] of Object.entries(payload.sessions)) {
      const sanitizedMessages = sanitizeSessionMessages(record.messages)
      sessionMetas.value[sessionId] = record.meta
      sessionMessages.value[sessionId] = sanitizedMessages
      ensureGeneration(sessionId)
      await enqueuePersist(() => chatSessionsRepo.saveSession(sessionId, {
        ...record,
        messages: sanitizedMessages,
      }))
    }

    await ensureActiveSessionForCharacter()
  }

  watch(activeCardId, () => {
    if (!ready.value)
      return
    void ensureActiveSessionForCharacter()
  })

  return {
    ready,
    isReady,
    initialize,

    activeSessionId,
    messages,

    setActiveSession,
    cleanupMessages,
    getAllSessions,
    resetAllSessions,

    ensureSession,
    setSessionMessages,
    persistSessionMessages,
    getSessionMessages,
    ensureExternalSession,
    ensureSessionReady,
    sessionMessages,
    sessionMetas,
    getSessionGeneration,
    bumpSessionGeneration,
    getSessionGenerationValue,

    forkSession,
    exportSessions,
    importSessions,
  }
})
