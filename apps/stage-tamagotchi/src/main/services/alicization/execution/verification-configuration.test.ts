import { generateKeyPairSync } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { executionDigest } from './acceptance-compiler'
import { createExecutionVerificationConfiguration, validateExecutionVerificationConfiguration } from './verification-configuration'
import { executionVerificationRegistryKey, listExecutionVerificationRecipes } from './verification-recipes'

const configuration = JSON.stringify({ version: 1, quality: [{ id: 'report', version: '1', checks: [{ kind: 'includes', values: ['Conclusion'] }] }], external: [] })
const empty = JSON.stringify({ version: 1, quality: [], external: [] })

describe('trusted verification configuration through the single life writer', () => {
  it('requires preview and explicit single-use application, audits it atomically, and preserves it across reopen', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-verifier-settings-'))
    let db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const control = createExecutionVerificationConfiguration({ cardId: () => 'alice', readSetting: db.getMetaValue, commit: db.commitLifeState })
      const before = await db.readLifeState()
      const preview = await control({ cardId: 'alice', action: 'preview', registry: configuration }, 42)
      expect(preview.items).toEqual([])
      expect(preview.preview?.items).toMatchObject([{ id: 'report', scope: 'quality' }])
      expect(await db.getMetaValue(executionVerificationRegistryKey)).toBeUndefined()
      const command = { cardId: 'alice', action: 'apply' as const, token: preview.preview!.token }
      expect(await control(command, 42)).toMatchObject({ items: [{ id: 'report' }] })
      await expect(control(command, 42)).rejects.toThrow('confirmation')
      const after = await db.readLifeState()
      expect(after.owners).toEqual(before.owners)
      expect(after.obligations).toEqual(before.obligations)
      const audit = after.ingress.filter(item => item.source === 'execution-verifier-configuration')
      expect(audit).toHaveLength(1)
      expect(audit[0].status).toBe('settled')
      expect(audit[0].payload.registryHash).toBe(executionDigest(await db.getMetaValue(executionVerificationRegistryKey)))
      await db.close()
      db = await setupAlicizationDb(root, { cardId: 'alice' })
      expect((await listExecutionVerificationRecipes(db.getMetaValue)).quality).toHaveLength(1)
      const renewed = createExecutionVerificationConfiguration({ cardId: () => 'alice', readSetting: db.getMetaValue, commit: db.commitLifeState })
      const removal = await renewed({ cardId: 'alice', action: 'preview', registry: empty }, 42)
      expect(removal.preview!.items).toEqual([])
      await renewed({ cardId: 'alice', action: 'apply', token: removal.preview!.token }, 42)
      expect((await listExecutionVerificationRecipes(db.getMetaValue)).quality).toEqual([])
      expect((await db.readLifeState()).ingress.filter(item => item.source === 'execution-verifier-configuration')).toHaveLength(2)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each(['wrong-surface', 'wrong-card', 'expired', 'concurrent-change'] as const)('rejects %s without overwriting configuration', async (fault) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-verifier-confirmation-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    let clock = Date.now()
    try {
      const control = createExecutionVerificationConfiguration({ cardId: () => 'alice', readSetting: db.getMetaValue, commit: db.commitLifeState, now: () => clock })
      const preview = await control({ cardId: 'alice', action: 'preview', registry: configuration }, 42)
      if (fault === 'expired')
        clock += 120_000
      if (fault === 'concurrent-change')
        await db.setMetaValue(executionVerificationRegistryKey, empty)
      const value = await db.getMetaValue(executionVerificationRegistryKey)
      await expect(control({ cardId: fault === 'wrong-card' ? 'someone-else' : 'alice', action: 'apply', token: preview.preview!.token }, fault === 'wrong-surface' ? 43 : 42)).rejects.toThrow()
      expect(await db.getMetaValue(executionVerificationRegistryKey)).toBe(value)
      expect((await db.readLifeState()).ingress.filter(item => item.source === 'execution-verifier-configuration')).toHaveLength(0)
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rolls configuration back if a later mutation in the same writer transaction fails', async () => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-verifier-atomic-'))
    const db = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await expect(db.commitLifeState({ cardId: 'alice', operationKey: 'failed-configuration', changes: [], mutations: [{ type: 'execution-verifiers-configure', registry: configuration, expectedHash: executionDigest(null) }, { type: 'ingress-settle', id: 'nonexistent', status: 'settled' }] })).rejects.toThrow()
      expect(await db.getMetaValue(executionVerificationRegistryKey)).toBeUndefined()
      expect((await db.readLifeState()).ingress.filter(item => item.source === 'execution-verifier-configuration')).toEqual([])
    }
    finally {
      await db.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it('rejects executable rules, non-signing keys, inverted intervals and duplicate recovery ownership', () => {
    expect(() => validateExecutionVerificationConfiguration(JSON.stringify({ version: 1, quality: [{ id: 'exec', version: '1', checks: [{ kind: 'shell', command: 'anything' }] }], external: [] }))).toThrow()
    expect(() => validateExecutionVerificationConfiguration(JSON.stringify({ version: 1, quality: [{ id: 'length', version: '1', checks: [{ kind: 'text-length', minimum: 10, maximum: 1 }] }], external: [] }))).toThrow('interval')
    const key = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }).toString()
    const recipe = { id: 'external', version: '1', channel: 'browser', capabilityIds: ['tool.browser_click_element'], receiptPath: join(tmpdir(), 'receipt.json'), publicKey: key }
    expect(() => validateExecutionVerificationConfiguration(JSON.stringify({ version: 1, quality: [], external: [], reconciliation: [recipe, { ...recipe, id: 'second' }] }))).toThrow('one independent')
    expect(() => validateExecutionVerificationConfiguration(JSON.stringify({ version: 1, quality: [], external: [{ ...recipe, channel: undefined, capabilityIds: undefined, publicKey: 'not a public key' }] }))).toThrow()
  })
})
