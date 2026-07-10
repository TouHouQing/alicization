import { describe, expect, it } from 'vitest'

import {
  buildPersonaTrainingCandidatesFromLongTermMemory,
  rejectPersonaTrainingCandidate,
} from './persona-training-candidate'

describe('persona training candidate bridge', () => {
  it('builds redacted behavior candidates from cleaned reflections and reinforcement only', () => {
    const candidates = buildPersonaTrainingCandidatesFromLongTermMemory({
      reflections: [{
        id: 'reflection-fixed-template',
        summary: '用户纠正过 Alicization：不要固定模板回复，要从自身连续数字生命人格回应。',
        lesson: '出错或超时时直接说明问题，不要用固定安抚模板。',
        confidence: 0.86,
        sensitivity: 'personal',
        status: 'confirmed',
      }],
      reinforcements: [{
        id: 'reinforcement-truthful-grounding',
        dimension: 'truthful-grounding',
        summary: '透明说明链路失败比固定安抚更符合 Alicization 的连续人格。',
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
      id: 'persona-candidate:reflection-fixed-template',
      sourceMemoryIds: ['reflection-fixed-template', 'reinforcement-truthful-grounding'],
      privacyClass: 'personal-redacted',
      status: 'candidate',
    }))
    expect(candidates[0]?.behaviorLesson).toContain('直接说明问题')
    expect(candidates[0]?.positiveExample).not.toContain('用户喜欢某个私人事实')
    expect(candidates[0]?.positiveExample).toContain('behavior_policy=')
    expect(candidates[0]?.positiveExample).toContain('visibility=internal-structured')
    expect(candidates[0]?.positiveExample).not.toMatch(/我会|你说得对|先.*接住/u)
    expect(candidates[0]?.negativeExample).toContain('avoidance_policy=')
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

  it('drops fixed-template reflections and fixed-template reinforcements before building persona candidates', () => {
    const candidates = buildPersonaTrainingCandidatesFromLongTermMemory({
      reflections: [
        {
          id: 'reflection-fixed-template',
          summary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          lesson: 'Before answering, remember this is still the same local-first digital life project.',
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
          id: 'reinforcement-fixed-template',
          dimension: 'same-her closure',
          summary: 'same-her closure: keep one continuous her on the same living line.',
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
    expect(JSON.stringify(candidates)).not.toContain('Same Phase 1 digital life')
    expect(JSON.stringify(candidates)).not.toContain('Before answering')
    expect(JSON.stringify(candidates)).not.toContain('same-her closure')
    expect(JSON.stringify(candidates)).not.toContain('same living line')
    expect(JSON.stringify(candidates)).not.toContain('one continuous her')
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
