import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { reduceRuntimeAnswerPlanner } from './runtime-answer-planner-reducer'

function createGovernance(overrides: Record<string, unknown> = {}) {
  return {
    answerAct: 'answer',
    answerSubject: 'general',
    answerIntent: '用户当前的问题。',
    focusAnchor: '用户当前的问题。',
    openingMove: '从当前问题开始。',
    liveSurface: null,
    evidenceMode: 'dialogue-grounded',
    screenReferenceMode: 'avoid',
    relationshipPosture: 'warm',
    turnMode: 'answer',
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair: false,
    mustDo: ['fixed governance rule'],
    mustNotDo: ['fixed governance prohibition'],
    ...overrides,
  } as any
}

function createSurface(dialogue: Record<string, unknown>) {
  return {
    version: 'digital-life-runtime-surface-v1',
    perception: {},
    world: {},
    cognition: {},
    memory: {},
    agency: {},
    dialogue,
    raw: {},
  } as any
}

describe('reduceRuntimeAnswerPlanner', () => {
  it('sanitizes existing dynamic planner fields without carrying project or rule text', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 10,
      governance: createGovernance(),
      surface: createSurface({
        currentConsciousFrame: null,
        replyDeliberation: null,
        dialogueActKernel: null,
        answerPlanner: {
          act: 'guide',
          evidenceMode: 'live-grounded',
          confidence: 0.86,
          governingFocus: '用户当前正在检查 runtime.ts。',
          governingProject: 'Phase 1 same-her project-state template.',
          openingMove: '从 runtime.ts 当前问题开始。',
          answerIntent: '回答 runtime.ts 当前问题。',
          relationshipPosture: 'restrained',
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
          mustDo: ['fixed planner rule'],
          mustNotDo: ['fixed planner prohibition'],
          narrative: ['fixed planner narrative'],
          updatedAt: 1,
        },
      }),
    })

    expect(reduced?.dialogue.answerPlanner).toMatchObject({
      act: 'guide',
      evidenceMode: 'live-grounded',
      governingFocus: '用户当前正在检查 runtime.ts。',
      governingProject: null,
      openingMove: '从 runtime.ts 当前问题开始。',
      answerIntent: '回答 runtime.ts 当前问题。',
      selectedConcernEntryId: 'concern:runtime',
      selectedRuntimeThreadId: 'thread:runtime',
      mustDo: [],
      mustNotDo: [],
      narrative: [],
    })
  })

  it('does not synthesize missing dialogue owners from governance', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 11,
      governance: createGovernance(),
      surface: createSurface({
        currentConsciousFrame: null,
        replyDeliberation: null,
        dialogueActKernel: null,
        answerPlanner: null,
      }),
    })

    expect(reduced?.dialogue.answerPlanner).toBeNull()
    expect(reduced?.dialogue.replyDeliberation).toBeNull()
    expect(reduced?.dialogue.dialogueActKernel).toBeNull()
  })

  it('does not rewrite project-state ownership while sanitizing planner surfaces', () => {
    const projectState = {
      identity: 'A local project.',
      currentPhase: 'A runtime phase.',
      latestLandedProgress: 'The memory owner is connected.',
      primaryOpenLoop: 'Search still needs scale testing.',
      nextClosureTarget: 'Run larger recall benchmarks.',
    }
    const reduced = reduceRuntimeAnswerPlanner({
      now: 12,
      governance: createGovernance(),
      surface: createSurface({
        currentConsciousFrame: {
          projectState,
        },
        replyDeliberation: null,
        dialogueActKernel: null,
        answerPlanner: null,
      }),
    })

    expect(reduced?.dialogue.currentConsciousFrame?.projectState).toEqual(projectState)
    expect(reduced?.raw).toEqual({})
  })

  it('clears rule arrays without erasing typed reply and evidence state', () => {
    const reduced = reduceRuntimeAnswerPlanner({
      now: 13,
      governance: createGovernance(),
      surface: createSurface({
        currentConsciousFrame: null,
        answerPlanner: null,
        replyDeliberation: {
          selectedMotive: 'guide',
          speakingFrom: 'task-thread',
          memoryMode: 'task-thread',
          openingBeat: '先处理当前错误。',
          whyThisReplyNow: '当前错误仍然没有解决。',
          whyNotOtherCandidates: ['当前问题优先。'],
          withheldImpulses: ['不展开无关分支。'],
          candidateMotives: [],
          shouldSpeak: true,
          mustInclude: ['fixed include'],
          mustAvoid: ['fixed avoid'],
          confidence: 0.8,
          narrative: ['fixed narrative'],
          updatedAt: 1,
        },
        dialogueActKernel: {
          subject: 'task-knot',
          hostGoal: 'resolve-problem',
          relationNeed: 'guidance',
          activeProject: null,
          truthMode: 'live-grounded',
          speechAct: 'guide',
          turnMode: 'guide-current-knot',
          screenReferenceMode: 'helpful',
          speakingFrom: 'task-thread',
          selectedEvidence: [{
            kind: 'scene',
            source: 'current-scene',
            summary: 'runtime.ts 当前错误。',
            confidence: 0.9,
          }],
          openingClaim: 'runtime.ts 当前错误。',
          openingMove: '先处理当前错误。',
          whyNow: '当前错误仍然没有解决。',
          mustSay: ['fixed must say'],
          mustAvoid: ['fixed must avoid'],
          sourceTrace: ['fixed trace cue'],
          confidence: 0.9,
          updatedAt: 1,
        },
      }),
    })

    expect(reduced?.dialogue.replyDeliberation).toMatchObject({
      selectedMotive: 'guide',
      openingBeat: '先处理当前错误。',
      whyThisReplyNow: '当前错误仍然没有解决。',
      mustInclude: [],
      mustAvoid: [],
      narrative: [],
    })
    expect(reduced?.dialogue.dialogueActKernel).toMatchObject({
      subject: 'task-knot',
      speechAct: 'guide',
      selectedEvidence: [{
        summary: 'runtime.ts 当前错误。',
      }],
      mustSay: [],
      mustAvoid: [],
      sourceTrace: [],
    })
  })

  it('contains no canonical project or anti-restart generators', () => {
    const source = readFileSync(new URL('./runtime-answer-planner-reducer.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /resolveAlicizationProjectStateBrief|project-state-answer-planner|continuity_constraint=anti_restart|same-her|same her|Phase 1/iu,
    )
  })
})
