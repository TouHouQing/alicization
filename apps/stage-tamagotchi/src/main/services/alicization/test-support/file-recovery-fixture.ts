import type { AlicizationDbService } from '../db'

import { Buffer } from 'node:buffer'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { mkdtemp, realpath, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { callLocalFilesystem, inspectFilesystemWritePrecondition } from '../../airi/mcp-servers/local-filesystem'
import { setupAlicizationDb } from '../db'
import { inheritActionNotStarted, withActionDispatch } from '../execution/action-dispatch-context'
import { createFileRecoveryVault } from '../execution/file-recovery-vault'
import { createFileVersionRepository } from '../execution/file-version-repository'
import { createExecutionResourceBroker } from '../execution/resource-broker'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'

export async function createFileRecoveryTestFixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'life-file-version-')))
  let db = await setupAlicizationDb(root, { cardId: 'alice' })
  let database: AlicizationDbService = db
  const broker = createExecutionResourceBroker()
  const key = randomBytes(32)
  let onSeal: (() => Promise<void>) | undefined
  const makeVault = () => createFileRecoveryVault({ root: join(dirname(db.dbPath), 'file-recovery'), seal: async (bytes) => {
    await onSeal?.()
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', key, iv)
    const encrypted = Buffer.concat([cipher.update(bytes), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted])
  }, unseal: (raw) => {
    const bytes = Buffer.from(raw)
    const cipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12))
    cipher.setAuthTag(bytes.subarray(12, 28))
    return Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()])
  } })
  let versions = createFileVersionRepository({ database: () => database, vault: makeVault() })
  const life = createLifeTurnRuntime({ fileRecovery: owner => versions.forEffect(owner), resourceBroker: broker, read: () => db.readLifeState(), getIngress: id => db.getLifeIngress(id), getEffect: id => db.getLifeEffect(id), commit: (input, options) => database.commitLifeState(input, options), now: Date.now })
  const signal = new AbortController().signal
  await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'primary', messages: [{ role: 'user', content: '将指定文件保存为新版本。' }] }, signal)
  let serial = 0
  async function save(path: string, content: string, actionSignal = signal) {
    const parameters = { path, content }
    const writePrecondition = await inspectFilesystemWritePrecondition(path)
    const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: `save-${++serial}`, capabilityId: 'tool.filesystem_write_file', parameters, effectContract: createCanonicalToolRegistry().resolveActive('tool.filesystem_write_file')!.effects }, actionSignal)
    await action.authorizeDispatch(parameters)
    try {
      const result = await withActionDispatch(action.assertDispatchCurrent, () => callLocalFilesystem({ toolName: 'write_file', arguments: parameters, workspace: root, signal: actionSignal, writePrecondition }))
      await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'success', output: result, interrupted: false })
      return action.id
    }
    catch (error) {
      await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: inheritActionNotStarted(error, { ok: false, effectMayHaveOccurred: Boolean((error as { effectMayHaveOccurred?: boolean }).effectMayHaveOccurred) }), interrupted: actionSignal.aborted })
      throw error
    }
  }
  return { root, get versions() { return versions }, save, broker, recover: () => life.recover('alice'), db: () => db, databasePort: () => database, onSeal: (callback: typeof onSeal) => { onSeal = callback }, database: (value: AlicizationDbService) => { database = value }, reopen: async (between?: () => Promise<unknown>) => {
    await db.close()
    try { await between?.() }
    finally {
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      database = db
      versions = createFileVersionRepository({ database: () => database, vault: makeVault() })
    }
  }, close: async () => { await db.close(); await rm(root, { recursive: true, force: true }) } }
}
