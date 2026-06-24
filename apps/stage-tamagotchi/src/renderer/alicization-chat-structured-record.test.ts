import { describe, expect, it } from 'vitest'

import { normalizeChatStructuredRecord, resolveVisibleReasoning } from './alicization-chat-structured-record'

describe('alicization chat structured record', () => {
  it('normalizes malformed formats without turning them into fallback-v1', () => {
    expect(normalizeChatStructuredRecord({
      thought: ' inner ',
      emotion: 'thinking',
      reply: '',
      format: 'unknown-format',
    }, 'visible reply')).toEqual(expect.objectContaining({
      thought: 'inner',
      emotion: 'thinking',
      reply: 'visible reply',
      format: 'mind-turn-v1',
      malformedFormat: 'unknown-format',
    }))
  })

  it('preserves legacy format lineage for renderer diagnostics', () => {
    expect(normalizeChatStructuredRecord({
      thought: 'legacy thought',
      emotion: 'neutral',
      reply: 'legacy reply',
      format: 'epoch1-v1',
    }, 'fallback')).toEqual(expect.objectContaining({
      format: 'epoch1-v1',
      legacyFormat: 'epoch1-v1',
      malformedFormat: undefined,
    }))
  })

  it('keeps subconscious reasoning hidden from visible chat categorization', () => {
    const structured = normalizeChatStructuredRecord({
      thought: 'internal proactive reasoning',
      emotion: 'neutral',
      reply: 'care line',
      format: 'subconscious-proactive-llm-v1',
    }, 'fallback')

    expect(resolveVisibleReasoning(structured, 'user-turn')).toBe('')
    expect(resolveVisibleReasoning(structured, 'subconscious-proactive')).toBe('')
  })

  it('normalizes persisted digitalLife motor into canonical nested body authority for renderer replay', () => {
    const structured = normalizeChatStructuredRecord({
      thought: 'repair the same body line',
      emotion: 'thinking',
      reply: '我先轻一点把这条线接回去。',
      format: 'mind-turn-v1',
      digitalLife: {
        version: 'digital-life-v1',
        variationToken: 'turn-renderer-digital-life-normalization',
        mode: 'thinking',
        emotion: 'thinking',
        postureHint: 'attentive',
        performance: {
          baseEmotion: 'thinking',
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          actionCue: 'observe_focus',
          delivery: 'gentle',
          emphasis: 0,
        },
        speechStyle: {
          pitchDelta: -1,
          rateMultiplier: 0.97,
        },
        voice: {
          pitchDelta: -1,
          rateMultiplier: 0.97,
          energy: 0.42,
          cadence: 0.36,
        },
        lipSync: {
          mode: 'energy-phoneme-hybrid',
          visemeBias: 0.44,
          energyBias: 0.58,
          mouthScale: 0.94,
          continuityHoldMs: 320,
        },
        face: {
          emotion: 'thinking',
          facialCue: 'soft-gaze',
          expressionMode: 'hold',
          intensity: 0.34,
          holdMs: 280,
        },
        action: {
          actionCue: 'observe_focus',
          actionMode: 'hold',
          intensity: 0.18,
          holdMs: 220,
        },
        motor: {
          stillness: 0.74,
          gazeStability: 0.62,
          breathAmplitude: 0.21,
          expressivity: 0.16,
        },
        frames: [{
          id: 'segment-renderer-digital-life-normalization',
          index: 0,
          startOffset: 0,
          endOffset: 11,
          text: '我先轻一点把这条线接回去。',
          mode: 'recovering',
          interruptPolicy: 'soft-settle',
          settleMode: 'hold',
          voice: {
            pitchDelta: -1,
            rateMultiplier: 0.97,
            energy: 0.42,
            cadence: 0.36,
          },
          lipSync: {
            mode: 'energy-phoneme-hybrid',
            visemeBias: 0.44,
            energyBias: 0.58,
            mouthScale: 0.94,
            continuityHoldMs: 320,
          },
          face: {
            emotion: 'thinking',
            facialCue: 'soft-gaze',
            expressionMode: 'hold',
            intensity: 0.34,
            holdMs: 280,
          },
          action: {
            actionCue: 'observe_focus',
            actionMode: 'hold',
            intensity: 0.18,
            holdMs: 220,
          },
          motor: {
            stillness: 0.74,
            gazeStability: 0.62,
            breathAmplitude: 0.21,
            expressivity: 0.16,
          },
        }],
      },
    }, 'fallback')

    expect(structured.digitalLife).toEqual(expect.objectContaining({
      motor: expect.objectContaining({
        stillness: 0.74,
        expressivity: 0.16,
        gaze: expect.objectContaining({
          stability: expect.any(Number),
        }),
        breath: expect.objectContaining({
          amplitude: expect.any(Number),
        }),
      }),
      frames: [
        expect.objectContaining({
          id: 'segment-renderer-digital-life-normalization',
          motor: expect.objectContaining({
            stillness: 0.74,
            expressivity: 0.16,
            gaze: expect.objectContaining({
              stability: expect.any(Number),
            }),
            breath: expect.objectContaining({
              amplitude: expect.any(Number),
            }),
          }),
        }),
      ],
    }))
    expect((structured.digitalLife?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((structured.digitalLife?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
    expect((structured.digitalLife?.frames?.[0]?.motor as { gazeStability?: unknown } | undefined)?.gazeStability).toBeUndefined()
    expect((structured.digitalLife?.frames?.[0]?.motor as { breathAmplitude?: unknown } | undefined)?.breathAmplitude).toBeUndefined()
  })
})
