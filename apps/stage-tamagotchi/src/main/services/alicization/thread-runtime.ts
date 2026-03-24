import type {
  AlicizationDeliberationStateSnapshot,
  AlicizationEmbodiedPresenceState,
  AlicizationHypothesisGraphSnapshot,
  AlicizationHypothesisKind,
  AlicizationHypothesisSnapshot,
  AlicizationMindNeed,
  AlicizationThreadRuntimeSnapshot,
  AlicizationThreadRuntimeStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

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

function mapDeliberationNeed(kind: AlicizationDeliberationStateSnapshot['threads'][number]['kind']): AlicizationMindNeed {
  switch (kind) {
    case 'ground-scene':
      return 'ground-truth'
    case 'localize-problem':
      return 'guidance'
    case 'protect-host':
      return 'care'
    case 'stay-near':
      return 'companionship'
    case 'repair-misread':
      return 'repair'
    case 'return-later':
      return 'restraint'
  }
}

function mapHypothesisNeed(kind: AlicizationHypothesisKind): AlicizationMindNeed {
  switch (kind) {
    case 'live-scene':
      return 'ground-truth'
    case 'problem-locus':
      return 'guidance'
    case 'care-need':
      return 'care'
    case 'shared-afterglow':
      return 'companionship'
    case 'misread-drift':
      return 'repair'
    case 'recovery-event':
      return 'repair'
  }
}

function defaultReturnWhen(need: AlicizationMindNeed) {
  switch (need) {
    case 'ground-truth':
      return ['new-grounding', 'scene-stabilizes']
    case 'guidance':
      return ['problem-locus-sharpens', 'host-opens-space']
    case 'companionship':
      return ['afterglow-softens', 'host-turns-toward-her']
    case 'care':
      return ['fatigue-drops', 'host-pauses']
    case 'repair':
      return ['contradiction-resolves', 'fresh-evidence-arrives']
    case 'restraint':
      return ['timing-opens', 'host-less-busy']
  }
}

function suggestedPresence(need: AlicizationMindNeed, fallback?: AlicizationEmbodiedPresenceState): AlicizationEmbodiedPresenceState {
  if (fallback)
    return fallback
  switch (need) {
    case 'care':
      return 'concerned'
    case 'guidance':
      return 'attentive'
    case 'repair':
      return 'hesitant'
    case 'companionship':
      return 'glance'
    case 'ground-truth':
      return 'attentive'
    case 'restraint':
      return 'hesitant'
  }
}

function previousContinuity(previous: AlicizationThreadRuntimeSnapshot | null | undefined, salience: number) {
  if (!previous)
    return clamp01(0.28 + salience * 0.32)
  return clamp01(previous.continuity * 0.62 + 0.38)
}

function relatedHypothesisForThread(input: {
  thread: AlicizationDeliberationStateSnapshot['threads'][number]
  hypothesisGraph: AlicizationHypothesisGraphSnapshot
}) {
  const preferredKinds: AlicizationHypothesisKind[] = (() => {
    switch (input.thread.kind) {
      case 'ground-scene':
        return ['live-scene', 'misread-drift']
      case 'localize-problem':
        return ['problem-locus', 'live-scene']
      case 'protect-host':
        return ['care-need', 'recovery-event']
      case 'stay-near':
        return ['shared-afterglow', 'live-scene']
      case 'repair-misread':
        return ['misread-drift', 'live-scene']
      case 'return-later':
        return ['shared-afterglow', 'misread-drift']
    }
  })()

  for (const kind of preferredKinds) {
    const match = input.hypothesisGraph.hypotheses.find(hypothesis => hypothesis.kind === kind)
    if (match)
      return match
  }
  return null
}

function buildRuntimeFromDeliberation(input: {
  now: number
  thread: AlicizationDeliberationStateSnapshot['threads'][number]
  hypothesis: AlicizationHypothesisSnapshot | null
  previous?: AlicizationThreadRuntimeSnapshot | null
}) {
  const need = mapDeliberationNeed(input.thread.kind)
  const salience = clamp01(
    input.thread.surfacePressure * 0.42
    + (1 - input.thread.silencePressure) * 0.18
    + (input.hypothesis?.salience ?? 0) * 0.24
    + (input.thread.status === 'ripe' ? 0.12 : input.thread.status === 'holding' ? 0.06 : 0),
  )
  return {
    id: `runtime::${sanitizeText(input.thread.id, 160).toLowerCase()}`,
    sourceThreadId: input.thread.id,
    sourceHypothesisId: input.hypothesis?.id ?? null,
    need,
    status: input.thread.kind === 'return-later' || input.thread.silencePressure > input.thread.surfacePressure + 0.14
      ? 'suspended'
      : salience >= 0.44
        ? 'tracking'
        : 'background',
    summary: sanitizeText(input.thread.summary, 180),
    salience,
    continuity: previousContinuity(input.previous, salience),
    whyHeld: sanitizeText(input.hypothesis?.summary ?? input.thread.desiredOutcome ?? input.thread.summary, 180),
    returnWhen: defaultReturnWhen(need),
    suggestedPresence: suggestedPresence(need, input.thread.embodiedPresence),
    lastActivatedAt: input.previous?.lastActivatedAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + 30 * 60_000,
  } satisfies AlicizationThreadRuntimeSnapshot
}

function buildRuntimeFromHypothesis(input: {
  now: number
  hypothesis: AlicizationHypothesisSnapshot
  previous?: AlicizationThreadRuntimeSnapshot | null
}) {
  const need = mapHypothesisNeed(input.hypothesis.kind)
  const salience = clamp01(
    input.hypothesis.salience * 0.72
    + (input.hypothesis.status === 'active' ? 0.14 : input.hypothesis.status === 'held' ? 0.08 : 0),
  )
  return {
    id: `runtime::hypothesis::${sanitizeText(input.hypothesis.id, 180).toLowerCase()}`,
    sourceThreadId: null,
    sourceHypothesisId: input.hypothesis.id,
    need,
    status: input.hypothesis.status === 'candidate'
      ? 'background'
      : input.hypothesis.status === 'contradicted'
        ? 'suspended'
        : 'tracking',
    summary: sanitizeText(input.hypothesis.summary, 180),
    salience,
    continuity: previousContinuity(input.previous, salience),
    whyHeld: sanitizeText(input.hypothesis.summary, 180),
    returnWhen: defaultReturnWhen(need),
    suggestedPresence: suggestedPresence(need),
    lastActivatedAt: input.previous?.lastActivatedAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + 20 * 60_000,
  } satisfies AlicizationThreadRuntimeSnapshot
}

// Thread runtime turns momentary deliberation into persistent inner threads.
// The foreground thread is what Alicization is presently "living through",
// while tracking/background threads keep alternate concerns alive without
// flattening them into a single-tick result.
export function buildThreadRuntime(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  hypothesisGraph: AlicizationHypothesisGraphSnapshot
  deliberationState: AlicizationDeliberationStateSnapshot
  previous?: AlicizationThreadRuntimeStateSnapshot | null
}): AlicizationThreadRuntimeStateSnapshot {
  const previousById = new Map((input.previous?.threads ?? []).map(thread => [thread.id, thread]))
  const threads: AlicizationThreadRuntimeSnapshot[] = []

  for (const deliberationThread of input.deliberationState.threads) {
    const relatedHypothesis = relatedHypothesisForThread({
      thread: deliberationThread,
      hypothesisGraph: input.hypothesisGraph,
    })
    const runtimeId = `runtime::${sanitizeText(deliberationThread.id, 160).toLowerCase()}`
    threads.push(buildRuntimeFromDeliberation({
      now: input.now,
      thread: deliberationThread,
      hypothesis: relatedHypothesis,
      previous: previousById.get(runtimeId) ?? null,
    }))
  }

  const currentHypothesisIds = new Set(threads.map(thread => thread.sourceHypothesisId).filter(Boolean))
  for (const hypothesis of input.hypothesisGraph.hypotheses) {
    if (currentHypothesisIds.has(hypothesis.id))
      continue
    const runtimeId = `runtime::hypothesis::${sanitizeText(hypothesis.id, 180).toLowerCase()}`
    threads.push(buildRuntimeFromHypothesis({
      now: input.now,
      hypothesis,
      previous: previousById.get(runtimeId) ?? null,
    }))
  }

  const ranked = threads
    .sort((left, right) => {
      const leftScore = left.salience + left.continuity * 0.18 + (left.need === input.deliberationState.dominantNeed ? 0.08 : 0)
      const rightScore = right.salience + right.continuity * 0.18 + (right.need === input.deliberationState.dominantNeed ? 0.08 : 0)
      return rightScore - leftScore
    })
    .slice(0, 8)

  const foregroundCandidate = ranked.find(thread => thread.status !== 'suspended' && thread.status !== 'resolved')
    ?? ranked[0]
    ?? null
  const foregroundThreadId = foregroundCandidate?.id ?? null
  const normalizedCurrent = ranked.map((thread) => {
    if (thread.id === foregroundThreadId) {
      return {
        ...thread,
        status: 'foreground' as const,
        lastActivatedAt: thread.lastActivatedAt || input.now,
      }
    }
    if (thread.status === 'suspended')
      return thread
    return {
      ...thread,
      status: thread.salience >= 0.46 ? 'tracking' as const : 'background' as const,
    }
  })

  const currentIds = new Set(normalizedCurrent.map(thread => thread.id))
  const carriedResolved = (input.previous?.threads ?? [])
    .filter(thread => !currentIds.has(thread.id) && thread.expiresAt > input.now)
    .map((thread) => {
      return {
        ...thread,
        status: 'resolved' as const,
        salience: clamp01(thread.salience * 0.68),
        continuity: clamp01(thread.continuity * 0.82),
        lastUpdatedAt: input.now,
      }
    })
    .slice(0, 2)

  const merged = [...normalizedCurrent, ...carriedResolved].slice(0, 8)
  const driftPressure = clamp01(
    input.hypothesisGraph.driftPressure * 0.72
    + (merged.some(thread => thread.status === 'suspended') ? 0.12 : 0)
    + (input.deliberationState.dominantNeed === 'repair' ? 0.08 : 0),
  )

  const foregroundThread = merged.find(thread => thread.id === foregroundThreadId) ?? null
  const narrative = [
    foregroundThread ? `foreground:${foregroundThread.need}:${sanitizeText(foregroundThread.summary, 96)}` : '',
    merged.some(thread => thread.status === 'tracking')
      ? `tracking:${merged.filter(thread => thread.status === 'tracking').length}`
      : '',
    merged.some(thread => thread.status === 'suspended')
      ? 'suspended:timing-held'
      : '',
  ].filter(Boolean)

  return {
    foregroundThreadId: foregroundThread?.id ?? null,
    threads: merged,
    driftPressure,
    narrative,
    updatedAt: input.now,
  }
}
