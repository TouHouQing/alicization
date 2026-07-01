import type { AlicizationExecutionRuntimeMemoryClosureExecution } from '@proj-alicization/stage-shared'

import type { AlicizationAuditLogInput, AlicizationMindTurnEventInput } from '../../../shared/eventa'
import type { AlicizationMemoryRecollectionIntentLite } from './memory-episodic-retrieval'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'

type AlicizationDialogueReplyFeedbackKind = 'robotic' | 'missed' | 'intrusive' | 'interrupted' | 'received'
type AlicizationExecutionResultFeedbackKind = 'valued' | 'doubted' | 'intrusive' | 'interrupted'

export interface AlicizationFeedbackMemoryExperience {
  felt?: string | null
  relationshipMeaning?: string | null
  lesson?: string | null
  tags?: string[] | null
}

export interface AlicizationExecutionFeedbackProjectBriefing {
  identity?: string | null
  currentPhase?: string | null
  latestLandedProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
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
    carry: sanitizeText(input.carry, '').slice(0, 220) || null,
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
    input.carry,
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

function buildExecutionResultFeedbackReconsolidationRationale(
  feedback: AlicizationExecutionResultFeedbackKind,
) {
  if (feedback === 'valued')
    return 'The host received this execution callback as useful, so the remembered way of returning after action should stay grounded and quietly continuous instead of collapsing into a detached utility notice.'
  if (feedback === 'doubted')
    return 'The host doubted this execution callback, so the remembered way of returning after action should verify more before sounding certain and should not widen into task-shell confidence.'
  if (feedback === 'intrusive')
    return 'The host felt this execution callback landed too heavily, so the remembered way of returning after action should leave more room and stay lower-pressure.'
  return 'The host turned away from this execution callback before it fully landed, so the remembered way of returning after action should wait for a fresher opening while keeping continuity inwardly alive.'
}

export function createAlicizationRuntimeMemoryReconsolidation(
  options: CreateAlicizationRuntimeMemoryReconsolidationOptions,
) {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const projectStatePrimaryOpenLoop = projectStateBrief.openLoops[0] ?? null
  const projectStateLandedProgress = Array.isArray((projectStateBrief as { latestLandedProgress?: unknown[] }).latestLandedProgress)
    ? ((projectStateBrief as { latestLandedProgress?: unknown[] }).latestLandedProgress?.[0] as string | null | undefined) ?? null
    : null

  const buildReconsolidatedProjectState = (input?: {
    projectBriefing?: AlicizationExecutionFeedbackProjectBriefing | null
    selfContinuityInwardLine?: string | null
    selfContinuitySourceTags?: string[] | null
  }) => {
    const selfContinuityInwardLine = options.sanitizeText(input?.selfContinuityInwardLine, '').slice(0, 220) || null
    const selfContinuitySourceTags = Array.isArray(input?.selfContinuitySourceTags)
      ? input!.selfContinuitySourceTags!
          .map(tag => options.sanitizeText(tag, '').slice(0, 64))
          .filter(Boolean)
          .slice(0, 12)
      : []
    const projectBriefing = input?.projectBriefing ?? null
    const canonicalProjectState = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: projectBriefing?.identity ?? projectStateBrief.identity,
        currentPhase: projectBriefing?.currentPhase ?? projectStateBrief.currentPhase,
        latestLandedProgress: projectBriefing?.latestLandedProgress ?? projectStateLandedProgress,
        primaryOpenLoop: projectBriefing?.primaryOpenLoop ?? projectStatePrimaryOpenLoop,
        nextClosureTarget: projectBriefing?.nextClosureTarget ?? projectStateBrief.nextClosureTarget ?? '',
        sameHerSelfLine: projectBriefing?.sameHerSelfLine ?? projectStateBrief.sameHerSelfLine,
        sameHerDriftRisk: projectBriefing?.sameHerDriftRisk ?? projectStateBrief.sameHerDriftRisk,
      },
      runtimePreflightSummary: projectBriefing?.preflightSummary ?? projectStateBrief.preflightSummary ?? null,
      runtimePreDialogueAwarenessLine: projectBriefing?.preDialogueAwarenessLine ?? projectStateBrief.preDialogueAwarenessLine ?? null,
    })
    return {
      preflightSummary: canonicalProjectState.preflightSummary,
      preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine,
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      latestLandedProgress: canonicalProjectState.latestLandedProgress,
      landedProgressSummary: canonicalProjectState.latestLandedProgress,
      primaryOpenLoop: canonicalProjectState.primaryOpenLoop,
      nextClosureTarget: canonicalProjectState.nextClosureTarget ?? null,
      sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
      sameHerSummary: canonicalProjectState.sameHerSelfLine,
      sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
      selfContinuityInwardLine,
      selfContinuitySourceTags,
    }
  }

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
    selfContinuityInwardLine?: string | null
    selfContinuitySourceTags?: string[] | null
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
    const projectState = buildReconsolidatedProjectState({
      selfContinuityInwardLine: input.selfContinuityInwardLine,
      selfContinuitySourceTags: input.selfContinuitySourceTags,
    })
    const selfContinuityInwardLine = projectState.selfContinuityInwardLine
    const selfContinuitySourceTags = projectState.selfContinuitySourceTags
    if (recallTexts.length === 0)
      return

    const coherence = collectReplyMemoryCoherenceState(coherenceEvent?.payload ?? null, options.sanitizeText)
    const feedbackSeed = [
      input.userText,
      input.previousAssistantText,
      selfContinuityInwardLine ?? '',
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
        projectStatePrimaryOpenLoop ? `project-open-loop:${projectStatePrimaryOpenLoop}` : '',
        selfContinuitySourceTags.includes('project-state-carry') ? 'project-state-inward-carry' : '',
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
        selfContinuityInwardLine ? `self-continuity:${selfContinuityInwardLine}` : '',
        coherence.coherenceState ? `reply-memory-coherence:${coherence.coherenceState}` : '',
        projectStateBrief.currentPhase,
      ].filter(Boolean),
      carryAsMemory: true,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: true,
        queryHints: recallTexts.slice(0, 10),
        rationale: `${buildDialogueFeedbackReconsolidationRationale(input.feedback)} Keep Phase 1 digital-life closure pressure in view while updating this remembered reply way.`,
        confidence: 0.78,
        recollectionAgenda: {
          whyRecallNow: selfContinuityInwardLine
            ? `The host corrected a recalled reply line, so the remembered way of answering should be updated without losing the current digital-life closure pressure carried inward as ${selfContinuityInwardLine}.`
            : 'The host corrected a recalled reply line, so the remembered way of answering should be updated without losing the current digital-life closure pressure.',
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
        feedbackExperience,
        selectedSituations,
        projectState,
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
    projectBriefing?: AlicizationExecutionFeedbackProjectBriefing | null
    safetyGateSummary?: string | null
    resumeConfirmationSummary?: string | null
  }) => {
    const decisionTraceId = options.sanitizeMindGovernanceDecisionTraceId(input.decisionTraceId)
    if (!decisionTraceId || !input.feedback)
      return

    const projectState = buildReconsolidatedProjectState({
      projectBriefing: input.projectBriefing ?? null,
    })
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
      options.sanitizeText(projectState.preDialogueAwarenessLine, '').slice(0, 180),
      options.sanitizeText(projectState.primaryOpenLoop, '').slice(0, 180),
      options.sanitizeText(projectState.nextClosureTarget, '').slice(0, 180),
      options.sanitizeText(projectState.sameHerSelfLine, '').slice(0, 180),
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
        projectState.primaryOpenLoop ? `project-open-loop:${projectState.primaryOpenLoop}` : '',
        projectState.sameHerDriftRisk ? `project-drift-risk:${projectState.sameHerDriftRisk}` : '',
        ...(feedbackExperience?.tags ?? []).map(tag => `experience-tag:${tag}`),
      ].filter((value): value is string => Boolean(value)),
      relationshipAnchors: [
        'execution callback return',
        memoryClosureExecution ? 'Memory OS execution carry' : '',
        memoryClosureExecution?.carry ?? '',
        ...(memoryClosureExecution?.activeLearningFocuses ?? []),
        safetyGateSummary ? 'execution safety restraint' : '',
        safetyGateSummary ? options.sanitizeText(safetyGateSummary.match(/\binterrupt=\S+/u)?.[0], '').slice(0, 80) : '',
        resumeConfirmationSummary ? 'execution resume confirmation' : '',
        resumeConfirmationSummary ? options.sanitizeText(resumeConfirmationSummary.match(/\bapproval=\S+/u)?.[0], '').replace(/^approval=/u, '').slice(0, 80) : '',
        resumeConfirmationSummary ? options.sanitizeText(resumeConfirmationSummary.match(/\baudit=\S+/u)?.[0], '').slice(0, 80) : '',
        input.userText,
        feedbackExperience?.relationshipMeaning ?? '',
        projectState.currentPhase,
        projectState.sameHerSelfLine ?? '',
      ].filter((value): value is string => Boolean(value)),
      carryAsMemory: true,
      recollectionIntent: {
        mode: 'relationship-history',
        temporalFocus: 'experience-matched',
        searchEpisodes: true,
        searchConversations: true,
        searchProceduralExperience: true,
        queryHints: recallTexts,
        rationale: `${buildExecutionResultFeedbackReconsolidationRationale(input.feedback)} ${memoryClosureExecution?.carry ? `Memory OS says the execution callback must be carried into the next same-person reply: ${memoryClosureExecution.carry}.` : ''} ${safetyGateSummary ? 'Treat this blocked dispatch as safety gate restraint, not a generic failed result.' : ''} ${resumeConfirmationSummary ? 'Treat this host-confirmed resume before redispatch as a confirmation boundary, not as ordinary autonomous continuation.' : ''} Keep the still-open Phase 1 closure pressure and callback same-her line explicit while remembering how execution returns should land.`,
        confidence: 0.8,
        recollectionAgenda: {
          whyRecallNow: `The host just reacted to an execution callback return for ${options.sanitizeText(input.goal, 'this execution line').slice(0, 120)}, so Alicization should remember how the current Phase 1 context ought to come back after acting.`,
          goalSimilarity: 0.84,
          relationshipNeed: 0.74,
          affectivePull: 0.42,
          sceneFamiliarity: 0.41,
          candidateTimeScopes: [
            {
              scope: 'experience-matched',
              weight: 0.9,
              rationale: 'Search previous execution-return moments before falling back to generic history.',
            },
          ],
          candidateEraFacets: [
            {
              facet: 'relationship-era',
              weight: 0.8,
              rationale: 'This feedback is about how execution results should land between her and the host.',
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
        projectState,
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
