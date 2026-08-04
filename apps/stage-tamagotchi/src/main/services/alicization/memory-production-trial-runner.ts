import type { WorkingMemoryQualityFixture } from './life-core/working-memory-quality-harness'
import type {
  LongTermMemoryTemporalConflictFixture,
  LongTermMemoryTemporalConflictReport,
} from './long-term-memory-temporal-conflict-harness'
import type {
  MemoryExperienceQualityFixture,
  MemoryExperienceQualityReport,
} from './memory-experience-quality-harness'
import type {
  DbBackedLongTermMemoryQualityInput,
  MemoryQualityHarnessReport,
} from './memory-quality-harness'
import type { MemoryScopeFuzzReport } from './memory-scope-fuzz-harness'
import type {
  MemorySemanticScaleSoakReport,
} from './memory-semantic-scale-soak-harness'
import type { MemoryUserTrialHarnessInput } from './memory-user-trial-harness'
import type { PersonaTrainingDatasetQualityFixture } from './persona-training-dataset-quality-harness'
import type {
  WorkingMemoryCompressionBehaviorFixture,
  WorkingMemoryCompressionBehaviorReport,
} from './working-memory-compression-behavior-harness'

import { errorMessageFrom } from '@moeru/std'

import { runLongTermMemoryTemporalConflictHarness } from './long-term-memory-temporal-conflict-harness'
import { runMemoryExperienceQualityHarness } from './memory-experience-quality-harness'
import { runMemoryQualityHarnessSuite } from './memory-quality-harness'
import { runMemoryScopeFuzzHarness } from './memory-scope-fuzz-harness'
import { runMemorySemanticScaleSoakHarness } from './memory-semantic-scale-soak-harness'
import { runWorkingMemoryCompressionBehaviorHarness } from './working-memory-compression-behavior-harness'

export type MemoryProductionTrialStageKind
  = | 'dialogue-replay'
    | 'working-memory-compression'
    | 'compressed-context-behavior'
    | 'long-term-recall'
    | 'temporal-conflict'
    | 'semantic-scale-soak'
    | 'experience-quality'
    | 'scope-fuzz'
    | 'persona-dataset-hygiene'

export interface MemoryProductionTrialDialogueReplayResult {
  id: string
  passed: boolean
  turnCount: number
  workingMemory?: WorkingMemoryQualityFixture[]
  userTrials?: MemoryUserTrialHarnessInput[]
  error?: string | null
  recommendedNextActions?: string[]
}

export interface MemoryProductionTrialStageResult {
  stage: MemoryProductionTrialStageKind
  id: string
  passed: boolean
  itemCount: number
  error: string | null
}

export interface MemoryProductionTrialRunnerInput {
  id: string
  cardId: string
  createdAt: number
  dialogueReplay?: () => Promise<MemoryProductionTrialDialogueReplayResult>
  workingMemory?: WorkingMemoryQualityFixture[]
  longTerm?: DbBackedLongTermMemoryQualityInput[]
  userTrials?: MemoryUserTrialHarnessInput[]
  compressedContextBehavior?: WorkingMemoryCompressionBehaviorFixture[]
  temporalConflict?: LongTermMemoryTemporalConflictFixture[]
  semanticScaleSoak?: Parameters<typeof runMemorySemanticScaleSoakHarness>[0]
  experienceQuality?: MemoryExperienceQualityFixture[]
  scopeFuzz?: Parameters<typeof runMemoryScopeFuzzHarness>[0]
  personaTraining?: PersonaTrainingDatasetQualityFixture[]
}

export interface MemoryProductionTrialReport {
  version: 'memory-production-trial-runner-v1'
  id: string
  cardId: string
  createdAt: number
  passed: boolean
  summary: {
    dialogueReplayCount: number
    workingMemoryFixtureCount: number
    compressedContextBehaviorFixtureCount: number
    temporalConflictFixtureCount: number
    semanticScaleSoakRunCount: number
    experienceQualityFixtureCount: number
    scopeFuzzCaseCount: number
    longTermFixtureCount: number
    userTrialCount: number
    personaTrainingFixtureCount: number
    failingStageIds: string[]
    optimizationFindingCount: number
    recommendedActionCount: number
    lastError: string | null
  }
  stages: MemoryProductionTrialStageResult[]
  quality: MemoryQualityHarnessReport
  compressedContextBehavior: WorkingMemoryCompressionBehaviorReport | null
  temporalConflict: LongTermMemoryTemporalConflictReport | null
  semanticScaleSoak: MemorySemanticScaleSoakReport | null
  experienceQuality: MemoryExperienceQualityReport | null
  scopeFuzz: MemoryScopeFuzzReport | null
  recommendedNextActions: string[]
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function failedReplayStage(error: string): MemoryProductionTrialStageResult {
  return {
    stage: 'dialogue-replay',
    id: 'dialogue-replay',
    passed: false,
    itemCount: 0,
    error,
  }
}

function stageFromQuality(input: {
  stage: Exclude<MemoryProductionTrialStageKind, 'dialogue-replay'>
  id: string
  itemCount: number
  passed: boolean
  error: string | null
}): MemoryProductionTrialStageResult {
  return {
    stage: input.stage,
    id: input.id,
    passed: input.passed,
    itemCount: input.itemCount,
    error: input.error,
  }
}

export async function runMemoryProductionTrialRunner(
  input: MemoryProductionTrialRunnerInput,
): Promise<MemoryProductionTrialReport> {
  const stages: MemoryProductionTrialStageResult[] = []
  const workingMemory: WorkingMemoryQualityFixture[] = [...(input.workingMemory ?? [])]
  const userTrials: MemoryUserTrialHarnessInput[] = [...(input.userTrials ?? [])]
  const recommendedNextActions: string[] = []
  const compressedContextBehavior = input.compressedContextBehavior?.length
    ? runWorkingMemoryCompressionBehaviorHarness({
        fixtures: input.compressedContextBehavior,
        now: input.createdAt,
      })
    : null
  const temporalConflict = input.temporalConflict?.length
    ? runLongTermMemoryTemporalConflictHarness({
        fixtures: input.temporalConflict,
        now: input.createdAt,
      })
    : null
  const semanticScaleSoak = input.semanticScaleSoak
    ? runMemorySemanticScaleSoakHarness(input.semanticScaleSoak)
    : null
  const experienceQuality = input.experienceQuality?.length
    ? runMemoryExperienceQualityHarness({
        id: `${input.id}:experience-quality`,
        cardId: input.cardId,
        createdAt: input.createdAt,
        fixtures: input.experienceQuality,
      })
    : null
  const scopeFuzz = input.scopeFuzz
    ? await runMemoryScopeFuzzHarness(input.scopeFuzz)
    : null

  if (input.dialogueReplay) {
    try {
      const replay = await input.dialogueReplay()
      workingMemory.push(...(replay.workingMemory ?? []))
      userTrials.push(...(replay.userTrials ?? []))
      recommendedNextActions.push(...(replay.recommendedNextActions ?? []))
      stages.push({
        stage: 'dialogue-replay',
        id: replay.id,
        passed: replay.passed,
        itemCount: replay.turnCount,
        error: replay.error ?? null,
      })
    }
    catch (error) {
      stages.push(failedReplayStage(errorMessageFrom(error) ?? String(error)))
      recommendedNextActions.push('修复 dialogue replay/provider 失败后再相信本次生产试用结果。')
    }
  }

  const quality = await runMemoryQualityHarnessSuite({
    createdAt: input.createdAt,
    longTerm: input.longTerm ?? [],
    workingMemory,
    userTrials,
    personaTraining: input.personaTraining ?? [],
  })

  stages.push(
    stageFromQuality({
      stage: 'working-memory-compression',
      id: 'working-memory-compression',
      itemCount: quality.workingMemory.length,
      passed: quality.workingMemory.every(result => result.passed),
      error: quality.workingMemory.find(result => result.trace.error)?.trace.error ?? null,
    }),
    ...(compressedContextBehavior
      ? [
          stageFromQuality({
            stage: 'compressed-context-behavior',
            id: 'compressed-context-behavior',
            itemCount: compressedContextBehavior.summary.fixtureCount,
            passed: compressedContextBehavior.passed,
            error: compressedContextBehavior.summary.lastError,
          }),
        ]
      : []),
    stageFromQuality({
      stage: 'long-term-recall',
      id: 'long-term-recall',
      itemCount: quality.longTerm.length,
      passed: quality.longTerm.every(result => result.passed),
      error: quality.longTerm.find(result => result.trace.error)?.trace.error ?? null,
    }),
    ...(temporalConflict
      ? [
          stageFromQuality({
            stage: 'temporal-conflict',
            id: 'temporal-conflict',
            itemCount: temporalConflict.summary.fixtureCount,
            passed: temporalConflict.passed,
            error: temporalConflict.traces.find(trace => trace.error)?.error ?? null,
          }),
        ]
      : []),
    ...(semanticScaleSoak
      ? [
          stageFromQuality({
            stage: 'semantic-scale-soak',
            id: 'semantic-scale-soak',
            itemCount: semanticScaleSoak.summary.queryCount,
            passed: semanticScaleSoak.passed,
            error: semanticScaleSoak.summary.failingChecks[0] ?? null,
          }),
        ]
      : []),
    ...(experienceQuality
      ? [
          stageFromQuality({
            stage: 'experience-quality',
            id: 'experience-quality',
            itemCount: experienceQuality.summary.fixtureCount,
            passed: experienceQuality.passed,
            error: experienceQuality.findings.find(item => item.severity === 'critical')?.message ?? null,
          }),
        ]
      : []),
    ...(scopeFuzz
      ? [
          stageFromQuality({
            stage: 'scope-fuzz',
            id: 'scope-fuzz',
            itemCount: scopeFuzz.caseCount,
            passed: scopeFuzz.passed,
            error: scopeFuzz.violations[0]?.error ?? scopeFuzz.violations[0]?.reasons.join(', ') ?? null,
          }),
        ]
      : []),
    stageFromQuality({
      stage: 'persona-dataset-hygiene',
      id: 'persona-dataset-hygiene',
      itemCount: quality.personaTraining.length,
      passed: quality.personaTraining.every(result => result.passed),
      error: quality.personaTraining.find(result => result.trace.error)?.trace.error ?? null,
    }),
  )

  const failingStageIds = stages
    .filter(stage => !stage.passed)
    .map(stage => stage.id)
  const mergedRecommendedActions = uniqueStrings([
    ...recommendedNextActions,
    ...quality.recommendedNextActions,
    ...(compressedContextBehavior?.recommendedNextActions ?? []),
    ...(temporalConflict?.recommendedNextActions ?? []),
    ...(semanticScaleSoak?.recommendedNextActions ?? []),
    ...(experienceQuality?.recommendedNextActions ?? []),
    ...(scopeFuzz?.recommendedActions ?? []),
  ])
  const lastStageError = [...stages].reverse().find(stage => stage.error)?.error ?? null

  return {
    version: 'memory-production-trial-runner-v1',
    id: input.id,
    cardId: input.cardId,
    createdAt: input.createdAt,
    passed: failingStageIds.length === 0
      && quality.passed
      && (compressedContextBehavior?.passed ?? true)
      && (temporalConflict?.passed ?? true)
      && (semanticScaleSoak?.passed ?? true)
      && (experienceQuality?.passed ?? true)
      && (scopeFuzz?.passed ?? true),
    summary: {
      dialogueReplayCount: input.dialogueReplay ? 1 : 0,
      workingMemoryFixtureCount: quality.summary.workingMemoryFixtureCount,
      compressedContextBehaviorFixtureCount: compressedContextBehavior?.summary.fixtureCount ?? 0,
      temporalConflictFixtureCount: temporalConflict?.summary.fixtureCount ?? 0,
      semanticScaleSoakRunCount: semanticScaleSoak ? 1 : 0,
      experienceQualityFixtureCount: experienceQuality?.summary.fixtureCount ?? 0,
      scopeFuzzCaseCount: scopeFuzz?.caseCount ?? 0,
      longTermFixtureCount: quality.summary.longTermFixtureCount,
      userTrialCount: quality.summary.userTrialCount,
      personaTrainingFixtureCount: quality.summary.personaTrainingFixtureCount,
      failingStageIds,
      optimizationFindingCount: quality.summary.optimizationFindingCount,
      recommendedActionCount: mergedRecommendedActions.length,
      lastError: quality.summary.lastError ?? lastStageError,
    },
    stages,
    quality,
    compressedContextBehavior,
    temporalConflict,
    semanticScaleSoak,
    experienceQuality,
    scopeFuzz,
    recommendedNextActions: mergedRecommendedActions,
  }
}

export function serializeMemoryProductionTrialReport(report: MemoryProductionTrialReport) {
  return JSON.stringify(report, null, 2)
}
