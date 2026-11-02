import assert from 'node:assert/strict'
import process, { env } from 'node:process'

import { createHash } from 'node:crypto'
import { lstatSync, readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, isAbsolute, join } from 'node:path'

import { app, dialog, screen } from 'electron'

import { assertInstallerProfileOwner } from '../../../scripts/life-acceptance/installer-qa-identity.cjs'
import { installHostViewportPositionGuard } from './host-viewport-position'

interface HostViewportIdentityInput { profile: string, entry: string, packaged: boolean, appPath: string, executable: string, installerId?: string, privateDesktop?: string, appData?: string, profileNonce?: string }

/** QA may constrain windows only in its fresh synthetic profile and exact QA package. */
export function assertHostViewportIdentity(input: HostViewportIdentityInput) {
  assert.equal(input.privateDesktop, undefined, 'Host QA cannot change the input desktop')
  assert.ok(isAbsolute(input.profile) && isAbsolute(input.entry))
  assert.match(basename(input.profile), /^alicization-life-[\w-]+-/u)
  const profile = realpathSync(input.profile)
  assert.ok(lstatSync(input.profile).isDirectory() && !lstatSync(input.profile).isSymbolicLink())
  assert.equal(dirname(profile).toLowerCase(), realpathSync(tmpdir()).toLowerCase(), 'Only an owned temporary QA profile is supported')
  return readMainIdentity(input, profile)
}

function readMainIdentity(input: HostViewportIdentityInput, profile: string) {
  assert.equal(input.privateDesktop, undefined, 'Host QA cannot change the input desktop')
  assert.ok(isAbsolute(input.entry))
  let installerId: string | null = null
  if (input.packaged) {
    assert.match(input.installerId ?? '', /^20\d{6}-[a-f\d]{8}$/u)
    const metadata = JSON.parse(readFileSync(join(input.appPath, 'package.json'), 'utf8'))
    assert.equal(metadata.lifeQaInstallerId, input.installerId)
    assert.equal(metadata.name, `alicization-life-installer-${input.installerId}`)
    assert.equal(metadata.main, 'out/main/index.js')
    assert.equal(basename(input.executable).toLowerCase(), `alicization-lifeqa-${input.installerId}.exe`)
    installerId = input.installerId!
  }
  assert.ok(lstatSync(input.entry).isFile())
  return { profile, installerId, mainSha256: createHash('sha256').update(readFileSync(input.entry)).digest('hex') }
}

/** Reuse the installer's nonce, file-object and exact install-root proof for AppData. */
export async function resolveHostViewportIdentity(input: HostViewportIdentityInput) {
  const profile = realpathSync(input.profile)
  if (dirname(profile).toLowerCase() === realpathSync(tmpdir()).toLowerCase())
    return assertHostViewportIdentity(input)
  assert.equal(input.packaged, true, 'An installed profile requires the actual QA package')
  assert.ok(input.appData && isAbsolute(input.appData))
  const verified = await assertInstallerProfileOwner({ workspace: dirname(input.appPath), runId: input.installerId, appData: input.appData, profile: input.profile, nonce: input.profileNonce, executable: input.executable })
  return readMainIdentity(input, verified.canonicalProfile)
}

export function resolveHostViewportStartupIdentity(input: { entry: string, executable: string, environment: Record<string, string | undefined>, application: { isPackaged: boolean, getAppPath: () => string, getPath: (name: 'appData') => string } }) {
  const environment = input.environment
  // Keep the installer's configured AppData scope. Its object-identity check
  // handles MSIX namespace aliases without accepting a different profile.
  return resolveHostViewportIdentity({ profile: environment.ALICIZATION_USER_DATA_PATH ?? '', entry: input.entry, packaged: input.application.isPackaged, appPath: input.application.getAppPath(), executable: input.executable, installerId: environment.LIFE_QA_INSTALLER_ID, privateDesktop: environment.LIFE_QA_PRIVATE_DESKTOP, appData: environment.APPDATA || input.application.getPath('appData'), profileNonce: environment.LIFE_QA_PROFILE_NONCE })
}

/** Keep normal ASAR/bootstrap semantics; do not replace or import another app entry. */
export async function installHostViewportQa(entry: string) {
  if (env.LIFE_QA_HOST_VIEWPORT !== '1')
    return
  const identity = await resolveHostViewportStartupIdentity({ entry, executable: process.execPath, environment: env, application: app })
  const windows = new Map<number, Record<string, unknown>>()
  const lastWindowStates = new Map<number, Record<string, unknown>>()
  const blockedFocusCalls: Array<{ surface: string, at: number }> = []
  const blockedDevToolsCalls: Array<{ id: number, at: number }> = []
  const receiptPath = join(identity.profile, 'qa-host-viewport.json')
  const publish = () => {
    if (env.LIFE_QA_HOST_VIEWPORT_RECEIPT !== '1')
      return
    const receipt = { format: 'host-viewport-qa-v1', mode: 'actual-host-background-viewport', pid: process.pid, parentPid: process.ppid, executable: process.execPath, profile: identity.profile, actualMainEntry: entry, actualMainSha256: identity.mainSha256, isPackaged: app.isPackaged, installerId: identity.installerId, observedAt: Date.now(), windows: [...windows.values()], lastWindowStates: [...lastWindowStates.values()], blockedFocusCalls, blockedDevToolsCalls, displays: screen.getAllDisplays().map(display => display.bounds) }
    const temporary = `${receiptPath}.${process.pid}.tmp`
    writeFileSync(temporary, JSON.stringify(receipt))
    renameSync(temporary, receiptPath)
  }
  app.focus = () => {
    if (blockedFocusCalls.length < 128)
      blockedFocusCalls.push({ surface: 'app', at: Date.now() })
  }
  dialog.showErrorBox = (title, content) => console.error(`[qa-native-error] ${title}\n${content}`)
  app.on('browser-window-created', (_event, window) => {
    installHostViewportPositionGuard(window, () => screen.getAllDisplays().map(display => display.bounds))
    const place = () => {
      if (window.isDestroyed())
        return
      const bounds = window.getBounds()
      if (screen.getAllDisplays().some(({ bounds: display }) => bounds.x < display.x + display.width && bounds.x + bounds.width > display.x && bounds.y < display.y + display.height && bounds.y + bounds.height > display.y))
        window.setBounds({ ...bounds, x: -30000, y: -30000 })
      const state = { id: window.id, bounds: window.getBounds(), visible: window.isVisible(), focusable: window.isFocusable(), focused: window.isFocused(), nativeHandle: window.getNativeWindowHandle().toString('hex') }
      windows.set(window.id, state)
      lastWindowStates.set(window.id, state)
      publish()
    }
    const setFocusable = window.setFocusable.bind(window)
    setFocusable(false)
    window.setFocusable = () => setFocusable(false)
    window.focus = () => {}
    window.webContents.focus = () => {}
    // Detached DevTools is a native Chromium window outside BrowserWindow.
    window.webContents.openDevTools = () => {
      if (blockedDevToolsCalls.length < 128)
        blockedDevToolsCalls.push({ id: window.id, at: Date.now() })
    }
    window.moveTop = () => {}
    window.setAlwaysOnTop = () => {}
    window.setVisibleOnAllWorkspaces = () => {}
    window.show = () => window.showInactive()
    window.setSkipTaskbar(true)
    place()
    window.on('move', place)
    window.on('show', place)
    window.on('closed', () => {
      windows.delete(window.id)
      publish()
    })
  })
  Object.assign(globalThis, { __alicizationHostViewportQa: { mode: 'actual-host-background-viewport', actualMainEntry: entry, actualMainSha256: identity.mainSha256, isPackaged: app.isPackaged, installerId: identity.installerId, scope: 'Only QA window placement/focus is constrained; physical placement, click-through and desktop gaze are excluded.', windows: () => [...windows.values()] } })
  void app.whenReady().then(() => {
    publish()
    const timer = setInterval(publish, 1000)
    timer.unref()
    app.once('will-quit', () => clearInterval(timer))
  })
}
