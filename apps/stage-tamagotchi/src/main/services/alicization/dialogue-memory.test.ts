import { describe, expect, it } from 'vitest'

import { buildDialogueTurnMemoryFragment } from './dialogue-memory'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

describe('buildDialogueTurnMemoryFragment', () => {
  it('builds searchable memory from governed user-turn dialogue', () => {
    const fragment = buildDialogueTurnMemoryFragment({
      payload: {
        turnId: 'turn-1',
        sessionId: 'session-1',
        origin: 'user-turn',
        userText: '重新看一下我现在这个 diff 的风险点',
        assistantText: '先锁定这段 risky hunk，我们从这里开始拆。',
      },
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'live-observed',
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        answerAct: 'guide',
        evidenceMode: 'coarse-held',
        repairState: 'none',
        focusAnchor: 'diff-risk-hunk',
        answerIntent: '先给出最可能的风险块',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
      },
      state: {
        watchMode: 'mnemonic-passive',
        currentScene: null,
        attention: null,
        workingMemoryEpisodes: [],
        privateThought: null,
        dialogueWorldThread: {
          activeThread: '继续盯住 diff 的风险块',
          relationDrift: 'steady',
          unresolvedQuestion: '',
          unresolvedReason: '',
          carryWeight: 0.68,
          confidence: 0.72,
          lastAssistantMove: '先锁定 risky hunk',
          lastOutcome: 'aligned',
          currentQuestion: '这个 hunk 到底哪里最危险',
          sourceTags: [],
          updatedAt: 10_000,
        },
        conversationState: {
          jointThread: '看当前 diff 风险',
          unansweredQuestion: '',
          hostNeed: 'guidance',
          turnOwnership: 'shared',
          continuityPolicy: 'stay-on-thread',
          memoryMode: 'task-thread',
          carryForward: true,
          relationDrift: 'steady',
          confidence: 0.72,
          narrative: [],
          updatedAt: 10_000,
        },
        answerPlanner: {
          act: 'guide',
          evidenceMode: 'coarse-held',
          confidence: 0.75,
          governingFocus: '先从风险最大的 hunk 开始',
          openingMove: '先锁定风险块',
          answerIntent: '先给出最可能的风险块',
          relationshipPosture: 'warm',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          mustDo: [],
          mustNotDo: [],
          narrative: [],
          updatedAt: 10_000,
        },
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 10_000,
        updatedAt: 10_000,
      } as any,
    })

    expect(fragment).toContain('dialogue_turn_mode:guide-current-knot')
    expect(fragment).toContain('dialogue_subject:task-knot')
    expect(fragment).toContain('dialogue_act:guide')
    expect(fragment).toContain('dialogue_thread:继续盯住 diff 的风险块')
    expect(fragment).toContain('continuity_policy:stay-on-thread')
    expect(fragment).toContain('user:重新看一下我现在这个 diff 的风险点')
    expect(fragment).toContain('assistant:先锁定这段 risky hunk，我们从这里开始拆。')
  })

  it('returns empty when the turn is not governed', () => {
    const fragment = buildDialogueTurnMemoryFragment({
      payload: {
        origin: 'user-turn',
        userText: '你好',
        assistantText: '你好',
      },
      governance: null,
    })
    expect(fragment).toBe('')
  })

  it('returns empty for subconscious proactive turns', () => {
    const fragment = buildDialogueTurnMemoryFragment({
      payload: {
        origin: 'subconscious-proactive',
        userText: '',
        assistantText: '我来提醒你休息',
      },
      governance: {
        turnMode: 'accompany',
        truthState: 'remembered',
        personaKernelMode: 'backgrounded',
        openingStyle: 'light-accompaniment',
        relationshipPosture: 'warm',
        repairState: 'none',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: false,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 3,
        mustDo: [],
        mustNotDo: [],
      },
    })
    expect(fragment).toBe('')
  })

  it('prefers dialogue memory cues from the runtime surface', () => {
    const fragment = buildDialogueTurnMemoryFragment({
      payload: {
        turnId: 'turn-surface',
        sessionId: 'session-surface',
        origin: 'user-turn',
        userText: '继续顺着这个 knot 讲',
        assistantText: '我先继续沿着当前 knot 往下拆。',
      },
      governance: {
        turnMode: 'guide-current-knot',
        truthState: 'remembered',
        personaKernelMode: 'backgrounded',
        openingStyle: 'direct-answer',
        relationshipPosture: 'warm',
        answerSubject: 'task-knot',
        screenReferenceMode: 'helpful',
        answerAct: 'guide',
        evidenceMode: 'coarse-held',
        repairState: 'none',
        focusAnchor: 'current-knot',
        answerIntent: '继续沿着当前 knot 往下拆',
        suppressAssociativeRecall: false,
        labelCarryAsMemory: true,
        shouldAskForGrounding: false,
        shouldAcknowledgeRepair: false,
        maxSentences: 4,
        mustDo: [],
        mustNotDo: [],
      },
      state: {
        watchMode: 'mnemonic-passive',
        currentScene: null,
        attention: null,
        workingMemoryEpisodes: [],
        privateThought: null,
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 10_000,
        updatedAt: 10_000,
      } as any,
      runtimeSurface: buildAlicizationDigitalLifeRuntimeSurface({
        watchMode: 'symbiotic-vision',
        currentScene: null,
        attention: null,
        workingMemoryEpisodes: [],
        privateThought: null,
        conversationState: {
          jointThread: '继续顺着这个 knot 讲',
          unansweredQuestion: '',
          hostNeed: 'guidance',
          turnOwnership: 'shared',
          continuityPolicy: 'answer-then-carry',
          memoryMode: 'task-thread',
          carryForward: true,
          relationDrift: 'steady',
          confidence: 0.7,
          narrative: [],
          updatedAt: 10_000,
        },
        dialogueWorldThread: {
          activeThread: '继续顺着当前 knot 往下拆',
          relationDrift: 'steady',
          unresolvedQuestion: '',
          unresolvedReason: '',
          carryWeight: 0.62,
          confidence: 0.74,
          lastAssistantMove: '先继续沿着当前 knot 讲',
          lastOutcome: 'aligned',
          currentQuestion: '这个 knot 下一步应该先看哪里',
          sourceTags: [],
          updatedAt: 10_000,
        },
        answerPlanner: {
          act: 'guide',
          evidenceMode: 'coarse-held',
          confidence: 0.74,
          governingFocus: '先继续沿着当前 knot 讲',
          openingMove: '继续当前 knot',
          answerIntent: '继续沿着当前 knot 往下拆',
          relationshipPosture: 'warm',
          shouldAskForGrounding: false,
          shouldAcknowledgeRepair: false,
          mustDo: [],
          mustNotDo: [],
          narrative: [],
          updatedAt: 10_000,
        },
        captureState: {
          permission: 'unknown',
          lastGroundedAt: null,
        },
        durabilityPulse: null,
        recentTransition: null,
        nextSuggestedProbeMs: 10_000,
        updatedAt: 10_000,
      } as any),
    })

    expect(fragment).toContain('dialogue_thread:继续顺着当前 knot 往下拆')
    expect(fragment).toContain('continuity_policy:answer-then-carry')
    expect(fragment).toContain('answer_focus:先继续沿着当前 knot 讲')
  })
})
