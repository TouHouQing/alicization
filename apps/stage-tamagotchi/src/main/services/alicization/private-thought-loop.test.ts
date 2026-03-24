import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { describe, expect, it } from 'vitest'

import { buildPrivateThoughtLoop } from './private-thought-loop'

function createContext(overrides: Record<string, any> = {}): AlicizationProactiveLayeredContext {
  return {
    localTime: {
      hour: 1,
      minute: 10,
      isLateNight: true,
    },
    system: {
      cpuUsage: 12,
      battery: { percent: 80, charging: true },
      memory: { usagePercent: 42, freeMB: 4096, totalMB: 8192 },
      idleSeconds: 20,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'traceback.log',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding',
      confidence: 0.88,
      source: 'foreground-window-heuristic',
      matchedLabels: ['vscode'],
    },
    content: {
      kind: 'error',
      confidence: 0.88,
      source: 'foreground-window-heuristic',
      matchedLabels: ['error'],
      summary: 'Python traceback',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 82,
      loneliness: 60,
      fatigue: 40,
      minutesSinceLastUserTurn: 10,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
    ...overrides,
  }
}

describe('buildPrivateThoughtLoop', () => {
  it('classifies tense debug and nudges on coding friction', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'Python traceback',
        source: 'screen-semantic-summary',
        confidence: 0.92,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(thought.emotionalTension).toBe('tense-debug')
    expect(thought.stance).toBe('nudge')
    expect(thought.shouldSpeak).toBe(true)
  })

  it('stays quiet in media covision', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext({
        localTime: { hour: 14, minute: 0, isLateNight: false },
        workload: { kind: 'media', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['youtube'] },
        content: { kind: 'video', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['video'] },
      }),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'media',
        contentKind: 'video',
        scenario: 'media',
        summary: 'YouTube video',
        source: 'screen-semantic-summary',
        confidence: 0.86,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(thought.emotionalTension).toBe('soft-covision')
    expect(thought.stance).toBe('observe')
    expect(thought.shouldSpeak).toBe(false)
  })

  it('upgrades to care in late-night drain', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext({
        workload: { kind: 'game', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['steam'] },
        content: { kind: 'gameplay', confidence: 0.8, source: 'foreground-window-heuristic', matchedLabels: ['gameplay'] },
        relationship: {
          ...createContext().relationship,
          fatigue: 70,
          lateNightActiveMinutes: 140,
        },
      }),
      watchMode: 'mnemonic-passive',
      currentScene: {
        workloadKind: 'game',
        contentKind: 'gameplay',
        scenario: 'late-night-care',
        summary: 'gameplay',
        source: 'foreground-window-heuristic',
        confidence: 0.7,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(thought.emotionalTension).toBe('late-night-drain')
    expect(thought.stance).toBe('care')
    expect(thought.suggestedStyle).toBe('gentle-care')
  })

  it('treats crash or anr as concerned nudge', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext(),
      watchMode: 'recovering',
      currentScene: null,
      attention: null,
      recentTransition: null,
      durabilityPulse: {
        kind: 'anr-likely',
        source: 'foreground-app',
        detectedAt: 10_000,
        pid: 7,
      },
    })

    expect(thought.stance).toBe('nudge')
    expect(thought.embodiedPresence).toBe('concerned')
    expect(thought.shouldSpeak).toBe(true)
  })

  it('keeps a waiting thought thread internal instead of surfacing it', () => {
    const thought = buildPrivateThoughtLoop({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'error',
        scenario: 'coding',
        summary: 'TypeScript error panel',
        source: 'screen-semantic-summary',
        confidence: 0.9,
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      livingWorldState: {
        focusObjectId: 'artifact::editor',
        activeObjectIds: ['artifact::editor'],
        objects: [{
          id: 'artifact::editor',
          kind: 'artifact',
          status: 'active',
          label: 'runtime.ts',
          summary: 'The host is still carrying a specific editor problem.',
          confidence: 0.84,
          salience: 0.82,
          continuity: 0.76,
          lastChange: 'screen-semantic-summary',
          openLoop: 'which line is actually broken',
          entityIds: [],
          threadIds: [],
          evidence: [],
          firstSeenAt: 0,
          lastUpdatedAt: 10_000,
        }],
        openLoops: ['which line is actually broken'],
        stability: 'shifting',
        narrative: [],
        updatedAt: 10_000,
      },
      selfGovernor: {
        dominantDrive: 'withhold',
        dominantIntentionId: 'governor::wait',
        focusObjectId: 'artifact::editor',
        activeIntentions: [{
          id: 'governor::wait',
          kind: 'wait-opening',
          status: 'withheld',
          drive: 'withhold',
          title: 'wait-opening',
          summary: 'Keep the thread alive internally until a natural opening appears.',
          urgency: 0.64,
          confidence: 0.72,
          patience: 0.86,
          targetObjectId: 'artifact::editor',
          targetThreadId: null,
          targetGoalId: null,
          targetCommitmentId: null,
          formedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 120_000,
        }],
        inhibition: 0.74,
        persistence: 0.58,
        socialRiskTolerance: 0.3,
        revisionReadiness: 0.42,
        narrative: [],
        updatedAt: 10_000,
      },
      thoughtThreads: {
        foregroundThreadId: 'thread::wait',
        threads: [{
          id: 'thread::wait',
          kind: 'problem-thread',
          status: 'waiting',
          title: 'runtime.ts',
          summary: 'The knot is real, but it should stay internal for one more beat.',
          question: 'Is this already a natural opening?',
          anchoredObjectId: 'artifact::editor',
          anchoredIntentionId: 'governor::wait',
          anchoredBeliefId: null,
          anchoredInquiryId: null,
          anchoredCommitmentId: null,
          salience: 0.72,
          confidence: 0.78,
          surfaceReadiness: 0.42,
          reopenWhen: ['host-open'],
          openedAt: 0,
          lastUpdatedAt: 10_000,
          expiresAt: 120_000,
        }],
        unresolvedCount: 1,
        narrative: [],
        updatedAt: 10_000,
      },
    })

    expect(thought.shouldSpeak).toBe(false)
    expect(['observe', 'accompany']).toContain(thought.stance)
    expect(thought.suggestedStyle).toBe('silent-observe')
    expect(thought.governorDrive).toBe('withhold')
    expect(thought.selectedThoughtThreadId).toBe('thread::wait')
    expect(thought.livingWorldObjectId).toBe('artifact::editor')
  })
})
