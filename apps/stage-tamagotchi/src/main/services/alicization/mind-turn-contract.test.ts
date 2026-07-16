import { describe, expect, it } from 'vitest'

import {
  buildAlicizationMindTurnContract,
  buildAlicizationMindTurnContractSystemBlock,
} from './mind-turn-contract'

const charter = {
  epistemicMode: 'dialogue-grounded',
  responseMode: 'answer-naturally',
  governingFocus: 'current question',
  governingConcern: null,
  governingCommitment: null,
  governingInquiry: null,
  governingProject: null,
  emotionalClosureCue: null,
  latestRevision: null,
  executivePhase: null,
  truthFrame: null,
  mindMode: null,
  relationshipPosture: 'restrained',
  reasons: [],
  mustDo: ['legacy charter rule'],
  mustNotDo: ['legacy charter boundary'],
} as const

const surface = {
  openingStyle: 'direct-answer',
  replyRealizationMode: 'provider-mind-required',
  expectedVisibleReplyAuthority: 'llm-mind',
  maxParagraphs: 2,
  maxSentences: 4,
  personaKernelMode: 'full',
  allowAffectionatePreface: false,
  allowStageDirections: false,
  allowBodyNarration: false,
  labelCarryAsMemory: false,
  suppressAssociativeRecall: false,
  mustDo: ['legacy surface rule'],
  mustNotDo: ['legacy surface boundary'],
} as const

describe('mind-turn-contract', () => {
  it('keeps planning facts but does not aggregate reply-writing rules', () => {
    const contract = buildAlicizationMindTurnContract({
      responseCharter: charter as any,
      responseSurfaceContract: surface as any,
      answerPlanner: {
        answerIntent: 'answer the current question',
        act: 'answer',
        mustDo: ['legacy planner rule'],
        mustNotDo: ['legacy planner boundary'],
        narrative: [],
        updatedAt: 10,
      } as any,
      now: 20,
    })

    expect(contract.answerIntent).toBe('answer the current question')
    expect(contract.governingFocus).toBe('current question')
    expect(contract.mustDo).toEqual([])
    expect(contract.mustNotDo).toEqual([])
    expect(buildAlicizationMindTurnContractSystemBlock(contract)).toBe('')
  })

  it('keeps live project state as inspectable data only', () => {
    const contract = buildAlicizationMindTurnContract({
      responseCharter: charter as any,
      responseSurfaceContract: surface as any,
      projectState: {
        identity: 'runtime-identity-marker',
        currentPhase: 'runtime-phase-marker',
        latestLandedProgress: 'runtime-landed-marker',
        primaryOpenLoop: 'runtime-open-marker',
        nextClosureTarget: 'runtime-next-marker',
      },
      now: 30,
    })

    expect(JSON.stringify(contract.projectState)).toContain('runtime-landed-marker')
    expect(JSON.stringify(contract.projectState)).toContain('runtime-next-marker')
    expect(contract.mustDo).toEqual([])
    expect(contract.mustNotDo).toEqual([])
  })
})
