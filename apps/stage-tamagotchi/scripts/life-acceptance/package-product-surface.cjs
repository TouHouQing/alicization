const assert = require('node:assert/strict')
const path = require('node:path')

const { assertAuthenticatedNativeQuit } = require('./native-quit-observation.cjs')

function samePath(first, second) {
  return typeof first === 'string' && typeof second === 'string'
    && path.resolve(first).toLowerCase() === path.resolve(second).toLowerCase()
}
function rectangle(value) {
  return value && ['x', 'y', 'width', 'height'].every(key => Number.isFinite(value[key])) && value.width > 0 && value.height > 0
}
function outside(window, display) {
  return window.x >= display.x + display.width || window.x + window.width <= display.x
    || window.y >= display.y + display.height || window.y + window.height <= display.y
}

/** A host run needs its actual ASAR, native child and every captured viewport. */
exports.assertPackageProductSurface = function (report, expected) {
  assert.equal(report.packagedAsarSha256, expected.asarSha256)
  assert.ok(samePath(report.executable, expected.executable))
  assert.ok(samePath(report.nativeRuntime?.executable, expected.executable))
  assert.ok(samePath(report.nativeRuntime?.profile, report.profile))
  assert.equal(report.syntheticIdentity, true)
  assert.equal(report.credentialsRemoved, true)
  const proof = assertAuthenticatedNativeQuit(report.shutdown)
  assert.equal(report.nativeRuntime.pid, proof.pid)
  assert.equal(report.nativeRuntime.parentPid, proof.parentPid)
  if (report.nativeRuntime.hostViewport) {
    const runtime = report.nativeRuntime
    const viewport = runtime.hostViewport
    assert.equal(report.privateDesktop ?? null, null)
    assert.equal(runtime.hostDesktopVerified, true)
    assert.equal(runtime.desktop, 'Default')
    assert.equal(runtime.inputDesktop, 'Default')
    assert.equal(runtime.switchedInputDesktop, false)
    assert.equal(viewport.mode, 'actual-host-background-viewport')
    assert.equal(report.compiledMainSha256, expected.mainSha256)
    assert.equal(viewport.isPackaged, true)
    assert.equal(viewport.actualMainSha256, expected.mainSha256)
    assert.equal(viewport.installerId, expected.installerId ?? null)
    const captures = report.hostViewportObservations
    assert.ok(Array.isArray(captures) && captures.length > 0)
    assert.ok(Array.isArray(report.pages) && report.pages.length > 0)
    for (const capture of captures) {
      assert.ok(Array.isArray(capture.displays) && capture.displays.length > 0 && capture.displays.every(rectangle))
      assert.ok(Array.isArray(capture.windows) && capture.windows.length > 0)
      for (const window of capture.windows) {
        assert.equal(window.focusable, false)
        assert.equal(window.focused, false)
        assert.ok(rectangle(window.bounds) && capture.displays.every(display => outside(window.bounds, display)))
      }
    }
    assert.ok(report.pages.every(page => captures.some(capture => capture.name === page.name)))
    return { kind: 'host', id: `host:${proof.pid}:${proof.startedAt}` }
  }
  assert.match(report.privateDesktop ?? '', /^AlicizationQA_[a-f0-9]{32}$/u)
  assert.equal(report.nativeRuntime.privateDesktopVerified, true)
  assert.equal(report.nativeRuntime.desktop, report.privateDesktop)
  return { kind: 'private', id: report.privateDesktop }
}
