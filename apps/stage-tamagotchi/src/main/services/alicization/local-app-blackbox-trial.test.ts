import { EventEmitter } from 'node:events'

import { describe, expect, it, vi } from 'vitest'

import {
  createPlaywrightLocalAppBlackboxAutomation,
  isLocalAppMainRendererUrl,
  localAppIconButtonXPath,
  navigateLocalAppPageToHashRoute,
  parseLocalAppBlackboxTrialArgs,
  readRuntimeDebugTraceSince,
  resolveLocalAppChatTurnState,
  runLocalAppBlackboxTrial,
} from '../../../../scripts/local-app-blackbox-trial-runtime'

describe('local macOS app blackbox trial', () => {
  it('filters runtime debug JSONL by trial start and preserves malformed evidence', async () => {
    const trace = await readRuntimeDebugTraceSince(
      '/tmp/runtime-debug.log',
      Date.parse('2026-08-29T06:00:00.000Z'),
      async () => [
        '{"ts":"2026-08-29T05:59:59.000Z","event":"old"}',
        '{"ts":"2026-08-29T06:00:01.000Z","event":"chat-start.accepted"}',
        'not-json',
      ].join('\n'),
    )

    expect(trace).toEqual([
      {
        ts: '2026-08-29T06:00:01.000Z',
        event: 'chat-start.accepted',
      },
      {
        event: 'runtime-debug.parse-failed',
        raw: 'not-json',
      },
    ])
  })

  it('launches the installed app with remote debugging enabled and owns only the process it started', async () => {
    const child = new EventEmitter() as EventEmitter & {
      pid: number
      stdout: EventEmitter
      stderr: EventEmitter
      killed: boolean
      kill: ReturnType<typeof vi.fn>
    }
    child.pid = 1234
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.killed = false
    child.kill = vi.fn(() => {
      child.killed = true
      return true
    })
    const spawn = vi.fn(() => child as never)
    const automation = createPlaywrightLocalAppBlackboxAutomation({
      args: {
        appPath: '/Users/alice/Applications/Alicization Local.app',
        userDataPath: '/tmp/alicization',
        outputDir: '/tmp/blackbox',
        remoteDebugPort: 9333,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: [],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
      },
      spawn,
      pathExists: () => true,
      connectOverCDP: vi.fn(),
    })

    await expect(automation.launch()).resolves.toEqual({ pid: 1234 })
    expect(spawn).toHaveBeenCalledWith(
      '/Users/alice/Applications/Alicization Local.app/Contents/MacOS/alicization',
      [
        '--user-data-dir',
        '/tmp/alicization',
      ],
      expect.objectContaining({
        env: expect.objectContaining({
          ALICIZATION_USER_DATA_PATH: '/tmp/alicization',
          APP_REMOTE_DEBUG: 'true',
          APP_REMOTE_DEBUG_PORT: '9333',
        }),
      }),
    )

    await automation.close()
    expect(child.kill).toHaveBeenCalledWith('SIGTERM')
  })

  it('identifies only the stage root as the main renderer window', () => {
    expect(isLocalAppMainRendererUrl(
      'file:///Applications/Alicization.app/Contents/Resources/app.asar/out/renderer/index.html#/',
    )).toBe(true)
    expect(isLocalAppMainRendererUrl(
      'file:///Applications/Alicization.app/Contents/Resources/app.asar/out/renderer/beat-sync.html',
    )).toBe(false)
    expect(isLocalAppMainRendererUrl(
      'file:///Applications/Alicization.app/Contents/Resources/app.asar/out/renderer/index.html#/chat',
    )).toBe(false)
    expect(isLocalAppMainRendererUrl(
      'file:///Applications/Alicization.app/Contents/Resources/app.asar/out/renderer/index.html#/settings',
    )).toBe(false)
  })

  it('locates UnoCSS icon buttons by their rendered attribute name', () => {
    expect(localAppIconButtonXPath('i-solar:chat-line-line-duotone')).toBe(
      'xpath=//button[descendant::*[@*[name()="i-solar:chat-line-line-duotone"]]]',
    )
  })

  it('does not settle a turn when only the optimistic user bubble changed', () => {
    expect(resolveLocalAppChatTurnState({
      before: {
        assistantCount: 2,
        assistantText: '上一轮回复',
        errorCount: 0,
        errorText: '',
      },
      current: {
        assistantCount: 2,
        assistantText: '上一轮回复',
        errorCount: 0,
        errorText: '',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
    })).toEqual({
      status: 'pending',
      error: null,
    })
  })

  it('settles only after a new assistant reply or a new infrastructure error becomes stable', () => {
    const before = {
      assistantCount: 2,
      assistantText: '上一轮回复',
      errorCount: 0,
      errorText: '',
    }
    expect(resolveLocalAppChatTurnState({
      before,
      current: {
        assistantCount: 3,
        assistantText: '这一轮真实回复',
        errorCount: 0,
        errorText: '',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
    })).toEqual({
      status: 'completed',
      error: null,
    })
    expect(resolveLocalAppChatTurnState({
      before,
      current: {
        assistantCount: 2,
        assistantText: '上一轮回复',
        errorCount: 1,
        errorText: 'Provider 请求失败（HTTP 503）。',
      },
      inputValue: '',
      stopVisible: false,
      stableForMs: 1_000,
    })).toEqual({
      status: 'failed',
      error: 'Provider 请求失败（HTTP 503）。',
    })
  })

  it('waits for a renderer mount before navigating its hash route', async () => {
    const calls: string[] = []
    const page = {
      waitForLoadState: vi.fn(async () => {
        calls.push('load')
      }),
      waitForFunction: vi.fn(async () => {
        calls.push('mount')
      }),
      evaluate: vi.fn(async () => {
        calls.push('navigate')
      }),
      waitForURL: vi.fn(async () => {
        calls.push('url')
      }),
      url: vi.fn(() => 'file:///app/index.html#/settings/modules/memory'),
    }

    await navigateLocalAppPageToHashRoute(
      page as never,
      '/settings/modules/memory',
      45_000,
    )

    expect(calls).toEqual(['load', 'mount', 'navigate', 'url'])
  })

  it('provides novice-safe installed app and artifact defaults', () => {
    expect(parseLocalAppBlackboxTrialArgs([], {
      homeDir: '/Users/alice',
      now: () => Date.parse('2026-08-29T06:00:00.000Z'),
    })).toEqual({
      appPath: '/Users/alice/Applications/Alicization Local.app',
      userDataPath: '/Users/alice/Library/Application Support/com.tohoqing.alicization',
      outputDir: '/Users/alice/Desktop/Alicization-Blackbox-Traces/2026-08-29T06-00-00-000Z',
      remoteDebugPort: 9222,
      launchTimeoutMs: 45_000,
      turnTimeoutMs: 120_000,
      messages: [],
      attachOnly: false,
      keepOpen: false,
      openMemoryWorkbench: true,
    })
  })

  it('runs startup, chat, memory workbench, screenshots, and runtime trace as one JSON report', async () => {
    const automation = {
      launch: vi.fn(async () => ({ pid: 1234 })),
      connect: vi.fn(async () => {}),
      waitForStartup: vi.fn(async () => ({
        title: 'ALICIZATION',
        url: 'file:///app/index.html#/',
        readyState: 'complete',
        stageReady: true,
      })),
      openChat: vi.fn(async () => ({
        title: 'Chat',
        url: 'file:///app/index.html#/chat',
      })),
      sendChatMessage: vi.fn(async (message: string) => ({
        message,
        status: 'completed' as const,
        firstUiChangeMs: 120,
        settledMs: 820,
        visibleText: `用户：${message}\n她：我记得。`,
        error: null,
      })),
      openMemoryWorkbench: vi.fn(async () => ({
        title: 'Settings',
        url: 'file:///app/index.html#/settings/modules/memory',
        visibleText: '记忆 工作记忆 长期记忆 人格候选 健康与审计',
      })),
      captureScreenshots: vi.fn(async () => [{
        title: 'Chat',
        url: 'file:///app/index.html#/chat',
        path: '/tmp/blackbox/chat.png',
      }]),
      collectDiagnostics: vi.fn(async () => ({
        processOutput: ['[stdout] app ready'],
        rendererConsole: [{
          type: 'info',
          text: 'renderer mounted',
          url: 'file:///app/index.html#/',
        }],
        pageErrors: [],
      })),
      close: vi.fn(async () => {}),
    }
    const writeText = vi.fn(async () => {})
    const report = await runLocalAppBlackboxTrial({
      args: {
        appPath: '/Applications/Alicization Local.app',
        userDataPath: '/tmp/alicization',
        outputDir: '/tmp/blackbox',
        remoteDebugPort: 9222,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: ['你好', '记住我喜欢蓝色'],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
      },
      automation,
      readRuntimeDebugTrace: vi.fn(async () => [{
        ts: '2026-08-29T06:00:01.000Z',
        event: 'chat-start.accepted',
        turnId: 'turn-1',
      }]),
      writeText,
      now: vi.fn()
        .mockReturnValueOnce(Date.parse('2026-08-29T06:00:00.000Z'))
        .mockReturnValueOnce(Date.parse('2026-08-29T06:00:03.000Z')),
    })

    expect(report).toMatchObject({
      version: 'alicization-local-app-blackbox-trial-v1',
      passed: true,
      summary: {
        requestedMessageCount: 2,
        completedMessageCount: 2,
        runtimeTraceEventCount: 1,
        screenshotCount: 1,
        rendererConsoleEventCount: 1,
      },
    })
    expect(report.stages.map(stage => stage.id)).toEqual([
      'app-launch',
      'remote-debug-attach',
      'stage-startup',
      'chat-window',
      'chat-message-1',
      'chat-message-2',
      'memory-workbench',
      'runtime-debug-trace',
      'screenshots',
    ])
    expect(writeText).toHaveBeenCalledWith(
      '/tmp/blackbox/runtime-debug.jsonl',
      expect.stringContaining('"event":"chat-start.accepted"'),
    )
    expect(writeText).toHaveBeenCalledWith(
      '/tmp/blackbox/report.json',
      expect.stringContaining('"version": "alicization-local-app-blackbox-trial-v1"'),
    )
    expect(writeText).toHaveBeenCalledWith(
      '/tmp/blackbox/app-process.log',
      '[stdout] app ready\n',
    )
    expect(writeText).toHaveBeenCalledWith(
      '/tmp/blackbox/renderer-console.jsonl',
      expect.stringContaining('"text":"renderer mounted"'),
    )
    expect(automation.close).toHaveBeenCalledOnce()
  })

  it('records database-backed memory closure assertions in the blackbox report', async () => {
    const automation = {
      launch: vi.fn(async () => ({ pid: 1234 })),
      connect: vi.fn(async () => {}),
      waitForStartup: vi.fn(async () => ({
        title: 'ALICIZATION',
        url: 'file:///app/index.html#/',
        readyState: 'complete',
        stageReady: true,
      })),
      openChat: vi.fn(async () => ({
        title: 'Chat',
        url: 'file:///app/index.html#/chat',
      })),
      sendChatMessage: vi.fn(async (message: string) => ({
        message,
        status: 'completed' as const,
        firstUiChangeMs: 100,
        settledMs: 500,
        visibleText: '她：记住了。',
        error: null,
      })),
      openMemoryWorkbench: vi.fn(async () => ({
        title: 'Settings',
        url: 'file:///app/index.html#/settings/modules/memory',
        visibleText: '记忆',
      })),
      captureScreenshots: vi.fn(async () => []),
      collectDiagnostics: vi.fn(async () => ({
        processOutput: [],
        rendererConsole: [],
        pageErrors: [],
      })),
      close: vi.fn(async () => {}),
    }
    const report = await runLocalAppBlackboxTrial({
      args: {
        appPath: '/Applications/Alicization Local.app',
        userDataPath: '/tmp/alicization',
        outputDir: '/tmp/blackbox',
        remoteDebugPort: 9222,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: ['记住我喜欢蓝色', '你还记得我喜欢什么颜色吗？'],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
      },
      automation,
      readRuntimeDebugTrace: vi.fn(async () => []),
      inspectMemory: vi.fn(async () => ({
        cardId: 'default',
        checkpointCount: 1,
        queue: {
          pending: 0,
          review: 0,
          applied: 1,
          failed: 0,
          deadLettered: 0,
        },
        longTerm: {
          factCount: 1,
          reflectionCount: 1,
          searchDocumentCount: 2,
          vectorCount: 2,
        },
        recall: {
          query: '你还记得我喜欢什么颜色吗？',
          matched: true,
          matchedIds: ['fact-blue'],
          summaries: ['用户喜欢蓝色。'],
        },
        errors: [],
      })),
      writeText: vi.fn(async () => {}),
    })

    expect(report).toMatchObject({
      passed: true,
      summary: {
        memoryAssertionPassed: true,
      },
      memoryAssertions: {
        cardId: 'default',
        checkpointCount: 1,
        recall: {
          matched: true,
        },
      },
    })
    expect(report.stages).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'memory-closure',
        status: 'succeeded',
        details: expect.objectContaining({
          recallMatched: true,
        }),
      }),
    ]))
  })

  it('keeps a failed chat turn transparent and still collects evidence', async () => {
    const automation = {
      launch: vi.fn(async () => ({ pid: 1234 })),
      connect: vi.fn(async () => {}),
      waitForStartup: vi.fn(async () => ({
        title: 'ALICIZATION',
        url: 'file:///app/index.html#/',
        readyState: 'complete',
        stageReady: true,
      })),
      openChat: vi.fn(async () => ({
        title: 'Chat',
        url: 'file:///app/index.html#/chat',
      })),
      sendChatMessage: vi.fn(async (message: string) => ({
        message,
        status: 'failed' as const,
        firstUiChangeMs: null,
        settledMs: 10_000,
        visibleText: 'Provider 请求失败：HTTP 500',
        error: 'Provider 请求失败：HTTP 500',
      })),
      openMemoryWorkbench: vi.fn(async () => ({
        title: 'Settings',
        url: 'file:///app/index.html#/settings/modules/memory',
        visibleText: '记忆',
      })),
      captureScreenshots: vi.fn(async () => []),
      close: vi.fn(async () => {}),
    }

    const report = await runLocalAppBlackboxTrial({
      args: {
        appPath: '/Applications/Alicization Local.app',
        userDataPath: '/tmp/alicization',
        outputDir: '/tmp/blackbox',
        remoteDebugPort: 9222,
        launchTimeoutMs: 45_000,
        turnTimeoutMs: 120_000,
        messages: ['你好'],
        attachOnly: false,
        keepOpen: false,
        openMemoryWorkbench: true,
      },
      automation,
      readRuntimeDebugTrace: vi.fn(async () => [{
        ts: '2026-08-29T06:00:01.000Z',
        event: 'chat-stream.provider-request-failed',
        error: 'HTTP 500',
      }]),
      writeText: vi.fn(async () => {}),
      now: vi.fn()
        .mockReturnValueOnce(Date.parse('2026-08-29T06:00:00.000Z'))
        .mockReturnValueOnce(Date.parse('2026-08-29T06:00:11.000Z')),
    })

    expect(report.passed).toBe(false)
    expect(report.summary.failedStageIds).toContain('chat-message-1')
    expect(report.stages.find(stage => stage.id === 'chat-message-1')).toMatchObject({
      status: 'failed',
      error: 'Provider 请求失败：HTTP 500',
    })
    expect(report.runtimeDebugTrace).toEqual([
      expect.objectContaining({
        event: 'chat-stream.provider-request-failed',
        error: 'HTTP 500',
      }),
    ])
  })
})
