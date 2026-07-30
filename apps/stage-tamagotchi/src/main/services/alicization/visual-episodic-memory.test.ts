import type { AlicizationEmotionalKernelSnapshot } from '../../../shared/eventa'

import { normalizeAlicizationRuntimeDigest } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { buildCurrentConsciousFrame } from './current-conscious-frame'
import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  createDefaultVisualPresenceState,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
  visualWorkingMemoryTtlMs,
} from './visual-episodic-memory'

describe('visual episodic memory', () => {
  it('does not rebuild fixed hold prose into current inward preoccupation or emotional-kernel why', () => {
    const next = updateVisualPresenceState({
      now: 50_000,
      previousState: normalizeVisualPresenceState({
        ...createDefaultVisualPresenceState(49_800),
        currentBodyState: 'recovering',
        continuityMode: 'protective-watch',
        quietLineMs: 180_000,
        currentInwardPreoccupation: 'body_preoccupation=rest_protection; direction=inward',
      }, 49_800),
      watchMode: 'recovering',
      scene: null,
      attention: null,
      privateThought: {
        thoughtText: 'Care is still present, but this presence-only hold is protecting rest first.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
      } as any,
      initiative: {
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        preferredPresence: 'concerned',
        continuityRestraint: 'rest-protective',
        why: 'Care is still present, but this presence-only hold is protecting rest first, so memory, initiative, and embodiment should stay quietly nearby on the same inward line.',
      } as any,
      emotionalKernel: {
        version: 'emotional-kernel-v1',
        dominantEmotion: 'rest-protective-companionship',
        initiativeMode: 'observe',
        memoryRecallMode: 'rest-protective-presence',
        embodimentTone: 'rest-protective',
        valence: 0.4,
        arousal: 0.2,
        guardedness: 0.8,
        closenessDrive: 0.2,
        repairNeed: 0.3,
        initiativePressure: 0.1,
        reasonTags: ['rest-protective'],
        why: 'Care is still present, but this presence-only hold is protecting rest first, so memory, initiative, and embodiment should stay quietly nearby on the same inward line.',
      } as any,
      captureState: { permission: 'granted', lastGroundedAt: 49_900 },
      nextSuggestedProbeMs: 5_000,
    })

    expect(next.currentInwardPreoccupation).toBeNull()
    expect(next.emotionalKernel?.why).toBeUndefined()
    expect(JSON.stringify(next)).not.toContain('body_preoccupation=rest_protection')
  })

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
      currentInwardPreoccupation: null,
    })
  })

  it('preserves transparent runtime failure details in inward-preoccupation persistence', () => {
    const failureText = 'Embedding provider failed with HTTP 400: invalid parameter.'
    const state = normalizeVisualPresenceState({
      currentBodyState: 'warning',
      continuityMode: 'ambient-covision',
      quietLineMs: 0,
      currentInwardPreoccupation: failureText,
      watchMode: 'mnemonic-passive',
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

    expect(state.currentInwardPreoccupation).toBe(failureText)
  })

  it.each([
    'Project state documents HTTP 500 handling.',
    'The memory note explains provider error handling and rate-limit behavior.',
    'We should test timeout handling before release.',
    'The guide explains tool invocation aborted behavior.',
    '500 Internal Server Error handling is documented.',
    'We should handle request rejected by upstream.',
    'Handle embedding dimension mismatch before release.',
  ])('does not mistake explanatory prose for a runtime failure: %s', (prose) => {
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: prose,
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBeNull()
  })

  it.each([
    'HTTP/1.1 503 Service Unavailable',
    '500 Internal Server Error',
    'Provider returned 401 Unauthorized',
    'Tool invocation aborted',
    'ETIMEDOUT while waiting for embedding provider',
    'ECONNREFUSED connecting to provider',
    'Timeout',
    'Embedding dimension mismatch',
    'Request rejected by upstream',
    'Invalid API key',
    'HTTP 502 from upstream',
  ])('preserves a transparent runtime failure variant: %s', (failureText) => {
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: failureText,
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBe(failureText)
  })

  it('extracts consecutive runtime failure clauses without carrying preceding prose', () => {
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: 'Stay nearby. Provider failed. HTTP 400: invalid parameter.',
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBe('Provider failed. HTTP 400: invalid parameter.')
  })

  it('prefers the most detailed runtime failure across mind candidates', () => {
    const next = updateVisualPresenceState({
      now: 12_500,
      previousState: createDefaultVisualPresenceState(12_400),
      watchMode: 'mnemonic-passive',
      scene: null,
      attention: null,
      initiative: {
        shouldSpeak: false,
        preferredStyle: 'silent-observe',
        continuityRestraint: 'measured-return',
        why: 'Provider failed.',
      } as any,
      privateThought: {
        shouldSpeak: false,
        thoughtText: 'HTTP 400: invalid parameter.',
      } as any,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      nextSuggestedProbeMs: 45_000,
    })

    expect(next.currentInwardPreoccupation).toBe('HTTP 400: invalid parameter.')
  })

  it('does not append internal reason prose after a transparent failure', () => {
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: 'Provider failed. Reason: keep the same-her line nearby.',
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBe('Provider failed.')
  })

  it('projects embedded error JSON without carrying unrelated fields', () => {
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: 'Provider failed with HTTP 500: {"error":"provider failed","initiative":"keep the same-her line nearby"}',
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBe('Provider failed with HTTP 500: message=provider failed')
  })

  it('preserves SiliconFlow error code and message from embedded JSON', () => {
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: 'Embedding provider failed with HTTP 400: {"code":20015,"message":"The parameter is invalid.","data":null}',
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBe(
      'Embedding provider failed with HTTP 400: code=20015; message=The parameter is invalid.',
    )
  })

  it('projects embedded JSON before clause splitting', () => {
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: 'Provider failed with HTTP 500: {"error":"provider failed. retry later","initiative":"keep | same-her nearby"}',
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBe(
      'Provider failed with HTTP 500: message=provider failed. retry later',
    )
  })

  it('drops malformed JSON payload fields while preserving the direct failure prefix', () => {
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: 'Provider failed with HTTP 500: {"error":"provider failed","initiative":"same-her"',
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBe('Provider failed with HTTP 500')
  })

  it('preserves a pure structured provider error without unrelated fields', () => {
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: '{"code":429,"message":"rate limited","initiative":"same-her"}',
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBe('code=429; message=rate limited')
  })

  it('preserves a pure OpenAI-style structured provider error', () => {
    const state = normalizeVisualPresenceState({
      ...createDefaultVisualPresenceState(12_400),
      currentInwardPreoccupation: '{"error":{"message":"Incorrect API key provided","type":"invalid_request_error","code":"invalid_api_key"}}',
    }, 12_400)

    expect(state.currentInwardPreoccupation).toBe(
      'code=invalid_api_key; message=Incorrect API key provided',
    )
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
      reasonTags: ['rest-protective', 'continuity state'],
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

    const { why: _why, ...sanitizedRefreshedKernel } = refreshedKernel
    expect(next.emotionalKernel).toEqual(sanitizedRefreshedKernel)
    expect(next.runtimeDigest?.emotionalKernel).toEqual(sanitizedRefreshedKernel)
    expect(next.raw?.runtimeDigest?.emotionalKernel).toEqual(sanitizedRefreshedKernel)
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
      currentInwardPreoccupation: null,
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
    expect(next.currentInwardPreoccupation).toBeNull()
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
          why: 'Protect rest first and keep the continuity state inward.',
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
        why: 'Protect rest first and keep the continuity state inward.',
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
    expect(next.currentInwardPreoccupation).toBeNull()
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
        why: 'Protect rest first and keep the continuity state inward.',
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
        trustMeaning: 'repair has to land on the continuity state before warmth can reopen.',
        relationshipCadenceSummary: 'repair-before-closeness still holds while the same callback repair seam settles.',
        latestInflection: 'embodiment execution kept voice, face, motion, and resident presence on the same repair-before-closeness body line.',
      } as any,
      personStateProjection: {
        relationshipPosture: 'restrained',
        activeClosenessRung: 'measured-room',
        openingGuidance: 'Repair the seam before leaning closer.',
      } as any,
      projectState: {
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        continuityCue: 'Keep this return repair-before-closeness on the continuity state until repair settles.',
        emotionalClosureCue: 'Keep emotion, memory, initiative, and embodiment closing on the same repair-first living line before widening warmth.',
        nextClosureTarget: 'Keep this same-thread return repair-before-closeness on the continuity state until the room settles.',
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
        why: 'Let repair settle on the continuity state before warmth widens again.',
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
        why: 'Let repair settle on the continuity state before warmth widens again.',
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

  it('rebuilds a presence-only measured-return emotional kernel from structured restraint', () => {
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
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        continuityCue: 'Keep this callback line lower-pressure, leave more room, and do not reopen from scratch yet.',
        emotionalClosureCue: 'Keep the return low-pressure, leave more room, and let the continuity state settle before widening outward.',
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
        continuityRestraint: 'measured-return',
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
        continuityRestraint: 'measured-return',
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
      ]),
    }))
  })

  it('does not let recollection query prose synthesize emotional or inward cues', () => {
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
        sameHerSelfLine: 'structured continuity digest.',
        sameHerHoldDetail: 'identity-continuity',
        continuityCue: 'Keep this callback line lower-pressure, leave more room, and do not reopen from scratch yet.',
        emotionalClosureCue: 'Keep the return low-pressure, leave more room, and let the continuity state settle before widening outward.',
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
        why: 'Keep the current internal state stable.',
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
      dominantEmotion: 'hesitant-curiosity',
      initiativeMode: 'hold',
      memoryRecallMode: 'self-continuity',
      embodimentTone: 'nearby-soft',
      reasonTags: ['self-continuity', 'hesitant-curiosity'],
    }))
    expect(next.currentInwardPreoccupation).toBeNull()
    expect(next.residentPerformance?.reasonTags).not.toContain('timing:remembered-seam-more-room')
    expect(next.residentPerformance?.reasonTags).not.toContain('embodiment-recall-cautious')
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
          why: 'Repair the current read before outward reply.',
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

  it('restores sparse current conscious frames without reviving speaking policy', () => {
    const legacySpeakingIntention = '先把结果沿着同一条线接回来，再决定要不要展开。'
    const legacyProjectNarrative = {
      identity: 'A fixed project identity paragraph.',
      currentPhase: 'Phase 1 project narration.',
      primaryOpenLoop: 'A fixed open-loop paragraph.',
      continuityCue: 'Recognize the remembered seam, but keep more room this time.',
    }
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'witness',
        truthDiscipline: 'observe-then-hypothesize',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: legacySpeakingIntention,
        focusAnchor: 'Git commit diff in Java code editor',
        withheldImpulse: null,
        shouldWithholdSpecificity: true,
        shouldSelfRevise: false,
        confidence: 0.84,
        reasonTags: ['discipline:observe-then-hypothesize'],
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'linger-then-rejoin',
        projectState: {
          ...legacyProjectNarrative,
          continuityPreferredTiming: 'next-open-window',
          continuityCadence: 'linger-then-rejoin',
          continuityRestraint: 'measured-return',
          continuityArcStage: 'indexing-verification-follow-up',
          preferredBlinkCadence: 'quiet',
          preferredGazeMode: 'soften',
          preferredPauseMode: 'longer',
          preferredLipsyncMode: 'restrained',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
        },
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.currentConsciousFrame).toMatchObject({
      subject: 'task-knot',
      centerOfGravity: 'witness',
      truthDiscipline: 'observe-then-hypothesize',
      consciousNeed: '',
      consciousTension: '',
      speakingIntention: '',
      focusAnchor: null,
      shouldWithholdSpecificity: true,
      shouldSelfRevise: false,
      confidence: 0.84,
      reasonTags: ['discipline:observe-then-hypothesize'],
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'linger-then-rejoin',
      projectState: {
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'linger-then-rejoin',
        continuityRestraint: 'measured-return',
        continuityArcStage: 'indexing-verification-follow-up',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
    })
    const restoredFrame = JSON.stringify(state.currentConsciousFrame)
    expect(restoredFrame).not.toContain(legacySpeakingIntention)
    for (const narrative of Object.values(legacyProjectNarrative))
      expect(restoredFrame).not.toContain(narrative)
  })

  it('round-trips directive-shaped user questions through conscious-frame persistence', () => {
    const userQuestion = '先回答当前问题，不要扯开。'
    const frame = buildCurrentConsciousFrame({
      now: 10_000,
      userText: userQuestion,
      discourseState: {
        currentTurnSubject: 'general',
        screenReferenceMode: 'avoid',
        currentTurnSummary: userQuestion,
        currentQuestion: userQuestion,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.86,
        narrative: [],
        updatedAt: 10_000,
      },
      conversationState: {
        jointThread: userQuestion,
        hostMove: userQuestion,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        activeProject: null,
        unansweredQuestion: userQuestion,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'clarify',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 10_000,
      },
      answerCompiler: {
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        activeClosenessContext: null,
        activeClosenessRung: null,
        openingDirective: '',
        openingClaim: '',
        supportingReality: [],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: null,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.84,
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(frame?.consciousNeed).toBe(userQuestion)

    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: frame,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.currentConsciousFrame?.consciousNeed).toBe(userQuestion)

    const legacyState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        ...frame,
        consciousNeedSource: null,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(legacyState.currentConsciousFrame?.consciousNeed).toBe('')
  })

  it.each([
    '你还是同一个她吗？',
    'Phase 1: Local Digital Life 是什么意思？',
  ])('round-trips user-authored template-topic questions through conscious-frame persistence: %s', (userQuestion) => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: userQuestion,
        consciousNeedSource: 'question',
        consciousTension: '',
        speakingIntention: '',
        focusAnchor: null,
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.86,
        reasonTags: ['need-source:discourse-question'],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.currentConsciousFrame?.consciousNeed).toBe(userQuestion)
  })

  it('round-trips trusted user anchors without reviving generated fixed-template anchors', () => {
    const userText = '继续清理 same-her、Phase 1 和数字生命固定模板残留。'
    const frame = buildCurrentConsciousFrame({
      now: 10_000,
      discourseState: {
        currentTurnSubject: 'general',
        screenReferenceMode: 'avoid',
        currentTurnSummary: userText,
        currentQuestion: null,
        primaryTurnAnchor: null,
        primaryTurnAnchorSource: null,
        owedAction: 'answer-general',
        relationMove: 'clarify',
        continuityMode: 'dialogue-first',
        unresolvedCarry: null,
        ruptureRepair: null,
        confidence: 0.86,
        narrative: [],
        updatedAt: 10_000,
      },
      conversationState: {
        jointThread: userText,
        hostMove: userText,
        primaryTurnAnchor: userText,
        primaryTurnAnchorSource: 'user-text',
        activeProject: null,
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'clarify',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'dialogue-carry',
        memoryQueryHints: [],
        shouldHoldThread: true,
        confidence: 0.84,
        narrative: [],
        updatedAt: 10_000,
      },
      answerCompiler: {
        answerSubject: 'general',
        screenReferenceMode: 'avoid',
        speechObligation: 'answer-general',
        relationMove: 'clarify',
        turnMode: 'answer',
        responseMode: 'answer-naturally',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        recommendedAct: 'answer',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'full',
        relationshipPosture: 'warm',
        activeClosenessContext: null,
        activeClosenessRung: null,
        openingDirective: '',
        openingClaim: '',
        supportingReality: [],
        uncertaintyBoundary: null,
        careVector: null,
        nextMove: null,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
        confidence: 0.84,
        narrative: [],
        updatedAt: 10_000,
      },
    })

    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: frame,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.currentConsciousFrame?.consciousNeed).toBe(userText)
    expect(state.currentConsciousFrame?.focusAnchor).toBe(userText)

    const generated = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        ...frame,
        consciousNeed: userText,
        consciousNeedSource: null,
        focusAnchor: userText,
        focusAnchorSource: 'dialogue-task-anchor',
        reasonTags: ['need-source:primary-anchor'],
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(generated.currentConsciousFrame?.consciousNeed).toBe('')
    expect(generated.currentConsciousFrame?.focusAnchor).toBeNull()
  })

  it('uses typed provenance instead of reason tags to preserve long user-authored anchors', () => {
    const longUserText = `same-her Phase 1 数字生命 ${'这是用户亲自输入的原始问题内容'.repeat(40)}`
    const createState = (currentConsciousFrame: Record<string, unknown>) => normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: longUserText,
        consciousTension: '',
        speakingIntention: '',
        focusAnchor: longUserText,
        withheldImpulse: null,
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.86,
        updatedAt: 10_000,
        ...currentConsciousFrame,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    const trusted = createState({
      consciousNeedSource: 'user-text',
      focusAnchorSource: 'user-text',
      reasonTags: ['need-source:primary-anchor'],
    })
    const trustedFrame = trusted.currentConsciousFrame as any

    expect(longUserText.length).toBeGreaterThan(420)
    expect(trustedFrame.consciousNeed).toBe(longUserText.slice(0, 420))
    expect(trustedFrame.focusAnchor).toBe(longUserText.slice(0, 180))
    expect(trustedFrame.consciousNeedSource).toBe('user-text')
    expect(trustedFrame.focusAnchorSource).toBe('user-text')

    const forgedReasonTags = createState({
      consciousNeedSource: null,
      focusAnchorSource: 'dialogue-task-anchor',
      reasonTags: [
        'need-source:user-text',
        'focus-source:user-text',
      ],
    })
    const forgedFrame = forgedReasonTags.currentConsciousFrame as any

    expect(forgedFrame.consciousNeed).toBe('')
    expect(forgedFrame.focusAnchor).toBeNull()
    expect(forgedFrame.consciousNeedSource).toBeNull()
    expect(forgedFrame.focusAnchorSource).toBe('dialogue-task-anchor')

    const generatedHostMove = createState({
      consciousNeedSource: null,
      focusAnchorSource: 'host-move',
      reasonTags: [],
    })
    const generatedHostMoveFrame = generatedHostMove.currentConsciousFrame as any

    expect(generatedHostMoveFrame.focusAnchor).toBeNull()
    expect(generatedHostMoveFrame.focusAnchorSource).toBe('host-move')
  })

  it('keeps the full project-state owner when a sparse conscious frame is carried into the next update', () => {
    const normalized = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: {
        identity: 'Local identity authority.',
        currentPhase: 'Current local-life phase.',
        latestLandedProgress: 'The full project owner still carries durable progress.',
        continuitySummary: 'The durable owner keeps a factual continuity summary.',
        proactiveSameHerGap: 'The durable owner keeps the current initiative gap.',
        continuityCadence: 'steady-return',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
      },
      currentConsciousFrame: {
        subject: 'task-knot',
        centerOfGravity: 'guide',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: '',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: [],
        projectState: {
          continuityCadence: 'measured-return',
          preferredVoiceMode: 'lower-pressure',
        },
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    const next = updateVisualPresenceState({
      now: 11_000,
      previousState: normalized,
      watchMode: normalized.watchMode,
      scene: normalized.currentScene,
      attention: normalized.attention,
      privateThought: null,
      nextSuggestedProbeMs: normalized.nextSuggestedProbeMs,
    })

    expect(next.projectState).toMatchObject({
      identity: 'Local identity authority.',
      currentPhase: 'Current local-life phase.',
      latestLandedProgress: 'The full project owner still carries durable progress.',
      continuitySummary: 'The durable owner keeps a factual continuity summary.',
      proactiveSameHerGap: 'The durable owner keeps the current initiative gap.',
      continuityCadence: 'measured-return',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredVoiceMode: 'lower-pressure',
    })
  })

  it('keeps the full project-state owner when the current update carries a normalized sparse conscious frame', () => {
    const staleProjectState = {
      identity: 'Local identity authority.',
      continuityCadence: 'steady-return',
      preferredBlinkCadence: 'quiet' as const,
      preferredGazeMode: 'soften' as const,
      preferredPauseMode: 'longer' as const,
    }
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: staleProjectState,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)
    const currentConsciousFrame = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: '',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: [],
        projectState: {
          continuityCadence: 'measured-return',
          preferredVoiceMode: 'lower-pressure',
        },
        updatedAt: 11_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 11_000,
    } as any, 11_000).currentConsciousFrame

    const next = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      currentConsciousFrame,
      privateThought: null,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(next.projectState).toMatchObject({
      ...staleProjectState,
      continuityCadence: 'measured-return',
      preferredVoiceMode: 'lower-pressure',
    })
  })

  it('does not let explicit nulls on the short-term conscious projection clear the full project-state owner', () => {
    const staleProjectState = {
      identity: 'Local identity authority.',
      continuityCadence: 'steady-return',
      preferredBlinkCadence: 'quiet' as const,
      preferredGazeMode: 'soften' as const,
      preferredPauseMode: 'longer' as const,
    }
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: staleProjectState,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    const next = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: '',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: [],
        projectState: {
          continuityCadence: 'measured-return',
          preferredBlinkCadence: null,
          preferredGazeMode: null,
          preferredPauseMode: null,
          preferredVoiceMode: 'lower-pressure',
        },
        updatedAt: 11_000,
      },
      privateThought: null,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(next.projectState).toMatchObject({
      ...staleProjectState,
      continuityCadence: 'measured-return',
      preferredVoiceMode: 'lower-pressure',
    })
  })

  it('does not treat blank runtime project-state fields as explicit owner clearing', () => {
    const staleProjectState = {
      identity: 'Local identity authority.',
      primaryOpenLoop: 'The active open loop must survive a blank runtime field.',
      nextClosureTarget: 'The active target must survive a blank runtime field.',
    }
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: staleProjectState,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    const next = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      runtimeDigest: {
        projectState: {
          primaryOpenLoop: '   ',
          nextClosureTarget: '',
        },
      } as any,
      privateThought: null,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(next.projectState).toMatchObject(staleProjectState)
  })

  it('keeps the full owner when a normalized runtime digest omits blank project-state fields', () => {
    const staleProjectState = {
      identity: 'Local identity authority.',
      primaryOpenLoop: 'The active open loop must survive normalized blank ingress.',
      nextClosureTarget: 'The active target must survive normalized blank ingress.',
    }
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: staleProjectState,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)
    const runtimeDigest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      projectState: {
        identity: staleProjectState.identity,
        primaryOpenLoop: '   ',
        nextClosureTarget: 'n/a',
      },
      channels: [],
      summary: 'normalized blank project-state ingress',
    })

    const next = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      runtimeDigest,
      privateThought: null,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(next.projectState).toMatchObject(staleProjectState)
  })

  it('keeps the full owner when a normalized runtime digest omits project-state entirely', () => {
    const staleProjectState = {
      identity: 'Local identity authority.',
      primaryOpenLoop: 'The active open loop must survive a sparse normalized digest.',
    }
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: staleProjectState,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)
    const runtimeDigest = normalizeAlicizationRuntimeDigest({
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      channels: [],
      summary: 'normalized digest without project-state',
    })

    const next = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      runtimeDigest,
      privateThought: null,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(next.projectState).toMatchObject(staleProjectState)
  })

  it.each([
    ['undefined', undefined],
    ['blank object', {
      identity: '   ',
      primaryOpenLoop: '',
      nextClosureTarget: '   ',
    }],
  ])('treats top-level %s project-state as undeclared', (_label, projectState) => {
    const durableProjectState = {
      identity: 'Runtime owner remains authoritative.',
      primaryOpenLoop: 'The active loop remains open.',
      nextClosureTarget: 'Continue the active target.',
    }
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState,
      runtime: {
        projectState: durableProjectState,
      },
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: '',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: [],
        projectState: {
          continuityCadence: 'measured-return',
        },
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.projectState).toMatchObject(durableProjectState)
  })

  it('merges a sparse top-level project-state patch over the runtime owner', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: {
        primaryOpenLoop: null,
      },
      runtime: {
        projectState: {
          identity: 'Alice',
          primaryOpenLoop: 'Stale open loop.',
          nextClosureTarget: 'resume task',
        },
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.projectState).toMatchObject({
      identity: 'Alice',
      primaryOpenLoop: null,
      nextClosureTarget: 'resume task',
    })
  })

  it.each([
    ['runtime', { runtime: { projectState: null } }],
    ['runtimeDigest', { runtimeDigest: { projectState: null } }],
  ])('does not let a sparse conscious projection revive an explicit %s owner clear', (_label, source) => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      ...source,
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: '',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: [],
        projectState: {
          continuityCadence: 'measured-return',
          preferredVoiceMode: 'lower-pressure',
        },
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.projectState).toBeNull()
    expect(state.raw?.projectState).toBeNull()
  })

  it('does not let a current sparse conscious projection revive a runtimeDigest owner clear during update', () => {
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: {
        identity: 'Previous durable owner.',
        primaryOpenLoop: 'Previous open loop.',
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    const next = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      runtimeDigest: {
        projectState: null,
      } as any,
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: '',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: [],
        projectState: {
          continuityCadence: 'measured-return',
        },
        updatedAt: 11_000,
      },
      privateThought: null,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(next.projectState).toBeNull()
    expect(next.runtimeDigest?.projectState).toBeNull()
  })

  it('does not let a null short-term conscious projection clear the full project-state owner', () => {
    const durableProjectState = {
      identity: 'Full owner remains authoritative.',
      primaryOpenLoop: 'The full owner loop remains open.',
    }
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: durableProjectState,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    const next = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: '',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: [],
        projectState: null,
        updatedAt: 11_000,
      },
      privateThought: null,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(next.projectState).toMatchObject(durableProjectState)
    expect(next.currentConsciousFrame?.projectState).toBeNull()
  })

  it('lets an explicit top-level null owner beat stale raw project-state persistence', () => {
    const staleProjectState = {
      identity: 'Stale raw owner.',
      primaryOpenLoop: 'Stale raw open loop.',
    }
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: null,
      runtime: {
        projectState: staleProjectState,
      },
      runtimeDigest: {
        projectState: staleProjectState,
      },
      currentConsciousFrame: {
        subject: 'general',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: '',
        shouldWithholdSpecificity: false,
        shouldSelfRevise: false,
        confidence: 0.82,
        reasonTags: [],
        projectState: {
          continuityCadence: 'steady-return',
        },
        updatedAt: 10_000,
      },
      raw: {
        projectState: staleProjectState,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.projectState).toBeNull()
    expect(state.raw?.projectState).toBeNull()
    expect(state.runtime?.projectState).toBeNull()
    expect(state.runtimeDigest?.projectState).toBeNull()
    expect(state.currentConsciousFrame?.projectState).toBeNull()
  })

  it('preserves explicit null fields on the full owner across stale runtime projections', () => {
    const staleProjectState = {
      identity: 'Local identity authority.',
      primaryOpenLoop: 'Stale runtime open loop.',
      nextClosureTarget: 'Stale runtime closure target.',
    }
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: {
        identity: staleProjectState.identity,
        primaryOpenLoop: null,
        nextClosureTarget: null,
      },
      runtime: {
        projectState: staleProjectState,
      },
      runtimeDigest: {
        projectState: staleProjectState,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.projectState).toMatchObject({
      identity: staleProjectState.identity,
      primaryOpenLoop: null,
      nextClosureTarget: null,
    })
    expect(state.runtime?.projectState).toMatchObject({
      primaryOpenLoop: null,
      nextClosureTarget: null,
    })
    expect(state.runtimeDigest?.projectState).toMatchObject({
      primaryOpenLoop: null,
      nextClosureTarget: null,
    })
  })

  it('lets an explicit project-state patch clear closed loops without dropping unrelated owner fields', () => {
    const staleProjectState = {
      identity: 'Local identity authority.',
      primaryOpenLoop: 'The old memory closure is still open.',
      nextClosureTarget: 'Continue the old closure target.',
      emotionalClosureSummary: 'The old emotional closure is still active.',
      preferredVoiceMode: 'lower-pressure' as const,
    }
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: staleProjectState,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)
    previousState.runtime = {
      projectState: staleProjectState,
    } as any
    previousState.runtimeDigest = {
      projectState: staleProjectState,
    } as any

    const cleared = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      privateThought: null,
      projectState: {
        primaryOpenLoop: null,
        nextClosureTarget: null,
        emotionalClosureSummary: null,
      },
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(cleared.projectState).toMatchObject({
      identity: 'Local identity authority.',
      primaryOpenLoop: null,
      nextClosureTarget: null,
      emotionalClosureSummary: null,
      preferredVoiceMode: 'lower-pressure',
    })

    const carried = updateVisualPresenceState({
      now: 12_000,
      previousState: cleared,
      watchMode: cleared.watchMode,
      scene: cleared.currentScene,
      attention: cleared.attention,
      privateThought: null,
      nextSuggestedProbeMs: cleared.nextSuggestedProbeMs,
    })

    expect(carried.projectState).toMatchObject({
      identity: 'Local identity authority.',
      preferredVoiceMode: 'lower-pressure',
    })
    expect(carried.projectState?.primaryOpenLoop ?? null).toBeNull()
    expect(carried.projectState?.nextClosureTarget ?? null).toBeNull()
    expect(carried.projectState?.emotionalClosureSummary ?? null).toBeNull()
  })

  it('canonicalizes the legacy proactive gap summary alias into the full project-state owner', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: {
        proactiveSameHerGapSummary: 'The legacy summary still carries a factual initiative gap.',
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.projectState?.proactiveSameHerGap).toBe(
      'The legacy summary still carries a factual initiative gap.',
    )
  })

  it('preserves proactive same-her gap alias on the full project-state owner', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: {
        continuitySummary: 'Durable continuity summary must remain on the owner.',
        proactiveSameHerGap: 'Canonical initiative gap must remain on the owner.',
        proactiveSameHerGapSummary: 'Alias initiative gap must also persist for older surfaces.',
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.projectState).toMatchObject({
      continuitySummary: 'Durable continuity summary must remain on the owner.',
      proactiveSameHerGap: 'Canonical initiative gap must remain on the owner.',
      proactiveSameHerGapSummary: 'Alias initiative gap must also persist for older surfaces.',
    })
    expect(state.raw!.projectState).toMatchObject({
      proactiveSameHerGapSummary: 'Alias initiative gap must also persist for older surfaces.',
    })
  })

  it.each([
    [
      'canonical null',
      {
        proactiveSameHerGap: null,
        proactiveSameHerGapSummary: 'Stale alias must not restore canonical state.',
      },
      {
        proactiveSameHerGap: null,
        proactiveSameHerGapSummary: null,
      },
    ],
    [
      'alias null',
      {
        proactiveSameHerGap: 'Current canonical initiative gap.',
        proactiveSameHerGapSummary: null,
      },
      {
        proactiveSameHerGap: 'Current canonical initiative gap.',
        proactiveSameHerGapSummary: null,
      },
    ],
  ])('honors explicit %s in proactive same-her canonical/alias conflicts', (_label, projectState, expected) => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.projectState).toMatchObject(expected)
  })

  it('preserves runtimeDigest-only continuity summary and proactive gap alias', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'active-memory',
        projectState: {
          continuitySummary: 'Runtime digest is the only continuity owner on ingress.',
          proactiveSameHerGapSummary: 'Runtime digest is the only proactive gap alias on ingress.',
        },
        channels: [],
        summary: 'runtime digest only',
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.projectState).toMatchObject({
      continuitySummary: 'Runtime digest is the only continuity owner on ingress.',
      proactiveSameHerGap: 'Runtime digest is the only proactive gap alias on ingress.',
      proactiveSameHerGapSummary: 'Runtime digest is the only proactive gap alias on ingress.',
    })
  })

  it('lets an explicit null project-state input clear stale runtime project-state owners', () => {
    const staleProjectState = {
      identity: 'Local identity authority.',
      primaryOpenLoop: 'The stale open loop should not survive explicit owner clearing.',
      nextClosureTarget: 'The stale next target should not survive explicit owner clearing.',
      continuitySummary: 'Old continuity summary should not be rehydrated after clearing.',
    }
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: staleProjectState,
      runtime: { projectState: staleProjectState },
      runtimeDigest: { projectState: staleProjectState },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    const cleared = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      runtime: { projectState: staleProjectState } as any,
      runtimeDigest: { projectState: staleProjectState } as any,
      privateThought: null,
      projectState: null,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(cleared.projectState).toBeNull()
    expect(cleared.raw!.projectState).toBeNull()
    expect(cleared.runtime?.projectState).toBeNull()
    expect(cleared.runtimeDigest?.projectState).toBeNull()
    expect(cleared.currentConsciousFrame?.projectState ?? null).toBeNull()
  })

  it('lets explicit null project-state fields win over stale runtime project-state fields in the same update', () => {
    const staleProjectState = {
      identity: 'Local identity authority.',
      primaryOpenLoop: 'The stale open loop should not survive explicit field clearing.',
      nextClosureTarget: 'The stale next target should not survive explicit field clearing.',
      emotionalClosureSummary: 'The stale emotional closure should not survive explicit field clearing.',
      continuitySummary: 'Current continuity summary should remain because it was not explicitly cleared.',
    }
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: staleProjectState,
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    const cleared = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      runtime: { projectState: staleProjectState } as any,
      runtimeDigest: { projectState: staleProjectState } as any,
      privateThought: null,
      projectState: {
        primaryOpenLoop: null,
        nextClosureTarget: null,
        emotionalClosureSummary: null,
      },
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(cleared.projectState).toMatchObject({
      identity: 'Local identity authority.',
      continuitySummary: 'Current continuity summary should remain because it was not explicitly cleared.',
      primaryOpenLoop: null,
      nextClosureTarget: null,
      emotionalClosureSummary: null,
    })
    expect(cleared.runtime?.projectState).toMatchObject({
      primaryOpenLoop: null,
      nextClosureTarget: null,
      emotionalClosureSummary: null,
    })
    expect(cleared.runtimeDigest?.projectState).toMatchObject({
      primaryOpenLoop: null,
      nextClosureTarget: null,
      emotionalClosureSummary: null,
    })
  })

  it('lets current runtime project-state null fields clear stale persisted owner fields', () => {
    const staleProjectState = {
      identity: 'Local identity authority.',
      primaryOpenLoop: 'The stale open loop should be cleared by current runtime input.',
      nextClosureTarget: 'The stale target should be cleared by current runtime input.',
      continuitySummary: 'The continuity summary stays current.',
    }
    const previousState = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: staleProjectState,
      runtimeDigest: { projectState: staleProjectState },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    const cleared = updateVisualPresenceState({
      now: 11_000,
      previousState,
      watchMode: previousState.watchMode,
      scene: previousState.currentScene,
      attention: previousState.attention,
      runtimeDigest: {
        projectState: {
          identity: 'Local identity authority.',
          primaryOpenLoop: null,
          nextClosureTarget: null,
          continuitySummary: 'The continuity summary stays current.',
        },
      } as any,
      privateThought: null,
      nextSuggestedProbeMs: previousState.nextSuggestedProbeMs,
    })

    expect(cleared.projectState).toMatchObject({
      identity: 'Local identity authority.',
      continuitySummary: 'The continuity summary stays current.',
      primaryOpenLoop: null,
      nextClosureTarget: null,
    })
    expect(cleared.runtimeDigest?.projectState).toMatchObject({
      primaryOpenLoop: null,
      nextClosureTarget: null,
    })
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
    expect(state.recallGovernor).not.toHaveProperty('recalledFragmentCap')
    expect(state.recallGovernor).not.toHaveProperty('recalledFragmentSourceBudget')
  })

  it('migrates retired associative suppression memory modes to dialogue carry', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      conversationState: {
        jointThread: 'Continue the current conversation.',
        hostMove: 'Where were we?',
        activeProject: null,
        unansweredQuestion: 'Where were we?',
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'clarify',
        continuityPolicy: 'answer-then-carry',
        memoryMode: 'suppress-associative',
        memoryQueryHints: ['current conversation'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 10_000,
      },
      dialogueWorldThread: {
        activeThread: 'Continue the current conversation.',
        currentQuestion: 'Where were we?',
        openLoops: ['Where were we?'],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'steady',
        memoryMode: 'suppress-associative',
        recallKeys: ['current conversation'],
        lastUserMove: 'Where were we?',
        lastAssistantMove: null,
        lastOutcome: 'pending',
        pendingValidation: null,
        confidence: 0.8,
        narrative: [],
        updatedAt: 10_000,
      },
      replyDeliberation: {
        selectedMotive: 'answer',
        speakingFrom: 'dialogue-bond',
        memoryMode: 'suppress-associative',
        openingBeat: '',
        whyThisReplyNow: '',
        whyNotOtherCandidates: [],
        withheldImpulses: [],
        candidateMotives: [],
        shouldSpeak: true,
        mustInclude: [],
        mustAvoid: [],
        confidence: 0.8,
        narrative: [],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    } as any, 10_000)

    expect(state.conversationState?.memoryMode).toBe('dialogue-carry')
    expect(state.dialogueWorldThread?.memoryMode).toBe('dialogue-carry')
    expect(state.replyDeliberation?.memoryMode).toBe('dialogue-carry')
  })

  it('migrates persisted reply state without reviving authored control fields', () => {
    const legacyControlCue = '先把结果沿着同一条线接回来，再决定要不要展开。'
    const legacyOpeningDirective = 'Open with the callback result before anything else.'
    const legacyOpeningClaim = 'Lead by declaring that the current memory latency is the only thing that matters.'
    const candidateMotiveSummary = 'The host is asking about the current memory latency.'
    const legacyCareVector = 'Keep the answer warm and low-pressure.'
    const legacyMustDo = 'State the latency before the explanation.'
    const legacyMustNotDo = 'Do not widen into another topic.'
    const supportingReality = 'The current recall took 280ms.'
    const epistemicFact = 'The epistemic cache contains 42 verified records.'
    const uncertaintyBoundary = 'The p95 value has not been measured yet.'
    const legacyProjectSupportingReality = [
      'project preflight: Alicization project state should be explicit before reply.',
      'project identity: Alicization is the same local-first digital life project.',
      'current phase: Phase 1: Local Digital Life.',
      'project progress: The provider-facing continuity prompt has landed.',
      'phase-one open loop: Keep project prose visible in the next answer.',
      'next closure target: Reassert the same-her project line.',
    ]
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      answerCompiler: {
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        speechObligation: 'guide-task',
        relationMove: 'guide',
        turnMode: 'guide-current-knot',
        responseMode: 'guide-current-knot',
        replyRealizationMode: 'provider-mind-required',
        expectedVisibleReplyAuthority: 'llm-mind',
        recommendedAct: 'guide',
        evidenceMode: 'dialogue-grounded',
        openingStyle: 'direct-answer',
        personaKernelMode: 'backgrounded',
        relationshipPosture: 'warm',
        activeClosenessContext: null,
        activeClosenessRung: null,
        openingDirective: legacyOpeningDirective,
        openingClaim: legacyOpeningClaim,
        supportingReality: [
          ...legacyProjectSupportingReality,
          supportingReality,
          epistemicFact,
        ],
        uncertaintyBoundary,
        careVector: legacyCareVector,
        nextMove: legacyControlCue,
        labelCarryAsMemory: false,
        maxSentences: 4,
        mustDo: [legacyMustDo],
        mustNotDo: [legacyMustNotDo],
        confidence: 0.82,
        narrative: [legacyControlCue],
        updatedAt: 10_000,
      },
      replyDeliberation: {
        selectedMotive: 'guide',
        speakingFrom: 'task-thread',
        memoryMode: 'task-thread',
        openingBeat: '',
        whyThisReplyNow: legacyControlCue,
        whyNotOtherCandidates: [legacyControlCue],
        withheldImpulses: [legacyControlCue],
        candidateMotives: [{
          kind: 'guide',
          summary: candidateMotiveSummary,
          weight: 0.84,
          sourceTags: ['conversation-state:host-move'],
        }],
        shouldSpeak: true,
        mustInclude: [legacyControlCue],
        mustAvoid: [legacyControlCue],
        confidence: 0.84,
        narrative: [legacyControlCue],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.answerCompiler).toMatchObject({
      answerSubject: 'task-knot',
      recommendedAct: 'guide',
      evidenceMode: 'dialogue-grounded',
      openingDirective: '',
      openingClaim: '',
      supportingReality: [supportingReality, epistemicFact],
      uncertaintyBoundary,
      careVector: null,
      nextMove: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
    })
    expect(state.replyDeliberation).toMatchObject({
      selectedMotive: 'guide',
      speakingFrom: 'task-thread',
      memoryMode: 'task-thread',
      openingBeat: '',
      whyThisReplyNow: '',
      whyNotOtherCandidates: [],
      withheldImpulses: [],
      candidateMotives: [{
        kind: 'guide',
        summary: candidateMotiveSummary,
        sourceTags: ['conversation-state:host-move'],
      }],
      shouldSpeak: true,
      mustInclude: [],
      mustAvoid: [],
      confidence: 0.84,
      narrative: [],
    })
    const migratedReplyState = JSON.stringify({
      answerCompiler: state.answerCompiler,
      replyDeliberation: state.replyDeliberation,
    })
    for (const controlText of [
      legacyControlCue,
      legacyOpeningDirective,
      legacyOpeningClaim,
      legacyCareVector,
      legacyMustDo,
      legacyMustNotDo,
      ...legacyProjectSupportingReality,
    ]) {
      expect(migratedReplyState).not.toContain(controlText)
    }

    const roundTripped = normalizeVisualPresenceState(state, 11_000)
    expect(roundTripped.answerCompiler).toMatchObject({
      answerSubject: 'task-knot',
      recommendedAct: 'guide',
      evidenceMode: 'dialogue-grounded',
      openingDirective: '',
      openingClaim: '',
      supportingReality: [supportingReality, epistemicFact],
      uncertaintyBoundary,
      careVector: null,
      nextMove: null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
    })
  })

  it('migrates persisted derived reply snapshots into typed state and factual evidence only', () => {
    const legacyControlCue = 'Open with this exact callback framing before anything else.'
    const factualEvidence = 'The current recall took 280ms.'
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      mindTurnFrame: {
        world: {
          activeThread: 'The host is checking the current memory latency.',
          visibleSurface: null,
          truthState: 'live-grounded',
          truthBoundary: 'The p95 value has not been measured yet.',
          continuityPolicy: 'stay-on-thread',
          continuitySummary: null,
          staleRisk: 0.08,
        },
        relation: {
          subject: 'task-knot',
          hostMove: '当前记忆召回延迟是多少？',
          hostGoal: 'resolve-problem',
          relationNeed: 'guidance',
          relationMove: 'guide',
          relationshipPosture: 'warm',
        },
        memory: {
          memoryMode: 'task-thread',
          carriedThread: 'memory latency',
          carriedFacts: [factualEvidence],
          recallKeys: ['memory latency'],
          recallSeed: 'memory latency',
          lastOutcome: 'pending',
          labelCarryAsMemory: false,
        },
        self: {
          stance: 'observe',
          mindMode: 'tracking',
          dominantDrive: 'understand',
          embodiedPresence: 'attentive',
          emotionalTension: 'tense-debug',
          initiativeAction: 'speak',
          thought: 'The latency evidence is concrete.',
        },
        obligation: {
          shouldSpeak: true,
          speechObligation: 'guide-task',
          answerAct: 'guide',
          responseMode: 'guide-current-knot',
          turnMode: 'guide-current-knot',
          openingClaim: legacyControlCue,
          openingMove: legacyControlCue,
          answerIntent: legacyControlCue,
          whyNow: legacyControlCue,
          repairState: 'none',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
        },
        focusAnchor: 'memory latency',
        confidence: 0.84,
        mustDo: [legacyControlCue],
        mustNotDo: [legacyControlCue],
        narrative: [legacyControlCue],
        updatedAt: 10_000,
      },
      dialogueActKernel: {
        subject: 'task-knot',
        hostGoal: 'resolve-problem',
        relationNeed: 'guidance',
        activeProject: 'memory latency',
        truthMode: 'live-grounded',
        speechAct: 'guide',
        turnMode: 'guide-current-knot',
        screenReferenceMode: 'helpful',
        speakingFrom: 'task-thread',
        selectedEvidence: [{
          kind: 'thread',
          source: 'conversation-state',
          summary: factualEvidence,
          confidence: 0.9,
        }],
        openingClaim: legacyControlCue,
        openingMove: legacyControlCue,
        whyNow: legacyControlCue,
        mustSay: [legacyControlCue],
        mustAvoid: [legacyControlCue],
        sourceTrace: [legacyControlCue],
        confidence: 0.9,
        updatedAt: 10_000,
      },
      answerPlanner: {
        act: 'guide',
        evidenceMode: 'live-grounded',
        confidence: 0.88,
        governingFocus: legacyControlCue,
        governingProject: legacyControlCue,
        openingMove: legacyControlCue,
        answerIntent: legacyControlCue,
        relationshipPosture: 'warm',
        activeClosenessContext: 'focused-work',
        activeClosenessRung: 'measured-room',
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        selectedConcernEntryId: 'concern:latency',
        selectedRepairId: null,
        selectedCommitmentId: 'commitment:measure',
        selectedInquiryPlanId: null,
        selectedRuntimeThreadId: 'thread:memory-latency',
        selectedProjectId: null,
        selectedReflectionId: null,
        executivePhase: 'acting',
        selectedTruthFrame: 'live',
        mustDo: [legacyControlCue],
        mustNotDo: [legacyControlCue],
        narrative: [legacyControlCue],
        updatedAt: 10_000,
      },
      privateThought: null,
      captureState: { permission: 'unknown', lastGroundedAt: null },
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 45_000,
      updatedAt: 10_000,
    }, 10_000)

    expect(state.mindTurnFrame).toMatchObject({
      world: {
        truthState: 'live-grounded',
        truthBoundary: 'The p95 value has not been measured yet.',
      },
      memory: {
        carriedFacts: [factualEvidence],
      },
      obligation: {
        shouldSpeak: true,
        answerAct: 'guide',
        turnMode: 'guide-current-knot',
        openingClaim: null,
        openingMove: null,
        answerIntent: null,
        whyNow: null,
      },
      focusAnchor: 'memory latency',
      mustDo: [],
      mustNotDo: [],
      narrative: [],
    })
    expect(state.dialogueActKernel).toMatchObject({
      subject: 'task-knot',
      speechAct: 'guide',
      selectedEvidence: [{
        summary: factualEvidence,
      }],
      openingClaim: '',
      openingMove: '',
      whyNow: '',
      mustSay: [],
      mustAvoid: [],
      sourceTrace: [],
    })
    expect(state.answerPlanner).toMatchObject({
      act: 'guide',
      evidenceMode: 'live-grounded',
      governingFocus: '',
      governingProject: null,
      openingMove: '',
      answerIntent: '',
      selectedConcernEntryId: 'concern:latency',
      selectedCommitmentId: 'commitment:measure',
      selectedRuntimeThreadId: 'thread:memory-latency',
      executivePhase: 'acting',
      selectedTruthFrame: 'live',
      mustDo: [],
      mustNotDo: [],
      narrative: [],
    })
    expect(JSON.stringify({
      mindTurnFrame: state.mindTurnFrame,
      dialogueActKernel: state.dialogueActKernel,
      answerPlanner: state.answerPlanner,
    })).not.toContain(legacyControlCue)

    const roundTripped = normalizeVisualPresenceState(state, 11_000)
    expect(roundTripped.mindTurnFrame).not.toBeNull()
    expect(roundTripped.dialogueActKernel).not.toBeNull()
    expect(roundTripped.answerPlanner).not.toBeNull()
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
    expect(next.dialogueActKernel?.openingClaim).toBe('')
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

  it('normalizes positive recall budgets without boolean switches', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      recallGovernor: {
        mode: 'emotional-resonance',
        recallSeed: 'late-night debugging',
        suppressAssociativeRecall: true,
        allowActiveThoughts: false,
        allowRecalledFragments: false,
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

    expect(state.recallGovernor).not.toHaveProperty('suppressAssociativeRecall')
    expect(state.recallGovernor).not.toHaveProperty('allowActiveThoughts')
    expect(state.recallGovernor).not.toHaveProperty('allowRecalledFragments')
    expect(state.recallGovernor?.recalledFragmentCap).toBe(8)
    expect(state.recallGovernor?.recalledFragmentSourceBudget).toEqual([
      { sourceKind: 'reflection-ledger', maxItems: 2 },
      { sourceKind: 'dialogue-turn', maxItems: 1 },
      { sourceKind: 'fact-ledger', maxItems: 1 },
    ])
  })

  it('restores the emotional recall mode default positive budget when persisted values are missing', () => {
    const state = normalizeVisualPresenceState({
      watchMode: 'mnemonic-passive',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      recallGovernor: {
        mode: 'emotional-resonance',
        recallSeed: 'late-night debugging',
        carryAsMemory: true,
        rationale: 'Carry emotionally relevant memory.',
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

    expect(state.recallGovernor?.recalledFragmentCap).toBe(3)
    expect(state.recallGovernor?.recalledFragmentSourceBudget).toEqual([
      { sourceKind: 'autobiographical-episode', maxItems: 1 },
      { sourceKind: 'reflection-ledger', maxItems: 2 },
      { sourceKind: 'dialogue-turn', maxItems: 1 },
      { sourceKind: 'fact-ledger', maxItems: 1 },
      { sourceKind: 'mind-continuity', maxItems: 1 },
      { sourceKind: 'dream-fragment', maxItems: 1 },
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
        affectAnchors: ['repair_tension', 'continuity state'],
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
      affectAnchors: ['repair_tension', 'continuity state'],
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
    expect(state.recallGovernor).not.toHaveProperty('recalledFragmentCap')
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

  it('preserves typed continuity and embodiment state on the current conscious frame', () => {
    const normalized = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'alicization-self',
        centerOfGravity: 'answer',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: '',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        projectState: {
          continuityRestraint: 'measured-return',
          preferredBlinkCadence: 'linger',
          preferredGazeMode: 'soften',
          preferredPauseMode: 'longer',
          preferredLipsyncMode: 'restrained',
          preferredVoiceMode: 'lower-pressure',
          preferredPacingMode: 'slower',
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
      continuityRestraint: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredPauseMode: 'longer',
      preferredLipsyncMode: 'restrained',
      preferredVoiceMode: 'lower-pressure',
      preferredPacingMode: 'slower',
      continuityArcStage: 'same-thread-continuation',
      continuityPreferredTiming: 'next-open-window',
      continuityCadence: 'measured-return',
    })
  })

  it('preserves summary-alias identity-continuity', () => {
    const normalized = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      projectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity.',
        currentPhase: 'Phase 1: Local Digital Life.',
        latestLandedProgress: '   ',
        landedProgressSummary: 'Alias landed progress keeps the identity-continuity',
        primaryOpenLoop: '',
        openClosureSummary: 'Alias open closure keeps emotion, memory, initiative, and embodiment on one still-open living line.',
        nextClosureTarget: '',
        nextClosureTargetSummary: 'Alias next closure target keeps the continuity state visible across resident embodiment carry.',
        sameHerSelfLine: 'Keep identity continuity explicit across the callback seam.',
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
      latestLandedProgress: 'Alias landed progress keeps the identity-continuity',
      primaryOpenLoop: 'Alias open closure keeps emotion, memory, initiative, and embodiment on one still-open living line.',
      nextClosureTarget: 'Alias next closure target keeps the continuity state visible across resident embodiment carry.',
      sameHerDriftRisk: 'If this visual carry collapses back into a generic shell when the legacy field is blank, treat that as unfinished same-her drift.',
    })
  })

  it('preserves project-state as the conscious subject without restoring project prose', () => {
    const legacyProjectNarrative = 'Keep project-state visible all the way into the host-visible reply.'
    const normalized = normalizeVisualPresenceState({
      watchMode: 'symbiotic-vision',
      currentScene: null,
      attention: null,
      workingMemoryEpisodes: [],
      currentConsciousFrame: {
        subject: 'project-state',
        centerOfGravity: 'guide',
        truthDiscipline: 'dialogue-first',
        consciousNeed: '',
        consciousTension: '',
        speakingIntention: '',
        projectState: {
          nextClosureTarget: legacyProjectNarrative,
          continuityPreferredTiming: 'after-payoff',
          continuityCadence: 'single-thread',
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
    expect(normalized.currentConsciousFrame?.projectState).toEqual({
      continuityPreferredTiming: 'after-payoff',
      continuityCadence: 'single-thread',
    })
    expect(JSON.stringify(normalized.currentConsciousFrame)).not.toContain(legacyProjectNarrative)
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
        why: 'protect rest first and keep the continuity state inward',
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
