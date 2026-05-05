import { describe, expect, it, vi } from 'vitest'

import {
  deriveRuntimeReplyAuthorityGovernance,
  forceProviderMindVisibleReplyAuthority,
} from './runtime-reply-authority'

describe('runtime reply authority helpers', () => {
  it('forces non-null governance onto provider mind authority', () => {
    expect(forceProviderMindVisibleReplyAuthority(null)).toBeNull()
    expect(forceProviderMindVisibleReplyAuthority({
      visibleReplyAuthority: 'llm-second-pass-rewrite',
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
    const applyRecollectionSurfaceRules = vi.fn(governance => ({
      ...governance,
      mustDo: ['recollection-rule'],
    }))

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
      applyMemoryDeliberationToGovernance,
      applyHostPersonModelToGovernance,
      applyRecollectionSurfaceRules,
    })

    expect(applyMemoryDeliberationToGovernance).toHaveBeenCalled()
    expect(applyRecollectionSurfaceRules).toHaveBeenCalled()
    expect(applyHostPersonModelToGovernance).toHaveBeenCalled()
    expect(result.effectiveMindTurnGovernanceWithRecollection).toEqual(expect.objectContaining({
      mustDo: ['recollection-rule'],
    }))
    expect(result.llmMindAuthorityGovernance).toEqual(expect.objectContaining({
      answerIntent: 'host-shaped',
      visibleReplyAuthority: 'llm-mind',
    }))
  })
})
