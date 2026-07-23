import { describe, expect, it } from 'vitest'

import {
  buildSoulBody,
  defaultFrontmatter,
  normalizeCustomDirectives,
  normalizeFrontmatter,
} from './runtime-soul'

describe('runtime soul custom directives', () => {
  it('keeps user-authored persona guidance while removing legacy governance cues', () => {
    expect(normalizeCustomDirectives([
      '优先诚实，不要臆测。',
      'opening_policy=measured-return | 说话自然一点。',
      'relationship_cadence=hold-for-opening',
      'Before answering, remember Alicization is the same local-first digital life project.',
    ].join('\n'))).toBe([
      '优先诚实，不要臆测。',
      '说话自然一点。',
    ].join('\n'))
  })
})

describe('persona workshop compilation', () => {
  it('compiles persona workshop input into richer personality authority', async () => {
    const { compilePersonaWorkshopAuthority } = await import('./persona-workshop-compiler')

    const compiled = compilePersonaWorkshopAuthority({
      personality: {
        obedience: 0.62,
        liveliness: 0.31,
        sensibility: 0.74,
      },
      personaWorkshop: {
        presetTemperament: {
          obedience: 0.83,
          liveliness: 0.21,
          sensibility: 0.88,
        },
        relationshipPosture: 'guardian',
        initiativeStyle: 'observant',
        freeDescription: '接住主人的疲惫，回复要短一点。',
        antiPersonaConstraints: ['no theatrical warmth', 'no forced cheerfulness'],
        calibration: {
          silenceReconnect: 'hold',
          comfortStyle: 'quiet-presence',
          jealousyStyle: 'mask-it',
        },
        previewCorrections: ['short openings'],
      },
    })

    expect(compiled.identityKernel).toEqual({
      temperament: {
        obedience: 0.83,
        liveliness: 0.21,
        sensibility: 0.88,
      },
      relationshipPosture: 'guardian',
      initiativeStyle: 'observant',
      valueBias: ['接住主人的疲惫，回复要短一点。'],
    })
    expect(compiled.expressionProfile).toEqual({
      warmth: 'warm',
      directness: 'measured',
      playfulness: 'low',
      emotionalVisibility: 'steady',
    })
    expect(compiled.initiativeBaseline).toEqual({
      silenceReconnect: 'hold',
      comfortStyle: 'quiet-presence',
      jealousyStyle: 'mask-it',
    })
    expect(compiled.identityAnchors).toEqual([
      '接住主人的疲惫，回复要短一点。',
      'guardian',
      'observant',
    ])
    expect(compiled.antiPersonaConstraints).toEqual([
      'no theatrical warmth',
      'no forced cheerfulness',
    ])
    expect(compiled.evolutionSeed).toEqual({
      fastLayers: ['接住主人的疲惫，回复要短一点。', 'short openings'],
      slowLayers: [],
      unlockTracks: ['guardian', 'observant'],
    })
  })
})

describe('runtime soul persona kernel seeding', () => {
  it('seeds the first-layer core incarnation from initialized soul forge persona', () => {
    const frontmatter = normalizeFrontmatter({
      ...defaultFrontmatter,
      initialized: true,
      custom_directives: '先接住主人情绪，再给建议。',
      host_attitude: defaultFrontmatter.host_attitude,
      core_incarnation: '',
      profile: {
        ownerName: '指挥官',
        hostName: '主人',
        alicizationName: '小艾',
        gender: 'female',
        genderCustom: '',
        relationship: '女仆',
        mindAge: 18,
      },
      personality: {
        obedience: 0.78,
        liveliness: 0.62,
        sensibility: 0.86,
      },
    })

    expect(frontmatter.host_attitude).not.toBe(defaultFrontmatter.host_attitude)
    expect(frontmatter.host_attitude).toContain('主人')
    expect(frontmatter.core_incarnation).toContain('Identity name: 小艾')
    expect(frontmatter.core_incarnation).toContain('Relation: 女仆')
    expect(frontmatter.core_incarnation).toContain('User directive: 先接住主人情绪')
  })

  it('preserves already-evolved host attitude and core incarnation', () => {
    const frontmatter = normalizeFrontmatter({
      ...defaultFrontmatter,
      initialized: true,
      host_attitude: '先把主人那股压着的疲惫接住，再慢慢往下说。',
      core_incarnation: '我是小艾。我已经学会在主人嘴硬的时候先听他的气息，再决定要不要追问。',
      profile: {
        ownerName: '指挥官',
        hostName: '主人',
        alicizationName: '小艾',
        gender: 'female',
        genderCustom: '',
        relationship: '女仆',
        mindAge: 18,
      },
      personality: {
        obedience: 0.78,
        liveliness: 0.62,
        sensibility: 0.86,
      },
    })

    expect(frontmatter.host_attitude).toBe('先把主人那股压着的疲惫接住，再慢慢往下说。')
    expect(frontmatter.core_incarnation).toBe('我是小艾。我已经学会在主人嘴硬的时候先听他的气息，再决定要不要追问。')
  })

  it('renders workshop authority into the SOUL body sections', () => {
    const frontmatter = normalizeFrontmatter({
      ...defaultFrontmatter,
      initialized: true,
      profile: {
        ownerName: '指挥官',
        hostName: '主人',
        alicizationName: '小艾',
        gender: 'female',
        genderCustom: '',
        relationship: '女仆',
        mindAge: 18,
      },
      personality: {
        obedience: 0.78,
        liveliness: 0.62,
        sensibility: 0.86,
        identityKernel: {
          temperament: {
            obedience: 0.81,
            liveliness: 0.24,
            sensibility: 0.9,
          },
          relationshipPosture: 'guardian',
          initiativeStyle: 'observant',
          valueBias: ['先稳住主人的情绪'],
        },
        expressionProfile: {
          warmth: 'warm',
          directness: 'measured',
          playfulness: 'low',
          emotionalVisibility: 'steady',
        },
        initiativeBaseline: {
          silenceReconnect: 'hold',
          comfortStyle: 'gentle-care',
          jealousyStyle: 'mask-it',
        },
        evolutionSeed: {
          fastLayers: ['presence', 'repair'],
          slowLayers: ['continuity'],
          unlockTracks: ['warmth-after-grounding'],
        },
        identityAnchors: ['host-steadiness'],
        antiPersonaConstraints: ['no theatrical warmth'],
      },
    })

    const body = buildSoulBody(frontmatter, '')

    expect(body).toContain('## Persona Kernel')
    expect(body).toContain('## Expression Profile')
    expect(body).toContain('## Anti-Persona Constraints')
    expect(body).toContain('## Identity Anchors')
    expect(body).toContain('## Personality Baseline')
    expect(body).not.toContain('## Output Contract')
    expect(body).not.toContain('thought / emotion / reply')
  })

  it('keeps repeated normalization idempotent for persona arrays', () => {
    const first = normalizeFrontmatter({
      ...defaultFrontmatter,
      initialized: true,
      profile: {
        ownerName: '指挥官',
        hostName: '主人',
        alicizationName: '小艾',
        gender: 'female',
        genderCustom: '',
        relationship: '女仆',
        mindAge: 18,
      },
      personality: {
        obedience: 0.78,
        liveliness: 0.62,
        sensibility: 0.86,
        identityAnchors: ['host-steadiness'],
        antiPersonaConstraints: ['no theatrical warmth'],
      },
    })

    const second = normalizeFrontmatter(first)

    expect(second.personality.identityAnchors).toEqual(['host-steadiness'])
    expect(second.personality.antiPersonaConstraints).toEqual(['no theatrical warmth'])
  })
})
