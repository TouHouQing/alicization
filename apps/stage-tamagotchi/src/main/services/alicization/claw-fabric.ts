import type {
  AlicizationChannelCapability as SharedAlicizationChannelCapability,
  AlicizationClawFabricCandidateAssessment as SharedAlicizationClawFabricCandidateAssessment,
  AlicizationClawFabricDecisionState as SharedAlicizationClawFabricDecisionState,
  AlicizationClawFabricPlan as SharedAlicizationClawFabricPlan,
  AlicizationClawInvasiveness as SharedAlicizationClawInvasiveness,
  AlicizationClawJustification as SharedAlicizationClawJustification,
  AlicizationClawPermissionMode as SharedAlicizationClawPermissionMode,
  AlicizationClawRiskBudget as SharedAlicizationClawRiskBudget,
  AlicizationClawTaskEffect as SharedAlicizationClawTaskEffect,
  AlicizationClawTaskIntent as SharedAlicizationClawTaskIntent,
  AlicizationClawTaskOrigin as SharedAlicizationClawTaskOrigin,
  AlicizationExecutionChannel as SharedAlicizationExecutionChannel,
  AlicizationExecutionTaskKind as SharedAlicizationExecutionTaskKind,
} from '@proj-alicization/stage-shared'

import { analyzeAlicizationExecutionSemanticSignals } from '@proj-alicization/stage-shared'

export const alicizationExecutionChannels = [
  'cli',
  'codex',
  'claude-code',
  'openclaw',
  'openfang',
  'browser',
  'software',
  'desktop',
] as const

export type AlicizationExecutionChannel = SharedAlicizationExecutionChannel

export type AlicizationExecutionTaskKind = SharedAlicizationExecutionTaskKind

export type AlicizationExecutionOrigin = SharedAlicizationClawTaskOrigin
export type AlicizationExecutionEffect = SharedAlicizationClawTaskEffect
export type AlicizationExecutionPermissionMode = SharedAlicizationClawPermissionMode
export type AlicizationExecutionJustification = SharedAlicizationClawJustification
export type AlicizationExecutionRiskBudget = SharedAlicizationClawRiskBudget
export type AlicizationExecutionInvasiveness = SharedAlicizationClawInvasiveness
export type AlicizationClawFabricDecisionState = SharedAlicizationClawFabricDecisionState

export type AlicizationChannelCapability = SharedAlicizationChannelCapability

export type AlicizationClawTaskIntent = SharedAlicizationClawTaskIntent

export type AlicizationClawFabricCandidateAssessment = SharedAlicizationClawFabricCandidateAssessment

export type AlicizationClawFabricPlan = SharedAlicizationClawFabricPlan

export interface AlicizationClawFabricChannelOutcomeSummary {
  planned?: number | null
  running?: number | null
  completed?: number | null
  failed?: number | null
  cancelled?: number | null
}

export interface AlicizationClawFabricExperience {
  projectBriefing?: {
    identity?: string | null
    currentPhase?: string | null
    latestLandedProgress?: string | null
    landedProgressSummary?: string | null
    primaryOpenLoop?: string | null
    openClosureSummary?: string | null
    nextClosureTarget?: string | null
    nextClosureTargetSummary?: string | null
    sameHerSelfLine?: string | null
    sameHerHoldDetail?: string | null
    sameHerDriftRisk?: string | null
    sameHerDriftRiskSummary?: string | null
    proactiveSameHerGap?: string | null
    companionBriefingLine?: string | null
    emotionalClosureSummary?: string | null
    continuityCue?: string | null
    continuityPreferredTiming?: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' | null
    continuityCadence?: string | null
    preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
    preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
    preflightSummary?: string | null
    preDialogueAwarenessLine?: string | null
  } | null
  sessionResumeChannel?: AlicizationExecutionChannel | null
  activeChannels?: AlicizationExecutionChannel[] | null
  channelOutcomes?: Partial<Record<AlicizationExecutionChannel, AlicizationClawFabricChannelOutcomeSummary>> | null
  goalAffinityChannel?: AlicizationExecutionChannel | null
  goalAffinityScore?: number | null
  goalAffinityReason?: string | null
  advisorChannel?: AlicizationExecutionChannel | null
  advisorConfidence?: number | null
  advisorReason?: string | null
  rememberedProcedures?: Array<{
    id: string
    sourceKind: 'procedural' | 'autobiographical'
    facet?: 'phase' | 'relationship-era' | 'task-era' | 'self-era' | null
    label: string
    approach: string
    pitfalls: string[]
    situation?: string | null
    steps?: string[] | null
    failurePoints?: string[] | null
    repairMoves?: string[] | null
    result?: string | null
    traceSummary?: string | null
    lastExperiencedAt?: number | null
    confidence: number
    cues: string[]
    preferredChannel?: AlicizationExecutionChannel | null
    preferredChannelReason?: string | null
  }> | null
}

interface AlicizationChannelTraits {
  structured: boolean
  sessionAffinity: boolean
  invasiveness: AlicizationExecutionInvasiveness
  supportsVisualGrounding: boolean
}

interface AlicizationResolvedChannelCapability extends AlicizationChannelCapability {
  available: boolean
  enabled: boolean
  ready: boolean
  sessionAffinity: boolean
}

interface AlicizationGoalSemanticSignals {
  mentionedChannels: AlicizationExecutionChannel[]
  hasCommandLiteral: boolean
  hasCodeIntent: boolean
  hasBrowserIntent: boolean
  hasSoftwareIntent: boolean
}

const browserLikeGoalPattern = /\bweb\s?page\b|\bpage\b|\bsite\b|\bbrowser\b|\btab\b|\burl\b|网页|页面|浏览器|标签页/u
const screenLikeGoalPattern = /\bscreen\b|\bscene\b|\bgui\b|\bdialog\b|\bpopup\b|\bmodal\b|屏幕|界面|画面|窗口|弹窗|对话框/u

const channelTraits = {
  'cli': {
    structured: true,
    sessionAffinity: false,
    invasiveness: 'low',
    supportsVisualGrounding: false,
  },
  'codex': {
    structured: true,
    sessionAffinity: true,
    invasiveness: 'medium',
    supportsVisualGrounding: false,
  },
  'claude-code': {
    structured: true,
    sessionAffinity: true,
    invasiveness: 'medium',
    supportsVisualGrounding: false,
  },
  'openclaw': {
    structured: true,
    sessionAffinity: true,
    invasiveness: 'medium',
    supportsVisualGrounding: true,
  },
  'openfang': {
    structured: true,
    sessionAffinity: true,
    invasiveness: 'medium',
    supportsVisualGrounding: true,
  },
  'browser': {
    structured: true,
    sessionAffinity: true,
    invasiveness: 'medium',
    supportsVisualGrounding: true,
  },
  'software': {
    structured: true,
    sessionAffinity: true,
    invasiveness: 'medium',
    supportsVisualGrounding: true,
  },
  'desktop': {
    structured: false,
    sessionAffinity: false,
    invasiveness: 'high',
    supportsVisualGrounding: true,
  },
} satisfies Record<AlicizationExecutionChannel, AlicizationChannelTraits>

const taskChannelSupport: Record<AlicizationExecutionTaskKind, AlicizationExecutionChannel[]> = {
  'run-command': ['cli', 'codex', 'claude-code', 'openclaw', 'openfang', 'desktop'],
  'codebase-edit': ['codex', 'claude-code', 'cli', 'openclaw', 'openfang', 'desktop'],
  'codebase-investigation': ['codex', 'claude-code', 'cli', 'openclaw', 'openfang', 'desktop'],
  'browser-automation': ['browser', 'software', 'desktop', 'openclaw', 'openfang'],
  'software-automation': ['software', 'desktop', 'openclaw', 'openfang'],
  'desktop-automation': ['desktop'],
  'agent-delegation': ['codex', 'claude-code', 'openclaw', 'openfang'],
  'mixed': ['cli', 'codex', 'claude-code', 'openclaw', 'openfang', 'browser', 'software', 'desktop'],
  'unknown': ['cli', 'codex', 'claude-code', 'openclaw', 'openfang', 'browser', 'software', 'desktop'],
}

const taskChannelPreference: Record<AlicizationExecutionTaskKind, AlicizationExecutionChannel[]> = {
  'run-command': ['cli', 'codex', 'claude-code', 'openclaw', 'openfang'],
  'codebase-edit': ['codex', 'claude-code', 'cli', 'openclaw', 'openfang', 'desktop'],
  'codebase-investigation': ['codex', 'claude-code', 'cli', 'openclaw', 'openfang', 'desktop'],
  'browser-automation': ['browser', 'software', 'openclaw', 'openfang', 'desktop'],
  'software-automation': ['software', 'openclaw', 'openfang', 'desktop'],
  'desktop-automation': ['desktop'],
  'agent-delegation': ['codex', 'claude-code', 'openclaw', 'openfang', 'cli'],
  'mixed': ['cli', 'codex', 'claude-code', 'browser', 'software', 'openclaw', 'openfang', 'desktop'],
  'unknown': ['cli', 'codex', 'claude-code', 'browser', 'software', 'openclaw', 'openfang', 'desktop'],
}

const invasivenessWeight = {
  low: 0,
  medium: 1,
  high: 2,
} satisfies Record<AlicizationExecutionInvasiveness, number>

const riskBudgetAllowance = {
  low: 0,
  medium: 1,
  high: 2,
} satisfies Record<AlicizationExecutionRiskBudget, number>

function normalizeText(raw: unknown, maxChars = 200) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function unique(values: Array<string | undefined | null>, maxChars = 120) {
  return Array.from(new Set(values.map(value => normalizeText(value, maxChars)).filter(Boolean)))
}

function buildProjectBriefingNarrative(
  projectBriefing: AlicizationClawFabricExperience['projectBriefing'],
) {
  if (!projectBriefing)
    return []

  const identity = normalizeText(projectBriefing.identity, 180)
  const currentPhase = normalizeText(projectBriefing.currentPhase, 180)
  const latestLandedProgress
    = normalizeText(projectBriefing.latestLandedProgress, 220)
      || normalizeText(projectBriefing.landedProgressSummary, 220)
  const primaryOpenLoop
    = normalizeText(projectBriefing.primaryOpenLoop, 220)
      || normalizeText(projectBriefing.openClosureSummary, 220)
  const nextClosureTarget
    = normalizeText(projectBriefing.nextClosureTarget, 220)
      || normalizeText(projectBriefing.nextClosureTargetSummary, 220)
  const sameHerSelfLine = normalizeText(projectBriefing.sameHerSelfLine, 180)
  const sameHerDriftRisk
    = normalizeText(projectBriefing.sameHerDriftRisk, 220)
      || normalizeText(projectBriefing.sameHerDriftRiskSummary, 220)

  return [
    identity && currentPhase
      ? `Stay inside Alicization's project identity while planning execution: ${identity} ${currentPhase}`
      : identity
        ? `Stay inside Alicization's project identity while planning execution: ${identity}`
        : currentPhase
          ? `Stay inside Alicization's current project phase while planning execution: ${currentPhase}`
          : '',
    latestLandedProgress
      ? `Recent landed progress to preserve during execution planning: ${latestLandedProgress}`
      : '',
    primaryOpenLoop && nextClosureTarget
      ? `Execution planning should respect project_context=runtime_personhood, open_loop="${primaryOpenLoop}", and next_closure_target="${nextClosureTarget}".`
      : primaryOpenLoop
        ? `Execution planning should respect the current open loop: ${primaryOpenLoop}`
        : nextClosureTarget
          ? `Execution planning should respect the next closure target: ${nextClosureTarget}`
          : '',
    sameHerSelfLine
      ? `Keep identity_continuity explicit while planning execution: ${sameHerSelfLine}`
      : '',
    sameHerDriftRisk
      ? `Avoid execution-planning drift: ${sameHerDriftRisk}`
      : '',
  ].filter(Boolean)
}

function clamp01(raw: unknown) {
  if (!Number.isFinite(raw))
    return 0
  return Math.max(0, Math.min(1, Number(raw)))
}

function deriveGoalSemanticSignals(task: AlicizationClawTaskIntent): AlicizationGoalSemanticSignals {
  const goalText = normalizeText(task.goal, 600)
  const semanticSignals = analyzeAlicizationExecutionSemanticSignals(goalText)
  const mentionedChannels = semanticSignals.mentionedChannels
    .filter((channel): channel is AlicizationExecutionChannel => alicizationExecutionChannels.includes(channel))
  return {
    mentionedChannels,
    hasCommandLiteral: semanticSignals.hasCommandLiteral || semanticSignals.hasShellLikeStructure,
    hasCodeIntent: semanticSignals.hasCodeArtifact,
    hasBrowserIntent: semanticSignals.hasBrowserArtifact || browserLikeGoalPattern.test(goalText),
    hasSoftwareIntent: semanticSignals.hasSoftwareArtifact || screenLikeGoalPattern.test(goalText),
  }
}

function normalizeCount(raw: unknown) {
  if (!Number.isFinite(raw))
    return 0
  return Math.max(0, Math.floor(Number(raw)))
}

function normalizeOutcomeSummary(
  raw: AlicizationClawFabricChannelOutcomeSummary | null | undefined,
) {
  return {
    planned: normalizeCount(raw?.planned),
    running: normalizeCount(raw?.running),
    completed: normalizeCount(raw?.completed),
    failed: normalizeCount(raw?.failed),
    cancelled: normalizeCount(raw?.cancelled),
  }
}

function hasChannelInExperienceList(
  channels: AlicizationExecutionChannel[] | null | undefined,
  channel: AlicizationExecutionChannel,
) {
  if (!Array.isArray(channels))
    return false
  return channels.includes(channel)
}

function rememberedProcedureMatch(input: {
  experience?: AlicizationClawFabricExperience | null
  channel: AlicizationExecutionChannel
}) {
  const procedures = Array.isArray(input.experience?.rememberedProcedures)
    ? input.experience!.rememberedProcedures!
    : []
  const directMatch = procedures
    .filter(item => item?.preferredChannel === input.channel)
    .sort((left, right) => clamp01(right.confidence) - clamp01(left.confidence))[0] ?? null
  if (directMatch)
    return directMatch
  return null
}

function resolveCapabilityMap(capabilities: AlicizationChannelCapability[]) {
  return new Map<AlicizationExecutionChannel, AlicizationResolvedChannelCapability>(
    capabilities.map((capability) => {
      const available = capability.available !== false
      const enabled = capability.enabled !== false
      const ready = capability.ready !== false

      return [capability.channel, {
        ...capability,
        available,
        enabled,
        ready,
        sessionAffinity: capability.sessionAffinity ?? channelTraits[capability.channel].sessionAffinity,
      }]
    }),
  )
}

function getPreferenceScore(kind: AlicizationExecutionTaskKind, channel: AlicizationExecutionChannel) {
  const order = taskChannelPreference[kind]
  const index = order.indexOf(channel)
  if (index === -1)
    return -80
  return 140 - index * 18
}

function isChannelSupportedForTask(
  kind: AlicizationExecutionTaskKind,
  channel: AlicizationExecutionChannel,
  requestedChannel: AlicizationExecutionChannel | null | undefined,
) {
  if (requestedChannel === channel)
    return true
  return taskChannelSupport[kind].includes(channel)
}

function buildCandidateAssessment(input: {
  capability: AlicizationResolvedChannelCapability
  task: AlicizationClawTaskIntent
  goalSignals: AlicizationGoalSemanticSignals
  experience?: AlicizationClawFabricExperience | null
}) {
  const { capability, task } = input
  const channel = capability.channel
  const traits = channelTraits[channel]
  const reasons: string[] = []
  const blockedReasons: string[] = []
  const requestedChannel = task.requestedChannel ?? null

  if (requestedChannel && channel !== requestedChannel)
    blockedReasons.push('requested-channel-mismatch')

  if (!capability.available)
    blockedReasons.push('channel-unavailable')
  if (!capability.enabled)
    blockedReasons.push('channel-disabled')
  if (!capability.ready)
    blockedReasons.push('channel-not-ready')

  const supported = isChannelSupportedForTask(task.kind, channel, task.requestedChannel)
  if (!supported)
    blockedReasons.push('unsupported-for-task')

  let score = getPreferenceScore(task.kind, channel)

  if (task.requestedChannel === channel) {
    score += 220
    reasons.push('requested-channel')
  }

  if (traits.structured) {
    score += 12
    reasons.push('structured-channel')
  }

  if (task.requiresVisualGrounding) {
    if (traits.supportsVisualGrounding) {
      score += 14
      reasons.push('visual-grounding-fit')
    }
    else {
      score -= 18
    }
  }

  const visualExplorationTask
    = task.requiresVisualGrounding
      && (task.kind === 'unknown' || task.kind === 'mixed')
  if (visualExplorationTask) {
    if (channel === 'cli' || channel === 'codex' || channel === 'claude-code') {
      score -= 104
      reasons.push('visual-grounding-deprioritizes-nonvisual-channel')
    }

    if (input.goalSignals.hasBrowserIntent) {
      if (channel === 'browser') {
        score += 108
        reasons.push('visual-browser-grounding-preferred')
      }
      else if (channel === 'software') {
        score += 72
        reasons.push('visual-browser-grounding-fallback')
      }
      else if (channel === 'desktop') {
        score += 36
        reasons.push('visual-browser-grounding-desktop-fallback')
      }
      else if (channel === 'openclaw' || channel === 'openfang') {
        score += 12
        reasons.push('visual-browser-grounding-last-resort')
      }
    }

    if (input.goalSignals.hasSoftwareIntent && !input.goalSignals.hasBrowserIntent) {
      if (channel === 'desktop') {
        score += 190
        reasons.push('visual-desktop-grounding-preferred')
      }
      else if (channel === 'software') {
        score += 84
        reasons.push('visual-desktop-grounding-app-fallback')
      }
      else if (channel === 'openclaw' || channel === 'openfang') {
        score += 18
        reasons.push('visual-desktop-grounding-last-resort')
      }
    }
  }

  const prefersPersistentSession = task.prefersPersistentSession === true
  if (prefersPersistentSession && capability.sessionAffinity) {
    score += 10
    reasons.push('session-affinity')
  }
  else if (prefersPersistentSession && !capability.sessionAffinity) {
    score -= 8
  }

  if (channel === 'desktop' && task.requestedChannel !== 'desktop') {
    score -= 72
    reasons.push('desktop-fallback-only')
  }

  if (channel === 'browser' && task.kind === 'browser-automation')
    reasons.push('browser-structured-first')
  if ((channel === 'codex' || channel === 'claude-code') && (task.kind === 'codebase-edit' || task.kind === 'codebase-investigation'))
    reasons.push('code-agent-fit')
  if (channel === 'cli' && task.kind === 'run-command')
    reasons.push('cli-direct-fit')
  if (channel === 'software' && task.kind === 'software-automation')
    reasons.push('app-specific-body')

  if (!task.requestedChannel && input.goalSignals.mentionedChannels.length > 0) {
    const mentionedIndex = input.goalSignals.mentionedChannels.indexOf(channel)
    if (mentionedIndex >= 0) {
      score += Math.max(72, 118 - mentionedIndex * 8)
      reasons.push('goal-mentioned-channel')
    }
    else {
      score -= 14
      reasons.push('goal-mentioned-other-channel')
    }
  }

  if (input.goalSignals.hasCommandLiteral && channel === 'cli') {
    score += 34
    reasons.push('goal-command-literal')
  }

  if (input.goalSignals.hasCodeIntent && (channel === 'codex' || channel === 'claude-code')) {
    score += 16
    reasons.push('goal-code-intent')
  }

  if (input.goalSignals.hasBrowserIntent && (channel === 'browser' || channel === 'openclaw' || channel === 'software')) {
    score += 14
    reasons.push('goal-browser-intent')
  }

  if (input.goalSignals.hasSoftwareIntent && (channel === 'software' || channel === 'openclaw' || channel === 'desktop')) {
    score += 12
    reasons.push('goal-software-intent')
  }

  const channelOutcome = normalizeOutcomeSummary(input.experience?.channelOutcomes?.[channel])
  if (channelOutcome.completed > 0) {
    score += Math.min(24, channelOutcome.completed * 7)
    reasons.push('history-completed')
  }

  if (channelOutcome.running > 0 && prefersPersistentSession && capability.sessionAffinity) {
    score += Math.min(18, channelOutcome.running * 8)
    reasons.push('running-session-continuity')
  }

  if (channelOutcome.failed > channelOutcome.completed) {
    score -= Math.min(30, (channelOutcome.failed - channelOutcome.completed) * 9)
    reasons.push('history-failure-pressure')
  }

  if (input.experience?.sessionResumeChannel === channel && capability.sessionAffinity) {
    score += prefersPersistentSession ? 34 : 18
    reasons.push('session-resume-channel')
  }

  if (hasChannelInExperienceList(input.experience?.activeChannels, channel) && capability.sessionAffinity) {
    score += 6
    reasons.push('active-channel-continuity')
  }

  const goalAffinityChannel = input.experience?.goalAffinityChannel ?? null
  const goalAffinityScore = clamp01(input.experience?.goalAffinityScore)
  if (goalAffinityChannel === channel) {
    score += 12 + Math.round(goalAffinityScore * 18)
    reasons.push('goal-affinity-channel')
  }
  else if (goalAffinityChannel && goalAffinityScore >= 0.45) {
    score -= Math.round(goalAffinityScore * 10)
    reasons.push('goal-affinity-other-channel-pressure')
  }

  const advisorChannel = input.experience?.advisorChannel ?? null
  const advisorConfidence = clamp01(input.experience?.advisorConfidence)
  if (advisorChannel === channel) {
    score += 20 + Math.round(advisorConfidence * 28)
    reasons.push('advisor-channel')
  }
  else if (advisorChannel && advisorConfidence >= 0.66) {
    score -= 8 + Math.round(advisorConfidence * 10)
    reasons.push('advisor-other-channel-pressure')
  }

  const rememberedProcedure = rememberedProcedureMatch({
    experience: input.experience,
    channel,
  })
  if (rememberedProcedure) {
    score += 14 + Math.round(clamp01(rememberedProcedure.confidence) * 18)
    reasons.push('remembered-procedure-channel')
  }

  return {
    channel,
    available: capability.available,
    eligible: blockedReasons.length === 0,
    score,
    invasiveness: traits.invasiveness,
    reasons: unique(reasons),
    blockedReasons: unique([...blockedReasons, capability.reason]),
  } satisfies AlicizationClawFabricCandidateAssessment
}

function requiresAffirmation(input: {
  candidate: AlicizationClawFabricCandidateAssessment
  task: AlicizationClawTaskIntent
}) {
  const { candidate, task } = input
  const permissionMode = task.permissionMode ?? (task.origin === 'user' ? 'implicit' : 'none')
  const effect = task.effect ?? 'mutate'
  const justification = task.justification ?? 'grounded'
  const reasons: string[] = []
  const riskBudget = task.riskBudget ?? 'medium'
  const rollbackableCodeAgent
    = (candidate.channel === 'codex' || candidate.channel === 'claude-code' || candidate.channel === 'cli')
      && (task.kind === 'codebase-edit' || task.kind === 'codebase-investigation')
      && task.requiresVisualGrounding !== true
  const lowRiskSelfStartAllowed
    = task.origin === 'proactive'
      && riskBudget === 'low'
      && justification === 'grounded'
      && effect === 'mutate'
      && rollbackableCodeAgent

  if (
    task.origin === 'proactive'
    && effect !== 'observe'
    && permissionMode !== 'explicit'
    && riskBudget === 'high'
  ) {
    reasons.push('high-risk-proactive-action-requires-explicit-consent')
  }

  if (
    task.origin === 'proactive'
    && effect !== 'observe'
    && permissionMode !== 'explicit'
    && riskBudget === 'medium'
  ) {
    reasons.push('medium-risk-proactive-action-requires-affirmation')
  }

  if (
    task.origin === 'proactive'
    && effect !== 'observe'
    && permissionMode !== 'explicit'
    && riskBudget === 'low'
    && !lowRiskSelfStartAllowed
  ) {
    reasons.push('proactive-side-effects-require-explicit-consent')
  }

  if (
    candidate.channel === 'desktop'
    && task.requestedChannel !== 'desktop'
    && permissionMode !== 'explicit'
    && justification === 'weak'
  ) {
    reasons.push('desktop-fallback-requires-explicit-or-grounded-justification')
  }

  if (
    effect === 'high-impact'
    && permissionMode !== 'explicit'
    && invasivenessWeight[candidate.invasiveness] > riskBudgetAllowance[riskBudget]
  ) {
    reasons.push('high-impact-action-exceeds-implicit-risk-budget')
  }

  return unique(reasons)
}

export function buildClawFabricPlan(input: {
  task: AlicizationClawTaskIntent
  capabilities: AlicizationChannelCapability[]
  experience?: AlicizationClawFabricExperience | null
  killSwitchSuspended?: boolean
}): AlicizationClawFabricPlan {
  const projectBriefing = input.experience?.projectBriefing ?? null
  const projectBriefingNarrative = buildProjectBriefingNarrative(input.experience?.projectBriefing)
  const hasProjectOpenLoopBriefing = Boolean(
    normalizeText(projectBriefing?.primaryOpenLoop, 220)
    || normalizeText(projectBriefing?.openClosureSummary, 220),
  )
  const projectBriefingReasonTags = unique([
    projectBriefing?.currentPhase ? 'project-phase-briefing' : '',
    hasProjectOpenLoopBriefing ? 'project-open-loop-briefing' : '',
    projectBriefing?.sameHerSelfLine ? 'project-identity-continuity-briefing' : '',
  ])
  if (input.killSwitchSuspended) {
    return {
      state: 'blocked',
      selectedChannel: null,
      proposedChannel: null,
      preferredChannels: [],
      fallbackChannels: [],
      candidates: [],
      reasonTags: ['kill-switch-suspended', ...projectBriefingReasonTags],
      narrative: [
        'Execution routing stopped because the Alicization kill switch is suspended.',
        ...projectBriefingNarrative,
      ],
      affirmationReasonCodes: [],
      blockedReasonCodes: ['kill-switch-suspended'],
    }
  }

  const capabilityMap = resolveCapabilityMap(input.capabilities)
  const goalSignals = deriveGoalSemanticSignals(input.task)
  const candidates = alicizationExecutionChannels.map((channel) => {
    const capability = capabilityMap.get(channel) ?? {
      channel,
      available: false,
      enabled: false,
      ready: false,
      sessionAffinity: channelTraits[channel].sessionAffinity,
    }

    return buildCandidateAssessment({
      capability,
      task: input.task,
      goalSignals,
      experience: input.experience,
    })
  }).sort((left, right) => {
    if (left.eligible !== right.eligible)
      return left.eligible ? -1 : 1
    if (left.score !== right.score)
      return right.score - left.score
    return alicizationExecutionChannels.indexOf(left.channel) - alicizationExecutionChannels.indexOf(right.channel)
  })

  const eligibleCandidates = candidates.filter(candidate => candidate.eligible)
  if (eligibleCandidates.length === 0) {
    return {
      state: 'blocked',
      selectedChannel: null,
      proposedChannel: null,
      preferredChannels: [],
      fallbackChannels: [],
      candidates,
      reasonTags: unique([
        `task:${input.task.kind}`,
        input.task.requestedChannel ? `requested:${input.task.requestedChannel}` : '',
        input.experience?.sessionResumeChannel ? `session-resume:${input.experience.sessionResumeChannel}` : '',
        input.experience?.goalAffinityChannel ? `goal-affinity:${input.experience.goalAffinityChannel}` : '',
        input.experience?.advisorChannel ? `advisor:${input.experience.advisorChannel}` : '',
        'no-eligible-channel',
        ...projectBriefingReasonTags,
      ]),
      narrative: [
        `No eligible execution channel can currently satisfy "${normalizeText(input.task.goal, 120) || 'the requested task'}".`,
        'Structured bodies were exhausted before considering unsafe fallback behavior.',
        ...projectBriefingNarrative,
      ],
      affirmationReasonCodes: [],
      blockedReasonCodes: unique(candidates.flatMap(candidate => candidate.blockedReasons)),
    }
  }

  const proposedChannel = eligibleCandidates[0].channel
  const affirmationReasonCodes = requiresAffirmation({
    candidate: eligibleCandidates[0],
    task: input.task,
  })
  const preferredChannels = eligibleCandidates.map(candidate => candidate.channel)

  return {
    state: affirmationReasonCodes.length > 0 ? 'needs-affirmation' : 'routed',
    selectedChannel: affirmationReasonCodes.length > 0 ? null : proposedChannel,
    proposedChannel,
    preferredChannels,
    fallbackChannels: preferredChannels.slice(1),
    candidates,
    reasonTags: unique([
      `task:${input.task.kind}`,
      `proposed:${proposedChannel}`,
      input.task.requestedChannel ? `requested:${input.task.requestedChannel}` : '',
      input.task.origin ? `origin:${input.task.origin}` : '',
      input.task.effect ? `effect:${input.task.effect}` : '',
      input.experience?.sessionResumeChannel ? `session-resume:${input.experience.sessionResumeChannel}` : '',
      input.experience?.goalAffinityChannel ? `goal-affinity:${input.experience.goalAffinityChannel}` : '',
      input.experience?.advisorChannel ? `advisor:${input.experience.advisorChannel}` : '',
      ...projectBriefingReasonTags,
      ...affirmationReasonCodes,
      ...eligibleCandidates[0].reasons,
    ]),
    narrative: unique([
      proposedChannel === 'desktop'
        ? 'Generic desktop claw stayed fallback-only and only surfaced because stronger structured channels were unavailable or explicitly bypassed.'
        : '',
      input.task.kind === 'browser-automation' && proposedChannel === 'browser'
        ? 'Browser automation won because DOM-first or browser-native control is safer than generic desktop claw.'
        : '',
      (input.task.kind === 'codebase-edit' || input.task.kind === 'codebase-investigation') && (proposedChannel === 'codex' || proposedChannel === 'claude-code')
        ? 'Code work routed into a code agent before falling back to shell or desktop control.'
        : '',
      input.task.kind === 'run-command' && proposedChannel === 'cli'
        ? 'CLI won because direct command execution is the most structured body for shell work.'
        : '',
      input.task.kind === 'software-automation' && proposedChannel === 'software'
        ? 'App-specific software control won before generic desktop claw.'
        : '',
      eligibleCandidates[0].reasons.includes('session-resume-channel')
        ? 'Routing stayed on the currently attached executor body to preserve embodied continuity and avoid a cold start.'
        : '',
      eligibleCandidates[0].reasons.includes('history-completed')
        ? 'Recent successful traces on this channel increased confidence for this turn.'
        : '',
      eligibleCandidates[0].reasons.includes('history-failure-pressure')
        ? 'Failure pressure reduced this channel priority unless no safer candidate existed.'
        : '',
      eligibleCandidates[0].reasons.includes('goal-mentioned-channel')
        ? 'Routing followed explicit channel cues present in the task goal.'
        : '',
      eligibleCandidates[0].reasons.includes('goal-affinity-channel')
        ? 'Routing aligned with similar historical task outcomes to preserve continuity.'
        : '',
      eligibleCandidates[0].reasons.includes('advisor-channel')
        ? 'Routing adopted the external channel assessor recommendation with confidence weighting.'
        : '',
      eligibleCandidates[0].reasons.includes('remembered-procedure-channel')
        ? (() => {
            const procedure = rememberedProcedureMatch({
              experience: input.experience,
              channel: proposedChannel,
            })
            if (!procedure)
              return ''
            return `Routing reused remembered procedure: ${normalizeText(procedure.traceSummary, 220) || normalizeText(procedure.approach, 180) || normalizeText(procedure.label, 140)}.`
          })()
        : '',
      affirmationReasonCodes.includes('proactive-side-effects-require-explicit-consent')
        ? 'The route was held for affirmation because proactive side effects should not quietly seize a stronger body.'
        : '',
      affirmationReasonCodes.includes('medium-risk-proactive-action-requires-affirmation')
        ? 'The route was held for affirmation because medium-risk proactive work should still be confirmed before it starts.'
        : '',
      affirmationReasonCodes.includes('high-risk-proactive-action-requires-explicit-consent')
        ? 'The route was held because high-risk proactive work must never start without explicit host consent.'
        : '',
      affirmationReasonCodes.includes('desktop-fallback-requires-explicit-or-grounded-justification')
        ? 'Desktop fallback requires stronger justification than a weak inference.'
        : '',
      ...projectBriefingNarrative,
    ], 320),
    affirmationReasonCodes,
    blockedReasonCodes: [],
  }
}
