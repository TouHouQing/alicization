import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'
import { link, mkdtemp, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, it } from 'vitest'

import { compensateExecutionFile } from './compensation'
import { createExecutionResourceBroker } from './resource-broker'

const digest = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex')
async function identity(path: string) {
  const info = await stat(path, { bigint: true })
  return { device: String(info.dev), inode: String(info.ino) }
}

it('refuses a replacement file with identical bytes and preserves both actual file objects', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-recovery-native-identity-'))
  try {
    const path = join(root, 'target.txt')
    const prior = join(root, 'prior.txt')
    await writeFile(path, 'generated')
    const owned = await identity(path)
    await rename(path, prior)
    await writeFile(path, 'generated')
    const broker = createExecutionResourceBroker()
    const result = await compensateExecutionFile({ cardId: 'alice', recoveryId: randomUUID(), effectId: 'original', path, ...owned, writtenHash: digest('generated'), backupHash: digest('before'), backupBytes: Buffer.from('before') }, { broker, effectOwnsVersion: async () => true, audit: async () => {} })
    expect(result).toMatchObject({ ok: false, errorCode: 'COMPENSATION_FILE_IDENTITY_CHANGED', effectMayHaveOccurred: false })
    expect(await readFile(path, 'utf8')).toBe('generated')
    expect(await readFile(prior, 'utf8')).toBe('generated')
    expect(broker.snapshot()).toEqual([])
  }
  finally { await rm(root, { recursive: true, force: true }) }
}, 30000)

it('removes only the verified created file through its exclusive native handle', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-recovery-native-remove-'))
  try {
    const path = join(root, 'created.txt')
    await writeFile(path, 'generated')
    const broker = createExecutionResourceBroker()
    const events: unknown[] = []
    const result = await compensateExecutionFile({ cardId: 'alice', recoveryId: randomUUID(), effectId: 'original', path, ...await identity(path), removeCreated: true, writtenHash: digest('generated'), backupHash: digest(Buffer.alloc(0)), backupBytes: Buffer.alloc(0) }, { broker, effectOwnsVersion: async () => true, audit: async (event) => { events.push(event) } })
    expect(result).toMatchObject({ ok: true, removedHash: digest('generated'), scope: 'exclusive-file-handle-removed-created-file' })
    await expect(stat(path)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(events).toHaveLength(3)
    expect(broker.snapshot()).toEqual([])
  }
  finally { await rm(root, { recursive: true, force: true }) }
}, 30000)

it('restores the full two MiB original byte budget and refuses to mutate shared hard links', async () => {
  const root = await mkdtemp(join(tmpdir(), 'file-recovery-native-bytes-'))
  try {
    const path = join(root, 'generated.bin')
    await writeFile(path, 'generated')
    const broker = createExecutionResourceBroker()
    const backupBytes = Buffer.alloc(2 * 1024 * 1024, 0xA7)
    const request = { cardId: 'alice', recoveryId: randomUUID(), effectId: 'original', path, ...await identity(path), writtenHash: digest('generated'), backupHash: digest(backupBytes), backupBytes }
    expect(await compensateExecutionFile(request, { broker, effectOwnsVersion: async () => true, audit: async () => {} })).toMatchObject({ ok: true, actualHash: digest(backupBytes) })
    expect(await readFile(path)).toEqual(backupBytes)
    await writeFile(path, 'generated')
    const alias = join(root, 'host-alias.bin')
    await link(path, alias)
    expect(await compensateExecutionFile(request, { broker, effectOwnsVersion: async () => true, audit: async () => {} })).toMatchObject({ ok: false, errorCode: 'COMPENSATION_LINKED_OR_NON_FILE_TARGET', effectMayHaveOccurred: false })
    expect(await readFile(path, 'utf8')).toBe('generated')
    expect(await readFile(alias, 'utf8')).toBe('generated')
    expect(broker.snapshot()).toEqual([])
  }
  finally { await rm(root, { recursive: true, force: true }) }
}, 30000)
