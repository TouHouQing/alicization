import { describe, expect, it } from 'vitest'

import { buildHostPersonModelSnapshot } from './humanlike-memory'
import { buildMemoryRecollectionIntent } from './memory-recollection-intent'

function createEpisode(overrides: Record<string, unknown> = {}) {
  return {
    id: 'event-default',
    cardId: 'card-1',
    decisionTraceId: null,
    turnId: 'turn-1',
    sessionId: 'session-1',
    sourceKind: 'dialogue-feedback',
    provenance: 'observed',
    occurredAt: 10_000,
    whereSummary: 'focused coding window',
    withWhom: ['host'],
    threadAnchor: 'runtime repair',
    whatHappened: 'The host said the reply felt intrusive during focused work.',
    felt: 'I had stepped too close.',
    emotionTags: ['boundary', 'repair'],
    whatChanged: 'boundary strained 0.10, burden up 0.08',
    relationshipMeaning: 'Focused windows need more room before closeness.',
    lesson: 'If the host is focused, back off and re-enter with a lighter touch.',
    sourceSummary: 'host dialogue feedback',
    confidence: 0.88,
    salience: 0.9,
    sceneAttachment: 0.7,
    consolidationPriority: 0.8,
    relationshipShift: {
      closenessDelta: -0.03,
      trustDelta: -0.04,
      burdenDelta: 0.08,
      boundaryDelta: -0.1,
      misreadDelta: 0.04,
      repairDelta: 0.02,
      openLoopDelta: 0,
    },
    derivedFrom: [],
    tags: ['dialogue-feedback', 'focused-window'],
    createdAt: 10_000,
    updatedAt: 10_000,
    lastRecalledAt: null,
    recallCount: 0,
    reconsolidationCount: 0,
    latestReconsolidation: null,
    ...overrides,
  } as any
}

describe('humanlike memory dialogue regression set', () => {
  describe('acceptance prompts', () => {
    it('handles "几天前我们聊过什么" as cross-session conversation recall instead of recent-turn only memory', () => {
      const intent = buildMemoryRecollectionIntent({
        userText: '几天前我们聊过什么',
        conversationState: {
          jointThread: 'runtime continuity',
          hostMove: '几天前我们聊过什么',
          memoryMode: 'dialogue-carry',
          memoryQueryHints: ['runtime continuity', 'same session drift'],
        } as any,
        dialogueEncounter: {
          dialogueFirst: true,
          subject: 'relationship',
        } as any,
      })

      expect(intent?.mode).toBe('conversation-history')
      expect(intent?.temporalFocus).toBe('cross-session')
      expect(intent?.searchConversations).toBe(true)
    })

    it('handles "以前你是怎么帮我做这个的" as procedural recollection rather than generic search', () => {
      const intent = buildMemoryRecollectionIntent({
        userText: '以前你是怎么帮我做这个的',
        conversationState: {
          jointThread: 'runtime seam',
          hostMove: '以前你是怎么帮我做这个的',
          activeProject: 'runtime seam',
          memoryMode: 'task-thread',
          memoryQueryHints: ['runtime seam', 'cli patch'],
          shouldHoldThread: true,
        } as any,
        dialogueWorldThread: {
          activeThread: 'runtime seam repair',
          memoryMode: 'task-thread',
          recallKeys: ['runtime seam', 'cli patch', 'verify'],
        } as any,
        answerCompiler: {
          answerSubject: 'task-knot',
        } as any,
      })

      expect(intent?.mode).toBe('execution-procedure')
      expect(intent?.temporalFocus).toBe('experience-matched')
      expect(intent?.searchProceduralExperience).toBe(true)
    })

    it('handles "上次你是怎么弄的" as procedural recollection without needing explicit date retrieval', () => {
      const intent = buildMemoryRecollectionIntent({
        userText: '上次你是怎么弄的',
        conversationState: {
          jointThread: 'runtime seam',
          hostMove: '上次你是怎么弄的',
          activeProject: 'runtime seam',
          memoryMode: 'task-thread',
          memoryQueryHints: ['runtime seam', 'repair rhythm'],
          shouldHoldThread: true,
        } as any,
        dialogueWorldThread: {
          activeThread: 'runtime seam repair',
          memoryMode: 'task-thread',
          recallKeys: ['runtime seam', 'repair rhythm', 'verify'],
        } as any,
        answerCompiler: {
          answerSubject: 'task-knot',
        } as any,
      })

      expect(intent?.mode).toBe('execution-procedure')
      expect(intent?.temporalFocus).toBe('experience-matched')
      expect(intent?.recollectionAgenda?.candidateTimeScopes[0]?.scope).toBe('experience-matched')
    })

    it('handles relationship rupture questions as relationship-history recollection', () => {
      const intent = buildMemoryRecollectionIntent({
        userText: '我们之前关系为什么会变差',
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
      })

      expect(intent?.mode).toBe('relationship-history')
      expect(intent?.searchEpisodes).toBe(true)
      expect(intent?.searchConversations).toBe(true)
    })

    it('remembers host sensitivities when asked "你记得我对这类事的敏感点吗"', () => {
      const personModel = buildHostPersonModelSnapshot({
        now: 20_000,
        facts: [],
        relationshipDynamics: null,
        events: [
          createEpisode(),
          createEpisode({
            id: 'event-2',
            sourceKind: 'execution-result',
            whereSummary: 'execution callback via codex',
            threadAnchor: 'runtime patch',
            whatHappened: 'A bounded codex result landed as useful after explicit consent.',
            felt: 'The result was genuinely useful.',
            emotionTags: ['execution', 'validated'],
            whatChanged: 'trust up 0.09, closeness up 0.03',
            relationshipMeaning: 'Bounded execution can be direct when consent is explicit.',
            lesson: 'Execution callbacks land best when proposal, action, and result stay bounded.',
            sourceSummary: 'execution result feedback',
            confidence: 0.84,
            salience: 0.82,
            sceneAttachment: 0.42,
            consolidationPriority: 0.64,
            relationshipShift: {
              closenessDelta: 0.03,
              trustDelta: 0.09,
              burdenDelta: 0,
              boundaryDelta: 0.02,
              misreadDelta: -0.03,
              repairDelta: 0.03,
              openLoopDelta: 0.05,
            },
            tags: ['execution-result', 'consent'],
          }),
        ],
      })

      expect(personModel.sensitivities.some(item => item.includes('intrusive') || item.includes('pressure'))).toBe(true)
      expect(personModel.repairTriggers.some(item => item.includes('repair') || item.includes('robotic'))).toBe(true)
      expect(personModel.preferredClosenessByContext.some(item => item.context === 'focused-work')).toBe(true)
    })
  })

  describe('failure mode regression set', () => {
    it('wakes relationship-triggered recollection instead of failing to recall when the host asks why the tone changed', () => {
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
        } as any,
      })

      expect(intent?.mode).toBe('relationship-history')
      expect(intent?.rationale).toContain('current relational tone')
    })
  })
})
