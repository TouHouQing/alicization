import type { LifeEffect } from '../../../../shared/life-contracts'
import type { ExecutionRecoveryChannel } from './registered-effect-recovery'

import { Buffer } from 'node:buffer'
import { generateKeyPairSync, sign } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { setupAlicizationDb } from '../db'
import { createLifeTurnRuntime } from '../life-turn-runtime'
import { executionDigest } from './acceptance-compiler'
import { recoverExecutionEffect } from './effect-recovery-runtime'
import { createRegisteredEffectRecovery, executionEffectIdentityHash, externalEffectReceiptDomain } from './registered-effect-recovery'
import { createExecutionResourceBroker } from './resource-broker'
import { executionVerificationRegistryKey } from './verification-recipes'

const channels: Array<[ExecutionRecoveryChannel, string]> = [['cli', 'tool.cli_executor_run'], ['coding-agent', 'coding_agent'], ['browser', 'tool.browser_click_element'], ['desktop', 'tool.desktop_click_element'], ['external', 'plugin.external_submit']]

describe('registered independent recovery across production execution channels', () => {
  it.each(channels.flatMap(([channel, capabilityId]) => ['applied', 'not-applied', 'unknown'].map(verdict => ({ channel, capabilityId, verdict }))))('persists $channel/$verdict reconciliation without replaying the action', async ({ channel, capabilityId, verdict }) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-signed-effect-'))
    let database = await setupAlicizationDb(root, { cardId: 'alice' })
    const broker = createExecutionResourceBroker()
    try {
      const life = createLifeTurnRuntime({ resourceBroker: broker, read: () => database.readLifeState(), commit: input => database.commitLifeState(input), getIngress: id => database.getLifeIngress(id), getEffect: id => database.getLifeEffect(id), now: Date.now })
      await life.admit({ cardId: 'alice', turnId: 'request', conversationId: 'chat', messages: [{ role: 'user', content: 'Perform one accepted action' }] }, new AbortController().signal)
      const action = await life.beforeAction({ cardId: 'alice', turnId: 'request', actionId: 'submit', capabilityId, parameters: { operation: 'submit', nonce: 'current-request' } }, new AbortController().signal)
      await life.afterAction({ cardId: 'alice', id: action.id, outcome: 'failure', output: { ok: false, effectMayHaveOccurred: true }, interrupted: true })
      const effect = (await database.getLifeEffect(action.id))!
      const original = await database.getLifeIngress(`observation:${effect.id}`)
      const key = generateKeyPairSync('ed25519')
      const recipe = { id: 'business-state', version: '1', channel, capabilityIds: [capabilityId], receiptPath: join(root, 'service-state.json'), publicKey: key.publicKey.export({ type: 'spki', format: 'pem' }).toString() }
      await database.setMetaValue(executionVerificationRegistryKey, JSON.stringify({ version: 1, quality: [], external: [], reconciliation: [recipe] }))
      const payload = { domain: externalEffectReceiptDomain, receiptId: 'service:current-action', cardId: 'alice', channel, effectId: effect.id, effectHash: executionEffectIdentityHash(effect), verdict, observedAt: Date.now() - 1000, expiresAt: Date.now() + 60_000, output: { ok: verdict === 'applied', serviceTransaction: 'one-transaction' } }
      const save = async () => writeFile(recipe.receiptPath, JSON.stringify({ payload, signature: sign(null, Buffer.from(executionDigest(payload)), key.privateKey).toString('base64') }))
      await save()
      const reader = createRegisteredEffectRecovery({ readSetting: database.getMetaValue, cardId: () => 'alice' })
      const observe = { [channel]: (candidate: LifeEffect) => reader(channel, candidate) }
      const stopped = vi.fn(() => false)
      expect(await recoverExecutionEffect({ database, broker, effect, writerStopped: stopped, observe })).toBeNull()
      expect((await database.getLifeEffect(effect.id))?.status).toBe('uncertain')
      expect(broker.snapshot()).toHaveLength(1)
      // Even a genuinely signed receipt for another action cannot release it.
      payload.effectHash = 'b'.repeat(64)
      await save()
      expect(await recoverExecutionEffect({ database, broker, effect, writerStopped: () => true, observe })).toBeNull()
      expect(broker.snapshot()).toHaveLength(1)
      payload.effectHash = executionEffectIdentityHash(effect)
      await save()
      const result = await recoverExecutionEffect({ database, broker, effect, writerStopped: () => true, observe })
      if (verdict === 'unknown')
        expect(result).toBeNull()
      else
        expect(result).toMatchObject({ effectId: effect.id, verdict, independent: true })
      expect(broker.snapshot()).toHaveLength(verdict === 'unknown' ? 1 : 0)
      expect(await database.getLifeIngress(`observation:${effect.id}`)).toEqual(original)
      await database.close()
      database = await setupAlicizationDb(root, { cardId: 'alice' })
      expect((await database.getLifeEffect(effect.id))?.status).toBe(verdict === 'applied' ? 'settled' : verdict === 'not-applied' ? 'failed' : 'uncertain')
      if (result)
        expect((await database.getLifeIngress(result.observationId))?.source).toBe('execution-reconciliation')
      expect(await recoverExecutionEffect({ database, broker, effect: (await database.getLifeEffect(effect.id))!, writerStopped: () => true, observe })).toBeNull()
    }
    finally {
      await database.close()
      await rm(root, { recursive: true, force: true })
    }
  })

  it.each(channels.flatMap(([channel, capabilityId]) => ['forged', 'expired', 'wrong-card', 'wrong-channel', 'withdrawn', 'ambiguous', 'contradictory-output', 'not-applied-success', 'not-applied-maybe', 'not-applied-running'].map(fault => ({ channel, capabilityId, fault }))))('retains unknown state for $channel/$fault independent receipts', async ({ channel, capabilityId, fault }) => {
    const root = await mkdtemp(join(tmpdir(), 'alicization-invalid-receipt-'))
    try {
      const key = generateKeyPairSync('ed25519')
      const effect: LifeEffect = { id: 'effect', operationKey: 'effect', kind: 'execute', turnId: 'turn', actionId: 'submit', generation: 1, status: 'uncertain', payload: { capabilityId, parameters: { selector: 'current-ref' } }, receipt: null, leaseUntil: null }
      const recipe = { id: 'receipt', version: '1', channel, capabilityIds: [capabilityId], receiptPath: join(root, 'receipt.json'), publicKey: key.publicKey.export({ type: 'spki', format: 'pem' }).toString() }
      const payload = { domain: externalEffectReceiptDomain, receiptId: 'receipt', cardId: fault === 'wrong-card' ? 'someone-else' : 'alice', channel: fault === 'wrong-channel' ? channel === 'browser' ? 'desktop' : 'browser' : channel, effectId: effect.id, effectHash: executionEffectIdentityHash(effect), verdict: fault.startsWith('not-applied-') ? 'not-applied' : 'applied', observedAt: Date.now() - 1000, expiresAt: fault === 'expired' ? Date.now() - 1 : Date.now() + 60_000, output: { ok: fault === 'not-applied-success' || !fault.startsWith('not-applied-') && fault !== 'contradictory-output', ...(fault === 'not-applied-maybe' ? { effectMayHaveOccurred: true } : {}), ...(fault === 'not-applied-running' ? { executionStopped: false } : {}) } }
      await writeFile(recipe.receiptPath, JSON.stringify({ payload, signature: sign(null, Buffer.from(executionDigest(payload)), fault === 'forged' ? generateKeyPairSync('ed25519').privateKey : key.privateKey).toString('base64') }))
      let reads = 0
      const reader = createRegisteredEffectRecovery({ cardId: () => 'alice', readSetting: async () => {
        if (++reads > 1 && fault === 'withdrawn')
          return undefined
        return JSON.stringify({ version: 1, quality: [], external: [], reconciliation: fault === 'ambiguous' ? [recipe, { ...recipe, id: 'second' }] : [recipe] })
      } })
      expect(await reader(channel, effect)).toMatchObject({ verdict: 'unknown', independent: true })
    }
    finally { await rm(root, { recursive: true, force: true }) }
  })
})
