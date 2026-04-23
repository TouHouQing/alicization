import { describe, expect, it } from 'vitest'

import { buildMemoryRecollectionIntent } from './memory-recollection-intent'

describe('memory recollection intent', () => {
  it('chooses execution-procedure recollection for task-thread reuse turns', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '按之前那样把这个 runtime 问题继续修掉',
      sceneContext: {
        cueSummary: 'Cursor diff lane with terminal patch flow',
        appName: 'Cursor',
        processName: 'Cursor',
        targetTitle: 'runtime.ts diff',
        scenario: 'coding',
        workloadKind: 'coding',
        contentKind: 'diff',
      },
      conversationState: {
        jointThread: 'continue runtime repair',
        hostMove: '按之前那样把这个 runtime 问题继续修掉',
        activeProject: 'runtime repair',
        unansweredQuestion: null,
        owedRepair: null,
        activeCommitments: [],
        relationFrame: 'guide',
        continuityPolicy: 'stay-on-thread',
        memoryMode: 'task-thread',
        memoryQueryHints: ['runtime repair', 'patch'],
        shouldHoldThread: true,
        confidence: 0.8,
        narrative: [],
        updatedAt: 1,
      } as any,
      dialogueWorldThread: {
        activeThread: 'runtime repair',
        currentQuestion: null,
        openLoops: [],
        recentlyResolvedLoops: [],
        carriedFacts: [],
        relationDrift: 'steady',
        memoryMode: 'task-thread',
        recallKeys: ['runtime', 'patch'],
        lastUserMove: '按之前那样把这个 runtime 问题继续修掉',
        lastAssistantMove: '我们上次是先定位回调链路。',
        lastOutcome: 'aligned',
        confidence: 0.8,
        narrative: [],
        updatedAt: 1,
      } as any,
      answerCompiler: {
        answerSubject: 'task-knot',
      } as any,
    })

    expect(intent?.mode).toBe('execution-procedure')
    expect(intent?.temporalFocus).toBe('experience-matched')
    expect(intent?.searchProceduralExperience).toBe(true)
    expect(intent?.queryHints).toEqual(expect.arrayContaining([
      'Cursor diff lane with terminal patch flow',
      'runtime.ts diff',
      'Cursor',
      'scene:coding',
    ]))
  })

  it('chooses relationship history recollection for bond-history turns', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '你之前也是这样回应我的吗',
      answerCompiler: {
        answerSubject: 'relationship',
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
      } as any,
      privateThought: {
        stance: 'care',
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.searchConversations).toBe(true)
    expect(intent?.searchEpisodes).toBe(true)
  })

  it('lets relationship-triggered tone complaints wake bond history even without explicit before-language', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '你为什么这次会这样回应我',
      answerCompiler: {
        answerSubject: 'relationship',
      } as any,
      replyDeliberation: {
        selectedMotive: 'attune',
      } as any,
      privateThought: {
        stance: 'care',
        emotionalTension: 'late-night-drain',
      } as any,
      conversationState: {
        jointThread: 'relationship seam',
        hostMove: '你为什么这次会这样回应我',
        memoryQueryHints: ['relationship seam'],
      } as any,
    })

    expect(intent?.mode).toBe('relationship-history')
    expect(intent?.rationale).toContain('current relational tone')
    expect(intent?.queryHints).toContain('mood:late-night-drain')
  })

  it('lets mood-congruent autobiographical pressure wake lived continuity without explicit memory wording', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '我今晚又有点乱了',
      answerCompiler: {
        answerSubject: 'alicization-self',
      } as any,
      privateThought: {
        emotionalTension: 'late-night-drain',
      } as any,
      replyDeliberation: {
        selectedMotive: 'care',
      } as any,
      longHorizonMemory: {
        dominantCueSummary: 'Remembered late-night seam: hold the line gently before speaking.',
        rememberedPlanSummary: 'Remembered plan: keep the inward line stable.',
      } as any,
      dialogueWorldThread: {
        activeThread: 'late-night seam',
        recallKeys: ['late-night seam'],
      } as any,
    })

    expect(intent?.mode).toBe('autobiographical-history')
    expect(intent?.queryHints).toContain('mood:late-night-drain')
    expect((intent?.confidence ?? 0)).toBeGreaterThan(0.4)
  })
})
