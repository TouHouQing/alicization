import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefSnapshot,
  AlicizationEntityWorldModelSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

const beliefTtlMs = 15 * 60_000
const contradictedBeliefTtlMs = 6 * 60_000

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

function stableBeliefId(scope: AlicizationBeliefSnapshot['scope'], source: AlicizationBeliefSnapshot['source'], anchor: string) {
  return `${scope}::${source}::${sanitizeText(anchor, 120).toLowerCase() || 'global'}`
}

function scoreBeliefFocus(belief: AlicizationBeliefSnapshot) {
  return belief.salience * 0.66 + belief.confidence * 0.34
}

function sourceFromScene(scene: AlicizationVisualSceneSnapshot | null): AlicizationBeliefSnapshot['source'] {
  if (!scene)
    return 'memory'
  if (scene.source === 'screen-semantic-summary' || scene.source === 'invited-grounding' || scene.source === 'durability-hook')
    return 'percept'
  return 'inference'
}

function statusFromConfidence(input: {
  confidence: number
  source: AlicizationBeliefSnapshot['source']
  certainty: AlicizationWorldModelSnapshot['epistemicState']['certainty']
}) {
  if (input.source === 'contradiction')
    return 'contradicted' as const
  if (input.source === 'memory')
    return input.confidence >= 0.74 ? 'held' as const : 'tentative' as const
  if (input.certainty === 'grounded' && input.confidence >= 0.58)
    return 'held' as const
  if (input.certainty === 'observed' && input.confidence >= 0.72)
    return 'held' as const
  return 'tentative' as const
}

function summarizeScene(scene: AlicizationVisualSceneSnapshot | null | undefined) {
  return sanitizeText(
    scene?.summary
    ?? scene?.target?.title
    ?? scene?.target?.appName
    ?? scene?.target?.processName
    ?? '',
    140,
  )
}

function buildCurrentSceneBelief(input: {
  now: number
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  entityWorld: AlicizationEntityWorldModelSnapshot
}): AlicizationBeliefSnapshot | null {
  if (!input.scene)
    return null
  const subject = summarizeScene(input.scene) || input.worldModel.activeThread?.title
  if (!subject)
    return null
  const source = sourceFromScene(input.scene)
  const confidence = clamp01(
    Math.max(input.scene.confidence, input.worldModel.activeThread?.confidence ?? 0)
    + (input.worldModel.epistemicState.certainty === 'grounded' ? 0.06 : 0),
  )

  return {
    id: stableBeliefId('scene', source, subject),
    scope: 'scene',
    source,
    status: statusFromConfidence({
      confidence,
      source,
      certainty: input.worldModel.epistemicState.certainty,
    }),
    statement: subject,
    confidence,
    salience: clamp01(
      input.scene.confidence * 0.6
      + (input.scene.contentKind === 'error' || input.scene.contentKind === 'diff' ? 0.24 : 0.1)
      + (input.worldModel.activeThread?.significance ?? 0) * 0.16,
    ),
    evidence: [
      `scene-source:${input.scene.source}`,
      `workload:${input.scene.workloadKind}`,
      `content:${input.scene.contentKind}`,
    ],
    entityIds: input.entityWorld.focusEntityId ? [input.entityWorld.focusEntityId] : [],
    formedAt: input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + beliefTtlMs,
  }
}

function buildHostGoalBelief(input: {
  now: number
  appraisal: AlicizationSubjectiveSceneAppraisal
  worldModel: AlicizationWorldModelSnapshot
  entityWorld: AlicizationEntityWorldModelSnapshot
}): AlicizationBeliefSnapshot | null {
  const subject = sanitizeText(
    input.appraisal.currentKnot
    ?? input.worldModel.activeThread?.title
    ?? input.entityWorld.entities.find(entity => entity.id === input.entityWorld.focusEntityId)?.label
    ?? '',
    120,
  )
  if (!subject || !input.appraisal.inferredHostGoal)
    return null
  const statement = sanitizeText(
    input.appraisal.situatedMeaning
    ?? '',
    180,
  )
  if (!statement)
    return null
  const confidence = clamp01(
    input.appraisal.confidence * 0.72
    + (input.worldModel.activeThread?.confidence ?? 0) * 0.18
    + (input.worldModel.epistemicState.certainty === 'grounded' ? 0.08 : 0),
  )

  return {
    id: stableBeliefId('host', 'inference', `${input.appraisal.inferredHostGoal}:${subject}`),
    scope: 'host',
    source: 'inference',
    status: statusFromConfidence({
      confidence,
      source: 'inference',
      certainty: input.worldModel.epistemicState.certainty,
    }),
    statement,
    confidence,
    salience: clamp01(
      input.appraisal.desireToSpeak * 0.32
      + input.appraisal.carePressure * 0.24
      + (input.worldModel.activeThread?.significance ?? 0) * 0.24
      + (input.appraisal.currentKnot ? 0.12 : 0.06),
    ),
    evidence: [
      `host-goal:${input.appraisal.inferredHostGoal}`,
      `relationship-need:${input.appraisal.relationshipNeed ?? 'unclear'}`,
    ],
    entityIds: input.entityWorld.focusEntityId ? [input.entityWorld.focusEntityId] : [],
    formedAt: input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + beliefTtlMs,
  }
}

function buildRelationshipBelief(input: {
  now: number
  appraisal: AlicizationSubjectiveSceneAppraisal
  worldModel: AlicizationWorldModelSnapshot
}): AlicizationBeliefSnapshot | null {
  const relationshipNeed = input.appraisal.relationshipNeed ?? 'unclear'
  if (relationshipNeed === 'unclear' && input.worldModel.hostState.availability === 'open')
    return null

  const statement = sanitizeText(input.appraisal.relationshipNeed, 180)
  if (!statement)
    return null

  const confidence = clamp01(
    input.appraisal.confidence * 0.58
    + (input.worldModel.hostState.availability === 'focused' || input.worldModel.hostState.availability === 'immersed' ? 0.12 : 0.04)
    + (relationshipNeed === 'space' || relationshipNeed === 'guidance' || relationshipNeed === 'care' ? 0.12 : 0),
  )

  return {
    id: stableBeliefId('relationship', 'inference', `${relationshipNeed}:${input.worldModel.hostState.availability}`),
    scope: 'relationship',
    source: 'inference',
    status: statusFromConfidence({
      confidence,
      source: 'inference',
      certainty: input.worldModel.epistemicState.certainty,
    }),
    statement,
    confidence,
    salience: clamp01(0.22 + confidence * 0.32 + (relationshipNeed === 'care' ? 0.16 : 0)),
    evidence: [
      `relationship-need:${relationshipNeed}`,
      `availability:${input.worldModel.hostState.availability}`,
    ],
    entityIds: [],
    formedAt: input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + beliefTtlMs,
  }
}

function buildCarryOverMemoryBelief(input: {
  now: number
  worldModel: AlicizationWorldModelSnapshot
}): AlicizationBeliefSnapshot | null {
  const carriedThread = input.worldModel.continuity.afterglowOpen
    ? input.worldModel.activeThread
    : input.worldModel.lingeringThreads[0]
  if (!carriedThread)
    return null

  const anchor = sanitizeText(carriedThread.title || carriedThread.summary, 120) || 'carry-over-thread'
  const confidence = clamp01(
    carriedThread.confidence * 0.72
    + (input.worldModel.continuity.afterglowOpen ? 0.14 : 0.04),
  )

  return {
    id: stableBeliefId('scene', 'memory', anchor),
    scope: 'scene',
    source: 'memory',
    status: statusFromConfidence({
      confidence,
      source: 'memory',
      certainty: input.worldModel.epistemicState.certainty,
    }),
    statement: `memory-thread:${anchor}`,
    confidence,
    salience: clamp01(carriedThread.significance * 0.48 + (input.worldModel.continuity.afterglowOpen ? 0.24 : 0.08)),
    evidence: [
      `continuity:${input.worldModel.continuity.label}`,
      `thread:${carriedThread.kind}`,
    ],
    entityIds: [],
    formedAt: input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + beliefTtlMs,
  }
}

function beliefsConflict(left: AlicizationBeliefSnapshot, right: AlicizationBeliefSnapshot) {
  if (left.scope !== 'scene' || right.scope !== 'scene')
    return false
  if (left.id === right.id)
    return false
  const leftStatement = sanitizeText(left.statement, 160).toLowerCase()
  const rightStatement = sanitizeText(right.statement, 160).toLowerCase()
  if (!leftStatement || !rightStatement)
    return false
  return leftStatement !== rightStatement
}

function hasFreshGroundedScene(input: {
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
}) {
  return Boolean(
    input.scene
    && (input.scene.source === 'screen-semantic-summary' || input.scene.source === 'invited-grounding' || input.scene.source === 'durability-hook')
    && input.worldModel.epistemicState.certainty === 'grounded'
    && input.worldModel.epistemicState.freshness !== 'stale',
  )
}

function shouldQuietlySupersedeOlderSceneBelief(input: {
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  belief: AlicizationBeliefSnapshot
  now: number
}) {
  if (!hasFreshGroundedScene({
    scene: input.scene,
    worldModel: input.worldModel,
  })) {
    return false
  }

  if (
    input.worldModel.continuity.label === 'scene-shift'
    || input.worldModel.continuity.label === 'reacquired'
    || input.worldModel.continuity.label === 'new-focus'
  ) {
    return true
  }

  if (input.belief.source === 'memory' || input.belief.source === 'contradiction')
    return true

  return input.now - input.belief.lastUpdatedAt >= 60_000
}

function coolSupersededSceneBelief(input: {
  now: number
  belief: AlicizationBeliefSnapshot
}) {
  return {
    ...input.belief,
    source: input.belief.source === 'contradiction' ? 'memory' : input.belief.source,
    status: 'tentative',
    salience: clamp01(input.belief.salience * 0.76),
    confidence: clamp01(input.belief.confidence * 0.84),
    contradictsBeliefIds: [],
    lastUpdatedAt: input.now,
    expiresAt: input.now + beliefTtlMs,
  } satisfies AlicizationBeliefSnapshot
}

function normalizeCarriedBelief(input: {
  now: number
  belief: AlicizationBeliefSnapshot
}) {
  const contradicted = input.belief.status === 'contradicted'
  const ttl = contradicted ? contradictedBeliefTtlMs : beliefTtlMs
  if (input.now - input.belief.lastUpdatedAt > ttl)
    return null
  return {
    ...input.belief,
    status: contradicted ? 'contradicted' : input.belief.status === 'held' ? 'tentative' : input.belief.status,
    confidence: clamp01(input.belief.confidence * (contradicted ? 0.86 : 0.92)),
    salience: clamp01(input.belief.salience * (contradicted ? 0.7 : 0.88)),
    lastUpdatedAt: input.now,
    expiresAt: input.now + ttl,
  } satisfies AlicizationBeliefSnapshot
}

export function buildBeliefLedger(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  entityWorld: AlicizationEntityWorldModelSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  previous?: AlicizationBeliefLedgerSnapshot | null
}): AlicizationBeliefLedgerSnapshot {
  const currentBeliefs: AlicizationBeliefSnapshot[] = []
  const currentSceneBelief = buildCurrentSceneBelief({
    now: input.now,
    scene: input.scene,
    worldModel: input.worldModel,
    entityWorld: input.entityWorld,
  })
  if (currentSceneBelief)
    currentBeliefs.push(currentSceneBelief)
  const hostGoalBelief = buildHostGoalBelief({
    now: input.now,
    appraisal: input.appraisal,
    worldModel: input.worldModel,
    entityWorld: input.entityWorld,
  })
  if (hostGoalBelief)
    currentBeliefs.push(hostGoalBelief)
  const relationshipBelief = buildRelationshipBelief({
    now: input.now,
    appraisal: input.appraisal,
    worldModel: input.worldModel,
  })
  if (relationshipBelief)
    currentBeliefs.push(relationshipBelief)
  const carryOverMemoryBelief = buildCarryOverMemoryBelief({
    now: input.now,
    worldModel: input.worldModel,
  })
  if (carryOverMemoryBelief)
    currentBeliefs.push(carryOverMemoryBelief)

  const contradictions: string[] = []
  const merged = new Map<string, AlicizationBeliefSnapshot>()
  for (const belief of currentBeliefs)
    merged.set(belief.id, belief)

  for (const previous of input.previous?.beliefs ?? []) {
    const carried = normalizeCarriedBelief({
      now: input.now,
      belief: previous,
    })
    if (!carried || merged.has(carried.id))
      continue
    merged.set(carried.id, carried)
  }

  const beliefs = [...merged.values()].map((belief) => {
    if (!currentSceneBelief || belief.scope !== 'scene' || belief.id === currentSceneBelief.id)
      return belief
    if (!beliefsConflict(belief, currentSceneBelief))
      return belief
    if (shouldQuietlySupersedeOlderSceneBelief({
      scene: input.scene,
      worldModel: input.worldModel,
      belief,
      now: input.now,
    })) {
      return coolSupersededSceneBelief({
        now: input.now,
        belief,
      })
    }

    contradictions.push(`belief-conflict:${belief.id}->${currentSceneBelief.id}`)
    return {
      ...belief,
      source: belief.source === 'memory' ? 'memory' : 'contradiction',
      status: 'contradicted',
      salience: clamp01(belief.salience * 0.64),
      confidence: clamp01(belief.confidence * 0.78),
      contradictsBeliefIds: [...new Set([...(belief.contradictsBeliefIds ?? []), currentSceneBelief.id])],
      lastUpdatedAt: input.now,
      expiresAt: input.now + contradictedBeliefTtlMs,
    } satisfies AlicizationBeliefSnapshot
  })

  const rankedBeliefs = beliefs
    .sort((left, right) => scoreBeliefFocus(right) - scoreBeliefFocus(left))
    .slice(0, 8)
  const focusBeliefId = rankedBeliefs.find(belief => belief.status !== 'contradicted')?.id
    ?? rankedBeliefs[0]?.id
    ?? null

  return {
    focusBeliefId,
    beliefs: rankedBeliefs,
    unresolvedContradictions: contradictions.filter(Boolean),
    updatedAt: input.now,
  }
}
