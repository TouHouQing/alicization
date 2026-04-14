import type { Message } from '@xsai/shared-chat'

import type {
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'
import type {
  AlicizationAgentSessionActionInput,
  AlicizationAgentSessionContinuityInput,
  AlicizationAgentTurnRuntime,
} from './agent-runtime'
import type { AlicizationPerceptionSceneResidue } from './attention-anchor'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationRecentProactiveOutcome } from './proactive-feedback'

import { deriveAlicizationDigitalLifeSpineFromSurface } from './digital-life-spine'

interface CreateAlicizationAgentSessionMirrorRuntimeOptions {
  sanitizeText: (raw: unknown, fallback?: string) => string
  sanitizeBriefText: (raw: string, maxChars: number) => string
  normalizeCardId: (raw: unknown) => string
  normalizeSessionId: (raw: unknown) => string
  getActiveSessionIdByCard: (cardId: string) => string | undefined
  getLatestConversationSessionId: () => Promise<string | null | undefined>
  openAgentTurn: (input: {
    cardId: string
    turnId: string
    decisionTraceId?: string | null
  }) => Promise<AlicizationAgentTurnRuntime>
  buildMainGatewayAgentTurnId: (...segments: Array<unknown>) => string
  resolveAgentSessionContinuityContext: (cardId: string) => Promise<{
    digitalLifeRuntimeSurface: AlicizationDigitalLifeRuntimeSurface | null
    sessionContinuitySignals: AlicizationAgentSessionContinuityInput[]
  }>
  buildTaskThreadSessionMirrorAction: (input: {
    source: string
    thread: AlicizationTaskThreadRecord
  }) => AlicizationAgentSessionActionInput
  buildSceneResidueSessionMirrorAction: (input: {
    residue: AlicizationPerceptionSceneResidue
    source: string
  }) => AlicizationAgentSessionActionInput
  buildProactiveFeedbackSessionMirrorAction: (input: {
    outcome: AlicizationRecentProactiveOutcome
    source: string
  }) => AlicizationAgentSessionActionInput
  buildReminderSessionMirrorAction: (input: {
    delayMinutes: number
    firedTurnId?: string | null
    task: {
      message: string
      sourceTurnId?: string | null
      taskId: string
      triggerAt: number
    }
    tier: 'mild' | 'severe'
    trigger: 'startup' | 'timer' | 'force'
  }) => AlicizationAgentSessionActionInput
  dialogueSessionManager: {
    buildSessionMirrorSystemBlock: (input: {
      cardId: string
      sessionId: string
    }) => string
    ingestAgentSessionSnapshot: (input: {
      agentSession: ReturnType<AlicizationAgentTurnRuntime['getSessionSnapshot']>
      cardId: string
      decisionTraceId?: string | null
      sessionId: string
      sessionPhases?: string[]
      source: string
    }) => void
  }
}

export function createAlicizationAgentSessionMirrorRuntime(options: CreateAlicizationAgentSessionMirrorRuntimeOptions) {
  const {
    sanitizeText,
    sanitizeBriefText,
    normalizeCardId,
    normalizeSessionId,
    getActiveSessionIdByCard,
    getLatestConversationSessionId,
    openAgentTurn,
    buildMainGatewayAgentTurnId,
    resolveAgentSessionContinuityContext,
    buildTaskThreadSessionMirrorAction,
    buildSceneResidueSessionMirrorAction,
    buildProactiveFeedbackSessionMirrorAction,
    buildReminderSessionMirrorAction,
    dialogueSessionManager,
  } = options

  function buildAgentRuntimeAuditSnapshot(agentTurn?: AlicizationAgentTurnRuntime | null) {
    if (!agentTurn)
      return null

    const session = agentTurn.getSessionSnapshot()
    return {
      agentSessionId: session.id,
      conversationSessionId: session.conversationSessionId,
      recentContinuity: session.continuitySignals.slice(-3).map(signal => ({
        kind: signal.kind,
        state: signal.state,
        label: sanitizeBriefText(signal.label, 120),
        summary: sanitizeBriefText(signal.summary ?? '', 180) || null,
      })),
      recentActions: session.tasks.slice(-4).map(task => ({
        kind: task.kind,
        status: task.status,
        label: sanitizeBriefText(task.label, 120),
        summary: sanitizeBriefText(task.summary ?? '', 180) || null,
      })),
      digitalLifeLine: sanitizeBriefText(
        session.digitalLifeSpine?.continuitySignal?.summary ?? '',
        220,
      ) || null,
      digitalLifeArchitecture: (session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)
        ? {
            operatingMode: (session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)!.operatingMode,
            dominantSystem: (session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)!.dominantSystem,
            supportingSystems: [...(session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)!.supportingSystems],
            governingFocus: sanitizeBriefText((session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)!.governingFocus ?? '', 180) || null,
            summary: sanitizeBriefText((session.digitalLifeSpine?.architecture ?? session.digitalLifeArchitecture)!.summary, 220) || null,
          }
        : null,
    }
  }

  function buildAgentTurnContinuitySystemMessages(input: {
    agentTurn: AlicizationAgentTurnRuntime
    cardId: string
  }): Message[] {
    const messages: Message[] = []
    const sessionId = sanitizeText(input.agentTurn.conversationSessionId, '')
    if (sessionId) {
      const mirrorBlock = dialogueSessionManager.buildSessionMirrorSystemBlock({
        cardId: input.cardId,
        sessionId,
      })
      if (mirrorBlock) {
        messages.push({
          role: 'system',
          content: mirrorBlock,
        } as Message)
      }
    }

    messages.push({
      role: 'system',
      content: input.agentTurn.buildSessionSystemBlock(),
    } as Message)
    return messages
  }

  function syncAgentTurnSessionMirror(input: {
    agentTurn?: AlicizationAgentTurnRuntime | null
    cardId: string
    continuitySignals?: AlicizationAgentSessionContinuityInput[]
    decisionTraceId?: string | null
    sessionId?: string | null
    sessionPhases?: string[]
    source: string
  }) {
    const agentTurn = input.agentTurn
    if (!agentTurn)
      return

    if (input.continuitySignals?.length)
      agentTurn.ingestContinuitySignals(input.continuitySignals)

    const sessionId = sanitizeText(input.sessionId ?? agentTurn.conversationSessionId).slice(0, 160)
    if (!sessionId)
      return

    dialogueSessionManager.ingestAgentSessionSnapshot({
      agentSession: agentTurn.getSessionSnapshot(),
      cardId: normalizeCardId(input.cardId),
      decisionTraceId: input.decisionTraceId ?? null,
      sessionId,
      sessionPhases: input.sessionPhases ?? agentTurn.snapshot().phaseOrder,
      source: input.source,
    })
  }

  async function syncSessionMirrorFromCurrentCardState(input: {
    cardId: string
    decisionTraceId?: string | null
    proactiveOutcomes?: AlicizationRecentProactiveOutcome[]
    reminderAction?: {
      delayMinutes: number
      firedTurnId?: string | null
      task: {
        message: string
        sourceTurnId?: string | null
        taskId: string
        triggerAt: number
      }
      tier: 'mild' | 'severe'
      trigger: 'startup' | 'timer' | 'force'
    } | null
    sceneResidue?: AlicizationPerceptionSceneResidue | null
    sessionId?: string | null
    source: string
    taskThread?: AlicizationTaskThreadRecord | null
    turnId?: string | null
  }) {
    const cardId = normalizeCardId(input.cardId)
    const existingSessionId = normalizeSessionId(input.sessionId)
      || normalizeSessionId(getActiveSessionIdByCard(cardId))
      || normalizeSessionId(await getLatestConversationSessionId().catch(() => undefined))
    if (!existingSessionId)
      return

    const agentTurn = await openAgentTurn({
      cardId,
      turnId: sanitizeText(input.turnId, '')
        || buildMainGatewayAgentTurnId('session-mirror', input.source, cardId, Date.now()),
      decisionTraceId: input.decisionTraceId ?? null,
    }).catch(() => null)
    if (!agentTurn)
      return

    const sessionContinuityContext = await resolveAgentSessionContinuityContext(cardId).catch(() => ({
      digitalLifeRuntimeSurface: null as AlicizationDigitalLifeRuntimeSurface | null,
      sessionContinuitySignals: [] as AlicizationAgentSessionContinuityInput[],
    }))
    const digitalLifeSpine = sessionContinuityContext.digitalLifeRuntimeSurface
      ? deriveAlicizationDigitalLifeSpineFromSurface(sessionContinuityContext.digitalLifeRuntimeSurface)
      : null
    if (digitalLifeSpine) {
      agentTurn.ingestDigitalLifeSpine(digitalLifeSpine)
      agentTurn.ingestDigitalLifeArchitecture(digitalLifeSpine.architecture)
    }
    const runtimeActions: AlicizationAgentSessionActionInput[] = []
    if (input.taskThread)
      runtimeActions.push(buildTaskThreadSessionMirrorAction({ thread: input.taskThread, source: input.source }))
    if (input.sceneResidue)
      runtimeActions.push(buildSceneResidueSessionMirrorAction({ residue: input.sceneResidue, source: input.source }))
    if (input.proactiveOutcomes?.length) {
      runtimeActions.push(...input.proactiveOutcomes.map(outcome => buildProactiveFeedbackSessionMirrorAction({
        outcome,
        source: input.source,
      })))
    }
    if (input.reminderAction)
      runtimeActions.push(buildReminderSessionMirrorAction(input.reminderAction))
    if (runtimeActions.length > 0)
      agentTurn.ingestRuntimeActions(runtimeActions)

    syncAgentTurnSessionMirror({
      agentTurn,
      cardId,
      continuitySignals: sessionContinuityContext.sessionContinuitySignals,
      decisionTraceId: input.decisionTraceId ?? null,
      sessionId: existingSessionId,
      source: input.source,
    })
  }

  return {
    buildAgentRuntimeAuditSnapshot,
    buildAgentTurnContinuitySystemMessages,
    syncAgentTurnSessionMirror,
    syncSessionMirrorFromCurrentCardState,
  }
}
