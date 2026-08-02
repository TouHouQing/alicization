import type {
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernContinuityEntry,
  AlicizationConcernContinuityLedgerSnapshot,
  AlicizationConcernKind,
  AlicizationConcernSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationWorldModelSnapshot,
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

function stableEntryId(input: {
  kind: AlicizationConcernKind
  anchor: string
  threadId?: string | null
}) {
  return [
    'concern-continuity',
    input.kind,
    sanitizeText(input.anchor, 120).toLowerCase() || 'global',
    sanitizeText(input.threadId, 120).toLowerCase() || 'threadless',
  ].join('::')
}

function ttlMs(kind: AlicizationConcernKind) {
  switch (kind) {
    case 'care-body':
      return 28 * 60_000
    case 'help-fix':
    case 'unfinished-thread':
      return 24 * 60_000
    case 'co-watch':
      return 18 * 60_000
    case 'curiosity':
    case 'protect-focus':
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

function buildAnchor(input: {
  concern?: AlicizationConcernSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
}) {
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  return sanitizeText(
    input.concern?.summary
    ?? input.worldModel.activeThread?.title
    ?? input.worldModel.activeThread?.summary
    ?? commitment?.summary
    ?? inquiryPlan?.question
    ?? '',
    140,
  ) || 'current-thread'
}

function freshnessBias(worldModel: AlicizationWorldModelSnapshot) {
  const certainty = worldModel.epistemicState.certainty
  const source = worldModel.activeThread?.source
  if (source === 'grounded-scene' && certainty === 'grounded')
    return 0.94
  if ((source === 'observed-scene' || source === 'durability-pulse') && (certainty === 'grounded' || certainty === 'observed'))
    return 0.74
  if (source === 'continuity' || source === 'working-memory')
    return 0.28
  if (certainty === 'lingering')
    return 0.34
  return 0.48
}

function repairAffinity(input: {
  worldModel: AlicizationWorldModelSnapshot
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
}) {
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  return clamp01(
    (input.worldModel.epistemicState.certainty === 'uncertain' ? 0.38 : input.worldModel.epistemicState.certainty === 'lingering' ? 0.26 : 0)
    + (input.worldModel.activeThread?.source === 'continuity' || input.worldModel.activeThread?.source === 'working-memory' ? 0.18 : 0)
    + (commitment?.kind === 'repair-misread' || commitment?.kind === 'recheck-scene' ? 0.2 : 0)
    + (inquiryPlan?.askForGrounding ? 0.16 : 0),
  )
}

function continuityWeight(input: {
  concern?: AlicizationConcernSnapshot | null
  previous?: AlicizationConcernContinuityEntry | null
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
}) {
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  return clamp01(
    (input.concern?.tension ?? 0.24) * 0.42
    + (input.concern?.careWeight ?? 0.22) * 0.12
    + (input.concern?.confidence ?? input.previous?.confidence ?? 0.4) * 0.12
    + (input.worldModel.activeThread?.unresolved ? 0.12 : 0)
    + (input.worldModel.continuity.afterglowOpen ? 0.1 : 0)
    + (commitment?.kind === 'hold-problem' || commitment?.kind === 'follow-through' || commitment?.kind === 'care-host' ? 0.12 : 0)
    + (inquiryPlan?.kind === 'follow-thread' || inquiryPlan?.kind === 'localize-problem' || inquiryPlan?.status === 'tracking' ? 0.08 : 0)
    + (input.context.relationship.fatigue >= 55 && input.concern?.kind === 'care-body' ? 0.08 : 0)
    + (input.previous?.continuityWeight ?? 0) * 0.18,
  )
}

function createEntry(input: {
  now: number
  kind: AlicizationConcernKind
  sourceConcernId?: string | null
  summary: string
  anchor: string
  targetThreadId?: string | null
  targetCommitmentId?: string | null
  targetInquiryPlanId?: string | null
  continuityWeight: number
  freshnessBias: number
  repairAffinity: number
  confidence: number
  status: AlicizationConcernContinuityEntry['status']
  previous?: AlicizationConcernContinuityEntry | null
}) {
  return {
    id: stableEntryId({
      kind: input.kind,
      anchor: input.anchor,
      threadId: input.targetThreadId ?? null,
    }),
    sourceConcernId: sanitizeText(input.sourceConcernId, 160) || null,
    kind: input.kind,
    status: input.status,
    summary: sanitizeText(input.summary, 180) || input.anchor,
    anchor: sanitizeText(input.anchor, 140) || input.summary,
    targetThreadId: sanitizeText(input.targetThreadId, 160) || null,
    targetCommitmentId: sanitizeText(input.targetCommitmentId, 160) || null,
    targetInquiryPlanId: sanitizeText(input.targetInquiryPlanId, 160) || null,
    continuityWeight: clamp01(input.continuityWeight),
    freshnessBias: clamp01(input.freshnessBias),
    repairAffinity: clamp01(input.repairAffinity),
    confidence: clamp01(input.confidence),
    createdAt: input.previous?.createdAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + ttlMs(input.kind),
  } satisfies AlicizationConcernContinuityEntry
}

function governingScore(entry: AlicizationConcernContinuityEntry) {
  return (
    entry.continuityWeight * 0.54
    + entry.freshnessBias * 0.16
    + entry.confidence * 0.14
    + entry.repairAffinity * 0.08
    + (entry.status === 'active' ? 0.08 : entry.status === 'carried' ? 0.04 : 0)
  )
}

function shouldCarryPrevious(input: {
  now: number
  entry: AlicizationConcernContinuityEntry
  worldModel: AlicizationWorldModelSnapshot
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
}) {
  if (input.entry.expiresAt <= input.now)
    return false
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  return Boolean(
    input.worldModel.continuity.afterglowOpen
    || input.worldModel.activeThread?.unresolved
    || input.worldModel.activeThread?.source === 'continuity'
    || input.worldModel.activeThread?.source === 'working-memory'
    || commitment?.kind === 'hold-problem'
    || commitment?.kind === 'follow-through'
    || commitment?.kind === 'care-host'
    || commitment?.kind === 'stay-near'
    || inquiryPlan?.kind === 'follow-thread'
    || inquiryPlan?.kind === 'localize-problem'
    || inquiryPlan?.status === 'tracking'
    || input.now - input.entry.lastUpdatedAt <= 8 * 60_000,
  )
}

export function buildConcernContinuityLedger(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  concerns?: AlicizationConcernSnapshot[] | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  previous?: AlicizationConcernContinuityLedgerSnapshot | null
}): AlicizationConcernContinuityLedgerSnapshot {
  const currentConcerns = Array.isArray(input.concerns) ? input.concerns : []
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  const previousEntries = new Map((input.previous?.entries ?? []).map(entry => [entry.id, entry]))
  const entries: AlicizationConcernContinuityEntry[] = []
  const seenIds = new Set<string>()

  for (const concern of currentConcerns.slice(0, 4)) {
    const anchor = buildAnchor({
      concern,
      worldModel: input.worldModel,
      commitmentLedger: input.commitmentLedger,
      inquiryPlanner: input.inquiryPlanner,
    })
    const id = stableEntryId({
      kind: concern.kind,
      anchor,
      threadId: input.worldModel.activeThread?.id ?? null,
    })
    const previous = previousEntries.get(id) ?? null
    const entry = createEntry({
      now: input.now,
      kind: concern.kind,
      sourceConcernId: concern.id,
      summary: concern.summary,
      anchor,
      targetThreadId: input.worldModel.activeThread?.id ?? null,
      targetCommitmentId: commitment?.id ?? null,
      targetInquiryPlanId: inquiryPlan?.id ?? null,
      continuityWeight: continuityWeight({
        concern,
        previous,
        context: input.context,
        worldModel: input.worldModel,
        commitmentLedger: input.commitmentLedger,
        inquiryPlanner: input.inquiryPlanner,
      }),
      freshnessBias: clamp01(freshnessBias(input.worldModel) + (previous?.freshnessBias ?? 0) * 0.12),
      repairAffinity: clamp01(repairAffinity({
        worldModel: input.worldModel,
        commitmentLedger: input.commitmentLedger,
        inquiryPlanner: input.inquiryPlanner,
      }) + (previous?.repairAffinity ?? 0) * 0.08),
      confidence: clamp01(concern.confidence + (previous?.confidence ?? 0) * 0.14),
      status: 'active',
      previous,
    })
    seenIds.add(entry.id)
    entries.push(entry)
  }

  for (const previous of input.previous?.entries ?? []) {
    if (seenIds.has(previous.id))
      continue
    if (!shouldCarryPrevious({
      now: input.now,
      entry: previous,
      worldModel: input.worldModel,
      commitmentLedger: input.commitmentLedger,
      inquiryPlanner: input.inquiryPlanner,
    })) {
      continue
    }
    const continuity = clamp01(
      previous.continuityWeight * 0.82
      + (input.worldModel.continuity.afterglowOpen ? 0.08 : 0)
      + (input.worldModel.activeThread?.source === 'continuity' ? 0.1 : 0),
    )
    const status: AlicizationConcernContinuityEntry['status']
      = continuity >= 0.28 ? 'carried' : 'cooling'
    entries.push({
      ...previous,
      status,
      continuityWeight: continuity,
      freshnessBias: clamp01(previous.freshnessBias * 0.78),
      repairAffinity: clamp01(previous.repairAffinity * 0.84 + repairAffinity({
        worldModel: input.worldModel,
        commitmentLedger: input.commitmentLedger,
        inquiryPlanner: input.inquiryPlanner,
      }) * 0.12),
      confidence: clamp01(previous.confidence * 0.92),
      lastUpdatedAt: input.now,
      expiresAt: Math.min(previous.expiresAt, input.now + 12 * 60_000),
    })
  }

  const dedupedEntries = entries
    .sort((left, right) => governingScore(right) - governingScore(left))
    .slice(0, 6)
  const governingEntry = dedupedEntries[0] ?? null
  const carryPressure = dedupedEntries.length > 0
    ? clamp01(Math.max(...dedupedEntries.map(entry => entry.continuityWeight)))
    : 0
  const unresolvedCount = dedupedEntries.filter(entry => entry.status === 'active' || entry.status === 'carried').length
  const narrative = governingEntry
    ? [
        `concern-continuity:${governingEntry.status};id=${governingEntry.id};summary=${governingEntry.summary}`,
      ]
    : []

  return {
    governingEntryId: governingEntry?.id ?? null,
    entries: dedupedEntries,
    carryPressure,
    unresolvedCount,
    narrative,
    updatedAt: input.now,
  } satisfies AlicizationConcernContinuityLedgerSnapshot
}
