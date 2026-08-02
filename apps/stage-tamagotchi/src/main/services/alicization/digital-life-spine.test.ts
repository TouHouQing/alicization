import { describe, expect, it } from 'vitest'

import {
  commitAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpine,
  deriveAlicizationDigitalLifeSpineFromSurface,
  projectAlicizationDigitalLifeSpineDigest,
} from './digital-life-spine'
import { createDefaultVisualPresenceState } from './visual-episodic-memory'

function createRuntimeSurface(overrides: Record<string, unknown> = {}) {
  return {
    version: 'digital-life-runtime-surface-v1',
    perception: {
      watchMode: 'symbiotic-vision',
      currentScene: {
        scenario: 'coding',
        summary: '当前窗口显示用户正在处理的真实任务。',
      },
      attention: null,
      captureState: null,
      durabilityPulse: null,
      recentTransition: null,
      nextSuggestedProbeMs: 30_000,
      updatedAt: 10,
    },
    dialogue: {
      currentConsciousFrame: {
        focusAnchor: '真实当前回合锚点',
        consciousNeed: '用户正在询问当前任务。',
        reasonTags: ['subject:task-knot'],
      },
      answerPlanner: {
        answerIntent: 'answer-current-turn',
      },
      conversationState: null,
    },
    world: {
      worldModel: null,
      relationshipModel: null,
    },
    cognition: {
      privateThought: null,
      subjectiveInference: null,
      beliefRevision: null,
      appraisal: null,
      mindDynamics: null,
      mindKernel: null,
    },
    memory: {
      summary: 'WorkingMemory 与 LongTermMemoryRecall 的真实摘要。',
      workingMemoryEpisodes: [
        {
          id: 'working-memory-1',
          summary: '本轮用户正在检查记忆链路。',
        },
      ],
      recallGovernor: {
        mode: 'targeted',
      },
      personStateProjection: null,
      longHorizonMemory: null,
      reflectionLedger: null,
      selfContinuity: null,
      autobiographicalSelf: null,
      motiveEngine: null,
      personMemoryCapsule: null,
    },
    agency: {
      initiative: {
        selectedAction: 'answer',
        preferredStyle: 'direct',
        shouldSpeak: true,
        confidence: 0.84,
        why: '用户正在等待当前回合的回答。',
      },
      autonomy: {
        selectedMode: 'speak',
        visibleAction: null,
        shouldSpeak: true,
        shouldAct: false,
        speakReadiness: 0.86,
        actReadiness: 0.1,
        inhibition: 0.08,
        confidence: 0.88,
        executionIntent: null,
        deferReason: null,
        whyNow: '当前回合需要回答。',
      },
      selfState: null,
      habitPolicy: null,
      actionEcology: null,
      selfGovernor: null,
    },
    ...overrides,
  } as any
}

describe('digital life spine', () => {
  it('只聚合真实运行时、对话和记忆事实', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest(
      deriveAlicizationDigitalLifeSpineFromSurface(createRuntimeSurface()),
    )

    expect(Object.keys(digest?.runtime ?? {}).sort()).toEqual([
      'activeThreadId',
      'activeThreadTitle',
      'answerIntent',
      'dominantDrive',
      'dominantMode',
      'preferredPresence',
      'sceneScenario',
      'sceneSummary',
      'selectedAction',
      'updatedAt',
      'watchMode',
    ])
    expect(Object.keys(digest?.proactive ?? {}).sort()).toEqual([
      'activeThreadId',
      'activeThreadTitle',
      'confidence',
      'dominantConcernKind',
      'dominantConcernSummary',
      'leadingGoalId',
      'leadingGoalSummary',
      'personaBias',
      'preferredPresence',
      'preferredStyle',
      'selectedAction',
      'shouldSpeak',
    ])
  })

  it('保留真实主动能力与当前对话焦点', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest(
      deriveAlicizationDigitalLifeSpineFromSurface(createRuntimeSurface()),
    )

    expect(digest?.runtime).toEqual(expect.objectContaining({
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      sceneSummary: '当前窗口显示用户正在处理的真实任务。',
      answerIntent: 'answer-current-turn',
      selectedAction: 'answer',
    }))
    expect(digest?.autonomy).toEqual(expect.objectContaining({
      selectedMode: 'speak',
      shouldSpeak: true,
      shouldAct: false,
      speakReadiness: 0.86,
      actReadiness: 0.1,
    }))
    expect(digest?.proactive?.shouldSpeak).toBe(true)
  })

  it('保留真实短期记忆和长期召回摘要', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest(
      deriveAlicizationDigitalLifeSpineFromSurface(createRuntimeSurface()),
    )

    expect(digest?.memory).toEqual(expect.objectContaining({
      recentEpisodeSummary: '本轮用户正在检查记忆链路。',
      recentEpisodeCount: 1,
      recallMode: 'targeted',
    }))
  })

  it('保留干净 person-state authority，不把治理来源当作人格事实', () => {
    const digest = projectAlicizationDigitalLifeSpineDigest(
      deriveAlicizationDigitalLifeSpineFromSurface(createRuntimeSurface({
        memory: {
          summary: '真实长期记忆摘要。',
          workingMemoryEpisodes: [],
          recallGovernor: {
            mode: 'targeted',
          },
          personStateProjection: {
            selfContinuityAuthority: {
              sourceTags: ['persona-reinforcement'],
              inwardLine: '真实反思形成的稳定自我理解。',
              authoritySummary: '来自已清理长期反思的事实。',
            },
          },
        },
      })),
    )

    expect(digest?.memory?.personStateProjection?.selfContinuityAuthority).toEqual(expect.objectContaining({
      sourceTags: ['persona-reinforcement'],
      inwardLine: '真实反思形成的稳定自我理解。',
      authoritySummary: '来自已清理长期反思的事实。',
    }))
  })

  it('从持久化视觉状态构造同一份数字生命 spine', () => {
    const state = createDefaultVisualPresenceState(2_000)
    state.watchMode = 'symbiotic-vision'
    state.currentScene = {
      workloadKind: 'coding',
      contentKind: 'general',
      scenario: 'coding',
      summary: '当前窗口显示真实任务。',
      source: 'screen-semantic-summary',
      confidence: 0.86,
      beganAt: 1_700,
      lastSeenAt: 2_000,
    } as any

    const spine = deriveAlicizationDigitalLifeSpine(state)
    const digest = projectAlicizationDigitalLifeSpineDigest(spine)

    expect(spine.version).toBe('digital-life-spine-v1')
    expect(digest?.runtime).toEqual(expect.objectContaining({
      watchMode: 'symbiotic-vision',
      sceneScenario: 'coding',
      sceneSummary: '当前窗口显示真实任务。',
    }))
  })

  it('提交 mind state 时同时保留上一状态和当前状态', () => {
    const previousState = createDefaultVisualPresenceState(1_000)
    const nextState = createDefaultVisualPresenceState(2_000)
    nextState.watchMode = 'symbiotic-vision'

    const committed = commitAlicizationDigitalLifeSpine({
      now: 2_000,
      previousState,
      watchMode: nextState.watchMode,
      scene: nextState.currentScene,
      attention: nextState.attention,
      mindState: {
        ...nextState,
        privateThought: nextState.privateThought,
      },
    } as any)

    expect(committed.version).toBe('digital-life-spine-commit-v1')
    expect(committed.previousState).toBe(previousState)
    expect(committed.nextState).not.toBe(previousState)
    expect(committed.previous.version).toBe('digital-life-spine-v1')
    expect(committed.current.version).toBe('digital-life-spine-v1')
  })
})
