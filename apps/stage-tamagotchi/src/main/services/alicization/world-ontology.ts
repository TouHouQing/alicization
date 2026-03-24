import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationLivingWorldStateSnapshot,
  AlicizationVisualEpisode,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldFrameKind,
  AlicizationWorldFrameSnapshot,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
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

function buildFrame(input: {
  kind: AlicizationWorldFrameKind
  summary: string
  confidence: number
  stability: number
  focusThreadId?: string | null
  focusBeliefId?: string | null
  focusHypothesisId?: string | null
  evidence?: string[]
}): AlicizationWorldFrameSnapshot | null {
  const summary = sanitizeText(input.summary, 220)
  if (!summary)
    return null
  return {
    kind: input.kind,
    summary,
    confidence: clamp01(input.confidence),
    stability: clamp01(input.stability),
    focusThreadId: sanitizeText(input.focusThreadId, 160) || null,
    focusBeliefId: sanitizeText(input.focusBeliefId, 160) || null,
    focusHypothesisId: sanitizeText(input.focusHypothesisId, 160) || null,
    evidence: [...new Set((input.evidence ?? []).map(item => sanitizeText(item, 120)).filter(Boolean))].slice(0, 8),
  }
}

function latestEpisode(episodes: AlicizationVisualEpisode[] | undefined | null) {
  return (episodes ?? [])
    .slice()
    .sort((left, right) => right.endedAt - left.endedAt)[0]
    ?? null
}

function describeLiveWorld(input: {
  scene?: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
}) {
  const activeThread = input.worldModel.activeThread
  const source = activeThread?.source ?? null
  const liveSource = source === 'grounded-scene' || source === 'observed-scene' || source === 'durability-pulse'
  if (!liveSource && !input.scene)
    return null

  const focusObject = input.livingWorldState?.objects.find(object => object.id === input.livingWorldState?.focusObjectId)
    ?? input.livingWorldState?.objects[0]
    ?? null
  const summary = sanitizeText(
    activeThread?.summary
    ?? input.scene?.summary
    ?? focusObject?.summary
    ?? '',
    220,
  )
  if (!summary)
    return null

  const confidence = Math.max(
    activeThread?.confidence ?? 0,
    input.scene?.confidence ?? 0,
  )
  const stability = clamp01(
    (input.worldModel.epistemicState.certainty === 'grounded' ? 0.9 : input.worldModel.epistemicState.certainty === 'observed' ? 0.7 : 0.42)
    + (input.worldModel.epistemicState.freshness === 'live' ? 0.08 : input.worldModel.epistemicState.freshness === 'recent' ? 0.02 : -0.12),
  )
  return buildFrame({
    kind: 'live',
    summary,
    confidence,
    stability,
    focusThreadId: activeThread?.id ?? null,
    evidence: [
      activeThread?.source ? `source:${activeThread.source}` : '',
      `certainty:${input.worldModel.epistemicState.certainty}`,
      `freshness:${input.worldModel.epistemicState.freshness}`,
      input.scene?.source ? `scene:${input.scene.source}` : '',
    ],
  })
}

function describeRememberedWorld(input: {
  worldModel: AlicizationWorldModelSnapshot
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  workingMemoryEpisodes?: AlicizationVisualEpisode[]
}) {
  const memoryBelief = input.beliefLedger?.beliefs.find(belief => belief.source === 'memory' && belief.status !== 'released') ?? null
  const lingeringThread = input.worldModel.continuity.afterglowOpen
    ? input.worldModel.activeThread
    : input.worldModel.lingeringThreads[0] ?? null
  const episode = latestEpisode(input.workingMemoryEpisodes)
  const summary = sanitizeText(
    lingeringThread?.summary
    ?? memoryBelief?.statement
    ?? episode?.summary
    ?? '',
    220,
  )
  if (!summary)
    return null
  return buildFrame({
    kind: 'remembered',
    summary,
    confidence: Math.max(
      lingeringThread?.confidence ?? 0,
      memoryBelief?.confidence ?? 0,
      episode?.confidence ?? 0,
    ),
    stability: clamp01(
      (input.worldModel.continuity.afterglowOpen ? 0.72 : 0.54)
      + (memoryBelief?.status === 'held' ? 0.08 : 0)
      + (episode?.sedimentCandidate ? 0.08 : 0),
    ),
    focusThreadId: lingeringThread?.id ?? null,
    focusBeliefId: memoryBelief?.id ?? null,
    evidence: [
      input.worldModel.continuity.afterglowOpen ? 'continuity:afterglow-open' : `continuity:${input.worldModel.continuity.label}`,
      lingeringThread?.kind ? `thread:${lingeringThread.kind}` : '',
      episode?.emotionalTension ? `emotion:${episode.emotionalTension}` : '',
      memoryBelief?.source ? `belief:${memoryBelief.source}/${memoryBelief.status}` : '',
    ],
  })
}

function describeImaginedWorld(input: {
  worldModel: AlicizationWorldModelSnapshot
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
}) {
  const activeHypothesis = input.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === input.hypothesisGraph?.activeHypothesisId)
    ?? input.hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.status === 'active' || hypothesis.status === 'held')
    ?? input.hypothesisGraph?.hypotheses[0]
    ?? null
  const openQuestion = input.worldModel.epistemicState.openQuestions[0] ?? ''
  const summary = sanitizeText(
    activeHypothesis?.summary
    ?? openQuestion
    ?? '',
    220,
  )
  if (!summary)
    return null
  return buildFrame({
    kind: 'imagined',
    summary,
    confidence: Math.max(
      activeHypothesis?.confidence ?? 0,
      input.beliefRevision?.groundingNeed ? 1 - input.beliefRevision.groundingNeed * 0.5 : 0.24,
    ),
    stability: clamp01(
      (activeHypothesis?.status === 'active' ? 0.52 : activeHypothesis?.status === 'held' ? 0.46 : 0.34)
      - ((input.beliefRevision?.contradictionPressure ?? 0) * 0.18)
      - (input.beliefRevision?.stability === 'fractured' ? 0.1 : 0),
    ),
    focusHypothesisId: activeHypothesis?.id ?? null,
    evidence: [
      activeHypothesis?.kind ? `hypothesis:${activeHypothesis.kind}/${activeHypothesis.status}` : '',
      input.beliefRevision?.stability ? `revision:${input.beliefRevision.stability}` : '',
      openQuestion ? 'open-question:present' : '',
    ],
  })
}

function rankFrames(frames: AlicizationWorldFrameSnapshot[]) {
  const basePriority: Record<AlicizationWorldFrameKind, number> = {
    live: 3,
    remembered: 2,
    imagined: 1,
  }
  return frames
    .slice()
    .sort((left, right) => {
      const leftScore = basePriority[left.kind] + left.confidence * 0.4 + left.stability * 0.3
      const rightScore = basePriority[right.kind] + right.confidence * 0.4 + right.stability * 0.3
      return rightScore - leftScore
    })
}

export function buildWorldOntology(input: {
  now: number
  scene?: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  livingWorldState?: AlicizationLivingWorldStateSnapshot | null
  workingMemoryEpisodes?: AlicizationVisualEpisode[]
}): AlicizationWorldOntologySnapshot {
  const live = describeLiveWorld({
    scene: input.scene,
    worldModel: input.worldModel,
    livingWorldState: input.livingWorldState,
  })
  const remembered = describeRememberedWorld({
    worldModel: input.worldModel,
    beliefLedger: input.beliefLedger,
    workingMemoryEpisodes: input.workingMemoryEpisodes,
  })
  const imagined = describeImaginedWorld({
    worldModel: input.worldModel,
    hypothesisGraph: input.hypothesisGraph,
    beliefRevision: input.beliefRevision,
  })

  const ranked = rankFrames([live, remembered, imagined].filter((item): item is AlicizationWorldFrameSnapshot => Boolean(item)))
  const dominantFrame = ranked[0]?.kind ?? (live ? 'live' : remembered ? 'remembered' : 'imagined')

  return {
    dominantFrame,
    truthPriority: ranked.map(frame => frame.kind),
    live,
    remembered,
    imagined,
    updatedAt: input.now,
  }
}
