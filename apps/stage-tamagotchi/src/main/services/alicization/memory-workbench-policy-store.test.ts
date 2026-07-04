import { describe, expect, it } from 'vitest'

import {
  deriveMemoryWorkbenchPolicyForSource,
  inheritPreAdmissionMemoryWorkbenchPolicies,
  mergeMemoryWorkbenchPolicy,
} from './memory-workbench-policy-store'

describe('memory workbench policy store helpers', () => {
  it('keeps private sources inward by default and blocks training', () => {
    expect(mergeMemoryWorkbenchPolicy({
      sourceId: 'reflection-1',
      source: 'memory_reflections',
      sensitivity: 'private',
      override: null,
      tombstoned: false,
    })).toMatchObject({
      visibleMode: 'inward-only',
      training: 'blocked',
      tombstoned: false,
    })
  })

  it('lets explicit policy override default visibility while keeping training blocked', () => {
    expect(mergeMemoryWorkbenchPolicy({
      sourceId: 'fact-1',
      source: 'memory_facts',
      sensitivity: 'personal',
      override: {
        sourceId: 'fact-1',
        source: 'memory_facts',
        visibleMode: 'inward-only',
        allowTraining: false,
        reviewState: 'inward-only',
        reason: 'user choice',
        updatedAt: 10,
      },
      tombstoned: false,
    })).toMatchObject({
      visibleMode: 'inward-only',
      training: 'blocked',
    })
  })

  it('treats tombstone as highest priority', () => {
    expect(mergeMemoryWorkbenchPolicy({
      sourceId: 'fact-1',
      source: 'memory_facts',
      sensitivity: 'public',
      override: {
        sourceId: 'fact-1',
        source: 'memory_facts',
        visibleMode: 'explicit',
        allowTraining: true,
        reviewState: 'approved',
        reason: null,
        updatedAt: 10,
      },
      tombstoned: true,
    })).toMatchObject({
      tombstoned: true,
      training: 'blocked',
    })
  })

  it('inherits pre-admission policy to projected source ids', () => {
    const inherited = inheritPreAdmissionMemoryWorkbenchPolicies({
      candidatePolicies: [
        deriveMemoryWorkbenchPolicyForSource({
          sourceId: 'candidate-1',
          source: 'working_memory_long_term_candidate',
          visibleMode: 'inward-only',
          allowTraining: false,
          reviewState: 'inward-only',
          reason: 'review action',
          updatedAt: 10,
        }),
      ],
      candidateSourceIds: ['candidate-1'],
      projectedSources: [
        { sourceId: 'fact-1', source: 'memory_facts' },
        { sourceId: 'reflection-1', source: 'memory_reflections' },
      ],
      now: 20,
    })

    expect(inherited.map(item => `${item.source}:${item.sourceId}:${item.visibleMode}`)).toEqual([
      'memory_facts:fact-1:inward-only',
      'memory_reflections:reflection-1:inward-only',
    ])
  })
})
