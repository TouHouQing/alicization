import { describe, expect, it } from 'vitest'

import {
  analyzeAlicizationExecutionTurnAuthority,
  collectAlicizationExecutionChannelMentions,
  detectAlicizationExecutionCapabilityInquiry,
  detectAlicizationExecutionRoutingIntent,
  hasExplicitAlicizationExecutionDemand,
} from './alicization-execution-intent'

describe('alicization execution intent', () => {
  it('detects capability inquiries without routing them as execution', () => {
    const inquiry = detectAlicizationExecutionCapabilityInquiry('你能不能用 CLI 和 Codex？')
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '你能不能用 CLI 和 Codex？',
      capabilityInquiry: inquiry,
    })

    expect(inquiry.capabilityQuestion).toBe(true)
    expect(inquiry.mentionedChannels).toEqual(expect.arrayContaining(['cli', 'codex']))
    expect(routing).toBeNull()
  })

  it.each([
    '你可以使用codex吗',
    '你可以用 codex 吗',
    '你会使用 Codex 吗',
    '你能不能使用 Codex',
  ])('treats natural Codex capability question "%s" as dialogue instead of execution', (message) => {
    const inquiry = detectAlicizationExecutionCapabilityInquiry(message)
    const routing = detectAlicizationExecutionRoutingIntent({
      message,
      capabilityInquiry: inquiry,
    })

    expect(inquiry.capabilityQuestion).toBe(true)
    expect(inquiry.mentionedChannels).toContain('codex')
    expect(routing).toBeNull()
  })

  it('keeps an explicit Codex task request on the execution route', () => {
    const message = '你可以使用 Codex 帮我修复这个 bug 吗'
    const inquiry = detectAlicizationExecutionCapabilityInquiry(message)
    const routing = detectAlicizationExecutionRoutingIntent({
      message,
      capabilityInquiry: inquiry,
    })

    expect(inquiry.capabilityQuestion).toBe(false)
    expect(routing?.requestedChannels).toEqual(['codex'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_codex'])
  })

  it('routes explicit CLI execution requests with channel mentions', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '请用 CLI 执行 pnpm -F @proj-alicization/stage-tamagotchi typecheck',
    })

    expect(routing?.requestedChannels).toEqual(['cli'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_cli'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'action-verb', 'request-frame']))
  })

  it('routes colloquial Chinese CLI requests that use 找一下 phrasing', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '用cli帮我找一下桌面有什么文件',
    })

    expect(routing?.requestedChannels).toEqual(['cli'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_cli'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'action-verb', 'request-frame']))
  })

  it('routes channel-directed imperative phrasing without relying on action verb dictionary', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: 'Use Claude Code to continue the runtime refactor.',
    })

    expect(routing?.requestedChannels).toEqual(['claude-code'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_claude_code'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'request-frame', 'semantic-execution-signal']))
  })

  it('defaults to CLI routing when action + command literal are present without explicit channel mention', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '帮我执行 `pnpm -F @proj-alicization/stage-tamagotchi typecheck`',
    })

    expect(routing?.requestedChannels).toEqual(['cli'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_cli'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['command-literal', 'default-cli-from-command-structure']))
  })

  it('does not route when only command literal appears without action intent', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: 'pnpm -F @proj-alicization/stage-tamagotchi typecheck',
    })
    expect(routing).toBeNull()
  })

  it('does not route plain channel mention without request semantics', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: 'CLI 最近看起来不太稳定。',
    })
    expect(routing).toBeNull()
  })

  it('distinguishes explicit execution demand from capability questions', () => {
    const capabilitySignals = analyzeAlicizationExecutionTurnAuthority('你能不能用 CLI 和 Codex？')
    const executionSignals = analyzeAlicizationExecutionTurnAuthority('用 cli 命令帮我查一下桌面有什么文件')

    expect(hasExplicitAlicizationExecutionDemand(capabilitySignals.semanticSignals)).toBe(false)
    expect(capabilitySignals.executionBound).toBe(false)
    expect(hasExplicitAlicizationExecutionDemand(executionSignals.semanticSignals)).toBe(true)
    expect(executionSignals.executionBound).toBe(true)
    expect(executionSignals.reasonCodes).toEqual(expect.arrayContaining([
      'execution-bound-turn',
      'explicit-execution-demand',
      'mentioned-dispatch:cli',
    ]))
  })

  it('keeps an imperative fallback path when semantic execution scoring misses', () => {
    const authority = analyzeAlicizationExecutionTurnAuthority('麻烦你帮我重构一下这个模块')

    expect(authority.semanticSignals.hasExecutionSignal).toBe(false)
    expect(authority.fallbackImperative).toBe(true)
    expect(authority.executionBound).toBe(true)
    expect(authority.reasonCodes).toContain('fallback-imperative-request')
  })

  it('routes explicit openclaw execution requests with channel mentions', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '请用 OpenClaw 帮我关闭当前屏幕上的弹窗',
    })

    expect(routing?.requestedChannels).toEqual(['openclaw'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_openclaw'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'action-verb', 'request-frame']))
  })

  it('routes direct browser URL opening into the local browser tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '请打开浏览器访问 https://example.com',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_open_url'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb', 'request-frame']))
  })

  it('routes direct browser opening without a URL into the local browser tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '打开浏览器',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_open_url'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes known website opening requests into the local browser tool instead of desktop app opening', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '打开微博',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_open_url'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
    expect(routing?.toolInputOverrides).toBeUndefined()
  })

  it('routes direct web search requests into the local browser search tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '帮我百度 Alicization 数字生命',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_search_web'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb', 'request-frame']))
    expect(routing?.toolInputOverrides).toBeUndefined()
  })

  it('keeps browser-open workflow continuation overrides on known-site continuation requests', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '打开微博然后继续发微博',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_open_url'])
    expect(routing?.toolInputOverrides).toEqual({
      browser_open_url: {
        browser: 'default',
        site: 'weibo',
        url: 'https://weibo.com',
        expectedPhase: 'social-feed',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 2,
        inspectionQuestion: '打开微博然后继续发微博',
      },
    })
  })

  it('keeps browser-search workflow continuation overrides on follow-up search requests', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '帮我百度 Alicization 然后继续找最相关结果',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_search_web'])
    expect(routing?.toolInputOverrides).toEqual({
      browser_search_web: {
        browser: 'default',
        searchEngine: 'baidu',
        query: 'Alicization',
        expectedPhase: 'search-results',
        reinspectAfterAction: true,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 2,
        inspectionQuestion: '帮我百度 Alicization 然后继续找最相关结果',
      },
    })
  })

  it('routes current-page reading requests into the local browser read tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '读一下当前网页内容',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_read_page'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes current-page interactable browsing requests into the local browser read tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '看看当前网页有哪些按钮和链接',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_read_page'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes current-page next-step click guidance into the local browser read tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '看看当前网页下一步该点哪里',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_read_page'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes judged current-page next-step guidance into the local browser read tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '帮我判断当前网页下一步该点什么',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_read_page'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb', 'request-frame']))
  })

  it('routes known-website next-step guidance into the local browser read tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '帮我判断微博下一步该点什么',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_read_page'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb', 'request-frame']))
  })

  it('routes known-website continuation requests into the local browser read tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '帮我继续发微博',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_read_page'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb', 'request-frame']))
  })

  it('routes known-website observation guidance into the local browser read tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '看看微博首页现在该点哪里',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_read_page'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes natural button click requests into the local browser click tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '点击当前网页的登录按钮',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_click_element'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes current-page text input requests into the local browser typing tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '在当前网页的搜索框里输入 "Alicization" 并回车',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_type_text'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes direct browser navigation requests into the local browser navigation tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '返回当前网页上一页',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_navigate'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes direct browser scrolling requests into the local browser scroll tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '向下滚动当前网页',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_scroll'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes direct browser waiting requests into the local browser wait tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '等待当前网页加载完成',
    })

    expect(routing?.requestedChannels).toEqual(['browser'])
    expect(routing?.requiredToolNames).toEqual(['browser_wait'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes current desktop scene inspection requests into the local inspection tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '看看现在屏幕上是什么',
    })

    expect(routing?.requestedChannels).toEqual(['desktop'])
    expect(routing?.requiredToolNames).toEqual(['desktop_inspect_scene'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes next-step gui guidance requests into the local inspection tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '帮我判断下一步该点什么',
    })

    expect(routing?.requestedChannels).toEqual(['desktop'])
    expect(routing?.requiredToolNames).toEqual(['desktop_inspect_scene'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb', 'request-frame']))
    expect(routing?.toolInputOverrides).toEqual({
      desktop_inspect_scene: {
        question: '帮我判断下一步该点什么',
        forceRefresh: false,
        maxSuggestedActions: 5,
      },
    })
  })

  it('routes desktop upload continuation requests into the local inspection tool with workflow overrides', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '帮我继续上传',
    })

    expect(routing?.requestedChannels).toEqual(['desktop'])
    expect(routing?.requiredToolNames).toEqual(['desktop_inspect_scene'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb', 'request-frame']))
    expect(routing?.toolInputOverrides).toEqual({
      desktop_inspect_scene: {
        question: '帮我继续上传',
        forceRefresh: false,
        maxSuggestedActions: 5,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 2,
      },
    })
  })

  it('routes continued gui next-step guidance requests into the local inspection tool with workflow overrides', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '继续看看当前窗口下一步该点什么',
    })

    expect(routing?.requestedChannels).toEqual(['desktop'])
    expect(routing?.requiredToolNames).toEqual(['desktop_inspect_scene'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
    expect(routing?.toolInputOverrides).toEqual({
      desktop_inspect_scene: {
        question: '继续看看当前窗口下一步该点什么',
        forceRefresh: false,
        maxSuggestedActions: 5,
        autoContinueSuggestedActions: true,
        maxAutoContinueSteps: 2,
      },
    })
  })

  it('routes direct local application opening into the desktop tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '打开 Cursor',
    })

    expect(routing?.requestedChannels).toEqual(['desktop'])
    expect(routing?.requiredToolNames).toEqual(['desktop_open_application'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes direct local desktop waiting requests into the desktop wait tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '等待 Cursor 打开',
    })

    expect(routing?.requestedChannels).toEqual(['desktop'])
    expect(routing?.requiredToolNames).toEqual(['desktop_wait'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes desktop interactable listing requests into the local desktop listing tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '看看当前窗口有哪些按钮',
    })

    expect(routing?.requestedChannels).toEqual(['desktop'])
    expect(routing?.requiredToolNames).toEqual(['desktop_list_interactables'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes desktop click requests into the local desktop click tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '点击当前窗口的继续按钮',
    })

    expect(routing?.requestedChannels).toEqual(['desktop'])
    expect(routing?.requiredToolNames).toEqual(['desktop_click_element'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes desktop text input requests into the local desktop typing tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '在当前窗口输入 "Alicization"',
    })

    expect(routing?.requestedChannels).toEqual(['desktop'])
    expect(routing?.requiredToolNames).toEqual(['desktop_type_text'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('routes desktop shortcut requests into the local desktop key-press tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '按下 Command+L',
    })

    expect(routing?.requestedChannels).toEqual(['desktop'])
    expect(routing?.requiredToolNames).toEqual(['desktop_press_keys'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb']))
  })

  it('keeps explicit openclaw routing when the host explicitly names OpenClaw for scene inspection', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '请用 OpenClaw 看看现在屏幕上是什么',
    })

    expect(routing?.requestedChannels).toEqual(['openclaw'])
    expect(routing?.requiredToolNames).toEqual(['executor_run_openclaw'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['channel-mentioned', 'action-verb']))
  })

  it('routes explicit local visual executor requests into the dedicated local visual executor tool', () => {
    const routing = detectAlicizationExecutionRoutingIntent({
      message: '不要用 OpenClaw，请直接用本地 GUI 多步执行把当前桌面的弹窗关掉',
    })

    expect(routing?.requiredToolNames).toEqual(['executor_run_local_visual'])
    expect(routing?.reasonCodes).toEqual(expect.arrayContaining(['action-verb', 'local-visual-explicit']))
  })

  it('collects extended channel mentions for capability focus', () => {
    const channels = collectAlicizationExecutionChannelMentions('你支持 OpenClaw、Browser 和桌面操作吗？')
    expect(channels).toEqual(expect.arrayContaining(['openclaw', 'browser', 'desktop']))
  })
})
