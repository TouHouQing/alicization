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
    expect(resolved.decision.reason).toBe('provider-mind-empty-visible-text-for-subconscious-proactive')
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
})
