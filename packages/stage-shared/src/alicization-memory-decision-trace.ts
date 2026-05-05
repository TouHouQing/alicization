import type {
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
} from './alicization-transport-contracts'

import type { AlicizationOrganicMemoryStageReplay } from './alicization-memory-stats'
import type { AlicizationMemoryResolutionLedger } from './alicization-memory-resolution-ledger'
import { deriveAlicizationMindParticipationFromTrace } from './alicization-mind-participation'
import { normalizeAlicizationMemoryResolutionLedger } from './alicization-memory-resolution-ledger'
import { normalizeAlicizationOrganicMemoryStageReplay } from './alicization-memory-stage-replay'
import { normalizeAlicizationDerivedMindStateBundle } from './alicization-transport-contracts'

function asObject(raw: unknown) {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function extractActiveThreadId(payload: Record<string, unknown> | null | undefined) {
  const digitalLifeSpine = asObject(payload?.digitalLifeSpine)
  const runtime = asObject(digitalLifeSpine?.runtime)
  return sanitizeText(runtime?.activeThreadId, 160) || null
}

function extractDerivedMindStateBundle(payload: Record<string, unknown> | null | undefined) {
  return normalizeAlicizationDerivedMindStateBundle(payload?.derivedMindStateBundle)
}

function extractMemoryStageReplay(payload: Record<string, unknown> | null | undefined): AlicizationOrganicMemoryStageReplay | null {
  return normalizeAlicizationOrganicMemoryStageReplay(payload?.memoryStageReplay)
}

function extractMemoryResolutionLedger(payload: Record<string, unknown> | null | undefined): AlicizationMemoryResolutionLedger | null {
  return normalizeAlicizationMemoryResolutionLedger(payload?.memoryResolutionLedger)
}

function uniqueKinds(kinds: AlicizationMindTurnEventKind[]) {
  return [...new Set(kinds)]
}

export function buildAlicizationMemoryDecisionTraceRecords(
  events: AlicizationMindTurnEventRecord[],
): AlicizationMemoryDecisionTraceRecord[] {
  const grouped = new Map<string, AlicizationMindTurnEventRecord[]>()
  for (const event of [...events].sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))) {
    const key = sanitizeText(event.decisionTraceId, 200)
    if (!key)
      continue
    grouped.set(key, [...(grouped.get(key) ?? []), event])
  }

  return [...grouped.entries()]
    .map(([decisionTraceId, rows]) => {
      const first = rows[0]!
      const last = rows.at(-1)!
      const byKind = (kind: AlicizationMindTurnEventKind) => rows.find(row => row.kind === kind) ?? null
      const governance = byKind('governance-normalized')
      const recallAttribution = byKind('recall-attribution')
      const memoryDeliberationJudged = byKind('memory-deliberation-judged')
      const memoryRecallWithheld = byKind('memory-recall-withheld')
      const memoryStableCoreSurfaced = byKind('memory-stable-core-surfaced')
      const memoryFollowUpDeferred = byKind('memory-followup-deferred')
      const memoryWrongThreadSuppressed = byKind('memory-wrong-thread-suppressed')
      const replyMemoryCoherence = byKind('reply-memory-coherence')
      const persistenceWritten = byKind('persistence-written')
      const dialogueEmitted = byKind('dialogue-emitted')
      const takeoverAudit = byKind('takeover-audit')
      const memoryFactsUpserted = byKind('memory-facts-upserted')
      const personStateUpdated = byKind('person-state-updated')
      const learningExecuted = byKind('learning-executed')
      const activeThreadId = extractActiveThreadId(governance?.payload)
        || extractActiveThreadId(persistenceWritten?.payload)
        || extractActiveThreadId(dialogueEmitted?.payload)
        || null
      const derivedMindStateBundle = extractDerivedMindStateBundle(governance?.payload)
        || extractDerivedMindStateBundle(persistenceWritten?.payload)
        || extractDerivedMindStateBundle(dialogueEmitted?.payload)
        || null
      const memoryStageReplay = extractMemoryStageReplay(governance?.payload)
        || extractMemoryStageReplay(persistenceWritten?.payload)
        || extractMemoryStageReplay(dialogueEmitted?.payload)
        || null
      const memoryResolutionLedger = extractMemoryResolutionLedger(governance?.payload)
        || extractMemoryResolutionLedger(persistenceWritten?.payload)
        || extractMemoryResolutionLedger(dialogueEmitted?.payload)
        || null

      return {
        decisionTraceId,
        turnId: first.turnId ?? null,
        sessionId: first.sessionId ?? null,
        origin: first.origin,
        activeThreadId,
        createdAt: first.createdAt,
        lastUpdatedAt: last.createdAt,
        eventKinds: uniqueKinds(rows.map(row => row.kind)),
        governance: governance?.payload
          ? {
              turnMode: sanitizeText(governance.payload.turnMode, 64) || null,
              truthState: sanitizeText(governance.payload.truthState, 64) || null,
              repairState: sanitizeText(governance.payload.repairState, 64) || null,
              answerSubject: sanitizeText(governance.payload.answerSubject, 64) || null,
              screenReferenceMode: sanitizeText(governance.payload.screenReferenceMode, 64) || null,
              digitalLifeSpine: asObject(governance.payload.digitalLifeSpine) as AlicizationMemoryDecisionTraceRecord['governance'] extends infer T
                ? T extends { digitalLifeSpine?: infer U }
                  ? U
                  : never
                : never,
            }
          : null,
        recallAttribution: recallAttribution?.payload ?? null,
        memoryDeliberationJudged: memoryDeliberationJudged?.payload ?? null,
        memoryRecallWithheld: memoryRecallWithheld?.payload ?? null,
        memoryStableCoreSurfaced: memoryStableCoreSurfaced?.payload ?? null,
        memoryFollowUpDeferred: memoryFollowUpDeferred?.payload ?? null,
        memoryWrongThreadSuppressed: memoryWrongThreadSuppressed?.payload ?? null,
        replyMemoryCoherence: replyMemoryCoherence?.payload ?? null,
        persistenceWritten: persistenceWritten?.payload ?? null,
        dialogueEmitted: dialogueEmitted?.payload ?? null,
        takeoverAudit: takeoverAudit?.payload ?? null,
        memoryFactsUpserted: memoryFactsUpserted?.payload ?? null,
        personStateUpdated: personStateUpdated?.payload ?? null,
        learningExecuted: learningExecuted?.payload ?? null,
        participation: deriveAlicizationMindParticipationFromTrace({
          governance: governance?.payload
            ? {
                digitalLifeSpine: asObject(governance.payload.digitalLifeSpine) as AlicizationMemoryDecisionTraceRecord['governance'] extends infer T
                  ? T extends { digitalLifeSpine?: infer U }
                    ? U
                    : never
                  : never,
              }
            : null,
          dialogueEmitted: dialogueEmitted?.payload ?? null,
          persistenceWritten: persistenceWritten?.payload ?? null,
        }),
        derivedMindStateBundle,
        memoryStageReplay,
        memoryResolutionLedger,
      } satisfies AlicizationMemoryDecisionTraceRecord
    })
    .sort((left, right) => right.lastUpdatedAt - left.lastUpdatedAt || left.decisionTraceId.localeCompare(right.decisionTraceId))
}
