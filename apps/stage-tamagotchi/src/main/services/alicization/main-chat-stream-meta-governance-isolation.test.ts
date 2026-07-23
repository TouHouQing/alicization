import { describe, expect, it } from 'vitest'

import {
  buildAlicizationChatMetaPayload,
  buildAlicizationChatMetaSignature,
} from './main-chat-stream-meta'

function buildBaseInput() {
  return {
    cardId: 'card-governance-isolation',
    turnId: 'turn-governance-isolation',
    governance: null,
    visibleReplyExecution: {
      mode: 'provider-stream',
      expectedVisibleReplyAuthority: 'provider-mind',
      actualVisibleReplyAuthority: 'provider-mind',
      providerMindExecuted: true,
      reason: null,
    },
    embodiment: {
      emotion: 'happy',
      variationToken: 'turn-governance-isolation',
      postureHint: 'open',
      speechStyle: {
        pitchDelta: 2,
        rateMultiplier: 1.05,
      },
      performance: {
        baseEmotion: 'happy',
        emotion: 'happy',
        facialCue: 'smile',
        actionCue: 'wave',
        delivery: 'lively',
        emphasis: 0.4,
      },
      rendererHints: {
        residentMode: 'dialogue',
        preferredBlinkCadence: 'normal',
        preferredGazeMode: 'steady',
      },
    },
    embodimentScript: null,
    speechTimeline: {
      version: 'speech-timeline-v1',
      variationToken: 'turn-governance-isolation',
      reply: '这是模型根据当前记忆生成的回复。',
      emotion: 'happy',
      segments: [{
        id: 'segment-governance-isolation',
        index: 0,
        startOffset: 0,
        endOffset: 15,
        text: '这是模型根据当前记忆生成的回复。',
        emotion: 'happy',
        gestureWeight: 0.4,
        facialWeight: 0.5,
        prosodyWeight: 0.6,
        beatWeight: 0.3,
        rendererHints: {
          residentMode: 'dialogue',
          preferredBlinkCadence: 'normal',
          preferredGazeMode: 'steady',
        },
      }],
    },
    digitalLife: null,
    digitalLifeSpine: {
      architecture: {
        operatingMode: 'speaking',
        dominantSystem: 'dialogue',
        supportingSystems: ['memory'],
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
        dialogueReady: true,
        controlReady: false,
        memoryCarry: true,
        companionshipReady: true,
        observationHeavy: false,
        initiativeBudget: 0.58,
        coherence: 0.91,
        summary: 'phase=dialogue | dominant=active-memory | handoff=active-dialogue',
      },
      currentConsciousFrame: {
        reasonTags: ['working-memory', 'long-term-recall'],
        focusAnchor: '用户正在确认记忆召回结果',
        consciousNeed: '回答当前问题',
        speakingIntention: '基于记忆自然回应',
      },
      shouldProactivelySpeak: true,
      shouldProactivelyAct: false,
      continuityPressure: 0.72,
      companionshipPressure: 0.68,
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

function withLegacyGovernance(input: ReturnType<typeof buildBaseInput>) {
  return {
    ...input,
    digitalLifeSpine: {
      architecture: {
        operatingMode: 'speaking',
        dominantSystem: 'dialogue',
        supportingSystems: ['memory'],
        governingFocus: 'Return to the same seam before branching.',
        summary: 'Focus: Return to the same seam before branching.',
      },
      runtime: {
        projectState: {
          sameHerSelfLine: 'same-her fixed life line',
          sameHerHoldDetail: 'relationship_cadence=measured_return',
          continuityArcStage: 'same-thread-continuation',
        },
      },
    },
    runtimeDigest: {
      ...input.runtimeDigest,
      emotionalClosureCue: 'repair-before-closeness',
      continuityRestraint: 'measured-return',
      activeLoop: {
        ...input.runtimeDigest.activeLoop,
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      },
      currentConsciousFrame: {
        ...input.runtimeDigest.currentConsciousFrame,
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
      },
      projectState: {
        identity: 'fixed project identity',
        currentPhase: 'Phase 1',
        sameHerSelfLine: 'same-her fixed life line',
        sameHerHoldDetail: 'opening_policy=project_progress_recap',
        emotionalClosureCue: 'repair-before-closeness',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'measured-return',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
      },
    },
  } as any
}

describe('main chat stream meta governance isolation', () => {
  it('does not let legacy project governance alter explicit model and embodiment output', () => {
    const cleanPayload = buildAlicizationChatMetaPayload(buildBaseInput())
    const legacyPayload = buildAlicizationChatMetaPayload(withLegacyGovernance(buildBaseInput()))

    expect(legacyPayload.projectState).toBeNull()
    expect(legacyPayload.preDialogueAwareness).toBeNull()
    expect(legacyPayload.runtimeDigest).not.toHaveProperty('projectState')
    expect(legacyPayload.runtimeDigest).not.toHaveProperty('emotionalClosureCue')
    expect(legacyPayload.runtimeDigest).not.toHaveProperty('continuityRestraint')
    expect(legacyPayload.runtimeDigest?.activeLoop).not.toHaveProperty('continuityArcStage')
    expect(legacyPayload.runtimeDigest?.activeLoop).not.toHaveProperty('continuityPreferredTiming')
    expect(legacyPayload.runtimeDigest?.currentConsciousFrame).not.toHaveProperty('continuityArcStage')
    expect(legacyPayload.runtimeDigest?.currentConsciousFrame).not.toHaveProperty('continuityPreferredTiming')
    expect(legacyPayload.runtimeDigest?.currentConsciousFrame).not.toHaveProperty('continuityCadence')
    expect(legacyPayload.digitalLifeSpine?.architecture).toEqual({
      operatingMode: 'speaking',
      dominantSystem: 'dialogue',
      supportingSystems: ['memory'],
    })
    expect(JSON.stringify(legacyPayload.digitalLifeSpine)).not.toContain('Return to the same seam before branching.')

    expect(legacyPayload.embodiment).toEqual(cleanPayload.embodiment)
    expect(legacyPayload.speechTimeline).toEqual(cleanPayload.speechTimeline)
    expect(buildAlicizationChatMetaSignature(legacyPayload))
      .toBe(buildAlicizationChatMetaSignature(cleanPayload))
  })
})
