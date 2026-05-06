import { describe, expect, it } from 'vitest'

import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'
import {
  applyMemoryTuningAdviceToHostPersonModel,
  applyMemoryTuningAdviceToSpeechPlan,
  deriveMemoryTuningAdviceFromReplayBenchmark,
} from './memory-tuning-advice'

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
      expect.stringContaining('Stale self-model vetoes stayed elevated'),
      expect.stringContaining('Relationship-era confusion vetoes stayed elevated'),
    ]))
    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'learningRevisionDiscipline',
      'domainInternalizationDiscipline',
    ]))
    expect(advice.surfaceAdjustments.specificityClampBias).toBeGreaterThan(0.1)
  })

  it('applies tuning advice to host person model and recollection speech plan', () => {
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
      notes: ['Repair adaptation failed, so repair-window distance should be favored before warmth comes back.'],
    }

    const hostPersonModel = applyMemoryTuningAdviceToHostPersonModel({
      hostPersonModel: {
        summary: 'Closer warmth is welcome when the opening is clearly there.',
        routines: [],
        sensitivities: [],
        repairTriggers: [],
        trustLadder: {
          stage: 'warming',
          score: 0.72,
          rationale: 'The bond is warming.',
        },
        preferredClosenessByContext: [],
        recurrentBurdens: [],
        narrative: [],
        updatedAt: 1_700_000_000_000,
      },
      tuningAdvice: advice,
    })

    expect(hostPersonModel?.repairTriggers.some(item => item.includes('repair visibly ahead of closeness'))).toBe(true)
    expect(hostPersonModel?.preferredClosenessByContext.some(item => item.context === 'repair-window')).toBe(true)

    const speechPlan = applyMemoryTuningAdviceToSpeechPlan({
      speechPlan: {
        shouldSurface: true,
        surfaceMode: 'answer-anchoring',
        placement: 'before-payoff',
        certainty: 'firm',
        internalLead: 'The remembered line comes back first.',
        visibleLead: 'This feels like the same line again.',
        styleNote: 'Let the memory briefly open the answer.',
        rationale: 'The host is asking for remembered handling.',
        confidence: 0.86,
      },
      memoryDeliberation: {
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: [],
        ambiguityPosture: 'ambiguous',
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        conflictSeverity: 'high',
        conflictVariants: [],
        stableCore: ['Keep the stable core only.'],
        unsafeDetails: ['Do not surface the competing line as settled fact.'],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'answer-anchoring',
        confidence: 0.72,
        whyNow: 'The stable core still helps, but the remembered detail is conflict-prone.',
        inwardLine: 'Keep the line inward until the payoff lands.',
        visibleLine: 'This feels like the same line, but I should not over-claim it.',
      },
      tuningAdvice: advice,
    })

    expect(speechPlan?.shouldSurface).toBe(false)
    expect(speechPlan?.placement).toBe('internal-only')
    expect(speechPlan?.certainty).toBe('approximate')
  })
})
