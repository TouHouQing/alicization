import { describe, expect, it } from 'vitest'

import {
  normalizeResidentFacialCue,
  resolveResidentLive2DPreferredExpressionAliases,
  resolveResidentLive2DPreferredExpressionAliasesFromRuntimeState,
  resolveResidentVrmPreferredExpressionAliases,
  resolveResidentVrmPreferredExpressionAliasesFromRuntimeState,
} from './stage-resident-expression-aliases'

const quietPosture = {
  engaged: true,
  mode: 'attentive' as const,
  confidence: 0.9,
  bodyYaw: 0,
  bodyPitch: 0.2,
  breathBoost: 0.1,
  gazeStability: 0.92,
}

const untrustedVisualPresenceState = {
  currentBodyState: 'accompanying',
  continuityMode: 'quiet-accompaniment',
  quietLineMs: 240_000,
  residentPerformance: {
    performance: {
      delivery: 'gentle',
      actionCue: 'untrusted-action-name',
    },
    reasonTags: ['measured-return'],
    signature: 'audit:untrusted',
    stance: 'accompany',
  },
  privateThought: {
    rationaleTags: ['measured-return'],
    shouldSpeak: false,
  },
} as any

describe('stage resident expression aliases', () => {
  it('keeps live2d aliases limited to explicit configuration and emotion fallback', () => {
    expect(resolveResidentLive2DPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus'],
      presencePosture: quietPosture,
      visualPresenceState: untrustedVisualPresenceState,
    } as any)).toEqual([
      'ConfiguredFocus',
      'thinking',
    ])
  })

  it('keeps vrm aliases limited to explicit configuration and emotion fallback', () => {
    expect(resolveResidentVrmPreferredExpressionAliases({
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus'],
      presencePosture: quietPosture,
      visualPresenceState: untrustedVisualPresenceState,
    } as any)).toEqual([
      'ConfiguredFocus',
      'thinking',
    ])
  })

  it('preserves segment, turn, configured, and emotion alias precedence', () => {
    const sharedInput = {
      emotion: 'thinking',
      configuredAliases: ['ConfiguredFocus'],
      runtimeSegmentExpressionAliasesByEmotion: {
        thinking: ['SegmentFocus'],
      },
      runtimeTurnExpressionAliasesByEmotion: {
        thinking: ['TurnFocus'],
      },
      presencePosture: quietPosture,
      visualPresenceState: untrustedVisualPresenceState,
    }

    expect(resolveResidentLive2DPreferredExpressionAliasesFromRuntimeState(sharedInput)).toEqual([
      'SegmentFocus',
      'TurnFocus',
      'ConfiguredFocus',
      'thinking',
    ])
    expect(resolveResidentVrmPreferredExpressionAliasesFromRuntimeState(sharedInput)).toEqual([
      'SegmentFocus',
      'TurnFocus',
      'ConfiguredFocus',
      'thinking',
    ])
  })

  it('does not rewrite an explicit resident facial cue from visual audit state', () => {
    expect(normalizeResidentFacialCue('focus')).toBe('focus')
  })

  it('normalizes an empty resident facial cue to null', () => {
    expect(normalizeResidentFacialCue('  ')).toBeNull()
  })
})
