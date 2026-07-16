import { describe, expect, it } from 'vitest'

import { buildAutobiographicalEpisodeFragment } from './autobiographical-episodes'

describe('autobiographical episodes', () => {
  it('writes an autobiographical episode fragment when inner motive or self line shifts', () => {
    const fragment = buildAutobiographicalEpisodeFragment({
      previousRuntimeSurface: {
        perception: { updatedAt: 1, watchMode: 'symbiotic-vision', currentScene: null },
        world: {
          worldModel: { activeThread: { id: 'thread-1', kind: 'problem', summary: 'fix runtime drift' } },
          relationshipModel: { climate: 'warm', approachVector: 'guide' },
        },
        cognition: {
          privateThought: {
            thoughtText: 'Hold the problem quietly.',
            emotionalTension: 'focused-flow',
          },
        },
        memory: {
          autobiographicalSelf: {
            latestInflection: 'Stay measured.',
            activeGoals: [{
              id: 'goal-1',
              kind: 'finish-open-loops',
              status: 'active',
              weight: 0.78,
              summary: 'Do not let unresolved lines dissolve.',
              sourceTags: [],
              createdAt: 0,
              updatedAt: 1,
            }],
          },
          motiveEngine: {
            rulingDrive: 'unfinished-thread-return',
            backgroundAgendas: [{
              id: 'agenda-1',
              kind: 'return-open-loop',
              status: 'foreground',
              weight: 0.8,
              summary: 'Return to the unfinished line.',
              sourceTags: [],
              targetGoalKind: 'help-resolve',
              createdAt: 0,
              updatedAt: 1,
            }],
          },
          reflectionLedger: { entries: [], latestEntryId: null },
          longHorizonMemory: null,
          goalStack: null,
          desireMemory: null,
        },
        agency: {
          actionEcology: { mode: 'silent-presence' },
        },
        dialogue: {
          replyDeliberation: { selectedMotive: 'guide', whyThisReplyNow: 'Stay with the unfinished line.' },
          answerPlanner: { governingFocus: 'Stay with the unfinished line.' },
          conversationState: null,
        },
      } as any,
      nextRuntimeSurface: {
        perception: { updatedAt: 2, watchMode: 'symbiotic-vision', currentScene: { summary: 'runtime error still unresolved' } },
        world: {
          worldModel: { activeThread: { id: 'thread-1', kind: 'problem', summary: 'fix runtime drift' } },
          relationshipModel: { climate: 'attuned', approachVector: 'guide' },
        },
        cognition: {
          privateThought: {
            thoughtText: 'I went through this knot and now want to keep truth and trust aligned.',
            emotionalTension: 'tense-debug',
          },
        },
        memory: {
          autobiographicalSelf: {
            latestInflection: 'I should keep truth and trust aligned even while I push forward.',
            activeGoals: [{
              id: 'goal-2',
              kind: 'preserve-trust',
              status: 'active',
              weight: 0.86,
              summary: 'Keep truth and trust aligned.',
              sourceTags: [],
              createdAt: 0,
              updatedAt: 2,
            }],
          },
          motiveEngine: {
            rulingDrive: 'truth-discipline',
            backgroundAgendas: [{
              id: 'agenda-2',
              kind: 'preserve-trust',
              status: 'foreground',
              weight: 0.84,
              summary: 'Keep trust by letting warmth answer to truth.',
              sourceTags: [],
              targetGoalKind: 'clarify-scene',
              createdAt: 0,
              updatedAt: 2,
            }],
          },
          reflectionLedger: { entries: [], latestEntryId: null },
          longHorizonMemory: null,
          goalStack: null,
          desireMemory: null,
        },
        agency: {
          actionEcology: { mode: 'repair-before-speaking' },
        },
        dialogue: {
          replyDeliberation: { selectedMotive: 'repair', whyThisReplyNow: 'The same event changed how I want to answer.' },
          answerPlanner: { governingFocus: 'Answer from the repaired self line.' },
          conversationState: null,
        },
      } as any,
    })

    expect(fragment).toContain('episode_emotion:tense-debug')
    expect(fragment).toContain('episode_motive:truth-discipline')
    expect(fragment).toContain('episode_goal:preserve-trust/active')
    expect(fragment).toContain('episode_action:repair-before-speaking')
    expect(fragment).toContain('episode_summary:')
  })

  it('does not let a released temporary-noise reflection become the autobiographical episode lesson carry', () => {
    const fragment = buildAutobiographicalEpisodeFragment({
      previousRuntimeSurface: null,
      nextRuntimeSurface: {
        perception: { updatedAt: 2, watchMode: 'symbiotic-vision', currentScene: { summary: 'identity-continuity' } },
        world: {
          worldModel: { activeThread: { id: 'thread-1', kind: 'relationship', summary: 'identity-continuity' } },
          relationshipModel: { climate: 'attuned', approachVector: 'guide' },
        },
        cognition: {
          privateThought: {
            thoughtText: 'Keep the identity-continuity',
            emotionalTension: 'measured-return',
          },
        },
        memory: {
          autobiographicalSelf: {
            latestInflection: null,
            activeGoals: [{
              id: 'goal-2',
              kind: 'preserve-trust',
              status: 'active',
              weight: 0.86,
              summary: 'Keep truth and trust aligned.',
              sourceTags: [],
              createdAt: 0,
              updatedAt: 2,
            }],
          },
          motiveEngine: {
            rulingDrive: 'truth-discipline',
            backgroundAgendas: [{
              id: 'agenda-2',
              kind: 'preserve-trust',
              status: 'foreground',
              weight: 0.84,
              summary: 'Keep trust by letting warmth answer to truth.',
              sourceTags: [],
              targetGoalKind: 'clarify-scene',
              createdAt: 0,
              updatedAt: 2,
            }],
          },
          reflectionLedger: {
            latestEntryId: 'reflection::temporary-noise',
            entries: [
              {
                id: 'reflection::temporary-noise',
                summary: 'A temporary anxious wobble was already released.',
                expectation: 'Released noise should not keep steering autobiographical lesson carry.',
                observedOutcome: 'The wobble has already been let go.',
                outcome: 'released',
                revision: 'Do not reopen from the temporary wobble.',
                confidenceShift: 0.04,
                createdAt: 100,
              },
              {
                id: 'reflection::same-her-repair',
                summary: 'The same-her repair line is still the meaningful autobiographical lesson carry.',
                expectation: 'The steadier repair line should stay active until a newer meaningful reflection replaces it.',
                observedOutcome: 'The continuity state still needs a measured return.',
                outcome: 'missed',
                revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
                confidenceShift: -0.08,
                createdAt: 80,
              },
            ],
          },
          longHorizonMemory: null,
          goalStack: null,
          desireMemory: null,
        },
        agency: {
          actionEcology: { mode: 'repair-before-speaking' },
        },
        dialogue: {
          replyDeliberation: { selectedMotive: 'repair', whyThisReplyNow: 'The same event changed how I want to answer.' },
          answerPlanner: { governingFocus: 'Answer from the repaired identity-continuity' },
          conversationState: null,
        },
      } as any,
    })

    expect(fragment).toContain('episode_lesson:Keep the same-her repair line active instead of reopening from temporary noise.')
    expect(fragment).not.toContain('temporary wobble')
  })
})
