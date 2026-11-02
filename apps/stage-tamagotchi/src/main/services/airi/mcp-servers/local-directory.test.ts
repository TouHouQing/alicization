import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { callLocalFilesystem, localFilesystemTools } from './local-filesystem'

describe('ordinary local directory discovery', () => {
  it('lists actual metadata, bounds large results, refuses nested links and honors cancellation', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-directory-'))
    try {
      const workspace = join(root, 'workspace')
      const external = join(root, 'external')
      await mkdir(workspace)
      await mkdir(external)
      await writeFile(join(external, 'private.txt'), 'must not traverse')
      await mkdir(join(workspace, 'notes'))
      await writeFile(join(workspace, 'notes', 'report.txt'), 'synthetic')
      await symlink(external, join(workspace, 'outside'), 'junction')
      const result = await callLocalFilesystem({ toolName: 'list_directory', workspace, arguments: { path: workspace, recursive: true } })
      const parsed = JSON.parse(String(result.content![0].text))
      expect(parsed.entries.some((entry: { name: string }) => entry.name.endsWith('report.txt'))).toBe(true)
      expect(parsed.entries.some((entry: { name: string }) => entry.name.endsWith('private.txt'))).toBe(false)
      expect(parsed.entries.find((entry: { name: string }) => entry.name === 'outside')?.type).toBe('link')
      expect(parsed.truncated).toBe(false)
      const limited = await callLocalFilesystem({ toolName: 'list_directory', workspace, arguments: { path: workspace, recursive: true, maxEntries: 1 } })
      expect(JSON.parse(String(limited.content![0].text))).toMatchObject({ entries: [expect.any(Object)], truncated: true })
      expect(localFilesystemTools.some(tool => tool.toolName === 'list_directory')).toBe(true)
      const controller = new AbortController()
      controller.abort(new Error('host-stop'))
      await expect(callLocalFilesystem({ toolName: 'list_directory', workspace, arguments: { path: workspace }, signal: controller.signal })).rejects.toThrow('host-stop')
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })
})
