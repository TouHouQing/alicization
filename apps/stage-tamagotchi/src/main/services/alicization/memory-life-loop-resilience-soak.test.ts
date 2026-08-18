import type { MemoryDialogueReplayDatabase, MemoryDialogueReplayProviderAdapter } from './memory-db-dialogue-replay-harness'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { setupAlicizationDb } from './db'
import { replayMemoryDialogue } from './memory-db-dialogue-replay-harness'

const sandboxDirs: string[] = []

async function createSandboxUserDataPath() {
  const path = await mkdtemp(join(tmpdir(), 'alicization-memory-life-loop-soak-'))
  sandboxDirs.push(path)
  return path
}

function createReplayDb(
  db: Awaited<ReturnType<typeof setupAlicizationDb>>,
): MemoryDialogueReplayDatabase {
  return {
    getWorkingMemoryCheckpoint: async (cardId, sessionId) =>
      await db.getWorkingMemoryCheckpoint(cardId, sessionId),
    upsertWorkingMemoryCheckpoint: async snapshot =>
      await db.upsertWorkingMemoryCheckpoint(snapshot),
    retrieveLongTermMemoryEvidence: async input =>
      await db.retrieveLongTermMemoryEvidenceReadOnly(input),
  }
}

function createProvider() {
  const calls: Array<{
    turnId: string
    recalledEvidenceIds: string[]
    compressedTimelineLength: number
  }> = []
  const provider: MemoryDialogueReplayProviderAdapter = {
    generate: async ({ turnId, memoryContext }) => {
      const recalledEvidenceIds = memoryContext.longTermRecall?.evidence.map(item => item.id) ?? []
      calls.push({
        turnId,
        recalledEvidenceIds,
        compressedTimelineLength: memoryContext.workingMemory.compressedTimeline.length,
      })
      return {
        text: recalledEvidenceIds.length > 0
          ? `我接上了之前的长期记忆：${recalledEvidenceIds.join(',')}`
          : `我先把这一轮留在当前对话里：${turnId}`,
      }
    },
  }
  return { provider, calls }
}

afterEach(async () => {
  while (sandboxDirs.length > 0) {
    const path = sandboxDirs.pop()
    if (path)
      await rm(path, { recursive: true, force: true })
  }
})

describe('memory life-loop resilience soak', () => {
  it('keeps compressed WorkingMemory and LongTermMemory recall across a real database restart', async () => {
    const userDataPath = await createSandboxUserDataPath()
    const cardId = 'card-restart-soak'
    const sessionId = 'session-restart-soak'
    const { provider, calls } = createProvider()
    const first = await setupAlicizationDb(userDataPath, { cardId })

    try {
      await first.upsertMemoryFacts([{
        subject: '用户',
        predicate: 'prefers',
        object: '先给结论，再自然解释原因',
        confidence: 0.96,
        sourceLabel: 'restart-soak-fact',
        validationStatus: 'validated',
      }], 'rule')
      await first.rebuildLongTermMemorySearchIndex({ cardId })

      const firstReplay = async (turns: Parameters<typeof replayMemoryDialogue>[0]['turns']) =>
        await replayMemoryDialogue({
          id: 'real-db-restart-before',
          cardId,
          sessionId,
          userId: 'local-user',
          turns,
          db: createReplayDb(first),
          provider,
          maxRawTurns: 2,
          recallLimit: 5,
        })

      const beforeRestart = await firstReplay([
        {
          turnId: 'turn-restart-1',
          userText: '我们先把这条对话线留住。',
          now: Date.parse('2026-08-15T10:00:00.000Z'),
        },
        {
          turnId: 'turn-restart-2',
          userText: '再补充一点当前任务背景。',
          now: Date.parse('2026-08-15T10:00:01.000Z'),
        },
        {
          turnId: 'turn-restart-3',
          userText: '把前面的内容压缩成仍然能继续使用的上下文。',
          now: Date.parse('2026-08-15T10:00:02.000Z'),
        },
      ])

      expect(beforeRestart.passed).toBe(true)
      const checkpointBeforeRestart = await first.getWorkingMemoryCheckpoint(cardId, sessionId)
      expect(checkpointBeforeRestart).toMatchObject({
        cardId,
        sessionId,
      })
      expect(checkpointBeforeRestart?.compressedTimeline.length).toBeGreaterThan(0)
      expect(checkpointBeforeRestart?.recentRawTurns.map(turn => turn.turnId)).toEqual([
        'turn-restart-3:user',
        'turn-restart-3:alice',
      ])
      expect((await first.listWorkingMemoryCheckpoints(cardId)).map(snapshot => snapshot.sessionId)).toEqual([
        sessionId,
      ])
    }
    finally {
      await first.close()
    }

    const restarted = await setupAlicizationDb(userDataPath, { cardId })
    try {
      const afterRestart = await replayMemoryDialogue({
        id: 'real-db-restart-after',
        cardId,
        sessionId,
        userId: 'local-user',
        turns: [{
          turnId: 'turn-restart-4',
          userText: '你还记得我希望复杂问题先给结论吗？',
          now: Date.parse('2026-08-15T10:00:03.000Z'),
        }],
        db: createReplayDb(restarted),
        provider,
        maxRawTurns: 2,
        recallLimit: 5,
      })

      expect(afterRestart.passed).toBe(true)
      expect(afterRestart.turns[0]).toMatchObject({
        status: 'succeeded',
        writeback: {
          checkpoint: 'written',
        },
        stages: expect.arrayContaining([
          expect.objectContaining({
            name: 'hydration',
            details: expect.objectContaining({ found: true }),
          }),
          expect.objectContaining({
            name: 'compression',
            details: expect.objectContaining({
              changed: true,
            }),
          }),
          expect.objectContaining({
            name: 'recall',
            details: expect.objectContaining({
              status: 'recalled',
            }),
          }),
        ]),
      })
      expect(afterRestart.turns[0]?.recalledEvidenceIds.length).toBeGreaterThan(0)
      expect(afterRestart.turns[0]?.providerOutput).toContain('长期记忆')
      expect(calls.at(-1)?.compressedTimelineLength).toBeGreaterThan(0)

      const checkpointAfterRestart = await restarted.getWorkingMemoryCheckpoint(cardId, sessionId)
      expect(checkpointAfterRestart?.recentRawTurns.at(-1)?.turnId).toBe('turn-restart-4:alice')
      expect(checkpointAfterRestart?.compressedTimeline.some(item =>
        item.sourceTurnIds.some(sourceTurnId => sourceTurnId.startsWith('turn-restart-3:')),
      )).toBe(true)
      expect((await restarted.listWorkingMemoryCheckpoints(cardId)).map(snapshot => snapshot.sessionId)).toEqual([
        sessionId,
      ])

      const checkpointBeforeProviderFailure = structuredClone(checkpointAfterRestart)
      const failedReplay = await replayMemoryDialogue({
        id: 'real-db-provider-failure',
        cardId,
        sessionId,
        userId: 'local-user',
        turns: [{
          turnId: 'turn-restart-failure',
          userText: '这一轮模拟 Provider 失败。',
          now: Date.parse('2026-08-15T10:00:04.000Z'),
        }],
        db: createReplayDb(restarted),
        provider: {
          generate: async () => {
            throw new Error('provider network unavailable during restart soak')
          },
        },
        maxRawTurns: 2,
        recallLimit: 5,
      })

      expect(failedReplay.passed).toBe(false)
      expect(failedReplay.turns[0]).toMatchObject({
        status: 'failed',
        writeback: {
          checkpoint: 'skipped',
          persona: 'skipped',
        },
        error: 'provider network unavailable during restart soak',
      })
      expect(await restarted.getWorkingMemoryCheckpoint(cardId, sessionId)).toEqual(
        checkpointBeforeProviderFailure,
      )

      const foreign = await setupAlicizationDb(userDataPath, { cardId: 'card-restart-foreign' })
      try {
        const foreignRecall = await foreign.retrieveLongTermMemoryEvidenceReadOnly({
          cardId: 'card-restart-foreign',
          currentUserText: '你还记得我希望复杂问题先给结论吗？',
          limit: 5,
        })
        expect(foreignRecall.evidence).toHaveLength(0)
      }
      finally {
        await foreign.close()
      }
    }
    finally {
      await restarted.close()
    }
  }, 30_000)
})
