import type {
  AlicizationChatMetaEvent,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialoguePerformancePayload,
  AlicizationMindTurnGovernance,
  AlicizationResidentPerformanceSnapshot,
  AlicizationRuntimeDigest,
  AlicizationVisibleReplyExecution,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'

import {
  normalizeAlicizationRuntimeDigest,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { shouldEmitAlicizationChatMetaUpdate } from './main-chat-stream-meta-policy'
import { buildAlicizationChatStreamEmbodimentMeta } from './runtime-governance'

const legacyDialogueGovernanceKeys = new Set([
  'activeContinuityGovernance',
  'companionBriefingLine',
  'companionHeadlineLine',
  'companionNextClosureLine',
  'continuityArcStage',
  'continuityCadence',
  'continuityCue',
  'continuityDriftRisk',
  'continuityHold',
  'continuityPreferredTiming',
  'continuityRestraint',
  'emotionalClosureCue',
  'emotionalClosureSummary',
  'governingCommitment',
  'governingConcern',
  'governingFocus',
  'governingInquiry',
  'governingProject',
  'mustDo',
  'mustNotDo',
  'memoryDeliberationProjectStateDiagnostics',
  'memoryTuningAdvice',
  'openingGuidanceHoldDetail',
  'openingMove',
  'openingPolicy',
  'openingStyle',
  'opening_policy',
  'preDialogueAwareness',
  'preDialogueAwarenessLine',
  'preDialogueAwarenessSummary',
  'preDialogueClosure',
  'preDialogueSendIdentity',
  'projectState',
  'projectStateContinuity',
  'projectStateEmotionalClosureCue',
  'projectStateNextFocusSummary',
  'projectStateOpenFocusSummary',
  'proactiveSameHerGap',
  'proactiveSameHerGapSummary',
  'relationshipCadence',
  'relationshipPosture',
  'relationship_cadence',
  'reasonCodes',
  'reasonTags',
  'sameHerCausalityRepairPressure',
  'sameHerDriftRisk',
  'sameHerDriftRiskLine',
  'sameHerDriftRiskSummary',
  'sameHerHoldDetail',
  'sameHerInwardCarry',
  'sameHerSelfLine',
  'sameHerSummary',
  'visibleReplyRealization',
])

const literalDialogueTextKeys = new Set([
  'reply',
  'replyText',
  'text',
])

function isLegacyDialogueGovernanceKey(key: string) {
  return legacyDialogueGovernanceKeys.has(key)
    || key.startsWith('companion')
    || key.startsWith('emotionalClosure')
    || key.startsWith('opening')
    || key.startsWith('projectState')
    || key.startsWith('proactiveSameHer')
    || key.startsWith('sameHer')
}

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
  if (isLegacyDialogueGovernanceKey(key))
    return undefined
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
      .filter(([entryKey]) => !isLegacyDialogueGovernanceKey(entryKey))
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
  return sanitizeChatMetaValue(digitalLifeSpine) ?? null
}

function buildCurrentConsciousFrameForStreamMetaGovernance(
  runtimeDigest: AlicizationRuntimeDigest | null | undefined,
): AlicizationCurrentConsciousFrameSnapshot | null {
  const frame = sanitizeChatMetaValue(runtimeDigest?.currentConsciousFrame ?? null)
  if (!frame)
    return null

  return {
    ...frame,
    reasonTags: Array.isArray(frame.reasonTags) ? frame.reasonTags : [],
    projectState: null,
  } as AlicizationCurrentConsciousFrameSnapshot
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
    governance: sanitizeChatMetaValue(input.governance) ?? null,
    visibleReplyExecution: sanitizeChatMetaValue(input.visibleReplyExecution ?? null) ?? null,
    projectState: null,
    preDialogueAwareness: null,
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
    governance: body.governance ?? null,
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
      governance: sanitizeChatMetaValue(input.getGovernance() ?? null),
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
