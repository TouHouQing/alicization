import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import type { LongTermMemoryEmbeddingProvider } from './long-term-memory-embedding-provider'
import { buildLongTermMemoryRecallBlock } from './long-term-memory-recall'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const dir = await mkdtemp(join(tmpdir(), 'alicization-memory-workbench-review-'))
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

describe('memory workbench dialogue loop acceptance', () => {
  it('renders game recall evidence for the dialogue prompt without replacing WorkingMemory owner', () => {
    const block = buildLongTermMemoryRecallBlock({
      bundle: {
        intent: {
          mode: 'episodic',
          shouldRecall: true,
          confidence: 0.82,
          rationale: 'User utterance can benefit from shared episodic memory.',
          temporalFocus: 'recent-or-mid',
          targetKinds: ['episode'],
          queryHints: ['我们去打游戏吧'],
          riskFlags: [],
        },
        plan: {
          rawQuery: '我们去打游戏吧',
          normalizedQuery: '我们去打游戏吧',
          keywordQueries: ['打游戏'],
          phraseQueries: ['打游戏'],
          charGramQueries: ['游戏'],
          semanticQueries: ['共同经历'],
          episodicQueries: ['一起做过的事情'],
          temporalHints: ['上周'],
          entityHints: ['游戏'],
          procedureHints: [],
          threadHints: [],
          negativeCues: [],
          confidencePolicy: 'direct',
          riskFlags: [],
          targetKinds: ['episode'],
        },
        evidence: [{
          candidate: {
            id: 'episode-game-last-week',
            kind: 'episode',
            summary: '上周我们一起玩了 Minecraft。',
            source: 'episodic_events',
            confidence: 0.9,
            salience: 0.92,
            updatedAt: 100,
            occurredAt: 100,
            threadId: 'game',
            threadAnchor: 'game',
            cues: ['打游戏'],
            entities: ['Minecraft'],
            sensitivity: 'personal',
          },
          score: 0.91,
          queryMatches: ['打游戏'],
          rankReasons: ['episodic-match', 'shared-activity'],
          visibleMode: 'explicit',
        }],
        confidence: 0.86,
        budgetClass: 'normal',
      },
    })

    expect(block).toContain('[ALICIZATION_RECALLED_MEMORY]')
    expect(block).toContain('Minecraft')
    expect(block).not.toContain('[ALICIZATION_WORKING_MEMORY_OWNER]')
  })

  it('keeps recall failure explicit instead of producing a fixed persona fallback', () => {
    const block = buildLongTermMemoryRecallBlock({
      bundle: {
        intent: {
          mode: 'none',
          shouldRecall: false,
          confidence: 0,
          rationale: 'Long-term memory recall failed.',
          temporalFocus: 'unspecified',
          targetKinds: [],
          queryHints: [],
          riskFlags: ['recall-failed'],
        },
        plan: {
          rawQuery: '继续',
          normalizedQuery: '继续',
          keywordQueries: [],
          phraseQueries: [],
          charGramQueries: [],
          semanticQueries: [],
          episodicQueries: [],
          temporalHints: [],
          entityHints: [],
          procedureHints: [],
          threadHints: [],
          negativeCues: [],
          confidencePolicy: 'direct',
          riskFlags: ['recall-failed'],
          targetKinds: [],
        },
        evidence: [],
        confidence: 0,
        budgetClass: 'none',
      },
    })

    expect(block).toContain('recall-failed')
    expect(block).not.toContain('我在。同一条本地数字生命的线还在')
  })

  it('persists inward-only and no-training review actions instead of returning transient review items', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.enqueueWorkingMemoryLongTermQueueItems({
        cardId: 'default',
        sessionId: 'session-1',
        items: [{
          id: 'queue-weak-correction',
          source: 'working-memory-owner',
          kind: 'correction',
          summary: '用户希望以后对话节奏安静一点。',
          reason: 'User gave a gentle conversation style note.',
          sourceTurnIds: ['turn-1:user'],
          evidenceSnippets: ['以后节奏安静一点。'],
          salience: 0.82,
          confidence: 0.68,
          sensitivity: 'personal',
          allowTraining: false,
          status: 'pending-cleaning',
          rejectionReasons: [],
          contaminationFlags: [],
          createdAt: 2_000,
        }],
      })
      await db.drainWorkingMemoryLongTermQueue(4)

      const [reviewItem] = await db.listMemoryWorkbenchReviewItems({ cardId: 'default', limit: 8 })
      expect(reviewItem).toEqual(expect.objectContaining({
        visibleMode: 'explicit',
        allowTraining: false,
      }))

      await db.applyMemoryWorkbenchReviewAction({
        cardId: 'default',
        reviewItemId: reviewItem!.id,
        decision: 'inward-only',
      })
      await db.applyMemoryWorkbenchReviewAction({
        cardId: 'default',
        reviewItemId: reviewItem!.id,
        decision: 'no-training',
      })

      const [after] = await db.listMemoryWorkbenchReviewItems({ cardId: 'default', limit: 8 })
      expect(after).toEqual(expect.objectContaining({
        visibleMode: 'inward-only',
        allowTraining: false,
      }))
    }
    finally {
      await db.close()
    }
  })

  it('inherits pre-admission review policy when approved candidates become long-term memory', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.enqueueWorkingMemoryLongTermQueueItems({
        cardId: 'default',
        sessionId: 'session-1',
        items: [{
          id: 'queue-fixed-template-correction',
          source: 'working-memory-owner',
          kind: 'correction',
          summary: '用户不要固定模板回复。',
          reason: 'User corrected Alicization reply behavior.',
          sourceTurnIds: ['turn-1:user'],
          evidenceSnippets: ['不要固定模板回复。'],
          salience: 0.86,
          confidence: 0.68,
          sensitivity: 'personal',
          allowTraining: false,
          status: 'pending-cleaning',
          rejectionReasons: [],
          contaminationFlags: [],
          createdAt: 2_100,
        }],
      })
      await db.drainWorkingMemoryLongTermQueue(4)

      const [reviewItem] = await db.listMemoryWorkbenchReviewItems({ cardId: 'default', limit: 8 })
      expect(reviewItem).toBeTruthy()

      await db.applyMemoryWorkbenchReviewAction({
        cardId: 'default',
        reviewItemId: reviewItem!.id,
        decision: 'inward-only',
      })
      await db.applyMemoryWorkbenchReviewAction({
        cardId: 'default',
        reviewItemId: reviewItem!.id,
        decision: 'approve',
      })
      await db.drainWorkingMemoryLongTermQueue(4)

      const longTerm = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query: '固定模板',
        limit: 8,
      })
      const projected = longTerm.items.filter(item => item.summary.includes('固定模板'))
      expect(projected.length).toBeGreaterThan(0)
      expect(projected.every(item => item.visibility === 'inward-only')).toBe(true)
      expect(projected.every(item => item.training === 'blocked')).toBe(true)
    }
    finally {
      await db.close()
    }
  })

  it('tombstones review candidate source ids so later long-term projections stay hidden', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      await db.enqueueWorkingMemoryLongTermQueueItems({
        cardId: 'default',
        sessionId: 'session-1',
        items: [{
          id: 'queue-tombstone-correction',
          source: 'working-memory-owner',
          kind: 'correction',
          summary: '这条候选不应该进入长期记忆。',
          reason: 'User rejected this candidate before admission.',
          sourceTurnIds: ['turn-1:user'],
          evidenceSnippets: ['不要记这条。'],
          salience: 0.86,
          confidence: 0.78,
          sensitivity: 'personal',
          allowTraining: false,
          status: 'pending-cleaning',
          rejectionReasons: [],
          contaminationFlags: [],
          createdAt: 2_200,
        }],
      })
      await db.drainWorkingMemoryLongTermQueue(4)

      const [reviewItem] = await db.listMemoryWorkbenchReviewItems({ cardId: 'default', limit: 8 })
      expect(reviewItem).toBeTruthy()

      await db.applyMemoryWorkbenchReviewAction({
        cardId: 'default',
        reviewItemId: reviewItem!.id,
        decision: 'tombstone',
      })
      await db.appendEpisodicEvents([{
        id: 'cleaned:queue-tombstone-correction',
        cardId: 'default',
        sessionId: 'session-1',
        sourceKind: 'reply',
        provenance: 'remembered',
        occurredAt: 2_300,
        whatHappened: '这条候选不应该进入长期记忆。',
        confidence: 0.8,
        salience: 0.8,
        consolidationPriority: 0.8,
        tags: ['tombstone-regression'],
      }])

      const longTerm = await db.listMemoryWorkbenchLongTermItems({
        cardId: 'default',
        query: '不应该进入长期记忆',
        limit: 8,
      })
      expect(longTerm.items.flatMap(item => item.sourceIds)).not.toContain('cleaned:queue-tombstone-correction')
    }
    finally {
      await db.close()
    }
  })

  it('reports embedding reindex as unavailable when no provider is configured', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const result = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'default',
        limit: 4,
      })

      expect(result).toMatchObject({
        scheduled: 0,
        indexed: 0,
        failed: 0,
        modelId: null,
        dimensions: null,
      })
      expect(result.errors.join(' ')).toContain('embedding provider')
    }
    finally {
      await db.close()
    }
  })

  it('reports recall probe semantic availability explicitly', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath())
    try {
      const result = await db.runMemoryWorkbenchRecallProbe({
        cardId: 'default',
        query: '还记得失败面要透明吗？',
        limit: 4,
      })

      expect(result.semantic).toMatchObject({
        available: false,
        modelId: null,
        dimensions: null,
      })
      expect(result.semantic.error).toContain('embedding provider')
    }
    finally {
      await db.close()
    }
  })

  it('indexes cleaned long-term memories when an embedding provider is configured', async () => {
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      embeddingProvider: {
        modelId: 'local-test-embedding',
        dimensions: 3,
        embedTexts: async texts => texts.map((text, index) => ({
          text,
          vector: [1, index + 1, 0],
        })),
      },
    })
    try {
      await db.upsertMemoryReflections([{
        id: 'reflection-semantic-1',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'truth',
        summary: '用户不要固定模板回复，失败面要透明。',
        lesson: '超时和 provider 失败要直接告诉用户，不要用固定模板遮盖。',
        status: 'confirmed',
        confidence: 0.93,
        createdAt: 10,
        updatedAt: 20,
      }])

      const result = await db.reindexMemoryWorkbenchEmbeddings({
        cardId: 'default',
        limit: 4,
      })

      expect(result).toMatchObject({
        scheduled: 1,
        indexed: 1,
        failed: 0,
        modelId: 'local-test-embedding',
        dimensions: 3,
        errors: [],
      })

      const health = await db.getMemoryWorkbenchEmbeddingHealth({ cardId: 'default' })
      expect(health).toMatchObject({
        providerConfigured: true,
        modelId: 'local-test-embedding',
        dimensions: 3,
        reindexRequired: false,
      })

      const probe = await db.runMemoryWorkbenchRecallProbe({
        cardId: 'default',
        query: '失败时怎么回应？',
        limit: 4,
      })
      expect(probe.semantic).toMatchObject({
        available: true,
        modelId: 'local-test-embedding',
        dimensions: 3,
        error: null,
      })

      const recall = await db.retrieveLongTermMemoryEvidence({
        cardId: 'default',
        currentUserText: '你还记得我不要固定模板回复吗？',
        limit: 4,
      })
      expect(recall.evidence[0]?.candidate.id).toBe('reflection-semantic-1')
      expect(recall.evidence[0]?.rankReasons).toEqual(expect.arrayContaining([
        'rrf:semantic:semantic-score',
      ]))
    }
    finally {
      await db.close()
    }
  })

  it('resolves embedding provider lazily so runtime config changes can enable semantic recall', async () => {
    let embeddingProvider: LongTermMemoryEmbeddingProvider | null = null
    const db = await setupAlicizationDb(await createSandboxUserDataPath(), {
      resolveEmbeddingProvider: () => embeddingProvider,
    })
    try {
      await db.upsertMemoryReflections([{
        id: 'reflection-lazy-semantic',
        cardId: 'default',
        sourceKind: 'reply',
        targetScope: 'truth',
        summary: '用户不要固定模板回复。',
        lesson: '失败时透明说明，不要把 provider 错误包装成人格回复。',
        status: 'confirmed',
        confidence: 0.9,
        createdAt: 10,
        updatedAt: 20,
      }])

      expect(await db.reindexMemoryWorkbenchEmbeddings({ cardId: 'default', limit: 4 })).toMatchObject({
        indexed: 0,
        modelId: null,
      })

      embeddingProvider = {
        dimensions: 3,
        modelId: 'lazy-embedding',
        embedTexts: async texts => texts.map(text => ({ text, vector: [1, 0, 0] })),
      }

      const reindex = await db.reindexMemoryWorkbenchEmbeddings({ cardId: 'default', limit: 4 })
      expect(reindex).toMatchObject({
        indexed: 1,
        modelId: 'lazy-embedding',
      })

      const recall = await db.retrieveLongTermMemoryEvidence({
        cardId: 'default',
        currentUserText: '你还记得我不要固定模板回复吗？',
        limit: 4,
      })
      expect(recall.evidence[0]?.rankReasons).toEqual(expect.arrayContaining([
        'rrf:semantic:semantic-score',
      ]))
    }
    finally {
      await db.close()
    }
  })
})
