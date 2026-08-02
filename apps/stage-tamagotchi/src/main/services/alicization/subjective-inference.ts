import type {
  AlicizationDurabilityPulseSnapshot,
  AlicizationHostGoalHypothesis,
  AlicizationHostIntentCandidateSnapshot,
  AlicizationRelationshipNeed,
  AlicizationRelationshipNeedCandidateSnapshot,
  AlicizationSubjectiveInferenceSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualAttentionSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 200) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeShortLabel(raw: unknown, maxChars = 48) {
  if (typeof raw !== 'string')
    return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxChars)
}

function mergeNotes(...collections: Array<unknown[] | null | undefined>) {
  const notes = [...new Set(collections
    .flatMap(collection => Array.isArray(collection) ? collection : [])
    .map(item => normalizeShortLabel(item))
    .filter(Boolean))]
  const structuredIndex = notes.indexOf('structured-cognition')
  if (structuredIndex > 0) {
    notes.splice(structuredIndex, 1)
    notes.unshift('structured-cognition')
  }
  return notes.slice(0, 8)
}

function interpolate01(base: number, override: number, weight: number) {
  return clamp01(base * (1 - weight) + override * weight)
}

function isSeriousDurabilityPulse(pulse: AlicizationDurabilityPulseSnapshot | null | undefined) {
  return pulse?.kind === 'process-gone'
    || pulse?.kind === 'render-process-gone'
    || pulse?.kind === 'child-process-gone'
    || pulse?.kind === 'anr-likely'
}

const validHostGoals = new Set<AlicizationHostGoalHypothesis>([
  'resolve-problem',
  'inspect-change',
  'consume-media',
  'rest',
  'chat',
  'browse',
  'stay-connected',
  'continue-thread',
  'keep-going',
  'finish-one-more-step',
  'resume-work',
  'unknown',
])

const validRelationshipNeeds = new Set<AlicizationRelationshipNeed>([
  'space',
  'companionship',
  'guidance',
  'care',
  'unclear',
])

function sortHostIntentCandidates(candidates: AlicizationHostIntentCandidateSnapshot[]) {
  return candidates
    .slice()
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function sortRelationshipNeedCandidates(candidates: AlicizationRelationshipNeedCandidateSnapshot[]) {
  return candidates
    .slice()
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function pushHostIntentCandidate(
  candidates: AlicizationHostIntentCandidateSnapshot[],
  goal: AlicizationHostGoalHypothesis,
  confidence: number,
  why: string,
) {
  const normalizedWhy = sanitizeText(why, 180)
  if (!normalizedWhy || !validHostGoals.has(goal))
    return

  const existing = candidates.find(candidate => candidate.goal === goal)
  if (existing) {
    if (confidence > existing.confidence) {
      existing.confidence = clamp01(confidence)
      existing.why = normalizedWhy
    }
    return
  }

  candidates.push({
    goal,
    confidence: clamp01(confidence),
    why: normalizedWhy,
  })
}

function pushRelationshipNeedCandidate(
  candidates: AlicizationRelationshipNeedCandidateSnapshot[],
  need: AlicizationRelationshipNeed,
  confidence: number,
  why: string,
) {
  const normalizedWhy = sanitizeText(why, 180)
  if (!normalizedWhy || !validRelationshipNeeds.has(need))
    return

  const existing = candidates.find(candidate => candidate.need === need)
  if (existing) {
    if (confidence > existing.confidence) {
      existing.confidence = clamp01(confidence)
      existing.why = normalizedWhy
    }
    return
  }

  candidates.push({
    need,
    confidence: clamp01(confidence),
    why: normalizedWhy,
  })
}

function normalizeHostIntentCandidate(raw: unknown): AlicizationHostIntentCandidateSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const goal = candidate.goal
  if (!validHostGoals.has(goal as AlicizationHostGoalHypothesis))
    return null
  const why = sanitizeText(candidate.why, 180)
  if (!why)
    return null
  return {
    goal: goal as AlicizationHostGoalHypothesis,
    confidence: clamp01(Number(candidate.confidence)),
    why,
  }
}

function normalizeRelationshipNeedCandidate(raw: unknown): AlicizationRelationshipNeedCandidateSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  const candidate = raw as Record<string, unknown>
  const need = candidate.need
  if (!validRelationshipNeeds.has(need as AlicizationRelationshipNeed))
    return null
  const why = sanitizeText(candidate.why, 180)
  if (!why)
    return null
  return {
    need: need as AlicizationRelationshipNeed,
    confidence: clamp01(Number(candidate.confidence)),
    why,
  }
}

function topIntentGoal(inference: AlicizationSubjectiveInferenceSnapshot) {
  return inference.hostIntentCandidates[0]?.goal
}

function topRelationshipNeed(inference: AlicizationSubjectiveInferenceSnapshot) {
  return inference.relationshipNeedCandidates[0]?.need
}

export function buildSubjectiveInference(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  scene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  recentTransition: AlicizationVisualTransitionSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
}): AlicizationSubjectiveInferenceSnapshot {
  const hostIntentCandidates: AlicizationHostIntentCandidateSnapshot[] = []
  const relationshipNeedCandidates: AlicizationRelationshipNeedCandidateSnapshot[] = []

  pushHostIntentCandidate(
    hostIntentCandidates,
    input.appraisal.inferredHostGoal,
    Math.max(0.28, input.appraisal.confidence),
    input.appraisal.currentKnot
    ?? input.appraisal.situatedMeaning
    ?? input.worldModel.activeThread?.summary
    ?? 'appraisal.inferred-host-goal',
  )

  if (input.context.content.kind === 'error')
    pushHostIntentCandidate(hostIntentCandidates, 'resolve-problem', 0.86, 'context.content.error')
  if (input.context.content.kind === 'diff')
    pushHostIntentCandidate(hostIntentCandidates, 'inspect-change', 0.82, 'context.content.diff')
  if (input.context.content.kind === 'video' || input.context.content.kind === 'music')
    pushHostIntentCandidate(hostIntentCandidates, 'consume-media', 0.78, 'context.content.media')
  if (input.context.workload.kind === 'chat')
    pushHostIntentCandidate(hostIntentCandidates, 'chat', 0.72, 'context.workload.chat')
  if (input.context.workload.kind === 'browser' || input.context.workload.kind === 'document')
    pushHostIntentCandidate(hostIntentCandidates, 'browse', 0.62, 'context.workload.reading')
  if (input.context.localTime.isLateNight && input.context.relationship.fatigue >= 60)
    pushHostIntentCandidate(hostIntentCandidates, 'rest', 0.68, 'context.relationship.late-night-fatigue')
  if (input.dialogueSemantics?.responseNeed === 'guide' || input.dialogueSemantics?.responseNeed === 'teach') {
    pushHostIntentCandidate(hostIntentCandidates, 'resolve-problem', 0.84, 'dialogue.need.guidance')
  }
  if (input.dialogueSemantics?.act === 'verify-grounding' || input.dialogueSemantics?.responseNeed === 'repair') {
    pushHostIntentCandidate(hostIntentCandidates, 'inspect-change', 0.78, 'dialogue.need.grounding-repair')
  }
  if (input.dialogueSemantics?.responseNeed === 'care') {
    pushHostIntentCandidate(hostIntentCandidates, 'rest', 0.72, 'dialogue.need.care')
  }

  const relationshipNeed = input.appraisal.relationshipNeed ?? 'unclear'
  pushRelationshipNeedCandidate(
    relationshipNeedCandidates,
    relationshipNeed,
    Math.max(0.24, input.appraisal.confidence),
    input.appraisal.situatedMeaning
    ?? input.appraisal.waitingToVerify
    ?? 'appraisal.relationship-need',
  )

  if (input.context.content.kind === 'error' || input.context.content.kind === 'diff')
    pushRelationshipNeedCandidate(relationshipNeedCandidates, 'guidance', 0.82, 'context.content.problem')
  if (input.context.localTime.isLateNight && input.context.relationship.fatigue >= 55)
    pushRelationshipNeedCandidate(relationshipNeedCandidates, 'care', 0.78, 'context.relationship.fatigue')
  if (
    input.context.system.fullscreenLikely
    || input.context.system.inputActivity === 'active'
    || input.worldModel.hostState.availability === 'focused'
    || input.worldModel.hostState.availability === 'immersed'
  ) {
    pushRelationshipNeedCandidate(relationshipNeedCandidates, 'space', 0.74, 'context.host-state.focused')
  }
  if (
    input.context.workload.kind === 'media'
    || input.worldModel.activeThread?.kind === 'co-viewing'
    || (input.watchMode === 'symbiotic-vision' && input.scene?.scenario === 'media')
  ) {
    pushRelationshipNeedCandidate(relationshipNeedCandidates, 'companionship', 0.7, 'context.workload.co-viewing')
  }
  if (input.dialogueSemantics?.responseNeed === 'guide' || input.dialogueSemantics?.responseNeed === 'teach')
    pushRelationshipNeedCandidate(relationshipNeedCandidates, 'guidance', 0.84, 'dialogue.need.guidance')
  if (input.dialogueSemantics?.responseNeed === 'care')
    pushRelationshipNeedCandidate(relationshipNeedCandidates, 'care', 0.8, 'dialogue.need.care')
  if (input.dialogueSemantics?.responseNeed === 'repair')
    pushRelationshipNeedCandidate(relationshipNeedCandidates, 'space', 0.68, 'dialogue.need.repair')

  const dominantInterpretation = sanitizeText(
    input.appraisal.situatedMeaning
    ?? input.worldModel.activeThread?.summary
    ?? input.appraisal.currentKnot
    ?? input.attention?.target?.title
    ?? input.scene?.summary
    ?? '',
    220,
  )

  const situatedMeaning = sanitizeText(
    input.appraisal.situatedMeaning
    ?? dominantInterpretation,
    220,
  )
  || undefined

  const uncertainty = sanitizeText(
    input.appraisal.waitingToVerify
    ?? input.worldModel.epistemicState.openQuestions[0]
    ?? '',
    220,
  )
  || undefined

  const confidence = clamp01(
    input.appraisal.confidence * 0.56
    + (input.scene?.confidence ?? 0.3) * 0.16
    + (input.attention?.confidence ?? 0.3) * 0.12
    + (input.worldModel.activeThread?.confidence ?? 0.28) * 0.1
    + (input.watchMode === 'symbiotic-vision' ? 0.08 : 0.03)
    + (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.08 : 0),
  )

  return {
    dominantInterpretation,
    situatedMeaning,
    selfQuestion: sanitizeText(input.appraisal.waitingToVerify, 220) || undefined,
    uncertainty,
    hostIntentCandidates: sortHostIntentCandidates(hostIntentCandidates),
    relationshipNeedCandidates: sortRelationshipNeedCandidates(relationshipNeedCandidates),
    confidence,
    source: 'heuristic',
    notes: mergeNotes(
      input.appraisal.notes,
      [
        input.dialogueSemantics ? `dialogue-act:${input.dialogueSemantics.act}` : '',
        input.recentTransition ? 'scene-transition' : '',
        input.worldModel.epistemicState.certainty === 'grounded' ? 'world-grounded' : '',
        input.worldModel.epistemicState.certainty === 'lingering' ? 'world-lingering' : '',
        isSeriousDurabilityPulse(input.durabilityPulse) ? 'durability-shock' : '',
      ],
    ),
    updatedAt: input.now,
  }
}

export interface AlicizationSubjectiveInferenceCandidate {
  dominantInterpretation?: string
  situatedMeaning?: string
  selfQuestion?: string
  uncertainty?: string
  hostIntentCandidates?: AlicizationHostIntentCandidateSnapshot[]
  relationshipNeedCandidates?: AlicizationRelationshipNeedCandidateSnapshot[]
  confidence?: number
  notes?: string[]
}

export function parseSubjectiveInferenceCandidate(raw: string): AlicizationSubjectiveInferenceCandidate | null {
  const text = raw.trim()
  if (!text.startsWith('{') || !text.endsWith('}'))
    return null

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(text) as Record<string, unknown>
  }
  catch {
    return null
  }

  const candidate: AlicizationSubjectiveInferenceCandidate = {
    dominantInterpretation: sanitizeText(parsed.dominantInterpretation, 220) || undefined,
    situatedMeaning: sanitizeText(parsed.situatedMeaning, 220) || undefined,
    selfQuestion: sanitizeText(parsed.selfQuestion, 220) || undefined,
    uncertainty: sanitizeText(parsed.uncertainty, 220) || undefined,
    hostIntentCandidates: Array.isArray(parsed.hostIntentCandidates)
      ? sortHostIntentCandidates(parsed.hostIntentCandidates
          .map(normalizeHostIntentCandidate)
          .filter((item): item is AlicizationHostIntentCandidateSnapshot => Boolean(item)))
      : undefined,
    relationshipNeedCandidates: Array.isArray(parsed.relationshipNeedCandidates)
      ? sortRelationshipNeedCandidates(parsed.relationshipNeedCandidates
          .map(normalizeRelationshipNeedCandidate)
          .filter((item): item is AlicizationRelationshipNeedCandidateSnapshot => Boolean(item)))
      : undefined,
    confidence: Number.isFinite(Number(parsed.confidence))
      ? clamp01(Number(parsed.confidence))
      : undefined,
    notes: mergeNotes(Array.isArray(parsed.notes) ? parsed.notes : []),
  }

  const hasSignal = Boolean(
    candidate.dominantInterpretation
    || candidate.situatedMeaning
    || candidate.selfQuestion
    || candidate.uncertainty
    || (candidate.hostIntentCandidates && candidate.hostIntentCandidates.length > 0)
    || (candidate.relationshipNeedCandidates && candidate.relationshipNeedCandidates.length > 0)
    || (candidate.notes && candidate.notes.length > 0),
  )

  return hasSignal ? candidate : null
}

export function mergeSubjectiveInference(
  base: AlicizationSubjectiveInferenceSnapshot,
  candidate: AlicizationSubjectiveInferenceCandidate | null | undefined,
): AlicizationSubjectiveInferenceSnapshot {
  if (!candidate)
    return base

  const overrideConfidence = candidate.confidence ?? base.confidence
  const weight = clamp01(0.36 + overrideConfidence * 0.36)

  return {
    dominantInterpretation: candidate.dominantInterpretation || base.dominantInterpretation,
    situatedMeaning: candidate.situatedMeaning || candidate.dominantInterpretation || base.situatedMeaning,
    selfQuestion: candidate.selfQuestion || base.selfQuestion,
    uncertainty: candidate.uncertainty || base.uncertainty,
    hostIntentCandidates: sortHostIntentCandidates([
      ...(candidate.hostIntentCandidates ?? []),
      ...base.hostIntentCandidates,
    ]),
    relationshipNeedCandidates: sortRelationshipNeedCandidates([
      ...(candidate.relationshipNeedCandidates ?? []),
      ...base.relationshipNeedCandidates,
    ]),
    confidence: interpolate01(base.confidence, overrideConfidence, weight),
    source: 'hybrid',
    notes: mergeNotes(base.notes, candidate.notes, ['structured-cognition']),
    updatedAt: base.updatedAt,
  }
}

export function projectSubjectiveInferenceToAppraisal(input: {
  base: AlicizationSubjectiveSceneAppraisal
  inference: AlicizationSubjectiveInferenceSnapshot
}): AlicizationSubjectiveSceneAppraisal {
  const weight = clamp01(0.3 + input.inference.confidence * 0.34)
  const inferredGoal = topIntentGoal(input.inference)
  const inferredNeed = topRelationshipNeed(input.inference)
  const careBias = inferredNeed === 'care'
    ? 0.12
    : inferredNeed === 'guidance'
      ? 0.04
      : 0
  const desireBias = inferredNeed === 'guidance' || inferredNeed === 'companionship' || inferredNeed === 'care'
    ? 0.04
    : 0
  const interruptionBias = inferredNeed === 'space' ? 0.08 : 0

  return {
    inferredHostGoal: inferredGoal && inferredGoal !== 'unknown'
      ? inferredGoal
      : input.base.inferredHostGoal,
    currentKnot: input.base.currentKnot,
    whatChanged: input.base.whatChanged,
    waitingToVerify: input.inference.uncertainty
      || input.inference.selfQuestion
      || input.base.waitingToVerify,
    situatedMeaning: input.inference.situatedMeaning
      || input.inference.dominantInterpretation
      || input.base.situatedMeaning,
    relationshipNeed: inferredNeed && inferredNeed !== 'unclear'
      ? inferredNeed
      : (input.base.relationshipNeed ?? 'unclear'),
    source: input.inference.source === 'heuristic'
      ? (input.base.source ?? 'heuristic')
      : 'hybrid',
    confidence: interpolate01(input.base.confidence, input.inference.confidence, weight),
    surprise: input.base.surprise,
    carePressure: clamp01(input.base.carePressure + careBias * weight),
    interruptionCost: clamp01(input.base.interruptionCost + interruptionBias * weight),
    desireToSpeak: clamp01(input.base.desireToSpeak + desireBias * weight - (interruptionBias * weight * 0.4)),
    notes: mergeNotes(input.base.notes, input.inference.notes, input.inference.source === 'heuristic' ? [] : ['structured-cognition']),
  }
}
