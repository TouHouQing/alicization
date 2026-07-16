import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  normalizeStructuredOutput,
  sanitizeStructuredReplySurface,
  validateStructuredContract,
} from './alicization-structured-output'

function providerPayload(overrides: Record<string, unknown> = {}) {
  return {
    format: 'mind-turn-v1',
    thought: 'I considered the current request and the available memory evidence.',
    emotion: 'neutral',
    reply: '这是 Provider 根据当前对话与记忆生成的回复。',
    performance: {
      baseEmotion: 'neutral',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
    memoryUsage: {
      workingMemoryVersion: 'wm-test-1',
      longTermEvidenceIds: ['ltm-test-1'],
    },
    ...overrides,
  }
}

function withoutField(payload: Record<string, unknown>, field: string) {
  const result = { ...payload }
  delete result[field]
  return result
}

function normalizedProviderResult(overrides: Record<string, unknown> = {}) {
  return normalizeStructuredOutput({
    fullText: JSON.stringify(providerPayload(overrides)),
    thought: '',
  })
}

const strictProviderPayload = providerPayload()
const strictProviderPayloadText = JSON.stringify(strictProviderPayload)
const invalidStructuredCandidates: Array<[string, string]> = [
  ['a markdown JSON fence', `\`\`\`json\n${strictProviderPayloadText}\n\`\`\``],
  ['prose before and after JSON', `Provider preface\n${strictProviderPayloadText}\nProvider suffix`],
  ['a trailing comma', `${strictProviderPayloadText.slice(0, -1)},}`],
  ['a nested JSON string', JSON.stringify(strictProviderPayloadText)],
  ['escaped JSON object text', strictProviderPayloadText.replace(/"/g, '\\"')],
  ['an ACT block', `<|ACT ${strictProviderPayloadText}|>`],
  ['a JSON array', JSON.stringify([strictProviderPayload])],
]
const invalidProviderContractCases: Array<[string, Record<string, unknown>, string]> = [
  ['missing format', withoutField(strictProviderPayload, 'format'), 'format-invalid'],
  ['an unsupported format', providerPayload({ format: 'epoch1-v1' }), 'format-invalid'],
  ['missing thought', withoutField(strictProviderPayload, 'thought'), 'thought-missing'],
  ['missing emotion', withoutField(strictProviderPayload, 'emotion'), 'emotion-not-whitelisted'],
  ['missing reply', withoutField(strictProviderPayload, 'reply'), 'reply-missing'],
  ['missing performance', withoutField(strictProviderPayload, 'performance'), 'performance-invalid'],
  ['missing memoryUsage', withoutField(strictProviderPayload, 'memoryUsage'), 'memory-usage-invalid'],
  ['an unsupported emotion', providerPayload({ emotion: 'excited' }), 'emotion-not-whitelisted'],
  ['an incomplete performance payload', providerPayload({
    performance: {
      baseEmotion: 'neutral',
      facialCue: null,
      actionCue: null,
      emphasis: 0,
    },
  }), 'performance-invalid'],
  ['a performance emotion mismatch', providerPayload({
    emotion: 'neutral',
    performance: {
      baseEmotion: 'happy',
      facialCue: null,
      actionCue: null,
      delivery: 'calm',
      emphasis: 0,
    },
  }), 'performance-emotion-mismatch'],
  ['an incomplete memoryUsage payload', providerPayload({
    memoryUsage: {
      workingMemoryVersion: 'wm-test-1',
    },
  }), 'memory-usage-invalid'],
]

describe('alicization structured output', () => {
  it('keeps renderer structured output parse-and-validate only', () => {
    const source = readFileSync(new URL('./alicization-structured-output.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /buildLocalRepairThought|repairStructuredContractLocally|parseObjectCandidate|parseLastActPayload|stripJsonFence|extractJsonWindow/iu,
    )
  })

  it('preserves a complete strict provider payload', () => {
    const payload = providerPayload()
    const result = normalizeStructuredOutput({
      fullText: ` \n${JSON.stringify(payload)}\n `,
      thought: '',
    })

    expect(result).toMatchObject({
      parsePath: 'json',
      thought: payload.thought,
      emotion: payload.emotion,
      reply: payload.reply,
      format: 'mind-turn-v1',
      performance: payload.performance,
      memoryUsage: payload.memoryUsage,
    })
    expect(validateStructuredContract(result)).toEqual([])
  })

  it('does not expose legacy pre-dialogue governance fields from provider output', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify(providerPayload({
        preDialogueAwareness: {
          status: 'partial',
          summaryLine: '固定回复姿态',
          reasonPreview: ['mustDo=复述项目状态'],
        },
        preDialogueClosure: {
          status: 'partial',
          summaryLine: '固定收束',
          briefingLines: ['openingMove=固定开场'],
          reasons: ['fixed-reply-governance'],
        },
      })),
      thought: '',
    })

    expect(result).not.toHaveProperty('preDialogueAwareness')
    expect(result).not.toHaveProperty('preDialogueClosure')
  })

  it('preserves provider thought and reply without display normalization', () => {
    const thought = '  I kept the Provider reasoning surface exactly as emitted.\n'
    const reply = '\n  这是 Provider 保留首尾空白的原始回复。  \n'
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify(providerPayload({
        thought,
        reply,
      })),
      thought: 'Renderer diagnostics must not replace Provider thought.',
    })

    expect(result.thought).toBe(thought)
    expect(result.reply).toBe(reply)
    expect(validateStructuredContract(result)).toEqual([])
  })

  it('keeps a valid empty provider thought instead of borrowing renderer diagnostics', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify(providerPayload({
        thought: '',
      })),
      thought: 'Renderer diagnostics must stay outside the Provider artifact.',
    })

    expect(result.thought).toBe('')
    expect(validateStructuredContract(result)).toEqual([])
  })

  it('preserves a whitespace-only provider reply while rejecting the contract', () => {
    const reply = ' \n '
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify(providerPayload({
        reply,
      })),
      thought: '',
    })

    expect(result.reply).toBe(reply)
    expect(validateStructuredContract(result)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'reply-missing',
      }),
    ]))
  })

  it.each(invalidStructuredCandidates)('rejects %s as a provider artifact', (_label, fullText) => {
    const result = normalizeStructuredOutput({
      fullText,
      thought: 'Renderer reasoning must not establish a Provider contract.',
    })

    expect(result).toMatchObject({
      parsePath: 'fallback',
      format: 'fallback-v1',
      reply: '',
    })
  })

  it('does not promote plain fullText into a provider artifact', () => {
    const result = normalizeStructuredOutput({
      fullText: 'Provider returned plain text instead of the JSON contract.',
      thought: 'Renderer reasoning must not establish a Provider contract.',
    })

    expect(result).toMatchObject({
      parsePath: 'fallback',
      format: 'fallback-v1',
      reply: '',
    })
  })

  it.each(invalidProviderContractCases)('reports %s as an invalid provider contract', (_label, payload, expectedCode) => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify(payload),
      thought: '',
    })

    expect(result.parsePath).toBe('json')
    expect(validateStructuredContract(result)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: expectedCode,
      }),
    ]))
  })

  it('rejects fixed persona residue instead of sanitizing it into another reply', () => {
    const contaminated = '我先轻一点留在这里，不抢你的节奏。'

    expect(sanitizeStructuredReplySurface(contaminated)).toBe('')

    const result = normalizeStructuredOutput({
      fullText: JSON.stringify(providerPayload({ reply: contaminated })),
      thought: '',
    })
    expect(result.reply).toBe(contaminated)
    expect(validateStructuredContract(result)).toEqual([
      expect.objectContaining({
        code: 'reply-surface-roleplay-residue',
      }),
    ])
  })

  it('rejects stage-direction roleplay without writing a replacement surface', () => {
    const contaminated = '（轻轻歪头）我知道了。'

    expect(sanitizeStructuredReplySurface(contaminated)).toBe('')
    expect(validateStructuredContract({
      ...normalizedProviderResult(),
      reply: contaminated,
    })).toEqual([
      expect.objectContaining({
        code: 'reply-surface-roleplay-residue',
      }),
    ])
  })

  it('treats the legacy key-value thought protocol as contamination', () => {
    const issues = validateStructuredContract(normalizedProviderResult({
      thought: 'obligation=answer; truth=grounded; focus=user; move=reply; tone=warm',
    }))

    expect(issues).toEqual([
      expect.objectContaining({
        code: 'thought-missing-mind-spine',
      }),
    ])
  })
})
