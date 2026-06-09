import type { AlicizationChannelCapability } from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'
import type { MainGatewayExecutionTaskThreadResult } from './main-chat-execution-surface'

import { Buffer } from 'node:buffer'

import { describe, expect, it, vi } from 'vitest'

import { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'
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

    const [capabilityBlock, routerBlock] = buildExecutionCapabilitySystemBlocks(capabilities, executionChannels, {
      allowTools: true,
      inquiry: {
        capabilityQuestion: true,
        mentionedChannels: ['cli', 'codex'],
      },
    })

    expect(capabilityBlock).toContain('[ALICIZATION_EXECUTION_CAPABILITIES]')
    expect(capabilityBlock).toContain('Capability query focus: cli, codex.')
    expect(capabilityBlock).toContain('Never collapse multi-channel capability answers into a blanket "cannot".')
    expect(capabilityBlock).toContain('call executor_capability_snapshot first')
    expect(routerBlock).toContain('executor_run_cli')
    expect(routerBlock).toContain('executor_run_codex')
    expect(routerBlock).toContain('executor_run_claude_code')
    expect(routerBlock).toContain('browser_open_url')
    expect(routerBlock).toContain('browser_search_web')
    expect(routerBlock).toContain('browser_read_page')
    expect(routerBlock).toContain('browser_click_element')
    expect(routerBlock).toContain('browser_type_text')
    expect(routerBlock).toContain('browser_navigate')
    expect(routerBlock).toContain('browser_scroll')
    expect(routerBlock).toContain('browser_wait')
    expect(routerBlock).toContain('desktop_inspect_scene')
    expect(routerBlock).toContain('desktop_list_interactables')
    expect(routerBlock).toContain('desktop_click_element')
    expect(routerBlock).toContain('desktop_type_text')
    expect(routerBlock).toContain('desktop_press_keys')
    expect(routerBlock).toContain('desktop_open_application')
    expect(routerBlock).toContain('desktop_wait')
    expect(routerBlock).toContain('executor_run_openclaw')
    expect(routerBlock).toContain('filesystem_patch_file')
    expect(routerBlock).toContain('filesystem_search_files')
  })

  it('includes canonical project briefing in execution capability system blocks when runtime context is available', () => {
    const capabilities: AlicizationChannelCapability[] = [
      { channel: 'cli', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
      { channel: 'codex', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'claude-code', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'openclaw', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    ]

    const blocks = buildExecutionCapabilitySystemBlocks(capabilities, executionChannels, {
      runtimeContext: buildAlicizationExecutionRuntimeContext({
        agentSessionId: 'agent-session-1',
        cardId: 'default',
        turnId: 'turn-project-briefing',
        decisionTraceId: 'trace-project-briefing',
        sessionId: 'session-1',
        projectBriefing: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
          primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
          nextClosureTarget: 'Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
          preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Project identity carry | next=Phase 1 route carry',
          preDialogueAwarenessLine: 'Before answering, remember: this is still the same digital life project.',
        },
        recentActions: [],
        sensorySnapshot: {
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
        },
      }),
    })

    const projectBriefingBlock = blocks[0] ?? ''
    expect(projectBriefingBlock).toContain('[ALICIZATION_PROJECT_BRIEFING]')
    expect(projectBriefingBlock).toContain('Before answering execution capability or routing questions, keep this project-state briefing explicit.')
    expect(projectBriefingBlock).toContain('project_identity=')
    expect(projectBriefingBlock).toContain('project_phase=')
    expect(projectBriefingBlock).toContain('latest_landed_progress=')
    expect(projectBriefingBlock).toContain('primary_open_loop=')
    expect(projectBriefingBlock).toContain('next_closure_target=')
    expect(projectBriefingBlock).toContain('same_her_line=')
    expect(projectBriefingBlock).toContain('same_her_hold=')
    expect(projectBriefingBlock).toContain('same_her_drift_risk=')
    expect(projectBriefingBlock).toContain('project_continuity=')
    expect(projectBriefingBlock).toContain('project_awareness=')
    expect(projectBriefingBlock).toContain('project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer.')
    expect(projectBriefingBlock).toContain('project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(projectBriefingBlock).toContain('latest_landed_progress=Same-session mirror carry and measured-return continuity now survive longer noisy detours.')
    expect(projectBriefingBlock).toContain('primary_open_loop=Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.')
    expect(projectBriefingBlock).toContain('same_her_hold=same-her hold: execution should keep this same project line inward before widening outward.')
    expect(projectBriefingBlock).toContain('project_continuity=same living line: execution should keep carrying this same Phase 1 digital life before widening outward.')
    expect(projectBriefingBlock).toContain('project_awareness=Before answering, remember: this is still the same digital life project.')
    expect(projectBriefingBlock).toContain('Execution guidance must stay inside the same digital life project')
  })

  it('prefers same-her awareness over thinner preflight summaries in execution capability project briefing blocks', () => {
    const capabilities: AlicizationChannelCapability[] = [
      { channel: 'cli', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
      { channel: 'codex', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'claude-code', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'openclaw', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    ]

    const blocks = buildExecutionCapabilitySystemBlocks(capabilities, executionChannels, {
      runtimeContext: buildAlicizationExecutionRuntimeContext({
        agentSessionId: 'agent-session-1',
        cardId: 'default',
        turnId: 'turn-project-briefing-prefer-same-her',
        decisionTraceId: 'trace-project-briefing-prefer-same-her',
        sessionId: 'session-1',
        projectBriefing: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Same-session mirror carry survives noisier execution detours.',
          primaryOpenLoop: 'Execution reopenings still need stronger same-her closure.',
          nextClosureTarget: 'Keep execution returns, memory carry, and dialogue formation on one same-her line.',
          sameHerSelfLine: 'Same Phase 1 digital life. The callback return still belongs to one living her rather than a generic execution shell.',
          sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
          sameHerDriftRisk: 'If execution guidance keeps only a thin preflight shell, treat that as unfinished same-her drift.',
          continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
          preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Execution reopenings still need stronger same-her closure',
          preDialogueAwarenessLine: 'Before answering, remember this callback return still belongs to one living her.',
        },
        recentActions: [],
        sensorySnapshot: {
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
        },
      }),
    })

    const projectBriefingBlock = blocks[0] ?? ''
    expect(projectBriefingBlock).toContain('project_preflight=Same Phase 1 digital life. The callback return still belongs to one living her rather than a generic execution shell.')
    expect(projectBriefingBlock).toContain('project_awareness=Before answering, remember this callback return still belongs to one living her.')
    expect(projectBriefingBlock).toContain('latest_landed_progress=Same-session mirror carry survives noisier execution detours.')
    expect(projectBriefingBlock).toContain('primary_open_loop=Execution reopenings still need stronger same-her closure.')
    expect(projectBriefingBlock).toContain('same_her_hold=same-her hold: keep execution on the same living line before widening outward.')
    expect(projectBriefingBlock).toContain('project_continuity=same living line: execution should keep carrying this same Phase 1 digital life before widening outward.')
    expect(projectBriefingBlock).not.toContain('project_preflight=identity=Alicization | phase=Phase 1')
  })

  it('prefers richer project-aware execution preflight over a thinner same-her baseline when awareness already keeps the project identity and embodiment closure gap explicit together', () => {
    const capabilities: AlicizationChannelCapability[] = [
      { channel: 'cli', available: true, enabled: true, ready: true, sessionAffinity: false, reason: null },
      { channel: 'codex', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'claude-code', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
      { channel: 'openclaw', available: true, enabled: true, ready: true, sessionAffinity: true, reason: null },
    ]

    const richerProjectAwarePreflight = 'Before answering, remember this is still the same local-first digital life project, Phase 1 is still active, audible-body carry already survives execution preflight, and face, motion, plus lipsync still remain the open closure before this dispatch widens outward.'
    const thinnerSameHerBaseline = 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.'

    const blocks = buildExecutionCapabilitySystemBlocks(capabilities, executionChannels, {
      runtimeContext: buildAlicizationExecutionRuntimeContext({
        agentSessionId: 'agent-session-1',
        cardId: 'default',
        turnId: 'turn-project-briefing-prefer-richer-project-aware-preflight',
        decisionTraceId: 'trace-project-briefing-prefer-richer-project-aware-preflight',
        sessionId: 'session-1',
        projectBriefing: {
          identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
          currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
          latestLandedProgress: 'Audible-body carry already survives execution preflight without dropping the same living line.',
          primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin on the same living line before execution can feel fully embodied.',
          nextClosureTarget: 'Keep execution, memory, initiative, and embodiment on one same living line before outward fluency takes over.',
          sameHerSelfLine: thinnerSameHerBaseline,
          sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
          sameHerDriftRisk: 'If execution re-entry opens like detached project narration or a generic assistant shell, treat that as unfinished same-her drift.',
          continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
          preDialogueAwarenessLine: richerProjectAwarePreflight,
        },
        recentActions: [],
        sensorySnapshot: {
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
        },
      }),
    })

    const projectBriefingBlock = blocks[0] ?? ''
    expect(projectBriefingBlock).toContain(`project_preflight=${richerProjectAwarePreflight}`)
    expect(projectBriefingBlock).not.toContain(`project_preflight=${thinnerSameHerBaseline}`)
    expect(projectBriefingBlock).toContain(`project_awareness=${richerProjectAwarePreflight}`)
  })

  it('builds execution routing guard with required tool names', () => {
    const block = buildExecutionRoutingEnforcementSystemBlock({
      requestedChannels: ['cli', 'codex'],
      requiredToolNames: ['executor_run_cli', 'executor_run_codex'],
      reasonCodes: ['channel-mentioned', 'action-verb'],
    })

    expect(block).toContain('[ALICIZATION_EXECUTION_ROUTING_GUARD]')
    expect(block).toContain('executor_run_cli, executor_run_codex')
    expect(block).toContain('Do not pretend execution happened.')
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

  it('injects grounded sensory execution context into openclaw dispatches', async () => {
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
    })

    expect(executeTaskThread).toBeCalledWith(expect.objectContaining({
      dispatch: expect.objectContaining({
        openclaw: expect.objectContaining({
          runtimeContext: expect.objectContaining({
            cardId: 'default',
            turnId: 'turn-openclaw-context-1',
            decisionTraceId: 'trace-openclaw-context-1',
            sessionId: 'session-openclaw-context-1',
            agentSessionId: 'agent-session-1',
            projectBriefing: expect.objectContaining({
              identity: expect.stringContaining('local-first digital life project'),
              currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
              sameHerSelfLine: expect.stringContaining('Same Phase 1 digital life'),
            }),
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
