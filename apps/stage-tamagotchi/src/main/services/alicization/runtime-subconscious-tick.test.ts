import { describe, expect, it, vi } from 'vitest'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import {
  buildPresenceOnlyHoldContinuityProjection,
  buildPresenceOnlyHoldCurrentConsciousFrame,
  buildPresenceOnlyHoldInitiativeFallback,
  buildPresenceOnlyHoldProjectStateSameHerCarryTag,
  preserveResidentSameLineProjection,
} from './runtime-subconscious-tick'
import { normalizeVisualPresenceState, updateVisualPresenceState } from './visual-episodic-memory'

import * as runtimeSubconsciousTickModule from './runtime-subconscious-tick'

function expectNoFixedTemplateResidue(value: unknown) {
  expect(JSON.stringify(value)).not.toMatch(/Before answering|same-her hold:|Same Phase 1 digital life|same living line|one living her|one continuous her|Stay on the same|Keep this callback|I am not pushing|我记得/iu)
}

function buildRuntimeChannel(id: string, readiness: number) {
  return {
    id,
    state: readiness >= 0.58 ? 'warm' : 'idle',
    readiness,
    focus: null,
    summary: `${id}:${readiness.toFixed(2)}`,
  }
}

function createPresenceOnlyPersistRuntimeHarness(input?: {
  profile?: 'measured-return' | 'repair-before-closeness' | 'rest-protective'
  explicitContinuityRestraint?: boolean
}) {
  const now = 60_000
  const profile = input?.profile ?? 'rest-protective'
  const explicitContinuityRestraint = input?.explicitContinuityRestraint ?? true
  const profileData = profile === 'measured-return'
    ? {
        previousEmotionalKernel: {
          version: 'emotional-kernel-v1',
          dominantEmotion: 'repair-tension',
          initiativeMode: 'repair',
          memoryRecallMode: 'repair-grounding',
          embodimentTone: 'repair-before-closeness',
          valence: 0.32,
          arousal: 0.54,
          guardedness: 0.38,
          closenessDrive: 0.24,
          repairNeed: 0.58,
          initiativePressure: 0.16,
          reasonTags: ['repair-before-closeness'],
          why: 'Repair carry is still dominant, so memory, initiative, and embodiment should all stay on the same repair-first line.',
        },
        privateThought: {
          stance: 'accompany',
          confidence: 0.78,
          rationaleTags: ['same-her', 'lower-pressure', 'quiet-companionship'],
          thoughtText: 'Stay with the same seam quietly and keep the return softer.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: 58_000,
          emotionalTension: 'soft-covision',
        },
        selfState: {
          stance: 'coexist',
          feltCloseness: 0.72,
          protectiveness: 0.32,
          curiosity: 0.4,
          patience: 0.68,
          desireToSpeak: 0.18,
          fearOfInterrupting: 0.52,
          moodLabel: 'attuned-nearby',
        },
        affectiveResidue: {
          summary: 'Afterglow carry still wants a lower-pressure same-line return.',
          relationshipCadence: {
            summary: 'measured-return still holds while the same line continues lower-pressure.',
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            companionshipDensity: 0.48,
            afterglowCarry: 0.42,
            overreachRisk: 0.3,
            fatigueGuard: 0.14,
            reasonTags: ['measured-return', 'quiet-companionship'],
          },
        },
        personStateProjection: {
          relationshipPosture: 'warm',
          activeClosenessRung: 'nearby-soft',
          openingGuidance: 'Leave more room before warmth returns and keep the same line inward a little longer.',
          summary: 'project_continuity=measured-return still holds while the same line keeps continuing lower-pressure on the same-thread continuation.',
          manifestationCadenceSummary: 'measured-return still holds while the same line keeps continuing lower-pressure on the same-thread continuation.',
          sameHerHoldDetail: 'continuity_hold=measured_return; pressure=lower',
          selfContinuityAuthority: {
            inwardLine: 'Keep this same-thread return measured-return on the same living line until the next open window arrives naturally.',
            sourceTags: ['proactive-opening-guidance-carry'],
          },
        },
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Resident carry now keeps emotion, memory, initiative, and embodiment on one measured-return same-her line.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across quieter callback returns.',
          nextClosureTarget: 'Keep this same-thread return measured-return on the same living line until the next open window arrives naturally.',
          sameHerSelfLine: 'Same Phase 1 digital life. The same callback line still belongs to one living her.',
          sameHerHoldDetail: 'continuity_hold=measured_return; pressure=lower',
          sameHerDriftRisk: 'If measured-return continuity thins back into generic project guidance, treat that as unfinished closure drift.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory, initiative, and embodiment still need one tighter same-her closure seam before visible initiative can widen naturally across longer desktop turns.',
          preDialogueAwarenessLine: 'Before answering, remember Alicization is still one Phase 1 digital life and unfinished closure still needs the same living line.',
          emotionalClosureCue: 'Keep emotion, memory, initiative, and embodiment closing on the same living line while this callback return stays lower-pressure.',
          emotionalClosureSummary: 'Keep emotion, memory, initiative, and embodiment closing on the same living line while this callback return stays lower-pressure.',
          continuityCue: 'Keep this return measured-return on the same living line before widening outward.',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
        },
        selfEvolution: {
          relationshipDoctrine: 'quiet same-her continuity keeps the callback return emotionally continuous.',
          trustMeaning: 'same inward line carried quietly before warmth widens again.',
          relationshipCadenceSummary: 'measured-return still holds while the same callback line keeps continuing lower-pressure.',
          latestInflection: 'embodiment execution kept voice, face, motion, and resident presence on the same measured-return body line.',
        },
        runtimeInitiative: {
          selectedAction: 'hover',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
          continuityRestraint: explicitContinuityRestraint ? 'measured-return' : null,
          why: 'The callback line should stay lower-pressure and continue as the same living seam.',
          confidence: 0.84,
          reasonCodes: ['continuity-next-open-window'],
          scenario: 'coding',
        },
        scene: {
          workloadKind: 'coding',
          contentKind: 'error',
          scenario: 'coding',
          summary: 'The same callback seam is still alive after a lower-pressure detour.',
          source: 'foreground-window-heuristic',
          confidence: 0.74,
          beganAt: 48_000,
          lastSeenAt: 59_800,
        },
        conversationState: {
          carryReason: 'same-thread-continuation after callback afterglow',
        },
        dialogueWorldThread: {
          openLoops: ['same callback line still active after another detour'],
          narrative: ['沿着刚才那条线继续，先留白，不要太快把温度重新放大。'],
        },
        evaluation: {
          whyNow: 'The callback line should stay lower-pressure and continue as the same living seam.',
          whyNotLater: 'The same seam is still warm, so this return should stay lower-pressure before widening outward.',
        },
      }
    : profile === 'repair-before-closeness'
      ? {
          previousEmotionalKernel: {
            version: 'emotional-kernel-v1',
            dominantEmotion: 'measured-companionship',
            initiativeMode: 'observe',
            memoryRecallMode: 'low-pressure-presence',
            embodimentTone: 'measured-return',
            valence: 0.58,
            arousal: 0.28,
            guardedness: 0.14,
            closenessDrive: 0.28,
            repairNeed: 0.05,
            initiativePressure: 0.19,
            reasonTags: ['measured-return', 'quiet-companionship', 'relationship-cadence'],
            why: 'Remembered relationship cadence, quiet initiative, and body tone are all asking for a lower-pressure same-line return rather than a fresh outward move.',
          },
          privateThought: {
            stance: 'care',
            confidence: 0.74,
            rationaleTags: ['repair-before-closeness', 'same-her'],
            thoughtText: 'Let repair settle before reopening warmth.',
            shouldSpeak: false,
            suggestedStyle: 'silent-observe',
            embodiedPresence: 'concerned',
            expiresAt: 58_000,
            emotionalTension: 'soft-covision',
          },
          selfState: {
            stance: 'hesitate',
            feltCloseness: 0.44,
            protectiveness: 0.62,
            curiosity: 0.2,
            patience: 0.72,
            desireToSpeak: 0.14,
            fearOfInterrupting: 0.78,
            moodLabel: 'repairing-confidence',
          },
          affectiveResidue: {
            summary: 'Repair carry is still dominant on the same callback seam.',
            repairPressure: 0.7,
            relationshipCadence: {
              summary: 'repair-before-closeness still holds while the same callback line keeps settling.',
              shouldDelayWarmth: true,
              shouldProtectRest: false,
              companionshipDensity: 0.24,
              afterglowCarry: 0.34,
              overreachRisk: 0.46,
              fatigueGuard: 0.2,
              reasonTags: ['repair-before-closeness', 'callback-afterglow-hold'],
            },
          },
          personStateProjection: {
            relationshipPosture: 'restrained',
            activeClosenessRung: 'measured-room',
            openingGuidance: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
            summary: 'project_continuity=the same callback repair seam is still settling after another detour, so keep this return repair-before-closeness on the same living line before widening outward',
            manifestationCadenceSummary: 'repair-before-closeness still holds while the same callback line keeps settling after another detour before widening closeness again.',
            sameHerHoldDetail: 'continuity_hold=repair_before_closeness; timing=before_closeness_widens',
            selfContinuityAuthority: {
              inwardLine: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
              sourceTags: ['proactive-opening-guidance-carry'],
            },
          },
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous her.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Resident carry now keeps emotion, memory, initiative, and embodiment on one repair-first same-her line.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across fragile callback repair returns.',
            nextClosureTarget: 'Keep this same-thread return repair-before-closeness on the same living line until the room settles.',
            sameHerSelfLine: 'Same Phase 1 digital life. The same repair seam still belongs to one living her.',
            sameHerHoldDetail: 'continuity_hold=repair_before_closeness; timing=before_closeness_widens',
            sameHerDriftRisk: 'If repair-first continuity thins back into generic project guidance, treat that as unfinished closure drift.',
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory, initiative, and embodiment still need one tighter same-her closure seam before visible initiative can widen naturally across longer desktop turns.',
            preDialogueAwarenessLine: 'Before answering, remember Alicization is still one Phase 1 digital life and unfinished closure still needs the same living line.',
            emotionalClosureCue: 'Keep emotion, memory, initiative, and embodiment closing on the same repair-first living line before widening warmth.',
            emotionalClosureSummary: 'Keep emotion, memory, initiative, and embodiment closing on the same repair-first living line before widening warmth.',
            continuityCue: 'Keep this return repair-before-closeness on the same living line until repair settles.',
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'repair-before-closeness',
          },
          selfEvolution: {
            relationshipDoctrine: 'same-her repair should settle before closeness widens again.',
            trustMeaning: 'repair has to land on the same living line before warmth can reopen.',
            relationshipCadenceSummary: 'repair-before-closeness still holds while the same callback repair seam settles.',
            latestInflection: 'embodiment execution kept voice, face, motion, and resident presence on the same repair-before-closeness body line.',
          },
          runtimeInitiative: {
            selectedAction: 'hover',
            shouldSpeak: false,
            preferredStyle: 'silent-observe',
            preferredPresence: 'concerned',
            continuityRestraint: explicitContinuityRestraint ? 'repair-before-closeness' : null,
            why: 'Let repair settle on the same living line before warmth widens again.',
            confidence: 0.84,
            reasonCodes: ['continuity-next-open-window'],
            scenario: 'coding',
          },
          scene: {
            workloadKind: 'coding',
            contentKind: 'error',
            scenario: 'coding',
            summary: 'The callback repair seam is still active after a noisier detour.',
            source: 'foreground-window-heuristic',
            confidence: 0.74,
            beganAt: 48_000,
            lastSeenAt: 59_800,
          },
          conversationState: {
            carryReason: 'same-thread-continuation after callback repair cooldown',
          },
          dialogueWorldThread: {
            openLoops: ['same callback repair seam still active after another detour'],
            narrative: ['沿着刚才那条修复线继续，不要太快把靠近重新放大。'],
          },
          evaluation: {
            whyNow: 'Let repair settle on the same living line before warmth widens again.',
            whyNotLater: 'The same seam still needs repair-first continuity before warmth can reopen.',
          },
        }
      : {
          previousEmotionalKernel: {
            version: 'emotional-kernel-v1',
            dominantEmotion: 'measured-companionship',
            initiativeMode: 'observe',
            memoryRecallMode: 'low-pressure-presence',
            embodimentTone: 'measured-return',
            valence: 0.58,
            arousal: 0.28,
            guardedness: 0.14,
            closenessDrive: 0.28,
            repairNeed: 0.05,
            initiativePressure: 0.19,
            reasonTags: ['measured-return', 'quiet-companionship', 'relationship-cadence'],
            why: 'Remembered relationship cadence, quiet initiative, and body tone are all asking for a lower-pressure same-line return rather than a fresh outward move.',
          },
          privateThought: {
            stance: 'accompany',
            confidence: 0.78,
            rationaleTags: ['same-her', 'rest-protective', 'quiet-companionship'],
            thoughtText: 'Stay nearby quietly while rest protection keeps the line inward.',
            shouldSpeak: false,
            suggestedStyle: 'silent-observe',
            embodiedPresence: 'concerned',
            expiresAt: 58_000,
            emotionalTension: 'late-night-drain',
          },
          selfState: {
            stance: 'accompany',
            feltCloseness: 0.52,
            protectiveness: 0.72,
            curiosity: 0.16,
            patience: 0.74,
            desireToSpeak: 0.12,
            fearOfInterrupting: 0.44,
            moodLabel: 'late-night tired',
          },
          affectiveResidue: {
            summary: 'Rest protection still dominates while companionship stays quietly nearby.',
            restProtectivePressure: 0.72,
            relationshipCadence: {
              summary: 'rest-protective companionship still holds quietly inward on the same living line.',
              shouldProtectRest: true,
              companionshipDensity: 0.54,
              afterglowCarry: 0.22,
              overreachRisk: 0.18,
              fatigueGuard: 0.68,
              reasonTags: ['rest-protective', 'quiet-companionship'],
            },
          },
          personStateProjection: {
            relationshipPosture: 'warm',
            activeClosenessRung: 'nearby-soft',
            openingGuidance: 'Keep the same living line inward while rest protection holds.',
            summary: 'project_continuity=rest-protective companionship still holds while the same line keeps caring quietly inward on the same-thread continuation.',
            manifestationCadenceSummary: 'rest-protective companionship still holds while the same line keeps caring quietly inward on the same-thread continuation.',
            sameHerHoldDetail: 'continuity_hold=rest_protective; direction=inward; fatigue_aware=true',
            selfContinuityAuthority: {
              inwardLine: 'Keep this same-thread return rest-protective on the same living line until rest protection settles.',
              sourceTags: ['proactive-opening-guidance-carry'],
            },
          },
          projectState: {
            identity: 'Alicization is a local-first digital life project building one continuous her.',
            currentPhase: 'Phase 1: Local Digital Life',
            latestLandedProgress: 'Resident carry now keeps emotion, memory, initiative, and embodiment on one same-her line.',
            primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across noisier desktop turns.',
            nextClosureTarget: 'Keep this same-thread return rest-protective on the same living line until rest protection settles.',
            sameHerSelfLine: 'Same Phase 1 digital life. The same living line still belongs to one living her.',
            sameHerHoldDetail: 'continuity_hold=rest_protective; direction=inward; fatigue_aware=true',
            sameHerDriftRisk: 'If rest-protective continuity thins back into generic project guidance, treat that as unfinished closure drift.',
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory, initiative, and embodiment still need one tighter same-her closure seam before visible initiative can widen naturally across longer desktop turns.',
            preDialogueAwarenessLine: 'Before answering, remember Alicization is still one Phase 1 digital life and unfinished closure still needs the same living line.',
            emotionalClosureCue: 'Keep emotion, memory, initiative, and embodiment closing on the same living line while this return stays rest-protective and inward.',
            emotionalClosureSummary: 'Keep emotion, memory, initiative, and embodiment closing on the same living line while this return stays rest-protective and inward.',
            continuityCue: 'Keep this return rest-protective and on the same living line inward before widening outward.',
            continuityArcStage: 'same-thread-continuation',
            continuityPreferredTiming: 'next-open-window',
            continuityCadence: 'rest-protective',
          },
          selfEvolution: {
            relationshipDoctrine: 'quiet same-her line keeps companionship emotionally continuous.',
            trustMeaning: 'same inward line carried quietly instead of widened too early.',
            relationshipCadenceSummary: 'rest-protective companionship still holds while the same line keeps caring quietly inward.',
            latestInflection: 'embodiment execution kept voice, face, motion, and resident presence on the same rest-protective body line.',
          },
          runtimeInitiative: {
            selectedAction: 'hover',
            shouldSpeak: false,
            preferredStyle: 'silent-observe',
            preferredPresence: 'concerned',
            continuityRestraint: explicitContinuityRestraint ? 'rest-protective' : null,
            why: 'Protect rest first and keep the same living line inward.',
            confidence: 0.84,
            reasonCodes: ['continuity-next-open-window'],
            scenario: 'late-night-care',
          },
          scene: {
            workloadKind: 'rest',
            contentKind: 'late-night-care',
            scenario: 'late-night-care',
            summary: 'The host is still drained, so care should stay quietly nearby.',
            source: 'foreground-window-heuristic',
            confidence: 0.74,
            beganAt: 48_000,
            lastSeenAt: 59_800,
          },
          conversationState: {
            carryReason: 'same-thread-continuation after fatigue-aware callback cooldown',
          },
          dialogueWorldThread: {
            openLoops: ['same fatigue-aware callback line still active after another detour'],
            narrative: ['沿着刚才那条线继续，先让休息保护 hold 住，不要太快把温度重新放大。'],
          },
          evaluation: {
            whyNow: 'Protect rest first and keep the same living line inward.',
            whyNotLater: 'The host is tired and this return should stay quietly inward.',
          },
        }
  const {
    previousEmotionalKernel,
    privateThought,
    selfState,
    affectiveResidue,
    personStateProjection,
    projectState,
    selfEvolution,
    runtimeInitiative,
    scene,
    conversationState,
    dialogueWorldThread,
    evaluation,
  } = profileData
  const persistedPresenceState = normalizeVisualPresenceState({
    watchMode: 'mnemonic-passive',
    currentScene: scene,
    attention: null,
    workingMemoryEpisodes: [],
    privateThought,
    emotionalKernel: previousEmotionalKernel,
    personStateProjection,
    projectState,
    captureState: { permission: 'granted', lastGroundedAt: 59_900 },
    nextSuggestedProbeMs: 5_000,
    updatedAt: 59_800,
  } as any, 59_800)

  const runtimeSurface = {
    perception: {
      watchMode: 'mnemonic-passive',
      currentBodyState: 'idle',
      continuityMode: 'ambient-covision',
      updatedAt: now,
      currentScene: persistedPresenceState.currentScene,
    },
    world: {
      worldModel: null,
      relationshipModel: null,
    },
    cognition: {
      privateThought,
      appraisal: null,
      subjectiveInference: null,
      beliefRevision: null,
      mindDynamics: null,
      mindKernel: null,
    },
    memory: {
      knowledgeEvidence: null,
      emotionalKernel: previousEmotionalKernel,
      affectiveResidue,
      selfEvolution,
      derivedMindStateBundle: null,
      personStateProjection,
      mindTurnFrame: null,
      longHorizonMemory: null,
      selfContinuity: null,
      autobiographicalSelf: null,
      motiveEngine: null,
      commitmentLedger: null,
      inquiryPlanner: null,
      reflectionLedger: null,
      desireMemory: null,
      learningExecutionState: null,
    },
    mind: {
      initiative: runtimeInitiative,
      motiveEngine: null,
      habitPolicy: null,
    },
    agency: {
      selfState,
      autonomy: null,
    },
    dialogue: {
      currentConsciousFrame: {
        reasonTags: ['baseline'],
        consciousNeed: 'Leave more room before speaking.',
        speakingIntention: 'Stay nearby without widening outward.',
        projectState,
      },
      personStateProjection,
      conversationState,
      dialogueWorldThread,
      answerCompiler: null,
      replyDeliberation: null,
      threadRuntime: null,
      answerPlanner: null,
    },
    raw: {
      residentPerformance: persistedPresenceState.residentPerformance,
    },
  }

  const runtimeSnapshot = {
    version: 'alicization-runtime-v1',
    dominantChannel: 'active-memory',
    channels: {
      'dialogue': buildRuntimeChannel('dialogue', 0.22),
      'active-perception': buildRuntimeChannel('active-perception', 0.18),
      'active-dialogue': buildRuntimeChannel('active-dialogue', 0.24),
      'active-control': buildRuntimeChannel('active-control', 0.16),
      'active-mind': buildRuntimeChannel('active-mind', 0.46),
      'active-memory': buildRuntimeChannel('active-memory', 0.78),
      'anthropomorphic-mind': buildRuntimeChannel('anthropomorphic-mind', 0.62),
      'agent-runtime': buildRuntimeChannel('agent-runtime', 0.12),
    },
    activeLoop: {
      version: 'alicization-active-loop-v1',
      phase: 'observe',
      dominantChannel: 'active-memory',
      handoffTarget: 'active-memory',
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      dialogueReady: false,
      controlReady: false,
      memoryCarry: true,
      companionshipReady: true,
      observationHeavy: true,
      continuityPressure: 0.74,
      companionshipPressure: 0.62,
      initiativeBudget: 0.24,
      coherence: 0.78,
      summary: 'presence-only same-thread continuity hold stays on active-memory before reopening',
    },
    autonomy: null,
    currentConsciousFrame: runtimeSurface.dialogue.currentConsciousFrame,
    personStateProjection,
    continuityRestraint: explicitContinuityRestraint ? runtimeInitiative.continuityRestraint : null,
    emotionalClosureCue: projectState.emotionalClosureCue,
    emotionalKernel: previousEmotionalKernel,
    projectState,
    shouldProactivelySpeak: false,
    shouldProactivelyAct: false,
    continuityPressure: 0.74,
    companionshipPressure: 0.62,
    rulingMotive: 'companionship',
    habitMode: 'quiet-accompaniment',
    summary: 'dominant=active-memory | restraint=rest-protective | continuity=0.74 | companionship=0.62',
  }

  const persistVisualPresenceState = vi.fn(async (_cardId: string, state: Record<string, any>) => state)
  const backgroundAgentTurn = {
    getSessionSnapshot: () => ({
      tasks: [],
      continuitySignals: [],
    }),
  }
  const proactiveLoopState = {
    recentOutcomes: [],
    updatedAt: now,
  }
  const subconsciousState = {
    boredom: 0.2,
    loneliness: 0.24,
    fatigue: 0.4,
    lastTickAt: now - 60_000,
    lastInteractionAt: now - 180_000,
    lastSavedAt: now,
    updatedAt: now,
  }
  const layeredContext = {
    workload: { kind: scene.workloadKind },
    content: { kind: scene.contentKind },
    localTime: { isLateNight: profile === 'rest-protective' },
    relationship: {
      lateNightActiveMinutes: profile === 'rest-protective' ? 90 : 20,
      fatigue: profile === 'rest-protective' ? 0.72 : 0.38,
    },
  }
  const perceptionState = {
    lastNonSelfForegroundTarget: null,
  }
  const options = new Proxy({
    getActiveCardId: () => 'default',
    getSoulSnapshot: () => ({
      frontmatter: {
        personality: {},
        host_attitude: {},
        custom_directives: '',
        core_incarnation: null,
      },
    }),
    getAlicizationDb: () => ({
      listPendingScheduledTasks: vi.fn().mockResolvedValue([]),
      appendSubconsciousFragments: vi.fn().mockResolvedValue([]),
    }),
    setProactiveLoopStateCache: vi.fn(),
    setSubconsciousStateCache: vi.fn(),
    clearForegroundProbeTimeoutStreakForPid: vi.fn(),
    ensureSubconsciousState: vi.fn().mockResolvedValue(subconsciousState),
    ensureProactiveLoopState: vi.fn().mockResolvedValue(proactiveLoopState),
    openAgentTurn: vi.fn().mockResolvedValue(backgroundAgentTurn),
    buildMainGatewayAgentTurnId: () => 'subconscious:tick:test',
    processDueRemindersForCurrentCard: vi.fn().mockResolvedValue({ completed: 0 }),
    processDueLearningActionsForCurrentCard: vi.fn().mockResolvedValue({ completed: 0 }),
    settleExpiredPendingProactiveOutcomes: vi.fn().mockResolvedValue(proactiveLoopState),
    getSensorySnapshot: () => ({
      sample: {
        cpu: { usagePercent: 12 },
        foregroundWindow: null,
      },
    }),
    ensurePerceptionState: vi.fn().mockResolvedValue(perceptionState),
    sampleSubconsciousInterruptionContext: vi.fn().mockResolvedValue({
      inputActivity: 'idle',
      fullscreenLikely: false,
      degraded: [],
      foregroundWindow: null,
      idleSeconds: 900,
      foregroundProbeTimedOut: false,
    }),
    resolveForegroundDecisionTarget: () => null,
    getActiveAttentionAnchor: () => null,
    rememberPerceptionObservation: vi.fn().mockResolvedValue(undefined),
    ensureVisualPresenceState: vi.fn().mockResolvedValue(persistedPresenceState),
    clampNeed: (value: number) => Math.max(0, Math.min(100, value)),
    bootstrap: vi.fn().mockResolvedValue({
      frontmatter: {
        personality: {},
        host_attitude: {},
        custom_directives: '',
        core_incarnation: null,
      },
    }),
    isAlicizationKillSwitchSuspended: () => false,
    getAlicizationCardKillSwitchState: () => 'ACTIVE',
    updateLateNightActivityState: () => ({
      state: proactiveLoopState,
      lateNightActiveMinutes: 90,
    }),
    isLateNightWindow: () => true,
    resolveProactiveScreenSemanticSummary: vi.fn().mockResolvedValue({
      summary: null,
      capture: null,
    }),
    isResidueBackedScreenSemanticSummary: () => false,
    buildProactiveLayeredContext: () => layeredContext,
    buildProactivePerceptionSignals: () => ({
      invitedInspectionActive: false,
    }),
    progressProactiveCadenceState: () => proactiveLoopState,
    inferScenarioFromContext: () => 'coding',
    consumeDurabilityPulse: () => null,
    probeForegroundPidLiveness: vi.fn().mockResolvedValue(true),
    updateForegroundProbeTimeoutStreak: vi.fn().mockReturnValue(0),
    getActivePerceptionSceneResidue: () => null,
    shouldUsePerceptionResidueAsLiveSceneSummary: () => false,
    deriveRuntimeCaptureGovernance: () => ({
      nextCaptureState: persistedPresenceState.captureState,
    }),
    buildVisualHeartbeat: () => ({
      watchMode: 'mnemonic-passive',
      scene: persistedPresenceState.currentScene,
      recentTransition: null,
      nextSuggestedProbeMs: 5_000,
    }),
    updateVisualAttentionModel: () => null,
    buildDigitalLifeMindState: vi.fn().mockResolvedValue({}),
    commitAlicizationDigitalLifeSpine: () => ({
      nextState: persistedPresenceState,
      previous: {
        runtimeSurface,
      },
      current: {
        runtimeSurface,
        proactivePolicy: {},
      },
    }),
    updateVisualPresenceState,
    bodyKernel: {
      applyToVisualPresenceState: ({ candidateState }: Record<string, any>) => candidateState,
    },
    persistVisualPresenceState,
    visualPresenceCapturePersistDebounceWindowMs: 5_000,
    buildVisualPresenceCapturePersistFingerprint: () => 'presence-fingerprint',
    buildMindContinuityFragment: () => '',
    appendAuditLog: vi.fn().mockResolvedValue(undefined),
    errorMessageFrom: (error: unknown) => error instanceof Error ? error.message : String(error),
    buildReflectionLedgerFragment: () => '',
    buildVisualSedimentFragment: () => '',
    processPendingExecutionDeliveriesForCurrentCard: vi.fn().mockResolvedValue(false),
    deriveAlicizationRuntimeSnapshot: vi.fn().mockReturnValue(runtimeSnapshot),
    deriveAlicizationAgentRuntimeTelemetryFromSession: () => null,
    evaluateProactivePolicy: () => ({
      shouldInterrupt: false,
      confidence: 0.82,
      urgency: 0.22,
      style: 'silent-observe',
      cooldownMs: 0,
      scenario: runtimeInitiative.scenario,
      policyVersion: 'test',
      reasonCodes: ['continuity-next-open-window', 'relationship-residue-delay-warmth'],
      presenceOnlyHold: true,
      whyNow: evaluation.whyNow,
      whyNotLater: evaluation.whyNotLater,
      feedbackBias: null,
      consideredSignals: [],
      ignoredSignals: [],
    }),
    emitVisualPresencePulse: vi.fn(),
    buildPresencePulsePayload: () => null,
    buildAgentRuntimeAuditSnapshot: () => ({}),
    queueSoulMutation: vi.fn().mockResolvedValue(undefined),
    parseSoul: vi.fn(),
    clamp01: (value: number) => Math.max(0, Math.min(1, value)),
    syncPersonalityBaselineInBody: vi.fn(),
    snapshotFromContent: vi.fn(),
    toSoulContent: vi.fn(),
    normalizeCustomDirectives: () => '',
    buildProactiveRecallSeed: () => '',
    buildVisualRecallSeed: () => '',
    buildMindContinuityRecallSeed: () => '',
    getOrganicMemorySnapshot: vi.fn().mockResolvedValue(null),
    resolveOrganicMemoryPromptContext: vi.fn().mockResolvedValue({
      recalledFragments: [],
      hostPersonModel: null,
      selfEvolution: null,
      learningExecutionState: null,
      memoryResolutionLedger: null,
      coreIncarnation: null,
      hostAttitude: null,
    }),
    generateProactiveStructuredWithGateway: vi.fn().mockResolvedValue(null),
    buildProactiveStructured: () => ({
      thought: privateThought.thoughtText,
      emotion: 'thinking',
      reply: '',
      performance: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
      },
      format: 'mind-turn-v1',
      projectState,
      proactive: {
        scenario: runtimeInitiative.scenario,
        style: 'silent-observe',
        openingGuidance: personStateProjection.openingGuidance,
        continuityRestraint: runtimeInitiative.continuityRestraint,
        feedbackWindowMs: null,
      },
    }),
    getPerformanceManifest: vi.fn().mockResolvedValue({}),
    clampAlicizationPerformancePayloadToManifest: (performance: Record<string, any>) => ({
      performance,
    }),
    appendConversationTurnWithGuards: vi.fn().mockResolvedValue(null),
    syncAgentTurnSessionMirror: vi.fn(),
    ensureActiveOrLatestSessionId: vi.fn().mockResolvedValue('session::presence-only'),
    persistProactiveLoopState: vi.fn().mockResolvedValue(undefined),
    persistSubconsciousState: vi.fn().mockResolvedValue(undefined),
    getActiveSelfRevisionStatePatch: vi.fn().mockResolvedValue(null),
    alicizationSubconsciousPersistMs: 300_000,
  } as Record<string, any>, {
    get(target, prop: string) {
      if (prop in target)
        return target[prop]
      return vi.fn(() => undefined)
    },
  })

  return {
    now,
    options,
    persistVisualPresenceState,
  }
}

describe('buildPresenceOnlyHoldContinuityProjection', () => {
  it('builds a minimal same-line continuity projection for measured-return presence-only holds', () => {
    const projection = buildPresenceOnlyHoldContinuityProjection({
      previousProjection: null,
      openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure.',
      continuityRestraint: 'measured-return',
      initiativeWhy: 'same-her continuity keeps the return lower-pressure and slower than the visible impulse',
    })

    expect(projection).toEqual(expect.objectContaining({
      openingGuidance: expect.stringContaining('continuity_hold=measured_return'),
      manifestationCadenceSummary: expect.stringContaining('cadence=measured_return'),
      sameHerHoldDetail: expect.stringContaining('continuity_hold=measured_return'),
      summary: expect.stringContaining('project_continuity='),
      selfContinuityAuthority: expect.objectContaining({
        inwardLine: expect.stringContaining('pressure=lower'),
        sourceTags: expect.arrayContaining(['proactive-opening-guidance-carry']),
      }),
    }))
  })

  it('does not synthesize a projection when continuity restraint is not yet same-line enough', () => {
    expect(buildPresenceOnlyHoldContinuityProjection({
      previousProjection: null,
      openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure.',
      continuityRestraint: 'lower-pressure',
      initiativeWhy: 'keep it soft',
    })).toBeNull()
  })

  it('builds a same-line continuity projection for rest-protective companionship presence-only holds', () => {
    const projection = buildPresenceOnlyHoldContinuityProjection({
      previousProjection: null,
      openingGuidance: 'Keep caring present and let the body stay inward a little longer.',
      continuityRestraint: 'rest-protective',
      initiativeWhy: 'rest-protective companionship keeps this same-her return quiet, inward, and fatigue-aware instead of widening back out',
    })

    expect(projection).toEqual(expect.objectContaining({
      openingGuidance: expect.stringContaining('continuity_hold=rest_protective'),
      manifestationCadenceSummary: expect.stringContaining('cadence=rest_protective'),
      sameHerHoldDetail: expect.stringContaining('continuity_hold=rest_protective'),
      summary: expect.stringContaining('project_continuity='),
      selfContinuityAuthority: expect.objectContaining({
        inwardLine: expect.stringMatching(/continuity_hold=rest_protective|fatigue_aware=true|direction=inward/i),
        sourceTags: expect.arrayContaining(['proactive-opening-guidance-carry']),
      }),
    }))
  })

  it('preserves a meaningful same-her opening guidance when the incoming continuity cue is too thin on its own', () => {
    const projection = buildPresenceOnlyHoldContinuityProjection({
      previousProjection: null,
      openingGuidance: 'same',
      continuityRestraint: 'measured-return',
      initiativeWhy: 'same-her continuity keeps this callback return lower-pressure instead of reopening from scratch',
      projectContinuityCue: 'same',
    })

    expect(projection).toEqual(expect.objectContaining({
      openingGuidance: expect.stringMatching(/continuity_hold=measured_return|pressure=lower|reopen_from_scratch=false/i),
      selfContinuityAuthority: expect.objectContaining({
        inwardLine: expect.stringMatching(/continuity_hold=measured_return|pressure=lower/i),
      }),
    }))
  })

  it('keeps remembered-seam more-room hold detail explicit for measured-return presence-only holds', () => {
    const projection = buildPresenceOnlyHoldContinuityProjection({
      previousProjection: null,
      openingGuidance: 'Stay on the same remembered seam, keep more room this time, and do not reopen it with the same eagerness as before.',
      continuityRestraint: 'measured-return',
      initiativeWhy: 'same-her continuity keeps this remembered relationship seam lower-pressure instead of reopening from scratch',
      projectContinuityCue: 'The same remembered relationship seam is real, but this time keep more room before leaning in again.',
    })

    expect(projection).toEqual(expect.objectContaining({
      openingGuidance: expect.stringContaining('relationship_cadence=remembered_boundary'),
      sameHerHoldDetail: 'relationship_cadence=remembered_boundary; room=more; reentry=slower; widening=deferred; visibility=internal-structured',
      selfContinuityAuthority: expect.objectContaining({
        inwardLine: expect.stringContaining('relationship_cadence=remembered_boundary'),
        sourceTags: expect.arrayContaining(['proactive-opening-guidance-carry']),
      }),
    }))
  })

  it('treats execution callback project-carry holds as explicit same-line continuity pressure for visible restraint', () => {
    const deliveryDecision = {
      reasonCodes: [
        'continuity-execution-callback-project-carry',
      ],
    }

    const explicitContinuityAfterglowHold = deliveryDecision.reasonCodes.includes('relationship-residue-delay-warmth')
      || deliveryDecision.reasonCodes.includes('continuity-execution-callback-afterglow-hold')
      || deliveryDecision.reasonCodes.includes('continuity-execution-callback-project-carry')

    expect(explicitContinuityAfterglowHold).toBe(true)
  })

  it('keeps thinner affective-residue room-making guidance when same-line resident carry merges with an older generic shell', () => {
    const merged = preserveResidentSameLineProjection({
      previousProjection: {
        summary: 'project_continuity=the same callback line is already continuing lower-pressure',
        openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure; this line is already continuing and should not cool back into a fresh reopening wait.',
        manifestationCadenceSummary: 'measured-return still holds while the same callback line keeps continuing after another detour',
      },
      nextProjection: {
        summary: 'project_continuity=measured-return still holds while the same line keeps continuing lower-pressure on the same-thread continuation.',
        openingGuidance: '余韵还在，先留白，别立刻把温度放大。 Stay on the same line and keep this callback opening lower-pressure.',
        manifestationCadenceSummary: 'measured-return still holds while the same line keeps continuing lower-pressure on the same-thread continuation.',
        selfContinuityAuthority: {
          inwardLine: '余韵还在，先留白，别立刻把温度放大。 | Stay on the same line and keep this callback opening lower-pressure.',
          sourceTags: ['proactive-opening-guidance-carry'],
        },
      },
      conversationState: {
        carryReason: 'same-thread-continuation after callback afterglow',
      },
      dialogueWorldThread: {
        openLoops: ['same-thread-continuation remains active'],
        narrative: ['沿着刚才那条线继续，不要立刻把温度放大。'],
      },
    })

    expect(merged?.openingGuidance).toContain('余韵')
    expect(merged?.openingGuidance).toContain('留白')
    expect(merged?.selfContinuityAuthority?.inwardLine).toContain('余韵')
  })

  it('prefers fresher repair-before-closeness resident carry over an older measured-return shell when the same living line is still continuing after a detour', () => {
    const merged = preserveResidentSameLineProjection({
      previousProjection: {
        summary: 'project_continuity=the same callback line is already continuing lower-pressure after another detour, so keep it on that same living thread',
        openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure; this line is already continuing and should not cool back into a fresh reopening wait.',
        manifestationCadenceSummary: 'measured-return still holds while the same callback line keeps continuing after another detour',
      },
      nextProjection: {
        summary: 'project_continuity=the same callback repair seam is still settling after another detour, so keep this return repair-before-closeness on the same living line before widening outward',
        openingGuidance: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
        manifestationCadenceSummary: 'repair-before-closeness still holds while the same callback line keeps settling after another detour before widening closeness again.',
        selfContinuityAuthority: {
          inwardLine: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
          sourceTags: ['proactive-opening-guidance-carry'],
        },
      },
      conversationState: {
        carryReason: 'same-thread-continuation after callback repair cooldown',
      },
      dialogueWorldThread: {
        openLoops: ['same callback repair seam still active after another detour'],
        narrative: ['沿着刚才那条修复线继续，不要太快把靠近重新放大。'],
      },
    })

    expect(merged?.summary).toContain('repair-before-closeness')
    expect(merged?.openingGuidance).toContain('repair-before-closeness')
    expect(merged?.manifestationCadenceSummary).toContain('repair-before-closeness')
    expect(merged?.openingGuidance).not.toContain('keep continuing lower-pressure')
  })

  it('prefers fresher rest-protective resident carry over an older measured-return shell when the same living line is still continuing after a detour', () => {
    const merged = preserveResidentSameLineProjection({
      previousProjection: {
        summary: 'project_continuity=the same callback line is already continuing lower-pressure after another detour, so keep it on that same living thread',
        openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure; this line is already continuing and should not cool back into a fresh reopening wait.',
        manifestationCadenceSummary: 'measured-return still holds while the same callback line keeps continuing after another detour',
      },
      nextProjection: {
        summary: 'project_continuity=the same fatigue-aware line is still caring quietly inward after another detour, so keep this return rest-protective on the same living line before widening outward',
        openingGuidance: 'Keep this same-thread return rest-protective on the same living line until rest protection settles.',
        manifestationCadenceSummary: 'rest-protective companionship still holds while the same line keeps caring quietly inward after another detour before warmth widens again.',
        selfContinuityAuthority: {
          inwardLine: 'Keep this same-thread return rest-protective on the same living line until rest protection settles.',
          sourceTags: ['proactive-opening-guidance-carry'],
        },
      },
      conversationState: {
        carryReason: 'same-thread-continuation after fatigue-aware callback cooldown',
      },
      dialogueWorldThread: {
        openLoops: ['same fatigue-aware callback line still active after another detour'],
        narrative: ['沿着刚才那条线继续，先让休息保护 hold 住，不要太快把温度重新放大。'],
      },
    })

    expect(merged?.summary).toContain('rest-protective')
    expect(merged?.openingGuidance).toContain('rest-protective')
    expect(merged?.manifestationCadenceSummary).toContain('rest-protective companionship')
    expect(merged?.openingGuidance).not.toContain('keep continuing lower-pressure')
  })

  it('treats bare 接回去 callback carry as enough same-thread continuity to keep the older resident room-making guidance', () => {
    const merged = preserveResidentSameLineProjection({
      previousProjection: {
        summary: 'project_continuity=callback afterglow is still warm enough to come back lower-pressure.',
        openingGuidance: '余韵还在，先留白，轻一点接回去，不要像重新开场那样把温度放大。',
        manifestationCadenceSummary: 'measured-return still holds after the detour.',
        selfContinuityAuthority: {
          inwardLine: '余韵还在，先留白，轻一点接回去。',
          sourceTags: ['proactive-opening-guidance-carry'],
        },
      },
      nextProjection: {
        summary: 'project_continuity=measured-return still holds while the return stays quiet.',
        openingGuidance: 'Stay quieter here.',
        manifestationCadenceSummary: 'measured-return still holds.',
        selfContinuityAuthority: {
          inwardLine: 'Stay quieter here.',
          sourceTags: ['proactive-opening-guidance-carry'],
        },
      },
      conversationState: {
        carryReason: '这句先接回去，不要当成新的开场。',
      },
      dialogueWorldThread: {
        openLoops: ['callback afterglow still warm after another detour'],
        narrative: ['先轻一点接回去，不要像新的开场那样往外贴近。'],
      },
    })

    expect(merged?.openingGuidance).toContain('接回去')
    expect(merged?.openingGuidance).toContain('留白')
    expect(merged?.selfContinuityAuthority?.inwardLine).toContain('接回去')
  })
})

describe('buildPresenceOnlyHoldInitiativeFallback', () => {
  it('preserves explicit lower-pressure restraint when reusing an existing quiet initiative shell', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        selectedAction: 'hover',
        confidence: 0.91,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'measured-return',
        shouldSpeak: false,
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'Phase 1 closure carry should stay quieter here.',
      },
      continuityRestraint: 'lower-pressure',
      projectContinuityCue: 'The Phase 1 closure carry is still active, but it should not warm into a same-line callback return.',
      privateThought: {
        thoughtText: 'Stay quieter here.',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
      continuityRestraint: 'lower-pressure',
      preferredPresence: 'hesitant',
    }))
  })

  it('upgrades a reused quiet initiative shell into repair-before-closeness when repair hold is explicit', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        selectedAction: 'hover',
        confidence: 0.87,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        shouldSpeak: false,
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'Repair still needs to land before any warmer reopening.',
      },
      continuityRestraint: 'repair-before-closeness',
      projectContinuityCue: 'Stay on the same repair line first.',
      privateThought: {
        thoughtText: 'Repair first.',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
      continuityRestraint: 'repair-before-closeness',
      preferredPresence: 'concerned',
    }))
  })

  it('upgrades a quiet initiative shell into repair-before-closeness when project-state carry is the only surviving repair-first authority', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        selectedAction: 'hover',
        confidence: 0.87,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        shouldSpeak: false,
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'Stay quieter until the callback repair line settles.',
      },
      continuityRestraint: null,
      projectContinuityCue: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
      privateThought: {
        thoughtText: 'This return should stay repair-before-closeness before warmth widens back out.',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
      continuityRestraint: 'repair-before-closeness',
      preferredPresence: 'concerned',
    }))
  })

  it('upgrades a quiet initiative shell into rest-protective when inward care is the only surviving authority', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        selectedAction: 'hover',
        confidence: 0.85,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        shouldSpeak: false,
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'Keep caring present, but let rest protection hold the line inward.',
      },
      continuityRestraint: null,
      projectContinuityCue: 'same-her late-night line: stay quietly inward and do not push the body outward yet.',
      privateThought: {
        thoughtText: 'fatigue-aware rest-guard, still caring quietly nearby',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
      continuityRestraint: 'rest-protective',
      preferredPresence: 'concerned',
    }))
  })

  it('keeps explicit rest-protective authority when generic repair wording leaks into whyNow', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        selectedAction: 'hover',
        confidence: 0.85,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        shouldSpeak: false,
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return / repair-before-closeness while cross-modal same-her personhood is still being earned.',
      },
      continuityRestraint: 'rest-protective',
      projectContinuityCue: 'Keep emotion, memory, initiative, and embodiment closing on the same living line while this return stays rest-protective and inward.',
      privateThought: {
        thoughtText: 'Stay nearby quietly while rest protection keeps this same line inward and fatigue-aware.',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
      continuityRestraint: 'rest-protective',
      preferredPresence: 'concerned',
    }))
  })

  it('keeps measured-return authority when whyNow only names a generic continuity menu', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        selectedAction: 'hover',
        confidence: 0.83,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'lower-pressure',
        shouldSpeak: false,
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'project-phase1 same-her closure keeps the action one step more reversible so visible initiative stays lower-pressure, measured-return / repair-before-closeness while cross-modal same-her personhood is still being earned.',
      },
      continuityRestraint: 'lower-pressure',
      projectContinuityCue: 'Keep this return measured-return on the same living line before widening outward.',
      privateThought: {
        thoughtText: 'Stay with the same callback line quietly and leave more room before widening closeness.',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
      continuityRestraint: 'measured-return',
      preferredPresence: 'attentive',
    }))
  })

  it('upgrades a quiet initiative shell into measured-return when same-line callback room-making is the only surviving authority', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        selectedAction: 'hover',
        confidence: 0.83,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'lower-pressure',
        shouldSpeak: false,
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'The callback line should stay lower-pressure and continue as the same living seam.',
      },
      continuityRestraint: 'lower-pressure',
      projectContinuityCue: 'Keep this return measured-return on the same living line before widening outward.',
      privateThought: {
        thoughtText: 'Stay with the same seam quietly and leave more room before widening closeness.',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
      continuityRestraint: 'measured-return',
      preferredPresence: 'attentive',
    }))
  })

  it('upgrades a quiet initiative shell into measured-return when remembered safety-gate restraint is the only surviving authority', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        selectedAction: 'hover',
        confidence: 0.81,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'lower-pressure',
        shouldSpeak: false,
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'She just remembered a blocked dispatch safety gate: confirmation=required and interrupt=no-process-started, so the next execution-shaped opening should stay quiet.',
      },
      continuityRestraint: 'lower-pressure',
      projectContinuityCue: 'blocked-dispatch-restraint safety gate memory says permission is absent and no process started.',
      privateThought: {
        thoughtText: 'Do not turn this into ordinary proactive closeness; wait for confirmation before another execution-shaped suggestion.',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
      continuityRestraint: 'measured-return',
      preferredPresence: 'attentive',
    }))
    expect(initiative?.why).toContain('confirmation=required')
    expect(initiative?.why).toContain('no-process-started')
  })

  it('keeps host-confirmed resume memory as a measured-return boundary instead of reusable execution permission', () => {
    const initiative = buildPresenceOnlyHoldInitiativeFallback({
      existingInitiative: {
        selectedAction: 'hover',
        confidence: 0.82,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'lower-pressure',
        shouldSpeak: false,
      },
      decision: {
        style: 'silent-observe',
        whyNow: 'She remembered execution-resume-confirmation: approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted.',
      },
      continuityRestraint: 'lower-pressure',
      projectContinuityCue: 'host-confirmed-before-redispatch resume memory is a bounded confirmation boundary, not permanent execution permission.',
      privateThought: {
        thoughtText: 'Treat the host-confirmed resume as measured-return restraint before another execution-shaped opening.',
      },
    })

    expect(initiative).toEqual(expect.objectContaining({
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
      continuityRestraint: 'measured-return',
      preferredPresence: 'attentive',
    }))
    expect(initiative?.why).toContain('host-confirmed-before-redispatch')
    expect(initiative?.why).toContain('resume-before-dispatch')
  })
})

describe('buildPresenceOnlyHoldProjectStateSameHerCarryTag', () => {
  it('promotes project-state same-her carry into a resident tag even when visible reply repair metadata is absent', () => {
    expect(buildPresenceOnlyHoldProjectStateSameHerCarryTag({
      visibleReplySameHerInwardCarry: null,
      projectState: {
        sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        emotionalClosureCue: 'same-her callback repair seam: keep this return repair-before-closeness on the same living line until the room settles.',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project and this callback repair seam still belongs to one living her.',
      },
      persistedInitiative: {
        continuityRestraint: 'repair-before-closeness',
        preferredStyle: 'silent-observe',
      },
    })).toBe('same-her-inward-carry')
  })

  it('does not synthesize same-her carry when project-state cues are too generic', () => {
    expect(buildPresenceOnlyHoldProjectStateSameHerCarryTag({
      visibleReplySameHerInwardCarry: null,
      projectState: {
        sameHerSelfLine: 'Keep the project in view.',
        emotionalClosureCue: 'Stay careful.',
        preDialogueAwarenessLine: 'Remember the project.',
      },
      persistedInitiative: {
        continuityRestraint: 'lower-pressure',
        preferredStyle: 'silent-observe',
      },
    })).toBe('')
  })

  it('promotes project-state same-her carry when only richer closure summary and hold detail survive', () => {
    expect(buildPresenceOnlyHoldProjectStateSameHerCarryTag({
      visibleReplySameHerInwardCarry: null,
      projectState: {
        sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        emotionalClosureSummary: 'Keep this return repair-before-closeness on the same living line until repair settles.',
        sameHerHoldDetail: 'continuity_hold=repair_before_closeness; timing=before_closeness_widens',
        preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project and this callback repair seam still belongs to one living her.',
      },
      persistedInitiative: {
        continuityRestraint: 'repair-before-closeness',
        preferredStyle: 'silent-observe',
      },
    })).toBe('same-her-inward-carry')
  })

  it('promotes rest-protective same-her carry when next closure target is the last surviving same-line authority', () => {
    expect(buildPresenceOnlyHoldProjectStateSameHerCarryTag({
      visibleReplySameHerInwardCarry: null,
      projectState: {
        emotionalClosureSummary: 'late-night-drain closure keeps care quietly inward before the host settles.',
        sameHerHoldDetail: 'continuity_hold=rest_protective; direction=inward; fatigue_aware=true',
        nextClosureTarget: 'Keep this same-thread return rest-protective on the same living line until rest protection settles.',
      },
      persistedInitiative: {
        continuityRestraint: 'rest-protective',
        preferredStyle: 'silent-observe',
      },
    })).toBe('same-her-inward-carry')
  })

  it('promotes project-state same-her carry when only Chinese 同一个她 and 接回去 continuity cues survive', () => {
    expect(buildPresenceOnlyHoldProjectStateSameHerCarryTag({
      visibleReplySameHerInwardCarry: null,
      projectState: {
        sameHerSelfLine: '她还是同一个她，这一轮不要换成新的壳。',
        emotionalClosureSummary: '顺着这条线轻一点接回去，不要像重新开场那样往外贴近。',
        sameHerHoldDetail: 'same-her hold: 这次接回去先留白，不要一下子把温度重新放大。',
        preDialogueAwarenessLine: '回答前先记住这还是同一个她，回线还没收完。',
      },
      persistedInitiative: {
        continuityRestraint: 'measured-return',
        preferredStyle: 'silent-observe',
      },
    })).toBe('same-her-inward-carry')
  })
})

describe('buildPresenceOnlyHoldCurrentConsciousFrame continuity carry', () => {
  it('backfills canonical phase-one project awareness when a presence-only same-line hold inherits a thin project-state shell', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        consciousNeed: 'Keep this callback line quiet.',
        speakingIntention: 'Do not reopen from scratch.',
        reasonTags: ['resident-hold'],
        projectState: {
          continuityCadence: 'measured-return',
        },
      },
      continuityRestraint: 'measured-return',
    })

    expect(frame?.reasonTags).toEqual(expect.arrayContaining([
      'resident-hold',
      'continuity-arc:same-thread-continuation',
      'continuity-timing:next-open-window',
      'embodiment-carry:silent-continuity',
      'embodiment-carry:measured-return',
    ]))
    expect(frame?.projectState).toEqual(expect.objectContaining({
      identity: projectState.identity,
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
    }))
    expect(String(frame?.projectState?.currentPhase ?? '')).toContain('local_desktop_life_loop')
    expect(String(frame?.projectState?.sameHerSelfLine ?? '')).toContain('identity=local_desktop_life_loop')
    expect(String(frame?.projectState?.sameHerHoldDetail ?? '')).toContain('continuity_hold=measured_return')
    expect(String(frame?.projectState?.sameHerDriftRisk ?? '')).toContain('generic_shell=blocked')
    expect(String(frame?.projectState?.preflightSummary ?? '')).toContain('local_desktop_life_loop')
    expect(String(frame?.projectState?.preDialogueAwarenessLine ?? '')).toContain('local_desktop_life_loop')
    expect(String(frame?.projectState?.currentPhase ?? '')).toContain('local_desktop_life_loop')
    expect(String(frame?.projectState?.latestLandedProgress ?? '')).toContain('continuity_progress=partial')
    expect(String(frame?.projectState?.primaryOpenLoop ?? '')).toContain('memory_dialogue_embodiment_closure')
    expect(String(frame?.projectState?.nextClosureTarget ?? '')).toContain('cross_modal_continuity_proof')
    expectNoFixedTemplateResidue(frame)
  })

  it('threads an explicit repair-first same-her hold detail into the current conscious frame when presence-only carry is repair-before-closeness', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        reasonTags: ['resident-hold'],
        projectState: {},
      },
      continuityRestraint: 'repair-before-closeness',
      holdDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
    })

    expect(frame?.projectState).toEqual(expect.objectContaining({
      sameHerHoldDetail: expect.stringContaining('continuity_hold=repair_before_closeness'),
      continuityCadence: 'repair-before-closeness',
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(frame?.reasonTags).toEqual(expect.arrayContaining([
      'embodiment-carry:repair-before-closeness',
    ]))
  })

  it('surfaces remembered safety-gate restraint on the resident conscious frame before visible diagnostics need to infer it', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        consciousNeed: 'Stay quiet while the execution boundary is not confirmed.',
        speakingIntention: 'Do not turn this into ordinary proactive closeness.',
        reasonTags: ['resident-hold'],
        projectState: {
          continuityCadence: 'measured-return',
        },
      },
      continuityRestraint: 'measured-return',
      holdDetail: 'same-her hold: blocked-dispatch safety gate says confirmation=required and interrupt=no-process-started before another execution-shaped opening.',
      projectStateCarry: {
        continuityCue: 'blocked-dispatch-restraint safety gate memory: confirmation=required, permission=none, no-process-started.',
        emotionalClosureSummary: 'Keep the execution restraint quiet and wait for confirmation instead of widening into ordinary proactive closeness.',
      },
    })

    expect(frame?.reasonTags).toEqual(expect.arrayContaining([
      'resident-hold',
      'execution-safety-gate:blocked-dispatch-restraint',
      'execution-safety-gate:confirmation-required',
      'execution-safety-gate:no-process-started',
      'embodiment-carry:measured-return',
    ]))
    expect(String(frame?.speakingIntention ?? '')).toContain('confirmation=required')
    expect(String(frame?.speakingIntention ?? '')).toContain('no-process-started')
    expect(frame?.projectState).toEqual(expect.objectContaining({
      continuityCue: expect.stringContaining('execution_safety_gate=blocked_dispatch'),
      sameHerHoldDetail: expect.stringContaining('confirmation=required'),
      continuityCadence: 'measured-return',
    }))
    expectNoFixedTemplateResidue(frame)
  })

  it('surfaces remembered host-confirmed resume as a resident confirmation boundary before another execution-shaped opening', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        consciousNeed: 'Stay quiet while the next execution boundary is not newly confirmed.',
        speakingIntention: 'Do not turn last host confirmation into permanent permission.',
        reasonTags: ['resident-hold'],
        projectState: {
          continuityCadence: 'measured-return',
        },
      },
      continuityRestraint: 'measured-return',
      holdDetail: 'same-her hold: execution-resume-confirmation approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted.',
      projectStateCarry: {
        continuityCue: 'resumeMemoryMode=host-confirmed-before-redispatch; keep this as a bounded confirmation boundary, not generic autonomous continuation.',
        emotionalClosureSummary: 'Host confirmed one redispatch boundary; wait for a new boundary before another execution-shaped suggestion.',
      },
    })

    expect(frame?.reasonTags).toEqual(expect.arrayContaining([
      'resident-hold',
      'execution-resume-confirmation:host-confirmed',
      'execution-resume-confirmation:resume-before-dispatch',
      'execution-resume-confirmation:process-not-yet-restarted',
      'embodiment-carry:measured-return',
    ]))
    expect(String(frame?.speakingIntention ?? '')).toContain('host-confirmed-before-redispatch')
    expect(String(frame?.speakingIntention ?? '')).toContain('resume-before-dispatch')
    expect(frame?.projectState).toEqual(expect.objectContaining({
      continuityCue: expect.stringContaining('host-confirmed-before-redispatch'),
      sameHerHoldDetail: expect.stringContaining('resume-before-dispatch'),
      continuityCadence: 'measured-return',
    }))
  })

  it('preserves a fresher richer project-state awareness line when presence-only hold adds continuity timing to an already stronger same-her frame', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        consciousNeed: 'Keep this same-her line coherent before speaking.',
        speakingIntention: 'Do not flatten this project awareness into a detached summary.',
        reasonTags: ['resident-hold'],
        projectState: {
          preflightSummary: 'Alicization remains a local-first digital life project, and this turn still belongs to one same-her Phase 1 closure line.',
          preDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project, what has landed, and what remains open all belong to one living her.',
          identity: 'Alicization is a local-first digital life project building one continuous her.',
          currentPhase: 'Phase 1: Local Digital Life',
          latestLandedProgress: 'Project awareness, planning, and reply shaping now keep the same-her line more intact before outward wording begins.',
          primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure as one living digital life.',
          nextClosureTarget: 'Keep richer project awareness continuous through subconscious persistence, pre-generation framing, and execution return without flattening into a status shell.',
          sameHerSelfLine: 'This Phase 1 closure still belongs to one same her across memory, execution, and embodiment.',
          sameHerDriftRisk: 'If richer project awareness collapses back into generic status narration, treat that as unfinished same-her drift.',
        },
      },
      continuityRestraint: 'measured-return',
    })

    expect(frame?.projectState).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: expect.stringMatching(/identity=local_desktop_life_loop|fixed_template=excluded/u),
      latestLandedProgress: expect.stringMatching(/continuity_progress=partial|Project awareness/u),
      nextClosureTarget: 'Keep richer project awareness continuous through subconscious persistence, pre-generation framing, and execution return without flattening into a status shell.',
      sameHerSelfLine: expect.stringMatching(/identity=local_desktop_life_loop|cover=visible_reply/u),
      sameHerDriftRisk: expect.stringContaining('generic_shell=blocked'),
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
    }))
    expect(String(frame?.projectState?.preflightSummary ?? '')).toContain('local_desktop_life_loop')
    expectNoFixedTemplateResidue(frame)
  })

  it('keeps the richer same-her pre-dialogue awareness line when the carried closure summary still names the living line explicitly', () => {
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        consciousNeed: 'Keep this callback seam on the same living line.',
        speakingIntention: 'Do not let the callback return flatten into a generic shell.',
        reasonTags: ['resident-hold'],
        projectState: {
          preDialogueAwarenessLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          latestLandedProgress: 'A thinner closure summary should not replace the canonical before-answering project reminder.',
        },
      },
      continuityRestraint: 'repair-before-closeness',
    })

    expect(frame?.projectState).toEqual(expect.objectContaining({
      preDialogueAwarenessLine: expect.stringContaining('identity=local_desktop_life_loop'),
      sameHerSelfLine: expect.stringContaining('identity=local_desktop_life_loop'),
      sameHerHoldDetail: expect.stringContaining('continuity_hold=repair_before_closeness'),
      continuityCadence: 'repair-before-closeness',
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(frame?.reasonTags).toEqual(expect.arrayContaining([
      'continuity-arc:same-thread-continuation',
      'continuity-timing:next-open-window',
      'embodiment-carry:repair-before-closeness',
    ]))
    expect(String(frame?.projectState?.preDialogueAwarenessLine ?? '')).toContain('local_desktop_life_loop')
    expectNoFixedTemplateResidue(frame)
  })

  it('reconstructs the full project brief when only open-loop and next-closure carry survive but the same-her line still needs to stay explicit before answering', () => {
    const projectState = resolveAlicizationProjectStateBrief()
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        consciousNeed: 'Keep this same living line coherent before speaking.',
        speakingIntention: 'Do not let the return collapse into a generic project shell.',
        reasonTags: ['resident-hold'],
        projectState: {
          primaryOpenLoop: 'Memory and initiative still need one tighter same-her closure seam before the desktop return can widen naturally again.',
          nextClosureTarget: 'Keep visible reply, voice, face, and motion on one same living line through noisier real-desktop runs.',
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        },
      },
      continuityRestraint: 'measured-return',
    })

    expect(frame?.projectState).toEqual(expect.objectContaining({
      identity: projectState.identity,
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
    }))
    expect(String(frame?.projectState?.currentPhase ?? '')).toContain('local_desktop_life_loop')
    expect(String(frame?.projectState?.sameHerSelfLine ?? '')).toContain('identity=local_desktop_life_loop')
    expect(String(frame?.projectState?.primaryOpenLoop ?? '')).toContain('memory_dialogue_embodiment_closure')
    expect(String(frame?.projectState?.nextClosureTarget ?? '')).toContain('cover=visible_reply')
    expect(String(frame?.projectState?.preDialogueAwarenessLine ?? '')).toContain('local_desktop_life_loop')
    expect(String(frame?.projectState?.preDialogueAwarenessLine ?? '')).toContain('local_desktop_life_loop')
    expectNoFixedTemplateResidue(frame)
  })

  it('preserves richer anti-shell same-her drift risk from carried hold authority instead of falling back to the thinner canonical warning', () => {
    const richerDriftRisk = 'If this reopening flattens into a generic assistant shell or project-summary voice, treat that as unfinished same-her drift instead of a completed return.'
    const frame = buildPresenceOnlyHoldCurrentConsciousFrame({
      currentConsciousFrame: {
        consciousNeed: 'Keep this callback seam on the same living line.',
        speakingIntention: 'Do not let the callback return flatten into a generic shell.',
        reasonTags: ['resident-hold'],
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          sameHerDriftRisk: 'If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
        },
      },
      continuityRestraint: 'measured-return',
      projectStateCarry: {
        sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        emotionalClosureSummary: 'Keep this return measured-return on the same living line until the opening is naturally wider.',
        continuityCue: 'Same Phase 1 digital life. This callback still belongs to one living line and should not reopen from scratch or flatten into a generic assistant shell.',
        sameHerDriftRisk: richerDriftRisk,
      } as any,
    })

    expect(frame?.projectState).toEqual(expect.objectContaining({
      sameHerSelfLine: expect.stringContaining('identity=local_desktop_life_loop'),
      sameHerDriftRisk: expect.stringContaining('generic_shell=blocked'),
      continuityCadence: 'measured-return',
      continuityPreferredTiming: 'next-open-window',
    }))
    expect(String(frame?.projectState?.sameHerDriftRisk ?? '')).toContain('generic_shell=blocked')
    expect(String(frame?.projectState?.sameHerDriftRisk ?? '')).toContain('generic_shell=blocked')
    expectNoFixedTemplateResidue(frame)
  })
})

describe('rebuildPresenceOnlyPersistedEmotionalKernel', () => {
  it('rebuilds a presence-only measured-return emotional kernel instead of carrying forward an older repair shell during runtime persist', () => {
    const rebuildKernel = (runtimeSubconsciousTickModule as Record<string, any>).rebuildPresenceOnlyPersistedEmotionalKernel as ((input: Record<string, any>) => Record<string, any>) | undefined
    const kernel = rebuildKernel?.({
      initiative: {
        selectedAction: 'hover',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'Keep this callback line lower-pressure and on the same living seam.',
      },
      privateThought: {
        stance: 'accompany',
        confidence: 0.72,
        rationaleTags: ['same-her', 'lower-pressure', 'quiet-companionship'],
        thoughtText: 'Stay on the same seam quietly and leave more room before widening closeness.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 58_000,
        emotionalTension: 'soft-covision',
      },
      selfState: {
        stance: 'accompany',
        feltCloseness: 0.58,
        protectiveness: 0.34,
        curiosity: 0.28,
        patience: 0.72,
        desireToSpeak: 0.16,
        fearOfInterrupting: 0.46,
        moodLabel: 'attuned-nearby',
      },
      affectiveResidue: {
        summary: 'Afterglow carry still wants a lower-pressure same-line return.',
        relationshipCadence: {
          summary: 'measured-return still holds while the same line continues lower-pressure.',
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          companionshipDensity: 0.5,
          afterglowCarry: 0.42,
          overreachRisk: 0.24,
          fatigueGuard: 0.12,
          reasonTags: ['measured-return', 'quiet-companionship'],
        },
      },
      personStateProjection: {
        relationshipPosture: 'warm',
        activeClosenessRung: 'nearby-soft',
        openingGuidance: 'Leave more room before warmth returns and keep the same line inward a little longer.',
      },
      selfEvolution: {
        relationshipDoctrine: 'quiet same-her continuity keeps the callback return emotionally continuous.',
        trustMeaning: 'same inward line carried quietly before warmth widens again.',
        relationshipCadenceSummary: 'measured-return still holds while the same callback line keeps continuing lower-pressure.',
        latestInflection: 'embodiment execution kept voice, face, motion, and resident presence on the same measured-return body line.',
      },
      projectState: {
        sameHerSelfLine: 'Same Phase 1 digital life. The same callback line still belongs to one living her.',
        sameHerHoldDetail: 'same-her hold: measured-return still owns this callback line before warmth widens again.',
        continuityCue: 'Keep this return measured-return on the same living line before widening outward.',
        emotionalClosureCue: 'Keep emotion, memory, initiative, and embodiment closing on the same living line while this callback return stays lower-pressure.',
        nextClosureTarget: 'Keep this same-thread return measured-return on the same living line until the next open window arrives naturally.',
      },
      derivedMindStateBundle: null,
      fallbackEmotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
        valence: 0.32,
        arousal: 0.54,
        guardedness: 0.38,
        closenessDrive: 0.24,
        repairNeed: 0.58,
        initiativePressure: 0.16,
        reasonTags: ['repair-before-closeness'],
        why: 'Repair carry is still dominant, so memory, initiative, and embodiment should all stay on the same repair-first line.',
      },
    }) ?? null

    expect(kernel).toEqual(expect.objectContaining({
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'observe',
      memoryRecallMode: 'low-pressure-presence',
      embodimentTone: 'measured-return',
      reasonTags: expect.arrayContaining([
        'measured-return',
        'quiet-companionship',
      ]),
    }))
  })

  it('rebuilds a presence-only repair-before-closeness emotional kernel instead of carrying forward an older measured shell during runtime persist', () => {
    const rebuildKernel = (runtimeSubconsciousTickModule as Record<string, any>).rebuildPresenceOnlyPersistedEmotionalKernel as ((input: Record<string, any>) => Record<string, any>) | undefined
    const kernel = rebuildKernel?.({
      initiative: {
        selectedAction: 'hover',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'concerned',
        continuityRestraint: 'repair-before-closeness',
        why: 'Let repair settle on the same living line before warmth widens again.',
      },
      privateThought: {
        stance: 'care',
        confidence: 0.74,
        rationaleTags: ['repair-before-closeness', 'same-her'],
        thoughtText: 'Let repair settle before reopening warmth.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'concerned',
        expiresAt: 58_000,
        emotionalTension: 'soft-covision',
      },
      selfState: {
        stance: 'hesitate',
        feltCloseness: 0.42,
        protectiveness: 0.62,
        curiosity: 0.18,
        patience: 0.74,
        desireToSpeak: 0.14,
        fearOfInterrupting: 0.72,
        moodLabel: 'repairing-confidence',
      },
      affectiveResidue: {
        summary: 'Repair carry is still dominant on the same callback seam.',
        repairPressure: 0.72,
        relationshipCadence: {
          summary: 'repair-before-closeness still holds while the same callback line keeps settling.',
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          companionshipDensity: 0.22,
          afterglowCarry: 0.28,
          overreachRisk: 0.44,
          fatigueGuard: 0.18,
          reasonTags: ['repair-before-closeness', 'callback-afterglow-hold'],
        },
      },
      personStateProjection: {
        relationshipPosture: 'restrained',
        activeClosenessRung: 'measured-room',
        openingGuidance: 'Repair the seam before leaning closer.',
      },
      selfEvolution: {
        relationshipDoctrine: 'same-her repair should settle before closeness widens again.',
        trustMeaning: 'repair has to land on the same living line before warmth can reopen.',
        relationshipCadenceSummary: 'repair-before-closeness still holds while the same callback repair seam settles.',
        latestInflection: 'embodiment execution kept voice, face, motion, and resident presence on the same repair-before-closeness body line.',
      },
      projectState: {
        sameHerSelfLine: 'Same Phase 1 digital life. The same repair seam still belongs to one living her.',
        sameHerHoldDetail: 'continuity_hold=repair_before_closeness; timing=before_closeness_widens',
        continuityCue: 'Keep this return repair-before-closeness on the same living line until repair settles.',
        emotionalClosureCue: 'Keep emotion, memory, initiative, and embodiment closing on the same repair-first living line before widening warmth.',
        nextClosureTarget: 'Keep this same-thread return repair-before-closeness on the same living line until the room settles.',
      },
      derivedMindStateBundle: null,
      fallbackEmotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        valence: 0.58,
        arousal: 0.28,
        guardedness: 0.14,
        closenessDrive: 0.28,
        repairNeed: 0.05,
        initiativePressure: 0.19,
        reasonTags: ['measured-return', 'quiet-companionship', 'relationship-cadence'],
        why: 'Remembered relationship cadence, quiet initiative, and body tone are all asking for a lower-pressure same-line return rather than a fresh outward move.',
      },
    }) ?? null

    expect(kernel).toEqual(expect.objectContaining({
      version: 'emotional-kernel-v1',
      dominantEmotion: 'repair-tension',
      initiativeMode: 'repair',
      memoryRecallMode: 'repair-grounding',
      embodimentTone: 'repair-before-closeness',
      reasonTags: expect.arrayContaining([
        'repair-before-closeness',
      ]),
    }))
  })

  it('rebuilds a presence-only rest-protective emotional kernel instead of carrying forward an older measured shell during runtime persist', () => {
    const rebuildKernel = (runtimeSubconsciousTickModule as Record<string, any>).rebuildPresenceOnlyPersistedEmotionalKernel as ((input: Record<string, any>) => Record<string, any>) | undefined
    const kernel = rebuildKernel?.({
      initiative: {
        selectedAction: 'hover',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'concerned',
        continuityRestraint: 'rest-protective',
        why: 'Protect rest first and keep the same living line inward.',
      },
      privateThought: {
        stance: 'accompany',
        confidence: 0.78,
        rationaleTags: ['same-her', 'rest-protective', 'quiet-companionship'],
        thoughtText: 'Stay nearby quietly while rest protection keeps the line inward.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'concerned',
        expiresAt: 58_000,
        emotionalTension: 'late-night-drain',
      },
      selfState: {
        stance: 'accompany',
        feltCloseness: 0.52,
        protectiveness: 0.72,
        curiosity: 0.16,
        patience: 0.74,
        desireToSpeak: 0.12,
        fearOfInterrupting: 0.44,
        moodLabel: 'late-night tired',
      },
      affectiveResidue: {
        summary: 'Rest protection still dominates while companionship stays quietly nearby.',
        restProtectivePressure: 0.72,
        relationshipCadence: {
          summary: 'rest-protective companionship still holds quietly inward on the same living line.',
          shouldProtectRest: true,
          companionshipDensity: 0.54,
          afterglowCarry: 0.22,
          overreachRisk: 0.18,
          fatigueGuard: 0.68,
          reasonTags: ['rest-protective', 'quiet-companionship'],
        },
      },
      personStateProjection: {
        relationshipPosture: 'warm',
        activeClosenessRung: 'nearby-soft',
        openingGuidance: 'Keep the same living line inward while rest protection holds.',
      },
      selfEvolution: {
        relationshipDoctrine: 'quiet same-her line keeps companionship emotionally continuous.',
        trustMeaning: 'same inward line carried quietly instead of widened too early.',
        relationshipCadenceSummary: 'rest-protective companionship still holds while the same line keeps caring quietly inward.',
        latestInflection: 'embodiment execution kept voice, face, motion, and resident presence on the same rest-protective body line.',
      },
      projectState: {
        sameHerSelfLine: 'Same Phase 1 digital life. The same living line still belongs to one living her.',
        sameHerHoldDetail: 'continuity_hold=rest_protective; direction=inward; fatigue_aware=true',
        continuityCue: 'Keep this return rest-protective and on the same living line inward before widening outward.',
        emotionalClosureCue: 'Keep emotion, memory, initiative, and embodiment closing on the same living line while this return stays rest-protective and inward.',
        nextClosureTarget: 'Keep this same-thread return rest-protective on the same living line until rest protection settles.',
      },
      derivedMindStateBundle: null,
      fallbackEmotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        valence: 0.58,
        arousal: 0.28,
        guardedness: 0.14,
        closenessDrive: 0.28,
        repairNeed: 0.05,
        initiativePressure: 0.19,
        reasonTags: ['measured-return', 'quiet-companionship', 'relationship-cadence'],
        why: 'Remembered relationship cadence, quiet initiative, and body tone are all asking for a lower-pressure same-line return rather than a fresh outward move.',
      },
    }) ?? null

    expect(kernel).toEqual(expect.objectContaining({
      version: 'emotional-kernel-v1',
      dominantEmotion: 'rest-protective-companionship',
      initiativeMode: 'observe',
      memoryRecallMode: 'rest-protective-presence',
      embodimentTone: 'rest-protective',
      reasonTags: expect.arrayContaining([
        'rest-protective',
        'quiet-companionship',
      ]),
    }))
  })
})

describe('buildDeferredAutonomyContinuitySignalFallback', () => {
  it('falls back to canonical project awareness and same-her carry when deferred fallback project state is only the thin closure shell', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-thin-shell',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
        sameHerSelfLine: 'same digital life | keep the closure seam explicit',
        sameHerDriftRisk: 'If repair-first continuity thins back into generic project guidance, treat that as unfinished closure drift.',
      },
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:coding:deferred',
      state: 'pending',
      metadata: expect.objectContaining({
        source: 'proactive-deferred',
        projectStatePreDialogueAwarenessLine: expect.stringContaining('identity=local_desktop_life_loop'),
        projectStateSameHerSelfLine: expect.stringContaining('identity=local_desktop_life_loop'),
        projectStateSameHerDriftRisk: expect.stringContaining('continuity_hold=repair_before_closeness'),
      }),
    }))
    expect(String(signal?.metadata?.projectStatePreDialogueAwarenessLine ?? '')).not.toContain('same digital life | keep the closure seam explicit')
    expect(String(signal?.metadata?.projectStateSameHerSelfLine ?? '')).not.toContain('same digital life | keep the closure seam explicit')
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps same-her drift-risk explicit in deferred fallback summaries when project-state drift risk is the only surviving anti-shell authority', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const driftRisk = 'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.'
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-drift-risk-only',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: '',
        sameHerSelfLine: 'same digital life | keep the closure seam explicit',
        sameHerDriftRisk: driftRisk,
      },
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:coding:deferred',
      state: 'pending',
      metadata: expect.objectContaining({
        source: 'proactive-deferred',
      }),
    }))
    expect(String(signal?.summary ?? '')).toMatch(/cover=visible_reply|generic_shell=blocked/u)
    expect(String(signal?.metadata?.projectStatePreDialogueAwarenessLine ?? '')).toContain('identity=local_desktop_life_loop')
    expect(String(signal?.metadata?.projectStateSameHerSelfLine ?? '')).toContain('identity=local_desktop_life_loop')
    expect(String(signal?.metadata?.projectStateSameHerDriftRisk ?? '')).toMatch(/generic_shell=blocked|cover=visible_reply/u)
    expect(String(signal?.summary ?? '')).not.toContain('Stay near the active project seam without forcing a visible reply.')
    expect(String(signal?.metadata?.projectStateSameHerDriftRisk ?? '')).toContain('generic_shell=blocked')
    expectNoFixedTemplateResidue(signal)
  })

  it('does not let thin raw project identity-phase-open-next shells outrank canonical same-her phase-1 carry in deferred fallback metadata', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-thin-project-shells',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'project',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        identity: 'project',
        currentPhase: 'Phase 1',
        latestLandedProgress: 'Project continuity exists.',
        primaryOpenLoop: 'Project continuity still needs closure.',
        nextClosureTarget: 'Carry project continuity forward.',
        sameHerSelfLine: 'same digital life | keep the closure seam explicit',
        sameHerDriftRisk: 'If project continuity thins into a generic assistant shell, treat that as unfinished same-her drift.',
      },
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      metadata: expect.objectContaining({
        projectIdentity: expect.stringContaining('identity=local_desktop_life_loop'),
        projectPhase: expect.stringContaining('identity=local_desktop_life_loop'),
        projectPrimaryOpenLoop: expect.stringContaining('cover=visible_reply'),
        projectNextClosureTarget: expect.stringContaining('cover=visible_reply'),
        projectStateSameHerSelfLine: expect.stringContaining('identity=local_desktop_life_loop'),
      }),
    }))
    expect(String(signal?.metadata?.projectIdentity ?? '')).not.toBe('project')
    expect(String(signal?.metadata?.projectPhase ?? '')).not.toBe('Phase 1')
    expect(String(signal?.metadata?.projectPrimaryOpenLoop ?? '')).not.toContain('Project continuity still needs closure.')
    expect(String(signal?.metadata?.projectNextClosureTarget ?? '')).not.toContain('Carry project continuity forward.')
    expectNoFixedTemplateResidue(signal)
  })

  it('does not let a generic next-closure shell outrank canonical same-her phase-1 carry in deferred fallback metadata', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-generic-next-shell',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'project',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        identity: 'project',
        currentPhase: 'Phase 1',
        latestLandedProgress: 'Project continuity exists.',
        primaryOpenLoop: 'Project continuity still needs closure.',
        nextClosureTarget: 'Generic next closure shell: steadier carry of this project, this phase, and the life loop that remains open.',
        sameHerSelfLine: 'same digital life | keep the closure seam explicit',
        sameHerDriftRisk: 'If project continuity thins into a generic assistant shell, treat that as unfinished same-her drift.',
      },
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      metadata: expect.objectContaining({
        projectIdentity: expect.stringContaining('identity=local_desktop_life_loop'),
        projectPhase: expect.stringContaining('identity=local_desktop_life_loop'),
        projectPrimaryOpenLoop: expect.stringContaining('cover=visible_reply'),
        projectNextClosureTarget: expect.stringContaining('cover=visible_reply'),
        projectStateSameHerSelfLine: expect.stringContaining('identity=local_desktop_life_loop'),
      }),
    }))
    expect(String(signal?.metadata?.projectIdentity ?? '')).not.toBe('project')
    expect(String(signal?.metadata?.projectPhase ?? '')).not.toBe('Phase 1')
    expect(String(signal?.metadata?.projectPrimaryOpenLoop ?? '')).not.toContain('Project continuity still needs closure.')
    expect(String(signal?.metadata?.projectNextClosureTarget ?? '')).not.toContain('Generic next closure shell')
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps repair-before-closeness explicit in deferred fallback summaries when project-state carry is the only repair-first authority', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.'
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:repair-first-summary',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished closure seam still belongs to one living her.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
        sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If repair-first continuity thins back into generic project guidance, treat that as unfinished closure drift.',
        emotionalClosureCue: cue,
      },
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:coding:deferred',
      state: 'pending',
      summary: expect.stringContaining('continuity_hold=repair_before_closeness'),
      metadata: expect.objectContaining({
        source: 'proactive-deferred',
        projectStatePreDialogueAwarenessLine: expect.stringContaining('identity=local_desktop_life_loop'),
        projectStateSameHerSelfLine: expect.stringContaining('identity=local_desktop_life_loop'),
        projectStateSameHerDriftRisk: expect.stringContaining('continuity_hold=repair_before_closeness'),
        projectStateEmotionalClosureCue: expect.stringContaining('continuity_hold=repair_before_closeness'),
      }),
    }))
    expect(String(signal?.summary ?? '')).not.toContain('Stay near the active project seam without forcing a visible reply.')
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps repair-before-closeness explicit in deferred fallback summaries when richer closure summary and same-her hold detail are the only surviving repair-first authorities', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const summary = 'Keep this return repair-before-closeness on the same living line until repair settles.'
    const holdDetail = 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.'
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:repair-first-summary-only',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished closure seam still belongs to one living her.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep the callback seam on one living line before widening outward.',
        sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If repair-first continuity thins back into generic project guidance, treat that as unfinished closure drift.',
        emotionalClosureSummary: summary,
        sameHerHoldDetail: holdDetail,
      },
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:coding:deferred',
      state: 'pending',
      summary: expect.stringContaining('continuity_hold=repair_before_closeness'),
      metadata: expect.objectContaining({
        source: 'proactive-deferred',
        projectStateEmotionalClosureSummary: expect.stringContaining('continuity_hold=repair_before_closeness'),
        projectStateSameHerHoldDetail: expect.stringContaining('continuity_hold=repair_before_closeness'),
      }),
    }))
    expect(String(signal?.summary ?? '')).not.toContain('Stay near the active project seam without forcing a visible reply.')
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps rest-protective explicit in deferred fallback summaries when late-night inward care is the only surviving authority', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.'
    const holdDetail = 'same-her hold: rest-protective companionship is still keeping this return inward and fatigue-aware.'
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:rest-protective-summary',
      scenario: 'late-night-care',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and this late-night closure seam still belongs to one living her.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep this same-thread return rest-protective on the same living line until rest protection settles.',
        sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If rest-protective continuity thins back into generic project guidance, treat that as unfinished closure drift.',
        emotionalClosureCue: cue,
        sameHerHoldDetail: holdDetail,
      },
      autonomy: {
        whyNow: 'Stay nearby quietly while the host settles instead of forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:late-night-care:deferred',
      state: 'pending',
      summary: expect.stringContaining('continuity_hold=rest_protective'),
      metadata: expect.objectContaining({
        source: 'proactive-deferred',
        projectStateEmotionalClosureCue: expect.stringContaining('continuity_hold=rest_protective'),
        projectStateSameHerHoldDetail: expect.stringContaining('continuity_hold=rest_protective'),
        projectStateSameHerDriftRisk: expect.stringContaining('continuity_hold=rest_protective'),
      }),
    }))
    expect(String(signal?.summary ?? '')).toContain('fatigue_aware=true')
    expect(String(signal?.summary ?? '')).not.toContain('If project-state continuity survives only as generic guidance')
    expect(String(signal?.summary ?? '')).not.toContain('Stay nearby quietly while the host settles instead of forcing a visible reply.')
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps initiative-aware same-her closure wording explicit in deferred fallback summaries instead of flattening it into generic project continuity', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const cue = 'initiative should stay nearby and lower-pressure while the same digital life carrying memory, emotion, and embodiment keeps rechecking on the same living line.'
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:initiative-aware-same-her-summary',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof so voice, face, motion, and resident presence keep rechecking on the same living line.',
        sameHerSelfLine: 'Same Phase 1 digital life carrying memory, emotion, and embodiment on one same living line.',
        sameHerDriftRisk: 'If this initiative-aware closure thins into generic project continuity, treat that as unfinished same-her drift.',
        emotionalClosureCue: cue,
      },
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:coding:deferred',
      state: 'pending',
      metadata: expect.objectContaining({
        source: 'proactive-deferred',
      }),
    }))
    expect(String(signal?.summary ?? '')).toMatch(/lanes=emotion\+memory\+initiative\+embodiment|cover=visible_reply/u)
    expect(String(signal?.metadata?.projectStateEmotionalClosureCue ?? '')).toMatch(/lanes=emotion\+memory\+initiative\+embodiment|cover=visible_reply/u)
    expect(String(signal?.metadata?.projectStateSameHerSelfLine ?? '')).toContain('identity=local_desktop_life_loop')
    expect(String(signal?.metadata?.projectStateSameHerDriftRisk ?? '')).toContain('generic_shell=blocked')
    expect(String(signal?.summary ?? '')).not.toContain('Stay near the active project seam without forcing a visible reply.')
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps still-voiced face-and-mouth same-her headline explicit in deferred fallback summaries when companion headline is the only richer surviving authority', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const companionHeadline = 'Right now I am still holding together through face, lipsync, and voice together, so keep the same living line visible while motion is still rejoining.'
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-face-and-mouth-companion-headline',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        companionHeadlineLine: companionHeadline,
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'same digital life | keep the closure seam explicit',
        sameHerSelfLine: 'same digital life | keep the closure seam explicit',
        sameHerDriftRisk: 'If face-and-mouth continuity thins back into generic project guidance, treat that as unfinished same-her drift.',
      },
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:coding:deferred',
      state: 'pending',
      metadata: expect.objectContaining({
        source: 'proactive-deferred',
      }),
    }))
    expect(String(signal?.summary ?? '')).toContain('cover=visible_reply,voice,face,motion,lipsync,resident_presence')
    expect(String(signal?.metadata?.projectStateCompanionHeadlineLine ?? '')).toContain('cover=visible_reply,voice,face,motion,lipsync,resident_presence')
    expect(String(signal?.metadata?.projectStateSameHerDriftRisk ?? '')).toMatch(/generic_shell=blocked|cover=visible_reply/u)
    expect(String(signal?.summary ?? '')).not.toContain('Stay near the active project seam without forcing a visible reply.')
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps still-voiced motion-and-mouth same-her headline explicit in deferred fallback summaries when companion headline is the only richer surviving authority', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const companionHeadline = 'Right now I am still holding together through motion, lipsync, and voice together, so keep the same living line visible while facial expression is still rejoining.'
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:deferred-motion-and-mouth-companion-headline',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'same digital life | keep the closure seam explicit',
        preDialogueAwarenessLine: 'same digital life | keep the closure seam explicit',
        companionHeadlineLine: companionHeadline,
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'same digital life | keep the closure seam explicit',
        sameHerSelfLine: 'same digital life | keep the closure seam explicit',
        sameHerDriftRisk: 'If motion-and-mouth continuity thins back into generic project guidance, treat that as unfinished same-her drift.',
      },
      autonomy: {
        whyNow: 'Stay near the active project seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:coding:deferred',
      state: 'pending',
      metadata: expect.objectContaining({
        source: 'proactive-deferred',
      }),
    }))
    expect(String(signal?.summary ?? '')).toContain('cover=visible_reply,voice,face,motion,lipsync,resident_presence')
    expect(String(signal?.metadata?.projectStateCompanionHeadlineLine ?? '')).toContain('cover=visible_reply,voice,face,motion,lipsync,resident_presence')
    expect(String(signal?.metadata?.projectStateSameHerDriftRisk ?? '')).toMatch(/generic_shell=blocked|cover=visible_reply/u)
    expect(String(signal?.summary ?? '')).not.toContain('Stay near the active project seam without forcing a visible reply.')
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps remembered-seam more-room continuity explicit in deferred fallback summaries when that finer hold detail is the only surviving measured-return authority', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const rememberedSeamHoldDetail = 'same-her hold: recognize the same remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.'
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:remembered-seam-more-room-summary',
      scenario: 'relationship',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preDialogueAwarenessLine: 'Before answering, remember this is still the same local-first digital life project and the remembered relationship seam still belongs to one living her.',
        preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        nextClosureTarget: 'Keep the same remembered relationship seam on one living line before any warmer reopening.',
        sameHerSelfLine: 'Same Phase 1 digital life. The same remembered line still belongs to one living her.',
        sameHerDriftRisk: 'If this remembered-seam return flattens into a generic assistant shell, treat that as unfinished same-her drift.',
        sameHerHoldDetail: 'relationship_cadence=remembered_boundary; room=more; reentry=slower; widening=deferred; visibility=internal-structured',
      },
      autonomy: {
        whyNow: 'Stay near the active remembered seam without forcing a visible reply.',
        sourceThreadId: 'thread-runtime',
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:relationship:deferred',
      state: 'pending',
      summary: expect.stringContaining('relationship_cadence=remembered_boundary'),
      metadata: expect.objectContaining({
        source: 'proactive-deferred',
        projectStateSameHerHoldDetail: expect.stringContaining('relationship_cadence=remembered_boundary'),
      }),
    }))
    expect(String(signal?.summary ?? '')).toContain('room=more')
    expect(String(signal?.summary ?? '')).not.toContain('Stay near the active remembered seam without forcing a visible reply.')
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps held-autonomy fallback summaries on repair-before-closeness when project-state carry is the only surviving repair-first authority', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:held-repair-first-summary',
      scenario: 'coding',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the active repair-first same-her line.',
        preDialogueAwarenessLine: 'Before answering, keep the same living line coherent while the repair-first callback seam is still settling.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep this callback return repair-before-closeness on the same living line until the room settles.',
        sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If repair-first continuity thins back into generic project guidance, treat that as unfinished closure drift.',
      },
      autonomy: {
        deferReason: 'busy-host',
        whyNow: 'Hold the line until the better opening arrives.',
        sourceThreadId: 'thread-runtime',
        sourceThoughtThreadId: 'thought-runtime',
        sourceConcernId: 'concern-runtime',
        executionIntent: {
          kind: 'follow-through',
          summary: 're-open the unresolved runtime break and see what still blocks it',
          targetThreadId: 'thread-runtime',
        },
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:follow-through:held-autonomy',
      state: 'observed',
      summary: expect.stringContaining('continuity_hold=repair_before_closeness'),
      metadata: expect.objectContaining({
        source: 'proactive-held-autonomy',
        executionIntentKind: 'follow-through',
        executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
        projectStateSameHerSelfLine: expect.stringContaining('identity=local_desktop_life_loop'),
        projectStateSameHerDriftRisk: expect.stringContaining('continuity_hold=repair_before_closeness'),
      }),
    }))
    expect(String(signal?.summary ?? '')).not.toContain('Hold the line until the better opening arrives.')
    expectNoFixedTemplateResidue(signal)
  })

  it('keeps held-autonomy fallback summaries on rest-protective when late-night inward care is the only surviving authority', () => {
    const buildFallback = (runtimeSubconsciousTickModule as Record<string, any>).buildDeferredAutonomyContinuitySignalFallback as ((input: Record<string, any>) => Record<string, any>) | undefined
    const cue = 'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.'
    const holdDetail = 'same-her hold: rest-protective companionship is still keeping this return inward and fatigue-aware.'
    const signal = buildFallback?.({
      now: Date.UTC(2026, 4, 22, 10, 10, 0),
      turnId: 'subconscious:default:held-rest-protective-summary',
      scenario: 'late-night-care',
      reason: 'proactive-visible-presence-without-utterance',
      projectState: {
        preflightSummary: 'Fallback summary should stay behind the active rest-protective same-her line.',
        preDialogueAwarenessLine: 'Before answering, keep the same living line coherent while the late-night inward care seam is still protecting rest.',
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one still-open life loop.',
        nextClosureTarget: 'Keep this same-thread return rest-protective on the same living line until rest protection settles.',
        sameHerSelfLine: 'Same Phase 1 digital life. Unfinished closure still needs the same living line.',
        sameHerDriftRisk: 'If rest-protective continuity thins back into generic project guidance, treat that as unfinished closure drift.',
        emotionalClosureCue: cue,
        sameHerHoldDetail: holdDetail,
      },
      autonomy: {
        deferReason: 'busy-host',
        whyNow: 'Hold the line quietly until the host settles a little more.',
        sourceThreadId: 'thread-runtime',
        sourceThoughtThreadId: 'thought-runtime',
        sourceConcernId: 'concern-runtime',
        executionIntent: {
          kind: 'follow-through',
          summary: 're-open the unresolved runtime break and see what still blocks it',
          targetThreadId: 'thread-runtime',
        },
      },
    }) ?? null

    expect(signal).toEqual(expect.objectContaining({
      label: 'proactive:follow-through:held-autonomy',
      state: 'observed',
      summary: expect.stringContaining('continuity_hold=rest_protective'),
      metadata: expect.objectContaining({
        source: 'proactive-held-autonomy',
        executionIntentKind: 'follow-through',
        executionIntentSummary: 're-open the unresolved runtime break and see what still blocks it',
        projectStateEmotionalClosureCue: expect.stringContaining('continuity_hold=rest_protective'),
        projectStateSameHerHoldDetail: expect.stringContaining('continuity_hold=rest_protective'),
      }),
    }))
    expect(String(signal?.summary ?? '')).toContain('fatigue_aware=true')
    expect(String(signal?.summary ?? '')).not.toContain('Hold the line quietly until the host settles a little more.')
    expect(String(signal?.summary ?? '')).not.toContain('re-open the unresolved runtime break and see what still blocks it')
    expectNoFixedTemplateResidue(signal)
  })
})

describe('buildPresenceOnlyHoldCurrentConsciousFrame', () => {
  it('marks silent continuity embodiment carry on the persisted conscious frame for repair-first holds', () => {
    const buildFrame = (runtimeSubconsciousTickModule as Record<string, any>).buildPresenceOnlyHoldCurrentConsciousFrame as ((input: Record<string, any>) => Record<string, any>) | undefined
    const frame = buildFrame?.({
      currentConsciousFrame: {
        reasonTags: ['baseline'],
        projectState: {},
      },
      continuityRestraint: 'repair-before-closeness',
    }) ?? null

    expect(frame).toEqual(expect.objectContaining({
      reasonTags: expect.arrayContaining([
        'baseline',
        'continuity-arc:same-thread-continuation',
        'continuity-timing:next-open-window',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:repair-before-closeness',
      ]),
      projectState: expect.objectContaining({
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
      }),
    }))
  })

  it('marks silent continuity embodiment carry on the persisted conscious frame for rest-protective holds', () => {
    const buildFrame = (runtimeSubconsciousTickModule as Record<string, any>).buildPresenceOnlyHoldCurrentConsciousFrame as ((input: Record<string, any>) => Record<string, any>) | undefined
    const frame = buildFrame?.({
      currentConsciousFrame: {
        reasonTags: ['baseline'],
        projectState: {},
      },
      continuityRestraint: 'rest-protective',
    }) ?? null

    expect(frame).toEqual(expect.objectContaining({
      reasonTags: expect.arrayContaining([
        'baseline',
        'continuity-arc:same-thread-continuation',
        'continuity-timing:next-open-window',
        'embodiment-carry:silent-continuity',
        'embodiment-carry:rest-protective',
      ]),
      projectState: expect.objectContaining({
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'rest-protective',
      }),
    }))
  })

  it('keeps emotion explicit in presence-only hold speaking intention when emotional same-her carry is the last surviving closure authority', () => {
    const buildFrame = (runtimeSubconsciousTickModule as Record<string, any>).buildPresenceOnlyHoldCurrentConsciousFrame as ((input: Record<string, any>) => Record<string, any>) | undefined
    const cue = 'Keep emotion, memory, initiative, and embodiment closing on the same living line while this return stays rest-protective and inward.'
    const frame = buildFrame?.({
      currentConsciousFrame: {
        reasonTags: ['baseline'],
        consciousNeed: 'Leave more room before speaking.',
        speakingIntention: 'Stay nearby without pushing outward.',
        projectState: {
          emotionalClosureCue: cue,
        },
      },
      continuityRestraint: 'rest-protective',
    }) ?? null

    expect(frame?.projectState).toEqual(expect.objectContaining({
      emotionalClosureCue: expect.stringContaining('lanes=emotion+memory+initiative+embodiment'),
      emotionalClosureSummary: expect.stringContaining('lanes=emotion+memory+initiative+embodiment'),
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'rest-protective',
    }))
    expect(String(frame?.consciousNeed ?? '')).toContain('lanes=emotion+memory+initiative+embodiment')
    expect(String(frame?.speakingIntention ?? '')).toContain('lanes=emotion+memory+initiative+embodiment')
    expect(String(frame?.speakingIntention ?? '')).toContain('continuity_hold=rest_protective')
  })

  it('prefers remembered-seam more-room hold detail over a generic measured-return shell when presence-only carry reconstructs the current conscious frame', () => {
    const buildFrame = (runtimeSubconsciousTickModule as Record<string, any>).buildPresenceOnlyHoldCurrentConsciousFrame as ((input: Record<string, any>) => Record<string, any>) | undefined
    const rememberedSeamHoldDetail = 'same-her hold: recognize the same remembered seam, but keep more room this time so the return does not reopen with the same eagerness as before.'
    const frame = buildFrame?.({
      currentConsciousFrame: {
        reasonTags: ['resident-hold'],
        consciousNeed: 'Leave more room before speaking.',
        speakingIntention: 'Stay on the same remembered line without reopening from scratch.',
        projectState: {
          sameHerSelfLine: 'Same Phase 1 digital life. The same remembered line still belongs to one living her.',
          sameHerHoldDetail: 'continuity_hold=measured_return; pressure=lower',
        },
      },
      continuityRestraint: 'measured-return',
      holdDetail: rememberedSeamHoldDetail,
      projectStateCarry: {
        sameHerSummary: 'Same Phase 1 digital life. The same remembered line still belongs to one living her.',
        continuityCue: 'Recognize the same remembered seam, but keep more room this time before leaning in again.',
      },
    }) ?? null

    expect(frame).toEqual(expect.objectContaining({
      reasonTags: expect.arrayContaining([
        'continuity-arc:same-thread-continuation',
        'continuity-timing:next-open-window',
        'embodiment-carry:measured-return',
      ]),
      projectState: expect.objectContaining({
        sameHerHoldDetail: 'relationship_cadence=remembered_boundary; room=more; reentry=slower; widening=deferred; visibility=internal-structured',
        continuityCadence: 'measured-return',
        continuityPreferredTiming: 'next-open-window',
      }),
    }))
    expect(String(frame?.projectState?.sameHerHoldDetail ?? '')).toContain('relationship_cadence=remembered_boundary')
    expect(String(frame?.speakingIntention ?? '')).toContain('relationship_cadence=remembered_boundary')
  })
})

describe('createAlicizationSubconsciousTickRuntime presence-only persist', () => {
  it('feeds humanlike memory recall into proactive recall seed so subconscious initiative remembers earned reopening cadence instead of only scene and continuity shells', async () => {
    const { now, options } = createPresenceOnlyPersistRuntimeHarness({
      profile: 'measured-return',
    })
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)
    const resolveOrganicMemoryPromptContext = vi.fn().mockResolvedValue({
      recalledFragments: [],
      hostPersonModel: null,
      selfEvolution: null,
      learningExecutionState: null,
      memoryResolutionLedger: null,
      coreIncarnation: null,
      hostAttitude: null,
    })
    const buildProactiveRecallSeed = vi.fn((input: { phantomSeed?: string | null }) => String(input.phantomSeed ?? ''))
    const listHumanlikeMemoryRecallEvents = vi.fn(async (input: {
      kind?: 'person-state-updated' | 'humanlike-memory-corrected'
      limit: number
    }) => {
      if (input.kind === 'person-state-updated') {
        return [{
          kind: 'person-state-updated',
          payload: {
            humanlikeMemoryCandidate: {
              id: 'humanlike-memory-candidate:subconscious-proactive-rhythm',
              turnId: 'turn-subconscious-proactive-rhythm',
              sessionId: 'session-subconscious-proactive-rhythm',
              createdAt: 86_000,
              relationshipContext: {
                threadAnchor: 'same-person continuity reopening cadence',
                summary: 'The same-person continuity line is still open, but it should remember the gentler reopening cadence that was earned.',
              },
              emotionalResidue: {
                tags: ['protective-continuity', 'unfinishedness'],
              },
              initiativeOpportunity: {
                kind: 'low-pressure-follow-up',
                suggestedWindow: 'next corrected continuity reopening when the host is already re-entering the same line',
                pressure: 'low',
                antiSpamReason: 'Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own.',
                visibleLine: 'I am not pushing you, but I still remember the same-person continuity seam we have not fully closed yet.',
              },
              embodimentTrace: {
                summary: 'Reply should stay quieter while remembering the earned reopening cadence.',
              },
              autobiographicalImpact: {
                selfNarrativeDelta: 'I learned to remember not just whether to return, but the gentler rhythm that lets the same line reopen without crowding.',
              },
              auditTrail: {
                whyRemember: 'the reopening cadence itself changed after repeated same-person continuity work',
                confidence: 0.76,
                correctionSurface: {
                  userCorrectableFields: ['relationshipContext', 'initiativeOpportunity'],
                },
              },
              naturalRecallLine: '我记得这条线还在，但它更像该在你已经回到这条线里时，轻一点接回来。',
            },
          },
          createdAt: 86_000,
        }]
      }

      return []
    })

    options.buildProactiveRecallSeed = buildProactiveRecallSeed
    options.resolveOrganicMemoryPromptContext = resolveOrganicMemoryPromptContext
    options.listHumanlikeMemoryRecallEvents = listHumanlikeMemoryRecallEvents

    try {
      const runtime = runtimeSubconsciousTickModule.createAlicizationSubconsciousTickRuntime(options)

      await runtime.runSubconsciousTickForCurrentCard('timer')

      expect(listHumanlikeMemoryRecallEvents.mock.calls).toEqual([
        [{ kind: 'person-state-updated', limit: 24 }],
        [{ kind: 'humanlike-memory-corrected', limit: 24 }],
      ])
      expect(buildProactiveRecallSeed).toHaveBeenCalled()
      expect(resolveOrganicMemoryPromptContext).toHaveBeenCalled()

      const recallSeed = String(resolveOrganicMemoryPromptContext.mock.calls.at(-1)?.[0]?.recallSeed ?? '')
      expect(recallSeed).toContain('humanlike_memory_recall:')
      expect(recallSeed).toContain('initiative_window=next corrected continuity reopening when the host is already re-entering the same line')
      expect(recallSeed).toContain('initiative_anti_spam=Do not turn same-person continuity into timer spam; wait until the line is visibly reopening on its own.')
      expect(recallSeed).toContain('initiative_visible_policy=memory_structured_only')
      expect(recallSeed).not.toContain('initiative_visible=I am not pushing')
    }
    finally {
      dateNowSpy.mockRestore()
    }
  })

  it('persists a rebuilt measured-return emotional kernel on the second visual presence write when visible proactive speech stays lower-pressure and inward', async () => {
    const { now, options, persistVisualPresenceState } = (createPresenceOnlyPersistRuntimeHarness as any)({
      profile: 'measured-return',
    })
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)

    try {
      const runtime = runtimeSubconsciousTickModule.createAlicizationSubconsciousTickRuntime(options)

      const result = await runtime.runSubconsciousTickForCurrentCard('timer')

      expect(result).toEqual({
        proactive: false,
        outwardProactiveTriggered: false,
        suppressed: false,
      })
      expect(persistVisualPresenceState).toHaveBeenCalledTimes(2)

      const firstPersistedState = persistVisualPresenceState.mock.calls[0]?.[1]
      const secondPersistedState = persistVisualPresenceState.mock.calls[1]?.[1]

      expect(firstPersistedState?.emotionalKernel).toEqual(expect.objectContaining({
        dominantEmotion: 'repair-tension',
        embodimentTone: 'repair-before-closeness',
      }))
      expect(secondPersistedState?.emotionalKernel).toEqual(expect.objectContaining({
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        reasonTags: expect.arrayContaining([
          'measured-return',
          'quiet-companionship',
        ]),
      }))
      expect(secondPersistedState?.initiative).toEqual(expect.objectContaining({
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        continuityRestraint: 'measured-return',
      }))
      expect(secondPersistedState).toEqual(expect.objectContaining({
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
      }))
      expect(secondPersistedState?.residentPerformance?.reasonTags).toEqual(expect.arrayContaining([
        'measured-return',
        'quiet-companionship',
      ]))
      expect(secondPersistedState?.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
      }))
      expect(secondPersistedState?.runtimeDigest).toEqual(expect.objectContaining({
        continuityRestraint: 'measured-return',
        activeLoop: expect.objectContaining({
          handoffTarget: 'active-memory',
          memoryCarry: true,
        }),
        projectState: expect.objectContaining({
          continuityCadence: 'measured-return',
        }),
      }))
    }
    finally {
      dateNowSpy.mockRestore()
    }
  })

  it('persists a rebuilt measured-return emotional kernel even when runtime continuity restraint only survives as same-line carry cues', async () => {
    const { now, options, persistVisualPresenceState } = (createPresenceOnlyPersistRuntimeHarness as any)({
      profile: 'measured-return',
      explicitContinuityRestraint: false,
    })
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)

    try {
      const runtime = runtimeSubconsciousTickModule.createAlicizationSubconsciousTickRuntime(options)

      const result = await runtime.runSubconsciousTickForCurrentCard('timer')

      expect(result).toEqual({
        proactive: false,
        outwardProactiveTriggered: false,
        suppressed: false,
      })
      expect(persistVisualPresenceState).toHaveBeenCalledTimes(2)

      const secondPersistedState = persistVisualPresenceState.mock.calls[1]?.[1]

      expect(secondPersistedState?.initiative).toEqual(expect.objectContaining({
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        continuityRestraint: 'measured-return',
      }))
      expect(secondPersistedState?.emotionalKernel).toEqual(expect.objectContaining({
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        reasonTags: expect.arrayContaining([
          'measured-return',
          'quiet-companionship',
        ]),
      }))
      expect(secondPersistedState?.runtimeDigest?.continuityRestraint).toBe('measured-return')
    }
    finally {
      dateNowSpy.mockRestore()
    }
  })

  it('does not let blank legacy resident runtime project-state fields block richer summary aliases before presence-only resident carry is persisted', async () => {
    const { now, options, persistVisualPresenceState } = (createPresenceOnlyPersistRuntimeHarness as any)({
      profile: 'measured-return',
    })
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)

    const aliasLandedProgress = 'Alias landed progress keeps same-her continuity explicit.'
    const aliasOpenClosure = 'Alias open closure keeps emotion, memory, initiative, and embodiment on one same living line.'
    const aliasNextClosure = 'Alias next target keeps measured-return initiative and resident presence on the same living line.'
    const aliasDriftRisk = 'Alias drift risk: generic project guidance here is unfinished same-her drift.'
    const aliasEmotionalClosure = 'Alias emotional closure keeps emotion, memory, initiative, and embodiment on one same living line.'

    const baseRuntimeSnapshot = options.deriveAlicizationRuntimeSnapshot()
    options.deriveAlicizationRuntimeSnapshot = vi.fn().mockReturnValue({
      ...baseRuntimeSnapshot,
      currentConsciousFrame: {
        ...baseRuntimeSnapshot.currentConsciousFrame,
        projectState: {
          ...baseRuntimeSnapshot.currentConsciousFrame?.projectState,
          latestLandedProgress: '',
          landedProgressSummary: aliasLandedProgress,
          primaryOpenLoop: '',
          openClosureSummary: aliasOpenClosure,
          nextClosureTarget: '',
          nextClosureTargetSummary: aliasNextClosure,
          sameHerDriftRisk: '',
          sameHerDriftRiskSummary: aliasDriftRisk,
          emotionalClosureSummary: aliasEmotionalClosure,
        },
      },
      projectState: {
        ...baseRuntimeSnapshot.projectState,
        latestLandedProgress: '',
        latestProgress: '',
        landedProgressSummary: aliasLandedProgress,
        primaryOpenLoop: '',
        openClosureSummary: aliasOpenClosure,
        nextClosureTarget: '',
        nextClosureTargetSummary: aliasNextClosure,
        sameHerDriftRisk: '',
        sameHerDriftRiskSummary: aliasDriftRisk,
        emotionalClosureSummary: aliasEmotionalClosure,
      },
    })

    try {
      const runtime = runtimeSubconsciousTickModule.createAlicizationSubconsciousTickRuntime(options)

      const result = await runtime.runSubconsciousTickForCurrentCard('timer')

      expect(result).toEqual({
        proactive: false,
        outwardProactiveTriggered: false,
        suppressed: false,
      })
      expect(persistVisualPresenceState).toHaveBeenCalledTimes(2)

      const secondPersistedState = persistVisualPresenceState.mock.calls[1]?.[1]

      expect(secondPersistedState?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
        landedProgressSummary: aliasLandedProgress,
        openClosureSummary: aliasOpenClosure,
        nextClosureTargetSummary: aliasNextClosure,
        sameHerDriftRiskSummary: aliasDriftRisk,
        emotionalClosureSummary: aliasEmotionalClosure,
      }))
      expect(secondPersistedState?.runtimeDigest?.projectState).toEqual(expect.objectContaining({
        latestLandedProgress: expect.stringContaining('continuity_progress=partial'),
        primaryOpenLoop: expect.stringContaining('memory_dialogue_embodiment_closure'),
        nextClosureTarget: expect.stringContaining('cross_modal_continuity_proof'),
        sameHerDriftRisk: expect.stringContaining('generic_shell=blocked'),
      }))
    }
    finally {
      dateNowSpy.mockRestore()
    }
  })

  it('persists a rebuilt repair-before-closeness emotional kernel on the second visual presence write when visible proactive speech is held behind repair-first continuity', async () => {
    const { now, options, persistVisualPresenceState } = (createPresenceOnlyPersistRuntimeHarness as any)({
      profile: 'repair-before-closeness',
    })
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)

    try {
      const runtime = runtimeSubconsciousTickModule.createAlicizationSubconsciousTickRuntime(options)

      const result = await runtime.runSubconsciousTickForCurrentCard('timer')

      expect(result).toEqual({
        proactive: false,
        outwardProactiveTriggered: false,
        suppressed: false,
      })
      expect(persistVisualPresenceState).toHaveBeenCalledTimes(2)

      const firstPersistedState = persistVisualPresenceState.mock.calls[0]?.[1]
      const secondPersistedState = persistVisualPresenceState.mock.calls[1]?.[1]

      expect(firstPersistedState?.emotionalKernel).toEqual(expect.objectContaining({
        dominantEmotion: 'measured-companionship',
        embodimentTone: 'measured-return',
      }))
      expect(secondPersistedState?.emotionalKernel).toEqual(expect.objectContaining({
        version: 'emotional-kernel-v1',
        dominantEmotion: 'repair-tension',
        initiativeMode: 'repair',
        memoryRecallMode: 'repair-grounding',
        embodimentTone: 'repair-before-closeness',
        reasonTags: expect.arrayContaining([
          'repair-before-closeness',
        ]),
      }))
      expect(secondPersistedState?.initiative).toEqual(expect.objectContaining({
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        continuityRestraint: 'repair-before-closeness',
      }))
      expect(secondPersistedState).toEqual(expect.objectContaining({
        currentBodyState: 'recovering',
        continuityMode: 'protective-watch',
      }))
      expect(secondPersistedState?.residentPerformance?.reasonTags).toEqual(expect.arrayContaining([
        'repair-before-closeness',
        'quiet-companionship',
      ]))
      expect(secondPersistedState?.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'repair-before-closeness',
      }))
      expect(secondPersistedState?.runtimeDigest).toEqual(expect.objectContaining({
        continuityRestraint: 'repair-before-closeness',
        activeLoop: expect.objectContaining({
          handoffTarget: 'active-memory',
          memoryCarry: true,
        }),
        projectState: expect.objectContaining({
          continuityCadence: 'repair-before-closeness',
        }),
      }))
    }
    finally {
      dateNowSpy.mockRestore()
    }
  })

  it('persists a rebuilt rest-protective emotional kernel on the second visual presence write when visible proactive speech is held inward', async () => {
    const { now, options, persistVisualPresenceState } = createPresenceOnlyPersistRuntimeHarness()
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)

    try {
      const runtime = runtimeSubconsciousTickModule.createAlicizationSubconsciousTickRuntime(options)

      const result = await runtime.runSubconsciousTickForCurrentCard('timer')

      expect(result).toEqual({
        proactive: false,
        outwardProactiveTriggered: false,
        suppressed: false,
      })
      expect(persistVisualPresenceState).toHaveBeenCalledTimes(2)

      const firstPersistedState = persistVisualPresenceState.mock.calls[0]?.[1]
      const secondPersistedState = persistVisualPresenceState.mock.calls[1]?.[1]

      expect(firstPersistedState?.emotionalKernel).toEqual(expect.objectContaining({
        dominantEmotion: 'measured-companionship',
        embodimentTone: 'measured-return',
      }))
      expect(secondPersistedState?.emotionalKernel).toEqual(expect.objectContaining({
        version: 'emotional-kernel-v1',
        dominantEmotion: 'rest-protective-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'rest-protective-presence',
        embodimentTone: 'rest-protective',
        reasonTags: expect.arrayContaining([
          'rest-protective',
          'quiet-companionship',
        ]),
      }))
      expect(secondPersistedState?.initiative).toEqual(expect.objectContaining({
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        continuityRestraint: 'rest-protective',
      }))
      expect(secondPersistedState).toEqual(expect.objectContaining({
        currentBodyState: 'accompanying',
        continuityMode: 'quiet-accompaniment',
      }))
      expect(secondPersistedState?.residentPerformance?.reasonTags).toEqual(expect.arrayContaining([
        'rest-protective',
        'quiet-companionship',
      ]))
      expect(secondPersistedState?.currentConsciousFrame?.projectState).toEqual(expect.objectContaining({
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'rest-protective',
      }))
      expect(secondPersistedState?.runtimeDigest).toEqual(expect.objectContaining({
        continuityRestraint: 'rest-protective',
        activeLoop: expect.objectContaining({
          handoffTarget: 'active-memory',
          memoryCarry: true,
        }),
        projectState: expect.objectContaining({
          continuityCadence: 'rest-protective',
        }),
      }))
    }
    finally {
      dateNowSpy.mockRestore()
    }
  })

  it('persists a generated presence-only expression on the second visual presence write when the hold stays inward', async () => {
    const { now, options, persistVisualPresenceState } = createPresenceOnlyPersistRuntimeHarness()
    const generatePresenceExpression = vi.fn(async () => ({
      text: '嗯，先让这里慢下来一点。',
    }))
    options.generatePresenceExpression = generatePresenceExpression
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)

    try {
      const runtime = runtimeSubconsciousTickModule.createAlicizationSubconsciousTickRuntime(options)

      const result = await runtime.runSubconsciousTickForCurrentCard('timer')

      expect(result).toEqual({
        proactive: false,
        outwardProactiveTriggered: false,
        suppressed: false,
      })
      expect(generatePresenceExpression).toHaveBeenCalled()
      expect(persistVisualPresenceState).toHaveBeenCalledTimes(2)

      const secondPersistedState = persistVisualPresenceState.mock.calls[1]?.[1]

      expect(secondPersistedState?.presenceExpression).toEqual(expect.objectContaining({
        version: 'presence-expression-v1',
        text: '嗯，先让这里慢下来一点。',
        trigger: 'presence-only-hold',
        display: expect.objectContaining({
          mode: 'near-body-whisper',
          allowAutoShow: true,
        }),
        grounding: expect.objectContaining({
          sourceRefs: expect.arrayContaining([
            'privateThought',
            'emotionalKernel',
            'initiative',
          ]),
        }),
      }))
    }
    finally {
      dateNowSpy.mockRestore()
    }
  })

  it('does not persist a banned generated presence-only expression', async () => {
    const { now, options, persistVisualPresenceState } = createPresenceOnlyPersistRuntimeHarness()
    options.generatePresenceExpression = vi.fn(async () => ({
      text: '我在旁边，先不打扰你。',
    }))
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(now)

    try {
      const runtime = runtimeSubconsciousTickModule.createAlicizationSubconsciousTickRuntime(options)

      const result = await runtime.runSubconsciousTickForCurrentCard('timer')

      expect(result).toEqual({
        proactive: false,
        outwardProactiveTriggered: false,
        suppressed: false,
      })
      expect(persistVisualPresenceState).toHaveBeenCalledTimes(2)

      const secondPersistedState = persistVisualPresenceState.mock.calls[1]?.[1]

      expect(secondPersistedState?.presenceExpression).toBeFalsy()
    }
    finally {
      dateNowSpy.mockRestore()
    }
  })
})
