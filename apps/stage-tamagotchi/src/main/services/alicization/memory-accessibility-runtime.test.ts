import { describe, expect, it } from 'vitest'

import {
  buildAlicizationMemoryAccessCacheKey,
  buildAlicizationMemoryAccessibilityPlan,
  tuneMemoryConsolidationSearchInput,
} from './memory-accessibility-runtime'

describe('memory-accessibility-runtime', () => {
  it('builds a deep-thread accessibility plan for long-horizon task migration recall', () => {
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: '换了这么久，这种活你还是会沿旧方法接吗',
      recallGovernor: {
        recollectionIntent: {
          mode: 'experience-pattern',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: true,
          queryHints: ['旧方法', '接回去'],
          rationale: 'Task migration should reopen prior procedure continuity.',
          confidence: 0.82,
        },
        threadAnchors: ['runtime seam'],
      } as any,
    })

    expect(plan.latencyClass).toBe('deep')
    expect(plan.expansionMode).toBe('deep-thread')
    expect(plan.episodicLimit).toBeGreaterThan(5)
    expect(plan.preferredLayers[0]).toBe('hot-index')
    expect(plan.prewarmKey).toContain('runtime seam')
  })

  it('builds a summary-first plan for lighter dialogue recall', () => {
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: '前几天我们聊过什么',
      recallGovernor: {
        recollectionIntent: {
          mode: 'conversation-history',
          temporalFocus: 'cross-session',
          searchEpisodes: true,
          searchConversations: true,
          searchProceduralExperience: false,
          queryHints: ['聊过什么'],
          rationale: 'Conversation history can start summary-first.',
          confidence: 0.7,
        },
      } as any,
    })

    expect(plan.expansionMode).toBe('deep-thread')
    expect(buildAlicizationMemoryAccessCacheKey({
      namespace: 'conversation',
      recallSeed: '前几天我们聊过什么',
      plan,
    })).toContain('conversation')
  })

  it('tunes consolidation search input from the plan', () => {
    const plan = buildAlicizationMemoryAccessibilityPlan({
      recallSeed: '继续按之前那样修这个 runtime seam',
      recallGovernor: null,
    })
    const searchInput = tuneMemoryConsolidationSearchInput({
      query: '继续按之前那样修这个 runtime seam',
      plan,
      recollectionIntent: null,
    })

    expect(searchInput.limit).toBe(plan.consolidationLimit)
    expect(searchInput.query).toContain('runtime seam')
  })
})
