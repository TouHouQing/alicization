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
})
