import { describe, expect, it } from 'vitest'

import {
  hasAlicizationAudibleSameHerCarry,
  hasAlicizationQuieterSameHerCarry,
  hasAlicizationSoftenedSameHerCarry,
  hasAlicizationStillVoicedMouthSameHerCarry,
  hasAlicizationStillVoicedSameHerCarry,
  normalizeAlicizationRendererHintToken,
  normalizeAlicizationRendererHintTokens,
} from './alicization-same-her-renderer-hints'

describe('alicization same-her renderer hints', () => {
  it('normalizes hyphenated renderer hint tokens into the shared underscore form', () => {
    expect(normalizeAlicizationRendererHintToken(' embodiment:audible-continuity-line ')).toBe(
      'embodiment:audible_continuity_line',
    )
    expect(normalizeAlicizationRendererHintToken(' embodiment:audible-same-her-line ')).toBe(
      'embodiment:audible_same_her_line',
    )
    expect(normalizeAlicizationRendererHintToken(' embodiment:body-lipsync-voice-rejoin ')).toBe(
      'embodiment:body_lipsync_voice_rejoin',
    )
  })

  it('deduplicates normalized renderer hint tokens', () => {
    expect(normalizeAlicizationRendererHintTokens([
      'embodiment:body+voice-only',
      'embodiment:body+voice_only',
      ' embodiment:body+voice-only ',
    ])).toEqual([
      'embodiment:body+voice_only',
    ])
  })

  it('keeps coordinator-style body+voice-only continuity on a softer same-her carry instead of overstating it as an audible-body carry', () => {
    expect(hasAlicizationAudibleSameHerCarry({
      signature: 'embodiment:audible_continuity_line',
      reasonTags: ['embodiment:body+voice-only'],
    })).toBe(false)

    expect(hasAlicizationSoftenedSameHerCarry({
      signature: 'embodiment:audible_continuity_line',
      reasonTags: ['embodiment:body+voice-only'],
    })).toBe(true)
  })

  it('keeps resident freeform body+voice-only signatures on the softer same-her carry instead of widening them into audible-body carry', () => {
    expect(hasAlicizationAudibleSameHerCarry({
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      reasonTags: ['companionship'],
    })).toBe(false)

    expect(hasAlicizationSoftenedSameHerCarry({
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body+voice-only',
      reasonTags: ['companionship'],
    })).toBe(true)
  })

  it('treats body-lipsync-voice-rejoin continuity as an audible same-her carry across signature and reason-tag variants', () => {
    expect(hasAlicizationAudibleSameHerCarry({
      signature: 'embodiment:audible-continuity-line',
      reasonTags: ['embodiment:body-lipsync-voice-rejoin'],
    })).toBe(true)

    expect(hasAlicizationAudibleSameHerCarry({
      signature: 'resident|main-runtime|embodiment:audible_same_her_line|body_lipsync_voice_rejoin',
      reasonTags: ['companionship'],
    })).toBe(true)
  })

  it('treats body+lipsync-only and lipsync+voice-only continuity as quieter same-her carry', () => {
    expect(hasAlicizationQuieterSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['embodiment:body+lipsync-only'],
    })).toBe(true)

    expect(hasAlicizationQuieterSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['embodiment:lipsync+voice-only'],
    })).toBe(true)
  })

  it('treats face+lipsync-only and motion+lipsync-only continuity as quieter same-her carry', () => {
    expect(hasAlicizationQuieterSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['lane=face+lipsync-only'],
    })).toBe(true)

    expect(hasAlicizationQuieterSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['lane=motion+lipsync-only'],
    })).toBe(true)
  })

  it('treats still-voiced face and motion continuity as still-voiced same-her carry', () => {
    expect(hasAlicizationStillVoicedSameHerCarry({
      signature: 'embodiment:still-voiced-face-line',
      reasonTags: ['companionship'],
    })).toBe(true)

    expect(hasAlicizationStillVoicedSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['embodiment:still-voiced-motion-line'],
    })).toBe(true)

    expect(hasAlicizationStillVoicedSameHerCarry({
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      reasonTags: ['companionship'],
    })).toBe(true)
  })

  it('treats richer still-voiced face-and-mouth and motion-and-mouth continuity as still-voiced same-her carry', () => {
    expect(hasAlicizationStillVoicedSameHerCarry({
      signature: 'lane=face+lipsync+voice-only',
      reasonTags: ['companionship'],
    })).toBe(true)

    expect(hasAlicizationStillVoicedSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['embodiment:still-voiced-motion-lipsync-line'],
    })).toBe(true)
  })

  it('distinguishes richer still-voiced mouth lanes from plainer still-voiced face and motion lines', () => {
    expect(hasAlicizationStillVoicedMouthSameHerCarry({
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-face-lipsync-line|lane=face+lipsync+voice-only',
      reasonTags: ['companionship'],
    })).toBe(true)

    expect(hasAlicizationStillVoicedMouthSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['embodiment:still-voiced-motion-lipsync-line'],
    })).toBe(true)

    expect(hasAlicizationStillVoicedMouthSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['embodiment:still-voiced-face-line'],
    })).toBe(false)

    expect(hasAlicizationStillVoicedMouthSameHerCarry({
      signature: 'resident|main-runtime|accompanying|quiet-accompaniment|still-voiced-motion-line',
      reasonTags: ['companionship'],
    })).toBe(false)
  })

  it('treats richer still-voiced face-and-motion continuity as still-voiced same-her carry', () => {
    expect(hasAlicizationStillVoicedSameHerCarry({
      signature: 'lane=face+motion+voice-only',
      reasonTags: ['companionship'],
    })).toBe(true)

    expect(hasAlicizationStillVoicedSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['embodiment:still-voiced-face-motion-line'],
    })).toBe(true)
  })

  it('treats audible, quieter, and still-voiced continuity as softened same-her carry', () => {
    expect(hasAlicizationSoftenedSameHerCarry({
      signature: 'embodiment:audible_continuity_line',
      reasonTags: ['companionship'],
    })).toBe(true)

    expect(hasAlicizationSoftenedSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['embodiment:body+lipsync-only'],
    })).toBe(true)

    expect(hasAlicizationSoftenedSameHerCarry({
      signature: 'resident|main-runtime|same-thread',
      reasonTags: ['embodiment:still-voiced-face-line'],
    })).toBe(true)
  })

  it('does not overstate unrelated continuity cues into audible same-her carry', () => {
    expect(hasAlicizationAudibleSameHerCarry({
      signature: 'resident|ordinary-thinking',
      reasonTags: ['companionship', 'timing:lower-pressure-opening'],
    })).toBe(false)

    expect(hasAlicizationQuieterSameHerCarry({
      signature: 'resident|ordinary-thinking',
      reasonTags: ['companionship', 'timing:lower-pressure-opening'],
    })).toBe(false)

    expect(hasAlicizationStillVoicedSameHerCarry({
      signature: 'resident|ordinary-thinking',
      reasonTags: ['companionship', 'timing:lower-pressure-opening'],
    })).toBe(false)

    expect(hasAlicizationSoftenedSameHerCarry({
      signature: 'resident|ordinary-thinking',
      reasonTags: ['companionship', 'timing:lower-pressure-opening'],
    })).toBe(false)
  })
})
