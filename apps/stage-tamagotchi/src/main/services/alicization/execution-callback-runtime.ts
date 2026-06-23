import type {
  AlicizationExecutionEventRecord,
  AlicizationListExecutionEventsInput,
  AlicizationListTaskThreadsInput,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionActionInput,
  AlicizationAgentSessionContinuityInput,
} from './agent-runtime'

import {
  alicizationTerminalTaskThreadStatuses,
  readExecutionOutcome,
  readLatestExecutionEvent,
  readTaskThreadActivityAt,
  sanitizeExecutionLedgerText,
} from './execution-ledger-shared'
import {
  buildAlicizationProjectPreDialogueAwarenessLine,
  isAlicizationThinProjectAwarenessLine,
  isAlicizationThinSamePhaseCarryLine,
  looksLikeThinProjectClosureShell,
  preferStrongerPersistedSameHerSelfLine,
  preferStrongerSameHerDriftRisk,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'

export interface AlicizationExecutionCallbackContext {
  actions: AlicizationAgentSessionActionInput[]
  callbacks: AlicizationExecutionCallbackDigest[]
  continuitySignals: AlicizationAgentSessionContinuityInput[]
  recallText: string
  systemBlock: string
}

export interface AlicizationExecutionCallbackDigest {
  channel: string
  createdAt: number
  decisionTraceId: string | null
  goal: string
  outcome: string
  sessionId: string | null
  status: string
  summary: string
  threadId: string
  turnId: string | null
}

interface AlicizationExecutionCallbackSafetyGateDigest {
  auditability: string | null
  confirmationRequired: boolean | null
  effect: string | null
  interruptibility: string | null
  permissionMode: string | null
  riskPolicy: string | null
}

interface AlicizationExecutionCallbackResumeConfirmationDigest {
  affirmationReasonCodes: string[]
  approval: string | null
  auditability: string | null
  confirmationBoundary: string | null
  effect: string | null
  interruptibility: string | null
  permissionMode: string | null
  previousPermissionMode: string | null
  previousStatus: string | null
  resumedStatus: string | null
  riskBudget: string | null
}

export const emptyAlicizationExecutionCallbackContext: AlicizationExecutionCallbackContext = {
  actions: [],
  callbacks: [],
  continuitySignals: [],
  recallText: '',
  systemBlock: '',
}

interface AlicizationExecutionCallbackRuntimeOptions {
  getNow?: () => number
  listExecutionEvents: (input?: AlicizationListExecutionEventsInput) => Promise<AlicizationExecutionEventRecord[]>
  listTaskThreads: (input?: AlicizationListTaskThreadsInput) => Promise<AlicizationTaskThreadRecord[]>
  projectBriefing?: {
    identity?: string | null
    currentPhase?: string | null
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
    preDialogueAwarenessSummary?: string | null
    companionBriefingLine?: string | null
    emotionalClosureSummary?: string | null
    continuityArcStage?: string | null
    continuityRestraint?: string | null
    continuityCue?: string | null
    continuityPreferredTiming?: string | null
    continuityCadence?: string | null
    preferredBlinkCadence?: string | null
    preferredGazeMode?: string | null
    preferredPauseMode?: string | null
    preferredLipsyncMode?: string | null
    preferredVoiceMode?: string | null
    preferredPacingMode?: string | null
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
    sameHerDriftRiskSummary?: string | null
    proactiveSameHerGap?: string | null
  } | null
  maxPendingCallbacks?: number
  maxThreadAgeMs?: number
}

type AlicizationExecutionCallbackProjectBriefing = NonNullable<AlicizationExecutionCallbackRuntimeOptions['projectBriefing']>

interface AlicizationExecutionCallbackProjectCarryDetails {
  companionBriefingLine: string | null
  emotionalClosureSummary: string | null
  continuityArcStage: string | null
  continuityRestraint: string | null
  continuityCue: string | null
  continuityPreferredTiming: string | null
  continuityCadence: string | null
  preferredBlinkCadence: string | null
  preferredGazeMode: string | null
  preferredPauseMode: string | null
  preferredLipsyncMode: string | null
  preferredVoiceMode: string | null
  preferredPacingMode: string | null
  sameHerHoldDetail: string | null
  proactiveSameHerGap: string | null
}

interface AlicizationExecutionCallbackItem {
  action: AlicizationAgentSessionActionInput
  channel: string
  createdAt: number
  digest: AlicizationExecutionCallbackDigest
  goal: string
  outcome: string
  projectBriefing: AlicizationExecutionCallbackProjectBriefing | null
  resumeConfirmation: AlicizationExecutionCallbackResumeConfirmationDigest | null
  resumeConfirmationSummary: string
  safetyGate: AlicizationExecutionCallbackSafetyGateDigest | null
  safetyGateSummary: string
  status: string
  summary: string
  thread: AlicizationTaskThreadRecord
}

const defaultMaxPendingCallbacks = 3
const defaultMaxThreadAgeMs = 20 * 60_000

function normalizeCallbackStatus(status: AlicizationTaskThreadRecord['status']) {
  return status === 'completed' ? 'completed' : 'failed'
}

function buildCallbackLabel(thread: AlicizationTaskThreadRecord) {
  const channel = sanitizeExecutionLedgerText(thread.selectedChannel ?? thread.proposedChannel ?? 'executor', 48) || 'executor'
  return `callback:${channel}`
}

function buildCallbackSummary(input: {
  thread: AlicizationTaskThreadRecord
  outcome: string
}) {
  const goal = sanitizeExecutionLedgerText(input.thread.goal, 120) || 'the current task'
  const summary = sanitizeExecutionLedgerText(input.thread.summary, 160)
  const statusLead = input.thread.status === 'completed'
    ? 'Completed'
    : input.thread.status === 'cancelled'
      ? 'Cancelled'
      : input.thread.status === 'blocked'
        ? 'Blocked'
        : 'Failed'
  const detail = input.outcome || summary
  return detail
    ? `${statusLead} ${goal}: ${detail}`
    : `${statusLead} ${goal}.`
}

function readPayloadObject(payload: unknown) {
  return payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null
}

function readBooleanOrNull(raw: unknown) {
  if (raw === true || raw === false)
    return raw
  return null
}

function readStringArray(raw: unknown) {
  if (!Array.isArray(raw))
    return []
  return raw
    .map(value => sanitizeExecutionLedgerText(value, 80))
    .filter(Boolean)
}

function readExecutionCallbackSafetyGate(events: AlicizationExecutionEventRecord[]): AlicizationExecutionCallbackSafetyGateDigest | null {
  const latestEvent = readLatestExecutionEvent(events)
  const payload = readPayloadObject(latestEvent?.payload)
  const safetyGate = readPayloadObject(payload?.safetyGate)
  if (!safetyGate)
    return null

  const digest: AlicizationExecutionCallbackSafetyGateDigest = {
    auditability: sanitizeExecutionLedgerText(safetyGate.auditability, 80) || null,
    confirmationRequired: readBooleanOrNull(safetyGate.confirmationRequired),
    effect: sanitizeExecutionLedgerText(safetyGate.effect, 80) || null,
    interruptibility: sanitizeExecutionLedgerText(safetyGate.interruptibility, 80) || null,
    permissionMode: sanitizeExecutionLedgerText(safetyGate.permissionMode, 80) || null,
    riskPolicy: sanitizeExecutionLedgerText(safetyGate.riskPolicy, 120) || null,
  }

  if (
    !digest.auditability
    && digest.confirmationRequired === null
    && !digest.effect
    && !digest.interruptibility
    && !digest.permissionMode
    && !digest.riskPolicy
  ) {
    return null
  }

  return digest
}

function buildExecutionCallbackSafetyGateSummary(safetyGate: AlicizationExecutionCallbackSafetyGateDigest | null) {
  if (!safetyGate)
    return ''

  return [
    safetyGate.effect ? `effect=${safetyGate.effect}` : '',
    safetyGate.permissionMode ? `permission=${safetyGate.permissionMode}` : '',
    safetyGate.confirmationRequired === true
      ? 'confirmation=required'
      : safetyGate.confirmationRequired === false
        ? 'confirmation=not-required'
        : '',
    safetyGate.riskPolicy ? `risk=${safetyGate.riskPolicy}` : '',
    safetyGate.auditability ? `audit=${safetyGate.auditability}` : '',
    safetyGate.interruptibility ? `interrupt=${safetyGate.interruptibility}` : '',
  ].filter(Boolean).join(' ')
}

function readExecutionCallbackResumeConfirmation(
  events: AlicizationExecutionEventRecord[],
): AlicizationExecutionCallbackResumeConfirmationDigest | null {
  const latestResumeEvent = readLatestExecutionEvent(events, ['resume'])
  const payload = readPayloadObject(latestResumeEvent?.payload)
  if (!payload)
    return null

  const digest: AlicizationExecutionCallbackResumeConfirmationDigest = {
    affirmationReasonCodes: readStringArray(payload.affirmationReasonCodes),
    approval: sanitizeExecutionLedgerText(payload.approval, 80) || null,
    auditability: sanitizeExecutionLedgerText(payload.auditability, 80) || null,
    confirmationBoundary: sanitizeExecutionLedgerText(payload.confirmationBoundary, 120) || null,
    effect: sanitizeExecutionLedgerText(payload.effect, 80) || null,
    interruptibility: sanitizeExecutionLedgerText(payload.interruptibility, 80) || null,
    permissionMode: sanitizeExecutionLedgerText(payload.permissionMode, 80) || null,
    previousPermissionMode: sanitizeExecutionLedgerText(payload.previousPermissionMode, 80) || null,
    previousStatus: sanitizeExecutionLedgerText(payload.previousStatus, 80) || null,
    resumedStatus: sanitizeExecutionLedgerText(payload.resumedStatus, 80) || null,
    riskBudget: sanitizeExecutionLedgerText(payload.riskBudget, 80) || null,
  }

  if (
    !digest.approval
    && !digest.auditability
    && !digest.confirmationBoundary
    && !digest.effect
    && !digest.interruptibility
    && !digest.permissionMode
    && !digest.previousPermissionMode
    && !digest.previousStatus
    && !digest.resumedStatus
    && !digest.riskBudget
    && digest.affirmationReasonCodes.length === 0
  ) {
    return null
  }

  return digest
}

function buildExecutionCallbackResumeConfirmationSummary(
  resumeConfirmation: AlicizationExecutionCallbackResumeConfirmationDigest | null,
) {
  if (!resumeConfirmation)
    return ''

  return [
    resumeConfirmation.approval ? `approval=${resumeConfirmation.approval}` : '',
    resumeConfirmation.previousStatus ? `previous=${resumeConfirmation.previousStatus}` : '',
    resumeConfirmation.resumedStatus ? `resumed=${resumeConfirmation.resumedStatus}` : '',
    resumeConfirmation.previousPermissionMode ? `previousPermission=${resumeConfirmation.previousPermissionMode}` : '',
    resumeConfirmation.permissionMode ? `permission=${resumeConfirmation.permissionMode}` : '',
    resumeConfirmation.effect ? `effect=${resumeConfirmation.effect}` : '',
    resumeConfirmation.riskBudget ? `risk=${resumeConfirmation.riskBudget}` : '',
    resumeConfirmation.confirmationBoundary ? `confirmation=${resumeConfirmation.confirmationBoundary}` : '',
    resumeConfirmation.auditability ? `audit=${resumeConfirmation.auditability}` : '',
    resumeConfirmation.interruptibility ? `interrupt=${resumeConfirmation.interruptibility}` : '',
    resumeConfirmation.affirmationReasonCodes.length > 0
      ? `affirmation=${resumeConfirmation.affirmationReasonCodes.join(',')}`
      : '',
  ].filter(Boolean).join(' ')
}

function normalizeExecutionCallbackProjectBriefing(
  projectBriefing: unknown,
): AlicizationExecutionCallbackProjectBriefing | null {
  if (!projectBriefing || typeof projectBriefing !== 'object' || Array.isArray(projectBriefing))
    return null

  const projectBriefingRecord = projectBriefing as Partial<Record<keyof AlicizationExecutionCallbackProjectBriefing, unknown>>

  const normalized = {
    identity: sanitizeExecutionLedgerText(projectBriefingRecord.identity, 220) || null,
    currentPhase: sanitizeExecutionLedgerText(projectBriefingRecord.currentPhase, 220) || null,
    preflightSummary: sanitizeExecutionLedgerText(projectBriefingRecord.preflightSummary, 320) || null,
    preDialogueAwarenessLine: sanitizeExecutionLedgerText(projectBriefingRecord.preDialogueAwarenessLine, 320) || null,
    preDialogueAwarenessSummary: sanitizeExecutionLedgerText(projectBriefingRecord.preDialogueAwarenessSummary, 320) || null,
    companionBriefingLine: sanitizeExecutionLedgerText(projectBriefingRecord.companionBriefingLine, 320) || null,
    emotionalClosureSummary: sanitizeExecutionLedgerText(projectBriefingRecord.emotionalClosureSummary, 220) || null,
    continuityArcStage: sanitizeExecutionLedgerText(projectBriefingRecord.continuityArcStage, 120) || null,
    continuityRestraint: sanitizeExecutionLedgerText(projectBriefingRecord.continuityRestraint, 64) || null,
    continuityCue: sanitizeExecutionLedgerText(projectBriefingRecord.continuityCue, 220) || null,
    continuityPreferredTiming: sanitizeExecutionLedgerText(projectBriefingRecord.continuityPreferredTiming, 120) || null,
    continuityCadence: sanitizeExecutionLedgerText(projectBriefingRecord.continuityCadence, 120) || null,
    preferredBlinkCadence: sanitizeExecutionLedgerText(projectBriefingRecord.preferredBlinkCadence, 32) || null,
    preferredGazeMode: sanitizeExecutionLedgerText(projectBriefingRecord.preferredGazeMode, 32) || null,
    preferredPauseMode: sanitizeExecutionLedgerText(projectBriefingRecord.preferredPauseMode, 32) || null,
    preferredLipsyncMode: sanitizeExecutionLedgerText(projectBriefingRecord.preferredLipsyncMode, 32) || null,
    preferredVoiceMode: sanitizeExecutionLedgerText(projectBriefingRecord.preferredVoiceMode, 32) || null,
    preferredPacingMode: sanitizeExecutionLedgerText(projectBriefingRecord.preferredPacingMode, 32) || null,
    latestLandedProgress: sanitizeExecutionLedgerText(projectBriefingRecord.latestLandedProgress, 320) || null,
    latestProgress: sanitizeExecutionLedgerText(projectBriefingRecord.latestProgress, 320) || null,
    landedProgressSummary: sanitizeExecutionLedgerText(projectBriefingRecord.landedProgressSummary, 320) || null,
    primaryOpenLoop: sanitizeExecutionLedgerText(projectBriefingRecord.primaryOpenLoop, 320) || null,
    openClosureSummary: sanitizeExecutionLedgerText(projectBriefingRecord.openClosureSummary, 320) || null,
    nextClosureTarget: sanitizeExecutionLedgerText(projectBriefingRecord.nextClosureTarget, 320) || null,
    nextClosureTargetSummary: sanitizeExecutionLedgerText(projectBriefingRecord.nextClosureTargetSummary, 320) || null,
    sameHerSelfLine: sanitizeExecutionLedgerText(projectBriefingRecord.sameHerSelfLine, 220) || null,
    sameHerHoldDetail: sanitizeExecutionLedgerText(projectBriefingRecord.sameHerHoldDetail, 320) || null,
    sameHerDriftRisk: sanitizeExecutionLedgerText(projectBriefingRecord.sameHerDriftRisk, 320) || null,
    sameHerDriftRiskSummary: sanitizeExecutionLedgerText(projectBriefingRecord.sameHerDriftRiskSummary, 320) || null,
    proactiveSameHerGap: sanitizeExecutionLedgerText(projectBriefingRecord.proactiveSameHerGap, 320) || null,
  } satisfies AlicizationExecutionCallbackProjectBriefing

  return Object.values(normalized).some(Boolean) ? normalized : null
}

function looksLikeThinExecutionCallbackProjectIdentity(value: string | null | undefined) {
  const normalized = sanitizeExecutionLedgerText(value, 220)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  return normalized === 'project'
    || normalized === 'digital life'
    || normalized === 'same digital life'
    || normalized === 'same digital life project'
    || normalized === 'this local-first digital life project'
    || (!normalized.includes('alicization') && !normalized.includes('local-first digital life'))
}

function looksLikeThinExecutionCallbackProjectPhase(value: string | null | undefined) {
  const normalized = sanitizeExecutionLedgerText(value, 220)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  return normalized === 'phase 1'
    || normalized === 'phase i'
    || !normalized.includes('phase 1')
}

function looksLikeThinExecutionCallbackProjectPreflight(value: string | null | undefined) {
  const normalized = sanitizeExecutionLedgerText(value, 320)?.toLowerCase() ?? ''
  if (!normalized)
    return true

  return normalized === 'project'
    || normalized === 'phase 1'
    || isAlicizationThinProjectAwarenessLine(normalized)
    || /^identity=|^open=|^next=/u.test(normalized)
}

function looksLikeThinExecutionCallbackProjectAwareness(value: string | null | undefined) {
  const normalized = sanitizeExecutionLedgerText(value, 320) ?? ''
  if (!normalized)
    return true

  const lowered = normalized.toLowerCase()
  return isAlicizationThinProjectAwarenessLine(normalized)
    || lowered === 'same digital life'
    || lowered === 'same digital life project'
    || lowered === 'same digital life | keep the closure seam explicit'
    || (!/alicization|local-first digital life|phase 1|same living line|continuous her|one living her/u.test(lowered))
}

function preferExecutionCallbackProjectBriefingText(input: {
  candidate?: string | null
  current?: string | null
  isThin?: (value: string | null | undefined) => boolean
}) {
  const current = sanitizeExecutionLedgerText(input.current, 320) || ''
  const candidate = sanitizeExecutionLedgerText(input.candidate, 320) || ''

  if (!current)
    return candidate || null
  if (!candidate)
    return current || null
  if (current === candidate)
    return current

  const isThin = input.isThin
  if (isThin) {
    const currentThin = isThin(current)
    const candidateThin = isThin(candidate)
    if (currentThin && !candidateThin)
      return candidate
    if (candidateThin && !currentThin)
      return current
  }

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function mergeExecutionCallbackProjectBriefingPair(input: {
  candidate: AlicizationExecutionCallbackProjectBriefing
  current: AlicizationExecutionCallbackProjectBriefing
}): AlicizationExecutionCallbackProjectBriefing {
  return {
    identity: preferExecutionCallbackProjectBriefingText({
      current: input.current.identity,
      candidate: input.candidate.identity,
      isThin: looksLikeThinExecutionCallbackProjectIdentity,
    }),
    currentPhase: preferExecutionCallbackProjectBriefingText({
      current: input.current.currentPhase,
      candidate: input.candidate.currentPhase,
      isThin: looksLikeThinExecutionCallbackProjectPhase,
    }),
    preflightSummary: preferExecutionCallbackProjectBriefingText({
      current: input.current.preflightSummary,
      candidate: input.candidate.preflightSummary,
      isThin: looksLikeThinExecutionCallbackProjectPreflight,
    }),
    preDialogueAwarenessLine: preferExecutionCallbackProjectBriefingText({
      current: input.current.preDialogueAwarenessLine,
      candidate: input.candidate.preDialogueAwarenessLine,
      isThin: looksLikeThinExecutionCallbackProjectAwareness,
    }),
    preDialogueAwarenessSummary: preferExecutionCallbackProjectBriefingText({
      current: input.current.preDialogueAwarenessSummary,
      candidate: input.candidate.preDialogueAwarenessSummary,
      isThin: looksLikeThinExecutionCallbackProjectAwareness,
    }),
    companionBriefingLine: preferExecutionCallbackProjectBriefingText({
      current: input.current.companionBriefingLine,
      candidate: input.candidate.companionBriefingLine,
      isThin: looksLikeThinExecutionCallbackProjectAwareness,
    }),
    emotionalClosureSummary: preferExecutionCallbackProjectBriefingText({
      current: input.current.emotionalClosureSummary,
      candidate: input.candidate.emotionalClosureSummary,
    }),
    continuityArcStage: preferExecutionCallbackProjectBriefingText({
      current: input.current.continuityArcStage,
      candidate: input.candidate.continuityArcStage,
    }),
    continuityRestraint: preferExecutionCallbackProjectBriefingText({
      current: input.current.continuityRestraint,
      candidate: input.candidate.continuityRestraint,
    }),
    continuityCue: preferExecutionCallbackProjectBriefingText({
      current: input.current.continuityCue,
      candidate: input.candidate.continuityCue,
    }),
    continuityPreferredTiming: preferExecutionCallbackProjectBriefingText({
      current: input.current.continuityPreferredTiming,
      candidate: input.candidate.continuityPreferredTiming,
    }),
    continuityCadence: preferExecutionCallbackProjectBriefingText({
      current: input.current.continuityCadence,
      candidate: input.candidate.continuityCadence,
    }),
    preferredBlinkCadence: preferExecutionCallbackProjectBriefingText({
      current: input.current.preferredBlinkCadence,
      candidate: input.candidate.preferredBlinkCadence,
    }),
    preferredGazeMode: preferExecutionCallbackProjectBriefingText({
      current: input.current.preferredGazeMode,
      candidate: input.candidate.preferredGazeMode,
    }),
    preferredPauseMode: preferExecutionCallbackProjectBriefingText({
      current: input.current.preferredPauseMode,
      candidate: input.candidate.preferredPauseMode,
    }),
    preferredLipsyncMode: preferExecutionCallbackProjectBriefingText({
      current: input.current.preferredLipsyncMode,
      candidate: input.candidate.preferredLipsyncMode,
    }),
    preferredVoiceMode: preferExecutionCallbackProjectBriefingText({
      current: input.current.preferredVoiceMode,
      candidate: input.candidate.preferredVoiceMode,
    }),
    preferredPacingMode: preferExecutionCallbackProjectBriefingText({
      current: input.current.preferredPacingMode,
      candidate: input.candidate.preferredPacingMode,
    }),
    latestLandedProgress: preferExecutionCallbackProjectBriefingText({
      current: input.current.latestLandedProgress,
      candidate: input.candidate.latestLandedProgress,
      isThin: value => looksLikeThinProjectClosureShell(value, 'landed'),
    }),
    latestProgress: preferExecutionCallbackProjectBriefingText({
      current: input.current.latestProgress,
      candidate: input.candidate.latestProgress,
      isThin: value => looksLikeThinProjectClosureShell(value, 'landed'),
    }),
    landedProgressSummary: preferExecutionCallbackProjectBriefingText({
      current: input.current.landedProgressSummary,
      candidate: input.candidate.landedProgressSummary,
      isThin: value => looksLikeThinProjectClosureShell(value, 'landed'),
    }),
    primaryOpenLoop: preferExecutionCallbackProjectBriefingText({
      current: input.current.primaryOpenLoop,
      candidate: input.candidate.primaryOpenLoop,
      isThin: value => looksLikeThinProjectClosureShell(value, 'open'),
    }),
    openClosureSummary: preferExecutionCallbackProjectBriefingText({
      current: input.current.openClosureSummary,
      candidate: input.candidate.openClosureSummary,
      isThin: value => looksLikeThinProjectClosureShell(value, 'open'),
    }),
    nextClosureTarget: preferExecutionCallbackProjectBriefingText({
      current: input.current.nextClosureTarget,
      candidate: input.candidate.nextClosureTarget,
      isThin: value => looksLikeThinProjectClosureShell(value, 'next'),
    }),
    nextClosureTargetSummary: preferExecutionCallbackProjectBriefingText({
      current: input.current.nextClosureTargetSummary,
      candidate: input.candidate.nextClosureTargetSummary,
      isThin: value => looksLikeThinProjectClosureShell(value, 'next'),
    }),
    sameHerSelfLine: preferStrongerPersistedSameHerSelfLine({
      current: input.current.sameHerSelfLine,
      candidate: input.candidate.sameHerSelfLine,
    }) || null,
    sameHerHoldDetail: preferExecutionCallbackProjectBriefingText({
      current: input.current.sameHerHoldDetail,
      candidate: input.candidate.sameHerHoldDetail,
    }),
    sameHerDriftRisk: preferStrongerSameHerDriftRisk({
      current: input.current.sameHerDriftRisk,
      candidate: input.candidate.sameHerDriftRisk,
    }) || null,
    sameHerDriftRiskSummary: preferStrongerSameHerDriftRisk({
      current: input.current.sameHerDriftRiskSummary,
      candidate: input.candidate.sameHerDriftRiskSummary,
    }) || null,
    proactiveSameHerGap: preferExecutionCallbackProjectBriefingText({
      current: input.current.proactiveSameHerGap,
      candidate: input.candidate.proactiveSameHerGap,
    }),
  }
}

function mergeExecutionCallbackProjectBriefings(
  ...briefings: Array<AlicizationExecutionCallbackProjectBriefing | null | undefined>
): AlicizationExecutionCallbackProjectBriefing | null {
  let merged: AlicizationExecutionCallbackProjectBriefing | null = null

  for (const briefing of briefings) {
    if (!briefing)
      continue
    merged = merged
      ? mergeExecutionCallbackProjectBriefingPair({
          current: merged,
          candidate: briefing,
        })
      : briefing
  }

  if (!merged)
    return null

  return Object.values(merged).some(Boolean) ? merged : null
}

function readExecutionCallbackProjectBriefingFromEvents(
  events: AlicizationExecutionEventRecord[],
): AlicizationExecutionCallbackProjectBriefing | null {
  const latestEvent = readLatestExecutionEvent(events)
  const payload = readPayloadObject(latestEvent?.payload)
  const runtimeContext = readPayloadObject(payload?.runtimeContext)
  return normalizeExecutionCallbackProjectBriefing(runtimeContext?.projectBriefing)
}

function readExecutionCallbackProjectBriefingFromResumeEvents(
  events: AlicizationExecutionEventRecord[],
): AlicizationExecutionCallbackProjectBriefing | null {
  const latestResumeEvent = readLatestExecutionEvent(events, ['resume'])
  const payload = readPayloadObject(latestResumeEvent?.payload)
  if (!payload)
    return null

  return normalizeExecutionCallbackProjectBriefing({
    identity: payload.projectIdentity,
    currentPhase: payload.projectPhase,
    latestLandedProgress: payload.latestLandedProgress,
    primaryOpenLoop: payload.primaryOpenLoop,
    nextClosureTarget: payload.nextClosureTarget,
    sameHerSelfLine: payload.sameHerLine,
    sameHerHoldDetail: payload.projectSameHerHoldDetail,
    sameHerDriftRisk: payload.sameHerDriftRisk,
    proactiveSameHerGap: payload.proactiveSameHerGap,
    preflightSummary: payload.projectPreflight,
    preDialogueAwarenessLine: payload.projectAwareness,
    companionBriefingLine: payload.projectCompanionBriefing,
    emotionalClosureSummary: payload.projectEmotionalClosure,
    continuityArcStage: payload.projectContinuityArcStage,
    continuityRestraint: payload.projectContinuityRestraint,
    continuityCue: payload.projectContinuityCue,
    continuityPreferredTiming: payload.projectContinuityPreferredTiming,
    continuityCadence: payload.projectContinuityCadence,
    preferredBlinkCadence: payload.projectBlinkCadence,
    preferredGazeMode: payload.projectGazeMode,
    preferredPauseMode: payload.projectPauseMode,
    preferredLipsyncMode: payload.projectLipsyncMode,
    preferredVoiceMode: payload.projectVoiceMode,
    preferredPacingMode: payload.projectPacingMode,
  })
}

function buildExecutionCallbackProjectCarryDetails(
  projectBriefing?: AlicizationExecutionCallbackRuntimeOptions['projectBriefing'],
): AlicizationExecutionCallbackProjectCarryDetails | null {
  if (!projectBriefing)
    return null

  const projectStateSnapshot = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: projectBriefing.identity ?? null,
      currentPhase: projectBriefing.currentPhase ?? null,
      latestLandedProgress: projectBriefing.latestLandedProgress ?? projectBriefing.latestProgress ?? projectBriefing.landedProgressSummary ?? null,
      primaryOpenLoop: projectBriefing.primaryOpenLoop ?? projectBriefing.openClosureSummary ?? null,
      nextClosureTarget: projectBriefing.nextClosureTarget ?? projectBriefing.nextClosureTargetSummary ?? null,
      sameHerSelfLine: projectBriefing.sameHerSelfLine ?? null,
      sameHerHoldDetail: projectBriefing.sameHerHoldDetail ?? null,
      sameHerDriftRisk: projectBriefing.sameHerDriftRisk ?? projectBriefing.sameHerDriftRiskSummary ?? null,
      proactiveSameHerGap: projectBriefing.proactiveSameHerGap ?? null,
      preflightSummary: projectBriefing.preflightSummary ?? null,
      preDialogueAwarenessLine: projectBriefing.preDialogueAwarenessLine ?? null,
      preDialogueAwarenessSummary: projectBriefing.preDialogueAwarenessSummary ?? null,
      companionBriefingLine: projectBriefing.companionBriefingLine ?? null,
      emotionalClosureSummary: projectBriefing.emotionalClosureSummary ?? null,
      continuityArcStage: projectBriefing.continuityArcStage ?? null,
      continuityRestraint: projectBriefing.continuityRestraint ?? null,
      continuityCue: projectBriefing.continuityCue ?? null,
      continuityPreferredTiming: projectBriefing.continuityPreferredTiming ?? null,
      continuityCadence: projectBriefing.continuityCadence ?? null,
      preferredBlinkCadence: projectBriefing.preferredBlinkCadence ?? null,
      preferredGazeMode: projectBriefing.preferredGazeMode ?? null,
      preferredPauseMode: projectBriefing.preferredPauseMode ?? null,
      preferredLipsyncMode: projectBriefing.preferredLipsyncMode ?? null,
      preferredVoiceMode: projectBriefing.preferredVoiceMode ?? null,
      preferredPacingMode: projectBriefing.preferredPacingMode ?? null,
    },
  })

  const details = {
    companionBriefingLine: sanitizeExecutionLedgerText(projectStateSnapshot.companionBriefingLine ?? projectBriefing.companionBriefingLine, 320) || null,
    emotionalClosureSummary: sanitizeExecutionLedgerText(projectStateSnapshot.emotionalClosureSummary ?? projectBriefing.emotionalClosureSummary, 220) || null,
    continuityArcStage: sanitizeExecutionLedgerText(projectStateSnapshot.continuityArcStage ?? projectBriefing.continuityArcStage, 120) || null,
    continuityRestraint: sanitizeExecutionLedgerText(projectStateSnapshot.continuityRestraint ?? projectBriefing.continuityRestraint, 64) || null,
    continuityCue: sanitizeExecutionLedgerText(projectStateSnapshot.continuityCue ?? projectBriefing.continuityCue, 220) || null,
    continuityPreferredTiming: sanitizeExecutionLedgerText(projectStateSnapshot.continuityPreferredTiming ?? projectBriefing.continuityPreferredTiming, 120) || null,
    continuityCadence: sanitizeExecutionLedgerText(projectStateSnapshot.continuityCadence ?? projectBriefing.continuityCadence, 120) || null,
    preferredBlinkCadence: sanitizeExecutionLedgerText(projectStateSnapshot.preferredBlinkCadence ?? projectBriefing.preferredBlinkCadence, 32) || null,
    preferredGazeMode: sanitizeExecutionLedgerText(projectStateSnapshot.preferredGazeMode ?? projectBriefing.preferredGazeMode, 32) || null,
    preferredPauseMode: sanitizeExecutionLedgerText(projectStateSnapshot.preferredPauseMode ?? projectBriefing.preferredPauseMode, 32) || null,
    preferredLipsyncMode: sanitizeExecutionLedgerText(projectStateSnapshot.preferredLipsyncMode ?? projectBriefing.preferredLipsyncMode, 32) || null,
    preferredVoiceMode: sanitizeExecutionLedgerText(projectStateSnapshot.preferredVoiceMode ?? projectBriefing.preferredVoiceMode, 32) || null,
    preferredPacingMode: sanitizeExecutionLedgerText(projectStateSnapshot.preferredPacingMode ?? projectBriefing.preferredPacingMode, 32) || null,
    sameHerHoldDetail: sanitizeExecutionLedgerText(projectBriefing.sameHerHoldDetail ?? projectStateSnapshot.sameHerHoldDetail, 320) || null,
    proactiveSameHerGap: sanitizeExecutionLedgerText(projectStateSnapshot.proactiveSameHerGap ?? projectBriefing.proactiveSameHerGap, 320) || null,
  } satisfies AlicizationExecutionCallbackProjectCarryDetails

  return Object.values(details).some(Boolean) ? details : null
}

function buildCallbackItem(input: {
  events: AlicizationExecutionEventRecord[]
  thread: AlicizationTaskThreadRecord
}): AlicizationExecutionCallbackItem {
  const latestEvent = readLatestExecutionEvent(input.events)
  const outcome = readExecutionOutcome(input.events)
  const summary = buildCallbackSummary({
    thread: input.thread,
    outcome,
  })
  const safetyGate = readExecutionCallbackSafetyGate(input.events)
  const safetyGateSummary = buildExecutionCallbackSafetyGateSummary(safetyGate)
  const resumeConfirmation = readExecutionCallbackResumeConfirmation(input.events)
  const resumeConfirmationSummary = buildExecutionCallbackResumeConfirmationSummary(resumeConfirmation)
  const channel = sanitizeExecutionLedgerText(input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'unknown', 48) || 'unknown'
  const goal = sanitizeExecutionLedgerText(input.thread.goal, 140) || 'the current task'
  const createdAt = Number.isFinite(latestEvent?.createdAt)
    ? Number(latestEvent?.createdAt)
    : readTaskThreadActivityAt(input.thread)
  const signature = sanitizeExecutionLedgerText(
    `${input.thread.id}:${latestEvent?.id ?? createdAt}`,
    220,
  )
  const projectBriefing = mergeExecutionCallbackProjectBriefings(
    readExecutionCallbackProjectBriefingFromEvents(input.events),
    readExecutionCallbackProjectBriefingFromResumeEvents(input.events),
    readExecutionCallbackProjectBriefing(input.thread),
  )

  return {
    channel,
    createdAt,
    digest: {
      channel,
      createdAt,
      decisionTraceId: sanitizeExecutionLedgerText(input.thread.decisionTraceId, 220) || null,
      goal,
      outcome,
      sessionId: sanitizeExecutionLedgerText(input.thread.sessionId, 160) || null,
      status: sanitizeExecutionLedgerText(input.thread.status, 48) || 'unknown',
      summary,
      threadId: sanitizeExecutionLedgerText(input.thread.id, 160) || 'unknown-thread',
      turnId: sanitizeExecutionLedgerText(input.thread.turnId, 160) || null,
    },
    goal,
    outcome,
    projectBriefing,
    resumeConfirmation,
    resumeConfirmationSummary,
    status: sanitizeExecutionLedgerText(input.thread.status, 48) || 'unknown',
    summary,
    thread: input.thread,
    action: {
      kind: 'executor',
      status: normalizeCallbackStatus(input.thread.status),
      label: buildCallbackLabel(input.thread),
      summary,
      signature,
      finishedAt: createdAt,
      metadata: {
        source: 'execution-callback-runtime',
        threadId: input.thread.id,
        decisionTraceId: input.thread.decisionTraceId,
        turnId: input.thread.turnId,
        sessionId: input.thread.sessionId,
        selectedChannel: input.thread.selectedChannel,
        threadStatus: input.thread.status,
        ...(resumeConfirmation
          ? {
              resumeConfirmation,
              resumeConfirmationSummary,
            }
          : {}),
        ...(safetyGate
          ? {
              safetyGate,
              safetyGateSummary,
            }
          : {}),
      },
    },
    safetyGate,
    safetyGateSummary,
  }
}

function buildCallbackContinuityProjectMetadata(
  projectBriefing?: AlicizationExecutionCallbackRuntimeOptions['projectBriefing'],
) {
  if (!projectBriefing)
    return {}

  const explicitLatestProgressInput = sanitizeExecutionLedgerText(
    projectBriefing.latestLandedProgress ?? projectBriefing.latestProgress ?? null,
    320,
  )
  const summaryLatestProgressInput = sanitizeExecutionLedgerText(projectBriefing.landedProgressSummary, 320)
  const explicitPrimaryOpenLoopInput = sanitizeExecutionLedgerText(projectBriefing.primaryOpenLoop, 320)
  const summaryPrimaryOpenLoopInput = sanitizeExecutionLedgerText(projectBriefing.openClosureSummary, 320)
  const explicitNextClosureTargetInput = sanitizeExecutionLedgerText(projectBriefing.nextClosureTarget, 320)
  const summaryNextClosureTargetInput = sanitizeExecutionLedgerText(projectBriefing.nextClosureTargetSummary, 320)
  const explicitSameHerDriftRiskInput = sanitizeExecutionLedgerText(projectBriefing.sameHerDriftRisk, 320)
  const summarySameHerDriftRiskInput = sanitizeExecutionLedgerText(projectBriefing.sameHerDriftRiskSummary, 320)
  const projectStateSnapshot = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: projectBriefing.identity ?? null,
      currentPhase: projectBriefing.currentPhase ?? null,
      latestLandedProgress: explicitLatestProgressInput || summaryLatestProgressInput || null,
      primaryOpenLoop: explicitPrimaryOpenLoopInput || summaryPrimaryOpenLoopInput || null,
      nextClosureTarget: explicitNextClosureTargetInput || summaryNextClosureTargetInput || null,
      sameHerSelfLine: projectBriefing.sameHerSelfLine ?? null,
      sameHerHoldDetail: projectBriefing.sameHerHoldDetail ?? null,
      sameHerDriftRisk: explicitSameHerDriftRiskInput || summarySameHerDriftRiskInput || null,
      proactiveSameHerGap: projectBriefing.proactiveSameHerGap ?? null,
      preflightSummary: projectBriefing.preflightSummary ?? null,
      preDialogueAwarenessLine: projectBriefing.preDialogueAwarenessLine ?? null,
      preDialogueAwarenessSummary: projectBriefing.preDialogueAwarenessSummary ?? null,
      companionBriefingLine: projectBriefing.companionBriefingLine ?? null,
      emotionalClosureSummary: projectBriefing.emotionalClosureSummary ?? null,
      continuityArcStage: projectBriefing.continuityArcStage ?? null,
      continuityRestraint: projectBriefing.continuityRestraint ?? null,
      continuityCue: projectBriefing.continuityCue ?? null,
      continuityPreferredTiming: projectBriefing.continuityPreferredTiming ?? null,
      continuityCadence: projectBriefing.continuityCadence ?? null,
      preferredBlinkCadence: projectBriefing.preferredBlinkCadence ?? null,
      preferredGazeMode: projectBriefing.preferredGazeMode ?? null,
      preferredPauseMode: projectBriefing.preferredPauseMode ?? null,
      preferredLipsyncMode: projectBriefing.preferredLipsyncMode ?? null,
      preferredVoiceMode: projectBriefing.preferredVoiceMode ?? null,
      preferredPacingMode: projectBriefing.preferredPacingMode ?? null,
    },
  })
  const projectIdentity = sanitizeExecutionLedgerText(projectStateSnapshot.identity ?? projectBriefing.identity, 220)
  const projectPhase = sanitizeExecutionLedgerText(projectStateSnapshot.currentPhase ?? projectBriefing.currentPhase, 220)
  const projectStatePreflightSummary = sanitizeExecutionLedgerText(projectBriefing.preflightSummary ?? projectStateSnapshot.preflightSummary, 320)
  const projectStatePreDialogueAwarenessLine = sanitizeExecutionLedgerText(
    projectBriefing.preDialogueAwarenessLine ?? projectStateSnapshot.preDialogueAwarenessLine,
    320,
  )
  const projectStatePreDialogueAwarenessSummary = sanitizeExecutionLedgerText(
    projectBriefing.preDialogueAwarenessSummary
    ?? projectBriefing.preDialogueAwarenessLine
    ?? projectStateSnapshot.preDialogueAwarenessSummary
    ?? projectStateSnapshot.preDialogueAwarenessLine,
    320,
  )
  const projectStateCompanionHeadlineLine = sanitizeExecutionLedgerText(
    projectBriefing.companionBriefingLine ?? projectStateSnapshot.companionBriefingLine,
    320,
  )
  const projectLatestLandedProgress = sanitizeExecutionLedgerText(
    projectStateSnapshot.latestLandedProgress
    ?? projectStateSnapshot.latestProgress
    ?? projectBriefing.latestLandedProgress
    ?? projectBriefing.latestProgress
    ?? projectBriefing.landedProgressSummary,
    320,
  )
  const projectPrimaryOpenLoop = sanitizeExecutionLedgerText(
    projectStateSnapshot.primaryOpenLoop
    ?? projectBriefing.primaryOpenLoop
    ?? projectBriefing.openClosureSummary,
    320,
  )
  const projectNextClosureTarget = sanitizeExecutionLedgerText(
    projectStateSnapshot.nextClosureTarget
    ?? projectBriefing.nextClosureTarget
    ?? projectBriefing.nextClosureTargetSummary,
    320,
  )
  const projectStateSameHerSelfLine = sanitizeExecutionLedgerText(
    projectBriefing.sameHerSelfLine ?? projectStateSnapshot.sameHerSelfLine,
    220,
  )
  const projectStateSameHerHoldDetail = sanitizeExecutionLedgerText(
    projectBriefing.sameHerHoldDetail ?? projectStateSnapshot.sameHerHoldDetail,
    320,
  )
  const projectStateSameHerDriftRisk = sanitizeExecutionLedgerText(
    projectBriefing.sameHerDriftRisk
    ?? projectBriefing.sameHerDriftRiskSummary
    ?? projectStateSnapshot.sameHerDriftRisk,
    320,
  )
  const projectStateEmotionalClosureSummary = sanitizeExecutionLedgerText(
    projectBriefing.emotionalClosureSummary ?? projectStateSnapshot.emotionalClosureSummary,
    220,
  )
  const continuityArcStage = sanitizeExecutionLedgerText(
    projectBriefing.continuityArcStage ?? projectStateSnapshot.continuityArcStage,
    120,
  )
  const continuityRestraint = sanitizeExecutionLedgerText(
    projectBriefing.continuityRestraint ?? projectStateSnapshot.continuityRestraint,
    64,
  )
  const continuityCue = sanitizeExecutionLedgerText(
    projectBriefing.continuityCue ?? projectStateSnapshot.continuityCue,
    220,
  )
  const continuityPreferredTiming = sanitizeExecutionLedgerText(
    projectBriefing.continuityPreferredTiming ?? projectStateSnapshot.continuityPreferredTiming,
    120,
  )
  const continuityCadence = sanitizeExecutionLedgerText(
    projectBriefing.continuityCadence ?? projectStateSnapshot.continuityCadence,
    120,
  )
  const preferredBlinkCadence = sanitizeExecutionLedgerText(
    projectBriefing.preferredBlinkCadence ?? projectStateSnapshot.preferredBlinkCadence,
    32,
  )
  const preferredGazeMode = sanitizeExecutionLedgerText(
    projectBriefing.preferredGazeMode ?? projectStateSnapshot.preferredGazeMode,
    32,
  )
  const projectStatePreferredPauseMode = sanitizeExecutionLedgerText(
    projectBriefing.preferredPauseMode ?? projectStateSnapshot.preferredPauseMode,
    32,
  )
  const projectStatePreferredLipsyncMode = sanitizeExecutionLedgerText(
    projectBriefing.preferredLipsyncMode ?? projectStateSnapshot.preferredLipsyncMode,
    32,
  )
  const projectStatePreferredVoiceMode = sanitizeExecutionLedgerText(
    projectBriefing.preferredVoiceMode ?? projectStateSnapshot.preferredVoiceMode,
    32,
  )
  const projectStatePreferredPacingMode = sanitizeExecutionLedgerText(
    projectBriefing.preferredPacingMode ?? projectStateSnapshot.preferredPacingMode,
    32,
  )

  return {
    ...(projectIdentity ? { projectIdentity } : {}),
    ...(projectPhase ? { projectPhase } : {}),
    ...(projectStatePreflightSummary ? { projectStatePreflightSummary } : {}),
    ...(projectStatePreDialogueAwarenessLine ? { projectStatePreDialogueAwarenessLine } : {}),
    ...(projectStatePreDialogueAwarenessSummary ? { projectStatePreDialogueAwarenessSummary } : {}),
    ...(projectStateCompanionHeadlineLine ? { projectStateCompanionHeadlineLine } : {}),
    ...(projectLatestLandedProgress ? { projectLatestLandedProgress } : {}),
    ...(projectPrimaryOpenLoop ? { projectPrimaryOpenLoop } : {}),
    ...(projectNextClosureTarget ? { projectNextClosureTarget } : {}),
    ...(projectStateSameHerSelfLine ? { projectStateSameHerSelfLine } : {}),
    ...(projectStateSameHerHoldDetail ? { projectStateSameHerHoldDetail } : {}),
    ...(projectStateSameHerDriftRisk ? { projectStateSameHerDriftRisk } : {}),
    ...(projectStateEmotionalClosureSummary ? { projectStateEmotionalClosureSummary } : {}),
    ...(continuityArcStage ? { continuityArcStage } : {}),
    ...(continuityRestraint ? { continuityRestraint } : {}),
    ...(continuityCue ? { continuityCue } : {}),
    ...(continuityPreferredTiming ? { continuityPreferredTiming } : {}),
    ...(continuityCadence ? { continuityCadence } : {}),
    ...(preferredBlinkCadence ? { preferredBlinkCadence } : {}),
    ...(preferredGazeMode ? { preferredGazeMode } : {}),
    ...(projectStatePreferredPauseMode ? { projectStatePreferredPauseMode } : {}),
    ...(projectStatePreferredLipsyncMode ? { projectStatePreferredLipsyncMode } : {}),
    ...(projectStatePreferredVoiceMode ? { projectStatePreferredVoiceMode } : {}),
    ...(projectStatePreferredPacingMode ? { projectStatePreferredPacingMode } : {}),
  } satisfies Record<string, string>
}

function buildCallbackContinuitySignal(item: AlicizationExecutionCallbackItem): AlicizationAgentSessionContinuityInput {
  return {
    kind: 'execution-callback',
    state: 'fresh',
    label: item.action.label,
    summary: item.summary,
    signature: item.action.signature ?? null,
    createdAt: item.createdAt,
    metadata: {
      ...item.action.metadata,
      source: 'execution-callback-runtime',
      continuityKind: 'execution-callback',
      ...buildCallbackContinuityProjectMetadata(item.projectBriefing),
      ...(item.resumeConfirmation
        ? {
            resumeConfirmation: item.resumeConfirmation,
            resumeConfirmationSummary: item.resumeConfirmationSummary,
          }
        : {}),
      ...(item.safetyGate
        ? {
            safetyGate: item.safetyGate,
            safetyGateSummary: item.safetyGateSummary,
          }
        : {}),
    },
  }
}

function buildExecutionCallbackRecallText(items: AlicizationExecutionCallbackItem[]) {
  return items.map(item => [
    `execution_callback_channel:${item.channel}`,
    `execution_callback_status:${item.status}`,
    `execution_callback_goal:${item.goal}`,
    item.outcome ? `execution_callback_outcome:${item.outcome}` : '',
    item.resumeConfirmationSummary ? `execution_callback_resume_confirmation:${item.resumeConfirmationSummary}` : '',
    item.safetyGateSummary ? `execution_callback_safety_gate:${item.safetyGateSummary}` : '',
    `execution_callback_summary:${item.summary}`,
  ].filter(Boolean).join(' ')).join('\n')
}

function lowerFirstExecutionCallbackProjectAwareness(text: string) {
  const normalized = sanitizeExecutionLedgerText(text, 320)
  if (!normalized)
    return ''
  return normalized.slice(0, 1).toLowerCase() + normalized.slice(1)
}

function readExecutionCallbackProjectBriefing(
  thread: AlicizationTaskThreadRecord,
): AlicizationExecutionCallbackProjectBriefing | null {
  const metadata = thread.metadata && typeof thread.metadata === 'object' && !Array.isArray(thread.metadata)
    ? thread.metadata as {
      execution?: {
        runtimeContext?: {
          projectBriefing?: {
            currentPhase?: unknown
            identity?: unknown
            preflightSummary?: unknown
            preDialogueAwarenessLine?: unknown
            preDialogueAwarenessSummary?: unknown
            companionBriefingLine?: unknown
            emotionalClosureSummary?: unknown
            continuityArcStage?: unknown
            continuityCue?: unknown
            continuityPreferredTiming?: unknown
            continuityCadence?: unknown
            preferredBlinkCadence?: unknown
            preferredGazeMode?: unknown
            preferredPauseMode?: unknown
            preferredLipsyncMode?: unknown
            preferredVoiceMode?: unknown
            preferredPacingMode?: unknown
            latestLandedProgress?: unknown
            latestProgress?: unknown
            landedProgressSummary?: unknown
            nextClosureTarget?: unknown
            nextClosureTargetSummary?: unknown
            primaryOpenLoop?: unknown
            openClosureSummary?: unknown
            sameHerHoldDetail?: unknown
            sameHerDriftRisk?: unknown
            sameHerDriftRiskSummary?: unknown
            sameHerSelfLine?: unknown
            proactiveSameHerGap?: unknown
          } | null
        } | null
      } | null
    }
    : null
  const projectBriefing = metadata?.execution?.runtimeContext?.projectBriefing
  return normalizeExecutionCallbackProjectBriefing(projectBriefing)
}

function resolveExecutionCallbackProjectBriefing(input: {
  items: AlicizationExecutionCallbackItem[]
  projectBriefing?: AlicizationExecutionCallbackRuntimeOptions['projectBriefing'] | null
}) {
  if (input.projectBriefing)
    return input.projectBriefing

  for (let index = input.items.length - 1; index >= 0; index -= 1) {
    const candidate = input.items[index].projectBriefing
    if (candidate)
      return candidate
  }

  return null
}

function buildExecutionCallbackProjectAwarenessLine(projectBriefing?: AlicizationExecutionCallbackRuntimeOptions['projectBriefing']) {
  if (!projectBriefing)
    return null

  const explicitLatestProgressInput = sanitizeExecutionLedgerText(
    projectBriefing.latestLandedProgress ?? projectBriefing.latestProgress ?? null,
    320,
  )
  const summaryLatestProgressInput = sanitizeExecutionLedgerText(projectBriefing.landedProgressSummary, 320)
  const explicitPrimaryOpenLoopInput = sanitizeExecutionLedgerText(projectBriefing.primaryOpenLoop, 320)
  const summaryPrimaryOpenLoopInput = sanitizeExecutionLedgerText(projectBriefing.openClosureSummary, 320)
  const explicitNextClosureTargetInput = sanitizeExecutionLedgerText(projectBriefing.nextClosureTarget, 320)
  const summaryNextClosureTargetInput = sanitizeExecutionLedgerText(projectBriefing.nextClosureTargetSummary, 320)
  const explicitSameHerDriftRiskInput = sanitizeExecutionLedgerText(projectBriefing.sameHerDriftRisk, 320)
  const summarySameHerDriftRiskInput = sanitizeExecutionLedgerText(projectBriefing.sameHerDriftRiskSummary, 320)
  const projectStateSnapshot = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      identity: projectBriefing.identity ?? null,
      currentPhase: projectBriefing.currentPhase ?? null,
      latestLandedProgress: explicitLatestProgressInput || summaryLatestProgressInput || null,
      primaryOpenLoop: explicitPrimaryOpenLoopInput || summaryPrimaryOpenLoopInput || null,
      nextClosureTarget: explicitNextClosureTargetInput || summaryNextClosureTargetInput || null,
      sameHerSelfLine: projectBriefing.sameHerSelfLine ?? null,
      sameHerHoldDetail: projectBriefing.sameHerHoldDetail ?? null,
      sameHerDriftRisk: explicitSameHerDriftRiskInput || summarySameHerDriftRiskInput || null,
      proactiveSameHerGap: projectBriefing.proactiveSameHerGap ?? null,
      preflightSummary: projectBriefing.preflightSummary ?? null,
      preDialogueAwarenessLine: projectBriefing.preDialogueAwarenessLine ?? null,
      preDialogueAwarenessSummary: projectBriefing.preDialogueAwarenessSummary ?? null,
      companionBriefingLine: projectBriefing.companionBriefingLine ?? null,
      emotionalClosureSummary: projectBriefing.emotionalClosureSummary ?? null,
      continuityCue: projectBriefing.continuityCue ?? null,
      continuityPreferredTiming: projectBriefing.continuityPreferredTiming ?? null,
      continuityCadence: projectBriefing.continuityCadence ?? null,
      preferredBlinkCadence: projectBriefing.preferredBlinkCadence ?? null,
      preferredGazeMode: projectBriefing.preferredGazeMode ?? null,
      preferredPauseMode: projectBriefing.preferredPauseMode ?? null,
      preferredLipsyncMode: projectBriefing.preferredLipsyncMode ?? null,
    },
  })
  const identity = sanitizeExecutionLedgerText(projectStateSnapshot.identity, 220)
  const currentPhase = sanitizeExecutionLedgerText(projectStateSnapshot.currentPhase, 160)
  const latestProgress = sanitizeExecutionLedgerText(
    projectStateSnapshot.latestLandedProgress ?? projectStateSnapshot.latestProgress ?? null,
    320,
  )
  const primaryOpenLoop = lowerFirstExecutionCallbackProjectAwareness(projectStateSnapshot.primaryOpenLoop ?? '')
  const nextClosureTarget = sanitizeExecutionLedgerText(projectStateSnapshot.nextClosureTarget, 320)
  const sameHerSelfLine = sanitizeExecutionLedgerText(projectStateSnapshot.sameHerSelfLine, 220)
  const rebuiltAwarenessLine = buildAlicizationProjectPreDialogueAwarenessLine({
    identity: projectStateSnapshot.identity,
    currentPhase: projectStateSnapshot.currentPhase,
    latestLandedProgress: projectStateSnapshot.latestLandedProgress,
    latestProgress: projectStateSnapshot.latestProgress,
    landedProgressSummary: projectBriefing.landedProgressSummary ?? null,
    primaryOpenLoop: projectStateSnapshot.primaryOpenLoop,
    nextClosureTarget: projectStateSnapshot.nextClosureTarget,
    sameHerSelfLine: projectStateSnapshot.sameHerSelfLine,
  })
  const sharedAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: {
      preDialogueAwarenessLine: rebuiltAwarenessLine ?? projectBriefing.preDialogueAwarenessLine ?? null,
      awarenessLine: rebuiltAwarenessLine ?? null,
      companionHeadlineLine: sameHerSelfLine,
      companionBriefingLine: projectBriefing.companionBriefingLine ?? null,
      preDialogueAwarenessSummary: projectBriefing.preDialogueAwarenessSummary ?? null,
      preflightSummary: projectBriefing.preflightSummary ?? null,
      sameHerHoldDetail: projectStateSnapshot.sameHerHoldDetail ?? projectBriefing.sameHerHoldDetail ?? null,
      sameHerDriftRiskSummary: projectStateSnapshot.sameHerDriftRisk ?? null,
    },
    fallbackProjectState: {
      preDialogueAwarenessLine: projectStateSnapshot.preDialogueAwarenessLine ?? null,
      awarenessLine: projectStateSnapshot.awarenessLine ?? null,
      companionHeadlineLine: projectStateSnapshot.companionHeadlineLine ?? null,
      companionBriefingLine: projectStateSnapshot.companionBriefingLine ?? null,
      preDialogueAwarenessSummary: projectStateSnapshot.preDialogueAwarenessSummary ?? null,
      preflightSummary: projectStateSnapshot.preflightSummary ?? null,
      sameHerHoldDetail: projectStateSnapshot.sameHerHoldDetail ?? projectBriefing.sameHerHoldDetail ?? null,
    },
  })
  const explicitSameHerHoldDetail = sanitizeExecutionLedgerText(projectBriefing.sameHerHoldDetail, 320) || null
  const resolvedSameHerHoldDetail = sanitizeExecutionLedgerText(projectStateSnapshot.sameHerHoldDetail, 320) || null
  const strongerSameHerHoldDetail = explicitSameHerHoldDetail ?? resolvedSameHerHoldDetail
  const awarenessIsLeadingWithGeneratedHold
    = Boolean(
      explicitSameHerHoldDetail
      && resolvedSameHerHoldDetail
      && explicitSameHerHoldDetail !== resolvedSameHerHoldDetail
      && sharedAwarenessLine?.startsWith(resolvedSameHerHoldDetail),
    )
  const awarenessLead
    = strongerSameHerHoldDetail
      && (
        isAlicizationThinSamePhaseCarryLine(sharedAwarenessLine)
        || awarenessIsLeadingWithGeneratedHold
      )
      ? strongerSameHerHoldDetail
      : sharedAwarenessLine
  const awarenessLine = [
    awarenessLead,
    identity,
    currentPhase ? `current phase=${currentPhase}` : '',
    sameHerSelfLine,
    latestProgress ? `What has already landed is ${latestProgress}.` : '',
    primaryOpenLoop ? `The still-open closure is ${primaryOpenLoop}.` : '',
    nextClosureTarget ? `Next closure: ${nextClosureTarget}.` : '',
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()

  return awarenessLine || projectStateSnapshot.preDialogueAwarenessLine || projectStateSnapshot.awarenessLine || null
}

function buildExecutionCallbackSystemBlock(
  items: AlicizationExecutionCallbackItem[],
  projectAwareness: string | null,
  projectCarry: AlicizationExecutionCallbackProjectCarryDetails | null,
) {
  if (items.length === 0)
    return ''

  return [
    '[ALICIZATION_EXECUTION_CALLBACKS]',
    'Freshly settled runtime callbacks carried into this turn from the current conversation session.',
    'These are already executed results. Reference them naturally when relevant, but do not claim they re-ran in this turn.',
    projectAwareness ? `project_awareness=${projectAwareness}` : '',
    projectCarry?.companionBriefingLine ? `project_companion_briefing=${projectCarry.companionBriefingLine}` : '',
    projectCarry?.emotionalClosureSummary ? `project_emotional_closure=${projectCarry.emotionalClosureSummary}` : '',
    projectCarry?.continuityArcStage ? `project_continuity_arc_stage=${projectCarry.continuityArcStage}` : '',
    projectCarry?.continuityRestraint ? `project_continuity_restraint=${projectCarry.continuityRestraint}` : '',
    projectCarry?.sameHerHoldDetail ? `project_same_her_hold=${projectCarry.sameHerHoldDetail}` : '',
    projectCarry?.continuityCue ? `project_continuity_cue=${projectCarry.continuityCue}` : '',
    projectCarry?.continuityPreferredTiming ? `project_continuity_preferred_timing=${projectCarry.continuityPreferredTiming}` : '',
    projectCarry?.continuityCadence ? `project_continuity_cadence=${projectCarry.continuityCadence}` : '',
    projectCarry?.preferredBlinkCadence ? `project_preferred_blink_cadence=${projectCarry.preferredBlinkCadence}` : '',
    projectCarry?.preferredGazeMode ? `project_preferred_gaze_mode=${projectCarry.preferredGazeMode}` : '',
    projectCarry?.preferredPauseMode ? `project_pause_mode=${projectCarry.preferredPauseMode}` : '',
    projectCarry?.preferredLipsyncMode ? `project_lipsync_mode=${projectCarry.preferredLipsyncMode}` : '',
    projectCarry?.preferredVoiceMode ? `project_voice_mode=${projectCarry.preferredVoiceMode}` : '',
    projectCarry?.preferredPacingMode ? `project_pacing_mode=${projectCarry.preferredPacingMode}` : '',
    projectCarry?.proactiveSameHerGap ? `project_proactive_same_her_gap=${projectCarry.proactiveSameHerGap}` : '',
    ...items.map(item => [
      `- channel=${item.channel}`,
      `status=${item.status}`,
      `goal=${item.goal}`,
      `summary=${item.summary}`,
      item.outcome ? `outcome=${item.outcome}` : '',
      item.resumeConfirmationSummary ? `resume_confirmation=${item.resumeConfirmationSummary}` : '',
      item.safetyGateSummary ? `safety_gate=${item.safetyGateSummary}` : '',
    ].filter(Boolean).join(' | ')),
  ].join('\n')
}

export function createAlicizationExecutionCallbackRuntime(options: AlicizationExecutionCallbackRuntimeOptions) {
  const getNow = options.getNow ?? Date.now
  const maxPendingCallbacks = Math.max(1, Math.floor(options.maxPendingCallbacks ?? defaultMaxPendingCallbacks))
  const maxThreadAgeMs = Math.max(1_000, Math.floor(options.maxThreadAgeMs ?? defaultMaxThreadAgeMs))
  const surfacedCursorBySession = new Map<string, number>()

  async function buildPendingExecutionCallbackContext(input: {
    consume?: boolean
    sessionId: string
  }): Promise<AlicizationExecutionCallbackContext> {
    const sessionId = sanitizeExecutionLedgerText(input.sessionId, 160)
    if (!sessionId)
      return emptyAlicizationExecutionCallbackContext

    const surfacedCursor = surfacedCursorBySession.get(sessionId) ?? 0
    const candidateThreads = await options.listTaskThreads({
      sessionId,
      limit: 8,
    }).catch(() => [])

    const recentTerminalThreads = candidateThreads
      .filter(thread => alicizationTerminalTaskThreadStatuses.has(thread.status))
      .map(thread => ({
        thread,
        activityAt: readTaskThreadActivityAt(thread),
      }))
      .filter(entry =>
        entry.activityAt > surfacedCursor
        && getNow() - entry.activityAt <= maxThreadAgeMs,
      )
      .sort((left, right) => left.activityAt - right.activityAt)
      .slice(-maxPendingCallbacks)

    if (recentTerminalThreads.length === 0)
      return emptyAlicizationExecutionCallbackContext

    const items = await Promise.all(recentTerminalThreads.map(async ({ thread }) => {
      const events = await options.listExecutionEvents({
        threadId: thread.id,
        limit: 8,
      }).catch(() => [])
      return buildCallbackItem({
        thread,
        events,
      })
    }))

    const pendingItems = items
      .filter(item => item.createdAt > surfacedCursor)
      .sort((left, right) => left.createdAt - right.createdAt)

    if (pendingItems.length === 0)
      return emptyAlicizationExecutionCallbackContext

    const resolvedProjectBriefing = resolveExecutionCallbackProjectBriefing({
      items: pendingItems,
      projectBriefing: options.projectBriefing ?? null,
    })
    const projectAwareness = buildExecutionCallbackProjectAwarenessLine(resolvedProjectBriefing)
    const projectCarry = buildExecutionCallbackProjectCarryDetails(resolvedProjectBriefing)

    if (input.consume !== false) {
      surfacedCursorBySession.set(
        sessionId,
        Math.max(...pendingItems.map(item => item.createdAt)),
      )
    }

    return {
      actions: pendingItems.map(item => item.action),
      callbacks: pendingItems.map(item => item.digest),
      continuitySignals: pendingItems.map(buildCallbackContinuitySignal),
      recallText: [
        projectAwareness ? `execution_callback_project_awareness:${projectAwareness}` : '',
        projectCarry?.companionBriefingLine ? `execution_callback_project_companion_briefing:${projectCarry.companionBriefingLine}` : '',
        projectCarry?.emotionalClosureSummary ? `execution_callback_project_emotional_closure:${projectCarry.emotionalClosureSummary}` : '',
        projectCarry?.continuityArcStage ? `execution_callback_project_continuity_arc_stage:${projectCarry.continuityArcStage}` : '',
        projectCarry?.continuityRestraint ? `execution_callback_project_continuity_restraint:${projectCarry.continuityRestraint}` : '',
        projectCarry?.sameHerHoldDetail ? `execution_callback_project_same_her_hold:${projectCarry.sameHerHoldDetail}` : '',
        projectCarry?.continuityCue ? `execution_callback_project_continuity_cue:${projectCarry.continuityCue}` : '',
        projectCarry?.continuityPreferredTiming ? `execution_callback_project_continuity_timing:${projectCarry.continuityPreferredTiming}` : '',
        projectCarry?.continuityCadence ? `execution_callback_project_continuity_cadence:${projectCarry.continuityCadence}` : '',
        projectCarry?.preferredBlinkCadence ? `execution_callback_project_preferred_blink:${projectCarry.preferredBlinkCadence}` : '',
        projectCarry?.preferredGazeMode ? `execution_callback_project_preferred_gaze:${projectCarry.preferredGazeMode}` : '',
        projectCarry?.preferredPauseMode ? `execution_callback_project_pause_mode:${projectCarry.preferredPauseMode}` : '',
        projectCarry?.preferredLipsyncMode ? `execution_callback_project_lipsync_mode:${projectCarry.preferredLipsyncMode}` : '',
        projectCarry?.preferredVoiceMode ? `execution_callback_project_voice_mode:${projectCarry.preferredVoiceMode}` : '',
        projectCarry?.preferredPacingMode ? `execution_callback_project_pacing_mode:${projectCarry.preferredPacingMode}` : '',
        projectCarry?.proactiveSameHerGap ? `execution_callback_project_proactive_same_her_gap:${projectCarry.proactiveSameHerGap}` : '',
        buildExecutionCallbackRecallText(pendingItems),
      ].filter(Boolean).join('\n'),
      systemBlock: buildExecutionCallbackSystemBlock(pendingItems, projectAwareness, projectCarry),
    }
  }

  function markSurfaced(input: {
    createdAt: number
    sessionId: string
  }) {
    const sessionId = sanitizeExecutionLedgerText(input.sessionId, 160)
    const createdAt = Number.isFinite(input.createdAt)
      ? Math.max(0, Math.floor(Number(input.createdAt)))
      : 0
    if (!sessionId || createdAt <= 0)
      return

    surfacedCursorBySession.set(
      sessionId,
      Math.max(
        surfacedCursorBySession.get(sessionId) ?? 0,
        createdAt,
      ),
    )
  }

  function clear(sessionId?: string) {
    const normalizedSessionId = sanitizeExecutionLedgerText(sessionId, 160)
    if (normalizedSessionId) {
      surfacedCursorBySession.delete(normalizedSessionId)
      return
    }
    surfacedCursorBySession.clear()
  }

  return {
    buildPendingExecutionCallbackContext,
    clear,
    markSurfaced,
    peekSurfacedCursor: (sessionId: string) => {
      const normalizedSessionId = sanitizeExecutionLedgerText(sessionId, 160)
      if (!normalizedSessionId)
        return 0
      return surfacedCursorBySession.get(normalizedSessionId) ?? 0
    },
  }
}
