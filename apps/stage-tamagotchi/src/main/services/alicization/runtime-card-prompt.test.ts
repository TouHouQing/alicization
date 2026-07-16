import { describe, expect, it, vi } from 'vitest'

import { createAlicizationCardPromptRuntime } from './runtime-card-prompt'
import { buildSoulBody, normalizeFrontmatter, toSoulContent, withNeedsGenesis } from './runtime-soul'

describe('runtime card prompt persona kernel', () => {
  it('resolves persona kernel from soul and injects persona profile facts into main prompt blocks', async () => {
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
    expect(blocks.map(block => JSON.parse(block))).toContainEqual({
      type: 'alicization-persona-profile',
      data: {
        ownerName: '指挥官',
        hostName: '主人',
        alicizationName: '小艾',
        relationship: '女仆',
        gender: 'female',
        mindAge: 18,
      },
    })
    expect(blocks.map(block => JSON.parse(block))).toContainEqual({
      type: 'alicization-host',
      data: {
        name: '主人',
      },
    })
    expect(JSON.stringify(blocks)).not.toMatch(
      /Response contract|Output contract|Return (?:exactly )?one (?:strict )?JSON/iu,
    )
  })

  it('does not inject canonical project-state continuity blocks into ordinary main prompt blocks', async () => {
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
      includeProjectStateContext: false,
      personaKernel: null,
    })

    expect(blocks.map(block => JSON.parse(block)).some(block => block.type === 'alicization-project-state')).toBe(false)
  })

  it('keeps project-state governance out of the Provider prompt even when a legacy caller requests it', async () => {
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
      includeProjectStateContext: true,
      personaKernel: null,
    })

    const facts = blocks.map(block => JSON.parse(block))
    expect(facts.some(block => block.type === 'alicization-project-state')).toBe(false)
  })
})
