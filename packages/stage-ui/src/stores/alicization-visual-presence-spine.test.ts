import type { AlicizationDigitalLifeSpineDigest } from './alicization-bridge'

import { describe, expect, it } from 'vitest'

import { buildAlicizationVisualPresenceStateFromSpineDigest } from './alicization-visual-presence-spine'

type TestDigitalLifeSpineOverrides = Omit<
  Partial<AlicizationDigitalLifeSpineDigest>,
  'runtime' | 'architecture' | 'proactive' | 'memory'
> & {
  runtime?: Partial<AlicizationDigitalLifeSpineDigest['runtime']>
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
    sceneSummary: 'active coding session',
    activeThreadId: 'thread-visual-presence',
    activeThreadTitle: 'active coding session',
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
    governingFocus: 'observe the active task',
    summary: 'active task state',
    ...architectureOverrides,
  } satisfies AlicizationDigitalLifeSpineDigest['architecture']
  const proactive = {
    selectedAction: 'hold',
    preferredStyle: 'silent-observe',
    confidence: 0.72,
    shouldSpeak: false,
    activeThreadId: 'thread-visual-presence',
    activeThreadTitle: 'active coding session',
    dominantConcernKind: null,
    dominantConcernSummary: null,
    leadingGoalId: null,
    leadingGoalSummary: null,
    preferredPresence: 'attentive',
    ...proactiveOverrides,
  } satisfies AlicizationDigitalLifeSpineDigest['proactive']
  const memory = {
    summary: 'recent coding context',
    recentEpisodeSummary: 'recent coding context',
    recentEpisodeCount: 1,
    focusBeliefStatement: null,
    focusBeliefConfidence: null,
    leadingGoalSummary: null,
    dominantConcernSummary: null,
    reflectionSummary: null,
    reflectionPressure: null,
    recallMode: 'working-memory',
    recallSeed: null,
    thoughtThreadSummary: 'active coding context',
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
})
