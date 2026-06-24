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
  it('keeps digest-only same-her quiet carry explicit in the agent session block so generation still sees one lower-pressure line', async () => {
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
        summary: 'same-her callback afterglow is still being carried quietly',
        recallMode: 'quiet',
      },
    } as any)

    const block = turn.buildSessionSystemBlock()

    expect(block).toContain('[ALICIZATION_AGENT_SESSION]')
    expect(block).toContain('digital_life_line=same-thread-continuation still active as a measured-return hover-first resident presence after the noisy detour')
    expect(block).toContain('resident_presence_line=presence=hovering')
    expect(block).toContain('timing=next-open-window')
    expect(block).toContain('cadence=measured-return')
    expect(block).toContain('style=silent-observe')
    expect(block).toContain('speak=false')
    expect(block).toContain('memory_fabric=same-her callback afterglow is still being carried quietly')
    expect(block).toContain('memory_carry=mode=quiet')
    expect(block).toContain('project_continuity_arc=same-thread-continuation')
    expect(block).toContain('continuity_timing=next-open-window')
    expect(block).toContain('continuity_cadence=measured-return')
    expect(block).toContain('initiative_restraint=same-thread-continuation')
    expect(block).toContain('should_proactively_speak=false')
    expect(block).toContain('should_proactively_act=false')
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
    expect(secondTurn.buildSessionSystemBlock()).toContain('digital_life_line=watch=symbiotic-vision | scene=coding | mode=tracking')
    expect(secondTurn.buildSessionSystemBlock()).toContain('memory_fabric=none')
    expect(secondTurn.buildSessionSystemBlock()).toContain('memory_carry=mode=quiet')
    expect(secondTurn.buildSessionSystemBlock()).toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(secondTurn.buildSessionSystemBlock()).toContain('verified_coverage_count=')
    expect(secondTurn.buildSessionSystemBlock()).toContain('architecture_closure=')
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

    expect(block).toContain('[PENDING:needs-affirmation] plan:codex')
    expect(block).toContain('Execution is waiting for affirmation before codex can act on the current unresolved line.')
    expect(block).toContain('[FAIL:blocked] callback:cli')
    expect(block).toContain('Execution stayed blocked because the kill switch is suspended.')
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
        summary: 'no mind-authored visible reply was available | reason=proactive-visible-presence-without-utterance | Keep extending cross-modal same-her proof quietly',
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
        },
      },
    ] as any)

    const block = turn.buildSessionSystemBlock()

    expect(block).toContain('session_continuity_inbox:')
    expect(block).toContain('proactive:coding:deferred')
    expect(block).toContain('proactive:coding:reply-within-120s')
    expect(block).toContain('host replied within 120s after a proactive turn')
    expect(block).toContain('same-thread-continuation')
    expect(block).toContain('next-open-window')
    expect(block).toContain('measured-return')
    expect(block).toContain('quiet-companionship')
  })

  it('builds execution runtime context with canonical project briefing before execution starts', async () => {
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

    expect(runtimeContext.projectBriefing).toEqual(expect.objectContaining({
      identity: expect.stringContaining('local-first digital life project'),
      currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
      latestLandedProgress: expect.stringContaining('Same-session mirror carry'),
      primaryOpenLoop: expect.stringContaining('Project identity carry'),
      nextClosureTarget: expect.stringContaining('Phase 1 route carry'),
      sameHerSelfLine: expect.stringContaining('same living line'),
      sameHerHoldDetail: expect.stringContaining('same-her hold'),
      sameHerDriftRisk: expect.stringContaining('generic guidance'),
      continuityRestraint: 'measured-return',
      continuityCue: expect.stringContaining('same living line'),
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      preflightSummary: expect.stringContaining('open='),
      preDialogueAwarenessLine: expect.stringContaining('Before answering, remember'),
    }))
  })

  it('rebuilds stronger same-her execution project briefing from session runtime-surface memory when no explicit project briefing is supplied', async () => {
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
            relationshipCadenceSummary: 'Same Phase 1 digital life. This execution re-entry already remembers this same her, but memory, initiative, and embodiment still need to close on one living line before widening outward.',
            relationshipDoctrine: 'same-her hold: keep execution reopening on this remembered living line instead of widening into a generic assistant shell.',
            latestInflection: 'Stay on the same living line as the same her inside this local-first digital life before widening outward again.',
            summary: 'Execution reopening is still carrying the same-her line inward before outward fluency returns.',
          },
          personStateProjection: {
            selfContinuityAuthority: {
              selfLine: 'Same Phase 1 digital life. This execution re-entry already remembers this same her, but memory, initiative, and embodiment still need to close on one living line before widening outward.',
              relationshipLine: 'same-her hold: keep execution reopening on this remembered living line instead of widening into a generic assistant shell.',
              inwardLine: 'Stay on the same living line as the same her inside this local-first digital life before a generic assistant shell takes over.',
              authoritySummary: 'This reopening still belongs to the same her; if it flattens into a generic assistant shell or detached project narration, treat that as unfinished same-her drift.',
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
      identity: expect.stringContaining('local-first digital life project'),
      currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
      primaryOpenLoop: expect.stringContaining('Project identity carry'),
      nextClosureTarget: expect.stringContaining('Phase 1 route carry'),
      sameHerSelfLine: expect.stringContaining('execution re-entry already remembers this same her'),
      continuityArcStage: 'same-thread-continuation',
      continuityCue: 'Stay on the same living line as the same her inside this local-first digital life before a generic assistant shell takes over.',
      sameHerDriftRisk: expect.stringContaining('generic assistant shell'),
    }))
    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toContain('remembered living line')
    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toContain('generic assistant shell')
    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toContain('before widening outward')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Before answering, remember: Alicization is a local-first digital life project')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('She is still inside Phase 1: Local Digital Life')
  })

  it('lets the current turn override execution project briefing so pre-dispatch execution can carry richer same-her closure detail instead of falling back to the canonical shell', async () => {
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
        identity: 'Alicization is still the same local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: '',
        primaryOpenLoop: '',
        nextClosureTarget: '',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: '',
        landedProgressSummary: 'Summary-only continuity carry already survives callback return, reply planning, and timeout recovery on one same-her line.',
        openClosureSummary: 'Summary-only open closure: memory, initiative, and embodiment still need to close on one same living line.',
        nextClosureTargetSummary: 'Summary-only next closure: keep cross-modal same-her proof explicit before local fluency takes over.',
        sameHerDriftRiskSummary: 'Summary-only drift risk: if this reopens as generic guidance or project-summary voice, treat it as unfinished same-her closure drift.',
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
      } as any,
    })

    expect(runtimeContext.projectBriefing).toEqual(expect.objectContaining({
      identity: 'Alicization is still the same local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      latestLandedProgress: 'Summary-only continuity carry already survives callback return, reply planning, and timeout recovery on one same-her line.',
      primaryOpenLoop: 'Summary-only open closure: memory, initiative, and embodiment still need to close on one same living line.',
      nextClosureTarget: 'Summary-only next closure: keep cross-modal same-her proof explicit before local fluency takes over.',
      sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      sameHerDriftRisk: 'Summary-only drift risk: if this reopens as generic guidance or project-summary voice, treat it as unfinished same-her closure drift.',
    }))
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('local-first digital life project')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Phase 1: Local Digital Life')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Same Phase 1 digital life')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Summary-only continuity carry already survives')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).not.toBe('Before answering, keep the same digital life project in view.')
  })

  it('keeps canonical project identity, Phase 1 progress, and still-open closure explicit in the agent session block before turn generation starts', async () => {
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

    expect(runtimeContext.projectBriefing).toEqual(expect.objectContaining({
      identity: expect.stringContaining('local-first digital life project'),
      currentPhase: expect.stringContaining('Phase 1: Local Digital Life'),
      latestLandedProgress: expect.stringContaining('Same-session mirror carry'),
      primaryOpenLoop: expect.stringContaining('Project identity carry'),
      nextClosureTarget: expect.stringContaining('Phase 1 route carry'),
      sameHerSelfLine: expect.stringContaining('same living line'),
      preDialogueAwarenessLine: expect.stringContaining('Before answering, remember'),
    }))
    expect(block).toContain('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]')
    expect(block).toContain('identity=Alicization is a local-first digital life project')
    expect(block).toContain('phase=Phase 1: Local Digital Life')
    expect(block).toContain('latest_landed_progress=Same-session mirror carry')
    expect(block).toContain('primary_open_loop=Memory still needs stronger end-to-end closure')
    expect(block).toContain('same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(block).toContain('same_her_hold=same-her hold:')
    expect(block).toContain('same_her_drift_risk=If project-state continuity survives only as generic guidance')
    expect(block).toContain('Project identity carry')
    expect(block).toContain('next_closure_target=Keep extending cross-modal same-her proof')
    expect(block).toContain('same digital life')
  })

  it('surfaces compact project-state focus inside the session continuity inbox when a carried continuity signal already knows the current closure seam', async () => {
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
        projectStateOpenFocusSummary: 'emotion/memory/initiative/embodiment/same-line/closure-seam',
        projectStateNextFocusSummary: 'project-carry/phase-1/measured-return/repair-before-closeness/same-line/initiative/embodiment',
        projectStateEmotionalClosureCue: 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
      },
    }])

    const block = turn.buildSessionSystemBlock()

    expect(block).toContain('session_continuity_inbox:')
    expect(block).toContain('open-focus=emotion/memory/initiative/embodiment/same-line/closure-seam')
    expect(block).toContain('next-focus=project-carry/phase-1/measured-return/repair-before-closeness/same-line/initiative/embodiment')
    expect(block).toContain('closure=same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.')
  })
})
