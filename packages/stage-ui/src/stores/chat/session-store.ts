import type { ChatHistoryItem } from '../../types/chat'
import type { ChatSessionMeta, ChatSessionRecord, ChatSessionsExport, ChatSessionsIndex } from '../../types/chat-session'

import {
  containsAlicizationFixedTemplateResidue,
  formatAlicizationProjectStateAwarenessFields,
  isAlicizationThinProjectAwarenessLine,
  isStageTamagotchi,
  isAlicizationThinSamePhaseCarryLine as isThinSamePhaseCarryLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  sanitizeAlicizationProviderFacingText,
  scoreAlicizationProjectAwarenessLine,
} from '@proj-alicization/stage-shared'
import { nanoid } from 'nanoid'
import { defineStore, storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'

import {
  normalizeStructuredPreDialogueAwarenessPayload,
  normalizeStructuredPreDialogueClosurePayload,
  normalizeStructuredProjectStatePayload,
} from '../../composables/alicization-structured-output'
import { client } from '../../composables/api'
import { useLocalFirstRequest } from '../../composables/use-local-first'
import { chatSessionsRepo } from '../../database/repos/chat-sessions.repo'
import { useAuthStore } from '../auth'
import { useAiriCardStore } from '../modules/airi-card'
import { canonicalizeSessionMessages, mergeLoadedSessionMessages } from './session-message-merge'

export const useChatSessionStore = defineStore('chat-session', () => {
  const fixedTemplateWithheldLine = ''

  const { userId, isAuthenticated } = storeToRefs(useAuthStore())
  const { activeCardId } = storeToRefs(useAiriCardStore())

  const activeSessionId = ref<string>('')
  const sessionMessages = ref<Record<string, ChatHistoryItem[]>>({})
  const sessionMetas = ref<Record<string, ChatSessionMeta>>({})
  const sessionGenerations = ref<Record<string, number>>({})
  const index = ref<ChatSessionsIndex | null>(null)

  const ready = ref(false)
  const isReady = computed(() => ready.value)
  const initializing = ref(false)
  let initializePromise: Promise<void> | null = null

  let persistQueue = Promise.resolve()
  let syncQueue = Promise.resolve()
  const loadedSessions = new Set<string>()
  const loadingSessions = new Map<string, Promise<void>>()

  function buildRestoredProjectAwarenessLine(input: {
    latestLandedProgress?: string | null
    primaryOpenLoop?: string | null
    nextClosureTarget?: string | null
    sameHerDriftRisk?: string | null
    proactiveSameHerGap?: string | null
  }) {
    const primaryOpenLoop = input.primaryOpenLoop?.trim() || ''
    const compactOpenLoop = primaryOpenLoop
      ? (primaryOpenLoop
          .split(' so ')[0]
          ?.replace(/[.。!！?？;；:：]+$/u, '')
          .trim()
          .slice(0, 120) ?? primaryOpenLoop.slice(0, 120))
      : ''
    return formatAlicizationProjectStateAwarenessFields({
      latestLandedProgress: input.latestLandedProgress ?? undefined,
      primaryOpenLoop: compactOpenLoop || undefined,
      nextClosureTarget: input.nextClosureTarget ?? undefined,
      continuityDriftRisk: input.sameHerDriftRisk ?? undefined,
      proactiveSameHerGap: input.proactiveSameHerGap ?? undefined,
      maxChars: 320,
    }).replace(/\s+/g, ' ').slice(0, 320).trim() || null
  }

  function isSameHerInwardLowPressureHeadline(value: string | null | undefined) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (!normalized)
      return false

    return (
      normalized.includes('embodiment_status')
      && normalized.includes('low-pressure-inward-carry')
    ) || (
      normalized.includes('holding together mainly through')
      && normalized.includes('low-pressure')
      && (
        normalized.includes('same line inward')
        || normalized.includes('same living line')
        || normalized.includes('same-her-inward-carry')
        || normalized.includes('quiet-companionship')
      )
    )
  }

  function isBlockedSessionEvidence(value: unknown) {
    if (typeof value !== 'string')
      return false
    const normalized = value.trim().toLowerCase()
    return normalized === fixedTemplateWithheldLine
      || normalized.includes('content_withheld')
      || normalized.includes('reason=continuity-residue')
  }

  function looksLikeStructuredSessionFact(value: string) {
    return /(?:^|\|\s*)(?:identity|phase|landed|open|next|initiative_gap|continuity_[a-z_]+|emotional_closure|status|summary|visibility|owner|source|evidence|observability|affective_closure|missing_lanes|open_loop|runtime_loop_validation|project_state_review|embodiment_scale_validation|runtime_authoritative_send_alignment|embodiment_lanes|pending_lanes|embodiment_closure|body_continuity|memory_surface_policy|remaining-open)=/iu.test(value)
      || /^[a-z][\w+-]*:[\w+:-]+$/iu.test(value)
  }

  function looksLikeNeutralizedTemplateSentence(value: string) {
    const carriesNeutralizedContinuityToken = /\b(?:continuity_identity|continuity_line|runtime_personhood|project_state_review)\b/iu.test(value)
    if (!carriesNeutralizedContinuityToken)
      return false

    const carriesDirectiveResidue = /\b(?:should|needs?|must|keep|rather than|before|after|reopen|widen|follow-through|drift|preserved closure)\b/iu.test(value)
    if (carriesDirectiveResidue)
      return true

    return !looksLikeStructuredSessionFact(value)
  }

  function looksLikeGenericSessionShell(value: string) {
    const normalized = value.trim().toLowerCase()
    return normalized.includes('generic continuity reminder')
      || normalized.includes('generic awareness reminder')
      || normalized.includes('generic awareness summary')
      || normalized.includes('generic same-her reminder')
      || normalized.includes('generic next target')
      || normalized.includes('generic next closure')
      || normalized.includes('generic closure shell')
      || normalized.includes('generic closure summary')
  }

  function looksLikeDirectiveSessionShell(value: string) {
    const normalized = value.trim().toLowerCase()
    if (!normalized)
      return false

    if (/^(?:before (?:answering|speaking|acting)|right now\b|next closure\b|if (?:this|restored|imported|the forked)|keep\b)/iu.test(normalized))
      return true

    return /\b(?:should|needs?|must|requires?|before|reopen|widen|flatten|override|proof so|preserved closure)\b/iu.test(normalized)
      && /\b(?:project|phase|continuity|closure|life loop|digital life|identity|same|turn|reply|awareness|embodiment)\b/iu.test(normalized)
  }

  function normalizeSessionNextFact(value: string) {
    const normalized = value.trim()
    const lower = normalized.toLowerCase()
    if (!normalized)
      return null

    if (
      /cross[-_ ]modal|body|face|motion|lipsync|voice|声音|表情|动作|唇型/iu.test(lower)
      || /continuity_identity proof|continuity_proof|continuity_line/iu.test(normalized)
    ) {
      return 'embodiment_scale_validation=needed'
    }
    if (/memory|initiative|dialogue|execution|embodiment|记忆|主动性|对话|执行|具身/iu.test(lower))
      return 'runtime_loop_validation=memory+initiative+dialogue+execution+embodiment'
    if (/project identity|landed progress|unresolved closure|项目身份|已落|未闭环|未闭合/iu.test(lower))
      return 'project_state_review=identity+landed+open+next'
    if (/callback|reopened|回调|重开/iu.test(lower))
      return 'callback_review=preserve_context; widening=deferred'

    return null
  }

  function sanitizeSessionStructuredText(value: string | null | undefined, maxChars = 420) {
    if (typeof value !== 'string')
      return null
    if (isBlockedSessionEvidence(value))
      return null
    if (looksLikeGenericSessionShell(value))
      return null
    if (looksLikeDirectiveSessionShell(value))
      return null

    const sanitized = sanitizeAlicizationProviderFacingText(value, maxChars, '')
    if (!sanitized || isBlockedSessionEvidence(sanitized))
      return null
    if (containsAlicizationFixedTemplateResidue(sanitized))
      return null
    if (looksLikeNeutralizedTemplateSentence(sanitized))
      return null
    if (looksLikeDirectiveSessionShell(sanitized))
      return null

    return sanitized
  }

  function sanitizeSessionStructuredProjectField(
    field: 'identity' | 'phase' | 'open' | 'next' | 'continuity_anchor' | 'continuity_hold' | 'continuity_drift_risk' | 'emotional_closure' | 'initiative_gap',
    value: string | null | undefined,
    maxChars = 420,
  ) {
    if (typeof value !== 'string' || !value.trim())
      return null
    if (field === 'phase' && /\bphase\s*1\b|第一阶段|阶段一|project_phase=life_core/iu.test(value))
      return null

    const structured = formatAlicizationProjectStateAwarenessFields({
      ...(field === 'identity' ? { identity: value } : {}),
      ...(field === 'phase' ? { currentPhase: value } : {}),
      ...(field === 'open' ? { primaryOpenLoop: value } : {}),
      ...(field === 'next' ? { nextClosureTarget: value } : {}),
      ...(field === 'continuity_anchor' ? { continuityAnchor: value } : {}),
      ...(field === 'continuity_hold' ? { sameHerHoldDetail: value } : {}),
      ...(field === 'continuity_drift_risk' ? { sameHerDriftRisk: value } : {}),
      ...(field === 'emotional_closure' ? { emotionalClosureCue: value } : {}),
      ...(field === 'initiative_gap' ? { proactiveSameHerGap: value } : {}),
      maxChars,
    })
    const prefix = `${field}=`
    const structuredValue = structured
      .split('|')
      .map(fragment => fragment.trim())
      .find(fragment => fragment.startsWith(prefix))
      ?.slice(prefix.length)
      .trim()

    if (field === 'next' && structuredValue) {
      const normalizedNextFact = normalizeSessionNextFact(structuredValue)
      if (normalizedNextFact)
        return normalizedNextFact
      if (
        looksLikeGenericSessionShell(structuredValue)
        || looksLikeDirectiveSessionShell(structuredValue)
        || looksLikeNeutralizedTemplateSentence(structuredValue)
      ) {
        return 'continuity_review_required'
      }
    }

    if (
      structuredValue
      && !isBlockedSessionEvidence(structuredValue)
      && !containsAlicizationFixedTemplateResidue(structuredValue)
      && !looksLikeGenericSessionShell(structuredValue)
      && !looksLikeDirectiveSessionShell(structuredValue)
    ) {
      return structuredValue
    }

    if (field === 'next' && looksLikeDirectiveSessionShell(value))
      return 'continuity_review_required'

    return sanitizeSessionStructuredText(value, maxChars)
  }

  function sanitizeSessionStructuredProjectLine(
    field: 'next' | 'continuity_drift_risk' | 'emotional_closure' | 'initiative_gap',
    value: string | null | undefined,
    maxChars = 420,
  ) {
    const sanitized = sanitizeSessionStructuredProjectField(field, value, maxChars)
    return sanitized ? `${field}=${sanitized}` : null
  }

  function sanitizeSessionStructuredLines(values: string[] | null | undefined) {
    return (values ?? [])
      .map(value => sanitizeSessionStructuredText(value))
      .filter((value): value is string => Boolean(value))
  }

  function sanitizeSessionProjectState<T extends Record<string, any> | null>(projectState: T): T {
    if (!projectState)
      return projectState

    return {
      ...projectState,
      identity: sanitizeSessionStructuredProjectField('identity', projectState.identity, 220),
      currentPhase: sanitizeSessionStructuredProjectField('phase', projectState.currentPhase, 180),
      latestLandedProgress: sanitizeSessionStructuredText(projectState.latestLandedProgress),
      latestProgress: sanitizeSessionStructuredText(projectState.latestProgress),
      landedProgressSummary: sanitizeSessionStructuredText(projectState.landedProgressSummary),
      preDialogueAwarenessLine: sanitizeSessionStructuredText(projectState.preDialogueAwarenessLine),
      awarenessLine: sanitizeSessionStructuredText(projectState.awarenessLine),
      preDialogueAwarenessSummary: sanitizeSessionStructuredText(projectState.preDialogueAwarenessSummary),
      preflightSummary: sanitizeSessionStructuredText(projectState.preflightSummary),
      memoryClosureSummary: sanitizeSessionStructuredText(projectState.memoryClosureSummary),
      companionHeadlineLine: sanitizeSessionStructuredText(projectState.companionHeadlineLine),
      companionBriefingLine: sanitizeSessionStructuredText(projectState.companionBriefingLine),
      companionNextClosureLine: sanitizeSessionStructuredText(projectState.companionNextClosureLine),
      primaryOpenLoop: sanitizeSessionStructuredProjectField('open', projectState.primaryOpenLoop),
      nextClosureTarget: sanitizeSessionStructuredProjectField('next', projectState.nextClosureTarget),
      continuitySummary: sanitizeSessionStructuredText(projectState.continuitySummary),
      sameHerSelfLine: sanitizeSessionStructuredProjectField('continuity_anchor', projectState.sameHerSelfLine),
      sameHerHoldDetail: sanitizeSessionStructuredProjectField('continuity_hold', projectState.sameHerHoldDetail),
      sameHerDriftRisk: sanitizeSessionStructuredProjectField('continuity_drift_risk', projectState.sameHerDriftRisk),
      emotionalClosureCue: sanitizeSessionStructuredProjectField('emotional_closure', projectState.emotionalClosureCue),
      proactiveSameHerGap: sanitizeSessionStructuredProjectField('initiative_gap', projectState.proactiveSameHerGap),
      continuityCue: sanitizeSessionStructuredText(projectState.continuityCue),
    } as T
  }

  function sanitizeSessionPreDialogueAwareness<T extends Record<string, any> | null | undefined>(awareness: T): T {
    if (!awareness)
      return awareness

    return {
      ...awareness,
      summaryLine: sanitizeSessionStructuredText(awareness.summaryLine),
      companionHeadlineLine: sanitizeSessionStructuredText(awareness.companionHeadlineLine),
      companionBriefingLine: sanitizeSessionStructuredText(awareness.companionBriefingLine),
      companionNextClosureLine: sanitizeSessionStructuredProjectLine('next', awareness.companionNextClosureLine),
      awarenessLine: sanitizeSessionStructuredText(awareness.awarenessLine),
      emotionalClosureCue: sanitizeSessionStructuredText(awareness.emotionalClosureCue),
      reasonPreview: Array.isArray(awareness.reasonPreview)
        ? sanitizeSessionStructuredLines(awareness.reasonPreview)
        : [],
    } as T
  }

  function sanitizeSessionPreDialogueClosure<T extends Record<string, any> | null | undefined>(closure: T): T {
    if (!closure)
      return closure

    return {
      ...closure,
      summaryLine: sanitizeSessionStructuredText(closure.summaryLine),
      companionHeadlineLine: sanitizeSessionStructuredText(closure.companionHeadlineLine),
      companionBriefingLine: sanitizeSessionStructuredText(closure.companionBriefingLine),
      companionNextClosureLine: sanitizeSessionStructuredProjectLine('next', closure.companionNextClosureLine),
      emotionalClosureCue: sanitizeSessionStructuredText(closure.emotionalClosureCue),
      sameHerDriftRiskLine: sanitizeSessionStructuredText(closure.sameHerDriftRiskLine),
      companionshipReasonLine: sanitizeSessionStructuredText(closure.companionshipReasonLine),
      briefingLines: Array.isArray(closure.briefingLines)
        ? sanitizeSessionStructuredLines(closure.briefingLines)
        : [],
      reasons: Array.isArray(closure.reasons)
        ? sanitizeSessionStructuredLines(closure.reasons)
        : [],
    } as T
  }

  function buildCompactSameHerInwardLowPressureAwarenessLine() {
    return ''
  }

  function isAnthropomorphicHostFacingSameHerHeadline(value: string | null | undefined) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
    if (!normalized)
      return false

    return normalized.includes('anthropomorphic emotional closure')
      && (normalized.includes('same-her inward-carry observability') || normalized.includes('continuity inward-carry observability'))
      && normalized.includes('measured-return')
  }

  function buildCompactAnthropomorphicHostFacingAwarenessLine() {
    return sanitizeSessionStructuredText(
      'source=companion_briefing; affective_closure=anthropomorphic-emotional-closure; observability=continuity-inward-carry; timing=measured-return',
    )
  }

  function maybeBackfillRestoredPreDialogueAwareness(
    projectState: ReturnType<typeof normalizeStructuredProjectStatePayload> | null,
    preDialogueAwareness: ReturnType<typeof normalizeStructuredPreDialogueAwarenessPayload> | null,
    preferredEmotionalClosureCue: string | null,
  ) {
    if (!projectState) {
      return preDialogueAwareness
    }
    const hasRecoverableProjectFacts = Boolean(
      projectState.latestLandedProgress
      || projectState.primaryOpenLoop
      || projectState.nextClosureTarget
      || projectState.sameHerDriftRisk
      || projectState.proactiveSameHerGap
      || projectState.continuitySummary,
    )
    if (!hasRecoverableProjectFacts)
      return preDialogueAwareness

    const persistedSummary = preDialogueAwareness?.summaryLine?.trim() || ''
    const persistedAwarenessLine = preDialogueAwareness?.awarenessLine?.trim() || ''
    const persistedBriefingLine = preDialogueAwareness?.companionBriefingLine?.trim() || ''
    const persistedCompanionHeadlineLine = preDialogueAwareness?.companionHeadlineLine?.trim() || ''
    const persistedNextClosureLine = preDialogueAwareness?.companionNextClosureLine?.trim() || ''
    const looksLikeThinReminder = (value: string) => {
      const normalized = value.trim().toLowerCase()
      if (!normalized)
        return false

      return isAlicizationThinProjectAwarenessLine(normalized)
        || isThinSamePhaseCarryLine(normalized)
        || normalized.includes('generic continuity reminder')
        || normalized.includes('generic awareness reminder')
        || normalized.includes('generic awareness summary')
        || normalized.includes('generic same-her reminder')
    }
    const looksLikeThinNextClosureLine = (value: string) => {
      const normalized = value.trim().toLowerCase()
      if (!normalized)
        return true

      return normalized.includes('generic next target')
        || normalized.includes('generic next closure')
        || normalized.includes('generic closure shell')
        || normalized.includes('generic closure summary')
        || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
    }
    const carriesBroaderProjectFrame = (value: string) =>
      /(?:^|\|\s*)(?:identity|phase|landed|open|next|continuity_anchor|continuity_hold|continuity_drift_risk|emotional_closure)=/iu.test(value)
      || /(?:open_loop|runtime_loop_validation|project_state_review|embodiment_scale_validation|runtime_authoritative_send_alignment)=/iu.test(value)
    const persistedLooksThin = Boolean(preDialogueAwareness) && (
      (!persistedAwarenessLine && !persistedBriefingLine)
      || looksLikeThinReminder(persistedSummary)
      || looksLikeThinReminder(persistedAwarenessLine)
    )
    const richerPersistedProjectAwareOpening = looksLikeThinReminder(persistedSummary)
      ? [
          persistedAwarenessLine,
          persistedBriefingLine,
        ].find((value): value is string => Boolean(
          value
          && !looksLikeThinReminder(value)
          && carriesBroaderProjectFrame(value)
          && scoreAlicizationProjectAwarenessLine(value) > 0,
        )) ?? null
      : null

    const sameHerSelfLine = projectState.sameHerSelfLine?.trim() || null
    const sameHerHoldDetail = projectState.sameHerHoldDetail?.trim() || null
    const sameHerHoldDetailIsBlockedEvidence = sameHerHoldDetail === fixedTemplateWithheldLine
      || sameHerHoldDetail?.includes('reason=continuity-residue')
      || sameHerHoldDetail?.includes('content_withheld')
    const sameHerSelfLineIsBlockedEvidence = sameHerSelfLine === fixedTemplateWithheldLine
      || sameHerSelfLine?.includes('reason=continuity-residue')
      || sameHerSelfLine?.includes('content_withheld')
    const shouldPreferSameHerHoldDetail = Boolean(
      preDialogueAwareness
      && persistedLooksThin
      && sameHerHoldDetail
      && !sameHerHoldDetailIsBlockedEvidence
      && (
        looksLikeThinReminder(persistedAwarenessLine)
        || looksLikeThinReminder(persistedSummary)
        || looksLikeThinReminder(persistedBriefingLine)
      ),
    )
    const shouldRebuildAwarenessFromBaseProjectState = Boolean(
      preDialogueAwareness
      && persistedLooksThin
      && !shouldPreferSameHerHoldDetail
      && isAlicizationThinProjectAwarenessLine(
        persistedAwarenessLine
        || persistedSummary
        || persistedBriefingLine,
      ),
    )
    const preferredSameHerBriefingLine = shouldPreferSameHerHoldDetail
      ? sameHerHoldDetail
      : sameHerSelfLineIsBlockedEvidence
        ? null
        : sameHerSelfLine
    const awarenessLine = preferredSameHerBriefingLine
      ? buildRestoredProjectAwarenessLine({
          latestLandedProgress: projectState.latestLandedProgress,
          primaryOpenLoop: projectState.primaryOpenLoop,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerDriftRisk: projectState.sameHerDriftRisk,
          proactiveSameHerGap: projectState.proactiveSameHerGap,
        })
      : buildRestoredProjectAwarenessLine({
          latestLandedProgress: projectState.latestLandedProgress,
          primaryOpenLoop: projectState.primaryOpenLoop,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerDriftRisk: projectState.sameHerDriftRisk,
          proactiveSameHerGap: projectState.proactiveSameHerGap,
        })
    const normalizedContinuitySummary = projectState.continuitySummary?.trim() || ''
    const preferredContinuitySummary = normalizedContinuitySummary
      && !looksLikeThinReminder(normalizedContinuitySummary)
      ? normalizedContinuitySummary
      : null
    const resolvedSameHerSelfLineSeed = shouldRebuildAwarenessFromBaseProjectState
      ? null
      : sameHerSelfLine
    const resolvedSameHerDriftRiskSeed = shouldRebuildAwarenessFromBaseProjectState
      ? null
      : (projectState.sameHerDriftRisk ?? null)
    const resolvedFallbackCompanionBriefingLine = shouldPreferSameHerHoldDetail
      ? preferredSameHerBriefingLine
      : shouldRebuildAwarenessFromBaseProjectState
        ? null
        : (persistedBriefingLine || preferredSameHerBriefingLine)
    const resolvedFallbackAwarenessSummary = shouldPreferSameHerHoldDetail
      ? (preferredContinuitySummary || awarenessLine)
      : shouldRebuildAwarenessFromBaseProjectState
        ? null
        : (preferredContinuitySummary || richerPersistedProjectAwareOpening || awarenessLine)
    const mergedInwardLowPressureAwarenessLine = (
      persistedAwarenessLine
      && persistedCompanionHeadlineLine
      && persistedAwarenessLine === persistedCompanionHeadlineLine
      && isThinSamePhaseCarryLine(persistedBriefingLine)
      && isSameHerInwardLowPressureHeadline(persistedCompanionHeadlineLine)
    )
      ? buildCompactSameHerInwardLowPressureAwarenessLine()
      : null
    const mergedAnthropomorphicHostFacingAwarenessLine = (
      persistedAwarenessLine
      && persistedCompanionHeadlineLine
      && persistedAwarenessLine === persistedCompanionHeadlineLine
      && isThinSamePhaseCarryLine(persistedBriefingLine)
      && isAnthropomorphicHostFacingSameHerHeadline(persistedCompanionHeadlineLine)
    )
      ? buildCompactAnthropomorphicHostFacingAwarenessLine()
      : null
    const nextClosureTarget = projectState.nextClosureTarget?.trim() || ''
    const nextClosureTargetReason = nextClosureTarget
      ? /[.。!！?？]$/u.test(nextClosureTarget)
        ? `next=${nextClosureTarget.replace(/[.。!！?？]+$/u, '')}`
        : `next=${nextClosureTarget}`
      : ''
    const reasonPreview = [
      projectState.latestLandedProgress ?? null,
      projectState.primaryOpenLoop,
      projectState.proactiveSameHerGap ?? null,
      nextClosureTargetReason || null,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    const mergedReasonPreview = [
      ...(preDialogueAwareness?.reasonPreview ?? []),
      ...reasonPreview,
    ].filter((value, index, values) => typeof value === 'string' && value.trim().length > 0 && values.indexOf(value) === index)

    const restoredAwareness = {
      status: 'grounded' as const,
      summaryLine: preferredContinuitySummary || awarenessLine,
      companionHeadlineLine: null,
      companionBriefingLine: preferredSameHerBriefingLine,
      companionNextClosureLine: nextClosureTarget || null,
      awarenessLine,
      emotionalClosureCue: preferredEmotionalClosureCue,
      reasonPreview,
    }

    if (!preDialogueAwareness)
      return restoredAwareness

    const shouldUpgradeNextClosureFromPersistedAudit = looksLikeThinNextClosureLine(persistedNextClosureLine)
    const upgradedEmotionalClosureCue = preDialogueAwareness.emotionalClosureCue ?? preferredEmotionalClosureCue
    const mergedReasonPreviewChanged = mergedReasonPreview.length !== (preDialogueAwareness.reasonPreview?.length ?? 0)

    if (!persistedLooksThin) {
      if (
        !mergedInwardLowPressureAwarenessLine
        && !shouldUpgradeNextClosureFromPersistedAudit
        && upgradedEmotionalClosureCue === preDialogueAwareness.emotionalClosureCue
        && !mergedReasonPreviewChanged
      ) {
        return preDialogueAwareness
      }

      return {
        ...preDialogueAwareness,
        status: preDialogueAwareness.status ?? 'grounded',
        awarenessLine: mergedAnthropomorphicHostFacingAwarenessLine ?? mergedInwardLowPressureAwarenessLine ?? preDialogueAwareness.awarenessLine,
        companionHeadlineLine: preDialogueAwareness.companionHeadlineLine ?? null,
        companionNextClosureLine: shouldUpgradeNextClosureFromPersistedAudit
          ? (nextClosureTarget || null)
          : (persistedNextClosureLine || nextClosureTarget || null),
        emotionalClosureCue: upgradedEmotionalClosureCue,
        reasonPreview: mergedReasonPreview,
      }
    }

    return {
      ...preDialogueAwareness,
      status: preDialogueAwareness.status ?? 'grounded',
      summaryLine: richerPersistedProjectAwareOpening ?? restoredAwareness.summaryLine,
      companionHeadlineLine: preDialogueAwareness.companionHeadlineLine ?? null,
      companionBriefingLine: preferredSameHerBriefingLine,
      companionNextClosureLine: persistedLooksThin
        ? (nextClosureTarget || null)
        : (preDialogueAwareness.companionNextClosureLine?.trim()
          || nextClosureTarget
          || null),
      awarenessLine: resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          preDialogueAwarenessLine: shouldPreferSameHerHoldDetail
            ? sameHerHoldDetail
            : (richerPersistedProjectAwareOpening ?? null),
          awarenessLine: shouldPreferSameHerHoldDetail
            ? sameHerHoldDetail
            : (richerPersistedProjectAwareOpening ?? null),
          companionHeadlineLine: preDialogueAwareness.companionHeadlineLine ?? null,
          companionBriefingLine: shouldPreferSameHerHoldDetail
            ? preferredSameHerBriefingLine
            : (persistedBriefingLine || null),
          preDialogueAwarenessSummary: null,
          emotionalClosureSummary: preDialogueAwareness.emotionalClosureCue ?? preferredEmotionalClosureCue,
          latestLandedProgress: projectState.latestLandedProgress ?? null,
          landedProgressSummary: projectState.latestLandedProgress ?? null,
          primaryOpenLoop: projectState.primaryOpenLoop,
          openClosureSummary: projectState.primaryOpenLoop,
          nextClosureTarget: projectState.nextClosureTarget,
          nextClosureTargetSummary: projectState.nextClosureTarget,
          sameHerSelfLine: resolvedSameHerSelfLineSeed,
          sameHerHoldDetail: shouldPreferSameHerHoldDetail ? sameHerHoldDetail : null,
          sameHerDriftRisk: resolvedSameHerDriftRiskSeed,
          sameHerDriftRiskSummary: resolvedSameHerDriftRiskSeed,
          proactiveSameHerGap: projectState.proactiveSameHerGap ?? null,
        },
        fallbackProjectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          preDialogueAwarenessLine: shouldPreferSameHerHoldDetail
            ? sameHerHoldDetail
            : (richerPersistedProjectAwareOpening ?? null),
          awarenessLine: shouldPreferSameHerHoldDetail
            ? sameHerHoldDetail
            : (richerPersistedProjectAwareOpening ?? null),
          companionBriefingLine: resolvedFallbackCompanionBriefingLine,
          preDialogueAwarenessSummary: resolvedFallbackAwarenessSummary,
          latestLandedProgress: projectState.latestLandedProgress ?? null,
          landedProgressSummary: projectState.latestLandedProgress ?? null,
          primaryOpenLoop: projectState.primaryOpenLoop,
          openClosureSummary: projectState.primaryOpenLoop,
          nextClosureTarget: projectState.nextClosureTarget,
          nextClosureTargetSummary: projectState.nextClosureTarget,
          emotionalClosureSummary: preDialogueAwareness.emotionalClosureCue ?? preferredEmotionalClosureCue,
          sameHerSelfLine: resolvedSameHerSelfLineSeed,
          sameHerHoldDetail: shouldPreferSameHerHoldDetail ? sameHerHoldDetail : null,
          sameHerDriftRisk: resolvedSameHerDriftRiskSeed,
          sameHerDriftRiskSummary: resolvedSameHerDriftRiskSeed,
          proactiveSameHerGap: projectState.proactiveSameHerGap ?? null,
        },
      }) ?? mergedAnthropomorphicHostFacingAwarenessLine ?? mergedInwardLowPressureAwarenessLine,
      emotionalClosureCue: upgradedEmotionalClosureCue,
      reasonPreview: mergedReasonPreview,
    }
  }

  function getCurrentUserId() {
    if (isStageTamagotchi())
      return 'local'
    return userId.value || 'local'
  }

  function getCurrentCharacterId() {
    return activeCardId.value || 'default'
  }

  function enqueuePersist(task: () => Promise<void>) {
    persistQueue = persistQueue.then(task, task)
    return persistQueue
  }

  function enqueueSync(task: () => Promise<void>) {
    syncQueue = syncQueue.then(task, task)
    return syncQueue
  }

  function snapshotMessages(messages: ChatHistoryItem[]) {
    return JSON.parse(JSON.stringify(messages)) as ChatHistoryItem[]
  }

  function isManualAbortErrorMessage(message: ChatHistoryItem) {
    return message.role === 'error'
      && typeof message.content === 'string'
      && message.content.includes('Alicization turn aborted (manual)')
  }

  function sanitizeSessionMessages(messages: ChatHistoryItem[]) {
    return messages
      .filter(message => !isManualAbortErrorMessage(message))
      .map((message) => {
        if (message.role !== 'assistant' || !message.structured || typeof message.structured !== 'object')
          return message

        const visibleReplyRealization = message.structured.visibleReplyRealization
          && typeof message.structured.visibleReplyRealization === 'object'
          ? message.structured.visibleReplyRealization as {
            projectStateAudit?: {
              currentPhaseSummary?: unknown
              sameHerHoldDetail?: unknown
              nextClosureTargetSummary?: unknown
              emotionalClosureSummary?: unknown
              sameHerDriftRiskSummary?: unknown
              sameHerDriftRisk?: unknown
              proactiveSameHerGapSummary?: unknown
            } | null
          }
          : null
        const projectStateAudit = visibleReplyRealization?.projectStateAudit
          && typeof visibleReplyRealization.projectStateAudit === 'object'
          ? visibleReplyRealization.projectStateAudit
          : null
        const normalizedProjectState = normalizeStructuredProjectStatePayload(
          (message.structured.projectState ?? null) as Record<string, unknown> | null,
        ) ?? null
        const restoredProjectState = normalizedProjectState
          ? normalizeStructuredProjectStatePayload({
            ...normalizedProjectState,
            currentPhase:
                (typeof projectStateAudit?.currentPhaseSummary === 'string'
                  ? projectStateAudit.currentPhaseSummary
                  : normalizedProjectState.currentPhase) ?? null,
            nextClosureTarget:
                (typeof projectStateAudit?.nextClosureTargetSummary === 'string'
                  ? projectStateAudit.nextClosureTargetSummary
                  : normalizedProjectState.nextClosureTarget) ?? null,
            sameHerHoldDetail:
                (typeof projectStateAudit?.sameHerHoldDetail === 'string'
                  ? projectStateAudit.sameHerHoldDetail
                  : normalizedProjectState.sameHerHoldDetail) ?? null,
            sameHerDriftRisk:
                (typeof projectStateAudit?.sameHerDriftRiskSummary === 'string'
                  ? projectStateAudit.sameHerDriftRiskSummary
                  : typeof projectStateAudit?.sameHerDriftRisk === 'string'
                    ? projectStateAudit.sameHerDriftRisk
                    : normalizedProjectState.sameHerDriftRisk) ?? null,
            proactiveSameHerGap:
                (typeof projectStateAudit?.proactiveSameHerGapSummary === 'string'
                  ? projectStateAudit.proactiveSameHerGapSummary
                  : normalizedProjectState.proactiveSameHerGap) ?? null,
          })
          ?? normalizedProjectState
          : null
        const normalizedPreDialogueClosure = normalizeStructuredPreDialogueClosurePayload(
          (message.structured.preDialogueClosure ?? null) as Record<string, unknown> | null,
        ) ?? null
        const normalizedPreDialogueAwareness = normalizeStructuredPreDialogueAwarenessPayload(
          (message.structured.preDialogueAwareness ?? null) as Record<string, unknown> | null,
        ) ?? null
        const preferredEmotionalClosureCue
          = typeof projectStateAudit?.emotionalClosureSummary === 'string'
            ? projectStateAudit.emotionalClosureSummary
            : null
        const sanitizedRestoredProjectState = sanitizeSessionProjectState(restoredProjectState)
        const sanitizedPreferredEmotionalClosureCue = sanitizeSessionStructuredProjectField(
          'emotional_closure',
          preferredEmotionalClosureCue,
        )
        const restoredPreDialogueAwareness = maybeBackfillRestoredPreDialogueAwareness(
          sanitizedRestoredProjectState,
          normalizedPreDialogueAwareness,
          sanitizedPreferredEmotionalClosureCue,
        )
        const sanitizedPreDialogueClosure = sanitizeSessionPreDialogueClosure(normalizedPreDialogueClosure)
        const sanitizedRestoredPreDialogueAwareness = sanitizeSessionPreDialogueAwareness(restoredPreDialogueAwareness)

        if (
          JSON.stringify(sanitizedRestoredProjectState) === JSON.stringify(message.structured.projectState ?? null)
          && JSON.stringify(sanitizedPreDialogueClosure) === JSON.stringify(message.structured.preDialogueClosure ?? null)
          && JSON.stringify(sanitizedRestoredPreDialogueAwareness) === JSON.stringify(message.structured.preDialogueAwareness ?? null)
        ) {
          return message
        }

        return {
          ...message,
          structured: {
            ...message.structured,
            projectState: sanitizedRestoredProjectState,
            preDialogueClosure: sanitizedPreDialogueClosure,
            preDialogueAwareness: sanitizedRestoredPreDialogueAwareness,
          },
        }
      })
  }

  function extractMessageContent(message: ChatHistoryItem) {
    if (typeof message.content === 'string')
      return message.content
    if (Array.isArray(message.content)) {
      return message.content.map((part) => {
        if (typeof part === 'string')
          return part
        if (part && typeof part === 'object' && 'text' in part)
          return String(part.text ?? '')
        return ''
      }).join('')
    }
    return ''
  }

  function ensureSessionMessageIds(sessionId: string) {
    const current = sessionMessages.value[sessionId] ?? []
    let changed = false
    const next = current.map((message) => {
      if (message.id)
        return message
      changed = true
      return {
        ...message,
        id: nanoid(),
      }
    })

    if (changed)
      sessionMessages.value[sessionId] = next

    return next
  }

  function normalizeMessagesWithIds(messages: ChatHistoryItem[]) {
    const sanitizedMessages = sanitizeSessionMessages(messages)
    let changed = false
    const normalizedWithIds = sanitizedMessages.map((message) => {
      if (message.id)
        return message
      changed = true
      return {
        ...message,
        id: nanoid(),
      }
    })
    const normalized = canonicalizeSessionMessages(normalizedWithIds)
    return {
      normalized,
      changed: changed
        || sanitizedMessages.length !== messages.length
        || normalized.length !== normalizedWithIds.length
        || JSON.stringify(normalized) !== JSON.stringify(normalizedWithIds),
    }
  }

  function buildSyncMessages(messages: ChatHistoryItem[]) {
    return messages.map(message => ({
      id: message.id ?? nanoid(),
      role: message.role,
      content: extractMessageContent(message),
      createdAt: message.createdAt,
    }))
  }

  async function syncSessionToRemote(sessionId: string) {
    let cachedRecord: ChatSessionRecord | null | undefined
    const request = useLocalFirstRequest({
      local: async () => {
        cachedRecord = await chatSessionsRepo.getSession(sessionId)
        return cachedRecord
      },
      remote: async () => {
        if (!cachedRecord)
          cachedRecord = await chatSessionsRepo.getSession(sessionId)
        if (!cachedRecord)
          return cachedRecord

        const members: Array<
          | { type: 'user', userId: string }
          | { type: 'character', characterId: string }
        > = [
          { type: 'user', userId: userId.value },
        ]

        if (cachedRecord.meta.characterId && cachedRecord.meta.characterId !== 'default') {
          members.push({
            type: 'character',
            characterId: cachedRecord.meta.characterId,
          })
        }

        const normalizedMessages = cachedRecord.messages.map(message => message.id ? message : { ...message, id: nanoid() })
        if (normalizedMessages.some((message, index) => cachedRecord?.messages[index]?.id !== message.id)) {
          cachedRecord = {
            ...cachedRecord,
            messages: normalizedMessages,
          }
          await chatSessionsRepo.saveSession(sessionId, cachedRecord)
        }

        const res = await client.api.chats.sync.$post({
          json: {
            chat: {
              id: cachedRecord.meta.sessionId,
              type: 'group',
              title: cachedRecord.meta.title,
              createdAt: cachedRecord.meta.createdAt,
              updatedAt: cachedRecord.meta.updatedAt,
            },
            members,
            messages: buildSyncMessages(cachedRecord.messages),
          },
        })

        if (!res.ok)
          throw new Error('Failed to sync chat session')
        return cachedRecord
      },
      allowRemote: () => isAuthenticated.value,
      lazy: true,
    })

    await request.execute()
  }

  function scheduleSync(sessionId: string) {
    void enqueueSync(async () => {
      try {
        await syncSessionToRemote(sessionId)
      }
      catch (error) {
        console.warn('Failed to sync chat session', error)
      }
    })
  }

  function ensureGeneration(sessionId: string) {
    if (sessionGenerations.value[sessionId] === undefined)
      sessionGenerations.value[sessionId] = 0
  }

  async function loadIndexForUser(currentUserId: string) {
    const stored = await chatSessionsRepo.getIndex(currentUserId)
    index.value = stored ?? {
      userId: currentUserId,
      characters: {},
    }
  }

  function getCharacterIndex(characterId: string) {
    if (!index.value)
      return null
    return index.value.characters[characterId] ?? null
  }

  async function persistIndex() {
    if (!index.value)
      return
    const snapshot = JSON.parse(JSON.stringify(index.value)) as ChatSessionsIndex
    await enqueuePersist(() => chatSessionsRepo.saveIndex(snapshot))
  }

  async function persistSession(sessionId: string) {
    const meta = sessionMetas.value[sessionId]
    if (!meta)
      return
    const currentMessages = ensureSessionMessageIds(sessionId)
    const canonicalMessages = canonicalizeSessionMessages(currentMessages)
    if (JSON.stringify(canonicalMessages) !== JSON.stringify(currentMessages)) {
      const current = sessionMessages.value[sessionId]
      if (current)
        current.splice(0, current.length, ...canonicalMessages)
    }
    const messages = snapshotMessages(sessionMessages.value[sessionId] ?? canonicalMessages)
    const now = Date.now()
    const updatedMeta = {
      ...meta,
      updatedAt: now,
    }

    sessionMetas.value[sessionId] = updatedMeta
    const characterIndex = index.value?.characters[meta.characterId]
    if (characterIndex)
      characterIndex.sessions[sessionId] = updatedMeta

    const record: ChatSessionRecord = {
      meta: updatedMeta,
      messages,
    }

    await enqueuePersist(() => chatSessionsRepo.saveSession(sessionId, record))
    await persistIndex()
    scheduleSync(sessionId)
  }

  function persistSessionMessages(sessionId: string) {
    void persistSession(sessionId)
  }

  function setSessionMessages(sessionId: string, next: ChatHistoryItem[]) {
    const sanitizedNext = sanitizeSessionMessages(next)
    const current = sessionMessages.value[sessionId]
    if (current) {
      current.splice(0, current.length, ...sanitizedNext)
    }
    else {
      sessionMessages.value[sessionId] = sanitizedNext
    }
    void persistSession(sessionId)
  }

  async function loadSession(sessionId: string) {
    if (loadedSessions.has(sessionId))
      return
    if (loadingSessions.has(sessionId)) {
      await loadingSessions.get(sessionId)
      return
    }

    const loadPromise = (async () => {
      const stored = await chatSessionsRepo.getSession(sessionId)
      if (stored) {
        const { normalized: normalizedStoredMessages, changed } = normalizeMessagesWithIds(stored.messages)
        if (changed) {
          await chatSessionsRepo.saveSession(sessionId, {
            ...stored,
            messages: normalizedStoredMessages,
          })
        }

        const localMessages = sanitizeSessionMessages(sessionMessages.value[sessionId] ?? [])
        const hasLocalMessages = localMessages.length > 0
        const mergedMessages = hasLocalMessages
          ? mergeLoadedSessionMessages(normalizedStoredMessages, localMessages)
          : canonicalizeSessionMessages(normalizedStoredMessages)

        sessionMetas.value[sessionId] = stored.meta
        const current = sessionMessages.value[sessionId]
        if (current) {
          current.splice(0, current.length, ...mergedMessages)
        }
        else {
          sessionMessages.value[sessionId] = mergedMessages
        }
        ensureGeneration(sessionId)
      }
      loadedSessions.add(sessionId)
    })()

    loadingSessions.set(sessionId, loadPromise)
    await loadPromise
    loadingSessions.delete(sessionId)
  }

  async function createSession(characterId: string, options?: { setActive?: boolean, messages?: ChatHistoryItem[], title?: string }) {
    const currentUserId = getCurrentUserId()
    const sessionId = nanoid()
    const now = Date.now()
    const meta: ChatSessionMeta = {
      sessionId,
      userId: currentUserId,
      characterId,
      title: options?.title,
      createdAt: now,
      updatedAt: now,
    }

    const initialMessages = options?.messages?.length ? sanitizeSessionMessages(options.messages) : []

    sessionMetas.value[sessionId] = meta
    sessionMessages.value[sessionId] = initialMessages
    ensureGeneration(sessionId)

    if (!index.value)
      index.value = { userId: currentUserId, characters: {} }

    const characterIndex = index.value.characters[characterId] ?? {
      activeSessionId: sessionId,
      sessions: {},
    }
    characterIndex.sessions[sessionId] = meta
    if (options?.setActive !== false)
      characterIndex.activeSessionId = sessionId
    index.value.characters[characterId] = characterIndex

    const record: ChatSessionRecord = { meta, messages: initialMessages }

    if (options?.setActive !== false)
      activeSessionId.value = sessionId

    // NOTICE: mark just-created session as loaded to prevent async loadSession() from
    // clobbering fresh in-memory messages with a stale persisted snapshot during reset races.
    loadedSessions.add(sessionId)

    await enqueuePersist(() => chatSessionsRepo.saveSession(sessionId, record))
    await persistIndex()
    scheduleSync(sessionId)

    return sessionId
  }

  async function ensureExternalSession(sessionIdRaw: string, options?: { setActive?: boolean, title?: string }) {
    const sessionId = sessionIdRaw.trim()
    if (!sessionId)
      return ''

    const currentUserId = getCurrentUserId()
    const characterId = getCurrentCharacterId()
    if (!index.value || index.value.userId !== currentUserId)
      await loadIndexForUser(currentUserId)

    ensureSession(sessionId)
    ensureGeneration(sessionId)
    await loadSession(sessionId)

    const existingMeta = sessionMetas.value[sessionId]
    if (existingMeta) {
      if (options?.setActive)
        setActiveSession(sessionId)
      return sessionId
    }

    const now = Date.now()
    const meta: ChatSessionMeta = {
      sessionId,
      userId: currentUserId,
      characterId,
      title: options?.title,
      createdAt: now,
      updatedAt: now,
    }
    sessionMetas.value[sessionId] = meta

    if (!index.value)
      index.value = { userId: currentUserId, characters: {} }

    const characterIndex = index.value.characters[characterId] ?? {
      activeSessionId: sessionId,
      sessions: {},
    }
    characterIndex.sessions[sessionId] = meta
    if (options?.setActive)
      characterIndex.activeSessionId = sessionId
    index.value.characters[characterId] = characterIndex

    const record: ChatSessionRecord = {
      meta,
      messages: snapshotMessages(sessionMessages.value[sessionId] ?? []),
    }

    if (options?.setActive)
      activeSessionId.value = sessionId

    loadedSessions.add(sessionId)
    await enqueuePersist(() => chatSessionsRepo.saveSession(sessionId, record))
    await persistIndex()
    scheduleSync(sessionId)
    return sessionId
  }

  async function ensureActiveSessionForCharacter() {
    const currentUserId = getCurrentUserId()
    const characterId = getCurrentCharacterId()

    if (!index.value || index.value.userId !== currentUserId)
      await loadIndexForUser(currentUserId)

    const characterIndex = getCharacterIndex(characterId)
    if (!characterIndex) {
      await createSession(characterId)
      return
    }

    if (!characterIndex.activeSessionId) {
      await createSession(characterId)
      return
    }

    activeSessionId.value = characterIndex.activeSessionId
    await loadSession(characterIndex.activeSessionId)
    ensureSession(characterIndex.activeSessionId)
  }

  async function initialize() {
    if (ready.value)
      return
    if (initializePromise)
      return initializePromise
    initializing.value = true
    initializePromise = (async () => {
      await ensureActiveSessionForCharacter()
      ready.value = true
    })()

    try {
      await initializePromise
    }
    finally {
      initializePromise = null
      initializing.value = false
    }
  }

  function ensureSession(sessionId: string) {
    ensureGeneration(sessionId)
    if (!sessionMessages.value[sessionId]) {
      sessionMessages.value[sessionId] = []
    }
  }

  const messages = computed<ChatHistoryItem[]>({
    get: () => {
      if (!activeSessionId.value)
        return []
      ensureSession(activeSessionId.value)
      return sessionMessages.value[activeSessionId.value] ?? []
    },
    set: (value) => {
      if (!activeSessionId.value)
        return
      const current = sessionMessages.value[activeSessionId.value]
      if (current) {
        current.splice(0, current.length, ...sanitizeSessionMessages(value))
      }
      else {
        sessionMessages.value[activeSessionId.value] = sanitizeSessionMessages(value)
      }
      void persistSession(activeSessionId.value)
    },
  })

  function setActiveSession(sessionId: string) {
    activeSessionId.value = sessionId
    ensureSession(sessionId)

    const characterId = getCurrentCharacterId()
    const characterIndex = index.value?.characters[characterId]
    if (characterIndex) {
      characterIndex.activeSessionId = sessionId
      void persistIndex()
    }

    if (ready.value)
      void loadSession(sessionId)
  }

  function cleanupMessages(sessionId = activeSessionId.value) {
    ensureGeneration(sessionId)
    sessionGenerations.value[sessionId] += 1
    setSessionMessages(sessionId, [])
  }

  function getAllSessions() {
    return JSON.parse(JSON.stringify(sessionMessages.value)) as Record<string, ChatHistoryItem[]>
  }

  async function resetAllSessions() {
    const currentUserId = getCurrentUserId()
    const characterId = getCurrentCharacterId()
    const sessionIds = new Set<string>()

    if (index.value?.userId === currentUserId) {
      for (const character of Object.values(index.value.characters)) {
        for (const sessionId of Object.keys(character.sessions))
          sessionIds.add(sessionId)
      }
    }

    sessionMessages.value = {}
    sessionMetas.value = {}
    sessionGenerations.value = {}
    loadedSessions.clear()
    loadingSessions.clear()

    index.value = {
      userId: currentUserId,
      characters: {},
    }

    const nextActiveSessionId = await createSession(characterId)

    for (const sessionId of sessionIds) {
      if (sessionId === nextActiveSessionId)
        continue
      await enqueuePersist(() => chatSessionsRepo.deleteSession(sessionId))
    }
  }

  function getSessionMessages(sessionId: string) {
    ensureSession(sessionId)
    return sessionMessages.value[sessionId] ?? []
  }

  async function ensureSessionReady(sessionId: string) {
    ensureSession(sessionId)
    await loadSession(sessionId)
  }

  function getSessionGeneration(sessionId: string) {
    ensureGeneration(sessionId)
    return sessionGenerations.value[sessionId] ?? 0
  }

  function bumpSessionGeneration(sessionId: string) {
    ensureGeneration(sessionId)
    sessionGenerations.value[sessionId] += 1
    return sessionGenerations.value[sessionId]
  }

  function getSessionGenerationValue(sessionId?: string) {
    const target = sessionId ?? activeSessionId.value
    return getSessionGeneration(target)
  }

  async function forkSession(options: { fromSessionId: string, atIndex?: number, reason?: string, hidden?: boolean }) {
    const characterId = getCurrentCharacterId()
    const parentMessages = getSessionMessages(options.fromSessionId)
    const forkIndex = options.atIndex ?? parentMessages.length
    const nextMessages = parentMessages.slice(0, forkIndex)
    return await createSession(characterId, { setActive: false, messages: nextMessages })
  }

  async function exportSessions(): Promise<ChatSessionsExport> {
    if (!ready.value)
      await initialize()

    if (!index.value) {
      return {
        format: 'chat-sessions-index:v1',
        index: { userId: getCurrentUserId(), characters: {} },
        sessions: {},
      }
    }

    const sessions: Record<string, ChatSessionRecord> = {}
    for (const character of Object.values(index.value.characters)) {
      for (const sessionId of Object.keys(character.sessions)) {
        const stored = await chatSessionsRepo.getSession(sessionId)
        if (stored) {
          sessions[sessionId] = stored
          continue
        }
        const meta = sessionMetas.value[sessionId]
        const messages = sessionMessages.value[sessionId]
        if (meta && messages)
          sessions[sessionId] = { meta, messages }
      }
    }

    return {
      format: 'chat-sessions-index:v1',
      index: index.value,
      sessions,
    }
  }

  async function importSessions(payload: ChatSessionsExport) {
    if (payload.format !== 'chat-sessions-index:v1')
      return

    index.value = payload.index
    sessionMessages.value = {}
    sessionMetas.value = {}
    sessionGenerations.value = {}
    loadedSessions.clear()
    loadingSessions.clear()

    await enqueuePersist(() => chatSessionsRepo.saveIndex(payload.index))

    for (const [sessionId, record] of Object.entries(payload.sessions)) {
      const sanitizedMessages = sanitizeSessionMessages(record.messages)
      sessionMetas.value[sessionId] = record.meta
      sessionMessages.value[sessionId] = sanitizedMessages
      ensureGeneration(sessionId)
      await enqueuePersist(() => chatSessionsRepo.saveSession(sessionId, {
        ...record,
        messages: sanitizedMessages,
      }))
    }

    await ensureActiveSessionForCharacter()
  }

  watch(activeCardId, () => {
    if (!ready.value)
      return
    void ensureActiveSessionForCharacter()
  })

  return {
    ready,
    isReady,
    initialize,

    activeSessionId,
    messages,

    setActiveSession,
    cleanupMessages,
    getAllSessions,
    resetAllSessions,

    ensureSession,
    setSessionMessages,
    persistSessionMessages,
    getSessionMessages,
    ensureExternalSession,
    ensureSessionReady,
    sessionMessages,
    sessionMetas,
    getSessionGeneration,
    bumpSessionGeneration,
    getSessionGenerationValue,

    forkSession,
    exportSessions,
    importSessions,
  }
})
