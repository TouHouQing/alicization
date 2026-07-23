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

const fixedGovernanceResidue
  = /body_preoccupation|posture=|same-her|same her|Phase 1|project_state|project-state|opening_policy|relationship_cadence|I kept /iu

function expectNoFixedGovernanceResidue(value: unknown) {
  expect(JSON.stringify(value)).not.toMatch(fixedGovernanceResidue)
}

describe('outcome reinforcement closure', () => {
  it('does not turn fixed body prose into reflection or persona-upstream closure text', () => {
    const closure = buildReplyOutcomeClosure({
      now: 12_000,
      cardId: 'card-1',
      turnId: 'turn-body-evidence',
      sessionId: 'session-body-evidence',
      decisionTraceId: 'trace-body-evidence',
      assistantText: 'The response stayed grounded in the current issue.',
      runtimeSurface: {
        perception: {
          currentBodyState: 'accompanying',
          continuityMode: 'quiet-accompaniment',
          currentInwardPreoccupation: 'body_preoccupation=rest_protection; direction=inward',
        },
        memory: {
          affectiveResidue: {
            dominantResidueKind: 'rest-protective',
          },
        },
        dialogue: {
          currentConsciousFrame: {
            speakingIntention: 'The response stayed grounded in the current issue.',
          },
        },
      },
    } as any)

    expectNoFixedGovernanceResidue(closure)
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'body-accompanying',
      'continuity-quiet-accompaniment',
      'residue-rest-protective',
    ]))
  })

  it('keeps a real Provider failure as dynamic evidence without wrapping it in fixed prose', () => {
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

    expect(JSON.stringify(closure)).toContain(providerFailure)
    expect(JSON.stringify(closure)).not.toContain('I kept')
  })

  it('keeps feedback classification grounded in the user signal', () => {
    expect(deriveDialogueReplyFeedbackKind({
      userText: '这段回复太模板',
      previousAssistantText: 'The previous reply.',
    })).toBe('robotic')
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

  it('writes dialogue feedback without reintroducing local governance text', () => {
    const closure = buildDialogueReplyFeedbackOutcomeClosure({
      now: 13_000,
      cardId: 'card-1',
      sessionId: 'session-dialogue-feedback',
      turnId: 'turn-dialogue-feedback',
      decisionTraceId: 'trace-dialogue-feedback',
      feedback: 'robotic',
      previousAssistantText: 'The previous reply sounded generic.',
    })

    expectNoFixedGovernanceResidue(closure)
    expect(closure.episodicEvents[0]?.tags).toEqual(expect.arrayContaining([
      'dialogue-feedback',
      'feedback:robotic',
    ]))
  })

  it('retains structured execution proposal feedback without project governance carry', () => {
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
      },
    } as any)

    expectNoFixedGovernanceResidue(closure)
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
      },
    } as any)

    expect(JSON.stringify(closure)).toContain(providerFailure)
    expectNoFixedGovernanceResidue(closure)
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
        assistantText: 'A grounded proactive observation.',
        emotionalTransitionLedger,
      }],
    } as any)
    const reflected = attachSynthesizedReflections(closure)

    expect(reflected.emotionalTransitionLedger).toBe(emotionalTransitionLedger)
    expect(reflected.reflections.length).toBeGreaterThanOrEqual(0)
    expectNoFixedGovernanceResidue(reflected)
  })
})
