import type {
  AlicizationDerivedMindStateBundle,
  AlicizationHostPersonModelSnapshot,
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
}) {
  const projection = input.personStateProjection ?? null
  const selfEvolution = input.selfEvolution ?? null
  if (!projection && !selfEvolution)
    return null
  return {
    activeClosenessContext: sanitizeText(projection?.activeClosenessContext, 64) || null,
    activeClosenessRung: sanitizeText(projection?.activeClosenessRung, 64) || null,
    relationshipDoctrine: selfEvolution?.relationshipDoctrine ?? null,
    burdenLine: selfEvolution?.burdenLine ?? null,
    trustMeaning: selfEvolution?.trustMeaning ?? null,
    stabilitySignal: sanitizeText(
      selfEvolution?.latestInflection
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
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
  recollectionPlan?: AlicizationRecollectionPlan | null
  recollectionSpeechPlan?: AlicizationRecollectionSpeechPlan | null
  memoryDeliberation?: Record<string, unknown> | null
}) {
  return [
    `source=${input.source}`,
    input.selfEvolution?.dominantTrajectory ? `trajectory=${sanitizeText(input.selfEvolution.dominantTrajectory, 120)}` : '',
    input.hostPersonModel?.trustLadder.stage ? `trust=${input.hostPersonModel.trustLadder.stage}` : '',
    input.recollectionPlan?.opening ? `recollection=${sanitizeText(input.recollectionPlan.opening, 120)}` : '',
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
  selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null
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
    selfEvolution: input.selfEvolution ?? null,
    recollectionIntent: input.recollectionIntent ?? null,
    recollectionPlan: input.recollectionPlan as unknown as Record<string, unknown> | null,
    recollectionSpeechPlan: input.recollectionSpeechPlan as unknown as Record<string, unknown> | null,
    memoryDeliberation: input.memoryDeliberation ?? null,
    dialogueRhythm: buildDialogueRhythm({
      personStateProjection: input.personStateProjection ?? null,
      selfEvolution: input.selfEvolution ?? null,
    }),
    summary: summarizeBundle({
      source: input.source,
      hostPersonModel: input.hostPersonModel ?? null,
      selfEvolution: input.selfEvolution ?? null,
      recollectionPlan: input.recollectionPlan ?? null,
      recollectionSpeechPlan: input.recollectionSpeechPlan ?? null,
      memoryDeliberation: input.memoryDeliberation ?? null,
    }),
  }
}
