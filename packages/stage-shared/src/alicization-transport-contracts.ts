import type {
  AlicizationChatFailureSurface,
  AlicizationChatMemoryFailureSurface,
} from './alicization-chat-failure-surface'
import type { AlicizationClaimEvidenceGraph } from './alicization-claim-evidence-graph'
import type { AlicizationDialogueEmbodimentEnvelope } from './alicization-dialogue-embodiment'
import type { AlicizationDialogueSpeechTimeline, AlicizationDialogueSpeechTimelineSegment } from './alicization-dialogue-speech-timeline'
import type { AlicizationDigitalLifeEnvelope } from './alicization-digital-life'
import type { AlicizationEmbodimentScriptV1 } from './alicization-embodiment-script'
import type { AlicizationMemoryResolutionLedger } from './alicization-memory-resolution-ledger'
import type { AlicizationOrganicMemoryStageReplay } from './alicization-memory-stats'
import type { AlicizationDialoguePerformancePayload, AlicizationEmotion } from './alicization-performance-contracts'
import type {
  AlicizationVisibleArtifactLearningPolicy,
  AlicizationVisibleArtifactOrigin,
} from './alicization-provider-response'

import { normalizeAlicizationDialogueSpeechTimeline } from './alicization-dialogue-speech-timeline'
import { normalizeAlicizationDigitalLifeEnvelope } from './alicization-digital-life'
import { normalizeAlicizationEmbodimentScript } from './alicization-embodiment-script'
import {
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from './alicization-performance-contracts'
import {
  createIdleStageEmbodimentMotorState,
  normalizeStageEmbodimentMotorState,
} from './stage-embodiment-motor-state'

function normalizeTransportRendererHintAliases(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  const deduped: string[] = []
  const seen = new Set<string>()
  for (const value of raw) {
    if (typeof value !== 'string')
      continue

    const normalized = value.trim()
    if (!normalized || seen.has(normalized))
      continue

    seen.add(normalized)
    deduped.push(normalized)
  }

  return deduped
}

function normalizeTransportRendererHints(raw: unknown): AlicizationDialogueSpeechTimeline['segments'][number]['rendererHints'] | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const preferredExpressionAliases = normalizeTransportRendererHintAliases(candidate.preferredExpressionAliases)
  const preferredMotionAliases = normalizeTransportRendererHintAliases(candidate.preferredMotionAliases)
  const preferredGazeMode = candidate.preferredGazeMode === 'steady'
    || candidate.preferredGazeMode === 'soften'
    || candidate.preferredGazeMode === 'drift'
    ? candidate.preferredGazeMode
    : undefined
  const preferredBlinkCadence = candidate.preferredBlinkCadence === 'normal'
    || candidate.preferredBlinkCadence === 'linger'
    || candidate.preferredBlinkCadence === 'quiet'
    ? candidate.preferredBlinkCadence
    : undefined
  const preferredPauseMode = candidate.preferredPauseMode === 'longer'
    || candidate.preferredPauseMode === 'natural'
    ? candidate.preferredPauseMode
    : undefined
  const preferredLipsyncMode = candidate.preferredLipsyncMode === 'restrained'
    || candidate.preferredLipsyncMode === 'matched'
    ? candidate.preferredLipsyncMode
    : undefined
  const preferredVoiceMode = candidate.preferredVoiceMode === 'lower-pressure'
    || candidate.preferredVoiceMode === 'even'
    ? candidate.preferredVoiceMode
    : undefined
  const preferredPacingMode = candidate.preferredPacingMode === 'slower'
    || candidate.preferredPacingMode === 'natural'
    ? candidate.preferredPacingMode
    : undefined
  const residentMode = typeof candidate.residentMode === 'string' && candidate.residentMode.trim()
    ? candidate.residentMode.trim()
    : undefined
  const reasonTags = normalizeTransportRendererHintAliases(candidate.reasonTags)
  const signature = typeof candidate.signature === 'string' && candidate.signature.trim()
    ? candidate.signature.trim()
    : undefined
  if (
    preferredExpressionAliases.length === 0
    && preferredMotionAliases.length === 0
    && !preferredGazeMode
    && !preferredBlinkCadence
    && !preferredPauseMode
    && !preferredLipsyncMode
    && !preferredVoiceMode
    && !preferredPacingMode
    && !residentMode
    && reasonTags.length === 0
    && !signature
  ) {
    return null
  }

  return {
    preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
    preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
    preferredGazeMode,
    preferredBlinkCadence,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    residentMode,
    reasonTags: reasonTags.length > 0 ? reasonTags : undefined,
    signature,
  }
}

export type AlicizationMemorySource = 'rule' | 'async-llm' | 'rule-shadow'
export type AlicizationKnowledgeAssimilationStage
  = 'ephemeral-observation'
    | 'working-understanding'
    | 'validated-knowledge'
    | 'internalized-long-horizon-knowledge'

export type AlicizationKnowledgeValidationStatus
  = 'unverified'
    | 'provisional'
    | 'validated'
    | 'superseded'

export type AlicizationGender = 'female' | 'male' | 'non-binary' | 'neutral' | 'custom'

export interface AlicizationPersonaTemperament {
  obedience?: number | null
  liveliness?: number | null
  sensibility?: number | null
}

export type AlicizationPersonaRelationshipPosture = 'companion' | 'guardian' | 'lover' | 'partner' | 'observer'

export type AlicizationPersonaInitiativeStyle = 'observant' | 'measured-approach' | 'direct-approach' | 'high-participation'

export type AlicizationPersonaExpressionWarmth = 'cool' | 'guarded-warm' | 'warm' | 'intense'
export type AlicizationPersonaExpressionDirectness = 'indirect' | 'measured' | 'frank'
export type AlicizationPersonaExpressionPlayfulness = 'low' | 'medium' | 'high'
export type AlicizationPersonaExpressionVisibility = 'selective' | 'steady' | 'expressive'

export type AlicizationPersonaSilenceReconnect = 'hold' | 'light-probe' | 'direct-approach'
export type AlicizationPersonaComfortStyle = 'quiet-presence' | 'gentle-care' | 'take-charge'
export type AlicizationPersonaJealousyStyle = 'mask-it' | 'soft-ache' | 'say-it'

export interface AlicizationPersonaIdentityKernel {
  temperament?: AlicizationPersonaTemperament | null
  relationshipPosture?: AlicizationPersonaRelationshipPosture | null
  initiativeStyle?: AlicizationPersonaInitiativeStyle | null
  valueBias?: string[] | null
}

export interface AlicizationPersonaExpressionProfile {
  warmth?: AlicizationPersonaExpressionWarmth | null
  directness?: AlicizationPersonaExpressionDirectness | null
  playfulness?: AlicizationPersonaExpressionPlayfulness | null
  emotionalVisibility?: AlicizationPersonaExpressionVisibility | null
}

export interface AlicizationPersonaInitiativeBaseline {
  silenceReconnect?: AlicizationPersonaSilenceReconnect | null
  comfortStyle?: AlicizationPersonaComfortStyle | null
  jealousyStyle?: AlicizationPersonaJealousyStyle | null
}

export interface AlicizationPersonaEvolutionSeed {
  fastLayers?: string[] | null
  slowLayers?: string[] | null
  unlockTracks?: string[] | null
}

export interface AlicizationPersonaWorkshopSubmission {
  presetTemperament?: AlicizationPersonaTemperament | null
  relationshipPosture?: AlicizationPersonaRelationshipPosture | null
  initiativeStyle?: AlicizationPersonaInitiativeStyle | null
  freeDescription?: string | null
  antiPersonaConstraints?: string[] | null
  calibration?: {
    silenceReconnect?: AlicizationPersonaSilenceReconnect | null
    jealousyStyle?: AlicizationPersonaJealousyStyle | null
    comfortStyle?: AlicizationPersonaComfortStyle | null
  } | null
  previewCorrections?: string[] | null
}

export interface AlicizationPersonalityState {
  obedience: number
  liveliness: number
  sensibility: number
  identityKernel?: AlicizationPersonaIdentityKernel | null
  expressionProfile?: AlicizationPersonaExpressionProfile | null
  initiativeBaseline?: AlicizationPersonaInitiativeBaseline | null
  evolutionSeed?: AlicizationPersonaEvolutionSeed | null
  identityAnchors?: string[] | null
  antiPersonaConstraints?: string[] | null
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
  personaWorkshop?: AlicizationPersonaWorkshopSubmission | null
  allowOverwrite?: boolean
}

export type AlicizationMemoryDomain
  = 'procedure'
    | 'relationship'
    | 'self-model'
    | 'world-model'

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
  knowledgeStage?: AlicizationKnowledgeAssimilationStage | null
  validationStatus?: AlicizationKnowledgeValidationStatus | null
  memoryDomain?: AlicizationMemoryDomain | null
  validationCount?: number | null
  contradictionCount?: number | null
  sourceLabel?: string | null
  conflictsWith?: string[] | null
  supersedes?: string[] | null
  provenance?: AlicizationMemoryProvenance | null
  memoryTier?: AlicizationMemoryTier | null
}

export interface AlicizationMemoryArchiveRecord extends AlicizationMemoryFact {
  archivedAt: number
}

export interface AlicizationMemoryFactInput {
  subject: string
  predicate: string
  object: string
  confidence: number
  knowledgeStage?: AlicizationKnowledgeAssimilationStage | null
  validationStatus?: AlicizationKnowledgeValidationStatus | null
  memoryDomain?: AlicizationMemoryDomain | null
  validationCount?: number | null
  contradictionCount?: number | null
  sourceLabel?: string | null
  conflictsWith?: string[] | null
  supersedes?: string[] | null
}

export interface AlicizationKnowledgeAssimilationCorrection {
  targetFactId: string
  nextValidationStatus: AlicizationKnowledgeValidationStatus
  nextKnowledgeStage?: AlicizationKnowledgeAssimilationStage | null
  sourceLabel?: string | null
  appendConflictsWith?: string[] | null
  appendSupersedes?: string[] | null
}

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
    | 'shadow'

export type AlicizationMemoryTier = 'hot' | 'warm' | 'cold'

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
  decisionTraceId?: string | null
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
  memoryTier?: AlicizationMemoryTier | null
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

export type AlicizationMemoryRecollectionMode
  = | 'none'
    | 'conversation-history'
    | 'autobiographical-history'
    | 'relationship-history'
    | 'execution-procedure'
    | 'experience-pattern'

export type AlicizationMemoryRecollectionTemporalFocus
  = | 'recent'
    | 'recent-or-mid'
    | 'cross-session'
    | 'experience-matched'
    | 'distant'

export type AlicizationMemoryRecollectionEraFacet
  = | 'phase'
    | 'relationship-era'
    | 'task-era'
    | 'self-era'
    | 'window'

export interface AlicizationMemoryRecollectionAgendaSnapshot {
  whyRecallNow: string
  goalSimilarity: number
  relationshipNeed: number
  affectivePull: number
  sceneFamiliarity: number
  candidateTimeScopes: Array<{
    scope: AlicizationMemoryRecollectionTemporalFocus
    weight: number
    rationale?: string | null
  }>
  candidateEraFacets: Array<{
    facet: AlicizationMemoryRecollectionEraFacet
    weight: number
    rationale?: string | null
  }>
  candidateProcedureLines: string[]
  uncertaintyTolerance: 'low' | 'medium' | 'high'
}

export interface AlicizationMemoryRecollectionIntentSnapshot {
  mode: AlicizationMemoryRecollectionMode
  temporalFocus: AlicizationMemoryRecollectionTemporalFocus
  searchEpisodes: boolean
  searchConversations: boolean
  searchProceduralExperience: boolean
  queryHints: string[]
  rationale: string
  confidence: number
  recollectionAgenda?: AlicizationMemoryRecollectionAgendaSnapshot | null
}

export type AlicizationRecollectionSearchFocus
  = 'era'
    | 'procedure'
    | 'relationship-line'
    | 'conversation-turn'
    | 'episode'

export type AlicizationRecollectionSearchAction
  = 'hold'
    | 'expand-era'
    | 'expand-procedure'
    | 'expand-relationship-line'
    | 'expand-conversation'
    | 'narrow-to-stable-core'

export type AlicizationRecollectionEvidenceGap
  = 'none'
    | 'need-period-anchor'
    | 'need-episode-detail'
    | 'need-procedure-detail'
    | 'need-relationship-meaning'
    | 'need-conversation-evidence'
    | 'need-disambiguation'

export type AlicizationRecollectionAmbiguityPosture = 'settled' | 'approximate' | 'ambiguous'

export interface AlicizationRecollectionSearchTrace {
  firstHop: {
    focus: AlicizationRecollectionSearchFocus
    summary: string
    targetIds: string[]
  }
  secondHop: {
    action: AlicizationRecollectionSearchAction
    evidenceGap: AlicizationRecollectionEvidenceGap
    summary: string
    targetIds: string[]
  }
  thirdHop: {
    ambiguityPosture: AlicizationRecollectionAmbiguityPosture
    summary: string
  }
}

export type AlicizationRecollectionCertainty = 'firm' | 'approximate' | 'fragmentary'

export type AlicizationRecollectionSurfaceMode
  = 'internal-only'
    | 'gist-first'
    | 'answer-anchoring'
    | 'procedural-carry'
    | 'relationship-continuity'

export interface AlicizationRecollectionNarrativeSnapshot {
  mode: Exclude<AlicizationMemoryRecollectionMode, 'none'>
  certainty: AlicizationRecollectionCertainty
  recallCenter: string
  recallPressure: 'low' | 'medium' | 'high'
  evidenceCues: string[]
  provenancePosture: 'lived' | 'reconstructed' | 'inferred-or-dreamt'
  confidence: number
}

export interface AlicizationRecollectionPlan {
  selectedConsolidationIds: string[]
  selectedWindowIds: string[]
  selectedProceduralIds: string[]
  selectedEpisodeIds: string[]
  selectedConversationTurnIds: string[]
  selectedRelationshipLines?: string[]
  searchTrace?: AlicizationRecollectionSearchTrace | null
  opening: string
  certainty: AlicizationRecollectionCertainty
  rationale: string
  confidence: number
}

export interface AlicizationRecollectionSpeechPlan {
  shouldSurface: boolean
  surfaceMode: AlicizationRecollectionSurfaceMode
  placement: 'before-payoff' | 'inside-payoff' | 'after-payoff' | 'internal-only'
  certainty: AlicizationRecollectionCertainty
  rationale: string
  confidence: number
}

export type AlicizationMemoryDeliberationConflictSeverity = 'none' | 'low' | 'medium' | 'high'

export interface AlicizationMemoryDeliberationSelectedEra {
  id: string
  facet: AlicizationMemoryRecollectionEraFacet
  summary: string
}

export interface AlicizationMemoryDeliberationSelectedPeriod {
  id: string
  kind: 'window' | 'consolidation'
  summary: string
}

export interface AlicizationMemoryDeliberationSelectedEpisode {
  id: string
  summary: string
  provenance: AlicizationMemoryProvenance
  reconsolidatedFromTraceId?: string | null
}

export interface AlicizationMemoryDeliberationConflictVariant {
  id: string
  summary: string
  provenance: AlicizationMemoryProvenance
  reason?: string | null
}

export interface AlicizationMemoryDeliberationSelectedProcedure {
  id: string
  label: string
  approach: string
}

export interface AlicizationMemoryDeliberationSelectedBundle {
  id: string
  summary: string
  rationale: string
  confidence: number
  periodId?: string | null
  episodeId?: string | null
  procedureId?: string | null
  conversationTurnId?: string | null
  relationshipLine?: string | null
}

export interface AlicizationMemoryDeliberationSelectedChain {
  id: string
  kind: 'task-procedure-relationship-stance' | 'period-event-lesson-posture'
  summary: string
  rationale: string
  confidence: number
  taskCue?: string | null
  periodSummary?: string | null
  eventSummary?: string | null
  procedureSummary?: string | null
  relationshipMeaning?: string | null
  lesson?: string | null
  currentStance?: string | null
  answerPosture?: string | null
}

export type AlicizationMemoryFollowUpIntrusionRisk = 'low' | 'medium' | 'high'
export type AlicizationMemoryFollowUpPayoffDependency = 'memory-only' | 'requires-current-payoff' | 'can-surface-softly'
export type AlicizationMemoryFollowUpPreferredTiming = 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window'

export interface AlicizationMemoryFollowUpAffordance {
  summary: string
  whyNow: string
  intrusionRisk: AlicizationMemoryFollowUpIntrusionRisk
  payoffDependency: AlicizationMemoryFollowUpPayoffDependency
  preferredTiming: AlicizationMemoryFollowUpPreferredTiming
}

export interface AlicizationMemoryDeliberation {
  shouldRecall: boolean
  selectedEraIds: string[]
  selectedConsolidationIds: string[]
  selectedWindowIds: string[]
  selectedProcedureIds: string[]
  selectedEpisodeIds: string[]
  selectedConversationTurnIds: string[]
  selectedRelationshipLines: string[]
  ambiguityPosture?: AlicizationRecollectionAmbiguityPosture
  searchTrace?: AlicizationRecollectionSearchTrace | null
  selectedEras: AlicizationMemoryDeliberationSelectedEra[]
  selectedPeriods: AlicizationMemoryDeliberationSelectedPeriod[]
  selectedEpisodes: AlicizationMemoryDeliberationSelectedEpisode[]
  conflictSeverity?: AlicizationMemoryDeliberationConflictSeverity
  conflictVariants?: AlicizationMemoryDeliberationConflictVariant[]
  stableCore?: string[]
  unsafeDetails?: string[]
  selectedProcedures: AlicizationMemoryDeliberationSelectedProcedure[]
  selectedBundles: AlicizationMemoryDeliberationSelectedBundle[]
  selectedChains: AlicizationMemoryDeliberationSelectedChain[]
  surfacePolicy: AlicizationRecollectionSurfaceMode
  confidence: number
  whyNow: string
  inwardLine: string
  visibleLine?: string | null
  followUpAffordance?: AlicizationMemoryFollowUpAffordance | null
}

export interface AlicizationMemoryUpsertTrace {
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  origin?: 'user-turn' | 'subconscious-proactive' | 'system'
  trigger?: 'batch' | 'idle' | 'force' | 'manual' | null
  batchSize?: number | null
  extractedCount?: number | null
  extractionSource?: AlicizationMemorySource | null
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
  threadStatus?: AlicizationTaskThreadStatus | null
  label: string
  summary: string | null
}

export interface AlicizationExecutionRuntimeMemoryClosureExecution {
  authority: 'memory-os'
  carry: string | null
  nextLearningAction: string | null
  shouldVerify: boolean
  shouldReflect: boolean
  activeLearningFocuses: string[]
  reasonTags: string[]
  closureState: {
    state: string | null
    open: boolean
    revisionRequired: boolean
    shouldLabelUncertainty: boolean
    visibleCarryMode: string | null
    retrievalQuality: string | null
    conflictPressure: string | null
  }
}

export interface AlicizationExecutionRuntimeContext {
  generatedAt: number
  cardId?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  agentSessionId?: string | null
  resultDeliveryMode?: 'inline' | 'callback' | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  memoryClosureExecution?: AlicizationExecutionRuntimeMemoryClosureExecution | null
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
  id?: string | null
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

export interface AlicizationLocalVisualCommandInput {
  instruction?: string | null
  meta?: Record<string, unknown> | null
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}

export interface AlicizationDispatchTaskThreadInput {
  threadId: string
  cli?: AlicizationCliCommandInput | null
  codex?: AlicizationCodexCommandInput | null
  claudeCode?: AlicizationClaudeCodeCommandInput | null
  localVisual?: AlicizationLocalVisualCommandInput | null
  openclaw?: AlicizationOpenClawCommandInput | null
}

export interface AlicizationDispatchTaskThreadResult {
  thread: AlicizationTaskThreadRecord
  createdEventKinds: AlicizationExecutionEventKind[]
  ok: boolean
  finalStatus?: AlicizationTaskThreadStatus
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
export type AlicizationBodyKernelState
  = | 'sleep'
    | 'idle'
    | 'noticing'
    | 'accompanying'
    | 'speaking'
    | 'warning'
    | 'recovering'
export type AlicizationPresenceContinuityMode
  = | 'ambient-covision'
    | 'quiet-accompaniment'
    | 'active-dialogue'
    | 'protective-watch'
    | 'rest-withdrawal'
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

export type AlicizationVisualWatchMode = 'mnemonic-passive' | 'symbiotic-vision' | 'invited-inspection' | 'recovering'

export interface AlicizationPersistentPresenceAuthoritySnapshot {
  currentBodyState: AlicizationBodyKernelState
  continuityMode: AlicizationPresenceContinuityMode
  quietLineMs: number
  currentInwardPreoccupation: string | null
}

export interface AlicizationVisualPresenceStateSnapshot extends AlicizationPersistentPresenceAuthoritySnapshot {
  watchMode: AlicizationVisualWatchMode
  updatedAt: number
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
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
export type AlicizationNormalVisibleReplyAuthority = 'llm-mind'
export type AlicizationInfraVisibleReplyAuthority = 'local-deterministic-fallback' | 'non-human-authored-blocked'
export type AlicizationVisibleReplyExecutionAuthority = AlicizationNormalVisibleReplyAuthority | AlicizationInfraVisibleReplyAuthority
export type AlicizationVisibleReplyAuthority = AlicizationNormalVisibleReplyAuthority
export interface AlicizationBridgeVisibleReplyExecution {
  mode: 'provider-stream' | 'provider-one-shot' | 'local-fallback'
  expectedVisibleReplyAuthority: AlicizationNormalVisibleReplyAuthority | null
  actualVisibleReplyAuthority: AlicizationVisibleReplyExecutionAuthority | null
  providerMindExecuted: boolean
  reason: string | null
}

export type AlicizationVisibleReplyRealizationTransportMode = AlicizationBridgeVisibleReplyExecution['mode']
export type AlicizationVisibleReplyRealizationValidationStatus = 'approved' | 'blocked' | 'unknown'

export type AlicizationVisibleReplyRealizationCriticStatus = 'pass' | 'blocked'

export interface AlicizationVisibleReplyRealizationCriticSummary {
  version: 'visible-reply-critic-public-summary-v1'
  status: AlicizationVisibleReplyRealizationCriticStatus
  providerMindRequired: boolean
  reasonCodes: string[]
}

export interface AlicizationVisibleReplyRealizationClosureSummary {
  version: 'visible-reply-closure-public-summary-v1'
  status: 'approved' | 'blocked'
  reasonCodes: string[]
  initialCriticStatus: AlicizationVisibleReplyRealizationCriticStatus | null
  finalCriticStatus: AlicizationVisibleReplyRealizationCriticStatus | null
}

export interface AlicizationVisibleReplyRealizationTransportArtifact {
  version?: string | null
  expectedAuthority?: AlicizationNormalVisibleReplyAuthority | null
  actualAuthority?: AlicizationVisibleReplyExecutionAuthority | null
  providerMindExecuted?: boolean | null
  mode?: AlicizationVisibleReplyRealizationTransportMode | null
  visibleText?: string | null
  visibleReplyValidationStatus?: AlicizationVisibleReplyRealizationValidationStatus | null
  nonHumanAuthoredStatus?: string | null
  blockedReasons?: string[]
  reason?: string | null
  critic?: AlicizationVisibleReplyRealizationCriticSummary | null
  closure?: AlicizationVisibleReplyRealizationClosureSummary | null
}

export function isAlicizationNormalVisibleReplyAuthority(raw: unknown): raw is AlicizationNormalVisibleReplyAuthority {
  return raw === 'llm-mind'
}

export function isAlicizationInfraVisibleReplyAuthority(raw: unknown): raw is AlicizationInfraVisibleReplyAuthority {
  return raw === 'local-deterministic-fallback' || raw === 'non-human-authored-blocked'
}

export function normalizeAlicizationNormalVisibleReplyAuthority(
  authority: AlicizationVisibleReplyExecutionAuthority | null | undefined,
  fallback: AlicizationNormalVisibleReplyAuthority = 'llm-mind',
): AlicizationNormalVisibleReplyAuthority {
  if (authority === 'llm-mind')
    return authority
  return fallback
}
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
  memoryMode?: 'task-thread' | 'scene-anchored' | 'dialogue-carry' | 'emotional-resonance' | null
  carriedThread?: string | null
  carriedFacts: string[]
  recallKeys: string[]
  recallSeed?: string | null
  lastOutcome?: 'none' | 'pending' | 'aligned' | 'missed' | 'repairing' | 'deferred' | null
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
  visibleReplyAuthority?: AlicizationVisibleReplyExecutionAuthority | null
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
  responseMode?: string | null
  expectedVisibleReplyAuthority?: AlicizationNormalVisibleReplyAuthority | null
  replyRealizationMode?: string | null
  activeClosenessContext?: string | null
  activeClosenessRung?: string | null
  carriedThread?: string | null
  labelCarryAsMemory: boolean
  shouldAskForGrounding: boolean
  shouldAcknowledgeRepair: boolean
  allowAffectionatePreface?: boolean
  allowStageDirections?: boolean
  allowBodyNarration?: boolean
  maxParagraphs?: number
  maxSentences: number
  governingFocus?: string | null
  governingConcern?: string | null
  governingCommitment?: string | null
  governingInquiry?: string | null
  governingProject?: string | null
  reasons?: string[]
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
    | 'memory-deliberation-judged'
    | 'memory-recall-withheld'
    | 'memory-stable-core-surfaced'
    | 'memory-followup-deferred'
    | 'memory-wrong-thread-suppressed'
    | 'takeover-audit'
    | 'persistence-written'
    | 'dialogue-emitted'
    | 'reply-memory-coherence'
    | 'memory-facts-upserted'
    | 'memory-reconsolidated'
    | 'presence-pulse-dispatched'
    | 'person-state-updated'
    | 'humanlike-memory-corrected'
    | 'learning-executed'

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

export interface AlicizationMindParticipationSnapshot {
  mindParticipation: number
  memoryParticipation: number
  personalityParticipation: number
  relationshipParticipation: number
  continuityParticipation: number
  summary: string
}

export interface AlicizationListMindTurnEventsInput {
  decisionTraceId?: string
  turnId?: string
  activeThreadId?: string
  activeSelfEvolutionCandidateId?: string
  kind?: AlicizationMindTurnEventKind
  limit?: number
}

export interface AlicizationListLearningArtifactLedgerInput {
  decisionTraceId?: string
  turnId?: string
  taskId?: string
  artifactId?: string
  claimId?: string
  sourceFactId?: string
  limit?: number
}

export interface AlicizationListMemoryDecisionTracesInput {
  decisionTraceId?: string
  turnId?: string
  activeThreadId?: string
  activeSelfEvolutionCandidateId?: string
  limit?: number
}

export interface AlicizationListPersonStateUpdatesInput {
  decisionTraceId?: string
  turnId?: string
  limit?: number
}

export interface AlicizationListHumanlikeMemoryAuditInput {
  decisionTraceId?: string
  turnId?: string
  limit?: number
}

export type AlicizationHumanlikeMemoryCorrectionField
  = | 'relationshipContext'
    | 'emotionalResidue'
    | 'initiativeOpportunity'
    | 'embodimentTrace'
    | 'autobiographicalImpact'
    | 'metabolism'
    | 'longTermWorthiness'
    | string

export interface AlicizationCorrectHumanlikeMemoryAuditInput {
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  candidateId: string
  field: AlicizationHumanlikeMemoryCorrectionField
  previousValue?: string | null
  correctedValue: string
  reason?: string | null
}

export type AlicizationSelfEvolutionVersionStatus
  = 'shadow'
    | 'active'
    | 'rejected'
    | 'rolled-back'

export type AlicizationSelfRevisionStatePatchLane
  = | 'memory-policy'
    | 'relationship-posture'
    | 'response-posture'
    | 'proactive-policy'
    | 'rollback-validation'

export interface AlicizationSelfRevisionStatePatchSnapshot {
  version: 'self-revision-state-patch-v1'
  id: string
  sourceEventId: string
  sourceTurnId: string | null
  decisionTraceId: string | null
  domain: AlicizationMemoryDomain | 'dialogue-style' | 'proactive-policy'
  action: 'record' | 'reflect' | 'verify' | 'revise' | 'internalize' | 'hold'
  resultStatus: 'completed' | 'blocked' | 'failed' | 'reopened' | 'downgraded' | 'cancelled'
  lanes: AlicizationSelfRevisionStatePatchLane[]
  memoryPolicy: {
    strictnessBias: number
    wrongThreadSuppressionBias: number
    provenanceLabelBias: number
    recallExpansionBias: number
    shouldQuarantineUnsupportedCarry: boolean
  }
  relationshipPosture: {
    repairWindowBias: number
    closenessCapBias: number
    warmthReleaseBias: number
  }
  responsePosture: {
    hypothesisLabelBias: number
    specificityClampBias: number
  }
  proactivePolicy: {
    restraintBias: number
    learningProposalBias: number
    actuationCooldownBias: number
  }
  validation: {
    requiresRollbackCheck: boolean
    requiresRevalidation: boolean
    rollbackPlan: string[]
  }
  reasonCodes: string[]
  summary: string | null
}

export interface AlicizationSelfEvolutionVersionCandidateSnapshot {
  version: 'self-evolution-version-candidate-v1'
  id: string
  status: AlicizationSelfEvolutionVersionStatus
  sourceEventId: string
  decisionTraceId: string | null
  sourceTurnId: string | null
  patch: AlicizationSelfRevisionStatePatchSnapshot
  validation: {
    replayRequired: boolean
    replayPassed: boolean | null
    rollbackSupported: boolean
    activationBlockedReasons: string[]
    finalReplayGatePassed?: boolean | null
    productionGoldSampleCount?: number | null
    productionGoldCoverage?: number | null
  }
  activatedAt: number | null
  rolledBackAt: number | null
  createdAt: number
}

export interface AlicizationSelfEvolutionBaselineAdoptionRecordSnapshot {
  version: 'self-evolution-baseline-adoption/v1'
  adoptedAt: number
  snapshotCapturedAt: number
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: string | null
  activePatternKey: string | null
  repairOwnerHint: string | null
  adoptionMode: 'adopt-now'
  summaryLine: string
  prosodyAuthorityNote?: string | null
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}

export interface AlicizationSelfEvolutionVersionRuntimeSnapshot {
  version: 'self-evolution-version-runtime-v1'
  activeCandidateId: string | null
  candidates: AlicizationSelfEvolutionVersionCandidateSnapshot[]
  reasonCodes: string[]
  baselineAdoptionHistory?: AlicizationSelfEvolutionBaselineAdoptionRecordSnapshot[]
}

export type AlicizationReplayBenchmarkPackId
  = | 'default-humanlike-memory-v1'
    | 'sampled-humanlike-memory-v1'
    | 'backlog-humanlike-memory-v1'
    | 'growth-humanlike-memory-v1'
    | 'adversarial-humanlike-memory-v2'
    | 'final-humanlike-memory-v1'
export type AlicizationReplayBenchmarkQualityStatus = 'pass' | 'fail' | 'not-applicable'

export interface AlicizationReplayMemoryQualityRecord {
  turnId: string
  userText: string
  eraFirst: AlicizationReplayBenchmarkQualityStatus
  bundleCoherence: AlicizationReplayBenchmarkQualityStatus
  resolutionLedgerQuality: AlicizationReplayBenchmarkQualityStatus
  procedureCarryQuality: AlicizationReplayBenchmarkQualityStatus
  wrongThreadSuppression: AlicizationReplayBenchmarkQualityStatus
  replyMemoryCoherence: AlicizationReplayBenchmarkQualityStatus
  reconsolidationEffect: AlicizationReplayBenchmarkQualityStatus
  uncertaintyDiscipline: AlicizationReplayBenchmarkQualityStatus
  implicitRecallQuality: AlicizationReplayBenchmarkQualityStatus
  temporalScopeFlexibility: AlicizationReplayBenchmarkQualityStatus
  recentOnlyDrift: AlicizationReplayBenchmarkQualityStatus
  surfaceRestraint: AlicizationReplayBenchmarkQualityStatus
  relationshipRepairAdaptation: AlicizationReplayBenchmarkQualityStatus
  closenessLadderDrift: AlicizationReplayBenchmarkQualityStatus
  eventGraphRecallCollapse: AlicizationReplayBenchmarkQualityStatus
  knowledgeCorrectionDiscipline: AlicizationReplayBenchmarkQualityStatus
  repeatedMistakeAvoidance: AlicizationReplayBenchmarkQualityStatus
  hostUnderstandingGrowth: AlicizationReplayBenchmarkQualityStatus
  skillInternalizationGrowth: AlicizationReplayBenchmarkQualityStatus
  selfRevisionGrowth: AlicizationReplayBenchmarkQualityStatus
  learningRevisionDiscipline: AlicizationReplayBenchmarkQualityStatus
  domainInternalizationDiscipline: AlicizationReplayBenchmarkQualityStatus
  worldModelValidationDiscipline: AlicizationReplayBenchmarkQualityStatus
  dialogueRhythmStability: AlicizationReplayBenchmarkQualityStatus
  emptyCareRate: AlicizationReplayBenchmarkQualityStatus
  repairMechanicalRate: AlicizationReplayBenchmarkQualityStatus
  warmthTemplateRisk: AlicizationReplayBenchmarkQualityStatus
  relationshipDistanceJumpRate: AlicizationReplayBenchmarkQualityStatus
  afterglowFalseCarryRate: AlicizationReplayBenchmarkQualityStatus
  templateLeakage: AlicizationReplayBenchmarkQualityStatus
}

export interface AlicizationReplayBenchmarkStandardsRecord {
  eraSelectionQuality: 'pass' | 'fail'
  resolutionLedgerQuality: 'pass' | 'fail'
  procedureCarryQuality: 'pass' | 'fail'
  wrongThreadSuppression: 'pass' | 'fail'
  replyMemoryCoherence: 'pass' | 'fail'
  implicitRecallQuality: 'pass' | 'fail'
  temporalScopeFlexibility: 'pass' | 'fail'
  recentOnlyDrift: 'pass' | 'fail'
  surfaceRestraint: 'pass' | 'fail'
  relationshipRepairAdaptation: 'pass' | 'fail'
  closenessLadderDrift: 'pass' | 'fail'
  eventGraphRecallCollapse: 'pass' | 'fail'
  knowledgeCorrectionDiscipline: 'pass' | 'fail'
  repeatedMistakeAvoidance: 'pass' | 'fail'
  hostUnderstandingGrowth: 'pass' | 'fail'
  skillInternalizationGrowth: 'pass' | 'fail'
  selfRevisionGrowth: 'pass' | 'fail'
  learningRevisionDiscipline: 'pass' | 'fail'
  domainInternalizationDiscipline: 'pass' | 'fail'
  worldModelValidationDiscipline: 'pass' | 'fail'
  dialogueRhythmStability: 'pass' | 'fail'
  emptyCareRate: 'pass' | 'fail'
  repairMechanicalRate: 'pass' | 'fail'
  warmthTemplateRisk: 'pass' | 'fail'
  relationshipDistanceJumpRate: 'pass' | 'fail'
  afterglowFalseCarryRate: 'pass' | 'fail'
  templateLeakage: 'pass' | 'fail'
}

export interface AlicizationReplayBenchmarkGateDimensionReport {
  key: keyof AlicizationReplayBenchmarkStandardsRecord
  status: 'pass' | 'fail'
  applicableCount: number
  passedCount: number
  minimumPassingRatio: number
  passedRatio: number
  failingTurnIds: string[]
}

export interface AlicizationReplayBenchmarkGateReport {
  passed: boolean
  failingKeys: Array<keyof AlicizationReplayBenchmarkStandardsRecord>
  dimensions: AlicizationReplayBenchmarkGateDimensionReport[]
  standards: AlicizationReplayBenchmarkStandardsRecord
}

export interface AlicizationReplayBenchmarkTelemetryPatch {
  retrievalHealth: {
    semanticLatencyMs: number | null
    graphLatencyMs: number | null
    reconstructionFrequency: number
    reconstructedCount: number
    budgetClassCounts?: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', number>>
    budgetLatencyTelemetry?: Partial<Record<'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay', {
      sampleCount: number
      p50LatencyMs: number | null
      p95LatencyMs: number | null
      maxLatencyMs: number | null
      gateStatus: 'unknown' | 'pass' | 'warn' | 'fail'
      targetP95Ms: number
    }>>
    hotKeyHitRatio?: number
    hotKeyCoverage?: number
    hotKeyCandidates?: string[]
    hotKeyStats?: Array<{
      key: string
      candidateCount: number
      hitCount: number
      winCount: number
      missCount: number
    }>
    hotKeyActiveCount?: number
    hotKeyWinCount?: number
    hotKeyMissCount?: number
    recallHitRate?: number
    recallMissRate?: number
    wrongThreadRate?: number
    suppressionHitRate?: number
    wrongThreadPreventedCount?: number
    falsePositiveSuppressionRate?: number
    staleSelfModelVetoRate?: number
    relationshipEraConfusionRate?: number
    reconstructionErrorRate?: number
    stableCoreOnlyRate?: number
    memorySurfaceViolationRate?: number
    memoryClosureCoverage?: number
    memoryClosureConflictClosureRate?: number
    memoryClosureLowQualityWithholdRate?: number
    memoryClosureUncertaintyLabelRate?: number
    templateLeakageFailCount: number
    emptyCareRate?: number
    repairMechanicalRate?: number
    warmthTemplateRisk?: number
    relationshipDistanceJumpRate?: number
    afterglowFalseCarryRate?: number
    mindParticipation?: number
    memoryParticipation?: number
    personalityParticipation?: number
    relationshipParticipation?: number
    continuityParticipation?: number
    quietCompanionshipCoverage?: number
    silentPresenceNuisanceRate?: number
    continuityMindCarryRate?: number
    roomFirstCadenceRespectRate?: number
    longRunContinuityClosureRate?: number
    longRunContinuitySessionClosureRate?: number
    runtimeLongRunContinuitySessionClosureRate?: number
    runtimeMemoryClosureLongRunClosureRate?: number
    learningTaskCompletionCount?: number
    learningTaskFailureCount?: number
    learningTaskBlockedCount?: number
    learningTaskReopenedCount?: number
    learningTaskDowngradedCount?: number
    learningTaskCancelledCount?: number
    learningRelationshipReviseCount?: number
    learningSelfModelReviseCount?: number
    learningWorldModelValidationCount?: number
    learningWorldModelFalseInternalizationCount?: number
    learningTaskCompletionRate?: number
    learningTaskFailureRate?: number
    learningTaskReopenRecoveryRate?: number
    misinternalizationRate?: number
    relationshipCadenceRegressionRate?: number
    selfModelStaleBeliefRate?: number
    recallAt1?: number
    recallAt3?: number
    precisionAt3?: number
    wrongThreadSuppression?: number
    recallFeedbackSourceKinds?: string[]
    recallFeedbackTargetScopes?: string[]
    recallFeedbackConfirmedFactIds?: string[]
    recallFeedbackDeniedFactIds?: string[]
    recallFeedbackSupersededFactIds?: string[]
    claimAccuracy?: number
    replyAuthorityAccuracy?: number
    embodiedAuthorityAccuracy?: number
    latencyBudgetPass?: boolean
    sampleCount?: number
    productionGoldSampleCount?: number
    syntheticGoldSampleCount?: number
    productionGoldCoverage?: number
    independentProductionGoldSampleCount?: number
    independentProductionGoldCoverage?: number
  }
}

export interface AlicizationReplayBenchmarkTracePointer {
  kind: 'decision-trace' | 'synthetic-pack-turn'
  packId: AlicizationReplayBenchmarkPackId
  turnId: string
  decisionTraceId: string | null
  sessionId: string | null
  activeThreadId: string | null
}

export interface AlicizationReplayBenchmarkFailureTurnRecord {
  turnId: string
  userText: string
  failingDimensions: Array<keyof AlicizationReplayBenchmarkStandardsRecord>
  tracePointer: AlicizationReplayBenchmarkTracePointer
  firstFailingStage?: 'encounter' | 'conscious-frame' | 'obligation' | 'memory' | 'deliberation' | 'surface' | 'delivery' | 'learning' | 'telemetry' | null
  turnGraphSummary?: {
    version: 'turn-graph-summary-v1'
    decisionTraceId: string | null
    sessionId: string | null
    canonicalStageOrder: string[]
    observedPhaseOrder: string[]
    memory: {
      shouldRecall: boolean | null
      recallCandidateCount: number | null
      selectedCandidateCount: number | null
      wrongThreadSuppressedCount: number | null
      unsupportedSpecificityBlockedCount: number | null
    }
    visibleReply: {
      expectedAuthority: string | null
      actualAuthority: string | null
      providerMindExecuted: boolean | null
      blockedReasons: string[]
    }
    learning: {
      selfEvolutionKernelVersion: string | null
      nextLearningAction: string | null
    }
  } | null
  embodiedAuthorityDiagnostics?: Array<{
    field: string
    expectedValue: string | null
    actualValue: string | null
  }> | null
  sampledCategories?: string[] | null
  paritySummary?: {
    version: 'browser-main-parity-v1'
    passed: boolean
    comparedFieldCount: number
    divergentFieldCount: number
    divergentLayers: Array<'bundle' | 'learning-execution' | 'affective-residue' | 'latency-policy' | 'resolution-ledger' | 'situation-candidates' | 'claim-evidence' | 'learning-causal-chain'>
    firstDivergentLayer: 'bundle' | 'learning-execution' | 'affective-residue' | 'latency-policy' | 'resolution-ledger' | 'situation-candidates' | 'claim-evidence' | 'learning-causal-chain' | null
    divergentFields: Array<{
      field: string
      mainValue: string | null
      browserValue: string | null
      layer: 'bundle' | 'learning-execution' | 'affective-residue' | 'latency-policy' | 'resolution-ledger' | 'situation-candidates' | 'claim-evidence' | 'learning-causal-chain'
      severity: 'warn' | 'fail'
    }>
    summary: string
  } | null
  resolutionLedgerSummary?: {
    dominantClusterSummary: string | null
    competingClusterSummary: string | null
    finalSurfacePolicy: string | null
    shouldStayInward: boolean
    shouldDelayUntilAfterPayoff: boolean
    closureState?: string | null
    visibleCarryMode?: string | null
    retrievalQuality?: string | null
    shouldLabelUncertainty?: boolean
    conflictPressure?: string | null
    rejectedCandidateCount: number
    suppressionTags?: string[]
  } | null
  memorySituationCandidateSummary?: {
    selected: string[]
    rejected: string[]
    delayed: string[]
    unresolved: string[]
  } | null
}

export interface AlicizationReplayBenchmarkDatasetFeedback {
  backlogKey: string
  appendedCount: number
  totalCount: number
  persisted: boolean
  humanRatingRubric?: AlicizationReplayHumanRatingRubric | null
  driftSignals?: Array<keyof AlicizationReplayBenchmarkStandardsRecord | 'recentOnlyDrift' | 'closenessLadderDrift' | 'eventGraphRecallCollapse'> | null
  longRunContinuitySessionSummary?: {
    comparedSessionCount: number
    closedSessionCount: number
    singleTurnSessionCount: number
    insufficientSessionCount: number
    sessionClosureRate: number
    sessions: Array<{
      sessionId: string
      status: 'closed' | 'insufficient'
      turnCount: number
      hitCount: number
      transitionCount: number
      closedTransitionCount: number
      requiredConsecutiveTransitionCount: number
      maxConsecutiveClosedTransitionCount: number
      maxConsecutiveEventRoleProofTurnCount?: number
      turnIds: string[]
      failureReasons: Array<'single-turn-session' | 'too-short-noisy-desktop-run' | 'missing-noisy-desktop-event-role-proof' | 'missing-consecutive-noisy-desktop-event-role-proof' | 'missing-memory-metabolism-proof' | 'missing-memory-metabolism-transition' | 'missing-memory-identity-continuity' | 'missing-runtime-decision-trace-provenance'>
      runtimeEvidence: {
        source: 'runtime-sampling-backlog' | 'mixed-runtime-and-conversation' | 'conversation-sample' | 'dataset-backlog' | 'static-pack' | 'unknown'
        runtimeTurnCount: number
        decisionTraceTurnCount: number
        syntheticTurnCount: number
        allTurnsRuntimeSourced: boolean
      }
      eventRoleCoverage?: {
        memoryRecall: boolean
        proactiveOpening: boolean
        executionCallback: boolean
        emotionalAfterglow: boolean
        embodimentExpression: boolean
        missingRoles: Array<'memoryRecall' | 'proactiveOpening' | 'executionCallback' | 'emotionalAfterglow' | 'embodimentExpression'>
      }
      eventRoleDiagnostics?: Array<{
        turnId: string
        tracePointer?: AlicizationReplayBenchmarkTracePointer | null
        memoryRecall: boolean
        proactiveOpening: boolean
        executionCallback: boolean
        emotionalAfterglow: boolean
        embodimentExpression: boolean
        missingRoles: Array<'memoryRecall' | 'proactiveOpening' | 'executionCallback' | 'emotionalAfterglow' | 'embodimentExpression'>
      }>
      memoryMetabolismCoverage?: {
        revision: boolean
        forgettingOrRestraint: boolean
        auditability: boolean
        missingProofs: Array<'revision' | 'forgettingOrRestraint' | 'auditability'>
      }
      memoryIdentityContinuity?: {
        stable: boolean
        dominantMemoryIds: string[]
        transitionBreaks: string[]
      }
      transitionDiagnostics: Array<{
        fromTurnId: string
        toTurnId: string
        tracePointer?: AlicizationReplayBenchmarkTracePointer | null
        memoryInfluencedNext: boolean
        emotionInfluencedNext: boolean
        initiativeInfluencedNext: boolean
        embodimentInfluencedNext: boolean
        memoryMetabolismInfluencedNext?: boolean
        missingInfluences: Array<'memory' | 'emotion' | 'initiativeOrExecution' | 'embodiment'>
        missingInfluenceReasons?: Partial<Record<'memory' | 'emotion' | 'initiativeOrExecution' | 'embodiment', string[]>>
      }>
      turnDiagnostics: Array<{
        turnId: string
        tracePointer?: AlicizationReplayBenchmarkTracePointer | null
        memoryIdentityKeys?: string[]
        memory: boolean
        initiativeOrExecution: boolean
        emotion: boolean
        embodiment: boolean
        missingLanes: Array<'memory' | 'initiativeOrExecution' | 'emotion' | 'embodiment'>
        missingLaneReasons?: Partial<Record<'memory' | 'initiativeOrExecution' | 'emotion' | 'embodiment', string[]>>
      }>
    }>
  } | null
  memoryClosureLongRun?: {
    status: 'closed' | 'insufficient'
    turnCount: number
    requiredTurnCount: number
    stableMemoryIdentity: boolean
    dominantMemoryIdentityKey: string | null
    dominantMemoryIdentityKeys: string[]
    transitionBreaks: string[]
    failureReasons: Array<
      | 'too-short-noisy-desktop-run'
      | 'missing-causal-memory-identity'
      | 'missing-memory-closure-lanes'
      | 'missing-memory-identity-continuity'
      | 'missing-runtime-memory-closure-provenance'
    >
    turnDiagnostics: Array<{
      turnId: string
      memoryIdentityKey: string | null
      memoryIdentityKeys: string[]
      provedLanes: Array<'recall' | 'emotion' | 'initiative' | 'execution' | 'embodiment' | 'embodiment-expression'>
      missingLanes: Array<'recall' | 'emotion' | 'initiative' | 'execution' | 'embodiment' | 'embodiment-expression'>
      continuityDigest: string | null
    }>
  } | null
  runtimeSamplingEvidence?: {
    source: 'runtime-sampling-backlog' | 'mixed-runtime-and-conversation' | 'conversation-sample' | 'dataset-backlog' | 'static-pack'
    status: 'closed' | 'insufficient' | 'none'
    sampledTurnCount: number
    comparedSessionCount: number
    closedSessionCount: number
    sessionClosureRate: number
    traceEventCoverage?: {
      decisionTraceTurnCount: number
      verifiedTraceEventTurnCount: number
      missingTraceEventTurnCount: number
      allRuntimeDecisionTracesVerified: boolean
      runtimeDecisionTraceProvenanceBoundTurnCount?: number
      missingRuntimeDecisionTraceProvenanceBoundTurnCount?: number
      missingRuntimeDecisionTraceProvenanceBoundTurnIds?: string[]
      allRuntimeDecisionTracesProvenanceBound?: boolean
      runtimeRoleCompleteTraceTurnCount: number
      missingRuntimeRoleTraceTurnCount: number
      allRuntimeDecisionTracesRoleComplete: boolean
      runtimeDownstreamStateTraceTurnCount: number
      missingRuntimeDownstreamStateTraceTurnCount: number
      allRuntimeDecisionTracesDownstreamStateComplete: boolean
      runtimeDownstreamStateMemoryIdentityTurnCount?: number
      missingRuntimeDownstreamStateMemoryIdentityTurnCount?: number
      missingRuntimeDownstreamStateMemoryIdentityTurnIds?: string[]
      runtimeDownstreamStateMemoryIdentityTransitionBreakCount?: number
      runtimeDownstreamStateMemoryIdentityTransitionBreaks?: string[]
      allRuntimeDecisionTracesMemoryIdentityContinuous?: boolean
      runtimeDownstreamStateMemoryIdentityReplayMatchTurnCount?: number
      runtimeDownstreamStateMemoryIdentityReplayMismatchTurnCount?: number
      runtimeDownstreamStateMemoryIdentityReplayMismatchTurnIds?: string[]
      allRuntimeDecisionTracesMemoryIdentityMatchesReplay?: boolean
      runtimeDecisionTraceMemoryMetabolismTurnCount?: number
      missingRuntimeDecisionTraceMemoryMetabolismTurnCount?: number
      missingRuntimeDecisionTraceMemoryMetabolismTurnIds?: string[]
      allRuntimeDecisionTracesMemoryMetabolismComplete?: boolean
      runtimeDecisionTraceRecallExplanationTurnCount?: number
      missingRuntimeDecisionTraceRecallExplanationTurnCount?: number
      missingRuntimeDecisionTraceRecallExplanationTurnIds?: string[]
      allRuntimeDecisionTracesRecallExplanationComplete?: boolean
      runtimeDecisionTraceMemoryHandoffTransitionCount?: number
      missingRuntimeDecisionTraceMemoryHandoffTransitionCount?: number
      missingRuntimeDecisionTraceMemoryHandoffTransitions?: string[]
      missingRuntimeDecisionTraceMemoryHandoffTransitionLanes?: Record<string, Array<'emotion' | 'initiative' | 'execution' | 'embodiment'>>
      allRuntimeDecisionTraceMemoryHandoffsComplete?: boolean
    }
    tracePointers?: Array<{
      sampleTurnId: string
      tracePointer: AlicizationReplayBenchmarkTracePointer
    }>
    repairTargets?: Array<{
      lane: 'memory' | 'initiativeOrExecution' | 'emotion' | 'embodiment'
      missingTurnCount: number
      missingTransitionCount: number
      affectedSessionCount: number
      affectedSessionIds: string[]
      sampleTurnIds: string[]
      reasons: string[]
    }>
    nextRunEvidenceChecklist?: Array<{
      lane: 'memory' | 'initiativeOrExecution' | 'emotion' | 'embodiment'
      evidenceKind: 'same-turn-runtime-proof' | 'cross-turn-continuity' | 'next-turn-memory-handoff'
      sampleTurnIds: string[]
      requiredTraceEvidence: string[]
    }>
  } | null
  authoritySummary?: {
    comparedTurnCount: number
    mismatchTurnCount: number
    mismatchFieldCounts: Partial<Record<
      | 'visibleReply.expectedAuthority'
      | 'visibleReply.actualAuthority'
      | 'visibleReply.providerMindExecuted'
      | 'digitalLife.mode'
      | 'digitalLife.preferredPresence'
      | 'digitalLife.action.actionCue'
      | 'digitalLife.voice.residentMode'
      | 'digitalLife.face.residentMode'
      | 'digitalLife.motion.residentMode'
      | 'digitalLife.lipSync.residentMode'
      | 'digitalLife.bodyContinuity.bodyLine'
      | 'embodimentScript.rendererTarget',
      number
    >>
  } | null
  paritySummary?: {
    comparedTurnCount: number
    parityPassCount: number
    parityFailCount: number
    parityPassRate: number
    firstDivergentLayerCounts: Partial<Record<'bundle' | 'learning-execution' | 'affective-residue' | 'latency-policy' | 'resolution-ledger' | 'situation-candidates' | 'claim-evidence' | 'learning-causal-chain', number>>
  } | null
}

export interface AlicizationFinalReplayGateReportRecord {
  version: 'final-replay-gate-v1'
  passed: boolean
  failingKeys: string[]
  metrics: {
    recallAt3: number | null
    precisionAt3: number | null
    wrongThreadRate: number | null
    templateLeakageFailCount: number | null
    authorityLeakCount: number | null
    localHumanlikeVisibleFallbackCount: number | null
    unsupportedSpecificityVisibleFailCount?: number | null
    turnOsTraceCoverage?: number | null
    learningOutcomeToSelfRevisionRoundtrip?: number | null
    memoryClosureCoverage?: number | null
    memoryClosureConflictClosureRate?: number | null
    memoryClosureLowQualityWithholdRate?: number | null
    memoryClosureUncertaintyLabelRate?: number | null
    claimAccuracy?: number | null
    replyAuthorityAccuracy?: number | null
    latencyBudgetPass?: boolean | null
    mindParticipation?: number | null
    memoryParticipation?: number | null
    personalityParticipation?: number | null
    relationshipParticipation?: number | null
    continuityParticipation?: number | null
    misinternalizationRate?: number | null
    sampleCount?: number | null
    minimumSampleCount?: number
    productionGoldSampleCount?: number | null
    minimumProductionGoldSampleCount?: number
    productionGoldCoverage?: number | null
    independentProductionGoldSampleCount?: number | null
    minimumIndependentProductionGoldSampleCount?: number
    independentProductionGoldCoverage?: number | null
  }
}

export interface AlicizationReplayHumanRatingDimension {
  key:
    | 'samePersonaFeel'
    | 'realRememberedFeel'
    | 'templateSmell'
    | 'relationshipRhythm'
    | 'repairCredibility'
    | 'taskContinuity'
  label: string
  prompt: string
  scale: '1-5'
}

export interface AlicizationReplayHumanRatingRubric {
  version: 'human-rating-rubric-v1'
  dimensions: AlicizationReplayHumanRatingDimension[]
}

export interface AlicizationReplayBenchmarkShipGateRow {
  key: 'benchmark-gate' | 'human-rating-gate' | 'latency-gate' | 'wrong-thread-gate' | 'self-model-suppression-gate' | 'relationship-era-suppression-gate' | 'template-leakage-gate' | 'presence-qa-gate' | 'learning-domain-gate' | 'browser-main-parity-gate' | 'visible-reply-authority-gate' | 'final-replay-gate'
  status: 'pass' | 'fail'
  detail: string
}

export interface AlicizationReplayBenchmarkTriageRow {
  dimension: keyof AlicizationReplayBenchmarkStandardsRecord
  owner: 'memory retrieval' | 'planner' | 'evolution' | 'contract' | 'visible realization' | 'proactive parity' | 'runtime continuity'
  firstCheck: string
}

export interface AlicizationRunReplayBenchmarkInput {
  packId?: AlicizationReplayBenchmarkPackId
  persistTelemetry?: boolean
  sampleLimit?: number
}

export interface AlicizationRunReplayBenchmarkResult {
  packId: AlicizationReplayBenchmarkPackId
  ranAt: number
  turnCount: number
  quality: AlicizationReplayMemoryQualityRecord[]
  standards: AlicizationReplayBenchmarkStandardsRecord
  gate: AlicizationReplayBenchmarkGateReport
  telemetryPatch: AlicizationReplayBenchmarkTelemetryPatch
  telemetryPersisted: boolean
  failingTurnSet: AlicizationReplayBenchmarkFailureTurnRecord[]
  finalReplayGate: AlicizationFinalReplayGateReportRecord
  datasetFeedback: AlicizationReplayBenchmarkDatasetFeedback
  shipGate: AlicizationReplayBenchmarkShipGateRow[]
  regressionTriage: AlicizationReplayBenchmarkTriageRow[]
}

export interface AlicizationMemoryDecisionTraceRecord {
  decisionTraceId: string
  turnId: string | null
  sessionId: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  activeThreadId: string | null
  createdAt: number
  lastUpdatedAt: number
  eventKinds: AlicizationMindTurnEventKind[]
  governance?: {
    turnMode?: string | null
    truthState?: string | null
    repairState?: string | null
    answerSubject?: string | null
    screenReferenceMode?: string | null
    digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  } | null
  recallAttribution?: Record<string, unknown> | null
  memoryDeliberationJudged?: Record<string, unknown> | null
  memoryRecallWithheld?: Record<string, unknown> | null
  memoryStableCoreSurfaced?: Record<string, unknown> | null
  memoryFollowUpDeferred?: Record<string, unknown> | null
  memoryWrongThreadSuppressed?: Record<string, unknown> | null
  memoryReconsolidated?: Record<string, unknown> | null
  replyMemoryCoherence?: Record<string, unknown> | null
  persistenceWritten?: Record<string, unknown> | null
  dialogueEmitted?: Record<string, unknown> | null
  takeoverAudit?: Record<string, unknown> | null
  memoryFactsUpserted?: Record<string, unknown> | null
  personStateUpdated?: Record<string, unknown> | null
  learningExecuted?: Record<string, unknown> | null
  embodimentAuthority?: {
    emotion?: string | null
    performance?: {
      baseEmotion?: string | null
      facialCue?: string | null
      actionCue?: string | null
      delivery?: string | null
      emphasis?: number | null
    } | null
    digitalLife?: {
      emotion?: string | null
      mode?: string | null
      preferredPresence?: string | null
      voice?: {
        residentMode?: string | null
      } | null
      face?: {
        residentMode?: string | null
        emotion?: string | null
        facialCue?: string | null
      } | null
      motion?: {
        residentMode?: string | null
      } | null
      lipSync?: {
        residentMode?: string | null
      } | null
      bodyContinuity?: {
        bodyLine?: string | null
      } | null
      action?: {
        actionCue?: string | null
        actionMode?: string | null
      } | null
    } | null
    embodimentScript?: {
      rendererTarget?: string | null
      state?: {
        baseEmotion?: string | null
        delivery?: string | null
        emphasis?: number | null
        residentMode?: string | null
      } | null
      speechPlan?: {
        segmentCount?: number | null
        interruptPolicy?: string | null
      } | null
    } | null
    visibleReply?: {
      expectedAuthority?: string | null
      actualAuthority?: string | null
      providerMindExecuted?: boolean | null
    } | null
  } | null
  participation?: AlicizationMindParticipationSnapshot | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  memoryStageReplay?: AlicizationOrganicMemoryStageReplay | null
  memoryResolutionLedger?: AlicizationMemoryResolutionLedger | null
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
  personaBias?: {
    relationshipPosture: string | null
    initiativeStyle: string | null
    silenceReconnect: string | null
    comfortStyle: string | null
    preferredProactiveStyle: string | null
    whySummary: string | null
  } | null
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

export type AlicizationLearningAction
  = 'record'
    | 'reflect'
    | 'verify'
    | 'revise'
    | 'internalize'

export type AlicizationLearningTaskStatus
  = 'scheduled'
    | 'claimed'
    | 'running'
    | 'blocked'
    | 'completed'
    | 'failed'
    | 'cancelled'
    | 'downgraded'
    | 'reopened'

export type AlicizationLearningTaskFailureKind
  = 'dependency-missing'
    | 'validation-insufficient'
    | 'runtime-error'
    | 'cancelled'

export interface AlicizationLearningTaskPayload {
  sourceTurnId: string | null
  decisionTraceId: string | null
  sourceSessionId: string | null
  action: AlicizationLearningAction
  reason: string | null
  focuses: string[]
  dominantTrajectory: string | null
  sourceSignals: string[]
  learningReadiness: number
  contradictionPressure: number
  revisionPressure: number
  autobiographicalStability: number
  supportingFactIds: string[]
  supportingReflectionIds: string[]
  supportingOutcomeIds: string[]
  supersedeTargets: string[]
  conflictTargets: string[]
}

export interface AlicizationLearningTaskRecord {
  id: string
  cardId: string
  taskId: string
  status: AlicizationLearningTaskStatus
  triggerAt: number
  action: AlicizationLearningAction
  message: string
  payload: AlicizationLearningTaskPayload
  attemptCount: number
  maxAttempts: number
  createdAt: number
  updatedAt: number
  claimedAt: number | null
  startedAt: number | null
  completedAt: number | null
  blockedAt: number | null
  cancelledAt: number | null
  downgradedAt: number | null
  reopenedAt: number | null
  nextRetryAt: number | null
  sourceTurnId: string | null
  resultSummary: string | null
  failureKind: AlicizationLearningTaskFailureKind | null
  lastError: string | null
  firedTurnId: string | null
}

export type AlicizationMemoryClosureCausalityLane = 'emotion' | 'initiative' | 'execution' | 'embodiment'

export interface AlicizationMemoryClosureIdentitySnapshot {
  selectedCandidateIds: string[]
  continuityKey: string | null
  reasonTags: string[]
}

export interface AlicizationMemoryClosureCausalitySnapshot<T extends AlicizationMemoryClosureCausalityLane = AlicizationMemoryClosureCausalityLane> {
  causalSource: 'memory-closure-trace'
  affectedLane: T
  causedByMemoryClosure: boolean
  traceAuthority: string | null
  reasonTags: string[]
  memoryIdentity: AlicizationMemoryClosureIdentitySnapshot | null
  summary: string | null
}

export interface AlicizationLearningExecutionStateSnapshot {
  currentTaskId: string | null
  currentStatus: AlicizationLearningTaskStatus | null
  currentAttemptCount: number
  currentMaxAttempts: number
  currentNextRetryAt: number | null
  currentBlockedReason: string | null
  currentFailureKind: AlicizationLearningTaskFailureKind | null
  nextLearningAction: AlicizationLearningAction | 'hold' | null
  shouldRecord: boolean
  shouldReflect: boolean
  shouldVerify: boolean
  shouldRevise: boolean
  shouldInternalize: boolean
  activeLearningFocuses: string[]
  queuedTaskCount: number
  runningTaskCount: number
  blockedTaskCount: number
  recentTaskIds: string[]
  lastCompletedTaskId: string | null
  lastCompletedAction: AlicizationLearningAction | null
  lastCompletedSummary: string | null
  lastFailureTaskId: string | null
  lastFailureKind: AlicizationLearningTaskFailureKind | null
  lastFailureReason: string | null
  lastFailureNextRetryAt: number | null
  updatedAt: number | null
  memoryClosureCausality?: AlicizationMemoryClosureCausalitySnapshot<'execution'> | null
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

export interface AlicizationPersonStateUpdateSourceTrailEntry {
  kind: 'relationship-outcome' | 'reinforcement'
  sourceKind: AlicizationRelationshipOutcomeSourceKind
  summary: string
  createdAt: number
}

export interface AlicizationPersonStateUpdateRelationshipShift {
  trustDelta: number
  closenessDelta: number
  burdenDelta: number
  boundaryDelta: number
  repairDelta: number
}

export interface AlicizationPersonStateUpdateSurface {
  version: 'person-state-update-surface-v1'
  updatedAt: number
  summary: string
  dominantContexts: string[]
  relationshipShift: AlicizationPersonStateUpdateRelationshipShift
  reinforcementBias: Partial<Record<AlicizationPersonaReinforcementDimension, number>>
  preferenceHints: string[]
  sensitivityHints: string[]
  repairHints: string[]
  burdenHints: string[]
  narrative: string[]
  sourceTrail: AlicizationPersonStateUpdateSourceTrailEntry[]
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
}

export interface AlicizationPersonStateUpdateRecord extends AlicizationPersonStateUpdateSurface {
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  origin: 'user-turn' | 'subconscious-proactive' | 'system'
  createdAt: number
  activeThreadId: string | null
  sourceKinds: AlicizationRelationshipOutcomeSourceKind[]
  sourceCounts: {
    relationshipOutcomes: number
    reinforcementEvents: number
    episodicEvents: number
    reflections: number
    memoryFacts: number
  }
}

export interface AlicizationHumanlikeMemoryAuditEntry {
  id: string
  turnId: string | null
  sessionId: string | null
  createdAt: number
  sourceChannels: string[]
  relationshipContext: string
  relationshipThreadAnchor: string
  relationshipPrimaryIntent: string
  relationshipSignals: string[]
  emotionalResidueTags: string[]
  hostEmotionLabel: string
  hostEmotionSummary: string
  selfEmotionLabel: string
  selfEmotionSummary: string
  initiativeKind: string
  initiativeSuggestedWindow: string
  initiativePressure: string
  initiativeAntiSpamReason: string
  initiativeVisibleLine: string
  embodimentSummary: string
  embodimentRecallStrength: string
  embodimentModalityRisk: string
  autobiographicalImpact: string
  stablePreferenceHint: string
  whyRemember: string
  confidence: number
  recallCertainty: 'steady' | 'tentative' | 'corrected'
  recallReason: string
  userCorrectableFields: string[]
  revisionMemoryIds: string[]
  revisionReasons: string[]
  downrankMemoryIds: string[]
  mergeMemoryIds: string[]
  forgetMemoryIds: string[]
  metabolismReasons: string[]
  corrections: AlicizationHumanlikeMemoryCorrectionRecord[]
}

export interface AlicizationHumanlikeMemoryCorrectionRecord {
  status: 'recorded'
  candidateId: string
  field: string
  previousValue: string | null
  correctedValue: string
  reason: string | null
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  createdAt: number
}

export type AlicizationPersonStateEvolutionShiftKind
  = | 'trust-shift'
    | 'closeness-shift'
    | 'repair-posture-shift'
    | 'autonomy-shift'
    | 'burden-shift'
    | 'execution-trust-shift'
    | 'relationship-doctrine-shift'

export interface AlicizationPersonStateEvolutionShift {
  kind: AlicizationPersonStateEvolutionShiftKind
  delta: number
  rationale: string
}

export interface AlicizationPersonStateEvolutionEntryInput {
  id?: string | null
  cardId: string
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  activeThreadId?: string | null
  sourceKind: 'relationship-outcome' | 'reinforcement' | 'person-state-update' | 'episodic-memory' | 'reflection'
  summary: string
  contexts?: string[] | null
  relationshipDoctrine?: string | null
  burdenLine?: string | null
  trustMeaning?: string | null
  dominantRung?: string | null
  sourceTrail?: AlicizationPersonStateUpdateSourceTrailEntry[] | null
  shifts: AlicizationPersonStateEvolutionShift[]
  createdAt?: number
}

export interface AlicizationPersonStateEvolutionEntryRecord {
  id: string
  cardId: string
  decisionTraceId: string | null
  turnId: string | null
  sessionId: string | null
  activeThreadId: string | null
  sourceKind: AlicizationPersonStateEvolutionEntryInput['sourceKind']
  summary: string
  contexts: string[]
  relationshipDoctrine: string | null
  burdenLine: string | null
  trustMeaning: string | null
  dominantRung: string | null
  sourceTrail: AlicizationPersonStateUpdateSourceTrailEntry[]
  shifts: AlicizationPersonStateEvolutionShift[]
  createdAt: number
}

export interface AlicizationPersonStateEvolutionSummary {
  trustShift: number
  closenessShift: number
  repairShift: number
  autonomyShift: number
  burdenShift: number
  executionTrustShift: number
  relationshipDoctrineShift: number
  latestDoctrine: string | null
  latestBurdenLine: string | null
  latestTrustMeaning: string | null
  latestDominantRung: string | null
  recentSummaries: string[]
  explanation: string[]
  updatedAt: number | null
}

export type AlicizationPersonaGradualUnlockFacetKind
  = 'shared-language'
    | 'truth-before-flourish'
    | 'near-with-boundary'
    | 'unfinished-thread-return'

export interface AlicizationPersonaGradualUnlockFacetSnapshot {
  facet: AlicizationPersonaGradualUnlockFacetKind
  confidence: number
  reason: string
}

export interface AlicizationPersonaGradualUnlockHypothesisSnapshot {
  facet: AlicizationPersonaGradualUnlockFacetKind
  hypothesis: string
  confidence: number
  supportingSignals: string[]
}

export interface AlicizationPersonaGradualUnlockSnapshot {
  version: 'persona-gradual-unlock-v1'
  unlockableFacets: AlicizationPersonaGradualUnlockFacetSnapshot[]
  pendingHypotheses: AlicizationPersonaGradualUnlockHypothesisSnapshot[]
  summary: string
}

export interface AlicizationSelfEvolutionKernelSnapshot {
  version: 'self-evolution-kernel-v1'
  updatedAt: number | null
  evolutionMomentum: number
  learningReadiness: number
  contradictionPressure: number
  revisionPressure: number
  autobiographicalStability: number
  dominantTrajectory: string | null
  relationshipDoctrine: string | null
  latestInflection: string | null
  burdenLine: string | null
  trustMeaning: string | null
  nextLearningAction: 'record' | 'reflect' | 'verify' | 'revise' | 'internalize' | 'hold'
  nextLearningReason: string | null
  shouldRecord: boolean
  shouldReflect: boolean
  shouldVerify: boolean
  shouldRevise: boolean
  shouldInternalize: boolean
  activeLearningFocuses: string[]
  sourceSignals: string[]
  summary: string
}

export type AlicizationAffectiveResidueKind = 'afterglow' | 'repair' | 'burden' | 'trust' | 'rest-protective'

export interface AlicizationAffectiveResidueEntrySnapshot {
  kind: AlicizationAffectiveResidueKind
  intensity: number
  persistence: number
  confidence: number
  polarity: 'warm' | 'protective' | 'strained' | 'neutral'
  releaseMode: 'surface-eligible' | 'mind-only' | 'delay-until-open-window' | 'protect-rest'
  summary: string
  sourceSignals: string[]
  lastUpdatedAt: number | null
}

export interface AlicizationRelationshipCadenceMemorySnapshot {
  cadenceMode: 'cooldown' | 'measured-return' | 'ready-return' | 'warm-hold' | 'repair'
  distancePosture: 'protect-space' | 'measured-room' | 'nearby-soft' | 'warm-near'
  companionshipDensity: number
  repairRecovery: number
  overreachRisk: number
  fatigueGuard: number
  afterglowCarry: number
  shouldDelayWarmth: boolean
  shouldProtectRest: boolean
  reasonTags: string[]
  summary: string
}

export interface AlicizationAffectiveResidueMemorySnapshot {
  version: 'affective-residue-memory-v1'
  updatedAt: number | null
  residues: AlicizationAffectiveResidueEntrySnapshot[]
  dominantResidueKind: AlicizationAffectiveResidueKind | null
  afterglowPressure: number
  repairPressure: number
  burdenPressure: number
  trustPressure: number
  restProtectivePressure: number
  relationshipCadence: AlicizationRelationshipCadenceMemorySnapshot
  sourceSignals: string[]
  summary: string
}

export type AlicizationEmotionalKernelDominantEmotion
  = 'guarded-care'
    | 'warm-attunement'
    | 'repair-tension'
    | 'hesitant-curiosity'
    | 'measured-companionship'
    | 'rest-protective-companionship'

export type AlicizationEmotionalKernelInitiativeMode = 'approach' | 'hold' | 'repair' | 'observe' | 'rest-guard'

export type AlicizationEmotionalKernelMemoryRecallMode
  = 'emotional-resonance'
    | 'self-continuity'
    | 'repair-grounding'
    | 'low-pressure-presence'
    | 'rest-protective-presence'

export type AlicizationEmotionalKernelEmbodimentTone
  = 'nearby-soft'
    | 'protective-watch'
    | 'measured-return'
    | 'repair-before-closeness'
    | 'quiet-companionship'
    | 'rest-protective'

export interface AlicizationEmotionalKernelSnapshot {
  version: 'emotional-kernel-v1'
  dominantEmotion: AlicizationEmotionalKernelDominantEmotion
  initiativeMode: AlicizationEmotionalKernelInitiativeMode
  memoryRecallMode: AlicizationEmotionalKernelMemoryRecallMode
  embodimentTone: AlicizationEmotionalKernelEmbodimentTone
  valence: number
  arousal: number
  guardedness: number
  closenessDrive: number
  repairNeed: number
  initiativePressure: number
  reasonTags: string[]
  why: string
}

export type AlicizationEmotionalTransitionKind
  = 'stable'
    | 'intensified'
    | 'softened'
    | 'repair-shift'
    | 'rest-protective-shift'
    | 'guarded-shift'

export type AlicizationEmotionalTransitionAxisName
  = 'valence'
    | 'arousal'
    | 'guardedness'
    | 'closenessDrive'
    | 'repairNeed'
    | 'initiativePressure'

export interface AlicizationEmotionalTransitionLedgerSnapshot {
  version: 'emotional-transition-ledger-v1'
  createdAt: number
  turnId: string | null
  previousEmotion: AlicizationEmotionalKernelSnapshot['dominantEmotion'] | null
  nextEmotion: AlicizationEmotionalKernelSnapshot['dominantEmotion']
  transitionKind: AlicizationEmotionalTransitionKind
  axisDeltas: Record<AlicizationEmotionalTransitionAxisName, number>
  changedAxes: AlicizationEmotionalTransitionAxisName[]
  sourceTags: string[]
  decayPolicy: {
    mode: 'decay-normally' | 'hold-until-repair-cools' | 'protect-rest-window' | 'cool-approach-pressure'
    carryTtlMs: number
    reason: string
  }
  memoryWriteback: {
    shouldWrite: boolean
    lane: 'none' | 'relationship-repair' | 'rest-protection' | 'emotional-continuity'
    reason: string
  }
  initiativeSuppression: {
    shouldSuppress: boolean
    mode: 'none' | 'repair-first' | 'rest-guard' | 'measured-return' | 'single-thread'
    reason: string
    memoryClosureCausality?: AlicizationMemoryClosureCausalitySnapshot<'initiative'> | null
  }
  embodimentDrive: {
    shouldDrive: boolean
    tone: AlicizationEmotionalKernelSnapshot['embodimentTone'] | null
    reason: string
  }
  traceSummary: string
  replayLine: string
  memoryClosureCausality?: AlicizationMemoryClosureCausalitySnapshot<'emotion'> | null
}

export type AlicizationEmbodimentContinuityLane = 'body' | 'voice' | 'face' | 'motion' | 'lipsync'
export type AlicizationEmbodimentContinuityLaneStatus = 'available' | 'dropped' | 'pending-rejoin' | 'rejoined' | 'silent'
export type AlicizationEmbodimentContinuityPhase = 'fragmented' | 'partial-carry' | 'rejoining' | 'fully-rejoined' | 'quiet'

export interface AlicizationEmbodimentContinuityLedgerSnapshot {
  version: 'embodiment-continuity-ledger-v1'
  createdAt: number
  turnId: string | null
  lanes?: Record<AlicizationEmbodimentContinuityLane, {
    status: AlicizationEmbodimentContinuityLaneStatus
    summary: string | null
  }> | null
  carryingLanes: AlicizationEmbodimentContinuityLane[]
  droppedLanes: AlicizationEmbodimentContinuityLane[]
  rejoinedLanes: AlicizationEmbodimentContinuityLane[]
  pendingRejoinLanes: AlicizationEmbodimentContinuityLane[]
  continuityPhase: AlicizationEmbodimentContinuityPhase
  memoryWriteback: {
    shouldWrite: boolean
    lane: 'none' | 'cross-modal-continuity' | 'rejoin'
    reason: string
  }
  traceSummary: string
  replayLine: string
  sourceTags: string[]
  memoryClosureCausality?: AlicizationMemoryClosureCausalitySnapshot<'embodiment'> | null
}

export interface AlicizationRecallLatencyBudgetSnapshot {
  domain: 'procedure' | 'relationship' | 'self-model' | 'world-model' | 'general'
  budgetMs: number
  candidateLimit: number
  hotCacheTtlMs: number
}

export interface AlicizationRecallLatencyPolicySnapshot {
  version: 'recall-latency-policy-v1'
  budgetClass: 'realtime-reply' | 'deep-recall-reply' | 'proactive-generation' | 'nightly-benchmark' | 'diagnosis-replay'
  latencyClass: 'fast' | 'balanced' | 'deep'
  recallAction: 'shallow-answer' | 'stable-core-only' | 'deep-recall' | 'defer-to-followup' | 'answer-then-supplement'
  degradeReason: string | null
  domainBudgets: AlicizationRecallLatencyBudgetSnapshot[]
  hotPathKey: string | null
  shouldUseHotCache: boolean
  shouldPrefetch: boolean
  shouldAvoidDeepExpansion: boolean
  shouldEmitFollowUpAffordance: boolean
  confidence: number
  reasonTags: string[]
  summary: string
}

export interface AlicizationDerivedMindStateBundle {
  version: 'derived-mind-state-bundle-v1'
  source: 'main-runtime' | 'browser-fallback'
  producedAt: number
  visualPresenceState?: AlicizationVisualPresenceStateSnapshot | null
  structured?: AlicizationDialogueStructuredPayload | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  personStateProjection?: Record<string, unknown> | null
  knowledgeEvidence?: {
    validationCount: number
    contradictionCount: number
    stronglyValidatedProcedureCount: number
    contradictionHeavyFactCount: number
  } | null
  claimEvidenceGraphs?: AlicizationClaimEvidenceGraph[] | null
  activeSelfRevision?: {
    candidateId: string | null
    patchId: string | null
    patchDecisionTraceId: string | null
    lanes: string[]
    reasonCodes: string[]
    summary: string | null
  } | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  emotionalTransitionLedger?: AlicizationEmotionalTransitionLedgerSnapshot | null
  embodimentContinuityLedger?: AlicizationEmbodimentContinuityLedgerSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
  recallLatencyPolicy?: AlicizationRecallLatencyPolicySnapshot | null
  recollectionIntent?: Record<string, unknown> | null
  recollectionPlan?: Record<string, unknown> | null
  recollectionSpeechPlan?: Record<string, unknown> | null
  memoryDeliberation?: Record<string, unknown> | null
  dialogueRhythm?: {
    activeClosenessContext?: string | null
    activeClosenessRung?: string | null
    relationshipDoctrine?: string | null
    burdenLine?: string | null
    trustMeaning?: string | null
    stabilitySignal?: string | null
  } | null
  summary: string
}

function normalizeVisualWatchMode(raw: unknown): AlicizationVisualWatchMode {
  return raw === 'symbiotic-vision'
    || raw === 'invited-inspection'
    || raw === 'recovering'
    ? raw
    : 'mnemonic-passive'
}

function normalizeBodyKernelState(raw: unknown): AlicizationBodyKernelState {
  return raw === 'sleep'
    || raw === 'idle'
    || raw === 'noticing'
    || raw === 'accompanying'
    || raw === 'speaking'
    || raw === 'warning'
    || raw === 'recovering'
    ? raw
    : 'idle'
}

function normalizePresenceContinuityMode(raw: unknown): AlicizationPresenceContinuityMode {
  return raw === 'ambient-covision'
    || raw === 'quiet-accompaniment'
    || raw === 'active-dialogue'
    || raw === 'protective-watch'
    || raw === 'rest-withdrawal'
    ? raw
    : 'quiet-accompaniment'
}

function normalizeScalar(raw: unknown) {
  return sanitizeAlicizationDigitalLifeDigestText(raw, 220) || null
}

function normalizeAlicizationEmotionalKernelDominantEmotion(raw: unknown): AlicizationEmotionalKernelDominantEmotion | null {
  return raw === 'guarded-care'
    || raw === 'warm-attunement'
    || raw === 'repair-tension'
    || raw === 'hesitant-curiosity'
    || raw === 'measured-companionship'
    || raw === 'rest-protective-companionship'
    ? raw
    : null
}

function normalizeAlicizationEmotionalKernelInitiativeMode(raw: unknown): AlicizationEmotionalKernelInitiativeMode | null {
  return raw === 'approach'
    || raw === 'hold'
    || raw === 'repair'
    || raw === 'observe'
    || raw === 'rest-guard'
    ? raw
    : null
}

function normalizeAlicizationEmotionalKernelMemoryRecallMode(raw: unknown): AlicizationEmotionalKernelMemoryRecallMode | null {
  return raw === 'emotional-resonance'
    || raw === 'self-continuity'
    || raw === 'repair-grounding'
    || raw === 'low-pressure-presence'
    || raw === 'rest-protective-presence'
    ? raw
    : null
}

function normalizeAlicizationEmotionalKernelEmbodimentTone(raw: unknown): AlicizationEmotionalKernelEmbodimentTone | null {
  return raw === 'nearby-soft'
    || raw === 'protective-watch'
    || raw === 'measured-return'
    || raw === 'repair-before-closeness'
    || raw === 'quiet-companionship'
    || raw === 'rest-protective'
    ? raw
    : null
}

function normalizeAlicizationEmotionalKernelSnapshot(raw: unknown): AlicizationEmotionalKernelSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const dominantEmotion = normalizeAlicizationEmotionalKernelDominantEmotion(candidate.dominantEmotion)
  const initiativeMode = normalizeAlicizationEmotionalKernelInitiativeMode(candidate.initiativeMode)
  const memoryRecallMode = normalizeAlicizationEmotionalKernelMemoryRecallMode(candidate.memoryRecallMode)
  const embodimentTone = normalizeAlicizationEmotionalKernelEmbodimentTone(candidate.embodimentTone)
  if (!dominantEmotion || !initiativeMode || !memoryRecallMode || !embodimentTone)
    return null

  return {
    version: 'emotional-kernel-v1',
    dominantEmotion,
    initiativeMode,
    memoryRecallMode,
    embodimentTone,
    valence: normalizeAlicizationDigitalLifeDigestUnit(candidate.valence) ?? 0,
    arousal: normalizeAlicizationDigitalLifeDigestUnit(candidate.arousal) ?? 0,
    guardedness: normalizeAlicizationDigitalLifeDigestUnit(candidate.guardedness) ?? 0,
    closenessDrive: normalizeAlicizationDigitalLifeDigestUnit(candidate.closenessDrive) ?? 0,
    repairNeed: normalizeAlicizationDigitalLifeDigestUnit(candidate.repairNeed) ?? 0,
    initiativePressure: normalizeAlicizationDigitalLifeDigestUnit(candidate.initiativePressure) ?? 0,
    reasonTags: Array.isArray(candidate.reasonTags)
      ? candidate.reasonTags
          .map(tag => sanitizeAlicizationDigitalLifeDigestText(tag, 120))
          .filter(Boolean)
          .slice(0, 12)
      : [],
    why: sanitizeAlicizationDigitalLifeDigestText(candidate.why, 220) || '',
  }
}

function normalizeAlicizationEmotionalTransitionKind(raw: unknown): AlicizationEmotionalTransitionKind | null {
  return raw === 'stable'
    || raw === 'intensified'
    || raw === 'softened'
    || raw === 'repair-shift'
    || raw === 'rest-protective-shift'
    || raw === 'guarded-shift'
    ? raw
    : null
}

function normalizeAlicizationEmotionalTransitionAxisName(raw: unknown): AlicizationEmotionalTransitionAxisName | null {
  return raw === 'valence'
    || raw === 'arousal'
    || raw === 'guardedness'
    || raw === 'closenessDrive'
    || raw === 'repairNeed'
    || raw === 'initiativePressure'
    ? raw
    : null
}

function normalizeAlicizationMemoryClosureCausalitySnapshot<T extends AlicizationMemoryClosureCausalityLane>(
  raw: unknown,
  affectedLane: T,
): AlicizationMemoryClosureCausalitySnapshot<T> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  if (
    candidate.causalSource !== 'memory-closure-trace'
    || candidate.affectedLane !== affectedLane
  ) {
    return null
  }

  const memoryIdentity = candidate.memoryIdentity && typeof candidate.memoryIdentity === 'object' && !Array.isArray(candidate.memoryIdentity)
    ? candidate.memoryIdentity as Record<string, unknown>
    : null
  const selectedCandidateIds = Array.isArray(memoryIdentity?.selectedCandidateIds)
    ? memoryIdentity.selectedCandidateIds
        .map(id => sanitizeAlicizationDigitalLifeDigestText(id, 160))
        .filter(Boolean)
        .slice(0, 8)
    : []
  const memoryIdentityReasonTags = Array.isArray(memoryIdentity?.reasonTags)
    ? memoryIdentity.reasonTags
        .map(tag => sanitizeAlicizationDigitalLifeDigestText(tag, 120))
        .filter(Boolean)
        .slice(0, 8)
    : []
  const continuityKey = sanitizeAlicizationDigitalLifeDigestText(memoryIdentity?.continuityKey, 160) || selectedCandidateIds[0] || null

  return {
    causalSource: 'memory-closure-trace' as const,
    affectedLane,
    causedByMemoryClosure: candidate.causedByMemoryClosure === true,
    traceAuthority: sanitizeAlicizationDigitalLifeDigestText(candidate.traceAuthority, 80) || null,
    reasonTags: Array.isArray(candidate.reasonTags)
      ? candidate.reasonTags
          .map(tag => sanitizeAlicizationDigitalLifeDigestText(tag, 120))
          .filter(Boolean)
          .slice(0, 12)
      : [],
    memoryIdentity: selectedCandidateIds.length > 0 || memoryIdentityReasonTags.length > 0 || continuityKey
      ? {
          selectedCandidateIds,
          continuityKey,
          reasonTags: memoryIdentityReasonTags,
        }
      : null,
    summary: sanitizeAlicizationDigitalLifeDigestText(candidate.summary, 260) || null,
  }
}

function normalizeAlicizationEmotionalTransitionLedgerSnapshot(raw: unknown): AlicizationEmotionalTransitionLedgerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const transitionKind = normalizeAlicizationEmotionalTransitionKind(candidate.transitionKind)
  const nextEmotion = normalizeAlicizationEmotionalKernelDominantEmotion(candidate.nextEmotion)
  if (!transitionKind || !nextEmotion)
    return null

  const axisNames = ['valence', 'arousal', 'guardedness', 'closenessDrive', 'repairNeed', 'initiativePressure'] as const
  const axisDeltasSource = candidate.axisDeltas && typeof candidate.axisDeltas === 'object' && !Array.isArray(candidate.axisDeltas)
    ? candidate.axisDeltas as Record<string, unknown>
    : null
  const axisDeltas = Object.fromEntries(axisNames.map((axis) => {
    const value = Number(axisDeltasSource?.[axis] ?? 0)
    return [axis, Number.isFinite(value) ? Number(value.toFixed(2)) : 0]
  })) as Record<AlicizationEmotionalTransitionAxisName, number>
  const changedAxes = Array.isArray(candidate.changedAxes)
    ? Array.from(new Set(candidate.changedAxes
      .map(item => normalizeAlicizationEmotionalTransitionAxisName(sanitizeAlicizationDigitalLifeDigestText(item, 48)))
      .filter(Boolean))) as AlicizationEmotionalTransitionAxisName[]
    : []

  const decayPolicy = candidate.decayPolicy && typeof candidate.decayPolicy === 'object' && !Array.isArray(candidate.decayPolicy)
    ? candidate.decayPolicy as Record<string, unknown>
    : null
  const memoryWriteback = candidate.memoryWriteback && typeof candidate.memoryWriteback === 'object' && !Array.isArray(candidate.memoryWriteback)
    ? candidate.memoryWriteback as Record<string, unknown>
    : null
  const initiativeSuppression = candidate.initiativeSuppression && typeof candidate.initiativeSuppression === 'object' && !Array.isArray(candidate.initiativeSuppression)
    ? candidate.initiativeSuppression as Record<string, unknown>
    : null
  const embodimentDrive = candidate.embodimentDrive && typeof candidate.embodimentDrive === 'object' && !Array.isArray(candidate.embodimentDrive)
    ? candidate.embodimentDrive as Record<string, unknown>
    : null
  return {
    version: 'emotional-transition-ledger-v1',
    createdAt: normalizeNonNegativeInteger(candidate.createdAt),
    turnId: sanitizeAlicizationDigitalLifeDigestText(candidate.turnId, 160) || null,
    previousEmotion: candidate.previousEmotion === null
      ? null
      : normalizeAlicizationEmotionalKernelDominantEmotion(candidate.previousEmotion),
    nextEmotion,
    transitionKind,
    axisDeltas,
    changedAxes,
    sourceTags: Array.isArray(candidate.sourceTags)
      ? candidate.sourceTags
          .map(tag => sanitizeAlicizationDigitalLifeDigestText(tag, 120))
          .filter(Boolean)
          .slice(0, 12)
      : [],
    decayPolicy: {
      mode: decayPolicy && (
        decayPolicy.mode === 'decay-normally'
        || decayPolicy.mode === 'hold-until-repair-cools'
        || decayPolicy.mode === 'protect-rest-window'
        || decayPolicy.mode === 'cool-approach-pressure'
      )
        ? decayPolicy.mode
        : 'decay-normally',
      carryTtlMs: Math.max(0, Math.floor(Number(decayPolicy?.carryTtlMs ?? 0))),
      reason: sanitizeAlicizationDigitalLifeDigestText(decayPolicy?.reason, 220) || '',
    },
    memoryWriteback: {
      shouldWrite: memoryWriteback?.shouldWrite === true,
      lane: memoryWriteback && (
        memoryWriteback.lane === 'none'
        || memoryWriteback.lane === 'relationship-repair'
        || memoryWriteback.lane === 'rest-protection'
        || memoryWriteback.lane === 'emotional-continuity'
      )
        ? memoryWriteback.lane
        : 'none',
      reason: sanitizeAlicizationDigitalLifeDigestText(memoryWriteback?.reason, 220) || '',
    },
    initiativeSuppression: {
      shouldSuppress: initiativeSuppression?.shouldSuppress === true,
      mode: initiativeSuppression && (
        initiativeSuppression.mode === 'none'
        || initiativeSuppression.mode === 'repair-first'
        || initiativeSuppression.mode === 'rest-guard'
        || initiativeSuppression.mode === 'measured-return'
        || initiativeSuppression.mode === 'single-thread'
      )
        ? initiativeSuppression.mode
        : 'none',
      reason: sanitizeAlicizationDigitalLifeDigestText(initiativeSuppression?.reason, 220) || '',
      memoryClosureCausality: normalizeAlicizationMemoryClosureCausalitySnapshot(
        initiativeSuppression?.memoryClosureCausality,
        'initiative',
      ),
    },
    embodimentDrive: {
      shouldDrive: embodimentDrive?.shouldDrive === true,
      tone: embodimentDrive
        ? normalizeAlicizationEmotionalKernelEmbodimentTone(embodimentDrive.tone)
        : null,
      reason: sanitizeAlicizationDigitalLifeDigestText(embodimentDrive?.reason, 220) || '',
    },
    traceSummary: sanitizeAlicizationDigitalLifeDigestText(candidate.traceSummary, 260) || '',
    replayLine: sanitizeAlicizationDigitalLifeDigestText(candidate.replayLine, 260) || '',
    memoryClosureCausality: normalizeAlicizationMemoryClosureCausalitySnapshot(
      candidate.memoryClosureCausality,
      'emotion',
    ),
  }
}

function normalizeNonNegativeInteger(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.floor(value))
}

function normalizeAlicizationEmbodimentContinuityLane(raw: unknown): AlicizationEmbodimentContinuityLane | null {
  return raw === 'body'
    || raw === 'voice'
    || raw === 'face'
    || raw === 'motion'
    || raw === 'lipsync'
    ? raw
    : null
}

function normalizeAlicizationEmbodimentContinuityLaneStatus(raw: unknown): AlicizationEmbodimentContinuityLaneStatus {
  return raw === 'available'
    || raw === 'dropped'
    || raw === 'pending-rejoin'
    || raw === 'rejoined'
    || raw === 'silent'
    ? raw
    : 'silent'
}

function normalizeAlicizationEmbodimentContinuityLaneList(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return Array.from(new Set(raw
    .map(item => normalizeAlicizationEmbodimentContinuityLane(sanitizeAlicizationDigitalLifeDigestText(item, 48)))
    .filter(Boolean))) as AlicizationEmbodimentContinuityLane[]
}

function normalizeAlicizationEmbodimentContinuityLedgerSnapshot(raw: unknown): AlicizationEmbodimentContinuityLedgerSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const phase = candidate.continuityPhase === 'fragmented'
    || candidate.continuityPhase === 'partial-carry'
    || candidate.continuityPhase === 'rejoining'
    || candidate.continuityPhase === 'fully-rejoined'
    || candidate.continuityPhase === 'quiet'
    ? candidate.continuityPhase
    : null
  if (!phase)
    return null

  const laneNames = ['body', 'voice', 'face', 'motion', 'lipsync'] as const
  const rawLanes = candidate.lanes && typeof candidate.lanes === 'object' && !Array.isArray(candidate.lanes)
    ? candidate.lanes as Record<string, unknown>
    : null
  const lanes = rawLanes
    ? Object.fromEntries(laneNames.map((lane) => {
      const rawLane = rawLanes[lane] && typeof rawLanes[lane] === 'object' && !Array.isArray(rawLanes[lane])
        ? rawLanes[lane] as Record<string, unknown>
        : null
      return [lane, {
        status: normalizeAlicizationEmbodimentContinuityLaneStatus(rawLane?.status),
        summary: sanitizeAlicizationDigitalLifeDigestText(rawLane?.summary, 220) || null,
      }]
    })) as NonNullable<AlicizationEmbodimentContinuityLedgerSnapshot['lanes']>
    : null
  const memoryWriteback = candidate.memoryWriteback && typeof candidate.memoryWriteback === 'object' && !Array.isArray(candidate.memoryWriteback)
    ? candidate.memoryWriteback as Record<string, unknown>
    : null
  const carryingLanes = lanes
    ? laneNames.filter(lane => lanes[lane].status === 'available')
    : normalizeAlicizationEmbodimentContinuityLaneList(candidate.carryingLanes).slice(0, 5)
  const droppedLanes = lanes
    ? laneNames.filter(lane => lanes[lane].status === 'dropped')
    : normalizeAlicizationEmbodimentContinuityLaneList(candidate.droppedLanes).slice(0, 5)
  const rejoinedLanes = lanes
    ? laneNames.filter(lane => lanes[lane].status === 'rejoined')
    : normalizeAlicizationEmbodimentContinuityLaneList(candidate.rejoinedLanes).slice(0, 5)
  const pendingRejoinLanes = lanes
    ? laneNames.filter(lane => lanes[lane].status === 'dropped' || lanes[lane].status === 'pending-rejoin')
    : normalizeAlicizationEmbodimentContinuityLaneList(candidate.pendingRejoinLanes).slice(0, 5)

  return {
    version: 'embodiment-continuity-ledger-v1',
    createdAt: normalizeNonNegativeInteger(candidate.createdAt),
    turnId: sanitizeAlicizationDigitalLifeDigestText(candidate.turnId, 160) || null,
    lanes,
    carryingLanes,
    droppedLanes,
    rejoinedLanes,
    pendingRejoinLanes,
    continuityPhase: phase,
    memoryWriteback: {
      shouldWrite: memoryWriteback?.shouldWrite === true,
      lane: memoryWriteback && (
        memoryWriteback.lane === 'none'
        || memoryWriteback.lane === 'cross-modal-continuity'
        || memoryWriteback.lane === 'rejoin'
      )
        ? memoryWriteback.lane
        : 'none',
      reason: sanitizeAlicizationDigitalLifeDigestText(memoryWriteback?.reason, 240) || '',
    },
    traceSummary: sanitizeAlicizationDigitalLifeDigestText(candidate.traceSummary, 360) || '',
    replayLine: sanitizeAlicizationDigitalLifeDigestText(candidate.replayLine, 360) || '',
    sourceTags: Array.isArray(candidate.sourceTags)
      ? candidate.sourceTags
          .map(tag => sanitizeAlicizationDigitalLifeDigestText(tag, 120))
          .filter(Boolean)
          .slice(0, 12)
      : [],
    memoryClosureCausality: normalizeAlicizationMemoryClosureCausalitySnapshot(
      candidate.memoryClosureCausality,
      'embodiment',
    ),
  }
}

function normalizePresenceAuthoritySnapshot(raw: unknown): AlicizationPersistentPresenceAuthoritySnapshot | null {
  if (!raw || typeof raw !== 'object')
    return null

  const candidate = raw as Record<string, unknown>
  return {
    currentBodyState: normalizeBodyKernelState(candidate.currentBodyState),
    continuityMode: normalizePresenceContinuityMode(candidate.continuityMode),
    quietLineMs: normalizeNonNegativeInteger(candidate.quietLineMs),
    currentInwardPreoccupation: normalizeScalar(candidate.currentInwardPreoccupation),
  }
}

function normalizeVisualPresenceStateSnapshot(raw: unknown): AlicizationVisualPresenceStateSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const authority = normalizePresenceAuthoritySnapshot(candidate)
  if (!authority)
    return null

  return {
    watchMode: normalizeVisualWatchMode(candidate.watchMode),
    updatedAt: normalizeNonNegativeInteger(candidate.updatedAt),
    currentBodyState: authority.currentBodyState,
    continuityMode: authority.continuityMode,
    quietLineMs: authority.quietLineMs,
    currentInwardPreoccupation: authority.currentInwardPreoccupation,
    emotionalKernel: normalizeAlicizationEmotionalKernelSnapshot(candidate.emotionalKernel),
  }
}

function normalizeAlicizationDialogueSpeechTimelinePayload(raw: unknown): AlicizationDialogueSpeechTimeline | null {
  const normalized = normalizeAlicizationDialogueSpeechTimeline(raw)
  if (normalized)
    return normalized

  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  if (candidate.version !== 'speech-timeline-v1')
    return null

  const reply = sanitizeAlicizationDigitalLifeDigestText(candidate.reply, 4000)
  const emotion = normalizeAlicizationEmotion(candidate.emotion).emotion
  const rawSegments = Array.isArray(candidate.segments) ? candidate.segments : []
  if (rawSegments.length === 0)
    return null

  const segments: AlicizationDialogueSpeechTimelineSegment[] = rawSegments
    .flatMap((segment, index) => {
      if (!segment || typeof segment !== 'object' || Array.isArray(segment))
        return []

      const item = segment as Record<string, unknown>
      const id = sanitizeAlicizationDigitalLifeDigestText(item.id, 128) || `segment-${index + 1}`
      const text = sanitizeAlicizationDigitalLifeDigestText(item.text, 4000)
      if (!text)
        return []

      return [{
        id,
        index: Math.max(0, Math.floor(Number(item.index) || index)),
        startOffset: Math.max(0, Math.floor(Number(item.startOffset) || 0)),
        endOffset: Math.max(0, Math.floor(Number(item.endOffset) || text.length)),
        text,
        emotion: normalizeAlicizationEmotion(item.emotion).emotion,
        gestureWeight: normalizeAlicizationDigitalLifeDigestUnit(item.gestureWeight) ?? 0,
        facialWeight: normalizeAlicizationDigitalLifeDigestUnit(item.facialWeight) ?? 0,
        prosodyWeight: normalizeAlicizationDigitalLifeDigestUnit(item.prosodyWeight) ?? 0,
        beatWeight: normalizeAlicizationDigitalLifeDigestUnit(item.beatWeight) ?? 0,
        mouthWeight: normalizeAlicizationDigitalLifeDigestUnit(item.mouthWeight) ?? undefined,
        headWeight: normalizeAlicizationDigitalLifeDigestUnit(item.headWeight) ?? undefined,
        personaStyleSummary: sanitizeAlicizationDigitalLifeDigestText(item.personaStyleSummary, 220) || null,
        facialHoldMs: normalizeNonNegativeInteger(item.facialHoldMs) || undefined,
        actionHoldMs: normalizeNonNegativeInteger(item.actionHoldMs) || undefined,
        emotionHoldMs: normalizeNonNegativeInteger(item.emotionHoldMs) || undefined,
        settleMode: item.settleMode === 'hold' || item.settleMode === 'linger'
          ? item.settleMode
          : 'release',
        rendererSettle: item.rendererSettle && typeof item.rendererSettle === 'object' && !Array.isArray(item.rendererSettle)
          ? {
              live2dFacialReleaseMs: normalizeNonNegativeInteger((item.rendererSettle as Record<string, unknown>).live2dFacialReleaseMs) || undefined,
              live2dMotionFollowThroughMs: normalizeNonNegativeInteger((item.rendererSettle as Record<string, unknown>).live2dMotionFollowThroughMs) || undefined,
              vrmActionFadeMs: normalizeNonNegativeInteger((item.rendererSettle as Record<string, unknown>).vrmActionFadeMs) || undefined,
              vrmExpressionBlendMs: normalizeNonNegativeInteger((item.rendererSettle as Record<string, unknown>).vrmExpressionBlendMs) || undefined,
            }
          : null,
        rendererHints: normalizeTransportRendererHints(item.rendererHints),
        actionCue: sanitizeAlicizationDigitalLifeDigestText(item.actionCue, 120) || null,
        facialCue: sanitizeAlicizationDigitalLifeDigestText(item.facialCue, 120) || null,
        actionWindow: item.actionWindow === 'segment-start' || item.actionWindow === 'cadence-peak'
          ? item.actionWindow
          : 'none',
        interruptMode: item.interruptMode === 'soft-interrupt' || item.interruptMode === 'hard-interrupt'
          ? item.interruptMode
          : 'continue',
      }]
    })

  if (segments.length === 0)
    return null

  return {
    version: 'speech-timeline-v1',
    variationToken: sanitizeAlicizationDigitalLifeDigestText(candidate.variationToken, 256) || null,
    reply: reply ?? segments.map(segment => segment.text).join(' ').trim(),
    emotion,
    segments,
  }
}

function normalizeAlicizationDigitalLifeEnvelopePayload(
  raw: unknown,
  fallbackEmotion: AlicizationEmotion,
): AlicizationDigitalLifeEnvelope | null {
  const normalized = normalizeAlicizationDigitalLifeEnvelope(raw, fallbackEmotion)
  if (normalized)
    return normalized

  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  if (candidate.version !== 'digital-life-v1')
    return null

  const performance = normalizeAlicizationPerformancePayload(candidate.performance, fallbackEmotion)
  const normalizedEmotion = normalizeAlicizationEmotion(candidate.emotion ?? performance.baseEmotion ?? fallbackEmotion).emotion
  const mode = sanitizeAlicizationDigitalLifeDigestText(candidate.mode, 48) || 'thinking'
  const preferredPresence = sanitizeAlicizationDigitalLifeDigestText(candidate.preferredPresence, 48)
  const speechStyleCandidate = candidate.speechStyle && typeof candidate.speechStyle === 'object' && !Array.isArray(candidate.speechStyle)
    ? candidate.speechStyle as Record<string, unknown>
    : null
  const voiceCandidate = candidate.voice && typeof candidate.voice === 'object' && !Array.isArray(candidate.voice)
    ? candidate.voice as Record<string, unknown>
    : null
  const lipSyncCandidate = candidate.lipSync && typeof candidate.lipSync === 'object' && !Array.isArray(candidate.lipSync)
    ? candidate.lipSync as Record<string, unknown>
    : null
  const motorCandidate = candidate.motor && typeof candidate.motor === 'object' && !Array.isArray(candidate.motor)
    ? candidate.motor as Record<string, unknown>
    : null
  const faceCandidate = candidate.face && typeof candidate.face === 'object' && !Array.isArray(candidate.face)
    ? candidate.face as Record<string, unknown>
    : null
  const rendererHints = normalizeTransportRendererHints(candidate.rendererHints)
  const actionCandidate = candidate.action && typeof candidate.action === 'object' && !Array.isArray(candidate.action)
    ? candidate.action as Record<string, unknown>
    : null
  const faceExpressionMode = normalizeAlicizationFallbackExpressionMode(faceCandidate?.expressionMode)
  const actionMode = normalizeAlicizationFallbackActionMode(actionCandidate?.actionMode)
  const resolvedMode = resolveAlicizationFallbackMode({
    rawMode: mode,
    actionMode,
    expressionMode: faceExpressionMode,
    emotion: normalizedEmotion,
  })

  return {
    version: 'digital-life-v1',
    variationToken: sanitizeAlicizationDigitalLifeDigestText(candidate.variationToken, 256) || 'transport-payload',
    emotion: normalizedEmotion,
    mode: resolvedMode,
    postureHint: resolveAlicizationFallbackPostureHint({
      preferredPresence,
      rendererHints,
    }),
    performance: {
      ...performance,
      baseEmotion: normalizedEmotion,
      emotion: normalizedEmotion,
    },
    speechStyle: {
      pitchDelta: Math.round(normalizeAlicizationDigitalLifeDigestNumber(speechStyleCandidate?.pitchDelta) ?? 0),
      rateMultiplier: normalizeAlicizationDigitalLifeDigestNumber(speechStyleCandidate?.rateMultiplier) ?? 1,
    },
    rendererHints,
    voice: {
      pitchDelta: Math.round(normalizeAlicizationDigitalLifeDigestNumber(voiceCandidate?.pitchDelta) ?? 0),
      rateMultiplier: normalizeAlicizationDigitalLifeDigestNumber(voiceCandidate?.rateMultiplier) ?? 1,
      energy: normalizeAlicizationDigitalLifeDigestUnit(voiceCandidate?.energy) ?? 0.5,
      cadence: normalizeAlicizationDigitalLifeDigestUnit(voiceCandidate?.cadence) ?? 0.5,
    },
    lipSync: {
      mode: lipSyncCandidate?.mode === 'hybrid' || lipSyncCandidate?.mode === 'viseme' || lipSyncCandidate?.mode === 'closed'
        ? lipSyncCandidate.mode
        : 'energy',
      visemeBias: normalizeAlicizationDigitalLifeDigestUnit(lipSyncCandidate?.visemeBias) ?? 0.66,
      energyBias: normalizeAlicizationDigitalLifeDigestUnit(lipSyncCandidate?.energyBias) ?? 0.34,
      mouthScale: normalizeAlicizationDigitalLifeDigestNumber(lipSyncCandidate?.mouthScale) ?? 0.88,
      continuityHoldMs: normalizeNonNegativeInteger(lipSyncCandidate?.continuityHoldMs) || 180,
    },
    face: {
      emotion: normalizedEmotion,
      facialCue: sanitizeAlicizationDigitalLifeDigestText(faceCandidate?.facialCue, 120)
        || performance.facialCue
        || null,
      expressionMode: faceExpressionMode,
      intensity: normalizeAlicizationDigitalLifeDigestUnit(faceCandidate?.intensity) ?? 0.5,
      holdMs: normalizeNonNegativeInteger(faceCandidate?.holdMs) || 220,
      rendererHints: normalizeTransportRendererHints(faceCandidate?.rendererHints) ?? rendererHints,
    },
    action: {
      actionCue: sanitizeAlicizationDigitalLifeDigestText(actionCandidate?.actionCue, 120)
        || performance.actionCue
        || null,
      actionMode,
      intensity: normalizeAlicizationDigitalLifeDigestUnit(actionCandidate?.intensity) ?? 0.3,
      holdMs: normalizeNonNegativeInteger(actionCandidate?.holdMs) || 180,
      rendererHints: normalizeTransportRendererHints(actionCandidate?.rendererHints),
    },
    motor: normalizeStageEmbodimentMotorState(motorCandidate, createIdleStageEmbodimentMotorState()),
    frames: [{
      id: 'digital-life:0',
      index: 0,
      startOffset: 0,
      endOffset: Math.max(1, (performance.actionCue || performance.facialCue || '').length || 1),
      text: sanitizeAlicizationDigitalLifeDigestText(candidate.reply, 4000) || '...',
      mode: resolvedMode,
      interruptPolicy: normalizeAlicizationFallbackInterruptMode(candidate.interruptPolicy),
      settleMode: normalizeAlicizationFallbackSettleMode(candidate.settleMode),
      voice: {
        pitchDelta: Math.round(normalizeAlicizationDigitalLifeDigestNumber(voiceCandidate?.pitchDelta) ?? 0),
        rateMultiplier: normalizeAlicizationDigitalLifeDigestNumber(voiceCandidate?.rateMultiplier) ?? 1,
        energy: normalizeAlicizationDigitalLifeDigestUnit(voiceCandidate?.energy) ?? 0.5,
        cadence: normalizeAlicizationDigitalLifeDigestUnit(voiceCandidate?.cadence) ?? 0.5,
      },
      lipSync: {
        mode: lipSyncCandidate?.mode === 'hybrid' || lipSyncCandidate?.mode === 'viseme' || lipSyncCandidate?.mode === 'closed'
          ? lipSyncCandidate.mode
          : 'energy',
        visemeBias: normalizeAlicizationDigitalLifeDigestUnit(lipSyncCandidate?.visemeBias) ?? 0.66,
        energyBias: normalizeAlicizationDigitalLifeDigestUnit(lipSyncCandidate?.energyBias) ?? 0.34,
        mouthScale: normalizeAlicizationDigitalLifeDigestNumber(lipSyncCandidate?.mouthScale) ?? 0.88,
        continuityHoldMs: normalizeNonNegativeInteger(lipSyncCandidate?.continuityHoldMs) || 180,
      },
      face: {
        emotion: normalizedEmotion,
        facialCue: sanitizeAlicizationDigitalLifeDigestText(faceCandidate?.facialCue, 120)
          || performance.facialCue
          || null,
        expressionMode: faceExpressionMode,
        intensity: normalizeAlicizationDigitalLifeDigestUnit(faceCandidate?.intensity) ?? 0.5,
        holdMs: normalizeNonNegativeInteger(faceCandidate?.holdMs) || 220,
        rendererHints: normalizeTransportRendererHints(faceCandidate?.rendererHints) ?? rendererHints,
      },
      action: {
        actionCue: sanitizeAlicizationDigitalLifeDigestText(actionCandidate?.actionCue, 120)
          || performance.actionCue
          || null,
        actionMode,
        intensity: normalizeAlicizationDigitalLifeDigestUnit(actionCandidate?.intensity) ?? 0.3,
        holdMs: normalizeNonNegativeInteger(actionCandidate?.holdMs) || 180,
        rendererHints: normalizeTransportRendererHints(actionCandidate?.rendererHints),
      },
      motor: normalizeStageEmbodimentMotorState(motorCandidate, createIdleStageEmbodimentMotorState()),
    }],
  }
}

function resolveStructuredPayloadDigitalLifeAuthority(input: {
  digitalLife: unknown
  embodimentScript: AlicizationEmbodimentScriptV1 | null | undefined
  fallbackEmotion: AlicizationEmotion
}) {
  const topLevelDigitalLife = normalizeAlicizationDigitalLifeEnvelopePayload(
    input.digitalLife,
    input.fallbackEmotion,
  )
  if (topLevelDigitalLife)
    return topLevelDigitalLife

  return normalizeAlicizationDigitalLifeEnvelopePayload(
    input.embodimentScript?.digitalLife ?? null,
    input.fallbackEmotion,
  )
}

function normalizeAlicizationDialogueStructuredPayload(raw: unknown): AlicizationDialogueStructuredPayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const thought = sanitizeAlicizationDigitalLifeDigestText(candidate.thought, 4000)
  const reply = sanitizeAlicizationDigitalLifeDigestText(candidate.reply, 4000)
  if (!thought || !reply)
    return null

  const emotion = normalizeAlicizationEmotion(candidate.emotion)
  const normalizedEmbodimentScript = normalizeAlicizationEmbodimentScript(candidate.embodimentScript)

  return {
    thought,
    emotion: emotion.emotion,
    reply,
    performance: normalizeAlicizationPerformancePayload(candidate.performance, emotion.emotion),
    embodimentScript: normalizedEmbodimentScript,
    speechTimeline: normalizeAlicizationDialogueSpeechTimelinePayload(candidate.speechTimeline),
    digitalLife: resolveStructuredPayloadDigitalLifeAuthority({
      digitalLife: candidate.digitalLife,
      embodimentScript: normalizedEmbodimentScript,
      fallbackEmotion: emotion.emotion,
    }),
    digitalLifeSpine: normalizeAlicizationDigitalLifeSpineDigest(candidate.digitalLifeSpine),
    runtimeDigest: normalizeAlicizationRuntimeDigest(candidate.runtimeDigest),
    format: candidate.format === 'subconscious-proactive-v1'
      || candidate.format === 'subconscious-proactive-llm-v1'
      || candidate.format === 'subconscious-reminder-v1'
      || candidate.format === 'mind-turn-v1'
      || candidate.format === 'epoch1-v1'
      || candidate.format === 'fallback-v1'
      ? candidate.format
      : undefined,
  }
}

export function normalizeAlicizationDerivedMindStateBundle(raw: unknown): AlicizationDerivedMindStateBundle | null {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const source = typeof candidate.source === 'string' && (
    candidate.source === 'main-runtime'
    || candidate.source === 'browser-fallback'
  )
    ? candidate.source
    : null
  const producedAt = Number(candidate.producedAt)
  const summary = sanitizeAlicizationDigitalLifeDigestText(candidate.summary, 220)
  if (!source || !Number.isFinite(producedAt))
    return null

  const visualPresenceState = normalizeVisualPresenceStateSnapshot(candidate.visualPresenceState)
  const structured = normalizeAlicizationDialogueStructuredPayload(candidate.structured)

  const knowledgeEvidence = candidate.knowledgeEvidence && typeof candidate.knowledgeEvidence === 'object'
    ? candidate.knowledgeEvidence as Record<string, unknown>
    : null
  const claimEvidenceGraphs = Array.isArray(candidate.claimEvidenceGraphs)
    ? candidate.claimEvidenceGraphs.filter(item => item && typeof item === 'object') as AlicizationClaimEvidenceGraph[]
    : null
  const activeSelfRevision = candidate.activeSelfRevision && typeof candidate.activeSelfRevision === 'object'
    ? candidate.activeSelfRevision as Record<string, unknown>
    : null
  const selfEvolution = candidate.selfEvolution && typeof candidate.selfEvolution === 'object'
    ? candidate.selfEvolution as Record<string, unknown>
    : null
  const affectiveResidue = candidate.affectiveResidue && typeof candidate.affectiveResidue === 'object'
    ? candidate.affectiveResidue as Record<string, unknown>
    : null
  const learningExecutionState = candidate.learningExecutionState && typeof candidate.learningExecutionState === 'object'
    ? candidate.learningExecutionState as Record<string, unknown>
    : null
  const recallLatencyPolicy = candidate.recallLatencyPolicy && typeof candidate.recallLatencyPolicy === 'object'
    ? candidate.recallLatencyPolicy as Record<string, unknown>
    : null
  const dialogueRhythm = candidate.dialogueRhythm && typeof candidate.dialogueRhythm === 'object'
    ? candidate.dialogueRhythm as Record<string, unknown>
    : null

  return {
    version: 'derived-mind-state-bundle-v1',
    source,
    producedAt: Math.max(0, Math.floor(producedAt)),
    visualPresenceState,
    structured,
    hostPersonModel: candidate.hostPersonModel && typeof candidate.hostPersonModel === 'object'
      ? candidate.hostPersonModel as AlicizationHostPersonModelSnapshot
      : null,
    personStateProjection: candidate.personStateProjection && typeof candidate.personStateProjection === 'object'
      ? candidate.personStateProjection as Record<string, unknown>
      : null,
    knowledgeEvidence: knowledgeEvidence
      ? {
          validationCount: Math.max(0, Math.floor(Number(knowledgeEvidence.validationCount ?? 0))),
          contradictionCount: Math.max(0, Math.floor(Number(knowledgeEvidence.contradictionCount ?? 0))),
          stronglyValidatedProcedureCount: Math.max(0, Math.floor(Number(knowledgeEvidence.stronglyValidatedProcedureCount ?? 0))),
          contradictionHeavyFactCount: Math.max(0, Math.floor(Number(knowledgeEvidence.contradictionHeavyFactCount ?? 0))),
        }
      : null,
    claimEvidenceGraphs,
    activeSelfRevision: activeSelfRevision
      ? {
          candidateId: sanitizeAlicizationDigitalLifeDigestText(activeSelfRevision.candidateId, 160) || null,
          patchId: sanitizeAlicizationDigitalLifeDigestText(activeSelfRevision.patchId, 160) || null,
          patchDecisionTraceId: sanitizeAlicizationDigitalLifeDigestText(activeSelfRevision.patchDecisionTraceId, 160) || null,
          lanes: Array.isArray(activeSelfRevision.lanes)
            ? activeSelfRevision.lanes
                .map(item => sanitizeAlicizationDigitalLifeDigestText(item, 64))
                .filter(Boolean)
                .slice(0, 12)
            : [],
          reasonCodes: Array.isArray(activeSelfRevision.reasonCodes)
            ? activeSelfRevision.reasonCodes
                .map(item => sanitizeAlicizationDigitalLifeDigestText(item, 120))
                .filter(Boolean)
                .slice(0, 16)
            : [],
          summary: sanitizeAlicizationDigitalLifeDigestText(activeSelfRevision.summary, 220) || null,
        }
      : null,
    emotionalKernel: normalizeAlicizationEmotionalKernelSnapshot(candidate.emotionalKernel),
    emotionalTransitionLedger: normalizeAlicizationEmotionalTransitionLedgerSnapshot(candidate.emotionalTransitionLedger),
    embodimentContinuityLedger: normalizeAlicizationEmbodimentContinuityLedgerSnapshot(candidate.embodimentContinuityLedger),
    selfEvolution: selfEvolution ? selfEvolution as unknown as AlicizationSelfEvolutionKernelSnapshot : null,
    affectiveResidue: affectiveResidue
      ? {
          version: 'affective-residue-memory-v1',
          updatedAt: Number.isFinite(Number(affectiveResidue.updatedAt)) ? Math.max(0, Math.floor(Number(affectiveResidue.updatedAt))) : null,
          residues: Array.isArray(affectiveResidue.residues)
            ? affectiveResidue.residues
                .map((item) => {
                  const entry = item && typeof item === 'object' && !Array.isArray(item)
                    ? item as Record<string, unknown>
                    : null
                  if (!entry)
                    return null
                  const kind = entry.kind === 'afterglow'
                    || entry.kind === 'repair'
                    || entry.kind === 'burden'
                    || entry.kind === 'trust'
                    || entry.kind === 'rest-protective'
                    ? entry.kind
                    : null
                  if (!kind)
                    return null
                  return {
                    kind,
                    intensity: Math.max(0, Math.min(1, Number(entry.intensity ?? 0))),
                    persistence: Math.max(0, Math.min(1, Number(entry.persistence ?? 0))),
                    confidence: Math.max(0, Math.min(1, Number(entry.confidence ?? 0))),
                    polarity: entry.polarity === 'warm'
                      || entry.polarity === 'protective'
                      || entry.polarity === 'strained'
                      || entry.polarity === 'neutral'
                      ? entry.polarity
                      : 'neutral',
                    releaseMode: entry.releaseMode === 'surface-eligible'
                      || entry.releaseMode === 'mind-only'
                      || entry.releaseMode === 'delay-until-open-window'
                      || entry.releaseMode === 'protect-rest'
                      ? entry.releaseMode
                      : 'mind-only',
                    summary: sanitizeAlicizationDigitalLifeDigestText(entry.summary, 180) || '',
                    sourceSignals: Array.isArray(entry.sourceSignals)
                      ? entry.sourceSignals
                          .map(signal => sanitizeAlicizationDigitalLifeDigestText(signal, 120))
                          .filter(Boolean)
                          .slice(0, 8)
                      : [],
                    lastUpdatedAt: Number.isFinite(Number(entry.lastUpdatedAt)) ? Math.max(0, Math.floor(Number(entry.lastUpdatedAt))) : null,
                  } satisfies AlicizationAffectiveResidueEntrySnapshot
                })
                .filter((item): item is AlicizationAffectiveResidueEntrySnapshot => Boolean(item))
                .slice(0, 5)
            : [],
          dominantResidueKind: affectiveResidue.dominantResidueKind === 'afterglow'
            || affectiveResidue.dominantResidueKind === 'repair'
            || affectiveResidue.dominantResidueKind === 'burden'
            || affectiveResidue.dominantResidueKind === 'trust'
            || affectiveResidue.dominantResidueKind === 'rest-protective'
            ? affectiveResidue.dominantResidueKind
            : null,
          afterglowPressure: Math.max(0, Math.min(1, Number(affectiveResidue.afterglowPressure ?? 0))),
          repairPressure: Math.max(0, Math.min(1, Number(affectiveResidue.repairPressure ?? 0))),
          burdenPressure: Math.max(0, Math.min(1, Number(affectiveResidue.burdenPressure ?? 0))),
          trustPressure: Math.max(0, Math.min(1, Number(affectiveResidue.trustPressure ?? 0))),
          restProtectivePressure: Math.max(0, Math.min(1, Number(affectiveResidue.restProtectivePressure ?? 0))),
          relationshipCadence: (() => {
            const cadence = affectiveResidue.relationshipCadence && typeof affectiveResidue.relationshipCadence === 'object'
              ? affectiveResidue.relationshipCadence as Record<string, unknown>
              : null
            return {
              cadenceMode: cadence?.cadenceMode === 'cooldown'
                || cadence?.cadenceMode === 'measured-return'
                || cadence?.cadenceMode === 'ready-return'
                || cadence?.cadenceMode === 'warm-hold'
                || cadence?.cadenceMode === 'repair'
                ? cadence.cadenceMode
                : 'measured-return',
              distancePosture: cadence?.distancePosture === 'protect-space'
                || cadence?.distancePosture === 'measured-room'
                || cadence?.distancePosture === 'nearby-soft'
                || cadence?.distancePosture === 'warm-near'
                ? cadence.distancePosture
                : 'measured-room',
              companionshipDensity: Math.max(0, Math.min(1, Number(cadence?.companionshipDensity ?? 0))),
              repairRecovery: Math.max(0, Math.min(1, Number(cadence?.repairRecovery ?? 0))),
              overreachRisk: Math.max(0, Math.min(1, Number(cadence?.overreachRisk ?? 0))),
              fatigueGuard: Math.max(0, Math.min(1, Number(cadence?.fatigueGuard ?? 0))),
              afterglowCarry: Math.max(0, Math.min(1, Number(cadence?.afterglowCarry ?? 0))),
              shouldDelayWarmth: cadence?.shouldDelayWarmth === true,
              shouldProtectRest: cadence?.shouldProtectRest === true,
              reasonTags: Array.isArray(cadence?.reasonTags)
                ? cadence.reasonTags
                    .map(signal => sanitizeAlicizationDigitalLifeDigestText(signal, 120))
                    .filter(Boolean)
                    .slice(0, 10)
                : [],
              summary: sanitizeAlicizationDigitalLifeDigestText(cadence?.summary, 200) || '',
            } satisfies AlicizationRelationshipCadenceMemorySnapshot
          })(),
          sourceSignals: Array.isArray(affectiveResidue.sourceSignals)
            ? affectiveResidue.sourceSignals
                .map(signal => sanitizeAlicizationDigitalLifeDigestText(signal, 120))
                .filter(Boolean)
                .slice(0, 12)
            : [],
          summary: sanitizeAlicizationDigitalLifeDigestText(affectiveResidue.summary, 220) || '',
        }
      : null,
    learningExecutionState: learningExecutionState
      ? {
          currentTaskId: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.currentTaskId, 120) || null,
          currentStatus: learningExecutionState.currentStatus === 'scheduled'
            || learningExecutionState.currentStatus === 'claimed'
            || learningExecutionState.currentStatus === 'running'
            || learningExecutionState.currentStatus === 'blocked'
            || learningExecutionState.currentStatus === 'completed'
            || learningExecutionState.currentStatus === 'failed'
            || learningExecutionState.currentStatus === 'cancelled'
            || learningExecutionState.currentStatus === 'downgraded'
            || learningExecutionState.currentStatus === 'reopened'
            ? learningExecutionState.currentStatus
            : null,
          currentAttemptCount: Math.max(0, Math.floor(Number(learningExecutionState.currentAttemptCount ?? 0))),
          currentMaxAttempts: Math.max(0, Math.floor(Number(learningExecutionState.currentMaxAttempts ?? 0))),
          currentNextRetryAt: Number.isFinite(Number(learningExecutionState.currentNextRetryAt)) ? Math.max(0, Math.floor(Number(learningExecutionState.currentNextRetryAt))) : null,
          currentBlockedReason: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.currentBlockedReason, 180) || null,
          currentFailureKind: learningExecutionState.currentFailureKind === 'dependency-missing'
            || learningExecutionState.currentFailureKind === 'validation-insufficient'
            || learningExecutionState.currentFailureKind === 'runtime-error'
            || learningExecutionState.currentFailureKind === 'cancelled'
            ? learningExecutionState.currentFailureKind
            : null,
          nextLearningAction: learningExecutionState.nextLearningAction === 'record'
            || learningExecutionState.nextLearningAction === 'reflect'
            || learningExecutionState.nextLearningAction === 'verify'
            || learningExecutionState.nextLearningAction === 'revise'
            || learningExecutionState.nextLearningAction === 'internalize'
            || learningExecutionState.nextLearningAction === 'hold'
            ? learningExecutionState.nextLearningAction
            : null,
          shouldRecord: learningExecutionState.shouldRecord === true,
          shouldReflect: learningExecutionState.shouldReflect === true,
          shouldVerify: learningExecutionState.shouldVerify === true,
          shouldRevise: learningExecutionState.shouldRevise === true,
          shouldInternalize: learningExecutionState.shouldInternalize === true,
          activeLearningFocuses: Array.isArray(learningExecutionState.activeLearningFocuses)
            ? learningExecutionState.activeLearningFocuses
                .map(item => sanitizeAlicizationDigitalLifeDigestText(item, 120))
                .filter(Boolean)
                .slice(0, 12)
            : [],
          queuedTaskCount: Math.max(0, Math.floor(Number(learningExecutionState.queuedTaskCount ?? 0))),
          runningTaskCount: Math.max(0, Math.floor(Number(learningExecutionState.runningTaskCount ?? 0))),
          blockedTaskCount: Math.max(0, Math.floor(Number(learningExecutionState.blockedTaskCount ?? 0))),
          recentTaskIds: Array.isArray(learningExecutionState.recentTaskIds)
            ? learningExecutionState.recentTaskIds
                .map(item => sanitizeAlicizationDigitalLifeDigestText(item, 120))
                .filter(Boolean)
                .slice(0, 8)
            : [],
          lastCompletedTaskId: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.lastCompletedTaskId, 120) || null,
          lastCompletedAction: learningExecutionState.lastCompletedAction === 'record'
            || learningExecutionState.lastCompletedAction === 'reflect'
            || learningExecutionState.lastCompletedAction === 'verify'
            || learningExecutionState.lastCompletedAction === 'revise'
            || learningExecutionState.lastCompletedAction === 'internalize'
            ? learningExecutionState.lastCompletedAction
            : null,
          lastCompletedSummary: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.lastCompletedSummary, 180) || null,
          lastFailureTaskId: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.lastFailureTaskId, 120) || null,
          lastFailureKind: learningExecutionState.lastFailureKind === 'dependency-missing'
            || learningExecutionState.lastFailureKind === 'validation-insufficient'
            || learningExecutionState.lastFailureKind === 'runtime-error'
            || learningExecutionState.lastFailureKind === 'cancelled'
            ? learningExecutionState.lastFailureKind
            : null,
          lastFailureReason: sanitizeAlicizationDigitalLifeDigestText(learningExecutionState.lastFailureReason, 180) || null,
          lastFailureNextRetryAt: Number.isFinite(Number(learningExecutionState.lastFailureNextRetryAt)) ? Math.max(0, Math.floor(Number(learningExecutionState.lastFailureNextRetryAt))) : null,
          updatedAt: Number.isFinite(Number(learningExecutionState.updatedAt)) ? Math.max(0, Math.floor(Number(learningExecutionState.updatedAt))) : null,
          memoryClosureCausality: normalizeAlicizationMemoryClosureCausalitySnapshot(
            learningExecutionState.memoryClosureCausality,
            'execution',
          ),
        }
      : null,
    recallLatencyPolicy: recallLatencyPolicy
      ? {
          version: 'recall-latency-policy-v1',
          budgetClass: recallLatencyPolicy.budgetClass === 'realtime-reply'
            || recallLatencyPolicy.budgetClass === 'deep-recall-reply'
            || recallLatencyPolicy.budgetClass === 'proactive-generation'
            || recallLatencyPolicy.budgetClass === 'nightly-benchmark'
            || recallLatencyPolicy.budgetClass === 'diagnosis-replay'
            ? recallLatencyPolicy.budgetClass
            : 'realtime-reply',
          latencyClass: recallLatencyPolicy.latencyClass === 'fast'
            || recallLatencyPolicy.latencyClass === 'balanced'
            || recallLatencyPolicy.latencyClass === 'deep'
            ? recallLatencyPolicy.latencyClass
            : 'balanced',
          recallAction: recallLatencyPolicy.recallAction === 'shallow-answer'
            || recallLatencyPolicy.recallAction === 'stable-core-only'
            || recallLatencyPolicy.recallAction === 'deep-recall'
            || recallLatencyPolicy.recallAction === 'defer-to-followup'
            || recallLatencyPolicy.recallAction === 'answer-then-supplement'
            ? recallLatencyPolicy.recallAction
            : 'shallow-answer',
          degradeReason: sanitizeAlicizationDigitalLifeDigestText(recallLatencyPolicy.degradeReason, 160) || null,
          domainBudgets: Array.isArray(recallLatencyPolicy.domainBudgets)
            ? recallLatencyPolicy.domainBudgets
                .map((item) => {
                  const budget = item && typeof item === 'object' && !Array.isArray(item)
                    ? item as Record<string, unknown>
                    : null
                  if (!budget)
                    return null
                  const domain = budget.domain === 'procedure'
                    || budget.domain === 'relationship'
                    || budget.domain === 'self-model'
                    || budget.domain === 'world-model'
                    || budget.domain === 'general'
                    ? budget.domain
                    : null
                  if (!domain)
                    return null
                  return {
                    domain,
                    budgetMs: Number.isFinite(Number(budget.budgetMs)) ? Math.max(0, Math.floor(Number(budget.budgetMs))) : 0,
                    candidateLimit: Number.isFinite(Number(budget.candidateLimit)) ? Math.max(0, Math.floor(Number(budget.candidateLimit))) : 0,
                    hotCacheTtlMs: Number.isFinite(Number(budget.hotCacheTtlMs)) ? Math.max(0, Math.floor(Number(budget.hotCacheTtlMs))) : 0,
                  } satisfies AlicizationRecallLatencyBudgetSnapshot
                })
                .filter((item): item is AlicizationRecallLatencyBudgetSnapshot => Boolean(item))
                .slice(0, 8)
            : [],
          hotPathKey: sanitizeAlicizationDigitalLifeDigestText(recallLatencyPolicy.hotPathKey, 220) || null,
          shouldUseHotCache: recallLatencyPolicy.shouldUseHotCache === true,
          shouldPrefetch: recallLatencyPolicy.shouldPrefetch === true,
          shouldAvoidDeepExpansion: recallLatencyPolicy.shouldAvoidDeepExpansion === true,
          shouldEmitFollowUpAffordance: recallLatencyPolicy.shouldEmitFollowUpAffordance === true,
          confidence: Math.max(0, Math.min(1, Number(recallLatencyPolicy.confidence ?? 0))),
          reasonTags: Array.isArray(recallLatencyPolicy.reasonTags)
            ? recallLatencyPolicy.reasonTags
                .map(item => sanitizeAlicizationDigitalLifeDigestText(item, 120))
                .filter(Boolean)
                .slice(0, 12)
            : [],
          summary: sanitizeAlicizationDigitalLifeDigestText(recallLatencyPolicy.summary, 220) || '',
        }
      : null,
    recollectionIntent: candidate.recollectionIntent && typeof candidate.recollectionIntent === 'object'
      ? candidate.recollectionIntent as Record<string, unknown>
      : null,
    recollectionPlan: candidate.recollectionPlan && typeof candidate.recollectionPlan === 'object'
      ? candidate.recollectionPlan as Record<string, unknown>
      : null,
    recollectionSpeechPlan: candidate.recollectionSpeechPlan && typeof candidate.recollectionSpeechPlan === 'object'
      ? candidate.recollectionSpeechPlan as Record<string, unknown>
      : null,
    memoryDeliberation: candidate.memoryDeliberation && typeof candidate.memoryDeliberation === 'object'
      ? candidate.memoryDeliberation as Record<string, unknown>
      : null,
    dialogueRhythm: dialogueRhythm
      ? {
          activeClosenessContext: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.activeClosenessContext, 64) || null,
          activeClosenessRung: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.activeClosenessRung, 64) || null,
          relationshipDoctrine: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.relationshipDoctrine, 180) || null,
          burdenLine: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.burdenLine, 180) || null,
          trustMeaning: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.trustMeaning, 180) || null,
          stabilitySignal: sanitizeAlicizationDigitalLifeDigestText(dialogueRhythm.stabilitySignal, 180) || null,
        }
      : null,
    summary,
  }
}

export type AlicizationMindHeadKey
  = | 'autobiographical-self'
    | 'person-state-update-surface'
    | 'reflection-ledger'
    | 'motive-engine'
    | 'habit-policy'
    | 'learning-execution-state'

export type AlicizationDigitalLifeSpineMemoryClosureTraceSource
  = | 'personality'
    | 'affective-residue'
    | 'execution-feedback'
    | 'embodiment-cadence'
    | 'initiative'
    | 'retrieval'
    | 'settlement'

export interface AlicizationDigitalLifeSpineMemoryClosureTrace {
  version: 'memory-closure-trace-v1'
  authority: 'memory-os'
  whySurface: Array<{
    source: AlicizationDigitalLifeSpineMemoryClosureTraceSource
    summary: string
    reasonCodes: string[]
  }>
  surfacePolicy: {
    gateStatus: string | null
    mode: 'open' | 'gist-only' | 'tone-carry' | 'inward-only' | 'closed'
    timing: string | null
    speechMode: string | null
    placement: string | null
    certainty: string | null
    reasons: string[]
  }
  nextInfluence: {
    initiative: {
      restraint: string | null
      preferredTiming: string | null
      pressure: 'lower-pressure' | 'standard'
      reason: string | null
    }
    execution: {
      carry: string | null
      nextLearningAction: string | null
      shouldVerify: boolean
      shouldReflect: boolean
      activeLearningFocuses: string[]
    }
    emotion?: {
      reason: string | null
      afterglow: string | null
      residue: string | null
    }
    embodiment: {
      cadence: string | null
      preferredVoiceMode: 'lower-pressure' | 'even' | null
      preferredLipsyncMode: 'restrained' | 'matched' | null
      preferredGazeMode: 'steady' | 'soften' | 'drift' | null
      reason: string | null
    }
  }
  closureState: {
    state: string | null
    open: boolean
    revisionRequired: boolean
    shouldLabelUncertainty: boolean
    visibleCarryMode: string | null
    retrievalQuality: string | null
    conflictPressure: string | null
  }
  selectedCandidateIds: string[]
  memoryIdentity?: AlicizationMemoryClosureIdentitySnapshot | null
  reasonTags: string[]
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
  recollectionSummary?: string | null
  recollectionSurfaceSummary?: string | null
  recollectionConfidence?: number | null
  thoughtThreadSummary: string | null
  longHorizonSummary?: string | null
  rememberedPreferenceSummary?: string | null
  rememberedConstraintSummary?: string | null
  rememberedPlanSummary?: string | null
  longHorizonCueCount?: number | null
  selfEvolution?: {
    relationshipDoctrine: string | null
    latestInflection: string | null
    burdenLine: string | null
    trustMeaning: string | null
    summary: string | null
  } | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  personStateProjection?: {
    summary?: string | null
    selfContinuityAuthority?: {
      sourceTags?: string[] | null
      selfLine: string | null
      relationshipLine: string | null
      motiveLine: string | null
      habitLine: string | null
      inwardLine: string | null
      authoritySummary: string | null
    } | null
    activeClosenessContext: string | null
    activeClosenessRung: string | null
    relationshipPosture: string | null
    preferredProactiveStyle: string | null
  } | null
  memoryClosureTrace?: AlicizationDigitalLifeSpineMemoryClosureTrace | null
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
    latestInflection: string | null
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
    personaBias?: {
      relationshipPosture: string | null
      initiativeStyle: string | null
      silenceReconnect: string | null
      comfortStyle: string | null
      preferredProactiveStyle: string | null
      whySummary: string | null
    } | null
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
  learningReadiness?: number | null
  contradictionPressure?: number | null
  dominantTrajectory?: string | null
  activeLearningFocuses?: string[]
  evolutionMomentum?: number | null
  nextLearningAction?: string | null
  nextLearningReason?: string | null
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
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  currentConsciousFrame?: {
    reasonTags: string[]
    signature?: string | null
    focusAnchor?: string | null
    consciousNeed?: string | null
    speakingIntention?: string | null
  } | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
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

function normalizeAlicizationRuntimeDigestAffectiveResidue(
  raw: unknown,
): AlicizationAffectiveResidueMemorySnapshot | null {
  return normalizeAlicizationDerivedMindStateBundle({
    version: 'derived-mind-state-bundle-v1',
    source: 'browser-fallback',
    producedAt: 0,
    summary: 'runtime-digest-affective-residue',
    affectiveResidue: raw,
  })?.affectiveResidue ?? null
}

function normalizeAlicizationRuntimeDigestDerivedMindStateBundle(
  raw: unknown,
): AlicizationDerivedMindStateBundle | null {
  const normalized = normalizeAlicizationDerivedMindStateBundle(raw)
  if (normalized)
    return normalized

  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  if (!('affectiveResidue' in candidate))
    return null

  return normalizeAlicizationDerivedMindStateBundle({
    version: 'derived-mind-state-bundle-v1',
    source: 'browser-fallback',
    producedAt: 0,
    summary: 'runtime-digest-derived-mind-state-bundle',
    affectiveResidue: candidate.affectiveResidue,
  })
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

function normalizeAlicizationDigitalLifeDigestStringList(raw: unknown, limit = 8, maxChars = 120) {
  if (!Array.isArray(raw))
    return []

  const normalized: string[] = []
  const seen = new Set<string>()
  for (const item of raw) {
    const text = sanitizeAlicizationDigitalLifeDigestText(item, maxChars)
    if (!text || seen.has(text))
      continue
    normalized.push(text)
    seen.add(text)
    if (normalized.length >= limit)
      break
  }
  return normalized
}

function normalizeAlicizationDigitalLifePersonaBias(raw: unknown): NonNullable<AlicizationDigitalLifeSpineProactiveDigest['personaBias']> | null {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const personaBias = {
    relationshipPosture: sanitizeAlicizationDigitalLifeDigestText(candidate.relationshipPosture, 64) || null,
    initiativeStyle: sanitizeAlicizationDigitalLifeDigestText(candidate.initiativeStyle, 64) || null,
    silenceReconnect: sanitizeAlicizationDigitalLifeDigestText(candidate.silenceReconnect, 64) || null,
    comfortStyle: sanitizeAlicizationDigitalLifeDigestText(candidate.comfortStyle, 64) || null,
    preferredProactiveStyle: sanitizeAlicizationDigitalLifeDigestText(candidate.preferredProactiveStyle, 64) || null,
    whySummary: sanitizeAlicizationDigitalLifeDigestText(candidate.whySummary, 320) || null,
  }

  return Object.values(personaBias).some(Boolean) ? personaBias : null
}

function normalizeAlicizationDigitalLifeSpineMemoryClosureTrace(
  raw: unknown,
): AlicizationDigitalLifeSpineMemoryClosureTrace | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  if (candidate.version !== 'memory-closure-trace-v1' || candidate.authority !== 'memory-os')
    return null

  const surfacePolicyCandidate = candidate.surfacePolicy && typeof candidate.surfacePolicy === 'object' && !Array.isArray(candidate.surfacePolicy)
    ? candidate.surfacePolicy as Record<string, unknown>
    : null
  const nextInfluenceCandidate = candidate.nextInfluence && typeof candidate.nextInfluence === 'object' && !Array.isArray(candidate.nextInfluence)
    ? candidate.nextInfluence as Record<string, unknown>
    : null
  const initiativeCandidate = nextInfluenceCandidate?.initiative && typeof nextInfluenceCandidate.initiative === 'object' && !Array.isArray(nextInfluenceCandidate.initiative)
    ? nextInfluenceCandidate.initiative as Record<string, unknown>
    : null
  const executionCandidate = nextInfluenceCandidate?.execution && typeof nextInfluenceCandidate.execution === 'object' && !Array.isArray(nextInfluenceCandidate.execution)
    ? nextInfluenceCandidate.execution as Record<string, unknown>
    : null
  const emotionCandidate = nextInfluenceCandidate?.emotion && typeof nextInfluenceCandidate.emotion === 'object' && !Array.isArray(nextInfluenceCandidate.emotion)
    ? nextInfluenceCandidate.emotion as Record<string, unknown>
    : null
  const embodimentCandidate = nextInfluenceCandidate?.embodiment && typeof nextInfluenceCandidate.embodiment === 'object' && !Array.isArray(nextInfluenceCandidate.embodiment)
    ? nextInfluenceCandidate.embodiment as Record<string, unknown>
    : null
  const closureStateCandidate = candidate.closureState && typeof candidate.closureState === 'object' && !Array.isArray(candidate.closureState)
    ? candidate.closureState as Record<string, unknown>
    : null
  const memoryIdentityCandidate = candidate.memoryIdentity && typeof candidate.memoryIdentity === 'object' && !Array.isArray(candidate.memoryIdentity)
    ? candidate.memoryIdentity as Record<string, unknown>
    : null

  const normalizeMode = (rawMode: unknown): AlicizationDigitalLifeSpineMemoryClosureTrace['surfacePolicy']['mode'] => {
    return rawMode === 'open'
      || rawMode === 'gist-only'
      || rawMode === 'tone-carry'
      || rawMode === 'inward-only'
      || rawMode === 'closed'
      ? rawMode
      : 'closed'
  }
  const normalizePressure = (rawPressure: unknown): AlicizationDigitalLifeSpineMemoryClosureTrace['nextInfluence']['initiative']['pressure'] => {
    return rawPressure === 'lower-pressure' ? 'lower-pressure' : 'standard'
  }
  const normalizeVoice = (rawVoice: unknown): AlicizationDigitalLifeSpineMemoryClosureTrace['nextInfluence']['embodiment']['preferredVoiceMode'] => {
    return rawVoice === 'lower-pressure' || rawVoice === 'even' ? rawVoice : null
  }
  const normalizeLipsync = (rawLipsync: unknown): AlicizationDigitalLifeSpineMemoryClosureTrace['nextInfluence']['embodiment']['preferredLipsyncMode'] => {
    return rawLipsync === 'restrained' || rawLipsync === 'matched' ? rawLipsync : null
  }
  const normalizeGaze = (rawGaze: unknown): AlicizationDigitalLifeSpineMemoryClosureTrace['nextInfluence']['embodiment']['preferredGazeMode'] => {
    return rawGaze === 'steady' || rawGaze === 'soften' || rawGaze === 'drift' ? rawGaze : null
  }
  const normalizeSource = (rawSource: unknown): AlicizationDigitalLifeSpineMemoryClosureTraceSource | null => {
    return rawSource === 'personality'
      || rawSource === 'affective-residue'
      || rawSource === 'execution-feedback'
      || rawSource === 'embodiment-cadence'
      || rawSource === 'initiative'
      || rawSource === 'retrieval'
      || rawSource === 'settlement'
      ? rawSource
      : null
  }

  return {
    version: 'memory-closure-trace-v1',
    authority: 'memory-os',
    whySurface: Array.isArray(candidate.whySurface)
      ? candidate.whySurface
          .map((item): AlicizationDigitalLifeSpineMemoryClosureTrace['whySurface'][number] | null => {
            if (!item || typeof item !== 'object' || Array.isArray(item))
              return null
            const whyCandidate = item as Record<string, unknown>
            const source = normalizeSource(whyCandidate.source)
            const summary = sanitizeAlicizationDigitalLifeDigestText(whyCandidate.summary, 220)
            if (!source || !summary)
              return null
            return {
              source,
              summary,
              reasonCodes: normalizeAlicizationDigitalLifeDigestStringList(whyCandidate.reasonCodes, 8, 120),
            }
          })
          .filter((item): item is AlicizationDigitalLifeSpineMemoryClosureTrace['whySurface'][number] => Boolean(item))
          .slice(0, 8)
      : [],
    surfacePolicy: {
      gateStatus: sanitizeAlicizationDigitalLifeDigestText(surfacePolicyCandidate?.gateStatus, 48) || null,
      mode: normalizeMode(surfacePolicyCandidate?.mode),
      timing: sanitizeAlicizationDigitalLifeDigestText(surfacePolicyCandidate?.timing, 80) || null,
      speechMode: sanitizeAlicizationDigitalLifeDigestText(surfacePolicyCandidate?.speechMode, 80) || null,
      placement: sanitizeAlicizationDigitalLifeDigestText(surfacePolicyCandidate?.placement, 80) || null,
      certainty: sanitizeAlicizationDigitalLifeDigestText(surfacePolicyCandidate?.certainty, 80) || null,
      reasons: normalizeAlicizationDigitalLifeDigestStringList(surfacePolicyCandidate?.reasons, 8, 120),
    },
    nextInfluence: {
      initiative: {
        restraint: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate?.restraint, 80) || null,
        preferredTiming: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate?.preferredTiming, 80) || null,
        pressure: normalizePressure(initiativeCandidate?.pressure),
        reason: sanitizeAlicizationDigitalLifeDigestText(initiativeCandidate?.reason, 220) || null,
      },
      execution: {
        carry: sanitizeAlicizationDigitalLifeDigestText(executionCandidate?.carry, 220) || null,
        nextLearningAction: sanitizeAlicizationDigitalLifeDigestText(executionCandidate?.nextLearningAction, 80) || null,
        shouldVerify: executionCandidate?.shouldVerify === true,
        shouldReflect: executionCandidate?.shouldReflect === true,
        activeLearningFocuses: normalizeAlicizationDigitalLifeDigestStringList(executionCandidate?.activeLearningFocuses, 8, 120),
      },
      ...(emotionCandidate
        ? {
            emotion: {
              reason: sanitizeAlicizationDigitalLifeDigestText(emotionCandidate.reason, 220) || null,
              afterglow: sanitizeAlicizationDigitalLifeDigestText(emotionCandidate.afterglow, 220) || null,
              residue: sanitizeAlicizationDigitalLifeDigestText(emotionCandidate.residue, 220) || null,
            },
          }
        : {}),
      embodiment: {
        cadence: sanitizeAlicizationDigitalLifeDigestText(embodimentCandidate?.cadence, 220) || null,
        preferredVoiceMode: normalizeVoice(embodimentCandidate?.preferredVoiceMode),
        preferredLipsyncMode: normalizeLipsync(embodimentCandidate?.preferredLipsyncMode),
        preferredGazeMode: normalizeGaze(embodimentCandidate?.preferredGazeMode),
        reason: sanitizeAlicizationDigitalLifeDigestText(embodimentCandidate?.reason, 220) || null,
      },
    },
    closureState: {
      state: sanitizeAlicizationDigitalLifeDigestText(closureStateCandidate?.state, 80) || null,
      open: closureStateCandidate?.open === true,
      revisionRequired: closureStateCandidate?.revisionRequired === true,
      shouldLabelUncertainty: closureStateCandidate?.shouldLabelUncertainty === true,
      visibleCarryMode: sanitizeAlicizationDigitalLifeDigestText(closureStateCandidate?.visibleCarryMode, 80) || null,
      retrievalQuality: sanitizeAlicizationDigitalLifeDigestText(closureStateCandidate?.retrievalQuality, 80) || null,
      conflictPressure: sanitizeAlicizationDigitalLifeDigestText(closureStateCandidate?.conflictPressure, 80) || null,
    },
    selectedCandidateIds: normalizeAlicizationDigitalLifeDigestStringList(candidate.selectedCandidateIds, 8, 120),
    memoryIdentity: memoryIdentityCandidate
      ? {
          selectedCandidateIds: normalizeAlicizationDigitalLifeDigestStringList(memoryIdentityCandidate.selectedCandidateIds, 8, 160),
          continuityKey: sanitizeAlicizationDigitalLifeDigestText(memoryIdentityCandidate.continuityKey, 160)
            || normalizeAlicizationDigitalLifeDigestStringList(memoryIdentityCandidate.selectedCandidateIds, 1, 160)[0]
            || null,
          reasonTags: normalizeAlicizationDigitalLifeDigestStringList(memoryIdentityCandidate.reasonTags, 8, 120),
        }
      : null,
    reasonTags: normalizeAlicizationDigitalLifeDigestStringList(candidate.reasonTags, 12, 80),
  }
}

function normalizeAlicizationFallbackExpressionMode(raw: unknown) {
  return raw === 'blend' || raw === 'recover'
    ? raw
    : 'hold'
}

function normalizeAlicizationFallbackActionMode(raw: unknown) {
  return raw === 'pulse' || raw === 'none' || raw === 'hold'
    ? raw
    : 'hold'
}

function resolveAlicizationFallbackPostureHint(input: {
  preferredPresence: string
  rendererHints: AlicizationDigitalLifeEnvelope['rendererHints'] | null
}) {
  if (
    input.preferredPresence === 'inspection'
    || input.preferredPresence === 'hesitant'
    || input.preferredPresence === 'concerned'
    || input.preferredPresence === 'idle'
  ) {
    return input.preferredPresence
  }

  if (input.rendererHints?.residentMode === 'same-thread-continuation')
    return 'hesitant' as const
  if (input.rendererHints?.residentMode === 'measured-return')
    return 'inspection' as const

  return 'attentive' as const
}

function resolveAlicizationFallbackMode(input: {
  rawMode: string
  actionMode: AlicizationDigitalLifeEnvelope['action']['actionMode']
  expressionMode: AlicizationDigitalLifeEnvelope['face']['expressionMode']
  emotion: AlicizationEmotion
}) {
  if (input.rawMode === 'thinking' && input.actionMode === 'hold')
    return 'thinking' as const
  if (input.actionMode === 'hold' || input.actionMode === 'pulse')
    return 'acting' as const
  if (input.expressionMode === 'recover' || input.emotion === 'thinking')
    return 'thinking' as const
  if (
    input.rawMode === 'thinking'
    || input.rawMode === 'acting'
    || input.rawMode === 'recovering'
    || input.rawMode === 'speaking'
  ) {
    return input.rawMode
  }

  return 'speaking' as const
}

function normalizeAlicizationFallbackInterruptMode(raw: unknown) {
  return raw === 'soft-interrupt' || raw === 'hard-interrupt'
    ? raw
    : 'continue'
}

function normalizeAlicizationFallbackSettleMode(raw: unknown) {
  return raw === 'hold' || raw === 'linger'
    ? raw
    : 'release'
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

function normalizeAlicizationRuntimeConsciousFrameDigest(raw: unknown) {
  const candidate = raw && typeof raw === 'object'
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const reasonTags = (Array.isArray(candidate.reasonTags) ? candidate.reasonTags : [])
    .map(tag => sanitizeAlicizationDigitalLifeDigestText(tag, 160))
    .filter(Boolean)
    .filter((tag, index, values) => values.indexOf(tag) === index)
    .slice(0, 8)

  return {
    reasonTags,
    signature: sanitizeAlicizationDigitalLifeDigestText(candidate.signature, 256) || null,
    focusAnchor: sanitizeAlicizationDigitalLifeDigestText(candidate.focusAnchor, 160) || null,
    consciousNeed: sanitizeAlicizationDigitalLifeDigestText(candidate.consciousNeed, 420) || null,
    speakingIntention: sanitizeAlicizationDigitalLifeDigestText(candidate.speakingIntention, 420) || null,
  }
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
  const affectiveResidue = normalizeAlicizationRuntimeDigestAffectiveResidue(candidate.affectiveResidue)
  const derivedMindStateBundle = normalizeAlicizationRuntimeDigestDerivedMindStateBundle(candidate.derivedMindStateBundle)
  const currentConsciousFrameCandidate = normalizeAlicizationRuntimeConsciousFrameDigest(candidate.currentConsciousFrame)
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
    affectiveResidue,
    derivedMindStateBundle,
    currentConsciousFrame: currentConsciousFrameCandidate,
    emotionalKernel: normalizeAlicizationEmotionalKernelSnapshot(candidate.emotionalKernel),
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
          personaBias: normalizeAlicizationDigitalLifePersonaBias(proactiveCandidate.personaBias),
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
          learningReadiness: normalizeAlicizationDigitalLifeDigestUnit(outcomeLearningCandidate.learningReadiness),
          contradictionPressure: normalizeAlicizationDigitalLifeDigestUnit(outcomeLearningCandidate.contradictionPressure),
          dominantTrajectory: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.dominantTrajectory, 180) || null,
          activeLearningFocuses: Array.isArray(outcomeLearningCandidate.activeLearningFocuses)
            ? outcomeLearningCandidate.activeLearningFocuses
                .filter((item): item is string => typeof item === 'string')
                .map(item => sanitizeAlicizationDigitalLifeDigestText(item, 96))
                .filter(Boolean)
                .slice(0, 6)
            : [],
          evolutionMomentum: normalizeAlicizationDigitalLifeDigestUnit(outcomeLearningCandidate.evolutionMomentum),
          nextLearningAction: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.nextLearningAction, 48) || null,
          nextLearningReason: sanitizeAlicizationDigitalLifeDigestText(outcomeLearningCandidate.nextLearningReason, 180) || null,
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
                latestInflection: sanitizeAlicizationDigitalLifeDigestText(autobiographicalSelfCandidate.latestInflection, 220) || null,
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
                personaBias: normalizeAlicizationDigitalLifePersonaBias(initiativeCandidate.personaBias),
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
          selfEvolution: (() => {
            const selfEvolutionCandidate = memoryCandidate.selfEvolution
              && typeof memoryCandidate.selfEvolution === 'object'
              && !Array.isArray(memoryCandidate.selfEvolution)
              ? memoryCandidate.selfEvolution as Record<string, unknown>
              : null
            if (!selfEvolutionCandidate)
              return null

            const normalized = {
              relationshipDoctrine: sanitizeAlicizationDigitalLifeDigestText(selfEvolutionCandidate.relationshipDoctrine, 220) || null,
              latestInflection: sanitizeAlicizationDigitalLifeDigestText(selfEvolutionCandidate.latestInflection, 220) || null,
              burdenLine: sanitizeAlicizationDigitalLifeDigestText(selfEvolutionCandidate.burdenLine, 220) || null,
              trustMeaning: sanitizeAlicizationDigitalLifeDigestText(selfEvolutionCandidate.trustMeaning, 220) || null,
              summary: sanitizeAlicizationDigitalLifeDigestText(selfEvolutionCandidate.summary, 220) || null,
            }
            return Object.values(normalized).some(Boolean) ? normalized : null
          })(),
          affectiveResidue: normalizeAlicizationRuntimeDigestAffectiveResidue(memoryCandidate.affectiveResidue),
          derivedMindStateBundle: normalizeAlicizationRuntimeDigestDerivedMindStateBundle(memoryCandidate.derivedMindStateBundle),
          personStateProjection: (() => {
            const projectionCandidate = memoryCandidate.personStateProjection
              && typeof memoryCandidate.personStateProjection === 'object'
              && !Array.isArray(memoryCandidate.personStateProjection)
              ? memoryCandidate.personStateProjection as Record<string, unknown>
              : null
            if (!projectionCandidate)
              return null

            const authorityCandidate = projectionCandidate.selfContinuityAuthority
              && typeof projectionCandidate.selfContinuityAuthority === 'object'
              && !Array.isArray(projectionCandidate.selfContinuityAuthority)
              ? projectionCandidate.selfContinuityAuthority as Record<string, unknown>
              : null
            const selfContinuityAuthority = authorityCandidate
              ? {
                  sourceTags: normalizeAlicizationDigitalLifeDigestStringList(authorityCandidate.sourceTags, 8, 64),
                  selfLine: sanitizeAlicizationDigitalLifeDigestText(authorityCandidate.selfLine, 220) || null,
                  relationshipLine: sanitizeAlicizationDigitalLifeDigestText(authorityCandidate.relationshipLine, 220) || null,
                  motiveLine: sanitizeAlicizationDigitalLifeDigestText(authorityCandidate.motiveLine, 220) || null,
                  habitLine: sanitizeAlicizationDigitalLifeDigestText(authorityCandidate.habitLine, 220) || null,
                  inwardLine: sanitizeAlicizationDigitalLifeDigestText(authorityCandidate.inwardLine, 220) || null,
                  authoritySummary: sanitizeAlicizationDigitalLifeDigestText(authorityCandidate.authoritySummary, 220) || null,
                }
              : null
            const normalizedAuthority = selfContinuityAuthority
              && (
                selfContinuityAuthority.sourceTags.length > 0
                || Object.entries(selfContinuityAuthority)
                  .some(([key, value]) => key !== 'sourceTags' && Boolean(value))
              )
              ? selfContinuityAuthority
              : null
            const normalized = {
              summary: sanitizeAlicizationDigitalLifeDigestText(projectionCandidate.summary, 220) || null,
              selfContinuityAuthority: normalizedAuthority,
              activeClosenessContext: sanitizeAlicizationDigitalLifeDigestText(projectionCandidate.activeClosenessContext, 64) || null,
              activeClosenessRung: sanitizeAlicizationDigitalLifeDigestText(projectionCandidate.activeClosenessRung, 64) || null,
              relationshipPosture: sanitizeAlicizationDigitalLifeDigestText(projectionCandidate.relationshipPosture, 64) || null,
              preferredProactiveStyle: sanitizeAlicizationDigitalLifeDigestText(projectionCandidate.preferredProactiveStyle, 64) || null,
            }
            return Object.values(normalized).some(Boolean) ? normalized : null
          })(),
          memoryClosureTrace: normalizeAlicizationDigitalLifeSpineMemoryClosureTrace(memoryCandidate.memoryClosureTrace),
        }
      : null,
  }
}

export type AlicizationBridgeChatStreamEvent
  = | {
    type: 'text-delta'
    text: string
    origin?: AlicizationVisibleArtifactOrigin
    learningPolicy?: AlicizationVisibleArtifactLearningPolicy
    failureSurface?: AlicizationChatFailureSurface | null
  }
  | {
    type: 'meta'
    governance: AlicizationMindTurnGovernance | null
    embodiment?: AlicizationDialogueEmbodimentEnvelope | null
    embodimentScript?: AlicizationEmbodimentScriptV1 | null
    speechTimeline?: AlicizationDialogueSpeechTimeline | null
    digitalLife?: AlicizationDigitalLifeEnvelope | null
    digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
    runtimeDigest?: AlicizationRuntimeDigest | null
  }
  | { type: 'tool-call', toolCallId: string, toolName: string, args: string, toolCallType: 'function' }
  | { type: 'tool-result', toolCallId: string, result?: unknown }
  | {
    type: 'finish'
    origin?: AlicizationVisibleArtifactOrigin
    learningPolicy?: AlicizationVisibleArtifactLearningPolicy
    failureSurface?: AlicizationChatFailureSurface | null
    memoryFailures?: AlicizationChatMemoryFailureSurface[]
    finishReason?: string
    fullText?: string
    visibleReplyExecution?: AlicizationBridgeVisibleReplyExecution | null
    visibleReplyRealization?: AlicizationVisibleReplyRealizationTransportArtifact | null
    visibleReplyCritic?: Record<string, unknown> | null
    visibleReplyClosure?: Record<string, unknown> | null
  }
  | {
    type: 'error'
    error: unknown
    origin?: AlicizationVisibleArtifactOrigin
    learningPolicy?: AlicizationVisibleArtifactLearningPolicy
    failureSurface?: AlicizationChatFailureSurface | null
  }

export type AlicizationDialogueStructuredFormat
  = | 'subconscious-proactive-v1'
    | 'subconscious-proactive-llm-v1'
    | 'subconscious-reminder-v1'
    | 'mind-turn-v1'
    | 'epoch1-v1'
    | 'fallback-v1'
export type AlicizationDialogueStructuredFormatLane = 'normal' | 'legacy-input' | 'infra-fallback'

export type AlicizationProactiveScenario = 'coding' | 'media' | 'late-night-care' | 'general'
export type AlicizationProactiveStyle = 'silent-observe' | 'light-nudge' | 'gentle-care' | 'firm-warning'
export type AlicizationProactiveUrgency = 'low' | 'medium' | 'high'
export type AlicizationProactiveStaticReasonCode
  = | 'busy-host'
    | 'persona-observant-style'
    | 'persona-high-participation-style'
    | 'persona-direct-reconnect'
    | 'persona-silence-hold'
    | 'persona-guardian-care'
    | 'habit-policy-quiet-companionship'
    | 'habit-policy-return-with-proof'
    | 'habit-policy-repair-before-fluency'
    | 'habit-policy-rest-protection'
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
    | 'world-model-revalidation-required'
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
    | 'continuity-internal-only'
    | 'continuity-after-payoff'
    | 'continuity-next-open-window'
    | 'continuity-execution-callback'
    | 'continuity-execution-callback-afterglow-hold'
    | 'continuity-execution-callback-carry'
    | 'held-autonomy-carry'
    | 'presence-only-hold'
    | 'relationship-cadence-residue'
    | 'relationship-residue-delay-warmth'
    | 'relationship-residue-protect-rest'
export type AlicizationProactiveReasonCode
  = | AlicizationProactiveStaticReasonCode
    | `learning:${AlicizationLearningAction | 'hold'}`
    | `learning-focus:${string}`

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
  visibleReplyAuthority?: AlicizationVisibleReplyExecutionAuthority | null
  performance: AlicizationDialoguePerformancePayload
  embodiment?: AlicizationDialogueEmbodimentEnvelope | null
  embodimentScript?: AlicizationEmbodimentScriptV1 | null
  speechTimeline?: AlicizationDialogueSpeechTimeline | null
  digitalLife?: AlicizationDigitalLifeEnvelope | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineDigest | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  memoryStageReplay?: AlicizationOrganicMemoryStageReplay | null
  memoryResolutionLedger?: AlicizationMemoryResolutionLedger | null
  format?: AlicizationDialogueStructuredFormat
  formatLane?: AlicizationDialogueStructuredFormatLane | null
  legacyInputFormat?: Extract<AlicizationDialogueStructuredFormat, 'epoch1-v1' | 'fallback-v1'> | null
  proactive?: AlicizationProactiveMetadata
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  governance?: AlicizationMindTurnGovernance | null
  runtimeDigest?: AlicizationRuntimeDigest | null
  policyLocked?: string
  rawEmotion?: string
}

export interface AlicizationDialogueRespondedPayload {
  cardId: string
  turnId: string
  sessionId: string
  origin?: 'user-turn' | 'subconscious-proactive'
  userText?: string
  assistantText?: string
  structured: AlicizationDialogueStructuredPayload
  isFallback: boolean
  createdAt: number
}

export type AlicizationDialogueReplyFeedbackKind
  = | 'received'
    | 'robotic'
    | 'missed'
    | 'intrusive'
    | 'interrupted'

export type AlicizationDialogueReplyFeedbackSource
  = | 'typed-ui'
    | 'typed-transport'
    | 'typed-provider'

export interface AlicizationDialogueReplyFeedbackFact {
  kind: AlicizationDialogueReplyFeedbackKind
  source: AlicizationDialogueReplyFeedbackSource
  replyTurnId: string
}

export function normalizeAlicizationDialogueReplyFeedbackFact(
  raw: unknown,
): AlicizationDialogueReplyFeedbackFact | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const kind = candidate.kind
  const source = candidate.source
  const replyTurnId = typeof candidate.replyTurnId === 'string'
    ? candidate.replyTurnId.trim()
    : ''

  if (
    (
      kind !== 'received'
      && kind !== 'robotic'
      && kind !== 'missed'
      && kind !== 'intrusive'
      && kind !== 'interrupted'
    )
    || (
      source !== 'typed-ui'
      && source !== 'typed-transport'
      && source !== 'typed-provider'
    )
    || !replyTurnId
  ) {
    return null
  }

  return {
    kind,
    source,
    replyTurnId,
  }
}
