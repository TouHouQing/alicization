import { describe, expect, it, vi } from 'vitest'

import {
  deriveRuntimeReplyAuthorityGovernance,
  forceProviderMindVisibleReplyAuthority,
} from './runtime-reply-authority'

describe('runtime reply authority helpers', () => {
  it('forces non-null governance onto provider mind authority', () => {
    expect(forceProviderMindVisibleReplyAuthority(null)).toBeNull()
    expect(forceProviderMindVisibleReplyAuthority({
      visibleReplyAuthority: 'local-deterministic-fallback',
    } as any)).toEqual(expect.objectContaining({
      visibleReplyAuthority: 'llm-mind',
    }))
  })

  it('derives reply authority governance through memory and social reducers before forcing llm mind', () => {
    const applyMemoryDeliberationToGovernance = vi.fn(() => ({
      answerIntent: 'memory-shaped',
    }) as any)
    const applyHostPersonModelToGovernance = vi.fn(() => ({
      answerIntent: 'host-shaped',
    }) as any)
    const result = deriveRuntimeReplyAuthorityGovernance({
      now: 1,
      governance: {
        answerIntent: 'base',
      } as any,
      context: {
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      },
      memoryTurnArtifact: {
        visibleMemoryGate: {
          status: 'inward-only',
          recallReadiness: 0.5,
          precisionProxy: 0.42,
          wrongThreadRisk: 0.2,
          latencyPressure: 0.1,
          reasons: ['precision-proxy-low'],
        },
      } as any,
      applyMemoryDeliberationToGovernance,
      applyHostPersonModelToGovernance,
    })

    expect(applyMemoryDeliberationToGovernance).toHaveBeenCalled()
    expect(applyHostPersonModelToGovernance).toHaveBeenCalled()
    expect(result.effectiveMindTurnGovernanceWithRecollection).toEqual(expect.objectContaining({
      mustDo: expect.arrayContaining(['memory_turn_gate.status=inward-only']),
    }))
    expect(result.llmMindAuthorityGovernance).toEqual(expect.objectContaining({
      answerIntent: 'host-shaped',
      visibleReplyAuthority: 'llm-mind',
    }))
  })
})
