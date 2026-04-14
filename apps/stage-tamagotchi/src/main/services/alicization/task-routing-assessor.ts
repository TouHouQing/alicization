import type {
  AlicizationChannelCapability,
  AlicizationClawTaskIntent,
  AlicizationExecutionChannel,
  AlicizationTaskThreadRecord,
} from '@proj-alicization/stage-shared'

import type { AlicizationTaskRoutingAssessment } from './task-execution-governor'

import {
  detectAlicizationExecutionCapabilityInquiry,
  detectAlicizationExecutionRoutingIntent,
} from '@proj-alicization/stage-shared'

interface AlicizationTaskRoutingAssessmentInput {
  task: AlicizationClawTaskIntent
  capabilities?: AlicizationChannelCapability[]
  activeThreads: AlicizationTaskThreadRecord[]
  settledThreads: AlicizationTaskThreadRecord[]
}

interface AlicizationTaskRoutingCandidate {
  channel: AlicizationExecutionChannel
  confidence: number
  reasonCodes: string[]
}

const kindChannelPreference: Record<AlicizationClawTaskIntent['kind'], AlicizationExecutionChannel[]> = {
  'run-command': ['cli', 'codex', 'claude-code', 'openclaw'],
  'codebase-edit': ['codex', 'claude-code', 'cli', 'openclaw'],
  'codebase-investigation': ['codex', 'claude-code', 'cli', 'openclaw'],
  'browser-automation': ['browser', 'openclaw', 'software', 'desktop'],
  'software-automation': ['software', 'openclaw', 'desktop'],
  'desktop-automation': ['desktop', 'openclaw'],
  'agent-delegation': ['codex', 'claude-code', 'openclaw', 'cli'],
  'mixed': ['cli', 'codex', 'claude-code', 'openclaw', 'browser', 'software', 'desktop'],
  'unknown': ['cli', 'codex', 'claude-code', 'openclaw', 'browser', 'software', 'desktop'],
}

const kindConfidenceByTaskKind: Record<AlicizationClawTaskIntent['kind'], number> = {
  'run-command': 0.84,
  'codebase-edit': 0.8,
  'codebase-investigation': 0.78,
  'browser-automation': 0.8,
  'software-automation': 0.78,
  'desktop-automation': 0.74,
  'agent-delegation': 0.74,
  'mixed': 0.66,
  'unknown': 0.62,
}

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

function sanitizeText(raw: unknown, maxChars = 320) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function isCapabilityReady(capability: AlicizationChannelCapability) {
  return capability.available !== false
    && capability.enabled !== false
    && capability.ready !== false
}

function buildReadyChannelSet(capabilities: AlicizationChannelCapability[]) {
  const channels = new Set<AlicizationExecutionChannel>()
  for (const capability of capabilities) {
    if (!isCapabilityReady(capability))
      continue
    channels.add(capability.channel)
  }
  return channels
}

function pickFirstReadyChannel(
  channels: AlicizationExecutionChannel[],
  readyChannels: Set<AlicizationExecutionChannel>,
) {
  return channels.find(channel => readyChannels.has(channel)) ?? null
}

function deriveGoalRoutingCandidate(
  task: AlicizationClawTaskIntent,
  readyChannels: Set<AlicizationExecutionChannel>,
) {
  const goal = sanitizeText(task.goal, 900)
  if (!goal)
    return null

  const capabilityInquiry = detectAlicizationExecutionCapabilityInquiry(goal)
  const routingIntent = detectAlicizationExecutionRoutingIntent({
    message: goal,
    capabilityInquiry,
  })
  if (!routingIntent)
    return null

  const preferredChannels = routingIntent.requestedChannels
  const selectedChannel = pickFirstReadyChannel(preferredChannels, readyChannels)
  if (!selectedChannel)
    return null

  let confidence = routingIntent.reasonCodes.includes('channel-mentioned')
    ? 0.92
    : routingIntent.reasonCodes.includes('command-literal') || routingIntent.reasonCodes.includes('shell-structure')
      ? 0.8
      : 0.72

  if (
    routingIntent.reasonCodes.includes('default-cli-from-command-structure')
    && (
      task.kind === 'codebase-edit'
      || task.kind === 'codebase-investigation'
      || task.kind === 'agent-delegation'
    )
  ) {
    confidence = Math.min(confidence, 0.62)
  }

  return {
    channel: selectedChannel,
    confidence: clamp01(confidence),
    reasonCodes: [
      'goal-routing-intent',
      ...routingIntent.reasonCodes.map(reason => `goal:${reason}`),
    ],
  } satisfies AlicizationTaskRoutingCandidate
}

function deriveTaskKindRoutingCandidate(
  task: AlicizationClawTaskIntent,
  readyChannels: Set<AlicizationExecutionChannel>,
) {
  const preferredChannels = kindChannelPreference[task.kind]
  const selectedChannel = pickFirstReadyChannel(preferredChannels, readyChannels)
  if (!selectedChannel)
    return null

  return {
    channel: selectedChannel,
    confidence: clamp01(kindConfidenceByTaskKind[task.kind]),
    reasonCodes: [
      `kind:${task.kind}`,
      `kind-channel:${selectedChannel}`,
    ],
  } satisfies AlicizationTaskRoutingCandidate
}

function mergeRoutingCandidates(
  goalCandidate: AlicizationTaskRoutingCandidate | null,
  kindCandidate: AlicizationTaskRoutingCandidate | null,
) {
  if (!goalCandidate && !kindCandidate)
    return null
  if (goalCandidate && !kindCandidate)
    return goalCandidate
  if (!goalCandidate && kindCandidate)
    return kindCandidate
  if (!goalCandidate || !kindCandidate)
    return null

  if (goalCandidate.channel === kindCandidate.channel) {
    return {
      channel: goalCandidate.channel,
      confidence: clamp01(Math.max(goalCandidate.confidence, kindCandidate.confidence) + 0.07),
      reasonCodes: [
        ...goalCandidate.reasonCodes,
        ...kindCandidate.reasonCodes,
        'goal-kind-aligned',
      ],
    } satisfies AlicizationTaskRoutingCandidate
  }

  if (goalCandidate.confidence >= kindCandidate.confidence + 0.1) {
    return {
      ...goalCandidate,
      reasonCodes: [
        ...goalCandidate.reasonCodes,
        ...kindCandidate.reasonCodes,
        'goal-dominant',
      ],
    } satisfies AlicizationTaskRoutingCandidate
  }

  if (kindCandidate.confidence >= goalCandidate.confidence + 0.1) {
    return {
      ...kindCandidate,
      reasonCodes: [
        ...goalCandidate.reasonCodes,
        ...kindCandidate.reasonCodes,
        'kind-dominant',
      ],
    } satisfies AlicizationTaskRoutingCandidate
  }

  const candidate = goalCandidate.confidence >= kindCandidate.confidence
    ? goalCandidate
    : kindCandidate
  return {
    channel: candidate.channel,
    confidence: clamp01(candidate.confidence - 0.06),
    reasonCodes: [
      ...goalCandidate.reasonCodes,
      ...kindCandidate.reasonCodes,
      'goal-kind-conflict',
    ],
  } satisfies AlicizationTaskRoutingCandidate
}

export function assessAlicizationTaskRouting(
  input: AlicizationTaskRoutingAssessmentInput,
): AlicizationTaskRoutingAssessment | null {
  const readyChannels = buildReadyChannelSet(Array.isArray(input.capabilities) ? input.capabilities : [])
  if (readyChannels.size === 0)
    return null

  const goalCandidate = deriveGoalRoutingCandidate(input.task, readyChannels)
  const kindCandidate = deriveTaskKindRoutingCandidate(input.task, readyChannels)
  const merged = mergeRoutingCandidates(goalCandidate, kindCandidate)
  if (!merged)
    return null

  let confidence = merged.confidence
  const reasonCodes = [...merged.reasonCodes]
  const historyEvidenceCount = input.activeThreads.length + input.settledThreads.length
  if (historyEvidenceCount > 0) {
    confidence = clamp01(confidence + 0.03)
    reasonCodes.push('history-aware')
  }

  if (confidence < 0.6)
    return null

  return {
    channel: merged.channel,
    confidence,
    reason: sanitizeText(`runtime-assessor:${reasonCodes.join('|')}`, 220) || null,
  }
}
