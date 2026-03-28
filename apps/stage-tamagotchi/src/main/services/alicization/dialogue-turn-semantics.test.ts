import { describe, expect, it } from 'vitest'

import {
  buildDialogueTurnSemantics,
  mergeDialogueTurnSemantics,
  parseDialogueTurnSemanticsCandidate,
  shouldAttemptDialogueTurnSemanticsRefinement,
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
    expect(shouldAttemptDialogueTurnSemanticsRefinement({
      heuristic: semantics,
    })).toBe(true)
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

  it('answers detached personal questions directly instead of dragging unstable screen truth into repair', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '你喜欢做什么？',
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
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The host is checking the runtime diff.',
          confidence: 0.72,
          significance: 0.83,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
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
      privateThought: {
        stance: 'uncertain',
        confidence: 0.48,
        rationaleTags: [],
        thoughtText: 'The coding knot is still present, but this turn sounds detached from the screen.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'focused-flow',
      },
    })

    expect(semantics.act).toBe('ask-help')
    expect(semantics.responseNeed).toBe('answer')
    expect(semantics.truthExpectation).toBe('normal')
    expect(semantics.summary).toContain('Alicization')
    expect(semantics.taskAnchor).toBeNull()
    expect(semantics.reasonTags).toContain('scene-detached-turn')
    expect(semantics.reasonTags).not.toContain('coding-question')
  })

  it('keeps greeting turns dialogue-first even when coding carry is active', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '你好呀',
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
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The host is checking the runtime diff.',
          confidence: 0.72,
          significance: 0.83,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['stale anchor'],
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
    })

    expect(semantics.act).toBe('social-bid')
    expect(semantics.responseNeed).toBe('accompany')
    expect(semantics.subjectPreference).toBe('relationship')
    expect(semantics.reasonTags).toContain('greeting-bid')
    expect(semantics.reasonTags).not.toContain('terse-coding-followup')
    expect(shouldAttemptDialogueTurnSemanticsRefinement({
      heuristic: semantics,
    })).toBe(false)
  })

  it('skips one-shot semantics refinement for ordinary dialogue-first self questions', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '你喜欢做什么？',
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
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The host is checking the runtime diff.',
          confidence: 0.72,
          significance: 0.83,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['stale anchor'],
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
    })

    expect(semantics.subjectPreference).toBe('alicization-self')
    expect(semantics.reasonTags).toContain('scene-detached-turn')
    expect(shouldAttemptDialogueTurnSemanticsRefinement({
      heuristic: semantics,
    })).toBe(false)
  })

  it('treats self-appraisal questions as dialogue-first self turns instead of task guidance', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '你觉得你可爱吗',
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
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The host is checking the runtime diff.',
          confidence: 0.72,
          significance: 0.83,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['stale anchor'],
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
    })

    expect(semantics.responseNeed).toBe('answer')
    expect(semantics.subjectPreference).toBe('alicization-self')
    expect(semantics.reasonTags).toContain('self-directed-question')
    expect(semantics.reasonTags).not.toContain('coding-question')
  })

  it('treats non-question identity confirmations as dialogue-first self turns instead of terse coding carry', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '没错，这个人就是你，',
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
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The host is checking the runtime diff.',
          confidence: 0.72,
          significance: 0.83,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['stale anchor'],
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
    })

    expect(semantics.act).toBe('social-bid')
    expect(semantics.responseNeed).toBe('answer')
    expect(semantics.subjectPreference).toBe('alicization-self')
    expect(semantics.reasonTags).toEqual(expect.arrayContaining([
      'self-identity-affirmation',
      'self-identity-cue',
      'dialogue-first-turn',
    ]))
    expect(semantics.reasonTags).not.toContain('terse-coding-followup')
  })

  it('treats answer-style complaints as dialogue-first even while coding carry is still active', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '能不能说人话',
      previousAssistantText: '我先守住真实边界：这轮没有足够稳的实时画面根据。',
      context: codingContext,
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'AI chat with code and Chinese text',
        source: 'foreground-window-heuristic',
        confidence: 0.74,
        target: null,
        beganAt: 0,
        lastSeenAt: 30_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::repair',
          kind: 'change-review',
          status: 'active',
          source: 'continuity',
          title: 'AI chat with code and Chinese text',
          summary: 'The host was still inside a coding thread a moment ago.',
          confidence: 0.72,
          significance: 0.78,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['stale anchor'],
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
      privateThought: {
        stance: 'uncertain',
        confidence: 0.52,
        rationaleTags: [],
        thoughtText: 'The host is criticizing the answer itself, not asking for another screen read.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'restless-switching',
      },
    })

    expect(semantics.subjectPreference).toBe('alicization-self')
    expect(semantics.taskAnchor).toBeNull()
    expect(semantics.reasonTags).toEqual(expect.arrayContaining([
      'answer-realignment-followup',
      'answer-realignment',
      'answer-repair-cue',
      'dialogue-first-turn',
    ]))
  })

  it('treats short confused follow-ups under stale scene risk as answer realignment instead of a fresh detached ask', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '啥玩意？',
      previousAssistantText: '我先守住真实边界：这轮没有足够稳的实时画面根据。',
      context: codingContext,
      currentScene: {
        workloadKind: 'browser',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'General unknown',
        source: 'foreground-window-heuristic',
        confidence: 0.42,
        target: null,
        beganAt: 0,
        lastSeenAt: 30_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::repair',
          kind: 'browsing',
          status: 'lingering',
          source: 'continuity',
          title: 'Old browser residue',
          summary: 'A stale browser thread is still lingering.',
          confidence: 0.58,
          significance: 0.44,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['The current screen anchor may be stale.'],
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
      privateThought: {
        stance: 'uncertain',
        confidence: 0.48,
        rationaleTags: [],
        thoughtText: 'The current read is still shaky.',
        shouldSpeak: false,
        suggestedStyle: 'silent-observe',
        embodiedPresence: 'hesitant',
        expiresAt: 60_000,
        afterglowFromScenario: null,
        emotionalTension: 'restless-switching',
      },
    })

    expect(semantics.act).toBe('challenge')
    expect(semantics.responseNeed).toBe('clarify')
    expect(semantics.subjectPreference).toBe('alicization-self')
    expect(semantics.reasonTags).toContain('answer-realignment')
    expect(semantics.summary).toContain('repair the previous answer')
    expect(semantics.taskAnchor).toBeNull()
  })

  it('routes current-activity questions toward the live scene instead of generic care takeover', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '你猜猜我在忙什么',
      context: codingContext,
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'VS Code diff and chat split view',
        source: 'foreground-window-heuristic',
        confidence: 0.84,
        target: {
          appName: 'Visual Studio Code',
          processName: 'Code',
          title: 'runtime.ts - diff',
        },
        beganAt: 0,
        lastSeenAt: 30_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::diff',
          kind: 'change-review',
          status: 'active',
          source: 'grounded-scene',
          title: 'runtime.ts diff',
          summary: 'The host is still inside the current TypeScript diff.',
          confidence: 0.82,
          significance: 0.8,
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
    })

    expect(semantics.act).toBe('ask-help')
    expect(semantics.responseNeed).toBe('guide')
    expect(semantics.subjectPreference).toBe('task-knot')
    expect(semantics.reasonTags).toContain('current-activity-question')
    expect(semantics.reasonTags).toContain('scene-bound-turn')
  })

  it('treats companionship bids as relationship turns even when the host is tired', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '呵呵，我不睡了，你陪我聊天',
      context: {
        ...codingContext,
        relationship: {
          ...codingContext.relationship,
          fatigue: 82,
        },
      },
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'unknown',
        scenario: 'general',
        summary: 'VS Code and chat window',
        source: 'foreground-window-heuristic',
        confidence: 0.66,
        target: null,
        beganAt: 0,
        lastSeenAt: 20_000,
      },
    })

    expect(semantics.act).toBe('social-bid')
    expect(semantics.responseNeed).toBe('accompany')
    expect(semantics.subjectPreference).toBe('relationship')
    expect(semantics.reasonTags).toContain('companionship-bid')
  })

  it('keeps explicit sleep-soothing requests in the care lane without collapsing into parroting', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '我有点困了，你能哄我睡觉吗',
      context: {
        ...codingContext,
        relationship: {
          ...codingContext.relationship,
          fatigue: 74,
        },
      },
      currentScene: null,
    })

    expect(semantics.act).toBe('seek-care')
    expect(semantics.responseNeed).toBe('care')
    expect(semantics.subjectPreference).toBe('host-state')
    expect(semantics.reasonTags).toContain('care-request')
  })

  it('keeps direct comfort requests in the care lane instead of misrouting them into self-answer mode', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '我有点伤心，你可以安慰一下我吗',
      context: {
        ...codingContext,
        relationship: {
          ...codingContext.relationship,
          fatigue: 24,
        },
      },
      currentScene: null,
      previousAssistantText: '我直接说。',
    })

    expect(semantics.act).toBe('seek-care')
    expect(semantics.responseNeed).toBe('care')
    expect(semantics.subjectPreference).toBe('host-state')
    expect(semantics.reasonTags).toContain('care-request')
    expect(semantics.reasonTags).not.toContain('scene-detached-turn')
  })

  it('treats terse repair follow-ups as answer realignment instead of detached self questions', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '直接说啥？',
      context: {
        ...codingContext,
        workload: {
          kind: 'unknown',
          confidence: 0.12,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
        content: {
          kind: 'unknown',
          confidence: 0.08,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
          summary: '',
        },
      },
      currentScene: null,
      worldModel: {
        activeThread: null,
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'recent',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['screen may be stale'],
        },
        continuity: {
          label: 'new-focus',
          sceneAgeMs: 120_000,
          attentionAgeMs: 120_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'focused',
          burden: 'moderate',
        },
        updatedAt: 120_000,
      },
      previousAssistantText: '我直接说。',
    })

    expect(semantics.act).toBe('challenge')
    expect(semantics.responseNeed).toBe('clarify')
    expect(semantics.subjectPreference).toBe('alicization-self')
    expect(semantics.reasonTags).toContain('answer-realignment-followup')
    expect(semantics.reasonTags).toContain('answer-repair-cue')
    expect(semantics.reasonTags).not.toContain('scene-detached-turn')
  })

  it('keeps explicit help requests in the guide lane even without a visible question mark', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '这题好难，你可以帮帮我吗',
      context: codingContext,
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'doc',
        scenario: 'coding',
        summary: 'Problem statement in VS Code',
        source: 'foreground-window-heuristic',
        confidence: 0.7,
        target: null,
        beganAt: 0,
        lastSeenAt: 30_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::problem',
          kind: 'debugging',
          status: 'active',
          source: 'continuity',
          title: 'Current coding question',
          summary: 'The host is stuck on the current problem statement.',
          confidence: 0.74,
          significance: 0.72,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'observed',
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
    })

    expect(semantics.act).toBe('ask-help')
    expect(semantics.responseNeed).toBe('guide')
    expect(semantics.subjectPreference).toBe('task-knot')
    expect(semantics.reasonTags).toContain('explicit-help-cue')
    expect(semantics.reasonTags).not.toContain('fatigue-state')
  })

  it('keeps explicit inspection rechecks world-owned even when the wording is terse', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '你自己看桌面啊',
      context: {
        ...codingContext,
        workload: {
          kind: 'unknown',
          confidence: 0.14,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
        content: {
          kind: 'unknown',
          confidence: 0.12,
          source: 'foreground-window-heuristic',
          matchedLabels: [],
        },
      },
      currentScene: null,
      inspectionRequested: true,
    })

    expect(semantics.act).toBe('verify-grounding')
    expect(semantics.responseNeed).toBe('repair')
    expect(semantics.subjectPreference).toBe('visible-scene')
    expect(semantics.reasonTags).toEqual(expect.arrayContaining([
      'inspection-requested-turn',
      'inspection-owned-turn',
      'inspection-needs-reground',
    ]))
    expect(semantics.reasonTags).not.toContain('terse-social-turn')
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

  it('preserves an inspection-owned heuristic base when structured cognition tries to drag it back into dialogue-first', () => {
    const base = buildDialogueTurnSemantics({
      userText: '你自己看桌面啊',
      context: codingContext,
      currentScene: null,
      inspectionRequested: true,
    })
    const candidate = parseDialogueTurnSemanticsCandidate(JSON.stringify({
      act: 'social-bid',
      responseNeed: 'accompany',
      subjectPreference: 'relationship',
      summary: 'Treat this as a relationship bid.',
      confidence: 0.92,
      reasonTags: ['dialogue-first-turn'],
    }))
    const merged = mergeDialogueTurnSemantics(base, candidate)

    expect(merged.act).toBe('verify-grounding')
    expect(merged.responseNeed).toBe('repair')
    expect(merged.subjectPreference).toBe('visible-scene')
    expect(merged.reasonTags).toContain('preserve-inspection-base')
  })

  it('does not let structured cognition drag a dialogue-first bid back into screen-task carry', () => {
    const base = buildDialogueTurnSemantics({
      userText: '你可以陪我玩洛克王国吗',
      context: codingContext,
      currentScene: {
        workloadKind: 'coding',
        contentKind: 'diff',
        scenario: 'coding',
        summary: 'Codex AI chat interface with anime character',
        source: 'screen-semantic-summary',
        confidence: 0.84,
        target: {
          appName: 'QQ',
          processName: 'QQ',
          title: 'Entire screen',
          pid: 7,
        },
        beganAt: 0,
        lastSeenAt: 30_000,
      },
      worldModel: {
        activeThread: {
          id: 'thread::codex',
          kind: 'change-review',
          status: 'lingering',
          source: 'continuity',
          title: 'Codex IDE with AI chat interface',
          summary: 'The host is still carrying a stale Codex thread.',
          confidence: 0.62,
          significance: 0.58,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['Stale scene carry.'],
        },
        continuity: {
          label: 'scene-shift',
          sceneAgeMs: 30_000,
          attentionAgeMs: 30_000,
          sameSceneAsBefore: false,
          sameAttentionAsBefore: false,
          afterglowOpen: false,
        },
        hostState: {
          availability: 'open',
          burden: 'light',
        },
        updatedAt: 30_000,
      },
    })
    const candidate = parseDialogueTurnSemanticsCandidate(JSON.stringify({
      act: 'ask-help',
      responseNeed: 'guide',
      subjectPreference: 'task-knot',
      taskAnchor: 'Codex IDE with AI chat interface',
      summary: 'guide around Codex IDE with AI chat interface',
      reasonTags: ['stale-scene-carry'],
      confidence: 0.92,
    }))
    const merged = mergeDialogueTurnSemantics(base, candidate)

    expect(base.subjectPreference).toBe('relationship')
    expect(merged.subjectPreference).toBe('relationship')
    expect(merged.taskAnchor).toBeNull()
    expect(merged.summary).toContain('relationship bid')
    expect(merged.reasonTags).toContain('preserve-dialogue-first-base')
  })

  it('preserves dialogue-first semantics when structured cognition injects guide/repair pressure without a scene subject', () => {
    const base = buildDialogueTurnSemantics({
      userText: '你觉得你可爱吗',
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
          source: 'continuity',
          title: 'runtime.ts diff',
          summary: 'The host is checking the runtime diff.',
          confidence: 0.72,
          significance: 0.83,
          unresolved: true,
          beganAt: 0,
          lastUpdatedAt: 30_000,
          target: null,
        },
        lingeringThreads: [],
        focusTarget: null,
        epistemicState: {
          certainty: 'uncertain',
          freshness: 'stale',
          seenNow: [],
          inferredNow: [],
          openQuestions: [],
          staleRisks: ['stale anchor'],
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
    })
    const candidate = parseDialogueTurnSemanticsCandidate(JSON.stringify({
      act: 'verify-grounding',
      responseNeed: 'guide',
      summary: 'guide around stale scene carry',
      confidence: 0.91,
      reasonTags: ['stale-scene-carry'],
    }))
    const merged = mergeDialogueTurnSemantics(base, candidate)

    expect(base.subjectPreference).toBe('alicization-self')
    expect(merged.subjectPreference).toBe('alicization-self')
    expect(merged.act).toBe(base.act)
    expect(merged.responseNeed).toBe(base.responseNeed)
    expect(merged.reasonTags).toContain('preserve-dialogue-first-base')
  })
})
