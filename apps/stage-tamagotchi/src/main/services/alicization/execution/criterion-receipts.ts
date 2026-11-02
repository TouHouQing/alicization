import type { TaskAcceptance } from '../../../../shared/execution-contracts'
import type { LifeGoalVerification, LifeIngress } from '../../../../shared/life-contracts'
import type { DownloadGoalPredicate } from './download-goal-verifier'

import { createHash } from 'node:crypto'
import { open } from 'node:fs/promises'

import { executionDigest } from './acceptance-compiler'

/** A review is about fixed artifact versions, never just a task's title. */
export async function executionReviewArtifacts(contract: TaskAcceptance, criterionId: string, readDownload?: (predicate: DownloadGoalPredicate) => Promise<LifeGoalVerification>) {
  const criterion = contract.criteria.find(item => item.id === criterionId)
  if (!criterion || !['user-review', 'quality-review'].includes(criterion.predicate.kind))
    throw new Error('The accepted criterion does not request a review')
  const predicate = criterion.predicate as Extract<typeof criterion.predicate, { kind: 'user-review' | 'quality-review' }>
  const artifacts: Array<{ id: string, path: string, sha256: string, bytes: number }> = []
  for (const id of predicate.artifactIds) {
    const artifact = contract.criteria.find(item => item.id === id)?.predicate
    const downloaded = artifact?.kind === 'browser-download' ? await readDownload?.(artifact) : null
    if (artifact?.kind === 'browser-download' && (downloaded?.verdict !== 'satisfied' || downloaded.independent !== true || typeof downloaded.evidence.path !== 'string' || typeof downloaded.evidence.actualHash !== 'string'))
      throw new Error('A review download requires current, independently verified bytes')
    const path = artifact?.kind === 'browser-download' ? downloaded!.evidence.path as string : artifact && 'path' in artifact ? artifact.path : null
    if (!artifact || !['file-bytes', 'file-matches-read', 'json-structure', 'text-content', 'browser-download'].includes(artifact.kind) || !path)
      throw new Error('A review artifact must refer to an accepted file criterion')
    const file = await open(path, 'r')
    try {
      const before = await file.stat()
      if (!before.isFile() || before.size > 4_194_304)
        throw new Error('Review artifact exceeds its byte budget')
      const bytes = await file.readFile()
      const after = await file.stat()
      if (before.ino !== after.ino || before.size !== after.size || before.mtimeMs !== after.mtimeMs || before.ctimeMs !== after.ctimeMs || bytes.length !== before.size)
        throw new Error('Review artifact changed while it was read')
      const sha256 = createHash('sha256').update(bytes).digest('hex')
      if (downloaded && downloaded.evidence.actualHash !== sha256)
        throw new Error('Review download changed after its independent observation')
      artifacts.push({ id, path, sha256, bytes: bytes.length })
    }
    finally { await file.close() }
  }
  return { artifacts, fingerprint: executionDigest(artifacts), criterionHash: executionDigest(criterion) }
}

export async function readExecutionCriterionReceipt(contract: TaskAcceptance, criterionId: string, ingress: LifeIngress[], readDownload?: Parameters<typeof executionReviewArtifacts>[2]) {
  const binding = await executionReviewArtifacts(contract, criterionId, readDownload)
  const receipt = ingress.filter(item => item.kind === 'feedback' && item.source === 'execution-user-review' && item.status === 'settled' && item.payload.contractHash === contract.contractHash && item.payload.criterionId === criterionId && item.payload.criterionHash === binding.criterionHash && item.payload.artifactFingerprint === binding.fingerprint && item.payload.obligationGeneration === contract.obligationGeneration).sort((a, b) => b.observedAt - a.observedAt)[0]
  return receipt ? { receiptId: receipt.id, satisfied: receipt.payload.approved === true, artifactFingerprint: binding.fingerprint, source: 'explicit-user-review' } : null
}
