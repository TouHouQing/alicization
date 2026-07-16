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
        projectStateContinuity: expect.objectContaining({
          identity: expect.stringContaining('local-first digital life project'),
          currentPhase: expect.stringContaining('Phase 1'),
          nextClosureTarget: expect.any(String),
          preDialogueAwarenessLine: expect.any(String),
          proactiveSameHerGap: expect.any(String),
          sameHerDriftRisk: expect.any(String),
        }),
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

  it('backfills partial project-state continuity before scheduling organic learning so longer-horizon learning keeps the same Phase 1 digital-life closure line', async () => {
    const trackPhase = vi.fn(async (_phase, run) => await run())
    const scheduleOrganicLearningAction = vi.fn(async () => {})

    await runOrganicLearningGovernor({
      agentTurn: {
        trackPhase,
      } as any,
      cardId: 'default',
      turnId: 'turn-3',
      personaKernelMode: 'full',
      organicPromptContext: {
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        projectStateContinuity: {
          sameHerSummary: 'Keep the same her intact while this learning thread stays open.',
          landedProgressSummary: 'Thin carried landed progress only.',
        } as any,
      },
      scheduleOrganicLearningAction,
    })

    expect(scheduleOrganicLearningAction).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        projectStateContinuity: expect.objectContaining({
          identity: expect.stringContaining('local-first digital life project'),
          currentPhase: expect.stringContaining('Phase 1'),
          sameHerSummary: 'Keep the same her intact while this learning thread stays open.',
          landedProgressSummary: 'Thin carried landed progress only.',
          openClosureSummary: expect.any(String),
          nextClosureTarget: expect.any(String),
          preDialogueAwarenessLine: expect.any(String),
          proactiveSameHerGap: expect.any(String),
          sameHerSelfLine: expect.stringContaining('legacy phase-one template'),
          sameHerDriftRisk: expect.any(String),
        }),
      }),
      turnId: 'turn-3',
    }))
  })

  it('keeps a richer carried emotional closure cue when scheduling organic learning so later learning stays on the same emotional identity-continuity', async () => {
    const trackPhase = vi.fn(async (_phase, run) => await run())
    const scheduleOrganicLearningAction = vi.fn(async () => {})
    const richerEmotionalClosureCue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the continuity state.'
    const richerProactiveSameHerGap = 'Longer-horizon learning still needs stronger proof that late-night low-pressure carry, rest-protective initiative, and later embodiment return stay on one identity-continuity'

    await runOrganicLearningGovernor({
      agentTurn: {
        trackPhase,
      } as any,
      cardId: 'default',
      turnId: 'turn-4',
      personaKernelMode: 'full',
      organicPromptContext: {
        hostAttitude: 'warm',
        coreIncarnation: '',
        activeThoughts: [],
        retrievedFacts: [],
        recalledFragments: [],
        projectStateContinuity: {
          sameHerSummary: 'Keep the same her intact while this longer-horizon learning thread stays open.',
          emotionalClosureCue: richerEmotionalClosureCue,
          proactiveSameHerGap: richerProactiveSameHerGap,
        } as any,
      },
      scheduleOrganicLearningAction,
    })

    expect(scheduleOrganicLearningAction).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        projectStateContinuity: expect.objectContaining({
          emotionalClosureCue: richerEmotionalClosureCue,
          proactiveSameHerGap: richerProactiveSameHerGap,
          sameHerSummary: 'Keep the same her intact while this longer-horizon learning thread stays open.',
        }),
      }),
      turnId: 'turn-4',
    }))
  })
})
