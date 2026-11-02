import type { ExecutionCriterion } from '../../../../shared/execution-contracts'

import { Buffer } from 'node:buffer'
import { generateKeyPairSync, sign } from 'node:crypto'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { setupAlicizationDb } from '../db'
import { verifyLifeTaskCompletion } from '../life-task-verification-runtime'
import { createCanonicalToolRegistry } from '../turn-os/tool-registry'
import { compileTaskAcceptance, executionDigest } from './acceptance-compiler'
import { readStableExecutionArtifact } from './stable-artifact'
import { executionRecipeReference, executionVerificationRegistryKey, externalReceiptDomain, listExecutionVerificationRecipes, verifyRegisteredExecutionCriterion } from './verification-recipes'
import { createWorkPlanToolSpec } from './work-plan-tool'

const now = 1_800_000_000_000
const rubric = { id: 'report', version: '1', checks: [{ kind: 'text-length', minimum: 10, maximum: 1000 }, { kind: 'includes', values: ['Sources', 'Conclusion'] }, { kind: 'excludes', values: ['TODO'] }] }
const quality = (artifactId = 'report'): ExecutionCriterion => ({ id: 'quality', required: true, proofScope: 'quality', predicate: { kind: 'quality-review', rubricId: executionRecipeReference(rubric), artifactIds: [artifactId] } })
function contract(criteria: ExecutionCriterion[]) {
  return compileTaskAcceptance({ cardId: 'alice', rootObligationId: 'task:delivery', obligationGeneration: 1, revision: 1, sourceInputIds: ['user:request'], criteria, permittedResourceIds: [], permittedEffectPolicyId: 'local', stopConditions: [] })
}
const registry = (quality: unknown[] = [rubric], external: unknown[] = []) => JSON.stringify({ version: 1, quality, external })

async function withRoot(run: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'alicization-verifier-'))
  try {
    await run(root)
  }
  finally { await rm(root, { recursive: true, force: true }) }
}

describe('registered production verification recipes', () => {
  it('finishes the real responsibility only after actual artifacts satisfy the pinned rubric', async () => withRoot(async (root) => {
    const database = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      const path = join(root, 'report.txt')
      await writeFile(path, 'Sources: local\nConclusion: TODO')
      await database.setMetaValue(executionVerificationRegistryKey, registry())
      const thread = await database.upsertTaskThread({ id: 'delivery', status: 'planned', kind: 'mixed', goal: 'Deliver a report with the accepted rubric', metadata: { acceptanceCriteria: [{ id: 'report', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path, includes: ['Sources', 'Conclusion'] } }, quality()] } })
      await database.upsertTaskThread({ ...thread, status: 'completed', expectedUpdatedAt: thread.updatedAt })
      const verify = () => verifyLifeTaskCompletion({ cardId: 'alice', threadId: 'delivery', read: database.readLifeState, commit: database.commitLifeState, readSetting: database.getMetaValue, database })
      expect(await verify()).toMatchObject({ verdict: 'not-satisfied', independent: true })
      let goal = (await database.readLifeState()).obligations.find(item => item.threadId === thread.id)!
      expect(goal.status).toBe('blocked')
      await writeFile(path, 'Sources: local\nConclusion: checked')
      await database.commitLifeState({ cardId: 'alice', operationKey: 'retry-independent-review', changes: [], mutations: [{ type: 'obligation-update', id: goal.id, expectedGeneration: goal.generation, expectedRevision: goal.revision, status: 'verifying' }] })
      const checked = await verify()
      expect(checked).toMatchObject({ verdict: 'satisfied', independent: true })
      expect(JSON.stringify(checked?.evidence)).toContain('registered-deterministic-rubric')
      expect(JSON.stringify(checked?.evidence)).not.toContain('Sources: local')
      goal = (await database.readLifeState()).obligations.find(item => item.threadId === thread.id)!
      expect(goal.status).toBe('fulfilled')
    }
    finally { await database.close() }
  }))

  it('does not allow a changed same-name/version rubric to lower already accepted criteria', async () => withRoot(async (root) => {
    const path = join(root, 'report.txt')
    await writeFile(path, 'TODO')
    const item = quality()
    const accepted = contract([{ id: 'report', required: true, predicate: { kind: 'text-content', path, includes: ['TODO'] }, proofScope: 'structure' }, item])
    const weakened = { ...rubric, checks: [{ kind: 'text-length', minimum: 0, maximum: 1000 }] }
    const checked = await verifyRegisteredExecutionCriterion({ contract: accepted, readSetting: async () => registry([weakened]), now: () => now }, item)
    expect(checked).toMatchObject({ verdict: 'unknown', evidence: { reason: 'quality-rubric-unregistered' } })
  }))

  it('pins current bytes and detects configuration withdrawal while checking', async () => withRoot(async (root) => {
    const path = join(root, 'report.txt')
    await writeFile(path, 'Sources: local\nConclusion: complete')
    const item = quality()
    const accepted = contract([{ id: 'report', required: true, predicate: { kind: 'text-content', path, includes: ['Sources'] }, proofScope: 'structure' }, item])
    let reads = 0
    const checked = await verifyRegisteredExecutionCriterion({ contract: accepted, now: () => now, readSetting: async () => ++reads === 1 ? registry() : undefined }, item)
    expect(checked).toMatchObject({ verdict: 'unknown', evidence: { reason: 'verification-registry-changed' } })
  }))

  it('checks real JSON objects and treats invalid JSON as a failed rubric', async () => withRoot(async (root) => {
    const path = join(root, 'report.json')
    const jsonRubric = { id: 'json', version: '1', checks: [{ kind: 'json-keys', values: ['sources', 'conclusion'] }] }
    const item: ExecutionCriterion = { id: 'quality', required: true, proofScope: 'quality', predicate: { kind: 'quality-review', rubricId: executionRecipeReference(jsonRubric), artifactIds: ['report'] } }
    const accepted = contract([{ id: 'report', required: true, predicate: { kind: 'json-structure', path, requiredKeys: ['sources'] }, proofScope: 'structure' }, item])
    const context = { contract: accepted, now: () => now, readSetting: async () => registry([jsonRubric]) }
    for (const content of ['not JSON', '[]', '{"sources":[]}']) {
      await writeFile(path, content)
      expect((await verifyRegisteredExecutionCriterion(context, item)).verdict).toBe('not-satisfied')
    }
    await writeFile(path, '{"sources":[],"conclusion":"checked"}')
    expect((await verifyRegisteredExecutionCriterion(context, item)).verdict).toBe('satisfied')
  }))

  it('requires nonempty, unique file artifacts in a review contract', () => {
    const external: ExecutionCriterion = { id: 'external', required: true, predicate: { kind: 'external-receipt', recipeId: 'unregistered', targetHash: 'b'.repeat(64) }, proofScope: 'external-state' }
    expect(() => contract([quality('missing')])).toThrow('accepted file')
    expect(() => contract([external, quality('external')])).toThrow('accepted file')
    expect(() => contract([{ ...quality(), predicate: { kind: 'quality-review', rubricId: 'x', artifactIds: [] } }])).toThrow()
  })

  it('publishes content-bound references through the actual provider schema and canonical read-only manifest', async () => {
    const catalog = await listExecutionVerificationRecipes(async () => registry())
    expect(catalog.quality[0].rubricId).toBe(executionRecipeReference(rubric))
    const parameters = createWorkPlanToolSpec(async () => null).parameters
    expect(parameters.safeParse({ goal: 'Check report', criteria: [{ ...quality(), predicate: { kind: 'quality-review', rubricId: catalog.quality[0].rubricId, artifactIds: ['report'] } }], steps: [{ id: 'write', dependsOn: [], capabilityId: 'tool.filesystem_write_file', input: { path: join(tmpdir(), 'report.txt'), content: 'content' }, acceptanceCriterionIds: [] }] }).success).toBe(true)
    expect(createCanonicalToolRegistry().resolveActive('tool.life_list_execution_verifiers')?.effects).toMatchObject({ sideEffect: 'read', retryClass: 'read-only' })
  })

  it.each(['missing', 'malformed', 'duplicate', 'oversized'] as const)('does not activate %s configuration', async (fault) => {
    const raw = fault === 'missing' ? undefined : fault === 'malformed' ? '{}' : fault === 'duplicate' ? registry([rubric, rubric]) : 'x'.repeat(131_073)
    expect(await listExecutionVerificationRecipes(async () => raw)).toEqual({ quality: [], external: [] })
    const item: ExecutionCriterion = { id: 'external', required: true, proofScope: 'external-state', predicate: { kind: 'external-receipt', recipeId: 'unregistered', targetHash: 'b'.repeat(64) } }
    expect((await verifyRegisteredExecutionCriterion({ contract: contract([item]), readSetting: async () => raw }, item)).verdict).toBe('unknown')
  })

  it('bounds actual stable artifact reads rather than trusting a reported length', async () => withRoot(async (root) => {
    const path = join(root, 'oversize.txt')
    await writeFile(path, 'x'.repeat(129))
    await expect(readStableExecutionArtifact(path, 128)).rejects.toThrow('BUDGET')
  }))
})

describe('independently signed external receipt production reader', () => {
  async function fixture(root: string) {
    const key = generateKeyPairSync('ed25519')
    const recipe = { id: 'local-business', version: '1', receiptPath: join(root, 'external-receipt.json'), publicKey: key.publicKey.export({ type: 'spki', format: 'pem' }).toString() }
    const criterion: ExecutionCriterion = { id: 'external', required: true, proofScope: 'external-state', predicate: { kind: 'external-receipt', recipeId: executionRecipeReference(recipe), targetHash: 'a'.repeat(64) } }
    const accepted = contract([criterion])
    const payload = { domain: externalReceiptDomain, receiptId: 'service:42', cardId: 'alice', rootObligationId: accepted.rootObligationId, obligationGeneration: 1, contractHash: accepted.contractHash, criterionId: criterion.id, targetHash: 'a'.repeat(64), verdict: 'applied', observedAt: now - 1000, expiresAt: now + 60_000 }
    const save = async (value: typeof payload = payload, signer = key.privateKey) => writeFile(recipe.receiptPath, JSON.stringify({ payload: value, signature: sign(null, Buffer.from(executionDigest(value)), signer).toString('base64') }))
    const context = { contract: accepted, readSetting: async () => registry([], [recipe]), now: () => now }
    return { accepted, criterion, context, recipe, payload, save }
  }

  it('reads signed current service state and persists actual task completion without executing the original action', async () => withRoot(async (root) => {
    const f = await fixture(root)
    const database = await setupAlicizationDb(root, { cardId: 'alice' })
    try {
      await database.setMetaValue(executionVerificationRegistryKey, registry([], [f.recipe]))
      const thread = await database.upsertTaskThread({ id: 'delivery', status: 'planned', kind: 'mixed', goal: 'Check an independently issued receipt', metadata: { acceptanceCriteria: [f.criterion] } })
      await database.upsertTaskThread({ ...thread, status: 'completed', expectedUpdatedAt: thread.updatedAt })
      const goal = (await database.readLifeState()).obligations.find(item => item.threadId === thread.id)!
      await f.save({ ...f.payload, observedAt: Date.now() - 1000, expiresAt: Date.now() + 60_000, contractHash: goal.proof.acceptance!.contractHash })
      const checked = await verifyLifeTaskCompletion({ cardId: 'alice', threadId: thread.id, read: database.readLifeState, commit: database.commitLifeState, readSetting: database.getMetaValue, database })
      expect(checked).toMatchObject({ verdict: 'satisfied', independent: true })
      expect((await database.readLifeState()).obligations.find(item => item.threadId === thread.id)?.status).toBe('fulfilled')
      expect(JSON.stringify(checked?.evidence)).toContain('service:42')
      const catalog = await listExecutionVerificationRecipes(database.getMetaValue)
      expect(JSON.stringify(catalog)).not.toContain(f.recipe.receiptPath)
      expect(JSON.stringify(catalog)).not.toContain('PUBLIC KEY')
    }
    finally { await database.close() }
  }))

  it.each([
    ['cardId', 'another-person'],
    ['rootObligationId', 'task:another'],
    ['obligationGeneration', 2],
    ['contractHash', 'b'.repeat(64)],
    ['criterionId', 'another'],
    ['targetHash', 'b'.repeat(64)],
    ['expiresAt', now],
    ['observedAt', now + 1],
  ] as const)('rejects a valid signature bound to a wrong or expired %s', async (field, value) => withRoot(async (root) => {
    const f = await fixture(root)
    await f.save({ ...f.payload, [field]: value })
    expect((await verifyRegisteredExecutionCriterion(f.context, f.criterion)).verdict).toBe('unknown')
  }))

  it('rejects forgery and preserves not-applied/unknown without replay', async () => withRoot(async (root) => {
    const f = await fixture(root)
    await f.save(f.payload, generateKeyPairSync('ed25519').privateKey)
    expect(await verifyRegisteredExecutionCriterion(f.context, f.criterion)).toMatchObject({ verdict: 'unknown', evidence: { reason: 'external-receipt-signature-invalid' } })
    await f.save({ ...f.payload, verdict: 'not-applied' })
    expect((await verifyRegisteredExecutionCriterion(f.context, f.criterion)).verdict).toBe('not-satisfied')
    await f.save({ ...f.payload, verdict: 'unknown' })
    expect((await verifyRegisteredExecutionCriterion(f.context, f.criterion)).verdict).toBe('unknown')
    await f.save()
    expect((await verifyRegisteredExecutionCriterion(f.context, f.criterion)).verdict).toBe('satisfied')
  }))
})
