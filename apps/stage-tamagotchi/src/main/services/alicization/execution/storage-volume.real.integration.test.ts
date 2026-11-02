import process from 'node:process'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, open, readdir, readFile, stat, statfs, unlink, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { expect, it } from 'vitest'

import { callLocalFilesystem, inspectFilesystemWritePrecondition } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { writeAlicizationAtomicContent } from '../runtime-atomic-write'
import { createExecutionStorageMaintenance } from './storage-maintenance'

// A dedicated, unlettered, small host volume supplies actual Windows statfs
// values. This test never fills the user's disk or mocks filesystem capacity.
it.skipIf(!process.env.LIFE_LOW_DISK_MANIFEST).each([1, 2, 3])('refuses writes and preserves original bytes on a real low-space volume, round %i', async (round) => {
  const manifestPath = resolve(process.env.LIFE_LOW_DISK_MANIFEST!)
  const owner = JSON.parse((await readFile(manifestPath, 'utf8')).trim())
  expect(owner.format).toBe('alicization-owned-low-disk-volume-v1')
  expect(owner.mount).toBe(join(owner.root, 'mount'))
  expect(manifestPath).toBe(join(owner.root, 'owner.json'))
  expect(resolve(owner.root, '..')).toBe(join(owner.workspace, 'output', 'owned-low-disk-volumes'))
  const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
  for (const file of ['execution/storage-budget.ts', 'execution/storage-maintenance.ts', '../airi/mcp-servers/local-filesystem.ts', '../airi/mcp-servers/file-mutation-queue.ts']) {
    const relative = `apps/stage-tamagotchi/src/main/services/alicization/${file}`
    expect(hash(await readFile(resolve(relative))), file).toBe(hash(await readFile(join(owner.workspace, relative))))
  }
  const root = join(owner.mount, `round-${round}`)
  await mkdir(root)
  const originalPath = join(root, '保留原文.txt')
  const cachePath = join(root, 'owned-cache.bin')
  const text = `主机测试原文 ${round}：雨声陪伴。`
  await writeFile(originalPath, text, { flag: 'wx' })
  const before = await stat(originalPath)
  const originalHash = hash(await readFile(originalPath))
  const cacheBytes = Buffer.alloc(8 * 1024 * 1024, round)
  await writeFile(cachePath, cacheBytes, { flag: 'wx' })
  const cacheHash = hash(cacheBytes)
  const capacity = await statfs(root, { bigint: true })
  const available = capacity.bavail * capacity.bsize
  expect(available).toBeGreaterThan(0n)
  expect(available).toBeLessThan(256n * 1024n * 1024n)
  let busy = true
  let cleared = 0
  const controller = createExecutionStorageMaintenance({
    root,
    canMaintain: () => !busy,
    cache: {
      size: async () => {
        try {
          return (await stat(cachePath)).size
        }
        catch (error) {
          if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
            return 0
          throw error
        }
      },
      clear: async () => {
        expect(hash(await readFile(cachePath))).toBe(cacheHash)
        await unlink(cachePath)
        cleared++
      },
    },
  })
  let result: Record<string, unknown> = { round, passed: false, availableBytes: String(available) }
  try {
    const refusal = { code: 'EXECUTION_DISK_BUDGET_EXCEEDED', effectMayHaveOccurred: false }
    await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path: 'new-folder/new.txt', content: '不要创建' }, workspace: root })).rejects.toMatchObject(refusal)
    await expect(stat(join(root, 'new-folder'))).rejects.toMatchObject({ code: 'ENOENT' })
    await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path: originalPath, content: '不要覆盖' }, workspace: root, writePrecondition: await inspectFilesystemWritePrecondition(originalPath) })).rejects.toMatchObject(refusal)
    const read = await callLocalFilesystem({ toolName: 'read_file', arguments: { path: originalPath }, workspace: root })
    expect(read.content?.[0].text).toBe(text)
    expect(await controller.inspect()).toMatchObject({ pressure: 'low', state: 'deferred' })
    expect(cleared).toBe(0)
    expect(await controller.optionalWorkAllowed()).toBe(false)
    busy = false
    const cleaned = await controller.inspect()
    expect(cleaned).toMatchObject({ state: 'ready', pressure: 'low', cacheBytes: 0, releasedCacheBytes: cacheBytes.length })
    expect(BigInt(cleaned.availableBytes!)).toBeGreaterThan(available)
    expect(await controller.optionalWorkAllowed()).toBe(false)
    expect(cleared).toBe(1)
    expect(hash(await readFile(originalPath))).toBe(originalHash)
    expect((await stat(originalPath)).mtimeMs).toBe(before.mtimeMs)
    result = { ...result, passed: true, originalHash, originalMtimePreserved: true, creationRefusedWithoutDirectory: true, overwriteRefused: true, readingAvailable: true, deferredUnderWriter: true, cleared, cleaned, optionalWorkHeld: true }
  }
  finally {
    await controller.close()
    await writeFile(join(owner.root, `round-${round}.json`), JSON.stringify(result, null, 2), { flag: 'wx' })
  }
}, 30_000)

it.skipIf(!process.env.LIFE_LOW_DISK_MANIFEST).each([1, 2, 3])('rolls back a real full-disk life transaction and reopens the same history, round %i', async (round) => {
  const manifestPath = resolve(process.env.LIFE_LOW_DISK_MANIFEST!)
  const owner = JSON.parse((await readFile(manifestPath, 'utf8')).trim())
  expect(owner.format).toBe('alicization-owned-low-disk-volume-v1')
  expect(owner.maximumMiB).toBe(96)
  expect(owner.mount).toBe(join(owner.root, 'mount'))
  expect(manifestPath).toBe(join(owner.root, 'owner.json'))
  expect(resolve(owner.root, '..')).toBe(join(owner.workspace, 'output', 'owned-low-disk-volumes'))
  const directory = join(owner.mount, `sqlite-full-${round}`)
  await mkdir(directory)
  const databaseRoot = join(directory, 'life')
  const fillerPath = join(directory, 'owned-capacity-fixture.bin')
  let database = await setupAlicizationDb(databaseRoot, { cardId: 'native-low-space' })
  const seedId = `retained-${round}`
  let result: Record<string, unknown> = { round, passed: false }
  try {
    await database.appendConversationTurn({ sessionId: 'same-life', turnId: seedId, userText: '之前的约定', assistantText: '我会记得。' })
    await database.insertScheduledTask({ taskId: seedId, triggerAt: Date.now() + 60_000, message: '保留这件尚未完成的事' })
    const before = await database.readLifeState()
    const history = await database.listConversationTurnsBySession('same-life')
    const capacity = await statfs(directory, { bigint: true })
    expect(capacity.blocks * capacity.bsize).toBeLessThanOrEqual(96n * 1024n * 1024n)
    const available = capacity.bavail * capacity.bsize
    expect(available).toBeGreaterThan(8n * 1024n * 1024n)
    const filler = await open(fillerPath, 'wx')
    try {
      const bytes = Buffer.alloc(64 * 1024, round)
      const budget = Number(available - 128n * 1024n)
      let written = 0
      while (written < budget) {
        const part = await filler.write(bytes, 0, Math.min(bytes.length, budget - written), written)
        expect(part.bytesWritten).toBeGreaterThan(0)
        written += part.bytesWritten
      }
      await filler.sync()
    }
    finally {
      await filler.close()
    }
    const mutations = Array.from({ length: 20 }, (_, index) => ({ type: 'ingress-accept' as const, ingress: { id: `uncommitted-${round}-${index}`, kind: 'system' as const, source: 'owned-native-full-volume', sourceKey: `${round}-${index}`, occurredAt: Date.now(), payload: { text: '雨'.repeat(9_000) } } }))
    await expect(database.commitLifeState({ cardId: 'native-low-space', operationKey: `full-disk-${round}`, changes: [], mutations })).rejects.toMatchObject({ code: 'SQLITE_FULL' })
    await unlink(fillerPath)
    await database.close()
    database = await setupAlicizationDb(databaseRoot, { cardId: 'native-low-space' })
    const reopened = await database.readLifeState()
    expect(reopened.revision).toBe(before.revision)
    expect(reopened.obligations).toEqual(before.obligations)
    expect(await database.listConversationTurnsBySession('same-life')).toEqual(history)
    expect(await database.listPendingScheduledTasks()).toMatchObject([{ taskId: seedId }])
    for (const mutation of mutations)
      expect(await database.getLifeIngress(mutation.ingress.id)).toBeNull()
    await database.commitLifeState({ cardId: 'native-low-space', operationKey: `full-disk-${round}`, changes: [], mutations })
    const committed = await database.readLifeState()
    expect(committed.revision).toBe(before.revision + 1)
    for (const mutation of mutations)
      expect(await database.getLifeIngress(mutation.ingress.id)).toMatchObject({ id: mutation.ingress.id })
    await database.commitLifeState({ cardId: 'native-low-space', operationKey: `full-disk-${round}`, changes: [], mutations })
    expect((await database.readLifeState()).revision).toBe(committed.revision)
    result = { ...result, passed: true, nativeError: 'SQLITE_FULL', originalRevision: before.revision, priorHistoryPreserved: true, unfinishedResponsibilityPreserved: true, partialIngressCommitted: 0, retryCommittedOnce: true, reopenedAfterFailure: true, capacityMocked: false }
  }
  finally {
    await unlink(fillerPath).catch((error) => {
      if (error.code !== 'ENOENT')
        throw error
    })
    await database.close()
    await writeFile(join(owner.root, `sqlite-full-${round}.json`), JSON.stringify(result, null, 2), { flag: 'wx' })
  }
}, 30_000)

// Filling is restricted to the already validated 96 MiB VHD, never the host
// volume. Observe a real partial write; capacity and I/O errors stay native.
it.skipIf(!process.env.LIFE_LOW_DISK_MANIFEST).each([1, 2, 3])('preserves an atomic target after actual mid-write ENOSPC, round %i', async (round) => {
  const manifestPath = resolve(process.env.LIFE_LOW_DISK_MANIFEST!)
  const owner = JSON.parse((await readFile(manifestPath, 'utf8')).trim())
  expect(owner.format).toBe('alicization-owned-low-disk-volume-v1')
  expect(owner.maximumMiB).toBe(96)
  expect(owner.mount).toBe(join(owner.root, 'mount'))
  expect(manifestPath).toBe(join(owner.root, 'owner.json'))
  expect(resolve(owner.root, '..')).toBe(join(owner.workspace, 'output', 'owned-low-disk-volumes'))
  const source = 'apps/stage-tamagotchi/src/main/services/alicization/runtime-atomic-write.ts'
  expect(await readFile(resolve(source), 'utf8')).toBe(await readFile(join(owner.workspace, source), 'utf8'))
  const directory = join(owner.mount, `enospc-${round}`)
  await mkdir(directory)
  const target = join(directory, '人格状态.json')
  const original = JSON.stringify({ identity: `同一个她-${round}`, continuity: '原始人格与关系应被保留' })
  await writeFile(target, original, { flag: 'wx' })
  const before = await stat(target)
  const fillerPath = join(directory, 'owned-capacity-fixture.bin')
  let partialBytes = 0
  let result: Record<string, unknown> = { round, passed: false }
  try {
    const capacity = await statfs(directory, { bigint: true })
    expect(capacity.blocks * capacity.bsize).toBeLessThanOrEqual(96n * 1024n * 1024n)
    const available = capacity.bavail * capacity.bsize
    expect(available).toBeGreaterThan(8n * 1024n * 1024n)
    const leaveBytes = 512n * 1024n
    const fillBytes = Number(available - leaveBytes)
    const filler = await open(fillerPath, 'wx')
    try {
      const chunk = Buffer.alloc(64 * 1024, round)
      let written = 0
      while (written < fillBytes) {
        const { bytesWritten } = await filler.write(chunk, 0, Math.min(chunk.length, fillBytes - written), written)
        expect(bytesWritten).toBeGreaterThan(0)
        written += bytesWritten
      }
      await filler.sync()
    }
    finally {
      await filler.close()
    }
    const replacement = '雨'.repeat(700_000)
    const temporaryFiles = async () => (await readdir(directory)).filter(name => name.startsWith('人格状态.json.') && name.endsWith('.tmp'))
    await expect(writeAlicizationAtomicContent({
      category: 'owned-native-enospc-test',
      path: target,
      content: replacement,
      runStep: async (stage, task) => {
        try {
          return await task()
        }
        catch (error) {
          if (stage === 'atomic temporary file write') {
            const temporary = await temporaryFiles()
            expect(temporary).toHaveLength(1)
            partialBytes = (await stat(join(directory, temporary[0]))).size
          }
          throw error
        }
      },
    })).rejects.toMatchObject({ code: 'ENOSPC' })
    expect(partialBytes).toBeGreaterThan(0)
    expect(partialBytes).toBeLessThan(Buffer.byteLength(replacement))
    await expect.poll(temporaryFiles).toEqual([])
    expect(await readFile(target, 'utf8')).toBe(original)
    expect((await stat(target)).mtimeMs).toBe(before.mtimeMs)
    result = { ...result, passed: true, nativeError: 'ENOSPC', partialBytes, replacementBytes: Buffer.byteLength(replacement), originalBytesPreserved: true, originalMtimePreserved: true, temporaryRemoved: true, capacityMocked: false }
  }
  finally {
    await unlink(fillerPath).catch((error) => {
      if (error.code !== 'ENOENT')
        throw error
    })
    await writeFile(join(owner.root, `enospc-${round}.json`), JSON.stringify(result, null, 2), { flag: 'wx' })
  }
}, 30_000)
