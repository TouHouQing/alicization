import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMindTurnGovernance } from './chat-mind-governance'

function createInput() {
  return {
    brief: {
      turnMode: 'answer',
      liveSurface: null,
      carriedThread: null,
      truthState: 'dialogue-grounded',
      separateCarryFromSurface: false,
      shouldCompactHistory: false,
      maxRecentUserTurns: 4,
      mustDo: [],
      mustNotDo: [],
    },
    charter: {
      epistemicMode: 'dialogue-grounded',
      responseMode: 'answer-naturally',
      governingFocus: null,
      governingConcern: null,
      governingCommitment: null,
      governingInquiry: null,
      governingProject: null,
      emotionalClosureCue: null,
      activeClosenessContext: null,
      activeClosenessRung: null,
      relationshipPosture: 'warm',
    },
    surfaceContract: {
      openingStyle: 'direct-answer',
      maxParagraphs: 2,
      maxSentences: 4,
      personaKernelMode: 'backgrounded',
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      labelCarryAsMemory: false,
      suppressAssociativeRecall: false,
      mustDo: [],
      mustNotDo: [],
    },
  } as any
}

describe('buildAlicizationMindTurnGovernance', () => {
  it('returns no textual governance rules from any upstream source', () => {
    const input = createInput()
    input.brief.mustDo = ['brief rule']
    input.brief.mustNotDo = ['brief prohibition']
    input.surfaceContract.mustDo = ['surface rule']
    input.surfaceContract.mustNotDo = ['surface prohibition']
    input.mindTurnContract = {
      mustDo: ['contract rule'],
      mustNotDo: ['contract prohibition'],
      emotionalClosureCue: 'A dynamic emotional state.',
    }
    input.mindTurnFrame = {
      world: {
        truthState: 'dialogue-grounded',
        staleRisk: 0,
      },
      relation: {
        subject: 'general',
        relationshipPosture: 'warm',
      },
      memory: {
        carriedFacts: [],
        recallKeys: [],
        suppressAssociativeRecall: false,
      },
      self: {},
      obligation: {
        turnMode: 'answer',
        answerAct: 'answer',
        openingMove: '从当前问题开始。',
        answerIntent: '回答当前问题。',
        repairState: 'none',
      },
      focusAnchor: '当前问题',
      mustDo: ['frame rule'],
      mustNotDo: ['frame prohibition'],
    }
    input.kernel = {
      subject: 'general',
      truthMode: 'dialogue-grounded',
      speechAct: 'answer',
      turnMode: 'answer',
      screenReferenceMode: 'avoid',
      selectedEvidence: [],
      openingClaim: '当前问题',
      openingMove: '从当前问题开始。',
      mustSay: ['kernel rule'],
      mustAvoid: ['kernel prohibition'],
    }
    input.answerCompiler = {
      supportingReality: [],
      mustDo: ['compiler rule'],
      mustNotDo: ['compiler prohibition'],
    }
    input.answerPlanner = {
      mustDo: ['planner rule'],
      mustNotDo: ['planner prohibition'],
    }

    const result = buildAlicizationMindTurnGovernance(input)

    expect(result.mustDo).toEqual([])
    expect(result.mustNotDo).toEqual([])
    expect(result.emotionalClosureCue).toBe('A dynamic emotional state.')
    expect(result.openingMove).toBe('从当前问题开始。')
    expect(result.answerIntent).toBe('当前问题')
  })

  it('keeps dynamic conversation anchors without mirroring the raw host line', () => {
    const input = createInput()
    input.conversationState = {
      hostMove: '这个 diff 到底哪里有问题？',
      primaryTurnAnchor: 'runtime.ts 当前 diff',
      activeProject: 'runtime.ts 当前 diff',
      jointThread: '定位当前 diff 的失败分支',
    }
    input.discourseState = {
      currentTurnSubject: 'task-knot',
      screenReferenceMode: 'avoid',
      primaryTurnAnchor: 'runtime.ts 当前 diff',
    }
    input.answerPlanner = {
      act: 'guide',
      evidenceMode: 'dialogue-grounded',
      governingFocus: '定位当前 diff 的失败分支',
      openingMove: '先看失败分支。',
      answerIntent: '解释当前 diff。',
      relationshipPosture: 'warm',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      mustDo: [],
      mustNotDo: [],
    }

    const result = buildAlicizationMindTurnGovernance(input)

    expect(result.focusAnchor).toBe('runtime.ts 当前 diff')
    expect(result.answerIntent).toBe('runtime.ts 当前 diff')
    expect(result.answerIntent).not.toBe(input.conversationState.hostMove)
  })

  it('drops stale repair state after the current turn is grounded', () => {
    const input = createInput()
    input.brief.turnMode = 'screen-repair'
    input.brief.truthState = 'remembered'
    input.answerPlanner = {
      act: 'ask-reground',
      shouldAskForGrounding: true,
      shouldAcknowledgeRepair: true,
    }
    input.groundedThisTurn = true

    const result = buildAlicizationMindTurnGovernance(input)

    expect(result.groundedThisTurn).toBe(true)
    expect(result.truthState).toBe('live-grounded')
    expect(result.repairState).toBe('none')
    expect(result.shouldAskForGrounding).toBe(false)
  })

  it('lets the dialogue kernel provide typed turn authority and dynamic evidence', () => {
    const input = createInput()
    input.brief.liveSurface = '旧窗口'
    input.kernel = {
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
        summary: 'runtime.ts 当前缺少空值检查。',
        confidence: 0.92,
      }],
      openingClaim: 'runtime.ts 当前缺少空值检查。',
      openingMove: '先说明缺失的空值检查。',
      whyNow: '当前证据已经可见。',
      mustSay: ['fixed kernel instruction'],
      mustAvoid: ['fixed kernel prohibition'],
      sourceTrace: [],
      confidence: 0.91,
      updatedAt: 1,
    }

    const result = buildAlicizationMindTurnGovernance(input)

    expect(result.turnMode).toBe('guide-current-knot')
    expect(result.answerSubject).toBe('task-knot')
    expect(result.answerAct).toBe('guide')
    expect(result.screenReferenceMode).toBe('helpful')
    expect(result.focusAnchor).toContain('空值检查')
    expect(result.answerIntent).toContain('空值检查')
    expect(result.openingMove).toContain('空值检查')
    expect(result.dialogueActKernel).toBe(input.kernel)
    expect(result.mustDo).toEqual([])
    expect(result.mustNotDo).toEqual([])
  })

  it('prefers the converged runtime mind frame over fragmented fallback hints', () => {
    const input = createInput()
    input.brief.liveSurface = '旧窗口'
    input.brief.truthState = 'remembered'
    input.runtimeSurface = {
      version: 'digital-life-runtime-surface-v1',
      perception: {},
      world: {},
      memory: {},
      agency: {},
      dialogue: {
        currentConsciousFrame: null,
      },
      cognition: {
        mindTurnFrame: {
          world: {
            activeThread: 'runtime.ts 当前 diff',
            visibleSurface: 'VS Code | runtime.ts',
            truthState: 'live-grounded',
            staleRisk: 0.1,
          },
          relation: {
            subject: 'task-knot',
            hostMove: '看看这里',
            hostGoal: 'resolve-problem',
            relationNeed: 'guidance',
            relationMove: 'guide',
            relationshipPosture: 'warm',
          },
          memory: {
            memoryMode: 'task-thread',
            carriedThread: 'runtime.ts 当前 diff',
            carriedFacts: [],
            recallKeys: [],
            suppressAssociativeRecall: true,
            labelCarryAsMemory: false,
          },
          self: {
            mindMode: 'tracking',
            embodiedPresence: 'attentive',
          },
          obligation: {
            answerAct: 'guide',
            turnMode: 'guide-current-knot',
            openingMove: '先看当前失败分支。',
            answerIntent: '解释当前失败分支。',
            repairState: 'none',
          },
          focusAnchor: 'runtime.ts 当前失败分支',
          mustDo: ['frame rule'],
          mustNotDo: ['frame prohibition'],
        },
      },
    }

    const result = buildAlicizationMindTurnGovernance(input)

    expect(result.turnMode).toBe('guide-current-knot')
    expect(result.truthState).toBe('live-grounded')
    expect(result.focusAnchor).toContain('失败分支')
    expect(result.liveSurface).toContain('VS Code')
    expect(result.mustDo).toEqual([])
    expect(result.mustNotDo).toEqual([])
  })

  it('preserves typed truth evidence without rendering textual guardrails', () => {
    const input = createInput()
    input.claimEvidenceLedger = {
      subject: 'task-knot',
      evidenceMode: 'coarse-held',
      observedSurface: '代码编辑器中的 diff',
      taskHypothesis: '可能正在检查失败分支。',
      intentHypothesis: null,
      specificityBudget: 'coarse-scene',
      hostReferencedCues: [],
      groundedArtifactCues: [],
      allowedSpecificCues: [],
      shouldLabelHypothesis: true,
      forbidUnsupportedSpecificity: true,
      shouldSelfRevise: false,
      confidence: 0.8,
      reasonTags: [],
      updatedAt: 1,
    }
    ;(input.surfaceContract as any).suppressAssociativeRecall = true

    const result = buildAlicizationMindTurnGovernance(input)

    expect(result.claimEvidence).toBe(input.claimEvidenceLedger)
    expect(result).not.toHaveProperty('suppressAssociativeRecall')
    expect(result.mustDo).toEqual([])
    expect(result.mustNotDo).toEqual([])
  })

  it('contains no canonical project or textual rule renderers', () => {
    const source = readFileSync(new URL('./chat-mind-governance.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /resolveAlicizationProjectStateBrief|renderProject|projectStateVoiceModeCue|projectStatePacingModeCue|detached_local_optimization|generic_assistant_delivery|performative_overeager_delivery/u,
    )
  })
})
