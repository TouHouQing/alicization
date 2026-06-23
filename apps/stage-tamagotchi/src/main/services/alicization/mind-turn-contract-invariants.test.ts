import { describe, expect, it } from 'vitest'

import { buildAlicizationMindTurnContract } from './mind-turn-contract'
import { resolveAlicizationPreparedVisibleReplyExecution } from './visible-reply/facade'

describe('mind-turn-contract invariants', () => {
  it('keeps one latent authority when contract and legacy surfaces disagree', () => {
    const contract = buildAlicizationMindTurnContract({
      answerPlanner: {
        act: 'answer',
        evidenceMode: 'dialogue-grounded',
        confidence: 0.8,
        governingFocus: 'host-state',
        openingMove: 'Answer directly.',
        answerIntent: 'Answer the host directly.',
        relationshipPosture: 'warm',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        mustDo: ['Pay off the host ask immediately.'],
        mustNotDo: ['Do not widen into task talk.'],
        narrative: ['The host-state question governs this turn.'],
        updatedAt: 100,
      } as any,
      answerCompiler: {
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-now',
        relationMove: 'warm-near',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        openingDirective: 'Answer the host directly.',
        openingClaim: 'Stay with the host-state question.',
        supportingReality: ['The host-state question is the actual subject.'],
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: ['Stay with the live dialogue subject.'],
        mustNotDo: ['Do not append screen-status caveats.'],
        confidence: 0.83,
        narrative: ['Visible reply must stay inside the dialogue subject.'],
        updatedAt: 120,
      } as any,
      responseCharter: {
        epistemicMode: 'dialogue-grounded',
        responseMode: 'answer-naturally',
        governingFocus: 'host-state',
        governingConcern: null,
        governingCommitment: null,
        governingInquiry: null,
        governingProject: null,
        latestRevision: null,
        executivePhase: null,
        truthFrame: null,
        mindMode: null,
        relationshipPosture: 'warm',
        emotionalClosureCue: null,
        reasons: ['The live dialogue subject governs the turn.'],
        mustDo: ['Keep the answer current-turn governed.'],
        mustNotDo: ['Do not expose governance labels.'],
      },
      responseSurfaceContract: {
        openingStyle: 'direct-answer',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        activeClosenessContext: 'open-companionship',
        activeClosenessRung: 'warm-near',
        maxParagraphs: 2,
        maxSentences: 4,
        personaKernelMode: 'full',
        allowAffectionatePreface: false,
        allowStageDirections: false,
        allowBodyNarration: false,
        labelCarryAsMemory: false,
        suppressAssociativeRecall: true,
        mustDo: ['Start with the answer immediately.'],
        mustNotDo: ['Do not surface recollection just because it is active internally.'],
      },
    })

    const resolved = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: contract,
        replyRealization: {
          replyRealizationMode: 'fallback-locally-allowed',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          whyProviderMindRequired: null,
        },
        replyExecutionPlan: {
          preferredMode: 'local-fallback',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          reason: 'legacy',
        },
        runtimeSurface: {
          replyAuthority: {
            replyRealizationMode: 'fallback-locally-allowed',
            expectedVisibleReplyAuthority: 'local-deterministic-fallback',
            whyProviderMindRequired: null,
          },
          replyExecutionPlan: {
            preferredMode: 'local-fallback',
            expectedVisibleReplyAuthority: 'local-deterministic-fallback',
            reason: 'legacy-runtime',
          },
        },
        governance: {
          visibleReplyAuthority: 'governed-repair-fallback',
        },
      } as any,
    })

    expect(contract.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(contract.replyRealizationMode).toBe('provider-mind-required')
    expect(resolved.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(resolved.mode).toBe('provider-stream')
  })
})
