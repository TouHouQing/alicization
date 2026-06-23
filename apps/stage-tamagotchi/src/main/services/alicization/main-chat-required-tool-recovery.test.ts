import type { Message } from '@xsai/shared-chat'

import { describe, expect, it, vi } from 'vitest'

import { recoverAlicizationRequiredToolDeterministically } from './main-chat-required-tool-recovery'

function createRecoveryInput(overrides?: {
  messages?: Message[]
  requiredToolNames?: string[]
  tools?: Array<{
    function?: { name?: string }
    execute?: (input: Record<string, unknown>) => Promise<unknown> | unknown
  }>
}) {
  return {
    cardId: 'card-local-tool',
    turnId: 'turn-local-tool',
    messages: overrides?.messages ?? [{ role: 'user', content: '帮我百度 Alicization 数字生命' }],
    requiredToolNames: overrides?.requiredToolNames ?? ['browser_search_web'],
    tools: overrides?.tools ?? [],
    emitToolCall: vi.fn(),
    emitToolResult: vi.fn(),
  }
}

describe('main chat required tool recovery', () => {
  it('infers browser search input for local browser recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Searched the web for Alicization 数字生命.',
      output: 'https://www.baidu.com/s?wd=Alicization+%E6%95%B0%E5%AD%97%E7%94%9F%E5%91%BD',
    }))
    const input = createRecoveryInput({
      tools: [{
        function: { name: 'browser_search_web' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      query: 'Alicization 数字生命',
      searchEngine: 'baidu',
      browser: 'default',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_search_web',
    }))
  })

  it('infers browser search input with workflow continuation when the user asks to keep searching afterward', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Searched the web for Alicization.',
      output: 'https://www.baidu.com/s?wd=Alicization',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '帮我百度 Alicization 然后继续找最相关结果' }],
      requiredToolNames: ['browser_search_web'],
      tools: [{
        function: { name: 'browser_search_web' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      query: 'Alicization',
      searchEngine: 'baidu',
      browser: 'default',
      expectedPhase: 'search-results',
      reinspectAfterAction: true,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
      inspectionQuestion: '帮我百度 Alicization 然后继续找最相关结果',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_search_web',
    }))
  })

  it('infers about:blank browser opening input when no URL is provided', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Opened chrome.',
      output: 'about:blank',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '打开浏览器' }],
      requiredToolNames: ['browser_open_url'],
      tools: [{
        function: { name: 'browser_open_url' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      url: 'about:blank',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_open_url',
    }))
  })

  it('infers known website browser opening input when a site name is provided', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Opened Weibo in default browser.',
      output: 'https://weibo.com',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '打开微博' }],
      requiredToolNames: ['browser_open_url'],
      tools: [{
        function: { name: 'browser_open_url' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      site: 'weibo',
      url: 'https://weibo.com',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_open_url',
    }))
  })

  it('infers known website browser opening input with workflow continuation when the user asks to continue after opening', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Opened Weibo in default browser.',
      output: 'https://weibo.com',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '打开微博然后继续发微博' }],
      requiredToolNames: ['browser_open_url'],
      tools: [{
        function: { name: 'browser_open_url' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      site: 'weibo',
      url: 'https://weibo.com',
      expectedPhase: 'social-feed',
      reinspectAfterAction: true,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
      inspectionQuestion: '打开微博然后继续发微博',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_open_url',
    }))
  })

  it('infers desktop application opening input for local application recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'desktop',
      summary: 'Opened application Cursor.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '打开 Cursor' }],
      requiredToolNames: ['desktop_open_application'],
      tools: [{
        function: { name: 'desktop_open_application' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      appName: 'Cursor',
      args: [],
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'desktop_open_application',
    }))
  })

  it('infers desktop wait input for local application stabilization recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'desktop',
      summary: 'Waited for desktop target Cursor.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '等待 Cursor 打开' }],
      requiredToolNames: ['desktop_wait'],
      tools: [{
        function: { name: 'desktop_wait' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      appName: 'Cursor',
      timeoutMs: 5_000,
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'desktop_wait',
    }))
  })

  it('infers browser click text input for natural click recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Clicked browser element 登录.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '点击当前网页的登录按钮' }],
      requiredToolNames: ['browser_click_element'],
      tools: [{
        function: { name: 'browser_click_element' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      text: '登录',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_click_element',
    }))
  })

  it('infers browser click ordinal input for natural ordered link recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Clicked browser element 第一个链接.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '点击当前网页的第一个链接' }],
      requiredToolNames: ['browser_click_element'],
      tools: [{
        function: { name: 'browser_click_element' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      ordinal: 1,
      targetType: 'link',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_click_element',
    }))
  })

  it('infers browser type input for natural current-page form filling recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Typed text into browser field 搜索.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '在当前网页的搜索框里输入 "Alicization" 并回车' }],
      requiredToolNames: ['browser_type_text'],
      tools: [{
        function: { name: 'browser_type_text' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      text: 'Alicization',
      targetText: '搜索',
      clearExisting: false,
      submit: true,
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_type_text',
    }))
  })

  it('infers browser navigation input for natural history recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Navigated the browser back.',
      output: 'https://example.com/previous',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '返回上一页' }],
      requiredToolNames: ['browser_navigate'],
      tools: [{
        function: { name: 'browser_navigate' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      action: 'back',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_navigate',
    }))
  })

  it('infers browser scroll input for natural page continuation recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Scrolled browser down.',
      output: 'https://example.com/feed',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '向下滚动当前网页' }],
      requiredToolNames: ['browser_scroll'],
      tools: [{
        function: { name: 'browser_scroll' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      action: 'down',
      amount: 1,
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_scroll',
    }))
  })

  it('infers browser wait input for natural page stabilization recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Waited for browser page readiness.',
      output: 'https://example.com/feed',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '等待当前网页加载完成' }],
      requiredToolNames: ['browser_wait'],
      tools: [{
        function: { name: 'browser_wait' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      state: 'complete',
      timeoutMs: 5_000,
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_wait',
    }))
  })

  it('infers interactables browser read input for current-page browsing recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Listed browser page interactables.',
      output: '[{"tag":"button","text":"登录"}]',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '看看当前网页有哪些按钮和链接' }],
      requiredToolNames: ['browser_read_page'],
      tools: [{
        function: { name: 'browser_read_page' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      format: 'interactables',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_read_page',
    }))
  })

  it('infers interactables browser read input for current-page next-step guidance recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Read browser interactables for next-step guidance.',
      output: '[{"tag":"button","text":"继续"}]',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '看看当前网页下一步该点哪里' }],
      requiredToolNames: ['browser_read_page'],
      tools: [{
        function: { name: 'browser_read_page' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      format: 'interactables',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_read_page',
    }))
  })

  it('infers interactables browser read input for known-website next-step guidance recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Read weibo interactables for next-step guidance.',
      output: '[{"tag":"button","text":"发微博"}]',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '帮我判断微博下一步该点什么' }],
      requiredToolNames: ['browser_read_page'],
      tools: [{
        function: { name: 'browser_read_page' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      format: 'interactables',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_read_page',
    }))
  })

  it('infers interactables browser read input for known-website continuation recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'browser',
      summary: 'Read weibo compose interactables for continuation.',
      output: '[{"tag":"textarea","text":"有什么新鲜事想分享给大家？"}]',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '帮我继续发微博' }],
      requiredToolNames: ['browser_read_page'],
      tools: [{
        function: { name: 'browser_read_page' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'default',
      format: 'interactables',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'browser_read_page',
    }))
  })

  it('infers desktop scene inspection input for current-screen observation recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'desktop',
      summary: 'Inspected current desktop scene.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '看看现在屏幕上是什么' }],
      requiredToolNames: ['desktop_inspect_scene'],
      tools: [{
        function: { name: 'desktop_inspect_scene' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      question: '看看现在屏幕上是什么',
      forceRefresh: false,
      maxSuggestedActions: 3,
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'desktop_inspect_scene',
    }))
  })

  it('infers richer desktop scene inspection input for next-step click guidance recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'desktop',
      summary: 'Inspected current desktop scene and suggested next actions.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '帮我判断下一步该点什么' }],
      requiredToolNames: ['desktop_inspect_scene'],
      tools: [{
        function: { name: 'desktop_inspect_scene' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      question: '帮我判断下一步该点什么',
      forceRefresh: false,
      maxSuggestedActions: 5,
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'desktop_inspect_scene',
    }))
  })

  it('infers desktop scene continuation input for upload recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'desktop',
      summary: 'Continued the current desktop upload flow.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '帮我继续上传' }],
      requiredToolNames: ['desktop_inspect_scene'],
      tools: [{
        function: { name: 'desktop_inspect_scene' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      question: '帮我继续上传',
      forceRefresh: false,
      maxSuggestedActions: 5,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'desktop_inspect_scene',
    }))
  })

  it('infers desktop interactable listing input for current-window button browsing recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'desktop',
      summary: 'Listed desktop interactables.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '看看当前窗口有哪些按钮' }],
      requiredToolNames: ['desktop_list_interactables'],
      tools: [{
        function: { name: 'desktop_list_interactables' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      role: 'button',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'desktop_list_interactables',
    }))
  })

  it('infers desktop click input for current-window button recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'desktop',
      summary: 'Clicked desktop element 继续.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '点击当前窗口的继续按钮' }],
      requiredToolNames: ['desktop_click_element'],
      tools: [{
        function: { name: 'desktop_click_element' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      text: '继续',
      role: 'button',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'desktop_click_element',
    }))
  })

  it('infers desktop text input for current-window typing recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'desktop',
      summary: 'Typed into the current desktop window.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '在当前窗口输入 "Alicization"' }],
      requiredToolNames: ['desktop_type_text'],
      tools: [{
        function: { name: 'desktop_type_text' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Alicization',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'desktop_type_text',
    }))
  })

  it('infers desktop shortcut input for key-press recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'desktop',
      summary: 'Pressed desktop shortcut Command+L.',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '按下 Command+L' }],
      requiredToolNames: ['desktop_press_keys'],
      tools: [{
        function: { name: 'desktop_press_keys' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      shortcut: 'command+l',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'desktop_press_keys',
    }))
  })

  it('infers dedicated local visual executor input for explicit local gui recovery', async () => {
    const execute = vi.fn(async () => ({
      status: 'completed',
      channel: 'desktop',
      summary: 'Dismissed the blocking popup through the dedicated local GUI executor.',
      output: 'popup dismissed',
    }))
    const input = createRecoveryInput({
      messages: [{ role: 'user', content: '不要用 OpenClaw，直接用本地 GUI 多步执行把当前桌面弹窗关掉' }],
      requiredToolNames: ['executor_run_local_visual'],
      tools: [{
        function: { name: 'executor_run_local_visual' },
        execute,
      }],
    })

    await recoverAlicizationRequiredToolDeterministically(input)

    expect(execute).toHaveBeenCalledWith(expect.objectContaining({
      instruction: '不要用 OpenClaw，直接用本地 GUI 多步执行把当前桌面弹窗关掉',
      kind: 'desktop-automation',
      effect: 'observe',
    }))
    expect(input.emitToolCall).toHaveBeenCalledWith(expect.objectContaining({
      toolName: 'executor_run_local_visual',
    }))
  })
})
