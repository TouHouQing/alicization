import type { AlicizationDigitalLifeSpineDigest } from './alicization-bridge'

import { describe, expect, it } from 'vitest'

import { buildAlicizationVisualPresenceStateFromSpineDigest } from './alicization-visual-presence-spine'

type TestDigitalLifeSpineOverrides = Omit<
  Partial<AlicizationDigitalLifeSpineDigest>,
  'runtime' | 'architecture' | 'proactive' | 'memory'
> & {
  runtime?: Partial<Omit<AlicizationDigitalLifeSpineDigest['runtime'], 'projectState'>> & {
    projectState?: Partial<NonNullable<AlicizationDigitalLifeSpineDigest['runtime']['projectState']>> | null
  }
  architecture?: Partial<AlicizationDigitalLifeSpineDigest['architecture']>
  proactive?: Partial<AlicizationDigitalLifeSpineDigest['proactive']>
  memory?: Partial<AlicizationDigitalLifeSpineDigest['memory']>
}

function createDigitalLifeSpineDigest(
  overrides: TestDigitalLifeSpineOverrides = {},
): AlicizationDigitalLifeSpineDigest {
  const updatedAt = Date.now()
  const {
    runtime: runtimeOverrides,
    architecture: architectureOverrides,
    proactive: proactiveOverrides,
    memory: memoryOverrides,
    ...restOverrides
  } = overrides

  const runtime = {
    watchMode: 'symbiotic-vision',
    sceneScenario: 'coding',
    sceneSummary: 'identity-continuity',
    activeThreadId: 'thread-visual-presence-closure',
    activeThreadTitle: 'identity-continuity',
    dominantMode: 'tracking',
    dominantDrive: 'stabilize',
    answerIntent: 'hold',
    preferredPresence: 'attentive',
    selectedAction: 'hold',
    updatedAt,
    ...runtimeOverrides,
  } satisfies AlicizationDigitalLifeSpineDigest['runtime']
  const architecture = {
    operatingMode: 'observing',
    dominantSystem: 'memory',
    supportingSystems: ['dialogue'],
    governingFocus: 'keep the continuity state steady',
    summary: 'identity-continuity',
    ...architectureOverrides,
  } satisfies AlicizationDigitalLifeSpineDigest['architecture']
  const proactive = {
    selectedAction: 'hold',
    preferredStyle: 'silent-observe',
    confidence: 0.72,
    shouldSpeak: false,
    activeThreadId: 'thread-visual-presence-closure',
    activeThreadTitle: 'identity-continuity',
    dominantConcernKind: null,
    dominantConcernSummary: null,
    leadingGoalId: null,
    leadingGoalSummary: null,
    preferredPresence: 'attentive',
    ...proactiveOverrides,
  } satisfies AlicizationDigitalLifeSpineDigest['proactive']
  const memory = {
    summary: 'identity-continuity',
    recentEpisodeSummary: 'identity-continuity',
    recentEpisodeCount: 1,
    focusBeliefStatement: null,
    focusBeliefConfidence: null,
    leadingGoalSummary: null,
    dominantConcernSummary: null,
    reflectionSummary: null,
    reflectionPressure: null,
    recallMode: 'working-memory',
    recallSeed: null,
    thoughtThreadSummary: 'identity-continuity',
    ...memoryOverrides,
  } satisfies AlicizationDigitalLifeSpineDigest['memory']

  return {
    version: 'digital-life-spine-digest-v1',
    runtime,
    architecture,
    continuitySignal: null,
    proactive,
    embodiment: null,
    memory,
    ...restOverrides,
  }
}

describe('alicization visual presence spine resident carry', () => {
  it('does not invent a private-thought sentence when the digest has no text evidence', () => {
    const state = buildAlicizationVisualPresenceStateFromSpineDigest({
      digest: createDigitalLifeSpineDigest({
        runtime: {
          sceneSummary: '',
          activeThreadId: null,
          activeThreadTitle: null,
        },
        architecture: {
          governingFocus: null,
          summary: '',
        },
        proactive: {
          activeThreadId: null,
          activeThreadTitle: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
        },
        memory: {
          summary: null,
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          recollectionSummary: null,
          recollectionSurfaceSummary: null,
          thoughtThreadSummary: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
        },
      }),
      now: 1_000,
      previous: null,
      snapshot: null,
    })

    expect(state.privateThought?.thoughtText).toBe('')
  })

  it('keeps browser-local resident performance on repair-before-closeness when runtime project closure is the only surviving same-her restraint carry', () => {
    const state = buildAlicizationVisualPresenceStateFromSpineDigest({
      digest: createDigitalLifeSpineDigest({
        runtime: {
          projectState: {
            currentPhase: 'Phase 1: Local Digital Life',
            memoryClosureSummary: null,
            primaryOpenLoop: 'voice and lipsync still need to rejoin the continuity state before closeness widens again.',
            emotionalClosureCue: 'same-her repair seam: keep this return repair-before-closeness on the continuity state before closeness widens again.',
          },
        },
      }),
      now: 1_000,
      previous: null,
      snapshot: null,
    })

    expect(state.currentBodyState).toBe('accompanying')
    expect(state.continuityMode).toBe('quiet-accompaniment')
    expect(state.residentPerformance).toEqual(expect.objectContaining({
      source: 'browser-fallback',
      performance: expect.objectContaining({
        delivery: 'gentle',
        residentMode: 'repair-before-closeness',
        face: expect.objectContaining({
          residentMode: 'repair-before-closeness',
        }),
        action: expect.objectContaining({
          residentMode: 'repair-before-closeness',
        }),
      }),
      reasonTags: expect.arrayContaining([
        'repair-before-closeness',
        'timing:project-emotional-closure',
        'timing-source:project-emotional-closure',
      ]),
    }))
  })
})
