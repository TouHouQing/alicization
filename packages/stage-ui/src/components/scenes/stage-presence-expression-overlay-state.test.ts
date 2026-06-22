import type { AlicizationVisualPresenceStateSnapshot } from '../../stores/alicization-bridge'
import type { StageCharacterFrame } from '../../utils'

import { describe, expect, it } from 'vitest'

import { resolveStagePresenceExpressionOverlayState } from './stage-presence-expression-overlay-state'

const characterFrame: StageCharacterFrame = {
  left: 300,
  right: 420,
  top: 220,
  bottom: 480,
  centerX: 360,
  anchorY: 252,
}

const expression: NonNullable<AlicizationVisualPresenceStateSnapshot['presenceExpression']> = {
  version: 'presence-expression-v1',
  id: 'presence-expression:test',
  text: '嗯，先让这里慢下来一点。',
  trigger: 'presence-only-hold',
  display: {
    mode: 'near-body-whisper',
    allowAutoShow: true,
    createdAt: 10_000,
    expiresAt: 16_000,
    intensity: 'soft',
  },
  grounding: {
    sourceRefs: ['privateThought'],
    reasonTags: ['quiet-companionship'],
    stateFingerprint: 'fingerprint',
    confidence: 0.82,
  },
  audit: {
    generated: true,
    qualityFlags: [],
  },
}

describe('stage presence expression overlay state', () => {
  it('shows valid runtime-authored near-body expressions near the character frame', () => {
    const state = resolveStagePresenceExpressionOverlayState({
      now: 12_000,
      expression,
      characterFrame,
      hostSize: { width: 800, height: 600 },
      dialogueVisible: false,
      loading: false,
      streaming: false,
    })

    expect(state.visible).toBe(true)
    expect(state.text).toBe(expression.text)
    expect(state.intensity).toBe('soft')
    expect(state.style.left).toBe('370px')
    expect(state.style.top).toBe('251px')
  })

  it('suppresses expired expressions and dialogue overlap', () => {
    expect(resolveStagePresenceExpressionOverlayState({
      now: 20_000,
      expression,
      characterFrame,
      hostSize: { width: 800, height: 600 },
      dialogueVisible: false,
      loading: false,
      streaming: false,
    }).visible).toBe(false)

    expect(resolveStagePresenceExpressionOverlayState({
      now: 12_000,
      expression,
      characterFrame,
      hostSize: { width: 800, height: 600 },
      dialogueVisible: true,
      loading: false,
      streaming: false,
    }).visible).toBe(false)
  })

  it('suppresses loading, streaming, missing frame, and non-auto-show expressions', () => {
    expect(resolveStagePresenceExpressionOverlayState({
      now: 12_000,
      expression,
      characterFrame,
      hostSize: { width: 800, height: 600 },
      dialogueVisible: false,
      loading: true,
      streaming: false,
    }).visible).toBe(false)

    expect(resolveStagePresenceExpressionOverlayState({
      now: 12_000,
      expression,
      characterFrame,
      hostSize: { width: 800, height: 600 },
      dialogueVisible: false,
      loading: false,
      streaming: true,
    }).visible).toBe(false)

    expect(resolveStagePresenceExpressionOverlayState({
      now: 12_000,
      expression,
      characterFrame: null,
      hostSize: { width: 800, height: 600 },
      dialogueVisible: false,
      loading: false,
      streaming: false,
    }).visible).toBe(false)

    expect(resolveStagePresenceExpressionOverlayState({
      now: 12_000,
      expression: {
        ...expression,
        display: {
          ...expression.display,
          allowAutoShow: false,
        },
      },
      characterFrame,
      hostSize: { width: 800, height: 600 },
      dialogueVisible: false,
      loading: false,
      streaming: false,
    }).visible).toBe(false)
  })

  it('keeps renderer from inventing text when runtime expression is absent', () => {
    const state = resolveStagePresenceExpressionOverlayState({
      now: 12_000,
      expression: null,
      characterFrame,
      hostSize: { width: 800, height: 600 },
      dialogueVisible: false,
      loading: false,
      streaming: false,
    })

    expect(state.visible).toBe(false)
    expect(state.text).toBe('')
  })
})
