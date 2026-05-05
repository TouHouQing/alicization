import { describe, expect, it } from 'vitest'

import { resolveAlicizationPreparedVisibleReplyExecution } from './main-chat-visible-reply-execution'

describe('main-chat-visible-reply-execution', () => {
  it('prefers mind-turn contract authority over legacy reply execution surfaces', () => {
    const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer directly from the current knot.',
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
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          reasons: ['The active knot still governs the turn.'],
          updatedAt: 100,
        },
        replyRealization: {
          replyRealizationMode: 'fallback-locally-allowed',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          whyProviderMindRequired: null,
        },
        replyExecutionPlan: {
          preferredMode: 'local-fallback',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          reason: 'legacy-surface',
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
            reason: 'legacy-runtime-surface',
          },
        },
        governance: {
          visibleReplyAuthority: 'governed-repair-fallback',
        },
      } as any,
    })

    expect(visibleReplyExecution.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(visibleReplyExecution.mode).toBe('provider-stream')
    expect(visibleReplyExecution.providerMindExecuted).toBe(true)
  })

  it('upgrades legacy deterministic normal reply plans to provider-authored rewrite authority', () => {
    const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: null,
        replyRealization: {
          replyRealizationMode: 'fallback-locally-allowed',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          whyProviderMindRequired: null,
        },
        replyExecutionPlan: {
          preferredMode: 'local-fallback',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          reason: 'legacy-normal-fallback',
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
            reason: 'legacy-runtime-normal-fallback',
          },
        },
        governance: {
          visibleReplyAuthority: 'governed-repair-fallback',
        },
      } as any,
    })

    expect(visibleReplyExecution.expectedVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(visibleReplyExecution.mode).toBe('provider-stream')
    expect(visibleReplyExecution.actualVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(visibleReplyExecution.providerMindExecuted).toBe(true)
  })
})
