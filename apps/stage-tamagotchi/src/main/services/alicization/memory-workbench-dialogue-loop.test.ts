import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
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
          confidence: 0.78,
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
})
