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

  it('does not project legacy project-state focus metadata into provider session facts', async () => {
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
      summary: 're-open the unresolved compile seam and land the callback gently | intent=follow-through | defer=busy-host | thread=thread-runtime | scenario=coding',
      signature: 'continuity-project-focus',
      metadata: {
        source: 'proactive-held-autonomy',
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
      }),
    ])
    expect(data.continuitySignals[0]).not.toHaveProperty('focus')
  })
})
