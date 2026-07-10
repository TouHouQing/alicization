import type { AlicizationClaimEvidenceGraph } from './alicization-claim-evidence-graph'
import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationDerivedMindStateBundle,
  AlicizationEmbodimentContinuityLedgerSnapshot,
  AlicizationEmotionalTransitionLedgerSnapshot,
  AlicizationHostPersonModelSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationRecallLatencyPolicySnapshot,
  AlicizationRecollectionPlan,
  AlicizationRecollectionSpeechPlan,
  AlicizationSelfEvolutionKernelSnapshot,
} from './alicization-transport-contracts'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function buildDialogueRhythm(input: {
  personStateProjection?: Record<string, unknown> | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
}) {
  const projection = input.personStateProjection ?? null
  const selfEvolution = input.selfEvolution ?? null
  const affectiveResidue = input.affectiveResidue ?? null
  const residues = Array.isArray(affectiveResidue?.residues)
    ? affectiveResidue.residues
    : []
  if (!projection && !selfEvolution && !affectiveResidue)
    return null
  return {
    activeClosenessContext: sanitizeText(projection?.activeClosenessContext, 64) || null,
    activeClosenessRung: sanitizeText(projection?.activeClosenessRung, 64) || null,
    relationshipDoctrine: selfEvolution?.relationshipDoctrine ?? null,
    burdenLine: selfEvolution?.burdenLine ?? residues.find(item => item.kind === 'burden')?.summary ?? null,
    trustMeaning: selfEvolution?.trustMeaning ?? residues.find(item => item.kind === 'trust')?.summary ?? null,
    stabilitySignal: sanitizeText(
      selfEvolution?.latestInflection
      ?? affectiveResidue?.relationshipCadence?.summary
      ?? projection?.openingGuidance
      ?? projection?.trustRationale
      ?? '',
      180,
    ) || null,
  }
}

function summarizeBundle(input: {
  source: AlicizationDerivedMindStateBundle['source']
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  activeSelfRevision?: AlicizationDerivedMindStateBundle['activeSelfRevision']
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance']
  sameHerCausalityRepairPressure?: AlicizationDerivedMindStateBundle['sameHerCausalityRepairPressure']
  emotionalTransitionLedger?: AlicizationEmotionalTransitionLedgerSnapshot | null
  embodimentContinuityLedger?: AlicizationEmbodimentContinuityLedgerSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
  recallLatencyPolicy?: AlicizationRecallLatencyPolicySnapshot | null
  recollectionPlan?: AlicizationRecollectionPlan | null
  recollectionSpeechPlan?: AlicizationRecollectionSpeechPlan | null
  memoryDeliberation?: Record<string, unknown> | null
}) {
  return [
    `source=${input.source}`,
    input.activeSelfRevision?.patchId ? `self_revision=${sanitizeText(input.activeSelfRevision.patchId, 120)}` : '',
    input.activeContinuityGovernance?.mode ? `continuity=${input.activeContinuityGovernance.mode}` : '',
    input.activeContinuityGovernance?.candidateId ? `anchor=${sanitizeText(input.activeContinuityGovernance.candidateId, 120)}` : '',
    input.sameHerCausalityRepairPressure?.lanes?.length
      ? `continuity_causality_repair=${input.sameHerCausalityRepairPressure.lanes.map(item => item.lane).join(',')}`
      : '',
    input.emotionalTransitionLedger?.transitionKind ? `emotion_transition=${input.emotionalTransitionLedger.transitionKind}` : '',
    input.emotionalTransitionLedger?.selfRevisionCandidate.shouldPropose
      ? `self_revision_candidate=${input.emotionalTransitionLedger.selfRevisionCandidate.domain}`
      : '',
    input.embodimentContinuityLedger?.continuityPhase ? `embodiment_phase=${input.embodimentContinuityLedger.continuityPhase}` : '',
    input.embodimentContinuityLedger?.selfRevisionCandidate.shouldPropose
      ? `embodiment_self_revision_candidate=${input.embodimentContinuityLedger.selfRevisionCandidate.domain}`
      : '',
    input.selfEvolution?.dominantTrajectory ? `trajectory=${sanitizeText(input.selfEvolution.dominantTrajectory, 120)}` : '',
    input.affectiveResidue?.dominantResidueKind ? `residue=${input.affectiveResidue.dominantResidueKind}` : '',
    input.learningExecutionState?.nextLearningAction ? `learning=${sanitizeText(input.learningExecutionState.nextLearningAction, 64)}` : '',
    input.recallLatencyPolicy?.recallAction ? `recall=${input.recallLatencyPolicy.recallAction}` : '',
    input.hostPersonModel?.trustLadder.stage ? `trust=${input.hostPersonModel.trustLadder.stage}` : '',
    input.recollectionPlan?.opening ? `recollection_center=${sanitizeText(input.recollectionPlan.opening, 120)}` : '',
    input.recollectionSpeechPlan?.surfaceMode ? `surface=${input.recollectionSpeechPlan.surfaceMode}` : '',
    sanitizeText(input.memoryDeliberation?.surfacePolicy, 96)
      ? `deliberation=${sanitizeText(input.memoryDeliberation?.surfacePolicy, 96)}`
      : '',
  ].filter(Boolean).join(' | ')
}

export function buildDerivedMindStateBundle(input: {
  source: AlicizationDerivedMindStateBundle['source']
  producedAt: number
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  personStateProjection?: Record<string, unknown> | null
  knowledgeEvidence?: {
    validationCount: number
    contradictionCount: number
    stronglyValidatedProcedureCount: number
    contradictionHeavyFactCount: number
  } | null
  claimEvidenceGraphs?: AlicizationClaimEvidenceGraph[] | null
  activeSelfRevision?: AlicizationDerivedMindStateBundle['activeSelfRevision']
  activeContinuityGovernance?: AlicizationDerivedMindStateBundle['activeContinuityGovernance']
  sameHerCausalityRepairPressure?: AlicizationDerivedMindStateBundle['sameHerCausalityRepairPressure']
  emotionalTransitionLedger?: AlicizationEmotionalTransitionLedgerSnapshot | null
  embodimentContinuityLedger?: AlicizationEmbodimentContinuityLedgerSnapshot | null
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  learningExecutionState?: AlicizationLearningExecutionStateSnapshot | null
  recallLatencyPolicy?: AlicizationRecallLatencyPolicySnapshot | null
  recollectionIntent?: Record<string, unknown> | null
  recollectionPlan?: AlicizationRecollectionPlan | null
  recollectionSpeechPlan?: AlicizationRecollectionSpeechPlan | null
  memoryDeliberation?: Record<string, unknown> | null
}): AlicizationDerivedMindStateBundle {
  return {
    version: 'derived-mind-state-bundle-v1',
    source: input.source,
    producedAt: input.producedAt,
    hostPersonModel: input.hostPersonModel ?? null,
    personStateProjection: input.personStateProjection ?? null,
    knowledgeEvidence: input.knowledgeEvidence ?? null,
    claimEvidenceGraphs: input.claimEvidenceGraphs ?? null,
    activeSelfRevision: input.activeSelfRevision ?? null,
    activeContinuityGovernance: input.activeContinuityGovernance ?? null,
    sameHerCausalityRepairPressure: input.sameHerCausalityRepairPressure ?? null,
    emotionalTransitionLedger: input.emotionalTransitionLedger ?? null,
    embodimentContinuityLedger: input.embodimentContinuityLedger ?? null,
    selfEvolution: input.selfEvolution ?? null,
    affectiveResidue: input.affectiveResidue ?? null,
    learningExecutionState: input.learningExecutionState ?? null,
    recallLatencyPolicy: input.recallLatencyPolicy ?? null,
    recollectionIntent: input.recollectionIntent ?? null,
    recollectionPlan: input.recollectionPlan as unknown as Record<string, unknown> | null,
    recollectionSpeechPlan: input.recollectionSpeechPlan as unknown as Record<string, unknown> | null,
    memoryDeliberation: input.memoryDeliberation ?? null,
    dialogueRhythm: buildDialogueRhythm({
      personStateProjection: input.personStateProjection ?? null,
      selfEvolution: input.selfEvolution ?? null,
      affectiveResidue: input.affectiveResidue ?? null,
    }),
    summary: summarizeBundle({
      source: input.source,
      hostPersonModel: input.hostPersonModel ?? null,
      activeSelfRevision: input.activeSelfRevision ?? null,
      activeContinuityGovernance: input.activeContinuityGovernance ?? null,
      sameHerCausalityRepairPressure: input.sameHerCausalityRepairPressure ?? null,
      emotionalTransitionLedger: input.emotionalTransitionLedger ?? null,
      embodimentContinuityLedger: input.embodimentContinuityLedger ?? null,
      selfEvolution: input.selfEvolution ?? null,
      affectiveResidue: input.affectiveResidue ?? null,
      learningExecutionState: input.learningExecutionState ?? null,
      recallLatencyPolicy: input.recallLatencyPolicy ?? null,
      recollectionPlan: input.recollectionPlan ?? null,
      recollectionSpeechPlan: input.recollectionSpeechPlan ?? null,
      memoryDeliberation: input.memoryDeliberation ?? null,
    }),
  }
}
