import { describe, expect, it, vi } from 'vitest'

import { createAlicizationCardPromptRuntime } from './runtime-card-prompt'
import { buildSoulBody, normalizeFrontmatter, toSoulContent, withNeedsGenesis } from './runtime-soul'

describe('runtime card prompt persona kernel', () => {
  it('resolves persona kernel from soul and injects persona profile block into main prompt blocks', async () => {
    const frontmatter = normalizeFrontmatter({
      initialized: true,
      custom_directives: '说话真实一点。',
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
        obedience: 0.73,
        liveliness: 0.64,
        sensibility: 0.81,
      },
    })
    const soulContent = toSoulContent(frontmatter, buildSoulBody(frontmatter, ''))
    const soulSnapshot = withNeedsGenesis({
      soulPath: '/tmp/SOUL.md',
      content: soulContent,
      frontmatter,
      revision: 1,
      hash: 'hash',
      watching: true,
    })

    const runtime = createAlicizationCardPromptRuntime({
      getActiveCardId: () => 'default',
      getSoulSnapshot: () => soulSnapshot,
      resolveCardPaths: () => ({
        soulPath: '/tmp/SOUL.md',
      }),
      normalizeCardId: raw => typeof raw === 'string' ? raw : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
    })

    const personaKernel = await runtime.resolveCardPersonaKernel('default')
    const blocks = runtime.buildMainRuntimeCorePromptBlocks({
      hostName: '主人',
      personaKernel,
    })

    expect(personaKernel?.profile.alicizationName).toBe('小艾')
    expect(blocks.some(block => block.includes('[ALICIZATION_PERSONA_PROFILE]'))).toBe(true)
    expect(blocks.some(block => block.includes('"alicizationName":"小艾"'))).toBe(true)
    expect(blocks.some(block => block.includes('"relationship":"女仆"'))).toBe(true)
  })

  it('injects canonical project-state continuity blocks into main prompt blocks before each turn', async () => {
    const runtime = createAlicizationCardPromptRuntime({
      getActiveCardId: () => 'default',
      getSoulSnapshot: () => null,
      resolveCardPaths: () => ({
        soulPath: '/tmp/SOUL.md',
      }),
      normalizeCardId: raw => typeof raw === 'string' ? raw : 'default',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      appendRuntimeDebugLine: vi.fn(async () => {}),
    })

    const blocks = runtime.buildMainRuntimeCorePromptBlocks({
      hostName: '主人',
      personaKernel: null,
    })

    expect(blocks.some(block => block.includes('[ALICIZATION_PROJECT_STATE]'))).toBe(true)
    expect(blocks.some(block => block.includes('[ALICIZATION_PHASE1_CLOSURE_DASHBOARD]'))).toBe(true)
  })
})
