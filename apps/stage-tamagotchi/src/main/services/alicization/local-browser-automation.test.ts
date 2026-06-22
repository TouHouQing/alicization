import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createAlicizationLocalBrowserAutomationService } from './local-browser-automation'

const { execFileMock, existsSyncMock, processState, shellOpenExternalMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
  existsSyncMock: vi.fn(),
  processState: {
    platform: 'darwin',
  },
  shellOpenExternalMock: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}))

vi.mock('node:fs', () => ({
  existsSync: existsSyncMock,
}))

vi.mock('node:process', () => ({
  get platform() {
    return processState.platform
  },
}))

vi.mock('electron', () => ({
  shell: {
    openExternal: shellOpenExternalMock,
  },
}))

function createService() {
  return createAlicizationLocalBrowserAutomationService({
    errorMessageFrom: error => error instanceof Error ? error.message : String(error),
  })
}

function mockExecFileOnce(stdout: string, stderr = '') {
  execFileMock.mockImplementationOnce((_command: string, _args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
    callback(null, stdout, stderr)
    return {
      on: vi.fn(),
    }
  })
}

describe('local browser automation service', () => {
  beforeEach(() => {
    processState.platform = 'darwin'
    execFileMock.mockReset()
    existsSyncMock.mockReset()
    shellOpenExternalMock.mockReset()
    shellOpenExternalMock.mockResolvedValue(undefined)
  })

  it('opens a known website in the default browser without OpenClaw', async () => {
    const service = createService()

    const result = await service.openUrl({
      browser: 'default',
      site: 'weibo',
    })

    expect(shellOpenExternalMock).toBeCalledWith('https://weibo.com')
    expect(result).toEqual(expect.objectContaining({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_open_url',
      site: 'weibo',
      url: 'https://weibo.com',
    }))
  })

  it('opens a local desktop application directly', async () => {
    const service = createService()
    mockExecFileOnce('')

    const result = await service.openApplication({
      appName: 'Cursor',
      args: ['--new-window'],
    })

    expect(execFileMock).toBeCalledWith(
      '/usr/bin/open',
      ['-a', 'Cursor', '--args', '--new-window'],
      expect.objectContaining({ timeout: 8_000 }),
      expect.any(Function),
    )
    expect(result).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_open_application',
      appName: 'Cursor',
    }))
  })

  it('searches the web by opening the engine result URL locally', async () => {
    const service = createService()

    const result = await service.searchWeb({
      browser: 'default',
      query: 'Alicization 数字生命',
      searchEngine: 'baidu',
    })

    expect(shellOpenExternalMock).toBeCalledWith('https://www.baidu.com/s?wd=Alicization+%E6%95%B0%E5%AD%97%E7%94%9F%E5%91%BD')
    expect(result).toEqual(expect.objectContaining({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_search_web',
      searchEngine: 'baidu',
    }))
  })

  it('reads structured interactables from the current browser page', async () => {
    const service = createService()
    mockExecFileOnce('https://example.com\nExample Page')
    mockExecFileOnce(JSON.stringify({
      title: 'Example Page',
      url: 'https://example.com',
      content: JSON.stringify([
        { tag: 'a', text: '首页', href: 'https://example.com/home' },
        { tag: 'button', text: '登录', href: null },
      ]),
      interactables: [
        { tag: 'a', text: '首页', href: 'https://example.com/home' },
        { tag: 'button', text: '登录', href: null },
      ],
    }))

    const result = await service.readPage({
      browser: 'chrome',
      format: 'interactables',
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_read_page',
      format: 'interactables',
      title: 'Example Page',
      url: 'https://example.com',
      interactables: expect.arrayContaining([
        expect.objectContaining({ tag: 'a', text: '首页' }),
        expect.objectContaining({ tag: 'button', text: '登录' }),
      ]),
    }))
  })

  it('clicks the first matching link by ordinal locally', async () => {
    const service = createService()
    mockExecFileOnce('https://example.com\nExample Page')
    mockExecFileOnce(JSON.stringify({
      ok: true,
      title: 'Example Page',
      url: 'https://example.com/next',
      matchedText: '首页',
    }))

    const result = await service.clickElement({
      browser: 'chrome',
      ordinal: 1,
      targetType: 'link',
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      ordinal: 1,
      targetType: 'link',
      matchedText: '首页',
      url: 'https://example.com/next',
    }))
  })

  it('types text into the current browser page and optionally submits the field', async () => {
    const service = createService()
    mockExecFileOnce('https://example.com\nExample Search')
    mockExecFileOnce(JSON.stringify({
      ok: true,
      title: 'Example Search',
      url: 'https://example.com/search?q=Alicization',
      matchedText: '搜索',
      submitted: true,
    }))

    const result = await service.typeBrowserText({
      browser: 'chrome',
      text: 'Alicization',
      targetText: '搜索',
      clearExisting: true,
      submit: true,
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_type_text',
      text: 'Alicization',
      targetText: '搜索',
      matchedText: '搜索',
      url: 'https://example.com/search?q=Alicization',
    }))
  })

  it('navigates the current browser history locally without OpenClaw', async () => {
    const service = createService() as ReturnType<typeof createAlicizationLocalBrowserAutomationService> & {
      navigateBrowser?: (input: {
        action: string
        browser?: string
      }) => Promise<Record<string, unknown>>
    }
    const navigateBrowser = service.navigateBrowser

    expect(typeof navigateBrowser).toBe('function')
    if (typeof navigateBrowser !== 'function')
      return

    mockExecFileOnce('https://example.com/search?q=Alicization\nExample Search')
    mockExecFileOnce('')
    mockExecFileOnce('https://example.com\nExample Home')

    const result = await navigateBrowser({
      browser: 'chrome',
      action: 'back',
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_navigate',
      action: 'back',
      url: 'https://example.com',
      title: 'Example Home',
    }))
  })

  it('scrolls the current browser page locally without OpenClaw', async () => {
    const service = createService() as ReturnType<typeof createAlicizationLocalBrowserAutomationService> & {
      scrollBrowser?: (input: {
        action: string
        amount?: number
        browser?: string
      }) => Promise<Record<string, unknown>>
    }
    const scrollBrowser = service.scrollBrowser

    expect(typeof scrollBrowser).toBe('function')
    if (typeof scrollBrowser !== 'function')
      return

    mockExecFileOnce('https://example.com/feed\nExample Feed')
    mockExecFileOnce(JSON.stringify({
      ok: true,
      title: 'Example Feed',
      url: 'https://example.com/feed',
      beforeY: 0,
      afterY: 960,
      viewportHeight: 960,
      documentHeight: 4800,
    }))

    const result = await scrollBrowser({
      browser: 'chrome',
      action: 'down',
      amount: 1,
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_scroll',
      action: 'down',
      amount: 1,
      url: 'https://example.com/feed',
      title: 'Example Feed',
    }))
  })

  it('waits for the current browser page to become ready locally without OpenClaw', async () => {
    const service = createService() as ReturnType<typeof createAlicizationLocalBrowserAutomationService> & {
      waitForBrowser?: (input: {
        browser?: string
        state?: string
        text?: string
        timeoutMs?: number
      }) => Promise<Record<string, unknown>>
    }
    const waitForBrowser = service.waitForBrowser

    expect(typeof waitForBrowser).toBe('function')
    if (typeof waitForBrowser !== 'function')
      return

    mockExecFileOnce('https://example.com/feed\nExample Feed')
    mockExecFileOnce(JSON.stringify({
      ok: true,
      title: 'Example Feed',
      url: 'https://example.com/feed',
      readyState: 'complete',
      matchedText: '已加载完成',
      elapsedMs: 420,
    }))

    const result = await waitForBrowser({
      browser: 'chrome',
      state: 'complete',
      text: '已加载完成',
      timeoutMs: 5_000,
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_wait',
      state: 'complete',
      text: '已加载完成',
      url: 'https://example.com/feed',
      title: 'Example Feed',
    }))
  })

  it('waits for the target desktop application to become frontmost locally without OpenClaw', async () => {
    const service = createService() as ReturnType<typeof createAlicizationLocalBrowserAutomationService> & {
      waitForDesktop?: (input: {
        appName?: string
        titleIncludes?: string
        timeoutMs?: number
      }) => Promise<Record<string, unknown>>
    }
    const waitForDesktop = service.waitForDesktop

    expect(typeof waitForDesktop).toBe('function')
    if (typeof waitForDesktop !== 'function')
      return

    mockExecFileOnce(JSON.stringify({
      ok: true,
      appName: 'Cursor',
      windowTitle: 'Composer',
    }))

    const result = await waitForDesktop({
      appName: 'Cursor',
      timeoutMs: 5_000,
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_wait',
      appName: 'Cursor',
      title: 'Composer',
    }))
  })

  it('lists interactable desktop elements from the current frontmost window', async () => {
    const service = createService()
    mockExecFileOnce(JSON.stringify({
      appName: 'Cursor',
      windowTitle: 'Composer',
      interactables: [
        { ordinal: 1, role: 'button', text: '继续', enabled: true },
        { ordinal: 2, role: 'input', text: '搜索', enabled: true },
      ],
    }))

    const result = await service.listDesktopInteractables({
      role: 'button',
      maxItems: 10,
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_list_interactables',
      role: 'button',
      foregroundWindow: expect.objectContaining({
        appName: 'Cursor',
        title: 'Composer',
      }),
      interactables: expect.arrayContaining([
        expect.objectContaining({ role: 'button', text: '继续' }),
      ]),
    }))
  })

  it('treats desktop radio controls as first-class local accessibility targets', async () => {
    const service = createService()
    execFileMock.mockImplementationOnce((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const script = args.join('\n')
      const hasRadioSupport = script.includes('radio: ["AXRadioButton"]')
        && script.includes('case "AXRadioButton": return "radio";')

      callback(null, JSON.stringify({
        appName: 'System Settings',
        windowTitle: 'Appearance',
        interactables: hasRadioSupport
          ? [
              { ordinal: 1, role: 'radio', text: '浅色模式', enabled: true },
              { ordinal: 2, role: 'radio', text: '深色模式', enabled: true },
            ]
          : [],
      }), '')
      return {
        on: vi.fn(),
      }
    })

    const listResult = await service.listDesktopInteractables({
      role: 'radio',
      maxItems: 10,
    })

    expect(listResult).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_list_interactables',
      role: 'radio',
      interactables: expect.arrayContaining([
        expect.objectContaining({ role: 'radio', text: '深色模式' }),
      ]),
    }))

    execFileMock.mockImplementationOnce((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const script = args.join('\n')
      const hasRadioSupport = script.includes('radio: ["AXRadioButton"]')
        && script.includes('case "AXRadioButton": return "radio";')

      callback(null, JSON.stringify(hasRadioSupport
        ? {
            ok: true,
            appName: 'System Settings',
            windowTitle: 'Appearance',
            matchedText: '深色模式',
            role: 'radio',
            actionTaken: 'press',
          }
        : {
            ok: false,
            appName: 'System Settings',
            windowTitle: 'Appearance',
            code: 'text-not-found',
          }), '')
      return {
        on: vi.fn(),
      }
    })

    const clickResult = await service.clickDesktopElement({
      text: '深色模式',
      role: 'radio',
    })

    expect(clickResult).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      matchedText: '深色模式',
      role: 'radio',
    }))
  })

  it('treats desktop tabs as first-class local accessibility targets when radio buttons describe tabs', async () => {
    const service = createService()
    execFileMock.mockImplementationOnce((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const script = args.join('\n')
      const hasTabSupport = script.includes('tab: ["AXRadioButton"]')
        && script.includes('if (axRole === "AXRadioButton" && /tab|标签/u.test(roleDescription)) return "tab";')

      callback(null, JSON.stringify({
        appName: 'System Settings',
        windowTitle: 'Privacy',
        interactables: hasTabSupport
          ? [
              { ordinal: 1, role: 'tab', text: '通用', enabled: true },
              { ordinal: 2, role: 'tab', text: '隐私', enabled: true },
            ]
          : [],
      }), '')
      return {
        on: vi.fn(),
      }
    })

    const listResult = await service.listDesktopInteractables({
      role: 'tab',
      maxItems: 10,
    })

    expect(listResult).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_list_interactables',
      role: 'tab',
      interactables: expect.arrayContaining([
        expect.objectContaining({ role: 'tab', text: '隐私' }),
      ]),
    }))

    execFileMock.mockImplementationOnce((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const script = args.join('\n')
      const hasTabSupport = script.includes('tab: ["AXRadioButton"]')
        && script.includes('if (axRole === "AXRadioButton" && /tab|标签/u.test(roleDescription)) return "tab";')

      callback(null, JSON.stringify(hasTabSupport
        ? {
            ok: true,
            appName: 'System Settings',
            windowTitle: 'Privacy',
            matchedText: '隐私',
            role: 'tab',
            actionTaken: 'press',
          }
        : {
            ok: false,
            appName: 'System Settings',
            windowTitle: 'Privacy',
            code: 'text-not-found',
          }), '')
      return {
        on: vi.fn(),
      }
    })

    const clickResult = await service.clickDesktopElement({
      text: '隐私',
      role: 'tab',
    })

    expect(clickResult).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      matchedText: '隐私',
      role: 'tab',
    }))
  })

  it('treats desktop list items as first-class local accessibility targets', async () => {
    const service = createService()
    execFileMock.mockImplementationOnce((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const script = args.join('\n')
      const hasListItemSupport = script.includes('"list-item": ["AXOutlineRow", "AXRow"]')
        && script.includes('case "AXOutlineRow":')
        && script.includes('return "list-item";')

      callback(null, JSON.stringify({
        appName: 'System Settings',
        windowTitle: 'Privacy',
        interactables: hasListItemSupport
          ? [
              { ordinal: 1, role: 'list-item', text: '通用', enabled: true },
              { ordinal: 2, role: 'list-item', text: '隐私', enabled: true },
            ]
          : [],
      }), '')
      return {
        on: vi.fn(),
      }
    })

    const listResult = await service.listDesktopInteractables({
      role: 'list-item',
      maxItems: 10,
    })

    expect(listResult).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_list_interactables',
      role: 'list-item',
      interactables: expect.arrayContaining([
        expect.objectContaining({ role: 'list-item', text: '隐私' }),
      ]),
    }))

    execFileMock.mockImplementationOnce((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const script = args.join('\n')
      const hasListItemSupport = script.includes('"list-item": ["AXOutlineRow", "AXRow"]')
        && script.includes('case "AXOutlineRow":')
        && script.includes('return "list-item";')

      callback(null, JSON.stringify(hasListItemSupport
        ? {
            ok: true,
            appName: 'System Settings',
            windowTitle: 'Privacy',
            matchedText: '隐私',
            role: 'list-item',
            actionTaken: 'press',
          }
        : {
            ok: false,
            appName: 'System Settings',
            windowTitle: 'Privacy',
            code: 'text-not-found',
          }), '')
      return {
        on: vi.fn(),
      }
    })

    const clickResult = await service.clickDesktopElement({
      text: '隐私',
      role: 'list-item',
    })

    expect(clickResult).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      matchedText: '隐私',
      role: 'list-item',
    }))
  })

  it('treats desktop selectors as first-class local accessibility targets', async () => {
    const service = createService()
    execFileMock.mockImplementationOnce((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const script = args.join('\n')
      const hasSelectSupport = script.includes('select: ["AXPopUpButton", "AXMenuButton"]')
        && script.includes('case "AXPopUpButton": return "select";')

      callback(null, JSON.stringify({
        appName: 'System Settings',
        windowTitle: 'Language & Region',
        interactables: hasSelectSupport
          ? [
              { ordinal: 1, role: 'select', text: '首选语言', enabled: true },
            ]
          : [],
      }), '')
      return {
        on: vi.fn(),
      }
    })

    const listResult = await service.listDesktopInteractables({
      role: 'select',
      maxItems: 10,
    })

    expect(listResult).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_list_interactables',
      role: 'select',
      interactables: expect.arrayContaining([
        expect.objectContaining({ role: 'select', text: '首选语言' }),
      ]),
    }))

    execFileMock.mockImplementationOnce((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const script = args.join('\n')
      const hasSelectSupport = script.includes('select: ["AXPopUpButton", "AXMenuButton"]')
        && script.includes('case "AXPopUpButton": return "select";')

      callback(null, JSON.stringify(hasSelectSupport
        ? {
            ok: true,
            appName: 'System Settings',
            windowTitle: 'Language & Region',
            matchedText: '首选语言',
            role: 'select',
            actionTaken: 'press',
          }
        : {
            ok: false,
            appName: 'System Settings',
            windowTitle: 'Language & Region',
            code: 'text-not-found',
          }), '')
      return {
        on: vi.fn(),
      }
    })

    const clickResult = await service.clickDesktopElement({
      text: '首选语言',
      role: 'select',
    })

    expect(clickResult).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      matchedText: '首选语言',
      role: 'select',
    }))
  })

  it('treats desktop menu buttons as selector accessibility targets', async () => {
    const service = createService()
    execFileMock.mockImplementationOnce((_command: string, args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      const script = args.join('\n')
      const hasMenuButtonSupport = script.includes('select: ["AXPopUpButton", "AXMenuButton"]')
        && script.includes('case "AXMenuButton":')
        && script.includes('case "AXPopUpButton": return "select";')

      callback(null, JSON.stringify({
        appName: 'Preview',
        windowTitle: 'Export',
        interactables: hasMenuButtonSupport
          ? [
              { ordinal: 1, role: 'select', text: '导出格式', enabled: true },
            ]
          : [],
      }), '')
      return {
        on: vi.fn(),
      }
    })

    const listResult = await service.listDesktopInteractables({
      role: 'select',
      maxItems: 10,
    })

    expect(listResult).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_list_interactables',
      role: 'select',
      interactables: expect.arrayContaining([
        expect.objectContaining({ role: 'select', text: '导出格式' }),
      ]),
    }))
  })

  it('clicks a matching desktop button locally without OpenClaw', async () => {
    const service = createService()
    mockExecFileOnce(JSON.stringify({
      ok: true,
      appName: 'Cursor',
      windowTitle: 'Confirm Dialog',
      matchedText: '继续',
      role: 'button',
      actionTaken: 'press',
    }))

    const result = await service.clickDesktopElement({
      text: '继续',
      role: 'button',
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      matchedText: '继续',
      role: 'button',
    }))
  })

  it('types text into the current desktop application after focusing a target field', async () => {
    const service = createService()
    mockExecFileOnce(JSON.stringify({
      ok: true,
      appName: 'Cursor',
      windowTitle: 'Search',
      matchedText: '搜索',
      role: 'input',
      actionTaken: 'focus',
    }))
    mockExecFileOnce('')

    const result = await service.typeDesktopText({
      text: 'Alicization',
      targetText: '搜索',
      clearExisting: true,
      submit: true,
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_type_text',
      text: 'Alicization',
      targetText: '搜索',
      matchedText: '搜索',
    }))
  })

  it('presses a desktop shortcut locally', async () => {
    const service = createService()
    mockExecFileOnce('')

    const result = await service.pressDesktopKeys({
      shortcut: 'command+l',
    })

    expect(result).toEqual(expect.objectContaining({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_press_keys',
      shortcut: 'command+l',
    }))
  })

  it('reports ready local capability channels on macOS when open exists', async () => {
    const service = createService()
    existsSyncMock.mockReturnValue(true)

    const result = await service.resolveCapabilityChannels()

    expect(result).toEqual([
      expect.objectContaining({ channel: 'browser', ready: true }),
      expect.objectContaining({ channel: 'software', ready: true }),
      expect.objectContaining({ channel: 'desktop', ready: true }),
    ])
  })
})
