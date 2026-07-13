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

describe('alicization structured output', () => {
  it('keeps renderer structured output parse-and-validate only', () => {
    const source = readFileSync(new URL('./alicization-structured-output.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /buildLocalRepairThought|repairStructuredContractLocally|buildMindGovernedFallbackSurface|enforceGovernedMindTurn/iu,
    )
    expect(source).not.toMatch(/\bfallbackReply\b/u)
  })

  it('parses a strict provider payload without replacing its reply', () => {
    const payload = providerPayload()
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify(payload),
      thought: '',
      reply: '',
    })

    expect(result).toMatchObject({
      parsePath: 'json',
      thought: payload.thought,
      emotion: payload.emotion,
      reply: payload.reply,
      format: 'mind-turn-v1',
    })
    expect(validateStructuredContract(result)).toEqual([])
  })

  it('rejects fixed persona residue instead of sanitizing it into another reply', () => {
    const contaminated = '我先轻一点留在这里，不抢你的节奏。'

    expect(sanitizeStructuredReplySurface(contaminated)).toBe('')

    const result = normalizeStructuredOutput({
      fullText: JSON.stringify(providerPayload({ reply: contaminated })),
      thought: '',
      reply: '',
    })
    expect(result.reply).toBe('')
    expect(validateStructuredContract({
      thought: result.thought,
      emotion: result.emotion,
      reply: contaminated,
    })).toEqual([
      expect.objectContaining({
        code: 'reply-surface-roleplay-residue',
      }),
    ])
  })

  it('rejects stage-direction roleplay without writing a replacement surface', () => {
    const contaminated = '（轻轻歪头）我知道了。'

    expect(sanitizeStructuredReplySurface(contaminated)).toBe('')
    expect(validateStructuredContract({
      thought: 'I considered the request.',
      emotion: 'neutral',
      reply: contaminated,
    })).toEqual([
      expect.objectContaining({
        code: 'reply-surface-roleplay-residue',
      }),
    ])
  })

  it('treats the legacy key-value thought protocol as contamination', () => {
    const issues = validateStructuredContract({
      thought: 'obligation=answer; truth=grounded; focus=user; move=reply; tone=warm',
      emotion: 'neutral',
      reply: '这是普通回复。',
    })

    expect(issues).toEqual([
      expect.objectContaining({
        code: 'thought-missing-mind-spine',
      }),
    ])
  })
})
