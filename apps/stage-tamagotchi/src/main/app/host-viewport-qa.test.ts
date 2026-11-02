import { createHash, randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

import { assertHostViewportIdentity, installHostViewportQa, resolveHostViewportIdentity, resolveHostViewportStartupIdentity } from './host-viewport-qa'

const on = vi.hoisted(() => vi.fn())
vi.mock('electron', () => ({ app: { on }, dialog: {}, screen: {} }))
afterEach(() => {
  vi.unstubAllEnvs()
  on.mockClear()
})

it.each(['owned', 'wrong-nonce', 'wrong-executable', 'different-profile', 'development', 'virtualized-appdata', 'virtualized-wrong-nonce', 'os-only-root'] as const)('accepts an installed AppData profile only with the original installer proof: %s', async (scenario) => {
  const root = await mkdtemp(join(tmpdir(), 'life-viewport-installed-unit-'))
  const installRoot = await mkdtemp(join(tmpdir(), 'alicization-life-installer-app-'))
  const installerId = '20261027-abcdef12'
  const nonce = randomUUID()
  try {
    const virtualized = scenario.startsWith('virtualized')
    const appData = virtualized ? join(root, 'Packages/TestHost/LocalCache/Roaming') : join(root, 'Roaming')
    const profile = join(appData, `alicization-life-installer-${installerId}`)
    const appPath = join(installRoot, 'resources/app.asar')
    const entry = join(appPath, 'out/main/index.js')
    await mkdir(profile, { recursive: true })
    await mkdir(join(appPath, 'out/main'), { recursive: true })
    await writeFile(entry, 'export const actualInstalledEntry = true')
    await writeFile(join(appPath, 'package.json'), JSON.stringify({ name: `alicization-life-installer-${installerId}`, lifeQaInstallerId: installerId, main: 'out/main/index.js' }))
    await writeFile(join(profile, 'life-installer-qa-owner.json'), JSON.stringify({ format: 'life-installer-qa-owner-v1', runId: installerId, nonce, installRoot }), { flag: 'wx' })
    const input = { profile, appData, appPath, entry, packaged: scenario !== 'development', installerId, profileNonce: scenario === 'wrong-nonce' || scenario === 'virtualized-wrong-nonce' ? randomUUID() : nonce, executable: join(scenario === 'wrong-executable' ? root : installRoot, `alicization-lifeqa-${installerId}.exe`) }
    if (scenario === 'different-profile') {
      input.profile = join(appData, 'other-existing-identity')
      await mkdir(input.profile)
    }
    const resolve = () => virtualized || scenario === 'os-only-root'
      ? resolveHostViewportStartupIdentity({ entry, executable: input.executable, environment: { ALICIZATION_USER_DATA_PATH: input.profile, LIFE_QA_PROFILE_NONCE: input.profileNonce, LIFE_QA_INSTALLER_ID: installerId, ...(virtualized ? { APPDATA: appData } : {}) }, application: { isPackaged: true, getAppPath: () => appPath, getPath: () => join(root, 'Roaming') } })
      : resolveHostViewportIdentity(input)
    if (scenario === 'owned' || scenario === 'virtualized-appdata' || scenario === 'os-only-root')
      expect(await resolve()).toMatchObject({ installerId })
    else
      await expect(resolve()).rejects.toThrow()
    expect(on).not.toHaveBeenCalled()
  }
  finally {
    await rm(root, { recursive: true, force: true })
    await rm(installRoot, { recursive: true, force: true })
  }
})

it('does not install hooks or read QA paths during ordinary product startup', async () => {
  vi.stubEnv('LIFE_QA_HOST_VIEWPORT', undefined)
  expect(await installHostViewportQa('missing-entry')).toBeUndefined()
  expect(on).not.toHaveBeenCalled()
})

it.each(['development', 'qa-package', 'production-package', 'different-package', 'different-executable', 'nested-profile', 'private-desktop', 'missing-entry'] as const)('restricts background placement to the exact synthetic identity: %s', async (scenario) => {
  const profile = await mkdtemp(join(tmpdir(), 'alicization-life-viewport-unit-'))
  const entry = join(profile, 'main.js')
  const installerId = '20261027-abcdef12'
  try {
    await writeFile(entry, 'export const actualApp = true')
    await writeFile(join(profile, 'package.json'), JSON.stringify({ name: scenario === 'production-package' ? '@proj-alicization/stage-tamagotchi' : `alicization-life-installer-${installerId}`, lifeQaInstallerId: scenario === 'different-package' ? '20261026-abcdef12' : installerId, main: 'out/main/index.js' }))
    const nested = join(profile, 'alicization-life-nested-profile')
    if (scenario === 'nested-profile')
      await mkdir(nested)
    const input = { profile: scenario === 'nested-profile' ? nested : profile, entry: scenario === 'missing-entry' ? join(profile, 'missing.js') : entry, packaged: scenario !== 'development', installerId, appPath: profile, executable: join(profile, scenario === 'different-executable' ? 'alicization.exe' : `alicization-lifeqa-${installerId}.exe`), ...(scenario === 'private-desktop' ? { privateDesktop: 'AnotherDesktop' } : {}) }
    if (scenario === 'development' || scenario === 'qa-package') {
      expect(assertHostViewportIdentity(input)).toMatchObject({ installerId: scenario === 'development' ? null : installerId, mainSha256: createHash('sha256').update('export const actualApp = true').digest('hex') })
    }
    else { expect(() => assertHostViewportIdentity(input)).toThrow() }
    expect(on).not.toHaveBeenCalled()
  }
  finally { await rm(profile, { recursive: true, force: true }) }
})
