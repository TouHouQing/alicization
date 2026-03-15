import type { Locale } from '@intlify/core'
import type { ServerOptions } from '@proj-airi/server-runtime/server'
import type {
  ThreeHitTestReadTracePayload,
  ThreeSceneRenderInfoTracePayload,
  VrmDisposeEndTracePayload,
  VrmDisposeStartTracePayload,
  VrmLoadEndTracePayload,
  VrmLoadErrorTracePayload,
  VrmLoadStartTracePayload,
  VrmUpdateFrameTracePayload,
} from '@proj-airi/stage-ui-three/trace'

import { defineEventa, defineInvokeEventa } from '@moeru/eventa'

export const electronStartTrackMousePosition = defineInvokeEventa('eventa:invoke:electron:start-tracking-mouse-position')
export const electronStartDraggingWindow = defineInvokeEventa('eventa:invoke:electron:start-dragging-window')

export const electronOpenMainDevtools = defineInvokeEventa('eventa:invoke:electron:windows:main:devtools:open')
export const electronOpenSettings = defineInvokeEventa<void, { route?: string }>('eventa:invoke:electron:windows:settings:open')
export const electronSettingsNavigate = defineEventa<{ route: string }>('eventa:event:electron:windows:settings:navigate')
export const electronOpenChat = defineInvokeEventa('eventa:invoke:electron:windows:chat:open')
export const electronOpenSettingsDevtools = defineInvokeEventa('eventa:invoke:electron:windows:settings:devtools:open')
export const electronOpenDevtoolsWindow = defineInvokeEventa<void, { route?: string }>('eventa:invoke:electron:windows:devtools:open')

export interface ElectronServerChannelConfig {
  tlsConfig?: ServerOptions['tlsConfig'] | null
}
export const electronGetServerChannelConfig = defineInvokeEventa<ElectronServerChannelConfig>('eventa:invoke:electron:server-channel:get-config')
export const electronApplyServerChannelConfig = defineInvokeEventa<ElectronServerChannelConfig, Partial<ElectronServerChannelConfig>>('eventa:invoke:electron:server-channel:apply-config')

export const electronPluginList = defineInvokeEventa<PluginRegistrySnapshot>('eventa:invoke:electron:plugins:list')
export const electronPluginSetEnabled = defineInvokeEventa<PluginRegistrySnapshot, { name: string, enabled: boolean, path?: string }>('eventa:invoke:electron:plugins:set-enabled')
export const electronPluginLoadEnabled = defineInvokeEventa<PluginRegistrySnapshot>('eventa:invoke:electron:plugins:load-enabled')
export const electronPluginLoad = defineInvokeEventa<PluginRegistrySnapshot, { name: string }>('eventa:invoke:electron:plugins:load')
export const electronPluginUnload = defineInvokeEventa<PluginRegistrySnapshot, { name: string }>('eventa:invoke:electron:plugins:unload')
export const electronPluginInspect = defineInvokeEventa<PluginHostDebugSnapshot>('eventa:invoke:electron:plugins:inspect')
export const electronPluginUpdateCapability = defineInvokeEventa<PluginCapabilityState, PluginCapabilityPayload>('eventa:invoke:electron:plugins:capability:update')

export const pluginProtocolListProvidersEventName = 'proj-airi:plugin-sdk:apis:protocol:resources:providers:list-providers'
export const pluginProtocolListProviders = defineInvokeEventa<Array<{ name: string }>>(pluginProtocolListProvidersEventName)

export const captionIsFollowingWindowChanged = defineEventa<boolean>('eventa:event:electron:windows:caption-overlay:is-following-window-changed')
export const captionGetIsFollowingWindow = defineInvokeEventa<boolean>('eventa:invoke:electron:windows:caption-overlay:get-is-following-window')

export type RequestWindowActionDefault = 'confirm' | 'cancel' | 'close'
export interface RequestWindowPayload {
  id?: string
  route: string
  type?: string
  payload?: Record<string, any>
}
export interface RequestWindowPending {
  id: string
  type?: string
  payload?: Record<string, any>
}

// Reference window helpers are generic; callers can alias for clarity
export type NoticeAction = 'confirm' | 'cancel' | 'close'

export function createRequestWindowEventa(namespace: string) {
  const prefix = (name: string) => `eventa:${name}:electron:windows:${namespace}`
  return {
    openWindow: defineInvokeEventa<boolean, RequestWindowPayload>(prefix('invoke:open')),
    windowAction: defineInvokeEventa<void, { id: string, action: RequestWindowActionDefault }>(prefix('invoke:action')),
    pageMounted: defineInvokeEventa<RequestWindowPending | undefined, { id?: string }>(prefix('invoke:page-mounted')),
    pageUnmounted: defineInvokeEventa<void, { id?: string }>(prefix('invoke:page-unmounted')),
  }
}

// Notice window events built from generic factory
export const noticeWindowEventa = createRequestWindowEventa('notice')

// Widgets / Adhoc window events
export interface WidgetsAddPayload {
  id?: string
  componentName: string
  componentProps?: Record<string, any>
  // size presets or explicit spans; renderer decides mapping
  size?: 's' | 'm' | 'l' | { cols?: number, rows?: number }
  // auto-dismiss in ms; if omitted, persistent until closed by user
  ttlMs?: number
}

export interface WidgetSnapshot {
  id: string
  componentName: string
  componentProps: Record<string, any>
  size: 's' | 'm' | 'l' | { cols?: number, rows?: number }
  ttlMs: number
}

export interface PluginManifestSummary {
  name: string
  entrypoints: Record<string, string | undefined>
  path: string
  enabled: boolean
  loaded: boolean
  isNew: boolean
}

export interface PluginRegistrySnapshot {
  root: string
  plugins: PluginManifestSummary[]
}

// TODO: Replace these manually duplicated IPC types with re-exports from
// @proj-airi/plugin-sdk (CapabilityDescriptor) once stage-ui and the shared
// eventa layer can depend on the SDK without introducing unwanted coupling.
export interface PluginCapabilityPayload {
  key: string
  state: 'announced' | 'ready' | 'degraded' | 'withdrawn'
  metadata?: Record<string, unknown>
}

export interface PluginCapabilityState {
  key: string
  state: 'announced' | 'ready' | 'degraded' | 'withdrawn'
  metadata?: Record<string, unknown>
  updatedAt: number
}

export interface PluginHostSessionSummary {
  id: string
  manifestName: string
  phase: string
  runtime: 'electron' | 'node' | 'web'
  moduleId: string
}

export interface PluginHostDebugSnapshot {
  registry: PluginRegistrySnapshot
  sessions: PluginHostSessionSummary[]
  capabilities: PluginCapabilityState[]
  refreshedAt: number
}

export interface ElectronMcpStdioServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  enabled?: boolean
}

export interface ElectronMcpStdioConfigFile {
  mcpServers: Record<string, ElectronMcpStdioServerConfig>
}

export interface ElectronMcpStdioApplyResult {
  path: string
  started: Array<{ name: string }>
  failed: Array<{ name: string, error: string }>
  skipped: Array<{ name: string, reason: string }>
}

export interface ElectronMcpStdioServerRuntimeStatus {
  name: string
  state: 'running' | 'stopped' | 'error'
  command: string
  args: string[]
  pid: number | null
  lastError?: string
}

export interface ElectronMcpStdioRuntimeStatus {
  path: string
  servers: ElectronMcpStdioServerRuntimeStatus[]
  updatedAt: number
}

export interface ElectronMcpToolDescriptor {
  serverName: string
  name: string
  toolName: string
  description?: string
  inputSchema: Record<string, unknown>
}

export interface ElectronMcpCallToolPayload {
  cardId?: string
  name: string
  arguments?: Record<string, unknown>
}

export interface ElectronMcpCallToolResult {
  content?: Array<Record<string, unknown>>
  structuredContent?: Record<string, unknown>
  toolResult?: unknown
  isError?: boolean
  ok?: boolean
  errorCode?: string
  errorMessage?: string
  durationMs?: number
}

export interface ElectronMcpCapabilitiesSnapshot {
  path: string
  updatedAt: number
  servers: ElectronMcpStdioServerRuntimeStatus[]
  tools: ElectronMcpToolDescriptor[]
  healthyServers: number
}

export const electronMcpOpenConfigFile = defineInvokeEventa<{ path: string }>('eventa:invoke:electron:mcp:open-config-file')
export const electronMcpApplyAndRestart = defineInvokeEventa<ElectronMcpStdioApplyResult>('eventa:invoke:electron:mcp:apply-and-restart')
export const electronMcpGetRuntimeStatus = defineInvokeEventa<ElectronMcpStdioRuntimeStatus>('eventa:invoke:electron:mcp:get-runtime-status')
export const electronMcpListTools = defineInvokeEventa<ElectronMcpToolDescriptor[]>('eventa:invoke:electron:mcp:list-tools')
export const electronMcpCallTool = defineInvokeEventa<ElectronMcpCallToolResult, ElectronMcpCallToolPayload>('eventa:invoke:electron:mcp:call-tool')
export const electronMcpGetCapabilitiesSnapshot = defineInvokeEventa<ElectronMcpCapabilitiesSnapshot>('eventa:invoke:electron:mcp:get-capabilities-snapshot')

export const widgetsOpenWindow = defineInvokeEventa<void, { id?: string }>('eventa:invoke:electron:windows:widgets:open')
export const widgetsAdd = defineInvokeEventa<string | undefined, WidgetsAddPayload>('eventa:invoke:electron:windows:widgets:add')
export const widgetsRemove = defineInvokeEventa<void, { id: string }>('eventa:invoke:electron:windows:widgets:remove')
export const widgetsClear = defineInvokeEventa('eventa:invoke:electron:windows:widgets:clear')
export const widgetsUpdate = defineInvokeEventa<void, { id: string, componentProps?: Record<string, any> }>('eventa:invoke:electron:windows:widgets:update')
export const widgetsFetch = defineInvokeEventa<WidgetSnapshot | void, { id: string }>('eventa:invoke:electron:windows:widgets:fetch')
export const widgetsPrepareWindow = defineInvokeEventa<string | undefined, { id?: string }>('eventa:invoke:electron:windows:widgets:prepare')

export const electronWindowClose = defineInvokeEventa<void>('eventa:invoke:electron:window:close')
export type ElectronWindowLifecycleReason
  = | 'initial'
    | 'snapshot'
    | 'show'
    | 'hide'
    | 'minimize'
    | 'restore'
    | 'focus'
    | 'blur'

export interface ElectronWindowLifecycleState {
  focused: boolean
  minimized: boolean
  reason: ElectronWindowLifecycleReason
  updatedAt: number
  visible: boolean
}

export const electronWindowLifecycleChanged = defineEventa<ElectronWindowLifecycleState>('eventa:event:electron:window:lifecycle-changed')
export const electronGetWindowLifecycleState = defineInvokeEventa<ElectronWindowLifecycleState>('eventa:invoke:electron:window:get-lifecycle-state')
export const electronWindowSetAlwaysOnTop = defineInvokeEventa<void, boolean>('eventa:invoke:electron:window:set-always-on-top')
export const electronAppQuit = defineInvokeEventa<void>('eventa:invoke:electron:app:quit')

export type StageThreeRuntimeTraceEnvelope
  = | { type: 'three-render-info', payload: ThreeSceneRenderInfoTracePayload }
    | { type: 'three-hit-test-read', payload: ThreeHitTestReadTracePayload }
    | { type: 'vrm-update-frame', payload: VrmUpdateFrameTracePayload }
    | { type: 'vrm-load-start', payload: VrmLoadStartTracePayload }
    | { type: 'vrm-load-end', payload: VrmLoadEndTracePayload }
    | { type: 'vrm-load-error', payload: VrmLoadErrorTracePayload }
    | { type: 'vrm-dispose-start', payload: VrmDisposeStartTracePayload }
    | { type: 'vrm-dispose-end', payload: VrmDisposeEndTracePayload }

export interface StageThreeRuntimeTraceForwardedPayload {
  envelope: StageThreeRuntimeTraceEnvelope
  origin: string
}

export interface StageThreeRuntimeTraceRemoteControlPayload {
  origin: string
}

export const stageThreeRuntimeTraceForwardedEvent = defineEventa<StageThreeRuntimeTraceForwardedPayload>('eventa:event:stage-three-runtime-trace:forwarded')
export const stageThreeRuntimeTraceRemoteEnableEvent = defineEventa<StageThreeRuntimeTraceRemoteControlPayload>('eventa:event:stage-three-runtime-trace:remote-enable')
export const stageThreeRuntimeTraceRemoteDisableEvent = defineEventa<StageThreeRuntimeTraceRemoteControlPayload>('eventa:event:stage-three-runtime-trace:remote-disable')

// Internal event from main -> widgets renderer when a widget should render
export const widgetsRenderEvent = defineEventa<WidgetSnapshot>('eventa:event:electron:windows:widgets:render')
export const widgetsRemoveEvent = defineEventa<{ id: string }>('eventa:event:electron:windows:widgets:remove')
export const widgetsClearEvent = defineEventa('eventa:event:electron:windows:widgets:clear')
export const widgetsUpdateEvent = defineEventa<{ id: string, componentProps?: Record<string, any> }>('eventa:event:electron:windows:widgets:update')

// Onboarding window events
export const electronOnboardingClose = defineInvokeEventa('eventa:invoke:electron:windows:onboarding:close')
export const electronOpenOnboarding = defineInvokeEventa('eventa:invoke:electron:windows:onboarding:open')

export const i18nSetLocale = defineInvokeEventa<void, Locale>('eventa:invoke:electron:i18n:set-locale')
export const i18nGetLocale = defineInvokeEventa<Locale>('eventa:invoke:electron:i18n:get-locale')

export type AliceKillSwitchState = 'ACTIVE' | 'SUSPENDED'

export interface AliceCardScope {
  cardId: string
}

export interface AlicePersonalityState {
  obedience: number
  liveliness: number
  sensibility: number
}

export type AliceGender = 'female' | 'male' | 'non-binary' | 'neutral' | 'custom'

export interface AliceSoulFrontmatter {
  schemaVersion: number
  initialized: boolean
  custom_directives: string
  profile: {
    ownerName: string
    hostName: string
    aliceName: string
    gender: AliceGender
    genderCustom: string
    relationship: string
    mindAge: number
  }
  personality: AlicePersonalityState
  boundaries: {
    killSwitch: boolean
    mcpGuard: boolean
  }
}

export interface AliceSoulSnapshot {
  soulPath: string
  content: string
  frontmatter: AliceSoulFrontmatter
  revision: number
  hash: string
  needsGenesis: boolean
  watching: boolean
}

export interface AliceGenesisInput {
  ownerName: string
  hostName: string
  aliceName: string
  gender: AliceGender
  genderCustom?: string
  relationship: string
  personaNotes?: string
  customDirectives?: string
  mindAge: number
  personality: AlicePersonalityState
  allowOverwrite?: boolean
}

export interface AliceInitializeGenesisResult {
  soul: AliceSoulSnapshot
  conflict: boolean
  conflictCandidate?: AliceSoulSnapshot
}

export interface AlicePersonalityUpdatePayload {
  expectedRevision?: number
  reason?: string
  deltas: Partial<AlicePersonalityState>
}

export interface AliceSoulUpdatePayload {
  expectedRevision?: number
  content: string
}

export interface AliceKillSwitchSnapshot {
  state: AliceKillSwitchState
  reason?: string
  updatedAt: number
}

export interface AliceMemoryStats {
  total: number
  active: number
  archived: number
  lastPrunedAt: number | null
}

export type AliceMemorySource = 'rule' | 'async-llm'

export interface AliceMemoryFact {
  id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: AliceMemorySource
  dedupeKey: string
  createdAt: number
  updatedAt: number
  lastAccessAt: number | null
  accessCount: number
}

export interface AliceMemoryArchiveRecord extends AliceMemoryFact {
  archivedAt: number
}

export interface AliceMemoryFactInput {
  subject: string
  predicate: string
  object: string
  confidence: number
}

export interface AliceMemoryLegacySnapshot {
  facts: AliceMemoryFact[]
  archive: AliceMemoryArchiveRecord[]
  lastPrunedAt: number | null
}

export interface AliceMemoryMigrationResult {
  migrated: boolean
  importedFacts: number
  importedArchive: number
  marker: string
}

export interface AliceConversationTurnInput {
  turnId?: string
  sessionId?: string
  origin?: 'user-turn' | 'subconscious-proactive'
  userText?: string
  assistantText?: string
  structured?: Record<string, unknown>
  createdAt?: number
}

export interface AliceConversationTurnRecord {
  turnId: string | null
  sessionId: string
  userText: string | null
  assistantText: string | null
  structured: Record<string, unknown> | null
  createdAt: number
}

export interface AliceListConversationTurnsPayload extends AliceCardScope {
  sessionId: string
  sinceCreatedAt?: number
  limit?: number
}

export interface AliceDialogueAckPayload extends AliceCardScope {
  sessionId: string
  turnId: string
  createdAt: number
}

export interface AliceReplayDialoguesPayload extends AliceCardScope {
  sessionId: string
  limit?: number
}

export type AliceAuditLogLevel = 'info' | 'notice' | 'warning' | 'critical'

export interface AliceAuditLogInput {
  level?: AliceAuditLogLevel
  category: string
  action: string
  message: string
  payload?: Record<string, unknown>
  createdAt?: number
}

export type AliceRealtimeCategory = 'weather' | 'news' | 'finance' | 'sports'

export interface AliceRealtimeExecutePayload {
  category: AliceRealtimeCategory
  query: string
  locale?: string
  now?: number
}

export interface AliceRealtimeExecuteResult {
  category: AliceRealtimeCategory
  source: 'builtin'
  ok: boolean
  summary?: string
  data?: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
  durationMs: number
}

export type AliceSystemProbeDegradeReason
  = | 'battery-unavailable'
    | 'cpu-unavailable'
    | 'memory-unavailable'

export interface AliceSystemProbeSample {
  collectedAt: number
  time: {
    iso: string
    local: string
    timezone: string
  }
  battery?: {
    percent: number
    charging: boolean
    source: 'native' | 'fallback'
  }
  cpu: {
    usagePercent: number
    windowMs: number
  }
  memory: {
    freeMB: number
    totalMB: number
    usagePercent: number
  }
  degraded?: AliceSystemProbeDegradeReason[]
}

export interface AliceSensoryCacheSnapshot {
  sample: AliceSystemProbeSample
  stale: boolean
  ageMs: number
  nextTickAt: number | null
  running: boolean
}

export const aliceEmotionWhitelist = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'processing',
] as const

export type AliceEmotion = typeof aliceEmotionWhitelist[number]

export function normalizeAliceEmotion(raw: unknown): { emotion: AliceEmotion, rawEmotion?: string, downgraded: boolean } {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if ((aliceEmotionWhitelist as readonly string[]).includes(value)) {
    return {
      emotion: value as AliceEmotion,
      downgraded: false,
    }
  }

  return {
    emotion: 'neutral',
    rawEmotion: value || undefined,
    downgraded: Boolean(value),
  }
}

export interface AliceDialogueStructuredPayload {
  thought: string
  emotion: AliceEmotion
  reply: string
  policyLocked?: string
  rawEmotion?: string
}

export interface AliceDialogueRespondedPayload {
  cardId: string
  turnId: string
  sessionId: string
  origin?: 'user-turn' | 'subconscious-proactive'
  structured: AliceDialogueStructuredPayload
  isFallback: boolean
  createdAt: number
}

export interface AliceSetActiveSessionPayload extends AliceCardScope {
  sessionId: string
}

export interface AliceSubconsciousNeedsState {
  boredom: number
  loneliness: number
  fatigue: number
  lastTickAt: number
  lastInteractionAt: number
  lastSavedAt: number
}

export interface AliceSubconsciousStatePayload extends AliceCardScope, AliceSubconsciousNeedsState {
  updatedAt: number
}

export interface AliceSubconsciousTickResult {
  processedCards: string[]
  proactiveTriggered: string[]
  suppressedCards: string[]
}

export interface AliceDreamRunResult {
  processedCards: string[]
  skippedCards: Array<{ cardId: string, reason: string }>
}

export interface AliceSubconsciousForceDreamPayload extends Partial<AliceCardScope> {
  reason?: string
}

export interface AliceChatToolCallEvent {
  cardId: string
  turnId: string
  toolCallId: string
  toolName: string
  arguments?: Record<string, unknown>
}

export interface AliceChatToolResultEvent {
  cardId: string
  turnId: string
  toolCallId: string
  result?: unknown
}

export interface AliceChatStreamChunkEvent {
  cardId: string
  turnId: string
  text: string
}

export interface AliceChatFinishEvent {
  cardId: string
  turnId: string
  status: 'completed' | 'aborted' | 'failed'
  finishReason?: string
  fullText?: string
  error?: string
}

export interface AliceChatErrorEvent {
  cardId: string
  turnId: string
  error: string
}

export const aliceChatStreamDispatchChannel = 'alice:chat-stream-dispatch'

export type AliceChatStreamDispatchPayload
  = | { eventType: 'chunk', body: AliceChatStreamChunkEvent }
    | { eventType: 'tool-call', body: AliceChatToolCallEvent }
    | { eventType: 'tool-result', body: AliceChatToolResultEvent }
    | { eventType: 'finish', body: AliceChatFinishEvent }
    | { eventType: 'error', body: AliceChatErrorEvent }
    | { eventType: 'dialogue-responded', body: AliceDialogueRespondedPayload }

export interface AliceChatStartPayload extends AliceCardScope {
  turnId: string
  providerId: string
  model: string
  providerConfig: Record<string, unknown>
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool'
    content: unknown
    toolCallId?: string
    toolName?: string
  }>
  supportsTools?: boolean
  waitForTools?: boolean
}

export interface AliceChatStartResult {
  accepted: boolean
  turnId: string
  state?: 'accepted' | 'duplicate-running' | 'duplicate-finished' | 'missing-config' | 'start-failed'
  reason?: string
}

export interface AliceChatAbortPayload extends AliceCardScope {
  turnId: string
  reason?: string
}

export interface AliceChatAbortResult {
  accepted: boolean
  state: 'aborted' | 'not-found' | 'finished'
}

export interface AliceReminderSchedulePayload extends AliceCardScope {
  minutes: number
  message: string
  sourceTurnId?: string
}

export interface AliceReminderScheduleResult {
  status: 'scheduled' | 'error'
  taskId?: string
  triggerTime?: string
  triggerAt?: number
  message?: string
  code?: string
}

export interface AliceLlmConfigPayload {
  activeProviderId: string
  activeModelId: string
  providerCredentials: Record<string, Record<string, unknown>>
}

export type AliceToolRiskLevel = 'safe' | 'sensitive' | 'danger'
export type AliceToolActionCategory = 'read' | 'write' | 'delete' | 'execute' | 'network' | 'unknown'

export interface AliceSafetyPermissionRequest {
  cardId: string
  requestId: string
  token: string
  riskLevel: AliceToolRiskLevel
  actionCategory: AliceToolActionCategory
  serverName: string
  toolName: string
  reason: string
  resourceLabel?: string
  argumentsSummary?: {
    kind: string
    keyCount?: number
    keys?: string[]
  }
  timeoutMs: number
  createdAt: number
  supportsRememberSession: boolean
}

export interface AliceSafetyPermissionDecision {
  cardId?: string
  token: string
  requestId: string
  allow: boolean
  rememberSession?: boolean
  reason?: string
}

export interface AliceSafetyPermissionDecisionResult {
  accepted: boolean
  reason?: string
}

export const electronAliceBootstrap = defineInvokeEventa<AliceSoulSnapshot, AliceCardScope>('eventa:invoke:electron:alice:bootstrap')
export const electronAliceGetSoul = defineInvokeEventa<AliceSoulSnapshot, AliceCardScope>('eventa:invoke:electron:alice:get-soul')
export const electronAliceInitializeGenesis = defineInvokeEventa<AliceInitializeGenesisResult, AliceCardScope & AliceGenesisInput>('eventa:invoke:electron:alice:initialize-genesis')
export const electronAliceUpdateSoul = defineInvokeEventa<AliceSoulSnapshot, AliceCardScope & AliceSoulUpdatePayload>('eventa:invoke:electron:alice:update-soul')
export const electronAliceUpdatePersonality = defineInvokeEventa<AliceSoulSnapshot, AliceCardScope & AlicePersonalityUpdatePayload>('eventa:invoke:electron:alice:update-personality')
export const electronAliceKillSwitchGetState = defineInvokeEventa<AliceKillSwitchSnapshot, AliceCardScope>('eventa:invoke:electron:alice:kill-switch:get-state')
export const electronAliceKillSwitchSuspend = defineInvokeEventa<AliceKillSwitchSnapshot, AliceCardScope & { reason?: string }>('eventa:invoke:electron:alice:kill-switch:suspend')
export const electronAliceKillSwitchResume = defineInvokeEventa<AliceKillSwitchSnapshot, AliceCardScope & { reason?: string }>('eventa:invoke:electron:alice:kill-switch:resume')
export const electronAliceGetMemoryStats = defineInvokeEventa<AliceMemoryStats, AliceCardScope>('eventa:invoke:electron:alice:memory:get-stats')
export const electronAliceRunMemoryPrune = defineInvokeEventa<AliceMemoryStats, AliceCardScope>('eventa:invoke:electron:alice:memory:run-prune')
export const electronAliceUpdateMemoryStats = defineInvokeEventa<AliceMemoryStats, AliceCardScope & AliceMemoryStats>('eventa:invoke:electron:alice:memory:update-stats')
export const electronAliceMemoryRetrieveFacts = defineInvokeEventa<AliceMemoryFact[], AliceCardScope & { query: string, limit?: number }>('eventa:invoke:electron:alice:memory:retrieve-facts')
export const electronAliceMemoryUpsertFacts = defineInvokeEventa<void, AliceCardScope & { facts: AliceMemoryFactInput[], source: AliceMemorySource }>('eventa:invoke:electron:alice:memory:upsert-facts')
export const electronAliceMemoryImportLegacy = defineInvokeEventa<AliceMemoryMigrationResult, AliceCardScope & AliceMemoryLegacySnapshot>('eventa:invoke:electron:alice:memory:import-legacy')
export const electronAliceAppendConversationTurn = defineInvokeEventa<void, AliceCardScope & AliceConversationTurnInput>('eventa:invoke:electron:alice:conversation:append-turn')
export const electronAliceListConversationTurns = defineInvokeEventa<AliceConversationTurnRecord[], AliceListConversationTurnsPayload>('eventa:invoke:electron:alice:conversation:list-turns')
export const electronAliceAckDialogue = defineInvokeEventa<void, AliceDialogueAckPayload>('eventa:invoke:electron:alice:conversation:ack-dialogue')
export const electronAliceReplayDialogues = defineInvokeEventa<AliceDialogueRespondedPayload[], AliceReplayDialoguesPayload>('eventa:invoke:electron:alice:conversation:replay-dialogues')
export const electronAliceClearAllConversations = defineInvokeEventa<void>('eventa:invoke:electron:alice:conversation:clear-all')
export const electronAliceSetActiveSession = defineInvokeEventa<void, AliceSetActiveSessionPayload>('eventa:invoke:electron:alice:conversation:set-active-session')
export const electronAliceAppendAuditLog = defineInvokeEventa<void, AliceCardScope & AliceAuditLogInput>('eventa:invoke:electron:alice:audit:append')
export const electronAliceRealtimeExecute = defineInvokeEventa<AliceRealtimeExecuteResult, AliceCardScope & AliceRealtimeExecutePayload>('eventa:invoke:electron:alice:realtime:execute')
export const electronAliceGetSensorySnapshot = defineInvokeEventa<AliceSensoryCacheSnapshot, AliceCardScope>('eventa:invoke:electron:alice:sensory:get-snapshot')
export const electronAliceSafetyResolvePermission = defineInvokeEventa<AliceSafetyPermissionDecisionResult, AliceSafetyPermissionDecision>('eventa:invoke:electron:alice:safety:resolve-permission')
export const electronAliceDeleteCardScope = defineInvokeEventa<void, AliceCardScope>('eventa:invoke:electron:alice:delete-card-scope')
export const electronAliceDeleteAllData = defineInvokeEventa<void>('eventa:invoke:electron:alice:delete-all-data')
export const electronAliceSubconsciousGetState = defineInvokeEventa<AliceSubconsciousStatePayload, AliceCardScope>('eventa:invoke:electron:alice:subconscious:get-state')
export const electronAliceSubconsciousForceTick = defineInvokeEventa<AliceSubconsciousTickResult, AliceCardScope>('eventa:invoke:electron:alice:subconscious:force-tick')
export const electronAliceSubconsciousForceDream = defineInvokeEventa<AliceDreamRunResult, AliceSubconsciousForceDreamPayload>('eventa:invoke:electron:alice:subconscious:force-dream')
export const electronAliceLlmSyncConfig = defineInvokeEventa<void, AliceLlmConfigPayload>('eventa:invoke:electron:alice:llm:sync-config')
export const electronAliceLlmGetConfig = defineInvokeEventa<AliceLlmConfigPayload>('eventa:invoke:electron:alice:llm:get-config')
export const electronAliceChatStart = defineInvokeEventa<AliceChatStartResult, AliceChatStartPayload>('eventa:invoke:electron:alice:chat:start')
export const electronAliceChatAbort = defineInvokeEventa<AliceChatAbortResult, AliceChatAbortPayload>('eventa:invoke:electron:alice:chat:abort')
export const electronAliceReminderSchedule = defineInvokeEventa<AliceReminderScheduleResult, AliceReminderSchedulePayload>('eventa:invoke:electron:alice:reminder:schedule')
export const aliceChatStartInvokeChannel = 'alice:chat-start'
export const aliceChatAbortInvokeChannel = 'alice:chat-abort'

export const aliceKillSwitchStateChanged = defineEventa<AliceCardScope & AliceKillSwitchSnapshot>('eventa:event:electron:alice:kill-switch:state-changed')
export const aliceSoulChanged = defineEventa<AliceCardScope & AliceSoulSnapshot>('eventa:event:electron:alice:soul:changed')
export const aliceDialogueResponded = defineEventa<AliceDialogueRespondedPayload>('eventa:event:electron:alice:dialogue:responded')
export const aliceSafetyPermissionRequested = defineEventa<AliceSafetyPermissionRequest>('eventa:event:electron:alice:safety:permission-requested')
export const aliceChatStreamChunk = defineEventa<AliceChatStreamChunkEvent>('eventa:event:electron:alice:chat:stream-chunk')
export const aliceChatStreamToolCall = defineEventa<AliceChatToolCallEvent>('eventa:event:electron:alice:chat:stream-tool-call')
export const aliceChatStreamToolResult = defineEventa<AliceChatToolResultEvent>('eventa:event:electron:alice:chat:stream-tool-result')
export const aliceChatStreamFinish = defineEventa<AliceChatFinishEvent>('eventa:event:electron:alice:chat:stream-finish')
export const aliceChatStreamError = defineEventa<AliceChatErrorEvent>('eventa:event:electron:alice:chat:stream-error')

export { electron } from '@proj-airi/electron-eventa'
export * from '@proj-airi/electron-eventa/electron-updater'
