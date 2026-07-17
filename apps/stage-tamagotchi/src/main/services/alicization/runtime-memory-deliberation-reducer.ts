import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { buildDerivedMindStateBundle } from '@proj-alicization/stage-shared'

export function applyMemoryDeliberationToGovernance(input: {
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
}) {
  return input.governance
}

export function deriveMemoryDeliberationSurfaceMode(input: {
  shouldStayInward: boolean
  surfacePolicy: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['surfacePolicy']
  answerSubject: AlicizationMindTurnGovernance['answerSubject']
}) {
  if (input.shouldStayInward)
    return 'held-memory' as const
  if (input.surfacePolicy === 'procedural-carry')
    return 'task-thread' as const
  if (input.surfacePolicy === 'relationship-continuity')
    return input.answerSubject === 'relationship' ? 'dialogue-bond' as const : 'self-continuity' as const
  return 'held-memory' as const
}

export function deriveMemoryDeliberationMemoryMode(input: {
  existingMode: 'suppress-associative' | 'task-thread' | 'scene-anchored' | 'dialogue-carry' | 'emotional-resonance' | null
  shouldStayInward: boolean
  surfacePolicy: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['surfacePolicy']
}) {
  if (input.existingMode)
    return input.existingMode
  if (input.surfacePolicy === 'procedural-carry')
    return 'task-thread' as const
  if (input.surfacePolicy === 'relationship-continuity')
    return 'dialogue-carry' as const
  return input.shouldStayInward ? 'emotional-resonance' as const : 'dialogue-carry' as const
}

export function applyMemoryDeliberationToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  now: number
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = input.surface ?? null
  const deliberation = input.context.memoryDeliberation ?? null
  if (!surface || !deliberation)
    return surface

  const hostPersonModel = input.context.hostPersonModel
    ?? surface.memory.hostPersonModel
    ?? null
  const personStateProjection = input.context.personStateProjection
    ?? surface.memory.personStateProjection
    ?? null
  const personalityContinuityState = personStateProjection?.personalityContinuityState
    ?? surface.memory.personalityContinuityState
    ?? null
  const knowledgeEvidence = input.context.knowledgeEvidence
    ?? surface.memory.knowledgeEvidence
    ?? null
  const selfEvolution = input.context.selfEvolution
    ?? surface.memory.selfEvolution
    ?? null
  const affectiveResidue = input.context.affectiveResidue
    ?? surface.memory.affectiveResidue
    ?? surface.memory.derivedMindStateBundle?.affectiveResidue
    ?? null
  const learningExecutionState = input.context.learningExecutionState
    ?? surface.memory.learningExecutionState
    ?? null
  const recollectionPlan = input.context.recollectionPlan
    ?? surface.memory.recollectionPlan
    ?? null
  const recollectionSpeechPlan = input.context.recollectionSpeechPlan
    ?? surface.memory.recollectionSpeechPlan
    ?? null

  return {
    ...surface,
    memory: {
      ...surface.memory,
      hostPersonModel,
      personalityContinuityState,
      personStateProjection,
      recollectionPlan,
      recollectionSpeechPlan,
      memoryDeliberation: deliberation,
      knowledgeEvidence,
      selfEvolution,
      learningExecutionState,
      memoryStageReplay: input.context.memoryStageReplay
        ?? surface.memory.memoryStageReplay
        ?? null,
      memoryResolutionLedger: input.context.memoryResolutionLedger
        ?? surface.memory.memoryResolutionLedger
        ?? null,
      affectiveResidue,
      personMemoryCapsule: surface.memory.personMemoryCapsule ?? null,
      derivedMindStateBundle: buildDerivedMindStateBundle({
        source: 'main-runtime',
        producedAt: input.now,
        hostPersonModel,
        personStateProjection: personStateProjection as unknown as Record<string, unknown> | null,
        knowledgeEvidence,
        selfEvolution,
        affectiveResidue,
        learningExecutionState,
        recallLatencyPolicy: input.context.recallLatencyPolicy
          ?? surface.memory.derivedMindStateBundle?.recallLatencyPolicy
          ?? null,
        recollectionIntent: input.context.recollectionIntent as unknown as Record<string, unknown> | null,
        recollectionPlan,
        recollectionSpeechPlan,
        memoryDeliberation: deliberation as unknown as Record<string, unknown>,
      }),
    },
  }
}
