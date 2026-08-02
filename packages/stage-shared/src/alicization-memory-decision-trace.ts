import type { AlicizationMemoryResolutionLedger } from './alicization-memory-resolution-ledger'
import type { AlicizationOrganicMemoryStageReplay } from './alicization-memory-stats'
import type {
  AlicizationDerivedMindStateBundle,
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMindTurnEventKind,
  AlicizationMindTurnEventRecord,
} from './alicization-transport-contracts'

import { normalizeAlicizationMemoryResolutionLedger } from './alicization-memory-resolution-ledger'
import { normalizeAlicizationOrganicMemoryStageReplay } from './alicization-memory-stage-replay'
import { deriveAlicizationMindParticipationFromTrace } from './alicization-mind-participation'
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

function readStringList(raw: unknown) {
  return Array.isArray(raw)
    ? raw.map(item => sanitizeText(item, 160)).filter(Boolean)
    : []
}

function memoryClosureCausalityRecordsFromBundle(bundle: AlicizationDerivedMindStateBundle) {
  const emotionalTransitionLedger = asObject(bundle.emotionalTransitionLedger)
  const initiativeSuppression = asObject(emotionalTransitionLedger?.initiativeSuppression)
  const learningExecutionState = asObject(bundle.learningExecutionState)
  const embodimentContinuityLedger = asObject(bundle.embodimentContinuityLedger)
  return [
    asObject(emotionalTransitionLedger?.memoryClosureCausality),
    asObject(initiativeSuppression?.memoryClosureCausality),
    asObject(learningExecutionState?.memoryClosureCausality),
    asObject(embodimentContinuityLedger?.memoryClosureCausality),
  ].filter((record): record is Record<string, unknown> => Boolean(record))
}

function scoreMemoryClosureIdentityEvidence(bundle: AlicizationDerivedMindStateBundle) {
  const records = memoryClosureCausalityRecordsFromBundle(bundle)
  if (records.length === 0)
    return 0

  const identityKeys = new Set<string>()
  let explicitClosureScore = 0
  let inwardOnlyGenericPenalty = 0
  for (const record of records) {
    const memoryIdentity = asObject(record.memoryIdentity)
    const continuityKey = sanitizeText(memoryIdentity?.continuityKey, 160).toLowerCase()
    const selectedCandidateIds = readStringList(memoryIdentity?.selectedCandidateIds)
      .map(id => id.toLowerCase())
    const reasonTags = [
      ...readStringList(record.reasonTags),
      ...readStringList(memoryIdentity?.reasonTags),
    ].map(tag => tag.toLowerCase())

    if (continuityKey)
      identityKeys.add(continuityKey)
    for (const candidateId of selectedCandidateIds)
      identityKeys.add(candidateId)

    if (
      continuityKey.startsWith('fallback:')
      || selectedCandidateIds.some(id => id.startsWith('fallback-memory-closure:'))
      || reasonTags.includes('fallback-memory-closure')
      || reasonTags.includes('why-surfaced')
      || reasonTags.some(tag => tag.startsWith('memory-identity:fallback:'))
    ) {
      explicitClosureScore += 8
    }

    if (
      continuityKey.startsWith('cluster:')
      && selectedCandidateIds.length === 0
      && reasonTags.includes('gate:inward-only')
    ) {
      inwardOnlyGenericPenalty += 6
    }
  }

  return Math.min(12, identityKeys.size * 2 + explicitClosureScore) - inwardOnlyGenericPenalty
}

function scoreDerivedMindStateBundleEvidence(bundle: AlicizationDerivedMindStateBundle | null): number {
  if (!bundle)
    return 0

  let score = 1
  if (bundle.emotionalKernel)
    score += 4
  if (bundle.emotionalTransitionLedger)
    score += 8
  if (bundle.embodimentContinuityLedger)
    score += 8
  if (bundle.affectiveResidue)
    score += 4
  if (bundle.activeSelfRevision)
    score += 3
  if (bundle.learningExecutionState)
    score += 3
  if (bundle.recollectionIntent)
    score += 2
  if (bundle.recollectionPlan)
    score += 2
  if (bundle.recollectionSpeechPlan)
    score += 2
  if (bundle.memoryDeliberation)
    score += 2
  if (bundle.recallLatencyPolicy)
    score += 2
  if (bundle.dialogueRhythm)
    score += 2
  if (bundle.hostPersonModel)
    score += 2
  if (bundle.personStateProjection)
    score += 2
  if (bundle.knowledgeEvidence)
    score += 2
  score += Math.min(4, bundle.claimEvidenceGraphs?.length ?? 0)
  if (sanitizeText(bundle.summary, 220))
    score += 1
  score += scoreMemoryClosureIdentityEvidence(bundle)

  return score
}

function scoreMemoryResolutionLedgerEvidence(ledger: AlicizationMemoryResolutionLedger | null): number {
  if (!ledger)
    return 0

  let score = 1
  if (ledger.dominantClusterId)
    score += 2
  if (ledger.dominantClusterSummary)
    score += 2
  if (ledger.competingClusterId)
    score += 3
  if (ledger.competingClusterSummary)
    score += 3
  if (ledger.finalSurfacePolicy)
    score += 2
  if (ledger.finalRationale)
    score += 3
  if (ledger.shouldStayInward)
    score += 1
  if (ledger.shouldDelayUntilAfterPayoff)
    score += 1
  if (ledger.stableCoreOnly)
    score += 1
  if (ledger.shouldLabelUncertainty)
    score += 1
  score += Math.min(6, ledger.candidates.length)
  score += Math.min(4, ledger.selectedCandidates.length)
  score += Math.min(6, ledger.rejectedCandidates.length * 2)
  score += Math.min(4, ledger.suppressionTags.length)
  if (ledger.visibleCarryMode === 'explicit-recall')
    score += 2
  if (ledger.retrievalQuality === 'high')
    score += 2
  if (ledger.conflictPressure === 'medium' || ledger.conflictPressure === 'high')
    score += 1

  return score
}

function selectBestExtractedValue<T>(
  events: Array<AlicizationMindTurnEventRecord | null>,
  extract: (payload: Record<string, unknown> | null | undefined) => T | null,
  score: (value: T | null) => number,
): T | null {
  return events.reduce<{ value: T | null, score: number, createdAt: number }>((best, event) => {
    const value = extract(event?.payload)
    const evidenceScore = score(value)
    if (!value || evidenceScore <= 0)
      return best
    const createdAt = event?.createdAt ?? 0
    if (
      evidenceScore > best.score
      || (evidenceScore === best.score && createdAt >= best.createdAt)
    ) {
      return { value, score: evidenceScore, createdAt }
    }
    return best
  }, { value: null, score: 0, createdAt: -1 }).value
}

function extractEmbodimentAuthority(payload: Record<string, unknown> | null | undefined) {
  const performance = asObject(payload?.performance)
  const digitalLife = asObject(payload?.digitalLife)
  const digitalLifeSpine = asObject(payload?.digitalLifeSpine)
  const digitalLifeSpineRuntime = asObject(digitalLifeSpine?.runtime)
  const visibleReply = asObject(payload?.visibleReply)
  const digitalLifeVoice = asObject(digitalLife?.voice)
  const digitalLifeFace = asObject(digitalLife?.face)
  const digitalLifeMotion = asObject(digitalLife?.motion)
  const digitalLifeLipSync = asObject(digitalLife?.lipSync)
  const digitalLifeBodyContinuity = asObject(digitalLife?.bodyContinuity)
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
          voice: digitalLifeVoice
            ? {
                residentMode: sanitizeText(digitalLifeVoice.residentMode, 64) || null,
              }
            : null,
          face: digitalLifeFace
            ? {
                residentMode: sanitizeText(digitalLifeFace.residentMode, 64) || null,
                emotion: sanitizeText(digitalLifeFace.emotion, 64) || null,
                facialCue: sanitizeText(digitalLifeFace.facialCue, 64) || null,
              }
            : null,
          motion: digitalLifeMotion
            ? {
                residentMode: sanitizeText(digitalLifeMotion.residentMode, 64) || null,
              }
            : null,
          lipSync: digitalLifeLipSync
            ? {
                residentMode: sanitizeText(digitalLifeLipSync.residentMode, 64) || null,
              }
            : null,
          bodyContinuity: digitalLifeBodyContinuity
            ? {
                bodyLine: sanitizeText(digitalLifeBodyContinuity.bodyLine, 220) || null,
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
                residentMode: sanitizeText(embodimentScriptState.residentMode, 64) || null,
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
      const memoryReconsolidated = byKind('memory-reconsolidated')
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
      const evidenceEvents = [governance, persistenceWritten, dialogueEmitted]
      const derivedMindStateBundle = selectBestExtractedValue(
        evidenceEvents,
        extractDerivedMindStateBundle,
        scoreDerivedMindStateBundleEvidence,
      )
      const memoryStageReplay = extractMemoryStageReplay(governance?.payload)
        || extractMemoryStageReplay(persistenceWritten?.payload)
        || extractMemoryStageReplay(dialogueEmitted?.payload)
        || null
      const memoryResolutionLedger = selectBestExtractedValue(
        evidenceEvents,
        extractMemoryResolutionLedger,
        scoreMemoryResolutionLedgerEvidence,
      )
      const embodimentAuthority = extractEmbodimentAuthority(dialogueEmitted?.payload)
        || extractEmbodimentAuthority(persistenceWritten?.payload)
        || extractEmbodimentAuthority(governance?.payload)

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
        memoryReconsolidated: memoryReconsolidated?.payload ?? null,
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
