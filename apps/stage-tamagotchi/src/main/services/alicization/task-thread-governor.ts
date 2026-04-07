import type {
  AlicizationClawFabricPlan,
  AlicizationClawTaskIntent,
  AlicizationExecutionEventInput,
  AlicizationExecutionEventKind,
  AlicizationExecutionTurnOrigin,
  AlicizationPlanTaskThreadInput,
  AlicizationPlanTaskThreadResult,
  AlicizationTaskThreadRecord,
  AlicizationTaskThreadUpsertInput,
} from '@proj-alicization/stage-shared'

import { randomUUID } from 'node:crypto'

import { buildClawFabricPlan } from './claw-fabric'

type TaskThreadPersistencePort = Pick<{
  upsertTaskThread: (input: AlicizationTaskThreadUpsertInput) => Promise<AlicizationTaskThreadRecord>
  appendExecutionEvents: (events: AlicizationExecutionEventInput[]) => Promise<void>
}, 'upsertTaskThread' | 'appendExecutionEvents'>

export interface AlicizationTaskThreadPlanningInput extends AlicizationPlanTaskThreadInput {
  killSwitchSuspended?: boolean
  now?: number
}

export interface AlicizationTaskThreadPlanningDraft {
  thread: AlicizationTaskThreadUpsertInput
  plan: AlicizationClawFabricPlan
  events: AlicizationExecutionEventInput[]
}

function normalizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function mapTaskOriginToExecutionOrigin(origin: AlicizationClawTaskIntent['origin'], fallback?: AlicizationExecutionTurnOrigin | null): AlicizationExecutionTurnOrigin {
  if (origin === 'proactive')
    return 'subconscious-proactive'
  if (origin === 'system')
    return 'system'
  if (fallback === 'subconscious-proactive' || fallback === 'system')
    return fallback
  return 'user-turn'
}

function deriveTaskThreadStatus(plan: AlicizationClawFabricPlan) {
  if (plan.state === 'blocked')
    return 'blocked' as const
  if (plan.state === 'needs-affirmation')
    return 'needs-affirmation' as const
  return 'planned' as const
}

function buildThreadSummary(input: {
  task: AlicizationClawTaskIntent
  plan: AlicizationClawFabricPlan
}) {
  const goal = normalizeText(input.task.goal, 140) || 'the current task'
  const primaryNarrative = input.plan.narrative[0] ?? ''
  if (primaryNarrative)
    return primaryNarrative
  if (input.plan.state === 'blocked')
    return `Execution stayed blocked for ${goal}.`
  if (input.plan.state === 'needs-affirmation')
    return `Execution is waiting for affirmation before ${input.plan.proposedChannel ?? 'a channel'} can act on ${goal}.`
  return `Execution planned ${input.plan.proposedChannel ?? 'a structured channel'} for ${goal}.`
}

export function buildTaskThreadPlanningDraft(input: AlicizationTaskThreadPlanningInput): AlicizationTaskThreadPlanningDraft {
  const now = Number.isFinite(input.now)
    ? Math.max(0, Math.floor(Number(input.now)))
    : Date.now()
  const capabilities = Array.isArray(input.capabilities)
    ? input.capabilities
    : []
  const plan = buildClawFabricPlan({
    task: input.task,
    capabilities,
    killSwitchSuspended: input.killSwitchSuspended,
  })
  const threadId = normalizeText(input.threadId, 80) || randomUUID()
  const decisionTraceId = normalizeText(input.trace?.decisionTraceId, 120) || null
  const turnId = normalizeText(input.trace?.turnId, 120) || null
  const sessionId = normalizeText(input.trace?.sessionId, 120) || null
  const origin = mapTaskOriginToExecutionOrigin(input.task.origin, input.trace?.origin)
  const status = deriveTaskThreadStatus(plan)

  const thread: AlicizationTaskThreadUpsertInput = {
    id: threadId,
    decisionTraceId,
    turnId,
    sessionId,
    origin,
    goal: input.task.goal,
    kind: input.task.kind,
    status,
    selectedChannel: plan.selectedChannel,
    proposedChannel: plan.proposedChannel,
    summary: buildThreadSummary({
      task: input.task,
      plan,
    }),
    metadata: {
      task: {
        effect: input.task.effect ?? null,
        permissionMode: input.task.permissionMode ?? null,
        justification: input.task.justification ?? null,
        riskBudget: input.task.riskBudget ?? null,
        requestedChannel: input.task.requestedChannel ?? null,
        requiresVisualGrounding: input.task.requiresVisualGrounding === true,
        prefersPersistentSession: input.task.prefersPersistentSession === true,
      },
      fabric: {
        state: plan.state,
        preferredChannels: plan.preferredChannels,
        fallbackChannels: plan.fallbackChannels,
        reasonTags: plan.reasonTags,
        affirmationReasonCodes: plan.affirmationReasonCodes,
        blockedReasonCodes: plan.blockedReasonCodes,
      },
    },
    createdAt: now,
    updatedAt: now,
    lastEventAt: now,
    completedAt: null,
  }

  const events: AlicizationExecutionEventInput[] = [{
    threadId,
    decisionTraceId,
    turnId,
    sessionId,
    origin,
    channel: plan.proposedChannel,
    kind: 'plan',
    threadStatus: status,
    payload: {
      state: plan.state,
      goal: input.task.goal,
      preferredChannels: plan.preferredChannels,
      fallbackChannels: plan.fallbackChannels,
      selectedChannel: plan.selectedChannel,
      proposedChannel: plan.proposedChannel,
      reasonTags: plan.reasonTags,
      narrative: plan.narrative,
      affirmationReasonCodes: plan.affirmationReasonCodes,
      blockedReasonCodes: plan.blockedReasonCodes,
      candidateCount: plan.candidates.length,
    },
    createdAt: now,
  }]

  return {
    thread,
    plan,
    events,
  }
}

export async function persistTaskThreadPlanningDraft(
  port: TaskThreadPersistencePort,
  input: AlicizationTaskThreadPlanningInput,
): Promise<AlicizationPlanTaskThreadResult> {
  const draft = buildTaskThreadPlanningDraft(input)
  const thread = await port.upsertTaskThread(draft.thread)
  await port.appendExecutionEvents(draft.events)
  return {
    thread,
    plan: draft.plan,
    createdEventKinds: draft.events.map(event => event.kind).filter((kind): kind is AlicizationExecutionEventKind => Boolean(kind)),
  }
}
