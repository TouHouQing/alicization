import type {
  WorkingMemoryLongTermCleanedCandidate,
  WorkingMemoryLongTermCleaningTransaction,
} from './working-memory-long-term-cleaning'
import type { WorkingMemoryLongTermQueueItem } from './working-memory-long-term-queue'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import {
  normalizeWorkingMemoryText,
  uniqueWorkingMemoryTexts,
} from './working-memory'
import { createWorkingMemoryLongTermCleaningTransaction } from './working-memory-long-term-cleaning'

const correctionCuePattern = /不是|不对|错|纠正|改成|不要|别|停止|移除|清除/u
const preferenceCuePattern = /我喜欢|我不喜欢|偏好|习惯|明确喜欢|希望.*(回复|方式)|以后.*(要|不要|别)/u
const episodeCuePattern = /一起|共同|经历|上周|昨天|今天|那次|玩过|完成|任务节点|下次/u
const procedureCuePattern = /流程|步骤|方式|按|红测|验证|先.*再|认可|复用|推进/u
const relationshipCuePattern = /关系|边界|修复|出错|超时|直接说明|透明/u

const minimumAutomaticConfidence = 0.7
const minimumAutomaticSalience = 0.6

const internalStructuredFactContext = {
  provenance: 'internal-structured-fact' as const,
}

function sanitizeCleanerText(raw: unknown, maxChars = 260) {
  return sanitizeAlicizationProviderFacingText(
    normalizeWorkingMemoryText(raw, maxChars),
    maxChars,
    '',
    internalStructuredFactContext,
  )
}

function candidateText(item: WorkingMemoryLongTermQueueItem) {
  return [
    item.summary,
    item.reason,
    ...item.evidenceSnippets,
  ].map(text => normalizeWorkingMemoryText(text, 320)).filter(Boolean).join(' ')
}

function buildRetrievalCues(input: {
  item: WorkingMemoryLongTermQueueItem
}) {
  if (input.item.kind === 'correction') {
    return uniqueWorkingMemoryTexts([
      '用户纠正',
      sanitizeCleanerText(input.item.summary, 120),
      ...input.item.evidenceSnippets.map(snippet => sanitizeCleanerText(snippet, 120)),
    ], 8, 80)
  }

  if (input.item.kind === 'preference') {
    return uniqueWorkingMemoryTexts([
      '用户偏好',
      sanitizeCleanerText(input.item.summary, 120),
      ...input.item.evidenceSnippets.map(snippet => sanitizeCleanerText(snippet, 120)),
    ], 8, 80)
  }

  if (input.item.kind === 'episode') {
    return uniqueWorkingMemoryTexts([
      '共同经历',
      sanitizeCleanerText(input.item.summary, 120),
      ...input.item.evidenceSnippets.map(snippet => sanitizeCleanerText(snippet, 120)),
    ], 8, 80)
  }

  if (input.item.kind === 'procedure') {
    return uniqueWorkingMemoryTexts([
      '可复用流程',
      sanitizeCleanerText(input.item.summary, 120),
      ...input.item.evidenceSnippets.map(snippet => sanitizeCleanerText(snippet, 120)),
    ], 8, 80)
  }

  if (input.item.kind === 'relationship') {
    return uniqueWorkingMemoryTexts([
      '关系边界',
      sanitizeCleanerText(input.item.summary, 120),
      ...input.item.evidenceSnippets.map(snippet => sanitizeCleanerText(snippet, 120)),
    ], 8, 80)
  }

  return uniqueWorkingMemoryTexts([
    sanitizeCleanerText(input.item.summary, 120),
    sanitizeCleanerText(input.item.reason, 120),
    ...input.item.evidenceSnippets.map(snippet => sanitizeCleanerText(snippet, 120)),
  ], 8, 80)
}

function buildCleanedCandidate(input: {
  transaction: WorkingMemoryLongTermCleaningTransaction
}): WorkingMemoryLongTermCleanedCandidate {
  const item = input.transaction.item
  const relationshipMeaning = item.kind === 'episode'
    ? '共同经历'
    : item.kind === 'relationship'
      ? 'meaning:relationship-boundary'
      : item.kind === 'procedure'
        ? 'meaning:procedure-continuity'
        : null

  return {
    id: `cleaned:${item.id}`,
    queueItemId: input.transaction.queueItemId,
    source: 'working-memory-owner',
    kind: item.kind,
    cardId: input.transaction.cardId,
    sessionId: input.transaction.sessionId,
    summary: sanitizeCleanerText(item.summary, 260),
    reason: sanitizeCleanerText(item.reason, 260),
    sourceTurnIds: item.sourceTurnIds,
    evidenceSnippets: uniqueWorkingMemoryTexts(
      item.evidenceSnippets.map(snippet => sanitizeCleanerText(snippet, 260)),
      8,
      260,
    ),
    retrievalCues: buildRetrievalCues({
      item,
    }),
    entities: ['user', 'alicization'],
    relationshipMeaning,
    salience: item.salience,
    confidence: item.confidence,
    sensitivity: item.sensitivity,
    trainingEligibility: 'blocked',
    createdAt: item.createdAt,
  }
}

function hasStructuredResidue(item: WorkingMemoryLongTermQueueItem) {
  return [
    item.summary,
    item.reason,
    ...item.evidenceSnippets,
  ].some(value => containsAlicizationFixedTemplateResidue(
    value,
    internalStructuredFactContext,
  ))
}

function cuePatternForKind(kind: WorkingMemoryLongTermQueueItem['kind']) {
  switch (kind) {
    case 'preference':
      return preferenceCuePattern
    case 'episode':
      return episodeCuePattern
    case 'procedure':
      return procedureCuePattern
    case 'relationship':
      return relationshipCuePattern
    default:
      return null
  }
}

function rejectionReasonsFor(input: {
  transaction: WorkingMemoryLongTermCleaningTransaction
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
  if (hasStructuredResidue(item))
    reasons.push('structured-residue')

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
  if (item.kind === 'correction') {
    if (!correctionCuePattern.test(input.text))
      reasons.push('weak-correction-cue')
  }
  else {
    const pattern = cuePatternForKind(item.kind)
    if (!pattern || !pattern.test(input.text))
      reasons.push(`weak-${item.kind}-cue`)
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
  const rejectionReasons = rejectionReasonsFor({ transaction })
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
    }),
    rejectionReasons: [],
    reviewReasons: [],
    nextAttemptAt: now,
    updatedAt: now,
  }
}
