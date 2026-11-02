import type sqlite3Types from 'sqlite3'

import assert from 'node:assert/strict'
import process from 'node:process'

import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile, realpath, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'

import sqlite3 from '../../src/main/services/alicization/sqlite3-runtime'

import { setupAlicizationDb } from '../../src/main/services/alicization/db'
import { createWindowsKeyboardJournalIndex, readOwnedKeyboardJournalFile } from '../../src/main/services/alicization/execution/windows-keyboard-journal'
import { decodeWindowsKeyboardGuardianRelease, decodeWindowsKeyboardReady, decodeWindowsKeyboardResult } from '../../src/main/services/alicization/execution/windows-keyboard-protocol'
import { compileWindowsKeyboardShortcut } from '../../src/main/services/alicization/execution/windows-keyboard-shortcut'
import { sqliteFileSystemPath } from '../../src/main/services/alicization/sqlite-file-path'
import { isOwnedHostViewport } from './electron-launch.cjs'

// tsx has no Vite ?raw loader. Invoke the unchanged production inspection
// script as fixed source; original process identity remains separate stdin.
const processInspector = await readFile(new URL('../../src/main/services/alicization/execution/file-recovery-process.ps1', import.meta.url), 'utf8')
function inspectOriginalProcess(input: { pid: number, creationTimeTicks: string, executable: string }) {
  const output = execFileSync(join(process.env.SystemRoot!, 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-InputFormat', 'Text', '-OutputFormat', 'Text', '-EncodedCommand', Buffer.from(processInspector, 'utf16le').toString('base64')], { windowsHide: true, timeout: 8000, maxBuffer: 4096, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], input: `${JSON.stringify({ operation: 'inspect', ...input })}\n` })
  const result = JSON.parse(output)
  assert.deepEqual(Object.keys(result), ['state'])
  assert.ok(['running', 'stopped', 'unknown'].includes(result.state))
  return result.state
}

const profile = resolve(process.argv[2] ?? '')
const root = resolve(process.argv[3] ?? '')
assert.match(basename(profile), /^alicization-life-product-regression-/u)
assert.equal(await realpath(dirname(profile)), await realpath(tmpdir()))
assert.ok(root.startsWith(`${resolve('output')}\\`))
const report = JSON.parse(await readFile(join(root, 'report.json'), 'utf8'))
assert.equal(report.profile, profile)
assert.ok(isOwnedHostViewport(report))
const shutdown = JSON.parse(await readFile(join(root, 'electron-keyboard-shutdown.json'), 'utf8'))
assert.equal(shutdown.profile, profile)
assert.equal(shutdown.runtimePid, report.nativeRuntime.pid)
assert.ok(shutdown.completed && shutdown.exitCode === 0)
assert.throws(() => process.kill(shutdown.runtimePid, 0), (error: unknown) => (error as NodeJS.ErrnoException).code === 'ESRCH')
assert.equal(report.electronKeyboardFixtureShutdown.code, 0)
const fixture = report.electronKeyboardFixture
assert.equal(dirname(fixture.run), resolve('output'))
assert.match(basename(fixture.run), /^keyboard-host-[a-f0-9]{32}$/u)
const fixtureExit = JSON.parse(await readFile(join(fixture.run, 'host-report.json'), 'utf8'))
assert.equal(fixtureExit.format, 'alicization-owned-host-fixture-only-v1')
assert.ok(fixtureExit.passed && fixtureExit.fixtureShutdown && !fixtureExit.syntheticApproval)
assert.equal(report.electronKeyboardExperiences.length, 3)
const database = await setupAlicizationDb(profile, { cardId: 'default', readOnly: true })
let audit: sqlite3Types.Database | undefined
try {
  audit = await new Promise<sqlite3Types.Database>((accept, reject) => {
    const reader = new sqlite3.Database(sqliteFileSystemPath(join(profile, 'alicizations', 'cards', 'default', 'alicization.db')), sqlite3.OPEN_READONLY, error => error ? reject(error) : accept(reader))
  })
  const index = createWindowsKeyboardJournalIndex({ protectedRoot: join(profile, 'alicizations', 'execution-native'), database: () => database })
  const results = []
  for (const experience of report.electronKeyboardExperiences) {
    const view = await database.readLifeState({ executionPlanId: experience.planId })
    const goal = view.obligations.find(item => item.id === experience.obligationId)
    const plan = view.execution?.plans.find(item => item.id === experience.planId)
    assert.ok(goal && plan)
    assert.equal(goal.status, 'fulfilled')
    assert.equal(goal.verification?.verdict, 'satisfied')
    assert.equal(goal.verification?.independent, true)
    assert.equal(plan.rootObligationId, goal.id)
    assert.equal(goal.summary, experience.goal)
    assert.equal(dirname(experience.artifact), fixture.run)
    assert.equal(basename(experience.artifact), `saved-${experience.round}.txt`)
    assert.equal(createHash('sha256').update(await readFile(experience.artifact)).digest('hex'), experience.sha256)
    const effects = (await Promise.all((view.execution?.slices.filter(slice => slice.planId === plan.id) ?? []).map(slice => database.readLifeTurnExecutionEffects(slice.ingressId)))).flat()
    if (report.electronKeyboardUnicodeScope) {
      assert.equal(plan.steps.length, 4)
      assert.equal(await readFile(experience.artifact, 'utf8'), experience.text)
      const replacements = effects.filter(effect => effect.payload.capabilityId === 'tool.desktop_type_text')
      assert.equal(replacements.length, 1)
      assert.equal(replacements[0].status, 'settled')
      assert.equal(replacements[0].receipt?.outcome, 'success')
      assert.equal((replacements[0].payload.parameters as Record<string, unknown>).text, experience.text)
      assert.equal((replacements[0].payload.parameters as Record<string, unknown>).clearExisting, true)
      const observations = effects.filter(effect => effect.payload.capabilityId === 'tool.desktop_list_interactables')
      assert.equal(observations.length, 2)
      assert.ok(observations.every(effect => effect.status === 'settled' && effect.receipt?.outcome === 'success'))
      assert.ok(observations.some(effect => ((effect.receipt?.output as { elements: Array<{ role: string, value: string }> }).elements ?? []).some(element => element.role === 'input' && element.value === experience.text)))
    }
    const keys = effects.filter(effect => effect.payload.capabilityId === 'tool.desktop_press_keys')
    assert.equal(keys.length, 1)
    assert.equal(effects.some(effect => effect.payload.capabilityId === 'tool.filesystem_write_file'), false)
    const effect = keys[0]
    assert.equal(effect.status, 'settled')
    assert.equal(effect.receipt?.outcome, 'success')
    const output = effect.receipt?.output as Record<string, unknown>
    assert.ok(output.ok && output.inputReleased && output.writerStopped)
    const admission = await index.find(effect)
    assert.ok(admission)
    const intent = JSON.parse((await readOwnedKeyboardJournalFile(admission.programRoot, `main-intent-${admission.nonce}.json`)).toString('utf8'))
    const readyRecord = JSON.parse((await readOwnedKeyboardJournalFile(admission.programRoot, `main-ready-${admission.nonce}.json`)).toString('utf8'))
    assert.equal(intent.request.target.windowId, fixture.windowId)
    assert.equal(intent.request.target.processId, fixture.processId)
    assert.equal(intent.request.target.processStartTicks, fixture.startTicks)
    const approvals = await new Promise<Array<{ payload_json: string }>>((accept, reject) => audit!.all('SELECT payload_json FROM audit_logs WHERE action=? AND json_extract(payload_json,\'$.requestId\')=? LIMIT 2', ['local-interface-approval-requested', experience.decision.requestId], (error, rows) => error ? reject(error) : accept(rows as Array<{ payload_json: string }>)))
    assert.equal(approvals.length, 1)
    const approved = JSON.parse(approvals[0].payload_json)
    assert.equal(approved.effectDigest, intent.request.bindingHash)
    assert.equal(approved.operation, 'desktop_press_keys')
    assert.equal(approved.cardId, 'default')
    const chord = compileWindowsKeyboardShortcut('Ctrl+S', 1)
    const receiptRoot = join(admission.programRoot, `alicization-owned-input-${admission.nonce}`)
    const binding = { bindingHash: intent.request.bindingHash, actorProcessId: readyRecord.actorProcessId, parentProcessId: intent.request.parentProcessId, receiptRoot, keys: chord.keys, repeat: chord.repeat }
    const ready = decodeWindowsKeyboardReady(JSON.stringify(readyRecord.ready), binding)
    const actor = decodeWindowsKeyboardResult((await readOwnedKeyboardJournalFile(receiptRoot, 'actor-result.json')).toString('utf8'), binding)
    const guardian = decodeWindowsKeyboardGuardianRelease((await readOwnedKeyboardJournalFile(receiptRoot, 'guardian-release.json')).toString('utf8'), binding.bindingHash)
    assert.ok(actor.inputReleased && guardian.inputReleased && actor.ownedKeys.length === 0)
    assert.equal(createHash('sha256').update(await readOwnedKeyboardJournalFile(admission.programRoot, 'keyboard.exe')).digest('hex'), intent.programSha256)
    const executable = join(admission.programRoot, 'keyboard.exe')
    for (const identity of [{ pid: readyRecord.actorProcessId, creationTimeTicks: ready.actorStartTicks }, { pid: ready.guardianProcessId, creationTimeTicks: ready.guardianStartTicks }])
      assert.equal(inspectOriginalProcess({ ...identity, executable }), 'stopped')
    results.push({ planId: plan.id, goalId: goal.id, effectId: effect.id, originalApprovalRequestId: experience.decision.requestId, artifact: experience.artifact, nativeOwnersStopped: true, nativeInputReleased: true })
  }
  await writeFile(join(root, 'electron-keyboard-after-shutdown.json'), JSON.stringify({ passed: true, readOnly: true, scope: 'Actual Electron native delivery and independently saved owned editor text; fixture save semantics only', results }, null, 2))
}
finally {
  if (audit)
    await new Promise<void>((accept, reject) => audit!.close(error => error ? reject(error) : accept()))
  await database.close()
}
