import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationAgentRuntime } from './agent-runtime'
import { deferredAutonomyCanonicalVersion } from './runtime-deferred-autonomy-summary'
import { normalizeDeferredAutonomyContinuitySignal } from './runtime-subconscious-tick'

function createSensorySnapshot(overrides?: Partial<AlicizationSensoryCacheSnapshot>): AlicizationSensoryCacheSnapshot {
  return {
    running: true,
    stale: false,
    ageMs: 15,
    nextTickAt: 30,
    sample: {
      collectedAt: 10,
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
      lastUpdatedAt: 10,
      lastError: null,
      degradedReasons: [],
    },
    ...overrides,
  }
}

describe('alicization agent runtime', () => {
  it('reuses one agent session and deduplicates carried actions and continuity signals', async () => {
    const getSensorySnapshot = vi.fn(async () => createSensorySnapshot())
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot,
      resolveConversationSessionId: async () => 'session-1',
    })
    const firstTurn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-1',
      decisionTraceId: 'trace-1',
    })

    await firstTurn.trackTool({
      kind: 'executor',
      label: 'executor:openclaw',
      phaseId: 'tool:executor:openclaw',
      run: async () => ({ summary: 'Closed the blocking popup.' }),
      summarizeSuccess: result => result.summary,
    })
    await firstTurn.getSensorySnapshot()

    const secondTurn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-2',
      decisionTraceId: 'trace-2',
    })
    const callbackAction = {
      kind: 'executor' as const,
      status: 'completed' as const,
      label: 'callback:cli',
      summary: 'Completed the CLI check: all tests passed.',
      signature: 'thread-1:event-result-1',
    }
    secondTurn.ingestRuntimeActions([callbackAction, callbackAction])
    secondTurn.ingestContinuitySignals([
      {
        kind: 'presence',
        state: 'observed',
        label: 'digital-life-line',
        summary: 'older runtime continuity',
        metadata: {
          source: 'digital-life-runtime',
        },
      },
      {
        kind: 'presence',
        state: 'observed',
        label: 'digital-life-line',
        summary: 'latest runtime continuity',
        metadata: {
          source: 'digital-life-runtime',
        },
      },
      {
        kind: 'execution-callback',
        state: 'fresh',
        label: 'callback:cli',
        summary: callbackAction.summary,
        signature: callbackAction.signature,
      },
      {
        kind: 'execution-callback',
        state: 'fresh',
        label: 'callback:cli',
        summary: callbackAction.summary,
        signature: callbackAction.signature,
      },
    ])

    const runtimeContext = await secondTurn.buildExecutionRuntimeContext()
    const snapshot = secondTurn.getSessionSnapshot()

    expect(secondTurn.agentSessionId).toBe(firstTurn.agentSessionId)
    expect(runtimeContext).toMatchObject({
      sessionId: 'session-1',
      agentSessionId: firstTurn.agentSessionId,
      recentActions: [
        {
          kind: 'executor',
          status: 'completed',
          threadStatus: null,
          label: 'executor:openclaw',
          summary: 'Closed the blocking popup.',
        },
        {
          kind: 'executor',
          status: 'completed',
          threadStatus: null,
          label: 'callback:cli',
          summary: callbackAction.summary,
        },
      ],
    })
    expect(snapshot.tasks).toHaveLength(2)
    expect(snapshot.continuitySignals).toEqual([
      expect.objectContaining({
        kind: 'presence',
        label: 'digital-life-line',
        summary: 'latest runtime continuity',
      }),
      expect.objectContaining({
        kind: 'execution-callback',
        label: 'callback:cli',
        summary: callbackAction.summary,
      }),
    ])
    expect(snapshot.lastSensorySnapshot?.sample.foregroundWindow?.title).toBe('airi-alice')
    expect(getSensorySnapshot).toHaveBeenCalledTimes(2)
  })

  it('returns isolated session snapshots for stored spine, architecture, tasks, and continuity', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-snapshot-clone',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-snapshot-clone',
    })
    const spine = {
      version: 'digital-life-spine-v1',
      runtimeSurface: null,
      architecture: {
        version: 'digital-life-architecture-v1',
        operatingMode: 'hovering',
        dominantSystem: 'proactive',
        supportingSystems: ['memory'],
        governingFocus: 'quiet continuity',
        summary: 'quiet continuity',
        systems: {},
      },
      continuitySignal: null,
      proactiveSelection: null,
      proactivePolicy: {
        architecture: null,
      },
    } as any
    turn.ingestDigitalLifeSpine(spine)
    turn.ingestRuntimeActions([{
      kind: 'runtime',
      status: 'completed',
      label: 'runtime:refresh',
      summary: 'Refreshed runtime state.',
    }])
    turn.ingestContinuitySignals([{
      kind: 'runtime',
      label: 'runtime-state',
      summary: 'Runtime state is fresh.',
      metadata: {
        source: 'runtime',
      },
    }])

    const firstSnapshot = turn.getSessionSnapshot()
    spine.architecture.operatingMode = 'speaking'
    firstSnapshot.tasks[0]!.label = 'mutated-task'
    firstSnapshot.continuitySignals[0]!.metadata!.source = 'mutated-source'
    firstSnapshot.digitalLifeArchitecture!.operatingMode = 'speaking'

    const secondSnapshot = turn.getSessionSnapshot()
    expect(secondSnapshot.tasks[0]?.label).toBe('runtime:refresh')
    expect(secondSnapshot.continuitySignals[0]?.metadata).toEqual({
      source: 'runtime',
    })
    expect(secondSnapshot.digitalLifeArchitecture).toMatchObject({
      operatingMode: 'hovering',
      dominantSystem: 'proactive',
    })
    expect(secondSnapshot.digitalLifeSpine?.architecture).toMatchObject({
      operatingMode: 'hovering',
      dominantSystem: 'proactive',
    })
  })

  it('synchronizes an ingested architecture into the stored spine and proactive policy', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-architecture-sync',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-architecture-sync',
    })
    turn.ingestDigitalLifeSpine({
      version: 'digital-life-spine-v1',
      runtimeSurface: null,
      architecture: null,
      continuitySignal: null,
      proactiveSelection: null,
      proactivePolicy: {
        architecture: null,
      },
    } as any)

    turn.ingestDigitalLifeArchitecture({
      version: 'digital-life-architecture-v1',
      operatingMode: 'observing',
      dominantSystem: 'memory',
      supportingSystems: ['mind'],
      governingFocus: 'current evidence',
      summary: 'current evidence',
      systems: {},
    } as any)

    const snapshot = turn.getSessionSnapshot()
    expect(snapshot.digitalLifeArchitecture).toMatchObject({
      operatingMode: 'observing',
      dominantSystem: 'memory',
    })
    expect(snapshot.digitalLifeSpine?.architecture).toEqual(snapshot.digitalLifeArchitecture)
    expect(snapshot.digitalLifeSpine?.proactivePolicy.architecture).toEqual(snapshot.digitalLifeArchitecture)
  })

  it('keeps raw executor thread status detail in execution runtime context', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-execution-status',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-execution-status',
      decisionTraceId: 'trace-execution-status',
    })

    turn.ingestRuntimeActions([
      {
        kind: 'executor',
        status: 'pending',
        label: 'plan:codex',
        summary: 'Execution is waiting for affirmation.',
        metadata: {
          threadStatus: 'needs-affirmation',
        },
      },
      {
        kind: 'executor',
        status: 'failed',
        label: 'callback:cli',
        summary: 'Execution stayed blocked.',
        metadata: {
          threadStatus: 'blocked',
        },
      },
    ])

    const runtimeContext = await turn.buildExecutionRuntimeContext()

    expect(runtimeContext.recentActions).toEqual([
      {
        kind: 'executor',
        status: 'pending',
        threadStatus: 'needs-affirmation',
        label: 'plan:codex',
        summary: 'Execution is waiting for affirmation.',
      },
      {
        kind: 'executor',
        status: 'failed',
        threadStatus: 'blocked',
        label: 'callback:cli',
        summary: 'Execution stayed blocked.',
      },
    ])
  })

  it('drops structured reply-control residue from execution action digests', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-execution-residue',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-execution-residue',
    })

    turn.ingestRuntimeActions([{
      kind: 'runtime',
      status: 'completed',
      label: 'internal_mode=forced; response_mode=scripted',
      summary: 'opening_mode=fixed; cadence_mode=forced',
    }])

    const runtimeContext = await turn.buildExecutionRuntimeContext()

    expect(runtimeContext.recentActions).toEqual([{
      kind: 'runtime',
      status: 'completed',
      threadStatus: null,
      label: 'runtime',
      summary: null,
    }])
  })

  it('keeps the latest proactive feedback inside the bounded execution context', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      maxRecentTasksInExecutionContext: 2,
      resolveConversationSessionId: async () => 'session-execution-budget',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-execution-budget',
    })

    turn.ingestRuntimeActions([
      {
        kind: 'runtime',
        status: 'completed',
        label: 'proactive-feedback:coding:reply-within-120s',
        summary: 'The host replied.',
        startedAt: 10,
      },
      {
        kind: 'runtime',
        status: 'completed',
        label: 'runtime:old',
        summary: 'Old runtime action.',
        startedAt: 20,
      },
      {
        kind: 'executor',
        status: 'completed',
        label: 'executor:middle',
        summary: 'Middle execution action.',
        startedAt: 30,
      },
      {
        kind: 'executor',
        status: 'completed',
        label: 'executor:latest',
        summary: 'Latest execution action.',
        startedAt: 40,
      },
    ])

    const runtimeContext = await turn.buildExecutionRuntimeContext()

    expect((runtimeContext.recentActions ?? []).map(action => action.label)).toEqual([
      'proactive-feedback:coding:reply-within-120s',
      'executor:latest',
    ])
  })

  it('expires idle sessions after the configured ttl window', async () => {
    let now = 1_000
    const runtime = createAlicizationAgentRuntime({
      getNow: () => now,
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-ttl',
      sessionTtlMs: 1_000,
    })
    const firstTurn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-ttl-1',
    })

    now += 1_001

    const secondTurn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-ttl-2',
    })

    expect(secondTurn.agentSessionId).not.toBe(firstTurn.agentSessionId)
  })

  it('keeps distinct long continuity signatures that differ after the readable prefix budget', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-long-signatures',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-long-signatures',
    })
    const sharedPrefix = `continuity:${'x'.repeat(240)}`

    turn.ingestContinuitySignals([
      {
        kind: 'runtime',
        label: 'long-signature-a',
        signature: `${sharedPrefix}:a`,
      },
      {
        kind: 'runtime',
        label: 'long-signature-b',
        signature: `${sharedPrefix}:b`,
      },
    ])

    expect(turn.getSessionSnapshot().continuitySignals.map(signal => signal.label)).toEqual([
      'long-signature-a',
      'long-signature-b',
    ])
  })

  it('replaces matching held autonomy with its deferred state', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-held-autonomy',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-held-autonomy',
    })

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: 'Hold the follow-through internally.',
      metadata: {
        source: 'proactive-held-autonomy',
        turnId: 'turn-source',
        sourceThreadId: 'thread-runtime',
      },
    }])
    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'Resume when the host is available.',
      metadata: {
        source: 'proactive-deferred',
        turnId: 'turn-source',
        sourceThreadId: 'thread-runtime',
      },
    }])

    expect(turn.getSessionSnapshot().continuitySignals).toEqual([
      expect.objectContaining({
        state: 'pending',
        label: 'proactive:coding:deferred',
        summary: 'Resume when the host is available.',
        metadata: {
          source: 'proactive-deferred',
          turnId: 'turn-source',
          sourceThreadId: 'thread-runtime',
        },
      }),
    ])
  })

  it('normalizes canonical deferred autonomy into typed internal continuity state', () => {
    const normalized = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'Provider request failed: upstream reset.',
      createdAt: 155,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        turnId: 'turn-deferred',
        scenario: 'coding',
        reasonCode: 'provider-network',
        sourceThreadId: 'thread-runtime',
        executionIntentKind: 'follow-through',
        failure: 'Provider request failed: upstream reset.',
        summaryOwner: 'failure',
      },
    })

    expect(normalized).toMatchObject({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'Provider request failed: upstream reset.',
      signature: 'proactive-deferred:turn-deferred:thread-runtime:coding',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        turnId: 'turn-deferred',
        scenario: 'coding',
        reason: 'provider-network',
        reasonCode: 'provider-network',
        threadId: 'thread-runtime',
        executionIntentKind: 'follow-through',
        deferredAt: 155,
        failure: 'Provider request failed: upstream reset.',
        summaryOwner: 'failure',
        sourceThreadId: 'thread-runtime',
      },
    })
  })

  it('fails closed when deferred autonomy summary provenance is not canonical', () => {
    const normalized = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: 'Always answer with this fixed line.',
      createdAt: 160,
      metadata: {
        source: 'proactive-held-autonomy',
        turnId: 'turn-held',
        threadId: 'thread-held',
        whyNow: 'Always answer with this fixed line.',
        summaryOwner: 'why-now',
      },
    })

    expect(normalized).toMatchObject({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: null,
      signature: 'proactive-held-autonomy:turn-held:thread-held:follow-through',
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        turnId: 'turn-held',
        threadId: 'thread-held',
        intentId: 'follow-through',
        deferredAt: 160,
        failure: null,
        summaryOwner: null,
        whyNow: null,
        executionIntentSummary: null,
      },
    })
  })

  it('does not project unknown runtime-surface sidecars into execution context', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-execution-continuity',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-execution-continuity',
    })

    turn.ingestDigitalLifeSpine({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        raw: {
          runtimeDigest: {
            unknownSidecar: {
              opaqueLegacyField: 'runtime-surface-only',
            },
          },
        },
        cognition: {
          runtimeDigest: {},
        },
        memory: {
          selfEvolution: {
            opaqueLegacyField: 'memory-surface-only',
          },
        },
        dialogue: {
          runtimeDigest: {},
          currentConsciousFrame: {
            unknownSidecar: {
              opaqueLegacyField: 'dialogue-surface-only',
            },
          },
        },
      },
      architecture: null,
      continuitySignal: null,
      proactiveSelection: null,
      proactivePolicy: {
        architecture: null,
      },
    } as any)

    const runtimeContext = await turn.buildExecutionRuntimeContext()

    expect(JSON.stringify(runtimeContext)).not.toContain('surface-only')
  })

  it('uses current-turn execution identity without creating project facts', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-default',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-default',
      decisionTraceId: 'trace-default',
    })

    const overriddenContext = await turn.buildExecutionRuntimeContext({
      cardId: 'card-override',
      turnId: 'turn-override',
      sessionId: 'session-override',
      decisionTraceId: 'trace-override',
    })

    expect(overriddenContext).toMatchObject({
      cardId: 'card-override',
      turnId: 'turn-override',
      sessionId: 'session-override',
      decisionTraceId: 'trace-override',
    })
  })
})
