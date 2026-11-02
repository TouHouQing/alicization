const assert = require('node:assert/strict')
const { Buffer } = require('node:buffer')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const process = require('node:process')

/** Refuse before launch unless the real ASAR contains this exact reviewed entry. */
exports.inspectHostViewportPackage = function ({ executable, runId, workspace = process.cwd(), archive }) {
  assert.match(runId ?? '', /^20\d{6}-[a-f\d]{8}$/u)
  assert.ok(path.isAbsolute(executable))
  assert.equal(path.basename(executable).toLowerCase(), `alicization-lifeqa-${runId}.exe`)
  const appRoot = path.join(workspace, 'apps/stage-tamagotchi')
  let asar = archive
  if (!asar) {
    const req = createRequire(path.join(appRoot, 'package.json'))
    const builderReq = createRequire(req.resolve('electron-builder'))
    asar = createRequire(builderReq.resolve('app-builder-lib'))('@electron/asar')
  }
  const asarPath = path.join(path.dirname(executable), 'resources/app.asar')
  const metadata = JSON.parse(asar.extractFile(asarPath, 'package.json').toString('utf8'))
  assert.equal(metadata.lifeQaInstallerId, runId)
  assert.equal(metadata.name, `alicization-life-installer-${runId}`)
  assert.equal(metadata.main, 'out/main/index.js')
  const main = asar.extractFile(asarPath, path.normalize('out/main/index.js'))
  assert.ok(main.includes(Buffer.from('host-viewport-qa-v1')), 'The package has no reviewed background placement hook')
  const hash = bytes => createHash('sha256').update(bytes).digest('hex')
  const mainSha256 = hash(main)
  assert.equal(mainSha256, hash(fs.readFileSync(path.join(appRoot, 'out/main/index.js'))), 'Packaged entry differs from current compiled source')
  return { runId, asarPath, mainSha256, normalAsarBootstrap: true }
}
