import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'

interface RuntimeOrganicLearningGovernorInput {
  agentTurn: Pick<AlicizationAgentTurnRuntime, 'trackPhase'>
  cardId: string
  turnId: string
  personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
  organicPromptContext: OrganicMemoryPromptContext
  scheduleOrganicLearningAction?: (input: {
    context: OrganicMemoryPromptContext
    turnId?: string | null
  }) => Promise<unknown>
  listMemoryReflections?: (cardId: string, limit?: number) => Promise<Array<{
    id: string
    summary: string
    lesson: string
    status: 'pending' | 'confirmed' | 'denied' | 'superseded'
  }>>
  listRelationshipOutcomes?: (cardId: string, limit?: number) => Promise<Array<{
    id: string
    summary: string
  }>>
}

export async function runOrganicLearningGovernor(
  input: RuntimeOrganicLearningGovernorInput,
) {
  if (!input.scheduleOrganicLearningAction)
    return

  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const carriedProjectStateContinuity = input.organicPromptContext.projectStateContinuity ?? null
  const projectStateContinuity = {
    identity: carriedProjectStateContinuity?.identity ?? projectStateBrief.identity,
    currentPhase: carriedProjectStateContinuity?.currentPhase ?? projectStateBrief.currentPhase,
    sameHerSummary:
      carriedProjectStateContinuity?.sameHerSummary
      ?? 'Keep one same local digital life coherent across emotion, memory, initiative, and embodiment while learning from this turn.',
    landedProgressSummary:
      carriedProjectStateContinuity?.landedProgressSummary
      ?? projectStateBrief.continuityProgressSummary
      ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1)
      ?? null,
    openClosureSummary:
      carriedProjectStateContinuity?.openClosureSummary
      ?? projectStateBrief.openLoops[0]
      ?? null,
    nextClosureTarget:
      carriedProjectStateContinuity?.nextClosureTarget
      ?? projectStateBrief.nextClosureTarget
      ?? null,
    preDialogueAwarenessLine:
      carriedProjectStateContinuity?.preDialogueAwarenessLine
      ?? projectStateBrief.preDialogueAwarenessLine
      ?? null,
    emotionalClosureCue:
      carriedProjectStateContinuity?.emotionalClosureCue
      ?? projectStateBrief.emotionalClosureCue
      ?? null,
    sameHerSelfLine:
      carriedProjectStateContinuity?.sameHerSelfLine
      ?? projectStateBrief.sameHerSelfLine,
    sameHerDriftRisk:
      carriedProjectStateContinuity?.sameHerDriftRisk
      ?? projectStateBrief.sameHerDriftRisk,
    proactiveSameHerGap:
      carriedProjectStateContinuity?.proactiveSameHerGap
      ?? projectStateBrief.proactiveSameHerGap,
  }

  await input.agentTurn.trackPhase('organic-learning-scheduler', async () => {
    const [recentMemoryReflections, recentRelationshipOutcomes] = await Promise.all([
      input.listMemoryReflections?.(input.cardId, 8).catch(() => []) ?? Promise.resolve([]),
      input.listRelationshipOutcomes?.(input.cardId, 8).catch(() => []) ?? Promise.resolve([]),
    ])
    await input.scheduleOrganicLearningAction?.({
      context: {
        ...input.organicPromptContext,
        projectStateContinuity,
        recentMemoryReflections: recentMemoryReflections as any,
        recentRelationshipOutcomes: recentRelationshipOutcomes as any,
      },
      turnId: input.turnId,
    })
  }, {
    personaKernelMode: input.personaKernelMode,
  })
}
