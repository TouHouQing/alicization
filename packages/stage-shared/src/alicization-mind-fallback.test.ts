import { describe, expect, it } from 'vitest'

import { buildMindGovernedFallbackSurface } from './alicization-mind-fallback'

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

  it('suppresses visual repair narration for non-inspection dialogue turns even if repair residue exists', () => {
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

    expect(surface).toEqual(expect.objectContaining({
      emotion: 'thinking',
    }))
    expect(surface?.reply).not.toContain('repair-stale-anchor')
    expect(surface?.reply).not.toContain('repair-need-reground')
    expect(surface?.reply).not.toContain('carry-memory')
    expect(surface?.reply).not.toContain('reground-note')
  })

  it('prefers a same-her-first opening on dialogue-first turns when project-state continuity is still the active carried thread', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '继续开发',
      translate: (path, params) => {
        if (path === 'mind-fallback.answer-opening-same-her-first')
          return `Same-her first: ${String(params?.focus ?? '')} | Landed: ${String(params?.landed ?? '')} | Next: ${String(params?.next ?? '')}`
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

    expect(surface?.reply).toContain('Same-her first: 当前项目状态还要继续守住同一个 her')
    expect(surface?.reply).toContain('Landed: 前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。')
    expect(surface?.reply).toContain('Next: 把已落地进展和未闭环项一起压进 final visible reply opening。')
  })

  it('keeps legacy latestProgress alive in same-her-first fallback openings when governance project-state still uses the older field name', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '继续开发',
      translate: (path, params) => {
        if (path === 'mind-fallback.answer-opening-same-her-first')
          return `Same-her first: ${String(params?.focus ?? '')} | Landed: ${String(params?.landed ?? '')} | Next: ${String(params?.next ?? '')}`
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

    expect(surface?.reply).toContain('Same-her first: 当前项目状态还要继续守住同一个 her')
    expect(surface?.reply).toContain('Landed: Legacy project progress 仍然要在 fallback 开场里保住。')
    expect(surface?.reply).toContain('Next: 把已落地进展和未闭环项一起压进 final visible reply opening。')
  })

  it('keeps audit-style landedProgressSummary alive in same-her-first fallback openings when explicit landed-progress slots are blank', () => {
    const surface = buildMindGovernedFallbackSurface({
      userText: '继续开发',
      translate: (path, params) => {
        if (path === 'mind-fallback.answer-opening-same-her-first')
          return `Same-her first: ${String(params?.focus ?? '')} | Landed: ${String(params?.landed ?? '')} | Next: ${String(params?.next ?? '')}`
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

    expect(surface?.reply).toContain('Same-her first: 当前项目状态还要继续守住同一个 her')
    expect(surface?.reply).toContain('Landed: Audit-style landed progress 也要在 fallback 开场里保住。')
    expect(surface?.reply).toContain('Next: 把已落地进展和未闭环项一起压进 final visible reply opening。')
  })

  it('prefers a richer project-aware pre-dialogue self brief over a thin same-her focus shell in same-her-first fallback openings', () => {
    const richerProjectBriefing = 'Before speaking, remember what this digital life project is, what has landed, and which life loop is still open.'
    const surface = buildMindGovernedFallbackSurface({
      userText: '继续开发',
      translate: (path, params) => {
        if (path === 'mind-fallback.answer-opening-same-her-first')
          return `Same-her first: ${String(params?.focus ?? '')} | Landed: ${String(params?.landed ?? '')} | Next: ${String(params?.next ?? '')}`
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

    expect(surface?.reply).toContain(`Same-her first: ${richerProjectBriefing}`)
    expect(surface?.reply).toContain('Landed: 前台摘要、发送前 awareness 和 same-her-first prompt strategy 已经接进主对话链路。')
    expect(surface?.reply).toContain('Next: 把已落地进展和未闭环项一起压进 final visible reply opening。')
  })
})
