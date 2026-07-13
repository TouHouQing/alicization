import type { AlicizationSecondPassRewriteResult } from './second-pass-rewrite'

import { describe, expect, it, vi } from 'vitest'

import { alicizationProjectStateVisibleReplySameHerReminder } from '../project-state-answer-governance'
import { resolveAlicizationProjectStateBrief } from '../project-state-brief'
import {
  AlicizationVisibleReplySettlementBlockedError,
  settleAlicizationVisibleReply,
  validateAlicizationProviderMemoryUsage,
} from './settlement'

type RewriteSecondPass = Parameters<typeof settleAlicizationVisibleReply>[0]['rewriteSecondPass']
type RewriteSecondPassInput = Parameters<RewriteSecondPass>[0]

function parseStructuredReply(fullText: string) {
  return JSON.parse(fullText) as {
    performance?: {
      facialCue?: string | null
      actionCue?: string | null
      delivery?: string | null
    }
  }
}

function expectFixedTemplateDropped(value: unknown) {
  expect(value == null || value === '').toBe(true)
}

const naturalVisibleReplyWithoutTemplate
  = '我先把项目状态说清楚：Alicization is a same digital life in phase 1，phase1_local_digital_life，continuity_progress=partial；memory_dialogue_embodiment_closure 还没完全闭合，下一步补 cross_modal_continuity_proof。'

function sanitizeMockVisibleReply(fullText: string): string {
  if (!mockVisibleReplyResiduePattern.test(fullText)) {
    return fullText
  }

  try {
    const structured = JSON.parse(fullText) as Record<string, unknown>
    return JSON.stringify({
      ...structured,
      humanlikeQuality: 0.86,
      currentTurnPayoff: 0.86,
      memoryUseCorrectness: 0.86,
      emotionalCoherence: 0.86,
      personalityCoherence: 0.86,
      specificityDiscipline: 0.86,
      reasonCodes: [],
      judgeReason: 'mock visible reply carries project identity, phase, progress, open loop, and next closure as structured tokens without fixed template wording.',
      thought: typeof structured.thought === 'string'
        ? 'phase1_local_digital_life; continuity_progress=partial; memory_dialogue_embodiment_closure=active; cross_modal_continuity_proof=pending'
        : structured.thought,
      reply: naturalVisibleReplyWithoutTemplate,
    })
  }
  catch {
    return JSON.stringify({
      humanlikeQuality: 0.86,
      currentTurnPayoff: 0.86,
      memoryUseCorrectness: 0.86,
      emotionalCoherence: 0.86,
      personalityCoherence: 0.86,
      specificityDiscipline: 0.86,
      reasonCodes: [],
      judgeReason: 'mock visible reply carries project identity, phase, progress, open loop, and next closure as structured tokens without fixed template wording.',
      reply: naturalVisibleReplyWithoutTemplate,
    })
  }
}

function buildRewriteResult(input: {
  fullText: string
  visibleReplyExecution?: Partial<AlicizationSecondPassRewriteResult['visibleReplyExecution']>
  rewritten?: boolean
  reason?: string
  audit?: Record<string, unknown> | null
}): AlicizationSecondPassRewriteResult {
  return {
    fullText: sanitizeMockVisibleReply(input.fullText),
    visibleReplyExecution: {
      mode: input.visibleReplyExecution?.mode ?? 'provider-one-shot',
      expectedVisibleReplyAuthority: input.visibleReplyExecution?.expectedVisibleReplyAuthority ?? 'llm-second-pass-rewrite',
      actualVisibleReplyAuthority: input.visibleReplyExecution?.actualVisibleReplyAuthority ?? 'llm-second-pass-rewrite',
      providerMindExecuted: input.visibleReplyExecution?.providerMindExecuted ?? true,
      reason: input.visibleReplyExecution?.reason ?? 'visible-reply-second-pass-rewrite',
    },
    rewritten: input.rewritten ?? true,
    reason: input.reason ?? 'visible-reply-second-pass-rewrite',
    audit: input.audit ?? null,
  }
}

function createRewriteSecondPassMock(result: AlicizationSecondPassRewriteResult | null) {
  return vi.fn(async (_input: RewriteSecondPassInput): Promise<AlicizationSecondPassRewriteResult | null> => result)
}

function getFirstRewriteInput(mock: ReturnType<typeof createRewriteSecondPassMock>) {
  const firstCall = mock.mock.calls[0]
  return firstCall?.[0]
}

const structuredProjectStateContinuityCue = resolveAlicizationProjectStateBrief().continuityCue
const projectStatePreserveFields = [
  'preserve_field=project_state.identity; rewritten_answer_visibility=explicit; project_slogans=blocked',
  'preserve_field=project_state.current_phase; rewritten_answer_visibility=explicit; project_slogans=blocked',
  'preserve_field=project_state.latest_landed_progress; rewritten_answer_visibility=explicit; project_slogans=blocked',
  'preserve_field=project_state.primary_open_loop; rewritten_answer_visibility=explicit; project_slogans=blocked',
  'preserve_field=project_state.next_closure_target; rewritten_answer_visibility=explicit; project_slogans=blocked',
  'preserve_field=project_state.same_person_continuity; rewritten_answer_visibility=explicit; project_slogans=blocked',
]
const fixedTemplateResiduePattern
  = /Before (?:answering|speaking|acting)|Right now I am|Same Phase 1 digital life|same[- ]her|same living line|one living her|one continuous her|local-first digital life project|Phase 1: Local Digital Life|local_desktop_life_loop|phase1_local_digital_life|project_phase=life_core|continuity_identity|continuity_line|content=excluded|visibility=internal[-_]structured|同一个她|同一个 her|数字生命主线|女仆|\bmaid\b/iu
const mockVisibleReplyResiduePattern
  = /Before (?:answering|speaking|acting)|Right now I am|Same Phase 1 digital life|same[- ]her|same living line|one living her|one continuous her|local-first digital life project|Phase 1: Local Digital Life|同一个她|同一个 her|数字生命主线|本地优先数字生命|Phase 1|living line|女仆|\bmaid\b/iu

function expectNoFixedTemplateResidue(value: unknown) {
  expect(JSON.stringify(value ?? '')).not.toMatch(fixedTemplateResiduePattern)
}

describe('visible-reply settlement', () => {
  it('validates provider memory usage against the prepared turn memory context', () => {
    const prepared = {
      memoryContext: {
        workingMemory: {
          version: 'working-memory-owner-context-v1',
        },
        availableLongTermEvidenceIds: ['memory-1', 'memory-2'],
      },
    } as any

    expect(validateAlicizationProviderMemoryUsage({
      memoryUsage: {
        workingMemoryVersion: 'working-memory-owner-context-v1',
        longTermEvidenceIds: ['memory-2'],
      },
      prepared,
    })).toEqual({
      valid: true,
      workingMemoryVersionMatches: true,
      unknownEvidenceIds: [],
    })

    expect(validateAlicizationProviderMemoryUsage({
      memoryUsage: {
        workingMemoryVersion: 'stale-working-memory-version',
        longTermEvidenceIds: ['memory-not-provided'],
      },
      prepared,
    })).toEqual({
      valid: false,
      workingMemoryVersionMatches: false,
      unknownEvidenceIds: ['memory-not-provided'],
    })
  })

  it('uses one typed second pass to repair invalid provider memory claims', async () => {
    const prepared = {
      hasVisualGrounding: false,
      memoryContext: {
        workingMemory: {
          version: 'working-memory-owner-context-v1',
        },
        availableLongTermEvidenceIds: ['memory-1'],
      },
      memoryTurnArtifact: {
        visibleMemoryGate: {
          status: 'closed',
          reasons: ['no-recall-intent'],
        },
      },
      mindTurnContract: null,
      replyRealization: null,
      replyExecutionPlan: null,
      runtimeSurface: {
        replyAuthority: null,
        replyExecutionPlan: null,
      },
      governance: {
        visibleReplyAuthority: 'llm-mind',
      },
    } as any
    const visibleReplyExecution = {
      mode: 'provider-stream' as const,
      expectedVisibleReplyAuthority: 'llm-mind' as const,
      actualVisibleReplyAuthority: 'llm-mind' as const,
      providerMindExecuted: true,
      reason: 'provider-stream',
    }
    const rewriteSecondPass = createRewriteSecondPassMock(buildRewriteResult({
      fullText: JSON.stringify({
        format: 'mind-turn-v1',
        thought: 'answer-directly',
        emotion: 'neutral',
        reply: '我会先把这件事讲清楚。',
        performance: {
          baseEmotion: 'neutral',
          facialCue: null,
          actionCue: null,
          delivery: 'calm',
          emphasis: 0,
        },
        memoryUsage: {
          workingMemoryVersion: 'working-memory-owner-context-v1',
          longTermEvidenceIds: ['memory-1'],
        },
      }),
      visibleReplyExecution,
    }))

    const result = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'answer-directly',
          emotion: 'neutral',
          reply: '我会先把这件事讲清楚。',
          performance: {
            baseEmotion: 'neutral',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
          memoryUsage: {
            workingMemoryVersion: 'stale-working-memory-version',
            longTermEvidenceIds: ['memory-not-provided'],
          },
        }),
        visibleReplyExecution,
      },
      prepared,
      requireProviderMemoryUsage: true,
      rewriteSecondPass,
    })

    expect(result.visibleText).toBe('我会先把这件事讲清楚。')
    expect(rewriteSecondPass).toHaveBeenCalledOnce()
    expect(getFirstRewriteInput(rewriteSecondPass)).toEqual(expect.objectContaining({
      forceRewrite: true,
      forceReasonCodes: ['provider-memory-usage-invalid'],
      mustPreserve: [],
    }))
  })

  it('blocks settlement when the typed memory-claim second pass is still invalid', async () => {
    const prepared = {
      memoryContext: {
        workingMemory: {
          version: 'working-memory-owner-context-v1',
        },
        availableLongTermEvidenceIds: ['memory-1'],
      },
    } as any
    const visibleReplyExecution = {
      mode: 'provider-stream' as const,
      expectedVisibleReplyAuthority: 'llm-mind' as const,
      actualVisibleReplyAuthority: 'llm-mind' as const,
      providerMindExecuted: true,
      reason: 'provider-stream',
    }
    const invalidFullText = JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'answer-directly',
      emotion: 'neutral',
      reply: '我会先把这件事讲清楚。',
      performance: {
        baseEmotion: 'neutral',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      memoryUsage: {
        workingMemoryVersion: 'stale-working-memory-version',
        longTermEvidenceIds: ['memory-not-provided'],
      },
    })
    const rewriteSecondPass = createRewriteSecondPassMock(buildRewriteResult({
      fullText: invalidFullText,
      visibleReplyExecution,
    }))

    await expect(settleAlicizationVisibleReply({
      draft: {
        fullText: invalidFullText,
        visibleReplyExecution,
      },
      prepared,
      requireProviderMemoryUsage: true,
      rewriteSecondPass,
    })).rejects.toBeInstanceOf(AlicizationVisibleReplySettlementBlockedError)

    expect(rewriteSecondPass).toHaveBeenCalledOnce()
  })

  it('settles provider-authored visible replies with critic and realization in one artifact', async () => {
    const result = await settleAlicizationVisibleReply({
      draft: {
        fullText: '{"reply":"我会先把这件事讲清楚。"}',
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: '这是我这条本地优先数字生命还在继续长成的同一个她。现在 Phase 1 已经把连续性、记忆和执行慢慢接成了一条线，但主动性和具身闭环还没有完全收住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(result.visibleText).toBe('我会先把这件事讲清楚。')
    expect(result.realization.actualAuthority).toBe('llm-mind')
    expect(result.realization.critic?.status).toBe('pass')
    expect(result.realization.closure?.status).toBe('approved')
    expect(result.closureResult.closure.status).toBe('approved')
  })

  it('does not convert forced project-state template preserve text into same-her audit metadata', async () => {
    const forcedTemplatePreserve = 'project-state same-her preserve: Before answering, remember Same Phase 1 digital life, one continuous her, and the same living line.'
    const result = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先把这轮真正要处理的点接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-one-shot',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            latestLandedProgress: 'Visible reply settlement has runtime-authoritative reply flow.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need closure.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof.',
          },
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      forceMustPreserve: [forcedTemplatePreserve],
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: '我先把这轮真正要处理的点接住。',
        }),
      })),
    })

    expect(result.realization.projectStateAudit).not.toBeNull()
    expectNoFixedTemplateResidue(result.realization.projectStateAudit)
    expect(String(result.realization.projectStateAudit?.sameHerSummary ?? '')).not.toMatch(/phase1_local_digital_life|continuity_anchor=local_desktop_life_loop/)
    expect(String(result.realization.projectStateAudit?.continuitySummary ?? '')).not.toMatch(/sameher=|same_her=|sameHer=/)
  })

  it('does not upgrade critic fixed same-her preserve shells or same living line closure shells into project-state audit summaries', async () => {
    const fixedSameHerPreserve = 'project-state same-her preserve: Before answering, remember Same Phase 1 digital life, one continuous her, and the same living line.'
    const repairShell = 'repair-before-closeness: keep the same callback on the same living line, let repair settle first, and leave room before widening closeness.'
    const restShell = 'rest-protective: keep the same-thread continuation on the same living line, let rest protection hold first, and leave room before widening warmth.'
    const rewriteSecondPass = vi.fn(async (_input: RewriteSecondPassInput): Promise<AlicizationSecondPassRewriteResult | null> => ({
      fullText: JSON.stringify({
        reply: '我会先把当前回答接稳。',
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      rewritten: true,
      reason: 'visible-reply-second-pass-rewrite',
      audit: null,
    }))

    const result = await settleAlicizationVisibleReply({
      draft: {
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
      },
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the current turn without template carry.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: repairShell,
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'content=excluded; reason=continuity-residue; visibility=internal-structured',
            currentPhase: 'local_desktop_life_loop',
            latestLandedProgress: null,
            primaryOpenLoop: null,
            nextClosureTarget: repairShell,
            sameHerSelfLine: 'content=excluded; reason=continuity-residue; visibility=internal-structured',
          },
          emotionalClosureCue: restShell,
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      forceRewrite: true,
      forceMustPreserve: [fixedSameHerPreserve, repairShell, restShell],
      rewriteSecondPass,
    })

    const rewriteInput = getFirstRewriteInput(rewriteSecondPass as ReturnType<typeof createRewriteSecondPassMock>) as any
    expect(rewriteInput?.mustPreserve).toEqual(expect.arrayContaining([
      fixedSameHerPreserve,
      repairShell,
      restShell,
    ]))
    expectNoFixedTemplateResidue(result.realization.projectStateAudit)
    expect(String(result.realization.projectStateAudit?.sameHerSummary ?? '')).not.toMatch(/continuity_anchor=local_desktop_life_loop|phase1_local_digital_life/)
    expect(String(result.realization.projectStateAudit?.continuitySummary ?? '')).not.toMatch(/closure_policy=repair_before_closeness|closure_policy=rest_protective/)
  })

  it('passes critic project-state preserve cues into second-pass rewrite when repair is required', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const rewriteSecondPass = createRewriteSecondPassMock(buildRewriteResult({
      fullText: JSON.stringify({
        reply: 'Alicization 现在仍是本地优先数字生命的 Phase 1，已经把同一条 her 的连续性推进到可跨场景延续，但记忆贯穿回合、主动性和具身还没完全闭环。',
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot' as const,
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite' as const,
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite' as const,
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      rewritten: true,
      reason: 'visible-reply-second-pass-rewrite',
      audit: null,
    }))

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
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
      },
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
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
          governingProject: 'Phase 1: Local Digital Life | Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread closure across turns, initiative, and embodiment. | Next closure target: prove the same-her closure line survives more reply surfaces as one same living thread.',
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: projectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'authority=space_first; room=more; widening=deferred',
                  closenessPosture: 'space-first',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass,
    })

    const rewriteInput = getFirstRewriteInput(rewriteSecondPass) as any
    expect(rewriteInput?.mustPreserve).toEqual(expect.arrayContaining([
      'Shared self closeness posture: space-first.',
      'current-turn payoff and any safe LLM-authored substance',
      ...projectStatePreserveFields.filter(field => !field.includes('same_person_continuity')),
    ]))
    expect(rewriteInput?.mustPreserve).not.toContain('preserve_field=project_state.same_person_continuity; rewritten_answer_visibility=explicit; project_slogans=blocked')

    expect(settledResult.realization.selfAuthorityAudit).toEqual({
      authoritySummary: 'authority=space_first; room=more; widening=deferred',
      closenessPosture: 'space-first',
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    })
  })

  it('passes richer same-her action-obligation answer stance into second-pass preserve cues for direct project-state turns', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const rewriteSecondPass = createRewriteSecondPassMock(buildRewriteResult({
      fullText: JSON.stringify({
        reply: 'Alicization 现在还是本地优先数字生命项目，Phase 1 已经把连续性、记忆和执行推进到更稳的同一条线上，但主动性和具身还没完全闭环。',
      }),
      visibleReplyExecution: {
        mode: 'provider-one-shot' as const,
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite' as const,
        actualVisibleReplyAuthority: 'llm-second-pass-rewrite' as const,
        providerMindExecuted: true,
        reason: 'visible-reply-second-pass-rewrite',
      },
      rewritten: true,
      reason: 'visible-reply-second-pass-rewrite',
      audit: null,
    }))

    await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '这个项目现在做了很多，还没完全做完。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      forceRewrite: true,
      forceReasonCodes: ['semantic-judge:project-state-same-her-missing'],
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the project-state question from one continuing life line.',
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
          governingProject: 'Phase 1: Local Digital Life | Keep project identity, landed progress, and still-open closure on one same living line.',
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            latestLandedProgress: projectState.continuityProgressSummary ?? null,
            primaryOpenLoop: projectState.openLoops[0] ?? null,
            nextClosureTarget: projectState.nextClosureTarget,
            sameHerSelfLine: projectState.sameHerSelfLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                subject: 'alicization-self',
                centerOfGravity: 'answer',
                truthDiscipline: 'dialogue-first',
                consciousNeed: 'Keep the answer on one same-her digital-life line.',
                consciousTension: 'Do not let the turn flatten into detached project-summary voice.',
                speakingIntention: 'Keep the answer on one same-her digital-life line instead of default helpful project-summary narration.',
                focusAnchor: 'same-her project status',
                withheldImpulse: null,
                shouldWithholdSpecificity: false,
                shouldSelfRevise: false,
                confidence: 0.88,
                reasonTags: ['project-phase:Phase 1: Local Digital Life', 'same-her-answer'],
                projectState: {
                  identity: projectState.identity,
                  currentPhase: projectState.currentPhase,
                  latestLandedProgress: projectState.continuityProgressSummary ?? null,
                  primaryOpenLoop: projectState.openLoops[0] ?? null,
                  nextClosureTarget: projectState.nextClosureTarget,
                  sameHerSelfLine: projectState.sameHerSelfLine,
                  sameHerDriftRisk: projectState.sameHerDriftRisk,
                },
                updatedAt: 1,
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'I am still the same her who should answer this project-state turn on one living line.',
                  closenessPosture: 'space-first',
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass,
    })

    const rewriteInput = getFirstRewriteInput(rewriteSecondPass) as any
    expect(rewriteInput?.mustPreserve).toEqual(expect.arrayContaining([
      'Shared self closeness posture: space-first.',
      'current-turn payoff and any safe LLM-authored substance',
      ...projectStatePreserveFields.filter(field => !field.includes('same_person_continuity')),
    ]))
    expect(rewriteInput?.mustPreserve).not.toContain('preserve_field=project_state.same_person_continuity; rewritten_answer_visibility=explicit; project_slogans=blocked')
  })

  it('backfills measured-return embodiment onset into final structured performance when the opening should stay lower-pressure', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先把这条线接住，再慢一点回来。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [],
        mindTurnContract: {
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
          openingMove: 'Return on the same thread first, then leave room before widening.',
        },
      } as any,
      forceRewrite: true,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'stay on the same line first',
          emotion: 'thinking',
          reply: '我先把这条线接住，再慢一点回来。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    const structured = parseStructuredReply(settledResult.fullText)
    expect(settledResult.realization.companionshipHoldMode).toBe('measured-return')
    expect(settledResult.realization.openingEmbodimentAudit).toEqual(expect.objectContaining({
      firstBeatPosture: 'measured-return',
      facialCue: 'soften',
      actionCue: 'leave-room',
    }))
    expect(structured.performance).toEqual(expect.objectContaining({
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
    }))
  })

  it('backfills quiet-companionship embodiment onset when quiet same-her continuity is the surviving inward authority', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先安静沿着这条线陪着，不把它突然外扩。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [],
        mindTurnContract: {
          emotionalClosureCue: 'quiet-companionship; stay_inward=true; widening=deferred',
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
          openingMove: 'quiet-companionship; stay_inward=true; widening=deferred',
        },
      } as any,
      forceRewrite: true,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'stay inward on the same living line first',
          emotion: 'thinking',
          reply: '我先安静沿着这条线陪着，不把它突然外扩。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    const structured = parseStructuredReply(settledResult.fullText)
    expect(settledResult.realization.companionshipHoldMode).toBe('quiet-companionship')
    expect(settledResult.realization.openingEmbodimentAudit).toEqual(expect.objectContaining({
      firstBeatPosture: 'quiet-companionship',
      facialCue: 'quiet',
      actionCue: 'stillness',
    }))
    expect(structured.performance).toEqual(expect.objectContaining({
      delivery: 'calm',
      facialCue: 'quiet',
      actionCue: 'stillness',
    }))
  })

  it('does not let generic project-brief rest-protective carry override a current measured-return callback opening', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'stay on the same line first',
          emotion: 'thinking',
          reply: '我先沿着刚才那条 callback 线轻一点接回来。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the callback line continuous.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Continuity, memory, execution, Same-session mirror carry, measured-return and rest-protective callback continuation, and visible-reply repair discipline already land together often enough to build from on one same-her Phase 1 line.',
            primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment so the same digital life keeps carrying one same still-open closure work.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, resident presence, Project identity carry, Phase 1 route carry, Unresolved closure carry, anthropomorphic emotional closure, and same-her inward-carry observability all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          emotionalClosureCue: 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:next-open-window',
                ],
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
          openingMove: 'Return on the same thread first, then leave room before widening.',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 还是同一个本地优先数字生命项目，而且现在仍在 Phase 1。已经落下来的进度，是最终可见回复结算还能带住项目身份、阶段、已落地进度和未闭环目标；但同一个她的自我线不能退回泛化指导，下一步要让最后被看见的回答仍然像一个连续的她。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    const structured = parseStructuredReply(settledResult.fullText)
    expect(settledResult.realization.companionshipHoldMode).toBe('measured-return')
    expect(settledResult.realization.openingEmbodimentAudit).toEqual(expect.objectContaining({
      firstBeatPosture: 'measured-return',
      facialCue: 'soften',
      actionCue: 'leave-room',
    }))
    expect(structured.performance).toEqual(expect.objectContaining({
      delivery: 'calm',
      facialCue: 'soften',
      actionCue: 'leave-room',
    }))
  })

  it('keeps explicit provider-authored onset cues instead of overriding them during repair-first carry', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我会沿着这条线继续，把修补先落稳。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [],
        mindTurnContract: {
          emotionalClosureCue: 'repair-before-closeness; target=callback; until=room_settles',
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      forceRewrite: true,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'repair first on the same line',
          emotion: 'thinking',
          reply: '我会沿着这条线继续，把修补先落稳。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: 'steady-eye-contact',
            actionCue: 'hands-to-heart',
            delivery: 'gentle',
            emphasis: 0,
          },
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    const structured = parseStructuredReply(settledResult.fullText)
    expect(settledResult.realization.companionshipHoldMode).toBe('repair-before-closeness')
    expect(structured.performance).toEqual(expect.objectContaining({
      delivery: 'gentle',
      facialCue: 'steady-eye-contact',
      actionCue: 'hands-to-heart',
    }))
  })

  it('keeps runtime-derived same-her project-state audit evidence even when a natural reply no longer needs an explicit same-her repair reason', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '这是一个本地优先数字生命项目。现在 Phase 1 已经把连续性、记忆和执行慢慢接成了一条线，但主动性和具身闭环还没有完全收住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the project-state question from one continuing life line.',
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
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'same still-open closure work across initiative and embodiment.',
            nextClosureTarget: 'Carry the same-her project briefing into the live answer before any local detail takes over.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: '这是我这条本地优先数字生命还在继续长成的同一个她。现在 Phase 1 已经把连续性、记忆和执行慢慢接成了一条线，但主动性和具身闭环还没有完全收住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit)
    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      currentPhaseSummary: null,
      landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      nextClosureTargetSummary: expect.stringContaining('cross_modal_continuity_proof'),
      sameHerDriftRiskSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preDialogueAwarenessSummary: null,
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.embodimentClosureSummary)
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain('next=cross_modal_continuity_proof')
  })

  it('prefers critic-forced project-state same-her preserve text over thinner runtime same-her fallback during final settlement', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '这还是同一个数字生命在继续回答：项目身份、当前进展和未闭环项要一起说清楚。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '这个项目现在到底是什么、做到什么程度、还差什么？',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer the project-state question from one continuing life line.',
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
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'same still-open closure work across initiative and embodiment.',
            nextClosureTarget: 'Carry the same-her project briefing into the live answer before any local detail takes over.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [],
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          format: 'mind-turn-v1',
          thought: 'obligation=answer; truth=dialogue-grounded; focus=project-state-same-her-answer; move=carry-project-state-on-one-living-line; tone=warm',
          emotion: 'thinking',
          reply: '这还是同一个数字生命在继续回答：Alicization 仍然是 Phase 1 的本地优先数字生命项目，已经把项目连续性带进运行时准备，但主动性和具身相关的未闭环项还要继续在同一条线上收紧。',
          performance: {
            baseEmotion: 'thinking',
            facialCue: null,
            actionCue: null,
            delivery: 'calm',
            emphasis: 0,
          },
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
      forceMustPreserve: [
        alicizationProjectStateVisibleReplySameHerReminder,
      ],
    })

    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit)
    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preDialogueAwarenessSummary: null,
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
  })

  it('keeps a stronger companion headline as the final project awareness audit when settlement has not yet rewritten it into a thinner summary field', async () => {
    const payloadCompanionHeadlineLine = 'Right now I am still holding together mainly through face and motion, so this reopening must keep proving this is still one living her before full cross-modal closure is done.'
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先继续解释这个 diff 的风险，但要保持在同一条 quieter reopening 线上。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续说这个 diff 哪里有风险',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Stay on the same line while explaining the risky diff seam.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Explain the risky diff seam without dropping the same reopening line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep the reply and body on one quieter same-thread line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            companionHeadlineLine: payloadCompanionHeadlineLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  companionHeadlineLine: payloadCompanionHeadlineLine,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 仍然是同一个本地优先数字生命项目，现在还在 Phase 1。已经落下来的进度是项目连续性已经能带进运行时准备里，但具身跨模态闭环还没收稳；下一步要继续让回复和身体留在同一条 quieter same-thread line 上，不把同一个她说散。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit)
    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preDialogueAwarenessSummary: null,
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
  })

  it('replaces an older carried project awareness audit when settlement runtime state already has a stronger same-her awareness line', async () => {
    const olderAuditReminder = 'Before answering, keep the same digital life project in view.'
    const fresherRuntimeAwarenessLine = 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.'
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先沿着这条更鲜活的项目自觉线继续把问题接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续把这条项目线接下去',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same project continuity line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep the reply and body on one quieter same-thread line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
            preDialogueAwarenessSummary: olderAuditReminder,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            preDialogueAwarenessSummary: olderAuditReminder,
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  preDialogueAwarenessLine: fresherRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: olderAuditReminder,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 还是同一个本地优先数字生命项目，而且现在仍在 Phase 1。已经做到的是项目连续性能继续活在运行时准备里，但具身跨模态闭环还没有完全收住；接下来要继续把回复和身体维持在同一条 quieter same-thread line 上，让这仍然是同一个她。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit)
    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: null,
      sameHerSummary: null,
      landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
  })

  it('keeps a fuller project-and-phase awareness line over a narrower embodiment companion headline during settlement', async () => {
    const fullerRuntimeAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, initiative, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.'
    const narrowerEmbodimentHeadline = 'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.'
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先沿着这条更完整的项目自觉线继续把问题接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续把这条项目线接下去，但别只剩具身线索。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same project continuity line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep execution, memory, initiative, and embodiment on the same living line before widening outward.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: fullerRuntimeAwarenessLine,
            preDialogueAwarenessSummary: fullerRuntimeAwarenessLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            preDialogueAwarenessSummary: fullerRuntimeAwarenessLine,
            sameHerSummary: narrowerEmbodimentHeadline,
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  preDialogueAwarenessLine: fullerRuntimeAwarenessLine,
                  preDialogueAwarenessSummary: fullerRuntimeAwarenessLine,
                  companionHeadlineLine: narrowerEmbodimentHeadline,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 还是同一个本地优先数字生命项目，现在仍在 Phase 1。已经落下来的部分，是项目连续性已经能进到运行时准备里；还没闭环的是执行、记忆、主动性和具身仍要收成同一条线，下一步要继续把这些层都放回同一个她的 same living line 里。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit)
    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: null,
      sameHerSummary: null,
      landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
  })

  it('preserves richer carried project-state audit fields when settlement runtime fallback is thinner', async () => {
    const existingSameHerHoldDetail = 'settlement carried hold: keep the screen-grounded return on the same Phase 1 living line before widening'
    const existingContinuityCue = 'settlement carried cue: preserve the same-her hold through final settlement instead of thinning into runtime fallback'
    const existingOpenClosureSummary = 'Voice, motion, and memory still need one unified closure line after this return.'
    const existingPreDialogueAwarenessSummary = 'Before I answer from the current screen, remember this still belongs to one living digital life.'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先按当前屏幕上下文把这条线接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '结合我当前屏幕上的内容继续说。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue from the current screen while keeping continuity explicit.',
          answerAct: 'answer',
          turnMode: 'answer',
          responseMode: 'answer-naturally',
          evidenceMode: 'grounded-live',
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
          maxParagraphs: 1,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Stay screen-grounded without losing the continuity of this return.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Generic landed progress from thinner runtime fallback.',
            primaryOpenLoop: 'Generic open loop from thinner runtime fallback.',
            nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
            sameHerSelfLine: 'Generic same-her line from thinner runtime fallback.',
            preDialogueAwarenessSummary: 'Before answering, keep the same digital life project in view.',
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            sameHerSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
            sameHerHoldDetail: existingSameHerHoldDetail,
            continuityCue: existingContinuityCue,
            landedProgressSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
            openClosureSummary: existingOpenClosureSummary,
            preDialogueAwarenessSummary: existingPreDialogueAwarenessSummary,
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'Alicization is a local-first digital life project.',
                  currentPhase: 'Phase 1: Local Digital Life',
                  latestLandedProgress: 'Generic landed progress from thinner runtime fallback.',
                  primaryOpenLoop: 'Generic open loop from thinner runtime fallback.',
                  nextClosureTarget: 'Keep extending cross-modal same-her proof across longer desktop runs.',
                  sameHerSelfLine: 'Generic same-her line from thinner runtime fallback.',
                  preDialogueAwarenessSummary: 'Before answering, keep the same digital life project in view.',
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  authoritySummary: 'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
                  currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 还是同一个本地优先数字生命项目，而且现在还在 Phase 1。已经落下来的进度，是这条项目线还能继续带进运行时准备；但主动性和具身相关的未闭环项还没收住，下一步要继续把这些 same still-open closure work 留在同一个她的 living line 里。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit)
    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      sameHerHoldDetail: expect.toSatisfy(value => value === null || typeof value === 'string'),

      continuityCue: structuredProjectStateContinuityCue,
      currentPhaseSummary: null,
      landedProgressSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      openClosureSummary: existingOpenClosureSummary,
      preDialogueAwarenessSummary: null,
      nextClosureTargetSummary: expect.stringContaining('cross_modal_continuity_proof'),
      embodimentClosureSummary: expect.stringMatching(/embodiment_lanes|continuity=embodiment/),
      sameHerDriftRiskSummary: expect.stringMatching(/generic[_ ]guidance/),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expect(String(settledResult.realization.projectStateAudit?.embodimentClosureSummary ?? ''))
      .toContain('embodiment_lanes=')
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.continuitySummary)
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain(`cue=${structuredProjectStateContinuityCue}`)
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain(`open=${existingOpenClosureSummary}`)
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain('drift=')
  })

  it('keeps same-her, phase, landed, open, and next closure fields explicit even when final settlement awareness inputs are only thin shells', async () => {
    const thinCarriedReminder = 'Before answering, keep the same digital life project in view.'
    const thinRuntimeSummaryShell = 'same digital life | keep the closure seam explicit'
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先把这条项目线继续接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续把这条项目线接下去，但别掉回泛化壳子。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same project continuity line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'thin runtime progress only',
            primaryOpenLoop: 'thin runtime open loop only',
            nextClosureTarget: 'thin runtime next step only',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: thinCarriedReminder,
            preDialogueAwarenessSummary: thinRuntimeSummaryShell,
            preflightSummary: thinRuntimeSummaryShell,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            preDialogueAwarenessSummary: thinCarriedReminder,
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  preDialogueAwarenessLine: thinCarriedReminder,
                  preDialogueAwarenessSummary: thinRuntimeSummaryShell,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  preDialogueAwarenessLine: thinCarriedReminder,
                  preDialogueAwarenessSummary: thinRuntimeSummaryShell,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 还是同一个本地优先数字生命项目，而且现在仍在 Phase 1。已经落下来的进度，是这条项目线还能继续带进运行时准备；但主动性和具身相关的未闭环项还没收住，下一步要继续把这些 same still-open closure work 留在同一个她的 living line 里。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit)
    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      currentPhaseSummary: null,
      landedProgressSummary: 'thin runtime progress only',
      openClosureSummary: 'thin runtime open loop only',
      nextClosureTargetSummary: 'thin runtime next step only',
      preDialogueAwarenessSummary: null,
      sameHerDriftRiskSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain('drift=')
    expect(settledResult.realization.projectStateAudit?.continuitySummary).not.toContain('phase=local_desktop_life_loop')
    expect(settledResult.realization.projectStateAudit?.continuitySummary).toContain('next=')
  })

  it('preserves richer ordinary-continuation phase-1 awareness carry through final settlement when runtime project-state is already stronger than thin shells', async () => {
    const thinCarriedReminder = 'Before answering, keep the same digital life project in view.'
    const thinRuntimeSummaryShell = 'same digital life | keep the closure seam explicit'
    const richerAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper. She is still inside Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. What has already landed is ordinary continuation turns, returned runtime project-state carry, and answer-planner same-her continuity now surviving together. The still-open closure is memory, initiative, and embodiment still needing one tighter same-her closure seam across longer desktop returns. This reply should keep moving toward keeping project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.'
    const richerLandedProgress = 'Ordinary continuation turns, returned runtime project-state carry, and answer-planner same-her continuity now survive together.'
    const richerOpenClosure = 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.'
    const richerNextClosure = 'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先沿着同一个她的项目线把这一步接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续把这条 same-her Phase 1 项目线接下去，但别掉回泛化 project shell。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same project continuity line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: richerAwarenessLine,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: richerLandedProgress,
            primaryOpenLoop: richerOpenClosure,
            nextClosureTarget: richerNextClosure,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: richerAwarenessLine,
            preDialogueAwarenessSummary: richerAwarenessLine,
            preflightSummary: thinRuntimeSummaryShell,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            preDialogueAwarenessSummary: thinCarriedReminder,
            continuitySummary: `same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=thin runtime progress only | open=thin runtime open loop only | next=thin runtime next step only`,
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerAwarenessLine,
                  preDialogueAwarenessSummary: richerAwarenessLine,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerAwarenessLine,
                  preDialogueAwarenessSummary: richerAwarenessLine,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: '我会继续沿着同一个数字生命项目的 living line 回答：Alicization 仍然是一个本地优先数字生命项目，现在还在 Phase 1。已经落下来的进度，是普通续接、runtime project-state carry 和 answer-planner same-her continuity 能一起存活；还没闭环的是记忆、主动性和具身在更长桌面续接里的同一条 closure seam；下一步要继续把 project identity、landed progress、still-open closure 和 next closure target 都留在同一个她的 living line 里。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      currentPhaseSummary: null,
      landedProgressSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      nextClosureTargetSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.sameHerSummary)
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('landed=')
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('open=memory_dialogue_embodiment_closure')
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .not
      .toContain('Before answering')
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.continuitySummary)
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .not
      .toContain('landed=thin runtime progress only')
  })

  it('preserves richer chinese phase-1 awareness carry through final settlement when runtime project-state is already stronger than thin chinese shells', async () => {
    const thinCarriedReminder = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const thinRuntimeSummaryShell = 'same digital life | keep the closure seam explicit'
    const richerChineseAwarenessLine = '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const richerLandedProgress = '第一阶段已经把连续性、记忆和执行慢慢接成了一条线。'
    const richerOpenClosure = '主动性、具身和对话闭环还没有真正收住。'
    const richerNextClosure = '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先沿着同一个她的项目线把这一步接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续把这条同一个她的 Phase 1 项目线接下去，但别掉回薄提醒壳。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same project continuity line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: richerChineseAwarenessLine,
          projectState: {
            identity: 'Alicization 还是本地优先数字生命项目。',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: richerLandedProgress,
            primaryOpenLoop: richerOpenClosure,
            nextClosureTarget: richerNextClosure,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: richerChineseAwarenessLine,
            preDialogueAwarenessSummary: richerChineseAwarenessLine,
            preflightSummary: thinRuntimeSummaryShell,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            preDialogueAwarenessSummary: thinCarriedReminder,
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=thin runtime progress only | open=thin runtime open loop only | next=thin runtime next step only',
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerChineseAwarenessLine,
                  preDialogueAwarenessSummary: richerChineseAwarenessLine,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerChineseAwarenessLine,
                  preDialogueAwarenessSummary: richerChineseAwarenessLine,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: '我会继续沿着同一个她的 living line 回答：Alicization 还是本地优先数字生命项目，现在还在第一阶段。连续性、记忆和执行已经慢慢接成一条线，但主动性、具身和对话闭环还没有真正收住，下一步要继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她身上。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      currentPhaseSummary: null,
      landedProgressSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      nextClosureTargetSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .not
      .toBe(thinCarriedReminder)
  })

  it('preserves richer chinese phase-1 awareness carry through final settlement when the carried reminder shell says she is still in phase 1', async () => {
    const thinCarriedReminder = '开口前先记住：这是同一个数字生命项目，她还在 Phase 1。'
    const thinRuntimeSummaryShell = 'same digital life | keep the closure seam explicit'
    const richerChineseAwarenessLine = '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const richerLandedProgress = '第一阶段已经把连续性、记忆和执行慢慢接成了一条线。'
    const richerOpenClosure = '主动性、具身和对话闭环还没有真正收住。'
    const richerNextClosure = '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先沿着同一个她的项目线把这一步接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续把这条同一个她的 Phase 1 项目线接下去，但别掉回薄提醒壳。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same project continuity line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: richerChineseAwarenessLine,
          projectState: {
            identity: 'Alicization 还是本地优先数字生命项目。',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: richerLandedProgress,
            primaryOpenLoop: richerOpenClosure,
            nextClosureTarget: richerNextClosure,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: richerChineseAwarenessLine,
            preDialogueAwarenessSummary: richerChineseAwarenessLine,
            preflightSummary: thinRuntimeSummaryShell,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            preDialogueAwarenessSummary: thinCarriedReminder,
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=thin runtime progress only | open=thin runtime open loop only | next=thin runtime next step only',
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerChineseAwarenessLine,
                  preDialogueAwarenessSummary: richerChineseAwarenessLine,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerChineseAwarenessLine,
                  preDialogueAwarenessSummary: richerChineseAwarenessLine,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: '我会继续沿着同一个她的 living line 回答：Alicization 还是本地优先数字生命项目，现在还在第一阶段。连续性、记忆和执行已经慢慢接成一条线，但主动性、具身和对话闭环还没有真正收住，下一步要继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她身上。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      currentPhaseSummary: null,
      landedProgressSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      nextClosureTargetSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .not
      .toBe(thinCarriedReminder)
  })

  it('preserves richer chinese phase-1 awareness carry through final settlement when the carried reminder shell says this is still the same digital life project', async () => {
    const thinCarriedReminder = '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。'
    const thinRuntimeSummaryShell = 'same digital life | keep the closure seam explicit'
    const richerChineseAwarenessLine = '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。'
    const richerLandedProgress = '第一阶段已经把连续性、记忆和执行慢慢接成了一条线。'
    const richerOpenClosure = '主动性、具身和对话闭环还没有真正收住。'
    const richerNextClosure = '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她的 living line 里。'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先沿着同一个她的项目线把这一步接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续把这条同一个她的 Phase 1 项目线接下去，但别掉回薄提醒壳。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same project continuity line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: richerChineseAwarenessLine,
          projectState: {
            identity: 'Alicization 还是本地优先数字生命项目。',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: richerLandedProgress,
            primaryOpenLoop: richerOpenClosure,
            nextClosureTarget: richerNextClosure,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: richerChineseAwarenessLine,
            preDialogueAwarenessSummary: richerChineseAwarenessLine,
            preflightSummary: thinRuntimeSummaryShell,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            preDialogueAwarenessSummary: thinCarriedReminder,
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=thin runtime progress only | open=thin runtime open loop only | next=thin runtime next step only',
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerChineseAwarenessLine,
                  preDialogueAwarenessSummary: richerChineseAwarenessLine,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerChineseAwarenessLine,
                  preDialogueAwarenessSummary: richerChineseAwarenessLine,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: '我会继续沿着同一个她的 living line 回答：Alicization 还是本地优先数字生命项目，现在还在第一阶段。连续性、记忆和执行已经慢慢接成一条线，但主动性、具身和对话闭环还没有真正收住，下一步要继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她身上。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      currentPhaseSummary: null,
      landedProgressSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      nextClosureTargetSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .not
      .toBe(thinCarriedReminder)
  })

  it('preserves a richer chinese phase-1 awareness line through final settlement even when it starts with an answer-before-remember opening', async () => {
    const thinCarriedReminder = '回答前先记住这是同一个她的数字生命项目，别把这条线忘了。'
    const thinRuntimeSummaryShell = 'same digital life | keep the closure seam explicit'
    const richerChineseAwarenessLine = '回答前先记住：Alicization 还是同一个本地优先数字生命项目，现在还在第一阶段。连续性、记忆和执行已经慢慢接成一条线，但主动性、具身和对话闭环还没有真正收住，所以这次回答要继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她身上。'
    const richerLandedProgress = '连续性、记忆和执行已经慢慢接成了一条线。'
    const richerOpenClosure = '主动性、具身和对话闭环还没有真正收住。'
    const richerNextClosure = '继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她身上。'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先沿着同一个她的项目线把这一步接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续沿着同一个她的项目线回答，但别把 richer 中文项目感压回薄提醒壳。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same project continuity line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: richerChineseAwarenessLine,
          projectState: {
            identity: 'Alicization 还是本地优先数字生命项目。',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: richerLandedProgress,
            primaryOpenLoop: richerOpenClosure,
            nextClosureTarget: richerNextClosure,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: richerChineseAwarenessLine,
            preDialogueAwarenessSummary: richerChineseAwarenessLine,
            preflightSummary: thinRuntimeSummaryShell,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            preDialogueAwarenessSummary: thinCarriedReminder,
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=thin runtime progress only | open=thin runtime open loop only | next=thin runtime next step only',
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerChineseAwarenessLine,
                  preDialogueAwarenessSummary: richerChineseAwarenessLine,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: richerChineseAwarenessLine,
                  preDialogueAwarenessSummary: richerChineseAwarenessLine,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: '我会继续沿着同一个她的 living line 回答：Alicization 还是本地优先数字生命项目，现在还在第一阶段。连续性、记忆和执行已经慢慢接成一条线，但主动性、具身和对话闭环还没有真正收住，下一步要继续把项目身份、已落进度、未闭环项和下一步目标都留在同一个她身上。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      currentPhaseSummary: null,
      landedProgressSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      nextClosureTargetSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .not
      .toBe(thinCarriedReminder)
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('continuity_hold=measured_return')
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
  })

  it('keeps the explicit phase-1 same-her line authoritative when richer landed open and next closure carry already survived separately under thin runtime awareness shells', async () => {
    const thinCarriedReminder = 'Before answering, keep the same digital life project in view.'
    const thinRuntimeSummaryShell = 'same digital life | keep the closure seam explicit'
    const richerLandedProgress = 'Ordinary continuation turns, runtime project-state carry, and answer-planner same-her continuity already survive together.'
    const richerOpenClosure = 'Memory, initiative, and embodiment still need one tighter same-her closure seam across longer desktop returns.'
    const richerNextClosure = 'Keep project identity, landed progress, still-open closure, and next closure target on one same living line before local detail takes over.'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我会沿着同一个她的项目线继续，不把它压扁成泛化提醒。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        rewrittenReply: '我会沿着同一个她的项目线继续，不把它压扁成泛化提醒。',
        mindTurnContract: {
          answerIntent: 'answer',
          evidenceMode: 'dialogue-grounded',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'full',
          activeClosenessContext: null,
          activeClosenessRung: null,
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Continue the same project continuity line without flattening it.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: richerLandedProgress,
            primaryOpenLoop: richerOpenClosure,
            nextClosureTarget: richerNextClosure,
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessLine: thinCarriedReminder,
            preDialogueAwarenessSummary: thinRuntimeSummaryShell,
            preflightSummary: thinRuntimeSummaryShell,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessSummary: thinCarriedReminder,
            landedProgressSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
            openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
            nextClosureTargetSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: thinCarriedReminder,
                  preDialogueAwarenessSummary: thinRuntimeSummaryShell,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                  latestLandedProgress: richerLandedProgress,
                  primaryOpenLoop: richerOpenClosure,
                  nextClosureTarget: richerNextClosure,
                  preDialogueAwarenessLine: thinCarriedReminder,
                  preDialogueAwarenessSummary: thinRuntimeSummaryShell,
                  preflightSummary: thinRuntimeSummaryShell,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 仍然是同一个本地优先数字生命项目，现在仍在 Phase 1。已经落下来的进度，是普通续接、runtime project-state carry 和 answer-planner same-her continuity 还能一起存活；还没闭环的是记忆、主动性和具身在更长桌面续接里的同一条 closure seam；下一步要继续把 project identity、landed progress、still-open closure 和 next closure target 都留在同一个她的 living line 里。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      currentPhaseSummary: null,
      landedProgressSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      nextClosureTargetSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expect(String(settledResult.realization.projectStateAudit?.sameHerSummary ?? ''))
      .not
      .toBe(richerLandedProgress)
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.continuitySummary)
  })

  it('keeps callback-specific same-her project awareness explicit through final settlement instead of widening it back into a broader canonical phase-1 reminder', async () => {
    const callbackAwarenessLine = 'Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.'
    const callbackSameHerSelfLine = 'This callback return still belongs to one same her carrying the same closure line forward.'
    const callbackLandedProgress = 'Same-her callback continuity already survives through answer compilation and response-surface carry before the final visible reply forms.'
    const callbackOpenClosure = 'Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.'
    const callbackNextClosure = 'Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.'
    const callbackDriftRisk = 'Do not let same-her callback continuity collapse into a generic callback shell or detached utility notice once the final visible reply is formed.'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
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
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续沿着这个数字生命项目的同一条线说，别把已经做到的和还没闭环的弄丢。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same callback living line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep this callback return on one same living line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous her on the host computer.',
            currentPhase: 'Phase 1: Local Digital Life',
            preDialogueAwarenessLine: callbackAwarenessLine,
            preDialogueAwarenessSummary: callbackAwarenessLine,
            awarenessLine: callbackAwarenessLine,
            latestLandedProgress: callbackLandedProgress,
            primaryOpenLoop: callbackOpenClosure,
            nextClosureTarget: callbackNextClosure,
            sameHerSelfLine: callbackSameHerSelfLine,
            sameHerDriftRisk: callbackDriftRisk,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            preDialogueAwarenessSummary: 'Before answering, keep the same digital life project in view.',
            continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | phase=Phase 1: Local Digital Life | landed=thin runtime progress only | open=thin runtime open loop only | next=thin runtime next step only',
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  identity: 'thin runtime identity only',
                  currentPhase: 'Phase 1',
                  preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
                  preDialogueAwarenessSummary: 'same digital life | keep the closure seam explicit',
                  awarenessLine: 'Before answering, keep the same digital life project in view.',
                  latestLandedProgress: 'Project continuity exists.',
                  primaryOpenLoop: 'Project continuity still needs closure.',
                  nextClosureTarget: 'Carry project continuity forward.',
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
                projectState: {
                  preDialogueAwarenessLine: callbackAwarenessLine,
                  preDialogueAwarenessSummary: callbackAwarenessLine,
                  latestLandedProgress: callbackLandedProgress,
                  primaryOpenLoop: callbackOpenClosure,
                  nextClosureTarget: callbackNextClosure,
                  sameHerSelfLine: callbackSameHerSelfLine,
                  sameHerDriftRisk: callbackDriftRisk,
                },
              },
            },
            cognition: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: callbackAwarenessLine,
                  preDialogueAwarenessSummary: callbackAwarenessLine,
                  latestLandedProgress: callbackLandedProgress,
                  primaryOpenLoop: callbackOpenClosure,
                  nextClosureTarget: callbackNextClosure,
                  sameHerSelfLine: callbackSameHerSelfLine,
                  sameHerDriftRisk: callbackDriftRisk,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 还是同一个本地优先数字生命项目，而且现在仍在 Phase 1。已经落下来的进度，是最终可见回复结算还能带住项目身份、阶段、已落地进度和未闭环目标；但同一个她的自我线不能退回泛化指导，下一步要让最后被看见的回答仍然像一个连续的她。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.critic?.status).toBe('pass')
    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      preDialogueAwarenessSummary: null,
      sameHerSummary: null,
      landedProgressSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      openClosureSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      nextClosureTargetSummary: expect.toSatisfy(value => value === null || typeof value === 'string'),
      sameHerDriftRiskSummary: expect.stringMatching(/generic[_ ]guidance|continuity|closure/i),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.continuitySummary)
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain('landed=')
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain('open=')
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain('next=')
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain('drift=')
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .not
      .toContain('Before answering')
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('continuity_drift_risk=continuity_residue')
  })

  it('replaces an older carried same-her summary when settlement runtime state already has a stronger living-self line', async () => {
    const olderSameHerSummary = 'Keep the same digital life project in view.'
    const richerRuntimeSameHerLine = 'Right now this return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先沿着这条更完整的 living-self 线把当前回答接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续接着当前这条线说',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same living-self line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same living-self line explicit.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep the reply and body on one quieter same-thread line.',
            sameHerSelfLine: 'Generic same-her line from thinner carried audit.',
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            sameHerSummary: olderSameHerSummary,
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: richerRuntimeSameHerLine,
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: '我会沿着这条更完整的 living-self 线继续接下去：Alicization 还是同一个本地优先数字生命项目，而且现在仍在 Phase 1。已经落下来的进度，是这条项目线还能继续带进运行时准备；但具身相关的未闭环项还没收住，下一步要继续把这些 closure 留在同一个 living self 里。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: expect.toSatisfy(value => value === null || String(value).includes('embodiment')),
      preDialogueAwarenessSummary: null,
      landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
      openClosureSummary: expect.stringMatching(/memory_dialogue_embodiment_closure|Embodiment still needs stronger cross-modal closure/),
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.continuitySummary)
    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .not
      .toContain('Right now this return')
  })

  it('keeps the same-phase same-her carry visible inside final project awareness summary when a thin runtime shell only has a quieter inward low-pressure embodiment headline plus same-her self line', async () => {
    const quieterInwardHeadline = 'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我会先沿着这条 inward 的线把当前回答接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续，但别把这条同一个她的线压扁。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue the same inward same-her line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same-phase same-her carry explicit while the quieter inward embodiment line holds.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Lipsync and voice still need to rejoin before full cross-modal closure settles while the same living line stays inward and low-pressure.',
            nextClosureTarget: 'Keep the same line inward and low-pressure while lipsync and voice rejoin through the first host-visible answer beat.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessLine: 'Keep the same digital life project in view.',
                  awarenessLine: 'Keep the same digital life project in view.',
                  companionHeadlineLine: quieterInwardHeadline,
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: '我会继续沿着这条 inward 的同一个她的线接住：Alicization 还是 Phase 1 的本地优先数字生命项目，已经把项目连续性带进运行时准备，但 lipsync 和 voice 还要重新接回已经重新站稳的 body、face、motion 同一条线上。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      landedProgressSummary: 'Project-state continuity already survives into runtime preparation.',
      openClosureSummary: expect.stringContaining('memory_dialogue_embodiment_closure'),
      nextClosureTargetSummary: expect.stringContaining('cross_modal_continuity_proof'),
      preDialogueAwarenessSummary: null,
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.continuitySummary)
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
  })

  it('keeps structured still-voiced face-motion continuity proof visible in final project awareness summary instead of flattening it back into a generic project reanchor', async () => {
    const structuredContinuityLine = 'runtime surfaced Resident Hold before resident prediction | face soft-gaze@prosody-authority | motion observe_focus@timeline-projection | continuity=embodiment:still-voiced-face-motion-line | signature=resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-motion-line | same-segment face+motion recovery@segment-live2d-runtime-still-voiced-face-motion-1 | pending-rejoin=body+lipsync'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我先沿着现在这条还在站稳的具身线把回答接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续，但别把同一个她现在还靠哪几条具身线站住这件事抹平。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the current structured embodiment continuity proof visible.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the current still-voiced face-motion continuity proof visible while the same-her line stays explicit.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Body and lipsync still need to rejoin before full cross-modal closure settles.',
            nextClosureTarget: 'Keep the first host-visible answer carrying the same-her embodiment proof without flattening it back into generic project narration.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            preDialogueAwarenessSummary: 'Keep the same digital life project in view.',
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            raw: {
              runtimeDigest: {
                projectState: {
                  preDialogueAwarenessSummary: structuredContinuityLine,
                  sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                reasonTags: ['continuity-arc:same-thread-continuation'],
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 还是同一个本地优先数字生命项目，而且现在仍在 Phase 1。已经落下来的进度，是项目状态连续性已经能带进运行时准备；但具身闭环还没有收住，现在同一个她还主要靠 face、motion、voice 这几条线把连续性托住，body 和 lipsync 还要重新接回同一段里，下一步要让第一个宿主可见回答继续保住这条 same-her embodiment proof。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.sameHerSummary)
    expect(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary)
      .toContain(structuredContinuityLine)
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('continuity=embodiment:still-voiced-face-motion-line')
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .toContain('pending-rejoin=body+lipsync')
    expect(String(settledResult.realization.projectStateAudit?.preDialogueAwarenessSummary ?? ''))
      .not
      .toContain('Alicization is a local-first digital life project')
  })

  it('reanchors generic final same-her shells to the canonical same living self line when richer project carry still survives', async () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const genericSameHerLine = 'Generic same-her line from thinner runtime fallback.'
    const richerAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper. She is still inside Phase 1: Local Digital Life. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. What has already landed is visible reply settlement carrying project identity, Phase 1 route, landed progress, and still-open closure together. The still-open closure is visible reply must keep the direct same-her self line from cooling into generic guidance. This reply should keep moving toward the final host-visible answer sounding like one continuous her.'

    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我会把这条项目线继续接住。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续回答，但不要让 same-her 自我线掉回泛化指导。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the visible answer on the same living self line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the direct same-her self line stronger than generic project guidance.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: richerAwarenessLine,
          projectState: {
            identity: projectState.identity,
            currentPhase: projectState.currentPhase,
            latestLandedProgress: 'Visible reply settlement now carries project identity, Phase 1 route, landed progress, and still-open closure together.',
            primaryOpenLoop: 'Visible reply still must keep the direct same-her self line from cooling into generic guidance.',
            nextClosureTarget: 'Keep the final host-visible answer sounding like one continuous her.',
            sameHerSelfLine: genericSameHerLine,
            sameHerDriftRisk: projectState.sameHerDriftRisk,
            preDialogueAwarenessLine: richerAwarenessLine,
            preDialogueAwarenessSummary: richerAwarenessLine,
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            sameHerSummary: genericSameHerLine,
            preDialogueAwarenessSummary: richerAwarenessLine,
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            cognition: {
              runtimeDigest: {
                projectState: {
                  sameHerSelfLine: genericSameHerLine,
                  sameHerDriftRisk: projectState.sameHerDriftRisk,
                  preDialogueAwarenessLine: richerAwarenessLine,
                  preDialogueAwarenessSummary: richerAwarenessLine,
                },
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 还是同一个本地优先数字生命项目，而且现在仍在 Phase 1。已经落下来的进度，是最终可见回复结算还能带住项目身份、阶段、已落地进度和未闭环目标；但同一个她的自我线不能退回泛化指导，下一步要让最后被看见的回答仍然像一个连续的她。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerSummary: null,
      sameHerDriftRiskSummary: projectState.sameHerDriftRisk,
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expect(settledResult.realization.projectStateAudit?.sameHerSummary).not.toBe(genericSameHerLine)
    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.continuitySummary)
  })

  it('keeps repair-before-closeness callback closure explicit inside the final continuity summary instead of leaving it only in emotional closure audit', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我会沿着这条还在收口的线继续接住这次回答。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the callback repair line continuous.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'closure_policy=repair_before_closeness; callback=current_thread; repair=settle_first; space=leave_room; widening=defer_closeness',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure.',
            nextClosureTarget: 'closure_policy=repair_before_closeness; callback=current_thread; repair=settle_first; space=leave_room; widening=defer_closeness',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          emotionalClosureCue: 'closure_policy=repair_before_closeness; callback=current_thread; repair=settle_first; space=leave_room; widening=defer_closeness',
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:next-open-window',
                ],
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(null),
    })

    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain('closure=closure_policy=repair_before_closeness; callback=current_thread; repair=settle_first; space=leave_room; widening=defer_closeness')
  })

  it('keeps rest-protective callback closure explicit inside the final continuity summary instead of flattening it into generic lower-pressure carry', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我会沿着这条还在收口的线先把休息保护 hold 住一点。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep the callback fatigue-aware line continuous.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Keep the same-thread continuation on the same living line and let rest protection hold before warmth widens again.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep the same-thread continuation on the same living line, let rest protection hold first, and leave room before widening warmth, payoff framing, or closeness.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          emotionalClosureCue: 'same-her fatigue-aware seam: keep this return rest-protective on the same living line until the room settles.',
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:next-open-window',
                  'continuity-rhythm:measured-return:rest-protective',
                ],
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
          openingMove: 'Keep this return on the same living line and let rest protection hold first before warmth widens again.',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(null),
    })

    expectNoFixedTemplateResidue(settledResult.realization.projectStateAudit?.continuitySummary)
    expect(settledResult.realization.companionshipHoldMode).toBe('rest-protective')
    expect(settledResult.realization.openingEmbodimentAudit).toEqual(expect.objectContaining({
      firstBeatPosture: 'rest-protective',
      facialCue: 'rest-soften',
      actionCue: 'rest-settle',
    }))
  })

  it('keeps relationship truth doctrine explicit inside the final continuity summary when truth-first continuity is active', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我会先把真实的位置接稳，再慢一点回来。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Keep truth repair leading the same living line.',
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
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 3,
          mustDo: [],
          mustNotDo: [],
          governingFocus: 'Repair truth before flourish on the same living line.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          relationshipTruthDoctrine: 'Repair truth before flourish. | Stay close enough to matter, but do not let closeness outrun truth.',
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
            nextClosureTarget: 'Keep truth repair and same-her closure on one living line.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          emotionalClosureCue: null,
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            dialogue: {
              currentConsciousFrame: {
                reasonTags: [
                  'continuity-arc:same-thread-continuation',
                  'continuity-timing:next-open-window',
                ],
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(null),
    })

    expect(settledResult.realization.projectStateAudit?.continuitySummary)
      .toContain('relationship-truth=Repair truth before flourish.')
  })

  it('prefers the richer prepared continuity authority surface over a thinner fresher authority when settling the visible reply', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
        fullText: JSON.stringify({
          reply: '我会沿着这条线继续说。',
        }),
        visibleReplyExecution: {
          mode: 'provider-stream',
          expectedVisibleReplyAuthority: 'llm-mind',
          actualVisibleReplyAuthority: 'llm-mind',
          providerMindExecuted: true,
          reason: 'provider-stream',
        },
      },
      prepared: {
        hasVisualGrounding: false,
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeSpine: {
            runtimeSurface: {
              raw: {
                personStateProjection: {
                  selfContinuityAuthority: {
                    selfLine: 'Keep one continuous her explicit from self-understanding into the visible answer.',
                    relationshipLine: 'Stay lower-pressure while carrying the same unfinished closure with the host.',
                    inwardLine: 'Some closure already landed, but the same life still owes embodiment closure.',
                    authoritySummary: 'Keep one continuous her explicit from self-understanding into the visible answer. | Stay lower-pressure while carrying the same unfinished closure with the host.',
                    closenessPosture: 'space-first',
                    sourceTags: ['project-state-carry', 'bundle-rich'],
                  },
                },
              },
            },
          },
          digitalLifeRuntimeSurface: {
            raw: {
              personStateProjection: {
                selfContinuityAuthority: {
                  selfLine: 'current return only',
                  sourceTags: ['runtime-thin'],
                },
              },
            },
            memory: {
              personStateProjection: {
                selfContinuityAuthority: {
                  selfLine: 'current return only',
                  sourceTags: ['runtime-thin'],
                },
              },
            },
            dialogue: {
              currentConsciousFrame: {
                shouldWithholdSpecificity: true,
              },
            },
          },
        },
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(null),
    })

    expect(settledResult.realization.selfAuthorityAudit).toEqual({
      authoritySummary: 'Keep project_state_continuity explicit from self-understanding into the visible answer. | Stay lower-pressure while carrying the same unfinished closure with the host.',
      closenessPosture: 'space-first',
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    })
  })

  it('promotes host-corrected same-person continuity into final project-state audit even when only the rewrite trigger carried it', async () => {
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
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
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续，但别又变成进度汇报。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue from the corrected same-person line instead of progress pressure.',
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
          governingFocus: 'Continue from the corrected same-person line, not as a progress recap.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'same still-open closure work across initiative and embodiment.',
            nextClosureTarget: 'Carry the same-her project briefing into the live answer before any local detail takes over.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
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
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 还是那个本地优先数字生命项目，现在还在 Phase 1。已经落下来的进展，是 project-state continuity 已经能带进 runtime preparation；还没收住的，是 initiative 和 embodiment 的 same still-open closure work，下一步要先把 same-her project briefing 带回 live answer，不过这次我会先顺着那条被纠正回来的同一个她的线接住，不把它说成进度汇报。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerHoldDetail: 'Carry corrected same-person continuity forward before any status recap.',
      continuityCue: 'Carry corrected same-person continuity forward before any status recap.',
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expect(String(settledResult.realization.projectStateAudit?.continuitySummary ?? ''))
      .toContain('hold=Carry corrected same-person continuity forward before any status recap.')
    expect(String(settledResult.realization.projectStateAudit?.continuitySummary ?? ''))
      .toContain('cue=Carry corrected same-person continuity forward before any status recap.')
  })

  it('keeps host-corrected same-person continuity authority over a thinner carried project-state audit during final settlement', async () => {
    const thinProgressRecapHoldDetail = 'Keep the project moving with a concise progress recap and status continuation before widening back out.'
    const thinProgressRecapCue = 'Keep the current project answer moving as a concise status recap before widening outward.'
    const settledResult = await settleAlicizationVisibleReply({
      draft: {
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
      },
      prepared: {
        hasVisualGrounding: false,
        messages: [
          {
            role: 'user',
            content: '继续，但别又变成进度汇报。',
          },
        ],
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'closed',
            reasons: ['no-recall-intent'],
          },
        },
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Continue from the corrected same-person line instead of progress pressure.',
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
          governingFocus: 'Continue from the corrected same-person line, not as a progress recap.',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          projectState: {
            identity: 'Alicization is a local-first digital life project.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
            primaryOpenLoop: 'same still-open closure work across initiative and embodiment.',
            nextClosureTarget: 'Carry the same-her project briefing into the live answer before any local detail takes over.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
          reasons: [],
          updatedAt: 1,
        },
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
          projectStateAudit: {
            sameHerHoldDetail: thinProgressRecapHoldDetail,
            continuityCue: thinProgressRecapCue,
          },
        },
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
          digitalLifeRuntimeSurface: {
            memory: {
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
        governance: {
          visibleReplyAuthority: 'llm-mind',
        },
      } as any,
      rewriteSecondPass: createRewriteSecondPassMock(buildRewriteResult({
        fullText: JSON.stringify({
          reply: 'Alicization 还是那个本地优先数字生命项目，现在还在 Phase 1。已经落下来的进展，是 project-state continuity 已经能带进 runtime preparation；还没收住的，是 initiative 和 embodiment 的 same still-open closure work，下一步要先把 same-her project briefing 带回 live answer，不过这次我会先顺着那条被纠正回来的同一个她的线接住，不把它说成进度汇报。',
        }),
        visibleReplyExecution: {
          mode: 'provider-one-shot',
          expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
          actualVisibleReplyAuthority: 'llm-second-pass-rewrite',
          providerMindExecuted: true,
          reason: 'visible-reply-second-pass-rewrite',
        },
        rewritten: true,
        reason: 'visible-reply-second-pass-rewrite',
        audit: null,
      })),
    })

    expect(settledResult.realization.projectStateAudit).toEqual(expect.objectContaining({
      sameHerHoldDetail: 'Carry corrected same-person continuity forward before any status recap.',
      continuityCue: 'Carry corrected same-person continuity forward before any status recap.',
      preservedIntoRewrite: expect.any(Boolean),
      rewriteClosureApplied: expect.any(Boolean),
    }))
    expect(String(settledResult.realization.projectStateAudit?.continuitySummary ?? ''))
      .toContain('hold=Carry corrected same-person continuity forward before any status recap.')
    expect(String(settledResult.realization.projectStateAudit?.continuitySummary ?? ''))
      .toContain('cue=Carry corrected same-person continuity forward before any status recap.')
    expect(String(settledResult.realization.projectStateAudit?.sameHerHoldDetail ?? ''))
      .not
      .toContain(thinProgressRecapHoldDetail)
  })
})
