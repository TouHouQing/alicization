import type { WorkingMemorySnapshot } from './life-core/working-memory'
import type { LongTermMemoryEvidenceBundle } from './long-term-memory-recall'

import { describe, expect, it, vi } from 'vitest'

import { createEmptyWorkingMemorySnapshot } from './life-core/working-memory'
import {
  buildLongTermMemoryEvidenceBundle,
  buildLongTermMemoryQueryPlan,
  deriveLongTermMemoryRecallIntent,
} from './long-term-memory-recall'
import {
  runMemoryProductionTrialRunner,
  serializeMemoryProductionTrialReport,
} from './memory-production-trial-runner'

const now = Date.parse('2026-08-04T14:30:00.000Z')

function buildWorkingMemorySnapshot(): WorkingMemorySnapshot {
  return {
    ...createEmptyWorkingMemorySnapshot({
      cardId: 'alice-main',
      sessionId: 'trial-session',
      now,
    }),
    currentThread: {
      title: '真实用户记忆试用',
      currentUserMove: '继续检查失败透明和记忆召回',
      currentAliceMove: '运行生产试用 runner',
      primaryAnchor: 'memory-production-trial-runner.ts',
      mode: 'task',
      shouldHold: true,
      confidence: 0.9,
    },
    activeTask: {
      summary: '运行真实用户试用 runner',
      status: 'active',
      evidenceTurnIds: ['turn-1'],
    },
    commitments: [{
      text: 'Provider 失败必须透明说明。',
      sourceTurnId: 'turn-1',
    }],
    userCorrections: [{
      text: '不要把 provider 失败包装成人格回复。',
      sourceTurnId: 'turn-1',
      scope: 'reply',
    }],
    audit: {
      failureTurnIds: ['turn-provider-failed'],
      excludedLongTermCandidateTurnIds: ['turn-provider-failed'],
      notes: ['provider failure is user-visible'],
    },
  }
}

function recallBundle(query: string): LongTermMemoryEvidenceBundle {
  const intent = deriveLongTermMemoryRecallIntent({ currentUserText: query })
  const plan = buildLongTermMemoryQueryPlan({ intent, currentUserText: query })
  return buildLongTermMemoryEvidenceBundle({
    intent,
    plan,
    now,
    limit: 5,
    semanticScores: {
      'reflection-provider-failure': 0.97,
    },
    candidates: [{
      id: 'reflection-provider-failure',
      kind: 'reflection',
      summary: '用户要求 Provider 失败必须透明说明。',
      source: 'memory_reflections',
      confidence: 0.95,
      salience: 0.95,
      reviewStatus: 'confirmed',
      cues: ['Provider 失败', '透明说明'],
    }],
  })
}

describe('memory production trial runner', () => {
  it('runs dialogue replay, WorkingMemory compression, DB recall, and Persona dataset hygiene as one JSON report', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-provider-failure',
      cardId: 'alice-main',
      createdAt: now,
      dialogueReplay: async () => ({
        id: 'dialogue-replay-provider-failure',
        passed: true,
        turnCount: 2,
        workingMemory: [{
          id: 'working-memory-provider-failure',
          snapshot: buildWorkingMemorySnapshot(),
          maxRawTurns: 3,
          now,
          expectedTaskIncludes: ['真实用户试用 runner'],
          expectedCommitmentIncludes: ['Provider 失败'],
          expectedCorrectionIncludes: ['provider 失败'],
          expectedFailureTurnIds: ['turn-provider-failed'],
        }],
      }),
      longTerm: [{
        fixture: {
          id: 'db-recall-provider-failure',
          cardId: 'alice-main',
          query: '你还记得 Provider 失败应该怎么说吗？',
          expectedTopIds: ['reflection-provider-failure'],
          semantic: {
            available: true,
            providerId: 'test-provider',
            modelId: 'test-embedding',
            dimensions: 3,
            reindexRequired: false,
          },
        },
        recall: vi.fn(async input => recallBundle(input.currentUserText)),
        now: vi.fn()
          .mockReturnValueOnce(now)
          .mockReturnValueOnce(now + 18),
      }],
      personaTraining: [{
        id: 'persona-dataset-provider-failure',
        cardId: 'alice-main',
        createdAt: now,
        consent: { granted: true, policyVersion: 'v1', scope: 'persona-dataset', capturedAt: now },
        sources: [{
          cardId: 'alice-main',
          sourceId: 'reflection-provider-failure',
          sourceKind: 'cleaned-long-term-reflection',
          status: 'confirmed',
          cleaned: true,
          summary: '失败时直接说明 provider 问题。',
          lesson: '不要把 provider 失败伪装成人格回复。',
          sensitivity: 'personal',
          allowTraining: true,
          provenance: {
            kind: 'working-memory-cleaning',
            cleaningTransactionId: 'cleaning-provider-failure',
            cleanedAt: now - 100,
          },
        }],
        expectedExportedSourceIds: ['reflection-provider-failure'],
      }],
    })

    expect(report.passed).toBe(true)
    expect(report.summary).toMatchObject({
      dialogueReplayCount: 1,
      workingMemoryFixtureCount: 1,
      longTermFixtureCount: 1,
      personaTrainingFixtureCount: 1,
      failingStageIds: [],
    })
    expect(report.stages.map(stage => stage.stage)).toEqual([
      'dialogue-replay',
      'working-memory-compression',
      'long-term-recall',
      'persona-dataset-hygiene',
    ])
    expect(report.quality.traces.map(trace => trace.owner)).toEqual([
      'LongTermMemoryRecall',
      'WorkingMemory',
      'PersonaTrainingDataset',
    ])
    expect(JSON.parse(serializeMemoryProductionTrialReport(report))).toMatchObject({
      version: 'memory-production-trial-runner-v1',
      id: 'production-trial-provider-failure',
      passed: true,
    })
  })

  it('keeps replay failures explicit and still returns a quality report for remaining fixtures', async () => {
    const report = await runMemoryProductionTrialRunner({
      id: 'production-trial-replay-failure',
      cardId: 'alice-main',
      createdAt: now,
      dialogueReplay: async () => {
        throw new Error('dialogue replay provider timeout')
      },
      workingMemory: [{
        id: 'working-memory-provider-failure',
        snapshot: buildWorkingMemorySnapshot(),
        maxRawTurns: 3,
        now,
        expectedTaskIncludes: ['真实用户试用 runner'],
      }],
      longTerm: [],
      personaTraining: [],
    })

    expect(report.passed).toBe(false)
    expect(report.summary.failingStageIds).toContain('dialogue-replay')
    expect(report.stages[0]).toMatchObject({
      stage: 'dialogue-replay',
      passed: false,
      error: 'dialogue replay provider timeout',
    })
    expect(report.recommendedNextActions).toContain('修复 dialogue replay/provider 失败后再相信本次生产试用结果。')
    expect(report.quality.summary.workingMemoryFixtureCount).toBe(1)
  })
})
