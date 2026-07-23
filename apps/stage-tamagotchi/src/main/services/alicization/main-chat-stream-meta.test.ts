import { describe, expect, it, vi } from 'vitest'

import {
  buildAlicizationChatMetaPayload,
  buildAlicizationChatMetaSignature,
  createAlicizationChatStreamMetaEmitter,
} from './main-chat-stream-meta'

function buildMinimalPayloadInput() {
  return {
    cardId: 'card-stream-meta',
    turnId: 'turn-stream-meta',
    governance: null,
    visibleReplyExecution: {
      mode: 'provider-stream',
      expectedVisibleReplyAuthority: 'provider-mind',
      actualVisibleReplyAuthority: 'provider-mind',
      providerMindExecuted: true,
      reason: null,
    },
    embodiment: null,
    embodimentScript: null,
    speechTimeline: {
      version: 'speech-timeline-v1',
      variationToken: 'turn-stream-meta',
      reply: '模型回复里可以原样讨论 opening_policy 这个代码字段。',
      emotion: 'thinking',
      segments: [{
        id: 'segment-stream-meta',
        index: 0,
        startOffset: 0,
        endOffset: 34,
        text: '模型回复里可以原样讨论 opening_policy 这个代码字段。',
        emotion: 'thinking',
        gestureWeight: 0,
        facialWeight: 0,
        prosodyWeight: 0,
        beatWeight: 0,
      }],
    },
    digitalLife: null,
    digitalLifeSpine: {
      runtime: {
        sceneScenario: 'coding',
        projectState: {
          sameHerHoldDetail: 'relationship_cadence=measured_return',
        },
      },
      memory: {
        recallMode: 'working-and-long-term',
        recentEpisodeCount: 2,
        summary: 'current working memory and recalled long-term facts',
      },
    },
    residentPerformance: null,
    runtimeDigest: {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'active-memory',
      activeLoop: {
        version: 'alicization-active-loop-v1',
        phase: 'dialogue',
        dominantChannel: 'active-memory',
        handoffTarget: 'active-dialogue',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        dialogueReady: true,
        controlReady: false,
        memoryCarry: true,
        companionshipReady: true,
        observationHeavy: false,
        initiativeBudget: 0.55,
        coherence: 0.9,
        summary: 'phase=dialogue | dominant=active-memory | handoff=active-dialogue',
      },
      currentConsciousFrame: {
        reasonTags: ['working-memory', 'long-term-recall'],
        focusAnchor: '当前用户问题',
        consciousNeed: '回答当前问题',
        speakingIntention: '基于记忆自然回应',
        continuityArcStage: 'same-thread-continuation',
      },
      projectState: {
        identity: 'fixed project identity',
        sameHerSelfLine: 'same-her fixed life line',
        emotionalClosureCue: 'repair-before-closeness',
      },
      emotionalClosureCue: 'repair-before-closeness',
      continuityRestraint: 'measured-return',
      shouldProactivelySpeak: true,
      shouldProactivelyAct: false,
      continuityPressure: 0.72,
      companionshipPressure: 0.64,
      channels: [{
        id: 'active-memory',
        readiness: 0.86,
        state: 'hot',
        focus: '当前短期记忆与长期召回',
        summary: 'working-memory and long-term recall are available',
      }],
      summary: 'dominant=active-memory | speak=true | act=false',
    },
  } as any
}

describe('main chat stream meta', () => {
  it('removes legacy governance recursively while preserving literal reply and memory facts', () => {
    const payload = buildAlicizationChatMetaPayload(buildMinimalPayloadInput())

    expect(payload.projectState).toBeNull()
    expect(payload.preDialogueAwareness).toBeNull()
    expect(payload.runtimeDigest).not.toHaveProperty('projectState')
    expect(payload.runtimeDigest).not.toHaveProperty('emotionalClosureCue')
    expect(payload.runtimeDigest).not.toHaveProperty('continuityRestraint')
    expect(payload.runtimeDigest?.activeLoop).not.toHaveProperty('continuityArcStage')
    expect(payload.runtimeDigest?.activeLoop).not.toHaveProperty('continuityPreferredTiming')
    expect(payload.runtimeDigest?.currentConsciousFrame).not.toHaveProperty('continuityArcStage')
    expect(payload.digitalLifeSpine?.runtime).not.toHaveProperty('projectState')
    expect(payload.digitalLifeSpine?.memory).toEqual(expect.objectContaining({
      recallMode: 'working-and-long-term',
      recentEpisodeCount: 2,
    }))
    expect(payload.speechTimeline?.reply).toContain('opening_policy')
    expect(payload.speechTimeline?.segments[0]?.text).toContain('opening_policy')
  })

  it('uses embodiment-script digital-life output when it is the available explicit authority', () => {
    const input = buildMinimalPayloadInput()
    input.digitalLife = null
    input.embodimentScript = {
      version: 'embodiment-script-v1',
      turnId: 'turn-stream-meta',
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-stream-meta',
        emotion: 'happy',
        mode: 'speaking',
        frames: [{
          id: 'segment-stream-meta',
          index: 0,
          text: '当前回复',
        }],
      },
    } as any

    const payload = buildAlicizationChatMetaPayload(input)
    const signature = JSON.parse(buildAlicizationChatMetaSignature(payload))

    expect(payload.digitalLife?.mode).toBe('speaking')
    expect(payload.digitalLife?.frames).toHaveLength(1)
    expect(signature.digitalLife.mode).toBe('speaking')
    expect(signature.digitalLife.frames).toHaveLength(1)
  })

  it('changes signatures for real runtime facts but ignores legacy project governance', () => {
    const original = buildMinimalPayloadInput()
    const changedMemory = buildMinimalPayloadInput()
    changedMemory.runtimeDigest.channels[0].readiness = 0.42
    const changedGovernance = buildMinimalPayloadInput()
    changedGovernance.runtimeDigest.projectState.sameHerSelfLine = 'another fixed line'
    changedGovernance.runtimeDigest.projectState.emotionalClosureCue = 'another fixed cue'

    expect(buildAlicizationChatMetaSignature(original))
      .not
      .toBe(buildAlicizationChatMetaSignature(changedMemory))
    expect(buildAlicizationChatMetaSignature(original))
      .toBe(buildAlicizationChatMetaSignature(changedGovernance))
  })

  it('deduplicates unchanged emitted metadata and tracks the latest reply', () => {
    const emit = vi.fn()
    const emitter = createAlicizationChatStreamMetaEmitter({
      cardId: 'card-emitter',
      turnId: 'turn-emitter',
      getGovernance: () => ({
        decisionTraceId: 'trace-emitter',
        turnMode: 'answer',
        truthState: 'grounded',
        personaKernelMode: 'full',
        answerAct: 'answer',
      } as any),
      getRuntimeDigest: () => buildMinimalPayloadInput().runtimeDigest,
      emit,
    })

    emitter.emit('第一句')
    emitter.emit('第一句')
    emitter.emit('第二句')

    expect(emit).toHaveBeenCalledTimes(2)
    expect(emit.mock.calls[0]?.[0]).toEqual(expect.objectContaining({
      cardId: 'card-emitter',
      turnId: 'turn-emitter',
      projectState: null,
      preDialogueAwareness: null,
      runtimeDigest: expect.objectContaining({
        dominantChannel: 'active-memory',
      }),
    }))
    expect(emitter.getLastReply()).toBe('第二句')
    expect(emitter.snapshot()).toEqual({
      lastReply: '第二句',
      lastSignature: expect.any(String),
    })
  })
})
