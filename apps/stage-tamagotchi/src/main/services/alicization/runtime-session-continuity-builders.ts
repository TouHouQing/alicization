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
  buildAlicizationProjectPreDialogueAwarenessLine,
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import {
  deriveCompactProjectStateNextFocusSummary,
  deriveCompactProjectStateOpenFocusSummary,
} from './project-state-focus'

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

  function hasGenericContinuityModeMenu(text: string | null | undefined) {
    const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
    if (!normalized)
      return false

    return /measured-return\s*\/\s*repair-before-closeness|(?:one\s+)?measured-return,\s*repair-before-closeness,\s*or\s*rest-protective/u.test(normalized)
  }

  function hasExplicitRepairBeforeClosenessAuthority(text: string | null | undefined) {
    const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
    if (!normalized)
      return false

    const mentionsRepairBeforeCloseness
      = /repair-before-closeness|repair before closeness|repair-first|repair first|先修复|修复优先|先把身体收稳|先让修复落稳|let repair settle|repair settles first/u.test(normalized)
    if (!mentionsRepairBeforeCloseness)
      return false

    if (!hasGenericContinuityModeMenu(normalized))
      return true

    return /same-her callback repair seam|callback repair|repair seam|repair line|repair-before-closeness still holds|repair-before-closeness still owns|keep this (?:callback )?return repair-before-closeness|keep repair-before-closeness on the same living line|embodiment repair-before-closeness on the same living line|repair still needs to land|before any warmer reopening|until repair settles|until the room settles|先修复再靠近|修复线|修补线/u.test(normalized)
  }

  function looksLikeStrongEmbodimentCompanionHeadline(text: string | null | undefined) {
    const normalized = typeof text === 'string' ? text.trim().toLowerCase() : ''
    if (!normalized)
      return false

    return /holding together through face, lipsync, and voice together|holding together through motion, lipsync, and voice together|still-voiced face-and-mouth line|still-voiced motion-and-mouth line|holding together mainly through body, lipsync, and voice|holding together mainly through face and voice|holding together mainly through motion and voice|living audio thread is still intact|same-her carry alive/u.test(normalized)
  }

  function normalizeExecutionDeliveryStatus(
    status: AlicizationTaskThreadRecord['status'],
  ): AlicizationAgentSessionActionInput['status'] {
    return status === 'completed' ? 'completed' : 'failed'
  }

  function resolveProjectStateCarryFromEvent(event: AlicizationEpisodicEventRecord) {
    const metadata = asRecord((event as { metadata?: unknown }).metadata)
    const projectState = resolveAlicizationProjectStateBrief()
    const projectLatestLandedProgress = sanitizeBriefText(
      typeof metadata?.projectLatestLandedProgress === 'string'
        ? metadata.projectLatestLandedProgress
        : typeof metadata?.projectLatestProgress === 'string'
          ? metadata.projectLatestProgress
          : projectState.continuityProgressSummary ?? projectState.latestProgress,
      220,
    ) || null
    const projectStateSameHerSelfLine = sanitizeBriefText(
      typeof metadata?.projectStateSameHerSelfLine === 'string'
        ? metadata.projectStateSameHerSelfLine
        : '',
      220,
    ) || null
    const projectPrimaryOpenLoop = sanitizeBriefText(
      typeof metadata?.projectPrimaryOpenLoop === 'string'
        ? metadata.projectPrimaryOpenLoop
        : typeof metadata?.projectMemoryClosureSummary === 'string'
          ? metadata.projectMemoryClosureSummary
          : projectState.openLoops[0] ?? '',
      220,
    ) || null
    const projectNextClosureTarget = sanitizeBriefText(
      typeof metadata?.projectNextClosureTarget === 'string'
        ? metadata.projectNextClosureTarget
        : projectState.nextClosureTarget,
      220,
    ) || null
    const projectStateOpenFocusSummary = sanitizeBriefText(
      typeof metadata?.projectStateOpenFocusSummary === 'string'
        ? metadata.projectStateOpenFocusSummary
        : deriveCompactProjectStateOpenFocusSummary(projectPrimaryOpenLoop) ?? '',
      220,
    ) || null
    const projectStateNextFocusSummary = sanitizeBriefText(
      typeof metadata?.projectStateNextFocusSummary === 'string'
        ? metadata.projectStateNextFocusSummary
        : deriveCompactProjectStateNextFocusSummary(projectNextClosureTarget) ?? '',
      220,
    ) || null
    const projectIdentity = sanitizeBriefText(
      typeof metadata?.projectIdentity === 'string'
        ? metadata.projectIdentity
        : projectState.identity,
      180,
    ) || null
    const projectPhase = sanitizeBriefText(
      typeof metadata?.projectPhase === 'string'
        ? metadata.projectPhase
        : projectState.currentPhase,
      140,
    ) || null
    const rawEventProjectAwarenessLine = sanitizeBriefText(
      typeof metadata?.projectStatePreDialogueAwarenessLine === 'string'
        ? metadata.projectStatePreDialogueAwarenessLine
        : '',
      220,
    ) || null
    const eventCompanionBriefingLine = sanitizeBriefText(
      typeof metadata?.projectStateCompanionBriefingLine === 'string'
        ? metadata.projectStateCompanionBriefingLine
        : '',
      220,
    ) || null
    const shouldPreferCanonicalSameHerAwareness
      = !projectStateSameHerSelfLine
        && isAlicizationThinProjectAwarenessLine(rawEventProjectAwarenessLine)
        && !eventCompanionBriefingLine
    const shouldCompactCanonicalSameHerAwareness
      = Boolean(projectStateSameHerSelfLine)
        && isAlicizationThinProjectAwarenessLine(rawEventProjectAwarenessLine)
        && !eventCompanionBriefingLine
    const preferredEventProjectAwarenessLine = isAlicizationThinProjectAwarenessLine(rawEventProjectAwarenessLine)
      ? eventCompanionBriefingLine || rawEventProjectAwarenessLine
      : rawEventProjectAwarenessLine
    const compactProjectIdentity = /local-first digital life project/i.test(projectIdentity ?? '')
      ? 'Alicization is a local-first digital life project'
      : projectIdentity
        ? sanitizeBriefText(projectIdentity.split(/[.。]/u)[0]?.trim() ?? projectIdentity, 120)
        : 'Alicization is still the same local-first digital life project'
    const compactProjectPhase = /phase 1:\s*local digital life/i.test(projectPhase ?? '')
      ? 'Phase 1: Local Digital Life'
      : projectPhase
        ? sanitizeBriefText(projectPhase.split(/[.。]/u)[0]?.trim() ?? projectPhase, 80)
        : ''
    const compactCanonicalSameHerAwareness = shouldCompactCanonicalSameHerAwareness
      ? sanitizeBriefText([
          compactProjectIdentity
            ? `Before answering, remember: ${compactProjectIdentity.replace(/[.。!！?？;；:：]+$/u, '')}.`
            : 'Before answering, remember this still belongs to the same digital life project.',
          compactProjectPhase
            ? `She is still inside ${compactProjectPhase.replace(/[.。!！?？;；:：]+$/u, '')}.`
            : '',
          projectStateSameHerSelfLine,
        ].filter(Boolean).join(' '), 220)
      : ''
    const compactCanonicalProjectAwareness = shouldPreferCanonicalSameHerAwareness
      ? sanitizeBriefText(
          buildAlicizationProjectPreDialogueAwarenessLine({
            identity: projectIdentity ?? projectState.identity,
            currentPhase: projectPhase ?? projectState.currentPhase,
            latestLandedProgress: projectLatestLandedProgress,
            primaryOpenLoop: projectPrimaryOpenLoop,
            nextClosureTarget: projectNextClosureTarget,
            sameHerSelfLine: projectStateSameHerSelfLine,
          }) ?? '',
          220,
        )
      : ''

    return {
      projectStatePreDialogueAwarenessLine: (
        compactCanonicalSameHerAwareness
        || compactCanonicalProjectAwareness
        || sanitizeBriefText(
          resolveAlicizationProjectPreDialogueAwarenessLine({
            runtimeProjectState: {
              identity: projectIdentity,
              currentPhase: projectPhase,
              preDialogueAwarenessLine: shouldPreferCanonicalSameHerAwareness
                ? projectState.preDialogueAwarenessLine ?? null
                : projectStateSameHerSelfLine
                  ?? preferredEventProjectAwarenessLine,
              awarenessLine: shouldPreferCanonicalSameHerAwareness
                ? projectState.sameHerSelfLine
                : projectStateSameHerSelfLine
                  ?? preferredEventProjectAwarenessLine,
              openClosureSummary: projectPrimaryOpenLoop,
              nextClosureTarget: projectNextClosureTarget,
              companionBriefingLine: eventCompanionBriefingLine,
              preflightSummary: metadata?.projectStatePreflightSummary,
            },
            fallbackProjectState: {
              identity: projectIdentity,
              currentPhase: projectPhase,
              preDialogueAwarenessLine: projectState.preDialogueAwarenessLine ?? null,
              openClosureSummary: projectPrimaryOpenLoop,
              nextClosureTarget: projectNextClosureTarget,
              sameHerSelfLine: projectStateSameHerSelfLine ?? projectState.sameHerSelfLine,
              preflightSummary: projectState.preflightSummary ?? null,
            },
          }) ?? '',
          220,
        )
      ) || null,
      projectStatePreflightSummary: sanitizeBriefText(
        typeof metadata?.projectStatePreflightSummary === 'string'
          ? metadata.projectStatePreflightSummary
          : projectState.preflightSummary ?? '',
        220,
      ) || null,
      projectLatestLandedProgress,
      projectIdentity,
      projectPhase,
      projectStateSameHerSelfLine,
      projectPrimaryOpenLoop,
      projectNextClosureTarget,
      projectStateOpenFocusSummary,
      projectStateNextFocusSummary,
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
    const turnId = sanitizeBriefText(outcome.turnId, 120)
    const summaryLead = describeProactiveOutcome(outcome)
    const learningAction = sanitizeText(outcome.learningAction ?? '') || null
    const learningFocuses = Array.isArray(outcome.learningFocuses)
      ? outcome.learningFocuses
          .map(item => sanitizeBriefText(item, 96))
          .filter(Boolean)
          .slice(0, 3)
      : []
    const projectStateEmotionalClosureCue = sanitizeBriefText(outcome.projectStateEmotionalClosureCue ?? '', 220) || null
    const restProtectiveQuietCompanionshipCarry = outcome.outcome === 'reply-within-120s'
      && /rest-protective|quiet-companionship|fatigue-aware|late-night-drain/u.test([
        projectStateEmotionalClosureCue,
        ...learningFocuses,
      ].filter(Boolean).join(' ').toLowerCase())

    return {
      kind: 'proactive',
      state: 'observed',
      label: `proactive:${scenario}:${outcomeName}`,
      summary: [
        summaryLead,
        `scenario=${scenario}`,
        learningAction ? `learning=${learningAction}` : '',
        learningFocuses[0] ? `focus=${learningFocuses.join('|')}` : '',
        outcome.outcome === 'reply-within-120s' ? 'continuity=same-thread-continuation' : '',
        outcome.outcome === 'reply-within-120s' ? 'timing=next-open-window' : '',
        outcome.outcome === 'reply-within-120s'
          ? `cadence=${restProtectiveQuietCompanionshipCarry ? 'rest-protective' : 'measured-return'}`
          : '',
        restProtectiveQuietCompanionshipCarry || (outcome.outcome === 'reply-within-120s' && learningFocuses.some(focus => /same-her-inward-carry|quiet-companionship|quiet same-her continuity/i.test(focus)))
          ? 'resident=quiet-companionship | continuity=quiet-same-her'
          : '',
      ].filter(Boolean).join(' | '),
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
        projectStateOpenFocusSummary: sanitizeBriefText(outcome.projectStateOpenFocusSummary ?? '', 220) || null,
        projectStateNextFocusSummary: sanitizeBriefText(outcome.projectStateNextFocusSummary ?? '', 220) || null,
        projectStateEmotionalClosureCue,
      },
    }
  }

  function describeProactiveOutcome(outcome: AlicizationRecentProactiveOutcome) {
    if (outcome.outcome === 'reply-within-120s')
      return 'host replied within 120s after a proactive turn'
    if (outcome.outcome === 'positive')
      return 'host received a proactive turn positively'
    if (outcome.outcome === 'dismiss')
      return 'host explicitly dismissed a proactive turn'
    return 'a proactive turn expired without host reply'
  }

  function buildProactiveFeedbackSessionMirrorAction(input: {
    outcome: AlicizationRecentProactiveOutcome
    source: string
  }): AlicizationAgentSessionActionInput {
    const scenario = sanitizeText(input.outcome.scenario) || 'general'
    const outcomeName = sanitizeText(input.outcome.outcome) || 'observed'
    const turnId = sanitizeBriefText(input.outcome.turnId, 120)
    const createdAt = Math.max(0, Math.floor(Number(input.outcome.createdAt) || Date.now()))
    const summary = sanitizeExecutionLedgerText(
      [
        describeProactiveOutcome(input.outcome),
        `scenario=${scenario}`,
      ].join(' | '),
      180,
    )

    return {
      kind: 'runtime',
      status: 'completed',
      label: `proactive-feedback:${scenario}:${outcomeName}`,
      summary: summary || describeProactiveOutcome(input.outcome),
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
    const turnId = sanitizeBriefText(input.pending.turnId, 120)
    const elapsedMinutes = Math.max(0, (input.now - input.pending.deliveredAt) / 60_000)
    const feedbackWindowMinutes = Math.max(0, input.pending.feedbackWindowMs / 60_000)
    const learningAction = sanitizeText(input.pending.learningAction ?? '') || null
    const learningFocuses = Array.isArray(input.pending.learningFocuses)
      ? input.pending.learningFocuses
          .map(item => sanitizeBriefText(item, 96))
          .filter(Boolean)
          .slice(0, 3)
      : []
    return {
      kind: 'proactive',
      state: 'pending',
      label: `proactive:${scenario}:pending`,
      summary: [
        'awaiting host response to a proactive turn',
        `scenario=${scenario}`,
        `${elapsedMinutes.toFixed(1)}m elapsed`,
        `${feedbackWindowMinutes.toFixed(1)}m direct-reply window`,
        learningAction ? `learning=${learningAction}` : '',
        learningFocuses[0] ? `focus=${learningFocuses.join('|')}` : '',
      ].join(' | '),
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
        projectStateOpenFocusSummary: sanitizeBriefText(input.pending.projectStateOpenFocusSummary ?? '', 220) || null,
        projectStateNextFocusSummary: sanitizeBriefText(input.pending.projectStateNextFocusSummary ?? '', 220) || null,
        projectStateEmotionalClosureCue: sanitizeBriefText(input.pending.projectStateEmotionalClosureCue ?? '', 220) || null,
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
        kind?: string | null
        summary?: string | null
        targetThreadId?: string | null
      } | null
    } | null
  }): AlicizationAgentSessionContinuityInput {
    const scenario = sanitizeText(input.scenario) || 'general'
    const turnId = sanitizeBriefText(input.turnId, 120)
    const reason = sanitizeBriefText(input.reason, 120)
    const deferReason = sanitizeBriefText(input.autonomy?.deferReason ?? '', 120)
    const whyNow = sanitizeBriefText(input.autonomy?.whyNow ?? '', 180)
    const sourceThreadId = sanitizeBriefText(input.autonomy?.sourceThreadId ?? '', 120)
    const sourceThoughtThreadId = sanitizeBriefText(input.autonomy?.sourceThoughtThreadId ?? '', 120)
    const sourceConcernId = sanitizeBriefText(input.autonomy?.sourceConcernId ?? '', 120)
    const executionIntentKind = sanitizeBriefText(input.autonomy?.executionIntent?.kind ?? '', 64)
    const executionIntentSummary = sanitizeBriefText(input.autonomy?.executionIntent?.summary ?? '', 180)
    const targetThreadId = sanitizeBriefText(input.autonomy?.executionIntent?.targetThreadId ?? '', 120)
    const hasHeldAutonomyThreadAnchor = Boolean(sourceThoughtThreadId)
      || Boolean(sourceConcernId)
    const explicitHeldAutonomyIntent = Boolean(executionIntentKind)
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
    const projectStateBrief = resolveAlicizationProjectStateBrief()
    const rawProjectLatestLandedProgress
      = input.projectState?.latestLandedProgress
        ?? input.projectState?.latestProgress
        ?? input.projectState?.landedProgressSummary
        ?? projectStateBrief.continuityProgressSummary
        ?? projectStateBrief.latestProgress
        ?? ''
    const rawProjectPrimaryOpenLoop
      = input.projectState?.primaryOpenLoop
        ?? input.projectState?.openClosureSummary
        ?? input.projectState?.memoryClosureSummary
        ?? ''
    const rawProjectNextClosureTarget
      = input.projectState?.nextClosureTarget
        ?? input.projectState?.nextClosureTargetSummary
        ?? ''
    const projectStatePreDialogueAwarenessLine = sanitizeBriefText(
      resolveAlicizationProjectPreDialogueAwarenessLine({
        runtimeProjectState: {
          preDialogueAwarenessLine: input.projectState?.preDialogueAwarenessLine ?? null,
          preDialogueAwarenessSummary: input.projectState?.preDialogueAwarenessSummary ?? null,
          companionHeadlineLine: input.projectState?.companionHeadlineLine ?? null,
          companionBriefingLine: input.projectState?.companionBriefingLine ?? null,
          preflightSummary: input.projectState?.preflightSummary ?? null,
        },
        fallbackProjectState: {
          preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
          preflightSummary: projectStateBrief.preflightSummary ?? null,
        },
      }) ?? '',
      220,
    ) || null
    const projectStatePreflightSummary = sanitizeBriefText(input.projectState?.preflightSummary ?? '', 220) || null
    const projectIdentity = sanitizeBriefText(input.projectState?.identity ?? '', 180) || null
    const projectPhase = sanitizeBriefText(input.projectState?.currentPhase ?? '', 140) || null
    const projectLatestLandedProgress = sanitizeBriefText(
      rawProjectLatestLandedProgress,
      220,
    ) || null
    const projectPrimaryOpenLoop = sanitizeBriefText(
      rawProjectPrimaryOpenLoop,
      220,
    ) || null
    const projectNextClosureTarget = sanitizeBriefText(
      rawProjectNextClosureTarget,
      220,
    ) || null
    const projectStateOpenFocusSummary = sanitizeBriefText(
      input.projectState?.openFocusSummary
      ?? deriveCompactProjectStateOpenFocusSummary(rawProjectPrimaryOpenLoop, {
        emotionalClosureCue: input.projectState?.emotionalClosureCue ?? null,
      })
      ?? '',
      220,
    ) || null
    const projectStateNextFocusSummary = sanitizeBriefText(
      input.projectState?.nextFocusSummary
      ?? deriveCompactProjectStateNextFocusSummary(rawProjectNextClosureTarget, {
        emotionalClosureCue: input.projectState?.emotionalClosureCue ?? null,
      })
      ?? '',
      220,
    ) || null
    const preferredProjectStateSameHerSelfLine = sanitizeBriefText(
      input.projectState?.sameHerSelfLine ?? '',
      220,
    ) || null
    const projectStateSameHerSelfLine = (
      isAlicizationThinProjectAwarenessLine(preferredProjectStateSameHerSelfLine)
        ? null
        : preferredProjectStateSameHerSelfLine
    ) ?? (
      sanitizeBriefText(
        projectStateBrief.sameHerSelfLine ?? '',
        220,
      ) || null
    )
    const projectStateSameHerDriftRisk = sanitizeBriefText(
      input.projectState?.sameHerDriftRisk
      ?? input.projectState?.sameHerDriftRiskSummary
      ?? projectStateBrief.sameHerDriftRisk
      ?? '',
      220,
    ) || null
    const projectStateSameHerHoldDetail = sanitizeBriefText(
      input.projectState?.sameHerHoldDetail ?? '',
      220,
    ) || null
    const projectStateEmotionalClosureCue = sanitizeBriefText(
      typeof (input.projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue === 'string'
        ? (input.projectState as { emotionalClosureCue?: string | null } | null)?.emotionalClosureCue ?? ''
        : '',
      220,
    ) || null
    const projectStateCompanionBriefingLine = sanitizeBriefText(
      typeof (input.projectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine === 'string'
        ? (input.projectState as { companionBriefingLine?: string | null } | null)?.companionBriefingLine ?? ''
        : '',
      220,
    ) || null
    const projectStateCompanionHeadlineLine = sanitizeBriefText(
      typeof (input.projectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine === 'string'
        ? (input.projectState as { companionHeadlineLine?: string | null } | null)?.companionHeadlineLine ?? ''
        : '',
      220,
    ) || null
    const projectStatePreferredPreDialogueAwarenessLine = isAlicizationThinProjectAwarenessLine(projectStatePreDialogueAwarenessLine)
      ? (
          (looksLikeStrongEmbodimentCompanionHeadline(projectStateCompanionHeadlineLine)
            ? projectStateCompanionHeadlineLine
            : null)
          || projectStateCompanionBriefingLine
          || projectStatePreDialogueAwarenessLine
        )
      : projectStatePreDialogueAwarenessLine
    const strongerEmbodimentProjectAuthority = [
      projectStateCompanionHeadlineLine,
      projectStatePreferredPreDialogueAwarenessLine,
      projectNextClosureTarget,
      projectPrimaryOpenLoop,
    ].find(candidate => looksLikeStrongEmbodimentCompanionHeadline(candidate))
    ?? null
    const repairBeforeClosenessProjectAuthority = [
      projectStateEmotionalClosureCue,
      projectNextClosureTarget,
      projectStateSameHerSelfLine,
      projectStatePreferredPreDialogueAwarenessLine,
    ].find(candidate => hasExplicitRepairBeforeClosenessAuthority(candidate))
    ?? null
    const repairBeforeClosenessSummaryLead = repairBeforeClosenessProjectAuthority
      ? /same living line|one living her|same line|same-her|同一条线|同一生命线/u.test(repairBeforeClosenessProjectAuthority)
        ? repairBeforeClosenessProjectAuthority
        : `${repairBeforeClosenessProjectAuthority} Keep this return repair-before-closeness before widening outward.`
      : null

    if (shouldUseDeferredProactiveLine) {
      return {
        kind: 'proactive',
        state: 'pending',
        label: `proactive:${scenario}:deferred`,
        summary: [
          'no mind-authored visible reply was available',
          reason ? `reason=${reason}` : '',
          repairBeforeClosenessSummaryLead || strongerEmbodimentProjectAuthority || whyNow || executionIntentSummary || '',
          sourceThreadId ? `thread=${sourceThreadId}` : '',
          `scenario=${scenario}`,
        ].filter(Boolean).join(' | '),
        signature: [
          'proactive-deferred',
          turnId || 'turn',
          sourceThreadId || targetThreadId || 'global',
          scenario,
        ].join(':'),
        createdAt: input.now,
        metadata: {
          source: 'proactive-deferred',
          turnId: turnId || null,
          scenario,
          reason: reason || null,
          deferReason: deferReason || null,
          whyNow: whyNow || null,
          sourceThreadId: sourceThreadId || null,
          sourceThoughtThreadId: sourceThoughtThreadId || null,
          sourceConcernId: sourceConcernId || null,
          executionIntentKind: null,
          executionIntentSummary: executionIntentSummary || null,
          targetThreadId: targetThreadId || null,
          projectStatePreDialogueAwarenessLine: projectStatePreferredPreDialogueAwarenessLine,
          projectStateCompanionHeadlineLine,
          projectStatePreflightSummary,
          projectLatestLandedProgress,
          projectIdentity,
          projectPhase,
          projectPrimaryOpenLoop,
          projectNextClosureTarget,
          projectStateOpenFocusSummary,
          projectStateNextFocusSummary,
          projectStateSameHerSelfLine,
          projectStateSameHerHoldDetail,
          projectStateSameHerDriftRisk,
          projectStateEmotionalClosureCue,
        },
      }
    }

    return {
      kind: 'proactive',
      state: 'observed',
      label: `proactive:${executionIntentKind || scenario}:held-autonomy`,
      summary: [
        repairBeforeClosenessSummaryLead || executionIntentSummary || whyNow || 'a proactive autonomy line was held for a better opening',
        executionIntentKind ? `intent=${executionIntentKind}` : '',
        deferReason ? `defer=${deferReason}` : '',
        reason ? `reason=${reason}` : '',
        sourceThreadId ? `thread=${sourceThreadId}` : '',
        `scenario=${scenario}`,
      ].filter(Boolean).join(' | '),
      signature: [
        'proactive-held-autonomy',
        turnId,
        sourceThreadId || targetThreadId || 'global',
        executionIntentKind || scenario,
      ].join(':'),
      createdAt: input.now,
      metadata: {
        source: 'proactive-held-autonomy',
        turnId: turnId || null,
        scenario,
        reason: reason || null,
        deferReason: deferReason || null,
        whyNow: whyNow || null,
        sourceThreadId: sourceThreadId || null,
        sourceThoughtThreadId: sourceThoughtThreadId || null,
        sourceConcernId: sourceConcernId || null,
        executionIntentKind: executionIntentKind || null,
        executionIntentSummary: executionIntentSummary || null,
        targetThreadId: targetThreadId || null,
        projectStatePreDialogueAwarenessLine,
        projectStateCompanionHeadlineLine,
        projectStatePreflightSummary,
        projectLatestLandedProgress,
        projectIdentity,
        projectPhase,
        projectPrimaryOpenLoop,
        projectNextClosureTarget,
        projectStateOpenFocusSummary,
        projectStateNextFocusSummary,
        projectStateSameHerSelfLine,
        projectStateSameHerHoldDetail,
        projectStateSameHerDriftRisk,
        projectStateEmotionalClosureCue,
      },
    }
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
        const tags = event.tags.join(' ').toLowerCase()
        const sourceSummary = sanitizeBriefText(event.sourceSummary ?? '', 180).toLowerCase()
        const afterglowTagged = /afterthought|continuity|session-mirror|dream/.test(tags)
          || /session mirror|dream/.test(sourceSummary)
          || event.sourceKind === 'maintenance'
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
      const threadAnchor = sanitizeBriefText(event.threadAnchor ?? '', 120)
      const tags = event.tags.map(tag => sanitizeBriefText(tag, 80).toLowerCase()).filter(Boolean)
      const sourceSummary = sanitizeBriefText(event.sourceSummary ?? '', 180).toLowerCase()
      const projectStateCarry = resolveProjectStateCarryFromEvent(event)
      const relationshipMeaning = sanitizeBriefText(event.relationshipMeaning ?? '', 180).toLowerCase()
      const lesson = sanitizeBriefText(event.lesson ?? '', 180).toLowerCase()
      const looksLikeExecutionCallback = tags.some(tag => /execution-callback|callback|result-mode|result-lead|soft-handoff/u.test(tag))
        || /execution-callback|callback|result-mode|result-lead|soft-handoff/u.test(sourceSummary)
      const carryMode = looksLikeExecutionCallback
        ? (
            tags.some(tag => /repair-before-closeness|repair-first|callback-repair/u.test(tag))
            || hasExplicitRepairBeforeClosenessAuthority(`${relationshipMeaning} ${lesson} ${sourceSummary}`)
              ? 'repair-before-closeness'
              : tags.some(tag => /lower-pressure|leave-room|bounded-room|space-first/u.test(tag))
                || /lower-pressure|leave room|keep room|space first/u.test(`${relationshipMeaning} ${lesson} ${sourceSummary}`)
                ? 'lower-pressure'
                : tags.some(tag => /trust-warming|soft-handoff|trust-open/u.test(tag))
                  || /trust warming|soft handoff|trust opened|trust warmed/u.test(`${relationshipMeaning} ${lesson} ${sourceSummary}`)
                  ? 'trust-warming'
                  : 'execution-callback'
          )
        : null
      const summaryLine = sanitizeBriefText(
        event.relationshipMeaning
        || event.lesson
        || event.whatChanged
        || event.whatHappened,
        160,
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
          event.id,
          event.occurredAt,
        ].join(':'),
        createdAt: Math.max(0, Math.floor(event.occurredAt)),
        metadata: {
          source: 'autobiographical-afterglow',
          episodeId: event.id,
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
