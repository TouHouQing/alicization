import type {
  AlicizationDialoguePerformancePayload,
  AlicizationTaskThreadRecord,
} from '../../../shared/eventa'

const allowedExecutionPayoffEmotions = new Set([
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'surprised',
  'thinking',
])

const allowedExecutionPayoffDeliveries = new Set([
  'calm',
  'gentle',
  'firm',
  'energetic',
  'hesitant',
  'teasing',
])

export type AlicizationExecutionPayoffMode = 'inline-execution' | 'callback-delivery'

export type AlicizationExecutionOutcomeSurfaceStatus
  = | AlicizationTaskThreadRecord['status']
    | 'queued'
    | 'running'
    | 'not-routed'

export interface AlicizationExecutionMemorySurfaceRestraint {
  shouldStayInward?: boolean | null
  shouldDelayUntilAfterPayoff?: boolean | null
  stableCoreOnly?: boolean | null
  visibleCarryMode?: string | null
}

export interface AlicizationExecutionDeliveryFact {
  type: 'execution-result'
  toolName: string
  status: 'succeeded' | 'failed' | 'timed-out' | 'denied'
  summary: string
  result: unknown
}

export function buildAlicizationExecutionDeliveryFact(
  input: Omit<AlicizationExecutionDeliveryFact, 'type'>,
): AlicizationExecutionDeliveryFact {
  return {
    type: 'execution-result',
    ...input,
  }
}

export type AlicizationExecutionDeliveryReplySelection
  = {
    status: 'pending-provider-settlement'
    reason: string
    visibleReply?: undefined
    source?: undefined
  }
  | {
    status: 'settled'
    source: 'llm'
    visibleReply: string
    reason?: undefined
  }

export interface AlicizationExecutionPayoffStructured {
  thought: string
  emotion: string
  reply: string
  delivery?: string
  proactive?: Record<string, unknown> | null
  performance: {
    baseEmotion: string
    facialCue: string | null
    actionCue: string | null
    delivery: string
    emphasis: 0 | 1 | 2
  }
  parsePath: 'json'
  format: 'mind-turn-v1'
}

function sanitizeText(raw: unknown, maxLength: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function normalizeExecutionFactStatus(
  status: AlicizationExecutionOutcomeSurfaceStatus,
): AlicizationExecutionDeliveryFact['status'] {
  if (status === 'completed')
    return 'succeeded'
  if (status === 'blocked' || status === 'cancelled')
    return 'denied'
  return 'failed'
}

export function selectAlicizationExecutionDeliveryReply(input: {
  channel: string
  goal: string
  llmReply?: string | null
  outcome: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  summary: string
  policy?: unknown
  personStateProjection?: unknown
  selfContinuityAuthority?: unknown
  hostPersonModel?: unknown
  memorySurfaceRestraint?: unknown
}): AlicizationExecutionDeliveryReplySelection {
  const visibleReply = sanitizeText(input.llmReply, 12_000)
  if (!visibleReply) {
    return {
      status: 'pending-provider-settlement',
      reason: 'missing-provider-reply',
    }
  }

  return {
    status: 'settled',
    source: 'llm',
    visibleReply,
  }
}

export function buildAlicizationExecutionPayoffPrompt(input: {
  mode: AlicizationExecutionPayoffMode
  channel: string
  goal: string
  status: AlicizationExecutionOutcomeSurfaceStatus
  summary: string
  outcome: string
  policy?: unknown
  userText?: string | null
  trace?: unknown
  governance?: unknown
  knowledgeEvidence?: unknown
  personStateProjection?: unknown
  selfContinuityAuthority?: unknown
  hostPersonModel?: unknown
}) {
  const executionFact = buildAlicizationExecutionDeliveryFact({
    toolName: sanitizeText(input.channel, 96) || 'executor',
    status: normalizeExecutionFactStatus(input.status),
    summary: sanitizeText(input.summary, 1_200),
    result: {
      goal: sanitizeText(input.goal, 1_200),
      outcome: sanitizeText(input.outcome, 12_000),
    },
  })

  return {
    system: JSON.stringify({
      type: 'alicization-execution-settlement-context',
      executionFact,
    }),
    user: JSON.stringify({
      type: 'alicization-execution-settlement-request',
    }),
  }
}

export function normalizeAlicizationExecutionPayoffEmotion(raw: unknown, fallback: string) {
  const candidate = sanitizeText(raw, 48).toLowerCase()
  return allowedExecutionPayoffEmotions.has(candidate)
    ? candidate
    : fallback
}

export function normalizeAlicizationExecutionPayoffPerformance(
  raw: unknown,
  emotion: string,
  fallback: AlicizationExecutionPayoffStructured['performance'],
) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      ...fallback,
      baseEmotion: emotion,
    }
  }

  const payload = raw as Record<string, unknown>
  const deliveryCandidate = sanitizeText(payload.delivery, 48).toLowerCase()
  const emphasis = Number.isFinite(payload.emphasis)
    ? Math.max(0, Math.min(2, Math.floor(Number(payload.emphasis))))
    : fallback.emphasis

  return {
    baseEmotion: emotion,
    facialCue: sanitizeText(payload.facialCue, 64) || fallback.facialCue,
    actionCue: sanitizeText(payload.actionCue, 64) || fallback.actionCue,
    delivery: allowedExecutionPayoffDeliveries.has(deliveryCandidate)
      ? deliveryCandidate
      : fallback.delivery,
    emphasis: emphasis as 0 | 1 | 2,
  }
}

export function normalizeAlicizationProviderExecutionStructured(input: {
  parsed: Record<string, unknown>
  reply: string
  thought: string
  emotion: string
  performance: AlicizationDialoguePerformancePayload
  delivery?: string | null
}): AlicizationExecutionPayoffStructured {
  return {
    ...input.parsed,
    format: 'mind-turn-v1',
    parsePath: 'json',
    thought: input.thought,
    emotion: input.emotion,
    reply: input.reply,
    delivery: sanitizeText(input.delivery, 48)
      || sanitizeText(input.performance.delivery, 48)
      || 'calm',
    performance: {
      baseEmotion: input.emotion,
      facialCue: input.performance.facialCue ?? null,
      actionCue: input.performance.actionCue ?? null,
      delivery: sanitizeText(input.delivery, 48)
        || sanitizeText(input.performance.delivery, 48)
        || 'calm',
      emphasis: input.performance.emphasis,
    },
  } as AlicizationExecutionPayoffStructured
}
