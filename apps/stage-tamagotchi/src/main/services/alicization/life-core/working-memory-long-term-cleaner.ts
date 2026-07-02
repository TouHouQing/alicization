import type {
  WorkingMemoryLongTermCleanedCandidate,
  WorkingMemoryLongTermCleaningTransaction,
} from './working-memory-long-term-cleaning'
import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import {
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'
import { createWorkingMemoryLongTermCleaningTransaction } from './working-memory-long-term-cleaning'

const fixedFallbackTemplatePattern = /我在。同一条本地数字生命的线还在|同一条本地数字生命的线还在|我先轻一点留在这里|你想说什么，我就接住/u
const promptResiduePattern = /ALICIZATION_|same-her|same living line|project_state|Phase 1|mustDo|mustNotDo|answerPlanner|WorkingMemory owner/iu
const correctionCuePattern = /固定模板|固定回复|模板化|人格|数字生命|不想要|不要固定|你搞错|不是这个/u
const personaCorrectionCuePattern = /固定模板|固定回复|模板化|人格|数字生命|不要固定/u

const minimumAutomaticConfidence = 0.7
const minimumAutomaticSalience = 0.6

function candidateText(item: WorkingMemoryLongTermQueueItem) {
  return [
    item.summary,
    item.reason,
    ...item.evidenceSnippets,
  ].map(text => normalizeWorkingMemoryText(text, 320)).filter(Boolean).join(' ')
}

function buildRetrievalCues(input: {
  item: WorkingMemoryLongTermQueueItem
  personaCorrection: boolean
}) {
  if (input.personaCorrection) {
    return uniqueWorkingMemoryTexts([
      '固定模板',
      '数字生命人格',
      '人格纠正',
      input.item.summary,
    ], 8, 80)
  }

  return uniqueWorkingMemoryTexts([
    input.item.summary,
    input.item.reason,
    ...input.item.evidenceSnippets,
  ], 8, 80)
}

function buildCleanedCandidate(input: {
  transaction: WorkingMemoryLongTermCleaningTransaction
  personaCorrection: boolean
}): WorkingMemoryLongTermCleanedCandidate {
  const item = input.transaction.item
  return {
    id: `cleaned:${item.id}`,
    queueItemId: input.transaction.queueItemId,
    source: 'working-memory-owner',
    kind: item.kind,
    cardId: input.transaction.cardId,
    sessionId: input.transaction.sessionId,
    summary: item.summary,
    reason: item.reason,
    sourceTurnIds: item.sourceTurnIds,
    evidenceSnippets: item.evidenceSnippets,
    retrievalCues: buildRetrievalCues({
      item,
      personaCorrection: input.personaCorrection,
    }),
    entities: ['user', 'alicization'],
    relationshipMeaning: input.personaCorrection
      ? 'The user corrected how Alicization should express her own continuous digital-life persona.'
      : null,
    salience: item.salience,
    confidence: item.confidence,
    sensitivity: item.sensitivity,
    trainingEligibility: 'blocked',
    createdAt: item.createdAt,
  }
}

function rejectionReasonsFor(input: {
  transaction: WorkingMemoryLongTermCleaningTransaction
  text: string
}) {
  const item = input.transaction.item
  const reasons = [
    ...input.transaction.rejectionReasons,
    ...input.transaction.contaminationFlags,
  ]

  if (item.source !== 'working-memory-owner')
    reasons.push('wrong-source')
  if (item.status !== 'pending-cleaning')
    reasons.push('non-pending-status')
  if (item.sourceTurnIds.length === 0)
    reasons.push('missing-source-turns')
  if (item.evidenceSnippets.length === 0)
    reasons.push('missing-evidence')
  if (fixedFallbackTemplatePattern.test(input.text))
    reasons.push('fixed-fallback-template')
  if (promptResiduePattern.test(input.text))
    reasons.push('prompt-residue')

  return uniqueWorkingMemoryTexts(reasons, 12, 180)
}

function reviewReasonsFor(input: {
  transaction: WorkingMemoryLongTermCleaningTransaction
  text: string
}) {
  const item = input.transaction.item
  const reasons: string[] = []

  if (item.sensitivity === 'private' || item.sensitivity === 'secret')
    reasons.push('private-or-secret')
  if (item.confidence < minimumAutomaticConfidence)
    reasons.push('low-confidence')
  if (item.salience < minimumAutomaticSalience)
    reasons.push('low-salience')
  if (item.kind !== 'correction')
    reasons.push('unsupported-kind')
  if (item.kind === 'correction') {
    if (!correctionCuePattern.test(input.text))
      reasons.push('weak-correction-cue')
    else if (!personaCorrectionCuePattern.test(input.text))
      reasons.push('weak-persona-correction-cue')
  }

  return uniqueWorkingMemoryTexts(reasons, 12, 180)
}

export function cleanWorkingMemoryLongTermQueueItem(input: {
  cardId: string
  sessionId: string
  item: WorkingMemoryLongTermQueueItem
  now: number
}): WorkingMemoryLongTermCleaningTransaction {
  const now = Number.isFinite(input.now) ? Number(input.now) : 0
  const transaction = createWorkingMemoryLongTermCleaningTransaction({
    ...input,
    now,
  })
  const text = candidateText(transaction.item)
  const rejectionReasons = rejectionReasonsFor({ transaction, text })
  const reviewReasons = rejectionReasons.length > 0
    ? []
    : reviewReasonsFor({ transaction, text })

  if (rejectionReasons.length > 0) {
    return {
      ...transaction,
      status: 'rejected',
      decision: 'reject',
      rejectionReasons,
      reviewReasons: [],
      nextAttemptAt: null,
      updatedAt: now,
    }
  }

  if (reviewReasons.length > 0) {
    return {
      ...transaction,
      status: 'needs-user-review',
      decision: 'review',
      cleanedCandidate: buildCleanedCandidate({
        transaction,
        personaCorrection: false,
      }),
      rejectionReasons: [],
      reviewReasons,
      nextAttemptAt: null,
      updatedAt: now,
    }
  }

  return {
    ...transaction,
    status: 'admitted',
    decision: 'admit',
    cleanedCandidate: buildCleanedCandidate({
      transaction,
      personaCorrection: true,
    }),
    rejectionReasons: [],
    reviewReasons: [],
    nextAttemptAt: now,
    updatedAt: now,
  }
}
