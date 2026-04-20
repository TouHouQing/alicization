import { describe, expect, it } from 'vitest'

import { buildMemoryRecollectionIntent } from './memory-recollection-intent'

describe('memory recollection intent', () => {
  it('chooses execution-procedure recollection for task-thread reuse turns', () => {
    const intent = buildMemoryRecollectionIntent({
      userText: '按之前那样把这个 runtime 问题继续修掉',
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
})
