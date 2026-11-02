import type { ExecutionCriterion, TaskAcceptance } from '../../../../shared/execution-contracts'
import type { LifeObligation } from '../../../../shared/life-contracts'

import { createHash } from 'node:crypto'
import { isAbsolute } from 'node:path'
import { platform } from 'node:process'

import * as v from 'valibot'

const id = v.pipe(v.string(), v.minLength(1), v.maxLength(512))
const text = v.pipe(v.string(), v.maxLength(8192))
const path = v.pipe(id, v.check(isAbsolute), v.check((value) => {
  if (platform !== 'win32')
    return true
  // Preserve legitimate extended paths, then reject Windows filename syntax
  // that would make a model's placeholder impossible to verify as an artifact.
  const ordinary = value.startsWith('\\\\?\\') ? value.slice(4) : value
  return !/[<>:"|?*\u0000-\u001F]/u.test(ordinary.replace(/^[a-z]:/iu, ''))
}, 'Artifact paths must use valid filename characters for this host'))
const hash = v.pipe(v.string(), v.regex(/^[a-f\d]{64}$/u))
const strings = v.pipe(v.array(id), v.maxLength(64))
export const executionPredicateSchema = v.variant('kind', [
  v.strictObject({ kind: v.literal('file-bytes'), path, sha256: hash }),
  v.strictObject({ kind: v.literal('file-matches-read'), path, stepId: id }),
  v.strictObject({ kind: v.literal('browser-download'), stepId: id, minimumBytes: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(67_108_864)), sha256: v.optional(hash) }),
  v.strictObject({ kind: v.literal('json-structure'), path, requiredKeys: strings }),
  v.strictObject({ kind: v.literal('text-content'), path, includes: v.pipe(v.array(id), v.minLength(1), v.maxLength(64)) }),
  v.strictObject({ kind: v.literal('directory-members'), path, names: v.pipe(v.array(v.pipe(id, v.check(name => !/[\\/]/u.test(name) && !['.', '..'].includes(name)))), v.maxLength(512)), exact: v.boolean() }),
  v.strictObject({ kind: v.literal('setting'), key: id, expected: text }),
  v.strictObject({ kind: v.literal('interface-state'), channel: v.picklist(['browser', 'desktop']), targetId: id, contentHash: hash, expectedValue: text }),
  v.strictObject({ kind: v.literal('external-receipt'), recipeId: id, targetHash: hash }),
  v.strictObject({ kind: v.literal('quality-review'), rubricId: id, artifactIds: v.pipe(strings, v.minLength(1)) }),
  v.strictObject({ kind: v.literal('user-review'), question: id, artifactIds: strings }),
])
export const executionCriteriaSchema = v.pipe(v.array(v.strictObject({ id, required: v.boolean(), predicate: executionPredicateSchema, proofScope: v.picklist(['bytes', 'structure', 'displayed-state', 'external-state', 'quality', 'user-reported']) })), v.minLength(1), v.maxLength(64))
export const executionProofScopes = { 'file-matches-read': 'bytes', 'browser-download': 'bytes', 'file-bytes': 'bytes', 'json-structure': 'structure', 'text-content': 'structure', 'directory-members': 'structure', 'setting': 'structure', 'interface-state': 'displayed-state', 'external-receipt': 'external-state', 'quality-review': 'quality', 'user-review': 'user-reported' } as const satisfies Record<ExecutionCriterion['predicate']['kind'], ExecutionCriterion['proofScope']>

/** Stable key ordering makes permits and contracts independent of JSON transport order. */
export function executionDigest(value: unknown): string {
  function canonical(item: unknown): unknown {
    if (Array.isArray(item))
      return item.map(canonical)
    if (item && typeof item === 'object')
      return Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)]))
    return item
  }
  const serialized = JSON.stringify(canonical(value))
  if (!serialized || serialized.length > 256_000)
    throw new TypeError('Execution contract exceeds its bounded payload')
  return createHash('sha256').update(serialized).digest('hex')
}

export function compileTaskAcceptance(input: Omit<TaskAcceptance, 'version' | 'criteria' | 'contractHash'> & { criteria: unknown }): TaskAcceptance {
  const criteria = v.parse(executionCriteriaSchema, input.criteria)
  if (!criteria.some(item => item.required) || new Set(criteria.map(item => item.id)).size !== criteria.length)
    throw new TypeError('Acceptance requires unique criteria and at least one required criterion')
  for (const criterion of criteria) {
    if (executionProofScopes[criterion.predicate.kind] !== criterion.proofScope)
      throw new TypeError('Acceptance proof scope does not match its predicate')
    if (criterion.predicate.kind === 'quality-review' || criterion.predicate.kind === 'user-review') {
      const artifacts = criterion.predicate.artifactIds
      if (new Set(artifacts).size !== artifacts.length || artifacts.some(id => !criteria.some(item => item.id === id && ['file-bytes', 'file-matches-read', 'json-structure', 'text-content', 'browser-download'].includes(item.predicate.kind))))
        throw new TypeError('Review artifacts must refer to files through unique accepted file criteria')
    }
  }
  for (const value of [input.cardId, input.rootObligationId, input.permittedEffectPolicyId, ...input.sourceInputIds, ...input.permittedResourceIds])
    v.parse(id, value)
  for (const n of [input.obligationGeneration, input.revision]) {
    if (!Number.isSafeInteger(n) || n < 1)
      throw new TypeError('Acceptance requires a positive generation and revision')
  }
  if (input.sourceInputIds.length > 64 || input.permittedResourceIds.length > 128 || input.stopConditions.length > 32)
    throw new TypeError('Acceptance references exceed their budget')
  const body = { ...input, version: 1 as const, criteria }
  return { ...body, contractHash: executionDigest(body) }
}

export function criteriaFromLegacyProof(proof: LifeObligation['proof']): ExecutionCriterion[] {
  let predicate: ExecutionCriterion['predicate']
  if (proof.kind === 'file' && proof.path && proof.contentHash)
    predicate = { kind: 'file-bytes', path: proof.path, sha256: proof.contentHash.toLowerCase() }
  else if (proof.kind === 'setting' && proof.settingKey && proof.expectedValue != null)
    predicate = { kind: 'setting', key: proof.settingKey, expected: proof.expectedValue }
  else if (proof.kind === 'interface-state' && proof.targetId && proof.contentHash && (proof.channel === 'browser' || proof.channel === 'desktop'))
    predicate = { kind: 'interface-state', targetId: proof.targetId, contentHash: proof.contentHash, expectedValue: proof.expectedValue ?? '', channel: proof.channel }
  else
    predicate = { kind: 'user-review', question: '请检查交付结果是否满足你的要求。', artifactIds: [] }
  return [{ id: 'result', required: true, predicate, proofScope: executionProofScopes[predicate.kind] }]
}
