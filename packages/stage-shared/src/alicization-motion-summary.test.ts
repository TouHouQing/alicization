import { describe, expect, it } from 'vitest'

import { buildAlicizationMotionSummary } from './alicization-motion-summary'

describe('alicization motion summary', () => {
  it('builds a structured motion summary with stable field order', () => {
    expect(buildAlicizationMotionSummary({
      actionCue: 'inspect_follow',
      attentionMode: 'attentive',
      idleBase: 'idle_settle',
      intensity: 0.44,
      holdMs: 220,
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'Deliver the result on the same living thread, but leave room before widening closeness',
      source: 'timeline-projection',
      confidence: 0.88,
      segmentId: 'segment-vrm-1',
    })).toBe(
      'motion=inspect_follow | mode=attentive | tail=measured-return | blink=linger | gaze=soften | reason=Deliver the result on the same living thread, but leave room before widening closeness | idle=idle_settle | intensity=0.44 | hold=220ms | src=timeline-projection | conf=0.88 | seg=segment-vrm-1',
    )
  })

  it('omits empty fragments when only an action cue is available', () => {
    expect(buildAlicizationMotionSummary({
      actionCue: 'steady_focus',
    })).toBe('motion=steady_focus')
  })

  it('does not coerce null numeric fields into fake zeros', () => {
    expect(buildAlicizationMotionSummary({
      actionCue: 'steady_focus',
      intensity: null,
      holdMs: null,
      confidence: null,
      segmentId: null,
    })).toBe('motion=steady_focus')
  })

  it('can carry a structured continuity reason without projecting a fixed template', () => {
    expect(buildAlicizationMotionSummary({
      actionCue: 'observe_focus',
      residentMode: 'measured-return',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'Keep the continuity state inward for now, and leave room before widening outward again',
    })).toBe(
      'motion=observe_focus | tail=measured-return | blink=linger | gaze=soften | reason=Keep the continuity state inward for now, and leave room before widening outward again',
    )
  })

  it('can carry an audible timing marker without projecting a fixed rejoin template', () => {
    expect(buildAlicizationMotionSummary({
      actionCue: 'observe_focus',
      attentionMode: 'ambient-covision',
      residentMode: 'measured-return',
      continuityTiming: 'audible-body-carry',
      preferredBlinkCadence: 'linger',
      preferredGazeMode: 'soften',
      reasonSummary: 'Keep the continuity state audible while face and motion rejoin',
      holdMs: 300,
      source: 'timeline-projection',
      confidence: 0.88,
      segmentId: 'segment-audible-body-motion-1',
    })).toBe(
      'motion=observe_focus | mode=ambient-covision | tail=measured-return | timing=audible-body-carry | blink=linger | gaze=soften | reason=Keep the continuity state audible while face and motion rejoin | hold=300ms | src=timeline-projection | conf=0.88 | seg=segment-audible-body-motion-1',
    )
  })

  it('normalizes vrm settle_idle into the canonical idle_settle summary used by live2d', () => {
    expect(buildAlicizationMotionSummary({
      actionCue: 'settle_idle',
      idleBase: 'settle_idle',
      residentMode: 'quiet-companionship',
      preferredBlinkCadence: 'quiet',
      preferredGazeMode: 'soften',
      reasonSummary: 'Stay nearby without reopening too fast while the settle loop calms.',
      segmentId: 'segment-vrm-settle-loop-1',
    })).toBe(
      'motion=idle_settle | tail=quiet-companionship | blink=quiet | gaze=soften | reason=Stay nearby without reopening too fast while the settle loop calms. | idle=idle_settle | seg=segment-vrm-settle-loop-1',
    )
  })
})
