import type {
  AlicizationChatMetaEvent,
  AlicizationDialoguePerformancePayload,
  AlicizationMindTurnGovernance,
  AlicizationResidentPerformanceSnapshot,
  AlicizationRuntimeDigest,
  AlicizationVisibleReplyExecution,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'

import {
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationRuntimeDigest,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { shouldEmitAlicizationChatMetaUpdate } from './main-chat-stream-meta-policy'
import { buildAlicizationChatStreamEmbodimentMeta } from './runtime-governance'

const literalDialogueTextKeys = new Set([
  'reply',
  'replyText',
  'text',
])

const digitalLifeArchitectureOperatingModes = new Set([
  'observing',
  'thinking',
  'speaking',
  'acting',
  'remembering',
])

const digitalLifeArchitectureSubsystemIds = new Set([
  'dialogue',
  'perception',
  'proactive',
  'control',
  'mind',
  'memory',
  'runtime',
])

function sanitizeDigitalLifeArchitectureMeta(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined
  const architecture = value as Record<string, unknown>
  const operatingMode = typeof architecture.operatingMode === 'string'
    && digitalLifeArchitectureOperatingModes.has(architecture.operatingMode)
    ? architecture.operatingMode
    : null
  const dominantSystem = typeof architecture.dominantSystem === 'string'
    && digitalLifeArchitectureSubsystemIds.has(architecture.dominantSystem)
    ? architecture.dominantSystem
    : null
  const supportingSystems = Array.isArray(architecture.supportingSystems)
    ? architecture.supportingSystems.filter(
        system => typeof system === 'string' && digitalLifeArchitectureSubsystemIds.has(system),
      )
    : []

  if (!operatingMode && !dominantSystem && supportingSystems.length === 0)
    return undefined

  return {
    operatingMode,
    dominantSystem,
    supportingSystems,
  }
}

function sanitizeChatMetaValue<T>(
  value: T,
  key = '',
  seen = new WeakSet<object>(),
): T | null | undefined {
  if (key === 'architecture')
    return sanitizeDigitalLifeArchitectureMeta(value) as T | undefined

  if (typeof value === 'string') {
    if (literalDialogueTextKeys.has(key))
      return value as T
    return (sanitizeAlicizationProviderFacingText(value, 1600, '') || null) as T | null
  }

  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeChatMetaValue(item, key, seen))
      .filter((item): item is NonNullable<typeof item> => item !== undefined && item !== null) as T
  }

  if (!value || typeof value !== 'object')
    return value

  if (seen.has(value))
    return undefined
  seen.add(value)

  const sanitized = Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([entryKey, item]) => [
        entryKey,
        sanitizeChatMetaValue(item, entryKey, seen),
      ])
      .filter(([, item]) => item !== undefined && item !== null),
  )

  seen.delete(value)
  return Object.keys(sanitized).length > 0
    ? sanitized as T
    : undefined
}

function sanitizeChatMetaGovernance(
  value: AlicizationChatMetaEvent['governance'] | null | undefined,
): AlicizationChatMetaEvent['governance'] {
  const candidate = sanitizeChatMetaValue(value)
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return null

  const source = candidate as unknown as Record<string, unknown>
  const decisionTraceId = typeof source.decisionTraceId === 'string'
    ? sanitizeAlicizationProviderFacingText(source.decisionTraceId, 160, '')
    : ''
  const hadReasons = Object.hasOwn(source, 'reasons')
  const reasons = Array.isArray(source.reasons)
    ? source.reasons
        .map(reason => typeof reason === 'string'
          ? sanitizeAlicizationProviderFacingText(reason, 160, '')
          : '')
        .filter((reason): reason is string => Boolean(reason))
    : []
  const sanitized: Record<string, unknown> = {}

  if (decisionTraceId)
    sanitized.decisionTraceId = decisionTraceId
  if (hadReasons)
    sanitized.reasons = reasons

  return Object.keys(sanitized).length > 0
    ? sanitized as unknown as AlicizationChatMetaEvent['governance']
    : null
}

function sanitizeRuntimeDigest(
  runtimeDigest: AlicizationRuntimeDigest | null | undefined,
) {
  const normalized = normalizeAlicizationRuntimeDigest(runtimeDigest)
  if (!normalized)
    return null

  return sanitizeChatMetaValue(normalized) as AlicizationRuntimeDigest
}

export function sanitizeAlicizationRuntimeDigestForTransport(
  runtimeDigest: AlicizationRuntimeDigest | null | undefined,
) {
  return sanitizeRuntimeDigest(runtimeDigest)
}

function sanitizeDigitalLifeSpine(
  digitalLifeSpine: AlicizationChatMetaEvent['digitalLifeSpine'],
) {
  const normalized = normalizeAlicizationDigitalLifeSpineDigest(digitalLifeSpine)
  return sanitizeChatMetaValue(normalized) ?? null
}

function buildCurrentConsciousFrameForStreamMetaGovernance(
  runtimeDigest: AlicizationRuntimeDigest | null | undefined,
): { reasonTags: string[] } | null {
  const frame = sanitizeChatMetaValue(runtimeDigest?.currentConsciousFrame ?? null)
  if (!frame)
    return null

  return {
    reasonTags: Array.isArray(frame.reasonTags) ? frame.reasonTags : [],
  }
}

export function buildAlicizationChatMetaPayload(input: {
  cardId: string
  turnId: string
  governance: AlicizationChatMetaEvent['governance']
  visibleReplyExecution?: AlicizationChatMetaEvent['visibleReplyExecution']
  embodiment: AlicizationChatMetaEvent['embodiment']
  embodimentScript: AlicizationChatMetaEvent['embodimentScript']
  speechTimeline: AlicizationChatMetaEvent['speechTimeline']
  digitalLife: AlicizationChatMetaEvent['digitalLife']
  digitalLifeSpine: AlicizationChatMetaEvent['digitalLifeSpine']
  residentPerformance?: AlicizationChatMetaEvent['residentPerformance']
  runtimeDigest: AlicizationChatMetaEvent['runtimeDigest']
}) {
  const embodimentScript = sanitizeChatMetaValue(input.embodimentScript) ?? null
  const digitalLife = sanitizeChatMetaValue(
    embodimentScript?.digitalLife ?? input.digitalLife,
  ) ?? null

  return {
    cardId: input.cardId,
    turnId: input.turnId,
    governance: sanitizeChatMetaGovernance(input.governance),
    visibleReplyExecution: sanitizeChatMetaValue(input.visibleReplyExecution ?? null) ?? null,
    embodiment: sanitizeChatMetaValue(input.embodiment) ?? null,
    embodimentScript,
    speechTimeline: sanitizeChatMetaValue(input.speechTimeline) ?? null,
    digitalLife,
    digitalLifeSpine: sanitizeDigitalLifeSpine(input.digitalLifeSpine),
    residentPerformance: sanitizeChatMetaValue(input.residentPerformance ?? null) ?? null,
    runtimeDigest: sanitizeRuntimeDigest(input.runtimeDigest),
  } satisfies AlicizationChatMetaEvent
}

export function buildAlicizationChatMetaSignature(
  body: Pick<
    AlicizationChatMetaEvent,
    | 'visibleReplyExecution'
    | 'embodiment'
    | 'embodimentScript'
    | 'speechTimeline'
    | 'digitalLife'
    | 'digitalLifeSpine'
    | 'runtimeDigest'
    | 'residentPerformance'
  > & {
    governance?: AlicizationChatMetaEvent['governance']
  },
) {
  return JSON.stringify(sanitizeChatMetaValue({
    governance: sanitizeChatMetaGovernance(body.governance ?? null),
    visibleReplyExecution: body.visibleReplyExecution ?? null,
    embodiment: body.embodiment ?? null,
    embodimentScript: body.embodimentScript ?? null,
    speechTimeline: body.speechTimeline ?? null,
    digitalLife: body.embodimentScript?.digitalLife ?? body.digitalLife ?? null,
    digitalLifeSpine: body.digitalLifeSpine ?? null,
    residentPerformance: body.residentPerformance ?? null,
    runtimeDigest: sanitizeRuntimeDigest(body.runtimeDigest),
  }))
}

export { shouldEmitAlicizationChatMetaUpdate }

export function createAlicizationChatStreamMetaEmitter(input: {
  cardId: string
  turnId: string
  getGovernance: () => AlicizationMindTurnGovernance | null | undefined
  getThought?: () => string | null | undefined
  getVisibleReplyExecution?: () => AlicizationVisibleReplyExecution | null | undefined
  getDigitalLifeSpine?: () => AlicizationChatMetaEvent['digitalLifeSpine']
  getRuntimeDigest?: () => AlicizationRuntimeDigest | null | undefined
  getResidentPerformance?: () => AlicizationResidentPerformanceSnapshot | null | undefined
  getPerformanceManifest?: () => CharacterPerformanceCapabilitiesManifest | null | undefined
  getExplicitPerformance?: () => AlicizationDialoguePerformancePayload | null | undefined
  emit: (payload: AlicizationChatMetaEvent) => void
}) {
  let lastSignature: string | null = null
  let lastReply = ''

  function emit(reply: string, options?: { force?: boolean }) {
    const digitalLifeSpine = sanitizeDigitalLifeSpine(
      input.getDigitalLifeSpine?.() ?? null,
    )
    const runtimeDigest = sanitizeRuntimeDigest(
      input.getRuntimeDigest?.() ?? null,
    )
    const meta = buildAlicizationChatStreamEmbodimentMeta({
      governance: sanitizeChatMetaGovernance(input.getGovernance() ?? null),
      digitalLifeSpine,
      affectiveResidue: runtimeDigest?.affectiveResidue
        ?? runtimeDigest?.derivedMindStateBundle?.affectiveResidue
        ?? null,
      currentConsciousFrame:
        buildCurrentConsciousFrameForStreamMetaGovernance(runtimeDigest),
      performanceManifest: input.getPerformanceManifest?.() ?? null,
      residentPerformance: input.getResidentPerformance?.() ?? null,
      explicitPerformance: input.getExplicitPerformance?.() ?? null,
      reply,
      thought: input.getThought?.() ?? undefined,
      turnId: input.turnId,
    })
    const emittedMeta = buildAlicizationChatMetaPayload({
      cardId: input.cardId,
      turnId: input.turnId,
      governance: meta.governance,
      visibleReplyExecution: input.getVisibleReplyExecution?.() ?? null,
      embodiment: meta.embodiment,
      embodimentScript: meta.embodimentScript ?? null,
      speechTimeline: meta.speechTimeline,
      digitalLife: meta.digitalLife,
      digitalLifeSpine: meta.digitalLifeSpine ?? digitalLifeSpine,
      residentPerformance: input.getResidentPerformance?.() ?? null,
      runtimeDigest,
    })
    const signature = JSON.stringify({
      reply,
      meta: buildAlicizationChatMetaSignature(emittedMeta),
    })
    if (!options?.force && signature === lastSignature)
      return

    lastSignature = signature
    lastReply = meta.speechTimeline?.reply ?? reply.trim()
    input.emit(emittedMeta)
  }

  return {
    emit,
    getLastReply: () => lastReply,
    snapshot: () => ({
      lastReply,
      lastSignature,
    }),
  }
}
