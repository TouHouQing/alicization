import type {
  AlicizationAppendExecutionEventsPayload,
  AlicizationAuditLogInput,
  AlicizationCardScope,
  AlicizationChannelCapability,
  AlicizationChannelCapabilityManifestRecord,
  AlicizationDispatchTaskThreadPayload,
  AlicizationExecutionEventRecord,
  AlicizationExecutorSessionRecord,
  AlicizationListChannelCapabilityManifestsPayload,
  AlicizationListExecutionEventsPayload,
  AlicizationListExecutorSessionsPayload,
  AlicizationListTaskThreadsPayload,
  AlicizationResumeTaskThreadInput,
  AlicizationResumeTaskThreadResult,
  AlicizationTaskThreadRecord,
  AlicizationUpsertChannelCapabilityManifestPayload,
  AlicizationUpsertExecutorSessionPayload,
  AlicizationUpsertTaskThreadPayload,
} from '../../../shared/eventa'

import { randomUUID } from 'node:crypto'

import { alicizationPrimaryConversationSessionId } from '@proj-alicization/stage-shared'

import {
  electronAlicizationAppendExecutionEvents,
  electronAlicizationDispatchTaskThread,
  electronAlicizationListChannelCapabilityManifests,
  electronAlicizationListExecutionEvents,
  electronAlicizationListExecutorSessions,
  electronAlicizationListTaskThreads,
  electronAlicizationPlanTaskThread,
  electronAlicizationResumeTaskThread,
  electronAlicizationUpsertChannelCapabilityManifest,
  electronAlicizationUpsertExecutorSession,
  electronAlicizationUpsertTaskThread,
} from '../../../shared/eventa'

interface RegisterAlicizationTaskInvokeHandlersOptions {
  registerInvokeHandler: (channel: unknown, handler: (...args: any[]) => Promise<unknown>) => void
  withCardScope: <T>(nextCardIdRaw: unknown, task: () => Promise<T>) => Promise<T>
  cardIdFrom: (scope?: any) => string
  getActiveCardId: () => string
  getAlicizationDb: () => any
  getAlicizationKillSwitchState: () => 'ACTIVE' | 'SUSPENDED'
  getAlicizationCardKillSwitchState: (cardId: string) => 'ACTIVE' | 'SUSPENDED'
  resolveTaskPlanningCapabilities: (capabilities?: AlicizationChannelCapability[]) => Promise<AlicizationChannelCapability[]>
  planTaskThread: (...args: any[]) => Promise<unknown>
  dispatchTaskThread: (...args: any[]) => Promise<unknown>
  resumeMainGatewayTaskThread: (input: {
    context: {
      cardId: string
      sessionId: string
      turnId: string
      decisionTraceId?: string | null
      toolCallId?: string | null
    }
    expectedActionKind: AlicizationResumeTaskThreadInput['actionKind']
    expectedChannel: AlicizationResumeTaskThreadInput['expectedChannel']
    expectedUpdatedAt: AlicizationResumeTaskThreadInput['expectedUpdatedAt']
    threadId: AlicizationResumeTaskThreadInput['threadId']
  }) => Promise<{
    accepted?: boolean
    errorCode?: string
    errorMessage?: string
    finalStatus?: AlicizationResumeTaskThreadResult['finalStatus']
    ok: boolean
    recovery?: AlicizationResumeTaskThreadResult['recovery']
    summary: string
  }>
  appendAuditLog: (input: AlicizationAuditLogInput) => Promise<void>
  onAlicizationKillSwitchChanged: (listener: (snapshot: { state: 'ACTIVE' | 'SUSPENDED' }) => void) => () => void
  onAlicizationCardKillSwitchChanged: (listener: (entry: { cardId: string, snapshot: { state: 'ACTIVE' | 'SUSPENDED' } }) => void) => () => void
}

export function registerAlicizationTaskInvokeHandlers(options: RegisterAlicizationTaskInvokeHandlersOptions) {
  const {
    registerInvokeHandler,
    withCardScope,
    cardIdFrom,
    getActiveCardId,
    getAlicizationDb,
    getAlicizationKillSwitchState,
    getAlicizationCardKillSwitchState,
    resolveTaskPlanningCapabilities,
    planTaskThread,
    dispatchTaskThread,
    resumeMainGatewayTaskThread,
    appendAuditLog,
    onAlicizationKillSwitchChanged,
    onAlicizationCardKillSwitchChanged,
  } = options
  const getCanonicalSessionId = () => alicizationPrimaryConversationSessionId(getActiveCardId())

  registerInvokeHandler(electronAlicizationUpsertTaskThread, async (payload: AlicizationUpsertTaskThreadPayload) => await withCardScope(payload.cardId, async () => {
    const row = await getAlicizationDb().upsertTaskThread({
      ...payload,
      sessionId: getCanonicalSessionId(),
    })
    return row as AlicizationTaskThreadRecord
  }))

  registerInvokeHandler(electronAlicizationListTaskThreads, async (payload: AlicizationListTaskThreadsPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listTaskThreads({
      decisionTraceId: payload.decisionTraceId,
      turnId: payload.turnId,
      sessionId: getCanonicalSessionId(),
      status: payload.status,
      limit: payload.limit,
    })
    return rows as AlicizationTaskThreadRecord[]
  }))

  registerInvokeHandler(electronAlicizationUpsertChannelCapabilityManifest, async (payload: AlicizationUpsertChannelCapabilityManifestPayload) => await withCardScope(payload.cardId, async () => {
    const row = await getAlicizationDb().upsertChannelCapabilityManifest(payload)
    return row as AlicizationChannelCapabilityManifestRecord
  }))

  registerInvokeHandler(electronAlicizationListChannelCapabilityManifests, async (payload: AlicizationListChannelCapabilityManifestsPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listChannelCapabilityManifests({
      channel: payload.channel,
      available: payload.available,
      enabled: payload.enabled,
      ready: payload.ready,
      limit: payload.limit,
    })
    return rows as AlicizationChannelCapabilityManifestRecord[]
  }))

  registerInvokeHandler(electronAlicizationUpsertExecutorSession, async (payload: AlicizationUpsertExecutorSessionPayload) => await withCardScope(payload.cardId, async () => {
    const row = await getAlicizationDb().upsertExecutorSession(payload)
    return row as AlicizationExecutorSessionRecord
  }))

  registerInvokeHandler(electronAlicizationListExecutorSessions, async (payload: AlicizationListExecutorSessionsPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listExecutorSessions({
      channel: payload.channel,
      affinityKey: payload.affinityKey,
      status: payload.status,
      limit: payload.limit,
    })
    return rows as AlicizationExecutorSessionRecord[]
  }))

  registerInvokeHandler(electronAlicizationAppendExecutionEvents, async (payload: AlicizationAppendExecutionEventsPayload) => await withCardScope(payload.cardId, async () => {
    const sessionId = getCanonicalSessionId()
    await getAlicizationDb().appendExecutionEvents(payload.events.map(event => ({
      ...event,
      sessionId,
    })))
  }))

  registerInvokeHandler(electronAlicizationListExecutionEvents, async (payload: AlicizationListExecutionEventsPayload) => await withCardScope(payload.cardId, async () => {
    const rows = await getAlicizationDb().listExecutionEvents({
      threadId: payload.threadId,
      decisionTraceId: payload.decisionTraceId,
      turnId: payload.turnId,
      limit: payload.limit,
    })
    return rows as AlicizationExecutionEventRecord[]
  }))

  registerInvokeHandler(electronAlicizationPlanTaskThread, async payload => await withCardScope(cardIdFrom(payload), async () => {
    const activeCardId = getActiveCardId()
    const killSwitchSuspended = getAlicizationKillSwitchState() === 'SUSPENDED'
      || getAlicizationCardKillSwitchState(activeCardId) === 'SUSPENDED'
    const planningCapabilities = await resolveTaskPlanningCapabilities(payload.capabilities)
    return await planTaskThread({
      threadId: payload.threadId,
      trace: {
        ...payload.trace,
        sessionId: getCanonicalSessionId(),
      },
      task: payload.task,
      capabilities: planningCapabilities,
      killSwitchSuspended,
    })
  }))

  registerInvokeHandler(electronAlicizationDispatchTaskThread, async (payload: AlicizationDispatchTaskThreadPayload) => await withCardScope(cardIdFrom(payload), async () => {
    const cardId = getActiveCardId()
    const abortController = new AbortController()
    const removeGlobalKillSwitchListener = onAlicizationKillSwitchChanged((snapshot) => {
      if (snapshot.state === 'SUSPENDED')
        abortController.abort('kill-switch-suspended')
    })
    const removeCardKillSwitchListener = onAlicizationCardKillSwitchChanged((entry) => {
      if (entry.cardId === cardId && entry.snapshot.state === 'SUSPENDED')
        abortController.abort('kill-switch-suspended')
    })

    try {
      const killSwitchSuspended = getAlicizationKillSwitchState() === 'SUSPENDED'
        || getAlicizationCardKillSwitchState(cardId) === 'SUSPENDED'
      const alicizationDb = getAlicizationDb()
      return await dispatchTaskThread({
        getTaskThread: alicizationDb.getTaskThread,
        upsertTaskThread: alicizationDb.upsertTaskThread,
        upsertExecutorSession: alicizationDb.upsertExecutorSession,
        appendExecutionEvents: alicizationDb.appendExecutionEvents,
        appendAuditLog,
      }, {
        threadId: payload.threadId,
        cli: payload.cli,
        codex: payload.codex,
        claudeCode: payload.claudeCode,
        localVisual: payload.localVisual,
        openclaw: payload.openclaw,
        killSwitchSuspended,
        abortSignal: abortController.signal,
      })
    }
    finally {
      removeGlobalKillSwitchListener()
      removeCardKillSwitchListener()
    }
  }))

  registerInvokeHandler(electronAlicizationResumeTaskThread, async (payload: AlicizationCardScope & AlicizationResumeTaskThreadInput): Promise<AlicizationResumeTaskThreadResult> => await withCardScope(getActiveCardId(), async () => {
    const cardId = getActiveCardId()
    const killSwitchSuspended = getAlicizationKillSwitchState() === 'SUSPENDED'
      || getAlicizationCardKillSwitchState(cardId) === 'SUSPENDED'
    if (killSwitchSuspended) {
      return {
        ok: false,
        accepted: false,
        finalStatus: 'blocked',
        summary: 'Task recovery was blocked while Alicization is suspended.',
        errorCode: 'ALICIZATION_KILL_SWITCH_SUSPENDED',
        errorMessage: '恢复任务前请先解除暂停状态。',
        recovery: null,
      }
    }

    const turnId = `ui:recovery:${randomUUID()}`
    const result = await resumeMainGatewayTaskThread({
      context: {
        cardId,
        sessionId: getCanonicalSessionId(),
        turnId,
        decisionTraceId: `trace:${turnId}`,
        toolCallId: `recovery:${payload.threadId}:${payload.actionKind}`,
      },
      expectedActionKind: payload.actionKind,
      expectedChannel: payload.expectedChannel,
      expectedUpdatedAt: payload.expectedUpdatedAt,
      threadId: payload.threadId,
    })

    return {
      ok: result.ok,
      accepted: result.accepted,
      finalStatus: result.finalStatus ?? null,
      summary: result.summary,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
      recovery: result.recovery ?? null,
    }
  }))
}
