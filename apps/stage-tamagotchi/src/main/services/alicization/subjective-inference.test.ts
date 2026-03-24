import { describe, expect, it } from 'vitest'

import {
  buildSubjectiveInference,
  mergeSubjectiveInference,
  parseSubjectiveInferenceCandidate,
  projectSubjectiveInferenceToAppraisal,
} from './subjective-inference'
import { buildSubjectiveSceneAppraisal } from './subjective-scene-model'
import { buildWorldModel } from './world-model'

function createContext() {
  return {
    localTime: {
      hour: 1,
      minute: 20,
      isLateNight: true,
    },
    system: {
      cpuUsage: 12,
      battery: { percent: 76, charging: true },
      memory: { usagePercent: 44, freeMB: 2048, totalMB: 8192 },
      idleSeconds: 25,
      inputActivity: 'active' as const,
      fullscreenLikely: false,
      foregroundWindow: {
        appName: 'Visual Studio Code',
        processName: 'Code',
        title: 'proactive-policy.ts',
        pid: 7,
      },
      degradedSignals: [],
    },
    workload: {
      kind: 'coding' as const,
      confidence: 0.88,
      source: 'screen-semantic-summary' as const,
      matchedLabels: ['vscode'],
    },
    content: {
      kind: 'error' as const,
      confidence: 0.91,
      source: 'screen-semantic-summary' as const,
      matchedLabels: ['error'],
      summary: 'TypeScript error panel',
    },
    relationship: {
      hostAttitude: '礼貌而克制，保持观察',
      boredom: 80,
      loneliness: 66,
      fatigue: 41,
      minutesSinceLastUserTurn: 10,
      reminderBacklog: 0,
      lateNightActiveMinutes: 0,
      recentProactiveOutcomes: [],
    },
  }
}

describe('subjective inference', () => {
  it('builds an inner interpretation layer above scene labels', () => {
    const worldModel = buildWorldModel({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
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
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      recentTransition: null,
      durabilityPulse: null,
      workingMemoryEpisodes: [],
      previousModel: null,
    })
    const appraisal = buildSubjectiveSceneAppraisal({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
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
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      worldModel,
      recentTransition: null,
      durabilityPulse: null,
      workingMemoryEpisodes: [],
    })
    const inference = buildSubjectiveInference({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: {
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
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 10_000,
      },
      attention: null,
      worldModel,
      appraisal,
      recentTransition: null,
      durabilityPulse: null,
    })

    expect(inference.hostIntentCandidates[0]?.goal).toBe('resolve-problem')
    expect(inference.relationshipNeedCandidates[0]?.need).toBe('guidance')
    expect(inference.dominantInterpretation).toContain('故障点')
    expect(inference.confidence).toBeGreaterThan(0.7)
  })

  it('merges structured inference without discarding the heuristic thread', () => {
    const base = buildSubjectiveInference({
      now: 10_000,
      context: createContext(),
      watchMode: 'symbiotic-vision',
      scene: null,
      attention: null,
      worldModel: buildWorldModel({
        now: 10_000,
        context: createContext(),
        watchMode: 'symbiotic-vision',
        scene: null,
        attention: null,
        recentTransition: null,
        durabilityPulse: null,
        workingMemoryEpisodes: [],
        previousModel: null,
      }),
      appraisal: {
        inferredHostGoal: 'resolve-problem',
        confidence: 0.74,
        surprise: 0.18,
        carePressure: 0.42,
        interruptionCost: 0.2,
        desireToSpeak: 0.58,
        relationshipNeed: 'guidance',
        notes: ['world-grounded'],
      },
      recentTransition: null,
      durabilityPulse: null,
    })
    const candidate = parseSubjectiveInferenceCandidate(JSON.stringify({
      dominantInterpretation: '这不是普通浏览，而是宿主在对一个具体报错点反复校准。',
      selfQuestion: '真正卡住的是类型缩窄，还是更早的状态漂移？',
      hostIntentCandidates: [
        {
          goal: 'resolve-problem',
          confidence: 0.9,
          why: 'The host is still narrowing a concrete error locus.',
        },
      ],
      relationshipNeedCandidates: [
        {
          need: 'guidance',
          confidence: 0.86,
          why: 'A grounded error thread invites guidance more than generic comfort.',
        },
      ],
      confidence: 0.84,
      notes: ['structured-debug', 'inner-meaning'],
    }))
    const merged = mergeSubjectiveInference(base, candidate)

    expect(merged.source).toBe('hybrid')
    expect(merged.hostIntentCandidates[0]?.goal).toBe('resolve-problem')
    expect(merged.selfQuestion).toContain('类型缩窄')
    expect(merged.notes).toContain('structured-cognition')
    expect(merged.notes).toContain('structured-debug')
  })

  it('projects subjective inference back into appraisal as a compressed decision surface', () => {
    const appraisal = projectSubjectiveInferenceToAppraisal({
      base: {
        inferredHostGoal: 'unknown',
        confidence: 0.48,
        surprise: 0.18,
        carePressure: 0.28,
        interruptionCost: 0.32,
        desireToSpeak: 0.34,
        relationshipNeed: 'unclear',
        notes: ['heuristic'],
      },
      inference: {
        dominantInterpretation: '她觉得宿主其实已经把注意力收紧在一个具体报错点上。',
        situatedMeaning: '这更像具体 debug，而不是泛泛浏览。',
        selfQuestion: '真正的错误源头是不是在更早的状态初始化？',
        uncertainty: '还差一次更细的 grounding。',
        hostIntentCandidates: [{
          goal: 'resolve-problem',
          confidence: 0.86,
          why: 'The host is debugging a narrow fault.',
        }],
        relationshipNeedCandidates: [{
          need: 'guidance',
          confidence: 0.8,
          why: 'Guidance fits better than distance here.',
        }],
        confidence: 0.82,
        source: 'hybrid',
        notes: ['structured-debug'],
        updatedAt: 10_000,
      },
    })

    expect(appraisal.inferredHostGoal).toBe('resolve-problem')
    expect(appraisal.relationshipNeed).toBe('guidance')
    expect(appraisal.waitingToVerify).toContain('grounding')
    expect(appraisal.situatedMeaning).toContain('debug')
    expect(appraisal.notes).toContain('structured-cognition')
  })
})
