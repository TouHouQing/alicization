import { describe, expect, it } from 'vitest'

import {
  deferredAutonomyCanonicalVersion,
  resolveDeferredAutonomySummary,
  validateDeferredAutonomyCanonicalSummary,
} from './runtime-deferred-autonomy-summary'

const ordinaryWhyNow = 'Stay near the current runtime thread without forcing a visible reply.'
const ordinaryExecutionIntent = 'Recheck the local runtime state before speaking.'
const providerFailure = 'Embedding Provider failed with HTTP 400.'
const toolFailure = 'Filesystem Tool execution aborted.'

function buildCanonicalBudgetOperationalFailure(prefix: string) {
  const evidence = `${prefix}: upstream 127.0.0.1:11434 connection reset HTTP 503 /tmp/`
  return `${evidence}${'x'.repeat(560 - evidence.length)}`
}

describe('deferred autonomy summary selection', () => {
  it.each([
    'Provider unavailable',
    'Provider unavailable.',
    'Provider returned HTTP 503',
    'Provider returned HTTP 503.',
    'Provider authentication failed',
    'Provider authentication failed.',
    'Provider request timed out',
    'Provider request timed out.',
    'Provider request timed out: upstream reset.',
    'Request timed out while contacting the provider.',
    'Provider request failed: upstream reset.',
    'Provider request failed: connection reset.',
    'Provider request failed: connection refused.',
    'Provider request failed: timeout.',
    'Provider error: unavailable.',
    'Provider error: authentication failure.',
    'Provider error: auth failed.',
    'Provider error: HTTP status 503.',
    'Provider error: status 400.',
    'Provider request failed: upstream 127.0.0.1:11434.',
    'Provider request failed: http://127.0.0.1:11434/v1/models',
    'Provider request failed: https://provider.local/v1/runtime.json',
    'Provider request failed: /tmp/runtime.json',
    'Embedding Provider failed with HTTP 400.',
    'Filesystem Tool call failed: permission denied.',
    'Tool call timed out after 30 seconds.',
    'Filesystem Tool call timeout.',
    'Filesystem Tool execution aborted.',
    'Filesystem Tool failed with permission denied.',
    'Filesystem Tool failed with access denied.',
    'Tool permission denied.',
    'Filesystem Tool access denied.',
    '工具调用超时。',
    '工具调用失败：权限被拒绝。',
    '工具调用失败：访问被拒绝。',
    '工具调用失败：连接超时。',
    '工具调用失败：网络不可用。',
    '工具调用失败：认证失败。',
    '工具调用失败：连接被重置。',
    '工具调用失败：上游返回 HTTP 503。',
    '工具调用失败：上游不可用。',
    '工具调用失败：上游连接被重置。',
    '工具调用失败：上游超时。',
    'Provider请求失败：连接被拒绝。',
    '提供方认证失败',
    '上游不可用',
    '上游返回 HTTP 503',
  ])('recognizes a sentence-initial infrastructure failure: %s', (failure) => {
    expect(resolveDeferredAutonomySummary({
      mode: 'deferred',
      whyNow: failure,
      executionIntentSummary: ordinaryExecutionIntent,
    })).toEqual({
      summary: failure,
      failure,
      summaryOwner: 'failure',
    })
  })

  it.each([
    buildCanonicalBudgetOperationalFailure('Provider returned HTTP 503'),
    buildCanonicalBudgetOperationalFailure('Embedding Provider failed with HTTP 400'),
    buildCanonicalBudgetOperationalFailure('Provider request failed'),
    buildCanonicalBudgetOperationalFailure('Filesystem Tool call failed'),
  ])('recognizes a canonical-budget colon failure detail: %s', (rawFailure) => {
    expect(rawFailure).toHaveLength(560)
    expect(resolveDeferredAutonomySummary({
      mode: 'deferred',
      whyNow: rawFailure,
      executionIntentSummary: ordinaryExecutionIntent,
    })).toEqual({
      summary: rawFailure,
      failure: rawFailure,
      summaryOwner: 'failure',
    })
  })

  it.each([
    {
      name: 'whyNow',
      mode: 'deferred',
      input: {
        whyNow: `${buildCanonicalBudgetOperationalFailure('Provider request failed')} narrative`,
        executionIntentSummary: ordinaryExecutionIntent,
      },
    },
    {
      name: 'execution intent',
      mode: 'held-autonomy',
      input: {
        whyNow: ordinaryWhyNow,
        executionIntentSummary: `${buildCanonicalBudgetOperationalFailure('Provider request failed')} narrative`,
      },
    },
  ] as const)('does not infer failure from an overflowing $name with a valid 560-character prefix', ({
    input,
    mode,
  }) => {
    expect(resolveDeferredAutonomySummary({
      mode,
      ...input,
    })).toEqual({
      summary: null,
      failure: null,
      summaryOwner: null,
    })
  })

  it('does not infer failure from an overflowing failure candidate with a valid 560-character prefix', () => {
    const failureCandidate = `${buildCanonicalBudgetOperationalFailure('Provider request failed')} narrative`

    expect(resolveDeferredAutonomySummary({
      mode: 'held-autonomy',
      whyNow: ordinaryWhyNow,
      executionIntentSummary: ordinaryExecutionIntent,
      failureCandidates: [failureCandidate],
    })).toEqual({
      summary: null,
      failure: null,
      summaryOwner: null,
    })
  })

  it('does not treat an expectations sentence as a direct Provider failure', () => {
    const whyNow = 'The provider failed to meet expectations'

    expect(resolveDeferredAutonomySummary({
      mode: 'held-autonomy',
      whyNow,
      executionIntentSummary: ordinaryExecutionIntent,
    })).toEqual({
      summary: null,
      failure: null,
      summaryOwner: null,
    })
  })

  it.each([
    'Tool call timed out in a hypothetical example.',
    'Provider unavailable in a hypothetical example.',
    'The Provider request timed out in a hypothetical example.',
    'Provider returned HTTP 200.',
    'Embedding Provider failed with HTTP 200.',
    'Provider request failed: upstream returned HTTP 200.',
    'Provider error: this is a hypothetical example.',
    'Provider request failed: hypothetical upstream timeout.',
    'Provider error: vaguely unavailable.',
    'Provider error: temporary connection reset.',
    'We discussed whether a tool call timed out after 30 seconds in a hypothetical example.',
    'The provider failed to meet expectations.',
    '工具调用超时只是一个假设示例。',
    '工具调用失败：这是一个假设示例。',
    '工具调用失败：假设网络超时。',
    '工具调用失败：可能只是叙述。',
    '工具调用失败：上游不可用的可能性正在讨论。',
    '工具调用失败：上游连接被重置的假设示例。',
    '工具调用失败：上游超时可能发生。',
    '提供方认证失败只是一个假设示例。',
    '上游不可用的可能性正在讨论。',
    '上游返回 HTTP 503 的假设示例。',
  ])('does not treat narrative infrastructure prose as a direct failure: %s', (whyNow) => {
    expect(resolveDeferredAutonomySummary({
      mode: 'held-autonomy',
      whyNow,
      executionIntentSummary: ordinaryExecutionIntent,
    })).toEqual({
      summary: null,
      failure: null,
      summaryOwner: null,
    })
  })

  it.each([
    'Provider request failed: upstream returned HTTP 200.',
    'Provider request failed: hypothetical upstream timeout.',
    'Provider error: arbitrary provider message text.',
  ])('keeps typed explicit failure trusted even when its detail is not inferable prose: %s', (explicitFailure) => {
    expect(resolveDeferredAutonomySummary({
      mode: 'deferred',
      whyNow: ordinaryWhyNow,
      executionIntentSummary: ordinaryExecutionIntent,
      explicitFailure,
    })).toEqual({
      summary: explicitFailure,
      failure: explicitFailure,
      summaryOwner: 'failure',
    })
  })

  it('normalizes and bounds explicit typed failure metadata', () => {
    const rawFailure = `  Provider request failed: \n upstream reset.   ${'x'.repeat(600)}  `
    const failure = rawFailure.trim().replace(/\s+/g, ' ').slice(0, 560)

    expect(resolveDeferredAutonomySummary({
      mode: 'deferred',
      whyNow: ordinaryWhyNow,
      executionIntentSummary: ordinaryExecutionIntent,
      explicitFailure: rawFailure,
    })).toEqual({
      summary: failure,
      failure,
      summaryOwner: 'failure',
    })
  })

  it('fails closed for a forged summary owner before typed failure precedence', () => {
    expect(validateDeferredAutonomyCanonicalSummary({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      summary: 'Stale forged summary.',
      summaryOwner: 'project-governance',
      failure: 'Provider unavailable.',
    })).toEqual({
      executionIntentSummary: null,
      failure: null,
      isCanonicalVersion: true,
      isValid: false,
      summary: null,
      summaryOwner: null,
      whyNow: null,
    })
  })

  it('keeps ordinary autonomy prose as typed metadata without a summary owner', () => {
    expect(validateDeferredAutonomyCanonicalSummary({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      summary: null,
      summaryOwner: null,
      failure: null,
      whyNow: ordinaryWhyNow,
      executionIntentSummary: ordinaryExecutionIntent,
    })).toEqual({
      executionIntentSummary: ordinaryExecutionIntent,
      failure: null,
      isCanonicalVersion: true,
      isValid: true,
      summary: null,
      summaryOwner: null,
      whyNow: ordinaryWhyNow,
    })
  })

  it.each([
    {
      name: 'keeps ordinary deferred autonomy prose out of the summary',
      input: {
        mode: 'deferred',
        whyNow: ordinaryWhyNow,
        executionIntentSummary: ordinaryExecutionIntent,
      },
      expected: {
        summary: null,
        failure: null,
        summaryOwner: null,
      },
    },
    {
      name: 'keeps ordinary held autonomy prose out of the summary',
      input: {
        mode: 'held-autonomy',
        whyNow: ordinaryWhyNow,
        executionIntentSummary: ordinaryExecutionIntent,
      },
      expected: {
        summary: null,
        failure: null,
        summaryOwner: null,
      },
    },
    {
      name: 'keeps a Provider failure from deferred whyNow visible',
      input: {
        mode: 'deferred',
        whyNow: providerFailure,
        executionIntentSummary: ordinaryExecutionIntent,
      },
      expected: {
        summary: providerFailure,
        failure: providerFailure,
        summaryOwner: 'failure',
      },
    },
    {
      name: 'keeps a Provider failure from held execution intent visible',
      input: {
        mode: 'held-autonomy',
        whyNow: ordinaryWhyNow,
        executionIntentSummary: providerFailure,
      },
      expected: {
        summary: providerFailure,
        failure: providerFailure,
        summaryOwner: 'failure',
      },
    },
    {
      name: 'keeps a Tool failure from held whyNow visible',
      input: {
        mode: 'held-autonomy',
        whyNow: toolFailure,
        executionIntentSummary: ordinaryExecutionIntent,
      },
      expected: {
        summary: toolFailure,
        failure: toolFailure,
        summaryOwner: 'failure',
      },
    },
    {
      name: 'keeps a Tool failure from deferred execution intent visible',
      input: {
        mode: 'deferred',
        whyNow: ordinaryWhyNow,
        executionIntentSummary: toolFailure,
      },
      expected: {
        summary: toolFailure,
        failure: toolFailure,
        summaryOwner: 'failure',
      },
    },
    {
      name: 'keeps both deferred owner failures in whyNow then execution intent order',
      input: {
        mode: 'deferred',
        whyNow: toolFailure,
        executionIntentSummary: providerFailure,
      },
      expected: {
        summary: `${toolFailure} | ${providerFailure}`,
        failure: `${toolFailure} | ${providerFailure}`,
        summaryOwner: 'failure',
      },
    },
    {
      name: 'keeps both held owner failures in execution intent then whyNow order',
      input: {
        mode: 'held-autonomy',
        whyNow: toolFailure,
        executionIntentSummary: providerFailure,
      },
      expected: {
        summary: `${providerFailure} | ${toolFailure}`,
        failure: `${providerFailure} | ${toolFailure}`,
        summaryOwner: 'failure',
      },
    },
    {
      name: 'returns no summary when both owners are empty',
      input: {
        mode: 'deferred',
        whyNow: '',
        executionIntentSummary: '',
      },
      expected: {
        summary: null,
        failure: null,
        summaryOwner: null,
      },
    },
    {
      name: 'does not mistake ordinary Provider failure narration for a direct failure',
      input: {
        mode: 'held-autonomy',
        whyNow: 'The provider work had failed expectations during an earlier review.',
        executionIntentSummary: ordinaryExecutionIntent,
      },
      expected: {
        summary: null,
        failure: null,
        summaryOwner: null,
      },
    },
    {
      name: 'does not mistake natural Provider and Tool narration for direct held failures',
      input: {
        mode: 'held-autonomy',
        whyNow: 'The provider failed to meet the host\'s expectations.',
        executionIntentSummary: 'The tool failed to achieve the intended tone.',
      },
      expected: {
        summary: null,
        failure: null,
        summaryOwner: null,
      },
    },
    {
      name: 'ignores legacy project metadata when choosing the deferred summary',
      input: {
        mode: 'deferred',
        whyNow: ordinaryWhyNow,
        executionIntentSummary: ordinaryExecutionIntent,
        projectState: {
          identity: providerFailure,
          sameHerSelfLine: toolFailure,
          primaryOpenLoop: 'WorkingMemory had failed expectations.',
          memoryClosureSummary: 'LongTermMemory error narration.',
        },
      },
      expected: {
        summary: null,
        failure: null,
        summaryOwner: null,
      },
    },
  ] as const)('$name', ({ input, expected }) => {
    expect(resolveDeferredAutonomySummary(input)).toEqual(expected)
  })
})
