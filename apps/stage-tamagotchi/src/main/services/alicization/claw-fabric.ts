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

function unique(values: Array<string | undefined | null>) {
  return Array.from(new Set(values.map(value => normalizeText(value, 120)).filter(Boolean)))
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

  if (
    task.origin === 'proactive'
    && effect !== 'observe'
    && permissionMode !== 'explicit'
    && candidate.invasiveness !== 'low'
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

  const riskBudget = task.riskBudget ?? 'medium'
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
  killSwitchSuspended?: boolean
}): AlicizationClawFabricPlan {
  if (input.killSwitchSuspended) {
    return {
      state: 'blocked',
      selectedChannel: null,
      proposedChannel: null,
      preferredChannels: [],
      fallbackChannels: [],
      candidates: [],
      reasonTags: ['kill-switch-suspended'],
      narrative: ['Execution routing stopped because the Alicization kill switch is suspended.'],
      affirmationReasonCodes: [],
      blockedReasonCodes: ['kill-switch-suspended'],
    }
  }

  const capabilityMap = resolveCapabilityMap(input.capabilities)
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
        'no-eligible-channel',
      ]),
      narrative: [
        `No eligible execution channel can currently satisfy "${normalizeText(input.task.goal, 120) || 'the requested task'}".`,
        'Structured bodies were exhausted before considering unsafe fallback behavior.',
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
      affirmationReasonCodes.includes('proactive-side-effects-require-explicit-consent')
        ? 'The route was held for affirmation because proactive side effects should not quietly seize a stronger body.'
        : '',
      affirmationReasonCodes.includes('desktop-fallback-requires-explicit-or-grounded-justification')
        ? 'Desktop fallback requires stronger justification than a weak inference.'
        : '',
    ]),
    affirmationReasonCodes,
    blockedReasonCodes: [],
  }
}
