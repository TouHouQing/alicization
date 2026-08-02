import { describe, expect, it } from 'vitest'

import {
  buildAlicizationExecutionRuntimeContextBlock,
  normalizeAlicizationExecutionRuntimeContext,
} from './alicization-execution-runtime-context'

function createRawContext(overrides: Record<string, unknown> = {}) {
  return {
    generatedAt: 1_710_000_000_000,
    cardId: 'default',
    turnId: 'turn-ctx-1',
    decisionTraceId: 'trace-ctx-1',
    sessionId: 'session-ctx-1',
    agentSessionId: 'agent-session-ctx-1',
    recentActions: [],
    sensory: {
      collectedAt: 1_710_000_000_123,
      running: true,
      stale: false,
      ageMs: 33,
      foregroundWindow: {
        appName: 'Cursor',
        processName: 'cursor',
        title: 'airi-alice',
      },
      capture: {
        health: 'healthy',
        permission: 'granted',
        sourceCount: 2,
        lastUpdatedAt: 1_710_000_000_100,
        lastError: null,
        degradedReasons: [],
      },
    },
    ...overrides,
  }
}

function parseFactBlock(block: string) {
  return JSON.parse(block) as {
    type?: unknown
    data?: Record<string, any>
  }
}

function createAffectiveResidue() {
  return {
    version: 'affective-residue-memory-v1',
    updatedAt: 1_710_000_000_200,
    residues: [],
    dominantResidueKind: 'afterglow',
    afterglowPressure: 0.58,
    repairPressure: 0.22,
    burdenPressure: 0.14,
    trustPressure: 0.64,
    restProtectivePressure: 0.18,
    relationshipCadence: {
      cadenceMode: 'ready-return',
      distancePosture: 'nearby-soft',
      companionshipDensity: 0.4,
      repairRecovery: 0.68,
      overreachRisk: 0.12,
      fatigueGuard: 0.18,
      afterglowCarry: 0.58,
      shouldDelayWarmth: false,
      shouldProtectRest: false,
      reasonTags: ['execution-feedback'],
      summary: 'Provider callback completed with grounded evidence.',
    },
    sourceSignals: ['provider callback completed'],
    summary: 'Grounded execution afterglow remains available.',
  }
}

describe('alicization execution runtime context', () => {
  it('normalizes grounded execution facts without restoring the retired project briefing field', () => {
    const context = normalizeAlicizationExecutionRuntimeContext(createRawContext({
      recentActions: [{
        kind: 'executor',
        status: 'pending',
        threadStatus: 'needs-affirmation',
        label: 'plan:codex',
        summary: 'Waiting for host affirmation.',
      }],
    }))

    expect(context).toMatchObject({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-1',
      decisionTraceId: 'trace-ctx-1',
      sessionId: 'session-ctx-1',
      agentSessionId: 'agent-session-ctx-1',
      recentActions: [{
        kind: 'executor',
        status: 'pending',
        threadStatus: 'needs-affirmation',
        label: 'plan:codex',
        summary: 'Waiting for host affirmation.',
      }],
      sensory: {
        running: true,
        stale: false,
        ageMs: 33,
        foregroundWindow: {
          appName: 'Cursor',
          processName: 'cursor',
          title: 'airi-alice',
        },
      },
    })
  })

  it('preserves grounded affective and memory closure facts', () => {
    const context = normalizeAlicizationExecutionRuntimeContext(createRawContext({
      affectiveResidue: createAffectiveResidue(),
      memoryClosureExecution: {
        authority: 'memory-os',
        carry: 'The callback result belongs to the active memory thread.',
        nextLearningAction: 'verify',
        shouldVerify: true,
        shouldReflect: false,
        activeLearningFocuses: ['callback evidence'],
        reasonTags: ['execution-feedback'],
        closureState: {
          state: 'open',
          open: true,
          revisionRequired: false,
          shouldLabelUncertainty: true,
          visibleCarryMode: 'gist',
          retrievalQuality: 'grounded',
          conflictPressure: 'low',
        },
      },
    }))

    expect(context).toMatchObject({
      affectiveResidue: {
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.58,
        trustPressure: 0.64,
        relationshipCadence: {
          cadenceMode: 'ready-return',
          shouldDelayWarmth: false,
        },
      },
      memoryClosureExecution: {
        authority: 'memory-os',
        carry: 'The callback result belongs to the active memory thread.',
        nextLearningAction: 'verify',
        shouldVerify: true,
        activeLearningFocuses: ['callback evidence'],
      },
      sensory: {
        running: true,
        stale: false,
      },
    })
  })

  it('renders provider-facing execution context as typed facts without fixed instruction sentences', () => {
    const block = buildAlicizationExecutionRuntimeContextBlock(createRawContext({
      affectiveResidue: createAffectiveResidue(),
      recentActions: [{
        kind: 'executor',
        status: 'completed',
        threadStatus: 'completed',
        label: 'callback:cli',
        summary: 'Provider callback completed.',
      }],
      memoryClosureExecution: {
        authority: 'memory-os',
        carry: 'The callback result belongs to the active memory thread.',
        nextLearningAction: 'verify',
        shouldVerify: true,
        shouldReflect: false,
        activeLearningFocuses: ['callback evidence'],
        reasonTags: ['execution-feedback'],
        closureState: {
          state: 'open',
          open: true,
          revisionRequired: false,
          shouldLabelUncertainty: true,
          visibleCarryMode: 'gist',
          retrievalQuality: 'grounded',
          conflictPressure: 'low',
        },
      },
    }))
    const factBlock = parseFactBlock(block)

    expect(factBlock.type).toBe('alicization-execution-runtime-context')
    expect(factBlock.data).toMatchObject({
      version: 'alicization-execution-runtime-context-v1',
      owners: {
        shortTerm: 'WorkingMemory',
        longTermRecall: 'LongTermMemoryRecall',
      },
      failureSurface: 'transparent',
      affective: {
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.58,
        trustPressure: 0.64,
        cadenceMode: 'ready-return',
      },
      memoryClosureExecution: {
        authority: 'memory-os',
        shouldVerify: true,
      },
      recentActions: [{
        kind: 'executor',
        status: 'completed',
        threadStatus: 'completed',
        label: 'callback:cli',
        summary: 'Provider callback completed.',
      }],
      sensory: {
        running: true,
        stale: false,
      },
    })
    expect(factBlock.data).not.toHaveProperty('execution')
    expect(block).not.toMatch(/ALICIZATION_EXECUTION_RUNTIME_CONTEXT|Treat this as|If the live UI|Before (?:answering|speaking|acting)|continuity|local-first digital life project/iu)
  })

  it('preserves raw thread status and capture failure facts without turning them into reply instructions', () => {
    const block = buildAlicizationExecutionRuntimeContextBlock(createRawContext({
      recentActions: [{
        kind: 'executor',
        status: 'failed',
        threadStatus: 'blocked',
        label: 'callback:cli',
        summary: 'Provider callback failed.',
      }],
      sensory: {
        collectedAt: 1_710_000_000_123,
        running: true,
        stale: true,
        ageMs: 4800,
        foregroundWindow: null,
        capture: {
          health: 'degraded',
          permission: 'granted',
          sourceCount: 1,
          lastUpdatedAt: 1_710_000_000_100,
          lastError: 'thumbnail stale',
          degradedReasons: ['window-thumbnail-stale'],
        },
      },
    }))
    const data = parseFactBlock(block).data!

    expect(data.recentActions).toEqual([{
      kind: 'executor',
      status: 'failed',
      threadStatus: 'blocked',
      label: 'callback:cli',
      summary: 'Provider callback failed.',
    }])
    expect(data.sensory).toMatchObject({
      stale: true,
      regroundRequired: true,
      capture: {
        health: 'degraded',
        lastError: 'thumbnail stale',
        degradedReasons: ['window-thumbnail-stale'],
      },
    })
  })
})
