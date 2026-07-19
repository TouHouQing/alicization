import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type { MainGatewayExecutionTaskThreadResult } from './main-chat-execution-surface'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'
import { buildAlicizationDesktopInspectionSceneSnapshot } from './local-desktop-inspection'
import {
  buildExecutionCapabilitySystemBlocks,
  buildExecutionRoutingEnforcementSystemBlock,
  buildMainGatewayExecutionRoutingToolChoice,
  buildMainGatewayTools,
  detectMainGatewayExecutionRoutingIntent,

} from './main-chat-execution-surface'

const executionChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
] as const

function createBuildExecutionRuntimeContext(
  getSensorySnapshot: () => Promise<AlicizationSensoryCacheSnapshot>,
) {
  return vi.fn(async (context: {
    cardId: string
    decisionTraceId?: string | null
    sessionId?: string | null
    turnId: string
  }) => buildAlicizationExecutionRuntimeContext({
    agentSessionId: 'agent-session-1',
    cardId: context.cardId,
    turnId: context.turnId,
    decisionTraceId: context.decisionTraceId ?? null,
    sessionId: context.sessionId ?? 'session-1',
    recentActions: [{
      kind: 'sensory',
      status: 'completed',
      threadStatus: null,
      label: 'sensory_capture_state',
      summary: 'capture healthy',
    }],
    sensorySnapshot: await getSensorySnapshot(),
  }))
}

describe('main chat execution surface', () => {
  it('builds focused capability blocks for capability questions', () => {
    const capabilities: AlicizationChannelCapability[] = [
      { channel: 'cli', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
      { channel: 'codex', available: true, enabled: false, ready: false, sessionAffinity: true, reason: 'disabled' },
      { channel: 'claude-code', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'openclaw', available: false, enabled: false, ready: false, sessionAffinity: true, reason: 'offline' },
    ]

    const [capabilityBlock] = buildExecutionCapabilitySystemBlocks(capabilities, executionChannels, {
      inquiry: {
        capabilityQuestion: true,
        mentionedChannels: ['cli', 'codex'],
      },
    })

    expect(buildExecutionCapabilitySystemBlocks(capabilities, executionChannels, {
      inquiry: {
        capabilityQuestion: true,
        mentionedChannels: ['cli', 'codex'],
      },
    })).toHaveLength(1)
    expect(JSON.parse(capabilityBlock!)).toEqual({
      type: 'alicization-execution-capabilities',
      data: {
        capabilityQuestion: true,
        channels: [
          { channel: 'cli', available: true, enabled: true, ready: true, reason: null },
          { channel: 'codex', available: true, enabled: false, ready: false, reason: 'disabled' },
          { channel: 'claude-code', available: true, enabled: true, ready: true, reason: null },
          { channel: 'openclaw', available: false, enabled: false, ready: false, reason: 'offline' },
        ],
        focusedChannels: ['cli', 'codex'],
      },
    })
    expect(capabilityBlock).not.toMatch(/Never|When the host asks|Answer each|call executor_capability_snapshot/iu)
  })

  it('builds execution routing guard with required tool names', () => {
    const block = buildExecutionRoutingEnforcementSystemBlock({
      requestedChannels: ['cli', 'codex'],
      requiredToolNames: ['executor_run_cli', 'executor_run_codex'],
      reasonCodes: ['channel-mentioned', 'action-verb'],
    })

    expect(JSON.parse(block)).toEqual({
      type: 'alicization-execution-routing',
      data: {
        reasonCodes: ['channel-mentioned', 'action-verb'],
        requestedChannels: ['cli', 'codex'],
        requiredToolNames: ['executor_run_cli', 'executor_run_codex'],
        toolInputOverrides: null,
      },
    })
  })

  it('includes workflow continuation argument guidance in the execution routing guard', () => {
    const block = buildExecutionRoutingEnforcementSystemBlock({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_open_url'],
      reasonCodes: ['action-verb'],
      toolInputOverrides: {
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
      },
    })

    expect(block).toContain('browser_open_url')
    expect(block).toContain('expectedPhase')
    expect(block).toContain('social-feed')
    expect(block).toContain('autoContinueSuggestedActions')
    expect(block).toContain('打开微博然后继续发微博')
  })

  it('includes desktop workflow continuation argument guidance in the execution routing guard', () => {
    const block = buildExecutionRoutingEnforcementSystemBlock({
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_inspect_scene'],
      reasonCodes: ['action-verb'],
      toolInputOverrides: {
        desktop_inspect_scene: {
          question: '帮我继续上传',
          forceRefresh: false,
          maxSuggestedActions: 5,
          autoContinueSuggestedActions: true,
          maxAutoContinueSteps: 2,
        },
      },
    })

    expect(block).toContain('desktop_inspect_scene')
    expect(block).toContain('question')
    expect(block).toContain('帮我继续上传')
    expect(block).toContain('autoContinueSuggestedActions')
    expect(block).toContain('maxAutoContinueSteps')
  })

  it('detects main-gateway execution routing intent from action verbs and command literals', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '帮我执行 `ls ~/Desktop` 看看结果',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: true,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['cli'],
      requiredToolNames: ['executor_run_cli'],
      reasonCodes: expect.arrayContaining(['command-literal', 'action-verb', 'default-cli-from-command-structure']),
    })
  })

  it('detects direct local browser search routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '帮我百度 Alicization 数字生命',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_search_web'],
      reasonCodes: expect.arrayContaining(['action-verb', 'request-frame']),
    })
  })

  it('detects direct local browser opening intent from natural language without a URL', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '打开浏览器',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_open_url'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects known website opening intent as local browser routing', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '打开微博',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_open_url'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects direct local browser click routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '点击当前网页的登录按钮',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_click_element'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects direct local browser typing routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '在当前网页的搜索框里输入 "Alicization" 并回车',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_type_text'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects direct local browser scrolling routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '向下滚动当前网页',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_scroll'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects direct local browser waiting routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '等待当前网页加载完成',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_wait'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects direct local desktop scene inspection routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '看看现在屏幕上是什么',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_inspect_scene'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects direct local desktop waiting routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '等待 Cursor 打开',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_wait'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects next-step gui guidance routing intent into desktop scene inspection', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '帮我判断下一步该点什么',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_inspect_scene'],
      reasonCodes: expect.arrayContaining(['action-verb', 'request-frame']),
      toolInputOverrides: {
        desktop_inspect_scene: {
          question: '帮我判断下一步该点什么',
          forceRefresh: false,
          maxSuggestedActions: 5,
        },
      },
    })
  })

  it('detects desktop upload continuation routing intent into desktop scene inspection', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '帮我继续上传',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_inspect_scene'],
      reasonCodes: expect.arrayContaining(['action-verb', 'request-frame']),
      toolInputOverrides: {
        desktop_inspect_scene: {
          question: '帮我继续上传',
          forceRefresh: false,
          maxSuggestedActions: 5,
          autoContinueSuggestedActions: true,
          maxAutoContinueSteps: 2,
        },
      },
    })
  })

  it('detects current-page next-step guidance routing intent into browser reading', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '帮我判断当前网页下一步该点什么',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_read_page'],
      reasonCodes: expect.arrayContaining(['action-verb', 'request-frame']),
      toolInputOverrides: {
        browser_read_page: {
          browser: 'default',
          format: 'interactables',
        },
      },
    })
  })

  it('detects known-website next-step guidance routing intent into browser reading', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '帮我判断微博下一步该点什么',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_read_page'],
      reasonCodes: expect.arrayContaining(['action-verb', 'request-frame']),
      toolInputOverrides: {
        browser_read_page: {
          browser: 'default',
          format: 'interactables',
        },
      },
    })
  })

  it('detects known-website continuation routing intent into browser reading', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '帮我继续发微博',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_read_page'],
      reasonCodes: expect.arrayContaining(['action-verb', 'request-frame']),
      toolInputOverrides: {
        browser_read_page: {
          browser: 'default',
          format: 'interactables',
        },
      },
    })
  })

  it('detects direct local desktop interactable listing routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '看看当前窗口有哪些按钮',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_list_interactables'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects direct local desktop click routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '点击当前窗口的继续按钮',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_click_element'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects direct local desktop typing routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '在当前窗口输入 "Alicization"',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_type_text'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('detects direct local desktop shortcut routing intent from natural language', () => {
    const intent = detectMainGatewayExecutionRoutingIntent({
      userText: '按下 Command+L',
      capabilityInquiry: {
        active: false,
        capabilityQuestion: false,
        mentionedChannels: [],
        hasActionVerb: true,
        hasCommandLiteral: false,
      },
    })

    expect(intent).toEqual({
      requestedChannels: ['desktop'],
      requiredToolNames: ['desktop_press_keys'],
      reasonCodes: expect.arrayContaining(['action-verb']),
    })
  })

  it('builds required tool choice from routing intent', () => {
    expect(buildMainGatewayExecutionRoutingToolChoice({
      requestedChannels: ['openclaw'],
      requiredToolNames: ['executor_run_openclaw'],
      reasonCodes: ['channel-mentioned', 'action-verb'],
    })).toEqual({
      type: 'function',
      function: { name: 'executor_run_openclaw' },
    })
  })

  it('builds a direct tool choice for the dedicated local visual executor tool', () => {
    expect(buildMainGatewayExecutionRoutingToolChoice({
      requestedChannels: ['desktop'],
      requiredToolNames: ['executor_run_local_visual' as any],
      reasonCodes: ['local-visual-explicit', 'action-verb'],
    } as any)).toEqual({
      type: 'function',
      function: { name: 'executor_run_local_visual' },
    })
  })

  it('builds a direct local tool choice when routing narrows to one browser tool', () => {
    expect(buildMainGatewayExecutionRoutingToolChoice({
      requestedChannels: ['browser'],
      requiredToolNames: ['browser_search_web'],
      reasonCodes: ['action-verb', 'request-frame'],
    })).toEqual({
      type: 'function',
      function: { name: 'browser_search_web' },
    })
  })

  it('falls back to required mode when multiple executor tools remain available', () => {
    expect(buildMainGatewayExecutionRoutingToolChoice({
      requestedChannels: ['cli', 'codex'],
      requiredToolNames: ['executor_run_cli', 'executor_run_codex'],
      reasonCodes: ['channel-mentioned', 'action-verb'],
    })).toBe('required')
  })

  it('builds main gateway tool registry including executor tools and mcp tools', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'cursor',
          title: 'airi-alice',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-1',
        decisionTraceId: 'trace-1',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-1',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'done',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const toolNames = tools
      .map((entry: any) => String(entry?.function?.name ?? '').trim())
      .filter(Boolean)

    expect(toolNames).toContain('set_reminder')
    expect(toolNames).toContain('executor_capability_snapshot')
    expect(toolNames).toContain('sensory_capture_state')
    expect(toolNames).toContain('filesystem_read_file')
    expect(toolNames).toContain('filesystem_write_file')
    expect(toolNames).toContain('filesystem_edit_file')
    expect(toolNames).toContain('filesystem_patch_file')
    expect(toolNames).toContain('filesystem_list_directory')
    expect(toolNames).toContain('filesystem_search_files')
    expect(toolNames).toContain('executor_run_cli')
    expect(toolNames).toContain('executor_run_codex')
    expect(toolNames).toContain('executor_run_claude_code')
    expect(toolNames).toContain('executor_run_local_visual')
    expect(toolNames).toContain('executor_run_openclaw')
    expect(toolNames).toContain('browser_open_url')
    expect(toolNames).toContain('browser_search_web')
    expect(toolNames).toContain('browser_read_page')
    expect(toolNames).toContain('browser_click_element')
    expect(toolNames).toContain('browser_type_text')
    expect(toolNames).toContain('browser_navigate')
    expect(toolNames).toContain('browser_scroll')
    expect(toolNames).toContain('browser_wait')
    expect(toolNames).toContain('desktop_inspect_scene')
    expect(toolNames).toContain('desktop_list_interactables')
    expect(toolNames).toContain('desktop_click_element')
    expect(toolNames).toContain('desktop_type_text')
    expect(toolNames).toContain('desktop_press_keys')
    expect(toolNames).toContain('desktop_open_application')
    expect(toolNames).toContain('desktop_wait')
    expect(toolNames).toContain('mcp_list_tools')
    expect(toolNames).toContain('mcp_call_tool')
  })

  it('runs local browser and desktop automation tools without dispatching OpenClaw', async () => {
    const browserOpenUrl = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_open_url',
      browser: input.browser ?? 'default',
      url: input.url ?? 'about:blank',
    }))
    const browserSearchWeb = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_search_web',
      browser: input.browser ?? 'default',
      query: input.query,
      searchEngine: input.searchEngine ?? 'google',
      url: 'https://www.google.com/search?q=alicization',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'http://127.0.0.1:4173/register',
      title: 'FluctGraph',
      content: 'Alicization local browser automation',
    }))
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      selector: input.selector,
      url: 'http://127.0.0.1:4173/register',
    }))
    const browserTypeText = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_type_text',
      browser: input.browser ?? 'chrome',
      text: input.text,
      targetText: input.targetText ?? null,
      output: input.text,
    }))
    const browserNavigate = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_navigate',
      browser: input.browser ?? 'chrome',
      action: input.action,
      url: 'https://example.com/previous',
      output: 'https://example.com/previous',
    }))
    const browserScroll = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_scroll',
      browser: input.browser ?? 'chrome',
      action: input.action,
      amount: input.amount ?? 1,
      url: 'https://example.com/feed',
      output: 'https://example.com/feed',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      url: 'https://example.com/feed',
      output: 'https://example.com/feed',
    }))
    const desktopOpenApplication = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_open_application',
      appName: input.appName,
      path: input.path ?? null,
    }))
    const desktopListInteractables = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      channel: 'desktop',
      role: input.role ?? null,
      interactables: [{ ordinal: 1, role: 'button', text: '继续' }],
      output: '[{"ordinal":1,"role":"button","text":"继续"}]',
    }))
    const desktopClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
      role: input.role ?? null,
      matchedText: input.text ?? '继续',
      output: input.text ?? '继续',
    }))
    const desktopTypeText = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_type_text',
      channel: 'desktop',
      text: input.text,
      targetText: input.targetText ?? null,
      output: input.text,
    }))
    const desktopPressKeys = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_press_keys',
      channel: 'desktop',
      shortcut: input.shortcut,
      output: input.shortcut,
    }))
    const desktopWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_wait',
      channel: 'desktop',
      appName: input.appName ?? null,
      title: 'Composer',
      output: input.appName ?? input.titleIncludes ?? 'desktop',
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'login',
      nextActionIntent: 'authenticate',
      blockingSignals: ['credential-required', 'awaiting-input'],
      workflowPlan: {
        continuationMode: 'await-host-input',
        completionSignals: ['navigation-away-from-login', 'authenticated-home-visible'],
        blockingReasons: ['credential-required', 'awaiting-input'],
        repairActions: [],
        steps: [
          {
            id: 'fill-credentials',
            title: '填写账号与密码',
            rationale: 'Credentials are still required before continuing.',
            status: 'blocked',
          },
          {
            id: 'submit-login',
            title: '点击登录继续认证',
            rationale: 'Submit the login form after credentials are available.',
            status: 'pending',
            toolName: 'browser_click_element',
          },
        ],
      },
      workflowState: {
        taskKey: 'browser::login::content-detail',
        currentPhase: 'login',
        previousPhase: null,
        progressState: 'steady',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'login',
            title: 'Example Login',
            url: 'https://example.com/login',
          },
        ],
        lastInspectionAt: 1,
        updatedAt: 1,
        title: 'Example Login',
        url: 'https://example.com/login',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text'],
        rationale: 'Prefer browser DOM actions first.',
        confidence: 0.91,
      },
      suggestedActions: [],
      summary: 'Inspected current desktop scene around Google Chrome.',
      output: JSON.stringify({
        summary: 'browser/page',
        question: input.question ?? null,
        pagePhase: 'login',
        nextActionIntent: 'authenticate',
        blockingSignals: ['credential-required', 'awaiting-input'],
        workflowPlan: {
          continuationMode: 'await-host-input',
          completionSignals: ['navigation-away-from-login', 'authenticated-home-visible'],
        },
        workflowState: {
          currentPhase: 'login',
          previousPhase: null,
          progressState: 'steady',
          targetPhase: 'content-detail',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
        },
      }),
    }))
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-should-not-run-openclaw-1',
        selectedChannel: 'openclaw',
      },
      plan: {
        state: 'routed',
      },
      summary: 'unexpected OpenClaw dispatch',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'FluctGraph',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-local-browser-tools-1',
        decisionTraceId: 'trace-local-browser-tools-1',
        sessionId: 'session-local-browser-tools-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserOpenUrl,
      browserSearchWeb,
      browserReadPage,
      browserClickElement,
      browserTypeText,
      browserNavigate,
      browserScroll,
      browserWait,
      desktopListInteractables,
      desktopClickElement,
      desktopTypeText,
      desktopPressKeys,
      desktopWait,
      desktopInspectScene,
      desktopOpenApplication,
    } as any)

    const openUrlTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_open_url') as any
    const searchWebTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_search_web') as any
    const readPageTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_read_page') as any
    const clickElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_click_element') as any
    const typeBrowserTextTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_type_text') as any
    const navigateBrowserTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_navigate') as any
    const scrollBrowserTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_scroll') as any
    const waitBrowserTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_wait') as any
    const listDesktopInteractablesTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_list_interactables') as any
    const clickDesktopElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_click_element') as any
    const typeDesktopTextTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_type_text') as any
    const pressDesktopKeysTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_press_keys') as any
    const waitDesktopTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_wait') as any
    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    const openApplicationTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_open_application') as any

    expect(navigateBrowserTool).toBeDefined()
    if (!navigateBrowserTool)
      return
    expect(scrollBrowserTool).toBeDefined()
    if (!scrollBrowserTool)
      return
    expect(waitBrowserTool).toBeDefined()
    if (!waitBrowserTool)
      return
    expect(waitDesktopTool).toBeDefined()
    if (!waitDesktopTool)
      return

    await expect(openUrlTool.execute({
      url: 'https://example.com',
      browser: 'chrome',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_open_url',
      browser: 'chrome',
      url: 'https://example.com',
    }))
    await expect(openUrlTool.execute({
      browser: 'chrome',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_open_url',
      browser: 'chrome',
      url: 'about:blank',
    }))
    await expect(openUrlTool.execute({
      site: 'weibo',
      browser: 'chrome',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_open_url',
      browser: 'chrome',
    }))
    await expect(searchWebTool.execute({
      query: 'alicization',
      searchEngine: 'google',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_search_web',
      query: 'alicization',
    }))
    await expect(readPageTool.execute({
      browser: 'chrome',
      format: 'text',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_read_page',
      title: 'FluctGraph',
      content: 'Alicization local browser automation',
    }))
    await expect(readPageTool.execute({
      browser: 'chrome',
      format: 'interactables',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_read_page',
    }))
    await expect(clickElementTool.execute({
      browser: 'chrome',
      selector: '#submit',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_click_element',
      selector: '#submit',
    }))
    await expect(clickElementTool.execute({
      browser: 'chrome',
      text: '登录',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_click_element',
    }))
    await expect(clickElementTool.execute({
      browser: 'chrome',
      ordinal: 1,
      targetType: 'link',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_click_element',
    }))
    await expect(typeBrowserTextTool.execute({
      browser: 'chrome',
      text: 'Alicization',
      targetText: '搜索',
      clearExisting: true,
      submit: true,
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_type_text',
      text: 'Alicization',
    }))
    await expect(navigateBrowserTool.execute({
      browser: 'chrome',
      action: 'back',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_navigate',
      action: 'back',
    }))
    await expect(scrollBrowserTool.execute({
      browser: 'chrome',
      action: 'down',
      amount: 2,
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_scroll',
      action: 'down',
      amount: 2,
    }))
    await expect(waitBrowserTool.execute({
      browser: 'chrome',
      state: 'complete',
      timeoutMs: 5_000,
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_wait',
      state: 'complete',
    }))
    const inspectSceneResult = await inspectSceneTool.execute({
      question: '帮我判断下一步该点什么',
      maxSuggestedActions: 5,
    })
    expect(inspectSceneResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      pagePhase: 'login',
      nextActionIntent: 'authenticate',
      blockingSignals: ['credential-required', 'awaiting-input'],
      workflowPlan: expect.objectContaining({
        continuationMode: 'await-host-input',
        completionSignals: ['navigation-away-from-login', 'authenticated-home-visible'],
      }),
      workflowState: expect.objectContaining({
        currentPhase: 'login',
        progressState: 'steady',
        targetPhase: 'content-detail',
      }),
      executionStrategy: expect.objectContaining({
        mode: 'browser-dom',
        recommendedChannel: 'browser',
      }),
    }))
    expect(inspectSceneResult.output).toContain('"executionStrategy"')
    expect(inspectSceneResult.output).toContain('"pagePhase"')
    expect(inspectSceneResult.output).toContain('"nextActionIntent"')
    expect(inspectSceneResult.output).toContain('"blockingSignals"')
    expect(inspectSceneResult.output).toContain('"workflowPlan"')
    expect(inspectSceneResult.output).toContain('"workflowState"')
    await expect(listDesktopInteractablesTool.execute({
      role: 'button',
      maxItems: 12,
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_list_interactables',
      channel: 'desktop',
    }))
    await expect(clickDesktopElementTool.execute({
      text: '继续',
      role: 'button',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
    }))
    await expect(typeDesktopTextTool.execute({
      text: 'Alicization',
      targetText: '搜索',
      clearExisting: true,
      submit: true,
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_type_text',
      channel: 'desktop',
    }))
    await expect(pressDesktopKeysTool.execute({
      shortcut: 'command+l',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_press_keys',
      channel: 'desktop',
    }))
    await expect(waitDesktopTool.execute({
      appName: 'Cursor',
      timeoutMs: 5_000,
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_wait',
      channel: 'desktop',
      appName: 'Cursor',
    }))
    await expect(openApplicationTool.execute({
      appName: 'Safari',
    })).resolves.toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_open_application',
      appName: 'Safari',
    }))

    expect(browserOpenUrl).toBeCalledWith({
      url: 'https://example.com',
      browser: 'chrome',
    })
    expect(browserOpenUrl).toBeCalledWith({
      url: undefined,
      browser: 'chrome',
    })
    expect(browserOpenUrl).toBeCalledWith({
      site: 'weibo',
      url: undefined,
      browser: 'chrome',
    })
    expect(browserSearchWeb).toBeCalledWith({
      query: 'alicization',
      browser: 'default',
      searchEngine: 'google',
    })
    expect(browserReadPage).toBeCalledWith({
      browser: 'chrome',
      format: 'text',
      maxChars: undefined,
    })
    expect(browserReadPage).toBeCalledWith({
      browser: 'chrome',
      format: 'interactables',
      maxChars: undefined,
    })
    expect(browserClickElement).toBeCalledWith({
      browser: 'chrome',
      selector: '#submit',
    })
    expect(browserClickElement).toBeCalledWith({
      browser: 'chrome',
      selector: undefined,
      text: '登录',
      exactText: undefined,
    })
    expect(browserClickElement).toBeCalledWith({
      browser: 'chrome',
      selector: undefined,
      text: undefined,
      exactText: undefined,
      ordinal: 1,
      targetType: 'link',
    })
    expect(browserTypeText).toBeCalledWith({
      browser: 'chrome',
      text: 'Alicization',
      targetText: '搜索',
      ordinal: undefined,
      selector: undefined,
      exactText: undefined,
      clearExisting: true,
      submit: true,
    })
    expect(browserNavigate).toBeCalledWith({
      browser: 'chrome',
      action: 'back',
    })
    expect(browserScroll).toBeCalledWith({
      browser: 'chrome',
      action: 'down',
      amount: 2,
    })
    expect(browserWait).toBeCalledWith({
      browser: 'chrome',
      state: 'complete',
      text: undefined,
      urlIncludes: undefined,
      timeoutMs: 5_000,
    })
    expect(desktopInspectScene).toBeCalledWith({
      question: '帮我判断下一步该点什么',
      forceRefresh: undefined,
      maxSuggestedActions: 5,
    })
    expect(desktopListInteractables).toBeCalledWith({
      role: 'button',
      maxItems: 12,
    })
    expect(desktopClickElement).toBeCalledWith({
      text: '继续',
      role: 'button',
      ordinal: undefined,
      exactText: undefined,
    })
    expect(desktopTypeText).toBeCalledWith({
      text: 'Alicization',
      targetText: '搜索',
      ordinal: undefined,
      exactText: undefined,
      clearExisting: true,
      submit: true,
    })
    expect(desktopPressKeys).toBeCalledWith({
      shortcut: 'command+l',
      repeat: undefined,
    })
    expect(desktopOpenApplication).toBeCalledWith({
      appName: 'Safari',
      path: undefined,
      args: [],
    })
    expect(executeTaskThread).not.toHaveBeenCalled()
  })

  it('provides normalized filesystem read/edit/list tools with MCP fallback', async () => {
    const sourceContent = `alpha\\nbeta\\n${'x'.repeat(260)}`
    const invokeMcpCallTool = vi.fn(async (payload: any) => {
      if (payload?.name === 'filesystem::read_file') {
        return {
          ok: true,
          isError: false,
          content: [{ type: 'text', text: sourceContent }],
        }
      }
      if (payload?.name === 'filesystem::write_file') {
        return {
          ok: true,
          isError: false,
          content: [{ type: 'text', text: 'written' }],
        }
      }
      if (payload?.name === 'filesystem::list_directory') {
        return {
          ok: false,
          isError: true,
          errorCode: 'MCP_CALL_FAILED',
          errorMessage: 'method not found',
        }
      }
      if (payload?.name === 'filesystem::list') {
        return {
          ok: true,
          isError: false,
          structuredContent: {
            entries: [{ name: 'README.md' }, { name: 'src' }],
          },
        }
      }
      if (payload?.name === 'filesystem::search_files') {
        return {
          ok: false,
          isError: true,
          errorCode: 'MCP_CALL_FAILED',
          errorMessage: 'method not found',
        }
      }
      if (payload?.name === 'filesystem::search') {
        return {
          ok: true,
          isError: false,
          structuredContent: {
            matches: [
              { path: '/workspace/src/main.ts', line: 12, column: 4, snippet: 'const alpha = true' },
              { path: '/workspace/src/notes.md', line: 3, snippet: 'alpha checklist' },
            ],
          },
        }
      }
      return {
        ok: false,
        isError: true,
        errorCode: 'MCP_CALL_FAILED',
        errorMessage: 'method not found',
      }
    })

    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 12,
      nextTickAt: 20,
      sample: {
        collectedAt: 1,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 6,
          windowMs: 1000,
        },
        memory: {
          freeMB: 4096,
          totalMB: 8192,
          usagePercent: 50,
        },
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-filesystem-tools-1',
        decisionTraceId: 'trace-filesystem-tools-1',
        sessionId: 'session-filesystem-tools-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-filesystem-tools-1',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'done',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool,
    })

    const readTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_read_file') as any
    const readResult = await readTool.execute({
      path: '/workspace/notes.txt',
      maxReturnBytes: 80,
    }) as any
    expect(readResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'read_file',
      path: '/workspace/notes.txt',
      truncated: true,
      byteLength: Buffer.byteLength(sourceContent, 'utf8'),
      contentHash: expect.any(String),
      mcpToolName: 'filesystem::read_file',
    }))

    const editTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_edit_file') as any
    const editResult = await editTool.execute({
      path: '/workspace/notes.txt',
      oldText: 'beta',
      newText: 'gamma',
    }) as any
    expect(editResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'edit_file',
      path: '/workspace/notes.txt',
      replacedCount: 1,
      mcpToolName: 'filesystem::write_file',
    }))
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::write_file',
      arguments: expect.objectContaining({
        path: '/workspace/notes.txt',
        content: expect.stringContaining('gamma'),
      }),
    }))

    const patchTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_patch_file') as any
    const patchResult = await patchTool.execute({
      path: '/workspace/notes.txt',
      changes: [
        { oldText: 'gamma', newText: 'delta' },
        { oldText: 'alpha', newText: 'ALPHA' },
      ],
    }) as any
    expect(patchResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'patch_file',
      path: '/workspace/notes.txt',
      totalChanges: 2,
      appliedChanges: 2,
      skippedChanges: 0,
      totalReplacedCount: 2,
      mcpToolName: 'filesystem::write_file',
      previousHash: expect.any(String),
      nextHash: expect.any(String),
    }))
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::write_file',
      arguments: expect.objectContaining({
        path: '/workspace/notes.txt',
        content: expect.stringContaining('delta'),
      }),
    }))

    const listTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_list_directory') as any
    const listResult = await listTool.execute({
      path: '/workspace',
      recursive: true,
    }) as any
    expect(listResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'list_directory',
      path: '/workspace',
      mcpToolName: 'filesystem::list',
      entries: ['README.md', 'src'],
      entryCount: 2,
    }))
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::list_directory',
    }))
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::list',
    }))

    const searchTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_search_files') as any
    const searchResult = await searchTool.execute({
      path: '/workspace',
      query: 'alpha',
      recursive: true,
      maxResults: 1,
      caseSensitive: true,
      regex: true,
      includeGlobs: ['src/**', '  ', 'src/**'],
      excludeGlobs: ['**/*.spec.ts', '**/*.spec.ts'],
      pathMode: 'relative',
    }) as any
    expect(searchResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'search_files',
      path: '/workspace',
      query: 'alpha',
      recursive: true,
      caseSensitive: true,
      regex: true,
      includeGlobs: ['src/**'],
      excludeGlobs: ['**/*.spec.ts'],
      pathMode: 'relative',
      mcpToolName: 'filesystem::search',
      matchCount: 1,
      totalMatchCount: 2,
      filteredOutCount: 0,
      truncated: true,
    }))
    expect(searchResult.matches).toEqual([
      {
        path: 'src/main.ts',
        line: 12,
        column: 4,
        snippet: 'const alpha = true',
      },
    ])
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::search_files',
      arguments: expect.objectContaining({
        caseSensitive: true,
        regex: true,
        includeGlobs: ['src/**'],
        excludeGlobs: ['**/*.spec.ts'],
        pathMode: 'relative',
      }),
    }))
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::search',
    }))
  })

  it('rejects filesystem_write_file expectedHash when no read state exists in the current turn', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 2,
      nextTickAt: 8,
      sample: {
        collectedAt: 1,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 4,
          windowMs: 1000,
        },
        memory: {
          freeMB: 4096,
          totalMB: 8192,
          usagePercent: 50,
        },
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-filesystem-hash-guard-1',
        decisionTraceId: 'trace-filesystem-hash-guard-1',
        sessionId: 'session-filesystem-hash-guard-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-filesystem-hash-guard-1',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'done',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true, isError: false })),
    })

    const writeTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_write_file') as any
    const writeResult = await writeTool.execute({
      path: '/workspace/guarded.txt',
      content: 'hello',
      expectedHash: 'abc123',
    }) as any
    expect(writeResult).toEqual(expect.objectContaining({
      status: 'failed',
      operation: 'write_file',
      errorCode: 'FILESYSTEM_EXPECTED_HASH_MISSING',
    }))
  })

  it('rejects filesystem_patch_file when changes is empty', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 2,
      nextTickAt: 8,
      sample: {
        collectedAt: 1,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 4,
          windowMs: 1000,
        },
        memory: {
          freeMB: 4096,
          totalMB: 8192,
          usagePercent: 50,
        },
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-filesystem-patch-empty-1',
        decisionTraceId: 'trace-filesystem-patch-empty-1',
        sessionId: 'session-filesystem-patch-empty-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-filesystem-patch-empty-1',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'done',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true, isError: false })),
    })

    const patchTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_patch_file') as any
    const patchResult = await patchTool.execute({
      path: '/workspace/guarded.txt',
      changes: [],
    }) as any
    expect(patchResult).toEqual(expect.objectContaining({
      status: 'failed',
      operation: 'patch_file',
      errorCode: 'FILESYSTEM_PATCH_EMPTY_CHANGES',
    }))
  })

  it('runs filesystem_patch_file in dryRun mode without persisting write', async () => {
    const sourceContent = 'alpha\\nbeta\\n'
    const invokeMcpCallTool = vi.fn(async (payload: any) => {
      if (payload?.name === 'filesystem::read_file') {
        return {
          ok: true,
          isError: false,
          content: [{ type: 'text', text: sourceContent }],
        }
      }
      if (payload?.name === 'filesystem::write_file') {
        return {
          ok: true,
          isError: false,
          content: [{ type: 'text', text: 'written' }],
        }
      }
      return {
        ok: false,
        isError: true,
        errorCode: 'MCP_CALL_FAILED',
        errorMessage: 'method not found',
      }
    })

    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 1,
      nextTickAt: 8,
      sample: {
        collectedAt: 1,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 4,
          windowMs: 1000,
        },
        memory: {
          freeMB: 4096,
          totalMB: 8192,
          usagePercent: 50,
        },
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-filesystem-patch-dry-run-1',
        decisionTraceId: 'trace-filesystem-patch-dry-run-1',
        sessionId: 'session-filesystem-patch-dry-run-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-filesystem-patch-dry-run-1',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'done',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool,
    })

    const patchTool = tools.find((entry: any) => String(entry?.function?.name) === 'filesystem_patch_file') as any
    const patchResult = await patchTool.execute({
      path: '/workspace/notes.txt',
      changes: [{ oldText: 'alpha', newText: 'omega' }],
      dryRun: true,
      maxPreviewBytes: 32,
    }) as any
    expect(patchResult).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'patch_file',
      dryRun: true,
      writeApplied: false,
      path: '/workspace/notes.txt',
      totalChanges: 1,
      appliedChanges: 1,
      skippedChanges: 0,
      totalReplacedCount: 1,
      previousHash: expect.any(String),
      nextHash: expect.any(String),
      previewTruncated: false,
      preview: expect.stringContaining('omega'),
    }))

    const writeCalls = invokeMcpCallTool.mock.calls.filter((call: any[]) => call?.[0]?.name === 'filesystem::write_file')
    expect(writeCalls).toHaveLength(0)
    expect(invokeMcpCallTool).toBeCalledWith(expect.objectContaining({
      name: 'filesystem::read_file',
    }))
  })

  it('returns routing rationale and experience in executor tool result payload', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-routing-rationale-1',
        selectedChannel: 'claude-code',
        metadata: {
          fabric: {
            experience: {
              advisorChannel: 'claude-code',
              advisorConfidence: 0.9,
              rememberedProcedures: [{
                id: 'procedural:runtime-seam',
                label: 'runtime seam repair',
                approach: 'Use Claude Code first for the patch, then verify before branching.',
                preferredChannel: 'claude-code',
              }],
            },
          },
        },
      },
      plan: {
        state: 'routed',
        proposedChannel: 'claude-code',
        reasonTags: ['advisor:claude-code', 'advisor-channel'],
        narrative: ['Routing adopted the external channel assessor recommendation with confidence weighting.'],
        affirmationReasonCodes: [],
        blockedReasonCodes: [],
      },
      summary: 'done',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 5,
      nextTickAt: 10,
      sample: {
        collectedAt: 1,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 8,
          windowMs: 1000,
        },
        memory: {
          freeMB: 2048,
          totalMB: 8192,
          usagePercent: 75,
        },
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-routing-rationale-1',
        decisionTraceId: 'trace-routing-rationale-1',
        sessionId: 'session-routing-rationale-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const cliTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_cli') as any
    const result = await cliTool.execute({
      command: 'echo',
      args: ['hello'],
    })

    expect(result).toEqual(expect.objectContaining({
      planState: 'routed',
      proposedChannel: 'claude-code',
      routeReasonTags: ['advisor:claude-code', 'advisor-channel'],
      routeNarrative: ['Routing adopted the external channel assessor recommendation with confidence weighting.'],
      routeExperience: expect.objectContaining({
        advisorChannel: 'claude-code',
        advisorConfidence: 0.9,
        rememberedProcedures: expect.arrayContaining([
          expect.objectContaining({
            id: 'procedural:runtime-seam',
            preferredChannel: 'claude-code',
          }),
        ]),
      }),
    }))
  })

  it('defaults governed visual executor dispatches to local visual while preserving grounded runtime context', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-local-visual-context-1',
        selectedChannel: 'desktop',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 42,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'cursor',
          title: 'airi-alice',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-local-visual-context-1',
        decisionTraceId: 'trace-local-visual-context-1',
        sessionId: 'session-local-visual-context-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const openClawTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_openclaw') as any
    await openClawTool.execute({
      instruction: 'Dismiss the active desktop popup.',
      kind: 'desktop-automation',
    })

    expect(executeTaskThread).toBeCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'desktop-automation',
        requestedChannel: undefined,
        goal: expect.stringContaining('Run local visual task'),
      }),
      dispatch: expect.objectContaining({
        localVisual: expect.objectContaining({
          instruction: 'Dismiss the active desktop popup.',
          runtimeContext: expect.objectContaining({
            cardId: 'default',
            turnId: 'turn-local-visual-context-1',
            decisionTraceId: 'trace-local-visual-context-1',
            sessionId: 'session-local-visual-context-1',
            agentSessionId: 'agent-session-1',
            projectBriefing: null,
            recentActions: [{
              kind: 'sensory',
              status: 'completed',
              threadStatus: null,
              label: 'sensory_capture_state',
              summary: 'capture healthy',
            }],
            sensory: expect.objectContaining({
              stale: false,
              foregroundWindow: {
                appName: 'Cursor',
                processName: 'cursor',
                title: 'airi-alice',
              },
              capture: expect.objectContaining({
                health: 'healthy',
                permission: 'granted',
                sourceCount: 2,
              }),
            }),
          }),
        }),
        openclaw: expect.objectContaining({
          runtimeContext: expect.objectContaining({
            cardId: 'default',
            turnId: 'turn-local-visual-context-1',
            decisionTraceId: 'trace-local-visual-context-1',
            sessionId: 'session-local-visual-context-1',
            agentSessionId: 'agent-session-1',
            projectBriefing: null,
            recentActions: [{
              kind: 'sensory',
              status: 'completed',
              threadStatus: null,
              label: 'sensory_capture_state',
              summary: 'capture healthy',
            }],
            sensory: expect.objectContaining({
              stale: false,
              foregroundWindow: {
                appName: 'Cursor',
                processName: 'cursor',
                title: 'airi-alice',
              },
              capture: expect.objectContaining({
                health: 'healthy',
                permission: 'granted',
                sourceCount: 2,
              }),
            }),
          }),
        }),
      }),
    }))
  })

  it('forces openclaw transport for governed visual executor dispatches when requested explicitly', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-openclaw-context-1',
        selectedChannel: 'openclaw',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 42,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'cursor',
          title: 'airi-alice',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-openclaw-context-1',
        decisionTraceId: 'trace-openclaw-context-1',
        sessionId: 'session-openclaw-context-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const openClawTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_openclaw') as any
    await openClawTool.execute({
      instruction: 'Dismiss the active desktop popup.',
      kind: 'desktop-automation',
      transport: 'openclaw',
    })

    expect(executeTaskThread).toBeCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'desktop-automation',
        requestedChannel: 'openclaw',
        goal: expect.stringContaining('Run OpenClaw task'),
      }),
      dispatch: expect.objectContaining({
        localVisual: undefined,
        openclaw: expect.objectContaining({
          instruction: 'Dismiss the active desktop popup.',
          runtimeContext: expect.objectContaining({
            cardId: 'default',
            turnId: 'turn-openclaw-context-1',
            decisionTraceId: 'trace-openclaw-context-1',
            sessionId: 'session-openclaw-context-1',
            agentSessionId: 'agent-session-1',
          }),
        }),
      }),
    }))
  })

  it('resumes an existing pending thread when threadId is provided to an executor tool', async () => {
    const executeTaskThread = vi.fn(async () => {
      throw new Error('should not plan a new thread')
    })
    const resumeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-resume-1',
        selectedChannel: 'codex',
      },
      plan: {
        state: 'routed',
        proposedChannel: 'codex',
      },
      summary: 'resumed existing thread',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 5,
      nextTickAt: 10,
      sample: {
        collectedAt: 1,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 8,
          windowMs: 1000,
        },
        memory: {
          freeMB: 2048,
          totalMB: 8192,
          usagePercent: 75,
        },
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-resume-1',
        decisionTraceId: 'trace-resume-1',
        sessionId: 'session-resume-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      resumeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const codexTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_codex') as any
    const result = await codexTool.execute({
      threadId: 'thread-resume-1',
      prompt: 'ignored because thread resume takes priority',
    })

    expect(result.summary).toBe('resumed existing thread')
    expect(resumeTaskThread).toHaveBeenCalledWith({
      context: {
        cardId: 'default',
        turnId: 'turn-resume-1',
        decisionTraceId: 'trace-resume-1',
        sessionId: 'session-resume-1',
      },
      threadId: 'thread-resume-1',
    })
    expect(executeTaskThread).not.toHaveBeenCalled()
  })

  it('defaults Claude Code edit dispatches to tool-enabled mutate execution', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-claude-default-tools-1',
        selectedChannel: 'claude-code',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 18,
      nextTickAt: 22,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 8,
          windowMs: 1000,
        },
        memory: {
          freeMB: 2048,
          totalMB: 8192,
          usagePercent: 75,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 10,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-claude-default-tools-1',
        decisionTraceId: 'trace-claude-default-tools-1',
        sessionId: 'session-claude-default-tools-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const claudeTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_claude_code') as any
    await claudeTool.execute({
      prompt: 'Patch the runtime regression and update the failing tests.',
    })

    expect(executeTaskThread).toBeCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'codebase-edit',
        effect: 'mutate',
        requestedChannel: 'claude-code',
      }),
      dispatch: expect.objectContaining({
        claudeCode: expect.objectContaining({
          allowTools: true,
        }),
      }),
    }))
  })

  it('defaults Claude Code investigation dispatches to observe-only planning unless tools are explicitly enabled', async () => {
    const executeTaskThread = vi.fn(async () => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-claude-investigation-1',
        selectedChannel: 'claude-code',
      },
      plan: {
        state: 'routed',
      },
      summary: 'done',
      output: null,
    } satisfies MainGatewayExecutionTaskThreadResult))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 18,
      nextTickAt: 22,
      sample: {
        collectedAt: 10,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        cpu: {
          usagePercent: 8,
          windowMs: 1000,
        },
        memory: {
          freeMB: 2048,
          totalMB: 8192,
          usagePercent: 75,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 10,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-claude-investigation-1',
        decisionTraceId: 'trace-claude-investigation-1',
        sessionId: 'session-claude-investigation-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const claudeTool = tools.find((entry: any) => String(entry?.function?.name) === 'executor_run_claude_code') as any
    await claudeTool.execute({
      prompt: 'Inspect the runtime regression and summarize the root cause.',
      kind: 'codebase-investigation',
    })

    expect(executeTaskThread).toBeCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'codebase-investigation',
        effect: 'observe',
        requestedChannel: 'claude-code',
      }),
      dispatch: expect.objectContaining({
        claudeCode: expect.objectContaining({
          allowTools: false,
        }),
      }),
    }))
  })

  it('returns live sensory capture state through the sensory tool facade', async () => {
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 33,
      nextTickAt: 55,
      sample: {
        collectedAt: 11,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'cursor',
          title: 'airi-alice',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'degraded',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: 'inspection',
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 11,
        lastError: null,
        degradedReasons: ['window-thumbnail-stale'],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-1',
        decisionTraceId: 'trace-1',
        sessionId: 'session-1',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-1',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'done',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
    })

    const sensoryTool = tools.find((entry: any) => String(entry?.function?.name) === 'sensory_capture_state') as any
    const result = await sensoryTool.execute({ includeSystemSample: false }) as any

    expect(result.foregroundWindow).toEqual({
      appName: 'Cursor',
      processName: 'cursor',
      title: 'airi-alice',
    })
    expect(result.capture).toEqual(expect.objectContaining({
      health: 'degraded',
      permission: 'granted',
      degradedReasons: ['window-thumbnail-stale'],
    }))
    expect(result.sample).toEqual({
      collectedAt: 11,
      time: {
        iso: '2026-04-04T00:00:00.000Z',
        local: '2026-04-04 08:00',
        timezone: 'Asia/Shanghai',
      },
    })
  })

  it('auto re-inspects browser workflow after click when an expected phase is provided', async () => {
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      matchedText: 'Alicization 官方文档',
      summary: 'Clicked browser element Alicization 官方文档.',
      output: 'https://example.com/doc',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      summary: 'Waited for browser page readiness.',
      output: 'https://example.com/doc',
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/doc',
        title: 'Alicization 官方文档',
        textExcerpt: 'Alicization 官方文档正文',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: null,
            text: '下一篇',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
      screenSemanticSummary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.82,
          matchedLabels: ['alicization', 'documentation'],
          summary: 'Alicization 官方文档详情页',
        },
        source: {
          id: 'window:chrome-doc',
          name: 'Google Chrome | Alicization 官方文档',
          strategy: 'app-name',
        },
      },
      pagePhase: 'content-detail',
      nextActionIntent: 'continue-browsing',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['content-goal-met'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'content-read-complete-or-next-primary-action-identified',
        failureCondition: 'content-goal-still-unclear-after-reread',
        reentryHint: '继续读取正文和可交互元素，再决定下一步。',
        steps: [],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::baidu-search::content-detail',
        currentPhase: 'content-detail',
        previousPhase: 'search-results',
        progressState: 'advanced',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'search-results',
            title: 'Alicization - 百度搜索',
            url: 'https://www.baidu.com/s?wd=alicization',
          },
          {
            observedAt: 2,
            pagePhase: 'content-detail',
            title: 'Alicization 官方文档',
            url: 'https://example.com/doc',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Alicization 官方文档',
        url: 'https://example.com/doc',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
        confidence: 0.9,
        rationale: '当前已经进入内容页，适合继续用浏览器 DOM 原语推进。',
      },
      suggestedActions: [
        {
          kind: 'browser-read-text',
          title: '读取当前页面正文',
          rationale: '继续读取正文确认内容详情页的下一步。',
          toolName: 'browser_read_page',
          arguments: {
            format: 'text',
            browser: 'chrome',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Google Chrome. Workflow advanced from search-results to content-detail.',
      output: JSON.stringify({
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        blockingSignals: [],
        workflowState: {
          currentPhase: 'content-detail',
          previousPhase: 'search-results',
          progressState: 'advanced',
          targetPhase: 'content-detail',
        },
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization - 百度搜索',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-browser-workflow-follow-up',
        decisionTraceId: 'trace-browser-workflow-follow-up',
        sessionId: 'session-browser-workflow-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement,
      browserWait,
      desktopInspectScene,
    } as any)

    const clickElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_click_element') as any
    expect(clickElementTool).toBeDefined()
    if (!clickElementTool)
      return

    const result = await clickElementTool.execute({
      browser: 'chrome',
      text: 'Alicization 官方文档',
      targetType: 'link',
      expectedPhase: 'content-detail',
      reinspectAfterAction: true,
      inspectionQuestion: '帮我从百度结果里继续找',
    })

    expect(browserClickElement).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      text: 'Alicization 官方文档',
      targetType: 'link',
    }))
    expect(browserWait).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      state: 'complete',
      timeoutMs: 5_000,
    }))
    expect(desktopInspectScene).toHaveBeenCalledWith(expect.objectContaining({
      question: '帮我从百度结果里继续找',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_click_element',
      pagePhase: 'content-detail',
      nextActionIntent: 'continue-browsing',
      browserPageContext: expect.objectContaining({
        browser: 'chrome',
        url: 'https://example.com/doc',
        title: 'Alicization 官方文档',
      }),
      blockingSignals: [],
      workflowPlan: expect.objectContaining({
        targetPhase: 'content-detail',
        continuationMode: 'ready-to-act',
      }),
      workflowState: expect.objectContaining({
        currentPhase: 'content-detail',
        progressState: 'advanced',
      }),
      executionStrategy: expect.objectContaining({
        mode: 'browser-dom',
        recommendedChannel: 'browser',
      }),
      screenSemanticSummary: expect.objectContaining({
        content: expect.objectContaining({
          kind: 'doc',
          summary: 'Alicization 官方文档详情页',
        }),
      }),
      suggestedActions: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'browser_read_page',
        }),
      ]),
      workflowContinuation: expect.objectContaining({
        expectedPhase: 'content-detail',
        observedPhase: 'content-detail',
        progressState: 'advanced',
        matchedExpectedPhase: true,
        autoWaitApplied: true,
        autoWaitStatus: 'completed',
      }),
      postActionInspection: expect.objectContaining({
        pagePhase: 'content-detail',
        workflowState: expect.objectContaining({
          currentPhase: 'content-detail',
          progressState: 'advanced',
        }),
      }),
    }))
    expect(String(result.summary)).toContain('Workflow advanced to content-detail after follow-up inspection.')
    expect(String(result.output)).toContain('"workflowContinuation"')
    expect(String(result.output)).toContain('"postActionInspection"')
    expect(String(result.output)).toContain('"browserPageContext"')
    expect(String(result.output)).toContain('"pagePhase"')
    expect(String(result.output)).toContain('"nextActionIntent"')
    expect(String(result.output)).toContain('"blockingSignals"')
    expect(String(result.output)).toContain('"workflowPlan"')
    expect(String(result.output)).toContain('"workflowState"')
    expect(String(result.output)).toContain('"executionStrategy"')
    expect(String(result.output)).toContain('"screenSemanticSummary"')
    expect(String(result.output)).toContain('"suggestedActions"')
  })

  it('auto continues with the first safe suggested browser action after follow-up inspection when enabled', async () => {
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      matchedText: 'Alicization 官方文档',
      summary: 'Clicked browser element Alicization 官方文档.',
      output: 'https://example.com/doc',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      summary: 'Waited for browser page readiness.',
      output: 'https://example.com/doc',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      content: '这里是 Alicization 官方文档正文。',
      output: '这里是 Alicization 官方文档正文。',
      summary: 'Read browser page content.',
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'content-detail',
      nextActionIntent: 'continue-browsing',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['content-goal-met'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'content-read-complete-or-next-primary-action-identified',
        failureCondition: 'content-goal-still-unclear-after-reread',
        reentryHint: '继续读取正文和可交互元素，再决定下一步。',
        steps: [],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::baidu-search::content-detail',
        currentPhase: 'content-detail',
        previousPhase: 'search-results',
        progressState: 'advanced',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'search-results',
            title: 'Alicization - 百度搜索',
            url: 'https://www.baidu.com/s?wd=alicization',
          },
          {
            observedAt: 2,
            pagePhase: 'content-detail',
            title: 'Alicization 官方文档',
            url: 'https://example.com/doc',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Alicization 官方文档',
        url: 'https://example.com/doc',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
        confidence: 0.9,
        rationale: '当前已经进入内容页，适合继续用浏览器 DOM 原语推进。',
      },
      suggestedActions: [
        {
          kind: 'browser-read-text',
          title: '读取当前页面正文',
          rationale: '继续读取正文确认内容详情页的下一步。',
          toolName: 'browser_read_page',
          arguments: {
            format: 'text',
            browser: 'chrome',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Google Chrome. Workflow advanced from search-results to content-detail.',
      output: JSON.stringify({
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization - 百度搜索',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-browser-auto-continue',
        decisionTraceId: 'trace-browser-auto-continue',
        sessionId: 'session-browser-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement,
      browserReadPage,
      browserWait,
      desktopInspectScene,
    } as any)

    const clickElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_click_element') as any
    expect(clickElementTool).toBeDefined()
    if (!clickElementTool)
      return

    const result = await clickElementTool.execute({
      browser: 'chrome',
      text: 'Alicization 官方文档',
      targetType: 'link',
      expectedPhase: 'content-detail',
      reinspectAfterAction: true,
      inspectionQuestion: '帮我从百度结果里继续找',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_click_element',
      autoContinuation: expect.objectContaining({
        requested: true,
        stoppedReason: 'step-limit-reached',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_read_page',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_read_page',
              content: '这里是 Alicization 官方文档正文。',
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with browser_read_page.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('falls back to browser page reading when follow-up inspection only returns non-executable stabilization guidance', async () => {
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      matchedText: '继续阅读',
      summary: 'Clicked browser element 继续阅读.',
      output: 'continued reading',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://example.com/doc?page=2',
      title: 'Alicization 官方文档（下一页）',
      summary: 'Waited for browser page readiness.',
      output: 'https://example.com/doc?page=2',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/doc?page=2',
      title: 'Alicization 官方文档（下一页）',
      content: '这里是下一页正文内容。',
      output: '这里是下一页正文内容。',
      summary: 'Read browser page content.',
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'content-detail',
      nextActionIntent: 'continue-browsing',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'observe-and-recheck',
        completionSignals: ['content-goal-met'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'content-read-complete-or-next-primary-action-identified',
        failureCondition: 'content-goal-still-unclear-after-reread',
        reentryHint: '继续读取正文和可交互元素，再决定下一步。',
        steps: [],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::content-detail::content-detail',
        currentPhase: 'content-detail',
        previousPhase: 'content-detail',
        progressState: 'steady',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'content-detail',
            title: 'Alicization 官方文档',
            url: 'https://example.com/doc',
          },
          {
            observedAt: 2,
            pagePhase: 'content-detail',
            title: 'Alicization 官方文档（下一页）',
            url: 'https://example.com/doc?page=2',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Alicization 官方文档（下一页）',
        url: 'https://example.com/doc?page=2',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
        confidence: 0.88,
        rationale: '当前已经进入下一页内容详情，先低风险读取正文再决定是否继续推进更稳。',
      },
      suggestedActions: [
        {
          kind: 'stabilize-scene',
          title: '先稳定当前前台界面再继续',
          rationale: '当前页面已经切换，但暂时还没有稳定暴露出更明确的下一步动作。',
        },
      ],
      summary: 'Inspected current desktop scene around Google Chrome. Workflow still holding on content-detail.',
      output: JSON.stringify({
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization 官方文档',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-browser-fallback-read-page',
        decisionTraceId: 'trace-browser-fallback-read-page',
        sessionId: 'session-browser-fallback-read-page',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement,
      browserReadPage,
      browserWait,
      desktopInspectScene,
    } as any)

    const clickElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_click_element') as any
    expect(clickElementTool).toBeDefined()
    if (!clickElementTool)
      return

    const result = await clickElementTool.execute({
      browser: 'chrome',
      text: '继续阅读',
      targetType: 'button',
      expectedPhase: 'content-detail',
      reinspectAfterAction: true,
      inspectionQuestion: '继续阅读后现在页面到了哪一步',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_click_element',
      autoContinuation: expect.objectContaining({
        requested: true,
        stoppedReason: 'step-limit-reached',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_read_page',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_read_page',
              content: '这里是下一页正文内容。',
            }),
          }),
        ]),
      }),
    }))
  })

  it('does not auto continue high-impact browser text submit actions without confirmation', async () => {
    const browserTypeText = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_type_text',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetText: input.targetText ?? null,
      submit: input.submit ?? false,
      summary: 'Typed browser text and submitted the form.',
      output: input.text ?? null,
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'form-entry',
      nextActionIntent: 'fill-form',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['form-step-advanced', 'next-page-visible'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'form-submitted-and-next-page-visible',
        failureCondition: 'form-submit-still-pending',
        reentryHint: '先确认内容无误，再决定是否真的发布。',
        steps: [
          {
            id: 'fill-and-submit-form',
            title: '输入微博内容并发布',
            rationale: '当前建议会在输入后直接触发发布。',
            status: 'ready',
            toolName: 'browser_type_text',
            arguments: {
              browser: 'chrome',
              text: '今天继续推进 Alicization',
              targetText: '发微博',
              submit: true,
              inspectionQuestion: '帮我在发微博输入框里输入 "今天继续推进 Alicization" 然后发布',
            },
          },
        ],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::weibo-compose::content-detail',
        currentPhase: 'form-entry',
        previousPhase: 'social-feed',
        progressState: 'steady',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'form-entry',
            title: '发微博',
            url: 'https://weibo.com/compose',
          },
        ],
        lastInspectionAt: 1,
        updatedAt: 1,
        title: '发微博',
        url: 'https://weibo.com/compose',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
        confidence: 0.9,
        rationale: '当前在微博发布编辑器里，适合继续浏览器 DOM 原语。',
      },
      suggestedActions: [
        {
          kind: 'workflow-step:fill-and-submit-form',
          title: '输入微博内容并发布',
          rationale: '当前建议会在输入后直接触发发布。',
          toolName: 'browser_type_text',
          arguments: {
            browser: 'chrome',
            text: '今天继续推进 Alicization',
            targetText: '发微博',
            submit: true,
            inspectionQuestion: '帮我在发微博输入框里输入 "今天继续推进 Alicization" 然后发布',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Google Chrome.',
      output: JSON.stringify({
        pagePhase: 'form-entry',
        nextActionIntent: 'fill-form',
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: '发微博',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-weibo-high-impact-submit-guard',
        decisionTraceId: 'trace-weibo-high-impact-submit-guard',
        sessionId: 'session-weibo-high-impact-submit-guard',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserTypeText,
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '帮我在发微博输入框里输入 "今天继续推进 Alicization" 然后发布',
      maxSuggestedActions: 3,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(browserTypeText).not.toHaveBeenCalled()
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 1,
        stoppedReason: 'high-impact-action-requires-confirmation',
      }),
    }))
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('does not auto continue community thread submit actions without confirmation', async () => {
    const browserTypeText = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_type_text',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetText: input.targetText ?? null,
      submit: input.submit ?? false,
      summary: 'Typed browser text and submitted the form.',
      output: input.text ?? null,
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'form-entry',
      nextActionIntent: 'fill-form',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['form-step-advanced', 'next-page-visible'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'form-submitted-and-next-page-visible',
        failureCondition: 'form-submit-still-pending',
        reentryHint: '先确认讨论内容无误，再决定是否真的创建主题。',
        steps: [
          {
            id: 'fill-and-submit-form',
            title: '输入讨论内容并创建主题',
            rationale: '当前建议会在输入后直接触发创建主题。',
            status: 'ready',
            toolName: 'browser_type_text',
            arguments: {
              browser: 'chrome',
              text: 'Ship the new build tonight',
              targetText: 'Discussion body',
              submit: true,
              inspectionQuestion: 'type "Ship the new build tonight" into the discussion body and then create thread',
            },
          },
        ],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::community-compose::content-detail',
        currentPhase: 'form-entry',
        previousPhase: 'social-feed',
        progressState: 'steady',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'form-entry',
            title: 'Create thread',
            url: 'https://community.example.com/threads/new',
          },
        ],
        lastInspectionAt: 1,
        updatedAt: 1,
        title: 'Create thread',
        url: 'https://community.example.com/threads/new',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
        confidence: 0.9,
        rationale: '当前在社区创建主题编辑器里，适合继续浏览器 DOM 原语。',
      },
      suggestedActions: [
        {
          kind: 'workflow-step:fill-and-submit-form',
          title: '输入讨论内容并创建主题',
          rationale: '当前建议会在输入后直接触发创建主题。',
          toolName: 'browser_type_text',
          arguments: {
            browser: 'chrome',
            text: 'Ship the new build tonight',
            targetText: 'Discussion body',
            submit: true,
            inspectionQuestion: 'type "Ship the new build tonight" into the discussion body and then create thread',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Google Chrome.',
      output: JSON.stringify({
        pagePhase: 'form-entry',
        nextActionIntent: 'fill-form',
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Create thread',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-community-high-impact-submit-guard',
        decisionTraceId: 'trace-community-high-impact-submit-guard',
        sessionId: 'session-community-high-impact-submit-guard',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserTypeText,
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: 'type "Ship the new build tonight" into the discussion body and then create thread',
      maxSuggestedActions: 3,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(browserTypeText).not.toHaveBeenCalled()
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 1,
        stoppedReason: 'high-impact-action-requires-confirmation',
      }),
    }))
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('does not auto continue upload submit actions across browser-to-desktop handoff without confirmation', async () => {
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      summary: 'Clicked browser element 选择文件.',
      output: '选择文件',
    }))
    const desktopTypeText = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_type_text',
      channel: 'desktop',
      text: input.text ?? null,
      targetText: input.targetText ?? null,
      submit: input.submit ?? false,
      summary: 'Typed desktop text and submitted the dialog.',
      output: input.text ?? null,
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'browser-desktop-handoff',
      nextActionIntent: 'confirm-dialog',
      blockingSignals: ['desktop-dialog-visible', 'awaiting-selection'],
      workflowPlan: {
        continuationMode: 'handoff-to-desktop',
        completionSignals: ['dialog-dismissed', 'upload-flow-returned-to-browser'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
        failureCondition: 'native-dialog-still-blocking-browser-flow',
        reentryHint: '如果还停在原生对话框，继续完成文件输入或确认动作。',
        steps: [],
        targetPhase: 'upload-flow',
      },
      workflowState: {
        taskKey: 'browser::upload-handoff::upload-flow',
        currentPhase: 'browser-desktop-handoff',
        previousPhase: null,
        progressState: 'started',
        targetPhase: 'upload-flow',
        history: [
          {
            observedAt: 1,
            pagePhase: 'browser-desktop-handoff',
            title: 'Choose File',
          },
        ],
        lastInspectionAt: 1,
        updatedAt: 1,
        title: 'Choose File',
      },
      executionStrategy: {
        mode: 'browser-desktop-handoff',
        recommendedChannel: 'desktop',
        recommendedToolNames: ['desktop_type_text', 'desktop_click_element', 'desktop_wait'],
        confidence: 0.92,
        rationale: '当前浏览器流程已经切到原生文件选择对话框，先走桌面原语完成桥接。',
      },
      suggestedActions: [
        {
          kind: 'desktop-type-requested-input',
          title: '先向“文件名”输入指定内容',
          rationale: '文件对话框已经可交互，先输入文件名并提交。',
          toolName: 'desktop_type_text',
          arguments: {
            text: 'demo.png',
            targetText: '文件名',
            submit: true,
            expectedPhase: 'upload-flow',
            reinspectAfterAction: true,
            inspectionQuestion: '帮我完成文件上传',
            inspectionMaxSuggestedActions: 3,
          },
        },
      ],
      summary: 'Inspected current desktop scene around Chrome. Workflow is holding on browser-desktop-handoff.',
      output: JSON.stringify({
        pagePhase: 'browser-desktop-handoff',
        nextActionIntent: 'confirm-dialog',
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Upload',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 3072,
          totalMB: 4096,
          usagePercent: 25,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-upload-high-impact-submit-guard',
        decisionTraceId: 'trace-upload-high-impact-submit-guard',
        sessionId: 'session-upload-high-impact-submit-guard',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement,
      desktopTypeText,
      desktopInspectScene,
    } as any)

    const clickBrowserElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_click_element') as any
    expect(clickBrowserElementTool).toBeDefined()
    if (!clickBrowserElementTool)
      return

    const result = await clickBrowserElementTool.execute({
      browser: 'chrome',
      text: '选择文件',
      targetType: 'button',
      expectedPhase: 'browser-desktop-handoff',
      reinspectAfterAction: true,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
      inspectionQuestion: '帮我完成文件上传',
      inspectionMaxSuggestedActions: 3,
    })

    expect(browserClickElement).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      text: '选择文件',
      targetType: 'button',
    }))
    expect(desktopInspectScene).toHaveBeenCalled()
    expect(desktopTypeText).not.toHaveBeenCalled()
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_click_element',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        stoppedReason: 'high-impact-action-requires-confirmation',
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continuation paused before a high-impact action requiring confirmation.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('desktop inspect scene auto continues low-risk upload bridge clicks before pausing on desktop submit confirmation', async () => {
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      summary: 'Clicked browser element 选择文件.',
      output: '选择文件',
    }))
    const desktopTypeText = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_type_text',
      channel: 'desktop',
      text: input.text ?? null,
      targetText: input.targetText ?? null,
      submit: input.submit ?? false,
      summary: 'Typed desktop text and submitted the dialog.',
      output: input.text ?? null,
    }))
    const desktopInspectScene = vi.fn(async (input: any) => {
      if (String(input.question ?? '').includes('先点上传图片')) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'form-entry',
          nextActionIntent: 'upload-media',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['native-dialog-opened', 'upload-entry-opened'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'upload-entry-clicked-and-dialog-visible',
            failureCondition: 'upload-entry-missing-or-dialog-not-opened',
            reentryHint: '如果上传入口已经打开原生文件框，就继续桌面桥接。',
            steps: [],
            targetPhase: 'browser-desktop-handoff',
          },
          workflowState: {
            taskKey: 'browser::upload-bridge::upload-flow',
            currentPhase: 'form-entry',
            previousPhase: null,
            progressState: 'started',
            targetPhase: 'browser-desktop-handoff',
            history: [
              {
                observedAt: 1,
                pagePhase: 'form-entry',
                title: '发微博',
              },
            ],
            lastInspectionAt: 1,
            updatedAt: 1,
            title: '发微博',
            url: 'https://weibo.com/compose',
          },
          executionStrategy: {
            mode: 'browser-dom',
            recommendedChannel: 'browser',
            recommendedToolNames: ['browser_click_element', 'browser_type_text', 'browser_read_page', 'browser_wait'],
            confidence: 0.93,
            rationale: '当前仍在浏览器发帖编辑器里，先点上传图片把流程桥接到原生文件框。',
          },
          suggestedActions: [
            {
              kind: 'open-upload-entry',
              title: '点击“选择文件”继续上传图片',
              rationale: '先打开原生文件选择对话框，把当前发帖流桥接到桌面文件框。',
              toolName: 'browser_click_element',
              arguments: {
                browser: 'chrome',
                text: '选择文件',
                targetType: 'button',
                expectedPhase: 'browser-desktop-handoff',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                maxAutoContinueSteps: 1,
                inspectionQuestion: '帮我完成文件上传',
                inspectionMaxSuggestedActions: 3,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Chrome. Workflow is ready to bridge from form-entry to browser-desktop-handoff.',
          output: JSON.stringify({
            pagePhase: 'form-entry',
            nextActionIntent: 'upload-media',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'browser-desktop-handoff',
        nextActionIntent: 'confirm-dialog',
        blockingSignals: ['desktop-dialog-visible', 'awaiting-selection'],
        workflowPlan: {
          continuationMode: 'handoff-to-desktop',
          completionSignals: ['dialog-dismissed', 'upload-flow-returned-to-browser'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
          failureCondition: 'native-dialog-still-blocking-browser-flow',
          reentryHint: '如果还停在原生对话框，继续完成文件输入或确认动作。',
          steps: [],
          targetPhase: 'upload-flow',
        },
        workflowState: {
          taskKey: 'browser::upload-handoff::upload-flow',
          currentPhase: 'browser-desktop-handoff',
          previousPhase: 'form-entry',
          progressState: 'advanced',
          targetPhase: 'upload-flow',
          history: [
            {
              observedAt: 1,
              pagePhase: 'form-entry',
              title: '发微博',
            },
            {
              observedAt: 2,
              pagePhase: 'browser-desktop-handoff',
              title: 'Choose File',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: 'Choose File',
        },
        executionStrategy: {
          mode: 'browser-desktop-handoff',
          recommendedChannel: 'desktop',
          recommendedToolNames: ['desktop_type_text', 'desktop_click_element', 'desktop_wait'],
          confidence: 0.92,
          rationale: '当前浏览器流程已经切到原生文件选择对话框，先走桌面原语完成桥接。',
        },
        suggestedActions: [
          {
            kind: 'desktop-type-requested-input',
            title: '先向“文件名”输入指定内容',
            rationale: '文件对话框已经可交互，先输入文件名并提交。',
            toolName: 'desktop_type_text',
            arguments: {
              text: 'demo.png',
              targetText: '文件名',
              submit: true,
              expectedPhase: 'upload-flow',
              reinspectAfterAction: true,
              inspectionQuestion: '帮我完成文件上传',
              inspectionMaxSuggestedActions: 3,
            },
          },
        ],
        summary: 'Inspected current desktop scene around Chrome. Workflow is holding on browser-desktop-handoff.',
        output: JSON.stringify({
          pagePhase: 'browser-desktop-handoff',
          nextActionIntent: 'confirm-dialog',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: '发微博',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 3072,
          totalMB: 4096,
          usagePercent: 25,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-upload-bridge-auto-continue-guard',
        decisionTraceId: 'trace-upload-bridge-auto-continue-guard',
        sessionId: 'session-upload-bridge-auto-continue-guard',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement,
      desktopTypeText,
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '先点上传图片，再继续完成文件上传',
      maxSuggestedActions: 3,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(browserClickElement).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      text: '选择文件',
      targetType: 'button',
      expectedPhase: 'browser-desktop-handoff',
    }))
    expect(desktopTypeText).not.toHaveBeenCalled()
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_click_element',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_click_element',
              autoContinuation: expect.objectContaining({
                requested: true,
                maxSteps: 1,
                stoppedReason: 'high-impact-action-requires-confirmation',
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with browser_click_element.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('does not auto continue into publish click when follow-up inspection is awaiting host input', async () => {
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      url: 'https://weibo.com/compose',
      title: '发微博',
      matchedText: input.text ?? '发微博',
      summary: `Clicked browser element ${input.text ?? '发微博'}.`,
      output: 'https://weibo.com/compose',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://weibo.com/compose',
      title: '发微博',
      summary: 'Waited for browser page readiness.',
      output: 'https://weibo.com/compose',
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      browserPageContext: {
        browser: 'chrome',
        url: 'https://weibo.com/compose',
        title: '发微博',
        textExcerpt: '有什么新鲜事想分享给大家？',
        interactables: [
          {
            tag: 'textarea',
            role: 'textbox',
            type: null,
            text: '有什么新鲜事想分享给大家？',
            ariaLabel: '发微博输入框',
            title: null,
            href: null,
            disabled: false,
          },
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '发布',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
      screenSemanticSummary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.95,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.81,
          matchedLabels: ['weibo', 'compose'],
          summary: '微博发布编辑器',
        },
        source: {
          id: 'window:chrome-weibo-compose',
          name: 'Google Chrome | 发微博',
          strategy: 'app-name',
        },
      },
      pagePhase: 'form-entry',
      nextActionIntent: 'fill-form',
      blockingSignals: ['awaiting-input'],
      workflowPlan: {
        continuationMode: 'await-host-input',
        completionSignals: ['form-step-advanced', 'next-page-visible'],
        blockingReasons: ['awaiting-input'],
        repairActions: [],
        advanceCondition: 'form-submitted-and-next-page-visible',
        failureCondition: 'form-still-awaiting-input-after-submit',
        reentryHint: '先补齐微博内容，再决定是否发布。',
        steps: [
          {
            id: 'fill-current-form',
            title: '完成当前表单输入',
            rationale: '当前微博编辑器还在等输入内容，先填写内容再继续。',
            status: 'blocked',
          },
          {
            id: 'advance-form-flow',
            title: '提交当前表单并观察下一页',
            rationale: '输入完成后，再决定是否提交。',
            status: 'pending',
            toolName: 'browser_click_element',
            arguments: {
              browser: 'chrome',
              text: '发布',
              targetType: 'button',
              expectedPhase: 'content-detail',
              reinspectAfterAction: true,
              inspectionQuestion: '帮我继续发微博',
              inspectionMaxSuggestedActions: 3,
              autoContinueSuggestedActions: true,
              maxAutoContinueSteps: 1,
            },
            postActionExpectedPhase: 'content-detail',
          },
        ],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::weibo-compose::content-detail',
        currentPhase: 'form-entry',
        previousPhase: 'social-feed',
        progressState: 'advanced',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'social-feed',
            title: '微博',
            url: 'https://weibo.com',
          },
          {
            observedAt: 2,
            pagePhase: 'form-entry',
            title: '发微博',
            url: 'https://weibo.com/compose',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: '发微博',
        url: 'https://weibo.com/compose',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
        confidence: 0.9,
        rationale: '当前已经进入微博发布编辑器，适合继续用浏览器 DOM 原语推进。',
      },
      suggestedActions: [
        {
          kind: 'workflow-step:fill-current-form',
          title: '完成当前表单输入',
          rationale: '当前微博编辑器还在等输入内容，先填写内容再继续。',
        },
        {
          kind: 'workflow-step:advance-form-flow',
          title: '提交当前表单并观察下一页',
          rationale: '输入完成后，再决定是否提交。',
          toolName: 'browser_click_element',
          arguments: {
            browser: 'chrome',
            text: '发布',
            targetType: 'button',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: '帮我继续发微博',
            inspectionMaxSuggestedActions: 3,
            autoContinueSuggestedActions: true,
            maxAutoContinueSteps: 1,
          },
        },
      ],
      summary: 'Inspected current desktop scene around Google Chrome. Workflow advanced from social-feed to form-entry.',
      output: JSON.stringify({
        pagePhase: 'form-entry',
        nextActionIntent: 'fill-form',
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: '微博',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-weibo-compose-await-host-input',
        decisionTraceId: 'trace-weibo-compose-await-host-input',
        sessionId: 'session-weibo-compose-await-host-input',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement,
      browserWait,
      desktopInspectScene,
    } as any)

    const clickElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_click_element') as any
    expect(clickElementTool).toBeDefined()
    if (!clickElementTool)
      return

    const result = await clickElementTool.execute({
      browser: 'chrome',
      text: '发微博',
      targetType: 'button',
      expectedPhase: 'form-entry',
      reinspectAfterAction: true,
      inspectionQuestion: '帮我继续发微博',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(browserClickElement).toHaveBeenCalledTimes(1)
    expect(browserClickElement).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      text: '发微博',
      targetType: 'button',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_click_element',
      pagePhase: 'form-entry',
      nextActionIntent: 'fill-form',
      workflowPlan: expect.objectContaining({
        continuationMode: 'await-host-input',
        targetPhase: 'content-detail',
      }),
      workflowContinuation: expect.objectContaining({
        expectedPhase: 'form-entry',
        observedPhase: 'form-entry',
        matchedExpectedPhase: true,
        progressState: 'advanced',
      }),
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 1,
        stoppedReason: 'await-host-input',
      }),
    }))
    expect(String(result.summary)).toContain('Workflow advanced to form-entry after follow-up inspection.')
    expect(String(result.summary)).not.toContain('Auto-continued with browser_click_element')
  })

  it('auto re-inspects desktop handoff workflow after click when an expected phase is provided', async () => {
    const desktopClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
      text: input.text ?? null,
      role: input.role ?? null,
      matchedText: '打开',
      summary: 'Clicked desktop element 打开.',
      output: '打开',
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/upload',
        title: 'Upload asset',
        textExcerpt: '上传资产表单',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '上传',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
      guiStructure: {
        interactableCount: 3,
        enabledInteractableCount: 3,
        roleCounts: {
          button: 2,
          input: 1,
        },
        primaryActionCandidates: [
          {
            role: 'button',
            text: '上传',
            enabled: true,
            ordinal: 1,
          },
        ],
        primaryInputCandidates: [
          {
            role: 'input',
            text: '文件名',
            enabled: true,
            ordinal: 1,
          },
        ],
      },
      unavailableReason: 'screen-semantic-weak-summary',
      pagePhase: 'upload-flow',
      nextActionIntent: 'fill-form',
      blockingSignals: ['awaiting-selection'],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['file-selected', 'upload-flow-ready'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
        failureCondition: 'native-dialog-still-blocking-browser-flow',
        reentryHint: '继续确认上传区是否已经回到浏览器。',
        steps: [],
        targetPhase: 'upload-flow',
      },
      workflowState: {
        taskKey: 'browser::upload-handoff::upload-flow',
        currentPhase: 'upload-flow',
        previousPhase: 'browser-desktop-handoff',
        progressState: 'advanced',
        targetPhase: 'upload-flow',
        history: [
          {
            observedAt: 1,
            pagePhase: 'browser-desktop-handoff',
            title: 'Choose File',
          },
          {
            observedAt: 2,
            pagePhase: 'upload-flow',
            title: 'Upload asset',
            url: 'https://example.com/upload',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Upload asset',
        url: 'https://example.com/upload',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
        confidence: 0.88,
        rationale: '当前已经回到浏览器上传流，适合继续走浏览器 DOM 原语。',
      },
      suggestedActions: [
        {
          kind: 'browser-read-text',
          title: '读取当前上传页正文',
          rationale: '先确认上传页是否还缺少文件选择或表单补充。',
          toolName: 'browser_read_page',
          arguments: {
            format: 'text',
            browser: 'chrome',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Chrome. Workflow advanced from browser-desktop-handoff to upload-flow.',
      output: JSON.stringify({
        pagePhase: 'upload-flow',
        nextActionIntent: 'fill-form',
        blockingSignals: ['awaiting-selection'],
        workflowState: {
          currentPhase: 'upload-flow',
          previousPhase: 'browser-desktop-handoff',
          progressState: 'advanced',
          targetPhase: 'upload-flow',
        },
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Choose File',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-desktop-workflow-follow-up',
        decisionTraceId: 'trace-desktop-workflow-follow-up',
        sessionId: 'session-desktop-workflow-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopClickElement,
      desktopInspectScene,
    } as any)

    const clickDesktopElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_click_element') as any
    expect(clickDesktopElementTool).toBeDefined()
    if (!clickDesktopElementTool)
      return

    const result = await clickDesktopElementTool.execute({
      text: '打开',
      role: 'button',
      expectedPhase: 'upload-flow',
      reinspectAfterAction: true,
      inspectionQuestion: '下一步该点什么完成上传',
    })

    expect(desktopClickElement).toHaveBeenCalledWith(expect.objectContaining({
      text: '打开',
      role: 'button',
    }))
    expect(desktopInspectScene).toHaveBeenCalledWith(expect.objectContaining({
      question: '下一步该点什么完成上传',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_click_element',
      pagePhase: 'upload-flow',
      nextActionIntent: 'fill-form',
      browserPageContext: expect.objectContaining({
        browser: 'chrome',
        url: 'https://example.com/upload',
        title: 'Upload asset',
      }),
      guiStructure: expect.objectContaining({
        interactableCount: 3,
        roleCounts: expect.objectContaining({
          button: 2,
          input: 1,
        }),
      }),
      unavailableReason: 'screen-semantic-weak-summary',
      blockingSignals: expect.arrayContaining(['awaiting-selection']),
      workflowPlan: expect.objectContaining({
        targetPhase: 'upload-flow',
        continuationMode: 'ready-to-act',
      }),
      workflowState: expect.objectContaining({
        currentPhase: 'upload-flow',
        progressState: 'advanced',
      }),
      executionStrategy: expect.objectContaining({
        mode: 'browser-dom',
        recommendedChannel: 'browser',
      }),
      suggestedActions: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'browser_read_page',
        }),
      ]),
      workflowContinuation: expect.objectContaining({
        expectedPhase: 'upload-flow',
        observedPhase: 'upload-flow',
        progressState: 'advanced',
        matchedExpectedPhase: true,
        autoWaitApplied: false,
      }),
      postActionInspection: expect.objectContaining({
        pagePhase: 'upload-flow',
        workflowState: expect.objectContaining({
          currentPhase: 'upload-flow',
          progressState: 'advanced',
        }),
      }),
    }))
    expect(String(result.summary)).toContain('Workflow advanced to upload-flow after follow-up inspection.')
    expect(String(result.output)).toContain('"workflowContinuation"')
    expect(String(result.output)).toContain('"postActionInspection"')
    expect(String(result.output)).toContain('"browserPageContext"')
    expect(String(result.output)).toContain('"guiStructure"')
    expect(String(result.output)).toContain('"pagePhase"')
    expect(String(result.output)).toContain('"nextActionIntent"')
    expect(String(result.output)).toContain('"blockingSignals"')
    expect(String(result.output)).toContain('"workflowPlan"')
    expect(String(result.output)).toContain('"workflowState"')
    expect(String(result.output)).toContain('"executionStrategy"')
    expect(String(result.output)).toContain('"suggestedActions"')
    expect(String(result.output)).toContain('"unavailableReason"')
  })

  it('auto continues with the first safe suggested browser action after desktop handoff follow-up when enabled', async () => {
    const desktopClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
      text: input.text ?? null,
      role: input.role ?? null,
      matchedText: '打开',
      summary: 'Clicked desktop element 打开.',
      output: '打开',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/upload',
      title: 'Upload asset',
      content: 'Upload asset and finish the form.',
      output: 'Upload asset and finish the form.',
      summary: 'Read upload flow page content.',
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'upload-flow',
      nextActionIntent: 'fill-form',
      blockingSignals: ['awaiting-selection'],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['file-selected', 'upload-flow-ready'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
        failureCondition: 'native-dialog-still-blocking-browser-flow',
        reentryHint: '继续确认上传区是否已经回到浏览器。',
        steps: [],
        targetPhase: 'upload-flow',
      },
      workflowState: {
        taskKey: 'browser::upload-handoff::upload-flow',
        currentPhase: 'upload-flow',
        previousPhase: 'browser-desktop-handoff',
        progressState: 'advanced',
        targetPhase: 'upload-flow',
        history: [
          {
            observedAt: 1,
            pagePhase: 'browser-desktop-handoff',
            title: 'Choose File',
          },
          {
            observedAt: 2,
            pagePhase: 'upload-flow',
            title: 'Upload asset',
            url: 'https://example.com/upload',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Upload asset',
        url: 'https://example.com/upload',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
        confidence: 0.88,
        rationale: '当前已经回到浏览器上传流，适合继续走浏览器 DOM 原语。',
      },
      suggestedActions: [
        {
          kind: 'browser-read-text',
          title: '读取当前上传页正文',
          rationale: '先确认上传页是否还缺少文件选择或表单补充。',
          toolName: 'browser_read_page',
          arguments: {
            format: 'text',
            browser: 'chrome',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Chrome. Workflow advanced from browser-desktop-handoff to upload-flow.',
      output: JSON.stringify({
        pagePhase: 'upload-flow',
        nextActionIntent: 'fill-form',
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Choose File',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-desktop-auto-continue',
        decisionTraceId: 'trace-desktop-auto-continue',
        sessionId: 'session-desktop-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserReadPage,
      desktopClickElement,
      desktopInspectScene,
    } as any)

    const clickDesktopElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_click_element') as any
    expect(clickDesktopElementTool).toBeDefined()
    if (!clickDesktopElementTool)
      return

    const result = await clickDesktopElementTool.execute({
      text: '打开',
      role: 'button',
      expectedPhase: 'upload-flow',
      reinspectAfterAction: true,
      inspectionQuestion: '下一步该点什么完成上传',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_click_element',
      autoContinuation: expect.objectContaining({
        requested: true,
        stoppedReason: 'step-limit-reached',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_read_page',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_read_page',
              content: 'Upload asset and finish the form.',
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with browser_read_page.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('reinspects and auto continues when executing the first desktop settings selection workflow step directly', async () => {
    const desktopSelectionSnapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我切换到简体中文然后点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Language & Region',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Language & Region',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'menu-item', text: 'English', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'menu-item', text: '简体中文', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 4, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })
    const firstSelectionAction = desktopSelectionSnapshot.suggestedActions[0]
    expect(firstSelectionAction).toEqual(expect.objectContaining({
      kind: 'workflow-step:select-desktop-setting-item',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '简体中文',
        role: 'menu-item',
      }),
    }))

    const desktopClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
      text: input.text ?? null,
      role: input.role ?? null,
      summary: `Clicked desktop element ${input.text ?? 'unknown'}.`,
      output: input.text ?? 'clicked',
    }))
    const desktopListInteractables = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      interactables: [],
      output: '',
      summary: 'Relisted desktop interactables after applying the setting.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['desktop-setting-selected', 'follow-up-scene-identified'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'desktop-setting-selection-committed-or-follow-up-scene-identified',
            failureCondition: 'desktop-setting-selection-not-applied-or-follow-up-scene-unclear',
            reentryHint: '如果设置页还停在原地，先重新列出控件，再确认目标项、确认按钮或后续场景有没有变化。',
            steps: [],
            targetPhase: 'unknown',
          },
          workflowState: null,
          executionStrategy: {
            mode: 'desktop-dialog',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
            confidence: 0.82,
            rationale: '当前前台界面仍是桌面设置页，继续走桌面对话框原语最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:confirm-desktop-setting-selection',
              title: '点击“完成”确认当前设置选择',
              rationale: '选中目标设置项后，再点击明确的确认按钮提交当前选择，最后重新检查前台界面最稳。',
              toolName: 'desktop_click_element',
              arguments: {
                text: '完成',
                role: 'button',
                expectedPhase: 'unknown',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                inspectionQuestion: '帮我切换到简体中文然后点击完成',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
            {
              kind: 'workflow-step:recheck-desktop-setting-selection-scene',
              title: '重新列出当前桌面控件确认设置选择是否生效',
              rationale: '选择设置项并完成确认后，再次列出前台控件，确认当前选项是否已经切换。',
              toolName: 'desktop_list_interactables',
              arguments: {
                maxItems: 12,
              },
            },
          ],
          summary: 'Inspected current desktop scene around System Settings. Workflow is holding on desktop settings selection.',
          output: JSON.stringify({
            pagePhase: 'unknown',
            nextActionIntent: 'unknown',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'unknown',
        nextActionIntent: 'unknown',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
          completionSignals: ['desktop-setting-selection-checked'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'desktop-setting-selection-checked',
          failureCondition: 'desktop-setting-selection-still-unclear',
          reentryHint: '如果还不确定是否生效，继续重新列出桌面控件确认当前状态。',
          steps: [],
          targetPhase: 'unknown',
        },
        workflowState: null,
        executionStrategy: {
          mode: 'desktop-dialog',
          recommendedChannel: 'desktop',
          recommendedToolNames: ['desktop_list_interactables', 'desktop_click_element', 'desktop_wait'],
          confidence: 0.74,
          rationale: '当前需要重新列出设置页控件确认选择是否已经生效。',
        },
        suggestedActions: [
          {
            kind: 'workflow-step:recheck-desktop-setting-selection-scene',
            title: '重新列出当前桌面控件确认设置选择是否生效',
            rationale: '继续重新列出桌面控件确认当前状态。',
            toolName: 'desktop_list_interactables',
            arguments: {
              maxItems: 12,
            },
          },
        ],
        summary: 'Inspected current desktop scene around System Settings. Confirmation likely applied; recheck the controls.',
        output: JSON.stringify({
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'System Settings',
          processName: 'System Settings',
          title: 'Language & Region',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-desktop-selection-follow-up',
        decisionTraceId: 'trace-desktop-selection-follow-up',
        sessionId: 'session-desktop-selection-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopClickElement,
      desktopInspectScene,
      desktopListInteractables,
    } as any)

    const clickDesktopElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_click_element') as any
    expect(clickDesktopElementTool).toBeDefined()
    if (!clickDesktopElementTool)
      return

    const result = await clickDesktopElementTool.execute(firstSelectionAction.arguments as Record<string, unknown>)

    expect(desktopClickElement).toHaveBeenCalledWith(expect.objectContaining({
      text: '简体中文',
      role: 'menu-item',
    }))
    expect(desktopInspectScene).toHaveBeenCalledWith(expect.objectContaining({
      question: '帮我切换到简体中文然后点击完成',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: '完成',
      role: 'button',
    }))
    expect(desktopListInteractables).toHaveBeenCalledWith(expect.objectContaining({
      maxItems: 12,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_click_element',
      pagePhase: 'unknown',
      nextActionIntent: 'unknown',
      workflowPlan: expect.objectContaining({
        continuationMode: 'ready-to-act',
        targetPhase: 'unknown',
      }),
      executionStrategy: expect.objectContaining({
        mode: 'desktop-dialog',
        recommendedChannel: 'desktop',
      }),
      workflowContinuation: expect.objectContaining({
        expectedPhase: 'unknown',
        observedPhase: 'unknown',
        matchedExpectedPhase: true,
        autoWaitApplied: false,
      }),
      autoContinuation: expect.objectContaining({
        requested: true,
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'desktop_click_element',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'desktop_click_element',
              autoContinuation: expect.objectContaining({
                requested: true,
                executedSteps: expect.arrayContaining([
                  expect.objectContaining({
                    toolName: 'desktop_list_interactables',
                    result: expect.objectContaining({
                      status: 'completed',
                      operation: 'desktop_list_interactables',
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with desktop_click_element, desktop_list_interactables.')
    expect(String(result.output)).toContain('"postActionInspection"')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('reinspects and auto continues when executing a desktop radio selection workflow step directly', async () => {
    const desktopSelectionSnapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我切换到深色模式然后点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Appearance',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Appearance',
        source: 'foreground-window',
        confidence: 0.92,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'radio', text: '浅色模式', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'radio', text: '深色模式', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 4, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })
    const firstSelectionAction = desktopSelectionSnapshot.suggestedActions[0]
    expect(firstSelectionAction).toEqual(expect.objectContaining({
      kind: 'workflow-step:select-desktop-setting-item',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '深色模式',
        role: 'radio',
      }),
    }))

    const desktopClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
      text: input.text ?? null,
      role: input.role ?? null,
      summary: `Clicked desktop element ${input.text ?? 'unknown'}.`,
      output: input.text ?? 'clicked',
    }))
    const desktopListInteractables = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      interactables: [],
      output: '',
      summary: 'Relisted desktop interactables after applying the radio selection.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['desktop-setting-selected', 'follow-up-scene-identified'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'desktop-setting-selection-committed-or-follow-up-scene-identified',
            failureCondition: 'desktop-setting-selection-not-applied-or-follow-up-scene-unclear',
            reentryHint: '如果设置页还停在原地，先重新列出控件，再确认目标项、确认按钮或后续场景有没有变化。',
            steps: [],
            targetPhase: 'unknown',
          },
          workflowState: null,
          executionStrategy: {
            mode: 'desktop-dialog',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
            confidence: 0.83,
            rationale: '当前前台界面仍是桌面设置页，继续走桌面对话框原语最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:confirm-desktop-setting-selection',
              title: '点击“完成”确认当前设置选择',
              rationale: '选中目标设置项后，再点击明确的确认按钮提交当前选择，最后重新检查前台界面最稳。',
              toolName: 'desktop_click_element',
              arguments: {
                text: '完成',
                role: 'button',
                expectedPhase: 'unknown',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                inspectionQuestion: '帮我切换到深色模式然后点击完成',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
            {
              kind: 'workflow-step:recheck-desktop-setting-selection-scene',
              title: '重新列出当前桌面控件确认设置选择是否生效',
              rationale: '选择设置项并完成确认后，再次列出前台控件，确认当前选项是否已经切换。',
              toolName: 'desktop_list_interactables',
              arguments: {
                maxItems: 12,
              },
            },
          ],
          summary: 'Inspected current desktop scene around System Settings. Workflow is holding on desktop settings selection.',
          output: JSON.stringify({
            pagePhase: 'unknown',
            nextActionIntent: 'unknown',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'unknown',
        nextActionIntent: 'unknown',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
          completionSignals: ['desktop-setting-selection-checked'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'desktop-setting-selection-checked',
          failureCondition: 'desktop-setting-selection-still-unclear',
          reentryHint: '如果还不确定是否生效，继续重新列出桌面控件确认当前状态。',
          steps: [],
          targetPhase: 'unknown',
        },
        workflowState: null,
        executionStrategy: {
          mode: 'desktop-dialog',
          recommendedChannel: 'desktop',
          recommendedToolNames: ['desktop_list_interactables', 'desktop_click_element', 'desktop_wait'],
          confidence: 0.75,
          rationale: '当前需要重新列出设置页控件确认选择是否已经生效。',
        },
        suggestedActions: [
          {
            kind: 'workflow-step:recheck-desktop-setting-selection-scene',
            title: '重新列出当前桌面控件确认设置选择是否生效',
            rationale: '继续重新列出桌面控件确认当前状态。',
            toolName: 'desktop_list_interactables',
            arguments: {
              maxItems: 12,
            },
          },
        ],
        summary: 'Inspected current desktop scene around System Settings. Confirmation likely applied; recheck the controls.',
        output: JSON.stringify({
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'System Settings',
          processName: 'System Settings',
          title: 'Appearance',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-desktop-radio-selection-follow-up',
        decisionTraceId: 'trace-desktop-radio-selection-follow-up',
        sessionId: 'session-desktop-radio-selection-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopClickElement,
      desktopInspectScene,
      desktopListInteractables,
    } as any)

    const clickDesktopElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_click_element') as any
    expect(clickDesktopElementTool).toBeDefined()
    if (!clickDesktopElementTool)
      return

    const result = await clickDesktopElementTool.execute(firstSelectionAction.arguments as Record<string, unknown>)

    expect(desktopClickElement).toHaveBeenCalledWith(expect.objectContaining({
      text: '深色模式',
      role: 'radio',
    }))
    expect(desktopInspectScene).toHaveBeenCalledWith(expect.objectContaining({
      question: '帮我切换到深色模式然后点击完成',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: '完成',
      role: 'button',
    }))
    expect(desktopListInteractables).toHaveBeenCalledWith(expect.objectContaining({
      maxItems: 12,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_click_element',
      pagePhase: 'unknown',
      nextActionIntent: 'unknown',
      workflowPlan: expect.objectContaining({
        continuationMode: 'ready-to-act',
        targetPhase: 'unknown',
      }),
      executionStrategy: expect.objectContaining({
        mode: 'desktop-dialog',
        recommendedChannel: 'desktop',
      }),
      workflowContinuation: expect.objectContaining({
        expectedPhase: 'unknown',
        observedPhase: 'unknown',
        matchedExpectedPhase: true,
        autoWaitApplied: false,
      }),
      autoContinuation: expect.objectContaining({
        requested: true,
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'desktop_click_element',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'desktop_click_element',
              autoContinuation: expect.objectContaining({
                requested: true,
                executedSteps: expect.arrayContaining([
                  expect.objectContaining({
                    toolName: 'desktop_list_interactables',
                    result: expect.objectContaining({
                      status: 'completed',
                      operation: 'desktop_list_interactables',
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with desktop_click_element, desktop_list_interactables.')
    expect(String(result.output)).toContain('"postActionInspection"')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('reinspects after switching a desktop tab and continues into follow-up setting actions', async () => {
    const desktopTabSnapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我切换到隐私标签页然后启用麦克风权限再点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Settings',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Settings',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'tab', text: '通用', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'tab', text: '隐私', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 4, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })
    const firstTabAction = desktopTabSnapshot.suggestedActions[0]
    expect(firstTabAction).toEqual(expect.objectContaining({
      kind: 'workflow-step:switch-desktop-tab',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '隐私',
        role: 'tab',
      }),
    }))

    const desktopClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
      text: input.text ?? null,
      role: input.role ?? null,
      summary: `Clicked desktop element ${input.text ?? 'unknown'}.`,
      output: input.text ?? 'clicked',
    }))
    const desktopListInteractables = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      interactables: [
        { ordinal: 1, role: 'checkbox', text: '麦克风权限', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
      ],
      output: '',
      summary: 'Relisted desktop interactables after switching the tab.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['desktop-setting-toggled', 'follow-up-scene-identified'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'desktop-toggle-committed-or-follow-up-scene-identified',
            failureCondition: 'desktop-toggle-not-applied-or-follow-up-scene-unclear',
            reentryHint: '如果隐私设置页已经出现，先继续切换目标权限，再确认按钮或后续场景有没有变化。',
            steps: [],
            targetPhase: 'unknown',
          },
          workflowState: null,
          executionStrategy: {
            mode: 'desktop-dialog',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
            confidence: 0.83,
            rationale: '当前前台界面已经切到设置页，继续走桌面对话框原语最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:toggle-desktop-setting',
              title: '切换“麦克风权限”设置开关',
              rationale: '隐私标签页已经打开，继续点击目标权限开关最稳。',
              toolName: 'desktop_click_element',
              arguments: {
                text: '麦克风权限',
                role: 'checkbox',
                expectedPhase: 'unknown',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                inspectionQuestion: '帮我切换到隐私标签页然后启用麦克风权限再点击完成',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around System Settings. Privacy controls are now visible.',
          output: JSON.stringify({
            pagePhase: 'unknown',
            nextActionIntent: 'unknown',
          }),
        }
      }

      if (inspectionCount === 2) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['desktop-setting-toggled', 'follow-up-scene-identified'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'desktop-toggle-committed-or-follow-up-scene-identified',
            failureCondition: 'desktop-toggle-not-applied-or-follow-up-scene-unclear',
            reentryHint: '如果权限已经切换，再确认当前按钮或后续场景有没有变化。',
            steps: [],
            targetPhase: 'unknown',
          },
          workflowState: null,
          executionStrategy: {
            mode: 'desktop-dialog',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
            confidence: 0.82,
            rationale: '权限开关已经切换，继续点击完成按钮最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:confirm-desktop-setting-change',
              title: '点击“完成”确认当前设置变更',
              rationale: '切换设置后，再点击明确的确认按钮提交当前变更。',
              toolName: 'desktop_click_element',
              arguments: {
                text: '完成',
                role: 'button',
                expectedPhase: 'unknown',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                inspectionQuestion: '帮我切换到隐私标签页然后启用麦克风权限再点击完成',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around System Settings. Ready to confirm the privacy change.',
          output: JSON.stringify({
            pagePhase: 'unknown',
            nextActionIntent: 'unknown',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'unknown',
        nextActionIntent: 'unknown',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
          completionSignals: ['desktop-setting-checked'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'desktop-setting-checked',
          failureCondition: 'desktop-setting-still-unclear',
          reentryHint: '如果还不确定是否生效，继续重新列出桌面控件确认当前状态。',
          steps: [],
          targetPhase: 'unknown',
        },
        workflowState: null,
        executionStrategy: {
          mode: 'desktop-dialog',
          recommendedChannel: 'desktop',
          recommendedToolNames: ['desktop_list_interactables', 'desktop_click_element', 'desktop_wait'],
          confidence: 0.74,
          rationale: '当前需要重新列出设置页控件确认变更是否已经生效。',
        },
        suggestedActions: [
          {
            kind: 'workflow-step:recheck-desktop-setting-scene',
            title: '重新列出当前桌面控件确认设置是否生效',
            rationale: '继续重新列出桌面控件确认当前状态。',
            toolName: 'desktop_list_interactables',
            arguments: {
              maxItems: 12,
            },
          },
        ],
        summary: 'Inspected current desktop scene around System Settings. Confirmation likely applied; recheck the controls.',
        output: JSON.stringify({
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'System Settings',
          processName: 'System Settings',
          title: 'Settings',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-desktop-tab-follow-up',
        decisionTraceId: 'trace-desktop-tab-follow-up',
        sessionId: 'session-desktop-tab-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopClickElement,
      desktopInspectScene,
      desktopListInteractables,
    } as any)

    const clickDesktopElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_click_element') as any
    expect(clickDesktopElementTool).toBeDefined()
    if (!clickDesktopElementTool)
      return

    const result = await clickDesktopElementTool.execute(firstTabAction.arguments as Record<string, unknown>)

    expect(desktopClickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '隐私',
      role: 'tab',
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: '麦克风权限',
      role: 'checkbox',
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(3, expect.objectContaining({
      text: '完成',
      role: 'button',
    }))
    expect(desktopListInteractables).toHaveBeenCalledWith(expect.objectContaining({
      maxItems: 12,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_click_element',
      executionStrategy: expect.objectContaining({
        mode: 'desktop-dialog',
      }),
      autoContinuation: expect.objectContaining({
        requested: true,
      }),
    }))
  })

  it('reinspects after selecting a desktop list item and continues into follow-up setting actions', async () => {
    const desktopNavigationSnapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我打开隐私侧边栏然后启用麦克风权限再点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Settings',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Settings',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'list-item', text: '通用', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'list-item', text: '隐私', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 4, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })
    const firstNavigationAction = desktopNavigationSnapshot.suggestedActions[0]
    expect(firstNavigationAction).toEqual(expect.objectContaining({
      kind: 'workflow-step:open-desktop-navigation-item',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '隐私',
        role: 'list-item',
      }),
    }))

    const desktopClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
      text: input.text ?? null,
      role: input.role ?? null,
      summary: `Clicked desktop element ${input.text ?? 'unknown'}.`,
      output: input.text ?? 'clicked',
    }))
    const desktopListInteractables = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      interactables: [
        { ordinal: 1, role: 'checkbox', text: '麦克风权限', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
      ],
      output: '',
      summary: 'Relisted desktop interactables after opening the sidebar item.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['desktop-setting-toggled', 'follow-up-scene-identified'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'desktop-toggle-committed-or-follow-up-scene-identified',
            failureCondition: 'desktop-toggle-not-applied-or-follow-up-scene-unclear',
            reentryHint: '如果隐私设置页已经出现，先继续切换目标权限，再确认按钮或后续场景有没有变化。',
            steps: [],
            targetPhase: 'unknown',
          },
          workflowState: null,
          executionStrategy: {
            mode: 'desktop-dialog',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
            confidence: 0.83,
            rationale: '当前前台界面已经切到设置页，继续走桌面对话框原语最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:toggle-desktop-setting',
              title: '切换“麦克风权限”设置开关',
              rationale: '隐私侧边栏已经打开，继续点击目标权限开关最稳。',
              toolName: 'desktop_click_element',
              arguments: {
                text: '麦克风权限',
                role: 'checkbox',
                expectedPhase: 'unknown',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                inspectionQuestion: '帮我打开隐私侧边栏然后启用麦克风权限再点击完成',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around System Settings. Privacy controls are now visible.',
          output: JSON.stringify({
            pagePhase: 'unknown',
            nextActionIntent: 'unknown',
          }),
        }
      }

      if (inspectionCount === 2) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['desktop-setting-toggled', 'follow-up-scene-identified'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'desktop-toggle-committed-or-follow-up-scene-identified',
            failureCondition: 'desktop-toggle-not-applied-or-follow-up-scene-unclear',
            reentryHint: '如果权限已经切换，再确认当前按钮或后续场景有没有变化。',
            steps: [],
            targetPhase: 'unknown',
          },
          workflowState: null,
          executionStrategy: {
            mode: 'desktop-dialog',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
            confidence: 0.82,
            rationale: '权限开关已经切换，继续点击完成按钮最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:confirm-desktop-setting-change',
              title: '点击“完成”确认当前设置变更',
              rationale: '切换设置后，再点击明确的确认按钮提交当前变更。',
              toolName: 'desktop_click_element',
              arguments: {
                text: '完成',
                role: 'button',
                expectedPhase: 'unknown',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                inspectionQuestion: '帮我打开隐私侧边栏然后启用麦克风权限再点击完成',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around System Settings. Ready to confirm the privacy change.',
          output: JSON.stringify({
            pagePhase: 'unknown',
            nextActionIntent: 'unknown',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'unknown',
        nextActionIntent: 'unknown',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
          completionSignals: ['desktop-setting-checked'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'desktop-setting-checked',
          failureCondition: 'desktop-setting-still-unclear',
          reentryHint: '如果还不确定是否生效，继续重新列出桌面控件确认当前状态。',
          steps: [],
          targetPhase: 'unknown',
        },
        workflowState: null,
        executionStrategy: {
          mode: 'desktop-dialog',
          recommendedChannel: 'desktop',
          recommendedToolNames: ['desktop_list_interactables', 'desktop_click_element', 'desktop_wait'],
          confidence: 0.74,
          rationale: '当前需要重新列出设置页控件确认变更是否已经生效。',
        },
        suggestedActions: [
          {
            kind: 'workflow-step:recheck-desktop-setting-scene',
            title: '重新列出当前桌面控件确认设置是否生效',
            rationale: '继续重新列出桌面控件确认当前状态。',
            toolName: 'desktop_list_interactables',
            arguments: {
              maxItems: 12,
            },
          },
        ],
        summary: 'Inspected current desktop scene around System Settings. Confirmation likely applied; recheck the controls.',
        output: JSON.stringify({
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'System Settings',
          processName: 'System Settings',
          title: 'Settings',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-desktop-navigation-follow-up',
        decisionTraceId: 'trace-desktop-navigation-follow-up',
        sessionId: 'session-desktop-navigation-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopClickElement,
      desktopInspectScene,
      desktopListInteractables,
    } as any)

    const clickDesktopElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_click_element') as any
    expect(clickDesktopElementTool).toBeDefined()
    if (!clickDesktopElementTool)
      return

    const result = await clickDesktopElementTool.execute(firstNavigationAction.arguments as Record<string, unknown>)

    expect(desktopClickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '隐私',
      role: 'list-item',
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: '麦克风权限',
      role: 'checkbox',
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(3, expect.objectContaining({
      text: '完成',
      role: 'button',
    }))
    expect(desktopListInteractables).toHaveBeenCalledWith(expect.objectContaining({
      maxItems: 12,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_click_element',
      executionStrategy: expect.objectContaining({
        mode: 'desktop-dialog',
      }),
      autoContinuation: expect.objectContaining({
        requested: true,
      }),
    }))
  })

  it('reinspects after opening a desktop selector and continues into follow-up selection actions', async () => {
    const desktopSelectorSnapshot = buildAlicizationDesktopInspectionSceneSnapshot({
      question: '帮我把首选语言切换到简体中文然后点击完成',
      foregroundWindow: {
        appName: 'System Settings',
        title: 'Language & Region',
      },
      focusTarget: {
        appName: 'System Settings',
        title: 'Language & Region',
        source: 'foreground-window',
        confidence: 0.91,
      },
      capture: null,
      summary: null,
      unavailableReason: null,
      interactables: [
        { ordinal: 1, role: 'select', text: '首选语言', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '取消', enabled: true, actions: ['AXPress'] },
      ],
    })
    const firstSelectorAction = desktopSelectorSnapshot.suggestedActions[0]
    expect(firstSelectorAction).toEqual(expect.objectContaining({
      kind: 'workflow-step:open-desktop-selector',
      toolName: 'desktop_click_element',
      arguments: expect.objectContaining({
        text: '首选语言',
        role: 'select',
      }),
    }))

    const desktopClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
      text: input.text ?? null,
      role: input.role ?? null,
      summary: `Clicked desktop element ${input.text ?? 'unknown'}.`,
      output: input.text ?? 'clicked',
    }))
    const desktopListInteractables = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      interactables: [
        { ordinal: 1, role: 'menu-item', text: 'English', enabled: true, actions: ['AXPress'] },
        { ordinal: 2, role: 'menu-item', text: '简体中文', enabled: true, actions: ['AXPress'] },
        { ordinal: 3, role: 'button', text: '完成', enabled: true, actions: ['AXPress'] },
      ],
      output: '',
      summary: 'Relisted desktop interactables after opening the selector.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['desktop-setting-selected', 'follow-up-scene-identified'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'desktop-setting-selection-committed-or-follow-up-scene-identified',
            failureCondition: 'desktop-setting-selection-not-applied-or-follow-up-scene-unclear',
            reentryHint: '如果选项已经出现，继续选择目标项，再确认按钮或后续场景有没有变化。',
            steps: [],
            targetPhase: 'unknown',
          },
          workflowState: null,
          executionStrategy: {
            mode: 'desktop-dialog',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
            confidence: 0.84,
            rationale: '当前选择器已经展开，继续点击目标选项最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:select-desktop-setting-item',
              title: '选择“简体中文”作为当前设置项',
              rationale: '选择器选项已经出现，继续点击目标项最稳。',
              toolName: 'desktop_click_element',
              arguments: {
                text: '简体中文',
                role: 'menu-item',
                expectedPhase: 'unknown',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                inspectionQuestion: '帮我把首选语言切换到简体中文然后点击完成',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around System Settings. Selector options are now visible.',
          output: JSON.stringify({
            pagePhase: 'unknown',
            nextActionIntent: 'unknown',
          }),
        }
      }

      if (inspectionCount === 2) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['desktop-setting-selected', 'follow-up-scene-identified'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'desktop-setting-selection-committed-or-follow-up-scene-identified',
            failureCondition: 'desktop-setting-selection-not-applied-or-follow-up-scene-unclear',
            reentryHint: '如果选择已经切换，再确认当前按钮或后续场景有没有变化。',
            steps: [],
            targetPhase: 'unknown',
          },
          workflowState: null,
          executionStrategy: {
            mode: 'desktop-dialog',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_click_element', 'desktop_type_text', 'desktop_wait'],
            confidence: 0.82,
            rationale: '当前设置项已经切换，继续点击完成按钮最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:confirm-desktop-setting-selection',
              title: '点击“完成”确认当前设置选择',
              rationale: '选中目标设置项后，再点击明确的确认按钮提交当前选择。',
              toolName: 'desktop_click_element',
              arguments: {
                text: '完成',
                role: 'button',
                expectedPhase: 'unknown',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                inspectionQuestion: '帮我把首选语言切换到简体中文然后点击完成',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around System Settings. Ready to confirm the selected language.',
          output: JSON.stringify({
            pagePhase: 'unknown',
            nextActionIntent: 'unknown',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'unknown',
        nextActionIntent: 'unknown',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
          completionSignals: ['desktop-setting-selection-checked'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'desktop-setting-selection-checked',
          failureCondition: 'desktop-setting-selection-still-unclear',
          reentryHint: '如果还不确定是否生效，继续重新列出桌面控件确认当前状态。',
          steps: [],
          targetPhase: 'unknown',
        },
        workflowState: null,
        executionStrategy: {
          mode: 'desktop-dialog',
          recommendedChannel: 'desktop',
          recommendedToolNames: ['desktop_list_interactables', 'desktop_click_element', 'desktop_wait'],
          confidence: 0.74,
          rationale: '当前需要重新列出设置页控件确认选择是否已经生效。',
        },
        suggestedActions: [
          {
            kind: 'workflow-step:recheck-desktop-setting-selection-scene',
            title: '重新列出当前桌面控件确认设置选择是否生效',
            rationale: '继续重新列出桌面控件确认当前状态。',
            toolName: 'desktop_list_interactables',
            arguments: {
              maxItems: 12,
            },
          },
        ],
        summary: 'Inspected current desktop scene around System Settings. Confirmation likely applied; recheck the controls.',
        output: JSON.stringify({
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'System Settings',
          processName: 'System Settings',
          title: 'Language & Region',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-desktop-selector-follow-up',
        decisionTraceId: 'trace-desktop-selector-follow-up',
        sessionId: 'session-desktop-selector-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopClickElement,
      desktopInspectScene,
      desktopListInteractables,
    } as any)

    const clickDesktopElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_click_element') as any
    expect(clickDesktopElementTool).toBeDefined()
    if (!clickDesktopElementTool)
      return

    const result = await clickDesktopElementTool.execute(firstSelectorAction.arguments as Record<string, unknown>)

    expect(desktopClickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '首选语言',
      role: 'select',
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: '简体中文',
      role: 'menu-item',
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(3, expect.objectContaining({
      text: '完成',
      role: 'button',
    }))
    expect(desktopListInteractables).toHaveBeenCalledWith(expect.objectContaining({
      maxItems: 12,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_click_element',
      executionStrategy: expect.objectContaining({
        mode: 'desktop-dialog',
      }),
      autoContinuation: expect.objectContaining({
        requested: true,
      }),
    }))
  })

  it('auto continues across browser-to-desktop-to-browser workflow suggestions when enabled', async () => {
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      summary: 'Clicked browser element 选择文件.',
      output: '选择文件',
    }))
    const desktopTypeText = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_type_text',
      channel: 'desktop',
      text: input.text ?? null,
      targetText: input.targetText ?? null,
      submit: input.submit ?? false,
      summary: 'Typed desktop text and submitted the dialog.',
      output: input.text ?? null,
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/upload',
      title: 'Upload asset',
      content: 'Upload asset and finish the form.',
      output: 'Upload asset and finish the form.',
      summary: 'Read upload flow page content.',
    }))
    const desktopInspectScene = vi.fn()
      .mockImplementationOnce(async (input: any) => ({
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'browser-desktop-handoff',
        nextActionIntent: 'confirm-dialog',
        blockingSignals: ['desktop-dialog-visible', 'awaiting-selection'],
        workflowPlan: {
          continuationMode: 'handoff-to-desktop',
          completionSignals: ['dialog-dismissed', 'upload-flow-returned-to-browser'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
          failureCondition: 'native-dialog-still-blocking-browser-flow',
          reentryHint: '如果还停在原生对话框，继续完成文件输入或确认动作。',
          steps: [],
          targetPhase: 'upload-flow',
        },
        workflowState: {
          taskKey: 'browser::upload-handoff::upload-flow',
          currentPhase: 'browser-desktop-handoff',
          previousPhase: null,
          progressState: 'started',
          targetPhase: 'upload-flow',
          history: [
            {
              observedAt: 1,
              pagePhase: 'browser-desktop-handoff',
              title: 'Choose File',
            },
          ],
          lastInspectionAt: 1,
          updatedAt: 1,
          title: 'Choose File',
        },
        executionStrategy: {
          mode: 'browser-desktop-handoff',
          recommendedChannel: 'desktop',
          recommendedToolNames: ['desktop_type_text', 'desktop_click_element', 'desktop_wait'],
          confidence: 0.92,
          rationale: '当前浏览器流程已经切到原生文件选择对话框，先走桌面原语完成桥接。',
        },
        suggestedActions: [
          {
            kind: 'desktop-type-requested-input',
            title: '先向“文件名”输入指定内容',
            rationale: '文件对话框已经可交互，先输入文件名并提交。',
            toolName: 'desktop_type_text',
            arguments: {
              text: 'demo.png',
              targetText: '文件名',
              submit: true,
              expectedPhase: 'upload-flow',
              reinspectAfterAction: true,
              inspectionQuestion: '帮我完成文件上传',
              inspectionMaxSuggestedActions: 3,
            },
          },
        ],
        summary: 'Inspected current desktop scene around Chrome. Workflow is holding on browser-desktop-handoff.',
        output: JSON.stringify({
          pagePhase: 'browser-desktop-handoff',
          nextActionIntent: 'confirm-dialog',
        }),
      }))
      .mockImplementationOnce(async (input: any) => ({
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'upload-flow',
        nextActionIntent: 'fill-form',
        blockingSignals: ['awaiting-selection'],
        workflowPlan: {
          continuationMode: 'ready-to-act',
          completionSignals: ['file-selected', 'upload-flow-ready'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
          failureCondition: 'native-dialog-still-blocking-browser-flow',
          reentryHint: '继续确认上传区是否已经回到浏览器。',
          steps: [],
          targetPhase: 'upload-flow',
        },
        workflowState: {
          taskKey: 'browser::upload-handoff::upload-flow',
          currentPhase: 'upload-flow',
          previousPhase: 'browser-desktop-handoff',
          progressState: 'advanced',
          targetPhase: 'upload-flow',
          history: [
            {
              observedAt: 1,
              pagePhase: 'browser-desktop-handoff',
              title: 'Choose File',
            },
            {
              observedAt: 2,
              pagePhase: 'upload-flow',
              title: 'Upload asset',
              url: 'https://example.com/upload',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: 'Upload asset',
          url: 'https://example.com/upload',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
          recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
          confidence: 0.88,
          rationale: '当前已经回到浏览器上传流，适合继续走浏览器 DOM 原语。',
        },
        suggestedActions: [
          {
            kind: 'browser-read-text',
            title: '读取当前上传页正文',
            rationale: '先确认上传页是否还缺少文件选择或表单补充。',
            toolName: 'browser_read_page',
            arguments: {
              format: 'text',
              browser: 'chrome',
            },
          },
        ],
        summary: 'Inspected current desktop scene around Chrome. Workflow advanced from browser-desktop-handoff to upload-flow.',
        output: JSON.stringify({
          pagePhase: 'upload-flow',
          nextActionIntent: 'fill-form',
        }),
      }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Upload',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-bridge-auto-continue',
        decisionTraceId: 'trace-bridge-auto-continue',
        sessionId: 'session-bridge-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement,
      browserReadPage,
      desktopInspectScene,
      desktopTypeText,
    } as any)

    const clickElementTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_click_element') as any
    expect(clickElementTool).toBeDefined()
    if (!clickElementTool)
      return

    const result = await clickElementTool.execute({
      browser: 'chrome',
      text: '选择文件',
      targetType: 'button',
      expectedPhase: 'browser-desktop-handoff',
      reinspectAfterAction: true,
      inspectionQuestion: '帮我完成文件上传',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(desktopTypeText).not.toHaveBeenCalled()
    expect(browserReadPage).not.toHaveBeenCalled()
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_click_element',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        stoppedReason: 'high-impact-action-requires-confirmation',
      }),
    }))
    expect(String(result.summary)).toContain('Workflow advanced to browser-desktop-handoff after follow-up inspection.')
    expect(String(result.summary)).toContain('Auto-continuation paused before a high-impact action requiring confirmation.')
  })

  it('desktop inspect scene auto continues through suggested action chains when enabled', async () => {
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      matchedText: 'Alicization 官方文档',
      summary: 'Clicked browser element Alicization 官方文档.',
      output: 'https://example.com/doc',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      summary: 'Waited for browser page readiness.',
      output: 'https://example.com/doc',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      content: '这里是 Alicization 官方文档正文。',
      output: '这里是 Alicization 官方文档正文。',
      summary: 'Read browser page content.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'search-results',
          nextActionIntent: 'open-search-result',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['content-detail-visible', 'url-changed-from-search-results'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'search-result-opened-and-detail-page-visible',
            failureCondition: 'search-results-still-visible-after-click',
            reentryHint: '如果还停在搜索结果页，继续打开更相关的结果。',
            steps: [],
            targetPhase: 'content-detail',
          },
          workflowState: {
            taskKey: 'browser::baidu-search::content-detail',
            currentPhase: 'search-results',
            previousPhase: null,
            progressState: 'started',
            targetPhase: 'content-detail',
            history: [
              {
                observedAt: 1,
                pagePhase: 'search-results',
                title: 'Alicization - 百度搜索',
                url: 'https://www.baidu.com/s?wd=alicization',
              },
            ],
            lastInspectionAt: 1,
            updatedAt: 1,
            title: 'Alicization - 百度搜索',
            url: 'https://www.baidu.com/s?wd=alicization',
          },
          executionStrategy: {
            mode: 'browser-dom',
            recommendedChannel: 'browser',
            recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
            confidence: 0.9,
            rationale: '当前处在搜索结果页，继续用浏览器 DOM 原语推进最稳。',
          },
          suggestedActions: [
            {
              kind: 'browser-click-primary-action',
              title: '先尝试点击“Alicization 官方文档”',
              rationale: '先打开最相关的搜索结果。',
              toolName: 'browser_click_element',
              arguments: {
                browser: 'chrome',
                text: 'Alicization 官方文档',
                targetType: 'link',
                expectedPhase: 'content-detail',
                reinspectAfterAction: true,
                inspectionQuestion: '帮我从百度结果里继续找',
                inspectionMaxSuggestedActions: 3,
                autoContinueSuggestedActions: true,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Google Chrome. Workflow started on search-results aiming for content-detail.',
          output: JSON.stringify({
            pagePhase: 'search-results',
            nextActionIntent: 'open-search-result',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'ready-to-act',
          completionSignals: ['content-goal-met'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'content-read-complete-or-next-primary-action-identified',
          failureCondition: 'content-goal-still-unclear-after-reread',
          reentryHint: '继续读取正文和可交互元素，再决定下一步。',
          steps: [],
          targetPhase: 'content-detail',
        },
        workflowState: {
          taskKey: 'browser::baidu-search::content-detail',
          currentPhase: 'content-detail',
          previousPhase: 'search-results',
          progressState: 'advanced',
          targetPhase: 'content-detail',
          history: [
            {
              observedAt: 1,
              pagePhase: 'search-results',
              title: 'Alicization - 百度搜索',
              url: 'https://www.baidu.com/s?wd=alicization',
            },
            {
              observedAt: 2,
              pagePhase: 'content-detail',
              title: 'Alicization 官方文档',
              url: 'https://example.com/doc',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: 'Alicization 官方文档',
          url: 'https://example.com/doc',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
          recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
          confidence: 0.9,
          rationale: '当前已经进入内容页，适合继续用浏览器 DOM 原语推进。',
        },
        suggestedActions: [
          {
            kind: 'browser-read-text',
            title: '读取当前页面正文',
            rationale: '继续读取正文确认内容详情页的下一步。',
            toolName: 'browser_read_page',
            arguments: {
              format: 'text',
              browser: 'chrome',
            },
          },
        ],
        summary: 'Inspected current desktop scene around Google Chrome. Workflow advanced from search-results to content-detail.',
        output: JSON.stringify({
          pagePhase: 'content-detail',
          nextActionIntent: 'continue-browsing',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization - 百度搜索',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-inspect-auto-continue',
        decisionTraceId: 'trace-inspect-auto-continue',
        sessionId: 'session-inspect-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement,
      browserReadPage,
      browserWait,
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '帮我从百度结果里继续找',
      maxSuggestedActions: 3,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(browserClickElement).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      text: 'Alicization 官方文档',
      targetType: 'link',
    }))
    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_click_element',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_click_element',
              autoContinuation: expect.objectContaining({
                requested: true,
                executedSteps: expect.arrayContaining([
                  expect.objectContaining({
                    toolName: 'browser_read_page',
                    result: expect.objectContaining({
                      status: 'completed',
                      operation: 'browser_read_page',
                      content: '这里是 Alicization 官方文档正文。',
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    }))
  })

  it('desktop inspect scene auto continues scroll-first content-detail workflows locally before rereading the page', async () => {
    const browserScroll = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_scroll',
      browser: input.browser ?? 'chrome',
      action: input.action ?? 'down',
      amount: input.amount ?? 1,
      url: 'https://example.com/doc#after-scroll',
      summary: 'Scrolled the current browser page downward.',
      output: 'https://example.com/doc#after-scroll',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/doc#after-scroll',
      title: 'Alicization 官方文档',
      content: '这里是向下滚动后继续读取到的新正文。',
      summary: 'Read browser page content after scrolling.',
      output: '这里是向下滚动后继续读取到的新正文。',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'content-detail',
          nextActionIntent: 'continue-browsing',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['new-primary-action-identified', 'content-goal-met'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'content-read-complete-or-next-primary-action-identified',
            failureCondition: 'content-goal-still-unclear-after-reread',
            reentryHint: '如果目标还没完成，继续读取正文和可交互元素，再决定是继续点击、翻页还是回退。',
            steps: [
              {
                id: 'scroll-content-detail',
                title: '先继续向下滚动当前内容页',
                rationale: '页面还能继续向下移动，先滚动去发现新的正文或延续动作。',
                status: 'ready',
                toolName: 'browser_scroll',
                arguments: {
                  browser: 'chrome',
                  action: 'down',
                  amount: 1,
                  expectedPhase: 'content-detail',
                  reinspectAfterAction: true,
                  inspectionQuestion: '帮我继续看这个页面',
                  inspectionMaxSuggestedActions: 3,
                  autoContinueSuggestedActions: true,
                  maxAutoContinueSteps: 1,
                },
                postActionExpectedPhase: 'content-detail',
              },
              {
                id: 'continue-page-reading',
                title: '继续读取当前内容页并决定下一跳',
                rationale: '继续读取正文确认下一步。',
                status: 'pending',
                toolName: 'browser_read_page',
                arguments: {
                  browser: 'chrome',
                  format: 'text',
                },
              },
            ],
            targetPhase: 'content-detail',
          },
          workflowState: {
            taskKey: 'browser::content-detail::content-detail',
            currentPhase: 'content-detail',
            previousPhase: null,
            progressState: 'steady',
            targetPhase: 'content-detail',
            history: [
              {
                observedAt: 1,
                pagePhase: 'content-detail',
                title: 'Alicization 官方文档',
                url: 'https://example.com/doc',
              },
            ],
            lastInspectionAt: 1,
            updatedAt: 1,
            title: 'Alicization 官方文档',
            url: 'https://example.com/doc',
          },
          executionStrategy: {
            mode: 'browser-dom',
            recommendedChannel: 'browser',
            recommendedToolNames: ['browser_scroll', 'browser_read_page', 'browser_click_element', 'browser_wait'],
            confidence: 0.91,
            rationale: '当前处在内容页，先滚动再读取正文最稳。',
          },
          browserPageContext: {
            browser: 'chrome',
            url: 'https://example.com/doc',
            title: 'Alicization 官方文档',
            textExcerpt: '正文还没读完，页面还能继续向下移动。',
            scrollState: {
              offsetY: 420,
              viewportHeight: 900,
              documentHeight: 3600,
              canScrollDown: true,
              canScrollUp: true,
            },
            interactables: [],
          },
          suggestedActions: [
            {
              kind: 'workflow-step:scroll-content-detail',
              title: '先继续向下滚动当前内容页',
              rationale: '页面还能继续向下移动，先滚动去发现新的正文或延续动作。',
              toolName: 'browser_scroll',
              arguments: {
                browser: 'chrome',
                action: 'down',
                amount: 1,
                expectedPhase: 'content-detail',
                reinspectAfterAction: true,
                inspectionQuestion: '帮我继续看这个页面',
                inspectionMaxSuggestedActions: 3,
                autoContinueSuggestedActions: true,
                maxAutoContinueSteps: 1,
              },
            },
            {
              kind: 'workflow-step:continue-page-reading',
              title: '继续读取当前内容页并决定下一跳',
              rationale: '继续读取正文确认下一步。',
              toolName: 'browser_read_page',
              arguments: {
                browser: 'chrome',
                format: 'text',
              },
            },
          ],
          summary: 'Inspected current desktop scene around Google Chrome. Workflow is continuing inside content-detail.',
          output: JSON.stringify({
            pagePhase: 'content-detail',
            nextActionIntent: 'continue-browsing',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'ready-to-act',
          completionSignals: ['content-goal-met'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'content-read-complete-or-next-primary-action-identified',
          failureCondition: 'content-goal-still-unclear-after-reread',
          reentryHint: '继续读取正文和可交互元素，再决定下一步。',
          steps: [],
          targetPhase: 'content-detail',
        },
        workflowState: {
          taskKey: 'browser::content-detail::content-detail',
          currentPhase: 'content-detail',
          previousPhase: 'content-detail',
          progressState: 'advanced',
          targetPhase: 'content-detail',
          history: [
            {
              observedAt: 1,
              pagePhase: 'content-detail',
              title: 'Alicization 官方文档',
              url: 'https://example.com/doc',
            },
            {
              observedAt: 2,
              pagePhase: 'content-detail',
              title: 'Alicization 官方文档',
              url: 'https://example.com/doc#after-scroll',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: 'Alicization 官方文档',
          url: 'https://example.com/doc#after-scroll',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
          recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_wait'],
          confidence: 0.9,
          rationale: '滚动后仍在内容页，继续读取正文最稳。',
        },
        browserPageContext: {
          browser: 'chrome',
          url: 'https://example.com/doc#after-scroll',
          title: 'Alicization 官方文档',
          textExcerpt: '滚动后出现了更多正文内容。',
          scrollState: {
            offsetY: 1320,
            viewportHeight: 900,
            documentHeight: 3600,
            canScrollDown: true,
            canScrollUp: true,
          },
          interactables: [],
        },
        suggestedActions: [
          {
            kind: 'browser-read-text',
            title: '继续读取当前内容页正文',
            rationale: '滚动后已经出现了新的正文，先读取再决定下一步。',
            toolName: 'browser_read_page',
            arguments: {
              browser: 'chrome',
              format: 'text',
            },
          },
        ],
        summary: 'Inspected current desktop scene around Google Chrome. Workflow stayed on content-detail after scrolling.',
        output: JSON.stringify({
          pagePhase: 'content-detail',
          nextActionIntent: 'continue-browsing',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization 官方文档',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-scroll-first-auto-continue',
        decisionTraceId: 'trace-scroll-first-auto-continue',
        sessionId: 'session-scroll-first-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserScroll,
      browserReadPage,
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '帮我继续看这个页面',
      maxSuggestedActions: 3,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(browserScroll).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      action: 'down',
      amount: 1,
    }))
    expect(browserReadPage).toHaveBeenCalledTimes(1)
    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        stoppedReason: 'no-follow-up-action',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_scroll',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_scroll',
              pagePhase: 'content-detail',
              autoContinuation: expect.objectContaining({
                requested: true,
                stoppedReason: 'step-limit-reached',
                executedSteps: expect.arrayContaining([
                  expect.objectContaining({
                    toolName: 'browser_read_page',
                    result: expect.objectContaining({
                      status: 'completed',
                      operation: 'browser_read_page',
                      content: '这里是向下滚动后继续读取到的新正文。',
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with browser_scroll, browser_read_page.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('desktop inspect scene auto continues cross-software app launch workflows locally before listing opened app controls', async () => {
    const desktopOpenApplication = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_open_application',
      channel: 'desktop',
      appName: input.appName ?? '微信',
      summary: `Opened application ${input.appName ?? '微信'}.`,
      output: input.appName ?? '微信',
    }))
    const desktopListInteractables = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      channel: 'desktop',
      maxItems: input.maxItems ?? 12,
      interactables: [
        { ordinal: 1, role: 'input', text: '搜索', enabled: true },
        { ordinal: 2, role: 'list-item', text: 'Alice', enabled: true },
      ],
      summary: 'Listed desktop interactables from 微信.',
      output: '[{"ordinal":1,"role":"input","text":"搜索"},{"ordinal":2,"role":"list-item","text":"Alice"}]',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'open-app',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['target-app-opened', 'follow-up-scene-identified'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'target-app-opened-or-follow-up-scene-identified',
            failureCondition: 'target-app-not-opened-or-follow-up-scene-unclear',
            reentryHint: '如果应用还没打开，先把目标应用带到前台，再根据真实界面继续。',
            steps: [],
            targetPhase: 'unknown',
          },
          workflowState: {
            taskKey: 'desktop::finder::wechat',
            currentPhase: 'unknown',
            previousPhase: null,
            progressState: 'started',
            targetPhase: 'unknown',
            history: [
              {
                observedAt: 1,
                pagePhase: 'unknown',
                title: 'Desktop',
              },
            ],
            lastInspectionAt: 1,
            updatedAt: 1,
            title: 'Desktop',
          },
          executionStrategy: {
            mode: 'desktop-dialog',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_open_application', 'desktop_list_interactables', 'desktop_click_element'],
            confidence: 0.92,
            rationale: '当前还在桌面空闲场景，先打开目标应用再继续最稳。',
          },
          suggestedActions: [
            {
              kind: 'desktop-open-application-entry',
              title: '先打开微信',
              rationale: '先把目标应用带到前台，再根据真实界面继续跨软件操作。',
              toolName: 'desktop_open_application',
              arguments: {
                appName: '微信',
                autoContinueSuggestedActions: true,
                reinspectAfterAction: true,
                inspectionQuestion: '帮我打开微信然后搜索 Alice',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Finder. Workflow starts by opening 微信.',
          output: JSON.stringify({
            pagePhase: 'unknown',
            nextActionIntent: 'open-app',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'unknown',
        nextActionIntent: 'search-contact',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'ready-to-act',
          completionSignals: ['target-control-identified'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'next-desktop-control-identified',
          failureCondition: 'target-control-still-unclear',
          reentryHint: '先列出微信当前控件，再确认要搜索或点击谁。',
          steps: [],
          targetPhase: 'unknown',
        },
        workflowState: {
          taskKey: 'desktop::wechat::search-contact',
          currentPhase: 'unknown',
          previousPhase: 'unknown',
          progressState: 'advanced',
          targetPhase: 'unknown',
          history: [
            {
              observedAt: 1,
              pagePhase: 'unknown',
              title: 'Desktop',
            },
            {
              observedAt: 2,
              pagePhase: 'unknown',
              title: '微信',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: '微信',
        },
        executionStrategy: {
          mode: 'desktop-dialog',
          recommendedChannel: 'desktop',
          recommendedToolNames: ['desktop_list_interactables', 'desktop_click_element', 'desktop_type_text'],
          confidence: 0.9,
          rationale: '微信已经在前台，先列出当前控件再决定下一步最稳。',
        },
        suggestedActions: [
          {
            kind: 'desktop-list-controls-after-launch',
            title: '先列出微信当前控件',
            rationale: '应用已经打开，先读取当前控件再继续。',
            toolName: 'desktop_list_interactables',
            arguments: {
              maxItems: 12,
            },
          },
        ],
        summary: 'Inspected current desktop scene around 微信. Workflow advanced into the opened app.',
        output: JSON.stringify({
          pagePhase: 'unknown',
          nextActionIntent: 'search-contact',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Desktop',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-open-app-auto-continue',
        decisionTraceId: 'trace-open-app-auto-continue',
        sessionId: 'session-open-app-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopOpenApplication,
      desktopListInteractables,
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '帮我打开微信然后搜索 Alice',
      maxSuggestedActions: 3,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(desktopOpenApplication).toHaveBeenCalledWith(expect.objectContaining({
      appName: '微信',
    }))
    expect(desktopListInteractables).toHaveBeenCalledTimes(1)
    expect(desktopListInteractables).toHaveBeenCalledWith(expect.objectContaining({
      maxItems: 12,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        stoppedReason: 'no-follow-up-action',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'desktop_open_application',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'desktop_open_application',
              autoContinuation: expect.objectContaining({
                requested: true,
                stoppedReason: 'step-limit-reached',
                executedSteps: expect.arrayContaining([
                  expect.objectContaining({
                    toolName: 'desktop_list_interactables',
                    result: expect.objectContaining({
                      status: 'completed',
                      operation: 'desktop_list_interactables',
                      interactables: expect.arrayContaining([
                        expect.objectContaining({
                          role: 'input',
                          text: '搜索',
                        }),
                      ]),
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with desktop_open_application, desktop_list_interactables.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('desktop inspect scene auto continues from social feed into compose editor and then stops awaiting host input', async () => {
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      url: 'https://weibo.com/compose',
      title: '发微博',
      matchedText: '发微博',
      summary: 'Clicked browser element 发微博.',
      output: 'https://weibo.com/compose',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://weibo.com/compose',
      title: '发微博',
      summary: 'Waited for browser page readiness.',
      output: 'https://weibo.com/compose',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'social-feed',
          nextActionIntent: 'compose-post',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['compose-entry-opened', 'post-form-visible'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'compose-editor-visible-or-post-form-opened',
            failureCondition: 'social-feed-still-visible-after-compose-attempt',
            reentryHint: '如果还停留在微博信息流首页，继续确认发帖入口。',
            steps: [],
            targetPhase: 'form-entry',
          },
          workflowState: {
            taskKey: 'browser::weibo-home::form-entry',
            currentPhase: 'social-feed',
            previousPhase: null,
            progressState: 'started',
            targetPhase: 'form-entry',
            history: [
              {
                observedAt: 1,
                pagePhase: 'social-feed',
                title: '微博',
                url: 'https://weibo.com',
              },
            ],
            lastInspectionAt: 1,
            updatedAt: 1,
            title: '微博',
            url: 'https://weibo.com',
          },
          executionStrategy: {
            mode: 'browser-dom',
            recommendedChannel: 'browser',
            recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
            confidence: 0.91,
            rationale: '当前处在微博信息流页面，继续用浏览器 DOM 原语推进最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:open-compose-entry',
              title: '点击“发微博”打开发布入口',
              rationale: '先进入微博发布编辑器。',
              toolName: 'browser_click_element',
              arguments: {
                browser: 'chrome',
                text: '发微博',
                targetType: 'button',
                expectedPhase: 'form-entry',
                reinspectAfterAction: true,
                inspectionQuestion: '帮我继续发微博',
                inspectionMaxSuggestedActions: 3,
                autoContinueSuggestedActions: true,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Google Chrome. Workflow started on social-feed aiming for form-entry.',
          output: JSON.stringify({
            pagePhase: 'social-feed',
            nextActionIntent: 'compose-post',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'form-entry',
        nextActionIntent: 'fill-form',
        blockingSignals: ['awaiting-input'],
        workflowPlan: {
          continuationMode: 'await-host-input',
          completionSignals: ['form-step-advanced', 'next-page-visible'],
          blockingReasons: ['awaiting-input'],
          repairActions: [],
          advanceCondition: 'form-submitted-and-next-page-visible',
          failureCondition: 'form-still-awaiting-input-after-submit',
          reentryHint: '先补齐微博内容，再决定是否发布。',
          steps: [
            {
              id: 'fill-current-form',
              title: '完成当前表单输入',
              rationale: '当前微博编辑器还在等输入内容，先填写内容再继续。',
              status: 'blocked',
            },
            {
              id: 'advance-form-flow',
              title: '提交当前表单并观察下一页',
              rationale: '输入完成后，再决定是否提交。',
              status: 'pending',
              toolName: 'browser_click_element',
              arguments: {
                browser: 'chrome',
                text: '发布',
                targetType: 'button',
                expectedPhase: 'content-detail',
                reinspectAfterAction: true,
                inspectionQuestion: '帮我继续发微博',
                inspectionMaxSuggestedActions: 3,
                autoContinueSuggestedActions: true,
                maxAutoContinueSteps: 1,
              },
              postActionExpectedPhase: 'content-detail',
            },
          ],
          targetPhase: 'content-detail',
        },
        workflowState: {
          taskKey: 'browser::weibo-home::form-entry',
          currentPhase: 'form-entry',
          previousPhase: 'social-feed',
          progressState: 'advanced',
          targetPhase: 'content-detail',
          history: [
            {
              observedAt: 1,
              pagePhase: 'social-feed',
              title: '微博',
              url: 'https://weibo.com',
            },
            {
              observedAt: 2,
              pagePhase: 'form-entry',
              title: '发微博',
              url: 'https://weibo.com/compose',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: '发微博',
          url: 'https://weibo.com/compose',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
          recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
          confidence: 0.9,
          rationale: '当前已经进入微博发布编辑器，适合继续用浏览器 DOM 原语推进。',
        },
        suggestedActions: [
          {
            kind: 'workflow-step:fill-current-form',
            title: '完成当前表单输入',
            rationale: '当前微博编辑器还在等输入内容，先填写内容再继续。',
          },
          {
            kind: 'workflow-step:advance-form-flow',
            title: '提交当前表单并观察下一页',
            rationale: '输入完成后，再决定是否提交。',
            toolName: 'browser_click_element',
            arguments: {
              browser: 'chrome',
              text: '发布',
              targetType: 'button',
              expectedPhase: 'content-detail',
              reinspectAfterAction: true,
              inspectionQuestion: '帮我继续发微博',
              inspectionMaxSuggestedActions: 3,
              autoContinueSuggestedActions: true,
              maxAutoContinueSteps: 1,
            },
          },
        ],
        summary: 'Inspected current desktop scene around Google Chrome. Workflow advanced from social-feed to form-entry.',
        output: JSON.stringify({
          pagePhase: 'form-entry',
          nextActionIntent: 'fill-form',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: '微博',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-weibo-inspect-auto-continue',
        decisionTraceId: 'trace-weibo-inspect-auto-continue',
        sessionId: 'session-weibo-inspect-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement,
      browserWait,
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '帮我继续发微博',
      maxSuggestedActions: 3,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(browserClickElement).toHaveBeenCalledTimes(1)
    expect(browserClickElement).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      text: '发微博',
      targetType: 'button',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        stoppedReason: 'await-host-input',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_click_element',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_click_element',
              pagePhase: 'form-entry',
              autoContinuation: expect.objectContaining({
                requested: true,
                stoppedReason: 'await-host-input',
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with browser_click_element.')
  })

  it('desktop inspect scene auto continues from social feed into compose upload handoff and rereads the returned browser flow', async () => {
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      url: input.text === '发微博' ? 'https://weibo.com/compose' : 'https://weibo.com/compose',
      title: input.text === '发微博' ? '发微博' : '发微博',
      matchedText: input.text ?? null,
      summary: `Clicked browser element ${input.text ?? ''}.`,
      output: input.text === '发微博' ? 'opened compose' : 'opening file chooser',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://weibo.com/compose',
      title: '发微博',
      summary: 'Waited for browser page readiness.',
      output: 'https://weibo.com/compose',
    }))
    const desktopWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_wait',
      titleIncludes: input.titleIncludes ?? null,
      summary: 'Waited for the native dialog to stabilize.',
      output: input.titleIncludes ?? 'Choose File',
    }))
    const desktopClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
      text: input.text ?? null,
      role: input.role ?? null,
      summary: 'Clicked desktop element 打开.',
      output: 'clicked open',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://weibo.com/compose',
      title: '发微博',
      content: '已选择 1 张图片，继续补充微博内容或发布。',
      output: '已选择 1 张图片，继续补充微博内容或发布。',
      summary: 'Read upload flow page content.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'social-feed',
          nextActionIntent: 'compose-post',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['compose-entry-opened', 'post-form-visible'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'compose-editor-visible-or-post-form-opened',
            failureCondition: 'social-feed-still-visible-after-compose-attempt',
            reentryHint: '如果还停留在微博信息流首页，继续确认发帖入口。',
            steps: [],
            targetPhase: 'form-entry',
          },
          workflowState: {
            taskKey: 'browser::weibo-home::upload-flow',
            currentPhase: 'social-feed',
            previousPhase: null,
            progressState: 'started',
            targetPhase: 'upload-flow',
            history: [
              {
                observedAt: 1,
                pagePhase: 'social-feed',
                title: '微博',
                url: 'https://weibo.com',
              },
            ],
            lastInspectionAt: 1,
            updatedAt: 1,
            title: '微博',
            url: 'https://weibo.com',
          },
          executionStrategy: {
            mode: 'browser-dom',
            recommendedChannel: 'browser',
            recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
            confidence: 0.91,
            rationale: '当前处在微博信息流页面，继续用浏览器 DOM 原语推进最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:open-compose-entry',
              title: '点击“发微博”打开发布入口',
              rationale: '先进入微博发布编辑器。',
              toolName: 'browser_click_element',
              arguments: {
                browser: 'chrome',
                text: '发微博',
                targetType: 'button',
                expectedPhase: 'form-entry',
                reinspectAfterAction: true,
                inspectionQuestion: '帮我继续发微博并上传图片',
                inspectionMaxSuggestedActions: 3,
                autoContinueSuggestedActions: true,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Google Chrome. Workflow started on social-feed aiming for form-entry.',
          output: JSON.stringify({
            pagePhase: 'social-feed',
            nextActionIntent: 'compose-post',
          }),
        }
      }

      if (inspectionCount === 2) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'form-entry',
          nextActionIntent: 'upload-media',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['native-dialog-opened', 'upload-entry-opened'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'upload-entry-clicked-and-dialog-visible',
            failureCondition: 'upload-entry-missing-or-dialog-not-opened',
            reentryHint: '如果上传入口已经打开原生文件框，就继续桌面桥接。',
            steps: [],
            targetPhase: 'browser-desktop-handoff',
          },
          workflowState: {
            taskKey: 'browser::weibo-home::upload-flow',
            currentPhase: 'form-entry',
            previousPhase: 'social-feed',
            progressState: 'advanced',
            targetPhase: 'upload-flow',
            history: [
              {
                observedAt: 1,
                pagePhase: 'social-feed',
                title: '微博',
                url: 'https://weibo.com',
              },
              {
                observedAt: 2,
                pagePhase: 'form-entry',
                title: '发微博',
                url: 'https://weibo.com/compose',
              },
            ],
            lastInspectionAt: 2,
            updatedAt: 2,
            title: '发微博',
            url: 'https://weibo.com/compose',
          },
          executionStrategy: {
            mode: 'browser-dom',
            recommendedChannel: 'browser',
            recommendedToolNames: ['browser_click_element', 'browser_type_text', 'browser_read_page', 'browser_wait'],
            confidence: 0.93,
            rationale: '当前已经进入微博发布编辑器，先点上传图片把流程桥接到原生文件框。',
          },
          suggestedActions: [
            {
              kind: 'open-upload-entry',
              title: '点击“上传图片”继续当前发布流',
              rationale: '先打开原生文件选择对话框，把当前发帖流桥接到桌面文件框。',
              toolName: 'browser_click_element',
              arguments: {
                browser: 'chrome',
                text: '上传图片',
                targetType: 'button',
                expectedPhase: 'browser-desktop-handoff',
                reinspectAfterAction: true,
                inspectionQuestion: '帮我完成文件上传',
                inspectionMaxSuggestedActions: 3,
                autoContinueSuggestedActions: true,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Google Chrome. Workflow advanced from social-feed to form-entry.',
          output: JSON.stringify({
            pagePhase: 'form-entry',
            nextActionIntent: 'upload-media',
          }),
        }
      }

      if (inspectionCount === 3) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'browser-desktop-handoff',
          nextActionIntent: 'confirm-dialog',
          blockingSignals: ['desktop-dialog-visible'],
          workflowPlan: {
            continuationMode: 'handoff-to-desktop',
            completionSignals: ['dialog-dismissed', 'upload-flow-returned-to-browser'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
            failureCondition: 'native-dialog-still-blocking-browser-flow',
            reentryHint: '如果还停在原生对话框，继续完成确认动作。',
            steps: [],
            targetPhase: 'upload-flow',
          },
          workflowState: {
            taskKey: 'browser::weibo-home::upload-flow',
            currentPhase: 'browser-desktop-handoff',
            previousPhase: 'form-entry',
            progressState: 'advanced',
            targetPhase: 'upload-flow',
            history: [
              {
                observedAt: 1,
                pagePhase: 'social-feed',
                title: '微博',
                url: 'https://weibo.com',
              },
              {
                observedAt: 2,
                pagePhase: 'form-entry',
                title: '发微博',
                url: 'https://weibo.com/compose',
              },
              {
                observedAt: 3,
                pagePhase: 'browser-desktop-handoff',
                title: 'Choose File',
              },
            ],
            lastInspectionAt: 3,
            updatedAt: 3,
            title: 'Choose File',
          },
          executionStrategy: {
            mode: 'browser-desktop-handoff',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_wait', 'desktop_click_element', 'desktop_type_text', 'desktop_list_interactables'],
            confidence: 0.94,
            rationale: '当前浏览器流程已经切到原生文件选择对话框，先走桌面原语完成桥接。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:stabilize-native-dialog',
              title: '等待原生对话框稳定',
              rationale: '先确认原生窗口稳定，再点击主动作更稳。',
              toolName: 'desktop_wait',
              arguments: {
                titleIncludes: 'Choose File',
              },
            },
            {
              kind: 'workflow-step:confirm-dialog-primary-action',
              title: '点击“打开”完成当前对话框动作',
              rationale: '原生对话框已经稳定，继续点击主动作把流程带回浏览器。',
              toolName: 'desktop_click_element',
              arguments: {
                text: '打开',
                role: 'button',
                expectedPhase: 'upload-flow',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                inspectionQuestion: '帮我完成文件上传',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Chrome. Workflow is holding on browser-desktop-handoff.',
          output: JSON.stringify({
            pagePhase: 'browser-desktop-handoff',
            nextActionIntent: 'confirm-dialog',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'upload-flow',
        nextActionIntent: 'fill-form',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'ready-to-act',
          completionSignals: ['form-step-advanced', 'next-page-visible'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'upload-selection-committed-and-next-browser-step-visible',
          failureCondition: 'upload-flow-still-awaiting-selection-after-submit',
          reentryHint: '继续确认上传流是否已经推进。',
          steps: [],
          targetPhase: 'content-detail',
        },
        workflowState: {
          taskKey: 'browser::weibo-home::upload-flow',
          currentPhase: 'upload-flow',
          previousPhase: 'browser-desktop-handoff',
          progressState: 'advanced',
          targetPhase: 'content-detail',
          history: [
            {
              observedAt: 1,
              pagePhase: 'social-feed',
              title: '微博',
              url: 'https://weibo.com',
            },
            {
              observedAt: 2,
              pagePhase: 'form-entry',
              title: '发微博',
              url: 'https://weibo.com/compose',
            },
            {
              observedAt: 3,
              pagePhase: 'browser-desktop-handoff',
              title: 'Choose File',
            },
            {
              observedAt: 4,
              pagePhase: 'upload-flow',
              title: '发微博',
              url: 'https://weibo.com/compose',
            },
          ],
          lastInspectionAt: 4,
          updatedAt: 4,
          title: '发微博',
          url: 'https://weibo.com/compose',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
          recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
          confidence: 0.89,
          rationale: '当前已经回到浏览器上传流，继续走浏览器 DOM 原语最稳。',
        },
        suggestedActions: [
          {
            kind: 'workflow-step:continue-page-reading',
            title: '读取当前上传页正文',
            rationale: '已经回到浏览器上传流，先低风险读取正文确认文件选择和表单状态。',
            toolName: 'browser_read_page',
            arguments: {
              format: 'text',
              browser: 'chrome',
            },
          },
        ],
        summary: 'Inspected current desktop scene around Chrome. Workflow advanced from browser-desktop-handoff to upload-flow.',
        output: JSON.stringify({
          pagePhase: 'upload-flow',
          nextActionIntent: 'fill-form',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: '微博',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-weibo-upload-long-chain',
        decisionTraceId: 'trace-weibo-upload-long-chain',
        sessionId: 'session-weibo-upload-long-chain',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement,
      browserWait,
      browserReadPage,
      desktopWait,
      desktopClickElement,
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '帮我继续发微博并上传图片',
      maxSuggestedActions: 3,
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(browserClickElement).toHaveBeenCalledTimes(2)
    expect(browserClickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      browser: 'chrome',
      text: '发微博',
      targetType: 'button',
    }))
    expect(browserClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      browser: 'chrome',
      text: '上传图片',
      targetType: 'button',
      expectedPhase: 'browser-desktop-handoff',
    }))
    expect(browserWait).toHaveBeenCalledTimes(2)
    expect(desktopWait).toHaveBeenCalledWith(expect.objectContaining({
      titleIncludes: 'Choose File',
    }))
    expect(desktopClickElement).toHaveBeenCalledWith(expect.objectContaining({
      text: '打开',
      role: 'button',
    }))
    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_click_element',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_click_element',
              pagePhase: 'form-entry',
              autoContinuation: expect.objectContaining({
                requested: true,
                executedSteps: expect.arrayContaining([
                  expect.objectContaining({
                    toolName: 'browser_click_element',
                    result: expect.objectContaining({
                      status: 'completed',
                      operation: 'browser_click_element',
                      pagePhase: 'browser-desktop-handoff',
                      autoContinuation: expect.objectContaining({
                        requested: true,
                        executedSteps: expect.arrayContaining([
                          expect.objectContaining({
                            toolName: 'desktop_wait',
                          }),
                          expect.objectContaining({
                            toolName: 'desktop_click_element',
                            result: expect.objectContaining({
                              status: 'completed',
                              operation: 'desktop_click_element',
                              pagePhase: 'upload-flow',
                              autoContinuation: expect.objectContaining({
                                requested: true,
                                executedSteps: expect.arrayContaining([
                                  expect.objectContaining({
                                    toolName: 'browser_read_page',
                                    result: expect.objectContaining({
                                      status: 'completed',
                                      operation: 'browser_read_page',
                                      content: '已选择 1 张图片，继续补充微博内容或发布。',
                                    }),
                                  }),
                                ]),
                              }),
                            }),
                          }),
                        ]),
                      }),
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with browser_click_element.')
  })

  it('desktop inspect scene auto continues into codex investigation when enabled', async () => {
    const executeTaskThread = vi.fn(async (input: any) => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-codex-investigation-1',
        selectedChannel: 'codex',
      },
      plan: {
        state: 'routed',
        proposedChannel: 'codex',
        reasonTags: ['visual-investigation', 'codex'],
        narrative: ['Delegated the visible coding investigation to Codex.'],
        affirmationReasonCodes: [],
        blockedReasonCodes: [],
      },
      summary: 'delegated coding investigation',
      output: {
        prompt: input.dispatch?.codex?.prompt ?? null,
      },
    } satisfies MainGatewayExecutionTaskThreadResult))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'unknown',
      nextActionIntent: 'unknown',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['investigation-dispatched'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'codex-investigation-dispatched',
        failureCondition: 'delegation-not-started',
        reentryHint: '如果还没开始调查，重新委托 Codex 读取当前编码上下文。',
        steps: [],
        targetPhase: 'unknown',
      },
      workflowState: null,
      executionStrategy: {
        mode: 'coding-investigation',
        recommendedChannel: 'codex',
        recommendedToolNames: ['executor_run_codex', 'executor_run_cli'],
        confidence: 0.96,
        rationale: '当前屏幕明显是编码报错调查场景，直接转给 Codex 更稳。',
      },
      suggestedActions: [
        {
          kind: 'delegate-coding-investigation',
          title: '转给 Codex 调查当前代码/报错',
          rationale: '直接读取当前编码上下文并规划修复。',
          toolName: 'executor_run_codex',
          arguments: {
            prompt: 'Investigate visible coding/error scene around Cursor runtime.ts. Visible summary: TypeScript error in runtime.ts.',
            kind: 'codebase-investigation',
            goal: 'Investigate visible coding scene',
            effect: 'observe',
            permissionMode: 'implicit',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Cursor. Suggested delegating the visible coding investigation to Codex.',
      output: JSON.stringify({
        executionStrategy: {
          mode: 'coding-investigation',
          recommendedChannel: 'codex',
        },
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-inspect-codex-auto-continue',
        decisionTraceId: 'trace-inspect-codex-auto-continue',
        sessionId: 'session-inspect-codex-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '看看这个 runtime.ts 报错该怎么修',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        cardId: 'default',
        turnId: 'turn-inspect-codex-auto-continue',
      }),
      task: expect.objectContaining({
        kind: 'codebase-investigation',
        requestedChannel: 'codex',
        effect: 'observe',
      }),
      dispatch: expect.objectContaining({
        codex: expect.objectContaining({
          prompt: expect.stringContaining('TypeScript error in runtime.ts'),
        }),
      }),
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 1,
        stoppedReason: 'step-limit-reached',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'executor_run_codex',
            result: expect.objectContaining({
              status: 'completed',
              selectedChannel: 'codex',
              planState: 'routed',
              summary: 'delegated coding investigation',
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with executor_run_codex.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('desktop inspect scene keeps queued desktop handoff actions after desktop_wait and returns to browser upload flow', async () => {
    const desktopWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_wait',
      titleIncludes: input.titleIncludes ?? null,
      summary: 'Waited for the native dialog to stabilize.',
      output: input.titleIncludes ?? 'Choose File',
    }))
    const desktopClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_click_element',
      channel: 'desktop',
      text: input.text ?? null,
      role: input.role ?? null,
      summary: 'Clicked desktop element 打开.',
      output: 'clicked open',
    }))
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      url: 'https://example.com/upload/result',
      title: 'Uploaded content',
      summary: 'Clicked browser element 上传.',
      output: 'submitted upload',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      url: 'https://example.com/upload',
      title: 'Upload asset',
      content: 'Upload asset and finish the form.',
      output: 'Upload asset and finish the form.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'browser-desktop-handoff',
          nextActionIntent: 'confirm-dialog',
          blockingSignals: ['desktop-dialog-visible'],
          workflowPlan: {
            continuationMode: 'handoff-to-desktop',
            completionSignals: ['dialog-dismissed', 'upload-flow-returned-to-browser'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
            failureCondition: 'native-dialog-still-blocking-browser-flow',
            reentryHint: '如果还停在原生对话框，继续完成确认动作。',
            steps: [],
            targetPhase: 'upload-flow',
          },
          workflowState: {
            taskKey: 'browser::upload-handoff::content-detail',
            currentPhase: 'browser-desktop-handoff',
            previousPhase: null,
            progressState: 'started',
            targetPhase: 'upload-flow',
            history: [
              {
                observedAt: 1,
                pagePhase: 'browser-desktop-handoff',
                title: 'Choose File',
              },
            ],
            lastInspectionAt: 1,
            updatedAt: 1,
            title: 'Choose File',
          },
          executionStrategy: {
            mode: 'browser-desktop-handoff',
            recommendedChannel: 'desktop',
            recommendedToolNames: ['desktop_wait', 'desktop_click_element', 'desktop_type_text', 'desktop_list_interactables'],
            confidence: 0.94,
            rationale: '当前浏览器流程已经切到原生文件选择对话框，先走桌面原语完成桥接。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:stabilize-native-dialog',
              title: '等待原生对话框稳定',
              rationale: '先确认原生窗口稳定，再点击主动作更稳。',
              toolName: 'desktop_wait',
              arguments: {
                titleIncludes: 'Choose File',
              },
            },
            {
              kind: 'workflow-step:confirm-dialog-primary-action',
              title: '点击“打开”完成当前对话框动作',
              rationale: '原生对话框已经稳定，继续点击主动作把流程带回浏览器。',
              toolName: 'desktop_click_element',
              arguments: {
                text: '打开',
                role: 'button',
                expectedPhase: 'upload-flow',
                reinspectAfterAction: true,
                autoContinueSuggestedActions: true,
                inspectionQuestion: '帮我完成文件上传',
                inspectionMaxSuggestedActions: 3,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Chrome. Workflow is holding on browser-desktop-handoff.',
          output: JSON.stringify({
            pagePhase: 'browser-desktop-handoff',
            nextActionIntent: 'confirm-dialog',
          }),
        }
      }

      if (inspectionCount === 2) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'upload-flow',
          nextActionIntent: 'fill-form',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['form-step-advanced', 'next-page-visible'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'upload-selection-committed-and-next-browser-step-visible',
            failureCondition: 'upload-flow-still-awaiting-selection-after-submit',
            reentryHint: '继续确认上传流是否已经推进。',
            steps: [],
            targetPhase: 'content-detail',
          },
          workflowState: {
            taskKey: 'browser::upload-handoff::content-detail',
            currentPhase: 'upload-flow',
            previousPhase: 'browser-desktop-handoff',
            progressState: 'advanced',
            targetPhase: 'content-detail',
            history: [
              {
                observedAt: 1,
                pagePhase: 'browser-desktop-handoff',
                title: 'Choose File',
              },
              {
                observedAt: 2,
                pagePhase: 'upload-flow',
                title: 'Upload asset',
                url: 'https://example.com/upload',
              },
            ],
            lastInspectionAt: 2,
            updatedAt: 2,
            title: 'Upload asset',
            url: 'https://example.com/upload',
          },
          executionStrategy: {
            mode: 'browser-dom',
            recommendedChannel: 'browser',
            recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
            confidence: 0.89,
            rationale: '当前已经回到浏览器上传流，继续走浏览器 DOM 原语最稳。',
          },
          suggestedActions: [
            {
              kind: 'workflow-step:continue-page-reading',
              title: '读取当前上传页正文',
              rationale: '已经回到浏览器上传流，先低风险读取正文确认文件选择和表单状态。',
              toolName: 'browser_read_page',
              arguments: {
                format: 'text',
                browser: 'chrome',
              },
            },
          ],
          summary: 'Inspected current desktop scene around Chrome. Workflow advanced from browser-desktop-handoff to upload-flow.',
          output: JSON.stringify({
            pagePhase: 'upload-flow',
            nextActionIntent: 'fill-form',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'upload-flow',
        nextActionIntent: 'fill-form',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'ready-to-act',
          completionSignals: ['form-step-advanced', 'next-page-visible'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'upload-selection-committed-and-next-browser-step-visible',
          failureCondition: 'upload-flow-still-awaiting-selection-after-submit',
          reentryHint: '继续确认上传流是否已经推进。',
          steps: [],
          targetPhase: 'content-detail',
        },
        workflowState: {
          taskKey: 'browser::upload-handoff::content-detail',
          currentPhase: 'upload-flow',
          previousPhase: 'browser-desktop-handoff',
          progressState: 'advanced',
          targetPhase: 'content-detail',
          history: [
            {
              observedAt: 1,
              pagePhase: 'browser-desktop-handoff',
              title: 'Choose File',
            },
            {
              observedAt: 2,
              pagePhase: 'upload-flow',
              title: 'Upload asset',
              url: 'https://example.com/upload',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: 'Upload asset',
          url: 'https://example.com/upload',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
          recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
          confidence: 0.89,
          rationale: '当前已经回到浏览器上传流，继续走浏览器 DOM 原语最稳。',
        },
        suggestedActions: [],
        summary: 'Inspected current desktop scene around Chrome. Workflow advanced from browser-desktop-handoff to upload-flow.',
        output: JSON.stringify({
          pagePhase: 'upload-flow',
          nextActionIntent: 'fill-form',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Choose File',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-desktop-handoff-chain',
        decisionTraceId: 'trace-desktop-handoff-chain',
        sessionId: 'session-desktop-handoff-chain',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserClickElement: vi.fn(),
      browserReadPage,
      desktopInspectScene,
      desktopClickElement,
      desktopWait,
    } as any)

    const inspectTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectTool).toBeDefined()
    if (!inspectTool)
      return

    const result = await inspectTool.execute({
      question: '帮我完成文件上传',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
      maxSuggestedActions: 3,
    })

    expect(desktopWait).toHaveBeenCalledTimes(1)
    expect(desktopClickElement).toHaveBeenCalledTimes(1)
    expect(desktopClickElement).toHaveBeenCalledWith(expect.objectContaining({
      text: '打开',
      role: 'button',
    }))
    expect(browserClickElement).not.toHaveBeenCalled()
    expect(browserReadPage).toHaveBeenCalledTimes(1)
    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      format: 'text',
      browser: 'chrome',
    }))
    expect(result).toEqual(expect.objectContaining({
      pagePhase: 'browser-desktop-handoff',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        stoppedReason: 'no-follow-up-action',
        executedSteps: [
          expect.objectContaining({
            toolName: 'desktop_wait',
          }),
          expect.objectContaining({
            toolName: 'desktop_click_element',
            result: expect.objectContaining({
              pagePhase: 'upload-flow',
              autoContinuation: expect.objectContaining({
                requested: true,
                maxSteps: 1,
                stoppedReason: 'step-limit-reached',
                executedSteps: [
                  expect.objectContaining({
                    toolName: 'browser_read_page',
                  }),
                ],
              }),
            }),
          }),
        ],
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with desktop_wait, desktop_click_element.')
  })

  it('desktop inspect scene auto continues into claude code investigation when enabled', async () => {
    const executeTaskThread = vi.fn(async (input: any) => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-claude-investigation-1',
        selectedChannel: 'claude-code',
      },
      plan: {
        state: 'routed',
        proposedChannel: 'claude-code',
        reasonTags: ['visual-investigation', 'claude-code'],
        narrative: ['Delegated the visible coding investigation to Claude Code.'],
        affirmationReasonCodes: [],
        blockedReasonCodes: [],
      },
      summary: 'delegated claude code investigation',
      output: {
        prompt: input.dispatch?.claudeCode?.prompt ?? null,
      },
    } satisfies MainGatewayExecutionTaskThreadResult))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'unknown',
      nextActionIntent: 'unknown',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['investigation-dispatched'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'claude-code-investigation-dispatched',
        failureCondition: 'delegation-not-started',
        reentryHint: '如果还没开始调查，重新委托 Claude Code 读取当前编码上下文。',
        steps: [],
        targetPhase: 'unknown',
      },
      workflowState: null,
      executionStrategy: {
        mode: 'coding-investigation',
        recommendedChannel: 'codex',
        recommendedToolNames: ['executor_run_codex', 'executor_run_claude_code', 'executor_run_cli'],
        confidence: 0.96,
        rationale: '当前屏幕明显是编码报错调查场景，直接转给代码代理更稳。',
      },
      suggestedActions: [
        {
          kind: 'delegate-coding-investigation-claude-code',
          title: '转给 Claude Code 调查当前代码/报错',
          rationale: '直接读取当前编码上下文并规划修复。',
          toolName: 'executor_run_claude_code',
          arguments: {
            prompt: 'Investigate visible coding/error scene around Cursor runtime.ts. Visible summary: TypeScript error in runtime.ts.',
            kind: 'codebase-investigation',
            goal: 'Investigate visible coding scene',
            effect: 'observe',
            permissionMode: 'implicit',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Cursor. Suggested delegating the visible coding investigation to Claude Code.',
      output: JSON.stringify({
        executionStrategy: {
          mode: 'coding-investigation',
          recommendedChannel: 'codex',
        },
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-inspect-claude-auto-continue',
        decisionTraceId: 'trace-inspect-claude-auto-continue',
        sessionId: 'session-inspect-claude-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '看看这个 runtime.ts 报错该怎么修',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'codebase-investigation',
        requestedChannel: 'claude-code',
        effect: 'observe',
      }),
      dispatch: expect.objectContaining({
        claudeCode: expect.objectContaining({
          prompt: expect.stringContaining('TypeScript error in runtime.ts'),
          allowTools: false,
        }),
      }),
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 1,
        stoppedReason: 'step-limit-reached',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'executor_run_claude_code',
            result: expect.objectContaining({
              status: 'completed',
              selectedChannel: 'claude-code',
              planState: 'routed',
              summary: 'delegated claude code investigation',
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with executor_run_claude_code.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('desktop inspect scene auto continues through codex investigation back into visual workflow when enabled', async () => {
    const executeTaskThread = vi.fn(async (input: any) => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-codex-investigation-visual-return-1',
        selectedChannel: 'codex',
      },
      plan: {
        state: 'routed',
        proposedChannel: 'codex',
        reasonTags: ['visual-investigation', 'codex'],
        narrative: ['Delegated the visible coding investigation to Codex.'],
        affirmationReasonCodes: [],
        blockedReasonCodes: [],
      },
      summary: 'delegated coding investigation',
      output: {
        prompt: input.dispatch?.codex?.prompt ?? null,
      },
    } satisfies MainGatewayExecutionTaskThreadResult))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/runtime-fix-plan',
      title: 'Runtime Fix Plan',
      content: '这里是 Codex 调查后打开的修复说明页面。',
      output: '这里是 Codex 调查后打开的修复说明页面。',
      summary: 'Read browser page content.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['investigation-dispatched'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'codex-investigation-dispatched',
            failureCondition: 'delegation-not-started',
            reentryHint: '如果还没开始调查，重新委托 Codex 读取当前编码上下文。',
            steps: [],
            targetPhase: 'content-detail',
          },
          workflowState: null,
          executionStrategy: {
            mode: 'coding-investigation',
            recommendedChannel: 'codex',
            recommendedToolNames: ['executor_run_codex', 'executor_run_cli'],
            confidence: 0.96,
            rationale: '当前屏幕明显是编码报错调查场景，直接转给 Codex 更稳。',
          },
          suggestedActions: [
            {
              kind: 'delegate-coding-investigation',
              title: '转给 Codex 调查当前代码/报错',
              rationale: '直接读取当前编码上下文并规划修复。',
              toolName: 'executor_run_codex',
              arguments: {
                prompt: 'Investigate visible coding/error scene around Cursor runtime.ts. Visible summary: TypeScript error in runtime.ts.',
                kind: 'codebase-investigation',
                goal: 'Investigate visible coding scene',
                effect: 'observe',
                permissionMode: 'implicit',
                inspectionQuestion: 'Codex 调查之后现在界面到了哪一步',
                inspectionMaxSuggestedActions: 3,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Cursor. Suggested delegating the visible coding investigation to Codex.',
          output: JSON.stringify({
            executionStrategy: {
              mode: 'coding-investigation',
              recommendedChannel: 'codex',
            },
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        browserPageContext: {
          browser: 'chrome',
          url: 'https://example.com/runtime-fix-plan',
          title: 'Runtime Fix Plan',
          textExcerpt: 'Codex 已经产出修复说明页面',
          interactables: [
            {
              tag: 'a',
              role: 'link',
              type: null,
              text: '修复说明',
              ariaLabel: null,
              title: null,
              href: 'https://example.com/runtime-fix-plan',
              disabled: false,
            },
          ],
        },
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'ready-to-act',
          completionSignals: ['content-goal-met'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'post-investigation-content-visible',
          failureCondition: 'no-post-investigation-context-visible',
          reentryHint: '继续读取修复说明，确认下一步代码动作。',
          steps: [],
          targetPhase: 'content-detail',
        },
        workflowState: {
          taskKey: 'executor::codex::visual-return',
          currentPhase: 'content-detail',
          previousPhase: 'unknown',
          progressState: 'advanced',
          targetPhase: 'content-detail',
          history: [
            {
              observedAt: 1,
              pagePhase: 'unknown',
              title: 'runtime.ts',
            },
            {
              observedAt: 2,
              pagePhase: 'content-detail',
              title: 'Runtime Fix Plan',
              url: 'https://example.com/runtime-fix-plan',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: 'Runtime Fix Plan',
          url: 'https://example.com/runtime-fix-plan',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
          recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
          confidence: 0.9,
          rationale: 'Codex 调查后界面已经切到修复说明内容页，继续读取正文最稳。',
        },
        suggestedActions: [
          {
            kind: 'browser-read-text',
            title: '读取修复说明页面正文',
            rationale: '先读取 Codex 调查后的说明内容，再决定下一步代码动作。',
            toolName: 'browser_read_page',
            arguments: {
              format: 'text',
              browser: 'chrome',
            },
          },
        ],
        summary: 'Inspected current desktop scene around Chrome. Workflow advanced into post-investigation content-detail.',
        output: JSON.stringify({
          pagePhase: 'content-detail',
          nextActionIntent: 'continue-browsing',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-inspect-codex-visual-return-auto-continue',
        decisionTraceId: 'trace-inspect-codex-visual-return-auto-continue',
        sessionId: 'session-inspect-codex-visual-return-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserReadPage,
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '看看这个 runtime.ts 报错该怎么修',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        cardId: 'default',
        turnId: 'turn-inspect-codex-visual-return-auto-continue',
      }),
      task: expect.objectContaining({
        kind: 'codebase-investigation',
        requestedChannel: 'codex',
        effect: 'observe',
      }),
      dispatch: expect.objectContaining({
        codex: expect.objectContaining({
          prompt: expect.stringContaining('TypeScript error in runtime.ts'),
        }),
      }),
    }))
    expect(desktopInspectScene).toHaveBeenNthCalledWith(2, expect.objectContaining({
      question: 'Codex 调查之后现在界面到了哪一步',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'executor_run_codex',
            result: expect.objectContaining({
              status: 'completed',
              selectedChannel: 'codex',
              pagePhase: 'content-detail',
              nextActionIntent: 'continue-browsing',
              autoContinuation: expect.objectContaining({
                requested: true,
                executedSteps: expect.arrayContaining([
                  expect.objectContaining({
                    toolName: 'browser_read_page',
                    result: expect.objectContaining({
                      status: 'completed',
                      operation: 'browser_read_page',
                      content: '这里是 Codex 调查后打开的修复说明页面。',
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with executor_run_codex, browser_read_page.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('desktop inspect scene auto continues through claude code investigation back into visual workflow when enabled', async () => {
    const executeTaskThread = vi.fn(async (input: any) => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-claude-investigation-visual-return-1',
        selectedChannel: 'claude-code',
      },
      plan: {
        state: 'routed',
        proposedChannel: 'claude-code',
        reasonTags: ['visual-investigation', 'claude-code'],
        narrative: ['Delegated the visible coding investigation to Claude Code.'],
        affirmationReasonCodes: [],
        blockedReasonCodes: [],
      },
      summary: 'delegated claude code investigation',
      output: {
        prompt: input.dispatch?.claudeCode?.prompt ?? null,
      },
    } satisfies MainGatewayExecutionTaskThreadResult))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/runtime-fix-plan',
      title: 'Runtime Fix Plan',
      content: '这里是 Claude Code 调查后打开的修复说明页面。',
      output: '这里是 Claude Code 调查后打开的修复说明页面。',
      summary: 'Read browser page content.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'unknown',
          nextActionIntent: 'unknown',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['investigation-dispatched'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'claude-code-investigation-dispatched',
            failureCondition: 'delegation-not-started',
            reentryHint: '如果还没开始调查，重新委托 Claude Code 读取当前编码上下文。',
            steps: [],
            targetPhase: 'content-detail',
          },
          workflowState: null,
          executionStrategy: {
            mode: 'coding-investigation',
            recommendedChannel: 'codex',
            recommendedToolNames: ['executor_run_codex', 'executor_run_claude_code', 'executor_run_cli'],
            confidence: 0.96,
            rationale: '当前屏幕明显是编码报错调查场景，直接转给代码代理更稳。',
          },
          suggestedActions: [
            {
              kind: 'delegate-coding-investigation-claude-code',
              title: '转给 Claude Code 调查当前代码/报错',
              rationale: '直接读取当前编码上下文并规划修复。',
              toolName: 'executor_run_claude_code',
              arguments: {
                prompt: 'Investigate visible coding/error scene around Cursor runtime.ts. Visible summary: TypeScript error in runtime.ts.',
                kind: 'codebase-investigation',
                goal: 'Investigate visible coding scene',
                effect: 'observe',
                permissionMode: 'implicit',
                inspectionQuestion: 'Claude Code 调查之后现在界面到了哪一步',
                inspectionMaxSuggestedActions: 3,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Cursor. Suggested delegating the visible coding investigation to Claude Code.',
          output: JSON.stringify({
            executionStrategy: {
              mode: 'coding-investigation',
              recommendedChannel: 'codex',
            },
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        browserPageContext: {
          browser: 'chrome',
          url: 'https://example.com/runtime-fix-plan',
          title: 'Runtime Fix Plan',
          textExcerpt: 'Claude Code 已经产出修复说明页面',
          interactables: [
            {
              tag: 'a',
              role: 'link',
              type: null,
              text: '修复说明',
              ariaLabel: null,
              title: null,
              href: 'https://example.com/runtime-fix-plan',
              disabled: false,
            },
          ],
        },
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'ready-to-act',
          completionSignals: ['content-goal-met'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'post-investigation-content-visible',
          failureCondition: 'no-post-investigation-context-visible',
          reentryHint: '继续读取修复说明，确认下一步代码动作。',
          steps: [],
          targetPhase: 'content-detail',
        },
        workflowState: {
          taskKey: 'executor::claude-code::visual-return',
          currentPhase: 'content-detail',
          previousPhase: 'unknown',
          progressState: 'advanced',
          targetPhase: 'content-detail',
          history: [
            {
              observedAt: 1,
              pagePhase: 'unknown',
              title: 'runtime.ts',
            },
            {
              observedAt: 2,
              pagePhase: 'content-detail',
              title: 'Runtime Fix Plan',
              url: 'https://example.com/runtime-fix-plan',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: 'Runtime Fix Plan',
          url: 'https://example.com/runtime-fix-plan',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
          recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
          confidence: 0.9,
          rationale: 'Claude Code 调查后界面已经切到修复说明内容页，继续读取正文最稳。',
        },
        suggestedActions: [
          {
            kind: 'browser-read-text',
            title: '读取修复说明页面正文',
            rationale: '先读取 Claude Code 调查后的说明内容，再决定下一步代码动作。',
            toolName: 'browser_read_page',
            arguments: {
              format: 'text',
              browser: 'chrome',
            },
          },
        ],
        summary: 'Inspected current desktop scene around Chrome. Workflow advanced into post-investigation content-detail.',
        output: JSON.stringify({
          pagePhase: 'content-detail',
          nextActionIntent: 'continue-browsing',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-inspect-claude-visual-return-auto-continue',
        decisionTraceId: 'trace-inspect-claude-visual-return-auto-continue',
        sessionId: 'session-inspect-claude-visual-return-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserReadPage,
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '看看这个 runtime.ts 报错该怎么修',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      task: expect.objectContaining({
        kind: 'codebase-investigation',
        requestedChannel: 'claude-code',
        effect: 'observe',
      }),
      dispatch: expect.objectContaining({
        claudeCode: expect.objectContaining({
          prompt: expect.stringContaining('TypeScript error in runtime.ts'),
          allowTools: false,
        }),
      }),
    }))
    expect(desktopInspectScene).toHaveBeenNthCalledWith(2, expect.objectContaining({
      question: 'Claude Code 调查之后现在界面到了哪一步',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'executor_run_claude_code',
            result: expect.objectContaining({
              status: 'completed',
              selectedChannel: 'claude-code',
              pagePhase: 'content-detail',
              nextActionIntent: 'continue-browsing',
              autoContinuation: expect.objectContaining({
                requested: true,
                executedSteps: expect.arrayContaining([
                  expect.objectContaining({
                    toolName: 'browser_read_page',
                    result: expect.objectContaining({
                      status: 'completed',
                      operation: 'browser_read_page',
                      content: '这里是 Claude Code 调查后打开的修复说明页面。',
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with executor_run_claude_code, browser_read_page.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('auto falls back to the next executor suggestion when the first investigation agent is not routed', async () => {
    const executeTaskThread = vi.fn(async (input: any) => {
      if (input.task?.requestedChannel === 'codex') {
        return {
          ok: false,
          stage: 'plan',
          thread: {
            id: 'thread-codex-unavailable-1',
            selectedChannel: null,
          },
          plan: {
            state: 'blocked',
            proposedChannel: 'codex',
            reasonTags: ['codex-unavailable'],
            narrative: ['Codex is currently unavailable for this runtime.'],
            affirmationReasonCodes: [],
            blockedReasonCodes: ['codex-binary-missing'],
          },
          summary: 'codex unavailable',
          output: null,
        } satisfies MainGatewayExecutionTaskThreadResult
      }

      return {
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-claude-fallback-1',
          selectedChannel: 'claude-code',
        },
        plan: {
          state: 'routed',
          proposedChannel: 'claude-code',
          reasonTags: ['fallback', 'claude-code'],
          narrative: ['Delegated the investigation to Claude Code after Codex was unavailable.'],
          affirmationReasonCodes: [],
          blockedReasonCodes: [],
        },
        summary: 'delegated to claude code',
        output: {
          prompt: input.dispatch?.claudeCode?.prompt ?? null,
        },
      } satisfies MainGatewayExecutionTaskThreadResult
    })
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'unknown',
      nextActionIntent: 'unknown',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['investigation-dispatched'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'some-investigation-agent-dispatched',
        failureCondition: 'no-investigation-agent-available',
        reentryHint: '如果首选代理不可用，继续尝试下一个代码调查代理。',
        steps: [],
        targetPhase: 'unknown',
      },
      workflowState: null,
      executionStrategy: {
        mode: 'coding-investigation',
        recommendedChannel: 'codex',
        recommendedToolNames: ['executor_run_codex', 'executor_run_claude_code', 'executor_run_cli'],
        confidence: 0.96,
        rationale: '当前屏幕明显是编码报错调查场景，优先尝试代码调查代理。',
      },
      suggestedActions: [
        {
          kind: 'delegate-coding-investigation',
          title: '转给 Codex 调查当前代码/报错',
          rationale: '优先尝试 Codex。',
          toolName: 'executor_run_codex',
          arguments: {
            prompt: 'Investigate visible coding/error scene around Cursor runtime.ts. Visible summary: TypeScript error in runtime.ts.',
            kind: 'codebase-investigation',
            goal: 'Investigate visible coding scene',
            effect: 'observe',
            permissionMode: 'implicit',
          },
        },
        {
          kind: 'delegate-coding-investigation-claude-code',
          title: '转给 Claude Code 调查当前代码/报错',
          rationale: '如果 Codex 不可用，继续尝试 Claude Code。',
          toolName: 'executor_run_claude_code',
          arguments: {
            prompt: 'Investigate visible coding/error scene around Cursor runtime.ts. Visible summary: TypeScript error in runtime.ts.',
            kind: 'codebase-investigation',
            goal: 'Investigate visible coding scene',
            effect: 'observe',
            permissionMode: 'implicit',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Cursor. Suggested delegating the visible coding investigation to an available coding agent.',
      output: JSON.stringify({
        executionStrategy: {
          mode: 'coding-investigation',
          recommendedChannel: 'codex',
        },
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'Cursor',
          title: 'runtime.ts',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-inspect-agent-fallback-auto-continue',
        decisionTraceId: 'trace-inspect-agent-fallback-auto-continue',
        sessionId: 'session-inspect-agent-fallback-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '看看这个 runtime.ts 报错该怎么修',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(executeTaskThread).toHaveBeenNthCalledWith(1, expect.objectContaining({
      task: expect.objectContaining({
        requestedChannel: 'codex',
      }),
    }))
    expect(executeTaskThread).toHaveBeenNthCalledWith(2, expect.objectContaining({
      task: expect.objectContaining({
        requestedChannel: 'claude-code',
      }),
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 1,
        stoppedReason: 'step-limit-reached',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'executor_run_codex',
            result: expect.objectContaining({
              status: 'not-routed',
              proposedChannel: 'codex',
              planState: 'blocked',
              summary: 'codex unavailable',
            }),
          }),
          expect.objectContaining({
            toolName: 'executor_run_claude_code',
            result: expect.objectContaining({
              status: 'completed',
              selectedChannel: 'claude-code',
              planState: 'routed',
              summary: 'delegated to claude code',
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with executor_run_codex, executor_run_claude_code.')
  })

  it('desktop inspect scene auto continues into cli investigation when enabled', async () => {
    const executeTaskThread = vi.fn(async (input: any) => ({
      ok: true,
      stage: 'dispatch',
      thread: {
        id: 'thread-cli-investigation-1',
        selectedChannel: 'cli',
      },
      plan: {
        state: 'routed',
        proposedChannel: 'cli',
        reasonTags: ['visual-investigation', 'cli'],
        narrative: ['Delegated the visible terminal investigation to CLI.'],
        affirmationReasonCodes: [],
        blockedReasonCodes: [],
      },
      summary: 'delegated terminal investigation',
      output: {
        command: input.dispatch?.cli?.command ?? null,
        args: input.dispatch?.cli?.args ?? null,
      },
    } satisfies MainGatewayExecutionTaskThreadResult))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'unknown',
      nextActionIntent: 'unknown',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['investigation-dispatched'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'cli-investigation-dispatched',
        failureCondition: 'delegation-not-started',
        reentryHint: '如果还没开始调查，重新委托 CLI 复现可见命令。',
        steps: [],
        targetPhase: 'unknown',
      },
      workflowState: null,
      executionStrategy: {
        mode: 'terminal-investigation',
        recommendedChannel: 'cli',
        recommendedToolNames: ['executor_run_cli', 'executor_run_codex'],
        confidence: 0.95,
        rationale: '当前屏幕明显是终端报错调查场景，先复现可见命令更稳。',
      },
      suggestedActions: [
        {
          kind: 'delegate-terminal-cli-investigation',
          title: '先用 CLI 调查可见终端命令“pnpm test”',
          rationale: '当前终端里已经能直接看见失败命令，先复现/观察这条命令最稳。',
          toolName: 'executor_run_cli',
          arguments: {
            command: 'pnpm',
            args: ['test'],
            goal: 'Investigate visible terminal scene',
            effect: 'observe',
            permissionMode: 'implicit',
          },
        },
      ],
      summary: 'Inspected current desktop scene around iTerm2. Suggested delegating the visible terminal investigation to CLI.',
      output: JSON.stringify({
        executionStrategy: {
          mode: 'terminal-investigation',
          recommendedChannel: 'cli',
        },
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'iTerm2',
          processName: 'iTerm2',
          title: 'pnpm test',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-inspect-cli-auto-continue',
        decisionTraceId: 'trace-inspect-cli-auto-continue',
        sessionId: 'session-inspect-cli-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread,
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopInspectScene,
    } as any)

    const inspectSceneTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_inspect_scene') as any
    expect(inspectSceneTool).toBeDefined()
    if (!inspectSceneTool)
      return

    const result = await inspectSceneTool.execute({
      question: '看下这个终端报错',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(executeTaskThread).toHaveBeenCalledWith(expect.objectContaining({
      context: expect.objectContaining({
        cardId: 'default',
        turnId: 'turn-inspect-cli-auto-continue',
      }),
      task: expect.objectContaining({
        kind: 'run-command',
        requestedChannel: 'cli',
        effect: 'observe',
      }),
      dispatch: expect.objectContaining({
        cli: expect.objectContaining({
          command: 'pnpm',
          args: ['test'],
        }),
      }),
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 1,
        stoppedReason: 'step-limit-reached',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'executor_run_cli',
            result: expect.objectContaining({
              status: 'completed',
              selectedChannel: 'cli',
              planState: 'routed',
              summary: 'delegated terminal investigation',
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with executor_run_cli.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('auto continues browser workflow after search web when enabled', async () => {
    const browserSearchWeb = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_search_web',
      browser: input.browser ?? 'chrome',
      query: input.query ?? null,
      searchEngine: input.searchEngine ?? 'baidu',
      url: 'https://www.baidu.com/s?wd=alicization',
      title: 'Alicization - 百度搜索',
      summary: 'Searched the web for alicization.',
      output: 'https://www.baidu.com/s?wd=alicization',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://www.baidu.com/s?wd=alicization',
      title: 'Alicization - 百度搜索',
      summary: 'Waited for browser page readiness.',
      output: 'https://www.baidu.com/s?wd=alicization',
    }))
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      matchedText: 'Alicization 官方文档',
      summary: 'Clicked browser element Alicization 官方文档.',
      output: 'https://example.com/doc',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      content: '这里是 Alicization 官方文档正文。',
      output: '这里是 Alicization 官方文档正文。',
      summary: 'Read browser page content.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'search-results',
          nextActionIntent: 'open-search-result',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['content-detail-visible', 'url-changed-from-search-results'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'search-result-opened-and-detail-page-visible',
            failureCondition: 'search-results-still-visible-after-click',
            reentryHint: '如果还停在搜索结果页，继续打开更相关的结果。',
            steps: [],
            targetPhase: 'content-detail',
          },
          workflowState: {
            taskKey: 'browser::baidu-search::content-detail',
            currentPhase: 'search-results',
            previousPhase: null,
            progressState: 'started',
            targetPhase: 'content-detail',
            history: [
              {
                observedAt: 1,
                pagePhase: 'search-results',
                title: 'Alicization - 百度搜索',
                url: 'https://www.baidu.com/s?wd=alicization',
              },
            ],
            lastInspectionAt: 1,
            updatedAt: 1,
            title: 'Alicization - 百度搜索',
            url: 'https://www.baidu.com/s?wd=alicization',
          },
          executionStrategy: {
            mode: 'browser-dom',
            recommendedChannel: 'browser',
            recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
            confidence: 0.9,
            rationale: '当前处在搜索结果页，继续用浏览器 DOM 原语推进最稳。',
          },
          suggestedActions: [
            {
              kind: 'browser-click-primary-action',
              title: '先尝试点击“Alicization 官方文档”',
              rationale: '先打开最相关的搜索结果。',
              toolName: 'browser_click_element',
              arguments: {
                browser: 'chrome',
                text: 'Alicization 官方文档',
                targetType: 'link',
                expectedPhase: 'content-detail',
                reinspectAfterAction: true,
                inspectionQuestion: '帮我继续找最相关结果',
                inspectionMaxSuggestedActions: 3,
                autoContinueSuggestedActions: true,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Google Chrome. Workflow started on search-results aiming for content-detail.',
          output: JSON.stringify({
            pagePhase: 'search-results',
            nextActionIntent: 'open-search-result',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'ready-to-act',
          completionSignals: ['content-goal-met'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'content-read-complete-or-next-primary-action-identified',
          failureCondition: 'content-goal-still-unclear-after-reread',
          reentryHint: '继续读取正文和可交互元素，再决定下一步。',
          steps: [],
          targetPhase: 'content-detail',
        },
        workflowState: {
          taskKey: 'browser::baidu-search::content-detail',
          currentPhase: 'content-detail',
          previousPhase: 'search-results',
          progressState: 'advanced',
          targetPhase: 'content-detail',
          history: [
            {
              observedAt: 1,
              pagePhase: 'search-results',
              title: 'Alicization - 百度搜索',
              url: 'https://www.baidu.com/s?wd=alicization',
            },
            {
              observedAt: 2,
              pagePhase: 'content-detail',
              title: 'Alicization 官方文档',
              url: 'https://example.com/doc',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: 'Alicization 官方文档',
          url: 'https://example.com/doc',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
          recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
          confidence: 0.9,
          rationale: '当前已经进入内容页，适合继续用浏览器 DOM 原语推进。',
        },
        suggestedActions: [
          {
            kind: 'browser-read-text',
            title: '读取当前页面正文',
            rationale: '继续读取正文确认内容详情页的下一步。',
            toolName: 'browser_read_page',
            arguments: {
              format: 'text',
              browser: 'chrome',
            },
          },
        ],
        summary: 'Inspected current desktop scene around Google Chrome. Workflow advanced from search-results to content-detail.',
        output: JSON.stringify({
          pagePhase: 'content-detail',
          nextActionIntent: 'continue-browsing',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization - 百度搜索',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-search-web-auto-continue',
        decisionTraceId: 'trace-search-web-auto-continue',
        sessionId: 'session-search-web-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserSearchWeb,
      browserWait,
      browserClickElement,
      browserReadPage,
      desktopInspectScene,
    } as any)

    const searchWebTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_search_web') as any
    expect(searchWebTool).toBeDefined()
    if (!searchWebTool)
      return

    const result = await searchWebTool.execute({
      query: 'alicization',
      browser: 'chrome',
      searchEngine: 'baidu',
      inspectionQuestion: '帮我继续找最相关结果',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(browserClickElement).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      text: 'Alicization 官方文档',
      targetType: 'link',
    }))
    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_search_web',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_click_element',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_click_element',
              autoContinuation: expect.objectContaining({
                requested: true,
                executedSteps: expect.arrayContaining([
                  expect.objectContaining({
                    toolName: 'browser_read_page',
                    result: expect.objectContaining({
                      status: 'completed',
                      operation: 'browser_read_page',
                      content: '这里是 Alicization 官方文档正文。',
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with browser_click_element, browser_read_page.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('auto continues browser workflow after open url when enabled', async () => {
    const browserOpenUrl = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_open_url',
      browser: input.browser ?? 'chrome',
      url: input.url ?? 'https://www.baidu.com/s?wd=alicization',
      title: 'Alicization - 百度搜索',
      summary: 'Opened browser URL for alicization search results.',
      output: input.url ?? 'https://www.baidu.com/s?wd=alicization',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://www.baidu.com/s?wd=alicization',
      title: 'Alicization - 百度搜索',
      summary: 'Waited for browser page readiness.',
      output: 'https://www.baidu.com/s?wd=alicization',
    }))
    const browserClickElement = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_click_element',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetType: input.targetType ?? null,
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      matchedText: 'Alicization 官方文档',
      summary: 'Clicked browser element Alicization 官方文档.',
      output: 'https://example.com/doc',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/doc',
      title: 'Alicization 官方文档',
      content: '这里是 Alicization 官方文档正文。',
      output: '这里是 Alicization 官方文档正文。',
      summary: 'Read browser page content.',
    }))
    let inspectionCount = 0
    const desktopInspectScene = vi.fn(async (input: any) => {
      inspectionCount += 1
      if (inspectionCount === 1) {
        return {
          status: 'completed',
          operation: 'desktop_inspect_scene',
          channel: 'desktop',
          question: input.question ?? null,
          pagePhase: 'search-results',
          nextActionIntent: 'open-search-result',
          blockingSignals: [],
          workflowPlan: {
            continuationMode: 'ready-to-act',
            completionSignals: ['content-detail-visible', 'url-changed-from-search-results'],
            blockingReasons: [],
            repairActions: [],
            advanceCondition: 'search-result-opened-and-detail-page-visible',
            failureCondition: 'search-results-still-visible-after-click',
            reentryHint: '如果还停在搜索结果页，继续打开更相关的结果。',
            steps: [],
            targetPhase: 'content-detail',
          },
          workflowState: {
            taskKey: 'browser::open-url-search-results::content-detail',
            currentPhase: 'search-results',
            previousPhase: null,
            progressState: 'started',
            targetPhase: 'content-detail',
            history: [
              {
                observedAt: 1,
                pagePhase: 'search-results',
                title: 'Alicization - 百度搜索',
                url: 'https://www.baidu.com/s?wd=alicization',
              },
            ],
            lastInspectionAt: 1,
            updatedAt: 1,
            title: 'Alicization - 百度搜索',
            url: 'https://www.baidu.com/s?wd=alicization',
          },
          executionStrategy: {
            mode: 'browser-dom',
            recommendedChannel: 'browser',
            recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
            confidence: 0.9,
            rationale: '当前处在搜索结果页，继续用浏览器 DOM 原语推进最稳。',
          },
          suggestedActions: [
            {
              kind: 'browser-click-primary-action',
              title: '先尝试点击“Alicization 官方文档”',
              rationale: '先打开最相关的搜索结果。',
              toolName: 'browser_click_element',
              arguments: {
                browser: 'chrome',
                text: 'Alicization 官方文档',
                targetType: 'link',
                expectedPhase: 'content-detail',
                reinspectAfterAction: true,
                inspectionQuestion: '帮我继续找最相关结果',
                inspectionMaxSuggestedActions: 3,
                autoContinueSuggestedActions: true,
                maxAutoContinueSteps: 1,
              },
            },
          ],
          summary: 'Inspected current desktop scene around Google Chrome. Workflow started on search-results aiming for content-detail.',
          output: JSON.stringify({
            pagePhase: 'search-results',
            nextActionIntent: 'open-search-result',
          }),
        }
      }

      return {
        status: 'completed',
        operation: 'desktop_inspect_scene',
        channel: 'desktop',
        question: input.question ?? null,
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        blockingSignals: [],
        workflowPlan: {
          continuationMode: 'ready-to-act',
          completionSignals: ['content-goal-met'],
          blockingReasons: [],
          repairActions: [],
          advanceCondition: 'content-read-complete-or-next-primary-action-identified',
          failureCondition: 'content-goal-still-unclear-after-reread',
          reentryHint: '继续读取正文和可交互元素，再决定下一步。',
          steps: [],
          targetPhase: 'content-detail',
        },
        workflowState: {
          taskKey: 'browser::open-url-search-results::content-detail',
          currentPhase: 'content-detail',
          previousPhase: 'search-results',
          progressState: 'advanced',
          targetPhase: 'content-detail',
          history: [
            {
              observedAt: 1,
              pagePhase: 'search-results',
              title: 'Alicization - 百度搜索',
              url: 'https://www.baidu.com/s?wd=alicization',
            },
            {
              observedAt: 2,
              pagePhase: 'content-detail',
              title: 'Alicization 官方文档',
              url: 'https://example.com/doc',
            },
          ],
          lastInspectionAt: 2,
          updatedAt: 2,
          title: 'Alicization 官方文档',
          url: 'https://example.com/doc',
        },
        executionStrategy: {
          mode: 'browser-dom',
          recommendedChannel: 'browser',
          recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
          confidence: 0.9,
          rationale: '当前已经进入内容页，适合继续用浏览器 DOM 原语推进。',
        },
        suggestedActions: [
          {
            kind: 'browser-read-text',
            title: '读取当前页面正文',
            rationale: '继续读取正文确认内容详情页的下一步。',
            toolName: 'browser_read_page',
            arguments: {
              format: 'text',
              browser: 'chrome',
            },
          },
        ],
        summary: 'Inspected current desktop scene around Google Chrome. Workflow advanced from search-results to content-detail.',
        output: JSON.stringify({
          pagePhase: 'content-detail',
          nextActionIntent: 'continue-browsing',
        }),
      }
    })
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization - 百度搜索',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))

    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-open-url-auto-continue',
        decisionTraceId: 'trace-open-url-auto-continue',
        sessionId: 'session-open-url-auto-continue',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserOpenUrl,
      browserWait,
      browserClickElement,
      browserReadPage,
      desktopInspectScene,
    } as any)

    const openUrlTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_open_url') as any
    expect(openUrlTool).toBeDefined()
    if (!openUrlTool)
      return

    const result = await openUrlTool.execute({
      url: 'https://www.baidu.com/s?wd=alicization',
      browser: 'chrome',
      inspectionQuestion: '帮我继续找最相关结果',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 2,
    })

    expect(browserOpenUrl).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      url: 'https://www.baidu.com/s?wd=alicization',
    }))
    expect(browserClickElement).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      text: 'Alicization 官方文档',
      targetType: 'link',
    }))
    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_open_url',
      autoContinuation: expect.objectContaining({
        requested: true,
        maxSteps: 2,
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_click_element',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_click_element',
              autoContinuation: expect.objectContaining({
                requested: true,
                executedSteps: expect.arrayContaining([
                  expect.objectContaining({
                    toolName: 'browser_read_page',
                    result: expect.objectContaining({
                      status: 'completed',
                      operation: 'browser_read_page',
                      content: '这里是 Alicization 官方文档正文。',
                    }),
                  }),
                ]),
              }),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Auto-continued with browser_click_element, browser_read_page.')
    expect(String(result.output)).toContain('"autoContinuation"')
  })

  it('auto re-inspects browser workflow after text submit when an expected phase is provided', async () => {
    const browserTypeText = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_type_text',
      browser: input.browser ?? 'chrome',
      text: input.text ?? null,
      targetText: input.targetText ?? null,
      submit: input.submit ?? false,
      summary: 'Typed browser text and submitted the form.',
      output: input.text ?? null,
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://example.com/dashboard',
      title: 'Example Dashboard',
      summary: 'Waited for browser page readiness.',
      output: 'https://example.com/dashboard',
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/dashboard',
        title: 'Example Dashboard',
        textExcerpt: '登录后的主页概览',
        interactables: [
          {
            tag: 'a',
            role: 'link',
            type: null,
            text: '项目文档',
            ariaLabel: null,
            title: null,
            href: 'https://example.com/docs',
            disabled: false,
          },
        ],
      },
      screenSemanticSummary: {
        analyzedAt: 2,
        workload: {
          kind: 'browser',
          confidence: 0.94,
          matchedLabels: ['chrome'],
        },
        content: {
          kind: 'doc',
          confidence: 0.8,
          matchedLabels: ['dashboard'],
          summary: '登录后的控制台主页',
        },
        source: {
          id: 'window:chrome-dashboard',
          name: 'Google Chrome | Example Dashboard',
          strategy: 'app-name',
        },
      },
      pagePhase: 'content-detail',
      nextActionIntent: 'continue-browsing',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['authenticated-home-visible'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'credentials-submitted-and-login-ui-hidden',
        failureCondition: 'login-ui-still-visible-or-credential-rejected',
        reentryHint: '继续确认登录后的主页内容。',
        steps: [],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::login::content-detail',
        currentPhase: 'content-detail',
        previousPhase: 'login',
        progressState: 'advanced',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'login',
            title: 'Example Login',
            url: 'https://example.com/login',
          },
          {
            observedAt: 2,
            pagePhase: 'content-detail',
            title: 'Example Dashboard',
            url: 'https://example.com/dashboard',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Example Dashboard',
        url: 'https://example.com/dashboard',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
        confidence: 0.9,
        rationale: '当前已经登录完成，适合继续走浏览器 DOM 原语。',
      },
      suggestedActions: [
        {
          kind: 'browser-read-text',
          title: '读取登录后的主页正文',
          rationale: '先确认登录后的主页状态和下一步主动作。',
          toolName: 'browser_read_page',
          arguments: {
            format: 'text',
            browser: 'chrome',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Google Chrome. Workflow advanced from login to content-detail.',
      output: JSON.stringify({
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        blockingSignals: [],
        workflowState: {
          currentPhase: 'content-detail',
          previousPhase: 'login',
          progressState: 'advanced',
          targetPhase: 'content-detail',
        },
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Example Login',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-browser-type-follow-up',
        decisionTraceId: 'trace-browser-type-follow-up',
        sessionId: 'session-browser-type-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserTypeText,
      browserWait,
      desktopInspectScene,
    } as any)

    const typeBrowserTextTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_type_text') as any
    expect(typeBrowserTextTool).toBeDefined()
    if (!typeBrowserTextTool)
      return

    const result = await typeBrowserTextTool.execute({
      browser: 'chrome',
      text: 'hunter2',
      targetText: '密码',
      submit: true,
      expectedPhase: 'content-detail',
      reinspectAfterAction: true,
      inspectionQuestion: '登录之后到了哪一步',
    })

    expect(browserTypeText).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      text: 'hunter2',
      targetText: '密码',
      submit: true,
    }))
    expect(browserWait).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      state: 'complete',
      timeoutMs: 5_000,
    }))
    expect(desktopInspectScene).toHaveBeenCalledWith(expect.objectContaining({
      question: '登录之后到了哪一步',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_type_text',
      pagePhase: 'content-detail',
      nextActionIntent: 'continue-browsing',
      browserPageContext: expect.objectContaining({
        browser: 'chrome',
        url: 'https://example.com/dashboard',
        title: 'Example Dashboard',
      }),
      blockingSignals: [],
      workflowPlan: expect.objectContaining({
        targetPhase: 'content-detail',
        continuationMode: 'ready-to-act',
      }),
      workflowState: expect.objectContaining({
        currentPhase: 'content-detail',
        progressState: 'advanced',
      }),
      executionStrategy: expect.objectContaining({
        mode: 'browser-dom',
        recommendedChannel: 'browser',
      }),
      screenSemanticSummary: expect.objectContaining({
        content: expect.objectContaining({
          kind: 'doc',
          summary: '登录后的控制台主页',
        }),
      }),
      suggestedActions: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'browser_read_page',
        }),
      ]),
      workflowContinuation: expect.objectContaining({
        expectedPhase: 'content-detail',
        observedPhase: 'content-detail',
        progressState: 'advanced',
        matchedExpectedPhase: true,
        autoWaitApplied: true,
        autoWaitStatus: 'completed',
      }),
      postActionInspection: expect.objectContaining({
        pagePhase: 'content-detail',
        workflowState: expect.objectContaining({
          currentPhase: 'content-detail',
          progressState: 'advanced',
        }),
      }),
    }))
    expect(String(result.summary)).toContain('Workflow advanced to content-detail after follow-up inspection.')
    expect(String(result.output)).toContain('"workflowContinuation"')
    expect(String(result.output)).toContain('"postActionInspection"')
    expect(String(result.output)).toContain('"browserPageContext"')
    expect(String(result.output)).toContain('"pagePhase"')
    expect(String(result.output)).toContain('"nextActionIntent"')
    expect(String(result.output)).toContain('"blockingSignals"')
    expect(String(result.output)).toContain('"workflowPlan"')
    expect(String(result.output)).toContain('"workflowState"')
    expect(String(result.output)).toContain('"executionStrategy"')
    expect(String(result.output)).toContain('"screenSemanticSummary"')
    expect(String(result.output)).toContain('"suggestedActions"')
  })

  it('auto re-inspects and continues browser workflow after navigate when continuation is enabled', async () => {
    const browserNavigate = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_navigate',
      browser: input.browser ?? 'chrome',
      action: input.action ?? 'reload',
      url: 'https://example.com/doc?refresh=1',
      title: 'Alicization 官方文档（刷新后）',
      summary: 'Navigated the current browser page.',
      output: 'https://example.com/doc?refresh=1',
    }))
    const browserWait = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_wait',
      browser: input.browser ?? 'chrome',
      state: input.state ?? 'complete',
      timeoutMs: input.timeoutMs ?? 5_000,
      url: 'https://example.com/doc?refresh=1',
      title: 'Alicization 官方文档（刷新后）',
      summary: 'Waited for browser page readiness.',
      output: 'https://example.com/doc?refresh=1',
    }))
    const browserReadPage = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'browser_read_page',
      browser: input.browser ?? 'chrome',
      format: input.format ?? 'text',
      url: 'https://example.com/doc?refresh=1',
      title: 'Alicization 官方文档（刷新后）',
      content: '刷新后这里是重新读取到的正文。',
      summary: 'Read browser page content after navigation.',
      output: '刷新后这里是重新读取到的正文。',
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'content-detail',
      nextActionIntent: 'continue-browsing',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['content-goal-met'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'content-read-complete-or-next-primary-action-identified',
        failureCondition: 'content-goal-still-unclear-after-reread',
        reentryHint: '继续读取正文和可交互元素，再决定下一步。',
        steps: [],
        targetPhase: 'content-detail',
      },
      workflowState: {
        taskKey: 'browser::content-detail::content-detail',
        currentPhase: 'content-detail',
        previousPhase: 'content-detail',
        progressState: 'steady',
        targetPhase: 'content-detail',
        history: [
          {
            observedAt: 1,
            pagePhase: 'content-detail',
            title: 'Alicization 官方文档（刷新后）',
            url: 'https://example.com/doc?refresh=1',
          },
        ],
        lastInspectionAt: 1,
        updatedAt: 1,
        title: 'Alicization 官方文档（刷新后）',
        url: 'https://example.com/doc?refresh=1',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_wait'],
        confidence: 0.9,
        rationale: '刷新后仍在内容页，继续读取正文最稳。',
      },
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/doc?refresh=1',
        title: 'Alicization 官方文档（刷新后）',
        textExcerpt: '刷新后的页面已稳定。',
        interactables: [],
      },
      suggestedActions: [
        {
          kind: 'browser-read-text',
          title: '读取刷新后的正文',
          rationale: '先确认刷新后的正文内容。',
          toolName: 'browser_read_page',
          arguments: {
            browser: 'chrome',
            format: 'text',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Google Chrome. Workflow stayed on content-detail after navigation.',
      output: JSON.stringify({
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization 官方文档',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-browser-navigate-follow-up',
        decisionTraceId: 'trace-browser-navigate-follow-up',
        sessionId: 'session-browser-navigate-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      browserNavigate,
      browserWait,
      browserReadPage,
      desktopInspectScene,
    } as any)

    const navigateBrowserTool = tools.find((entry: any) => String(entry?.function?.name) === 'browser_navigate') as any
    expect(navigateBrowserTool).toBeDefined()
    if (!navigateBrowserTool)
      return

    const result = await navigateBrowserTool.execute({
      browser: 'chrome',
      action: 'reload',
      expectedPhase: 'content-detail',
      reinspectAfterAction: true,
      inspectionQuestion: '帮我刷新后继续看这个页面',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(browserNavigate).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      action: 'reload',
    }))
    expect(browserWait).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      state: 'complete',
      timeoutMs: 5_000,
    }))
    expect(browserReadPage).toHaveBeenCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'browser_navigate',
      pagePhase: 'content-detail',
      autoContinuation: expect.objectContaining({
        requested: true,
        stoppedReason: 'step-limit-reached',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'browser_read_page',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'browser_read_page',
              content: '刷新后这里是重新读取到的正文。',
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Workflow advanced to content-detail after follow-up inspection.')
    expect(String(result.summary)).toContain('Auto-continued with browser_read_page.')
  })

  it('auto re-inspects and continues desktop workflow after shortcut when continuation is enabled', async () => {
    const desktopPressKeys = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_press_keys',
      channel: 'desktop',
      shortcut: input.shortcut ?? 'command+l',
      summary: 'Pressed desktop shortcut command+l.',
      output: input.shortcut ?? 'command+l',
    }))
    const desktopListInteractables = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_list_interactables',
      channel: 'desktop',
      maxItems: input.maxItems ?? 12,
      interactables: [
        { ordinal: 1, role: 'input', text: '地址栏', enabled: true },
        { ordinal: 2, role: 'button', text: '刷新', enabled: true },
      ],
      summary: 'Listed desktop interactables after shortcut.',
      output: '[{"ordinal":1,"role":"input","text":"地址栏"},{"ordinal":2,"role":"button","text":"刷新"}]',
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      pagePhase: 'unknown',
      nextActionIntent: 'focus-address-bar',
      blockingSignals: [],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['target-control-identified'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'next-desktop-control-identified',
        failureCondition: 'target-control-still-unclear',
        reentryHint: '先列出当前控件，再确认要输入或点击的位置。',
        steps: [],
        targetPhase: 'unknown',
      },
      workflowState: {
        taskKey: 'desktop::browser::address-bar',
        currentPhase: 'unknown',
        previousPhase: 'unknown',
        progressState: 'advanced',
        targetPhase: 'unknown',
        history: [
          {
            observedAt: 1,
            pagePhase: 'unknown',
            title: 'Google Chrome',
          },
        ],
        lastInspectionAt: 1,
        updatedAt: 1,
        title: 'Google Chrome',
      },
      executionStrategy: {
        mode: 'desktop-dialog',
        recommendedChannel: 'desktop',
        recommendedToolNames: ['desktop_list_interactables', 'desktop_type_text', 'desktop_click_element'],
        confidence: 0.88,
        rationale: '快捷键后先列出当前桌面控件最稳。',
      },
      suggestedActions: [
        {
          kind: 'desktop-list-controls-after-shortcut',
          title: '先列出当前桌面控件',
          rationale: '快捷键已经切换焦点，先确认新的控件状态。',
          toolName: 'desktop_list_interactables',
          arguments: {
            maxItems: 12,
          },
        },
      ],
      summary: 'Inspected current desktop scene after shortcut.',
      output: JSON.stringify({
        pagePhase: 'unknown',
        nextActionIntent: 'focus-address-bar',
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Google Chrome',
          processName: 'Google Chrome',
          title: 'Alicization 官方文档',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 1,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-desktop-shortcut-follow-up',
        decisionTraceId: 'trace-desktop-shortcut-follow-up',
        sessionId: 'session-desktop-shortcut-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopPressKeys,
      desktopListInteractables,
      desktopInspectScene,
    } as any)

    const pressDesktopKeysTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_press_keys') as any
    expect(pressDesktopKeysTool).toBeDefined()
    if (!pressDesktopKeysTool)
      return

    const result = await pressDesktopKeysTool.execute({
      shortcut: 'command+l',
      reinspectAfterAction: true,
      inspectionQuestion: '帮我按下 command+l 后继续',
      autoContinueSuggestedActions: true,
      maxAutoContinueSteps: 1,
    })

    expect(desktopPressKeys).toHaveBeenCalledWith(expect.objectContaining({
      shortcut: 'command+l',
    }))
    expect(desktopListInteractables).toHaveBeenCalledWith(expect.objectContaining({
      maxItems: 12,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_press_keys',
      nextActionIntent: 'focus-address-bar',
      autoContinuation: expect.objectContaining({
        requested: true,
        stoppedReason: 'step-limit-reached',
        executedSteps: expect.arrayContaining([
          expect.objectContaining({
            toolName: 'desktop_list_interactables',
            result: expect.objectContaining({
              status: 'completed',
              operation: 'desktop_list_interactables',
              interactables: expect.arrayContaining([
                expect.objectContaining({
                  role: 'input',
                  text: '地址栏',
                }),
              ]),
            }),
          }),
        ]),
      }),
    }))
    expect(String(result.summary)).toContain('Workflow inspected after action')
    expect(String(result.summary)).toContain('Auto-continued with desktop_list_interactables.')
  })

  it('auto re-inspects desktop workflow after text submit when an expected phase is provided', async () => {
    const desktopTypeText = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_type_text',
      channel: 'desktop',
      text: input.text ?? null,
      targetText: input.targetText ?? null,
      submit: input.submit ?? false,
      summary: 'Typed desktop text and submitted the dialog.',
      output: input.text ?? null,
    }))
    const desktopInspectScene = vi.fn(async (input: any) => ({
      status: 'completed',
      operation: 'desktop_inspect_scene',
      channel: 'desktop',
      question: input.question ?? null,
      browserPageContext: {
        browser: 'chrome',
        url: 'https://example.com/upload',
        title: 'Upload asset',
        textExcerpt: '上传资产表单',
        interactables: [
          {
            tag: 'button',
            role: 'button',
            type: 'submit',
            text: '上传',
            ariaLabel: null,
            title: null,
            href: null,
            disabled: false,
          },
        ],
      },
      guiStructure: {
        interactableCount: 3,
        enabledInteractableCount: 3,
        roleCounts: {
          button: 2,
          input: 1,
        },
        primaryActionCandidates: [
          {
            role: 'button',
            text: '上传',
            enabled: true,
            ordinal: 1,
          },
        ],
        primaryInputCandidates: [
          {
            role: 'input',
            text: '文件名',
            enabled: true,
            ordinal: 1,
          },
        ],
      },
      unavailableReason: 'screen-semantic-weak-summary',
      pagePhase: 'upload-flow',
      nextActionIntent: 'fill-form',
      blockingSignals: ['awaiting-selection'],
      workflowPlan: {
        continuationMode: 'ready-to-act',
        completionSignals: ['file-selected', 'upload-flow-ready'],
        blockingReasons: [],
        repairActions: [],
        advanceCondition: 'native-dialog-dismissed-and-browser-upload-flow-visible',
        failureCondition: 'native-dialog-still-blocking-browser-flow',
        reentryHint: '继续确认上传区是否已经回到浏览器。',
        steps: [],
        targetPhase: 'upload-flow',
      },
      workflowState: {
        taskKey: 'browser::upload-handoff::upload-flow',
        currentPhase: 'upload-flow',
        previousPhase: 'browser-desktop-handoff',
        progressState: 'advanced',
        targetPhase: 'upload-flow',
        history: [
          {
            observedAt: 1,
            pagePhase: 'browser-desktop-handoff',
            title: 'Choose File',
          },
          {
            observedAt: 2,
            pagePhase: 'upload-flow',
            title: 'Upload asset',
            url: 'https://example.com/upload',
          },
        ],
        lastInspectionAt: 2,
        updatedAt: 2,
        title: 'Upload asset',
        url: 'https://example.com/upload',
      },
      executionStrategy: {
        mode: 'browser-dom',
        recommendedChannel: 'browser',
        recommendedToolNames: ['browser_read_page', 'browser_click_element', 'browser_type_text', 'browser_wait'],
        confidence: 0.88,
        rationale: '当前已经回到浏览器上传流，适合继续走浏览器 DOM 原语。',
      },
      suggestedActions: [
        {
          kind: 'browser-read-text',
          title: '读取当前上传页正文',
          rationale: '先确认上传页是否还缺少文件选择或表单补充。',
          toolName: 'browser_read_page',
          arguments: {
            format: 'text',
            browser: 'chrome',
          },
        },
      ],
      summary: 'Inspected current desktop scene around Chrome. Workflow advanced from browser-desktop-handoff to upload-flow.',
      output: JSON.stringify({
        pagePhase: 'upload-flow',
        nextActionIntent: 'fill-form',
        blockingSignals: ['awaiting-selection'],
        workflowState: {
          currentPhase: 'upload-flow',
          previousPhase: 'browser-desktop-handoff',
          progressState: 'advanced',
          targetPhase: 'upload-flow',
        },
      }),
    }))
    const getSensorySnapshot = vi.fn(async () => ({
      running: true,
      stale: false,
      ageMs: 100,
      nextTickAt: 200,
      sample: {
        collectedAt: 100,
        time: {
          iso: '2026-04-04T00:00:00.000Z',
          local: '2026-04-04 08:00',
          timezone: 'Asia/Shanghai',
        },
        foregroundWindow: {
          appName: 'Finder',
          processName: 'Finder',
          title: 'Choose File',
        },
        cpu: {
          usagePercent: 12,
          windowMs: 1000,
        },
        memory: {
          freeMB: 1024,
          totalMB: 8192,
          usagePercent: 87.5,
        },
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sessionPhase: 'active',
        sessionReason: null,
        selectedSourceId: 'window:1',
        currentSourceId: 'window:1',
        sourcePreference: 'window',
        sourceCount: 2,
        leaseStatus: 'leased',
        leaseSourceId: 'window:1',
        lastUpdatedAt: 100,
        lastError: null,
        degradedReasons: [],
      },
    } satisfies AlicizationSensoryCacheSnapshot))
    const tools = await buildMainGatewayTools({
      buildExecutionRuntimeContext: createBuildExecutionRuntimeContext(getSensorySnapshot),
      context: {
        cardId: 'default',
        turnId: 'turn-desktop-type-follow-up',
        decisionTraceId: 'trace-desktop-type-follow-up',
        sessionId: 'session-desktop-type-follow-up',
      },
      executionCapabilityChannels: executionChannels,
      executeTaskThread: vi.fn(async () => ({
        ok: true,
        stage: 'dispatch',
        thread: {
          id: 'thread-unused',
          selectedChannel: 'cli',
        },
        plan: {
          state: 'routed',
        },
        summary: 'unused',
        output: null,
      } satisfies MainGatewayExecutionTaskThreadResult)),
      getSensorySnapshot,
      resolveTaskPlanningCapabilities: vi.fn(async () => []),
      scheduleReminderTask: vi.fn(async () => ({ ok: true })),
      invokeMcpListTools: vi.fn(async () => ({ tools: [] })),
      invokeMcpCallTool: vi.fn(async () => ({ ok: true })),
      desktopTypeText,
      desktopInspectScene,
    } as any)

    const typeDesktopTextTool = tools.find((entry: any) => String(entry?.function?.name) === 'desktop_type_text') as any
    expect(typeDesktopTextTool).toBeDefined()
    if (!typeDesktopTextTool)
      return

    const result = await typeDesktopTextTool.execute({
      text: 'demo.png',
      targetText: '文件名',
      submit: true,
      expectedPhase: 'upload-flow',
      reinspectAfterAction: true,
      inspectionQuestion: '文件选择完成了吗',
    })

    expect(desktopTypeText).toHaveBeenCalledWith(expect.objectContaining({
      text: 'demo.png',
      targetText: '文件名',
      submit: true,
    }))
    expect(desktopInspectScene).toHaveBeenCalledWith(expect.objectContaining({
      question: '文件选择完成了吗',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(result).toEqual(expect.objectContaining({
      status: 'completed',
      operation: 'desktop_type_text',
      pagePhase: 'upload-flow',
      nextActionIntent: 'fill-form',
      browserPageContext: expect.objectContaining({
        browser: 'chrome',
        url: 'https://example.com/upload',
        title: 'Upload asset',
      }),
      guiStructure: expect.objectContaining({
        interactableCount: 3,
        roleCounts: expect.objectContaining({
          button: 2,
          input: 1,
        }),
      }),
      unavailableReason: 'screen-semantic-weak-summary',
      blockingSignals: expect.arrayContaining(['awaiting-selection']),
      workflowPlan: expect.objectContaining({
        targetPhase: 'upload-flow',
        continuationMode: 'ready-to-act',
      }),
      workflowState: expect.objectContaining({
        currentPhase: 'upload-flow',
        progressState: 'advanced',
      }),
      executionStrategy: expect.objectContaining({
        mode: 'browser-dom',
        recommendedChannel: 'browser',
      }),
      suggestedActions: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'browser_read_page',
        }),
      ]),
      workflowContinuation: expect.objectContaining({
        expectedPhase: 'upload-flow',
        observedPhase: 'upload-flow',
        progressState: 'advanced',
        matchedExpectedPhase: true,
        autoWaitApplied: false,
      }),
      postActionInspection: expect.objectContaining({
        pagePhase: 'upload-flow',
        workflowState: expect.objectContaining({
          currentPhase: 'upload-flow',
          progressState: 'advanced',
        }),
      }),
    }))
    expect(String(result.summary)).toContain('Workflow advanced to upload-flow after follow-up inspection.')
    expect(String(result.output)).toContain('"workflowContinuation"')
    expect(String(result.output)).toContain('"postActionInspection"')
    expect(String(result.output)).toContain('"browserPageContext"')
    expect(String(result.output)).toContain('"guiStructure"')
    expect(String(result.output)).toContain('"pagePhase"')
    expect(String(result.output)).toContain('"nextActionIntent"')
    expect(String(result.output)).toContain('"blockingSignals"')
    expect(String(result.output)).toContain('"workflowPlan"')
    expect(String(result.output)).toContain('"workflowState"')
    expect(String(result.output)).toContain('"executionStrategy"')
    expect(String(result.output)).toContain('"suggestedActions"')
    expect(String(result.output)).toContain('"unavailableReason"')
  })
})
