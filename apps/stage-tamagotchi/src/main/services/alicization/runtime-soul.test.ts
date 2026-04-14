import { describe, expect, it } from 'vitest'

import { defaultFrontmatter, normalizeFrontmatter } from './runtime-soul'

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
    expect(frontmatter.core_incarnation).toContain('我是小艾')
    expect(frontmatter.core_incarnation).toContain('女仆')
    expect(frontmatter.core_incarnation).toContain('先接住主人情绪')
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
})
