import type { AlicizationAgentSessionSnapshot } from './agent-runtime'
import type { AlicizationMainChatRuntimeSurface } from './main-chat-runtime-surface'

import { describe, expect, it } from 'vitest'

import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'

function createAgentSession(
  overrides: Partial<AlicizationAgentSessionSnapshot> = {},
): AlicizationAgentSessionSnapshot {
  return {
    id: 'agent:session-1',
    cardId: 'default',
    conversationSessionId: 'session-1',
    continuitySignals: [{
      id: 'signal-1',
      kind: 'presence',
      label: 'presence:editor',
      metadata: null,
      state: 'observed',
      summary: 'The editor is still in view.',
      createdAt: 90,
    }],
    createdAt: 80,
    digitalLifeArchitecture: null,
    digitalLifeSpine: null,
    lastActiveAt: 100,
    lastSensorySnapshot: null,
    tasks: [],
    ...overrides,
  } as AlicizationAgentSessionSnapshot
}

function createRuntimeSurface(): AlicizationMainChatRuntimeSurface {
  return {
    action: null,
    capture: {
      degradedReasons: [],
      fallbackReason: null,
      groundedThisTurn: false,
      hasVisualGrounding: false,
      health: null,
      inspectionRequested: false,
      permission: null,
    },
    customDirectivesResolution: {
      source: 'none',
      text: '',
    },
    digitalLifeArchitecture: null,
    digitalLifeRuntimeSurface: null,
    digitalLifeSpine: null,
    governance: null,
    hasVisualGrounding: false,
    messages: [],
    tooling: {
      allowTools: true,
      enforcedToolNames: [],
      routingRequired: false,
      waitForTools: false,
    },
    trace: {
      decisionTraceId: 'trace-1',
      personaKernelMode: 'full',
      sessionPhases: ['runtime-surface'],
      turnMode: 'answer',
    },
  }
}

describe('dialogue session manager', () => {
  it('stores real session facts without creating project continuity summaries', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 100,
    })
    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession: createAgentSession({
        tasks: [{
          id: 'task-1',
          kind: 'executor',
          label: 'inspect_file',
          status: 'completed',
          summary: 'Inspected the requested file.',
          createdAt: 90,
          updatedAt: 95,
        }] as any,
      }),
      cardId: 'default',
      decisionTraceId: 'trace-1',
      sessionId: 'session-1',
      source: 'dialogue',
    })

    expect(mirror.continuityArcSummary).toBeNull()
    expect(mirror.continuityProjectSummary).toBeNull()
    expect(mirror.executionSummary).toContain('inspect_file')
    expect(mirror.dialogueSummary).toBeNull()
    expect(manager.getSessionMirror('default', 'session-1')).toEqual(mirror)
  })

  it('expires stale mirrors and supports explicit clearing', () => {
    let now = 100
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => now,
      staleAfterMs: 50,
    })
    manager.ingestAgentSessionSnapshot({
      agentSession: createAgentSession(),
      cardId: 'default',
      sessionId: 'session-1',
      source: 'dialogue',
    })

    expect(manager.getSessionMirror('default', 'session-1')).not.toBeNull()
    manager.clear('default')
    expect(manager.getSessionMirror('default', 'session-1')).toBeNull()

    manager.ingestAgentSessionSnapshot({
      agentSession: createAgentSession(),
      cardId: 'default',
      sessionId: 'session-2',
      source: 'dialogue',
    })
    now = 200
    expect(manager.getSessionMirror('default', 'session-2')).toBeNull()
  })

  it('stores recollection as typed audit state instead of prompt cues', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 100,
    })
    const mirror = manager.ingestPreparedExecution({
      agentSession: createAgentSession(),
      cardId: 'default',
      organicMemoryContext: {
        memoryDeliberation: {
          confidence: 0.82,
          inwardLine: 'The user previously tested vector recall.',
          shouldRecall: true,
          surfacePolicy: 'gist-first',
        },
        recollectionIntent: {
          mode: 'episodic',
        },
        recollectionSpeechPlan: {
          certainty: 'firm',
          confidence: 0.82,
          placement: 'inside-payoff',
          shouldSurface: true,
          surfaceMode: 'gist-first',
        },
      } as any,
      runtimeSurface: createRuntimeSurface(),
      sessionId: 'session-1',
    })

    expect(mirror.recollection).toEqual(expect.objectContaining({
      certainty: 'firm',
      foreground: 'The user previously tested vector recall.',
      mode: 'episodic',
      visibility: 'visible',
    }))
  })
})
