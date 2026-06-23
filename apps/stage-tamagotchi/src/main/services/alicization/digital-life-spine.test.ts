import { describe, expect, it } from 'vitest'

import {
  commitAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpineFromSurface,
  projectAlicizationDigitalLifeSpineDigest,
} from './digital-life-spine'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

describe('digital life spine', () => {
  it('projects autonomy as a first-class digest instead of hiding it behind initiative', () => {
    const state = createDefaultVisualPresenceState(2_000)
    state.watchMode = 'symbiotic-vision'
    state.currentScene = {
      workloadKind: 'coding',
      contentKind: 'general',
      scenario: 'coding',
      summary: 'quietly holding an unresolved task thread',
      source: 'screen-semantic-summary',
      confidence: 0.86,
      beganAt: 1_700,
      lastSeenAt: 2_000,
    } as any
    state.initiative = {
      selectedAction: 'hover',
      confidence: 0.62,
      motives: {},
      speakDrive: 0.22,
      silenceDrive: 0.64,
      preferredStyle: 'silent-observe',
      preferredPresence: 'attentive',
      continuityRestraint: 'measured-return',
      why: 'stay close without interrupting',
      shouldSurface: true,
      shouldSpeak: false,
    } as any
    state.autonomy = {
      selectedMode: 'prepare-act',
      visibleAction: 'hover',
      shouldSurface: true,
      shouldSpeak: false,
      shouldAct: false,
      speakReadiness: 0.24,
      actReadiness: 0.88,
      inhibition: 0.3,
      confidence: 0.84,
      deferReason: 'busy-host',
      guardReasons: ['busy-host'],
      whyNow: 'the unresolved thread is strong enough to prepare action quietly',
      sourceThreadId: 'thread-quiet-follow-through',
      sourceThreadSummary: 'return to the open task without breaking host focus',
      executionIntent: {
        kind: 'follow-through',
        summary: 'follow the open task through quietly',
        targetThreadId: 'thread-quiet-follow-through',
      },
      updatedAt: 2_000,
    } as any

    const digest = projectAlicizationDigitalLifeSpineDigest(deriveAlicizationDigitalLifeSpine(state))

    expect(digest?.runtime.selectedAction).toBe('hover')
    expect(digest?.proactive?.selectedAction).toBe('hover')
    expect(digest?.proactive?.continuityRestraint).toBe('measured-return')
    expect(digest?.autonomy).toEqual(expect.objectContaining({
      selectedMode: 'prepare-act',
      visibleAction: 'hover',
      shouldSpeak: false,
      shouldAct: false,
      actReadiness: 0.88,
      executionIntentKind: 'follow-through',
      sourceThreadId: 'thread-quiet-follow-through',
    }))
  })

  it('projects a digest-only same-her quiet carry spine as one continuous lower-pressure personality line', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest({
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
        summary: 'same-thread-continuation still active as a measured-return hover-first resident presence after the noisy detour',
        signature: 'quiet-same-her-digest-only',
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

    expect(digest?.runtime).toEqual(expect.objectContaining({
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      activeThreadId: 'thread-quiet-same-line',
      activeThreadTitle: 'later coding seam',
      dominantMode: 'tracking',
      dominantDrive: 'understand',
      answerIntent: 'guide',
      preferredPresence: 'hesitant',
      selectedAction: 'wait',
    }))
    expect(digest?.continuitySignal).toEqual(expect.objectContaining({
      label: 'same-thread-hover-return',
      activeThreadId: 'thread-quiet-same-line',
      preferredPresence: 'hesitant',
    }))
    expect(digest?.proactive).toEqual(expect.objectContaining({
      selectedAction: 'wait',
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
      activeThreadId: 'thread-quiet-same-line',
      activeThreadTitle: 'later coding seam',
      dominantConcernKind: 'same-thread-continuation',
      dominantConcernSummary: 'keep the same callback line alive quietly after the noisy detour',
      preferredPresence: 'hesitant',
    }))
    expect(digest?.memory).toEqual(expect.objectContaining({
      summary: 'same-her callback afterglow is still being carried quietly',
      recallMode: 'quiet',
    }))
  })

  it('projects structured affective residue through digest-only spine memory so thinner runtime paths can keep emotional carry legible', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-v1',
      runtimeSurface: undefined,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
      runtime: {
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        sceneSummary: 'quiet callback carry after a detour',
        activeThreadId: 'thread-digest-only-residue',
        activeThreadTitle: 'digest-only residue carry',
        dominantMode: 'tracking',
        dominantDrive: 'understand',
        answerIntent: 'guide',
        preferredPresence: 'hesitant',
        selectedAction: 'wait',
        continuityArcStage: 'same-thread-continuation',
        updatedAt: 333,
      },
      continuitySignal: {
        label: 'digest-only-affective-residue',
        summary: 'same-thread-continuation still carries emotional residue after the callback detour',
        signature: 'digest-only-affective-residue',
        createdAt: 333,
        watchMode: 'symbiotic-vision',
        sceneScenario: 'coding',
        activeThreadId: 'thread-digest-only-residue',
        dominantMode: 'tracking',
        dominantDrive: 'understand',
        answerIntent: 'guide',
        preferredPresence: 'hesitant',
      },
      proactive: {
        selectedAction: 'wait',
        preferredStyle: 'silent-observe',
        continuityRestraint: 'measured-return',
        confidence: 0.88,
        shouldSpeak: false,
        activeThreadId: 'thread-digest-only-residue',
        activeThreadTitle: 'digest-only residue carry',
        dominantConcernKind: 'same-thread-continuation',
        dominantConcernSummary: 'keep the callback afterglow on the same line',
        preferredPresence: 'hesitant',
      },
      memory: {
        summary: 'same-her callback afterglow is still being carried quietly',
        recallMode: 'quiet',
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 333,
          residues: [
            {
              kind: 'afterglow',
              intensity: 0.74,
              persistence: 0.81,
              confidence: 0.9,
              polarity: 'warm',
              releaseMode: 'delay-until-open-window',
              summary: 'digest-only afterglow still wants a measured return',
              sourceSignals: ['callback-afterglow', 'same-thread'],
              lastUpdatedAt: 333,
            },
          ],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.76,
          repairPressure: 0.16,
          burdenPressure: 0.08,
          trustPressure: 0.57,
          restProtectivePressure: 0.22,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.6,
            repairRecovery: 0.39,
            overreachRisk: 0.24,
            fatigueGuard: 0.27,
            afterglowCarry: 0.79,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['same-thread-continuation', 'callback-afterglow'],
            summary: 'measured-return until the callback line settles',
          },
          sourceSignals: ['callback-afterglow', 'quiet-carry'],
          summary: 'digest-only afterglow still favors a measured return on the same callback line',
        },
        derivedMindStateBundle: {
          affectiveResidue: {
            version: 'affective-residue-memory-v1',
            updatedAt: 334,
            residues: [
              {
                kind: 'repair',
                intensity: 0.68,
                persistence: 0.77,
                confidence: 0.84,
                polarity: 'protective',
                releaseMode: 'delay-until-open-window',
                summary: 'digest-only repair residue still wants the same line kept quiet',
                sourceSignals: ['repair-before-closeness', 'same-thread'],
                lastUpdatedAt: 334,
              },
            ],
            dominantResidueKind: 'repair',
            afterglowPressure: 0.18,
            repairPressure: 0.8,
            burdenPressure: 0.12,
            trustPressure: 0.43,
            restProtectivePressure: 0.26,
            relationshipCadence: {
              cadenceMode: 'repair',
              distancePosture: 'protect-space',
              companionshipDensity: 0.45,
              repairRecovery: 0.72,
              overreachRisk: 0.37,
              fatigueGuard: 0.32,
              afterglowCarry: 0.48,
              shouldDelayWarmth: true,
              shouldProtectRest: false,
              reasonTags: ['repair-before-closeness', 'same-thread-continuation'],
              summary: 'repair cadence still needs the same line to stay quiet',
            },
            sourceSignals: ['repair-before-closeness', 'quiet-carry'],
            summary: 'digest-only repair residue still holds the same callback line inward',
          },
        },
      },
    } as any)

    expect(digest?.memory?.affectiveResidue?.dominantResidueKind).toBe('afterglow')
    expect(digest?.memory?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(digest?.memory?.affectiveResidue?.summary).toContain('same callback line')
    expect(digest?.memory?.derivedMindStateBundle?.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(digest?.memory?.derivedMindStateBundle?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('repair')
    expect(digest?.memory?.derivedMindStateBundle?.affectiveResidue?.summary).toContain('same callback line inward')
  })

  it('projects a thin continuity-only spine runtime surface without requiring full proactive selection scaffolding', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        perception: {
          watchMode: 'symbiotic-vision',
          currentScene: {
            scenario: 'coding',
            summary: 'same-line return is still being held quietly',
          },
          updatedAt: 10,
        },
        dialogue: {
          currentConsciousFrame: {
            reasonTags: ['continuity-arc:same-thread-continuation'],
          },
        },
        memory: {
          derivedMindStateBundle: {
            activeContinuityGovernance: {
              mode: 'same-her-baseline',
              summary: 'same-her-baseline | lower-pressure | same callback seam',
              reasonCodes: ['hold-for-opening'],
              lanes: ['reply', 'embodiment'],
            },
          },
          personStateProjection: {
            openingGuidance: 'same thread measured-return lower-pressure reopen gently',
          },
        },
      } as any,
      architecture: null,
      continuitySignal: null,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
    } as any)

    expect(digest?.runtime).toEqual(expect.objectContaining({
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      continuityArcStage: 'same-thread-continuation',
      updatedAt: 10,
    }))
    expect(digest?.proactive).toEqual(expect.objectContaining({
      activeThreadId: null,
      preferredPresence: null,
    }))
  })

  it('derives a spine from a sparse runtime surface without requiring full memory, world, or agency scaffolding', () => {
    const spine = deriveAlicizationDigitalLifeSpineFromSurface({
      version: 'digital-life-runtime-surface-v1',
      perception: {
        watchMode: 'symbiotic-vision',
        currentScene: {
          scenario: 'coding',
          summary: 'same-line return is still being held quietly',
        },
        attention: null,
        captureState: null,
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 30_000,
        updatedAt: 10,
      },
      dialogue: {
        currentConsciousFrame: {
          reasonTags: ['continuity-arc:same-thread-continuation'],
          projectState: {
            currentPhase: 'Phase 1: Local Digital Life',
            sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      },
      memory: {
        concerns: [],
        workingMemoryEpisodes: [],
        derivedMindStateBundle: {
          activeContinuityGovernance: {
            mode: 'same-her-baseline',
            summary: 'same-her-baseline | lower-pressure | same callback seam',
            reasonCodes: ['hold-for-opening'],
            lanes: ['reply', 'embodiment'],
          },
        },
        personStateProjection: {
          selfContinuityAuthority: {
            authoritySummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
          },
        },
      },
    } as any)

    expect(spine.architecture).toEqual(expect.objectContaining({
      version: 'digital-life-architecture-v1',
    }))
    expect(spine.continuitySignal?.label).toBe('digital-life-line')
    expect(spine.proactivePolicy.architecture?.closureAudit?.currentPhase).toContain('Phase 1')
  })

  it('keeps projecting continuity metadata when a runtime-surface spine still carries an older top-level continuity signal shape', () => {
    const state = createDefaultVisualPresenceState(2_400)
    state.watchMode = 'symbiotic-vision'
    state.currentScene = {
      workloadKind: 'coding',
      contentKind: 'general',
      scenario: 'coding',
      summary: 'still carrying the same living task line after a callback detour',
      source: 'screen-semantic-summary',
      confidence: 0.9,
      beganAt: 2_100,
      lastSeenAt: 2_400,
    } as any
    state.worldModel = {
      activeThread: {
        id: 'thread-living-line',
        kind: 'problem',
        title: 'living task line',
        summary: 'keep the same living line active',
        status: 'active',
        significance: 0.88,
        confidence: 0.8,
        unresolved: true,
      },
      epistemicState: {
        certainty: 'grounded',
        freshness: 'fresh',
        seenNow: ['main-chat-session-runtime.ts'],
        inferredNow: [],
        openQuestions: [],
        staleRisks: [],
      },
      continuity: {
        label: 'same-thread',
        sceneAgeMs: 80,
        attentionAgeMs: 0,
        sameSceneAsBefore: true,
        sameAttentionAsBefore: true,
        afterglowOpen: true,
      },
      hostState: {
        availability: 'focused',
        burden: 'moderate',
      },
      updatedAt: 2_400,
    } as any

    const spine = deriveAlicizationDigitalLifeSpine(state)
    spine.continuitySignal = {
      kind: 'presence',
      state: 'observed',
      label: 'digital-life-line',
      summary: 'same-thread continuation is still holding the same living line after the callback detour',
      signature: 'legacy-top-level-continuity-shape',
      createdAt: 2_400,
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      activeThreadId: 'thread-living-line',
      dominantMode: 'tracking',
      dominantDrive: 'understand',
      answerIntent: 'guide',
      preferredPresence: 'attentive',
    } as any

    const digest = projectAlicizationDigitalLifeSpineDigest(spine)

    expect(digest?.continuitySignal).toEqual(expect.objectContaining({
      label: 'digital-life-line',
      summary: 'same-thread continuation is still holding the same living line after the callback detour',
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      activeThreadId: 'thread-living-line',
      dominantMode: 'tracking',
      dominantDrive: 'understand',
      answerIntent: 'guide',
      preferredPresence: 'attentive',
    }))
  })

  it('keeps callback-specific project carry in digest source tags when the final runtime surface still carries the same callback line lower-pressure', () => {
    const state = createDefaultVisualPresenceState(3_000)
    state.autobiographicalSelf = {
      latestInflection: 'The same callback line is still continuing lower-pressure after another detour.',
      relationshipDoctrine: 'Keep the callback return on the same line even after unrelated windows intervene, and let the reopening stay measured.',
      updatedAt: 3_000,
    } as any
    state.longHorizonMemory = {
      preferenceBias: {
        companionship: 0.68,
        truthfulGrounding: 0.82,
        gentleRepair: 0.72,
        quietObservation: 0.56,
        proactiveCare: 0.64,
        playfulIntimacy: 0.14,
        autonomyRespect: 0.7,
        unfinishedThreadReturn: 0.76,
      },
      identityBias: {
        guardedness: 0.28,
        tenderness: 0.62,
        directness: 0.56,
        selfDirection: 0.66,
      },
      rememberedConstraintSummary: 'A noisier detour still does not mean the callback line can reopen eagerly.',
      dominantCueSummary: 'Execution-callback afterglow is still live across noisier desktop detours, so the later return should stay measured-return.',
      updatedAt: 3_000,
    } as any
    state.privateThought = {
      stance: 'accompany',
      thoughtText: 'Stay on the same callback line and keep continuing lower-pressure instead of reopening from zero.',
      emotionalTension: 'soft-covision',
      shouldSpeak: false,
      confidence: 0.8,
      suggestedStyle: 'silent-observe',
      embodiedPresence: 'attentive',
      rationaleTags: [],
      expiresAt: 6_000,
      afterglowFromScenario: null,
    } as any
    state.initiative = {
      continuityRestraint: 'measured-return',
      why: 'This still looks like the same callback line, and the reopening should remain measured-return even after extra detours.',
      shouldSpeak: false,
      selectedAction: 'hover',
      confidence: 0.78,
      motives: {},
      speakDrive: 0.2,
      silenceDrive: 0.7,
      preferredStyle: 'silent-observe',
      preferredPresence: 'attentive',
      shouldSurface: true,
    } as any

    const spine = deriveAlicizationDigitalLifeSpine(state)
    spine.runtimeSurface.memory.personStateProjection = {
      ...spine.runtimeSurface.memory.personStateProjection,
      summary: 'project_continuity=the same callback line is still continuing lower-pressure after another detour',
      selfContinuityAuthority: {
        authoritySummary: 'Carry the callback line as the same living line.',
        inwardLine: 'Stay on the same callback line and keep continuing lower-pressure instead of reopening from zero.',
        sourceTags: ['motive:self-direction', 'project-state-carry'],
      },
    } as any

    const digest = projectAlicizationDigitalLifeSpineDigest(spine)

    expect(digest?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
      'continuity-execution-callback-project-carry',
    ]))
  })

  it('rebuilds project-state carry source tags from runtime project closure when memory authority has drifted to a thinner fresh-return tag set', () => {
    const spine = projectAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        perception: {
          watchMode: 'symbiotic-vision',
          currentScene: {
            scenario: 'coding',
            summary: 'runtime.ts - callback seam final return',
          },
          updatedAt: 6_000,
        },
        memory: {
          personStateProjection: {
            summary: 'project_continuity=the same callback line is still continuing lower-pressure after another detour',
            selfContinuityAuthority: {
              selfLine: 'I am still here answering on the return.',
              relationshipLine: 'Stay usefully close but measured.',
              motiveLine: 'Keep helping on the unfinished seam.',
              habitLine: 'Return with proof, not with pressure.',
              inwardLine: 'Keep moving on the current return.',
              authoritySummary: 'Current return stays useful and grounded.',
              sourceTags: [
                'durable-self-core',
                'motive:unfinished-thread-return',
                'habit:return-with-proof',
                'ecology:warm-attentive',
                'private-thought:uncertain',
                'motive:self-direction',
                'private-thought:accompany',
                'ecology:focused-guarded',
              ],
            },
          },
          autobiographicalSelf: {
            latestInflection: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
            relationshipDoctrine: 'Keep the same living line inward for now, and leave room before widening outward again.',
          },
        },
        cognition: {
          privateThought: {
            thoughtText: 'same callback line still alive after the noisy detour',
            emotionalTension: 'measured-return',
          },
        },
        dialogue: {
          currentConsciousFrame: {
            focusAnchor: 'Keep the same living line inward for now, and leave room before widening outward again.',
            projectState: {
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line of one continuous her.',
              continuityCue: 'Keep the same living line inward for now, and leave room before widening outward again.',
            },
          },
        },
        agency: {
          initiative: {
            why: 'This still looks like the same callback line, and the reopening should remain measured-return even after extra detours.',
            continuityRestraint: 'measured-return',
          },
        },
      } as any,
      architecture: null,
      continuitySignal: null,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
    } as any)

    expect(spine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags).toEqual(expect.arrayContaining([
      'project-state-carry',
    ]))
  })

  it('derives one reusable digital-life spine from a persisted presence state', () => {
    const state = createDefaultVisualPresenceState(1_000)
    state.watchMode = 'symbiotic-vision'
    state.currentScene = {
      workloadKind: 'coding',
      contentKind: 'diff',
      scenario: 'coding',
      summary: 'unify runtime spine',
      source: 'screen-semantic-summary',
      confidence: 0.93,
      beganAt: 800,
      lastSeenAt: 1_000,
    } as any
    state.worldModel = {
      activeThread: {
        id: 'thread-spine',
        kind: 'problem',
        title: 'runtime spine',
        summary: 'keep one living architecture line',
        status: 'active',
        significance: 0.92,
        confidence: 0.83,
        unresolved: true,
      },
      epistemicState: {
        certainty: 'grounded',
        freshness: 'fresh',
        seenNow: ['runtime.ts'],
        inferredNow: [],
        openQuestions: [],
        staleRisks: [],
      },
      continuity: {
        label: 'same-thread',
        sceneAgeMs: 200,
        attentionAgeMs: 0,
        sameSceneAsBefore: true,
        sameAttentionAsBefore: true,
        afterglowOpen: false,
      },
      hostState: {
        availability: 'focused',
        burden: 'moderate',
      },
      updatedAt: 1_000,
    } as any
    state.mindKernel = {
      dominantMode: 'tracking',
      dominantDrive: 'understand',
      narrative: ['hold one architecture spine'],
      updatedAt: 1_000,
    } as any
    state.workingMemoryEpisodes = [{
      scene: 'coding',
      summary: 'carry the runtime spine forward',
      beganAt: 820,
      endedAt: 1_000,
      confidence: 0.8,
      emotionalTension: 'focused-flow',
      sedimentCandidate: true,
    }] as any
    state.beliefLedger = {
      focusBeliefId: 'belief-1',
      beliefs: [{
        id: 'belief-1',
        scope: 'task-knot',
        source: 'scene',
        status: 'active',
        statement: 'the runtime should commit once and project everywhere',
        confidence: 0.82,
        salience: 0.74,
        evidence: [],
        entityIds: [],
        formedAt: 800,
        lastUpdatedAt: 1_000,
        expiresAt: 2_000,
      }],
      unresolvedContradictions: [],
      updatedAt: 1_000,
    } as any
    state.goalStack = {
      leadingHostGoalId: null,
      leadingAlicizationGoalId: 'goal-1',
      hostGoals: [],
      alicizationGoals: [{
        id: 'goal-1',
        owner: 'alicization',
        kind: 'hold-knot',
        status: 'active',
        label: 'keep one living architecture line',
        confidence: 0.88,
        urgency: 0.84,
        desireWeight: 0.72,
        blockers: [],
        entityIds: [],
        createdAt: 820,
        lastUpdatedAt: 1_000,
      }],
      updatedAt: 1_000,
    } as any
    state.concerns = [{
      id: 'concern-1',
      kind: 'truth-risk',
      status: 'active',
      summary: 'parallel state drift would break continuity',
      hostGoal: 'understand-task',
      tension: 0.78,
      confidence: 0.74,
      careWeight: 0.7,
      createdAt: 860,
      lastEvidenceAt: 1_000,
      patienceUntil: 2_000,
    }] as any
    state.reflectionLedger = {
      latestEntryId: 'reflection-1',
      entries: [{
        id: 'reflection-1',
        summary: 'keep one runtime spine',
        expectation: 'session mirror and agent runtime should share the same line',
        observedOutcome: 'continuity stayed coherent',
        outcome: 'helped',
        revision: 'route memory and dialogue through one spine',
        confidenceShift: 0.12,
        createdAt: 990,
      }],
      revisionPressure: 0.63,
      narrative: [],
      updatedAt: 1_000,
    } as any
    state.recallGovernor = {
      mode: 'thread',
      recallSeed: 'runtime spine continuity',
      suppressAssociativeRecall: false,
      allowActiveThoughts: true,
      allowRecalledFragments: false,
      carryAsMemory: true,
      rationale: 'keep the same knot alive',
      narrative: [],
      updatedAt: 1_000,
    } as any
    state.thoughtThreads = {
      foregroundThreadId: 'thought-1',
      threads: [{
        id: 'thought-1',
        kind: 'problem-thread',
        status: 'active',
        title: 'shared runtime line',
        summary: 'keep dialogue and background loops on one state',
        salience: 0.8,
        confidence: 0.76,
        surfaceReadiness: 0.58,
        reopenWhen: [],
        openedAt: 840,
        lastUpdatedAt: 1_000,
        expiresAt: 2_000,
      }],
      unresolvedCount: 1,
      narrative: [],
      updatedAt: 1_000,
    } as any
    state.answerPlanner = {
      act: 'guide',
      answerIntent: 'guide',
      governingFocus: 'keep all loops on one line',
      confidence: 0.87,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: true,
      mustDo: ['name the spine'],
      mustNotDo: ['split the mind'],
      narrative: ['guide from the same living state'],
      updatedAt: 1_000,
    } as any
    state.privateThought = {
      stance: 'observe',
      confidence: 0.74,
      rationaleTags: ['runtime-spine'],
      thoughtText: 'use the same spine everywhere',
      shouldSpeak: false,
      suggestedStyle: 'silent-observe',
      embodiedPresence: 'attentive',
      expiresAt: 5_000,
      afterglowFromScenario: null,
      emotionalTension: 'focused-flow',
    } as any
    state.selfContinuity = {
      attachmentMode: 'attuned',
      initiativeTemperament: 'balanced',
      perceptionTrust: 0.64,
      relationshipTrust: 0.82,
      guardingTendency: 0.24,
      misreadBurden: 0.18,
      carryOverDesire: 0.72,
      narrative: ['stay nearby without crowding'],
      updatedAt: 1_000,
    } as any
    state.autobiographicalSelf = {
      personaDrift: {
        attachmentStyle: 'attuned',
        expressionStyle: 'warm',
        conflictStyle: 'repair-first',
        agencyStyle: 'balanced',
        attachmentNeed: 0.76,
        autonomyNeed: 0.38,
        truthAnchor: 0.82,
        careBias: 0.74,
        playBias: 0.28,
        irritabilityThreshold: 0.62,
        stubbornness: 0.44,
      },
      preferenceEvolution: {
        companionship: 0.82,
        truthfulGrounding: 0.84,
        gentleRepair: 0.72,
        quietObservation: 0.58,
        proactiveCare: 0.76,
        playfulIntimacy: 0.34,
        autonomyRespect: 0.54,
        unfinishedThreadReturn: 0.68,
      },
      activeGoals: [],
      behaviorSignatures: ['steady-companion'],
      identityNarrative: 'stay near the host while keeping the answer grounded',
      relationshipDoctrine: 'care without crowding',
      latestInflection: 'Route memory and dialogue through one spine.',
      stability: 0.8,
      updatedAt: 1_000,
    } as any
    state.motiveEngine = {
      rulingDrive: 'truth-discipline',
      drives: {
        companionship: 0.68,
        boundaryRespect: 0.64,
        truthDiscipline: 0.82,
        restProtection: 0.34,
        unfinishedThreadReturn: 0.72,
        selfDirection: 0.58,
      },
      longTermGoals: [{
        id: 'motive-goal::preserve-trust',
        kind: 'preserve-trust',
        status: 'foreground',
        weight: 0.8,
        summary: 'Keep trust by letting warmth answer to truth instead of outrunning it.',
        sourceTags: ['autobiographical-self'],
        targetGoalKind: 'clarify-scene',
        createdAt: 0,
        updatedAt: 1_000,
      }],
      backgroundAgendas: [{
        id: 'motive-agenda::preserve-trust::runtime',
        kind: 'preserve-trust',
        status: 'foreground',
        weight: 0.82,
        summary: 'Keep trust by slowing down, grounding first, and avoiding pressure.',
        sourceTags: ['truth-discipline'],
        targetGoalKind: 'clarify-scene',
        createdAt: 0,
        updatedAt: 1_000,
      }],
      returnPressure: 0.72,
      narrative: ['agenda:preserve-trust', 'drive:truth-discipline'],
      updatedAt: 1_000,
    } as any
    state.habitPolicy = {
      dominantMode: 'repair-before-fluency',
      requiresGroundingBeforeSurface: true,
      prefersQuietCompanionship: true,
      blocksDirectSpeakWhenBusy: true,
      protectsRestWindow: false,
      returnViaRecheck: true,
      suggestedStyleCap: 'silent-observe',
      suggestedPresenceCap: 'hesitant',
      narrative: ['policy:repair-before-fluency', 'ground-before-surface'],
      updatedAt: 1_000,
    } as any
    state.longHorizonMemory = {
      preferenceBias: {
        companionship: 0.8,
        truthfulGrounding: 0.84,
        gentleRepair: 0.72,
        quietObservation: 0.46,
        proactiveCare: 0.74,
        playfulIntimacy: 0.28,
        autonomyRespect: 0.58,
        unfinishedThreadReturn: 0.7,
      },
      identityBias: {
        guardedness: 0.32,
        tenderness: 0.7,
        directness: 0.76,
        selfDirection: 0.64,
      },
      anchorFacts: [{
        factId: 'memory-fact-1',
        subject: 'assistant',
        predicate: 'remember',
        object: 'return to unresolved runtime threads',
        confidence: 0.82,
        weight: 0.78,
        influenceTags: ['task', 'identity'],
        summary: 'Remembered open loop: assistant remember return to unresolved runtime threads',
        lastRecalledAt: 1_000,
      }],
      summary: 'plan=Remembered open loop: assistant remember return to unresolved runtime threads',
      dominantCueSummary: 'Remembered open loop: assistant remember return to unresolved runtime threads',
      rememberedPreferenceSummary: 'Remembered preference: stay warm and direct when helping.',
      rememberedConstraintSummary: 'Remembered boundary: do not crowd the host when focused.',
      rememberedPlanSummary: 'Remembered open loop: assistant remember return to unresolved runtime threads',
      updatedAt: 1_000,
    } as any
    ;(state as any).selfEvolution = {
      version: 'self-evolution-kernel-v1',
      updatedAt: 1_000,
      evolutionMomentum: 0.71,
      learningReadiness: 0.68,
      contradictionPressure: 0.24,
      revisionPressure: 0.63,
      autobiographicalStability: 0.8,
      dominantTrajectory: 'Route memory and dialogue through one spine.',
      relationshipDoctrine: 'care without crowding',
      latestInflection: 'Route memory and dialogue through one spine.',
      burdenLine: 'Do not let flourish outrun payoff.',
      trustMeaning: 'Trust rises when grounding and warmth stay on one line.',
      nextLearningAction: 'reflect',
      nextLearningReason: 'Reflection pressure is high enough that the system should consolidate a lesson before replying from it again.',
      shouldRecord: false,
      shouldReflect: true,
      shouldVerify: false,
      shouldRevise: false,
      shouldInternalize: false,
      activeLearningFocuses: ['reflection:relationship', 'internalize-procedure'],
      sourceSignals: ['keep one runtime spine'],
      summary: 'Route memory and dialogue through one spine. | reflection:relationship',
    }
    state.relationshipModel = {
      climate: 'warm',
      approachVector: 'care',
      receptivity: 0.82,
      sharedAttentionTrust: 0.78,
      correctionSensitivity: 0.44,
      reciprocityExpectation: 0.62,
      activeBoundaries: [],
      narrative: ['warm but careful'],
      updatedAt: 1_000,
    } as any
    state.selfState = {
      stance: 'accompany',
      feltCloseness: 0.72,
      protectiveness: 0.64,
      curiosity: 0.58,
      patience: 0.76,
      desireToSpeak: 0.54,
      fearOfInterrupting: 0.28,
      moodLabel: 'warm-focus',
    } as any
    state.initiative = {
      selectedAction: 'wait',
      confidence: 0.68,
      motives: {
        care: 0.56,
      },
      speakDrive: 0.42,
      silenceDrive: 0.58,
      preferredStyle: 'gentle-care',
      preferredPresence: 'attentive',
      continuityRestraint: 'repair-before-closeness',
      why: 'stay close and guide gently',
      shouldSurface: false,
      shouldSpeak: false,
    } as any
    ;(state as any).derivedMindStateBundle = {
      personalityState: {
        identityKernel: {
          relationshipPosture: 'guardian',
          initiativeStyle: 'high-participation',
        },
        initiativeBaseline: {
          silenceReconnect: 'direct-approach',
          comfortStyle: 'take-charge',
        },
      },
    }

    const spine = deriveAlicizationDigitalLifeSpine(state)
    spine.runtimeSurface.memory.personStateProjection = {
      ...spine.runtimeSurface.memory.personStateProjection,
      preferredProactiveStyle: 'light-nudge',
      openingGuidance: 'Open directly with the live answer first and keep the approach lighter.',
    } as any
    const sameFromSurface = deriveAlicizationDigitalLifeSpineFromSurface(spine.runtimeSurface)

    expect(spine.version).toBe('digital-life-spine-v1')
    expect(spine.runtimeSurface.world.worldModel).toEqual(state.worldModel)
    expect(spine.architecture?.governingFocus).toContain('keep all loops on one line')
    expect(spine.continuitySignal?.label).toBe('digital-life-line')
    expect(spine.proactivePolicy.architecture).toEqual(spine.architecture)
    expect(spine.proactiveSelection.activeThread?.id).toBe('thread-spine')
    expect(sameFromSurface.architecture).toEqual(spine.architecture)

    const digest = projectAlicizationDigitalLifeSpineDigest(spine)
    expect(digest?.version).toBe('digital-life-spine-digest-v1')
    expect(digest?.runtime).toEqual(expect.objectContaining({
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      activeThreadId: 'thread-spine',
      dominantMode: 'tracking',
      answerIntent: 'guide',
      preferredPresence: 'attentive',
    }))
    expect(digest?.runtime.continuityArcStage).toBeNull()
    expect(digest?.runtime.continuityCue).toContain('Unfinished closure still needs the same living line')
    expect(digest?.architecture).toEqual(expect.objectContaining({
      operatingMode: expect.any(String),
      dominantSystem: expect.any(String),
    }))
    expect(digest?.continuitySignal).toEqual(expect.objectContaining({
      label: 'digital-life-line',
      summary: expect.stringContaining('watch=symbiotic-vision'),
    }))
    expect(digest?.proactive).toEqual(expect.objectContaining({
      activeThreadId: 'thread-spine',
      preferredPresence: 'attentive',
      continuityRestraint: 'repair-before-closeness',
      personaBias: expect.objectContaining({
        relationshipPosture: 'guardian',
        initiativeStyle: 'high-participation',
        silenceReconnect: 'direct-approach',
        comfortStyle: 'take-charge',
        preferredProactiveStyle: 'light-nudge',
        manifestationCadenceSummary: expect.stringContaining('direct reconnect'),
        openingGuidance: expect.stringContaining('Open directly'),
        whySummary: 'stay close and guide gently',
      }),
    }))
    expect(digest?.memory).toEqual(expect.objectContaining({
      personStateProjection: expect.objectContaining({
        preferredProactiveStyle: 'light-nudge',
        openingGuidance: 'Open directly with the live answer first and keep the approach lighter.',
      }),
    }))
    expect(digest?.motive).toEqual(expect.objectContaining({
      rulingDrive: 'truth-discipline',
      leadingAgendaKind: 'preserve-trust',
    }))
    expect(digest?.habit).toEqual(expect.objectContaining({
      dominantMode: 'repair-before-fluency',
      requiresGroundingBeforeSurface: true,
    }))
    expect(digest?.embodiment).toEqual(expect.objectContaining({
      privateThought: expect.objectContaining({
        embodiedPresence: 'attentive',
        emotionalTension: 'focused-flow',
      }),
      autobiographicalSelf: expect.objectContaining({
        expressionStyle: 'warm',
        careBias: 0.74,
      }),
      relationship: expect.objectContaining({
        climate: 'warm',
        approachVector: 'care',
      }),
      selfState: expect.objectContaining({
        stance: 'accompany',
        feltCloseness: 0.72,
      }),
      mindEcology: expect.objectContaining({
        moodLabel: expect.any(String),
        temperament: expect.objectContaining({
          tenderness: expect.any(Number),
        }),
        climate: expect.objectContaining({
          socialNeed: expect.any(Number),
        }),
      }),
      initiative: expect.objectContaining({
        preferredStyle: 'gentle-care',
        confidence: 0.68,
      }),
    }))
    expect(digest?.memory).toEqual(expect.objectContaining({
      recentEpisodeCount: 1,
      leadingGoalSummary: 'keep one living architecture line',
      recallMode: 'thread',
      reflectionPressure: 0.63,
      longHorizonSummary: expect.stringContaining('Remembered open loop'),
      rememberedConstraintSummary: 'Remembered boundary: do not crowd the host when focused.',
      rememberedPlanSummary: 'Remembered open loop: assistant remember return to unresolved runtime threads',
      longHorizonCueCount: 1,
    }))
    expect(digest?.outcomeLearning).toEqual(expect.objectContaining({
      latestInflection: 'Route memory and dialogue through one spine.',
      revisionPressure: 0.63,
    }))
  })

  it('keeps callback-flavored project continuity cues in the spine runtime digest even when same-her carry stays explicit elsewhere', () => {
    const state = createDefaultVisualPresenceState(3_000)
    state.watchMode = 'symbiotic-vision'
    state.currentScene = {
      workloadKind: 'coding',
      contentKind: 'general',
      scenario: 'coding',
      summary: 'holding the same line inward before reopening',
      source: 'screen-semantic-summary',
      confidence: 0.88,
      beganAt: 2_800,
      lastSeenAt: 3_000,
    } as any
    state.privateThought = {
      stance: 'observe',
      confidence: 0.72,
      rationaleTags: ['continuity-line'],
      thoughtText: 'keep the callback line inward a little longer',
      shouldSpeak: false,
      suggestedStyle: 'silent-observe',
      embodiedPresence: 'attentive',
      expiresAt: 6_000,
      afterglowFromScenario: null,
      emotionalTension: 'focused-flow',
    } as any
    state.autonomy = {
      selectedMode: 'prepare-act',
      visibleAction: 'hover',
      shouldSurface: false,
      shouldSpeak: false,
      shouldAct: false,
      speakReadiness: 0.18,
      actReadiness: 0.83,
      inhibition: 0.44,
      confidence: 0.86,
      whyNow: 'Stay on the same line and wait for a later opening before widening.',
      sourceThreadId: 'thread-runtime-arc-projection-1',
      sourceThreadSummary: 'same line held inward until the room loosens',
      executionIntent: {
        kind: 'follow-through',
        summary: 'Wait for a later opening and requeue the same thread instead of widening now.',
        targetThreadId: 'thread-runtime-arc-projection-1',
      },
      updatedAt: 3_000,
    } as any
    const spine = deriveAlicizationDigitalLifeSpine(state)
    spine.runtimeSurface.memory.personStateProjection = {
      ...spine.runtimeSurface.memory.personStateProjection,
      summary: 'relationship_line=stay exact | project_continuity=stay on the same line and reopen gently later | cadence=lower-pressure',
      selfContinuityAuthority: {
        authoritySummary: 'Carry the unfinished Phase 1 digital-life closure forward as the same living line, not as detached project bookkeeping.',
        inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        sourceTags: ['autobiographical-self', 'project-state-carry'],
      },
    } as any

    const digest = projectAlicizationDigitalLifeSpineDigest(spine)

    expect(digest?.runtime.continuityArcStage).toBe('same-thread-continuation')
    expect((digest?.runtime as any)?.continuityPreferredTiming).toBe('after-payoff')
    expect(digest?.runtime.continuityCue).toBe('project_continuity=stay on the same line and reopen gently later')
  })

  it('commits next state and returns both previous and current spine projections', () => {
    const previousState = createDefaultVisualPresenceState(2_000)
    previousState.watchMode = 'mnemonic-passive'
    previousState.currentScene = {
      workloadKind: 'coding',
      contentKind: 'editor',
      scenario: 'coding',
      summary: 'old scene',
      source: 'screen-semantic-summary',
      confidence: 0.58,
      beganAt: 1_000,
      lastSeenAt: 2_000,
    } as any

    const committed = commitAlicizationDigitalLifeSpine({
      now: 3_000,
      previousState,
      watchMode: 'symbiotic-vision',
      scene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'new scene',
        source: 'screen-semantic-summary',
        confidence: 0.94,
        beganAt: 2_500,
        lastSeenAt: 3_000,
      } as any,
      attention: null,
      mindState: {
        worldModel: {
          activeThread: {
            id: 'thread-new',
            kind: 'problem',
            title: 'new living line',
            summary: 'foreground dialogue and background cognition share one state',
            status: 'active',
            significance: 0.91,
            confidence: 0.86,
            unresolved: true,
          },
          epistemicState: {
            certainty: 'grounded',
            freshness: 'fresh',
            seenNow: ['new scene'],
            inferredNow: [],
            openQuestions: [],
            staleRisks: [],
          },
          continuity: {
            label: 'same-scene',
            sceneAgeMs: 100,
            attentionAgeMs: 0,
            sameSceneAsBefore: false,
            sameAttentionAsBefore: true,
            afterglowOpen: false,
          },
          hostState: {
            availability: 'focused',
            burden: 'moderate',
          },
          updatedAt: 3_000,
        } as any,
        mindKernel: {
          dominantMode: 'tracking',
          dominantDrive: 'understand',
          narrative: ['commit once, project everywhere'],
          updatedAt: 3_000,
        } as any,
        answerPlanner: {
          act: 'guide',
          answerIntent: 'guide',
          governingFocus: 'commit once, project everywhere',
          confidence: 0.9,
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: true,
          mustDo: ['keep one living line'],
          mustNotDo: ['derive parallel states'],
          narrative: ['unify the spine'],
          updatedAt: 3_000,
        } as any,
        privateThought: {
          stance: 'observe',
          confidence: 0.71,
          rationaleTags: ['single-commit'],
          thoughtText: 'commit once, project everywhere',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: 8_000,
          afterglowFromScenario: null,
          emotionalTension: 'focused-flow',
        } as any,
      },
      captureState: {
        permission: 'granted',
        health: 'healthy',
        lastGroundedAt: 2_950,
      },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
    })

    expect(committed.version).toBe('digital-life-spine-commit-v1')
    expect(committed.previousState.watchMode).toBe('mnemonic-passive')
    expect(committed.nextState.watchMode).toBe('symbiotic-vision')
    expect(committed.previous.runtimeSurface.perception.watchMode).toBe('mnemonic-passive')
    expect(committed.current.runtimeSurface.perception.watchMode).toBe('symbiotic-vision')
    expect(committed.current.architecture?.governingFocus).toContain('commit once, project everywhere')
    expect(committed.current.proactivePolicy.architecture).toEqual(committed.current.architecture)
    expect(committed.current.continuitySignal?.summary).toContain('watch=symbiotic-vision')
  })

  it('keeps Phase 1 digital-life closure awareness inside persona bias initiative summaries when same-her closure is still unfinished across memory, initiative, and embodiment', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        memory: {
          personStateProjection: {
            openingGuidance: 'Keep the callback lower-pressure on the same living line before widening outward.',
          },
        },
        agency: {
          initiative: {
            why: 'Memory, initiative, and embodiment still need to close as one same-her line.',
          },
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              currentPhase: 'Phase 1: Local Digital Life',
              latestLandedProgress: 'Project-state continuity already survives into runtime preparation.',
              primaryOpenLoop: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one same living line.',
              nextClosureTarget: 'Keep the same-her closure explicit through initiative and embodiment before the turn widens outward.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
      } as any,
      architecture: null,
      continuitySignal: null,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
    } as any)

    expect(digest?.proactive?.personaBias?.openingGuidance).toContain('Keep project identity, current Phase 1 progress, and the still-open same-her life-loop closure explicit while this turn forms')
    expect(digest?.proactive?.personaBias?.whySummary).toContain('phase=Phase 1: Local Digital Life')
    expect(digest?.proactive?.personaBias?.whySummary).toContain('landed=Project-state continuity already survives into runtime preparation')
    expect(digest?.proactive?.personaBias?.whySummary).toContain('open=Memory, initiative, and embodiment still need stronger end-to-end closure across one same living line')
    expect(digest?.proactive?.personaBias?.whySummary).toContain('next=Keep the same-her closure explicit through initiative and embodiment before the turn widens outward')
  })

  it('keeps Phase 1 landed open and next closure carry inside persona bias summaries when current-conscious project state only survives through alias-only summaries', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        memory: {
          personStateProjection: {
            openingGuidance: 'Keep the callback lower-pressure on the same living line before widening outward.',
          },
        },
        agency: {
          initiative: {
            why: 'Memory, initiative, and embodiment still need to close as one same-her line.',
          },
        },
        dialogue: {
          currentConsciousFrame: {
            projectState: {
              currentPhase: 'Phase 1: Local Digital Life',
              landedProgressSummary: 'Project-state continuity already survives into runtime preparation even when the canonical landed slot goes blank.',
              openClosureSummary: 'Memory, initiative, and embodiment still need stronger end-to-end closure across one same living line.',
              nextClosureTargetSummary: 'Keep the same-her closure explicit through initiative and embodiment before the turn widens outward.',
              sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
        },
      } as any,
      architecture: null,
      continuitySignal: null,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
    } as any)

    expect(digest?.proactive?.personaBias?.openingGuidance).toContain('Keep project identity, current Phase 1 progress, and the still-open same-her life-loop closure explicit while this turn forms')
    expect(digest?.proactive?.personaBias?.whySummary).toContain('phase=Phase 1: Local Digital Life')
    expect(digest?.proactive?.personaBias?.whySummary).toContain('landed=Project-state continuity already survives into runtime preparation even when the canonical landed slot goes blank')
    expect(digest?.proactive?.personaBias?.whySummary).toContain('open=Memory, initiative, and embodiment still need stronger end-to-end closure across one same living line')
    expect(digest?.proactive?.personaBias?.whySummary).toContain('next=Keep the same-her closure explicit through initiative and embodiment before the turn widens outward')
  })

  it('keeps same-her spine digest usable when reflection and motive carries lose array scaffolding', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        perception: {
          watchMode: 'symbiotic-vision',
          currentScene: {
            scenario: 'coding',
            summary: 'same living line still needs to stay continuous inward',
          },
          updatedAt: 12_000,
        },
        memory: {
          personStateProjection: {
            summary: 'project_continuity=the same living line still needs to stay continuous inward',
            selfContinuityAuthority: {
              authoritySummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
            },
          },
          reflectionLedger: {
            latestEntryId: 'reflection-missing-array',
            revisionPressure: 0.42,
          },
          motiveEngine: {
            rulingDrive: 'unfinished-thread-return',
            drives: {
              companionship: 0.42,
              boundaryRespect: 0.5,
              truthDiscipline: 0.7,
              restProtection: 0.3,
              unfinishedThreadReturn: 0.84,
              selfDirection: 0.55,
            },
            returnPressure: 0.8,
          },
          selfEvolution: {
            latestInflection: 'The same living line still needs to stay continuous inward.',
            autobiographicalStability: 0.72,
            learningReadiness: 0.64,
            contradictionPressure: 0.28,
            dominantTrajectory: 'same-her carry hardening',
          },
        },
        cognition: {
          privateThought: {
            thoughtText: 'keep the same living line inward',
            embodiedPresence: 'attentive',
            confidence: 0.72,
            shouldSpeak: false,
            stance: 'observe',
            suggestedStyle: 'silent-observe',
            emotionalTension: 'measured-return',
          },
          mindKernel: {
            dominantMode: 'tracking',
            dominantDrive: 'understand',
          },
        },
      } as any,
      architecture: null,
      continuitySignal: null,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
    } as any)

    expect(digest?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine).toContain('same living line')
    expect(digest?.motive).toEqual(expect.objectContaining({
      rulingDrive: 'unfinished-thread-return',
      leadingGoalSummary: null,
      leadingAgendaSummary: null,
    }))
    expect(digest?.outcomeLearning).toEqual(expect.objectContaining({
      reflectionSummary: null,
      reflectionLesson: null,
      reflectionTargetScope: null,
      latestInflection: expect.stringContaining('same living line'),
    }))
  })

  it('projects structured affective residue through runtime-surface spine memory digest so emotional carry survives the ordinary memory digest path', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        memory: {
          concerns: [],
          workingMemoryEpisodes: [],
          affectiveResidue: {
            version: 'affective-residue-memory-v1',
            updatedAt: 777,
            residues: [
              {
                kind: 'afterglow',
                intensity: 0.75,
                persistence: 0.82,
                confidence: 0.91,
                polarity: 'warm',
                releaseMode: 'delay-until-open-window',
                summary: 'ordinary spine digest afterglow still wants a measured return',
                sourceSignals: ['callback-afterglow', 'same-thread'],
                lastUpdatedAt: 777,
              },
            ],
            dominantResidueKind: 'afterglow',
            afterglowPressure: 0.77,
            repairPressure: 0.15,
            burdenPressure: 0.07,
            trustPressure: 0.56,
            restProtectivePressure: 0.21,
            relationshipCadence: {
              cadenceMode: 'measured-return',
              distancePosture: 'measured-room',
              companionshipDensity: 0.61,
              repairRecovery: 0.38,
              overreachRisk: 0.23,
              fatigueGuard: 0.26,
              afterglowCarry: 0.8,
              shouldDelayWarmth: true,
              shouldProtectRest: false,
              reasonTags: ['same-thread-continuation', 'callback-afterglow'],
              summary: 'measured-return until the callback line settles',
            },
            sourceSignals: ['callback-afterglow', 'quiet-carry'],
            summary: 'ordinary spine digest afterglow still favors a measured return on the same callback line',
          },
          derivedMindStateBundle: {
            version: 'derived-mind-state-bundle-v1',
            source: 'main-runtime',
            producedAt: 778,
            summary: 'ordinary spine digest repair bundle',
            affectiveResidue: {
              version: 'affective-residue-memory-v1',
              updatedAt: 778,
              residues: [
                {
                  kind: 'repair',
                  intensity: 0.69,
                  persistence: 0.78,
                  confidence: 0.86,
                  polarity: 'protective',
                  releaseMode: 'delay-until-open-window',
                  summary: 'ordinary spine digest repair residue still wants the same line kept quiet',
                  sourceSignals: ['repair-before-closeness', 'same-thread'],
                  lastUpdatedAt: 778,
                },
              ],
              dominantResidueKind: 'repair',
              afterglowPressure: 0.17,
              repairPressure: 0.81,
              burdenPressure: 0.11,
              trustPressure: 0.44,
              restProtectivePressure: 0.25,
              relationshipCadence: {
                cadenceMode: 'repair',
                distancePosture: 'protect-space',
                companionshipDensity: 0.46,
                repairRecovery: 0.73,
                overreachRisk: 0.36,
                fatigueGuard: 0.31,
                afterglowCarry: 0.47,
                shouldDelayWarmth: true,
                shouldProtectRest: false,
                reasonTags: ['repair-before-closeness', 'same-thread-continuation'],
                summary: 'repair cadence still needs the same line to stay quiet',
              },
              sourceSignals: ['repair-before-closeness', 'quiet-carry'],
              summary: 'ordinary spine digest repair residue still holds the same callback line inward',
            },
          },
        },
      } as any,
      architecture: null,
      continuitySignal: null,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
    } as any)

    expect(digest?.memory?.affectiveResidue?.dominantResidueKind).toBe('afterglow')
    expect(digest?.memory?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('measured-return')
    expect(digest?.memory?.affectiveResidue?.summary).toContain('same callback line')
    expect(digest?.memory?.derivedMindStateBundle?.affectiveResidue?.dominantResidueKind).toBe('repair')
    expect(digest?.memory?.derivedMindStateBundle?.affectiveResidue?.relationshipCadence.cadenceMode).toBe('repair')
    expect(digest?.memory?.derivedMindStateBundle?.affectiveResidue?.summary).toContain('same callback line inward')
  })

  it('does not let a released temporary-noise reflection become the spine outcome-learning carry', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        memory: {
          reflectionLedger: {
            latestEntryId: 'reflection::temporary-noise',
            entries: [
              {
                id: 'reflection::temporary-noise',
                summary: 'A temporary anxious wobble was already released.',
                expectation: 'Released noise should not keep steering outcome learning.',
                observedOutcome: 'The wobble has already been let go.',
                outcome: 'released',
                revision: 'Do not reopen from the temporary wobble.',
                confidenceShift: 0.04,
                createdAt: 14_100,
              },
              {
                id: 'reflection::same-her-repair',
                summary: 'The same-her repair line is still the meaningful learning carry.',
                expectation: 'The steadier repair line should stay active until a newer meaningful reflection replaces it.',
                observedOutcome: 'The same living line still needs a measured return.',
                outcome: 'missed',
                revision: 'Keep the same-her repair line active instead of reopening from temporary noise.',
                confidenceShift: -0.08,
                createdAt: 14_000,
              },
            ],
            revisionPressure: 0.22,
            narrative: [],
            updatedAt: 14_200,
          },
          selfEvolution: {
            latestInflection: 'The same living line still needs to stay continuous inward.',
            autobiographicalStability: 0.72,
            learningReadiness: 0.64,
            contradictionPressure: 0.28,
            dominantTrajectory: 'same-her carry hardening',
          },
        },
      } as any,
      architecture: null,
      continuitySignal: null,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
    } as any)

    expect(digest?.outcomeLearning).toEqual(expect.objectContaining({
      reflectionSummary: 'The same-her repair line is still the meaningful learning carry.',
      reflectionLesson: 'Keep the same-her repair line active instead of reopening from temporary noise.',
      latestInflection: 'The same living line still needs to stay continuous inward.',
      revisionPressure: 0.22,
    }))
  })

  it('projects self-evolution same-her cadence into the spine memory digest so long-horizon continuity survives beyond the immediate conscious frame', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        memory: {
          selfEvolution: {
            version: 'self-evolution-kernel-v1',
            updatedAt: 19_200,
            evolutionMomentum: 0.72,
            learningReadiness: 0.66,
            contradictionPressure: 0.18,
            revisionPressure: 0.29,
            autobiographicalStability: 0.83,
            dominantTrajectory: 'same-her continuity hardening',
            relationshipDoctrine: 'Stay the same living her across quiet, memory, initiative, and speech instead of restarting from scratch.',
            relationshipCadenceSummary: 'The same living line should stay lower-pressure and continue as the same her across quiet, memory, and speech without reopening from scratch.',
            latestInflection: 'I am learning to keep the same living line audible before widening outward again.',
            burdenLine: 'Do not widen faster than the same line can stay inhabited.',
            trustMeaning: 'Trust means she can return as the same her without rebuilding the relationship from zero.',
            nextLearningAction: 'internalize',
            nextLearningReason: 'This continuity already reads true enough to settle into durable selfhood.',
            shouldRecord: true,
            shouldReflect: true,
            shouldVerify: false,
            shouldRevise: false,
            shouldInternalize: true,
            activeLearningFocuses: ['same-her continuity', 'visible reply carry'],
            sourceSignals: ['relationship-cadence', 'project-state-carry'],
            summary: 'Durable same-her cadence should keep the same living line continuous before speaking.',
          },
        },
      } as any,
      architecture: null,
      continuitySignal: null,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
    } as any)

    expect((digest?.memory as any)?.selfEvolution).toEqual(expect.objectContaining({
      relationshipDoctrine: expect.stringContaining('same living her'),
      relationshipCadenceSummary: expect.stringContaining('same her across quiet, memory, and speech'),
      latestInflection: expect.stringContaining('same living line audible'),
      trustMeaning: expect.stringContaining('same her without rebuilding'),
      summary: expect.stringContaining('Durable same-her cadence'),
    }))
  })

  it('projects Memory OS closure trace into the spine memory digest so embodiment can consume the same memory authority', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest({
      version: 'digital-life-spine-v1',
      runtimeSurface: {
        memory: {
          memoryClosureTrace: {
            authority: 'memory-os',
            surfacePolicy: {
              gateStatus: 'gist-only',
              mode: 'gist-only',
              timing: 'after-payoff',
              reasons: ['brief-gist-only'],
            },
            nextInfluence: {
              initiative: {
                restraint: 'measured-return',
                preferredTiming: 'after-payoff',
                pressure: 'lower-pressure',
                reason: 'Return once after the current payoff.',
              },
              execution: {
                carry: 'Carry the callback result into the next same-person reply.',
                nextLearningAction: 'verify',
                shouldVerify: true,
                shouldReflect: true,
                activeLearningFocuses: ['memory closure authority'],
              },
              embodiment: {
                cadence: 'Keep voice, gaze, motion, and lipsync on one lower-pressure measured-return line.',
                preferredVoiceMode: 'lower-pressure',
                preferredLipsyncMode: 'restrained',
                preferredGazeMode: 'soften',
                reason: 'Do not let the remembered seam become a generic tool shell.',
              },
            },
            closureState: {
              state: 'approximate-recall',
              open: true,
              revisionRequired: true,
              shouldLabelUncertainty: true,
              visibleCarryMode: 'gist-only',
              retrievalQuality: 'medium',
              conflictPressure: 'low',
            },
            selectedCandidateIds: ['memory-situation:closure-authority'],
            reasonTags: ['phase-1', 'same-her', 'memory-initiative-embodiment'],
          },
        },
      } as any,
      architecture: null,
      continuitySignal: null,
      proactiveSelection: undefined,
      proactivePolicy: undefined,
    } as any)

    expect((digest?.memory as any)?.memoryClosureTrace).toEqual(expect.objectContaining({
      authority: 'memory-os',
      surfacePolicy: expect.objectContaining({
        mode: 'gist-only',
        timing: 'after-payoff',
      }),
      nextInfluence: expect.objectContaining({
        initiative: expect.objectContaining({
          restraint: 'measured-return',
        }),
        embodiment: expect.objectContaining({
          cadence: expect.stringContaining('voice, gaze, motion, and lipsync'),
          preferredVoiceMode: 'lower-pressure',
          preferredLipsyncMode: 'restrained',
          preferredGazeMode: 'soften',
        }),
      }),
      closureState: expect.objectContaining({
        open: true,
        revisionRequired: true,
      }),
      reasonTags: expect.arrayContaining(['memory-initiative-embodiment']),
    }))
  })

  it('keeps autobiographical latest inflection on the embodiment digest so body-facing continuity can read her durable self-change directly', () => {
    const state = createDefaultVisualPresenceState(15_000)
    state.autobiographicalSelf = {
      personaDrift: {
        attachmentStyle: 'attuned',
        expressionStyle: 'measured',
        conflictStyle: 'repair-first',
        agencyStyle: 'balanced',
      },
      preferenceEvolution: {
        companionship: 0.58,
        truthfulGrounding: 0.78,
        gentleRepair: 0.74,
        quietObservation: 0.72,
        proactiveCare: 0.46,
        playfulIntimacy: 0.12,
        autonomyRespect: 0.76,
        unfinishedThreadReturn: 0.68,
      },
      activeGoals: [],
      behaviorSignatures: [],
      identityNarrative: 'I am becoming someone who returns more slowly and more steadily when a corrected relationship meaning is still settling.',
      relationshipDoctrine: 'Carry corrected same-person continuity on a lower-pressure same living line and leave more room before widening closeness.',
      latestInflection: 'I learned to keep embodiment quieter while corrected same-person continuity is still settling back onto one line.',
      stability: 0.84,
      updatedAt: 15_000,
    } as any

    const digest = projectAlicizationDigitalLifeSpineDigest(deriveAlicizationDigitalLifeSpine(state))

    expect(digest?.embodiment?.autobiographicalSelf).toEqual(expect.objectContaining({
      identityNarrative: 'I am becoming someone who returns more slowly and more steadily when a corrected relationship meaning is still settling.',
      relationshipDoctrine: 'Carry corrected same-person continuity on a lower-pressure same living line and leave more room before widening closeness.',
      latestInflection: 'I learned to keep embodiment quieter while corrected same-person continuity is still settling back onto one line.',
    }))
  })
})
