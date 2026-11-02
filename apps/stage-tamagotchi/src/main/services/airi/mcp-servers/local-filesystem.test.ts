import type { FileHandle } from 'node:fs/promises'

import { Buffer } from 'node:buffer'
import { link, mkdir, mkdtemp, open, readFile, rename, rm, stat, statfs, symlink, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { platform } from 'node:process'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createCanonicalToolRegistry, createToolRegistry, registerDiscoveredMcpCapability } from '../../alicization/turn-os/tool-registry'
import { withFileMutationQueue } from './file-mutation-queue'
import { callLocalFilesystem, inspectFilesystemWritePrecondition, LocalFilesystemOperationError, localFilesystemTools, resolveFilesystemTarget } from './local-filesystem'

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return { ...actual, open: vi.fn(actual.open), statfs: vi.fn(actual.statfs) }
})

describe('available local filesystem with real disk effects', () => {
  let workspace: string
  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'alicization-file-closure-'))
  })
  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true })
  })

  it('creates and independently reads back UTF-8 text without an external server', async () => {
    const result = await callLocalFilesystem({ toolName: 'write_file', arguments: { path: 'note.txt', content: '雨声陪伴' }, workspace })
    expect(result.ok).toBe(true)
    expect(await readFile(join(workspace, 'note.txt'), 'utf8')).toBe('雨声陪伴')
    const read = await callLocalFilesystem({ toolName: 'read_file', arguments: { path: 'note.txt' }, workspace })
    expect(read.content?.[0].text).toBe('雨声陪伴')
    expect(read.structuredContent).toMatchObject({ readVerified: true, path: await resolveFilesystemTarget(join(workspace, 'note.txt')), byteLength: 12 })
  })

  it('refuses creation and overwrite before touching files when the volume is full, while reads remain available', async () => {
    const original = join(workspace, 'keep.txt')
    await writeFile(original, 'Host-owned existing bytes')
    const approved = await inspectFilesystemWritePrecondition(original)
    const capacity = vi.mocked(statfs)
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
    capacity.mockImplementation(async () => ({ bavail: 0n, bsize: 4096n }) as never)
    try {
      await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path: 'new-folder/new.txt', content: 'Do not create' }, workspace })).rejects.toMatchObject({ code: 'EXECUTION_DISK_BUDGET_EXCEEDED', effectMayHaveOccurred: false })
      await expect(stat(join(workspace, 'new-folder'))).rejects.toMatchObject({ code: 'ENOENT' })
      await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path: original, content: 'Do not overwrite' }, workspace, writePrecondition: approved })).rejects.toMatchObject({ code: 'EXECUTION_DISK_BUDGET_EXCEEDED', effectMayHaveOccurred: false })
      expect(await readFile(original, 'utf8')).toBe('Host-owned existing bytes')
      expect((await callLocalFilesystem({ toolName: 'read_file', arguments: { path: original }, workspace })).ok).toBe(true)
    }
    finally { capacity.mockImplementation(actual.statfs) }
  })

  it('requires a current approved overwrite snapshot and rejects a change during confirmation', async () => {
    const path = join(workspace, 'note.txt')
    await writeFile(path, 'first')
    await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path, content: 'unapproved' }, workspace })).rejects.toThrow('existence changed')
    const approved = await inspectFilesystemWritePrecondition(path)
    await writeFile(path, 'changed by user')
    await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path, content: 'stale' }, workspace, writePrecondition: approved })).rejects.toThrow('changed after permission')
    expect(await readFile(path, 'utf8')).toBe('changed by user')
    const fresh = await inspectFilesystemWritePrecondition(path)
    await callLocalFilesystem({ toolName: 'write_file', arguments: { path, content: 'approved' }, workspace, writePrecondition: fresh })
    expect(await readFile(path, 'utf8')).toBe('approved')
  })

  it('serializes concurrent creation so a second call cannot overwrite the first', async () => {
    const calls = await Promise.allSettled(['first', 'second'].map(content => callLocalFilesystem({ toolName: 'write_file', arguments: { path: 'same.txt', content }, workspace })))
    expect(calls.filter(call => call.status === 'fulfilled')).toHaveLength(1)
    expect(['first', 'second']).toContain(await readFile(join(workspace, 'same.txt'), 'utf8'))
  })

  it('lists a real directory with inputs accepted by its discovered provider schema', async () => {
    const registry = createToolRegistry()
    const tool = localFilesystemTools.find(tool => tool.toolName === 'list_directory')!
    registerDiscoveredMcpCapability(registry, tool)
    const args = { path: workspace, maxEntries: 10 }
    expect(registry.validateInput(tool.name, args).valid).toBe(true)
    await writeFile(join(workspace, 'note.txt'), 'actual data')
    const result = await callLocalFilesystem({ toolName: tool.toolName, arguments: args, workspace })
    expect(result.ok).toBe(true)
    expect(JSON.stringify(result.structuredContent)).toContain('note.txt')
  })

  it('preserves one bounded filesystem contract across planning, canonical MCP and discovery', async () => {
    const registry = createCanonicalToolRegistry()
    for (const tool of localFilesystemTools) {
      const builtin = registry.resolveActive(`tool.filesystem_${tool.toolName}`)!
      const canonical = registry.resolveActive(`mcp.filesystem::${tool.toolName}`)!
      expect(canonical.inputSchema).toEqual(tool.inputSchema)
      expect(builtin.inputSchema).toEqual(tool.inputSchema)
      registerDiscoveredMcpCapability(registry, tool)
      expect(registry.resolveActive(tool.name)!.inputSchema).toEqual(tool.inputSchema)
    }
    await writeFile(join(workspace, 'bounded.txt'), '中文🙂')
    for (const operation of ['read_file', 'list_directory']) {
      const input = operation === 'read_file' ? { path: join(workspace, 'bounded.txt'), maxReturnBytes: 1000 } : { path: workspace, maxEntries: 1, maxReturnBytes: 1000 }
      expect(registry.validateInput(`tool.filesystem_${operation}`, input).valid).toBe(true)
      expect(registry.validateInput(`mcp.filesystem::${operation}`, input).valid).toBe(true)
      expect((await callLocalFilesystem({ toolName: operation, arguments: input, workspace })).ok).toBe(true)
      for (const invalid of [0, -1, 0.5, 2 * 1024 * 1024 + 1])
        expect(registry.validateInput(`mcp.filesystem::${operation}`, { ...input, maxReturnBytes: invalid }).valid).toBe(false)
    }
  })

  it('enforces the requested read budget without returning a truncated successful file', async () => {
    await writeFile(join(workspace, 'large.txt'), '中文🙂'.repeat(30))
    await expect(callLocalFilesystem({ toolName: 'read_file', arguments: { path: 'large.txt', maxReturnBytes: 100 }, workspace })).rejects.toThrow('read budget')
    expect((await callLocalFilesystem({ toolName: 'read_file', arguments: { path: 'large.txt', maxReturnBytes: 300 }, workspace })).content?.[0].text).toBe('中文🙂'.repeat(30))
  })

  it('closes the actual file handle after cancellation between native chunks and reports the partial effect', async () => {
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
    const path = join(workspace, 'partial.txt')
    await writeFile(path, 'a'.repeat(128 * 1024))
    const approved = await inspectFilesystemWritePrecondition(path)
    const controller = new AbortController()
    let writer: FileHandle | undefined
    vi.mocked(open).mockImplementation(async (...args: Parameters<typeof open>) => {
      const handle = await actual.open(...args)
      if (args[1] === 'r+') {
        writer = handle
        const write = handle.write.bind(handle) as (...input: unknown[]) => Promise<{ bytesWritten: number, buffer: unknown }>
        vi.spyOn(handle, 'write').mockImplementation((async (...input: unknown[]) => {
          const result = await write(...input)
          controller.abort(new Error('host-stopped-after-first-native-chunk'))
          return result
        }) as FileHandle['write'])
      }
      return handle
    })
    try {
      const failure = await callLocalFilesystem({ toolName: 'write_file', arguments: { path, content: 'b'.repeat(128 * 1024) }, workspace, writePrecondition: approved, signal: controller.signal }).then(() => null, error => error)
      expect(failure).toBeInstanceOf(LocalFilesystemOperationError)
      expect(failure).toMatchObject({ effectMayHaveOccurred: true })
      expect(writer).toBeDefined()
      await expect(writer!.stat()).rejects.toThrow()
      const bytes = await readFile(path, 'utf8')
      expect(bytes.slice(0, 64 * 1024)).toBe('b'.repeat(64 * 1024))
      expect(bytes.slice(64 * 1024)).toBe('a'.repeat(64 * 1024))
    }
    finally {
      vi.mocked(open).mockImplementation(actual.open)
    }
  })

  it('does not recreate a removed parent while preparing an existing-file overwrite', async () => {
    const parent = join(workspace, 'approved-parent')
    const moved = join(workspace, 'host-moved-parent')
    await mkdir(parent)
    const path = join(parent, 'existing.txt')
    await writeFile(path, 'host original')
    const approved = await inspectFilesystemWritePrecondition(path)
    const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises')
    let movedByHost = false
    vi.mocked(statfs).mockImplementation(async (...args: Parameters<typeof statfs>) => {
      const capacity = await actual.statfs(...args)
      if (!movedByHost) {
        await rename(parent, moved)
        movedByHost = true
      }
      return capacity
    })
    try {
      await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path, content: 'must not write' }, workspace, writePrecondition: approved })).rejects.toThrow()
      expect(movedByHost).toBe(true)
      await expect(stat(parent)).rejects.toMatchObject({ code: 'ENOENT' })
      expect(await readFile(join(moved, 'existing.txt'), 'utf8')).toBe('host original')
    }
    finally { vi.mocked(statfs).mockImplementation(actual.statfs) }
  })

  it('rejects a directory link redirected after approval, including a replacement with identical bytes', async () => {
    const original = join(workspace, 'original')
    const replacement = join(workspace, 'replacement')
    const alias = join(workspace, 'alias')
    await mkdir(original)
    await mkdir(replacement)
    await writeFile(join(original, 'note.txt'), 'same')
    await writeFile(join(replacement, 'note.txt'), 'same')
    await symlink(original, alias, platform === 'win32' ? 'junction' : 'dir')
    const path = join(alias, 'note.txt')
    const approved = await inspectFilesystemWritePrecondition(path)
    await unlink(alias)
    await symlink(replacement, alias, platform === 'win32' ? 'junction' : 'dir')
    await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path, content: 'must not write' }, workspace, writePrecondition: approved })).rejects.toThrow('target changed')
    await expect(callLocalFilesystem({ toolName: 'read_file', arguments: { path }, workspace, approvedTarget: approved.canonicalPath })).rejects.toThrow('target changed')
    expect(await readFile(join(original, 'note.txt'), 'utf8')).toBe('same')
    expect(await readFile(join(replacement, 'note.txt'), 'utf8')).toBe('same')
  })

  it('rejects replacement of the approved file identity even when its contents remain equal', async () => {
    const path = join(workspace, 'note.txt')
    await writeFile(path, 'same')
    const approved = await inspectFilesystemWritePrecondition(path)
    await rename(path, join(workspace, 'previous.txt'))
    await writeFile(path, 'same')
    await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path, content: 'must not write' }, workspace, writePrecondition: approved })).rejects.toThrow('changed after permission')
    expect(await readFile(path, 'utf8')).toBe('same')
  })

  it('serializes a hard-link alias with its actual writer rather than just the lexical name', async () => {
    const path = join(workspace, 'first.txt')
    const alias = join(workspace, 'second.txt')
    await writeFile(path, 'original')
    await link(path, alias)
    let release!: () => void
    const ready = new Promise<void>((resolve) => {
      release = resolve
    })
    const secondEntered = vi.fn()
    let entered!: () => void
    const firstEntered = new Promise<void>((resolve) => {
      entered = resolve
    })
    const first = withFileMutationQueue(path, async () => {
      entered()
      await ready
      await writeFile(path, 'first finished')
    })
    await firstEntered
    const second = withFileMutationQueue(alias, async () => {
      secondEntered()
      expect(await readFile(alias, 'utf8')).toBe('first finished')
    })
    try {
      await new Promise<void>(resolve => setTimeout(resolve, 20))
      expect(secondEntered).not.toHaveBeenCalled()
    }
    finally { release() }
    await Promise.all([first, second])
    expect(secondEntered).toHaveBeenCalledOnce()
  })

  it('cancels before dispatch and never creates the destination', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path: 'cancelled.txt', content: 'no' }, workspace, signal: controller.signal })).rejects.toThrow()
    await expect(readFile(join(workspace, 'cancelled.txt'))).rejects.toThrow()
  })

  it('bounds payloads and resolves non-existing ancestor paths without losing path segments', async () => {
    expect(await resolveFilesystemTarget(join(workspace, 'new', 'path', 'note.txt'))).toBe(join(await resolveFilesystemTarget(workspace), 'new', 'path', 'note.txt'))
    await expect(callLocalFilesystem({ toolName: 'write_file', arguments: { path: 'large.txt', content: 'a'.repeat(2 * 1024 * 1024 + 1) }, workspace })).rejects.toThrow('exceeds')
    await writeFile(join(workspace, 'binary.txt'), Buffer.from([0, 1, 2]))
    await expect(callLocalFilesystem({ toolName: 'read_file', arguments: { path: 'binary.txt' }, workspace })).rejects.toThrow('binary')
    await writeFile(join(workspace, 'invalid-utf8.txt'), Buffer.from([0xFF, 0xFE]))
    await expect(callLocalFilesystem({ toolName: 'read_file', arguments: { path: 'invalid-utf8.txt' }, workspace })).rejects.toThrow('UTF-8')
  })
})
