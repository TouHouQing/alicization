import type { WorkingMemoryQualityFixture } from './life-core/working-memory-quality-harness'
import type {
  DbBackedLongTermMemoryQualityInput,
  MemoryQualityHarnessReport,
} from './memory-quality-harness'
import type { MemoryUserTrialHarnessInput } from './memory-user-trial-harness'
import type { PersonaTrainingDatasetQualityFixture } from './persona-training-dataset-quality-harness'

import { errorMessageFrom } from '@moeru/std'

import { runMemoryQualityHarnessSuite } from './memory-quality-harness'

export type MemoryProductionTrialStageKind
  = | 'dialogue-replay'
    | 'working-memory-compression'
    | 'long-term-recall'
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
    stageFromQuality({
      stage: 'long-term-recall',
      id: 'long-term-recall',
      itemCount: quality.longTerm.length,
      passed: quality.longTerm.every(result => result.passed),
      error: quality.longTerm.find(result => result.trace.error)?.trace.error ?? null,
    }),
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
  ])
  const lastStageError = [...stages].reverse().find(stage => stage.error)?.error ?? null

  return {
    version: 'memory-production-trial-runner-v1',
    id: input.id,
    cardId: input.cardId,
    createdAt: input.createdAt,
    passed: failingStageIds.length === 0 && quality.passed,
    summary: {
      dialogueReplayCount: input.dialogueReplay ? 1 : 0,
      workingMemoryFixtureCount: quality.summary.workingMemoryFixtureCount,
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
    recommendedNextActions: mergedRecommendedActions,
  }
}

export function serializeMemoryProductionTrialReport(report: MemoryProductionTrialReport) {
  return JSON.stringify(report, null, 2)
}
