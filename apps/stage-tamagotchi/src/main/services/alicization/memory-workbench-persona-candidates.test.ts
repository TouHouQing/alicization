import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

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

  it('does not scan the complete reflection collection for the first candidate page', async () => {
    const sourceCount = 4096
    const reflections = Array.from({ length: sourceCount }, (_, index) => ({
      id: `reflection-large-${String(index).padStart(4, '0')}`,
      cardId: 'card-large',
      decisionTraceId: null,
      turnId: null,
      sessionId: null,
      sourceKind: 'reply' as const,
      targetScope: 'habit' as const,
      summary: `用户在 item-${index} 上有稳定偏好。`,
      lesson: `保留 item-${index} 的真实偏好变化。`,
      status: 'confirmed' as const,
      confidence: 0.9,
      supportingFactIds: [],
      supportingOutcomeIds: [],
      createdAt: index,
      updatedAt: sourceCount - index,
      confirmedAt: index,
      deniedAt: null,
    }))
    const reflectionPageLimits: number[] = []
    const reflectionPageCursors: Array<string | null | undefined> = []

    const runtime = createMemoryWorkbenchPersonaCandidateRuntime({
      database: {} as never,
      now: () => 100,
      randomUUID: () => 'test-review-id',
      run: async () => undefined,
      all: async () => [],
      enqueueWrite: async task => await task(),
      runInTransaction: async (_database, task) => await task(),
      policyStore: {
        upsertPolicyOverride: async () => {
          throw new Error('not used')
        },
        listPolicyOverrides: async () => [],
        inheritCandidatePolicies: async () => [],
      },
      listMemoryReflectionsPage: async (payload) => {
        const limit = payload.limit ?? 0
        reflectionPageLimits.push(limit)
        reflectionPageCursors.push(payload.cursor)
        const offset = payload.cursor
          ? reflections.findIndex((reflection) => {
            const cursor = JSON.parse(decodeURIComponent(payload.cursor!)) as { id: string }
            return reflection.id === cursor.id
          }) + 1
          : 0
        const pageItems = reflections.slice(offset, offset + limit)
        const last = pageItems.at(-1)
        return {
          items: pageItems,
          nextCursor: last && offset + pageItems.length < reflections.length
            ? encodeURIComponent(JSON.stringify({
                sortValue: last.updatedAt,
                id: last.id,
              }))
            : null,
        }
      },
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
    expect(reflectionPageLimits[0]).toBeLessThan(256)
    expect(reflectionPageCursors.length).toBeLessThanOrEqual(2)
  })
})
