import { describe, expect, it } from 'vitest'

import { resolveAlicizationProactiveVisibleUtterance } from './visible-utterance-realization'

const realizationKeys = [
  'actualAuthority',
  'blockedReasons',
  'closure',
  'critic',
  'expectedAuthority',
  'mode',
  'nonHumanAuthoredStatus',
  'providerMindExecuted',
  'reason',
  'version',
  'visibleReplyValidationStatus',
  'visibleText',
].sort()

function expectCurrentRealizationShape(value: object) {
  expect(Object.keys(value).sort()).toEqual(realizationKeys)
}

describe('resolveAlicizationProactiveVisibleUtterance', () => {
  it('keeps a silent observation inward without synthesizing visible text', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'Observe without speaking.',
        internal: {
          marker: 'legacy-governance-payload-ignored',
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.visibleReplyRealization.visibleText).toBeNull()
    expect(resolved.visibleReplyRealization.actualAuthority).toBe('local-deterministic-fallback')
    expectCurrentRealizationShape(resolved.visibleReplyRealization)
  })

  it('does not turn arbitrary nested metadata into realization fields', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        internal: {
          marker: 'legacy-governance-payload-ignored',
          nested: {
            value: 'ignored',
          },
        },
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(JSON.stringify(resolved.visibleReplyRealization)).not.toContain('legacy-governance-payload-ignored')
    expectCurrentRealizationShape(resolved.visibleReplyRealization)
  })

  it('ignores unrelated self-revision payloads when deciding visible output', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        thought: 'No visible reply was authored.',
      },
      hasMindAuthoredStructured: true,
      preferPresenceOnlyHold: true,
      selfRevisionPatch: {
        lanes: [],
        reasonCodes: [],
        unrelated: {
          marker: 'legacy-governance-payload-ignored',
        },
      } as any,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.visibleReplyExecution.providerMindExecuted).toBe(false)
    expectCurrentRealizationShape(resolved.visibleReplyRealization)
  })

  it('persists provider-authored proactive text as the only visible reply source', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        reply: '我记得你刚才说今天很累，所以只是来问一句，现在要不要先休息一下？',
        internal: {
          marker: 'legacy-governance-payload-ignored',
        },
      },
      hasMindAuthoredStructured: true,
      selfRevisionPatch: {
        domain: 'relationship',
        lanes: [],
        reasonCodes: [],
      } as any,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(true)
    expect(resolved.assistantText).toContain('今天很累')
    expect(resolved.decision.action).toBe('persist')
    expect(resolved.visibleReplyRealization.visibleText).toBe(resolved.assistantText)
    expect(JSON.stringify(resolved.visibleReplyRealization)).not.toContain('legacy-governance-payload-ignored')
    expectCurrentRealizationShape(resolved.visibleReplyRealization)
  })

  it('does not blacklist provider-authored wording that mentions project or personhood terms', () => {
    const reply = 'I still remember that you called this Phase 1 work part of her continuous life-line, and I want to answer the actual question now.'
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        reply,
      },
      hasMindAuthoredStructured: true,
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(true)
    expect(resolved.assistantText).toBe(reply)
    expect(resolved.visibleReplyRealization.visibleText).toBe(reply)
    expect(resolved.visibleReplyExecution.actualVisibleReplyAuthority).toBe('llm-mind')
  })

  it('persists an explicit infrastructure failure without treating it as mind-authored', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'reminder',
      structured: {
        reply: '提供方认证失败。',
        visibleReplyAuthority: 'non-human-authored-blocked',
        excludeFromPersonaLearning: true,
        excludeFromMemoryCondensation: true,
      },
      hasMindAuthoredStructured: false,
      actualVisibleReplyAuthority: 'non-human-authored-blocked',
      allowTransparentFailureSurface: true,
      reason: 'proactive-provider-auth-failed',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(true)
    expect(resolved.assistantText).toBe('提供方认证失败。')
    expect(resolved.visibleReplyRealization).toEqual(expect.objectContaining({
      actualAuthority: 'non-human-authored-blocked',
      visibleText: '提供方认证失败。',
    }))
    expect(resolved.visibleReplyExecution).toEqual(expect.objectContaining({
      mode: 'local-fallback',
      providerMindExecuted: false,
      actualVisibleReplyAuthority: 'non-human-authored-blocked',
    }))
  })

  it('keeps background proactive provider failures out of user-visible dialogue', () => {
    const resolved = resolveAlicizationProactiveVisibleUtterance({
      kind: 'subconscious-proactive',
      structured: {
        reply: 'Timed out.',
        visibleReplyAuthority: 'non-human-authored-blocked',
        excludeFromPersonaLearning: true,
        excludeFromMemoryCondensation: true,
      },
      hasMindAuthoredStructured: false,
      actualVisibleReplyAuthority: 'non-human-authored-blocked',
      allowTransparentFailureSurface: true,
      reason: 'proactive-provider-timeout',
    })

    expect(resolved.shouldPersistVisibleUtterance).toBe(false)
    expect(resolved.assistantText).toBe('')
    expect(resolved.visibleReplyRealization.visibleText).toBeNull()
    expect(resolved.visibleReplyExecution).toEqual(expect.objectContaining({
      mode: 'local-fallback',
      providerMindExecuted: false,
      actualVisibleReplyAuthority: 'local-deterministic-fallback',
    }))
  })
})
