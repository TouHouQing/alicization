import { describe, expect, it } from 'vitest'

import {
  buildAlicizationVisibleReplyRealizationArtifact,
  deriveAlicizationVisibleReplyText,
  resolveAlicizationPreparedVisibleReplyExecution,
  resolveAlicizationTimeoutRecoveredVisibleReply,
} from './realization-engine'

const ignoredPayloadMarker = 'legacy-governance-payload-ignored'
const retiredArtifactFields = [
  ['project', 'StateAudit'].join(''),
  ['project', 'StateEvidenceStatus'].join(''),
  ['same', 'HerInwardCarry'].join(''),
  ['opening', 'GuidanceHoldDetail'].join(''),
  ['companionship', 'HoldMode'].join(''),
  ['opening', 'EmbodimentAudit'].join(''),
] as const

const visibleReplyExecution = {
  mode: 'provider-one-shot',
  expectedVisibleReplyAuthority: 'llm-mind',
  actualVisibleReplyAuthority: 'llm-mind',
  providerMindExecuted: true,
  reason: 'provider-one-shot',
} as const

function expectNoRetiredSidecars(value: unknown) {
  for (const field of retiredArtifactFields)
    expect(value).not.toHaveProperty(field)
  expect(JSON.stringify(value)).not.toContain(ignoredPayloadMarker)
}

describe('visible reply realization engine', () => {
  it.each([
    {
      hasVisualGrounding: false,
      expectedMode: 'provider-stream',
    },
    {
      hasVisualGrounding: true,
      expectedMode: 'provider-one-shot',
    },
  ] as const)(
    'migrates a persisted local-fallback plan to $expectedMode when visual grounding is $hasVisualGrounding',
    ({ hasVisualGrounding, expectedMode }) => {
      const execution = resolveAlicizationPreparedVisibleReplyExecution({
        prepared: {
          hasVisualGrounding,
          mindTurnContract: null,
          replyExecutionPlan: {
            preferredMode: 'local-fallback',
            expectedVisibleReplyAuthority: 'llm-mind',
            reason: 'legacy-persisted-plan',
          },
          runtimeSurface: {
            replyExecutionPlan: null,
          },
          governance: null,
        } as any,
      })

      expect(execution).toMatchObject({
        mode: expectedMode,
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'legacy-persisted-plan',
      })
    },
  )

  it('returns only the Provider-authored reply field from a structured response', () => {
    expect(deriveAlicizationVisibleReplyText(JSON.stringify({
      reply: '我已经接住这轮真正要处理的问题。',
      diagnostics: {
        marker: ignoredPayloadMarker,
      },
    }))).toBe('我已经接住这轮真正要处理的问题。')

    expect(deriveAlicizationVisibleReplyText(JSON.stringify({
      governance: {
        marker: ignoredPayloadMarker,
      },
    }))).toBe('')
  })

  it('drops arbitrary nested metadata from the public realization artifact', () => {
    const realization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: JSON.stringify({
        reply: '我先把真实问题继续查清楚。',
        diagnostics: {
          marker: ignoredPayloadMarker,
          nested: {
            text: 'unrelated structured noise',
          },
        },
      }),
      visibleReplyExecution,
    })

    expect(realization.visibleText).toBe('我先把真实问题继续查清楚。')
    expectNoRetiredSidecars(realization)
  })

  it('drops unknown sidecar inputs from the realization artifact', () => {
    const realization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: JSON.stringify({
        reply: '我会继续检查可见回复链路。',
        diagnostics: {
          marker: ignoredPayloadMarker,
          emotionalCue: 'untrusted nested cue',
        },
      }),
      visibleReplyExecution,
      unknownSidecar: 'must not reach the public artifact',
      closure: {
        version: 'visible-reply-closure-v1',
        status: 'approved',
        initialCritic: null,
        finalCritic: null,
        reasonCodes: [],
      } as any,
    } as any)

    expect(realization.visibleText).toBe('我会继续检查可见回复链路。')
    expect(realization.visibleReplyValidationStatus).toBe('approved')
    expect(realization).not.toHaveProperty('unknownSidecar')
    expect(JSON.stringify(realization)).not.toMatch(
      /untrusted nested cue|must not reach the public artifact/,
    )
    expectNoRetiredSidecars(realization)
  })

  it('preserves an unstructured Provider reply without adding authored text', () => {
    const realization = buildAlicizationVisibleReplyRealizationArtifact({
      fullText: 'Provider 原始可见回复。',
      visibleReplyExecution,
    })

    expect(realization.visibleText).toBe('Provider 原始可见回复。')
    expect(realization.visibleReplyValidationStatus).toBe('unknown')
    expectNoRetiredSidecars(realization)
  })

  it('keeps Provider timeout recovery text intact without rebuilding sidecars', () => {
    const recoveredText = JSON.stringify({
      reply: '这是 Provider 重试后的真实回复。',
      diagnostics: {
        marker: ignoredPayloadMarker,
      },
    })
    const recovered = resolveAlicizationTimeoutRecoveredVisibleReply({
      prepared: {
        hasVisualGrounding: false,
        runtimeSurface: {
          legacyEnvelope: {
            marker: ignoredPayloadMarker,
          },
        },
      } as any,
      recoveredText,
      recoveryMode: 'provider-retry',
    })

    expect(recovered.fullText).toBe(recoveredText)
    expect(recovered.visibleText).toBe('这是 Provider 重试后的真实回复。')
    expect(recovered.realization.nonHumanAuthoredStatus).toBeNull()
    expectNoRetiredSidecars(recovered.realization)
  })

  it('keeps local timeout fallback explicit and never fabricates a visible reply', () => {
    const recoveredText = JSON.stringify({
      reply: 'Provider 请求超时。',
      diagnostics: {
        marker: ignoredPayloadMarker,
      },
    })
    const recovered = resolveAlicizationTimeoutRecoveredVisibleReply({
      prepared: {
        hasVisualGrounding: true,
        runtimeSurface: {},
      } as any,
      recoveredText,
      recoveryMode: 'local-fallback',
    })

    expect(recovered.fullText).toBe(recoveredText)
    expect(recovered.visibleText).toBe('')
    expect(recovered.visibleReplyExecution.actualVisibleReplyAuthority).toBe('local-deterministic-fallback')
    expect(recovered.realization.nonHumanAuthoredStatus).toBe('timeout-recovered-local-fallback')
    expect(recovered.realization.blockedReasons).toEqual(['non-human-authored-visible-fallback'])
    expectNoRetiredSidecars(recovered.realization)
  })
})
