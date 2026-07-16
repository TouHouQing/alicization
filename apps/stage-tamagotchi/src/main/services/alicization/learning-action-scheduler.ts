import type {
  AlicizationAuditLogInput,
  AlicizationLearningAction,
  AlicizationLearningTaskFailureKind,
  AlicizationLearningTaskPayload,
  AlicizationLearningTaskRecord,
  AlicizationSelfEvolutionKernelSnapshot,
} from '../../../shared/eventa'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { AlicizationSelfRevisionEvent } from './self-evolution/self-revision-ledger'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'

type AlicizationLearningProjectStateContinuityInput = (
  NonNullable<OrganicMemoryPromptContext['projectStateContinuity']>
  | NonNullable<AlicizationLearningTaskPayload['projectStateContinuity']>
) & {
  proactiveSameHerGap?: string | null
}

type AlicizationLearningProjectStateContinuity = NonNullable<AlicizationLearningTaskPayload['projectStateContinuity']> & {
  proactiveSameHerGap?: string | null
}

function sanitizeLearningContinuityText(raw: unknown, maxChars = 420) {
  return sanitizeAlicizationProviderFacingText(raw, maxChars, '') || null
}

function sanitizeLearningContinuityAnchor(raw: unknown) {
  return sanitizeLearningContinuityText(raw, 220) ?? 'identity continuity'
}

const legacyContinuityLabelPattern = /^(?:same-her\s*(?:hold|gap)|project anchor|cadence detail|guard|continuity gap)\s*[:：]\s*/iu

function sanitizeLearningContinuitySentence(raw: unknown, maxChars = 420) {
  const text = sanitizeLearningContinuityText(raw, maxChars)
  if (!text)
    return ''
  return text.replace(legacyContinuityLabelPattern, '').trim()
}

function sentence(text: string) {
  const trimmed = text.trim().replace(/[.。!！?？;；:：]+$/u, '')
  return trimmed ? `${trimmed}.` : ''
}

function sanitizeLearningProjectStateContinuity(
  projectState: AlicizationLearningProjectStateContinuity,
): AlicizationLearningProjectStateContinuity {
  return {
    ...projectState,
    identity: sanitizeLearningContinuityText(projectState.identity, 260) ?? 'local continuity context',
    currentPhase: sanitizeLearningContinuityText(projectState.currentPhase, 180) ?? 'local continuity phase',
    sameHerSummary: sanitizeLearningContinuityAnchor(projectState.sameHerSummary),
    landedProgressSummary: sanitizeLearningContinuityText(projectState.landedProgressSummary, 420) ?? 'Continuity progress is tracked.',
    openClosureSummary: sanitizeLearningContinuityText(projectState.openClosureSummary, 420) ?? 'An open loop is tracked.',
    proactiveSameHerGap: sanitizeLearningContinuityText(projectState.proactiveSameHerGap, 420),
    nextClosureTarget: sanitizeLearningContinuityText(projectState.nextClosureTarget, 420) ?? 'Continue verified closure.',
    preDialogueAwarenessLine: sanitizeLearningContinuityText(projectState.preDialogueAwarenessLine, 520),
    emotionalClosureCue: sanitizeLearningContinuityText(projectState.emotionalClosureCue, 420),
    sameHerSelfLine: sanitizeLearningContinuityAnchor(projectState.sameHerSelfLine),
    sameHerHoldDetail: sanitizeLearningContinuityText(projectState.sameHerHoldDetail, 420),
    sameHerDriftRisk: sanitizeLearningContinuityText(projectState.sameHerDriftRisk, 420) ?? 'Risk is tracked for review.',
  }
}

function buildDelayedLearningProjectStateContinuity(
  projectState?: AlicizationLearningProjectStateContinuityInput | null,
): AlicizationLearningProjectStateContinuity {
  const canonicalProjectState = resolveAlicizationProjectStateBrief()
  if (!projectState) {
    return sanitizeLearningProjectStateContinuity({
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      sameHerSummary: canonicalProjectState.sameHerSelfLine,
      landedProgressSummary:
        canonicalProjectState.continuityProgressSummary
        ?? canonicalProjectState.memoryAnthropomorphismProgress[0]
        ?? canonicalProjectState.latestProgress,
      openClosureSummary: canonicalProjectState.openLoops[0] ?? canonicalProjectState.primaryOpenLoop,
      proactiveSameHerGap: canonicalProjectState.proactiveSameHerGap,
      nextClosureTarget: canonicalProjectState.nextClosureTarget,
      preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
      emotionalClosureCue: canonicalProjectState.emotionalClosureCue ?? null,
      sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
      sameHerHoldDetail: canonicalProjectState.sameHerHoldDetail ?? null,
      sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
    })
  }

  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    fallbackProjectState: {
      identity: canonicalProjectState.identity,
      currentPhase: canonicalProjectState.currentPhase,
      preDialogueAwarenessLine: canonicalProjectState.preDialogueAwarenessLine ?? null,
      latestLandedProgress:
        canonicalProjectState.continuityProgressSummary
        ?? canonicalProjectState.memoryAnthropomorphismProgress[0]
        ?? canonicalProjectState.latestProgress,
      latestProgress:
        canonicalProjectState.continuityProgressSummary
        ?? canonicalProjectState.memoryAnthropomorphismProgress[0]
        ?? canonicalProjectState.latestProgress,
      primaryOpenLoop: canonicalProjectState.openLoops[0] ?? canonicalProjectState.primaryOpenLoop,
      proactiveSameHerGap: canonicalProjectState.proactiveSameHerGap,
      nextClosureTarget: canonicalProjectState.nextClosureTarget,
      sameHerSelfLine: canonicalProjectState.sameHerSelfLine,
      sameHerDriftRisk: canonicalProjectState.sameHerDriftRisk,
      emotionalClosureCue: canonicalProjectState.emotionalClosureCue ?? null,
      emotionalClosureSummary: canonicalProjectState.emotionalClosureSummary ?? null,
      sameHerHoldDetail: canonicalProjectState.sameHerHoldDetail ?? null,
    },
    runtimeProjectState: {
      latestLandedProgress: projectState.landedProgressSummary ?? null,
      latestProgress: projectState.landedProgressSummary ?? null,
      primaryOpenLoop: projectState.openClosureSummary ?? null,
      proactiveSameHerGap: projectState.proactiveSameHerGap ?? null,
      nextClosureTarget: projectState.nextClosureTarget ?? null,
      sameHerSelfLine: projectState.sameHerSelfLine ?? null,
      sameHerHoldDetail: projectState.sameHerHoldDetail ?? null,
      sameHerDriftRisk: projectState.sameHerDriftRisk ?? null,
      emotionalClosureCue: projectState.emotionalClosureCue ?? null,
      preDialogueAwarenessLine:
        projectState.preDialogueAwarenessLine
        && !isAlicizationThinProjectAwarenessLine(projectState.preDialogueAwarenessLine)
          ? projectState.preDialogueAwarenessLine
          : null,
      identity:
        projectState.identity && projectState.identity.length >= canonicalProjectState.identity.length / 2
          ? projectState.identity
          : null,
      currentPhase:
        projectState.currentPhase && projectState.currentPhase.includes('Local Digital Life')
          ? projectState.currentPhase
          : null,
    },
  })

  const preferredSameHerSummary
    = projectState.sameHerSummary
      && !isAlicizationThinProjectAwarenessLine(projectState.sameHerSummary)
      ? projectState.sameHerSummary
      : normalizedProjectState.sameHerSelfLine

  return sanitizeLearningProjectStateContinuity({
    identity: normalizedProjectState.identity,
    currentPhase: normalizedProjectState.currentPhase,
    sameHerSummary: preferredSameHerSummary,
    landedProgressSummary: normalizedProjectState.latestLandedProgress,
    openClosureSummary: normalizedProjectState.primaryOpenLoop,
    proactiveSameHerGap: normalizedProjectState.proactiveSameHerGap,
    nextClosureTarget: normalizedProjectState.nextClosureTarget,
    preDialogueAwarenessLine: normalizedProjectState.preDialogueAwarenessLine,
    emotionalClosureCue: normalizedProjectState.emotionalClosureCue ?? null,
    sameHerSelfLine: normalizedProjectState.sameHerSelfLine,
    sameHerHoldDetail: normalizedProjectState.sameHerHoldDetail ?? null,
    sameHerDriftRisk: normalizedProjectState.sameHerDriftRisk,
  })
}

export interface AlicizationLearningScheduledTask {
  cardId: string
  taskId: string
  triggerAt: number
  action: AlicizationLearningAction
  message: string
  payload: AlicizationLearningTaskPayload
  sourceTurnId?: string | null
}

export interface AlicizationLearningActionAuditPayload {
  taskId: string
  triggerAt: number
  sourceTurnId: string | null
  projectStateContinuity?: AlicizationLearningProjectStateContinuity | null
  nextLearningAction: AlicizationSelfEvolutionKernelSnapshot['nextLearningAction']
  nextLearningReason: string | null
  activeLearningFocuses: string[]
  dominantTrajectory: string | null
  sourceSignals: string[]
  learningReadiness: number
  contradictionPressure: number
  revisionPressure: number
  autobiographicalStability: number
  supersedeTargets?: string[]
  conflictTargets?: string[]
}

interface AlicizationLearningTaskExecutionResult {
  status: 'completed' | 'blocked' | 'failed' | 'reopened' | 'downgraded' | 'cancelled'
  resultSummary?: string | null
  failureKind?: AlicizationLearningTaskFailureKind | null
  error?: string | null
  nextRetryAt?: number | null
  firedTurnId?: string | null
  selfRevisionEvent?: AlicizationSelfRevisionEvent | null
  selfRevisionStatePatch?: AlicizationSelfRevisionStatePatch | null
}

interface CreateAlicizationLearningActionSchedulerOptions {
  now: () => number
  insertLearningTask: (input: {
    cardId: string
    taskId: string
    triggerAt: number
    action: AlicizationLearningAction
    message: string
    payload: AlicizationLearningTaskPayload
    maxAttempts?: number
  }) => Promise<AlicizationLearningTaskRecord>
  claimDueLearningTasks: (cardId: string, nowMs: number, limit: number) => Promise<AlicizationLearningTaskRecord[]>
  startLearningTask: (taskId: string, startedAt?: number) => Promise<void>
  blockLearningTask: (taskId: string, input: {
    reason: string
    resultSummary?: string | null
    failureKind?: AlicizationLearningTaskFailureKind | null
    nextRetryAt?: number | null
  }, updatedAt?: number) => Promise<void>
  completeLearningTask: (taskId: string, input: {
    firedTurnId?: string | null
    resultSummary?: string | null
  }, completedAt?: number) => Promise<void>
  failLearningTask: (taskId: string, input: {
    error: string
    failureKind: AlicizationLearningTaskFailureKind
    nextRetryAt?: number | null
  }, updatedAt?: number) => Promise<void>
  reopenLearningTask: (taskId: string, input?: {
    reason?: string | null
    triggerAt?: number | null
  }, updatedAt?: number) => Promise<void>
  downgradeLearningTask: (taskId: string, input?: {
    reason?: string | null
  }, updatedAt?: number) => Promise<void>
  cancelLearningTask: (taskId: string, input?: {
    reason?: string | null
  }, updatedAt?: number) => Promise<void>
  listLearningTasks: (input: {
    cardId: string
    limit?: number
    statuses?: Array<AlicizationLearningTaskRecord['status']>
  }) => Promise<AlicizationLearningTaskRecord[]>
  appendAuditLog: (input: AlicizationAuditLogInput, cardId?: string) => Promise<void>
  executeLearningTask: (task: AlicizationLearningTaskRecord) => Promise<AlicizationLearningTaskExecutionResult>
  randomUUID: () => string
  getActiveCardId: () => string
}

export interface AlicizationLearningTaskRetryPlan {
  shouldRetry: boolean
  retryDueAt: number | null
  failureKind: AlicizationLearningTaskFailureKind
  reason: string
}

function normalizeFailureKind(kind: AlicizationLearningTaskFailureKind | null | undefined): AlicizationLearningTaskFailureKind {
  return kind === 'dependency-missing'
    || kind === 'validation-insufficient'
    || kind === 'runtime-error'
    || kind === 'cancelled'
    ? kind
    : 'runtime-error'
}

function inferLearningTaskFailureKind(input: {
  status: AlicizationLearningTaskExecutionResult['status'] | AlicizationLearningTaskRecord['status']
  failureKind?: AlicizationLearningTaskFailureKind | null
  error?: string | null
  resultSummary?: string | null
}): AlicizationLearningTaskFailureKind {
  if (input.failureKind)
    return normalizeFailureKind(input.failureKind)
  if (input.status === 'cancelled')
    return 'cancelled'
  const haystack = `${input.error ?? ''} ${input.resultSummary ?? ''}`.toLowerCase()
  if (/\b(?:missing|dependency|support|source|context)\b|依赖|缺少|不足/u.test(haystack))
    return 'dependency-missing'
  if (input.status === 'blocked' || /\b(?:validation|verify|insufficient|contradictory|target)\b|验证|核实|矛盾/u.test(haystack))
    return 'validation-insufficient'
  return 'runtime-error'
}

export function computeAlicizationLearningTaskBackoffMs(input: {
  attemptCount: number
  failureKind?: AlicizationLearningTaskFailureKind | null
}) {
  const safeAttempts = Math.max(1, Math.floor(input.attemptCount))
  const failureKind = normalizeFailureKind(input.failureKind)
  const base = failureKind === 'dependency-missing'
    ? 90_000
    : failureKind === 'validation-insufficient'
      ? 120_000
      : failureKind === 'runtime-error'
        ? 45_000
        : 0
  if (base <= 0)
    return 0
  const multiplier = 2 ** Math.min(4, safeAttempts - 1)
  return Math.min(30 * 60_000, base * multiplier)
}

export function deriveAlicizationLearningTaskRetryPlan(input: {
  task: AlicizationLearningTaskRecord
  status: AlicizationLearningTaskExecutionResult['status'] | AlicizationLearningTaskRecord['status']
  nowMs: number
  currentAttemptCount?: number
  failureKind?: AlicizationLearningTaskFailureKind | null
  error?: string | null
  resultSummary?: string | null
  explicitNextRetryAt?: number | null
  baseRetryFromMs?: number | null
}): AlicizationLearningTaskRetryPlan {
  const failureKind = inferLearningTaskFailureKind(input)
  const currentAttemptCount = Math.max(0, Math.floor(input.currentAttemptCount ?? input.task.attemptCount))
  const maxAttempts = Math.max(1, Math.floor(input.task.maxAttempts))
  if (failureKind === 'cancelled' || input.status === 'cancelled') {
    return {
      shouldRetry: false,
      retryDueAt: null,
      failureKind,
      reason: 'cancelled learning tasks are terminal',
    }
  }
  if (input.status === 'downgraded' || input.status === 'completed') {
    return {
      shouldRetry: false,
      retryDueAt: null,
      failureKind,
      reason: `terminal status:${input.status}`,
    }
  }
  if (currentAttemptCount >= maxAttempts) {
    return {
      shouldRetry: false,
      retryDueAt: null,
      failureKind,
      reason: `attempt budget exhausted:${currentAttemptCount}/${maxAttempts}`,
    }
  }

  const explicitNextRetryAt = Number.isFinite(input.explicitNextRetryAt)
    ? Math.max(0, Math.floor(Number(input.explicitNextRetryAt)))
    : null
  const backoffMs = computeAlicizationLearningTaskBackoffMs({
    attemptCount: Math.max(1, currentAttemptCount),
    failureKind,
  })
  const retryDueAt = explicitNextRetryAt ?? Math.max(0, Math.floor(Number(input.baseRetryFromMs ?? input.nowMs))) + backoffMs
  return {
    shouldRetry: retryDueAt > 0,
    retryDueAt,
    failureKind,
    reason: `retryable:${failureKind}:attempt ${currentAttemptCount}/${maxAttempts}`,
  }
}

function buildTaskMessage(input: {
  nextLearningAction: AlicizationSelfEvolutionKernelSnapshot['nextLearningAction']
  nextLearningReason: string | null
  activeLearningFocuses: string[]
  projectStateContinuity?: AlicizationLearningProjectStateContinuityInput | null
}) {
  const sameHerSelfLine = sanitizeLearningContinuityAnchor(input.projectStateContinuity?.sameHerSelfLine)
  const sameHerHoldDetail = sanitizeLearningContinuitySentence(input.projectStateContinuity?.sameHerHoldDetail, 420)
  const sameHerDriftRisk = sanitizeLearningContinuitySentence(input.projectStateContinuity?.sameHerDriftRisk, 420)
  const proactiveSameHerGap = sanitizeLearningContinuitySentence(input.projectStateContinuity?.proactiveSameHerGap, 420)
  const sameHerLearningConstraint
    = sameHerDriftRisk
      && /generic assistant shell|project-summary voice|generic project shell|detached project/i.test(sameHerDriftRisk)
      ? sentence(`Stay anchored on ${sameHerSelfLine || 'identity continuity'}. ${sameHerDriftRisk}`)
      : sameHerSelfLine
        ? sentence(`Stay anchored on ${sameHerSelfLine}`)
        : ''
  return [
    sentence(`Learning action: ${input.nextLearningAction}`),
    input.nextLearningReason ? sentence(`Reason: ${input.nextLearningReason}`) : '',
    sameHerLearningConstraint,
    sameHerHoldDetail ? sentence(sameHerHoldDetail) : '',
    proactiveSameHerGap ? sentence(proactiveSameHerGap) : '',
    input.activeLearningFocuses.length > 0 ? sentence(`Focus: ${input.activeLearningFocuses.join(', ')}`) : '',
  ].filter(Boolean).join(' ')
}

function deriveSameHerContinuityGuard(projectStateContinuity?: AlicizationLearningProjectStateContinuityInput | null) {
  const sameHerSelfLine = sanitizeLearningContinuityAnchor(projectStateContinuity?.sameHerSelfLine)
  const sameHerHoldDetail = sanitizeLearningContinuitySentence(projectStateContinuity?.sameHerHoldDetail, 420)
  const sameHerDriftRisk = sanitizeLearningContinuitySentence(projectStateContinuity?.sameHerDriftRisk, 420)
  const proactiveSameHerGap = sanitizeLearningContinuitySentence(projectStateContinuity?.proactiveSameHerGap, 420)
  if (
    !sameHerHoldDetail
    && (!sameHerDriftRisk || !/generic assistant shell|project-summary voice|generic project shell|detached project/i.test(sameHerDriftRisk))
    && !proactiveSameHerGap
  ) {
    return null
  }
  return {
    sameHerSelfLine: sameHerSelfLine || 'identity continuity',
    sameHerHoldDetail: sameHerHoldDetail || null,
    sameHerDriftRisk: sameHerDriftRisk || 'Scheduler drift guard is needed.',
    proactiveSameHerGap: proactiveSameHerGap || null,
  }
}

function appendSameHerContinuityGuard(input: {
  text?: string | null
  projectStateContinuity?: AlicizationLearningProjectStateContinuityInput | null
}) {
  const base = input.text?.trim() ?? ''
  const continuityGuard = deriveSameHerContinuityGuard(input.projectStateContinuity)
  if (!continuityGuard)
    return base || null

  const fragments = [
    base,
    sentence(`Stay anchored on ${continuityGuard.sameHerSelfLine}`),
    continuityGuard.sameHerHoldDetail ? sentence(continuityGuard.sameHerHoldDetail) : '',
    sentence(continuityGuard.sameHerDriftRisk),
    continuityGuard.proactiveSameHerGap ? sentence(continuityGuard.proactiveSameHerGap) : '',
  ].filter(Boolean)

  return fragments.join(' ')
}

function buildAuditPayload(input: {
  task: AlicizationLearningScheduledTask
  evolution: AlicizationSelfEvolutionKernelSnapshot
  context: OrganicMemoryPromptContext
}): AlicizationLearningActionAuditPayload {
  return {
    taskId: input.task.taskId,
    triggerAt: input.task.triggerAt,
    sourceTurnId: input.task.sourceTurnId ?? null,
    projectStateContinuity: input.task.payload.projectStateContinuity ?? null,
    nextLearningAction: input.evolution.nextLearningAction,
    nextLearningReason: input.evolution.nextLearningReason,
    activeLearningFocuses: [...input.evolution.activeLearningFocuses],
    dominantTrajectory: input.evolution.dominantTrajectory,
    sourceSignals: [...input.evolution.sourceSignals],
    learningReadiness: input.evolution.learningReadiness,
    contradictionPressure: input.evolution.contradictionPressure,
    revisionPressure: input.evolution.revisionPressure,
    autobiographicalStability: input.evolution.autobiographicalStability,
    supersedeTargets: input.context.retrievedFacts
      .flatMap(item => item.supersedes ?? [])
      .slice(0, 12),
    conflictTargets: input.context.retrievedFacts
      .flatMap(item => item.conflictsWith ?? [])
      .slice(0, 12),
  }
}

function deriveTaskPayload(input: {
  context: OrganicMemoryPromptContext
  turnId?: string | null
}): AlicizationLearningTaskPayload | null {
  const evolution = input.context.selfEvolution ?? null
  if (!evolution || evolution.nextLearningAction === 'hold')
    return null
  const delayedProjectStateContinuity = buildDelayedLearningProjectStateContinuity(input.context.projectStateContinuity ?? null)
  return {
    sourceTurnId: input.turnId ?? null,
    decisionTraceId: input.context.decisionTraceId ?? null,
    sourceSessionId: input.context.sessionId ?? null,
    action: evolution.nextLearningAction as AlicizationLearningAction,
    reason: evolution.nextLearningReason ?? null,
    projectStateContinuity: delayedProjectStateContinuity,
    focuses: [...evolution.activeLearningFocuses].slice(0, 12),
    dominantTrajectory: evolution.dominantTrajectory,
    sourceSignals: [...evolution.sourceSignals].slice(0, 12),
    learningReadiness: evolution.learningReadiness,
    contradictionPressure: evolution.contradictionPressure,
    revisionPressure: evolution.revisionPressure,
    autobiographicalStability: evolution.autobiographicalStability,
    supportingFactIds: input.context.retrievedFacts.map(item => item.id).filter(Boolean).slice(0, 24),
    supportingReflectionIds: (input.context.recentMemoryReflections ?? []).map(item => item.id).filter(Boolean).slice(0, 24),
    supportingOutcomeIds: (input.context.recentRelationshipOutcomes ?? []).map(item => item.id).filter(Boolean).slice(0, 24),
    supersedeTargets: input.context.retrievedFacts.flatMap(item => item.supersedes ?? []).filter(Boolean).slice(0, 24),
    conflictTargets: input.context.retrievedFacts.flatMap(item => item.conflictsWith ?? []).filter(Boolean).slice(0, 24),
  }
}

export function createAlicizationLearningActionScheduler(options: CreateAlicizationLearningActionSchedulerOptions) {
  function deriveLearningTask(input: {
    context: OrganicMemoryPromptContext
    turnId?: string | null
  }): AlicizationLearningScheduledTask | null {
    const evolution = input.context.selfEvolution ?? null
    const payload = deriveTaskPayload(input)
    if (!evolution || !payload)
      return null

    const nowMs = options.now()
    const taskId = `learning:${options.getActiveCardId()}:${evolution.nextLearningAction}:${options.randomUUID().slice(0, 8)}`
    const delayMs = evolution.nextLearningAction === 'record'
      ? 30_000
      : evolution.nextLearningAction === 'reflect'
        ? 60_000
        : evolution.nextLearningAction === 'verify'
          ? 90_000
          : evolution.nextLearningAction === 'revise'
            ? 120_000
            : 150_000

    return {
      cardId: options.getActiveCardId(),
      taskId,
      triggerAt: nowMs + delayMs,
      action: evolution.nextLearningAction as AlicizationLearningAction,
      message: buildTaskMessage({
        nextLearningAction: evolution.nextLearningAction,
        nextLearningReason: evolution.nextLearningReason,
        activeLearningFocuses: evolution.activeLearningFocuses,
        projectStateContinuity: payload.projectStateContinuity ?? null,
      }),
      payload,
      sourceTurnId: input.turnId ?? null,
    }
  }

  async function scheduleLearningTask(input: {
    context: OrganicMemoryPromptContext
    turnId?: string | null
  }) {
    const task = deriveLearningTask(input)
    const evolution = input.context.selfEvolution ?? null
    if (!task || !evolution)
      return null
    const auditPayload = buildAuditPayload({
      task,
      evolution,
      context: input.context,
    })
    const inserted = await options.insertLearningTask({
      cardId: task.cardId,
      taskId: task.taskId,
      triggerAt: task.triggerAt,
      action: task.action,
      message: task.message,
      payload: task.payload,
    })
    await options.appendAuditLog({
      level: 'notice',
      category: 'alicization.learning',
      action: 'alicization.learning.task.scheduled',
      message: 'Scheduled learning action from self-evolution kernel.',
      payload: {
        ...auditPayload,
        message: task.message,
      },
    }, task.cardId)
    return inserted
  }

  async function processDueLearningTasks(limit = 8) {
    const cardId = options.getActiveCardId()
    const due = await options.claimDueLearningTasks(cardId, options.now(), limit)
    let completed = 0
    let failed = 0
    let blocked = 0
    let reopened = 0
    let downgraded = 0
    let cancelled = 0

    for (const task of due) {
      try {
        const startedAt = options.now()
        await options.startLearningTask(task.taskId, startedAt)
        await options.appendAuditLog({
          level: 'notice',
          category: 'alicization.learning',
          action: 'alicization.learning.task.started',
          message: 'Started due learning action task.',
          payload: {
            taskId: task.taskId,
            action: task.action,
            triggerAt: task.triggerAt,
            sourceTurnId: task.sourceTurnId ?? null,
          },
        }, cardId)

        const result = await options.executeLearningTask(task)
        const finishedAt = options.now()
        if (result.status === 'completed') {
          await options.completeLearningTask(task.taskId, {
            firedTurnId: result.firedTurnId ?? `${task.taskId}:fired:${finishedAt}`,
            resultSummary: result.resultSummary ?? null,
          }, finishedAt)
          completed += 1
        }
        else if (result.status === 'blocked') {
          const retryPlan = deriveAlicizationLearningTaskRetryPlan({
            task,
            status: result.status,
            nowMs: finishedAt,
            currentAttemptCount: task.attemptCount + 1,
            failureKind: result.failureKind,
            error: result.error,
            resultSummary: result.resultSummary,
            explicitNextRetryAt: result.nextRetryAt,
          })
          await options.blockLearningTask(task.taskId, {
            reason: appendSameHerContinuityGuard({
              text: result.error ?? 'learning task blocked',
              projectStateContinuity: task.payload.projectStateContinuity ?? null,
            }) ?? 'learning task blocked',
            resultSummary: appendSameHerContinuityGuard({
              text: result.resultSummary ?? null,
              projectStateContinuity: task.payload.projectStateContinuity ?? null,
            }),
            failureKind: retryPlan.failureKind,
            nextRetryAt: retryPlan.retryDueAt,
          }, finishedAt)
          blocked += 1
        }
        else if (result.status === 'reopened') {
          await options.reopenLearningTask(task.taskId, {
            reason: appendSameHerContinuityGuard({
              text: result.error ?? result.resultSummary ?? null,
              projectStateContinuity: task.payload.projectStateContinuity ?? null,
            }),
            triggerAt: result.nextRetryAt ?? finishedAt + 60_000,
          }, finishedAt)
          reopened += 1
        }
        else if (result.status === 'downgraded') {
          await options.downgradeLearningTask(task.taskId, {
            reason: appendSameHerContinuityGuard({
              text: result.error ?? result.resultSummary ?? null,
              projectStateContinuity: task.payload.projectStateContinuity ?? null,
            }),
          }, finishedAt)
          downgraded += 1
        }
        else if (result.status === 'cancelled') {
          await options.cancelLearningTask(task.taskId, {
            reason: result.error ?? result.resultSummary ?? null,
          }, finishedAt)
          cancelled += 1
        }
        else {
          const retryPlan = deriveAlicizationLearningTaskRetryPlan({
            task,
            status: result.status,
            nowMs: finishedAt,
            currentAttemptCount: task.attemptCount + 1,
            failureKind: result.failureKind,
            error: result.error,
            resultSummary: result.resultSummary,
            explicitNextRetryAt: result.nextRetryAt,
          })
          await options.failLearningTask(task.taskId, {
            error: appendSameHerContinuityGuard({
              text: result.error ?? 'learning execution failed',
              projectStateContinuity: task.payload.projectStateContinuity ?? null,
            }) ?? 'learning execution failed',
            failureKind: retryPlan.failureKind,
            nextRetryAt: retryPlan.retryDueAt,
          }, finishedAt)
          failed += 1
        }

        await options.appendAuditLog({
          level: result.status === 'completed' ? 'notice' : 'warning',
          category: 'alicization.learning',
          action: 'alicization.learning.task.executed',
          message: 'Executed due learning action task.',
          payload: {
            taskId: task.taskId,
            action: task.action,
            triggerAt: task.triggerAt,
            sourceTurnId: task.sourceTurnId ?? null,
            resultStatus: result.status,
            resultSummary: appendSameHerContinuityGuard({
              text: result.resultSummary ?? null,
              projectStateContinuity: task.payload.projectStateContinuity ?? null,
            }),
            failureKind: result.failureKind ?? null,
            error: appendSameHerContinuityGuard({
              text: result.error ?? null,
              projectStateContinuity: task.payload.projectStateContinuity ?? null,
            }),
            nextRetryAt: result.nextRetryAt ?? null,
            sameHerContinuityGuard: deriveSameHerContinuityGuard(task.payload.projectStateContinuity ?? null),
            selfRevisionEvent: result.selfRevisionEvent ?? null,
            selfRevisionStatePatch: result.selfRevisionStatePatch ?? null,
            selfRevisionPolicyConsumers: result.selfRevisionStatePatch?.lanes ?? [],
          },
        }, cardId)
      }
      catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        const finishedAt = options.now()
        const retryPlan = deriveAlicizationLearningTaskRetryPlan({
          task,
          status: 'failed',
          nowMs: finishedAt,
          currentAttemptCount: task.attemptCount + 1,
          failureKind: 'runtime-error',
          error: reason,
        })
        await options.failLearningTask(task.taskId, {
          error: reason,
          failureKind: retryPlan.failureKind,
          nextRetryAt: retryPlan.retryDueAt,
        }, finishedAt).catch(() => {})
        failed += 1
      }
    }

    return {
      claimed: due.length,
      completed,
      failed,
      blocked,
      reopened,
      downgraded,
      cancelled,
    }
  }

  async function recoverRetryableLearningTasks(limit = 12) {
    const cardId = options.getActiveCardId()
    const nowMs = options.now()
    const candidates = await options.listLearningTasks({
      cardId,
      statuses: ['blocked', 'failed'],
      limit,
    }).catch(() => [])
    let reopened = 0
    let terminal = 0
    let waiting = 0

    for (const task of candidates) {
      const retryPlan = deriveAlicizationLearningTaskRetryPlan({
        task,
        status: task.status,
        nowMs,
        currentAttemptCount: task.attemptCount,
        failureKind: task.failureKind,
        error: task.lastError,
        resultSummary: task.resultSummary,
        explicitNextRetryAt: task.nextRetryAt,
      })
      if (!retryPlan.shouldRetry || !retryPlan.retryDueAt) {
        terminal += 1
        await options.appendAuditLog({
          level: 'warning',
          category: 'alicization.learning',
          action: 'alicization.learning.task.retry.terminal',
          message: 'Learning task retry budget closed without visible reply fallback.',
          payload: {
            taskId: task.taskId,
            action: task.action,
            status: task.status,
            attemptCount: task.attemptCount,
            maxAttempts: task.maxAttempts,
            failureKind: retryPlan.failureKind,
            reason: retryPlan.reason,
            lastError: appendSameHerContinuityGuard({
              text: task.lastError,
              projectStateContinuity: task.payload.projectStateContinuity ?? null,
            }),
            sameHerContinuityGuard: deriveSameHerContinuityGuard(task.payload.projectStateContinuity ?? null),
          },
        }, cardId)
        continue
      }
      if (retryPlan.retryDueAt > nowMs) {
        waiting += 1
        continue
      }
      await options.reopenLearningTask(task.taskId, {
        reason: appendSameHerContinuityGuard({
          text: retryPlan.reason,
          projectStateContinuity: task.payload.projectStateContinuity ?? null,
        }) ?? retryPlan.reason,
        triggerAt: nowMs,
      }, nowMs)
      reopened += 1
      await options.appendAuditLog({
        level: 'notice',
        category: 'alicization.learning',
        action: 'alicization.learning.task.retry.reopened',
        message: 'Reopened retryable learning task after backoff.',
        payload: {
          taskId: task.taskId,
          action: task.action,
          previousStatus: task.status,
          attemptCount: task.attemptCount,
          maxAttempts: task.maxAttempts,
          failureKind: retryPlan.failureKind,
          nextRetryAt: retryPlan.retryDueAt,
          reason: appendSameHerContinuityGuard({
            text: retryPlan.reason,
            projectStateContinuity: task.payload.projectStateContinuity ?? null,
          }),
          sameHerContinuityGuard: deriveSameHerContinuityGuard(task.payload.projectStateContinuity ?? null),
        },
      }, cardId)
    }

    return {
      scanned: candidates.length,
      reopened,
      terminal,
      waiting,
    }
  }

  return {
    deriveLearningTask,
    scheduleLearningTask,
    processDueLearningTasks,
    recoverRetryableLearningTasks,
  }
}
