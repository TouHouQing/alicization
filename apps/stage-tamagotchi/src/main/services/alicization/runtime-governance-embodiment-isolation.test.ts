import { describe, expect, it } from 'vitest'

import { buildAlicizationChatStreamEmbodimentMeta } from './runtime-governance'

function buildBaseInput() {
  return {
    governance: {
      decisionTraceId: 'trace-embodiment-isolation',
      turnMode: 'answer',
      truthState: 'dialogue-grounded',
      visibleReplyAuthority: 'llm-mind',
      groundedThisTurn: true,
      personaKernelMode: 'full',
      openingStyle: 'direct-answer',
      relationshipPosture: 'warm',
      repairState: 'none',
      suppressAssociativeRecall: false,
      labelCarryAsMemory: true,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: 4,
      mustDo: [],
      mustNotDo: [],
    },
    explicitPerformance: {
      baseEmotion: 'happy',
      emotion: 'happy',
      facialCue: 'smile',
      actionCue: 'wave',
      delivery: 'energetic',
      emphasis: 1,
    },
    reply: '这是模型根据当前记忆自然生成的回复。',
    thought: '',
    turnId: 'turn-measured-return-concerned',
  } as any
}

function withLegacyGovernance(input: ReturnType<typeof buildBaseInput>) {
  return {
    ...input,
    currentConsciousFrame: {
      reasonTags: [
        'same-her-causality-repair-pressure',
        'runtimeSameHerEmbodimentCausality',
        'memory-deliberation-cadence:repair-before-closeness',
      ],
      projectState: {
        sameHerSelfLine: 'same-her fixed life line',
        sameHerHoldDetail: 'relationship_cadence=measured_return',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
      },
    },
    residentPerformance: {
      performance: {
        baseEmotion: 'happy',
        emotion: 'happy',
        facialCue: 'smile',
        actionCue: 'wave',
        delivery: 'energetic',
        emphasis: 1,
      },
      reasonTags: ['measured-return'],
    },
    digitalLifeSpine: {
      version: 'digital-life-spine-digest-v1',
      runtime: {
        sceneScenario: 'coding',
        continuityArcStage: 'same-thread-continuation',
        continuityPreferredTiming: 'next-open-window',
        continuityRestraint: 'repair-before-closeness',
        projectState: {
          sameHerSelfLine: 'same-her fixed life line',
          sameHerHoldDetail: 'opening_policy=project_progress_recap',
          continuityCue: 'repair-before-closeness',
        },
      },
      proactive: {
        selectedAction: 'wait',
        preferredStyle: 'silent-observe',
        confidence: 0.8,
        shouldSpeak: false,
        continuityRestraint: 'measured-return',
      },
    },
  } as any
}

function readVisibleEmbodimentProjection(
  value: ReturnType<typeof buildAlicizationChatStreamEmbodimentMeta>,
) {
  const digitalLife = value.digitalLife
    ? {
        ...value.digitalLife,
        spine: null,
      }
    : null
  return {
    embodiment: value.embodiment,
    embodimentScript: value.embodimentScript,
    speechTimeline: value.speechTimeline,
    digitalLife,
  }
}

describe('runtime governance embodiment isolation', () => {
  it('does not let legacy project governance alter explicit model performance', () => {
    const clean = buildAlicizationChatStreamEmbodimentMeta(buildBaseInput())
    const legacy = buildAlicizationChatStreamEmbodimentMeta(
      withLegacyGovernance(buildBaseInput()),
    )

    expect(clean.embodiment).not.toBeNull()
    expect(clean.speechTimeline).not.toBeNull()
    expect(readVisibleEmbodimentProjection(legacy))
      .toEqual(readVisibleEmbodimentProjection(clean))
    expect(JSON.stringify(legacy.digitalLifeSpine ?? {})).not.toMatch(
      /projectState|sameHer|measured-return|repair-before-closeness|continuityArcStage|continuityPreferredTiming/iu,
    )
  })
})
