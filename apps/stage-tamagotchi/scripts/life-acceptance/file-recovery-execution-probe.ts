import assert from 'node:assert/strict'
import process, { env } from 'node:process'

import { Buffer } from 'node:buffer'
import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { appendFile, readFile, utimes, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'

import { app, BrowserWindow, safeStorage } from 'electron'

import { callLocalFilesystem, inspectFilesystemWritePrecondition } from '../../src/main/services/airi/mcp-servers/local-filesystem'
import { withActionDispatch } from '../../src/main/services/alicization/execution/action-dispatch-context'
import { createDesktopFileRecovery } from '../../src/main/services/alicization/execution/desktop-file-recovery'
import { controlFileRecoveryProcess } from '../../src/main/services/alicization/execution/file-recovery-process'
import { createHostFileRecoveryControl } from '../../src/main/services/alicization/execution/host-file-recovery-control'
import { createExecutionResourceBroker } from '../../src/main/services/alicization/execution/resource-broker'
import { applyPendingLifeRestore, createLifeBackupRuntime } from '../../src/main/services/alicization/life-backup-runtime'
import { lifeSchemaVersion } from '../../src/main/services/alicization/life-schema-version'
import { createLifeTurnRuntime } from '../../src/main/services/alicization/life-turn-runtime'
import { createCanonicalToolRegistry } from '../../src/main/services/alicization/turn-os/tool-registry'

assert.match(env.LIFE_QA_PRIVATE_DESKTOP ?? '', /^AlicizationQA_[a-f\d]{32}$/u)
assert(env.LIFE_QA_PROCESS_REGISTRY)
const root = resolve(env.LIFE_FILE_RECOVERY_PROBE_ROOT!)
assert(root.startsWith(`${resolve('output')}\\`))
const phase = env.LIFE_FILE_RECOVERY_PHASE
assert(phase === 'capture' || phase === 'reopen' || phase === 'ui-seed')
const profile = phase === 'ui-seed' ? resolve(env.LIFE_FILE_RECOVERY_PROFILE!) : join(root, 'alicization-life-file-recovery-profile')
if (phase === 'ui-seed')
  assert.match(basename(profile), /^alicization-life-product-regression-[\w-]+$/u)
mkdirSync(profile, { recursive: true })
app.setPath('userData', profile)
app.disableHardwareAcceleration()
app.on('window-all-closed', () => {})
const cardId = phase === 'ui-seed' ? 'default' : 'synthetic-file-recovery-probe'
const digest = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

async function main() {
  await app.whenReady()
  const window = new BrowserWindow({ show: false, webPreferences: { sandbox: true } })
  await window.loadURL('data:text/plain,Synthetic%20file%20recovery%20probe')
  const desktop = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', resolve('apps/stage-tamagotchi/scripts/life-acceptance/assert-private-desktop.ps1'), '-ExpectedDesktop', env.LIFE_QA_PRIVATE_DESKTOP!, '-RuntimePid', String(process.pid)], { encoding: 'utf8', windowsHide: true, timeout: 15000 }))
  await appendFile(env.LIFE_QA_PROCESS_REGISTRY!, `${JSON.stringify({ pid: process.pid, executable: process.execPath, profile, ...desktop })}\n`)
  const checks: string[] = []
  const check = (name: string, condition: boolean) => {
    assert(condition, name)
    checks.push(name)
  }
  const { setupAlicizationDb } = await import('../../src/main/services/alicization/db')
  let db = await setupAlicizationDb(phase === 'ui-seed' ? profile : join(root, 'db'), { cardId })
  let versions = createDesktopFileRecovery(db)
  const broker = createExecutionResourceBroker()
  const path = join(root, 'owned-file.bin')
  const report: Record<string, unknown> = { passed: false, phase, scope: 'actual-Electron-DPAPI-three-native-host-restores-and-identity-backup-only-no-renderer-UI-acceptance', syntheticIdentity: true, desktop, profile, checks }
  const backupRuntime = () => createLifeBackupRuntime({ userDataPath: join(root, 'db'), cardId: () => cardId, snapshot: db.snapshotLifeDatabase, state: db.readLifeState, schema: async () => lifeSchemaVersion })
  try {
    check('actual-Windows-encryption-available', process.platform === 'win32' && safeStorage.isEncryptionAvailable())
    if (phase !== 'reopen') {
      let previous = Buffer.concat([Buffer.from(`synthetic-private-original-${randomUUID()}`), Buffer.from([0, 255, 128])])
      await writeFile(path, previous, { flag: 'wx' })
      const records = []
      let backup: { id: string, manifestHash: string } | undefined
      for (let round = 1; round <= 3; round++) {
        const turnId = `capture-${round}`
        const signal = new AbortController().signal
        const life = createLifeTurnRuntime({ fileRecovery: versions.forEffect, resourceBroker: broker, read: db.readLifeState, commit: db.commitLifeState, getIngress: db.getLifeIngress, getEffect: db.getLifeEffect, now: Date.now })
        await life.admit({ cardId, turnId, conversationId: 'synthetic-primary', messages: [{ role: 'user', content: `Synthetic authorized overwrite ${round}` }] }, signal)
        const content = `synthetic-next-version-${randomUUID()}-${round}`
        const parameters = { path, content }
        const writePrecondition = await inspectFilesystemWritePrecondition(path)
        const action = await life.beforeAction({ cardId, turnId, actionId: 'actual-overwrite', capabilityId: 'tool.filesystem_write_file', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, signal)
        await action.authorizeDispatch(parameters)
        const output = await withActionDispatch(action.assertDispatchCurrent, () => callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, writePrecondition, signal }))
        await life.afterAction({ cardId, id: action.id, outcome: 'success', output, interrupted: false })
        const item = (await versions.list(cardId)).entries.find(item => item.effectId === action.id)!
        const record = await versions.original(item.id, cardId)
        check(`round-${round}:actual-original-roundtrip`, Buffer.from(record.bytes!).equals(previous))
        check(`round-${round}:actual-after-image`, record.after?.sha256 === digest(Buffer.from(content)))
        const cipher = await readFile(join(dirname(db.dbPath), 'file-recovery', `${item.id}.blob`))
        check(`round-${round}:ciphertext-not-original-bytes`, !cipher.includes(previous))
        const before = await db.getLifeIngress(`file-version-before:${item.id}`)
        check(`round-${round}:journal-contains-no-original-body`, !JSON.stringify(before?.payload).includes(previous.toString('base64')))
        records.push({ id: item.id, originalHash: digest(previous), afterHash: record.after!.sha256 })
        if (round === 2 && phase === 'capture')
          backup = await backupRuntime().create()
        previous = Buffer.from(content)
      }
      check('all-three-actions-released-ownership', broker.snapshot().length === 0)
      const orphanIds: string[] = []
      if (phase === 'ui-seed') {
        const directory = join(dirname(db.dbPath), 'file-recovery')
        const ciphertext = await readFile(join(directory, `${records[0].id}.blob`))
        for (const [name, bytes] of [['old-cipher', ciphertext], ['zero-length-partial', Buffer.alloc(0)]] as const) {
          const id = digest(Buffer.from(`synthetic-ui-orphan:${name}`))
          const path = join(directory, `${id}.blob`)
          await writeFile(path, bytes, { flag: 'wx' })
          const old = new Date(Date.now() - 172800000)
          await utimes(path, old, old)
          orphanIds.push(id)
        }
      }
      await writeFile(join(root, 'expected.json'), JSON.stringify({ records, currentHash: digest(previous), backup, orphanIds }, null, 2))
    }
    else {
      const expected = JSON.parse(await readFile(join(root, 'expected.json'), 'utf8')) as { records: Array<{ id: string, originalHash: string, afterHash: string }>, currentHash: string, backup: { id: string, manifestHash: string } }
      for (const [index, item] of expected.records.entries()) {
        const restored = await versions.original(item.id, cardId)
        check(`reopened-${index + 1}:actual-key-decryption`, digest(restored.bytes!) === item.originalHash)
        check(`reopened-${index + 1}:persisted-after-image`, restored.after?.sha256 === item.afterHash)
      }
      check('actual-current-file-survived-process-exit', digest(await readFile(path)) === expected.currentHash)
      const host = createHostFileRecoveryControl({ database: () => db, versions: () => versions, broker, otherWritersStopped: () => true, inspectNativeProcess: process => controlFileRecoveryProcess('inspect', process), stopNativeProcess: async process => await controlFileRecoveryProcess('stop', process) === 'stopped' ? 'stopped' : 'unknown' })
      const restores = []
      try {
        for (const [index, item] of [...expected.records].reverse().entries()) {
          const preview = await host.preview(cardId, item.id, 17)
          check(`restore-${index + 1}:exact-current-version-confirmation`, preview.state === 'ready' && Boolean(preview.token))
          const result = await host.restore(cardId, item.id, preview.token!, 17)
          check(`restore-${index + 1}:actual-native-original-bytes`, result.state === 'restored' && digest(await readFile(path)) === item.originalHash)
          const effect = await db.getLifeEffect(result.effectId)
          check(`restore-${index + 1}:canonical-independent-file-receipt`, effect?.status === 'settled' && effect.receipt?.outcome === 'success' && (effect.receipt.output as Record<string, unknown>)?.proofScope === 'file-version-only-no-original-goal-completion')
          check(`restore-${index + 1}:actual-process-stop`, await host.nativeStopped(cardId, result.effectId))
          restores.push(result.effectId)
        }
      }
      finally { await host.dispose() }
      check('native-audit-and-stop-released-ownership', broker.snapshot().length === 0)
      await backupRuntime().requestRestore(expected.backup.id, expected.backup.manifestHash)
      await db.close()
      await applyPendingLifeRestore(join(root, 'db'))
      db = await setupAlicizationDb(join(root, 'db'), { cardId })
      versions = createDesktopFileRecovery(db)
      check('identity-restore-never-replays-file-writes', digest(await readFile(path)) === expected.records[0].originalHash)
      for (const [index, item] of expected.records.entries())
        check(`backup-reopen-${index + 1}:actual-DPAPI-decryption`, digest((await versions.original(item.id, cardId)).bytes!) === item.originalHash)
      for (const [index, effectId] of restores.entries()) {
        const effect = await db.getLifeEffect(effectId)
        check(`backup-reopen-${index + 1}:operational-effect-preserved`, effect?.status === 'uncertain' && effect.payload.capabilityId === 'host.filesystem_restore_version')
      }
    }
    report.passed = true
  }
  catch (error) {
    report.failure = String(error)
    throw error
  }
  finally {
    await db.close()
    window.destroy()
    report.finishedAt = new Date().toISOString()
    await writeFile(join(root, `${phase}.json`), JSON.stringify(report, null, 2))
    console.info(JSON.stringify({ phase, passed: report.passed, checks: checks.length }))
  }
}
void main().then(() => app.exit(0), (error) => {
  console.error(error)
  app.exit(1)
})
