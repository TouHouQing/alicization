import type { ElectronMcpCallToolResult, ElectronMcpToolDescriptor } from '../../../../shared/eventa'

import { Buffer } from 'node:buffer'
import { createHash } from 'node:crypto'
import { mkdir, readFile, realpath, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'

import { withFileMutationQueue } from './file-mutation-queue'

const maximumBytes = 2 * 1024 * 1024

export type LocalFilesystemWritePrecondition = { exists: false } | { exists: true, contentHash: string }

export async function inspectFilesystemWritePrecondition(path: string): Promise<LocalFilesystemWritePrecondition> {
  if (await isNewFilesystemTarget(path))
    return { exists: false }
  const info = await stat(path)
  if (!info.isFile() || info.size > maximumBytes)
    throw new Error('Local file must be a regular file of at most 2 MiB.')
  return { exists: true, contentHash: createHash('sha256').update(await readFile(path)).digest('hex') }
}

export const localFilesystemTools: ElectronMcpToolDescriptor[] = ['read_file', 'write_file'].map(toolName => ({
  serverName: 'filesystem',
  name: `filesystem::${toolName}`,
  toolName,
  description: toolName === 'read_file' ? 'Read a bounded local UTF-8 file.' : 'Create or update a bounded local UTF-8 file, subject to scope and overwrite policy.',
  inputSchema: {
    type: 'object',
    additionalProperties: false,
    required: toolName === 'read_file' ? ['path'] : ['path', 'content'],
    properties: {
      path: { type: 'string', minLength: 1 },
      ...(toolName === 'write_file' ? { content: { type: 'string', maxLength: maximumBytes }, expectedHash: { type: 'string' } } : {}),
    },
  },
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
}): Promise<ElectronMcpCallToolResult> {
  const startedAt = Date.now()
  const path = resolve(input.workspace, String(input.arguments.path))
  const checkAbort = () => input.signal?.throwIfAborted()
  checkAbort()
  const run = async () => {
    checkAbort()
    if (input.toolName === 'read_file') {
      const info = await stat(path)
      if (!info.isFile() || info.size > maximumBytes)
        throw new Error('Local file must be a regular file of at most 2 MiB.')
      const canonicalPath = await realpath(path)
      const bytes = await readFile(canonicalPath, { signal: input.signal })
      if (bytes.length > maximumBytes || bytes.includes(0))
        throw new Error('Local file exceeds the text limit or contains binary data.')
      checkAbort()
      const text = bytes.toString('utf8')
      if (!Buffer.from(text, 'utf8').equals(bytes))
        throw new Error('Local file must contain valid UTF-8 text.')
      if (await realpath(path) !== canonicalPath)
        throw new Error('Local file target changed during the read.')
      return { text, structuredContent: { readVerified: true, path: canonicalPath, byteLength: bytes.length, contentHash: createHash('sha256').update(bytes).digest('hex') } }
    }
    const content = String(input.arguments.content)
    if (Buffer.byteLength(content, 'utf8') > maximumBytes)
      throw new Error('Local text write exceeds 2 MiB.')
    const isNew = await isNewFilesystemTarget(path)
    const precondition = input.writePrecondition ?? { exists: false }
    if (precondition.exists === isNew)
      throw new Error('File existence changed after permission evaluation; write was not performed.')
    if (precondition.exists) {
      const current = await inspectFilesystemWritePrecondition(path)
      if (!current.exists || current.contentHash !== precondition.contentHash)
        throw new Error('File changed after permission evaluation; write was not performed.')
    }
    const expectedHash = input.arguments.expectedHash
    if (typeof expectedHash === 'string') {
      const actualHash = createHash('sha256').update(await readFile(path)).digest('hex')
      if (actualHash !== expectedHash)
        throw new Error('File changed since the last read; write was not performed.')
    }
    checkAbort()
    await mkdir(dirname(path), { recursive: true })
    checkAbort()
    // Exclusive creation prevents a newly created target from turning into an
    // unapproved overwrite while waiting for the mutation queue.
    await writeFile(path, content, { encoding: 'utf8', flag: isNew ? 'wx' : 'w', signal: input.signal })
    const actual = await readFile(path)
    if (!actual.equals(Buffer.from(content, 'utf8')))
      throw new Error('File verification did not match the requested content.')
    checkAbort()
    const structuredContent = { status: 'completed', path, byteLength: actual.length, contentHash: createHash('sha256').update(actual).digest('hex'), verified: true }
    return { text: JSON.stringify(structuredContent), structuredContent }
  }
  if (!['read_file', 'write_file'].includes(input.toolName))
    throw new Error('Unknown local filesystem operation.')
  const result = input.toolName === 'write_file' ? await withFileMutationQueue(path, run) : await run()
  return { ok: true, isError: false, content: [{ type: 'text', text: result.text }], structuredContent: result.structuredContent, durationMs: Date.now() - startedAt }
}
