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
  = | { eventType: 'chunk', body: AlicizationChatStreamChunkEvent }
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

export interface AlicizationChatStartResult {
  accepted: boolean
  turnId: string
  state?: 'accepted' | 'duplicate-running' | 'duplicate-finished' | 'missing-config' | 'start-failed'
  reason?: string
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
export const alicizationSafetyPermissionRequested = defineEventa<AlicizationSafetyPermissionRequest>('eventa:event:electron:alicization:safety:permission-requested')
export const alicizationChatStreamChunk = defineEventa<AlicizationChatStreamChunkEvent>('eventa:event:electron:alicization:chat:stream-chunk')
export const alicizationChatStreamToolCall = defineEventa<AlicizationChatToolCallEvent>('eventa:event:electron:alicization:chat:stream-tool-call')
export const alicizationChatStreamToolResult = defineEventa<AlicizationChatToolResultEvent>('eventa:event:electron:alicization:chat:stream-tool-result')
export const alicizationChatStreamFinish = defineEventa<AlicizationChatFinishEvent>('eventa:event:electron:alicization:chat:stream-finish')
export const alicizationChatStreamError = defineEventa<AlicizationChatErrorEvent>('eventa:event:electron:alicization:chat:stream-error')

export { electron } from '@proj-alicization/electron-eventa'
export * from '@proj-alicization/electron-eventa/electron-updater'
