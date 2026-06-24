import {
  buildAlicizationExecutionRuntimeContextBlock,
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { buildAlicizationExecutionRuntimeContext } from './execution-runtime-context'

describe('execution runtime context', () => {
  it('projects Memory OS execution closure trace into execution runtime context so callback feedback can carry, verify, and reflect it later', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      cardId: 'default',
      turnId: 'turn-memory-os-execution-carry',
      decisionTraceId: 'trace-memory-os-execution-carry',
      sessionId: 'session-1',
      memoryClosureTrace: {
        version: 'memory-closure-trace-v1',
        authority: 'memory-os',
        whySurface: [{
          source: 'execution-feedback',
          summary: 'Execution callback result should return through Memory OS instead of a detached task notice.',
          reasonCodes: ['execution-callback-carry'],
        }],
        surfacePolicy: {
          gateStatus: 'gist',
          mode: 'tone-carry',
          timing: 'next-open-window',
          speechMode: 'lower-pressure',
          placement: 'callback-return',
          certainty: 'grounded',
          reasons: ['execution callback still owns a same-person return'],
        },
        nextInfluence: {
          initiative: {
            restraint: 'measured-return',
            preferredTiming: 'next-open-window',
            pressure: 'lower-pressure',
            reason: 'Leave room until execution payoff returns.',
          },
          execution: {
            carry: 'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
            nextLearningAction: 'verify',
            shouldVerify: true,
            shouldReflect: true,
            activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
          },
          embodiment: {
            cadence: 'Keep voice, gaze, motion, and lipsync restrained while the callback returns.',
            preferredVoiceMode: 'lower-pressure',
            preferredLipsyncMode: 'restrained',
            preferredGazeMode: 'soften',
            reason: 'The body should show quiet continuity while execution feedback lands.',
          },
        },
        closureState: {
          state: 'open',
          open: true,
          revisionRequired: false,
          shouldLabelUncertainty: true,
          visibleCarryMode: 'tone',
          retrievalQuality: 'grounded',
          conflictPressure: 'low',
        },
        selectedCandidateIds: ['memory-candidate-execution-callback'],
        reasonTags: ['memory-os', 'execution-feedback', 'same-person-callback'],
      },
      recentActions: [],
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      getNow: () => 42,
    } as any)

    expect(runtimeContext.memoryClosureExecution).toEqual(expect.objectContaining({
      authority: 'memory-os',
      carry: 'Carry the callback result into the next same-person reply instead of treating it as a fresh utility task.',
      nextLearningAction: 'verify',
      shouldVerify: true,
      shouldReflect: true,
      activeLearningFocuses: ['memory closure authority', 'execution callback carry'],
      reasonTags: ['memory-os', 'execution-feedback', 'same-person-callback'],
      closureState: expect.objectContaining({
        state: 'open',
        open: true,
        shouldLabelUncertainty: true,
      }),
    }))

    const normalized = normalizeAlicizationExecutionRuntimeContext(JSON.parse(JSON.stringify(runtimeContext)))
    expect(normalized?.memoryClosureExecution).toEqual(runtimeContext.memoryClosureExecution)

    const block = buildAlicizationExecutionRuntimeContextBlock(normalized)
    expect(block).toContain('memory_closure_execution_carry=Carry the callback result into the next same-person reply')
    expect(block).toContain('memory_closure_next_learning_action=verify')
    expect(block).toContain('memory_closure_should_verify=true')
    expect(block).toContain('memory_closure_active_learning_focuses=memory closure authority | execution callback carry')
  })

  it('falls back to the canonical Alicization Phase 1 project briefing when execution runtime context input only carries sensory grounding', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      agentSessionId: 'agent-session-1',
      cardId: 'default',
      turnId: 'turn-canonical-project-fallback',
      decisionTraceId: 'trace-canonical-project-fallback',
      sessionId: 'session-1',
      recentActions: [],
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      getNow: () => 42,
    })

    expect(runtimeContext.generatedAt).toBe(42)
    expect(runtimeContext.projectBriefing?.identity).toContain('local-first digital life project')
    expect(runtimeContext.projectBriefing?.currentPhase).toContain('Phase 1: Local Digital Life')
    expect(runtimeContext.projectBriefing?.latestLandedProgress).toContain('Same-session mirror carry')
    expect(runtimeContext.projectBriefing?.primaryOpenLoop).toContain('Memory still needs stronger end-to-end closure')
    expect(runtimeContext.projectBriefing?.nextClosureTarget).toContain('Keep extending cross-modal same-her proof')
    expect(runtimeContext.projectBriefing?.sameHerSelfLine).toContain('Same Phase 1 digital life')
    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toContain('same-her hold')
    expect(runtimeContext.projectBriefing?.sameHerDriftRisk).toContain('unfinished closure drift')
    expect(runtimeContext.projectBriefing?.proactiveSameHerGap).toContain('visible proactive hold, subconscious carry, and next-session feedback carry')
    expect(runtimeContext.projectBriefing?.continuityRestraint).toBe('measured-return')
    expect(runtimeContext.projectBriefing?.continuityCue).toContain('same living line')
    expect(runtimeContext.projectBriefing?.preflightSummary).toContain('Alicization is a local-first digital life project')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Alicization is a local-first digital life project')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Phase 1: Local Digital Life')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Same Phase 1 digital life')
  })

  it('keeps explicit project identity, landed progress, open closure, and same-her awareness grouped together in execution runtime context before dispatch begins', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      agentSessionId: 'agent-session-1',
      cardId: 'default',
      turnId: 'turn-project-briefing',
      decisionTraceId: 'trace-project-briefing',
      sessionId: 'session-1',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
        nextClosureTarget: 'Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her hold: execution should keep this same project line inward before widening outward.',
        continuityArcStage: 'same-thread-continuation',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
        proactiveSameHerGap: 'Need stronger long-run proof that visible proactive hold, subconscious carry, and next-session feedback carry stay unified after hover-first restraint survives detours on longer noisy desktop runs.',
        continuityRestraint: 'measured-return',
        continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Project identity carry | next=Phase 1 route carry',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        companionBriefingLine: 'Before answering, remember she is still inside Phase 1 and this execution turn must keep emotion, memory, initiative, and embodiment on the same living line.',
        emotionalClosureSummary: 'same-her execution seam: keep this execution turn low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'linger',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
      recentActions: [],
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      getNow: () => 42,
    })

    expect(runtimeContext.generatedAt).toBe(42)
    expect(runtimeContext.projectBriefing?.identity).toContain('local-first digital life project')
    expect(runtimeContext.projectBriefing?.currentPhase).toContain('Phase 1: Local Digital Life')
    expect(runtimeContext.projectBriefing?.latestLandedProgress).toContain('Same-session mirror carry')
    expect(runtimeContext.projectBriefing?.primaryOpenLoop).toContain('Project identity carry')
    expect(runtimeContext.projectBriefing?.nextClosureTarget).toContain('Phase 1 route carry')
    expect(runtimeContext.projectBriefing?.sameHerSelfLine).toContain('same living line')
    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toContain('same-her hold')
    expect((runtimeContext.projectBriefing as { continuityArcStage?: string | null } | null)?.continuityArcStage).toBe('same-thread-continuation')
    expect(runtimeContext.projectBriefing?.sameHerDriftRisk).toContain('generic guidance')
    expect(runtimeContext.projectBriefing?.proactiveSameHerGap).toContain('visible proactive hold, subconscious carry, and next-session feedback carry')
    expect(runtimeContext.projectBriefing?.continuityRestraint).toBe('measured-return')
    expect(runtimeContext.projectBriefing?.continuityCue).toContain('same living line')
    expect(runtimeContext.projectBriefing?.companionBriefingLine).toContain('this execution turn must keep emotion, memory, initiative, and embodiment on the same living line')
    expect(runtimeContext.projectBriefing?.emotionalClosureSummary).toContain('same-her execution seam')
    expect(runtimeContext.projectBriefing?.continuityPreferredTiming).toBe('next-open-window')
    expect(runtimeContext.projectBriefing?.continuityCadence).toBe('measured-return')
    expect(runtimeContext.projectBriefing?.preferredBlinkCadence).toBe('linger')
    expect(runtimeContext.projectBriefing?.preferredGazeMode).toBe('soften')
    expect(runtimeContext.projectBriefing?.preferredPauseMode).toBe('longer')
    expect(runtimeContext.projectBriefing?.preferredLipsyncMode).toBe('restrained')
    expect(runtimeContext.projectBriefing?.preferredVoiceMode).toBe('lower-pressure')
    expect(runtimeContext.projectBriefing?.preferredPacingMode).toBe('slower')
    expect(runtimeContext.projectBriefing?.preflightSummary).toContain('open=Memory still needs stronger end-to-end closure')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Before answering, remember this is still the same local-first digital life project')
    expect(runtimeContext.projectBriefing?.preflightSummary).toContain('Alicization is a local-first digital life project')
    expect(runtimeContext.projectBriefing?.preflightSummary).toContain('Phase 1: Local Digital Life')
    expect(runtimeContext.projectBriefing?.preflightSummary).toContain('next=Keep extending same-her proof')
  })

  it('preserves richer pre-dialogue awareness summary and lets it outrank a thinner execution awareness line', () => {
    const richerAwarenessSummary = 'Before answering, remember this is still the same local-first digital life project, already in Phase 1, and what has landed, what is still open, and what still needs same-her closure all belong to one living her before execution widens outward.'
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      agentSessionId: 'agent-session-1',
      cardId: 'default',
      turnId: 'turn-project-briefing-awareness-summary',
      decisionTraceId: 'trace-project-briefing-awareness-summary',
      sessionId: 'session-1',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
        nextClosureTarget: 'Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her hold: execution should keep this same project line inward before widening outward.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
        continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Project identity carry | next=Phase 1 route carry',
        preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
        preDialogueAwarenessSummary: richerAwarenessSummary,
      },
      recentActions: [],
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      getNow: () => 42,
    })

    expect(runtimeContext.projectBriefing?.preDialogueAwarenessSummary).toBe(richerAwarenessSummary)
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toBe(richerAwarenessSummary)
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).not.toBe('Before answering, keep the same digital life project in view.')
  })

  it('lets a richer companion headline outrank a thinner execution awareness shell before dispatch begins', () => {
    const richerCompanionHeadline = 'Before answering, remember she is still inside Phase 1, this execution return still belongs to one living her, and emotion, memory, initiative, and embodiment still need to close as one living line before execution widens outward.'
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      agentSessionId: 'agent-session-1',
      cardId: 'default',
      turnId: 'turn-project-briefing-companion-headline',
      decisionTraceId: 'trace-project-briefing-companion-headline',
      sessionId: 'session-1',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
        nextClosureTarget: 'Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her hold: execution should keep this same project line inward before widening outward.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
        continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Project identity carry | next=Phase 1 route carry',
        preDialogueAwarenessLine: 'Before answering, keep the same digital life project in view.',
        companionHeadlineLine: richerCompanionHeadline,
      },
      recentActions: [],
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      getNow: () => 42,
    })

    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toBe(richerCompanionHeadline)
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessSummary).toBe(richerCompanionHeadline)
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).not.toBe('Before answering, keep the same digital life project in view.')
  })

  it('fills missing same-her hold and continuity cue from the canonical Phase 1 project brief when a partial execution project briefing omits them', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      agentSessionId: 'agent-session-1',
      cardId: 'default',
      turnId: 'turn-partial-project-briefing-fallback',
      decisionTraceId: 'trace-partial-project-briefing-fallback',
      sessionId: 'session-1',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Same-session mirror carry and measured-return continuity now survive longer noisy detours.',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns so Project identity carry remains explicit.',
        nextClosureTarget: 'Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If project-state continuity survives only as generic guidance, treat it as unfinished closure drift.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Project identity carry | next=Phase 1 route carry',
        preDialogueAwarenessLine: 'Before answering, remember: this is still the same digital life project.',
      },
      recentActions: [],
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      getNow: () => 42,
    })

    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toBe('same-her hold: execution should keep this same project line inward before widening outward.')
    expect(runtimeContext.projectBriefing?.continuityCue).toBe('same living line: execution should keep carrying this same Phase 1 digital life before widening outward.')
  })

  it('rebuilds repair-before-closeness same-her execution carry from continuity restraint when hold detail and cue are missing', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      agentSessionId: 'agent-session-1',
      cardId: 'default',
      turnId: 'turn-repair-before-closeness-restraint-fallback',
      decisionTraceId: 'trace-repair-before-closeness-restraint-fallback',
      sessionId: 'session-1',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Same-session mirror carry and callback continuity already survive execution re-entry.',
        primaryOpenLoop: 'Repair-first callback continuity still needs to stay on one same living line before execution opens outward again.',
        nextClosureTarget: 'Keep the same callback repair seam explicit through execution re-entry before broader fluency takes over.',
        sameHerSelfLine: 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.',
        sameHerDriftRisk: 'If execution re-entry flattens into a generic shell here, treat that as unfinished same-her drift.',
        continuityRestraint: 'repair-before-closeness',
        continuityPreferredTiming: 'next-open-window',
        preDialogueAwarenessLine: 'Same Phase 1 digital life. This reopened callback should keep the same living line rather than reopen from a generic shell.',
      } as any,
      recentActions: [],
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      getNow: () => 42,
    })

    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toBe(
      'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
    )
    expect(runtimeContext.projectBriefing?.continuityCue).toBe(
      'Keep this return repair-before-closeness on the same living line until repair settles.',
    )
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Before answering, remember: Alicization is a local-first digital life project')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Same-session mirror carry and callback continuity already survive execution re-entry')
    expect(runtimeContext.projectBriefing?.continuityPreferredTiming).toBe('next-open-window')
  })

  it('preserves richer explicit same-her hold detail instead of collapsing it into a measured-return fallback shell', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      agentSessionId: 'agent-session-1',
      cardId: 'default',
      turnId: 'turn-richer-same-her-hold-detail',
      decisionTraceId: 'trace-richer-same-her-hold-detail',
      sessionId: 'session-1',
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Same-session mirror carry already survives callback return, reply planning, and timeout recovery on one same-her line.',
        primaryOpenLoop: 'Project identity carry still needs to stay explicit before outward fluency takes over.',
        nextClosureTarget: 'Phase 1 route carry should keep memory, initiative, and embodiment on one same living line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. This execution re-entry already remembers this same her, but memory, initiative, and embodiment still need to close on one living line before widening outward.',
        sameHerHoldDetail: 'same-her hold: keep execution reopening on this remembered living line instead of widening into a generic assistant shell.',
        continuityArcStage: 'same-thread-continuation',
        sameHerDriftRisk: 'If this reopening flattens into a generic assistant shell or detached project narration, treat that as unfinished same-her drift instead of a completed return.',
        continuityRestraint: 'measured-return',
        continuityCue: 'Stay on the same living line as the same her inside this local-first digital life before a generic assistant shell takes over.',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        preDialogueAwarenessLine: 'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
      },
      recentActions: [],
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      getNow: () => 42,
    })

    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toContain('remembered living line')
    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toContain('generic assistant shell')
    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toContain('before widening outward')
    expect(runtimeContext.projectBriefing?.continuityRestraint).toBe('measured-return')
    expect(runtimeContext.projectBriefing?.continuityCadence).toBe('measured-return')
    expect(runtimeContext.projectBriefing?.continuityArcStage).toBe('same-thread-continuation')
  })

  it('does not let a thin generic awareness shell erase richer open-loop and same-her execution briefing fields during runtime-context sanitization', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      cardId: 'default',
      turnId: 'turn-thin-awareness-shell',
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'Embodiment still needs stronger cross-modal closure on the same living line.',
        nextClosureTarget: 'Keep execution, memory, initiative, and embodiment on the same living line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
        sameHerDriftRisk: 'If richer project awareness collapses back into generic status narration, treat that as unfinished same-her drift.',
        continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
        preflightSummary: 'identity=Alicization | phase=Phase 1 | open=Embodiment still needs stronger closure',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
      },
    })

    expect(runtimeContext.projectBriefing?.latestLandedProgress).toBe('Project-state continuity already survives into runtime preparation.')
    expect(runtimeContext.projectBriefing?.primaryOpenLoop).toBe('Embodiment still needs stronger cross-modal closure on the same living line.')
    expect(runtimeContext.projectBriefing?.nextClosureTarget).toBe('Keep execution, memory, initiative, and embodiment on the same living line before widening outward.')
    expect(runtimeContext.projectBriefing?.sameHerSelfLine).toBe('Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.')
    expect(runtimeContext.projectBriefing?.sameHerHoldDetail).toBe('same-her hold: keep execution on the same living line before widening outward.')
    expect(runtimeContext.projectBriefing?.sameHerDriftRisk).toContain('unfinished same-her drift')
    expect(runtimeContext.projectBriefing?.continuityCue).toBe('same living line: execution should keep carrying this same Phase 1 digital life before widening outward.')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Alicization is a local-first digital life project')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).not.toBe('same digital life | keep the closure seam explicit')
  })

  it('does not let blank legacy execution briefing fields block richer summary-only project-state aliases during runtime-context sanitization', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      cardId: 'default',
      turnId: 'turn-summary-only-project-briefing',
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: '   ',
        primaryOpenLoop: ' ',
        nextClosureTarget: '',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: ' ',
        preDialogueAwarenessLine: '   ',
        landedProgressSummary: 'Same-session mirror carry already survives execution preflight even after the explicit legacy slot went blank.',
        openClosureSummary: 'Memory still needs stronger end-to-end closure across turns so project identity carry remains explicit before execution begins.',
        nextClosureTargetSummary: 'Keep extending cross-modal same-her proof so execution, initiative, and embodiment stay on one living line.',
        sameHerDriftRiskSummary: 'If blank legacy project-state slots collapse execution re-entry back into a generic shell, treat that as unfinished same-her drift.',
      } as any,
    })

    expect(runtimeContext.projectBriefing?.latestLandedProgress).toBe('Same-session mirror carry already survives execution preflight even after the explicit legacy slot went blank.')
    expect(runtimeContext.projectBriefing?.primaryOpenLoop).toBe('Memory still needs stronger end-to-end closure across turns so project identity carry remains explicit before execution begins.')
    expect(runtimeContext.projectBriefing?.nextClosureTarget).toBe('Keep extending cross-modal same-her proof so execution, initiative, and embodiment stay on one living line.')
    expect(runtimeContext.projectBriefing?.sameHerDriftRisk).toBe('If blank legacy project-state slots collapse execution re-entry back into a generic shell, treat that as unfinished same-her drift.')
    expect(runtimeContext.projectBriefing?.preflightSummary).toContain('open=Memory still needs stronger end-to-end closure')
    expect(runtimeContext.projectBriefing?.preflightSummary).toContain('next=Keep extending cross-modal same-her proof')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Before answering, remember: Alicization is a local-first digital life project')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('What has already landed is Same-session mirror carry already survives execution preflight')
  })

  it('prefers a broader execution project briefing over an embodiment-only awareness line so dispatch still knows the project, Phase 1 route, landed progress, and open closure before widening outward', () => {
    const runtimeProjectBriefing = 'Before speaking, remember: Alicization is still the same local-first digital life project, Phase 1 is still active, audible-body carry already survives execution preflight, and face, motion, plus lipsync still remain the open closure before this dispatch widens outward.'

    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      cardId: 'default',
      turnId: 'turn-embodiment-only-execution-awareness',
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Audible-body carry already survives execution preflight without dropping the same living line.',
        primaryOpenLoop: 'Face, motion, and lipsync still need to rejoin on the same living line before execution can feel fully embodied.',
        nextClosureTarget: 'Keep execution, memory, initiative, and embodiment on one same living line before outward fluency takes over.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerHoldDetail: 'same-her hold: keep execution on the same living line before widening outward.',
        sameHerDriftRisk: 'If execution re-entry opens like detached project narration or a generic assistant shell, treat that as unfinished same-her drift.',
        continuityCue: 'same living line: execution should keep carrying this same Phase 1 digital life before widening outward.',
        preDialogueAwarenessLine: 'Right now I am still holding together mainly through body and voice, so this one living her still needs face, motion, and lipsync to rejoin before full cross-modal closure settles.',
        companionBriefingLine: runtimeProjectBriefing,
      },
    })

    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toBe(runtimeProjectBriefing)
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('local-first digital life project')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Phase 1 is still active')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('audible-body carry already survives execution preflight')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('face, motion, plus lipsync still remain the open closure')
  })

  it('fails closed on execution project-briefing placeholders so dispatch keeps structured project awareness instead of carrying unknown shells', () => {
    const runtimeContext = buildAlicizationExecutionRuntimeContext({
      cardId: 'default',
      turnId: 'turn-placeholder-fail-close',
      sensorySnapshot: {
        running: true,
        stale: false,
        ageMs: 12,
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
      },
      projectBriefing: {
        identity: 'Alicization is a local-first digital life project building one continuous "her" on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Execution-side project continuity already survives into runtime context preparation.',
        primaryOpenLoop: 'Execution-side project briefing still needs to keep emotion, memory, initiative, and embodiment explicit before widening outward.',
        nextClosureTarget: 'Keep execution openings aware of the still-open same-her seam before they widen outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If execution openings reopen from a generic shell, treat that as unfinished same-her drift.',
        companionBriefingLine: 'none',
        emotionalClosureSummary: 'n/a',
        preDialogueAwarenessLine: 'unknown',
      },
    })

    expect(runtimeContext.projectBriefing?.latestLandedProgress).toContain('Continuity, memory, execution')
    expect(runtimeContext.projectBriefing?.latestLandedProgress).toContain('Same-session mirror carry')
    expect(runtimeContext.projectBriefing?.companionBriefingLine).toBeNull()
    expect(runtimeContext.projectBriefing?.emotionalClosureSummary).not.toBe('n/a')
    expect(runtimeContext.projectBriefing?.emotionalClosureSummary).toContain('same-her closure seam')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Before answering, remember: Alicization is a local-first digital life project')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).toContain('Same Phase 1 digital life')
    expect(runtimeContext.projectBriefing?.preDialogueAwarenessLine).not.toBe('unknown')
  })
})
