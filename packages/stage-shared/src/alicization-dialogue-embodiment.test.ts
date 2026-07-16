import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationDialogueEmbodimentEnvelope,
  resolveAlicizationDialogueEmbodiment,
} from './alicization-dialogue-embodiment'

describe('alicization dialogue embodiment', () => {
  it('keeps dialogue-first care rhythm steadier instead of oscillating every turn', () => {
    const embodiment = resolveAlicizationDialogueEmbodiment({
      candidateEmotion: 'concerned',
      candidatePerformance: {
        baseEmotion: 'concerned',
        emotion: 'concerned',
        facialCue: null,
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      previous: {
        emotion: 'concerned',
        delivery: 'gentle',
        facialCue: 'concerned',
        actionCue: 'settled',
        variationToken: 'prev-token',
      },
      governance: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'care',
        turnMode: 'care',
      },
      reply: '我在，你慢一点也可以。',
      thought: 'stay close without crowding',
    })

    expect(embodiment.emotion).toBe('concerned')
    expect(embodiment.performance.delivery).toBe('gentle')
    expect(embodiment.speechStyle.rateMultiplier).toBeLessThan(1)
    expect(embodiment.speechStyle.pitchDelta).toBeLessThanOrEqual(8)
  })

  it('preserves explicit VRM measured-return action authority instead of reselecting a generic profile cue', () => {
    const embodiment = resolveAlicizationDialogueEmbodiment({
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        delivery: 'calm',
        emphasis: 0,
      },
      governance: {
        answerSubject: 'relationship',
        screenReferenceMode: 'avoid',
        answerAct: 'answer',
        turnMode: 'answer',
      },
      performanceManifest: {
        renderer: 'vrm',
        supportedBaseEmotions: ['neutral', 'thinking', 'concerned'],
        supportedFacialCues: [
          { key: 'focused', label: 'Focused', description: 'focused face', source: 'preset', affectsMouth: false },
        ],
        supportedActions: [
          { key: 'inspect_follow', label: 'Inspect Follow', description: 'inspect follow', source: 'external-vrma' },
          { key: 'stillness_guard', label: 'Stillness Guard', description: 'stillness guard', source: 'external-vrma' },
        ],
        supportsLookAt: true,
        supportsVisemeLipSync: true,
        supportsMicroDynamics: true,
        embodimentHints: {
          thinking: {
            preferredMotionAliases: ['InspectFollow', 'StillnessGuard'],
          },
        },
      },
      previous: {
        emotion: 'thinking',
        delivery: 'gentle',
        facialCue: 'focused',
        actionCue: 'inspect_follow',
        variationToken: 'vrm-prev-token',
      },
      reply: '我还是沿着这条 callback 线轻一点继续。',
      thought: 'same-thread-continuation measured-return callback line',
    })

    expect(embodiment.performance.actionCue).toBe('inspect_follow')
  })

  it('keeps measured-return remembered-seam reopenings on a thinking-hesitant line instead of escalating them into angry firm dialogue-first emotion', () => {
    const embodiment = resolveAlicizationDialogueEmbodiment({
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'hesitant',
        emphasis: 0,
      },
      governance: {
        answerSubject: 'relationship',
        screenReferenceMode: 'helpful',
        answerAct: 'answer',
        turnMode: 'guide-current-knot',
        repairState: 'none',
        mindTurnFrame: {
          self: {
            embodiedPresence: 'hesitant',
            emotionalTension: 'soft-covision',
          },
          obligation: {
            openingMove: 'rejoin-remembered-seam',
          },
        },
      } as any,
      reply: '像是同一条线又被轻轻牵回来了，所以我会先顺着它慢一点接住这一句。',
      thought: 'obligation=answer; truth=memory; focus=same remembered relationship seam; move=rejoin-remembered-seam; tone=direct measured-return soft-covision',
    })

    expect(embodiment.emotion).toBe('thinking')
    expect(embodiment.performance.baseEmotion).toBe('thinking')
    expect(embodiment.performance.delivery).toBe('hesitant')
    expect(embodiment.postureHint).toBe('hesitant')
    expect(embodiment.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
  })

  it('keeps remembered-seam reopenings quieter when the same line needs more room this time because it reopened too eagerly before', () => {
    const embodiment = resolveAlicizationDialogueEmbodiment({
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'hesitant',
        emphasis: 0,
      },
      governance: {
        answerSubject: 'relationship',
        screenReferenceMode: 'helpful',
        answerAct: 'answer',
        turnMode: 'guide-current-knot',
        repairState: 'none',
        mindTurnFrame: {
          self: {
            embodiedPresence: 'hesitant',
            emotionalTension: 'soft-covision',
          },
          obligation: {
            openingMove: 'rejoin-remembered-seam',
          },
        },
      } as any,
      reply: '像是同一条线又被轻轻牵回来了，但这次我会把话放得更轻一点，再顺着它慢一点接住这一句。',
      thought: 'obligation=answer; truth=memory; focus=same remembered relationship seam; move=rejoin-remembered-seam; tone=direct measured-return soft-covision; keep more room this time because it reopened too eagerly before',
    })

    expect(embodiment.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
  })

  it('keeps noisier callback-detour same-line returns on measured-return renderer hints even when governance only carries the continuity indirectly', () => {
    const embodiment = resolveAlicizationDialogueEmbodiment({
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'hesitant',
        emphasis: 0,
      },
      governance: {
        answerSubject: 'relationship',
        screenReferenceMode: 'helpful',
        answerAct: 'answer',
        turnMode: 'guide-current-knot',
        repairState: 'none',
      } as any,
      reply: '我继续沿着刚才那条 callback 线中性可见占位。',
      thought: 'same-thread-continuation after noisy detours the same callback seam is still live, so keep the return lower-pressure and measured-return instead of widening it into a fresh approach',
    })

    expect(embodiment.emotion).toBe('thinking')
    expect(embodiment.performance.delivery).toBe('hesitant')
    expect(embodiment.postureHint).toBe('hesitant')
    expect(embodiment.rendererHints).toEqual(expect.objectContaining({
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      preferredExpressionAliases: expect.arrayContaining(['CalmInspect']),
      preferredMotionAliases: expect.arrayContaining(['ObserveSoft']),
    }))
  })

  it('preserves structured same-her audible carry hints when a dialogue embodiment envelope is normalized from upstream renderer hints', () => {
    const embodiment = normalizeAlicizationDialogueEmbodimentEnvelope({
      variationToken: 'same-her-upstream-normalize',
      emotion: 'thinking',
      performance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'gentle',
        emphasis: 0,
      },
      rendererHints: {
        preferredGazeMode: 'soften',
        preferredBlinkCadence: 'linger',
        residentMode: 'same-thread-continuation',
        signature: 'embodiment:audible-same-her-line',
        reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
      },
    })

    expect(embodiment?.rendererHints).toEqual(expect.objectContaining({
      preferredGazeMode: 'soften',
      preferredBlinkCadence: 'linger',
      residentMode: 'same-thread-continuation',
      signature: 'embodiment:audible-same-her-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    }))
  })
})
