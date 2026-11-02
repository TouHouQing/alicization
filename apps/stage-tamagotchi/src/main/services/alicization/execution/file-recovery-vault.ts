import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { lstat, mkdir, open, readdir, realpath, unlink } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'

import { withFileMutationQueue } from '../../airi/mcp-servers/file-mutation-queue'
import { assertExecutionStorageCapacity } from './storage-budget'

const maximumPlainBytes = 2 * 1024 * 1024
const maximumCipherBytes = 3 * 1024 * 1024
const maximumVaultBytes = 64 * 1024 * 1024
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')
const validId = (id: string) => /^[a-f\d]{64}$/u.test(id)

export interface FileRecoveryBlob {
  kind: 'file-recovery-blob-v1'
  id: string
  bytes: number
  sha256: string
  cipherBytes: number
  cipherSha256: string
}

/** Private ciphertext artifacts; their life-journal references own all authority. */
export function createFileRecoveryVault(options: {
  root: string
  seal: (bytes: Uint8Array) => Uint8Array | Promise<Uint8Array>
  unseal: (bytes: Uint8Array) => Uint8Array | Promise<Uint8Array>
  maximumBytes?: number
}) {
  if (!isAbsolute(options.root) || dirname(resolve(options.root)) === resolve(options.root))
    throw new Error('File recovery needs its own absolute vault directory')
  const budget = options.maximumBytes ?? maximumVaultBytes
  if (!Number.isSafeInteger(budget) || budget < 1 || budget > maximumVaultBytes)
    throw new Error('File recovery vault exceeded its storage policy')
  let root = resolve(options.root)
  let rootIdentity = ''
  let prepared: Promise<string> | undefined
  const identity = (info: { dev: bigint, ino: bigint }) => `${info.dev}:${info.ino}`
  const missing = (error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT')
      return null
    throw error
  }
  function prepare() {
    return prepared ??= (async () => {
      const expected = join(await realpath(dirname(root)), basename(root))
      const existing = await lstat(expected).catch(missing)
      if (existing && (!existing.isDirectory() || existing.isSymbolicLink()))
        throw new Error('File recovery vault cannot follow a linked directory')
      if (!existing) {
        await mkdir(expected, { mode: 0o700 }).catch((error: NodeJS.ErrnoException) => {
          if (error.code !== 'EEXIST')
            throw error
        })
      }
      const info = await lstat(expected, { bigint: true })
      if (!info.isDirectory() || info.isSymbolicLink() || await realpath(expected) !== expected)
        throw new Error('File recovery vault directory changed during preparation')
      root = expected
      rootIdentity = identity(info)
      return root
    })().catch((error) => {
      // Storage may recover after startup. Once admitted, directory identity
      // remains pinned and later read/write failures do not reset preparation.
      prepared = undefined
      throw error
    })
  }
  async function assertRoot() {
    const info = await lstat(root, { bigint: true })
    if (!info.isDirectory() || info.isSymbolicLink() || identity(info) !== rootIdentity || await realpath(root) !== root)
      throw new Error('File recovery vault directory identity changed')
  }
  function target(id: string) {
    if (!validId(id))
      throw new Error('File recovery blob identity is invalid')
    return join(root, `${id}.blob`)
  }
  async function readCipher(path: string, allowEmpty = false) {
    const link = await lstat(path)
    if (!link.isFile() || link.isSymbolicLink())
      throw new Error('File recovery cannot read a linked or non-file blob')
    const handle = await open(path, 'r')
    try {
      const before = await handle.stat({ bigint: true })
      if (!before.isFile() || before.size < (allowEmpty ? 0n : 1n) || before.size > BigInt(maximumCipherBytes))
        throw new Error('File recovery ciphertext exceeded its byte budget')
      const bytes = Buffer.alloc(Number(before.size))
      let position = 0
      while (position < bytes.length) {
        const read = await handle.read(bytes, position, Math.min(65536, bytes.length - position), position)
        if (!read.bytesRead)
          throw new Error('File recovery ciphertext changed during readback')
        position += read.bytesRead
      }
      const extra = await handle.read(Buffer.alloc(1), 0, 1, position)
      const after = await handle.stat({ bigint: true })
      const current = await lstat(path, { bigint: true })
      if (extra.bytesRead || identity(before) !== identity(after) || identity(before) !== identity(current) || current.isSymbolicLink() || before.size !== after.size || before.mtimeNs !== after.mtimeNs || before.ctimeNs !== after.ctimeNs)
        throw new Error('File recovery ciphertext changed during readback')
      return { bytes, identity: identity(before), modifiedNs: String(before.mtimeNs), modifiedAt: Number(before.mtimeMs) }
    }
    finally { await handle.close() }
  }
  async function scan() {
    await assertRoot()
    const files = await readdir(root)
    if (files.length > 4096)
      throw new Error('File recovery vault exceeded its file budget')
    let bytes = 0
    const blobs = []
    for (const name of files.sort()) {
      const info = await lstat(join(root, name))
      if (!info.isFile() || info.isSymbolicLink())
        throw new Error('File recovery vault contains a linked or non-file entry')
      bytes += info.size
      if (bytes > budget)
        throw new Error('File recovery vault exceeded its byte budget')
      if (/^[a-f\d]{64}\.blob$/u.test(name))
        blobs.push({ id: name.slice(0, -5), bytes: info.size, modifiedAt: info.mtimeMs })
    }
    return { bytes, files: files.length, blobs }
  }
  const reference = (id: string, plain: Uint8Array, cipher: Uint8Array): FileRecoveryBlob => Object.freeze({ kind: 'file-recovery-blob-v1', id, bytes: plain.byteLength, sha256: digest(plain), cipherBytes: cipher.byteLength, cipherSha256: digest(cipher) })
  function validate(ref: FileRecoveryBlob) {
    if (ref.kind !== 'file-recovery-blob-v1' || !validId(ref.id) || !validId(ref.sha256) || !validId(ref.cipherSha256) || !Number.isSafeInteger(ref.bytes) || ref.bytes < 0 || ref.bytes > maximumPlainBytes || !Number.isSafeInteger(ref.cipherBytes) || ref.cipherBytes < 1 || ref.cipherBytes > maximumCipherBytes)
      throw new Error('File recovery reference exceeded its bounded contract')
  }
  async function put(id: string, input: Uint8Array) {
    // Callers cannot change the approved before-image during encryption or I/O.
    const plain = Buffer.from(input)
    if (!validId(id) || plain.length > maximumPlainBytes)
      throw new Error('File recovery before-image exceeded its byte budget')
    await prepare()
    return withFileMutationQueue(root, async () => {
      await assertRoot()
      const path = target(id)
      if (await lstat(path).catch(missing)) {
        const stored = await readCipher(path)
        const restored = Buffer.from(await options.unseal(Buffer.from(stored.bytes)))
        if (!restored.equals(plain))
          throw new Error('File recovery identity already holds another before-image')
        await assertRoot()
        return reference(id, plain, stored.bytes)
      }
      const cipher = Buffer.from(await options.seal(Buffer.from(plain)))
      if (!cipher.length || cipher.length > maximumCipherBytes)
        throw new Error('File recovery ciphertext exceeded its byte budget')
      const storage = await scan()
      if (storage.bytes + cipher.length > budget || storage.files >= 4096)
        throw new Error('File recovery vault has no capacity for this before-image')
      await assertExecutionStorageCapacity(root, cipher.length)
      await assertRoot()
      const handle = await open(path, 'wx', 0o600)
      try { await handle.writeFile(cipher); await handle.sync() }
      finally { await handle.close() }
      // An interrupted pre-journal blob is an orphan, never write permission.
      // Retention removes it only after the journal proves it is unreferenced.
      await assertRoot()
      const stored = await readCipher(path)
      if (!stored.bytes.equals(cipher))
        throw new Error('File recovery ciphertext failed its stable readback')
      return reference(id, plain, cipher)
    })
  }
  async function read(raw: FileRecoveryBlob) {
    const ref = Object.freeze({ ...raw })
    validate(ref)
    await prepare()
    return withFileMutationQueue(root, async () => {
      await assertRoot()
      const cipher = await readCipher(target(ref.id))
      if (cipher.bytes.length !== ref.cipherBytes || digest(cipher.bytes) !== ref.cipherSha256)
        throw new Error('File recovery ciphertext no longer matches its journal')
      const plain = Buffer.from(await options.unseal(Buffer.from(cipher.bytes)))
      if (plain.length !== ref.bytes || digest(plain) !== ref.sha256)
        throw new Error('File recovery before-image no longer matches its journal')
      await assertRoot()
      return plain
    })
  }
  async function readEncrypted(raw: FileRecoveryBlob) {
    const ref = Object.freeze({ ...raw })
    validate(ref)
    await prepare()
    return withFileMutationQueue(root, async () => {
      await assertRoot()
      const cipher = await readCipher(target(ref.id))
      if (cipher.bytes.length !== ref.cipherBytes || digest(cipher.bytes) !== ref.cipherSha256)
        throw new Error('File recovery ciphertext no longer matches its journal')
      await assertRoot()
      return cipher.bytes
    })
  }
  async function importEncrypted(raw: FileRecoveryBlob, input: Uint8Array) {
    const ref = Object.freeze({ ...raw })
    const bytes = Buffer.from(input)
    validate(ref)
    if (bytes.length !== ref.cipherBytes || digest(bytes) !== ref.cipherSha256)
      throw new Error('Imported file recovery ciphertext changed')
    await prepare()
    return withFileMutationQueue(root, async () => {
      await assertRoot()
      const path = target(ref.id)
      if (!await lstat(path).catch(missing)) {
        const storage = await scan()
        if (storage.bytes + bytes.length > budget || storage.files >= 4096)
          throw new Error('File recovery vault has no capacity for imported artifacts')
        await assertExecutionStorageCapacity(root, bytes.length)
        await assertRoot()
        const handle = await open(path, 'wx', 0o600)
        try { await handle.writeFile(bytes); await handle.sync() }
        finally { await handle.close() }
      }
      const stored = await readCipher(path)
      if (!stored.bytes.equals(bytes))
        throw new Error('Imported file recovery identity holds different ciphertext')
      await assertRoot()
    })
  }
  async function remove(raw: FileRecoveryBlob) {
    const ref = Object.freeze({ ...raw })
    validate(ref)
    await prepare()
    return withFileMutationQueue(root, async () => {
      await assertRoot()
      const path = target(ref.id)
      if (!await lstat(path).catch(missing))
        return { removed: false }
      const cipher = await readCipher(path)
      if (cipher.bytes.length !== ref.cipherBytes || digest(cipher.bytes) !== ref.cipherSha256)
        throw new Error('File recovery cannot delete a changed ciphertext version')
      await assertRoot()
      const current = await lstat(path, { bigint: true })
      if (current.isSymbolicLink() || identity(current) !== cipher.identity)
        throw new Error('File recovery ciphertext identity changed before cleanup')
      await unlink(path)
      return { removed: true }
    })
  }
  async function list() {
    await prepare()
    return withFileMutationQueue(root, scan)
  }
  async function inspectOrphan(id: string, olderThan: number) {
    await prepare()
    return withFileMutationQueue(root, async () => {
      await assertRoot()
      const stored = await readCipher(target(id), true)
      if (!Number.isSafeInteger(olderThan) || stored.modifiedAt > olderThan)
        return null
      await assertRoot()
      return Object.freeze({ id, bytes: stored.bytes.length, sha256: digest(stored.bytes), identity: stored.identity, modifiedNs: stored.modifiedNs })
    })
  }
  async function removeOrphan(raw: NonNullable<Awaited<ReturnType<typeof inspectOrphan>>>) {
    const snapshot = Object.freeze({ ...raw })
    if (!validId(snapshot.id) || !validId(snapshot.sha256) || !/^\d+:\d+$/u.test(snapshot.identity) || !/^\d+$/u.test(snapshot.modifiedNs) || !Number.isSafeInteger(snapshot.bytes) || snapshot.bytes < 0 || snapshot.bytes > maximumCipherBytes)
      throw new Error('File recovery orphan cleanup has no bounded snapshot')
    await prepare()
    return withFileMutationQueue(root, async () => {
      await assertRoot()
      const path = target(snapshot.id)
      if (!await lstat(path).catch(missing))
        return { removed: false }
      const stored = await readCipher(path, true)
      if (stored.identity !== snapshot.identity || stored.modifiedNs !== snapshot.modifiedNs || stored.bytes.length !== snapshot.bytes || digest(stored.bytes) !== snapshot.sha256)
        throw new Error('File recovery orphan changed before cleanup')
      await assertRoot()
      const current = await lstat(path, { bigint: true })
      if (current.isSymbolicLink() || identity(current) !== snapshot.identity || String(current.mtimeNs) !== snapshot.modifiedNs)
        throw new Error('File recovery orphan identity changed before cleanup')
      await unlink(path)
      return { removed: true }
    })
  }
  return { put, read, readEncrypted, importEncrypted, remove, list, inspectOrphan, removeOrphan }
}
