import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { OrganicMemoryPromptContext } from './runtime-soul'

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

  await input.agentTurn.trackPhase('organic-learning-scheduler', async () => {
    const [recentMemoryReflections, recentRelationshipOutcomes] = await Promise.all([
      input.listMemoryReflections?.(input.cardId, 8).catch(() => []) ?? Promise.resolve([]),
      input.listRelationshipOutcomes?.(input.cardId, 8).catch(() => []) ?? Promise.resolve([]),
    ])
    await input.scheduleOrganicLearningAction?.({
      context: {
        ...input.organicPromptContext,
        projectStatePreDialogueAwarenessLine: null,
        projectStatePreflightSummary: null,
        projectStateContinuity: null,
        activeContinuityGovernance: null,
        recentMemoryReflections: recentMemoryReflections as any,
        recentRelationshipOutcomes: recentRelationshipOutcomes as any,
      },
      turnId: input.turnId,
    })
  }, {
    personaKernelMode: input.personaKernelMode,
  })
}
