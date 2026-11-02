import { Buffer } from 'node:buffer'
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rename, rm, symlink, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'

import { describe, expect, it } from 'vitest'

import { createFileRecoveryVault } from './file-recovery-vault'

function codec() {
  const key = randomBytes(32)
  return {
    seal: (bytes: Uint8Array) => {
      const iv = randomBytes(12)
      const cipher = createCipheriv('aes-256-gcm', key, iv)
      const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()])
      return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
    },
    unseal: (bytes: Uint8Array) => {
      const envelope = Buffer.from(bytes)
      const cipher = createDecipheriv('aes-256-gcm', key, envelope.subarray(0, 12))
      cipher.setAuthTag(envelope.subarray(12, 28))
      return Buffer.concat([cipher.update(envelope.subarray(28)), cipher.final()])
    },
  }
}
const id = (value: string) => createHash('sha256').update(value).digest('hex')

describe('bounded private before-image ciphertext artifacts', () => {
  it('recovers from initial storage unavailability while keeping the admitted directory identity pinned', async () => {
    const root = await mkdtemp(join(tmpdir(), 'file-recovery-vault-startup-'))
    const parent = join(root, 'temporarily-missing')
    const directory = join(parent, 'vault')
    const vault = createFileRecoveryVault({ root: directory, ...codec() })
    const before = Buffer.from('version retained across storage recovery')
    try {
      await expect(vault.put(id('before'), before)).rejects.toMatchObject({ code: 'ENOENT' })
      await mkdir(parent)
      const reference = await vault.put(id('before'), before)
      expect(await vault.read(reference)).toEqual(before)
      const ciphertext = await readFile(join(directory, `${reference.id}.blob`))
      const retained = join(parent, 'retained')
      await rename(directory, retained)
      await mkdir(directory)
      await expect(vault.put(id('new'), Buffer.from('replacement'))).rejects.toThrow('directory identity changed')
      expect(await readFile(join(retained, `${reference.id}.blob`))).toEqual(ciphertext)
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it('transports only validated ciphertext when the backup process has no decryption key', async () => {
    const root = await mkdtemp(join(tmpdir(), 'file-recovery-cipher-transport-'))
    const encryption = codec()
    const source = createFileRecoveryVault({ root: join(root, 'source'), ...encryption })
    const inaccessible = createFileRecoveryVault({ root: join(root, 'source'), seal: () => { throw new Error('key unavailable') }, unseal: () => { throw new Error('key unavailable') } })
    const target = createFileRecoveryVault({ root: join(root, 'backup'), ...encryption })
    try {
      const bytes = Buffer.from('private original that backups never decrypt')
      const ref = await source.put(id('transport'), bytes)
      await expect(inaccessible.read(ref)).rejects.toThrow('key unavailable')
      const cipher = await inaccessible.readEncrypted(ref)
      expect(cipher.includes(bytes)).toBe(false)
      await target.importEncrypted(ref, cipher)
      expect(await target.read(ref)).toEqual(bytes)
      await target.importEncrypted(ref, cipher)
      const changed = Buffer.from(cipher)
      changed[0] ^= 1
      await expect(target.importEncrypted(ref, changed)).rejects.toThrow('changed')
      expect(await target.read(ref)).toEqual(bytes)
      await expect(inaccessible.readEncrypted({ ...ref, cipherSha256: '0'.repeat(64) })).rejects.toThrow('journal')
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })
  it('roundtrips binary and empty versions, freezes the input before awaited encryption and never writes the original bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'file-recovery-vault-'))
    const encryption = codec()
    const gate = Promise.withResolvers<void>()
    const vault = createFileRecoveryVault({ root: join(root, 'vault'), ...encryption, seal: async (bytes) => { await gate.promise; return encryption.seal(bytes) } })
    const original = Buffer.from('private original content\r\n\0end'.repeat(20))
    const input = Buffer.from(original)
    try {
      const pending = vault.put(id('effect'), input)
      input.fill(0)
      gate.resolve()
      const ref = await pending
      const disk = await readFile(join(root, 'vault', `${ref.id}.blob`))
      expect(disk.includes(original)).toBe(false)
      expect(await vault.read(ref)).toEqual(original)
      expect(await vault.put(ref.id, original)).toEqual(ref)
      await expect(vault.put(ref.id, Buffer.from('another before-image'))).rejects.toThrow('another before-image')
      expect(await readFile(join(root, 'vault', `${ref.id}.blob`))).toEqual(disk)
      const empty = await vault.put(id('empty'), Buffer.alloc(0))
      expect(await vault.read(empty)).toEqual(Buffer.alloc(0))
      expect((await vault.list()).files).toBe(2)
    }
    finally { gate.resolve(); await rm(root, { recursive: true, force: true }) }
  })

  it('refuses changed ciphertext, another journal binding, wrong keys and traversal without deleting the retained bytes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'file-recovery-vault-integrity-'))
    const options = { root: join(root, 'vault'), ...codec() }
    const vault = createFileRecoveryVault(options)
    try {
      const ref = await vault.put(id('first'), Buffer.from('private original'))
      const other = await vault.put(id('second'), Buffer.from('other original'))
      await expect(vault.read({ ...ref, id: other.id })).rejects.toThrow('journal')
      await expect(vault.read({ ...ref, id: '../outside' })).rejects.toThrow('contract')
      await expect(createFileRecoveryVault({ root: options.root, ...codec() }).read(ref)).rejects.toThrow()
      const path = join(options.root, `${ref.id}.blob`)
      const altered = await readFile(path)
      altered[altered.length - 1] ^= 1
      await writeFile(path, altered)
      await expect(vault.read(ref)).rejects.toThrow('journal')
      await expect(vault.remove(ref)).rejects.toThrow('changed ciphertext')
      expect(await readFile(path)).toEqual(altered)
      expect(await vault.read(other)).toEqual(Buffer.from('other original'))
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it('enforces the shared directory budget across two instances and frees only the exact reviewed ciphertext', async () => {
    const root = await mkdtemp(join(tmpdir(), 'file-recovery-vault-budget-'))
    const options = { root: join(root, 'vault'), ...codec(), maximumBytes: 100 }
    const first = createFileRecoveryVault(options)
    const second = createFileRecoveryVault(options)
    try {
      const results = await Promise.allSettled([first.put(id('first'), Buffer.alloc(40, 'a')), second.put(id('second'), Buffer.alloc(40, 'b'))])
      const accepted = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
      expect(accepted).toHaveLength(1)
      expect(results.filter(result => result.status === 'rejected')).toHaveLength(1)
      expect(await first.list()).toMatchObject({ files: 1, bytes: 68 })
      expect(await second.remove(accepted[0])).toEqual({ removed: true })
      expect(await first.remove(accepted[0])).toEqual({ removed: false })
      expect(await first.list()).toMatchObject({ files: 0, bytes: 0 })
      expect((await first.put(id('third'), Buffer.alloc(40))).cipherBytes).toBe(68)
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })

  it('rejects linked directories, linked blobs and a replaced root while preserving the outside target and earlier backup', async () => {
    const root = await mkdtemp(join(tmpdir(), 'file-recovery-vault-alias-'))
    const outside = join(root, 'outside.txt')
    const directory = join(root, 'vault')
    const options = { root: directory, ...codec() }
    const vault = createFileRecoveryVault(options)
    try {
      await writeFile(outside, 'user file outside the vault')
      const ref = await vault.put(id('effect'), Buffer.from('before'))
      const path = join(directory, `${ref.id}.blob`)
      const saved = await readFile(path)
      await unlink(path)
      await symlink(outside, path)
      await expect(vault.read(ref)).rejects.toThrow('linked')
      await expect(vault.remove(ref)).rejects.toThrow('linked')
      expect(await readFile(outside, 'utf8')).toBe('user file outside the vault')
      await unlink(path)
      await writeFile(path, saved)
      const alias = join(root, 'alias')
      await symlink(directory, alias, platform === 'win32' ? 'junction' : 'dir')
      await expect(createFileRecoveryVault({ root: alias, ...codec() }).put(id('denied'), Buffer.from('no'))).rejects.toThrow('linked directory')
      const retained = join(root, 'retained')
      await rename(directory, retained)
      await mkdir(directory)
      await expect(vault.read(ref)).rejects.toThrow('directory identity changed')
      await expect(vault.put(id('new'), Buffer.from('no'))).rejects.toThrow('directory identity changed')
      expect(await readFile(join(retained, `${ref.id}.blob`))).toEqual(saved)
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })
})
