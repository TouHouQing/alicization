import type { OrganicMemoryPromptContext } from './runtime-soul'

import { describe, expect, it } from 'vitest'

import { tuneOrganicMemoryPromptContextForExecutiveTurn } from './runtime-organic-memory-surface-planning'

describe('runtime organic memory surface planning', () => {
  it('preserves the complete memory-owner context regardless of reply governance fields', () => {
    const context = {
      hostAttitude: '',
      coreIncarnation: '',
      activeThoughts: [{ id: 'thought-1', text: '继续当前记忆线索' }],
      retrievedFacts: [{ id: 'fact-1' }],
      recalledFragments: [{ id: 'fragment-1' }],
      recalledEpisodes: [{ id: 'episode-1' }],
      recollectedWindows: [{ id: 'window-1' }],
      consolidatedMemories: [{ id: 'memory-1' }],
      recollectionNarratives: [{ id: 'narrative-1' }],
      recollectionPlan: { selectedEpisodeIds: ['episode-1'] },
      recollectionSpeechPlan: { placement: 'after-direct-answer' },
      memoryDeliberation: { selectedMemoryIds: ['memory-1'] },
      proceduralMemories: [{ id: 'procedure-1' }],
    } as unknown as OrganicMemoryPromptContext

    const result = tuneOrganicMemoryPromptContextForExecutiveTurn({
      context,
      recallGovernor: {
        allowActiveThoughts: false,
        allowRecalledFragments: false,
        recalledFragmentCap: 0,
      } as never,
    })

    expect(result).toBe(context)
    expect(result).toEqual(context)
  })
})
