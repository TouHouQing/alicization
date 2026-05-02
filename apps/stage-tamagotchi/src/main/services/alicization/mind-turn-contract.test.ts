import { describe, expect, it } from 'vitest'

import { buildAlicizationMindTurnContract, buildAlicizationMindTurnContractSystemBlock } from './mind-turn-contract'

describe('mind-turn-contract', () => {
  it('unifies planner, compiler, charter, and surface contract into one contract', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: {
        act: 'guide',
        evidenceMode: 'coarse-held',
        confidence: 0.82,
        governingFocus: 'runtime seam',
        openingMove: 'Start from the seam.',
        answerIntent: 'Guide the next repair step.',
        relationshipPosture: 'restrained',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        mustDo: ['Keep the answer inside the active knot.'],
        mustNotDo: ['Do not widen into companionship tone.'],
        narrative: ['The reply should stay with the seam.'],
        updatedAt: 100,
      },
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'answer-now',
        relationMove: 'measured-room',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        recommendedAct: 'guide',
        evidenceMode: 'coarse-held',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'restrained',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        openingDirective: 'Answer directly from the seam.',
        openingClaim: 'The seam is still the right locus.',
        supportingReality: ['The active knot is still the runtime seam.'],
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: ['Move from knot to next step.'],
        mustNotDo: ['Do not narrate internal state.'],
        confidence: 0.84,
        narrative: ['The visible answer should stay compact and thread-faithful.'],
        updatedAt: 120,
      } as any,
      responseCharter: {
        epistemicMode: 'coarse-live',
        responseMode: 'guide-current-knot',
        governingFocus: 'runtime seam',
        governingConcern: 'The active knot is still unresolved.',
        governingCommitment: 'Keep the answer inside the knot.',
        governingInquiry: null,
        governingProject: 'repair seam',
        latestRevision: null,
        executivePhase: 'steer',
        truthFrame: 'task-thread',
        mindMode: 'tracking',
        relationshipPosture: 'restrained',
        reasons: ['The knot still governs the turn.'],
        mustDo: ['Stay with the live knot.'],
        mustNotDo: ['Do not smooth over uncertainty.'],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'space-first',
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'backgrounded',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: ['Start with the answer immediately.'],
        mustNotDo: ['Do not surface recollection just because it is active internally.'],
      },
      now: 140,
    })

    expect(contract.version).toBe('mind-turn-contract-v1')
    expect(contract.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(contract.governingFocus).toBe('runtime seam')
    expect(contract.mustDo).toEqual(expect.arrayContaining([
      'Keep the answer inside the active knot.',
      'Move from knot to next step.',
      'Stay with the live knot.',
      'Start with the answer immediately.',
    ]))
    expect(contract.mustNotDo).toEqual(expect.arrayContaining([
      'Do not widen into companionship tone.',
      'Do not narrate internal state.',
      'Do not smooth over uncertainty.',
      'Do not surface recollection just because it is active internally.',
    ]))
  })

  it('renders a single system block from the unified contract', () => {
    const block = buildAlicizationMindTurnContractSystemBlock({
      version: 'mind-turn-contract-v1',
      answerIntent: 'Guide the next repair step.',
      answerAct: 'guide',
      turnMode: 'guide-current-knot',
      responseMode: 'guide-current-knot',
      evidenceMode: 'coarse-held',
      openingStyle: 'direct-answer',
      expectedVisibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      personaKernelMode: 'backgrounded',
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      relationshipPosture: 'restrained',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: true,
      allowAffectionatePreface: false,
      allowStageDirections: false,
      allowBodyNarration: false,
      maxParagraphs: 2,
      maxSentences: 4,
      mustDo: ['Start with the answer immediately.'],
      mustNotDo: ['Do not narrate internal state.'],
      governingFocus: 'runtime seam',
      governingConcern: 'The active knot is still unresolved.',
      governingCommitment: 'Keep the answer inside the knot.',
      governingInquiry: null,
      governingProject: 'repair seam',
      reasons: ['The knot still governs the turn.'],
      updatedAt: 140,
    })

    expect(block).toContain('[ALICIZATION_MIND_TURN_CONTRACT]')
    expect(block).toContain('Expected visible reply authority: llm-mind.')
    expect(block).toContain('Closeness ladder: focused-work/space-first.')
  })
})
