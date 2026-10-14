import type { LifeStateView } from '../../../shared/life-contracts'

/** A satisfied file goal attests the verifier's actual read of artifact bytes. */
export function lifeFileVerificationEvidence(goal: LifeStateView['obligations'][number]) {
  const verification = goal.verification
  if (goal.invalidatedBy || goal.status !== 'fulfilled' || goal.proof.kind !== 'file' || verification?.kind !== 'file' || verification.verdict !== 'satisfied' || !verification.independent)
    return null
  const evidence = verification.evidence
  if (!evidence || typeof evidence !== 'object' || Array.isArray(evidence))
    return null
  const record = evidence as Record<string, unknown>
  if (typeof record.path !== 'string' || record.path !== goal.proof.path || typeof record.actualHash !== 'string' || !/^[a-f\d]{64}$/iu.test(record.actualHash) || typeof record.expectedHash !== 'string' || record.actualHash.toLowerCase() !== record.expectedHash.toLowerCase() || record.actualHash.toLowerCase() !== goal.proof.contentHash?.toLowerCase() || typeof record.bytes !== 'number' || !Number.isSafeInteger(record.bytes) || record.bytes < 0)
    return null
  return { path: record.path, contentHash: record.actualHash, bytes: record.bytes, scope: 'Independent artifact byte/hash verification; no content understanding or external research certified.' }
}
