import type { LifeEntity, LifeMutation } from '../../../shared/life-contracts'
import type { LifeTransaction } from './life-transaction'

import { createHash } from 'node:crypto'

import { lifeAliasEvidenceCurrent, resolveLifeEntityAlias } from './life-entity-resolver'
import { assertLifeMemoryEvidence } from './life-memory-evidence'
import { assertLifeId, assertLifeTime, boundedJson } from './life-transaction'

export async function registerLifeEntity(tx: LifeTransaction, entity: LifeEntity) {
  assertLifeId(entity.id)
  assertLifeId(entity.name)
  const existing = await tx.get<{ entity_kind: string, discriminators_json: string }>('SELECT entity_kind, discriminators_json FROM memory_entities WHERE card_id = ? AND entity_id = ?', [tx.cardId, entity.id])
  const discriminators = boundedJson(entity.discriminators)
  if (existing && (existing.entity_kind !== entity.kind || existing.discriminators_json !== discriminators))
    throw new Error('Entity identity discriminator changed; an explicit merge or correction is required')
  await tx.run(`INSERT INTO memory_entities(card_id, entity_id, entity_kind, display_name, discriminators_json, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?) ON CONFLICT(card_id, entity_id) DO UPDATE SET display_name = excluded.display_name, updated_at = excluded.updated_at`, [tx.cardId, entity.id, entity.kind, entity.name, discriminators, tx.now, tx.now])
  for (const alias of entity.aliases) {
    assertLifeId(alias.name)
    assertLifeId(alias.scope)
    if (alias.evidence.cardId !== tx.cardId)
      throw new Error('Entity alias evidence crossed the card boundary')
    if (!await lifeAliasEvidenceCurrent(tx, alias.evidence))
      throw new Error('Entity alias requires current reported identity evidence')
    if (alias.evidence.kind === 'memory_facts') {
      const source = await tx.get<{ subject: string, predicate: string, object: string }>('SELECT subject, predicate, object FROM memory_facts WHERE card_id = ? AND id = ?', [tx.cardId, alias.evidence.id])
      const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim()
      const subjectMatches = source && (normalize(source.subject) === normalize(entity.name) || entity.kind === 'host' && ['user', '用户', 'host', '主人'].includes(normalize(source.subject)))
      if (!source || !subjectMatches || !['alias', 'aliases', 'aka', 'identity_alias', '别名'].includes(normalize(source.predicate)) || normalize(source.object) !== normalize(alias.name))
        throw new Error('Entity alias evidence does not describe this person and this exact alias')
    }
    await tx.run('INSERT INTO memory_entity_aliases(card_id, entity_id, alias, relationship_scope, evidence_ref_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(card_id, entity_id, alias, relationship_scope) DO UPDATE SET evidence_ref_json = excluded.evidence_ref_json', [tx.cardId, entity.id, alias.name.normalize('NFKC').toLocaleLowerCase(), alias.scope, boundedJson(alias.evidence)])
  }
}

export function lifePredicateCardinality(predicate: string): 'single' | 'multi' {
  // Unknown predicates remain multi-valued. Similar wording alone cannot erase a fact.
  return ['name', 'birthday', 'preferred_drink', 'preferred-drink', 'lives_in', 'works_at', 'relationship_status', '饮品偏好', '名字', '生日', '居住地'].includes(predicate.normalize('NFKC').toLocaleLowerCase()) ? 'single' : 'multi'
}

export async function recordLifeFactVersion(tx: LifeTransaction, input: Extract<LifeMutation, { type: 'memory-fact-version' }>) {
  const row = await tx.get<{ subject: string, predicate: string, object: string, validation_status: string }>('SELECT subject, predicate, object, validation_status FROM memory_facts WHERE card_id = ? AND id = ?', [tx.cardId, input.factId])
  if (!row)
    throw new Error('Fact version requires an existing canonical fact')
  for (const time of [input.validFrom, input.validTo]) {
    if (time != null)
      assertLifeTime(time)
  }
  if (input.validFrom != null && input.validTo != null && input.validTo < input.validFrom)
    throw new TypeError('Fact validity interval is reversed')
  if (input.evidence.some(ref => ref.cardId !== tx.cardId))
    throw new Error('Fact evidence crossed the card boundary')
  const subjectName = row.subject.normalize('NFKC').toLocaleLowerCase()
  const isHost = ['user', '用户', '主人', 'host'].includes(subjectName)
  const isSelf = subjectName === 'self'
  const alias = !isHost && !isSelf ? await resolveLifeEntityAlias(tx, row.subject) : null
  const evidenceRefs = alias && alias.evidence.kind === 'memory_facts' ? [...input.evidence, alias.evidence] : input.evidence
  for (const evidence of evidenceRefs)
    await assertLifeMemoryEvidence(tx, evidence)
  const subject = isHost ? { kind: 'entity', id: `host:${tx.cardId}` } : isSelf ? { kind: 'entity', id: `self:${tx.cardId}` } : alias ? { kind: 'entity', id: alias.id } : { kind: 'unresolved-name', name: row.subject }
  if (isHost)
    await registerLifeEntity(tx, { id: `host:${tx.cardId}`, kind: 'host', name: row.subject, discriminators: { identity: 'local-host' }, aliases: [] })
  if (isSelf)
    await registerLifeEntity(tx, { id: `self:${tx.cardId}`, kind: 'self', name: row.subject, discriminators: { identity: 'local-self' }, aliases: [] })
  // Same spelling does not establish one person. A single-valued predicate may
  // supersede an older value only after the subject has a resolved identity.
  const streamId = createHash('sha256').update(boundedJson({ subject, predicate: row.predicate, ...(input.cardinality === 'multi' || !isHost && !isSelf && !alias ? { value: row.object } : {}) })).digest('hex')
  const previous = await tx.get<{ version: number, value_json: string, lifecycle: string, provenance: string, valid_from: number | null, valid_to: number | null }>('SELECT version, value_json, lifecycle, provenance, valid_from, valid_to FROM memory_fact_versions WHERE card_id = ? AND stream_id = ? ORDER BY version DESC LIMIT 1', [tx.cardId, streamId])
  const lifecycle = row.validation_status === 'superseded' ? 'superseded' : row.validation_status === 'disputed' ? 'disputed' : ['imagined', 'fictional'].includes(input.provenance) ? 'candidate' : 'active'
  const value = boundedJson(row.object)
  if (previous?.value_json === value && previous.lifecycle === lifecycle && previous.provenance === input.provenance && previous.valid_from === input.validFrom && previous.valid_to === input.validTo)
    return
  const sameFact = await tx.get<{ version: number }>('SELECT MAX(version) AS version FROM memory_fact_versions WHERE card_id = ? AND fact_id = ?', [tx.cardId, input.factId])
  let version = Math.max(previous?.version ?? 0, sameFact?.version ?? 0)
  // Resolving an alias changes the logical stream. Close the earlier spelling
  // of this same fact so withdrawal cannot expose its unresolved predecessor.
  await tx.run('UPDATE memory_fact_versions SET recorded_to=? WHERE card_id=? AND fact_id=? AND stream_id<>? AND recorded_to IS NULL', [tx.now, tx.cardId, input.factId, streamId])
  const knownInterval = input.validFrom !== null || input.validTo !== null
  const overlapping = await tx.all<{ fact_id: string, version: number, valid_from: number | null, valid_to: number | null, temporal_precision: string, subject_ref_json: string, predicate: string, value_json: string, provenance: string, lifecycle: string, evidence_refs_json: string }>(`SELECT * FROM memory_fact_versions WHERE card_id=? AND stream_id=? AND recorded_to IS NULL AND (? IS NULL OR valid_to IS NULL OR valid_to>?) AND (? IS NULL OR valid_from IS NULL OR valid_from<?)`, [tx.cardId, streamId, input.validFrom, input.validFrom, input.validTo, input.validTo])
  for (const old of overlapping) {
    await tx.run('UPDATE memory_fact_versions SET recorded_to=? WHERE card_id=? AND stream_id=? AND version=?', [tx.now, tx.cardId, streamId, old.version])
    if (!knownInterval || old.lifecycle !== 'active')
      continue
    const remaining: Array<{ from: number | null, to: number | null }> = []
    if (input.validFrom !== null && (old.valid_from === null || old.valid_from < input.validFrom))
      remaining.push({ from: old.valid_from, to: input.validFrom })
    if (input.validTo !== null && (old.valid_to === null || old.valid_to > input.validTo))
      remaining.push({ from: input.validTo, to: old.valid_to })
    for (const interval of remaining) {
      version++
      await tx.run(`INSERT INTO memory_fact_versions(card_id,stream_id,fact_id,version,recorded_from,valid_from,valid_to,temporal_precision,subject_ref_json,predicate,value_json,provenance,lifecycle,evidence_refs_json,supersedes_version,commit_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [tx.cardId, streamId, old.fact_id, version, tx.now, interval.from, interval.to, old.temporal_precision, old.subject_ref_json, old.predicate, old.value_json, old.provenance, old.lifecycle, old.evidence_refs_json, old.version, tx.commitId])
      for (const evidence of JSON.parse(old.evidence_refs_json) as typeof evidenceRefs)
        await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id,source_kind,source_id,source_version,dependent_owner,dependent_id,dependent_version,relation,created_revision) VALUES (?,?,?,?, 'memory',?,?, 'supports',?)`, [tx.cardId, evidence.kind, evidence.id, evidence.version, streamId, String(version), tx.revision])
    }
  }
  version++
  await tx.run(`INSERT INTO memory_fact_versions(card_id, stream_id, fact_id, version, recorded_from, valid_from, valid_to, temporal_precision, subject_ref_json, predicate, value_json, provenance, lifecycle, evidence_refs_json, supersedes_version, commit_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [tx.cardId, streamId, input.factId, version, tx.now, input.validFrom, input.validTo, input.temporalPrecision ?? 'unknown', boundedJson(subject), row.predicate, value, input.provenance, lifecycle, boundedJson(evidenceRefs), previous?.version ?? null, tx.commitId])
  for (const evidence of evidenceRefs)
    await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id, source_kind, source_id, source_version, dependent_owner, dependent_id, dependent_version, relation, created_revision) VALUES (?, ?, ?, ?, 'memory', ?, ?, 'supports', ?)`, [tx.cardId, evidence.kind, evidence.id, evidence.version, streamId, String(version), tx.revision])
}
