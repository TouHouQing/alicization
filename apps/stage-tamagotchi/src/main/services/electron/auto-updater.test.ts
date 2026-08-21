import { describe, expect, it } from 'vitest'

import { shouldEnableAutoUpdater } from './auto-updater-policy'

describe('auto-updater availability', () => {
  it('does not start electron-updater for a packaged local build without update metadata', () => {
    expect(shouldEnableAutoUpdater({
      isDev: false,
      isPackaged: true,
      hasUpdateConfig: false,
    })).toBe(false)
  })

  it('enables electron-updater only for packaged builds with update metadata', () => {
    expect(shouldEnableAutoUpdater({
      isDev: false,
      isPackaged: true,
      hasUpdateConfig: true,
    })).toBe(true)
  })
})
