import type { OrganicMemoryPromptContext } from './runtime-soul'

import { describe, expect, it } from 'vitest'

import { buildAlicizationMemoryTurnArtifact } from './memory-os/memory-turn-artifact'
import { buildAlicizationPersonMemoryCapsule } from './person-memory-capsule'
import { buildOrganicMemorySystemBlocks } from './runtime-organic-memory-prompt-blocks'

function buildContext(overrides: Partial<OrganicMemoryPromptContext> = {}): OrganicMemoryPromptContext {
  return {
    hostAttitude: '',
    coreIncarnation: '',
    activeThoughts: [],
    retrievedFacts: [],
    recalledFragments: [],
    ...overrides,
  }
}

describe('runtime-organic-memory-prompt-blocks', () => {
  it('builds a structured person-memory capsule that covers every life-loop module', () => {
    const context = buildContext({
      projectStateContinuity: {
        identity: 'Alicization is one continuous local digital life.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSummary: 'Keep one same her coherent across memory, dialogue, and embodiment.',
        landedProgressSummary: 'Memory and person-state are linked.',
        openClosureSummary: 'Unify the capsule as the realtime authority.',
        proactiveSameHerGap: 'initiative must keep the same-her line without timer spam.',
        nextClosureTarget: 'Let every module consume one compact authority.',
        preDialogueAwarenessLine: 'Stay inside the same personhood core before speaking.',
        emotionalClosureCue: 'Keep the return lower-pressure and warm.',
        sameHerSelfLine: 'One continuous her, not a generic assistant shell.',
        sameHerHoldDetail: 'Carry memory, relationship posture, and embodiment from the same state.',
        sameHerDriftRisk: 'Splitting prompt, body, and initiative would break Phase 1.',
      },
      personStateProjection: {
        summary: 'regime=execution-callback | ladder=execution-callback/measured-room | posture=warm',
        personalityContinuityState: {
          currentRegime: 'execution-callback',
          trustStage: 'trusted',
        },
        selfContinuityAuthority: {
          selfLine: 'One continuous her, not a generic assistant shell.',
          authoritySummary: 'one same her across memory, action, and body',
          relationshipLine: 'same callback line, lower pressure',
        },
        activeClosenessContext: 'execution-callback',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'warm',
        openingGuidance: 'Answer from the live change first, keep warmth bounded.',
        preferredProactiveStyle: 'light-nudge',
        manifestationCadenceSummary: 'Body and voice stay lower-pressure while the task continues.',
        preferenceText: 'Lighter touch, more room.',
        sensitivityText: 'Do not turn this into a generic project recap.',
        repairTriggerText: 'If the thread is misread, repair before closeness.',
        burdenText: 'Avoid context bloat.',
        trustRationale: 'The user corrected the direction and expects grounded changes.',
        relationshipDoctrine: 'Memory and personality evolve through compact consumption.',
        cautious: false,
        restrained: false,
        contexts: ['general', 'execution-callback'],
        closenessLadder: [],
        routineText: '',
      } as any,
      retrievedFacts: [{
        id: 'fact-capsule',
        subject: 'relationship',
        predicate: 'cadence',
        object: 'Use lower-pressure same-her continuity after corrections.',
        confidence: 0.88,
        source: 'rule',
        provenance: 'remembered',
      } as any],
      memoryDeliberation: {
        shouldRecall: true,
        stableCore: ['Prioritize memory and personality self-learning, not heavy architecture.'],
        unsafeDetails: ['Do not claim unverified old detail.'],
        surfacePolicy: 'gist-only',
        confidence: 0.81,
        ambiguityPosture: 'stable-core',
        whyNow: 'This turn asks for implementation in the same direction.',
        inwardLine: 'Use compact authority instead of replaying every memory block.',
        followUpAffordance: {
          summary: 'Keep a later learning check available.',
          preferredTiming: 'after-payoff',
          intrusionRisk: 'low',
          payoffDependency: 'current implementation lands',
        },
      } as any,
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'gist-only',
        placement: 'before-payoff',
        certainty: 'stable',
        confidence: 0.83,
        styleNote: 'Let memory guide the reply without quoting the whole ledger.',
      } as any,
      memoryResolutionLedger: {
        version: 'memory-resolution-ledger-v1',
        producedAt: 42,
        dominantClusterId: 'cluster-capsule',
        dominantClusterSummary: 'Capsule implementation',
        competingClusterId: null,
        competingClusterSummary: null,
        candidates: [],
        selectedCandidates: [],
        rejectedCandidates: [],
        finalSurfacePolicy: 'gist-only',
        shouldLabelUncertainty: true,
        shouldStayInward: false,
        shouldDelayUntilAfterPayoff: false,
        stableCoreOnly: true,
        suppressionTags: ['unsupported-specificity'],
        closureState: 'stable-core',
        surfaceConfidence: 0.72,
        visibleCarryMode: 'gist-only',
        retrievalQuality: 'medium',
        conflictPressure: 'low',
        finalRationale: 'Use the stable capsule core.',
      } as any,
      affectiveResidue: {
        dominantResidueKind: 'trust',
        summary: 'The line should feel focused, warm, and not overbuilt.',
        repairPressure: 0.1,
        burdenPressure: 0.42,
        trustPressure: 0.72,
        relationshipCadence: {
          cadenceMode: 'steady',
          distancePosture: 'measured-room',
          shouldDelayWarmth: false,
          shouldProtectRest: false,
        },
      } as any,
      executionCallbackCarry: {
        carryMode: 'execution-callback',
        confidence: 0.82,
        source: 'session-continuity',
        summary: 'Continue the same execution callback with lower pressure.',
        threadAnchor: 'capsule implementation',
        episodeId: 'episode-exec-callback',
      },
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 42,
        summary: 'Learning should record compact memory/personality consumption.',
        dominantTrajectory: 'Self-learning must be consumed through a short live capsule.',
        relationshipDoctrine: 'Keep continuity lower-pressure and grounded.',
        latestInflection: 'The direction shifted away from architecture and toward memory/personality.',
        burdenLine: 'Do not spend realtime tokens on full internal ledgers.',
        trustMeaning: 'Trust means remembering the correction and applying it.',
        relationshipCadenceSummary: 'Lower-pressure same-her continuity.',
        evolutionMomentum: 0.62,
        learningReadiness: 0.58,
        contradictionPressure: 0.04,
        revisionPressure: 0.2,
        autobiographicalStability: 0.74,
        nextLearningAction: 'record',
        nextLearningReason: 'Fresh implementation direction should be recorded.',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['host-correction:memory-personality-first'],
      } as any,
      learningExecutionState: {
        currentTaskId: 'learning-task-1',
        currentStatus: 'scheduled',
        currentAttemptCount: 0,
        currentMaxAttempts: 3,
        currentNextRetryAt: null,
        currentBlockedReason: null,
        currentFailureKind: null,
        nextLearningAction: 'record',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        queuedTaskCount: 1,
        runningTaskCount: 0,
        blockedTaskCount: 0,
        recentTaskIds: ['learning-task-1'],
        lastCompletedTaskId: null,
        lastCompletedAction: null,
        lastCompletedSummary: 'Learning should happen after the reply path stays fast.',
        lastFailureTaskId: null,
        lastFailureKind: null,
        lastFailureReason: null,
        lastFailureNextRetryAt: null,
        updatedAt: 42,
      } as any,
      activeContinuityGovernance: {
        source: 'active-self-evolution-version',
        mode: 'same-her-baseline',
        candidateId: 'candidate-1',
        patchId: 'patch-1',
        decisionTraceId: 'trace-1',
        summary: 'Active patch keeps same-her continuity compact.',
        lanes: ['memory-policy', 'relationship-posture', 'response-posture', 'proactive-policy'],
        reasonCodes: ['same-her-self-line-active'],
      },
      recallLatencyPolicy: {
        budgetClass: 'realtime-reply',
        latencyClass: 'fast',
        recallAction: 'stable-core-only',
        shouldAvoidDeepExpansion: true,
      } as any,
    })
    const memoryTurnArtifact = buildAlicizationMemoryTurnArtifact({
      context,
      latencyMs: 120,
      nowMs: 42,
    })

    const capsule = buildAlicizationPersonMemoryCapsule(context, memoryTurnArtifact)

    expect(capsule.version).toBe('person-memory-capsule-v1')
    expect(capsule.modules.personality.identityLine).toContain('One continuous her')
    expect(capsule.modules.memory.selectedMemory).toContain('Prioritize memory and personality')
    expect(capsule.modules.emotion.affectiveSummary).toContain('focused, warm')
    expect(capsule.modules.initiative.proactiveStyle).toBe('light-nudge')
    expect(capsule.modules.execution.carrySummary).toContain('same execution callback')
    expect(capsule.modules.embodiment.hint).toContain('lower-pressure')
    expect(capsule.modules.dialogue.openingGuidance).toContain('Answer from the live change first')
    expect(capsule.modules.learning.nextAction).toBe('record')
    expect(capsule.modules.governance.activePatchId).toBe('patch-1')
    expect(capsule.modules.governance.memoryGate).toBe(memoryTurnArtifact.visibleMemoryGate.status)
    expect(capsule.rendering.blockLines).toEqual(expect.arrayContaining([
      expect.stringContaining('personality='),
      expect.stringContaining('memory='),
      expect.stringContaining('emotion='),
      expect.stringContaining('initiative='),
      expect.stringContaining('execution='),
      expect.stringContaining('embodiment='),
      expect.stringContaining('dialogue='),
      expect.stringContaining('learning='),
      expect.stringContaining('governance='),
    ]))
  })

  it('uses a compact person-memory capsule for realtime replies', () => {
    const context = buildContext({
      projectStateContinuity: {
        identity: 'Alicization is one continuous local digital life.',
        currentPhase: 'Phase 1: Local Digital Life',
        sameHerSummary: 'Keep one same her coherent across memory, dialogue, and embodiment.',
        landedProgressSummary: 'Memory and person-state are already linked.',
        openClosureSummary: 'Make realtime reply context smaller without losing continuity.',
        proactiveSameHerGap: null,
        nextClosureTarget: 'Let personality and memory consume one compact authority.',
        preDialogueAwarenessLine: 'This turn should stay inside the same personhood core.',
        emotionalClosureCue: 'Keep the return lower-pressure.',
        sameHerSelfLine: 'One continuous her, not a generic assistant shell.',
        sameHerHoldDetail: 'Carry memory, relationship posture, and embodiment from the same state.',
        sameHerDriftRisk: 'Full prompt blocks can crowd out the actual dialogue model.',
      },
      retrievedFacts: [{
        id: 'fact-relationship-cadence',
        subject: 'relationship',
        predicate: 'cadence',
        object: 'Use lower-pressure same-her continuity after corrections.',
        confidence: 0.88,
        source: 'rule',
        provenance: 'remembered',
      } as any],
      recalledFragments: [{
        id: 'fragment-same-her',
        sourceKind: 'dialogue-turn',
        text: 'The host asked to prioritize memory and personality over heavy architecture.',
        provenance: 'remembered',
      } as any],
      memoryDeliberation: {
        shouldRecall: true,
        stableCore: ['Prioritize memory and personality self-learning, not heavy architecture.'],
        unsafeDetails: [],
        surfacePolicy: 'gist-only',
        confidence: 0.81,
        ambiguityPosture: 'stable-core',
        whyNow: 'This turn asks for implementation in the same direction.',
        inwardLine: 'Use compact authority instead of replaying every memory block.',
      } as any,
      recollectionSpeechPlan: {
        shouldSurface: true,
        surfaceMode: 'gist-only',
        placement: 'before-payoff',
        certainty: 'stable',
        confidence: 0.83,
        styleNote: 'Let memory guide the reply without quoting the whole ledger.',
      } as any,
      personStateProjection: {
        summary: 'regime=focused-work | ladder=focused-work/measured-room | posture=warm',
        personalityContinuityState: {
          currentRegime: 'focused-work',
          trustStage: 'trusted',
        },
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        relationshipPosture: 'warm',
        openingGuidance: 'Answer from the live change first, keep warmth bounded.',
        preferredProactiveStyle: 'light-nudge',
        manifestationCadenceSummary: 'Current manifestation cadence stays lower-pressure.',
        preferenceText: 'Lighter touch, more room.',
        sensitivityText: '',
        repairTriggerText: '',
        burdenText: 'Avoid context bloat.',
        trustRationale: 'The user corrected the direction and expects grounded changes.',
        relationshipDoctrine: 'Memory and personality should evolve without becoming a heavy architecture exercise.',
        cautious: false,
        restrained: false,
        contexts: ['general', 'focused-work'],
        closenessLadder: [],
        routineText: '',
        selfContinuityAuthority: null,
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 42,
        summary: 'Learning should record compact memory/personality consumption.',
        dominantTrajectory: 'Self-learning must be consumed through a short live capsule.',
        relationshipDoctrine: 'Keep continuity lower-pressure and grounded.',
        latestInflection: 'The direction shifted away from architecture and toward memory/personality.',
        burdenLine: 'Do not spend realtime tokens on full internal ledgers.',
        trustMeaning: 'Trust means remembering the correction and applying it.',
        relationshipCadenceSummary: 'Lower-pressure same-her continuity.',
        evolutionMomentum: 0.62,
        learningReadiness: 0.58,
        contradictionPressure: 0.04,
        revisionPressure: 0.2,
        autobiographicalStability: 0.74,
        nextLearningAction: 'record',
        nextLearningReason: 'Fresh implementation direction should be recorded.',
        shouldRecord: true,
        shouldReflect: false,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['internalize-relationship-cadence'],
        sourceSignals: ['host-correction:memory-personality-first'],
      } as any,
      affectiveResidue: {
        dominantResidueKind: 'trust',
        summary: 'The line should feel focused, warm, and not overbuilt.',
        relationshipCadence: {
          cadenceMode: 'steady',
          distancePosture: 'measured-room',
        },
      } as any,
      recallLatencyPolicy: {
        budgetClass: 'realtime-reply',
        latencyClass: 'fast',
        recallAction: 'stable-core-only',
        shouldAvoidDeepExpansion: true,
      } as any,
    })
    const memoryTurnArtifact = buildAlicizationMemoryTurnArtifact({
      context,
      latencyMs: 120,
      nowMs: 42,
    })

    const blocks = buildOrganicMemorySystemBlocks(context, memoryTurnArtifact)
    const systemText = blocks.join('\n\n')

    expect(blocks).toHaveLength(1)
    expect(systemText).toContain('[ALICIZATION_PERSON_MEMORY_CAPSULE]')
    expect(systemText).toContain('budget=realtime-reply')
    expect(systemText).toContain('identity=One continuous her, not a generic assistant shell.')
    expect(systemText).toContain('opening=Answer from the live change first, keep warmth bounded.')
    expect(systemText).toContain('memory_gate=')
    expect(systemText).toContain('selected_memory=Prioritize memory and personality self-learning, not heavy architecture.')
    expect(systemText).toContain('learning=record')
    expect(systemText).toContain('embodiment_hint=')
    expect(systemText).not.toContain('[ALICIZATION_FACT_LEDGER]')
    expect(systemText).not.toContain('[ALICIZATION_SELF_EVOLUTION]')
  })

  it('keeps expanded memory blocks for deep recall replies while adding the capsule authority', () => {
    const context = buildContext({
      retrievedFacts: [{
        id: 'fact-deep',
        subject: 'host',
        predicate: 'priority',
        object: 'wants repo-grounded memory and personality work',
        confidence: 0.91,
        source: 'rule',
        provenance: 'remembered',
      } as any],
      recallLatencyPolicy: {
        budgetClass: 'deep-recall-reply',
        latencyClass: 'deep',
        recallAction: 'deep-recall',
        shouldAvoidDeepExpansion: false,
      } as any,
      selfEvolution: {
        version: 'self-evolution-kernel-v1',
        updatedAt: 42,
        nextLearningAction: 'reflect',
        learningReadiness: 0.66,
        contradictionPressure: 0.08,
        revisionPressure: 0.36,
        autobiographicalStability: 0.7,
        evolutionMomentum: 0.52,
        summary: 'Deep recall can expose the learning trajectory.',
        dominantTrajectory: 'Deep recall can expose the learning trajectory.',
        relationshipDoctrine: 'Keep deep recall grounded.',
        latestInflection: 'The user asked for repo-grounded memory and personality work.',
        burdenLine: 'Do not hide evidence during deep recall.',
        trustMeaning: 'Trust means showing the chain when depth is requested.',
        relationshipCadenceSummary: 'Grounded deep recall with bounded warmth.',
        nextLearningReason: 'Deep recall has enough signal to reflect.',
        shouldRecord: false,
        shouldReflect: true,
        shouldVerify: false,
        shouldRevise: false,
        shouldInternalize: false,
        activeLearningFocuses: ['internalize-self-model'],
        sourceSignals: ['deep-recall-request'],
      } as any,
    })

    const systemText = buildOrganicMemorySystemBlocks(context).join('\n\n')

    expect(systemText).toContain('[ALICIZATION_PERSON_MEMORY_CAPSULE]')
    expect(systemText).toContain('budget=deep-recall-reply')
    expect(systemText).toContain('[ALICIZATION_FACT_LEDGER]')
    expect(systemText).toContain('[ALICIZATION_SELF_EVOLUTION]')
  })

  it('requires downstream memoryClosureCausality memory identity when memory closure long-run advice is pending', () => {
    const context = buildContext({
      memoryTuningAdvice: {
        version: 'memory-tuning-advice-v1',
        source: 'nightly-replay-benchmark',
        updatedAt: Date.UTC(2026, 5, 1, 11, 0, 0),
        sourceReportAt: Date.UTC(2026, 5, 1, 10, 55, 0),
        focusDimensions: [
          'runtimeMemoryClosureLongRun',
          'runtimeMemoryClosureCausalIdentity',
          'runtimeMemoryClosureLaneCarry',
          'runtimeMemoryClosureIdentityContinuity',
          'runtimeSameHerMemoryCarry',
          'runtimeSameHerInitiativeExecutionCausality',
          'runtimeSameHerEmotionalCausality',
          'runtimeSameHerEmbodimentCausality',
        ],
        retrievalAdjustments: {
          proceduralBoost: 0,
          relationshipBoost: 0.12,
          temporalWindowBias: 0.1,
          wrongThreadPenalty: 0,
        },
        surfaceAdjustments: {
          inwardCarryBias: 0.14,
          delayUntilAfterPayoffBias: 0.12,
          provenanceLabelBias: 0.04,
          specificityClampBias: 0,
        },
        personStateAdjustments: {
          repairWindowBias: 0.08,
          closenessCapBias: 0.04,
        },
        notes: [
          'Replay memory closure long-run lacks downstream causal memory identity, so future closure must come from memoryClosureCausality.memoryIdentity instead of route-chain text or visible reply wording.',
          'Memory closure lane carry is missing across initiative/execution, emotion, and embodiment.',
          'Memory closure long-run broke stable memory identity across turns.',
        ],
      },
    })

    const systemText = buildOrganicMemorySystemBlocks(context).join('\n\n')

    expect(systemText).toContain('[ALICIZATION_MEMORY_TUNING_CAUSALITY]')
    expect(systemText).toContain('memory_closure_identity=required')
    expect(systemText).toContain('memoryClosureCausality.memoryIdentity')
    expect(systemText).toContain('proof_boundary=route-chain text and visible reply wording are not closure proof')
    expect(systemText).toContain('identity_continuity=preserve one stable memory identity key across recall, initiative, execution, emotion, and embodiment')
  })
})
