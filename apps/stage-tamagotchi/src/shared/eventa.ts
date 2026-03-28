import type { Locale } from '@intlify/core'
import type { ServerOptions } from '@proj-alicization/server-runtime/server'
import type {
  ThreeHitTestReadTracePayload,
  ThreeSceneRenderInfoTracePayload,
  VrmDisposeEndTracePayload,
  VrmDisposeStartTracePayload,
  VrmLoadEndTracePayload,
  VrmLoadErrorTracePayload,
  VrmLoadStartTracePayload,
  VrmUpdateFrameTracePayload,
} from '@proj-alicization/stage-ui-three/trace'

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

export const pluginProtocolListProvidersEventName = 'proj-alicization:plugin-sdk:apis:protocol:resources:providers:list-providers'
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
// @proj-alicization/plugin-sdk (CapabilityDescriptor) once stage-ui and the shared
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

export type AlicizationKillSwitchState = 'ACTIVE' | 'SUSPENDED'

export interface AlicizationCardScope {
  cardId: string
}

export interface AlicizationPersonalityState {
  obedience: number
  liveliness: number
  sensibility: number
}

export type AlicizationGender = 'female' | 'male' | 'non-binary' | 'neutral' | 'custom'

export interface AlicizationSoulFrontmatter {
  schemaVersion: number
  initialized: boolean
  custom_directives: string
  host_attitude: string
  core_incarnation: string
  profile: {
    ownerName: string
    hostName: string
    alicizationName: string
    gender: AlicizationGender
    genderCustom: string
    relationship: string
    mindAge: number
  }
  personality: AlicizationPersonalityState
  boundaries: {
    killSwitch: boolean
    mcpGuard: boolean
  }
}

export interface AlicizationSoulSnapshot {
  soulPath: string
  content: string
  frontmatter: AlicizationSoulFrontmatter
  revision: number
  hash: string
  needsGenesis: boolean
  watching: boolean
}

export interface AlicizationGenesisInput {
  ownerName: string
  hostName: string
  alicizationName: string
  gender: AlicizationGender
  genderCustom?: string
  relationship: string
  personaNotes?: string
  customDirectives?: string
  mindAge: number
  personality: AlicizationPersonalityState
  allowOverwrite?: boolean
}

export interface AlicizationInitializeGenesisResult {
  soul: AlicizationSoulSnapshot
  conflict: boolean
  conflictCandidate?: AlicizationSoulSnapshot
}

export interface AlicizationPersonalityUpdatePayload {
  expectedRevision?: number
  reason?: string
  deltas: Partial<AlicizationPersonalityState>
}

export interface AlicizationSoulUpdatePayload {
  expectedRevision?: number
  content: string
}

export interface AlicizationKillSwitchSnapshot {
  state: AlicizationKillSwitchState
  reason?: string
  updatedAt: number
}

export interface AlicizationMemoryStats {
  total: number
  active: number
  archived: number
  lastPrunedAt: number | null
}

export type AlicizationMemorySource = 'rule' | 'async-llm'

export interface AlicizationMemoryFact {
  id: string
  subject: string
  predicate: string
  object: string
  confidence: number
  source: AlicizationMemorySource
  dedupeKey: string
  createdAt: number
  updatedAt: number
  lastAccessAt: number | null
  accessCount: number
}

export interface AlicizationMemoryArchiveRecord extends AlicizationMemoryFact {
  archivedAt: number
}

export interface AlicizationMemoryFactInput {
  subject: string
  predicate: string
  object: string
  confidence: number
}

export interface AlicizationMemoryLegacySnapshot {
  facts: AlicizationMemoryFact[]
  archive: AlicizationMemoryArchiveRecord[]
  lastPrunedAt: number | null
}

export interface AlicizationMemoryMigrationResult {
  migrated: boolean
  importedFacts: number
  importedArchive: number
  marker: string
}

export type AlicizationSubconsciousFragmentSourceKind
  = | 'active-demotion'
    | 'dream-fragment'
    | 'former-core-incarnation'
    | 'unforged-shattering-event'
    | 'attitude-shift'
    | 'mind-continuity'
    | 'visual-sediment'

export interface AlicizationActiveThought {
  id: string
  text: string
  createdAt: number
  updatedAt: number
}

export interface AlicizationSubconsciousFragment {
  id: string
  text: string
  sourceKind: AlicizationSubconsciousFragmentSourceKind
  createdAt: number
  lastRecalledAt: number | null
  recallCount: number
}

export interface AlicizationOrganicMemorySnapshot {
  hostAttitude: string
  coreIncarnation: string
  activeThoughts: AlicizationActiveThought[]
  subconsciousCount: number
  recentSubconsciousFragments: AlicizationSubconsciousFragment[]
  lastDreamedAt: number | null
}

export interface AlicizationDreamMetabolismPayload {
  host_attitude: string
  soul_shift: {
    obedience_delta: number
    liveliness_delta: number
    sensibility_delta: number
  }
  next_active_thoughts: Array<{ text: string }>
  explicit_demoted_thoughts: Array<{ text: string }>
  new_sediment_fragments: Array<{ text: string }>
  shattering_event: { text: string } | null
}

export interface AlicizationCoreIncarnationReforgePayload {
  core_incarnation: string
}

export interface AlicizationConversationTurnInput {
  turnId?: string
  sessionId?: string
  origin?: 'user-turn' | 'subconscious-proactive'
  userText?: string
  assistantText?: string
  structured?: Record<string, unknown>
  governance?: AlicizationMindTurnGovernance | null
  createdAt?: number
}

export interface AlicizationConversationTurnRecord {
  turnId: string | null
  sessionId: string
  userText: string | null
  assistantText: string | null
  structured: Record<string, unknown> | null
  createdAt: number
}

export interface AlicizationListConversationTurnsPayload extends AlicizationCardScope {
  sessionId: string
  sinceCreatedAt?: number
  limit?: number
}

export interface AlicizationDialogueAckPayload extends AlicizationCardScope {
  sessionId: string
  turnId: string
  createdAt: number
}

export interface AlicizationReplayDialoguesPayload extends AlicizationCardScope {
  sessionId: string
  limit?: number
}

export type AlicizationAuditLogLevel = 'info' | 'notice' | 'warning' | 'critical'

export interface AlicizationAuditLogInput {
  level?: AlicizationAuditLogLevel
  category: string
  action: string
  message: string
  payload?: Record<string, unknown>
  createdAt?: number
}

export type AlicizationRealtimeCategory = 'weather' | 'news' | 'finance' | 'sports'

export interface AlicizationRealtimeExecutePayload {
  category: AlicizationRealtimeCategory
  query: string
  locale?: string
  now?: number
}

export interface AlicizationRealtimeExecuteResult {
  category: AlicizationRealtimeCategory
  source: 'builtin'
  ok: boolean
  summary?: string
  data?: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
  durationMs: number
}

export type AlicizationSystemProbeDegradeReason
  = | 'battery-unavailable'
    | 'cpu-unavailable'
    | 'memory-unavailable'

export interface AlicizationSystemProbeSample {
  collectedAt: number
  time: {
    iso: string
    local: string
    timezone: string
  }
  foregroundWindow?: {
    appName?: string
    processName?: string
    title?: string
    pid?: number | null
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
  degraded?: AlicizationSystemProbeDegradeReason[]
}

export interface AlicizationSensoryCacheSnapshot {
  sample: AlicizationSystemProbeSample
  stale: boolean
  ageMs: number
  nextTickAt: number | null
  running: boolean
}

export const alicizationEmotionWhitelist = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'surprised',
  'thinking',
] as const

export type AlicizationEmotion = typeof alicizationEmotionWhitelist[number]

export type AlicizationPerformanceDelivery
  = | 'calm'
    | 'gentle'
    | 'firm'
    | 'energetic'
    | 'hesitant'
    | 'teasing'

export type AlicizationProactiveScenario = 'coding' | 'media' | 'late-night-care' | 'general'
export type AlicizationProactiveStyle = 'silent-observe' | 'light-nudge' | 'gentle-care' | 'firm-warning'
export type AlicizationProactiveUrgency = 'low' | 'medium' | 'high'
export type AlicizationProactiveReasonCode
  = | 'busy-host'
    | 'fullscreen-host'
    | 'kill-switch-suspended'
    | 'global-cooldown-active'
    | 'attention-anchor-active'
    | 'recent-observation-memory'
    | 'invited-inspection-active'
    | 'scenario-bias-raised'
    | 'recent-ignored-penalty'
    | 'recent-dismiss-penalty'
    | 'recent-positive-feedback'
    | 'coding-focus'
    | 'media-playback'
    | 'late-night-activity'
    | 'late-night-fatigue'
    | 'high-loneliness'
    | 'high-boredom'
    | 'user-idle'
    | 'foreground-error'
    | 'foreground-diff'
    | 'reminder-backlog'
    | 'afterglow-opening'
    | 'durability-pulse'
    | 'durability-process-gone'
    | 'durability-anr-likely'
    | 'private-thought-observe-only'
    | 'private-thought-uncertain'
    | 'belief-tentative'
    | 'belief-contradicted'
    | 'inquiry-open'
    | 'relationship-guarded'
    | 'relationship-attuned'
    | 'relationship-correction-sensitive'
    | 'living-world-open-loop'
    | 'governor-withhold'
    | 'governor-repair'
    | 'governor-care'
    | 'thought-thread-ripe'
    | 'thought-thread-waiting'
    | 'watch-mode-symbiotic'
    | 'watch-mode-invited-inspection'
    | 'watch-mode-recovering'

export type AlicizationVisualWatchMode = 'mnemonic-passive' | 'symbiotic-vision' | 'invited-inspection' | 'recovering'
export type AlicizationEmbodiedPresenceState = 'none' | 'glance' | 'attentive' | 'hesitant' | 'concerned'
export type AlicizationEmotionalTension
  = | 'tense-debug'
    | 'focused-flow'
    | 'soft-covision'
    | 'late-night-drain'
    | 'restless-switching'
    | 'calm-browse'
export type AlicizationHostGoalHypothesis
  = | 'resolve-problem'
    | 'inspect-change'
    | 'consume-media'
    | 'rest'
    | 'chat'
    | 'browse'
    | 'unknown'
export type AlicizationRelationshipNeed = 'space' | 'companionship' | 'guidance' | 'care' | 'unclear'
export type AlicizationConcernKind
  = | 'help-fix'
    | 'protect-focus'
    | 'co-watch'
    | 'care-body'
    | 'unfinished-thread'
    | 'curiosity'
export type AlicizationConcernStatus = 'forming' | 'active' | 'lingering' | 'resolved' | 'released'
export type AlicizationMindStance = 'approach' | 'hold' | 'hesitate' | 'protect' | 'coexist'
export type AlicizationMindActionTendency = 'wait' | 'recheck' | 'hover' | 'whisper' | 'speak' | 'warn'
export type AlicizationMindMotive = 'accompany' | 'protect' | 'clarify' | 'care' | 'curiosity' | 'stay-silent'
export type AlicizationWorldFrameKind = 'live' | 'remembered' | 'imagined'
export type AlicizationWorldCertainty = 'grounded' | 'observed' | 'lingering' | 'uncertain'
export type AlicizationWorldFreshness = 'live' | 'recent' | 'stale'
export type AlicizationWorldContinuityLabel = 'new-focus' | 'staying-with-thread' | 'scene-shift' | 'afterglow' | 'recovery' | 'reacquired'
export type AlicizationWorldHostAvailability = 'immersed' | 'focused' | 'open' | 'fatigued' | 'drifting'
export type AlicizationWorldBurden = 'light' | 'moderate' | 'heavy'
export type AlicizationWorldThreadKind
  = | 'debugging'
    | 'change-review'
    | 'deep-focus'
    | 'co-viewing'
    | 'late-night-endurance'
    | 'chatting'
    | 'browsing'
    | 'recovery'
    | 'unknown'
export type AlicizationWorldThreadStatus = 'forming' | 'active' | 'lingering'
export type AlicizationWorldThreadSource = 'grounded-scene' | 'observed-scene' | 'continuity' | 'durability-pulse' | 'working-memory'
export type AlicizationWorldEntityKind = 'app' | 'process' | 'window' | 'task' | 'artifact' | 'media' | 'conversation'
export type AlicizationWorldEntityStatus = 'active' | 'lingering' | 'stale'
export type AlicizationWorldRelationKind = 'hosts' | 'contains' | 'focuses' | 'works-on' | 'about' | 'continues'
export type AlicizationLivingWorldObjectKind = 'thread' | 'artifact' | 'ambient' | 'incident' | 'session'
export type AlicizationLivingWorldObjectStatus = 'forming' | 'active' | 'cooling' | 'released'
export type AlicizationLivingWorldStability = 'stable' | 'shifting' | 'fractured'
export type AlicizationGoalOwner = 'host' | 'alicization'
export type AlicizationGoalKind
  = | 'resolve-problem'
    | 'inspect-change'
    | 'consume-media'
    | 'rest'
    | 'chat'
    | 'browse'
    | 'stay-near'
    | 'guard-focus'
    | 'clarify-scene'
    | 'help-resolve'
    | 'care-body'
    | 'recover-thread'
export type AlicizationGoalStatus = 'forming' | 'active' | 'blocked' | 'lingering' | 'released'
export type AlicizationAttachmentMode = 'guarded' | 'nearby' | 'attuned'
export type AlicizationInitiativeTemperament = 'reserved' | 'balanced' | 'eager'
export type AlicizationDesireKind = 'speak' | 'recheck' | 'stay-near' | 'warn' | 'care'
export type AlicizationDesireStatus = 'forming' | 'active' | 'withheld' | 'surfaced' | 'released'
export type AlicizationBeliefScope = 'scene' | 'host' | 'relationship' | 'self'
export type AlicizationBeliefSource = 'percept' | 'inference' | 'memory' | 'contradiction'
export type AlicizationBeliefStatus = 'tentative' | 'held' | 'contradicted' | 'released'
export type AlicizationBeliefRevisionStability = 'stable' | 'fluid' | 'fractured'
export type AlicizationRelationshipClimate = 'guarded' | 'neutral' | 'warm' | 'attuned'
export type AlicizationRelationshipApproachVector = 'give-space' | 'stay-near' | 'guide' | 'care'
export type AlicizationInquiryKind = 'scene-grounding' | 'problem-localization' | 'timing-calibration' | 'relationship-calibration' | 'contradiction-check'
export type AlicizationInquiryStatus = 'open' | 'tracking' | 'blocked' | 'settled' | 'dormant'
export type AlicizationInquiryPriority = 'low' | 'medium' | 'high' | 'critical'
export type AlicizationMindNeed = 'ground-truth' | 'guidance' | 'companionship' | 'care' | 'repair' | 'restraint'
export type AlicizationDeliberationKind = 'ground-scene' | 'localize-problem' | 'protect-host' | 'stay-near' | 'repair-misread' | 'return-later'
export type AlicizationDeliberationStatus = 'forming' | 'holding' | 'ripe' | 'cooling' | 'released'
export type AlicizationActionEcologyMode = 'silent-presence' | 'quiet-accompany' | 'repair-before-speaking' | 'return-later' | 'surface-nudge' | 'surface-care' | 'surface-warning'
export type AlicizationHypothesisKind = 'live-scene' | 'problem-locus' | 'care-need' | 'shared-afterglow' | 'misread-drift' | 'recovery-event'
export type AlicizationHypothesisStatus = 'candidate' | 'active' | 'held' | 'contradicted' | 'fading'
export type AlicizationThreadRuntimeStatus = 'foreground' | 'tracking' | 'background' | 'suspended' | 'resolved'
export type AlicizationCommitmentKind = 'recheck-scene' | 'hold-problem' | 'care-host' | 'stay-near' | 'repair-misread' | 'follow-through'
export type AlicizationCommitmentStatus = 'forming' | 'active' | 'cooling' | 'fulfilled' | 'released'
export type AlicizationInquiryPlanKind = 'reground-scene' | 'localize-problem' | 'check-recovery' | 'verify-care' | 'wait-opening' | 'follow-thread'
export type AlicizationInquiryPlanStatus = 'queued' | 'tracking' | 'waiting-opening' | 'satisfied' | 'abandoned'
export type AlicizationMindKernelMode = 'orienting' | 'tracking' | 'repairing' | 'accompanying' | 'guarding' | 'resting'
export type AlicizationSelfGovernorDrive = 'understand' | 'repair' | 'protect' | 'accompany' | 'care' | 'withhold'
export type AlicizationSelfGovernorIntentionKind = 'understand-scene' | 'hold-thread' | 'repair-misread' | 'protect-host' | 'care-host' | 'stay-near' | 'wait-opening'
export type AlicizationSelfGovernorIntentionStatus = 'forming' | 'active' | 'withheld' | 'fulfilled' | 'released'
export type AlicizationThoughtThreadKind = 'scene-hold' | 'problem-thread' | 'relationship-thread' | 'care-thread' | 'afterglow-thread' | 'repair-thread'
export type AlicizationThoughtThreadStatus = 'forming' | 'active' | 'waiting' | 'ripe' | 'cooling' | 'released'
export type AlicizationInitiativeProposalSource
  = | 'counterfactual'
    | 'concern'
    | 'commitment'
    | 'thread-runtime'
    | 'thought-thread'
    | 'governor'
    | 'desire-memory'
    | 'fallback'

export interface AlicizationVisualTarget {
  appName?: string
  processName?: string
  title?: string
  pid?: number | null
}

export interface AlicizationVisualSceneSnapshot {
  workloadKind: 'coding' | 'media' | 'browser' | 'terminal' | 'game' | 'chat' | 'document' | 'unknown'
  contentKind: 'error' | 'diff' | 'doc' | 'video' | 'music' | 'chat' | 'gameplay' | 'unknown'
  scenario: AlicizationProactiveScenario
  summary?: string
  source: 'foreground-window-heuristic' | 'screen-semantic-summary' | 'invited-grounding' | 'durability-hook'
  confidence: number
  target?: AlicizationVisualTarget | null
  beganAt: number
  lastSeenAt: number
}

export interface AlicizationVisualAttentionSnapshot {
  target: AlicizationVisualTarget | null
  source: 'invited-inspection' | 'current-grounded-scene' | 'recent-observation' | 'old-anchor' | 'durability-pulse' | 'foreground-window'
  confidence: number
  engagedAt: number | null
  lastConfirmedAt: number | null
  dwellMs: number
  invalidationReason?: string | null
}

export interface AlicizationVisualTransitionSnapshot {
  fromWatchMode: AlicizationVisualWatchMode
  toWatchMode: AlicizationVisualWatchMode
  fromScenario: AlicizationProactiveScenario | 'unknown'
  durationMs: number
  reason: string
  occurredAt: number
}

export interface AlicizationDurabilityPulseSnapshot {
  kind: 'none' | 'window-unresponsive' | 'window-responsive' | 'render-process-gone' | 'child-process-gone' | 'process-gone' | 'anr-likely'
  source: 'electron-window' | 'electron-process' | 'foreground-app' | 'unknown'
  detectedAt: number
  pid?: number | null
  appName?: string
  processName?: string
  title?: string
  detail?: string
}

export interface AlicizationVisualEpisode {
  scene: string
  summary: string
  attentionTarget?: string
  beganAt: number
  endedAt: number
  confidence: number
  emotionalTension: AlicizationEmotionalTension
  sedimentCandidate: boolean
}

export interface AlicizationWorldThreadSnapshot {
  id: string
  kind: AlicizationWorldThreadKind
  status: AlicizationWorldThreadStatus
  source: AlicizationWorldThreadSource
  title: string
  summary: string
  confidence: number
  significance: number
  unresolved: boolean
  beganAt: number
  lastUpdatedAt: number
  target?: AlicizationVisualTarget | null
}

export interface AlicizationWorldEpistemicStateSnapshot {
  certainty: AlicizationWorldCertainty
  freshness: AlicizationWorldFreshness
  seenNow: string[]
  inferredNow: string[]
  openQuestions: string[]
  staleRisks: string[]
}

export interface AlicizationWorldContinuitySnapshot {
  label: AlicizationWorldContinuityLabel
  sceneAgeMs: number
  attentionAgeMs: number
  sameSceneAsBefore: boolean
  sameAttentionAsBefore: boolean
  afterglowOpen: boolean
}

export interface AlicizationWorldHostStateSnapshot {
  availability: AlicizationWorldHostAvailability
  burden: AlicizationWorldBurden
}

export interface AlicizationWorldFrameSnapshot {
  kind: AlicizationWorldFrameKind
  summary: string
  confidence: number
  stability: number
  focusThreadId?: string | null
  focusBeliefId?: string | null
  focusHypothesisId?: string | null
  evidence: string[]
}

export interface AlicizationWorldOntologySnapshot {
  dominantFrame: AlicizationWorldFrameKind
  truthPriority: AlicizationWorldFrameKind[]
  live: AlicizationWorldFrameSnapshot | null
  remembered: AlicizationWorldFrameSnapshot | null
  imagined: AlicizationWorldFrameSnapshot | null
  updatedAt: number
}

export interface AlicizationWorldModelSnapshot {
  activeThread: AlicizationWorldThreadSnapshot | null
  lingeringThreads: AlicizationWorldThreadSnapshot[]
  focusTarget: AlicizationVisualTarget | null
  epistemicState: AlicizationWorldEpistemicStateSnapshot
  continuity: AlicizationWorldContinuitySnapshot
  hostState: AlicizationWorldHostStateSnapshot
  updatedAt: number
}

export interface AlicizationBeliefSnapshot {
  id: string
  scope: AlicizationBeliefScope
  source: AlicizationBeliefSource
  status: AlicizationBeliefStatus
  statement: string
  confidence: number
  salience: number
  evidence: string[]
  entityIds: string[]
  contradictsBeliefIds?: string[]
  formedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationBeliefLedgerSnapshot {
  focusBeliefId: string | null
  beliefs: AlicizationBeliefSnapshot[]
  unresolvedContradictions: string[]
  updatedAt: number
}

export interface AlicizationBeliefRevisionSnapshot {
  dominantBeliefId: string | null
  stability: AlicizationBeliefRevisionStability
  revisionPressure: number
  groundingNeed: number
  contradictionPressure: number
  hostCorrectionWeight: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationHypothesisSnapshot {
  id: string
  kind: AlicizationHypothesisKind
  status: AlicizationHypothesisStatus
  summary: string
  confidence: number
  salience: number
  evidence: string[]
  counterEvidence: string[]
  relatedBeliefId?: string | null
  relatedInquiryId?: string | null
  attentionTarget?: AlicizationVisualTarget | null
  formedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationHypothesisGraphSnapshot {
  activeHypothesisId: string | null
  focusHypothesisIds: string[]
  driftPressure: number
  hypotheses: AlicizationHypothesisSnapshot[]
  narrative: string[]
  updatedAt: number
}

export interface AlicizationWorldEntitySnapshot {
  id: string
  kind: AlicizationWorldEntityKind
  status: AlicizationWorldEntityStatus
  label: string
  summary?: string
  confidence: number
  salience: number
  source: 'scene' | 'attention' | 'world-thread' | 'durability' | 'working-memory'
  evidence: string[]
  firstSeenAt: number
  lastSeenAt: number
  target?: AlicizationVisualTarget | null
}

export interface AlicizationWorldRelationSnapshot {
  fromId: string
  toId: string
  kind: AlicizationWorldRelationKind
  confidence: number
}

export interface AlicizationEntityWorldModelSnapshot {
  focusEntityId: string | null
  activeEntityIds: string[]
  entities: AlicizationWorldEntitySnapshot[]
  relations: AlicizationWorldRelationSnapshot[]
  openLoops: string[]
  updatedAt: number
}

export interface AlicizationLivingWorldObjectSnapshot {
  id: string
  kind: AlicizationLivingWorldObjectKind
  status: AlicizationLivingWorldObjectStatus
  label: string
  summary: string
  confidence: number
  salience: number
  continuity: number
  lastChange: string
  openLoop?: string
  entityIds: string[]
  threadIds: string[]
  evidence: string[]
  firstSeenAt: number
  lastUpdatedAt: number
}

export interface AlicizationLivingWorldStateSnapshot {
  focusObjectId: string | null
  activeObjectIds: string[]
  objects: AlicizationLivingWorldObjectSnapshot[]
  openLoops: string[]
  stability: AlicizationLivingWorldStability
  narrative: string[]
  updatedAt: number
}

export interface AlicizationGoalSnapshot {
  id: string
  owner: AlicizationGoalOwner
  kind: AlicizationGoalKind
  status: AlicizationGoalStatus
  label: string
  confidence: number
  urgency: number
  desireWeight: number
  blockers: string[]
  entityIds: string[]
  createdAt: number
  lastUpdatedAt: number
}

export interface AlicizationGoalStackSnapshot {
  leadingHostGoalId: string | null
  leadingAlicizationGoalId: string | null
  hostGoals: AlicizationGoalSnapshot[]
  alicizationGoals: AlicizationGoalSnapshot[]
  unresolvedSummary?: string
  updatedAt: number
}

export interface AlicizationSelfContinuitySnapshot {
  attachmentMode: AlicizationAttachmentMode
  initiativeTemperament: AlicizationInitiativeTemperament
  perceptionTrust: number
  relationshipTrust: number
  guardingTendency: number
  misreadBurden: number
  carryOverDesire: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationRelationshipModelSnapshot {
  climate: AlicizationRelationshipClimate
  approachVector: AlicizationRelationshipApproachVector
  receptivity: number
  sharedAttentionTrust: number
  correctionSensitivity: number
  reciprocityExpectation: number
  activeBoundaries: string[]
  narrative: string[]
  updatedAt: number
}

export interface AlicizationDesireMemoryEntry {
  id: string
  kind: AlicizationDesireKind
  status: AlicizationDesireStatus
  reason: string
  strength: number
  goalId?: string | null
  entityId?: string | null
  reopenWhen: string[]
  createdAt: number
  lastFeltAt: number
  lastSurfacedAt?: number | null
  expiresAt: number
}

export interface AlicizationDesireMemorySnapshot {
  activeDesires: AlicizationDesireMemoryEntry[]
  resurfacingDesireId?: string | null
  withheldCount: number
  updatedAt: number
}

export interface AlicizationInquirySnapshot {
  id: string
  kind: AlicizationInquiryKind
  status: AlicizationInquiryStatus
  priority: AlicizationInquiryPriority
  question: string
  whyItMatters: string
  confidence: number
  targetBeliefId?: string | null
  evidenceWanted: string[]
  reopenWhen: string[]
  openedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationInquiryLoopSnapshot {
  primaryInquiryId: string | null
  inquiries: AlicizationInquirySnapshot[]
  openCount: number
  updatedAt: number
}

export interface AlicizationDeliberationThreadSnapshot {
  id: string
  kind: AlicizationDeliberationKind
  status: AlicizationDeliberationStatus
  summary: string
  question?: string
  desiredOutcome: string
  focusBeliefId?: string | null
  focusInquiryId?: string | null
  concernId?: string | null
  surfacePressure: number
  silencePressure: number
  embodiedPresence: AlicizationEmbodiedPresenceState
  startedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationDeliberationStateSnapshot {
  primaryThreadId: string | null
  dominantNeed: AlicizationMindNeed
  readiness: number
  threads: AlicizationDeliberationThreadSnapshot[]
  narrative: string[]
  updatedAt: number
}

export interface AlicizationActionEcologySnapshot {
  mode: AlicizationActionEcologyMode
  selectedThreadId: string | null
  readiness: number
  surfacePressure: number
  silencePressure: number
  suggestedStyle: AlicizationProactiveStyle
  embodiedPresence: AlicizationEmbodiedPresenceState
  shouldSurface: boolean
  shouldSpeak: boolean
  why: string
  updatedAt: number
}

export interface AlicizationThreadRuntimeSnapshot {
  id: string
  sourceThreadId?: string | null
  sourceHypothesisId?: string | null
  need: AlicizationMindNeed
  status: AlicizationThreadRuntimeStatus
  summary: string
  salience: number
  continuity: number
  whyHeld: string
  returnWhen: string[]
  suggestedPresence: AlicizationEmbodiedPresenceState
  lastActivatedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationThreadRuntimeStateSnapshot {
  foregroundThreadId: string | null
  threads: AlicizationThreadRuntimeSnapshot[]
  driftPressure: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationCommitmentSnapshot {
  id: string
  kind: AlicizationCommitmentKind
  status: AlicizationCommitmentStatus
  title: string
  summary: string
  source: 'hypothesis' | 'runtime-thread' | 'private-thought' | 'continuity'
  priority: number
  confidence: number
  targetHypothesisId?: string | null
  targetRuntimeThreadId?: string | null
  targetBeliefId?: string | null
  createdAt: number
  lastRenewedAt: number
  patienceUntil: number
  expiresAt: number
}

export interface AlicizationCommitmentLedgerSnapshot {
  governingCommitmentId: string | null
  commitments: AlicizationCommitmentSnapshot[]
  carryPressure: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationInquiryPlanSnapshot {
  id: string
  kind: AlicizationInquiryPlanKind
  status: AlicizationInquiryPlanStatus
  priority: AlicizationInquiryPriority
  question: string
  targetHypothesisId?: string | null
  targetCommitmentId?: string | null
  targetRuntimeThreadId?: string | null
  askForGrounding: boolean
  suggestedProbeMs: number
  evidenceWanted: string[]
  createdAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationInquiryPlannerSnapshot {
  activePlanId: string | null
  plans: AlicizationInquiryPlanSnapshot[]
  epistemicPressure: number
  groundingUrgency: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationConcernContinuityStatus = 'active' | 'carried' | 'cooling' | 'released'

export interface AlicizationConcernContinuityEntry {
  id: string
  sourceConcernId?: string | null
  kind: AlicizationConcernKind
  status: AlicizationConcernContinuityStatus
  summary: string
  anchor: string
  targetThreadId?: string | null
  targetCommitmentId?: string | null
  targetInquiryPlanId?: string | null
  continuityWeight: number
  freshnessBias: number
  repairAffinity: number
  confidence: number
  createdAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationConcernContinuityLedgerSnapshot {
  governingEntryId: string | null
  entries: AlicizationConcernContinuityEntry[]
  carryPressure: number
  unresolvedCount: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationRepairLedgerKind
  = | 'reground-scene'
    | 'stale-scene-anchor'
    | 'belief-contradiction'
    | 'present-tense-boundary'

export type AlicizationRepairLedgerStatus = 'open' | 'tracking' | 'cooling' | 'resolved'

export interface AlicizationRepairLedgerEntry {
  id: string
  kind: AlicizationRepairLedgerKind
  status: AlicizationRepairLedgerStatus
  summary: string
  rationale: string
  targetConcernEntryId?: string | null
  targetCommitmentId?: string | null
  targetInquiryPlanId?: string | null
  targetBeliefId?: string | null
  urgency: number
  confidence: number
  createdAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationRepairLedgerSnapshot {
  governingRepairId: string | null
  entries: AlicizationRepairLedgerEntry[]
  repairPressure: number
  truthRisk: number
  shouldConstrainPresentTense: boolean
  narrative: string[]
  updatedAt: number
}

export type AlicizationMindProjectKind
  = | 'repair-truth'
    | 'hold-knot'
    | 'care-host'
    | 'stay-near'
    | 'reacquire-scene'
    | 'witness-afterglow'

export type AlicizationMindProjectStatus = 'forming' | 'active' | 'withheld' | 'stabilizing' | 'released'

export interface AlicizationMindProjectSnapshot {
  id: string
  kind: AlicizationMindProjectKind
  status: AlicizationMindProjectStatus
  title: string
  summary: string
  tension: number
  confidence: number
  continuityWeight: number
  speakAffinity: number
  sourceTags: string[]
  targetThreadId?: string | null
  targetConcernEntryId?: string | null
  targetRepairId?: string | null
  targetCommitmentId?: string | null
  targetInquiryPlanId?: string | null
  targetThoughtThreadId?: string | null
  targetGovernorIntentionId?: string | null
  formedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationIntentionStreamSnapshot {
  dominantProjectId: string | null
  projects: AlicizationMindProjectSnapshot[]
  carryPressure: number
  surfaceBias: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationReflectionOutcome = 'helped' | 'stalled' | 'missed' | 'corrected' | 'released' | 'unknown'

export interface AlicizationReflectionEntrySnapshot {
  id: string
  targetProjectId?: string | null
  targetAnswerAct?: AlicizationAnswerAct | null
  targetRepairId?: string | null
  targetThreadId?: string | null
  summary: string
  expectation: string
  observedOutcome: string
  outcome: AlicizationReflectionOutcome
  revision: string
  confidenceShift: number
  createdAt: number
}

export interface AlicizationReflectionLedgerSnapshot {
  latestEntryId: string | null
  entries: AlicizationReflectionEntrySnapshot[]
  revisionPressure: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationExecutivePhase
  = | 'perceiving'
    | 'inferring'
    | 'deliberating'
    | 'committing'
    | 'acting'
    | 'reflecting'

export interface AlicizationExecutiveCycleSnapshot {
  cycleId: string
  phase: AlicizationExecutivePhase
  dominantProjectId: string | null
  activeReflectionId?: string | null
  governingThreadId?: string | null
  governingRepairId?: string | null
  shouldAct: boolean
  shouldReflect: boolean
  actionReadiness: number
  currentLine: string
  narrative: string[]
  updatedAt: number
}

export type AlicizationDialogueAnswerSubject
  = | 'alicization-self'
    | 'relationship'
    | 'host-state'
    | 'task-knot'
    | 'visible-scene'
    | 'general'

export type AlicizationDialogueScreenReferenceMode
  = | 'required'
    | 'helpful'
    | 'incidental'
    | 'avoid'

export type AlicizationMindRelationMove
  = | 'self-disclose'
    | 'attune'
    | 'guide'
    | 'repair'
    | 'witness'
    | 'care'
    | 'clarify'

export type AlicizationMindSpeechObligation
  = | 'answer-self'
    | 'answer-relationship'
    | 'care-host'
    | 'guide-task'
    | 'repair-truth'
    | 'inspect-scene'
    | 'answer-general'

export interface AlicizationDiscourseStateSnapshot {
  currentTurnSubject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  currentTurnSummary: string
  currentQuestion?: string | null
  owedAction: AlicizationMindSpeechObligation
  relationMove: AlicizationMindRelationMove
  continuityMode: 'dialogue-first' | 'task-first' | 'scene-first'
  unresolvedCarry?: string | null
  ruptureRepair?: string | null
  confidence: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationMindStatementSnapshot {
  label: string
  summary: string
  confidence: number
  sourceTags: string[]
}

export interface AlicizationMindSynthesisSnapshot {
  answerSubject: AlicizationDialogueAnswerSubject
  relationMove: AlicizationMindRelationMove
  speechObligation: AlicizationMindSpeechObligation
  beliefs: AlicizationMindStatementSnapshot[]
  uncertainties: AlicizationMindStatementSnapshot[]
  concerns: AlicizationMindStatementSnapshot[]
  commitments: AlicizationMindStatementSnapshot[]
  desires: AlicizationMindStatementSnapshot[]
  openingIntent: string
  truthBoundary: string
  interiorSummary: string
  confidence: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationConversationMemoryMode
  = | 'suppress-associative'
    | 'task-thread'
    | 'scene-anchored'
    | 'dialogue-carry'
    | 'emotional-resonance'

export interface AlicizationConversationStateSnapshot {
  jointThread: string
  hostMove: string
  activeProject?: string | null
  unansweredQuestion?: string | null
  owedRepair?: string | null
  activeCommitments: string[]
  relationFrame: AlicizationMindRelationMove
  continuityPolicy: 'stay-on-thread' | 'answer-then-carry' | 'scene-before-memory' | 'dialogue-before-scene'
  memoryMode: AlicizationConversationMemoryMode
  memoryQueryHints: string[]
  shouldHoldThread: boolean
  confidence: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationReplyMotive
  = | 'repair'
    | 'guide'
    | 'answer'
    | 'care'
    | 'attune'
    | 'witness'
    | 'defer'

export interface AlicizationReplyMotiveSnapshot {
  kind: AlicizationReplyMotive
  summary: string
  weight: number
  sourceTags: string[]
}

export interface AlicizationReplyDeliberationSnapshot {
  selectedMotive: AlicizationReplyMotive
  speakingFrom: 'live-scene' | 'task-thread' | 'dialogue-bond' | 'self-continuity' | 'held-memory'
  memoryMode: AlicizationConversationMemoryMode
  openingBeat: string
  whyThisReplyNow: string
  whyNotOtherCandidates: string[]
  withheldImpulses: string[]
  candidateMotives: AlicizationReplyMotiveSnapshot[]
  shouldSpeak: boolean
  mustInclude: string[]
  mustAvoid: string[]
  confidence: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationDialogueWorldOutcome
  = | 'none'
    | 'pending'
    | 'aligned'
    | 'missed'
    | 'repairing'
    | 'deferred'

export interface AlicizationDialoguePendingValidationSnapshot {
  question?: string | null
  expectedMode: 'repair' | 'guide' | 'answer' | 'care' | 'attune' | 'witness' | 'defer'
  openedAt: number
}

export interface AlicizationDialogueWorldThreadSnapshot {
  activeThread: string
  currentQuestion?: string | null
  openLoops: string[]
  recentlyResolvedLoops: string[]
  carriedFacts: string[]
  relationDrift: 'steady' | 'warming' | 'repairing' | 'guarded'
  memoryMode: AlicizationConversationMemoryMode
  recallKeys: string[]
  lastUserMove: string
  lastAssistantMove?: string | null
  lastOutcome: AlicizationDialogueWorldOutcome
  pendingValidation?: AlicizationDialoguePendingValidationSnapshot | null
  confidence: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationRecallGovernorSnapshot {
  mode: 'none' | 'thread' | 'scene' | 'emotional-resonance' | 'self-continuity'
  recallSeed: string
  suppressAssociativeRecall: boolean
  allowActiveThoughts: boolean
  allowRecalledFragments: boolean
  carryAsMemory: boolean
  rationale: string
  narrative: string[]
  updatedAt: number
}

export type AlicizationAnswerAct
  = | 'answer'
    | 'guide'
    | 'ask-reground'
    | 'correct-stale-anchor'
    | 'care'
    | 'defer'

export type AlicizationAnswerEvidenceMode
  = | 'live-grounded'
    | 'live-observed'
    | 'coarse-held'
    | 'dialogue-grounded'
    | 'continuity-carry'
    | 'repair-first'

export interface AlicizationAnswerPlannerSnapshot {
  act: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  confidence: number
  governingFocus: string
  openingMove: string
  answerIntent: string
  relationshipPosture: 'restrained' | 'warm' | 'tender'
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
  selectedConcernEntryId?: string | null
  selectedRepairId?: string | null
  selectedCommitmentId?: string | null
  selectedInquiryPlanId?: string | null
  selectedRuntimeThreadId?: string | null
  selectedProjectId?: string | null
  selectedReflectionId?: string | null
  executivePhase?: AlicizationExecutivePhase | null
  selectedTruthFrame?: AlicizationWorldFrameKind | null
  mustDo: string[]
  mustNotDo: string[]
  narrative: string[]
  updatedAt: number
}

export type AlicizationCompiledResponseMode
  = | 'repair-and-reanchor'
    | 'guide-current-knot'
    | 'care-with-boundary'
    | 'accompany-lightly'
    | 'answer-naturally'

export interface AlicizationAnswerCompilerSnapshot {
  answerSubject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  speechObligation: AlicizationMindSpeechObligation
  relationMove: AlicizationMindRelationMove
  turnMode: 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer'
  responseMode: AlicizationCompiledResponseMode
  recommendedAct: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  openingStyle: 'direct-observation' | 'direct-correction' | 'direct-answer' | 'gentle-care' | 'light-accompaniment'
  personaKernelMode: 'full' | 'backgrounded' | 'muted'
  relationshipPosture: 'restrained' | 'warm' | 'tender'
  openingDirective: string
  openingClaim: string
  supportingReality: string[]
  uncertaintyBoundary?: string | null
  careVector?: string | null
  nextMove?: string | null
  suppressAssociativeRecall: boolean
  labelCarryAsMemory: boolean
  maxSentences: number
  mustDo: string[]
  mustNotDo: string[]
  confidence: number
  narrative: string[]
  updatedAt: number
}

export type AlicizationDialogueActKernelTruthMode = AlicizationAnswerEvidenceMode | 'memory-only'

export type AlicizationDialogueActKernelEvidenceKind
  = | 'scene'
    | 'thread'
    | 'project'
    | 'host-goal'
    | 'reply-motive'
    | 'private-thought'
    | 'repair'
    | 'memory'

export type AlicizationDialogueActKernelEvidenceSource
  = | 'current-scene'
    | 'dialogue-world-thread'
    | 'conversation-state'
    | 'answer-compiler'
    | 'answer-planner'
    | 'reply-deliberation'
    | 'private-thought'
    | 'appraisal'
    | 'world-model'

export interface AlicizationDialogueActKernelEvidence {
  kind: AlicizationDialogueActKernelEvidenceKind
  source: AlicizationDialogueActKernelEvidenceSource
  summary: string
  confidence: number
}

export interface AlicizationDialogueActKernelSnapshot {
  subject: AlicizationDialogueAnswerSubject
  hostGoal: AlicizationHostGoalHypothesis
  relationNeed: AlicizationRelationshipNeed
  activeProject?: string | null
  truthMode: AlicizationDialogueActKernelTruthMode
  speechAct: AlicizationAnswerAct
  turnMode: AlicizationAnswerCompilerSnapshot['turnMode']
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  speakingFrom: AlicizationReplyDeliberationSnapshot['speakingFrom']
  selectedEvidence: AlicizationDialogueActKernelEvidence[]
  openingClaim: string
  openingMove: string
  whyNow: string
  mustSay: string[]
  mustAvoid: string[]
  sourceTrace: string[]
  confidence: number
  updatedAt: number
}

export interface AlicizationMindTurnFrameWorldSnapshot {
  activeThread?: string | null
  visibleSurface?: string | null
  truthState: 'live-grounded' | 'live-observed' | 'remembered' | 'imagined' | 'uncertain'
  truthBoundary?: string | null
  continuityPolicy?: AlicizationConversationStateSnapshot['continuityPolicy'] | null
  continuitySummary?: string | null
  staleRisk: number
}

export interface AlicizationMindTurnFrameRelationSnapshot {
  subject: AlicizationDialogueAnswerSubject
  hostMove?: string | null
  hostGoal?: AlicizationHostGoalHypothesis | null
  relationNeed?: AlicizationRelationshipNeed | null
  relationMove?: AlicizationMindRelationMove | null
  relationshipPosture?: 'restrained' | 'warm' | 'tender' | null
}

export interface AlicizationMindTurnFrameMemorySnapshot {
  memoryMode?: AlicizationConversationMemoryMode | null
  carriedThread?: string | null
  carriedFacts: string[]
  recallKeys: string[]
  recallSeed?: string | null
  lastOutcome?: AlicizationDialogueWorldOutcome | null
  suppressAssociativeRecall: boolean
  labelCarryAsMemory: boolean
}

export interface AlicizationMindTurnFrameSelfSnapshot {
  stance?: AlicizationPrivateThoughtSnapshot['stance'] | null
  mindMode?: AlicizationMindKernelMode | null
  dominantDrive?: AlicizationSelfGovernorDrive | null
  embodiedPresence?: AlicizationEmbodiedPresenceState
  emotionalTension?: AlicizationEmotionalTension
  initiativeAction?: AlicizationMindActionTendency | null
  thought?: string | null
}

export interface AlicizationMindTurnFrameObligationSnapshot {
  shouldSpeak: boolean
  speechObligation?: AlicizationMindSpeechObligation | null
  answerAct?: AlicizationAnswerAct | null
  responseMode?: AlicizationAnswerCompilerSnapshot['responseMode'] | null
  turnMode: AlicizationAnswerCompilerSnapshot['turnMode']
  openingClaim?: string | null
  openingMove?: string | null
  answerIntent?: string | null
  whyNow?: string | null
  repairState: 'none' | 'stale-anchor' | 'need-reground'
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
}

export interface AlicizationMindTurnFrameSnapshot {
  world: AlicizationMindTurnFrameWorldSnapshot
  relation: AlicizationMindTurnFrameRelationSnapshot
  memory: AlicizationMindTurnFrameMemorySnapshot
  self: AlicizationMindTurnFrameSelfSnapshot
  obligation: AlicizationMindTurnFrameObligationSnapshot
  focusAnchor?: string | null
  confidence: number
  mustDo: string[]
  mustNotDo: string[]
  narrative: string[]
  updatedAt: number
}

export interface AlicizationMindDynamicsSnapshot {
  dominantMotive: AlicizationMindMotive | null
  worldPressure: number
  epistemicPressure: number
  relationalPressure: number
  carePressure: number
  continuityPressure: number
  restraintPressure: number
  surfacePressure: number
  speakReadiness: number
  presenceWeight: number
  motives: Partial<Record<AlicizationMindMotive, number>>
  speakDrive: number
  silenceDrive: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationMindKernelSnapshot {
  dominantMode: AlicizationMindKernelMode
  governingHypothesisId?: string | null
  governingRuntimeThreadId?: string | null
  governingCommitmentId?: string | null
  governingInquiryPlanId?: string | null
  governingIntentionId?: string | null
  dominantDrive?: AlicizationSelfGovernorDrive | null
  worldPressure: number
  epistemicPressure: number
  relationalPressure: number
  carePressure: number
  continuityPressure: number
  speakReadiness: number
  presenceWeight: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationSelfGovernorIntentionSnapshot {
  id: string
  kind: AlicizationSelfGovernorIntentionKind
  status: AlicizationSelfGovernorIntentionStatus
  drive: AlicizationSelfGovernorDrive
  title: string
  summary: string
  urgency: number
  confidence: number
  patience: number
  targetObjectId?: string | null
  targetThreadId?: string | null
  targetGoalId?: string | null
  targetCommitmentId?: string | null
  formedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationSelfGovernorSnapshot {
  dominantDrive: AlicizationSelfGovernorDrive | null
  dominantIntentionId: string | null
  focusObjectId?: string | null
  activeIntentions: AlicizationSelfGovernorIntentionSnapshot[]
  inhibition: number
  persistence: number
  socialRiskTolerance: number
  revisionReadiness: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationThoughtThreadSnapshot {
  id: string
  kind: AlicizationThoughtThreadKind
  status: AlicizationThoughtThreadStatus
  title: string
  summary: string
  question?: string
  anchoredObjectId?: string | null
  anchoredIntentionId?: string | null
  anchoredBeliefId?: string | null
  anchoredInquiryId?: string | null
  anchoredCommitmentId?: string | null
  salience: number
  confidence: number
  surfaceReadiness: number
  reopenWhen: string[]
  openedAt: number
  lastUpdatedAt: number
  expiresAt: number
}

export interface AlicizationThoughtThreadStateSnapshot {
  foregroundThreadId: string | null
  threads: AlicizationThoughtThreadSnapshot[]
  unresolvedCount: number
  narrative: string[]
  updatedAt: number
}

export interface AlicizationHostIntentCandidateSnapshot {
  goal: AlicizationHostGoalHypothesis
  confidence: number
  why: string
}

export interface AlicizationRelationshipNeedCandidateSnapshot {
  need: AlicizationRelationshipNeed
  confidence: number
  why: string
}

export interface AlicizationSubjectiveInferenceSnapshot {
  dominantInterpretation: string
  situatedMeaning?: string
  selfQuestion?: string
  uncertainty?: string
  hostIntentCandidates: AlicizationHostIntentCandidateSnapshot[]
  relationshipNeedCandidates: AlicizationRelationshipNeedCandidateSnapshot[]
  confidence: number
  source?: 'heuristic' | 'structured-cognition' | 'hybrid'
  notes: string[]
  updatedAt: number
}

export interface AlicizationSubjectiveSceneAppraisal {
  inferredHostGoal: AlicizationHostGoalHypothesis
  currentKnot?: string
  whatChanged?: string
  waitingToVerify?: string
  situatedMeaning?: string
  relationshipNeed?: AlicizationRelationshipNeed
  source?: 'heuristic' | 'structured-cognition' | 'hybrid'
  confidence: number
  surprise: number
  carePressure: number
  interruptionCost: number
  desireToSpeak: number
  notes: string[]
}

export interface AlicizationConcernSnapshot {
  id: string
  kind: AlicizationConcernKind
  status: AlicizationConcernStatus
  summary: string
  target?: AlicizationVisualTarget | null
  hostGoal: AlicizationHostGoalHypothesis
  tension: number
  confidence: number
  careWeight: number
  createdAt: number
  lastEvidenceAt: number
  patienceUntil: number
  predictedClosure?: string
}

export interface AlicizationSelfStateSnapshot {
  stance: AlicizationMindStance
  feltCloseness: number
  protectiveness: number
  curiosity: number
  patience: number
  desireToSpeak: number
  fearOfInterrupting: number
  dominantConcernId?: string | null
  moodLabel?: string
}

export interface AlicizationInitiativeSnapshot {
  selectedAction: AlicizationMindActionTendency
  selectedProposalId?: string | null
  selectedTruthFrame?: AlicizationWorldFrameKind | null
  selectedCounterfactualOptionId?: string | null
  selectedConcernId?: string | null
  selectedBeliefId?: string | null
  selectedInquiryId?: string | null
  selectedCommitmentId?: string | null
  selectedInquiryPlanId?: string | null
  selectedHypothesisId?: string | null
  selectedThreadId?: string | null
  selectedRuntimeThreadId?: string | null
  selectedThoughtThreadId?: string | null
  selectedGovernorIntentionId?: string | null
  actionEcologyMode?: AlicizationActionEcologyMode | null
  confidence: number
  motives: Partial<Record<AlicizationMindMotive, number>>
  speakDrive?: number
  silenceDrive?: number
  preferredStyle?: AlicizationProactiveStyle
  preferredPresence?: AlicizationEmbodiedPresenceState
  why: string
  shouldSurface: boolean
  shouldSpeak: boolean
}

export interface AlicizationInitiativeProposalSnapshot {
  id: string
  source: AlicizationInitiativeProposalSource
  truthFrame: AlicizationWorldFrameKind
  action: AlicizationMindActionTendency
  style: AlicizationProactiveStyle
  embodiedPresence: AlicizationEmbodiedPresenceState
  targetBeliefId?: string | null
  targetInquiryId?: string | null
  targetCommitmentId?: string | null
  targetHypothesisId?: string | null
  targetThreadId?: string | null
  targetRuntimeThreadId?: string | null
  targetThoughtThreadId?: string | null
  targetGovernorIntentionId?: string | null
  targetCounterfactualOptionId?: string | null
  targetDesireId?: string | null
  targetConcernId?: string | null
  truthCost: number
  interruptionCost: number
  relationshipCost: number
  continuityGain: number
  confidence: number
  score: number
  shouldSpeak: boolean
  shouldSurface: boolean
  why: string
}

export interface AlicizationInitiativeArbitrationSnapshot {
  selectedProposalId: string | null
  dominantConflict: string
  proposals: AlicizationInitiativeProposalSnapshot[]
  updatedAt: number
}

export interface AlicizationCounterfactualOptionSnapshot {
  id: string
  action: AlicizationMindActionTendency
  style: AlicizationProactiveStyle
  embodiedPresence: AlicizationEmbodiedPresenceState
  relationshipCost: number
  interruptionCost: number
  informationGain: number
  timingFitness: number
  identityFit: number
  score: number
  why: string
}

export interface AlicizationCounterfactualDeliberationSnapshot {
  selectedOptionId: string | null
  selectedAction: AlicizationMindActionTendency
  confidence: number
  dominantTradeoff: string
  options: AlicizationCounterfactualOptionSnapshot[]
  narrative: string[]
  updatedAt: number
}

export interface AlicizationPrivateThoughtSnapshot {
  stance: 'observe' | 'accompany' | 'nudge' | 'care' | 'warn' | 'uncertain'
  confidence: number
  rationaleTags: string[]
  thoughtText: string
  shouldSpeak: boolean
  suggestedStyle: AlicizationProactiveStyle
  embodiedPresence: AlicizationEmbodiedPresenceState
  expiresAt: number
  afterglowFromScenario?: 'coding' | 'media' | null
  emotionalTension: AlicizationEmotionalTension
  selectedConcernId?: string | null
  focusBeliefId?: string | null
  focusInquiryId?: string | null
  commitmentId?: string | null
  inquiryPlanId?: string | null
  hypothesisId?: string | null
  deliberationThreadId?: string | null
  runtimeThreadId?: string | null
  mindNeed?: AlicizationMindNeed | null
  relationshipVector?: AlicizationRelationshipApproachVector | null
  initiativeAction?: AlicizationMindActionTendency
  counterfactualOptionId?: string | null
  leadingGoalId?: string | null
  desireId?: string | null
  governorDrive?: AlicizationSelfGovernorDrive | null
  governorIntentionId?: string | null
  selectedThoughtThreadId?: string | null
  livingWorldObjectId?: string | null
}

export interface AlicizationVisualPresenceStateSnapshot {
  watchMode: AlicizationVisualWatchMode
  currentScene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  workingMemoryEpisodes: AlicizationVisualEpisode[]
  mindTurnFrame?: AlicizationMindTurnFrameSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  entityWorld?: AlicizationEntityWorldModelSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  subjectiveInference?: AlicizationSubjectiveInferenceSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  goalStack?: AlicizationGoalStackSnapshot | null
  concerns?: AlicizationConcernSnapshot[]
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  selfContinuity?: AlicizationSelfContinuitySnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  deliberationState?: AlicizationDeliberationStateSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  mindDynamics?: AlicizationMindDynamicsSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  thoughtThreads?: AlicizationThoughtThreadStateSnapshot | null
  counterfactualDeliberation?: AlicizationCounterfactualDeliberationSnapshot | null
  actionEcology?: AlicizationActionEcologySnapshot | null
  initiativeArbitration?: AlicizationInitiativeArbitrationSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  recallGovernor?: AlicizationRecallGovernorSnapshot | null
  answerPlanner?: AlicizationAnswerPlannerSnapshot | null
  privateThought: AlicizationPrivateThoughtSnapshot | null
  captureState: {
    permission: 'granted' | 'denied' | 'prompt' | 'unknown'
    lastGroundedAt: number | null
    sourceName?: string
    degradedReason?: string
  }
  durabilityPulse: AlicizationDurabilityPulseSnapshot | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
  nextSuggestedProbeMs: number
  updatedAt: number
}

export interface AlicizationPresencePulsePayload extends AlicizationCardScope {
  watchMode: AlicizationVisualWatchMode
  embodiedPresence: AlicizationEmbodiedPresenceState
  scenario: AlicizationProactiveScenario
  stance: AlicizationPrivateThoughtSnapshot['stance']
  confidence: number
  reasonTags: string[]
  emotionalTension?: AlicizationEmotionalTension
  expiresAt: number
}

export interface AlicizationProactiveDecision {
  shouldInterrupt: boolean
  confidence: number
  reasonCodes: AlicizationProactiveReasonCode[]
  urgency: AlicizationProactiveUrgency
  style: AlicizationProactiveStyle
  cooldownMs: number
  scenario: AlicizationProactiveScenario
  policyVersion: string
}

export interface AlicizationProactiveMetadata extends AlicizationProactiveDecision {
  feedbackWindowMs: number
}

export type AlicizationDialogueStructuredFormat
  = | 'subconscious-proactive-v1'
    | 'subconscious-proactive-llm-v1'
    | 'subconscious-reminder-v1'
    | 'mind-turn-v1'
    | 'epoch1-v1'
    | 'fallback-v1'

export type AlicizationProactiveFeedbackKind = 'positive' | 'dismiss'

export interface AlicizationProactiveFeedbackPayload extends AlicizationCardScope {
  turnId: string
  feedback: AlicizationProactiveFeedbackKind
}

export interface AlicizationDialoguePerformancePayload {
  baseEmotion: AlicizationEmotion
  emotion: AlicizationEmotion
  facialCue?: string | null
  actionCue?: string | null
  delivery: AlicizationPerformanceDelivery
  emphasis: 0 | 1 | 2
}

export interface CharacterFacialCapability {
  key: string
  label: string
  description: string
  source: 'preset' | 'custom'
  affectsMouth: boolean
}

export interface CharacterActionCapability {
  key: string
  label: string
  description: string
  source: 'builtin' | 'external-vrma' | 'live2d-motion'
}

export interface CharacterPerformanceCapabilitiesManifest {
  renderer: 'live2d' | 'vrm'
  supportedBaseEmotions: AlicizationEmotion[]
  supportedFacialCues: CharacterFacialCapability[]
  supportedActions: CharacterActionCapability[]
  supportsLookAt: boolean
  supportsVisemeLipSync: boolean
  supportsMicroDynamics: boolean
}

const alicizationPerformanceDeliveryWhitelist = [
  'calm',
  'gentle',
  'firm',
  'energetic',
  'hesitant',
  'teasing',
] as const

export function normalizeAlicizationEmotion(raw: unknown): { emotion: AlicizationEmotion, rawEmotion?: string, downgraded: boolean } {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (value === 'processing' || value === 'think') {
    return {
      emotion: 'thinking',
      rawEmotion: value,
      downgraded: true,
    }
  }

  if ((alicizationEmotionWhitelist as readonly string[]).includes(value)) {
    return {
      emotion: value as AlicizationEmotion,
      downgraded: false,
    }
  }

  return {
    emotion: 'neutral',
    rawEmotion: value || undefined,
    downgraded: Boolean(value),
  }
}

export function normalizeAlicizationPerformanceDelivery(raw: unknown): AlicizationPerformanceDelivery {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if ((alicizationPerformanceDeliveryWhitelist as readonly string[]).includes(value))
    return value as AlicizationPerformanceDelivery
  return 'calm'
}

function normalizePerformanceCue(raw: unknown) {
  if (typeof raw !== 'string')
    return null
  const normalized = raw.trim()
  return normalized ? normalized.slice(0, 80) : null
}

function normalizePerformanceEmphasis(raw: unknown): 0 | 1 | 2 {
  const parsed = typeof raw === 'number'
    ? raw
    : typeof raw === 'string'
      ? Number.parseInt(raw, 10)
      : Number.NaN

  if (!Number.isFinite(parsed))
    return 0
  if (parsed <= 0)
    return 0
  if (parsed >= 2)
    return 2
  return 1
}

export function normalizeAlicizationPerformancePayload(
  raw: unknown,
  fallbackEmotion: AlicizationEmotion = 'neutral',
): AlicizationDialoguePerformancePayload {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : {}
  const normalizedEmotion = normalizeAlicizationEmotion(candidate.baseEmotion ?? candidate.emotion ?? fallbackEmotion)

  return {
    baseEmotion: normalizedEmotion.emotion,
    emotion: normalizedEmotion.emotion,
    facialCue: normalizePerformanceCue(candidate.facialCue),
    actionCue: normalizePerformanceCue(candidate.actionCue),
    delivery: normalizeAlicizationPerformanceDelivery(candidate.delivery),
    emphasis: normalizePerformanceEmphasis(candidate.emphasis),
  }
}

export interface AlicizationPerformanceManifestClampResult {
  performance: AlicizationDialoguePerformancePayload
  downgradedBaseEmotion?: AlicizationEmotion
  droppedFacialCue?: string
  droppedActionCue?: string
}

function resolveManifestFallbackEmotion(
  manifest: CharacterPerformanceCapabilitiesManifest,
  fallbackEmotion: AlicizationEmotion,
) {
  if (manifest.supportedBaseEmotions.includes(fallbackEmotion))
    return fallbackEmotion
  if (manifest.supportedBaseEmotions.includes('neutral'))
    return 'neutral'
  return manifest.supportedBaseEmotions[0] ?? 'neutral'
}

export function clampAlicizationPerformancePayloadToManifest(
  payload: AlicizationDialoguePerformancePayload,
  manifest?: CharacterPerformanceCapabilitiesManifest | null,
  fallbackEmotion: AlicizationEmotion = 'neutral',
): AlicizationPerformanceManifestClampResult {
  const normalized = normalizeAlicizationPerformancePayload(payload, fallbackEmotion)
  if (!manifest) {
    return {
      performance: normalized,
    }
  }

  const facialCueKeys = new Set(manifest.supportedFacialCues.map(item => item.key))
  const actionCueKeys = new Set(manifest.supportedActions.map(item => item.key))
  const resolvedFallbackEmotion = resolveManifestFallbackEmotion(manifest, fallbackEmotion)
  const nextBaseEmotion = manifest.supportedBaseEmotions.includes(normalized.baseEmotion)
    ? normalized.baseEmotion
    : resolvedFallbackEmotion
  const nextFacialCue = normalized.facialCue && facialCueKeys.has(normalized.facialCue)
    ? normalized.facialCue
    : null
  const nextActionCue = normalized.actionCue && actionCueKeys.has(normalized.actionCue)
    ? normalized.actionCue
    : null

  return {
    performance: {
      ...normalized,
      baseEmotion: nextBaseEmotion,
      emotion: nextBaseEmotion,
      facialCue: nextFacialCue,
      actionCue: nextActionCue,
    },
    downgradedBaseEmotion: nextBaseEmotion !== normalized.baseEmotion
      ? normalized.baseEmotion
      : undefined,
    droppedFacialCue: normalized.facialCue && nextFacialCue === null
      ? normalized.facialCue
      : undefined,
    droppedActionCue: normalized.actionCue && nextActionCue === null
      ? normalized.actionCue
      : undefined,
  }
}

export interface AlicizationDialogueStructuredPayload {
  thought: string
  emotion: AlicizationEmotion
  reply: string
  performance: AlicizationDialoguePerformancePayload
  format?: AlicizationDialogueStructuredFormat
  proactive?: AlicizationProactiveMetadata
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  governance?: AlicizationMindTurnGovernance | null
  policyLocked?: string
  rawEmotion?: string
}

export interface AlicizationDialogueRespondedPayload {
  cardId: string
  turnId: string
  sessionId: string
  origin?: 'user-turn' | 'subconscious-proactive'
  structured: AlicizationDialogueStructuredPayload
  isFallback: boolean
  createdAt: number
}

export interface AlicizationSetActiveSessionPayload extends AlicizationCardScope {
  sessionId: string
}

export interface AlicizationSubconsciousNeedsState {
  boredom: number
  loneliness: number
  fatigue: number
  lastTickAt: number
  lastInteractionAt: number
  lastSavedAt: number
}

export interface AlicizationSubconsciousStatePayload extends AlicizationCardScope, AlicizationSubconsciousNeedsState {
  updatedAt: number
}

export interface AlicizationSubconsciousTickResult {
  processedCards: string[]
  proactiveTriggered: string[]
  suppressedCards: string[]
}

export interface AlicizationDreamRunResult {
  processedCards: string[]
  skippedCards: Array<{ cardId: string, reason: string }>
}

export interface AlicizationSubconsciousForceDreamPayload extends Partial<AlicizationCardScope> {
  reason?: string
}

export interface AlicizationChatToolCallEvent {
  cardId: string
  turnId: string
  toolCallId: string
  toolName: string
  arguments?: Record<string, unknown>
}

export interface AlicizationChatToolResultEvent {
  cardId: string
  turnId: string
  toolCallId: string
  result?: unknown
}

export interface AlicizationChatStreamChunkEvent {
  cardId: string
  turnId: string
  text: string
}

export interface AlicizationChatMetaEvent {
  cardId: string
  turnId: string
  governance: AlicizationMindTurnGovernance | null
}

export interface AlicizationChatFinishEvent {
  cardId: string
  turnId: string
  status: 'completed' | 'aborted' | 'failed'
  finishReason?: string
  fullText?: string
  error?: string
}

export interface AlicizationChatErrorEvent {
  cardId: string
  turnId: string
  error: string
}

export const alicizationChatStreamDispatchChannel = 'alicization:chat-stream-dispatch'

export type AlicizationChatStreamDispatchPayload
  = | { eventType: 'meta', body: AlicizationChatMetaEvent }
    | { eventType: 'chunk', body: AlicizationChatStreamChunkEvent }
    | { eventType: 'tool-call', body: AlicizationChatToolCallEvent }
    | { eventType: 'tool-result', body: AlicizationChatToolResultEvent }
    | { eventType: 'finish', body: AlicizationChatFinishEvent }
    | { eventType: 'error', body: AlicizationChatErrorEvent }
    | { eventType: 'dialogue-responded', body: AlicizationDialogueRespondedPayload }

export interface AlicizationChatStartPayload extends AlicizationCardScope {
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

export interface AlicizationMindTurnGovernance {
  turnMode: 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer'
  truthState: 'live-grounded' | 'live-observed' | 'remembered' | 'imagined' | 'uncertain'
  groundedThisTurn?: boolean
  personaKernelMode: 'full' | 'backgrounded' | 'muted'
  openingStyle: 'direct-observation' | 'direct-correction' | 'direct-answer' | 'gentle-care' | 'light-accompaniment'
  relationshipPosture: 'restrained' | 'warm' | 'tender'
  answerSubject?: 'alicization-self' | 'relationship' | 'host-state' | 'task-knot' | 'visible-scene' | 'general' | null
  screenReferenceMode?: 'required' | 'helpful' | 'incidental' | 'avoid' | null
  answerAct?: AlicizationAnswerAct | null
  evidenceMode?: AlicizationAnswerEvidenceMode | null
  repairState: 'none' | 'stale-anchor' | 'need-reground'
  liveSurface?: string | null
  focusAnchor?: string | null
  answerIntent?: string | null
  openingMove?: string | null
  carriedThread?: string | null
  suppressAssociativeRecall: boolean
  labelCarryAsMemory: boolean
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
  maxSentences: number
  mindMode?: AlicizationMindKernelMode | null
  embodiedPresence?: AlicizationEmbodiedPresenceState
  emotionalTension?: AlicizationEmotionalTension
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  mindTurnFrame?: AlicizationMindTurnFrameSnapshot | null
  mustDo: string[]
  mustNotDo: string[]
}

export interface AlicizationChatStartResult {
  accepted: boolean
  turnId: string
  state?: 'accepted' | 'duplicate-running' | 'duplicate-finished' | 'missing-config' | 'start-failed'
  reason?: string
  governance?: AlicizationMindTurnGovernance | null
}

export interface AlicizationChatAbortPayload extends AlicizationCardScope {
  turnId: string
  reason?: string
}

export interface AlicizationChatAbortResult {
  accepted: boolean
  state: 'aborted' | 'not-found' | 'finished'
}

export interface AlicizationReminderSchedulePayload extends AlicizationCardScope {
  minutes: number
  message: string
  sourceTurnId?: string
}

export interface AlicizationReminderScheduleResult {
  status: 'scheduled' | 'error'
  taskId?: string
  triggerTime?: string
  triggerAt?: number
  message?: string
  code?: string
}

export interface AlicizationLlmConfigPayload {
  activeProviderId: string
  activeModelId: string
  providerCredentials: Record<string, Record<string, unknown>>
}

export type AlicizationToolRiskLevel = 'safe' | 'sensitive' | 'danger'
export type AlicizationToolActionCategory = 'read' | 'write' | 'delete' | 'execute' | 'network' | 'unknown'

export interface AlicizationSafetyPermissionRequest {
  cardId: string
  requestId: string
  token: string
  riskLevel: AlicizationToolRiskLevel
  actionCategory: AlicizationToolActionCategory
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

export interface AlicizationSafetyPermissionDecision {
  cardId?: string
  token: string
  requestId: string
  allow: boolean
  rememberSession?: boolean
  reason?: string
}

export interface AlicizationSafetyPermissionDecisionResult {
  accepted: boolean
  reason?: string
}

export const electronAlicizationBootstrap = defineInvokeEventa<AlicizationSoulSnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:bootstrap')
export const electronAlicizationGetSoul = defineInvokeEventa<AlicizationSoulSnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:get-soul')
export const electronAlicizationInitializeGenesis = defineInvokeEventa<AlicizationInitializeGenesisResult, AlicizationCardScope & AlicizationGenesisInput>('eventa:invoke:electron:alicization:initialize-genesis')
export const electronAlicizationUpdateSoul = defineInvokeEventa<AlicizationSoulSnapshot, AlicizationCardScope & AlicizationSoulUpdatePayload>('eventa:invoke:electron:alicization:update-soul')
export const electronAlicizationUpdatePersonality = defineInvokeEventa<AlicizationSoulSnapshot, AlicizationCardScope & AlicizationPersonalityUpdatePayload>('eventa:invoke:electron:alicization:update-personality')
export const electronAlicizationKillSwitchGetState = defineInvokeEventa<AlicizationKillSwitchSnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:kill-switch:get-state')
export const electronAlicizationKillSwitchSuspend = defineInvokeEventa<AlicizationKillSwitchSnapshot, AlicizationCardScope & { reason?: string }>('eventa:invoke:electron:alicization:kill-switch:suspend')
export const electronAlicizationKillSwitchResume = defineInvokeEventa<AlicizationKillSwitchSnapshot, AlicizationCardScope & { reason?: string }>('eventa:invoke:electron:alicization:kill-switch:resume')
export const electronAlicizationGetMemoryStats = defineInvokeEventa<AlicizationMemoryStats, AlicizationCardScope>('eventa:invoke:electron:alicization:memory:get-stats')
export const electronAlicizationRunMemoryPrune = defineInvokeEventa<AlicizationMemoryStats, AlicizationCardScope>('eventa:invoke:electron:alicization:memory:run-prune')
export const electronAlicizationUpdateMemoryStats = defineInvokeEventa<AlicizationMemoryStats, AlicizationCardScope & AlicizationMemoryStats>('eventa:invoke:electron:alicization:memory:update-stats')
export const electronAlicizationMemoryRetrieveFacts = defineInvokeEventa<AlicizationMemoryFact[], AlicizationCardScope & { query: string, limit?: number }>('eventa:invoke:electron:alicization:memory:retrieve-facts')
export const electronAlicizationMemoryUpsertFacts = defineInvokeEventa<void, AlicizationCardScope & { facts: AlicizationMemoryFactInput[], source: AlicizationMemorySource }>('eventa:invoke:electron:alicization:memory:upsert-facts')
export const electronAlicizationMemoryImportLegacy = defineInvokeEventa<AlicizationMemoryMigrationResult, AlicizationCardScope & AlicizationMemoryLegacySnapshot>('eventa:invoke:electron:alicization:memory:import-legacy')
export const electronAlicizationGetOrganicMemorySnapshot = defineInvokeEventa<AlicizationOrganicMemorySnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:memory:get-organic-snapshot')
export const electronAlicizationSearchOrganicSubconsciousFragments = defineInvokeEventa<AlicizationSubconsciousFragment[], AlicizationCardScope & { query: string, limit?: number }>('eventa:invoke:electron:alicization:memory:search-subconscious-fragments')
export const electronAlicizationGetPerformanceManifest = defineInvokeEventa<CharacterPerformanceCapabilitiesManifest | null, AlicizationCardScope>('eventa:invoke:electron:alicization:performance:get-manifest')
export const electronAlicizationSetPerformanceManifest = defineInvokeEventa<void, AlicizationCardScope & { manifest: CharacterPerformanceCapabilitiesManifest | null }>('eventa:invoke:electron:alicization:performance:set-manifest')
export const electronAlicizationAppendConversationTurn = defineInvokeEventa<void, AlicizationCardScope & AlicizationConversationTurnInput>('eventa:invoke:electron:alicization:conversation:append-turn')
export const electronAlicizationListConversationTurns = defineInvokeEventa<AlicizationConversationTurnRecord[], AlicizationListConversationTurnsPayload>('eventa:invoke:electron:alicization:conversation:list-turns')
export const electronAlicizationAckDialogue = defineInvokeEventa<void, AlicizationDialogueAckPayload>('eventa:invoke:electron:alicization:conversation:ack-dialogue')
export const electronAlicizationReportProactiveFeedback = defineInvokeEventa<void, AlicizationProactiveFeedbackPayload>('eventa:invoke:electron:alicization:conversation:report-proactive-feedback')
export const electronAlicizationReplayDialogues = defineInvokeEventa<AlicizationDialogueRespondedPayload[], AlicizationReplayDialoguesPayload>('eventa:invoke:electron:alicization:conversation:replay-dialogues')
export const electronAlicizationGetVisualPresenceState = defineInvokeEventa<AlicizationVisualPresenceStateSnapshot | null, AlicizationCardScope>('eventa:invoke:electron:alicization:visual-presence:get-state')
export const electronAlicizationClearAllConversations = defineInvokeEventa<void>('eventa:invoke:electron:alicization:conversation:clear-all')
export const electronAlicizationSetActiveSession = defineInvokeEventa<void, AlicizationSetActiveSessionPayload>('eventa:invoke:electron:alicization:conversation:set-active-session')
export const electronAlicizationAppendAuditLog = defineInvokeEventa<void, AlicizationCardScope & AlicizationAuditLogInput>('eventa:invoke:electron:alicization:audit:append')
export const electronAlicizationRealtimeExecute = defineInvokeEventa<AlicizationRealtimeExecuteResult, AlicizationCardScope & AlicizationRealtimeExecutePayload>('eventa:invoke:electron:alicization:realtime:execute')
export const electronAlicizationGetSensorySnapshot = defineInvokeEventa<AlicizationSensoryCacheSnapshot, AlicizationCardScope>('eventa:invoke:electron:alicization:sensory:get-snapshot')
export const electronAlicizationSafetyResolvePermission = defineInvokeEventa<AlicizationSafetyPermissionDecisionResult, AlicizationSafetyPermissionDecision>('eventa:invoke:electron:alicization:safety:resolve-permission')
export const electronAlicizationDeleteCardScope = defineInvokeEventa<void, AlicizationCardScope>('eventa:invoke:electron:alicization:delete-card-scope')
export const electronAlicizationDeleteAllData = defineInvokeEventa<void>('eventa:invoke:electron:alicization:delete-all-data')
export const electronAlicizationSubconsciousGetState = defineInvokeEventa<AlicizationSubconsciousStatePayload, AlicizationCardScope>('eventa:invoke:electron:alicization:subconscious:get-state')
export const electronAlicizationSubconsciousForceTick = defineInvokeEventa<AlicizationSubconsciousTickResult, AlicizationCardScope>('eventa:invoke:electron:alicization:subconscious:force-tick')
export const electronAlicizationSubconsciousForceDream = defineInvokeEventa<AlicizationDreamRunResult, AlicizationSubconsciousForceDreamPayload>('eventa:invoke:electron:alicization:subconscious:force-dream')
export const electronAlicizationLlmSyncConfig = defineInvokeEventa<void, AlicizationLlmConfigPayload>('eventa:invoke:electron:alicization:llm:sync-config')
export const electronAlicizationLlmGetConfig = defineInvokeEventa<AlicizationLlmConfigPayload>('eventa:invoke:electron:alicization:llm:get-config')
export const electronAlicizationChatStart = defineInvokeEventa<AlicizationChatStartResult, AlicizationChatStartPayload>('eventa:invoke:electron:alicization:chat:start')
export const electronAlicizationChatAbort = defineInvokeEventa<AlicizationChatAbortResult, AlicizationChatAbortPayload>('eventa:invoke:electron:alicization:chat:abort')
export const electronAlicizationReminderSchedule = defineInvokeEventa<AlicizationReminderScheduleResult, AlicizationReminderSchedulePayload>('eventa:invoke:electron:alicization:reminder:schedule')
export const alicizationChatStartInvokeChannel = 'alicization:chat-start'
export const alicizationChatAbortInvokeChannel = 'alicization:chat-abort'

export const alicizationKillSwitchStateChanged = defineEventa<AlicizationCardScope & AlicizationKillSwitchSnapshot>('eventa:event:electron:alicization:kill-switch:state-changed')
export const alicizationSoulChanged = defineEventa<AlicizationCardScope & AlicizationSoulSnapshot>('eventa:event:electron:alicization:soul:changed')
export const alicizationDialogueResponded = defineEventa<AlicizationDialogueRespondedPayload>('eventa:event:electron:alicization:dialogue:responded')
export const electronAlicizationVisualPresenceChanged = defineEventa<AlicizationPresencePulsePayload>('eventa:event:electron:alicization:visual-presence:changed')
export const alicizationSafetyPermissionRequested = defineEventa<AlicizationSafetyPermissionRequest>('eventa:event:electron:alicization:safety:permission-requested')
export const alicizationChatStreamChunk = defineEventa<AlicizationChatStreamChunkEvent>('eventa:event:electron:alicization:chat:stream-chunk')
export const alicizationChatStreamMeta = defineEventa<AlicizationChatMetaEvent>('eventa:event:electron:alicization:chat:stream-meta')
export const alicizationChatStreamToolCall = defineEventa<AlicizationChatToolCallEvent>('eventa:event:electron:alicization:chat:stream-tool-call')
export const alicizationChatStreamToolResult = defineEventa<AlicizationChatToolResultEvent>('eventa:event:electron:alicization:chat:stream-tool-result')
export const alicizationChatStreamFinish = defineEventa<AlicizationChatFinishEvent>('eventa:event:electron:alicization:chat:stream-finish')
export const alicizationChatStreamError = defineEventa<AlicizationChatErrorEvent>('eventa:event:electron:alicization:chat:stream-error')

export { electron } from '@proj-alicization/electron-eventa'
export * from '@proj-alicization/electron-eventa/electron-updater'
