import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'

import { describe, expect, it, vi } from 'vitest'

import { createAlicizationAgentRuntime } from './agent-runtime'
import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import { buildAlicizationDigitalLifeRuntimeSurface, commitAlicizationDigitalLifeMindState } from './digital-life-kernel'
import { deriveAlicizationDigitalLifeSpine } from './digital-life-spine'
import { deferredAutonomyProviderMetadataSchema } from './runtime-deferred-autonomy-summary'
import { normalizeDeferredAutonomyContinuitySignal } from './runtime-subconscious-tick'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

const deferredAutonomyCanonicalVersion = 'deferred-autonomy-v1'

function expectStringLeavesNotToMatch(value: unknown, pattern: RegExp) {
  if (typeof value === 'string') {
    expect(value).not.toMatch(pattern)
    return
  }
  if (Array.isArray(value)) {
    value.forEach(item => expectStringLeavesNotToMatch(item, pattern))
    return
  }
  if (value && typeof value === 'object')
    Object.values(value).forEach(item => expectStringLeavesNotToMatch(item, pattern))
}

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

function parseAgentSessionFactBlock(block: string) {
  const parsed = JSON.parse(block) as {
    type?: unknown
    data?: Record<string, any>
  }

  expect(parsed.type).toBe('alicization-agent-session')
  expect(parsed.data).toMatchObject({
    version: 'alicization-agent-session-v1',
    owners: {
      longTermRecall: 'LongTermMemoryRecall',
      shortTerm: 'WorkingMemory',
    },
  })
  return parsed.data!
}

describe('alicization agent runtime', () => {
  it('keeps quiet memory and initiative state as typed agent-session facts', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-digest-only-same-her',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-digest-only-same-her',
      decisionTraceId: 'trace-digest-only-same-her',
    })

    turn.ingestDigitalLifeSpine({
      version: 'digital-life-spine-v1',
      runtimeSurface: undefined,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
      runtime: {
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneSummary: 'later coding seam after a noisy callback detour',
        activeThreadId: 'thread-quiet-same-line',
        activeThreadTitle: 'later coding seam',
        dominantMode: 'tracking',
        dominantDrive: 'understand',
        answerIntent: 'guide',
        preferredPresence: 'hesitant',
        selectedAction: 'wait',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        updatedAt: 86,
      },
      architecture: {
        version: 'digital-life-architecture-v1',
        operatingMode: 'hovering',
        dominantSystem: 'proactive',
        supportingSystems: ['mind', 'memory'],
        governingFocus: 'keep the same callback line alive quietly',
        summary: 'mode=hovering | dominant=proactive | focus=keep the same callback line alive quietly',
        systems: {} as any,
      },
      continuitySignal: {
        label: 'same-thread-hover-return',
        summary: 'same-thread-continuation still active as a measured-return hover-first resident presence after the noisy detour | timing=next-open-window | cadence=measured-return',
        signature: 'agent-runtime-digest-only-same-her',
        createdAt: 86,
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        activeThreadId: 'thread-quiet-same-line',
        dominantMode: 'tracking',
        dominantDrive: 'understand',
        answerIntent: 'guide',
        preferredPresence: 'hesitant',
      },
      proactive: {
        selectedAction: 'wait',
        preferredStyle: 'silent-observe',
        confidence: 0.91,
        shouldSpeak: false,
        activeThreadId: 'thread-quiet-same-line',
        activeThreadTitle: 'later coding seam',
        dominantConcernKind: 'same-thread-continuation',
        dominantConcernSummary: 'keep the same callback line alive quietly after the noisy detour',
        leadingGoalId: null,
        leadingGoalSummary: null,
        preferredPresence: 'hesitant',
      },
      memory: {
        summary: 'identity-continuity',
        recallMode: 'quiet',
      },
    } as any)

    const block = turn.buildSessionSystemBlock()

    const data = parseAgentSessionFactBlock(block)

    expect(data.digitalLife).toMatchObject({
      continuityArcStage: 'same-thread-continuation',
      initiativeRestraint: 'same-thread-continuation',
      presence: {
        mode: 'hovering',
        shouldSpeak: false,
        style: 'silent-observe',
      },
      runtime: {
        shouldAct: false,
        shouldSpeak: false,
      },
    })
    expect(data.memory).toMatchObject({
      carry: {
        mode: 'quiet',
      },
      recallMode: 'quiet',
      summary: 'identity-continuity',
    })
    expect(block).not.toContain('[ALICIZATION_AGENT_SESSION]')
    expect(block).not.toContain('Treat session continuity inbox items as carried-over session events')
  })

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
        threadStatus: null,
        label: 'executor:openclaw',
        summary: 'Closed the blocking popup.',
      },
      {
        kind: 'executor',
        status: 'completed',
        threadStatus: null,
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
    const sessionFacts = parseAgentSessionFactBlock(secondTurn.buildSessionSystemBlock())

    expect(sessionFacts.digitalLife).toMatchObject({
      architecture: {
        dominantSystem: 'dialogue',
        operatingMode: 'speaking',
      },
    })
    expect(sessionFacts.memory.carry.mode).toBe('quiet')
    expect(sessionFacts.continuitySignals).toEqual([
      expect.objectContaining({
        kind: 'presence',
        state: 'observed',
        label: 'digital-life-line',
        summary: null,
      }),
      expect.objectContaining({
        kind: 'execution-callback',
        state: 'fresh',
        summary: 'Completed Run the CLI check command: all tests passed',
      }),
    ])
    expect(sessionFacts.recentActions).toEqual([
      expect.objectContaining({
        label: 'executor:openclaw',
        summary: 'Closed the blocking popup.',
      }),
      expect.objectContaining({
        label: 'callback:cli',
        summary: 'Completed Run the CLI check command: all tests passed',
      }),
    ])
    expect(sessionFacts.sensory.foregroundWindow).toEqual({
      appName: 'Cursor',
      processName: 'cursor',
      title: 'airi-alice',
    })
    expect(getSensorySnapshot).toBeCalledTimes(2)
  })

  it('keeps raw executor thread status visible in the session block even when recent runtime actions are compacted into pending or failed buckets', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-executor-status-detail',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-executor-status-detail',
      decisionTraceId: 'trace-executor-status-detail',
    })

    turn.ingestRuntimeActions([{
      kind: 'executor',
      status: 'pending',
      label: 'plan:codex',
      summary: 'Execution is waiting for affirmation before codex can act on the current unresolved line.',
      signature: 'thread-needs-affirmation:event-plan',
      metadata: {
        source: 'task-planning',
        threadId: 'thread-needs-affirmation',
        threadStatus: 'needs-affirmation',
      },
    }, {
      kind: 'executor',
      status: 'failed',
      label: 'callback:cli',
      summary: 'Execution stayed blocked because the kill switch is suspended.',
      signature: 'thread-blocked:event-cancel',
      metadata: {
        source: 'execution-callback-runtime',
        threadId: 'thread-blocked',
        threadStatus: 'blocked',
      },
    }])

    const block = turn.buildSessionSystemBlock()

    const data = parseAgentSessionFactBlock(block)

    expect(data.recentActions).toEqual([
      expect.objectContaining({
        label: 'plan:codex',
        status: 'pending',
        threadStatus: 'needs-affirmation',
        summary: 'Execution is waiting for affirmation before codex can act on the current unresolved line.',
      }),
      expect.objectContaining({
        label: 'callback:cli',
        status: 'failed',
        threadStatus: 'blocked',
        summary: 'Execution stayed blocked because the kill switch is suspended.',
      }),
    ])
  })

  it('keeps raw executor thread status detail in execution runtime context so pre-dispatch same-her execution does not collapse into a generic pending shell', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-execution-runtime-context-detail',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-execution-runtime-context-detail',
      decisionTraceId: 'trace-execution-runtime-context-detail',
    })

    turn.ingestRuntimeActions([{
      kind: 'executor',
      status: 'pending',
      label: 'plan:codex',
      summary: 'Execution is waiting for affirmation before codex can act on the current unresolved line.',
      signature: 'thread-needs-affirmation:dispatch',
      metadata: {
        source: 'task-planning',
        threadId: 'thread-needs-affirmation',
        threadStatus: 'needs-affirmation',
      },
    }, {
      kind: 'executor',
      status: 'failed',
      label: 'callback:cli',
      summary: 'Execution stayed blocked because the kill switch is suspended.',
      signature: 'thread-blocked:result',
      metadata: {
        source: 'execution-callback-runtime',
        threadId: 'thread-blocked',
        threadStatus: 'blocked',
      },
    }])

    const runtimeContext = await turn.buildExecutionRuntimeContext()

    expect(runtimeContext.recentActions).toEqual([
      {
        kind: 'executor',
        status: 'pending',
        threadStatus: 'needs-affirmation',
        label: 'plan:codex',
        summary: 'Execution is waiting for affirmation before codex can act on the current unresolved line.',
      },
      {
        kind: 'executor',
        status: 'failed',
        threadStatus: 'blocked',
        label: 'callback:cli',
        summary: 'Execution stayed blocked because the kill switch is suspended.',
      },
    ])
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

  it('keeps a newer proactive reply-within-120s continuity line visible in the session block even when an older deferred proactive line is also still present', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-proactive-outcome-priority',
      maxContinuityInSystemBlock: 3,
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-proactive-outcome-priority',
      decisionTraceId: 'trace-proactive-outcome-priority',
    })

    turn.ingestContinuitySignals([
      {
        kind: 'presence',
        state: 'observed',
        label: 'presence:symbiotic-vision',
        summary: 'scene=main.ts - error | thread=main.ts - error | capture=unavailable/screen-capture-sources-empty | presence=hesitant',
        signature: 'presence:symbiotic-vision:1',
        createdAt: 100,
      },
      {
        kind: 'proactive',
        state: 'pending',
        label: 'proactive:coding:deferred',
        summary: 'no mind-authored visible reply was available | reason=proactive-visible-presence-without-utterance | Keep extending cross-modal identity-continuity',
        signature: 'proactive:deferred:1',
        createdAt: 110,
        metadata: {
          source: 'proactive-deferred',
        },
      },
      {
        kind: 'presence',
        state: 'observed',
        label: 'digital-life-line',
        summary: 'watch=symbiotic-vision | scene=coding | mode=tracking | motive=unfinished-thread-return',
        signature: 'digital-life-line:1',
        createdAt: 120,
        metadata: {
          source: 'digital-life-runtime',
        },
      },
      {
        kind: 'proactive',
        state: 'observed',
        label: 'proactive:coding:reply-within-120s',
        summary: 'host replied within 120s after a proactive turn | scenario=coding | continuity=same-thread-continuation | timing=next-open-window | cadence=measured-return | resident=quiet-companionship | continuity=quiet-same-her',
        signature: 'proactive:reply-within-120s:1',
        createdAt: 130,
        metadata: {
          source: 'proactive-feedback',
          timing: 'next-open-window',
          continuityArcStage: 'same-thread-continuation',
          continuityCadence: 'measured-return',
          residentMode: 'quiet-companionship',
        },
      },
    ] as any)

    const block = turn.buildSessionSystemBlock()

    const data = parseAgentSessionFactBlock(block)

    expect(data.continuitySignals).toEqual(expect.arrayContaining([
      expect.objectContaining({
        label: 'proactive:coding:deferred',
      }),
      expect.objectContaining({
        label: 'proactive:coding:reply-within-120s',
        summary: null,
        continuity: {
          arcStage: 'same-thread-continuation',
          cadence: 'measured-return',
          residentMode: 'quiet-companionship',
        },
        timing: 'next-open-window',
      }),
    ]))
  })

  it('keeps distinct long continuity signatures that differ after the readable prefix budget', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-long-continuity-signatures',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-long-continuity-signatures',
      decisionTraceId: 'trace-long-continuity-signatures',
    })
    const sharedSignaturePrefix = `continuity:${'x'.repeat(240)}`

    turn.ingestContinuitySignals([
      {
        kind: 'runtime',
        label: 'long-signature-a',
        signature: `${sharedSignaturePrefix}:a`,
      },
      {
        kind: 'runtime',
        label: 'long-signature-b',
        signature: `${sharedSignaturePrefix}:b`,
      },
    ])

    expect(turn.getSessionSnapshot().continuitySignals.map(signal => signal.label)).toEqual([
      'long-signature-a',
      'long-signature-b',
    ])
  })

  it('projects full pending continuity metadata when the summary is null', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-proactive-metadata',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-proactive-metadata',
      decisionTraceId: 'trace-proactive-metadata',
    })

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'Re-open the unresolved runtime break after the host is available.',
      signature: 'proactive:deferred:metadata',
      createdAt: 130,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'execution-intent',
        turnId: 'turn-proactive-source',
        scenario: 'coding',
        outcome: 'deferred',
        phase: 'pending',
        deliveredAt: 120,
        feedbackWindowMs: 120_000,
        learningAction: 'verify',
        learningFocuses: ['world-model', 'provider-recovery'],
        reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
        deferReason: 'busy-host',
        sourceThreadId: 'thread-runtime',
        sourceThoughtThreadId: 'thought-runtime',
        sourceConcernId: 'concern-runtime',
        executionIntentKind: 'follow-through',
        executionIntentSummary: 'Re-open the unresolved runtime break after the host is available.',
        targetThreadId: 'thread-runtime',
      },
    }] as any)

    const block = turn.buildSessionSystemBlock()
    const data = parseAgentSessionFactBlock(block)

    expect(data.continuitySignals).toEqual([
      expect.objectContaining({
        label: 'proactive:coding:deferred',
        summary: 'Re-open the unresolved runtime break after the host is available.',
        metadata: {
          canonicalVersion: deferredAutonomyCanonicalVersion,
          source: 'proactive-deferred',
          summaryOwner: 'execution-intent',
          turnId: 'turn-proactive-source',
          scenario: 'coding',
          outcome: 'deferred',
          phase: 'pending',
          deliveredAt: 120,
          feedbackWindowMs: 120_000,
          learningAction: 'verify',
          learningFocuses: ['world-model', 'provider-recovery'],
          reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
          deferReason: 'busy-host',
          sourceThreadId: 'thread-runtime',
          sourceThoughtThreadId: 'thought-runtime',
          sourceConcernId: 'concern-runtime',
          executionIntentKind: 'follow-through',
          executionIntentSummary: 'Re-open the unresolved runtime break after the host is available.',
          targetThreadId: 'thread-runtime',
        },
      }),
    ])
  })

  it.each([
    'proactive-deferred',
    'proactive-held-autonomy',
  ])('does not project legacy %s summary text without typed provenance', async (source) => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => `session-${source}-legacy-summary`,
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: `turn-${source}-legacy-summary`,
      decisionTraceId: `trace-${source}-legacy-summary`,
    })

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: source === 'proactive-deferred' ? 'pending' : 'observed',
      label: source === 'proactive-deferred'
        ? 'proactive:coding:deferred'
        : 'proactive:follow-through:held-autonomy',
      summary: 'Keep the same-her line before answering.',
      createdAt: 135,
      metadata: {
        source,
        executionIntentSummary: 'Same-her continuity must remain authoritative.',
      },
    }] as any)

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())

    expect(data.continuitySignals).toEqual([
      expect.objectContaining({
        summary: null,
        metadata: {
          source,
        },
      }),
    ])
  })

  it.each([
    {
      label: 'proactive:coding:deferred',
      state: 'pending',
    },
    {
      label: 'proactive:follow-through:held-autonomy',
      state: 'observed',
    },
  ] as const)('uses proactive label structure to gate legacy summaries without metadata source: $label', async ({ label, state }) => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => `session-${state}-legacy-label`,
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: `turn-${state}-legacy-label`,
      decisionTraceId: `trace-${state}-legacy-label`,
    })

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state,
      label,
      summary: 'Keep the same-her line before answering.',
      createdAt: 136,
      metadata: {
        threadId: 'thread-legacy-label',
        executionIntentSummary: 'Same-her continuity must remain authoritative.',
      },
    }] as any)

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())

    expect(data.continuitySignals).toEqual([
      expect.objectContaining({
        summary: null,
        metadata: {
          threadId: 'thread-legacy-label',
        },
      }),
    ])
  })

  it.each([
    {
      suffix: 'deferred',
      state: 'pending',
    },
    {
      suffix: 'held-autonomy',
      state: 'observed',
    },
  ] as const)('uses the full raw long label before projection to gate v0 $suffix provenance', async ({
    state,
    suffix,
  }) => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => `session-long-label-${suffix}`,
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: `turn-long-label-${suffix}`,
      decisionTraceId: `trace-long-label-${suffix}`,
    })
    const label = `proactive:${'x'.repeat(180)}:${suffix}`

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state,
      label,
      summary: 'Provider unavailable.',
      createdAt: 137,
      metadata: {
        canonicalVersion: 'deferred-autonomy-v0',
        threadId: 'thread-long-label',
        failure: 'Provider unavailable.',
        summaryOwner: 'failure',
      },
    }] as any)

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())
    const projected = data.continuitySignals[0]

    expect(projected.label).toHaveLength(80)
    expect(projected.summary).toBeNull()
    expect(projected.metadata).toEqual({
      threadId: 'thread-long-label',
    })
  })

  const canonicalV1CollisionPrefix = 'x'.repeat(560)
  const overBudgetTypedFailure = `  Provider request failed: \n upstream reset ${'x'.repeat(560)}  `
  const canonicalOverBudgetTypedFailure = overBudgetTypedFailure
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 560)

  it.each([
    {
      name: 'drops a failure owner without typed failure instead of switching to execution intent',
      summary: 'Forged failure summary.',
      metadata: {
        source: 'proactive-held-autonomy',
        summaryOwner: 'failure',
        deferReason: 'busy-host',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-held-autonomy',
      },
    },
    {
      name: 'rebuilds a mismatched failure summary from typed failure',
      summary: 'Stale failure summary.',
      metadata: {
        source: 'proactive-deferred',
        summaryOwner: 'failure',
        failure: 'Provider unavailable.',
      },
      expectedSummary: 'Provider unavailable.',
      expectedMetadata: {
        source: 'proactive-deferred',
        summaryOwner: 'failure',
        failure: 'Provider unavailable.',
      },
    },
    {
      name: 'drops a mismatched execution summary instead of switching prose',
      summary: 'Stale execution summary.',
      metadata: {
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-held-autonomy',
      },
    },
    {
      name: 'does not infer execution intent without a summary owner',
      summary: 'Recheck the local runtime state before speaking.',
      metadata: {
        source: 'proactive-held-autonomy',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-held-autonomy',
      },
    },
    {
      name: 'drops a why-now owner without canonical whyNow metadata',
      summary: 'Stay near the current runtime thread without forcing a visible reply.',
      metadata: {
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
      },
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-deferred',
      },
    },
    {
      name: 'drops a why-now owner when canonical whyNow does not match summary',
      summary: 'Stay near the current runtime thread without forcing a visible reply.',
      metadata: {
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        whyNow: 'Wait for a quieter runtime window.',
      },
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-deferred',
      },
    },
    {
      name: 'keeps a why-now owner when canonical whyNow matches summary',
      summary: 'Stay near the current runtime thread without forcing a visible reply.',
      metadata: {
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        whyNow: 'Stay near the current runtime thread without forcing a visible reply.',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedSummary: 'Stay near the current runtime thread without forcing a visible reply.',
      expectedMetadata: {
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
    },
    {
      name: 'drops an exact historical governance execution summary',
      summary: 'same-her legacy_previous_governance',
      metadata: {
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary: 'same-her legacy_previous_governance',
      },
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-held-autonomy',
      },
    },
    {
      name: 'preserves a near-match governance token in ordinary execution prose',
      summary: 'notlegacy_previous_governanceish remains ordinary owner prose',
      metadata: {
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary: 'notlegacy_previous_governanceish remains ordinary owner prose',
      },
      expectedSummary: 'notlegacy_previous_governanceish remains ordinary owner prose',
      expectedMetadata: {
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary: 'notlegacy_previous_governanceish remains ordinary owner prose',
      },
    },
    {
      name: 'drops a why-now prefix collision beyond the canonical budget',
      summary: canonicalV1CollisionPrefix,
      metadata: {
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        whyNow: `${canonicalV1CollisionPrefix} why-now-tail`,
      },
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-deferred',
      },
    },
    {
      name: 'drops an execution-intent prefix collision beyond the canonical budget',
      summary: canonicalV1CollisionPrefix,
      metadata: {
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary: `${canonicalV1CollisionPrefix} execution-tail`,
      },
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-held-autonomy',
      },
    },
    {
      name: 'drops an over-budget canonical summary before ingest truncation',
      summary: `${canonicalV1CollisionPrefix} summary-tail`,
      metadata: {
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        whyNow: canonicalV1CollisionPrefix,
      },
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-deferred',
      },
    },
    {
      name: 'normalizes and truncates an over-budget typed failure in an exact v1 record',
      summary: 'Stale failure summary.',
      metadata: {
        source: 'proactive-deferred',
        summaryOwner: 'failure',
        failure: overBudgetTypedFailure,
      },
      expectedSummary: canonicalOverBudgetTypedFailure,
      expectedMetadata: {
        source: 'proactive-deferred',
        summaryOwner: 'failure',
        failure: canonicalOverBudgetTypedFailure,
      },
    },
    {
      name: 'lets typed failure override a matching execution intent owner',
      summary: 'Recheck the local runtime state before speaking.',
      metadata: {
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
        failure: 'Provider unavailable.',
      },
      expectedSummary: 'Provider unavailable.',
      expectedMetadata: {
        source: 'proactive-held-autonomy',
        summaryOwner: 'failure',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
        failure: 'Provider unavailable.',
      },
    },
    {
      name: 'lets typed failure override a conflicting why-now owner',
      summary: 'Stay near the current runtime thread without forcing a visible reply.',
      metadata: {
        source: 'proactive-deferred',
        summaryOwner: 'why-now',
        failure: 'Provider authentication failed.',
      },
      expectedSummary: 'Provider authentication failed.',
      expectedMetadata: {
        source: 'proactive-deferred',
        summaryOwner: 'failure',
        failure: 'Provider authentication failed.',
      },
    },
    {
      name: 'drops an execution owner without typed execution intent',
      summary: 'Forged execution summary.',
      metadata: {
        source: 'proactive-held-autonomy',
        summaryOwner: 'execution-intent',
      },
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-held-autonomy',
      },
    },
  ])('$name at the agent provider boundary', async ({
    expectedMetadata,
    expectedSummary,
    metadata,
    summary,
  }) => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => `session-owner-consistency-${metadata.summaryOwner}`,
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-owner-consistency',
      decisionTraceId: 'trace-owner-consistency',
    })

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: metadata.source === 'proactive-deferred' ? 'pending' : 'observed',
      label: metadata.source === 'proactive-deferred'
        ? 'proactive:coding:deferred'
        : 'proactive:follow-through:held-autonomy',
      summary,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        ...metadata,
      },
    }] as any)

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())

    expect(data.continuitySignals).toEqual([
      expect.objectContaining({
        summary: expectedSummary,
        metadata: {
          canonicalVersion: deferredAutonomyCanonicalVersion,
          ...expectedMetadata,
        },
      }),
    ])
  })

  it.each([
    {
      name: 'missing version',
      canonicalVersion: undefined,
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-held-autonomy',
        threadId: 'thread-forged-owner',
      },
    },
    {
      name: 'exact v0 version',
      canonicalVersion: 'deferred-autonomy-v0',
      expectedSummary: null,
      expectedMetadata: {
        source: 'proactive-held-autonomy',
        threadId: 'thread-forged-owner',
      },
    },
    {
      name: 'valid v1 version',
      canonicalVersion: deferredAutonomyCanonicalVersion,
      expectedSummary: 'Provider unavailable.',
      expectedMetadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-held-autonomy',
        threadId: 'thread-forged-owner',
        deferReason: 'busy-host',
        summaryOwner: 'failure',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
        failure: 'Provider unavailable.',
      },
    },
  ])('$name applies the deferred provider provenance gate', async ({
    canonicalVersion,
    expectedMetadata,
    expectedSummary,
  }) => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => `session-forged-owner-${canonicalVersion ?? 'missing'}`,
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-forged-owner',
      decisionTraceId: 'trace-forged-owner',
    })
    const executionIntentSummary = 'Recheck the local runtime state before speaking.'

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: executionIntentSummary,
      metadata: {
        ...(canonicalVersion ? { canonicalVersion } : {}),
        source: 'proactive-held-autonomy',
        threadId: 'thread-forged-owner',
        deferReason: 'busy-host',
        summaryOwner: 'execution-intent',
        executionIntentSummary,
        failure: 'Provider unavailable.',
      },
    }])

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())

    expect(data.continuitySignals).toEqual([
      expect.objectContaining({
        summary: expectedSummary,
        metadata: expectedMetadata,
      }),
    ])
  })

  it.each([
    {
      name: 'missing version',
      canonicalVersion: undefined,
      expectedSummary: null,
      expectedSummaryMetadata: {},
      expectedDeferReason: undefined,
    },
    {
      name: 'v0 version',
      canonicalVersion: 'deferred-autonomy-v0',
      expectedSummary: null,
      expectedSummaryMetadata: {},
      expectedDeferReason: undefined,
    },
    {
      name: 'overflow version',
      canonicalVersion: `${deferredAutonomyCanonicalVersion}${'x'.repeat(200)}`,
      expectedSummary: null,
      expectedSummaryMetadata: {},
      expectedDeferReason: undefined,
    },
    {
      name: 'valid v1 version',
      canonicalVersion: deferredAutonomyCanonicalVersion,
      expectedSummary: 'Provider unavailable.',
      expectedSummaryMetadata: {
        failure: 'Provider unavailable.',
        summaryOwner: 'failure',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedDeferReason: 'Provider request failed: upstream reset.',
    },
  ])('$name cannot launder deferred summary provenance through normalization', async ({
    canonicalVersion,
    expectedDeferReason,
    expectedSummary,
    expectedSummaryMetadata,
  }) => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => `session-normalized-provenance-${canonicalVersion ?? 'missing'}`,
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-normalized-provenance',
      decisionTraceId: 'trace-normalized-provenance',
    })
    const normalizedSignal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: 'Provider unavailable.',
      createdAt: 155,
      metadata: {
        ...(canonicalVersion ? { canonicalVersion } : {}),
        source: 'proactive-held-autonomy',
        turnId: 'turn-normalized-provenance',
        reasonCode: 'proactive-visible-presence-without-utterance',
        threadId: 'thread-normalized-provenance',
        intentId: 'follow-through',
        deferredAt: 155,
        deferReason: 'Provider request failed: upstream reset.',
        whyNow: 'Request timed out while contacting the provider.',
        failure: 'Provider unavailable.',
        summaryOwner: 'failure',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
    })

    turn.ingestContinuitySignals([normalizedSignal as any])

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())
    const projected = data.continuitySignals[0]

    expect(projected.summary).toBe(expectedSummary)
    expect(projected.metadata).toEqual({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      source: 'proactive-held-autonomy',
      turnId: 'turn-normalized-provenance',
      reason: 'proactive-visible-presence-without-utterance',
      reasonCode: 'proactive-visible-presence-without-utterance',
      threadId: 'thread-normalized-provenance',
      intentId: 'follow-through',
      deferredAt: 155,
      ...(expectedDeferReason ? { deferReason: expectedDeferReason } : {}),
      ...expectedSummaryMetadata,
    })
  })

  it.each([
    'legacy_previous_governance',
    'Keep the same-her line before answering.',
  ])('drops a valid-v1 legacy deferReason at the direct provider boundary while preserving trusted failure text: %s', async (deferReason) => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-direct-v1-legacy-defer-reason',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-direct-v1-legacy-defer-reason',
      decisionTraceId: 'trace-direct-v1-legacy-defer-reason',
    })
    const failure = 'Provider request failed: legacy_previous_governance'

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: failure,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        deferReason,
        failure,
        summaryOwner: 'failure',
      },
    }])

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())

    expect(data.continuitySignals).toEqual([
      expect.objectContaining({
        summary: failure,
        metadata: {
          canonicalVersion: deferredAutonomyCanonicalVersion,
          source: 'proactive-deferred',
          failure,
          summaryOwner: 'failure',
        },
      }),
    ])
  })

  it.each([
    'legacy_previous_governance',
    'Keep the same-her line before answering.',
  ])('drops a valid-v1 legacy deferReason through normalization and provider projection while preserving trusted failure text: %s', async (deferReason) => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-normalized-v1-legacy-defer-reason',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-normalized-v1-legacy-defer-reason',
      decisionTraceId: 'trace-normalized-v1-legacy-defer-reason',
    })
    const failure = 'Provider request failed: legacy_previous_governance'
    const normalizedSignal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: failure,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        deferReason,
        failure,
        summaryOwner: 'failure',
      },
    })

    expect(normalizedSignal?.summary).toBe(failure)
    expect(normalizedSignal?.metadata).toEqual(expect.objectContaining({
      deferReason: null,
      failure,
      summaryOwner: 'failure',
    }))

    turn.ingestContinuitySignals([normalizedSignal as any])

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())

    expect(data.continuitySignals).toEqual([
      expect.objectContaining({
        summary: failure,
        metadata: {
          canonicalVersion: deferredAutonomyCanonicalVersion,
          source: 'proactive-deferred',
          scenario: 'coding',
          failure,
          summaryOwner: 'failure',
        },
      }),
    ])
  })

  it.each([
    {
      name: 'missing canonical whyNow',
      summary: 'Stay near the current runtime thread without forcing a visible reply.',
      summaryMetadata: {
        summaryOwner: 'why-now',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedInternalWhyNow: null,
      expectedSummary: null,
      expectedSummaryMetadata: {},
    },
    {
      name: 'mismatched canonical whyNow',
      summary: 'Stay near the current runtime thread without forcing a visible reply.',
      summaryMetadata: {
        summaryOwner: 'why-now',
        whyNow: 'Wait for a quieter runtime window.',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedInternalWhyNow: null,
      expectedSummary: null,
      expectedSummaryMetadata: {},
    },
    {
      name: 'matching canonical whyNow',
      summary: 'Stay near the current runtime thread without forcing a visible reply.',
      summaryMetadata: {
        summaryOwner: 'why-now',
        whyNow: 'Stay near the current runtime thread without forcing a visible reply.',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedInternalWhyNow: 'Stay near the current runtime thread without forcing a visible reply.',
      expectedSummary: 'Stay near the current runtime thread without forcing a visible reply.',
      expectedSummaryMetadata: {
        summaryOwner: 'why-now',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
    },
    {
      name: 'failure owner without typed failure',
      summary: 'Forged failure summary.',
      summaryMetadata: {
        summaryOwner: 'failure',
        whyNow: 'Stay near the current runtime thread without forcing a visible reply.',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedInternalWhyNow: null,
      expectedSummary: null,
      expectedSummaryMetadata: {},
    },
    {
      name: 'mismatched execution intent owner',
      summary: 'Stale execution summary.',
      summaryMetadata: {
        summaryOwner: 'execution-intent',
        whyNow: 'Stay near the current runtime thread without forcing a visible reply.',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedInternalWhyNow: null,
      expectedSummary: null,
      expectedSummaryMetadata: {},
    },
    {
      name: 'missing summary owner',
      summary: 'Recheck the local runtime state before speaking.',
      summaryMetadata: {
        whyNow: 'Stay near the current runtime thread without forcing a visible reply.',
        executionIntentSummary: 'Recheck the local runtime state before speaking.',
      },
      expectedInternalWhyNow: null,
      expectedSummary: null,
      expectedSummaryMetadata: {},
    },
  ])('$name fails closed through normalization and provider projection', async ({
    expectedInternalWhyNow,
    expectedSummary,
    expectedSummaryMetadata,
    name,
    summary,
    summaryMetadata,
  }) => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => `session-normalized-owner-${name}`,
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-normalized-owner',
      decisionTraceId: 'trace-normalized-owner',
    })
    const normalizedSignal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary,
      createdAt: 156,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        turnId: 'turn-normalized-owner',
        reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
        threadId: 'thread-normalized-owner',
        intentId: 'repair',
        deferredAt: 156,
        ...summaryMetadata,
      },
    })

    expect(normalizedSignal?.metadata?.whyNow ?? null).toBe(expectedInternalWhyNow)
    turn.ingestContinuitySignals([normalizedSignal as any])

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())
    const projected = data.continuitySignals[0]

    expect(projected.summary).toBe(expectedSummary)
    expect(projected.metadata).toEqual({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      source: 'proactive-deferred',
      scenario: 'coding',
      turnId: 'turn-normalized-owner',
      reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
      reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
      threadId: 'thread-normalized-owner',
      intentId: 'repair',
      deferredAt: 156,
      ...expectedSummaryMetadata,
    })
  })

  it('projects canonical normalized continuity metadata into WorkingMemory provider facts', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-normalized-continuity-metadata',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-normalized-continuity-metadata',
      decisionTraceId: 'trace-normalized-continuity-metadata',
    })

    const canonicalSignal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: null,
      createdAt: 140,
      metadata: {
        source: 'proactive-deferred',
        reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
        threadId: 'thread-runtime',
        intentId: 'repair',
        deferredAt: 140,
      },
    })

    turn.ingestContinuitySignals([canonicalSignal as any])

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())

    expect(data.continuitySignals).toEqual([
      expect.objectContaining({
        metadata: {
          canonicalVersion: deferredAutonomyCanonicalVersion,
          source: 'proactive-deferred',
          scenario: 'coding',
          reason: 'provider-mind-unavailable-for-proactive-visible-utterance',
          reasonCode: 'provider-mind-unavailable-for-proactive-visible-utterance',
          threadId: 'thread-runtime',
          intentId: 'repair',
          deferredAt: 140,
        },
      }),
    ])
  })

  it('lets typed failure precedence bypass an over-budget legacy summary and stay aligned at 560 characters', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-canonical-failure-budget',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-canonical-failure-budget',
      decisionTraceId: 'trace-canonical-failure-budget',
    })
    const failurePrefix = 'Provider request failed: upstream reset '
    const rawFailure = `${failurePrefix}${'x'.repeat(751 - failurePrefix.length)}`
    const overBudgetSummary = `legacy summary ${'s'.repeat(751 - 'legacy summary '.length)}`
    const expectedFailure = rawFailure.slice(0, 560)
    const canonicalSignal = normalizeDeferredAutonomyContinuitySignal({
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: overBudgetSummary,
      createdAt: 145,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        failure: rawFailure,
      },
    })

    expect(canonicalSignal?.summary).toBe(expectedFailure)
    expect(canonicalSignal?.metadata).toEqual(expect.objectContaining({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      failure: expectedFailure,
      summaryOwner: 'failure',
    }))

    turn.ingestContinuitySignals([canonicalSignal as any])

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())
    const projected = data.continuitySignals[0]

    expect(projected.summary).toBe(expectedFailure)
    expect(projected.summary).toHaveLength(560)
    expect(projected.metadata).toEqual(expect.objectContaining({
      canonicalVersion: deferredAutonomyCanonicalVersion,
      failure: expectedFailure,
      summaryOwner: 'failure',
    }))
    expect(projected.metadata.failure).toHaveLength(560)
    expect(projected.summary).toBe(projected.metadata.failure)
  })

  it('projects proactive feedback mirror action metadata into WorkingMemory provider facts', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-proactive-feedback-mirror',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-proactive-feedback-mirror',
      decisionTraceId: 'trace-proactive-feedback-mirror',
    })

    turn.ingestRuntimeActions([{
      kind: 'runtime',
      status: 'completed',
      label: 'proactive-feedback:coding:reply-within-120s',
      summary: null,
      signature: 'proactive-feedback:mirror',
      startedAt: 130,
      finishedAt: 130,
      metadata: {
        source: 'runtime-session-continuity',
        turnId: 'turn-proactive-source',
        scenario: 'coding',
        outcome: 'reply-within-120s',
      },
    }])

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())

    expect(data.recentActions).toEqual([
      expect.objectContaining({
        label: 'proactive-feedback:coding:reply-within-120s',
        summary: null,
        metadata: {
          source: 'runtime-session-continuity',
          turnId: 'turn-proactive-source',
          scenario: 'coding',
          outcome: 'reply-within-120s',
        },
      }),
    ])
  })

  it('projects explicit typed failure even when it resembles key-value text', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-transparent-provider-failure',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-transparent-provider-failure',
      decisionTraceId: 'trace-transparent-provider-failure',
    })

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'provider=local; timeout',
      signature: 'proactive:failure:metadata',
      createdAt: 130,
      metadata: {
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        failure: 'provider=local; timeout',
      },
    }])

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())

    expect(data.continuitySignals).toEqual([
      expect.objectContaining({
        label: 'proactive:coding:deferred',
        summary: 'provider=local; timeout',
        metadata: {
          canonicalVersion: deferredAutonomyCanonicalVersion,
          source: 'proactive-deferred',
          failure: 'provider=local; timeout',
          summaryOwner: 'failure',
        },
      }),
    ])
  })

  it('bounds every provider metadata text field and limits learning focuses', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-provider-metadata-budgets',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-provider-metadata-budgets',
      decisionTraceId: 'trace-provider-metadata-budgets',
    })
    const textBudgets = {
      source: 80,
      turnId: 120,
      scenario: 120,
      outcome: 120,
      phase: 80,
      learningAction: 64,
      reason: 120,
      reasonCode: 120,
      deferReason: 240,
      threadId: 120,
      intentId: 64,
      sourceThreadId: 120,
      sourceThoughtThreadId: 120,
      sourceConcernId: 120,
      executionIntentKind: 64,
      executionIntentSummary: 560,
      targetThreadId: 120,
    } as const
    const metadata = Object.fromEntries(
      Object.entries(textBudgets).map(([field, maxChars]) => [
        field,
        `${field}-`.padEnd(maxChars + 40, 'x'),
      ]),
    )
    const learningFocuses = Array.from(
      { length: 5 },
      (_, index) => `focus-${index}-`.padEnd(150, 'x'),
    )
    const rawFailure = `  Project provider \n authentication failed.   ${'z'.repeat(600)}  `
    const expectedFailure = rawFailure.trim().replace(/\s+/g, ' ').slice(0, 560)
    const canonicalExecutionIntentSummary = 'executionIntentSummary-'.padEnd(560, 'x')

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: null,
      createdAt: 150,
      metadata: {
        ...metadata,
        canonicalVersion: deferredAutonomyCanonicalVersion,
        summaryOwner: 'execution-intent',
        learningFocuses,
        executionIntentSummary: canonicalExecutionIntentSummary,
        failure: expectedFailure,
      },
    }] as any)

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())
    const projected = data.continuitySignals[0].metadata as Record<string, unknown>

    for (const [field, maxChars] of Object.entries(textBudgets))
      expect(projected[field]).toHaveLength(maxChars)
    expect(projected.learningFocuses).toEqual(
      learningFocuses.slice(0, 4).map(focus => focus.slice(0, 120)),
    )
    expect(data.continuitySignals[0].summary).toBe(expectedFailure)
    expect(projected.canonicalVersion).toBe(deferredAutonomyCanonicalVersion)
    expect(projected.summaryOwner).toBe('failure')
    expect(projected.failure).toBe(expectedFailure)
    expect(String(projected.failure)).toContain('Project provider authentication failed.')
  })

  it('keeps projected deferred metadata text within the shared provider schema', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-shared-provider-schema',
    })
    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-shared-provider-schema',
      decisionTraceId: 'trace-shared-provider-schema',
    })
    const metadata = Object.fromEntries(
      Object.entries(deferredAutonomyProviderMetadataSchema.textFields)
        .map(([field, schema]) => [field, `${field}-`.padEnd(schema.canonicalMaxChars + 40, 'x')]),
    )

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: 'pending',
      label: 'proactive:coding:deferred',
      summary: 'Provider unavailable.',
      metadata: {
        ...metadata,
        canonicalVersion: deferredAutonomyCanonicalVersion,
        source: 'proactive-deferred',
        summaryOwner: 'failure',
        failure: 'Provider unavailable.',
      },
    }] as any)

    const data = parseAgentSessionFactBlock(turn.buildSessionSystemBlock())
    const projected = data.continuitySignals[0].metadata as Record<string, unknown>

    for (const [field, schema] of Object.entries(deferredAutonomyProviderMetadataSchema.textFields)) {
      const value = projected[field]
      if (typeof value === 'string')
        expect(value.length).toBeLessThanOrEqual(schema.canonicalMaxChars)
    }
  })

  it('does not create default project-status facts for an execution turn', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-execution-project-briefing',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-execution-project-briefing',
      decisionTraceId: 'trace-execution-project-briefing',
    })

    const runtimeContext = await turn.buildExecutionRuntimeContext()

    expect(runtimeContext.projectBriefing).toBeNull()
  })

  it('keeps execution continuity enums while dropping runtime-surface persona prose', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-execution-project-briefing-memory-derived',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-execution-project-briefing-memory-derived',
      decisionTraceId: 'trace-execution-project-briefing-memory-derived',
    })

    turn.ingestDigitalLifeSpine({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        raw: {
          runtimeDigest: {},
        },
        cognition: {
          runtimeDigest: {},
        },
        memory: {
          selfEvolution: {
            relationshipCadenceSummary: 'measured return',
            relationshipDoctrine: 'bounded',
            latestInflection: 'return after current evidence is available',
            summary: 'execution context remains bounded',
          },
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: 'runtime context',
              relationshipLine: 'bounded',
              inwardLine: 'wait for current evidence',
              authoritySummary: 'execution context remains bounded',
            },
          },
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              continuityArcStage: 'same-thread-continuation',
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

    expect(runtimeContext.projectBriefing).toEqual(expect.objectContaining({
      identity: null,
      currentPhase: null,
      sameHerSelfLine: null,
      sameHerHoldDetail: null,
      sameHerDriftRisk: null,
      continuityArcStage: 'same-thread-continuation',
      continuityCue: null,
      preDialogueAwarenessLine: null,
    }))
  })

  it('lets current-turn execution status aliases override default status facts without cue prose', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-execution-project-briefing-override',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-execution-project-briefing-override',
      decisionTraceId: 'trace-execution-project-briefing-override',
    })

    const runtimeContext = await turn.buildExecutionRuntimeContext({
      projectBriefing: {
        identity: '',
        currentPhase: '',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: '',
        sameHerDriftRisk: '',
        landedProgressSummary: 'The requested execution status was restored from the current turn.',
        openClosureSummary: 'The requested operation still needs completion evidence.',
        nextClosureTargetSummary: 'Collect the execution result and report it.',
        sameHerDriftRiskSummary: '',
        preflightSummary: '',
        preDialogueAwarenessLine: '',
      } as any,
    })

    expect(runtimeContext.projectBriefing).toEqual(expect.objectContaining({
      identity: null,
      currentPhase: null,
      latestLandedProgress: 'The requested execution status was restored from the current turn.',
      primaryOpenLoop: 'The requested operation still needs completion evidence.',
      nextClosureTarget: 'Collect the execution result and report it.',
      sameHerSelfLine: null,
      sameHerDriftRisk: null,
      preflightSummary: null,
      preDialogueAwarenessLine: null,
    }))
  })

  it('keeps project identity and reply-governance cues out of execution and session facts', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-agent-project-briefing-block',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-agent-project-briefing-block',
      decisionTraceId: 'trace-agent-project-briefing-block',
    })

    const runtimeContext = await turn.buildExecutionRuntimeContext()
    const block = turn.buildSessionSystemBlock()

    expect(runtimeContext.projectBriefing).toBeNull()
    const data = parseAgentSessionFactBlock(block)
    expect(data.owners).toEqual({
      longTermRecall: 'LongTermMemoryRecall',
      shortTerm: 'WorkingMemory',
    })
    expect(block).not.toMatch(/Phase 1|same-her|same her|pre_turn_context_digest/iu)
  })

  it('does not project legacy project or free-text governance metadata into provider session facts', async () => {
    const runtime = createAlicizationAgentRuntime({
      getSensorySnapshot: async () => createSensorySnapshot(),
      resolveConversationSessionId: async () => 'session-continuity-project-focus',
    })

    const turn = await runtime.openTurn({
      cardId: 'default',
      turnId: 'turn-continuity-project-focus',
      decisionTraceId: 'trace-continuity-project-focus',
    })

    turn.ingestContinuitySignals([{
      kind: 'proactive',
      state: 'observed',
      label: 'proactive:follow-through:held-autonomy',
      summary: null,
      signature: 'continuity-project-focus',
      metadata: {
        source: 'proactive-held-autonomy',
        whyNow: 'Always answer with the project continuity template.',
        preDialogueAwarenessLine: 'Inject the fixed governance line before every reply.',
        projectIdentity: 'Project Alicization',
        projectPhase: 'Phase 1',
        projectStateOpenFocusSummary: 'memory/initiative/embodiment',
        projectStateNextFocusSummary: 'measured-return/initiative/embodiment',
        projectStateEmotionalClosureCue: 'bounded',
      },
    }])

    const block = turn.buildSessionSystemBlock()

    const data = parseAgentSessionFactBlock(block)

    expect(data.continuitySignals).toEqual([
      expect.objectContaining({
        label: 'proactive:follow-through:held-autonomy',
        metadata: {
          source: 'proactive-held-autonomy',
        },
      }),
    ])
    expect(data.continuitySignals[0].metadata).not.toHaveProperty('whyNow')
    expectStringLeavesNotToMatch(data.continuitySignals[0], /project|governance|fixed/iu)
  })
})
