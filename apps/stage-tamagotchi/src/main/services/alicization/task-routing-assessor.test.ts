import type {
  AlicizationChannelCapability,
  AlicizationClawTaskIntent,
  AlicizationExecutionChannel,
} from '@proj-alicization/stage-shared'

import { describe, expect, it } from 'vitest'

import { assessAlicizationTaskRouting } from './task-routing-assessor'

const executionChannels: AlicizationExecutionChannel[] = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
  'desktop',
]

function createCapabilities(readyChannels: AlicizationExecutionChannel[]) {
  return executionChannels.map(channel => ({
    channel,
    available: readyChannels.includes(channel),
    enabled: readyChannels.includes(channel),
    ready: readyChannels.includes(channel),
  })) satisfies AlicizationChannelCapability[]
}

function createTask(overrides: Partial<AlicizationClawTaskIntent>): AlicizationClawTaskIntent {
  return {
    kind: 'unknown',
    goal: 'Handle the requested task.',
    ...overrides,
  }
}

describe('assessAlicizationTaskRouting', () => {
  it('respects explicit channel mentions from task goal when capability is ready', () => {
    const result = assessAlicizationTaskRouting({
      task: createTask({
        kind: 'codebase-edit',
        goal: 'Use Claude Code to refactor runtime call-chain handling.',
      }),
      capabilities: createCapabilities(['codex', 'claude-code', 'cli']),
      activeThreads: [],
      settledThreads: [],
    })

    expect(result).toMatchObject({
      channel: 'claude-code',
    })
    expect(result?.confidence).toBeGreaterThan(0.85)
    expect(result?.reason).toContain('goal:channel-mentioned')
  })

  it('keeps code-task kind preference over command-literal-only CLI hints', () => {
    const result = assessAlicizationTaskRouting({
      task: createTask({
        kind: 'codebase-edit',
        goal: 'Patch the regression and run `pnpm test` before finalizing.',
      }),
      capabilities: createCapabilities(['cli', 'codex', 'claude-code']),
      activeThreads: [],
      settledThreads: [],
    })

    expect(result).toMatchObject({
      channel: 'codex',
    })
    expect(result?.reason).toContain('kind:codebase-edit')
  })

  it('routes run-command tasks to CLI when command literal is present', () => {
    const result = assessAlicizationTaskRouting({
      task: createTask({
        kind: 'run-command',
        goal: 'Run `pnpm lint` in the workspace root.',
      }),
      capabilities: createCapabilities(['cli', 'codex']),
      activeThreads: [],
      settledThreads: [],
    })

    expect(result).toMatchObject({
      channel: 'cli',
    })
    expect(result?.confidence).toBeGreaterThan(0.8)
  })

  it('routes browser automation into browser channel when it is ready', () => {
    const result = assessAlicizationTaskRouting({
      task: createTask({
        kind: 'browser-automation',
        goal: 'Open the current tab and click the visible login button.',
      }),
      capabilities: createCapabilities(['browser', 'openclaw']),
      activeThreads: [],
      settledThreads: [],
    })

    expect(result).toMatchObject({
      channel: 'browser',
    })
  })

  it('returns null when no channel is ready', () => {
    const result = assessAlicizationTaskRouting({
      task: createTask({
        kind: 'codebase-investigation',
        goal: 'Investigate runtime dispatch drift.',
      }),
      capabilities: createCapabilities([]),
      activeThreads: [],
      settledThreads: [],
    })

    expect(result).toBeNull()
  })

  it('adds history-aware marker when prior thread history exists', () => {
    const result = assessAlicizationTaskRouting({
      task: createTask({
        kind: 'codebase-investigation',
        goal: 'Trace the current runtime call chain and summarize findings.',
      }),
      capabilities: createCapabilities(['codex']),
      activeThreads: [{
        id: 'thread-history-1',
        decisionTraceId: null,
        turnId: null,
        sessionId: 'session-history-1',
        origin: 'user-turn',
        goal: 'Previous codebase investigation.',
        kind: 'codebase-investigation',
        status: 'completed',
        selectedChannel: 'codex',
        proposedChannel: 'codex',
        summary: 'completed',
        metadata: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastEventAt: Date.now(),
        completedAt: Date.now(),
      }],
      settledThreads: [],
    })

    expect(result).toMatchObject({
      channel: 'codex',
    })
    expect(result?.reason).toContain('history-aware')
  })
})
