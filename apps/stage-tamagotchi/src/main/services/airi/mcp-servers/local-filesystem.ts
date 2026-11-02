import type { FileHandle } from 'node:fs/promises'

import type { ElectronMcpCallToolResult, ElectronMcpToolDescriptor } from '../../../../shared/eventa'
import type { FileMutationSnapshot } from '../../alicization/execution/file-mutation-recovery'
import type { LocalSearchInput } from './local-search'

import process from 'node:process'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, open, realpath, stat } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'

import { errorMessageFrom } from '@moeru/std'

import { assertActionDispatchOperation, markActionNotStartedError } from '../../alicization/execution/action-dispatch-context'
import { assertExecutionStorageCapacity } from '../../alicization/execution/storage-budget'
import { withFileMutationQueue } from './file-mutation-queue'
import { readLocalDirectory } from './local-directory'
import { localFilesystemInputSchemas, localFilesystemMaximumBytes as maximumBytes } from './local-filesystem-schema'
import { readLocalSearch } from './local-search'

async function readBoundedFile(handle: FileHandle, signal?: AbortSignal, limit = maximumBytes) {
  const chunks: Buffer[] = []
  const buffer = Buffer.alloc(64 * 1024)
  let position = 0
  while (position <= limit) {
    signal?.throwIfAborted()
    const { bytesRead } = await handle.read(buffer, 0, Math.min(buffer.length, limit + 1 - position), position)
    if (!bytesRead)
      break
    chunks.push(Buffer.from(buffer.subarray(0, bytesRead)))
    position += bytesRead
  }
  if (position > limit)
    throw new Error('Local file exceeds the read budget.')
  return Buffer.concat(chunks)
}

export type LocalFilesystemWritePrecondition = { canonicalPath: string } & ({ exists: false } | { exists: true, contentHash: string, device: string, inode: string })

export class LocalFilesystemOperationError extends Error {
  constructor(readonly effectMayHaveOccurred: boolean, cause: unknown) {
    super(errorMessageFrom(cause) ?? 'Local filesystem operation failed', { cause })
  }
}

export async function inspectFilesystemWritePrecondition(path: string): Promise<LocalFilesystemWritePrecondition> {
  const canonicalPath = await resolveFilesystemTarget(path)
  if (await isNewFilesystemTarget(canonicalPath))
    return { exists: false, canonicalPath }
  const handle = await open(canonicalPath, 'r')
  try {
    const info = await handle.stat({ bigint: true })
    if (!info.isFile() || info.size > BigInt(maximumBytes))
      throw new Error('Local file must be a regular file of at most 2 MiB.')
    const contentHash = createHash('sha256').update(await readBoundedFile(handle)).digest('hex')
    if (await resolveFilesystemTarget(path) !== canonicalPath)
      throw new Error('Local file target changed during permission evaluation.')
    return { exists: true, canonicalPath, device: String(info.dev), inode: String(info.ino), contentHash }
  }
  finally {
    await handle.close()
  }
}

export const localFilesystemTools: ElectronMcpToolDescriptor[] = (['read_file', 'write_file', 'list_directory', ...(process.platform === 'win32' && process.arch === 'x64' ? ['search_files' as const] : [])] as const).map(toolName => ({
  serverName: 'filesystem',
  name: `filesystem::${toolName}`,
  toolName,
  description: toolName === 'search_files' ? 'Search local text files up to 2 MiB and 9 levels for literal text or Rust regex. Respects ignore rules, excludes nested links and .git internals, and returns matching line previews with canonical targets. This bounded search is not a complete inventory or full file read.' : toolName === 'list_directory' ? 'List bounded local directory metadata. Nested links are not traversed. A truncated listing is not a complete inventory.' : toolName === 'read_file' ? 'Read a bounded local UTF-8 file.' : 'Create or update a bounded local UTF-8 file, subject to scope and overwrite policy.',
  inputSchema: localFilesystemInputSchemas[toolName],
}))

// Resolve existing ancestors too: a missing destination under a symlink must not
// inherit the lexical directory's permission.
export async function resolveFilesystemTarget(path: string): Promise<string> {
  const absolute = resolve(path)
  try {
    return await realpath(absolute)
  }
  catch (error) {
    if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ENOENT')
      throw error
    const parent = dirname(absolute)
    if (parent === absolute)
      throw error
    return resolve(await resolveFilesystemTarget(parent), basename(absolute))
  }
}

export async function isNewFilesystemTarget(path: string) {
  try {
    await stat(path)
    return false
  }
  catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')
      return true
    throw error
  }
}

export async function callLocalFilesystem(input: {
  toolName: string
  arguments: Record<string, unknown>
  workspace: string
  signal?: AbortSignal
  writePrecondition?: LocalFilesystemWritePrecondition
  approvedTarget?: string
  searchRuntime?: { executable: string, processJobsRoot?: string }
}): Promise<ElectronMcpCallToolResult> {
  const startedAt = Date.now()
  const args = structuredClone(input.arguments)
  const toolName = input.toolName
  const assertDispatch = (target = true) => assertActionDispatchOperation([`tool.filesystem_${toolName}`, `mcp.filesystem::${toolName}`], args, target)
  const path = resolve(input.workspace, String(args.path))
  const checkAbort = () => input.signal?.throwIfAborted()
  checkAbort()
  const canonicalPath = await resolveFilesystemTarget(path)
  if (input.approvedTarget && canonicalPath !== input.approvedTarget)
    throw new Error('Local file target changed after permission evaluation.')
  const precondition = structuredClone<LocalFilesystemWritePrecondition>(input.writePrecondition ?? { exists: false, canonicalPath })
  let writeStarted = false
  const run = async () => {
    checkAbort()
    await assertDispatch()
    if (toolName === 'search_files') {
      if (!input.searchRuntime)
        throw new Error('Verified local search runtime is unavailable')
      const result = await readLocalSearch({ ...args, path } as LocalSearchInput, { ...input.searchRuntime, signal: input.signal, assertAuthorized: () => assertDispatch() })
      return { text: JSON.stringify(result), structuredContent: result }
    }
    if (toolName === 'list_directory') {
      const result = await readLocalDirectory({ path, recursive: args.recursive === true, maxEntries: Number(args.maxEntries) || undefined, maxReturnBytes: Number(args.maxReturnBytes) || undefined, signal: input.signal })
      return { text: JSON.stringify(result), structuredContent: result }
    }
    if (toolName === 'read_file') {
      const limit = args.maxReturnBytes ?? maximumBytes
      if (typeof limit !== 'number' || !Number.isSafeInteger(limit) || limit < 1 || limit > maximumBytes)
        throw new Error('Invalid local file read budget.')
      const info = await stat(path)
      if (!info.isFile() || info.size > limit)
        throw new Error('Local file must be a regular file within the read budget.')
      const canonicalPath = await realpath(path)
      const handle = await open(canonicalPath, 'r')
      let bytes: Buffer
      let identity: { dev: bigint, ino: bigint }
      try {
        bytes = await readBoundedFile(handle, input.signal, limit)
        identity = await handle.stat({ bigint: true })
      }
      finally {
        await handle.close()
      }
      if (bytes.length > limit || bytes.includes(0))
        throw new Error('Local file exceeds the text limit or contains binary data.')
      checkAbort()
      const text = bytes.toString('utf8')
      if (!Buffer.from(text, 'utf8').equals(bytes))
        throw new Error('Local file must contain valid UTF-8 text.')
      if (await realpath(path) !== canonicalPath)
        throw new Error('Local file target changed during the read.')
      return { text, structuredContent: { readVerified: true, path: canonicalPath, byteLength: bytes.length, contentHash: createHash('sha256').update(bytes).digest('hex'), device: String(identity.dev), inode: String(identity.ino) } }
    }
    const content = String(args.content)
    if (Buffer.byteLength(content, 'utf8') > maximumBytes)
      throw new Error('Local text write exceeds 2 MiB.')
    const isNew = await isNewFilesystemTarget(path)
    if (await resolveFilesystemTarget(path) !== precondition.canonicalPath)
      throw new Error('File target changed after permission evaluation; write was not performed.')
    if (precondition.exists === isNew)
      throw new Error('File existence changed after permission evaluation; write was not performed.')
    if (precondition.exists) {
      const current = await inspectFilesystemWritePrecondition(path)
      if (!current.exists || current.contentHash !== precondition.contentHash || current.device !== precondition.device || current.inode !== precondition.inode)
        throw new Error('File changed after permission evaluation; write was not performed.')
    }
    checkAbort()
    if (typeof args.expectedHash === 'string' && isNew)
      throw new Error('File changed since the last read; write was not performed.')
    await assertExecutionStorageCapacity(precondition.canonicalPath, Buffer.byteLength(content, 'utf8'))
    checkAbort()
    const recovery = (await assertDispatch())?.fileRecovery
    let version = isNew && recovery ? await recovery.begin({ path: precondition.canonicalPath, existed: false, device: null, inode: null, bytes: Buffer.alloc(0) }) : undefined
    checkAbort()
    await assertDispatch()
    if (isNew) {
      // Directory/file creation can change the host before the first content
      // chunk. Opening an existing file and backing it up cannot.
      writeStarted = true
      await mkdir(dirname(precondition.canonicalPath), { recursive: true })
    }
    checkAbort()
    if (await resolveFilesystemTarget(path) !== precondition.canonicalPath)
      throw new Error('File target changed before opening the write handle.')
    await assertDispatch()
    // Never truncate before checking the opened file's approved identity. All
    // chunks use this one handle, so a later link change cannot redirect them.
    const handle = await open(precondition.canonicalPath, isNew ? 'wx+' : 'r+')
    let observed: FileMutationSnapshot | undefined
    try {
      const info = await handle.stat({ bigint: true })
      if (!info.isFile() || (precondition.exists && (String(info.dev) !== precondition.device || String(info.ino) !== precondition.inode)))
        throw new Error('Opened file no longer matches the approved identity.')
      if (precondition.exists) {
        const originalBytes = await readBoundedFile(handle, input.signal)
        const actualHash = createHash('sha256').update(originalBytes).digest('hex')
        if (actualHash !== precondition.contentHash || (typeof args.expectedHash === 'string' && actualHash !== args.expectedHash))
          throw new Error('Opened file content changed after permission evaluation.')
        if (recovery) {
          version = await recovery.begin({ path: precondition.canonicalPath, existed: true, device: String(info.dev), inode: String(info.ino), bytes: originalBytes })
          checkAbort()
          await assertDispatch(false)
          const current = await handle.stat({ bigint: true })
          const entry = await stat(precondition.canonicalPath, { bigint: true })
          if (current.mtimeNs !== info.mtimeNs || current.ctimeNs !== info.ctimeNs || entry.dev !== info.dev || entry.ino !== info.ino || !(await readBoundedFile(handle, input.signal)).equals(originalBytes) || await resolveFilesystemTarget(path) !== precondition.canonicalPath)
            throw new Error('File changed while its original version was being saved.')
        }
      }
      checkAbort()
      const bytes = Buffer.from(content, 'utf8')
      let position = 0
      while (position < bytes.length) {
        checkAbort()
        // Recheck authority using the already verified, owned file handle.
        await assertDispatch(false)
        writeStarted = true
        const { bytesWritten } = await handle.write(bytes, position, Math.min(64 * 1024, bytes.length - position), position)
        if (!bytesWritten)
          throw new Error('File write made no progress.')
        position += bytesWritten
      }
      checkAbort()
      await assertDispatch(false)
      writeStarted = true
      await handle.truncate(bytes.length)
      await handle.sync()
      if (!(await readBoundedFile(handle, input.signal)).equals(bytes))
        throw new Error('File verification did not match the requested content.')
      const written = await handle.stat({ bigint: true })
      observed = { path: precondition.canonicalPath, existed: true, device: String(written.dev), inode: String(written.ino), bytes }
    }
    finally {
      await handle.close()
    }
    if (await resolveFilesystemTarget(path) !== precondition.canonicalPath)
      throw new Error('File target changed after writing; its current state needs verification.')
    const entry = await stat(precondition.canonicalPath, { bigint: true })
    if (!observed || String(entry.dev) !== observed.device || String(entry.ino) !== observed.inode)
      throw new Error('File identity changed after closing its write handle.')
    await version?.complete(observed)
    const actual = Buffer.from(content, 'utf8')
    checkAbort()
    const structuredContent = { status: 'completed', path, byteLength: actual.length, contentHash: createHash('sha256').update(actual).digest('hex'), verified: true }
    return { text: JSON.stringify(structuredContent), structuredContent }
  }
  if (!['read_file', 'write_file', 'list_directory', 'search_files'].includes(toolName))
    throw new Error('Unknown local filesystem operation.')
  let result: Awaited<ReturnType<typeof run>>
  try {
    result = toolName === 'write_file' ? await withFileMutationQueue(path, run) : await run()
  }
  catch (error) {
    if (writeStarted)
      throw new LocalFilesystemOperationError(true, error)
    if (toolName === 'write_file')
      throw markActionNotStartedError(error)
    throw error
  }
  return { ok: true, isError: false, content: [{ type: 'text', text: result.text }], structuredContent: result.structuredContent, durationMs: Date.now() - startedAt }
}
