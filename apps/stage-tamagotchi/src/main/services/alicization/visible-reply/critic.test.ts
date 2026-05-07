import { describe, expect, it } from 'vitest'

import {
  buildAlicizationVisibleReplyCriticArtifact,
  shouldForceAlicizationVisibleReplyRepair,
} from './critic'

describe('visible-reply-critic', () => {
  it('passes a compact provider-authored reply that respects the memory gate', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '先把你现在真正卡住的点接住，再看要不要往旧线索里延伸。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        governance: {
          screenReferenceMode: 'avoid',
          liveSurface: 'IntelliJ IDEA',
        },
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'inward-only',
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(artifact.semanticLoopClosed).toBe(true)
    expect(artifact.scores.mindContractCoherence).toBe(1)
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(false)
  })

  it('requires repair for shell opener, unsupported surface detail, and inward-only visible memory leakage', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先直接回答你。我记得你刚才就在 IntelliJ IDEA 里改那个东西，上次也是这样。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        governance: {
          screenReferenceMode: 'avoid',
          liveSurface: 'Finder',
        },
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'inward-only',
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'dialogue-shell-opener',
      'unsupported-surface-specificity',
    ]))
    expect(artifact.reasonCodes.some(code => code.startsWith('visible-memory-gate-violation'))).toBe(true)
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('blocks non-human-authored local fallback on provider-required turns', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: '{"reply":"这句不该被放出来。"}',
      visibleReplyExecution: {
        mode: 'local-fallback',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'local-deterministic-fallback',
        providerMindExecuted: false,
        reason: 'timeout-recovered-local-fallback',
      },
      prepared: {
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.status).toBe('blocked')
    expect(artifact.reasonCodes).toContain('non-human-authored-visible-reply')
    expect(artifact.semanticLoopClosed).toBe(false)
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('requires repair when visible reply does not close the current mind-turn contract', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '嗯。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Explain the current blocker without inventing screen detail.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Explain the blocker.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.semanticLoopClosed).toBe(false)
    expect(artifact.reasonCodes).toContain('mind-contract-not-closed')
    expect(artifact.scores.mindContractCoherence).toBeLessThan(1)
    expect(artifact.mustPreserve).toEqual(expect.arrayContaining([
      'Explain the current blocker without inventing screen detail.',
      'Explain the blocker.',
    ]))
  })

  it('rejects unsupported technical specificity when conscious frame withholds specificity', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '先看 AlicizationRuntimeService.ts 里的 MindTurnContractEnum，这里应该就是问题。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        governance: {
          claimEvidence: {
            forbidUnsupportedSpecificity: true,
            specificityBudget: 'dialogue-only',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('unsupported-surface-specificity')
    expect(artifact.mustDrop).toContain('unsupported-technical-specificity')
  })
})
