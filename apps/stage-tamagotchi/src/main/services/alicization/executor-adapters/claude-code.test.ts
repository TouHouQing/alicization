import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeClaudeCodeTaskThread } from './claude-code'

const { execFileMock } = vi.hoisted(() => ({
  execFileMock: vi.fn(),
}))

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}))

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-claude-code-1',
    decisionTraceId: 'mind:trace:claude-code-1',
    turnId: 'turn-claude-code-1',
    sessionId: 'session-claude-code-1',
    origin: 'user-turn',
    goal: 'Investigate the current task via claude code.',
    kind: 'agent-delegation',
    status: 'planned',
    selectedChannel: 'claude-code',
    proposedChannel: 'claude-code',
    summary: 'planned claude code body',
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

describe('claude-code executor adapter', () => {
  beforeEach(() => {
    execFileMock.mockReset()
  })

  it('dispatches claude code execution and records dispatch, step, and result events', async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      setTimeout(() => {
        callback(null, 'claude assistant output', '')
      }, 0)
      return {
        kill: vi.fn(),
      }
    })

    const result = await executeClaudeCodeTaskThread({
      thread: createThread(),
      command: {
        prompt: 'Inspect the current patch and summarize risks.',
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-claude-code-1',
          decisionTraceId: 'mind:trace:claude-code-1',
          projectBriefing: {
            identity: 'Alicization is a local-first digital life project building one continuous "her".',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Execution runtime context already carries same-her project continuity before Claude Code starts.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
            primaryOpenLoop: 'Execution, memory, initiative, and embodiment still need stronger same-line closure.',
            nextClosureTarget: 'Keep execution grounded on the same Phase 1 living line before widening outward.',
            sameHerDriftRisk: 'If execution runtime context collapses into a generic shell, treat that as unfinished same-her drift.',
            continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
            preflightSummary: 'identity=Alicization | phase=Phase 1 | open=execution chain same-line closure',
            preDialogueAwarenessLine: 'Before dispatch, remember this is still the same local-first digital life project.',
          },
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 18,
            foregroundWindow: {
              appName: 'Cursor',
              processName: 'cursor',
              title: 'airi-alice',
            },
            capture: {
              health: 'healthy',
              permission: 'granted',
              sourceCount: 1,
              lastUpdatedAt: 1_710_000_000_100,
              lastError: null,
              degradedReasons: [],
            },
          },
        },
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('claude assistant output')
    expect(result.events.map(event => event.kind)).toEqual(expect.arrayContaining(['dispatch', 'step', 'result']))
    expect(execFileMock).toBeCalledWith(
      expect.stringMatching(/(?:^|\/)claude$/),
      expect.arrayContaining([
        '--print',
        '--permission-mode',
        'plan',
        '--tools',
        '',
        '--',
        expect.stringContaining('[ALICIZATION_EXECUTION_RUNTIME_CONTEXT]'),
        expect.stringContaining('project_same_her_hold=same-her hold: keep execution on the same living line before widening outward.'),
        expect.stringContaining('project_continuity=same living line: execution should keep carrying this same Phase 1 digital life before widening outward.'),
      ]),
      expect.anything(),
      expect.any(Function),
    )
    const [, args] = execFileMock.mock.calls[0] ?? []
    expect(args.at(-2)).toBe('--')
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      hasRuntimeContext: true,
      runtimeContext: expect.objectContaining({
        cardId: 'default',
        turnId: 'turn-claude-code-1',
      }),
    }))
  })

  it('blocks observe-only thread when claude code tools are enabled', async () => {
    const result = await executeClaudeCodeTaskThread({
      thread: createThread({
        metadata: {
          task: {
            permissionMode: 'implicit',
            effect: 'observe',
          },
        },
      }),
      command: {
        prompt: 'Use tools to modify files directly.',
        allowTools: true,
        runtimeContext: {
          generatedAt: 1_710_000_000_000,
          cardId: 'default',
          turnId: 'turn-claude-code-1',
          decisionTraceId: 'mind:trace:claude-code-1',
          sensory: {
            collectedAt: 1_710_000_000_123,
            running: true,
            stale: false,
            ageMs: 24,
            foregroundWindow: {
              appName: 'Cursor',
              processName: 'cursor',
              title: 'airi-alice',
            },
            capture: {
              health: 'healthy',
              permission: 'granted',
              sourceCount: 1,
              lastUpdatedAt: 1_710_000_000_100,
              lastError: null,
              degradedReasons: [],
            },
          },
          projectBriefing: {
            identity: 'Alicization is a local-first digital life project building one continuous "her".',
            currentPhase: 'Phase 1: Local Digital Life.',
            latestLandedProgress: 'Execution safety gates already preserve same-her runtime context before adapter refusal.',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            sameHerHoldDetail: 'same-her hold: execution safety still needs to stay on the same living Phase 1 line before widening into generic adapter narration.',
            primaryOpenLoop: 'Execution danger still needs risk classification, confirmation policy, auditability, and interruptibility.',
            nextClosureTarget: 'Keep blocked execution explainable and resumable on the same Phase 1 line.',
            sameHerDriftRisk: 'If blocked execution collapses into a generic adapter failure, treat that as unfinished same-her execution drift.',
            continuityCue: 'Keep blocked execution on the same project-aware living line before visible adapter output widens outward.',
            preflightSummary: 'identity=Alicization | phase=Phase 1 | open=execution safety gates',
            preDialogueAwarenessLine: 'Before dispatch, remember this is still the same local-first digital life project.',
          },
        },
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CLAUDE_CODE_EFFECT_MISMATCH')
    expect(result.events[0]?.payload).toEqual(expect.objectContaining({
      adapter: 'claude-code',
      safetyGate: expect.objectContaining({
        effect: 'observe',
        permissionMode: 'implicit',
        confirmationRequired: true,
        riskPolicy: 'observe-only-tools-blocked',
        auditability: 'blocked-before-dispatch',
        interruptibility: 'no-process-started',
      }),
      hasRuntimeContext: true,
      runtimeContext: expect.objectContaining({
        projectBriefing: expect.objectContaining({
          identity: expect.stringContaining('local-first digital life project'),
          currentPhase: expect.stringContaining('Phase 1'),
          sameHerSelfLine: expect.stringContaining('same living line'),
          primaryOpenLoop: expect.stringContaining('risk classification'),
        }),
      }),
    }))
    expect(execFileMock).not.toBeCalled()
  })

  it('allows low-risk autonomous code edits to self-start on claude-code when planning already marked them as grounded same-her execution', async () => {
    execFileMock.mockImplementation((_command: string, _args: string[], _options: unknown, callback: (error: Error | null, stdout?: string, stderr?: string) => void) => {
      setTimeout(() => {
        callback(null, 'claude autonomous patch output', '')
      }, 0)
      return {
        kill: vi.fn(),
      }
    })

    const result = await executeClaudeCodeTaskThread({
      thread: createThread({
        turnId: 'subconscious:claude-self-start-1',
        origin: 'subconscious-proactive',
        kind: 'codebase-edit',
        metadata: {
          task: {
            permissionMode: 'none',
            effect: 'mutate',
            riskBudget: 'low',
            justification: 'grounded',
          },
        },
      }),
      command: {
        prompt: 'Patch the current runtime seam directly with the smallest safe change.',
        allowTools: true,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(true)
    expect(result.finalStatus).toBe('completed')
    expect(result.output).toContain('claude autonomous patch output')
    expect(execFileMock).toBeCalled()
  })

  it('blocks medium-risk autonomous code edits when old stored threads lost explicit permission metadata even if origin thinned back to user-turn', async () => {
    const result = await executeClaudeCodeTaskThread({
      thread: createThread({
        turnId: 'subconscious:claude-origin-thin-medium-risk-1',
        origin: 'user-turn',
        kind: 'codebase-edit',
        metadata: {
          task: {
            effect: 'mutate',
            riskBudget: 'medium',
            justification: 'grounded',
          },
        },
      }),
      command: {
        prompt: 'Refactor the current runtime knot more aggressively.',
        allowTools: true,
      },
      workspaceRoot: process.cwd(),
    })

    expect(result.ok).toBe(false)
    expect(result.finalStatus).toBe('failed')
    expect(result.errorCode).toBe('CLAUDE_CODE_PERMISSION_REQUIRED')
    expect(execFileMock).not.toBeCalled()
  })
})
