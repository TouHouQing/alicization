import { describe, expect, it } from 'vitest'

import { buildMindGovernedFallbackSurface } from './alicization-mind-fallback'
import { translateGovernedMindFallback } from './alicization-mind-fallback-messages'

describe('alicization-mind-fallback', () => {
  it('returns dispatch-only surface for explicit execution-bound turns', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '用 cli 命令帮我查一下桌面有什么文件',
      translate: path => path,
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'task-knot',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'unknown',
        focusAnchor: 'Desktop files',
        answerIntent: 'Run CLI listing for desktop files now.',
        openingMove: 'Execute now.',
        carriedThread: 'old screen residue',
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(surface).toEqual(expect.objectContaining({
      reply: '',
      visibleReplyMode: 'dispatch-only',
      emotion: 'thinking',
    }))
    expect(surface?.thought).toContain('obligation=guide')
  })

  it('does not author non-inspection dialogue turns even if repair residue exists', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '你好',
      translate: path => path,
      governance: {
        turnMode: 'screen-repair',
        truthState: 'uncertain',
        relationshipPosture: 'restrained',
        answerAct: 'ask-reground',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'required',
        evidenceMode: 'repair-first',
        repairState: 'need-reground',
        liveSurface: 'Code current window',
        focusAnchor: 'current-user-turn',
        answerIntent: 'Answer the host greeting directly.',
        openingMove: 'Answer the host question directly.',
        carriedThread: 'old screen residue',
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(surface).toBeNull()
  })

  it('does not author same-her-first dialogue openings through local fallback', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '继续开发',
      translate: (path, params) => {
        if (path === 'mind-fallback.answer-repair-body')
          return 'answer-repair-body'
        if (path === 'mind-fallback.dialogue-boundary-memory')
          return 'dialogue-boundary-memory'
        if (path === 'mind-fallback.answer-opening-plain')
          return 'answer-opening-plain'
        if (path === 'mind-fallback.answer-opening')
          return `Answer: ${String(params?.focus ?? '')}`
        return path
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '当前项目状态还要继续守住同一个 her',
        answerIntent: '当前未闭环的数字生命主线还要继续往前收住',
        openingMove: '先从数字生命连续性起步再展开实现进度',
        carriedThread: '项目状态 same-her continuity 仍未闭环',
        projectState: {
          identity: 'Alicization is a local-first digital life companion.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
          primaryOpenLoop: '让首句更自然地同时带出已落地进度和未闭环主线。',
          nextClosureTarget: '把已落地进展和未闭环项一起压进 final visible reply opening。',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(surface).toBeNull()
  })

  it('does not author ordinary greeting repairs through same-her fallback wording', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '你好',
      translate: (path, params) => {
        if (path === 'mind-fallback.answer-opening-plain')
          return 'Answer: plain'
        return path
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '当前项目状态还要继续守住同一个 her',
        answerIntent: '先把这一轮接成自然回复',
        openingMove: '自然地回问候，不要再把它写成模板壳',
        carriedThread: '项目状态 same-her continuity 仍未闭环',
        projectState: {
          identity: 'Alicization is a local-first digital life companion.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
          primaryOpenLoop: '让首句更自然地同时带出已落地进度和未闭环主线。',
          nextClosureTarget: '把已落地进展和未闭环项一起压进 final visible reply opening。',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(surface).toBeNull()
  })

  it('does not author ordinary dialogue replies through the governed fallback surface', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '你好',
      translate: (path, params) => {
        if (path === 'mind-fallback.answer-opening')
          return `Answer: ${String(params?.focus ?? '')}`
        if (path === 'mind-fallback.answer-opening-plain')
          return 'Answer: plain'
        if (path === 'mind-fallback.accompany-opening-plain')
          return 'Accompany: plain'
        if (path === 'mind-fallback.accompany-body')
          return 'I heard you.'
        return path
      },
      governance: {
        turnMode: 'accompany',
        truthState: 'dialogue-grounded',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        evidenceMode: 'dialogue-grounded',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '你好',
        answerIntent: 'Answer this greeting naturally.',
        openingMove: 'Use Alicization natural voice.',
        carriedThread: null,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(surface).toBeNull()
  })

  it('keeps legacy latestProgress out of local visible same-her fallback openings', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '继续开发',
      translate: (path, params) => {
        if (path === 'mind-fallback.answer-repair-body')
          return 'answer-repair-body'
        if (path === 'mind-fallback.dialogue-boundary-memory')
          return 'dialogue-boundary-memory'
        if (path === 'mind-fallback.answer-opening-plain')
          return 'answer-opening-plain'
        if (path === 'mind-fallback.answer-opening')
          return `Answer: ${String(params?.focus ?? '')}`
        return path
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '当前项目状态还要继续守住同一个 her',
        answerIntent: '当前未闭环的数字生命主线还要继续往前收住',
        openingMove: '先从数字生命连续性起步再展开实现进度',
        carriedThread: '项目状态 same-her continuity 仍未闭环',
        projectState: {
          identity: 'Alicization is a local-first digital life companion.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestProgress: 'Legacy project progress 仍然要在 fallback 开场里保住。',
          primaryOpenLoop: '让首句更自然地同时带出已落地进度和未闭环主线。',
          nextClosureTarget: '把已落地进展和未闭环项一起压进 final visible reply opening。',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
    })

    expect(surface).toBeNull()
  })

  it('keeps audit-style landedProgressSummary out of local visible same-her fallback openings', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '继续开发',
      translate: (path, params) => {
        if (path === 'mind-fallback.answer-repair-body')
          return 'answer-repair-body'
        if (path === 'mind-fallback.dialogue-boundary-memory')
          return 'dialogue-boundary-memory'
        if (path === 'mind-fallback.answer-opening-plain')
          return 'answer-opening-plain'
        if (path === 'mind-fallback.answer-opening')
          return `Answer: ${String(params?.focus ?? '')}`
        return path
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '当前项目状态还要继续守住同一个 her',
        answerIntent: '当前未闭环的数字生命主线还要继续往前收住',
        openingMove: '先从数字生命连续性起步再展开实现进度',
        carriedThread: '项目状态 same-her continuity 仍未闭环',
        projectState: {
          identity: 'Alicization is a local-first digital life companion.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: ' ',
          latestProgress: '   ',
          landedProgressSummary: 'Audit-style landed progress 也要在 fallback 开场里保住。',
          primaryOpenLoop: '让首句更自然地同时带出已落地进度和未闭环主线。',
          nextClosureTarget: '把已落地进展和未闭环项一起压进 final visible reply opening。',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      } as any,
    })

    expect(surface).toBeNull()
  })

  it('keeps rich project-aware pre-dialogue self briefs out of local visible same-her fallback openings', () => {
    const richerProjectBriefing = 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.'
    const surface = buildMindGovernedFallbackSurface({
      userText: '继续开发',
      translate: (path, params) => {
        if (path === 'mind-fallback.answer-repair-body')
          return 'answer-repair-body'
        if (path === 'mind-fallback.dialogue-boundary-memory')
          return 'dialogue-boundary-memory'
        if (path === 'mind-fallback.answer-opening-plain')
          return 'answer-opening-plain'
        if (path === 'mind-fallback.answer-opening')
          return `Answer: ${String(params?.focus ?? '')}`
        return path
      },
      governance: {
        turnMode: 'answer',
        truthState: 'dialogue-grounded',
        relationshipPosture: 'warm',
        answerAct: 'answer',
        answerSubject: 'alicization-self',
        screenReferenceMode: 'avoid',
        evidenceMode: 'continuity-carry',
        repairState: 'none',
        liveSurface: null,
        focusAnchor: '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。',
        answerIntent: '继续把这条 same-her line 守住。',
        openingMove: '别掉回普通助手壳。',
        carriedThread: '项目状态 same-her continuity 仍未闭环',
        projectState: {
          identity: 'Alicization is a local-first digital life companion.',
          currentPhase: 'Phase 1: Local Digital Life',
          preDialogueAwarenessLine: richerProjectBriefing,
          latestLandedProgress: '前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。',
          primaryOpenLoop: '让首句更自然地同时带出已落地进度和未闭环主线。',
          nextClosureTarget: '把已落地进展和未闭环项一起压进 final visible reply opening。',
          sameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the final host-visible reply.',
        },
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
    })

    expect(surface).toBeNull()
  })

  it('returns direct repair text for stream timeout, structured contract, and provider config failures', () => {
    expect(translateGovernedMindFallback('mind-repair.stream-timeout', undefined, '你好')).toBe(
      '超时了。',
    )
    expect(translateGovernedMindFallback('mind-repair.structured-contract', undefined, '你好')).toBe(
      '结构化回复失败。',
    )
    expect(translateGovernedMindFallback('mind-repair.provider-config', undefined, '你好')).toBe(
      '提供方或模型配置不完整。',
    )
  })

  it('does not append retry wording to direct repair failures', () => {
    const directFailures = [
      translateGovernedMindFallback('mind-repair.stream-timeout', undefined, '你好'),
      translateGovernedMindFallback('mind-repair.structured-contract', undefined, '你好'),
      translateGovernedMindFallback('mind-repair.provider-config', undefined, '你好'),
      translateGovernedMindFallback('mind-repair.stream-failure', undefined, '你好'),
    ]

    for (const message of directFailures) {
      expect(message).not.toMatch(/重试|retry/i)
    }
  })

  it('keeps direct repair failures terse instead of turning them back into template shells', () => {
    expect(translateGovernedMindFallback('mind-repair.stream-timeout', undefined, '你好')).toBe('超时了。')
    expect(translateGovernedMindFallback('mind-repair.stream-failure', undefined, '你好')).toBe('回复流失败。')
    expect(translateGovernedMindFallback('mind-repair.provider-config', undefined, '你好')).toBe('提供方或模型配置不完整。')
  })

  it('does not let local mind fallback paths author persona dialogue', () => {
    const fallbackPaths = [
      'mind-fallback.repair-stale-anchor',
      'mind-fallback.repair-need-reground',
      'mind-fallback.dialogue-boundary-memory',
      'mind-fallback.care-body',
      'mind-fallback.accompany-body',
      'mind-fallback.answer-repair-body',
      'mind-fallback.answer-dialogue-body',
      'mind-fallback.guide-opening',
      'mind-fallback.guide-opening-plain',
      'mind-fallback.care-opening',
      'mind-fallback.care-opening-plain',
      'mind-fallback.accompany-opening',
      'mind-fallback.accompany-opening-plain',
      'mind-fallback.observation-opening',
      'mind-fallback.observation-opening-plain',
      'mind-fallback.answer-opening',
      'mind-fallback.answer-opening-plain',
      'mind-fallback.carry-memory',
      'mind-fallback.reground-note',
    ]
    const forbiddenPersonaTemplate = /(?:我(?:直接|就贴着|现在看到|记得|还带着|还记着|先|刚才|听见|不用)|好，|先把|这句我|上一条线|同一个 her|same-her|same living line|I (?:will|still|heard|pulled|should|do not|can honestly)|Let's|All right|What I can|Then I'll|I'll answer)/iu

    for (const path of fallbackPaths) {
      const message = translateGovernedMindFallback(path, {
        focus: '当前焦点',
        carry: '旧记忆',
        landed: '已落地项',
        next: '下一步',
      }, '你好')

      expect(message, path).not.toMatch(forbiddenPersonaTemplate)
      expect(message, path).toMatch(/(?:链路|模型|fallback|grounding|可见回复|local fallback|model-authored|visible reply|grounding)/iu)
    }
  })
})
