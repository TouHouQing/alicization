import type {
  AlicizationEpisodicEventRecord,
  AlicizationTaskThreadRecord,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionActionInput,
  AlicizationAgentSessionContinuityInput,
} from './agent-runtime'
import type { AlicizationPerceptionSceneResidue } from './attention-anchor'
import type {
  AlicizationPendingProactiveOutcome,
  AlicizationProactiveLoopState,
  AlicizationRecentProactiveOutcome,
} from './proactive-feedback'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  formatAlicizationProjectStateAwarenessFields,
} from '@proj-alicization/stage-shared'

import {
  buildDeferredAutonomyCanonicalSignal,
  deferredAutonomyContinuityBudgets,
  normalizeDeferredAutonomyCanonicalFreeText,
  normalizeDeferredAutonomyCanonicalText,
  resolveDeferredAutonomySummary,
} from './runtime-deferred-autonomy-summary'

interface CreateAlicizationSessionContinuityBuildersRuntimeOptions {
  sanitizeText: (raw: unknown, fallback?: string) => string
  sanitizeBriefText: (raw: string, maxChars: number) => string
  sanitizeExecutionLedgerText: (raw: unknown, maxLength: number) => string
  readTaskThreadActivityAt: (thread: AlicizationTaskThreadRecord) => number
  terminalTaskThreadStatuses: Set<AlicizationTaskThreadRecord['status']>
  proactiveReplyWindowMs: number
  proactiveImplicitIgnoredAfterMs: number
  proactiveDismissCooldownMs: number
  autobiographicalAfterglowMs?: number
  buildVisualPresenceCapturePersistFingerprint: (state: AlicizationVisualPresenceStateSnapshot) => string
}

export function createAlicizationSessionContinuityBuildersRuntime(options: CreateAlicizationSessionContinuityBuildersRuntimeOptions) {
  const {
    sanitizeText,
    sanitizeBriefText,
    sanitizeExecutionLedgerText,
    readTaskThreadActivityAt,
    terminalTaskThreadStatuses,
    proactiveReplyWindowMs,
    proactiveImplicitIgnoredAfterMs,
    proactiveDismissCooldownMs,
    autobiographicalAfterglowMs = 72 * 60 * 60 * 1000,
    buildVisualPresenceCapturePersistFingerprint,
  } = options

  function asRecord(raw: unknown) {
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? raw as Record<string, unknown>
      : null
  }

  function asStringArray(raw: unknown) {
    return Array.isArray(raw)
      ? raw.map(value => sanitizeExecutionLedgerText(value, 120)).filter(Boolean)
      : []
  }

  type ProjectStateCarryField
    = | 'identity'
      | 'phase'
      | 'awareness'
      | 'preflight'
      | 'landed'
      | 'open'
      | 'next'
      | 'continuity_anchor'
      | 'continuity_hold'
      | 'continuity_drift_risk'
      | 'emotional_closure'
      | 'summary'
      | 'generic'

  function extractStructuredProjectStateField(structured: string, key: string) {
    return structured
      .split('|')
      .map(part => part.trim())
      .find(part => part.startsWith(`${key}=`))
      ?.replace(new RegExp(`^${key}=`, 'u'), '')
      .trim()
      || ''
  }

  function structureEmbodimentProjectCarry(raw: string) {
    const lower = raw.toLowerCase()
    const mentionedLanes = [
      /\bbody\b|身体/u.test(lower) ? 'body' : '',
      /\bface\b|表情/u.test(lower) ? 'face' : '',
      /\bmotion\b|动作/u.test(lower) ? 'motion' : '',
      /\blipsync\b|lip sync|唇型/u.test(lower) ? 'lipsync' : '',
      /\bvoice\b|声音/u.test(lower) ? 'voice' : '',
    ].filter(Boolean)
    if (!mentionedLanes.length)
      return ''

    const pendingSource = lower.match(/(?:while|but)\s+([^.!?。]+?)\s+(?:need|needs|still need|still needs|还要|需要)\s+(?:to\s+)?(?:rejoin|close|接回|闭环)/u)?.[1] ?? ''
    const pendingLanes = [
      /\bbody\b|身体/u.test(pendingSource) ? 'body' : '',
      /\bface\b|表情/u.test(pendingSource) ? 'face' : '',
      /\bmotion\b|动作/u.test(pendingSource) ? 'motion' : '',
      /\blipsync\b|lip sync|唇型/u.test(pendingSource) ? 'lipsync' : '',
      /\bvoice\b|声音/u.test(pendingSource) ? 'voice' : '',
    ].filter(Boolean)
    const activeLanes = mentionedLanes.filter(lane => !pendingLanes.includes(lane))

    return [
      `embodiment_lanes=${(activeLanes.length ? activeLanes : mentionedLanes).join('+')}`,
      pendingLanes.length ? `pending_lanes=${pendingLanes.join('+')}` : '',
      `status=${pendingLanes.length ? 'missing_lanes' : 'partial'}`,
    ].filter(Boolean).join('; ')
  }

  function structuredProjectStateCarryFromFixedTemplate(
    normalized: string,
    maxChars: number,
    field: ProjectStateCarryField,
  ) {
    if (field === 'identity')
      return ''
    if (field === 'phase')
      return ''

    const embodimentFact = structureEmbodimentProjectCarry(normalized)
    if (embodimentFact && (field === 'awareness' || field === 'summary'))
      return embodimentFact

    if (
      (field === 'next' || field === 'emotional_closure')
      && /repair[_-]before[_-]closeness|repair before closeness|repair-first|repair first|先修复|修复优先/u.test(normalized)
    ) {
      return ''
    }

    if (field === 'preflight') {
      const carriesExplicitProjectFacts
        = /(?:^|\|\s*)(identity|phase|landed|open|next|continuity_anchor|continuity_hold|continuity_drift_risk|emotional_closure)=/iu.test(normalized)
          || /memory|initiative|embodiment|dialogue|execution|visible reply|voice|face|motion|lipsync|记忆|主动性|具身|对话|执行/u.test(normalized)
      if (!carriesExplicitProjectFacts)
        return alicizationFixedTemplateReplacement
    }

    if (field === 'summary') {
      const lower = normalized.toLowerCase()
      const summaryHasOldCue = /callback|回调|lower-pressure|low-pressure|measured-return|measured return|leave room|more room|repair[_-]before[_-]closeness|repair before closeness|repair-first|repair first|先修复|修复优先/u.test(lower)
      if (summaryHasOldCue)
        return ''
    }

    const structuredAwareness = formatAlicizationProjectStateAwarenessFields({
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
    })

    if (field === 'awareness' || field === 'preflight')
      return structuredAwareness

    const fieldKey = field === 'landed'
      ? 'landed'
      : field === 'open'
        ? 'open'
        : field === 'next'
          ? 'next'
          : field === 'continuity_anchor'
            ? 'continuity_anchor'
            : field === 'continuity_hold'
              ? 'continuity_hold'
              : field === 'continuity_drift_risk'
                ? 'continuity_drift_risk'
                : field === 'emotional_closure'
                  ? 'continuity_hold'
                  : field === 'summary'
                    ? 'summary'
                    : ''
    if (!fieldKey)
      return alicizationFixedTemplateReplacement

    return extractStructuredProjectStateField(structuredAwareness, fieldKey)
      || alicizationFixedTemplateReplacement
  }

  function sanitizeProjectStateCarryText(
    raw: unknown,
    maxChars: number,
    field: ProjectStateCarryField = 'generic',
  ) {
    const normalized = sanitizeBriefText(typeof raw === 'string' ? raw : '', maxChars)
    if (!normalized)
      return ''
    if (!containsAlicizationFixedTemplateResidue(normalized))
      return normalized

    return sanitizeBriefText(
      structuredProjectStateCarryFromFixedTemplate(normalized, maxChars, field),
      maxChars,
    ) || alicizationFixedTemplateReplacement
  }

  function sanitizeRuntimeContinuityToken(raw: unknown, maxChars: number) {
    const normalized = sanitizeBriefText(typeof raw === 'string' ? raw : '', maxChars)
    if (!normalized)
      return ''
    return containsAlicizationFixedTemplateResidue(normalized)
      ? sanitizeBriefText(
          normalized
            .replace(/same[-_ ]her/giu, 'continuity')
            .replace(/same[-_ ]living[-_ ]line/giu, 'continuity-line')
            .replace(/same[-_ ]digital[-_ ]life/giu, 'phase1-local-digital-life')
            .replace(/phase\s*1\s*:\s*local\s*digital\s*life/giu, 'phase1-local-digital-life')
            .replace(/one[-_ ]?continuous[-_ ]?her/giu, 'continuity')
            .replace(/local[-_ ]first[-_ ]digital[-_ ]life[-_ ]project/giu, 'phase1-local-digital-life')
            .replace(/同一个\s*her|同一个她/giu, 'continuity')
            .replace(/数字生命主线/gu, 'phase1-local-digital-life'),
          maxChars,
        )
      : normalized
  }

  function normalizeExecutionDeliveryStatus(
    status: AlicizationTaskThreadRecord['status'],
  ): AlicizationAgentSessionActionInput['status'] {
    return status === 'completed' ? 'completed' : 'failed'
  }

  function resolveProjectStateCarryFromEvent(event: AlicizationEpisodicEventRecord) {
    void event
    return {
      projectStatePreDialogueAwarenessLine: null,
      projectStatePreflightSummary: null,
      projectLatestLandedProgress: null,
      projectIdentity: null,
      projectPhase: null,
      projectStateSameHerSelfLine: null,
      projectPrimaryOpenLoop: null,
      projectNextClosureTarget: null,
      projectStateOpenFocusSummary: null,
      projectStateNextFocusSummary: null,
    }
  }

  function buildExecutionDeliveryAction(entry: {
    channel: string
    completedAt: number
    decisionTraceId: string | null
    sessionId: string
    signature: string
    status: AlicizationTaskThreadRecord['status']
    summary: string
    threadId: string
    turnId: string | null
  }) {
    return {
      kind: 'executor' as const,
      status: normalizeExecutionDeliveryStatus(entry.status),
      label: `callback:${sanitizeExecutionLedgerText(entry.channel, 48) || 'executor'}`,
      summary: entry.summary,
      signature: entry.signature,
      finishedAt: entry.completedAt,
      metadata: {
        source: 'execution-delivery-runtime',
        threadId: entry.threadId,
        decisionTraceId: entry.decisionTraceId,
        turnId: entry.turnId,
        sessionId: entry.sessionId,
        selectedChannel: entry.channel,
        threadStatus: entry.status,
      },
    }
  }

  function normalizeTaskThreadSessionMirrorStatus(
    status: AlicizationTaskThreadRecord['status'],
  ): AlicizationAgentSessionActionInput['status'] {
    if (status === 'completed')
      return 'completed'
    if (status === 'failed' || status === 'cancelled' || status === 'blocked')
      return 'failed'
    return 'pending'
  }

  function buildTaskThreadSessionMirrorAction(input: {
    source: string
    thread: AlicizationTaskThreadRecord
  }): AlicizationAgentSessionActionInput {
    const channel = sanitizeExecutionLedgerText(
      input.thread.selectedChannel ?? input.thread.proposedChannel ?? input.thread.kind,
      48,
    ) || 'executor'
    const labelPrefix = input.source === 'task-planning'
      ? 'plan'
      : input.source === 'task-dispatch'
        ? 'dispatch'
        : input.source === 'execution-delivery-queued'
          ? 'settled'
          : 'thread'
    const activityAt = readTaskThreadActivityAt(input.thread)

    const threadMetadata = asRecord(input.thread.metadata)
    const fabricMetadata = asRecord(threadMetadata?.fabric)
    return {
      kind: 'executor',
      status: normalizeTaskThreadSessionMirrorStatus(input.thread.status),
      label: `${labelPrefix}:${channel}`,
      summary: sanitizeExecutionLedgerText(input.thread.summary ?? '', 180) || null,
      signature: [
        input.source,
        input.thread.id,
        input.thread.status,
        activityAt,
      ].join(':'),
      startedAt: input.thread.createdAt,
      finishedAt: terminalTaskThreadStatuses.has(input.thread.status)
        ? activityAt
        : null,
      metadata: {
        source: input.source,
        threadId: input.thread.id,
        decisionTraceId: input.thread.decisionTraceId,
        turnId: input.thread.turnId,
        sessionId: input.thread.sessionId,
        selectedChannel: input.thread.selectedChannel,
        proposedChannel: input.thread.proposedChannel,
        threadStatus: input.thread.status,
        goal: input.thread.goal,
        threadKind: input.thread.kind,
        fabricState: sanitizeExecutionLedgerText(fabricMetadata?.state, 64) || null,
        affirmationReasonCodes: asStringArray(fabricMetadata?.affirmationReasonCodes),
      },
    }
  }

  function buildSceneResidueSessionMirrorAction(input: {
    source: string
    residue: AlicizationPerceptionSceneResidue
  }): AlicizationAgentSessionActionInput {
    const label = input.residue.source === 'screen-semantic-summary'
      ? 'scene:semantic'
      : 'scene:inspection'
    const summary = sanitizeExecutionLedgerText(
      input.residue.summary
      ?? `${input.residue.workloadKind}/${input.residue.contentKind}`,
      180,
    ) || `${input.residue.workloadKind}/${input.residue.contentKind}`
    const focusSignature = sanitizeText(
      input.residue.focusTarget?.title
      ?? input.residue.focusTarget?.appName
      ?? input.residue.focusTarget?.processName
      ?? '',
    ).slice(0, 120)

    return {
      kind: 'sensory',
      status: 'completed',
      label,
      summary,
      signature: [
        input.source,
        input.residue.source,
        input.residue.observedAt,
        focusSignature,
      ].join(':'),
      startedAt: input.residue.observedAt,
      finishedAt: input.residue.observedAt,
      metadata: {
        source: input.source,
        residueSource: input.residue.source,
        workloadKind: input.residue.workloadKind,
        contentKind: input.residue.contentKind,
        focusSource: input.residue.focusSource,
        captureSourceName: input.residue.captureSourceName,
        captureStrategy: input.residue.captureStrategy,
      },
    }
  }

  function buildReminderContinuitySignal(input: {
    delayMinutes: number
    task: {
      taskId: string
      triggerAt: number
      message: string
      sourceTurnId?: string | null
    }
    tier: 'mild' | 'severe'
    trigger: 'startup' | 'timer' | 'force'
  }): AlicizationAgentSessionContinuityInput {
    const summary = [
      input.tier === 'severe' ? 'overdue reminder' : 'due reminder',
      `${Math.max(0, input.delayMinutes).toFixed(1)}m late`,
      sanitizeBriefText(input.task.message, 140) || 'reminder',
    ].join(' | ')
    return {
      kind: 'reminder',
      state: 'pending',
      label: `reminder:${sanitizeBriefText(input.task.taskId, 80) || 'due'}`,
      summary,
      signature: [
        'reminder',
        sanitizeBriefText(input.task.taskId, 120),
        Math.max(0, Math.floor(Number(input.task.triggerAt ?? 0))),
      ].join(':'),
      createdAt: Number.isFinite(input.task.triggerAt)
        ? Math.max(0, Math.floor(Number(input.task.triggerAt)))
        : Date.now(),
      metadata: {
        taskId: sanitizeBriefText(input.task.taskId, 120) || null,
        tier: input.tier,
        trigger: input.trigger,
        delayMinutes: Number(input.delayMinutes.toFixed(1)),
        message: sanitizeBriefText(input.task.message, 200) || null,
        sourceTurnId: sanitizeBriefText(input.task.sourceTurnId ?? '', 160) || null,
      },
    }
  }

  function buildReminderSessionMirrorAction(input: {
    delayMinutes: number
    firedTurnId?: string | null
    task: {
      taskId: string
      triggerAt: number
      message: string
      sourceTurnId?: string | null
    }
    tier: 'mild' | 'severe'
    trigger: 'startup' | 'timer' | 'force'
  }): AlicizationAgentSessionActionInput {
    const taskId = sanitizeBriefText(input.task.taskId, 120)
    const labelTaskId = sanitizeBriefText(input.task.taskId, 80)
    const triggerAt = Number.isFinite(input.task.triggerAt)
      ? Math.max(0, Math.floor(Number(input.task.triggerAt)))
      : Date.now()
    const finishedAt = Math.max(triggerAt, Date.now())
    const summary = sanitizeExecutionLedgerText(
      [
        input.tier === 'severe' ? 'overdue reminder delivered' : 'due reminder delivered',
        `${Math.max(0, input.delayMinutes).toFixed(1)}m late`,
        sanitizeBriefText(input.task.message, 140) || 'reminder',
      ].join(' | '),
      180,
    )

    return {
      kind: 'runtime',
      status: 'completed',
      label: `reminder:${labelTaskId || 'due'}`,
      summary: summary || 'reminder delivered',
      signature: [
        'reminder-delivery',
        taskId,
        triggerAt,
        sanitizeBriefText(input.firedTurnId ?? '', 120),
      ].join(':'),
      startedAt: triggerAt,
      finishedAt,
      metadata: {
        source: 'reminder-delivery-runtime',
        trigger: input.trigger,
        tier: input.tier,
        delayMinutes: Number(input.delayMinutes.toFixed(1)),
        taskId: taskId || null,
        message: sanitizeBriefText(input.task.message, 200) || null,
        sourceTurnId: sanitizeBriefText(input.task.sourceTurnId ?? '', 160) || null,
        firedTurnId: sanitizeBriefText(input.firedTurnId ?? '', 160) || null,
      },
    }
  }

  function buildProactiveOutcomeContinuitySignal(
    outcome: AlicizationRecentProactiveOutcome,
  ): AlicizationAgentSessionContinuityInput {
    const scenario = sanitizeText(outcome.scenario) || 'general'
    const outcomeName = sanitizeText(outcome.outcome) || 'observed'
    const turnId = sanitizeRuntimeContinuityToken(outcome.turnId, 120)
    const learningAction = sanitizeText(outcome.learningAction ?? '') || null
    const learningFocuses = Array.isArray(outcome.learningFocuses)
      ? outcome.learningFocuses
          .map(item => sanitizeBriefText(item, 96))
          .filter(item => Boolean(item) && item !== 'same-her-inward-carry')
          .slice(0, 3)
      : []

    return {
      kind: 'proactive',
      state: 'observed',
      label: `proactive:${scenario}:${outcomeName}`,
      summary: null,
      signature: [
        'proactive-outcome',
        turnId,
        outcomeName,
      ].join(':'),
      createdAt: Math.max(0, Math.floor(Number(outcome.createdAt) || Date.now())),
      metadata: {
        source: 'proactive-feedback',
        turnId: turnId || null,
        scenario,
        outcome: outcomeName,
        learningAction,
        learningFocuses,
        projectStateOpenFocusSummary: null,
        projectStateNextFocusSummary: null,
        projectStateEmotionalClosureCue: null,
      },
    }
  }

  function buildProactiveFeedbackSessionMirrorAction(input: {
    outcome: AlicizationRecentProactiveOutcome
    source: string
  }): AlicizationAgentSessionActionInput {
    const scenario = sanitizeText(input.outcome.scenario) || 'general'
    const outcomeName = sanitizeText(input.outcome.outcome) || 'observed'
    const turnId = sanitizeBriefText(input.outcome.turnId, 120)
    const createdAt = Math.max(0, Math.floor(Number(input.outcome.createdAt) || Date.now()))

    return {
      kind: 'runtime',
      status: 'completed',
      label: `proactive-feedback:${scenario}:${outcomeName}`,
      summary: null,
      signature: [
        'proactive-feedback',
        input.source,
        turnId,
        outcomeName,
        createdAt,
      ].join(':'),
      startedAt: createdAt,
      finishedAt: createdAt,
      metadata: {
        source: input.source,
        turnId: turnId || null,
        scenario,
        outcome: outcomeName,
      },
    }
  }

  function buildPendingProactiveContinuitySignal(input: {
    now: number
    pending: AlicizationPendingProactiveOutcome
  }): AlicizationAgentSessionContinuityInput {
    const scenario = sanitizeText(input.pending.scenario) || 'general'
    const turnId = sanitizeRuntimeContinuityToken(input.pending.turnId, 120)
    const learningAction = sanitizeText(input.pending.learningAction ?? '') || null
    const learningFocuses = Array.isArray(input.pending.learningFocuses)
      ? input.pending.learningFocuses
          .map(item => sanitizeBriefText(item, 96))
          .filter(item => Boolean(item) && item !== 'same-her-inward-carry')
          .slice(0, 3)
      : []
    return {
      kind: 'proactive',
      state: 'pending',
      label: `proactive:${scenario}:pending`,
      summary: null,
      signature: [
        'proactive-pending',
        turnId,
      ].join(':'),
      createdAt: Math.max(0, Math.floor(Number(input.pending.deliveredAt) || Date.now())),
      metadata: {
        source: 'proactive-feedback',
        phase: 'pending',
        turnId: turnId || null,
        scenario,
        deliveredAt: Math.max(0, Math.floor(Number(input.pending.deliveredAt) || 0)),
        feedbackWindowMs: Math.max(1_000, Math.floor(Number(input.pending.feedbackWindowMs) || proactiveReplyWindowMs)),
        learningAction,
        learningFocuses,
        projectStateOpenFocusSummary: null,
        projectStateNextFocusSummary: null,
        projectStateEmotionalClosureCue: null,
      },
    }
  }

  function buildDeferredAutonomyContinuitySignal(input: {
    now: number
    turnId: string
    scenario: string
    reason: string
    projectState?: {
      preflightSummary?: string | null
      preDialogueAwarenessLine?: string | null
      preDialogueAwarenessSummary?: string | null
      companionHeadlineLine?: string | null
      companionBriefingLine?: string | null
      identity?: string | null
      currentPhase?: string | null
      latestProgress?: string | null
      latestLandedProgress?: string | null
      landedProgressSummary?: string | null
      memoryClosureSummary?: string | null
      primaryOpenLoop?: string | null
      openClosureSummary?: string | null
      nextClosureTarget?: string | null
      nextClosureTargetSummary?: string | null
      sameHerSelfLine?: string | null
      sameHerHoldDetail?: string | null
      sameHerDriftRisk?: string | null
      sameHerDriftRiskSummary?: string | null
      openFocusSummary?: string | null
      nextFocusSummary?: string | null
      emotionalClosureCue?: string | null
    } | null
    autonomy?: {
      deferReason?: string | null
      whyNow?: string | null
      sourceThreadId?: string | null
      sourceThoughtThreadId?: string | null
      sourceConcernId?: string | null
      executionIntent?: {
        id?: string | null
        kind?: string | null
        summary?: string | null
        targetThreadId?: string | null
      } | null
    } | null
  }): AlicizationAgentSessionContinuityInput {
    const scenario = normalizeDeferredAutonomyCanonicalText(
      input.scenario,
      deferredAutonomyContinuityBudgets.scenario,
    ) || 'general'
    const turnId = normalizeDeferredAutonomyCanonicalText(
      input.turnId,
      deferredAutonomyContinuityBudgets.turnId,
    )
    const reason = normalizeDeferredAutonomyCanonicalText(
      input.reason,
      deferredAutonomyContinuityBudgets.reasonCode,
    )
    const deferReason = normalizeDeferredAutonomyCanonicalFreeText(
      input.autonomy?.deferReason,
      deferredAutonomyContinuityBudgets.deferReason,
    )
    const whyNow = normalizeDeferredAutonomyCanonicalFreeText(
      input.autonomy?.whyNow,
      deferredAutonomyContinuityBudgets.whyNow,
    )
    const sourceThreadId = normalizeDeferredAutonomyCanonicalText(
      input.autonomy?.sourceThreadId ?? '',
      deferredAutonomyContinuityBudgets.threadId,
    )
    const sourceThoughtThreadId = normalizeDeferredAutonomyCanonicalText(
      input.autonomy?.sourceThoughtThreadId ?? '',
      deferredAutonomyContinuityBudgets.threadId,
    )
    const sourceConcernId = normalizeDeferredAutonomyCanonicalText(
      input.autonomy?.sourceConcernId ?? '',
      deferredAutonomyContinuityBudgets.threadId,
    )
    const executionIntentKind = normalizeDeferredAutonomyCanonicalText(
      input.autonomy?.executionIntent?.kind ?? '',
      deferredAutonomyContinuityBudgets.intentId,
    )
    const explicitIntentId = normalizeDeferredAutonomyCanonicalText(
      input.autonomy?.executionIntent?.id ?? '',
      deferredAutonomyContinuityBudgets.intentId,
    )
    const intentId = explicitIntentId || executionIntentKind
    const executionIntentSummary = normalizeDeferredAutonomyCanonicalFreeText(
      input.autonomy?.executionIntent?.summary ?? '',
      deferredAutonomyContinuityBudgets.executionIntentSummary,
    )
    const targetThreadId = normalizeDeferredAutonomyCanonicalText(
      input.autonomy?.executionIntent?.targetThreadId ?? '',
      deferredAutonomyContinuityBudgets.threadId,
    )
    const hasHeldAutonomyThreadAnchor = Boolean(sourceThoughtThreadId)
      || Boolean(sourceConcernId)
    const explicitHeldAutonomyIntent = Boolean(intentId)
      || Boolean(executionIntentSummary)
      || hasHeldAutonomyThreadAnchor
    const visibleUtteranceWasDeferred
      = reason === 'proactive-visible-presence-without-utterance'
        || reason === 'provider-mind-unavailable-for-proactive-visible-utterance'
    const shouldUseDeferredProactiveLine
      = visibleUtteranceWasDeferred
        && (
          !explicitHeldAutonomyIntent
          || executionIntentKind === 'repair'
        )
    const source = shouldUseDeferredProactiveLine
      ? 'proactive-deferred'
      : 'proactive-held-autonomy'
    const summarySelection = resolveDeferredAutonomySummary({
      mode: source === 'proactive-deferred' ? 'deferred' : 'held-autonomy',
      whyNow,
      executionIntentSummary,
      failureCandidates: [deferReason],
      inferenceSources: {
        whyNow: input.autonomy?.whyNow,
        executionIntentSummary: input.autonomy?.executionIntent?.summary,
        failureCandidates: [input.autonomy?.deferReason],
      },
    })
    return buildDeferredAutonomyCanonicalSignal({
      createdAt: input.now,
      deferReason,
      executionIntentKind,
      executionIntentSummary,
      failure: summarySelection.failure,
      intentId,
      reasonCode: reason,
      scenario,
      source,
      sourceConcernId,
      sourceThreadId,
      sourceThoughtThreadId,
      summary: summarySelection.summary,
      summaryOwner: summarySelection.summaryOwner,
      targetThreadId,
      threadId: sourceThreadId || targetThreadId,
      turnId,
      whyNow,
    })
  }

  function buildProactiveContinuitySignals(
    state: AlicizationProactiveLoopState,
    now = Date.now(),
  ): AlicizationAgentSessionContinuityInput[] {
    const signals: AlicizationAgentSessionContinuityInput[] = []
    const latestPending = [...state.pendingOutcomes]
      .sort((left, right) => left.deliveredAt - right.deliveredAt)
      .at(-1)
    const latestOutcome = [...state.recentOutcomes]
      .sort((left, right) => left.createdAt - right.createdAt)
      .at(-1)

    const pendingIsSupersededByLatestOutcome = Boolean(
      latestPending
      && latestOutcome
      && latestPending.turnId === latestOutcome.turnId
      && latestOutcome.createdAt >= latestPending.deliveredAt,
    )

    if (
      latestPending
      && !pendingIsSupersededByLatestOutcome
      && now - latestPending.deliveredAt <= Math.max(latestPending.feedbackWindowMs, proactiveImplicitIgnoredAfterMs)
    ) {
      signals.push(buildPendingProactiveContinuitySignal({
        now,
        pending: latestPending,
      }))
    }

    if (latestOutcome && now - latestOutcome.createdAt <= proactiveDismissCooldownMs) {
      signals.push(buildProactiveOutcomeContinuitySignal(latestOutcome))
    }

    return signals
      .filter(signal => Number.isFinite(signal.createdAt))
      .sort((left, right) => Number(left.createdAt) - Number(right.createdAt))
  }

  function buildDialogueContinuitySignal(
    state: AlicizationVisualPresenceStateSnapshot,
  ): AlicizationAgentSessionContinuityInput | null {
    const dialogueThread = state.dialogueWorldThread
    if (!dialogueThread)
      return null

    const activeThread = sanitizeBriefText(dialogueThread.activeThread, 160)
    const primaryAnchor = sanitizeBriefText(dialogueThread.primaryTurnAnchor ?? '', 140)
    const currentQuestion = sanitizeBriefText(dialogueThread.currentQuestion ?? '', 140)
    const openLoop = sanitizeBriefText(dialogueThread.openLoops[0] ?? '', 140)
    const recentlyResolved = sanitizeBriefText(dialogueThread.recentlyResolvedLoops[0] ?? '', 140)
    const carryReason = sanitizeBriefText(dialogueThread.carryReason ?? '', 140)
    const pendingValidation = sanitizeBriefText(dialogueThread.pendingValidation?.question ?? '', 140)
    const relationDrift = sanitizeText(dialogueThread.relationDrift) || 'steady'
    const memoryMode = sanitizeText(dialogueThread.memoryMode)
    const lastOutcome = sanitizeText(dialogueThread.lastOutcome)
    const shouldSurface = Boolean(
      activeThread
      || primaryAnchor
      || currentQuestion
      || openLoop
      || pendingValidation
      || dialogueThread.carryEligible === true,
    )

    if (!shouldSurface)
      return null

    return {
      kind: 'dialogue',
      state: openLoop || pendingValidation || lastOutcome === 'pending' || lastOutcome === 'repairing' || lastOutcome === 'deferred'
        ? 'pending'
        : 'observed',
      label: `dialogue:${relationDrift}:${memoryMode || 'carry'}`,
      summary: [
        activeThread ? `thread=${activeThread}` : '',
        primaryAnchor ? `anchor=${primaryAnchor}` : '',
        currentQuestion ? `question=${currentQuestion}` : '',
        openLoop ? `open_loop=${openLoop}` : '',
        recentlyResolved ? `resolved=${recentlyResolved}` : '',
        carryReason ? `carry=${carryReason}` : '',
        `drift=${relationDrift}`,
        memoryMode ? `memory=${memoryMode}` : '',
        lastOutcome && lastOutcome !== 'none' ? `outcome=${lastOutcome}` : '',
        pendingValidation ? `validate=${pendingValidation}` : '',
      ].filter(Boolean).join(' | '),
      signature: [
        'dialogue-world-thread',
        Math.max(0, Math.floor(Number(dialogueThread.updatedAt) || 0)),
        activeThread || primaryAnchor || 'carry',
      ].join(':'),
      createdAt: Math.max(
        0,
        Math.floor(Number(dialogueThread.pendingValidation?.openedAt ?? dialogueThread.updatedAt) || Date.now()),
      ),
      metadata: {
        source: 'dialogue-world-thread',
        activeThread: activeThread || null,
        primaryAnchor: primaryAnchor || null,
        currentQuestion: currentQuestion || null,
        openLoop: openLoop || null,
        carryReason: carryReason || null,
        relationDrift,
        memoryMode: memoryMode || null,
        lastOutcome: lastOutcome || null,
        carryEligible: dialogueThread.carryEligible === true,
      },
    }
  }

  function buildVisualPresenceContinuitySignal(
    state: AlicizationVisualPresenceStateSnapshot,
  ): AlicizationAgentSessionContinuityInput | null {
    const sceneSummary = sanitizeBriefText(state.currentScene?.summary ?? '', 120)
    const activeThread = state.worldModel?.activeThread ?? null
    const activeThreadTitle = sanitizeBriefText(activeThread?.title ?? '', 96)
    const activeThreadSummary = sanitizeBriefText(activeThread?.summary ?? '', 120)
    const dialogueThread = sanitizeBriefText(
      state.dialogueWorldThread?.activeThread
      ?? state.dialogueWorldThread?.currentQuestion
      ?? '',
      120,
    )
    const captureHealth = sanitizeText(state.captureState.health, '')
    const degradedReason = sanitizeBriefText(state.captureState.degradedReason ?? '', 96)
    const embodiedPresence = sanitizeText(state.privateThought?.embodiedPresence, '')
    const summary = [
      sceneSummary ? `scene=${sceneSummary}` : '',
      activeThreadTitle
        ? `thread=${activeThreadTitle}`
        : activeThreadSummary
          ? `thread=${activeThreadSummary}`
          : '',
      dialogueThread ? `dialogue=${dialogueThread}` : '',
      captureHealth
        ? `capture=${captureHealth}${degradedReason ? `/${degradedReason}` : ''}`
        : '',
      embodiedPresence ? `presence=${embodiedPresence}` : '',
    ].filter(Boolean).join(' | ')

    if (!summary)
      return null

    return {
      kind: 'presence',
      state: 'observed',
      label: `presence:${sanitizeBriefText(state.watchMode, 48) || 'unknown'}`,
      summary,
      signature: `visual-presence:${buildVisualPresenceCapturePersistFingerprint(state)}`,
      createdAt: Number.isFinite(state.updatedAt) ? Math.max(0, Math.floor(state.updatedAt)) : Date.now(),
      metadata: {
        watchMode: state.watchMode,
        sceneSummary: sceneSummary || null,
        activeThreadKind: activeThread?.kind ?? null,
        activeThreadTitle: activeThreadTitle || null,
        activeThreadSummary: activeThreadSummary || null,
        dialogueThread: dialogueThread || null,
        captureHealth: captureHealth || null,
        degradedReason: degradedReason || null,
        embodiedPresence: embodiedPresence || null,
        updatedAt: Number.isFinite(state.updatedAt) ? Math.max(0, Math.floor(state.updatedAt)) : null,
      },
    }
  }

  function buildAutobiographicalAfterglowContinuitySignals(input: {
    activeSessionId?: string | null
    events: AlicizationEpisodicEventRecord[]
    now?: number
  }) {
    const now = Number.isFinite(input.now) ? Number(input.now) : Date.now()
    const activeSessionId = sanitizeBriefText(input.activeSessionId ?? '', 160) || null
    const candidates = input.events
      .filter((event) => {
        const ageMs = Math.max(0, now - event.occurredAt)
        if (ageMs > autobiographicalAfterglowMs)
          return false
        const tagSet = new Set(
          event.tags
            .map(tag => sanitizeRuntimeContinuityToken(tag, 80).toLowerCase())
            .filter(Boolean),
        )
        const provenance = event.latestReconsolidation?.provenance ?? event.provenance
        const afterglowTagged = [
          'afterthought',
          'continuity',
          'session-mirror',
          'dream',
        ].some(tag => tagSet.has(tag))
        || event.sourceKind === 'maintenance'
        || event.sourceKind === 'dream'
        || event.sourceKind === 'dream-reforge'
        || provenance === 'dreamt'
        if (!afterglowTagged)
          return false
        if (activeSessionId && event.sessionId && event.sessionId === activeSessionId)
          return false
        return true
      })
      .sort((left, right) => right.occurredAt - left.occurredAt)
      .slice(0, 3)

    return candidates.map((event) => {
      const ageMinutes = Math.max(0, (now - event.occurredAt) / 60_000)
      const threadAnchor = sanitizeRuntimeContinuityToken(event.threadAnchor ?? '', 120)
      const tags = event.tags.map(tag => sanitizeRuntimeContinuityToken(tag, 80).toLowerCase()).filter(Boolean)
      const tagSet = new Set(tags)
      const projectStateCarry = resolveProjectStateCarryFromEvent(event)
      const looksLikeExecutionCallback = [
        'execution-callback',
        'callback',
        'result-mode',
        'result-lead',
        'soft-handoff',
      ].some(tag => tagSet.has(tag))
      const carryMode = looksLikeExecutionCallback
        ? (
            ['repair-before-closeness', 'repair-first', 'callback-repair'].some(tag => tagSet.has(tag))
              ? 'repair-before-closeness'
              : ['lower-pressure', 'leave-room', 'bounded-room', 'space-first'].some(tag => tagSet.has(tag))
                  ? 'lower-pressure'
                  : ['trust-warming', 'soft-handoff', 'trust-open'].some(tag => tagSet.has(tag))
                      ? 'trust-warming'
                      : 'execution-callback'
          )
        : null
      const summaryLine = sanitizeProjectStateCarryText(
        event.relationshipMeaning
        || event.lesson
        || event.whatChanged
        || event.whatHappened,
        160,
        'summary',
      )
      const sourceTag = event.sourceKind === 'maintenance'
        ? 'afterglow'
        : event.sourceKind === 'dream' || event.sourceKind === 'dream-reforge'
          ? 'dream-continuity'
          : 'autobiographical-carry'
      return {
        kind: 'runtime' as const,
        state: ageMinutes <= 360 ? 'fresh' as const : 'observed' as const,
        label: looksLikeExecutionCallback
          ? `afterglow:execution-callback:${carryMode}`
          : `afterglow:${sourceTag}`,
        summary: [
          threadAnchor ? `thread=${threadAnchor}` : '',
          looksLikeExecutionCallback ? 'continuity=execution-callback' : '',
          carryMode ? `carry-mode=${carryMode}` : '',
          summaryLine ? `carry=${summaryLine}` : '',
          `source=${event.sourceKind}`,
          `provenance=${event.latestReconsolidation?.provenance ?? event.provenance}`,
          `${ageMinutes.toFixed(1)}m old`,
        ].filter(Boolean).join(' | '),
        signature: [
          'autobiographical-afterglow',
          sanitizeRuntimeContinuityToken(event.id, 160),
          event.occurredAt,
        ].join(':'),
        createdAt: Math.max(0, Math.floor(event.occurredAt)),
        metadata: {
          source: 'autobiographical-afterglow',
          episodeId: sanitizeRuntimeContinuityToken(event.id, 160),
          sourceKind: event.sourceKind,
          provenance: event.latestReconsolidation?.provenance ?? event.provenance,
          confidence: Number(event.latestReconsolidation?.confidence ?? event.confidence),
          threadAnchor: threadAnchor || null,
          sessionId: event.sessionId ?? null,
          fromPreviousSession: Boolean(activeSessionId && event.sessionId && event.sessionId !== activeSessionId),
          afterglowTag: sourceTag,
          continuityKind: looksLikeExecutionCallback ? 'execution-callback' : 'afterglow',
          executionCallbackCarryMode: carryMode,
          ...projectStateCarry,
        },
      } satisfies AlicizationAgentSessionContinuityInput
    })
  }

  return {
    buildExecutionDeliveryAction,
    buildTaskThreadSessionMirrorAction,
    buildSceneResidueSessionMirrorAction,
    buildReminderContinuitySignal,
    buildReminderSessionMirrorAction,
    buildProactiveFeedbackSessionMirrorAction,
    buildProactiveOutcomeContinuitySignal,
    buildDeferredAutonomyContinuitySignal,
    buildPendingProactiveContinuitySignal,
    buildProactiveContinuitySignals,
    buildDialogueContinuitySignal,
    buildVisualPresenceContinuitySignal,
    buildAutobiographicalAfterglowContinuitySignals,
  }
}
