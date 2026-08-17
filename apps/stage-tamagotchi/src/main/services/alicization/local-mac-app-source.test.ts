import { describe, expect, it } from 'vitest'

import {
  assertBuiltAppIsFresh,
  isOptionalSecurityAuthorizationError,
  selectLatestBuiltApp,
} from '../../../../scripts/local-mac-app-source'

describe('local macOS app source selection', () => {
  it('selects the newest built app instead of trusting architecture order', () => {
    expect(selectLatestBuiltApp([
      { path: '/dist/mac-arm64/alicization.app', modifiedAt: 100 },
      { path: '/dist/mac/alicization.app', modifiedAt: 300 },
      { path: '/dist/mac-x64/alicization.app', modifiedAt: 200 },
    ])).toBe('/dist/mac/alicization.app')
  })

  it('rejects an app bundle whose packaged resources predate the current main build', async () => {
    const mainBundleUpdatedAt = new Date('2026-08-09T01:00:00.000Z')
    const appBundleUpdatedAt = new Date('2026-08-09T00:59:59.000Z')

    await expect(assertBuiltAppIsFresh({
      appPath: '/dist/mac-arm64/alicization.app',
      mainBundlePath: '/out/main/index.js',
      stat: async path => ({
        mtimeMs: path === '/out/main/index.js'
          ? mainBundleUpdatedAt.getTime()
          : appBundleUpdatedAt.getTime(),
      }),
    })).rejects.toThrow('built macOS app is older than the current main build')
  })

  it('allows local installation to continue when macOS refuses optional keychain settings authorization', () => {
    expect(isOptionalSecurityAuthorizationError(new Error([
      'security set-keychain-settings failed with exit code 152.',
      'security: SecKeychainSetSettings: Unable to obtain authorization for this operation.',
    ].join('\n')))).toBe(true)
  })
})
