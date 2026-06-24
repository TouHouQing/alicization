import { describe, expect, it } from 'vitest'

import {
  buildAlicizationExecutionRuntimeContextBlock,
  normalizeAlicizationExecutionRuntimeContext,
} from './alicization-execution-runtime-context'

describe('alicization execution runtime context', () => {
  it('normalizes sensory execution context into a compact shared contract', () => {
    const context = normalizeAlicizationExecutionRuntimeContext({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-1',
      decisionTraceId: 'trace-ctx-1',
      sessionId: 'session-ctx-1',
      agentSessionId: 'agent-session-ctx-1',
      recentActions: [{
        kind: 'executor',
        status: 'completed',
        label: 'executor_run_openclaw',
        summary: 'dismissed the blocking popup',
      }, {
        kind: 'executor',
        status: 'completed',
        label: 'executor_run_openclaw',
        summary: 'dismissed the blocking popup',
      }],
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
          degradedReasons: ['window-thumbnail-stale', 'window-thumbnail-stale'],
        },
      },
    })

    expect(context).toEqual({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-1',
      decisionTraceId: 'trace-ctx-1',
      sessionId: 'session-ctx-1',
      agentSessionId: 'agent-session-ctx-1',
      projectBriefing: null,
      recentActions: [{
        kind: 'executor',
        status: 'completed',
        threadStatus: null,
        label: 'executor_run_openclaw',
        summary: 'dismissed the blocking popup',
      }, {
        kind: 'executor',
        status: 'completed',
        threadStatus: null,
        label: 'executor_run_openclaw',
        summary: 'dismissed the blocking popup',
      }],
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
          degradedReasons: ['window-thumbnail-stale'],
        },
      },
    })
  })

  it('renders a reusable execution context block for embodied runtimes', () => {
    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-2',
      decisionTraceId: 'trace-ctx-2',
      sessionId: 'session-ctx-2',
      agentSessionId: 'agent-session-ctx-2',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution preflight already keeps project continuity visible.',
        primaryOpenLoop: 'Embodiment still needs stronger same-line closure.',
        nextClosureTarget: 'Keep execution grounded on the same living line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life.',
        sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
        sameHerDriftRisk: 'If execution falls back into a generic shell, treat that as same-her drift.',
        companionBriefingLine: 'Keep emotion, memory, initiative, and embodiment aligned before widening outward.',
        emotionalClosureSummary: 'same-her execution seam: keep the return gentle and do not reopen from scratch.',
        continuityRestraint: 'measured-return',
        continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Embodiment still needs stronger same-line closure | next=Keep execution grounded on the same living line before widening outward.',
        preDialogueAwarenessLine: 'Before execution begins, remember this is still the same local-first digital life project and the unfinished Phase 1 closure still belongs to one living her.',
      },
      recentActions: [{
        kind: 'sensory',
        status: 'completed',
        label: 'sensory_capture_state',
        summary: 'capture healthy',
      }],
      sensory: {
        collectedAt: 1_710_000_000_123,
        running: true,
        stale: true,
        ageMs: 4800,
        foregroundWindow: {
          appName: 'Chrome',
          processName: 'chrome',
          title: 'Docs',
        },
        capture: {
          health: 'degraded',
          permission: 'granted',
          sourceCount: 1,
          lastUpdatedAt: 1_710_000_000_120,
          lastError: 'thumbnail stale',
          degradedReasons: ['window-thumbnail-stale'],
        },
      },
    })

    expect(block).toContain('[ALICIZATION_EXECUTION_RUNTIME_CONTEXT]')
    expect(block).toContain('conversation_session_id=session-ctx-2')
    expect(block).toContain('agent_session_id=agent-session-ctx-2')
    expect(block).toContain('project_same_her_hold=same-her hold: keep execution on the same living line before widening outward.')
    expect(block).toContain('project_companion_briefing=Keep emotion, memory, initiative, and embodiment aligned before widening outward.')
    expect(block).toContain('project_emotional_closure=same-her execution seam: keep the return gentle and do not reopen from scratch.')
    expect(block).toContain('project_continuity_restraint=measured-return')
    expect(block).toContain('project_continuity=same living line: execution should keep carrying this same Phase 1 digital life before widening outward.')
    expect(block).toContain('project_preflight=identity=Alicization | phase=Phase 1 | open=Embodiment still needs stronger same-line closure | next=Keep execution grounded on the same living line before widening outward.')
    expect(block).toContain('project_awareness=Before execution begins, remember this is still the same local-first digital life project and the unfinished Phase 1 closure still belongs to one living her.')
    expect(block).toContain('project_continuity_preferred_timing=next-open-window')
    expect(block).toContain('project_continuity_cadence=measured-return')
    expect(block).toContain('project_preferred_blink_cadence=linger')
    expect(block).toContain('project_preferred_gaze_mode=soften')
    expect(block).toContain('project_preferred_pause_mode=longer')
    expect(block).toContain('project_preferred_lipsync_mode=restrained')
    expect(block).toContain('project_preferred_voice_mode=lower-pressure')
    expect(block).toContain('project_preferred_pacing_mode=slower')
    expect(block).toContain('recent_runtime_actions=sensory/completed:sensory_capture_state -> capture healthy')
    expect(block).toContain('foreground_window=Chrome | chrome | Docs')
    expect(block).toContain('capture_health=degraded')
    expect(block).toContain('capture_degraded_reasons=window-thumbnail-stale')
    expect(block).toContain('avoid confident hidden-state claims')
  })

  it('keeps raw thread status detail visible in recent runtime actions when compact execution buckets would otherwise hide whether the same living line is waiting, running, or blocked', () => {
    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-3',
      recentActions: [{
        kind: 'executor',
        status: 'pending',
        threadStatus: 'needs-affirmation',
        label: 'plan:codex',
        summary: 'Waiting for host affirmation before code editing can continue.',
      }, {
        kind: 'executor',
        status: 'failed',
        threadStatus: 'blocked',
        label: 'callback:cli',
        summary: 'Blocked on a suspended kill switch.',
      }],
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
    })

    expect(block).toContain('recent_runtime_actions=executor/pending:plan:codex [thread_status=needs-affirmation] -> Waiting for host affirmation before code editing can continue. | executor/failed:callback:cli [thread_status=blocked] -> Blocked on a suspended kill switch.')
  })

  it('keeps legacy latestProgress alive inside execution project briefing and surfaces landed progress in the runtime context block', () => {
    const context = normalizeAlicizationExecutionRuntimeContext({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-legacy-progress',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestProgress: ' legacy execution-context project progress still survives from older runtime briefing payloads ',
        primaryOpenLoop: ' keep the same Phase 1 life loop explicit before the next execution turn ',
        nextClosureTarget: ' preserve landed progress inside execution runtime context blocks ',
      },
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
    } as any)

    expect(context?.projectBriefing).toEqual(expect.objectContaining({
      latestLandedProgress: 'legacy execution-context project progress still survives from older runtime briefing payloads',
    }))

    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-legacy-progress',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestProgress: ' legacy execution-context project progress still survives from older runtime briefing payloads ',
        primaryOpenLoop: ' keep the same Phase 1 life loop explicit before the next execution turn ',
        nextClosureTarget: ' preserve landed progress inside execution runtime context blocks ',
      },
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
    } as any)

    expect(block).toContain('project_landed_progress=legacy execution-context project progress still survives from older runtime briefing payloads')
  })

  it('preserves structured affective residue inside execution runtime context so execution memory carry does not flatten into project briefing only', () => {
    const context = normalizeAlicizationExecutionRuntimeContext({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-affective-residue',
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_710_000_000_050,
        residues: [{
          kind: 'afterglow',
          intensity: 0.73,
          persistence: 0.68,
          confidence: 0.86,
          polarity: 'warm',
          releaseMode: 'delay-until-open-window',
          summary: 'Execution still wants to return on the same living line.',
          sourceSignals: ['execution-same-line'],
          lastUpdatedAt: 1_710_000_000_050,
        }],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.72,
        repairPressure: 0.18,
        burdenPressure: 0.05,
        trustPressure: 0.44,
        restProtectivePressure: 0.11,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.48,
          repairRecovery: 0.27,
          overreachRisk: 0.34,
          fatigueGuard: 0.16,
          afterglowCarry: 0.63,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['execution-same-line'],
          summary: 'Leave measured room before reopening the execution callback.',
        },
        sourceSignals: ['execution-same-line'],
        summary: 'Execution still wants a measured same-line return.',
      },
      derivedMindStateBundle: {
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 1_710_000_000_090,
          residues: [{
            kind: 'repair',
            intensity: 0.69,
            persistence: 0.72,
            confidence: 0.84,
            polarity: 'protective',
            releaseMode: 'delay-until-open-window',
            summary: 'Repair still wants the callback to stay quieter.',
            sourceSignals: ['execution-repair'],
            lastUpdatedAt: 1_710_000_000_090,
          }],
          dominantResidueKind: 'repair',
          afterglowPressure: 0.18,
          repairPressure: 0.77,
          burdenPressure: 0.09,
          trustPressure: 0.4,
          restProtectivePressure: 0.22,
          relationshipCadence: {
            cadenceMode: 'repair',
            distancePosture: 'measured-room',
            companionshipDensity: 0.41,
            repairRecovery: 0.71,
            overreachRisk: 0.29,
            fatigueGuard: 0.21,
            afterglowCarry: 0.28,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['execution-repair'],
            summary: 'Repair first before widening the execution callback.',
          },
          sourceSignals: ['execution-repair'],
          summary: 'Execution still carries repair pressure.',
        },
      },
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
    } as any)

    expect(context).toEqual(expect.objectContaining({
      affectiveResidue: expect.objectContaining({
        dominantResidueKind: 'afterglow',
        relationshipCadence: expect.objectContaining({
          cadenceMode: 'measured-return',
        }),
      }),
      derivedMindStateBundle: expect.objectContaining({
        affectiveResidue: expect.objectContaining({
          dominantResidueKind: 'repair',
          relationshipCadence: expect.objectContaining({
            cadenceMode: 'repair',
          }),
        }),
      }),
    }))

    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-affective-residue',
      affectiveResidue: {
        version: 'affective-residue-memory-v1',
        updatedAt: 1_710_000_000_050,
        residues: [],
        dominantResidueKind: 'afterglow',
        afterglowPressure: 0.72,
        repairPressure: 0.18,
        burdenPressure: 0.05,
        trustPressure: 0.44,
        restProtectivePressure: 0.11,
        relationshipCadence: {
          cadenceMode: 'measured-return',
          distancePosture: 'measured-room',
          companionshipDensity: 0.48,
          repairRecovery: 0.27,
          overreachRisk: 0.34,
          fatigueGuard: 0.16,
          afterglowCarry: 0.63,
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          reasonTags: ['execution-same-line'],
          summary: 'Leave measured room before reopening the execution callback.',
        },
        sourceSignals: ['execution-same-line'],
        summary: 'Execution still wants a measured same-line return.',
      },
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
    } as any)

    expect(block).toContain('affective_residue_kind=afterglow')
    expect(block).toContain('affective_residue_cadence=measured-return')
  })

  it('keeps audit-style landedProgressSummary alive inside execution project briefing when the explicit landed-progress slots are blank', () => {
    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-summary-progress',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: '   ',
        latestProgress: ' ',
        landedProgressSummary: ' Audit-style execution project progress still says the same-her Phase 1 loop has real landed continuity. ',
        primaryOpenLoop: ' keep the unfinished initiative, execution, memory, and embodiment closure visible ',
      },
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
    } as any)

    expect(block).toContain('project_landed_progress=Audit-style execution project progress still says the same-her Phase 1 loop has real landed continuity.')
  })

  it('prefers a richer project-aware execution briefing over a thin explicit Chinese awareness shell so execution starts knowing the project, landed progress, and open loop', () => {
    const thinChineseProjectBrief = '开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。'
    const richerProjectBriefing = 'Before execution begins, remember what this digital life project is, what has landed, and which life loop is still open.'

    const context = normalizeAlicizationExecutionRuntimeContext({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-thin-chinese-awareness',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side project briefing still needs to keep memory, initiative, and embodiment explicit before widening outward.',
        nextClosureTarget: 'Keep execution openings aware of the still-open same-her seam before they widen outward.',
        companionBriefingLine: richerProjectBriefing,
        preDialogueAwarenessLine: thinChineseProjectBrief,
      },
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
    } as any)

    expect(context?.projectBriefing).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: richerProjectBriefing,
      companionBriefingLine: richerProjectBriefing,
      latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
      primaryOpenLoop: 'Execution-side project briefing still needs to keep memory, initiative, and embodiment explicit before widening outward.',
      nextClosureTarget: 'Keep execution openings aware of the still-open same-her seam before they widen outward.',
    }))

    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-thin-chinese-awareness',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side project briefing still needs to keep memory, initiative, and embodiment explicit before widening outward.',
        nextClosureTarget: 'Keep execution openings aware of the still-open same-her seam before they widen outward.',
        companionBriefingLine: richerProjectBriefing,
        preDialogueAwarenessLine: thinChineseProjectBrief,
      },
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
    } as any)

    expect(block).toContain(`project_awareness=${richerProjectBriefing}`)
  })

  it('prefers a richer pre-dialogue awareness summary over a thin explicit awareness shell when normalizing shared execution runtime context', () => {
    const thinAwarenessLine = 'same digital life | keep closure explicit'
    const richerSummary = 'Before execution begins, remember this is still the same local-first digital life project, she is still inside Phase 1, and memory, initiative, execution, and embodiment still need to close as one living line before widening outward.'

    const context = normalizeAlicizationExecutionRuntimeContext({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-summary-precedence',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side project briefing still needs to keep memory, initiative, execution, and embodiment explicit before widening outward.',
        nextClosureTarget: 'Keep execution openings aware of the still-open same-her seam before they widen outward.',
        preDialogueAwarenessLine: thinAwarenessLine,
        preDialogueAwarenessSummary: richerSummary,
      },
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
    } as any)

    expect(context?.projectBriefing).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: richerSummary,
      preDialogueAwarenessSummary: richerSummary,
      latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
      primaryOpenLoop: 'Execution-side project briefing still needs to keep memory, initiative, execution, and embodiment explicit before widening outward.',
      nextClosureTarget: 'Keep execution openings aware of the still-open same-her seam before they widen outward.',
    }))

    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-summary-precedence',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side project briefing still needs to keep memory, initiative, execution, and embodiment explicit before widening outward.',
        nextClosureTarget: 'Keep execution openings aware of the still-open same-her seam before they widen outward.',
        preDialogueAwarenessLine: thinAwarenessLine,
        preDialogueAwarenessSummary: richerSummary,
      },
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
    } as any)

    expect(block).toContain(`project_awareness=${richerSummary}`)
    expect(block).not.toContain(`project_awareness=${thinAwarenessLine}`)
  })

  it('derives a same-her measured-return awareness line from continuity cadence when execution context only carries a thin awareness shell', () => {
    const thinAwarenessLine = 'Keep the same digital life project in view.'

    const context = normalizeAlicizationExecutionRuntimeContext({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-cadence-aware-reanchor',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution-side continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side embodiment still needs face and motion to rejoin the quieter same-her line.',
        nextClosureTarget: 'Keep execution openings on the same quieter living line before they widen outward again.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        continuityCadence: 'measured-return',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        preDialogueAwarenessLine: thinAwarenessLine,
      },
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
    } as any)

    expect(context?.projectBriefing).toEqual(expect.objectContaining({
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      preDialogueAwarenessLine: 'same-her hold: keep the return lower-pressure and slower before the line widens again.',
    }))

    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-cadence-aware-reanchor',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution-side continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side embodiment still needs face and motion to rejoin the quieter same-her line.',
        nextClosureTarget: 'Keep execution openings on the same quieter living line before they widen outward again.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        continuityCadence: 'measured-return',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
        preDialogueAwarenessLine: thinAwarenessLine,
      },
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
    } as any)

    expect(block).toContain('project_awareness=same-her hold: keep the return lower-pressure and slower before the line widens again.')
    expect(block).not.toContain(`project_awareness=${thinAwarenessLine}`)
  })

  it('fails closed on execution project-briefing placeholders so project awareness rebuilds from richer structured carry instead of leaking unknown shells', () => {
    const context = normalizeAlicizationExecutionRuntimeContext({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-placeholder-fail-close',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side project briefing still needs to keep emotion, memory, initiative, and embodiment explicit before widening outward.',
        nextClosureTarget: 'Keep execution openings aware of the still-open same-her seam before they widen outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If execution openings reopen from a generic shell, treat that as unfinished same-her drift.',
        companionBriefingLine: 'none',
        emotionalClosureSummary: 'n/a',
        preDialogueAwarenessLine: 'unknown',
      },
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
    } as any)

    expect(context?.projectBriefing).toEqual(expect.objectContaining({
      companionBriefingLine: null,
      emotionalClosureSummary: null,
    }))
    expect(context?.projectBriefing?.preDialogueAwarenessLine).toContain('Same Phase 1 digital life')
    expect(context?.projectBriefing?.preDialogueAwarenessLine).not.toBe('unknown')

    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-placeholder-fail-close',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side project briefing still needs to keep emotion, memory, initiative, and embodiment explicit before widening outward.',
        nextClosureTarget: 'Keep execution openings aware of the still-open same-her seam before they widen outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If execution openings reopen from a generic shell, treat that as unfinished same-her drift.',
        companionBriefingLine: 'none',
        emotionalClosureSummary: 'n/a',
        preDialogueAwarenessLine: 'unknown',
      },
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
    } as any)

    expect(block).toContain('project_identity=Alicization is a local-first digital life project.')
    expect(block).toContain('project_phase=Phase 1: Local Digital Life')
    expect(block).toContain('project_awareness=Same Phase 1 digital life.')
    expect(block).not.toContain('project_awareness=unknown')
    expect(block).not.toContain('project_companion_briefing=none')
    expect(block).not.toContain('project_emotional_closure=n/a')
  })

  it('keeps proactive same-her gap explicit inside execution project briefing so execution starts with the still-open long-run continuity seam in view', () => {
    const proactiveSameHerGap = 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.'
    const context = normalizeAlicizationExecutionRuntimeContext({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-proactive-same-her-gap',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side project briefing still needs to keep the long-run proactive same-her gap explicit.',
        nextClosureTarget: 'Keep execution openings aware of the still-open proactive same-her seam before they widen outward.',
        proactiveSameHerGap,
      },
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
    } as any)

    expect(context?.projectBriefing).toEqual(expect.objectContaining({
      proactiveSameHerGap,
    }))

    const block = buildAlicizationExecutionRuntimeContextBlock({
      generatedAt: 1_710_000_000_000,
      cardId: 'default',
      turnId: 'turn-ctx-proactive-same-her-gap',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side project briefing still needs to keep the long-run proactive same-her gap explicit.',
        nextClosureTarget: 'Keep execution openings aware of the still-open proactive same-her seam before they widen outward.',
        proactiveSameHerGap,
      },
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
    } as any)

    expect(block).toContain(`project_proactive_same_her_gap=${proactiveSameHerGap}`)
  })
})
