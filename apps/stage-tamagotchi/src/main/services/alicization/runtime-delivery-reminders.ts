import type {
  AlicizationAuditLogInput,
  AlicizationHostPersonModelSnapshot,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type { AlicizationAgentTurnRuntime } from './agent-runtime'
import type { AlicizationExecutionResultDeliveryPolicy } from './execution-interaction-learning'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import { resolveAlicizationProactiveVisibleUtterance } from './proactive-mind/visible-utterance-realization'
import { createAlicizationTurnRuntime } from './turn-os/runtime'
import { buildAlicizationTurnGraphFromSettlements } from './turn-os/turn-graph'

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
  hydrateAgentTurnFromCurrentCardState?: (input: {
    cardId: string
    decisionTraceId?: string | null
    sessionId?: string | null
    source: string
    turnId?: string | null
  }) => Promise<AlicizationAgentTurnRuntime | null>
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
    reminder: {
      message: string
      tier: 'mild' | 'severe'
    }
  }) => Promise<{
    shouldStayInward?: boolean | null
    shouldDelayUntilAfterPayoff?: boolean | null
    stableCoreOnly?: boolean | null
    visibleCarryMode?: string | null
  } | null>
  getActiveSelfRevisionStatePatch?: () => Promise<AlicizationSelfRevisionStatePatch | null>
  persistExecutionDeliveryState: (cardIdRaw: unknown) => Promise<unknown>
  queueSubconsciousWake: (cardIdRaw: unknown, reason: string, delayMs?: number) => void
  executionCallbackRuntime: {
    markSurfaced: (input: { sessionId: string, createdAt: number }) => void
  }
  errorMessageFrom: (error: unknown) => string | undefined
}

export function createAlicizationDeliveryReminderRuntime(options: CreateAlicizationDeliveryReminderRuntimeOptions) {
  async function processDueRemindersForCurrentCard(
    trigger: 'timer' | 'force' | 'startup',
    agentTurn?: AlicizationAgentTurnRuntime | null,
  ) {
    const cardId = options.getActiveCardId()
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
        const firedTurnId = `reminder:${options.getActiveCardId()}:${task.taskId}:${Date.now()}`
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
        const reminderVisibleUtterance = resolveAlicizationProactiveVisibleUtterance({
          kind: 'reminder',
          structured,
          hasMindAuthoredStructured: true,
          reason: 'mind-authored-reminder',
          selfRevisionPatch: activeSelfRevisionPatch,
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
        const persisted = await options.appendConversationTurnWithGuards({
          turnId: firedTurnId,
          sessionId: deliveredSessionId,
          assistantText: reminderVisibleUtterance.assistantText,
          structured: reminderVisibleUtterance.structuredForPersistence,
          origin: 'subconscious-proactive',
          createdAt: Date.now(),
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
        await options.getAlicizationDb().failScheduledTask(task.taskId, reason, Date.now()).catch(() => {})
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

    const firedTurnId = `execution-callback:${options.getActiveCardId()}:${pendingDelivery.threadId}:${Date.now()}`
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
          })
        : null
      const knowledgeEvidence = options.resolveExecutionKnowledgeEvidence
        ? await options.resolveExecutionKnowledgeEvidence({
            agentTurn,
            cardId: options.getActiveCardId(),
          })
        : null
      if (deliveryPolicy.mode === 'hold-for-opening') {
        options.executionDeliveryRuntime.requeue(pendingDelivery)
        await options.persistExecutionDeliveryState(options.getActiveCardId())
        options.queueSubconsciousWake(options.getActiveCardId(), `execution-delivery-hold:${pendingDelivery.threadId}`, 3 * 60_000)
        await options.appendRuntimeDebugLine('execution-delivery.held-for-opening', {
          trigger,
          cardId: options.getActiveCardId(),
          threadId: pendingDelivery.threadId,
          sessionId: pendingDelivery.sessionId,
          status: pendingDelivery.status,
          policy: deliveryPolicy,
        })
        await options.appendAuditLog({
          level: 'notice',
          category: 'alicization.executor.delivery',
          action: 'held-for-opening',
          message: 'Deferred execution-result delivery because the current opening is too tight for this learned delivery profile.',
          payload: {
            trigger,
            threadId: pendingDelivery.threadId,
            sessionId: pendingDelivery.sessionId,
            status: pendingDelivery.status,
            policy: deliveryPolicy,
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
          message: 'Execution callback visible reply was deferred because the raw mind-authored callback violated the current same-her opening guidance.',
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
      turnRuntime.settleSurface({
        context: callbackTurnRuntimeContext,
        surface: callbackVisibleUtterance.visibleReplyRealization,
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
        surface: callbackVisibleUtterance.visibleReplyRealization,
        routingRequired: false,
        stageSettlements: callbackTurnRuntimeContext.stageSettlements,
        activeSelfRevision: null,
      })

      const persisted = await options.appendConversationTurnWithGuards({
        turnId: firedTurnId,
        sessionId: pendingDelivery.sessionId,
        assistantText: callbackVisibleUtterance.assistantText,
        structured: callbackVisibleUtterance.structuredForPersistence
          ? {
              ...callbackVisibleUtterance.structuredForPersistence,
              turnGraph: callbackTurnGraph,
            }
          : callbackVisibleUtterance.structuredForPersistence,
        origin: 'subconscious-proactive',
        createdAt: Date.now(),
        turnRuntimeContext: callbackTurnRuntimeContext,
        onPersisted: async () => {
          turnRuntime.settleDelivery({
            context: callbackTurnRuntimeContext,
            surface: callbackVisibleUtterance.visibleReplyRealization,
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
