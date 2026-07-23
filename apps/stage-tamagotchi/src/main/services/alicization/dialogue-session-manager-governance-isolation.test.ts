import type { AlicizationAgentSessionSnapshot } from './agent-runtime'

import { describe, expect, it } from 'vitest'

import { createAlicizationDialogueSessionManager } from './dialogue-session-manager'

describe('dialogue session manager governance isolation', () => {
  it('keeps real session facts but never reconstructs project governance for the provider', () => {
    const manager = createAlicizationDialogueSessionManager({
      getNow: () => 10_000,
    })
    const agentSession = {
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
        createdAt: 9_900,
      }],
      createdAt: 9_800,
      digitalLifeArchitecture: null,
      digitalLifeSpine: null,
      lastActiveAt: 9_950,
      lastSensorySnapshot: null,
      tasks: [{
        id: 'task-1',
        kind: 'runtime',
        status: 'completed',
        label: 'inspect_file',
        summary: 'Inspected the requested file.',
        createdAt: 9_920,
        updatedAt: 9_930,
      }],
    } as unknown as AlicizationAgentSessionSnapshot

    const mirror = manager.ingestAgentSessionSnapshot({
      agentSession,
      cardId: 'default',
      decisionTraceId: 'trace-1',
      sessionId: 'session-1',
      source: 'dialogue',
    })
    const block = manager.buildSessionMirrorSystemBlock({
      cardId: 'default',
      sessionId: 'session-1',
    })

    expect(mirror.continuityArcSummary).toBeNull()
    expect(mirror.continuityProjectSummary).toBeNull()
    expect(mirror.toolingSummary).toContain('inspect_file')
    expect(mirror.dialogueSummary).toContain('source=dialogue')
    expect(block).toBe('')
  })
})
