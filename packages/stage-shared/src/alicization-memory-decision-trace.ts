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

function extractEmbodimentAuthority(payload: Record<string, unknown> | null | undefined) {
  const performance = asObject(payload?.performance)
  const digitalLife = asObject(payload?.digitalLife)
  const digitalLifeSpine = asObject(payload?.digitalLifeSpine)
  const digitalLifeSpineRuntime = asObject(digitalLifeSpine?.runtime)
  const visibleReply = asObject(payload?.visibleReply)
  const digitalLifeFace = asObject(digitalLife?.face)
  const digitalLifeAction = asObject(digitalLife?.action)
  const embodimentScript = asObject(payload?.embodimentScript)
  const embodimentScriptState = asObject(embodimentScript?.state)
  const embodimentScriptSpeechPlan = asObject(embodimentScript?.speechPlan)

  const hasPerformance = Boolean(performance)
  const hasDigitalLife = Boolean(digitalLife)
  const hasEmbodimentScript = Boolean(embodimentScript)
  const hasVisibleReply = Boolean(visibleReply)
  if (!hasPerformance && !hasDigitalLife && !hasEmbodimentScript && !hasVisibleReply)
    return null

  return {
    emotion: sanitizeText(payload?.emotion, 64) || null,
    performance: performance
      ? {
          baseEmotion: sanitizeText(performance.baseEmotion, 64) || null,
          facialCue: sanitizeText(performance.facialCue, 64) || null,
          actionCue: sanitizeText(performance.actionCue, 64) || null,
          delivery: sanitizeText(performance.delivery, 64) || null,
          emphasis: typeof performance.emphasis === 'number' && Number.isFinite(performance.emphasis)
            ? Number(performance.emphasis)
            : null,
        }
      : null,
    digitalLife: digitalLife
      ? {
          emotion: sanitizeText(digitalLife.emotion, 64) || null,
          mode: sanitizeText(digitalLife.mode, 64) || null,
          preferredPresence: sanitizeText(digitalLifeSpineRuntime?.preferredPresence, 64) || null,
          face: digitalLifeFace
            ? {
                emotion: sanitizeText(digitalLifeFace.emotion, 64) || null,
                facialCue: sanitizeText(digitalLifeFace.facialCue, 64) || null,
              }
            : null,
          action: digitalLifeAction
            ? {
                actionCue: sanitizeText(digitalLifeAction.actionCue, 64) || null,
                actionMode: sanitizeText(digitalLifeAction.actionMode, 64) || null,
              }
            : null,
        }
      : null,
    embodimentScript: embodimentScript
      ? {
          rendererTarget: sanitizeText(embodimentScript.rendererTarget, 64) || null,
          state: embodimentScriptState
            ? {
                baseEmotion: sanitizeText(embodimentScriptState.baseEmotion, 64) || null,
                delivery: sanitizeText(embodimentScriptState.delivery, 64) || null,
                emphasis: typeof embodimentScriptState.emphasis === 'number' && Number.isFinite(embodimentScriptState.emphasis)
                  ? Number(embodimentScriptState.emphasis)
                  : null,
              }
            : null,
          speechPlan: embodimentScriptSpeechPlan
            ? {
                segmentCount: typeof embodimentScriptSpeechPlan.segmentCount === 'number' && Number.isFinite(embodimentScriptSpeechPlan.segmentCount)
                  ? Number(embodimentScriptSpeechPlan.segmentCount)
                  : null,
                interruptPolicy: sanitizeText(embodimentScriptSpeechPlan.interruptPolicy, 64) || null,
              }
            : null,
        }
      : null,
    visibleReply: visibleReply
      ? {
          expectedAuthority: sanitizeText(visibleReply.expectedAuthority, 64) || null,
          actualAuthority: sanitizeText(visibleReply.actualAuthority, 64) || null,
          providerMindExecuted: typeof visibleReply.providerMindExecuted === 'boolean'
            ? visibleReply.providerMindExecuted
            : null,
        }
      : null,
  }
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
      const embodimentAuthority = extractEmbodimentAuthority(dialogueEmitted?.payload)

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
        embodimentAuthority,
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
