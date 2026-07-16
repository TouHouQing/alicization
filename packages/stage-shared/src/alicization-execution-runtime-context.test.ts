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

describe('alicization execution runtime context', () => {
  it('normalizes grounded execution facts without inventing a project briefing', () => {
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
      projectBriefing: null,
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

  it('keeps explicit execution status and bounded enums while dropping persona and reply-governance prose', () => {
    const context = normalizeAlicizationExecutionRuntimeContext(createRawContext({
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        landedProgressSummary: 'The requested operation has started.',
        openClosureSummary: 'The operation is waiting for a provider result.',
        nextClosureTargetSummary: 'Collect the provider result.',
        sameHerSelfLine: 'Keep one living line.',
        sameHerHoldDetail: 'same-her hold: keep this reply inward.',
        continuityArcStage: 'same-thread-continuation',
        sameHerDriftRisk: 'Do not become a generic assistant.',
        proactiveSameHerGap: 'Keep proactive continuity explicit.',
        companionBriefingLine: 'Stay gentle before answering.',
        emotionalClosureSummary: 'Do not reopen from scratch.',
        continuityRestraint: 'measured-return',
        continuityCue: 'continuity state: keep this line inward.',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        preflightSummary: 'Before acting, remember the same project.',
        preDialogueAwarenessLine: 'Before answering, remember the same digital life.',
        preDialogueAwarenessSummary: 'Keep the same-her line visible.',
      },
    }))

    expect(context?.projectBriefing).toEqual({
      identity: null,
      currentPhase: null,
      latestLandedProgress: 'The requested operation has started.',
      primaryOpenLoop: 'The operation is waiting for a provider result.',
      nextClosureTarget: 'Collect the provider result.',
      sameHerSelfLine: null,
      sameHerHoldDetail: null,
      continuityArcStage: 'same-thread-continuation',
      sameHerDriftRisk: null,
      proactiveSameHerGap: null,
      companionBriefingLine: null,
      emotionalClosureSummary: null,
      continuityRestraint: 'measured-return',
      continuityCue: null,
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      preflightSummary: null,
      preDialogueAwarenessLine: null,
      preDialogueAwarenessSummary: null,
    })
  })

  it('drops a project briefing that contains only persona and reply-governance fields', () => {
    const context = normalizeAlicizationExecutionRuntimeContext(createRawContext({
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSelfLine: 'Keep one living line.',
        sameHerHoldDetail: 'same-her hold: keep this reply inward.',
        sameHerDriftRisk: 'Do not become a generic assistant.',
        proactiveSameHerGap: 'Keep proactive continuity explicit.',
        companionBriefingLine: 'Stay gentle before answering.',
        emotionalClosureSummary: 'Do not reopen from scratch.',
        continuityCue: 'continuity state: keep this line inward.',
        preflightSummary: 'Before acting, remember the same project.',
        preDialogueAwarenessLine: 'Before answering, remember the same digital life.',
      },
    }))

    expect(context?.projectBriefing).toBeNull()
  })

  it('renders provider-facing execution context as typed facts without fixed instruction sentences', () => {
    const block = buildAlicizationExecutionRuntimeContextBlock(createRawContext({
      projectBriefing: {
        landedProgressSummary: 'The requested operation has started.',
        openClosureSummary: 'The operation is waiting for a provider result.',
        nextClosureTargetSummary: 'Collect the provider result.',
        continuityArcStage: 'same-thread-continuation',
        continuityRestraint: 'measured-return',
        continuityPreferredTiming: 'next-open-window',
      },
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
      execution: {
        status: {
          latest: 'The requested operation has started.',
          open: 'The operation is waiting for a provider result.',
          next: 'Collect the provider result.',
        },
        continuity: {
          arcStage: 'same-thread-continuation',
          restraint: 'measured-return',
          preferredTiming: 'next-open-window',
        },
      },
      memoryClosureExecution: {
        authority: 'memory-os',
        shouldVerify: true,
      },
      sensory: {
        running: true,
        stale: false,
      },
    })
    expect(block).not.toMatch(/ALICIZATION_EXECUTION_RUNTIME_CONTEXT|Treat this as|If the live UI|Before (?:answering|speaking|acting)|same-her|local-first digital life project/iu)
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
