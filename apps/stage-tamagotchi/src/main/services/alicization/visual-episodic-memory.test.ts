import { describe, expect, it } from 'vitest'

import {
  buildVisualRecallSeed,
  buildVisualSedimentFragment,
  normalizeVisualPresenceState,
  updateVisualPresenceState,
  visualWorkingMemoryTtlMs,
} from './visual-episodic-memory'

describe('visual episodic memory', () => {
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

  it('builds a sediment episode with emotional tension and recall seed', () => {
    const next = updateVisualPresenceState({
      now: 21 * 60_000,
      previousState: {
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
})
