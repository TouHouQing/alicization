import type { AlicizationExecutionRuntimeMemoryClosureExecution } from '@proj-alicization/stage-shared'

import type {
  AlicizationAuditLogInput,
  AlicizationChatStartPayload,
  AlicizationExecutionEventRecord,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
} from '../../../shared/eventa'
import type { AlicizationOutcomeClosureResult, buildExecutionProposalFeedbackOutcomeClosure, buildExecutionResultFeedbackOutcomeClosure, deriveExecutionProposalFeedbackKind, deriveExecutionResultFeedbackKind } from './outcome-reinforcement'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  formatAlicizationProjectStateAwarenessFields,
  normalizeAlicizationDerivedMindStateBundle,
  normalizeAlicizationExecutionRuntimeContext,
} from '@proj-alicization/stage-shared'

import {
  readLatestExecutionEvent,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'
import {
  resolveAlicizationChatStartPayloadPreDialogueSendIdentity,
  summarizeAlicizationPreDialogueSendIdentityForDebug,
} from './main-chat-start-awareness'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import {
  isAlicizationAutonomousDialogueOrigin,
  resolveAlicizationAutonomousDialogueFamilyClassification,
} from './runtime-structured-format'

type AlicizationExecutionProposalFeedbackKind = NonNullable<ReturnType<typeof deriveExecutionProposalFeedbackKind>>
type AlicizationExecutionResultFeedbackKind = NonNullable<ReturnType<typeof deriveExecutionResultFeedbackKind>>

interface AlicizationFeedbackMemoryExperience {
  felt?: string | null
  relationshipMeaning?: string | null
  lesson?: string | null
  tags?: string[] | null
}

interface CreateAlicizationRuntimeExecutionFeedbackOptions {
  normalizeCardId: (raw: unknown) => string
  sanitizeText: (raw: unknown, fallback?: string) => string
  readLatestUserMessageText: (messages: AlicizationChatStartPayload['messages']) => string
  readLatestAssistantMessageText: (messages: AlicizationChatStartPayload['messages']) => string
  ensureActiveOrLatestSessionId: (cardId: string) => Promise<string>
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>, options?: {
    label?: string
    skipQueueWhenScopeAlreadyActive?: boolean
  }) => Promise<T>
  readTaskThreadActivityAt: (thread: AlicizationTaskThreadRecord) => number
  attachSynthesizedReflections: (input: AlicizationOutcomeClosureResult) => AlicizationOutcomeClosureResult
  buildExecutionProposalFeedbackOutcomeClosure: typeof buildExecutionProposalFeedbackOutcomeClosure
  buildExecutionResultFeedbackOutcomeClosure: typeof buildExecutionResultFeedbackOutcomeClosure
  deriveExecutionProposalFeedbackKind: typeof deriveExecutionProposalFeedbackKind
  deriveExecutionResultFeedbackKind: typeof deriveExecutionResultFeedbackKind
  persistOutcomeClosure: (cardIdRaw: unknown, input: AlicizationOutcomeClosureResult) => Promise<void>
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  memoryReconsolidationRuntime?: {
    reconsolidateExecutionResultFeedbackMemoryTrace?: (input: {
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
      projectBriefing?: ReturnType<typeof mergeExecutionResultFeedbackProjectBriefing> | null
      safetyGateSummary?: string | null
      resumeConfirmationSummary?: string | null
    }) => Promise<void>
  }
  alicizationDb: {
    listTaskThreads: (input: {
      sessionId: string
      status: AlicizationTaskThreadStatus[]
      limit?: number
    }) => Promise<AlicizationTaskThreadRecord[]>
    listExecutionEvents?: (input: {
      threadId: string
      limit?: number
    }) => Promise<AlicizationExecutionEventRecord[]>
    getLatestRelationshipDynamics: () => Promise<{ hostAttitude: string } | null>
    appendRelationshipDynamics: (input: {
      hostAttitude: string
      previousHostAttitude?: string | null
      obedienceDelta?: number
      livelinessDelta?: number
      sensibilityDelta?: number
      source: string
      createdAt?: number
    }) => Promise<void>
    upsertTaskThread: (input: AlicizationTaskThreadRecord) => Promise<unknown>
  }
}

function upgradeLegacyExecutionProjectSeamText(text: string) {
  if (!text)
    return ''

  const normalized = text.toLowerCase()
  const carriesSameLifeClosure
    = /same-her|same her|same-life|same life|same living line|same-her line|life loop|closure seam|closure line|同一条|同一个 her|数字生命线|生命线|闭环/u.test(normalized)
      || /open=记忆、主动性和具身闭环/u.test(text)

  if (!carriesSameLifeClosure)
    return text

  return text
    .replace(/(?<!情绪、)记忆、主动性和具身/g, '情绪、记忆、主动性和具身')
    .replace(/(?<!情绪、)记忆、主动性、具身/g, '情绪、记忆、主动性、具身')
    .replace(/(?<![Ee]motion,\s)Memory, initiative, and embodiment/g, 'Emotion, memory, initiative, and embodiment')
    .replace(/(?<![Ee]motion,\s)memory, initiative, and embodiment/g, 'emotion, memory, initiative, and embodiment')
}

type ExecutionProjectBriefingTextField
  = | 'identity'
    | 'phase'
    | 'landed'
    | 'open'
    | 'next'
    | 'continuity_anchor'
    | 'continuity_hold'
    | 'continuity_drift_risk'
    | 'emotional_closure'
    | 'awareness'
    | 'summary'

function extractExecutionProjectAwarenessFieldValue(structured: string, key: string) {
  return structured
    .split('|')
    .map(part => part.trim())
    .find(part => part.startsWith(`${key}=`))
    ?.replace(new RegExp(`^${key}=`, 'u'), '')
    .trim()
    || ''
}

function sanitizeExecutionProjectBriefingText(
  raw: unknown,
  maxChars: number,
  field: ExecutionProjectBriefingTextField = 'summary',
) {
  if (typeof raw !== 'string')
    return null

  const text = upgradeLegacyExecutionProjectSeamText(raw.trim().replace(/\s+/g, ' '))
  if (!text)
    return null

  const normalized = text.slice(0, maxChars)
  const formatInput = (() => {
    if (field === 'identity')
      return { identity: normalized, maxChars }
    if (field === 'phase')
      return { currentPhase: normalized, maxChars }
    if (field === 'landed')
      return { latestLandedProgress: normalized, maxChars }
    if (field === 'open')
      return { primaryOpenLoop: normalized, maxChars }
    if (field === 'next')
      return { nextClosureTarget: normalized, maxChars }
    if (field === 'continuity_anchor')
      return { sameHerSelfLine: normalized, maxChars }
    if (field === 'continuity_hold')
      return { sameHerHoldDetail: normalized, maxChars }
    if (field === 'continuity_drift_risk')
      return { sameHerDriftRisk: normalized, maxChars }
    if (field === 'emotional_closure')
      return { emotionalClosureCue: normalized, maxChars }
    if (field === 'awareness') {
      return containsAlicizationFixedTemplateResidue(normalized)
        ? {
            identity: normalized,
            currentPhase: normalized,
            latestLandedProgress: normalized,
            primaryOpenLoop: normalized,
            nextClosureTarget: normalized,
            sameHerSelfLine: normalized,
            sameHerHoldDetail: normalized,
            sameHerDriftRisk: normalized,
            emotionalClosureCue: normalized,
            summary: normalized,
            maxChars,
          }
        : { summary: normalized, maxChars }
    }
    return { summary: normalized, maxChars }
  })()
  const formatted = formatAlicizationProjectStateAwarenessFields(formatInput)
  if (field === 'awareness')
    return formatted || (containsAlicizationFixedTemplateResidue(normalized) ? alicizationFixedTemplateReplacement : normalized)

  const key = field === 'summary' ? 'summary' : field
  const extracted = extractExecutionProjectAwarenessFieldValue(formatted, key)
  if (extracted)
    return extracted

  return containsAlicizationFixedTemplateResidue(normalized)
    ? alicizationFixedTemplateReplacement
    : normalized
}

function readFabricAffirmationReasonCodes(thread: AlicizationTaskThreadRecord) {
  const fabric = (thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata) && thread.metadata.fabric && typeof thread.metadata.fabric === 'object' && !Array.isArray(thread.metadata.fabric))
    ? thread.metadata.fabric as { affirmationReasonCodes?: unknown }
    : null
  return Array.isArray(fabric?.affirmationReasonCodes)
    ? fabric!.affirmationReasonCodes as string[]
    : []
}

function buildExecutionResultFeedbackHostAttitude(feedback: AlicizationExecutionResultFeedbackKind) {
  if (feedback === 'valued')
    return 'execution_feedback=valued; trust_delta=positive; reply_policy=continue_with_evidence; visibility=structured'
  if (feedback === 'doubted')
    return 'execution_feedback=doubted; trust_delta=verify_required; reply_policy=avoid_overclaim; visibility=structured'
  if (feedback === 'intrusive')
    return 'execution_feedback=intrusive; distance_delta=more_space; reply_policy=lower_pressure; visibility=structured'
  return 'execution_feedback=interrupted; distance_delta=paused; reply_policy=wait_for_new_user_opening; visibility=structured'
}

function extractExecutionResultFeedbackExperienceFromClosure(
  closure: AlicizationOutcomeClosureResult | null | undefined,
  sanitizeText: CreateAlicizationRuntimeExecutionFeedbackOptions['sanitizeText'],
): AlicizationFeedbackMemoryExperience | null {
  const event = closure?.episodicEvents?.find(item => sanitizeText(item?.sourceKind, '') === 'execution-result')
    ?? closure?.episodicEvents?.find(item => sanitizeText(item?.sourceKind, '').includes('execution'))
    ?? closure?.episodicEvents?.[0]
  if (!event)
    return null

  const tags = Array.isArray(event.tags)
    ? event.tags.map(tag => sanitizeText(tag, '').slice(0, 64)).filter(Boolean).slice(0, 16)
    : []
  const felt = sanitizeText(event.felt, '').slice(0, 220) || null
  const relationshipMeaning = sanitizeText(event.relationshipMeaning, '').slice(0, 240) || null
  const lesson = sanitizeText(event.lesson, '').slice(0, 240) || null

  if (!felt && !relationshipMeaning && !lesson && tags.length === 0)
    return null

  return {
    felt,
    relationshipMeaning,
    lesson,
    tags,
  }
}

function readExecutionResultFeedbackProjectBriefing(thread: AlicizationTaskThreadRecord) {
  const metadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
    ? thread.metadata as {
      execution?: {
        runtimeContext?: {
          projectBriefing?: {
            currentPhase?: unknown
            identity?: unknown
            latestLandedProgress?: unknown
            latestProgress?: unknown
            landedProgressSummary?: unknown
            nextClosureTarget?: unknown
            nextClosureTargetSummary?: unknown
            preDialogueAwarenessLine?: unknown
            preDialogueAwarenessSummary?: unknown
            companionBriefingLine?: unknown
            preflightSummary?: unknown
            primaryOpenLoop?: unknown
            openClosureSummary?: unknown
            proactiveSameHerGap?: unknown
            sameHerHoldDetail?: unknown
            sameHerDriftRisk?: unknown
            sameHerDriftRiskSummary?: unknown
            sameHerSelfLine?: unknown
            emotionalClosureCue?: unknown
            emotionalClosureSummary?: unknown
            continuityArcStage?: unknown
            continuityRestraint?: unknown
            continuityCue?: unknown
            continuityPreferredTiming?: unknown
            continuityCadence?: unknown
            preferredBlinkCadence?: unknown
            preferredGazeMode?: unknown
            preferredPauseMode?: unknown
            preferredLipsyncMode?: unknown
            preferredVoiceMode?: unknown
            preferredPacingMode?: unknown
          } | null
        } | null
      } | null
    }
    : null
  const projectBriefing = metadata?.execution?.runtimeContext?.projectBriefing
  if (!projectBriefing || typeof projectBriefing !== 'object' || Array.isArray(projectBriefing))
    return null
  return {
    identity: sanitizeExecutionProjectBriefingText(projectBriefing.identity, 220, 'identity'),
    currentPhase: sanitizeExecutionProjectBriefingText(projectBriefing.currentPhase, 220, 'phase'),
    latestLandedProgress: sanitizeExecutionProjectBriefingText(projectBriefing.latestLandedProgress, 320, 'landed'),
    latestProgress: sanitizeExecutionProjectBriefingText(projectBriefing.latestProgress, 320, 'landed'),
    landedProgressSummary: sanitizeExecutionProjectBriefingText(projectBriefing.landedProgressSummary, 320, 'landed'),
    primaryOpenLoop: sanitizeExecutionProjectBriefingText(projectBriefing.primaryOpenLoop, 320, 'open'),
    openClosureSummary: sanitizeExecutionProjectBriefingText(projectBriefing.openClosureSummary, 320, 'open'),
    proactiveSameHerGap: sanitizeExecutionProjectBriefingText(projectBriefing.proactiveSameHerGap, 320, 'summary'),
    nextClosureTarget: sanitizeExecutionProjectBriefingText(projectBriefing.nextClosureTarget, 320, 'next'),
    nextClosureTargetSummary: sanitizeExecutionProjectBriefingText(projectBriefing.nextClosureTargetSummary, 320, 'next'),
    sameHerSelfLine: sanitizeExecutionProjectBriefingText(projectBriefing.sameHerSelfLine, 220, 'continuity_anchor'),
    sameHerHoldDetail: sanitizeExecutionProjectBriefingText(projectBriefing.sameHerHoldDetail, 220, 'continuity_hold'),
    sameHerDriftRisk: sanitizeExecutionProjectBriefingText(projectBriefing.sameHerDriftRisk, 320, 'continuity_drift_risk'),
    sameHerDriftRiskSummary: sanitizeExecutionProjectBriefingText(projectBriefing.sameHerDriftRiskSummary, 320, 'continuity_drift_risk'),
    preflightSummary: sanitizeExecutionProjectBriefingText(projectBriefing.preflightSummary, 320, 'awareness'),
    preDialogueAwarenessLine: sanitizeExecutionProjectBriefingText(projectBriefing.preDialogueAwarenessLine, 320, 'awareness'),
    preDialogueAwarenessSummary: sanitizeExecutionProjectBriefingText(projectBriefing.preDialogueAwarenessSummary, 320, 'awareness'),
    companionBriefingLine: sanitizeExecutionProjectBriefingText(projectBriefing.companionBriefingLine, 320, 'awareness'),
    emotionalClosureCue: sanitizeExecutionProjectBriefingText(projectBriefing.emotionalClosureCue, 220, 'emotional_closure'),
    emotionalClosureSummary: sanitizeExecutionProjectBriefingText(projectBriefing.emotionalClosureSummary, 220, 'emotional_closure'),
    continuityArcStage: optionsSanitizeProjectText(projectBriefing.continuityArcStage, 120),
    continuityRestraint: optionsSanitizeProjectText(projectBriefing.continuityRestraint, 64),
    continuityCue: optionsSanitizeProjectText(projectBriefing.continuityCue, 220),
    continuityPreferredTiming: optionsSanitizeProjectText(projectBriefing.continuityPreferredTiming, 120),
    continuityCadence: optionsSanitizeProjectText(projectBriefing.continuityCadence, 120),
    preferredBlinkCadence: optionsSanitizeProjectText(projectBriefing.preferredBlinkCadence, 32),
    preferredGazeMode: optionsSanitizeProjectText(projectBriefing.preferredGazeMode, 32),
    preferredPauseMode: optionsSanitizeProjectText(projectBriefing.preferredPauseMode, 32),
    preferredLipsyncMode: optionsSanitizeProjectText(projectBriefing.preferredLipsyncMode, 32),
    preferredVoiceMode: optionsSanitizeProjectText(projectBriefing.preferredVoiceMode, 32),
    preferredPacingMode: optionsSanitizeProjectText(projectBriefing.preferredPacingMode, 32),
  }
}

function readExecutionFeedbackRuntimeContextRecord(thread: AlicizationTaskThreadRecord) {
  const metadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
    ? thread.metadata as {
      execution?: {
        runtimeContext?: unknown
      } | null
    }
    : null
  const runtimeContext = metadata?.execution?.runtimeContext
  if (!runtimeContext || typeof runtimeContext !== 'object' || Array.isArray(runtimeContext))
    return null
  return runtimeContext as Record<string, unknown>
}

function readExecutionFeedbackAffectiveResidue(thread: AlicizationTaskThreadRecord) {
  const runtimeContext = readExecutionFeedbackRuntimeContextRecord(thread)
  if (!runtimeContext)
    return null

  const affectiveResidue = normalizeAlicizationDerivedMindStateBundle({
    version: 'derived-mind-state-bundle-v1',
    source: 'browser-fallback',
    producedAt: 0,
    summary: 'execution-feedback-affective-residue',
    affectiveResidue: runtimeContext.affectiveResidue,
  })?.affectiveResidue
  if (affectiveResidue)
    return affectiveResidue

  const derivedMindStateBundle = normalizeAlicizationDerivedMindStateBundle(runtimeContext.derivedMindStateBundle)
  return derivedMindStateBundle?.affectiveResidue ?? null
}

function readExecutionFeedbackEmotionalTransitionLedger(thread: AlicizationTaskThreadRecord) {
  const runtimeContext = readExecutionFeedbackRuntimeContextRecord(thread)
  if (!runtimeContext)
    return null

  const derivedMindStateBundle = normalizeAlicizationDerivedMindStateBundle(runtimeContext.derivedMindStateBundle)
  return derivedMindStateBundle?.emotionalTransitionLedger ?? null
}

function readExecutionFeedbackMemoryClosureExecution(thread: AlicizationTaskThreadRecord) {
  const runtimeContext = normalizeAlicizationExecutionRuntimeContext(readExecutionFeedbackRuntimeContextRecord(thread))
  return runtimeContext?.memoryClosureExecution ?? null
}

function looksLikeThinExecutionProjectIdentity(value: string | null | undefined) {
  const normalized = optionsSanitizeProjectText(value, 220)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  return normalized === 'project'
    || normalized === 'digital life'
    || normalized === 'same digital life'
    || (!normalized.includes('alicization') && !normalized.includes('local-first digital life'))
}

function looksLikeThinExecutionProjectPhase(value: string | null | undefined) {
  const normalized = optionsSanitizeProjectText(value, 220)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  return normalized === 'phase 1'
    || normalized === 'phase i'
    || !normalized.includes('phase 1')
}

function looksLikeThinExecutionProjectPreflight(value: string | null | undefined) {
  const normalized = optionsSanitizeProjectText(value, 320)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  return normalized === 'project'
    || normalized === 'phase 1'
    || isAlicizationThinProjectAwarenessLine(normalized)
    || /^identity=|^open=|^next=/u.test(normalized)
}

function readExplicitSameHerSelfAnchorFromPreDialogueReasons(
  reasons: string[] | null | undefined,
) {
  const match = (Array.isArray(reasons) ? reasons : [])
    .map(reason => optionsSanitizeProjectText(reason, 320))
    .find((reason) => {
      if (!reason)
        return false
      return /^same-her self anchor:\s*/iu.test(reason)
    })

  if (!match)
    return null

  return optionsSanitizeProjectText(
    match.replace(/^same-her self anchor:\s*/iu, ''),
    220,
  )
}

function scoreExecutionResultFeedbackSameHerSelfLine(input: {
  value: string | null | undefined
  source: 'reason' | 'briefing' | 'thread'
}) {
  const normalized = optionsSanitizeProjectText(input.value, 220)?.toLowerCase() ?? ''
  if (!normalized)
    return Number.NEGATIVE_INFINITY

  let score = 0

  if (input.source === 'reason')
    score += 30
  if (input.source === 'briefing')
    score += 16
  if (input.source === 'thread')
    score += 10

  if (/holding together mainly through|being carried mainly through|one living her|one living digital life|without splitting her continuity/u.test(normalized))
    score += 40
  if (/same-her|same her|same phase 1 digital life|same living line|continuous her|one continuous her|同一个她|同一个 her/u.test(normalized))
    score += 28
  if (/local-first digital life project|digital life project|phase 1|数字生命项目/u.test(normalized))
    score += 24
  if (/emotion|memory|initiative|execution|embodiment|closure seam|life loop|情绪|记忆|主动性|执行|具身|闭环|收稳|收住/u.test(normalized))
    score += 20
  if (/face|motion|voice|lipsync|body|表情|动作|声音|唇型/u.test(normalized))
    score += 18
  if (/keep the same digital life project in view|generic reminder|generic guidance|same digital life \| keep the closure seam explicit/u.test(normalized))
    score -= 18
  if (/^before answering[,，]|^before speaking[,，]|^开口前先记住|^回答前先记住/u.test(normalized))
    score -= 26
  if (/older narrower|narrower body-line carry only/u.test(normalized))
    score -= 16

  return score + Math.min(normalized.length, 220) / 1000
}

function preferExecutionResultFeedbackSameHerSelfLine(input: {
  explicitReasonSameHerSelfLine?: string | null
  companionBriefingSameHerSelfLine?: string | null
  threadSameHerSelfLine?: string | null
}) {
  const candidates = [
    {
      value: input.explicitReasonSameHerSelfLine ?? null,
      source: 'reason' as const,
    },
    {
      value: input.companionBriefingSameHerSelfLine ?? null,
      source: 'briefing' as const,
    },
    {
      value: input.threadSameHerSelfLine ?? null,
      source: 'thread' as const,
    },
  ].filter((candidate): candidate is { value: string, source: 'reason' | 'briefing' | 'thread' } => Boolean(candidate.value))

  if (candidates.length === 0)
    return null

  candidates.sort((left, right) => {
    const scoreDelta
      = scoreExecutionResultFeedbackSameHerSelfLine({
        value: right.value,
        source: right.source,
      })
      - scoreExecutionResultFeedbackSameHerSelfLine({
        value: left.value,
        source: left.source,
      })
    if (scoreDelta !== 0)
      return scoreDelta
    return right.value.length - left.value.length
  })

  return candidates[0]?.value ?? null
}

function sanitizeMergedExecutionResultFeedbackProjectBriefing(
  projectBriefing: Record<string, unknown>,
) {
  return {
    ...projectBriefing,
    identity: sanitizeExecutionProjectBriefingText(projectBriefing.identity, 220, 'identity'),
    currentPhase: sanitizeExecutionProjectBriefingText(projectBriefing.currentPhase, 220, 'phase'),
    latestLandedProgress: sanitizeExecutionProjectBriefingText(projectBriefing.latestLandedProgress, 320, 'landed'),
    primaryOpenLoop: sanitizeExecutionProjectBriefingText(projectBriefing.primaryOpenLoop, 320, 'open'),
    proactiveSameHerGap: sanitizeExecutionProjectBriefingText(projectBriefing.proactiveSameHerGap, 320, 'summary'),
    nextClosureTarget: sanitizeExecutionProjectBriefingText(projectBriefing.nextClosureTarget, 320, 'next'),
    sameHerSelfLine: sanitizeExecutionProjectBriefingText(projectBriefing.sameHerSelfLine, 220, 'continuity_anchor'),
    sameHerDriftRisk: sanitizeExecutionProjectBriefingText(projectBriefing.sameHerDriftRisk, 320, 'continuity_drift_risk'),
    sameHerHoldDetail: sanitizeExecutionProjectBriefingText(projectBriefing.sameHerHoldDetail, 220, 'continuity_hold'),
    preflightSummary: sanitizeExecutionProjectBriefingText(projectBriefing.preflightSummary, 320, 'awareness'),
    preDialogueAwarenessLine: sanitizeExecutionProjectBriefingText(projectBriefing.preDialogueAwarenessLine, 320, 'awareness'),
    preDialogueAwarenessSummary: sanitizeExecutionProjectBriefingText(projectBriefing.preDialogueAwarenessSummary, 320, 'awareness'),
    companionBriefingLine: sanitizeExecutionProjectBriefingText(projectBriefing.companionBriefingLine, 320, 'awareness'),
    emotionalClosureSummary: sanitizeExecutionProjectBriefingText(projectBriefing.emotionalClosureSummary, 220, 'emotional_closure'),
  }
}

function mergeExecutionResultFeedbackProjectBriefing(input: {
  threadProjectBriefing: ReturnType<typeof readExecutionResultFeedbackProjectBriefing>
  preDialogueAwarenessDebug: ReturnType<typeof summarizeAlicizationPreDialogueSendIdentityForDebug> | null
  explicitProjectStateDebug?: ReturnType<typeof summarizeAlicizationPreDialogueSendIdentityForDebug> | null
}) {
  const threadProjectBriefing = input.threadProjectBriefing
  const preDialogueAwarenessDebug = input.preDialogueAwarenessDebug
  const explicitProjectStateDebug = input.explicitProjectStateDebug ?? null
  if (!threadProjectBriefing && !preDialogueAwarenessDebug)
    return null

  const canonicalProjectState = resolveAlicizationProjectStateSnapshot()
  const preferredNextClosureTarget = optionsSanitizeProjectText(preDialogueAwarenessDebug?.preDialogueNextClosureLine, 320)
  const rawExplicitPreferredSameHerSelfLine
    = optionsSanitizeProjectText(preDialogueAwarenessDebug?.preDialogueSameHerSelfLine, 220)
      ?? readExplicitSameHerSelfAnchorFromPreDialogueReasons(
        preDialogueAwarenessDebug?.preDialogueReasonPreview ?? null,
      )
  const explicitPreferredSameHerSelfLine
    = rawExplicitPreferredSameHerSelfLine
      && rawExplicitPreferredSameHerSelfLine !== canonicalProjectState.sameHerSelfLine
      ? rawExplicitPreferredSameHerSelfLine
      : null
  const preferredCompanionBriefingSameHerSelfLine
    = optionsSanitizeProjectText(preDialogueAwarenessDebug?.preDialogueCompanionBriefingLine, 220)
  const preferredPreDialogueAwarenessLine = optionsSanitizeProjectText(preDialogueAwarenessDebug?.preDialogueAwarenessLine, 320)
  const preferredProjectStateAwarenessLine
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateAwarenessLine, 320)
  const preferredProjectStateAwarenessSummary
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateAwarenessSummary, 320)
  const preferredProjectStateLatestLandedProgress
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateLatestLandedProgress, 320)
  const preferredProjectStatePrimaryOpenLoop
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStatePrimaryOpenLoop, 320)
  const preferredProjectStateProactiveSameHerGap
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateProactiveSameHerGap, 320)
  const preferredProjectStateNextClosureTarget
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateNextClosureTarget, 320)
  const preferredProjectStateSameHerDriftRisk
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateSameHerDriftRisk, 320)
  const preferredProjectStateCompanionBriefingLine
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateCompanionBriefingLine, 320)
  const preferredProjectStateEmotionalClosureSummary
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateEmotionalClosureSummary, 220)
  const preferredProjectStateContinuityArcStage
    = optionsSanitizeProjectText((explicitProjectStateDebug as { preDialogueProjectStateContinuityArcStage?: unknown } | null)?.preDialogueProjectStateContinuityArcStage, 120)
  const preferredProjectStateContinuityRestraint
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateContinuityRestraint, 64)
  const preferredProjectStateSameHerHoldDetail
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateSameHerHoldDetail, 220)
  const preferredProjectStateContinuityCue
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateContinuityCue, 220)
  const preferredProjectStateContinuityPreferredTiming
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateContinuityPreferredTiming, 120)
  const preferredProjectStateContinuityCadence
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStateContinuityCadence, 120)
  const preferredProjectStatePreferredBlinkCadence
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStatePreferredBlinkCadence, 32)
  const preferredProjectStatePreferredGazeMode
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStatePreferredGazeMode, 32)
  const preferredProjectStatePreferredPauseMode
    = optionsSanitizeProjectText((explicitProjectStateDebug as { preDialogueProjectStatePreferredPauseMode?: unknown } | null)?.preDialogueProjectStatePreferredPauseMode, 32)
  const preferredProjectStatePreferredLipsyncMode
    = optionsSanitizeProjectText((explicitProjectStateDebug as { preDialogueProjectStatePreferredLipsyncMode?: unknown } | null)?.preDialogueProjectStatePreferredLipsyncMode, 32)
  const preferredProjectStatePreferredVoiceMode
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStatePreferredVoiceMode, 32)
  const preferredProjectStatePreferredPacingMode
    = optionsSanitizeProjectText(explicitProjectStateDebug?.preDialogueProjectStatePreferredPacingMode, 32)
  const preferredThreadSameHerSelfLine = optionsSanitizeProjectText(threadProjectBriefing?.sameHerSelfLine, 220)
  const preferredThreadPreflightSummary = optionsSanitizeProjectText(threadProjectBriefing?.preflightSummary, 320)
  const preferredThreadCurrentPhase = optionsSanitizeProjectText(threadProjectBriefing?.currentPhase, 220)
  const preferredThreadIdentity = optionsSanitizeProjectText(threadProjectBriefing?.identity, 220)
  const explicitLatestProgressInput = optionsSanitizeProjectText(
    threadProjectBriefing?.latestLandedProgress ?? threadProjectBriefing?.latestProgress,
    320,
  )
  const summaryLatestProgressInput = optionsSanitizeProjectText(threadProjectBriefing?.landedProgressSummary, 320)
  const explicitPrimaryOpenLoopInput = optionsSanitizeProjectText(threadProjectBriefing?.primaryOpenLoop, 320)
  const summaryPrimaryOpenLoopInput = optionsSanitizeProjectText(threadProjectBriefing?.openClosureSummary, 320)
  const explicitProactiveSameHerGapInput = optionsSanitizeProjectText(threadProjectBriefing?.proactiveSameHerGap, 320)
  const explicitNextClosureTargetInput = optionsSanitizeProjectText(threadProjectBriefing?.nextClosureTarget, 320)
  const summaryNextClosureTargetInput = optionsSanitizeProjectText(threadProjectBriefing?.nextClosureTargetSummary, 320)
  const explicitSameHerDriftRiskInput = optionsSanitizeProjectText(threadProjectBriefing?.sameHerDriftRisk, 320)
  const summarySameHerDriftRiskInput = optionsSanitizeProjectText(threadProjectBriefing?.sameHerDriftRiskSummary, 320)
  const preferredProjectAwarenessAnchor = [
    preferredProjectStateAwarenessLine,
    preferredProjectStateAwarenessSummary,
    isAlicizationThinProjectAwarenessLine(preferredPreDialogueAwarenessLine) ? null : preferredPreDialogueAwarenessLine,
    threadProjectBriefing?.preDialogueAwarenessLine ?? null,
  ].find(value => Boolean(value)) ?? null
  const preferredProjectCompanionBriefingLine = [
    preferredProjectStateCompanionBriefingLine,
    preDialogueAwarenessDebug?.preDialogueCompanionBriefingLine ?? null,
    threadProjectBriefing?.companionBriefingLine ?? null,
  ].find(value => Boolean(optionsSanitizeProjectText(value, 320))) ?? null
  const preferredSameHerSelfLine = preferExecutionResultFeedbackSameHerSelfLine({
    explicitReasonSameHerSelfLine: explicitPreferredSameHerSelfLine,
    companionBriefingSameHerSelfLine:
      (preferredCompanionBriefingSameHerSelfLine && !isAlicizationThinProjectAwarenessLine(preferredCompanionBriefingSameHerSelfLine))
        ? preferredCompanionBriefingSameHerSelfLine
        : null,
    threadSameHerSelfLine:
      (preferredThreadSameHerSelfLine && !isAlicizationThinProjectAwarenessLine(preferredThreadSameHerSelfLine))
        ? preferredThreadSameHerSelfLine
        : null,
  })
  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: threadProjectBriefing?.identity ?? null,
      currentPhase: threadProjectBriefing?.currentPhase ?? null,
      latestLandedProgress:
        preferredProjectStateLatestLandedProgress
        ?? explicitLatestProgressInput
        ?? summaryLatestProgressInput
        ?? null,
      primaryOpenLoop:
        preferredProjectStatePrimaryOpenLoop
        ?? explicitPrimaryOpenLoopInput
        ?? summaryPrimaryOpenLoopInput
        ?? null,
      proactiveSameHerGap:
        preferredProjectStateProactiveSameHerGap
        ?? explicitProactiveSameHerGapInput
        ?? null,
      nextClosureTarget:
        preferredProjectStateNextClosureTarget
        ?? preferredNextClosureTarget
        ?? explicitNextClosureTargetInput
        ?? summaryNextClosureTargetInput
        ?? null,
      sameHerSelfLine: preferredSameHerSelfLine ?? threadProjectBriefing?.sameHerSelfLine ?? null,
      sameHerHoldDetail: preferredProjectStateSameHerHoldDetail ?? threadProjectBriefing?.sameHerHoldDetail ?? null,
      sameHerDriftRisk:
        preferredProjectStateSameHerDriftRisk
        ?? explicitSameHerDriftRiskInput
        ?? summarySameHerDriftRiskInput
        ?? null,
      continuityArcStage:
        preferredProjectStateContinuityArcStage
        ?? threadProjectBriefing?.continuityArcStage
        ?? null,
      continuityCue: preferredProjectStateContinuityCue ?? threadProjectBriefing?.continuityCue ?? null,
      preflightSummary: threadProjectBriefing?.preflightSummary ?? null,
      preDialogueAwarenessLine:
        (isAlicizationThinProjectAwarenessLine(preferredProjectAwarenessAnchor) ? null : preferredProjectAwarenessAnchor)
        ?? threadProjectBriefing?.preDialogueAwarenessLine
        ?? null,
      preDialogueAwarenessSummary:
        preferredProjectStateAwarenessSummary
        ?? threadProjectBriefing?.preDialogueAwarenessSummary
        ?? null,
      awarenessLine:
        (isAlicizationThinProjectAwarenessLine(preferredProjectAwarenessAnchor) ? null : preferredProjectAwarenessAnchor)
        ?? threadProjectBriefing?.preDialogueAwarenessLine
        ?? null,
      companionBriefingLine: preferredProjectCompanionBriefingLine,
      emotionalClosureCue:
        preferredProjectStateEmotionalClosureSummary
        ?? preDialogueAwarenessDebug?.preDialogueEmotionalClosureCue
        ?? threadProjectBriefing?.emotionalClosureCue
        ?? threadProjectBriefing?.emotionalClosureSummary
        ?? null,
      emotionalClosureSummary:
        preferredProjectStateEmotionalClosureSummary
        ?? threadProjectBriefing?.emotionalClosureSummary
        ?? threadProjectBriefing?.emotionalClosureCue
        ?? null,
      continuityRestraint:
        preferredProjectStateContinuityRestraint
        ?? threadProjectBriefing?.continuityRestraint
        ?? null,
      continuityPreferredTiming:
        preferredProjectStateContinuityPreferredTiming
        ?? threadProjectBriefing?.continuityPreferredTiming
        ?? null,
      continuityCadence:
        preferredProjectStateContinuityCadence
        ?? threadProjectBriefing?.continuityCadence
        ?? null,
      preferredBlinkCadence:
        preferredProjectStatePreferredBlinkCadence
        ?? threadProjectBriefing?.preferredBlinkCadence
        ?? null,
      preferredGazeMode:
        preferredProjectStatePreferredGazeMode
        ?? threadProjectBriefing?.preferredGazeMode
        ?? null,
      preferredPauseMode:
        preferredProjectStatePreferredPauseMode
        ?? threadProjectBriefing?.preferredPauseMode
        ?? null,
      preferredLipsyncMode:
        preferredProjectStatePreferredLipsyncMode
        ?? threadProjectBriefing?.preferredLipsyncMode
        ?? null,
      preferredVoiceMode:
        preferredProjectStatePreferredVoiceMode
        ?? threadProjectBriefing?.preferredVoiceMode
        ?? null,
      preferredPacingMode:
        preferredProjectStatePreferredPacingMode
        ?? threadProjectBriefing?.preferredPacingMode
        ?? null,
    },
  })
  const preferredIdentity = (() => {
    if (preferredThreadIdentity && !looksLikeThinExecutionProjectIdentity(preferredThreadIdentity))
      return preferredThreadIdentity

    const normalized = optionsSanitizeProjectText(normalizedProjectState.identity, 220)
    if (!normalized || looksLikeThinExecutionProjectIdentity(normalized))
      return canonicalProjectState.identity
    return normalizedProjectState.identity ?? threadProjectBriefing?.identity ?? null
  })()
  const preferredCurrentPhase = (() => {
    if (preferredThreadCurrentPhase && !looksLikeThinExecutionProjectPhase(preferredThreadCurrentPhase))
      return preferredThreadCurrentPhase

    const normalized = optionsSanitizeProjectText(normalizedProjectState.currentPhase, 220)
    if (!normalized || looksLikeThinExecutionProjectPhase(normalized))
      return canonicalProjectState.currentPhase
    return normalizedProjectState.currentPhase ?? threadProjectBriefing?.currentPhase ?? null
  })()

  return sanitizeMergedExecutionResultFeedbackProjectBriefing({
    identity: preferredIdentity,
    currentPhase: preferredCurrentPhase,
    latestLandedProgress:
      preferredProjectStateLatestLandedProgress
      ?? (!explicitLatestProgressInput && summaryLatestProgressInput
        ? summaryLatestProgressInput
        : (normalizedProjectState.latestLandedProgress ?? threadProjectBriefing?.latestLandedProgress ?? threadProjectBriefing?.latestProgress))
      ?? null,
    primaryOpenLoop:
      preferredProjectStatePrimaryOpenLoop
      ?? (!explicitPrimaryOpenLoopInput && summaryPrimaryOpenLoopInput
        ? summaryPrimaryOpenLoopInput
        : (normalizedProjectState.primaryOpenLoop ?? threadProjectBriefing?.primaryOpenLoop))
      ?? null,
    proactiveSameHerGap:
      preferredProjectStateProactiveSameHerGap
      ?? normalizedProjectState.proactiveSameHerGap
      ?? threadProjectBriefing?.proactiveSameHerGap
      ?? null,
    nextClosureTarget:
      preferredProjectStateNextClosureTarget
      ?? (!explicitNextClosureTargetInput && summaryNextClosureTargetInput
        ? summaryNextClosureTargetInput
        : (normalizedProjectState.nextClosureTarget ?? preferredNextClosureTarget ?? threadProjectBriefing?.nextClosureTarget))
      ?? null,
    sameHerSelfLine:
      preferredSameHerSelfLine
      ?? normalizedProjectState.sameHerSelfLine
      ?? threadProjectBriefing?.sameHerSelfLine
      ?? null,
    sameHerDriftRisk:
      preferredProjectStateSameHerDriftRisk
      ?? (!explicitSameHerDriftRiskInput && summarySameHerDriftRiskInput
        ? summarySameHerDriftRiskInput
        : (normalizedProjectState.sameHerDriftRisk ?? threadProjectBriefing?.sameHerDriftRisk))
      ?? null,
    sameHerHoldDetail:
      preferredProjectStateSameHerHoldDetail
      ?? normalizedProjectState.sameHerHoldDetail
      ?? threadProjectBriefing?.sameHerHoldDetail
      ?? null,
    preflightSummary:
      (preferredThreadPreflightSummary && !looksLikeThinExecutionProjectPreflight(preferredThreadPreflightSummary)
        ? preferredThreadPreflightSummary
        : null)
      ?? normalizedProjectState.preflightSummary
      ?? threadProjectBriefing?.preflightSummary
      ?? null,
    preDialogueAwarenessLine:
      (isAlicizationThinProjectAwarenessLine(preferredProjectAwarenessAnchor) ? null : preferredProjectAwarenessAnchor)
      ?? normalizedProjectState.preDialogueAwarenessLine
      ?? threadProjectBriefing?.preDialogueAwarenessLine
      ?? null,
    preDialogueAwarenessSummary:
      preferredProjectStateAwarenessSummary
      ?? normalizedProjectState.preDialogueAwarenessSummary
      ?? threadProjectBriefing?.preDialogueAwarenessSummary
      ?? null,
    companionBriefingLine:
      preferredProjectCompanionBriefingLine
      ?? normalizedProjectState.companionBriefingLine
      ?? threadProjectBriefing?.companionBriefingLine
      ?? null,
    emotionalClosureSummary:
      preferredProjectStateEmotionalClosureSummary
      ?? normalizedProjectState.emotionalClosureSummary
      ?? threadProjectBriefing?.emotionalClosureSummary
      ?? threadProjectBriefing?.emotionalClosureCue
      ?? null,
    continuityArcStage:
      preferredProjectStateContinuityArcStage
      ?? normalizedProjectState.continuityArcStage
      ?? threadProjectBriefing?.continuityArcStage
      ?? null,
    continuityRestraint:
      preferredProjectStateContinuityRestraint
      ?? normalizedProjectState.continuityRestraint
      ?? threadProjectBriefing?.continuityRestraint
      ?? null,
    continuityCue:
      preferredProjectStateContinuityCue
      ?? normalizedProjectState.continuityCue
      ?? threadProjectBriefing?.continuityCue
      ?? null,
    continuityPreferredTiming:
      preferredProjectStateContinuityPreferredTiming
      ?? normalizedProjectState.continuityPreferredTiming
      ?? threadProjectBriefing?.continuityPreferredTiming
      ?? null,
    continuityCadence:
      preferredProjectStateContinuityCadence
      ?? normalizedProjectState.continuityCadence
      ?? threadProjectBriefing?.continuityCadence
      ?? null,
    preferredBlinkCadence:
      preferredProjectStatePreferredBlinkCadence
      ?? normalizedProjectState.preferredBlinkCadence
      ?? threadProjectBriefing?.preferredBlinkCadence
      ?? null,
    preferredGazeMode:
      preferredProjectStatePreferredGazeMode
      ?? normalizedProjectState.preferredGazeMode
      ?? threadProjectBriefing?.preferredGazeMode
      ?? null,
    preferredPauseMode:
      preferredProjectStatePreferredPauseMode
      ?? normalizedProjectState.preferredPauseMode
      ?? threadProjectBriefing?.preferredPauseMode
      ?? null,
    preferredLipsyncMode:
      preferredProjectStatePreferredLipsyncMode
      ?? normalizedProjectState.preferredLipsyncMode
      ?? threadProjectBriefing?.preferredLipsyncMode
      ?? null,
    preferredVoiceMode:
      preferredProjectStatePreferredVoiceMode
      ?? normalizedProjectState.preferredVoiceMode
      ?? threadProjectBriefing?.preferredVoiceMode
      ?? null,
    preferredPacingMode:
      preferredProjectStatePreferredPacingMode
      ?? normalizedProjectState.preferredPacingMode
      ?? threadProjectBriefing?.preferredPacingMode
      ?? null,
  })
}

function optionsSanitizeProjectText(raw: unknown, maxChars: number) {
  return sanitizeExecutionProjectBriefingText(raw, maxChars, 'summary')
}

function readExecutionFeedbackPayloadObject(payload: unknown) {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
}

function readExecutionFeedbackBooleanOrNull(raw: unknown) {
  if (raw === true || raw === false)
    return raw
  return null
}

function readExecutionFeedbackStringArray(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return raw
    .map(value => sanitizeExecutionLedgerText(value, 80))
    .filter(Boolean)
}

function buildExecutionResultFeedbackSafetyGateSummary(events: AlicizationExecutionEventRecord[]) {
  const latestEvent = readLatestExecutionEvent(events, ['result'])
  const payload = readExecutionFeedbackPayloadObject(latestEvent?.payload)
  const safetyGate = readExecutionFeedbackPayloadObject(payload?.safetyGate)
  if (!safetyGate)
    return null

  const effect = sanitizeExecutionLedgerText(safetyGate.effect, 80)
  const permissionMode = sanitizeExecutionLedgerText(safetyGate.permissionMode, 80)
  const confirmationRequired = readExecutionFeedbackBooleanOrNull(safetyGate.confirmationRequired)
  const riskPolicy = sanitizeExecutionLedgerText(safetyGate.riskPolicy, 120)
  const auditability = sanitizeExecutionLedgerText(safetyGate.auditability, 80)
  const interruptibility = sanitizeExecutionLedgerText(safetyGate.interruptibility, 80)
  const summary = [
    effect ? `effect=${effect}` : '',
    permissionMode ? `permission=${permissionMode}` : '',
    confirmationRequired === true
      ? 'confirmation=required'
      : confirmationRequired === false
        ? 'confirmation=not-required'
        : '',
    riskPolicy ? `risk=${riskPolicy}` : '',
    auditability ? `audit=${auditability}` : '',
    interruptibility ? `interrupt=${interruptibility}` : '',
  ].filter(Boolean).join(' ')

  return summary || null
}

function buildExecutionResultFeedbackResumeConfirmationSummary(events: AlicizationExecutionEventRecord[]) {
  const latestEvent = readLatestExecutionEvent(events, ['resume'])
  const payload = readExecutionFeedbackPayloadObject(latestEvent?.payload)
  if (!payload)
    return null

  const approval = sanitizeExecutionLedgerText(payload.approval, 80)
  const previousStatus = sanitizeExecutionLedgerText(payload.previousStatus, 80)
  const resumedStatus = sanitizeExecutionLedgerText(payload.resumedStatus, 80)
  const previousPermissionMode = sanitizeExecutionLedgerText(payload.previousPermissionMode, 80)
  const permissionMode = sanitizeExecutionLedgerText(payload.permissionMode, 80)
  const effect = sanitizeExecutionLedgerText(payload.effect, 80)
  const riskBudget = sanitizeExecutionLedgerText(payload.riskBudget, 80)
  const confirmationBoundary = sanitizeExecutionLedgerText(payload.confirmationBoundary, 120)
  const auditability = sanitizeExecutionLedgerText(payload.auditability, 80)
  const interruptibility = sanitizeExecutionLedgerText(payload.interruptibility, 80)
  const affirmationReasonCodes = readExecutionFeedbackStringArray(payload.affirmationReasonCodes)
  const summary = [
    approval ? `approval=${approval}` : '',
    previousStatus ? `previous=${previousStatus}` : '',
    resumedStatus ? `resumed=${resumedStatus}` : '',
    previousPermissionMode ? `previousPermission=${previousPermissionMode}` : '',
    permissionMode ? `permission=${permissionMode}` : '',
    effect ? `effect=${effect}` : '',
    riskBudget ? `risk=${riskBudget}` : '',
    confirmationBoundary ? `confirmation=${confirmationBoundary}` : '',
    auditability ? `audit=${auditability}` : '',
    interruptibility ? `interrupt=${interruptibility}` : '',
    affirmationReasonCodes.length > 0 ? `affirmation=${affirmationReasonCodes.join(',')}` : '',
  ].filter(Boolean).join(' ')

  return summary || null
}

async function readExecutionResultFeedbackLedgerSummaries(input: {
  threadId: string
  listExecutionEvents?: (input: { threadId: string, limit?: number }) => Promise<AlicizationExecutionEventRecord[]>
}) {
  if (!input.listExecutionEvents) {
    return {
      safetyGateSummary: null,
      resumeConfirmationSummary: null,
    }
  }

  const events = await input.listExecutionEvents({
    threadId: input.threadId,
    limit: 6,
  }).catch(() => [] as AlicizationExecutionEventRecord[])
  return {
    safetyGateSummary: buildExecutionResultFeedbackSafetyGateSummary(events),
    resumeConfirmationSummary: buildExecutionResultFeedbackResumeConfirmationSummary(events),
  }
}

export function createAlicizationRuntimeExecutionFeedback(
  options: CreateAlicizationRuntimeExecutionFeedbackOptions,
) {
  const hasAutonomousExecutionThreadOwnershipProof = (thread: AlicizationTaskThreadRecord) => {
    const hasCanonicalAutonomousOrigin = isAlicizationAutonomousDialogueOrigin(thread.origin)
    const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
      turnId: thread.turnId,
      origin: hasCanonicalAutonomousOrigin ? thread.origin : undefined,
    })
    const metadataTask = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
      && thread.metadata.task && typeof thread.metadata.task === 'object' && !Array.isArray(thread.metadata.task)
      ? thread.metadata.task as { origin?: unknown }
      : null
    const hasStructuralAutonomousOwnership = autonomousDialogueFamily.matchedBy.includes('turn-id-prefix')
    const hasProactiveTaskOwnership = metadataTask?.origin === 'proactive'
    return autonomousDialogueFamily.isAutonomous
      && (hasStructuralAutonomousOwnership || hasProactiveTaskOwnership)
  }

  const settlePendingExecutionProposalFeedbackFromUserTurn = async (
    payload: AlicizationChatStartPayload,
    at: number,
    source: string,
  ): Promise<AlicizationExecutionProposalFeedbackKind | null> => {
    const explicitProjectStateDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(payload)
    const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(normalizedPayload)
    const cardId = options.normalizeCardId(normalizedPayload.cardId)
    const userText = options.readLatestUserMessageText(normalizedPayload.messages)
    if (!userText)
      return null

    const sessionId = await options.ensureActiveOrLatestSessionId(cardId).catch(() => '')
    if (!sessionId)
      return null

    const threads = await options.withCardScope(cardId, async () => await options.alicizationDb.listTaskThreads({
      sessionId,
      status: ['needs-affirmation'],
      limit: 6,
    }).catch(() => []), {
      label: `execution-proposal-feedback.list:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
    const latest = threads
      .filter(thread => thread.status === 'needs-affirmation')
      .slice()
      .sort((left, right) =>
        Math.max(
          Number(right.completedAt ?? 0),
          Number(right.lastEventAt ?? 0),
          Number(right.updatedAt ?? 0),
          Number(right.createdAt ?? 0),
        ) - Math.max(
          Number(left.completedAt ?? 0),
          Number(left.lastEventAt ?? 0),
          Number(left.updatedAt ?? 0),
          Number(left.createdAt ?? 0),
        ),
      )[0] ?? null
    if (!latest)
      return null

    const affirmationReasonCodes = readFabricAffirmationReasonCodes(latest)
    const projectBriefing = mergeExecutionResultFeedbackProjectBriefing({
      threadProjectBriefing: readExecutionResultFeedbackProjectBriefing(latest),
      preDialogueAwarenessDebug,
      explicitProjectStateDebug,
    })
    const affectiveResidue = readExecutionFeedbackAffectiveResidue(latest)
    const emotionalTransitionLedger = readExecutionFeedbackEmotionalTransitionLedger(latest)
    const feedback = options.deriveExecutionProposalFeedbackKind({
      userText,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        userText,
        projectBriefing,
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
        affirmationReasonCodes,
      },
    })
    if (!feedback)
      return null

    const closure = options.attachSynthesizedReflections(options.buildExecutionProposalFeedbackOutcomeClosure({
      now: at,
      cardId,
      sessionId,
      decisionTraceId: latest.decisionTraceId ?? null,
      turnId: options.sanitizeText(normalizedPayload.turnId) || null,
      feedback,
      affectiveResidue,
      emotionalTransitionLedger,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        userText,
        projectBriefing,
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
        affirmationReasonCodes,
      },
    }))
    await options.persistOutcomeClosure(cardId, closure)

    if (feedback === 'denied' || feedback === 'interrupted') {
      const nextStatus = feedback === 'denied' ? 'cancelled' : 'paused'
      await options.withCardScope(cardId, async () => {
        await options.alicizationDb.upsertTaskThread({
          ...latest,
          status: nextStatus,
          summary: feedback === 'denied'
            ? 'The host explicitly declined this proactive execution proposal.'
            : 'The host turned away from this proactive execution proposal before confirming it.',
          updatedAt: at,
          lastEventAt: at,
          completedAt: feedback === 'denied' ? at : latest.completedAt ?? null,
        })
      }, {
        label: `execution-proposal-feedback.thread-update:${cardId}`,
        skipQueueWhenScopeAlreadyActive: true,
      })
    }

    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.execution-proposal',
      action: 'proposal-feedback-settled',
      message: 'Settled host feedback for a pending proactive execution proposal.',
      payload: {
        source,
        cardId,
        sessionId,
        threadId: latest.id,
        feedback,
        userText,
        ...preDialogueAwarenessDebug,
      },
    }, cardId)
    return feedback
  }

  const settleRecentExecutionResultFeedbackFromUserTurn = async (
    payload: AlicizationChatStartPayload,
    at: number,
    source: string,
  ): Promise<AlicizationExecutionResultFeedbackKind | null> => {
    const explicitProjectStateDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(payload)
    const normalizedPayload = resolveAlicizationChatStartPayloadPreDialogueSendIdentity(payload)
    const preDialogueAwarenessDebug = summarizeAlicizationPreDialogueSendIdentityForDebug(normalizedPayload)
    const cardId = options.normalizeCardId(normalizedPayload.cardId)
    const userText = options.readLatestUserMessageText(normalizedPayload.messages)
    if (!userText)
      return null

    const previousAssistantText = options.readLatestAssistantMessageText(normalizedPayload.messages as any)
    const sessionId = await options.ensureActiveOrLatestSessionId(cardId).catch(() => '')
    if (!sessionId)
      return null

    const threads = await options.withCardScope(cardId, async () => await options.alicizationDb.listTaskThreads({
      sessionId,
      status: ['completed', 'failed', 'blocked', 'cancelled'],
      limit: 8,
    }).catch(() => []), {
      label: `execution-result-feedback.list:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
    const latest = threads
      .filter(thread => hasAutonomousExecutionThreadOwnershipProof(thread))
      .filter((thread) => {
        const executionMetadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
          && thread.metadata.execution && typeof thread.metadata.execution === 'object' && !Array.isArray(thread.metadata.execution)
          ? thread.metadata.execution as { resultFeedbackSettledAt?: unknown }
          : null
        return !Number.isFinite(Number(executionMetadata?.resultFeedbackSettledAt))
      })
      .filter(thread => at - options.readTaskThreadActivityAt(thread) <= 30 * 60_000)
      .sort((left, right) => options.readTaskThreadActivityAt(right) - options.readTaskThreadActivityAt(left))[0] ?? null
    if (!latest)
      return null
    const projectBriefing = mergeExecutionResultFeedbackProjectBriefing({
      threadProjectBriefing: readExecutionResultFeedbackProjectBriefing(latest),
      preDialogueAwarenessDebug,
      explicitProjectStateDebug,
    })
    const affectiveResidue = readExecutionFeedbackAffectiveResidue(latest)
    const emotionalTransitionLedger = readExecutionFeedbackEmotionalTransitionLedger(latest)
    const memoryClosureExecution = readExecutionFeedbackMemoryClosureExecution(latest)

    const feedback = options.deriveExecutionResultFeedbackKind({
      previousAssistantText,
      userText,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        outcome: latest.summary ?? '',
        previousAssistantText,
        userText,
        projectBriefing,
        memoryClosureExecution,
        proposedChannel: latest.proposedChannel ?? null,
        selectedChannel: latest.selectedChannel ?? null,
      },
    })
    if (!feedback)
      return null

    const executionLedgerSummaries = await options.withCardScope(cardId, async () => await readExecutionResultFeedbackLedgerSummaries({
      threadId: latest.id,
      listExecutionEvents: options.alicizationDb.listExecutionEvents,
    }), {
      label: `execution-result-feedback.safety-gate:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })
    const safetyGateSummary = executionLedgerSummaries.safetyGateSummary
    const resumeConfirmationSummary = executionLedgerSummaries.resumeConfirmationSummary

    const closure = options.attachSynthesizedReflections(options.buildExecutionResultFeedbackOutcomeClosure({
      now: at,
      cardId,
      sessionId,
      decisionTraceId: latest.decisionTraceId ?? null,
      turnId: options.sanitizeText(normalizedPayload.turnId) || null,
      feedback,
      affectiveResidue,
      emotionalTransitionLedger,
      thread: {
        threadId: latest.id,
        goal: latest.goal,
        summary: latest.summary ?? '',
        outcome: latest.summary ?? '',
        previousAssistantText,
        userText,
        projectBriefing,
        memoryClosureExecution,
        proposedChannel: latest.proposedChannel ?? null,
        resumeConfirmationSummary,
        selectedChannel: latest.selectedChannel ?? null,
        safetyGateSummary,
      },
    }))
    const feedbackExperience = extractExecutionResultFeedbackExperienceFromClosure(closure, options.sanitizeText)
    await options.persistOutcomeClosure(cardId, closure)
    await options.memoryReconsolidationRuntime?.reconsolidateExecutionResultFeedbackMemoryTrace?.({
      cardId,
      decisionTraceId: latest.decisionTraceId ?? null,
      feedback,
      previousAssistantText,
      userText,
      sessionId,
      turnId: latest.turnId ?? null,
      at,
      goal: latest.goal,
      outcome: latest.summary ?? '',
      feedbackExperience,
      memoryClosureExecution,
      projectBriefing,
      safetyGateSummary,
      resumeConfirmationSummary,
    })

    const previousDynamics = await options.alicizationDb.getLatestRelationshipDynamics().catch(() => null)
    await options.alicizationDb.appendRelationshipDynamics({
      hostAttitude: buildExecutionResultFeedbackHostAttitude(feedback),
      previousHostAttitude: previousDynamics?.hostAttitude ?? null,
      obedienceDelta: 0,
      livelinessDelta: feedback === 'valued'
        ? 0.02
        : feedback === 'doubted'
          ? -0.01
          : 0,
      sensibilityDelta: feedback === 'valued'
        ? 0.02
        : feedback === 'doubted' || feedback === 'intrusive'
          ? 0.03
          : 0.01,
      source: `execution-result-feedback:${feedback}`,
      createdAt: at,
    }).catch(() => {})

    await options.withCardScope(cardId, async () => {
      const metadata = latest.metadata && typeof latest.metadata === 'object' && !Array.isArray(latest.metadata)
        ? latest.metadata as Record<string, unknown>
        : {}
      const executionMetadata = metadata.execution && typeof metadata.execution === 'object' && !Array.isArray(metadata.execution)
        ? metadata.execution as Record<string, unknown>
        : {}
      const runtimeContextMetadata = executionMetadata.runtimeContext && typeof executionMetadata.runtimeContext === 'object' && !Array.isArray(executionMetadata.runtimeContext)
        ? executionMetadata.runtimeContext as Record<string, unknown>
        : {}
      const sensoryMetadata = runtimeContextMetadata.sensory && typeof runtimeContextMetadata.sensory === 'object' && !Array.isArray(runtimeContextMetadata.sensory)
        ? runtimeContextMetadata.sensory
        : {
            collectedAt: at,
            running: false,
            stale: true,
            ageMs: 0,
            foregroundWindow: null,
            capture: null,
          }
      await options.alicizationDb.upsertTaskThread({
        ...latest,
        metadata: {
          ...metadata,
          execution: {
            ...executionMetadata,
            ...(projectBriefing
              ? {
                  runtimeContext: {
                    ...runtimeContextMetadata,
                    generatedAt: runtimeContextMetadata.generatedAt ?? at,
                    decisionTraceId: runtimeContextMetadata.decisionTraceId ?? latest.decisionTraceId ?? null,
                    turnId: runtimeContextMetadata.turnId ?? latest.turnId ?? null,
                    sessionId: runtimeContextMetadata.sessionId ?? latest.sessionId ?? null,
                    sensory: sensoryMetadata,
                    projectBriefing,
                  },
                }
              : {}),
            resultFeedbackKind: feedback,
            resultFeedbackSettledAt: at,
            resultFeedbackTurnId: options.sanitizeText(normalizedPayload.turnId) || null,
          },
        },
        updatedAt: at,
      })
    }, {
      label: `execution-result-feedback.thread-update:${cardId}`,
      skipQueueWhenScopeAlreadyActive: true,
    })

    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.execution-result',
      action: 'result-feedback-settled',
      message: 'Settled host feedback for a finished proactive execution result.',
      payload: {
        source,
        cardId,
        sessionId,
        threadId: latest.id,
        feedback,
        userText,
        ...preDialogueAwarenessDebug,
      },
    }, cardId)
    return feedback
  }

  return {
    settlePendingExecutionProposalFeedbackFromUserTurn,
    settleRecentExecutionResultFeedbackFromUserTurn,
  }
}
