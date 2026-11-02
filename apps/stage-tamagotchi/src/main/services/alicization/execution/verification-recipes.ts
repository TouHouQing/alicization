import type { ExecutionCriterion, TaskAcceptance } from '../../../../shared/execution-contracts'
import type { LifeGoalVerification } from '../../../../shared/life-contracts'
import type { executionReviewArtifacts } from './criterion-receipts'

import { Buffer } from 'node:buffer'
import { createPublicKey, randomUUID, verify } from 'node:crypto'
import { isAbsolute } from 'node:path'

import * as v from 'valibot'

import { executionDigest } from './acceptance-compiler'
import { executionReviewArtifacts as reviewArtifacts } from './criterion-receipts'
import { readStableExecutionArtifact } from './stable-artifact'

// Host configuration, never an executor-produced success flag or shell command.
export const executionVerificationRegistryKey = 'execution.verification-registry.v1'
const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const text = v.pipe(v.string(), v.minLength(1), v.maxLength(8192))
const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const integer = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(4_194_304))
const checks = v.pipe(v.array(v.variant('kind', [
  v.strictObject({ kind: v.literal('text-length'), minimum: integer, maximum: integer }),
  v.strictObject({ kind: v.literal('includes'), values: v.pipe(v.array(text), v.minLength(1), v.maxLength(64)) }),
  v.strictObject({ kind: v.literal('excludes'), values: v.pipe(v.array(text), v.minLength(1), v.maxLength(64)) }),
  v.strictObject({ kind: v.literal('json-keys'), values: v.pipe(v.array(id), v.minLength(1), v.maxLength(64)) }),
])), v.minLength(1), v.maxLength(32))
const registrySchema = v.strictObject({
  version: v.literal(1),
  quality: v.pipe(v.array(v.strictObject({ id, version: id, checks })), v.maxLength(64)),
  external: v.pipe(v.array(v.strictObject({ id, version: id, receiptPath: v.pipe(text, v.check(isAbsolute)), publicKey: text })), v.maxLength(64)),
  reconciliation: v.optional(v.pipe(v.array(v.strictObject({ id, version: id, channel: v.picklist(['cli', 'coding-agent', 'browser', 'desktop', 'external']), capabilityIds: v.pipe(v.array(id), v.minLength(1), v.maxLength(64)), receiptPath: v.pipe(text, v.check(isAbsolute)), publicKey: text })), v.maxLength(64)), []),
})

/** The accepted reference pins content, so changing a rubric cannot lower a goal. */
export function executionRecipeReference(entry: { id: string } & Record<string, unknown>) {
  const { id, ...definition } = entry
  return `${id}@${executionDigest(definition)}`
}

export function parseExecutionVerificationRegistry(raw: string | undefined) {
  if (!raw || raw.length > 131_072)
    throw new Error('VERIFICATION_REGISTRY_UNAVAILABLE')
  const registry = v.parse(registrySchema, JSON.parse(raw))
  if ([registry.quality, registry.external, registry.reconciliation].some(entries => new Set(entries.map(entry => entry.id)).size !== entries.length || entries.some(entry => executionRecipeReference(entry).length > 512)))
    throw new Error('VERIFICATION_REGISTRY_INVALID_IDS')
  return registry
}

export async function readExecutionVerificationRegistry(readSetting: ExecutionVerificationContext['readSetting']) {
  const raw = await readSetting(executionVerificationRegistryKey)
  return { raw, registry: parseExecutionVerificationRegistry(raw) }
}

/** The host trusts the public key; the executing model never receives a signer. */
export async function readSignedExecutionReceipt(recipe: { receiptPath: string, publicKey: string }) {
  const actual = await readStableExecutionArtifact(recipe.receiptPath, 65_536)
  const envelope = v.parse(v.strictObject({ payload: v.unknown(), signature: v.pipe(v.string(), v.regex(/^[A-Za-z\d+/]{86}==$/u)) }), JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(actual.bytes)))
  const key = createPublicKey(recipe.publicKey)
  if (key.asymmetricKeyType !== 'ed25519' || !verify(null, Buffer.from(executionDigest(envelope.payload)), key, Buffer.from(envelope.signature, 'base64')))
    throw new Error('EXTERNAL_RECEIPT_SIGNATURE_INVALID')
  return { payload: envelope.payload, receiptHash: actual.sha256 }
}

/** Publish references and scope without exposing local receipt paths or keys. */
export async function listExecutionVerificationRecipes(readSetting: ExecutionVerificationContext['readSetting']) {
  try {
    const raw = await readSetting(executionVerificationRegistryKey)
    const registry = parseExecutionVerificationRegistry(raw)
    if (await readSetting(executionVerificationRegistryKey) !== raw)
      throw new Error('VERIFICATION_REGISTRY_CHANGED')
    return {
      quality: registry.quality.map(entry => ({ rubricId: executionRecipeReference(entry), version: entry.version, checks: entry.checks })),
      external: registry.external.map(entry => ({ recipeId: executionRecipeReference(entry), version: entry.version, scope: 'signed-external-state' })),
    }
  }
  catch { return { quality: [], external: [] } }
}
export interface ExecutionVerificationContext {
  contract: TaskAcceptance
  readSetting: (key: string) => Promise<string | undefined>
  readDownload?: Parameters<typeof executionReviewArtifacts>[2]
  now?: () => number
}

function result(now: number, verdict: LifeGoalVerification['verdict'], evidence: Record<string, unknown>): LifeGoalVerification {
  return { id: randomUUID(), kind: 'composite', verifiedAt: now, independent: true, verdict, evidence }
}

export const externalReceiptDomain = 'alicization.execution.external-receipt.v1'
const receiptPayloadSchema = v.strictObject({
  domain: v.literal(externalReceiptDomain),
  receiptId: id,
  cardId: id,
  rootObligationId: id,
  obligationGeneration: v.pipe(v.number(), v.integer(), v.minValue(1)),
  contractHash: hash,
  criterionId: id,
  targetHash: hash,
  verdict: v.picklist(['applied', 'not-applied', 'unknown']),
  observedAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
  expiresAt: v.pipe(v.number(), v.integer(), v.minValue(0)),
})

/** Registered deterministic rubrics and signed independent service receipts. */
export async function verifyRegisteredExecutionCriterion(context: ExecutionVerificationContext, criterion: ExecutionCriterion): Promise<LifeGoalVerification> {
  const now = (context.now ?? Date.now)()
  const unknown = (reason: string) => result(now, 'unknown', { reason, scope: criterion.proofScope })
  try {
    const raw = await context.readSetting(executionVerificationRegistryKey)
    const registry = parseExecutionVerificationRegistry(raw)
    const predicate = criterion.predicate
    let evidence: Record<string, unknown>
    let verdict: LifeGoalVerification['verdict']
    if (predicate.kind === 'quality-review') {
      const rubric = registry.quality.find(entry => executionRecipeReference(entry) === predicate.rubricId)
      if (!rubric)
        return unknown('quality-rubric-unregistered')
      const binding = await reviewArtifacts(context.contract, criterion.id, context.readDownload)
      if (!binding.artifacts.length)
        return unknown('quality-review-has-no-artifacts')
      const observations = []
      for (const artifact of binding.artifacts) {
        const actual = await readStableExecutionArtifact(artifact.path)
        if (actual.sha256 !== artifact.sha256)
          return unknown('quality-artifact-changed')
        const content = new TextDecoder('utf-8', { fatal: true }).decode(actual.bytes)
        const outcomes = rubric.checks.map((check) => {
          if (check.kind === 'text-length')
            return { kind: check.kind, passed: check.minimum <= check.maximum && content.length >= check.minimum && content.length <= check.maximum }
          if (check.kind === 'includes')
            return { kind: check.kind, passed: check.values.every(value => content.includes(value)) }
          if (check.kind === 'excludes')
            return { kind: check.kind, passed: check.values.every(value => !content.includes(value)) }
          try {
            const parsed: unknown = JSON.parse(content)
            return { kind: check.kind, passed: !!parsed && typeof parsed === 'object' && !Array.isArray(parsed) && check.values.every(key => Object.hasOwn(parsed, key)) }
          }
          catch { return { kind: check.kind, passed: false } }
        })
        observations.push({ artifactId: artifact.id, sha256: actual.sha256, outcomes })
      }
      const after = await reviewArtifacts(context.contract, criterion.id, context.readDownload)
      if (binding.fingerprint !== after.fingerprint)
        return unknown('quality-artifact-changed')
      verdict = observations.every(item => item.outcomes.every(check => check.passed)) ? 'satisfied' : 'not-satisfied'
      evidence = { scope: 'quality', evaluator: 'registered-deterministic-rubric', rubricId: rubric.id, rubricVersion: rubric.version, rubricHash: executionDigest(rubric), artifactFingerprint: binding.fingerprint, observations }
    }
    else if (predicate.kind === 'external-receipt') {
      const recipe = registry.external.find(entry => executionRecipeReference(entry) === predicate.recipeId)
      if (!recipe)
        return unknown('external-receipt-recipe-unregistered')
      const actual = await readSignedExecutionReceipt(recipe).catch(() => null)
      if (!actual)
        return unknown('external-receipt-signature-invalid')
      const payload = v.parse(receiptPayloadSchema, actual.payload)
      const contract = context.contract
      if (payload.cardId !== contract.cardId || payload.rootObligationId !== contract.rootObligationId || payload.obligationGeneration !== contract.obligationGeneration || payload.contractHash !== contract.contractHash || payload.criterionId !== criterion.id || payload.targetHash !== predicate.targetHash)
        return unknown('external-receipt-binding-mismatch')
      if (payload.observedAt > now || payload.expiresAt <= now || payload.expiresAt <= payload.observedAt || payload.expiresAt - payload.observedAt > 86_400_000)
        return unknown('external-receipt-expired-or-invalid-time')
      verdict = payload.verdict === 'applied' ? 'satisfied' : payload.verdict === 'not-applied' ? 'not-satisfied' : 'unknown'
      evidence = { scope: 'external-state', recipeId: recipe.id, recipeVersion: recipe.version, receiptId: payload.receiptId, receiptHash: actual.receiptHash, targetHash: predicate.targetHash, observedAt: payload.observedAt, expiresAt: payload.expiresAt }
    }
    else { return unknown('criterion-has-no-registered-recipe') }
    if (await context.readSetting(executionVerificationRegistryKey) !== raw)
      return unknown('verification-registry-changed')
    return result(now, verdict, { ...evidence, registryHash: executionDigest(registry), verifierVersion: 'registered-recipes-v1', contractHash: context.contract.contractHash, criterionId: criterion.id })
  }
  catch { return unknown('registered-verification-unavailable-or-invalid') }
}
