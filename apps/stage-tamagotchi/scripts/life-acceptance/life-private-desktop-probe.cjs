const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const process = require('node:process')

const { _electron } = require('playwright')

const { launchOptions } = require('./electron-launch.cjs')

async function main() {
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'alicization-life-desktop-probe-'))
  const identity = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-private-desktop.ps1'), '-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP], { windowsHide: true, encoding: 'utf8' }))
  assert.equal(identity.privateDesktopVerified, true)
  const options = launchOptions(profile)
  options.executablePath = path.resolve('apps/stage-tamagotchi/node_modules/electron/dist/electron.exe')
  options.args = [path.join(__dirname, 'private-desktop-probe-main.cjs')]
  const application = await _electron.launch(options)
  try {
    const result = await application.evaluate(async ({ app }) => {
      await app.whenReady()
      return globalThis.__lifeQaDesktopProbe
    })
    assert.equal(result.windowsCreated, 0)
    console.info(JSON.stringify({ passed: true, controller: identity, electron: result, profile }))
  }
  finally {
    await application.close().catch(() => {})
  }
}
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
