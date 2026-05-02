import type { AlicizationAuditLogInput, AlicizationMindTurnEventInput } from '../../../shared/eventa'
import type { AlicizationMemoryRecollectionIntentLite } from './memory-episodic-retrieval'

type AlicizationDialogueReplyFeedbackKind = 'robotic' | 'missed' | 'intrusive' | 'interrupted' | 'received'

interface AlicizationReplyMemoryCoherenceState {
  coherenceState: string | null
  surfacePolicy: string | null
  explicitSurfaceExpected: boolean
  explicitSurfaceObserved: boolean
  matchedCueKinds: string[]
}

interface CreateAlicizationRuntimeMemoryReconsolidationOptions {
  sanitizeMindGovernanceDecisionTraceId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  errorMessageFrom: (error: unknown) => string | undefined
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  alicizationDb: {
    listMindTurnEvents: (input: { decisionTraceId: string, limit?: number }) => Promise<Array<{
      kind: string
      payload: Record<string, unknown> | null
    }>>
    searchEpisodicEvents: (input: {
      recallSeed: string
      limit?: number
      sessionId?: string | null
      turnId?: string | null
      affectAnchors?: string[]
      relationshipAnchors?: string[]
      carryAsMemory?: boolean
      recollectionIntent?: AlicizationMemoryRecollectionIntentLite | null
      reconsolidationDecisionTraceId?: string | null
    }) => Promise<Array<{ id: string }>>
    appendMindTurnEvents: (events: AlicizationMindTurnEventInput[]) => Promise<void>
  }
}

export function collectRecallTelemetryTexts(payload: Record<string, unknown> | null | undefined, sanitizeText: CreateAlicizationRuntimeMemoryReconsolidationOptions['sanitizeText']) {
  const texts: string[] = []
  const push = (raw: unknown) => {
    const text = sanitizeText(raw, '').slice(0, 180)
    if (text)
      texts.push(text)
  }

  push(payload?.whyNow)
  push(payload?.inwardLine)
  push(payload?.visibleLine)

  for (const key of ['selectedPeriods', 'selectedEpisodes', 'selectedProcedures', 'selectedBundles', 'selectedChains'] as const) {
    const items = Array.isArray(payload?.[key]) ? payload[key] : []
    for (const item of items) {
      if (!item || typeof item !== 'object')
        continue
      const candidate = item as Record<string, unknown>
      push(candidate.summary)
      push(candidate.label)
      push(candidate.approach)
      push(candidate.rationale)
      push(candidate.currentStance)
      push(candidate.answerPosture)
      push(candidate.relationshipLine)
    }
  }

  const relationshipLines = Array.isArray(payload?.selectedRelationshipLines) ? payload.selectedRelationshipLines : []
  for (const line of relationshipLines)
    push(line)

  return [...new Set(texts)].slice(0, 18)
}

export function collectReplyMemoryCoherenceState(payload: Record<string, unknown> | null | undefined, sanitizeText: CreateAlicizationRuntimeMemoryReconsolidationOptions['sanitizeText']): AlicizationReplyMemoryCoherenceState {
  return {
    coherenceState: sanitizeText(payload?.coherenceState, '').slice(0, 64) || null,
    surfacePolicy: sanitizeText(payload?.surfacePolicy, '').slice(0, 64) || null,
    explicitSurfaceExpected: payload?.explicitSurfaceExpected === true,
    explicitSurfaceObserved: payload?.explicitSurfaceObserved === true,
    matchedCueKinds: Array.isArray(payload?.matchedCueKinds)
      ? payload.matchedCueKinds.map(item => sanitizeText(item, '').slice(0, 64)).filter(Boolean).slice(0, 8)
      : [],
  }
}

export function buildDialogueFeedbackReconsolidationRationale(
  feedback: AlicizationDialogueReplyFeedbackKind,
) {
  if (feedback === 'robotic')
    return 'The host corrected this thread for sounding robotic, so the remembered way of replying should now move toward lived-in directness instead of shell fluency.'
  if (feedback === 'missed')
    return 'The host corrected this thread for missing the point, so the remembered way of replying should now repair the seam before continuing.'
  if (feedback === 'intrusive')
    return 'The host corrected this thread for landing too heavily, so the remembered way of replying should now leave more room and lower pressure.'
  if (feedback === 'interrupted')
    return 'The host turned away from this line before it landed, so the remembered way of replying should now wait for a fresher opening.'
  return 'The host corrected this remembered line, so the recalled way of answering should change on the next similar turn.'
}

export function createAlicizationRuntimeMemoryReconsolidation(
  options: CreateAlicizationRuntimeMemoryReconsolidationOptions,
) {
  const reconsolidateDialogueFeedbackMemoryTrace = async (input: {
    cardId: string
    decisionTraceId: string | null
    feedback: AlicizationDialogueReplyFeedbackKind | null
    previousAssistantText: string
    userText: string
    sessionId: string | null
    turnId: string | null
    at: number
  }) => {
    const decisionTraceId = options.sanitizeMindGovernanceDecisionTraceId(input.decisionTraceId)
    if (!decisionTraceId || !input.feedback || input.feedback === 'received')
      return

    const events = await options.alicizationDb.listMindTurnEvents({
      decisionTraceId,
      limit: 24,
    }).catch(() => [])
    const recallEvent = events.find(event => event.kind === 'recall-attribution') ?? null
    if (!recallEvent?.payload)
      return

    const coherenceEvent = events.find(event => event.kind === 'reply-memory-coherence') ?? null
    const recallTexts = collectRecallTelemetryTexts(recallEvent.payload, options.sanitizeText)
    if (recallTexts.length === 0)
      return

    const coherence = collectReplyMemoryCoherenceState(coherenceEvent?.payload ?? null, options.sanitizeText)
    const feedbackSeed = [
      input.userText,
      input.previousAssistantText,
      ...recallTexts,
      coherence.coherenceState ? `coherence:${coherence.coherenceState}` : '',
    ].filter(Boolean).join(' | ')

    const reconsolidated = await options.alicizationDb.searchEpisodicEvents({
      recallSeed: feedbackSeed,
      limit: 4,
      sessionId: input.sessionId,
      turnId: input.turnId,
      affectAnchors: [
        `feedback:${input.feedback}`,
        input.feedback === 'missed' ? 'missed answer repair pressure' : '',
        input.feedback === 'robotic' ? 'robotic shell repair pressure' : '',
        input.feedback === 'intrusive' ? 'intrusive closeness pressure' : '',
        input.feedback === 'interrupted' ? 'interrupted line pressure' : '',
      ].filter(Boolean),
      relationshipAnchors: [
        'host correction',
        input.userText,
        coherence.coherenceState ? `reply-memory-coherence:${coherence.coherenceState}` : '',
      ].filter(Boolean),
      carryAsMemory: true,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: true,
        queryHints: recallTexts.slice(0, 8),
        rationale: buildDialogueFeedbackReconsolidationRationale(input.feedback),
        confidence: 0.78,
        recollectionAgenda: {
          whyRecallNow: 'The host corrected a recalled reply line, so the remembered way of answering should be updated.',
          goalSimilarity: 0.78,
          relationshipNeed: 0.72,
          affectivePull: 0.44,
          sceneFamiliarity: 0.36,
          candidateTimeScopes: [
            {
              scope: 'experience-matched',
              weight: 0.88,
              rationale: 'Search the same remembered reply way before generic history.',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era',
              weight: 0.82,
              rationale: 'This correction is mainly about how closeness and reply posture land.',
            },
          ],
          candidateProcedureLines: recallTexts.slice(0, 4),
          uncertaintyTolerance: 'medium',
        },
      },
      reconsolidationDecisionTraceId: decisionTraceId,
    }).catch(async (error) => {
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'dialogue-feedback-reconsolidation-failed',
        message: 'Failed to reconsolidate recalled memory after host correction feedback.',
        payload: {
          cardId: input.cardId,
          decisionTraceId,
          feedback: input.feedback,
          reason: options.errorMessageFrom(error) ?? 'unknown-error',
        },
      }, input.cardId)
      return []
    })

    await options.alicizationDb.appendMindTurnEvents([{
      decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      origin: 'user-turn',
      kind: 'memory-reconsolidated',
      payload: {
        source: 'dialogue-feedback',
        feedback: input.feedback,
        recallCueCount: recallTexts.length,
        recalledEpisodeIds: reconsolidated.map(event => event.id),
        reconsolidatedCount: reconsolidated.length,
        coherence,
      },
      createdAt: input.at,
    }]).catch(async (error) => {
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'dialogue-feedback-reconsolidation-event-failed',
        message: 'Failed to append memory reconsolidation trace event after host feedback.',
        payload: {
          cardId: input.cardId,
          decisionTraceId,
          feedback: input.feedback,
          reason: options.errorMessageFrom(error) ?? 'unknown-error',
        },
      }, input.cardId)
    })
  }

  return {
    reconsolidateDialogueFeedbackMemoryTrace,
  }
}
