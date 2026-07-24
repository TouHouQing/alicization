import type { AlicizationDigitalLifeSpineDigest } from './alicization-transport-contracts'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDialogueMemoryCarrySystemBlock,
  deriveAlicizationDialogueMemoryCarryPolicyFromDigest,
} from './alicization-dialogue-memory-carry'

function createSpineDigest(overrides?: Partial<AlicizationDigitalLifeSpineDigest>): AlicizationDigitalLifeSpineDigest {
  return {
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      sceneSummary: 'inspect runtime continuity',
      activeThreadId: 'thread-runtime',
      activeThreadTitle: 'runtime continuity',
      dominantMode: 'tracking',
      dominantDrive: 'understand',
      answerIntent: 'guide',
      preferredPresence: 'attentive',
      selectedAction: 'wait',
      updatedAt: 1_000,
    },
    architecture: {
      operatingMode: 'speaking',
      dominantSystem: 'dialogue',
      supportingSystems: ['memory'],
      governingFocus: 'keep one runtime line',
      summary: 'dialogue leads while memory carries continuity',
    },
    continuitySignal: null,
    proactive: {
      selectedAction: 'wait',
      preferredStyle: 'silent-observe',
      confidence: 0.7,
      shouldSpeak: false,
      activeThreadId: 'thread-runtime',
      activeThreadTitle: 'runtime continuity',
      dominantConcernKind: null,
      dominantConcernSummary: null,
      leadingGoalId: null,
      leadingGoalSummary: null,
      preferredPresence: 'attentive',
    },
    memory: {
      summary: 'recent=keep one runtime line | goal=carry runtime continuity',
      recentEpisodeSummary: 'keep one runtime line',
      recentEpisodeCount: 1,
      focusBeliefStatement: null,
      focusBeliefConfidence: null,
      leadingGoalSummary: 'carry runtime continuity',
      dominantConcernSummary: null,
      reflectionSummary: 'route continuity through one mirror',
      reflectionPressure: 0.68,
      recallMode: 'thread',
      recallSeed: 'runtime continuity',
      thoughtThreadSummary: 'runtime continuity',
    },
    ...overrides,
  }
}

describe('alicization dialogue memory carry', () => {
  it('promotes reflective repair carry when reflection pressure is high and mirror memory is fresh', () => {
    const policy = deriveAlicizationDialogueMemoryCarryPolicyFromDigest({
      now: 1_200,
      mirror: {
        memorySummary: 'Continue the refactor thread from its latest unresolved point.',
        updatedAt: 1_100,
      },
      digest: createSpineDigest(),
    })

    expect(policy.mode).toBe('reflective-repair')
    expect(policy.allowMirrorCarry).toBe(true)
    expect(policy.recallSeed).toContain('memory_recall_mode:thread')
    expect(policy.recallSeed).toContain('mirror_memory:Continue the refactor thread from its latest unresolved point.')
    expect(policy.recallSeed).toContain('memory_reflection_pressure:0.68')
    expect(policy.summary).toContain('Mode: reflective-repair')
    expect(buildAlicizationDialogueMemoryCarrySystemBlock(policy)).toBe('')
  })

  it('suppresses stale mirror carry while keeping digest memory cues', () => {
    const policy = deriveAlicizationDialogueMemoryCarryPolicyFromDigest({
      now: 10_000,
      mirror: {
        memorySummary: 'recent=carry stale memory',
        updatedAt: 1_000,
      },
      mirrorStaleAfterMs: 500,
      digest: createSpineDigest(),
    })

    expect(policy.mode).toBe('reflective-repair')
    expect(policy.allowMirrorCarry).toBe(false)
    expect(policy.recallSeed).not.toContain('mirror_memory:recent=carry stale memory')
  })

  it('sanitizes fixed personhood templates before memory carry becomes policy data', () => {
    const policy = deriveAlicizationDialogueMemoryCarryPolicyFromDigest({
      now: 1_200,
      mirror: {
        memorySummary: 'pre_turn_context_digest',
        updatedAt: 1_100,
      },
      digest: createSpineDigest({
        memory: {
          summary: 'structured continuity digest.',
          recentEpisodeSummary: 'Keep this same digital life project in view, but do not widen into a detached project shell.',
          recentEpisodeCount: 1,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: 'Next closure: keep personality, initiative, memory, and embodiment on one identity-continuity',
          dominantConcernSummary: null,
          reflectionSummary: 'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
          reflectionPressure: 0.72,
          recallMode: 'thread',
          recallSeed: null,
          thoughtThreadSummary: null,
        },
      }),
    })
    const policyText = `${policy.recallSeed} ${policy.summary} ${policy.reasonTags.join(' ')}`

    expect(policyText).not.toMatch(/Pre-reply|legacy phase-one template|continuity state|same-her|identity continuity|local-first digital life project/iu)
    expect(buildAlicizationDialogueMemoryCarrySystemBlock(policy)).toBe('')
  })

  it('falls back to quiet mode when there are no thread or reflection cues', () => {
    const policy = deriveAlicizationDialogueMemoryCarryPolicyFromDigest({
      digest: createSpineDigest({
        memory: {
          summary: null,
          recentEpisodeSummary: null,
          recentEpisodeCount: 0,
          focusBeliefStatement: null,
          focusBeliefConfidence: null,
          leadingGoalSummary: null,
          dominantConcernSummary: null,
          reflectionSummary: null,
          reflectionPressure: null,
          recallMode: null,
          recallSeed: null,
          thoughtThreadSummary: null,
        },
      }),
    })

    expect(policy.mode).toBe('quiet')
    expect(policy.recallSeed).toBe('')
    expect(buildAlicizationDialogueMemoryCarrySystemBlock(policy)).toBe('')
  })
})
