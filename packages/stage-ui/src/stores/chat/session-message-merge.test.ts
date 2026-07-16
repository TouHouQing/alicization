import type { ChatHistoryItem } from '../../types/chat'

import assert from 'node:assert/strict'

import { describe, it } from 'vitest'

import { canonicalizeSessionMessages, mergeLoadedSessionMessages } from './session-message-merge'

const legacyProjectStateCueKeys = [
  'preDialogueAwarenessLine',
  'preDialogueAwarenessSummary',
  'awarenessLine',
  'companionHeadlineLine',
  'companionBriefingLine',
  'companionNextClosureLine',
  'sameHerSelfLine',
  'sameHerSummary',
  'sameHerHoldDetail',
  'sameHerDriftRisk',
  'sameHerDriftRiskLine',
  'sameHerDriftRiskSummary',
  'emotionalClosureCue',
  'emotionalClosureSummary',
  'continuityCue',
  'continuityAnchor',
  'continuityHold',
  'continuityDriftRisk',
  'proactiveSameHerGap',
  'proactiveSameHerGapSummary',
  'companionExperimentalCue',
  'sameHerExperimentalCue',
  'emotionalClosureExperimentalCue',
  'proactiveSameHerExperimentalCue',
] as const

function assertLegacyProjectStateCuesRemoved(projectState: Record<string, unknown>) {
  for (const key of legacyProjectStateCueKeys)
    assert.equal(Object.hasOwn(projectState, key), false, `${key} should be removed`)
}

describe('mergeLoadedSessionMessages', () => {
  it('keeps stored history when the in-memory session only has the placeholder system message', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'assistant', content: 'saved reply', createdAt: 2, id: 'assistant-1', slices: [], tool_results: [] },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
    ]

    assert.equal(mergeLoadedSessionMessages(storedMessages, currentMessages), storedMessages)
  })

  it('appends in-flight messages when persisted history finishes loading after a new send starts', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'assistant', content: 'older reply', createdAt: 2, id: 'assistant-1', slices: [], tool_results: [] },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
      { role: 'user', content: 'latest prompt', createdAt: 4, id: 'user-2' },
    ]

    assert.deepEqual(mergeLoadedSessionMessages(storedMessages, currentMessages), [
      ...storedMessages,
      currentMessages[1],
    ])
  })

  it('does not duplicate messages that are already present in persisted history', () => {
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      { role: 'user', content: 'latest prompt', createdAt: 4 },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 3, id: 'system-current' },
      { role: 'user', content: 'latest prompt', createdAt: 4 },
    ]

    assert.equal(mergeLoadedSessionMessages(storedMessages, currentMessages), storedMessages)
  })

  it('merges duplicate assistant messages while keeping the stable turn id and authoritative thought', () => {
    const stableTurnId = 'chat:session-1:turn-1'
    const storedMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 1, id: 'system-stored' },
      {
        role: 'assistant',
        content: 'The train leaves at nine.',
        createdAt: 10_000,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: 'The train leaves at nine.' }],
        tool_results: [],
        structured: {
          thought: 'The saved ticket confirms the departure time.',
          emotion: 'neutral',
          reply: 'The train leaves at nine.',
          format: 'mind-turn-v1',
        },
      },
    ]
    const currentMessages: ChatHistoryItem[] = [
      { role: 'system', content: 'system', createdAt: 2, id: 'system-current' },
      {
        role: 'assistant',
        content: 'The train leaves at nine.',
        createdAt: 10_500,
        id: 'temporary-assistant-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: 'The train leaves at nine.',
          format: 'fallback-v1',
        },
      },
    ]

    const assistantMessages = mergeLoadedSessionMessages(storedMessages, currentMessages)
      .filter(message => message.role === 'assistant')

    assert.equal(assistantMessages.length, 1)
    assert.equal(assistantMessages[0]?.id, stableTurnId)
    assert.equal(
      (assistantMessages[0] as Extract<ChatHistoryItem, { role: 'assistant' }>).structured?.thought,
      'The saved ticket confirms the departure time.',
    )
  })

  it('keeps the user message before the assistant message when their timestamps match', () => {
    const canonical = canonicalizeSessionMessages([
      { role: 'system', content: 'system', createdAt: 1, id: 'system' },
      {
        role: 'assistant',
        content: 'I saved the packing note.',
        createdAt: 10,
        id: 'chat:session-1:turn-2',
        slices: [],
        tool_results: [],
      },
      {
        role: 'user',
        content: 'Please remember the packing note.',
        createdAt: 10,
        id: 'chat:session-1:turn-2:user',
      },
    ])

    assert.deepEqual(canonical.map(message => message.role), ['system', 'user', 'assistant'])
  })

  it('removes legacy pre-dialogue fields when duplicate assistant messages merge', () => {
    const stableTurnId = 'chat:session-1:turn-3'
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: 'The umbrella decision is still open.',
        createdAt: 20_000,
        id: 'temporary-assistant-id',
        slices: [],
        tool_results: [],
        structured: {
          thought: '',
          emotion: 'neutral',
          reply: 'The umbrella decision is still open.',
          format: 'fallback-v1',
          preDialogueSendIdentity: {
            summaryLine: 'deprecated send identity',
          },
          preDialogueAwareness: {
            status: 'partial',
            summaryLine: 'deprecated awareness cue',
            reasonPreview: ['deprecated awareness reason'],
          },
          preDialogueClosure: {
            status: 'partial',
            summaryLine: 'deprecated closure cue',
            briefingLines: ['deprecated closure briefing'],
            reasons: ['deprecated closure reason'],
          },
          visibleReplyRealization: {
            projectStateAudit: {
              landedProgressSummary: 'deprecated visible reply audit',
            },
          },
        },
      } as ChatHistoryItem,
      {
        role: 'assistant',
        content: 'The umbrella decision is still open.',
        createdAt: 20_500,
        id: stableTurnId,
        origin: 'user-turn',
        slices: [{ type: 'text', text: 'The umbrella decision is still open.' }],
        tool_results: [],
        structured: {
          thought: 'The saved trip note has no umbrella choice yet.',
          emotion: 'neutral',
          reply: 'The umbrella decision is still open.',
          format: 'mind-turn-v1',
        },
      },
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as Extract<
      ChatHistoryItem,
      { role: 'assistant' }
    >

    assert.equal(assistantMessage.id, stableTurnId)
    assert.equal(Object.hasOwn(assistantMessage.structured ?? {}, 'preDialogueSendIdentity'), false)
    assert.equal(Object.hasOwn(assistantMessage.structured ?? {}, 'preDialogueAwareness'), false)
    assert.equal(Object.hasOwn(assistantMessage.structured ?? {}, 'preDialogueClosure'), false)
    assert.equal(Object.hasOwn(assistantMessage.structured ?? {}, 'visibleReplyRealization'), false)
  })

  it('removes legacy project-state cue fields while preserving ordinary natural facts', () => {
    const naturalProjectFacts = {
      identity: 'This session records a weekend train trip.',
      currentPhase: 'The tickets are confirmed.',
      latestLandedProgress: 'The Saturday morning ticket is saved.',
      primaryOpenLoop: 'The umbrella choice is still undecided.',
      nextClosureTarget: 'Check the weather before departure.',
      continuitySummary: 'The itinerary came from the previous conversation.',
      itinerary: {
        station: 'Hongqiao',
        departure: 'Saturday morning',
      },
    }
    const deprecatedProjectCues = Object.fromEntries(
      legacyProjectStateCueKeys.map(key => [key, `deprecated cue for ${key}`]),
    )
    const canonical = canonicalizeSessionMessages([
      {
        role: 'assistant',
        content: 'The Saturday morning ticket is saved.',
        createdAt: 30_000,
        id: 'chat:session-1:turn-4',
        slices: [],
        tool_results: [],
        structured: {
          thought: 'The itinerary contains a confirmed ticket and one unresolved packing detail.',
          emotion: 'neutral',
          reply: 'The Saturday morning ticket is saved.',
          format: 'mind-turn-v1',
          projectState: {
            ...naturalProjectFacts,
            ...deprecatedProjectCues,
          },
        },
      } as ChatHistoryItem,
    ])

    const assistantMessage = canonical.find(message => message.role === 'assistant') as Extract<
      ChatHistoryItem,
      { role: 'assistant' }
    >
    const projectState = assistantMessage.structured?.projectState as unknown as Record<string, unknown>

    assertLegacyProjectStateCuesRemoved(projectState)
    assert.deepEqual(projectState, naturalProjectFacts)
  })
})
