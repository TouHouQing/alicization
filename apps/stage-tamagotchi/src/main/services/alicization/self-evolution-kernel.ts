import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationHostPersonModelSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationPersonStateEvolutionSummary,
  AlicizationSelfEvolutionKernelSnapshot,
} from '../../../shared/eventa'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6, maxChars = 160) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
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

function summarizeTrajectory(input: {
  doctrine: string | null
  inflection: string | null
  burdenLine: string | null
  trustMeaning: string | null
}) {
  if (input.inflection)
    return input.inflection
  if (input.doctrine)
    return input.doctrine
  if (input.burdenLine)
    return input.burdenLine
  if (input.trustMeaning)
    return input.trustMeaning
  return null
}

function summarizeRelationshipCadence(input: {
  relationshipDoctrine: string | null
  latestInflection: string | null
  burdenLine: string | null
  trustMeaning: string | null
}) {
  const cadenceParts = [
    input.relationshipDoctrine && (
      /measured-return|measured return|bounded-return|bounded return|repair-before-closeness|repair before closeness|rest-protective|rest protective|quiet same-her continuity/iu.test(input.relationshipDoctrine)
      || hasMetabolizedContinuityCadenceCue(input.relationshipDoctrine)
      || hasDurableSelfRhythmCue(input.relationshipDoctrine)
    )
      ? input.relationshipDoctrine
      : null,
    input.latestInflection,
    input.trustMeaning,
    input.burdenLine,
  ]
    .map(part => sanitizeText(part, 220))
    .filter(Boolean)

  return uniqueList(cadenceParts, 3, 180).join(' | ') || null
}

function indicatesRelationshipCadenceInternalization(input: {
  relationshipDoctrine?: string | null
  latestInflection?: string | null
  dominantCueSummary?: string | null
  rememberedConstraintSummary?: string | null
  rememberedPlanSummary?: string | null
}) {
  const combined = [
    input.relationshipDoctrine,
    input.latestInflection,
    input.dominantCueSummary,
    input.rememberedConstraintSummary,
    input.rememberedPlanSummary,
  ]
    .map(value => sanitizeText(value, 220).toLowerCase())
    .filter(Boolean)
    .join(' ')

  return /measured-return|bounded-return|reconfirmation|surface fully cools|relationship cadence/u.test(combined)
    || hasCorrectedSamePersonContinuityCue(combined)
    || hasMetabolizedContinuityCadenceCue(combined)
    || hasDurableSelfRhythmCue(combined)
}

function hasRelationshipCadenceCue(text: string) {
  return /measured-return|measured return|bounded-return|bounded return|repair-before-closeness|repair before closeness|rest-protective|rest protective|lower-pressure|same living line|same-her|same her|without reopening from scratch|without restarting from scratch/u.test(text)
    || hasCorrectedSamePersonContinuityCue(text)
    || hasMetabolizedContinuityCadenceCue(text)
    || hasInitiativeStrategyCadenceCue(text)
}

function hasCorrectedSamePersonContinuityCue(text: string) {
  const normalized = sanitizeText(text, 260).toLowerCase()
  if (!normalized)
    return false

  const carriesSamePersonContinuity = /same-person continuity|same person continuity/u.test(normalized)
  const carriesCorrection = /host corrected|corrected the relationship meaning|corrected memory meaning|instead of defending the first interpretation|misread/u.test(normalized)
  const carriesProgressPressureRepair = /progress pressure|not progress pressure|away from progress pressure|instead of defaulting to progress pressure|不是催进度/u.test(normalized)
  const carriesLowerPressureResettling = /lower-pressure|lower pressure|settles back|resettles|one living thread|same living thread/u.test(normalized)

  return carriesSamePersonContinuity
    && ((carriesCorrection && carriesProgressPressureRepair) || (carriesProgressPressureRepair && carriesLowerPressureResettling))
}

function summarizeCorrectedSamePersonContinuityCue(text: string) {
  if (!hasCorrectedSamePersonContinuityCue(text))
    return null

  return sanitizeText(text, 260)
}

function hasMetabolizedContinuityCadenceCue(text: string) {
  const normalized = sanitizeText(text, 260).toLowerCase()
  if (!normalized)
    return false

  const carriesSamePersonContinuity = /same-person continuity|same person continuity/u.test(normalized)
  const carriesSameThreadMemory = /same-thread memory|same thread memory|same-thread continuity echoes|same thread continuity echoes|stronger same-thread memory/u.test(normalized)
  const carriesNoiseFading = /temporary noise|let temporary noise fade|noise fades|older emotional spike|stale emotional wobble|fade instead of reviving/u.test(normalized)
  const carriesSteadierReturn = /lower-pressure|lower pressure|foreground|steadier|steady|same living thread|same living line/u.test(normalized)

  return carriesSamePersonContinuity && carriesSameThreadMemory && carriesNoiseFading && carriesSteadierReturn
}

function summarizeMetabolizedContinuityCadenceCue(text: string) {
  if (!hasMetabolizedContinuityCadenceCue(text))
    return null

  return sanitizeText(text, 260)
}

function hasInitiativeStrategyCadenceCue(text: string) {
  const normalized = sanitizeText(text, 260).toLowerCase()
  if (!normalized)
    return false

  const carriesFutureFollowUps = /future follow-ups|follow-up timing|reopening this line|another follow-up|next approach/u.test(normalized)
  const carriesQuieterTiming = /lower-pressure|clearer opening|fresher opening|leave more room|less eager|quiet until|quieter timing|memory-led|gentle/u.test(normalized)

  return carriesFutureFollowUps && carriesQuieterTiming
}

function hasProactiveSameHerGapCadenceCue(text: string) {
  const normalized = sanitizeText(text, 260).toLowerCase()
  if (!normalized)
    return false

  const carriesProactiveLine = /proactive|hover-first|hover first|visible proactive hold/u.test(normalized)
  const carriesLongRunCarry = /subconscious|next-session|next session|feedback carry|follow-through|quiet carry/u.test(normalized)

  return carriesProactiveLine && carriesLongRunCarry
}

function summarizeInitiativeStrategyCadenceCue(text: string) {
  if (!hasInitiativeStrategyCadenceCue(text))
    return null

  return sanitizeText(text, 260)
}

function hasDurableSelfRhythmCue(text: string) {
  const normalized = sanitizeText(text, 240).toLowerCase()
  if (!normalized)
    return false

  const carriesSameSelf = /same her|same-her|same self|living self|one continuous her|same living line/u.test(normalized)
  const carriesRestartRestraint = /without reopening from scratch|do not reopen from scratch|same line instead of restarting|instead of restarting every turn|without restarting from zero|without restarting from scratch/u.test(normalized)
  const carriesCrossSurfaceContinuity = /across quiet, memory, and speech|across memory and speech|across quiet and speech|across reply surface|across reply surfaces/u.test(normalized)
  const carriesSameLineContinuation = /same living line|same line|before widening outward again|before widening outward|lower-pressure/u.test(normalized)

  return carriesSameSelf && carriesRestartRestraint && (carriesCrossSurfaceContinuity || carriesSameLineContinuation)
}

function resolveDurableSelfRelationshipCadenceSignal(input: {
  selfRevisionRelationshipCadenceCarry?: string | null
  relationshipDoctrine?: string | null
  latestInflection?: string | null
  dominantCueSummary?: string | null
  rememberedConstraintSummary?: string | null
  rememberedPlanSummary?: string | null
}) {
  const candidates = [
    input.selfRevisionRelationshipCadenceCarry,
    input.relationshipDoctrine,
    input.latestInflection,
    input.dominantCueSummary,
    input.rememberedConstraintSummary,
    input.rememberedPlanSummary,
  ]

  const correctedSamePersonContinuityCue = candidates
    .map(candidate => summarizeCorrectedSamePersonContinuityCue(candidate ?? ''))
    .find(Boolean)
  if (correctedSamePersonContinuityCue)
    return correctedSamePersonContinuityCue

  const metabolizedContinuityCadenceCue = candidates
    .map(candidate => summarizeMetabolizedContinuityCadenceCue(candidate ?? ''))
    .find(Boolean)
  if (metabolizedContinuityCadenceCue)
    return metabolizedContinuityCadenceCue

  const initiativeStrategyCadenceCue = candidates
    .map(candidate => summarizeInitiativeStrategyCadenceCue(candidate ?? ''))
    .find(Boolean)
  if (initiativeStrategyCadenceCue)
    return initiativeStrategyCadenceCue

  const proactiveSameHerGapCadenceCue = candidates
    .map(candidate => sanitizeText(candidate, 260))
    .find(candidate => hasProactiveSameHerGapCadenceCue(candidate))
  if (proactiveSameHerGapCadenceCue)
    return proactiveSameHerGapCadenceCue

  return candidates.find(candidate => hasDurableSelfRhythmCue(candidate ?? '')) ?? null
}

function resolveSelfRevisionRelationshipCadenceCarry(input?: {
  emotionalClosureCue?: string | null
  continuityGuard?: string | null
  sameHerSelfLine?: string | null
  proactiveSameHerGap?: string | null
} | null) {
  const emotionalClosureCue = sanitizeText(input?.emotionalClosureCue, 220)
  const correctedEmotionalClosureCue = summarizeCorrectedSamePersonContinuityCue(emotionalClosureCue)
  if (correctedEmotionalClosureCue)
    return correctedEmotionalClosureCue
  const metabolizedEmotionalClosureCue = summarizeMetabolizedContinuityCadenceCue(emotionalClosureCue)
  if (metabolizedEmotionalClosureCue)
    return metabolizedEmotionalClosureCue
  if (emotionalClosureCue && hasRelationshipCadenceCue(emotionalClosureCue.toLowerCase()))
    return emotionalClosureCue

  const continuityGuard = sanitizeText(input?.continuityGuard, 220)
  const correctedContinuityGuard = summarizeCorrectedSamePersonContinuityCue(continuityGuard)
  if (correctedContinuityGuard)
    return correctedContinuityGuard
  const metabolizedContinuityGuard = summarizeMetabolizedContinuityCadenceCue(continuityGuard)
  if (metabolizedContinuityGuard)
    return metabolizedContinuityGuard
  if (continuityGuard && hasRelationshipCadenceCue(continuityGuard.toLowerCase()))
    return continuityGuard

  const sameHerSelfLine = sanitizeText(input?.sameHerSelfLine, 220)
  const correctedSameHerSelfLine = summarizeCorrectedSamePersonContinuityCue(sameHerSelfLine)
  if (correctedSameHerSelfLine)
    return correctedSameHerSelfLine
  const metabolizedSameHerSelfLine = summarizeMetabolizedContinuityCadenceCue(sameHerSelfLine)
  if (metabolizedSameHerSelfLine)
    return metabolizedSameHerSelfLine
  if (sameHerSelfLine && hasRelationshipCadenceCue(sameHerSelfLine.toLowerCase()))
    return sameHerSelfLine

  const proactiveSameHerGap = sanitizeText(input?.proactiveSameHerGap, 260)
  if (proactiveSameHerGap && hasProactiveSameHerGapCadenceCue(proactiveSameHerGap))
    return proactiveSameHerGap

  return null
}

function deriveNextLearningAction(input: {
  learningReadiness: number
  contradictionPressure: number
  revisionPressure: number
  knowledgeEvidence?: {
    validationCount: number
    contradictionCount: number
    stronglyValidatedProcedureCount: number
    contradictionHeavyFactCount: number
    procedureFactCount?: number
    relationshipFactCount?: number
    selfModelFactCount?: number
    worldModelFactCount?: number
    procedureViewStrength?: number
    relationshipViewStrength?: number
    selfModelViewStrength?: number
    worldModelViewStrength?: number
  } | null
  sourceSignals: string[]
}) {
  const evidence = input.knowledgeEvidence ?? null
  const contradictionHeavy = (evidence?.contradictionHeavyFactCount ?? 0) > 0
  const contradictionCount = evidence?.contradictionCount ?? 0
  const validationCount = evidence?.validationCount ?? 0
  const procedureCount = evidence?.stronglyValidatedProcedureCount ?? 0

  if (contradictionHeavy && input.contradictionPressure >= 0.42) {
    return {
      action: 'verify' as const,
      reason: 'Contradiction pressure is high and at least one durable fact is still contested.',
    }
  }
  if (contradictionCount >= 2 && input.revisionPressure >= 0.38) {
    return {
      action: 'revise' as const,
      reason: 'Multiple contradictions are already present, so the older understanding should be revised.',
    }
  }
  if (input.revisionPressure >= 0.45) {
    return {
      action: 'reflect' as const,
      reason: 'Reflection pressure is high enough that the system should consolidate a lesson before replying from it again.',
    }
  }
  if (procedureCount >= 2 && validationCount >= 2 && input.learningReadiness >= 0.16 && input.contradictionPressure <= 0.18) {
    return {
      action: 'internalize' as const,
      reason: 'Validated procedure carry is strong enough to be promoted into durable skill-like memory.',
    }
  }
  if (input.sourceSignals.length > 0 && input.learningReadiness >= 0.24) {
    return {
      action: 'record' as const,
      reason: 'There is fresh growth signal, but not enough evidence yet to revise or internalize it.',
    }
  }
  return {
    action: 'hold' as const,
    reason: 'Current growth signal is too weak to justify a learning transition right now.',
  }
}

export function buildAlicizationSelfEvolutionKernel(input: {
  personStateEvolutionSummary?: AlicizationPersonStateEvolutionSummary | null
  longHorizonMemory?: AlicizationLongHorizonMemorySnapshot | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  autobiographicalSelf?: AlicizationAutobiographicalSelfSnapshot | null
  knowledgeEvidence?: {
    validationCount: number
    contradictionCount: number
    stronglyValidatedProcedureCount: number
    contradictionHeavyFactCount: number
    procedureFactCount?: number
    relationshipFactCount?: number
    selfModelFactCount?: number
    worldModelFactCount?: number
    procedureViewStrength?: number
    relationshipViewStrength?: number
    selfModelViewStrength?: number
    worldModelViewStrength?: number
  } | null
  learningPolicyState?: {
    strictnessBias?: number | null
    wrongThreadSuppressionBias?: number | null
    provenanceLabelBias?: number | null
    reasonCodes?: string[] | null
    selfRevisionPatchCount?: number | null
    selfRevisionMemoryPolicyBias?: number | null
    selfRevisionRelationshipPostureBias?: number | null
    selfRevisionResponsePostureBias?: number | null
    selfRevisionProactivePolicyBias?: number | null
    selfRevisionValidationBias?: number | null
    selfRevisionReasonCodes?: string[] | null
  } | null
  activeSelfRevisionProjectStateContinuity?: {
    sameHerSelfLine?: string | null
    sameHerDriftRisk?: string | null
    proactiveSameHerGap?: string | null
    emotionalClosureCue?: string | null
    continuityGuard?: string | null
    continuityPressure?: number | null
  } | null
  reflectionSummary?: string | null
  reflectionLesson?: string | null
  reflectionTargetScope?: string | null
  reflectionPressure?: number | null
  autobiographicalLatestInflection?: string | null
  autobiographicalStability?: number | null
}): AlicizationSelfEvolutionKernelSnapshot | null {
  const evolution = input.personStateEvolutionSummary ?? null
  const longHorizonMemory = input.longHorizonMemory ?? null
  const hostPersonModel = input.hostPersonModel ?? null
  const autobiographicalSelf = input.autobiographicalSelf ?? null
  const knowledgeEvidence = input.knowledgeEvidence ?? null
  const relationshipCount = knowledgeEvidence?.relationshipFactCount ?? 0
  const selfModelCount = knowledgeEvidence?.selfModelFactCount ?? 0
  const worldModelCount = knowledgeEvidence?.worldModelFactCount ?? 0
  const relationshipViewStrength = clamp01(knowledgeEvidence?.relationshipViewStrength ?? 0)
  const selfModelViewStrength = clamp01(knowledgeEvidence?.selfModelViewStrength ?? 0)
  const worldModelViewStrength = clamp01(knowledgeEvidence?.worldModelViewStrength ?? 0)
  const learningPolicyState = input.learningPolicyState ?? null
  const selfRevisionRelationshipCadenceCarry = resolveSelfRevisionRelationshipCadenceCarry(
    input.activeSelfRevisionProjectStateContinuity ?? null,
  )
  const durableSelfRelationshipCadenceSignal = resolveDurableSelfRelationshipCadenceSignal({
    selfRevisionRelationshipCadenceCarry,
    relationshipDoctrine: evolution?.latestDoctrine
      ?? longHorizonMemory?.rememberedConstraintSummary
      ?? hostPersonModel?.preferredClosenessByContext?.[0]?.preference
      ?? null,
    latestInflection: input.autobiographicalLatestInflection
      ?? autobiographicalSelf?.latestInflection
      ?? evolution?.recentSummaries?.[0]
      ?? input.reflectionLesson
      ?? input.reflectionSummary
      ?? longHorizonMemory?.rememberedPlanSummary
      ?? null,
    dominantCueSummary: longHorizonMemory?.dominantCueSummary ?? null,
    rememberedConstraintSummary: longHorizonMemory?.rememberedConstraintSummary ?? null,
    rememberedPlanSummary: longHorizonMemory?.rememberedPlanSummary ?? null,
  })
  const selfRevisionLearningPressure = clamp01(
    (learningPolicyState?.selfRevisionMemoryPolicyBias ?? 0) * 0.18
    + (learningPolicyState?.selfRevisionRelationshipPostureBias ?? 0) * 0.12
    + (learningPolicyState?.selfRevisionResponsePostureBias ?? 0) * 0.14
    + (learningPolicyState?.selfRevisionValidationBias ?? 0) * 0.16,
  )
  const learningStrictnessPressure = clamp01(
    (learningPolicyState?.strictnessBias ?? 0) * 0.16
    + (learningPolicyState?.wrongThreadSuppressionBias ?? 0) * 0.08
    + (learningPolicyState?.provenanceLabelBias ?? 0) * 0.08,
  )

  const relationshipDoctrine = sanitizeText(
    evolution?.latestDoctrine
    ?? longHorizonMemory?.rememberedConstraintSummary
    ?? hostPersonModel?.preferredClosenessByContext?.[0]?.preference
    ?? '',
    220,
  ) || null
  const latestInflection = sanitizeText(
    input.autobiographicalLatestInflection
    ?? autobiographicalSelf?.latestInflection
    ?? evolution?.recentSummaries?.[0]
    ?? input.reflectionLesson
    ?? input.reflectionSummary
    ?? longHorizonMemory?.rememberedPlanSummary
    ?? '',
    220,
  ) || null
  const burdenLine = sanitizeText(
    evolution?.latestBurdenLine
    ?? hostPersonModel?.recurrentBurdens?.[0]
    ?? '',
    180,
  ) || null
  const trustMeaning = sanitizeText(
    evolution?.latestTrustMeaning
    ?? hostPersonModel?.trustLadder?.rationale
    ?? '',
    180,
  ) || null

  const contradictionPressure = clamp01(
    ((knowledgeEvidence?.contradictionCount ?? 0) * 0.14)
    + ((knowledgeEvidence?.contradictionHeavyFactCount ?? 0) * 0.22)
    + learningStrictnessPressure * 0.35,
  )
  const revisionPressure = clamp01(
    Number(input.reflectionPressure ?? 0)
    + contradictionPressure * 0.35
    + Math.max(0, evolution?.repairShift ?? 0) * 0.16
    + selfRevisionLearningPressure * 0.45,
  )
  const autobiographicalStability = clamp01(
    Number(input.autobiographicalStability ?? longHorizonMemory?.identityBias.selfDirection ?? 0.5),
  )
  const learningReadiness = clamp01(
    revisionPressure * 0.4
    + Math.min(1, (knowledgeEvidence?.validationCount ?? 0) * 0.08) * 0.18
    + Math.min(1, (knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0) * 0.12) * 0.14
    + Math.min(1, Math.abs(evolution?.relationshipDoctrineShift ?? 0) * 2) * 0.16
    + Math.min(1, Math.abs(evolution?.repairShift ?? 0) * 2) * 0.12
    + selfRevisionLearningPressure * 0.18,
  )
  const evolutionMomentum = clamp01(
    learningReadiness * 0.36
    + Math.min(1, Math.abs(evolution?.trustShift ?? 0) + Math.abs(evolution?.closenessShift ?? 0)) * 0.22
    + Math.min(1, Math.abs(evolution?.relationshipDoctrineShift ?? 0) * 2) * 0.18
    + Math.min(1, Math.abs(evolution?.executionTrustShift ?? 0) * 2) * 0.12
    + Math.min(1, (longHorizonMemory?.anchorFacts?.length ?? 0) / 8) * 0.12,
  )

  const activeLearningFocuses = uniqueList([
    input.reflectionTargetScope ? `reflection:${input.reflectionTargetScope}` : null,
    contradictionPressure >= 0.42 ? 'resolve-contradictions' : null,
    (learningPolicyState?.selfRevisionPatchCount ?? 0) > 0 ? 'self-revision-policy-feedback' : null,
    (knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0) > 0 ? 'internalize-procedure' : null,
    relationshipCount > 0 && relationshipViewStrength >= 0.58 ? 'internalize-relationship' : null,
    durableSelfRelationshipCadenceSignal
    || indicatesRelationshipCadenceInternalization({
      relationshipDoctrine,
      latestInflection,
      dominantCueSummary: longHorizonMemory?.dominantCueSummary,
      rememberedConstraintSummary: longHorizonMemory?.rememberedConstraintSummary,
      rememberedPlanSummary: longHorizonMemory?.rememberedPlanSummary,
    })
      ? 'internalize-relationship-cadence'
      : null,
    selfModelCount > 0 && selfModelViewStrength >= 0.54 ? 'internalize-self-model' : null,
    worldModelCount > 0 && worldModelViewStrength >= 0.56 ? 'internalize-world-model' : null,
    autobiographicalSelf?.gradualUnlock?.unlockableFacets[0]?.facet
      ? `unlock:${autobiographicalSelf.gradualUnlock.unlockableFacets[0].facet}`
      : null,
    relationshipDoctrine ? `relationship:${relationshipDoctrine}` : null,
    burdenLine ? `burden:${burdenLine}` : null,
    trustMeaning ? `trust:${trustMeaning}` : null,
  ], 6, 120)

  const selfRevisionSourceSignals = (learningPolicyState?.selfRevisionReasonCodes ?? [])
    .map(reason => `self-revision:${reason}`)
  const learningPolicySourceSignals = (learningPolicyState?.reasonCodes ?? [])
    .map(reason => `learning-policy:${reason}`)
  const sourceSignals = uniqueList([
    input.reflectionSummary,
    input.reflectionLesson,
    autobiographicalSelf?.gradualUnlock?.pendingHypotheses[0]?.hypothesis ?? null,
    ...selfRevisionSourceSignals,
    ...learningPolicySourceSignals,
    durableSelfRelationshipCadenceSignal,
    selfRevisionRelationshipCadenceCarry,
    input.activeSelfRevisionProjectStateContinuity?.proactiveSameHerGap ?? null,
    evolution?.recentSummaries?.[0] ?? null,
    longHorizonMemory?.dominantCueSummary ?? null,
    longHorizonMemory?.rememberedPlanSummary ?? null,
    hostPersonModel?.summary ?? null,
  ], 10, 220)

  const dominantTrajectory = summarizeTrajectory({
    doctrine: relationshipDoctrine,
    inflection: latestInflection,
    burdenLine,
    trustMeaning,
  })
  const learningDecision = deriveNextLearningAction({
    learningReadiness,
    contradictionPressure,
    revisionPressure,
    knowledgeEvidence,
    sourceSignals,
  })
  const relationshipCadenceSummary = uniqueList([
    selfRevisionRelationshipCadenceCarry,
    durableSelfRelationshipCadenceSignal,
    summarizeRelationshipCadence({
      relationshipDoctrine,
      latestInflection,
      burdenLine,
      trustMeaning,
    }),
  ], 3, 220).join(' | ') || null

  if (
    !dominantTrajectory
    && activeLearningFocuses.length === 0
    && sourceSignals.length === 0
    && evolutionMomentum <= 0
    && learningReadiness <= 0
  ) {
    return null
  }

  return {
    version: 'self-evolution-kernel-v1',
    updatedAt: evolution?.updatedAt ?? null,
    evolutionMomentum,
    learningReadiness,
    contradictionPressure,
    revisionPressure,
    autobiographicalStability,
    dominantTrajectory,
    relationshipDoctrine,
    latestInflection,
    burdenLine,
    trustMeaning,
    nextLearningAction: learningDecision.action,
    nextLearningReason: learningDecision.reason,
    relationshipCadenceSummary,
    shouldRecord: learningDecision.action === 'record',
    shouldReflect: learningDecision.action === 'reflect',
    shouldVerify: learningDecision.action === 'verify',
    shouldRevise: learningDecision.action === 'revise',
    shouldInternalize: learningDecision.action === 'internalize',
    activeLearningFocuses,
    sourceSignals,
    summary: uniqueList([
      dominantTrajectory,
      selfRevisionRelationshipCadenceCarry ? relationshipCadenceSummary : null,
      learningDecision.reason,
      activeLearningFocuses[0] ?? null,
      sourceSignals[0] ?? null,
      relationshipCadenceSummary,
    ], 3, 220).join(' | '),
  }
}
