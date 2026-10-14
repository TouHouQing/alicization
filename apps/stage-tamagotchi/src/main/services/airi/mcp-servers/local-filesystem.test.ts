import { Buffer } from 'node:buffer'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { callLocalFilesystem, inspectFilesystemWritePrecondition, resolveFilesystemTarget } from './local-filesystem'

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
