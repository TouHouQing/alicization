import { describe, expect, it } from 'vitest'

import {
  collectSpeechEvidenceKinds,
  hasSpeechMicroExpressionEvidence,
  hasSpeechProsodyEvidence,
  hasSpeechVisemeEvidence,
} from './performance-visualizer-speech-evidence'

describe('performance visualizer speech evidence', () => {
  it('classifies prosody, viseme, micro-expression, and settle evidence from a shared speech row shape', () => {
    const speech = {
      voiceSummary: 'zh-CN | closure=0.84 | precision=0.90',
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
      cueProsodyPresent: true,
      topVisemeSummary: 'A:0.66, closed:0.41, E:0.24',
      cueIdentityPresent: true,
      personaStyleSummary: 'observe-first | prosody=-0.07 beat=-0.06 mouth=-0.04 head=+0.08',
      timingSummary: 'facial=320 action=240 emotion=360 | segment-start | soft-interrupt | hold',
      visemeHintsSummary: 'I:0.35@0.94 | closed:0.75@0.89',
    }

    expect(hasSpeechProsodyEvidence(speech)).toBe(true)
    expect(hasSpeechVisemeEvidence(speech)).toBe(true)
    expect(hasSpeechMicroExpressionEvidence(speech)).toBe(true)
    expect(collectSpeechEvidenceKinds({
      speech,
      hasSettleEvidence: true,
    })).toEqual(['prosody', 'viseme', 'micro-expression', 'settle'])
  })

  it('keeps pure prosody rows out of micro-expression evidence', () => {
    const speech = {
      voiceSummary: null,
      prosodyAuthoritySummary: 'mode=energy-phoneme-hybrid | prosody=0.35 | mouth=0.35 | head=0.32 | visemePeak=0.75 | provenance=authority-bound | source=prosody-authority | segment=segment-zh-1',
      cueProsodyPresent: true,
      topVisemeSummary: null,
      cueIdentityPresent: false,
      personaStyleSummary: null,
      timingSummary: null,
      visemeHintsSummary: null,
    }

    expect(hasSpeechProsodyEvidence(speech)).toBe(true)
    expect(hasSpeechVisemeEvidence(speech)).toBe(false)
    expect(hasSpeechMicroExpressionEvidence(speech)).toBe(false)
    expect(collectSpeechEvidenceKinds({
      speech,
      hasSettleEvidence: false,
    })).toEqual(['prosody'])
  })
})
