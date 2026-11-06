import type { AlicizationDialoguePerformancePayload } from '../../stores/alicization-bridge'

import { describe, expect, it } from 'vitest'

import { applyStagePersonalityExpression } from './stage-personality-expression'

describe('personality expression on the shared Live2D performance path', () => {
  const happy: AlicizationDialoguePerformancePayload = { baseEmotion: 'happy', emotion: 'happy', actionCue: 'nod', facialCue: 'smile', delivery: 'calm', emphasis: 2 }
  it('applies restraint idempotently without creating motions or changing emotional meaning', () => {
    const style = { version: 'one', expression: -0.1, warmth: 0.1 }
    const result = applyStagePersonalityExpression(happy, style)
    expect(result).toEqual({ ...happy, emphasis: 1, delivery: 'gentle' })
    expect(applyStagePersonalityExpression(result, style)).toEqual(result)
  })
  it('preserves negative affect and ignores invalid state', () => {
    const sad = { ...happy, baseEmotion: 'sad' as const, emotion: 'sad' as const }
    expect(applyStagePersonalityExpression(sad, { version: 'one', expression: 0.1, warmth: 0.1 })).toEqual(sad)
    expect(applyStagePersonalityExpression(happy, { version: 'one', expression: Number.NaN, warmth: 1 })).toBe(happy)
    expect(applyStagePersonalityExpression(happy)).toBe(happy)
  })
})
