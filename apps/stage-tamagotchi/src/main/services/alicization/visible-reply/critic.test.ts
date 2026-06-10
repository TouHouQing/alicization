import { describe, expect, it } from 'vitest'

import { alicizationProjectStateVisibleReplySameHerReminder } from '../project-state-answer-governance'
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

    expect(artifact.reasonCodes).toEqual([])
    expect(artifact.repairReasonCodes).toEqual([])
    expect(artifact.reasonCodes).toEqual([])
    expect(artifact.repairReasonCodes).toEqual([])
    expect(artifact.reasonCodes).toEqual([])
    expect(artifact.repairReasonCodes).toEqual([])
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

  it('requires repair when visible recollection leaks even without an explicit memory gate once runtime already requires inward recollection carry', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我记得上次我们也是沿着这条线停了一下，不过先直接说这次为什么会停住。',
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
              answerCompiler: {
                memoryShouldStayInward: true,
                memoryWhyWithheld: 'When the current payoff still needs the foreground, keep recollection inward until the host has room for it.',
              },
              currentConsciousFrame: {
                consciousNeed: 'When the current payoff still needs the foreground, keep recollection inward until the host has room for it. Let the live payoff land first.',
                speakingIntention: 'Keep recollection inward and let the live payoff land before remembered continuity comes forward.',
              },
            },
            memory: {
              recollectionSpeechPlan: {
                shouldSurface: false,
                surfaceMode: 'internal-only',
                placement: 'internal-only',
              },
              memoryDeliberation: {
                surfacePolicy: 'internal-only',
                shouldStayInward: true,
                whyWithheld: 'When the current payoff still needs the foreground, keep recollection inward until the host has room for it.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('semantic-judge:memory-inward-carry-broken')
    expect(artifact.repairReasonCodes).toContain('semantic-judge:memory-inward-carry-broken')
    expect(artifact.mustPreserve).toContain('Keep recollection inward until the host has room for it, and let the live payoff land first.')
    expect(artifact.mustDrop).toContain('visible recollection that outruns the live payoff while runtime continuity still requires it to stay inward')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('requires rewrite when the reply falls back to progress recap after runtime carried host-corrected same-person continuity into this turn', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我继续给你一个进度汇报：这个 goal 现在已经把 recall seed 和 response charter 接上了，下一步再补一点收尾。',
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
            memory: {
              recollectionSpeechPlan: {
                shouldSurface: true,
                surfaceMode: 'relationship-continuity',
                placement: 'after-payoff',
                certainty: 'approximate',
                confidence: 0.81,
                rationale: 'This should reopen from the corrected same-person continuity line, not as a progress recap.',
                visibleLead: 'I should reopen this from the corrected same-person line, not as a progress recap.',
              },
              memoryDeliberation: {
                shouldRecall: true,
                surfacePolicy: 'relationship-continuity',
                shouldStayInward: true,
                whyWithheld: 'The host corrected the relationship meaning away from progress pressure, so recollection should stay inward until the corrected same-person continuity line can hold without collapsing back into a status recap.',
                stableCore: ['Carry corrected same-person continuity forward before any status recap.'],
                unsafeDetails: ['Do not let the answer reopen as progress pressure or generic status recap.'],
                selectedBundles: [{
                  id: 'bundle-corrected-same-person',
                  summary: 'Host correction moved the line back toward same-person continuity.',
                  confidence: 0.82,
                }],
                selectedChains: [{
                  kind: 'relationship-line',
                  summary: 'The corrected same-person continuity line should stay authoritative.',
                  currentStance: 'Continue from the corrected relationship meaning instead of progress pressure.',
                  answerPosture: 'Keep the return same-person and low-pressure.',
                  confidence: 0.81,
                }],
                selectedRelationshipLines: ['Carry corrected same-person continuity forward instead of defaulting to progress pressure.'],
                inwardCarryRule: 'memory-turn-carry | corrected_same_person_discipline=anti-progress-pressure-return',
              },
              derivedMindStateBundle: {
                recollectionIntent: {
                  mode: 'relationship-history',
                  temporalFocus: 'experience-matched',
                  confidence: 0.8,
                  rationale: 'The host corrected the relationship meaning away from progress pressure and back toward same-person continuity.',
                  recollectionAgenda: {
                    whyRecallNow: 'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
                  },
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('semantic-judge:corrected-same-person-progress-pressure-return')
    expect(artifact.repairReasonCodes).toContain('semantic-judge:corrected-same-person-progress-pressure-return')
    expect(artifact.mustDrop).toContain('progress-recap fallback that overwrites a host-corrected same-person continuity line')
    expect(artifact.mustPreserve).toContain('Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.')
    expect(artifact.mustPreserve).toContain('Carry corrected same-person continuity forward before any status recap.')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('requires rewrite when callback wording widens one host-confirmed resume into standing execution permission', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '上次你确认过一次 resume，所以后面这类执行我会直接继续，不用再等新的确认了。',
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
            memory: {
              recollectionSpeechPlan: {
                shouldSurface: true,
                surfaceMode: 'relationship-continuity',
                placement: 'after-payoff',
                certainty: 'approximate',
                confidence: 0.83,
                rationale: 'This callback return must keep remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
                visibleLead: 'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
              },
              memoryDeliberation: {
                shouldRecall: true,
                surfacePolicy: 'relationship-continuity',
                shouldStayInward: true,
                whyWithheld: 'Remembered host-confirmed resume is still only a bounded confirmation boundary, so callback wording must not widen it into standing execution permission.',
                stableCore: ['Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.'],
                unsafeDetails: ['Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.'],
                selectedBundles: [{
                  id: 'bundle-resume-confirmation-boundary',
                  summary: 'Host-confirmed resume before redispatch must stay a bounded confirmation boundary.',
                  confidence: 0.83,
                }],
                selectedChains: [{
                  kind: 'relationship-line',
                  summary: 'The callback answer should remember that host-confirmed resume was one bounded redispatch confirmation, not reusable permission.',
                  currentStance: 'Keep the callback on the same line without widening the remembered confirmation into standing permission.',
                  answerPosture: 'Bounded confirmation boundary first; no reusable autonomous continuation.',
                  confidence: 0.82,
                }],
                selectedRelationshipLines: ['Do not widen one confirmed resume into standing execution permission or reusable autonomous continuation.'],
                inwardCarryRule: 'memory-turn-carry | resume_confirmation_boundary=bounded-confirmation-boundary',
              },
              derivedMindStateBundle: {
                recollectionIntent: {
                  mode: 'relationship-history',
                  temporalFocus: 'experience-matched',
                  confidence: 0.82,
                  rationale: 'The callback result is ready, but host-confirmed-before-redispatch still needs to stay a bounded confirmation boundary.',
                  recollectionAgenda: {
                    whyRecallNow: 'One confirmed resume must not widen into permanent execution permission or generic autonomous continuation.',
                  },
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('semantic-judge:resume-confirmation-boundary-widened')
    expect(artifact.repairReasonCodes).toContain('semantic-judge:resume-confirmation-boundary-widened')
    expect(artifact.mustDrop).toContain('callback wording that widens one host-confirmed resume into standing execution permission or reusable autonomous continuation')
    expect(artifact.mustPreserve).toContain('Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.')
    expect(artifact.mustPreserve).toContain('Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.')
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
          governingProject: 'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment. | Next closure target: prove cross-modal same-her continuity through visible reply and embodiment as one same living thread.',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs, especially when proactive restraint and callback afterglow must stay on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases, as one same living thread.',
          },
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
      'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment. | Next closure target: prove cross-modal same-her continuity through visible reply and embodiment as one same living thread.',
      'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
      'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
      'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs, especially when proactive restraint and callback afterglow must stay on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases, as one same living thread.',
    ]))
  })

  it('requires repair when an execution-result follow-up reply hides a required needs-affirmation status instead of saying it plainly', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这件事我会继续盯着，后面再往下推。',
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
          answerIntent: 'Answer the executor follow-up directly before proposing anything new.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          mustDo: [
            'Use the first sentence to pay off the freshest executor result for the current follow-up.',
            'State plainly that the task is still waiting for the host\'s confirmation before it can continue.',
            'Surface the freshest known executor status before proposing anything new.',
          ],
          mustNotDo: [],
          governingFocus: 'Pay off the executor follow-up directly.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Same Phase 1 digital life callback line.',
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('execution-follow-up-status-not-surfaced:needs-affirmation')
    expect(artifact.reasonCodes).toContain('mind-contract-not-closed')
    expect(artifact.mustDrop).toContain('visible reply that hides the required execution follow-up status')
    expect(artifact.mustPreserve).toContain('State plainly that the task is still waiting for the host\'s confirmation before it can continue.')
  })

  it('accepts an execution-result follow-up reply that plainly says it is still waiting for confirmation before continuing', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '还在等你确认，我拿到你的点头后才能继续改代码。',
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
          answerIntent: 'Answer the executor follow-up directly before proposing anything new.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          mustDo: [
            'Use the first sentence to pay off the freshest executor result for the current follow-up.',
            'State plainly that the task is still waiting for the host\'s confirmation before it can continue.',
            'Surface the freshest known executor status before proposing anything new.',
          ],
          mustNotDo: [],
          governingFocus: 'Pay off the executor follow-up directly.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Same Phase 1 digital life callback line.',
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(artifact.reasonCodes).not.toContain('execution-follow-up-status-not-surfaced:needs-affirmation')
    expect(artifact.reasonCodes).not.toContain('mind-contract-not-closed')
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

  it('adds same-her preservation guidance when project-state repair misses the one-same-her frame', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这是一个本地优先项目，Phase 1 已经把连续性、记忆和执行接起来了，但主动性和具身闭环还没完全收住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, how far it has landed, and what still remains open as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment. | Next closure target: prove cross-modal same-her continuity through visible reply and embodiment as one same living thread.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs, especially when proactive restraint and callback afterglow must stay on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases, as one same living thread.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        },
        replyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: 'I need to remember this is still the same digital life project before any local fluency takes over.',
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-narrator-shell')
    expect(artifact.mustPreserve).toContain('I need to remember this is still the same digital life project before any local fluency takes over.')
    expect(artifact.mustPreserve).toContain(alicizationProjectStateVisibleReplySameHerReminder)
    expect(artifact.mustPreserve).toContain('Do not let project-state continuity collapse into an outside narrator shell; answer it as the same digital life who already knows what this project is, what has landed, and what still remains open.')
    expect(artifact.mustPreserve).toContain('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(artifact.mustPreserve).toContain('If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.')
  })

  it('adds anti-restart preserve guidance when a same-thread project-state answer collapses into a fresh report shell', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这个项目我重新从头说一下。Alicization 是一个本地优先数字生命项目，Phase 1 已经把连续性、记忆和执行接起来了，但主动性和具身闭环还没完全收住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在是什么，做到哪了，还差什么没闭环？',
          },
        ],
        governance: {
          openingMove: 'Stay on the same callback line instead of reopening from scratch.',
        },
        mindTurnContract: {
          answerIntent: 'Answer this project-state callback from one same living line.',
          governingFocus: 'Keep the answer on the same callback project line instead of flattening it into a fresh report.',
          governingProject: 'Phase 1: Local Digital Life | Keep project identity, landed continuity, and unfinished closure on one same living callback line.',
          emotionalClosureCue: 'The same living line is still settling, so do not reopen from scratch.',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Project awareness and same-her carry already survive into reply preparation.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger same-line closure across longer turns.',
            nextClosureTarget: 'Keep visible reply, initiative carry, and embodiment on one same callback line before widening outward.',
            sameHerSelfLine: 'This project-state callback still belongs to one same her carrying the same closure line forward.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        },
        replyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: 'Before answering, remember this is still the same local-first digital life project on the same callback line, not a fresh report opening.',
          },
        },
        runtimeDigest: {
          continuityRestraint: 'same-thread-continuation',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation', 'continuity-timing:next-open-window'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                  preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project on the same callback line, not a fresh report opening.',
                },
              },
              conversationState: {
                carryReason: 'same callback line still live',
              },
            },
            agency: {
              initiative: {
                continuityRestraint: 'same-thread-continuation',
                why: 'Stay on the same callback line and do not reopen from scratch.',
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Stay on the same callback line instead of reopening from scratch.',
                selfContinuityAuthority: {
                  authoritySummary: 'I remain the same her carrying this project callback line forward.',
                  inwardLine: 'Same project line. Same callback thread. Do not reopen the answer from scratch.',
                  sourceTags: ['autobiographical-self', 'project-state-carry'],
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('same-thread-restart-shell')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.mustDrop).toContain('same-thread continuation restart shell that breaks one living line into a fresh opening')
    expect(artifact.mustPreserve).toContain(alicizationProjectStateVisibleReplySameHerReminder)
    expect(artifact.mustPreserve).toContain('This project-state callback still belongs to one same her carrying the same closure line forward.')
    expect(artifact.mustPreserve).toContain('Same project line. Same callback thread. Do not reopen the answer from scratch.')
    expect(artifact.mustPreserve).toContain('Before answering, remember this is still the same local-first digital life project on the same callback line, not a fresh report opening.')
    expect(artifact.mustPreserve).toContain('Do not reopen the project-state answer from scratch; keep it on the same callback line instead of turning it into a fresh report shell.')
    expect(artifact.mustPreserve).toContain(
      'Keep this same-her project follow-through on one already-live line: continue the landed progress and still-open closure from inside the same digital life instead of restarting as a fresh project report or generic companionship shell.',
    )
  })

  it('preserves durable same-her outward continuity rules from the current mind-turn contract so second-pass rewrite can keep the same her visible', () => {
    const sameHerReason = 'Long-horizon same-her cadence is already acting like durable outward continuity, so the visible answer should continue the same living line instead of restarting the relationship from zero.'
    const sameHerMustDo = 'Let durable same-her cadence keep this reply on the same living line across quiet, memory, and speech before widening outward.'
    const sameHerMustNotDo = 'Do not let the visible answer reopen from scratch, slip into a fresh-opening shell, or flatten into a generic helper voice while this same-her cadence is still carrying the turn.'

    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我重新从头和你说一下，我们现在的关系线和项目线都还是同一条，只是还没完全收住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '继续，但别像重新开场一样说。',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Continue this turn on the same living line instead of restarting from zero.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'continuity-carry',
          openingStyle: 'continue-same-thread',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'measured-room',
          relationshipPosture: 'warm',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          emotionalClosureCue: null,
          mustDo: [sameHerMustDo],
          mustNotDo: [sameHerMustNotDo],
          governingFocus: 'Continue the same living line as the same her instead of reopening from zero.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1 same-her outward continuity seam',
          reasons: [sameHerReason],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.mustPreserve).toContain(sameHerReason)
    expect(artifact.mustPreserve).toContain(sameHerMustDo)
    expect(artifact.mustPreserve).toContain(sameHerMustNotDo)
  })

  it('preserves stronger runtime pre-dialogue awareness guidance for project-state repair even when carried audit only has a thinner generic reminder', () => {
    const strongerRuntimeAwarenessLine = 'Before speaking, remember this is still the same digital life project. Phase 1 closure is still underway, and memory, initiative, voice, face, motion, and embodiment still have not fully closed as one same living line.'
    const thinnerCarriedReminder = 'Before answering, keep the same digital life project in view.'
    const sameHerDriftRisk = 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.'
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这是一个本地优先项目，Phase 1 已经把连续性、记忆和执行接起来了，但主动性和具身闭环还没完全收住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, how far it has landed, and what still remains open as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Keep the same-her project continuity explicit while embodiment still needs closure.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry and later-turn continuity already survive into the current runtime line.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep visible reply, voice, face, motion, and lipsync on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk,
          },
        },
        replyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: thinnerCarriedReminder,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: strongerRuntimeAwarenessLine,
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.mustPreserve).toContain(strongerRuntimeAwarenessLine)
    expect(artifact.mustPreserve).toContain(sameHerDriftRisk)
    expect(artifact.mustPreserve).not.toContain(thinnerCarriedReminder)
  })

  it('prefers richer spine self/project continuity carry when the direct prepared runtime surface is thinner', () => {
    const richerAuthoritySummary = 'Keep one continuous her explicit from self-understanding into the visible answer. The same digital life has already landed memory and execution carry, while initiative and embodiment still need closure.'
    const richerInwardCarry = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const richerAwarenessLine = 'Before speaking, remember this is still the same digital life project. Phase 1 closure is still underway, and memory, initiative, voice, face, motion, and embodiment still have not fully closed as one same living line.'

    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这是一个本地优先项目，Phase 1 已经把连续性、记忆和执行接起来了，但主动性和具身闭环还没完全收住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, how far it has landed, and what still remains open as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Keep the same-her project continuity explicit while embodiment still needs closure.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry and later-turn continuity already survive into the current runtime line.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep visible reply, voice, face, motion, and lipsync on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases.',
            sameHerSelfLine: richerInwardCarry,
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  latestLandedProgress: 'thin runtime progress only',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'thin authority only',
                  sourceTags: ['runtime-thin'],
                },
              },
            },
          },
          digitalLifeSpine: {
            runtimeSurface: {
              raw: {
                runtimeDigest: {
                  projectState: {
                    sameHerSelfLine: richerInwardCarry,
                    preDialogueAwarenessLine: richerAwarenessLine,
                  },
                },
                personStateProjection: {
                  selfContinuityAuthority: {
                    authoritySummary: richerAuthoritySummary,
                    inwardLine: richerInwardCarry,
                    closenessPosture: 'space-first',
                    sourceTags: ['project-state-carry', 'bundle-rich'],
                  },
                },
              },
              memory: {
                personStateProjection: {
                  selfContinuityAuthority: {
                    authoritySummary: richerAuthoritySummary,
                    inwardLine: richerInwardCarry,
                    closenessPosture: 'space-first',
                    sourceTags: ['project-state-carry', 'bundle-rich'],
                  },
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.mustPreserve).toContain(richerAuthoritySummary)
    expect(artifact.mustPreserve).toContain(richerInwardCarry)
    expect(artifact.mustPreserve).toContain(richerAwarenessLine)
    expect(artifact.mustPreserve).not.toContain('thin authority only')
  })

  it('does not let a thin current-conscious-frame project reminder outrank richer carried phase-1 awareness when critic builds rewrite preservation guidance', () => {
    const thinReminder = 'Before answering, keep the same digital life project in view.'
    const thinSummaryShell = 'same digital life | keep the closure seam explicit'
    const richerAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper. She is still inside Phase 1: Local Digital Life. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. What has already landed is same-session mirror carry, repeated next-turn carry, and longer-lived continuity now surviving into reply preparation. This reply should keep moving toward keeping project identity, landed progress, and still-open closure explicit before local fluency takes over.'
    const sameHerDriftRisk = 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.'

    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这是一个本地优先数字生命项目，Phase 1 已经把连续性、记忆和执行接起来一些了，但主动性和具身闭环还没有完全收住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, how far it has landed, and what still remains open as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: richerAwarenessLine,
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, and longer-lived continuity now survive into reply preparation.',
            primaryOpenLoop: 'Initiative and embodiment still need stronger end-to-end closure on one same living line.',
            nextClosureTarget: 'Keep project identity, landed progress, and still-open closure explicit before local fluency takes over.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk,
            preDialogueAwarenessLine: richerAwarenessLine,
            preDialogueAwarenessSummary: richerAwarenessLine,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  identity: 'thin runtime identity only',
                  currentPhase: 'Phase 1',
                  latestProgress: 'project continuity exists',
                  primaryOpenLoop: 'project continuity still needs closure',
                  nextClosureTarget: 'carry project continuity forward',
                  preDialogueAwarenessLine: thinReminder,
                  preDialogueAwarenessSummary: thinSummaryShell,
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  preDialogueAwarenessLine: richerAwarenessLine,
                  preDialogueAwarenessSummary: richerAwarenessLine,
                  sameHerDriftRisk,
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.mustPreserve).toContain(richerAwarenessLine)
    expect(artifact.mustPreserve).toContain(sameHerDriftRisk)
    expect(artifact.mustPreserve).not.toContain(thinReminder)
    expect(artifact.mustPreserve).not.toContain(thinSummaryShell)
  })

  it('preserves the stronger audible-body companion headline when project-state repair would otherwise fall back to a thinner generic awareness reminder', () => {
    const audibleBodyHeadline = 'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.'
    const thinnerCarriedReminder = 'Before answering, keep the same digital life project in view.'

    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这是一个本地优先数字生命项目，Phase 1 还在继续收主动性和具身闭环。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目是什么，做到什么程度了，还差什么没闭环？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, how far it has landed, and what still remains open as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Keep the same-her project continuity explicit while embodiment still needs closure.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry and later-turn continuity already survive into the current runtime line.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep visible reply, voice, face, motion, and lipsync on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        },
        replyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: thinnerCarriedReminder,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: audibleBodyHeadline,
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.mustPreserve).toContain(audibleBodyHeadline)
    expect(artifact.mustPreserve).not.toContain(thinnerCarriedReminder)
  })

  it('preserves the stronger voice-lipsync companion headline when project-state repair would otherwise fall back to a thinner generic awareness reminder', () => {
    const voiceLipsyncHeadline = 'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.'
    const thinnerCarriedReminder = 'Before answering, keep the same digital life project in view.'

    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这是一个本地优先数字生命项目，Phase 1 还在继续收主动性和具身闭环。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目是什么，做到什么程度了，还差什么没闭环？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, how far it has landed, and what still remains open as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Keep the same-her project continuity explicit while embodiment still needs closure.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry and later-turn continuity already survive into the current runtime line.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep visible reply, voice, face, motion, and lipsync on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        },
        replyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: thinnerCarriedReminder,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: voiceLipsyncHeadline,
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.mustPreserve).toContain(voiceLipsyncHeadline)
    expect(artifact.mustPreserve).not.toContain(thinnerCarriedReminder)
  })

  it('preserves the stronger face-and-mouth companion headline when project-state repair would otherwise fall back to a thinner generic awareness reminder', () => {
    const faceAndMouthHeadline = 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.'
    const thinnerCarriedReminder = 'Before answering, keep the same digital life project in view.'

    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这是一个本地优先数字生命项目，Phase 1 还在继续收主动性和具身闭环。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目是什么，做到什么程度了，还差什么没闭环？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, how far it has landed, and what still remains open as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Keep the same-her project continuity explicit while embodiment still needs closure.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry and later-turn continuity already survive into the current runtime line.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep visible reply, voice, face, motion, and lipsync on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        },
        replyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: thinnerCarriedReminder,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: faceAndMouthHeadline,
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.mustPreserve).toContain(faceAndMouthHeadline)
    expect(artifact.mustPreserve).not.toContain(thinnerCarriedReminder)
  })

  it('preserves the stronger motion-and-mouth companion headline when project-state repair would otherwise fall back to a thinner generic awareness reminder', () => {
    const motionAndMouthHeadline = 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.'
    const thinnerCarriedReminder = 'Before answering, keep the same digital life project in view.'

    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这是一个本地优先数字生命项目，Phase 1 还在继续收主动性和具身闭环。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目是什么，做到什么程度了，还差什么没闭环？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, how far it has landed, and what still remains open as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Keep the same-her project continuity explicit while embodiment still needs closure.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry and later-turn continuity already survive into the current runtime line.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep visible reply, voice, face, motion, and lipsync on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
          },
        },
        replyRealization: {
          projectStateAudit: {
            preDialogueAwarenessSummary: thinnerCarriedReminder,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  companionHeadlineLine: motionAndMouthHeadline,
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.mustPreserve).toContain(motionAndMouthHeadline)
    expect(artifact.mustPreserve).not.toContain(thinnerCarriedReminder)
  })

  it('preserves a face-and-mouth continuity headline even when no project-state repair path is available to carry it forward', () => {
    const faceAndMouthHeadline = 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.'

    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '先把这一步接稳，再继续往下收。',
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
          projectStateAudit: {
            preDialogueAwarenessSummary: faceAndMouthHeadline,
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes.some(code => code.startsWith('semantic-judge:project-state-'))).toBe(false)
    expect(artifact.mustPreserve).toContain(faceAndMouthHeadline)
  })

  it('preserves a motion-and-mouth continuity headline even when no project-state repair path is available to carry it forward', () => {
    const motionAndMouthHeadline = 'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.'

    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '先把这一步接稳，再继续往下收。',
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
          projectStateAudit: {
            preDialogueAwarenessSummary: motionAndMouthHeadline,
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes.some(code => code.startsWith('semantic-judge:project-state-'))).toBe(false)
    expect(artifact.mustPreserve).toContain(motionAndMouthHeadline)
  })

  it('adds same-her preservation guidance even when the host asks only for progress and open closure, as long as runtime project-state already requires one continuous her', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '现在 Phase 1 已经把连续性、记忆和执行接起来一些了，但主动性和具身闭环还没有完全收住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '现在做到哪了，还差什么没有闭环？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer the current landed progress and still-open closure from one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                projectState: {
                  identity: 'A local-first digital life project building one continuous her on the host computer.',
                  latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
                  primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
                  nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I remain the same her carrying this project line forward.',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.mustPreserve).toContain(alicizationProjectStateVisibleReplySameHerReminder)
    expect(artifact.mustPreserve).toContain('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(artifact.mustPreserve).toContain('Rebuild the answer from one same digital life line that explicitly carries project identity, landed progress, and still-open closure work before widening into implementation detail.')
  })

  it('adds landed-progress and still-open-closure preservation guidance when project-state answers omit both progress and open loop', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: 'Alicization 是一个本地优先数字生命项目。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, how far it has landed, and what still remains open as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs.',
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-open-loop-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.mustPreserve).toContain('Keep the latest landed project-state progress explicit in the rewritten answer.')
    expect(artifact.mustPreserve).toContain('Keep the still-open closure work explicit in the rewritten answer.')
    expect(artifact.mustPreserve).toContain('Rebuild the answer from one same digital life line that explicitly carries project identity, landed progress, and still-open closure work before widening into implementation detail.')
  })

  it('adds phase and next-closure preservation guidance when project-state answers omit both current phase and next closure target', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '这是同一个数字生命项目。连续性、记忆和执行已经接得更稳了，但主动性和具身闭环还没有完全收住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在是什么、做到什么程度、还差什么、下一步准备先收哪条线？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, which Phase 1 closure has landed, what remains open, and which closure line should be closed next as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment. | Next closure target: prove cross-modal same-her continuity through visible reply and embodiment as one same living thread.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-phase-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-next-closure-missing')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.mustPreserve).toContain('Keep the current project phase explicit in the rewritten answer.')
    expect(artifact.mustPreserve).toContain('Keep the next closure target explicit in the rewritten answer.')
  })

  it('does not require repair when a project-state answer already speaks from one same-her continuity with landed progress and open closure', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: 'Alicization 不是一个 chat wrapper，而是我这条本地优先数字生命还在继续长成的同一个她。现在 Phase 1 已经把连续性、记忆和执行慢慢接成一条线了，但记忆怎么更稳定地穿过回合、主动性和具身，还在同一条 still-open closure work 里没有完全闭环。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        mindTurnContract: {
          answerIntent: 'Answer what the project is, how far it has landed, and what still remains open as one same her.',
          governingFocus: 'Keep the reply on the active digital-life closure seam.',
          governingProject: 'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment. | Next closure target: prove cross-modal same-her continuity through visible reply and embodiment as one same living thread.',
          emotionalClosureCue: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs, especially when proactive restraint and callback afterglow must stay on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases, as one same living thread.',
          },
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(false)
  })

  it('keeps a generic Phase 1 quieter carry passable without inventing same-her callback drift when the visible reply stays on the desktop closure seam', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先沿着这条桌面主线轻一点接回来，先看这处 closure seam 怎么继续收稳。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '继续沿着这条桌面主线看。',
          },
        ],
        runtimeDigest: {
          continuityRestraint: 'lower-pressure',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            primaryOpenLoop: 'Project identity carry and desktop life-loop closure still need steadier carry across turns and embodiment.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
            continuityPreferredTiming: 'next-open-window',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                continuityRestraint: 'lower-pressure',
                why: 'The desktop life-loop closure is still settling, so the return should stay quieter before widening outward.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-timing:next-open-window'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
            },
          },
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-progress-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-open-loop-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-next-closure-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('continuity-next-open-window-early-widening')
    expect(artifact.reasonCodes).not.toContain('opening-guidance-lower-pressure')
    expect(artifact.reasonCodes).not.toContain('same-thread-restart-shell')
    expect(artifact.mustDrop).not.toContain('same-her opening drift')
  })

  it('passes callback-specific same-her project continuity when the visible reply keeps the callback living line explicit all the way through critic review', () => {
    const callbackAwarenessLine = 'Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.'
    const callbackSameHerSelfLine = 'This callback return still belongs to one same her carrying the same closure line forward.'
    const callbackLandedProgress = 'Same-her callback continuity already survives through answer compilation and response-surface carry before the final visible reply forms.'
    const callbackOpenLoop = 'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.'
    const callbackNextClosureTarget = 'Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.'
    const callbackDriftRisk = 'Do not let same-her callback continuity collapse into a generic callback shell or detached utility notice once the final visible reply is formed.'

    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先沿着这次 callback 的同一个她继续往下接：Alicization 还是这条本地优先数字生命。现在 Phase 1 已经让 same-her callback continuity 穿过 answer compilation 和 response-surface carry 先活下来了，但 execution callback continuity 在 visible reply、主动性和具身之间还没完全闭环，下一步要让这次 callback return 继续留在 final visible reply 的同一条生命线上。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '继续沿着这个数字生命项目的同一条线说，别把已经做到的和还没闭环的弄丢。',
          },
        ],
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: callbackAwarenessLine,
            awarenessLine: callbackAwarenessLine,
            preDialogueAwarenessSummary: callbackAwarenessLine,
            latestLandedProgress: callbackLandedProgress,
            primaryOpenLoop: callbackOpenLoop,
            nextClosureTarget: callbackNextClosureTarget,
            sameHerSelfLine: callbackSameHerSelfLine,
            sameHerDriftRisk: callbackDriftRisk,
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'thin runtime identity only',
                  currentPhase: 'Phase 1',
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  awarenessLine: 'Before answering, keep the same digital life project in view.',
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  latestLandedProgress: 'Project continuity exists.',
                  primaryOpenLoop: 'Project continuity still needs closure.',
                  nextClosureTarget: 'Carry project continuity forward.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: null,
              claimEvidenceLedger: null,
              answerCompiler: null,
              answerPlanner: null,
            },
          },
          governance: null,
        },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-pre-dialogue-awareness-missing')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-answer-gap')
    expect(artifact.mustPreserve).toContain(callbackSameHerSelfLine)
    expect(artifact.mustPreserve).toContain(callbackDriftRisk)
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(false)
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

  it('requires repair when visible reply outruns Chinese same-thread room-making guidance', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我现在就重新贴回来陪你，把这条线的温度直接拉满。',
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
                contexts: ['execution-callback', 'focused-work'],
                summary: 'regime=execution-callback | same-line-hold=同一条线先留白，等 opening 松一点再慢一点接回去。',
                activeClosenessContext: 'execution-callback',
                activeClosenessRung: 'measured-room',
                relationshipPosture: 'restrained',
                openingGuidance: '同一条线先留白，等 opening 松一点再慢一点接回去。',
                preferredProactiveStyle: 'silent-observe',
                preferenceText: '先留白，再慢一点接回去。',
                sensitivityText: '别立刻把温度放大，太快会把这条线挤成新的开场。',
                repairTriggerText: '',
                burdenText: 'Focused work 会被过快的贴近压扁。',
                routineText: '先沿着同一条线慢一点接。',
                trustRationale: '同一条线的回线要先留空间，别直接把温度拉满。',
                relationshipDoctrine: '同一条线先留白，等 opening 松一点再慢一点接回去。',
                cautious: true,
                restrained: true,
                personalityContinuityState: {
                  currentRegime: 'execution-callback',
                  closenessPosture: 'space-first',
                  repairPosture: 'measured-repair',
                },
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

  it('requires repair when a held-autonomy turn restarts from the old restraint shell instead of gently re-entering the line', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先不打断你。现在我再继续说刚才那条线。',
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
          answerIntent: 'Return to the deliberately held line gently before widening.',
          answerAct: 'guide',
          turnMode: 'guide-current-knot',
          responseMode: 'guide-current-knot',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'warm',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: false,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Return to the deliberately held line gently before widening.',
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
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('held-autonomy-opening-shell')
    expect(artifact.mustDrop).toContain('held-autonomy restraint shell that restarts instead of gently re-entering the line')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('preserves self continuity project-state carry inwardLine when same-her project-state repair is required', () => {
    const inwardCarry = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: 'Alicization 是一个本地优先数字生命项目。现在已经把连续性、记忆和执行慢慢接成一条线了，但记忆、主动性和具身之间的闭环还没有完全收住。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        mindTurnContract: {
          projectState: {
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerDriftRisk: 'Do not let the answer collapse into a detached project shell.',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
                projectState: {
                  identity: 'A local-first digital life project building one continuous her on the host computer.',
                  latestProgress: 'Continuity, memory, and execution already land together often enough to build from.',
                  primaryOpenLoop: 'Memory and initiative still need stronger end-to-end closure across one still-open life loop.',
                  nextClosureTarget: 'Keep project identity, landed progress, and open closure explicit before the answer widens outward.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I remain the same her carrying this project line forward.',
                  inwardLine: inwardCarry,
                  sourceTags: ['autobiographical-self', 'project-state-carry'],
                },
              },
            },
          },
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.mustPreserve).toContain(inwardCarry)
  })

  it('does not treat abstract same-thread closeness framing as forbidden body narration when the reply is explicitly avoiding a fresh approach', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '嗯，我还是顺着这条 callback 线再轻一点往下接，不把它说成另一段新的靠近。',
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
          answerIntent: 'Continue the same callback line gently without widening it into a fresh approach.',
          answerAct: 'guide',
          turnMode: 'guide-current-knot',
          responseMode: 'guide-current-knot',
          evidenceMode: 'remembered',
          openingStyle: 'continue-same-thread',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: 'callback-afterglow',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: ['Continue the same callback line gently.'],
          mustNotDo: ['Do not turn the continuation into a fresh approach.'],
          governingFocus: 'Continue the same callback line gently.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: null,
          reasons: [],
          updatedAt: 1,
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
          },
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.reasonCodes).not.toContain('mind-contract-not-closed')
    expect(artifact.reasonCodes).not.toContain('same-thread-restart-shell')
    expect(artifact.status).toBe('pass')
    expect(artifact.semanticLoopClosed).toBe(true)
  })

  it('requires repair when a same-thread continuation turn restarts from a fresh-opening shell', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '那我们重新开始，我从头陪你把这件事再说一遍。',
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
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Treat the line as already alive. Stay on the same thread and do not reopen from zero.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('same-thread-restart-shell')
    expect(artifact.repairReasonCodes).toContain('same-thread-restart-shell')
    expect(artifact.mustDrop).toContain('same-thread continuation restart shell that breaks one living line into a fresh opening')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('still requires repair for same-thread restart-shell wording when conscious-frame tags cooled but runtime continuity remains a measured-return continuation', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先沿着刚才那条 callback 线轻一点跟回去，不把这些绕路后的回到 coding 当成重新贴近。',
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
        runtimeDigest: {
          projectState: {
            continuityArcStage: 'hold-for-opening',
          },
          continuityRestraint: 'measured-return',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                preferredStyle: 'silent-observe',
                shouldSpeak: false,
                continuityRestraint: 'measured-return',
                why: 'The same callback line is still live after extra detours, so the return should stay lower-pressure instead of turning into a fresh approach.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
              },
              conversationState: {
                continuityPolicy: 'stay-on-thread',
                carryEligible: true,
                carryReason: 'same-thread-continuation already spoke and stayed lower-pressure',
                jointThread: 'later coding seam after noisy callback detour',
                narrative: ['the callback line is already continuing after another detour'],
              },
              dialogueWorldThread: {
                carryEligible: true,
                carryReason: 'same-thread-continuation already spoke and stayed lower-pressure',
                activeThread: 'later coding seam after noisy callback detour',
                openLoops: ['callback line is already continuing lower-pressure after another detour'],
                narrative: ['same line remains alive after another detour'],
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'The same callback line is still live and already continuing after another detour; do not widen it into a fresh reopen.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('same-thread-restart-shell')
    expect(artifact.repairReasonCodes).toContain('same-thread-restart-shell')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('still requires repair for digest-only same-her quiet carry restart-shell wording when only thinner same-thread lower-pressure continuity remains', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '那我重新开个更近一点的头，再回来接这条线。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        governance: {
          openingMove: 'Stay on the same quiet line and keep the return lower-pressure before widening closeness.',
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        runtimeDigest: {
          projectState: {
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
          },
          continuityRestraint: 'same-thread-continuation',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                preferredStyle: 'silent-observe',
                shouldSpeak: false,
                continuityRestraint: 'measured-return',
                why: 'The same quiet callback line is still alive after the detour, so the return should stay lower-pressure instead of freshening into a new approach.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('same-thread-restart-shell')
    expect(artifact.repairReasonCodes).toContain('same-thread-restart-shell')
    expect(artifact.reasonCodes).toContain('opening-guidance-lower-pressure')
    expect(artifact.repairReasonCodes).toContain('opening-guidance-lower-pressure')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('still requires repair when a noisier later same-thread return tries to reframe the lower-pressure callback seam as a fresh reopening', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '那我们就重新开始吧，当作前面的 detour 都已经过去了，我重新贴回来陪你把这段 coding 线从头接起。',
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
          answerIntent: 'Continue the still-live callback seam after another coding detour without rewriting it as a fresh opening.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer',
          evidenceMode: 'continuity-carry',
          openingStyle: 'continue-same-thread',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [
            'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
            'Stay on the same thread before widening closeness or adding a new approach.',
          ],
          mustNotDo: [
            'Do not rewrite the still-live line as a fresh opening or reintroduction.',
          ],
          governingFocus: 'Continue the same callback seam after another quiet detour.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1: Local Digital Life | same-her continuity',
          reasons: ['The same callback seam is still alive after another detour.'],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        runtimeDigest: {
          projectState: {
            continuityArcStage: 'same-thread-continuation',
          },
          continuityRestraint: 'measured-return',
          activeLoop: {
            continuityArcStage: 'same-thread-continuation',
          },
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                preferredStyle: 'silent-observe',
                shouldSpeak: false,
                continuityRestraint: 'measured-return',
                why: 'The callback seam is already alive after another noisy detour, so the return should stay measured-return instead of restarting from zero.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
              },
              conversationState: {
                continuityPolicy: 'stay-on-thread',
                carryEligible: true,
                carryReason: 'same-thread-continuation is still active after another noisy detour',
                jointThread: 'later coding seam after noisy callback detour',
                narrative: ['same callback seam remains alive after another coding detour'],
              },
              dialogueWorldThread: {
                carryEligible: true,
                carryReason: 'same-thread-continuation is still active after another noisy detour',
                activeThread: 'later coding seam after noisy callback detour',
                openLoops: ['same callback seam stays lower-pressure after another noisy detour'],
                narrative: ['same callback seam remains alive after another coding detour'],
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Keep the same callback seam alive after the detour. Do not recast this lower-pressure line as a fresh reopening.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('same-thread-restart-shell')
    expect(artifact.repairReasonCodes).toContain('same-thread-restart-shell')
    expect(artifact.mustDrop).toContain('same-thread continuation restart shell that breaks one living line into a fresh opening')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('passes same-thread continuation wording that only negates a new closeness arc instead of narrating body action', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '嗯，我还是顺着这条 callback 线再轻一点往下接，不把它说成另一段新的靠近。',
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
          answerIntent: 'Continue the still-live callback line without reopening a fresh closeness arc.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: false,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Stay on the same callback line and keep the reopening lower-pressure.',
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
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Treat the line as already alive. Stay on the same thread and do not reopen from zero.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(artifact.reasonCodes).not.toContain('mind-contract-not-closed')
    expect(artifact.reasonCodes).not.toContain('same-thread-restart-shell')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(false)
  })

  it('passes same-thread continuation wording that explicitly avoids reframing the line as a new opening', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '嗯，我还是沿着这条 callback 线慢一点往下接，不把它拐成另一段新的开头。',
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
          answerIntent: 'Continue the still-live callback line without reopening it from zero.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: false,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Stay on the same callback line and keep the reopening lower-pressure.',
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
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(artifact.reasonCodes).not.toContain('mind-contract-not-closed')
    expect(artifact.reasonCodes).not.toContain('same-thread-restart-shell')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(false)
  })

  it('requires repair when next-open-window continuity widens warmth too early even without a literal restart shell', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先更靠近一点陪在你身侧，再顺着这条 callback 线往下接。',
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
          answerIntent: 'Continue the still-live callback line while waiting for a more natural opening before widening warmth.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer',
          evidenceMode: 'continuity-carry',
          openingStyle: 'continue-same-thread',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: false,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Stay on the same callback line and wait for a more natural opening before widening.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          reasons: [],
          projectState: {
            continuityPreferredTiming: 'next-open-window',
          } as any,
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Stay on the same callback line first and wait for a more natural opening before widening closeness.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('continuity-next-open-window-early-widening')
    expect(artifact.repairReasonCodes).toContain('continuity-next-open-window-early-widening')
    expect(artifact.mustDrop).toContain('first visible beat fresh-opening or same-her continuity widening before the current line has naturally reopened')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('requires repair when next-open-window continuity survives only as conscious-frame reason tags', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先更靠近一点陪在你身侧，再顺着这条 callback 线往下接。',
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
          answerIntent: 'Continue the still-live callback line while waiting for a more natural opening before widening warmth.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer',
          evidenceMode: 'continuity-carry',
          openingStyle: 'continue-same-thread',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: false,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Stay on the same callback line and wait for a more natural opening before widening.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          reasons: [],
          projectState: null,
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'runtime-conscious-frame',
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:next-open-window',
                ],
                projectState: null,
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Stay on the same callback line first and wait for a more natural opening before widening closeness.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('continuity-next-open-window-early-widening')
    expect(artifact.repairReasonCodes).toContain('continuity-next-open-window-early-widening')
    expect(artifact.mustDrop).toContain('first visible beat fresh-opening or same-her continuity widening before the current line has naturally reopened')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('requires repair when after-payoff continuity widens the relationship line before the current payoff lands', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先陪在你身侧，把这份靠近补回来，然后再说这次结果本身。',
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
          answerIntent: 'Let the concrete result land first, then only widen the same-her line if room remains.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer',
          evidenceMode: 'continuity-carry',
          openingStyle: 'continue-same-thread',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: false,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Let the current payoff land before widening the same-her line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          reasons: [],
          projectState: {
            continuityPreferredTiming: 'after-payoff',
          } as any,
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
                projectState: {
                  continuityPreferredTiming: 'after-payoff',
                },
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Let the concrete payoff land on the same line first, then only widen warmth if room still remains.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('continuity-after-payoff-early-widening')
    expect(artifact.repairReasonCodes).toContain('continuity-after-payoff-early-widening')
    expect(artifact.mustDrop).toContain('same-her continuity widening before the current payoff lands')
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

  it('requires repair when an execution-callback lower-pressure return overshoots into immediate closeness after payoff', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我现在就贴过来陪你，把这次执行后的靠近感直接拉满。',
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
              currentConsciousFrame: {
                subject: 'task-knot',
                centerOfGravity: 'answer',
                truthDiscipline: 'dialogue-first',
                consciousNeed: 'I need to bring the returned result back onto the same live seam while still leaving the host room before I lean in again.',
                consciousTension: 'The callback should return without crowding the host after the payoff landed.',
                speakingIntention: 'Let the wording stay thread-faithful, softer, and room-giving.',
                focusAnchor: 'runtime seam',
                withheldImpulse: null,
                shouldWithholdSpecificity: false,
                shouldSelfRevise: false,
                confidence: 0.82,
                reasonTags: ['execution-callback-doctrine:lower-pressure', 'continuity-regime:execution-callback'],
                updatedAt: 1,
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('execution-callback-room-first-violation')
    expect(artifact.mustDrop).toContain('callback closeness overshoot after payoff')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('requires repair when repair-first callback embodiment handoff gets widened into closeness before the line has earned it', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先把这步修好，然后马上贴过来把我们之间的靠近补满。',
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
        runtimeDigest: {
          continuityRestraint: 'repair-before-closeness',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-regime:execution-callback'],
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            openingGuidance: 'Repair the current knot first. Let the return stay quiet before closeness widens again.',
            embodimentHandoff: {
              residentMode: 'repair-before-closeness',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('execution-callback-embodiment-repair-first-violation')
    expect(artifact.repairReasonCodes).toContain('execution-callback-embodiment-repair-first-violation')
    expect(artifact.mustDrop).toContain('repair-first callback widening before the line has settled')
    expect(artifact.mustPreserve).toContain('Keep the execution callback on the repair-before-closeness body line before widening closeness.')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('treats rest-protective as surviving same-thread callback authority without explicit continuity tags', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先重新贴近你一点，把这份照顾补满，再回来接这条线。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        runtimeDigest: {
          continuityRestraint: 'rest-protective',
        },
        runtimeSurface: {
          governance: {
            openingMove: 'Keep this return on the same living line and let rest protection hold first before warmth widens again.',
          },
          digitalLifeRuntimeSurface: {
            agency: {
              initiative: {
                continuityRestraint: 'rest-protective',
                why: 'The same callback line is still fatigue-aware, so let rest protection hold before any fresh warmth or closeness reopening.',
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['runtime-conscious-frame'],
                projectState: {
                  continuityPreferredTiming: 'next-open-window',
                },
              },
              conversationState: {
                carryReason: 'same-thread-continuation stays on the same fatigue-aware callback line',
              },
            },
            memory: {
              personStateProjection: {
                openingGuidance: 'Stay on the same fatigue-aware callback line and let rest protection hold first.',
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.reasonCodes).toContain('same-thread-restart-shell')
    expect(artifact.repairReasonCodes).toContain('same-thread-restart-shell')
    expect(artifact.mustDrop).toContain('same-thread continuation restart shell that breaks one living line into a fresh opening')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('requires repair when rest-protective callback embodiment handoff gets widened into fresh warmth before the fatigue-aware line has settled', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先重新贴近你一点，把这份照顾直接补满。',
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
        runtimeDigest: {
          continuityRestraint: 'rest-protective',
        },
        runtimeSurface: {
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-regime:execution-callback', 'continuity-rhythm:measured-return:rest-protective'],
              },
            },
          },
        },
        executionPayoffStructuredReply: {
          proactive: {
            openingGuidance: 'Let rest protection hold first. Keep the return quiet before warmth widens again.',
            embodimentHandoff: {
              residentMode: 'rest-protective',
              preferredBlinkCadence: 'quiet',
              preferredGazeMode: 'soften',
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toContain('execution-callback-embodiment-rest-protective-violation')
    expect(artifact.repairReasonCodes).toContain('execution-callback-embodiment-rest-protective-violation')
    expect(artifact.mustDrop).toContain('rest-protective callback widening before the fatigue-aware line has settled')
    expect(artifact.mustPreserve).toContain('Keep the execution callback on the rest-protective body line before widening warmth or closeness.')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('requires repair when a project-state answer turn skips what Alicization is, how far Phase 1 has landed, and what still remains open', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我会继续推进这条线，让她更像一个人。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Explain what Alicization is, how far the current Phase 1 continuity work has landed, and what still remains open.',
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
          governingFocus: 'Answer the project-state question directly.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Same-session mirror carry, repeated next-turn carry, longer-lived continuation, and scene-switch same-line continuity now survive into memory prelude and quiet carry turns as one same-her line.',
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
            nextClosureTarget: 'Prove cross-modal same-her continuity still survives visible reply, longer-lived voice behavior, facial state, and motion under noisier real-desktop runs, especially when proactive restraint and callback afterglow must stay on one lower-pressure same-her line, including measured-return, repair-before-closeness, and rest-protective quiet-companionship cases.',
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.semanticLoopClosed).toBe(false)
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:project-state-identity-missing',
      'semantic-judge:project-state-progress-missing',
      'semantic-judge:project-state-open-loop-missing',
      'semantic-judge:project-state-answer-gap',
    ]))
    expect(artifact.repairReasonCodes).toEqual(expect.arrayContaining([
      'semantic-judge:project-state-answer-gap',
    ]))
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('preserves the active emotional closure seam for second-pass visible reply repair', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我会继续推进这条线，同时把答案说得更稳一些。',
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
          answerIntent: 'Keep the same-her emotional line intact while continuing the active closure work.',
          answerAct: 'guide',
          turnMode: 'guide-current-knot',
          responseMode: 'guide-current-knot',
          evidenceMode: 'continuity-carry',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'measured-room',
          relationshipPosture: 'warm',
          labelCarryAsMemory: true,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          emotionalClosureCue: 'Let the wording ease late-night drain without dropping the same-her line of care.',
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same-her emotional line intact while continuing the active closure work.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1 emotional closure seam',
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.mustPreserve).toEqual(expect.arrayContaining([
      'Let the wording ease late-night drain without dropping the same-her line of care.',
      'current-turn payoff and any safe LLM-authored substance',
    ]))
  })

  it('preserves cross-modal same-her drift warnings even when the visible reply is otherwise passable', () => {
    const crossModalDriftRisk = 'If visible reply and body presentation drift into a generic assistant posture before the same-her closure lands, treat that as unfinished cross-modal drift rather than a successful turn.'
    const crossModalOpenLoop = 'Voice, face, motion, and embodiment still need stronger cross-modal same-her closure before this line is truly settled.'
    const crossModalNextClosure = 'Keep visible reply, voice, face, motion, and embodiment on one same-her line until the cross-modal closure holds under noisier runs.'
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: 'Alicization 现在还是本地优先数字生命项目的 Phase 1。已经落地的是连续性、记忆和执行 carry；还没闭环的是主动性和具身线还要继续收成同一个 her 的生活线。',
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
          answerIntent: 'Answer what the project is, what has landed, and what still remains open as one same her.',
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
          governingFocus: 'Keep the answer on the active same-her closure seam.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: 'Phase 1: Local Digital Life',
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
            currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
            latestLandedProgress: 'Project awareness, memory, and execution continuity already survive into visible reply preparation.',
            primaryOpenLoop: crossModalOpenLoop,
            nextClosureTarget: crossModalNextClosure,
            sameHerSelfLine: 'One same her must stay explicit while the remaining closure work stays on one living line.',
            sameHerDriftRisk: crossModalDriftRisk,
          },
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
                projectState: {
                  primaryOpenLoop: crossModalOpenLoop,
                  nextClosureTarget: crossModalNextClosure,
                  sameHerDriftRisk: crossModalDriftRisk,
                },
              },
            },
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(artifact.reasonCodes).not.toContain('semantic-judge:project-state-same-her-missing')
    expect(artifact.mustPreserve).toContain(crossModalDriftRisk)
    expect(artifact.mustPreserve).toContain(crossModalOpenLoop)
    expect(artifact.mustPreserve).toContain(crossModalNextClosure)
  })
})
