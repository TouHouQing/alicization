import type { AlicizationMindTurnGovernance } from '../stores/alicization-bridge'

import { describe, expect, it } from 'vitest'

import {
  buildMindGovernedFallbackSurface,
  replyLeaksGovernedMindSurface,
  replyLooksCoherentSceneAnswer,
  shouldForceGovernedMindSurface,
} from './alicization-mind-fallback'

function t(path: string, params?: Record<string, unknown>) {
  const map: Record<string, string> = {
    'mind-fallback.focus-default': 'the current thing',
    'mind-fallback.repair-stale-anchor': 'Let me correct that first: the previous read was stale.',
    'mind-fallback.repair-need-reground': 'Let me hold the truth boundary first: I need a fresh view.',
    'mind-fallback.dialogue-boundary-memory': 'This turn I stay with what you just said instead of forcing old screen carry back over it.',
    'mind-fallback.care-body': 'You do not need to sort it out first. I am here with you, and you can tell me what hit you this way.',
    'mind-fallback.accompany-body': 'I heard this clearly. Stay here with me a little, or tell me the part that is catching on you.',
    'mind-fallback.answer-repair-body': 'I said that badly. Let me answer you directly.',
    'mind-fallback.answer-dialogue-body': 'Alright. I will answer you directly and stay with this turn.',
    'mind-fallback.guide-opening': `Guide: ${String(params?.focus ?? '')}`,
    'mind-fallback.guide-opening-plain': 'Guide: plain',
    'mind-fallback.care-opening': `Care: ${String(params?.focus ?? '')}`,
    'mind-fallback.care-opening-plain': 'Care: plain',
    'mind-fallback.accompany-opening': `Accompany: ${String(params?.focus ?? '')}`,
    'mind-fallback.accompany-opening-plain': 'Accompany: plain',
    'mind-fallback.observation-opening': `Observe: ${String(params?.focus ?? '')}`,
    'mind-fallback.observation-opening-plain': 'Observe: plain',
    'mind-fallback.answer-opening': `Answer: ${String(params?.focus ?? '')}`,
    'mind-fallback.answer-opening-plain': 'Answer: plain',
    'mind-fallback.carry-memory': `Carry: ${String(params?.carry ?? '')}`,
    'mind-fallback.reground-note': 'Reground on the fresh view.',
  }
  return map[path] ?? path
}

function createGovernance(overrides: Partial<AlicizationMindTurnGovernance> = {}): AlicizationMindTurnGovernance {
  return {
    turnMode: 'guide-current-knot',
    truthState: 'live-observed',
    personaKernelMode: 'backgrounded',
    openingStyle: 'direct-answer',
    relationshipPosture: 'warm',
    answerAct: 'guide',
    evidenceMode: 'coarse-held',
    repairState: 'none',
    liveSurface: 'VS Code | diff view',
    focusAnchor: 'the failing diff',
    answerIntent: 'Localize the failing change before editing.',
    openingMove: 'Open from the current failing diff.',
    carriedThread: null,
    suppressAssociativeRecall: true,
    labelCarryAsMemory: false,
    shouldAskForGrounding: false,
    shouldAcknowledgeRepair: false,
    maxSentences: 3,
    mindMode: 'tracking',
    embodiedPresence: 'attentive',
    emotionalTension: 'tense-debug',
    mustDo: [],
    mustNotDo: [],
    ...overrides,
  }
}

describe('buildMindGovernedFallbackSurface', () => {
  it('does not force visible reply takeover for guide-current-knot without explicit repair', () => {
    expect(shouldForceGovernedMindSurface(createGovernance({
      turnMode: 'guide-current-knot',
      repairState: 'none',
      truthState: 'uncertain',
      evidenceMode: 'repair-first',
      screenReferenceMode: 'required',
    }), 'describe my screen again')).toBe(false)
  })

  it('does not force fallback takeover once this turn already has live grounding', () => {
    expect(shouldForceGovernedMindSurface(createGovernance({
      turnMode: 'screen-repair',
      repairState: 'stale-anchor',
      shouldAskForGrounding: true,
      shouldAcknowledgeRepair: true,
      groundedThisTurn: true,
      screenReferenceMode: 'required',
    }), 'describe my screen again')).toBe(false)
  })

  it('does not force fallback takeover for guide turns that only carry soft reground hints', () => {
    expect(shouldForceGovernedMindSurface(createGovernance({
      turnMode: 'guide-current-knot',
      answerAct: 'guide',
      repairState: 'none',
      shouldAskForGrounding: true,
      shouldAcknowledgeRepair: false,
      screenReferenceMode: 'helpful',
    }), 'describe my screen again')).toBe(false)
  })

  it('still forces fallback takeover for explicit ask-reground repair turns', () => {
    expect(shouldForceGovernedMindSurface(createGovernance({
      turnMode: 'screen-repair',
      answerAct: 'ask-reground',
      repairState: 'need-reground',
      shouldAskForGrounding: true,
      shouldAcknowledgeRepair: true,
      groundedThisTurn: false,
      screenReferenceMode: 'required',
    }), 'describe my screen again')).toBe(true)
  })

  it('does not force repair takeover for non-inspection dialogue even when repair flags remain', () => {
    expect(shouldForceGovernedMindSurface(createGovernance({
      turnMode: 'screen-repair',
      answerAct: 'ask-reground',
      answerSubject: 'alicization-self',
      repairState: 'need-reground',
      shouldAskForGrounding: true,
      shouldAcknowledgeRepair: true,
      groundedThisTurn: false,
      screenReferenceMode: 'required',
      focusAnchor: 'current-user-turn',
      answerIntent: 'Answer the host greeting directly.',
    }), '你好')).toBe(false)
  })

  it('builds a repair-first surface for stale anchors', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        turnMode: 'screen-repair',
        answerAct: 'correct-stale-anchor',
        repairState: 'stale-anchor',
      }),
      userText: 'describe my screen again',
      translate: t,
    })

    expect(result).not.toBeNull()
    expect(result?.thought).toContain('obligation=repair')
    expect(result?.thought).toContain('truth=coarse')
    expect(result?.reply).toContain('stale')
    expect(result?.emotion).toBe('apologetic')
  })

  it('labels carried continuity instead of claiming it as current surface', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        turnMode: 'screen-repair',
        answerAct: 'ask-reground',
        repairState: 'need-reground',
        carriedThread: 'previous browser tab',
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: true,
      }),
      userText: 'look at my screen again and tell me what is wrong here',
      translate: t,
    })

    expect(result).not.toBeNull()
    expect(result?.reply).toContain('Carry: previous browser tab')
    expect(result?.reply).toContain('Reground on the fresh view.')
    expect(result?.reply).not.toContain('current screen')
  })

  it('uses contextual opening for need-reground when a concrete focus exists', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        turnMode: 'screen-repair',
        answerAct: 'ask-reground',
        repairState: 'need-reground',
        focusAnchor: 'IntelliJ IDEA with Java project and git diff',
        answerIntent: 'IntelliJ IDEA with Java project and git diff',
        shouldAskForGrounding: true,
      }),
      userText: '你猜我在干嘛',
      translate: t,
    })

    expect(result).not.toBeNull()
    expect(result?.reply).toContain('Answer: IntelliJ IDEA with Java project and git diff')
    expect(result?.reply).not.toContain('truth boundary')
    expect(result?.reply).not.toContain('Reground on the fresh view.')
  })

  it('avoids stacking carry-memory and reground templates on non-repair guide turns', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        turnMode: 'guide-current-knot',
        answerAct: 'guide',
        repairState: 'none',
        carriedThread: 'previous browser tab',
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
        shouldAcknowledgeRepair: false,
      }),
      userText: 'what is wrong here',
      translate: t,
    })

    expect(result).not.toBeNull()
    expect(result?.reply).toContain('Guide:')
    expect(result?.reply).not.toContain('Carry:')
    expect(result?.reply).not.toContain('Reground on the fresh view.')
  })

  it('does not author dialogue-first accompany text from internal carried-thread or governance-planning text', () => {
    const governance = createGovernance({
      turnMode: 'accompany',
      answerAct: 'answer',
      carriedThread: 'There is a real care need under the current scene.',
      answerIntent: 'The turn is asking for Alicization’s relational position, not a detached explanation.',
      labelCarryAsMemory: true,
    })

    const result = buildMindGovernedFallbackSurface({
      governance,
      userText: '你真可爱',
      translate: t,
    })

    expect(result).toBeNull()
    expect(replyLeaksGovernedMindSurface(
      'Answer: The turn is asking for Alicization’s relational position, not a detached explanation.',
      governance,
      '你真可爱',
    )).toBe(true)
  })

  it('does not author dialogue-first care text locally', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        turnMode: 'care',
        answerAct: 'care',
        answerSubject: 'host-state',
        screenReferenceMode: 'avoid',
        focusAnchor: '我有点困了，你能哄我睡觉吗',
        answerIntent: '我有点困了，你能哄我睡觉吗',
        liveSurface: null,
      }),
      userText: '我有点困了，你能哄我睡觉吗',
      translate: t,
    })

    expect(result).toBeNull()
  })

  it('does not author ordinary dialogue-first answer turns locally', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        turnMode: 'answer',
        answerAct: 'answer',
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        focusAnchor: '给我讲个笑话吧',
        answerIntent: '给我讲个笑话吧',
        liveSurface: null,
      }),
      userText: '给我讲个笑话吧',
      translate: t,
    })

    expect(result).toBeNull()
  })

  it('prefers live observation fallback once a guide turn is already grounded', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        turnMode: 'guide-current-knot',
        answerAct: 'guide',
        answerSubject: 'visible-scene',
        screenReferenceMode: 'required',
        evidenceMode: 'live-grounded',
        truthState: 'live-grounded',
        groundedThisTurn: true,
        focusAnchor: 'GitHub Markdown doc for AI assistant module dev spec',
        answerIntent: 'GitHub markdown doc for AI assistant module dev spec',
        carriedThread: 'previous browser tab',
        labelCarryAsMemory: true,
        shouldAskForGrounding: true,
      }),
      userText: '你看看这个架构，你有什么想法吗',
      translate: t,
    })

    expect(result).not.toBeNull()
    expect(result?.reply).toContain('Observe: GitHub Markdown doc for AI assistant module dev spec')
    expect(result?.reply).not.toContain('Guide:')
    expect(result?.reply).not.toContain('Carry: previous browser tab')
    expect(result?.reply).not.toContain('Reground on the fresh view.')
    expect(result?.reply.match(/GitHub Markdown doc for AI assistant module dev spec/gi)?.length).toBe(1)
  })

  it('does not author dialogue-first meta-anchor repairs locally', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        turnMode: 'accompany',
        answerAct: 'answer',
        screenReferenceMode: 'avoid',
        focusAnchor: 'Code | Code | general unknown',
        answerIntent: 'The host is turning the dialogue back toward Alicization herself and expects a plain direct answer.',
        liveSurface: 'Code | Code | general unknown',
      }),
      userText: '不要再答非所问了好吗',
      translate: t,
    })

    expect(result).toBeNull()
  })

  it('marks concrete scene replies as coherent on explicit repair turns', () => {
    const governance = createGovernance({
      turnMode: 'screen-repair',
      answerAct: 'correct-stale-anchor',
      repairState: 'stale-anchor',
      answerSubject: 'visible-scene',
      screenReferenceMode: 'required',
      focusAnchor: 'Cursor runtime.ts diff with missing null guard',
      answerIntent: 'Cursor runtime.ts diff with missing null guard',
      liveSurface: 'Cursor | runtime.ts - diff',
    })

    expect(replyLooksCoherentSceneAnswer({
      reply: '我现在看到是 Cursor 的 runtime.ts diff，空值分支缺了 guard，先把这个分支补上再跑一次测试。',
      governance,
      userText: '你看看这个 diff 哪里错了',
    })).toBe(true)
  })

  it('marks concise current-activity guesses as coherent scene answers', () => {
    const governance = createGovernance({
      turnMode: 'guide-current-knot',
      answerAct: 'guide',
      repairState: 'none',
      answerSubject: 'task-knot',
      screenReferenceMode: 'helpful',
      focusAnchor: 'IntelliJ IDEA with Java project and git push output',
      answerIntent: 'IntelliJ IDEA with Java project and git push output',
      liveSurface: 'IntelliJ IDEA with Java project and git push output',
    })

    expect(replyLooksCoherentSceneAnswer({
      reply: '我猜你现在在 IntelliJ 里改这次 Java 提交。',
      governance,
      userText: '你猜我在干嘛',
    })).toBe(true)
  })

  it('does not mark generic repair prose as coherent scene answers', () => {
    const governance = createGovernance({
      turnMode: 'screen-repair',
      answerAct: 'ask-reground',
      repairState: 'need-reground',
      answerSubject: 'visible-scene',
      screenReferenceMode: 'required',
      focusAnchor: 'Cursor runtime.ts diff with missing null guard',
      answerIntent: 'Cursor runtime.ts diff with missing null guard',
      liveSurface: 'Cursor | runtime.ts - diff',
    })

    expect(replyLooksCoherentSceneAnswer({
      reply: '我先纠正一下，先别急，等你再给我一张截图我再说。',
      governance,
      userText: '你看看这个 diff 哪里错了',
    })).toBe(false)
  })

  it('uses mind-turn frame anchors before stale governance residue', () => {
    const result = buildMindGovernedFallbackSurface({
      governance: createGovernance({
        focusAnchor: 'old browser tab',
        answerIntent: 'old browser tab',
        liveSurface: 'Old browser tab',
        mindTurnFrame: {
          world: {
            activeThread: 'Current diff',
            visibleSurface: 'VS Code | current diff',
            truthState: 'live-grounded',
            truthBoundary: 'Stay on the live diff.',
            continuityPolicy: 'stay-on-thread',
            continuitySummary: 'scene-locked',
            staleRisk: 0.1,
          },
          relation: {
            subject: 'task-knot',
            hostMove: '看看这个 diff',
            hostGoal: 'resolve-problem',
            relationNeed: 'guidance',
            relationMove: 'guide',
            relationshipPosture: 'warm',
          },
          memory: {
            memoryMode: 'task-thread',
            carriedThread: 'Current diff',
            carriedFacts: [],
            recallKeys: [],
            recallSeed: 'Current diff',
            lastOutcome: 'pending',
            suppressAssociativeRecall: true,
            labelCarryAsMemory: false,
          },
          self: {
            stance: 'observe',
            mindMode: 'tracking',
            dominantDrive: 'understand',
            embodiedPresence: 'attentive',
            emotionalTension: 'tense-debug',
            initiativeAction: 'speak',
            thought: 'Stay with the current diff.',
          },
          obligation: {
            shouldSpeak: true,
            speechObligation: 'guide-task',
            answerAct: 'guide',
            responseMode: 'guide-current-knot',
            turnMode: 'guide-current-knot',
            openingClaim: 'The current diff already shows the broken branch.',
            openingMove: 'Lead from the broken branch.',
            answerIntent: 'Explain the broken branch before suggesting edits.',
            whyNow: 'The live diff is visible now.',
            repairState: 'none',
            shouldAskForGrounding: false,
            shouldAcknowledgeRepair: false,
          },
          focusAnchor: 'The current diff already shows the broken branch.',
          confidence: 0.82,
          mustDo: [],
          mustNotDo: [],
          narrative: [],
          updatedAt: 1,
        },
      }),
      userText: '看看这个 diff',
      translate: t,
    })

    expect(result).not.toBeNull()
    expect(result?.reply).toContain('Observe: The current diff already shows the broken branch.')
    expect(result?.reply).not.toContain('old browser tab')
    expect(result?.thought).toContain('move=lead-from-the-broken-branch.')
  })
})
