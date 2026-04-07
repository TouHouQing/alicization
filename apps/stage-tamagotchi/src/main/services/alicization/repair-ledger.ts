import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationBeliefRevisionSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernContinuityLedgerSnapshot,
  AlicizationHypothesisGraphSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationRepairLedgerEntry,
  AlicizationRepairLedgerKind,
  AlicizationRepairLedgerSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { buildEpistemicSurfacePosture } from './epistemic-surface'
import { deriveMindTruthContract } from './mind-truth-contract'

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

function stableRepairId(kind: AlicizationRepairLedgerKind, anchor: string) {
  return `repair-ledger::${kind}::${sanitizeText(anchor, 120).toLowerCase() || 'global'}`
}

function ttlMs(kind: AlicizationRepairLedgerKind) {
  switch (kind) {
    case 'reground-scene':
      return 18 * 60_000
    case 'stale-scene-anchor':
      return 20 * 60_000
    case 'belief-contradiction':
      return 24 * 60_000
    case 'present-tense-boundary':
      return 16 * 60_000
  }
}

function governingCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  return commitmentLedger?.commitments.find(commitment => commitment.id === commitmentLedger.governingCommitmentId)
    ?? commitmentLedger?.commitments[0]
    ?? null
}

function activeInquiryPlan(inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null) {
  return inquiryPlanner?.plans.find(plan => plan.id === inquiryPlanner.activePlanId)
    ?? inquiryPlanner?.plans[0]
    ?? null
}

function activeHypothesis(hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null) {
  return hypothesisGraph?.hypotheses.find(hypothesis => hypothesis.id === hypothesisGraph.activeHypothesisId)
    ?? hypothesisGraph?.hypotheses[0]
    ?? null
}

function governingConcern(concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null) {
  return concernContinuity?.entries.find(entry => entry.id === concernContinuity.governingEntryId)
    ?? concernContinuity?.entries[0]
    ?? null
}

function createEntry(input: {
  now: number
  kind: AlicizationRepairLedgerKind
  summary: string
  rationale: string
  urgency: number
  confidence: number
  targetConcernEntryId?: string | null
  targetCommitmentId?: string | null
  targetInquiryPlanId?: string | null
  targetBeliefId?: string | null
  previous?: AlicizationRepairLedgerEntry | null
}) {
  return {
    id: stableRepairId(input.kind, input.summary),
    kind: input.kind,
    status: input.urgency >= 0.62
      ? 'open'
      : input.previous?.status === 'open' || input.previous?.status === 'tracking'
        ? 'tracking'
        : 'cooling',
    summary: sanitizeText(input.summary, 180) || input.kind,
    rationale: sanitizeText(input.rationale, 220) || input.summary,
    targetConcernEntryId: sanitizeText(input.targetConcernEntryId, 160) || null,
    targetCommitmentId: sanitizeText(input.targetCommitmentId, 160) || null,
    targetInquiryPlanId: sanitizeText(input.targetInquiryPlanId, 160) || null,
    targetBeliefId: sanitizeText(input.targetBeliefId, 160) || null,
    urgency: clamp01(input.urgency),
    confidence: clamp01(input.confidence),
    createdAt: input.previous?.createdAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + ttlMs(input.kind),
  } satisfies AlicizationRepairLedgerEntry
}

function repairScore(entry: AlicizationRepairLedgerEntry) {
  return entry.urgency * 0.58 + entry.confidence * 0.26 + (entry.status === 'open' ? 0.16 : entry.status === 'tracking' ? 0.08 : 0)
}

function hasFreshGroundedScene(input: {
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
}) {
  return Boolean(
    input.currentScene
    && (input.currentScene.source === 'screen-semantic-summary' || input.currentScene.source === 'invited-grounding' || input.currentScene.source === 'durability-hook')
    && input.worldModel.activeThread?.source === 'grounded-scene'
    && input.worldModel.epistemicState.certainty === 'grounded'
    && input.worldModel.epistemicState.freshness === 'live',
  )
}

export function buildRepairLedger(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  worldOntology?: AlicizationWorldOntologySnapshot | null
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  beliefRevision?: AlicizationBeliefRevisionSnapshot | null
  hypothesisGraph?: AlicizationHypothesisGraphSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  previous?: AlicizationRepairLedgerSnapshot | null
}): AlicizationRepairLedgerSnapshot {
  const runtimeSurface = input.runtimeSurface ?? null
  const currentScene = runtimeSurface?.perception.currentScene ?? input.currentScene
  const worldModel = runtimeSurface?.world.worldModel ?? input.worldModel
  const worldOntology = runtimeSurface?.world.worldOntology ?? input.worldOntology ?? null
  const beliefLedger = runtimeSurface?.cognition.beliefLedger ?? input.beliefLedger ?? null
  const beliefRevision = runtimeSurface?.cognition.beliefRevision ?? input.beliefRevision ?? null
  const hypothesisGraph = runtimeSurface?.cognition.hypothesisGraph ?? input.hypothesisGraph ?? null
  const commitmentLedger = runtimeSurface?.memory.commitmentLedger ?? input.commitmentLedger ?? null
  const inquiryPlanner = runtimeSurface?.memory.inquiryPlanner ?? input.inquiryPlanner ?? null
  const concernContinuity = runtimeSurface?.memory.concernContinuity ?? input.concernContinuity ?? null

  const posture = buildEpistemicSurfacePosture({
    context: input.context,
    worldModel,
    beliefRevision,
  })
  const truthContract = deriveMindTruthContract(
    runtimeSurface ?? {
      currentScene,
      worldModel,
      worldOntology,
    },
  )
  const currentCommitment = governingCommitment(commitmentLedger)
  const currentPlan = activeInquiryPlan(inquiryPlanner)
  const currentHypothesis = activeHypothesis(hypothesisGraph)
  const currentConcern = governingConcern(concernContinuity)
  const freshGroundedScene = hasFreshGroundedScene({
    currentScene,
    worldModel,
  })
  const focusBelief = beliefLedger?.beliefs.find(belief => belief.id === beliefLedger?.focusBeliefId)
    ?? beliefLedger?.beliefs[0]
    ?? null
  const previousEntries = new Map((input.previous?.entries ?? []).map(entry => [entry.id, entry]))
  const entries: AlicizationRepairLedgerEntry[] = []

  if (
    !freshGroundedScene
    && (
      posture.requiresRegroundBeforeSurface
      || currentPlan?.askForGrounding
      || currentCommitment?.kind === 'recheck-scene'
    )
  ) {
    const summary = currentPlan?.question
      ?? currentCommitment?.summary
      ?? worldModel.epistemicState.openQuestions[0]
      ?? 'The live scene still needs one cleaner grounding pass.'
    const id = stableRepairId('reground-scene', summary)
    entries.push(createEntry({
      now: input.now,
      kind: 'reground-scene',
      summary,
      rationale: `Epistemic certainty is ${worldModel.epistemicState.certainty}; grounding need is ${(beliefRevision?.groundingNeed ?? 0).toFixed(2)}.`,
      urgency: clamp01(
        (beliefRevision?.groundingNeed ?? 0.28) * 0.42
        + (worldModel.epistemicState.certainty === 'uncertain' ? 0.28 : worldModel.epistemicState.certainty === 'lingering' ? 0.18 : 0)
        + (currentPlan?.askForGrounding ? 0.12 : 0)
        + (currentCommitment?.kind === 'recheck-scene' ? 0.12 : 0),
      ),
      confidence: clamp01(
        (currentPlan ? 0.18 : 0)
        + (beliefRevision?.revisionPressure ?? 0.24) * 0.24
        + (currentConcern?.repairAffinity ?? 0.22) * 0.26
        + 0.3,
      ),
      targetConcernEntryId: currentConcern?.id ?? null,
      targetCommitmentId: currentCommitment?.id ?? null,
      targetInquiryPlanId: currentPlan?.id ?? null,
      targetBeliefId: focusBelief?.id ?? null,
      previous: previousEntries.get(id) ?? null,
    }))
  }

  if (
    !freshGroundedScene
    && (
      worldModel.activeThread?.source === 'continuity'
      || worldModel.activeThread?.source === 'working-memory'
      || (
        worldModel.epistemicState.certainty === 'lingering'
        && currentConcern?.status === 'carried'
      )
    )
  ) {
    const summary = currentConcern?.summary
      ?? worldModel.activeThread?.summary
      ?? 'The carried scene anchor may be outrunning the live view.'
    const id = stableRepairId('stale-scene-anchor', summary)
    entries.push(createEntry({
      now: input.now,
      kind: 'stale-scene-anchor',
      summary,
      rationale: 'The current thread is being held by continuity rather than fresh sight, so old screen anchors need correction before they are spoken as if live.',
      urgency: clamp01(
        (currentConcern?.repairAffinity ?? 0.2) * 0.3
        + (truthContract.shouldLabelMemory ? 0.24 : 0)
        + (worldModel.activeThread?.source === 'continuity' ? 0.2 : 0)
        + (worldModel.activeThread?.source === 'working-memory' ? 0.18 : 0),
      ),
      confidence: clamp01(
        (currentConcern?.confidence ?? 0.42) * 0.24
        + (truthContract.shouldLabelMemory ? 0.34 : 0.18)
        + 0.22,
      ),
      targetConcernEntryId: currentConcern?.id ?? null,
      targetCommitmentId: currentCommitment?.id ?? null,
      targetInquiryPlanId: currentPlan?.id ?? null,
      previous: previousEntries.get(id) ?? null,
    }))
  }

  if (
    !freshGroundedScene
    && (
      (beliefRevision?.contradictionPressure ?? 0) >= 0.42
      || currentHypothesis?.kind === 'misread-drift'
    )
  ) {
    const summary = currentHypothesis?.summary
      ?? focusBelief?.statement
      ?? 'Part of the carried interpretation is colliding with newer evidence.'
    const id = stableRepairId('belief-contradiction', summary)
    entries.push(createEntry({
      now: input.now,
      kind: 'belief-contradiction',
      summary,
      rationale: `Contradiction pressure is ${(beliefRevision?.contradictionPressure ?? 0).toFixed(2)} and the active hypothesis is ${currentHypothesis?.kind ?? 'unknown'}.`,
      urgency: clamp01(
        (beliefRevision?.contradictionPressure ?? 0.28) * 0.46
        + (currentHypothesis?.kind === 'misread-drift' ? 0.26 : 0),
      ),
      confidence: clamp01(
        (focusBelief?.confidence ?? 0.4) * 0.18
        + (currentHypothesis?.confidence ?? 0.4) * 0.28
        + 0.28,
      ),
      targetConcernEntryId: currentConcern?.id ?? null,
      targetCommitmentId: currentCommitment?.id ?? null,
      targetInquiryPlanId: currentPlan?.id ?? null,
      targetBeliefId: focusBelief?.id ?? null,
      previous: previousEntries.get(id) ?? null,
    }))
  }

  if (!truthContract.canDescribeCurrentSceneAsFact) {
    const summary = truthContract.rationale || 'The current scene should not be spoken as fully live fact yet.'
    const id = stableRepairId('present-tense-boundary', summary)
    entries.push(createEntry({
      now: input.now,
      kind: 'present-tense-boundary',
      summary,
      rationale: truthContract.rationale,
      urgency: clamp01(
        (truthContract.truthState === 'uncertain' ? 0.42 : truthContract.truthState === 'remembered' ? 0.28 : 0.2)
        + (posture.requiresRegroundBeforeSurface ? 0.12 : 0),
      ),
      confidence: clamp01(
        (truthContract.shouldLabelMemory ? 0.42 : 0.22)
        + (worldModel.activeThread?.confidence ?? 0.28) * 0.18,
      ),
      targetConcernEntryId: currentConcern?.id ?? null,
      targetCommitmentId: currentCommitment?.id ?? null,
      targetInquiryPlanId: currentPlan?.id ?? null,
      previous: previousEntries.get(id) ?? null,
    }))
  }

  for (const previous of input.previous?.entries ?? []) {
    if (entries.some(entry => entry.id === previous.id))
      continue
    if (previous.expiresAt <= input.now)
      continue
    const urgency = clamp01(previous.urgency * 0.74)
    if (urgency < 0.16)
      continue
    entries.push({
      ...previous,
      status: urgency >= 0.32 ? 'cooling' : 'resolved',
      urgency,
      confidence: clamp01(previous.confidence * 0.9),
      lastUpdatedAt: input.now,
      expiresAt: Math.min(previous.expiresAt, input.now + 8 * 60_000),
    })
  }

  const dedupedEntries = entries
    .sort((left, right) => repairScore(right) - repairScore(left))
    .slice(0, 6)
  const governingRepair = dedupedEntries[0] ?? null
  const repairPressure = dedupedEntries.length > 0
    ? clamp01(Math.max(...dedupedEntries.map(entry => entry.urgency)))
    : 0
  const truthRisk = clamp01(
    (beliefRevision?.groundingNeed ?? 0) * 0.3
    + (beliefRevision?.contradictionPressure ?? 0) * 0.28
    + (!truthContract.canDescribeCurrentSceneAsFact ? 0.24 : 0)
    + (worldModel.activeThread?.source === 'continuity' || worldModel.activeThread?.source === 'working-memory' ? 0.12 : 0),
  )
  const narrative = governingRepair
    ? [`Current governing repair is ${governingRepair.kind}: ${governingRepair.summary.toLowerCase()}.`]
    : []

  return {
    governingRepairId: governingRepair?.id ?? null,
    entries: dedupedEntries,
    repairPressure,
    truthRisk,
    shouldConstrainPresentTense: !truthContract.canDescribeCurrentSceneAsFact
      || dedupedEntries.some(entry => entry.kind === 'stale-scene-anchor' || entry.kind === 'present-tense-boundary' || entry.kind === 'reground-scene'),
    narrative,
    updatedAt: input.now,
  } satisfies AlicizationRepairLedgerSnapshot
}
