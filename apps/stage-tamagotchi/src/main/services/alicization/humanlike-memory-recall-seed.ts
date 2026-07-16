import type {
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
} from '../../../shared/eventa'

import { normalizeHumanlikeSentenceEnding, sanitizeHumanlikeMemoryText } from './humanlike-memory'

interface HumanlikeMemoryRecallSeedEvent extends Pick<
  AlicizationMindTurnEventRecord,
  'kind' | 'payload' | 'createdAt'
> {}

interface HumanlikeMemoryRecallCorrection {
  candidateId: string
  field: string
  correctedValue: string
  reason: string | null
  createdAt: number
}

type HumanlikeMemoryRecallQueryKind = Extract<
  AlicizationMindTurnEventKind,
  'person-state-updated' | 'humanlike-memory-corrected'
>

function objectFromHumanlikeRecallSeed(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function stringListFromHumanlikeRecallSeed(raw: unknown, maxItems = 6) {
  if (!Array.isArray(raw))
    return []

  const result: string[] = []
  for (const item of raw) {
    const normalized = sanitizeHumanlikeMemoryText(item, 80)
    if (!normalized)
      continue
    if (result.some(existing => existing.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function uniqueHumanlikeRecallSeedTexts(values: Array<unknown>, maxItems = 6, maxChars = 80) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeHumanlikeMemoryText(value, maxChars)
    if (!normalized)
      continue
    if (result.some(existing => existing.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function numberFromHumanlikeRecallSeed(raw: unknown, fallback: number | null | undefined = 0) {
  const value = Number(raw)
  if (Number.isFinite(value))
    return value

  const fallbackValue = Number(fallback)
  return Number.isFinite(fallbackValue) ? fallbackValue : 0
}

function rawTraceListFromHumanlikeRecallSeed(raw: unknown, maxItems = 16, maxChars = 220) {
  if (!Array.isArray(raw))
    return []

  const result: string[] = []
  for (const item of raw) {
    const normalized = typeof item === 'string'
      ? item.trim().replace(/\s+/gu, ' ').slice(0, maxChars).trim()
      : ''
    if (!normalized)
      continue
    if (result.some(existing => existing.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function readHumanlikeRecallTraceLabel(trace: string[], kind: 'host' | 'self') {
  const entry = trace.find(item => item.startsWith(`${kind}:`))
  if (!entry)
    return ''

  return sanitizeHumanlikeMemoryText(
    entry
      .slice(`${kind}:`.length)
      .split(/\s+/u)[0]
      ?.replace(/[^a-z-]+$/u, ''),
    48,
  )
}

function buildAffectivePerspectiveRecallSeedParts(emotionalResidue: Record<string, unknown> | null) {
  if (!emotionalResidue)
    return []

  const trace = rawTraceListFromHumanlikeRecallSeed(emotionalResidue.trace, 16, 220)
  const hostEmotionLabel = readHumanlikeRecallTraceLabel(trace, 'host')
  const selfEmotionLabel = readHumanlikeRecallTraceLabel(trace, 'self')

  return [
    hostEmotionLabel ? `host_emotion_label=${hostEmotionLabel}` : null,
    selfEmotionLabel ? `self_emotion_label=${selfEmotionLabel}` : null,
  ].filter(Boolean)
}

function buildEmbodimentRecallSeedParts(embodimentTrace: Record<string, unknown> | null) {
  if (!embodimentTrace)
    return []

  const expressionState = objectFromHumanlikeRecallSeed(embodimentTrace.expressionState)
  const residentState = objectFromHumanlikeRecallSeed(embodimentTrace.residentState)
  const recallStrength = sanitizeHumanlikeMemoryText(embodimentTrace.recallStrength, 64)
  const modalityRisk = sanitizeHumanlikeMemoryText(embodimentTrace.modalityContradictionRisk, 64)
  const face = sanitizeHumanlikeMemoryText(expressionState?.face, 64)
  const gaze = sanitizeHumanlikeMemoryText(expressionState?.gaze, 64)
  const blink = sanitizeHumanlikeMemoryText(expressionState?.blink, 64)
  const voice = sanitizeHumanlikeMemoryText(expressionState?.voice, 64)
  const pause = sanitizeHumanlikeMemoryText(expressionState?.pause, 64)
  const lipsync = sanitizeHumanlikeMemoryText(expressionState?.lipsync, 64)
  const pacing = sanitizeHumanlikeMemoryText(expressionState?.pacing, 64)
  const residentFace = sanitizeHumanlikeMemoryText(residentState?.facialCue, 64)
  const residentAction = sanitizeHumanlikeMemoryText(residentState?.actionCue, 64)
  const residentMode = sanitizeHumanlikeMemoryText(residentState?.mode, 64)
  const residentReason = sanitizeHumanlikeMemoryText(residentState?.reason, 220)

  return [
    recallStrength ? `embodiment_recall_strength=${recallStrength}` : null,
    modalityRisk ? `embodiment_modality_risk=${modalityRisk}` : null,
    face ? `embodiment_face=${face}` : null,
    gaze ? `embodiment_gaze=${gaze}` : null,
    blink ? `embodiment_blink=${blink}` : null,
    voice ? `embodiment_voice=${voice}` : null,
    pause ? `embodiment_pause=${pause}` : null,
    lipsync ? `embodiment_lipsync=${lipsync}` : null,
    pacing ? `embodiment_pacing=${pacing}` : null,
    residentFace ? `embodiment_resident_face=${residentFace}` : null,
    residentAction ? `embodiment_resident_action=${residentAction}` : null,
    residentMode ? `embodiment_resident_mode=${residentMode}` : null,
    residentReason ? `embodiment_resident_reason=${residentReason}` : null,
  ].filter(Boolean)
}

function buildInitiativeOutcomeRecallSeedParts(initiativeOutcomeRecord: Record<string, unknown> | null) {
  if (!initiativeOutcomeRecord)
    return []

  const outcome = sanitizeHumanlikeMemoryText(initiativeOutcomeRecord.outcome, 80)
  const reaction = sanitizeHumanlikeMemoryText(initiativeOutcomeRecord.userReaction, 80)

  return [
    outcome ? `initiative_outcome=${outcome}` : null,
    reaction ? `initiative_reaction=${reaction}` : null,
  ].filter(Boolean)
}

function buildInitiativeOpportunityRecallSeedParts(initiativeOpportunity: Record<string, unknown> | null) {
  if (!initiativeOpportunity)
    return []

  const pressure = sanitizeHumanlikeMemoryText(initiativeOpportunity.pressure, 64)

  return [
    pressure ? `initiative_pressure=${pressure}` : null,
  ].filter(Boolean)
}

function continuityPriorityFromText(...values: Array<string | null | undefined>) {
  const text = values
    .map(value => sanitizeHumanlikeMemoryText(value, 260))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!text)
    return 0

  let priority = 0
  if (/\bsame[- ]?person\b|\bsame[- ]?her\b|\bsame living line\b|\bone continuous\b|\bcontinuous digital life\b|\btool shell\b|同一个她|同一条线|持续的人|持续人格|数字生命|工具壳/u.test(text))
    priority += 1.2
  if (/\bcontinuity\b|\brepair\b|\bboundary\b|\bspace\b|\broom\b|\blower-pressure\b|\bmeasured-return\b|\bnot a status report\b|\bnot .*status recap\b|连续性|修复|边界|空间|低压|不是状态汇报/u.test(text))
    priority += 0.45
  if (/\bprogress\b|\bstatus recap\b|\bstatus report\b|\bconcise\b|\bgeneric recap\b|进度|状态汇报|简短汇报/u.test(text))
    priority -= 0.18

  return priority
}

function relationshipIntentPriority(rawIntent: unknown) {
  const intent = sanitizeHumanlikeMemoryText(rawIntent, 80).toLowerCase()
  switch (intent) {
    case 'same-person-test':
      return 1
    case 'mixed':
      return 0.92
    case 'continuity-worry':
      return 0.78
    case 'progress-pressure':
      return 0.2
    default:
      return 0
  }
}

function buildHumanlikeMemoryRecallSeedPriority(input: {
  candidate: Record<string, unknown>
  correction: HumanlikeMemoryRecallCorrection | null
  eventCreatedAt: number
}) {
  const relationshipContext = objectFromHumanlikeRecallSeed(input.candidate.relationshipContext)
  const emotionalResidue = objectFromHumanlikeRecallSeed(input.candidate.emotionalResidue)
  const initiativeOpportunity = objectFromHumanlikeRecallSeed(input.candidate.initiativeOpportunity)
  const recallPosture = objectFromHumanlikeRecallSeed(input.candidate.recallPosture)
  const longTermWorthiness = objectFromHumanlikeRecallSeed(input.candidate.longTermWorthiness)
  const auditTrail = objectFromHumanlikeRecallSeed(input.candidate.auditTrail)

  const relationshipSummary = sanitizeHumanlikeMemoryText(relationshipContext?.summary, 260)
  const whyRemember = sanitizeHumanlikeMemoryText(auditTrail?.whyRemember, 220)
  const emotionalTags = stringListFromHumanlikeRecallSeed(emotionalResidue?.tags, 8)
  const recallCertainty = sanitizeHumanlikeMemoryText(recallPosture?.certainty, 40).toLowerCase()
  const initiativeKind = sanitizeHumanlikeMemoryText(initiativeOpportunity?.kind, 80).toLowerCase()
  const longTermScore = Math.max(0, Math.min(1, numberFromHumanlikeRecallSeed(longTermWorthiness?.score, 0)))

  let priority = 0
  priority += continuityPriorityFromText(
    relationshipSummary,
    whyRemember,
    input.correction?.correctedValue ?? null,
    input.correction?.reason ?? null,
  )
  priority += relationshipIntentPriority(relationshipContext?.primaryIntent)
  priority += longTermScore * 0.9

  if (emotionalTags.includes('protective-continuity'))
    priority += 0.42
  if (emotionalTags.includes('unfinishedness'))
    priority += 0.18
  if (emotionalTags.includes('corrected-meaning'))
    priority += 0.26
  if (emotionalTags.includes('tension'))
    priority += 0.08

  if (recallCertainty === 'corrected')
    priority += 0.6
  else if (recallCertainty === 'tentative')
    priority += 0.08

  if (initiativeKind === 'remember-without-prompt')
    priority += 0.14
  else if (initiativeKind === 'low-pressure-follow-up')
    priority += 0.06

  if (input.correction)
    priority += 1.4

  return {
    priority: Number(priority.toFixed(3)),
    createdAt: Math.max(0, Math.floor(numberFromHumanlikeRecallSeed(input.candidate.createdAt, input.eventCreatedAt))),
  }
}

function correctionFromHumanlikeRecallSeedEvent(event: HumanlikeMemoryRecallSeedEvent) {
  if (event.kind !== 'humanlike-memory-corrected')
    return null

  const payload = objectFromHumanlikeRecallSeed(event.payload)
  const candidateId = sanitizeHumanlikeMemoryText(payload?.candidateId, 160)
  const field = sanitizeHumanlikeMemoryText(payload?.field, 80)
  const correctedValue = sanitizeHumanlikeMemoryText(payload?.correctedValue, 420)
  if (!candidateId || !field || !correctedValue)
    return null

  return {
    candidateId,
    field,
    correctedValue,
    reason: sanitizeHumanlikeMemoryText(payload?.reason, 220) || null,
    createdAt: Math.max(0, Math.floor(numberFromHumanlikeRecallSeed(event.createdAt, 0))),
  } satisfies HumanlikeMemoryRecallCorrection
}

function preferRecallSeedCorrection(
  corrections: HumanlikeMemoryRecallCorrection[],
) {
  if (corrections.length === 0)
    return null

  return corrections
    .slice()
    .sort((left, right) => {
      const leftRelationshipPriority = left.field === 'relationshipContext' ? 1 : 0
      const rightRelationshipPriority = right.field === 'relationshipContext' ? 1 : 0
      if (rightRelationshipPriority !== leftRelationshipPriority)
        return rightRelationshipPriority - leftRelationshipPriority
      return right.createdAt - left.createdAt
    })[0] ?? null
}

function humanlikeCandidateFromMindTurnPayload(payload: unknown) {
  const object = objectFromHumanlikeRecallSeed(payload)
  const candidate = objectFromHumanlikeRecallSeed(object?.humanlikeMemoryCandidate)
  if (!candidate)
    return null

  const id = sanitizeHumanlikeMemoryText(candidate.id, 160)
  if (!id)
    return null

  return candidate
}

function affectiveResidueFromMindTurnPayload(payload: unknown) {
  const object = objectFromHumanlikeRecallSeed(payload)
  const direct = objectFromHumanlikeRecallSeed(object?.affectiveResidue)
  if (direct)
    return direct

  const derivedMindStateBundle = objectFromHumanlikeRecallSeed(object?.derivedMindStateBundle)
  return objectFromHumanlikeRecallSeed(derivedMindStateBundle?.affectiveResidue)
}

function buildAffectiveResidueRecallCandidate(payload: unknown, eventCreatedAt: number): Record<string, unknown> | null {
  const affectiveResidue = affectiveResidueFromMindTurnPayload(payload)
  if (!affectiveResidue)
    return null

  const dominantResidueKind = sanitizeHumanlikeMemoryText(affectiveResidue.dominantResidueKind, 48).toLowerCase()
  const cadence = objectFromHumanlikeRecallSeed(affectiveResidue.relationshipCadence)
  const cadenceMode = sanitizeHumanlikeMemoryText(cadence?.cadenceMode, 64).toLowerCase()
  const distancePosture = sanitizeHumanlikeMemoryText(cadence?.distancePosture, 64).toLowerCase()
  const cadenceSummary = sanitizeHumanlikeMemoryText(cadence?.summary, 220)
  const residueSummary = sanitizeHumanlikeMemoryText(affectiveResidue.summary, 220)
  const shouldDelayWarmth = cadence?.shouldDelayWarmth === true
  const shouldProtectRest = cadence?.shouldProtectRest === true
  const afterglowCarry = Math.max(0, Math.min(1, numberFromHumanlikeRecallSeed(cadence?.afterglowCarry, 0)))
  const fatigueGuard = Math.max(0, Math.min(1, numberFromHumanlikeRecallSeed(cadence?.fatigueGuard, 0)))
  const overreachRisk = Math.max(0, Math.min(1, numberFromHumanlikeRecallSeed(cadence?.overreachRisk, 0)))
  const hasMeasuredReturnCarry
    = dominantResidueKind === 'afterglow'
      || dominantResidueKind === 'repair'
      || dominantResidueKind === 'rest-protective'
      || cadenceMode === 'measured-return'
      || cadenceMode === 'cooldown'
      || cadenceMode === 'repair'
      || shouldDelayWarmth
      || shouldProtectRest
      || afterglowCarry >= 0.18
      || fatigueGuard >= 0.18
      || overreachRisk >= 0.22

  if (!dominantResidueKind && !cadenceMode && !cadenceSummary && !residueSummary)
    return null

  const emotionTags = uniqueHumanlikeRecallSeedTexts([
    dominantResidueKind === 'afterglow' ? 'afterglow-carry' : null,
    dominantResidueKind === 'repair' ? 'repair-residue' : null,
    dominantResidueKind === 'rest-protective' ? 'rest-protective' : null,
    shouldDelayWarmth ? 'unfinishedness' : null,
  ], 6, 48)

  const worthinessScore = Math.max(0.58, Math.min(
    0.92,
    0.54
    + (dominantResidueKind ? 0.06 : 0)
    + (shouldDelayWarmth ? 0.08 : 0)
    + (shouldProtectRest ? 0.08 : 0)
    + Math.min(0.08, afterglowCarry * 0.12)
    + Math.min(0.04, fatigueGuard * 0.08)
    + Math.min(0.04, overreachRisk * 0.08),
  ))

  return {
    id: `humanlike-memory-residue:${eventCreatedAt}`,
    createdAt: eventCreatedAt,
    longTermWorthiness: {
      shouldPersist: true,
      score: worthinessScore,
      reasons: uniqueHumanlikeRecallSeedTexts([
        dominantResidueKind ? `residue:${dominantResidueKind}` : null,
        cadenceMode ? `cadence:${cadenceMode}` : null,
      ], 4, 80),
    },
    relationshipContext: {
      threadAnchor: 'persisted-affective-residue',
      summary: '',
      primaryIntent: 'mixed',
    },
    emotionalResidue: {
      tags: emotionTags.length > 0 ? emotionTags : ['low-affect-trace'],
    },
    affectiveResidueFacts: {
      kind: dominantResidueKind,
      cadenceMode,
      distancePosture,
      shouldDelayWarmth,
      shouldProtectRest,
      afterglowCarry,
      fatigueGuard,
      overreachRisk,
    },
    embodimentTrace: {
      recallStrength: shouldProtectRest ? 'cautious-avoidance' : 'lightly-noticed',
      expressionState: {
        face: hasMeasuredReturnCarry ? 'steady-soft' : 'neutral-soft',
        gaze: hasMeasuredReturnCarry ? 'stable' : 'soft',
        blink: hasMeasuredReturnCarry ? 'slower' : 'natural',
        voice: hasMeasuredReturnCarry ? 'lower-pressure' : 'even',
        pause: hasMeasuredReturnCarry ? 'longer' : 'natural',
        lipsync: hasMeasuredReturnCarry ? 'restrained' : 'matched',
        pacing: hasMeasuredReturnCarry ? 'slower' : 'natural',
      },
    },
    auditTrail: {
      whyRemember: '',
      confidence: worthinessScore,
      correctionSurface: {
        userCorrectableFields: ['relationshipContext', 'embodimentTrace'],
      },
    },
    recallPosture: {
      certainty: 'steady',
      reason: '',
    },
  }
}

function buildAffectiveResidueRecallSeedParts(affectiveResidueFacts: Record<string, unknown> | null) {
  if (!affectiveResidueFacts)
    return []

  const kind = sanitizeHumanlikeMemoryText(affectiveResidueFacts.kind, 48)
  const cadenceMode = sanitizeHumanlikeMemoryText(affectiveResidueFacts.cadenceMode, 64)
  const distancePosture = sanitizeHumanlikeMemoryText(affectiveResidueFacts.distancePosture, 64)
  const afterglowCarry = numberFromHumanlikeRecallSeed(affectiveResidueFacts.afterglowCarry, 0)
  const fatigueGuard = numberFromHumanlikeRecallSeed(affectiveResidueFacts.fatigueGuard, 0)
  const overreachRisk = numberFromHumanlikeRecallSeed(affectiveResidueFacts.overreachRisk, 0)

  return [
    kind ? `affective_residue_kind=${kind}` : null,
    cadenceMode ? `affective_cadence_mode=${cadenceMode}` : null,
    distancePosture ? `affective_distance_posture=${distancePosture}` : null,
    `affective_should_delay_warmth=${affectiveResidueFacts.shouldDelayWarmth === true ? 'true' : 'false'}`,
    `affective_should_protect_rest=${affectiveResidueFacts.shouldProtectRest === true ? 'true' : 'false'}`,
    `affective_afterglow_carry=${afterglowCarry.toFixed(2)}`,
    `affective_fatigue_guard=${fatigueGuard.toFixed(2)}`,
    `affective_overreach_risk=${overreachRisk.toFixed(2)}`,
  ].filter(Boolean)
}

function buildHumanlikeMemoryRecallSeedLine(candidate: Record<string, unknown>, event: HumanlikeMemoryRecallSeedEvent) {
  const eventCreatedAt = numberFromHumanlikeRecallSeed(event.createdAt, 0)
  const affectiveResidueFacts = objectFromHumanlikeRecallSeed(candidate.affectiveResidueFacts)
  const relationshipContext = objectFromHumanlikeRecallSeed(candidate.relationshipContext)
  const emotionalResidue = objectFromHumanlikeRecallSeed(candidate.emotionalResidue)
  const initiativeOpportunity = objectFromHumanlikeRecallSeed(candidate.initiativeOpportunity)
  const initiativeOutcomeRecord = objectFromHumanlikeRecallSeed(candidate.initiativeOutcomeRecord)
  const embodimentTrace = objectFromHumanlikeRecallSeed(candidate.embodimentTrace)
  const recallPosture = objectFromHumanlikeRecallSeed(candidate.recallPosture)
  const metabolism = objectFromHumanlikeRecallSeed(candidate.metabolism)
  const forgettingPolicy = objectFromHumanlikeRecallSeed(metabolism?.forgettingPolicy)
  const relationshipSummary = sanitizeHumanlikeMemoryText(relationshipContext?.summary, 220)
  const emotionalTags = stringListFromHumanlikeRecallSeed(emotionalResidue?.tags, 6)
  const initiativeKind = sanitizeHumanlikeMemoryText(initiativeOpportunity?.kind, 80)
  const initiativeOpportunityParts = buildInitiativeOpportunityRecallSeedParts(initiativeOpportunity)
  const initiativeOutcomeParts = buildInitiativeOutcomeRecallSeedParts(initiativeOutcomeRecord)
  const embodimentParts = buildEmbodimentRecallSeedParts(embodimentTrace)
  const affectivePerspectiveParts = buildAffectivePerspectiveRecallSeedParts(emotionalResidue)
  const recallCertainty = sanitizeHumanlikeMemoryText(recallPosture?.certainty, 40)
  const downrankMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.downrankMemoryIds, 8)
  const mergeMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.mergeMemoryIds, 8)
  const forgetMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.forgetMemoryIds, 8)

  const parts = [
    ...buildAffectiveResidueRecallSeedParts(affectiveResidueFacts),
    relationshipSummary ? `relationship=${relationshipSummary}` : null,
    emotionalTags.length > 0 ? `emotion=${emotionalTags.join(',')}` : null,
    ...affectivePerspectiveParts,
    initiativeKind ? `initiative=${initiativeKind}` : null,
    ...initiativeOpportunityParts,
    ...initiativeOutcomeParts,
    ...embodimentParts,
    recallCertainty ? `certainty=${recallCertainty}` : null,
    downrankMemoryIds.length > 0 ? `downrank=${downrankMemoryIds.join(',')}` : null,
    mergeMemoryIds.length > 0 ? `merge=${mergeMemoryIds.join(',')}` : null,
    forgetMemoryIds.length > 0 ? `forget=${forgetMemoryIds.join(',')}` : null,
  ].filter(Boolean)
  if (parts.length === 0)
    return null

  return `humanlike_memory_recall: ${[
    ...parts,
    `created=${Math.max(0, Math.floor(numberFromHumanlikeRecallSeed(candidate.createdAt, eventCreatedAt)))}`,
  ].join(' | ')}`
}

export function buildHumanlikeMemoryRecallSeedFromMindTurnEvents(
  events: HumanlikeMemoryRecallSeedEvent[],
  maxItems = 2,
) {
  const correctionsByCandidateId = new Map<string, HumanlikeMemoryRecallCorrection[]>()
  for (const event of events) {
    const correction = correctionFromHumanlikeRecallSeedEvent(event)
    if (!correction)
      continue
    correctionsByCandidateId.set(correction.candidateId, [
      ...(correctionsByCandidateId.get(correction.candidateId) ?? []),
      correction,
    ])
  }

  const lines = events
    .filter(event => event.kind === 'person-state-updated')
    .map((event) => {
      const candidate = humanlikeCandidateFromMindTurnPayload(event.payload)
        ?? buildAffectiveResidueRecallCandidate(event.payload, numberFromHumanlikeRecallSeed(event.createdAt, 0))
      if (!candidate)
        return null

      const candidateId = sanitizeHumanlikeMemoryText(candidate.id, 160)
      const correction = preferRecallSeedCorrection(
        candidateId ? (correctionsByCandidateId.get(candidateId) ?? []) : [],
      )
      if (correction) {
        const normalizedCandidate = objectFromHumanlikeRecallSeed(candidate)
        if (!normalizedCandidate)
          return null

        const affectiveResidueFacts = objectFromHumanlikeRecallSeed(normalizedCandidate.affectiveResidueFacts)
        const relationshipContext = objectFromHumanlikeRecallSeed(normalizedCandidate.relationshipContext)
        const emotionalResidue = objectFromHumanlikeRecallSeed(normalizedCandidate.emotionalResidue)
        const initiativeOpportunity = objectFromHumanlikeRecallSeed(normalizedCandidate.initiativeOpportunity)
        const initiativeOutcomeRecord = objectFromHumanlikeRecallSeed(normalizedCandidate.initiativeOutcomeRecord)
        const embodimentTrace = objectFromHumanlikeRecallSeed(normalizedCandidate.embodimentTrace)
        const recallPosture = objectFromHumanlikeRecallSeed(normalizedCandidate.recallPosture)
        const metabolism = objectFromHumanlikeRecallSeed(normalizedCandidate.metabolism)
        const forgettingPolicy = objectFromHumanlikeRecallSeed(metabolism?.forgettingPolicy)
        const emotionalTags = stringListFromHumanlikeRecallSeed(emotionalResidue?.tags, 6)
        const initiativeKind = sanitizeHumanlikeMemoryText(initiativeOpportunity?.kind, 80)
        const initiativeOpportunityParts = buildInitiativeOpportunityRecallSeedParts(initiativeOpportunity)
        const initiativeOutcomeParts = buildInitiativeOutcomeRecallSeedParts(initiativeOutcomeRecord)
        const embodimentParts = buildEmbodimentRecallSeedParts(embodimentTrace)
        const affectivePerspectiveParts = buildAffectivePerspectiveRecallSeedParts(emotionalResidue)
        const recallCertainty = sanitizeHumanlikeMemoryText(recallPosture?.certainty, 40)
        const downrankMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.downrankMemoryIds, 8)
        const mergeMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.mergeMemoryIds, 8)
        const forgetMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.forgetMemoryIds, 8)
        const correctedRelationshipSummary = correction.field === 'relationshipContext'
          ? normalizeHumanlikeSentenceEnding(correction.correctedValue, 220)
          : sanitizeHumanlikeMemoryText(relationshipContext?.summary, 220)

        const parts = [
          ...buildAffectiveResidueRecallSeedParts(affectiveResidueFacts),
          correctedRelationshipSummary ? `relationship=${correctedRelationshipSummary}` : null,
          emotionalTags.length > 0 ? `emotion=${emotionalTags.join(',')}` : null,
          ...affectivePerspectiveParts,
          initiativeKind ? `initiative=${initiativeKind}` : null,
          ...initiativeOpportunityParts,
          ...initiativeOutcomeParts,
          ...embodimentParts,
          recallCertainty ? `certainty=${recallCertainty}` : null,
          downrankMemoryIds.length > 0 ? `downrank=${downrankMemoryIds.join(',')}` : null,
          mergeMemoryIds.length > 0 ? `merge=${mergeMemoryIds.join(',')}` : null,
          forgetMemoryIds.length > 0 ? `forget=${forgetMemoryIds.join(',')}` : null,
        ].filter(Boolean)
        if (parts.length === 0)
          return null

        return {
          line: `humanlike_memory_recall: ${[
            ...parts,
            `created=${correction.createdAt}`,
          ].join(' | ')}`,
          createdAt: correction.createdAt,
          priority: buildHumanlikeMemoryRecallSeedPriority({
            candidate,
            correction,
            eventCreatedAt: numberFromHumanlikeRecallSeed(event.createdAt, correction.createdAt),
          }).priority,
        }
      }

      const line = buildHumanlikeMemoryRecallSeedLine(candidate, event)
      if (!line)
        return null

      const priorityEntry = buildHumanlikeMemoryRecallSeedPriority({
        candidate,
        correction: null,
        eventCreatedAt: numberFromHumanlikeRecallSeed(event.createdAt, 0),
      })
      return {
        line,
        createdAt: priorityEntry.createdAt,
        priority: priorityEntry.priority,
      }
    })
    .filter((entry): entry is { line: string, createdAt: number, priority: number } => Boolean(entry))
    .sort((left, right) => {
      if (right.priority !== left.priority)
        return right.priority - left.priority
      return right.createdAt - left.createdAt
    })
    .map(entry => entry.line)

  const unique: string[] = []
  for (const line of lines) {
    if (unique.some(existing => existing.toLowerCase() === line.toLowerCase()))
      continue
    unique.push(line)
    if (unique.length >= maxItems)
      break
  }

  return unique.join('\n')
}

export async function resolveHumanlikeMemoryRecallSeedFromEventHistory(input: {
  listHumanlikeMemoryRecallEvents?: (input: {
    kind?: HumanlikeMemoryRecallQueryKind
    limit: number
  }) => Promise<HumanlikeMemoryRecallSeedEvent[]>
  limit?: number
  maxItems?: number
}) {
  if (!input.listHumanlikeMemoryRecallEvents)
    return ''

  const limit = Math.max(1, Math.min(200, Math.floor(input.limit ?? 24)))
  const readEventsSafely = async (kind: HumanlikeMemoryRecallQueryKind) => {
    try {
      const events = await input.listHumanlikeMemoryRecallEvents?.({
        kind,
        limit,
      })
      return Array.isArray(events) ? events : []
    }
    catch {
      return []
    }
  }
  const [candidateEvents, correctionEvents] = await Promise.all([
    readEventsSafely('person-state-updated'),
    readEventsSafely('humanlike-memory-corrected'),
  ])

  return buildHumanlikeMemoryRecallSeedFromMindTurnEvents([
    ...candidateEvents,
    ...correctionEvents,
  ], input.maxItems)
}
