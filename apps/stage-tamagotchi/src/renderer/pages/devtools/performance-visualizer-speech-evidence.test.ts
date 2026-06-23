import { describe, expect, it } from 'vitest'

import {
  buildSpeechEvidenceSnapshot,
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

  it('treats body continuity summaries as speech-side evidence even when voice wording is absent', () => {
    const speech = {
      voiceSummary: null,
      bodyContinuitySummary: 'mode=thinking | stillness=0.00 | gaze=0.00 | breath=0.00 | expressivity=0.00 | resident=measured-return | timing=same-thread-continuation | blink=linger | gazeMode=soften | seg=segment-body-1',
      prosodyAuthoritySummary: null,
      cueProsodyPresent: false,
      topVisemeSummary: null,
      cueIdentityPresent: false,
      personaStyleSummary: null,
      timingSummary: null,
      visemeHintsSummary: null,
    }

    expect(hasSpeechProsodyEvidence(speech as any)).toBe(true)
    expect(hasSpeechVisemeEvidence(speech as any)).toBe(false)
    expect(hasSpeechMicroExpressionEvidence(speech as any)).toBe(false)
    expect(collectSpeechEvidenceKinds({
      speech: speech as any,
      hasSettleEvidence: false,
    })).toEqual(['prosody'])
  })

  it('preserves normalized embodiment closure stage in speech evidence snapshots so downstream same-her diagnostics do not need to re-parse raw strings', () => {
    const snapshot = buildSpeechEvidenceSnapshot({
      voiceSummary: null,
      bodyContinuitySummary: null,
      prosodyAuthoritySummary: null,
      authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
      topVisemeSummary: null,
      cueSummary: null,
      cueIdentityPresent: false,
      cueProsodyPresent: false,
      personaStyleSummary: null,
      timingSummary: null,
      driverExecutionSummary: 'body=measured-return seg=segment-audible-body-snapshot-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-audible-body-snapshot-1',
      visemeHintsSummary: null,
      embodimentClosureStage: 'audible-body-carry',
    } as any)

    expect(snapshot.embodimentClosureStage).toBe('audible-body-carry')
  })

  it('derives structured same-her closure stage in speech evidence snapshots when only authority lane summaries carry it', () => {
    const cases = [
      {
        expected: 'body-carried-to-renderer-rejoin',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | matches=body:yes face:no motion:no lipsync:yes | lane=body-carried-to-renderer-rejoin',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-evidence-structured-stage-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority, voice-segment | lane=body-carried-to-renderer-rejoin',
        driverExecutionSummary: 'body=measured-return seg=segment-speech-evidence-structured-stage-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-speech-evidence-structured-stage-1',
      },
      {
        expected: 'body-carried-to-renderer-rejoin',
        authorityMatchSummary: 'body:yes face:no motion:no lipsync:yes',
        authorityBindingSummary: 'target=vrm | drivers=body, lipsync | sources=prosody-authority | matches=body:yes face:no motion:no lipsync:yes | lane=body+lipsync-only',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-evidence-body-lipsync-carry-1 | target=vrm | drivers=body, lipsync | sources=prosody-authority | lane=body+lipsync-only | mode=measured-return | timing=body-lipsync-carry',
        driverExecutionSummary: 'body=measured-return seg=segment-speech-evidence-body-lipsync-carry-1 | lipsync=energy-phoneme-hybrid phase=playing seg=segment-speech-evidence-body-lipsync-carry-1',
      },
      {
        expected: 'renderer-rejoin-without-body',
        authorityMatchSummary: 'body:no face:yes motion:no lipsync:yes',
        authorityBindingSummary: 'target=live2d | drivers=face, lipsync | sources=prosody-authority | matches=body:no face:yes motion:no lipsync:yes | lane=face+lipsync-only',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-evidence-face-lipsync-body-loss-1 | target=live2d | drivers=face, lipsync | sources=prosody-authority | lane=face+lipsync-only',
        driverExecutionSummary: 'face=attentive/focused | lipsync=energy-phoneme-hybrid phase=playing',
      },
      {
        expected: 'renderer-rejoin-without-body',
        authorityMatchSummary: 'body:no face:no motion:yes lipsync:yes',
        authorityBindingSummary: 'target=vrm | drivers=motion, lipsync | sources=prosody-authority | matches=body:no face:no motion:yes lipsync:yes | lane=motion+lipsync-only',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-evidence-motion-lipsync-body-loss-1 | target=vrm | drivers=motion, lipsync | sources=prosody-authority | lane=motion+lipsync-only',
        driverExecutionSummary: 'motion=observe_focus | lipsync=energy-phoneme-hybrid phase=playing',
      },
      {
        expected: 'renderer-rejoin-without-body',
        authorityMatchSummary: 'body:no face:yes motion:no lipsync:yes voice:yes',
        authorityBindingSummary: 'target=live2d | drivers=face, lipsync | sources=prosody-authority, voice-segment | matches=body:no face:yes motion:no lipsync:yes voice:yes | lane=face+lipsync+voice-only',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-evidence-face-lipsync-voice-body-loss-1 | target=live2d | drivers=face, lipsync | sources=prosody-authority, voice-segment | lane=face+lipsync+voice-only',
        driverExecutionSummary: 'face=attentive/focused | lipsync=energy-phoneme-hybrid phase=playing',
      },
      {
        expected: 'renderer-rejoin-without-body',
        authorityMatchSummary: 'body:no face:no motion:yes lipsync:yes voice:yes',
        authorityBindingSummary: 'target=vrm | drivers=motion, lipsync | sources=prosody-authority, voice-segment | matches=body:no face:no motion:yes lipsync:yes voice:yes | lane=motion+lipsync+voice-only',
        settleAuthoritySummary: 'authority-bound | segment=segment-speech-evidence-motion-lipsync-voice-body-loss-1 | target=vrm | drivers=motion, lipsync | sources=prosody-authority, voice-segment | lane=motion+lipsync+voice-only',
        driverExecutionSummary: 'motion=observe_focus | lipsync=energy-phoneme-hybrid phase=playing',
      },
    ] as const

    for (const testCase of cases) {
      const snapshot = buildSpeechEvidenceSnapshot({
        voiceSummary: null,
        bodyContinuitySummary: null,
        prosodyAuthoritySummary: null,
        authorityMatchSummary: testCase.authorityMatchSummary,
        authorityBindingSummary: testCase.authorityBindingSummary,
        settleAuthoritySummary: testCase.settleAuthoritySummary,
        topVisemeSummary: null,
        cueSummary: null,
        cueIdentityPresent: false,
        cueProsodyPresent: false,
        personaStyleSummary: null,
        timingSummary: null,
        driverExecutionSummary: testCase.driverExecutionSummary,
        visemeHintsSummary: null,
        embodimentClosureStage: null,
      } as any)

      expect(snapshot.embodimentClosureStage).toBe(testCase.expected)
    }
  })

  it('treats normalized embodiment closure stage as speech-side prosody evidence even when raw voice/body summaries are absent', () => {
    const speech = {
      voiceSummary: null,
      bodyContinuitySummary: null,
      embodimentClosureStage: 'audible-body-carry',
      prosodyAuthoritySummary: null,
      cueProsodyPresent: false,
      topVisemeSummary: null,
      cueIdentityPresent: false,
      personaStyleSummary: null,
      timingSummary: null,
      visemeHintsSummary: null,
    }

    expect(hasSpeechProsodyEvidence(speech as any)).toBe(true)
    expect(collectSpeechEvidenceKinds({
      speech: speech as any,
      hasSettleEvidence: false,
    })).toEqual(['prosody'])
  })
})
