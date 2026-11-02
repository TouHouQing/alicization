import type { ExecutionVerifierCommand, ExecutionVerifierState, ExecutionVerifierSummary } from '../../../../shared/execution-verification-contracts'
import type { LifeCommitInput, LifeCommitReceipt, LifeMutation } from '../../../../shared/life-contracts'
import type { LifeTransaction } from '../life-transaction'

import { createHash, createPublicKey, randomUUID } from 'node:crypto'

import { applyLifeIngress } from '../life-ingress-repository'
import { executionDigest } from './acceptance-compiler'
import { executionRecipeReference, executionVerificationRegistryKey, parseExecutionVerificationRegistry } from './verification-recipes'

export function validateExecutionVerificationConfiguration(raw: string) {
  const registry = parseExecutionVerificationRegistry(raw)
  for (const rubric of registry.quality) {
    if (rubric.checks.some(check => check.kind === 'text-length' && check.minimum > check.maximum))
      throw new Error('A quality rule has an invalid length interval')
  }
  const channels = new Set<string>()
  for (const recipe of [...registry.external, ...registry.reconciliation]) {
    if (createPublicKey(recipe.publicKey).asymmetricKeyType !== 'ed25519')
      throw new Error('An external receipt requires an Ed25519 public key')
  }
  for (const recipe of registry.reconciliation) {
    for (const capability of recipe.capabilityIds) {
      const key = `${recipe.channel}:${capability}`
      if (channels.has(key))
        throw new Error('Only one independent recovery recipe can own a channel capability')
      channels.add(key)
    }
  }
  return registry
}

function summaries(registry: ReturnType<typeof parseExecutionVerificationRegistry>): ExecutionVerifierSummary[] {
  const external = (entry: (typeof registry.external)[number], scope: 'external-state' | 'reconciliation'): ExecutionVerifierSummary => ({ id: entry.id, reference: executionRecipeReference(entry), version: entry.version, scope, receiptPath: entry.receiptPath, publicKeyFingerprint: createHash('sha256').update(createPublicKey(entry.publicKey).export({ format: 'der', type: 'spki' })).digest('hex') })
  return [
    ...registry.quality.map(entry => ({ id: entry.id, reference: executionRecipeReference(entry), version: entry.version, scope: 'quality' as const })),
    ...registry.external.map(entry => external(entry, 'external-state')),
    ...registry.reconciliation.map(entry => external(entry, 'reconciliation')),
  ]
}

/** Configuration and its audit commit atomically through the life writer. */
export async function applyExecutionVerificationConfiguration(tx: LifeTransaction, mutation: Extract<LifeMutation, { type: 'execution-verifiers-configure' }>) {
  const registry = validateExecutionVerificationConfiguration(mutation.registry)
  const previous = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key=?', [executionVerificationRegistryKey])
  if (executionDigest(previous?.value ?? null) !== mutation.expectedHash)
    throw new Error('Verification settings changed; review the configuration again')
  const normalized = JSON.stringify(registry)
  await tx.run('INSERT INTO alicization_meta(key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at', [executionVerificationRegistryKey, normalized, tx.now])
  const id = `execution-verifiers:${tx.commitId}`
  await applyLifeIngress(tx, { type: 'ingress-accept', ingress: { id, kind: 'feedback', source: 'execution-verifier-configuration', sourceKey: id, occurredAt: tx.now, payload: { previousHash: mutation.expectedHash, registryHash: executionDigest(normalized), items: summaries(registry) } } })
  await applyLifeIngress(tx, { type: 'ingress-settle', id, status: 'settled' })
}

/** Trusted local settings only. Preview tokens belong to one card and surface. */
export function createExecutionVerificationConfiguration(options: {
  cardId: () => string
  readSetting: (key: string) => Promise<string | undefined>
  commit: (input: LifeCommitInput) => Promise<LifeCommitReceipt>
  now?: () => number
}) {
  const pending = new Map<number, { token: string, cardId: string, registry: string, expectedHash: string, expiresAt: number }>()
  const now = options.now ?? Date.now
  async function snapshot(): Promise<ExecutionVerifierState> {
    const raw = await options.readSetting(executionVerificationRegistryKey)
    return { registryHash: executionDigest(raw ?? null), items: raw ? summaries(validateExecutionVerificationConfiguration(raw)) : [] }
  }
  return async (input: ExecutionVerifierCommand, surfaceId: number): Promise<ExecutionVerifierState> => {
    for (const [key, value] of pending) {
      if (value.expiresAt <= now())
        pending.delete(key)
    }
    if (input.cardId !== options.cardId())
      throw new Error('Verification settings crossed the current card owner')
    if (input.action === 'apply') {
      const preview = pending.get(surfaceId)
      pending.delete(surfaceId)
      if (!preview || preview.token !== input.token || preview.cardId !== input.cardId || preview.expiresAt <= now())
        throw new Error('Verification settings confirmation expired; review it again')
      await options.commit({ cardId: input.cardId, operationKey: `execution-verifier-config:${input.token}`, changes: [], mutations: [{ type: 'execution-verifiers-configure', registry: preview.registry, expectedHash: preview.expectedHash }] })
      if (input.cardId !== options.cardId())
        throw new Error('Verification settings owner changed after commit')
      const state = await snapshot()
      if (input.cardId !== options.cardId())
        throw new Error('Verification settings owner changed while reading')
      return state
    }
    const state = await snapshot()
    if (input.cardId !== options.cardId())
      throw new Error('Verification settings owner changed while reading')
    if (input.action === 'list')
      return state
    const registry = validateExecutionVerificationConfiguration(input.registry)
    if (pending.size >= 64 && !pending.has(surfaceId))
      throw new Error('Too many verification settings confirmations')
    const preview = { token: randomUUID(), cardId: input.cardId, registry: JSON.stringify(registry), expectedHash: state.registryHash, expiresAt: now() + 120_000 }
    pending.set(surfaceId, preview)
    return { ...state, preview: { token: preview.token, expiresAt: preview.expiresAt, items: summaries(registry) } }
  }
}
