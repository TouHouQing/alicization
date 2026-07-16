import { describe, expect, it } from 'vitest'

import { buildAlicizationResponseCharter } from './response-charter'

function createRuntimeSurface(overrides?: Record<string, unknown>) {
  return {
    perception: {
      currentScene: null,
    },
    world: {
      worldModel: {
        epistemicState: {
          certainty: 'observed',
        },
      },
    },
    cognition: {},
    memory: {
      concerns: [],
      commitmentLedger: null,
      inquiryPlanner: null,
      intentionStream: null,
      personStateProjection: null,
    },
    dialogue: {
      dialogueEncounter: null,
      dialogueActKernel: null,
      discourseState: null,
      mindSynthesis: null,
      dialogueWorldThread: null,
      answerCompiler: null,
      currentConsciousFrame: null,
      claimEvidenceLedger: null,
      answerPlanner: null,
    },
    agency: {},
    ...overrides,
  } as any
}

function build(overrides?: Record<string, unknown>) {
  return buildAlicizationResponseCharter({
    context: {
      content: {
        kind: 'chat',
      },
    } as any,
    state: {} as any,
    runtimeSurface: createRuntimeSurface(),
    inspectionRequested: false,
    ...overrides,
  })
}

describe('response context facts', () => {
  it('returns dynamic facts without reply-writing control lists', () => {
    const result = build({
      runtimeSurface: createRuntimeSurface({
        dialogue: {
          ...createRuntimeSurface().dialogue,
          currentConsciousFrame: {
            speakingIntention: 'Answer the current memory question.',
            truthDiscipline: 'dialogue-first',
          },
        },
      }),
    })

    expect(result).toMatchObject({
      governingFocus: 'Answer the current memory question.',
      epistemicMode: 'coarse-live',
      responseMode: 'answer-naturally',
    })
    expect(result).not.toHaveProperty('mustDo')
    expect(result).not.toHaveProperty('mustNotDo')
    expect(result).not.toHaveProperty('reasons')
  })

  it('keeps project facts only for an explicit project-state turn', () => {
    const projectState = {
      identity: 'Memory Workbench',
      currentPhase: 'quality and scale',
      primaryOpenLoop: 'semantic recall evaluation',
    }
    const ordinary = build({
      projectState,
    })
    const explicit = build({
      projectState,
      dialogueActKernel: {
        subject: 'project-state',
      } as any,
    })

    expect(ordinary.governingProject).toBeNull()
    expect(explicit.governingProject).toBe('Memory Workbench')
  })

  it('drops fixed template residue and uses current structured relationship posture', () => {
    const result = build({
      runtimeSurface: createRuntimeSurface({
        memory: {
          ...createRuntimeSurface().memory,
          personStateProjection: {
            activeClosenessContext: 'host-room-first',
            activeClosenessRung: 'space-first',
            relationshipPosture: 'restrained',
          },
        },
        dialogue: {
          ...createRuntimeSurface().dialogue,
          currentConsciousFrame: {
            speakingIntention: 'Alicization is a local-first digital life project.',
            truthDiscipline: 'dialogue-first',
          },
        },
      }),
    })

    expect(result.governingFocus).toBeNull()
    expect(result.relationshipPosture).toBe('restrained')
    expect(result.activeClosenessContext).toBe('host-room-first')
    expect(result.activeClosenessRung).toBe('space-first')
  })
})
