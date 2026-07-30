import type { ResolveAlicizationDialogueEmbodimentInput } from './alicization-dialogue-embodiment'

import { describe, expect, it } from 'vitest'

import {
  normalizeAlicizationDialogueEmbodimentEnvelope,
  resolveAlicizationDialogueEmbodiment,
} from './alicization-dialogue-embodiment'

describe('alicization dialogue embodiment', () => {
  it('keeps dialogue governance from overriding provider emotion and performance inputs', () => {
    const input: ResolveAlicizationDialogueEmbodimentInput = {
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
    }
    const governed = resolveAlicizationDialogueEmbodiment(input)
    const ungoverned = resolveAlicizationDialogueEmbodiment({
      ...input,
      governance: null,
    })

    expect(governed).toEqual(ungoverned)
    expect(governed.emotion).toBe('neutral')
    expect(governed.performance.delivery).toBe('calm')
  })

  it('preserves an explicit supported VRM action from structured continuity state', () => {
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
      reply: '我会继续看这一处。',
      thought: 'audit note only',
    })

    expect(embodiment.performance.actionCue).toBe('inspect_follow')
  })

  it('ignores internal thought prose when resolving the full embodiment envelope', () => {
    const input: Omit<ResolveAlicizationDialogueEmbodimentInput, 'thought'> = {
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
        answerSubject: 'screen',
        screenReferenceMode: 'helpful',
        answerAct: 'answer',
        turnMode: 'answer',
        repairState: 'none',
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
        delivery: 'calm',
        facialCue: 'focused',
        actionCue: 'stillness_guard',
        variationToken: 'thought-audit-previous',
      },
      reply: '我会继续看这一处。',
      turnId: 'thought-audit-turn',
    }

    const cleanEnvelope = resolveAlicizationDialogueEmbodiment({
      ...input,
      thought: '',
    })
    const pollutedEnvelope = resolveAlicizationDialogueEmbodiment({
      ...input,
      thought: 'same-thread-continuation measured-return repair-before-closeness remembered seam lower-pressure more room this time concerned-but-restrained stay gentle tone=direct clarify ask question reground care',
    })

    expect(pollutedEnvelope).toEqual(cleanEnvelope)
  })

  it('ignores legacy mind-turn continuity cues when resolving embodiment behavior', () => {
    const input: ResolveAlicizationDialogueEmbodimentInput = {
      candidateEmotion: 'thinking',
      candidatePerformance: {
        baseEmotion: 'thinking',
        emotion: 'thinking',
        facialCue: null,
        actionCue: null,
        delivery: 'calm',
        emphasis: 0,
      },
      reply: '我会继续看这一处。',
      thought: '',
      turnId: 'legacy-mind-turn-cue-isolation',
    }
    const cleanEmbodiment = resolveAlicizationDialogueEmbodiment(input)
    const poisonedEmbodiment = resolveAlicizationDialogueEmbodiment({
      ...input,
      governance: {
        mindTurnFrame: {
          obligation: {
            openingMove: 'rejoin-remembered-seam',
          },
          self: {
            embodiedPresence: 'hesitant',
            emotionalTension: 'soft-covision',
          },
        },
      },
    })

    expect(poisonedEmbodiment).toEqual(cleanEmbodiment)
  })

  it('preserves renderer audit payload during envelope normalization', () => {
    const embodiment = normalizeAlicizationDialogueEmbodimentEnvelope({
      variationToken: 'renderer-audit-normalize',
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
        signature: 'audit-signature',
        reasonTags: ['audit-reason'],
      },
    })

    expect(embodiment?.rendererHints).toEqual(expect.objectContaining({
      signature: 'audit-signature',
      reasonTags: ['audit-reason'],
    }))
  })
})
