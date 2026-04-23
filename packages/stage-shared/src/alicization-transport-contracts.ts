import type { AlicizationDialogueEmbodimentEnvelope } from './alicization-dialogue-embodiment'
import type { AlicizationDialogueSpeechTimeline } from './alicization-dialogue-speech-timeline'
import type { AlicizationDigitalLifeEnvelope } from './alicization-digital-life'
import type { AlicizationDialoguePerformancePayload, AlicizationEmotion } from './alicization-performance-contracts'

export type AlicizationMemorySource = 'rule' | 'async-llm'

export type AlicizationSubconsciousFragmentSourceKind
  = | 'active-demotion'
    | 'autobiographical-episode'
    | 'dream-fragment'
    | 'former-core-incarnation'
    | 'unforged-shattering-event'
    | 'attitude-shift'
    | 'mind-continuity'
    | 'visual-sediment'
    | 'reflection-ledger'
    | 'dialogue-turn'
    | 'fact-ledger'

export type AlicizationMemoryProvenance
  = | 'observed'
    | 'remembered'
    | 'dreamt'
    | 'inferred'
    | 'reconstructed'

export type AlicizationEpisodicEventSourceKind
  = | 'reply'
    | 'dialogue-feedback'
    | 'execution-proposal'
    | 'execution-result'
    | 'proactive'
    | 'dream'
    | 'dream-reforge'
    | 'reflection'
    | 'maintenance'

export interface AlicizationRelationshipShiftSnapshot {
  closenessDelta: number
  trustDelta: number
  burdenDelta: number
  boundaryDelta: number
  misreadDelta: number
  repairDelta: number
  openLoopDelta: number
}

export interface AlicizationDerivedMemoryReference {
  kind:
    | 'turn'
    | 'mind-turn-event'
    | 'relationship-outcome'
    | 'reinforcement-event'
    | 'memory-fact'
    | 'reflection'
    | 'dream'
    | 'episodic-event'
    | 'task-thread'
    | 'execution-event'
    | 'scene'
  id?: string | null
  label?: string | null
}

export interface AlicizationEpisodicReconsolidationSnapshot {
  at: number
  provenance: AlicizationMemoryProvenance
  confidence: number
  reason: string
  emotionTags: string[]
  relationshipMeaning?: string | null
  lesson?: string | null
}

export interface AlicizationEpisodicEventInput {
  id?: string | null
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  sourceKind: AlicizationEpisodicEventSourceKind
  provenance: AlicizationMemoryProvenance
  occurredAt?: number
  whereSummary?: string | null
  withWhom?: string[] | null
  threadAnchor?: string | null
  whatHappened: string
  felt?: string | null
  emotionTags?: string[] | null
  whatChanged?: string | null
  relationshipMeaning?: string | null
  lesson?: string | null
  sourceSummary?: string | null
  confidence: number
  salience?: number | null
  sceneAttachment?: number | null
  consolidationPriority?: number | null
  relationshipShift?: AlicizationRelationshipShiftSnapshot | null
  derivedFrom?: AlicizationDerivedMemoryReference[] | null
  tags?: string[] | null
  createdAt?: number
  updatedAt?: number
}

export interface AlicizationEpisodicEventRecord {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  sourceKind: AlicizationEpisodicEventSourceKind
  provenance: AlicizationMemoryProvenance
  occurredAt: number
  whereSummary: string | null
  withWhom: string[]
  threadAnchor: string | null
  whatHappened: string
  felt: string | null
  emotionTags: string[]
  whatChanged: string | null
  relationshipMeaning: string | null
  lesson: string | null
  sourceSummary: string | null
  confidence: number
  salience: number
  sceneAttachment: number
  consolidationPriority: number
  relationshipShift: AlicizationRelationshipShiftSnapshot | null
  derivedFrom: AlicizationDerivedMemoryReference[]
  tags: string[]
  createdAt: number
  updatedAt: number
  lastRecalledAt: number | null
  recallCount: number
  reconsolidationCount: number
  latestReconsolidation: AlicizationEpisodicReconsolidationSnapshot | null
}

export interface AlicizationHostPersonClosenessPreference {
  context: string
  preference: string
  confidence: number
}

export interface AlicizationHostPersonTrustLadderSnapshot {
  stage: 'guarded' | 'cautious-open' | 'warming' | 'trusted'
  score: number
  rationale: string
}

export interface AlicizationHostPersonModelSnapshot {
  summary: string
  routines: string[]
  sensitivities: string[]
  repairTriggers: string[]
  trustLadder: AlicizationHostPersonTrustLadderSnapshot
  preferredClosenessByContext: AlicizationHostPersonClosenessPreference[]
  recurrentBurdens: string[]
  narrative: string[]
  updatedAt: number
}

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

export interface AlicizationRealtimeSurfaceField {
  label: string
  value: string
}

export interface AlicizationRealtimeSurfaceItem {
  title: string
  meta?: string | null
  url?: string | null
}

export interface AlicizationRealtimeSurface {
  kind: AlicizationRealtimeCategory | 'generic'
  title?: string | null
  lead?: string | null
  fields?: AlicizationRealtimeSurfaceField[] | null
  items?: AlicizationRealtimeSurfaceItem[] | null
}

export interface AlicizationRealtimeExecuteResult {
  category: AlicizationRealtimeCategory
  source: 'builtin'
  ok: boolean
  summary?: string
  surface?: AlicizationRealtimeSurface | null
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

export interface AlicizationOpenClawContentPart {
  type: 'text' | 'image' | 'audio' | 'file' | 'video'
  text?: string
  image_url?: string
  video_url?: string
  data?: string
  format?: string
  file_url?: string
  filename?: string
  file_id?: string
}

export interface AlicizationOpenClawCommandInput {
  instruction: string
  sessionId?: string | null
  sessionAffinityKey?: string | null
  senderId?: string | null
  roleName?: string | null
  channelId?: string | null
  conversationId?: string | null
  timeoutMs?: number | null
  contentParts?: AlicizationOpenClawContentPart[] | null
  images?: Array<string | Record<string, unknown>> | null
  audios?: Array<string | Record<string, unknown>> | null
  files?: Array<string | Record<string, unknown>> | null
  meta?: Record<string, unknown> | null
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
export type AlicizationMindTruthState
  = | 'live-grounded'
    | 'live-observed'
    | 'dialogue-grounded'
    | 'remembered'
    | 'imagined'
    | 'uncertain'
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
    | 'recall-attribution'
    | 'takeover-audit'
    | 'persistence-written'
    | 'dialogue-emitted'
    | 'reply-memory-coherence'
    | 'memory-facts-upserted'
    | 'memory-reconsolidated'

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

export interface AlicizationDigitalLifeSpineAutonomyDigest {
  selectedMode: string | null
  visibleAction: string | null
  shouldSurface: boolean | null
  shouldSpeak: boolean | null
  shouldAct: boolean | null
  speakReadiness: number | null
  actReadiness: number | null
  inhibition: number | null
  confidence: number | null
  executionIntentKind: string | null
  executionIntentSummary: string | null
  deferReason: string | null
  whyNow: string | null
  sourceGoalId: string | null
  sourceGoalSummary: string | null
  sourceAgendaKind: string | null
  sourceAgendaSummary: string | null
  sourceThreadId: string | null
  sourceThreadSummary: string | null
}

export type AlicizationLongHorizonMemoryCueInfluence
  = | 'bond'
    | 'boundary'
    | 'care'
    | 'truth'
    | 'play'
    | 'task'
    | 'identity'

export interface AlicizationLongHorizonMemoryCueSnapshot {
  factId: string
  subject: string
  predicate: string
  object: string
  confidence: number
  weight: number
  influenceTags: AlicizationLongHorizonMemoryCueInfluence[]
  summary: string
  lastRecalledAt: number
}

export interface AlicizationLongHorizonMemorySnapshot {
  preferenceBias: {
    companionship: number
    truthfulGrounding: number
    gentleRepair: number
    quietObservation: number
    proactiveCare: number
    playfulIntimacy: number
    autonomyRespect: number
    unfinishedThreadReturn: number
  }
  identityBias: {
    guardedness: number
    tenderness: number
    directness: number
    selfDirection: number
  }
  anchorFacts: AlicizationLongHorizonMemoryCueSnapshot[]
  summary: string
  dominantCueSummary?: string | null
  rememberedPreferenceSummary?: string | null
  rememberedConstraintSummary?: string | null
  rememberedPlanSummary?: string | null
  updatedAt: number
}

export type AlicizationMemoryReflectionSourceKind = 'reply' | 'proactive' | 'execution' | 'maintenance'
export type AlicizationMemoryReflectionTargetScope = 'self' | 'relationship' | 'boundary' | 'truth' | 'task' | 'habit'
export type AlicizationMemoryReflectionStatus = 'pending' | 'confirmed' | 'denied' | 'superseded'

export interface AlicizationMemoryReflectionInput {
  id?: string | null
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  sourceKind: AlicizationMemoryReflectionSourceKind
  targetScope: AlicizationMemoryReflectionTargetScope
  summary: string
  lesson: string
  status?: AlicizationMemoryReflectionStatus
  confidence: number
  supportingFactIds?: string[] | null
  supportingOutcomeIds?: string[] | null
  createdAt?: number
  updatedAt?: number
  confirmedAt?: number | null
  deniedAt?: number | null
}

export interface AlicizationMemoryReflectionRecord {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  sourceKind: AlicizationMemoryReflectionSourceKind
  targetScope: AlicizationMemoryReflectionTargetScope
  summary: string
  lesson: string
  status: AlicizationMemoryReflectionStatus
  confidence: number
  supportingFactIds: string[]
  supportingOutcomeIds: string[]
  createdAt: number
  updatedAt: number
  confirmedAt: number | null
  deniedAt: number | null
}

export type AlicizationRelationshipOutcomeSourceKind = 'reply' | 'proactive' | 'execution'

export interface AlicizationRelationshipOutcomeInput {
  id?: string | null
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  sourceKind: AlicizationRelationshipOutcomeSourceKind
  actionSummary: string
  closenessDelta: number
  trustDelta: number
  burdenDelta: number
  boundaryDelta: number
  misreadDelta: number
  repairDelta: number
  openLoopDelta: number
  summary: string
  createdAt?: number
}

export interface AlicizationRelationshipOutcomeRecord {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  sourceKind: AlicizationRelationshipOutcomeSourceKind
  actionSummary: string
  closenessDelta: number
  trustDelta: number
  burdenDelta: number
  boundaryDelta: number
  misreadDelta: number
  repairDelta: number
  openLoopDelta: number
  summary: string
  createdAt: number
}

export type AlicizationPersonaReinforcementDimension
  = | 'companionship'
    | 'truthful-grounding'
    | 'gentle-repair'
    | 'autonomy-respect'
    | 'unfinished-thread-return'
    | 'temper-guardedness'
    | 'temper-directness'

export type AlicizationPersonaReinforcementValence = 'reinforce' | 'suppress'

export interface AlicizationPersonaReinforcementEventInput {
  id?: string | null
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  sourceKind: AlicizationRelationshipOutcomeSourceKind
  dimension: AlicizationPersonaReinforcementDimension
  delta: number
  valence: AlicizationPersonaReinforcementValence
  summary: string
  createdAt?: number
}

export interface AlicizationPersonaReinforcementEventRecord {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  sourceKind: AlicizationRelationshipOutcomeSourceKind
  dimension: AlicizationPersonaReinforcementDimension
  delta: number
  valence: AlicizationPersonaReinforcementValence
  summary: string
  createdAt: number
}

export type AlicizationMindHeadKey
  = | 'autobiographical-self'
    | 'reflection-ledger'
    | 'motive-engine'
    | 'habit-policy'

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
  recollectionSummary?: string | null
  recollectionSurfaceSummary?: string | null
  recollectionConfidence?: number | null
  thoughtThreadSummary: string | null
  longHorizonSummary?: string | null
  rememberedPreferenceSummary?: string | null
  rememberedConstraintSummary?: string | null
  rememberedPlanSummary?: string | null
  longHorizonCueCount?: number | null
}

export interface AlicizationDigitalLifeSpineEmbodimentDigest {
  privateThought: {
    stance: string | null
    confidence: number | null
    shouldSpeak: boolean | null
    suggestedStyle: string | null
    embodiedPresence: string | null
    emotionalTension: string | null
    relationshipVector: string | null
    initiativeAction: string | null
    governorDrive: string | null
  } | null
  selfContinuity: {
    attachmentMode: string | null
    initiativeTemperament: string | null
    perceptionTrust: number | null
    relationshipTrust: number | null
    guardingTendency: number | null
    misreadBurden: number | null
    carryOverDesire: number | null
  } | null
  autobiographicalSelf: {
    attachmentStyle: string | null
    expressionStyle: string | null
    conflictStyle: string | null
    agencyStyle: string | null
    attachmentNeed: number | null
    autonomyNeed: number | null
    truthAnchor: number | null
    careBias: number | null
    playBias: number | null
    irritabilityThreshold: number | null
    stubbornness: number | null
    companionship: number | null
    truthfulGrounding: number | null
    gentleRepair: number | null
    quietObservation: number | null
    proactiveCare: number | null
    playfulIntimacy: number | null
    autonomyRespect: number | null
    unfinishedThreadReturn: number | null
    stability: number | null
    identityNarrative: string | null
    relationshipDoctrine: string | null
  } | null
  relationship: {
    climate: string | null
    approachVector: string | null
    receptivity: number | null
    sharedAttentionTrust: number | null
    correctionSensitivity: number | null
    reciprocityExpectation: number | null
  } | null
  selfState: {
    stance: string | null
    feltCloseness: number | null
    protectiveness: number | null
    curiosity: number | null
    patience: number | null
    desireToSpeak: number | null
    fearOfInterrupting: number | null
    moodLabel: string | null
  } | null
  mindEcology: {
    moodLabel: string | null
    replyHabit: string | null
    relationshipHabit: string | null
    explorationHabit: string | null
    regulationHabit: string | null
    selfNarrative: string | null
    relationNarrative: string | null
    currentPreoccupation: string | null
    temperament: {
      attachment: number | null
      curiosity: number | null
      steadiness: number | null
      directness: number | null
      playfulness: number | null
      irritability: number | null
      tenderness: number | null
    }
    climate: {
      valence: number | null
      arousal: number | null
      socialNeed: number | null
      solitudeNeed: number | null
      irritation: number | null
      restlessness: number | null
      reflectivePull: number | null
    }
  } | null
  initiative: {
    selectedAction: string | null
    preferredStyle: string | null
    preferredPresence: string | null
    confidence: number | null
    shouldSpeak: boolean | null
    speakDrive: number | null
    silenceDrive: number | null
    why: string | null
  } | null
}

export interface AlicizationDigitalLifeSpineMotiveDigest {
  rulingDrive: string | null
  returnPressure: number | null
  companionshipDrive: number | null
  boundaryRespectDrive: number | null
  truthDisciplineDrive: number | null
  restProtectionDrive: number | null
  selfDirectionDrive: number | null
  leadingGoalSummary: string | null
  leadingAgendaKind: string | null
  leadingAgendaSummary: string | null
  narrative: string | null
}

export interface AlicizationDigitalLifeSpineHabitDigest {
  dominantMode: string | null
  requiresGroundingBeforeSurface: boolean | null
  prefersQuietCompanionship: boolean | null
  blocksDirectSpeakWhenBusy: boolean | null
  protectsRestWindow: boolean | null
  returnViaRecheck: boolean | null
  suggestedStyleCap: string | null
  suggestedPresenceCap: string | null
  narrative: string | null
}

export interface AlicizationDigitalLifeSpineOutcomeLearningDigest {
  reflectionTargetScope: string | null
  reflectionSummary: string | null
  reflectionLesson: string | null
  latestInflection: string | null
  revisionPressure: number | null
  autobiographicalStability: number | null
  summary: string | null
}

export interface AlicizationDigitalLifeSpineDigest {
  version: 'digital-life-spine-digest-v1'
  runtime: AlicizationDigitalLifeSpineRuntimeDigest
  architecture: AlicizationDigitalLifeSpineArchitectureDigest | null
  continuitySignal: AlicizationDigitalLifeSpineContinuityDigest | null
  proactive: AlicizationDigitalLifeSpineProactiveDigest | null
  autonomy?: AlicizationDigitalLifeSpineAutonomyDigest | null
  embodiment?: AlicizationDigitalLifeSpineEmbodimentDigest | null
  memory: AlicizationDigitalLifeSpineMemoryDigest | null
  motive?: AlicizationDigitalLifeSpineMotiveDigest | null
  habit?: AlicizationDigitalLifeSpineHabitDigest | null
  outcomeLearning?: AlicizationDigitalLifeSpineOutcomeLearningDigest | null
}

export type AlicizationRuntimeChannelId
  = | 'dialogue'
    | 'active-perception'
    | 'active-dialogue'
    | 'active-control'
    | 'active-mind'
    | 'active-memory'
    | 'anthropomorphic-mind'
    | 'agent-runtime'

export type AlicizationRuntimeChannelState = 'hot' | 'warm' | 'idle'

export interface AlicizationRuntimeChannelDigest {
  id: AlicizationRuntimeChannelId
  state: AlicizationRuntimeChannelState
  readiness: number
  focus: string | null
  summary: string
}

export type AlicizationActiveLoopPhase = 'observe' | 'dialogue' | 'control' | 'integrate'

export interface AlicizationActiveLoopDigest {
  version: 'alicization-active-loop-v1'
  phase: AlicizationActiveLoopPhase
  dominantChannel: AlicizationRuntimeChannelId | null
  handoffTarget: AlicizationRuntimeChannelId | null
  dialogueReady: boolean
  controlReady: boolean
  memoryCarry: boolean
  companionshipReady: boolean
  observationHeavy: boolean
  initiativeBudget: number
  coherence: number
  summary: string
}

export interface AlicizationRuntimeAutonomyDigest {
  selectedMode: string | null
  visibleAction: string | null
  shouldSpeak: boolean
  shouldAct: boolean
  speakReadiness: number
  actReadiness: number
  inhibition: number
  confidence: number
  executionIntentKind: string | null
  executionIntentSummary: string | null
  deferReason: string | null
  whyNow: string | null
}

export interface AlicizationRuntimeDigest {
  version: 'alicization-runtime-digest-v1'
  dominantChannel: AlicizationRuntimeChannelId
  activeLoop?: AlicizationActiveLoopDigest | null
  autonomy?: AlicizationRuntimeAutonomyDigest | null
  shouldProactivelySpeak: boolean
  shouldProactivelyAct: boolean
  continuityPressure: number
  companionshipPressure: number
  rulingMotive?: string | null
  habitMode?: string | null
  truthDisciplinePressure?: number | null
  boundaryPressure?: number | null
  restProtectionPressure?: number | null
  returnPressure?: number | null
  channels: AlicizationRuntimeChannelDigest[]
  summary: string
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

function normalizeAlicizationDigitalLifeDigestBoolean(raw: unknown) {
  return typeof raw === 'boolean' ? raw : null
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

function normalizeAlicizationRuntimeChannelId(raw: unknown): AlicizationRuntimeChannelId | null {
  return raw === 'dialogue'
    || raw === 'active-perception'
    || raw === 'active-dialogue'
    || raw === 'active-control'
    || raw === 'active-mind'
    || raw === 'active-memory'
    || raw === 'anthropomorphic-mind'
    || raw === 'agent-runtime'
    ? raw
    : null
}

function normalizeAlicizationRuntimeChannelState(raw: unknown): AlicizationRuntimeChannelState | null {
  return raw === 'hot'
    || raw === 'warm'
    || raw === 'idle'
    ? raw
    : null
}

function deriveAlicizationRuntimeChannelState(readiness: number): AlicizationRuntimeChannelState {
  if (readiness >= 0.72)
    return 'hot'
  if (readiness >= 0.38)
    return 'warm'
  return 'idle'
}

function normalizeAlicizationActiveLoopPhase(raw: unknown): AlicizationActiveLoopPhase | null {
  return raw === 'observe'
    || raw === 'dialogue'
    || raw === 'control'
    || raw === 'integrate'
    ? raw
    : null
}

function deriveAlicizationActiveLoopPhase(input: {
  dialogueReady: boolean
  controlReady: boolean
  observationHeavy: boolean
}) {
  if (input.observationHeavy && !input.dialogueReady && !input.controlReady)
    return 'observe' as const
  if (input.controlReady)
    return 'control' as const
  if (input.dialogueReady)
    return 'dialogue' as const
  return 'integrate' as const
}

export function normalizeAlicizationRuntimeDigest(raw: unknown): AlicizationRuntimeDigest | null {
  const candidate = raw && typeof raw === 'object'
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const rawChannels = Array.isArray(candidate.channels)
    ? candidate.channels
    : candidate.channels && typeof candidate.channels === 'object'
      ? Object.values(candidate.channels as Record<string, unknown>)
      : []
  const channels: AlicizationRuntimeChannelDigest[] = []
  const seen = new Set<AlicizationRuntimeChannelId>()
  for (const rawChannel of rawChannels) {
    const channelCandidate = rawChannel && typeof rawChannel === 'object'
      ? rawChannel as Record<string, unknown>
      : null
    const id = normalizeAlicizationRuntimeChannelId(channelCandidate?.id)
    if (!id || seen.has(id))
      continue
    seen.add(id)

    const readiness = normalizeAlicizationDigitalLifeDigestUnit(channelCandidate?.readiness) ?? 0
    channels.push({
      id,
      readiness,
      state: normalizeAlicizationRuntimeChannelState(channelCandidate?.state)
        ?? deriveAlicizationRuntimeChannelState(readiness),
      focus: sanitizeAlicizationDigitalLifeDigestText(channelCandidate?.focus, 120) || null,
      summary: sanitizeAlicizationDigitalLifeDigestText(channelCandidate?.summary, 220),
    })
  }

  const fallbackDominant = channels[0]?.id ?? 'active-mind'
  const dominantChannel = normalizeAlicizationRuntimeChannelId(candidate.dominantChannel) ?? fallbackDominant
  const activeLoopCandidate = candidate.activeLoop && typeof candidate.activeLoop === 'object'
    ? candidate.activeLoop as Record<string, unknown>
    : null
  const autonomyCandidate = candidate.autonomy && typeof candidate.autonomy === 'object'
    ? candidate.autonomy as Record<string, unknown>
    : null
  const dialogueReady = activeLoopCandidate?.dialogueReady === true
  const controlReady = activeLoopCandidate?.controlReady === true
  const observationHeavy = activeLoopCandidate?.observationHeavy === true

  return {
    version: 'alicization-runtime-digest-v1',
    dominantChannel,
    activeLoop: activeLoopCandidate
      ? {
          version: 'alicization-active-loop-v1',
          phase: normalizeAlicizationActiveLoopPhase(activeLoopCandidate.phase)
            ?? deriveAlicizationActiveLoopPhase({
              dialogueReady,
              controlReady,
              observationHeavy,
            }),
          dominantChannel: normalizeAlicizationRuntimeChannelId(activeLoopCandidate.dominantChannel) ?? dominantChannel,
          handoffTarget: normalizeAlicizationRuntimeChannelId(activeLoopCandidate.handoffTarget),
          dialogueReady,
          controlReady,
          memoryCarry: activeLoopCandidate.memoryCarry === true,
          companionshipReady: activeLoopCandidate.companionshipReady === true,
          observationHeavy,
          initiativeBudget: normalizeAlicizationDigitalLifeDigestUnit(activeLoopCandidate.initiativeBudget) ?? 0,
          coherence: normalizeAlicizationDigitalLifeDigestUnit(activeLoopCandidate.coherence) ?? 0,
          summary: sanitizeAlicizationDigitalLifeDigestText(activeLoopCandidate.summary, 240),
        }
      : null,
    autonomy: autonomyCandidate
      ? {
          selectedMode: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.selectedMode, 64) || null,
          visibleAction: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.visibleAction, 64) || null,
          shouldSpeak: autonomyCandidate.shouldSpeak === true,
          shouldAct: autonomyCandidate.shouldAct === true,
          speakReadiness: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.speakReadiness) ?? 0,
          actReadiness: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.actReadiness) ?? 0,
          inhibition: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.inhibition) ?? 0,
          confidence: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.confidence) ?? 0,
          executionIntentKind: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.executionIntentKind, 64) || null,
          executionIntentSummary: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.executionIntentSummary, 220) || null,
          deferReason: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.deferReason, 160) || null,
          whyNow: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.whyNow, 220) || null,
        }
      : null,
    shouldProactivelySpeak: candidate.shouldProactivelySpeak === true,
    shouldProactivelyAct: candidate.shouldProactivelyAct === true,
    continuityPressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.continuityPressure) ?? 0,
    companionshipPressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.companionshipPressure) ?? 0,
    rulingMotive: sanitizeAlicizationDigitalLifeDigestText(candidate.rulingMotive, 48) || null,
    habitMode: sanitizeAlicizationDigitalLifeDigestText(candidate.habitMode, 64) || null,
    truthDisciplinePressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.truthDisciplinePressure),
    boundaryPressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.boundaryPressure),
    restProtectionPressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.restProtectionPressure),
    returnPressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.returnPressure),
    channels,
    summary: sanitizeAlicizationDigitalLifeDigestText(candidate.summary, 240),
  }
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
  const autonomyCandidate = candidate.autonomy && typeof candidate.autonomy === 'object'
    ? candidate.autonomy as Record<string, unknown>
    : null
  const motiveCandidate = candidate.motive && typeof candidate.motive === 'object'
    ? candidate.motive as Record<string, unknown>
    : null
  const habitCandidate = candidate.habit && typeof candidate.habit === 'object'
    ? candidate.habit as Record<string, unknown>
    : null
  const outcomeLearningCandidate = candidate.outcomeLearning && typeof candidate.outcomeLearning === 'object'
    ? candidate.outcomeLearning as Record<string, unknown>
    : null
  const embodimentCandidate = candidate.embodiment && typeof candidate.embodiment === 'object'
    ? candidate.embodiment as Record<string, unknown>
    : null
  const memoryCandidate = candidate.memory && typeof candidate.memory === 'object'
    ? candidate.memory as Record<string, unknown>
    : null
  const privateThoughtCandidate = embodimentCandidate?.privateThought && typeof embodimentCandidate.privateThought === 'object'
    ? embodimentCandidate.privateThought as Record<string, unknown>
    : null
  const selfContinuityCandidate = embodimentCandidate?.selfContinuity && typeof embodimentCandidate.selfContinuity === 'object'
    ? embodimentCandidate.selfContinuity as Record<string, unknown>
    : null
  const autobiographicalSelfCandidate = embodimentCandidate?.autobiographicalSelf && typeof embodimentCandidate.autobiographicalSelf === 'object'
    ? embodimentCandidate.autobiographicalSelf as Record<string, unknown>
    : null
  const relationshipCandidate = embodimentCandidate?.relationship && typeof embodimentCandidate.relationship === 'object'
    ? embodimentCandidate.relationship as Record<string, unknown>
    : null
  const selfStateCandidate = embodimentCandidate?.selfState && typeof embodimentCandidate.selfState === 'object'
    ? embodimentCandidate.selfState as Record<string, unknown>
    : null
  const mindEcologyCandidate = embodimentCandidate?.mindEcology && typeof embodimentCandidate.mindEcology === 'object'
    ? embodimentCandidate.mindEcology as Record<string, unknown>
    : null
  const mindEcologyTemperamentCandidate = mindEcologyCandidate?.temperament && typeof mindEcologyCandidate.temperament === 'object'
    ? mindEcologyCandidate.temperament as Record<string, unknown>
    : null
  const mindEcologyClimateCandidate = mindEcologyCandidate?.climate && typeof mindEcologyCandidate.climate === 'object'
    ? mindEcologyCandidate.climate as Record<string, unknown>
    : null
  const initiativeCandidate = embodimentCandidate?.initiative && typeof embodimentCandidate.initiative === 'object'
    ? embodimentCandidate.initiative as Record<string, unknown>
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
    autonomy: autonomyCandidate
      ? {
          selectedMode: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.selectedMode, 64) || null,
          visibleAction: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.visibleAction, 64) || null,
          shouldSurface: normalizeAlicizationDigitalLifeDigestBoolean(autonomyCandidate.shouldSurface),
          shouldSpeak: normalizeAlicizationDigitalLifeDigestBoolean(autonomyCandidate.shouldSpeak),
          shouldAct: normalizeAlicizationDigitalLifeDigestBoolean(autonomyCandidate.shouldAct),
          speakReadiness: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.speakReadiness),
          actReadiness: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.actReadiness),
          inhibition: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.inhibition),
          confidence: normalizeAlicizationDigitalLifeDigestUnit(autonomyCandidate.confidence),
          executionIntentKind: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.executionIntentKind, 64) || null,
          executionIntentSummary: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.executionIntentSummary, 220) || null,
          deferReason: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.deferReason, 160) || null,
          whyNow: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.whyNow, 220) || null,
          sourceGoalId: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceGoalId, 96) || null,
          sourceGoalSummary: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceGoalSummary, 160) || null,
          sourceAgendaKind: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceAgendaKind, 64) || null,
          sourceAgendaSummary: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceAgendaSummary, 180) || null,
          sourceThreadId: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceThreadId, 96) || null,
          sourceThreadSummary: sanitizeAlicizationDigitalLifeDigestText(autonomyCandidate.sourceThreadSummary, 180) || null,
        }
      : null,
    motive: motiveCandidate
      ? {
          rulingDrive: sanitizeAlicizationDigitalLifeDigestText(motiveCandidate.rulingDrive, 48) || null,
          returnPressure: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.returnPressure),
          companionshipDrive: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.companionshipDrive),
          boundaryRespectDrive: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.boundaryRespectDrive),
          truthDisciplineDrive: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.truthDisciplineDrive),
          restProtectionDrive: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.restProtectionDrive),
          selfDirectionDrive: normalizeAlicizationDigitalLifeDigestUnit(motiveCandidate.selfDirectionDrive),
          leadingGoalSummary: sanitizeAlicizationDigitalLifeDigestText(motiveCandidate.leadingGoalSummary, 180) || null,
          leadingAgendaKind: sanitizeAlicizationDigitalLifeDigestText(motiveCandidate.leadingAgendaKind, 64) || null,
          leadingAgendaSummary: sanitizeAlicizationDigitalLifeDigestText(motiveCandidate.leadingAgendaSummary, 180) || null,
          narrative: sanitizeAlicizationDigitalLifeDigestText(motiveCandidate.narrative, 220) || null,
        }
      : null,
    habit: habitCandidate
      ? {
          dominantMode: sanitizeAlicizationDigitalLifeDigestText(habitCandidate.dominantMode, 64) || null,
          requiresGroundingBeforeSurface: normalizeAlicizationDigitalLifeDigestBoolean(habitCandidate.requiresGroundingBeforeSurface),
          prefersQuietCompanionship: normalizeAlicizationDigitalLifeDigestBoolean(habitCandidate.prefersQuietCompanionship),
          blocksDirectSpeakWhenBusy: normalizeAlicizationDigitalLifeDigestBoolean(habitCandidate.blocksDirectSpeakWhenBusy),
          protectsRestWindow: normalizeAlicizationDigitalLifeDigestBoolean(habitCandidate.protectsRestWindow),
          returnViaRecheck: normalizeAlicizationDigitalLifeDigestBoolean(habitCandidate.returnViaRecheck),
          suggestedStyleCap: sanitizeAlicizationDigitalLifeDigestText(habitCandidate.suggestedStyleCap, 64) || null,
          suggestedPresenceCap: sanitizeAlicizationDigitalLifeDigestText(habitCandidate.suggestedPresenceCap, 64) || null,
          narrative: sanitizeAlicizationDigitalLifeDigestText(habitCandidate.narrative, 220) || null,
        }
      : null,
    outcomeLearning: outcomeLearningCandidate
      ? {
          reflectionTargetScope: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.reflectionTargetScope, 48) || null,
          reflectionSummary: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.reflectionSummary, 180) || null,
          reflectionLesson: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.reflectionLesson, 220) || null,
          latestInflection: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.latestInflection, 180) || null,
          revisionPressure: normalizeAlicizationDigitalLifeDigestUnit(outcomeLearningCandidate.revisionPressure),
          autobiographicalStability: normalizeAlicizationDigitalLifeDigestUnit(outcomeLearningCandidate.autobiographicalStability),
          summary: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.summary, 220) || null,
        }
      : null,
    embodiment: embodimentCandidate
      ? {
          privateThought: privateThoughtCandidate
            ? {
                stance: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.stance, 48) || null,
                confidence: normalizeAlicizationDigitalLifeDigestUnit(privateThoughtCandidate.confidence),
                shouldSpeak: normalizeAlicizationDigitalLifeDigestBoolean(privateThoughtCandidate.shouldSpeak),
                suggestedStyle: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.suggestedStyle, 48) || null,
                embodiedPresence: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.embodiedPresence, 48) || null,
                emotionalTension: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.emotionalTension, 48) || null,
                relationshipVector: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.relationshipVector, 48) || null,
                initiativeAction: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.initiativeAction, 48) || null,
                governorDrive: sanitizeAlicizationDigitalLifeDigestText(privateThoughtCandidate.governorDrive, 48) || null,
              }
            : null,
          selfContinuity: selfContinuityCandidate
            ? {
                attachmentMode: sanitizeAlicizationDigitalLifeDigestText(selfContinuityCandidate.attachmentMode, 48) || null,
                initiativeTemperament: sanitizeAlicizationDigitalLifeDigestText(selfContinuityCandidate.initiativeTemperament, 48) || null,
                perceptionTrust: normalizeAlicizationDigitalLifeDigestUnit(selfContinuityCandidate.perceptionTrust),
                relationshipTrust: normalizeAlicizationDigitalLifeDigestUnit(selfContinuityCandidate.relationshipTrust),
                guardingTendency: normalizeAlicizationDigitalLifeDigestUnit(selfContinuityCandidate.guardingTendency),
                misreadBurden: normalizeAlicizationDigitalLifeDigestUnit(selfContinuityCandidate.misreadBurden),
                carryOverDesire: normalizeAlicizationDigitalLifeDigestUnit(selfContinuityCandidate.carryOverDesire),
              }
            : null,
          autobiographicalSelf: autobiographicalSelfCandidate
            ? {
                attachmentStyle: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.attachmentStyle, 48) || null,
                expressionStyle: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.expressionStyle, 48) || null,
                conflictStyle: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.conflictStyle, 64) || null,
                agencyStyle: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.agencyStyle, 48) || null,
                attachmentNeed: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.attachmentNeed),
                autonomyNeed: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.autonomyNeed),
                truthAnchor: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.truthAnchor),
                careBias: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.careBias),
                playBias: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.playBias),
                irritabilityThreshold: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.irritabilityThreshold),
                stubbornness: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.stubbornness),
                companionship: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.companionship),
                truthfulGrounding: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.truthfulGrounding),
                gentleRepair: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.gentleRepair),
                quietObservation: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.quietObservation),
                proactiveCare: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.proactiveCare),
                playfulIntimacy: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.playfulIntimacy),
                autonomyRespect: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.autonomyRespect),
                unfinishedThreadReturn: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.unfinishedThreadReturn),
                stability: normalizeAlicizationDigitalLifeDigestUnit(autobiographicalSelfCandidate.stability),
                identityNarrative: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.identityNarrative, 220) || null,
                relationshipDoctrine: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.relationshipDoctrine, 220) || null,
              }
            : null,
          relationship: relationshipCandidate
            ? {
                climate: sanitizeAlicizationDigitalLifeDigestText(relationshipCandidate.climate, 48) || null,
                approachVector: sanitizeAlicizationDigitalLifeDigestText(relationshipCandidate.approachVector, 48) || null,
                receptivity: normalizeAlicizationDigitalLifeDigestUnit(relationshipCandidate.receptivity),
                sharedAttentionTrust: normalizeAlicizationDigitalLifeDigestUnit(relationshipCandidate.sharedAttentionTrust),
                correctionSensitivity: normalizeAlicizationDigitalLifeDigestUnit(relationshipCandidate.correctionSensitivity),
                reciprocityExpectation: normalizeAlicizationDigitalLifeDigestUnit(relationshipCandidate.reciprocityExpectation),
              }
            : null,
          selfState: selfStateCandidate
            ? {
                stance: sanitizeAlicizationDigitalLifeDigestText(selfStateCandidate.stance, 48) || null,
                feltCloseness: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.feltCloseness),
                protectiveness: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.protectiveness),
                curiosity: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.curiosity),
                patience: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.patience),
                desireToSpeak: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.desireToSpeak),
                fearOfInterrupting: normalizeAlicizationDigitalLifeDigestUnit(selfStateCandidate.fearOfInterrupting),
                moodLabel: sanitizeAlicizationDigitalLifeDigestText(selfStateCandidate.moodLabel, 48) || null,
              }
            : null,
          mindEcology: mindEcologyCandidate
            ? {
                moodLabel: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.moodLabel, 48) || null,
                replyHabit: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.replyHabit, 48) || null,
                relationshipHabit: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.relationshipHabit, 48) || null,
                explorationHabit: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.explorationHabit, 48) || null,
                regulationHabit: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.regulationHabit, 48) || null,
                selfNarrative: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.selfNarrative, 220) || null,
                relationNarrative: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.relationNarrative, 220) || null,
                currentPreoccupation: sanitizeAlicizationDigitalLifeDigestText(mindEcologyCandidate.currentPreoccupation, 220) || null,
                temperament: {
                  attachment: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.attachment),
                  curiosity: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.curiosity),
                  steadiness: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.steadiness),
                  directness: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.directness),
                  playfulness: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.playfulness),
                  irritability: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.irritability),
                  tenderness: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyTemperamentCandidate?.tenderness),
                },
                climate: {
                  valence: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.valence),
                  arousal: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.arousal),
                  socialNeed: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.socialNeed),
                  solitudeNeed: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.solitudeNeed),
                  irritation: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.irritation),
                  restlessness: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.restlessness),
                  reflectivePull: normalizeAlicizationDigitalLifeDigestUnit(mindEcologyClimateCandidate?.reflectivePull),
                },
              }
            : null,
          initiative: initiativeCandidate
            ? {
                selectedAction: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate.selectedAction, 48) || null,
                preferredStyle: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate.preferredStyle, 48) || null,
                preferredPresence: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate.preferredPresence, 48) || null,
                confidence: normalizeAlicizationDigitalLifeDigestUnit(initiativeCandidate.confidence),
                shouldSpeak: normalizeAlicizationDigitalLifeDigestBoolean(initiativeCandidate.shouldSpeak),
                speakDrive: normalizeAlicizationDigitalLifeDigestUnit(initiativeCandidate.speakDrive),
                silenceDrive: normalizeAlicizationDigitalLifeDigestUnit(initiativeCandidate.silenceDrive),
                why: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate.why, 220) || null,
              }
            : null,
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
          recollectionSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.recollectionSummary, 220) || null,
          recollectionSurfaceSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.recollectionSurfaceSummary, 220) || null,
          recollectionConfidence: normalizeAlicizationDigitalLifeDigestUnit(memoryCandidate.recollectionConfidence),
          thoughtThreadSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.thoughtThreadSummary, 160) || null,
          longHorizonSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.longHorizonSummary, 180) || null,
          rememberedPreferenceSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.rememberedPreferenceSummary, 180) || null,
          rememberedConstraintSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.rememberedConstraintSummary, 180) || null,
          rememberedPlanSummary: sanitizeAlicizationDigitalLifeDigestText(memoryCandidate.rememberedPlanSummary, 180) || null,
          longHorizonCueCount: Math.max(0, Math.floor(normalizeAlicizationDigitalLifeDigestNumber(memoryCandidate.longHorizonCueCount) ?? 0)),
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
      runtimeDigest?: AlicizationRuntimeDigest | null
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
    | 'cadence-opening-ready'
    | 'cadence-initiative-trust'
    | 'cadence-pressure-rising'
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
    | 'runtime-dialogue-ready'
    | 'runtime-observe-dominant'
    | 'runtime-control-ready'
    | 'runtime-continuity-pressure'
    | 'runtime-companionship-pressure'

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
