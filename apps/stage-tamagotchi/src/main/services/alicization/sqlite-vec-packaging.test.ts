import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'

import { getLoadablePath } from 'sqlite-vec'
import { describe, expect, it } from 'vitest'

import electronBuilderConfig from '../../../../electron-builder.config'

describe('sqlite-vec Electron packaging', () => {
  it('rebuilds native Node modules for the Electron runtime before packaging', () => {
    expect(electronBuilderConfig.npmRebuild).toBe(true)
  })

  it('unpacks sqlite3 runtime files so bindings resolve outside app.asar', () => {
    expect(electronBuilderConfig.asarUnpack).toEqual(expect.arrayContaining([
      '**/node_modules/sqlite3/**/*',
      '**/node_modules/bindings/**/*',
      '**/node_modules/file-uri-to-path/**/*',
    ]))
  })

  it('runs a post-pack validation for the unpacked sqlite3 runtime', () => {
    expect(electronBuilderConfig.afterPack).toEqual(expect.any(Function))
  })

  it('copies the platform extension into a stable Electron resources path', () => {
    const extensionPath = getLoadablePath()
    const resources = electronBuilderConfig.extraResources

    expect(existsSync(extensionPath)).toBe(true)
    expect(resources).toEqual(expect.arrayContaining([
      expect.objectContaining({
        from: extensionPath,
        to: join('sqlite-vec', basename(extensionPath)),
      }),
    ]))
  })
})
