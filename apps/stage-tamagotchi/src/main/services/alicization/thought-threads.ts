import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationLivingWorldObjectSnapshot,
  AlicizationLivingWorldStateSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSelfGovernorIntentionSnapshot,
  AlicizationSelfGovernorSnapshot,
  AlicizationThoughtThreadKind,
  AlicizationThoughtThreadSnapshot,
  AlicizationThoughtThreadStateSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

const thoughtThreadTtlMs = 30 * 60_000

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

function stableId(kind: string, parts: Array<string | number | null | undefined>) {
  return `${kind}::${parts.map((part) => {
    if (typeof part === 'number')
      return String(part)
    return sanitizeText(part ?? '', 120).toLowerCase()
  }).filter(Boolean).join('::') || 'unknown'}`
}

function dedupeTexts(values: Array<string | undefined>) {
  return [...new Set(values.map(value => sanitizeText(value, 120)).filter(Boolean))]
}

function governingCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  return commitmentLedger?.commitments.find(commitment => commitment.id === commitmentLedger.governingCommitmentId)
    ?? commitmentLedger?.commitments[0]
    ?? null
}

function primaryInquiry(inquiryLoop?: AlicizationInquiryLoopSnapshot | null) {
  return inquiryLoop?.inquiries.find(inquiry => inquiry.id === inquiryLoop.primaryInquiryId)
    ?? inquiryLoop?.inquiries[0]
    ?? null
}

function focusBelief(ledger?: AlicizationBeliefLedgerSnapshot | null) {
  return ledger?.beliefs.find(belief => belief.id === ledger.focusBeliefId)
    ?? ledger?.beliefs[0]
    ?? null
}

function resolveForegroundObject(input: {
  livingWorldState: AlicizationLivingWorldStateSnapshot
  selfGovernor?: AlicizationSelfGovernorSnapshot | null
}) {
  const focusObjectId = input.selfGovernor?.focusObjectId ?? input.livingWorldState.focusObjectId
  return input.livingWorldState.objects.find(object => object.id === focusObjectId)
    ?? input.livingWorldState.objects[0]
    ?? null
}

function kindFromIntention(input: {
  intention: AlicizationSelfGovernorIntentionSnapshot
  worldModel: AlicizationWorldModelSnapshot
}) {
  switch (input.intention.kind) {
    case 'repair-misread':
      return 'repair-thread' as const
    case 'hold-thread':
      return 'problem-thread' as const
    case 'protect-host':
    case 'care-host':
      return 'care-thread' as const
    case 'stay-near':
      return input.worldModel.continuity.afterglowOpen
        ? 'afterglow-thread' as const
        : 'relationship-thread' as const
    case 'wait-opening':
      return 'relationship-thread' as const
    case 'understand-scene':
    default:
      return 'scene-hold' as const
  }
}

function threadQuestion(input: {
  kind: AlicizationThoughtThreadKind
  worldModel: AlicizationWorldModelSnapshot
  object: AlicizationLivingWorldObjectSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
}) {
  void input.kind
  const inquiry = primaryInquiry(input.inquiryLoop)
  void input.worldModel
  void input.object
  return inquiry?.question ?? input.object?.openLoop ?? ''
}

function createThread(input: {
  now: number
  previous?: AlicizationThoughtThreadSnapshot | null
  kind: AlicizationThoughtThreadKind
  title: string
  summary: string
  question?: string
  object: AlicizationLivingWorldObjectSnapshot | null
  intention: AlicizationSelfGovernorIntentionSnapshot
  anchoredBeliefId?: string | null
  anchoredInquiryId?: string | null
  anchoredCommitmentId?: string | null
  surfaceReadiness: number
  confidence: number
  reopenWhen: string[]
}): AlicizationThoughtThreadSnapshot {
  const waiting = input.intention.status === 'withheld' || input.surfaceReadiness < 0.46
  const ripe = input.surfaceReadiness >= 0.74

  return {
    id: stableId('thought-thread', [
      input.kind,
      input.object?.id ?? '',
      input.intention.id,
      input.title,
    ]),
    kind: input.kind,
    status: ripe ? 'ripe' : waiting ? 'waiting' : input.previous?.status === 'cooling' ? 'active' : 'active',
    title: sanitizeText(input.title, 120) || input.kind,
    summary: sanitizeText(input.summary, 220) || input.kind,
    question: sanitizeText(input.question, 180) || undefined,
    anchoredObjectId: input.object?.id ?? null,
    anchoredIntentionId: input.intention.id,
    anchoredBeliefId: input.anchoredBeliefId ?? null,
    anchoredInquiryId: input.anchoredInquiryId ?? null,
    anchoredCommitmentId: input.anchoredCommitmentId ?? null,
    salience: clamp01(
      input.surfaceReadiness * 0.34
      + input.confidence * 0.28
      + input.intention.urgency * 0.24
      + (input.object?.salience ?? 0.24) * 0.14,
    ),
    confidence: clamp01(Math.max(input.confidence, input.previous?.confidence ?? 0)),
    surfaceReadiness: clamp01(Math.max(input.surfaceReadiness, input.previous?.surfaceReadiness ?? 0)),
    reopenWhen: dedupeTexts([...(input.previous?.reopenWhen ?? []), ...input.reopenWhen]).slice(0, 8),
    openedAt: input.previous?.openedAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + thoughtThreadTtlMs,
  }
}

function coolingCarry(previous: AlicizationThoughtThreadSnapshot, now: number): AlicizationThoughtThreadSnapshot {
  return {
    ...previous,
    status: 'cooling',
    salience: clamp01(previous.salience * 0.88),
    confidence: clamp01(previous.confidence * 0.92),
    surfaceReadiness: clamp01(previous.surfaceReadiness * 0.82),
    lastUpdatedAt: now,
  }
}

export function buildThoughtThreads(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  worldModel: AlicizationWorldModelSnapshot
  livingWorldState: AlicizationLivingWorldStateSnapshot
  selfGovernor: AlicizationSelfGovernorSnapshot
  beliefLedger?: AlicizationBeliefLedgerSnapshot | null
  inquiryLoop?: AlicizationInquiryLoopSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  previous?: AlicizationThoughtThreadStateSnapshot | null
}): AlicizationThoughtThreadStateSnapshot {
  const previousThreads = new Map((input.previous?.threads ?? []).map(thread => [thread.id, thread]))
  const threads: AlicizationThoughtThreadSnapshot[] = []
  const focusObject = resolveForegroundObject({
    livingWorldState: input.livingWorldState,
    selfGovernor: input.selfGovernor,
  })
  const belief = focusBelief(input.beliefLedger)
  const inquiry = primaryInquiry(input.inquiryLoop)
  const commitment = governingCommitment(input.commitmentLedger)

  for (const intention of input.selfGovernor.activeIntentions) {
    const kind = kindFromIntention({
      intention,
      worldModel: input.worldModel,
    })
    const surfaceReadiness = clamp01(
      intention.urgency * 0.22
      + intention.confidence * 0.18
      + input.selfGovernor.persistence * 0.18
      + input.selfGovernor.socialRiskTolerance * 0.16
      + (input.worldModel.epistemicState.certainty === 'grounded'
        ? 0.16
        : input.worldModel.epistemicState.certainty === 'observed'
          ? 0.08
          : -0.12)
        - input.selfGovernor.inhibition * 0.16
        + (kind === 'afterglow-thread' && input.worldModel.continuity.afterglowOpen ? 0.18 : 0)
        + (kind === 'care-thread' && input.context.system.inputActivity === 'idle' ? 0.08 : 0)
        - (kind === 'repair-thread' && input.worldModel.epistemicState.certainty !== 'grounded' ? 0.08 : 0),
    )
    const previousThread = previousThreads.get(stableId('thought-thread', [
      kind,
      focusObject?.id ?? '',
      intention.id,
      intention.title,
    ])) ?? null
    const title = sanitizeText(
      focusObject?.label
      ?? input.worldModel.activeThread?.title
      ?? intention.title,
      120,
    )
    threads.push(createThread({
      now: input.now,
      previous: previousThread,
      kind,
      title,
      summary: sanitizeText(
        intention.summary
        || focusObject?.summary
        || input.worldModel.activeThread?.summary
        || title,
        220,
      ),
      question: threadQuestion({
        kind,
        worldModel: input.worldModel,
        object: focusObject,
        inquiryLoop: input.inquiryLoop,
      }),
      object: focusObject,
      intention,
      anchoredBeliefId: belief?.id ?? null,
      anchoredInquiryId: inquiry?.id ?? null,
      anchoredCommitmentId: commitment?.id ?? null,
      surfaceReadiness,
      confidence: clamp01(intention.confidence * 0.56 + (focusObject?.confidence ?? 0.4) * 0.24 + (belief?.confidence ?? 0.4) * 0.2),
      reopenWhen: [
        input.worldModel.continuity.afterglowOpen ? 'afterglow-window' : '',
        input.context.system.inputActivity === 'idle' ? 'host-open' : '',
        input.worldModel.epistemicState.certainty === 'grounded' ? 'grounded-scene' : '',
        intention.kind,
        kind,
      ],
    }))
  }

  for (const previousThread of previousThreads.values()) {
    if (threads.some(thread => thread.id === previousThread.id))
      continue
    if (previousThread.expiresAt <= input.now)
      continue
    threads.push(coolingCarry(previousThread, input.now))
  }

  const sortedThreads = threads
    .sort((left, right) => (right.salience + right.surfaceReadiness * 0.3) - (left.salience + left.surfaceReadiness * 0.3))
    .slice(0, 6)
  const foregroundThread = sortedThreads[0] ?? null
  const unresolvedCount = sortedThreads.filter(thread => thread.status !== 'released' && thread.status !== 'cooling').length
  const narrative = dedupeTexts([
    foregroundThread ? `foreground:${foregroundThread.kind}/${foregroundThread.status}` : '',
    input.selfGovernor.dominantDrive ? `drive:${input.selfGovernor.dominantDrive}` : '',
    input.livingWorldState.openLoops[0] ? `loop:${input.livingWorldState.openLoops[0]}` : '',
    input.worldModel.continuity.afterglowOpen ? 'afterglow-open' : '',
  ]).slice(0, 6)

  return {
    foregroundThreadId: foregroundThread?.id ?? null,
    threads: sortedThreads,
    unresolvedCount,
    narrative,
    updatedAt: input.now,
  }
}
