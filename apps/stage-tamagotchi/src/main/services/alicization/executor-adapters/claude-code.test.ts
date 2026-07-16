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

function parseProviderFact(raw: string) {
  expect(() => JSON.parse(raw)).not.toThrow()
  return JSON.parse(raw) as {
    type: string
    data: Record<string, unknown>
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
            identity: 'legacy identity prompt must not reach claude code',
            currentPhase: 'legacy phase prompt must not reach claude code',
            latestLandedProgress: 'Runtime context normalization is complete.',
            sameHerSelfLine: 'legacy persona prompt must not reach claude code',
            sameHerHoldDetail: null,
            primaryOpenLoop: 'Claude Code still needs typed task facts.',
            nextClosureTarget: 'Dispatch runtime and task facts without prose wrappers.',
            sameHerDriftRisk: null,
            continuityRestraint: 'measured-return',
            continuityCue: null,
            preferredVoiceMode: 'even',
            preflightSummary: 'legacy preflight prompt must not reach claude code',
            preDialogueAwarenessLine: 'legacy awareness prompt must not reach claude code',
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
    const [, args] = execFileMock.mock.calls[0] ?? []
    const prompt = String(args.at(-1) ?? '')
    const [runtimeFactRaw, taskFactRaw] = prompt.split('\n\n')
    const runtimeFact = parseProviderFact(runtimeFactRaw)
    const taskFact = parseProviderFact(taskFactRaw)

    expect(execFileMock).toBeCalledWith(
      expect.stringMatching(/(?:^|\/)claude$/),
      expect.arrayContaining([
        '--print',
        '--permission-mode',
        'plan',
        '--tools',
        '',
        '--',
      ]),
      expect.anything(),
      expect.any(Function),
    )
    expect(args.at(-2)).toBe('--')
    expect(runtimeFact).toEqual(expect.objectContaining({
      type: 'alicization-execution-runtime-context',
      data: expect.objectContaining({
        owners: {
          shortTerm: 'WorkingMemory',
          longTermRecall: 'LongTermMemoryRecall',
        },
        failureSurface: 'transparent',
        identifiers: expect.objectContaining({
          cardId: 'default',
          turnId: 'turn-claude-code-1',
        }),
        execution: expect.objectContaining({
          status: {
            latest: 'Runtime context normalization is complete.',
            open: 'Claude Code still needs typed task facts.',
            next: 'Dispatch runtime and task facts without prose wrappers.',
          },
          continuity: expect.objectContaining({
            restraint: 'measured-return',
          }),
          embodiment: expect.objectContaining({
            voiceMode: 'even',
          }),
        }),
      }),
    }))
    expect(taskFact).toEqual({
      type: 'alicization-execution-task',
      data: {
        instruction: 'Inspect the current patch and summarize risks.',
      },
    })
    expect(prompt).not.toMatch(/\[ALICIZATION_EXECUTION_|legacy (?:identity|phase|persona|preflight|awareness) prompt/iu)
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
    }))
    expect(execFileMock).not.toBeCalled()
  })

  it('allows low-risk autonomous code edits to self-start on claude-code when task policy marks them low-risk', async () => {
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
