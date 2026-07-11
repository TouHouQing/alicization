import type { AlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import type {
  AlicizationChannelCapability,
  AlicizationClawTaskIntent,
} from '../../../shared/eventa'
import type { AlicizationRuntimeSnapshot } from './alicization-runtime-architecture'
import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'
import type { AlicizationGovernedTaskThreadPlanningResult } from './task-execution-governor'
import type { AlicizationDispatchTaskThreadRuntimeInput } from './task-thread-dispatcher'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import { deriveExecutionInteractionLearningProfile } from './execution-interaction-learning'

type AlicizationObserveDispatchChannel = 'codex' | 'claude-code'

interface AlicizationPendingReminderLike {
  sourceTurnId?: string | null
}

export interface AlicizationAutonomyReminderPlan {
  minutes: number
  message: string
  sourceTurnId: string
  reasonTags: string[]
}

export interface AlicizationAutonomyTaskPlan {
  task: AlicizationClawTaskIntent
  requestedDispatchChannel: AlicizationObserveDispatchChannel
  summary: string
  signature: string
  autoDispatchEligible: boolean
  reasonTags: string[]
}

export interface AlicizationAutonomyActuationPlan {
  reminder: AlicizationAutonomyReminderPlan | null
  task: AlicizationAutonomyTaskPlan | null
  reasonTags: string[]
}

export interface AlicizationAutonomyActuationResult {
  reminderScheduled: boolean
  reminderSourceTurnId: string | null
  taskPlanned: boolean
  taskKind: AlicizationClawTaskIntent['kind'] | null
  taskGoal: string | null
  taskPlanState: 'routed' | 'needs-affirmation' | 'blocked' | 'duplicate' | null
  taskProposedChannel: string | null
  taskSelectedChannel: string | null
  taskSummary: string | null
  taskThreadId: string | null
  taskAffirmationReasonCodes: string[]
  taskDispatched: boolean
  taskDispatchChannel: AlicizationObserveDispatchChannel | null
  reasonTags: string[]
}

export interface AlicizationAutonomyExecutionProposalSurface {
  thought: string
  reply: string
  emotion: 'neutral' | 'concerned' | 'thinking'
  reasonTags: string[]
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeSignatureText(raw: unknown, maxChars = 72) {
  return sanitizeText(raw, maxChars)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxChars)
}

function clampMinutes(value: number) {
  if (!Number.isFinite(value))
    return 10
  return Math.max(5, Math.min(90, Math.floor(value)))
}

function humanizeExecutionChannel(channel: string | null | undefined) {
  const normalized = sanitizeText(channel, 64).toLowerCase()
  if (!normalized)
    return ''
  if (normalized === 'codex' || normalized === 'claude-code')
    return '代码侧'
  if (normalized === 'cli')
    return '命令侧'
  if (normalized === 'openclaw' || normalized === 'software' || normalized === 'browser' || normalized === 'desktop')
    return '界面侧'
  return normalized
}

function carriesSameHerProjectClosureLine(text: string | null | undefined) {
  const normalized = sanitizeText(text, 220).toLowerCase()
  return normalized.includes('same phase 1 digital life')
    || normalized.includes('same living line')
    || normalized.includes('same digital life')
    || normalized.includes('one continuous her')
}

function deriveAutonomyProjectClosureCarry(text: string | null | undefined) {
  const normalized = sanitizeText(text, 220)
  if (!normalized || !carriesSameHerProjectClosureLine(normalized))
    return ''

  const matched = normalized.match(
    /unfinished closure still needs[^.]*|still needs[^.]*same living line[^.]*|still needs[^.]*closure[^.]*|memory and initiative[^.]*still[^.]*/iu,
  )

  return sanitizeText(matched?.[0] ?? '', 120)
}

function enrichAutonomyGoalSummary(input: {
  goalSummary: string
  whyNow?: string | null
}) {
  const goalSummary = sanitizeText(input.goalSummary, 180)
  if (!goalSummary)
    return ''

  const sameHerCarry = input.whyNow && carriesSameHerProjectClosureLine(input.whyNow)
    ? sanitizeText(input.whyNow, 84)
    : ''
  const closureCarry = deriveAutonomyProjectClosureCarry(input.whyNow)
  if (!sameHerCarry && !closureCarry)
    return goalSummary

  return sanitizeText(
    [goalSummary, sameHerCarry, closureCarry]
      .filter(Boolean)
      .join('; '),
    180,
  ) || goalSummary
}

function sanitizeAutonomyDispatchSummary(raw: unknown) {
  return sanitizeAlicizationProviderFacingText(
    raw,
    180,
    'structured_context=withheld_fixed_template_residue',
  ) || 'structured_context=unavailable'
}

function deriveProactiveExecutionRiskBand(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
  interactionLearning: ReturnType<typeof deriveExecutionInteractionLearningProfile>
  taskKind: AlicizationClawTaskIntent['kind']
  requestedDispatchChannel: AlicizationObserveDispatchChannel
  autonomyKind: string | null
}) {
  const worldModel = input.digitalLifeSpine?.runtimeSurface?.world?.worldModel ?? null
  const currentScene = input.digitalLifeSpine?.runtimeSurface?.perception?.currentScene ?? null
  const hostBusy = worldModel?.hostState?.availability === 'focused'
    || worldModel?.hostState?.availability === 'immersed'
  const certainty = sanitizeText(worldModel?.epistemicState?.certainty, 48)
  const sceneScenario = sanitizeText(currentScene?.scenario, 48)
  const codeAgent = input.requestedDispatchChannel === 'codex' || input.requestedDispatchChannel === 'claude-code'
  const groundedEnough = certainty === 'grounded' || certainty === 'observed'
  const lowRiskAutoDispatch
    = input.taskKind === 'codebase-edit'
      && codeAgent
      && !hostBusy
      && sceneScenario === 'coding'
      && groundedEnough
      && input.interactionLearning.proofBias >= 0.32
      && (
        input.autonomyKind === 'repair'
        || input.autonomyKind === 'follow-through'
        || input.autonomyKind === 'guide'
      )

  if (input.taskKind === 'codebase-investigation') {
    return {
      riskBudget: 'low' as const,
      autoDispatchEligible: true,
      reasonTags: ['risk:low', 'autonomy-band:observe-direct'],
    }
  }

  if (lowRiskAutoDispatch) {
    return {
      riskBudget: 'low' as const,
      autoDispatchEligible: true,
      reasonTags: ['risk:low', 'autonomy-band:self-start', 'autonomy-band:rollbackable-code-agent'],
    }
  }

  if (input.taskKind === 'codebase-edit' && codeAgent) {
    return {
      riskBudget: 'medium' as const,
      autoDispatchEligible: false,
      reasonTags: ['risk:medium', 'autonomy-band:confirm-before-mutate'],
    }
  }

  return {
    riskBudget: 'high' as const,
    autoDispatchEligible: false,
    reasonTags: ['risk:high', 'autonomy-band:explicit-only'],
  }
}

function readAutonomy(input: {
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
  runtimeDigest?: AlicizationRuntimeSnapshot | null
}) {
  return input.digitalLifeSpine?.runtimeSurface?.agency?.autonomy ?? null
}

function pickReadyObserveChannel(capabilities?: AlicizationChannelCapability[] | null): AlicizationObserveDispatchChannel | null {
  const provided = Array.isArray(capabilities) ? capabilities : []
  const isReady = (channel: AlicizationObserveDispatchChannel) => provided.some(capability =>
    capability?.channel === channel
    && capability.available === true
    && capability.enabled === true
    && capability.ready === true,
  )

  if (isReady('codex'))
    return 'codex'
  if (isReady('claude-code'))
    return 'claude-code'
  return null
}

function buildReminderMinutes(input: {
  deferReason?: string | null
  reasonTags: string[]
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}) {
  const reason = sanitizeText(input.deferReason, 64)
  const watchMode = sanitizeText(input.digitalLifeSpine?.runtimeSurface?.perception?.watchMode, 48)
  const scenario = sanitizeText(input.digitalLifeSpine?.runtimeSurface?.perception?.currentScene?.scenario, 48)
  const fatigue = Number(input.digitalLifeSpine?.runtimeSurface?.world?.worldModel?.hostState?.burden === 'heavy' ? 80 : 0)

  if (reason === 'rest-window')
    return 45
  if (reason === 'respect-boundary')
    return 24
  if (reason === 'busy-host')
    return scenario === 'coding' || watchMode === 'symbiotic-vision' ? 12 : 16
  if (reason === 'corrected-same-person-settling' || reason === 'quieter-embodiment-settling')
    return 14
  if (reason === 'repair-incomplete')
    return 8
  if (reason === 'needs-grounding')
    return 6
  if (reason === 'waiting-opening')
    return 15
  if (reason === 'not-yet-ripe' || reason === 'hold-formation')
    return 10

  if (input.reasonTags.includes('scene:late-night-care') || fatigue >= 80)
    return 36
  if (input.reasonTags.includes('scene:coding'))
    return 12
  return 18
}

function buildReminderMessage(input: {
  autonomy: NonNullable<ReturnType<typeof readAutonomy>>
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}) {
  const autonomy = input.autonomy
  const activeThread = input.digitalLifeSpine?.runtimeSurface?.world?.worldModel?.activeThread ?? null
  const baseTarget = sanitizeText(
    autonomy.executionIntent?.summary
    ?? autonomy.sourceThreadSummary
    ?? activeThread?.summary
    ?? autonomy.whyNow,
    180,
  )
  const target = enrichAutonomyGoalSummary({
    goalSummary: baseTarget,
    whyNow: autonomy.whyNow,
  }) || 'the held continuity line'
  const deferReason = sanitizeText(autonomy.deferReason, 80)

  const normalizedDeferReason = deferReason || 'waiting-opening'

  return sanitizeText([
    'autonomy_revisit=deferred',
    `target=${target}`,
    `defer_reason=${normalizedDeferReason}`,
    'status=awaiting_opening',
  ].join('; '), 220)
}

export function deriveAutonomyRevisitReminder(input: {
  cardId: string
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
  runtimeDigest?: AlicizationRuntimeSnapshot | null
}): AlicizationAutonomyReminderPlan | null {
  const autonomy = readAutonomy(input)
  if (!autonomy)
    return null
  if (autonomy.shouldSpeak)
    return null
  if (autonomy.shouldAct)
    return null
  if (autonomy.selectedMode !== 'prepare-act' && autonomy.actReadiness < 0.58)
    return null

  const reasonTags = [
    autonomy.deferReason ? `defer:${sanitizeText(autonomy.deferReason, 48)}` : '',
    autonomy.executionIntent?.kind ? `intent:${sanitizeText(autonomy.executionIntent.kind, 48)}` : '',
    autonomy.sourceThreadId ? `thread:${sanitizeText(autonomy.sourceThreadId, 48)}` : '',
    input.digitalLifeSpine?.runtimeSurface?.perception?.currentScene?.scenario
      ? `scene:${sanitizeText(input.digitalLifeSpine.runtimeSurface.perception.currentScene.scenario, 48)}`
      : '',
  ].filter(Boolean)

  const signature = [
    normalizeSignatureText(input.cardId, 32) || 'card',
    normalizeSignatureText(autonomy.sourceThreadId ?? autonomy.sourceGoalId ?? autonomy.sourceAgendaId, 40) || 'global',
    normalizeSignatureText(autonomy.executionIntent?.kind ?? autonomy.visibleAction, 32) || 'hold',
    normalizeSignatureText(autonomy.deferReason ?? 'deferred', 32) || 'deferred',
  ].filter(Boolean).join(':')

  return {
    minutes: clampMinutes(buildReminderMinutes({
      deferReason: autonomy.deferReason ?? null,
      reasonTags,
      digitalLifeSpine: input.digitalLifeSpine ?? null,
    })),
    message: buildReminderMessage({
      autonomy,
      digitalLifeSpine: input.digitalLifeSpine ?? null,
    }),
    sourceTurnId: `autonomy-revisit:${signature}`,
    reasonTags,
  }
}

export function deriveAutonomousTaskPlan(input: {
  cardId: string
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
  runtimeDigest?: AlicizationRuntimeSnapshot | null
  capabilities?: AlicizationChannelCapability[] | null
}): AlicizationAutonomyTaskPlan | null {
  const autonomy = readAutonomy(input)
  const requestedDispatchChannel = pickReadyObserveChannel(input.capabilities)
  const surface = input.digitalLifeSpine?.runtimeSurface ?? null
  const interactionLearning = deriveExecutionInteractionLearningProfile(input)
  const activeThread = surface?.world?.worldModel?.activeThread ?? null
  const scene = surface?.perception?.currentScene ?? null
  const workloadKind = sanitizeText(scene?.workloadKind, 32)
  const contentKind = sanitizeText(scene?.contentKind, 32)
  const threadKind = sanitizeText(activeThread?.kind, 48)
  const codingLike = workloadKind === 'coding'
    || workloadKind === 'terminal'
    || contentKind === 'diff'
    || contentKind === 'error'
    || threadKind === 'problem'
    || threadKind === 'debugging'
    || threadKind === 'change-review'
  if (!autonomy || !requestedDispatchChannel || !codingLike)
    return null
  if (input.runtimeDigest?.shouldProactivelyAct !== true && autonomy.actReadiness < 0.66)
    return null
  if (autonomy.selectedMode !== 'prepare-act' && autonomy.selectedMode !== 'act')
    return null

  const baseGoalSummary = sanitizeText(
    autonomy.executionIntent?.summary
    ?? autonomy.sourceThreadSummary
    ?? activeThread?.summary
    ?? activeThread?.title
    ?? autonomy.whyNow,
    180,
  )
  const goalSummary = enrichAutonomyGoalSummary({
    goalSummary: baseGoalSummary,
    whyNow: autonomy.whyNow,
  })
  if (!goalSummary)
    return null

  const signature = [
    normalizeSignatureText(input.cardId, 32) || 'card',
    normalizeSignatureText(activeThread?.id ?? autonomy.sourceThreadId, 40) || 'global',
    normalizeSignatureText(autonomy.executionIntent?.kind ?? 'observe', 32) || 'observe',
    normalizeSignatureText(goalSummary, 48) || 'goal',
  ].filter(Boolean).join(':')

  const mutateProposalReady = autonomy.selectedMode === 'act'
    && autonomy.actReadiness >= interactionLearning.mutateThreshold
    && (
      autonomy.executionIntent?.kind === 'repair'
      || autonomy.executionIntent?.kind === 'follow-through'
      || autonomy.executionIntent?.kind === 'guide'
    )

  if (mutateProposalReady) {
    const riskPolicy = deriveProactiveExecutionRiskBand({
      digitalLifeSpine: input.digitalLifeSpine ?? null,
      interactionLearning,
      taskKind: 'codebase-edit',
      requestedDispatchChannel,
      autonomyKind: sanitizeText(autonomy.executionIntent?.kind, 48) || null,
    })
    return {
      task: {
        kind: 'codebase-edit',
        goal: `Proactively patch the current unresolved Alicization line: ${goalSummary}`,
        origin: 'proactive',
        effect: 'mutate',
        permissionMode: 'none',
        justification: 'grounded',
        riskBudget: riskPolicy.riskBudget,
        requestedChannel: requestedDispatchChannel,
        prefersPersistentSession: true,
      },
      requestedDispatchChannel,
      summary: goalSummary,
      signature,
      autoDispatchEligible: riskPolicy.autoDispatchEligible,
      reasonTags: [
        'task:mutate-proposal',
        `proposal-tone:${interactionLearning.proposalTone}`,
        `proposal-threshold:${interactionLearning.mutateThreshold.toFixed(2)}`,
        `channel:${requestedDispatchChannel}`,
        ...riskPolicy.reasonTags,
        autonomy.executionIntent?.kind ? `intent:${sanitizeText(autonomy.executionIntent.kind, 48)}` : '',
        activeThread?.id ? `thread:${sanitizeText(activeThread.id, 48)}` : '',
        scene?.scenario ? `scene:${sanitizeText(scene.scenario, 48)}` : '',
      ].filter(Boolean),
    }
  }

  return {
    task: {
      kind: 'codebase-investigation',
      goal: `Investigate the current unresolved Alicization line without editing files: ${goalSummary}`,
      origin: 'proactive',
      effect: 'observe',
      permissionMode: 'none',
      justification: 'grounded',
      requestedChannel: requestedDispatchChannel,
      prefersPersistentSession: true,
    },
    requestedDispatchChannel,
    summary: goalSummary,
    signature,
    autoDispatchEligible: true,
    reasonTags: [
      `task:observe`,
      `proposal-tone:${interactionLearning.proposalTone}`,
      `channel:${requestedDispatchChannel}`,
      'risk:low',
      'autonomy-band:observe-direct',
      autonomy.executionIntent?.kind ? `intent:${sanitizeText(autonomy.executionIntent.kind, 48)}` : '',
      activeThread?.id ? `thread:${sanitizeText(activeThread.id, 48)}` : '',
      scene?.scenario ? `scene:${sanitizeText(scene.scenario, 48)}` : '',
    ].filter(Boolean),
  }
}

export function deriveAutonomyActuationPlan(input: {
  cardId: string
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
  runtimeDigest?: AlicizationRuntimeSnapshot | null
  capabilities?: AlicizationChannelCapability[] | null
}): AlicizationAutonomyActuationPlan {
  const task = deriveAutonomousTaskPlan(input)
  const reminder = deriveAutonomyRevisitReminder(input)

  return {
    reminder,
    task,
    reasonTags: [
      ...(task?.reasonTags ?? []),
      ...(reminder?.reasonTags ?? []),
    ],
  }
}

export function deriveAutonomyExecutionProposalSurface(input: {
  actuationResult: AlicizationAutonomyActuationResult
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
}): AlicizationAutonomyExecutionProposalSurface | null {
  if (input.actuationResult.taskPlanState !== 'needs-affirmation')
    return null

  const autonomy = readAutonomy({
    digitalLifeSpine: input.digitalLifeSpine ?? null,
  })
  const interactionLearning = deriveExecutionInteractionLearningProfile({
    digitalLifeSpine: input.digitalLifeSpine ?? null,
  })
  const goal = sanitizeText(
    input.actuationResult.taskGoal
    ?? input.actuationResult.taskSummary
    ?? autonomy?.executionIntent?.summary
    ?? autonomy?.whyNow,
    180,
  )
  if (!goal)
    return null

  const channelLabel = humanizeExecutionChannel(
    input.actuationResult.taskProposedChannel ?? input.actuationResult.taskSelectedChannel,
  )
  const affirmationReasonCodes = input.actuationResult.taskAffirmationReasonCodes
  const explicitConsent = affirmationReasonCodes.includes('proactive-side-effects-require-explicit-consent')
  const desktopFallback = affirmationReasonCodes.includes('desktop-fallback-requires-explicit-or-grounded-justification')
  const autonomyKind = sanitizeText(autonomy?.executionIntent?.kind, 48)
  const emotion = interactionLearning.proposalTone === 'cautious'
    ? 'concerned'
    : autonomyKind === 'care'
      ? 'concerned'
      : autonomyKind === 'repair' || autonomyKind === 'follow-through' || autonomyKind === 'guide'
        ? 'thinking'
        : 'neutral'
  const projectClosureCarry = deriveAutonomyProjectClosureCarry(autonomy?.whyNow)
  const sameHerCarry = autonomy?.whyNow && carriesSameHerProjectClosureLine(autonomy.whyNow)
    ? sanitizeText(autonomy.whyNow, projectClosureCarry ? 88 : 140)
    : ''
  const compactThoughtMetrics = Boolean(projectClosureCarry)
  const thought = sanitizeText(
    [
      autonomy ? `autonomy=${autonomy.selectedMode}` : '',
      autonomyKind ? `intent=${autonomyKind}` : '',
      input.actuationResult.taskKind ? `task=${input.actuationResult.taskKind}` : '',
      input.actuationResult.taskPlanState ? `plan=${input.actuationResult.taskPlanState}` : '',
      `tone=${interactionLearning.proposalTone}`,
      compactThoughtMetrics ? '' : `directness=${interactionLearning.directness.toFixed(2)}`,
      compactThoughtMetrics ? '' : `opening=${interactionLearning.openingPatience.toFixed(2)}`,
      `proof=${interactionLearning.proofBias.toFixed(2)}`,
      channelLabel ? `channel=${channelLabel}` : '',
      explicitConsent ? 'gate=explicit-consent' : desktopFallback ? 'gate=desktop-fallback' : 'gate=affirmation',
      `goal=${goal}`,
      sameHerCarry ? `sameHer=${sameHerCarry}` : '',
      projectClosureCarry ? `closure=${projectClosureCarry}` : '',
    ].filter(Boolean).join('; '),
    320,
  )

  const confirmationGate = explicitConsent
    ? 'explicit_consent'
    : desktopFallback
      ? 'desktop_fallback'
      : 'affirmation'
  const reply = sanitizeText([
    `execution_proposal=${confirmationGate}`,
    'status=awaiting_user_confirmation',
    channelLabel ? `channel=${channelLabel}` : '',
    `goal=${goal}`,
  ].filter(Boolean).join('; '), 180)

  if (!reply)
    return null

  return {
    thought,
    reply,
    emotion,
    reasonTags: [
      'execution-proposal',
      `tone:${interactionLearning.proposalTone}`,
      input.actuationResult.taskPlanState ? `plan:${input.actuationResult.taskPlanState}` : '',
      input.actuationResult.taskKind ? `task:${input.actuationResult.taskKind}` : '',
      channelLabel ? `channel:${channelLabel}` : '',
      ...affirmationReasonCodes.map(code => `affirmation:${sanitizeText(code, 64)}`),
    ].filter(Boolean),
  }
}

export function buildAutonomousObserveDispatchInput(input: {
  threadId: string
  requestedDispatchChannel: AlicizationObserveDispatchChannel
  task: AlicizationClawTaskIntent
  summary: string
  workspaceRoot?: string
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}): AlicizationDispatchTaskThreadRuntimeInput {
  const taskContext = sanitizeAutonomyDispatchSummary(input.summary)
  const prompt = [
    'Investigate the current task context without modifying files.',
    `Goal: ${sanitizeText(input.task.goal, 220)}`,
    `Task context: ${taskContext}`,
    'Constraints:',
    '- Read-only investigation only.',
    '- Do not edit files, do not stage files, do not commit, and do not run destructive commands.',
    '- End with the concrete blocker, the strongest evidence paths, and the next safe step.',
  ].join('\n')

  if (input.requestedDispatchChannel === 'claude-code') {
    return {
      threadId: input.threadId,
      workspaceRoot: input.workspaceRoot,
      claudeCode: {
        prompt,
        cwd: input.workspaceRoot ?? null,
        timeoutMs: 120_000,
        allowTools: true,
        permissionMode: 'plan',
        ...(input.runtimeContext ? { runtimeContext: input.runtimeContext } : {}),
      },
    }
  }

  return {
    threadId: input.threadId,
    workspaceRoot: input.workspaceRoot,
    codex: {
      prompt,
      cwd: input.workspaceRoot ?? null,
      timeoutMs: 120_000,
      sandbox: 'read-only',
      ...(input.runtimeContext ? { runtimeContext: input.runtimeContext } : {}),
    },
  }
}

export function buildAutonomousTaskDispatchInput(input: {
  threadId: string
  requestedDispatchChannel: AlicizationObserveDispatchChannel
  task: AlicizationClawTaskIntent
  summary: string
  workspaceRoot?: string
  runtimeContext?: AlicizationExecutionRuntimeContext | null
}): AlicizationDispatchTaskThreadRuntimeInput {
  if (input.task.kind !== 'codebase-edit')
    return buildAutonomousObserveDispatchInput(input)

  const taskContext = sanitizeAutonomyDispatchSummary(input.summary)
  const prompt = [
    'Continue the current task directly and make the smallest safe code change now.',
    `Goal: ${sanitizeText(input.task.goal, 220)}`,
    `Task context: ${taskContext}`,
    'Constraints:',
    '- Keep the change narrow and reversible.',
    '- Do not run destructive commands.',
    '- Verify with the most direct safe command available.',
    '- End with what changed, what was verified, and any residual risk.',
  ].join('\n')

  if (input.requestedDispatchChannel === 'claude-code') {
    return {
      threadId: input.threadId,
      workspaceRoot: input.workspaceRoot,
      claudeCode: {
        prompt,
        cwd: input.workspaceRoot ?? null,
        timeoutMs: 180_000,
        allowTools: true,
        permissionMode: 'acceptEdits',
        ...(input.runtimeContext ? { runtimeContext: input.runtimeContext } : {}),
      },
    }
  }

  return {
    threadId: input.threadId,
    workspaceRoot: input.workspaceRoot,
    codex: {
      prompt,
      cwd: input.workspaceRoot ?? null,
      timeoutMs: 180_000,
      sandbox: 'workspace-write',
      ...(input.runtimeContext ? { runtimeContext: input.runtimeContext } : {}),
    },
  }
}

export async function runAutonomyActuation(input: {
  now: number
  cardId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  digitalLifeSpine?: AlicizationDigitalLifeSpineSnapshot | null
  runtimeDigest?: AlicizationRuntimeSnapshot | null
  capabilities?: AlicizationChannelCapability[] | null
  workspaceRoot?: string
  listPendingReminders: (limit?: number) => Promise<AlicizationPendingReminderLike[]>
  scheduleReminder: (payload: {
    minutes: number
    message: string
    sourceTurnId?: string
  }) => Promise<unknown>
  buildExecutionRuntimeContext?: (input: {
    cardId: string
    decisionTraceId?: string | null
    sessionId?: string | null
    turnId: string
  }) => Promise<AlicizationExecutionRuntimeContext | null>
  planTaskThread: (payload: {
    threadId?: string | null
    trace?: {
      decisionTraceId?: string | null
      turnId?: string | null
      sessionId?: string | null
      origin?: 'subconscious-proactive' | 'system' | 'user-turn'
    } | null
    task: AlicizationClawTaskIntent
    capabilities?: AlicizationChannelCapability[]
  }) => Promise<AlicizationGovernedTaskThreadPlanningResult>
  dispatchTaskThread: (payload: AlicizationDispatchTaskThreadRuntimeInput) => Promise<unknown>
}): Promise<AlicizationAutonomyActuationResult> {
  const actuationPlan = deriveAutonomyActuationPlan({
    cardId: input.cardId,
    digitalLifeSpine: input.digitalLifeSpine ?? null,
    runtimeDigest: input.runtimeDigest ?? null,
    capabilities: input.capabilities ?? null,
  })
  const result: AlicizationAutonomyActuationResult = {
    reminderScheduled: false,
    reminderSourceTurnId: null,
    taskPlanned: false,
    taskKind: null,
    taskGoal: null,
    taskPlanState: null,
    taskProposedChannel: null,
    taskSelectedChannel: null,
    taskSummary: null,
    taskThreadId: null,
    taskAffirmationReasonCodes: [],
    taskDispatched: false,
    taskDispatchChannel: null,
    reasonTags: [...actuationPlan.reasonTags],
  }

  if (actuationPlan.task) {
    const turnId = `autonomy-task:${input.cardId}:${input.now}:${normalizeSignatureText(actuationPlan.task.signature, 32) || 'act'}`
    const planning = await input.planTaskThread({
      threadId: `thread:autonomy:${normalizeSignatureText(actuationPlan.task.signature, 48) || 'act'}:${input.now}`,
      trace: {
        decisionTraceId: sanitizeText(input.decisionTraceId, 120) || null,
        turnId,
        sessionId: sanitizeText(input.sessionId, 120) || null,
        origin: 'subconscious-proactive',
      },
      task: actuationPlan.task.task,
      capabilities: input.capabilities ?? undefined,
    })

    result.taskPlanned = true
    result.taskKind = actuationPlan.task.task.kind
    result.taskGoal = actuationPlan.task.task.goal
    result.taskThreadId = planning.thread.id
    result.taskPlanState = planning.governor.disposition === 'duplicate'
      ? 'duplicate'
      : planning.plan.state
    result.taskProposedChannel = sanitizeText(planning.plan.proposedChannel, 48) || null
    result.taskSelectedChannel = sanitizeText(planning.thread.selectedChannel, 48) || null
    result.taskSummary = sanitizeText(planning.thread.summary, 220) || actuationPlan.task.summary
    result.taskAffirmationReasonCodes = [...(planning.plan.affirmationReasonCodes ?? [])]

    if (
      planning.plan.state === 'routed'
      && planning.thread.selectedChannel === actuationPlan.task.requestedDispatchChannel
      && (planning.thread.selectedChannel === 'codex' || planning.thread.selectedChannel === 'claude-code')
      && actuationPlan.task.autoDispatchEligible
    ) {
      const runtimeContext = input.buildExecutionRuntimeContext
        ? await input.buildExecutionRuntimeContext({
            cardId: input.cardId,
            decisionTraceId: sanitizeText(input.decisionTraceId, 120) || null,
            sessionId: sanitizeText(input.sessionId, 120) || null,
            turnId,
          })
        : null
      if (!runtimeContext) {
        result.reasonTags.push('dispatch:missing-runtime-context')
        return result
      }
      await input.dispatchTaskThread(buildAutonomousTaskDispatchInput({
        threadId: planning.thread.id,
        requestedDispatchChannel: planning.thread.selectedChannel,
        task: actuationPlan.task.task,
        summary: actuationPlan.task.summary,
        workspaceRoot: input.workspaceRoot,
        runtimeContext,
      }))
      result.taskDispatched = true
      result.taskDispatchChannel = planning.thread.selectedChannel
      return result
    }
  }

  if (actuationPlan.reminder) {
    const pending = await input.listPendingReminders(128)
    const alreadyPending = pending.some(task =>
      sanitizeText(task.sourceTurnId, 220) === actuationPlan.reminder?.sourceTurnId,
    )
    if (!alreadyPending) {
      await input.scheduleReminder({
        minutes: actuationPlan.reminder.minutes,
        message: actuationPlan.reminder.message,
        sourceTurnId: actuationPlan.reminder.sourceTurnId,
      })
      result.reminderScheduled = true
      result.reminderSourceTurnId = actuationPlan.reminder.sourceTurnId
    }
  }

  return result
}
