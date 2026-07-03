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
