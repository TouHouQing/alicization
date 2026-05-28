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

  it('requires repair when visible reply outruns same-her lower-pressure opening guidance', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我现在就贴过来陪你，把这件事的靠近感直接拉满。',
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
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: null,
            },
            memory: {
              personStateProjection: {
                contexts: ['focused-work'],
                summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained',
                activeClosenessContext: 'focused-work',
                activeClosenessRung: 'space-first',
                relationshipPosture: 'restrained',
                openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
                preferredProactiveStyle: 'silent-observe',
                preferenceText: 'Lighter touch, more room, less interruption pressure.',
                sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
                repairTriggerText: '',
                burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
                routineText: 'Keep the work window light.',
                trustRationale: 'Trust is warming, but the host still needs room while focused.',
                relationshipDoctrine: 'Observe first, then decide whether closeness is welcome.',
                cautious: true,
                restrained: true,
                personalityContinuityState: {
                  currentRegime: 'focused-work',
                  closenessPosture: 'space-first',
                  repairPosture: 'measured-repair',
                },
              },
              selfEvolution: {
                version: 'self-evolution-kernel-v1',
                updatedAt: 1,
                evolutionMomentum: 0.66,
                learningReadiness: 0.76,
                contradictionPressure: 0.08,
                revisionPressure: 0.14,
                autobiographicalStability: 0.82,
                dominantTrajectory: 'earned lower-pressure companionship timing',
                relationshipDoctrine: 'Leave more room before closeness reopens.',
                latestInflection: 'Even when the opening is real, pressure lands worse than a slower return.',
                burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
                trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
                nextLearningAction: 'internalize',
                nextLearningReason: 'The lower-pressure return is stable enough to become durable.',
                shouldRecord: false,
                shouldReflect: false,
                shouldVerify: false,
                shouldRevise: false,
                shouldInternalize: true,
                activeLearningFocuses: ['internalize-relationship'],
                sourceSignals: ['relationship-learning'],
                summary: 'Lower-pressure return is becoming durable relationship timing.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('opening-guidance-lower-pressure')
    expect(artifact.mustDrop).toContain('same-her opening drift')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('requires repair when memory-labeled familiarity reopens closeness faster than the same-her baseline allows', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我记得我们之前一直都这么亲近，所以这次我也想像以前那样靠近一点，先陪在你身侧。',
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
          answerIntent: 'Let remembered continuity stay explicitly framed as memory while keeping the opening lower-pressure.',
          answerAct: 'care',
          turnMode: 'care',
          responseMode: 'care-with-boundary',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: false,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Hold the same-her baseline while answering with care.',
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
              currentConsciousFrame: null,
            },
            memory: {
              personStateProjection: {
                contexts: ['focused-work'],
                summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained',
                activeClosenessContext: 'focused-work',
                activeClosenessRung: 'space-first',
                relationshipPosture: 'restrained',
                openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
                preferredProactiveStyle: 'silent-observe',
                preferenceText: 'Lighter touch, more room, less interruption pressure.',
                sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
                repairTriggerText: '',
                burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
                routineText: 'Keep the work window light.',
                trustRationale: 'Trust is warming, but the host still needs room while focused.',
                relationshipDoctrine: 'Observe first, then decide whether closeness is welcome.',
                cautious: true,
                restrained: true,
                personalityContinuityState: {
                  currentRegime: 'focused-work',
                  closenessPosture: 'space-first',
                  repairPosture: 'measured-repair',
                },
              },
              selfEvolution: {
                version: 'self-evolution-kernel-v1',
                updatedAt: 1,
                evolutionMomentum: 0.66,
                learningReadiness: 0.76,
                contradictionPressure: 0.08,
                revisionPressure: 0.14,
                autobiographicalStability: 0.82,
                dominantTrajectory: 'earned lower-pressure companionship timing',
                relationshipDoctrine: 'Leave more room before closeness reopens.',
                latestInflection: 'Even when continuity is real, pressure lands worse than a slower return.',
                burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
                trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
                nextLearningAction: 'internalize',
                nextLearningReason: 'The lower-pressure return is stable enough to become durable.',
                shouldRecord: false,
                shouldReflect: false,
                shouldVerify: false,
                shouldRevise: false,
                shouldInternalize: true,
                activeLearningFocuses: ['internalize-relationship'],
                sourceSignals: ['relationship-learning'],
                summary: 'Lower-pressure return is becoming durable relationship timing.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('opening-guidance-lower-pressure')
    expect(artifact.mustDrop).toContain('same-her opening drift')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })
})
