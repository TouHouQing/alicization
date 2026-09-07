import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { OrganicMemoryPromptContext } from './runtime-soul'

interface RuntimeOrganicLearningGovernorInput {
  agentTurn: Pick<AlicizationAgentTurnRuntime, 'trackPhase'>
  cardId: string
  turnId: string
  signal?: AbortSignal
  personaKernelMode: AlicizationMindTurnGovernance['personaKernelMode']
  organicPromptContext: OrganicMemoryPromptContext
  scheduleOrganicLearningAction?: (input: {
    context: OrganicMemoryPromptContext
    turnId?: string | null
    signal?: AbortSignal
  }) => Promise<unknown>
  listMemoryReflections?: (cardId: string, limit?: number, readOptions?: { signal?: AbortSignal }) => Promise<Array<{
    id: string
    summary: string
    lesson: string
    status: 'pending' | 'confirmed' | 'denied' | 'superseded'
  }>>
  listRelationshipOutcomes?: (cardId: string, limit?: number, readOptions?: { signal?: AbortSignal }) => Promise<Array<{
    id: string
    summary: string
  }>>
}

export async function runOrganicLearningGovernor(
  input: RuntimeOrganicLearningGovernorInput,
) {
  if (!input.scheduleOrganicLearningAction)
    return
  if (input.signal?.aborted)
    throw input.signal.reason ?? new DOMException('Organic learning scheduling aborted', 'AbortError')

  await input.agentTurn.trackPhase('organic-learning-scheduler', async () => {
    const readMemoryReflections = input.signal
      ? input.listMemoryReflections?.(input.cardId, 8, { signal: input.signal })
      : input.listMemoryReflections?.(input.cardId, 8)
    const readRelationshipOutcomes = input.signal
      ? input.listRelationshipOutcomes?.(input.cardId, 8, { signal: input.signal })
      : input.listRelationshipOutcomes?.(input.cardId, 8)
    const [recentMemoryReflections, recentRelationshipOutcomes] = await Promise.all([
      readMemoryReflections?.catch(() => []) ?? Promise.resolve([]),
      readRelationshipOutcomes?.catch(() => []) ?? Promise.resolve([]),
    ])
    if (input.signal?.aborted)
      throw input.signal.reason ?? new DOMException('Organic learning scheduling aborted', 'AbortError')
    await input.scheduleOrganicLearningAction?.({
      context: {
        ...input.organicPromptContext,
        recentMemoryReflections: recentMemoryReflections as any,
        recentRelationshipOutcomes: recentRelationshipOutcomes as any,
      },
      turnId: input.turnId,
      signal: input.signal,
    })
  }, {
    personaKernelMode: input.personaKernelMode,
  })
}
