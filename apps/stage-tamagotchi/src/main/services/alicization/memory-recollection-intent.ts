import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationAnswerCompilerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueTurnEncounterSnapshot,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationEmotionalKernelSnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryRecollectionAgendaSnapshot,
  AlicizationMemoryRecollectionIntentSnapshot,
  AlicizationMemoryRecollectionTemporalFocus,
  AlicizationMotiveEngineSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReplyDeliberationSnapshot,
} from '../../../shared/eventa'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

interface AlicizationSceneAttachmentContext {
  cueSummary?: string | null
  appName?: string | null
  processName?: string | null
  targetTitle?: string | null
  scenario?: string | null
  workloadKind?: string | null
  contentKind?: string | null
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function tokenizeSceneResonanceCues(raw: unknown) {
  const normalized = sanitizeText(raw, 220).toLowerCase()
  if (!normalized)
    return []

  const asciiTokens = normalized
    .split(/[^a-z0-9]+/u)
    .map(token => token.trim())
    .filter(token => token.length >= 4)
  const cjkTokens: string[] = []
  for (const run of normalized.match(/[\u4E00-\u9FFF]{2,}/gu) ?? []) {
    for (let size = Math.min(4, run.length); size >= 2; size--) {
      for (let index = 0; index + size <= run.length; index++)
        cjkTokens.push(run.slice(index, index + size))
    }
  }

  return uniqueList([
    ...asciiTokens,
    ...cjkTokens,
  ], 12)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function buildSceneQueryHints(sceneContext: AlicizationSceneAttachmentContext | null | undefined, maxItems = 5) {
  if (!sceneContext)
    return []

  return uniqueList([
    sceneContext.cueSummary,
    sceneContext.targetTitle,
    sceneContext.appName,
    sceneContext.processName,
    sceneContext.scenario ? `scene:${sceneContext.scenario}` : null,
    sceneContext.workloadKind ? `workload:${sceneContext.workloadKind}` : null,
    sceneContext.contentKind ? `content:${sceneContext.contentKind}` : null,
  ], maxItems)
}

function buildAffectiveResidueQueryHints(affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null, maxItems = 5) {
  if (!affectiveResidue)
    return []

  return uniqueList([
    affectiveResidue.dominantResidueKind ? `affect:${affectiveResidue.dominantResidueKind}` : null,
    affectiveResidue.relationshipCadence?.cadenceMode ? `cadence:${affectiveResidue.relationshipCadence.cadenceMode}` : null,
    affectiveResidue.relationshipCadence?.distancePosture ? `distance:${affectiveResidue.relationshipCadence.distancePosture}` : null,
    affectiveResidue.summary,
    affectiveResidue.relationshipCadence?.summary,
    affectiveResidue.residues?.[0]?.summary,
  ], maxItems)
}

function hasStrongAffectiveResidueCarry(affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null) {
  if (!affectiveResidue)
    return false

  return (affectiveResidue.dominantResidueKind === 'rest-protective'
    || affectiveResidue.dominantResidueKind === 'afterglow'
    || affectiveResidue.dominantResidueKind === 'repair')
  && (
    (affectiveResidue.relationshipCadence?.afterglowCarry ?? 0) >= 0.18
    || (affectiveResidue.relationshipCadence?.fatigueGuard ?? 0) >= 0.42
    || affectiveResidue.relationshipCadence?.shouldProtectRest === true
    || affectiveResidue.relationshipCadence?.shouldDelayWarmth === true
  )
}

function buildLongHorizonRecallBias(input: {
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
}) {
  const memory = input.longHorizonMemory ?? null
  const rememberedBoundary = sanitizeText(memory?.rememberedConstraintSummary, 220)
  const rememberedPreference = sanitizeText(memory?.rememberedPreferenceSummary, 220)
  const rememberedPlan = sanitizeText(memory?.rememberedPlanSummary, 220)
  const dominantCue = sanitizeText(memory?.dominantCueSummary, 220)

  return {
    relationship: clamp01((rememberedBoundary ? 0.1 : 0) + (rememberedPreference ? 0.04 : 0)),
    procedural: clamp01((rememberedPlan ? 0.12 : 0) + (dominantCue ? 0.04 : 0)),
    autobiographical: clamp01((dominantCue ? 0.04 : 0) + (rememberedPreference ? 0.04 : 0)),
    queryHints: uniqueList([
      rememberedBoundary,
      rememberedPreference,
      rememberedPlan,
      dominantCue,
    ], 4),
  }
}

function buildSceneMemoryResonanceBias(input: {
  sceneContext?: AlicizationSceneAttachmentContext | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
}) {
  const sceneQueryHints = buildSceneQueryHints(input.sceneContext ?? null, 6)
  const sceneText = sanitizeText([
    input.sceneContext?.cueSummary,
    input.sceneContext?.targetTitle,
    input.sceneContext?.appName,
    input.sceneContext?.processName,
    input.dialogueWorldThread?.activeThread,
    input.conversationState?.jointThread,
    ...(input.dialogueWorldThread?.recallKeys ?? []),
    ...(input.conversationState?.memoryQueryHints ?? []),
  ].filter(Boolean).join(' '), 520).toLowerCase()

  const rememberedBoundary = sanitizeText(input.longHorizonMemory?.rememberedConstraintSummary, 220)
  const rememberedPreference = sanitizeText(input.longHorizonMemory?.rememberedPreferenceSummary, 220)
  const rememberedPlan = sanitizeText(input.longHorizonMemory?.rememberedPlanSummary, 220)
  const dominantCue = sanitizeText(input.longHorizonMemory?.dominantCueSummary, 220)
  const sceneCueTokens = tokenizeSceneResonanceCues(sceneText)

  const relationshipThreadMatch = [
    rememberedBoundary,
    rememberedPreference,
  ].some((item) => {
    const normalized = sanitizeText(item, 160).toLowerCase()
    if (normalized.length >= 8 && sceneText.includes(normalized.slice(0, Math.min(48, normalized.length))))
      return true

    const memoryCueTokens = tokenizeSceneResonanceCues(normalized)
    return memoryCueTokens.length >= 2
      ? memoryCueTokens.some(token => sceneCueTokens.includes(token))
      : false
  })

  const proceduralThreadMatch = [
    rememberedPlan,
    dominantCue,
  ].some((item) => {
    const normalized = sanitizeText(item, 160).toLowerCase()
    if (normalized.length >= 8 && sceneText.includes(normalized.slice(0, Math.min(48, normalized.length))))
      return true

    const memoryCueTokens = tokenizeSceneResonanceCues(normalized)
    return memoryCueTokens.length >= 2
      ? memoryCueTokens.some(token => sceneCueTokens.includes(token))
      : false
  })

  const sceneFeltFamiliar = sceneQueryHints.length >= 2 && (relationshipThreadMatch || proceduralThreadMatch)

  return {
    relationship: clamp01(relationshipThreadMatch ? 0.18 : 0),
    autobiographical: clamp01(relationshipThreadMatch ? 0.1 : 0),
    procedural: clamp01(proceduralThreadMatch ? 0.08 : 0),
    sceneFeelsRemembered: sceneFeltFamiliar,
    queryHints: sceneFeltFamiliar
      ? uniqueList([
          rememberedBoundary,
          rememberedPreference,
          rememberedPlan,
          dominantCue,
          ...sceneQueryHints,
        ], 6)
      : [],
  }
}

function pickProceduralWeight(input: {
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
}) {
  let score = 0
  if (input.conversationState?.memoryMode === 'task-thread')
    score += 0.34
  if (input.dialogueWorldThread?.memoryMode === 'task-thread')
    score += 0.22
  if (input.answerCompiler?.answerSubject === 'task-knot')
    score += 0.14
  return clamp01(score)
}

function pickConversationHistoryWeight(input: {
  dialogueEncounter?: AlicizationDialogueTurnEncounterSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
}) {
  let score = 0
  if (input.dialogueEncounter?.dialogueFirst)
    score += 0.08
  if (input.conversationState?.memoryMode === 'dialogue-carry')
    score += 0.14
  return clamp01(score)
}

function pickRelationshipHistoryWeight(input: {
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
}) {
  let score = 0
  if (input.answerCompiler?.answerSubject === 'relationship')
    score += 0.28
  if (input.replyDeliberation?.selectedMotive === 'attune' || input.replyDeliberation?.selectedMotive === 'care')
    score += 0.12
  if (input.privateThought?.stance === 'care' || input.privateThought?.stance === 'accompany')
    score += 0.08
  if (input.longHorizonMemory?.rememberedConstraintSummary)
    score += 0.06
  return clamp01(score)
}

function pickAutobiographicalWeight(input: {
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
}) {
  let score = 0
  if (input.answerCompiler?.answerSubject === 'alicization-self')
    score += 0.32
  if (input.privateThought?.emotionalTension === 'late-night-drain' || input.privateThought?.emotionalTension === 'tense-debug')
    score += 0.08
  if (input.longHorizonMemory?.rememberedPlanSummary || input.longHorizonMemory?.dominantCueSummary)
    score += 0.06
  if (input.longHorizonMemory?.rememberedPreferenceSummary)
    score += 0.04
  if (input.affectiveResidue?.dominantResidueKind === 'rest-protective' || input.affectiveResidue?.dominantResidueKind === 'afterglow')
    score += 0.08
  if (input.affectiveResidue?.relationshipCadence?.shouldProtectRest || input.affectiveResidue?.relationshipCadence?.shouldDelayWarmth)
    score += 0.06
  return clamp01(score)
}

function pickMoodCongruentBoost(input: {
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
}) {
  let score = 0
  if (input.privateThought?.emotionalTension === 'late-night-drain' || input.privateThought?.emotionalTension === 'tense-debug')
    score += 0.12
  if (input.replyDeliberation?.selectedMotive === 'attune' || input.replyDeliberation?.selectedMotive === 'care')
    score += 0.08
  if (input.longHorizonMemory?.dominantCueSummary)
    score += 0.04
  if (input.affectiveResidue?.dominantResidueKind === 'rest-protective')
    score += 0.12
  else if (input.affectiveResidue?.dominantResidueKind === 'afterglow' || input.affectiveResidue?.dominantResidueKind === 'repair')
    score += 0.08
  if (input.emotionalKernel?.memoryRecallMode === 'self-continuity')
    score += 0.12
  else if (input.emotionalKernel?.memoryRecallMode === 'low-pressure-presence')
    score += 0.08
  if (input.emotionalKernel?.embodimentTone === 'nearby-soft')
    score += 0.08
  else if (input.emotionalKernel?.embodimentTone === 'measured-return')
    score += 0.06
  score += clamp01(
    (input.affectiveResidue?.relationshipCadence?.afterglowCarry ?? 0) * 0.22
    + (input.affectiveResidue?.relationshipCadence?.fatigueGuard ?? 0) * 0.18
    + (input.affectiveResidue?.relationshipCadence?.shouldProtectRest ? 0.08 : 0)
    + (input.affectiveResidue?.relationshipCadence?.shouldDelayWarmth ? 0.06 : 0),
  )
  return clamp01(score)
}

function hasInwardSelfContinuityEmbodimentTone(
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null,
) {
  return emotionalKernel?.embodimentTone === 'nearby-soft'
    || emotionalKernel?.embodimentTone === 'quiet-companionship'
}

function inferRecollectionWhyNow(input: {
  conversationHistoryWeight: number
  proceduralWeight: number
  relationshipWeight: number
  autobiographicalWeight: number
  moodCongruentBoost: number
  sceneFamiliarity: number
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
}) {
  if (
    input.emotionalKernel?.memoryRecallMode === 'self-continuity'
    && input.emotionalKernel?.initiativeMode === 'hold'
    && hasInwardSelfContinuityEmbodimentTone(input.emotionalKernel ?? null)
  ) {
    return 'recollection:emotional-kernel:self-continuity-hold'
  }
  if (input.proceduralWeight >= Math.max(input.conversationHistoryWeight, input.relationshipWeight, input.autobiographicalWeight))
    return 'recollection:procedure:structured-state'
  if (input.relationshipWeight >= Math.max(input.conversationHistoryWeight, input.autobiographicalWeight))
    return 'recollection:relationship:structured-state'
  if (input.autobiographicalWeight >= input.conversationHistoryWeight) {
    return input.moodCongruentBoost >= 0.18
      ? 'recollection:autobiographical:affective-state'
      : 'recollection:autobiographical:structured-state'
  }
  if (input.conversationHistoryWeight > 0.24)
    return 'recollection:conversation:retrospective-intent'
  if (input.sceneFamiliarity > 0.28)
    return 'recollection:scene:memory-overlap'
  return 'recollection:structured-threshold'
}

function buildCandidateTimeScopes(input: {
  conversationHistoryWeight: number
  proceduralWeight: number
  relationshipWeight: number
  autobiographicalWeight: number
  sceneFamiliarity: number
}): AlicizationMemoryRecollectionAgendaSnapshot['candidateTimeScopes'] {
  const candidates = [
    {
      scope: 'experience-matched' as AlicizationMemoryRecollectionTemporalFocus,
      weight: clamp01(input.proceduralWeight * 0.82 + input.sceneFamiliarity * 0.18),
      rationale: 'time-scope:experience-matched',
    },
    {
      scope: 'cross-session' as AlicizationMemoryRecollectionTemporalFocus,
      weight: clamp01(Math.max(input.conversationHistoryWeight, input.relationshipWeight, input.autobiographicalWeight) * 0.9),
      rationale: 'time-scope:cross-session',
    },
    {
      scope: 'distant' as AlicizationMemoryRecollectionTemporalFocus,
      weight: clamp01((input.relationshipWeight * 0.52) + (input.autobiographicalWeight * 0.58)),
      rationale: 'time-scope:distant',
    },
    {
      scope: 'recent-or-mid' as AlicizationMemoryRecollectionTemporalFocus,
      weight: clamp01(input.conversationHistoryWeight * 0.42 + input.sceneFamiliarity * 0.36 + 0.12),
      rationale: 'time-scope:recent-or-mid',
    },
    {
      scope: 'recent' as AlicizationMemoryRecollectionTemporalFocus,
      weight: clamp01(0.16 + input.sceneFamiliarity * 0.44),
      rationale: 'time-scope:recent',
    },
  ]

  return candidates
    .filter(item => item.weight >= 0.16)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 4)
}

function buildCandidateEraFacets(input: {
  proceduralWeight: number
  relationshipWeight: number
  autobiographicalWeight: number
  conversationHistoryWeight: number
  sceneFamiliarity: number
}): AlicizationMemoryRecollectionAgendaSnapshot['candidateEraFacets'] {
  const candidates = [
    {
      facet: 'task-era' as const,
      weight: clamp01(input.proceduralWeight * 0.92),
      rationale: 'era-facet:task-era',
    },
    {
      facet: 'relationship-era' as const,
      weight: clamp01(input.relationshipWeight * 0.94),
      rationale: 'era-facet:relationship-era',
    },
    {
      facet: 'self-era' as const,
      weight: clamp01(input.autobiographicalWeight * 0.88 + input.sceneFamiliarity * 0.1),
      rationale: 'era-facet:self-era',
    },
    {
      facet: 'phase' as const,
      weight: clamp01(Math.max(input.autobiographicalWeight, input.conversationHistoryWeight) * 0.62 + input.sceneFamiliarity * 0.14),
      rationale: 'era-facet:phase',
    },
    {
      facet: 'window' as const,
      weight: clamp01(input.conversationHistoryWeight * 0.48 + input.sceneFamiliarity * 0.3 + 0.1),
      rationale: 'era-facet:window',
    },
  ]

  return candidates
    .filter(item => item.weight >= 0.14)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 4)
}

function buildCandidateProcedureLines(input: {
  sceneQueryHints: string[]
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
}) {
  return uniqueList([
    input.conversationState?.activeProject,
    input.dialogueWorldThread?.activeThread,
    input.goalStack?.alicizationGoals?.[0]?.label,
    input.motiveEngine?.backgroundAgendas?.[0]?.summary,
    input.longHorizonMemory?.rememberedPlanSummary,
    input.longHorizonMemory?.dominantCueSummary,
    ...input.sceneQueryHints,
    ...(input.dialogueWorldThread?.recallKeys ?? []),
    ...(input.conversationState?.memoryQueryHints ?? []),
  ], 6)
}

function buildRecollectionAgenda(input: {
  conversationHistoryWeight: number
  proceduralWeight: number
  relationshipWeight: number
  autobiographicalWeight: number
  moodCongruentBoost: number
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  sceneQueryHints: string[]
  sceneContext?: AlicizationSceneAttachmentContext | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
}): AlicizationMemoryRecollectionAgendaSnapshot {
  const sceneFamiliarity = clamp01(
    (input.sceneQueryHints.length > 0 ? 0.16 : 0)
    + (input.sceneContext?.scenario ? 0.14 : 0)
    + (input.sceneContext?.workloadKind ? 0.12 : 0)
    + (input.sceneContext?.contentKind ? 0.08 : 0)
    + (input.longHorizonMemory?.dominantCueSummary ? 0.12 : 0)
    + (input.proceduralWeight * 0.22),
  )
  const goalSimilarity = clamp01(
    input.proceduralWeight * 0.76
    + (input.dialogueWorldThread?.activeThread ? 0.1 : 0)
    + (input.conversationState?.activeProject ? 0.08 : 0)
    + (input.goalStack?.alicizationGoals?.[0]?.label ? 0.06 : 0),
  )
  const relationshipNeed = clamp01(input.relationshipWeight)
  const affectivePull = clamp01(Math.max(
    input.moodCongruentBoost,
    input.relationshipWeight * 0.34,
    input.autobiographicalWeight * 0.42,
  ))
  const candidateProcedureLines = buildCandidateProcedureLines({
    sceneQueryHints: input.sceneQueryHints,
    dialogueWorldThread: input.dialogueWorldThread,
    conversationState: input.conversationState,
    goalStack: input.goalStack,
    longHorizonMemory: input.longHorizonMemory,
    motiveEngine: input.motiveEngine,
  })
  const candidateTimeScopes = buildCandidateTimeScopes({
    conversationHistoryWeight: input.conversationHistoryWeight,
    proceduralWeight: input.proceduralWeight,
    relationshipWeight: input.relationshipWeight,
    autobiographicalWeight: input.autobiographicalWeight,
    sceneFamiliarity,
  })
  const candidateEraFacets = buildCandidateEraFacets({
    proceduralWeight: input.proceduralWeight,
    relationshipWeight: input.relationshipWeight,
    autobiographicalWeight: input.autobiographicalWeight,
    conversationHistoryWeight: input.conversationHistoryWeight,
    sceneFamiliarity,
  })
  const uncertaintyTolerance = input.relationshipWeight >= 0.48 || input.conversationHistoryWeight >= 0.42
    ? 'low'
    : input.proceduralWeight >= 0.52 || input.autobiographicalWeight >= 0.44
      ? 'medium'
      : 'high'

  return {
    whyRecallNow: inferRecollectionWhyNow({
      conversationHistoryWeight: input.conversationHistoryWeight,
      proceduralWeight: input.proceduralWeight,
      relationshipWeight: input.relationshipWeight,
      autobiographicalWeight: input.autobiographicalWeight,
      moodCongruentBoost: input.moodCongruentBoost,
      sceneFamiliarity,
      emotionalKernel: input.emotionalKernel ?? null,
    }),
    goalSimilarity,
    relationshipNeed,
    affectivePull,
    sceneFamiliarity,
    candidateTimeScopes,
    candidateEraFacets,
    candidateProcedureLines,
    uncertaintyTolerance,
  }
}

export function buildMemoryRecollectionIntent(input: {
  userText?: string | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounterSnapshot | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  goalStack?: AlicizationGoalStackSnapshot | null
  motiveEngine?: AlicizationMotiveEngineSnapshot | null
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  sceneContext?: AlicizationSceneAttachmentContext | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
}): AlicizationMemoryRecollectionIntentSnapshot | null {
  const sceneQueryHints = buildSceneQueryHints(input.sceneContext ?? null)
  const affectiveResidueQueryHints = buildAffectiveResidueQueryHints(input.affectiveResidue ?? null)
  const conversationHistoryWeight = pickConversationHistoryWeight({
    dialogueEncounter: input.dialogueEncounter ?? null,
    conversationState: input.conversationState ?? null,
  })
  const relationshipWeight = pickRelationshipHistoryWeight({
    answerCompiler: input.answerCompiler ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    privateThought: input.privateThought ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
  })
  const autobiographicalWeight = pickAutobiographicalWeight({
    answerCompiler: input.answerCompiler ?? null,
    privateThought: input.privateThought ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    affectiveResidue: input.affectiveResidue ?? null,
  })
  const moodCongruentBoost = pickMoodCongruentBoost({
    privateThought: input.privateThought ?? null,
    replyDeliberation: input.replyDeliberation ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    affectiveResidue: input.affectiveResidue ?? null,
    emotionalKernel: input.emotionalKernel ?? null,
  })
  const proceduralWeight = pickProceduralWeight({
    dialogueWorldThread: input.dialogueWorldThread ?? null,
    conversationState: input.conversationState ?? null,
    answerCompiler: input.answerCompiler ?? null,
  })
  const longHorizonRecallBias = buildLongHorizonRecallBias({
    longHorizonMemory: input.longHorizonMemory ?? null,
  })
  const sceneMemoryResonanceBias = buildSceneMemoryResonanceBias({
    sceneContext: input.sceneContext ?? null,
    dialogueWorldThread: input.dialogueWorldThread ?? null,
    conversationState: input.conversationState ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
  })

  const boostedRelationshipWeight = clamp01(relationshipWeight + (
    relationshipWeight > 0
      ? moodCongruentBoost * 0.32
      : 0
  ) + longHorizonRecallBias.relationship + sceneMemoryResonanceBias.relationship
  + (input.emotionalKernel?.memoryRecallMode === 'self-continuity' ? 0.16 : 0)
  + (hasInwardSelfContinuityEmbodimentTone(input.emotionalKernel ?? null) ? 0.06 : 0))
  const boostedAutobiographicalWeight = clamp01(autobiographicalWeight + moodCongruentBoost * 0.42 + longHorizonRecallBias.autobiographical + sceneMemoryResonanceBias.autobiographical
    + (input.emotionalKernel?.memoryRecallMode === 'self-continuity' ? 0.22 : 0)
    + (input.emotionalKernel?.initiativeMode === 'hold' ? 0.08 : 0)
    + (hasInwardSelfContinuityEmbodimentTone(input.emotionalKernel ?? null) ? 0.06 : 0))
  const boostedProceduralWeight = clamp01(proceduralWeight + longHorizonRecallBias.procedural + sceneMemoryResonanceBias.procedural)
  const recollectionAgenda = buildRecollectionAgenda({
    conversationHistoryWeight,
    proceduralWeight: boostedProceduralWeight,
    relationshipWeight: boostedRelationshipWeight,
    autobiographicalWeight: boostedAutobiographicalWeight,
    moodCongruentBoost,
    emotionalKernel: input.emotionalKernel ?? null,
    sceneQueryHints,
    sceneContext: input.sceneContext ?? null,
    dialogueWorldThread: input.dialogueWorldThread ?? null,
    conversationState: input.conversationState ?? null,
    goalStack: input.goalStack ?? null,
    longHorizonMemory: input.longHorizonMemory ?? null,
    motiveEngine: input.motiveEngine ?? null,
  })

  if (Math.max(conversationHistoryWeight, boostedRelationshipWeight, boostedAutobiographicalWeight, boostedProceduralWeight) < 0.2)
    return null

  if (boostedProceduralWeight >= Math.max(conversationHistoryWeight, boostedRelationshipWeight, boostedAutobiographicalWeight)) {
    return {
      mode: boostedProceduralWeight >= 0.54 ? 'execution-procedure' : 'experience-pattern',
      temporalFocus: 'experience-matched',
      searchEpisodes: true,
      searchProceduralExperience: true,
      queryHints: uniqueList([
        input.conversationState?.activeProject,
        input.dialogueWorldThread?.activeThread,
        ...longHorizonRecallBias.queryHints,
        ...sceneQueryHints,
        input.goalStack?.alicizationGoals?.[0]?.label,
        input.motiveEngine?.backgroundAgendas?.[0]?.summary,
        ...(input.dialogueWorldThread?.recallKeys ?? []),
      ], 8),
      rationale: 'recollection:execution-procedure:structured-state',
      confidence: boostedProceduralWeight,
      recollectionAgenda,
    }
  }

  if (boostedRelationshipWeight >= Math.max(conversationHistoryWeight, boostedAutobiographicalWeight)) {
    return {
      mode: 'relationship-history',
      temporalFocus: 'cross-session',
      searchEpisodes: true,
      searchProceduralExperience: false,
      queryHints: uniqueList([
        input.dialogueWorldThread?.activeThread,
        input.conversationState?.jointThread,
        input.conversationState?.hostMove,
        ...longHorizonRecallBias.queryHints,
        ...sceneMemoryResonanceBias.queryHints,
        ...sceneQueryHints,
        input.privateThought?.emotionalTension ? `mood:${input.privateThought.emotionalTension}` : null,
        ...(input.conversationState?.memoryQueryHints ?? []),
      ], 8),
      rationale: sceneMemoryResonanceBias.sceneFeelsRemembered
        ? 'recollection:relationship-history:scene-overlap'
        : 'recollection:relationship-history:structured-state',
      confidence: boostedRelationshipWeight,
      recollectionAgenda,
    }
  }

  if (boostedAutobiographicalWeight >= conversationHistoryWeight) {
    const affectiveResidueCarry = hasStrongAffectiveResidueCarry(input.affectiveResidue ?? null)
    return {
      mode: 'autobiographical-history',
      temporalFocus: 'cross-session',
      searchEpisodes: true,
      searchProceduralExperience: false,
      queryHints: uniqueList([
        input.dialogueWorldThread?.activeThread,
        input.longHorizonMemory?.dominantCueSummary,
        input.longHorizonMemory?.rememberedPlanSummary,
        ...affectiveResidueQueryHints,
        ...sceneMemoryResonanceBias.queryHints,
        ...sceneQueryHints,
        input.privateThought?.emotionalTension ? `mood:${input.privateThought.emotionalTension}` : null,
        ...(input.dialogueWorldThread?.recallKeys ?? []),
      ], 8),
      rationale: affectiveResidueCarry
        ? 'recollection:autobiographical-history:affective-residue'
        : sceneMemoryResonanceBias.sceneFeelsRemembered
          ? 'recollection:autobiographical-history:scene-overlap'
          : 'recollection:autobiographical-history:structured-state',
      confidence: boostedAutobiographicalWeight,
      recollectionAgenda,
    }
  }

  return {
    mode: 'conversation-history',
    temporalFocus: 'cross-session',
    searchEpisodes: true,
    searchProceduralExperience: false,
    queryHints: uniqueList([
      input.conversationState?.jointThread,
      input.conversationState?.hostMove,
      ...sceneQueryHints,
      ...(input.dialogueWorldThread?.recallKeys ?? []),
      ...(input.conversationState?.memoryQueryHints ?? []),
    ], 8),
    rationale: 'recollection:conversation-history:retrospective-intent',
    confidence: conversationHistoryWeight,
    recollectionAgenda,
  }
}
