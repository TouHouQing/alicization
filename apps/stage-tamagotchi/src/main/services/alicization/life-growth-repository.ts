import type { LifeEvidenceRef, LifeMutation } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'
import type { AlicizationSelfEvolutionVersionRuntimeSnapshot } from './self-evolution/version-runtime'

import { applyLifeIngress } from './life-ingress-repository'
import { assertLifePolicyActivation } from './life-policy-evaluation'
import { assertLifeId, boundedJson } from './life-transaction'
import { rollbackAlicizationSelfEvolutionCandidate } from './self-evolution/version-runtime'

export function parseLifeGrowthSnapshot(raw: string): AlicizationSelfEvolutionVersionRuntimeSnapshot {
  const value = JSON.parse(raw) as AlicizationSelfEvolutionVersionRuntimeSnapshot
  if (value?.version !== 'self-evolution-version-runtime-v1' || !Array.isArray(value.candidates) || value.candidates.length > 128)
    throw new TypeError('Growth state is invalid; recovery is required')
  const ids = new Set<string>()
  for (const candidate of value.candidates) {
    assertLifeId(candidate.id)
    if (ids.has(candidate.id) || !['shadow', 'active', 'rejected', 'rolled-back'].includes(candidate.status) || candidate.patch?.version !== 'self-revision-state-patch-v1' || !Array.isArray(candidate.validation?.activationBlockedReasons))
      throw new TypeError('Growth candidate is invalid')
    ids.add(candidate.id)
    for (const lane of [candidate.patch.memoryPolicy, candidate.patch.relationshipPosture, candidate.patch.responsePosture, candidate.patch.proactivePolicy]) {
      if (!lane || Object.values(lane).some(item => typeof item !== 'boolean' && (typeof item !== 'number' || !Number.isFinite(item) || item < 0 || item > 1)))
        throw new TypeError('Growth patch is outside its bounded policy scope')
    }
  }
  if (value.activeCandidateId != null && !value.candidates.some(candidate => candidate.id === value.activeCandidateId && candidate.status === 'active'))
    throw new TypeError('Active growth candidate is missing or inactive')
  return value
}

async function sourceIsCurrent(tx: LifeTransaction, source: LifeEvidenceRef) {
  if (source.cardId !== tx.cardId || source.kind !== 'memory_facts')
    return false
  return Boolean(await tx.get(`SELECT 1 FROM memory_fact_versions v JOIN memory_facts f ON f.card_id = v.card_id AND f.id = v.fact_id WHERE v.card_id = ? AND v.fact_id = ? AND CAST(v.version AS TEXT) = ? AND v.recorded_to IS NULL AND v.lifecycle = 'active' AND v.provenance IN ('observed','reported','inferred') AND f.validation_status NOT IN ('disputed','superseded') AND (v.provenance != 'inferred' OR (f.validation_status = 'validated' AND f.confidence >= 0.8)) AND (v.valid_from IS NULL OR v.valid_from <= ?) AND (v.valid_to IS NULL OR v.valid_to > ?)`, [tx.cardId, source.id, source.version, tx.now, tx.now]))
}

export async function applyLifeGrowth(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'growth-save' | 'growth-consumed' }>) {
  assertLifeId(input.key)
  const stored = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', [input.key])
  if (input.type === 'growth-consumed') {
    assertLifeId(input.consumer)
    assertLifeId(input.turnId)
    const snapshot = stored ? parseLifeGrowthSnapshot(stored.value) : null
    const candidate = snapshot?.candidates.find(item => item.id === input.candidateId && item.status === 'active' && item.id === snapshot.activeCandidateId)
    if (!candidate || !candidate.sourceEvidence?.length)
      throw new Error('Only a grounded active growth candidate can be consumed')
    await assertLifePolicyActivation(tx, candidate, false)
    for (const source of candidate.sourceEvidence) {
      if (!await sourceIsCurrent(tx, source))
        throw new Error('Growth source became invalid before production consumption')
    }
    const id = `growth-use:${input.consumer}:${input.turnId}:${candidate.id}`
    await applyLifeIngress(tx, { type: 'ingress-accept', ingress: { id, kind: 'system', source: 'growth-consumer', sourceKey: id, occurredAt: tx.now, payload: { candidateId: candidate.id, consumer: input.consumer, turnId: input.turnId, evidence: candidate.sourceEvidence } } })
    await applyLifeIngress(tx, { type: 'ingress-settle', id, status: 'settled' })
    return
  }
  if ((stored?.value ?? null) !== input.expectedValue)
    throw new Error('Growth state changed before commit')
  const previous = stored ? parseLifeGrowthSnapshot(stored.value) : null
  const snapshot = parseLifeGrowthSnapshot(input.snapshotJson)
  for (const candidate of snapshot.candidates) {
    const prior = previous?.candidates.find(item => item.id === candidate.id)
    if (prior && JSON.stringify(prior.patch) !== JSON.stringify(candidate.patch))
      throw new Error('Growth candidate identity cannot be reused for another patch')
    candidate.sourceEvidence = prior?.sourceEvidence ?? []
    if (!prior) {
      for (const factId of candidate.sourceFactIds ?? []) {
        assertLifeId(factId)
        const fact = await tx.get<{ version: number }>(`SELECT version FROM memory_fact_versions WHERE card_id = ? AND fact_id = ? AND recorded_to IS NULL AND lifecycle = 'active' AND provenance IN ('observed','reported','inferred') ORDER BY version DESC LIMIT 1`, [tx.cardId, factId])
        if (fact)
          candidate.sourceEvidence.push({ cardId: tx.cardId, kind: 'memory_facts', id: factId, version: String(fact.version) })
      }
      if (!candidate.sourceEvidence.length)
        candidate.validation.activationBlockedReasons.push('growth:cleaned-source-required')
    }
    if (candidate.status === 'active') {
      await assertLifePolicyActivation(tx, candidate, prior?.status !== 'active')
      if (!candidate.sourceEvidence.length || candidate.validation.replayPassed !== true || candidate.validation.finalReplayGatePassed !== true || !(Number(candidate.validation.productionGoldSampleCount) > 0) || !(Number(candidate.validation.productionGoldCoverage) > 0) || candidate.validation.activationBlockedReasons.length)
        throw new Error('Growth activation lacks evidence or evaluation gates')
      for (const source of candidate.sourceEvidence) {
        if (!await sourceIsCurrent(tx, source))
          throw new Error('Growth candidate source is no longer current')
      }
    }
    for (const source of candidate.sourceEvidence)
      await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, ?, ?, ?, 'growth', ?, '1', 'supports', ?)`, [tx.cardId, source.kind, source.id, source.version, candidate.id, tx.revision])
  }
  await tx.updateOwner({ owner: 'growth', key: input.key, value: boundedJson(snapshot), expectedValue: input.expectedValue })
}

export async function invalidateLifeGrowth(tx: LifeTransaction, candidateId: string, mode: 'correction' | 'forget') {
  const authority = await tx.get<{ payload_ref_json: string }>(`SELECT payload_ref_json FROM life_owner_versions WHERE card_id = ? AND owner = 'growth'`, [tx.cardId])
  if (!authority)
    return
  const key = (JSON.parse(authority.payload_ref_json) as { metaKey: string }).metaKey
  const row = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', [key])
  if (!row)
    return
  const snapshot = parseLifeGrowthSnapshot(row.value)
  const candidate = snapshot.candidates.find(item => item.id === candidateId)
  if (!candidate || candidate.status === 'rolled-back')
    return
  const next = rollbackAlicizationSelfEvolutionCandidate({ snapshot, candidateId, reason: 'source-invalidated', now: tx.now })
  await tx.run(`UPDATE life_effect_intents SET status = 'cancelled', receipt_ref_json = NULL, last_error_code = 'SOURCE_INVALIDATED' WHERE card_id = ? AND kind = 'reflect' AND json_extract(payload_ref_json, '$.format') = 'policy-paired-evaluation-v1' AND json_extract(payload_ref_json, '$.candidateId') = ?`, [tx.cardId, candidateId])
  if (mode === 'forget') {
    const revoked = next.candidates.find(item => item.id === candidateId)!
    revoked.patch.summary = null
    revoked.sourceFactIds = []
    revoked.sourceEvidence = []
  }
  await tx.updateOwner({ owner: 'growth', key, value: boundedJson(next) })
}
