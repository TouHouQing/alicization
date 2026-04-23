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

import type { AlicizationClawFabricExperience } from './claw-fabric'

import { randomUUID } from 'node:crypto'

import { buildClawFabricPlan } from './claw-fabric'

type TaskThreadPersistencePort = Pick<{
  upsertTaskThread: (input: AlicizationTaskThreadUpsertInput) => Promise<AlicizationTaskThreadRecord>
  appendExecutionEvents: (events: AlicizationExecutionEventInput[]) => Promise<void>
}, 'upsertTaskThread' | 'appendExecutionEvents'>

export interface AlicizationTaskThreadPlanningInput extends AlicizationPlanTaskThreadInput {
  experience?: AlicizationClawFabricExperience | null
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

function normalizeChannelExperienceMetadata(
  experience: AlicizationClawFabricExperience | null | undefined,
) {
  if (!experience)
    return null

  const channelOutcomes = Object.entries(experience.channelOutcomes ?? {})
    .map(([channel, outcome]) => {
      if (!outcome)
        return null
      return [channel, {
        planned: Number.isFinite(outcome.planned) ? Math.max(0, Math.floor(Number(outcome.planned))) : 0,
        running: Number.isFinite(outcome.running) ? Math.max(0, Math.floor(Number(outcome.running))) : 0,
        completed: Number.isFinite(outcome.completed) ? Math.max(0, Math.floor(Number(outcome.completed))) : 0,
        failed: Number.isFinite(outcome.failed) ? Math.max(0, Math.floor(Number(outcome.failed))) : 0,
        cancelled: Number.isFinite(outcome.cancelled) ? Math.max(0, Math.floor(Number(outcome.cancelled))) : 0,
      }] as const
    })
    .filter((entry): entry is readonly [string, {
      planned: number
      running: number
      completed: number
      failed: number
      cancelled: number
    }] => Boolean(entry))

  return {
    sessionResumeChannel: normalizeText(experience.sessionResumeChannel, 80) || null,
    activeChannels: Array.isArray(experience.activeChannels)
      ? [...new Set(experience.activeChannels.map(channel => normalizeText(channel, 80)).filter(Boolean))]
      : [],
    goalAffinityChannel: normalizeText(experience.goalAffinityChannel, 80) || null,
    goalAffinityScore: Number.isFinite(experience.goalAffinityScore)
      ? Math.max(0, Math.min(1, Number(experience.goalAffinityScore)))
      : null,
    goalAffinityReason: normalizeText(experience.goalAffinityReason, 200) || null,
    advisorChannel: normalizeText(experience.advisorChannel, 80) || null,
    advisorConfidence: Number.isFinite(experience.advisorConfidence)
      ? Math.max(0, Math.min(1, Number(experience.advisorConfidence)))
      : null,
    advisorReason: normalizeText(experience.advisorReason, 200) || null,
    rememberedProcedures: Array.isArray(experience.rememberedProcedures)
      ? experience.rememberedProcedures
          .map((item) => {
            if (!item || typeof item !== 'object')
              return null
            return {
              id: normalizeText(item.id, 120) || null,
              sourceKind: item.sourceKind === 'autobiographical' ? 'autobiographical' : 'procedural',
              facet: item.facet === 'phase' || item.facet === 'relationship-era' || item.facet === 'task-era' || item.facet === 'self-era'
                ? item.facet
                : null,
              label: normalizeText(item.label, 160) || null,
              approach: normalizeText(item.approach, 220) || null,
              pitfalls: Array.isArray(item.pitfalls)
                ? [...new Set(item.pitfalls.map(value => normalizeText(value, 120)).filter(Boolean))]
                : [],
              confidence: Number.isFinite(item.confidence)
                ? Math.max(0, Math.min(1, Number(item.confidence)))
                : 0,
              cues: Array.isArray(item.cues)
                ? [...new Set(item.cues.map(value => normalizeText(value, 120)).filter(Boolean))]
                : [],
              preferredChannel: normalizeText(item.preferredChannel, 80) || null,
              preferredChannelReason: normalizeText(item.preferredChannelReason, 200) || null,
            }
          })
          .filter((item): item is NonNullable<typeof item> => Boolean(item && item.id && item.label))
          .slice(0, 4)
      : [],
    channelOutcomes: Object.fromEntries(channelOutcomes),
  }
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
    experience: input.experience,
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
        experience: normalizeChannelExperienceMetadata(input.experience),
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
      experience: normalizeChannelExperienceMetadata(input.experience),
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
