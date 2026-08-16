import { existsSync } from 'node:fs'
import { basename, join } from 'node:path'

import { getLoadablePath } from 'sqlite-vec'
import { describe, expect, it } from 'vitest'

import electronBuilderConfig from '../../../../electron-builder.config'

describe('sqlite-vec Electron packaging', () => {
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
