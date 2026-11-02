import { link, mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { createFileRecoveryTestFixture } from '../test-support/file-recovery-fixture'
import { executionDirectoryTreeResources, executionFileResources } from './resource-broker'

it('holds an external hard-link alias behind native subtree ownership while allowing unrelated ordinary files', async () => {
  const f = await createFileRecoveryTestFixture()
  try {
    const directory = join(f.root, 'native-transfer')
    await mkdir(directory)
    const native = join(directory, 'partial.txt')
    const alias = join(f.root, 'external-alias.txt')
    await writeFile(native, 'actual native partial bytes')
    const lease = f.broker.acquire({ owner: 'owned-native-transfer', effectId: 'native-download-fixture', effectCardId: 'alice', resourceOnly: true, resources: await executionDirectoryTreeResources(directory) })
    // The host creates the alias after the native subtree was reserved. The
    // pending writer has no knowledge of this external lexical path.
    await link(native, alias)
    await expect(f.save(alias, 'must not race the native writer')).rejects.toThrow('Resource is owned')
    expect(await readFile(native, 'utf8')).toBe('actual native partial bytes')
    const unrelated = join(f.root, 'independent.txt')
    await f.save(unrelated, 'independent accepted result')
    expect(await readFile(unrelated, 'utf8')).toBe('independent accepted result')
    f.broker.settle(lease, { stopped: false, uncertain: true })
    await expect(f.save(alias, 'must not override unknown native state')).rejects.toThrow('reconciliation')
    expect(await readFile(native, 'utf8')).toBe('actual native partial bytes')
    f.broker.settle(lease, { stopped: true, uncertain: false })
    await f.save(alias, 'allowed after confirmed native closure')
    expect(await readFile(native, 'utf8')).toBe('allowed after confirmed native closure')
  }
  finally { await f.close() }
}, 30000)

it('also refuses a new subtree owner while a shared file object is already owned through another name', async () => {
  const f = await createFileRecoveryTestFixture()
  try {
    const directory = join(f.root, 'transfer')
    await mkdir(directory)
    const native = join(directory, 'file.txt')
    const alias = join(f.root, 'alias.txt')
    await writeFile(native, 'owned original')
    await link(native, alias)
    const resources = await executionFileResources(alias)
    const file = f.broker.acquire({ owner: 'existing-file-writer', resources })
    const subtree = await executionDirectoryTreeResources(directory)
    expect(() => f.broker.acquire({ owner: 'new-native-transfer', resourceOnly: true, resources: subtree })).toThrow('Resource is owned')
    f.broker.settle(file, { stopped: true, uncertain: false })
  }
  finally { await f.close() }
})
