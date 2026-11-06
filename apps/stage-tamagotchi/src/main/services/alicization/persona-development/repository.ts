import type { LifeEvidenceRef } from '../../../../shared/life-contracts'
import type { PersonaDevelopmentAuthorization, PersonaDevelopmentView, PersonaFacet } from '../../../../shared/persona-development-contracts'
import type { PersonaDevelopmentMutation } from '../../../../shared/persona-development-mutations'
import type { LifeTransaction } from '../life-transaction'

import * as v from 'valibot'

import { assertLifeId, boundedJson } from '../life-transaction'
import { detectPersonaTrainingPii } from '../persona-training-pii'
import { effectivePersonaEvidence, personaEvidenceStatus } from './evidence'
import { personaDevelopmentKey, personaDigest, personaObservationSchema, readPersonaDevelopment } from './schema'
import { canonicalPersonaFacets } from './soul'
import { resolvePersonaSource } from './sources'

interface EvidenceRow { root_id: string, polarity: 'support' | 'oppose', source_kind: string, source_id: string, source_version: string, source_hash: string, strength: number, occurred_at: number }

async function read(tx: LifeTransaction) {
  const row = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = ?', [personaDevelopmentKey])
  return { raw: row?.value ?? null, state: readPersonaDevelopment(row ? { [personaDevelopmentKey]: row.value } : {}) }
}
async function save(tx: LifeTransaction, state: PersonaDevelopmentView, expected: string | null) {
  const value = boundedJson(state)
  if (value !== expected)
    await tx.updateOwner({ owner: 'persona-development', key: personaDevelopmentKey, value, expectedValue: expected })
}
async function refresh(tx: LifeTransaction, facet: PersonaFacet, invalidate = false) {
  // Older witnesses remain in the ledger for audit and replay suppression.
  // Growth decisions use a bounded recent window rather than scanning a lifetime.
  const days = await tx.all<{ evidence_day: string }>('SELECT DISTINCT evidence_day FROM life_persona_evidence WHERE card_id = ? AND facet_id = ? AND facet_version = ? AND withdrawn = 0 ORDER BY evidence_day DESC LIMIT 16', [tx.cardId, facet.id, facet.version])
  const rows: EvidenceRow[] = []
  for (const day of days)
    rows.push(...await tx.all<EvidenceRow>('SELECT root_id,polarity,source_kind,source_id,source_version,source_hash,strength,occurred_at FROM life_persona_evidence WHERE card_id = ? AND facet_id = ? AND facet_version = ? AND withdrawn = 0 AND evidence_day = ? ORDER BY occurred_at DESC,root_id DESC LIMIT 8', [tx.cardId, facet.id, facet.version, day.evidence_day]))
  const valid: EvidenceRow[] = []
  for (const row of rows) {
    if (invalidate) {
      try {
        const source = await resolvePersonaSource(tx, { cardId: tx.cardId, kind: row.source_kind, id: row.source_id, version: row.source_version })
        if (source.hash !== row.source_hash || source.rootId !== row.root_id || source.occurredAt !== row.occurred_at)
          throw new Error('Source changed')
      }
      catch {
        await tx.run('UPDATE life_persona_evidence SET withdrawn = 1 WHERE card_id = ? AND facet_id = ? AND root_id = ? AND polarity = ?', [tx.cardId, facet.id, row.root_id, row.polarity])
        continue
      }
    }
    valid.push(row)
  }
  const support = valid.filter(row => row.polarity === 'support')
  const scores = (polarity: EvidenceRow['polarity'], halfLife: number) => valid.filter(row => row.polarity === polarity).reduce((sum, row) => sum + effectivePersonaEvidence(row.strength, row.occurred_at, Math.floor(tx.now / 86_400_000) * 86_400_000, halfLife), 0)
  const trials = await tx.get<{ positive: number, negative: number }>(`SELECT COALESCE(SUM(status = 'positive'),0) AS positive,COALESCE(SUM(status = 'negative'),0) AS negative FROM life_persona_trials WHERE card_id = ? AND facet_id = ? AND facet_version = ?`, [tx.cardId, facet.id, facet.version])
  const stats = { support: Number(scores('support', 180).toFixed(3)), opposition: Number(scores('oppose', 90).toFixed(3)), independentEvents: new Set(support.map(row => row.root_id)).size, distinctDays: new Set(support.map(row => new Date(row.occurred_at).toLocaleDateString('en-CA'))).size, firstEvidenceAt: support.length ? Math.min(...support.map(row => row.occurred_at)) : tx.now, lastEvidenceAt: support.length ? Math.max(...support.map(row => row.occurred_at)) : tx.now, successfulTrials: trials?.positive ?? 0, failedTrials: trials?.negative ?? 0, sources: valid.slice(-16).map(row => ({ cardId: tx.cardId, kind: row.source_kind, id: row.source_id, version: row.source_version })) }
  const status = facet.status === 'withdrawn' ? 'withdrawn' : personaEvidenceStatus(stats, tx.now)
  return { ...facet, ...stats, status: status === 'supported' && facet.status === 'trial' ? 'trial' as const : status, adoptedSoulHash: status === 'mature' ? facet.adoptedSoulHash : null }
}

export async function applyPersonaDevelopment(tx: LifeTransaction, input: PersonaDevelopmentMutation) {
  const { raw, state } = await read(tx)
  if (input.action === 'pause' || input.action === 'resume') {
    state.paused = input.action === 'pause'
  }
  else if (input.action === 'withdraw') {
    const facet = state.facets.find(item => item.id === input.facetId && item.version === input.expectedVersion)
    if (!facet)
      throw new Error('Personality facet changed; reload before withdrawal')
    Object.assign(facet, { status: 'withdrawn', label: '', exceptions: [], sources: [], adoptedSoulHash: null })
    facet.correction = null
    state.adoption = null
    await tx.run('INSERT OR IGNORE INTO life_persona_withdrawals(card_id,facet_id,withdrawn_at) VALUES (?,?,?)', [tx.cardId, facet.id, tx.now])
    await tx.run('UPDATE life_persona_evidence SET withdrawn = 1 WHERE card_id = ? AND facet_id = ?', [tx.cardId, facet.id])
  }
  else if (input.action === 'skip-source') {
    if (state.paused || input.source.cardId !== tx.cardId)
      throw new Error('Cannot acknowledge a source outside active personality learning')
    let eligible = true
    try {
      await resolvePersonaSource(tx, input.source)
    }
    catch { eligible = false }
    if (eligible)
      throw new Error('Eligible personality evidence cannot be silently skipped')
    await tx.run('INSERT OR REPLACE INTO life_persona_extractions(card_id,source_kind,source_id,source_version,source_hash) VALUES (?,?,?,?,?)', [tx.cardId, input.source.kind, input.source.id, input.source.version, personaDigest(['rejected', input.source])])
    state.processedSources = [...state.processedSources.filter(ref => ref.kind !== input.source.kind || ref.id !== input.source.id), input.source].slice(-128)
  }
  else if (input.action === 'correct' || input.action === 'reconsider') {
    const facet = state.facets.find(item => item.id === input.facetId && item.version === input.expectedVersion)
    if (!facet || facet.status === 'withdrawn' || (input.action === 'reconsider' && facet.status !== 'disputed'))
      throw new Error('Only a current personality hypothesis can be reviewed')
    if (input.action === 'correct') {
      const text = input.correction.trim()
      if (!text || text.length > 260 || detectPersonaTrainingPii(text).detected)
        throw new Error('Personality correction must be a short concrete exception')
      facet.correction = { text, at: tx.now }
      facet.exceptions = [...facet.exceptions.filter(item => item !== text).slice(-3), text]
    }
    // A revised hypothesis needs new independent experiences and new trials.
    // Historical roots remain reserved, so replay cannot re-promote it.
    facet.version++
    facet.adoptedSoulHash = null
    facet.status = 'exploring'
    Object.assign(facet, await refresh(tx, facet))
    state.adoption = null
  }
  else if (input.action === 'observe') {
    if (state.paused)
      throw new Error('Personality adaptation is paused')
    if (input.observations.length > 8)
      throw new TypeError('Personality batch exceeds its budget')
    for (const rawObservation of input.observations) {
      const observation = v.parse(personaObservationSchema, rawObservation)
      const source = await resolvePersonaSource(tx, observation.source)
      if (observation.facet.kind === 'interest' && (!source.selfChosen || observation.facet.subject !== 'self'))
        throw new Error('Host preferences cannot become her own interests')
      if (await tx.get('SELECT 1 FROM life_persona_withdrawals WHERE card_id = ? AND facet_id = ?', [tx.cardId, observation.facet.id]))
        throw new Error('Withdrawn personality cannot be reintroduced')
      let facet = state.facets.find(item => item.id === observation.facet.id)
      if (facet && personaDigest({ id: facet.id, kind: facet.kind, subject: facet.subject, label: facet.label, context: facet.context, exceptions: facet.exceptions, effects: facet.effects }) !== personaDigest(observation.facet))
        throw new Error('A personality identity cannot be reused for a different hypothesis')
      if (facet?.status === 'withdrawn')
        throw new Error('Withdrawn personality cannot be reintroduced')
      if (!facet) {
        if (state.facets.length >= 64)
          state.facets = state.facets.filter(item => item.status !== 'withdrawn')
        if (state.facets.length >= 64)
          throw new Error('Review personality candidates before adding more')
        facet = { ...observation.facet, version: 1, status: 'exploring', support: 0, opposition: 0, independentEvents: 0, distinctDays: 0, firstEvidenceAt: source.occurredAt, lastEvidenceAt: source.occurredAt, successfulTrials: 0, failedTrials: 0, sources: [], adoptedSoulHash: null, correction: null }
        state.facets.push(facet)
      }
      // A reflection and a reinforcement of the same turn are one witness.
      await tx.run(`INSERT INTO life_persona_evidence(card_id,facet_id,root_id,polarity,source_kind,source_id,source_version,source_hash,strength,occurred_at,context,facet_version,evidence_day) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(card_id,facet_id,root_id,polarity) DO NOTHING`, [tx.cardId, facet.id, source.rootId, observation.polarity, observation.source.kind, observation.source.id, observation.source.version, source.hash, source.strength, source.occurredAt, observation.facet.context, facet.version, new Date(source.occurredAt).toLocaleDateString('en-CA')])
      await tx.run(`INSERT OR IGNORE INTO life_evidence_dependencies(card_id,source_kind,source_id,source_version,dependent_owner,dependent_id,dependent_version,relation,created_revision) VALUES (?,?,?,?,'persona-development',?,?,'supports',?)`, [tx.cardId, observation.source.kind, observation.source.id, observation.source.version, facet.id, String(facet.version), tx.revision])
      Object.assign(facet, await refresh(tx, facet))
    }
    if (input.extracted) {
      const source = await resolvePersonaSource(tx, input.extracted)
      await tx.run('INSERT OR REPLACE INTO life_persona_extractions(card_id,source_kind,source_id,source_version,source_hash) VALUES (?,?,?,?,?)', [tx.cardId, source.ref.kind, source.ref.id, source.ref.version, source.hash])
      state.processedSources = [...state.processedSources.filter(ref => ref.kind !== source.ref.kind || ref.id !== source.ref.id), source.ref].slice(-128)
      if (source.feedback && source.rootId.startsWith('turn:')) {
        const turnId = source.rootId.slice(5)
        const affected = await tx.all<{ facet_id: string }>(`SELECT facet_id FROM life_persona_trials WHERE card_id = ? AND turn_id = ? AND status = 'pending'`, [tx.cardId, turnId])
        await tx.run(`UPDATE life_persona_trials SET status = ?,feedback_source = ? WHERE card_id = ? AND turn_id = ? AND status = 'pending'`, [source.feedback, personaDigest(source.ref), tx.cardId, turnId])
        for (const facet of state.facets.filter(item => affected.some(row => row.facet_id === item.id)))
          Object.assign(facet, await refresh(tx, facet))
      }
    }
  }
  else if (input.action === 'consume') {
    assertLifeId(input.turnId)
    if (!/^[a-f\d]{64}$/u.test(input.requestHash) || input.facetIds.length > 8)
      throw new Error('Personality consumption requires a bounded exact request')
    const ingress = await tx.get('SELECT 1 FROM life_ingress WHERE card_id = ? AND ingress_id = ? AND status IN (\'accepted\',\'processing\')', [tx.cardId, `user:${input.turnId}`])
    if (!ingress)
      throw new Error('Personality consumption needs a live owned turn')
    for (const facetId of new Set(input.facetIds)) {
      const facet = state.facets.find(item => item.id === facetId)
      if (!facet || (state.paused && facet.status !== 'mature') || facet.context !== input.context || !['supported', 'trial', 'mature'].includes(facet.status))
        throw new Error('Personality trial is outside its current scope')
      const checked = await refresh(tx, facet, true)
      if (checked.status === 'disputed' || checked.independentEvents < 3 || (facet.status === 'mature' && checked.status !== 'mature'))
        throw new Error('Personality trial evidence is no longer sufficient')
      if (facet.status !== 'mature')
        facet.status = 'trial'
      await tx.run(`INSERT OR IGNORE INTO life_persona_trials(card_id,facet_id,facet_version,turn_id,context,request_hash,status,created_at) VALUES (?,?,?,?,?,?,'pending',?)`, [tx.cardId, facet.id, facet.version, input.turnId, input.context, input.requestHash, tx.now])
    }
  }
  else if (input.action === 'feedback') {
    const source = await resolvePersonaSource(tx, input.source)
    const trial = await tx.get<{ status: string }>('SELECT status FROM life_persona_trials WHERE card_id = ? AND facet_id = ? AND turn_id = ?', [tx.cardId, input.facetId, input.turnId])
    if (!trial || trial.status !== 'pending' || !source.feedback || source.feedback === 'unknown' || source.rootId !== `turn:${input.turnId}` || input.positive !== source.positive)
      throw new Error('Trial feedback must refer to this exact interaction')
    await tx.run('UPDATE life_persona_trials SET status = ?,feedback_source = ? WHERE card_id = ? AND facet_id = ? AND turn_id = ?', [input.positive ? 'positive' : 'negative', personaDigest(source.ref), tx.cardId, input.facetId, input.turnId])
    const facet = state.facets.find(item => item.id === input.facetId)
    if (facet)
      Object.assign(facet, await refresh(tx, facet))
  }
  else if (input.action === 'reconcile') {
    for (const facet of state.facets.filter(item => item.status !== 'withdrawn'))
      Object.assign(facet, await refresh(tx, facet, true))
  }
  else if (input.action === 'prepare-adoption') {
    const mature = canonicalPersonaFacets(state.facets.filter(item => item.status === 'mature' && (!state.paused || item.adoptedSoulHash === input.baseHash)))
    const soulRow = await tx.get<{ value: string }>('SELECT value FROM alicization_meta WHERE key = \'life:soul-active\'')
    const adoptedHash = soulRow ? JSON.parse(soulRow.value).contentHash : null
    if (adoptedHash !== input.baseHash || personaDigest(mature) !== personaDigest(input.facets) || personaDigest(input.facets) !== input.facetHash)
      throw new Error('Personality adoption differs from verified mature evidence')
    state.adoption = { id: input.id, baseHash: input.baseHash, targetHash: input.targetHash, facetHash: input.facetHash, facets: input.facets, status: 'prepared' }
  }
  await save(tx, state, raw)
}

export async function assertPersonaDevelopmentActivation(tx: LifeTransaction, authorization: PersonaDevelopmentAuthorization, targetHash: string, activating = false) {
  const { raw, state } = await read(tx)
  const adoption = state.adoption
  if (!adoption || adoption.id !== authorization.developmentId || adoption.facetHash !== authorization.facetHash || adoption.targetHash !== targetHash)
    throw new Error('Personality activation does not match its prepared development')
  for (const facet of adoption.facets) {
    const current = state.facets.find(item => item.id === facet.id)
    if (!current || personaDigest(canonicalPersonaFacets([current])) !== personaDigest(canonicalPersonaFacets([facet])) || (await refresh(tx, current, true)).status !== 'mature')
      throw new Error('Personality source changed during activation')
  }
  if (activating) {
    adoption.status = 'activated'
    for (const facet of state.facets)
      facet.adoptedSoulHash = adoption.facets.some(item => item.id === facet.id) ? targetHash : null
    await save(tx, state, raw)
  }
}

export async function invalidatePersonaDevelopment(tx: LifeTransaction, source: LifeEvidenceRef, forget: boolean) {
  const { raw, state } = await read(tx)
  const affected = await tx.all<{ facet_id: string }>('SELECT DISTINCT facet_id FROM life_persona_evidence WHERE card_id = ? AND source_kind = ? AND source_id = ?', [tx.cardId, source.kind, source.id])
  await tx.run('UPDATE life_persona_evidence SET withdrawn = 1 WHERE card_id = ? AND source_kind = ? AND source_id = ?', [tx.cardId, source.kind, source.id])
  for (const facet of state.facets.filter(item => affected.some(row => row.facet_id === item.id))) {
    Object.assign(facet, await refresh(tx, facet))
    facet.adoptedSoulHash = null
    if (forget) {
      Object.assign(facet, { status: 'withdrawn', label: '', exceptions: [], sources: [], correction: null })
      await tx.run('UPDATE life_persona_evidence SET withdrawn = 1 WHERE card_id = ? AND facet_id = ?', [tx.cardId, facet.id])
      await tx.run('INSERT OR IGNORE INTO life_persona_withdrawals(card_id,facet_id,withdrawn_at) VALUES (?,?,?)', [tx.cardId, facet.id, tx.now])
    }
  }
  if (affected.length)
    state.adoption = null
  await save(tx, state, raw)
}
