import type { WorkingMemorySnapshot } from './working-memory'

export function workingMemorySourceTurnIds(snapshot: WorkingMemorySnapshot) {
  return [...new Set([
    ...snapshot.recentRawTurns.map(turn => turn.turnId),
    ...snapshot.compressedTimeline.flatMap(item => [...item.sourceTurnIds, ...(item.evidence ?? []).map(evidence => evidence.turnId)]),
    ...snapshot.userCorrections.map(item => item.sourceTurnId),
    ...snapshot.commitments.map(item => item.sourceTurnId),
    ...snapshot.unresolvedQuestions.map(item => item.sourceTurnId),
  ].filter((id): id is string => Boolean(id)).map(id => id.replace(/:(?:user|alice)$/u, '')))]
}

// Run on the writer inside the CAS transaction as well as before generation.
// This catches revocation even when the checkpoint JSON itself has not changed.
export const withdrawnWorkingMemorySourcesSql = `WITH source_ids AS (SELECT value AS turn_id FROM json_each(?))
  SELECT 1 FROM life_evidence_cleanup_jobs AS cleanup
  WHERE cleanup.card_id = ? AND (
    (json_extract(cleanup.source_ref_json, '$.kind') = 'life_ingress' AND json_extract(cleanup.source_ref_json, '$.id') IN (SELECT 'user:' || turn_id FROM source_ids))
    OR (json_extract(cleanup.source_ref_json, '$.kind') = 'conversation_turns' AND json_extract(cleanup.source_ref_json, '$.id') IN (SELECT turn.id FROM conversation_turns AS turn JOIN source_ids ON source_ids.turn_id = turn.turn_id WHERE turn.card_id = cleanup.card_id))
  )
  UNION ALL SELECT 1 FROM life_input_payloads AS payload
  WHERE payload.card_id = ? AND payload.lifecycle IN ('withdrawn', 'unavailable') AND payload.ingress_id IN (SELECT 'user:' || turn_id FROM source_ids)
  LIMIT 1`
