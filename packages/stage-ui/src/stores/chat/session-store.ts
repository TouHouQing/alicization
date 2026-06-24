import type { ChatHistoryItem } from '../../types/chat'
import type { ChatSessionMeta, ChatSessionRecord, ChatSessionsExport, ChatSessionsIndex } from '../../types/chat-session'

import {
  isAlicizationThinProjectAwarenessLine,
  isStageTamagotchi,
  isAlicizationThinSamePhaseCarryLine as isThinSamePhaseCarryLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  scoreAlicizationProjectAwarenessLine,
} from '@proj-alicization/stage-shared'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import {
  normalizeStructuredPreDialogueAwarenessPayload,
  normalizeStructuredPreDialogueClosurePayload,
  normalizeStructuredProjectStatePayload,
} from '../../composables/alicization-structured-output'
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

  function buildRestoredProjectAwarenessLine(input: {
    identity: string
    currentPhase: string
    primaryOpenLoop: string
    sameHerSelfLine: string
  }) {
    const compactIdentity = input.identity
      .replace(/\s+rather than a better chat wrapper\.?$/u, '')
      .replace(/\s+on the host computer\.?$/u, '')
      .trim()
      .slice(0, 120)
    const compactPhase = input.currentPhase.split('. ')[0]?.trim() ?? input.currentPhase.trim()
    const compactOpenLoop = input.primaryOpenLoop
      .split(' so ')[0]
      ?.replace(/[.。!！?？;；:：]+$/u, '')
      .trim()
      .slice(0, 120) ?? input.primaryOpenLoop.trim().slice(0, 120)
    const compactSameHer = input.sameHerSelfLine.trim().slice(0, 110)
    return [
      `Before answering, remember: ${compactIdentity}`,
      `She is still inside ${compactPhase}`,
      `The still-open closure is ${compactOpenLoop}`,
      compactSameHer,
    ].join('. ').replace(/\s+/g, ' ').slice(0, 320).trim() || null
  }

  function isSameHerInwardLowPressureHeadline(value: string | null | undefined) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (!normalized)
      return false

    return normalized.includes('holding together mainly through')
      && normalized.includes('low-pressure')
      && (
        normalized.includes('same line inward')
        || normalized.includes('same living line')
        || normalized.includes('same-her-inward-carry')
        || normalized.includes('quiet-companionship')
      )
  }

  function buildCompactSameHerInwardLowPressureAwarenessLine(companionBriefingLine: string) {
    return `${companionBriefingLine} Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.`
  }

  function isAnthropomorphicHostFacingSameHerHeadline(value: string | null | undefined) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (!normalized)
      return false

    return normalized.includes('anthropomorphic emotional closure')
      && normalized.includes('same-her inward-carry observability')
      && normalized.includes('measured-return')
  }

  function buildCompactAnthropomorphicHostFacingAwarenessLine(companionBriefingLine: string) {
    return `${companionBriefingLine} Right now this one living her still needs anthropomorphic emotional closure and same-her inward-carry observability to stay on one measured-return line before anything reopens outward.`
  }

  function maybeBackfillRestoredPreDialogueAwareness(
    projectState: ReturnType<typeof normalizeStructuredProjectStatePayload> | null,
    preDialogueAwareness: ReturnType<typeof normalizeStructuredPreDialogueAwarenessPayload> | null,
    preferredEmotionalClosureCue: string | null,
  ) {
    if (
      !projectState?.identity
      || !projectState.currentPhase
      || !projectState.primaryOpenLoop
      || !projectState.nextClosureTarget
    ) {
      return preDialogueAwareness
    }

    const persistedSummary = preDialogueAwareness?.summaryLine?.trim() || ''
    const persistedAwarenessLine = preDialogueAwareness?.awarenessLine?.trim() || ''
    const persistedBriefingLine = preDialogueAwareness?.companionBriefingLine?.trim() || ''
    const persistedCompanionHeadlineLine = preDialogueAwareness?.companionHeadlineLine?.trim() || ''
    const persistedNextClosureLine = preDialogueAwareness?.companionNextClosureLine?.trim() || ''
    const looksLikeThinReminder = (value: string) => {
      const normalized = value.trim().toLowerCase()
      if (!normalized)
        return false

      return isAlicizationThinProjectAwarenessLine(normalized)
        || isThinSamePhaseCarryLine(normalized)
        || normalized.includes('generic continuity reminder')
        || normalized.includes('generic awareness reminder')
        || normalized.includes('generic awareness summary')
        || normalized.includes('generic same-her reminder')
    }
    const looksLikeThinNextClosureLine = (value: string) => {
      const normalized = value.trim().toLowerCase()
      if (!normalized)
        return true

      return normalized.includes('generic next target')
        || normalized.includes('generic next closure')
        || normalized.includes('generic closure shell')
        || normalized.includes('generic closure summary')
        || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
    }
    const carriesBroaderProjectFrame = (value: string) => /\b(?:project|digital life project|life loop|still-open|what has landed|before speaking|before answering|local-first digital life)\b/i.test(value)
      || /数字生命项目|闭环|主线|已落地|开口前|先记住/u.test(value)
    const persistedLooksThin = Boolean(preDialogueAwareness) && (
      (!persistedAwarenessLine && !persistedBriefingLine)
      || looksLikeThinReminder(persistedSummary)
      || looksLikeThinReminder(persistedAwarenessLine)
    )
    const richerPersistedProjectAwareOpening = looksLikeThinReminder(persistedSummary)
      ? [
          persistedAwarenessLine,
          persistedBriefingLine,
        ].find((value): value is string => Boolean(
          value
          && !looksLikeThinReminder(value)
          && carriesBroaderProjectFrame(value)
          && scoreAlicizationProjectAwarenessLine(value) > 0,
        )) ?? null
      : null

    const sameHerSelfLine = projectState.sameHerSelfLine
      ?? 'Keep one continuous her explicit from self-understanding into the final host-visible reply.'
    const sameHerHoldDetail = projectState.sameHerHoldDetail?.trim() || null
    const shouldPreferSameHerHoldDetail = Boolean(
      preDialogueAwareness
      && persistedLooksThin
      && sameHerHoldDetail
      && (
        looksLikeThinReminder(persistedAwarenessLine)
        || looksLikeThinReminder(persistedSummary)
        || looksLikeThinReminder(persistedBriefingLine)
      ),
    )
    const shouldRebuildAwarenessFromBaseProjectState = Boolean(
      preDialogueAwareness
      && persistedLooksThin
      && !shouldPreferSameHerHoldDetail
      && isAlicizationThinProjectAwarenessLine(
        persistedAwarenessLine
        || persistedSummary
        || persistedBriefingLine,
      ),
    )
    const preferredSameHerBriefingLine = shouldPreferSameHerHoldDetail
      ? sameHerHoldDetail
      : sameHerSelfLine
    const awarenessLine = buildRestoredProjectAwarenessLine({
      identity: projectState.identity,
      currentPhase: projectState.currentPhase,
      primaryOpenLoop: projectState.primaryOpenLoop,
      sameHerSelfLine,
    })
    const normalizedContinuitySummary = projectState.continuitySummary?.trim() || ''
    const preferredContinuitySummary = normalizedContinuitySummary
      && !looksLikeThinReminder(normalizedContinuitySummary)
      ? normalizedContinuitySummary
      : null
    const resolvedSameHerSelfLineSeed = shouldRebuildAwarenessFromBaseProjectState
      ? null
      : sameHerSelfLine
    const resolvedSameHerDriftRiskSeed = shouldRebuildAwarenessFromBaseProjectState
      ? null
      : (projectState.sameHerDriftRisk ?? null)
    const resolvedFallbackCompanionBriefingLine = shouldPreferSameHerHoldDetail
      ? preferredSameHerBriefingLine
      : shouldRebuildAwarenessFromBaseProjectState
        ? null
        : (persistedBriefingLine || preferredSameHerBriefingLine)
    const resolvedFallbackAwarenessSummary = shouldPreferSameHerHoldDetail
      ? (preferredContinuitySummary || awarenessLine)
      : shouldRebuildAwarenessFromBaseProjectState
        ? null
        : (preferredContinuitySummary || richerPersistedProjectAwareOpening || awarenessLine)
    const mergedInwardLowPressureAwarenessLine = (
      persistedAwarenessLine
      && persistedCompanionHeadlineLine
      && persistedAwarenessLine === persistedCompanionHeadlineLine
      && isThinSamePhaseCarryLine(persistedBriefingLine)
      && isSameHerInwardLowPressureHeadline(persistedCompanionHeadlineLine)
    )
      ? buildCompactSameHerInwardLowPressureAwarenessLine(persistedBriefingLine)
      : null
    const mergedAnthropomorphicHostFacingAwarenessLine = (
      persistedAwarenessLine
      && persistedCompanionHeadlineLine
      && persistedAwarenessLine === persistedCompanionHeadlineLine
      && isThinSamePhaseCarryLine(persistedBriefingLine)
      && isAnthropomorphicHostFacingSameHerHeadline(persistedCompanionHeadlineLine)
    )
      ? buildCompactAnthropomorphicHostFacingAwarenessLine(persistedBriefingLine)
      : null
    const nextClosureTargetReason = /[.。!！?？]$/u.test(projectState.nextClosureTarget)
      ? `Next closure target is still ${projectState.nextClosureTarget}`
      : `Next closure target is still ${projectState.nextClosureTarget}.`
    const reasonPreview = [
      projectState.latestLandedProgress ?? null,
      projectState.primaryOpenLoop,
      projectState.proactiveSameHerGap ?? null,
      nextClosureTargetReason,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    const mergedReasonPreview = [
      ...(preDialogueAwareness?.reasonPreview ?? []),
      ...reasonPreview,
    ].filter((value, index, values) => typeof value === 'string' && value.trim().length > 0 && values.indexOf(value) === index)

    const restoredAwareness = {
      status: 'grounded' as const,
      summaryLine: preferredContinuitySummary || awarenessLine,
      companionHeadlineLine: null,
      companionBriefingLine: sameHerSelfLine,
      companionNextClosureLine: projectState.nextClosureTarget,
      awarenessLine,
      emotionalClosureCue: preferredEmotionalClosureCue,
      reasonPreview,
    }

    if (!preDialogueAwareness)
      return restoredAwareness

    const shouldUpgradeNextClosureFromPersistedAudit = looksLikeThinNextClosureLine(persistedNextClosureLine)
    const upgradedEmotionalClosureCue = preDialogueAwareness.emotionalClosureCue ?? preferredEmotionalClosureCue
    const mergedReasonPreviewChanged = mergedReasonPreview.length !== (preDialogueAwareness.reasonPreview?.length ?? 0)

    if (!persistedLooksThin) {
      if (
        !mergedInwardLowPressureAwarenessLine
        && !shouldUpgradeNextClosureFromPersistedAudit
        && upgradedEmotionalClosureCue === preDialogueAwareness.emotionalClosureCue
        && !mergedReasonPreviewChanged
      ) {
        return preDialogueAwareness
      }

      return {
        ...preDialogueAwareness,
        status: preDialogueAwareness.status ?? 'grounded',
        awarenessLine: mergedAnthropomorphicHostFacingAwarenessLine ?? mergedInwardLowPressureAwarenessLine ?? preDialogueAwareness.awarenessLine,
        companionHeadlineLine: preDialogueAwareness.companionHeadlineLine ?? null,
        companionNextClosureLine: shouldUpgradeNextClosureFromPersistedAudit
          ? projectState.nextClosureTarget
          : (persistedNextClosureLine || projectState.nextClosureTarget),
        emotionalClosureCue: upgradedEmotionalClosureCue,
        reasonPreview: mergedReasonPreview,
      }
    }

    return {
      ...preDialogueAwareness,
      status: preDialogueAwareness.status ?? 'grounded',
      summaryLine: richerPersistedProjectAwareOpening ?? restoredAwareness.summaryLine,
      companionHeadlineLine: preDialogueAwareness.companionHeadlineLine ?? null,
      companionBriefingLine: preferredSameHerBriefingLine,
      companionNextClosureLine: persistedLooksThin
        ? projectState.nextClosureTarget
        : (preDialogueAwareness.companionNextClosureLine?.trim()
          || projectState.nextClosureTarget),
      awarenessLine: resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          preDialogueAwarenessLine: shouldPreferSameHerHoldDetail
            ? sameHerHoldDetail
            : (richerPersistedProjectAwareOpening ?? null),
          awarenessLine: shouldPreferSameHerHoldDetail
            ? sameHerHoldDetail
            : (richerPersistedProjectAwareOpening ?? null),
          companionHeadlineLine: preDialogueAwareness.companionHeadlineLine ?? null,
          companionBriefingLine: shouldPreferSameHerHoldDetail
            ? preferredSameHerBriefingLine
            : (persistedBriefingLine || null),
          preDialogueAwarenessSummary: null,
          emotionalClosureSummary: preDialogueAwareness.emotionalClosureCue ?? preferredEmotionalClosureCue,
          latestLandedProgress: projectState.latestLandedProgress ?? null,
          landedProgressSummary: projectState.latestLandedProgress ?? null,
          primaryOpenLoop: projectState.primaryOpenLoop,
          openClosureSummary: projectState.primaryOpenLoop,
          nextClosureTarget: projectState.nextClosureTarget,
          nextClosureTargetSummary: projectState.nextClosureTarget,
          sameHerSelfLine: resolvedSameHerSelfLineSeed,
          sameHerHoldDetail: shouldPreferSameHerHoldDetail ? sameHerHoldDetail : null,
          sameHerDriftRisk: resolvedSameHerDriftRiskSeed,
          sameHerDriftRiskSummary: resolvedSameHerDriftRiskSeed,
          proactiveSameHerGap: projectState.proactiveSameHerGap ?? null,
        },
        fallbackProjectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          preDialogueAwarenessLine: shouldPreferSameHerHoldDetail
            ? sameHerHoldDetail
            : (richerPersistedProjectAwareOpening ?? null),
          awarenessLine: shouldPreferSameHerHoldDetail
            ? sameHerHoldDetail
            : (richerPersistedProjectAwareOpening ?? null),
          companionBriefingLine: resolvedFallbackCompanionBriefingLine,
          preDialogueAwarenessSummary: resolvedFallbackAwarenessSummary,
          latestLandedProgress: projectState.latestLandedProgress ?? null,
          landedProgressSummary: projectState.latestLandedProgress ?? null,
          primaryOpenLoop: projectState.primaryOpenLoop,
          openClosureSummary: projectState.primaryOpenLoop,
          nextClosureTarget: projectState.nextClosureTarget,
          nextClosureTargetSummary: projectState.nextClosureTarget,
          emotionalClosureSummary: preDialogueAwareness.emotionalClosureCue ?? preferredEmotionalClosureCue,
          sameHerSelfLine: resolvedSameHerSelfLineSeed,
          sameHerHoldDetail: shouldPreferSameHerHoldDetail ? sameHerHoldDetail : null,
          sameHerDriftRisk: resolvedSameHerDriftRiskSeed,
          sameHerDriftRiskSummary: resolvedSameHerDriftRiskSeed,
          proactiveSameHerGap: projectState.proactiveSameHerGap ?? null,
        },
      }),
      emotionalClosureCue: upgradedEmotionalClosureCue,
      reasonPreview: mergedReasonPreview,
    }
  }

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

  function sanitizeSessionMessages(messages: ChatHistoryItem[]) {
    return messages
      .filter(message => !isManualAbortErrorMessage(message))
      .map((message) => {
        if (message.role !== 'assistant' || !message.structured || typeof message.structured !== 'object')
          return message

        const visibleReplyRealization = message.structured.visibleReplyRealization
          && typeof message.structured.visibleReplyRealization === 'object'
          ? message.structured.visibleReplyRealization as {
            projectStateAudit?: {
              currentPhaseSummary?: unknown
              sameHerHoldDetail?: unknown
              nextClosureTargetSummary?: unknown
              emotionalClosureSummary?: unknown
              sameHerDriftRiskSummary?: unknown
              sameHerDriftRisk?: unknown
              proactiveSameHerGapSummary?: unknown
            } | null
          }
          : null
        const projectStateAudit = visibleReplyRealization?.projectStateAudit
          && typeof visibleReplyRealization.projectStateAudit === 'object'
          ? visibleReplyRealization.projectStateAudit
          : null
        const normalizedProjectState = normalizeStructuredProjectStatePayload(
          (message.structured.projectState ?? null) as Record<string, unknown> | null,
        ) ?? null
        const restoredProjectState = normalizedProjectState
          ? normalizeStructuredProjectStatePayload({
            ...normalizedProjectState,
            currentPhase:
                (typeof projectStateAudit?.currentPhaseSummary === 'string'
                  ? projectStateAudit.currentPhaseSummary
                  : normalizedProjectState.currentPhase) ?? null,
            nextClosureTarget:
                (typeof projectStateAudit?.nextClosureTargetSummary === 'string'
                  ? projectStateAudit.nextClosureTargetSummary
                  : normalizedProjectState.nextClosureTarget) ?? null,
            sameHerHoldDetail:
                (typeof projectStateAudit?.sameHerHoldDetail === 'string'
                  ? projectStateAudit.sameHerHoldDetail
                  : normalizedProjectState.sameHerHoldDetail) ?? null,
            sameHerDriftRisk:
                (typeof projectStateAudit?.sameHerDriftRiskSummary === 'string'
                  ? projectStateAudit.sameHerDriftRiskSummary
                  : typeof projectStateAudit?.sameHerDriftRisk === 'string'
                    ? projectStateAudit.sameHerDriftRisk
                    : normalizedProjectState.sameHerDriftRisk) ?? null,
            proactiveSameHerGap:
                (typeof projectStateAudit?.proactiveSameHerGapSummary === 'string'
                  ? projectStateAudit.proactiveSameHerGapSummary
                  : normalizedProjectState.proactiveSameHerGap) ?? null,
          })
          ?? normalizedProjectState
          : null
        const normalizedPreDialogueClosure = normalizeStructuredPreDialogueClosurePayload(
          (message.structured.preDialogueClosure ?? null) as Record<string, unknown> | null,
        ) ?? null
        const normalizedPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(
          (message.structured.preDialogueAwareness ?? null) as Record<string, unknown> | null,
        ) ?? null
        const preferredEmotionalClosureCue
          = typeof projectStateAudit?.emotionalClosureSummary === 'string'
            ? projectStateAudit.emotionalClosureSummary
            : null
        const restoredPreDialogueAwareness = maybeBackfillRestoredPreDialogueAwareness(
          restoredProjectState,
          normalizedPreDialogueAwareness,
          preferredEmotionalClosureCue,
        )

        if (
          restoredProjectState === (message.structured.projectState ?? null)
          && normalizedPreDialogueClosure === (message.structured.preDialogueClosure ?? null)
          && restoredPreDialogueAwareness === (message.structured.preDialogueAwareness ?? null)
        ) {
          return message
        }

        return {
          ...message,
          structured: {
            ...message.structured,
            projectState: restoredProjectState,
            preDialogueClosure: normalizedPreDialogueClosure,
            preDialogueAwareness: restoredPreDialogueAwareness,
          },
        }
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

  async function createSession(characterId: string, options?: { setActive?: boolean, messages?: ChatHistoryItem[], title?: string }) {
    const currentUserId = getCurrentUserId()
    const sessionId = nanoid()
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
    if (options?.setActive !== false)
      characterIndex.activeSessionId = sessionId
    index.value.characters[characterId] = characterIndex

    const record: ChatSessionRecord = { meta, messages: initialMessages }

    if (options?.setActive !== false)
      activeSessionId.value = sessionId

    // NOTICE: mark just-created session as loaded to prevent async loadSession() from
    // clobbering fresh in-memory messages with a stale persisted snapshot during reset races.
    loadedSessions.add(sessionId)

    await enqueuePersist(() => chatSessionsRepo.saveSession(sessionId, record))
    await persistIndex()
    scheduleSync(sessionId)

    return sessionId
  }

  async function ensureExternalSession(sessionIdRaw: string, options?: { setActive?: boolean, title?: string }) {
    const sessionId = sessionIdRaw.trim()
    if (!sessionId)
      return ''

    const currentUserId = getCurrentUserId()
    const characterId = getCurrentCharacterId()
    if (!index.value || index.value.userId !== currentUserId)
      await loadIndexForUser(currentUserId)

    ensureSession(sessionId)
    ensureGeneration(sessionId)
    await loadSession(sessionId)

    const existingMeta = sessionMetas.value[sessionId]
    if (existingMeta) {
      if (options?.setActive)
        setActiveSession(sessionId)
      return sessionId
    }

    const now = Date.now()
    const meta: ChatSessionMeta = {
      sessionId,
      userId: currentUserId,
      characterId,
      title: options?.title,
      createdAt: now,
      updatedAt: now,
    }
    sessionMetas.value[sessionId] = meta

    if (!index.value)
      index.value = { userId: currentUserId, characters: {} }

    const characterIndex = index.value.characters[characterId] ?? {
      activeSessionId: sessionId,
      sessions: {},
    }
    characterIndex.sessions[sessionId] = meta
    if (options?.setActive)
      characterIndex.activeSessionId = sessionId
    index.value.characters[characterId] = characterIndex

    const record: ChatSessionRecord = {
      meta,
      messages: snapshotMessages(sessionMessages.value[sessionId] ?? []),
    }

    if (options?.setActive)
      activeSessionId.value = sessionId

    loadedSessions.add(sessionId)
    await enqueuePersist(() => chatSessionsRepo.saveSession(sessionId, record))
    await persistIndex()
    scheduleSync(sessionId)
    return sessionId
  }

  async function ensureActiveSessionForCharacter() {
    const currentUserId = getCurrentUserId()
    const characterId = getCurrentCharacterId()

    if (!index.value || index.value.userId !== currentUserId)
      await loadIndexForUser(currentUserId)

    const characterIndex = getCharacterIndex(characterId)
    if (!characterIndex) {
      await createSession(characterId)
      return
    }

    if (!characterIndex.activeSessionId) {
      await createSession(characterId)
      return
    }

    activeSessionId.value = characterIndex.activeSessionId
    await loadSession(characterIndex.activeSessionId)
    ensureSession(characterIndex.activeSessionId)
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

  function setActiveSession(sessionId: string) {
    activeSessionId.value = sessionId
    ensureSession(sessionId)

    const characterId = getCurrentCharacterId()
    const characterIndex = index.value?.characters[characterId]
    if (characterIndex) {
      characterIndex.activeSessionId = sessionId
      void persistIndex()
    }

    if (ready.value)
      void loadSession(sessionId)
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

    const nextActiveSessionId = await createSession(characterId)

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
    const characterId = getCurrentCharacterId()
    const parentMessages = getSessionMessages(options.fromSessionId)
    const forkIndex = options.atIndex ?? parentMessages.length
    const nextMessages = parentMessages.slice(0, forkIndex)
    return await createSession(characterId, { setActive: false, messages: nextMessages })
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
