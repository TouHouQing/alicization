import type { AlicizationExecutionRuntimeMemoryClosureExecution } from '@proj-alicization/stage-shared'

import type { AlicizationAuditLogInput, AlicizationMindTurnEventInput } from '../../../shared/eventa'
import type { AlicizationMemoryRecollectionIntentLite } from './memory-episodic-retrieval'

type AlicizationDialogueReplyFeedbackKind = 'robotic' | 'missed' | 'intrusive' | 'interrupted' | 'received'
type AlicizationExecutionResultFeedbackKind = 'valued' | 'doubted' | 'intrusive' | 'interrupted'

export interface AlicizationFeedbackMemoryExperience {
  felt?: string | null
  relationshipMeaning?: string | null
  lesson?: string | null
  tags?: string[] | null
}

interface AlicizationReplyMemoryCoherenceState {
  coherenceState: string | null
  surfacePolicy: string | null
  explicitSurfaceExpected: boolean
  explicitSurfaceObserved: boolean
  matchedCueKinds: string[]
}

interface AlicizationRecallSituationTelemetry {
  id: string
  kind: string | null
  summary: string | null
  evidenceSummary: string | null
  statusReason: string | null
  sourceKinds: string[]
  relationshipContext: string | null
  hostAttitude: string | null
  affectiveResidue: string | null
  executionCarry: string | null
  embodimentCarry: string | null
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

  for (const key of ['selectedPeriods', 'selectedEpisodes', 'selectedProcedures', 'selectedBundles', 'selectedChains'] as const) {
    const items = Array.isArray(payload?.[key]) ? payload[key] : []
    for (const item of items) {
      if (!item || typeof item !== 'object')
        continue
      const candidate = item as Record<string, unknown>
      push(candidate.summary)
      push(candidate.label)
      push(candidate.relationshipLine)
    }
  }

  const selectedSituations = Array.isArray(payload?.selectedSituations) ? payload.selectedSituations : []
  for (const item of selectedSituations) {
    if (!item || typeof item !== 'object')
      continue
    const candidate = item as Record<string, unknown>
    const summary = sanitizeText(candidate.summary, '').slice(0, 220)
    if (summary)
      texts.push(summary)
    const evidenceSummary = sanitizeText(candidate.evidenceSummary, '').slice(0, 520)
    if (evidenceSummary)
      texts.push(evidenceSummary)
    const statusReason = sanitizeText(candidate.statusReason, '').slice(0, 200)
    if (statusReason)
      texts.push(statusReason)
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

function uniqueReconsolidationTexts(values: Array<string | null | undefined>, maxItems = 10) {
  const result: string[] = []
  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function sanitizeFeedbackMemoryExperience(
  input: AlicizationFeedbackMemoryExperience | null | undefined,
  sanitizeText: CreateAlicizationRuntimeMemoryReconsolidationOptions['sanitizeText'],
) {
  const tags = Array.isArray(input?.tags)
    ? input!.tags!
        .map(tag => sanitizeText(tag, '').slice(0, 64))
        .filter(Boolean)
        .slice(0, 16)
    : []
  const embodimentTags = tags.filter(tag => /^(?:body-|continuity-|residue-)/u.test(tag)).slice(0, 8)
  const felt = sanitizeText(input?.felt, '').slice(0, 220) || null
  const relationshipMeaning = sanitizeText(input?.relationshipMeaning, '').slice(0, 240) || null
  const lesson = sanitizeText(input?.lesson, '').slice(0, 240) || null
  if (!felt && !relationshipMeaning && !lesson && tags.length === 0)
    return null

  return {
    felt,
    relationshipMeaning,
    lesson,
    tags,
    embodimentTags,
  }
}

function collectFeedbackExperienceTexts(
  input: ReturnType<typeof sanitizeFeedbackMemoryExperience> | null | undefined,
) {
  return uniqueReconsolidationTexts([
    input?.felt ?? null,
    input?.relationshipMeaning ?? null,
    input?.lesson ?? null,
  ], 6)
}

function sanitizeMemoryClosureExecution(
  input: AlicizationExecutionRuntimeMemoryClosureExecution | null | undefined,
  sanitizeText: CreateAlicizationRuntimeMemoryReconsolidationOptions['sanitizeText'],
): AlicizationExecutionRuntimeMemoryClosureExecution | null {
  if (!input || input.authority !== 'memory-os')
    return null

  const activeLearningFocuses = Array.isArray(input.activeLearningFocuses)
    ? [...new Set(input.activeLearningFocuses.map(focus => sanitizeText(focus, '').slice(0, 120)).filter(Boolean))].slice(0, 8)
    : []
  const reasonTags = Array.isArray(input.reasonTags)
    ? [...new Set(input.reasonTags.map(tag => sanitizeText(tag, '').slice(0, 80)).filter(Boolean))].slice(0, 12)
    : []
  const normalized = {
    authority: 'memory-os',
    carry: null,
    nextLearningAction: sanitizeText(input.nextLearningAction, '').slice(0, 80) || null,
    shouldVerify: input.shouldVerify === true,
    shouldReflect: input.shouldReflect === true,
    activeLearningFocuses,
    reasonTags,
    closureState: {
      state: sanitizeText(input.closureState?.state, '').slice(0, 80) || null,
      open: input.closureState?.open === true,
      revisionRequired: input.closureState?.revisionRequired === true,
      shouldLabelUncertainty: input.closureState?.shouldLabelUncertainty === true,
      visibleCarryMode: sanitizeText(input.closureState?.visibleCarryMode, '').slice(0, 80) || null,
      retrievalQuality: sanitizeText(input.closureState?.retrievalQuality, '').slice(0, 80) || null,
      conflictPressure: sanitizeText(input.closureState?.conflictPressure, '').slice(0, 80) || null,
    },
  } satisfies AlicizationExecutionRuntimeMemoryClosureExecution

  return normalized.carry
    || normalized.nextLearningAction
    || normalized.shouldVerify
    || normalized.shouldReflect
    || normalized.activeLearningFocuses.length > 0
    || normalized.reasonTags.length > 0
    || Object.values(normalized.closureState).some(Boolean)
    ? normalized
    : null
}

function collectMemoryClosureExecutionTexts(
  input: AlicizationExecutionRuntimeMemoryClosureExecution | null,
) {
  if (!input)
    return []

  return uniqueReconsolidationTexts([
    input.nextLearningAction ? `next-learning-action=${input.nextLearningAction}` : null,
    ...input.activeLearningFocuses.map(focus => `active-learning-focus=${focus}`),
    input.shouldVerify ? 'memory-os-verify' : null,
    input.shouldReflect ? 'memory-os-reflect' : null,
  ], 8)
}

function parseSituationEvidenceSummary(
  raw: string | null | undefined,
  sanitizeText: CreateAlicizationRuntimeMemoryReconsolidationOptions['sanitizeText'],
) {
  const evidenceSummary = sanitizeText(raw, '').slice(0, 520) || null
  const fields = {
    evidenceSummary,
    relationshipContext: null as string | null,
    hostAttitude: null as string | null,
    affectiveResidue: null as string | null,
    executionCarry: null as string | null,
    embodimentCarry: null as string | null,
  }
  if (!evidenceSummary)
    return fields

  for (const segment of evidenceSummary.split('|')) {
    const normalized = sanitizeText(segment, '').slice(0, 320)
    if (!normalized)
      continue
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex < 0)
      continue
    const key = normalized.slice(0, separatorIndex).trim().toLowerCase()
    const value = sanitizeText(normalized.slice(separatorIndex + 1), '').slice(0, 240) || null
    if (!value)
      continue
    if (key === 'relationship-context')
      fields.relationshipContext = value
    else if (key === 'host-attitude')
      fields.hostAttitude = value
    else if (key === 'affective-residue')
      fields.affectiveResidue = value
    else if (key === 'execution-carry')
      fields.executionCarry = value
    else if (key === 'embodiment-carry')
      fields.embodimentCarry = value
  }

  return fields
}

function collectRecallSituations(
  payload: Record<string, unknown> | null | undefined,
  sanitizeText: CreateAlicizationRuntimeMemoryReconsolidationOptions['sanitizeText'],
) {
  const items = Array.isArray(payload?.selectedSituations) ? payload.selectedSituations : []
  const situations: AlicizationRecallSituationTelemetry[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object')
      continue
    const candidate = item as Record<string, unknown>
    const id = sanitizeText(candidate.id, '').slice(0, 180)
    const summary = sanitizeText(candidate.summary, '').slice(0, 220) || null
    if (!id && !summary)
      continue
    const parsedEvidence = parseSituationEvidenceSummary(
      sanitizeText(candidate.evidenceSummary, '').slice(0, 520) || null,
      sanitizeText,
    )
    situations.push({
      id: id || summary || 'selected-situation',
      kind: sanitizeText(candidate.kind, '').slice(0, 64) || null,
      summary,
      evidenceSummary: parsedEvidence.evidenceSummary,
      statusReason: sanitizeText(candidate.statusReason, '').slice(0, 200) || null,
      sourceKinds: Array.isArray(candidate.sourceKinds)
        ? candidate.sourceKinds.map(kind => sanitizeText(kind, '').slice(0, 64)).filter(Boolean).slice(0, 8)
        : [],
      relationshipContext: parsedEvidence.relationshipContext,
      hostAttitude: parsedEvidence.hostAttitude,
      affectiveResidue: parsedEvidence.affectiveResidue,
      executionCarry: parsedEvidence.executionCarry,
      embodimentCarry: parsedEvidence.embodimentCarry,
    })
  }
  return situations
}

export function buildDialogueFeedbackReconsolidationRationale(
  feedback: AlicizationDialogueReplyFeedbackKind,
) {
  return `source=dialogue-feedback | feedback=${feedback}`
}

function buildExecutionResultFeedbackReconsolidationRationale(
  feedback: AlicizationExecutionResultFeedbackKind,
) {
  return `source=execution-feedback | feedback=${feedback}`
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
    feedbackExperience?: AlicizationFeedbackMemoryExperience | null
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
    const feedbackExperience = sanitizeFeedbackMemoryExperience(input.feedbackExperience, options.sanitizeText)
    const feedbackExperienceTexts = collectFeedbackExperienceTexts(feedbackExperience)
    const selectedSituations = collectRecallSituations(recallEvent.payload, options.sanitizeText)
    const recallTexts = uniqueReconsolidationTexts([
      ...feedbackExperienceTexts,
      ...collectRecallTelemetryTexts(recallEvent.payload, options.sanitizeText),
    ], 12)
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
        ...selectedSituations.flatMap(item => ([
          item.affectiveResidue ? `situation-affective-residue:${item.affectiveResidue}` : '',
          item.executionCarry ? `situation-execution-carry:${item.executionCarry}` : '',
          item.embodimentCarry ? `situation-embodiment-carry:${item.embodimentCarry}` : '',
        ])),
        ...(feedbackExperience?.tags ?? []).map(tag => `experience-tag:${tag}`),
      ].filter(Boolean),
      relationshipAnchors: [
        'host correction',
        input.userText,
        feedbackExperience?.relationshipMeaning ?? '',
        ...selectedSituations.flatMap(item => ([
          item.relationshipContext ?? '',
          item.hostAttitude ?? '',
        ])),
        coherence.coherenceState ? `reply-memory-coherence:${coherence.coherenceState}` : '',
      ].filter(Boolean),
      carryAsMemory: true,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: true,
        queryHints: recallTexts.slice(0, 10),
        rationale: buildDialogueFeedbackReconsolidationRationale(input.feedback),
        confidence: 0.78,
        recollectionAgenda: {
          whyRecallNow: 'source=host-correction | target=similar-turn',
          goalSimilarity: 0.78,
          relationshipNeed: 0.72,
          affectivePull: 0.44,
          sceneFamiliarity: 0.36,
          candidateTimeScopes: [
            {
              scope: 'experience-matched',
              weight: 0.88,
              rationale: 'source=host-correction | scope=experience-matched',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era',
              weight: 0.82,
              rationale: 'source=host-correction | facet=relationship-era',
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
        feedbackExperience,
        selectedSituations,
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

  const reconsolidateExecutionResultFeedbackMemoryTrace = async (input: {
    cardId: string
    decisionTraceId: string | null
    feedback: AlicizationExecutionResultFeedbackKind | null
    previousAssistantText: string
    userText: string
    sessionId: string | null
    turnId: string | null
    at: number
    goal: string
    outcome?: string | null
    feedbackExperience?: AlicizationFeedbackMemoryExperience | null
    memoryClosureExecution?: AlicizationExecutionRuntimeMemoryClosureExecution | null
    safetyGateSummary?: string | null
    resumeConfirmationSummary?: string | null
  }) => {
    const decisionTraceId = options.sanitizeMindGovernanceDecisionTraceId(input.decisionTraceId)
    if (!decisionTraceId || !input.feedback)
      return

    const safetyGateSummary = options.sanitizeText(input.safetyGateSummary, '').slice(0, 240) || null
    const resumeConfirmationSummary = options.sanitizeText(input.resumeConfirmationSummary, '').slice(0, 360) || null
    const feedbackExperience = sanitizeFeedbackMemoryExperience(input.feedbackExperience, options.sanitizeText)
    const feedbackExperienceTexts = collectFeedbackExperienceTexts(feedbackExperience)
    const memoryClosureExecution = sanitizeMemoryClosureExecution(input.memoryClosureExecution, options.sanitizeText)
    const memoryClosureExecutionTexts = collectMemoryClosureExecutionTexts(memoryClosureExecution)
    const recallTexts = uniqueReconsolidationTexts([
      ...memoryClosureExecutionTexts,
      ...feedbackExperienceTexts,
      options.sanitizeText(input.goal, '').slice(0, 180),
      options.sanitizeText(input.outcome, '').slice(0, 180),
      safetyGateSummary,
      resumeConfirmationSummary,
      options.sanitizeText(input.previousAssistantText, '').slice(0, 180),
      options.sanitizeText(input.userText, '').slice(0, 180),
    ], 12)
    if (recallTexts.length === 0)
      return

    const feedbackSeed = recallTexts.join(' | ')
    const reconsolidated = await options.alicizationDb.searchEpisodicEvents({
      recallSeed: feedbackSeed,
      limit: 4,
      sessionId: input.sessionId,
      turnId: input.turnId,
      affectAnchors: [
        `execution-feedback:${input.feedback}`,
        `goal:${options.sanitizeText(input.goal, '').slice(0, 120)}`,
        memoryClosureExecution?.nextLearningAction ? `memory-os-learning:${memoryClosureExecution.nextLearningAction}` : '',
        memoryClosureExecution?.shouldVerify ? 'memory-os-verify' : '',
        memoryClosureExecution?.shouldReflect ? 'memory-os-reflect' : '',
        ...(memoryClosureExecution?.reasonTags ?? []).map(tag => `memory-os-reason:${tag}`),
        safetyGateSummary ? `execution-safety-gate:${safetyGateSummary}` : '',
        resumeConfirmationSummary ? `execution-resume-confirmation:${resumeConfirmationSummary}` : '',
        ...(feedbackExperience?.tags ?? []).map(tag => `experience-tag:${tag}`),
      ].filter((value): value is string => Boolean(value)),
      relationshipAnchors: [
        'execution callback return',
        memoryClosureExecution ? 'Memory OS execution carry' : '',
        ...(memoryClosureExecution?.activeLearningFocuses ?? []),
        safetyGateSummary ? 'execution safety restraint' : '',
        safetyGateSummary ? options.sanitizeText(safetyGateSummary.match(/\binterrupt=\S+/u)?.[0], '').slice(0, 80) : '',
        resumeConfirmationSummary ? 'execution resume confirmation' : '',
        resumeConfirmationSummary ? options.sanitizeText(resumeConfirmationSummary.match(/\bapproval=\S+/u)?.[0], '').replace(/^approval=/u, '').slice(0, 80) : '',
        resumeConfirmationSummary ? options.sanitizeText(resumeConfirmationSummary.match(/\baudit=\S+/u)?.[0], '').slice(0, 80) : '',
        input.userText,
        feedbackExperience?.relationshipMeaning ?? '',
      ].filter((value): value is string => Boolean(value)),
      carryAsMemory: true,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: true,
        queryHints: recallTexts,
        rationale: [
          buildExecutionResultFeedbackReconsolidationRationale(input.feedback),
          memoryClosureExecution
            ? `source=memory-os | next-learning-action=${memoryClosureExecution.nextLearningAction ?? 'none'}`
            : '',
          safetyGateSummary ? `source=safety-gate | evidence=${safetyGateSummary}` : '',
          resumeConfirmationSummary ? `source=resume-confirmation | evidence=${resumeConfirmationSummary}` : '',
        ].filter(Boolean).join(' '),
        confidence: 0.8,
        recollectionAgenda: {
          whyRecallNow: `source=execution-feedback | target=goal | goal=${options.sanitizeText(input.goal, 'execution').slice(0, 120)}`,
          goalSimilarity: 0.84,
          relationshipNeed: 0.74,
          affectivePull: 0.42,
          sceneFamiliarity: 0.41,
          candidateTimeScopes: [
            {
              scope: 'experience-matched',
              weight: 0.9,
              rationale: 'source=execution-feedback | scope=experience-matched',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era',
              weight: 0.8,
              rationale: 'source=execution-feedback | facet=relationship-era',
            },
          ],
          candidateProcedureLines: recallTexts
            .filter((value): value is string => Boolean(value))
            .slice(0, 4),
          uncertaintyTolerance: 'medium',
        },
      },
      reconsolidationDecisionTraceId: decisionTraceId,
    }).catch(async (error) => {
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'execution-result-feedback-reconsolidation-failed',
        message: 'Failed to reconsolidate execution-result feedback into long-horizon memory.',
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
        source: 'execution-result-feedback',
        feedback: input.feedback,
        goal: options.sanitizeText(input.goal, '').slice(0, 180),
        outcome: options.sanitizeText(input.outcome, '').slice(0, 180) || null,
        feedbackExperience,
        memoryClosureExecution,
        safetyGateSummary,
        safetyGateMemoryMode: safetyGateSummary ? 'blocked-dispatch-restraint' : null,
        resumeConfirmationSummary,
        resumeMemoryMode: resumeConfirmationSummary ? 'host-confirmed-before-redispatch' : null,
        recallCueCount: recallTexts.length,
        recalledEpisodeIds: reconsolidated.map(event => event.id),
        reconsolidatedCount: reconsolidated.length,
      },
      createdAt: input.at,
    }]).catch(async (error) => {
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.memory',
        action: 'execution-result-feedback-reconsolidation-event-failed',
        message: 'Failed to append execution-result feedback reconsolidation trace event.',
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
    reconsolidateExecutionResultFeedbackMemoryTrace,
  }
}
