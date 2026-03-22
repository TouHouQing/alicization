<script setup lang="ts">
import type { AlicizationBridgeChatStreamEvent } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import type { AlicizationChatAbortPayload, AlicizationChatAbortResult, AlicizationChatErrorEvent, AlicizationChatFinishEvent, AlicizationChatStartPayload, AlicizationChatStartResult, AlicizationChatStreamChunkEvent, AlicizationChatStreamDispatchPayload, AlicizationChatToolCallEvent, AlicizationChatToolResultEvent, AlicizationDialogueRespondedPayload, AlicizationLlmConfigPayload, AlicizationPresencePulsePayload, AlicizationSafetyPermissionRequest } from '../shared/eventa'

import { defineInvokeHandler } from '@moeru/eventa'
import { useElectronEventaContext, useElectronEventaInvoke } from '@proj-alicization/electron-vueuse'
import { themeColorFromValue, useThemeColor } from '@proj-alicization/stage-layouts/composables/theme-color'
import { ToasterRoot } from '@proj-alicization/stage-ui/components'
import { clearAlicizationBridge, setAlicizationBridge } from '@proj-alicization/stage-ui/stores/alicization-bridge'
import { useAlicizationEpoch1Store } from '@proj-alicization/stage-ui/stores/alicization-epoch1'
import { useAlicizationPresenceDispatcherStore } from '@proj-alicization/stage-ui/stores/alicization-presence-dispatcher'
import { useSharedAnalyticsStore } from '@proj-alicization/stage-ui/stores/analytics'
import { useCharacterOrchestratorStore } from '@proj-alicization/stage-ui/stores/character'
import { useChatSessionStore } from '@proj-alicization/stage-ui/stores/chat/session-store'
import { usePluginHostInspectorStore } from '@proj-alicization/stage-ui/stores/devtools/plugin-host-debug'
import { useDisplayModelsStore } from '@proj-alicization/stage-ui/stores/display-models'
import { clearMcpToolBridge, setMcpToolBridge } from '@proj-alicization/stage-ui/stores/mcp-tool-bridge'
import { useModsServerChannelStore } from '@proj-alicization/stage-ui/stores/mods/api/channel-server'
import { useContextBridgeStore } from '@proj-alicization/stage-ui/stores/mods/api/context-bridge'
import { useAiriCardStore } from '@proj-alicization/stage-ui/stores/modules/airi-card'
import { useConsciousnessStore } from '@proj-alicization/stage-ui/stores/modules/consciousness'
import { usePerfTracerBridgeStore } from '@proj-alicization/stage-ui/stores/perf-tracer-bridge'
import { listProvidersForPluginHost, shouldPublishPluginHostCapabilities } from '@proj-alicization/stage-ui/stores/plugin-host-capabilities'
import { useProvidersStore } from '@proj-alicization/stage-ui/stores/providers'
import { useSettings } from '@proj-alicization/stage-ui/stores/settings'
import { useTheme } from '@proj-alicization/ui'
import { storeToRefs } from 'pinia'
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { toast, Toaster } from 'vue-sonner'

import AlicizationHitlModal from './components/AlicizationHitlModal.vue'
import ResizeHandler from './components/ResizeHandler.vue'

import { sanitizeAlicizationChatStartPayloadForTransport, summarizeAlicizationChatStartPayloadForTransport } from '../shared/alicization-chat-transport'
import {
  alicizationChatAbortInvokeChannel,
  alicizationChatStartInvokeChannel,
  alicizationChatStreamChunk,
  alicizationChatStreamDispatchChannel,
  alicizationChatStreamError,
  alicizationChatStreamFinish,
  alicizationChatStreamToolCall,
  alicizationChatStreamToolResult,
  alicizationDialogueResponded,
  alicizationKillSwitchStateChanged,

  alicizationSafetyPermissionRequested,
  alicizationSoulChanged,
  electronAlicizationAckDialogue,
  electronAlicizationAppendAuditLog,
  electronAlicizationAppendConversationTurn,
  electronAlicizationBootstrap,
  electronAlicizationChatAbort,
  electronAlicizationChatStart,
  electronAlicizationClearAllConversations,
  electronAlicizationDeleteAllData,
  electronAlicizationDeleteCardScope,
  electronAlicizationGetMemoryStats,
  electronAlicizationGetOrganicMemorySnapshot,
  electronAlicizationGetPerformanceManifest,
  electronAlicizationGetSensorySnapshot,
  electronAlicizationGetSoul,
  electronAlicizationGetVisualPresenceState,
  electronAlicizationInitializeGenesis,
  electronAlicizationKillSwitchGetState,
  electronAlicizationKillSwitchResume,
  electronAlicizationKillSwitchSuspend,
  electronAlicizationListConversationTurns,
  electronAlicizationLlmGetConfig,
  electronAlicizationLlmSyncConfig,
  electronAlicizationMemoryImportLegacy,
  electronAlicizationMemoryRetrieveFacts,
  electronAlicizationMemoryUpsertFacts,
  electronAlicizationRealtimeExecute,
  electronAlicizationReminderSchedule,
  electronAlicizationReplayDialogues,
  electronAlicizationReportProactiveFeedback,
  electronAlicizationRunMemoryPrune,
  electronAlicizationSafetyResolvePermission,
  electronAlicizationSearchOrganicSubconsciousFragments,
  electronAlicizationSetActiveSession,
  electronAlicizationSetPerformanceManifest,
  electronAlicizationSubconsciousForceDream,
  electronAlicizationSubconsciousForceTick,
  electronAlicizationSubconsciousGetState,
  electronAlicizationUpdateMemoryStats,
  electronAlicizationUpdatePersonality,
  electronAlicizationUpdateSoul,
  electronAlicizationVisualPresenceChanged,
  electronGetServerChannelConfig,
  electronMcpCallTool,
  electronMcpListTools,
  electronPluginInspect,
  electronPluginList,
  electronPluginLoad,
  electronPluginLoadEnabled,
  electronPluginSetEnabled,
  electronPluginUnload,
  electronPluginUpdateCapability,
  electronSettingsNavigate,
  electronStartTrackMousePosition,
  i18nSetLocale,
  pluginProtocolListProviders,
  pluginProtocolListProvidersEventName,
} from '../shared/eventa'
import { normalizeProactiveMetadata, normalizeStructuredFormat } from './alicization-dialogue-normalization'
import { initializeStageThreeRuntimeTraceBridge } from './bridges/stage-three-runtime-trace'
import { useServerChannelSettingsStore } from './stores/settings/server-channel'
import { useStageWindowLifecycleStore } from './stores/stage-window-lifecycle'

const { isDark: dark } = useTheme()
const i18n = useI18n()
const contextBridgeStore = useContextBridgeStore()
const displayModelsStore = useDisplayModelsStore()
const settingsStore = useSettings()
const providersStore = useProvidersStore()
const consciousnessStore = useConsciousnessStore()
const { language, themeColorsHue, themeColorsHueDynamic } = storeToRefs(settingsStore)
const { providers } = storeToRefs(providersStore)
const { activeProvider, activeModel } = storeToRefs(consciousnessStore)
const serverChannelSettingsStore = useServerChannelSettingsStore()
const router = useRouter()
const route = useRoute()
const cardStore = useAiriCardStore()
const { activeCardId } = storeToRefs(cardStore)
const chatSessionStore = useChatSessionStore()
const { activeSessionId } = storeToRefs(chatSessionStore)
const serverChannelStore = useModsServerChannelStore()
const characterOrchestratorStore = useCharacterOrchestratorStore()
const analyticsStore = useSharedAnalyticsStore()
const alicizationEpoch1Store = useAlicizationEpoch1Store()
const alicizationPresenceDispatcherStore = useAlicizationPresenceDispatcherStore()
const pluginHostInspectorStore = usePluginHostInspectorStore()
const stageWindowLifecycleStore = useStageWindowLifecycleStore()
const context = useElectronEventaContext()
usePerfTracerBridgeStore()
initializeStageThreeRuntimeTraceBridge()
void stageWindowLifecycleStore.initializeWindowLifecycleBridge()
const getServerChannelConfig = useElectronEventaInvoke(electronGetServerChannelConfig)
const listPlugins = useElectronEventaInvoke(electronPluginList)
const setPluginEnabled = useElectronEventaInvoke(electronPluginSetEnabled)
const loadEnabledPlugins = useElectronEventaInvoke(electronPluginLoadEnabled)
const loadPlugin = useElectronEventaInvoke(electronPluginLoad)
const unloadPlugin = useElectronEventaInvoke(electronPluginUnload)
const inspectPluginHost = useElectronEventaInvoke(electronPluginInspect)
const startTrackingCursorPoint = useElectronEventaInvoke(electronStartTrackMousePosition)
const reportPluginCapability = useElectronEventaInvoke(electronPluginUpdateCapability)
const listMcpTools = useElectronEventaInvoke(electronMcpListTools)
const callMcpTool = useElectronEventaInvoke(electronMcpCallTool)
const setLocale = useElectronEventaInvoke(i18nSetLocale)
const alicizationBootstrap = useElectronEventaInvoke(electronAlicizationBootstrap)
const alicizationGetSoul = useElectronEventaInvoke(electronAlicizationGetSoul)
const alicizationInitializeGenesis = useElectronEventaInvoke(electronAlicizationInitializeGenesis)
const alicizationUpdateSoul = useElectronEventaInvoke(electronAlicizationUpdateSoul)
const alicizationUpdatePersonality = useElectronEventaInvoke(electronAlicizationUpdatePersonality)
const alicizationGetKillSwitchState = useElectronEventaInvoke(electronAlicizationKillSwitchGetState)
const alicizationSuspendKillSwitch = useElectronEventaInvoke(electronAlicizationKillSwitchSuspend)
const alicizationResumeKillSwitch = useElectronEventaInvoke(electronAlicizationKillSwitchResume)
const alicizationListConversationTurns = useElectronEventaInvoke(electronAlicizationListConversationTurns)
const alicizationGetMemoryStats = useElectronEventaInvoke(electronAlicizationGetMemoryStats)
const alicizationGetOrganicMemorySnapshot = useElectronEventaInvoke(electronAlicizationGetOrganicMemorySnapshot)
const alicizationGetPerformanceManifest = useElectronEventaInvoke(electronAlicizationGetPerformanceManifest)
const alicizationRunMemoryPrune = useElectronEventaInvoke(electronAlicizationRunMemoryPrune)
const alicizationUpdateMemoryStats = useElectronEventaInvoke(electronAlicizationUpdateMemoryStats)
const alicizationRetrieveMemoryFacts = useElectronEventaInvoke(electronAlicizationMemoryRetrieveFacts)
const alicizationUpsertMemoryFacts = useElectronEventaInvoke(electronAlicizationMemoryUpsertFacts)
const alicizationImportLegacyMemory = useElectronEventaInvoke(electronAlicizationMemoryImportLegacy)
const alicizationSearchOrganicSubconsciousFragments = useElectronEventaInvoke(electronAlicizationSearchOrganicSubconsciousFragments)
const alicizationSetPerformanceManifest = useElectronEventaInvoke(electronAlicizationSetPerformanceManifest)
const alicizationAppendConversationTurn = useElectronEventaInvoke(electronAlicizationAppendConversationTurn)
const alicizationSetActiveSession = useElectronEventaInvoke(electronAlicizationSetActiveSession)
const alicizationAppendAuditLog = useElectronEventaInvoke(electronAlicizationAppendAuditLog)
const alicizationRealtimeExecute = useElectronEventaInvoke(electronAlicizationRealtimeExecute)
const alicizationGetSensorySnapshot = useElectronEventaInvoke(electronAlicizationGetSensorySnapshot)
const alicizationGetVisualPresenceState = useElectronEventaInvoke(electronAlicizationGetVisualPresenceState)
const alicizationGetSubconsciousState = useElectronEventaInvoke(electronAlicizationSubconsciousGetState)
const alicizationForceSubconsciousTick = useElectronEventaInvoke(electronAlicizationSubconsciousForceTick)
const alicizationForceDreaming = useElectronEventaInvoke(electronAlicizationSubconsciousForceDream)
const alicizationReportProactiveFeedback = useElectronEventaInvoke(electronAlicizationReportProactiveFeedback)
const alicizationSyncLlmConfig = useElectronEventaInvoke(electronAlicizationLlmSyncConfig)
const alicizationGetLlmConfig = useElectronEventaInvoke(electronAlicizationLlmGetConfig)
const alicizationAckDialogue = useElectronEventaInvoke(electronAlicizationAckDialogue)
const alicizationReplayDialogues = useElectronEventaInvoke(electronAlicizationReplayDialogues)
const alicizationChatStart = useElectronEventaInvoke(electronAlicizationChatStart)
const alicizationChatAbort = useElectronEventaInvoke(electronAlicizationChatAbort)
const alicizationReminderSchedule = useElectronEventaInvoke(electronAlicizationReminderSchedule)
const alicizationClearAllConversations = useElectronEventaInvoke(electronAlicizationClearAllConversations)
const alicizationDeleteCardScope = useElectronEventaInvoke(electronAlicizationDeleteCardScope)
const alicizationDeleteAllData = useElectronEventaInvoke(electronAlicizationDeleteAllData)
const alicizationResolvePermission = useElectronEventaInvoke(electronAlicizationSafetyResolvePermission)

const resolveAlicizationScope = () => ({ cardId: activeCardId.value || 'default' })
const isCurrentAlicizationCard = (cardId: string) => cardId === (activeCardId.value || 'default')
const currentHitlRequest = ref<AlicizationSafetyPermissionRequest | null>(null)
const pendingHitlRequests = ref<AlicizationSafetyPermissionRequest[]>([])
const hitlResolving = ref(false)
let llmSyncTimer: ReturnType<typeof setTimeout> | undefined
let lastLlmSyncSignature = ''
let llmConfigHydrating = false
const llmConfigHydrated = ref(false)
const pendingAlicizationChatStreams = new Map<string, {
  onStreamEvent?: (event: AlicizationBridgeChatStreamEvent) => Promise<void> | void
  resolve: () => void
  reject: (error: unknown) => void
}>()
const proactiveBackfillInFlight = new Set<string>()
const sessionReconcileInFlight = new Set<string>()
const handledDialogueRespondedKeys = new Set<string>()
const handledDialogueRespondedQueue: string[] = []
const handledDialogueRespondedMax = 600

function alicizationChatStreamKey(cardId: string, turnId: string) {
  return `${cardId}:${turnId}`
}

function resolvePendingAlicizationStream(cardId: string, turnId: string) {
  return pendingAlicizationChatStreams.get(alicizationChatStreamKey(cardId, turnId))
}

function settlePendingAlicizationStream(cardId: string, turnId: string) {
  pendingAlicizationChatStreams.delete(alicizationChatStreamKey(cardId, turnId))
}

function alicizationChatStreamText(path: string, params?: Record<string, unknown>) {
  return params
    ? i18n.t(`stage.chat.stream.${path}`, params)
    : i18n.t(`stage.chat.stream.${path}`)
}

function createAlicizationStreamError(message: string, code: string) {
  return Object.assign(new Error(message), { code })
}

function createAlicizationAbortError(reason?: string) {
  const resolvedReason = typeof reason === 'string' && reason.trim()
    ? reason
    : alicizationChatStreamText('reason-manual')
  return new DOMException(alicizationChatStreamText('aborted', { reason: resolvedReason }), 'AbortError')
}

function estimateJsonPayloadBytes(value: unknown) {
  try {
    return new TextEncoder().encode(JSON.stringify(value)).length
  }
  catch {
    return null
  }
}

function cloneProviderCredentials() {
  return JSON.parse(JSON.stringify(providers.value || {})) as Record<string, Record<string, unknown>>
}

function createLlmConfigPayload(): AlicizationLlmConfigPayload {
  return {
    activeProviderId: activeProvider.value || '',
    activeModelId: activeModel.value || '',
    providerCredentials: cloneProviderCredentials(),
  }
}

function normalizeCreatedAt(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : Date.now()
}

async function acknowledgeDialogueDelivery(sessionIdRaw: string, turnIdRaw: string, createdAtRaw: unknown) {
  const sessionId = sessionIdRaw.trim()
  const turnId = turnIdRaw.trim()
  if (!sessionId || !turnId)
    return
  const createdAt = normalizeCreatedAt(createdAtRaw)
  try {
    await alicizationAckDialogue({
      ...resolveAlicizationScope(),
      sessionId,
      turnId,
      createdAt,
    })
  }
  catch (error) {
    console.warn('[alicization-renderer] failed to ack proactive dialogue delivery:', error)
  }
}

async function upsertProactiveAssistantTurn(payload: {
  sessionId: string
  turnId: string
  assistantText: string
  structured?: Record<string, unknown> | null
  createdAt: number
  setActive?: boolean
}) {
  const sessionId = payload.sessionId.trim()
  const turnId = payload.turnId.trim()
  const assistantText = payload.assistantText.trim()
  if (!sessionId || !turnId || !assistantText)
    return

  const ensuredSessionId = await chatSessionStore.ensureExternalSession(sessionId, {
    setActive: payload.setActive === true,
  })
  if (!ensuredSessionId)
    return

  const normalizedCreatedAt = normalizeCreatedAt(payload.createdAt)
  const structuredThought = typeof payload.structured?.thought === 'string'
    ? payload.structured.thought.trim()
    : ''
  const structuredEmotion = typeof payload.structured?.emotion === 'string'
    ? payload.structured.emotion.trim()
    : 'neutral'
  const structuredFormat = normalizeStructuredFormat(payload.structured?.format)
  const proactive = normalizeProactiveMetadata(payload.structured?.proactive)

  const sessionMessages = chatSessionStore.getSessionMessages(ensuredSessionId)
  const existing = sessionMessages.find(message => message.id === turnId && message.role === 'assistant')
  if (existing) {
    const existingAssistant = existing as any
    existingAssistant.content = assistantText
    existingAssistant.createdAt = normalizedCreatedAt
    existingAssistant.slices = [{ type: 'text', text: assistantText }]
    existingAssistant.tool_results = []
    existingAssistant.origin = 'subconscious-proactive'
    existingAssistant.structured = {
      thought: structuredThought,
      emotion: structuredEmotion,
      reply: assistantText,
      format: structuredFormat,
      proactive,
    }
    existingAssistant.categorization = {
      speech: assistantText,
      reasoning: structuredThought,
    }
  }
  else {
    sessionMessages.push({
      id: turnId,
      role: 'assistant',
      content: assistantText,
      createdAt: normalizedCreatedAt,
      origin: 'subconscious-proactive',
      slices: [{ type: 'text', text: assistantText }],
      tool_results: [],
      structured: {
        thought: structuredThought,
        emotion: structuredEmotion,
        reply: assistantText,
        format: structuredFormat,
        proactive,
      },
      categorization: {
        speech: assistantText,
        reasoning: structuredThought,
      },
    })
  }

  chatSessionStore.persistSessionMessages(ensuredSessionId)
  await acknowledgeDialogueDelivery(ensuredSessionId, turnId, normalizedCreatedAt)
}

function normalizeContentText(raw: unknown) {
  return String(raw ?? '').trim()
}

function getMessageText(message: any) {
  if (!message)
    return ''
  if (typeof message.content === 'string')
    return message.content.trim()
  if (Array.isArray(message.content)) {
    return message.content
      .map((part: unknown) => {
        if (typeof part === 'string')
          return part
        if (part && typeof part === 'object' && 'text' in part)
          return String((part as { text?: unknown }).text ?? '')
        return ''
      })
      .join('')
      .trim()
  }
  return ''
}

function sortSessionMessagesInPlace(messages: any[]) {
  messages.sort((left, right) => {
    const leftAt = normalizeCreatedAt(left?.createdAt)
    const rightAt = normalizeCreatedAt(right?.createdAt)
    if (leftAt !== rightAt)
      return leftAt - rightAt
    const leftRole = String(left?.role ?? '')
    const rightRole = String(right?.role ?? '')
    if (leftRole === rightRole)
      return 0
    if (leftRole === 'user')
      return -1
    if (rightRole === 'user')
      return 1
    return leftRole.localeCompare(rightRole)
  })
}

function findReplayMessageIndex(messages: any[], options: {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: number
}) {
  const byIdIndex = messages.findIndex(item => item?.id === options.id && item?.role === options.role)
  if (byIdIndex >= 0)
    return byIdIndex

  const toleranceMs = options.role === 'assistant' ? 15_000 : 6_000
  return messages.findIndex((item) => {
    if (!item || item.role !== options.role)
      return false
    const itemText = getMessageText(item)
    if (itemText !== options.text)
      return false
    const itemCreatedAt = normalizeCreatedAt(item.createdAt)
    return Math.abs(itemCreatedAt - options.createdAt) <= toleranceMs
  })
}

async function reconcileSessionTurnsFromMain(sessionIdRaw: string) {
  const sessionId = sessionIdRaw.trim()
  if (!sessionId || sessionReconcileInFlight.has(sessionId))
    return

  sessionReconcileInFlight.add(sessionId)
  try {
    const ensuredSessionId = await chatSessionStore.ensureExternalSession(sessionId, {
      setActive: sessionId === activeSessionId.value,
    })
    if (!ensuredSessionId)
      return

    const rows = await alicizationListConversationTurns({
      ...resolveAlicizationScope(),
      sessionId: ensuredSessionId,
      limit: 500,
    })
    if (!rows.length)
      return

    const sessionMessages = chatSessionStore.getSessionMessages(ensuredSessionId)
    let changed = false
    const orderedRows = [...rows].sort((a, b) => normalizeCreatedAt(a.createdAt) - normalizeCreatedAt(b.createdAt))
    for (const row of orderedRows) {
      const createdAt = normalizeCreatedAt(row.createdAt)
      const turnId = String(row.turnId ?? '').trim()
      if (!turnId)
        continue

      const userText = normalizeContentText(row.userText)
      if (userText) {
        const userId = `${turnId}:user`
        const userIndex = findReplayMessageIndex(sessionMessages as any[], {
          id: userId,
          role: 'user',
          text: userText,
          createdAt,
        })
        if (userIndex >= 0) {
          const existing = sessionMessages[userIndex] as any
          const beforeSignature = JSON.stringify({
            id: existing.id,
            content: existing.content,
            createdAt: existing.createdAt,
          })
          existing.id = userId
          existing.content = userText
          existing.createdAt = createdAt
          const afterSignature = JSON.stringify({
            id: existing.id,
            content: existing.content,
            createdAt: existing.createdAt,
          })
          if (beforeSignature !== afterSignature)
            changed = true
        }
        else {
          sessionMessages.push({
            id: userId,
            role: 'user',
            content: userText,
            createdAt,
          } as any)
          changed = true
        }
      }

      const assistantText = normalizeContentText(row.assistantText)
      if (assistantText) {
        const structured = row.structured && typeof row.structured === 'object'
          ? row.structured as Record<string, unknown>
          : {}
        const structuredThought = typeof structured.thought === 'string' ? structured.thought.trim() : ''
        const structuredEmotion = typeof structured.emotion === 'string' ? structured.emotion.trim() : 'neutral'
        const structuredFormat = normalizeStructuredFormat(structured.format)
        const proactive = normalizeProactiveMetadata(structured.proactive)
        const inferredOrigin = turnId.startsWith('reminder:') || turnId.startsWith('subconscious:')
          || structuredFormat === 'subconscious-proactive-v1'
          || structuredFormat === 'subconscious-proactive-llm-v1'
          || structuredFormat === 'subconscious-reminder-v1'
          ? 'subconscious-proactive'
          : 'user-turn'
        const assistantIndex = findReplayMessageIndex(sessionMessages as any[], {
          id: turnId,
          role: 'assistant',
          text: assistantText,
          createdAt,
        })
        if (assistantIndex >= 0) {
          const existing = sessionMessages[assistantIndex] as any
          const beforeSignature = JSON.stringify({
            id: existing.id,
            content: existing.content,
            createdAt: existing.createdAt,
            thought: existing.structured?.thought,
            emotion: existing.structured?.emotion,
          })
          existing.id = turnId
          existing.content = assistantText
          existing.createdAt = createdAt
          existing.origin = inferredOrigin
          existing.slices = [{ type: 'text', text: assistantText }]
          existing.tool_results = Array.isArray(existing.tool_results) ? existing.tool_results : []
          existing.structured = {
            thought: structuredThought,
            emotion: structuredEmotion,
            reply: assistantText,
            format: structuredFormat,
            proactive,
          }
          existing.categorization = {
            speech: assistantText,
            reasoning: structuredThought,
          }
          const afterSignature = JSON.stringify({
            id: existing.id,
            content: existing.content,
            createdAt: existing.createdAt,
            thought: existing.structured?.thought,
            emotion: existing.structured?.emotion,
          })
          if (beforeSignature !== afterSignature)
            changed = true
        }
        else {
          sessionMessages.push({
            id: turnId,
            role: 'assistant',
            content: assistantText,
            createdAt,
            origin: inferredOrigin,
            slices: [{ type: 'text', text: assistantText }],
            tool_results: [],
            structured: {
              thought: structuredThought,
              emotion: structuredEmotion,
              reply: assistantText,
              format: structuredFormat,
              proactive,
            },
            categorization: {
              speech: assistantText,
              reasoning: structuredThought,
            },
          } as any)
          changed = true
        }
      }
    }

    if (changed) {
      sortSessionMessagesInPlace(sessionMessages as any[])
      chatSessionStore.persistSessionMessages(ensuredSessionId)
    }
  }
  catch (error) {
    console.warn('[alicization-renderer] failed to reconcile session turns from main:', error)
  }
  finally {
    sessionReconcileInFlight.delete(sessionId)
  }
}

async function backfillProactiveTurnsForSession(sessionIdRaw: string) {
  const sessionId = sessionIdRaw.trim()
  if (!sessionId || proactiveBackfillInFlight.has(sessionId))
    return

  proactiveBackfillInFlight.add(sessionId)
  try {
    const dialogues = await alicizationReplayDialogues({
      ...resolveAlicizationScope(),
      sessionId,
      limit: 200,
    })
    const sorted = [...dialogues].sort((a, b) => normalizeCreatedAt(a.createdAt) - normalizeCreatedAt(b.createdAt))
    for (const row of sorted) {
      if (row.origin !== 'subconscious-proactive')
        continue
      const assistantText = row.structured?.reply?.trim()
      if (!assistantText)
        continue
      await upsertProactiveAssistantTurn({
        sessionId,
        turnId: row.turnId,
        assistantText,
        structured: row.structured as unknown as Record<string, unknown>,
        createdAt: normalizeCreatedAt(row.createdAt),
      })
    }
  }
  catch (error) {
    console.warn('[alicization-renderer] failed to backfill proactive turns:', error)
  }
  finally {
    proactiveBackfillInFlight.delete(sessionId)
  }
}

function scheduleMainLlmConfigSync() {
  if (!llmConfigHydrated.value)
    return
  const payload = createLlmConfigPayload()
  const signature = JSON.stringify(payload)
  if (signature === lastLlmSyncSignature)
    return

  if (llmSyncTimer)
    clearTimeout(llmSyncTimer)
  llmSyncTimer = setTimeout(() => {
    lastLlmSyncSignature = signature
    void alicizationSyncLlmConfig(payload)
  }, 120)
}

async function hydrateMainLlmConfig() {
  if (llmConfigHydrating)
    return
  llmConfigHydrating = true
  try {
    const remote = await alicizationGetLlmConfig()
    const remoteCredentials = remote.providerCredentials && typeof remote.providerCredentials === 'object'
      ? remote.providerCredentials
      : {}
    if (Object.keys(remoteCredentials).length > 0) {
      providers.value = JSON.parse(JSON.stringify(remoteCredentials))
    }
    if (remote.activeProviderId?.trim()) {
      activeProvider.value = remote.activeProviderId.trim()
    }
    if (remote.activeModelId?.trim()) {
      activeModel.value = remote.activeModelId.trim()
    }
    lastLlmSyncSignature = JSON.stringify({
      activeProviderId: remote.activeProviderId || '',
      activeModelId: remote.activeModelId || '',
      providerCredentials: remoteCredentials,
    } satisfies AlicizationLlmConfigPayload)
  }
  catch (error) {
    console.warn('[alicization-renderer] failed to hydrate llm config from main process:', error)
  }
  finally {
    llmConfigHydrating = false
    llmConfigHydrated.value = true
  }
}

async function invokeAlicizationChatStartTransport(payload: AlicizationChatStartPayload): Promise<AlicizationChatStartResult> {
  const invoke = window.electron?.ipcRenderer?.invoke
  if (typeof invoke === 'function')
    return await invoke(alicizationChatStartInvokeChannel, payload) as AlicizationChatStartResult
  return await alicizationChatStart(payload)
}

async function invokeAlicizationChatAbortTransport(payload: AlicizationChatAbortPayload): Promise<AlicizationChatAbortResult> {
  const invoke = window.electron?.ipcRenderer?.invoke
  if (typeof invoke === 'function')
    return await invoke(alicizationChatAbortInvokeChannel, payload) as AlicizationChatAbortResult
  return await alicizationChatAbort(payload)
}

function handleAlicizationChatStreamChunk(payload?: AlicizationChatStreamChunkEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  void pending.onStreamEvent?.({
    type: 'text-delta',
    text: payload.text,
  })
}

function handleAlicizationChatStreamToolCall(payload?: AlicizationChatToolCallEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  void pending.onStreamEvent?.({
    type: 'tool-call',
    toolCallId: payload.toolCallId,
    toolName: payload.toolName,
    args: JSON.stringify(payload.arguments ?? {}),
    toolCallType: 'function',
  })
}

function handleAlicizationChatStreamToolResult(payload?: AlicizationChatToolResultEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  void pending.onStreamEvent?.({
    type: 'tool-result',
    toolCallId: payload.toolCallId,
    result: payload.result,
  })
}

function handleAlicizationChatStreamError(payload?: AlicizationChatErrorEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  void pending.onStreamEvent?.({
    type: 'error',
    error: payload.error,
  })
  pending.reject(createAlicizationStreamError(
    String(payload.error || alicizationChatStreamText('error')),
    'alicization-stream-error',
  ))
}

function handleAlicizationChatStreamFinish(payload?: AlicizationChatFinishEvent) {
  if (!payload)
    return
  const pending = resolvePendingAlicizationStream(payload.cardId, payload.turnId)
  if (!pending)
    return
  if (payload.status === 'completed') {
    void pending.onStreamEvent?.({ type: 'finish' })
    pending.resolve()
    return
  }
  if (payload.status === 'aborted') {
    pending.reject(createAlicizationAbortError(payload.finishReason))
    return
  }
  const error = payload.error || alicizationChatStreamText('failed')
  void pending.onStreamEvent?.({ type: 'error', error })
  pending.reject(createAlicizationStreamError(String(error), 'alicization-stream-failed'))
}

function createDialogueRespondedDedupKey(payload: AlicizationDialogueRespondedPayload) {
  const sessionId = typeof payload.sessionId === 'string' ? payload.sessionId.trim() : ''
  const turnId = typeof payload.turnId === 'string' ? payload.turnId.trim() : ''
  const createdAt = typeof payload.createdAt === 'number' && Number.isFinite(payload.createdAt)
    ? Math.floor(payload.createdAt)
    : 0
  return `${payload.cardId}::${sessionId}::${turnId}::${createdAt}`
}

function registerHandledDialogueResponded(payload: AlicizationDialogueRespondedPayload) {
  const key = createDialogueRespondedDedupKey(payload)
  if (handledDialogueRespondedKeys.has(key))
    return false
  handledDialogueRespondedKeys.add(key)
  handledDialogueRespondedQueue.push(key)
  if (handledDialogueRespondedQueue.length > handledDialogueRespondedMax) {
    const dropped = handledDialogueRespondedQueue.shift()
    if (dropped)
      handledDialogueRespondedKeys.delete(dropped)
  }
  return true
}

function handleAlicizationDialogueRespondedPayload(payload?: AlicizationDialogueRespondedPayload) {
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  if (!registerHandledDialogueResponded(payload))
    return

  const targetSessionId = payload.sessionId?.trim() || activeSessionId.value
  if (targetSessionId)
    void reconcileSessionTurnsFromMain(targetSessionId)

  if (payload.origin === 'subconscious-proactive' && payload.structured?.reply?.trim()) {
    if (targetSessionId) {
      void upsertProactiveAssistantTurn({
        sessionId: targetSessionId,
        turnId: payload.turnId,
        assistantText: payload.structured.reply,
        structured: payload.structured as unknown as Record<string, unknown>,
        createdAt: payload.createdAt,
        setActive: targetSessionId === activeSessionId.value,
      })
    }
  }

  void alicizationPresenceDispatcherStore.dispatchDialogueResponded(payload)
}

function handleAlicizationVisualPresencePayload(payload?: AlicizationPresencePulsePayload) {
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  void alicizationPresenceDispatcherStore.dispatchPresencePulse(payload)
}

function handleAlicizationChatStreamDispatch(payload?: AlicizationChatStreamDispatchPayload) {
  if (!payload)
    return
  switch (payload.eventType) {
    case 'chunk':
      handleAlicizationChatStreamChunk(payload.body)
      return
    case 'tool-call':
      handleAlicizationChatStreamToolCall(payload.body)
      return
    case 'tool-result':
      handleAlicizationChatStreamToolResult(payload.body)
      return
    case 'finish':
      handleAlicizationChatStreamFinish(payload.body)
      return
    case 'error':
      handleAlicizationChatStreamError(payload.body)
      return
    case 'dialogue-responded':
      handleAlicizationDialogueRespondedPayload(payload.body)
  }
}

const removeAlicizationChatStreamDispatchListener = window.electron?.ipcRenderer?.on(
  alicizationChatStreamDispatchChannel,
  (_event, payload) => handleAlicizationChatStreamDispatch(payload as AlicizationChatStreamDispatchPayload),
)

function popNextHitlRequest() {
  if (currentHitlRequest.value || pendingHitlRequests.value.length === 0)
    return
  const [next, ...rest] = pendingHitlRequests.value
  pendingHitlRequests.value = rest
  currentHitlRequest.value = next ?? null
}

async function resolveHitlDecision(payload: { allow: boolean, rememberSession: boolean }) {
  const request = currentHitlRequest.value
  if (!request || hitlResolving.value)
    return

  hitlResolving.value = true
  try {
    await alicizationResolvePermission({
      cardId: request.cardId,
      token: request.token,
      requestId: request.requestId,
      allow: payload.allow,
      rememberSession: payload.allow ? payload.rememberSession : false,
      reason: payload.allow ? 'user-approved' : 'user-denied',
    })
  }
  finally {
    hitlResolving.value = false
    currentHitlRequest.value = null
    popNextHitlRequest()
  }
}

setAlicizationBridge({
  bootstrap: async () => await alicizationBootstrap(resolveAlicizationScope()),
  getSoul: async () => await alicizationGetSoul(resolveAlicizationScope()),
  initializeGenesis: async payload => await alicizationInitializeGenesis({ ...resolveAlicizationScope(), ...payload }),
  updateSoul: async payload => await alicizationUpdateSoul({ ...resolveAlicizationScope(), ...payload }),
  updatePersonality: async payload => await alicizationUpdatePersonality({ ...resolveAlicizationScope(), ...payload }),
  getKillSwitchState: async () => await alicizationGetKillSwitchState(resolveAlicizationScope()),
  suspendKillSwitch: async payload => await alicizationSuspendKillSwitch({ ...resolveAlicizationScope(), ...payload }),
  resumeKillSwitch: async payload => await alicizationResumeKillSwitch({ ...resolveAlicizationScope(), ...payload }),
  getMemoryStats: async () => await alicizationGetMemoryStats(resolveAlicizationScope()),
  runMemoryPrune: async () => await alicizationRunMemoryPrune(resolveAlicizationScope()),
  updateMemoryStats: async payload => await alicizationUpdateMemoryStats({ ...resolveAlicizationScope(), ...payload }),
  retrieveMemoryFacts: async payload => await alicizationRetrieveMemoryFacts({ ...resolveAlicizationScope(), ...payload }),
  upsertMemoryFacts: async payload => await alicizationUpsertMemoryFacts({ ...resolveAlicizationScope(), ...payload }),
  importLegacyMemory: async payload => await alicizationImportLegacyMemory({ ...resolveAlicizationScope(), ...payload }),
  getOrganicMemorySnapshot: async () => await alicizationGetOrganicMemorySnapshot(resolveAlicizationScope()),
  searchOrganicSubconsciousFragments: async payload => await alicizationSearchOrganicSubconsciousFragments({ ...resolveAlicizationScope(), ...payload }),
  getPerformanceManifest: async () => await alicizationGetPerformanceManifest(resolveAlicizationScope()),
  setPerformanceManifest: async manifest => await alicizationSetPerformanceManifest({ ...resolveAlicizationScope(), manifest }),
  appendConversationTurn: async payload => await alicizationAppendConversationTurn({ ...resolveAlicizationScope(), ...payload }),
  reportProactiveFeedback: async payload => await alicizationReportProactiveFeedback({ ...resolveAlicizationScope(), ...payload }),
  setActiveSession: async payload => await alicizationSetActiveSession({ ...resolveAlicizationScope(), ...payload }),
  appendAuditLog: async payload => await alicizationAppendAuditLog({ ...resolveAlicizationScope(), ...payload }),
  realtimeExecute: async payload => await alicizationRealtimeExecute({ ...resolveAlicizationScope(), ...payload }),
  getSensorySnapshot: async () => await alicizationGetSensorySnapshot(resolveAlicizationScope()),
  getVisualPresenceState: async () => await alicizationGetVisualPresenceState(resolveAlicizationScope()),
  getSubconsciousState: async () => await alicizationGetSubconsciousState(resolveAlicizationScope()),
  forceSubconsciousTick: async () => await alicizationForceSubconsciousTick(resolveAlicizationScope()),
  forceDreaming: async payload => await alicizationForceDreaming({ ...resolveAlicizationScope(), ...payload }),
  syncLlmConfig: async payload => await alicizationSyncLlmConfig(payload),
  getLlmConfig: async () => await alicizationGetLlmConfig(),
  chatStart: async payload => await invokeAlicizationChatStartTransport({ ...resolveAlicizationScope(), ...payload }),
  chatAbort: async payload => await invokeAlicizationChatAbortTransport({ ...resolveAlicizationScope(), ...payload }),
  reminderSchedule: async payload => await alicizationReminderSchedule({ ...resolveAlicizationScope(), ...payload }),
  streamChat: async (payload, options) => await new Promise<void>((resolve, reject) => {
    void (async () => {
      const scope = resolveAlicizationScope()
      const key = alicizationChatStreamKey(scope.cardId, payload.turnId)
      const previousPending = pendingAlicizationChatStreams.get(key)
      if (previousPending) {
        // NOTICE: Retry path may restart the same turnId after timeout.
        // Forcefully supersede the old pending stream so retried stream can proceed.
        await invokeAlicizationChatAbortTransport({
          ...scope,
          turnId: payload.turnId,
          reason: 'renderer-restart',
        }).catch(() => {})
        previousPending.reject(createAlicizationStreamError(
          alicizationChatStreamText('superseded', { turnId: payload.turnId }),
          'alicization-stream-superseded',
        ))
        pendingAlicizationChatStreams.delete(key)
      }

      let disposed = false
      const abortHandler = () => {
        void invokeAlicizationChatAbortTransport({
          ...scope,
          turnId: payload.turnId,
          reason: 'renderer-abort',
        })
      }
      const dispose = () => {
        if (disposed)
          return
        disposed = true
        options.abortSignal?.removeEventListener('abort', abortHandler)
        settlePendingAlicizationStream(scope.cardId, payload.turnId)
      }
      const rejectAndDispose = (error: unknown) => {
        dispose()
        reject(error)
      }
      const resolveAndDispose = () => {
        dispose()
        resolve()
      }

      pendingAlicizationChatStreams.set(key, {
        onStreamEvent: options.onStreamEvent,
        resolve: resolveAndDispose,
        reject: rejectAndDispose,
      })

      if (options.abortSignal?.aborted) {
        await invokeAlicizationChatAbortTransport({
          ...scope,
          turnId: payload.turnId,
          reason: 'renderer-abort',
        })
        rejectAndDispose(createAlicizationAbortError('renderer-abort'))
        return
      }

      options.abortSignal?.addEventListener('abort', abortHandler, { once: true })

      const transportPayloadResult = sanitizeAlicizationChatStartPayloadForTransport({
        ...scope,
        ...payload,
      })
      const transportPayload = transportPayloadResult.value
      const transportPayloadSummary = summarizeAlicizationChatStartPayloadForTransport(transportPayload)

      try {
        void alicizationAppendAuditLog({
          ...scope,
          level: 'notice',
          category: 'alicization.main-gateway',
          action: 'renderer-chat-start-requested',
          message: 'Renderer requested main-process Alicization chat stream startup.',
          payload: {
            turnId: transportPayload.turnId,
            providerId: transportPayload.providerId,
            model: transportPayload.model,
            messageCount: Array.isArray(transportPayload.messages) ? transportPayload.messages.length : 0,
            payloadBytes: estimateJsonPayloadBytes(transportPayload),
            transport: typeof window.electron?.ipcRenderer?.invoke === 'function' ? 'direct-ipc' : 'eventa',
            transportPayload: transportPayloadSummary,
            transportSanitization: transportPayloadResult.report.changed
              ? {
                  droppedCount: transportPayloadResult.report.droppedCount,
                  coercedCount: transportPayloadResult.report.coercedCount,
                  droppedPaths: transportPayloadResult.report.droppedPaths,
                  coercedPaths: transportPayloadResult.report.coercedPaths,
                }
              : undefined,
          },
        }).catch(() => {})
        let start = await invokeAlicizationChatStartTransport(transportPayload)
        if (!start.accepted && start.state === 'duplicate-running') {
          for (let attempt = 0; attempt < 4; attempt += 1) {
            await new Promise(resolveDelay => setTimeout(resolveDelay, 120 * (attempt + 1)))
            start = await invokeAlicizationChatStartTransport(transportPayload)
            if (start.accepted || start.state !== 'duplicate-running')
              break
          }
        }
        void alicizationAppendAuditLog({
          ...scope,
          level: start.accepted ? 'notice' : 'warning',
          category: 'alicization.main-gateway',
          action: 'renderer-chat-start-resolved',
          message: start.accepted
            ? 'Renderer received accepted response for main-process Alicization chat stream startup.'
            : 'Renderer received rejected response for main-process Alicization chat stream startup.',
          payload: {
            turnId: payload.turnId,
            accepted: start.accepted,
            state: start.state,
            reason: start.reason,
          },
        }).catch(() => {})
        if (!start.accepted) {
          const state = typeof start.state === 'string' ? start.state : 'unknown'
          rejectAndDispose(createAlicizationStreamError(
            typeof start.reason === 'string' && start.reason.trim()
              ? alicizationChatStreamText('start-rejected-with-reason', {
                  turnId: payload.turnId,
                  state,
                  reason: start.reason,
                })
              : alicizationChatStreamText('start-rejected', {
                  turnId: payload.turnId,
                  state,
                }),
            'alicization-stream-start-rejected',
          ))
        }
      }
      catch (error) {
        void alicizationAppendAuditLog({
          ...scope,
          level: 'warning',
          category: 'alicization.main-gateway',
          action: 'renderer-chat-start-error',
          message: 'Renderer chat start invoke failed before stream handshake completed.',
          payload: {
            turnId: payload.turnId,
            reason: error instanceof Error ? error.message : String(error),
            transportPayload: transportPayloadSummary,
            transportSanitization: transportPayloadResult.report.changed
              ? {
                  droppedCount: transportPayloadResult.report.droppedCount,
                  coercedCount: transportPayloadResult.report.coercedCount,
                  droppedPaths: transportPayloadResult.report.droppedPaths,
                  coercedPaths: transportPayloadResult.report.coercedPaths,
                }
              : undefined,
          },
        }).catch(() => {})
        rejectAndDispose(error)
      }
    })()
  }),
  clearAllConversations: async () => await alicizationClearAllConversations(),
  deleteCardScope: async scope => await alicizationDeleteCardScope(scope),
  deleteAllData: async () => await alicizationDeleteAllData(),
})

context.value.on(alicizationSoulChanged, (event) => {
  const payload = event?.body
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  const { cardId: _cardId, ...snapshot } = payload
  alicizationEpoch1Store.setSoulSnapshot(snapshot)
  void alicizationEpoch1Store.refreshOrganicMemorySnapshot()
})

context.value.on(alicizationKillSwitchStateChanged, (event) => {
  const payload = event?.body
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  const { cardId: _cardId, ...snapshot } = payload
  alicizationEpoch1Store.setKillSwitchSnapshot(snapshot)
})

context.value.on(alicizationDialogueResponded, event => handleAlicizationDialogueRespondedPayload(event?.body))
context.value.on(electronAlicizationVisualPresenceChanged, event => handleAlicizationVisualPresencePayload(event?.body))

context.value.on(alicizationSafetyPermissionRequested, (event) => {
  const payload = event?.body
  if (!payload || !isCurrentAlicizationCard(payload.cardId))
    return
  pendingHitlRequests.value = [...pendingHitlRequests.value, payload]
  popNextHitlRequest()
})

context.value.on(alicizationChatStreamChunk, (event) => {
  handleAlicizationChatStreamChunk(event?.body)
})

context.value.on(alicizationChatStreamToolCall, (event) => {
  handleAlicizationChatStreamToolCall(event?.body)
})

context.value.on(alicizationChatStreamToolResult, (event) => {
  handleAlicizationChatStreamToolResult(event?.body)
})

context.value.on(alicizationChatStreamError, (event) => {
  handleAlicizationChatStreamError(event?.body)
})

context.value.on(alicizationChatStreamFinish, (event) => {
  handleAlicizationChatStreamFinish(event?.body)
})

// NOTICE: register plugin host bridge during setup to avoid race with pages using it in immediate watchers.
pluginHostInspectorStore.setBridge({
  list: () => listPlugins(),
  setEnabled: payload => setPluginEnabled(payload),
  loadEnabled: () => loadEnabledPlugins(),
  load: payload => loadPlugin(payload),
  unload: payload => unloadPlugin(payload),
  inspect: () => inspectPluginHost(),
})

// NOTICE: MCP tools are declared from stage-ui and executed during model streaming.
// Register runtime bridge during setup to avoid missing bridge in early tool invocations.
setMcpToolBridge({
  listTools: () => listMcpTools(),
  callTool: payload => callMcpTool({
    ...payload,
    cardId: activeCardId.value || 'default',
  }),
})

watch(language, () => {
  i18n.locale.value = language.value
  setLocale(language.value)
})

watch(activeCardId, () => {
  currentHitlRequest.value = null
  pendingHitlRequests.value = []
  hitlResolving.value = false
  proactiveBackfillInFlight.clear()
  void alicizationEpoch1Store.refreshSoul()
  void alicizationEpoch1Store.syncKillSwitchState()
  void alicizationEpoch1Store.refreshMemoryStats()
  void alicizationEpoch1Store.refreshOrganicMemorySnapshot()
  if (activeSessionId.value?.trim()) {
    void Promise.all([
      backfillProactiveTurnsForSession(activeSessionId.value),
      reconcileSessionTurnsFromMain(activeSessionId.value),
    ])
  }
}, { immediate: true })

watch(activeSessionId, (sessionId) => {
  if (!sessionId?.trim())
    return
  void alicizationSetActiveSession({
    ...resolveAlicizationScope(),
    sessionId,
  })
  void Promise.all([
    backfillProactiveTurnsForSession(sessionId),
    reconcileSessionTurnsFromMain(sessionId),
  ])
}, { immediate: true })

watch([activeProvider, activeModel, providers], () => scheduleMainLlmConfigSync(), { deep: true, immediate: true })

const { updateThemeColor } = useThemeColor(themeColorFromValue({ light: 'rgb(255 255 255)', dark: 'rgb(18 18 18)' }))
watch(dark, () => updateThemeColor(), { immediate: true })
watch(route, () => updateThemeColor(), { immediate: true })
onMounted(() => updateThemeColor())

context.value.on(electronSettingsNavigate, (event) => {
  const targetRoute = event?.body?.route
  if (!targetRoute || route.fullPath === targetRoute) {
    return
  }

  void router.push(targetRoute).catch((error) => {
    console.warn('Failed to navigate settings window:', error)
  })
})

onMounted(async () => {
  analyticsStore.initialize()
  cardStore.initialize()
  await alicizationEpoch1Store.initialize()

  await chatSessionStore.initialize()
  await hydrateMainLlmConfig()
  scheduleMainLlmConfigSync()
  if (activeSessionId.value?.trim()) {
    await Promise.all([
      backfillProactiveTurnsForSession(activeSessionId.value),
      reconcileSessionTurnsFromMain(activeSessionId.value),
    ])
  }
  await displayModelsStore.loadDisplayModelsFromIndexedDB()
  await settingsStore.initializeStageModel()

  const serverChannelConfig = await getServerChannelConfig()
  serverChannelSettingsStore.websocketTlsConfig = serverChannelConfig.tlsConfig

  await serverChannelStore.initialize({ possibleEvents: ['ui:configure'] }).catch(err => console.error('Failed to initialize Mods Server Channel in App.vue:', err))
  await contextBridgeStore.initialize()
  characterOrchestratorStore.initialize()
  await startTrackingCursorPoint()

  // Expose stage provider definitions to plugin host APIs.
  defineInvokeHandler(context.value, pluginProtocolListProviders, async () => listProvidersForPluginHost())

  if (shouldPublishPluginHostCapabilities()) {
    await reportPluginCapability({
      key: pluginProtocolListProvidersEventName,
      state: 'ready',
      metadata: {
        source: 'stage-ui',
      },
    })
  }
})

watch(themeColorsHue, () => {
  document.documentElement.style.setProperty('--chromatic-hue', themeColorsHue.value.toString())
}, { immediate: true })

watch(themeColorsHueDynamic, () => {
  document.documentElement.classList.toggle('dynamic-hue', themeColorsHueDynamic.value)
}, { immediate: true })

onUnmounted(() => {
  if (llmSyncTimer)
    clearTimeout(llmSyncTimer)
  removeAlicizationChatStreamDispatchListener?.()
  for (const [key, pending] of pendingAlicizationChatStreams.entries()) {
    pendingAlicizationChatStreams.delete(key)
    pending.reject(createAlicizationStreamError(
      alicizationChatStreamText('renderer-unmounted'),
      'alicization-stream-renderer-unmounted',
    ))
  }
  contextBridgeStore.dispose()
  clearMcpToolBridge()
  alicizationEpoch1Store.dispose()
  clearAlicizationBridge()
})
</script>

<template>
  <ToasterRoot @close="id => toast.dismiss(id)">
    <Toaster />
  </ToasterRoot>
  <AlicizationHitlModal
    :request="currentHitlRequest"
    :resolving="hitlResolving"
    @decide="resolveHitlDecision"
  />
  <ResizeHandler v-if="route.path !== '/'" />
  <RouterView />
</template>

<style>
/* We need this to properly animate the CSS variable */
@property --chromatic-hue {
  syntax: '<number>';
  initial-value: 0;
  inherits: true;
}

@keyframes hue-anim {
  from {
    --chromatic-hue: 0;
  }
  to {
    --chromatic-hue: 360;
  }
}

.dynamic-hue {
  animation: hue-anim 10s linear infinite;
}
</style>
