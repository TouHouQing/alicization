import process from 'node:process'

import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, expect, it, vi } from 'vitest'

const { installerQaIdentity, assertInstallerProfileOwner } = createRequire(import.meta.url)('../../../../../scripts/life-acceptance/installer-qa-identity.cjs')
const roots: string[] = []

it('refuses a directory junction even when its borrowed ownership marker has the correct nonce', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-installer-junction-test-'))
  roots.push(root)
  const appData = join(root, 'appdata')
  const borrowed = join(root, 'borrowed')
  await mkdir(appData)
  await mkdir(borrowed)
  const runId = '20261025-a1b2c3d4'
  const nonce = randomUUID()
  const identity = installerQaIdentity({ workspace: root, runId, appData })
  await writeFile(join(borrowed, 'life-installer-qa-owner.json'), JSON.stringify({ format: 'life-installer-qa-owner-v1', runId, nonce, installRoot: root }))
  await symlink(borrowed, identity.profile, 'junction')
  await expect(assertInstallerProfileOwner({ workspace: root, runId, appData, nonce, profile: identity.profile, executable: join(root, `${identity.executableName}.exe`) })).rejects.toThrow('ancestry')
})
afterEach(async () => {
  vi.unstubAllEnvs()
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

it('gives build and acceptance the same isolated executable, profile and uninstall registration', () => {
  const workspace = join(tmpdir(), 'installer-source')
  const appData = join(tmpdir(), 'installer-appdata')
  const one = installerQaIdentity({ workspace, appData, runId: '20261025-a1b2c3d4' })
  const again = installerQaIdentity({ workspace, appData, runId: '20261025-a1b2c3d4' })
  const another = installerQaIdentity({ workspace, appData, runId: '20261025-a1b2c3d5' })
  expect(one).toEqual(again)
  expect(one.appId).not.toBe('com.tohoqing.alicization')
  expect(one.guid).not.toBe(another.guid)
  expect(one.appId).not.toBe(another.appId)
  expect(one.profile).toBe(join(appData, one.packageName))
  expect(one.unpackedExecutable).toBe(join(one.release, 'win-unpacked', `${one.executableName}.exe`))
  expect(one.reportRoot).not.toBe(another.reportRoot)
  expect(one.installer).not.toContain('20261005')
})

it.each([undefined, '', '20261025', '../20261025-a1b2c3d4', '20261025-A1B2C3D4', '20260230-a1b2c3d4', '20261301-a1b2c3d4', '20261025-a1b2c3d4.exe'])('rejects missing or invalid build identity before any installer can launch: %s', (runId) => {
  expect(() => installerQaIdentity({ workspace: tmpdir(), runId })).toThrow()
})

it('loads the actual builder configuration with this identity, current-user scope and no automatic UI launch', async () => {
  vi.stubEnv('LIFE_QA_INSTALLER_ID', '20261025-a1b2c3d4')
  const configuration = (await import('../../../../../scripts/life-installer-qa.config')).default
  expect(configuration.appId).toBe('com.tohoqing.alicization.qa.life20261025-a1b2c3d4')
  expect(configuration.win?.executableName).toBe('alicization-lifeqa-20261025-a1b2c3d4')
  expect(configuration.nsis).toMatchObject({ perMachine: false, allowElevation: false, deleteAppDataOnUninstall: false, createDesktopShortcut: false, createStartMenuShortcut: false, runAfterFinish: false })
})

it('refuses another run, an invalid nonce, a production executable and a borrowed installation before launching UI', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-installer-owner-test-'))
  const installRoot = await mkdtemp(join(tmpdir(), 'alicization-life-installer-app-'))
  roots.push(root, installRoot)
  const appData = join(root, 'appdata')
  await mkdir(appData)
  const workspace = join(root, 'workspace')
  const runId = '20261025-a1b2c3d4'
  const nonce = randomUUID()
  const identity = installerQaIdentity({ workspace, runId, appData })
  await mkdir(identity.profile)
  const owner = { format: 'life-installer-qa-owner-v1', runId, nonce, installRoot }
  await writeFile(join(identity.profile, 'life-installer-qa-owner.json'), JSON.stringify(owner))
  const input = { workspace, runId, appData, nonce, profile: identity.profile, executable: join(installRoot, `${identity.executableName}.exe`) }
  expect((await assertInstallerProfileOwner(input)).owner).toEqual(owner)
  await expect(assertInstallerProfileOwner({ ...input, nonce: randomUUID() })).rejects.toThrow()
  await expect(assertInstallerProfileOwner({ ...input, runId: '20261025-a1b2c3d5' })).rejects.toThrow()
  await expect(assertInstallerProfileOwner({ ...input, executable: join(installRoot, 'alicization.exe') })).rejects.toThrow()
  await writeFile(join(identity.profile, 'life-installer-qa-owner.json'), JSON.stringify({ ...owner, installRoot: root }))
  await expect(assertInstallerProfileOwner(input)).rejects.toThrow()
})

it.runIf(process.platform === 'win32')('accepts a real NTFS spelling alias of the same profile directory while refusing a copied marker in another directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alicization-installer-alias-test-'))
  const installRoot = await mkdtemp(join(tmpdir(), 'alicization-life-installer-app-'))
  roots.push(root, installRoot)
  const appData = join(root, 'appdata')
  const runId = '20261027-a1b2c3d4'
  const nonce = randomUUID()
  const identity = installerQaIdentity({ workspace: root, runId, appData })
  await mkdir(identity.profile, { recursive: true })
  const marker = JSON.stringify({ format: 'life-installer-qa-owner-v1', runId, nonce, installRoot })
  await writeFile(join(identity.profile, 'life-installer-qa-owner.json'), marker)
  const input = { workspace: root, runId, appData, nonce, profile: identity.profile.toUpperCase(), executable: join(installRoot, `${identity.executableName}.exe`) }
  expect((await assertInstallerProfileOwner(input)).owner.nonce).toBe(nonce)
  const copied = join(root, 'copied', identity.packageName)
  await mkdir(copied, { recursive: true })
  await writeFile(join(copied, 'life-installer-qa-owner.json'), marker)
  await expect(assertInstallerProfileOwner({ ...input, profile: copied })).rejects.toThrow('same directory object')
})
