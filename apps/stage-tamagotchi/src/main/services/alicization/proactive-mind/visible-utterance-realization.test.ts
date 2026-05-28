import { describe, expect, it } from 'vitest'

import { resolveAlicizationProactiveVisibleUtterance } from './visible-utterance-realization'

describe('proactive visible utterance realization', () => {
  it('builds provider-mind persistence artifacts for mind-authored proactive speech', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'reminder',
      structured: {
        format: 'subconscious-proactive-llm-v1',
        reply: '该站起来动一动了。',
      },
      hasMindAuthoredStructured: true,
      reason: 'mind-authored-reminder',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(true)
    expect(resolved.assistantText).toBe('该站起来动一动了。')
    expect(resolved.visibleReplyExecution).toEqual(expect.objectContaining({
      mode: 'provider-one-shot',
      expectedVisibleReplyAuthority: 'llm-mind',
      actualVisibleReplyAuthority: 'llm-mind',
      providerMindExecuted: true,
    }))
    expect(resolved.structuredForPersistence).toEqual(expect.objectContaining({
      visibleReplyAuthority: 'llm-mind',
      replyRealizationMode: 'provider-mind-required',
      visibleReplyRealization: expect.objectContaining({
        blockedReasons: [],
        visibleText: '该站起来动一动了。',
      }),
    }))
  })

  it('blocks deterministic proactive text from becoming persisted humanlike speech', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'execution-callback',
      structured: {
        format: 'subconscious-proactive-v1',
        reply: '本地拼出来的拟人回调。',
      },
      hasMindAuthoredStructured: false,
      reason: 'provider-mind-unavailable-for-execution-callback',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.visibleReplyExecution).toEqual(expect.objectContaining({
      mode: 'local-fallback',
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: false,
    }))
    expect(resolved.visibleReplyRealization).toEqual(expect.objectContaining({
      visibleText: null,
      blockedReasons: ['non-human-authored-visible-fallback'],
    }))
  })

  it('holds explicitly whitelisted deterministic callback continuity as infra-only state', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'execution-callback',
      structured: {
        format: 'subconscious-proactive-v1',
        reply: '我把这条结果接回来了：callback fallback mirror ok。',
      },
      hasMindAuthoredStructured: false,
      allowDeterministicVisibleFallback: true,
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      reason: 'execution-callback-visible-fallback-blocked:provider-unavailable',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.visibleReplyExecution).toEqual(expect.objectContaining({
      mode: 'local-fallback',
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
      providerMindExecuted: false,
    }))
  })

  it('does not persist empty provider payloads as successful mind-authored speech', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        format: 'subconscious-proactive-llm-v1',
        reply: '   ',
      },
      hasMindAuthoredStructured: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyExecution.actualVisibleReplyAuthority).toBe('local-deterministic-fallback')
    expect(resolved.decision.reason).toBe('proactive-visible-utterance-requires-provider-mind')
    expect(resolved.visibleReplyRealization.blockedReasons).toContain('non-human-authored-visible-fallback')
  })

  it('keeps provider-authored proactive text out of persistence when active self-revision asks for proactive restraint', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        format: 'subconscious-proactive-llm-v1',
        reply: '我先不插太多话，只留一个很短的提醒。',
      },
      hasMindAuthoredStructured: true,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-proactive-restraint',
        sourceEventId: 'event-1',
        sourceTurnId: 'turn-1',
        decisionTraceId: 'trace-1',
        domain: 'proactive-policy',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['proactive-policy'],
        memoryPolicy: {
          strictnessBias: 0,
          wrongThreadSuppressionBias: 0,
          provenanceLabelBias: 0,
          recallExpansionBias: 0,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0,
          closenessCapBias: 0,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          secondPassRequiredBias: 0,
          hypothesisLabelBias: 0,
          specificityClampBias: 0,
          templateShellSuppressionBias: 0,
        },
        proactivePolicy: {
          restraintBias: 0.2,
          learningProposalBias: 0,
          actuationCooldownBias: 0.2,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: true,
          rollbackPlan: [],
        },
        reasonCodes: ['self-revision-revalidation'],
        summary: 'revalidate proactive habit before surfacing more speech',
      },
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.visibleReplyExecution.actualVisibleReplyAuthority).toBe('llm-mind')
    expect(resolved.decision.action).toBe('hold')
  })

  it('keeps provider-authored proactive text out of persistence when remembered familiarity must stay explicitly remembered before closeness widens', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        format: 'subconscious-proactive-llm-v1',
        reply: '我记得你以前会喜欢我这样贴近一点，所以我想先靠近你一些。',
      },
      hasMindAuthoredStructured: true,
      selfRevisionPatch: {
        version: 'self-revision-state-patch-v1',
        id: 'patch-remembered-familiarity-visible-hold',
        sourceEventId: 'event-remembered-familiarity-visible-hold',
        sourceTurnId: 'turn-remembered-familiarity-visible-hold',
        decisionTraceId: 'trace-remembered-familiarity-visible-hold',
        domain: 'relationship',
        action: 'internalize',
        resultStatus: 'completed',
        lanes: ['memory-policy', 'relationship-posture', 'response-posture'],
        memoryPolicy: {
          strictnessBias: 0,
          wrongThreadSuppressionBias: 0,
          provenanceLabelBias: 0.18,
          recallExpansionBias: 0,
          shouldQuarantineUnsupportedCarry: false,
        },
        relationshipPosture: {
          repairWindowBias: 0,
          closenessCapBias: 0.2,
          warmthReleaseBias: 0,
        },
        responsePosture: {
          secondPassRequiredBias: 0,
          hypothesisLabelBias: 0,
          specificityClampBias: 0,
          templateShellSuppressionBias: 0,
        },
        proactivePolicy: {
          restraintBias: 0,
          learningProposalBias: 0,
          actuationCooldownBias: 0,
        },
        validation: {
          requiresRollbackCheck: false,
          requiresRevalidation: false,
          rollbackPlan: [],
        },
        reasonCodes: ['domain:relationship', 'remembered-familiarity-restraint'],
        summary: 'remembered familiarity should stay explicitly remembered before visible closeness widens again',
      },
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.visibleReplyExecution.actualVisibleReplyAuthority).toBe('llm-mind')
    expect(resolved.decision.action).toBe('hold')
    expect(resolved.decision.reason).toBe('active-self-revision-remembered-familiarity-restraint-holds-visible-utterance')
  })

  it('preserves low-pressure presence metadata when silent-observe proactive flow has no visible utterance to persist', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        format: 'subconscious-proactive-v1',
        thought: '先陪着，不要打断。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.78,
          reasonCodes: ['continuity-next-open-window'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 12 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
        },
        performance: {
          baseEmotion: 'thinking',
          delivery: 'gentle',
          emphasis: 1,
          facialCue: 'focus',
          actionCue: 'steady_focus',
        },
      },
      hasMindAuthoredStructured: false,
      reason: 'proactive-visible-presence-without-utterance',
      allowDeterministicVisibleFallback: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.decision.action).toBe('hold')
    expect(resolved.decision.reason).toBe('proactive-visible-presence-without-utterance')
    expect(resolved.visibleReplyExecution.actualVisibleReplyAuthority).toBe('local-deterministic-fallback')
  })

  it('holds provider-authored proactive text when it violates observe-first opening guidance', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        format: 'subconscious-proactive-llm-v1',
        reply: '我直接说，这个错误你现在就该立刻处理。',
        proactive: {
          shouldInterrupt: true,
          confidence: 0.84,
          reasonCodes: ['foreground-error'],
          urgency: 'medium',
          style: 'light-nudge',
          cooldownMs: 18 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Open by observing first and keep the approach lighter.',
        },
      },
      hasMindAuthoredStructured: true,
      reason: 'mind-authored-proactive-utterance',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.decision.action).toBe('hold')
    expect(resolved.decision.reason).toBe('proactive-opening-guidance-violation:observe-first')
    expect(resolved.visibleReplyExecution.reason).toBe('proactive-opening-guidance-violation:observe-first')
    expect(resolved.visibleReplyRealization.blockedReasons).toContain('opening-guidance:observe-first')
  })

  it('holds provider-authored proactive text when direct-answer-first guidance drifts into timid preamble', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'execution-callback',
      structured: {
        format: 'subconscious-proactive-llm-v1',
        reply: '我先轻轻问你一句，你现在方便看一下刚才那个结果吗？',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.82,
          reasonCodes: ['execution-finished'],
          urgency: 'low',
          style: 'thread-callback',
          cooldownMs: 12 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 90_000,
          openingGuidance: 'Open directly with the live answer first and keep the approach lighter.',
        },
      },
      hasMindAuthoredStructured: true,
      reason: 'mind-authored-execution-callback',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.decision.action).toBe('hold')
    expect(resolved.decision.reason).toBe('proactive-opening-guidance-violation:direct-answer-first')
    expect(resolved.visibleReplyExecution.reason).toBe('proactive-opening-guidance-violation:direct-answer-first')
    expect(resolved.visibleReplyRealization.blockedReasons).toContain('opening-guidance:direct-answer-first')
  })

  it('holds provider-authored proactive text when repair-first guidance escalates into warmth too early', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        format: 'subconscious-proactive-llm-v1',
        reply: '先抱抱你，我刚刚一直在想你，所以想贴过来陪你。',
        proactive: {
          shouldInterrupt: true,
          confidence: 0.88,
          reasonCodes: ['relationship-reconnect'],
          urgency: 'medium',
          style: 'soft-reconnect',
          cooldownMs: 25 * 60_000,
          scenario: 'late-night-desktop',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Repair the seam before leaning closer.',
        },
      },
      hasMindAuthoredStructured: true,
      reason: 'mind-authored-soft-reconnect',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.decision.action).toBe('hold')
    expect(resolved.decision.reason).toBe('proactive-opening-guidance-violation:repair-first')
    expect(resolved.visibleReplyExecution.reason).toBe('proactive-opening-guidance-violation:repair-first')
    expect(resolved.visibleReplyRealization.blockedReasons).toContain('opening-guidance:repair-first')
  })

  it('holds provider-authored proactive text when callback-bounded guidance starts a second conversation', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'execution-callback',
      structured: {
        format: 'subconscious-proactive-llm-v1',
        reply: '结果我接回来了，顺便你今天是不是又在烦别的事情，要不要现在聊聊？',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.8,
          reasonCodes: ['execution-finished'],
          urgency: 'low',
          style: 'thread-callback',
          cooldownMs: 14 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Keep the callback thread-faithful and bounded.',
        },
      },
      hasMindAuthoredStructured: true,
      reason: 'mind-authored-execution-callback',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.decision.action).toBe('hold')
    expect(resolved.decision.reason).toBe('proactive-opening-guidance-violation:callback-bounded')
    expect(resolved.visibleReplyExecution.reason).toBe('proactive-opening-guidance-violation:callback-bounded')
    expect(resolved.visibleReplyRealization.blockedReasons).toContain('opening-guidance:callback-bounded')
  })

  it('holds provider-authored proactive text when same-her lower-pressure guidance drifts into eager closeness', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        format: 'subconscious-proactive-llm-v1',
        reply: '我现在就想立刻贴过来多陪你一会儿，顺势把这份靠近直接拉满。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.86,
          reasonCodes: ['continuity-next-open-window'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 20 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        },
      },
      hasMindAuthoredStructured: true,
      reason: 'mind-authored-same-her-lower-pressure',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.decision.action).toBe('hold')
    expect(resolved.decision.reason).toBe('proactive-opening-guidance-violation:lower-pressure')
    expect(resolved.visibleReplyExecution.reason).toBe('proactive-opening-guidance-violation:lower-pressure')
    expect(resolved.visibleReplyRealization.blockedReasons).toContain('opening-guidance:lower-pressure')
  })

  it('holds deterministic execution callback fallback when same-her lower-pressure guidance still leaves too little room', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'execution-callback',
      structured: {
        format: 'mind-turn-v1',
        reply: '这件事已经落到结果上了：callback same her ok。',
        proactive: {
          openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        },
      },
      hasMindAuthoredStructured: false,
      allowDeterministicVisibleFallback: true,
      reason: 'execution-callback-visible-fallback-blocked:missing-availability-check-in',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.structuredForPersistence).toBeNull()
    expect(resolved.decision.action).toBe('hold')
    expect(resolved.decision.reason).toBe('proactive-opening-guidance-violation:lower-pressure')
    expect(resolved.visibleReplyExecution.reason).toBe('proactive-opening-guidance-violation:lower-pressure')
    expect(resolved.visibleReplyRealization.blockedReasons).toContain('opening-guidance:lower-pressure')
  })

  it('exposes memory-familiarity closeness-cap detail when lower-pressure guidance blocks remembered familiarity from reopening too fast', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        format: 'subconscious-proactive-llm-v1',
        reply: '我记得我们之前一直都这么亲近，所以这次我也想像以前那样靠近一点，先陪在你身侧。',
        proactive: {
          shouldInterrupt: false,
          confidence: 0.81,
          reasonCodes: ['continuity-next-open-window'],
          urgency: 'low',
          style: 'silent-observe',
          cooldownMs: 20 * 60_000,
          scenario: 'coding',
          policyVersion: 'epoch4.1-v1',
          feedbackWindowMs: 120_000,
          openingGuidance: 'Stay inside the current same-her baseline. Keep the opening lower-pressure and leave room before widening closeness.',
        },
      },
      hasMindAuthoredStructured: true,
      reason: 'mind-authored-same-her-memory-familiarity',
    })

    expect(resolved.decision.reason).toBe('proactive-opening-guidance-violation:lower-pressure')
    expect(resolved.visibleReplyRealization.blockedReasons).toContain('opening-guidance:lower-pressure')
    expect((resolved.structuredForPersistence as any)?.visibleReplyRealization?.openingGuidanceHoldDetail).toBeUndefined()
    expect((resolved.visibleReplyRealization as any).openingGuidanceHoldDetail).toBe('memory-familiarity-closeness-cap')
  })
})
