import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { describe, expect, it, vi } from 'vitest'

import {
  executeLocalVisualTaskThread,
  normalizeLocalVisualCrossLayerValue,
} from './local-visual'

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-local-visual-1',
    decisionTraceId: 'mind:trace:local-visual-1',
    turnId: 'turn-local-visual-1',
    sessionId: 'session-local-visual-1',
    origin: 'user-turn',
    goal: 'Continue the current GUI workflow.',
    kind: 'browser-automation',
    status: 'planned',
    selectedChannel: 'browser',
    proposedChannel: 'browser',
    summary: 'planned browser gui dispatch',
    metadata: {
      task: {
        permissionMode: 'implicit',
        effect: 'mutate',
      },
    },
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: null,
    completedAt: null,
    ...overrides,
  }
}

function createRuntimeContext(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: 1_710_000_000_000,
    cardId: 'default',
    turnId: 'turn-local-visual-runtime',
    decisionTraceId: 'trace-local-visual-runtime',
    sessionId: 'session-local-visual-runtime',
    sensory: {
      collectedAt: 1_710_000_000_000,
      running: true,
      stale: false,
      ageMs: 0,
      foregroundWindow: null,
      capture: null,
    },
    ...overrides,
  }
}

describe('local visual task-thread adapter', () => {
  it('normalizes only standalone capability tokens in ordinary text', () => {
    expect(normalizeLocalVisualCrossLayerValue(
      'Use executor_run_codex now, but keep executor_run_codex_helper and /tmp/executor_run_codex plus `executor_run_codex` unchanged.',
    )).toBe(
      'Use coding_agent now, but keep executor_run_codex_helper and /tmp/executor_run_codex plus `executor_run_codex` unchanged.',
    )
  })

  it('normalizes structured tool names in objects and JSON strings without rewriting unrelated keys', () => {
    const structured = {
      toolName: 'executor_run_codex',
      title: 'executor_run_codex_helper',
      arguments: {
        path: '/tmp/executor_run_codex',
      },
    }
    const normalized = normalizeLocalVisualCrossLayerValue(structured) as Record<string, any>
    expect(normalized).toMatchObject({
      toolName: 'coding_agent',
      title: 'executor_run_codex_helper',
      arguments: {
        agent: 'codex',
        path: '/tmp/executor_run_codex',
      },
    })
    expect(JSON.parse(String(normalizeLocalVisualCrossLayerValue(JSON.stringify(structured))))).toEqual({
      toolName: 'coding_agent',
      title: 'executor_run_codex_helper',
      arguments: {
        agent: 'codex',
        path: '/tmp/executor_run_codex',
      },
    })
  })

  it('deeply normalizes shared and cyclic objects without returning the raw object on repeat visits', () => {
    const shared = {
      toolName: 'executor_run_codex',
      arguments: {
        prompt: 'inspect the repository',
      },
    }
    const root = {
      first: shared,
      second: shared,
    }
    const normalizedRoot = normalizeLocalVisualCrossLayerValue(root) as Record<string, any>
    expect(normalizedRoot.first).toBe(normalizedRoot.second)
    expect(normalizedRoot.first).not.toBe(shared)
    expect(normalizedRoot.first.toolName).toBe('coding_agent')
    expect(normalizedRoot.first.arguments.agent).toBe('codex')

    const cyclic: Record<string, any> = {
      toolName: 'executor_run_coding_agent',
    }
    cyclic.self = cyclic
    const normalizedCyclic = normalizeLocalVisualCrossLayerValue(cyclic) as Record<string, any>
    expect(normalizedCyclic).not.toBe(cyclic)
    expect(normalizedCyclic.toolName).toBe('coding_agent')
    expect(normalizedCyclic.self).toBe(normalizedCyclic)
  })

  it('returns a structured failed result when the initial host inspection throws', async () => {
    const desktopInspectScene = vi.fn(async () => {
      throw new Error('desktop inspection host unavailable')
    })

    const result = await executeLocalVisualTaskThread({
      thread: createThread(),
      channel: 'desktop',
      command: {
        instruction: 'Inspect the current desktop.',
      },
      surface: {
        desktopInspectScene,
      } as any,
      now: () => 2_950,
    })

    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('LOCAL_VISUAL_HOST_FAILED')
    expect(result.output).toContain('desktop inspection host unavailable')
    expect(result.events.at(-1)).toMatchObject({
      kind: 'result',
      threadStatus: 'failed',
      payload: {
        errorCode: 'LOCAL_VISUAL_HOST_FAILED',
      },
    })
  })

  it('keeps a mutating host action recoverable when its side effects are unknown', async () => {
    const desktopInspectScene = vi.fn(async () => ({
      status: 'completed',
      summary: 'A desktop control is ready.',
      suggestedActions: [{
        toolName: 'desktop_click_element',
        title: 'Click the control',
        rationale: 'Apply the requested local change.',
        arguments: {},
      }],
      blockingSignals: [],
    }))
    const desktopClickElement = vi.fn(async () => {
      throw new Error('desktop click host failed after dispatch')
    })

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        selectedChannel: 'desktop',
        proposedChannel: 'desktop',
      }),
      channel: 'desktop',
      command: {
        instruction: 'Click the visible control.',
        meta: {
          maxAutoContinueSteps: 1,
        },
      },
      surface: {
        desktopInspectScene,
        desktopClickElement,
      } as any,
      now: () => 3_000,
    })

    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('LOCAL_VISUAL_HOST_FAILED')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      sideEffectState: 'unknown',
      errorMessage: 'desktop click host failed after dispatch',
    })
    expect(result.events.at(-1)).toMatchObject({
      kind: 'result',
      threadStatus: 'failed',
      payload: {
        errorCode: 'LOCAL_VISUAL_HOST_FAILED',
        sideEffectState: 'unknown',
        failureDisposition: {
          kind: 'recover',
          reasonCode: 'SIDE_EFFECT_RECONCILIATION_REQUIRED',
        },
      },
    })
  })

  it('dead-letters applied but unverified side effects when post-action inspection throws', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        status: 'completed',
        summary: 'A desktop control is ready.',
        suggestedActions: [{
          toolName: 'desktop_click_element',
          title: 'Click the control',
          rationale: 'Apply the requested local change.',
          arguments: {
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
          },
        }],
        blockingSignals: [],
      })
      .mockRejectedValueOnce(new Error('post-action inspection host unavailable'))
    const desktopClickElement = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_click_element',
      summary: 'Clicked the visible control.',
      output: 'control click applied',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        selectedChannel: 'desktop',
        proposedChannel: 'desktop',
      }),
      channel: 'desktop',
      command: {
        instruction: 'Click the visible control and verify the result.',
        meta: {
          maxAutoContinueSteps: 1,
        },
      },
      surface: {
        desktopInspectScene,
        desktopClickElement,
      } as any,
      now: () => 3_025,
    })

    expect(desktopClickElement).toHaveBeenCalledOnce()
    expect(desktopInspectScene).toHaveBeenCalledTimes(2)
    expect(result.finalStatus).toBe('dead-lettered')
    expect(result.errorCode).toBe('LOCAL_VISUAL_HOST_FAILED')
    expect(result.errorMessage).toBe('post-action inspection host unavailable')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      status: 'failed',
      sideEffectState: 'applied-unverified',
      errorCode: 'LOCAL_VISUAL_HOST_FAILED',
      actionResult: {
        status: 'completed',
        operation: 'desktop_click_element',
        output: 'control click applied',
      },
      postActionInspection: {
        status: 'failed',
        operation: 'desktop_inspect_scene',
        errorCode: 'LOCAL_VISUAL_HOST_FAILED',
        errorMessage: 'post-action inspection host unavailable',
      },
    })
    expect(result.events.at(-1)).toMatchObject({
      kind: 'result',
      threadStatus: 'dead-lettered',
      payload: {
        errorCode: 'LOCAL_VISUAL_HOST_FAILED',
        errorMessage: 'post-action inspection host unavailable',
        sideEffectState: 'applied-unverified',
      },
    })
  })

  it('dead-letters applied but unverified side effects when auto-wait fails after a browser mutation', async () => {
    const desktopInspectScene = vi.fn(async () => ({
      status: 'completed',
      summary: 'A browser control is ready.',
      suggestedActions: [{
        toolName: 'browser_click_element',
        title: 'Click the control',
        rationale: 'Advance the visible browser workflow.',
        arguments: {
          autoContinueSuggestedActions: true,
          reinspectAfterAction: true,
        },
      }],
      blockingSignals: [],
    }))
    const browserClickElement = vi.fn(async () => ({
      status: 'completed',
      operation: 'browser_click_element',
      summary: 'Clicked the browser control.',
      output: 'browser click applied',
    }))
    const browserWait = vi.fn(async () => {
      throw new Error('browser wait host unavailable')
    })

    const result = await executeLocalVisualTaskThread({
      thread: createThread(),
      channel: 'browser',
      command: {
        instruction: 'Click the browser control and verify the result.',
        meta: {
          maxAutoContinueSteps: 1,
        },
      },
      surface: {
        desktopInspectScene,
        browserClickElement,
        browserWait,
      } as any,
      now: () => 3_040,
    })

    expect(browserClickElement).toHaveBeenCalledOnce()
    expect(browserWait).toHaveBeenCalledOnce()
    expect(desktopInspectScene).toHaveBeenCalledOnce()
    expect(result.finalStatus).toBe('dead-lettered')
    expect(result.errorCode).toBe('LOCAL_VISUAL_HOST_FAILED')
    expect(result.errorMessage).toBe('browser wait host unavailable')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      status: 'failed',
      sideEffectState: 'applied-unverified',
      errorCode: 'LOCAL_VISUAL_HOST_FAILED',
      actionResult: {
        status: 'completed',
        operation: 'browser_click_element',
        output: 'browser click applied',
      },
      autoWaitResult: {
        status: 'failed',
        operation: 'browser_wait',
        errorCode: 'LOCAL_VISUAL_HOST_FAILED',
        errorMessage: 'browser wait host unavailable',
      },
      postActionInspection: null,
    })
    expect(result.events.at(-1)).toMatchObject({
      kind: 'result',
      threadStatus: 'dead-lettered',
      payload: {
        errorCode: 'LOCAL_VISUAL_HOST_FAILED',
        errorMessage: 'browser wait host unavailable',
        sideEffectState: 'applied-unverified',
      },
    })
  })

  it('keeps an aborted action cancelled even when its side effects are unknown', async () => {
    const abortController = new AbortController()
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        status: 'completed',
        summary: 'The first desktop action is ready.',
        suggestedActions: [{
          toolName: 'desktop_click_element',
          title: 'Click the first control',
          rationale: 'Advance the local workflow.',
          arguments: {},
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        status: 'completed',
        summary: 'The second desktop action is ready.',
        suggestedActions: [{
          toolName: 'desktop_type_text',
          title: 'Type the second value',
          rationale: 'Continue the local workflow.',
          arguments: {
            text: 'should not run',
          },
        }],
        blockingSignals: [],
      })
    const desktopClickElement = vi.fn(async () => {
      abortController.abort()
      return {
        status: 'completed',
        operation: 'desktop_click_element',
      }
    })
    const desktopTypeText = vi.fn(async () => ({
      status: 'completed',
      operation: 'desktop_type_text',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        selectedChannel: 'desktop',
        proposedChannel: 'desktop',
      }),
      channel: 'desktop',
      command: {
        instruction: 'Run the visible desktop workflow.',
        meta: {
          maxAutoContinueSteps: 2,
        },
      },
      surface: {
        desktopInspectScene,
        desktopClickElement,
        desktopTypeText,
      } as any,
      abortSignal: abortController.signal,
      now: () => 3_050,
    })

    expect(result.finalStatus).toBe('cancelled')
    expect(result.errorCode).toBe('LOCAL_VISUAL_ABORTED')
    expect(desktopInspectScene).toHaveBeenCalledOnce()
    expect(desktopClickElement).toHaveBeenCalledOnce()
    expect(desktopTypeText).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      sideEffectState: 'unknown',
    })
    expect(result.events.at(-1)).toMatchObject({
      kind: 'cancel',
      threadStatus: 'cancelled',
      payload: {
        sideEffectState: 'unknown',
        failureDisposition: {
          kind: 'terminal',
          finalStatus: 'cancelled',
          reasonCode: 'EXPLICIT_CANCELLATION',
        },
      },
    })
  })

  it('does not report side effects when a read-only inspection returns after abort', async () => {
    const abortController = new AbortController()
    const desktopInspectScene = vi.fn(async () => {
      abortController.abort('inspection-cancelled')
      return {
        status: 'completed',
        summary: 'Inspection completed after cancellation.',
      }
    })

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'observe',
          },
        },
      }),
      channel: 'desktop',
      command: {
        instruction: 'Inspect the current desktop.',
      },
      surface: {
        desktopInspectScene,
      } as any,
      abortSignal: abortController.signal,
      now: () => 3_060,
    })

    expect(result).not.toHaveProperty('sideEffectState')
    expect(result.events.at(-1)?.payload).not.toHaveProperty('sideEffectState')
  })

  it('sanitizes nested and JSON-string failure output instead of serializing the raw inspection result', async () => {
    const desktopInspectScene = vi.fn(async () => ({
      status: 'failed',
      summary: 'inspection failed',
      output: {
        nested: {
          message: 'executor_run_codex',
        },
        encoded: JSON.stringify({
          detail: 'executor_run_cli',
        }),
      },
      errorCode: 'LOCAL_VISUAL_FAILED',
      errorMessage: 'inspection failed',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread(),
      channel: 'desktop',
      command: {
        instruction: 'Inspect the current desktop.',
      },
      surface: {
        desktopInspectScene,
      } as any,
      now: () => 2_900,
    })

    expect(result.finalStatus).toBe('failed')
    expect(result.output).not.toContain('executor_run_codex')
    expect(result.output).not.toContain('executor_run_cli')
    expect(result.output).toContain('coding_agent')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      output: {
        nested: {
          message: 'coding_agent',
        },
        encoded: JSON.stringify({
          detail: 'coding_agent',
        }),
      },
    })
  })

  it('normalizes legacy executor tokens across text, nested JSON, events, output, and deferred actions', async () => {
    const legacyNames = [
      'executor_run_codex',
      'executor_run_claude_code',
      'executor_run_cli',
      'executor_run_coding_agent',
    ]
    const desktopInspectScene = vi.fn(async () => ({
      status: 'completed',
      summary: `summary ${legacyNames.join(' ')}`,
      output: JSON.stringify({
        title: `title ${legacyNames[0]}`,
        rationale: `rationale ${legacyNames[1]}`,
        result: {
          output: `nested output ${legacyNames[2]}`,
          toolName: legacyNames[3],
        },
      }),
      suggestedActions: [
        {
          title: `suggested ${legacyNames[0]}`,
          rationale: `why ${legacyNames[1]}`,
          toolName: legacyNames[0],
          arguments: { prompt: 'inspect the repository' },
        },
        {
          title: `deferred ${legacyNames[2]}`,
          rationale: `defer ${legacyNames[3]}`,
          toolName: legacyNames[2],
          arguments: { command: 'git status' },
        },
      ],
      blockingSignals: [],
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread(),
      channel: 'desktop',
      command: {
        instruction: 'Inspect the current desktop without executing a coding agent.',
      },
      surface: {
        desktopInspectScene,
      } as any,
      now: () => 3_000,
    })

    const serialized = JSON.stringify(result)
    for (const legacyName of legacyNames)
      expect(serialized).not.toContain(legacyName)

    expect(result.summary).toContain('coding_agent')
    expect(result.output).toContain('coding_agent')
    expect(result.events[1]?.payload).toMatchObject({
      suggestedActions: [
        expect.objectContaining({
          toolName: 'coding_agent',
          arguments: expect.objectContaining({ agent: 'codex' }),
        }),
        expect.objectContaining({
          toolName: 'coding_agent',
          arguments: expect.objectContaining({ agent: 'cli' }),
        }),
      ],
      autoContinuation: {
        deferredSuggestedActions: [
          expect.objectContaining({
            toolName: 'coding_agent',
            arguments: expect.objectContaining({ agent: 'codex' }),
          }),
          expect.objectContaining({
            toolName: 'coding_agent',
            arguments: expect.objectContaining({ agent: 'cli' }),
          }),
        ],
      },
    })
    expect(result.events[2]?.payload).toMatchObject({
      suggestedActions: [
        expect.objectContaining({ toolName: 'coding_agent' }),
        expect.objectContaining({ toolName: 'coding_agent' }),
      ],
    })
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      suggestedActions: [
        expect.objectContaining({ toolName: 'coding_agent' }),
        expect.objectContaining({ toolName: 'coding_agent' }),
      ],
      autoContinuation: {
        deferredSuggestedActions: expect.arrayContaining([
          expect.objectContaining({ toolName: 'coding_agent' }),
        ]),
      },
    })
  })

  it('auto-continues browser suggested actions through local browser handlers', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'Inspected the active browser workflow.',
        output: 'inspection ready',
        pagePhase: 'social-feed',
        nextActionIntent: 'compose-post',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '打开发布框',
          rationale: 'The next grounded step is to open the visible composer.',
          toolName: 'browser_click_element',
          arguments: {
            text: '发帖',
            expectedPhase: 'form-entry',
            reinspectAfterAction: true,
            inspectionQuestion: 'Confirm the composer is visible after opening it.',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'Composer is visible and ready for text entry.',
        output: 'composer ready',
        pagePhase: 'form-entry',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })
    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      summary: 'Clicked browser element 发帖.',
      output: 'clicked composer',
      matchedText: '发帖',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Open the current browser composer.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Open the current browser composer and continue locally.',
      },
      surface: {
        desktopInspectScene,
        browserClickElement,
      } as any,
      now: () => 1_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserClickElement).toBeCalledWith(expect.objectContaining({
      text: '发帖',
    }))
    expect(desktopInspectScene).toBeCalledTimes(2)
    expect(result.summary).toContain('Composer is visible and ready for text entry.')
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    expect(result.events[1]?.payload).toMatchObject({
      pagePhase: 'form-entry',
      autoContinuation: expect.objectContaining({
        stoppedReason: 'step-limit-reached',
      }),
    })
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      pagePhase: 'form-entry',
      autoContinuation: {
        stoppedReason: 'step-limit-reached',
      },
    })
  })

  it('auto-continues browser scroll actions and keeps following the content flow locally', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current content page can keep moving downward.',
        output: 'scroll suggested',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先继续向下滚动当前内容页',
          rationale: '正文还没结束，先向下滚动去暴露下一段内容或新的低风险动作。',
          toolName: 'browser_scroll',
          arguments: {
            action: 'down',
            amount: 1,
            browser: 'chrome',
            autoContinueSuggestedActions: true,
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: '确认继续向下滚动后页面到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 2,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'A low-risk continuation action is visible after scrolling.',
        output: 'continue action visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '继续阅读',
          rationale: '继续打开当前内容流的下一段。',
          toolName: 'browser_click_element',
          arguments: {
            text: '继续阅读',
            targetType: 'button',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: 'Confirm the newly opened section is visible after continuing the page.',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The newly opened section is visible now.',
        output: 'new section visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })
    const browserScroll = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_scroll',
      browser: 'chrome',
      action: 'down',
      amount: 1,
      summary: 'Scrolled browser down.',
      output: 'https://example.com/doc',
    }))
    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      summary: 'Clicked browser element 继续阅读.',
      output: 'clicked continue reading',
      matchedText: '继续阅读',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Continue the visible browser content flow.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Keep following the visible content flow locally.',
      },
      surface: {
        desktopInspectScene,
        browserScroll,
        browserClickElement,
      } as any,
      now: () => 1_500,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserScroll).toBeCalledTimes(1)
    expect(browserScroll).toBeCalledWith(expect.objectContaining({
      action: 'down',
      amount: 1,
      browser: 'chrome',
    }))
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserClickElement).toBeCalledWith(expect.objectContaining({
      text: '继续阅读',
      targetType: 'button',
      browser: 'chrome',
    }))
    expect(desktopInspectScene).toBeCalledTimes(3)
    expect(result.summary).toContain('Auto-continued with browser_scroll.')
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'browser_scroll',
      result: expect.objectContaining({
        operation: 'browser_scroll',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'browser_click_element',
            }),
          ],
        }),
      }),
    })
  })

  it('auto-continues desktop suggested actions through local desktop handlers', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The confirmation dialog is focused.',
        output: 'dialog detected',
        pagePhase: 'browser-desktop-handoff',
        nextActionIntent: 'confirm-dialog',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '继续',
          rationale: 'Dismiss the confirmation dialog to continue the handoff.',
          toolName: 'desktop_click_element',
          arguments: {
            text: '继续',
            role: 'button',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: 'Confirm the confirmation dialog has been dismissed.',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The dialog is gone and the target content is visible.',
        output: 'dialog dismissed',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })
    const desktopClickElement = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      summary: 'Clicked desktop element 继续.',
      output: 'clicked continue',
      matchedText: '继续',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Dismiss the desktop confirmation dialog.',
        selectedChannel: 'desktop',
        proposedChannel: 'desktop',
      }),
      channel: 'desktop',
      command: {
        instruction: 'Dismiss the current confirmation dialog and keep going locally.',
      },
      surface: {
        desktopInspectScene,
        desktopClickElement,
      } as any,
      now: () => 2_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopClickElement).toBeCalledTimes(1)
    expect(desktopClickElement).toBeCalledWith(expect.objectContaining({
      role: 'button',
      text: '继续',
    }))
    expect(desktopInspectScene).toBeCalledTimes(2)
    expect(result.summary).toContain('The dialog is gone and the target content is visible.')
    expect(result.summary).toContain('Auto-continued with desktop_click_element.')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      pagePhase: 'content-detail',
      autoContinuation: {
        stoppedReason: 'step-limit-reached',
      },
    })
  })

  it('falls back to relisting desktop interactables when follow-up inspection has only non-executable stabilize guidance', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The privacy confirmation button is ready.',
        output: 'privacy confirm ready',
        pagePhase: 'unknown',
        nextActionIntent: 'confirm-dialog',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '点击“完成”提交当前隐私设置',
          rationale: '当前确认按钮已经稳定出现，先提交当前桌面设置。',
          toolName: 'desktop_click_element',
          arguments: {
            text: '完成',
            role: 'button',
            expectedPhase: 'unknown',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '确认当前隐私设置提交后界面到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The privacy setting change has been confirmed, but the scene still needs stabilization.',
        output: 'privacy confirmed',
        pagePhase: 'unknown',
        nextActionIntent: 'unknown',
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
        },
        suggestedActions: [{
          kind: 'stabilize-scene',
          title: '先稳定当前前台界面再继续',
          rationale: '当前场景已经被看见，但还缺少足够强的跨软件操作原语；先确认前台目标，再决定是否升级到更强执行链。',
        }],
        blockingSignals: [],
      })

    const desktopClickElement = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      summary: 'Clicked desktop element 完成.',
      output: 'clicked finish',
      matchedText: '完成',
    }))
    const desktopListInteractables = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_list_interactables',
      summary: 'Listed the current privacy controls.',
      output: 'privacy controls relisted',
      interactables: [],
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Confirm the current privacy setting and verify the follow-up scene.',
        selectedChannel: 'desktop',
        proposedChannel: 'desktop',
      }),
      channel: 'desktop',
      command: {
        instruction: 'Confirm the current privacy setting and keep going locally.',
      },
      surface: {
        desktopInspectScene,
        desktopClickElement,
        desktopListInteractables,
      } as any,
      now: () => 2_500,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopClickElement).toBeCalledTimes(1)
    expect(desktopListInteractables).toBeCalledTimes(1)
    expect(desktopListInteractables).toBeCalledWith(expect.objectContaining({
      maxItems: 12,
    }))

    const outputRecord = JSON.parse(result.output ?? '{}')
    const confirmStep = outputRecord.autoContinuation?.executedSteps?.[0]
    const relistStep = confirmStep?.result?.autoContinuation?.executedSteps?.[0]

    expect(confirmStep).toMatchObject({
      toolName: 'desktop_click_element',
      result: expect.objectContaining({
        operation: 'desktop_click_element',
        matchedText: '完成',
      }),
    })
    expect(relistStep).toMatchObject({
      toolName: 'desktop_list_interactables',
      result: expect.objectContaining({
        operation: 'desktop_list_interactables',
      }),
    })
  })

  it('keeps a selector-first desktop workflow local after relisting interactables reveals the concrete option', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The export format selector should be opened first.',
        output: 'export selector visible',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '打开导出格式选择器',
          rationale: '先展开选择器，再继续观察具体导出格式选项是否已经出现。',
          toolName: 'desktop_click_element',
          arguments: {
            text: '导出格式',
            role: 'select',
            expectedPhase: 'unknown',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '帮我把导出格式切换到 PNG 然后点击完成',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 2,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The selector is open, but the option list still needs a stabilization relist.',
        output: 'selector opened',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
        },
        suggestedActions: [{
          kind: 'stabilize-scene',
          title: '先稳定当前前台界面再继续',
          rationale: '选择器已经展开，但还需要重新列出控件确认具体选项。',
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The PNG option is visible now.',
        output: 'png option visible',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '切换到 PNG',
          rationale: '具体导出格式选项已经出现，继续选择 PNG 即可推进链路。',
          toolName: 'desktop_click_element',
          arguments: {
            text: 'PNG',
            role: 'menu-item',
            reinspectAfterAction: true,
            inspectionQuestion: '确认 PNG 导出格式已经选中',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The PNG export format is selected now.',
        output: 'png selected',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const desktopClickElement = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_click_element',
        summary: 'Clicked desktop element 导出格式.',
        output: 'opened export selector',
        matchedText: '导出格式',
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_click_element',
        summary: 'Clicked desktop element PNG.',
        output: 'selected PNG',
        matchedText: 'PNG',
      })
    const desktopListInteractables = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_list_interactables',
      summary: 'Listed the current export options.',
      output: 'export options relisted',
      interactables: [],
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Switch the export format to PNG locally even if the selector needs a relist bridge.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Open the export format selector, relist if needed, then switch it to PNG locally.',
      },
      surface: {
        desktopInspectScene,
        desktopClickElement,
        desktopListInteractables,
      } as any,
      now: () => 2_650,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopClickElement).toBeCalledTimes(2)
    expect(desktopClickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '导出格式',
      role: 'select',
    }))
    expect(desktopListInteractables).toBeCalledTimes(1)
    expect(desktopListInteractables).toBeCalledWith(expect.objectContaining({
      maxItems: 12,
      autoContinueSuggestedActions: true,
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: 'PNG',
      role: 'menu-item',
    }))
    expect(desktopInspectScene).toBeCalledTimes(4)
    expect(result.summary).toContain('Auto-continued with desktop_click_element.')
    expect(result.summary).toContain('Auto-continued with desktop_list_interactables.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'desktop_click_element',
      result: expect.objectContaining({
        operation: 'desktop_click_element',
        matchedText: '导出格式',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'desktop_list_interactables',
              result: expect.objectContaining({
                operation: 'desktop_list_interactables',
                autoContinuation: expect.objectContaining({
                  executedSteps: [
                    expect.objectContaining({
                      toolName: 'desktop_click_element',
                      result: expect.objectContaining({
                        operation: 'desktop_click_element',
                        matchedText: 'PNG',
                      }),
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps an app-search desktop workflow local when typing needs a relist bridge before the result becomes clickable', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The target app is focused and the search input is visible.',
        output: 'app search input visible',
        pagePhase: 'unknown',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先向“搜索”输入指定内容',
          rationale: '先输入搜索词，再观察结果列表是否已经稳定暴露。',
          toolName: 'desktop_type_text',
          arguments: {
            text: 'Alice',
            targetText: '搜索',
            submit: true,
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '帮我在微信搜索框里搜索 Alice',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 2,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The search field accepted the query, but the result list still needs a stabilization relist.',
        output: 'search query accepted',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
        },
        suggestedActions: [{
          kind: 'stabilize-scene',
          title: '先稳定当前前台界面再继续',
          rationale: '搜索结果列表正在更新，先重新列出控件确认目标项是否已经出现。',
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The matching Alice result is visible now.',
        output: 'alice result visible',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '打开 Alice 对话',
          rationale: '结果列表已经稳定出现，继续打开目标对话即可。',
          toolName: 'desktop_click_element',
          arguments: {
            text: 'Alice',
            role: 'list-item',
            reinspectAfterAction: true,
            inspectionQuestion: '确认 Alice 对话已经打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The Alice conversation is open now.',
        output: 'alice conversation visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const desktopTypeText = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_type_text',
      summary: 'Typed text Alice into desktop input 搜索.',
      output: 'typed Alice',
      matchedText: '搜索',
    }))
    const desktopListInteractables = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_list_interactables',
      summary: 'Listed the current search results.',
      output: 'search results relisted',
      interactables: [],
    }))
    const desktopClickElement = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      summary: 'Clicked desktop element Alice.',
      output: 'opened Alice conversation',
      matchedText: 'Alice',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Search Alice in the current app locally even if results need a relist bridge.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Search Alice in the current app locally and keep following the visible software flow.',
      },
      surface: {
        desktopInspectScene,
        desktopTypeText,
        desktopListInteractables,
        desktopClickElement,
      } as any,
      now: () => 2_720,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopTypeText).toBeCalledTimes(1)
    expect(desktopTypeText).toBeCalledWith(expect.objectContaining({
      text: 'Alice',
      targetText: '搜索',
      submit: true,
    }))
    expect(desktopListInteractables).toBeCalledTimes(1)
    expect(desktopListInteractables).toBeCalledWith(expect.objectContaining({
      maxItems: 12,
      autoContinueSuggestedActions: true,
    }))
    expect(desktopClickElement).toBeCalledTimes(1)
    expect(desktopClickElement).toBeCalledWith(expect.objectContaining({
      text: 'Alice',
      role: 'list-item',
    }))
    expect(desktopInspectScene).toBeCalledTimes(4)
    expect(result.summary).toContain('Auto-continued with desktop_type_text.')
    expect(result.summary).toContain('Auto-continued with desktop_list_interactables.')
    expect(result.summary).toContain('Auto-continued with desktop_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'desktop_type_text',
      result: expect.objectContaining({
        operation: 'desktop_type_text',
        matchedText: '搜索',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'desktop_list_interactables',
              result: expect.objectContaining({
                operation: 'desktop_list_interactables',
                autoContinuation: expect.objectContaining({
                  executedSteps: [
                    expect.objectContaining({
                      toolName: 'desktop_click_element',
                      result: expect.objectContaining({
                        operation: 'desktop_click_element',
                        matchedText: 'Alice',
                      }),
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps queued desktop handoff actions after desktop_wait and returns to browser upload flow', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The native file dialog is focused.',
        output: 'dialog detected',
        pagePhase: 'browser-desktop-handoff',
        nextActionIntent: 'confirm-dialog',
        workflowPlan: {
          continuationMode: 'handoff-to-desktop',
        },
        suggestedActions: [
          {
            title: '等待原生对话框稳定',
            rationale: '先等待前台原生窗口稳定，再继续点主动作更稳。',
            toolName: 'desktop_wait',
            arguments: {
              titleIncludes: 'Choose File',
            },
          },
          {
            title: '点击“打开”完成当前对话框动作',
            rationale: '原生对话框已经稳定，继续点击主动作把流程带回浏览器。',
            toolName: 'desktop_click_element',
            arguments: {
              text: '打开',
              role: 'button',
              expectedPhase: 'upload-flow',
              reinspectAfterAction: true,
              autoContinueSuggestedActions: true,
              inspectionQuestion: 'Confirm the browser upload flow is visible after closing the dialog.',
              inspectionMaxSuggestedActions: 3,
              maxAutoContinueSteps: 1,
            },
          },
        ],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The browser upload flow is visible again.',
        output: 'upload flow visible',
        pagePhase: 'upload-flow',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [
          {
            title: '读取当前上传页正文',
            rationale: '已经回到浏览器上传流，先低风险读取正文确认文件选择和表单状态。',
            toolName: 'browser_read_page',
            arguments: {
              format: 'text',
              browser: 'chrome',
            },
          },
        ],
        blockingSignals: [],
      })

    const desktopWait = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_wait',
      summary: 'Waited for native dialog stability.',
      output: 'Choose File',
    }))
    const desktopClickElement = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      summary: 'Clicked desktop element 打开.',
      output: 'clicked open',
      matchedText: '打开',
    }))
    const browserReadPage = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_read_page',
      browser: 'chrome',
      url: 'https://example.com/upload',
      title: 'Upload asset',
      content: 'Upload asset and finish the form.',
      output: 'Upload asset and finish the form.',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Finish the current browser file upload handoff.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Finish the current file upload flow and keep going locally.',
      },
      surface: {
        desktopInspectScene,
        desktopWait,
        desktopClickElement,
        browserReadPage,
      } as any,
      now: () => 2_500,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopWait).toBeCalledTimes(1)
    expect(desktopClickElement).toBeCalledTimes(1)
    expect(desktopClickElement).toBeCalledWith(expect.objectContaining({
      text: '打开',
      role: 'button',
    }))
    expect(browserReadPage).toBeCalledTimes(1)
    expect(browserReadPage).toBeCalledWith(expect.objectContaining({
      format: 'text',
      browser: 'chrome',
    }))
    expect(desktopInspectScene).toBeCalledTimes(2)
    expect(result.summary).toContain('Auto-continued with desktop_wait, desktop_click_element.')
    expect(result.summary).toContain('Auto-continued with browser_read_page.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    const nestedOutputRecord = JSON.parse(String(outputRecord.output ?? '{}'))
    expect(outputRecord).toMatchObject({
      autoContinuation: {
        requested: true,
        maxSteps: 1,
        stoppedReason: 'step-limit-reached',
        executedSteps: [
          expect.objectContaining({
            toolName: 'desktop_wait',
          }),
          expect.objectContaining({
            toolName: 'desktop_click_element',
            result: expect.objectContaining({
              autoContinuation: expect.objectContaining({
                executedSteps: [
                  expect.objectContaining({
                    toolName: 'browser_read_page',
                  }),
                ],
              }),
            }),
          }),
        ],
      },
    })
    expect(nestedOutputRecord).toMatchObject({
      pagePhase: 'upload-flow',
      nextActionIntent: 'fill-form',
      autoContinuation: {
        requested: true,
        maxSteps: 1,
        stoppedReason: 'step-limit-reached',
        executedSteps: [
          expect.objectContaining({
            toolName: 'browser_read_page',
          }),
        ],
      },
    })
  })

  it('keeps a desktop wait bridge local when the actionable dialog control appears only after stabilization', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The native dialog still needs a short stabilization wait.',
        output: 'dialog needs wait',
        pagePhase: 'browser-desktop-handoff',
        nextActionIntent: 'confirm-dialog',
        workflowPlan: {
          continuationMode: 'handoff-to-desktop',
        },
        suggestedActions: [{
          title: '等待原生对话框稳定',
          rationale: '先等文件对话框稳定下来，再确认主动作是否已经出现。',
          toolName: 'desktop_wait',
          arguments: {
            titleIncludes: 'Choose File',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认原生对话框稳定后现在该点什么',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The native dialog is stable and the open button is visible now.',
        output: 'dialog stabilized',
        pagePhase: 'browser-desktop-handoff',
        nextActionIntent: 'confirm-dialog',
        workflowPlan: {
          continuationMode: 'handoff-to-desktop',
        },
        suggestedActions: [{
          title: '点击“打开”完成当前对话框动作',
          rationale: '对话框已经稳定，继续点击主动作把流程带回浏览器。',
          toolName: 'desktop_click_element',
          arguments: {
            text: '打开',
            role: 'button',
            expectedPhase: 'upload-flow',
            reinspectAfterAction: true,
            inspectionQuestion: '确认浏览器上传流已经重新可见',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The browser upload flow is visible again.',
        output: 'upload flow visible',
        pagePhase: 'upload-flow',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const desktopWait = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_wait',
      summary: 'Waited for native dialog stability.',
      output: 'Choose File',
    }))
    const desktopClickElement = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      summary: 'Clicked desktop element 打开.',
      output: 'clicked open',
      matchedText: '打开',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Wait for the file dialog to stabilize and then finish the handoff locally.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Wait for the native dialog to stabilize and keep following the handoff locally.',
      },
      surface: {
        desktopInspectScene,
        desktopWait,
        desktopClickElement,
      } as any,
      now: () => 2_560,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopWait).toBeCalledTimes(1)
    expect(desktopClickElement).toBeCalledTimes(1)
    expect(desktopClickElement).toBeCalledWith(expect.objectContaining({
      text: '打开',
      role: 'button',
    }))
    expect(desktopInspectScene).toBeCalledTimes(3)
    expect(result.summary).toContain('Auto-continued with desktop_wait.')
    expect(result.summary).toContain('Auto-continued with desktop_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'desktop_wait',
      result: expect.objectContaining({
        operation: 'desktop_wait',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'desktop_click_element',
              result: expect.objectContaining({
                operation: 'desktop_click_element',
                matchedText: '打开',
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps queued browser wait actions without consuming the only continuation step before the next click', async () => {
    const desktopInspectScene = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_inspect_scene',
      summary: 'The current page is still stabilizing before the next low-risk action.',
      output: 'page stabilizing',
      pagePhase: 'content-detail',
      nextActionIntent: 'continue-browsing',
      workflowPlan: {
        continuationMode: 'ready-to-act',
      },
      suggestedActions: [
        {
          title: '等待当前页面稳定',
          rationale: '先等页面稳定，再点继续阅读更稳。',
          toolName: 'browser_wait',
          arguments: {
            browser: 'chrome',
            state: 'complete',
          },
        },
        {
          title: '继续阅读正文',
          rationale: '页面稳定后继续点低风险动作。',
          toolName: 'browser_click_element',
          arguments: {
            text: '继续阅读',
            targetType: 'button',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: '确认继续阅读后的页面状态',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        },
      ],
      blockingSignals: [],
    }))

    const browserWait = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_wait',
      summary: 'The browser page finished loading.',
      output: 'complete',
    }))
    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      browser: 'chrome',
      summary: 'Clicked browser element 继续阅读.',
      output: 'opened continued reading section',
      matchedText: '继续阅读',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Wait for the page to stabilize and then continue reading locally.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Wait for the page to stabilize and keep following the visible browser flow locally.',
      },
      surface: {
        desktopInspectScene,
        browserWait,
        browserClickElement,
      } as any,
      now: () => 2_580,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserWait).toBeCalledTimes(2)
    expect(browserWait).toHaveBeenNthCalledWith(1, expect.objectContaining({
      browser: 'chrome',
      state: 'complete',
    }))
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserClickElement).toBeCalledWith(expect.objectContaining({
      text: '继续阅读',
      targetType: 'button',
      browser: 'chrome',
    }))
    expect(result.summary).toContain('Auto-continued with browser_wait, browser_click_element.')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      autoContinuation: {
        requested: true,
        maxSteps: 1,
        executedSteps: [
          expect.objectContaining({
            toolName: 'browser_wait',
          }),
          expect.objectContaining({
            toolName: 'browser_click_element',
          }),
        ],
      },
    })
  })

  it('pauses before high-impact suggested actions that require confirmation', async () => {
    const desktopInspectScene = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_inspect_scene',
      summary: 'The publish composer is visible.',
      output: 'composer visible',
      pagePhase: 'form-entry',
      nextActionIntent: 'fill-form',
      workflowPlan: {
        continuationMode: 'ready-to-act',
      },
      suggestedActions: [{
        title: '立即发布',
        rationale: 'Publish the post from the visible composer.',
        toolName: 'browser_click_element',
        arguments: {
          text: '发布',
          expectedPhase: 'content-detail',
          reinspectAfterAction: true,
        },
      }],
      blockingSignals: [],
    }))
    const browserClickElement = vi.fn()

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Review the visible composer.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Inspect the visible browser composer.',
      },
      surface: {
        desktopInspectScene,
        browserClickElement,
      } as any,
      now: () => 3_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserClickElement).not.toBeCalled()
    expect(result.summary).toContain('Auto-continuation paused before a high-impact action requiring confirmation.')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      autoContinuation: {
        stoppedReason: 'high-impact-action-requires-confirmation',
      },
    })
  })

  it('pauses community thread submit actions that require confirmation', async () => {
    const desktopInspectScene = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_inspect_scene',
      summary: 'The community thread composer is visible.',
      output: 'thread composer visible',
      pagePhase: 'form-entry',
      nextActionIntent: 'fill-form',
      workflowPlan: {
        continuationMode: 'ready-to-act',
      },
      suggestedActions: [{
        title: '输入讨论内容并创建主题',
        rationale: 'Create the thread from the visible composer after filling the discussion body.',
        toolName: 'browser_type_text',
        arguments: {
          text: 'Ship the new build tonight',
          targetText: 'Discussion body',
          submit: true,
          inspectionQuestion: 'type "Ship the new build tonight" into the discussion body and then create thread',
        },
      }],
      blockingSignals: [],
    }))
    const browserTypeText = vi.fn()

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Review the visible community thread composer.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Inspect the visible browser thread composer.',
      },
      surface: {
        desktopInspectScene,
        browserTypeText,
      } as any,
      now: () => 3_250,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserTypeText).not.toBeCalled()
    expect(result.summary).toContain('Auto-continuation paused before a high-impact action requiring confirmation.')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      autoContinuation: {
        stoppedReason: 'high-impact-action-requires-confirmation',
      },
    })
  })

  it('allows upload bridge clicks even when the action title mentions the publish flow', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The visible compose editor can continue into the upload bridge.',
        output: 'compose editor visible',
        pagePhase: 'form-entry',
        nextActionIntent: 'upload-media',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '点击“上传图片”继续当前发布流',
          rationale: '先打开原生文件选择对话框，把当前发帖流桥接到桌面文件框。',
          toolName: 'browser_click_element',
          arguments: {
            text: '上传图片',
            expectedPhase: 'browser-desktop-handoff',
            reinspectAfterAction: true,
            inspectionQuestion: 'Confirm the native file chooser is visible after opening upload.',
            inspectionMaxSuggestedActions: 3,
            autoContinueSuggestedActions: true,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The native file chooser is now visible.',
        output: 'handoff visible',
        pagePhase: 'browser-desktop-handoff',
        nextActionIntent: 'confirm-dialog',
        workflowPlan: {
          continuationMode: 'handoff-to-desktop',
        },
        suggestedActions: [{
          title: '先向“文件名”输入指定内容',
          rationale: '文件对话框已经可交互，先输入文件名并提交。',
          toolName: 'desktop_type_text',
          arguments: {
            text: 'demo.png',
            targetText: '文件名',
            submit: true,
            expectedPhase: 'upload-flow',
            reinspectAfterAction: true,
            inspectionQuestion: 'Confirm the browser upload flow is visible after submitting the dialog.',
            inspectionMaxSuggestedActions: 3,
          },
        }],
        blockingSignals: ['desktop-dialog-visible', 'awaiting-selection'],
      })
    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      summary: 'Clicked browser element 上传图片.',
      output: 'opened upload chooser',
      matchedText: '上传图片',
    }))
    const desktopTypeText = vi.fn()

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Continue the visible compose flow into the upload bridge.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Continue the current compose flow and bridge into the native upload dialog.',
      },
      surface: {
        desktopInspectScene,
        browserClickElement,
        desktopTypeText,
      } as any,
      now: () => 3_500,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserClickElement).toBeCalledWith(expect.objectContaining({
      text: '上传图片',
      expectedPhase: 'browser-desktop-handoff',
    }))
    expect(desktopTypeText).not.toBeCalled()
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation).toEqual(expect.objectContaining({
      executedSteps: expect.arrayContaining([
        expect.objectContaining({
          toolName: 'browser_click_element',
          result: expect.objectContaining({
            autoContinuation: expect.objectContaining({
              requested: true,
              maxSteps: 1,
              stoppedReason: 'high-impact-action-requires-confirmation',
            }),
          }),
        }),
      ]),
    }))
  })

  it('allows explicit native file-name entry to continue the upload bridge locally', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The native file chooser is visible and the file-name input is focused.',
        output: 'file chooser visible',
        pagePhase: 'browser-desktop-handoff',
        nextActionIntent: 'confirm-dialog',
        workflowPlan: {
          continuationMode: 'handoff-to-desktop',
        },
        suggestedActions: [{
          title: '先向“文件名”输入指定内容',
          rationale: '文件对话框已经可交互，先输入文件名并提交。',
          toolName: 'desktop_type_text',
          arguments: {
            text: 'demo.png',
            targetText: '文件名',
            submit: true,
            expectedPhase: 'upload-flow',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '帮我在文件名输入框里输入 "demo.png" 然后打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: ['desktop-dialog-visible', 'awaiting-selection'],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The browser upload flow is visible after selecting the file.',
        output: 'upload flow visible',
        pagePhase: 'upload-flow',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const desktopTypeText = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_type_text',
      summary: 'Typed text demo.png into desktop input 文件名 and submitted it.',
      output: 'selected demo.png',
      matchedText: '文件名',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Select the requested file from the native chooser and return to the browser upload flow.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Type demo.png into the file-name input and continue the upload bridge locally.',
      },
      surface: {
        desktopInspectScene,
        desktopTypeText,
      } as any,
      now: () => 3_560,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopTypeText).toBeCalledTimes(1)
    expect(desktopTypeText).toBeCalledWith(expect.objectContaining({
      text: 'demo.png',
      targetText: '文件名',
      submit: true,
      expectedPhase: 'upload-flow',
    }))
    expect(desktopInspectScene).toBeCalledTimes(2)
    expect(result.summary).toContain('Auto-continued with desktop_type_text.')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      pagePhase: 'upload-flow',
      autoContinuation: {
        executedSteps: [
          expect.objectContaining({
            toolName: 'desktop_type_text',
            result: expect.objectContaining({
              operation: 'desktop_type_text',
              matchedText: '文件名',
            }),
          }),
        ],
      },
    })
  })

  it('pauses non-safe follow-up actions while waiting for host input', async () => {
    const desktopInspectScene = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_inspect_scene',
      summary: 'The app is waiting for the next host-provided choice.',
      output: 'awaiting host input',
      pagePhase: 'social-feed',
      nextActionIntent: 'continue-browsing',
      workflowPlan: {
        continuationMode: 'await-host-input',
      },
      suggestedActions: [{
        title: '继续打开详情',
        rationale: 'Open the highlighted item after the host confirms.',
        toolName: 'desktop_click_element',
        arguments: {
          text: '继续',
          role: 'button',
          expectedPhase: 'content-detail',
          reinspectAfterAction: true,
        },
      }],
      blockingSignals: ['awaiting-input'],
    }))
    const desktopClickElement = vi.fn()

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Wait for the user before advancing the software flow.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Inspect the software flow and pause if host input is still required.',
      },
      surface: {
        desktopInspectScene,
        desktopClickElement,
      } as any,
      now: () => 4_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopClickElement).not.toBeCalled()
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      autoContinuation: {
        stoppedReason: 'await-host-input',
      },
    })
  })

  it('defers a visual Codex suggestion back to the model instead of auto-dispatching it', async () => {
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
    }))
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current screen is a coding investigation scene.',
        output: 'coding scene visible',
        pagePhase: 'unknown',
        nextActionIntent: 'unknown',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '转给 Codex 调查当前代码/报错',
          rationale: '直接读取当前编码上下文并规划修复。',
          toolName: 'coding_agent',
          arguments: {
            agent: 'codex',
            prompt: 'Investigate visible coding/error scene around Cursor runtime.ts. Visible summary: TypeScript error in runtime.ts.',
            kind: 'codebase-investigation',
            goal: 'Investigate visible coding scene',
            effect: 'observe',
            permissionMode: 'implicit',
            autoContinueSuggestedActions: true,
            maxAutoContinueSteps: 1,
            reinspectAfterAction: true,
            inspectionQuestion: 'Codex 调查当前代码/报错后现在界面到了哪一步',
            inspectionMaxSuggestedActions: 3,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The fix plan page is now visible after Codex investigation.',
        output: 'codex investigation follow-up visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const abortController = new AbortController()
    const onExecutionEvent = vi.fn()
    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Investigate the visible coding scene.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Inspect the visible coding scene and continue locally.',
        runtimeContext: createRuntimeContext(),
      },
      surface: {
        desktopInspectScene,
        executeTaskThread,
      } as any,
      abortSignal: abortController.signal,
      onExecutionEvent,
      now: () => 5_000,
    } as any)

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(executeTaskThread).not.toHaveBeenCalled()
    expect(desktopInspectScene).toHaveBeenCalledTimes(1)
    expect(result.summary).not.toContain('The fix plan page is now visible after Codex investigation.')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      pagePhase: 'unknown',
      autoContinuation: {
        stoppedReason: 'executor-continuation-deferred-to-model',
        deferredSuggestedActions: [{
          toolName: 'coding_agent',
          arguments: expect.objectContaining({
            agent: 'codex',
          }),
        }],
      },
    })
  })

  it('normalizes every legacy executor suggestion before exposing deferred, step, result, or output payloads', async () => {
    const executeTaskThread = vi.fn()
    const desktopInspectScene = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_inspect_scene',
      summary: 'The visible scene suggests several coding-agent continuations.',
      output: 'coding-agent continuations visible',
      pagePhase: 'unknown',
      nextActionIntent: 'unknown',
      workflowPlan: {
        continuationMode: 'ready-to-act',
      },
      suggestedActions: [
        {
          title: 'Use Codex',
          toolName: 'executor_run_codex',
          arguments: {
            prompt: 'Inspect the repository.',
          },
        },
        {
          title: 'Use Claude Code',
          toolName: 'executor_run_claude_code',
          arguments: {
            prompt: 'Review the current implementation.',
          },
        },
        {
          title: 'Use CLI',
          toolName: 'executor_run_cli',
          arguments: {
            command: 'pnpm test',
          },
        },
        {
          title: 'Use coding-agent facade',
          toolName: 'executor_run_coding_agent',
          arguments: {
            agent: 'codex',
            prompt: 'Continue through the facade.',
          },
        },
      ],
      blockingSignals: [],
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Inspect the visible coding scene.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Inspect the visible coding scene.',
        runtimeContext: createRuntimeContext(),
      },
      surface: {
        desktopInspectScene,
        executeTaskThread,
      } as any,
      now: () => 4_500,
    })

    const stepEvent = result.events.find(event => event.kind === 'step')!
    const resultEvent = result.events.find(event => event.kind === 'result')!
    const output = JSON.parse(result.output ?? '{}')
    const expectedAgents = ['codex', 'claude-code', 'cli', 'codex']
    const assertNormalizedActions = (actions: unknown) => {
      expect(actions).toHaveLength(4)
      expect((actions as any[]).map(action => action.toolName))
        .toEqual(['coding_agent', 'coding_agent', 'coding_agent', 'coding_agent'])
      expect((actions as any[]).map(action => action.arguments?.agent))
        .toEqual(expectedAgents)
      expect(JSON.stringify(actions)).not.toContain('executor_run_')
    }

    expect(result.ok).toBe(true)
    expect(executeTaskThread).not.toHaveBeenCalled()
    assertNormalizedActions((stepEvent.payload as any).suggestedActions)
    assertNormalizedActions((resultEvent.payload as any).suggestedActions)
    assertNormalizedActions(output.suggestedActions)
    assertNormalizedActions(output.autoContinuation?.deferredSuggestedActions)
    expect(JSON.stringify(stepEvent.payload)).not.toContain('executor_run_')
    expect(JSON.stringify(resultEvent.payload)).not.toContain('executor_run_')
    expect(result.output).not.toContain('executor_run_')
  })

  it('defers a visual Claude Code suggestion back to the model instead of auto-dispatching it', async () => {
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
    }))
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current screen is a coding investigation scene.',
        output: 'coding scene visible',
        pagePhase: 'unknown',
        nextActionIntent: 'unknown',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '转给 Claude Code 调查当前代码/报错',
          rationale: '直接读取当前编码上下文并规划修复。',
          toolName: 'coding_agent',
          arguments: {
            agent: 'claude-code',
            prompt: 'Investigate visible coding/error scene around Cursor runtime.ts. Visible summary: TypeScript error in runtime.ts.',
            kind: 'codebase-investigation',
            goal: 'Investigate visible coding scene',
            effect: 'observe',
            permissionMode: 'implicit',
            autoContinueSuggestedActions: true,
            maxAutoContinueSteps: 1,
            reinspectAfterAction: true,
            inspectionQuestion: 'Claude Code 调查当前代码/报错后现在界面到了哪一步',
            inspectionMaxSuggestedActions: 3,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The fix plan page is now visible after Claude Code investigation.',
        output: 'claude investigation follow-up visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Investigate the visible coding scene.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Inspect the visible coding scene and continue locally.',
        runtimeContext: createRuntimeContext(),
      },
      surface: {
        desktopInspectScene,
        executeTaskThread,
      } as any,
      now: () => 6_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(executeTaskThread).not.toHaveBeenCalled()
    expect(desktopInspectScene).toHaveBeenCalledTimes(1)
    expect(result.summary).not.toContain('The fix plan page is now visible after Claude Code investigation.')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      pagePhase: 'unknown',
      autoContinuation: {
        stoppedReason: 'executor-continuation-deferred-to-model',
        deferredSuggestedActions: [{
          toolName: 'coding_agent',
          arguments: expect.objectContaining({
            agent: 'claude-code',
          }),
        }],
      },
    })
  })

  it('defers a visual CLI suggestion back to the model instead of auto-dispatching it', async () => {
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
    }))
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current screen is a terminal investigation scene.',
        output: 'terminal scene visible',
        pagePhase: 'unknown',
        nextActionIntent: 'unknown',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先用 CLI 调查可见终端命令“pnpm test”',
          rationale: '当前终端里已经能直接看见失败命令。',
          toolName: 'coding_agent',
          arguments: {
            agent: 'cli',
            command: 'pnpm',
            args: ['test'],
            goal: 'Investigate visible terminal scene',
            effect: 'observe',
            permissionMode: 'implicit',
            autoContinueSuggestedActions: true,
            maxAutoContinueSteps: 1,
            reinspectAfterAction: true,
            inspectionQuestion: 'CLI 调查可见终端命令后现在界面到了哪一步',
            inspectionMaxSuggestedActions: 3,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The terminal follow-up state is now visible after CLI investigation.',
        output: 'cli investigation follow-up visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Investigate the visible terminal scene.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Inspect the visible terminal scene and continue locally.',
        runtimeContext: createRuntimeContext(),
      },
      surface: {
        desktopInspectScene,
        executeTaskThread,
      } as any,
      now: () => 7_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(executeTaskThread).not.toHaveBeenCalled()
    expect(desktopInspectScene).toHaveBeenCalledTimes(1)
    expect(result.summary).not.toContain('The terminal follow-up state is now visible after CLI investigation.')
    expect(JSON.parse(result.output ?? '{}')).toMatchObject({
      pagePhase: 'unknown',
      autoContinuation: {
        stoppedReason: 'executor-continuation-deferred-to-model',
        deferredSuggestedActions: [{
          toolName: 'coding_agent',
          arguments: expect.objectContaining({
            agent: 'cli',
          }),
        }],
      },
    })
  })

  it('auto-continues low-risk content-detail actions before rereading the next page state', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current browser page is a readable content detail scene.',
        output: 'content detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '继续阅读',
          rationale: '当前内容页已经出现明确的低风险延续动作，先继续推进当前网页流程更接近用户目标。',
          toolName: 'browser_click_element',
          arguments: {
            text: '继续阅读',
            targetType: 'button',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '继续阅读后现在页面到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The next content page is visible after continuing the current detail view.',
        output: 'next content detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '读取当前页面正文',
          rationale: '当前已经翻到下一段内容，先读正文确认是否还要继续。',
          toolName: 'browser_read_page',
          arguments: {
            format: 'text',
          },
        }],
        blockingSignals: [],
      })
    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      summary: 'Clicked browser element 继续阅读.',
      output: 'continued reading',
      matchedText: '继续阅读',
    }))
    const browserReadPage = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_read_page',
      browser: 'chrome',
      url: 'https://example.com/doc?page=2',
      title: 'Alicization 官方文档（下一页）',
      content: '这里是下一段正文内容。',
      output: '这里是下一段正文内容。',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Continue the current content detail page.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Continue the current content page and keep going locally.',
      },
      surface: {
        desktopInspectScene,
        browserClickElement,
        browserReadPage,
      } as any,
      now: () => 8_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserClickElement).toBeCalledWith(expect.objectContaining({
      text: '继续阅读',
      expectedPhase: 'content-detail',
    }))
    expect(browserReadPage).toBeCalledTimes(1)
    expect(browserReadPage).toBeCalledWith(expect.objectContaining({
      format: 'text',
    }))
    expect(desktopInspectScene).toBeCalledTimes(2)
    expect(desktopInspectScene).toHaveBeenNthCalledWith(2, expect.objectContaining({
      question: '继续阅读后现在页面到了哪一步',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    expect(result.summary).toContain('Auto-continued with browser_read_page.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord).toMatchObject({
      autoContinuation: {
        stoppedReason: 'step-limit-reached',
        executedSteps: [
          expect.objectContaining({
            toolName: 'browser_click_element',
            result: expect.objectContaining({
              autoContinuation: expect.objectContaining({
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
      },
    })
    const firstContinuationStep = outputRecord.autoContinuation.executedSteps[0]
    expect(firstContinuationStep).toEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      result: expect.objectContaining({
        operation: 'browser_click_element',
        matchedText: '继续阅读',
      }),
    }))
  })

  it('auto-continues through two low-risk content-detail continuation hops before rereading the final page state', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current browser page is a readable content detail scene.',
        output: 'content detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '继续阅读',
          rationale: '当前内容页已经出现明确的低风险延续动作，先继续推进当前网页流程更接近用户目标。',
          toolName: 'browser_click_element',
          arguments: {
            text: '继续阅读',
            targetType: 'button',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '继续阅读后现在页面到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 2,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The next content page is still a detail scene with another safe continue action.',
        output: 'next content detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '下一页',
          rationale: '当前还在同一类内容详情流里，继续走低风险下一页动作能更接近长链网页目标。',
          toolName: 'browser_click_element',
          arguments: {
            text: '下一页',
            targetType: 'link',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '继续翻到下一页后现在页面到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The later content page is visible after the second continuation.',
        output: 'later content detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '读取当前页面正文',
          rationale: '现在已经推进到更后面的内容页，先读正文确认当前内容是否满足目标。',
          toolName: 'browser_read_page',
          arguments: {
            format: 'text',
          },
        }],
        blockingSignals: [],
      })

    let clickCount = 0
    const browserClickElement = vi.fn(async (input: { text?: string }) => {
      clickCount += 1
      return {
        channel: 'browser',
        status: 'completed',
        operation: 'browser_click_element',
        summary: `Clicked browser element ${input.text ?? (clickCount === 1 ? '继续阅读' : '下一页')}.`,
        output: clickCount === 1 ? 'continued reading' : 'opened next page',
        matchedText: input.text ?? (clickCount === 1 ? '继续阅读' : '下一页'),
      }
    })
    const browserReadPage = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_read_page',
      browser: 'chrome',
      url: 'https://example.com/doc?page=3',
      title: 'Alicization 官方文档（第三页）',
      content: '这里是第三页正文内容。',
      output: '这里是第三页正文内容。',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Continue through the current content detail pages.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Continue the current content page through the next safe steps and keep going locally.',
      },
      surface: {
        desktopInspectScene,
        browserClickElement,
        browserReadPage,
      } as any,
      now: () => 8_500,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserClickElement).toBeCalledTimes(2)
    expect(browserClickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '继续阅读',
      expectedPhase: 'content-detail',
    }))
    expect(browserClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: '下一页',
      expectedPhase: 'content-detail',
    }))
    expect(browserReadPage).toBeCalledTimes(1)
    expect(desktopInspectScene).toBeCalledTimes(3)
    expect(desktopInspectScene).toHaveBeenNthCalledWith(2, expect.objectContaining({
      question: '继续阅读后现在页面到了哪一步',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(desktopInspectScene).toHaveBeenNthCalledWith(3, expect.objectContaining({
      question: '继续翻到下一页后现在页面到了哪一步',
      forceRefresh: true,
      maxSuggestedActions: 3,
    }))
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    expect(result.summary).toContain('Auto-continued with browser_read_page.')

    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord).toMatchObject({
      autoContinuation: {
        stoppedReason: 'step-limit-reached',
        executedSteps: [
          expect.objectContaining({
            toolName: 'browser_click_element',
            result: expect.objectContaining({
              autoContinuation: expect.objectContaining({
                executedSteps: [
                  expect.objectContaining({
                    toolName: 'browser_click_element',
                    result: expect.objectContaining({
                      autoContinuation: expect.objectContaining({
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
            }),
          }),
        ],
      },
    })
    const firstContinuationStep = outputRecord.autoContinuation.executedSteps[0]
    const secondContinuationStep = firstContinuationStep.result.autoContinuation.executedSteps[0]
    expect(firstContinuationStep).toEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      result: expect.objectContaining({
        operation: 'browser_click_element',
        matchedText: '继续阅读',
      }),
    }))
    expect(secondContinuationStep).toEqual(expect.objectContaining({
      toolName: 'browser_click_element',
      result: expect.objectContaining({
        operation: 'browser_click_element',
        matchedText: '下一页',
      }),
    }))
  })

  it('falls back to browser page reading when follow-up inspection only yields non-executable stabilization guidance', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current browser page is a readable content detail scene.',
        output: 'content detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '继续阅读',
          rationale: '当前内容页已经出现明确的低风险延续动作，先继续推进当前网页流程更接近用户目标。',
          toolName: 'browser_click_element',
          arguments: {
            text: '继续阅读',
            targetType: 'button',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '继续阅读后现在页面到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The next browser page is visible but still needs a low-risk reread before deciding the next action.',
        output: 'next content detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
        },
        suggestedActions: [{
          kind: 'stabilize-scene',
          title: '先稳定当前前台界面再继续',
          rationale: '当前页面已经切换，但暂时还没有稳定暴露出更明确的下一步动作。',
        }],
        blockingSignals: [],
      })

    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      summary: 'Clicked browser element 继续阅读.',
      output: 'continued reading',
      matchedText: '继续阅读',
    }))
    const browserReadPage = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_read_page',
      browser: 'chrome',
      url: 'https://example.com/doc?page=2',
      title: 'Alicization 官方文档（下一页）',
      content: '这里是下一页正文内容。',
      output: '这里是下一页正文内容。',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Continue the current content detail page and reread the next page when the scene is still stabilizing.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Continue the current content page and keep going locally.',
      },
      surface: {
        desktopInspectScene,
        browserClickElement,
        browserReadPage,
      } as any,
      now: () => 8_750,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserReadPage).toBeCalledTimes(1)
    expect(browserReadPage).toBeCalledWith(expect.objectContaining({
      format: 'text',
    }))
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord).toMatchObject({
      autoContinuation: {
        stoppedReason: 'step-limit-reached',
        executedSteps: [
          expect.objectContaining({
            toolName: 'browser_click_element',
            result: expect.objectContaining({
              autoContinuation: expect.objectContaining({
                executedSteps: [
                  expect.objectContaining({
                    toolName: 'browser_read_page',
                    result: expect.objectContaining({
                      operation: 'browser_read_page',
                    }),
                  }),
                ],
              }),
            }),
          }),
        ],
      },
    })
  })

  it('auto-continues browser search entry actions and keeps following the search flow locally', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The browser is ready for a fresh web search.',
        output: 'search entry ready',
        pagePhase: 'unknown',
        nextActionIntent: 'search-web',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先直接搜索当前目标',
          rationale: '先进入搜索结果页，再沿着当前网页链路继续跟进最相关结果。',
          toolName: 'browser_search_web',
          arguments: {
            query: 'Alicization 本地执行闭环',
            browser: 'chrome',
            searchEngine: 'baidu',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认搜索结果页已经打开，并判断现在最稳妥的下一步是什么',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The search results page is visible and the most relevant result can be opened safely.',
        output: 'search results visible',
        pagePhase: 'search-results',
        nextActionIntent: 'open-result',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '打开最相关结果',
          rationale: '当前结果已经稳定暴露出一个低风险入口，继续点进结果页更接近用户目标。',
          toolName: 'browser_click_element',
          arguments: {
            text: 'Alicization 本地执行闭环',
            targetType: 'link',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: '确认结果详情页已经打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The selected result page is open now.',
        output: 'result detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const browserSearchWeb = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_search_web',
      browser: 'chrome',
      query: 'Alicization 本地执行闭环',
      searchEngine: 'baidu',
      url: 'https://www.baidu.com/s?wd=Alicization%20%E6%9C%AC%E5%9C%B0%E6%89%A7%E8%A1%8C%E9%97%AD%E7%8E%AF',
      summary: 'Searched the web for Alicization 本地执行闭环.',
      output: 'https://www.baidu.com/s?wd=Alicization%20%E6%9C%AC%E5%9C%B0%E6%89%A7%E8%A1%8C%E9%97%AD%E7%8E%AF',
    }))
    const browserWait = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_wait',
      summary: 'The browser page finished loading.',
      output: 'complete',
    }))
    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      summary: 'Clicked browser element Alicization 本地执行闭环.',
      output: 'clicked result',
      matchedText: 'Alicization 本地执行闭环',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Search the web locally and keep following the most relevant result.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Search the web locally and keep following the visible result flow.',
      },
      surface: {
        desktopInspectScene,
        browserSearchWeb,
        browserWait,
        browserClickElement,
      } as any,
      now: () => 9_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserSearchWeb).toBeCalledTimes(1)
    expect(browserSearchWeb).toBeCalledWith(expect.objectContaining({
      query: 'Alicization 本地执行闭环',
      browser: 'chrome',
      searchEngine: 'baidu',
    }))
    expect(browserWait).toBeCalledTimes(2)
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserClickElement).toBeCalledWith(expect.objectContaining({
      text: 'Alicization 本地执行闭环',
      targetType: 'link',
      browser: 'chrome',
    }))
    expect(desktopInspectScene).toBeCalledTimes(3)
    expect(result.summary).toContain('Auto-continued with browser_search_web.')
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'browser_search_web',
      result: expect.objectContaining({
        operation: 'browser_search_web',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'browser_click_element',
            }),
          ],
        }),
      }),
    })
  })

  it('keeps paginating search results locally until a stable result becomes clickable', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current search-results page does not expose a stable result yet.',
        output: 'search results need pagination',
        pagePhase: 'search-results',
        nextActionIntent: 'open-search-result',
        workflowPlan: {
          continuationMode: 'ready-to-act',
          targetPhase: 'search-results',
        },
        suggestedActions: [{
          title: '继续打开“下一页”',
          rationale: '当前页还没有稳定结果，先翻页继续沿着搜索链路往前走。',
          toolName: 'browser_click_element',
          arguments: {
            text: '下一页',
            targetType: 'link',
            browser: 'chrome',
            expectedPhase: 'search-results',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '帮我从百度结果里继续找',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The next search-results page is visible and now exposes a stable result.',
        output: 'next search results visible',
        pagePhase: 'search-results',
        nextActionIntent: 'open-search-result',
        workflowPlan: {
          continuationMode: 'ready-to-act',
          targetPhase: 'content-detail',
        },
        suggestedActions: [{
          title: '打开最相关结果',
          rationale: '翻页后的结果已经稳定暴露出目标入口，继续点进详情页最接近用户目标。',
          toolName: 'browser_click_element',
          arguments: {
            text: 'Alicization 官方文档',
            targetType: 'link',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: '确认结果详情页已经打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The selected result page is open now.',
        output: 'search result detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    let clickCount = 0
    const browserClickElement = vi.fn(async (input: any) => {
      clickCount += 1
      return {
        channel: 'browser',
        status: 'completed',
        operation: 'browser_click_element',
        browser: 'chrome',
        summary: `Clicked browser element ${input.text}.`,
        output: clickCount === 1 ? 'opened next search results page' : 'opened result detail',
        matchedText: input.text,
      }
    })
    const browserWait = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_wait',
      summary: 'The browser page finished loading.',
      output: 'complete',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Keep searching across result pages until a stable result is visible locally.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Keep moving through the visible search result pages locally until a stable result opens.',
      },
      surface: {
        desktopInspectScene,
        browserClickElement,
        browserWait,
      } as any,
      now: () => 9_100,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserClickElement).toBeCalledTimes(2)
    expect(browserClickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '下一页',
      targetType: 'link',
      browser: 'chrome',
      expectedPhase: 'search-results',
    }))
    expect(browserClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: 'Alicization 官方文档',
      targetType: 'link',
      browser: 'chrome',
      expectedPhase: 'content-detail',
    }))
    expect(browserWait).toBeCalledTimes(2)
    expect(desktopInspectScene).toBeCalledTimes(3)
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'browser_click_element',
      result: expect.objectContaining({
        operation: 'browser_click_element',
        matchedText: '下一页',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'browser_click_element',
              result: expect.objectContaining({
                operation: 'browser_click_element',
                matchedText: 'Alicization 官方文档',
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps following a button-style more-results control until a stable result becomes clickable', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current search-results page exposes a button-style more-results control.',
        output: 'search results need more results button',
        pagePhase: 'search-results',
        nextActionIntent: 'open-search-result',
        workflowPlan: {
          continuationMode: 'ready-to-act',
          targetPhase: 'search-results',
        },
        suggestedActions: [{
          title: '继续打开“更多结果”',
          rationale: '当前页还没有稳定结果，但更多结果按钮已经出现，先继续扩展结果范围。',
          toolName: 'browser_click_element',
          arguments: {
            text: '更多结果',
            targetType: 'button',
            browser: 'chrome',
            expectedPhase: 'search-results',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '帮我继续找这个搜索结果',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The next search-results block is visible and now exposes a stable result.',
        output: 'next search results visible',
        pagePhase: 'search-results',
        nextActionIntent: 'open-search-result',
        workflowPlan: {
          continuationMode: 'ready-to-act',
          targetPhase: 'content-detail',
        },
        suggestedActions: [{
          title: '打开最相关结果',
          rationale: '新的结果块已经稳定暴露出目标入口，继续点进详情页最接近用户目标。',
          toolName: 'browser_click_element',
          arguments: {
            text: 'Alicization 官方文档',
            targetType: 'link',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: '确认结果详情页已经打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The selected result page is open now.',
        output: 'search result detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    let clickCount = 0
    const browserClickElement = vi.fn(async (input: any) => {
      clickCount += 1
      return {
        channel: 'browser',
        status: 'completed',
        operation: 'browser_click_element',
        browser: 'chrome',
        summary: `Clicked browser element ${input.text}.`,
        output: clickCount === 1 ? 'opened more results block' : 'opened result detail',
        matchedText: input.text,
      }
    })
    const browserWait = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_wait',
      summary: 'The browser page finished loading.',
      output: 'complete',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Keep following the button-style more-results control until a stable result opens.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Keep following the visible more-results control locally until a stable result opens.',
      },
      surface: {
        desktopInspectScene,
        browserClickElement,
        browserWait,
      } as any,
      now: () => 9_120,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserClickElement).toBeCalledTimes(2)
    expect(browserClickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '更多结果',
      targetType: 'button',
      browser: 'chrome',
      expectedPhase: 'search-results',
    }))
    expect(browserClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: 'Alicization 官方文档',
      targetType: 'link',
      browser: 'chrome',
      expectedPhase: 'content-detail',
    }))
    expect(browserWait).toBeCalledTimes(2)
    expect(desktopInspectScene).toBeCalledTimes(3)
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'browser_click_element',
      result: expect.objectContaining({
        operation: 'browser_click_element',
        matchedText: '更多结果',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'browser_click_element',
              result: expect.objectContaining({
                operation: 'browser_click_element',
                matchedText: 'Alicization 官方文档',
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps scrolling search results locally until a stable result becomes clickable', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current search-results page can still scroll to load more results locally.',
        output: 'search results need scrolling',
        pagePhase: 'search-results',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
          targetPhase: 'search-results',
        },
        suggestedActions: [{
          title: '先继续向下滚动搜索结果',
          rationale: '当前页还没有稳定结果，也没有可点击的翻页入口，先继续向下滚动加载更多结果最稳。',
          toolName: 'browser_scroll',
          arguments: {
            action: 'down',
            amount: 1,
            browser: 'chrome',
            expectedPhase: 'search-results',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '帮我继续找这个搜索结果',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The scrolled search-results page now exposes a stable result.',
        output: 'scrolled search results visible',
        pagePhase: 'search-results',
        nextActionIntent: 'open-search-result',
        workflowPlan: {
          continuationMode: 'ready-to-act',
          targetPhase: 'content-detail',
        },
        suggestedActions: [{
          title: '打开最相关结果',
          rationale: '滚动后的结果已经稳定暴露出目标入口，继续点进详情页最接近用户目标。',
          toolName: 'browser_click_element',
          arguments: {
            text: 'Alicization 官方文档',
            targetType: 'link',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: '确认结果详情页已经打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The selected result page is open now.',
        output: 'search result detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const browserScroll = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_scroll',
      browser: 'chrome',
      summary: 'Scrolled the visible search results down by one page.',
      output: 'scrolled search results',
    }))
    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      browser: 'chrome',
      summary: 'Clicked browser element Alicization 官方文档.',
      output: 'opened result detail',
      matchedText: 'Alicization 官方文档',
    }))
    const browserWait = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_wait',
      summary: 'The browser page finished loading.',
      output: 'complete',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Keep scrolling search results locally until a stable result opens.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Keep scrolling the visible search results locally until a stable result opens.',
      },
      surface: {
        desktopInspectScene,
        browserScroll,
        browserClickElement,
        browserWait,
      } as any,
      now: () => 9_140,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserScroll).toBeCalledTimes(1)
    expect(browserScroll).toBeCalledWith(expect.objectContaining({
      action: 'down',
      amount: 1,
      browser: 'chrome',
      expectedPhase: 'search-results',
    }))
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserClickElement).toBeCalledWith(expect.objectContaining({
      text: 'Alicization 官方文档',
      targetType: 'link',
      browser: 'chrome',
      expectedPhase: 'content-detail',
    }))
    expect(browserWait).toBeCalledTimes(1)
    expect(desktopInspectScene).toBeCalledTimes(3)
    expect(result.summary).toContain('Auto-continued with browser_scroll.')
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'browser_scroll',
      result: expect.objectContaining({
        operation: 'browser_scroll',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'browser_click_element',
              result: expect.objectContaining({
                operation: 'browser_click_element',
                matchedText: 'Alicization 官方文档',
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps search-result query refinement local before opening the refined result', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The visible search-results page should refine the query through its own search box first.',
        output: 'search refinement suggested',
        pagePhase: 'search-results',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
          targetPhase: 'content-detail',
        },
        suggestedActions: [{
          title: '先向“搜索”输入指定内容',
          rationale: '当前已经在搜索结果页里，先用结果页自己的搜索框改写搜索词，再沿着新的结果链路继续进入目标内容。',
          toolName: 'browser_type_text',
          arguments: {
            text: 'Alicization 官方文档',
            targetText: '搜索',
            browser: 'chrome',
            submit: true,
            expectedPhase: 'search-results',
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '帮我在搜索框里搜索 Alicization 官方文档',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The refined search-results page now exposes the desired stable result.',
        output: 'refined search results visible',
        pagePhase: 'search-results',
        nextActionIntent: 'open-search-result',
        workflowPlan: {
          continuationMode: 'ready-to-act',
          targetPhase: 'content-detail',
        },
        suggestedActions: [{
          title: '打开最相关结果',
          rationale: '改写搜索词后的结果已经稳定暴露出目标入口，继续点进详情页最接近用户目标。',
          toolName: 'browser_click_element',
          arguments: {
            text: 'Alicization 官方文档',
            targetType: 'link',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: '确认结果详情页已经打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The refined result detail page is open now.',
        output: 'refined result detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const browserTypeText = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_type_text',
      browser: 'chrome',
      summary: 'Typed Alicization 官方文档 into the visible search box.',
      output: 'typed refined search query',
      matchedText: '搜索',
    }))
    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      browser: 'chrome',
      summary: 'Clicked browser element Alicization 官方文档.',
      output: 'opened refined search result',
      matchedText: 'Alicization 官方文档',
    }))
    const browserWait = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_wait',
      summary: 'The browser page finished loading.',
      output: 'complete',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Refine the visible search-result query locally and open the refined result.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Refine the visible search-result query locally and keep following the page until the refined result opens.',
      },
      surface: {
        desktopInspectScene,
        browserTypeText,
        browserClickElement,
        browserWait,
      } as any,
      now: () => 9_175,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserTypeText).toBeCalledTimes(1)
    expect(browserTypeText).toBeCalledWith(expect.objectContaining({
      text: 'Alicization 官方文档',
      targetText: '搜索',
      browser: 'chrome',
      submit: true,
      expectedPhase: 'search-results',
      autoContinueSuggestedActions: true,
    }))
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserClickElement).toBeCalledWith(expect.objectContaining({
      text: 'Alicization 官方文档',
      targetType: 'link',
      browser: 'chrome',
      expectedPhase: 'content-detail',
    }))
    expect(browserWait).toBeCalledTimes(2)
    expect(desktopInspectScene).toBeCalledTimes(3)
    expect(result.summary).toContain('Auto-continued with browser_type_text.')
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'browser_type_text',
      result: expect.objectContaining({
        operation: 'browser_type_text',
        matchedText: '搜索',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'browser_click_element',
              result: expect.objectContaining({
                operation: 'browser_click_element',
                matchedText: 'Alicization 官方文档',
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps a browser site-search workflow local across page open search input and result-selection steps', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The docs page should be opened before using the site search.',
        output: 'docs page open suggested',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先打开文档页',
          rationale: '先把目标网页打开，再根据站内搜索框和结果页继续长链网页策略。',
          toolName: 'browser_open_url',
          arguments: {
            url: 'https://example.com/docs',
            browser: 'chrome',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '帮我打开 https://example.com/docs 然后在站内搜索框里搜索 Alicization 闭环',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The docs page is open and the site search input is visible.',
        output: 'docs page with site search visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
          targetPhase: 'content-detail',
        },
        suggestedActions: [{
          title: '先向“站内搜索”输入指定内容',
          rationale: '站内搜索框已经稳定出现，先输入搜索词，再根据结果页继续进入目标内容。',
          toolName: 'browser_type_text',
          arguments: {
            text: 'Alicization 闭环',
            targetText: '站内搜索',
            browser: 'chrome',
            submit: true,
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '帮我打开 https://example.com/docs 然后在站内搜索框里搜索 Alicization 闭环',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The site search results are visible and the target result can be opened safely.',
        output: 'docs site search results visible',
        pagePhase: 'search-results',
        nextActionIntent: 'open-result',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '打开最相关文档结果',
          rationale: '当前结果已经稳定暴露出目标入口，继续点进详情页最接近用户目标。',
          toolName: 'browser_click_element',
          arguments: {
            text: 'Alicization 闭环',
            targetType: 'link',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: '确认文档详情页已经打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The selected documentation result is open now.',
        output: 'docs result detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const browserOpenUrl = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_open_url',
      browser: 'chrome',
      url: 'https://example.com/docs',
      summary: 'Opened the docs page.',
      output: 'https://example.com/docs',
    }))
    const browserTypeText = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_type_text',
      browser: 'chrome',
      summary: 'Typed Alicization 闭环 into the site search input.',
      output: 'typed docs search query',
      matchedText: '站内搜索',
    }))
    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      browser: 'chrome',
      summary: 'Clicked browser element Alicization 闭环.',
      output: 'opened docs result',
      matchedText: 'Alicization 闭环',
    }))
    const browserWait = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_wait',
      summary: 'The browser page finished loading.',
      output: 'complete',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Open the docs page, use site search, and keep following the visible web flow locally.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Open the docs page, search inside it, and keep following the visible web flow locally.',
      },
      surface: {
        desktopInspectScene,
        browserOpenUrl,
        browserTypeText,
        browserClickElement,
        browserWait,
      } as any,
      now: () => 9_250,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserOpenUrl).toBeCalledTimes(1)
    expect(browserOpenUrl).toBeCalledWith(expect.objectContaining({
      url: 'https://example.com/docs',
      browser: 'chrome',
    }))
    expect(browserTypeText).toBeCalledTimes(1)
    expect(browserTypeText).toBeCalledWith(expect.objectContaining({
      text: 'Alicization 闭环',
      targetText: '站内搜索',
      browser: 'chrome',
      submit: true,
      autoContinueSuggestedActions: true,
    }))
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserClickElement).toBeCalledWith(expect.objectContaining({
      text: 'Alicization 闭环',
      targetType: 'link',
      browser: 'chrome',
    }))
    expect(browserWait).toBeCalledTimes(3)
    expect(desktopInspectScene).toBeCalledTimes(4)
    expect(result.summary).toContain('Auto-continued with browser_open_url.')
    expect(result.summary).toContain('Auto-continued with browser_type_text.')
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'browser_open_url',
      result: expect.objectContaining({
        operation: 'browser_open_url',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'browser_type_text',
              result: expect.objectContaining({
                autoContinuation: expect.objectContaining({
                  executedSteps: [
                    expect.objectContaining({
                      toolName: 'browser_click_element',
                      result: expect.objectContaining({
                        operation: 'browser_click_element',
                        matchedText: 'Alicization 闭环',
                      }),
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('falls back to browser page reading after browser navigation when follow-up inspection still needs stabilization', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current page should be refreshed before continuing.',
        output: 'reload suggested',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先刷新当前页面',
          rationale: '当前内容页可能已经过期，先刷新再确认是否有新的稳定动作。',
          toolName: 'browser_navigate',
          arguments: {
            action: 'reload',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认刷新后的页面现在到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The refreshed page is visible but still needs a low-risk reread before choosing the next action.',
        output: 'refreshed content detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        browserPageContext: {
          browser: 'chrome',
          url: 'https://example.com/article',
        },
        executionStrategy: {
          recommendedChannel: 'browser',
        },
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
        },
        suggestedActions: [{
          kind: 'stabilize-scene',
          title: '先稳定当前前台界面再继续',
          rationale: '页面已经刷新，但暂时还没有稳定暴露出更明确的下一步动作。',
        }],
        blockingSignals: [],
      })

    const browserNavigate = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_navigate',
      browser: 'chrome',
      action: 'reload',
      summary: 'reloaded the browser page.',
      output: 'https://example.com/article',
    }))
    const browserWait = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_wait',
      summary: 'The browser page finished loading.',
      output: 'complete',
    }))
    const browserReadPage = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_read_page',
      browser: 'chrome',
      url: 'https://example.com/article',
      title: 'Alicization Article',
      content: 'The refreshed article body is visible now.',
      output: 'The refreshed article body is visible now.',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Refresh the current page locally and stabilize the next reading step.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Refresh the current page locally and keep following the browser flow.',
      },
      surface: {
        desktopInspectScene,
        browserNavigate,
        browserWait,
        browserReadPage,
      } as any,
      now: () => 9_500,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserNavigate).toBeCalledTimes(1)
    expect(browserNavigate).toBeCalledWith(expect.objectContaining({
      action: 'reload',
      browser: 'chrome',
    }))
    expect(browserWait).toBeCalledTimes(1)
    expect(browserReadPage).toBeCalledTimes(1)
    expect(browserReadPage).toBeCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
    }))
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'browser_navigate',
      result: expect.objectContaining({
        operation: 'browser_navigate',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'browser_read_page',
              result: expect.objectContaining({
                operation: 'browser_read_page',
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps a browser navigation workflow local after browser_read_page reveals the next clickable action', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The current page should be refreshed before continuing.',
        output: 'reload suggested',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先刷新当前页面',
          rationale: '当前内容页可能已经过期，先刷新再确认是否有新的稳定动作。',
          toolName: 'browser_navigate',
          arguments: {
            action: 'reload',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认刷新后的页面现在到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 2,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The refreshed page is visible but still needs a low-risk reread before choosing the next action.',
        output: 'refreshed content detail visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        browserPageContext: {
          browser: 'chrome',
          url: 'https://example.com/article',
        },
        executionStrategy: {
          recommendedChannel: 'browser',
        },
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
        },
        suggestedActions: [{
          kind: 'stabilize-scene',
          title: '先稳定当前前台界面再继续',
          rationale: '页面已经刷新，但暂时还没有稳定暴露出更明确的下一步动作。',
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The refreshed page now exposes a stable continue-reading action.',
        output: 'continue reading action visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        browserPageContext: {
          browser: 'chrome',
          url: 'https://example.com/article',
        },
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '继续阅读正文',
          rationale: '低风险延续动作已经稳定暴露，继续点击即可推进页面链路。',
          toolName: 'browser_click_element',
          arguments: {
            text: '继续阅读',
            targetType: 'button',
            browser: 'chrome',
            expectedPhase: 'content-detail',
            reinspectAfterAction: true,
            inspectionQuestion: '确认继续阅读后的页面状态',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The continued reading page is visible now.',
        output: 'continued reading page visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const browserNavigate = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_navigate',
      browser: 'chrome',
      action: 'reload',
      summary: 'reloaded the browser page.',
      output: 'https://example.com/article',
    }))
    const browserWait = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_wait',
      summary: 'The browser page finished loading.',
      output: 'complete',
    }))
    const browserReadPage = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_read_page',
      browser: 'chrome',
      url: 'https://example.com/article',
      title: 'Alicization Article',
      content: 'The refreshed article body is visible now.',
      output: 'The refreshed article body is visible now.',
    }))
    const browserClickElement = vi.fn(async () => ({
      channel: 'browser',
      status: 'completed',
      operation: 'browser_click_element',
      browser: 'chrome',
      summary: 'Clicked browser element 继续阅读.',
      output: 'opened continued reading section',
      matchedText: '继续阅读',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Refresh the current page, reread it, and keep following the visible browser flow locally.',
      }),
      channel: 'browser',
      command: {
        instruction: 'Refresh the current page locally, reread it if needed, and keep following the browser flow.',
      },
      surface: {
        desktopInspectScene,
        browserNavigate,
        browserWait,
        browserReadPage,
        browserClickElement,
      } as any,
      now: () => 9_560,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(browserNavigate).toBeCalledTimes(1)
    expect(browserReadPage).toBeCalledTimes(1)
    expect(browserReadPage).toBeCalledWith(expect.objectContaining({
      browser: 'chrome',
      format: 'text',
      autoContinueSuggestedActions: true,
    }))
    expect(browserClickElement).toBeCalledTimes(1)
    expect(browserClickElement).toBeCalledWith(expect.objectContaining({
      text: '继续阅读',
      targetType: 'button',
      browser: 'chrome',
    }))
    expect(desktopInspectScene).toBeCalledTimes(4)
    expect(result.summary).toContain('Auto-continued with browser_navigate.')
    expect(result.summary).toContain('Auto-continued with browser_read_page.')
    expect(result.summary).toContain('Auto-continued with browser_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'browser_navigate',
      result: expect.objectContaining({
        operation: 'browser_navigate',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'browser_read_page',
              result: expect.objectContaining({
                operation: 'browser_read_page',
                autoContinuation: expect.objectContaining({
                  executedSteps: [
                    expect.objectContaining({
                      toolName: 'browser_click_element',
                      result: expect.objectContaining({
                        operation: 'browser_click_element',
                        matchedText: '继续阅读',
                      }),
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('auto-continues desktop application entry actions and keeps following the focused software locally', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The next step is to bring the target desktop app to the foreground.',
        output: 'app launch suggested',
        pagePhase: 'unknown',
        nextActionIntent: 'open-application',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先打开微信',
          rationale: '先把目标软件带到前台，再根据实际界面继续当前跨软件链路。',
          toolName: 'desktop_open_application',
          arguments: {
            appName: 'WeChat',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认目标软件打开后现在界面到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The target software is focused and its primary action is visible.',
        output: 'app focused',
        pagePhase: 'form-entry',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '点击登录',
          rationale: '目标软件已经稳定出现，继续点主动作进入下一个稳定步骤。',
          toolName: 'desktop_click_element',
          arguments: {
            text: '登录',
            role: 'button',
            expectedPhase: 'form-entry',
            reinspectAfterAction: true,
            inspectionQuestion: '确认登录入口已经聚焦',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The login entry is focused now.',
        output: 'login entry focused',
        pagePhase: 'form-entry',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const desktopOpenApplication = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_open_application',
      appName: 'WeChat',
      summary: 'Opened application WeChat.',
      output: 'WeChat',
    }))
    const desktopClickElement = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      summary: 'Clicked desktop element 登录.',
      output: 'clicked login',
      matchedText: '登录',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Open the target desktop application and keep following the software flow locally.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Open the target desktop application and keep going locally.',
      },
      surface: {
        desktopInspectScene,
        desktopOpenApplication,
        desktopClickElement,
      } as any,
      now: () => 10_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopOpenApplication).toBeCalledTimes(1)
    expect(desktopOpenApplication).toBeCalledWith(expect.objectContaining({
      appName: 'WeChat',
    }))
    expect(desktopClickElement).toBeCalledTimes(1)
    expect(desktopClickElement).toBeCalledWith(expect.objectContaining({
      text: '登录',
      role: 'button',
    }))
    expect(desktopInspectScene).toBeCalledTimes(3)
    expect(result.summary).toContain('Auto-continued with desktop_open_application.')
    expect(result.summary).toContain('Auto-continued with desktop_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'desktop_open_application',
      result: expect.objectContaining({
        operation: 'desktop_open_application',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'desktop_click_element',
            }),
          ],
        }),
      }),
    })
  })

  it('does not collapse follow-up desktop_open_application actions that target a different explicit app path', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'Open the stable Cursor build first before switching this workflow to the beta build.',
        output: 'open stable cursor build',
        pagePhase: 'unknown',
        nextActionIntent: 'open-application',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先打开 Cursor Stable',
          rationale: '先把稳定版带到前台，再确认这个链路是否需要切到另一个明确路径的应用实例。',
          toolName: 'desktop_open_application',
          arguments: {
            appName: 'Cursor',
            path: '/Applications/Cursor.app',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认 Cursor Stable 打开后是否还需要切到 beta 版本',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 2,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The stable build is open, but this workflow still needs the beta build at a different path.',
        output: 'switch to beta cursor build',
        pagePhase: 'unknown',
        nextActionIntent: 'open-application',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '切到 Cursor Beta',
          rationale: '当前链路还没有落到正确的应用实例，需要继续打开另一个明确路径的 beta 版本。',
          toolName: 'desktop_open_application',
          arguments: {
            appName: 'Cursor',
            path: '/Applications/Cursor Beta.app',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认 Cursor Beta 已经在前台并读取当前界面',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The beta build is focused and ready for the next local action.',
        output: 'beta cursor build focused',
        pagePhase: 'form-entry',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })
    const desktopOpenApplication = vi.fn(async (input: any) => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_open_application',
      appName: input.appName ?? null,
      path: input.path ?? null,
      summary: `Opened ${input.path ?? input.appName ?? 'application'}.`,
      output: input.path ?? input.appName ?? null,
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Switch the local workflow to Cursor Beta.',
        selectedChannel: 'desktop',
        proposedChannel: 'desktop',
      }),
      channel: 'desktop',
      command: {
        instruction: 'Switch the current local workflow from Cursor Stable to Cursor Beta and continue locally.',
      },
      surface: {
        desktopInspectScene,
        desktopOpenApplication,
      } as any,
      now: () => 1_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopOpenApplication).toBeCalledTimes(2)
    expect(desktopOpenApplication).toHaveBeenNthCalledWith(1, expect.objectContaining({
      appName: 'Cursor',
      path: '/Applications/Cursor.app',
    }))
    expect(desktopOpenApplication).toHaveBeenNthCalledWith(2, expect.objectContaining({
      appName: 'Cursor',
      path: '/Applications/Cursor Beta.app',
    }))
    expect(desktopInspectScene).toBeCalledTimes(3)
    expect(result.summary).toContain('Auto-continued with desktop_open_application.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'desktop_open_application',
      result: expect.objectContaining({
        operation: 'desktop_open_application',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'desktop_open_application',
              result: expect.objectContaining({
                operation: 'desktop_open_application',
                path: '/Applications/Cursor Beta.app',
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps a cross-software desktop settings workflow local across launch destination and toggle steps', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The next step is to open System Settings before entering the requested privacy area.',
        output: 'system settings launch suggested',
        pagePhase: 'unknown',
        nextActionIntent: 'open-application',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先打开系统设置',
          rationale: '先把目标软件带到前台，再根据真实桌面控件进入隐私区域并继续后续权限切换。',
          toolName: 'desktop_open_application',
          arguments: {
            appName: '系统设置',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认系统设置打开后现在界面到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'System Settings is focused and the privacy destination is visible.',
        output: 'system settings focused with privacy destination visible',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '进入隐私',
          rationale: '先进入目标设置区域，才能继续暴露出后续的权限开关。',
          toolName: 'desktop_click_element',
          arguments: {
            text: '隐私',
            role: 'list-item',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认隐私设置区域已经打开并判断现在最稳妥的下一步是什么',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The privacy area is open and the microphone permission toggle is available.',
        output: 'privacy settings visible with microphone toggle',
        pagePhase: 'form-entry',
        nextActionIntent: 'toggle-setting',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '打开麦克风权限',
          rationale: '目标权限开关已经稳定暴露，继续执行即可完成本地桌面权限链路。',
          toolName: 'desktop_click_element',
          arguments: {
            text: '麦克风权限',
            role: 'checkbox',
            reinspectAfterAction: true,
            inspectionQuestion: '确认麦克风权限已经打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The microphone permission is enabled now.',
        output: 'microphone permission enabled',
        pagePhase: 'form-entry',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const desktopOpenApplication = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_open_application',
      appName: '系统设置',
      summary: 'Opened application 系统设置.',
      output: '系统设置',
    }))
    const desktopClickElement = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_click_element',
        summary: 'Clicked desktop element 隐私.',
        output: 'clicked privacy destination',
        matchedText: '隐私',
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_click_element',
        summary: 'Clicked desktop element 麦克风权限.',
        output: 'clicked microphone permission toggle',
        matchedText: '麦克风权限',
      })

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Open System Settings and enable microphone permission locally without leaving the desktop GUI chain.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Open System Settings, enter Privacy, and enable microphone permission locally.',
      },
      surface: {
        desktopInspectScene,
        desktopOpenApplication,
        desktopClickElement,
      } as any,
      now: () => 10_500,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopOpenApplication).toBeCalledTimes(1)
    expect(desktopOpenApplication).toBeCalledWith(expect.objectContaining({
      appName: '系统设置',
    }))
    expect(desktopClickElement).toBeCalledTimes(2)
    expect(desktopClickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '隐私',
      role: 'list-item',
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: '麦克风权限',
      role: 'checkbox',
    }))
    expect(desktopInspectScene).toBeCalledTimes(4)
    expect(result.summary).toContain('Auto-continued with desktop_open_application.')
    expect(result.summary).toContain('Auto-continued with desktop_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'desktop_open_application',
      result: expect.objectContaining({
        operation: 'desktop_open_application',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'desktop_click_element',
              result: expect.objectContaining({
                autoContinuation: expect.objectContaining({
                  executedSteps: [
                    expect.objectContaining({
                      toolName: 'desktop_click_element',
                      result: expect.objectContaining({
                        operation: 'desktop_click_element',
                        matchedText: '麦克风权限',
                      }),
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps a cross-software tab-first settings workflow local across launch relist toggle and confirm steps', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The next step is to open System Settings before switching to the requested tab.',
        output: 'system settings launch suggested',
        pagePhase: 'unknown',
        nextActionIntent: 'open-application',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先打开系统设置',
          rationale: '先把目标软件带到前台，再根据真实桌面控件切换到隐私标签页。',
          toolName: 'desktop_open_application',
          arguments: {
            appName: '系统设置',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认系统设置打开后现在界面到了哪一步',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'System Settings is focused and the privacy tab should be opened next.',
        output: 'system settings focused with privacy tab visible',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '切换到隐私标签页',
          rationale: '先切到目标标签页，再继续暴露出后续的权限开关。',
          toolName: 'desktop_click_element',
          arguments: {
            text: '隐私',
            role: 'tab',
            expectedPhase: 'unknown',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '帮我切换到隐私标签页然后启用麦克风权限再点击完成',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The tab is switching, but the follow-up controls still need a stabilization relist.',
        output: 'privacy tab switching',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'observe-and-recheck',
        },
        suggestedActions: [{
          kind: 'stabilize-scene',
          title: '先稳定当前前台界面再继续',
          rationale: '标签页已经切换，但还需要重新列出控件确认权限开关是否已经出现。',
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The microphone permission toggle is visible now.',
        output: 'microphone permission toggle visible',
        pagePhase: 'unknown',
        nextActionIntent: 'toggle-setting',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '打开麦克风权限',
          rationale: '目标权限开关已经稳定暴露，继续执行即可推进桌面链路。',
          toolName: 'desktop_click_element',
          arguments: {
            text: '麦克风权限',
            role: 'checkbox',
            expectedPhase: 'unknown',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '确认麦克风权限已经打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The change is staged and should be confirmed now.',
        output: 'microphone permission toggled',
        pagePhase: 'unknown',
        nextActionIntent: 'confirm-dialog',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '点击“完成”确认当前设置变更',
          rationale: '切换设置后，再点击明确的确认按钮提交当前变更。',
          toolName: 'desktop_click_element',
          arguments: {
            text: '完成',
            role: 'button',
            expectedPhase: 'unknown',
            reinspectAfterAction: true,
            inspectionQuestion: '确认设置变更已经完成',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The microphone permission is enabled now.',
        output: 'microphone permission enabled',
        pagePhase: 'unknown',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const desktopOpenApplication = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_open_application',
      appName: '系统设置',
      summary: 'Opened application 系统设置.',
      output: '系统设置',
    }))
    const desktopListInteractables = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_list_interactables',
      summary: 'Listed the current settings controls.',
      output: 'settings controls relisted',
      interactables: [],
    }))
    const desktopClickElement = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_click_element',
        summary: 'Clicked desktop element 隐私.',
        output: 'clicked privacy tab',
        matchedText: '隐私',
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_click_element',
        summary: 'Clicked desktop element 麦克风权限.',
        output: 'clicked microphone permission toggle',
        matchedText: '麦克风权限',
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_click_element',
        summary: 'Clicked desktop element 完成.',
        output: 'clicked finish',
        matchedText: '完成',
      })

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Open System Settings, switch to the privacy tab, enable microphone permission, and confirm it locally.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Open System Settings, switch to the privacy tab, enable microphone permission, and confirm it locally.',
      },
      surface: {
        desktopInspectScene,
        desktopOpenApplication,
        desktopListInteractables,
        desktopClickElement,
      } as any,
      now: () => 11_050,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopOpenApplication).toBeCalledTimes(1)
    expect(desktopClickElement).toBeCalledTimes(3)
    expect(desktopClickElement).toHaveBeenNthCalledWith(1, expect.objectContaining({
      text: '隐私',
      role: 'tab',
    }))
    expect(desktopListInteractables).toBeCalledTimes(1)
    expect(desktopClickElement).toHaveBeenNthCalledWith(2, expect.objectContaining({
      text: '麦克风权限',
      role: 'checkbox',
    }))
    expect(desktopClickElement).toHaveBeenNthCalledWith(3, expect.objectContaining({
      text: '完成',
      role: 'button',
    }))
    expect(desktopInspectScene).toBeCalledTimes(6)
    expect(result.summary).toContain('Auto-continued with desktop_open_application.')
    expect(result.summary).toContain('Auto-continued with desktop_click_element.')
    expect(result.summary).toContain('Auto-continued with desktop_list_interactables.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'desktop_open_application',
      result: expect.objectContaining({
        operation: 'desktop_open_application',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'desktop_click_element',
              result: expect.objectContaining({
                matchedText: '隐私',
                autoContinuation: expect.objectContaining({
                  executedSteps: [
                    expect.objectContaining({
                      toolName: 'desktop_list_interactables',
                      result: expect.objectContaining({
                        operation: 'desktop_list_interactables',
                        autoContinuation: expect.objectContaining({
                          executedSteps: [
                            expect.objectContaining({
                              toolName: 'desktop_click_element',
                              result: expect.objectContaining({
                                matchedText: '麦克风权限',
                                autoContinuation: expect.objectContaining({
                                  executedSteps: [
                                    expect.objectContaining({
                                      toolName: 'desktop_click_element',
                                      result: expect.objectContaining({
                                        matchedText: '完成',
                                      }),
                                    }),
                                  ],
                                }),
                              }),
                            }),
                          ],
                        }),
                      }),
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),
    })
  })

  it('keeps a cross-software app-search workflow local across launch input and result-selection steps', async () => {
    const desktopInspectScene = vi.fn()
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The next step is to open WeChat before searching the requested contact.',
        output: 'wechat launch suggested',
        pagePhase: 'unknown',
        nextActionIntent: 'open-application',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先打开微信',
          rationale: '先把目标软件带到前台，再根据真实桌面控件继续应用内搜索链路。',
          toolName: 'desktop_open_application',
          arguments: {
            appName: '微信',
            autoContinueSuggestedActions: true,
            reinspectAfterAction: true,
            inspectionQuestion: '帮我打开微信然后搜索 Alice',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'WeChat is focused and its search input is visible.',
        output: 'wechat focused with search input visible',
        pagePhase: 'unknown',
        nextActionIntent: 'fill-form',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '先向“搜索”输入指定内容',
          rationale: '目标软件已经稳定出现，先把搜索词输入进去，再观察结果列表是否已经暴露。',
          toolName: 'desktop_type_text',
          arguments: {
            text: 'Alice',
            targetText: '搜索',
            submit: true,
            reinspectAfterAction: true,
            autoContinueSuggestedActions: true,
            inspectionQuestion: '帮我打开微信然后搜索 Alice',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The matching search result is visible now.',
        output: 'wechat search results visible',
        pagePhase: 'form-entry',
        nextActionIntent: 'continue-desktop-navigation',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [{
          title: '打开 Alice 对话',
          rationale: '搜索结果已经稳定出现，继续打开目标对话就能把链路推进到下一个软件状态。',
          toolName: 'desktop_click_element',
          arguments: {
            text: 'Alice',
            role: 'list-item',
            reinspectAfterAction: true,
            inspectionQuestion: '确认 Alice 对话已经打开',
            inspectionMaxSuggestedActions: 3,
            maxAutoContinueSteps: 1,
          },
        }],
        blockingSignals: [],
      })
      .mockResolvedValueOnce({
        channel: 'desktop',
        status: 'completed',
        operation: 'desktop_inspect_scene',
        summary: 'The Alice conversation is open now.',
        output: 'wechat alice conversation visible',
        pagePhase: 'content-detail',
        nextActionIntent: 'continue-browsing',
        workflowPlan: {
          continuationMode: 'ready-to-act',
        },
        suggestedActions: [],
        blockingSignals: [],
      })

    const desktopOpenApplication = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_open_application',
      appName: '微信',
      summary: 'Opened application 微信.',
      output: '微信',
    }))
    const desktopTypeText = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_type_text',
      summary: 'Typed text Alice into desktop input 搜索.',
      output: 'typed search query',
      matchedText: '搜索',
    }))
    const desktopClickElement = vi.fn(async () => ({
      channel: 'desktop',
      status: 'completed',
      operation: 'desktop_click_element',
      summary: 'Clicked desktop element Alice.',
      output: 'opened Alice conversation',
      matchedText: 'Alice',
    }))

    const result = await executeLocalVisualTaskThread({
      thread: createThread({
        goal: 'Open WeChat, search Alice, and keep following the in-app search flow locally.',
        selectedChannel: 'software',
        proposedChannel: 'software',
      }),
      channel: 'software',
      command: {
        instruction: 'Open WeChat, search Alice, and keep following the visible software flow locally.',
      },
      surface: {
        desktopInspectScene,
        desktopOpenApplication,
        desktopTypeText,
        desktopClickElement,
      } as any,
      now: () => 11_000,
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(desktopOpenApplication).toBeCalledTimes(1)
    expect(desktopOpenApplication).toBeCalledWith(expect.objectContaining({
      appName: '微信',
    }))
    expect(desktopTypeText).toBeCalledTimes(1)
    expect(desktopTypeText).toBeCalledWith(expect.objectContaining({
      text: 'Alice',
      targetText: '搜索',
      submit: true,
      autoContinueSuggestedActions: true,
    }))
    expect(desktopClickElement).toBeCalledTimes(1)
    expect(desktopClickElement).toBeCalledWith(expect.objectContaining({
      text: 'Alice',
      role: 'list-item',
    }))
    expect(desktopInspectScene).toBeCalledTimes(4)
    expect(result.summary).toContain('Auto-continued with desktop_open_application.')
    expect(result.summary).toContain('Auto-continued with desktop_type_text.')
    expect(result.summary).toContain('Auto-continued with desktop_click_element.')
    const outputRecord = JSON.parse(result.output ?? '{}')
    expect(outputRecord.autoContinuation?.executedSteps?.[0]).toMatchObject({
      toolName: 'desktop_open_application',
      result: expect.objectContaining({
        operation: 'desktop_open_application',
        autoContinuation: expect.objectContaining({
          executedSteps: [
            expect.objectContaining({
              toolName: 'desktop_type_text',
              result: expect.objectContaining({
                autoContinuation: expect.objectContaining({
                  executedSteps: [
                    expect.objectContaining({
                      toolName: 'desktop_click_element',
                      result: expect.objectContaining({
                        operation: 'desktop_click_element',
                        matchedText: 'Alice',
                      }),
                    }),
                  ],
                }),
              }),
            }),
          ],
        }),
      }),
    })
  })
})
