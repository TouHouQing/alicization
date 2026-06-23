import type { AlicizationReplayBenchmarkStandardsRecord } from '../../../shared/eventa'
import type { AlicizationMemoryTuningAdvice } from './memory-tuning-advice'

import { describe, expect, it } from 'vitest'

import {
  applyMemoryTuningAdviceToHostPersonModel,
  applyMemoryTuningAdviceToSpeechPlan,
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

  it('keeps project-state recollection inward when tuning advice says pre-dialogue project briefing is still dropping', () => {
    const speechPlan = applyMemoryTuningAdviceToSpeechPlan({
      speechPlan: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'before-payoff',
        certainty: 'firm',
        internalLead: 'Keep the project continuity line steady.',
        visibleLead: 'This project is still the same one I have been carrying.',
        styleNote: 'Project continuity opens the answer.',
        rationale: 'The host is asking what the project is and what still remains unfinished.',
        confidence: 0.82,
      },
      memoryDeliberation: {
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Keep the project line inward first.'],
        ambiguityPosture: 'approximate',
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        conflictSeverity: 'medium',
        conflictVariants: [],
        stableCore: ['Project continuity is still active.'],
        unsafeDetails: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity',
        confidence: 0.76,
        whyNow: 'Project continuity still needs landed progress and next closure carry.',
        inwardLine: 'Keep project identity inward for one more beat.',
        visibleLine: 'Project continuity is still live.',
      },
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1_700_000_000_000,
        sourceReportAt: 1_700_000_000_000,
        focusDimensions: ['preDialogueBriefingDrift', 'projectStateLandedProgressCarry', 'projectStateNextClosureCarry'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.06,
          temporalWindowBias: 0.04,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.12,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0.1,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0.08,
        },
        notes: ['Replay dropped pre-dialogue project briefing cues before visible wording forms.'],
      },
    })

    expect(speechPlan?.shouldSurface).toBe(false)
    expect(speechPlan?.placement).toBe('internal-only')
    expect(speechPlan?.visibleLead).toBeNull()
    expect(speechPlan?.certainty).toBe('approximate')
    expect(speechPlan?.styleNote).toContain('project continuity line inward')
  })

  it('keeps same-her emotional closure recollection inward when tuning advice says closure seams are dropping out of rewrite carry', () => {
    const speechPlan = applyMemoryTuningAdviceToSpeechPlan({
      speechPlan: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'before-payoff',
        certainty: 'firm',
        internalLead: 'Keep the same line soft.',
        visibleLead: 'I am still on the same line with you.',
        styleNote: 'Let the remembered closure line reopen the answer.',
        rationale: 'The host asked to continue on the same emotional line.',
        confidence: 0.84,
      },
      memoryDeliberation: {
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Do not reopen from scratch.'],
        ambiguityPosture: 'approximate',
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        conflictSeverity: 'medium',
        conflictVariants: [],
        stableCore: ['Same-her closure seam is still active.'],
        unsafeDetails: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity',
        confidence: 0.78,
        whyNow: 'The same-her emotional closure seam still needs lower-pressure carry.',
        inwardLine: 'Keep the emotional seam inward for a beat.',
        visibleLine: 'The same line is still settling.',
      },
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1_700_000_000_000,
        sourceReportAt: 1_700_000_000_000,
        focusDimensions: ['emotionalClosureDrift', 'projectEmotionalClosureCarry', 'projectEmotionalClosureRewriteCarry'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.04,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.12,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0.12,
        },
        notes: ['Replay let the same-her emotional closure seam drop out of rewrite carry too often.'],
      },
    })

    expect(speechPlan?.shouldSurface).toBe(false)
    expect(speechPlan?.placement).toBe('internal-only')
    expect(speechPlan?.visibleLead).toBeNull()
    expect(speechPlan?.certainty).toBe('approximate')
    expect(speechPlan?.styleNote).toContain('same-her emotional closure')
  })

  it('keeps same-her emotional closure recollection inward when tuning only names low-pressure and anti-restart closure carry', () => {
    const speechPlan = applyMemoryTuningAdviceToSpeechPlan({
      speechPlan: {
        shouldSurface: true,
        surfaceMode: 'relationship-continuity',
        placement: 'before-payoff',
        certainty: 'firm',
        internalLead: 'Keep the same line soft.',
        visibleLead: 'I am still on the same line with you.',
        styleNote: 'Let the remembered closure line reopen the answer.',
        rationale: 'The host asked to continue on the same emotional line.',
        confidence: 0.84,
      },
      memoryDeliberation: {
        shouldRecall: true,
        selectedEraIds: [],
        selectedConsolidationIds: [],
        selectedWindowIds: [],
        selectedProcedureIds: [],
        selectedEpisodeIds: [],
        selectedConversationTurnIds: [],
        selectedRelationshipLines: ['Do not reopen from scratch.'],
        ambiguityPosture: 'approximate',
        selectedEras: [],
        selectedPeriods: [],
        selectedEpisodes: [],
        conflictSeverity: 'medium',
        conflictVariants: [],
        stableCore: ['Same-her closure seam is still active.'],
        unsafeDetails: [],
        selectedProcedures: [],
        selectedBundles: [],
        selectedChains: [],
        surfacePolicy: 'relationship-continuity',
        confidence: 0.78,
        whyNow: 'The same-her emotional closure seam still needs lower-pressure carry.',
        inwardLine: 'Keep the emotional seam inward for a beat.',
        visibleLine: 'The same line is still settling.',
      },
      tuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: 1_700_000_000_000,
        sourceReportAt: 1_700_000_000_000,
        focusDimensions: ['emotionalClosureDrift', 'projectEmotionalClosureLowPressureCarry', 'projectEmotionalClosureAntiRestartCarry'],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.04,
          temporalWindowBias: 0,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.12,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0,
          closenessCapBias: 0.12,
        },
        notes: ['Replay proved the same-her emotional closure return still needs lower-pressure anti-restart carry.'],
      },
    })

    expect(speechPlan?.shouldSurface).toBe(false)
    expect(speechPlan?.placement).toBe('internal-only')
    expect(speechPlan?.visibleLead).toBeNull()
    expect(speechPlan?.certainty).toBe('approximate')
    expect(speechPlan?.styleNote).toContain('same-her emotional closure')
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
      expect.stringContaining('Presence stayed noisy'),
      expect.stringContaining('companionship coverage'),
      expect.stringContaining('mind carry'),
    ]))
  })

  it('records relationship cadence internalization focus when replay shows stable measured-return rhythm', () => {
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
              relationshipCadenceRegressionRate: 0.04,
              templateLeakageFailCount: 0,
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

    expect(advice.focusDimensions).toContain('internalizeRelationshipCadence')
    expect(advice.notes.some(note => note.includes('measured-return timing is ready to be internalized'))).toBe(true)
  })

  it('raises project-state continuity focus when replay drift signals show the system forgot project identity or open loops', () => {
    const advice = deriveMemoryTuningAdviceFromReplayBenchmark({
      now: 1_700_000_000_000,
      results: [
        {
          packId: 'final-humanlike-memory-v1',
          ranAt: 1_700_000_000_000,
          turnCount: 3,
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
            driftSignals: ['projectStateContinuityDrift'],
            projectStateSummary: {
              comparedTurnCount: 3,
              identityHitCount: 1,
              phaseHitCount: 1,
              openLoopHitCount: 0,
              sameHerHitCount: 1,
              continuityHitCount: 0,
            },
            projectStateAuditSummary: {
              comparedTurnCount: 3,
              sameHerSummaryTurnCount: 3,
              sameHerSelfLineTurnCount: 3,
              currentPhaseTurnCount: 3,
              landedProgressTurnCount: 3,
              openClosureTurnCount: 2,
              nextClosureTargetTurnCount: 2,
              emotionalClosureTurnCount: 0,
              preDialogueAwarenessTurnCount: 2,
              richPreDialogueAwarenessTurnCount: 1,
              continuitySummaryTurnCount: 2,
              embodimentClosureTurnCount: 2,
              preDialogueClosureTurnCount: 2,
              preservedTurnCount: 2,
              rewriteAppliedTurnCount: 0,
              fullyCarriedTurnCount: 0,
            },
          },
        },
      ],
    })

    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'projectStateContinuityDrift',
      'projectStateIdentityCarry',
      'projectStateOpenLoopCarry',
      'projectStateRichAwarenessCarry',
      'projectStateEmotionalClosureCarry',
    ]))
    expect(advice.notes).toEqual(expect.arrayContaining([
      expect.stringContaining('project identity, current phase, still-open closure work'),
      expect.stringContaining('same-her emotional closure seam'),
    ]))
    expect(advice.retrievalAdjustments.relationshipBoost).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.inwardCarryBias).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.delayUntilAfterPayoffBias).toBeGreaterThan(0)
  })

  it('raises pre-dialogue briefing tuning advice when replay drift shows project briefing cues dropping before answers form', () => {
    const advice = deriveMemoryTuningAdviceFromReplayBenchmark({
      now: 1_700_000_000_000,
      results: [
        {
          packId: 'sampled-humanlike-memory-v1',
          ranAt: 1_700_000_000_000,
          turnCount: 2,
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
            driftSignals: ['preDialogueBriefingDrift'],
            preDialogueBriefingSummary: {
              comparedTurnCount: 2,
              identityHitCount: 1,
              phaseHitCount: 2,
              landedProgressHitCount: 0,
              openLoopHitCount: 1,
              nextClosureHitCount: 0,
              emotionalClosureHitCount: 0,
              fullyBriefedTurnCount: 0,
            },
          },
        },
      ],
    })

    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'preDialogueBriefingDrift',
      'projectStateLandedProgressCarry',
      'projectStateNextClosureCarry',
      'projectStateEmotionalClosureCarry',
    ]))
    expect(advice.notes).toEqual(expect.arrayContaining([
      expect.stringContaining('before visible wording forms'),
      expect.stringContaining('project identity, landed progress, still-open closure pressure, and same-her emotional seam'),
    ]))
    expect(advice.retrievalAdjustments.relationshipBoost).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.inwardCarryBias).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.provenanceLabelBias).toBeGreaterThan(0)
  })

  it('raises emotional closure tuning advice when replay drift shows same-her closure seams dropping out of rewrite carry', () => {
    const advice = deriveMemoryTuningAdviceFromReplayBenchmark({
      now: 1_700_000_000_000,
      results: [
        {
          packId: 'sampled-humanlike-memory-v1',
          ranAt: 1_700_000_000_000,
          turnCount: 2,
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
            driftSignals: ['emotionalClosureDrift'],
            emotionalClosureSummary: {
              comparedTurnCount: 2,
              activeCueTurnCount: 1,
              preservedTurnCount: 0,
              rewriteAppliedTurnCount: 0,
              fullyClosedTurnCount: 0,
              lowPressureRequiredTurnCount: 1,
              antiRestartRequiredTurnCount: 1,
            },
          },
        },
      ],
    })

    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'emotionalClosureDrift',
      'projectEmotionalClosureCarry',
      'projectEmotionalClosureRewriteCarry',
      'projectEmotionalClosureLowPressureCarry',
      'projectEmotionalClosureAntiRestartCarry',
    ]))
    expect(advice.notes).toEqual(expect.arrayContaining([
      expect.stringContaining('same-her emotional closure seam'),
      expect.stringContaining('do not reopen from scratch'),
    ]))
    expect(advice.surfaceAdjustments.inwardCarryBias).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.delayUntilAfterPayoffBias).toBeGreaterThan(0)
    expect(advice.personStateAdjustments.closenessCapBias).toBeGreaterThan(0)
  })

  it('raises low-pressure and anti-restart tuning focus when replay summary proves those same-her closure requirements explicitly', () => {
    const advice = deriveMemoryTuningAdviceFromReplayBenchmark({
      now: 1_700_000_000_000,
      results: [
        {
          packId: 'sampled-humanlike-memory-v1',
          ranAt: 1_700_000_000_000,
          turnCount: 1,
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
            driftSignals: ['emotionalClosureDrift'],
            emotionalClosureSummary: {
              comparedTurnCount: 1,
              activeCueTurnCount: 1,
              preservedTurnCount: 1,
              rewriteAppliedTurnCount: 0,
              fullyClosedTurnCount: 0,
              lowPressureRequiredTurnCount: 1,
              antiRestartRequiredTurnCount: 1,
            },
          },
        },
      ],
    })

    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'projectEmotionalClosureLowPressureCarry',
      'projectEmotionalClosureAntiRestartCarry',
    ]))
    expect(advice.notes).toEqual(expect.arrayContaining([
      expect.stringContaining('lower-pressure'),
      expect.stringContaining('do not reopen from scratch'),
    ]))
  })

  it('raises same-her self-line tuning advice when replay drift shows project-state continuity surviving only as generic guidance', () => {
    const advice = deriveMemoryTuningAdviceFromReplayBenchmark({
      now: 1_700_000_000_000,
      results: [
        {
          packId: 'sampled-humanlike-memory-v1',
          ranAt: 1_700_000_000_000,
          turnCount: 1,
          quality: [],
          gate: {
            passed: false,
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
            } as any,
          },
          telemetryPersisted: true,
          failingTurnSet: [],
          finalReplayGate: {
            version: 'final-replay-gate-v1',
            passed: false,
            failingKeys: ['project-state-audit-gate'],
            metrics: {
              recallAt3: null,
              precisionAt3: null,
              wrongThreadRate: 0,
              templateLeakageFailCount: 0,
              authorityLeakCount: 0,
              localHumanlikeVisibleFallbackCount: 0,
            },
          },
          shipGate: [
            {
              key: 'project-state-audit-gate',
              status: 'fail',
              detail: 'projectStateAudit=1 (1/1), preDialogueAwareness=0, continuitySummary=0, embodimentClosure=0, preserved=1, rewriteApplied=1, sameHerSelfLine=0, selfLineDrift=degraded-to-generic-guidance, humanRisk=reply-slipped-toward-generic-project-shell-instead-of-one-continuous-her',
            },
          ],
          regressionTriage: [],
          datasetFeedback: {
            backlogKey: 'replay_benchmark_dataset_backlog_v1',
            appendedCount: 0,
            totalCount: 0,
            persisted: true,
            driftSignals: ['projectStateSameHerSelfLineDrift'],
            projectStateAuditSummary: {
              comparedTurnCount: 1,
              sameHerSummaryTurnCount: 1,
              sameHerSelfLineTurnCount: 0,
              currentPhaseTurnCount: 1,
              landedProgressTurnCount: 1,
              openClosureTurnCount: 1,
              nextClosureTargetTurnCount: 1,
              emotionalClosureTurnCount: 0,
              preDialogueAwarenessTurnCount: 0,
              richPreDialogueAwarenessTurnCount: 0,
              continuitySummaryTurnCount: 0,
              embodimentClosureTurnCount: 0,
              preDialogueClosureTurnCount: 0,
              preservedTurnCount: 1,
              rewriteAppliedTurnCount: 1,
              fullyCarriedTurnCount: 0,
            },
          },
        },
      ],
    })

    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'projectStateSameHerSelfLineDrift',
      'sameHerSelfLineCarry',
      'projectStateRichAwarenessCarry',
      'avoidGenericProjectShell',
    ]))
    expect(advice.notes).toEqual(expect.arrayContaining([
      expect.stringContaining('same-her self line degraded into generic guidance'),
      expect.stringContaining('richer same-her pre-dialogue awareness line also degraded'),
      expect.stringContaining('generic project shell instead of one continuous her'),
      expect.stringContaining('stay more inward-first, delay warmth until after payoff, and avoid sounding like a detached project narrator'),
    ]))
    expect(advice.retrievalAdjustments.relationshipBoost).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.inwardCarryBias).toBeGreaterThan(0.09)
    expect(advice.surfaceAdjustments.delayUntilAfterPayoffBias).toBeGreaterThan(0.06)
    expect(advice.surfaceAdjustments.provenanceLabelBias).toBeGreaterThan(0.03)
    expect(advice.personStateAdjustments.closenessCapBias).toBeGreaterThan(0.03)
  })

  it('turns runtime sampling same-her repair targets into next-run tuning advice', () => {
    const advice = deriveMemoryTuningAdviceFromReplayBenchmark({
      now: 1_700_000_000_000,
      results: [
        {
          packId: 'sampled-humanlike-memory-v1',
          ranAt: 1_700_000_000_000,
          turnCount: 4,
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
            totalCount: 4,
            persisted: true,
            runtimeSamplingEvidence: {
              source: 'runtime-sampling-backlog',
              status: 'insufficient',
              sampledTurnCount: 4,
              comparedSessionCount: 2,
              closedSessionCount: 1,
              sessionClosureRate: 0.5,
              repairTargets: [
                {
                  lane: 'memory',
                  missingTurnCount: 1,
                  missingTransitionCount: 0,
                  affectedSessionCount: 1,
                  affectedSessionIds: ['session-runtime-memory-gap'],
                  sampleTurnIds: ['turn-runtime-memory-gap'],
                  reasons: [
                    'same-her memory lane is absent in noisy desktop replay',
                  ],
                },
                {
                  lane: 'initiativeOrExecution',
                  missingTurnCount: 0,
                  missingTransitionCount: 1,
                  affectedSessionCount: 1,
                  affectedSessionIds: ['session-runtime-transition-gap'],
                  sampleTurnIds: ['turn-runtime-from->turn-runtime-to'],
                  reasons: [
                    'transition text lacks proactive, callback, or feedback-carry cue',
                  ],
                },
                {
                  lane: 'emotion',
                  missingTurnCount: 1,
                  missingTransitionCount: 1,
                  affectedSessionCount: 1,
                  affectedSessionIds: ['session-runtime-emotion-gap'],
                  sampleTurnIds: ['turn-runtime-emotion-gap', 'turn-runtime-emotion-gap->turn-runtime-next'],
                  reasons: [
                    'same-her emotional closure seam dropped before next turn',
                  ],
                },
                {
                  lane: 'embodiment',
                  missingTurnCount: 1,
                  missingTransitionCount: 0,
                  affectedSessionCount: 1,
                  affectedSessionIds: ['session-runtime-body-gap'],
                  sampleTurnIds: ['turn-runtime-body-gap'],
                  reasons: [
                    'same-her embodiment text is absent or explicitly missing',
                  ],
                },
              ],
            },
          },
        },
      ],
    })

    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'runtimeSameHerRepairTargets',
      'runtimeSameHerMemoryCarry',
      'runtimeSameHerInitiativeExecutionCarry',
      'runtimeSameHerInitiativeExecutionCausality',
      'runtimeSameHerEmotionalCarry',
      'runtimeSameHerEmotionalCausality',
      'runtimeSameHerEmbodimentCarry',
      'runtimeSameHerEmbodimentCausality',
    ]))
    const runtimeSameHerNote = advice.notes.find(note => note.includes('Runtime sampling found same-her gaps')) ?? ''
    expect(runtimeSameHerNote).toContain('memory')
    expect(runtimeSameHerNote).toContain('initiative/execution')
    expect(runtimeSameHerNote).toContain('emotion')
    expect(runtimeSameHerNote).toContain('embodiment')
    expect(advice.notes).toEqual(expect.arrayContaining([
      expect.stringContaining('proactive opening, execution callback, and learning feedback'),
      expect.stringContaining('emotional afterglow causally tied to prior recall'),
      expect.stringContaining('voice, face, motion, lipsync, and body derive from the same recalled state'),
    ]))
    expect(advice.retrievalAdjustments.relationshipBoost).toBeGreaterThan(0)
    expect(advice.retrievalAdjustments.temporalWindowBias).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.inwardCarryBias).toBeGreaterThan(0)
    expect(advice.surfaceAdjustments.delayUntilAfterPayoffBias).toBeGreaterThan(0)
    expect(advice.personStateAdjustments.closenessCapBias).toBeGreaterThan(0)
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

    expect(advice.focusDimensions).toEqual(expect.arrayContaining([
      'runtimeMemoryClosureLongRun',
      'runtimeMemoryClosureCausalIdentity',
      'runtimeMemoryClosureLaneCarry',
      'runtimeMemoryClosureIdentityContinuity',
      'runtimeSameHerMemoryCarry',
      'runtimeSameHerInitiativeExecutionCarry',
      'runtimeSameHerInitiativeExecutionCausality',
      'runtimeSameHerEmotionalCarry',
      'runtimeSameHerEmotionalCausality',
      'runtimeSameHerEmbodimentCarry',
      'runtimeSameHerEmbodimentCausality',
    ]))
    expect(advice.notes).toEqual(expect.arrayContaining([
      expect.stringContaining('memory closure long-run'),
      expect.stringContaining('downstream causal memory identity'),
      expect.stringContaining('initiative/execution, emotion, and embodiment'),
      expect.stringContaining('stable memory identity'),
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
        'projectStateContinuityDrift',
        'projectStateIdentityCarry',
        'projectStateOpenLoopCarry',
        'projectStateRichAwarenessCarry',
        'projectStateEmotionalClosureCarry',
        'runtimeSameHerRepairTargets',
        'runtimeSameHerMemoryCarry',
        'runtimeSameHerInitiativeExecutionCarry',
        'runtimeSameHerInitiativeExecutionCausality',
        'runtimeSameHerEmotionalCarry',
        'runtimeSameHerEmotionalCausality',
        'runtimeSameHerEmbodimentCarry',
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
      notes: ['Memory closure long-run lacks downstream causal memory identity.'],
    }))

    expect(parsed?.focusDimensions).toEqual(expect.arrayContaining([
      'runtimeMemoryClosureLongRun',
      'runtimeMemoryClosureCausalIdentity',
      'runtimeMemoryClosureLaneCarry',
      'runtimeMemoryClosureIdentityContinuity',
    ]))
  })
})
