import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { expect, it } from 'vitest'

const { assertPackageProductSurface } = createRequire(import.meta.url)('../../../../../scripts/life-acceptance/package-product-surface.cjs')

const expected = { executable: resolve('owned-release/win-unpacked/alicization-lifeqa-20261027-12345678.exe'), asarSha256: 'a'.repeat(64), mainSha256: 'b'.repeat(64), installerId: '20261027-12345678' }
function fixture() {
  const proof = { source: 'authenticated-direct-child-close', pid: 101, parentPid: 102, playwrightLauncherPid: 103, startedAt: 10 }
  return {
    executable: expected.executable,
    profile: resolve('alicization-life-product-proof'),
    packagedAsarSha256: expected.asarSha256,
    compiledMainSha256: expected.mainSha256,
    syntheticIdentity: true,
    credentialsRemoved: true,
    pages: [{ name: 'actual-live2d' }],
    nativeRuntime: { pid: 101, parentPid: 102, executable: expected.executable, profile: resolve('alicization-life-product-proof'), hostDesktopVerified: true, desktop: 'Default', inputDesktop: 'Default', switchedInputDesktop: false, hostViewport: { mode: 'actual-host-background-viewport', isPackaged: true, actualMainSha256: expected.mainSha256, installerId: expected.installerId } },
    hostViewportObservations: [{ name: 'actual-live2d', displays: [{ x: -1920, y: 0, width: 1920, height: 1080 }, { x: 0, y: 0, width: 2560, height: 1440 }], windows: [{ bounds: { x: 3000, y: 100, width: 800, height: 600 }, focusable: false, focused: false }] }],
    shutdown: { completed: true, exitCode: 0, elapsedMs: 600, fileFlushObserved: true, windowTeardownObserved: true, nativeProcessObservation: proof, nativeExitObservedAt: 1000 },
  }
}

it('admits exact-package host evidence with actual native exit and every captured window outside every display', () => {
  expect(assertPackageProductSurface(fixture(), expected)).toEqual({ kind: 'host', id: 'host:101:10' })
})

it.each([
  'development-runtime',
  'other-asar',
  'other-main',
  'other-executable',
  'other-native-executable',
  'other-profile',
  'other-native-pid',
  'unremoved-credentials',
  'missing-captures',
  'missing-page-capture',
  'empty-windows',
  'invalid-rectangle',
  'secondary-monitor-overlap',
  'focusable',
  'focused',
  'switched-desktop',
  'wrong-installer',
  'forced-exit',
  'no-native-exit',
  'unflushed-log',
])('refuses an incomplete or mismatched package surface: %s', (fault) => {
  const report = fixture()
  switch (fault) {
    case 'development-runtime': report.nativeRuntime.hostViewport.isPackaged = false
      break
    case 'other-asar': report.packagedAsarSha256 = 'c'.repeat(64)
      break
    case 'other-main': report.compiledMainSha256 = 'c'.repeat(64)
      break
    case 'other-executable': report.executable = resolve('other.exe')
      break
    case 'other-native-executable': report.nativeRuntime.executable = resolve('other.exe')
      break
    case 'other-profile': report.nativeRuntime.profile = resolve('other-profile')
      break
    case 'other-native-pid': report.nativeRuntime.pid = 201
      break
    case 'unremoved-credentials': report.credentialsRemoved = false
      break
    case 'missing-captures': report.hostViewportObservations = []
      break
    case 'missing-page-capture': report.pages.push({ name: 'unobserved-page' })
      break
    case 'empty-windows': report.hostViewportObservations[0].windows = []
      break
    case 'invalid-rectangle': report.hostViewportObservations[0].windows[0].bounds.width = Number.NaN
      break
    case 'secondary-monitor-overlap': report.hostViewportObservations[0].windows[0].bounds.x = -1000
      break
    case 'focusable': report.hostViewportObservations[0].windows[0].focusable = true
      break
    case 'focused': report.hostViewportObservations[0].windows[0].focused = true
      break
    case 'switched-desktop': report.nativeRuntime.switchedInputDesktop = true
      break
    case 'wrong-installer': report.nativeRuntime.hostViewport.installerId = '20261027-aaaaaaaa'
      break
    case 'forced-exit': report.shutdown.exitCode = 1
      break
    case 'no-native-exit': report.shutdown.nativeExitObservedAt = 0
      break
    case 'unflushed-log': report.shutdown.fileFlushObserved = false
      break
  }
  expect(() => assertPackageProductSurface(report, expected)).toThrow()
})

it('still requires the exact inactive desktop for an actual private-desktop package run', () => {
  const report = fixture()
  const privateReport = { ...report, privateDesktop: `AlicizationQA_${'1'.repeat(32)}`, nativeRuntime: { ...report.nativeRuntime, hostViewport: undefined, privateDesktopVerified: true, desktop: `AlicizationQA_${'1'.repeat(32)}` } }
  expect(assertPackageProductSurface(privateReport, expected)).toEqual({ kind: 'private', id: privateReport.privateDesktop })
  privateReport.nativeRuntime.desktop = 'Default'
  expect(() => assertPackageProductSurface(privateReport, expected)).toThrow()
})
