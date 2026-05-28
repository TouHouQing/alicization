import { describe, expect, it } from 'vitest'

import {
  buildAlicizationVisibleReplySurfacePlan,
  resolveAlicizationPreparedVisibleReplyExecution,
  resolveAlicizationTimeoutRecoveredVisibleReply,
} from './facade'
import { buildAlicizationDigitalLifeRuntimeSurface } from '../digital-life-kernel'
import { createDefaultVisualPresenceState } from '../visual-episodic-memory'

describe('visible-reply-facade', () => {
  it('prefers mind-turn contract authority over legacy reply execution surfaces', () => {
    const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: {
          version: 'mind-turn-contract-v1',
          answerIntent: 'Answer directly from the current knot.',
          answerAct: 'guide',
          turnMode: 'guide-current-knot',
          responseMode: 'guide-current-knot',
          evidenceMode: 'coarse-held',
          openingStyle: 'direct-answer',
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
          personaKernelMode: 'backgrounded',
          activeClosenessContext: 'focused-work',
          activeClosenessRung: 'space-first',
          relationshipPosture: 'restrained',
          labelCarryAsMemory: false,
          suppressAssociativeRecall: true,
          allowAffectionatePreface: false,
          allowStageDirections: false,
          allowBodyNarration: false,
          maxParagraphs: 2,
          maxSentences: 4,
          mustDo: ['Start with the answer immediately.'],
          mustNotDo: ['Do not narrate internal state.'],
          governingFocus: 'runtime seam',
          governingConcern: null,
          governingCommitment: null,
          governingInquiry: null,
          governingProject: null,
          reasons: ['The active knot still governs the turn.'],
          updatedAt: 100,
        },
        replyRealization: {
          replyRealizationMode: 'fallback-locally-allowed',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          whyProviderMindRequired: null,
        },
        replyExecutionPlan: {
          preferredMode: 'local-fallback',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          reason: 'legacy-surface',
        },
        runtimeSurface: {
          replyAuthority: {
            replyRealizationMode: 'fallback-locally-allowed',
            expectedVisibleReplyAuthority: 'local-deterministic-fallback',
            whyProviderMindRequired: null,
          },
          replyExecutionPlan: {
            preferredMode: 'local-fallback',
            expectedVisibleReplyAuthority: 'local-deterministic-fallback',
            reason: 'legacy-runtime-surface',
          },
        },
        governance: {
          visibleReplyAuthority: 'governed-repair-fallback',
        },
      } as any,
    })

    expect(visibleReplyExecution.expectedVisibleReplyAuthority).toBe('llm-mind')
    expect(visibleReplyExecution.mode).toBe('provider-stream')
    expect(visibleReplyExecution.providerMindExecuted).toBe(true)
  })

  it('upgrades legacy deterministic normal reply plans to provider-authored rewrite authority', () => {
    const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: null,
        replyRealization: {
          replyRealizationMode: 'fallback-locally-allowed',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          whyProviderMindRequired: null,
        },
        replyExecutionPlan: {
          preferredMode: 'local-fallback',
          expectedVisibleReplyAuthority: 'local-deterministic-fallback',
          reason: 'legacy-normal-fallback',
        },
        runtimeSurface: {
          replyAuthority: {
            replyRealizationMode: 'fallback-locally-allowed',
            expectedVisibleReplyAuthority: 'local-deterministic-fallback',
            whyProviderMindRequired: null,
          },
          replyExecutionPlan: {
            preferredMode: 'local-fallback',
            expectedVisibleReplyAuthority: 'local-deterministic-fallback',
            reason: 'legacy-runtime-normal-fallback',
          },
        },
        governance: {
          visibleReplyAuthority: 'governed-repair-fallback',
        },
      } as any,
    })

    expect(visibleReplyExecution.expectedVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(visibleReplyExecution.mode).toBe('provider-stream')
    expect(visibleReplyExecution.actualVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(visibleReplyExecution.providerMindExecuted).toBe(true)
  })

  it('does not let bare governance local fallback authority escape into normal visible reply execution', () => {
    const visibleReplyExecution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'local-deterministic-fallback',
        },
      } as any,
    })

    expect(visibleReplyExecution.expectedVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(visibleReplyExecution.mode).toBe('provider-stream')
    expect(visibleReplyExecution.providerMindExecuted).toBe(true)
    expect(visibleReplyExecution.actualVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
  })

  it('preserves explicit timeout recovery local fallback as infra-only visible reply authority', () => {
    const resolved = resolveAlicizationTimeoutRecoveredVisibleReply({
      prepared: {
        hasVisualGrounding: false,
        mindTurnContract: null,
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {
          replyAuthority: null,
          replyExecutionPlan: null,
        },
        governance: {
          visibleReplyAuthority: 'local-deterministic-fallback',
        },
      } as any,
      recoveredText: '{"reply":"这轮没把完整回答带出来。你把同一句再发一次，我就继续回。"}',
      recoveryMode: 'local-fallback',
    })

    expect(resolved.visibleReplyExecution.mode).toBe('local-fallback')
    expect(resolved.visibleReplyExecution.expectedVisibleReplyAuthority).toBe('llm-second-pass-rewrite')
    expect(resolved.visibleReplyExecution.actualVisibleReplyAuthority).toBe('local-deterministic-fallback')
    expect(resolved.visibleReplyExecution.providerMindExecuted).toBe(false)
    expect(resolved.visibleReplyExecution.reason).toBe('timeout-recovered-local-fallback')
    expect(resolved.visibleText).toBe('')
    expect(resolved.realization.blockedReasons).toContain('non-human-authored-visible-fallback')
  })

  it('emits same-seam procedural continuity discipline into visible reply surface plan system blocks', () => {
    const baseState = createDefaultVisualPresenceState(71_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...baseState,
      discourseState: {
        ...baseState.discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'Continue the same runtime seam without branching away.',
        owedAction: 'guide-task',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...baseState.mindSynthesis,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task',
        beliefs: baseState.mindSynthesis?.beliefs ?? [],
        uncertainties: baseState.mindSynthesis?.uncertainties ?? [],
        concerns: baseState.mindSynthesis?.concerns ?? [],
        commitments: baseState.mindSynthesis?.commitments ?? [],
        desires: baseState.mindSynthesis?.desires ?? [],
        openingIntent: 'Stay on the same active dialogue seam before branching.',
        truthBoundary: 'Only the stable procedure core should surface.',
        interiorSummary: 'The current seam should carry through as remembered procedure, not retrospective narration.',
        confidence: baseState.mindSynthesis?.confidence ?? 0.8,
        narrative: baseState.mindSynthesis?.narrative ?? [],
        updatedAt: baseState.mindSynthesis?.updatedAt ?? 71_000,
      },
    } as any)

    runtimeSurface.memory.recollectionSpeechPlan = {
      shouldSurface: true,
      surfaceMode: 'answer-anchoring',
      placement: 'inside-payoff',
      certainty: 'approximate',
      confidence: 0.84,
      internalLead: 'The active runtime seam should keep shaping the live answer.',
      visibleLead: 'It still feels like the same seam.',
      styleNote: 'Keep the remembered seam inside the live payoff.',
      rationale: 'The turn is still on the same runtime seam.',
    } as any
    runtimeSurface.memory.memoryDeliberation = {
      shouldRecall: true,
      surfacePolicy: 'answer-anchoring',
      confidence: 0.85,
      whyNow: 'The active runtime seam should keep shaping the live answer.',
      stableCore: ['Stay on the same active dialogue seam before branching.'],
      unsafeDetails: [],
      selectedPeriods: [],
      selectedEras: [{
        id: 'era-runtime',
        facet: 'task-era',
        summary: 'That task era kept returning to the same active dialogue seam.',
      }],
      selectedEpisodes: [],
      selectedProcedures: [{
        label: 'active dialogue seam first',
        approach: 'Stay on the same active dialogue seam before branching.',
      }],
      selectedBundles: [{
        id: 'bundle-runtime',
        summary: 'The active dialogue seam kept holding the same runtime thread.',
        confidence: 0.85,
      }],
      selectedChains: [{
        kind: 'task-procedure',
        summary: 'The answer should continue from the same active dialogue seam.',
        currentStance: 'Stay on the same active dialogue seam.',
        answerPosture: 'Carry the same active dialogue seam before widening out.',
        confidence: 0.84,
      }],
      selectedRelationshipLines: [],
      followUpAffordance: {
        summary: 'Carry the same active dialogue seam inside the current payoff.',
        whyNow: 'The host is still in the same runtime repair lane.',
        intrusionRisk: 'low',
        payoffDependency: 'can-surface-softly',
        preferredTiming: 'same-turn-if-invited',
      },
    } as any
    runtimeSurface.memory.derivedMindStateBundle = {
      version: 'derived-mind-state-bundle-v1',
      source: 'main-runtime',
      producedAt: 71_000,
      hostPersonModel: null,
      personStateProjection: null,
      knowledgeEvidence: null,
      selfEvolution: null,
      learningExecutionState: null,
      recollectionIntent: {
        mode: 'execution-procedure',
        temporalFocus: 'experience-matched',
        confidence: 0.86,
        rationale: 'The turn is continuing the same runtime seam.',
        recollectionAgenda: {
          goalSimilarity: 0.92,
          relationshipNeed: 0.12,
          uncertaintyTolerance: 'medium',
          candidateProcedureLines: ['active-dialogue', 'runtime seam'],
        },
      },
      recollectionPlan: null,
      recollectionSpeechPlan: runtimeSurface.memory.recollectionSpeechPlan as any,
      memoryDeliberation: runtimeSurface.memory.memoryDeliberation as any,
      dialogueRhythm: null,
      summary: 'surface=answer-anchoring | deliberation=answer-anchoring | recollection=execution-procedure',
    }

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 71_000,
      context: {
        system: {
          cpuUsage: 18,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.88, source: 'foreground-window-heuristic' },
        content: { kind: 'diff', confidence: 0.84, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 6,
          fatigue: 18,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 15,
          minute: 0,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        discourseState: runtimeSurface.dialogue.discourseState,
        mindSynthesis: runtimeSurface.dialogue.mindSynthesis,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
        claimEvidenceLedger: runtimeSurface.dialogue.claimEvidenceLedger,
        answerPlanner: runtimeSurface.dialogue.answerPlanner,
        answerCompiler: runtimeSurface.dialogue.answerCompiler,
        dialogueActKernel: runtimeSurface.dialogue.dialogueActKernel,
        conversationState: runtimeSurface.dialogue.conversationState,
        dialogueWorldThread: runtimeSurface.dialogue.dialogueWorldThread,
        replyDeliberation: runtimeSurface.dialogue.replyDeliberation,
        recallGovernor: runtimeSurface.memory.recallGovernor,
      } as any,
      runtimeSurface,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        currentForeground: null,
        recentObservations: [],
        groundedSignal: null,
        captureHealth: 'healthy',
        capturePermission: 'granted',
        degradedSignals: [],
        updatedAt: 71_000,
      } as any,
      answerCompiler: runtimeSurface.dialogue.answerCompiler ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
    })

    expect(surfacePlan.systemBlocks.responseCharter).toContain(
      'If same-seam procedure carry becomes visible, frame it as remembered prior procedure that keeps the current thread intact.',
    )
    expect(surfacePlan.systemBlocks.responseSurfaceContract).toContain(
      'Do not turn same-seam procedure carry into retrospective narration or execution impersonation.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'If same-seam procedure carry becomes visible, frame it as remembered prior procedure that keeps the current thread intact.',
    )
  })

  it('emits projected persona opening posture into final visible reply surface system blocks', () => {
    const baseState = createDefaultVisualPresenceState(72_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...baseState,
      discourseState: {
        ...baseState.discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'The host is still inside the same focused work knot.',
        owedAction: 'guide-task',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...baseState.mindSynthesis,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task',
        openingIntent: 'Stay with the live knot before widening outward.',
        truthBoundary: 'Keep the answer grounded in the current work knot.',
        interiorSummary: 'The opening should stay observant and low-pressure.',
        confidence: baseState.mindSynthesis?.confidence ?? 0.8,
        beliefs: baseState.mindSynthesis?.beliefs ?? [],
        uncertainties: baseState.mindSynthesis?.uncertainties ?? [],
        concerns: baseState.mindSynthesis?.concerns ?? [],
        commitments: baseState.mindSynthesis?.commitments ?? [],
        desires: baseState.mindSynthesis?.desires ?? [],
        narrative: baseState.mindSynthesis?.narrative ?? [],
        updatedAt: baseState.mindSynthesis?.updatedAt ?? 72_000,
      },
    } as any)
    runtimeSurface.memory.personStateProjection = {
      contexts: ['focused-work'],
      summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained | proactive=silent-observe',
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      closenessLadder: [{
        context: 'focused-work',
        rung: 'space-first',
        preference: 'Lighter touch, more room, less interruption pressure.',
        rationale: 'context=focused-work | regime=focused-work | posture=restrained',
        confidence: 0.86,
      }],
      relationshipPosture: 'restrained',
      openingGuidance: 'Open by observing first and keep the approach lighter.',
      preferredProactiveStyle: 'silent-observe',
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
      repairTriggerText: '',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Keep the work window light.',
      trustRationale: 'Trust is warming, but the host still needs room while focused.',
      relationshipDoctrine: 'Observe first, then decide whether closeness is welcome.',
      cautious: true,
      restrained: true,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        closenessPosture: 'space-first',
        repairPosture: 'measured-repair',
      } as any,
    }

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 72_000,
      context: {
        system: {
          cpuUsage: 18,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.88, source: 'foreground-window-heuristic' },
        content: { kind: 'diff', confidence: 0.84, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 6,
          fatigue: 18,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 15,
          minute: 5,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        discourseState: runtimeSurface.dialogue.discourseState,
        mindSynthesis: runtimeSurface.dialogue.mindSynthesis,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
        claimEvidenceLedger: runtimeSurface.dialogue.claimEvidenceLedger,
        answerPlanner: runtimeSurface.dialogue.answerPlanner,
        answerCompiler: runtimeSurface.dialogue.answerCompiler,
        dialogueActKernel: runtimeSurface.dialogue.dialogueActKernel,
        conversationState: runtimeSurface.dialogue.conversationState,
        dialogueWorldThread: runtimeSurface.dialogue.dialogueWorldThread,
        recallGovernor: runtimeSurface.memory.recallGovernor,
      } as any,
      runtimeSurface,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        currentForeground: null,
        recentObservations: [],
        groundedSignal: null,
        captureHealth: 'healthy',
        capturePermission: 'granted',
        degradedSignals: [],
        updatedAt: 72_000,
      } as any,
      answerCompiler: runtimeSurface.dialogue.answerCompiler ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
    })

    expect(surfacePlan.systemBlocks.responseCharter).toContain(
      'Let the opening stay observant and low-pressure before leaning closer.',
    )
    expect(surfacePlan.systemBlocks.responseCharter).toContain(
      'Do not force a direct proactive lead when this turn is persona-biased toward observant entry.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Let the opening stay observant and low-pressure before leaning closer.',
    )
  })

  it('emits self-evolution opening timing discipline into final visible reply surface system blocks', () => {
    const baseState = createDefaultVisualPresenceState(73_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...baseState,
      discourseState: {
        ...baseState.discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        currentTurnSummary: 'The host is still inside the same focused work knot.',
        owedAction: 'guide-task',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...baseState.mindSynthesis,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'guide-task',
        openingIntent: 'Stay with the live knot before widening outward.',
        truthBoundary: 'Keep the answer grounded in the current work knot.',
        interiorSummary: 'The opening should stay direct but lighter-pressure.',
        confidence: baseState.mindSynthesis?.confidence ?? 0.8,
        beliefs: baseState.mindSynthesis?.beliefs ?? [],
        uncertainties: baseState.mindSynthesis?.uncertainties ?? [],
        concerns: baseState.mindSynthesis?.concerns ?? [],
        commitments: baseState.mindSynthesis?.commitments ?? [],
        desires: baseState.mindSynthesis?.desires ?? [],
        narrative: baseState.mindSynthesis?.narrative ?? [],
        updatedAt: baseState.mindSynthesis?.updatedAt ?? 73_000,
      },
    } as any)
    runtimeSurface.memory.personStateProjection = {
      contexts: ['focused-work'],
      summary: 'regime=focused-work | ladder=focused-work/space-first | posture=restrained | proactive=light-nudge',
      activeClosenessContext: 'focused-work',
      activeClosenessRung: 'space-first',
      closenessLadder: [{
        context: 'focused-work',
        rung: 'space-first',
        preference: 'Lighter touch, more room, less interruption pressure.',
        rationale: 'context=focused-work | regime=focused-work | posture=restrained',
        confidence: 0.86,
      }],
      relationshipPosture: 'restrained',
      openingGuidance: 'Open with the live answer first and keep the approach lighter.',
      preferredProactiveStyle: 'light-nudge',
      preferenceText: 'Lighter touch, more room, less interruption pressure.',
      sensitivityText: 'Pressure and over-close timing become intrusive quickly.',
      repairTriggerText: '',
      burdenText: 'Focused work gets overloaded quickly by extra conversational pressure.',
      routineText: 'Keep the work window light.',
      trustRationale: 'Trust is warming, but the host still needs room while focused.',
      relationshipDoctrine: 'Open directly, but do not crowd the host.',
      cautious: true,
      restrained: true,
      personalityContinuityState: {
        currentRegime: 'focused-work',
        closenessPosture: 'space-first',
        repairPosture: 'measured-repair',
      } as any,
    }
    runtimeSurface.memory.selfEvolution = {
      version: 'self-evolution-kernel-v1',
      updatedAt: 72_500,
      evolutionMomentum: 0.66,
      learningReadiness: 0.76,
      contradictionPressure: 0.08,
      revisionPressure: 0.14,
      autobiographicalStability: 0.82,
      dominantTrajectory: 'earned lower-pressure companionship timing',
      relationshipDoctrine: 'Leave more room before closeness reopens.',
      latestInflection: 'Even when the opening is real, pressure lands worse than a slower return.',
      burdenLine: 'Focused work gets overloaded quickly by extra conversational pressure.',
      trustMeaning: 'Trust holds better when the opening stays lower-pressure and less eager.',
      nextLearningAction: 'internalize',
      nextLearningReason: 'The lower-pressure return is stable enough to become durable.',
      shouldRecord: false,
      shouldReflect: false,
      shouldVerify: false,
      shouldRevise: false,
      shouldInternalize: true,
      activeLearningFocuses: ['internalize-relationship'],
      sourceSignals: ['relationship-learning'],
      summary: 'Lower-pressure return is becoming durable relationship timing.',
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 73_000,
      context: {
        system: {
          cpuUsage: 18,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.88, source: 'foreground-window-heuristic' },
        content: { kind: 'diff', confidence: 0.84, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 6,
          fatigue: 18,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 15,
          minute: 10,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        discourseState: runtimeSurface.dialogue.discourseState,
        mindSynthesis: runtimeSurface.dialogue.mindSynthesis,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
        claimEvidenceLedger: runtimeSurface.dialogue.claimEvidenceLedger,
        answerPlanner: runtimeSurface.dialogue.answerPlanner,
        answerCompiler: runtimeSurface.dialogue.answerCompiler,
        dialogueActKernel: runtimeSurface.dialogue.dialogueActKernel,
        conversationState: runtimeSurface.dialogue.conversationState,
        dialogueWorldThread: runtimeSurface.dialogue.dialogueWorldThread,
        recallGovernor: runtimeSurface.memory.recallGovernor,
      } as any,
      runtimeSurface,
      inspectionRequested: false,
      groundedThisTurn: false,
      perceptionState: {
        watchMode: 'symbiotic-vision',
        currentScene: null,
        currentForeground: null,
        recentObservations: [],
        groundedSignal: null,
        captureHealth: 'healthy',
        capturePermission: 'granted',
        degradedSignals: [],
        updatedAt: 73_000,
      } as any,
      answerCompiler: runtimeSurface.dialogue.answerCompiler ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
    })

    expect(surfacePlan.systemBlocks.responseCharter).toContain(
      'Let long-horizon relationship timing keep the opening lower-pressure before closeness widens again.',
    )
    expect(surfacePlan.systemBlocks.responseCharter).toContain(
      'Do not let older closeness tempo or eager warmth reopen faster than this learned relationship timing supports.',
    )
  })
})
