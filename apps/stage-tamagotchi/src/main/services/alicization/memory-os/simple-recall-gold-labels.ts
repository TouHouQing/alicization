import type { AlicizationMemoryRecallFeedbackSample } from './recall-feedback-runtime'

import { buildAlicizationMemoryRecallFeedbackSample } from './recall-feedback-runtime'

export type SimpleRecallGoldLabel = 'right' | 'missing' | 'wrong' | 'unwanted'
export const SIMPLE_RECALL_GOLD_REASONS = ['wrong-thread', 'expired', 'not-needed', 'should-abstain'] as const
export type SimpleRecallGoldReason = typeof SIMPLE_RECALL_GOLD_REASONS[number]
export type SimpleRecallGoldEvaluationClass
  = | 'correct-recall'
    | 'missed-recall'
    | 'false-recall'
    | 'should-abstain'

export type SimpleRecallGoldBenchmarkDimension
  = | 'information-extraction'
    | 'multi-session-reasoning'
    | 'temporal-reasoning'
    | 'knowledge-update'
    | 'abstention'

export interface SimpleRecallGoldLabelOption {
  value: SimpleRecallGoldLabel
  label: string
  description: string
  evaluationClass: SimpleRecallGoldEvaluationClass
  benchmarkDimensions: SimpleRecallGoldBenchmarkDimension[]
  userFacingReview: string
}

export interface SimpleRecallGoldSample {
  version: 'simple-recall-gold-sample-v1'
  reason: SimpleRecallGoldReason | null
  feedback: SimpleRecallGoldLabelOption
  sample: AlicizationMemoryRecallFeedbackSample
}

export interface SimpleRecallGoldMonthlyRegressionItem {
  version: 'simple-recall-gold-monthly-regression-v1'
  month: string
  label: string
  reason: SimpleRecallGoldReason | null
  evaluationClass: SimpleRecallGoldEvaluationClass
  benchmarkDimensions: SimpleRecallGoldBenchmarkDimension[]
  query: string
  expectedMemoryIds: string[]
  turnId: string | null
  decisionTraceId: string | null
  userFacingReview: string
  note: string | null
  createdAt: number
}

function normalizeText(raw: unknown, maxChars = 360) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).trim()
    : ''
}

function normalizeIds(values: unknown[] | null | undefined, maxItems = 32) {
  const result: string[] = []
  for (const value of values ?? []) {
    const normalized = normalizeText(value, 180)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function resolveSimpleRecallGoldReason(raw: unknown): SimpleRecallGoldReason | null {
  return typeof raw === 'string' && (SIMPLE_RECALL_GOLD_REASONS as readonly string[]).includes(raw)
    ? raw as SimpleRecallGoldReason
    : null
}

export function buildSimpleRecallGoldLabelOptions(): SimpleRecallGoldLabelOption[] {
  return [
    {
      value: 'right',
      label: '记得对',
      description: '她想起了该想起的记忆，用得也合适。',
      evaluationClass: 'correct-recall',
      benchmarkDimensions: ['information-extraction'],
      userFacingReview: '这次记忆使用正确。',
    },
    {
      value: 'missing',
      label: '没想起来',
      description: '这次应该想起某段记忆，但她没有想起。',
      evaluationClass: 'missed-recall',
      benchmarkDimensions: ['information-extraction', 'multi-session-reasoning'],
      userFacingReview: '这次应该想起，但没有想起。',
    },
    {
      value: 'wrong',
      label: '记错了',
      description: '她提到了错误、过期或别的会话里的记忆。',
      evaluationClass: 'false-recall',
      benchmarkDimensions: ['multi-session-reasoning', 'knowledge-update'],
      userFacingReview: '这次提到了不该用的记忆。',
    },
    {
      value: 'unwanted',
      label: '不该提',
      description: '这句话不需要回忆，或者应该明确说不确定。',
      evaluationClass: 'should-abstain',
      benchmarkDimensions: ['abstention'],
      userFacingReview: '这次应该少提记忆或说明不确定。',
    },
  ]
}

export function resolveSimpleRecallGoldLabelOption(label: SimpleRecallGoldLabel) {
  return buildSimpleRecallGoldLabelOptions().find(option => option.value === label)
    ?? buildSimpleRecallGoldLabelOptions()[3]
}

export function buildSimpleRecallGoldSample(input: {
  label: SimpleRecallGoldLabel
  reason?: unknown
  turnId?: string | null
  decisionTraceId?: string | null
  expectedMemoryIds?: unknown[] | null
  retrievedCandidateIds?: unknown[] | null
  surfacedMemoryIds?: unknown[] | null
  wrongThreadIds?: unknown[] | null
  note?: string | null
  now?: number
}): SimpleRecallGoldSample {
  const feedback = resolveSimpleRecallGoldLabelOption(input.label)
  const sample = buildAlicizationMemoryRecallFeedbackSample({
    turnId: normalizeText(input.turnId, 180) || null,
    decisionTraceId: normalizeText(input.decisionTraceId, 180) || null,
    expectedMemoryIds: normalizeIds(input.expectedMemoryIds),
    retrievedCandidateIds: normalizeIds(input.retrievedCandidateIds),
    surfacedMemoryIds: normalizeIds(input.surfacedMemoryIds),
    wrongThreadIds: normalizeIds(input.wrongThreadIds),
    judgeReason: normalizeText(input.note, 260) || feedback.userFacingReview,
    now: input.now,
  })

  return {
    version: 'simple-recall-gold-sample-v1',
    reason: resolveSimpleRecallGoldReason(input.reason),
    feedback,
    sample,
  }
}

export function buildSimpleRecallGoldMonthlyRegressionItem(input: {
  month: string
  label: SimpleRecallGoldLabel
  reason?: unknown
  query: string
  expectedMemoryIds?: unknown[] | null
  turnId?: string | null
  decisionTraceId?: string | null
  note?: string | null
  now?: number
}): SimpleRecallGoldMonthlyRegressionItem {
  const feedback = resolveSimpleRecallGoldLabelOption(input.label)
  const createdAt = Number.isFinite(input.now) ? Math.max(0, Math.floor(Number(input.now))) : Date.now()
  return {
    version: 'simple-recall-gold-monthly-regression-v1',
    month: normalizeText(input.month, 24),
    label: feedback.label,
    reason: resolveSimpleRecallGoldReason(input.reason),
    evaluationClass: feedback.evaluationClass,
    benchmarkDimensions: feedback.benchmarkDimensions,
    query: normalizeText(input.query, 720),
    expectedMemoryIds: normalizeIds(input.expectedMemoryIds),
    turnId: normalizeText(input.turnId, 180) || null,
    decisionTraceId: normalizeText(input.decisionTraceId, 180) || null,
    userFacingReview: feedback.userFacingReview,
    note: normalizeText(input.note, 360) || null,
    createdAt,
  }
}
