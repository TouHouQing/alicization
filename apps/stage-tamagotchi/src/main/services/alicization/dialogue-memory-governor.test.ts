import type { AlicizationDigitalLifeSpineDigest } from '../../../shared/eventa'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationDialogueMemoryCarrySystemBlock,
  deriveAlicizationDialogueMemoryCarryPolicy,
} from './dialogue-memory-governor'

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

describe('dialogue memory governor', () => {
  it('promotes reflective repair carry when reflection pressure is high and mirror memory is fresh', () => {
    const policy = deriveAlicizationDialogueMemoryCarryPolicy({
      now: 1_200,
      mirror: {
        memorySummary: 'recent=carry the refactor thread forward',
        updatedAt: 1_100,
      },
      spineDigest: createSpineDigest(),
    })

    expect(policy.mode).toBe('reflective-repair')
    expect(policy.allowMirrorCarry).toBe(true)
    expect(policy.recallSeed).toContain('memory_recall_mode:thread')
    expect(policy.recallSeed).toContain('mirror_memory:recent=carry the refactor thread forward')
    expect(policy.recallSeed).toContain('memory_reflection_pressure:0.68')
    expect(policy.summary).toContain('mode=reflective-repair')
    expect(buildAlicizationDialogueMemoryCarrySystemBlock(policy)).toContain('carry_mirror_memory=true')
  })

  it('suppresses stale mirror carry while keeping spine memory cues', () => {
    const policy = deriveAlicizationDialogueMemoryCarryPolicy({
      now: 10_000,
      mirror: {
        memorySummary: 'recent=carry stale memory',
        updatedAt: 1_000,
      },
      mirrorStaleAfterMs: 500,
      spineDigest: createSpineDigest(),
    })

    expect(policy.mode).toBe('reflective-repair')
    expect(policy.allowMirrorCarry).toBe(false)
    expect(policy.recallSeed).not.toContain('mirror_memory:recent=carry stale memory')
  })

  it('falls back to quiet mode when there are no thread or reflection cues', () => {
    const policy = deriveAlicizationDialogueMemoryCarryPolicy({
      spineDigest: createSpineDigest({
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
