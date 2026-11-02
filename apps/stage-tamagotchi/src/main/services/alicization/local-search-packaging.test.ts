import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import electronBuilderConfig from '../../../../electron-builder.config'

import { localSearchBinarySha256 } from '../airi/mcp-servers/local-search'

describe('fixed local search resources', () => {
  const root = fileURLToPath(new URL('../../../../resources/third-party/ripgrep/', import.meta.url))
  it('ships the hash-verified official executable and its retained license notices', async () => {
    const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'))
    const binary = await readFile(join(root, manifest.binary.path))
    expect(binary.length).toBe(manifest.binary.bytes)
    expect(createHash('sha256').update(binary).digest('hex')).toBe(localSearchBinarySha256)
    expect(manifest.binary.sha256).toBe(localSearchBinarySha256)
    for (const license of [...manifest.licenses, manifest.referenceImplementation.notice])
      expect((await stat(join(root, license))).size).toBeGreaterThan(100)
    expect(await readFile(join(root, 'pi-LICENSE'), 'utf8')).toContain('Copyright (c) 2025 Mario Zechner')
  })
  it('places the native executable and notices outside app.asar at the runtime resource path', () => {
    expect(electronBuilderConfig.extraResources).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'resources/third-party/ripgrep', to: join('tools', 'ripgrep') }),
    ]))
    expect(electronBuilderConfig.nsis?.include).toBe('build/nsis-startup.nsh')
  })
})
