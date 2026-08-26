import { describe, expect, it } from 'vitest'

import {
  createMemoryWorkbenchPolicyStoreRuntime,
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
        sourceKind: null,
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
        sourceKind: null,
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

  it('filters same-id persona policies by the complete source reference', async () => {
    const runtime = createMemoryWorkbenchPolicyStoreRuntime({
      database: {} as never,
      now: () => 20,
      run: async () => {},
      all: async <T>() => [
        {
          source_id: 'shared-source',
          source: 'memory_reflections',
          source_kind: 'cleaned-long-term-reflection',
          visible_mode: 'explicit',
          allow_training: 0,
          review_state: 'no-training',
          reason: 'reflection policy',
          updated_at: 10,
        },
        {
          source_id: 'shared-source',
          source: 'persona_reinforcement_events',
          source_kind: 'persona-reinforcement',
          visible_mode: 'explicit',
          allow_training: 1,
          review_state: 'approved',
          reason: 'reinforcement policy',
          updated_at: 11,
        },
      ] as unknown as T[],
      enqueueWrite: async task => await task(),
      runInTransaction: async (_database, task) => await task(),
    })

    await expect(runtime.listPolicyOverrides({
      cardId: 'card-a',
      sourceRefs: [{
        sourceId: 'shared-source',
        sourceKind: 'cleaned-long-term-reflection',
      }],
    })).resolves.toEqual([
      expect.objectContaining({
        sourceId: 'shared-source',
        sourceKind: 'cleaned-long-term-reflection',
        allowTraining: false,
      }),
    ])
  })

  it('does not cross-match a persona source kind from an unrelated source namespace', async () => {
    const runtime = createMemoryWorkbenchPolicyStoreRuntime({
      database: {} as never,
      now: () => 20,
      run: async () => {},
      all: async <T>() => [
        {
          source_id: 'shared-source',
          source: 'unrelated_source',
          source_kind: 'cleaned-long-term-reflection',
          visible_mode: 'explicit',
          allow_training: 1,
          review_state: 'approved',
          reason: 'unrelated policy',
          updated_at: 12,
        },
        {
          source_id: 'shared-source',
          source: 'memory_reflections',
          source_kind: 'cleaned-long-term-reflection',
          visible_mode: 'inward-only',
          allow_training: 0,
          review_state: 'no-training',
          reason: 'reflection policy',
          updated_at: 11,
        },
      ] as unknown as T[],
      enqueueWrite: async task => await task(),
      runInTransaction: async (_database, task) => await task(),
    })

    await expect(runtime.listPolicyOverrides({
      cardId: 'card-a',
      sourceRefs: [{
        sourceId: 'shared-source',
        sourceKind: 'cleaned-long-term-reflection',
      }],
    })).resolves.toEqual([
      expect.objectContaining({
        source: 'memory_reflections',
        sourceId: 'shared-source',
        sourceKind: 'cleaned-long-term-reflection',
        allowTraining: false,
      }),
    ])
  })
})
