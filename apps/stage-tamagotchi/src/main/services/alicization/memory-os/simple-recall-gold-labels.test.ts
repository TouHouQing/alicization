import { describe, expect, it } from 'vitest'

import {
  buildSimpleRecallGoldLabelOptions,
  buildSimpleRecallGoldMonthlyRegressionItem,
  buildSimpleRecallGoldSample,
} from './simple-recall-gold-labels'

describe('simple recall gold labels', () => {
  it('presents four beginner-friendly buttons mapped to durable recall evaluation classes', () => {
    const options = buildSimpleRecallGoldLabelOptions()

    expect(options.map(option => option.label)).toEqual([
      '记得对',
      '没想起来',
      '记错了',
      '不该提',
    ])
    expect(options.map(option => option.evaluationClass)).toEqual([
      'correct-recall',
      'missed-recall',
      'false-recall',
      'should-abstain',
    ])
    expect(options.every(option => option.description.length > 0)).toBe(true)
  })

  it('turns a beginner label into a recall feedback sample without exposing benchmark jargon', () => {
    const sample = buildSimpleRecallGoldSample({
      label: 'wrong',
      turnId: 'turn-1',
      decisionTraceId: 'trace-1',
      expectedMemoryIds: ['memory-current'],
      retrievedCandidateIds: ['memory-current', 'memory-old-thread'],
      surfacedMemoryIds: ['memory-old-thread'],
      wrongThreadIds: ['memory-old-thread'],
      note: '这条像是别的会话里的记忆。',
      now: 1000,
    })

    expect(sample.feedback.label).toBe('记错了')
    expect(sample.feedback.evaluationClass).toBe('false-recall')
    expect(sample.feedback.benchmarkDimensions).toEqual([
      'multi-session-reasoning',
      'knowledge-update',
    ])
    expect(sample.sample).toMatchObject({
      expectedMemoryIds: ['memory-current'],
      surfacedMemoryIds: ['memory-old-thread'],
      wrongThreadIds: ['memory-old-thread'],
      recallAt3: 0,
      precisionAt3: 0,
      judgeReason: '这条像是别的会话里的记忆。',
    })
  })

  it('builds a monthly regression item with plain-language review text', () => {
    const item = buildSimpleRecallGoldMonthlyRegressionItem({
      month: '2026-08',
      label: 'missing',
      query: '你还记得我上次说的 embedding baseUrl 吗？',
      expectedMemoryIds: ['memory-siliconflow-baseurl'],
      turnId: 'turn-2',
      decisionTraceId: 'trace-2',
      note: '她应该想起这条明确纠正。',
      now: 2000,
    })

    expect(item).toMatchObject({
      version: 'simple-recall-gold-monthly-regression-v1',
      month: '2026-08',
      label: '没想起来',
      evaluationClass: 'missed-recall',
      query: '你还记得我上次说的 embedding baseUrl 吗？',
      expectedMemoryIds: ['memory-siliconflow-baseurl'],
      userFacingReview: '这次应该想起，但没有想起。',
    })
    expect(item.benchmarkDimensions).toEqual([
      'information-extraction',
      'multi-session-reasoning',
    ])
  })
})
