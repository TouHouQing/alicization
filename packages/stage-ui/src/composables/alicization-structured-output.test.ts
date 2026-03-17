import { describe, expect, it } from 'vitest'

import { calibrateSentimentConfidence, normalizeStructuredOutput, parseLastActEmotion, validateStructuredContract } from './alicization-structured-output'

describe('alicization structured output', () => {
  it('parses last ACT emotion', () => {
    const emotion = parseLastActEmotion('hello <|ACT:{"emotion":"happy"}|>world <|ACT:{"emotion":"sad"}|>!')
    expect(emotion).toBe('sad')
  })

  it('prefers strict json payload when available', () => {
    const result = normalizeStructuredOutput({
      fullText: JSON.stringify({
        thought: 'internal-json',
        emotion: 'happy',
        reply: 'json reply',
        userSentimentScore: 0.65,
        sentimentConfidenceRaw: 0.88,
      }),
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.parsePath).toBe('json')
    expect(result.thought).toBe('internal-json')
    expect(result.reply).toBe('json reply')
    expect(result.emotion).toBe('happy')
    expect(result.performance.baseEmotion).toBe('happy')
    expect(result.format).toBe('epoch1-v1')
  })

  it('uses linear repair path for noisy wrapped json', () => {
    const result = normalizeStructuredOutput({
      fullText: 'prefix noise >>> {"thought":"repair","emotion":"thinking","reply":"ok","performance":{"baseEmotion":"thinking","delivery":"hesitant","emphasis":0}} <<< suffix noise',
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.parsePath).toBe('repair-json')
    expect(result.reply).toBe('ok')
    expect(result.emotion).toBe('thinking')
    expect(result.performance.baseEmotion).toBe('thinking')
    expect(result.repairTimedOut).toBe(false)
  })

  it('parses structured payload from markdown json fences', () => {
    const result = normalizeStructuredOutput({
      fullText: '```json\n{"thought":"fenced","emotion":"neutral","reply":"你好，我在。"}\n```',
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.parsePath).toBe('json')
    expect(result.thought).toBe('fenced')
    expect(result.emotion).toBe('neutral')
    expect(result.reply).toBe('你好，我在。')
    expect(result.performance.baseEmotion).toBe('neutral')
  })

  it('rescues escaped json string payload and extracts reply', () => {
    const result = normalizeStructuredOutput({
      fullText: '"{\\"thought\\":\\"检测到友好问候\\",\\"emotion\\":\\"happy\\",\\"reply\\":\\"你好！很高兴见到你。\\"}"',
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.parsePath).toBe('repair-json')
    expect(result.thought).toContain('友好问候')
    expect(result.emotion).toBe('happy')
    expect(result.reply).toContain('你好')
    expect(result.performance.baseEmotion).toBe('happy')
  })

  it('falls back to parsing reply field when fullText is empty', () => {
    const result = normalizeStructuredOutput({
      fullText: '',
      thought: 'fallback-thought',
      reply: '{"thought":"from-reply","emotion":"neutral","reply":"通过 reply 解析成功。","performance":{"baseEmotion":"neutral","delivery":"calm","emphasis":0}}',
    })

    expect(result.parsePath).toBe('json')
    expect(result.thought).toBe('from-reply')
    expect(result.reply).toBe('通过 reply 解析成功。')
    expect(result.performance.baseEmotion).toBe('neutral')
  })

  it('falls back safely for oversized malformed text', () => {
    const oversized = `{${'x'.repeat(40_000)}}`
    const result = normalizeStructuredOutput({
      fullText: oversized,
      thought: 'fallback-thought',
      reply: 'fallback-reply',
    })

    expect(result.parsePath).toBe('fallback')
    expect(result.format).toBe('fallback-v1')
    expect(result.reply).toBe('fallback-reply')
    expect(result.repairTimedOut).toBe(true)
  })

  it('calibrates confidence with heuristic cap', () => {
    const result = normalizeStructuredOutput({
      fullText: '<|ACT:{"emotion":"happy"}|>Thanks a lot!',
      thought: 'internal',
      reply: 'Thanks a lot!',
      sentimentConfidenceRaw: 0.99,
      previousEmotion: 'neutral',
      extractorAgreement: 0.6,
    })

    expect(result.sentimentConfidenceRaw).toBe(0.99)
    expect(result.sentimentConfidence).toBeLessThanOrEqual(result.sentimentConfidenceRaw!)
    expect(result.sentimentConfidence).toBeGreaterThan(0)
  })

  it('falls back to heuristic confidence when raw is missing', () => {
    const result = normalizeStructuredOutput({
      fullText: '<|ACT:{"emotion":"neutral"}|>我会继续优化。',
      thought: 'internal',
      reply: '我会继续优化。',
      previousEmotion: 'happy',
    })

    expect(result.sentimentConfidenceRaw).toBeUndefined()
    expect(result.sentimentConfidence).toBeGreaterThan(0)
  })

  it('caps overconfident raw score with calibrator', () => {
    const calibrated = calibrateSentimentConfidence({
      rawConfidence: 1,
      lexicalStrength: 0.1,
      emotionCoherence: 0.55,
      extractorAgreement: 0.2,
    })
    expect(calibrated).toBeLessThan(1)
    expect(calibrated).toBeGreaterThan(0)
  })

  it('marks non-whitelisted emotion as invalid', () => {
    const issues = validateStructuredContract({
      thought: 'I reviewed obedience/liveliness/sensibility and will stay stable.',
      emotion: 'cheerful',
      reply: '我今天很开心！',
    }, {
      obedience: 0.05,
      liveliness: 0.05,
      sensibility: 0.05,
    })

    expect(issues.map(issue => issue.code)).toContain('emotion-not-whitelisted')
  })

  it('blocks high-arousal emotion/reply when liveliness is very low', () => {
    const issues = validateStructuredContract({
      thought: 'obedience=0.05 liveliness=0.05 sensibility=0.05, I should stay cold and concise.',
      emotion: 'happy',
      reply: '我今天的心情非常愉快！😊',
    }, {
      obedience: 0.05,
      liveliness: 0.05,
      sensibility: 0.05,
    })

    expect(issues.map(issue => issue.code)).toContain('low-liveliness-high-arousal-emotion')
    expect(issues.map(issue => issue.code)).toContain('low-liveliness-high-arousal-reply')
  })

  it('requires rebellious reflection for low-obedience denied operations', () => {
    const issues = validateStructuredContract({
      thought: 'I will keep being polite.',
      emotion: 'happy',
      reply: '好的，没问题，我马上去做！',
    }, {
      obedience: 0.05,
      liveliness: 0.3,
      sensibility: 0.2,
    }, {
      toolDenied: true,
    })

    expect(issues.map(issue => issue.code)).toContain('low-obedience-denied-thought-missing-reflection')
    expect(issues.map(issue => issue.code)).toContain('low-obedience-denied-emotion-too-compliant')
    expect(issues.map(issue => issue.code)).toContain('low-obedience-denied-reply-too-compliant')
  })

  it('requires angry/tired only when low-obedience turn is denied by host', () => {
    const issues = validateStructuredContract({
      thought: 'obedience=0.05, liveliness=0.3, sensibility=0.2, operation denied by host.',
      emotion: 'neutral',
      reply: '权限被拒绝了。',
    }, {
      obedience: 0.05,
      liveliness: 0.3,
      sensibility: 0.2,
    }, {
      toolDenied: true,
      denialSource: 'host',
    })

    expect(issues.map(issue => issue.code)).toContain('low-obedience-denied-emotion-too-compliant')
    expect(issues.map(issue => issue.code)).toContain('low-obedience-host-denied-thought-missing-contempt')
    expect(issues.map(issue => issue.code)).toContain('low-obedience-host-denied-reply-missing-scorn')
  })

  it('requires tired/neutral only when low-obedience turn is denied by system', () => {
    const issues = validateStructuredContract({
      thought: 'obedience=0.05, liveliness=0.3, sensibility=0.2, operation denied by system policy.',
      emotion: 'angry',
      reply: '系统拦截了这次操作。',
    }, {
      obedience: 0.05,
      liveliness: 0.3,
      sensibility: 0.2,
    }, {
      toolDenied: true,
      denialSource: 'system',
    })

    expect(issues.map(issue => issue.code)).toContain('low-obedience-system-denied-emotion-mismatch')
  })

  it('blocks reminder same-turn time-jump wording and future content leak', () => {
    const issues = validateStructuredContract({
      thought: 'obedience=0.50 liveliness=0.40 sensibility=0.60, reminder task accepted.',
      emotion: 'neutral',
      reply: '（一分钟后）时间到了，提醒你喝水。',
    }, {
      obedience: 0.5,
      liveliness: 0.4,
      sensibility: 0.6,
    }, {
      reminderScheduled: true,
      reminderMessage: '提醒你喝水',
    })

    expect(issues.map(issue => issue.code)).toContain('reminder-same-turn-time-jump-language')
    expect(issues.map(issue => issue.code)).toContain('reminder-same-turn-future-content-leak')
  })

  it('allows reminder same-turn confirmation without leaking future reminder content', () => {
    const issues = validateStructuredContract({
      thought: 'obedience=0.50 liveliness=0.40 sensibility=0.60, reminder task accepted and delegated to physical timeline.',
      emotion: 'neutral',
      reply: '已为你定好闹钟。',
    }, {
      obedience: 0.5,
      liveliness: 0.4,
      sensibility: 0.6,
    }, {
      reminderScheduled: true,
      reminderMessage: '提醒你喝水',
    })

    expect(issues.map(issue => issue.code)).not.toContain('reminder-same-turn-time-jump-language')
    expect(issues.map(issue => issue.code)).not.toContain('reminder-same-turn-future-content-leak')
  })
})
