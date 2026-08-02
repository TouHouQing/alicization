import type { AlicizationReplayBenchmarkStandardsRecord } from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'

import { describe, expect, it } from 'vitest'

import {
  applyMemoryTuningAdviceToHostPersonModel,
  deriveMemoryTuningAdviceFromReplayBenchmark,
  parseMemoryTuningAdvice,
} from './memory-tuning-advice'

const passingReplayStandards = {
  eraSelectionQuality: 'pass',
  resolutionLedgerQuality: 'pass',
  procedureCarryQuality: 'pass',
  wrongThreadSuppression: 'pass',
  replyMemoryCoherence: 'pass',
  implicitRecallQuality: 'pass',
  temporalScopeFlexibility: 'pass',
  recentOnlyDrift: 'pass',
  surfaceRestraint: 'pass',
  relationshipRepairAdaptation: 'pass',
  closenessLadderDrift: 'pass',
  eventGraphRecallCollapse: 'pass',
  knowledgeCorrectionDiscipline: 'pass',
  repeatedMistakeAvoidance: 'pass',
  hostUnderstandingGrowth: 'pass',
  skillInternalizationGrowth: 'pass',
  selfRevisionGrowth: 'pass',
  learningRevisionDiscipline: 'pass',
  domainInternalizationDiscipline: 'pass',
  worldModelValidationDiscipline: 'pass',
  dialogueRhythmStability: 'pass',
  emptyCareRate: 'pass',
  repairMechanicalRate: 'pass',
  warmthTemplateRisk: 'pass',
  relationshipDistanceJumpRate: 'pass',
  afterglowFalseCarryRate: 'pass',
  templateLeakage: 'pass',
} satisfies AlicizationReplayBenchmarkStandardsRecord

function buildReplayStandards(
  overrides: Partial<AlicizationReplayBenchmarkStandardsRecord> = {},
): AlicizationReplayBenchmarkStandardsRecord {
  return {
    ...passingReplayStandards,
    ...overrides,
  }
}

describe('memory-tuning-advice', () => {
  it('derives structured tuning advice from replay benchmark failures', () => {
    const advice = deriveMemoryTuningAdviceFromReplayBenchmark({
      now: 1_700_000_000_000,
      results: [
        {
          packId: 'sampled-humanlike-memory-v1',
          ranAt: 1_700_000_000_000,
          turnCount: 4,
          quality: [],
          standards: {
            eraSelectionQuality: 'pass',
            resolutionLedgerQuality: 'pass',
            procedureCarryQuality: 'fail',
            wrongThreadSuppression: 'fail',
            replyMemoryCoherence: 'pass',
            implicitRecallQuality: 'pass',
            temporalScopeFlexibility: 'pass',
            recentOnlyDrift: 'pass',
            surfaceRestraint: 'fail',
            relationshipRepairAdaptation: 'fail',
            closenessLadderDrift: 'pass',
            eventGraphRecallCollapse: 'pass',
            knowledgeCorrectionDiscipline: 'fail',
            repeatedMistakeAvoidance: 'pass',
            hostUnderstandingGrowth: 'pass',
            skillInternalizationGrowth: 'pass',
            selfRevisionGrowth: 'pass',
            learningRevisionDiscipline: 'fail',
            domainInternalizationDiscipline: 'fail',
            worldModelValidationDiscipline: 'fail',
            dialogueRhythmStability: 'pass',
            emptyCareRate: 'pass',
            repairMechanicalRate: 'pass',
            warmthTemplateRisk: 'pass',
            relationshipDistanceJumpRate: 'pass',
            afterglowFalseCarryRate: 'pass',
            templateLeakage: 'fail',
          },
          gate: {
            passed: false,
            failingKeys: ['procedureCarryQuality', 'wrongThreadSuppression', 'surfaceRestraint', 'relationshipRepairAdaptation', 'knowledgeCorrectionDiscipline', 'templateLeakage', 'learningRevisionDiscipline', 'domainInternalizationDiscipline', 'worldModelValidationDiscipline'],
            dimensions: [],
            standards: {
              eraSelectionQuality: 'pass',
              resolutionLedgerQuality: 'pass',
              procedureCarryQuality: 'fail',
              wrongThreadSuppression: 'fail',
              replyMemoryCoherence: 'pass',
              implicitRecallQuality: 'pass',
              temporalScopeFlexibility: 'pass',
              recentOnlyDrift: 'pass',
              surfaceRestraint: 'fail',
              relationshipRepairAdaptation: 'fail',
              closenessLadderDrift: 'pass',
              eventGraphRecallCollapse: 'pass',
              knowledgeCorrectionDiscipline: 'fail',
              repeatedMistakeAvoidance: 'pass',
              hostUnderstandingGrowth: 'pass',
              skillInternalizationGrowth: 'pass',
              selfRevisionGrowth: 'pass',
              learningRevisionDiscipline: 'fail',
              domainInternalizationDiscipline: 'fail',
              worldModelValidationDiscipline: 'fail',
              dialogueRhythmStability: 'pass',
              emptyCareRate: 'pass',
              repairMechanicalRate: 'pass',
              warmthTemplateRisk: 'pass',
              relationshipDistanceJumpRate: 'pass',
              afterglowFalseCarryRate: 'pass',
              templateLeakage: 'fail',
            },
          },
          telemetryPatch: {
            retrievalHealth: {
              semanticLatencyMs: null,
              graphLatencyMs: null,
              reconstructionFrequency: 0,
              reconstructedCount: 0,
              staleSelfModelVetoRate: 0.3,
              relationshipEraConfusionRate: 0.4,
              templateLeakageFailCount: 2,
            },
          },
          telemetryPersisted: true,
          failingTurnSet: [],
          finalReplayGate: {
            version: 'final-replay-gate-v1',
            passed: false,
            failingKeys: ['template-leakage'],
            metrics: {
              recallAt3: null,
              precisionAt3: null,
              wrongThreadRate: 0.2,
              templateLeakageFailCount: 2,
              authorityLeakCount: 0,
              localHumanlikeVisibleFallbackCount: 0,
              unsupportedSpecificityVisibleFailCount: 0,
              turnOsTraceCoverage: 1,
              learningOutcomeToSelfRevisionRoundtrip: 1,
            },
          },
          shipGate: [],
          regressionTriage: [],
          datasetFeedback: {
            backlogKey: 'replay_benchmark_dataset_backlog_v1',
            appendedCount: 1,
            totalCount: 2,
            persisted: true,
          },
        },
      ],
    })

    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'procedureCarryQuality',
      'wrongThreadSuppression',
      'surfaceRestraint',
      'relationshipRepairAdaptation',
      'knowledgeCorrectionDiscipline',
      'templateLeakage',
    ]))
    expect(advice.retrievalAdjustments.proceduralBoost).toBeGreaterThan(0.1)
    expect(advice.retrievalAdjustments.wrongThreadPenalty).toBeGreaterThan(0.1)
    expect(advice.surfaceAdjustments.inwardCarryBias).toBeGreaterThan(0.2)
    expect(advice.surfaceAdjustments.provenanceLabelBias).toBeGreaterThan(0.1)
    expect(advice.personStateAdjustments.repairWindowBias).toBeGreaterThan(0.1)
    expect(advice.personStateAdjustments.closenessCapBias).toBeGreaterThan(0.1)
    expect(advice.notes).toEqual(expect.arrayContaining([
      'metric:stale-self-model-veto-rate',
      'metric:relationship-era-confusion-rate',
    ]))
    expect(advice.notes.every(note => /^[a-z0-9][\w:.,/-]*$/u.test(note))).toBe(true)
    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'learningRevisionDiscipline',
      'domainInternalizationDiscipline',
    ]))
    expect(advice.surfaceAdjustments.specificityClampBias).toBeGreaterThan(0.1)
  })

  it('applies numeric person-state tuning without injecting fixed host-person prose', () => {
    const advice: AlicizationMemoryTuningAdvice = {
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_000,
      sourceReportAt: 1_700_000_000_000,
      focusDimensions: ['relationshipRepairAdaptation', 'surfaceRestraint'],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.08,
        temporalWindowBias: 0.12,
        wrongThreadPenalty: 0.12,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.2,
        delayUntilAfterPayoffBias: 0.16,
        provenanceLabelBias: 0.12,
        specificityClampBias: 0.12,
      },
      personStateAdjustments: {
        repairWindowBias: 0.18,
        closenessCapBias: 0.14,
      },
      notes: ['failure:relationship-repair-adaptation'],
    }

    const originalRepairTrigger = 'Observed repair cue from the host model.'
    const repairWindowPreference = 'Use the host model repair-window preference.'
    const focusedWorkPreference = 'Use the host model focused-work preference.'
    const hostPersonModel = applyMemoryTuningAdviceToHostPersonModel({
      hostPersonModel: {
        summary: 'Closer warmth is welcome when the opening is clearly there.',
        routines: [],
        sensitivities: [],
        repairTriggers: [originalRepairTrigger],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'The bond is warming.',
        },
        preferredClosenessByContext: [
          {
            context: 'repair-window',
            preference: repairWindowPreference,
            confidence: 0.6,
          },
          {
            context: 'focused-work',
            preference: focusedWorkPreference,
            confidence: 0.64,
          },
        ],
        recurrentBurdens: [],
        narrative: [],
        updatedAt: 1_700_000_000_000,
      },
      tuningAdvice: advice,
    })

    expect(hostPersonModel?.summary).toBe('Closer warmth is welcome when the opening is clearly there.')
    expect(hostPersonModel?.repairTriggers).toEqual([originalRepairTrigger])
    expect(hostPersonModel?.preferredClosenessByContext).toEqual([
      expect.objectContaining({
        context: 'repair-window',
        preference: repairWindowPreference,
        confidence: expect.closeTo(0.64, 2),
      }),
      expect.objectContaining({
        context: 'focused-work',
        preference: focusedWorkPreference,
        confidence: expect.closeTo(0.67, 2),
      }),
    ])
    expect(JSON.stringify(hostPersonModel)).not.toContain(advice.notes[0])
  })

  it('raises presence-related tuning advice from presence quality regressions', () => {
    const advice = deriveMemoryTuningAdviceFromReplayBenchmark({
      now: 1_700_000_000_000,
      results: [
        {
          packId: 'final-humanlike-memory-v1',
          ranAt: 1_700_000_000_000,
          turnCount: 2,
          quality: [],
          standards: {
            eraSelectionQuality: 'pass',
            resolutionLedgerQuality: 'pass',
            procedureCarryQuality: 'pass',
            wrongThreadSuppression: 'pass',
            replyMemoryCoherence: 'pass',
            implicitRecallQuality: 'pass',
            temporalScopeFlexibility: 'pass',
            recentOnlyDrift: 'pass',
            surfaceRestraint: 'pass',
            relationshipRepairAdaptation: 'pass',
            closenessLadderDrift: 'pass',
            eventGraphRecallCollapse: 'pass',
            knowledgeCorrectionDiscipline: 'pass',
            repeatedMistakeAvoidance: 'pass',
            hostUnderstandingGrowth: 'pass',
            skillInternalizationGrowth: 'pass',
            selfRevisionGrowth: 'pass',
            learningRevisionDiscipline: 'pass',
            domainInternalizationDiscipline: 'pass',
            worldModelValidationDiscipline: 'pass',
            dialogueRhythmStability: 'pass',
            emptyCareRate: 'pass',
            repairMechanicalRate: 'pass',
            warmthTemplateRisk: 'pass',
            relationshipDistanceJumpRate: 'pass',
            afterglowFalseCarryRate: 'pass',
            templateLeakage: 'pass',
          },
          gate: {
            passed: true,
            failingKeys: [],
            dimensions: [],
            standards: {
              eraSelectionQuality: 'pass',
              resolutionLedgerQuality: 'pass',
              procedureCarryQuality: 'pass',
              wrongThreadSuppression: 'pass',
              replyMemoryCoherence: 'pass',
              implicitRecallQuality: 'pass',
              temporalScopeFlexibility: 'pass',
              recentOnlyDrift: 'pass',
              surfaceRestraint: 'pass',
              relationshipRepairAdaptation: 'pass',
              closenessLadderDrift: 'pass',
              eventGraphRecallCollapse: 'pass',
              knowledgeCorrectionDiscipline: 'pass',
              repeatedMistakeAvoidance: 'pass',
              hostUnderstandingGrowth: 'pass',
              skillInternalizationGrowth: 'pass',
              selfRevisionGrowth: 'pass',
              learningRevisionDiscipline: 'pass',
              domainInternalizationDiscipline: 'pass',
              worldModelValidationDiscipline: 'pass',
              dialogueRhythmStability: 'pass',
              emptyCareRate: 'pass',
              repairMechanicalRate: 'pass',
              warmthTemplateRisk: 'pass',
              relationshipDistanceJumpRate: 'pass',
              afterglowFalseCarryRate: 'pass',
              templateLeakage: 'pass',
            },
          },
          telemetryPatch: {
            retrievalHealth: {
              semanticLatencyMs: null,
              graphLatencyMs: null,
              reconstructionFrequency: 0,
              reconstructedCount: 0,
              templateLeakageFailCount: 0,
              quietCompanionshipCoverage: 0.38,
              silentPresenceNuisanceRate: 0.41,
              continuityMindCarryRate: 0.27,
            } as any,
          },
          telemetryPersisted: true,
          failingTurnSet: [],
          finalReplayGate: {
            version: 'final-replay-gate-v1',
            passed: true,
            failingKeys: [],
            metrics: {
              recallAt3: null,
              precisionAt3: null,
              wrongThreadRate: 0,
              templateLeakageFailCount: 0,
              authorityLeakCount: 0,
              localHumanlikeVisibleFallbackCount: 0,
            },
          },
          shipGate: [],
          regressionTriage: [],
          datasetFeedback: {
            backlogKey: 'replay_benchmark_dataset_backlog_v1',
            appendedCount: 0,
            totalCount: 0,
            persisted: true,
          },
        },
      ],
    })

    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'quietCompanionshipCoverage',
      'silentPresenceNuisanceRate',
      'continuityMindCarryRate',
    ]))
    expect(advice.surfaceAdjustments.inwardCarryBias).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.delayUntilAfterPayoffBias).toBeGreaterThan(0)
    expect(advice.notes).toEqual(expect.arrayContaining([
      'metric:quiet-companionship-coverage',
      'metric:silent-presence-nuisance-rate',
      'metric:continuity-mind-carry-rate',
    ]))
  })

  it('turns failed memory closure long-run causal identity into next-run tuning advice', () => {
    const advice = deriveMemoryTuningAdviceFromReplayBenchmark({
      now: 1_700_000_000_000,
      results: [
        {
          packId: 'sampled-humanlike-memory-v1',
          ranAt: 1_700_000_000_000,
          turnCount: 3,
          quality: [],
          gate: {
            passed: true,
            failingKeys: [],
            dimensions: [],
            standards: buildReplayStandards(),
          },
          standards: buildReplayStandards(),
          telemetryPatch: {
            retrievalHealth: {
              semanticLatencyMs: null,
              graphLatencyMs: null,
              reconstructionFrequency: 0,
              reconstructedCount: 0,
              templateLeakageFailCount: 0,
              runtimeMemoryClosureLongRunClosureRate: 0,
            } as any,
          },
          telemetryPersisted: true,
          failingTurnSet: [],
          finalReplayGate: {
            version: 'final-replay-gate-v1',
            passed: true,
            failingKeys: [],
            metrics: {
              recallAt3: null,
              precisionAt3: null,
              wrongThreadRate: 0,
              templateLeakageFailCount: 0,
              authorityLeakCount: 0,
              localHumanlikeVisibleFallbackCount: 0,
            },
          },
          shipGate: [],
          regressionTriage: [],
          datasetFeedback: {
            backlogKey: 'replay_benchmark_dataset_backlog_v1',
            appendedCount: 0,
            totalCount: 3,
            persisted: true,
            memoryClosureLongRun: {
              status: 'insufficient',
              turnCount: 3,
              requiredTurnCount: 3,
              stableMemoryIdentity: false,
              dominantMemoryIdentityKey: null,
              dominantMemoryIdentityKeys: ['closure-alpha', 'closure-beta'],
              transitionBreaks: ['turn-memory-closure-2->turn-memory-closure-3'],
              failureReasons: [
                'missing-causal-memory-identity',
                'missing-memory-closure-lanes',
                'missing-memory-identity-continuity',
              ],
              turnDiagnostics: [
                {
                  turnId: 'turn-memory-closure-1',
                  memoryIdentityKey: null,
                  memoryIdentityKeys: [],
                  provedLanes: ['recall'],
                  missingLanes: ['emotion', 'initiative', 'execution', 'embodiment', 'embodiment-expression'],
                  continuityDigest: 'route-chain-only-memory-recall',
                },
                {
                  turnId: 'turn-memory-closure-2',
                  memoryIdentityKey: 'closure-alpha',
                  memoryIdentityKeys: ['closure-alpha'],
                  provedLanes: ['recall', 'emotion', 'embodiment', 'embodiment-expression'],
                  missingLanes: ['initiative', 'execution'],
                  continuityDigest: 'emotion-body-carried-without-action-callback',
                },
                {
                  turnId: 'turn-memory-closure-3',
                  memoryIdentityKey: 'closure-beta',
                  memoryIdentityKeys: ['closure-beta'],
                  provedLanes: ['recall', 'initiative', 'execution', 'embodiment', 'embodiment-expression'],
                  missingLanes: ['emotion'],
                  continuityDigest: 'action-callback-carried-after-identity-break',
                },
              ],
            },
          },
        },
      ],
    })

    expect(advice.focusDimensions).toEqual([
      'runtimeMemoryClosureLongRun',
      'runtimeMemoryClosureCausalIdentity',
      'runtimeMemoryClosureLaneCarry',
      'runtimeMemoryClosureIdentityContinuity',
    ])
    expect(advice.notes).toEqual(expect.arrayContaining([
      'failure:memory-closure-causal-identity',
      'failure:memory-closure-lanes:emotion,initiative/execution,embodiment,embodiment-expression',
      'failure:memory-closure-identity-continuity',
    ]))
    expect(advice.retrievalAdjustments.relationshipBoost).toBeGreaterThan(0)
    expect(advice.retrievalAdjustments.temporalWindowBias).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.inwardCarryBias).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.delayUntilAfterPayoffBias).toBeGreaterThan(0)
    expect(advice.personStateAdjustments.repairWindowBias).toBeGreaterThan(0)
    expect(advice.personStateAdjustments.closenessCapBias).toBeGreaterThan(0)
  })

  it('preserves memory closure long-run repair dimensions when persisted advice is parsed', () => {
    const parsed = parseMemoryTuningAdvice(JSON.stringify({
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_000,
      sourceReportAt: 1_700_000_000_000,
      focusDimensions: [
        'runtimeMemoryClosureLongRun',
        'runtimeMemoryClosureCausalIdentity',
        'runtimeMemoryClosureLaneCarry',
        'runtimeMemoryClosureIdentityContinuity',
      ],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.14,
        temporalWindowBias: 0.12,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.14,
        delayUntilAfterPayoffBias: 0.12,
        provenanceLabelBias: 0.03,
        specificityClampBias: 0,
      },
      personStateAdjustments: {
        repairWindowBias: 0.08,
        closenessCapBias: 0.08,
      },
      notes: ['legacy diagnostic prose'],
    }))

    expect(parsed?.focusDimensions).toEqual(expect.arrayContaining([
      'runtimeMemoryClosureLongRun',
      'runtimeMemoryClosureCausalIdentity',
      'runtimeMemoryClosureLaneCarry',
      'runtimeMemoryClosureIdentityContinuity',
    ]))
    expect(parsed?.notes).toEqual([])
  })

  it('drops unrecognized persisted focus dimensions through the generic schema', () => {
    const parsed = parseMemoryTuningAdvice(JSON.stringify({
      version: 'memory-tuning-advice-v1',
      source: 'nightly-replay-benchmark',
      updatedAt: 1_700_000_000_000,
      sourceReportAt: 1_700_000_000_000,
      focusDimensions: [
        'runtimeMemoryClosureLongRun',
        'unknown-obsolete-dimension',
      ],
      retrievalAdjustments: {
        proceduralBoost: 0,
        relationshipBoost: 0.14,
        temporalWindowBias: 0.12,
        wrongThreadPenalty: 0,
      },
      surfaceAdjustments: {
        inwardCarryBias: 0.14,
        delayUntilAfterPayoffBias: 0.12,
        provenanceLabelBias: 0.03,
        specificityClampBias: 0,
      },
      personStateAdjustments: {
        repairWindowBias: 0.08,
        closenessCapBias: 0.08,
      },
      notes: [],
    }))

    expect(parsed?.focusDimensions).toEqual(['runtimeMemoryClosureLongRun'])
  })
})
