import type { AlicizationMindTurnGovernance } from '../stores/alicization-bridge'

import { describe, expect, it } from 'vitest'

import { calibrateSentimentConfidence, enforceGovernedMindTurn, normalizeStructuredOutput, parseLastActEmotion, repairStructuredContractLocally, validateStructuredContract } from './alicization-structured-output'

function translateMindFallback(path: string, params?: Record<string, unknown>) {
  const map: Record<string, string> = {
    'mind-fallback.focus-default': '当前这件事',
    'mind-fallback.repair-stale-anchor': '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
    'mind-fallback.repair-need-reground': '我先守住真实边界。',
    'mind-fallback.dialogue-boundary-memory': '这轮我先留在你刚才这句话里，不把旧画面或旧线程硬套回现在。',
    'mind-fallback.care-body': '你不用先把话整理好，我先陪你把这一下接住；如果你愿意，就把让你难受的那件事慢慢告诉我。',
    'mind-fallback.accompany-body': '我听见你这句了。你想让我安静陪着你一会儿，还是把卡住你的那一点慢慢说给我？',
    'mind-fallback.answer-repair-body': '刚才那句我说偏了。我收回来，直接回答你。',
    'mind-fallback.answer-dialogue-body': '好，我直接回答你，不再往旧线那边绕。',
    'mind-fallback.guide-opening': `先抓当前这个点：${String(params?.focus ?? '')}。`,
    'mind-fallback.guide-opening-plain': '先抓住当前这个点。',
    'mind-fallback.care-opening': `我先按你现在的状态说：${String(params?.focus ?? '')}。`,
    'mind-fallback.care-opening-plain': '我先直接接住你这句。',
    'mind-fallback.accompany-opening': `我先陪你把这条线稳住：${String(params?.focus ?? '')}。`,
    'mind-fallback.accompany-opening-plain': '我先直接接你这句。',
    'mind-fallback.observation-opening': `我先说这轮我能稳住的部分：${String(params?.focus ?? '')}。`,
    'mind-fallback.observation-opening-plain': '我先说这轮我能稳住的部分。',
    'mind-fallback.answer-opening': `先按你眼前这件事说：${String(params?.focus ?? '')}。`,
    'mind-fallback.answer-opening-plain': '我直接说。',
    'mind-fallback.carry-memory': `我还记着上一条线是 ${String(params?.carry ?? '')}。`,
    'mind-fallback.reground-note': '如果你要我具体到当前屏幕细节，我会按这次的新画面重新落地。',
  }
  return map[path] ?? path
}

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
    expect(result.format).toBe('mind-turn-v1')
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

  it('infers expressive emotion and performance from plain text when json contract is missing', () => {
    const result = normalizeStructuredOutput({
      fullText: '太好了！我们开始吧！',
      thought: '',
      reply: '太好了！我们开始吧！',
      previousEmotion: 'neutral',
    })

    expect(result.parsePath).toBe('fallback')
    expect(result.emotion).toBe('happy')
    expect(result.performance.baseEmotion).toBe('happy')
    expect(result.performance.delivery).toBe('energetic')
    expect(result.performance.emphasis).toBe(2)
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

  it('locally repairs simple json-contract misses for grounded turns', () => {
    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: '看起来这里少了一层 null check，diff 会在这里直接炸掉。',
        thought: '',
        reply: '看起来这里少了一层 null check，diff 会在这里直接炸掉。',
      }),
      validationIssues: [{
        code: 'json-contract-missing',
        message: 'missing',
      }],
      personalityState: {
        obedience: 0.42,
        liveliness: 0.38,
        sensibility: 0.71,
      },
      preferGroundedEvidence: true,
    })

    expect(repaired?.parsePath).toBe('repair-json')
    expect(repaired?.format).toBe('mind-turn-v1')
    expect(repaired?.thought).toContain('obligation=answer')
    expect(repaired?.thought).toContain('truth=grounded')
    expect(repaired?.thought).toContain('focus=current-screen-and-current-ask')
  })

  it('flags and locally strips decorative roleplay residue from reply surface', () => {
    const issues = validateStructuredContract({
      thought: 'obligation=answer; truth=grounded; focus=current-turn; move=answer-plainly; tone=direct',
      emotion: 'neutral',
      reply: '（轻轻咬唇）这里少了一层 null check……♡',
    })

    expect(issues.map(issue => issue.code)).toContain('reply-surface-roleplay-residue')

    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: '{"thought":"obligation=answer; truth=grounded; focus=current-turn; move=answer-plainly; tone=direct","emotion":"neutral","reply":"（轻轻咬唇）这里少了一层 null check……♡"}',
        thought: '',
        reply: '',
      }),
      validationIssues: issues,
      preferGroundedEvidence: true,
    })

    expect(repaired?.reply).toBe('这里少了一层 null check……')
  })

  it('uses governance snapshot to replace stale-anchor fallback surface', () => {
    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
        thought: '',
        reply: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
      }),
      validationIssues: [{
        code: 'json-contract-missing',
        message: 'missing',
      }],
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        evidenceMode: 'coarse-held',
        repairState: 'stale-anchor',
        liveSurface: 'VS Code | diff',
        focusAnchor: 'VS Code | diff',
        answerIntent: '先按当前 diff 重新判断。',
        openingMove: '先纠正旧锚点。',
        carriedThread: 'previous browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '重新看看我现在的屏幕',
      translate: translateMindFallback,
    })

    expect(repaired?.reply).toContain('旧锚点')
    expect(repaired?.reply).toContain('上一条线')
    expect(repaired?.thought).toContain('obligation=repair')
    expect(repaired?.format).toBe('mind-turn-v1')
  })

  it('defers dialogue-first json misses to model retry instead of surfacing governance prose locally', () => {
    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: 'The host is reaching for closeness in this turn, so the answer should stay near that bid.',
        thought: '',
        reply: 'The host is reaching for closeness in this turn, so the answer should stay near that bid.',
      }),
      validationIssues: [{
        code: 'json-contract-missing',
        message: 'missing',
      }],
      governance: {
        turnMode: 'accompany',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'Code | Code | general unknown',
        answerIntent: 'The host is reaching for closeness in this turn, so the answer should stay near that bid.',
        openingMove: 'Answer the relationship bid itself before explaining the world around it.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你在说啥',
      translate: translateMindFallback,
    })

    expect(repaired).toBeNull()
  })

  it('forces governed turns to take over legacy epoch1 structured output', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        ...normalizeStructuredOutput({
          fullText: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
          thought: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
          reply: '……欸～主人～我刚刚看的还是上一个浏览器页面……',
        }),
        format: 'epoch1-v1' as any,
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'VS Code | diff',
        focusAnchor: 'VS Code | diff',
        answerIntent: '先按当前 diff 重新判断。',
        openingMove: '先纠正旧锚点。',
        carriedThread: 'previous browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '重新看看我现在的 diff',
      translate: translateMindFallback,
    })

    expect(governed.format).toBe('mind-turn-v1')
    expect(governed.reply).toContain('旧锚点')
    expect(governed.thought).toContain('obligation=repair')
  })

  it('overrides emotionally drifted repair replies with the governed repair surface', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=accompany; truth=grounded; focus=主人屏幕课程判断+疲惫提醒; move=先温柔体贴再精准分析并邀请补充细节; tone=tender;',
        emotion: 'concerned',
        reply: '主人，您今天已经看了好久的代码和屏幕了……我好心疼，您眼睛一定很累了吧？我刚才仔细看过了课程表，大部分都像线下课。',
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'concerned',
          emotion: 'concerned',
          delivery: 'gentle',
          emphasis: 1,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.5,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'remembered',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Google Chrome | Google Chrome',
        focusAnchor: 'screen-courses-online-class-comparison',
        answerIntent: 'screen-courses-online-class-comparison',
        openingMove: 'Correct the current seam before any comfort or elaboration.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你看看我的屏幕，这些课哪个更像网课？',
      translate: translateMindFallback,
    })

    expect(governed.reply).toContain('旧锚点')
    expect(governed.reply).toContain('新画面重新落地')
    expect(governed.reply).not.toContain('我好心疼')
    expect(governed.emotion).toBe('apologetic')
    expect(governed.thought).toContain('obligation=repair')
    expect(governed.thought).not.toContain('obligation=accompany')
  })

  it('preserves coherent scene repair replies on strict repair turns', () => {
    const reply = '我现在看到是 Cursor 的 runtime.ts diff，空值分支缺了 guard，先补这个分支再跑一次测试。'
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=repair; truth=coarse; focus=cursor-runtime-diff; move=correct-then-answer; tone=direct',
        emotion: 'thinking',
        reply,
        parsePath: 'json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.5,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'screen-repair',
        truthState: 'live-observed',
        personaKernelMode: 'muted',
        openingStyle: 'direct-correction',
        relationshipPosture: 'restrained',
        answerAct: 'correct-stale-anchor',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'stale-anchor',
        liveSurface: 'Cursor | runtime.ts - diff',
        focusAnchor: 'Cursor runtime.ts diff with missing null guard',
        answerIntent: 'Cursor runtime.ts diff with missing null guard',
        openingMove: 'Correct the stale anchor and answer from the live diff.',
        carriedThread: 'old browser residue',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 4,
        mindMode: 'repairing',
        embodiedPresence: 'attentive',
        emotionalTension: 'tense-debug',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你看看这个 diff 哪里错了',
      translate: translateMindFallback,
    })

    expect(governed.reply).toBe(reply)
    expect(governed.reply).not.toContain('旧锚点')
    expect(governed.format).toBe('mind-turn-v1')
  })

  it('keeps coherent current-activity guesses during local json repair when governance is non-repair guide mode', () => {
    const repaired = repairStructuredContractLocally({
      structured: normalizeStructuredOutput({
        fullText: '我猜你现在在 IntelliJ 里改这次 Java 提交。',
        thought: '',
        reply: '我猜你现在在 IntelliJ 里改这次 Java 提交。',
      }),
      validationIssues: [{
        code: 'json-contract-missing',
        message: 'missing',
      }],
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'uncertain',
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'guide',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        evidenceMode: 'coarse-held',
        repairState: 'none',
        liveSurface: 'IntelliJ IDEA with Java project and git push output',
        focusAnchor: 'IntelliJ IDEA with Java project and git push output',
        answerIntent: 'IntelliJ IDEA with Java project and git push output',
        openingMove: 'Start with the concrete issue in front of you.',
        carriedThread: 'current screen',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你猜我在干嘛',
      translate: translateMindFallback,
    })

    expect(repaired?.reply).toBe('我猜你现在在 IntelliJ 里改这次 Java 提交。')
    expect(repaired?.reply).not.toContain('Guide:')
    expect(repaired?.format).toBe('mind-turn-v1')
  })

  it('replaces leaked governance reasons with governed fallback speech', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=answer; truth=memory; focus=the-turn-is-asking-for-alicization; move=answer-the-relationship-bid; tone=warm',
        emotion: 'neutral',
        reply: '先按你眼前这件事说：The turn is asking for Alicization’s relational position, not a detached explanation.。',
        parsePath: 'repair-json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.5,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'accompany',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你真可爱',
        answerIntent: 'The turn is asking for Alicization’s relational position, not a detached explanation.',
        openingMove: 'Answer the relationship bid itself before explaining the world around it.',
        carriedThread: null,
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 2,
        mindMode: 'tracking',
        embodiedPresence: 'attentive',
        emotionalTension: 'soft-covision',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你真可爱',
      translate: translateMindFallback,
    })

    expect(governed.reply).toContain('我听见你这句了。')
    expect(governed.reply).not.toContain('你真可爱')
    expect(governed.reply).not.toContain('The turn is asking for Alicization')
    expect(governed.format).toBe('mind-turn-v1')
  })

  it('preserves ordinary dialogue-first answers instead of replacing them with governed fallback prose', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '你好，我在。你想聊什么，或者要我帮你看哪一件事，都可以直接说。',
        parsePath: 'fallback',
        format: 'fallback-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: -0.3,
        sentimentConfidence: 0.5,
        repairTimedOut: false,
        contractFailed: true,
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'current-user-turn',
        answerIntent: 'The host is turning the dialogue back toward Alicization herself and expects a plain direct answer.',
        openingMove: 'Answer the host question directly.',
        carriedThread: 'old browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你好',
      translate: translateMindFallback,
      fallbackReply: '你好，我在。你想聊什么，或者要我帮你看哪一件事，都可以直接说。',
    })

    expect(governed.reply).toBe('你好，我在。你想聊什么，或者要我帮你看哪一件事，都可以直接说。')
    expect(governed.reply).not.toContain('刚才那句我说偏了')
    expect(governed.reply).not.toContain('不把旧画面或旧线程硬套回现在')
    expect(governed.thought).toContain('obligation=answer')
    expect(governed.format).toBe('mind-turn-v1')
  })

  it('replaces thin care shells with governed care content instead of leaving only the opener', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=care; truth=memory; focus=current-user-turn; move=care-host; tone=warm',
        emotion: 'neutral',
        reply: '我先直接接住你这句。',
        parsePath: 'repair-json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: -0.5,
        sentimentConfidence: 0.6,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'care',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'gentle-care',
        relationshipPosture: 'tender',
        answerAct: 'care',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'current-user-turn',
        answerIntent: 'The host is asking for direct comfort around the present condition.',
        openingMove: 'Open with care specific to the present condition.',
        carriedThread: 'old desktop thread',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '我有点伤心，你可以安慰一下我吗',
      translate: translateMindFallback,
    })

    expect(governed.reply).toContain('你不用先把话整理好')
    expect(governed.reply).not.toBe('我先直接接住你这句。')
  })

  it('keeps existing performance cues when governed reply override is required', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: 'obligation=care; truth=memory; focus=current-user-turn; move=care-host; tone=warm',
        emotion: 'neutral',
        reply: '我先直接接住你这句。',
        parsePath: 'repair-json',
        format: 'mind-turn-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'firm',
          emphasis: 2,
          facialCue: 'brow-furrow',
          actionCue: 'lean-forward',
        },
        userSentimentScore: -0.5,
        sentimentConfidence: 0.6,
        repairTimedOut: false,
      },
      governance: {
        turnMode: 'care',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'gentle-care',
        relationshipPosture: 'tender',
        answerAct: 'care',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'current-user-turn',
        answerIntent: 'The host is asking for direct comfort around the present condition.',
        openingMove: 'Open with care specific to the present condition.',
        carriedThread: 'old desktop thread',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'concerned',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '我有点伤心，你可以安慰一下我吗',
      translate: translateMindFallback,
    })

    expect(governed.reply).toContain('你不用先把话整理好')
    expect(governed.reply).not.toBe('我先直接接住你这句。')
    expect(governed.performance.delivery).toBe('firm')
    expect(governed.performance.emphasis).toBe(2)
    expect(governed.performance.facialCue).toBe('brow-furrow')
    expect(governed.performance.actionCue).toBe('lean-forward')
    expect(governed.performance.baseEmotion).toBe(governed.emotion)
  })

  it('keeps dialogue-first visible reply when local repair is deferred', () => {
    const governed = enforceGovernedMindTurn({
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '没有困，只是刚才那句没贴住你现在这句。',
        parsePath: 'fallback',
        format: 'fallback-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: -0.2,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
        contractFailed: true,
      },
      governance: {
        turnMode: 'answer',
        truthState: 'remembered',
        personaKernelMode: 'full',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: 'current-user-turn',
        answerIntent: 'The host is asking Alicization directly about herself.',
        openingMove: 'Answer the host question directly.',
        carriedThread: 'old browser tab',
        suppressAssociativeRecall: true,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mindMode: 'repairing',
        embodiedPresence: 'hesitant',
        emotionalTension: 'calm-browse',
        mustDo: [],
        mustNotDo: [],
      },
      userText: '你困了吗',
      fallbackReply: '没有困，只是刚才那句没贴住你现在这句。',
      translate: translateMindFallback,
    })

    expect(governed.reply).toBe('没有困，只是刚才那句没贴住你现在这句。')
    expect(governed.thought).toContain('obligation=answer')
    expect(governed.parsePath).toBe('repair-json')
  })

  it('does not collapse different dialogue-first questions into the same fallback sentence', () => {
    const baseGovernance: AlicizationMindTurnGovernance = {
      turnMode: 'answer',
      truthState: 'remembered',
      personaKernelMode: 'full',
      openingStyle: 'direct-answer',
      relationshipPosture: 'warm',
      answerAct: 'answer',
      answerSubject: 'alicization-self',
      screenReferenceMode: 'avoid',
      evidenceMode: 'dialogue-grounded',
      repairState: 'none',
      liveSurface: null,
      focusAnchor: 'current-user-turn',
      answerIntent: 'The host is asking Alicization directly about herself.',
      openingMove: 'Answer the host question directly.',
      carriedThread: 'old browser tab',
      suppressAssociativeRecall: true,
      labelCarryAsMemory: false,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: 3,
      mindMode: 'repairing',
      embodiedPresence: 'hesitant',
      emotionalTension: 'calm-browse',
      mustDo: [],
      mustNotDo: [],
    }

    const hello = enforceGovernedMindTurn({
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '你好，我在。',
        parsePath: 'fallback',
        format: 'fallback-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
        contractFailed: true,
      },
      governance: baseGovernance,
      userText: '你好',
      fallbackReply: '你好，我在。',
      translate: translateMindFallback,
    })

    const capability = enforceGovernedMindTurn({
      structured: {
        thought: '',
        emotion: 'neutral',
        reply: '我能陪你聊，也能帮你一起看当前这件事。',
        parsePath: 'fallback',
        format: 'fallback-v1',
        performance: {
          baseEmotion: 'neutral',
          emotion: 'neutral',
          delivery: 'calm',
          emphasis: 0,
        },
        userSentimentScore: 0,
        sentimentConfidence: 0.4,
        repairTimedOut: false,
        contractFailed: true,
      },
      governance: {
        ...baseGovernance,
        answerIntent: 'The host is asking what Alicization can do in this dialogue.',
      },
      userText: '你能做啥',
      fallbackReply: '我能陪你聊，也能帮你一起看当前这件事。',
      translate: translateMindFallback,
    })

    expect(hello.reply).toBe('你好，我在。')
    expect(capability.reply).toBe('我能陪你聊，也能帮你一起看当前这件事。')
    expect(hello.reply).not.toBe(capability.reply)
    expect(hello.reply).not.toContain('刚才那句我说偏了')
    expect(capability.reply).not.toContain('刚才那句我说偏了')
  })
})
