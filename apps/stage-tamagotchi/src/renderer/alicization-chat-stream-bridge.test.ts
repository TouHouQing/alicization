import { describe, expect, it } from 'vitest'

import {
  bridgeAlicizationChatChunkEventToStreamEvent,
  bridgeAlicizationChatErrorEventToStreamEvent,
  bridgeAlicizationChatFinishEventToStreamEvent,
  bridgeAlicizationChatMetaEventToStreamEvent,
  bridgeAlicizationChatStartResultToStreamEvent,
} from './alicization-chat-stream-bridge'

const failureSurface = {
  kind: 'provider-auth',
  reply: '错误：Provider 鉴权失败。',
  origin: 'failure-surface',
  allowLongTermCondensation: false,
  allowPersonaLearning: false,
  allowTraining: false,
  nonHumanAuthoredStatus: 'direct-infra-repair:provider-auth',
  visibleReplySource: 'infrastructure-failure',
  excludeFromPersonaLearning: true,
  excludeFromMemoryCondensation: true,
  auditCategory: 'alicization.chat-failure',
} as const

describe('alicization chat stream bridge', () => {
  it('forwards provider chunk authority metadata without rewriting text', () => {
    const event = bridgeAlicizationChatChunkEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-provider',
      text: 'Provider 可见回复',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    })

    expect(event).toEqual({
      type: 'text-delta',
      text: 'Provider 可见回复',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
    })
  })

  it('forwards the complete provider payload on finish for renderer persistence', () => {
    const fullText = JSON.stringify({
      format: 'mind-turn-v1',
      thought: 'dynamic thought',
      emotion: 'neutral',
      reply: 'Provider 可见回复',
    })
    const memoryFailures = [{
      kind: 'recall-failure',
      reply: '本轮长期记忆召回失败。',
      origin: 'failure-surface',
      allowLongTermCondensation: false,
      allowPersonaLearning: false,
      allowTraining: false,
      nonHumanAuthoredStatus: 'direct-infra-repair:recall-failure',
      visibleReplySource: 'infrastructure-failure',
      excludeFromPersonaLearning: true,
      excludeFromMemoryCondensation: true,
      auditCategory: 'alicization.chat-failure',
      stage: 'long-term-memory-recall',
      cardId: 'default',
      turnId: 'turn-provider',
      occurredAt: 10,
      errorSummary: 'recall offline',
    }] as const
    const event = bridgeAlicizationChatFinishEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-provider',
      status: 'completed',
      origin: 'provider',
      learningPolicy: {
        allowLongTermCondensation: true,
        allowPersonaLearning: true,
        allowTraining: false,
      },
      failureSurface: null,
      fullText,
      finishReason: 'stop',
      memoryFailures: [...memoryFailures],
    })

    expect(event).toMatchObject({
      type: 'finish',
      origin: 'provider',
      fullText,
      finishReason: 'stop',
      failureSurface: null,
      memoryFailures,
    })
  })

  it('forwards failure metadata exactly without generating a substitute reply', () => {
    const event = bridgeAlicizationChatErrorEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-failure',
      error: failureSurface.reply,
      origin: failureSurface.origin,
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface,
    })

    expect(event).toEqual({
      type: 'error',
      error: failureSurface.reply,
      origin: 'failure-surface',
      learningPolicy: {
        allowLongTermCondensation: false,
        allowPersonaLearning: false,
        allowTraining: false,
      },
      failureSurface,
    })
  })

  it('keeps runtime meta as structured data', () => {
    const event = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-meta',
      governance: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.2,
        companionshipPressure: 0.4,
        summary: 'dialogue=ready',
      } as any,
    })

    expect(event).toMatchObject({
      type: 'meta',
      governance: null,
      runtimeDigest: {
        dominantChannel: 'dialogue',
        summary: null,
      },
    })
  })

  it.each([
    'Before answering, keep the same-her line.',
    'Keep measured-return pacing before replying.',
    'Use repair-before-closeness as the response posture.',
    'opening_policy=continue_same_her',
    'relationship_cadence=measured_return',
    'visibility=redacted_internal',
  ])('does not restore rejected legacy awareness through the renderer bridge: %s', (awarenessLine) => {
    const event = bridgeAlicizationChatMetaEventToStreamEvent({
      cardId: 'default',
      turnId: 'turn-legacy-awareness',
      governance: null,
      preDialogueAwareness: {
        status: 'grounded',
        summaryLine: null,
        awarenessLine,
        reasonPreview: [],
      },
    })

    expect(event.preDialogueAwareness?.awarenessLine ?? null).toBeNull()
  })

  it('does not promote project-state governance from accepted-start runtime metadata', () => {
    const event = bridgeAlicizationChatStartResultToStreamEvent('default', {
      accepted: true,
      turnId: 'turn-start-runtime',
      state: 'accepted',
      governance: null,
      runtimeDigest: {
        version: 'alicization-runtime-digest-v1',
        dominantChannel: 'dialogue',
        shouldProactivelySpeak: false,
        shouldProactivelyAct: false,
        continuityPressure: 0.2,
        companionshipPressure: 0.4,
        projectState: {
          identity: 'typed runtime project state',
          latestLandedProgress: 'typed runtime progress',
        },
      } as any,
    })

    expect(event.projectState).toBeNull()
    expect(event.preDialogueAwareness).toBeNull()
    expect(event.preDialogueClosure).toBeNull()
    expect(event.runtimeDigest?.projectState).toEqual(expect.objectContaining({
      identity: 'typed runtime project state',
      latestLandedProgress: 'typed runtime progress',
    }))
  })
})
