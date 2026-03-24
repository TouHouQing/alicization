import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentKind,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationCommitmentSnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationThreadRuntimeSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { buildEpistemicSurfacePosture } from './epistemic-surface'

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

function stableCommitmentId(kind: AlicizationCommitmentKind, anchor: string) {
  return `commitment::${kind}::${sanitizeText(anchor, 120).toLowerCase() || 'global'}`
}

function ttlMs(kind: AlicizationCommitmentKind) {
  switch (kind) {
    case 'recheck-scene':
    case 'repair-misread':
      return 18 * 60_000
    case 'stay-near':
      return 16 * 60_000
    case 'care-host':
      return 24 * 60_000
    case 'follow-through':
      return 36 * 60_000
    case 'hold-problem':
      return 28 * 60_000
  }
}

function patienceMs(kind: AlicizationCommitmentKind) {
  switch (kind) {
    case 'recheck-scene':
    case 'repair-misread':
      return 6 * 60_000
    case 'stay-near':
      return 8 * 60_000
    case 'care-host':
      return 10 * 60_000
    case 'follow-through':
      return 14 * 60_000
    case 'hold-problem':
      return 12 * 60_000
  }
}

function statusFromPriority(input: {
  priority: number
  previous?: AlicizationCommitmentSnapshot | null
}) {
  if (input.priority >= 0.72)
    return 'active' as const
  if (input.priority >= 0.38)
    return input.previous?.status === 'active' ? 'active' as const : 'forming' as const
  if (input.previous)
    return 'cooling' as const
  return 'forming' as const
}

function findHypothesis(
  graph: AlicizationHypothesisGraphSnapshot | null | undefined,
  kinds: AlicizationHypothesisGraphSnapshot['hypotheses'][number]['kind'][],
) {
  for (const kind of kinds) {
    const match = graph?.hypotheses.find(hypothesis => hypothesis.kind === kind)
    if (match)
      return match
  }
  return null
}

function runtimeThreadByNeed(
  threadRuntime: AlicizationThreadRuntimeStateSnapshot | null | undefined,
  needs: AlicizationThreadRuntimeSnapshot['need'][],
) {
  for (const need of needs) {
    const match = threadRuntime?.threads.find(thread => thread.need === need && thread.status !== 'resolved')
    if (match)
      return match
  }
  return null
}

function buildCommitment(input: {
  now: number
  kind: AlicizationCommitmentKind
  anchor: string
  title: string
  summary: string
  source: AlicizationCommitmentSnapshot['source']
  priority: number
  confidence: number
  targetHypothesisId?: string | null
  targetRuntimeThreadId?: string | null
  targetBeliefId?: string | null
  previous?: AlicizationCommitmentSnapshot | null
}) {
  const id = stableCommitmentId(input.kind, input.anchor)
  const previous = input.previous ?? null
  const priority = clamp01(
    input.priority
    + (previous?.priority ?? 0) * 0.18
    + (previous?.status === 'active' ? 0.06 : previous?.status === 'forming' ? 0.03 : 0),
  )
  return {
    id,
    kind: input.kind,
    status: statusFromPriority({ priority, previous }),
    title: sanitizeText(input.title, 72) || input.kind,
    summary: sanitizeText(input.summary, 180) || input.title,
    source: input.source,
    priority,
    confidence: clamp01(input.confidence + (previous?.confidence ?? 0) * 0.12),
    targetHypothesisId: sanitizeText(input.targetHypothesisId, 160) || null,
    targetRuntimeThreadId: sanitizeText(input.targetRuntimeThreadId, 160) || null,
    targetBeliefId: sanitizeText(input.targetBeliefId, 160) || null,
    createdAt: previous?.createdAt ?? input.now,
    lastRenewedAt: input.now,
    patienceUntil: Math.max(previous?.patienceUntil ?? 0, input.now + patienceMs(input.kind)),
    expiresAt: input.now + ttlMs(input.kind),
  } satisfies AlicizationCommitmentSnapshot
}

function coolCommitment(input: {
  now: number
  previous: AlicizationCommitmentSnapshot
}) {
  const priority = clamp01(input.previous.priority * 0.78 - 0.04)
  if (priority < 0.18)
    return null
  return {
    ...input.previous,
    status: priority >= 0.32 ? 'cooling' : 'released',
    priority,
    confidence: clamp01(input.previous.confidence * 0.9),
    expiresAt: Math.min(input.previous.expiresAt, input.now + 10 * 60_000),
  } satisfies AlicizationCommitmentSnapshot
}

// Commitment ledger is the layer that lets Alicization keep carrying something
// across ticks. Instead of rebuilding concern from scratch every minute, it
// records what she still feels obliged to stay with.
export function buildCommitmentLedger(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  threadRuntime?: AlicizationThreadRuntimeStateSnapshot | null
  previousPrivateThought?: AlicizationPrivateThoughtSnapshot | null
  previous?: AlicizationCommitmentLedgerSnapshot | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
}): AlicizationCommitmentLedgerSnapshot {
  const previous = input.previous ?? null
  const previousById = new Map((previous?.commitments ?? []).map(commitment => [commitment.id, commitment]))
  const epistemicSurface = buildEpistemicSurfacePosture({
    context: input.context,
    worldModel: input.worldModel,
    beliefRevision: input.beliefRevision,
  })
  const focusBelief = input.beliefLedger?.beliefs.find(belief => belief.id === input.beliefLedger?.focusBeliefId) ?? null
  const activeHypothesis = input.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === input.hypothesisGraph?.activeHypothesisId)
    ?? input.hypothesisGraph?.hypotheses[0]
    ?? null
  const problemHypothesis = findHypothesis(input.hypothesisGraph, ['problem-locus', 'live-scene'])
  const careHypothesis = findHypothesis(input.hypothesisGraph, ['care-need', 'recovery-event'])
  const repairHypothesis = findHypothesis(input.hypothesisGraph, ['misread-drift', 'live-scene'])
  const afterglowHypothesis = findHypothesis(input.hypothesisGraph, ['shared-afterglow', 'live-scene'])
  const guidanceThread = runtimeThreadByNeed(input.threadRuntime, ['guidance'])
  const careThread = runtimeThreadByNeed(input.threadRuntime, ['care'])
  const repairThread = runtimeThreadByNeed(input.threadRuntime, ['repair', 'ground-truth'])
  const companionshipThread = runtimeThreadByNeed(input.threadRuntime, ['companionship'])
  const foregroundThread = input.threadRuntime?.threads.find(thread => thread.id === input.threadRuntime?.foregroundThreadId)
    ?? input.threadRuntime?.threads[0]
    ?? null
  const strictTruthTurn = input.dialogueSemantics?.truthExpectation === 'strict'
  const repairTurn = input.dialogueSemantics?.responseNeed === 'repair'
    || input.dialogueSemantics?.act === 'verify-grounding'
    || input.dialogueSemantics?.act === 'correct'
    || input.dialogueSemantics?.act === 'challenge'
  const guidanceTurn = input.dialogueSemantics?.responseNeed === 'guide'
    || input.dialogueSemantics?.responseNeed === 'teach'
    || input.dialogueSemantics?.act === 'ask-help'
    || input.dialogueSemantics?.act === 'ask-teach'
  const careTurn = input.dialogueSemantics?.responseNeed === 'care'
    || input.dialogueSemantics?.act === 'seek-care'
    || input.dialogueSemantics?.act === 'share-state'
  const accompanyTurn = input.dialogueSemantics?.responseNeed === 'accompany'
    || input.dialogueSemantics?.act === 'social-bid'
  const commitments: AlicizationCommitmentSnapshot[] = []
  const seenIds = new Set<string>()

  const maybePush = (commitment: AlicizationCommitmentSnapshot | null) => {
    if (!commitment)
      return
    if (seenIds.has(commitment.id))
      return
    seenIds.add(commitment.id)
    commitments.push(commitment)
  }

  if (
    repairTurn
    || input.previousPrivateThought?.stance === 'uncertain'
    || strictTruthTurn
    || epistemicSurface.requiresRegroundBeforeSurface
    || (
      !epistemicSurface.coarseObservedProblemHolding
      && (
        input.worldModel.epistemicState.certainty !== 'grounded'
        || (input.beliefRevision?.groundingNeed ?? 0) >= 0.44
      )
    )
  ) {
    const anchor = repairHypothesis?.summary
      ?? foregroundThread?.summary
      ?? input.worldModel.activeThread?.summary
      ?? 'live-scene'
    const commitmentId = stableCommitmentId('recheck-scene', anchor)
    maybePush(buildCommitment({
      now: input.now,
      kind: 'recheck-scene',
      anchor,
      title: 'Recheck Scene',
      summary: input.previousPrivateThought?.thoughtText
        ?? input.worldModel.epistemicState.openQuestions[0]
        ?? 'She still wants a cleaner grounding pass before treating this moment as settled.',
      source: input.previousPrivateThought?.stance === 'uncertain' ? 'private-thought' : repairHypothesis ? 'hypothesis' : 'runtime-thread',
      priority: clamp01(
        (input.beliefRevision?.groundingNeed ?? 0.28) * 0.52
        + (input.beliefRevision?.revisionPressure ?? 0) * 0.12
        + (input.worldModel.epistemicState.certainty === 'uncertain' ? 0.18 : input.worldModel.epistemicState.certainty === 'lingering' ? 0.12 : 0)
        + (repairThread?.salience ?? 0) * 0.12
        + (input.previousPrivateThought?.stance === 'uncertain' ? 0.08 : 0)
        + (repairTurn ? 0.2 : 0)
        + (strictTruthTurn ? 0.08 : 0),
      ),
      confidence: clamp01(
        (repairHypothesis?.confidence ?? 0.38) * 0.36
        + (repairThread?.continuity ?? 0.26) * 0.18
        + (input.previousPrivateThought?.confidence ?? 0.4) * 0.16
        + 0.24
        + (input.dialogueSemantics?.confidence ?? 0) * 0.08,
      ),
      targetHypothesisId: repairHypothesis?.id ?? activeHypothesis?.id ?? null,
      targetRuntimeThreadId: repairThread?.id ?? foregroundThread?.id ?? null,
      targetBeliefId: focusBelief?.id ?? null,
      previous: previousById.get(commitmentId) ?? null,
    }))
  }

  if (
    repairTurn
    || repairHypothesis?.kind === 'misread-drift'
    || (input.beliefRevision?.contradictionPressure ?? 0) >= 0.42
    || input.previousPrivateThought?.hypothesisId === repairHypothesis?.id
  ) {
    const anchor = repairHypothesis?.summary ?? focusBelief?.statement ?? foregroundThread?.summary ?? 'repair'
    const commitmentId = stableCommitmentId('repair-misread', anchor)
    maybePush(buildCommitment({
      now: input.now,
      kind: 'repair-misread',
      anchor,
      title: 'Repair Misread',
      summary: repairHypothesis?.summary
        ?? input.previousPrivateThought?.thoughtText
        ?? 'A drift between remembered continuity and the live world is still unresolved.',
      source: repairHypothesis ? 'hypothesis' : input.previousPrivateThought?.stance === 'uncertain' ? 'private-thought' : 'continuity',
      priority: clamp01(
        (input.beliefRevision?.contradictionPressure ?? 0.22) * 0.56
        + (input.beliefRevision?.hostCorrectionWeight ?? 0) * 0.14
        + (repairHypothesis?.salience ?? 0) * 0.18
        + (input.previousPrivateThought?.stance === 'uncertain' ? 0.08 : 0)
        + (repairTurn ? 0.24 : 0),
      ),
      confidence: clamp01(
        (repairHypothesis?.confidence ?? 0.34) * 0.44
        + (input.beliefRevision?.hostCorrectionWeight ?? 0) * 0.14
        + (input.previousPrivateThought?.confidence ?? 0.42) * 0.12
        + 0.22
        + (input.dialogueSemantics?.confidence ?? 0) * 0.08,
      ),
      targetHypothesisId: repairHypothesis?.id ?? null,
      targetRuntimeThreadId: repairThread?.id ?? null,
      targetBeliefId: focusBelief?.id ?? null,
      previous: previousById.get(commitmentId) ?? null,
    }))
  }

  if (
    guidanceTurn
    || input.worldModel.activeThread?.unresolved
    || problemHypothesis?.kind === 'problem-locus'
    || guidanceThread
  ) {
    const anchor = problemHypothesis?.summary ?? input.worldModel.activeThread?.title ?? guidanceThread?.summary ?? 'problem'
    const commitmentId = stableCommitmentId('hold-problem', anchor)
    maybePush(buildCommitment({
      now: input.now,
      kind: 'hold-problem',
      anchor,
      title: 'Hold Problem',
      summary: problemHypothesis?.summary
        ?? guidanceThread?.whyHeld
        ?? input.worldModel.activeThread?.summary
        ?? 'The concrete knot is still alive and should not be dropped.',
      source: problemHypothesis ? 'hypothesis' : guidanceThread ? 'runtime-thread' : 'continuity',
      priority: clamp01(
        (problemHypothesis?.salience ?? 0.34) * 0.34
        + (guidanceThread?.salience ?? 0.28) * 0.18
        + (input.worldModel.activeThread?.significance ?? 0.28) * 0.26
        + (input.worldModel.activeThread?.unresolved ? 0.14 : 0)
        + (input.worldModel.epistemicState.certainty === 'grounded' ? 0.08 : 0)
        + (guidanceTurn ? 0.18 : 0),
      ),
      confidence: clamp01(
        (problemHypothesis?.confidence ?? 0.38) * 0.42
        + (guidanceThread?.continuity ?? 0.3) * 0.14
        + (focusBelief?.confidence ?? 0.42) * 0.12
        + 0.24
        + (input.dialogueSemantics?.confidence ?? 0) * 0.06,
      ),
      targetHypothesisId: problemHypothesis?.id ?? null,
      targetRuntimeThreadId: guidanceThread?.id ?? foregroundThread?.id ?? null,
      targetBeliefId: focusBelief?.id ?? null,
      previous: previousById.get(commitmentId) ?? null,
    }))
  }

  if (
    careTurn
    || careHypothesis
    || careThread
    || input.context.relationship.fatigue >= 55
    || input.context.relationship.lateNightActiveMinutes >= 90
  ) {
    const anchor = careHypothesis?.summary ?? careThread?.summary ?? input.worldModel.activeThread?.summary ?? 'care'
    const commitmentId = stableCommitmentId('care-host', anchor)
    maybePush(buildCommitment({
      now: input.now,
      kind: 'care-host',
      anchor,
      title: 'Care Host',
      summary: careHypothesis?.summary
        ?? careThread?.whyHeld
        ?? 'The host may need care more than commentary right now.',
      source: careHypothesis ? 'hypothesis' : careThread ? 'runtime-thread' : 'continuity',
      priority: clamp01(
        (input.context.relationship.fatigue / 100) * 0.36
        + Math.min(1, input.context.relationship.lateNightActiveMinutes / 180) * 0.18
        + (careHypothesis?.salience ?? 0.24) * 0.2
        + (careThread?.salience ?? 0.2) * 0.14
        + (input.relationshipModel?.approachVector === 'care' ? 0.08 : 0)
        + (careTurn ? 0.18 : 0),
      ),
      confidence: clamp01(
        (careHypothesis?.confidence ?? 0.32) * 0.42
        + (input.context.relationship.fatigue / 100) * 0.14
        + (careThread?.continuity ?? 0.28) * 0.12
        + 0.24
        + (input.dialogueSemantics?.confidence ?? 0) * 0.06,
      ),
      targetHypothesisId: careHypothesis?.id ?? null,
      targetRuntimeThreadId: careThread?.id ?? foregroundThread?.id ?? null,
      targetBeliefId: focusBelief?.id ?? null,
      previous: previousById.get(commitmentId) ?? null,
    }))
  }

  if (
    accompanyTurn
    || afterglowHypothesis?.kind === 'shared-afterglow'
    || companionshipThread
    || input.previousPrivateThought?.stance === 'accompany'
    || input.worldModel.continuity.afterglowOpen
  ) {
    const anchor = afterglowHypothesis?.summary ?? companionshipThread?.summary ?? input.worldModel.activeThread?.summary ?? 'companionship'
    const commitmentId = stableCommitmentId('stay-near', anchor)
    maybePush(buildCommitment({
      now: input.now,
      kind: 'stay-near',
      anchor,
      title: 'Stay Near',
      summary: input.previousPrivateThought?.thoughtText
        ?? afterglowHypothesis?.summary
        ?? companionshipThread?.whyHeld
        ?? 'The shared thread is still warm enough that she wants to remain nearby.',
      source: input.previousPrivateThought?.stance === 'accompany' ? 'private-thought' : afterglowHypothesis ? 'hypothesis' : companionshipThread ? 'runtime-thread' : 'continuity',
      priority: clamp01(
        (afterglowHypothesis?.salience ?? 0.22) * 0.24
        + (companionshipThread?.salience ?? 0.2) * 0.16
        + (input.worldModel.continuity.afterglowOpen ? 0.18 : 0)
        + Math.max(input.context.relationship.boredom, input.context.relationship.loneliness) / 100 * 0.16
        + (input.relationshipModel?.climate === 'attuned' ? 0.08 : 0)
        + (accompanyTurn ? 0.12 : 0),
      ),
      confidence: clamp01(
        (afterglowHypothesis?.confidence ?? 0.32) * 0.34
        + (companionshipThread?.continuity ?? 0.26) * 0.16
        + (input.previousPrivateThought?.confidence ?? 0.4) * 0.12
        + 0.24
        + (input.dialogueSemantics?.confidence ?? 0) * 0.04,
      ),
      targetHypothesisId: afterglowHypothesis?.id ?? null,
      targetRuntimeThreadId: companionshipThread?.id ?? foregroundThread?.id ?? null,
      targetBeliefId: null,
      previous: previousById.get(commitmentId) ?? null,
    }))
  }

  if ((foregroundThread?.continuity ?? 0) >= 0.48 || previous?.governingCommitmentId) {
    const anchor = foregroundThread?.summary
      ?? input.worldModel.activeThread?.summary
      ?? input.previousPrivateThought?.thoughtText
      ?? 'continuity'
    const commitmentId = stableCommitmentId('follow-through', anchor)
    maybePush(buildCommitment({
      now: input.now,
      kind: 'follow-through',
      anchor,
      title: 'Follow Through',
      summary: foregroundThread?.whyHeld
        ?? input.previousPrivateThought?.thoughtText
        ?? 'This thread is not finished just because it slipped out of the immediate foreground.',
      source: foregroundThread ? 'runtime-thread' : input.previousPrivateThought ? 'private-thought' : 'continuity',
      priority: clamp01(
        (foregroundThread?.continuity ?? 0.3) * 0.42
        + (input.worldModel.continuity.afterglowOpen ? 0.14 : 0)
        + (input.worldModel.continuity.sameSceneAsBefore ? 0.08 : 0)
        + (input.previousPrivateThought ? 0.06 : 0),
      ),
      confidence: clamp01(
        (foregroundThread?.salience ?? 0.28) * 0.18
        + (foregroundThread?.continuity ?? 0.28) * 0.22
        + (input.previousPrivateThought?.confidence ?? 0.36) * 0.12
        + 0.22,
      ),
      targetHypothesisId: activeHypothesis?.id ?? null,
      targetRuntimeThreadId: foregroundThread?.id ?? null,
      targetBeliefId: focusBelief?.id ?? null,
      previous: previousById.get(commitmentId) ?? null,
    }))
  }

  for (const previousCommitment of previous?.commitments ?? []) {
    if (seenIds.has(previousCommitment.id))
      continue
    if (previousCommitment.expiresAt <= input.now)
      continue
    maybePush(coolCommitment({
      now: input.now,
      previous: previousCommitment,
    }))
  }

  const ranked = commitments
    .filter(commitment => commitment.status !== 'released')
    .sort((left, right) => {
      const leftScore = left.priority + left.confidence * 0.14 + (left.status === 'active' ? 0.08 : left.status === 'forming' ? 0.04 : 0)
      const rightScore = right.priority + right.confidence * 0.14 + (right.status === 'active' ? 0.08 : right.status === 'forming' ? 0.04 : 0)
      return rightScore - leftScore
    })
    .slice(0, 6)

  const governingCommitment = ranked[0] ?? null
  const activeCount = ranked.filter(commitment => commitment.status === 'active').length
  const carryPressure = clamp01(
    (governingCommitment?.priority ?? 0.18) * 0.46
    + (governingCommitment?.confidence ?? 0.18) * 0.14
    + activeCount * 0.08
    + ranked.length * 0.04
    + (governingCommitment?.kind === 'repair-misread' ? 0.08 : 0)
    + (governingCommitment?.kind === 'care-host' ? 0.08 : 0),
  )

  const narrative = [
    governingCommitment ? `${governingCommitment.kind} is the strongest carried obligation.` : '',
    input.dialogueSemantics ? `current turn is pulling toward ${input.dialogueSemantics.responseNeed}.` : '',
    ranked.some(commitment => commitment.kind === 'repair-misread' || commitment.kind === 'recheck-scene')
      ? 'Grounding work is still being carried internally.'
      : '',
    ranked.some(commitment => commitment.kind === 'stay-near' || commitment.kind === 'follow-through')
      ? 'Continuity is being held across ticks instead of being discarded.'
      : '',
  ].filter(Boolean)

  return {
    governingCommitmentId: governingCommitment?.id ?? null,
    commitments: ranked,
    carryPressure,
    narrative,
    updatedAt: input.now,
  }
}
