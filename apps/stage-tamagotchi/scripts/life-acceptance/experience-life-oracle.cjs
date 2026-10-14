const assert = require('node:assert/strict')
const { createHash } = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const { DatabaseSync } = require('node:sqlite')

/** Read-only observations; no state injection or fabricated model receipts. */
async function observeLife(profile, output, priorOutput = null) {
  assert.match(path.basename(profile), /^alicization-life-real-experience-/u)
  const ownedRoots = await Promise.all([profile, output, ...(Array.isArray(priorOutput) ? priorOutput : [priorOutput])].filter(Boolean).map(root => fs.realpath(root)))
  const db = new DatabaseSync(path.join(profile, 'alicizations/cards/default/alicization.db'), { readOnly: true })
  try {
    const rows = db.prepare('SELECT obligation_id, kind, summary, status, generation, required_proof_json, fulfilled_receipt_ref_json, source_ref_json FROM life_obligations WHERE card_id = ? ORDER BY created_at DESC LIMIT 64').all('default')
    const goals = []
    for (const row of rows) {
      const proof = JSON.parse(row.required_proof_json)
      const verification = row.fulfilled_receipt_ref_json ? JSON.parse(row.fulfilled_receipt_ref_json) : null
      const source = JSON.parse(row.source_ref_json)
      let artifact = null
      if (proof.kind === 'file') {
        const target = path.resolve(proof.path)
        try {
          const canonical = await fs.realpath(target)
          assert.ok(ownedRoots.some(root => canonical.toLowerCase().startsWith(`${root.toLowerCase()}${path.sep}`)), 'The oracle only reads this QA identity and its output')
          const bytes = await fs.readFile(target)
          artifact = { path: target, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, currentHashMatches: createHash('sha256').update(bytes).digest('hex') === proof.contentHash, excerpt: bytes.toString('utf8').slice(0, 4600) }
        }
        catch (error) {
          if (error.code !== 'ENOENT')
            throw error
        }
      }
      goals.push({ id: row.obligation_id, kind: row.kind, summary: row.summary, status: row.status, generation: row.generation, proof, verification, source, artifact })
    }
    const facts = db.prepare('SELECT fact_id, version, predicate, value_json, provenance, lifecycle, recorded_to, evidence_refs_json FROM memory_fact_versions WHERE card_id = ? ORDER BY recorded_from DESC LIMIT 100').all('default').map(row => ({ id: row.fact_id, version: row.version, predicate: row.predicate, value: JSON.parse(row.value_json), provenance: row.provenance, lifecycle: row.lifecycle, current: row.recorded_to === null, evidence: JSON.parse(row.evidence_refs_json) }))
    const presentation = db.prepare('SELECT state, COUNT(*) AS count FROM life_expression_receipts WHERE card_id = ? AND presentation_verified = 1 GROUP BY state').all('default')
    const playbackByTurn = new Map()
    for (const row of db.prepare('SELECT DISTINCT turn_id, utterance_id FROM life_expression_receipts WHERE card_id = ? AND presentation_verified = 1 AND state = \'audio-started\'').all('default')) {
      const turn = row.turn_id.replace(/:gw\d+$/u, '')
      const utterances = playbackByTurn.get(turn) ?? new Set()
      utterances.add(row.utterance_id)
      playbackByTurn.set(turn, utterances)
    }
    const playbackTimes = db.prepare('SELECT turn_id, state, MIN(occurred_at) AS at FROM life_expression_receipts WHERE card_id = ? AND presentation_verified = 1 GROUP BY turn_id, state').all('default')
    const initiative = JSON.parse(db.prepare('SELECT value FROM alicization_meta WHERE key = ?').get('life:initiative')?.value ?? '{}')
    const intervalReviews = db.prepare('SELECT payload_ref_json FROM life_ingress WHERE card_id = ? AND source = ? ORDER BY observed_at DESC LIMIT 64').all('default', 'reply-grounding').map(row => JSON.parse(row.payload_ref_json)).filter(review => review.requestedIntervalHash).map(review => ({ turnId: review.turnId, accepted: review.accepted, requestedIntervalHash: review.requestedIntervalHash, claims: review.claims, issues: review.issues }))
    const declinedOperations = db.prepare('SELECT effect_id, turn_id, receipt_ref_json FROM life_effect_intents WHERE card_id = ? AND receipt_ref_json IS NOT NULL ORDER BY created_at DESC LIMIT 64').all('default').flatMap((row) => {
      const receipt = JSON.parse(row.receipt_ref_json)
      const output = receipt.output
      return output?.errorCode === 'ALICIZATION_TOOL_DENIED_BY_HOST' ? [{ effectId: row.effect_id, turnId: row.turn_id, path: output.path, errorCode: output.errorCode, observedAt: receipt.observedAt }] : []
    })
    const bodyActivities = db.prepare('SELECT payload_ref_json FROM life_ingress WHERE card_id = ? AND source = ? ORDER BY observed_at DESC LIMIT 64').all('default', 'rendered-body-activity').map(row => JSON.parse(row.payload_ref_json))
    const dailyExperiences = db.prepare('SELECT id, turn_id, provenance, occurred_at, source_summary FROM episodic_events WHERE card_id = ? AND id LIKE \'daily-experience:%\' ORDER BY occurred_at DESC LIMIT 16').all('default')
    const storedNeeds = JSON.parse(db.prepare('SELECT value FROM alicization_meta WHERE key = ?').get('subconscious_state_v1')?.value ?? '{}')
    const relationshipAuthority = db.prepare('SELECT payload_ref_json FROM life_owner_versions WHERE card_id = ? AND owner = ?').get('default', 'relationship')
    const relationship = JSON.parse(db.prepare('SELECT value FROM alicization_meta WHERE key = ?').get('life:relationship')?.value ?? 'null')
    return { relationshipAuthority: relationshipAuthority ? JSON.parse(relationshipAuthority.payload_ref_json) : null, conversationPreferences: relationship?.conversationPreferences ?? [], dailyExperiences, appliedDailyNeedsEffects: storedNeeds.appliedDailyNeedsEffects ?? [], playbackTimes, personalProposals: initiative.personalProposals ?? [], dailyRhythm: initiative.dailyRhythm ?? null, bodyActivities, format: 'life-readonly-experience-oracle-v1', goals, facts, presentation, outreachPolicy: initiative.outreachPolicy ?? null, quietBoundary: initiative.outreachHold ?? null, quietInterval: initiative.lastQuietInterval ?? null, intervalReviews, declinedOperations, playbackByTurn: [...playbackByTurn].map(([turnId, utterances]) => ({ turnId, utterances: [...utterances] })) }
  }
  finally { db.close() }
}

function assertObservedSpeechOwners(samples) {
  for (const sample of samples) {
    if (sample.phase !== 'speaking' || !sample.segmentId)
      continue
    for (const layer of ['emotion', 'face', 'motion', 'speechBody']) {
      const owner = sample[layer]?.segmentId
      assert.ok(!owner || owner === sample.segmentId, `Actual ${layer} owner differs from the speaking utterance at ${sample.at}`)
    }
  }
}

module.exports = { observeLife, assertObservedSpeechOwners }
