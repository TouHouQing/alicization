import type { AlicizationInteractionIntent } from '@proj-alicization/stage-shared'

import { normalizeAlicizationInteractionIntent } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { attachObservedAttention } from './observed-attention'

describe('attention follows actual tool observations', () => {
  it('carries a bounded observed point and rejects unavailable or invalid geometry', () => {
    const intent: AlicizationInteractionIntent = { version: 'interaction-intent-v1', cardId: 'alice', turnId: 't', purpose: 'guide', attention: 'host', focus: '', reason: 'work', sourceRefs: ['current-turn'], confidence: 0.8, createdAt: 1, expiresAt: 1000 }
    const observed = attachObservedAttention(intent, { ok: true, windowBounds: { left: -800, top: 50, width: 400, height: 200 } }, 'action:observation', 1000)
    expect(observed?.target).toMatchObject({ screenX: -600, screenY: 150, observationId: 'action:observation' })
    expect(normalizeAlicizationInteractionIntent(observed)?.target).toEqual(observed?.target)
    expect(attachObservedAttention(intent, { ok: false, windowBounds: { left: 1, top: 1, width: 1, height: 1 } }, 'bad', 1000)).toBe(intent)
    expect(attachObservedAttention(intent, { ok: true, windowBounds: { left: 1, top: 1, width: Number.NaN, height: 1 } }, 'bad', 1000)).toBe(intent)
    expect(normalizeAlicizationInteractionIntent({ ...observed, createdAt: 32000, expiresAt: 40000 })).toBeNull()
  })
})
