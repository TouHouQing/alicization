import type {
  AlicizationClawFabricPlan,
  AlicizationExecutionChannel,
  AlicizationExecutionEventInput,
  AlicizationExecutionEventKind,
  AlicizationExecutorSessionRecord,
  AlicizationListExecutorSessionsInput,
  AlicizationListTaskThreadsInput,
  AlicizationPlanTaskThreadResult,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadStatus,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import type { AlicizationTaskThreadPlanningDraft, AlicizationTaskThreadPlanningInput } from './task-thread-governor'

import { alicizationExecutionChannels } from './claw-fabric'
import { readTaskThreadActivityAt } from './execution-ledger-shared'
import { resolveExecutionTransportChannel } from './executor-adapters/embodied-channel'
import { buildTaskThreadPlanningDraft } from './task-thread-governor'

export interface AlicizationTaskExecutionGovernorPort {
  appendExecutionEvents: (events: AlicizationExecutionEventInput[]) => Promise<void>
  listExecutorSessions: (input?: AlicizationListExecutorSessionsInput) => Promise<AlicizationExecutorSessionRecord[]>
  listTaskThreads: (input?: AlicizationListTaskThreadsInput) => Promise<AlicizationTaskThreadRecord[]>
  upsertTaskThread: (input: AlicizationTaskThreadUpsertInput) => Promise<AlicizationTaskThreadRecord>
}

export interface AlicizationTaskExecutionGovernorSnapshot {
  disposition: 'planned' | 'duplicate' | 'budget-blocked'
  reasonCodes: string[]
  duplicateThreadId: string | null
  duplicateStatus: AlicizationTaskThreadStatus | null
  activeThreadIds: string[]
  resumedExecutorSessionId: string | null
  resumedExternalSessionId: string | null
}

export interface AlicizationGovernedTaskThreadPlanningResult extends AlicizationPlanTaskThreadResult {
  governor: AlicizationTaskExecutionGovernorSnapshot
}

interface AlicizationTaskExecutionGovernorOptions {
  dedupeWindowMs?: number
  getNow?: () => number
  maxActiveThreadsPerSession?: number
  maxInspectableThreads?: number
  maxRunningThreadsPerSession?: number
}

interface AlicizationTaskThreadDuplicateMatch {
  reasonCodes: string[]
  thread: AlicizationTaskThreadRecord
}

interface AlicizationTaskThreadBudgetDecision {
  activeThreadIds: string[]
  reasonCodes: string[]
  summary: string
}

interface AlicizationGovernorSessionResumeHint {
  affinityKey: string
  channel: AlicizationExecutionChannel
  executorSessionId: string
  externalSessionId: string | null
  status: AlicizationExecutorSessionRecord['status']
}

const activeTaskThreadStatuses: AlicizationTaskThreadStatus[] = [
  'planned',
  'needs-affirmation',
  'running',
  'paused',
  'blocked',
]

const dispatchableTaskThreadStatuses = new Set<AlicizationTaskThreadStatus>([
  'planned',
  'needs-affirmation',
  'running',
  'paused',
])

const executionChannelSet = new Set<AlicizationExecutionChannel>(alicizationExecutionChannels)

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeSignatureText(raw: unknown, maxChars = 220) {
  return sanitizeText(raw, maxChars).toLowerCase()
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return [...new Set(values.map(value => sanitizeText(value, 160)).filter(Boolean))]
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function asStringArray(raw: unknown) {
  return Array.isArray(raw)
    ? raw.map(value => sanitizeText(value, 120)).filter(Boolean)
    : []
}

function asExecutionChannelArray(raw: unknown) {
  return Array.isArray(raw)
    ? raw
        .map(value => sanitizeText(value, 120))
        .filter((value): value is AlicizationExecutionChannel => executionChannelSet.has(value as AlicizationExecutionChannel))
    : []
}

function buildThreadGoalSignature(thread: Pick<AlicizationTaskThreadRecord, 'goal' | 'kind' | 'proposedChannel' | 'selectedChannel'>) {
  const goal = normalizeSignatureText(thread.goal, 240)
  const channel = normalizeSignatureText(thread.proposedChannel ?? thread.selectedChannel, 80) || 'unrouted'
  return [
    normalizeSignatureText(thread.kind, 80) || 'unknown',
    channel,
    goal,
  ].join('::')
}

function buildPlanGoalSignature(
  thread: Pick<AlicizationTaskThreadRecord, 'goal' | 'kind'>,
  plan: Pick<AlicizationClawFabricPlan, 'proposedChannel' | 'selectedChannel'>,
) {
  const goal = normalizeSignatureText(thread.goal, 240)
  const channel = normalizeSignatureText(plan.proposedChannel ?? plan.selectedChannel, 80) || 'unrouted'
  return [
    normalizeSignatureText(thread.kind, 80) || 'unknown',
    channel,
    goal,
  ].join('::')
}

function buildPlanFromTaskThread(
  thread: AlicizationTaskThreadRecord,
  fallbackPlan: AlicizationClawFabricPlan,
): AlicizationClawFabricPlan {
  const metadata = asRecord(thread.metadata)
  const fabric = asRecord(metadata?.fabric)
  const state = thread.status === 'needs-affirmation'
    ? 'needs-affirmation'
    : thread.status === 'blocked'
      ? 'blocked'
      : thread.selectedChannel
        ? 'routed'
        : fallbackPlan.state

  return {
    state,
    selectedChannel: state === 'routed'
      ? (thread.selectedChannel ?? fallbackPlan.selectedChannel)
      : null,
    proposedChannel: thread.proposedChannel ?? thread.selectedChannel ?? fallbackPlan.proposedChannel,
    preferredChannels: asExecutionChannelArray(fabric?.preferredChannels),
    fallbackChannels: asExecutionChannelArray(fabric?.fallbackChannels),
    candidates: fallbackPlan.candidates,
    reasonTags: uniqueStrings([
      ...asStringArray(fabric?.reasonTags),
      ...(thread.summary ? ['existing-task-thread'] : []),
    ]),
    narrative: uniqueStrings([
      thread.summary,
      ...asStringArray(fabric?.narrative),
      ...fallbackPlan.narrative,
    ]),
    affirmationReasonCodes: uniqueStrings(asStringArray(fabric?.affirmationReasonCodes)),
    blockedReasonCodes: uniqueStrings(asStringArray(fabric?.blockedReasonCodes)),
  }
}

function buildGovernorMetadata(input: {
  activeThreadIds: string[]
  disposition: AlicizationTaskExecutionGovernorSnapshot['disposition']
  duplicateThreadId?: string | null
  duplicateStatus?: AlicizationTaskThreadStatus | null
  reasonCodes: string[]
  sessionResumeHint?: AlicizationGovernorSessionResumeHint | null
  thread: AlicizationTaskThreadUpsertInput
}) {
  const existingMetadata = asRecord(input.thread.metadata) ?? {}
  const existingGovernor = asRecord(existingMetadata.governor) ?? {}

  return {
    ...existingMetadata,
    governor: {
      ...existingGovernor,
      disposition: input.disposition,
      reasonCodes: uniqueStrings([
        ...asStringArray(existingGovernor.reasonCodes),
        ...input.reasonCodes,
      ]),
      duplicateThreadId: sanitizeText(input.duplicateThreadId, 120) || null,
      duplicateStatus: sanitizeText(input.duplicateStatus, 64) || null,
      activeThreadIds: uniqueStrings([
        ...asStringArray(existingGovernor.activeThreadIds),
        ...input.activeThreadIds,
      ]),
      sessionResume: input.sessionResumeHint
        ? {
            channel: input.sessionResumeHint.channel,
            executorSessionId: input.sessionResumeHint.executorSessionId,
            externalSessionId: input.sessionResumeHint.externalSessionId,
            affinityKey: input.sessionResumeHint.affinityKey,
            status: input.sessionResumeHint.status,
          }
        : existingGovernor.sessionResume ?? null,
    },
  } satisfies Record<string, unknown>
}

function applyGovernorMetadataToDraft(input: {
  activeThreadIds: string[]
  disposition: AlicizationTaskExecutionGovernorSnapshot['disposition']
  duplicateThreadId?: string | null
  duplicateStatus?: AlicizationTaskThreadStatus | null
  draft: AlicizationTaskThreadPlanningDraft
  reasonCodes: string[]
  sessionResumeHint?: AlicizationGovernorSessionResumeHint | null
}) {
  return {
    ...input.draft,
    thread: {
      ...input.draft.thread,
      metadata: buildGovernorMetadata({
        activeThreadIds: input.activeThreadIds,
        disposition: input.disposition,
        duplicateThreadId: input.duplicateThreadId,
        duplicateStatus: input.duplicateStatus,
        reasonCodes: input.reasonCodes,
        sessionResumeHint: input.sessionResumeHint,
        thread: input.draft.thread,
      }),
    },
  } satisfies AlicizationTaskThreadPlanningDraft
}

function applyBudgetBlockToDraft(input: {
  activeThreadIds: string[]
  decision: AlicizationTaskThreadBudgetDecision
  draft: AlicizationTaskThreadPlanningDraft
}) {
  const blockedReasonCodes = uniqueStrings([
    ...input.draft.plan.blockedReasonCodes,
    ...input.decision.reasonCodes,
  ])
  const narrative = uniqueStrings([
    input.decision.summary,
    ...input.draft.plan.narrative,
  ])
  const draftWithGovernor = applyGovernorMetadataToDraft({
    activeThreadIds: input.activeThreadIds,
    disposition: 'budget-blocked',
    draft: input.draft,
    reasonCodes: input.decision.reasonCodes,
  })

  const thread: AlicizationTaskThreadUpsertInput = {
    ...draftWithGovernor.thread,
    status: 'blocked',
    selectedChannel: null,
    proposedChannel: input.draft.plan.proposedChannel ?? input.draft.plan.selectedChannel,
    summary: input.decision.summary,
    metadata: {
      ...asRecord(draftWithGovernor.thread.metadata),
      fabric: {
        ...asRecord(asRecord(draftWithGovernor.thread.metadata)?.fabric),
        state: 'blocked',
        selectedChannel: null,
        proposedChannel: input.draft.plan.proposedChannel ?? input.draft.plan.selectedChannel,
        blockedReasonCodes,
        reasonTags: uniqueStrings([
          ...input.draft.plan.reasonTags,
          'governor-budget-blocked',
        ]),
        narrative,
      },
    },
  }

  const plan: AlicizationClawFabricPlan = {
    ...input.draft.plan,
    state: 'blocked',
    selectedChannel: null,
    proposedChannel: input.draft.plan.proposedChannel ?? input.draft.plan.selectedChannel,
    blockedReasonCodes,
    reasonTags: uniqueStrings([
      ...input.draft.plan.reasonTags,
      'governor-budget-blocked',
    ]),
    narrative,
  }

  const events = input.draft.events.map((event) => {
    if (event.kind !== 'plan')
      return event

    return {
      ...event,
      channel: plan.proposedChannel,
      threadStatus: 'blocked',
      payload: {
        ...asRecord(event.payload),
        state: 'blocked',
        selectedChannel: null,
        proposedChannel: plan.proposedChannel,
        blockedReasonCodes,
        reasonTags: plan.reasonTags,
        narrative,
        governorReasonCodes: input.decision.reasonCodes,
        activeThreadIds: input.activeThreadIds,
      },
    } satisfies AlicizationExecutionEventInput
  })

  return {
    thread,
    plan,
    events,
  } satisfies AlicizationTaskThreadPlanningDraft
}

function matchDuplicateThread(input: {
  dedupeWindowMs: number
  draft: AlicizationTaskThreadPlanningDraft
  now: number
  threads: AlicizationTaskThreadRecord[]
}): AlicizationTaskThreadDuplicateMatch | null {
  const signature = buildPlanGoalSignature(input.draft.thread, input.draft.plan)
  if (!signature)
    return null

  for (const thread of input.threads) {
    if (thread.id === input.draft.thread.id)
      continue
    if (input.now - readTaskThreadActivityAt(thread) > input.dedupeWindowMs)
      continue
    if (buildThreadGoalSignature(thread) !== signature)
      continue

    return {
      thread,
      reasonCodes: ['duplicate-active-thread'],
    }
  }

  return null
}

function evaluateSessionBudget(input: {
  activeThreads: AlicizationTaskThreadRecord[]
  draft: AlicizationTaskThreadPlanningDraft
  maxActiveThreadsPerSession: number
  maxRunningThreadsPerSession: number
}): AlicizationTaskThreadBudgetDecision | null {
  if (input.draft.plan.state !== 'routed' || !input.draft.thread.sessionId)
    return null

  const activeThreads = input.activeThreads.filter(thread => dispatchableTaskThreadStatuses.has(thread.status))
  if (activeThreads.length === 0)
    return null

  const runningThreads = activeThreads.filter(thread => thread.status === 'running')
  if (runningThreads.length >= input.maxRunningThreadsPerSession) {
    return {
      activeThreadIds: runningThreads.map(thread => thread.id),
      reasonCodes: ['session-running-thread-budget-exhausted'],
      summary: 'Execution stayed blocked because this session is already carrying another running task thread.',
    }
  }

  if (activeThreads.length >= input.maxActiveThreadsPerSession) {
    return {
      activeThreadIds: activeThreads.map(thread => thread.id),
      reasonCodes: ['session-active-thread-budget-exhausted'],
      summary: 'Execution stayed blocked because this session is already carrying too many active task threads.',
    }
  }

  return null
}

async function resolveSessionResumeHint(
  port: AlicizationTaskExecutionGovernorPort,
  draft: AlicizationTaskThreadPlanningDraft,
): Promise<AlicizationGovernorSessionResumeHint | null> {
  const affinityKey = sanitizeText(draft.thread.sessionId, 200)
  if (!affinityKey)
    return null

  const routedChannel = draft.plan.selectedChannel ?? draft.plan.proposedChannel
  const transportChannel = resolveExecutionTransportChannel(routedChannel)
  if (transportChannel !== 'openclaw')
    return null

  const sessions = await port.listExecutorSessions({
    affinityKey,
    channel: transportChannel,
    status: ['active', 'running'],
    limit: 8,
  })
  const session = sessions.find(entry => sanitizeText(entry.externalSessionId, 160)) ?? sessions[0] ?? null
  if (!session)
    return null

  return {
    affinityKey,
    channel: transportChannel,
    executorSessionId: session.id,
    externalSessionId: session.externalSessionId,
    status: session.status,
  }
}

function createGovernorSnapshot(input: {
  activeThreadIds: string[]
  disposition: AlicizationTaskExecutionGovernorSnapshot['disposition']
  duplicateMatch?: AlicizationTaskThreadDuplicateMatch | null
  reasonCodes: string[]
  sessionResumeHint?: AlicizationGovernorSessionResumeHint | null
}): AlicizationTaskExecutionGovernorSnapshot {
  return {
    disposition: input.disposition,
    reasonCodes: uniqueStrings(input.reasonCodes),
    duplicateThreadId: input.duplicateMatch?.thread.id ?? null,
    duplicateStatus: input.duplicateMatch?.thread.status ?? null,
    activeThreadIds: [...new Set(input.activeThreadIds)],
    resumedExecutorSessionId: input.sessionResumeHint?.executorSessionId ?? null,
    resumedExternalSessionId: input.sessionResumeHint?.externalSessionId ?? null,
  }
}

export function createTaskExecutionGovernor(options: AlicizationTaskExecutionGovernorOptions = {}) {
  const getNow = options.getNow ?? Date.now
  const dedupeWindowMs = Math.max(30_000, Math.floor(options.dedupeWindowMs ?? 10 * 60_000))
  const maxInspectableThreads = Math.max(4, Math.floor(options.maxInspectableThreads ?? 24))
  const maxActiveThreadsPerSession = Math.max(1, Math.floor(options.maxActiveThreadsPerSession ?? 4))
  const maxRunningThreadsPerSession = Math.max(1, Math.floor(options.maxRunningThreadsPerSession ?? 1))

  async function plan(
    port: AlicizationTaskExecutionGovernorPort,
    input: AlicizationTaskThreadPlanningInput,
  ): Promise<AlicizationGovernedTaskThreadPlanningResult> {
    const now = Number.isFinite(input.now)
      ? Math.max(0, Math.floor(Number(input.now)))
      : getNow()
    const draft = buildTaskThreadPlanningDraft({
      ...input,
      now,
    })
    const lookupSessionId = sanitizeText(draft.thread.sessionId, 160)
    const lookupDecisionTraceId = sanitizeText(draft.thread.decisionTraceId, 160)
    const comparableThreads = lookupSessionId
      ? await port.listTaskThreads({
          sessionId: lookupSessionId,
          status: activeTaskThreadStatuses,
          limit: maxInspectableThreads,
        })
      : lookupDecisionTraceId
        ? await port.listTaskThreads({
            decisionTraceId: lookupDecisionTraceId,
            status: activeTaskThreadStatuses,
            limit: maxInspectableThreads,
          })
        : []

    const duplicateMatch = matchDuplicateThread({
      draft,
      dedupeWindowMs,
      now,
      threads: comparableThreads,
    })
    if (duplicateMatch) {
      return {
        thread: duplicateMatch.thread,
        plan: buildPlanFromTaskThread(duplicateMatch.thread, draft.plan),
        createdEventKinds: [],
        governor: createGovernorSnapshot({
          activeThreadIds: comparableThreads.map(thread => thread.id),
          disposition: 'duplicate',
          duplicateMatch,
          reasonCodes: duplicateMatch.reasonCodes,
        }),
      }
    }

    const budgetDecision = evaluateSessionBudget({
      activeThreads: comparableThreads,
      draft,
      maxActiveThreadsPerSession,
      maxRunningThreadsPerSession,
    })
    const activeThreadIds = comparableThreads.map(thread => thread.id)
    const draftAfterBudget = budgetDecision
      ? applyBudgetBlockToDraft({
          activeThreadIds,
          decision: budgetDecision,
          draft,
        })
      : draft
    const sessionResumeHint = await resolveSessionResumeHint(port, draftAfterBudget)
    const finalDraft = applyGovernorMetadataToDraft({
      activeThreadIds,
      disposition: budgetDecision ? 'budget-blocked' : 'planned',
      draft: draftAfterBudget,
      reasonCodes: budgetDecision?.reasonCodes ?? [],
      sessionResumeHint,
    })

    const thread = await port.upsertTaskThread(finalDraft.thread)
    await port.appendExecutionEvents(finalDraft.events)

    return {
      thread,
      plan: finalDraft.plan,
      createdEventKinds: finalDraft.events
        .map(event => event.kind)
        .filter((kind): kind is AlicizationExecutionEventKind => Boolean(kind)),
      governor: createGovernorSnapshot({
        activeThreadIds,
        disposition: budgetDecision ? 'budget-blocked' : 'planned',
        reasonCodes: budgetDecision?.reasonCodes ?? [],
        sessionResumeHint,
      }),
    }
  }

  return {
    plan,
  }
}
