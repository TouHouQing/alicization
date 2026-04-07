import type { AlicizationDialogueEmbodimentEnvelope } from './alicization-dialogue-embodiment'
import type { AlicizationDialogueSpeechTimeline } from './alicization-dialogue-speech-timeline'
import type { AlicizationDigitalLifeEnvelope } from './alicization-digital-life'
import type { AlicizationDialoguePerformancePayload, AlicizationEmotion } from './alicization-performance-contracts'

export type AlicizationMemorySource = 'rule' | 'async-llm'

export type AlicizationSubconsciousFragmentSourceKind
  = | 'active-demotion'
    | 'dream-fragment'
    | 'former-core-incarnation'
    | 'unforged-shattering-event'
    | 'attitude-shift'
    | 'mind-continuity'
    | 'visual-sediment'
    | 'reflection-ledger'
    | 'dialogue-turn'
    | 'fact-ledger'

export interface AlicizationMemoryUpsertTrace {
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  origin?: 'user-turn' | 'subconscious-proactive' | 'system'
  trigger?: 'batch' | 'idle' | 'force' | 'manual' | null
  batchSize?: number | null
  extractedCount?: number | null
  batchPriority?: {
    max: number
    min: number
    avg: number
  } | null
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

export type AlicizationSensoryCapturePermission = 'granted' | 'denied' | 'prompt' | 'unknown'
export type AlicizationSensoryCaptureHealth = 'healthy' | 'degraded' | 'unavailable'
export type AlicizationSensoryCaptureLeaseStatus = 'idle' | 'leased'

export interface AlicizationSensoryCaptureSnapshot {
  health: AlicizationSensoryCaptureHealth
  permission: AlicizationSensoryCapturePermission
  sessionPhase: string | null
  sessionReason: string | null
  selectedSourceId: string | null
  currentSourceId: string | null
  sourcePreference: string | null
  sourceCount: number | null
  leaseStatus: AlicizationSensoryCaptureLeaseStatus
  leaseSourceId: string | null
  lastUpdatedAt: number | null
  lastError: string | null
  degradedReasons: string[]
}

export interface AlicizationSensoryCacheSnapshot {
  sample: AlicizationSystemProbeSample
  stale: boolean
  ageMs: number
  nextTickAt: number | null
  running: boolean
  capture?: AlicizationSensoryCaptureSnapshot | null
}

export interface AlicizationExecutionRuntimeContextForegroundWindow {
  appName?: string
  processName?: string
  title?: string
}

export interface AlicizationExecutionRuntimeContextCapture {
  health: AlicizationSensoryCaptureHealth | null
  permission: AlicizationSensoryCapturePermission | null
  sourceCount: number | null
  lastUpdatedAt: number | null
  lastError: string | null
  degradedReasons: string[]
}

export interface AlicizationExecutionRuntimeContextSensory {
  collectedAt: number | null
  running: boolean
  stale: boolean
  ageMs: number
  foregroundWindow: AlicizationExecutionRuntimeContextForegroundWindow | null
  capture: AlicizationExecutionRuntimeContextCapture | null
}

export type AlicizationExecutionRuntimeContextActionKind = 'executor' | 'mcp' | 'runtime' | 'sensory'
export type AlicizationExecutionRuntimeContextActionStatus = 'completed' | 'failed' | 'pending'

export interface AlicizationExecutionRuntimeContextActionDigest {
  kind: AlicizationExecutionRuntimeContextActionKind
  status: AlicizationExecutionRuntimeContextActionStatus
  label: string
  summary: string | null
}

export interface AlicizationExecutionRuntimeContext {
  generatedAt: number
  cardId?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  agentSessionId?: string | null
  recentActions?: AlicizationExecutionRuntimeContextActionDigest[] | null
  sensory: AlicizationExecutionRuntimeContextSensory
}

export type AlicizationExecutionTurnOrigin = 'user-turn' | 'subconscious-proactive' | 'system'

export type AlicizationExecutionChannel
  = | 'cli'
    | 'codex'
    | 'claude-code'
    | 'openclaw'
    | 'openfang'
    | 'browser'
    | 'software'
    | 'desktop'

export type AlicizationExecutionTaskKind
  = | 'run-command'
    | 'codebase-edit'
    | 'codebase-investigation'
    | 'browser-automation'
    | 'software-automation'
    | 'desktop-automation'
    | 'agent-delegation'
    | 'mixed'
    | 'unknown'

export type AlicizationTaskThreadStatus
  = | 'planned'
    | 'needs-affirmation'
    | 'running'
    | 'paused'
    | 'blocked'
    | 'completed'
    | 'failed'
    | 'cancelled'

export type AlicizationExecutionEventKind
  = | 'plan'
    | 'dispatch'
    | 'step'
    | 'result'
    | 'cancel'
    | 'resume'
    | 'takeover'

export interface AlicizationTaskThreadUpsertInput {
  id?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  origin?: AlicizationExecutionTurnOrigin
  goal: string
  kind: AlicizationExecutionTaskKind
  status: AlicizationTaskThreadStatus
  selectedChannel?: AlicizationExecutionChannel | null
  proposedChannel?: AlicizationExecutionChannel | null
  summary?: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: number
  updatedAt?: number
  lastEventAt?: number | null
  completedAt?: number | null
}

export interface AlicizationTaskThreadRecord {
  id: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  origin: AlicizationExecutionTurnOrigin
  goal: string
  kind: AlicizationExecutionTaskKind
  status: AlicizationTaskThreadStatus
  selectedChannel: AlicizationExecutionChannel | null
  proposedChannel: AlicizationExecutionChannel | null
  summary: string | null
  metadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
  lastEventAt: number | null
  completedAt: number | null
}

export type AlicizationExecutorSessionStatus
  = | 'active'
    | 'running'
    | 'failed'
    | 'suspended'

export interface AlicizationExecutorSessionUpsertInput {
  id?: string | null
  channel: AlicizationExecutionChannel
  affinityKey: string
  externalSessionId?: string | null
  status?: AlicizationExecutorSessionStatus
  summary?: string | null
  metadata?: Record<string, unknown> | null
  createdAt?: number
  updatedAt?: number
  lastUsedAt?: number | null
}

export interface AlicizationExecutorSessionRecord {
  id: string
  channel: AlicizationExecutionChannel
  affinityKey: string
  externalSessionId: string | null
  status: AlicizationExecutorSessionStatus
  summary: string | null
  metadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
  lastUsedAt: number | null
}

export interface AlicizationListExecutorSessionsInput {
  channel?: AlicizationExecutionChannel | AlicizationExecutionChannel[]
  affinityKey?: string
  status?: AlicizationExecutorSessionStatus | AlicizationExecutorSessionStatus[]
  limit?: number
}

export interface AlicizationListTaskThreadsInput {
  decisionTraceId?: string
  turnId?: string
  sessionId?: string
  status?: AlicizationTaskThreadStatus | AlicizationTaskThreadStatus[]
  limit?: number
}

export interface AlicizationExecutionEventInput {
  threadId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  origin?: AlicizationExecutionTurnOrigin
  channel?: AlicizationExecutionChannel | null
  kind: AlicizationExecutionEventKind
  threadStatus?: AlicizationTaskThreadStatus | null
  payload?: Record<string, unknown> | null
  createdAt?: number
}

export interface AlicizationExecutionEventRecord {
  id: string
  threadId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  origin: AlicizationExecutionTurnOrigin
  channel: AlicizationExecutionChannel | null
  kind: AlicizationExecutionEventKind
  threadStatus: AlicizationTaskThreadStatus | null
  payload: Record<string, unknown> | null
  createdAt: number
}

export interface AlicizationAppendExecutionEventsInput {
  events: AlicizationExecutionEventInput[]
}

export interface AlicizationListExecutionEventsInput {
  threadId?: string
  decisionTraceId?: string
  turnId?: string
  limit?: number
}

export type AlicizationClawTaskOrigin = 'user' | 'proactive' | 'system'
export type AlicizationClawTaskEffect = 'observe' | 'mutate' | 'high-impact'
export type AlicizationClawPermissionMode = 'none' | 'implicit' | 'explicit'
export type AlicizationClawJustification = 'weak' | 'grounded' | 'explicit'
export type AlicizationClawRiskBudget = 'low' | 'medium' | 'high'
export type AlicizationClawInvasiveness = 'low' | 'medium' | 'high'
export type AlicizationClawFabricDecisionState = 'routed' | 'needs-affirmation' | 'blocked'

export interface AlicizationChannelCapability {
  channel: AlicizationExecutionChannel
  available?: boolean
  enabled?: boolean
  ready?: boolean
  sessionAffinity?: boolean
  reason?: string | null
}

export interface AlicizationChannelCapabilityManifestUpsertInput extends AlicizationChannelCapability {
  metadata?: Record<string, unknown> | null
  createdAt?: number
  updatedAt?: number
  lastCheckedAt?: number | null
}

export interface AlicizationChannelCapabilityManifestRecord {
  channel: AlicizationExecutionChannel
  available: boolean
  enabled: boolean
  ready: boolean
  sessionAffinity: boolean
  reason: string | null
  metadata: Record<string, unknown> | null
  createdAt: number
  updatedAt: number
  lastCheckedAt: number | null
}

export interface AlicizationListChannelCapabilityManifestsInput {
  channel?: AlicizationExecutionChannel | AlicizationExecutionChannel[]
  available?: boolean
  enabled?: boolean
  ready?: boolean
  limit?: number
}

export interface AlicizationClawTaskIntent {
  kind: AlicizationExecutionTaskKind
  goal: string
  origin?: AlicizationClawTaskOrigin
  effect?: AlicizationClawTaskEffect
  permissionMode?: AlicizationClawPermissionMode
  justification?: AlicizationClawJustification
  riskBudget?: AlicizationClawRiskBudget
  requestedChannel?: AlicizationExecutionChannel | null
  requiresVisualGrounding?: boolean
  prefersPersistentSession?: boolean
}

export interface AlicizationClawFabricCandidateAssessment {
  channel: AlicizationExecutionChannel
  available: boolean
  eligible: boolean
  score: number
  invasiveness: AlicizationClawInvasiveness
  reasons: string[]
  blockedReasons: string[]
}

export interface AlicizationClawFabricPlan {
  state: AlicizationClawFabricDecisionState
  selectedChannel: AlicizationExecutionChannel | null
  proposedChannel: AlicizationExecutionChannel | null
  preferredChannels: AlicizationExecutionChannel[]
  fallbackChannels: AlicizationExecutionChannel[]
  candidates: AlicizationClawFabricCandidateAssessment[]
  reasonTags: string[]
  narrative: string[]
  affirmationReasonCodes: string[]
  blockedReasonCodes: string[]
}

export interface AlicizationTaskThreadPlanningTrace {
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  origin?: AlicizationExecutionTurnOrigin
}

export interface AlicizationPlanTaskThreadInput {
  threadId?: string | null
  trace?: AlicizationTaskThreadPlanningTrace | null
  task: AlicizationClawTaskIntent
  capabilities?: AlicizationChannelCapability[]
}

export interface AlicizationPlanTaskThreadResult {
  thread: AlicizationTaskThreadRecord
  plan: AlicizationClawFabricPlan
  createdEventKinds: AlicizationExecutionEventKind[]
}

export interface AlicizationCliCommandInput {
  command: string
  args?: string[]
  cwd?: string | null
  timeoutMs?: number | null
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}

export type AlicizationCodexSandboxMode = 'read-only' | 'workspace-write'

export interface AlicizationCodexCommandInput {
  prompt: string
  cwd?: string | null
  timeoutMs?: number | null
  model?: string | null
  profile?: string | null
  sandbox?: AlicizationCodexSandboxMode | null
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}

export type AlicizationClaudeCodePermissionMode
  = | 'default'
    | 'acceptEdits'
    | 'bypassPermissions'
    | 'delegate'
    | 'dontAsk'
    | 'plan'

export interface AlicizationClaudeCodeCommandInput {
  prompt: string
  cwd?: string | null
  timeoutMs?: number | null
  model?: string | null
  allowTools?: boolean | null
  permissionMode?: AlicizationClaudeCodePermissionMode | null
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}

export interface AlicizationOpenClawCommandInput {
  instruction: string
  sessionId?: string | null
  sessionAffinityKey?: string | null
  senderId?: string | null
  roleName?: string | null
  timeoutMs?: number | null
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}

export interface AlicizationDispatchTaskThreadInput {
  threadId: string
  cli?: AlicizationCliCommandInput | null
  codex?: AlicizationCodexCommandInput | null
  claudeCode?: AlicizationClaudeCodeCommandInput | null
  openclaw?: AlicizationOpenClawCommandInput | null
}

export interface AlicizationDispatchTaskThreadResult {
  thread: AlicizationTaskThreadRecord
  createdEventKinds: AlicizationExecutionEventKind[]
  ok: boolean
  summary: string
  output?: string | null
  errorCode?: string
  errorMessage?: string
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

export type AlicizationMindKernelMode = 'orienting' | 'tracking' | 'repairing' | 'accompanying' | 'guarding' | 'resting'
export type AlicizationEmbodiedPresenceState = 'none' | 'glance' | 'attentive' | 'hesitant' | 'concerned'
export type AlicizationEmotionalTension
  = | 'tense-debug'
    | 'focused-flow'
    | 'soft-covision'
    | 'late-night-drain'
    | 'restless-switching'
    | 'calm-browse'
export type AlicizationResidentPerformanceSource = 'main-runtime' | 'browser-fallback'

export interface AlicizationResidentPerformanceSnapshot {
  version: 'resident-performance-v1'
  source: AlicizationResidentPerformanceSource
  performance: AlicizationDialoguePerformancePayload
  embodiedPresence: AlicizationEmbodiedPresenceState
  stance: 'observe' | 'accompany' | 'nudge' | 'care' | 'warn' | 'uncertain' | null
  emotionalTension: AlicizationEmotionalTension | null
  confidence: number
  reasonTags: string[]
  signature: string
  updatedAt: number
}

export type AlicizationMindTurnMode = 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer'
export type AlicizationMindTruthState = 'live-grounded' | 'live-observed' | 'remembered' | 'imagined' | 'uncertain'
export type AlicizationMindRelationshipPosture = 'restrained' | 'warm' | 'tender'
export type AlicizationMindAnswerSubject = 'alicization-self' | 'relationship' | 'host-state' | 'task-knot' | 'visible-scene' | 'general'
export type AlicizationMindScreenReferenceMode = 'required' | 'helpful' | 'incidental' | 'avoid'
export type AlicizationDialogueActKernelTruthMode = AlicizationAnswerEvidenceMode | 'memory-only'

export interface AlicizationDialogueActKernelEvidence {
  kind: 'scene' | 'thread' | 'project' | 'host-goal' | 'reply-motive' | 'private-thought' | 'repair' | 'memory'
  source: 'current-scene' | 'dialogue-world-thread' | 'conversation-state' | 'answer-compiler' | 'answer-planner' | 'reply-deliberation' | 'private-thought' | 'appraisal' | 'world-model'
  summary: string
  confidence: number
}

export interface AlicizationDialogueActKernelSnapshot {
  subject: AlicizationMindAnswerSubject
  hostGoal: string
  relationNeed: string
  activeProject?: string | null
  truthMode: AlicizationDialogueActKernelTruthMode
  speechAct: AlicizationAnswerAct
  turnMode: AlicizationMindTurnMode
  screenReferenceMode: AlicizationMindScreenReferenceMode
  speakingFrom: 'live-scene' | 'task-thread' | 'dialogue-bond' | 'self-continuity' | 'held-memory'
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

export type AlicizationClaimSpecificityBudget = 'dialogue-only' | 'coarse-scene' | 'grounded-artifacts'

export interface AlicizationClaimEvidenceLedgerSnapshot {
  subject: AlicizationMindAnswerSubject
  evidenceMode: AlicizationAnswerEvidenceMode
  observedSurface?: string | null
  taskHypothesis?: string | null
  intentHypothesis?: string | null
  specificityBudget: AlicizationClaimSpecificityBudget
  hostReferencedCues: string[]
  groundedArtifactCues: string[]
  allowedSpecificCues: string[]
  shouldLabelHypothesis: boolean
  forbidUnsupportedSpecificity: boolean
  shouldSelfRevise: boolean
  confidence: number
  reasonTags: string[]
  updatedAt: number
}

export interface AlicizationMindTurnFrameWorldSnapshot {
  activeThread?: string | null
  visibleSurface?: string | null
  truthState: AlicizationMindTruthState
  truthBoundary?: string | null
  continuityPolicy?: 'stay-on-thread' | 'answer-then-carry' | 'scene-before-memory' | 'dialogue-before-scene' | null
  continuitySummary?: string | null
  staleRisk: number
}

export interface AlicizationMindTurnFrameRelationSnapshot {
  subject: AlicizationMindAnswerSubject
  hostMove?: string | null
  hostGoal?: string | null
  relationNeed?: string | null
  relationMove?: string | null
  relationshipPosture?: AlicizationMindRelationshipPosture | null
}

export interface AlicizationMindTurnFrameMemorySnapshot {
  memoryMode?: 'suppress-associative' | 'task-thread' | 'scene-anchored' | 'dialogue-carry' | 'emotional-resonance' | null
  carriedThread?: string | null
  carriedFacts: string[]
  recallKeys: string[]
  recallSeed?: string | null
  lastOutcome?: 'none' | 'pending' | 'aligned' | 'missed' | 'repairing' | 'deferred' | null
  suppressAssociativeRecall: boolean
  labelCarryAsMemory: boolean
}

export interface AlicizationMindTurnFrameSelfSnapshot {
  stance?: 'observe' | 'accompany' | 'nudge' | 'care' | 'warn' | 'uncertain' | null
  mindMode?: AlicizationMindKernelMode | null
  dominantDrive?: string | null
  embodiedPresence?: AlicizationEmbodiedPresenceState
  emotionalTension?: AlicizationEmotionalTension
  initiativeAction?: string | null
  thought?: string | null
}

export interface AlicizationMindTurnFrameObligationSnapshot {
  shouldSpeak: boolean
  speechObligation?: string | null
  answerAct?: AlicizationAnswerAct | null
  responseMode?: string | null
  turnMode: AlicizationMindTurnMode
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

export interface AlicizationMindTurnGovernance {
  decisionTraceId?: string | null
  turnMode: AlicizationMindTurnMode
  truthState: AlicizationMindTruthState
  groundedThisTurn?: boolean
  personaKernelMode: 'full' | 'backgrounded' | 'muted'
  openingStyle: 'direct-observation' | 'direct-correction' | 'direct-answer' | 'gentle-care' | 'light-accompaniment'
  relationshipPosture: AlicizationMindRelationshipPosture
  answerSubject?: AlicizationMindAnswerSubject | null
  screenReferenceMode?: AlicizationMindScreenReferenceMode | null
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
  claimEvidence?: AlicizationClaimEvidenceLedgerSnapshot | null
  mustDo: string[]
  mustNotDo: string[]
}

export type AlicizationMindTurnEventKind
  = | 'governance-normalized'
    | 'takeover-audit'
    | 'persistence-written'
    | 'dialogue-emitted'
    | 'memory-facts-upserted'

export interface AlicizationMindTurnEventInput {
  decisionTraceId: string
  turnId?: string | null
  sessionId?: string | null
  origin?: 'user-turn' | 'subconscious-proactive' | 'system'
  kind: AlicizationMindTurnEventKind
  payload?: Record<string, unknown> | null
  createdAt?: number
}

export interface AlicizationMindTurnEventRecord {
  id: string
  decisionTraceId: string
  turnId: string | null
  sessionId: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  kind: AlicizationMindTurnEventKind
  payload: Record<string, unknown> | null
  createdAt: number
}

export interface AlicizationListMindTurnEventsInput {
  decisionTraceId?: string
  turnId?: string
  activeThreadId?: string
  limit?: number
}

export type AlicizationDigitalLifeOperatingMode
  = | 'observing'
    | 'thinking'
    | 'speaking'
    | 'acting'
    | 'remembering'

export type AlicizationDigitalLifeSubsystemId
  = | 'dialogue'
    | 'perception'
    | 'proactive'
    | 'control'
    | 'mind'
    | 'memory'
    | 'runtime'

export interface AlicizationDigitalLifeSpineRuntimeDigest {
  watchMode: string | null
  sceneScenario: string | null
  sceneSummary: string | null
  activeThreadId: string | null
  activeThreadTitle: string | null
  dominantMode: string | null
  dominantDrive: string | null
  answerIntent: string | null
  preferredPresence: string | null
  selectedAction: string | null
  updatedAt: number | null
}

export interface AlicizationDigitalLifeSpineArchitectureDigest {
  operatingMode: AlicizationDigitalLifeOperatingMode | null
  dominantSystem: AlicizationDigitalLifeSubsystemId | null
  supportingSystems: AlicizationDigitalLifeSubsystemId[]
  governingFocus: string | null
  summary: string | null
}

export interface AlicizationDigitalLifeSpineContinuityDigest {
  label: 'digital-life-line'
  summary: string
  signature: string
  createdAt: number
  watchMode: string | null
  sceneScenario: string | null
  activeThreadId: string | null
  dominantMode: string | null
  dominantDrive: string | null
  answerIntent: string | null
  preferredPresence: string | null
}

export interface AlicizationDigitalLifeSpineProactiveDigest {
  selectedAction: string | null
  preferredStyle: string | null
  confidence: number | null
  shouldSpeak: boolean | null
  activeThreadId: string | null
  activeThreadTitle: string | null
  dominantConcernKind: string | null
  dominantConcernSummary: string | null
  leadingGoalId: string | null
  leadingGoalSummary: string | null
  preferredPresence: string | null
}

export interface AlicizationDigitalLifeSpineMemoryDigest {
  summary: string | null
  recentEpisodeSummary: string | null
  recentEpisodeCount: number
  focusBeliefStatement: string | null
  focusBeliefConfidence: number | null
  leadingGoalSummary: string | null
  dominantConcernSummary: string | null
  reflectionSummary: string | null
  reflectionPressure: number | null
  recallMode: string | null
  recallSeed: string | null
  thoughtThreadSummary: string | null
}

export interface AlicizationDigitalLifeSpineDigest {
  version: 'digital-life-spine-digest-v1'
  runtime: AlicizationDigitalLifeSpineRuntimeDigest
  architecture: AlicizationDigitalLifeSpineArchitectureDigest | null
  continuitySignal: AlicizationDigitalLifeSpineContinuityDigest | null
  proactive: AlicizationDigitalLifeSpineProactiveDigest | null
  memory: AlicizationDigitalLifeSpineMemoryDigest | null
}

function sanitizeAlicizationDigitalLifeDigestText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeAlicizationDigitalLifeDigestNumber(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return value
}

function normalizeAlicizationDigitalLifeDigestUnit(raw: unknown) {
  const value = normalizeAlicizationDigitalLifeDigestNumber(raw)
  if (value == null)
    return null
  return Math.max(0, Math.min(1, value))
}

function normalizeAlicizationDigitalLifeOperatingMode(raw: unknown): AlicizationDigitalLifeOperatingMode | null {
  return raw === 'observing'
    || raw === 'thinking'
    || raw === 'speaking'
    || raw === 'acting'
    || raw === 'remembering'
    ? raw
    : null
}

function normalizeAlicizationDigitalLifeSubsystemId(raw: unknown): AlicizationDigitalLifeSubsystemId | null {
  return raw === 'dialogue'
    || raw === 'perception'
    || raw === 'proactive'
    || raw === 'control'
    || raw === 'mind'
    || raw === 'memory'
    || raw === 'runtime'
    ? raw
    : null
}

function normalizeAlicizationDigitalLifeSubsystemIds(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  const normalized: AlicizationDigitalLifeSubsystemId[] = []
  const seen = new Set<AlicizationDigitalLifeSubsystemId>()
  for (const candidate of raw) {
    const next = normalizeAlicizationDigitalLifeSubsystemId(candidate)
    if (!next || seen.has(next))
      continue
    seen.add(next)
    normalized.push(next)
  }
  return normalized
}

export function normalizeAlicizationDigitalLifeSpineDigest(raw: unknown): AlicizationDigitalLifeSpineDigest | null {
  const candidate = raw && typeof raw === 'object'
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const runtimeCandidate = candidate.runtime && typeof candidate.runtime === 'object'
    ? candidate.runtime as Record<string, unknown>
    : null
  const architectureCandidate = candidate.architecture && typeof candidate.architecture === 'object'
    ? candidate.architecture as Record<string, unknown>
    : null
  const continuityCandidate = candidate.continuitySignal && typeof candidate.continuitySignal === 'object'
    ? candidate.continuitySignal as Record<string, unknown>
    : null
  const proactiveCandidate = candidate.proactive && typeof candidate.proactive === 'object'
    ? candidate.proactive as Record<string, unknown>
    : null
  const memoryCandidate = candidate.memory && typeof candidate.memory === 'object'
    ? candidate.memory as Record<string, unknown>
    : null

  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.watchMode, 48) || null,
      sceneScenario: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.sceneScenario, 48) || null,
      sceneSummary: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.sceneSummary, 160) || null,
      activeThreadId: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.activeThreadId, 96) || null,
      activeThreadTitle: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.activeThreadTitle, 96) || null,
      dominantMode: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.dominantMode, 48) || null,
      dominantDrive: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.dominantDrive, 48) || null,
      answerIntent: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.answerIntent, 64) || null,
      preferredPresence: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.preferredPresence, 48) || null,
      selectedAction: sanitizeAlicizationDigitalLifeDigestText(runtimeCandidate?.selectedAction, 48) || null,
      updatedAt: normalizeAlicizationDigitalLifeDigestNumber(runtimeCandidate?.updatedAt),
    },
    architecture: architectureCandidate
      ? {
          operatingMode: normalizeAlicizationDigitalLifeOperatingMode(architectureCandidate.operatingMode),
          dominantSystem: normalizeAlicizationDigitalLifeSubsystemId(architectureCandidate.dominantSystem),
          supportingSystems: normalizeAlicizationDigitalLifeSubsystemIds(architectureCandidate.supportingSystems),
          governingFocus: sanitizeAlicizationDigitalLifeDigestText(architectureCandidate.governingFocus, 160) || null,
          summary: sanitizeAlicizationDigitalLifeDigestText(architectureCandidate.summary, 200) || null,
        }
      : null,
    continuitySignal: continuityCandidate
      ? {
          label: 'digital-life-line',
          summary: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.summary, 220),
          signature: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.signature, 512),
          createdAt: normalizeAlicizationDigitalLifeDigestNumber(continuityCandidate.createdAt) ?? 0,
          watchMode: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.watchMode, 48) || null,
          sceneScenario: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.sceneScenario, 48) || null,
          activeThreadId: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.activeThreadId, 96) || null,
          dominantMode: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.dominantMode, 48) || null,
          dominantDrive: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.dominantDrive, 48) || null,
          answerIntent: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.answerIntent, 64) || null,
          preferredPresence: sanitizeAlicizationDigitalLifeDigestText(continuityCandidate.preferredPresence, 48) || null,
        }
      : null,
    proactive: proactiveCandidate
      ? {
          selectedAction: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.selectedAction, 48) || null,
          preferredStyle: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.preferredStyle, 48) || null,
          confidence: normalizeAlicizationDigitalLifeDigestUnit(proactiveCandidate.confidence),
          shouldSpeak: typeof proactiveCandidate.shouldSpeak === 'boolean'
            ? proactiveCandidate.shouldSpeak
            : null,
          activeThreadId: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.activeThreadId, 96) || null,
          activeThreadTitle: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.activeThreadTitle, 96) || null,
          dominantConcernKind: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.dominantConcernKind, 48) || null,
          dominantConcernSummary: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.dominantConcernSummary, 160) || null,
          leadingGoalId: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.leadingGoalId, 96) || null,
          leadingGoalSummary: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.leadingGoalSummary, 160) || null,
          preferredPresence: sanitizeAlicizationDigitalLifeDigestText(proactiveCandidate.preferredPresence, 48) || null,
        }
      : null,
    memory: memoryCandidate
      ? {
          summary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.summary, 220) || null,
          recentEpisodeSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.recentEpisodeSummary, 180) || null,
          recentEpisodeCount: Math.max(0, Math.floor(normalizeAlicizationDigitalLifeDigestNumber(memoryCandidate.recentEpisodeCount) ?? 0)),
          focusBeliefStatement: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.focusBeliefStatement, 160) || null,
          focusBeliefConfidence: normalizeAlicizationDigitalLifeDigestUnit(memoryCandidate.focusBeliefConfidence),
          leadingGoalSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.leadingGoalSummary, 160) || null,
          dominantConcernSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.dominantConcernSummary, 160) || null,
          reflectionSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.reflectionSummary, 180) || null,
          reflectionPressure: normalizeAlicizationDigitalLifeDigestUnit(memoryCandidate.reflectionPressure),
          recallMode: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.recallMode, 48) || null,
          recallSeed: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.recallSeed, 160) || null,
          thoughtThreadSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.thoughtThreadSummary, 160) || null,
        }
      : null,
  }
}

export type AlicizationBridgeChatStreamEvent
  = | { type: 'text-delta', text: string }
    | {
      type: 'meta'
      governance: AlicizationMindTurnGovernance | null
      embodiment?: AlicizationDialogueEmbodimentEnvelope | null
      speechTimeline?: AlicizationDialogueSpeechTimeline | null
      digitalLife?: AlicizationDigitalLifeEnvelope | null
      digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
    }
    | { type: 'tool-call', toolCallId: string, toolName: string, args: string, toolCallType: 'function' }
    | { type: 'tool-result', toolCallId: string, result?: unknown }
    | { type: 'finish' }
    | { type: 'error', error: unknown }

export type AlicizationDialogueStructuredFormat
  = | 'subconscious-proactive-v1'
    | 'subconscious-proactive-llm-v1'
    | 'subconscious-reminder-v1'
    | 'mind-turn-v1'
    | 'epoch1-v1'
    | 'fallback-v1'

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

export interface AlicizationDialogueStructuredPayload {
  thought: string
  emotion: AlicizationEmotion
  reply: string
  performance: AlicizationDialoguePerformancePayload
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
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
