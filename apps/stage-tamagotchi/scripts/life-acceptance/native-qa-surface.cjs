const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const path = require('node:path')
const process = require('node:process')

function assertNativeQaSurface() {
  if (process.env.LIFE_QA_GUEST_PROOF_PATH) {
    assert.equal(process.env.LIFE_QA_PRIVATE_DESKTOP, undefined, 'Do not mix a guest proof and a private desktop claim')
    const observation = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-isolated-windows-guest.ps1'), '-ProofPath', process.env.LIFE_QA_GUEST_PROOF_PATH], { windowsHide: true, timeout: 15000, maxBuffer: 16000, encoding: 'utf8' }))
    assert.equal(observation.isolatedGuestVerified, true)
    assert.equal(observation.desktop, 'Default')
    return observation
  }
  assert.match(process.env.LIFE_QA_PRIVATE_DESKTOP || '', /^AlicizationQA_[a-f0-9]{32}$/u)
  const observation = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'assert-private-desktop.ps1'), '-ExpectedDesktop', process.env.LIFE_QA_PRIVATE_DESKTOP], { windowsHide: true, timeout: 15000, maxBuffer: 16000, encoding: 'utf8' }))
  assert.equal(observation.privateDesktopVerified, true)
  return observation
}

module.exports = { assertNativeQaSurface }
