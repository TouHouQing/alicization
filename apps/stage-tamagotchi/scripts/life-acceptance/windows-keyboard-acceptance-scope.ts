import assert from 'node:assert/strict'

import { execFileSync } from 'node:child_process'
import { basename, dirname, resolve } from 'node:path'
import { cwd, env } from 'node:process'

/** Host authorization never disables the separate guest's UUID/user guard. */
export function assertKeyboardAcceptanceScope(run: string, fixtureId: number, fixtureWindow: string) {
  assert.ok(Number.isSafeInteger(fixtureId) && fixtureId > 0)
  assert.match(fixtureWindow, /^[1-9]\d{0,18}$/u)
  const hostProof = env.LIFE_QA_OWNED_HOST_PROOF
  if (hostProof) {
    assert.equal(env.LIFE_QA_GUEST_PROOF_PATH, undefined)
    assert.equal(env.LIFE_QA_PRIVATE_DESKTOP, undefined)
    assert.equal(dirname(resolve(run)).toLowerCase(), resolve('output').toLowerCase())
    assert.match(basename(run), /^keyboard-host-[a-f0-9]{32}$/u)
    assert.equal(resolve(hostProof).toLowerCase(), resolve(run, 'host-fixture-owner.json').toLowerCase())
    const identity = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', resolve('apps/stage-tamagotchi/scripts/life-acceptance/assert-owned-windows-fixture.ps1'), '-ProofPath', hostProof], { windowsHide: true, timeout: 15_000, encoding: 'utf8', maxBuffer: 8192 }))
    assert.equal(identity.ownedHostFixtureVerified, true)
    assert.equal(identity.run.toLowerCase(), resolve(run).toLowerCase())
    assert.equal(identity.processId, fixtureId)
    assert.equal(identity.windowId, fixtureWindow)
    return identity
  }
  const identity = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', resolve('apps/stage-tamagotchi/scripts/life-acceptance/assert-isolated-windows-guest.ps1'), '-ProofPath', env.LIFE_QA_GUEST_PROOF_PATH || 'C:/AlicizationQA/guest-owner.json'], { windowsHide: true, timeout: 15_000, encoding: 'utf8', maxBuffer: 16_000 }))
  assert.equal(cwd().toLowerCase(), 'c:\\alicizationqa\\project')
  assert.match(resolve(run).toLowerCase(), /^c:\\alicizationqa\\project\\output\\keyboard-[a-f0-9]{32}$/u)
  assert.equal(identity.isolatedGuestVerified, true)
  assert.equal(identity.guestUuid.toLowerCase(), '9f40be7c-2dd5-4545-8dfa-163d7381b459')
  return identity
}
