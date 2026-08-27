import type {
  AlicizationHostGoalHypothesis,
  AlicizationRelationshipNeed,
  AlicizationSubjectiveInferenceSnapshot,
} from '../../../shared/eventa'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildDialogueTurnSemantics,
} from './dialogue-turn-semantics'

const neutralContext = {
  localTime: { hour: 14, minute: 12, isLateNight: false },
  system: {
    cpuUsage: 21,
    battery: { percent: 86, charging: true },
    memory: { usagePercent: 41, freeMB: 4096, totalMB: 8192 },
    idleSeconds: 11,
    inputActivity: 'active',
    fullscreenLikely: false,
    degradedSignals: [],
  },
  workload: {
    kind: 'unknown',
    confidence: 0.1,
    source: 'foreground-window-heuristic',
    matchedLabels: [],
  },
  content: {
    kind: 'unknown',
    confidence: 0.1,
    source: 'foreground-window-heuristic',
    matchedLabels: [],
  },
  relationship: {
    hostAttitude: '',
    boredom: 8,
    loneliness: 14,
    fatigue: 20,
    minutesSinceLastUserTurn: 1,
    reminderBacklog: 0,
    lateNightActiveMinutes: 0,
    recentProactiveOutcomes: [],
  },
} satisfies AlicizationProactiveLayeredContext

const codingContext = {
  ...neutralContext,
  workload: {
    kind: 'coding',
    confidence: 0.88,
    source: 'foreground-window-heuristic',
    matchedLabels: ['cursor'],
  },
  content: {
    kind: 'diff',
    confidence: 0.82,
    source: 'foreground-window-heuristic',
    matchedLabels: ['diff'],
    summary: 'runtime.ts - diff',
  },
} satisfies AlicizationProactiveLayeredContext

function buildWorldModel() {
  return {
    activeThread: {
      id: 'thread::runtime',
      kind: 'change-review' as const,
      status: 'active' as const,
      source: 'grounded-scene' as const,
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
      certainty: 'grounded' as const,
      freshness: 'live' as const,
      seenNow: [],
      inferredNow: [],
      openQuestions: [],
      staleRisks: [],
    },
    continuity: {
      label: 'staying-with-thread' as const,
      sceneAgeMs: 30_000,
      attentionAgeMs: 30_000,
      sameSceneAsBefore: true,
      sameAttentionAsBefore: true,
      afterglowOpen: false,
    },
    hostState: {
      availability: 'focused' as const,
      burden: 'moderate' as const,
    },
    updatedAt: 30_000,
  }
}

function buildSubjectiveInference(input: {
  goal?: AlicizationHostGoalHypothesis
  need?: AlicizationRelationshipNeed
  confidence?: number
}): AlicizationSubjectiveInferenceSnapshot {
  const confidence = input.confidence ?? 0.84
  return {
    dominantInterpretation: 'Structured interpretation.',
    situatedMeaning: 'Structured situated meaning.',
    hostIntentCandidates: input.goal
      ? [{ goal: input.goal, confidence, why: 'structured-host-intent' }]
      : [],
    relationshipNeedCandidates: input.need
      ? [{ need: input.need, confidence, why: 'structured-relationship-need' }]
      : [],
    confidence,
    notes: [],
    source: 'hybrid' as const,
    updatedAt: 30_000,
  }
}

function visiblePosture(userText: string) {
  const semantics = buildDialogueTurnSemantics({
    userText,
    context: neutralContext,
    currentScene: null,
  })
  return {
    act: semantics.act,
    responseNeed: semantics.responseNeed,
    truthExpectation: semantics.truthExpectation,
    affectiveTone: semantics.affectiveTone,
    subjectPreference: semantics.subjectPreference,
    taskAnchor: semantics.taskAnchor,
    sharedAttentionDemand: semantics.sharedAttentionDemand,
    personaSuppression: semantics.personaSuppression,
    confidence: semantics.confidence,
    reasonTags: semantics.reasonTags,
  }
}

describe('dialogue-turn-semantics', () => {
  it('does not retain a Provider candidate parser or Coding Agent delegation payload', () => {
    const source = readFileSync(new URL('./dialogue-turn-semantics.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('AlicizationDialogueTurnSemanticsCandidate')
    expect(source).not.toContain('parseDialogueTurnSemanticsCandidate')
    expect(source).not.toContain('mergeDialogueTurnSemantics')
    expect(source).not.toContain('codingAgentDelegation')
  })

  it('does not contain natural-language cue tables or lexical reply-posture branches', () => {
    const source = readFileSync(new URL('./dialogue-turn-semantics.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(
      /interrogativeCuePattern|requestCuePattern|currentActivityQuestionPattern|companionshipBidPattern|greetingBidPattern|careRequestPattern|hostStateCuePattern|answerRepairCuePattern|selfInquiryCuePattern|selfToneAdjustmentCuePattern|selfIdentityAffirmationCuePattern/u,
    )
    expect(source).not.toMatch(
      /greeting-bid|care-request|companionship-bid|answer-realignment-followup|self-directed-question|self-tone-adjustment|terse-social-turn|explicit-help-cue/u,
    )
  })

  it('keeps ordinary wording neutral until structured cognition interprets it', () => {
    const expected = {
      act: 'unknown',
      responseNeed: 'answer',
      truthExpectation: 'normal',
      affectiveTone: 'neutral',
      subjectPreference: null,
      taskAnchor: null,
      sharedAttentionDemand: 0.12,
      personaSuppression: 0.08,
      confidence: 0.24,
      reasonTags: ['structured-fallback'],
    }

    for (const userText of [
      '你好呀',
      '我有点伤心，你可以安慰一下我吗',
      '能不能说人话',
      '这题好难，你可以帮帮我吗',
      '你觉得你可爱吗',
      '没错，这个人就是你',
      'what do you mean?',
    ]) {
      expect(visiblePosture(userText), userText).toEqual(expected)
    }
  })

  it('derives inspection posture only from the structured inspection flag', () => {
    const ordinary = buildDialogueTurnSemantics({
      userText: '你自己看桌面啊',
      context: neutralContext,
      currentScene: null,
    })
    const inspection = buildDialogueTurnSemantics({
      userText: '任意文字',
      context: neutralContext,
      currentScene: null,
      inspectionRequested: true,
    })

    expect(ordinary.reasonTags).toEqual(['structured-fallback'])
    expect(inspection).toMatchObject({
      act: 'verify-grounding',
      responseNeed: 'repair',
      truthExpectation: 'strict',
      subjectPreference: 'visible-scene',
      taskAnchor: null,
      reasonTags: expect.arrayContaining([
        'inspection-requested-turn',
        'inspection-owned-turn',
        'inspection-needs-reground',
      ]),
    })
  })

  it('uses structured relationship need instead of comfort wording', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '完全不包含安慰关键词',
      context: {
        ...neutralContext,
        relationship: {
          ...neutralContext.relationship,
          fatigue: 72,
        },
      },
      currentScene: null,
      subjectiveInference: buildSubjectiveInference({
        need: 'care',
      }),
    })

    expect(semantics).toMatchObject({
      act: 'seek-care',
      responseNeed: 'care',
      truthExpectation: 'normal',
      affectiveTone: 'tired',
      subjectPreference: 'host-state',
      taskAnchor: null,
      reasonTags: expect.arrayContaining([
        'structured-relationship-need-care',
      ]),
    })
  })

  it('uses structured companionship need instead of greeting wording', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '任意文字',
      context: neutralContext,
      currentScene: null,
      subjectiveInference: buildSubjectiveInference({
        need: 'companionship',
      }),
    })

    expect(semantics).toMatchObject({
      act: 'social-bid',
      responseNeed: 'accompany',
      truthExpectation: 'light',
      affectiveTone: 'warm',
      subjectPreference: 'relationship',
      taskAnchor: null,
      reasonTags: expect.arrayContaining([
        'structured-relationship-need-companionship',
      ]),
    })
  })

  it('uses structured host intent to keep a live task anchored', () => {
    const semantics = buildDialogueTurnSemantics({
      userText: '任意文字',
      context: codingContext,
      currentScene: null,
      worldModel: buildWorldModel(),
      subjectiveInference: buildSubjectiveInference({
        goal: 'inspect-change',
        need: 'guidance',
      }),
    })

    expect(semantics).toMatchObject({
      act: 'verify-grounding',
      responseNeed: 'guide',
      truthExpectation: 'strict',
      subjectPreference: 'task-knot',
      reasonTags: expect.arrayContaining([
        'structured-host-goal-inspect-change',
        'structured-relationship-need-guidance',
        'task-anchor',
      ]),
    })
    expect(semantics.taskAnchor).toContain('runtime.ts')
  })
})
