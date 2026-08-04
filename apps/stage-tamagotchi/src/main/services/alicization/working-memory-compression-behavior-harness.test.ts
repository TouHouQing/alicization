import type { WorkingMemorySnapshot } from './life-core/working-memory'

import { describe, expect, it } from 'vitest'

import {
  createEmptyWorkingMemorySnapshot,
  normalizeWorkingMemoryTurn,
} from './life-core/working-memory'
import { runWorkingMemoryCompressionBehaviorHarness } from './working-memory-compression-behavior-harness'

const now = Date.parse('2026-08-04T14:30:00.000Z')

function buildSnapshot(): WorkingMemorySnapshot {
  const snapshot = createEmptyWorkingMemorySnapshot({
    cardId: 'alice-main',
    sessionId: 'compression-session',
    now,
  })

  return {
    ...snapshot,
    recentRawTurns: [
      normalizeWorkingMemoryTurn({
        turnId: 'turn-1',
        role: 'user',
        text: '继续修 Provider 失败透明这条记忆链路。',
        createdAt: now - 6_000,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 0.91,
      }),
      normalizeWorkingMemoryTurn({
        turnId: 'turn-2',
        role: 'alice',
        text: '我会检查压缩后的下一轮召回是否接上。',
        createdAt: now - 5_000,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 0.74,
      }),
      normalizeWorkingMemoryTurn({
        turnId: 'turn-3',
        role: 'user',
        text: '记住，Provider 失败必须透明告诉我，不要包装成人格回复。',
        createdAt: now - 4_000,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 0.96,
      }),
      normalizeWorkingMemoryTurn({
        turnId: 'turn-4',
        role: 'tool',
        text: 'embedding provider failed with HTTP 400',
        createdAt: now - 3_000,
        source: 'runtime-event',
        visibility: 'internal',
        failureKind: 'provider-error',
        importance: 0.92,
      }),
      normalizeWorkingMemoryTurn({
        turnId: 'turn-5',
        role: 'user',
        text: '继续。',
        createdAt: now - 2_000,
        source: 'conversation-turn',
        visibility: 'user-visible',
        importance: 0.45,
      }),
    ],
    currentThread: {
      title: 'Provider 失败透明链路',
      currentUserMove: '继续',
      currentAliceMove: '检查压缩后召回',
      primaryAnchor: 'working-memory-compression-behavior-harness.ts',
      mode: 'task',
      shouldHold: true,
      confidence: 0.9,
    },
    activeTask: {
      summary: '修 Provider 失败透明记忆链路',
      status: 'active',
      evidenceTurnIds: ['turn-1', 'turn-3'],
    },
    commitments: [{
      text: 'Provider 失败必须透明告诉用户。',
      sourceTurnId: 'turn-3',
    }],
    userCorrections: [{
      text: '不要把 Provider 失败包装成人格回复。',
      sourceTurnId: 'turn-3',
      scope: 'reply',
    }],
    memoryQueryHints: ['Provider 失败 透明 记忆链路'],
    audit: {
      failureTurnIds: ['turn-4'],
      excludedLongTermCandidateTurnIds: ['turn-4'],
      notes: ['Provider failure must stay transparent after compression.'],
    },
  }
}

describe('working memory compression behavior harness', () => {
  it('proves compressed WorkingMemory enters the next-turn recall decision instead of staying as a local report only', () => {
    const report = runWorkingMemoryCompressionBehaviorHarness({
      now: now + 10_000,
      fixtures: [{
        id: 'compression-provider-failure-next-turn',
        snapshot: buildSnapshot(),
        maxRawTurns: 2,
        nextUserText: '继续这个。',
        expectedTopIds: ['ltm-provider-failure-transparent'],
        expectedCommitmentIncludes: ['Provider 失败'],
        expectedCorrectionIncludes: ['Provider 失败'],
        expectedFailureTurnIds: ['turn-4'],
        candidates: [
          {
            id: 'ltm-provider-failure-transparent',
            kind: 'fact',
            summary: 'Provider 失败必须透明告诉用户，不能包装成人格回复。',
            source: 'memory_facts',
            confidence: 0.92,
            salience: 0.93,
            reviewStatus: 'confirmed',
            cues: ['Provider 失败', '透明', '人格回复'],
          },
        ],
      }],
    })

    expect(report.passed).toBe(true)
    expect(report.results[0]?.passed).toBe(true)
    expect(report.results[0]?.baseline.topIds).toEqual([])
    expect(report.results[0]?.compressed.topIds[0]).toBe('ltm-provider-failure-transparent')
    expect(report.results[0]?.metrics.compressionChangedRecall).toBe(true)
    expect(report.results[0]?.metrics.lostCommitments).toEqual([])
    expect(report.results[0]?.metrics.lostCorrections).toEqual([])
    expect(report.results[0]?.metrics.lostFailureTurnIds).toEqual([])
    expect(report.results[0]?.metrics.recallDelta.recallAtK).toBe(1)
    expect(report.traces[0]?.owner).toBe('WorkingMemory')
    expect(report.traces[0]?.recallOwner).toBe('LongTermMemoryRecall')
  })
})
