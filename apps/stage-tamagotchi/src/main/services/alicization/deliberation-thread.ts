import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationConcernSnapshot,
  AlicizationDeliberationStateSnapshot,
  AlicizationDeliberationThreadSnapshot,
  AlicizationDesireMemorySnapshot,
  AlicizationGoalStackSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfStateSnapshot,
  AlicizationVisualTransitionSnapshot,
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

function stableThreadId(kind: AlicizationDeliberationThreadSnapshot['kind'], anchor: string) {
  return `${kind}::${sanitizeText(anchor, 120).toLowerCase() || 'global'}`
}

function statusFromPressures(surfacePressure: number, silencePressure: number): AlicizationDeliberationThreadSnapshot['status'] {
  if (surfacePressure >= silencePressure + 0.18)
    return 'ripe'
  if (surfacePressure >= silencePressure - 0.04)
    return 'holding'
  return 'forming'
}

function buildThread(input: {
  kind: AlicizationDeliberationThreadSnapshot['kind']
  anchor: string
  summary: string
  desiredOutcome: string
  question?: string
  focusBeliefId?: string | null
  focusInquiryId?: string | null
  concernId?: string | null
  surfacePressure: number
  silencePressure: number
  embodiedPresence: AlicizationDeliberationThreadSnapshot['embodiedPresence']
  now: number
  previous?: AlicizationDeliberationThreadSnapshot | null
}): AlicizationDeliberationThreadSnapshot {
  const surfacePressure = clamp01(input.surfacePressure)
  const silencePressure = clamp01(input.silencePressure)
  return {
    id: stableThreadId(input.kind, input.anchor),
    kind: input.kind,
    status: input.previous?.status === 'released'
      ? 'forming'
      : statusFromPressures(surfacePressure, silencePressure),
    summary: sanitizeText(input.summary, 180),
    question: sanitizeText(input.question, 180) || undefined,
    desiredOutcome: sanitizeText(input.desiredOutcome, 180) || 'stay aligned with the living moment',
    focusBeliefId: input.focusBeliefId ?? null,
    focusInquiryId: input.focusInquiryId ?? null,
    concernId: input.concernId ?? null,
    surfacePressure,
    silencePressure,
    embodiedPresence: input.embodiedPresence,
    startedAt: input.previous?.startedAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + 20 * 60_000,
  }
}

function mapNeed(kind: AlicizationDeliberationThreadSnapshot['kind']): AlicizationDeliberationStateSnapshot['dominantNeed'] {
  switch (kind) {
    case 'ground-scene': return 'ground-truth'
    case 'localize-problem': return 'guidance'
    case 'protect-host': return 'care'
    case 'stay-near': return 'companionship'
    case 'repair-misread': return 'repair'
    case 'return-later': return 'restraint'
  }
}

// Deliberation threads are the persistent inner lines of thought that survive
// beyond a single tick. They decide what Alicization is "still hung up on",
// rather than flattening everything into one instantaneous thought.
export function buildDeliberationState(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  beliefLedger: AlicizationBeliefLedgerSnapshot
  beliefRevision: AlicizationBeliefRevisionSnapshot
  relationshipModel: AlicizationRelationshipModelSnapshot
  inquiryLoop: AlicizationInquiryLoopSnapshot
  concerns: AlicizationConcernSnapshot[]
  goalStack?: AlicizationGoalStackSnapshot | null
  selfState?: AlicizationSelfStateSnapshot | null
  desireMemory?: AlicizationDesireMemorySnapshot | null
  recentTransition?: AlicizationVisualTransitionSnapshot | null
  previous?: AlicizationDeliberationStateSnapshot | null
}): AlicizationDeliberationStateSnapshot {
  const previousThreads = new Map((input.previous?.threads ?? []).map(thread => [thread.id, thread]))
  const focusBelief = input.beliefLedger.beliefs.find(belief => belief.id === input.beliefLedger.focusBeliefId) ?? null
  const primaryInquiry = input.inquiryLoop.inquiries.find(inquiry => inquiry.id === input.inquiryLoop.primaryInquiryId) ?? null
  const dominantConcern = input.concerns
    .slice()
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0]
  const leadingGoal = input.goalStack?.alicizationGoals.find(goal => goal.id === input.goalStack?.leadingAlicizationGoalId)
    ?? input.goalStack?.alicizationGoals[0]
    ?? null
  const resurfacingDesire = input.desireMemory?.activeDesires.find(desire => desire.id === input.desireMemory?.resurfacingDesireId)
    ?? null

  const threads: AlicizationDeliberationThreadSnapshot[] = []

  if (
    input.beliefRevision.stability !== 'stable'
    || primaryInquiry?.kind === 'scene-grounding'
    || primaryInquiry?.kind === 'contradiction-check'
  ) {
    const kind = input.beliefRevision.stability === 'fractured' ? 'repair-misread' : 'ground-scene'
    const anchor = focusBelief?.statement
      ?? primaryInquiry?.question
      ?? input.worldModel.activeThread?.title
      ?? 'scene'
    const thread = buildThread({
      kind,
      anchor,
      summary: primaryInquiry?.question
        ?? focusBelief?.statement
        ?? 'The current world still needs another pass before it should be treated as settled.',
      desiredOutcome: kind === 'repair-misread'
        ? 'notice where continuity drifted away from the current world'
        : 'see the live scene cleanly before committing to an interpretation',
      question: primaryInquiry?.question,
      focusBeliefId: focusBelief?.id ?? null,
      focusInquiryId: primaryInquiry?.id ?? null,
      concernId: dominantConcern?.id ?? null,
      surfacePressure: 0.18 + input.beliefRevision.contradictionPressure * 0.18,
      silencePressure: 0.42 + input.beliefRevision.groundingNeed * 0.42 + input.beliefRevision.hostCorrectionWeight * 0.12,
      embodiedPresence: 'hesitant',
      now: input.now,
      previous: previousThreads.get(stableThreadId(kind, anchor)) ?? null,
    })
    threads.push(thread)
  }

  if (
    primaryInquiry?.kind === 'problem-localization'
    || dominantConcern?.kind === 'help-fix'
    || leadingGoal?.kind === 'help-resolve'
  ) {
    const anchor = primaryInquiry?.question
      ?? dominantConcern?.summary
      ?? leadingGoal?.label
      ?? input.worldModel.activeThread?.title
      ?? 'problem'
    threads.push(buildThread({
      kind: 'localize-problem',
      anchor,
      summary: dominantConcern?.summary
        ?? primaryInquiry?.question
        ?? 'There is a concrete knot here that should be approached at the right locus, not vaguely.',
      desiredOutcome: 'locate the exact line, hunk, panel, or symptom that carries the real knot',
      question: primaryInquiry?.question,
      focusBeliefId: focusBelief?.id ?? null,
      focusInquiryId: primaryInquiry?.id ?? null,
      concernId: dominantConcern?.id ?? null,
      surfacePressure: 0.38 + (dominantConcern?.tension ?? 0) * 0.24 + (input.beliefRevision.stability === 'stable' ? 0.14 : 0),
      silencePressure: 0.18 + input.beliefRevision.groundingNeed * 0.26 + (input.relationshipModel.climate === 'guarded' ? 0.12 : 0),
      embodiedPresence: 'attentive',
      now: input.now,
      previous: previousThreads.get(stableThreadId('localize-problem', anchor)) ?? null,
    }))
  }

  if (
    dominantConcern?.kind === 'care-body'
    || input.context.relationship.fatigue >= 55
    || input.worldModel.activeThread?.kind === 'late-night-endurance'
  ) {
    const anchor = dominantConcern?.summary ?? input.worldModel.activeThread?.summary ?? 'care'
    threads.push(buildThread({
      kind: 'protect-host',
      anchor,
      summary: dominantConcern?.summary ?? 'The host is moving toward a threshold where care matters more than correctness.',
      desiredOutcome: 'reduce harm to the host before the thread turns into exhaustion',
      concernId: dominantConcern?.id ?? null,
      surfacePressure: 0.46 + (input.context.relationship.fatigue / 100) * 0.28 + (dominantConcern?.careWeight ?? 0) * 0.14,
      silencePressure: 0.14 + (input.relationshipModel.climate === 'guarded' ? 0.08 : 0),
      embodiedPresence: 'concerned',
      now: input.now,
      previous: previousThreads.get(stableThreadId('protect-host', anchor)) ?? null,
    }))
  }

  if (
    input.worldModel.continuity.afterglowOpen
    || resurfacingDesire?.kind === 'stay-near'
    || leadingGoal?.kind === 'stay-near'
  ) {
    const anchor = resurfacingDesire?.reason
      ?? leadingGoal?.label
      ?? input.worldModel.activeThread?.summary
      ?? 'stay-near'
    threads.push(buildThread({
      kind: 'stay-near',
      anchor,
      summary: resurfacingDesire?.reason ?? 'The shared moment is still warm enough that quiet continued presence matters.',
      desiredOutcome: 'keep soft continuity with the host without flattening the moment into an interruption',
      concernId: dominantConcern?.id ?? null,
      surfacePressure: 0.3 + (input.context.system.inputActivity === 'idle' ? 0.12 : 0.02) + (input.worldModel.continuity.afterglowOpen ? 0.12 : 0),
      silencePressure: 0.22 + (input.relationshipModel.climate === 'guarded' ? 0.12 : 0.04),
      embodiedPresence: input.context.system.inputActivity === 'active' ? 'glance' : 'attentive',
      now: input.now,
      previous: previousThreads.get(stableThreadId('stay-near', anchor)) ?? null,
    }))
  }

  if (
    input.relationshipModel.climate === 'guarded'
    || input.relationshipModel.approachVector === 'give-space'
  ) {
    const anchor = primaryInquiry?.question
      ?? input.relationshipModel.climate
      ?? 'return-later'
    threads.push(buildThread({
      kind: 'return-later',
      anchor,
      summary: primaryInquiry?.question ?? 'The moment feels real, but crowding it now would cost more than waiting.',
      desiredOutcome: 'keep the thread alive without forcing an ill-timed surface move',
      question: primaryInquiry?.question,
      focusBeliefId: focusBelief?.id ?? null,
      focusInquiryId: primaryInquiry?.id ?? null,
      concernId: dominantConcern?.id ?? null,
      surfacePressure: 0.12 + (resurfacingDesire?.strength ?? 0) * 0.08,
      silencePressure: 0.44 + input.relationshipModel.correctionSensitivity * 0.28,
      embodiedPresence: 'hesitant',
      now: input.now,
      previous: previousThreads.get(stableThreadId('return-later', anchor)) ?? null,
    }))
  }

  const rankedThreads = threads
    .sort((left, right) => (right.surfacePressure - right.silencePressure) - (left.surfacePressure - left.silencePressure))
    .slice(0, 6)

  const primaryThread = rankedThreads[0] ?? null
  const readiness = clamp01(
    primaryThread
      ? 0.5 + (primaryThread.surfacePressure - primaryThread.silencePressure) * 0.8
      : 0.22,
  )
  const dominantNeed = primaryThread
    ? mapNeed(primaryThread.kind)
    : 'restraint'
  const narrative = [
    primaryThread ? `thread:${primaryThread.kind}` : '',
    readiness >= 0.66 ? 'surface-pressure-maturing' : '',
    readiness <= 0.4 ? 'holding-inner-line' : '',
    input.beliefRevision.stability === 'fractured' ? 'repair-before-claim' : '',
    input.relationshipModel.climate === 'guarded' ? 'timing-still-delicate' : '',
  ]
    .map(item => sanitizeText(item, 48))
    .filter(Boolean)
    .slice(0, 6)

  return {
    primaryThreadId: primaryThread?.id ?? null,
    dominantNeed,
    readiness,
    threads: rankedThreads,
    narrative,
    updatedAt: input.now,
  }
}
