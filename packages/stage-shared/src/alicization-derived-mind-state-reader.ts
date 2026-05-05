import type {
  AlicizationDerivedMindStateBundle,
} from './alicization-transport-contracts'

function asObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

export function readHostPersonModelFromDerivedMindStateBundle(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return bundle?.hostPersonModel ?? null
}

export function readPersonStateProjectionFromDerivedMindStateBundle<T extends Record<string, unknown>>(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return asObject(bundle?.personStateProjection) as T | null
}

export function readKnowledgeEvidenceFromDerivedMindStateBundle(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return bundle?.knowledgeEvidence ?? null
}

export function readClaimEvidenceGraphsFromDerivedMindStateBundle(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return bundle?.claimEvidenceGraphs ?? null
}

export function readSelfEvolutionFromDerivedMindStateBundle(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return bundle?.selfEvolution ?? null
}

export function readAffectiveResidueFromDerivedMindStateBundle(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return bundle?.affectiveResidue ?? null
}

export function readLearningExecutionStateFromDerivedMindStateBundle(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return bundle?.learningExecutionState ?? null
}

export function readRecallLatencyPolicyFromDerivedMindStateBundle(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return bundle?.recallLatencyPolicy ?? null
}

export function readRecollectionPlanFromDerivedMindStateBundle<T extends Record<string, unknown>>(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return asObject(bundle?.recollectionPlan) as T | null
}

export function readRecollectionSpeechPlanFromDerivedMindStateBundle<T extends Record<string, unknown>>(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return asObject(bundle?.recollectionSpeechPlan) as T | null
}

export function readMemoryDeliberationFromDerivedMindStateBundle<T extends Record<string, unknown>>(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return asObject(bundle?.memoryDeliberation) as T | null
}

export function readDialogueRhythmFromDerivedMindStateBundle(
  bundle: AlicizationDerivedMindStateBundle | null | undefined,
) {
  return asObject(bundle?.dialogueRhythm) as {
    activeClosenessContext?: string | null
    activeClosenessRung?: string | null
    relationshipDoctrine?: string | null
    burdenLine?: string | null
    trustMeaning?: string | null
    stabilitySignal?: string | null
  } | null
}
