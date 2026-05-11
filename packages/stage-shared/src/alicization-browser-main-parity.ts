import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationDerivedMindStateBundle,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationRecallLatencyPolicySnapshot,
} from './alicization-transport-contracts'
import type { AlicizationLearningArtifactLedgerRecord } from './alicization-learning-artifact-ledger'
import type { AlicizationMemoryResolutionLedger } from './alicization-memory-resolution-ledger'
import type { AlicizationMemorySituationCandidateSet } from './alicization-memory-situation-candidate'

export type AlicizationBrowserMainParityLayer =
  | 'bundle'
  | 'learning-execution'
  | 'affective-residue'
  | 'latency-policy'
  | 'resolution-ledger'
  | 'situation-candidates'
  | 'claim-evidence'
  | 'learning-causal-chain'

export interface AlicizationBrowserMainParitySummary {
  version: 'browser-main-parity-v1'
  passed: boolean
  comparedFieldCount: number
  divergentFieldCount: number
  divergentLayers: AlicizationBrowserMainParityLayer[]
  firstDivergentLayer: AlicizationBrowserMainParityLayer | null
  comparedFields: string[]
  divergentFields: Array<{
    field: string
    mainValue: string | null
    browserValue: string | null
    layer: AlicizationBrowserMainParityLayer
    severity: 'warn' | 'fail'
  }>
  summary: string
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeScalar(raw: unknown): string | null {
  if (raw == null)
    return null
  if (typeof raw === 'string')
    return sanitizeText(raw, 220) || null
  if (typeof raw === 'number')
    return Number.isFinite(raw) ? String(Number(raw.toFixed(3))) : null
  if (typeof raw === 'boolean')
    return raw ? 'true' : 'false'
  return null
}

function normalizeStringList(raw: unknown): string | null {
  if (!Array.isArray(raw))
    return null
  const items = raw
    .map(item => sanitizeText(item, 120))
    .filter(Boolean)
  return items.length > 0 ? items.join(' | ') : null
}

function normalizeLearningExecution(state: AlicizationLearningExecutionStateSnapshot | null | undefined) {
  if (!state)
    return null
  return {
    nextLearningAction: normalizeScalar(state.nextLearningAction),
    currentStatus: normalizeScalar(state.currentStatus),
    activeLearningFocuses: normalizeStringList(state.activeLearningFocuses),
    queuedTaskCount: normalizeScalar(state.queuedTaskCount),
    blockedTaskCount: normalizeScalar(state.blockedTaskCount),
    lastFailureKind: normalizeScalar(state.lastFailureKind),
    lastCompletedTaskId: normalizeScalar(state.lastCompletedTaskId),
    lastCompletedAction: normalizeScalar(state.lastCompletedAction),
    lastFailureTaskId: normalizeScalar(state.lastFailureTaskId),
  }
}

function normalizeLearningCausalChain(state: AlicizationLearningExecutionStateSnapshot | null | undefined) {
  if (!state)
    return null
  return {
    currentTaskId: normalizeScalar(state.currentTaskId),
    currentStatus: normalizeScalar(state.currentStatus),
    nextLearningAction: normalizeScalar(state.nextLearningAction),
    currentBlockedReason: normalizeScalar(state.currentBlockedReason),
    lastCompletedTaskId: normalizeScalar(state.lastCompletedTaskId),
    lastCompletedAction: normalizeScalar(state.lastCompletedAction),
    lastFailureTaskId: normalizeScalar(state.lastFailureTaskId),
    lastFailureKind: normalizeScalar(state.lastFailureKind),
    recentTaskIds: normalizeStringList(state.recentTaskIds),
  }
}

function normalizeAffectiveResidue(state: AlicizationAffectiveResidueMemorySnapshot | null | undefined) {
  if (!state)
    return null
  return {
    dominantResidueKind: normalizeScalar(state.dominantResidueKind),
    cadenceMode: normalizeScalar(state.relationshipCadence.cadenceMode),
    distancePosture: normalizeScalar(state.relationshipCadence.distancePosture),
    shouldDelayWarmth: normalizeScalar(state.relationshipCadence.shouldDelayWarmth),
    shouldProtectRest: normalizeScalar(state.relationshipCadence.shouldProtectRest),
    summary: normalizeScalar(state.summary),
  }
}

function normalizeLatencyPolicy(state: AlicizationRecallLatencyPolicySnapshot | null | undefined) {
  if (!state)
    return null
  return {
    recallAction: normalizeScalar(state.recallAction),
    latencyClass: normalizeScalar(state.latencyClass),
    shouldUseHotCache: normalizeScalar(state.shouldUseHotCache),
    shouldAvoidDeepExpansion: normalizeScalar(state.shouldAvoidDeepExpansion),
    shouldEmitFollowUpAffordance: normalizeScalar(state.shouldEmitFollowUpAffordance),
    summary: normalizeScalar(state.summary),
  }
}

function normalizeResolutionLedger(state: AlicizationMemoryResolutionLedger | null | undefined) {
  if (!state)
    return null
  return {
    dominantClusterSummary: normalizeScalar(state.dominantClusterSummary),
    competingClusterSummary: normalizeScalar(state.competingClusterSummary),
    finalSurfacePolicy: normalizeScalar(state.finalSurfacePolicy),
    shouldStayInward: normalizeScalar(state.shouldStayInward),
    shouldDelayUntilAfterPayoff: normalizeScalar(state.shouldDelayUntilAfterPayoff),
    stableCoreOnly: normalizeScalar(state.stableCoreOnly),
    suppressionTags: normalizeStringList(state.suppressionTags),
    closureState: normalizeScalar(state.closureState),
    surfaceConfidence: normalizeScalar(state.surfaceConfidence),
    shouldLabelUncertainty: normalizeScalar(state.shouldLabelUncertainty),
    visibleCarryMode: normalizeScalar(state.visibleCarryMode),
    conflictPressure: normalizeScalar(state.conflictPressure),
    retrievalQuality: normalizeScalar(state.retrievalQuality),
  }
}

function normalizeSituationCandidates(state: AlicizationMemorySituationCandidateSet | null | undefined) {
  if (!state)
    return null
  const normalized: Record<string, string | null> = {
    selectedIds: normalizeStringList(state.selected.map(item => item.candidateId)),
    rejectedIds: normalizeStringList(state.rejected.slice(0, 8).map(item => item.candidateId)),
    suppressedIds: normalizeStringList(state.suppressed.slice(0, 8).map(item => item.candidateId)),
    delayedIds: normalizeStringList(state.delayed.slice(0, 8).map(item => item.candidateId)),
    unresolvedIds: normalizeStringList(state.unresolved.slice(0, 8).map(item => item.candidateId)),
  }
  for (const item of state.candidates.slice(0, 12).sort((left, right) => left.candidateId.localeCompare(right.candidateId))) {
    const prefix = `candidate.${item.candidateId}`
    normalized[`${prefix}.status`] = normalizeScalar(item.status)
    normalized[`${prefix}.statusReason`] = normalizeScalar(item.statusReason)
    normalized[`${prefix}.suppressionReasons`] = normalizeStringList(item.suppressionReasons)
    normalized[`${prefix}.situationKind`] = normalizeScalar(item.situationKind)
  }
  return normalized
}

function normalizeClaimEvidence(bundle: AlicizationDerivedMindStateBundle | null | undefined) {
  const graphs = bundle?.claimEvidenceGraphs ?? []
  if (graphs.length === 0)
    return null
  const normalized: Record<string, string | null> = {
    claimIds: normalizeStringList(graphs.slice(0, 12).map(item => item.claimId)),
  }
  for (const item of graphs.slice(0, 12).sort((left, right) => left.claimId.localeCompare(right.claimId))) {
    const prefix = `claim.${item.claimId}`
    normalized[`${prefix}.validationState`] = normalizeScalar(item.validationState)
    normalized[`${prefix}.sourceTrust`] = normalizeScalar(item.sourceTrust)
    normalized[`${prefix}.shouldRevalidate`] = normalizeScalar(item.revalidationPolicy.shouldRevalidate)
    normalized[`${prefix}.revalidationReasons`] = normalizeStringList(item.revalidationPolicy.reasonTags)
    normalized[`${prefix}.internalizationStage`] = normalizeScalar(
      item.internalizationDecision.mayInternalize
        ? 'internalize'
        : item.internalizationDecision.mayValidateOnly
          ? 'validate-only'
          : 'blocked',
    )
  }
  return normalized
}

function normalizeLearningArtifacts(records: AlicizationLearningArtifactLedgerRecord[] | null | undefined) {
  if (!records || records.length === 0)
    return null
  const normalized: Record<string, string | null> = {
    artifactIds: normalizeStringList(records.slice(0, 12).map(item => item.artifactId ?? item.taskId)),
  }
  for (const record of records.slice(0, 12).sort((left, right) => (left.artifactId ?? left.taskId).localeCompare(right.artifactId ?? right.taskId))) {
    const artifact = record.verifiedArtifact
    const key = record.artifactId ?? record.taskId
    const prefix = `artifact.${key}`
    normalized[`${prefix}.taskId`] = normalizeScalar(record.taskId)
    normalized[`${prefix}.claimId`] = normalizeScalar(record.claimId)
    normalized[`${prefix}.status`] = normalizeScalar(artifact?.status)
    normalized[`${prefix}.internalizationStage`] = normalizeScalar(artifact?.internalizationStage)
    normalized[`${prefix}.verificationBasis`] = normalizeStringList(record.verificationBasis)
  }
  return normalized
}

function normalizeTracePointer(state: {
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
} | null | undefined) {
  if (!state)
    return null
  return {
    decisionTraceId: normalizeScalar(state.decisionTraceId),
    turnId: normalizeScalar(state.turnId),
    sessionId: normalizeScalar(state.sessionId),
  }
}

function normalizeBundle(bundle: AlicizationDerivedMindStateBundle | null | undefined) {
  if (!bundle)
    return null
  return {
    summary: normalizeScalar(bundle.summary),
    hostTrustStage: normalizeScalar(bundle.hostPersonModel?.trustLadder.stage),
    selfTrajectory: normalizeScalar(bundle.selfEvolution?.dominantTrajectory),
    dialogueRelationshipDoctrine: normalizeScalar(bundle.dialogueRhythm?.relationshipDoctrine),
    recollectionCenter: normalizeScalar((bundle.recollectionPlan as any)?.opening),
    recollectionSurfaceMode: normalizeScalar((bundle.recollectionSpeechPlan as any)?.surfaceMode),
    deliberationSurfacePolicy: normalizeScalar((bundle.memoryDeliberation as any)?.surfacePolicy),
    structuredEmbodimentScriptVersion: normalizeScalar(bundle.structured?.embodimentScript?.version),
    structuredEmbodimentScriptDecisionTraceId: normalizeScalar(bundle.structured?.embodimentScript?.decisionTraceId),
    structuredEmbodimentScriptResidentMode: normalizeScalar(bundle.structured?.embodimentScript?.state.residentMode),
    structuredEmbodimentScriptFacePreUtteranceCue: normalizeScalar(bundle.structured?.embodimentScript?.facePlan.preUtteranceCue),
    structuredEmbodimentScriptFacePostUtteranceCue: normalizeScalar(bundle.structured?.embodimentScript?.facePlan.postUtteranceCue),
    structuredEmbodimentScriptLipSyncMode: normalizeScalar(bundle.structured?.embodimentScript?.lipsyncPlan.mode),
  }
}

function pushDiff(input: {
  layer: AlicizationBrowserMainParityLayer
  fieldPrefix: string
  mainState: Record<string, string | null> | null
  browserState: Record<string, string | null> | null
  comparedFields: string[]
  divergentFields: AlicizationBrowserMainParitySummary['divergentFields']
}) {
  const keys = new Set<string>([
    ...Object.keys(input.mainState ?? {}),
    ...Object.keys(input.browserState ?? {}),
  ])
  for (const key of keys) {
    const field = `${input.fieldPrefix}.${key}`
    input.comparedFields.push(field)
    const mainValue = input.mainState?.[key] ?? null
    const browserValue = input.browserState?.[key] ?? null
    if (mainValue === browserValue)
      continue
    input.divergentFields.push({
      field,
      mainValue,
      browserValue,
      layer: input.layer,
      severity: 'fail',
    })
  }
}

export function deriveAlicizationBrowserMainParitySummary(input: {
  mainBundle?: AlicizationDerivedMindStateBundle | null
  browserBundle?: AlicizationDerivedMindStateBundle | null
  mainResolutionLedger?: AlicizationMemoryResolutionLedger | null
  browserResolutionLedger?: AlicizationMemoryResolutionLedger | null
  mainMemorySituationCandidates?: AlicizationMemorySituationCandidateSet | null
  browserMemorySituationCandidates?: AlicizationMemorySituationCandidateSet | null
  mainLearningArtifacts?: AlicizationLearningArtifactLedgerRecord[] | null
  browserLearningArtifacts?: AlicizationLearningArtifactLedgerRecord[] | null
  mainTracePointer?: {
    decisionTraceId?: string | null
    turnId?: string | null
    sessionId?: string | null
  } | null
  browserTracePointer?: {
    decisionTraceId?: string | null
    turnId?: string | null
    sessionId?: string | null
  } | null
}) {
  const comparedFields: string[] = []
  const divergentFields: AlicizationBrowserMainParitySummary['divergentFields'] = []

  pushDiff({
    layer: 'bundle',
    fieldPrefix: 'bundle',
    mainState: normalizeBundle(input.mainBundle ?? null),
    browserState: normalizeBundle(input.browserBundle ?? null),
    comparedFields,
    divergentFields,
  })
  pushDiff({
    layer: 'learning-execution',
    fieldPrefix: 'learningExecution',
    mainState: normalizeLearningExecution(input.mainBundle?.learningExecutionState ?? null),
    browserState: normalizeLearningExecution(input.browserBundle?.learningExecutionState ?? null),
    comparedFields,
    divergentFields,
  })
  pushDiff({
    layer: 'affective-residue',
    fieldPrefix: 'affectiveResidue',
    mainState: normalizeAffectiveResidue(input.mainBundle?.affectiveResidue ?? null),
    browserState: normalizeAffectiveResidue(input.browserBundle?.affectiveResidue ?? null),
    comparedFields,
    divergentFields,
  })
  pushDiff({
    layer: 'latency-policy',
    fieldPrefix: 'latencyPolicy',
    mainState: normalizeLatencyPolicy(input.mainBundle?.recallLatencyPolicy ?? null),
    browserState: normalizeLatencyPolicy(input.browserBundle?.recallLatencyPolicy ?? null),
    comparedFields,
    divergentFields,
  })
  pushDiff({
    layer: 'resolution-ledger',
    fieldPrefix: 'resolutionLedger',
    mainState: normalizeResolutionLedger(input.mainResolutionLedger ?? null),
    browserState: normalizeResolutionLedger(input.browserResolutionLedger ?? null),
    comparedFields,
    divergentFields,
  })
  pushDiff({
    layer: 'situation-candidates',
    fieldPrefix: 'situationCandidates',
    mainState: normalizeSituationCandidates(input.mainMemorySituationCandidates ?? null),
    browserState: normalizeSituationCandidates(input.browserMemorySituationCandidates ?? null),
    comparedFields,
    divergentFields,
  })
  pushDiff({
    layer: 'claim-evidence',
    fieldPrefix: 'claimEvidence',
    mainState: normalizeClaimEvidence(input.mainBundle ?? null),
    browserState: normalizeClaimEvidence(input.browserBundle ?? null),
    comparedFields,
    divergentFields,
  })
  pushDiff({
    layer: 'learning-causal-chain',
    fieldPrefix: 'learningCausalChain',
    mainState: normalizeLearningCausalChain(input.mainBundle?.learningExecutionState ?? null),
    browserState: normalizeLearningCausalChain(input.browserBundle?.learningExecutionState ?? null),
    comparedFields,
    divergentFields,
  })
  pushDiff({
    layer: 'learning-causal-chain',
    fieldPrefix: 'learningArtifacts',
    mainState: normalizeLearningArtifacts(input.mainLearningArtifacts ?? null),
    browserState: normalizeLearningArtifacts(input.browserLearningArtifacts ?? null),
    comparedFields,
    divergentFields,
  })
  pushDiff({
    layer: 'learning-causal-chain',
    fieldPrefix: 'tracePointer',
    mainState: normalizeTracePointer(input.mainTracePointer ?? null),
    browserState: normalizeTracePointer(input.browserTracePointer ?? null),
    comparedFields,
    divergentFields,
  })

  const divergentLayers = [...new Set(divergentFields.map(item => item.layer))]
  const firstDivergentLayer = divergentLayers[0] ?? null
  const passed = divergentFields.length === 0

  return {
    version: 'browser-main-parity-v1',
    passed,
    comparedFieldCount: comparedFields.length,
    divergentFieldCount: divergentFields.length,
    divergentLayers,
    firstDivergentLayer,
    comparedFields,
    divergentFields,
    summary: passed
      ? 'Main runtime and browser fallback stayed aligned across shared reducer surfaces.'
      : `Parity diverged first at ${firstDivergentLayer ?? 'unknown'} across ${divergentFields.length} field(s).`,
  } satisfies AlicizationBrowserMainParitySummary
}
