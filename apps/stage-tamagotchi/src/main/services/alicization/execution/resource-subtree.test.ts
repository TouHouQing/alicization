import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'

import { describe, expect, it } from 'vitest'

import { createExecutionResourceBroker, executionDirectoryTreeResources, executionFileResources } from './resource-broker'
import { executionResourcesOverlap } from './resource-overlap'

describe('native subtree ownership in the single execution broker', () => {
  it('blocks descendants and real aliases, including its former parent, while other accepted work can use a sibling', async () => {
    const root = await mkdtemp(join(tmpdir(), 'life-resource-subtree-'))
    try {
      const directory = join(root, 'download')
      const alias = join(root, 'alias')
      await mkdir(directory)
      await symlink(directory, alias, platform === 'win32' ? 'junction' : 'dir')
      await writeFile(join(directory, 'partial.txt'), 'native bytes')
      const broker = createExecutionResourceBroker()
      const tree = await executionDirectoryTreeResources(directory)
      const target = await executionFileResources(join(directory, 'partial.txt'))
      const aliased = await executionFileResources(join(alias, 'partial.txt'))
      const nested = await executionFileResources(join(directory, 'new', 'file.txt'))
      const sibling = await executionFileResources(join(root, 'download-other', 'file.txt'))
      const ancestor = await executionFileResources(root)
      await broker.withOwner('parent-work', async () => {
        const aggregate = broker.acquire({ owner: 'parent-work', resources: ['host:execution'], coordinationOnly: true })
        const child = broker.acquire({ owner: 'native-download', resources: tree, resourceOnly: true, effectId: 'download', effectCardId: 'alice' })
        expect(child.owner).toBe('native-download')
        for (const resources of [target, aliased, nested, ancestor])
          expect(() => broker.acquire({ owner: 'parent-work', resources })).toThrow('another executor')
        const other = broker.acquire({ owner: 'parent-work', resources: sibling })
        broker.settle(other, { stopped: true, uncertain: false })
        broker.settle(aggregate, { stopped: true, uncertain: false })
      })
      const independent = broker.acquire({ owner: 'other-work', resources: ['host:execution'], coordinationOnly: true })
      const outside = broker.acquire({ owner: 'other-work', resources: sibling })
      broker.settle(outside, { stopped: true, uncertain: false })
      broker.settle(independent, { stopped: true, uncertain: false })
      expect(broker.snapshot()).toHaveLength(1)
      expect(() => broker.acquire({ owner: 'bob', resources: target })).toThrow('another executor')
      expect(() => broker.acquire({ owner: 'opaque-cli', resources: ['host:execution'] })).toThrow('another executor')
      expect(executionResourcesOverlap(tree, sibling)).toBe(false)
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it('keeps bootstrap and opaque execution global while allowing only validated step coordination to share native ownership', async () => {
    const broker = createExecutionResourceBroker()
    const resources = await executionDirectoryTreeResources(join(tmpdir(), 'owned-native-transfer'))
    const boot = broker.acquire({ owner: 'bootstrap', resources: ['host:execution'] })
    expect(() => broker.acquire({ owner: 'native', resources, resourceOnly: true })).toThrow('another executor')
    broker.settle(boot, { stopped: true, uncertain: false })
    const coordinator = broker.acquire({ owner: 'steps', resources: ['host:execution'], coordinationOnly: true })
    const child = broker.acquire({ owner: 'native', resources, resourceOnly: true })
    broker.settle(coordinator, { stopped: true, uncertain: false })
    expect(() => broker.acquire({ owner: 'opaque', resources: ['host:execution'] })).toThrow('another executor')
    expect(() => broker.acquire({ owner: 'bad-coordinator', resources, coordinationOnly: true })).toThrow('coordination')
    expect(() => broker.acquire({ owner: 'bad-coordinator', resources: ['host:execution'], coordinationOnly: true, effectId: 'opaque-operation' })).toThrow('coordination')
    broker.settle(child, { stopped: true, uncertain: false })
  })

  it('preserves a reconstructed directory quarantine after expiry and rejects malformed or global resource-only scopes', async () => {
    const directory = join(tmpdir(), 'life-owned-transfer', 'unique-reservation')
    const resources = await executionDirectoryTreeResources(directory)
    const target = await executionFileResources(join(directory, 'file.txt'))
    const broker = createExecutionResourceBroker(() => 10_000)
    broker.restoreQuarantine({ cardId: 'alice', effectId: 'download', resources, resourceOnly: true })
    expect(() => broker.acquire({ owner: 'new-owner', resources: target })).toThrow('reconciliation')
    const other = broker.acquire({ owner: 'other-work', resources: ['host:execution'], coordinationOnly: true })
    broker.settle(other, { stopped: true, uncertain: false })
    expect(() => broker.restoreQuarantine({ cardId: 'alice', effectId: 'download', resources })).toThrow('conflicts')
    for (const invalid of [['host:execution'], ['file-tree:relative'], [...resources, 'browser:alice']])
      expect(() => broker.acquire({ owner: 'bad', resources: invalid, resourceOnly: true })).toThrow()
  })
})
