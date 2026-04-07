import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationAgentRuntime } from './agent-runtime'
import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import { buildAlicizationDigitalLifeRuntimeSurface, commitAlicizationDigitalLifeMindState } from './digital-life-kernel'
import { deriveAlicizationDigitalLifeSpine } from './digital-life-spine'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

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
  it('reuses the same agent session across turns and carries recent runtime actions into the session block', async () => {
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
    secondTurn.ingestRuntimeActions([{
      kind: 'executor',
      status: 'completed',
      label: 'callback:cli',
      summary: 'Completed Run the CLI check command: all tests passed',
      signature: 'thread-1:event-result-1',
    }, {
      kind: 'executor',
      status: 'completed',
      label: 'callback:cli',
      summary: 'Completed Run the CLI check command: all tests passed',
      signature: 'thread-1:event-result-1',
    }])
    secondTurn.ingestContinuitySignals([{
      kind: 'presence',
      state: 'observed',
      label: 'digital-life-line',
      summary: 'watch=symbiotic-vision | scene=coding | mode=tracking | thread=digital life continuity | answer=guide | presence=attentive',
      signature: 'digital-life-line:trace-2',
      metadata: {
        source: 'digital-life-runtime',
      },
    }, {
      kind: 'presence',
      state: 'observed',
      label: 'digital-life-line',
      summary: 'watch=symbiotic-vision | scene=dialogue | mode=repairing | thread=latest digital life continuity | answer=repair | presence=attentive',
      signature: 'digital-life-line:trace-2:latest',
      metadata: {
        source: 'digital-life-runtime',
      },
    }, {
      kind: 'execution-callback',
      state: 'fresh',
      label: 'callback:cli',
      summary: 'Completed Run the CLI check command: all tests passed',
      signature: 'thread-1:event-result-1',
    }, {
      kind: 'execution-callback',
      state: 'fresh',
      label: 'callback:cli',
      summary: 'Completed Run the CLI check command: all tests passed',
      signature: 'thread-1:event-result-1',
    }])
    const digitalLifeState = commitAlicizationDigitalLifeMindState({
      now: 2_000,
      previousState: createDefaultVisualPresenceState(1_000),
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'runtime.ts',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 1_500,
        lastSeenAt: 2_000,
      } as any,
      attention: null,
      mindState: {
        worldModel: {
          activeThread: {
            id: 'thread-runtime',
            kind: 'problem',
            title: 'digital life continuity',
            summary: 'Keep one runtime line.',
            status: 'active',
            source: 'grounded-scene',
            significance: 0.86,
            confidence: 0.82,
            unresolved: true,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            seenNow: [],
            inferredNow: [],
            openQuestions: [],
            staleRisks: [],
          },
          continuity: {
            label: 'same-thread',
            sceneAgeMs: 250,
            attentionAgeMs: 250,
            sameSceneAsBefore: true,
            sameAttentionAsBefore: true,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'focused',
            burden: 'moderate',
          },
          updatedAt: 2_000,
        } as any,
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          worldPressure: 0.74,
          epistemicPressure: 0.81,
          relationalPressure: 0.28,
          carePressure: 0.2,
          continuityPressure: 0.69,
          speakReadiness: 0.76,
          presenceWeight: 0.61,
          narrative: ['same runtime line'],
          updatedAt: 2_000,
        } as any,
        dialogueEncounter: {
          act: 'ask-help',
          responseNeed: 'guide',
          truthExpectation: 'strict',
          subject: 'task-knot',
          screenReferenceMode: 'helpful',
          continuityMode: 'task-first',
          inspectionRequested: false,
          inspectionState: 'dialogue-first',
          releaseInspectionCarry: false,
          taskAnchor: 'runtime line',
          summary: 'Answer from the runtime line.',
          dialogueFirst: false,
          shouldBypassScreenRepair: false,
          mustRepairFirst: false,
          mustAnswerDirectly: true,
          mustStayTaskBound: true,
          shouldAskClarifyingQuestion: false,
          personaKernelMode: 'backgrounded',
          confidence: 0.9,
          reasonTags: ['runtime-line'],
        } as any,
        replyDeliberation: {
          selectedMotive: 'guide',
          speakingFrom: 'task-thread',
          memoryMode: 'thread-carry',
          openingBeat: 'answer directly',
          whyThisReplyNow: 'The runtime line is active.',
          whyNotOtherCandidates: [],
          withheldImpulses: [],
          candidateMotives: [],
          shouldSpeak: true,
          mustInclude: [],
          mustAvoid: [],
          confidence: 0.86,
          narrative: ['speak from the runtime line'],
          updatedAt: 2_000,
        } as any,
        answerPlanner: {
          act: 'guide',
          evidenceMode: 'strict',
          confidence: 0.87,
          governingFocus: 'keep one runtime line',
          openingMove: 'answer-directly',
          answerIntent: 'guide',
          relationshipPosture: 'restrained',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          mustDo: [],
          mustNotDo: [],
          narrative: ['one runtime line'],
          updatedAt: 2_000,
        } as any,
        initiative: {
          selectedAction: 'speak',
          confidence: 0.7,
          motives: {},
          speakDrive: 0.72,
          silenceDrive: 0.2,
          preferredStyle: 'light-nudge',
          preferredPresence: 'attentive',
          why: 'Surface the runtime line.',
          shouldSurface: true,
          shouldSpeak: true,
        } as any,
        actionEcology: {
          mode: 'surface-care',
          selectedThreadId: 'thread-runtime',
          readiness: 0.79,
          surfacePressure: 0.75,
          silencePressure: 0.18,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          shouldSurface: true,
          shouldSpeak: true,
          why: 'The runtime seam is stable enough to surface.',
          updatedAt: 2_000,
        } as any,
        privateThought: {
          stance: 'observe',
          confidence: 0.62,
          rationaleTags: ['runtime-line'],
          thoughtText: 'keep the same runtime line',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: 20_000,
          afterglowFromScenario: null,
          emotionalTension: 'focused-flow',
        } as any,
      },
      captureState: {
        permission: 'granted',
        health: 'healthy',
        lastGroundedAt: 1_980,
      } as any,
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 30_000,
    })
    secondTurn.ingestDigitalLifeSpine(deriveAlicizationDigitalLifeSpine(digitalLifeState))
    secondTurn.ingestDigitalLifeArchitecture(buildAlicizationDigitalLifeArchitecture(
      buildAlicizationDigitalLifeRuntimeSurface(digitalLifeState),
    ))

    const runtimeContext = await secondTurn.buildExecutionRuntimeContext()
    const sessionSnapshot = secondTurn.getSessionSnapshot()

    expect(secondTurn.agentSessionId).toBe(firstTurn.agentSessionId)
    expect(runtimeContext.sessionId).toBe('session-1')
    expect(runtimeContext.agentSessionId).toBe(firstTurn.agentSessionId)
    expect(runtimeContext.recentActions).toEqual([
      {
        kind: 'executor',
        status: 'completed',
        label: 'executor:openclaw',
        summary: 'Closed the blocking popup.',
      },
      {
        kind: 'executor',
        status: 'completed',
        label: 'callback:cli',
        summary: 'Completed Run the CLI check command: all tests passed',
      },
    ])
    expect(sessionSnapshot.continuitySignals).toEqual([
      expect.objectContaining({
        kind: 'presence',
        state: 'observed',
        label: 'digital-life-line',
        summary: 'watch=symbiotic-vision | scene=dialogue | mode=repairing | thread=latest digital life continuity | answer=repair | presence=attentive',
      }),
      expect.objectContaining({
        kind: 'execution-callback',
        state: 'fresh',
        label: 'callback:cli',
        summary: 'Completed Run the CLI check command: all tests passed',
      }),
    ])
    expect(sessionSnapshot.digitalLifeArchitecture).toEqual(expect.objectContaining({
      operatingMode: 'speaking',
      dominantSystem: 'dialogue',
    }))
    expect(sessionSnapshot.digitalLifeSpine).toEqual(expect.objectContaining({
      version: 'digital-life-spine-v1',
      architecture: expect.objectContaining({
        operatingMode: 'speaking',
        dominantSystem: 'dialogue',
      }),
      continuitySignal: expect.objectContaining({
        label: 'digital-life-line',
      }),
    }))
    expect(secondTurn.buildSessionSystemBlock()).toContain('digital_life_line=watch=symbiotic-vision | scene=coding | mode=tracking')
    expect(secondTurn.buildSessionSystemBlock()).toContain('memory_fabric=none')
    expect(secondTurn.buildSessionSystemBlock()).toContain('memory_carry=mode=quiet')
    expect(secondTurn.buildSessionSystemBlock()).toContain('[ALICIZATION_DIGITAL_LIFE_ARCHITECTURE]')
    expect(secondTurn.buildSessionSystemBlock()).toContain('dominant_system=dialogue')
    expect(secondTurn.buildSessionSystemBlock()).toContain('session_continuity_inbox:')
    expect(secondTurn.buildSessionSystemBlock()).toContain('[OBSERVED] presence digital-life-line')
    expect(secondTurn.buildSessionSystemBlock()).toContain('[FRESH] execution-callback callback:cli')
    expect(secondTurn.buildSessionSystemBlock()).toContain('Closed the blocking popup.')
    expect(secondTurn.buildSessionSystemBlock()).toContain('Completed Run the CLI check command: all tests passed')
    expect(secondTurn.buildSessionSystemBlock()).toContain('foreground_window=Cursor | cursor | airi-alice')
    expect(getSensorySnapshot).toBeCalledTimes(2)
  })

  it('expires idle sessions after the configured ttl window', async () => {
    let now = 1_000
    const runtime = createAlicizationAgentRuntime({
      getNow: () => now,
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-ttl',
      sessionTtlMs: 100,
    })

    const firstTurn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-ttl-1',
    })

    now += 1_250

    const secondTurn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-ttl-2',
    })

    expect(secondTurn.agentSessionId).not.toBe(firstTurn.agentSessionId)
  })
})
