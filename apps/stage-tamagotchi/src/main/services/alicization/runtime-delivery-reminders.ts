import type {
  AlicizationAuditLogInput,
  AlicizationHostPersonModelSnapshot,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { AlicizationExecutionMemorySurfaceRestraint } from './execution-delivery-surface'
import type { AlicizationExecutionResultDeliveryPolicy } from './execution-interaction-learning'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import {
  alicizationFixedTemplateReplacement,
  buildAlicizationEmbodimentLoopSummary,
  containsAlicizationFixedTemplateResidue,
  describeAlicizationEmbodimentClosureReminder,
  formatAlicizationProjectStateAwarenessFields,
} from '@proj-alicization/stage-shared'

import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { resolveAlicizationProactiveVisibleUtterance } from './proactive-mind/visible-utterance-realization'
import {
  alicizationProjectStatePersistenceLandedReminder,
  alicizationProjectStateVisibleReplyNextClosureReminder,
  alicizationProjectStateVisibleReplyOpenClosureReminder,
  alicizationProjectStateVisibleReplySameHerReminder,
} from './project-state-answer-governance'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { buildPrioritizedProjectStateRewritePreserveLines } from './runtime-governance'
import {
  buildAlicizationAutonomousDialogueTurnId,
  resolveAlicizationAutonomousDialogueOrigin,
} from './runtime-structured-format'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'
import { createAlicizationTurnRuntime } from './turn-os/runtime'
import { buildAlicizationTurnGraphFromSettlements } from './turn-os/turn-graph'

type CallbackPersistenceSelfContinuityAuthority = Partial<AlicizationSelfContinuityAuthority> & {
  currentBodyState?: string | null
}

const continuityBaselineTag = ['same', 'her-baseline'].join('-')

type ProjectStateAuditFieldKind
  = | 'phase'
    | 'landed'
    | 'open'
    | 'next'
    | 'continuity_anchor'
    | 'continuity_hold'
    | 'continuity_drift_risk'
    | 'emotional_closure'
    | 'summary'
    | 'awareness'

function extractProjectStateAwarenessFieldValue(structured: string, key: string) {
  return structured
    .split('|')
    .map(part => part.trim())
    .find(part => part.startsWith(`${key}=`))
    ?.replace(new RegExp(`^${key}=`, 'u'), '')
    .trim()
    || ''
}

function formatProjectStateAuditField(raw: unknown, field: ProjectStateAuditFieldKind, maxChars = 360) {
  const normalized = sanitizeProjectStateField(raw, null)
  if (!normalized)
    return null

  const formatInput = (() => {
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
  const extracted = extractProjectStateAwarenessFieldValue(formatted, key)
  if (extracted)
    return extracted

  return containsAlicizationFixedTemplateResidue(normalized)
    ? alicizationFixedTemplateReplacement
    : normalized
}

function ensureProjectStateAudit(input: {
  projectStateAudit: {
    sameHerSummary?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRiskSummary?: string | null
    continuityArcStage?: string | null
    currentPhaseSummary?: string | null
    landedProgressSummary?: string | null
    openClosureSummary?: string | null
    openFocusSummary?: string | null
    nextFocusSummary?: string | null
    nextClosureTargetSummary?: string | null
    emotionalClosureSummary?: string | null
    preDialogueAwarenessSummary?: string | null
    companionBriefingLine?: string | null
    continuitySummary?: string | null
    embodimentClosureSummary?: string | null
    preservedIntoRewrite?: boolean
    rewriteClosureApplied?: boolean
  } | null | undefined
  selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  projectState: {
    currentPhase?: string | null
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
    companionHeadlineLine?: string | null
    companionBriefingLine?: string | null
    latestLandedProgress?: string | null
    latestProgress?: string | null
    landedProgressSummary?: string | null
    primaryOpenLoop?: string | null
    openClosureSummary?: string | null
    nextClosureTarget?: string | null
    nextClosureTargetSummary?: string | null
    sameHerSelfLine?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRisk?: string | null
    continuityArcStage?: string | null
    emotionalClosureCue?: string | null
  }
  preferRicherClosureCarry?: boolean
}) {
  const buildStructuredProjectAwarenessCarry = (parts: Array<unknown>) => parts
    .map(value => sanitizeProjectStateField(value, null))
    .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index)
    .join(' ')
    || null
  const carriesProjectIdentityAwareness = (value: string | null | undefined) => /local-first digital life project|current continuity project|phase1 continuity|continuous identity|continuous identity|continuity_project/iu.test(value ?? '')
  const carriesSameHerContinuityAwareness = (value: string | null | undefined) => /continuity line|current continuity|phase1 continuity|continuity line|same-session mirror carry|continuous identity|continuous identity|without splitting continuity|initiative and embodiment closure|continuity_identity|continuity_identity/iu.test(value ?? '')
  const sameHerSummary = input.projectState.sameHerSelfLine
    ?? alicizationProjectStateVisibleReplySameHerReminder
  const landedProgressSummary = input.projectState.latestLandedProgress
    ?? input.projectState.latestProgress
    ?? input.projectState.landedProgressSummary
    ?? alicizationProjectStatePersistenceLandedReminder
  const openClosureSummary = input.projectState.primaryOpenLoop
    ?? input.projectState.openClosureSummary
    ?? input.projectState.nextClosureTarget
    ?? alicizationProjectStateVisibleReplyOpenClosureReminder
  const nextClosureTargetSummary = resolvePreferredProjectNextClosureTarget(
    input.projectState.nextClosureTarget,
    input.projectState.nextClosureTargetSummary,
    input.projectState.primaryOpenLoop,
    alicizationProjectStateVisibleReplyNextClosureReminder,
  )
  const preferredProjectAwarenessLine = isAlicizationThinProjectAwarenessLine(input.projectState.preDialogueAwarenessLine ?? null)
    ? sanitizeProjectStateField(
        input.projectState.companionBriefingLine ?? null,
        input.projectState.preDialogueAwarenessLine ?? null,
      )
    : input.projectState.preDialogueAwarenessLine ?? null
  const currentPhaseSummary = sanitizeProjectStateField(
    null,
    input.projectState.currentPhase ?? null,
  )
  const existing = input.projectStateAudit ?? null
  const sameHerDriftRiskSummary = sanitizeProjectStateField(
    existing?.sameHerDriftRiskSummary,
    input.projectState.sameHerDriftRisk ?? null,
  )
  const sameHerHoldDetail = sanitizeProjectStateField(
    input.projectState.sameHerHoldDetail,
    input.projectStateAudit?.sameHerHoldDetail ?? null,
  )
  const continuityArcStage = sanitizeProjectStateField(
    input.projectState.continuityArcStage,
    input.projectStateAudit?.continuityArcStage ?? null,
  )
  const emotionalClosureSummary = input.preferRicherClosureCarry
    ? preferRicherProjectStateAuditText({
        current: existing?.emotionalClosureSummary,
        candidate: input.projectState.emotionalClosureCue ?? null,
      })
    : sanitizeProjectStateField(
        existing?.emotionalClosureSummary,
        input.projectState.emotionalClosureCue ?? null,
      )
  const selfContinuityAuthorityWithBodyState
    = input.selfContinuityAuthority as CallbackPersistenceSelfContinuityAuthority | null | undefined
  const authoritySummary = sanitizeProjectStateField(
    input.selfContinuityAuthority?.authoritySummary ?? null,
    null,
  )
  const currentBodyState = sanitizeProjectStateField(
    selfContinuityAuthorityWithBodyState?.currentBodyState ?? null,
    null,
  )
  const callbackPersistenceSelfContinuityAuthority: CallbackPersistenceSelfContinuityAuthority = {
    ...input.selfContinuityAuthority,
    authoritySummary,
    currentBodyState,
  }
  const embodimentClosureSummary = resolveCallbackPersistenceEmbodimentClosureSummary({
    current: describeAlicizationEmbodimentClosureReminder({
      authoritySummary,
      currentBodyState,
    }) || null,
    selfContinuityAuthority: callbackPersistenceSelfContinuityAuthority,
  })
  const resolvedSameHerSummary = resolveProjectSameHerSummary(existing?.sameHerSummary, sameHerSummary)
  const resolvedLandedProgressSummary = input.preferRicherClosureCarry
    ? preferRicherProjectStateAuditText({
        current: existing?.landedProgressSummary,
        candidate: landedProgressSummary,
      })
    : sanitizeProjectStateField(existing?.landedProgressSummary, landedProgressSummary)
  const resolvedOpenClosureSummary = input.preferRicherClosureCarry
    ? preferRicherProjectStateAuditText({
        current: existing?.openClosureSummary,
        candidate: openClosureSummary,
      })
    : sanitizeProjectStateField(existing?.openClosureSummary, openClosureSummary)
  const resolvedOpenFocusSummary = input.preferRicherClosureCarry
    ? preferRicherProjectStateAuditText({
        current: existing?.openFocusSummary,
        candidate: input.projectStateAudit?.openFocusSummary ?? null,
      })
    : sanitizeProjectStateField(existing?.openFocusSummary, input.projectStateAudit?.openFocusSummary ?? null)
  const resolvedNextFocusSummary = input.preferRicherClosureCarry
    ? preferRicherProjectStateAuditText({
        current: existing?.nextFocusSummary,
        candidate: input.projectStateAudit?.nextFocusSummary ?? null,
      })
    : sanitizeProjectStateField(existing?.nextFocusSummary, input.projectStateAudit?.nextFocusSummary ?? null)
  const resolvedNextClosureTargetSummary = input.preferRicherClosureCarry
    ? preferRicherProjectNextClosureAuditText({
        current: existing?.nextClosureTargetSummary,
        candidate: nextClosureTargetSummary,
      })
    : sanitizeProjectStateField(existing?.nextClosureTargetSummary, nextClosureTargetSummary)
  const preDialogueAwarenessSummary = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      ...input.projectState,
      preDialogueAwarenessLine: preferredProjectAwarenessLine,
      companionHeadlineLine: input.projectState.companionHeadlineLine ?? preferredProjectAwarenessLine,
      landedProgressSummary: resolvedLandedProgressSummary,
      openClosureSummary: resolvedOpenClosureSummary,
      nextFocusSummary: resolvedNextFocusSummary,
      openFocusSummary: resolvedOpenFocusSummary,
      nextClosureTargetSummary: resolvedNextClosureTargetSummary,
      emotionalClosureSummary,
      sameHerDriftRiskSummary,
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: existing?.preDialogueAwarenessSummary ?? null,
      preDialogueAwarenessSummary: existing?.preDialogueAwarenessSummary ?? null,
      landedProgressSummary: existing?.landedProgressSummary ?? null,
      openClosureSummary: existing?.openClosureSummary ?? null,
      openFocusSummary: existing?.openFocusSummary ?? null,
      nextFocusSummary: existing?.nextFocusSummary ?? null,
      nextClosureTargetSummary: existing?.nextClosureTargetSummary ?? null,
      emotionalClosureSummary: existing?.emotionalClosureSummary ?? null,
      sameHerDriftRiskSummary: existing?.sameHerDriftRiskSummary ?? null,
      preflightSummary: input.projectState.preflightSummary ?? null,
    },
  })
  ?? input.projectState.preflightSummary
  ?? `current continuity | ${sameHerSummary}`
  const richerStructuredPreDialogueAwarenessSummary = input.preferRicherClosureCarry
    ? buildStructuredProjectAwarenessCarry([
        preferredProjectAwarenessLine,
        resolvedLandedProgressSummary,
        resolvedOpenClosureSummary,
        resolvedOpenFocusSummary,
        resolvedNextFocusSummary,
        resolvedNextClosureTargetSummary,
        emotionalClosureSummary,
      ])
    : null
  const resolvedPreDialogueAwarenessSummary = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: preferredProjectAwarenessLine,
      companionHeadlineLine: input.projectState.companionHeadlineLine ?? preferredProjectAwarenessLine,
      companionBriefingLine: input.projectState.companionBriefingLine ?? null,
      preDialogueAwarenessSummary: input.preferRicherClosureCarry
        ? null
        : preDialogueAwarenessSummary,
      landedProgressSummary: resolvedLandedProgressSummary,
      openClosureSummary: resolvedOpenClosureSummary,
      openFocusSummary: resolvedOpenFocusSummary,
      nextFocusSummary: resolvedNextFocusSummary,
      nextClosureTargetSummary: resolvedNextClosureTargetSummary,
      emotionalClosureSummary,
      sameHerDriftRiskSummary,
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: existing?.preDialogueAwarenessSummary ?? null,
      companionBriefingLine: existing?.companionBriefingLine ?? null,
      preDialogueAwarenessSummary: existing?.preDialogueAwarenessSummary ?? null,
      landedProgressSummary: existing?.landedProgressSummary ?? null,
      openClosureSummary: existing?.openClosureSummary ?? null,
      openFocusSummary: existing?.openFocusSummary ?? null,
      nextFocusSummary: existing?.nextFocusSummary ?? null,
      nextClosureTargetSummary: existing?.nextClosureTargetSummary ?? null,
      emotionalClosureSummary: existing?.emotionalClosureSummary ?? null,
      sameHerDriftRiskSummary: existing?.sameHerDriftRiskSummary ?? null,
      preflightSummary: input.projectState.preflightSummary ?? null,
    },
  })
  const shouldPreferStructuredClosureAwareness = Boolean(
    input.preferRicherClosureCarry
    && richerStructuredPreDialogueAwarenessSummary
    && (
      resolvedLandedProgressSummary !== sanitizeProjectStateField(existing?.landedProgressSummary, null)
      || resolvedOpenClosureSummary !== sanitizeProjectStateField(existing?.openClosureSummary, null)
      || resolvedNextClosureTargetSummary !== sanitizeProjectStateField(existing?.nextClosureTargetSummary, null)
    ),
  )
  const explicitProjectAwarenessAnchor = sanitizeProjectStateField(
    preferredProjectAwarenessLine,
    input.projectState.companionHeadlineLine ?? null,
  )
  const explicitProjectAwarenessAnchorCarriesSameHer = carriesSameHerContinuityAwareness(explicitProjectAwarenessAnchor)
  const selectedPreDialogueAwarenessSummary = shouldPreferStructuredClosureAwareness
    ? richerStructuredPreDialogueAwarenessSummary
    : resolvedPreDialogueAwarenessSummary
      ?? richerStructuredPreDialogueAwarenessSummary
      ?? sanitizeProjectStateField(existing?.preDialogueAwarenessSummary, preDialogueAwarenessSummary)
  const selectedPreDialogueAwarenessSummaryCarriesSameHer = carriesSameHerContinuityAwareness(selectedPreDialogueAwarenessSummary)
  const finalPreDialogueAwarenessSummary
    = explicitProjectAwarenessAnchor
      && (
        (
          carriesProjectIdentityAwareness(explicitProjectAwarenessAnchor)
          && !carriesProjectIdentityAwareness(selectedPreDialogueAwarenessSummary)
        )
        || (
          explicitProjectAwarenessAnchorCarriesSameHer
          && !selectedPreDialogueAwarenessSummaryCarriesSameHer
        )
      )
      ? explicitProjectAwarenessAnchor
      : selectedPreDialogueAwarenessSummary
  const resolvedEmbodimentClosureSummary = resolveEmbodimentClosureSummary(
    existing?.embodimentClosureSummary,
    embodimentClosureSummary,
  )
  const safeSameHerSummary = formatProjectStateAuditField(resolvedSameHerSummary, 'continuity_anchor', 320)
  const safeSameHerHoldDetail = formatProjectStateAuditField(sameHerHoldDetail, 'continuity_hold', 320)
  const safeCurrentPhaseSummary = formatProjectStateAuditField(currentPhaseSummary, 'phase', 220)
  const safeLandedProgressSummary = formatProjectStateAuditField(resolvedLandedProgressSummary, 'landed', 360)
  const safeOpenClosureSummary = formatProjectStateAuditField(resolvedOpenClosureSummary, 'open', 360)
  const safeNextClosureTargetSummary = formatProjectStateAuditField(resolvedNextClosureTargetSummary, 'next', 360)
  const safeEmotionalClosureSummary = formatProjectStateAuditField(emotionalClosureSummary, 'emotional_closure', 360)
  const safeSameHerDriftRiskSummary = formatProjectStateAuditField(sameHerDriftRiskSummary, 'continuity_drift_risk', 360)
  const safeEmbodimentClosureSummary = formatProjectStateAuditField(resolvedEmbodimentClosureSummary, 'summary', 520)
  const resolvedContinuitySummary = buildProjectStateContinuitySummary({
    sameHerSummary: safeSameHerSummary,
    sameHerHoldDetail: safeSameHerHoldDetail,
    continuityArcStage,
    currentPhaseSummary: safeCurrentPhaseSummary,
    landedProgressSummary: safeLandedProgressSummary,
    openClosureSummary: safeOpenClosureSummary,
    nextClosureTargetSummary: safeNextClosureTargetSummary,
    emotionalClosureSummary: safeEmotionalClosureSummary,
    sameHerDriftRiskSummary: safeSameHerDriftRiskSummary,
    embodimentClosureSummary: safeEmbodimentClosureSummary,
  })

  return {
    sameHerSummary: safeSameHerSummary,
    sameHerHoldDetail: safeSameHerHoldDetail,
    continuityArcStage,
    currentPhaseSummary: safeCurrentPhaseSummary,
    landedProgressSummary: safeLandedProgressSummary,
    openClosureSummary: safeOpenClosureSummary,
    openFocusSummary: formatProjectStateAuditField(resolvedOpenFocusSummary, 'summary', 220),
    nextFocusSummary: formatProjectStateAuditField(resolvedNextFocusSummary, 'summary', 220),
    nextClosureTargetSummary: safeNextClosureTargetSummary,
    emotionalClosureSummary: safeEmotionalClosureSummary,
    preDialogueAwarenessSummary: formatProjectStateAuditField(finalPreDialogueAwarenessSummary, 'awareness', 800),
    sameHerDriftRiskSummary: safeSameHerDriftRiskSummary,
    continuitySummary: resolvedContinuitySummary,
    embodimentClosureSummary: safeEmbodimentClosureSummary,
    preservedIntoRewrite: existing?.preservedIntoRewrite ?? true,
    rewriteClosureApplied: existing?.rewriteClosureApplied ?? false,
  }
}

function normalizeHostVisibleEmbodimentClosureSummary(value: unknown) {
  const normalized = sanitizeProjectStateField(value, null)
  if (!normalized)
    return null

  return normalized
}

function ensureHostVisibleProjectStateAudit(input: Parameters<typeof ensureProjectStateAudit>[0]) {
  const audit = ensureProjectStateAudit(input)
  const hostVisibleEmbodimentClosureSummary = normalizeHostVisibleEmbodimentClosureSummary(audit.embodimentClosureSummary)

  if (!hostVisibleEmbodimentClosureSummary || hostVisibleEmbodimentClosureSummary === audit.embodimentClosureSummary)
    return audit

  return {
    ...audit,
    continuitySummary: buildProjectStateContinuitySummary({
      sameHerSummary: audit.sameHerSummary ?? null,
      sameHerHoldDetail: audit.sameHerHoldDetail,
      sameHerDriftRiskSummary: audit.sameHerDriftRiskSummary,
      currentPhaseSummary: audit.currentPhaseSummary,
      landedProgressSummary: audit.landedProgressSummary ?? null,
      openClosureSummary: audit.openClosureSummary ?? null,
      nextClosureTargetSummary: audit.nextClosureTargetSummary,
      emotionalClosureSummary: audit.emotionalClosureSummary,
      embodimentClosureSummary: hostVisibleEmbodimentClosureSummary,
    }),
    embodimentClosureSummary: hostVisibleEmbodimentClosureSummary,
  }
}

interface CreateAlicizationDeliveryReminderRuntimeOptions {
  getActiveCardId: () => string
  isAlicizationKillSwitchSuspended: () => boolean
  getAlicizationCardKillSwitchState: (cardId: string) => 'ACTIVE' | 'SUSPENDED'
  appendRuntimeDebugLine: (event: string, payload?: Record<string, unknown>) => Promise<void>
  clearReminderDueTimer: () => void
  getAlicizationDb: () => any
  scheduleNextReminderDueCheck: (reason: string) => Promise<void>
  reminderClaimBatchSize: number
  reminderOverdueTierThresholdMinutes: number
  reminderLlmRetryDelayMs: number
  getSoulSnapshot: () => any
  bootstrap: () => Promise<any>
  generateReminderStructuredWithGateway: (
    personality: any,
    reminder: { minutes: number, message: string, tier: 'mild' | 'severe' },
    agentTurnInput?: {
      turnId: string
      decisionTraceId?: string | null
    },
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) => Promise<any>
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  buildReminderContinuitySignal: (input: any) => any
  ensureActiveOrLatestSessionId: (cardId: string) => Promise<string>
  appendConversationTurnWithGuards: (payload: any) => Promise<boolean | undefined>
  sanitizeBriefText: (raw: string, maxLength?: number) => string
  buildReminderSessionMirrorAction: (input: any) => any
  syncAgentTurnSessionMirror: (input: any) => void
  syncSessionMirrorFromCurrentCardState: (input: any) => Promise<void>
  hydrateAgentTurnFromCurrentCardState: (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => Promise<void>
  buildAgentRuntimeAuditSnapshot: (agentTurn?: AlicizationAgentTurnRuntime | null) => unknown
  normalizeSessionId: (raw: unknown) => string
  getActiveSessionIdByCard: (cardId: string) => unknown
  executionDeliveryRuntime: {
    isInlineSurfaced: (input: {
      cardId: string
      completedAt: number
      sessionId: string
      threadId: string
    }) => boolean
    takeNext: (input: { cardId: string, sessionId?: string }) => any | null
    requeue: (entry: any) => void
    markDelivered: (entry: any) => void
  }
  buildExecutionDeliveryAction: (entry: any) => any
  generateExecutionCallbackStructuredWithGateway: (input: any) => Promise<any>
  buildExecutionDeliveryDeterministicStructured: (input: any) => any
  selectExecutionDeliveryReplySurface: (input: {
    channel: string
    goal: string
    llmReply?: string | null
    outcome: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    deliveryPolicy?: AlicizationExecutionResultDeliveryPolicy | null
    personStateProjection?: AlicizationPersonStateProjection | null
    selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
    hostPersonModel?: AlicizationHostPersonModelSnapshot | null
    knowledgeEvidence?: {
      validationCount?: number | null
      contradictionCount?: number | null
      stronglyValidatedProcedureCount?: number | null
      contradictionHeavyFactCount?: number | null
    } | null
  }) => {
    reply: string
    source: 'llm' | 'llm-repaired' | 'deterministic'
    reason?: string
  }
  resolveExecutionResultDeliveryPolicy: (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    status: AlicizationTaskThreadRecord['status']
  }) => Promise<AlicizationExecutionResultDeliveryPolicy>
  resolveExecutionSelfContinuityAuthority?: (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => Promise<AlicizationSelfContinuityAuthority | null>
  resolveExecutionHostPersonModel?: (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => Promise<AlicizationHostPersonModelSnapshot | null>
  resolveExecutionPersonStateProjection?: (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    goal?: string | null
    selfContinuityAuthority?: AlicizationSelfContinuityAuthority | null
  }) => Promise<AlicizationPersonStateProjection | null>
  resolveExecutionKnowledgeEvidence?: (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
  }) => Promise<{
    validationCount?: number | null
    contradictionCount?: number | null
    stronglyValidatedProcedureCount?: number | null
    contradictionHeavyFactCount?: number | null
  } | null>
  resolveReminderMemorySurfaceRestraint?: (input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    reminder: { minutes: number, message: string, tier: 'mild' | 'severe' }
  }) => Promise<AlicizationExecutionMemorySurfaceRestraint | null>
  getActiveSelfRevisionStatePatch?: () => Promise<AlicizationSelfRevisionStatePatch | null>
  persistExecutionDeliveryState: (cardIdRaw: unknown) => Promise<unknown>
  queueSubconsciousWake: (cardIdRaw: unknown, reason: string, delayMs?: number) => void
  executionCallbackRuntime: {
    markSurfaced: (input: { sessionId: string, createdAt: number }) => void
  }
  errorMessageFrom: (error: unknown) => string | undefined
}

function sanitizeProjectStateField(value: unknown, fallback: string | null) {
  if (typeof value !== 'string')
    return fallback
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized || fallback
}

function looksLikeThinProjectNextClosureShell(value: string | null | undefined) {
  const normalized = sanitizeProjectStateField(value, null)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  return normalized.includes('generic next target')
    || normalized.includes('generic next closure')
    || normalized.includes('generic closure shell')
    || normalized.includes('generic closure summary')
    || normalized.includes('generic callback summary')
    || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
}

function preferProjectNextClosureTarget(current: unknown, candidate: unknown) {
  const normalizedCurrent = sanitizeProjectStateField(current, null)
  const normalizedCandidate = sanitizeProjectStateField(candidate, null)

  if (!normalizedCurrent)
    return normalizedCandidate
  if (!normalizedCandidate)
    return normalizedCurrent
  if (normalizedCurrent === normalizedCandidate)
    return normalizedCurrent

  if (
    looksLikeThinProjectNextClosureShell(normalizedCurrent)
    && !looksLikeThinProjectNextClosureShell(normalizedCandidate)
  ) {
    return normalizedCandidate
  }

  return normalizedCurrent
}

function preferRicherProjectNextClosureAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeProjectStateField(input.current, null)
  const candidate = sanitizeProjectStateField(input.candidate, null)

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  if (looksLikeThinProjectNextClosureShell(current) !== looksLikeThinProjectNextClosureShell(candidate))
    return looksLikeThinProjectNextClosureShell(candidate) ? current : candidate

  return preferRicherProjectStateAuditText({
    current,
    candidate,
  })
}

function resolvePreferredProjectNextClosureTarget(...values: Array<unknown>): string | null {
  return values.reduce<string | null>(
    (best, candidate) => preferProjectNextClosureTarget(best, candidate),
    null,
  )
}

function preferRicherProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = sanitizeProjectStateField(input.current, null)
  const candidate = sanitizeProjectStateField(input.candidate, null)

  if (!current)
    return candidate
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function scoreProjectSameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  if (/current continuity|continuity|continuity line|continuous identity|continuous identity|continuous identity|without splitting continuity|initiative and embodiment closure|continuity_identity|continuity_identity/u.test(normalized))
    score += 3
  if (/holding together mainly through|face|motion|voice|lipsync|cross-modal|embodiment closure|unfinished closure|still needs .* closure/u.test(normalized))
    score += 2
  if (/keep the current continuity project in view|generic reminder|generic guidance/u.test(normalized))
    score -= 2
  return score
}

function looksLikeRicherLivingSelfSameHerLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return /continuous identity|continuous identity|holding together mainly through|face|motion|voice|lipsync|cross-modal|embodiment closure|continuity line|without splitting continuity|initiative and embodiment closure|continuous identity/u.test(normalized)
}

function resolveProjectSameHerSummary(existingValue: unknown, currentValue: string | null) {
  const existing = sanitizeProjectStateField(existingValue, null)
  const current = sanitizeProjectStateField(currentValue, null)
  const existingScore = scoreProjectSameHerLine(existing)
  const currentScore = scoreProjectSameHerLine(current)
  if (
    looksLikeRicherLivingSelfSameHerLine(current)
    && currentScore > existingScore
  ) {
    return current ?? existing
  }

  return existing ?? current
}

function resolveEmbodimentClosureSummary(value: unknown, current: string | null) {
  if (typeof current === 'string' && current.trim())
    return current.trim()

  if (typeof value !== 'string')
    return null

  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized || null
}

function shouldPromotePlainLaneEmbodimentCarryToLoopSummary(currentBodyState: string | null | undefined) {
  const normalized = sanitizeProjectStateField(currentBodyState, null)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('lane=')
    && normalized.includes('visible continuity still present but no longer fully cross-modal')
    && !normalized.includes('living audio thread')
    && !normalized.includes('resident body')
    && !normalized.includes('same segment')
}

function resolveCallbackPersistenceEmbodimentClosureSummary(input: {
  current?: string | null
  selfContinuityAuthority?: CallbackPersistenceSelfContinuityAuthority | null
}) {
  const current = sanitizeProjectStateField(input.current, null)
  const selfContinuityAuthorityWithBodyState
    = input.selfContinuityAuthority as CallbackPersistenceSelfContinuityAuthority | null | undefined
  const authoritySummary = sanitizeProjectStateField(
    input.selfContinuityAuthority?.authoritySummary ?? null,
    null,
  )
  const currentBodyState = sanitizeProjectStateField(
    selfContinuityAuthorityWithBodyState?.currentBodyState ?? null,
    null,
  )

  if (!shouldPromotePlainLaneEmbodimentCarryToLoopSummary(currentBodyState))
    return current

  const loopSummary = buildAlicizationEmbodimentLoopSummary({
    authoritySummary,
    currentBodyState,
  }) || null

  return preferRicherProjectStateAuditText({
    current,
    candidate: loopSummary,
  })
}

function buildProjectStateContinuitySummary(input: {
  sameHerSummary: string | null
  sameHerHoldDetail?: string | null
  sameHerDriftRiskSummary?: string | null
  continuityArcStage?: string | null
  currentPhaseSummary?: string | null
  landedProgressSummary: string | null
  openClosureSummary: string | null
  nextClosureTargetSummary?: string | null
  emotionalClosureSummary?: string | null
  embodimentClosureSummary: string | null
}) {
  const projectStateContinuityCarry = buildPrioritizedProjectStateRewritePreserveLines({
    projectStateContinuityAnchors: [
      input.sameHerSummary ? `continuity_anchor=${formatProjectStateAuditField(input.sameHerSummary, 'continuity_anchor', 320)}` : '',
      input.sameHerHoldDetail ? `hold=${formatProjectStateAuditField(input.sameHerHoldDetail, 'continuity_hold', 320)}` : '',
      input.continuityArcStage ? `arc=${input.continuityArcStage}` : '',
      input.sameHerDriftRiskSummary ? `drift=${formatProjectStateAuditField(input.sameHerDriftRiskSummary, 'continuity_drift_risk', 360)}` : '',
      input.currentPhaseSummary ? `phase=${formatProjectStateAuditField(input.currentPhaseSummary, 'phase', 220)}` : '',
      input.landedProgressSummary ? `landed=${formatProjectStateAuditField(input.landedProgressSummary, 'landed', 360)}` : '',
      input.openClosureSummary ? `open=${formatProjectStateAuditField(input.openClosureSummary, 'open', 360)}` : '',
      input.nextClosureTargetSummary ? `next=${formatProjectStateAuditField(input.nextClosureTargetSummary, 'next', 360)}` : '',
      input.emotionalClosureSummary ? `closure=${formatProjectStateAuditField(input.emotionalClosureSummary, 'emotional_closure', 360)}` : '',
    ].filter(Boolean),
  })
  return [
    ...projectStateContinuityCarry,
    input.embodimentClosureSummary ? `body=${formatProjectStateAuditField(input.embodimentClosureSummary, 'summary', 520)}` : '',
  ].filter(Boolean).join(' | ') || null
}

export const runtimeDeliveryReminderTestInternals = {
  buildReminderProjectStatePersistence,
  buildProjectStateContinuitySummary,
  ensureProjectStateAudit,
  resolvePersistedProjectState,
}

function resolvePersistedProjectState(input: {
  runtimeProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preflightSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    primaryOpenLoop?: unknown
    nextClosureTarget?: unknown
    sameHerSelfLine?: unknown
    sameHerHoldDetail?: unknown
    sameHerDriftRisk?: unknown
    continuityArcStage?: unknown
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    openFocusSummary?: unknown
    nextFocusSummary?: unknown
    nextClosureTargetSummary?: unknown
    emotionalClosureSummary?: unknown
    sameHerDriftRiskSummary?: unknown
    emotionalClosureCue?: unknown
  } | null
  fallbackProjectState: {
    identity: string
    currentPhase: string
    preflightSummary: string | null
    preDialogueAwarenessLine?: string | null
    awarenessLine?: string | null
    companionBriefingLine?: string | null
    preDialogueAwarenessSummary?: string | null
    latestLandedProgress: string | null
    primaryOpenLoop: string | null
    nextClosureTarget: string
    sameHerSelfLine: string
    sameHerHoldDetail?: string | null
    sameHerDriftRisk?: string | null
    continuityArcStage?: string | null
    landedProgressSummary?: string | null
    openClosureSummary?: string | null
    openFocusSummary?: string | null
    nextFocusSummary?: string | null
    nextClosureTargetSummary?: string | null
    emotionalClosureSummary?: string | null
    sameHerDriftRiskSummary?: string | null
    emotionalClosureCue?: string | null
  }
}) {
  const runtimePreflightSummary = sanitizeProjectStateField(
    input.runtimeProjectState?.preflightSummary,
    null,
  )
  const runtimeAwarenessSummaryLine = sanitizeProjectStateField(
    input.runtimeProjectState?.preDialogueAwarenessSummary,
    null,
  )
  const runtimeInlineAwarenessLine = sanitizeProjectStateField(
    input.runtimeProjectState?.preDialogueAwarenessLine,
    sanitizeProjectStateField(
      input.runtimeProjectState?.awarenessLine,
      null,
    ),
  )
  const runtimeExplicitAwarenessLine
    = runtimeInlineAwarenessLine
      && isAlicizationThinProjectAwarenessLine(runtimeInlineAwarenessLine)
      && runtimeAwarenessSummaryLine
      && !isAlicizationThinProjectAwarenessLine(runtimeAwarenessSummaryLine)
      ? runtimeAwarenessSummaryLine
      : sanitizeProjectStateField(
          runtimeInlineAwarenessLine,
          runtimeAwarenessSummaryLine,
        )
  const runtimeCompanionBriefingLine = sanitizeProjectStateField(
    input.runtimeProjectState?.companionBriefingLine,
    null,
  )
  const fallbackExplicitAwarenessLine = sanitizeProjectStateField(
    input.fallbackProjectState.preDialogueAwarenessLine,
    sanitizeProjectStateField(
      input.fallbackProjectState.awarenessLine,
      null,
    ),
  )
  const runtimeProjectStateLooksThin = [
    input.runtimeProjectState?.identity,
    input.runtimeProjectState?.currentPhase,
    input.runtimeProjectState?.preflightSummary,
    input.runtimeProjectState?.preDialogueAwarenessLine,
    input.runtimeProjectState?.awarenessLine,
    input.runtimeProjectState?.companionBriefingLine,
    input.runtimeProjectState?.preDialogueAwarenessSummary,
    input.runtimeProjectState?.latestLandedProgress,
    input.runtimeProjectState?.primaryOpenLoop,
    input.runtimeProjectState?.nextClosureTarget,
    input.runtimeProjectState?.sameHerSelfLine,
    input.runtimeProjectState?.sameHerDriftRisk,
  ].every(value => !sanitizeProjectStateField(value, null))
  const preferredPersistedAwarenessLine
    = runtimeExplicitAwarenessLine && !isAlicizationThinProjectAwarenessLine(runtimeExplicitAwarenessLine)
      ? runtimeExplicitAwarenessLine
      : runtimeCompanionBriefingLine || (runtimeProjectStateLooksThin
        ? fallbackExplicitAwarenessLine
        : null)
  const shouldPreserveRuntimeProjectThreadPreflight
    = Boolean(
      runtimePreflightSummary
      && /same-digital-life-project-thread|phase1-route=|unresolved=/iu.test(runtimePreflightSummary),
    )
  const runtimePreDialogueAwarenessLine = sanitizeProjectStateField(
    runtimeExplicitAwarenessLine,
    runtimeAwarenessSummaryLine,
  )
  const preferredRuntimePreDialogueAwarenessLine = isAlicizationThinProjectAwarenessLine(runtimePreDialogueAwarenessLine)
    ? sanitizeProjectStateField(
        input.fallbackProjectState.preDialogueAwarenessLine ?? null,
        runtimePreDialogueAwarenessLine,
      )
    : runtimePreDialogueAwarenessLine
  const preferredRuntimeNextClosureTarget = resolvePreferredProjectNextClosureTarget(
    input.runtimeProjectState?.nextClosureTarget,
    input.runtimeProjectState?.nextClosureTargetSummary,
    input.fallbackProjectState.nextClosureTarget,
    input.fallbackProjectState.nextClosureTargetSummary ?? null,
  )
  const runtimeLatestLandedProgress = sanitizeProjectStateField(
    input.runtimeProjectState?.latestLandedProgress,
    sanitizeProjectStateField(input.runtimeProjectState?.latestProgress, null),
  )
  const canonicalStructuredProjectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: sanitizeProjectStateField(
        input.runtimeProjectState?.identity,
        input.fallbackProjectState.identity,
      ) ?? input.fallbackProjectState.identity,
      currentPhase: sanitizeProjectStateField(
        input.runtimeProjectState?.currentPhase,
        input.fallbackProjectState.currentPhase,
      ) ?? input.fallbackProjectState.currentPhase,
      latestLandedProgress: sanitizeProjectStateField(
        runtimeLatestLandedProgress,
        input.fallbackProjectState.latestLandedProgress,
      ),
      primaryOpenLoop: sanitizeProjectStateField(
        input.runtimeProjectState?.primaryOpenLoop,
        input.fallbackProjectState.primaryOpenLoop,
      ),
      nextClosureTarget: sanitizeProjectStateField(
        preferredRuntimeNextClosureTarget,
        input.fallbackProjectState.nextClosureTarget,
      ) ?? input.fallbackProjectState.nextClosureTarget,
      sameHerSelfLine: sanitizeProjectStateField(
        input.runtimeProjectState?.sameHerSelfLine,
        input.fallbackProjectState.sameHerSelfLine,
      ) ?? input.fallbackProjectState.sameHerSelfLine,
      sameHerHoldDetail: sanitizeProjectStateField(
        input.runtimeProjectState?.sameHerHoldDetail,
        input.fallbackProjectState.sameHerHoldDetail ?? null,
      ),
      sameHerDriftRisk: sanitizeProjectStateField(
        input.runtimeProjectState?.sameHerDriftRisk,
        input.fallbackProjectState.sameHerDriftRisk ?? null,
      ),
      continuityArcStage: sanitizeProjectStateField(
        input.runtimeProjectState?.continuityArcStage,
        input.fallbackProjectState.continuityArcStage ?? null,
      ),
    },
    runtimePreflightSummary: sanitizeProjectStateField(
      input.runtimeProjectState?.preflightSummary,
      input.fallbackProjectState.preflightSummary,
    ),
    runtimePreDialogueAwarenessLine: sanitizeProjectStateField(
      resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: {
          preDialogueAwarenessLine: preferredRuntimePreDialogueAwarenessLine,
          awarenessLine: input.runtimeProjectState?.awarenessLine,
          companionBriefingLine: input.runtimeProjectState?.companionBriefingLine,
          preDialogueAwarenessSummary: input.runtimeProjectState?.preDialogueAwarenessSummary,
          preflightSummary: input.runtimeProjectState?.preflightSummary,
          landedProgressSummary: input.runtimeProjectState?.landedProgressSummary ?? runtimeLatestLandedProgress,
          openClosureSummary: input.runtimeProjectState?.openClosureSummary,
          openFocusSummary: input.runtimeProjectState?.openFocusSummary,
          nextFocusSummary: input.runtimeProjectState?.nextFocusSummary,
          nextClosureTargetSummary: sanitizeProjectStateField(
            preferredRuntimeNextClosureTarget,
            sanitizeProjectStateField(input.runtimeProjectState?.nextClosureTargetSummary, null),
          ),
          emotionalClosureSummary: input.runtimeProjectState?.emotionalClosureSummary,
          sameHerDriftRiskSummary: input.runtimeProjectState?.sameHerDriftRiskSummary,
        },
        fallbackProjectState: {
          preDialogueAwarenessLine: input.fallbackProjectState.preDialogueAwarenessLine ?? null,
          awarenessLine: input.fallbackProjectState.awarenessLine ?? null,
          companionBriefingLine: input.fallbackProjectState.companionBriefingLine ?? null,
          preDialogueAwarenessSummary: input.fallbackProjectState.preDialogueAwarenessSummary ?? null,
          preflightSummary: input.fallbackProjectState.preflightSummary,
          landedProgressSummary: input.fallbackProjectState.landedProgressSummary ?? null,
          openClosureSummary: input.fallbackProjectState.openClosureSummary ?? null,
          openFocusSummary: input.fallbackProjectState.openFocusSummary ?? null,
          nextFocusSummary: input.fallbackProjectState.nextFocusSummary ?? null,
          nextClosureTargetSummary: input.fallbackProjectState.nextClosureTargetSummary ?? null,
          emotionalClosureSummary: input.fallbackProjectState.emotionalClosureSummary ?? null,
          sameHerDriftRiskSummary: input.fallbackProjectState.sameHerDriftRiskSummary ?? null,
        },
      }),
      input.fallbackProjectState.preDialogueAwarenessLine ?? null,
    ),
    payloadPreflightSummary: input.fallbackProjectState.preflightSummary,
    payloadPreDialogueAwarenessLine: input.fallbackProjectState.preDialogueAwarenessLine ?? null,
  })

  return {
    ...canonicalStructuredProjectState,
    preflightSummary: shouldPreserveRuntimeProjectThreadPreflight
      ? runtimePreflightSummary
      : canonicalStructuredProjectState.preflightSummary,
    preDialogueAwarenessSummary: preferredPersistedAwarenessLine ?? canonicalStructuredProjectState.preDialogueAwarenessSummary,
    preDialogueAwarenessLine: preferredPersistedAwarenessLine ?? canonicalStructuredProjectState.preDialogueAwarenessLine,
    awarenessLine: preferredPersistedAwarenessLine ?? canonicalStructuredProjectState.awarenessLine,
    emotionalClosureCue: sanitizeProjectStateField(
      input.runtimeProjectState?.emotionalClosureCue,
      input.fallbackProjectState.emotionalClosureCue ?? null,
    ),
  }
}

function resolveExecutionDeliveryContinuityCue(reasonTags: string[]) {
  return reasonTags.find(tag =>
    tag === 'held-autonomy-carry'
    || tag === continuityBaselineTag
    || tag === 'callback-afterglow-hold',
  ) ?? null
}

function carriesProjectStateCallbackClosure(input: {
  personStateProjection?: AlicizationPersonStateProjection | null
  projectState?: {
    preflightSummary?: string | null
    currentPhase?: string | null
    primaryOpenLoop?: string | null
  } | null
}) {
  const text = [
    input.personStateProjection?.openingGuidance ?? '',
    input.personStateProjection?.summary ?? '',
    input.projectState?.preflightSummary ?? '',
    input.projectState?.currentPhase ?? '',
    input.projectState?.primaryOpenLoop ?? '',
  ].join(' ').toLowerCase()

  return /phase 1|local-first digital life|current continuity|unfinished closure|project identity carry|still-open closure|continuity/u.test(text)
}

function resolveExecutionDeliveryHoldOpeningGuidance(input: {
  continuityCue: string | null
  personStateProjection?: AlicizationPersonStateProjection | null
  reasonTags?: string[] | null
  projectState?: {
    nextClosureTarget?: string | null
    primaryOpenLoop?: string | null
    sameHerSelfLine?: string | null
    latestLandedProgress?: string | null
    emotionalClosureCue?: string | null
  } | null
}) {
  const projectedGuidance = input.personStateProjection?.openingGuidance ?? null
  const sameHerSelfLine = sanitizeProjectStateField(
    input.projectState?.sameHerSelfLine,
    null,
  )
  const primaryOpenLoop = sanitizeProjectStateField(
    input.projectState?.primaryOpenLoop,
    null,
  )
  const nextClosureTarget = sanitizeProjectStateField(
    input.projectState?.nextClosureTarget,
    null,
  )
  const latestLandedProgress = sanitizeProjectStateField(
    input.projectState?.latestLandedProgress,
    null,
  )
  const emotionalClosureCue = sanitizeProjectStateField(
    input.projectState?.emotionalClosureCue,
    null,
  )
  const carriesRestProtective = (input.reasonTags ?? []).includes('rest-protective')
    || /rest-protective|protect rest|quiet-companionship|line holds inward|低压|护住休息|安静陪着|先别外扩/iu.test(nextClosureTarget ?? '')
    || /rest-protective|protect rest|quiet-companionship|line holds inward|低压|护住休息|安静陪着|先别外扩/iu.test(emotionalClosureCue ?? '')
  const carriesRepairBeforeCloseness = (input.reasonTags ?? []).includes('repair-before-closeness')
    || /repair-before-closeness|repair before closeness|先修复再靠近|先把身体收稳|修复优先/iu.test(nextClosureTarget ?? '')
    || /repair-before-closeness|repair before closeness|先修复再靠近|先把身体收稳|修复优先/iu.test(emotionalClosureCue ?? '')
  const normalizedNextClosureTarget = carriesRestProtective
    ? nextClosureTarget?.replace(
      /measured-return or repair-before-closeness line/gu,
      'rest-protective or quiet-companionship line',
    ) ?? null
    : carriesRepairBeforeCloseness
      ? nextClosureTarget?.replace(
        /measured-return or repair-before-closeness line/gu,
        'repair-before-closeness line',
      ) ?? null
      : nextClosureTarget
  const sameHerMeasuredReturnLine = [
    sameHerSelfLine ? `Stay inside ${sameHerSelfLine}` : '',
    latestLandedProgress ? `Keep trusting that ${lowerFirst(latestLandedProgress)}` : '',
    primaryOpenLoop ? `Do not lose the still-open line where ${lowerFirst(primaryOpenLoop)}` : '',
    carriesRestProtective
      ? 'Keep the reopening rest-protective, stay quiet-companionship, and let the line hold inward before any warmth widens.'
      : carriesRepairBeforeCloseness
        ? 'Keep the reopening repair-before-closeness and let repair settle before widening closeness.'
        : 'Keep the reopening measured-return and lower-pressure before widening closeness.',
    normalizedNextClosureTarget ? `Let the callback keep serving ${lowerFirst(normalizedNextClosureTarget)}` : '',
  ].filter(Boolean).join(' ')
  const carriesHeldAutonomy = input.continuityCue === 'held-autonomy-carry'
    || (input.reasonTags ?? []).includes('held-autonomy-carry')
  const carriesSameHerBaseline = input.continuityCue === continuityBaselineTag
    || (input.reasonTags ?? []).includes(continuityBaselineTag)
  const carriesHeldAutonomyOpeningGuidance = projectedGuidance
    ? /same thread|callback|held back|re-enter|life thread|同一条线|留白|慢一点|接回去|别太快|不要太快|先别贴得太近/iu.test(projectedGuidance)
    : false
  const projectedGuidanceLooksThinSameHerBaseline = projectedGuidance
    ? /stay inside the current continuity baseline/u.test(projectedGuidance)
    && !/keep trusting that|do not lose the still-open line where|let the callback keep serving/u.test(projectedGuidance)
    : false

  if (carriesHeldAutonomy) {
    return carriesHeldAutonomyOpeningGuidance
      ? projectedGuidance
      : carriesRepairBeforeCloseness
        ? `Re-enter the line you deliberately held back gently, keep the callback on the same thread, and hold repair-before-closeness a little longer before widening closeness. ${sameHerMeasuredReturnLine}`.trim()
        : `Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread and leave room before renewed closeness. ${sameHerMeasuredReturnLine}`.trim()
  }
  if (projectedGuidance) {
    if ((carriesSameHerBaseline || (input.reasonTags ?? []).includes('callback-afterglow-hold'))
      && (
        projectedGuidanceLooksThinSameHerBaseline
        || !/keep trusting that|do not lose the still-open line where|let the callback keep serving/u.test(projectedGuidance)
      )
      && sameHerMeasuredReturnLine) {
      return `${projectedGuidance} ${sameHerMeasuredReturnLine}`.trim()
    }
    return projectedGuidance
  }
  if (carriesSameHerBaseline) {
    return sameHerMeasuredReturnLine || 'Stay inside the current continuity baseline. Keep the opening lower-pressure and leave room before widening closeness.'
  }
  return 'Keep the callback thread-faithful and bounded.'
}

function lowerFirst(text: string) {
  if (!text)
    return text
  return text.charAt(0).toLowerCase() + text.slice(1)
}

type AlicizationPersonStateProjectionWithProjectState = AlicizationPersonStateProjection & {
  projectState?: Record<string, unknown> | null
}

function buildReminderProjectStatePersistence(projectStateBrief: ReturnType<typeof resolveAlicizationProjectStateBrief>) {
  const projectStatePersistenceAwarenessLine = projectStateBrief.preDialogueAwarenessLine ?? null
  const canonicalProjectStatePersistence = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: projectStateBrief.identity,
      currentPhase: projectStateBrief.currentPhase,
      latestLandedProgress: projectStateBrief.continuityProgressSummary ?? projectStateBrief.memoryAnthropomorphismProgress.at(-1) ?? null,
      primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
      nextClosureTarget: projectStateBrief.nextClosureTarget,
      sameHerSelfLine: projectStateBrief.sameHerSelfLine,
      sameHerDriftRisk: projectStateBrief.sameHerDriftRisk,
      continuityArcStage: projectStateBrief.continuityArcStage ?? null,
    },
    runtimePreflightSummary: projectStateBrief.preflightSummary ?? null,
    runtimePreDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
  })

  return {
    ...canonicalProjectStatePersistence,
    preDialogueAwarenessSummary:
      projectStatePersistenceAwarenessLine
      ?? canonicalProjectStatePersistence.preDialogueAwarenessSummary,
    preDialogueAwarenessLine:
      projectStatePersistenceAwarenessLine
      ?? canonicalProjectStatePersistence.preDialogueAwarenessLine,
    awarenessLine:
      projectStatePersistenceAwarenessLine
      ?? canonicalProjectStatePersistence.awarenessLine,
    companionHeadlineLine:
      projectStatePersistenceAwarenessLine
      ?? canonicalProjectStatePersistence.companionHeadlineLine,
    companionBriefingLine:
      projectStatePersistenceAwarenessLine
      ?? canonicalProjectStatePersistence.companionBriefingLine,
    emotionalClosureCue: null,
  }
}

export function createAlicizationDeliveryReminderRuntime(options: CreateAlicizationDeliveryReminderRuntimeOptions) {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const projectStatePersistence = buildReminderProjectStatePersistence(projectStateBrief)

  async function processDueRemindersForCurrentCard(
    trigger: 'timer' | 'force' | 'startup',
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    const cardId = options.getActiveCardId()
    await options.hydrateAgentTurnFromCurrentCardState({
      agentTurn,
      cardId,
    })
    if (options.isAlicizationKillSwitchSuspended() || options.getAlicizationCardKillSwitchState(cardId) === 'SUSPENDED') {
      await options.appendRuntimeDebugLine('reminder.scan-skipped', {
        cardId,
        trigger,
        reason: 'kill-switch-suspended',
      })
      options.clearReminderDueTimer()
      return { claimed: 0, completed: 0, failed: 0, requeued: 0 }
    }

    const nowMs = Date.now()
    const pendingPreview = await options.getAlicizationDb().listPendingScheduledTasks(1).catch(() => [])
    const nextPending = pendingPreview.at(0)
    await options.appendRuntimeDebugLine('reminder.scan-started', {
      cardId: options.getActiveCardId(),
      trigger,
      nowMs,
      nowIso: new Date(nowMs).toISOString(),
      nextPendingTaskId: nextPending?.taskId,
      nextPendingTriggerAt: nextPending?.triggerAt,
      nextPendingTriggerIso: typeof nextPending?.triggerAt === 'number' ? new Date(nextPending.triggerAt).toISOString() : undefined,
      nextPendingDueInMs: typeof nextPending?.triggerAt === 'number' ? nextPending.triggerAt - nowMs : undefined,
    })
    const dueTasks = await options.getAlicizationDb().claimDueScheduledTasks(nowMs, options.reminderClaimBatchSize)
    if (dueTasks.length === 0) {
      await options.appendRuntimeDebugLine('reminder.scan-empty', {
        cardId: options.getActiveCardId(),
        trigger,
        nowMs,
        nextPendingTaskId: nextPending?.taskId,
        nextPendingTriggerAt: nextPending?.triggerAt,
        nextPendingDueInMs: typeof nextPending?.triggerAt === 'number' ? nextPending.triggerAt - nowMs : undefined,
      })
      await options.scheduleNextReminderDueCheck(`scan-empty:${trigger}`)
      return { claimed: 0, completed: 0, failed: 0, requeued: 0 }
    }

    await options.appendRuntimeDebugLine('reminder.scan-claimed', {
      cardId: options.getActiveCardId(),
      trigger,
      nowMs,
      claimedTaskIds: dueTasks.map((task: { taskId: string }) => task.taskId),
      claimedCount: dueTasks.length,
    })

    const soulForReminder = options.getSoulSnapshot() ?? await options.bootstrap()
    const personality = soulForReminder.frontmatter.personality
    let completed = 0
    let failed = 0
    let requeued = 0

    for (const task of dueTasks) {
      const delayMinutes = Math.max(0, (nowMs - task.triggerAt) / 60_000)
      const tier = delayMinutes >= options.reminderOverdueTierThresholdMinutes ? 'severe' : 'mild'
      const reminderInput = {
        minutes: delayMinutes,
        message: task.message,
        tier,
      } as const
      await options.appendRuntimeDebugLine('reminder.task-processing', {
        cardId: options.getActiveCardId(),
        trigger,
        taskId: task.taskId,
        triggerAt: task.triggerAt,
        triggerIso: new Date(task.triggerAt).toISOString(),
        delayMinutes: Number(delayMinutes.toFixed(2)),
        tier,
      })

      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.reminder',
        action: 'alicization.reminder.task.claimed',
        message: 'Claimed due reminder task for subconscious delivery.',
        payload: {
          trigger,
          taskId: task.taskId,
          triggerAt: task.triggerAt,
        },
      })

      if (delayMinutes > 0) {
        await options.appendAuditLog({
          level: 'notice',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.overdue-triggered',
          message: 'Triggered overdue reminder task after runtime recovery.',
          payload: {
            trigger,
            taskId: task.taskId,
            delayMinutes: Number(delayMinutes.toFixed(2)),
            tier,
          },
        })
      }

      try {
        await options.appendAuditLog({
          level: 'notice',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.triggered',
          message: 'Triggering reminder proactive utterance generation.',
          payload: {
            trigger,
            taskId: task.taskId,
            tier,
          },
        })
        agentTurn?.ingestContinuitySignals([
          options.buildReminderContinuitySignal({
            task: {
              taskId: task.taskId,
              triggerAt: task.triggerAt,
              message: task.message,
              sourceTurnId: task.sourceTurnId,
            },
            tier,
            delayMinutes,
            trigger,
          }),
        ])
        const firedTurnId = buildAlicizationAutonomousDialogueTurnId({
          kind: 'reminder',
          segments: [options.getActiveCardId(), task.taskId, Date.now()],
        })
        const llmStructured = await options.generateReminderStructuredWithGateway(personality, reminderInput, {
          turnId: firedTurnId,
        }, agentTurn)
        if (!llmStructured) {
          const nextTriggerAt = Date.now() + options.reminderLlmRetryDelayMs
          await options.getAlicizationDb().requeueScheduledTask(task.taskId, 'llm-unavailable', nextTriggerAt)
          requeued += 1
          await options.appendRuntimeDebugLine('reminder.task-requeued', {
            cardId: options.getActiveCardId(),
            trigger,
            taskId: task.taskId,
            reason: 'llm-unavailable',
            nextTriggerAt,
            nextTriggerIso: new Date(nextTriggerAt).toISOString(),
          })
          await options.appendAuditLog({
            level: 'warning',
            category: 'alicization.reminder',
            action: 'alicization.reminder.task.failed',
            message: 'Reminder task generation unavailable in this tick; task requeued for retry without deterministic fallback text.',
            payload: {
              trigger,
              taskId: task.taskId,
              reason: 'llm-unavailable',
              nextTriggerAt,
            },
          })
          continue
        }
        const structured = llmStructured
        const activeSelfRevisionPatch = await options.getActiveSelfRevisionStatePatch?.().catch(() => null) ?? null
        const reminderMemorySurfaceRestraint = await options.resolveReminderMemorySurfaceRestraint?.({
          agentTurn,
          cardId: options.getActiveCardId(),
          reminder: reminderInput,
        }).catch(() => null) ?? null
        const reminderVisibleUtterance = resolveAlicizationProactiveVisibleUtterance({
          kind: 'reminder',
          structured,
          hasMindAuthoredStructured: true,
          reason: 'mind-authored-reminder',
          selfRevisionPatch: activeSelfRevisionPatch,
          memorySurfaceRestraint: reminderMemorySurfaceRestraint
            ? {
                shouldStayInward: reminderMemorySurfaceRestraint.shouldStayInward,
                shouldDelayUntilAfterPayoff: reminderMemorySurfaceRestraint.shouldDelayUntilAfterPayoff,
                stableCoreOnly: reminderMemorySurfaceRestraint.stableCoreOnly,
                visibleCarryMode: reminderMemorySurfaceRestraint.visibleCarryMode,
              }
            : null,
        })
        if (!reminderVisibleUtterance.shouldPersistVisibleUtterance) {
          const nextTriggerAt = Date.now() + options.reminderLlmRetryDelayMs
          await options.getAlicizationDb().requeueScheduledTask(task.taskId, reminderVisibleUtterance.decision.reason, nextTriggerAt)
          requeued += 1
          await options.appendAuditLog({
            level: 'warning',
            category: 'alicization.reminder',
            action: 'alicization.reminder.task.failed',
            message: 'Reminder visible utterance was deferred because provider mind output was empty or not human-authored.',
            payload: {
              trigger,
              taskId: task.taskId,
              nextTriggerAt,
              decision: reminderVisibleUtterance.decision,
              visibleReplyRealization: reminderVisibleUtterance.visibleReplyRealization,
              selfRevisionPatch: activeSelfRevisionPatch
                ? {
                    id: activeSelfRevisionPatch.id,
                    lanes: activeSelfRevisionPatch.lanes,
                    reasonCodes: activeSelfRevisionPatch.reasonCodes,
                  }
                : null,
            },
          })
          continue
        }
        await options.appendRuntimeDebugLine('reminder.task-generated', {
          cardId: options.getActiveCardId(),
          trigger,
          taskId: task.taskId,
          source: 'llm',
          emotion: structured.emotion,
          replyPreview: options.sanitizeBriefText(structured.reply, 120),
        })
        const deliveredSessionId = await options.ensureActiveOrLatestSessionId(options.getActiveCardId())
        const reminderStructuredProjectStateAudit = ensureProjectStateAudit({
          projectStateAudit: reminderVisibleUtterance.visibleReplyRealization.projectStateAudit,
          projectState: projectStatePersistence,
          preferRicherClosureCarry: false,
        })
        const reminderHostVisibleProjectStateAudit = ensureHostVisibleProjectStateAudit({
          projectStateAudit: reminderVisibleUtterance.visibleReplyRealization.projectStateAudit,
          projectState: projectStatePersistence,
          preferRicherClosureCarry: false,
        })
        const persisted = await options.appendConversationTurnWithGuards({
          turnId: firedTurnId,
          sessionId: deliveredSessionId,
          assistantText: reminderVisibleUtterance.assistantText,
          structured: reminderVisibleUtterance.structuredForPersistence
            ? {
                ...reminderVisibleUtterance.structuredForPersistence,
                projectState: projectStatePersistence,
                visibleReplyRealization: reminderVisibleUtterance.structuredForPersistence.visibleReplyRealization
                  ? {
                      ...reminderVisibleUtterance.structuredForPersistence.visibleReplyRealization,
                      projectStateAudit: reminderStructuredProjectStateAudit,
                    }
                  : reminderVisibleUtterance.structuredForPersistence.visibleReplyRealization,
              }
            : reminderVisibleUtterance.structuredForPersistence,
          origin: resolveAlicizationAutonomousDialogueOrigin('proactive'),
          createdAt: Date.now(),
          visibleReplyRealization: {
            ...reminderVisibleUtterance.visibleReplyRealization,
            projectStateAudit: reminderHostVisibleProjectStateAudit,
          },
        })

        if (!persisted) {
          await options.getAlicizationDb().requeueScheduledTask(task.taskId, 'turn-write-skipped')
          requeued += 1
          await options.appendAuditLog({
            level: 'warning',
            category: 'alicization.reminder',
            action: 'alicization.reminder.task.failed',
            message: 'Reminder turn write skipped by runtime guard; task requeued.',
            payload: {
              trigger,
              taskId: task.taskId,
              reason: 'turn-write-skipped',
            },
          })
          continue
        }
        await options.appendRuntimeDebugLine('reminder.task-persisted', {
          cardId: options.getActiveCardId(),
          trigger,
          taskId: task.taskId,
          firedTurnId,
        })
        const reminderAction = options.buildReminderSessionMirrorAction({
          delayMinutes,
          firedTurnId,
          task: {
            taskId: task.taskId,
            triggerAt: task.triggerAt,
            message: task.message,
            sourceTurnId: task.sourceTurnId,
          },
          tier,
          trigger,
        })
        if (agentTurn)
          agentTurn.ingestRuntimeActions([reminderAction])
        options.syncAgentTurnSessionMirror({
          agentTurn,
          cardId: options.getActiveCardId(),
          sessionId: deliveredSessionId,
          source: 'reminder',
        })
        if (!agentTurn) {
          await options.syncSessionMirrorFromCurrentCardState({
            cardId: options.getActiveCardId(),
            reminderAction: {
              delayMinutes,
              firedTurnId,
              task: {
                taskId: task.taskId,
                triggerAt: task.triggerAt,
                message: task.message,
                sourceTurnId: task.sourceTurnId,
              },
              tier,
              trigger,
            },
            sessionId: deliveredSessionId,
            source: 'reminder',
            turnId: firedTurnId,
          })
        }

        await options.getAlicizationDb().completeScheduledTask(task.taskId, firedTurnId, Date.now())
        completed += 1
        await options.appendRuntimeDebugLine('reminder.task-completed', {
          cardId: options.getActiveCardId(),
          trigger,
          taskId: task.taskId,
          firedTurnId,
        })
        await options.appendAuditLog({
          level: 'notice',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.completed',
          message: 'Reminder task completed and delivered through subconscious proactive turn.',
          payload: {
            trigger,
            taskId: task.taskId,
            firedTurnId,
            emotion: structured.emotion,
            format: structured.format,
            source: 'llm',
            agentRuntime: options.buildAgentRuntimeAuditSnapshot(agentTurn),
          },
        })
      }
      catch (error) {
        failed += 1
        const reason = options.sanitizeBriefText(error instanceof Error ? error.message : String(error), 300) || 'unknown reminder execution failure'
        await options.getAlicizationDb().failScheduledTask?.(task.taskId, reason, Date.now()).catch(() => {})
        await options.appendRuntimeDebugLine('reminder.task-failed', {
          cardId: options.getActiveCardId(),
          trigger,
          taskId: task.taskId,
          reason,
        })
        await options.appendAuditLog({
          level: 'warning',
          category: 'alicization.reminder',
          action: 'alicization.reminder.task.failed',
          message: 'Reminder task failed during subconscious trigger execution.',
          payload: {
            trigger,
            taskId: task.taskId,
            reason,
          },
        })
      }
    }

    await options.scheduleNextReminderDueCheck(`scan-finished:${trigger}`)
    return {
      claimed: dueTasks.length,
      completed,
      failed,
      requeued,
    }
  }

  async function processPendingExecutionDeliveriesForCurrentCard(
    trigger: 'timer' | 'force',
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    const activeCardId = options.getActiveCardId()
    const activeSessionId = options.normalizeSessionId(options.getActiveSessionIdByCard(activeCardId))
    const pendingDelivery = options.executionDeliveryRuntime.takeNext({
      cardId: activeCardId,
      sessionId: activeSessionId || undefined,
    })
    if (!pendingDelivery)
      return false

    agentTurn?.ingestRuntimeActions([
      options.buildExecutionDeliveryAction(pendingDelivery),
    ])

    const firedTurnId = buildAlicizationAutonomousDialogueTurnId({
      kind: 'execution-callback',
      segments: [options.getActiveCardId(), pendingDelivery.threadId, Date.now()],
    })
    const skipIfInlineSurfaced = async (stage: 'pre-generate' | 'pre-persist') => {
      if (!options.executionDeliveryRuntime.isInlineSurfaced({
        cardId: options.getActiveCardId(),
        sessionId: pendingDelivery.sessionId,
        threadId: pendingDelivery.threadId,
        completedAt: pendingDelivery.completedAt,
      })) {
        return false
      }

      options.executionDeliveryRuntime.markDelivered(pendingDelivery)
      await options.persistExecutionDeliveryState(options.getActiveCardId())
      await options.appendRuntimeDebugLine('execution-delivery.skipped-inline-surfaced', {
        trigger,
        stage,
        cardId: options.getActiveCardId(),
        threadId: pendingDelivery.threadId,
        sessionId: pendingDelivery.sessionId,
        completedAt: pendingDelivery.completedAt,
      })
      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.executor.delivery',
        action: 'inline-surfaced-skip',
        message: 'Skipped subconscious execution delivery because the same execution result was already surfaced inline.',
        payload: {
          trigger,
          stage,
          threadId: pendingDelivery.threadId,
          sessionId: pendingDelivery.sessionId,
          completedAt: pendingDelivery.completedAt,
        },
      })
      return true
    }

    try {
      if (await skipIfInlineSurfaced('pre-generate'))
        return false

      const deliveryPolicy = await options.resolveExecutionResultDeliveryPolicy({
        agentTurn,
        cardId: options.getActiveCardId(),
        status: pendingDelivery.status,
      })
      const selfContinuityAuthority = options.resolveExecutionSelfContinuityAuthority
        ? await options.resolveExecutionSelfContinuityAuthority({
            agentTurn,
            cardId: options.getActiveCardId(),
          })
        : null
      const hostPersonModel = options.resolveExecutionHostPersonModel
        ? await options.resolveExecutionHostPersonModel({
            agentTurn,
            cardId: options.getActiveCardId(),
          })
        : null
      const personStateProjection = options.resolveExecutionPersonStateProjection
        ? await options.resolveExecutionPersonStateProjection({
            agentTurn,
            cardId: options.getActiveCardId(),
            goal: pendingDelivery.goal,
            selfContinuityAuthority,
          })
        : null
      const knowledgeEvidence = options.resolveExecutionKnowledgeEvidence
        ? await options.resolveExecutionKnowledgeEvidence({
            agentTurn,
            cardId: options.getActiveCardId(),
          })
        : null
      const callbackProjectState = resolvePersistedProjectState({
        runtimeProjectState: {
          ...(personStateProjection as AlicizationPersonStateProjectionWithProjectState | null)?.projectState,
          ...pendingDelivery.projectState,
        } as any,
        fallbackProjectState: projectStatePersistence,
      })
      if (deliveryPolicy.mode === 'hold-for-opening') {
        const callbackAfterglowHold = deliveryPolicy.reasonTags.includes('callback-afterglow-hold')
        const projectStateCallbackCarry = carriesProjectStateCallbackClosure({
          personStateProjection,
          projectState: callbackProjectState,
        })
        const continuityCue = resolveExecutionDeliveryContinuityCue(
          [...deliveryPolicy.reasonTags].reverse(),
        )
        const continuityArc = callbackAfterglowHold
          ? {
              continuityCue,
              callbackRationale: pendingDelivery.summary || pendingDelivery.outcome || pendingDelivery.goal || null,
              openingGuidance: resolveExecutionDeliveryHoldOpeningGuidance({
                continuityCue,
                personStateProjection,
                reasonTags: deliveryPolicy.reasonTags,
                projectState: callbackProjectState,
              }),
              sameThread: true,
              reasonTags: [
                ...deliveryPolicy.reasonTags,
                ...(projectStateCallbackCarry ? ['project-state-callback-carry'] : []),
              ],
            }
          : null
        pendingDelivery.projectState = {
          ...pendingDelivery.projectState,
          ...callbackProjectState,
          continuityArcStage: 'hold-for-opening',
          continuityCue:
            continuityCue
            ?? callbackProjectState.continuityCue
            ?? pendingDelivery.projectState?.continuityCue
            ?? null,
        } as NonNullable<typeof pendingDelivery.projectState>
        options.executionDeliveryRuntime.requeue(pendingDelivery)
        await options.persistExecutionDeliveryState(options.getActiveCardId())
        options.queueSubconsciousWake(
          options.getActiveCardId(),
          `execution-delivery-hold:${pendingDelivery.threadId}`,
          callbackAfterglowHold
            ? projectStateCallbackCarry ? 8 * 60_000 : 6 * 60_000
            : 3 * 60_000,
        )
        await options.appendRuntimeDebugLine('execution-delivery.held-for-opening', {
          trigger,
          cardId: options.getActiveCardId(),
          threadId: pendingDelivery.threadId,
          sessionId: pendingDelivery.sessionId,
          status: pendingDelivery.status,
          policy: deliveryPolicy,
          callbackAfterglowHold,
          projectStateCallbackCarry,
        })
        await options.appendAuditLog({
          level: 'notice',
          category: 'alicization.executor.delivery',
          action: callbackAfterglowHold ? 'held-for-callback-afterglow' : 'held-for-opening',
          message: callbackAfterglowHold
            ? 'Deferred execution-result delivery because the callback afterglow should stay on the same life thread before reopening.'
            : 'Deferred execution-result delivery because the current opening is too tight for this learned delivery profile.',
          payload: {
            trigger,
            threadId: pendingDelivery.threadId,
            sessionId: pendingDelivery.sessionId,
            status: pendingDelivery.status,
            policy: deliveryPolicy,
            callbackAfterglowHold,
            projectStateCallbackCarry,
            continuityArc,
          },
        })
        return false
      }

      const llmStructured = await options.generateExecutionCallbackStructuredWithGateway({
        cardId: options.getActiveCardId(),
        channel: pendingDelivery.channel,
        completedAt: pendingDelivery.completedAt,
        decisionTraceId: pendingDelivery.decisionTraceId,
        goal: pendingDelivery.goal,
        outcome: pendingDelivery.outcome,
        sessionId: pendingDelivery.sessionId,
        status: pendingDelivery.status,
        summary: pendingDelivery.summary,
        threadId: pendingDelivery.threadId,
        turnId: pendingDelivery.turnId,
        agentTurn,
        agentTurnInput: {
          turnId: firedTurnId,
          decisionTraceId: pendingDelivery.decisionTraceId,
        },
        deliveryPolicy,
        personStateProjection,
        selfContinuityAuthority,
        hostPersonModel,
        knowledgeEvidence,
        projectState: callbackProjectState,
      })
      const deterministicStructured = options.buildExecutionDeliveryDeterministicStructured({
        channel: pendingDelivery.channel,
        goal: pendingDelivery.goal,
        outcome: pendingDelivery.outcome,
        status: pendingDelivery.status,
        summary: pendingDelivery.summary,
        policy: deliveryPolicy,
        personStateProjection,
        selfContinuityAuthority,
        hostPersonModel,
      })
      const selectedReply = options.selectExecutionDeliveryReplySurface({
        channel: pendingDelivery.channel,
        goal: pendingDelivery.goal,
        llmReply: typeof llmStructured?.reply === 'string' ? llmStructured.reply : null,
        outcome: pendingDelivery.outcome,
        status: pendingDelivery.status,
        summary: pendingDelivery.summary,
        deliveryPolicy,
        personStateProjection,
        selfContinuityAuthority,
        hostPersonModel,
      })
      const structured = selectedReply.source === 'llm' && llmStructured
        ? {
            ...llmStructured,
            reply: selectedReply.reply,
          }
        : {
            ...deterministicStructured,
            reply: selectedReply.reply,
          }
      const deliverySource = selectedReply.source
      const activeSelfRevisionPatch = await options.getActiveSelfRevisionStatePatch?.().catch(() => null) ?? null
      const rawMindCallbackVisibleUtterance = llmStructured
        ? resolveAlicizationProactiveVisibleUtterance({
            kind: 'execution-callback',
            structured: llmStructured,
            hasMindAuthoredStructured: true,
            actualVisibleReplyAuthority: 'llm-mind',
            reason: 'mind-authored-execution-callback-preflight',
            allowDeterministicVisibleFallback: true,
            selfRevisionPatch: activeSelfRevisionPatch,
          })
        : null
      if (rawMindCallbackVisibleUtterance && !rawMindCallbackVisibleUtterance.shouldPersistVisibleUtterance) {
        options.executionDeliveryRuntime.requeue(pendingDelivery)
        await options.persistExecutionDeliveryState(options.getActiveCardId())
        options.queueSubconsciousWake(options.getActiveCardId(), `execution-delivery-requeue:${pendingDelivery.threadId}`, 1_500)
        await options.appendAuditLog({
          level: 'warning',
          category: 'alicization.executor.delivery',
          action: 'requeued-mind-authored-required',
          message: 'Execution callback visible reply was deferred because the raw mind-authored callback violated the current continuity opening guidance.',
          payload: {
            trigger,
            threadId: pendingDelivery.threadId,
            sessionId: pendingDelivery.sessionId,
            status: pendingDelivery.status,
            source: 'llm-preflight',
            surfaceReason: selectedReply.reason ?? null,
            visibleUtteranceDecision: rawMindCallbackVisibleUtterance.decision,
            visibleReplyRealization: rawMindCallbackVisibleUtterance.visibleReplyRealization,
          },
        })
        return false
      }
      const hasMindAuthoredCallbackSurface = Boolean(llmStructured) || selectedReply.source === 'llm-repaired'
      const allowDeterministicCallbackVisibleFallback = selectedReply.source === 'deterministic'
      const callbackVisibleUtterance = resolveAlicizationProactiveVisibleUtterance({
        kind: 'execution-callback',
        structured,
        hasMindAuthoredStructured: hasMindAuthoredCallbackSurface,
        actualVisibleReplyAuthority: selectedReply.source === 'llm'
          ? 'llm-mind'
          : hasMindAuthoredCallbackSurface
            ? 'llm-second-pass-rewrite'
            : allowDeterministicCallbackVisibleFallback
              ? 'local-deterministic-fallback'
              : undefined,
        reason: selectedReply.source === 'llm'
          ? 'mind-authored-execution-callback'
          : `execution-callback-visible-fallback-blocked:${selectedReply.reason ?? selectedReply.source}`,
        allowDeterministicVisibleFallback: allowDeterministicCallbackVisibleFallback,
        selfRevisionPatch: activeSelfRevisionPatch,
      })
      await options.appendRuntimeDebugLine('execution-delivery.structured-selected', {
        trigger,
        cardId: options.getActiveCardId(),
        threadId: pendingDelivery.threadId,
        sessionId: pendingDelivery.sessionId,
        status: pendingDelivery.status,
        source: deliverySource,
        surfaceReason: selectedReply.reason ?? null,
        policy: deliveryPolicy,
        callbackVisibleUtterance: {
          shouldPersistVisibleUtterance: callbackVisibleUtterance.shouldPersistVisibleUtterance,
          assistantText: options.sanitizeBriefText(callbackVisibleUtterance.assistantText, 160),
          structuredReply: options.sanitizeBriefText(String(callbackVisibleUtterance.structuredForPersistence?.reply ?? ''), 160),
          decision: callbackVisibleUtterance.decision,
          visibleReplyExecution: callbackVisibleUtterance.visibleReplyExecution,
        },
      })

      if (!callbackVisibleUtterance.shouldPersistVisibleUtterance) {
        options.executionDeliveryRuntime.requeue(pendingDelivery)
        await options.persistExecutionDeliveryState(options.getActiveCardId())
        options.queueSubconsciousWake(options.getActiveCardId(), `execution-delivery-requeue:${pendingDelivery.threadId}`, 1_500)
        await options.appendAuditLog({
          level: 'warning',
          category: 'alicization.executor.delivery',
          action: 'requeued-mind-authored-required',
          message: 'Execution callback visible reply was deferred because normal visible callback text must be mind-authored.',
          payload: {
            trigger,
            threadId: pendingDelivery.threadId,
            sessionId: pendingDelivery.sessionId,
            status: pendingDelivery.status,
            source: deliverySource,
            surfaceReason: selectedReply.reason ?? null,
            visibleUtteranceDecision: callbackVisibleUtterance.decision,
            visibleReplyRealization: callbackVisibleUtterance.visibleReplyRealization,
          },
        })
        return false
      }

      if (await skipIfInlineSurfaced('pre-persist'))
        return true

      const turnRuntime = createAlicizationTurnRuntime()
      const callbackTurnRuntimeContext = turnRuntime.beginTurn({
        cardId: options.getActiveCardId(),
        turnId: firedTurnId,
        sessionId: pendingDelivery.sessionId,
        governance: {
          decisionTraceId: pendingDelivery.decisionTraceId ?? null,
        },
      })
      const callbackVisibleReplySurface = callbackVisibleUtterance.visibleReplyRealization as any
      turnRuntime.settleSurface({
        context: callbackTurnRuntimeContext,
        surface: callbackVisibleReplySurface,
      })

      const callbackTurnGraph = buildAlicizationTurnGraphFromSettlements({
        prepared: {
          conversationSessionId: pendingDelivery.sessionId,
          governance: null,
          hasVisualGrounding: false,
          waitForTools: false,
          tools: undefined,
          replyRealization: null,
          replyExecutionPlan: null,
          runtimeSurface: {
            action: {
              kind: 'answer',
            },
            tooling: {
              routingRequired: false,
            },
          },
          sessionTrace: {
            phaseOrder: [],
          },
          organicMemoryContext: undefined,
          memoryTurnArtifact: null,
        } as any,
        cardId: options.getActiveCardId(),
        turnId: firedTurnId,
        actionObligation: {
          kind: 'answer',
          summary: pendingDelivery.summary,
          source: 'execution-callback',
        },
        memory: null,
        surface: callbackVisibleReplySurface,
        routingRequired: false,
        stageSettlements: callbackTurnRuntimeContext.stageSettlements,
        activeSelfRevision: null,
      })
      const callbackPersistenceStructuredProjectState
        = callbackVisibleUtterance.structuredForPersistence?.projectState
          && typeof callbackVisibleUtterance.structuredForPersistence.projectState === 'object'
          && !Array.isArray(callbackVisibleUtterance.structuredForPersistence.projectState)
          ? callbackVisibleUtterance.structuredForPersistence.projectState as Record<string, unknown>
          : null
      const persistedCallbackProjectState = resolvePersistedProjectState({
        runtimeProjectState: {
          ...llmStructured?.projectState,
          ...structured?.projectState,
          ...callbackPersistenceStructuredProjectState,
          ...pendingDelivery.projectState,
        },
        fallbackProjectState: projectStatePersistence,
      })
      const structuredProjectStateAudit = ensureProjectStateAudit({
        projectStateAudit: callbackVisibleUtterance.visibleReplyRealization.projectStateAudit,
        selfContinuityAuthority,
        projectState: persistedCallbackProjectState,
        preferRicherClosureCarry: true,
      })
      const hostVisibleProjectStateAudit = ensureHostVisibleProjectStateAudit({
        projectStateAudit: callbackVisibleUtterance.visibleReplyRealization.projectStateAudit,
        selfContinuityAuthority,
        projectState: persistedCallbackProjectState,
        preferRicherClosureCarry: true,
      })
      const callbackPersistenceStructuredEmbodimentClosureSummary = resolveCallbackPersistenceEmbodimentClosureSummary({
        current: structuredProjectStateAudit.embodimentClosureSummary,
        selfContinuityAuthority,
      })
      const callbackPersistenceHostVisibleEmbodimentClosureSummary = normalizeHostVisibleEmbodimentClosureSummary(
        callbackPersistenceStructuredEmbodimentClosureSummary ?? hostVisibleProjectStateAudit.embodimentClosureSummary,
      )
      const callbackPersistenceAwarenessSummary = [
        persistedCallbackProjectState.preDialogueAwarenessLine,
        hostVisibleProjectStateAudit.landedProgressSummary,
        hostVisibleProjectStateAudit.openClosureSummary,
        hostVisibleProjectStateAudit.openFocusSummary,
        hostVisibleProjectStateAudit.nextFocusSummary,
        hostVisibleProjectStateAudit.nextClosureTargetSummary,
        hostVisibleProjectStateAudit.emotionalClosureSummary,
      ]
        .map(value => sanitizeProjectStateField(value, null))
        .filter((value, index, list): value is string => Boolean(value) && list.indexOf(value) === index)
        .join(' ')
        || hostVisibleProjectStateAudit.preDialogueAwarenessSummary
      const callbackPersistenceStructuredProjectStateAudit = {
        ...structuredProjectStateAudit,
        ...(callbackPersistenceStructuredEmbodimentClosureSummary
          ? {
              embodimentClosureSummary: callbackPersistenceStructuredEmbodimentClosureSummary,
              continuitySummary: buildProjectStateContinuitySummary({
                sameHerSummary: structuredProjectStateAudit.sameHerSummary,
                sameHerHoldDetail: structuredProjectStateAudit.sameHerHoldDetail,
                continuityArcStage: structuredProjectStateAudit.continuityArcStage,
                sameHerDriftRiskSummary: structuredProjectStateAudit.sameHerDriftRiskSummary,
                currentPhaseSummary: structuredProjectStateAudit.currentPhaseSummary,
                landedProgressSummary: structuredProjectStateAudit.landedProgressSummary ?? null,
                openClosureSummary: structuredProjectStateAudit.openClosureSummary ?? null,
                nextClosureTargetSummary: structuredProjectStateAudit.nextClosureTargetSummary,
                emotionalClosureSummary: structuredProjectStateAudit.emotionalClosureSummary,
                embodimentClosureSummary: callbackPersistenceStructuredEmbodimentClosureSummary,
              }),
            }
          : {}),
        preDialogueAwarenessSummary: callbackPersistenceAwarenessSummary,
      } as NonNullable<typeof callbackVisibleUtterance.visibleReplyRealization.projectStateAudit>
      const callbackPersistenceHostVisibleProjectStateAudit = {
        ...hostVisibleProjectStateAudit,
        ...(callbackPersistenceHostVisibleEmbodimentClosureSummary
          ? {
              embodimentClosureSummary: callbackPersistenceHostVisibleEmbodimentClosureSummary,
              continuitySummary: buildProjectStateContinuitySummary({
                sameHerSummary: hostVisibleProjectStateAudit.sameHerSummary,
                sameHerHoldDetail: hostVisibleProjectStateAudit.sameHerHoldDetail,
                continuityArcStage: hostVisibleProjectStateAudit.continuityArcStage,
                sameHerDriftRiskSummary: hostVisibleProjectStateAudit.sameHerDriftRiskSummary,
                currentPhaseSummary: hostVisibleProjectStateAudit.currentPhaseSummary,
                landedProgressSummary: hostVisibleProjectStateAudit.landedProgressSummary ?? null,
                openClosureSummary: hostVisibleProjectStateAudit.openClosureSummary ?? null,
                nextClosureTargetSummary: hostVisibleProjectStateAudit.nextClosureTargetSummary,
                emotionalClosureSummary: hostVisibleProjectStateAudit.emotionalClosureSummary,
                embodimentClosureSummary: callbackPersistenceHostVisibleEmbodimentClosureSummary,
              }),
            }
          : {}),
        preDialogueAwarenessSummary: callbackPersistenceAwarenessSummary,
      } as NonNullable<typeof callbackVisibleUtterance.visibleReplyRealization.projectStateAudit>
      const callbackPersistenceVisibleReplyRealization = {
        ...callbackVisibleUtterance.visibleReplyRealization,
        projectStateAudit: callbackPersistenceHostVisibleProjectStateAudit,
      } as typeof callbackVisibleUtterance.visibleReplyRealization
      const callbackPersistenceStructuredVisibleReplyRealization
        = callbackVisibleUtterance.structuredForPersistence?.visibleReplyRealization
          ? {
              ...callbackVisibleUtterance.structuredForPersistence.visibleReplyRealization,
              projectStateAudit: callbackPersistenceStructuredProjectStateAudit,
            } as typeof callbackVisibleUtterance.structuredForPersistence.visibleReplyRealization
          : callbackVisibleUtterance.structuredForPersistence?.visibleReplyRealization

      const persisted = await options.appendConversationTurnWithGuards({
        turnId: firedTurnId,
        sessionId: pendingDelivery.sessionId,
        assistantText: callbackVisibleUtterance.assistantText,
        structured: callbackVisibleUtterance.structuredForPersistence
          ? {
              ...callbackVisibleUtterance.structuredForPersistence,
              projectState: persistedCallbackProjectState,
              visibleReplyRealization: callbackPersistenceStructuredVisibleReplyRealization,
              turnGraph: callbackTurnGraph,
            }
          : callbackVisibleUtterance.structuredForPersistence,
        origin: resolveAlicizationAutonomousDialogueOrigin('proactive'),
        createdAt: Date.now(),
        visibleReplyRealization: callbackPersistenceVisibleReplyRealization,
        turnRuntimeContext: callbackTurnRuntimeContext,
        onPersisted: async () => {
          turnRuntime.settleDelivery({
            context: callbackTurnRuntimeContext,
            surface: callbackVisibleReplySurface,
          })
        },
      })
      if (!persisted) {
        options.executionDeliveryRuntime.requeue(pendingDelivery)
        await options.persistExecutionDeliveryState(options.getActiveCardId())
        options.queueSubconsciousWake(options.getActiveCardId(), `execution-delivery-retry:${pendingDelivery.threadId}`, 1_500)
        await options.appendAuditLog({
          level: 'warning',
          category: 'alicization.executor.delivery',
          action: 'requeued',
          message: 'Execution callback delivery was deferred because the runtime skipped turn persistence.',
          payload: {
            trigger,
            threadId: pendingDelivery.threadId,
            sessionId: pendingDelivery.sessionId,
            status: pendingDelivery.status,
          },
        })
        return false
      }

      options.executionDeliveryRuntime.markDelivered(pendingDelivery)
      options.executionCallbackRuntime.markSurfaced({
        sessionId: pendingDelivery.sessionId,
        createdAt: pendingDelivery.completedAt,
      })
      await options.persistExecutionDeliveryState(options.getActiveCardId())
      options.syncAgentTurnSessionMirror({
        agentTurn,
        cardId: options.getActiveCardId(),
        decisionTraceId: pendingDelivery.decisionTraceId,
        sessionId: pendingDelivery.sessionId,
        source: 'execution-callback',
      })
      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.executor.delivery',
        action: 'delivered',
        message: 'Delivered a settled task-thread callback through the subconscious runtime.',
        payload: {
          trigger,
          threadId: pendingDelivery.threadId,
          sessionId: pendingDelivery.sessionId,
          status: pendingDelivery.status,
          channel: pendingDelivery.channel,
          source: deliverySource,
          surfaceReason: selectedReply.reason ?? null,
          firedTurnId,
          format: structured.format,
          agentRuntime: options.buildAgentRuntimeAuditSnapshot(agentTurn),
        },
      })
      return true
    }
    catch (error) {
      options.executionDeliveryRuntime.requeue(pendingDelivery)
      await options.persistExecutionDeliveryState(options.getActiveCardId())
      options.queueSubconsciousWake(options.getActiveCardId(), `execution-delivery-error:${pendingDelivery.threadId}`, 2_500)
      await options.appendAuditLog({
        level: 'warning',
        category: 'alicization.executor.delivery',
        action: 'delivery-failed',
        message: 'Execution callback delivery failed and was requeued for another subconscious attempt.',
        payload: {
          trigger,
          threadId: pendingDelivery.threadId,
          sessionId: pendingDelivery.sessionId,
          status: pendingDelivery.status,
          reason: options.errorMessageFrom(error) ?? 'unknown-error',
        },
      })
      return false
    }
  }

  return {
    processDueRemindersForCurrentCard,
    processPendingExecutionDeliveriesForCurrentCard,
  }
}
