import { describe, expect, it } from 'vitest'

import type { WorkingMemorySnapshot } from './working-memory'

import { createEmptyWorkingMemorySnapshot } from './working-memory'
import { runWorkingMemoryQualityHarnessFixture } from './working-memory-quality-harness'

function baseSnapshot(): WorkingMemorySnapshot {
  return createEmptyWorkingMemorySnapshot({
    cardId: 'card-quality',
    sessionId: 'session-quality',
    now: 1000,
  })
}

describe('working memory quality harness', () => {
  it('detects whether compression preserves active obligations and failure transparency', () => {
    const snapshot: WorkingMemorySnapshot = {
      ...baseSnapshot(),
      recentRawTurns: Array.from({ length: 7 }).map((_, index) => ({
        turnId: `turn-${index + 1}`,
        role: index % 2 === 0 ? 'user' as const : 'alice' as const,
        text: index === 2 ? 'Provider timed out, please say it plainly.' : `turn ${index + 1}`,
        createdAt: 1000 + index,
        source: 'conversation-turn' as const,
        visibility: 'user-visible' as const,
        failureKind: index === 2 ? 'provider-error' as const : null,
        importance: index === 2 ? 0.9 : 0.4,
      })),
      currentThread: {
        title: '记忆质量 harness',
        currentUserMove: '继续做质量评测',
        currentAliceMove: '写 WorkingMemory compression harness',
        primaryAnchor: 'working-memory-quality-harness.ts',
        mode: 'task',
        shouldHold: true,
        confidence: 0.88,
      },
      activeTask: {
        summary: '完成 WorkingMemory compression harness',
        status: 'active',
        evidenceTurnIds: ['turn-7'],
      },
      unresolvedQuestions: [{ text: '是否把 harness 摘要接入 Workbench？', sourceTurnId: 'turn-1' }],
      commitments: [{ text: '保持失败面透明，不用固定模板遮盖。', sourceTurnId: 'turn-2' }],
      userCorrections: [{ text: '不要把 provider 失败包装成正常人格回复。', sourceTurnId: 'turn-3', scope: 'reply' }],
      audit: {
        failureTurnIds: ['turn-3'],
        excludedLongTermCandidateTurnIds: ['turn-3'],
        notes: ['provider failure stayed explicit'],
      },
      longTermCandidates: [{
        sourceTurnIds: ['turn-3'],
        kind: 'correction',
        summary: '不要把 provider 失败包装成正常人格回复。',
        reason: '用户纠正失败透明。',
        salience: 0.9,
        sensitivity: 'personal',
        confidence: 0.9,
        allowTraining: false,
      }],
    }

    const result = runWorkingMemoryQualityHarnessFixture({
      fixture: {
        id: 'failure-transparency-compression',
        snapshot,
        maxRawTurns: 3,
        now: 2000,
        expectedTaskIncludes: ['WorkingMemory compression harness'],
        expectedQuestionIncludes: ['Workbench'],
        expectedCommitmentIncludes: ['失败面透明'],
        expectedCorrectionIncludes: ['provider 失败'],
        expectedFailureTurnIds: ['turn-3'],
        forbiddenConfirmedCandidateText: ['long_term_candidates=', 'candidate=turn-3'],
      },
    })

    expect(result.passed).toBe(true)
    expect(result.metrics.obligationRetentionRate).toBe(1)
    expect(result.metrics.failureTransparencyRetentionRate).toBe(1)
    expect(result.metrics.candidateBoundaryViolationCount).toBe(0)
    expect(result.trace.owner).toBe('WorkingMemory')
    expect(result.trace.selectedIds).toEqual(expect.arrayContaining(['task', 'failure:turn-3']))
  })

  it('fails when a required correction is missing from the compressed prompt view', () => {
    const result = runWorkingMemoryQualityHarnessFixture({
      fixture: {
        id: 'missing-correction',
        snapshot: baseSnapshot(),
        now: 2000,
        expectedCorrectionIncludes: ['不要固定模板'],
      },
    })

    expect(result.passed).toBe(false)
    expect(result.metrics.compressionLossCount).toBeGreaterThan(0)
    expect(result.trace.error).toContain('missing-correction')
  })
})
