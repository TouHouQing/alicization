import { describe, expect, it } from 'vitest'

import {
  buildDialogueTurnSemantics,
  mergeDialogueTurnSemantics,
  parseDialogueTurnSemanticsCandidate,
} from './dialogue-turn-semantics'

const codingContext = {
  localTime: { hour: 14, minute: 12, isLateNight: false },
  system: {
    cpuUsage: 21,
    battery: { percent: 86, charging: true },
    memory: { usagePercent: 41, freeMB: 4096, totalMB: 8192 },
    idleSeconds: 11,
    inputActivity: 'active' as const,
    fullscreenLikely: false,
    foregroundWindow: {
      appName: 'Cursor',
      processName: 'Cursor',
      title: 'runtime.ts - diff',
      pid: 42,
    },
    degradedSignals: [],
  },
  workload: {
    kind: 'coding' as const,
    confidence: 0.88,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['cursor'],
  },
  content: {
    kind: 'diff' as const,
    confidence: 0.82,
    source: 'foreground-window-heuristic' as const,
    matchedLabels: ['diff'],
    summary: 'runtime.ts - diff',
  },
  relationship: {
    hostAttitude: '专注而克制',
    boredom: 8,
    loneliness: 14,
    fatigue: 20,
    minutesSinceLastUserTurn: 1,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
}

describe('dialogue-turn-semantics', () => {
  it('treats coding questions as strict guide turns anchored to the live knot', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '这个 diff 哪里有问题？',
      context: codingContext,
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'runtime.ts diff',
        source: 'foreground-window-heuristic',
        confidence: 0.84,
        target: null,
        beganAt: 0,
        lastSeenAt: 30_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::runtime',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts diff',
          summary: 'The host is checking the runtime diff.',
          confidence: 0.88,
          significance: 0.83,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'grounded',
          freshness: 'live',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: [],
        },
        continuity: {
          label: 'staying-with-thread',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: true,
          sameAttentionAsBefore: true,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 30_000,
      },
      subjectiveInference: {
        dominantInterpretation: 'The host wants help on the current diff.',
        situatedMeaning: 'This is a live coding knot.',
        hostIntentCandidates: [{ goal: 'inspect-change', confidence: 0.88, why: 'The host explicitly asked about the diff.' }],
        relationshipNeedCandidates: [{ need: 'guidance', confidence: 0.72, why: 'The turn asks for concrete help.' }],
        confidence: 0.8,
        notes: [],
        source: 'heuristic',
        updatedAt: 30_000,
      },
      privateThought: {
        stance: 'observe',
        confidence: 0.62,
        rationaleTags: [],
        thoughtText: 'The diff knot is still live.',
        shouldSpeak: false,
        suggestedStyle: 'light-nudge',
        embodiedPresence: 'attentive',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })

    expect(semantics.act).toBe('verify-grounding')
    expect(semantics.responseNeed).toBe('guide')
    expect(semantics.truthExpectation).toBe('strict')
    expect(semantics.taskAnchor).toContain('runtime.ts')
    expect(semantics.personaSuppression).toBeGreaterThan(0.5)
    expect(semantics.reasonTags).toContain('coding-question')
  })

  it('treats short warm turns as accompaniment instead of fake task intent', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '嗯嗯',
      context: {
        ...codingContext,
        workload: {
          kind: 'browser' as const,
          confidence: 0.34,
          source: 'foreground-window-heuristic' as const,
          matchedLabels: ['browser'],
        },
        content: {
          kind: 'chat' as const,
          confidence: 0.3,
          source: 'foreground-window-heuristic' as const,
          matchedLabels: ['chat'],
        },
      },
      currentScene: {
        workloadKind: 'browser',
        contentKind: 'chat',
        scenario: 'general',
        summary: 'General chat window',
        source: 'foreground-window-heuristic',
        confidence: 0.42,
        target: null,
        beganAt: 0,
        lastSeenAt: 20_000,
      },
      subjectiveInference: {
        dominantInterpretation: 'The host is keeping the social thread alive.',
        situatedMeaning: 'This is soft continuation rather than a new task.',
        hostIntentCandidates: [{ goal: 'chat', confidence: 0.78, why: 'Short acknowledgement with no task anchor.' }],
        relationshipNeedCandidates: [{ need: 'companionship', confidence: 0.66, why: 'The host is staying in the shared thread.' }],
        confidence: 0.68,
        notes: [],
        source: 'heuristic',
        updatedAt: 20_000,
      },
      relationshipModel: {
        climate: 'attuned',
        approachVector: 'stay-near',
        receptivity: 0.7,
        sharedAttentionTrust: 0.64,
        correctionSensitivity: 0.2,
        reciprocityExpectation: 0.44,
        activeBoundaries: [],
        narrative: [],
        updatedAt: 20_000,
      },
    })

    expect(semantics.act).toBe('social-bid')
    expect(semantics.responseNeed).toBe('accompany')
    expect(semantics.truthExpectation).toBe('light')
    expect(semantics.affectiveTone).toBe('warm')
    expect(semantics.personaSuppression).toBeLessThan(0.2)
  })

  it('merges structured cognition into the heuristic turn shape without breaking the stable contract', () => {
    const base = buildDialogueTurnSemantics({
      userText: '看看这个问题',
      context: codingContext,
      currentScene: null,
    })
    const candidate = parseDialogueTurnSemanticsCandidate(JSON.stringify({
      act: 'correct',
      responseNeed: 'repair',
      truthExpectation: 'strict',
      affectiveTone: 'urgent',
      sharedAttentionDemand: 0.91,
      personaSuppression: 0.88,
      confidence: 0.86,
      summary: 'repair the stale scene read first',
      reasonTags: ['host-correction', 'strict-truth'],
    }))
    const merged = mergeDialogueTurnSemantics(base, candidate)

    expect(merged.source).toBe('hybrid')
    expect(merged.act).toBe('correct')
    expect(merged.responseNeed).toBe('repair')
    expect(merged.summary).toBe('repair the stale scene read first')
    expect(merged.reasonTags).toContain('structured-dialogue-cognition')
    expect(merged.personaSuppression).toBeGreaterThan(base.personaSuppression)
  })
})
