import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { describe, expect, it } from 'vitest'

import {
  isLowRiskAutonomousCodeAgentSelfStartThread,
  resolveThreadPermissionMode,
} from './thread-permission'

function createThread(overrides: Partial<AlicizationTaskThreadRecord> = {}): AlicizationTaskThreadRecord {
  return {
    id: 'thread-permission-1',
    decisionTraceId: 'mind:trace:thread-permission-1',
    turnId: 'turn-thread-permission-1',
    sessionId: 'session-thread-permission-1',
    origin: 'user-turn',
    goal: 'Keep the executor permission semantics aligned.',
    kind: 'codebase-edit',
    status: 'planned',
    selectedChannel: 'codex',
    proposedChannel: 'codex',
    summary: 'permission test thread',
    metadata: {},
    createdAt: 100,
    updatedAt: 100,
    lastEventAt: null,
    completedAt: null,
    ...overrides,
  }
}

describe('thread permission helper', () => {
  it('keeps explicit metadata permission modes authoritative when they are already stored on the thread', () => {
    expect(resolveThreadPermissionMode(createThread({
      metadata: {
        task: {
          permissionMode: 'explicit',
        },
      },
    }))).toBe('explicit')

    expect(resolveThreadPermissionMode(createThread({
      metadata: {
        task: {
          permissionMode: 'implicit',
        },
      },
    }))).toBe('implicit')

    expect(resolveThreadPermissionMode(createThread({
      metadata: {
        task: {
          permissionMode: 'none',
        },
      },
    }))).toBe('none')
  })

  it('falls back to none for origin-thin autonomous threads when the turn id still carries subconscious family ownership', () => {
    const permissionMode = resolveThreadPermissionMode(createThread({
      turnId: 'subconscious:origin-thin-thread-1',
      origin: 'user-turn',
      metadata: {
        task: {
          effect: 'mutate',
        },
      },
    }))

    expect(permissionMode).toBe('none')
  })

  it('still falls back to implicit for ordinary user-turn threads when no autonomous family marker survives', () => {
    const permissionMode = resolveThreadPermissionMode(createThread({
      turnId: 'turn-ordinary-user-1',
      origin: 'user-turn',
      metadata: {
        task: {
          effect: 'mutate',
        },
      },
    }))

    expect(permissionMode).toBe('implicit')
  })

  it('recognizes low-risk grounded autonomous code-agent self-start threads', () => {
    const thread = createThread({
      turnId: 'subconscious:low-risk-self-start-1',
      origin: 'user-turn',
      kind: 'codebase-edit',
      metadata: {
        task: {
          permissionMode: 'none',
          effect: 'mutate',
          riskBudget: 'low',
          justification: 'grounded',
        },
      },
    })

    expect(isLowRiskAutonomousCodeAgentSelfStartThread(thread)).toBe(true)
  })

  it('rejects medium-risk or non-autonomous threads from the low-risk self-start whitelist', () => {
    const mediumRiskThread = createThread({
      turnId: 'subconscious:medium-risk-thread-1',
      origin: 'user-turn',
      kind: 'codebase-edit',
      metadata: {
        task: {
          permissionMode: 'none',
          effect: 'mutate',
          riskBudget: 'medium',
          justification: 'grounded',
        },
      },
    })
    const ordinaryUserThread = createThread({
      turnId: 'turn-ordinary-user-2',
      origin: 'user-turn',
      kind: 'codebase-edit',
      metadata: {
        task: {
          permissionMode: 'none',
          effect: 'mutate',
          riskBudget: 'low',
          justification: 'grounded',
        },
      },
    })

    expect(isLowRiskAutonomousCodeAgentSelfStartThread(mediumRiskThread)).toBe(false)
    expect(isLowRiskAutonomousCodeAgentSelfStartThread(ordinaryUserThread)).toBe(false)
  })

  it('rejects origin-only proactive threads from the low-risk self-start whitelist when no autonomous turn-id ownership survives', () => {
    const spoofedAutonomousOriginThread = createThread({
      turnId: 'turn-origin-only-spoof-1',
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
    })

    expect(isLowRiskAutonomousCodeAgentSelfStartThread(spoofedAutonomousOriginThread)).toBe(false)
  })
})
