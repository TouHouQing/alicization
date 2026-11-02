import type { AlicizationSkillManifest } from './skill-registry'

import { describe, expect, it } from 'vitest'

import {

  createAlicizationSkillRegistry,
} from './skill-registry'

function createManifest(overrides: Partial<AlicizationSkillManifest> = {}): AlicizationSkillManifest {
  return {
    id: 'skill.memory-review',
    version: '1.0.0',
    description: 'Review a memory candidate.',
    inputSchema: { type: 'object' },
    outputSchema: { type: 'object' },
    dependencies: [],
    requiredTools: ['memory.workbench'],
    permissions: ['memory:read'],
    risk: 'low',
    evaluationStatus: 'unvalidated',
    activationStatus: 'candidate',
    loadInstructions: async () => 'Review the selected memory candidate.',
    ...overrides,
  }
}

describe('alicization SkillRegistry', () => {
  it('keeps rejected registration atomic and makes a replacement version the only loadable active version', async () => {
    const registry = createAlicizationSkillRegistry()
    expect(() => registry.register(createManifest({ activationStatus: 'active' }))).toThrow('approved evaluation')
    expect(await registry.discover({ productionOnly: false })).toEqual([])
    registry.register(createManifest({ evaluationStatus: 'approved', activationStatus: 'active' }))
    registry.register(createManifest({ version: '2.0.0', evaluationStatus: 'approved', activationStatus: 'active' }))
    expect((await registry.discover({ productionOnly: false })).find(item => item.version === '1.0.0')?.activationStatus).toBe('rolled-back')
    await expect(registry.load({ id: 'skill.memory-review', version: '1.0.0', tools: ['memory.workbench'], permissions: ['memory:read'] })).rejects.toThrow('not active')
  })

  it.each(['revoke', 'failed-evaluation', 'replacement'] as const)('rejects an in-flight instruction load after %s', async (change) => {
    let finish!: (text: string) => void
    const registry = createAlicizationSkillRegistry({ manifests: [createManifest({ evaluationStatus: 'approved', activationStatus: 'active', loadInstructions: () => new Promise((resolve) => { finish = resolve }) })] })
    const load = registry.load({ id: 'skill.memory-review', tools: ['memory.workbench'], permissions: ['memory:read'] })
    if (change === 'revoke')
      await registry.revoke('skill.memory-review', '1.0.0')
    else if (change === 'failed-evaluation')
      await registry.markEvaluation('skill.memory-review', '1.0.0', 'failed')
    else
      registry.register(createManifest({ version: '2.0.0', evaluationStatus: 'approved', activationStatus: 'active' }))
    finish('instructions fetched before the governance change')
    await expect(load).rejects.toThrow('changed while')
    if (change !== 'replacement')
      expect(await registry.discover()).toEqual([])
  })

  it('discovers lightweight metadata without loading full instructions', async () => {
    let loadCount = 0
    const registry = createAlicizationSkillRegistry({
      manifests: [createManifest({
        loadInstructions: async () => {
          loadCount += 1
          return 'full instructions'
        },
      })],
    })

    const discovered = await registry.discover({ productionOnly: false })

    expect(discovered).toEqual([expect.objectContaining({
      id: 'skill.memory-review',
      version: '1.0.0',
      activationStatus: 'candidate',
      evaluationStatus: 'unvalidated',
    })])
    expect(discovered[0]).not.toHaveProperty('instructions')
    expect(loadCount).toBe(0)
  })

  it('loads a skill only after explicit request and production activation', async () => {
    const registry = createAlicizationSkillRegistry({
      manifests: [createManifest({
        evaluationStatus: 'approved',
        activationStatus: 'active',
      })],
    })

    const loaded = await registry.load({
      id: 'skill.memory-review',
      tools: ['memory.workbench'],
      permissions: ['memory:read'],
    })

    expect(loaded).toMatchObject({
      id: 'skill.memory-review',
      version: '1.0.0',
      instructions: 'Review the selected memory candidate.',
    })
  })

  it('keeps unvalidated candidates out of production and refuses to load them', async () => {
    const registry = createAlicizationSkillRegistry({
      manifests: [createManifest()],
    })

    expect(await registry.discover()).toEqual([])
    await expect(registry.load({
      id: 'skill.memory-review',
      tools: ['memory.workbench'],
      permissions: ['memory:read'],
    })).rejects.toThrow('skill is not active')
    await expect(registry.activate('skill.memory-review', '1.0.0'))
      .rejects
      .toThrow('skill evaluation has not passed')
  })

  it('requires sandbox and replay evaluation before activation', async () => {
    const registry = createAlicizationSkillRegistry({
      manifests: [createManifest({
        evaluationStatus: 'sandbox-passed',
      })],
    })

    await expect(registry.activate('skill.memory-review', '1.0.0'))
      .rejects
      .toThrow('skill evaluation has not passed')

    await registry.markEvaluation('skill.memory-review', '1.0.0', 'approved')
    const activated = await registry.activate('skill.memory-review', '1.0.0')

    expect(activated.activationStatus).toBe('active')
    expect((await registry.discover()).map(item => item.id)).toEqual(['skill.memory-review'])
  })

  it('supports explicit rollback and revoke transitions', async () => {
    const registry = createAlicizationSkillRegistry({
      manifests: [
        createManifest({
          version: '1.0.0',
          evaluationStatus: 'approved',
          activationStatus: 'active',
        }),
        createManifest({
          version: '2.0.0',
          evaluationStatus: 'approved',
          activationStatus: 'candidate',
          loadInstructions: async () => 'new instructions',
        }),
      ],
    })

    await registry.activate('skill.memory-review', '2.0.0')
    expect((await registry.discover()).map(item => item.version)).toEqual(['2.0.0'])

    await registry.rollback('skill.memory-review', '1.0.0')
    expect((await registry.discover()).map(item => item.version)).toEqual(['1.0.0'])

    await registry.revoke('skill.memory-review', '1.0.0')
    expect(await registry.discover()).toEqual([])
  })

  it('rejects a load when the current action lacks a required tool or permission', async () => {
    const registry = createAlicizationSkillRegistry({
      manifests: [createManifest({
        evaluationStatus: 'approved',
        activationStatus: 'active',
      })],
    })

    await expect(registry.load({
      id: 'skill.memory-review',
      tools: [],
      permissions: ['memory:read'],
    })).rejects.toThrow('required tool')
    await expect(registry.load({
      id: 'skill.memory-review',
      tools: ['memory.workbench'],
      permissions: [],
    })).rejects.toThrow('required permission')
  })
})
