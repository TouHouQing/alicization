import { describe, expect, it } from 'vitest'

import {
  attachSynthesizedReflections,
  buildDialogueReplyFeedbackOutcomeClosure,
  buildExecutionProposalFeedbackOutcomeClosure,
  buildExecutionResultFeedbackOutcomeClosure,
  buildProactiveFeedbackOutcomeClosure,
  buildReplyOutcomeClosure,
  deriveDialogueReplyFeedbackKind,
  deriveExecutionProposalFeedbackKind,
  deriveExecutionResultFeedbackKind,
} from './outcome-reinforcement'

describe('outcome reinforcement closure', () => {
  it('reinforces autonomy respect when a reply stays light during a busy host window', () => {
    const closure = buildReplyOutcomeClosure({
      now: 10_000,
      cardId: 'card-1',
      turnId: 'turn-1',
      sessionId: 'session-1',
      decisionTraceId: 'trace-1',
      assistantText: 'I will stay light here and not crowd you.',
      runtimeSurface: {
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
              title: 'debug knot',
            },
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'repair and clarify',
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
          actionEcology: {
            mode: 'repair-before-speaking',
          },
        },
      } as any,
    })

    expect(closure.relationshipOutcomes[0]?.boundaryDelta).toBeGreaterThan(0)
    expect(closure.relationshipOutcomes[0]?.misreadDelta).toBeLessThan(0)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'autonomy-respect' && event.valence === 'reinforce')).toBe(true)
    expect(closure.memoryFacts.some(fact => fact.predicate === 'boundary')).toBe(true)
    expect(closure.episodicEvents[0]).toEqual(expect.objectContaining({
      sourceKind: 'reply',
      provenance: 'observed',
      withWhom: ['host'],
    }))
    expect(closure.episodicEvents[0]?.whatHappened).toContain('hover')
  })

  it('suppresses companionship and strengthens space-respect after dismissed proactive feedback', () => {
    const closure = buildProactiveFeedbackOutcomeClosure({
      now: 20_000,
      cardId: 'card-1',
      outcomes: [{
        turnId: 'turn-proactive-1',
        scenario: 'late-night-care',
        outcome: 'dismiss',
        createdAt: 20_000,
      }],
    })

    expect(closure.relationshipOutcomes[0]?.boundaryDelta).toBeLessThan(0)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'autonomy-respect' && event.valence === 'reinforce')).toBe(true)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'companionship' && event.valence === 'suppress')).toBe(true)
    expect(closure.memoryFacts[0]?.object).toContain('more space')
    expect(closure.episodicEvents[0]).toEqual(expect.objectContaining({
      sourceKind: 'proactive',
      provenance: 'observed',
    }))
  })

  it('synthesizes reflections from persisted closure results', () => {
    const closure = attachSynthesizedReflections(buildProactiveFeedbackOutcomeClosure({
      now: 30_000,
      cardId: 'card-1',
      outcomes: [{
        turnId: 'turn-proactive-2',
        scenario: 'general',
        outcome: 'ignored',
        createdAt: 30_000,
      }],
    }))

    expect(closure.reflections).toHaveLength(1)
    expect(closure.reflections[0]?.targetScope).toBe('boundary')
    expect(closure.reflections[0]?.lesson).toContain('space')
  })

  it('classifies ordinary dialogue feedback into received / robotic / missed / intrusive / interrupted', () => {
    expect(deriveDialogueReplyFeedbackKind({
      previousAssistantText: '我是小艾。',
      userText: '这次像人多了',
    })).toBe('received')
    expect(deriveDialogueReplyFeedbackKind({
      previousAssistantText: '我是小艾。',
      userText: '你还是太像机器人了',
    })).toBe('robotic')
    expect(deriveDialogueReplyFeedbackKind({
      previousAssistantText: '我是小艾。',
      userText: '不是这个意思',
    })).toBe('missed')
    expect(deriveDialogueReplyFeedbackKind({
      previousAssistantText: '我是小艾。',
      userText: '先别这样安慰我，太挤了',
    })).toBe('intrusive')
    expect(deriveDialogueReplyFeedbackKind({
      previousAssistantText: '我是小艾。',
      userText: '先说别的',
    })).toBe('interrupted')
  })

  it('writes ordinary dialogue robotic feedback back into the same long-horizon growth chain', () => {
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 35_000,
      cardId: 'card-1',
      sessionId: 'session-1',
      turnId: 'turn-reply-feedback-1',
      decisionTraceId: 'trace-reply-1',
      feedback: 'robotic',
      previousAssistantText: '你好。你想继续聊，还是想让我做点什么，都直接说。',
    })

    expect(closure.relationshipOutcomes[0]?.trustDelta).toBeLessThan(0)
    expect(closure.relationshipOutcomes[0]?.repairDelta).toBeGreaterThan(0)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'companionship' && event.valence === 'reinforce')).toBe(true)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'temper-guardedness' && event.valence === 'suppress')).toBe(true)
    expect(closure.memoryFacts[0]?.object).toContain('natural')
  })

  it('writes intrusive reply feedback into autonomy-respect and directness suppression', () => {
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 36_000,
      cardId: 'card-1',
      sessionId: 'session-1',
      turnId: 'turn-reply-feedback-2',
      decisionTraceId: 'trace-reply-2',
      feedback: 'intrusive',
      previousAssistantText: '你现在好累，那我先陪你缓一下，不把话题扯开。',
    })

    expect(closure.relationshipOutcomes[0]?.boundaryDelta).toBeLessThan(0)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'autonomy-respect' && event.valence === 'reinforce')).toBe(true)
    expect(closure.reinforcementEvents.some(event => event.dimension === 'temper-directness' && event.valence === 'suppress')).toBe(true)
  })

  it('derives affirmed / denied / interrupted feedback kinds for pending execution proposals', () => {
    const thread = {
      threadId: 'thread-1',
      goal: 'Patch the runtime line',
      proposedChannel: 'codex',
      selectedChannel: null,
      summary: 'Execution is waiting for affirmation before codex can act.',
      affirmationReasonCodes: ['proactive-side-effects-require-explicit-consent'],
    }

    expect(deriveExecutionProposalFeedbackKind({
      thread,
      userText: '可以，做吧',
    })).toBe('affirmed')
    expect(deriveExecutionProposalFeedbackKind({
      thread,
      userText: '不用了，先别做',
    })).toBe('denied')
    expect(deriveExecutionProposalFeedbackKind({
      thread,
      userText: '先说别的，我现在想聊别的事',
    })).toBe('interrupted')
  })

  it('writes execution proposal feedback back into long-horizon temperament signals', () => {
    const affirmed = buildExecutionProposalFeedbackOutcomeClosure({
      now: 40_000,
      cardId: 'card-1',
      turnId: 'turn-affirm-1',
      feedback: 'affirmed',
      thread: {
        threadId: 'thread-affirm-1',
        goal: 'Patch the runtime line',
        proposedChannel: 'codex',
        selectedChannel: null,
        summary: 'Execution is waiting for affirmation before codex can act.',
      },
    })
    const denied = buildExecutionProposalFeedbackOutcomeClosure({
      now: 50_000,
      cardId: 'card-1',
      turnId: 'turn-deny-1',
      feedback: 'denied',
      thread: {
        threadId: 'thread-deny-1',
        goal: 'Patch the runtime line',
        proposedChannel: 'codex',
        selectedChannel: null,
        summary: 'Execution is waiting for affirmation before codex can act.',
      },
    })

    expect(affirmed.relationshipOutcomes[0]?.trustDelta).toBeGreaterThan(0)
    expect(affirmed.reinforcementEvents.some(event => event.dimension === 'temper-directness' && event.valence === 'reinforce')).toBe(true)
    expect(affirmed.reinforcementEvents.some(event => event.dimension === 'unfinished-thread-return' && event.valence === 'reinforce')).toBe(true)

    expect(denied.relationshipOutcomes[0]?.boundaryDelta).toBeLessThan(0)
    expect(denied.reinforcementEvents.some(event => event.dimension === 'autonomy-respect' && event.valence === 'reinforce')).toBe(true)
    expect(denied.reinforcementEvents.some(event => event.dimension === 'temper-guardedness' && event.valence === 'reinforce')).toBe(true)
    expect(denied.reinforcementEvents.some(event => event.dimension === 'temper-directness' && event.valence === 'suppress')).toBe(true)
  })

  it('classifies finished execution result feedback into valued / doubted / intrusive / interrupted', () => {
    const thread = {
      threadId: 'thread-result-1',
      goal: 'Patch the runtime line',
      proposedChannel: 'codex',
      selectedChannel: 'codex',
      summary: 'completed runtime patch',
      outcome: 'patched runtime line',
    }

    expect(deriveExecutionResultFeedbackKind({
      thread,
      previousAssistantText: '我已经把刚才那条 codex 执行结果接回来了，结果是 patched runtime line。',
      userText: '这个结果挺有用，以后可以这样',
    })).toBe('valued')
    expect(deriveExecutionResultFeedbackKind({
      thread,
      previousAssistantText: '我已经把刚才那条 codex 执行结果接回来了，结果是 patched runtime line。',
      userText: '这个结果不对',
    })).toBe('doubted')
    expect(deriveExecutionResultFeedbackKind({
      thread,
      previousAssistantText: '我已经把刚才那条 codex 执行结果接回来了，结果是 patched runtime line。',
      userText: '别这样突然报结果，挺打扰',
    })).toBe('intrusive')
    expect(deriveExecutionResultFeedbackKind({
      thread,
      previousAssistantText: '我已经把刚才那条 codex 执行结果接回来了，结果是 patched runtime line。',
      userText: '先聊别的，我还有别的问题',
    })).toBe('interrupted')
  })

  it('writes finished execution-result feedback into the same long-horizon learning chain', () => {
    const valued = buildExecutionResultFeedbackOutcomeClosure({
      now: 60_000,
      cardId: 'card-1',
      turnId: 'turn-valued-1',
      feedback: 'valued',
      thread: {
        threadId: 'thread-valued-1',
        goal: 'Patch the runtime line',
        proposedChannel: 'codex',
        selectedChannel: 'codex',
        summary: 'completed runtime patch',
        outcome: 'patched runtime line',
      },
    })
    const intrusive = buildExecutionResultFeedbackOutcomeClosure({
      now: 70_000,
      cardId: 'card-1',
      turnId: 'turn-intrusive-1',
      feedback: 'intrusive',
      thread: {
        threadId: 'thread-intrusive-1',
        goal: 'Patch the runtime line',
        proposedChannel: 'codex',
        selectedChannel: 'codex',
        summary: 'completed runtime patch',
        outcome: 'patched runtime line',
      },
    })

    expect(valued.relationshipOutcomes[0]?.trustDelta).toBeGreaterThan(0)
    expect(valued.reinforcementEvents.some(event => event.dimension === 'truthful-grounding' && event.valence === 'reinforce')).toBe(true)
    expect(valued.reinforcementEvents.some(event => event.dimension === 'temper-directness' && event.valence === 'reinforce')).toBe(true)

    expect(intrusive.relationshipOutcomes[0]?.boundaryDelta).toBeLessThan(0)
    expect(intrusive.reinforcementEvents.some(event => event.dimension === 'autonomy-respect' && event.valence === 'reinforce')).toBe(true)
    expect(intrusive.reinforcementEvents.some(event => event.dimension === 'temper-directness' && event.valence === 'suppress')).toBe(true)
  })
})
