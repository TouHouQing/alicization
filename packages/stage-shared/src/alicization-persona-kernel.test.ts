import { describe, expect, it } from 'vitest'

import {
  defaultAlicizationProfile,
} from './alicization-defaults'
import {
  resolveAlicizationPersonaKernel,
  summarizeAlicizationTemperament,
} from './alicization-persona-kernel'

describe('alicization-persona-kernel', () => {
  it('normalizes richer persona fields while preserving legacy temperament metrics', () => {
    const snapshot = resolveAlicizationPersonaKernel({
      profile: {
        ownerName: '指挥官',
        hostName: '主人',
        alicizationName: '小艾',
        relationship: '女仆',
        gender: 'female',
      },
      personality: {
        obedience: 0.91,
        liveliness: 0.14,
        sensibility: 0.67,
        identityKernel: {
          temperament: {
            obedience: 0.82,
            liveliness: 0.24,
            sensibility: 0.58,
          },
          relationshipPosture: 'nearby',
          initiativeStyle: 'self-starting',
          valueBias: ['protective continuity'],
        },
        expressionProfile: {
          warmth: 0.77,
          directness: 0.35,
          playfulness: 0.26,
          emotionalVisibility: 0.59,
        },
        initiativeBaseline: {
          silenceReconnect: 'return softly after silence',
          comfortStyle: 'steady reassurance',
          jealousyStyle: 'name the seam and repair it',
        },
        evolutionSeed: {
          fastLayers: ['presence', 'repair'],
          slowLayers: ['continuity'],
          unlockTracks: ['warmth-after-grounding'],
        },
        identityAnchors: ['host-steadiness'],
        antiPersonaConstraints: ['no theatrical warmth'],
      },
      personaWorkshop: {
        presetTemperament: {
          obedience: 0.3,
          liveliness: 0.2,
          sensibility: 0.8,
        },
        relationshipPosture: 'attuned',
        initiativeStyle: 'measured-approach',
        freeDescription: 'Stay gentle, bounded, and clear.',
        antiPersonaConstraints: ['no pushy intimacy'],
        calibration: {
          silenceReconnect: 'light-probe',
          jealousyStyle: 'soft-ache',
          comfortStyle: 'gentle-care',
        },
        previewCorrections: ['shorter openings'],
      },
      customDirectives: '先稳住，再靠近。',
    })

    expect(snapshot.personality.obedience).toBeCloseTo(0.91)
    expect(snapshot.personality.liveliness).toBeCloseTo(0.14)
    expect(snapshot.personality.sensibility).toBeCloseTo(0.67)
    expect(snapshot.personality.identityKernel?.temperament).toEqual({
      obedience: 0.82,
      liveliness: 0.24,
      sensibility: 0.58,
    })
    expect(snapshot.personality.identityKernel?.relationshipPosture).toBe('nearby')
    expect(snapshot.personality.identityKernel?.initiativeStyle).toBe('self-starting')
    expect(snapshot.personality.identityKernel?.valueBias).toEqual(['protective continuity'])
    expect(snapshot.personality.expressionProfile).toEqual({
      warmth: 0.77,
      directness: 0.35,
      playfulness: 0.26,
      emotionalVisibility: 0.59,
    })
    expect(snapshot.personality.initiativeBaseline).toEqual({
      silenceReconnect: 'return softly after silence',
      comfortStyle: 'steady reassurance',
      jealousyStyle: 'name the seam and repair it',
    })
    expect(snapshot.personality.evolutionSeed).toEqual({
      fastLayers: ['presence', 'repair'],
      slowLayers: ['continuity'],
      unlockTracks: ['warmth-after-grounding'],
    })
    expect(snapshot.personality.identityAnchors).toEqual(['host-steadiness'])
    expect(snapshot.personality.antiPersonaConstraints).toEqual(['no theatrical warmth'])
    expect(snapshot.temperamentSummary).toBe('温顺服从、沉静内敛、细腻有感')
    expect(snapshot.hostAttitudeSeed).toContain(defaultAlicizationProfile.hostName)
    expect(snapshot.coreIncarnationSeed).toContain(defaultAlicizationProfile.alicizationName)
    expect(snapshot.coreIncarnation).toContain('先稳住，再靠近。')
    expect(snapshot.personaWorkshop).toEqual({
      presetTemperament: {
        obedience: 0.3,
        liveliness: 0.2,
        sensibility: 0.8,
      },
      relationshipPosture: 'attuned',
      initiativeStyle: 'measured-approach',
      freeDescription: 'Stay gentle, bounded, and clear.',
      antiPersonaConstraints: ['no pushy intimacy'],
      calibration: {
        silenceReconnect: 'light-probe',
        jealousyStyle: 'soft-ache',
        comfortStyle: 'gentle-care',
      },
      previewCorrections: ['shorter openings'],
    })
    expect(summarizeAlicizationTemperament({
      obedience: 0.91,
      liveliness: 0.14,
      sensibility: 0.67,
    })).toBe('温顺服从、沉静内敛、细腻有感')
  })
})
