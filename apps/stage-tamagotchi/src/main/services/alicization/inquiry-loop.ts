import type {
  AlicizationBeliefLedgerSnapshot,
  AlicizationInquiryLoopSnapshot,
  AlicizationInquirySnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

const inquiryTtlMs = 20 * 60_000

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

function stableInquiryId(kind: AlicizationInquirySnapshot['kind'], anchor: string) {
  return `${kind}::${sanitizeText(anchor, 120).toLowerCase() || 'global'}`
}

function priorityRank(priority: AlicizationInquirySnapshot['priority']) {
  switch (priority) {
    case 'critical': return 4
    case 'high': return 3
    case 'medium': return 2
    default: return 1
  }
}

function buildInquiry(input: {
  kind: AlicizationInquirySnapshot['kind']
  anchor: string
  question: string
  whyItMatters: string
  confidence: number
  priority: AlicizationInquirySnapshot['priority']
  targetBeliefId?: string | null
  evidenceWanted: string[]
  reopenWhen: string[]
  now: number
  status?: AlicizationInquirySnapshot['status']
  previous?: AlicizationInquirySnapshot
}): AlicizationInquirySnapshot {
  return {
    id: stableInquiryId(input.kind, input.anchor),
    kind: input.kind,
    status: input.status ?? (input.previous ? 'tracking' : 'open'),
    priority: input.priority,
    question: sanitizeText(input.question, 180),
    whyItMatters: sanitizeText(input.whyItMatters, 180),
    confidence: clamp01(input.confidence),
    targetBeliefId: input.targetBeliefId ?? null,
    evidenceWanted: input.evidenceWanted.map(item => sanitizeText(item, 80)).filter(Boolean).slice(0, 5),
    reopenWhen: input.reopenWhen.map(item => sanitizeText(item, 48)).filter(Boolean).slice(0, 5),
    openedAt: input.previous?.openedAt ?? input.now,
    lastUpdatedAt: input.now,
    expiresAt: input.now + inquiryTtlMs,
  }
}

function normalizeCarriedInquiry(now: number, inquiry: AlicizationInquirySnapshot) {
  if (inquiry.expiresAt <= now)
    return null
  if (inquiry.status === 'settled')
    return null
  return {
    ...inquiry,
    status: inquiry.status === 'open' ? 'tracking' : inquiry.status,
    confidence: clamp01(inquiry.confidence * 0.92),
    lastUpdatedAt: now,
    expiresAt: now + inquiryTtlMs,
  } satisfies AlicizationInquirySnapshot
}

export function buildInquiryLoop(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  scene: AlicizationVisualSceneSnapshot | null
  worldModel: AlicizationWorldModelSnapshot
  appraisal: AlicizationSubjectiveSceneAppraisal
  beliefLedger: AlicizationBeliefLedgerSnapshot
  relationshipModel: AlicizationRelationshipModelSnapshot
  previous?: AlicizationInquiryLoopSnapshot | null
}): AlicizationInquiryLoopSnapshot {
  const activeInquiries: AlicizationInquirySnapshot[] = []
  const focusBelief = input.beliefLedger.beliefs.find(belief => belief.id === input.beliefLedger.focusBeliefId) ?? null
  const unresolvedQuestions = input.worldModel.epistemicState.openQuestions

  if (
    input.worldModel.epistemicState.certainty === 'lingering'
    || input.worldModel.epistemicState.certainty === 'uncertain'
    || focusBelief?.status === 'tentative'
  ) {
    activeInquiries.push(buildInquiry({
      kind: 'scene-grounding',
      anchor: input.scene?.summary ?? input.worldModel.activeThread?.title ?? 'scene',
      question: input.appraisal.waitingToVerify || 'What is actually on screen right now, and which part is merely carried continuity?',
      whyItMatters: 'Speaking before this is grounded risks turning stale continuity into a false claim.',
      confidence: Math.max(0.56, 1 - (focusBelief?.confidence ?? 0.4)),
      priority: input.context.workload.kind === 'coding' ? 'high' : 'medium',
      targetBeliefId: focusBelief?.id ?? null,
      evidenceWanted: [
        'fresh grounded scene',
        input.context.content.kind === 'error' || input.context.content.kind === 'diff' ? 'problem surface detail' : 'foreground confirmation',
      ],
      reopenWhen: ['grounded-scene', 'attention-realigned'],
      now: input.now,
      previous: input.previous?.inquiries.find(inquiry => inquiry.kind === 'scene-grounding'),
    }))
  }

  if (
    (input.context.content.kind === 'error' || input.context.content.kind === 'diff' || input.appraisal.inferredHostGoal === 'resolve-problem')
    && (unresolvedQuestions.length > 0 || input.worldModel.activeThread?.unresolved)
  ) {
    activeInquiries.push(buildInquiry({
      kind: 'problem-localization',
      anchor: input.appraisal.currentKnot ?? input.worldModel.activeThread?.title ?? input.scene?.summary ?? 'problem',
      question: input.appraisal.currentKnot
        ? `Where exactly is the real knot inside ${input.appraisal.currentKnot}?`
        : 'Which concrete line, panel, or change is carrying the actual knot right now?',
      whyItMatters: 'Alicization should guide only when she can point at the right knot instead of gesturing vaguely at the whole screen.',
      confidence: clamp01(
        input.appraisal.confidence * 0.54
        + (input.worldModel.activeThread?.unresolved ? 0.22 : 0.08),
      ),
      priority: input.worldModel.epistemicState.certainty === 'grounded' ? 'medium' : 'high',
      targetBeliefId: focusBelief?.id ?? null,
      evidenceWanted: [
        input.context.content.kind === 'diff' ? 'changed hunk' : 'error locus',
        'host attention target',
      ],
      reopenWhen: ['problem-surface-visible', 'host-open'],
      now: input.now,
      previous: input.previous?.inquiries.find(inquiry => inquiry.kind === 'problem-localization'),
    }))
  }

  if (input.beliefLedger.unresolvedContradictions.length > 0) {
    activeInquiries.push(buildInquiry({
      kind: 'contradiction-check',
      anchor: input.beliefLedger.unresolvedContradictions[0] ?? 'contradiction',
      question: 'Which belief is stale memory, and which one still reflects the current world?',
      whyItMatters: 'Alicization must be able to notice when a remembered thread no longer matches the live scene.',
      confidence: 0.82,
      priority: 'high',
      targetBeliefId: focusBelief?.id ?? null,
      evidenceWanted: ['live scene', 'carried thread verification'],
      reopenWhen: ['contradiction-cleared', 'fresh-grounding'],
      now: input.now,
      previous: input.previous?.inquiries.find(inquiry => inquiry.kind === 'contradiction-check'),
    }))
  }

  if (input.relationshipModel.climate === 'guarded' || input.relationshipModel.approachVector === 'give-space') {
    activeInquiries.push(buildInquiry({
      kind: 'timing-calibration',
      anchor: input.relationshipModel.climate,
      question: 'Is this a moment to stay near quietly, or would speaking now feel like crowding the host?',
      whyItMatters: 'A digital life should treat timing as part of understanding, not just as a cooldown number.',
      confidence: clamp01(0.54 + input.relationshipModel.correctionSensitivity * 0.3),
      priority: input.relationshipModel.climate === 'guarded' ? 'high' : 'medium',
      evidenceWanted: ['host availability', 'feedback warmth'],
      reopenWhen: ['host-open', 'afterglow-window'],
      now: input.now,
      previous: input.previous?.inquiries.find(inquiry => inquiry.kind === 'timing-calibration'),
    }))
  }

  if (input.relationshipModel.activeBoundaries.includes('feedback-caution')) {
    activeInquiries.push(buildInquiry({
      kind: 'relationship-calibration',
      anchor: input.relationshipModel.climate,
      question: 'How close can Alicization move in this kind of moment without feeling wrong to the host?',
      whyItMatters: 'Repeated dismissals should become relational learning, not just threshold inflation.',
      confidence: clamp01(0.44 + input.relationshipModel.correctionSensitivity * 0.42),
      priority: 'medium',
      evidenceWanted: ['feedback history', 'reply timing'],
      reopenWhen: ['positive-feedback', 'shared-attention'],
      now: input.now,
      previous: input.previous?.inquiries.find(inquiry => inquiry.kind === 'relationship-calibration'),
    }))
  }

  const merged = new Map<string, AlicizationInquirySnapshot>()
  for (const inquiry of activeInquiries)
    merged.set(inquiry.id, inquiry)

  for (const previous of input.previous?.inquiries ?? []) {
    if (merged.has(previous.id))
      continue
    const carried = normalizeCarriedInquiry(input.now, previous)
    if (!carried)
      continue
    merged.set(carried.id, {
      ...carried,
      status: 'settled',
      confidence: clamp01(carried.confidence * 0.76),
    })
  }

  const inquiries = [...merged.values()]
    .sort((left, right) => {
      const priorityDelta = priorityRank(right.priority) - priorityRank(left.priority)
      if (priorityDelta !== 0)
        return priorityDelta
      return right.confidence - left.confidence
    })
    .slice(0, 8)

  const primaryInquiryId = inquiries.find(inquiry => inquiry.status === 'open' || inquiry.status === 'tracking')?.id
    ?? null
  const openCount = inquiries.filter(inquiry => inquiry.status === 'open' || inquiry.status === 'tracking' || inquiry.status === 'blocked').length

  return {
    primaryInquiryId,
    inquiries,
    openCount,
    updatedAt: input.now,
  }
}
