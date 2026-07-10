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

function traceListFromHumanlikeRecallSeed(raw: unknown, maxItems = 16, maxChars = 220) {
  if (!Array.isArray(raw))
    return []

  const result: string[] = []
  for (const item of raw) {
    const normalized = sanitizeHumanlikeMemoryText(item, maxChars)
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

function readHumanlikeRecallTraceReason(trace: string[], kind: 'host' | 'self') {
  const entry = trace.find(item => item.startsWith(`${kind}-reason:`))
  if (!entry)
    return ''

  return normalizeHumanlikeSentenceEnding(entry.slice(`${kind}-reason:`.length), 220)
}

function buildAffectivePerspectiveRecallSeedParts(emotionalResidue: Record<string, unknown> | null) {
  if (!emotionalResidue)
    return []

  const trace = traceListFromHumanlikeRecallSeed(emotionalResidue.trace, 16, 220)
  const hostEmotionLabel = readHumanlikeRecallTraceLabel(trace, 'host')
  const hostEmotionSummary = readHumanlikeRecallTraceReason(trace, 'host')
  const selfEmotionLabel = readHumanlikeRecallTraceLabel(trace, 'self')
  const selfEmotionSummary = readHumanlikeRecallTraceReason(trace, 'self')

  return [
    hostEmotionLabel ? `host_emotion_label=${hostEmotionLabel}` : null,
    hostEmotionSummary ? `host_emotion_summary=${hostEmotionSummary}` : null,
    selfEmotionLabel ? `self_emotion_label=${selfEmotionLabel}` : null,
    selfEmotionSummary ? `self_emotion_summary=${selfEmotionSummary}` : null,
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
  const strategy = sanitizeHumanlikeMemoryText(initiativeOutcomeRecord.strategyUpdate, 260)

  return [
    outcome ? `initiative_outcome=${outcome}` : null,
    reaction ? `initiative_reaction=${reaction}` : null,
    strategy ? `initiative_strategy=${strategy}` : null,
  ].filter(Boolean)
}

function buildInitiativeOpportunityRecallSeedParts(initiativeOpportunity: Record<string, unknown> | null) {
  if (!initiativeOpportunity)
    return []

  const suggestedWindow = sanitizeHumanlikeMemoryText(initiativeOpportunity.suggestedWindow, 220)
  const pressure = sanitizeHumanlikeMemoryText(initiativeOpportunity.pressure, 64)
  const antiSpamReason = sanitizeHumanlikeMemoryText(initiativeOpportunity.antiSpamReason, 220)
  const rawVisibleLine = sanitizeHumanlikeMemoryText(initiativeOpportunity.visibleLine, 220)
  const visiblePolicy = rawVisibleLine
    ? rawVisibleLine.startsWith('initiative_visible_policy=')
      ? rawVisibleLine.replace(/^initiative_visible_policy=/iu, '').trim()
      : 'memory_structured_only'
    : ''

  return [
    suggestedWindow ? `initiative_window=${suggestedWindow}` : null,
    pressure ? `initiative_pressure=${pressure}` : null,
    antiSpamReason ? `initiative_anti_spam=${antiSpamReason}` : null,
    visiblePolicy ? `initiative_visible_policy=${visiblePolicy}` : null,
  ].filter(Boolean)
}

function normalizeHumanlikeRecallSeedLinePolicy(rawLine: string) {
  const line = sanitizeHumanlikeMemoryText(rawLine, 260)
  if (!line)
    return ''

  const isStructuredLine
    = /^[a-z]\w*(?:=[^|;]+)?(?:;\s*[a-z]\w*(?:=[^|;]+)?)*$/iu.test(line)
      && /[a-z]\w*=/iu.test(line)
  if (isStructuredLine)
    return line

  return 'recall_line_policy=withheld; reason=provider_generated_only; visibility=memory_structured'
}

function buildCorrectionAwareRecallLine(correctedValue: string) {
  return sanitizeHumanlikeMemoryText(
    `recall_source=host_correction; field=relationship_context; corrected_value=${correctedValue}; posture=relationship_context_not_status_pressure; visibility=memory_structured`,
    260,
  )
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
  const naturalRecallLine = sanitizeHumanlikeMemoryText(input.candidate.naturalRecallLine, 260)
  const whyRemember = sanitizeHumanlikeMemoryText(auditTrail?.whyRemember, 220)
  const emotionalTags = stringListFromHumanlikeRecallSeed(emotionalResidue?.tags, 8)
  const recallCertainty = sanitizeHumanlikeMemoryText(recallPosture?.certainty, 40).toLowerCase()
  const initiativeKind = sanitizeHumanlikeMemoryText(initiativeOpportunity?.kind, 80).toLowerCase()
  const longTermScore = Math.max(0, Math.min(1, numberFromHumanlikeRecallSeed(longTermWorthiness?.score, 0)))

  let priority = 0
  priority += continuityPriorityFromText(
    relationshipSummary,
    naturalRecallLine,
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

function mergeCorrectionAwareReason(
  whyRemember: string,
  correction: HumanlikeMemoryRecallCorrection,
) {
  const parts: string[] = []
  if (whyRemember)
    parts.push(whyRemember)
  parts.push('host correction')
  if (correction.reason)
    parts.push(correction.reason)

  const merged: string[] = []
  for (const part of parts) {
    const normalized = sanitizeHumanlikeMemoryText(part, 220)
    if (!normalized)
      continue
    if (merged.some(existing => existing.toLowerCase() === normalized.toLowerCase()))
      continue
    merged.push(normalized)
  }

  return merged.join(' | ')
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
  const cadenceSummary = sanitizeHumanlikeMemoryText(cadence?.summary, 220)
  const residueSummary = sanitizeHumanlikeMemoryText(affectiveResidue.summary, 220)
  const reasonTags = stringListFromHumanlikeRecallSeed(cadence?.reasonTags, 6)
  const remembersSameHer = reasonTags.some(tag => /same[- ]?her|same[- ]?person|same living line/u.test(tag))
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
  const relationshipSummary = shouldProtectRest
    ? 'relationship_cadence=rest_protective; return_pressure=none; rest_protection=true; source=affective_residue; visibility=memory_structured'
    : hasMeasuredReturnCarry
      ? 'relationship_cadence=measured_return; return_pressure=low; warmth=delayed; source=affective_residue; visibility=memory_structured'
      : 'relationship_cadence=available; return_pressure=low; source=affective_residue; visibility=memory_structured'

  if (!dominantResidueKind && !cadenceMode && !cadenceSummary && !residueSummary)
    return null

  const emotionTags = uniqueHumanlikeRecallSeedTexts([
    dominantResidueKind === 'afterglow' ? 'afterglow-carry' : null,
    dominantResidueKind === 'repair' ? 'repair-residue' : null,
    dominantResidueKind === 'rest-protective' ? 'rest-protective' : null,
    remembersSameHer ? 'protective-continuity' : null,
    shouldDelayWarmth ? 'unfinishedness' : null,
  ], 6, 48)

  const naturalRecallLine = shouldProtectRest
    ? 'relationship_cadence=rest_protective; return_pressure=none; pacing=slower; rest_protection=true; visibility=memory_structured'
    : shouldDelayWarmth || hasMeasuredReturnCarry
      ? 'relationship_cadence=measured_return; return_pressure=low; warmth=delayed; visibility=memory_structured'
      : 'relationship_cadence=available; return_pressure=low; visibility=memory_structured'
  const embodimentSummary = shouldProtectRest
    ? 'relationship_cadence=rest_protective; body_pressure=none; pacing=slower; rest_protection=true; visibility=memory_structured'
    : hasMeasuredReturnCarry
      ? 'relationship_cadence=measured_return; body_pressure=lower; pacing=slower; visibility=memory_structured'
      : 'relationship_cadence=available; body_pressure=low; pacing=natural; visibility=memory_structured'
  const initiativeKind = shouldProtectRest || hasMeasuredReturnCarry
    ? 'low-pressure-follow-up'
    : 'remember-without-prompt'
  const initiativePressure = shouldProtectRest ? 'none' : 'low'
  const worthinessScore = Math.max(0.58, Math.min(
    0.92,
    0.54
    + (dominantResidueKind ? 0.06 : 0)
    + (remembersSameHer ? 0.08 : 0)
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
        'affective residue carry',
        hasMeasuredReturnCarry ? 'relationship cadence carry' : null,
        remembersSameHer ? 'continuity carry' : null,
      ], 4, 80),
    },
    relationshipContext: {
      threadAnchor: 'persisted-affective-residue',
      summary: relationshipSummary,
      primaryIntent: remembersSameHer ? 'same-person-test' : hasMeasuredReturnCarry ? 'continuity-worry' : 'mixed',
    },
    emotionalResidue: {
      tags: emotionTags.length > 0 ? emotionTags : ['low-affect-trace'],
    },
    initiativeOpportunity: {
      kind: initiativeKind,
      suggestedWindow: shouldProtectRest
        ? 'next_rest_safe_window; return_pressure=none; opening=after_rest'
        : 'next_open_window; return_pressure=low; opening=memory_led',
      pressure: initiativePressure,
      antiSpamReason: shouldProtectRest
        ? 'rest_protection_first; repeated_nudge=false; wait_for_host_room=true'
        : 'cadence_memory_only; timer_spam=false; wait_for_visible_reentry=true',
      visibleLine: shouldProtectRest
        ? 'initiative_visible_policy=rest_protective_wait; pressure=none; opening=after_rest; visibility=memory_structured'
        : 'initiative_visible_policy=memory_led_low_pressure; pressure=low; opening=natural_reopen; visibility=memory_structured',
    },
    embodimentTrace: {
      summary: embodimentSummary,
      recallStrength: shouldProtectRest ? 'cautious-avoidance' : 'lightly-noticed',
      expressionState: {
        face: hasMeasuredReturnCarry ? 'steady-soft' : 'neutral-soft',
        gaze: hasMeasuredReturnCarry || remembersSameHer ? 'stable' : 'soft',
        blink: hasMeasuredReturnCarry ? 'slower' : 'natural',
        voice: hasMeasuredReturnCarry ? 'lower-pressure' : 'even',
        pause: hasMeasuredReturnCarry ? 'longer' : 'natural',
        lipsync: hasMeasuredReturnCarry ? 'restrained' : 'matched',
        pacing: hasMeasuredReturnCarry ? 'slower' : 'natural',
      },
    },
    auditTrail: {
      whyRemember: shouldProtectRest
        ? 'affective_residue_cadence=rest_protective; crowding_rest=blocked'
        : 'affective_residue_cadence=measured_return; reopen_eagerness=downranked',
      confidence: worthinessScore,
      correctionSurface: {
        userCorrectableFields: ['relationshipContext', 'naturalRecallLine', 'embodimentTrace'],
      },
    },
    recallPosture: {
      certainty: 'steady',
      reason: hasMeasuredReturnCarry
        ? 'recall_cadence=gentle; remembered_line_settling=true; visibility=memory_structured'
        : 'recall_cadence=light; affective_residue_carry=true; visibility=memory_structured',
    },
    naturalRecallLine,
  }
}

function buildHumanlikeMemoryRecallSeedLine(candidate: Record<string, unknown>, event: HumanlikeMemoryRecallSeedEvent) {
  const eventCreatedAt = numberFromHumanlikeRecallSeed(event.createdAt, 0)
  const relationshipContext = objectFromHumanlikeRecallSeed(candidate.relationshipContext)
  const emotionalResidue = objectFromHumanlikeRecallSeed(candidate.emotionalResidue)
  const initiativeOpportunity = objectFromHumanlikeRecallSeed(candidate.initiativeOpportunity)
  const initiativeOutcomeRecord = objectFromHumanlikeRecallSeed(candidate.initiativeOutcomeRecord)
  const embodimentTrace = objectFromHumanlikeRecallSeed(candidate.embodimentTrace)
  const autobiographicalImpact = objectFromHumanlikeRecallSeed(candidate.autobiographicalImpact)
  const recallPosture = objectFromHumanlikeRecallSeed(candidate.recallPosture)
  const metabolism = objectFromHumanlikeRecallSeed(candidate.metabolism)
  const revisionEvents = Array.isArray(metabolism?.revisionEvents) ? metabolism.revisionEvents : []
  const forgettingPolicy = objectFromHumanlikeRecallSeed(metabolism?.forgettingPolicy)
  const auditTrail = objectFromHumanlikeRecallSeed(candidate.auditTrail)
  const naturalRecallLine = sanitizeHumanlikeMemoryText(candidate.naturalRecallLine, 260)
  const relationshipSummary = sanitizeHumanlikeMemoryText(relationshipContext?.summary, 220)
  const emotionalTags = stringListFromHumanlikeRecallSeed(emotionalResidue?.tags, 6)
  const initiativeKind = sanitizeHumanlikeMemoryText(initiativeOpportunity?.kind, 80)
  const initiativeOpportunityParts = buildInitiativeOpportunityRecallSeedParts(initiativeOpportunity)
  const initiativeOutcomeParts = buildInitiativeOutcomeRecallSeedParts(initiativeOutcomeRecord)
  const embodimentSummary = sanitizeHumanlikeMemoryText(embodimentTrace?.summary, 180)
  const embodimentParts = buildEmbodimentRecallSeedParts(embodimentTrace)
  const affectivePerspectiveParts = buildAffectivePerspectiveRecallSeedParts(emotionalResidue)
  const autobiographicalDelta = sanitizeHumanlikeMemoryText(autobiographicalImpact?.selfNarrativeDelta, 160)
  const recallCertainty = sanitizeHumanlikeMemoryText(recallPosture?.certainty, 40)
  const recallReason = sanitizeHumanlikeMemoryText(recallPosture?.reason, 220)
  const downrankMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.downrankMemoryIds, 8)
  const mergeMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.mergeMemoryIds, 8)
  const forgetMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.forgetMemoryIds, 8)
  const metabolismReasons = uniqueHumanlikeRecallSeedTexts([
    ...stringListFromHumanlikeRecallSeed(forgettingPolicy?.reasons, 4),
    ...revisionEvents.map((entry) => {
      const revision = objectFromHumanlikeRecallSeed(entry)
      return sanitizeHumanlikeMemoryText(revision?.reason, 260) || null
    }),
  ], 6, 260)
  const whyRemember = sanitizeHumanlikeMemoryText(auditTrail?.whyRemember, 220)

  const line = normalizeHumanlikeRecallSeedLinePolicy(naturalRecallLine)
  if (!line)
    return null

  const parts = [
    `line=${line}`,
    relationshipSummary ? `relationship=${relationshipSummary}` : null,
    emotionalTags.length > 0 ? `emotion=${emotionalTags.join(',')}` : null,
    ...affectivePerspectiveParts,
    initiativeKind ? `initiative=${initiativeKind}` : null,
    ...initiativeOpportunityParts,
    ...initiativeOutcomeParts,
    embodimentSummary ? `embodiment=${embodimentSummary}` : null,
    ...embodimentParts,
    autobiographicalDelta ? `self=${autobiographicalDelta}` : null,
    whyRemember ? `why=${whyRemember}` : null,
    recallCertainty ? `certainty=${recallCertainty}` : null,
    recallReason ? `reason=${recallReason}` : null,
    downrankMemoryIds.length > 0 ? `downrank=${downrankMemoryIds.join(',')}` : null,
    mergeMemoryIds.length > 0 ? `merge=${mergeMemoryIds.join(',')}` : null,
    forgetMemoryIds.length > 0 ? `forget=${forgetMemoryIds.join(',')}` : null,
    metabolismReasons.length > 0 ? `metabolism=${metabolismReasons.join(' ; ')}` : null,
    `created=${Math.max(0, Math.floor(numberFromHumanlikeRecallSeed(candidate.createdAt, eventCreatedAt)))}`,
  ].filter(Boolean)

  return `humanlike_memory_recall: ${parts.join(' | ')}`
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

        const relationshipContext = objectFromHumanlikeRecallSeed(normalizedCandidate.relationshipContext)
        const emotionalResidue = objectFromHumanlikeRecallSeed(normalizedCandidate.emotionalResidue)
        const initiativeOpportunity = objectFromHumanlikeRecallSeed(normalizedCandidate.initiativeOpportunity)
        const initiativeOutcomeRecord = objectFromHumanlikeRecallSeed(normalizedCandidate.initiativeOutcomeRecord)
        const embodimentTrace = objectFromHumanlikeRecallSeed(normalizedCandidate.embodimentTrace)
        const autobiographicalImpact = objectFromHumanlikeRecallSeed(normalizedCandidate.autobiographicalImpact)
        const recallPosture = objectFromHumanlikeRecallSeed(normalizedCandidate.recallPosture)
        const metabolism = objectFromHumanlikeRecallSeed(normalizedCandidate.metabolism)
        const revisionEvents = Array.isArray(metabolism?.revisionEvents) ? metabolism.revisionEvents : []
        const forgettingPolicy = objectFromHumanlikeRecallSeed(metabolism?.forgettingPolicy)
        const auditTrail = objectFromHumanlikeRecallSeed(normalizedCandidate.auditTrail)
        const emotionalTags = stringListFromHumanlikeRecallSeed(emotionalResidue?.tags, 6)
        const initiativeKind = sanitizeHumanlikeMemoryText(initiativeOpportunity?.kind, 80)
        const initiativeOpportunityParts = buildInitiativeOpportunityRecallSeedParts(initiativeOpportunity)
        const initiativeOutcomeParts = buildInitiativeOutcomeRecallSeedParts(initiativeOutcomeRecord)
        const embodimentSummary = sanitizeHumanlikeMemoryText(embodimentTrace?.summary, 180)
        const embodimentParts = buildEmbodimentRecallSeedParts(embodimentTrace)
        const affectivePerspectiveParts = buildAffectivePerspectiveRecallSeedParts(emotionalResidue)
        const autobiographicalDelta = sanitizeHumanlikeMemoryText(autobiographicalImpact?.selfNarrativeDelta, 160)
        const recallCertainty = sanitizeHumanlikeMemoryText(recallPosture?.certainty, 40)
        const recallReason = sanitizeHumanlikeMemoryText(recallPosture?.reason, 220)
        const downrankMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.downrankMemoryIds, 8)
        const mergeMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.mergeMemoryIds, 8)
        const forgetMemoryIds = stringListFromHumanlikeRecallSeed(forgettingPolicy?.forgetMemoryIds, 8)
        const metabolismReasons = uniqueHumanlikeRecallSeedTexts([
          ...stringListFromHumanlikeRecallSeed(forgettingPolicy?.reasons, 4),
          ...revisionEvents.map((entry) => {
            const revision = objectFromHumanlikeRecallSeed(entry)
            return sanitizeHumanlikeMemoryText(revision?.reason, 260) || null
          }),
        ], 6, 260)
        const whyRemember = mergeCorrectionAwareReason(
          sanitizeHumanlikeMemoryText(auditTrail?.whyRemember, 220),
          correction,
        )
        const correctedRelationshipSummary = correction.field === 'relationshipContext'
          ? sanitizeHumanlikeMemoryText(`Host corrected this memory meaning: ${normalizeHumanlikeSentenceEnding(correction.correctedValue, 220)}`, 220)
          : sanitizeHumanlikeMemoryText(relationshipContext?.summary, 220)

        const parts = [
          `line=${buildCorrectionAwareRecallLine(correction.correctedValue)}`,
          correctedRelationshipSummary ? `relationship=${correctedRelationshipSummary}` : null,
          emotionalTags.length > 0 ? `emotion=${emotionalTags.join(',')}` : null,
          ...affectivePerspectiveParts,
          initiativeKind ? `initiative=${initiativeKind}` : null,
          ...initiativeOpportunityParts,
          ...initiativeOutcomeParts,
          embodimentSummary ? `embodiment=${embodimentSummary}` : null,
          ...embodimentParts,
          autobiographicalDelta ? `self=${autobiographicalDelta}` : null,
          whyRemember ? `why=${whyRemember}` : null,
          recallCertainty ? `certainty=${recallCertainty}` : null,
          recallReason ? `reason=${recallReason}` : null,
          downrankMemoryIds.length > 0 ? `downrank=${downrankMemoryIds.join(',')}` : null,
          mergeMemoryIds.length > 0 ? `merge=${mergeMemoryIds.join(',')}` : null,
          forgetMemoryIds.length > 0 ? `forget=${forgetMemoryIds.join(',')}` : null,
          metabolismReasons.length > 0 ? `metabolism=${metabolismReasons.join(' ; ')}` : null,
          `created=${correction.createdAt}`,
        ].filter(Boolean)

        return {
          line: `humanlike_memory_recall: ${parts.join(' | ')}`,
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
