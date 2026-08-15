import { readFileSync } from 'node:fs'

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

function expectEvidenceOnlyClosure(closure: any) {
  expect(closure.episodicEvents ?? []).toEqual(expect.arrayContaining([
    expect.objectContaining({
      felt: null,
      lesson: null,
      relationshipMeaning: null,
    }),
  ]))
  for (const fact of closure.memoryFacts ?? []) {
    expect(fact).toEqual(expect.objectContaining({
      subject: expect.any(String),
      predicate: expect.any(String),
      object: expect.any(String),
      confidence: expect.any(Number),
    }))
  }
}

function derivedEvidenceLabels(closure: any) {
  return (closure.episodicEvents ?? [])
    .flatMap((event: any) => event.derivedFrom ?? [])
    .map((item: any) => item.label ?? '')
}

describe('outcome reinforcement closure', () => {
  it('does not call retired context resolvers or synthesize policy facts', () => {
    const source = readFileSync(new URL('./outcome-reinforcement.ts', import.meta.url), 'utf8')
    const retiredResolverNames = [
      ['resolveAlicization', 'Project', 'StateBrief'].join(''),
      ['resolveAlicization', 'Project', 'StateSnapshot'].join(''),
    ]

    for (const name of retiredResolverNames)
      expect(source).not.toContain(name)
    expect(source).not.toMatch(/structuredFixedTemplateMemoryFact/u)
  })

  it('does not turn raw reply transcripts into long-term closure evidence', () => {
    const rawUserText = '请继续看这个真实问题。'
    const rawAssistantText = 'The response stayed grounded in the current issue.'
    const closure = buildReplyOutcomeClosure({
      now: 12_000,
      cardId: 'card-1',
      turnId: 'turn-body-evidence',
      sessionId: 'session-body-evidence',
      decisionTraceId: 'trace-body-evidence',
      userText: rawUserText,
      assistantText: rawAssistantText,
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'legacy-governance-payload-ignored',
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
          },
        },
        dialogue: {
          currentConsciousFrame: {
            speakingIntention: 'The response stayed grounded in the current issue.',
            legacyEnvelope: {
              marker: 'legacy-governance-payload-ignored',
              nested: {
                text: 'unrelated structured noise',
              },
            },
          },
        },
      },
    } as any)

    expect(closure.episodicEvents).toEqual([])
    expect(closure.reflections).toEqual([])
    expect(closure.reinforcementEvents).toEqual([])
    expect(closure.memoryFacts).toEqual([])
    expect(JSON.stringify(closure)).not.toContain(rawUserText)
    expect(JSON.stringify(closure)).not.toContain(rawAssistantText)
  })

  it('rejects Provider failure or review prose when no structured memory evidence exists', () => {
    const providerFailure = 'Embedding provider failed with HTTP 400: invalid parameter.'
    const closure = buildReplyOutcomeClosure({
      now: 12_100,
      cardId: 'card-1',
      turnId: 'turn-provider-failure',
      sessionId: 'session-provider-failure',
      decisionTraceId: 'trace-provider-failure',
      assistantText: providerFailure,
      runtimeSurface: {
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
          },
        },
        dialogue: {
          answerPlanner: {
            answerIntent: 'report the provider failure',
          },
        },
      },
    } as any)

    expect(closure.episodicEvents).toEqual([])
    expect(closure.reflections).toEqual([])
    expect(closure.reinforcementEvents).toEqual([])
    expect(JSON.stringify(closure)).not.toContain(providerFailure)
  })

  it('builds a reply episode only from explicit structured non-transcript evidence', () => {
    const rawTranscript = 'RAW_REPLY_TRANSCRIPT must stay in WorkingMemory only'
    const evidenceSummary = 'The host-approved memory note records a resolved task checkpoint.'
    const closure = buildReplyOutcomeClosure({
      now: 12_125,
      cardId: 'card-1',
      turnId: 'turn-structured-evidence',
      sessionId: 'session-structured-evidence',
      decisionTraceId: 'trace-structured-evidence',
      userText: rawTranscript,
      assistantText: rawTranscript,
      memoryEvidence: {
        version: 'reply-outcome-memory-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        summary: evidenceSummary,
        sourceRefs: [{
          kind: 'turn',
          id: 'reviewed-memory-evidence-1',
        }],
        tags: ['task-checkpoint'],
        confidence: 0.86,
        salience: 0.78,
      },
      runtimeSurface: {
        world: {
          worldModel: {
            hostState: {
              availability: 'open',
            },
          },
        },
      },
    } as any)

    expectEvidenceOnlyClosure(closure)
    expect(closure.episodicEvents).toEqual([
      expect.objectContaining({
        whatHappened: evidenceSummary,
        tags: expect.arrayContaining(['task-checkpoint']),
      }),
    ])
    expect(JSON.stringify(closure)).not.toContain(rawTranscript)
  })

  it('does not persist answer planning prose into reply outcome memory', () => {
    const closure = buildReplyOutcomeClosure({
      now: 12_150,
      cardId: 'card-1',
      turnId: 'turn-no-answer-plan-memory',
      sessionId: 'session-no-answer-plan-memory',
      decisionTraceId: 'trace-no-answer-plan-memory',
      userText: '继续验证真实记忆。',
      assistantText: '我们继续验证昨天的约定。',
      memoryEvidence: {
        version: 'reply-outcome-memory-evidence-v1',
        source: 'explicit-structured-memory-evidence',
        summary: 'A reviewed memory note records continuation of the prior agreement.',
        threadAnchor: '验证昨天的约定。',
        emotionTags: ['presence'],
        sourceRefs: [{
          kind: 'turn',
          id: 'reviewed-memory-evidence-2',
        }],
        tags: ['agreement'],
        confidence: 0.82,
        salience: 0.74,
      },
      runtimeSurface: {
        world: {
          worldModel: {
            hostState: {
              availability: 'open',
            },
            activeThread: null,
          },
        },
        dialogue: {
          answerPlanner: {
            act: 'answer',
            evidenceMode: 'memory-held',
            answerIntent: 'Internal repair and clarify plan.',
          },
          conversationState: {
            jointThread: '验证昨天的约定。',
          },
        },
      },
    } as any)

    expect(JSON.stringify(closure)).not.toContain('Internal repair and clarify plan.')
    expect(closure.episodicEvents[0]?.threadAnchor).toBe('验证昨天的约定。')
    expect(closure.episodicEvents[0]?.emotionTags).toContain('presence')
    expect(closure.episodicEvents[0]?.emotionTags).not.toContain('repair')
  })

  it('does not self-reinforce an ordinary reply without user evaluation', () => {
    const closure = buildReplyOutcomeClosure({
      now: 12_200,
      cardId: 'card-1',
      turnId: 'turn-unrated-reply',
      sessionId: 'session-unrated-reply',
      decisionTraceId: 'trace-unrated-reply',
      userText: '继续。',
      assistantText: 'Provider generated reply.',
      runtimeSurface: {
        world: {
          worldModel: {
            hostState: {
              availability: 'focused',
            },
            activeThread: {
              unresolved: true,
            },
          },
        },
        agency: {
          initiative: {
            selectedAction: 'hover',
            preferredStyle: 'silent-observe',
          },
        },
      },
    } as any)

    expect(closure.relationshipOutcomes).toEqual([])
    expect(closure.reinforcementEvents).toEqual([])
    expect(closure.episodicEvents).toEqual([])
  })

  it('does not classify dialogue reply feedback from free-text user signals', () => {
    expect(deriveDialogueReplyFeedbackKind({
      userText: '这段回复太模板',
      previousAssistantText: 'The previous reply.',
    } as any)).toBeNull()
    expect(deriveDialogueReplyFeedbackKind({
      userText: 'That reply was robotic.',
      previousAssistantText: 'The previous reply.',
    } as any)).toBeNull()
    expect(deriveDialogueReplyFeedbackKind({
      feedback: {
        kind: 'robotic',
        source: 'typed-ui',
        replyTurnId: 'turn-1',
      },
    } as any)).toBe('robotic')
    expect(deriveExecutionProposalFeedbackKind({
      userText: '可以',
      thread: {
        threadId: 'thread-1',
        goal: 'Run the requested command',
        proposedChannel: 'executor',
        selectedChannel: null,
        summary: 'A command is ready.',
      },
    } as any)).toBe('affirmed')
    expect(deriveExecutionResultFeedbackKind({
      userText: '不对',
      previousAssistantText: '执行结果：命令已完成。',
      thread: {
        threadId: 'thread-2',
        goal: 'Run the requested command',
        proposedChannel: 'executor',
        selectedChannel: null,
        summary: 'A command completed.',
        outcome: 'failed',
      },
    } as any)).toBe('doubted')
  })

  it('writes dialogue feedback from typed feedback evidence without raw transcript', () => {
    const rawUserText = '这段回复太模板，像客服。'
    const rawAssistantText = 'The previous reply sounded generic.'
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 13_000,
      cardId: 'card-1',
      sessionId: 'session-dialogue-feedback',
      turnId: 'turn-dialogue-feedback',
      decisionTraceId: 'trace-dialogue-feedback',
      feedback: 'robotic',
      userText: rawUserText,
      previousAssistantText: rawAssistantText,
    })

    expectEvidenceOnlyClosure(closure)
    expect(closure.memoryFacts).toEqual([])
    expect(derivedEvidenceLabels(closure)).toEqual([
      'feedback turn',
      'feedback trace',
    ])
    expect(closure.episodicEvents).toEqual([
      expect.objectContaining({
        whatHappened: 'feedback=robotic',
      }),
    ])
    expect(JSON.stringify(closure)).not.toContain(rawUserText)
    expect(JSON.stringify(closure)).not.toContain(rawAssistantText)
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'dialogue-feedback',
      'feedback:robotic',
    ]))
  })

  it('writes intrusive dialogue feedback as a cleaned boundary fact for long-horizon recall', () => {
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 13_500,
      cardId: 'card-1',
      sessionId: 'session-dialogue-feedback',
      turnId: 'turn-dialogue-feedback',
      decisionTraceId: 'trace-dialogue-feedback',
      feedback: 'intrusive',
      userText: '先别这样安慰我，太挤了',
      previousAssistantText: '你现在好累，那我先陪你缓一下。',
    })

    expectEvidenceOnlyClosure(closure)
    expect(closure.memoryFacts).toEqual([
      expect.objectContaining({
        subject: 'relationship',
        predicate: 'boundary',
        object: 'dialogue_feedback=intrusive; host needs more space before close replies',
        confidence: 0.84,
        sourceLabel: 'dialogue-feedback',
      }),
    ])
    expect(JSON.stringify(closure.memoryFacts)).not.toContain('太挤了')
    expect(JSON.stringify(closure.memoryFacts)).not.toContain('你现在好累')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'dialogue-feedback',
      'feedback:intrusive',
    ]))
  })

  it('retains structured execution proposal feedback without unrelated runtime carry', () => {
    const closure = buildExecutionProposalFeedbackOutcomeClosure({
      now: 14_000,
      cardId: 'card-1',
      sessionId: 'session-proposal-feedback',
      turnId: 'turn-proposal-feedback',
      decisionTraceId: 'trace-proposal-feedback',
      feedback: 'denied',
      thread: {
        threadId: 'thread-3',
        goal: 'Run the requested command',
        proposedChannel: 'executor',
        selectedChannel: null,
        summary: 'The command requires confirmation.',
        userText: '先别执行这个命令。',
        legacyEnvelope: {
          marker: 'legacy-governance-payload-ignored',
        },
      },
    } as any)

    expectEvidenceOnlyClosure(closure)
    expect(closure.memoryFacts).toEqual([])
    expect(derivedEvidenceLabels(closure)).toEqual(expect.arrayContaining([
      'execution proposal feedback turn',
      'Run the requested command',
    ]))
    expect(JSON.stringify(closure)).not.toContain('先别执行这个命令。')
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'execution-proposal',
      'feedback:denied',
    ]))
  })

  it('preserves a real execution failure in result feedback', () => {
    const providerFailure = 'Tool failed: process exited with code 1.'
    const closure = buildExecutionResultFeedbackOutcomeClosure({
      now: 15_000,
      cardId: 'card-1',
      sessionId: 'session-result-feedback',
      turnId: 'turn-result-feedback',
      decisionTraceId: 'trace-result-feedback',
      feedback: 'doubted',
      thread: {
        threadId: 'thread-4',
        goal: 'Run the requested command',
        proposedChannel: 'executor',
        selectedChannel: 'executor',
        summary: providerFailure,
        outcome: providerFailure,
        userText: '这个结果不对，请先停下。',
        previousAssistantText: '命令执行失败，我需要重新核对。',
        safetyGateSummary: 'effect=blocked-before-dispatch confirmation=required no-process-started',
        resumeConfirmationSummary: 'approval=host-confirmed-before-redispatch process-not-yet-restarted',
        legacyEnvelope: {
          marker: 'legacy-governance-payload-ignored',
        },
      },
    } as any)

    const serialized = JSON.stringify(closure)
    expect(serialized).toContain(providerFailure)
    expect(serialized).not.toContain('这个结果不对，请先停下。')
    expect(serialized).not.toContain('命令执行失败，我需要重新核对。')
    expect(serialized).toContain('blocked-before-dispatch')
    expect(serialized).toContain('host-confirmed-before-redispatch')
    expectEvidenceOnlyClosure(closure)
  })

  it('keeps proactive outcome learning structured and reflection-ready', () => {
    const emotionalTransitionLedger = {
      version: 'emotional-transition-ledger-v1',
      source: 'test',
      entries: [],
      updatedAt: 16_000,
    } as any
    const closure = buildProactiveFeedbackOutcomeClosure({
      now: 16_000,
      cardId: 'card-1',
      sessionId: 'session-proactive-feedback',
      turnId: 'turn-proactive-feedback',
      decisionTraceId: 'trace-proactive-feedback',
      emotionalTransitionLedger,
      outcomes: [{
        turnId: 'turn-proactive-feedback',
        scenario: 'coding',
        outcome: 'positive',
        createdAt: 16_000,
        userText: '这个提醒有用。',
        assistantText: 'A grounded proactive observation.',
        emotionalTransitionLedger,
      }],
    } as any)
    const reflected = attachSynthesizedReflections(closure)

    expect(reflected.emotionalTransitionLedger).toBe(emotionalTransitionLedger)
    expect(reflected.reflections.length).toBeGreaterThanOrEqual(0)
    expectEvidenceOnlyClosure(reflected)
    expect(reflected.memoryFacts).toEqual([])
    expect(derivedEvidenceLabels(reflected)).toEqual(['coding proactive turn'])
    expect(JSON.stringify(reflected)).not.toContain('这个提醒有用。')
    expect(JSON.stringify(reflected)).not.toContain('A grounded proactive observation.')
  })
})
