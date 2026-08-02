import type {
  AlicizationDurabilityPulseSnapshot,
  AlicizationHostGoalHypothesis,
  AlicizationRelationshipNeed,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualAttentionSnapshot,
  AlicizationVisualEpisode,
  AlicizationVisualSceneSnapshot,
  AlicizationVisualTransitionSnapshot,
  AlicizationVisualWatchMode,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
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
  return [...new Set(collections
    .flatMap(collection => Array.isArray(collection) ? collection : [])
    .map(item => normalizeShortLabel(item))
    .filter(Boolean))]
    .slice(0, 8)
}

function interpolate01(base: number, override: number, weight: number) {
  return clamp01(base * (1 - weight) + override * weight)
}

function inferHostGoal(input: {
  context: AlicizationProactiveLayeredContext
  scene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
}): AlicizationHostGoalHypothesis {
  if (input.worldModel?.activeThread?.kind === 'debugging' || input.worldModel?.activeThread?.kind === 'deep-focus')
    return 'resolve-problem'
  if (input.worldModel?.activeThread?.kind === 'change-review')
    return 'inspect-change'
  if (input.worldModel?.activeThread?.kind === 'co-viewing')
    return 'consume-media'
  if (input.worldModel?.activeThread?.kind === 'late-night-endurance')
    return 'rest'
  if (input.worldModel?.activeThread?.kind === 'chatting')
    return 'chat'
  if (input.worldModel?.activeThread?.kind === 'browsing')
    return 'browse'
  if (input.context.content.kind === 'error')
    return 'resolve-problem'
  if (input.context.content.kind === 'diff')
    return 'inspect-change'
  if (input.context.content.kind === 'video' || input.context.content.kind === 'music')
    return 'consume-media'
  if (input.context.workload.kind === 'chat')
    return 'chat'
  if (input.context.workload.kind === 'browser' || input.context.workload.kind === 'document')
    return 'browse'
  if (input.context.localTime.isLateNight && input.context.relationship.fatigue >= 65)
    return 'rest'
  if (input.context.workload.kind === 'coding' || input.context.workload.kind === 'terminal')
    return 'resolve-problem'
  if (input.scene?.scenario === 'media')
    return 'consume-media'
  return 'unknown'
}

function inferCurrentKnot(input: {
  context: AlicizationProactiveLayeredContext
  scene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  const threadTitle = sanitizeText(input.worldModel?.activeThread?.title, 120)
  if (threadTitle && input.worldModel?.activeThread?.unresolved)
    return threadTitle
  if (input.context.content.kind === 'error')
    return sanitizeText(input.scene?.summary ?? input.attention?.target?.title ?? '当前错误点', 120)
  if (input.context.content.kind === 'diff')
    return sanitizeText(input.scene?.summary ?? input.attention?.target?.title ?? '当前改动块', 120)
  if (input.context.workload.kind === 'coding' && input.attention?.target?.title)
    return sanitizeText(input.attention.target.title, 120)
  return ''
}

function inferSituatedMeaning(input: {
  context: AlicizationProactiveLayeredContext
  scene: AlicizationVisualSceneSnapshot | null
  watchMode: AlicizationVisualWatchMode
  worldModel?: AlicizationWorldModelSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}) {
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return 'situated_meaning.kind=durability_interrupt; foreground=crash_or_freeze_signal; relationship_need=transparent_repair'
  if (input.worldModel?.continuity.afterglowOpen && input.worldModel.activeThread)
    return `situated_meaning.kind=afterglow_thread_carry; thread=${sanitizeText(input.worldModel.activeThread.title, 72) || 'current_thread'}`
  if (input.worldModel?.activeThread?.kind === 'debugging')
    return 'situated_meaning.kind=debugging_focus; attention=concrete_fault'
  if (input.worldModel?.activeThread?.kind === 'change-review')
    return 'situated_meaning.kind=change_review; posture=evaluate_before_continue'
  if (input.worldModel?.activeThread?.kind === 'co-viewing')
    return 'situated_meaning.kind=co_viewing; interruption_pressure=low'
  if (input.worldModel?.activeThread?.kind === 'late-night-endurance')
    return 'situated_meaning.kind=late_night_endurance; fatigue_signal=present'
  if (input.worldModel?.activeThread?.kind === 'deep-focus')
    return 'situated_meaning.kind=deep_focus; work_thread=unresolved'
  if (input.context.content.kind === 'error')
    return 'situated_meaning.kind=error_focus; attention=concrete_fault'
  if (input.context.content.kind === 'diff')
    return 'situated_meaning.kind=change_review; posture=evaluate_before_continue'
  if (input.context.workload.kind === 'media' && input.watchMode === 'symbiotic-vision')
    return 'situated_meaning.kind=co_viewing; interruption_pressure=low'
  if (input.context.localTime.isLateNight && input.context.relationship.fatigue >= 55)
    return 'situated_meaning.kind=late_night_endurance; fatigue_signal=present'
  if (input.context.workload.kind === 'coding' || input.context.workload.kind === 'terminal')
    return 'situated_meaning.kind=deep_focus; work_thread=unresolved'
  if (input.scene?.summary)
    return `situated_meaning.kind=scene_continuity; scene=${sanitizeText(input.scene.summary, 80)}`
  return ''
}

function inferRelationshipNeed(input: {
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  worldModel?: AlicizationWorldModelSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}): AlicizationRelationshipNeed {
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return 'care'
  if (input.worldModel?.epistemicState.certainty === 'lingering')
    return 'unclear'
  if (input.worldModel?.activeThread?.kind === 'late-night-endurance')
    return 'care'
  if (input.worldModel?.activeThread?.kind === 'debugging' || input.worldModel?.activeThread?.kind === 'change-review')
    return 'guidance'
  if (input.worldModel?.activeThread?.kind === 'co-viewing')
    return 'companionship'
  if (input.worldModel?.hostState.availability === 'immersed' || input.worldModel?.hostState.availability === 'focused')
    return 'space'
  if (input.context.localTime.isLateNight && input.context.relationship.fatigue >= 55)
    return 'care'
  if (input.context.content.kind === 'error' || input.context.content.kind === 'diff')
    return 'guidance'
  if (
    (input.context.workload.kind === 'media' || input.context.workload.kind === 'game')
    && !input.context.system.fullscreenLikely
    && (
      input.context.system.inputActivity !== 'active'
      || Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) >= 94
    )
    && Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) >= 88
  ) {
    return 'companionship'
  }
  if (input.context.workload.kind === 'media' && input.watchMode === 'symbiotic-vision')
    return 'companionship'
  if (input.context.system.fullscreenLikely || input.context.system.inputActivity === 'active')
    return 'space'
  if (input.context.workload.kind === 'chat')
    return 'companionship'
  return 'unclear'
}

function inferWaitingToVerify(input: {
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  scene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  const epistemicQuestion = input.worldModel?.epistemicState.openQuestions[0]
  if (epistemicQuestion)
    return epistemicQuestion
  if (input.context.workload.kind === 'coding' && input.watchMode !== 'symbiotic-vision')
    return 'waiting_to_verify=task_blocker; transient_window_as_core_problem=blocked'
  if (input.context.workload.kind === 'media' && input.context.system.inputActivity === 'active')
    return 'waiting_to_verify=media_continuation_or_detach'
  if (input.context.localTime.isLateNight && input.context.relationship.fatigue >= 55)
    return 'waiting_to_verify=late_night_endurance_risk'
  if (!input.scene?.summary)
    return 'waiting_to_verify=scene_stability'
  return ''
}

function inferWhatChanged(input: {
  worldModel?: AlicizationWorldModelSnapshot | null
  recentTransition: AlicizationVisualTransitionSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
}) {
  if (isSeriousDurabilityPulse(input.durabilityPulse))
    return 'foreground_world=crash_or_freeze_signal'
  if (input.worldModel?.continuity.label === 'afterglow')
    return 'world_transition=afterglow; shared_view_thread=not_closed'
  if (input.worldModel?.continuity.label === 'scene-shift')
    return 'world_transition=scene_shift; thread_switch_uncertain=true'
  if (input.worldModel?.continuity.label === 'reacquired')
    return 'world_transition=reacquired; foreground_target_matches_carried_clue=true'
  if (!input.recentTransition)
    return ''
  if (input.recentTransition.fromWatchMode === 'symbiotic-vision' && input.recentTransition.toWatchMode !== 'symbiotic-vision')
    return 'world_transition=symbiotic_vision_exit'
  if (input.recentTransition.toWatchMode === 'invited-inspection')
    return 'world_transition=invited_inspection_entered'
  return sanitizeText(input.recentTransition.reason, 120)
}

export function buildSubjectiveSceneAppraisal(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  watchMode: AlicizationVisualWatchMode
  scene: AlicizationVisualSceneSnapshot | null
  attention: AlicizationVisualAttentionSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  recentTransition: AlicizationVisualTransitionSnapshot | null
  durabilityPulse?: AlicizationDurabilityPulseSnapshot | null
  workingMemoryEpisodes?: AlicizationVisualEpisode[]
}): AlicizationSubjectiveSceneAppraisal {
  const inferredHostGoal = inferHostGoal({
    context: input.context,
    scene: input.scene,
    worldModel: input.worldModel,
  })
  const currentKnot = inferCurrentKnot({
    context: input.context,
    scene: input.scene,
    attention: input.attention,
    worldModel: input.worldModel,
  })
  const waitingToVerify = inferWaitingToVerify({
    context: input.context,
    watchMode: input.watchMode,
    scene: input.scene,
    worldModel: input.worldModel,
  })
  const whatChanged = inferWhatChanged({
    worldModel: input.worldModel,
    recentTransition: input.recentTransition,
    durabilityPulse: input.durabilityPulse,
  })
  const situatedMeaning = inferSituatedMeaning({
    context: input.context,
    scene: input.scene,
    watchMode: input.watchMode,
    worldModel: input.worldModel,
    durabilityPulse: input.durabilityPulse,
  })
  const relationshipNeed = inferRelationshipNeed({
    context: input.context,
    watchMode: input.watchMode,
    worldModel: input.worldModel,
    durabilityPulse: input.durabilityPulse,
  })
  const longSharedThread = (input.workingMemoryEpisodes ?? [])
    .some(episode => episode.emotionalTension === 'tense-debug' || episode.emotionalTension === 'late-night-drain')
  const surprise = clamp01(
    (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.92 : 0)
    + (input.recentTransition ? 0.18 : 0)
    + (longSharedThread ? 0.08 : 0),
  )
  const carePressure = clamp01(
    (input.context.relationship.fatigue / 100) * 0.38
    + (input.context.content.kind === 'error' ? 0.24 : 0)
    + (input.context.content.kind === 'diff' ? 0.14 : 0)
    + (input.context.localTime.isLateNight && input.context.relationship.lateNightActiveMinutes >= 90 ? 0.22 : 0)
    + (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.35 : 0)
    + (input.worldModel.activeThread?.significance ?? 0) * 0.18
    + (input.worldModel.hostState.burden === 'heavy' ? 0.08 : 0),
  )
  const interruptionCost = clamp01(
    (input.context.system.fullscreenLikely ? 0.72 : 0)
    + (input.context.system.cpuUsage >= 70 ? 0.64 : 0)
    + (input.context.system.inputActivity === 'active' ? 0.22 : 0)
    + (input.watchMode === 'symbiotic-vision' && input.context.workload.kind === 'media' ? 0.18 : 0)
    + (input.worldModel.hostState.availability === 'focused' || input.worldModel.hostState.availability === 'immersed' ? 0.12 : 0),
  )
  const desireToSpeak = clamp01(
    0.18
    + carePressure * 0.55
    + surprise * 0.25
    + (currentKnot ? 0.12 : 0)
    + (input.context.relationship.loneliness >= 92 ? 0.08 : 0)
    + (input.worldModel.activeThread?.unresolved ? 0.1 : 0)
    + (input.worldModel.continuity.afterglowOpen ? 0.08 : 0)
    - interruptionCost * 0.4,
  )
  const confidence = clamp01(
    (input.scene?.confidence ?? 0.32) * 0.38
    + (input.attention?.confidence ?? 0.32) * 0.24
    + (input.watchMode === 'symbiotic-vision' ? 0.14 : 0.04)
    + (isSeriousDurabilityPulse(input.durabilityPulse) ? 0.08 : 0)
    + (input.worldModel.activeThread?.confidence ?? 0.22) * 0.16
    + (input.worldModel.epistemicState.certainty === 'grounded' ? 0.08 : input.worldModel.epistemicState.certainty === 'observed' ? 0.04 : 0),
  )
  const notes = [
    input.context.content.kind === 'error' ? 'error-visible' : '',
    input.context.content.kind === 'diff' ? 'diff-visible' : '',
    input.context.localTime.isLateNight ? 'late-night' : '',
    input.watchMode === 'symbiotic-vision' ? 'shared-presence' : '',
    input.recentTransition ? 'state-shift' : '',
    isSeriousDurabilityPulse(input.durabilityPulse) ? 'durability-shock' : '',
    longSharedThread ? 'memory-thread' : '',
    input.worldModel.epistemicState.certainty === 'grounded' ? 'world-grounded' : '',
    input.worldModel.epistemicState.certainty === 'lingering' ? 'world-lingering' : '',
    input.worldModel.activeThread ? `thread-${input.worldModel.activeThread.kind}` : '',
  ].filter(Boolean)

  return {
    inferredHostGoal,
    currentKnot: currentKnot || undefined,
    whatChanged: whatChanged || undefined,
    waitingToVerify: waitingToVerify || undefined,
    situatedMeaning: situatedMeaning || undefined,
    relationshipNeed,
    source: 'heuristic',
    confidence,
    surprise,
    carePressure,
    interruptionCost,
    desireToSpeak,
    notes,
  }
}

export interface AlicizationSubjectiveSceneAppraisalCandidate {
  inferredHostGoal?: AlicizationHostGoalHypothesis
  currentKnot?: string
  whatChanged?: string
  waitingToVerify?: string
  situatedMeaning?: string
  relationshipNeed?: AlicizationRelationshipNeed
  confidence?: number
  surprise?: number
  carePressure?: number
  interruptionCost?: number
  desireToSpeak?: number
  notes?: string[]
}

function normalizeHostGoal(raw: unknown) {
  return validHostGoals.has(raw as AlicizationHostGoalHypothesis)
    ? raw as AlicizationHostGoalHypothesis
    : undefined
}

function normalizeRelationshipNeed(raw: unknown) {
  return validRelationshipNeeds.has(raw as AlicizationRelationshipNeed)
    ? raw as AlicizationRelationshipNeed
    : undefined
}

function normalizeOptional01(raw: unknown) {
  const parsed = Number(raw)
  return Number.isFinite(parsed)
    ? clamp01(parsed)
    : undefined
}

export function parseSubjectiveSceneAppraisalCandidate(raw: string): AlicizationSubjectiveSceneAppraisalCandidate | null {
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

  const candidate: AlicizationSubjectiveSceneAppraisalCandidate = {
    inferredHostGoal: normalizeHostGoal(parsed.inferredHostGoal),
    currentKnot: sanitizeText(parsed.currentKnot, 120) || undefined,
    whatChanged: sanitizeText(parsed.whatChanged, 160) || undefined,
    waitingToVerify: sanitizeText(parsed.waitingToVerify, 160) || undefined,
    situatedMeaning: sanitizeText(parsed.situatedMeaning, 180) || undefined,
    relationshipNeed: normalizeRelationshipNeed(parsed.relationshipNeed),
    confidence: normalizeOptional01(parsed.confidence),
    surprise: normalizeOptional01(parsed.surprise),
    carePressure: normalizeOptional01(parsed.carePressure),
    interruptionCost: normalizeOptional01(parsed.interruptionCost),
    desireToSpeak: normalizeOptional01(parsed.desireToSpeak),
    notes: mergeNotes(Array.isArray(parsed.notes) ? parsed.notes : []),
  }

  const hasSignal = Boolean(
    candidate.inferredHostGoal
    || candidate.currentKnot
    || candidate.whatChanged
    || candidate.waitingToVerify
    || candidate.situatedMeaning
    || candidate.relationshipNeed
    || (candidate.notes && candidate.notes.length > 0),
  )

  return hasSignal ? candidate : null
}

export function mergeSubjectiveSceneAppraisal(
  base: AlicizationSubjectiveSceneAppraisal,
  candidate: AlicizationSubjectiveSceneAppraisalCandidate | null | undefined,
): AlicizationSubjectiveSceneAppraisal {
  if (!candidate)
    return base

  const overrideConfidence = candidate.confidence ?? base.confidence
  const weight = clamp01(0.38 + overrideConfidence * 0.32)

  return {
    inferredHostGoal: candidate.inferredHostGoal && candidate.inferredHostGoal !== 'unknown'
      ? candidate.inferredHostGoal
      : base.inferredHostGoal,
    currentKnot: candidate.currentKnot || base.currentKnot,
    whatChanged: candidate.whatChanged || base.whatChanged,
    waitingToVerify: candidate.waitingToVerify || base.waitingToVerify,
    situatedMeaning: candidate.situatedMeaning || base.situatedMeaning,
    relationshipNeed: candidate.relationshipNeed && candidate.relationshipNeed !== 'unclear'
      ? candidate.relationshipNeed
      : (base.relationshipNeed ?? 'unclear'),
    source: 'hybrid',
    confidence: interpolate01(base.confidence, overrideConfidence, weight),
    surprise: interpolate01(base.surprise, candidate.surprise ?? base.surprise, weight),
    carePressure: interpolate01(base.carePressure, candidate.carePressure ?? base.carePressure, weight),
    interruptionCost: interpolate01(base.interruptionCost, candidate.interruptionCost ?? base.interruptionCost, weight),
    desireToSpeak: interpolate01(base.desireToSpeak, candidate.desireToSpeak ?? base.desireToSpeak, weight),
    notes: mergeNotes(base.notes, candidate.notes, ['structured-cognition']),
  }
}
