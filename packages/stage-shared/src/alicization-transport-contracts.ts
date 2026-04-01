export type AlicizationMemorySource = 'rule' | 'async-llm'

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

export type AlicizationBridgeChatStreamEvent
  = | { type: 'text-delta', text: string }
    | { type: 'meta', governance: AlicizationMindTurnGovernance | null }
    | { type: 'tool-call', toolCallId: string, toolName: string, args: string, toolCallType: 'function' }
    | { type: 'tool-result', toolCallId: string, result?: unknown }
    | { type: 'finish' }
    | { type: 'error', error: unknown }
