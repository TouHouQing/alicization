import type {
  AlicizationListLearningArtifactLedgerInput,
  AlicizationMindTurnEventRecord,
} from './alicization-transport-contracts'
import type { AlicizationVerifiedLearningArtifact } from './alicization-claim-evidence-graph'

export interface AlicizationLearningArtifactLedgerRecord {
  decisionTraceId: string
  turnId: string | null
  sessionId: string | null
  taskId: string
  artifactId: string | null
  claimId: string | null
  action: string
  domain: string
  resultSummary: string | null
  verificationBasis: string[]
  sourceFactIds: string[]
  verifiedArtifact: AlicizationVerifiedLearningArtifact | null
  createdAt: number
}

function uniqueList(values: string[], maxItems = 24) {
  const result: string[] = []
  for (const value of values) {
    const normalized = asString(value, 180)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function asObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function asString(raw: unknown, maxChars = 220) {
  return typeof raw === 'string'
    ? raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
    : ''
}

function asStringList(raw: unknown, maxItems = 16, maxChars = 120) {
  if (!Array.isArray(raw))
    return [] as string[]
  const result: string[] = []
  for (const item of raw) {
    const normalized = asString(item, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

export function learningArtifactLedgerRecordFromMindTurnEvent(
  event: AlicizationMindTurnEventRecord,
): AlicizationLearningArtifactLedgerRecord | null {
  if (event.kind !== 'learning-executed')
    return null
  const payload = asObject(event.payload)
  if (!payload)
    return null
  const taskId = asString(payload.taskId, 180)
  if (!taskId)
    return null
  const verifiedArtifact = asObject(payload.verifiedArtifact) as AlicizationVerifiedLearningArtifact | null
  return {
    decisionTraceId: asString(event.decisionTraceId, 200),
    turnId: asString(event.turnId, 180) || null,
    sessionId: asString(event.sessionId, 180) || null,
    taskId,
    artifactId: asString(verifiedArtifact?.artifactId, 180) || null,
    claimId: asString(verifiedArtifact?.claimGraph?.claimId, 180) || null,
    action: asString(payload.action, 64),
    domain: asString(payload.domain, 64),
    resultSummary: asString(payload.resultSummary, 240) || null,
    verificationBasis: asStringList(payload.verificationBasis, 8, 80),
    sourceFactIds: uniqueList([
      ...(verifiedArtifact?.supportingFactIds ?? []),
      ...(verifiedArtifact?.contradictionFactIds ?? []),
    ]),
    verifiedArtifact,
    createdAt: event.createdAt,
  }
}

function collectSourceFactIds(record: AlicizationLearningArtifactLedgerRecord) {
  return uniqueList(record.sourceFactIds.length > 0
    ? record.sourceFactIds
    : [
        ...(record.verifiedArtifact?.supportingFactIds ?? []),
        ...(record.verifiedArtifact?.contradictionFactIds ?? []),
      ])
}

export function filterLearningArtifactLedgerRecords(
  records: AlicizationLearningArtifactLedgerRecord[],
  input: AlicizationListLearningArtifactLedgerInput,
) {
  const decisionTraceId = asString(input.decisionTraceId, 200)
  const turnId = asString(input.turnId, 180)
  const taskId = asString(input.taskId, 180)
  const artifactId = asString(input.artifactId, 180)
  const claimId = asString(input.claimId, 180)
  const sourceFactId = asString(input.sourceFactId, 180)
  const limit = Math.max(1, Math.min(5_000, Math.floor(input.limit ?? 200)))

  return records
    .filter((record) => {
      if (decisionTraceId && record.decisionTraceId !== decisionTraceId)
        return false
      if (turnId && record.turnId !== turnId)
        return false
      if (taskId && record.taskId !== taskId)
        return false
      if (artifactId && record.artifactId !== artifactId)
        return false
      if (claimId && record.claimId !== claimId)
        return false
      if (sourceFactId && !collectSourceFactIds(record).includes(sourceFactId))
        return false
      return true
    })
    .sort((left, right) => right.createdAt - left.createdAt || left.taskId.localeCompare(right.taskId))
    .slice(0, limit)
}
