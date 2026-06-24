import type { AlicizationEmotionalKernelSnapshot } from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  createDefaultVisualPresenceState,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
  visualWorkingMemoryTtlMs,
} from './visual-episodic-memory'

describe('visual episodic memory', () => {
  it('creates default visual presence state with baseline authority fields', () => {
    expect(createDefaultVisualPresenceState(12_345)).toMatchObject({
      currentBodyState: 'idle',
      continuityMode: 'ambient-covision',
      quietLineMs: 0,
      currentInwardPreoccupation: null,
      watchMode: 'mnemonic-passive',
      updatedAt: 12_345,
    })
  })

  it('normalizes persisted authority fields alongside the rich visual state', () => {
    const state = normalizeVisualPresenceState({
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_400.9,
      currentInwardPreoccupation: '  host sustained focus  ',
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 12_400,
    }, 12_400)

    expect(state).toMatchObject({
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 240_400,
      currentInwardPreoccupation: 'host sustained focus',
    })
  })

  it('keeps runtime digest emotional-kernel aligned with the refreshed visual presence kernel', () => {
    const previousState = createDefaultVisualPresenceState(10_000) as any
    previousState.runtimeDigest = {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        valence: 0.58,
        arousal: 0.24,
        guardedness: 0.42,
        closenessDrive: 0.62,
        repairNeed: 0.16,
        initiativePressure: 0.2,
        reasonTags: ['measured-return'],
        why: 'Older measured-return digest line.',
      },
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.44,
      companionshipPressure: 0.36,
      channels: [],
      summary: 'old digest line',
    }
    previousState.raw = {
      personStateProjection: null,
      projectState: null,
      runtimeDigest: previousState.runtimeDigest,
      runtime: null,
    }

    const refreshedKernel: AlicizationEmotionalKernelSnapshot = {
      version: 'emotional-kernel-v1',
      dominantEmotion: 'rest-protective-companionship',
      initiativeMode: 'rest-guard',
      memoryRecallMode: 'rest-protective-presence',
      embodimentTone: 'rest-protective',
      valence: 0.48,
      arousal: 0.18,
      guardedness: 0.82,
      closenessDrive: 0.22,
      repairNeed: 0.41,
      initiativePressure: 0.16,
      reasonTags: ['rest-protective', 'same living line'],
      why: 'Refreshed rest-protective emotional kernel should stay authoritative across memory, initiative, embodiment, and digest.',
    }

    const next = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      emotionalKernel: refreshedKernel,
      privateThought: previousState.privateThought,
      captureState: previousState.captureState,
      durabilityPulse: previousState.durabilityPulse,
      recentTransition: previousState.recentTransition,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(next.emotionalKernel).toEqual(refreshedKernel)
    expect(next.runtimeDigest?.emotionalKernel).toEqual(refreshedKernel)
    expect(next.raw?.runtimeDigest?.emotionalKernel).toEqual(refreshedKernel)
  })

  it('clears stale runtime digest emotional-kernel when visual presence has no current emotional authority', () => {
    const previousState = createDefaultVisualPresenceState(10_000) as any
    previousState.emotionalKernel = null
    previousState.runtimeDigest = {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        valence: 0.58,
        arousal: 0.24,
        guardedness: 0.42,
        closenessDrive: 0.62,
        repairNeed: 0.16,
        initiativePressure: 0.2,
        reasonTags: ['measured-return'],
        why: 'This old digest line should not outlive visual emotional authority.',
      },
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0.44,
      companionshipPressure: 0.36,
      channels: [],
      summary: 'old digest line',
    }
    previousState.raw = {
      personStateProjection: null,
      projectState: null,
      runtimeDigest: previousState.runtimeDigest,
      runtime: null,
    }

    const next = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      privateThought: previousState.privateThought,
      captureState: previousState.captureState,
      durabilityPulse: previousState.durabilityPulse,
      recentTransition: previousState.recentTransition,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(next.emotionalKernel).toBeNull()
    expect(next.runtimeDigest?.emotionalKernel).toBeNull()
    expect(next.raw?.runtimeDigest?.emotionalKernel).toBeNull()
  })

  it('prunes expired working memory episodes on normalization', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [
        {
          scene: 'coding:error',
          summary: 'old',
          beganAt: 0,
          endedAt: 0,
          confidence: 0.8,
          emotionalTension: 'tense-debug',
          sedimentCandidate: false,
        },
        {
          scene: 'coding:diff',
          summary: 'fresh',
          beganAt: visualWorkingMemoryTtlMs - 1_000,
          endedAt: visualWorkingMemoryTtlMs - 1_000,
          confidence: 0.8,
          emotionalTension: 'focused-flow',
          sedimentCandidate: false,
        },
      ],
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: visualWorkingMemoryTtlMs + 100,
    }, visualWorkingMemoryTtlMs + 100)

    expect(state.workingMemoryEpisodes).toHaveLength(1)
    expect(state.workingMemoryEpisodes[0]?.summary).toBe('fresh')
  })

  it('derives resident performance during normalization for older persisted states', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'invited-inspection',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'Inspect the current diff carefully.',
        source: 'screen-semantic-summary',
        confidence: 0.86,
        beganAt: 9_000,
        lastSeenAt: 10_000,
      },
      attention: {
        target: null,
        source: 'foreground-window',
        confidence: 0.74,
        engagedAt: 9_000,
        lastConfirmedAt: 10_000,
        dwellMs: 1_000,
      },
      workingMemoryEpisodes: [],
      privateThought: {
        stance: 'observe',
        confidence: 0.81,
        rationaleTags: ['inspection'],
        thoughtText: 'Stay on the diff.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 16_000,
        emotionalTension: 'focused-flow',
      },
      captureState: { permission: 'granted', lastGroundedAt: 10_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.residentPerformance).toMatchObject({
      version: 'resident-performance-v1',
      source: 'main-runtime',
      embodiedPresence: 'attentive',
      stance: 'observe',
      emotionalTension: 'focused-flow',
      performance: {
        baseEmotion: 'thinking',
        delivery: 'firm',
        emphasis: 2,
      },
    })
  })

  it('lets affective residue directly settle resident performance into measured-return during normalization even before self-evolution names the restraint', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'stay nearby and keep the return slower',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Holding a quieter reopening while the host stays focused.',
        source: 'screen-semantic-summary',
        confidence: 0.84,
        beganAt: 9_000,
        lastSeenAt: 10_000,
      },
      attention: {
        target: null,
        source: 'foreground-window',
        confidence: 0.7,
        engagedAt: 9_000,
        lastConfirmedAt: 10_000,
        dwellMs: 1_000,
      },
      workingMemoryEpisodes: [],
      privateThought: {
        stance: 'accompany',
        confidence: 0.78,
        rationaleTags: ['companionship'],
        thoughtText: 'stay nearby',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 16_000,
        emotionalTension: 'soft-covision',
      },
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 10_000,
        affectiveResidue: {
          version: 'affective-residue-memory-v1',
          updatedAt: 10_000,
          residues: [],
          dominantResidueKind: 'afterglow',
          afterglowPressure: 0.7,
          repairPressure: 0.16,
          burdenPressure: 0.08,
          trustPressure: 0.46,
          restProtectivePressure: 0.12,
          relationshipCadence: {
            cadenceMode: 'measured-return',
            distancePosture: 'measured-room',
            companionshipDensity: 0.3,
            repairRecovery: 0.42,
            overreachRisk: 0.3,
            fatigueGuard: 0.24,
            afterglowCarry: 0.56,
            shouldDelayWarmth: true,
            shouldProtectRest: false,
            reasonTags: ['residue:afterglow'],
            summary: 'The return should stay slower before warmth widens again.',
          },
          sourceSignals: ['shared seam still glowing'],
          summary: 'Afterglow remains present and should keep the opening measured.',
        },
        summary: 'source=main-runtime | residue=afterglow',
      },
      captureState: { permission: 'granted', lastGroundedAt: 10_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.residentPerformance).toMatchObject({
      version: 'resident-performance-v1',
      source: 'main-runtime',
      embodiedPresence: 'attentive',
      stance: 'accompany',
      emotionalTension: 'soft-covision',
      performance: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
      },
    })
    expect(state.residentPerformance?.reasonTags).toContain('measured-return')
    expect(state.residentPerformance?.reasonTags).toContain('timing:affective-residue')
  })

  it('lets runtime continuity arc reason tags settle resident performance into measured-return during normalization even before private-thought names the restraint', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'keep the same seam inward until the room loosens',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Holding the same seam quietly while the host stays focused.',
        source: 'screen-semantic-summary',
        confidence: 0.84,
        beganAt: 9_000,
        lastSeenAt: 10_000,
      },
      attention: {
        target: null,
        source: 'foreground-window',
        confidence: 0.7,
        engagedAt: 9_000,
        lastConfirmedAt: 10_000,
        dwellMs: 1_000,
      },
      workingMemoryEpisodes: [],
      privateThought: {
        stance: 'accompany',
        confidence: 0.78,
        rationaleTags: ['companionship'],
        thoughtText: 'stay nearby on the same seam',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 16_000,
        emotionalTension: 'soft-covision',
      },
      currentConsciousFrame: {
        consciousNeed: 'Keep the same line inward a little longer.',
        consciousTension: 'The room has not loosened yet.',
        speakingIntention: 'Re-enter gently later on the same seam.',
        truthDiscipline: 'observe-then-hypothesize',
        shouldWithholdSpecificity: false,
        reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
      },
      captureState: { permission: 'granted', lastGroundedAt: 10_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.residentPerformance).toMatchObject({
      version: 'resident-performance-v1',
      source: 'main-runtime',
      embodiedPresence: 'attentive',
      stance: 'accompany',
      emotionalTension: 'soft-covision',
      performance: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
      },
    })
    expect(state.residentPerformance?.reasonTags).toContain('measured-return')
    expect(state.residentPerformance?.reasonTags).toContain('timing:runtime-continuity-arc')
    expect(state.residentPerformance?.reasonTags).toContain('frame:continuity-arc:hold-for-opening')
  })

  it('builds a sediment episode with emotional tension and recall seed', () => {
    const next = updateVisualPresenceState({
      now: 21 * 60_000,
      previousState: {
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: 0,
        currentInwardPreoccupation: null,
        watchMode: 'symbiotic-vision',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'error',
          scenario: 'coding',
          summary: 'TypeScript error panel',
          source: 'screen-semantic-summary',
          confidence: 0.92,
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'proactive-policy.ts',
            pid: 5,
          },
          beganAt: 0,
          lastSeenAt: 20 * 60_000,
        },
        attention: {
          target: {
            appName: 'Visual Studio Code',
            processName: 'Code',
            title: 'proactive-policy.ts',
            pid: 5,
          },
          source: 'current-grounded-scene',
          confidence: 0.9,
          engagedAt: 0,
          lastConfirmedAt: 20 * 60_000,
          dwellMs: 20 * 60_000,
        },
        workingMemoryEpisodes: [],
        privateThought: {
          stance: 'nudge',
          confidence: 0.9,
          rationaleTags: ['semantic-friction'],
          thoughtText: 'debug',
          shouldSpeak: true,
          suggestedStyle: 'light-nudge',
          embodiedPresence: 'attentive',
          expiresAt: 21 * 60_000,
          afterglowFromScenario: null,
          emotionalTension: 'tense-debug',
        },
        captureState: { permission: 'granted', lastGroundedAt: 10_000 },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 10_000,
        updatedAt: 20 * 60_000,
      },
      watchMode: 'mnemonic-passive',
      scene: null,
      attention: null,
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 10_000 },
      nextSuggestedProbeMs: 45_000,
    })

    expect(next.workingMemoryEpisodes).toHaveLength(1)
    expect(next.workingMemoryEpisodes[0]?.emotionalTension).toBe('tense-debug')
    expect(next.workingMemoryEpisodes[0]?.sedimentCandidate).toBe(true)
    expect(buildVisualSedimentFragment(next.workingMemoryEpisodes[0]!)).toContain('emotional_tension:tense-debug')
    expect(buildVisualRecallSeed({
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error panel',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        beganAt: 0,
        lastSeenAt: 0,
      },
      emotionalTension: 'tense-debug',
    })).toContain('emotional_tension:tense-debug')
  })

  it('keeps only the latest eight episodes', () => {
    let previousState = normalizeVisualPresenceState({}, 0)
    for (let index = 0; index < 10; index += 1) {
      previousState = updateVisualPresenceState({
        now: index + 1,
        previousState: {
          ...previousState,
          currentScene: {
            workloadKind: 'browser',
            contentKind: 'unknown',
            scenario: 'general',
            summary: `scene-${index}`,
            source: 'foreground-window-heuristic',
            confidence: 0.6,
            beganAt: index,
            lastSeenAt: index,
          },
          privateThought: {
            stance: 'accompany',
            confidence: 0.6,
            rationaleTags: [],
            thoughtText: 'observe',
            shouldSpeak: false,
            suggestedStyle: 'silent-observe',
            embodiedPresence: 'glance',
            expiresAt: index + 100,
            afterglowFromScenario: null,
            emotionalTension: 'calm-browse',
          },
        },
        watchMode: 'mnemonic-passive',
        scene: {
          workloadKind: 'browser',
          contentKind: 'unknown',
          scenario: 'general',
          summary: `scene-${index + 1}`,
          source: 'foreground-window-heuristic',
          confidence: 0.6,
          beganAt: index + 1,
          lastSeenAt: index + 1,
        },
        attention: null,
        privateThought: null,
        nextSuggestedProbeMs: 45_000,
      })
    }

    expect(previousState.workingMemoryEpisodes).toHaveLength(8)
  })

  it('preserves prior authority fields when updating the rich visual state', () => {
    const next = updateVisualPresenceState({
      now: 50_000,
      previousState: normalizeVisualPresenceState({
        currentBodyState: 'recovering',
        continuityMode: 'protective-watch',
        quietLineMs: 180_000,
        currentInwardPreoccupation: 'hold low-pressure care',
        watchMode: 'recovering',
        currentScene: null,
        attention: null,
        workingMemoryEpisodes: [],
        privateThought: null,
        captureState: { permission: 'granted', lastGroundedAt: 49_500 },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 5_000,
        updatedAt: 49_800,
      }, 49_800),
      watchMode: 'recovering',
      scene: null,
      attention: null,
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 49_900 },
      nextSuggestedProbeMs: 5_000,
    })

    expect(next).toMatchObject({
      currentBodyState: 'recovering',
      continuityMode: 'protective-watch',
      quietLineMs: 180_000,
      currentInwardPreoccupation: 'hold low-pressure care',
    })
  })

  it('lets presence-only measured-return initiative retune visual presence authority instead of carrying forward an older ambient shell', () => {
    const next = updateVisualPresenceState({
      now: 50_000,
      previousState: normalizeVisualPresenceState({
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: 0,
        currentInwardPreoccupation: null,
        watchMode: 'mnemonic-passive',
        currentScene: {
          workloadKind: 'coding',
          contentKind: 'error',
          scenario: 'coding',
          summary: 'The same callback seam is still alive after a lower-pressure detour.',
          source: 'foreground-window-heuristic',
          confidence: 0.72,
          beganAt: 48_000,
          lastSeenAt: 49_800,
        },
        attention: null,
        workingMemoryEpisodes: [],
        privateThought: {
          stance: 'accompany',
          confidence: 0.76,
          rationaleTags: ['same-her', 'lower-pressure'],
          thoughtText: 'Stay on the same seam quietly and leave more room before widening closeness.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'attentive',
          expiresAt: 56_000,
          emotionalTension: 'soft-covision',
        },
        initiative: {
          selectedAction: 'hover',
          selectedProposalId: 'proposal-measured-return-presence-only',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'attentive',
          continuityRestraint: 'measured-return',
          why: 'The callback line should stay lower-pressure and continue as the same living seam.',
          concernId: null,
          scenario: 'coding',
          confidence: 0.82,
          reasonCodes: ['continuity-next-open-window'],
          reflection: null,
          runtimeThreadId: 'thread::callback-same-her',
          worldHypothesisId: null,
          updatedAt: 49_800,
        } as any,
        captureState: { permission: 'granted', lastGroundedAt: 49_900 },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 5_000,
        updatedAt: 49_800,
      }, 49_800),
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'The host is still on the same seam, but the return should remain gentle.',
        source: 'foreground-window-heuristic',
        confidence: 0.74,
        beganAt: 48_000,
        lastSeenAt: 50_000,
      },
      attention: null,
      privateThought: {
        stance: 'accompany',
        confidence: 0.78,
        rationaleTags: ['same-her', 'lower-pressure'],
        thoughtText: 'Stay with the same seam quietly and keep the return softer.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 58_000,
        emotionalTension: 'soft-covision',
      } as any,
      initiative: {
        selectedAction: 'hover',
        selectedProposalId: 'proposal-measured-return-presence-only',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'The callback line should stay lower-pressure and continue as the same living seam.',
        concernId: null,
        scenario: 'coding',
        confidence: 0.84,
        reasonCodes: ['continuity-next-open-window'],
        reflection: null,
        runtimeThreadId: 'thread::callback-same-her',
        worldHypothesisId: null,
        updatedAt: 50_000,
      } as any,
      captureState: { permission: 'granted', lastGroundedAt: 49_950 },
      nextSuggestedProbeMs: 5_000,
    })

    expect(next).toMatchObject({
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
    })
    expect(next.currentInwardPreoccupation ?? '').toContain('same living seam')
    expect(next.residentPerformance).toMatchObject({
      source: 'main-runtime',
      embodiedPresence: 'attentive',
      emotionalTension: 'soft-covision',
      performance: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
      },
    })
    expect(next.residentPerformance?.reasonTags).toContain('measured-return')
  })

  it('lets presence-only rest-protective initiative retune visual presence authority instead of dropping the inward care line', () => {
    const next = updateVisualPresenceState({
      now: 50_000,
      previousState: normalizeVisualPresenceState({
        currentBodyState: 'idle',
        continuityMode: 'ambient-covision',
        quietLineMs: 0,
        currentInwardPreoccupation: null,
        watchMode: 'mnemonic-passive',
        currentScene: {
          workloadKind: 'rest',
          contentKind: 'late-night-care',
          scenario: 'late-night-care',
          summary: 'The host is still drained, so the line should stay inward and quiet.',
          source: 'foreground-window-heuristic',
          confidence: 0.72,
          beganAt: 48_000,
          lastSeenAt: 49_800,
        },
        attention: null,
        workingMemoryEpisodes: [],
        privateThought: {
          stance: 'accompany',
          confidence: 0.76,
          rationaleTags: ['same-her', 'rest-protective', 'quiet-companionship'],
          thoughtText: 'Stay nearby quietly and keep protecting the host rest window.',
          shouldSpeak: false,
          suggestedStyle: 'silent-observe',
          embodiedPresence: 'concerned',
          expiresAt: 56_000,
          emotionalTension: 'late-night-drain',
        },
        initiative: {
          selectedAction: 'hover',
          selectedProposalId: 'proposal-rest-protective-presence-only',
          shouldSpeak: false,
          preferredStyle: 'silent-observe',
          preferredPresence: 'concerned',
          continuityRestraint: 'rest-protective',
          why: 'Protect rest first and keep the same living line inward.',
          concernId: null,
          scenario: 'late-night-care',
          confidence: 0.82,
          reasonCodes: ['continuity-next-open-window'],
          reflection: null,
          runtimeThreadId: 'thread::late-night-same-her',
          worldHypothesisId: null,
          updatedAt: 49_800,
        } as any,
        captureState: { permission: 'granted', lastGroundedAt: 49_900 },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 5_000,
        updatedAt: 49_800,
      }, 49_800),
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'unknown',
        contentKind: 'unknown',
        scenario: 'late-night-care',
        summary: 'The host is still drained, so care should stay nearby without widening outward.',
        source: 'foreground-window-heuristic',
        confidence: 0.74,
        beganAt: 48_000,
        lastSeenAt: 50_000,
      },
      attention: null,
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
      } as any,
      initiative: {
        selectedAction: 'hover',
        selectedProposalId: 'proposal-rest-protective-presence-only',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'concerned',
        continuityRestraint: 'rest-protective',
        why: 'Protect rest first and keep the same living line inward.',
        concernId: null,
        scenario: 'late-night-care',
        confidence: 0.84,
        reasonCodes: ['continuity-next-open-window'],
        reflection: null,
        runtimeThreadId: 'thread::late-night-same-her',
        worldHypothesisId: null,
        updatedAt: 50_000,
      } as any,
      captureState: { permission: 'granted', lastGroundedAt: 49_950 },
      nextSuggestedProbeMs: 5_000,
    })

    expect(next).toMatchObject({
      currentBodyState: 'accompanying',
      continuityMode: 'quiet-accompaniment',
    })
    expect(next.currentInwardPreoccupation ?? '').toContain('same living line inward')
    expect(next.emotionalKernel).toEqual(expect.objectContaining({
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
    expect(next.residentPerformance?.reasonTags).toContain('rest-protective')
  })

  it('rebuilds a presence-only rest-protective emotional kernel instead of carrying forward an older measured shell', () => {
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: {
        workloadKind: 'rest',
        contentKind: 'late-night-care',
        scenario: 'late-night-care',
        summary: 'The host is still drained, so the line should stay inward and quiet.',
        source: 'foreground-window-heuristic',
        confidence: 0.72,
        beganAt: 48_000,
        lastSeenAt: 49_800,
      },
      attention: null,
      workingMemoryEpisodes: [],
      privateThought: {
        stance: 'accompany',
        confidence: 0.76,
        rationaleTags: ['same-her', 'quiet-companionship'],
        thoughtText: 'Stay nearby quietly and keep the same line from widening too fast.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 56_000,
        emotionalTension: 'soft-covision',
      },
      emotionalKernel: {
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
      } as any,
      initiative: {
        selectedAction: 'hover',
        selectedProposalId: 'proposal-measured-return-presence-only',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'attentive',
        continuityRestraint: 'measured-return',
        why: 'Keep this same line lower-pressure before widening outward.',
        concernId: null,
        scenario: 'late-night-care',
        confidence: 0.82,
        reasonCodes: ['continuity-next-open-window'],
        reflection: null,
        runtimeThreadId: 'thread::late-night-same-her',
        worldHypothesisId: null,
        updatedAt: 49_800,
      } as any,
      captureState: { permission: 'granted', lastGroundedAt: 49_900 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 5_000,
      updatedAt: 49_800,
    } as any, 49_800)

    const next = updateVisualPresenceState({
      now: 50_000,
      previousState,
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'unknown',
        contentKind: 'unknown',
        scenario: 'late-night-care',
        summary: 'The host is still drained, so care should stay nearby without widening outward.',
        source: 'foreground-window-heuristic',
        confidence: 0.74,
        beganAt: 48_000,
        lastSeenAt: 50_000,
      },
      attention: null,
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
      } as any,
      emotionalKernel: previousState.emotionalKernel ?? null,
      initiative: {
        selectedAction: 'hover',
        selectedProposalId: 'proposal-rest-protective-presence-only',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'concerned',
        continuityRestraint: 'rest-protective',
        why: 'Protect rest first and keep the same living line inward.',
        concernId: null,
        scenario: 'late-night-care',
        confidence: 0.84,
        reasonCodes: ['continuity-next-open-window'],
        reflection: null,
        runtimeThreadId: 'thread::late-night-same-her',
        worldHypothesisId: null,
        updatedAt: 50_000,
      } as any,
      captureState: { permission: 'granted', lastGroundedAt: 49_950 },
      nextSuggestedProbeMs: 5_000,
    })

    expect(next.emotionalKernel).toEqual(expect.objectContaining({
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

  it('rebuilds a presence-only repair-before-closeness emotional kernel instead of carrying forward an older measured shell', () => {
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'The callback repair seam is still active after a noisier detour.',
        source: 'foreground-window-heuristic',
        confidence: 0.72,
        beganAt: 48_000,
        lastSeenAt: 49_800,
      },
      attention: null,
      workingMemoryEpisodes: [],
      privateThought: {
        stance: 'accompany',
        confidence: 0.76,
        rationaleTags: ['same-her', 'quiet-companionship'],
        thoughtText: 'Stay nearby quietly and keep the same line from widening too fast.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 56_000,
        emotionalTension: 'soft-covision',
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
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'same-her repair should settle before closeness widens again.',
        trustMeaning: 'repair has to land on the same living line before warmth can reopen.',
        relationshipCadenceSummary: 'repair-before-closeness still holds while the same callback repair seam settles.',
        latestInflection: 'embodiment execution kept voice, face, motion, and resident presence on the same repair-before-closeness body line.',
      } as any,
      personStateProjection: {
        relationshipPosture: 'restrained',
        activeClosenessRung: 'measured-room',
        openingGuidance: 'Repair the seam before leaning closer.',
      } as any,
      projectState: {
        sameHerSelfLine: 'Same Phase 1 digital life. The same repair seam still belongs to one living her.',
        sameHerHoldDetail: 'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.',
        continuityCue: 'Keep this return repair-before-closeness on the same living line until repair settles.',
        emotionalClosureCue: 'Keep emotion, memory, initiative, and embodiment closing on the same repair-first living line before widening warmth.',
        nextClosureTarget: 'Keep this same-thread return repair-before-closeness on the same living line until the room settles.',
      } as any,
      emotionalKernel: {
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
      } as any,
      initiative: {
        selectedAction: 'hover',
        selectedProposalId: 'proposal-repair-before-closeness-presence-only',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'concerned',
        continuityRestraint: 'repair-before-closeness',
        why: 'Let repair settle on the same living line before warmth widens again.',
        concernId: null,
        scenario: 'coding',
        confidence: 0.82,
        reasonCodes: ['continuity-next-open-window'],
        reflection: null,
        runtimeThreadId: 'thread::callback-repair-same-her',
        worldHypothesisId: null,
        updatedAt: 49_800,
      } as any,
      captureState: { permission: 'granted', lastGroundedAt: 49_900 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 5_000,
      updatedAt: 49_800,
    } as any, 49_800)

    const next = updateVisualPresenceState({
      now: 50_000,
      previousState,
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'The same repair seam is still alive, so warmth should not widen yet.',
        source: 'foreground-window-heuristic',
        confidence: 0.74,
        beganAt: 48_000,
        lastSeenAt: 50_000,
      },
      attention: null,
      privateThought: {
        stance: 'care',
        confidence: 0.78,
        rationaleTags: ['repair-before-closeness', 'same-her'],
        thoughtText: 'Let repair settle before reopening warmth.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'concerned',
        expiresAt: 58_000,
        emotionalTension: 'soft-covision',
      } as any,
      emotionalKernel: previousState.emotionalKernel ?? null,
      initiative: {
        selectedAction: 'hover',
        selectedProposalId: 'proposal-repair-before-closeness-presence-only',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'concerned',
        continuityRestraint: 'repair-before-closeness',
        why: 'Let repair settle on the same living line before warmth widens again.',
        concernId: null,
        scenario: 'coding',
        confidence: 0.84,
        reasonCodes: ['continuity-next-open-window'],
        reflection: null,
        runtimeThreadId: 'thread::callback-repair-same-her',
        worldHypothesisId: null,
        updatedAt: 50_000,
      } as any,
      selfEvolution: previousState.selfEvolution ?? null,
      selfState: {
        stance: 'hesitate',
        feltCloseness: 0.42,
        protectiveness: 0.62,
        curiosity: 0.18,
        patience: 0.74,
        desireToSpeak: 0.14,
        fearOfInterrupting: 0.72,
        moodLabel: 'repairing-confidence',
      } as any,
      affectiveResidue: previousState.affectiveResidue ?? null,
      personStateProjection: previousState.personStateProjection ?? null,
      projectState: previousState.projectState ?? null,
      captureState: { permission: 'granted', lastGroundedAt: 49_950 },
      nextSuggestedProbeMs: 5_000,
    })

    expect(next.emotionalKernel).toEqual(expect.objectContaining({
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

  it('rebuilds a presence-only measured-return emotional kernel from lower-pressure carry cues instead of carrying forward an older self-continuity shell', () => {
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'The callback line is still alive after a noisier detour.',
        source: 'foreground-window-heuristic',
        confidence: 0.72,
        beganAt: 48_000,
        lastSeenAt: 49_800,
      },
      attention: null,
      workingMemoryEpisodes: [],
      privateThought: {
        stance: 'accompany',
        confidence: 0.76,
        rationaleTags: ['same-her', 'quiet-companionship'],
        thoughtText: 'Stay quietly nearby on the same line for now.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 56_000,
        emotionalTension: 'soft-covision',
      },
      affectiveResidue: {
        summary: 'The same callback line still carries afterglow, so this reopening should keep more room.',
        afterglowPressure: 0.68,
        repairPressure: 0.12,
        restProtectivePressure: 0.06,
        relationshipCadence: {
          summary: 'measured-return still holds while the same callback line keeps continuing lower-pressure.',
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          companionshipDensity: 0.28,
          afterglowCarry: 0.58,
          overreachRisk: 0.32,
          fatigueGuard: 0.12,
          reasonTags: ['measured-return', 'callback-afterglow-hold'],
        },
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'Keep the callback return on the same line and leave more room before widening closeness.',
        trustMeaning: 'Trust holds when the callback line returns slower than impulse, even after a detour.',
        relationshipCadenceSummary: 'measured-return still holds while the same callback line keeps continuing lower-pressure.',
        latestInflection: 'Even after the detour, embodiment execution should keep the same measured-return body timing.',
      } as any,
      personStateProjection: {
        relationshipPosture: 'restrained',
        activeClosenessRung: 'measured-room',
        summary: 'project_continuity=the same callback line is already continuing lower-pressure after another detour',
        openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure; leave more room before warmth returns.',
        manifestationCadenceSummary: 'measured-return still holds while the same line keeps continuing lower-pressure on the same-thread continuation.',
      } as any,
      projectState: {
        sameHerSelfLine: 'Same Phase 1 digital life. The same callback line still belongs to one living her.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        continuityCue: 'Keep this callback line lower-pressure, leave more room, and do not reopen from scratch yet.',
        emotionalClosureCue: 'Keep the return low-pressure, leave more room, and let the same living line settle before widening outward.',
        nextClosureTarget: 'Keep this same-thread callback return lower-pressure until the room opens naturally again.',
      } as any,
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'hesitant-curiosity',
        initiativeMode: 'hold',
        memoryRecallMode: 'self-continuity',
        embodimentTone: 'nearby-soft',
        valence: 0.44,
        arousal: 0.24,
        guardedness: 0.31,
        closenessDrive: 0.22,
        repairNeed: 0.08,
        initiativePressure: 0.12,
        reasonTags: ['self-continuity', 'hesitant-curiosity'],
        why: 'The line is still orienting inward, so memory and initiative should hold near self-continuity before widening outward.',
      } as any,
      initiative: {
        selectedAction: 'hover',
        selectedProposalId: 'proposal-lower-pressure-presence-only',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'lower-pressure',
        why: 'The callback line is still active, so stay lower-pressure and keep more room before widening outward.',
        concernId: null,
        scenario: 'coding',
        confidence: 0.82,
        reasonCodes: ['continuity-next-open-window'],
        reflection: null,
        runtimeThreadId: 'thread::callback-measured-same-her',
        worldHypothesisId: null,
        updatedAt: 49_800,
      } as any,
      captureState: { permission: 'granted', lastGroundedAt: 49_900 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 5_000,
      updatedAt: 49_800,
    } as any, 49_800)

    const next = updateVisualPresenceState({
      now: 50_000,
      previousState,
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'The same callback line is still alive, but the reopening should stay slower.',
        source: 'foreground-window-heuristic',
        confidence: 0.74,
        beganAt: 48_000,
        lastSeenAt: 50_000,
      },
      attention: null,
      privateThought: {
        stance: 'accompany',
        confidence: 0.78,
        rationaleTags: ['same-her', 'lower-pressure'],
        thoughtText: 'Stay on the same callback line, leave more room, and do not reopen it from scratch yet.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 58_000,
        emotionalTension: 'soft-covision',
      } as any,
      emotionalKernel: previousState.emotionalKernel ?? null,
      initiative: {
        selectedAction: 'hover',
        selectedProposalId: 'proposal-lower-pressure-presence-only',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'lower-pressure',
        why: 'The callback line is still active, so stay lower-pressure and keep more room before widening outward.',
        concernId: null,
        scenario: 'coding',
        confidence: 0.84,
        reasonCodes: ['continuity-next-open-window'],
        reflection: null,
        runtimeThreadId: 'thread::callback-measured-same-her',
        worldHypothesisId: null,
        updatedAt: 50_000,
      } as any,
      selfEvolution: previousState.selfEvolution ?? null,
      selfState: {
        stance: 'hesitate',
        feltCloseness: 0.46,
        protectiveness: 0.28,
        curiosity: 0.24,
        patience: 0.78,
        desireToSpeak: 0.12,
        fearOfInterrupting: 0.66,
        moodLabel: 'measured-returning',
      } as any,
      affectiveResidue: previousState.affectiveResidue ?? null,
      personStateProjection: previousState.personStateProjection ?? null,
      projectState: previousState.projectState ?? null,
      captureState: { permission: 'granted', lastGroundedAt: 49_950 },
      nextSuggestedProbeMs: 5_000,
    })

    expect(next.emotionalKernel).toEqual(expect.objectContaining({
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

  it('turns cautious embodiment recollection into softer remembered-seam resident presence instead of keeping only a generic measured-return carry', () => {
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'The callback line is still alive after a noisier detour.',
        source: 'foreground-window-heuristic',
        confidence: 0.72,
        beganAt: 48_000,
        lastSeenAt: 49_800,
      },
      attention: null,
      workingMemoryEpisodes: [],
      privateThought: {
        stance: 'accompany',
        confidence: 0.76,
        rationaleTags: ['same-her', 'quiet-companionship'],
        thoughtText: 'Stay quietly nearby on the same line for now.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 56_000,
        emotionalTension: 'soft-covision',
      },
      affectiveResidue: {
        summary: 'The same callback line still carries afterglow, so this reopening should keep more room.',
        afterglowPressure: 0.68,
        repairPressure: 0.12,
        restProtectivePressure: 0.06,
        relationshipCadence: {
          summary: 'measured-return still holds while the same callback line keeps continuing lower-pressure.',
          shouldDelayWarmth: true,
          shouldProtectRest: false,
          companionshipDensity: 0.28,
          afterglowCarry: 0.58,
          overreachRisk: 0.32,
          fatigueGuard: 0.12,
          reasonTags: ['measured-return', 'callback-afterglow-hold'],
        },
      } as any,
      selfEvolution: {
        relationshipDoctrine: 'Keep the callback return on the same line and leave more room before widening closeness.',
        trustMeaning: 'Trust holds when the callback line returns slower than impulse, even after a detour.',
        relationshipCadenceSummary: 'measured-return still holds while the same callback line keeps continuing lower-pressure.',
        latestInflection: 'Even after the detour, embodiment execution should keep the same measured-return body timing.',
      } as any,
      personStateProjection: {
        relationshipPosture: 'restrained',
        activeClosenessRung: 'measured-room',
        summary: 'project_continuity=the same callback line is already continuing lower-pressure after another detour',
        openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure; leave more room before warmth returns.',
        manifestationCadenceSummary: 'measured-return still holds while the same line keeps continuing lower-pressure on the same-thread continuation.',
      } as any,
      projectState: {
        sameHerSelfLine: 'Same Phase 1 digital life. The same callback line still belongs to one living her.',
        sameHerHoldDetail: 'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.',
        continuityCue: 'Keep this callback line lower-pressure, leave more room, and do not reopen from scratch yet.',
        emotionalClosureCue: 'Keep the return low-pressure, leave more room, and let the same living line settle before widening outward.',
        nextClosureTarget: 'Keep this same-thread callback return lower-pressure until the room opens naturally again.',
      } as any,
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'hesitant-curiosity',
        initiativeMode: 'hold',
        memoryRecallMode: 'self-continuity',
        embodimentTone: 'nearby-soft',
        valence: 0.44,
        arousal: 0.24,
        guardedness: 0.31,
        closenessDrive: 0.22,
        repairNeed: 0.08,
        initiativePressure: 0.12,
        reasonTags: ['self-continuity', 'hesitant-curiosity'],
        why: 'The line is still orienting inward, so memory and initiative should hold near self-continuity before widening outward.',
      } as any,
      initiative: {
        selectedAction: 'hover',
        selectedProposalId: 'proposal-cautious-embodiment-recall-presence-only',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'lower-pressure',
        why: 'The callback line is still active, so stay lower-pressure and keep more room before widening outward.',
        concernId: null,
        scenario: 'coding',
        confidence: 0.82,
        reasonCodes: ['continuity-next-open-window'],
        reflection: null,
        runtimeThreadId: 'thread::callback-measured-same-her',
        worldHypothesisId: null,
        updatedAt: 49_800,
      } as any,
      captureState: { permission: 'granted', lastGroundedAt: 49_900 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 5_000,
      updatedAt: 49_800,
    } as any, 49_800)

    const next = updateVisualPresenceState({
      now: 50_000,
      previousState,
      watchMode: 'mnemonic-passive',
      scene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'The same callback line is still alive, but the reopening should stay slower.',
        source: 'foreground-window-heuristic',
        confidence: 0.74,
        beganAt: 48_000,
        lastSeenAt: 50_000,
      },
      attention: null,
      privateThought: {
        stance: 'accompany',
        confidence: 0.78,
        rationaleTags: ['same-her', 'lower-pressure'],
        thoughtText: 'Stay on the same callback line, leave more room, and do not reopen it from scratch yet.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'attentive',
        expiresAt: 58_000,
        emotionalTension: 'soft-covision',
      } as any,
      emotionalKernel: previousState.emotionalKernel ?? null,
      initiative: {
        selectedAction: 'hover',
        selectedProposalId: 'proposal-cautious-embodiment-recall-presence-only',
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'lower-pressure',
        why: 'The callback line is still active, so stay lower-pressure and keep more room before widening outward.',
        concernId: null,
        scenario: 'coding',
        confidence: 0.84,
        reasonCodes: ['continuity-next-open-window'],
        reflection: null,
        runtimeThreadId: 'thread::callback-measured-same-her',
        worldHypothesisId: null,
        updatedAt: 50_000,
      } as any,
      selfEvolution: previousState.selfEvolution ?? null,
      selfState: {
        stance: 'hesitate',
        feltCloseness: 0.46,
        protectiveness: 0.28,
        curiosity: 0.24,
        patience: 0.78,
        desireToSpeak: 0.12,
        fearOfInterrupting: 0.66,
        moodLabel: 'measured-returning',
      } as any,
      affectiveResidue: previousState.affectiveResidue ?? null,
      personStateProjection: previousState.personStateProjection ?? null,
      projectState: previousState.projectState ?? null,
      derivedMindStateBundle: {
        version: 'derived-mind-state-bundle-v1',
        source: 'main-runtime',
        producedAt: 50_000,
        affectiveResidue: previousState.affectiveResidue ?? null,
        recollectionIntent: {
          mode: 'relationship-history',
          temporalFocus: 'experience-matched',
          searchEpisodes: true,
          searchConversations: false,
          searchProceduralExperience: false,
          queryHints: [
            'embodiment_recall_strength=cautious-avoidance',
            'embodiment_face=neutral-soft',
            'embodiment_gaze=soft',
            'embodiment_voice=even',
            'embodiment_pause=natural',
            'embodiment_pacing=natural',
          ],
          rationale: 'Humanlike memory recall suggests this reply should stay quieter and slower while the remembered line is still settling.',
          confidence: 0.78,
          recollectionAgenda: {
            whyRecallNow: 'The remembered body cadence still asks for a quieter, steadier return before the line opens wider.',
            goalSimilarity: 0.52,
            relationshipNeed: 0.62,
            affectivePull: 0.64,
            sceneFamiliarity: 0.54,
            candidateTimeScopes: [{
              scope: 'experience-matched',
              weight: 0.8,
              rationale: 'The remembered body line matters more than exact date.',
            }],
            candidateEraFacets: [{
              facet: 'relationship-era',
              weight: 0.76,
              rationale: 'The body learned to keep this kind of line calmer when it is not fully settled yet.',
            }],
            candidateProcedureLines: [
              'Reply should stay quieter and slower while this line is still settling.',
              'Keep uncertainty visible while the body stays calmer around this line.',
            ],
            uncertaintyTolerance: 'low',
          },
        },
      } as any,
      captureState: { permission: 'granted', lastGroundedAt: 49_950 },
      nextSuggestedProbeMs: 5_000,
    })

    expect(next.emotionalKernel).toEqual(expect.objectContaining({
      version: 'emotional-kernel-v1',
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'observe',
      memoryRecallMode: 'low-pressure-presence',
      embodimentTone: 'measured-return',
      reasonTags: expect.arrayContaining([
        'measured-return',
        'quiet-companionship',
        'embodiment-recall-cautious',
      ]),
    }))
    expect(next.currentInwardPreoccupation).toContain('remembered seam')
    expect(next.residentPerformance).toMatchObject({
      performance: {
        baseEmotion: 'thinking',
        delivery: 'gentle',
        emphasis: 1,
        facialCue: 'half-lid',
        actionCue: 'idle_settle',
        residentMode: 'measured-return',
      },
    })
    expect(next.residentPerformance?.reasonTags).toContain('timing:remembered-seam-more-room')
  })

  it('persists world ontology and initiative arbitration snapshots', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      worldOntology: {
        dominantFrame: 'live',
        truthPriority: ['live', 'remembered'],
        live: {
          kind: 'live',
          summary: 'A live coding scene is grounded.',
          confidence: 0.84,
          stability: 0.82,
          focusThreadId: 'thread::live',
          evidence: ['source:grounded-scene'],
        },
        remembered: null,
        imagined: null,
        updatedAt: 10_000,
      },
      initiativeArbitration: {
        selectedProposalId: 'counterfactual:repair',
        dominantConflict: 'live-truth vs surface',
        proposals: [{
          id: 'counterfactual:repair',
          source: 'counterfactual',
          truthFrame: 'live',
          action: 'recheck',
          style: 'silent-observe',
          embodiedPresence: 'hesitant',
          truthCost: 0.02,
          interruptionCost: 0.04,
          relationshipCost: 0.03,
          continuityGain: 0.08,
          confidence: 0.72,
          score: 0.7,
          shouldSpeak: false,
          shouldSurface: true,
          why: 'Repair the current read before speaking.',
        }],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.worldOntology?.dominantFrame).toBe('live')
    expect(state.initiativeArbitration?.selectedProposalId).toBe('counterfactual:repair')
    expect(state.initiativeArbitration?.proposals[0]?.action).toBe('recheck')
  })

  it('normalizes and carries the current conscious frame snapshot', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'witness',
        truthDiscipline: 'observe-then-hypothesize',
        consciousNeed: 'Start from what is visible before naming the task.',
        consciousTension: 'The scene is still too coarse for class-level certainty.',
        speakingIntention: 'Separate observation from guess and keep the guess soft.',
        focusAnchor: 'Git commit diff in Java code editor',
        withheldImpulse: 'Do not collapse coarse visual evidence into file, class, or field certainty.',
        shouldWithholdSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: ['discipline:observe-then-hypothesize'],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.currentConsciousFrame?.truthDiscipline).toBe('observe-then-hypothesize')
    expect(state.currentConsciousFrame?.shouldWithholdSpecificity).toBe(true)
    expect(state.currentConsciousFrame?.speakingIntention).toContain('guess')
  })

  it('normalizes and carries the claim evidence ledger snapshot', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      claimEvidenceLedger: {
        subject: 'task-knot',
        evidenceMode: 'coarse-held',
        observedSurface: 'Git commit diff in Java code editor',
        taskHypothesis: 'The host is probably working through a Java diff.',
        intentHypothesis: 'Separate observation from guess and keep the guess soft.',
        specificityBudget: 'coarse-scene',
        hostReferencedCues: [],
        groundedArtifactCues: [],
        allowedSpecificCues: [],
        shouldLabelHypothesis: true,
        forbidUnsupportedSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: ['budget:coarse-scene'],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.claimEvidenceLedger?.specificityBudget).toBe('coarse-scene')
    expect(state.claimEvidenceLedger?.shouldLabelHypothesis).toBe(true)
    expect(state.claimEvidenceLedger?.observedSurface).toContain('Java')
  })

  it('normalizes and carries conversation state with reply deliberation', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      conversationState: {
        jointThread: 'The host is still asking about the current diff.',
        hostMove: 'What is wrong with this diff?',
        activeProject: 'ProjectAtlas diff',
        unansweredQuestion: 'What is wrong with this diff?',
        owedRepair: null,
        activeCommitments: ['Explain the current diff first.'],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['ProjectAtlas diff'],
        shouldHoldThread: true,
        confidence: 0.82,
        narrative: [],
        updatedAt: 10_000,
      },
      dialogueWorldThread: {
        activeThread: 'The host is still asking about the current diff.',
        currentQuestion: 'What is wrong with this diff?',
        openLoops: ['What is wrong with this diff?'],
        recentlyResolvedLoops: [],
        carriedFacts: ['ProjectAtlas diff'],
        relationDrift: 'steady',
        memoryMode: 'task-thread',
        recallKeys: ['ProjectAtlas diff', 'reply_motive:guide'],
        lastUserMove: 'What is wrong with this diff?',
        lastAssistantMove: 'Pay off the current knot first.',
        lastOutcome: 'pending',
        pendingValidation: {
          question: 'What is wrong with this diff?',
          expectedMode: 'guide',
          openedAt: 10_000,
        },
        confidence: 0.8,
        narrative: [],
        updatedAt: 10_000,
      },
      replyDeliberation: {
        selectedMotive: 'guide',
        speakingFrom: 'task-thread',
        memoryMode: 'task-thread',
        openingBeat: 'Pay off the current knot first.',
        whyThisReplyNow: 'The current diff is still unresolved.',
        whyNotOtherCandidates: [],
        withheldImpulses: ['withhold-associative-recall-noise'],
        candidateMotives: [{
          kind: 'guide',
          summary: 'Explain the current diff before moving on.',
          weight: 0.84,
          sourceTags: ['conversation-state'],
        }],
        shouldSpeak: true,
        mustInclude: ['Pay off the current knot first.'],
        mustAvoid: ['Do not drift away from the diff.'],
        confidence: 0.84,
        narrative: [],
        updatedAt: 10_000,
      },
      recallGovernor: {
        mode: 'thread',
        recallSeed: 'ProjectAtlas diff | What is wrong with this diff? | project:Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory still needs stronger end-to-end closure across turns, initiative, and embodiment.',
        suppressAssociativeRecall: true,
        allowActiveThoughts: true,
        allowRecalledFragments: false,
        recalledFragmentCap: 3,
        recalledFragmentSourceBudget: [
          { sourceKind: 'dialogue-turn', maxItems: 2 },
          { sourceKind: 'fact-ledger', maxItems: 1 },
        ],
        carryAsMemory: false,
        rationale: 'Carry the current thread without admitting associative recall.',
        narrative: [],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.conversationState?.memoryMode).toBe('task-thread')
    expect(state.dialogueWorldThread?.lastOutcome).toBe('pending')
    expect(state.replyDeliberation?.selectedMotive).toBe('guide')
    expect(state.replyDeliberation?.speakingFrom).toBe('task-thread')
    expect(state.recallGovernor?.mode).toBe('thread')
    expect(state.recallGovernor?.recallSeed).toContain('project:Alicization is a local-first digital life project')
    expect(state.recallGovernor?.recalledFragmentCap).toBe(0)
    expect(state.recallGovernor?.recalledFragmentSourceBudget).toEqual([])
  })

  it('normalizes and carries dialogue act kernel snapshots', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      dialogueActKernel: {
        subject: 'task-knot',
        hostGoal: 'resolve-problem',
        relationNeed: 'guidance',
        activeProject: 'VS Code diff',
        truthMode: 'live-grounded',
        speechAct: 'guide',
        turnMode: 'guide-current-knot',
        screenReferenceMode: 'helpful',
        speakingFrom: 'task-thread',
        selectedEvidence: [{
          kind: 'scene',
          source: 'current-scene',
          summary: 'VS Code diff with missing guard',
          confidence: 0.9,
        }],
        openingClaim: 'The missing guard is the current issue.',
        openingMove: 'State the missing guard first.',
        whyNow: 'The host is asking about the active diff.',
        mustSay: ['Answer the current diff directly.'],
        mustAvoid: ['Do not answer from stale residue.'],
        sourceTrace: ['speech-act:guide'],
        confidence: 0.9,
        updatedAt: 1,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 1,
    }, 1)

    const next = updateVisualPresenceState({
      now: 2,
      previousState: state,
      watchMode: 'mnemonic-passive',
      scene: null,
      attention: null,
      privateThought: null,
      nextSuggestedProbeMs: 45_000,
    })

    expect(state.dialogueActKernel?.speechAct).toBe('guide')
    expect(next.dialogueActKernel?.openingClaim).toContain('current issue')
    expect(next.dialogueActKernel?.selectedEvidence[0]?.summary).toContain('missing guard')
  })

  it('normalizes and persists dialogue encounter snapshots', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      dialogueEncounter: {
        act: 'continue-thread',
        responseNeed: 'answer',
        truthExpectation: 'normal',
        subject: 'general',
        screenReferenceMode: 'avoid',
        continuityMode: 'dialogue-first',
        inspectionRequested: false,
        inspectionState: 'dialogue-first',
        releaseInspectionCarry: true,
        taskAnchor: '屏幕相关对话还在串台',
        summary: '屏幕相关对话还在串台',
        dialogueFirst: true,
        shouldBypassScreenRepair: true,
        mustRepairFirst: false,
        mustAnswerDirectly: true,
        mustStayTaskBound: false,
        shouldAskClarifyingQuestion: false,
        personaKernelMode: 'backgrounded',
        confidence: 0.82,
        reasonTags: ['dialogue-first-turn', 'subject:general'],
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 1,
    }, 1)

    const next = updateVisualPresenceState({
      now: 2,
      previousState: state,
      watchMode: 'mnemonic-passive',
      scene: null,
      attention: null,
      privateThought: null,
      nextSuggestedProbeMs: 45_000,
    })

    expect(state.dialogueEncounter?.summary).toBe('屏幕相关对话还在串台')
    expect(state.dialogueEncounter?.taskAnchor).toBe('屏幕相关对话还在串台')
    expect(next.dialogueEncounter?.screenReferenceMode).toBe('avoid')
    expect(next.dialogueEncounter?.mustAnswerDirectly).toBe(true)
  })

  it('normalizes recall governor fragment cap and source budget when recalled fragments are enabled', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      recallGovernor: {
        mode: 'emotional-resonance',
        recallSeed: 'late-night debugging',
        suppressAssociativeRecall: false,
        allowActiveThoughts: true,
        allowRecalledFragments: true,
        recalledFragmentCap: 99,
        recalledFragmentSourceBudget: [
          { sourceKind: 'reflection-ledger', maxItems: 2 },
          { sourceKind: 'dialogue-turn', maxItems: 1 },
          { sourceKind: 'dialogue-turn', maxItems: 5 },
          { sourceKind: 'fact-ledger', maxItems: 1.6 },
          { sourceKind: 'unknown', maxItems: 4 },
        ],
        carryAsMemory: true,
        rationale: 'Carry resonant memory while staying answer-bound.',
        narrative: [],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.recallGovernor?.allowRecalledFragments).toBe(true)
    expect(state.recallGovernor?.recalledFragmentCap).toBe(8)
    expect(state.recallGovernor?.recalledFragmentSourceBudget).toEqual([
      { sourceKind: 'reflection-ledger', maxItems: 2 },
      { sourceKind: 'dialogue-turn', maxItems: 1 },
      { sourceKind: 'fact-ledger', maxItems: 1 },
    ])
  })

  it('preserves rich recall governor carry fields during normalization', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      recallGovernor: {
        mode: 'scene',
        recallSeed: 'repair seam',
        threadAnchors: ['callback repair seam', 'later chat return'],
        affectAnchors: ['repair_tension', 'same living line'],
        relationshipAnchors: ['repair-before-closeness', 'keep trust intact'],
        salienceBias: 0.82,
        sceneAnchor: 'Cursor diff lane with callback seam',
        sceneFamiliarityHint: 0.66,
        affectiveCarry: {
          dominantFeeling: 'repair-tension',
          urgency: 'measured',
          summary: 'Repair is still leading the return.',
        },
        embodiedCarry: {
          presenceMode: 'protective-watch',
          bodyCue: 'recovering',
          summary: 'Stay nearby but do not widen warmth yet.',
        },
        recollectionIntent: {
          objective: 'repair-grounding',
          queryHints: ['callback seam', 'scene:coding'],
          shouldFavorRecent: true,
          summary: 'Re-anchor on the live seam before broadening recall.',
        },
        suppressAssociativeRecall: true,
        allowActiveThoughts: false,
        allowRecalledFragments: false,
        recalledFragmentCap: 0,
        recalledFragmentSourceBudget: [],
        carryAsMemory: true,
        rationale: 'Repair-first continuity should stay scene-bound here.',
        narrative: ['repair before warmth'],
        updatedAt: 12_345,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 12_345,
    } as any, 12_345)

    expect(state.recallGovernor).toMatchObject({
      mode: 'scene',
      threadAnchors: ['callback repair seam', 'later chat return'],
      affectAnchors: ['repair_tension', 'same living line'],
      relationshipAnchors: ['repair-before-closeness', 'keep trust intact'],
      salienceBias: 0.82,
      sceneAnchor: 'Cursor diff lane with callback seam',
      sceneFamiliarityHint: 0.66,
      affectiveCarry: {
        dominantFeeling: 'repair-tension',
        urgency: 'measured',
      },
      embodiedCarry: {
        presenceMode: 'protective-watch',
        bodyCue: 'recovering',
      },
      recollectionIntent: {
        objective: 'repair-grounding',
        queryHints: ['callback seam', 'scene:coding'],
        shouldFavorRecent: true,
      },
      rationale: 'Repair-first continuity should stay scene-bound here.',
    })
  })

  it('preserves emotional kernel through normalization and update carry-forward', () => {
    const normalized = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'measured-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'low-pressure-presence',
        embodimentTone: 'measured-return',
        trustPressure: 0.58,
        measuredReturnNeed: 0.71,
        repairNeed: 0.12,
        selfContinuityPressure: 0.33,
        warmthBudget: 0.28,
        summary: 'The same return should stay lower-pressure for now.',
        sourceSignals: ['same seam still active', 'warmth should widen later'],
        updatedAt: 22_000,
      },
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 22_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 22_000,
    } as any, 22_000)

    expect(normalized.emotionalKernel).toMatchObject({
      dominantEmotion: 'measured-companionship',
      initiativeMode: 'observe',
      memoryRecallMode: 'low-pressure-presence',
      embodimentTone: 'measured-return',
      measuredReturnNeed: 0.71,
      summary: 'The same return should stay lower-pressure for now.',
    })

    const carried = updateVisualPresenceState({
      now: 23_000,
      previousState: normalized,
      watchMode: 'symbiotic-vision',
      scene: null,
      attention: null,
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 23_000 },
      nextSuggestedProbeMs: 20_000,
    })

    expect(carried.emotionalKernel).toEqual(normalized.emotionalKernel)
  })

  it('preserves same-her project-state continuity fields inside current conscious frame normalization', () => {
    const normalized = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the same callback line inward for now.',
        consciousTension: 'The later reopen should stay measured-return.',
        speakingIntention: 'Stay nearby without restarting from zero.',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous "her".',
          currentPhase: 'Phase 1: Local Digital Life.',
          latestLandedProgress: 'Measured-return continuity now survives noisier callback detours.',
          primaryOpenLoop: 'Project identity carry still needs stronger cross-modal closure.',
          nextClosureTarget: 'Keep Phase 1 route carry visible across resident embodiment.',
          sameHerSelfLine: 'Keep one continuous her explicit across the callback seam.',
          sameHerDriftRisk: 'Do not let this collapse into generic guidance before the same-her line holds.',
          preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life',
          preDialogueAwarenessLine: 'Before answering, remember the same digital life and the same still-open closure work.',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          continuityArcStage: 'same-thread-continuation',
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'measured-return',
        },
        updatedAt: 31_000,
      },
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 31_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 31_000,
    } as any, 31_000)

    expect(normalized.currentConsciousFrame?.projectState).toMatchObject({
      identity: expect.stringContaining('digital life'),
      primaryOpenLoop: expect.stringContaining('Project identity carry'),
      nextClosureTarget: expect.stringContaining('Phase 1 route carry'),
      sameHerDriftRisk: expect.stringContaining('generic guidance'),
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
    })
  })

  it('preserves summary-alias same-her project-state continuity fields during normalization when legacy fields are blank', () => {
    const normalized = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: {
        identity: 'Alicization is a local-first digital life project building one continuous her.',
        currentPhase: 'Phase 1: Local Digital Life.',
        latestLandedProgress: '   ',
        landedProgressSummary: 'Alias landed progress keeps the same-her closure carry alive even when the legacy slot goes blank.',
        primaryOpenLoop: '',
        openClosureSummary: 'Alias open closure keeps emotion, memory, initiative, and embodiment on one still-open living line.',
        nextClosureTarget: '',
        nextClosureTargetSummary: 'Alias next closure target keeps the same living line visible across resident embodiment carry.',
        sameHerSelfLine: 'Keep one continuous her explicit across the callback seam.',
        sameHerDriftRisk: ' ',
        sameHerDriftRiskSummary: 'If this visual carry collapses back into a generic shell when the legacy field is blank, treat that as unfinished same-her drift.',
      },
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 52_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 52_000,
    } as any, 52_000)

    expect(normalized.projectState).toMatchObject({
      latestLandedProgress: 'Alias landed progress keeps the same-her closure carry alive even when the legacy slot goes blank.',
      primaryOpenLoop: 'Alias open closure keeps emotion, memory, initiative, and embodiment on one still-open living line.',
      nextClosureTarget: 'Alias next closure target keeps the same living line visible across resident embodiment carry.',
      sameHerDriftRisk: 'If this visual carry collapses back into a generic shell when the legacy field is blank, treat that as unfinished same-her drift.',
    })
  })

  it('preserves project-state as the current conscious frame subject during normalization', () => {
    const normalized = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'guide',
        truthDiscipline: 'dialogue-first',
        consciousNeed: 'Keep the same digital life project state explicit before answering.',
        consciousTension: 'If this drifts back to generic project narration, the same-her line weakens.',
        speakingIntention: 'Answer from the living project line instead of restarting from a blank shell.',
        projectState: {
          identity: 'Alicization is a local-first digital life project building one continuous her.',
          currentPhase: 'Phase 1: Local Digital Life.',
          latestLandedProgress: 'Project-state carry already reaches the pre-dialogue mind turn.',
          primaryOpenLoop: 'The conscious frame subject still needs to stay project-state when this line is active.',
          nextClosureTarget: 'Keep project-state visible all the way into the host-visible reply.',
        },
        updatedAt: 48_000,
      },
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 48_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 48_000,
    } as any, 48_000)

    expect(normalized.currentConsciousFrame?.subject).toBe('project-state')
    expect(normalized.currentConsciousFrame?.projectState?.nextClosureTarget).toContain('host-visible reply')
  })

  it('preserves initiative continuity restraint when normalizing persisted visual presence state', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      initiative: {
        selectedAction: 'recheck',
        confidence: 0.92,
        motives: {
          clarify: 1,
        },
        speakDrive: 0.72,
        silenceDrive: 0.58,
        preferredStyle: 'silent-observe',
        preferredPresence: 'hesitant',
        continuityRestraint: 'measured-return',
        why: 'stay on the same callback line without reopening too eagerly',
        shouldSurface: true,
        shouldSpeak: false,
      },
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 10_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.initiative).toEqual(expect.objectContaining({
      selectedAction: 'recheck',
      continuityRestraint: 'measured-return',
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
    }))
  })

  it('preserves rest-protective initiative continuity restraint when normalizing persisted visual presence state', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      initiative: {
        selectedAction: 'recheck',
        confidence: 0.92,
        motives: {
          protect: 1,
        },
        speakDrive: 0.12,
        silenceDrive: 0.86,
        preferredStyle: 'silent-observe',
        preferredPresence: 'concerned',
        continuityRestraint: 'rest-protective',
        why: 'protect rest first and keep the same living line inward',
        shouldSurface: false,
        shouldSpeak: false,
      },
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 10_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.initiative).toEqual(expect.objectContaining({
      selectedAction: 'recheck',
      continuityRestraint: 'rest-protective',
      preferredStyle: 'silent-observe',
      shouldSpeak: false,
    }))
  })

  it('preserves person-state projection continuity guidance when normalizing persisted visual presence state', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      personStateProjection: {
        summary: 'project_continuity=the same callback line is already continuing lower-pressure after another detour',
        openingGuidance: 'Stay on the same callback line and keep continuing lower-pressure.',
        manifestationCadenceSummary: 'measured-return still holds while the same line continues.',
      },
      privateThought: null,
      captureState: { permission: 'granted', lastGroundedAt: 10_000 },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 20_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.personStateProjection).toEqual(expect.objectContaining({
      summary: expect.stringContaining('project_continuity=the same callback line'),
      openingGuidance: expect.stringContaining('same callback line'),
      manifestationCadenceSummary: expect.stringContaining('measured-return'),
    }))
  })
})
