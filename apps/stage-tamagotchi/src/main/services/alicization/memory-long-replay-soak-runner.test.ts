import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'
import type {
  MemoryDialogueReplayDatabase,
  MemoryDialogueReplayProviderAdapter,
  MemoryDialogueReplayRecallInput,
} from './memory-db-dialogue-replay-harness'

import { describe, expect, it, vi } from 'vitest'

import {
  parseWorkingMemoryCheckpoint,
  serializeWorkingMemoryCheckpoint,
} from './life-core/working-memory-checkpoint'
import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'
import {
  runMemoryLongReplaySoak,
  serializeMemoryLongReplaySoakReport,
} from './memory-long-replay-soak-runner'

const baseNow = Date.parse('2026-08-18T10:00:00.000Z')

function createRecallBundle(
  input: MemoryDialogueReplayRecallInput,
  candidates: Parameters<typeof buildLongTermMemoryEvidenceBundle>[0]['candidates'],
): LongTermMemoryEvidenceBundle {
  const intent = deriveLongTermMemoryRecallIntent(input)
  const plan = buildLongTermMemoryQueryPlan({
    intent,
    currentUserText: input.currentUserText,
  })
  return buildLongTermMemoryEvidenceBundle({
    intent,
    plan,
    candidates,
    now: baseNow,
    limit: input.limit ?? 5,
    scope: {
      cardId: input.cardId,
      userId: input.userId ?? 'user-1',
    },
  })
}

function createFakeDb(input?: {
  recall?: (recallInput: MemoryDialogueReplayRecallInput) => LongTermMemoryEvidenceBundle
}) {
  let checkpointJson: string | null = null
  const upsertWorkingMemoryCheckpoint = vi.fn(async (snapshot: Parameters<MemoryDialogueReplayDatabase['upsertWorkingMemoryCheckpoint']>[0]) => {
    checkpointJson = serializeWorkingMemoryCheckpoint(snapshot)
  })
  const persistPersonaState = vi.fn(async () => {})
  const db: MemoryDialogueReplayDatabase = {
    getWorkingMemoryCheckpoint: vi.fn(async (cardId, sessionId) =>
      parseWorkingMemoryCheckpoint(checkpointJson, { cardId, sessionId })),
    upsertWorkingMemoryCheckpoint,
    retrieveLongTermMemoryEvidence: vi.fn(async recallInput =>
      input?.recall?.(recallInput) ?? createRecallBundle(recallInput, [])),
    persistPersonaState,
  }

  return {
    db,
    upsertWorkingMemoryCheckpoint,
    persistPersonaState,
    readCheckpoint: () => parseWorkingMemoryCheckpoint(checkpointJson),
  }
}

function createProvider(
  label: string,
): MemoryDialogueReplayProviderAdapter {
  return {
    generate: vi.fn(async ({
      turnId,
      recalledMemory,
    }: Parameters<MemoryDialogueReplayProviderAdapter['generate']>[0]) => ({
      text: `${label}:${turnId}:${recalledMemory.evidence.map(item => item.candidate.id).join(',')}`,
      personaState: {
        version: 'should-not-be-written',
      },
    })),
  }
}

describe('memory long replay soak runner', () => {
  it('runs bounded rounds through fake DB/provider owners and emits JSON metrics without Persona writes', async () => {
    const fakeDb = createFakeDb({
      recall: recallInput => createRecallBundle(recallInput, recallInput.currentUserText.includes('白樱')
        ? [{
            id: 'memory-white-sakura',
            kind: 'fact',
            summary: '白樱线要保持在同一段真实桌面对话里。',
            source: 'memory_facts',
            confidence: 0.96,
            salience: 0.92,
            reviewStatus: 'confirmed',
            cues: ['白樱'],
          }]
        : []),
    })
    const report = await runMemoryLongReplaySoak({
      id: 'long-soak-basic',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      rounds: 2,
      maxRawTurns: 2,
      db: fakeDb.db,
      provider: createProvider('reply'),
      turns: [
        {
          turnId: 'turn-1',
          userText: '先把白樱线留住。',
          now: baseNow,
        },
        {
          turnId: 'turn-2',
          userText: '你还记得白樱线吗？',
          now: baseNow + 1_000,
        },
      ],
      observers: {
        monotonicNow: (() => {
          let value = 0
          return () => {
            value += 4
            return value
          }
        })(),
        sqliteSizeBytes: async ({ round, phase }) =>
          round * 100 + (phase === 'after' ? 10 : 0),
      },
    })

    expect(report.passed).toBe(true)
    expect(report.summary).toMatchObject({
      roundCount: 2,
      turnCount: 4,
      succeededTurnCount: 4,
      failedTurnCount: 0,
      recalledEvidenceCount: 2,
      providerFailureCount: 0,
      restartFailureCount: 0,
    })
    expect(report.summary.stageCounts).toEqual({
      'hydration': 4,
      'compression': 4,
      'context-assembly': 4,
      'recall': 4,
      'provider-adapter': 4,
      'commit': 4,
    })
    expect(report.latencyMs).toEqual({
      p50: 4,
      p95: 4,
      p99: 4,
      sampleCount: 4,
    })
    expect(report.checkpoint).toMatchObject({
      writeCount: 4,
      duplicateWritebackCount: 0,
      growthBytes: expect.any(Number),
    })
    expect(report.sqlite).toEqual({
      sampleCount: 4,
      initialBytes: 100,
      finalBytes: 210,
      growthBytes: 110,
      maxBytes: 210,
      observerErrorCount: 0,
    })
    expect(fakeDb.persistPersonaState).not.toHaveBeenCalled()
    expect(JSON.parse(serializeMemoryLongReplaySoakReport(report))).toMatchObject({
      version: 'memory-long-replay-soak-report-v1',
      id: 'long-soak-basic',
      passed: true,
    })
  })

  it('classifies supplied gold labels into miss, wrong-thread, stale, and abstain counters', async () => {
    const fakeDb = createFakeDb({
      recall: (recallInput) => {
        const candidates = recallInput.currentUserText.includes('wrong-thread')
          ? [{
              id: 'memory-foreign-thread',
              kind: 'episode' as const,
              summary: '另一个线程里的旧记忆。',
              source: 'memory_episodic_events',
              confidence: 0.9,
              salience: 0.8,
              cues: ['wrong-thread'],
            }]
          : recallInput.currentUserText.includes('stale')
            ? [{
                id: 'memory-stale',
                kind: 'fact' as const,
                summary: '一条已经过期的记忆。',
                source: 'memory_facts',
                confidence: 0.8,
                salience: 0.7,
                cues: ['stale'],
              }]
            : []
        return createRecallBundle(recallInput, candidates)
      },
    })

    const report = await runMemoryLongReplaySoak({
      id: 'long-soak-gold',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      rounds: 1,
      db: fakeDb.db,
      provider: createProvider('gold'),
      turns: [
        {
          turnId: 'turn-miss',
          userText: 'missing',
          now: baseNow,
        },
        {
          turnId: 'turn-wrong-thread',
          userText: '你还记得 wrong-thread 吗？',
          now: baseNow + 1,
        },
        {
          turnId: 'turn-stale',
          userText: '你还记得 stale 吗？',
          now: baseNow + 2,
        },
        {
          turnId: 'turn-abstain',
          userText: '不要回忆这条。',
          now: baseNow + 3,
        },
      ],
      goldLabels: [
        {
          turnId: 'turn-miss',
          label: 'missing',
          expectedMemoryIds: ['memory-expected'],
        },
        {
          turnId: 'turn-wrong-thread',
          label: 'wrong',
          reason: 'wrong-thread',
          wrongThreadIds: ['memory-foreign-thread'],
        },
        {
          turnId: 'turn-stale',
          label: 'wrong',
          reason: 'expired',
          staleMemoryIds: ['memory-stale'],
        },
        {
          turnId: 'turn-abstain',
          label: 'unwanted',
          reason: 'should-abstain',
        },
      ],
    })

    expect(report.passed).toBe(true)
    expect(report.gold).toMatchObject({
      sampleCount: 4,
      missCount: 1,
      wrongThreadCount: 1,
      staleCount: 1,
      abstainCount: 1,
    })
    expect(report.turns.map(turn => turn.gold?.classification)).toEqual([
      'miss',
      'wrong-thread',
      'stale',
      'abstain',
    ])
  })

  it('keeps restart and provider injection failures transparent while continuing the soak', async () => {
    const fakeDb = createFakeDb()
    const restartErrors: string[] = []
    const report = await runMemoryLongReplaySoak({
      id: 'long-soak-failures',
      cardId: 'card-1',
      sessionId: 'session-1',
      userId: 'user-1',
      rounds: 3,
      db: fakeDb.db,
      provider: createProvider('failure'),
      turns: [{
        turnId: 'turn-failure',
        userText: '继续运行故障注入。',
        now: baseNow,
      }],
      restart: {
        rounds: [2],
        hook: async () => {
          throw new Error('restart database unavailable')
        },
      },
      failureInjection: {
        providerFailureRounds: [3],
        providerFailureMessage: 'provider unavailable during long soak',
      },
      observers: {
        onError: (error) => {
          restartErrors.push(error)
        },
      },
    })

    expect(report.passed).toBe(false)
    expect(report.summary).toMatchObject({
      roundCount: 3,
      turnCount: 2,
      succeededTurnCount: 1,
      failedTurnCount: 1,
      providerFailureCount: 1,
      restartFailureCount: 1,
    })
    expect(report.rounds[1]).toMatchObject({
      round: 2,
      status: 'failed',
      restart: {
        status: 'failed',
        error: 'restart database unavailable',
      },
    })
    expect(report.rounds[2]).toMatchObject({
      round: 3,
      status: 'failed',
      error: 'provider unavailable during long soak',
    })
    expect(restartErrors).toEqual([
      'restart database unavailable',
      'provider unavailable during long soak',
    ])
  })
})
