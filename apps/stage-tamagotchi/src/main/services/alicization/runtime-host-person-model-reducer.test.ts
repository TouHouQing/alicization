import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  applyHostPersonModelToDigitalLifeRuntimeSurface,
  applyHostPersonModelToGovernance,
} from './runtime-host-person-model-reducer'

function createProjection(overrides: Record<string, unknown> = {}) {
  return {
    contexts: ['focused-work'],
    activeClosenessContext: 'focused-work',
    activeClosenessRung: 'space-first',
    relationshipPosture: 'restrained',
    cautious: true,
    restrained: true,
    preferenceText: 'The host prefers room while concentrating.',
    sensitivityText: 'Extra conversational pressure is unwelcome during focused work.',
    repairTriggerText: null,
    burdenText: 'The current task already carries enough load.',
    routineText: null,
    trustRationale: 'Trust grows when current boundaries are respected.',
    relationshipDoctrine: 'Respect the current boundary.',
    openingGuidance: 'Use the current turn as the opening.',
    summary: 'Focused work currently needs room.',
    selfContinuityAuthority: null,
    personalityContinuityState: {
      currentRegime: 'focused-work',
    },
    ...overrides,
  } as any
}

function createGovernance(overrides: Record<string, unknown> = {}) {
  return {
    answerSubject: 'task-knot',
    answerAct: 'guide',
    answerIntent: '回答当前运行时问题。',
    openingMove: '从当前问题开始。',
    liveSurface: 'runtime diff',
    focusAnchor: '当前运行时问题',
    relationshipPosture: 'warm',
    evidenceMode: 'dialogue-grounded',
    turnMode: 'answer',
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair: false,
    mustDo: ['existing dynamic rule'],
    mustNotDo: ['existing dynamic boundary'],
    ...overrides,
  } as any
}

function createSurface(dialogue: Record<string, unknown>, memory: Record<string, unknown> = {}) {
  return {
    version: 'digital-life-runtime-surface-v1',
    perception: {
      currentScene: null,
    },
    world: {},
    cognition: {
      privateThought: null,
    },
    memory: {
      autobiographicalSelf: null,
      hostPersonModel: null,
      longHorizonMemory: null,
      motiveEngine: null,
      selfContinuity: null,
      personalityContinuityState: null,
      personStateProjection: null,
      ...memory,
    },
    dialogue,
    agency: {
      habitPolicy: null,
      selfState: null,
    },
  } as any
}

describe('runtime-host-person-model-reducer', () => {
  it('updates the person-state projection without creating missing dialogue owners', () => {
    const projection = createProjection()
    const dialogue = {
      replyDeliberation: null,
      answerPlanner: null,
      dialogueActKernel: null,
    }
    const surface = createSurface(dialogue)

    const nextSurface = applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface,
      governance: createGovernance(),
      context: {
        hostPersonModel: null,
        personStateProjection: projection,
        selfEvolution: null,
      } as any,
      now: 100,
    })

    expect(nextSurface?.memory.personStateProjection).toBe(projection)
    expect(nextSurface?.memory.personalityContinuityState).toBe(projection.personalityContinuityState)
    expect(nextSurface?.dialogue).toEqual(dialogue)
  })

  it('persists typed host and self-evolution memory without turning them into dialogue text', () => {
    const dialogue = {
      replyDeliberation: null,
      answerPlanner: null,
      dialogueActKernel: null,
    }
    const surface = createSurface(dialogue)
    const hostPersonModel = {
      summary: 'The host prefers room while focused.',
      trustLadder: {
        score: 0.4,
        stage: 'guarded',
        rationale: 'Current boundaries need to be respected.',
      },
      preferredClosenessByContext: [],
      preferences: [],
      sensitivities: [],
      repairTriggers: [],
      recurrentBurdens: [],
      routines: [],
    }
    const selfEvolution = {
      version: 'self-evolution-kernel-v1',
      relationshipDoctrine: 'Respect the current boundary.',
    }

    const nextSurface = applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface,
      governance: createGovernance(),
      context: {
        hostPersonModel,
        personStateProjection: createProjection(),
        selfEvolution,
      } as any,
      now: 150,
    })

    expect(nextSurface?.memory.hostPersonModel).toBe(hostPersonModel)
    expect(nextSurface?.memory.selfEvolution).toBe(selfEvolution)
    expect(nextSurface?.dialogue).toEqual(dialogue)
  })

  it('does not rewrite existing reply, kernel, or planner text while applying typed posture', () => {
    const replyDeliberation = {
      selectedMotive: 'guide',
      speakingFrom: 'task-thread',
      memoryMode: 'task-thread',
      openingBeat: '先处理当前错误。',
      whyThisReplyNow: '当前错误还没有解决。',
      whyNotOtherCandidates: [],
      withheldImpulses: [],
      candidateMotives: [],
      shouldSpeak: true,
      mustInclude: [],
      mustAvoid: [],
      confidence: 0.8,
      narrative: [],
      updatedAt: 10,
    }
    const answerPlanner = {
      act: 'guide',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.8,
      governingFocus: '当前运行时错误。',
      governingProject: null,
      openingMove: '先处理当前错误。',
      answerIntent: '解决当前运行时错误。',
      relationshipPosture: 'warm',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: 'concern:runtime',
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedRuntimeThreadId: 'thread:runtime',
      selectedProjectId: null,
      selectedReflectionId: null,
      executivePhase: 'respond',
      selectedTruthFrame: 'live',
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      updatedAt: 10,
    }
    const dialogueActKernel = {
      subject: 'task-knot',
      hostGoal: 'resolve-problem',
      relationNeed: 'guidance',
      activeProject: null,
      truthMode: 'dialogue-grounded',
      speechAct: 'guide',
      turnMode: 'guide-current-knot',
      screenReferenceMode: 'avoid',
      speakingFrom: 'task-thread',
      selectedEvidence: [],
      openingClaim: '当前运行时错误。',
      openingMove: '先处理当前错误。',
      whyNow: '当前错误还没有解决。',
      mustSay: [],
      mustAvoid: [],
      sourceTrace: [],
      confidence: 0.8,
      updatedAt: 10,
    }
    const surface = createSurface({
      replyDeliberation,
      answerPlanner,
      dialogueActKernel,
    })

    const nextSurface = applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface,
      governance: createGovernance(),
      context: {
        hostPersonModel: null,
        personStateProjection: createProjection(),
        selfEvolution: null,
      } as any,
      now: 200,
    })

    expect(nextSurface?.dialogue.replyDeliberation).toEqual(replyDeliberation)
    expect(nextSurface?.dialogue.dialogueActKernel).toEqual(dialogueActKernel)
    expect(nextSurface?.dialogue.answerPlanner).toEqual({
      ...answerPlanner,
      relationshipPosture: 'restrained',
    })
  })

  it('preserves the stronger runtime self-continuity authority during projection refresh', () => {
    const heldRelationshipLine = 'Keep the active callback bounded and leave room.'
    const surface = createSurface(
      {
        replyDeliberation: null,
        answerPlanner: null,
        dialogueActKernel: null,
      },
      {
        personStateProjection: {
          selfContinuityAuthority: {
            relationshipLine: heldRelationshipLine,
            openingGuidance: 'Return to the active callback only when the turn invites it.',
          },
        },
      },
    )

    const nextSurface = applyHostPersonModelToDigitalLifeRuntimeSurface({
      surface,
      governance: createGovernance(),
      context: {
        hostPersonModel: null,
        personStateProjection: createProjection(),
        selfEvolution: null,
      } as any,
      now: 300,
    })

    expect(nextSurface?.memory.personStateProjection?.selfContinuityAuthority?.relationshipLine).toBe(
      heldRelationshipLine,
    )
  })

  it('only applies typed relationship posture to governance', () => {
    const governance = createGovernance()
    const nextGovernance = applyHostPersonModelToGovernance({
      now: 400,
      governance,
      context: {
        hostPersonModel: {
          summary: 'The host prefers low conversational pressure while focused.',
          trustLadder: {
            score: 0.4,
            stage: 'guarded',
            rationale: 'Boundaries need to be respected.',
          },
          preferredClosenessByContext: [{
            context: 'focused-work',
            preference: 'Leave room during focused work.',
          }],
          preferences: [],
          sensitivities: ['Do not interrupt concentrated work without need.'],
          repairTriggers: [],
          recurrentBurdens: [],
          routines: [],
        },
      } as any,
    })

    expect(nextGovernance).toEqual({
      ...governance,
      relationshipPosture: 'restrained',
    })
  })

  it('contains no fixed host-person dialogue generators', () => {
    const source = readFileSync(new URL('./runtime-host-person-model-reducer.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /deriveSelfEvolutionOpeningBias|Host preference for this context|host_preference=|memory-led|mergeGuidanceLine|mergeUniqueRules/u,
    )
  })
})
