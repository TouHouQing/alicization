import type sqlite3 from 'sqlite3'

import type {
  MemoryWorkbenchPolicyOverride,
  MemoryWorkbenchPolicyStoreRuntime,
} from './memory-workbench-policy-store'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from './db'
import { createMemoryWorkbenchPersonaCandidateRuntime } from './memory-workbench-persona-candidates'

import * as personaCandidatePolicy from './memory-workbench-persona-candidates'

const { mergePersonaCandidateReviewState } = personaCandidatePolicy

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-persona-candidates-'))
  sandboxDirs.push(dir)
  return dir
}

async function markPersonaSourcesCleaned(
  db: Awaited<ReturnType<typeof setupAlicizationDb>>,
  cardId: string,
  sourceRefs: Array<{
    sourceId: string
    sourceKind: 'cleaned-long-term-reflection' | 'persona-reinforcement'
  }>,
) {
  await db.recordPersonaTrainingSourceProvenance({
    cardId,
    cleaningTransactionId: `test-cleaning:${cardId}`,
    cleanedAt: Date.now(),
    sources: sourceRefs,
  })
  const reflectionIds = new Set(sourceRefs
    .filter(sourceRef => sourceRef.sourceKind === 'cleaned-long-term-reflection')
    .map(sourceRef => sourceRef.sourceId))
  if (reflectionIds.size > 0) {
    const reflections = await db.listMemoryReflections({
      cardId,
      limit: 1_000,
    })
    await db.upsertMemoryReflections(reflections.filter(reflection => reflectionIds.has(reflection.id)))
  }
}

function mockPersonaTrainingSourceProvenance(input: {
  cardId: string
  sourceRefs: Array<{
    sourceId: string
    sourceKind: 'cleaned-long-term-reflection' | 'persona-reinforcement'
  }>
}) {
  return input.sourceRefs.map(sourceRef => ({
    sourceId: sourceRef.sourceId,
    sourceKind: sourceRef.sourceKind,
    cleaningTransactionId: `test-cleaning:${input.cardId}`,
    cleanedAt: 100,
  }))
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const dir = sandboxDirs.pop()
    if (!dir)
      continue
    await rm(dir, { recursive: true, force: true })
  }
})

describe('memory workbench persona candidates', () => {
  it('admits only cleaned long-term sources with provider learning eligibility', () => {
    const resolver = (personaCandidatePolicy as Record<string, unknown>).resolvePersonaCandidateSourceEligibility
    expect(resolver).toBeTypeOf('function')

    const resolveEligibility = resolver as (input: {
      source: string
      origin: 'provider' | 'failure-surface' | 'authorization-surface'
      learningPolicy: {
        allowLongTermCondensation: boolean
        allowPersonaLearning: boolean
        allowTraining: boolean
      }
      contaminated: boolean
    }) => {
      allowLongTermCondensation: boolean
      allowPersonaLearning: boolean
      allowTraining: boolean
    }
    const providerPolicy = {
      allowLongTermCondensation: true,
      allowPersonaLearning: true,
      allowTraining: false,
    }

    expect(resolveEligibility({
      source: 'cleaned-long-term-reflection',
      origin: 'provider',
      learningPolicy: providerPolicy,
      contaminated: false,
    })).toEqual({
      allowLongTermCondensation: true,
      allowPersonaLearning: true,
      allowTraining: false,
    })

    for (const source of [
      'raw-transcript',
      'review-queue',
      'failure-artifact',
      'authorization-artifact',
    ]) {
      expect(resolveEligibility({
        source,
        origin: source === 'authorization-artifact' ? 'authorization-surface' : 'failure-surface',
        learningPolicy: providerPolicy,
        contaminated: false,
      })).toEqual({
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      })
    }
  })

  it('keeps training blocked until candidate is explicitly approved', () => {
    expect(mergePersonaCandidateReviewState({
      candidate: {
        id: 'persona-candidate:reflection-1',
        sourceMemoryIds: ['reflection-1'],
        behaviorLesson: '不要固定模板。',
        positiveExample: '我会自然回应。',
        negativeExample: '不要套模板。',
        privacyClass: 'personal-redacted',
        status: 'candidate',
      },
      review: null,
      now: 10,
    })).toMatchObject({
      status: 'candidate',
      allowTraining: false,
    })
  })

  it('persists no-training as blocked candidate state', () => {
    expect(mergePersonaCandidateReviewState({
      candidate: {
        id: 'persona-candidate:reflection-1',
        sourceMemoryIds: ['reflection-1'],
        behaviorLesson: '不要固定模板。',
        positiveExample: '我会自然回应。',
        negativeExample: '不要套模板。',
        privacyClass: 'personal-redacted',
        status: 'candidate',
      },
      review: {
        candidateId: 'persona-candidate:reflection-1',
        status: 'no-training',
        allowTraining: false,
        reason: 'user blocked',
        updatedAt: 20,
      },
      now: 30,
    })).toMatchObject({
      status: 'no-training',
      allowTraining: false,
      rejectionReason: 'user blocked',
    })
  })

  it('keeps approved candidate reviews blocked from automatic training', () => {
    expect(mergePersonaCandidateReviewState({
      candidate: {
        id: 'persona-candidate:reflection-1',
        sourceMemoryIds: ['reflection-1'],
        behaviorLesson: '失败时先透明说明。',
        positiveExample: '我会先说明失败面。',
        negativeExample: '不要把失败包装成陪伴。',
        privacyClass: 'personal-redacted',
        status: 'candidate',
      },
      review: {
        candidateId: 'persona-candidate:reflection-1',
        status: 'approved',
        allowTraining: true,
        reason: 'approved for policy only',
        updatedAt: 20,
      },
      now: 30,
    })).toMatchObject({
      status: 'approved',
      allowTraining: false,
      rejectionReason: 'approved for policy only',
    })
  })

  it('lists candidates from cleaned long-term reflections and persists no-training decisions', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'reflection-1',
          cardId: 'card-1',
          sourceKind: 'reply',
          targetScope: 'truth',
          summary: '失败面要透明。',
          lesson: '不要用固定模板遮盖失败，要先说明超时或 provider 失败。',
          status: 'confirmed',
          confidence: 0.92,
          createdAt: 10,
          updatedAt: 20,
        },
        {
          id: 'reflection-pending-high-confidence',
          cardId: 'card-1',
          sourceKind: 'reply',
          targetScope: 'habit',
          summary: '待审核反思。',
          lesson: '这条置信度很高但仍然不能进入 persona 候选。',
          status: 'pending',
          confidence: 0.98,
          createdAt: 11,
          updatedAt: 21,
        },
      ])
      await db.appendPersonaReinforcementEvents([
        {
          id: 'reinforcement-1',
          cardId: 'card-1',
          sourceKind: 'reply',
          dimension: 'truthful-grounding',
          delta: 0.2,
          valence: 'reinforce',
          summary: '强化失败透明。',
          createdAt: 30,
        },
      ])
      await markPersonaSourcesCleaned(db, 'card-1', [
        { sourceId: 'reflection-1', sourceKind: 'cleaned-long-term-reflection' },
        { sourceId: 'reinforcement-1', sourceKind: 'persona-reinforcement' },
      ])

      const listed = await db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-1',
        limit: 10,
      })

      expect(listed.items).toHaveLength(1)
      expect(listed.items[0]).toMatchObject({
        id: 'persona-candidate:reflection-1',
        sourceMemoryIds: ['reflection-1', 'reinforcement-1'],
        status: 'candidate',
        allowTraining: false,
      })

      await db.applyMemoryWorkbenchPersonaCandidateAction({
        cardId: 'card-1',
        candidateId: 'persona-candidate:reflection-1',
        decision: 'no-training',
        reason: 'user blocked training',
      })

      const blocked = await db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-1',
        status: 'no-training',
        limit: 10,
      })

      expect(blocked.items[0]).toMatchObject({
        id: 'persona-candidate:reflection-1',
        status: 'no-training',
        allowTraining: false,
        rejectionReason: 'user blocked training',
      })
    }
    finally {
      await db.close()
    }
  })

  it('rejects a confirmed reflection without persona training cleaning provenance', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([{
        id: 'reflection-without-provenance',
        cardId: 'card-provenance',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: '这条反思虽然已确认，但没有清洗证明。',
        lesson: '没有 provenance 的 confirmed 反思不能进入 Persona candidate。',
        status: 'confirmed',
        confidence: 0.95,
        createdAt: 10,
        updatedAt: 20,
      }])

      await expect(db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-provenance',
        limit: 10,
      })).resolves.toMatchObject({
        items: [],
        nextCursor: null,
      })
    }
    finally {
      await db.close()
    }
  })

  it('filters unprovenanced reinforcement sources before applying the source limit', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([{
        id: 'reflection-reinforcement-window',
        cardId: 'card-reinforcement-window',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: '只保留有清洗证明的 persona reinforcement。',
        lesson: '人格候选必须继续保留真实 provenance。',
        status: 'confirmed',
        confidence: 0.95,
        createdAt: 10,
        updatedAt: 20,
      }])
      await db.appendPersonaReinforcementEvents([
        ...Array.from({ length: 7 }, (_, index) => ({
          id: `reinforcement-without-provenance-${index}`,
          cardId: 'card-reinforcement-window',
          sourceKind: 'reply' as const,
          dimension: 'companionship' as const,
          delta: 0.1,
          valence: 'reinforce' as const,
          summary: `没有清洗证明的早期来源 ${index}。`,
          createdAt: 200 - index,
        })),
        {
          id: 'reinforcement-with-provenance-after-window',
          cardId: 'card-reinforcement-window',
          sourceKind: 'reply' as const,
          dimension: 'companionship' as const,
          delta: 0.1,
          valence: 'reinforce' as const,
          summary: '窗口之后仍然有效的真实来源。',
          createdAt: 190,
        },
      ])
      await markPersonaSourcesCleaned(db, 'card-reinforcement-window', [
        {
          sourceId: 'reflection-reinforcement-window',
          sourceKind: 'cleaned-long-term-reflection',
        },
        {
          sourceId: 'reinforcement-with-provenance-after-window',
          sourceKind: 'persona-reinforcement',
        },
      ])

      await expect(db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-reinforcement-window',
        limit: 10,
      })).resolves.toMatchObject({
        items: [{
          id: 'persona-candidate:reflection-reinforcement-window',
          sourceMemoryIds: [
            'reflection-reinforcement-window',
            'reinforcement-with-provenance-after-window',
          ],
        }],
      })
    }
    finally {
      await db.close()
    }
  })

  it('removes stale template and suppress reinforcement sources from persisted projections', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([{
        id: 'reflection-stale-reinforcement',
        cardId: 'card-stale-reinforcement',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: '投影中的 reinforcement 来源也必须经过治理。',
        lesson: '只保留自然且有效的 reinforcement 来源。',
        status: 'confirmed',
        confidence: 0.95,
        createdAt: 10,
        updatedAt: 20,
      }])
      await markPersonaSourcesCleaned(db, 'card-stale-reinforcement', [{
        sourceId: 'reflection-stale-reinforcement',
        sourceKind: 'cleaned-long-term-reflection',
      }])

      await db.appendPersonaReinforcementEvents([
        {
          id: 'reinforcement-template-residue',
          cardId: 'card-stale-reinforcement',
          sourceKind: 'reply',
          dimension: 'companionship',
          delta: 0.1,
          valence: 'reinforce',
          summary: '这条来源带有模板残留。',
          createdAt: 30,
        },
        {
          id: 'reinforcement-suppress',
          cardId: 'card-stale-reinforcement',
          sourceKind: 'reply',
          dimension: 'companionship',
          delta: -0.1,
          valence: 'suppress',
          summary: '这条来源不是 reinforce。',
          createdAt: 29,
        },
      ])
      await db.recordPersonaTrainingSourceProvenance({
        cardId: 'card-stale-reinforcement',
        cleaningTransactionId: 'test-cleaning:stale-reinforcement',
        cleanedAt: 40,
        sources: [{
          sourceId: 'reinforcement-template-residue',
          sourceKind: 'persona-reinforcement',
        }, {
          sourceId: 'reinforcement-suppress',
          sourceKind: 'persona-reinforcement',
        }],
      })

      const listed = await db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-stale-reinforcement',
        limit: 10,
      })

      expect(listed.items).toHaveLength(1)
      expect(listed.items[0]?.sourceMemoryIds).toEqual([
        'reflection-stale-reinforcement',
      ])
    }
    finally {
      await db.close()
    }
  })

  it('stores persona candidate decisions in policy overlays without writing candidate review rows', async () => {
    const policyOverrides: MemoryWorkbenchPolicyOverride[] = []
    const upsertPolicyOverride = vi.fn(async (
      policyInput: Parameters<MemoryWorkbenchPolicyStoreRuntime['upsertPolicyOverride']>[0],
    ) => {
      const policy: MemoryWorkbenchPolicyOverride = {
        sourceId: policyInput.sourceId,
        source: policyInput.source,
        sourceKind: policyInput.sourceKind ?? null,
        visibleMode: policyInput.visibleMode,
        allowTraining: policyInput.allowTraining,
        reviewState: policyInput.reviewState,
        reason: policyInput.reason ?? null,
        updatedAt: 200,
      }
      policyOverrides.push(policy)
      return policy
    })
    const run = vi.fn(async (_database: sqlite3.Database, _sql: string) => undefined)
    const runtime = createMemoryWorkbenchPersonaCandidateRuntime({
      database: {} as never,
      now: () => 200,
      randomUUID: () => 'unused-review-id',
      run,
      all: async <T>(_database: sqlite3.Database, sql: string): Promise<T[]> => {
        if (sql.includes('FROM persona_training_candidate_projections')) {
          return [{
            candidate_id: 'persona-candidate:reflection-policy-overlay',
            root_source_id: 'reflection-policy-overlay',
            source_memory_ids_json: JSON.stringify(['reflection-policy-overlay']),
            behavior_lesson: '候选审核只改变治理策略。',
            positive_example: '候选审核只改变治理策略。',
            negative_example: null,
            privacy_class: 'personal-redacted',
            source_created_at: 10,
            source_updated_at: 20,
            updated_at: 20,
          }] as T[]
        }
        if (sql.includes('FROM memory_reflections'))
          return [{ id: 'reflection-policy-overlay' }] as T[]
        return []
      },
      enqueueWrite: async task => await task(),
      runInTransaction: async (_database, task) => await task(),
      policyStore: {
        upsertPolicyOverride,
        listPolicyOverrides: async ({ sourceIds, sourceRefs }) => policyOverrides.filter((policy) => {
          if (sourceRefs?.length) {
            return sourceRefs.some(sourceRef =>
              sourceRef.sourceId === policy.sourceId
              && sourceRef.sourceKind === policy.sourceKind,
            )
          }
          return !sourceIds?.length || sourceIds.includes(policy.sourceId)
        }),
        inheritCandidatePolicies: async () => [],
      },
      listPersonaTrainingSourceProvenance: async input => mockPersonaTrainingSourceProvenance(input),
      listMemoryReflectionsPage: async () => {
        throw new Error('policy overlay candidate listing must not scan reflection sources')
      },
      listPersonaReinforcementEventsPage: async () => ({
        items: [],
        nextCursor: null,
      }),
      listTombstonedLongTermMemorySourceIds: async () => new Set(),
    })

    const result = await runtime.applyPersonaCandidateAction({
      cardId: 'card-policy-overlay',
      candidateId: 'persona-candidate:reflection-policy-overlay',
      decision: 'approve',
      reason: '只记录候选治理策略',
    })

    expect(result).toMatchObject({
      id: 'persona-candidate:reflection-policy-overlay',
      status: 'approved',
      allowTraining: false,
    })
    expect(upsertPolicyOverride).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-policy-overlay',
      sourceId: 'reflection-policy-overlay',
      source: 'memory_reflections',
      sourceKind: 'cleaned-long-term-reflection',
      allowTraining: false,
      reviewState: 'approved',
      reason: '只记录候选治理策略',
    }))
    expect(run.mock.calls.some(([sql]) => String(sql).includes('persona_training_candidate_reviews'))).toBe(false)

    await expect(runtime.listPersonaCandidates({
      cardId: 'card-policy-overlay',
      limit: 10,
    })).resolves.toMatchObject({
      items: [{
        id: 'persona-candidate:reflection-policy-overlay',
        status: 'approved',
        allowTraining: false,
      }],
    })
  })

  it('pages beyond the old source window and updates a tail candidate', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const sourceCount = 257
      await db.upsertMemoryReflections(Array.from({ length: sourceCount }, (_, index) => ({
        id: `reflection-scale-${String(index).padStart(3, '0')}`,
        cardId: 'card-scale',
        sourceKind: 'reply' as const,
        targetScope: 'habit' as const,
        summary: `用户在 item-${index} 上有稳定偏好。`,
        lesson: `保留 item-${index} 的真实偏好变化。`,
        status: 'confirmed' as const,
        confidence: 0.9,
        createdAt: index,
        updatedAt: index,
      })))
      await markPersonaSourcesCleaned(db, 'card-scale', Array.from({ length: sourceCount }, (_, index) => ({
        sourceId: `reflection-scale-${String(index).padStart(3, '0')}`,
        sourceKind: 'cleaned-long-term-reflection' as const,
      })))

      const all = []
      let cursor: string | null = null
      do {
        const page = await db.listMemoryWorkbenchPersonaCandidates({
          cardId: 'card-scale',
          limit: 50,
          cursor,
        })
        all.push(...page.items)
        cursor = page.nextCursor
      } while (cursor)

      expect(all).toHaveLength(sourceCount)
      const tailCandidate = all.find(item => item.id === 'persona-candidate:reflection-scale-000')
      expect(tailCandidate).toBeDefined()

      const updated = await db.applyMemoryWorkbenchPersonaCandidateAction({
        cardId: 'card-scale',
        candidateId: 'persona-candidate:reflection-scale-000',
        decision: 'no-training',
        reason: '用户暂不允许进入训练治理',
      })

      expect(updated).toMatchObject({
        id: 'persona-candidate:reflection-scale-000',
        status: 'no-training',
        allowTraining: false,
      })
    }
    finally {
      await db.close()
    }
  })

  it('keeps persona pagination on source order when a review has a newer timestamp', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.upsertMemoryReflections([
        {
          id: 'reflection-review-page-1',
          cardId: 'card-review-page',
          sourceKind: 'reply',
          targetScope: 'habit',
          summary: '用户在第一个习惯上有稳定偏好。',
          lesson: '保留第一个习惯的真实偏好变化。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 1,
          updatedAt: 30,
        },
        {
          id: 'reflection-review-page-2',
          cardId: 'card-review-page',
          sourceKind: 'reply',
          targetScope: 'habit',
          summary: '用户在第二个习惯上有稳定偏好。',
          lesson: '保留第二个习惯的真实偏好变化。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 2,
          updatedAt: 20,
        },
        {
          id: 'reflection-review-page-3',
          cardId: 'card-review-page',
          sourceKind: 'reply',
          targetScope: 'habit',
          summary: '用户在第三个习惯上有稳定偏好。',
          lesson: '保留第三个习惯的真实偏好变化。',
          status: 'confirmed',
          confidence: 0.9,
          createdAt: 3,
          updatedAt: 10,
        },
      ])
      await markPersonaSourcesCleaned(db, 'card-review-page', [
        { sourceId: 'reflection-review-page-1', sourceKind: 'cleaned-long-term-reflection' },
        { sourceId: 'reflection-review-page-2', sourceKind: 'cleaned-long-term-reflection' },
        { sourceId: 'reflection-review-page-3', sourceKind: 'cleaned-long-term-reflection' },
      ])

      await db.applyMemoryWorkbenchPersonaCandidateAction({
        cardId: 'card-review-page',
        candidateId: 'persona-candidate:reflection-review-page-1',
        decision: 'approve',
      })

      const firstPage = await db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-review-page',
        limit: 1,
      })
      expect(firstPage.items.map(item => item.id)).toEqual([
        'persona-candidate:reflection-review-page-1',
      ])
      expect(firstPage.items[0]?.status).toBe('approved')
      expect(firstPage.items[0]?.updatedAt).toBeGreaterThan(30)

      const secondPage = await db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-review-page',
        limit: 1,
        cursor: firstPage.nextCursor,
      })
      expect(secondPage.items.map(item => item.id)).toEqual([
        'persona-candidate:reflection-review-page-2',
      ])
    }
    finally {
      await db.close()
    }
  })

  it('persists card-scoped projections across database reopen', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const sharedRootDir = join(userDataPath, 'shared-memory')
    const cardA = await setupAlicizationDb(userDataPath, {
      cardId: 'card-a',
      rootDir: sharedRootDir,
    })
    try {
      await cardA.upsertMemoryReflections([{
        id: 'reflection-card-a',
        cardId: 'card-a',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: 'A 机体确认的长期偏好。',
        lesson: '只允许 A 机体看到这条人格候选。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 10,
        updatedAt: 20,
      }])
      await markPersonaSourcesCleaned(cardA, 'card-a', [{
        sourceId: 'reflection-card-a',
        sourceKind: 'cleaned-long-term-reflection',
      }])
    }
    finally {
      await cardA.close()
    }

    const cardB = await setupAlicizationDb(userDataPath, {
      cardId: 'card-b',
      rootDir: sharedRootDir,
    })
    try {
      await cardB.upsertMemoryReflections([{
        id: 'reflection-card-b',
        cardId: 'card-b',
        sourceKind: 'reply',
        targetScope: 'habit',
        summary: 'B 机体确认的长期偏好。',
        lesson: '只允许 B 机体看到这条人格候选。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 11,
        updatedAt: 21,
      }])
      await markPersonaSourcesCleaned(cardB, 'card-b', [{
        sourceId: 'reflection-card-b',
        sourceKind: 'cleaned-long-term-reflection',
      }])

      await expect(cardB.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-b',
        limit: 10,
      })).resolves.toMatchObject({
        items: [{ id: 'persona-candidate:reflection-card-b' }],
      })
      await expect(cardB.applyMemoryWorkbenchPersonaCandidateAction({
        cardId: 'card-b',
        candidateId: 'persona-candidate:reflection-card-a',
        decision: 'approve',
      })).resolves.toBeNull()
    }
    finally {
      await cardB.close()
    }

    const reopenedA = await setupAlicizationDb(userDataPath, {
      cardId: 'card-a',
      rootDir: sharedRootDir,
    })
    try {
      const listed = await reopenedA.listMemoryWorkbenchPersonaCandidates({
        cardId: 'card-a',
        limit: 10,
      })
      expect(listed.items.map(item => item.id)).toEqual([
        'persona-candidate:reflection-card-a',
      ])
      expect(listed.items[0]?.allowTraining).toBe(false)
    }
    finally {
      await reopenedA.close()
    }
  })

  it('removes projections when confirmed reflections become pending denied or tombstoned', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const reflection = {
        id: 'reflection-lifecycle',
        cardId: 'default',
        sourceKind: 'reply' as const,
        targetScope: 'habit' as const,
        summary: '只有确认且未删除的反思可以进入候选。',
        lesson: '候选资格必须跟随长期记忆状态。',
        confidence: 0.9,
        createdAt: 10,
      }
      await db.upsertMemoryReflections([{
        ...reflection,
        status: 'confirmed',
        updatedAt: 20,
      }])
      await markPersonaSourcesCleaned(db, 'default', [{
        sourceId: reflection.id,
        sourceKind: 'cleaned-long-term-reflection',
      }])
      await expect(db.applyMemoryWorkbenchPersonaCandidateAction({
        cardId: 'default',
        candidateId: 'persona-candidate:reflection-lifecycle',
        decision: 'approve',
      })).resolves.toMatchObject({
        status: 'approved',
        allowTraining: false,
      })

      await db.upsertMemoryReflections([{
        ...reflection,
        status: 'pending',
        updatedAt: 30,
      }])
      await expect(db.applyMemoryWorkbenchPersonaCandidateAction({
        cardId: 'default',
        candidateId: 'persona-candidate:reflection-lifecycle',
        decision: 'approve',
      })).resolves.toBeNull()

      await db.upsertMemoryReflections([{
        ...reflection,
        status: 'denied',
        updatedAt: 40,
      }])
      await expect(db.listMemoryWorkbenchPersonaCandidates({
        cardId: 'default',
        limit: 10,
      })).resolves.toMatchObject({
        items: [],
      })

      await db.upsertMemoryReflections([{
        ...reflection,
        status: 'confirmed',
        updatedAt: 50,
      }])
      await db.tombstoneLongTermMemorySources({
        sourceIds: [reflection.id],
        source: 'memory_reflections',
        reason: 'user removed reflection',
      })
      await expect(db.applyMemoryWorkbenchPersonaCandidateAction({
        cardId: 'default',
        candidateId: 'persona-candidate:reflection-lifecycle',
        decision: 'approve',
      })).resolves.toBeNull()
    }
    finally {
      await db.close()
    }
  })

  it('bounds the first candidate page to the projection keyset query', async () => {
    const listMemoryReflectionsPage = vi.fn(async () => {
      throw new Error('projection listing must not scan reflection sources')
    })
    const projectionQueryParams: unknown[][] = []
    const runtime = createMemoryWorkbenchPersonaCandidateRuntime({
      database: {} as never,
      now: () => 100,
      randomUUID: () => 'test-review-id',
      run: async () => undefined,
      all: async <T>(_database: sqlite3.Database, sql: string, params: unknown[] = []): Promise<T[]> => {
        if (sql.includes('FROM persona_training_candidate_projections')) {
          projectionQueryParams.push(params)
          return [
            {
              candidate_id: 'persona-candidate:reflection-large-0000',
              root_source_id: 'reflection-large-0000',
              source_memory_ids_json: JSON.stringify(['reflection-large-0000']),
              behavior_lesson: '保留 item-0 的真实偏好变化。',
              positive_example: '保留 item-0 的真实偏好变化。',
              negative_example: null,
              privacy_class: 'personal-redacted',
              source_created_at: 0,
              source_updated_at: 4096,
              updated_at: 4096,
            },
            {
              candidate_id: 'persona-candidate:reflection-large-0001',
              root_source_id: 'reflection-large-0001',
              source_memory_ids_json: JSON.stringify(['reflection-large-0001']),
              behavior_lesson: '保留 item-1 的真实偏好变化。',
              positive_example: '保留 item-1 的真实偏好变化。',
              negative_example: null,
              privacy_class: 'personal-redacted',
              source_created_at: 1,
              source_updated_at: 4095,
              updated_at: 4095,
            },
          ] as T[]
        }
        if (sql.includes('FROM memory_reflections')) {
          return [
            { id: 'reflection-large-0000' },
            { id: 'reflection-large-0001' },
          ] as T[]
        }
        return []
      },
      enqueueWrite: async task => await task(),
      runInTransaction: async (_database, task) => await task(),
      policyStore: {
        upsertPolicyOverride: async () => {
          throw new Error('not used')
        },
        listPolicyOverrides: async () => [],
        inheritCandidatePolicies: async () => [],
      },
      listPersonaTrainingSourceProvenance: async input => mockPersonaTrainingSourceProvenance(input),
      listMemoryReflectionsPage,
      listPersonaReinforcementEventsPage: async () => ({
        items: [],
        nextCursor: null,
      }),
      listTombstonedLongTermMemorySourceIds: async () => new Set(),
    })

    const result = await runtime.listPersonaCandidates({
      cardId: 'card-large',
      limit: 1,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe('persona-candidate:reflection-large-0000')
    expect(result.nextCursor).not.toBeNull()
    expect(projectionQueryParams).toEqual([['card-large', 2]])
    expect(listMemoryReflectionsPage).not.toHaveBeenCalled()
  })

  it('backfills legacy reflections once and serves later pages only from persisted projections', async () => {
    let migrationState: 'complete' | 'dirty' = 'dirty'
    const projectionRows: Array<{
      candidate_id: string
      root_source_id: string
      source_memory_ids_json: string
      behavior_lesson: string
      positive_example: string
      negative_example: string | null
      privacy_class: string
      source_created_at: number
      source_updated_at: number
      updated_at: number
    }> = [{
      candidate_id: 'persona-candidate:stale',
      root_source_id: 'stale',
      source_memory_ids_json: JSON.stringify(['stale']),
      behavior_lesson: '陈旧投影。',
      positive_example: '陈旧投影。',
      negative_example: null,
      privacy_class: 'personal-redacted',
      source_created_at: 1,
      source_updated_at: 1,
      updated_at: 1,
    }]
    const migrationMarkerKeys: string[] = []
    const resetProjectionCards: string[] = []
    const listMemoryReflectionsPage = vi.fn(async () => ({
      items: [{
        id: 'reflection-legacy',
        cardId: 'card-legacy',
        decisionTraceId: null,
        turnId: null,
        sessionId: null,
        sourceKind: 'reply' as const,
        targetScope: 'habit' as const,
        summary: '旧数据库中已经确认的长期反思。',
        lesson: '迁移后仍保留已经确认的真实偏好。',
        status: 'confirmed' as const,
        confidence: 0.9,
        supportingFactIds: [],
        supportingOutcomeIds: [],
        createdAt: 10,
        updatedAt: 20,
        confirmedAt: 20,
        deniedAt: null,
      }],
      nextCursor: null,
    }))
    const runtime = createMemoryWorkbenchPersonaCandidateRuntime({
      database: {} as never,
      now: () => 100,
      randomUUID: () => 'test-review-id',
      run: async (_database, sql, params = []) => {
        if (sql.includes('DELETE FROM persona_training_candidate_projections')) {
          resetProjectionCards.push(String(params[0]))
          projectionRows.length = 0
        }
        if (sql.includes('INSERT INTO persona_training_candidate_projections')) {
          projectionRows.push({
            candidate_id: String(params[1]),
            root_source_id: String(params[2]),
            source_memory_ids_json: String(params[3]),
            behavior_lesson: String(params[4]),
            positive_example: String(params[5]),
            negative_example: params[6] == null ? null : String(params[6]),
            privacy_class: String(params[7]),
            source_created_at: Number(params[8]),
            source_updated_at: Number(params[9]),
            updated_at: Number(params[11]),
          })
        }
        if (sql.includes('INSERT INTO alicization_meta')) {
          migrationMarkerKeys.push(String(params[0]))
          migrationState = String(params[1]) === 'complete' ? 'complete' : 'dirty'
        }
        return undefined
      },
      all: async <T>(_database: sqlite3.Database, sql: string): Promise<T[]> => {
        if (sql.includes('SELECT value FROM alicization_meta'))
          return [{ value: migrationState }] as T[]
        if (sql.includes('SELECT DISTINCT card_id'))
          throw new Error('card-scoped backfill must not enumerate other cards')
        if (sql.includes('FROM memory_reflections'))
          return [{ id: 'reflection-legacy' }] as T[]
        if (sql.includes('FROM persona_training_candidate_projections'))
          return projectionRows as T[]
        return []
      },
      enqueueWrite: async task => await task(),
      runInTransaction: async (_database, task) => await task(),
      policyStore: {
        upsertPolicyOverride: async () => {
          throw new Error('not used')
        },
        listPolicyOverrides: async () => [],
        inheritCandidatePolicies: async () => [],
      },
      listPersonaTrainingSourceProvenance: async input => mockPersonaTrainingSourceProvenance(input),
      listMemoryReflectionsPage,
      listPersonaReinforcementEventsPage: async () => ({
        items: [],
        nextCursor: null,
      }),
      listTombstonedLongTermMemorySourceIds: async () => new Set(),
    })

    await runtime.backfillLegacyProjections('card-legacy')
    expect(listMemoryReflectionsPage).toHaveBeenCalledTimes(1)
    expect(projectionRows).toHaveLength(1)
    expect(migrationMarkerKeys).toEqual([
      'persona_candidate_projection_v1:card-legacy',
    ])
    expect(resetProjectionCards).toEqual(['card-legacy'])

    listMemoryReflectionsPage.mockClear()
    const listed = await runtime.listPersonaCandidates({
      cardId: 'card-legacy',
      limit: 10,
    })
    await runtime.backfillLegacyProjections('card-legacy')

    expect(listed.items).toEqual([
      expect.objectContaining({
        id: 'persona-candidate:reflection-legacy',
        allowTraining: false,
      }),
    ])
    expect(listMemoryReflectionsPage).not.toHaveBeenCalled()
  })

  it('lists persisted projections without reading reflection source pages', async () => {
    const listMemoryReflectionsPage = vi.fn(async () => {
      throw new Error('persisted candidate listing must not scan reflection sources')
    })
    const runtime = createMemoryWorkbenchPersonaCandidateRuntime({
      database: {} as never,
      now: () => 100,
      randomUUID: () => 'test-review-id',
      run: async () => undefined,
      all: async <T>(_database: sqlite3.Database, sql: string): Promise<T[]> => {
        if (sql.includes('FROM persona_training_candidate_projections')) {
          return [{
            candidate_id: 'persona-candidate:reflection-persisted',
            root_source_id: 'reflection-persisted',
            source_memory_ids_json: JSON.stringify(['reflection-persisted']),
            behavior_lesson: '保留用户已经确认的真实偏好。',
            positive_example: '保留用户已经确认的真实偏好。',
            negative_example: null,
            privacy_class: 'personal-redacted',
            source_created_at: 10,
            source_updated_at: 20,
            updated_at: 20,
          }] as T[]
        }
        if (sql.includes('FROM memory_reflections'))
          return [{ id: 'reflection-persisted' }] as T[]
        return []
      },
      enqueueWrite: async task => await task(),
      runInTransaction: async (_database, task) => await task(),
      policyStore: {
        upsertPolicyOverride: async () => {
          throw new Error('not used')
        },
        listPolicyOverrides: async () => [],
        inheritCandidatePolicies: async () => [],
      },
      listPersonaTrainingSourceProvenance: async input => mockPersonaTrainingSourceProvenance(input),
      listMemoryReflectionsPage,
      listPersonaReinforcementEventsPage: async () => ({
        items: [],
        nextCursor: null,
      }),
      listTombstonedLongTermMemorySourceIds: async () => new Set(),
    })

    const result = await runtime.listPersonaCandidates({
      cardId: 'card-persisted',
      limit: 10,
    })

    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'persona-candidate:reflection-persisted',
        sourceMemoryIds: ['reflection-persisted'],
        status: 'candidate',
        allowTraining: false,
      }),
    ])
    expect(listMemoryReflectionsPage).not.toHaveBeenCalled()
  })

  it('applies candidate actions by persisted candidate id without scanning reflection sources', async () => {
    const listMemoryReflectionsPage = vi.fn(async () => {
      throw new Error('candidate action must not scan reflection sources')
    })
    const runtime = createMemoryWorkbenchPersonaCandidateRuntime({
      database: {} as never,
      now: () => 200,
      randomUUID: () => 'test-review-id',
      run: async () => undefined,
      all: async <T>(_database: sqlite3.Database, sql: string): Promise<T[]> => {
        if (sql.includes('FROM persona_training_candidate_projections')) {
          return [{
            candidate_id: 'persona-candidate:reflection-direct',
            root_source_id: 'reflection-direct',
            source_memory_ids_json: JSON.stringify(['reflection-direct']),
            behavior_lesson: '审核动作只按候选 ID 定点读取。',
            positive_example: '审核动作只按候选 ID 定点读取。',
            negative_example: null,
            privacy_class: 'personal-redacted',
            source_created_at: 10,
            source_updated_at: 20,
            updated_at: 20,
          }] as T[]
        }
        if (sql.includes('FROM memory_reflections'))
          return [{ id: 'reflection-direct' }] as T[]
        return []
      },
      enqueueWrite: async task => await task(),
      runInTransaction: async (_database, task) => await task(),
      policyStore: {
        upsertPolicyOverride: async policy => ({
          sourceId: policy.sourceId,
          source: policy.source,
          sourceKind: policy.sourceKind ?? null,
          visibleMode: policy.visibleMode,
          allowTraining: policy.allowTraining,
          reviewState: policy.reviewState,
          reason: policy.reason ?? null,
          updatedAt: 200,
        }),
        listPolicyOverrides: async () => [],
        inheritCandidatePolicies: async () => [],
      },
      listPersonaTrainingSourceProvenance: async input => mockPersonaTrainingSourceProvenance(input),
      listMemoryReflectionsPage,
      listPersonaReinforcementEventsPage: async () => ({
        items: [],
        nextCursor: null,
      }),
      listTombstonedLongTermMemorySourceIds: async () => new Set(),
    })

    const result = await runtime.applyPersonaCandidateAction({
      cardId: 'card-direct',
      candidateId: 'persona-candidate:reflection-direct',
      decision: 'no-training',
      reason: '用户不允许训练',
    })

    expect(result).toEqual(expect.objectContaining({
      id: 'persona-candidate:reflection-direct',
      status: 'no-training',
      allowTraining: false,
    }))
    expect(listMemoryReflectionsPage).not.toHaveBeenCalled()
  })
})
