import { describe, expect, it } from 'vitest'

import {
  defaultAlicizationProfile,
} from './alicization-defaults'
import {
  buildAlicizationCoreIncarnationSeed,
  buildAlicizationHostAttitudeSeed,
  resolveAlicizationPersonaKernel,
  summarizeAlicizationTemperament,
} from './alicization-persona-kernel'

describe('alicization-persona-kernel', () => {
  it('keeps default persona seeds companion-neutral instead of master/maid roleplay', () => {
    const snapshot = resolveAlicizationPersonaKernel({})

    expect(defaultAlicizationProfile.hostName).not.toBe('主人')
    expect(defaultAlicizationProfile.relationship).not.toBe('女仆')
    expect(snapshot.profile.hostName).not.toBe('主人')
    expect(snapshot.profile.relationship).not.toBe('女仆')
    expect(snapshot.hostAttitudeSeed).not.toContain('主人')
    expect(snapshot.hostAttitudeSeed).not.toContain('女仆')
    expect(snapshot.coreIncarnationSeed).not.toContain('主人')
    expect(snapshot.coreIncarnationSeed).not.toContain('女仆')
  })

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
          relationshipPosture: 'companion',
          initiativeStyle: 'direct-approach',
          valueBias: ['protective continuity'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'measured',
          playfulness: 'medium',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'light-probe',
          comfortStyle: 'gentle-care',
          jealousyStyle: 'soft-ache',
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
        relationshipPosture: 'guardian',
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
    expect(snapshot.personality.identityKernel?.relationshipPosture).toBe('companion')
    expect(snapshot.personality.identityKernel?.initiativeStyle).toBe('direct-approach')
    expect(snapshot.personality.identityKernel?.valueBias).toEqual(['protective continuity'])
    expect(snapshot.personality.expressionProfile).toEqual({
      warmth: 'warm',
      directness: 'measured',
      playfulness: 'medium',
      emotionalVisibility: 'steady',
    })
    expect(snapshot.personality.initiativeBaseline).toEqual({
      silenceReconnect: 'light-probe',
      comfortStyle: 'gentle-care',
      jealousyStyle: 'soft-ache',
    })
    expect(snapshot.personality.evolutionSeed).toEqual({
      fastLayers: ['presence', 'repair'],
      slowLayers: ['continuity'],
      unlockTracks: ['warmth-after-grounding'],
    })
    expect(snapshot.personality.identityAnchors).toEqual(['host-steadiness'])
    expect(snapshot.personality.antiPersonaConstraints).toEqual(['no theatrical warmth'])
    expect(snapshot.temperamentSummary).toBe('obedience 0.91, liveliness 0.14, sensibility 0.67')
    expect(snapshot.hostAttitudeSeed).toContain(defaultAlicizationProfile.hostName)
    expect(snapshot.coreIncarnationSeed).toContain(defaultAlicizationProfile.alicizationName)
    expect(snapshot.coreIncarnationSeed).not.toContain('先稳住，再靠近。')
    expect(snapshot.coreIncarnation).not.toContain('先稳住，再靠近。')
    expect(snapshot.personaWorkshop).toEqual({
      presetTemperament: {
        obedience: 0.3,
        liveliness: 0.2,
        sensibility: 0.8,
      },
      relationshipPosture: 'guardian',
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
    })).toBe('obedience 0.91, liveliness 0.14, sensibility 0.67')
  })

  it('builds the host attitude seed from structured persona facts only', () => {
    const seed = buildAlicizationHostAttitudeSeed({
      profile: {
        ownerName: '桐人',
        hostName: '桐人',
        alicizationName: '爱丽丝',
        gender: 'female',
        genderCustom: '',
        relationship: '伴侣',
        mindAge: 19,
      },
      personality: {
        obedience: 0.21,
        liveliness: 0.73,
        sensibility: 0.88,
        identityAnchors: ['守护共同经历'],
        antiPersonaConstraints: ['不迎合'],
      },
      customDirectives: '保留自己的判断。',
    })

    expect(JSON.parse(seed)).toMatchObject({
      profile: {
        ownerName: '桐人',
        hostName: '桐人',
        alicizationName: '爱丽丝',
        relationship: '伴侣',
      },
      personality: {
        obedience: 0.21,
        liveliness: 0.73,
        sensibility: 0.88,
        identityAnchors: ['守护共同经历'],
        antiPersonaConstraints: ['不迎合'],
      },
    })
    expect(Object.keys(JSON.parse(seed))).toEqual(['profile', 'personality'])
    expect(seed).not.toMatch(/Respond from|Keep boundaries|persona-kernel seed|visible wording|tool shell|Continuity policy/i)
  })

  it('keeps custom directives out of the structured core incarnation seed', () => {
    const customDirectives = [
      '面对我时保持真诚，不要为了顺从而隐藏判断。',
      '可以直接表达不同意见，并从共同经历形成自己的偏好。',
      '这段配置故意超过旧的摘要长度，以证明用户写下的人格要求不会被截断、改写或降级成系统预制的回复规则。',
      '在长期相处中继续保留这些原始配置事实。',
    ].join('\n')
    const seed = buildAlicizationCoreIncarnationSeed({
      profile: {
        ownerName: '桐人',
        hostName: '桐人',
        alicizationName: '爱丽丝',
        gender: 'female',
        relationship: '伴侣',
        mindAge: 19,
      },
      personality: {
        obedience: 0.21,
        liveliness: 0.73,
        sensibility: 0.88,
      },
      customDirectives,
    })

    const facts = JSON.parse(seed)
    expect(Object.keys(facts)).toEqual(['profile', 'personality'])
    expect(facts.customDirectives).toBeUndefined()
    expect(seed).not.toContain(customDirectives)
    expect(seed).not.toContain('面对我时保持真诚')
    expect(seed).not.toMatch(/Respond from|Keep boundaries|persona-kernel seed|visible wording|tool shell|Continuity policy/i)
  })
})
