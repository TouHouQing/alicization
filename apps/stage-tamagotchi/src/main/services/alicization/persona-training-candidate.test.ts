import { describe, expect, it } from 'vitest'

import {
  buildPersonaTrainingCandidatesFromLongTermMemory,
  rejectPersonaTrainingCandidate,
} from './persona-training-candidate'

describe('persona training candidate bridge', () => {
  it('builds redacted behavior candidates from cleaned reflections and reinforcement only', () => {
    const candidates = buildPersonaTrainingCandidatesFromLongTermMemory({
      reflections: [{
        id: 'reflection-failure-transparency',
        summary: '用户确认 Provider 失败时应透明说明真实原因。',
        lesson: 'Provider 失败时透明说明真实原因，再继续处理当前请求。',
        confidence: 0.86,
        sensitivity: 'personal',
        status: 'confirmed',
      }],
      reinforcements: [{
        id: 'reinforcement-truthful-grounding',
        dimension: 'truthful-grounding',
        summary: '透明说明链路失败能够保持事实边界。',
        valence: 'reinforce',
        delta: 0.06,
      }],
      memoryFacts: [{
        id: 'fact-user-private',
        summary: '用户喜欢某个私人事实。',
        sensitivity: 'personal',
      }],
      tombstonedSourceIds: [],
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toEqual(expect.objectContaining({
      id: 'persona-candidate:reflection-failure-transparency',
      sourceMemoryIds: ['reflection-failure-transparency', 'reinforcement-truthful-grounding'],
      privacyClass: 'personal-redacted',
      status: 'candidate',
    }))
    expect(candidates[0]?.behaviorLesson).toBe('Provider 失败时透明说明真实原因，再继续处理当前请求。')
    expect(candidates[0]?.positiveExample).toBe(candidates[0]?.behaviorLesson)
    expect(candidates[0]?.positiveExample).not.toContain('用户喜欢某个私人事实')
    expect(candidates[0]?.positiveExample).not.toMatch(/behavior_policy=|template_policy=|visibility=/u)
    expect(candidates[0]?.negativeExample).toBeUndefined()
  })

  it('does not build candidates from raw queues facts private or tombstoned sources', () => {
    const candidates = buildPersonaTrainingCandidatesFromLongTermMemory({
      reflections: [
        {
          id: 'reflection-private',
          summary: '用户私人边界。',
          lesson: '不要进入训练。',
          confidence: 0.9,
          sensitivity: 'private',
          status: 'confirmed',
        },
        {
          id: 'reflection-tombstoned',
          summary: '墓碑反思。',
          lesson: '不要进入训练。',
          confidence: 0.9,
          sensitivity: 'personal',
          status: 'confirmed',
        },
      ],
      reinforcements: [],
      memoryFacts: [{
        id: 'fact-only',
        summary: '事实不进入人格权重。',
        sensitivity: 'personal',
      }],
      rawQueueItems: [{
        id: 'queue-raw',
        summary: 'raw queue 不可进入训练。',
      }],
      tombstonedSourceIds: ['reflection-tombstoned'],
    })

    expect(candidates).toEqual([])
  })

  it('does not build candidates from pending or unconfirmed reflections even when confidence is high', () => {
    const candidates = buildPersonaTrainingCandidatesFromLongTermMemory({
      reflections: [
        {
          id: 'reflection-pending-high-confidence',
          summary: '待审核反思不该进入人格候选。',
          lesson: '即使置信度很高，pending 也不能训练人格。',
          confidence: 0.98,
          sensitivity: 'personal',
          status: 'pending',
        },
        {
          id: 'reflection-missing-status',
          summary: '缺少确认状态的反思不该进入人格候选。',
          lesson: '缺少 confirmed 状态就不能训练人格。',
          confidence: 0.98,
          sensitivity: 'personal',
        },
        {
          id: 'reflection-denied',
          summary: '拒绝的反思不该进入人格候选。',
          lesson: 'denied 不能训练人格。',
          confidence: 0.98,
          sensitivity: 'personal',
          status: 'denied',
        },
        {
          id: 'reflection-confirmed',
          summary: '确认后的清洗反思可以进入人格候选。',
          lesson: '失败时先透明说明，再继续回答。',
          confidence: 0.82,
          sensitivity: 'personal',
          status: 'confirmed',
        },
      ],
      reinforcements: [],
      memoryFacts: [],
      rawQueueItems: [{
        id: 'raw-queue-item',
        summary: 'raw queue 内容不能漏进候选。',
      }],
      tombstonedSourceIds: [],
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]?.id).toBe('persona-candidate:reflection-confirmed')
    expect(candidates[0]?.behaviorLesson).not.toContain('raw queue')
  })

  it('drops structured internal facts before building persona candidates', () => {
    const candidates = buildPersonaTrainingCandidatesFromLongTermMemory({
      reflections: [
        {
          id: 'reflection-structured-internal',
          summary: 'structured continuity digest.',
          lesson: 'mode=internal; lifecycle=held',
          confidence: 0.99,
          sensitivity: 'personal',
          status: 'confirmed',
        },
        {
          id: 'reflection-cleaned',
          summary: '用户明确要求 provider failure 不要被包装成陪伴。',
          lesson: '失败时先透明说明 provider failure，再继续当前问题。',
          confidence: 0.86,
          sensitivity: 'personal',
          status: 'confirmed',
        },
      ],
      reinforcements: [
        {
          id: 'reinforcement-structured-internal',
          dimension: 'runtime-state',
          summary: 'mode=internal; lifecycle=held',
          valence: 'reinforce',
          delta: 0.4,
        },
        {
          id: 'reinforcement-cleaned',
          dimension: 'truthful-grounding',
          summary: '失败面应该透明，不要用安抚句覆盖。',
          valence: 'reinforce',
          delta: 0.2,
        },
      ],
      memoryFacts: [],
      rawQueueItems: [],
      tombstonedSourceIds: [],
    })

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toEqual(expect.objectContaining({
      id: 'persona-candidate:reflection-cleaned',
      sourceMemoryIds: ['reflection-cleaned', 'reinforcement-cleaned'],
    }))
    expect(JSON.stringify(candidates)).not.toContain('mode=internal')
    expect(JSON.stringify(candidates)).not.toContain('lifecycle=held')
  })

  it('keeps candidates rollbackable through explicit status updates', () => {
    const [candidate] = buildPersonaTrainingCandidatesFromLongTermMemory({
      reflections: [{
        id: 'reflection-repair',
        summary: '用户认可 Alicization 先承认错误再继续推进。',
        lesson: '先承认错误，再继续推进。',
        confidence: 0.82,
        sensitivity: 'personal',
        status: 'confirmed',
      }],
      reinforcements: [],
      memoryFacts: [],
      tombstonedSourceIds: [],
    })

    expect(rejectPersonaTrainingCandidate(candidate!, 'replay-eval-failed')).toEqual(expect.objectContaining({
      status: 'rejected',
      rejectionReason: 'replay-eval-failed',
    }))
  })
})
