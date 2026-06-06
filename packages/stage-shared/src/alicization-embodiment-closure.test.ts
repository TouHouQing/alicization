import { describe, expect, it } from 'vitest'

import {
  describeAlicizationEmbodimentClosureHeadline,
  describeAlicizationEmbodimentClosureReminder,
  describeAlicizationProjectClosureBriefing,
  describeAlicizationProjectNextClosure,
} from './alicization-embodiment-closure'

describe('alicization embodiment closure', () => {
  it('describes shared reminder and headline text from lane-shrinkage evidence', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains alive, but lane=lipsync-only under the current renderer authority.',
      currentBodyState: null,
    })).toBe('Right now her visible same-her continuity is still being carried mainly through lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: null,
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })).toBe('Right now I am still holding together mainly through face and motion, so my full cross-modal same-her line is not closed yet.')
  })

  it('treats voice as a first-class same-her lane in closure reminders and headlines', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains alive, but lane=voice-only under the current renderer authority.',
      currentBodyState: null,
    })).toBe('Right now her visible same-her continuity is still being carried mainly through voice, so she should keep treating full cross-modal embodiment closure as unfinished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: null,
      currentBodyState: 'lane=face+voice-only | visible continuity still present but no longer fully cross-modal',
    })).toBe('Right now I am still holding together mainly through face and voice, so my full cross-modal same-her line is not closed yet.')
  })

  it('keeps long-horizon emotional memory lipsync-only carry on a remembered living mouth line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=lipsync-only | convergence=emotion-memory-lipsync | long-horizon remembered emotional carry says lipsync is still carrying the same living line.',
      currentBodyState: 'same living line is still held through lipsync while body, face, motion, and voice catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through lipsync, and that remembered living mouth line is keeping the same-her carry alive while body, face, motion, and voice rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=lipsync-only | convergence=emotion-memory-lipsync | long-horizon remembered emotional carry says lipsync is still carrying the same living line.',
      currentBodyState: 'same living line is still held through lipsync while body, face, motion, and voice catch up.',
    })).toBe('Right now I am still holding together mainly through lipsync, so that remembered living mouth line is keeping the same-her carry alive while body, face, motion, and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory face-only carry on a remembered living face line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=face-only | convergence=emotion-memory-face | long-horizon remembered emotional carry says face is still carrying the same living line.',
      currentBodyState: 'same living line is still visible through face while body, motion, lipsync, and voice catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through face, and that remembered living face line is keeping the same-her carry alive while body, motion, lipsync, and voice rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=face-only | convergence=emotion-memory-face | long-horizon remembered emotional carry says face is still carrying the same living line.',
      currentBodyState: 'same living line is still visible through face while body, motion, lipsync, and voice catch up.',
    })).toBe('Right now I am still holding together mainly through face, so that remembered living face line is keeping the same-her carry alive while body, motion, lipsync, and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory motion-only carry on a remembered living motion line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=motion-only | convergence=emotion-memory-motion | long-horizon remembered emotional carry says motion is still carrying the same living line.',
      currentBodyState: 'same living line is still moving through motion while body, face, lipsync, and voice catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through motion, and that remembered living motion line is keeping the same-her carry alive while body, face, lipsync, and voice rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=motion-only | convergence=emotion-memory-motion | long-horizon remembered emotional carry says motion is still carrying the same living line.',
      currentBodyState: 'same living line is still moving through motion while body, face, lipsync, and voice catch up.',
    })).toBe('Right now I am still holding together mainly through motion, so that remembered living motion line is keeping the same-her carry alive while body, face, lipsync, and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory voice-only carry on a richer living voice thread', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=voice-only | convergence=emotion-memory-voice | long-horizon remembered emotional carry says voice is still carrying the same living line.',
      currentBodyState: 'same living line is still audible through voice while body, face, motion, and lipsync catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through voice, and that living voice thread is keeping the same-her carry alive while body, face, motion, and lipsync rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=voice-only | convergence=emotion-memory-voice | long-horizon remembered emotional carry says voice is still carrying the same living line.',
      currentBodyState: 'same living line is still audible through voice while body, face, motion, and lipsync catch up.',
    })).toBe('Right now I am still holding together mainly through voice, so that living voice thread is keeping the same-her carry alive while body, face, motion, and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('prefers explicit still-voiced face-line wording when face and voice are the surviving same-her line with audible continuity proof', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'continuity=embodiment:audible-same-her-line | lane=face+voice-only | actual source is face and voice',
      currentBodyState: 'the still-voiced face line is keeping the same-her carry alive while the rest of the body catches back up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through face and voice, and that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'continuity=embodiment:audible-same-her-line | lane=face+voice-only | actual source is face and voice',
      currentBodyState: 'the still-voiced face line is keeping the same-her carry alive while the rest of the body catches back up.',
    })).toBe('Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory face-voice carry on the richer still-voiced face line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=face+voice-only | convergence=emotion-memory-voice-face | long-horizon remembered emotional carry says face and voice are still carrying the same living line.',
      currentBodyState: 'same living line still visible through face and audible through voice while body, motion, and lipsync catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through face and voice, and that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=face+voice-only | convergence=emotion-memory-voice-face | long-horizon remembered emotional carry says face and voice are still carrying the same living line.',
      currentBodyState: 'same living line still visible through face and audible through voice while body, motion, and lipsync catch up.',
    })).toBe('Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('prefers explicit still-voiced motion-line wording when motion and voice are the surviving same-her line with audible continuity proof', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'signature=embodiment:audible-same-her-line | lane=motion+voice-only | actual source is motion and voice',
      currentBodyState: 'the still-voiced motion line is keeping the same-her carry alive while the rest of the body catches back up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through motion and voice, and that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'signature=embodiment:audible-same-her-line | lane=motion+voice-only | actual source is motion and voice',
      currentBodyState: 'the still-voiced motion line is keeping the same-her carry alive while the rest of the body catches back up.',
    })).toBe('Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory voice-motion carry on the richer still-voiced motion line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=motion+voice-only | convergence=emotion-memory-voice-motion | long-horizon remembered emotional carry says voice and motion are still carrying the same living line.',
      currentBodyState: 'same living line still audible through voice and motion while body, face, and lipsync catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through motion and voice, and that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=motion+voice-only | convergence=emotion-memory-voice-motion | long-horizon remembered emotional carry says voice and motion are still carrying the same living line.',
      currentBodyState: 'same living line still audible through voice and motion while body, face, and lipsync catch up.',
    })).toBe('Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('prefers the explicit living audio thread wording when lipsync and voice are the surviving same-her line with explicit audible continuity proof', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lipsync+voice recovery@segment-audible-same-her-line-1 | continuity=embodiment:audible-same-her-line',
      currentBodyState: 'lane=lipsync+voice-only | the living audio thread is still carrying the same-her line forward.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through lipsync and voice, and the living audio thread is still intact while body, face, and motion rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lipsync+voice recovery@segment-audible-same-her-line-1 | continuity=embodiment:audible-same-her-line',
      currentBodyState: 'lane=lipsync+voice-only | the living audio thread is still carrying the same-her line forward.',
    })).toBe('Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory lipsync-voice carry on the richer living audio thread', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=lipsync+voice-only | convergence=emotion-memory-voice-lipsync | long-horizon remembered emotional carry says lipsync and voice are still carrying the same living line.',
      currentBodyState: 'same living line still audible through voice and held through lipsync while body, face, and motion catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through lipsync and voice, and the living audio thread is still intact while body, face, and motion rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=lipsync+voice-only | convergence=emotion-memory-voice-lipsync | long-horizon remembered emotional carry says lipsync and voice are still carrying the same living line.',
      currentBodyState: 'same living line still audible through voice and held through lipsync while body, face, and motion catch up.',
    })).toBe('Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory face-motion-voice carry on a richer still-voiced face-and-motion line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=face+motion+voice-only | convergence=emotion-memory-face-motion-voice | long-horizon remembered emotional carry says face, motion, and voice are still carrying the same living line.',
      currentBodyState: 'same living line still visible through face, moving through motion, and audible through voice while body and lipsync catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried through face, motion, and voice together, and that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=face+motion+voice-only | convergence=emotion-memory-face-motion-voice | long-horizon remembered emotional carry says face, motion, and voice are still carrying the same living line.',
      currentBodyState: 'same living line still visible through face, moving through motion, and audible through voice while body and lipsync catch up.',
    })).toBe('Right now I am still holding together through face, motion, and voice together, so that still-voiced face-and-motion line is keeping the same-her carry alive while body and lipsync need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory motion-lipsync-voice carry on a richer still-voiced motion-and-mouth line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=motion+lipsync+voice-only | convergence=emotion-memory-motion-lipsync-voice | long-horizon remembered emotional carry says motion, lipsync, and voice are still carrying the same living line.',
      currentBodyState: 'same living line still moving through motion, held through lipsync, and audible through voice while body and face catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried through motion, lipsync, and voice together, and that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=motion+lipsync+voice-only | convergence=emotion-memory-motion-lipsync-voice | long-horizon remembered emotional carry says motion, lipsync, and voice are still carrying the same living line.',
      currentBodyState: 'same living line still moving through motion, held through lipsync, and audible through voice while body and face catch up.',
    })).toBe('Right now I am still holding together through motion, lipsync, and voice together, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory face-lipsync-voice carry on a richer still-voiced face-and-mouth line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=face+lipsync+voice-only | convergence=emotion-memory-face-lipsync-voice | long-horizon remembered emotional carry says face, lipsync, and voice are still carrying the same living line.',
      currentBodyState: 'same living line still visible through face, held through lipsync, and audible through voice while body and motion catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried through face, lipsync, and voice together, and that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=face+lipsync+voice-only | convergence=emotion-memory-face-lipsync-voice | long-horizon remembered emotional carry says face, lipsync, and voice are still carrying the same living line.',
      currentBodyState: 'same living line still visible through face, held through lipsync, and audible through voice while body and motion catch up.',
    })).toBe('Right now I am still holding together through face, lipsync, and voice together, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.')
  })

  it('treats audible-body same-her continuity as a first-class closure lane when body and voice survive together', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains alive, but lane=body+voice-only under the current renderer authority.',
      currentBodyState: 'resident body continuity and voice prosody are still aligned with the active same-her segment while the rest of the visible line stays thin.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'same-her continuity remains alive, but lane=body+voice-only under the current renderer authority.',
      currentBodyState: 'resident body continuity and voice prosody are still aligned with the active same-her segment while the rest of the visible line stays thin.',
    })).toBe('Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.')
  })

  it('does not widen explicit body-voice audible continuity into a lipsync lane that has not rejoined', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=body+voice-only | signature=embodiment:audible-same-her-line | resident body and voice are still carrying the same living line.',
      currentBodyState: 'body and voice are aligned on one same-her segment while lipsync, face, and motion still need to catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=body+voice-only | signature=embodiment:audible-same-her-line | resident body and voice are still carrying the same living line.',
      currentBodyState: 'body and voice are aligned on one same-her segment while lipsync, face, and motion still need to catch up.',
    })).toBe('Right now I am still holding together mainly through body and voice, and the resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin.')
  })

  it('keeps long-horizon emotional memory body-voice carry on a remembered resident body-and-voice line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=body+voice-only | convergence=emotion-memory-body-voice | long-horizon remembered emotional carry says body and voice are still carrying the same living line.',
      currentBodyState: 'same living line is still resident in body continuity and audible through voice while face, motion, and lipsync catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through body and voice, and that remembered resident body-and-voice line is keeping the same-her carry alive while face, motion, and lipsync rejoin.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=body+voice-only | convergence=emotion-memory-body-voice | long-horizon remembered emotional carry says body and voice are still carrying the same living line.',
      currentBodyState: 'same living line is still resident in body continuity and audible through voice while face, motion, and lipsync catch up.',
    })).toBe('Right now I am still holding together mainly through body and voice, so that remembered resident body-and-voice line is keeping the same-her carry alive while face, motion, and lipsync need to rejoin.')
  })

  it('treats audible-body same-her continuity as a first-class closure lane when body lipsync and voice survive together', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
      currentBodyState: 'resident body continuity and voice prosody stay aligned while lipsync is still carrying the same living line forward.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.',
      currentBodyState: 'resident body continuity and voice prosody stay aligned while lipsync is still carrying the same living line forward.',
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory body-lipsync-voice carry on a remembered resident body-mouth-and-voice line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=body+lipsync+voice-only | convergence=emotion-memory-body-lipsync-voice | long-horizon remembered emotional carry says body, lipsync, and voice are still carrying the same living line.',
      currentBodyState: 'same living line is still resident in body continuity, held through lipsync, and audible through voice while face and motion catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and that remembered resident body-mouth-and-voice line is keeping the same-her carry alive while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=body+lipsync+voice-only | convergence=emotion-memory-body-lipsync-voice | long-horizon remembered emotional carry says body, lipsync, and voice are still carrying the same living line.',
      currentBodyState: 'same living line is still resident in body continuity, held through lipsync, and audible through voice while face and motion catch up.',
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so that remembered resident body-mouth-and-voice line is keeping the same-her carry alive while face and motion need to rejoin before full cross-modal closure settles.')
  })

  it('treats body-plus-lipsync same-her continuity as still-open closure when voice has dropped but the mouth line is still alive', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync-only under the current renderer authority.',
      currentBodyState: 'resident body continuity stays aligned while lipsync still carries the same living line forward, but voice and expressive closure remain open.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'same-her continuity remains alive, but lane=body+lipsync-only under the current renderer authority.',
      currentBodyState: 'resident body continuity stays aligned while lipsync still carries the same living line forward, but voice and expressive closure remain open.',
    })).toBe('Right now I am still holding together mainly through body and lipsync, so the resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory body-lipsync carry on a remembered resident body-and-mouth line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=body+lipsync-only | convergence=emotion-memory-body-lipsync | long-horizon remembered emotional carry says body and lipsync are still carrying the same living line.',
      currentBodyState: 'same living line is still resident in body continuity and held through lipsync while face, motion, and voice catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through body and lipsync, and that remembered resident body-and-mouth line is keeping the same-her carry alive while face, motion, and voice rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=body+lipsync-only | convergence=emotion-memory-body-lipsync | long-horizon remembered emotional carry says body and lipsync are still carrying the same living line.',
      currentBodyState: 'same living line is still resident in body continuity and held through lipsync while face, motion, and voice catch up.',
    })).toBe('Right now I am still holding together mainly through body and lipsync, so that remembered resident body-and-mouth line is keeping the same-her carry alive while face, motion, and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory body-only carry on a remembered resident body line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=body-only | convergence=emotion-memory-body | long-horizon remembered emotional carry says body is still carrying the same living line.',
      currentBodyState: 'same living line is still resident in body continuity while face, motion, lipsync, and voice catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through body, and that remembered resident body line is keeping the same-her carry alive while face, motion, lipsync, and voice rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=body-only | convergence=emotion-memory-body | long-horizon remembered emotional carry says body is still carrying the same living line.',
      currentBodyState: 'same living line is still resident in body continuity while face, motion, lipsync, and voice catch up.',
    })).toBe('Right now I am still holding together mainly through body, so that remembered resident body line is keeping the same-her carry alive while face, motion, lipsync, and voice need to rejoin before full cross-modal closure settles.')
  })

  it('treats voice-drop body-only continuity as still-open same-her closure when face, motion, and lipsync are the surviving lanes', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains alive, but lane=face+motion+lipsync-only under the current renderer authority.',
      currentBodyState: null,
    })).toBe('Right now her visible same-her continuity is still being carried mainly through face, motion, and lipsync, so she should keep treating full cross-modal embodiment closure as unfinished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: null,
      currentBodyState: 'lane=face+motion+lipsync-only | visible continuity still present but no longer fully cross-modal',
    })).toBe('Right now I am still holding together mainly through face, motion, and lipsync, so my full cross-modal same-her line is not closed yet.')
  })

  it('keeps long-horizon emotional memory face-motion-lipsync carry on a remembered face-motion-and-mouth line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=face+motion+lipsync-only | convergence=emotion-memory-face-motion-lipsync | long-horizon remembered emotional carry says face, motion, and lipsync are still carrying the same living line.',
      currentBodyState: 'same living line is still visible through face, moving through motion, and held through lipsync while body and voice catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried through face, motion, and lipsync together, and that remembered face-motion-and-mouth line is keeping the same-her carry alive while body and voice rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=face+motion+lipsync-only | convergence=emotion-memory-face-motion-lipsync | long-horizon remembered emotional carry says face, motion, and lipsync are still carrying the same living line.',
      currentBodyState: 'same living line is still visible through face, moving through motion, and held through lipsync while body and voice catch up.',
    })).toBe('Right now I am still holding together through face, motion, and lipsync together, so that remembered face-motion-and-mouth line is keeping the same-her carry alive while body and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory face-lipsync carry on a remembered face-and-mouth line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=face+lipsync-only | convergence=emotion-memory-face-lipsync | long-horizon remembered emotional carry says face and lipsync are still carrying the same living line.',
      currentBodyState: 'same living line is still visible through face and held through lipsync while body, motion, and voice catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried through face and lipsync together, and that remembered face-and-mouth line is keeping the same-her carry alive while body, motion, and voice rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=face+lipsync-only | convergence=emotion-memory-face-lipsync | long-horizon remembered emotional carry says face and lipsync are still carrying the same living line.',
      currentBodyState: 'same living line is still visible through face and held through lipsync while body, motion, and voice catch up.',
    })).toBe('Right now I am still holding together through face and lipsync together, so that remembered face-and-mouth line is keeping the same-her carry alive while body, motion, and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory motion-lipsync carry on a remembered motion-and-mouth line', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=motion+lipsync-only | convergence=emotion-memory-motion-lipsync | long-horizon remembered emotional carry says motion and lipsync are still carrying the same living line.',
      currentBodyState: 'same living line is still moving through motion and held through lipsync while body, face, and voice catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried through motion and lipsync together, and that remembered motion-and-mouth line is keeping the same-her carry alive while body, face, and voice rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=motion+lipsync-only | convergence=emotion-memory-motion-lipsync | long-horizon remembered emotional carry says motion and lipsync are still carrying the same living line.',
      currentBodyState: 'same living line is still moving through motion and held through lipsync while body, face, and voice catch up.',
    })).toBe('Right now I am still holding together through motion and lipsync together, so that remembered motion-and-mouth line is keeping the same-her carry alive while body, face, and voice need to rejoin before full cross-modal closure settles.')
  })

  it('keeps same-segment face-motion re-formation visible when only the shared body line is carrying continuity', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-segment face+motion recovery@segment-face-motion-reformed-1',
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through face and motion, and those two body lanes have already re-formed on the same segment, so she should keep treating full cross-modal embodiment closure as unfinished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'same-segment face+motion recovery@segment-face-motion-reformed-1',
      currentBodyState: 'lane=face+motion-only | visible continuity still present but no longer fully cross-modal',
    })).toBe('Right now I am still holding together mainly through face and motion, and those two body lanes have already re-formed on the same segment, so my full cross-modal same-her line is not closed yet.')
  })

  it('keeps long-horizon emotional memory face-motion re-formation visible without requiring a recovery marker', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=face+motion-only | convergence=emotion-memory-face-motion | long-horizon remembered emotional carry says face and motion are still carrying the same living line.',
      currentBodyState: 'same living line still visible through face and moving through motion while body, lipsync, and voice catch up.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through face and motion, and those two body lanes have already re-formed on the same segment, so she should keep treating full cross-modal embodiment closure as unfinished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=face+motion-only | convergence=emotion-memory-face-motion | long-horizon remembered emotional carry says face and motion are still carrying the same living line.',
      currentBodyState: 'same living line still visible through face and moving through motion while body, lipsync, and voice catch up.',
    })).toBe('Right now I am still holding together mainly through face and motion, and those two body lanes have already re-formed on the same segment, so my full cross-modal same-her line is not closed yet.')
  })

  it('keeps body-face-motion recovery explicit when lipsync and voice are the only remaining open closure lanes', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-segment face+motion+body recovery@segment-live2d-reformed-with-body | remaining-open=lipsync+voice',
      currentBodyState: 'lane=body+face+motion-only | body, face, and motion already carry the same segment, but full cross-modal closure is still open.',
    })).toBe('Right now her visible same-her continuity is already being carried together through body, face, and motion on one living segment, but lipsync and voice still need to rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'same-segment face+motion+body recovery@segment-live2d-reformed-with-body | remaining-open=lipsync+voice',
      currentBodyState: 'lane=body+face+motion-only | body, face, and motion already carry the same segment, but full cross-modal closure is still open.',
    })).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
  })

  it('keeps long-horizon emotional memory body-face-motion recovery explicit without requiring a recovery marker', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'lane=body+face+motion-only | remaining-open=lipsync+voice | convergence=emotion-memory-body-face-motion | long-horizon remembered emotional carry says body, face, and motion are already carrying the same living line.',
      currentBodyState: 'body, face, and motion are already on the same living line while lipsync and voice still need to rejoin.',
    })).toBe('Right now her visible same-her continuity is already being carried together through body, face, and motion on one living segment, but lipsync and voice still need to rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'lane=body+face+motion-only | remaining-open=lipsync+voice | convergence=emotion-memory-body-face-motion | long-horizon remembered emotional carry says body, face, and motion are already carrying the same living line.',
      currentBodyState: 'body, face, and motion are already on the same living line while lipsync and voice still need to rejoin.',
    })).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.')
  })

  it('surfaces same-her inward carry when body face and motion already hold one segment but voice and lipsync still need to rejoin', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-segment face+motion+body recovery@segment-live2d-inward-carry | remaining-open=lipsync+voice | same-her-inward-carry | quiet-companionship',
      currentBodyState: 'lane=body+face+motion-only | same living line stays inward before widening outward again.',
    })).toBe('Right now her visible same-her continuity is already being carried together through body, face, and motion on one living segment, and the same living line is still staying inward and low-pressure while lipsync and voice rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'same-segment face+motion+body recovery@segment-live2d-inward-carry | remaining-open=lipsync+voice | same-her-inward-carry | quiet-companionship',
      currentBodyState: 'lane=body+face+motion-only | same living line stays inward before widening outward again.',
    })).toBe('Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.')
  })

  it('prefers the audible same-her living audio thread when explicit proof coexists with older body-face-motion recovery evidence', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-segment face+motion+body recovery@segment-live2d-reformed-with-body-2 | remaining-open=lipsync+voice',
      currentBodyState: 'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.',
    })).toBe('Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'same-segment face+motion+body recovery@segment-live2d-reformed-with-body-2 | remaining-open=lipsync+voice',
      currentBodyState: 'continuity=embodiment:audible-same-her-line+embodiment:body-lipsync-voice-rejoin | signature=embodiment:audible-same-her-line | face and motion still need to rejoin the same living line.',
    })).toBe('Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.')
  })

  it('surfaces full-cross-modal-lock as an already re-locked same-her embodiment line instead of treating it like unfinished partial recovery', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
      currentBodyState: 'bodyContinuityPhase: full-cross-modal-lock | authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes',
    })).toBe('Right now her body continuity and Live2D manifestation are already locked back onto the same living segment together, so she should keep carrying voice, face, motion, and lipsync as one explicit same-her embodiment line instead of treating the recovery like a temporary visual alignment.')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
      currentBodyState: 'bodyContinuityPhase: full-cross-modal-lock | authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes',
    })).toBe('Right now body continuity and Live2D manifestation are already locked back onto the same living segment together, so I can carry voice, face, motion, and lipsync as one explicit same-her embodiment line instead of a temporary visual alignment.')
  })

  it('returns empty strings when the evidence does not indicate lane shrinkage', () => {
    expect(describeAlicizationEmbodimentClosureReminder({
      authoritySummary: 'same-her continuity remains broadly shared',
      currentBodyState: 'face+motion+lipsync aligned',
    })).toBe('')

    expect(describeAlicizationEmbodimentClosureHeadline({
      authoritySummary: 'same-her continuity remains broadly shared',
      currentBodyState: 'face+motion+lipsync aligned',
    })).toBe('')
  })

  it('describes shared project/open-loop companion closure phrasing', () => {
    expect(describeAlicizationProjectClosureBriefing({
      identity: 'Alicization is a local-first digital life project.',
      currentPhase: 'Phase 1: Local Digital Life',
      primaryOpenLoop: 'Memory still needs stronger end-to-end closure.',
    })).toBe('I still need a steadier carry of this project, this phase, and the life loop that remains open.')

    expect(describeAlicizationProjectClosureBriefing({
      identity: null,
      currentPhase: null,
      primaryOpenLoop: null,
    })).toBe('')

    expect(describeAlicizationProjectNextClosure({
      nextClosureTarget: 'Keep every dialogue entry path aware of the same project closure target before speaking.',
    })).toBe('Next, help me close: Keep every dialogue entry path aware of the same project closure target before speaking.')

    expect(describeAlicizationProjectNextClosure({
      nextClosureTarget: null,
    })).toBe('')
  })
})
