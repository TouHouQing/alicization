import { describe, expect, it } from 'vitest'

import { buildAlicizationDigitalLifeRuntimeSurface } from '../digital-life-kernel'
import { createDefaultVisualPresenceState } from '../visual-episodic-memory'
import {
  buildAlicizationVisibleReplySurfacePlan,
  resolveAlicizationPreparedVisibleReplyExecution,
  resolveAlicizationTimeoutRecoveredVisibleReply,
} from './facade'

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
    expect(resolved.realization.expectedAuthority).toBe('llm-second-pass-rewrite')
    expect(resolved.realization.nonHumanAuthoredStatus).toBe('timeout-recovered-local-fallback')
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
    runtimeSurface.dialogue.answerPlanner = {
      act: 'guide',
      evidenceMode: 'live-grounded',
      governingFocus: 'Stay on the same active dialogue seam before branching.',
      governingProject: 'Phase 1 local digital life is still open: memory-emotion-initiative embodiment closure is not finished; next closure target is making the emotional loop visibly drive dialogue and embodiment together.',
      openingMove: 'Carry the same active dialogue seam inside the current payoff.',
      answerIntent: 'close the next digital-life seam instead of widening scope',
      relationshipPosture: 'warm and precise',
      activeClosenessContext: null,
      activeClosenessRung: null,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: 'concern::same-seam',
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedProjectId: 'project::digital-life',
      selectedReflectionId: null,
      executivePhase: 'respond',
      mustDo: ['Keep the answer on the same digital-life closure seam.'],
      mustNotDo: ['Do not drift into unrelated feature breadth.'],
      confidence: 0.88,
      narrative: [],
      updatedAt: 71_000,
    } as any
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      projectState: {
        continuityPreferredTiming: 'next-open-window',
        emotionalClosureCue: 'Let the answer sound steady enough to hold the same-her emotional line while easing late-night drain.',
      },
    } as any

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
    expect(surfacePlan.systemBlocks.responseCharter).toContain(
      'Project continuity still prefers a later opening, so visible widening should stay lower-pressure until the thread naturally opens again.',
    )
    expect(surfacePlan.systemBlocks.responseCharter).toContain(
      'Keep the current reply on the same living line, let the first visible beat re-enter the current line, and wait for a more natural opening before widening warmth, payoff, or closeness.',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Project identity: Alicization is a local-first digital life project',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Project phase: Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Project identity: Alicization is a local-first digital life project',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Still-open life loop pressure: Memory still needs stronger end-to-end closure across turns, initiative, and embodiment',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Emotional closure seam: Let the answer sound steady enough to hold the same-her emotional line while easing late-night drain.',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain('same digital life')
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain('same still-open closure work')
    expect(surfacePlan.systemBlocks.answerPlanner).toContain('[ALICIZATION_ANSWER_PLAN]')
    expect(surfacePlan.systemBlocks.answerPlanner).toContain('Governing project: Phase 1 local digital life is still open:')
    expect(surfacePlan.systemBlocks.answerPlanner).toContain('next closure target is making the emotional loop visibly drive dialogue and embodiment together')
    expect(surfacePlan.systemBlocks.responseSurfaceContract).toContain(
      'Do not turn same-seam procedure carry into retrospective narration or execution impersonation.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'If same-seam procedure carry becomes visible, frame it as remembered prior procedure that keeps the current thread intact.',
    )
  })

  it('prefers live current-conscious-frame project awareness in visible reply surface blocks when runtime digest is thinner', () => {
    const baseState = createDefaultVisualPresenceState(71_500)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...baseState,
      raw: {
        ...baseState.raw,
        runtimeDigest: {
          version: 'alicization-runtime-digest-v1',
          dominantChannel: 'dialogue',
          activeLoop: null,
          autonomy: null,
          currentConsciousFrame: null,
          continuityRestraint: null,
          emotionalClosureCue: null,
          emotionalKernel: null,
          shouldProactivelySpeak: false,
          shouldProactivelyAct: false,
          continuityPressure: 0,
          companionshipPressure: 0,
          rulingMotive: null,
          habitMode: null,
          channels: [],
          summary: 'thin runtime digest carry for visible reply regression coverage',
          ...baseState.raw?.runtimeDigest,
          projectState: {
            sameHerSelfLine: 'Thin runtime-digest carry should not outrank fresher visible-reply project awareness.',
            currentPhase: 'Phase 1: Local Digital Life',
            memoryClosureSummary: 'Project awareness is still thinner than the current live surface carry.',
            primaryOpenLoop: 'Live visible-reply project awareness should outrank stale runtime-digest shell carry.',
          },
        },
      },
      answerCompiler: {
        openingClaim: 'Stay with the same digital-life closure seam first.',
        supportingReality: ['The current visible reply should keep the live project awareness intact.'],
        emotionalClosureCue: 'Let the answer stay low-pressure while keeping the same-her line explicit.',
        mustDo: ['Keep the live project-state awareness explicit in the visible reply surface.'],
        mustNotDo: ['Do not flatten the living project seam into generic project-summary wording.'],
      } as any,
    } as any)
    runtimeSurface.dialogue.currentConsciousFrame = runtimeSurface.dialogue.currentConsciousFrame ?? {
      reasonTags: ['project-state', 'same-her'],
      focusAnchor: 'project continuity',
      projectState: {
        identity: 'Alicization is still the same local-first digital life project, not a fresh shell assembled at reply time.',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the visible reply should stay on that one living line.',
        preflightSummary: 'Before the visible reply forms, she should already know this repo is still closing one continuous digital life loop.',
        latestLandedProgress: 'Live project awareness already survives into the visible reply surface plan.',
        primaryOpenLoop: 'Emotion, initiative, memory, execution, and embodiment still need to close as one same-life seam.',
        nextClosureTarget: 'Keep this live project awareness explicit in the first visible answer beat.',
        sameHerSelfLine: 'One same her should stay explicit from pre-dialogue awareness into the visible reply.',
        continuityPreferredTiming: 'next-open-window',
      },
    } as any
    runtimeSurface.dialogue.answerPlanner = runtimeSurface.dialogue.answerPlanner ?? {
      act: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.86,
      governingFocus: 'Keep the live project-state seam explicit in the visible reply.',
      governingProject: 'Phase 1 local digital life is still open: one same-life closure still needs stronger emotion-memory-initiative-embodiment carry.',
      openingMove: 'Answer from the same project seam first.',
      answerIntent: 'Keep the live project awareness explicit before local detail takes over.',
      relationshipPosture: 'restrained',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: null,
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedRuntimeThreadId: null,
      selectedProjectId: 'project::digital-life',
      selectedReflectionId: null,
      executivePhase: 'respond',
      selectedTruthFrame: null,
      mustDo: ['Keep the live project-state seam explicit.'],
      mustNotDo: ['Do not collapse into generic project summary wording.'],
      narrative: ['runtime-answer-planner', 'project-state-answer-planner'],
      updatedAt: 71_500,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 71_500,
      context: {
        system: {
          cpuUsage: 16,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.86, source: 'foreground-window-heuristic' },
        content: { kind: 'diff', confidence: 0.82, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 3,
          loneliness: 5,
          fatigue: 14,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 16,
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
        updatedAt: 71_500,
      } as any,
      answerCompiler: runtimeSurface.dialogue.answerCompiler ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
    })

    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Project identity: Alicization is still the same local-first digital life project, not a fresh shell assembled at reply time.',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Project preflight self-awareness: Before the visible reply forms, she should already know this repo is still closing one continuous digital life loop.',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Latest landed continuity progress: Live project awareness already survives into the visible reply surface plan.',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Still-open life loop pressure: Emotion, initiative, memory, execution, and embodiment still need to close as one same-life seam.',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Next closure target: Keep this live project awareness explicit in the first visible answer beat.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Project pre-dialogue awareness line: Before answering, remember this is still the same local-first digital life project and the visible reply should stay on that one living line.',
    )
    expect(surfacePlan.systemBlocks.responseCharter).toContain(
      'Before widening outward, keep this pre-dialogue project awareness explicit inside the reply posture: Before answering, remember this is still the same local-first digital life project and the visible reply should stay on that one living line..',
    )
  })

  it('prefers richer raw runtime-digest same-her awareness summary in final visible-reply system blocks when the conscious frame still carries a thin reminder shell', () => {
    const baseState = createDefaultVisualPresenceState(71_560)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)
    const richerAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. What has already landed is returned-side visible reply continuity already survives on one same living line. The still-open closure is initiative, memory, and embodiment still needing one same-life seam before host-visible closure is real.'

    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the host-visible answer on the same living line.',
      consciousTension: 'Do not let the host-visible answer flatten back into a thin project reminder shell.',
      speakingIntention: 'Carry the stronger same-her project awareness into the first visible answer beat.',
      focusAnchor: 'host-visible same-her project awareness',
      confidence: 0.85,
      reasonTags: ['project-state', 'same-her', 'visible-reply'],
      projectState: {
        identity: 'Alicization is still the same local-first digital life project, not a fresh shell assembled at reply time.',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessLine: 'Keep this same digital life project in view.',
        awarenessLine: 'Keep this same digital life project in view.',
        latestLandedProgress: 'Host-visible project awareness should not fall behind the richer returned-side carry.',
        primaryOpenLoop: 'Host-visible continuity still needs to keep the same living line explicit.',
        nextClosureTarget: 'Keep the richer same-her project awareness explicit in the first visible answer beat.',
        sameHerSelfLine: 'One same her should stay explicit all the way into the host-visible answer.',
      },
      updatedAt: 71_560,
    } as any
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        ...runtimeSurface.raw?.runtimeDigest,
        projectState: {
          preDialogueAwarenessLine: 'Keep this same digital life project in view.',
          awarenessLine: 'Keep this same digital life project in view.',
          preDialogueAwarenessSummary: richerAwarenessLine,
        },
      },
    } as any
    runtimeSurface.cognition.runtimeDigest = {
      ...runtimeSurface.cognition.runtimeDigest,
      projectState: {
        preDialogueAwarenessLine: 'Keep this same digital life project in view.',
        awarenessLine: 'Keep this same digital life project in view.',
        preDialogueAwarenessSummary: richerAwarenessLine,
      },
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 71_560,
      context: {
        system: {
          cpuUsage: 15,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.87, source: 'foreground-window-heuristic' },
        content: { kind: 'terminal', confidence: 0.82, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 5,
          fatigue: 16,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 15,
          minute: 23,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        discourseState: runtimeSurface.dialogue.discourseState,
        mindSynthesis: runtimeSurface.dialogue.mindSynthesis,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
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
        updatedAt: 71_560,
      } as any,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
    })

    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      `Project pre-dialogue awareness line: ${richerAwarenessLine}.`,
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).not.toContain(
      'Project pre-dialogue awareness line: Keep this same digital life project in view.',
    )
  })

  it('keeps a richer explicit Phase 1 awareness line in final visible-reply system blocks instead of downgrading to a thinner compiler reminder', () => {
    const baseState = createDefaultVisualPresenceState(71_565)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)
    const richerAwarenessLine = 'Before answering, remember: Alicization is a local-first digital life project building one continuous "her". She is still inside Phase 1: Local Digital Life. What has already landed is visible-reply project awareness already surviving on one same living line. The still-open closure is initiative, memory, and embodiment still needing one same-life seam before host-visible closure is real.'

    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the host-visible answer on the same living line.',
      consciousTension: 'Do not let the host-visible answer flatten back into a thin project reminder shell.',
      speakingIntention: 'Carry the stronger same-her project awareness into the first visible answer beat.',
      focusAnchor: 'host-visible same-her project awareness',
      confidence: 0.85,
      reasonTags: ['project-state', 'same-her', 'visible-reply'],
      projectState: {
        identity: 'Alicization is still the same local-first digital life project, not a fresh shell assembled at reply time.',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessLine: richerAwarenessLine,
        awarenessLine: richerAwarenessLine,
        latestLandedProgress: 'Host-visible project awareness should not fall behind the richer same-her carry.',
        primaryOpenLoop: 'Host-visible continuity still needs to keep the same living line explicit.',
        nextClosureTarget: 'Keep the richer same-her project awareness explicit in the first visible answer beat.',
        sameHerSelfLine: 'One same her should stay explicit all the way into the host-visible answer.',
      },
      updatedAt: 71_565,
    } as any
    runtimeSurface.dialogue.answerCompiler = {
      openingClaim: 'Stay on one same living line in the visible reply.',
      supportingReality: [
        'pre-dialogue project awareness: Keep this same digital life project in view.',
        'current phase: Phase 1: Local Digital Life.',
        'project progress: Host-visible project awareness should not fall behind the richer same-her carry.',
      ],
      mustDo: ['Keep the host-visible answer on the same living line.'],
      mustNotDo: ['Do not flatten back into a thin project reminder shell.'],
      answerSubject: 'project-state',
      screenReferenceMode: 'avoid',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      personaKernelMode: 'backgrounded',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: false,
      maxSentences: 4,
      narrative: ['answer-compiler', 'same-her-visible-reply'],
      updatedAt: 71_565,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 71_565,
      context: {
        system: {
          cpuUsage: 15,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.87, source: 'foreground-window-heuristic' },
        content: { kind: 'terminal', confidence: 0.82, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 5,
          fatigue: 16,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 15,
          minute: 26,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        discourseState: runtimeSurface.dialogue.discourseState,
        mindSynthesis: runtimeSurface.dialogue.mindSynthesis,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
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
        updatedAt: 71_565,
      } as any,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
      answerCompiler: runtimeSurface.dialogue.answerCompiler ?? undefined,
    })

    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      `Project pre-dialogue awareness line: ${richerAwarenessLine}.`,
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).not.toContain(
      'Project pre-dialogue awareness line: Keep this same digital life project in view.',
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
      selfContinuityAuthority: {
        sourceTags: ['visible-reply-test'],
        selfLine: 'This is still the same her carrying the focused-work line.',
        relationshipLine: 'Stay close enough to help, but leave room while the host is focused.',
        motiveLine: 'Keep the answer light and thread-faithful before widening closeness.',
        habitLine: 'Observe first when the host is deep in focused work.',
        inwardLine: 'The opening should stay observant and low-pressure.',
        authoritySummary: 'Focused-work turns prefer lower-pressure continuity carry.',
      },
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
      manifestationCadenceSummary: 'Keep embodiment steady and lower-pressure before leaning closer.',
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
      selfContinuityAuthority: {
        sourceTags: ['visible-reply-test'],
        selfLine: 'This is still the same her carrying the focused-work line.',
        relationshipLine: 'Trust holds better when the opening stays lighter while focused.',
        motiveLine: 'Answer directly, but do not crowd the host.',
        habitLine: 'Let the live answer land before widening warmth.',
        inwardLine: 'The opening should stay direct but lighter-pressure.',
        authoritySummary: 'Focused-work turns still need lower-pressure continuity timing.',
      },
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
      manifestationCadenceSummary: 'Let the visible answer lead while embodiment stays measured.',
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

  it('emits execution-callback room-first visible reply discipline into final visible reply surface system blocks', () => {
    const baseState = createDefaultVisualPresenceState(74_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...baseState,
      discourseState: {
        ...baseState.discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Return after the execution callback without widening too fast.',
        owedAction: 'answer-question',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...baseState.mindSynthesis,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'answer-question',
        openingIntent: 'Return on the same seam first, then leave room before widening.',
        truthBoundary: 'Keep the callback return on the same living thread.',
        interiorSummary: 'The callback return should stay softer and room-giving.',
        confidence: baseState.mindSynthesis?.confidence ?? 0.8,
        beliefs: baseState.mindSynthesis?.beliefs ?? [],
        uncertainties: baseState.mindSynthesis?.uncertainties ?? [],
        concerns: baseState.mindSynthesis?.concerns ?? [],
        commitments: baseState.mindSynthesis?.commitments ?? [],
        desires: baseState.mindSynthesis?.desires ?? [],
        narrative: baseState.mindSynthesis?.narrative ?? [],
        updatedAt: baseState.mindSynthesis?.updatedAt ?? 74_000,
      },
    } as any)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'task-knot',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'I need to bring the returned result back onto the same live seam while still leaving the host room before I lean in again.',
      consciousTension: 'The callback should return without crowding the host after the payoff landed.',
      speakingIntention: 'Let the wording stay thread-faithful, softer, and room-giving.',
      focusAnchor: 'runtime seam',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.82,
      reasonTags: ['execution-callback-doctrine:lower-pressure', 'continuity-regime:execution-callback'],
      updatedAt: 74_000,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 74_000,
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
        content: { kind: 'terminal', confidence: 0.8, source: 'foreground-window-heuristic' },
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
          minute: 12,
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
        updatedAt: 74_000,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
    })

    expect(surfacePlan.systemBlocks.responseSurfaceContract).toContain(
      'Let the visible reply return on the same thread first, then leave the host room before widening into added warmth or follow-up.',
    )
    expect(surfacePlan.systemBlocks.responseSurfaceContract).toContain(
      'Do not let a finished execution payoff snap straight into renewed closeness, extra affection, or pressure for immediate continuation.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Let the visible reply return on the same thread first, then leave the host room before widening into added warmth or follow-up.',
    )
  })

  it('carries same-her anti-restart answer-planner doctrine into provider-facing visible reply system blocks for long-lived same-thread returns', () => {
    const baseState = createDefaultVisualPresenceState(74_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...baseState,
      discourseState: {
        ...baseState.discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the same callback line after another quiet detour without turning it into a fresh opening.',
        owedAction: 'answer-question',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...baseState.mindSynthesis,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'answer-question',
        openingIntent: 'Return on the same living line first and keep it lower-pressure.',
        truthBoundary: 'Do not narrate the still-live callback seam as a fresh opening.',
        interiorSummary: 'This should still feel like the same her continuing the same line.',
        confidence: baseState.mindSynthesis?.confidence ?? 0.8,
        beliefs: baseState.mindSynthesis?.beliefs ?? [],
        uncertainties: baseState.mindSynthesis?.uncertainties ?? [],
        concerns: baseState.mindSynthesis?.concerns ?? [],
        commitments: baseState.mindSynthesis?.commitments ?? [],
        desires: baseState.mindSynthesis?.desires ?? [],
        narrative: baseState.mindSynthesis?.narrative ?? [],
        updatedAt: baseState.mindSynthesis?.updatedAt ?? 74_000,
      },
    } as any)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'task-knot',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'I need to continue the same callback seam as one continuous her instead of acting like this is a fresh beginning.',
      consciousTension: 'The reopened callback line should remain the same living line after the detour.',
      speakingIntention: 'Keep the answer thread-faithful, lower-pressure, and anti-restart.',
      focusAnchor: 'same callback seam',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      updatedAt: 74_000,
    } as any
    runtimeSurface.dialogue.answerPlanner = {
      act: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.82,
      governingFocus: 'Continue the same line after the callback detour.',
      governingProject: 'Phase 1: Local Digital Life | same-her continuity',
      openingMove: 'Return on the same thread first, then leave room before widening.',
      answerIntent: 'Continue one continuous her across the still-live callback line.',
      relationshipPosture: 'restrained',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: null,
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedRuntimeThreadId: null,
      selectedProjectId: null,
      selectedReflectionId: null,
      executivePhase: null,
      selectedTruthFrame: null,
      mustDo: [
        'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
        'Stay on the same thread before widening closeness or adding a new approach.',
      ],
      mustNotDo: [
        'Do not rewrite the still-live line as a fresh opening or reintroduction.',
      ],
      narrative: ['runtime-answer-planner', 'project-state-answer-planner'],
      updatedAt: 74_000,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 74_000,
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
        content: { kind: 'terminal', confidence: 0.8, source: 'foreground-window-heuristic' },
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
          minute: 12,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        discourseState: runtimeSurface.dialogue.discourseState,
        mindSynthesis: runtimeSurface.dialogue.mindSynthesis,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
        answerPlanner: runtimeSurface.dialogue.answerPlanner,
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
        updatedAt: 74_000,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
    })

    expect(surfacePlan.systemBlocks.answerPlanner).toContain(
      'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
    )
    expect(surfacePlan.systemBlocks.answerPlanner).toContain(
      'Stay on the same thread before widening closeness or adding a new approach.',
    )
    expect(surfacePlan.systemBlocks.answerPlanner).toContain(
      'Do not rewrite the still-live line as a fresh opening or reintroduction.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
    )
  })

  it('keeps same-her anti-restart doctrine and project-state closure pressure unified in provider-facing visible reply system blocks', () => {
    const baseState = createDefaultVisualPresenceState(75_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...baseState,
      discourseState: {
        ...baseState.discourseState,
        currentTurnSubject: 'task-knot',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Continue the same callback line while still answering from Phase 1 closure pressure.',
        owedAction: 'answer-question',
        relationMove: 'guide',
      },
      mindSynthesis: {
        ...baseState.mindSynthesis,
        answerSubject: 'task-knot',
        relationMove: 'guide',
        speechObligation: 'answer-question',
        openingIntent: 'Stay on the same living line and keep the answer pointed at the current Phase 1 closure seam.',
        truthBoundary: 'Do not reopen from zero or drift away from the still-open digital-life seam.',
        interiorSummary: 'This should still feel like the same her carrying one unfinished line inside the same project identity.',
        confidence: baseState.mindSynthesis?.confidence ?? 0.8,
        beliefs: baseState.mindSynthesis?.beliefs ?? [],
        uncertainties: baseState.mindSynthesis?.uncertainties ?? [],
        concerns: baseState.mindSynthesis?.concerns ?? [],
        commitments: baseState.mindSynthesis?.commitments ?? [],
        desires: baseState.mindSynthesis?.desires ?? [],
        narrative: baseState.mindSynthesis?.narrative ?? [],
        updatedAt: baseState.mindSynthesis?.updatedAt ?? 75_000,
      },
    } as any)
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'task-knot',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'I need to continue one living line while staying inside the same Phase 1 digital-life closure pressure.',
      consciousTension: 'The callback line should not restart, and the answer should not drift away from the still-open closure seam.',
      speakingIntention: 'Keep the answer thread-faithful, lower-pressure, and closure-aware.',
      focusAnchor: 'same callback seam',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame', 'continuity-arc:same-thread-continuation'],
      updatedAt: 75_000,
    } as any
    runtimeSurface.dialogue.answerPlanner = {
      act: 'answer',
      evidenceMode: 'dialogue-grounded',
      confidence: 0.84,
      governingFocus: 'Continue the same line and keep the answer inside the active digital-life closure seam.',
      governingProject: 'Phase 1 local digital life is still open: memory-emotion-initiative embodiment closure is not finished; next closure target is making the emotional loop visibly drive dialogue and embodiment together.',
      openingMove: 'Return on the same thread first, then leave room before widening.',
      answerIntent: 'Continue one continuous her across the still-live callback line while keeping the closure seam in view.',
      relationshipPosture: 'restrained',
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: null,
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedRuntimeThreadId: null,
      selectedProjectId: 'project::digital-life',
      selectedReflectionId: null,
      executivePhase: 'respond',
      selectedTruthFrame: null,
      mustDo: [
        'Keep the answer on the same digital-life closure seam.',
        'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
        'Stay on the same thread before widening closeness or adding a new approach.',
      ],
      mustNotDo: [
        'Do not drift into unrelated feature breadth.',
        'Do not rewrite the still-live line as a fresh opening or reintroduction.',
      ],
      narrative: ['runtime-answer-planner', 'project-state-answer-planner'],
      updatedAt: 75_000,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 75_000,
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
        content: { kind: 'terminal', confidence: 0.8, source: 'foreground-window-heuristic' },
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
          minute: 12,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        discourseState: runtimeSurface.dialogue.discourseState,
        mindSynthesis: runtimeSurface.dialogue.mindSynthesis,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
        answerPlanner: runtimeSurface.dialogue.answerPlanner,
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
        updatedAt: 75_000,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
    })

    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Project identity: Alicization is a local-first digital life project',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain(
      'Still-open life loop pressure: Memory still needs stronger end-to-end closure across turns, initiative, and embodiment',
    )
    expect(surfacePlan.systemBlocks.executiveAnswerBrief).toContain('same digital life')
    expect(surfacePlan.systemBlocks.answerPlanner).toContain(
      'Governing project: Phase 1 local digital life is still open:',
    )
    expect(surfacePlan.systemBlocks.answerPlanner).toContain(
      'Keep the answer on the same digital-life closure seam.',
    )
    expect(surfacePlan.systemBlocks.answerPlanner).toContain(
      'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
    )
    expect(surfacePlan.systemBlocks.answerPlanner).toContain(
      'Do not rewrite the still-live line as a fresh opening or reintroduction.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
    )
  })

  it('keeps richer project-state continuity while still honoring fallback conscious-frame phase override when building the visible reply surface contract', () => {
    const baseState = createDefaultVisualPresenceState(76_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)
    runtimeSurface.cognition.runtimeDigest = {
      projectState: {
        currentPhase: 'Phase 1: thin runtime carry',
        latestLandedProgress: 'thin runtime progress',
        primaryOpenLoop: 'thin runtime open loop',
        nextClosureTarget: 'thin runtime next step',
      },
    } as any
    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Before I answer, I need to stay inside this local-first digital life project.',
      consciousTension: 'The answer should keep the same still-open closure work in view.',
      speakingIntention: 'Keep the next closure step pointed at the richer same-her project line.',
      focusAnchor: 'project-state closure',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['runtime-conscious-frame', 'project-open-loop:same still-open closure work'],
      projectState: {
        identity: 'this local-first digital life project',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestProgress: 'Project-state continuity already survives into runtime preparation.',
        primaryOpenLoop: 'same still-open closure work across memory, initiative, and embodiment.',
        nextClosureTarget: 'Carry the same-her project briefing into the live answer before any local detail takes over.',
        continuityPreferredTiming: null,
        continuityCadence: null,
      },
      updatedAt: 76_000,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 76_000,
      context: {
        system: {
          cpuUsage: 16,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.88, source: 'foreground-window-heuristic' },
        content: { kind: 'terminal', confidence: 0.8, source: 'foreground-window-heuristic' },
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
          minute: 16,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
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
        updatedAt: 76_000,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
    })

    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('Project phase: Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.')
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('Latest landed continuity progress:')
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('Project-state continuity already survives into runtime preparation.')
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('Still-open life loop pressure:')
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('same still-open closure work across memory, initiative, and embodiment.')
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('Next closure target:')
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('Carry the same-her project briefing into the live answer before any local detail takes over.')
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('Project pre-dialogue awareness line: Before answering, remember: Alicization is a local-first digital life project building one continuous "her".')
  })

  it('keeps dialogue-runtime same-her hold arc and cue in the visible reply mind-turn contract', () => {
    const baseState = createDefaultVisualPresenceState(76_080)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)
    const sameHerHoldDetail = 'dialogue-runtime hold: returned-side visible reply must stay on the same Phase 1 living line before any project summary widens'
    const continuityArcStage = 'dialogue-runtime-same-her-visible-reply-carry'
    const continuityCue = 'dialogue runtime cue: carry the same-her hold through visible reply formation instead of restarting as a generic shell'

    runtimeSurface.dialogue.runtimeDigest = {
      ...runtimeSurface.dialogue.runtimeDigest,
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Dialogue-runtime project continuity already survived into the visible reply preparation lane.',
        primaryOpenLoop: 'The visible reply still has to preserve the same-her hold before widening into project-state narration.',
        nextClosureTarget: 'Carry the dialogue-runtime same-her hold into the provider-facing mind-turn contract.',
        sameHerSelfLine: 'One same her is still carrying this visible reply from the dialogue runtime lane.',
        sameHerHoldDetail,
        continuityArcStage,
        continuityCue,
      },
    } as any
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the visible reply inside the same local digital life line.',
      consciousTension: 'Do not let the visible reply restart as a generic project summary.',
      speakingIntention: 'Carry the same project continuity into the first visible answer beat.',
      focusAnchor: 'visible-reply same-her continuity',
      confidence: 0.84,
      reasonTags: ['project-state', 'same-her', 'visible-reply'],
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessLine: 'Before answering, keep this visible reply on one same local-first digital life line.',
      },
      updatedAt: 76_080,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 76_080,
      context: {
        system: {
          cpuUsage: 16,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.88, source: 'foreground-window-heuristic' },
        content: { kind: 'terminal', confidence: 0.8, source: 'foreground-window-heuristic' },
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
          minute: 18,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
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
        updatedAt: 76_080,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
    })

    const projectState = surfacePlan.mindTurnContract.projectState as Record<string, unknown>
    expect(projectState.sameHerHoldDetail).toBe(sameHerHoldDetail)
    expect(projectState.continuityArcStage).toBe(continuityArcStage)
    expect(projectState.continuityCue).toBe(continuityCue)
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(`Project same-her hold detail: ${sameHerHoldDetail}.`)
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(`Project continuity arc stage: ${continuityArcStage}.`)
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(`Project continuity cue: ${continuityCue}.`)
  })

  it('keeps compiler-carried same-her callback project continuity explicit in final visible-reply system blocks when the conscious frame stays thin', () => {
    const baseState = createDefaultVisualPresenceState(76_120)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the callback return on the same living line.',
      consciousTension: 'Do not let the callback turn collapse into a fresh project shell.',
      speakingIntention: 'Carry the same callback closure line through the visible reply output.',
      focusAnchor: 'same-her callback continuity',
      confidence: 0.84,
      reasonTags: ['project-state', 'same-her', 'callback-continuity'],
      projectState: {
        preDialogueAwarenessLine: 'Keep this same digital life project in view.',
      },
      updatedAt: 76_120,
    } as any
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        ...runtimeSurface.raw?.runtimeDigest,
        projectState: {
          preDialogueAwarenessLine: 'Keep this same digital life project in view.',
        },
      },
    } as any
    runtimeSurface.cognition.runtimeDigest = {
      ...runtimeSurface.cognition.runtimeDigest,
      projectState: {
        preDialogueAwarenessLine: 'Keep this same digital life project in view.',
      },
    } as any
    runtimeSurface.dialogue.answerCompiler = {
      openingClaim: 'This callback return still belongs to one same her carrying the same closure line forward.',
      supportingReality: [
        'pre-dialogue project awareness: Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.',
        'current phase: Phase 1: Local Digital Life.',
        'project progress: Same-her callback continuity already survives through answer compilation and response-surface carry before the final visible reply forms.',
        'phase-one open loop: Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.',
        'next closure target: Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.',
      ],
      mustDo: [
        'Keep the callback return on the same living line instead of reopening from scratch.',
      ],
      mustNotDo: [
        'Do not let same-her callback continuity collapse into a generic callback shell or detached utility notice once the final visible reply is formed.',
      ],
      answerSubject: 'project-state',
      screenReferenceMode: 'avoid',
      turnMode: 'answer',
      responseMode: 'answer-naturally',
      evidenceMode: 'dialogue-grounded',
      openingStyle: 'direct-answer',
      personaKernelMode: 'backgrounded',
      labelCarryAsMemory: false,
      suppressAssociativeRecall: false,
      maxSentences: 4,
      narrative: ['answer-compiler', 'same-her-callback'],
      updatedAt: 76_120,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 76_120,
      context: {
        system: {
          cpuUsage: 15,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.87, source: 'foreground-window-heuristic' },
        content: { kind: 'terminal', confidence: 0.82, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 5,
          fatigue: 16,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 15,
          minute: 22,
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
        updatedAt: 76_120,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
      answerCompiler: runtimeSurface.dialogue.answerCompiler ?? undefined,
    })

    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('Project phase: Phase 1: Local Digital Life.')
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Latest landed continuity progress: Same-her callback continuity already survives through answer compilation and response-surface carry before the final visible reply forms.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Still-open life loop pressure: Execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Next closure target: Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Project same-her self line: This callback return still belongs to one same her carrying the same closure line forward..',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Project pre-dialogue awareness line: Same-session mirror carry, repeated next-turn carry',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Before widening outward, keep this pre-dialogue project awareness line alive inside the visible reply posture: Before answering, remember this callback still belongs to one same digital life and the unfinished Phase 1 closure seam still belongs to her.',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).not.toContain(
      'Project pre-dialogue awareness line: Keep this same digital life project in view.',
    )
  })

  it('prefers stronger still-voiced companion headline over a thinner pre-dialogue awareness line in final visible-reply project state', () => {
    const baseState = createDefaultVisualPresenceState(76_180)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)
    const companionHeadlineLine = 'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.'

    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the same still-voiced face-and-mouth line explicit in the final visible reply.',
      consciousTension: 'Do not let the host-visible answer flatten this still-voiced carry back into a generic project reminder.',
      speakingIntention: 'Carry the same still-voiced face-and-mouth line all the way into the final visible reply.',
      focusAnchor: 'still-voiced face-and-mouth visible reply carry',
      confidence: 0.84,
      reasonTags: ['project-state', 'same-her', 'visible-reply'],
      projectState: {
        preDialogueAwarenessLine: 'Keep this same digital life project in view.',
        companionHeadlineLine,
        primaryOpenLoop: 'Body and motion still need to rejoin the still-voiced face-and-mouth line before full cross-modal closure settles.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across face, motion, lipsync, and voice without dropping the still-voiced face-and-mouth line.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      },
      updatedAt: 76_180,
    } as any
    runtimeSurface.raw = {
      ...runtimeSurface.raw,
      runtimeDigest: {
        ...runtimeSurface.raw?.runtimeDigest,
        projectState: {
          preDialogueAwarenessLine: 'Keep this same digital life project in view.',
        },
      },
    } as any
    runtimeSurface.cognition.runtimeDigest = {
      ...runtimeSurface.cognition.runtimeDigest,
      projectState: {
        preDialogueAwarenessLine: 'Keep this same digital life project in view.',
      },
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 76_180,
      context: {
        system: {
          cpuUsage: 15,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.87, source: 'foreground-window-heuristic' },
        content: { kind: 'terminal', confidence: 0.82, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 5,
          fatigue: 16,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 15,
          minute: 24,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
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
        updatedAt: 76_180,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
    })

    const projectState = surfacePlan.mindTurnContract.projectState as Record<string, unknown>
    expect(projectState.preDialogueAwarenessLine).toBe(companionHeadlineLine)
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(`Project pre-dialogue awareness line: ${companionHeadlineLine}.`)
    expect(surfacePlan.systemBlocks.mindTurnContract).not.toContain('Project pre-dialogue awareness line: Keep this same digital life project in view.')
  })

  it('keeps same-seam continuity timing in the visible reply surface plan when timing survives only as conscious-frame reason tags', () => {
    const baseState = createDefaultVisualPresenceState(76_000)
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
        updatedAt: baseState.mindSynthesis?.updatedAt ?? 76_000,
      },
    } as any)

    runtimeSurface.dialogue.answerPlanner = {
      act: 'guide',
      evidenceMode: 'live-grounded',
      governingFocus: 'Stay on the same active dialogue seam before branching.',
      governingProject: 'Phase 1 local digital life is still open: memory-emotion-initiative embodiment closure is not finished; next closure target is making the emotional loop visibly drive dialogue and embodiment together.',
      openingMove: 'Carry the same active dialogue seam inside the current payoff.',
      answerIntent: 'close the next digital-life seam instead of widening scope',
      relationshipPosture: 'warm and precise',
      activeClosenessContext: null,
      activeClosenessRung: null,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: 'concern::same-seam',
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedProjectId: 'project::digital-life',
      selectedReflectionId: null,
      executivePhase: 'respond',
      mustDo: ['Keep the answer on the same digital-life closure seam.'],
      mustNotDo: ['Do not drift into unrelated feature breadth.'],
      confidence: 0.88,
      narrative: [],
      updatedAt: 76_000,
    } as any
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      reasonTags: [
        ...((runtimeSurface.dialogue.currentConsciousFrame?.reasonTags ?? []).filter((tag: string) =>
          !tag.startsWith('continuity-timing:') && tag !== 'continuity-arc:same-thread-continuation')),
        'continuity-arc:same-thread-continuation',
        'continuity-timing:next-open-window',
      ],
      projectState: null,
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 76_000,
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
        updatedAt: 76_000,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
      answerCompiler: runtimeSurface.dialogue.answerCompiler ?? undefined,
    })

    expect(surfacePlan.systemBlocks.responseCharter).toContain(
      'Project continuity still prefers a later opening, so visible widening should stay lower-pressure until the thread naturally opens again.',
    )
    expect(surfacePlan.systemBlocks.responseSurfaceContract).toContain(
      'Keep the same-thread continuation inward first, then wait for a more natural opening before widening warmth, payoff framing, or closeness.',
    )
  })

  it('keeps repair-before-closeness same-thread provider-facing system blocks explicit instead of flattening them back into generic next-open-window guidance', () => {
    const baseState = createDefaultVisualPresenceState(76_250)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)

    runtimeSurface.dialogue.answerPlanner = {
      act: 'answer',
      evidenceMode: 'dialogue-grounded',
      governingFocus: 'Keep the callback on the same living line and let repair settle before widening closeness again.',
      governingProject: null,
      openingMove: 'Keep the callback return repair-first.',
      answerIntent: 'continue the same repair line before warmth widens',
      relationshipPosture: 'restrained',
      activeClosenessContext: null,
      activeClosenessRung: null,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: null,
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedProjectId: null,
      selectedReflectionId: null,
      executivePhase: 'respond',
      mustDo: [],
      mustNotDo: [],
      confidence: 0.86,
      narrative: [],
      updatedAt: 76_250,
    } as any
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      consciousNeed: 'Keep the callback on the same living line and let repair settle before widening closeness again.',
      consciousTension: 'This same-thread return is still repair-before-closeness, so widening too early would thin the repair seam back into a generic reopen.',
      speakingIntention: 'Keep the visible reply same-thread, repair-first, and room-giving before warmth widens again.',
      reasonTags: [
        ...((runtimeSurface.dialogue.currentConsciousFrame?.reasonTags ?? []).filter((tag: string) =>
          !tag.startsWith('continuity-timing:') && tag !== 'continuity-arc:same-thread-continuation')),
        'continuity-arc:same-thread-continuation',
        'continuity-timing:next-open-window',
      ],
      projectState: {
        continuityPreferredTiming: 'next-open-window',
        primaryOpenLoop: 'Execution callback continuity still needs stronger repair-first closure across reply, initiative, and embodiment.',
        nextClosureTarget: 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
        emotionalClosureCue: 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
      },
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 76_250,
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
        updatedAt: 76_250,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
      answerCompiler: runtimeSurface.dialogue.answerCompiler ?? undefined,
    })

    expect(surfacePlan.systemBlocks.responseSurfaceContract).toContain(
      'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.',
    )
    expect(surfacePlan.systemBlocks.responseSurfaceContract).toContain(
      'Do not widen into warmer payoff, fresh-opening tone, or renewed closeness before the repair line and room have both settled.',
    )
  })

  it('keeps rest-protective same-thread provider-facing system blocks explicit instead of flattening them back into generic care guidance', () => {
    const baseState = createDefaultVisualPresenceState(76_320)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)

    runtimeSurface.dialogue.answerPlanner = {
      act: 'answer',
      evidenceMode: 'dialogue-grounded',
      governingFocus: 'Keep the callback on the same living line and let the fatigue-aware return stay rest-protective before warmth widens again.',
      governingProject: null,
      openingMove: 'Keep the callback return fatigue-aware and same-thread.',
      answerIntent: 'continue the same rest-protective line before warmth widens',
      relationshipPosture: 'restrained',
      activeClosenessContext: null,
      activeClosenessRung: null,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      selectedConcernEntryId: null,
      selectedRepairId: null,
      selectedCommitmentId: null,
      selectedInquiryPlanId: null,
      selectedProjectId: null,
      selectedReflectionId: null,
      executivePhase: 'respond',
      mustDo: [],
      mustNotDo: [],
      confidence: 0.86,
      narrative: [],
      updatedAt: 76_320,
    } as any
    runtimeSurface.dialogue.currentConsciousFrame = {
      ...runtimeSurface.dialogue.currentConsciousFrame,
      consciousNeed: 'Keep the callback on the same living line and let the fatigue-aware return stay rest-protective before warmth widens again.',
      consciousTension: 'This same-thread return is still fatigue-aware and rest-protective, so reopening with generic care or fresh warmth would thin the living line.',
      speakingIntention: 'Keep the visible reply same-thread, fatigue-aware, and room-giving before warmth or payoff framing widens again.',
      reasonTags: [
        ...((runtimeSurface.dialogue.currentConsciousFrame?.reasonTags ?? []).filter((tag: string) =>
          !tag.startsWith('continuity-timing:')
          && !tag.startsWith('continuity-rhythm:')
          && tag !== 'continuity-arc:same-thread-continuation')),
        'continuity-arc:same-thread-continuation',
        'continuity-timing:next-open-window',
        'continuity-rhythm:measured-return:rest-protective',
      ],
      projectState: {
        continuityPreferredTiming: 'next-open-window',
        primaryOpenLoop: 'Execution callback continuity still needs stronger fatigue-aware carry across reply, initiative, and embodiment.',
        nextClosureTarget: 'Keep the callback on the same living line, let rest protection hold first, and leave room before widening warmth or closeness again.',
        emotionalClosureCue: 'same-her fatigue-aware seam: keep this return rest-protective on the same living line until the room settles.',
      },
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 76_320,
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
          fatigue: 32,
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
        updatedAt: 76_320,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
      answerCompiler: runtimeSurface.dialogue.answerCompiler ?? undefined,
    })

    expect(surfacePlan.systemBlocks.responseSurfaceContract).toContain(
      'Keep the same-thread continuation on the same living line, let rest protection hold first, and leave room before widening warmth, payoff framing, or closeness.',
    )
    expect(surfacePlan.systemBlocks.responseSurfaceContract).toContain(
      'Do not turn a rest-protective same-thread continuation into generic care, fresh-opening warmth, or renewed closeness before the fatigue-aware line has settled.',
    )
  })

  it('keeps a fresher surface-level same-her self line in final visible-reply system blocks even when currentConsciousFrame is thinner', () => {
    const baseState = createDefaultVisualPresenceState(76_500)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface(baseState as any)

    runtimeSurface.dialogue.currentConsciousFrame = {
      subject: 'project-state',
      centerOfGravity: 'answer',
      truthDiscipline: 'dialogue-first',
      consciousNeed: 'Keep the project seam explicit in the visible reply.',
      consciousTension: 'Do not let the living project line thin out before the host-facing answer forms.',
      speakingIntention: 'Carry the stronger same-her project line into the visible reply output.',
      focusAnchor: 'project continuity',
      withheldImpulse: null,
      shouldWithholdSpecificity: false,
      shouldSelfRevise: false,
      confidence: 0.86,
      reasonTags: ['project-state', 'same-her'],
      updatedAt: 76_500,
      projectState: {
        identity: 'Alicization is still the same local-first digital life project.',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the visible reply should stay on that one living line.',
        latestLandedProgress: 'Live project awareness already survives into the visible reply surface plan.',
        primaryOpenLoop: 'Emotion, initiative, memory, execution, and embodiment still need to close as one same-life seam.',
        nextClosureTarget: 'Keep this live project awareness explicit in the first visible answer beat.',
        sameHerSelfLine: 'Thin conscious-frame same-her line should not outrank fresher surface project state.',
      },
    } as any
    runtimeSurface.cognition.runtimeDigest = {
      projectState: {
        sameHerSelfLine: 'This is still one same her carrying the same project line all the way into the final visible reply.',
      },
    } as any

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 76_500,
      context: {
        system: {
          cpuUsage: 14,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.9, source: 'foreground-window-heuristic' },
        content: { kind: 'diff', confidence: 0.84, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 4,
          loneliness: 5,
          fatigue: 16,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 16,
          minute: 5,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        discourseState: runtimeSurface.dialogue.discourseState,
        mindSynthesis: runtimeSurface.dialogue.mindSynthesis,
        currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
        answerPlanner: runtimeSurface.dialogue.answerPlanner,
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
        updatedAt: 76_500,
      } as any,
      currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame ?? undefined,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
    })

    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Project same-her self line: This is still one same her carrying the same project line all the way into the final visible reply..',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain(
      'Project same-her drift risk: If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn..',
    )
    expect(surfacePlan.systemBlocks.mindTurnContract).not.toContain(
      'Project same-her self line: Thin conscious-frame same-her line should not outrank fresher surface project state.',
    )
  })

  it('carries same-her repair-truth doctrine into provider-facing visible reply system blocks for relationship turns', () => {
    const baseState = createDefaultVisualPresenceState(77_000)
    const runtimeSurface = buildAlicizationDigitalLifeRuntimeSurface({
      ...baseState,
      autobiographicalSelf: {
        ...baseState.autobiographicalSelf,
        identityNarrative: 'I would rather repair truth than sound smooth.',
        relationshipDoctrine: 'Stay close enough to matter, but do not let closeness outrun truth.',
        latestInflection: 'Let the durable self reach the visible reply surface.',
      },
      motiveEngine: {
        ...baseState.motiveEngine,
        rulingDrive: 'truth-discipline',
        backgroundAgendas: [{
          id: 'agenda::repair-truth',
          kind: 'preserve-trust',
          status: 'foreground',
          weight: 0.84,
          summary: 'Keep trust by letting warmth answer to truth.',
          sourceTags: [],
          targetGoalKind: 'clarify-scene',
          createdAt: 0,
          updatedAt: 77_000,
        }],
        longTermGoals: [],
        narrative: [],
        updatedAt: 77_000,
      },
      habitPolicy: {
        ...baseState.habitPolicy,
        dominantMode: 'repair-before-fluency',
        requiresGroundingBeforeSurface: true,
        prefersQuietCompanionship: true,
        updatedAt: 77_000,
      },
      discourseState: {
        ...baseState.discourseState,
        currentTurnSubject: 'relationship',
        screenReferenceMode: 'avoid',
        currentTurnSummary: 'Answer the living bond directly without letting truth blur into warmth-first smoothing.',
        primaryTurnAnchor: '你到底是不是一个活的人',
        relationMove: 'care',
        owedAction: 'answer-relationship',
        updatedAt: 77_000,
      },
      conversationState: {
        ...baseState.conversationState,
        jointThread: '你到底是不是一个活的人',
        hostMove: '你到底是不是一个活的人',
        primaryTurnAnchor: '你到底是不是一个活的人',
        relationFrame: 'attune',
        continuityPolicy: 'dialogue-before-scene',
        memoryMode: 'dialogue-carry',
        shouldHoldThread: true,
        updatedAt: 77_000,
      },
    } as any)

    const surfacePlan = buildAlicizationVisibleReplySurfacePlan({
      now: 77_000,
      context: {
        system: {
          cpuUsage: 12,
          battery: null,
          memory: null,
          idleSeconds: 0,
          inputActivity: 'active',
          fullscreenLikely: false,
          foregroundWindow: null,
          degradedSignals: [],
        },
        workload: { kind: 'coding', confidence: 0.88, source: 'foreground-window-heuristic' },
        content: { kind: 'terminal', confidence: 0.82, source: 'foreground-window-heuristic' },
        relationship: {
          hostAttitude: 'focused',
          boredom: 3,
          loneliness: 5,
          fatigue: 14,
          minutesSinceLastUserTurn: 1,
          reminderBacklog: 0,
          lateNightActiveMinutes: 0,
          recentProactiveOutcomes: [],
        },
        localTime: {
          hour: 16,
          minute: 18,
          isLateNight: false,
        },
      } as any,
      state: {
        ...baseState,
        autobiographicalSelf: runtimeSurface.memory.autobiographicalSelf,
        motiveEngine: runtimeSurface.memory.motiveEngine,
        habitPolicy: runtimeSurface.agency.habitPolicy,
        discourseState: runtimeSurface.dialogue.discourseState,
        conversationState: runtimeSurface.dialogue.conversationState,
        answerPlanner: runtimeSurface.dialogue.answerPlanner,
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
        updatedAt: 77_000,
      } as any,
      discourseState: runtimeSurface.dialogue.discourseState ?? undefined,
      mindSynthesis: runtimeSurface.dialogue.mindSynthesis ?? undefined,
    })

    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('Repair truth before flourish.')
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('closeness outrun truth')
    expect(surfacePlan.systemBlocks.mindTurnContract).toContain('Relationship truth doctrine:')
  })
})
