import type {
  AlicizationMindTurnEventRecord,
} from './alicization-transport-contracts'
import type { AlicizationVerifiedLearningArtifact } from './alicization-claim-evidence-graph'

export interface AlicizationLearningArtifactLedgerRecord {
  decisionTraceId: string
  turnId: string | null
  sessionId: string | null
  taskId: string
  action: string
  domain: string
  resultSummary: string | null
  verificationBasis: string[]
  verifiedArtifact: AlicizationVerifiedLearningArtifact | null
  createdAt: number
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
  return {
    decisionTraceId: asString(event.decisionTraceId, 200),
    turnId: asString(event.turnId, 180) || null,
    sessionId: asString(event.sessionId, 180) || null,
    taskId,
    action: asString(payload.action, 64),
    domain: asString(payload.domain, 64),
    resultSummary: asString(payload.resultSummary, 240) || null,
    verificationBasis: asStringList(payload.verificationBasis, 8, 80),
    verifiedArtifact: asObject(payload.verifiedArtifact) as AlicizationVerifiedLearningArtifact | null,
    createdAt: event.createdAt,
  }
}
