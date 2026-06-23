import { describe, expect, it, vi } from 'vitest'

import { runOrganicLearningGovernor } from './runtime-learning-governor'

describe('runtime learning governor', () => {
  it('skips scheduling when no organic learning action is configured', async () => {
    const trackPhase = vi.fn(async (_phase, run) => await run())

    await runOrganicLearningGovernor({
      agentTurn: {
        trackPhase,
      } as any,
      cardId: 'default',
      turnId: 'turn-1',
      personaKernelMode: 'full',
      organicPromptContext: {
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      },
    })

    expect(trackPhase).not.toHaveBeenCalled()
  })

  it('hydrates recent reflections and outcomes before scheduling organic learning', async () => {
    const trackPhase = vi.fn(async (_phase, run) => await run())
    const scheduleOrganicLearningAction = vi.fn(async () => {})

    await runOrganicLearningGovernor({
      agentTurn: {
        trackPhase,
      } as any,
      cardId: 'default',
      turnId: 'turn-2',
      personaKernelMode: 'full',
      organicPromptContext: {
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
      },
      listMemoryReflections: async () => [{
        id: 'reflection-1',
        summary: 'old repair lesson',
        lesson: 'repair first',
        status: 'confirmed',
      }],
      listRelationshipOutcomes: async () => [{
        id: 'outcome-1',
        summary: 'room before warmth',
      }],
      scheduleOrganicLearningAction,
    })

    expect(trackPhase).toHaveBeenCalledWith(
      'organic-learning-scheduler',
      expect.any(Function),
      expect.objectContaining({
        personaKernelMode: 'full',
      }),
    )
    expect(scheduleOrganicLearningAction).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        recentMemoryReflections: expect.arrayContaining([
          expect.objectContaining({
            id: 'reflection-1',
          }),
        ]),
        recentRelationshipOutcomes: expect.arrayContaining([
          expect.objectContaining({
            id: 'outcome-1',
          }),
        ]),
      }),
      turnId: 'turn-2',
    }))
  })
})
