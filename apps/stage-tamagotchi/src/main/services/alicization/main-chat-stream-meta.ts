import type {
  AlicizationChatMetaEvent,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialoguePerformancePayload,
  AlicizationMindTurnGovernance,
  AlicizationResidentPerformanceSnapshot,
  AlicizationRuntimeDigest,
  AlicizationRuntimeProjectStateDigest,
  AlicizationVisibleReplyExecution,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'

import {
  buildAlicizationFaceSummary,
  buildAlicizationLipsyncSummary,
  buildAlicizationMotionSummary,
  buildAlicizationVoiceSummary,
  containsAlicizationFixedTemplateResidue,
  describeAlicizationEmbodimentClosureReminder,
  detectRememberedSeamCompanionshipReopen,
  normalizeAlicizationDialogueEmbodimentEnvelope,
  normalizeAlicizationDigitalLifeEnvelope,
  resolveAlicizationCompanionshipReasonSummary,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

import {
  hasExplicitRepairBeforeClosenessAuthority,
  preferStrongerContinuityClosureAuthority,
} from './continuity-closure-authority'
import { shouldEmitAlicizationChatMetaUpdate } from './main-chat-stream-meta-policy'
import {
  buildAlicizationProjectPreDialogueAwareness,
  buildAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
} from './project-state-brief'
import { buildAlicizationChatStreamEmbodimentMeta, readStringValue } from './runtime-governance'

type AlicizationChatMetaDigitalLifeFrame = NonNullable<AlicizationChatMetaEvent['digitalLife']>['frames'][number]
type AlicizationChatMetaSpeechTimelineSegment = NonNullable<NonNullable<AlicizationChatMetaEvent['speechTimeline']>['segments'][number]>
type AlicizationChatMetaEmotionalKernel = NonNullable<AlicizationRuntimeDigest['emotionalKernel']>
type AlicizationChatMetaSelfContinuityAuthority = NonNullable<
  NonNullable<AlicizationRuntimeDigest['currentConsciousFrame']>['selfContinuityAuthority']
>
type AlicizationChatMetaCurrentConsciousFrame = NonNullable<AlicizationRuntimeDigest['currentConsciousFrame']>
type StreamMetaSanitizationScope = 'default' | 'pre-dialogue-awareness' | 'project-state'

function isStructuredMeasuredReturnInwardCarry(raw: string | null | undefined) {
  return typeof raw === 'string'
    && (raw.includes('cadence=measured_return') || raw.includes('continuity_hold=measured_return'))
    && raw.includes('direction=inward')
    && raw.includes('widening=deferred')
}

const streamMetaFixedTemplateCuePattern = new RegExp(
  [
    'cadence=(?:measured_return|repair_before_closeness)',
    `${['continuity', 'hold'].join('_')}=(?:measured_return|repair_before_closeness)`,
    'continuity_scope=life_loop',
    'continuity_context=present',
    'unresolved_closure=continuity_line',
    'line=continuity_line',
    'continuity_line',
    'continuity_identity',
    'project_state_continuity',
    'growth=life-loop-open',
    'closure=full-cross-modal-open',
    'same-digital-life-project-thread',
    'phase1-route=desktop-life-loop',
    'local_desktop_life_loop',
    'content=excluded',
    'visibility=internal(?:[-_][a-z0-9]+)?',
    'cross_modal_continuity_proof',
  ].join('|'),
  'iu',
)

function sanitizeStreamMetaContinuityReason(raw: string | null | undefined, maxChars = 360) {
  const sanitized = sanitizeAlicizationStructuredInternalText(raw, maxChars, '')
  return streamMetaFixedTemplateCuePattern.test(sanitized) ? '' : sanitized
}

const streamMetaStructuralTokenKeys = new Set([
  'id',
  'source',
  'status',
  'kind',
  'lane',
  'mode',
  'version',
  'decisionTraceId',
  'turnId',
  'cardId',
  'segmentId',
  'causalSource',
  'affectedLane',
  'reasonTag',
  'reasonTags',
  'sourceTag',
  'sourceTags',
])

const streamMetaInternalGovernanceKeys = new Set([
  'sameHerCausalityRepairPressure',
  'memoryTuningAdvice',
  'focusDimension',
  'focusDimensions',
])

const streamMetaInternalGovernanceSummaryPrefixes = [
  'continuity_causality_repair=',
  'same_her_causality_repair=',
  'memory-tuning-advice=',
  'memory_tuning_advice=',
] as const

const streamMetaVisibleTextKeys = new Set([
  'reply',
  'replyText',
  'text',
])

const streamMetaProjectStateNarrativeKeys = new Set([
  'identity',
  'currentPhase',
  'preflightSummary',
  'latestProgress',
  'latestLandedProgress',
  'landedProgressSummary',
  'memoryClosureSummary',
  'continuitySummary',
  'primaryOpenLoop',
  'openClosureSummary',
  'nextClosureTarget',
  'nextClosureTargetSummary',
  'sameHerSelfLine',
  'sameHerDriftRisk',
  'sameHerDriftRiskSummary',
  'sameHerHoldDetail',
  'proactiveSameHerGap',
  'proactiveSameHerGapSummary',
  'continuityCue',
  'preDialogueAwarenessLine',
  'awarenessLine',
  'companionHeadlineLine',
  'companionBriefingLine',
  'preDialogueAwarenessSummary',
  'emotionalClosureSummary',
])

const streamMetaPreDialogueAwarenessNarrativeKeys = new Set([
  'summaryLine',
  'companionBriefingLine',
  'companionNextClosureLine',
  'awarenessLine',
  'reasonPreview',
])

function isStreamMetaInternalGovernanceSegment(raw: string) {
  const normalized = raw.trim().toLowerCase()
  return normalized === 'memory-tuning-advice'
    || normalized === 'source=memory-tuning-advice'
    || streamMetaInternalGovernanceSummaryPrefixes.some(prefix => normalized.startsWith(prefix))
}

function hasStreamMetaInternalGovernanceSegment(raw: string) {
  return raw.split(/\s*\|\s*/u).some(isStreamMetaInternalGovernanceSegment)
}

function stripStreamMetaInternalGovernanceSummary(raw: string) {
  const segments = raw.split(/\s*\|\s*/u)
  const filtered = segments.filter(segment => !isStreamMetaInternalGovernanceSegment(segment))
  return filtered.length === segments.length
    ? raw
    : filtered.join(' | ')
}

function sanitizeStreamMetaSummary(raw: string, maxChars: number) {
  const governanceRedacted = stripStreamMetaInternalGovernanceSummary(raw).trim()
  if (!governanceRedacted || containsAlicizationFixedTemplateResidue(governanceRedacted))
    return ''
  return governanceRedacted.slice(0, Math.max(0, maxChars))
}

const streamMetaRuntimeSummaryBooleanKeys = new Set([
  'speak',
  'act',
])

const streamMetaRuntimeSummaryNumericKeys = new Set([
  'initiative',
  'coherence',
  'continuity',
  'companionship',
  'truth',
  'boundary',
  'return',
])

const streamMetaRuntimeSummaryIdentifierKeys = new Set([
  'dominant',
  'phase',
  'handoff',
  'autonomy',
  'visible',
  'restraint',
  'intent',
  'motive',
  'habit',
])

// Runtime summary identifiers intentionally permit only lowercase ASCII telemetry tokens.
const streamMetaRuntimeSummaryIdentifierPattern = /^[a-z0-9][a-z0-9_.:/+-]*$/u
const streamMetaRuntimeSummaryDecimalPattern = /^(?:0|[1-9]\d*)(?:\.\d+)?$/u
const streamMetaCanonicalFullCrossModalBodyState = 'authority=body+face+motion+lipsync+voice | segment=locked'
const streamMetaFullCrossModalAuthorityContext = 'same living segment together'
const streamMetaLegacyFullCrossModalAuthorityTokens = [
  'authority-body:yes',
  'authority-face:yes',
  'authority-motion:yes',
  'authority-lipsync:yes',
  'authority-voice:yes',
] as const

function normalizeStreamMetaFullCrossModalBodyState(raw: string) {
  const normalized = raw.trim()
  if (normalized === streamMetaCanonicalFullCrossModalBodyState)
    return streamMetaCanonicalFullCrossModalBodyState

  const segments = normalized
    .split(/\s*\|\s*/u)
    .map(segment => segment.trim())
    .filter(Boolean)
  if (
    segments.length < streamMetaLegacyFullCrossModalAuthorityTokens.length
    || segments.length > streamMetaLegacyFullCrossModalAuthorityTokens.length + 1
  ) {
    return null
  }

  const allowedSegments = new Set<string>([
    ...streamMetaLegacyFullCrossModalAuthorityTokens,
    streamMetaFullCrossModalAuthorityContext,
  ])
  if (segments.some(segment => !allowedSegments.has(segment)))
    return null

  return streamMetaLegacyFullCrossModalAuthorityTokens.every(token =>
    segments.filter(segment => segment === token).length === 1,
  )
    ? streamMetaCanonicalFullCrossModalBodyState
    : null
}

function sanitizeStreamMetaRuntimeSummary(
  raw: string | null | undefined,
  maxChars = 520,
) {
  if (typeof raw !== 'string')
    return ''

  const governanceRedacted = stripStreamMetaInternalGovernanceSummary(raw).trim()
  if (
    !governanceRedacted
    || governanceRedacted.length > Math.max(0, maxChars)
    || containsAlicizationFixedTemplateResidue(governanceRedacted)
    || streamMetaFixedTemplateCuePattern.test(governanceRedacted)
  ) {
    return ''
  }

  const seenKeys = new Set<string>()
  const sanitizedSegments: string[] = []
  for (const rawSegment of governanceRedacted.split('|')) {
    const segment = rawSegment.trim()
    const separatorIndex = segment.indexOf('=')
    if (
      !segment
      || separatorIndex <= 0
      || segment.includes('=', separatorIndex + 1)
    ) {
      return ''
    }

    const key = segment.slice(0, separatorIndex).trim()
    const value = segment.slice(separatorIndex + 1).trim()
    if (!value || seenKeys.has(key))
      return ''
    seenKeys.add(key)

    if (key === 'same-thread-continuation') {
      if (value !== 'alive')
        return ''
    }
    else if (streamMetaRuntimeSummaryBooleanKeys.has(key)) {
      if (value !== 'true' && value !== 'false')
        return ''
    }
    else if (streamMetaRuntimeSummaryNumericKeys.has(key)) {
      const numericValue = Number(value)
      if (
        !streamMetaRuntimeSummaryDecimalPattern.test(value)
        || !Number.isFinite(numericValue)
        || numericValue < 0
        || numericValue > 1
      ) {
        return ''
      }
    }
    else if (streamMetaRuntimeSummaryIdentifierKeys.has(key)) {
      if (!streamMetaRuntimeSummaryIdentifierPattern.test(value))
        return ''
    }
    else if (key === 'emotion_closure') {
      if (
        value.length > 96
        || /[|=\r\n]/u.test(value)
        || containsAlicizationFixedTemplateResidue(value)
        || streamMetaFixedTemplateCuePattern.test(value)
      ) {
        return ''
      }
    }
    else {
      return ''
    }

    sanitizedSegments.push(`${key}=${value}`)
  }

  const sanitized = sanitizedSegments.join(' | ')
  return sanitized.length <= Math.max(0, maxChars) ? sanitized : ''
}

function isStreamMetaStructuralToken(key: string | undefined, raw: string) {
  const normalized = raw.trim()
  if (!normalized)
    return true
  if (!key || !streamMetaStructuralTokenKeys.has(key))
    return false
  return /^[\w:./+-]+$/u.test(normalized)
}

function isStreamMetaAuthorityCurrentBodyStatePath(path: readonly string[]) {
  const normalizedPath = path.join('.')
  return normalizedPath === 'currentConsciousFrame.selfContinuityAuthority.currentBodyState'
    || normalizedPath === 'selfAuthority.currentBodyState'
    || normalizedPath === 'runtimeSurface.perception.currentBodyState'
}

function sanitizeStreamMetaObject<T>(
  raw: T,
  maxChars = 520,
  key?: string,
  inheritedScope: StreamMetaSanitizationScope = 'default',
  path: readonly string[] = [],
): T {
  const scope = key === 'projectState'
    ? 'project-state'
    : key === 'preDialogueAwareness'
      ? 'pre-dialogue-awareness'
      : inheritedScope

  if (typeof raw === 'string') {
    if (
      (scope === 'project-state' && key !== undefined && streamMetaProjectStateNarrativeKeys.has(key))
      || (scope === 'pre-dialogue-awareness' && key !== undefined && streamMetaPreDialogueAwarenessNarrativeKeys.has(key))
    ) {
      return '' as T
    }

    if (isStreamMetaAuthorityCurrentBodyStatePath(path)) {
      const normalizedFullCrossModalBodyState = normalizeStreamMetaFullCrossModalBodyState(raw)
      if (normalizedFullCrossModalBodyState)
        return normalizedFullCrossModalBodyState as T
    }

    if (key === 'summary')
      return sanitizeStreamMetaSummary(raw, maxChars) as T

    const visibleBoundaryText = key !== undefined && streamMetaVisibleTextKeys.has(key)
    if (visibleBoundaryText) {
      if (hasStreamMetaInternalGovernanceSegment(raw))
        return '' as T
      return raw.trim().slice(0, Math.max(0, maxChars)) as T
    }

    const preserveSourceText = key === 'source'
    if (preserveSourceText && hasStreamMetaInternalGovernanceSegment(raw))
      return '' as T

    const sanitized = isStreamMetaStructuralToken(key, raw)
      || (preserveSourceText && !containsAlicizationFixedTemplateResidue(raw))
      ? raw.trim().slice(0, Math.max(0, maxChars))
      : sanitizeStreamMetaContinuityReason(raw, maxChars)
    return (streamMetaFixedTemplateCuePattern.test(sanitized) ? '' : sanitized) as T
  }
  if (!raw || typeof raw !== 'object')
    return raw
  if (Array.isArray(raw)) {
    const sanitizedItems = raw.map(item => sanitizeStreamMetaObject(item, maxChars, key, scope, path))
    return (key === 'reasonPreview'
      ? sanitizedItems.filter(item => typeof item === 'string' && item.trim().length > 0)
      : sanitizedItems) as T
  }

  const sanitized: Record<string, unknown> = {}
  for (const [entryKey, value] of Object.entries(raw as Record<string, unknown>)) {
    if (streamMetaInternalGovernanceKeys.has(entryKey))
      continue
    sanitized[entryKey] = sanitizeStreamMetaObject(value, maxChars, entryKey, scope, [...path, entryKey])
  }
  return sanitized as T
}

function sanitizeStreamMetaRuntimeDigest<T>(raw: T, maxChars = 520): T {
  const sanitized = sanitizeStreamMetaObject(raw, maxChars)
  if (
    !raw
    || typeof raw !== 'object'
    || Array.isArray(raw)
    || !sanitized
    || typeof sanitized !== 'object'
    || Array.isArray(sanitized)
  ) {
    return sanitized
  }

  if (!Object.hasOwn(raw, 'summary'))
    return sanitized

  const runtimeSummary = (raw as Record<string, unknown>).summary
  return {
    ...(sanitized as Record<string, unknown>),
    summary: sanitizeStreamMetaRuntimeSummary(
      typeof runtimeSummary === 'string' ? runtimeSummary : null,
      maxChars,
    ),
  } as T
}

export function repairContinuitySourceTagsFromRuntimeDigest(input: {
  digitalLifeSpine: AlicizationChatMetaEvent['digitalLifeSpine'] | null | undefined
  runtimeDigest: AlicizationRuntimeDigest | null | undefined
}) {
  const digitalLifeSpine = input.digitalLifeSpine
  if (!digitalLifeSpine)
    return digitalLifeSpine

  const memoryAuthority = digitalLifeSpine.memory?.personStateProjection?.selfContinuityAuthority ?? null
  const topLevelAuthority = digitalLifeSpine.selfAuthority ?? null
  const authority = memoryAuthority ?? topLevelAuthority
  if (!authority)
    return digitalLifeSpine

  const sameHerSelfLine = [
    input.runtimeDigest?.projectState?.sameHerSelfLine,
    digitalLifeSpine.runtime?.projectState?.sameHerSelfLine,
  ]
    .find(value => typeof value === 'string' && value.trim().length > 0)
    ?.trim() ?? ''
  if (!sameHerSelfLine)
    return digitalLifeSpine

  const lowered = sameHerSelfLine.toLowerCase()
  const callbackContinuityText = [
    input.runtimeDigest?.projectState?.continuityCue,
    input.runtimeDigest?.currentConsciousFrame?.focusAnchor,
    input.runtimeDigest?.activeLoop?.summary,
    digitalLifeSpine.continuitySignal?.summary,
    digitalLifeSpine.runtime?.continuityCue,
    digitalLifeSpine.runtime?.projectState?.continuityCue,
    digitalLifeSpine.runtime?.sceneSummary,
    digitalLifeSpine.runtime?.activeThreadTitle,
    digitalLifeSpine.memory?.summary,
  ]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase()
  const callbackArcStillLive
    = input.runtimeDigest?.projectState?.continuityArcStage === 'same-thread-continuation'
      || digitalLifeSpine.runtime?.projectState?.continuityArcStage === 'same-thread-continuation'
      || input.runtimeDigest?.currentConsciousFrame?.continuityArcStage === 'same-thread-continuation'
      || input.runtimeDigest?.activeLoop?.continuityArcStage === 'same-thread-continuation'
  const callbackRestraintStillMeasured
    = input.runtimeDigest?.continuityRestraint === 'measured-return'
      || digitalLifeSpine.runtime?.projectState?.continuityRestraint === 'measured-return'
      || digitalLifeSpine.proactive?.continuityRestraint === 'measured-return'
  const carriesSameHerProjectIdentity
    = lowered.includes('same phase 1 digital life')
      || lowered.includes('local-first digital life')
      || lowered.includes('same-her')
      || lowered.includes('same her')
      || lowered.includes('continuous her')
      || lowered.includes('one continuous her')
  const combinedCallbackCarryText = `${lowered} ${callbackContinuityText}`
  const carriesCallbackLine
    = combinedCallbackCarryText.includes('continuity-execution-callback-project-carry')
      || combinedCallbackCarryText.includes('execution-callback project-carry')
      || combinedCallbackCarryText.includes('callback project-carry')
      || combinedCallbackCarryText.includes('execution-callback')
      || combinedCallbackCarryText.includes('callback afterglow')
      || combinedCallbackCarryText.includes('same callback line')
      || combinedCallbackCarryText.includes('callback seam')
      || combinedCallbackCarryText.includes('callback hold')
      || combinedCallbackCarryText.includes('callback detour')
      || combinedCallbackCarryText.includes('callback return')
  const carriesSameLineRestraint
    = combinedCallbackCarryText.includes('same living line')
      || combinedCallbackCarryText.includes('same line')
      || combinedCallbackCarryText.includes('still continuing')
      || combinedCallbackCarryText.includes('unfinished closure')
      || combinedCallbackCarryText.includes('still needs')
      || combinedCallbackCarryText.includes('measured-return')
      || combinedCallbackCarryText.includes('lower-pressure')
      || combinedCallbackCarryText.includes('reopen eagerly')
  const carriesCanonicalProjectClosure
    = combinedCallbackCarryText.includes('keep the same living line inward for now')
      || combinedCallbackCarryText.includes('leave room before widening outward again')
      || combinedCallbackCarryText.includes('same-her closure seam')
      || combinedCallbackCarryText.includes('one continuous her')
  const carriesExecutionCallbackProjectCarry
    = carriesCallbackLine
      && (
        carriesSameHerProjectIdentity
        || carriesSameLineRestraint
        || carriesCanonicalProjectClosure
      )
      && (
        carriesSameLineRestraint
        || carriesCanonicalProjectClosure
        || callbackArcStillLive
        || callbackRestraintStillMeasured
        || combinedCallbackCarryText.includes('same-thread-continuation')
        || combinedCallbackCarryText.includes('measured-return')
        || combinedCallbackCarryText.includes('lower-pressure')
      )

  const sourceTags = Array.isArray(authority.sourceTags)
    ? authority.sourceTags
    : []
  const stickyContinuitySourceTags = [
    'project-state-carry',
    ...(carriesExecutionCallbackProjectCarry ? ['continuity-execution-callback-project-carry'] : []),
  ]
  const repairedSourceTags = Array.from(new Set([
    ...stickyContinuitySourceTags,
    ...sourceTags,
  ])).slice(0, 8)
  const topLevelSelfAuthoritySourceTags = Array.isArray(digitalLifeSpine.selfAuthority?.sourceTags)
    ? digitalLifeSpine.selfAuthority.sourceTags
    : []
  const repairedTopLevelSelfAuthoritySourceTags = Array.from(new Set([
    ...repairedSourceTags,
    ...topLevelSelfAuthoritySourceTags,
  ])).slice(0, 8)

  return {
    ...digitalLifeSpine,
    selfAuthority: topLevelAuthority
      ? {
          ...topLevelAuthority,
          sourceTags: repairedTopLevelSelfAuthoritySourceTags,
        }
      : digitalLifeSpine.selfAuthority,
    memory: digitalLifeSpine.memory
      ? {
          ...digitalLifeSpine.memory,
          personStateProjection: digitalLifeSpine.memory.personStateProjection
            ? {
                ...digitalLifeSpine.memory.personStateProjection,
                selfContinuityAuthority: memoryAuthority
                  ? {
                      ...memoryAuthority,
                      sourceTags: repairedSourceTags,
                    }
                  : digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority,
              }
            : digitalLifeSpine.memory.personStateProjection,
        }
      : digitalLifeSpine.memory,
  } satisfies AlicizationChatMetaEvent['digitalLifeSpine']
}

function formatMetaNumber(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return null
  return value.toFixed(2)
}

function readMotorMetric(input: Record<string, unknown> | null | undefined, key: string) {
  if (!input || typeof input !== 'object')
    return undefined
  return input[key]
}

function readNestedMotorMetric(
  input: Record<string, unknown> | null | undefined,
  key: string,
  nestedKey: string,
) {
  if (!input || typeof input !== 'object')
    return undefined
  const candidate = input[key]
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate))
    return undefined
  return (candidate as Record<string, unknown>)[nestedKey]
}

function buildResidentBodyContinuitySummary(input: {
  frameMode?: string | null
  motor?: Record<string, unknown> | null | undefined
  residentMode?: string | null
  continuityTiming?: string | null
  currentBodyState?: string | null
  reasonSummary?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  segmentId?: string | null
}) {
  const stillness = formatMetaNumber(readMotorMetric(input.motor, 'stillness'))
  const gazeStability = formatMetaNumber(
    readNestedMotorMetric(input.motor, 'gaze', 'stability')
    ?? readMotorMetric(input.motor, 'gazeStability'),
  )
  const breathAmplitude = formatMetaNumber(
    readNestedMotorMetric(input.motor, 'breath', 'amplitude')
    ?? readMotorMetric(input.motor, 'breathAmplitude'),
  )
  const expressivity = formatMetaNumber(readMotorMetric(input.motor, 'expressivity'))
  const currentBodyState = typeof input.currentBodyState === 'string'
    ? input.currentBodyState.trim().toLowerCase()
    : ''
  const bodyLine
    = input.continuityTiming === 'audible-body-carry'
      || currentBodyState.includes('lane=body+lipsync+voice-only')
      || currentBodyState.includes('audible same-her line')
      ? 'audible-body-rejoin'
      : input.continuityTiming === 'body-lipsync-carry'
        || currentBodyState.includes('lane=body+lipsync-only')
        ? 'body-lipsync-rejoin'
        : input.residentMode === 'quiet-companionship'
          && typeof input.reasonSummary === 'string'
          && /same living line inward|inward for now|quiet-accompaniment resident presence|quiet accompaniment resident presence/i.test(input.reasonSummary)
          ? 'inward-quiet-line'
          : null
  const hasContinuityCarrier
    = Boolean(
      input.frameMode
      || input.residentMode
      || input.continuityTiming
      || bodyLine
      || input.preferredBlinkCadence
      || input.preferredGazeMode
      || input.reasonSummary
      || input.segmentId,
    )

  if (!stillness && !gazeStability && !breathAmplitude && !expressivity && !hasContinuityCarrier)
    return null

  return [
    input.frameMode ? `mode=${input.frameMode}` : null,
    [
      stillness ? `stillness=${stillness}` : null,
      gazeStability ? `gaze=${gazeStability}` : null,
      breathAmplitude ? `breath=${breathAmplitude}` : null,
      expressivity ? `expressivity=${expressivity}` : null,
    ].filter((value): value is string => Boolean(value)).join(' | ') || null,
    input.residentMode ? `resident=${input.residentMode}` : null,
    input.continuityTiming ? `timing=${input.continuityTiming}` : null,
    input.preferredBlinkCadence ? `blink=${input.preferredBlinkCadence}` : null,
    input.preferredGazeMode ? `gazeMode=${input.preferredGazeMode}` : null,
    input.reasonSummary ? `reason=${input.reasonSummary}` : null,
    bodyLine ? `bodyLine=${bodyLine}` : null,
    input.segmentId ? `seg=${input.segmentId}` : null,
  ].filter((value): value is string => Boolean(value)).join(' | ') || null
}

function readChatMetaString(raw: unknown) {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null
}

function readMemoryClosureIdentityKeyFromCausality(raw: unknown) {
  const causality = readChatMetaRecord(raw)
  if (!causality || causality.causedByMemoryClosure !== true)
    return null

  const memoryIdentity = readChatMetaRecord(causality.memoryIdentity)
  if (!memoryIdentity)
    return null

  const continuityKey = readChatMetaString(memoryIdentity.continuityKey)
  if (continuityKey)
    return continuityKey

  const selectedCandidateIds = Array.isArray(memoryIdentity.selectedCandidateIds)
    ? memoryIdentity.selectedCandidateIds
    : []
  return selectedCandidateIds
    .map(readChatMetaString)
    .find((value): value is string => Boolean(value)) ?? null
}

function resolveRuntimeMemoryClosureIdentityKey(runtimeDigest: AlicizationRuntimeDigest | null | undefined) {
  const derivedMindStateBundle = readChatMetaRecord(runtimeDigest?.derivedMindStateBundle)
  if (!derivedMindStateBundle)
    return null

  const emotionalTransitionLedger = readChatMetaRecord(derivedMindStateBundle.emotionalTransitionLedger)
  const initiativeSuppression = readChatMetaRecord(emotionalTransitionLedger?.initiativeSuppression)
  const learningExecutionState = readChatMetaRecord(derivedMindStateBundle.learningExecutionState)
  const embodimentContinuityLedger = readChatMetaRecord(derivedMindStateBundle.embodimentContinuityLedger)

  return [
    readMemoryClosureIdentityKeyFromCausality(emotionalTransitionLedger?.memoryClosureCausality),
    readMemoryClosureIdentityKeyFromCausality(initiativeSuppression?.memoryClosureCausality),
    readMemoryClosureIdentityKeyFromCausality(learningExecutionState?.memoryClosureCausality),
    readMemoryClosureIdentityKeyFromCausality(embodimentContinuityLedger?.memoryClosureCausality),
  ].find((value): value is string => Boolean(value)) ?? null
}

function appendRuntimeMemoryClosureIdentitySummary(summary: string | null, memoryIdentityKey: string | null) {
  if (!summary || !memoryIdentityKey)
    return summary
  return `${summary} | memory=${memoryIdentityKey}`
}

function resolveLipSyncHintTrail(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized || null
}

function resolveLipSyncTopViseme(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized || null
}

function resolveLipSyncPhase(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized || null
}

function resolveLipsyncHintForSegment(input: {
  segmentId: string | null
  embodimentScript: AlicizationChatMetaEvent['embodimentScript'] | null | undefined
  fallbackIndex?: number | null
}) {
  if (!input.segmentId || !input.embodimentScript?.lipsyncPlan?.visemeHints?.length) {
    return input.fallbackIndex != null
      ? input.embodimentScript?.lipsyncPlan?.visemeHints?.[input.fallbackIndex] ?? null
      : null
  }

  return input.embodimentScript.lipsyncPlan.visemeHints.find(hint => hint.segmentId === input.segmentId)
    ?? (input.fallbackIndex != null
      ? input.embodimentScript.lipsyncPlan.visemeHints[input.fallbackIndex] ?? null
      : null)
}

function resolveFaceCueForSegment(input: {
  segmentId: string | null
  embodimentScript: AlicizationChatMetaEvent['embodimentScript'] | null | undefined
  fallbackIndex?: number | null
}) {
  if (!input.segmentId || !input.embodimentScript?.facePlan?.speakingCues?.length) {
    return input.fallbackIndex != null
      ? input.embodimentScript?.facePlan?.speakingCues?.[input.fallbackIndex] ?? null
      : null
  }

  return input.embodimentScript.facePlan.speakingCues.find(cue => cue.segmentId === input.segmentId)
    ?? (input.fallbackIndex != null
      ? input.embodimentScript.facePlan.speakingCues[input.fallbackIndex] ?? null
      : null)
}

function resolveMotionCueForSegment(input: {
  segmentId: string | null
  embodimentScript: AlicizationChatMetaEvent['embodimentScript'] | null | undefined
  fallbackIndex?: number | null
}) {
  if (!input.segmentId || !input.embodimentScript?.motionPlan?.actionBursts?.length) {
    return input.fallbackIndex != null
      ? input.embodimentScript?.motionPlan?.actionBursts?.[input.fallbackIndex] ?? null
      : null
  }

  return input.embodimentScript.motionPlan.actionBursts.find(cue => cue.segmentId === input.segmentId)
    ?? (input.fallbackIndex != null
      ? input.embodimentScript.motionPlan.actionBursts[input.fallbackIndex] ?? null
      : null)
}

function resolveFrameForLastVisibleSegment(input: {
  digitalLife: AlicizationChatMetaEvent['digitalLife'] | null | undefined
  segmentId: string | null
}) {
  const frames = input.digitalLife?.frames
  if (!frames?.length)
    return null

  if (!input.segmentId)
    return frames.at(-1) ?? null

  for (let index = frames.length - 1; index >= 0; index -= 1) {
    const frame = frames[index]
    if (frame?.id === input.segmentId)
      return frame
  }

  for (let index = frames.length - 1; index >= 0; index -= 1) {
    const frame = frames[index]
    if (frame?.text.trim())
      return frame
  }

  return frames.at(-1) ?? null
}

function resolveAuthoritativeChatMetaDigitalLife(
  input: Pick<AlicizationChatMetaEvent, 'digitalLife' | 'embodimentScript'>,
): AlicizationChatMetaEvent['digitalLife'] {
  if (input.digitalLife)
    return input.digitalLife

  return normalizeAlicizationDigitalLifeEnvelope(input.embodimentScript?.digitalLife ?? null)
}

function resolveVoiceCompanionshipHints(input: {
  lastFrame: AlicizationChatMetaDigitalLifeFrame | null | undefined
  lastSegment: AlicizationChatMetaSpeechTimelineSegment | null | undefined
  embodiment: AlicizationChatMetaEvent['embodiment'] | null | undefined
  embodimentScript: AlicizationChatMetaEvent['embodimentScript'] | null | undefined
  runtimeDigest?: AlicizationChatMetaEvent['runtimeDigest'] | null | undefined
}) {
  const runtimeProjectState = input.runtimeDigest?.projectState ?? null
  const runtimeContinuityRestraint = typeof input.runtimeDigest?.continuityRestraint === 'string'
    && input.runtimeDigest.continuityRestraint.trim()
    ? input.runtimeDigest.continuityRestraint.trim()
    : null
  const companionshipMode = input.lastFrame?.face.rendererHints?.residentMode
    ?? input.lastFrame?.action.rendererHints?.residentMode
    ?? input.lastSegment?.rendererHints?.residentMode
    ?? input.embodiment?.rendererHints?.residentMode
    ?? input.embodimentScript?.state.residentMode
    ?? runtimeContinuityRestraint
    ?? null
  const preferredBlinkCadence = input.lastFrame?.face.rendererHints?.preferredBlinkCadence
    ?? input.lastFrame?.action.rendererHints?.preferredBlinkCadence
    ?? input.lastSegment?.rendererHints?.preferredBlinkCadence
    ?? input.embodiment?.rendererHints?.preferredBlinkCadence
    ?? (typeof runtimeProjectState?.preferredBlinkCadence === 'string' && runtimeProjectState.preferredBlinkCadence.trim()
      ? runtimeProjectState.preferredBlinkCadence.trim()
      : null)
    ?? (companionshipMode === 'measured-return'
      ? 'linger'
      : companionshipMode === 'repair-before-closeness'
        || companionshipMode === 'rest-protective'
        ? 'quiet'
        : null)
  const preferredGazeMode = input.lastFrame?.face.rendererHints?.preferredGazeMode
    ?? input.lastFrame?.action.rendererHints?.preferredGazeMode
    ?? input.lastSegment?.rendererHints?.preferredGazeMode
    ?? input.embodiment?.rendererHints?.preferredGazeMode
    ?? (typeof runtimeProjectState?.preferredGazeMode === 'string' && runtimeProjectState.preferredGazeMode.trim()
      ? runtimeProjectState.preferredGazeMode.trim()
      : null)
    ?? (companionshipMode === 'measured-return'
      || companionshipMode === 'repair-before-closeness'
      || companionshipMode === 'rest-protective'
      ? 'soften'
      : null)

  return {
    companionshipMode,
    preferredBlinkCadence,
    preferredGazeMode,
  }
}

function resolveSummaryFallbackResidentMode(input: {
  lastSegmentResidentMode?: string | null
  embodimentResidentMode?: string | null
  embodimentScriptResidentMode?: string | null
  voiceCompanionshipMode?: string | null
  runtimeDigest?: AlicizationChatMetaEvent['runtimeDigest'] | null | undefined
}) {
  const runtimeRepairsFirst = hasRepairBeforeClosenessSummaryAuthority({
    runtimeDigest: input.runtimeDigest,
  })
  const runtimeRestProtective = hasRestProtectiveSummaryAuthority({
    runtimeDigest: input.runtimeDigest,
  })
  const freshestCompanionshipMode = input.embodimentResidentMode
    ?? input.embodimentScriptResidentMode
    ?? input.voiceCompanionshipMode
    ?? null

  if (runtimeRepairsFirst && freshestCompanionshipMode === 'repair-before-closeness')
    return 'repair-before-closeness'

  if (runtimeRestProtective && freshestCompanionshipMode === 'rest-protective')
    return 'rest-protective'

  if (runtimeRestProtective && !input.lastSegmentResidentMode && !freshestCompanionshipMode)
    return 'rest-protective'

  return input.lastSegmentResidentMode
    ?? freshestCompanionshipMode
    ?? null
}

function shouldPreferFreshRepairFirstSummaryFallback(input: {
  lastSegmentResidentMode?: string | null
  embodimentResidentMode?: string | null
  embodimentScriptResidentMode?: string | null
  voiceCompanionshipMode?: string | null
  runtimeDigest?: AlicizationChatMetaEvent['runtimeDigest'] | null | undefined
}) {
  if (!hasRepairBeforeClosenessSummaryAuthority({
    runtimeDigest: input.runtimeDigest,
  })) {
    return false
  }

  const freshestCompanionshipMode = input.embodimentResidentMode
    ?? input.embodimentScriptResidentMode
    ?? input.voiceCompanionshipMode
    ?? null
  return freshestCompanionshipMode === 'repair-before-closeness'
    && input.lastSegmentResidentMode === 'measured-return'
}

function hasRepairBeforeClosenessSummaryAuthority(
  body: Pick<AlicizationChatMetaEvent, 'runtimeDigest'>,
) {
  const runtimeClosureLine = readRuntimeProjectEmotionalClosureSameHerLine(body)
  if (typeof runtimeClosureLine === 'string'
    && /repair-before-closeness|repair before closeness|先修复再靠近|先把身体收稳|修复优先/u.test(runtimeClosureLine)) {
    return true
  }

  return readVisibleReplyReasonCodes(body).some(code =>
    /execution-callback.*room-first|repair-before-closeness|repair-first/i.test(code),
  )
}

function hasRestProtectiveSummaryAuthority(
  body: Pick<AlicizationChatMetaEvent, 'runtimeDigest'>,
) {
  const runtimeClosureLine = readRuntimeProjectEmotionalClosureSameHerLine(body)
  if (typeof runtimeClosureLine === 'string'
    && /rest-protective|rest protective|fatigue-aware|protect rest|quiet companionship|休息保护|疲惫/u.test(runtimeClosureLine)) {
    return true
  }

  return body.runtimeDigest?.continuityRestraint === 'rest-protective'
}

function resolveContinuityTiming(body: Pick<AlicizationChatMetaEvent, 'runtimeDigest'>) {
  const timing = body.runtimeDigest?.currentConsciousFrame?.continuityPreferredTiming
    ?? body.runtimeDigest?.projectState?.continuityPreferredTiming
    ?? null
  if (typeof timing === 'string' && timing.trim())
    return timing.trim()

  const selfContinuityAuthority = body.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority
  const authoritySummary = typeof selfContinuityAuthority?.authoritySummary === 'string'
    ? selfContinuityAuthority.authoritySummary.trim().toLowerCase()
    : ''
  const currentBodyState = typeof selfContinuityAuthority?.currentBodyState === 'string'
    ? selfContinuityAuthority.currentBodyState.trim().toLowerCase()
    : ''
  const preferredBlinkCadence = typeof body.runtimeDigest?.projectState?.preferredBlinkCadence === 'string'
    ? body.runtimeDigest.projectState.preferredBlinkCadence.trim().toLowerCase()
    : ''
  const preferredGazeMode = typeof body.runtimeDigest?.projectState?.preferredGazeMode === 'string'
    ? body.runtimeDigest.projectState.preferredGazeMode.trim().toLowerCase()
    : ''
  if (
    (authoritySummary.includes('lane=body+lipsync-only') || currentBodyState.includes('lane=body+lipsync-only'))
    && (preferredBlinkCadence === 'linger' || preferredGazeMode === 'soften')
  ) {
    return 'body-lipsync-carry'
  }

  const reasonCodes = readVisibleReplyReasonCodes(body)
  if (reasonCodes.includes('semantic-judge:continuity-next-open-window-early-widening'))
    return 'next-open-window'
  if (reasonCodes.includes('semantic-judge:continuity-after-payoff-early-widening'))
    return 'after-payoff'

  return null
}

function readVisibleReplyReasonCodes(body: Pick<AlicizationChatMetaEvent, 'runtimeDigest'>) {
  const visibleReplyRealization = (body.runtimeDigest as Record<string, unknown> | null | undefined)?.visibleReplyRealization
  if (!visibleReplyRealization || typeof visibleReplyRealization !== 'object')
    return [] as string[]

  const criticReasonCodes = Array.isArray((visibleReplyRealization as { critic?: { reasonCodes?: unknown } }).critic?.reasonCodes)
    ? (visibleReplyRealization as { critic?: { reasonCodes?: string[] } }).critic?.reasonCodes ?? []
    : []
  const closureReasonCodes = Array.isArray((visibleReplyRealization as { closure?: { reasonCodes?: unknown } }).closure?.reasonCodes)
    ? (visibleReplyRealization as { closure?: { reasonCodes?: string[] } }).closure?.reasonCodes ?? []
    : []
  return [...criticReasonCodes, ...closureReasonCodes]
}

function readResidentContinuityReasonTags(
  body: Pick<AlicizationChatMetaEvent, 'runtimeDigest' | 'digitalLifeSpine'>,
) {
  const residentReasonTags = Array.isArray(body.digitalLifeSpine?.embodiment?.residentPerformance?.reasonTags)
    ? body.digitalLifeSpine.embodiment.residentPerformance.reasonTags
    : []
  const currentConsciousFrameReasonTags = Array.isArray(body.runtimeDigest?.currentConsciousFrame?.reasonTags)
    ? body.runtimeDigest.currentConsciousFrame.reasonTags
    : []

  return [...residentReasonTags, ...currentConsciousFrameReasonTags]
}

function hasRememberedSeamMoreRoomReasonTag(reasonTags: string[]) {
  return reasonTags.some((tag) => {
    if (typeof tag !== 'string')
      return false

    const normalized = tag.trim().toLowerCase()
    return normalized === 'timing:remembered-seam-more-room'
      || normalized === 'remembered-seam:reinterpret-with-more-room'
      || normalized === 'frame:remembered-seam:reinterpret-with-more-room'
  })
}

function readSameHerInwardCarry(body: Pick<AlicizationChatMetaEvent, 'runtimeDigest' | 'digitalLifeSpine'>) {
  const looksLikeSceneContaminatedSameHerLine = (value: string) => {
    const normalized = value.trim()
    if (!normalized)
      return false

    const lowered = normalized.toLowerCase()
    const carriesSameHerProjectBaseline
      = lowered.includes('same phase 1 digital life')
        || lowered.includes('same living line')
        || lowered.includes('continuous her')
        || lowered.includes('one continuous her')
    const carriesSceneNarration
      = /宿主正在|host is|runtime\.ts|callback result seam|foreground|scene|window|screen/u.test(normalized)

    return carriesSameHerProjectBaseline && carriesSceneNarration
  }

  const visibleReplyRealization = (body.runtimeDigest as Record<string, unknown> | null | undefined)?.visibleReplyRealization
  if (visibleReplyRealization && typeof visibleReplyRealization === 'object') {
    const sameHerInwardCarry = (visibleReplyRealization as { sameHerInwardCarry?: unknown }).sameHerInwardCarry
    if (typeof sameHerInwardCarry === 'string' && sameHerInwardCarry.trim()) {
      return looksLikeSceneContaminatedSameHerLine(sameHerInwardCarry)
        ? null
        : sameHerInwardCarry.trim()
    }
  }

  const residentReasonTags = Array.isArray(body.digitalLifeSpine?.embodiment?.residentPerformance?.reasonTags)
    ? body.digitalLifeSpine.embodiment.residentPerformance.reasonTags
    : []
  const carriesSameHerResidentTag = residentReasonTags.some((tag: string) => tag.trim().toLowerCase() === 'same-her-inward-carry')
  if (!carriesSameHerResidentTag)
    return null

  const inwardLine = typeof body.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine === 'string'
    ? body.digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.inwardLine.trim()
    : ''
  if (
    inwardLine
    && !looksLikeSceneContaminatedSameHerLine(inwardLine)
    && /same phase 1 digital life|same living line|same-her|same her|continuous her|one continuous her/i.test(inwardLine)
  ) {
    return inwardLine
  }

  const sameHerSelfLine = typeof body.runtimeDigest?.projectState?.sameHerSelfLine === 'string'
    ? body.runtimeDigest.projectState.sameHerSelfLine.trim()
    : ''
  if (sameHerSelfLine)
    return sameHerSelfLine

  const sameHerDriftRisk = typeof body.runtimeDigest?.projectState?.sameHerDriftRisk === 'string'
    ? body.runtimeDigest.projectState.sameHerDriftRisk.trim()
    : ''
  return isSameHerProjectClosureLine(sameHerDriftRisk)
    ? sameHerDriftRisk
    : null
}

function preferRicherProjectStateAuditText(input: {
  current?: unknown
  candidate?: unknown
}) {
  const current = typeof input.current === 'string' ? input.current.trim() : ''
  const candidate = typeof input.candidate === 'string' ? input.candidate.trim() : ''

  if (!current)
    return candidate || null
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const preferredClosureAuthority = preferStrongerContinuityClosureAuthority(current, candidate)
  if (preferredClosureAuthority)
    return preferredClosureAuthority

  const hasClosureSeamMarker = (value: string) => {
    const lower = value.toLowerCase()
    return lower.includes('repair-before-closeness')
      || lower.includes('rest-protective')
      || lower.includes('quiet-companionship')
      || lower.includes('measured-return')
      || lower.includes('lower-pressure')
      || lower.includes('leave more room')
  }
  const scoreClosureSeamStrength = (value: string) => {
    const lower = value.toLowerCase()
    let score = 0
    if (lower.includes('continuity hold:') || lower.includes('generic project continuity hold'))
      score += 10
    if (lower.includes('repair-before-closeness'))
      score += 8
    if (lower.includes('rest-protective'))
      score += 8
    if (lower.includes('quiet-companionship'))
      score += 6
    if (lower.includes('measured-return') || lower.includes('lower-pressure') || lower.includes('leave more room'))
      score += 2
    return score
  }
  if (hasClosureSeamMarker(current) || hasClosureSeamMarker(candidate)) {
    const candidateClosureScore = scoreClosureSeamStrength(candidate)
    const currentClosureScore = scoreClosureSeamStrength(current)
    if (candidateClosureScore !== currentClosureScore)
      return candidateClosureScore > currentClosureScore ? candidate : current
  }

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  return candidate.length > current.length ? candidate : current
}

function readRuntimeProjectStateSameHerLivingLine(body: Pick<AlicizationChatMetaEvent, 'runtimeDigest' | 'digitalLifeSpine'>) {
  const sameHerSelfLine = typeof body.runtimeDigest?.projectState?.sameHerSelfLine === 'string'
    ? body.runtimeDigest.projectState.sameHerSelfLine.trim()
    : ''
  const inwardLine = typeof body.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine === 'string'
    ? body.digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.inwardLine.trim()
    : ''
  const combined = `${sameHerSelfLine} ${inwardLine}`.toLowerCase()

  const carriesSameLivingLine = (
    (combined.includes('same phase 1 digital life')
      && (combined.includes('same living line') || combined.includes('unfinished closure') || combined.includes('still-open=')))
    || ((combined.includes('continuous her') || combined.includes('one continuous her'))
      && (combined.includes('same living line') || combined.includes('unfinished closure') || combined.includes('still-open=')))
  )

  if (!carriesSameLivingLine)
    return null

  return null
}

function readRuntimeProjectEmotionalClosureSameHerLine(body: Pick<AlicizationChatMetaEvent, 'runtimeDigest'>) {
  const runtimeProjectState = body.runtimeDigest?.projectState as Record<string, unknown> | null | undefined
  const projectStateAuditEmotionalClosureSummary = (() => {
    const visibleReplyRealization = (body.runtimeDigest as Record<string, unknown> | null | undefined)?.visibleReplyRealization
    if (!visibleReplyRealization || typeof visibleReplyRealization !== 'object')
      return null
    const projectStateAudit = (visibleReplyRealization as {
      projectStateAudit?: { emotionalClosureSummary?: unknown } | null
    }).projectStateAudit
    return typeof projectStateAudit?.emotionalClosureSummary === 'string'
      ? projectStateAudit.emotionalClosureSummary.trim()
      : null
  })()
  const projectStateEmotionalClosureCue = [
    typeof runtimeProjectState?.emotionalClosureCue === 'string'
      ? runtimeProjectState.emotionalClosureCue.trim()
      : '',
    typeof runtimeProjectState?.emotionalClosureSummary === 'string'
      ? runtimeProjectState.emotionalClosureSummary.trim()
      : '',
    typeof runtimeProjectState?.sameHerHoldDetail === 'string'
      ? runtimeProjectState.sameHerHoldDetail.trim()
      : '',
    typeof runtimeProjectState?.nextClosureTarget === 'string'
      ? runtimeProjectState.nextClosureTarget.trim()
      : '',
    typeof body.runtimeDigest?.emotionalClosureCue === 'string'
      ? body.runtimeDigest.emotionalClosureCue.trim()
      : '',
    projectStateAuditEmotionalClosureSummary ?? '',
  ].reduce((current, candidate) =>
    preferRicherProjectStateAuditText({
      current,
      candidate,
    }) ?? '', '')
  if (!projectStateEmotionalClosureCue)
    return null

  const normalized = projectStateEmotionalClosureCue.toLowerCase()
  const carriesChineseMeasuredReturn = (
    (normalized.includes('同一条生命线') || normalized.includes('同一条线'))
    && (
      normalized.includes('先留白')
      || normalized.includes('低压')
      || normalized.includes('不要从头重开')
      || normalized.includes('别立刻把温度放大')
    )
  )
  const carriesMeasuredReturnLivingLine
    = (
      normalized.includes('same living line')
      || normalized.includes('same line')
      || normalized.includes('same thread')
      || normalized.includes('same-thread')
      || normalized.includes('同一条生命线')
      || normalized.includes('同一条线')
    )
    && (
      normalized.includes('low-pressure')
      || normalized.includes('lower-pressure')
      || normalized.includes('leave more room')
      || normalized.includes('do not reopen from scratch')
      || normalized.includes('without reopening from scratch')
      || normalized.includes('measured-return')
      || normalized.includes('先留白')
      || normalized.includes('低压')
      || normalized.includes('不要从头重开')
      || normalized.includes('别立刻把温度放大')
    )
  const carriesSameHerMeasuredReturn = (
    (
      (
        (normalized.includes('same-her') || normalized.includes('same her'))
        && normalized.includes('same living line')
      )
      || normalized.includes('同一条生命线')
      || normalized.includes('同一条线')
    )
    && (
      normalized.includes('low-pressure')
      || normalized.includes('lower-pressure')
      || normalized.includes('leave more room')
      || normalized.includes('do not reopen from scratch')
      || normalized.includes('without reopening from scratch')
      || normalized.includes('measured-return')
      || normalized.includes('先留白')
      || normalized.includes('低压')
      || normalized.includes('不要从头重开')
      || normalized.includes('别立刻把温度放大')
    )
  )

  if (carriesChineseMeasuredReturn)
    return projectStateEmotionalClosureCue

  if (carriesMeasuredReturnLivingLine || carriesSameHerMeasuredReturn)
    return null

  if (
    normalized.includes('repair-before-closeness')
    || normalized.includes('repair before closeness')
    || normalized.includes('先修复再靠近')
    || normalized.includes('先把身体收稳')
    || normalized.includes('修复优先')
  ) {
    return projectStateEmotionalClosureCue
  }

  if (
    normalized.includes('rest-protective')
    || normalized.includes('rest protective')
    || normalized.includes('fatigue-aware')
    || normalized.includes('protect rest')
    || normalized.includes('quiet companionship')
    || normalized.includes('休息保护')
    || normalized.includes('疲惫')
  ) {
    return projectStateEmotionalClosureCue
  }

  return null
}

function readRuntimeProjectStateAuditContinuitySummary(body: Pick<AlicizationChatMetaEvent, 'runtimeDigest'>) {
  const visibleReplyRealization = (body.runtimeDigest as Record<string, unknown> | null | undefined)?.visibleReplyRealization
  if (!visibleReplyRealization || typeof visibleReplyRealization !== 'object')
    return null

  const projectStateAudit = (visibleReplyRealization as {
    projectStateAudit?: { continuitySummary?: unknown } | null
  }).projectStateAudit
  const continuitySummary = typeof projectStateAudit?.continuitySummary === 'string'
    ? projectStateAudit.continuitySummary.trim()
    : ''
  return continuitySummary || null
}

function resolveRepairBeforeClosenessSameHerReason(
  body: Pick<AlicizationChatMetaEvent, 'runtimeDigest' | 'digitalLifeSpine' | 'embodimentScript'>,
) {
  const runtimeProjectEmotionalClosureSameHerLine = readRuntimeProjectEmotionalClosureSameHerLine(body)
  const carriesExplicitRepairFirstRestraint = body.runtimeDigest?.continuityRestraint === 'repair-before-closeness'
    || body.digitalLifeSpine?.proactive?.continuityRestraint === 'repair-before-closeness'
    || body.embodimentScript?.state?.residentMode === 'repair-before-closeness'
  if (runtimeProjectEmotionalClosureSameHerLine) {
    if (hasExplicitRepairBeforeClosenessAuthority(runtimeProjectEmotionalClosureSameHerLine))
      return runtimeProjectEmotionalClosureSameHerLine
  }

  const visibleReplyReasonCodes = readVisibleReplyReasonCodes(body)
  const carriesExecutionCallbackRoomFirstDrift = visibleReplyReasonCodes.some(code =>
    /execution-callback.*room-first|repair-before-closeness|repair-first/i.test(code),
  )
  if (!carriesExecutionCallbackRoomFirstDrift && !carriesExplicitRepairFirstRestraint)
    return null

  return null
}

function resolveResidentPresenceSnapshotFallback(
  body: Pick<AlicizationChatMetaEvent, 'runtimeDigest'>,
) {
  const snapshotBody = body as {
    initiative?: {
      preferredStyle?: string | null
      shouldSpeak?: boolean | null
      continuityRestraint?: string | null
    } | null
    residentPerformance?: {
      reasonTags?: string[] | null
    } | null
    continuityMode?: string | null
  }
  const initiative = snapshotBody.initiative ?? null
  const residentPerformanceReasonTags = Array.isArray(snapshotBody.residentPerformance?.reasonTags)
    ? snapshotBody.residentPerformance?.reasonTags ?? []
    : []
  const continuityMode = typeof snapshotBody.continuityMode === 'string'
    ? snapshotBody.continuityMode
    : null
  const lowerPressureResidentMode
    = residentPerformanceReasonTags.includes('repair-before-closeness')
      || residentPerformanceReasonTags.includes('rest-protective')
      || residentPerformanceReasonTags.includes('measured-return')
      || initiative?.continuityRestraint === 'repair-before-closeness'
      || initiative?.continuityRestraint === 'rest-protective'
      || initiative?.continuityRestraint === 'measured-return'

  return {
    operatingMode: lowerPressureResidentMode || continuityMode === 'quiet-accompaniment'
      ? 'resident-presence'
      : null,
    preferredStyle: typeof initiative?.preferredStyle === 'string' && initiative.preferredStyle.trim()
      ? initiative.preferredStyle.trim()
      : null,
    shouldSpeak: typeof initiative?.shouldSpeak === 'boolean'
      ? initiative.shouldSpeak
      : null,
  }
}

function isProjectClosureReason(raw: string | null | undefined) {
  if (typeof raw !== 'string' || !raw.trim())
    return false

  const normalized = raw.trim().toLowerCase()
  return normalized.includes('desktop closure')
    || normalized.includes('runtime_personhood')
    || normalized.includes('phase1-route=desktop-life-loop')
    || normalized.includes('same-digital-life-project-thread')
}

function isSameHerProjectClosureLine(raw: string | null | undefined) {
  if (typeof raw !== 'string' || !raw.trim())
    return false

  const normalized = raw.trim().toLowerCase()
  const carriesPhase1Identity
    = normalized.includes('same phase 1 digital life')
      || normalized.includes('local-first digital life')
      || normalized.includes('runtime_personhood')
      || normalized.includes('project_state_review')
      || normalized.includes('continuity_identity')
      || normalized.includes('same-digital-life-project-thread')
      || normalized.includes('same-her')
      || normalized.includes('same her')
      || normalized.includes('continuous her')
      || normalized.includes('one continuous her')
  const carriesLivingLineClosure
    = normalized.includes('same living line')
      || normalized.includes('continuity_line')
      || normalized.includes('continuity_hold=measured_return')
      || normalized.includes('unresolved_closure=')
      || normalized.includes('unfinished closure')
      || normalized.includes('still needs')
      || normalized.includes('still need')
      || normalized.includes('settling on the same living line')
      || normalized.includes('body line should keep settling')
      || normalized.includes('keep settling')
      || normalized.includes('generic assistant shell')
      || normalized.includes('project-summary voice')
      || normalized.includes('detached status talk')
      || normalized.includes('continuity drift')
      || normalized.includes('drift rather than completion')

  return carriesPhase1Identity && carriesLivingLineClosure
}

function isSameHerProjectClosureAuthority(raw: string | null | undefined) {
  if (isSameHerProjectClosureLine(raw))
    return true

  if (typeof raw !== 'string' || !raw.trim())
    return false

  const normalized = raw.trim().toLowerCase()
  const carriesNamedSameHerHold
    = normalized.includes('continuity hold:')
      || normalized.includes('generic project continuity hold')
      || normalized.includes('continuity_hold=')
  const carriesMeasuredReturnAuthority
    = normalized.includes('same remembered seam')
      || normalized.includes('remembered seam')
      || normalized.includes('leave more room')
      || normalized.includes('keep more room')
      || normalized.includes('same eagerness')
      || normalized.includes('too eagerly')
      || normalized.includes('measured-return')
      || normalized.includes('lower-pressure')
      || normalized.includes('without reopening from scratch')
      || normalized.includes('do not reopen from scratch')
  const carriesSameLivingLineAuthority
    = normalized.includes('same living line')
      || normalized.includes('continuity_line')
      || normalized.includes('direction=inward')
      || normalized.includes('same line')
      || normalized.includes('same thread')
      || normalized.includes('same-thread')

  return carriesNamedSameHerHold || (carriesSameLivingLineAuthority && carriesMeasuredReturnAuthority)
}

function isSpecificMeasuredReturnSameHerAuthority(raw: string | null | undefined) {
  if (typeof raw !== 'string' || !raw.trim())
    return false

  const normalized = raw.trim().toLowerCase()
  return normalized.includes('same remembered seam')
    || normalized.includes('remembered seam')
    || normalized.includes('leave more room')
    || normalized.includes('keep more room')
    || normalized.includes('same eagerness')
    || normalized.includes('too eagerly')
    || normalized.includes('measured-return')
    || normalized.includes('continuity_hold=measured_return')
    || normalized.includes('lower-pressure')
    || normalized.includes('pressure=lower')
    || normalized.includes('without reopening from scratch')
    || normalized.includes('do not reopen from scratch')
}

function isCompactProjectRouteCarry(raw: string | null | undefined) {
  if (typeof raw !== 'string' || !raw.trim())
    return false

  const normalized = raw.trim().toLowerCase()
  return normalized.includes('same-digital-life-project-thread')
    && normalized.includes('phase1-route=desktop-life-loop')
    && normalized.includes('unresolved=')
}

function resolvePreferredProjectContinuityCue(body: Pick<AlicizationChatMetaEvent, 'runtimeDigest' | 'digitalLifeSpine'>) {
  const explicitProjectContinuityCue = typeof body.runtimeDigest?.projectState?.continuityCue === 'string'
    && body.runtimeDigest.projectState.continuityCue.trim()
    ? body.runtimeDigest.projectState.continuityCue.trim()
    : null
  const explicitSameHerProjectClosureCue = [
    typeof body.runtimeDigest?.projectState?.sameHerHoldDetail === 'string'
      ? body.runtimeDigest.projectState.sameHerHoldDetail.trim()
      : '',
    typeof body.runtimeDigest?.projectState?.nextClosureTarget === 'string'
      ? body.runtimeDigest.projectState.nextClosureTarget.trim()
      : '',
    typeof body.runtimeDigest?.projectState?.sameHerSelfLine === 'string'
      ? body.runtimeDigest.projectState.sameHerSelfLine.trim()
      : '',
    typeof body.runtimeDigest?.projectState?.sameHerDriftRisk === 'string'
      ? body.runtimeDigest.projectState.sameHerDriftRisk.trim()
      : '',
    typeof body.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine === 'string'
      ? body.digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.inwardLine.trim()
      : '',
    typeof body.digitalLifeSpine?.selfAuthority?.inwardLine === 'string'
      ? body.digitalLifeSpine.selfAuthority.inwardLine.trim()
      : '',
    typeof body.digitalLifeSpine?.embodiment?.autobiographicalSelf?.identityNarrative === 'string'
      ? body.digitalLifeSpine.embodiment.autobiographicalSelf.identityNarrative.trim()
      : '',
    typeof body.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine === 'string'
      ? body.digitalLifeSpine.embodiment.autobiographicalSelf.relationshipDoctrine.trim()
      : '',
  ].find(candidate => isSameHerProjectClosureAuthority(candidate)) ?? null
  if (explicitSameHerProjectClosureCue)
    return explicitSameHerProjectClosureCue
  if (explicitProjectContinuityCue && isProjectClosureReason(explicitProjectContinuityCue))
    return explicitProjectContinuityCue

  const continuitySignalSummary = typeof body.digitalLifeSpine?.continuitySignal?.summary === 'string'
    ? body.digitalLifeSpine.continuitySignal.summary.trim()
    : ''
  if (continuitySignalSummary.toLowerCase().includes('later desktop closure seam after scene hop'))
    return 'Phase 1 desktop closure is still live across scene hops'

  return explicitProjectContinuityCue
}

function resolveContinuityReasonSummary(
  body: Pick<AlicizationChatMetaEvent, 'runtimeDigest' | 'digitalLifeSpine'>,
  continuityTiming: string | null,
  companionshipMode?: string | null,
) {
  const looksLikeSceneContaminatedSameHerReason = (value: string | null | undefined) => {
    if (typeof value !== 'string')
      return false

    const normalized = value.trim()
    if (!normalized)
      return false

    const lowered = normalized.toLowerCase()
    const carriesSameHerProjectBaseline
      = lowered.includes('same phase 1 digital life')
        || lowered.includes('same living line')
        || lowered.includes('continuous her')
        || lowered.includes('one continuous her')
    const carriesSceneNarration
      = /宿主正在|host is|runtime\.ts|callback result seam|foreground|scene|window|screen/u.test(normalized)

    return carriesSameHerProjectBaseline && carriesSceneNarration
  }
  const embodimentAuthoritySummary = body.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority?.authoritySummary ?? null
  const embodimentCurrentBodyState = body.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority?.currentBodyState ?? null
  const embodimentClosureReminder = describeAlicizationEmbodimentClosureReminder({
    authoritySummary: embodimentAuthoritySummary,
    currentBodyState: embodimentCurrentBodyState,
  }) || null
  const withEmbodimentClosure = (reason: string | null | undefined) => {
    const sanitizedReason = sanitizeStreamMetaContinuityReason(reason)
    const sanitizedClosure = sanitizeStreamMetaContinuityReason(embodimentClosureReminder)
    if (sanitizedReason && sanitizedClosure)
      return `${sanitizedReason} | ${sanitizedClosure}`
    return sanitizedReason || sanitizedClosure || null
  }
  const sameHerInwardCarry = readSameHerInwardCarry(body)
  const runtimeProjectStateSameHerLivingLine = readRuntimeProjectStateSameHerLivingLine(body)
  const runtimeProjectEmotionalClosureSameHerLine = readRuntimeProjectEmotionalClosureSameHerLine(body)
  const rememberedSeamReopen = detectRememberedSeamCompanionshipReopen({
    digitalLifeSpineDigest: body.digitalLifeSpine ?? null,
  })
  const explicitProjectContinuityCue = resolvePreferredProjectContinuityCue(body)
  const explicitSameHerProjectClosureCue = isSameHerProjectClosureLine(explicitProjectContinuityCue)
    ? explicitProjectContinuityCue
    : null
  const continuityReasonTags = readResidentContinuityReasonTags(body)
  const rememberedSeamMoreRoomReason = hasRememberedSeamMoreRoomReasonTag(continuityReasonTags)
    ? resolveAlicizationCompanionshipReasonSummary({
        residentMode: companionshipMode ?? null,
        digitalLifeSpineDigest: body.digitalLifeSpine ?? null,
        projectState: body.runtimeDigest?.projectState ?? null,
        reasonTags: continuityReasonTags,
      })
    : null
  const rememberedSeamSpecificCompanionshipReason = companionshipMode === 'measured-return'
    ? resolveAlicizationCompanionshipReasonSummary({
        residentMode: companionshipMode,
        digitalLifeSpineDigest: body.digitalLifeSpine ?? null,
        projectState: body.runtimeDigest?.projectState ?? null,
        reasonTags: continuityReasonTags,
      })
    : null
  const carriesRememberedSeamSpecificCompanionshipReason
    = typeof rememberedSeamSpecificCompanionshipReason === 'string'
      && /remembered seam|too eagerly|same eagerness/u.test(rememberedSeamSpecificCompanionshipReason)
  const shouldPreferCanonicalMeasuredReturnProjectClosure
    = companionshipMode === 'measured-return'
      && continuityTiming === 'next-open-window'
      && !rememberedSeamReopen
      && (
        body.runtimeDigest?.projectState?.continuityArcStage === 'same-thread-continuation'
        || body.runtimeDigest?.currentConsciousFrame?.continuityArcStage === 'same-thread-continuation'
        || body.digitalLifeSpine?.runtime?.continuityArcStage === 'same-thread-continuation'
      )
      && (
        body.runtimeDigest?.continuityRestraint === 'measured-return'
        || body.digitalLifeSpine?.proactive?.continuityRestraint === 'measured-return'
      )
  if (carriesRememberedSeamSpecificCompanionshipReason) {
    return withEmbodimentClosure(rememberedSeamSpecificCompanionshipReason)
  }
  const inwardSameHerCompanionshipMode = companionshipMode === 'measured-return'
    || companionshipMode === 'quiet-accompaniment'
  if (inwardSameHerCompanionshipMode && !rememberedSeamReopen) {
    if (companionshipMode === 'measured-return' && rememberedSeamMoreRoomReason) {
      return withEmbodimentClosure(rememberedSeamMoreRoomReason)
    }
    const normalizedSameHerInwardCarry = looksLikeSceneContaminatedSameHerReason(sameHerInwardCarry)
      ? null
      : sameHerInwardCarry
    const explicitSameHerProjectReason = [
      normalizedSameHerInwardCarry,
      typeof body.runtimeDigest?.projectState?.sameHerHoldDetail === 'string'
        ? body.runtimeDigest.projectState.sameHerHoldDetail.trim()
        : '',
      typeof body.runtimeDigest?.projectState?.nextClosureTarget === 'string'
        ? body.runtimeDigest.projectState.nextClosureTarget.trim()
        : '',
      typeof body.runtimeDigest?.projectState?.sameHerSelfLine === 'string'
        ? body.runtimeDigest.projectState.sameHerSelfLine.trim()
        : '',
      typeof body.runtimeDigest?.projectState?.sameHerDriftRisk === 'string'
        ? body.runtimeDigest.projectState.sameHerDriftRisk.trim()
        : '',
      typeof body.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine === 'string'
        ? body.digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.inwardLine.trim()
        : '',
      typeof body.digitalLifeSpine?.selfAuthority?.inwardLine === 'string'
        ? body.digitalLifeSpine.selfAuthority.inwardLine.trim()
        : '',
    ].find(candidate => isSameHerProjectClosureAuthority(candidate)) ?? null
    const preferredProjectContinuityReason = (explicitProjectContinuityCue && isProjectClosureReason(explicitProjectContinuityCue)
      ? explicitProjectContinuityCue
      : null) ?? explicitProjectContinuityCue
    const shouldKeepExplicitProjectCue
      = Boolean(preferredProjectContinuityReason)
        && !isCompactProjectRouteCarry(preferredProjectContinuityReason)
        && !explicitSameHerProjectClosureCue
    const preferredSameHerReason = shouldKeepExplicitProjectCue
      ? preferredProjectContinuityReason
      : (explicitSameHerProjectClosureCue
        ?? (isCompactProjectRouteCarry(preferredProjectContinuityReason)
          ? preferredProjectContinuityReason
          : explicitSameHerProjectReason)
        ?? runtimeProjectStateSameHerLivingLine
        ?? runtimeProjectEmotionalClosureSameHerLine
        ?? normalizedSameHerInwardCarry
        ?? preferredProjectContinuityReason)
    const normalizedPreferredSameHerReason = looksLikeSceneContaminatedSameHerReason(preferredSameHerReason)
      ? (shouldKeepExplicitProjectCue
          ? preferredProjectContinuityReason
          : (explicitSameHerProjectClosureCue
            ?? (isCompactProjectRouteCarry(preferredProjectContinuityReason)
              ? preferredProjectContinuityReason
              : explicitSameHerProjectReason))
            ?? preferredProjectContinuityReason
            ?? runtimeProjectStateSameHerLivingLine
            ?? runtimeProjectEmotionalClosureSameHerLine
            ?? normalizedSameHerInwardCarry)
      : preferredSameHerReason
    if (shouldPreferCanonicalMeasuredReturnProjectClosure && runtimeProjectStateSameHerLivingLine) {
      return withEmbodimentClosure(runtimeProjectStateSameHerLivingLine)
    }
    if (normalizedPreferredSameHerReason) {
      return withEmbodimentClosure(normalizedPreferredSameHerReason)
    }
  }
  const hasCompanionshipSpineEvidence
    = body.digitalLifeSpine?.proactive?.personaBias?.manifestationCadenceSummary
      || body.digitalLifeSpine?.proactive?.personaBias?.openingGuidance
      || body.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine
      || body.digitalLifeSpine?.outcomeLearning?.latestInflection
      || body.digitalLifeSpine?.memory?.selfEvolution?.relationshipDoctrine
      || body.digitalLifeSpine?.memory?.selfEvolution?.relationshipCadenceSummary
      || body.digitalLifeSpine?.memory?.selfEvolution?.latestInflection
      || body.digitalLifeSpine?.memory?.selfEvolution?.trustMeaning
      || body.digitalLifeSpine?.memory?.selfEvolution?.summary
      || runtimeProjectEmotionalClosureSameHerLine
      || runtimeProjectStateSameHerLivingLine
  const companionshipReason = hasCompanionshipSpineEvidence
    ? resolveAlicizationCompanionshipReasonSummary({
        residentMode: companionshipMode ?? null,
        digitalLifeSpineDigest: body.digitalLifeSpine ?? null,
        projectState: body.runtimeDigest?.projectState ?? null,
        reasonTags: continuityReasonTags,
      })
    : null
  if (companionshipReason) {
    return withEmbodimentClosure(companionshipReason)
  }

  if (!continuityTiming)
    return withEmbodimentClosure(null)

  const preflightSummary = body.runtimeDigest?.projectState?.preflightSummary ?? null
  const cue = explicitProjectContinuityCue
  if (typeof cue === 'string' && cue.trim() && isProjectClosureReason(cue)) {
    return withEmbodimentClosure(cue.trim())
  }
  if (sameHerInwardCarry) {
    return withEmbodimentClosure(sameHerInwardCarry)
  }
  if (runtimeProjectEmotionalClosureSameHerLine) {
    return withEmbodimentClosure(runtimeProjectEmotionalClosureSameHerLine)
  }
  if (runtimeProjectStateSameHerLivingLine) {
    return withEmbodimentClosure(runtimeProjectStateSameHerLivingLine)
  }
  if (typeof cue === 'string' && cue.trim()) {
    return withEmbodimentClosure(cue.trim())
  }
  if (typeof preflightSummary === 'string' && preflightSummary.trim()) {
    return withEmbodimentClosure(preflightSummary.trim())
  }
  return withEmbodimentClosure(null)
}

function shouldPromoteMeasuredReturnProjectClosureVoiceFallback(input: {
  body: Pick<AlicizationChatMetaEvent, 'runtimeDigest' | 'digitalLifeSpine'>
  companionshipMode?: string | null
  continuityTiming?: string | null
  continuityReasonSummary?: string | null
}) {
  if (input.companionshipMode !== 'measured-return')
    return false
  if (input.continuityTiming !== 'next-open-window')
    return false
  if (!isStructuredMeasuredReturnInwardCarry(input.continuityReasonSummary))
    return false

  return (
    input.body.runtimeDigest?.projectState?.continuityArcStage === 'same-thread-continuation'
    || input.body.runtimeDigest?.currentConsciousFrame?.continuityArcStage === 'same-thread-continuation'
    || input.body.digitalLifeSpine?.runtime?.continuityArcStage === 'same-thread-continuation'
  ) && (
    input.body.runtimeDigest?.continuityRestraint === 'measured-return'
    || input.body.digitalLifeSpine?.proactive?.continuityRestraint === 'measured-return'
  )
}

function shouldOverrideVisibleSegmentVoiceWithMeasuredReturnProjectClosure(input: {
  lastVoiceSummary?: string | null
  continuityReasonSummary?: string | null
  companionshipMode?: string | null
  continuityTiming?: string | null
  body: Pick<AlicizationChatMetaEvent, 'runtimeDigest' | 'digitalLifeSpine'>
}) {
  if (!input.lastVoiceSummary?.includes('src=prosody-authority'))
    return false
  if (!input.lastVoiceSummary.includes('cadence=0.38'))
    return false
  return shouldPromoteMeasuredReturnProjectClosureVoiceFallback({
    body: input.body,
    companionshipMode: input.companionshipMode,
    continuityTiming: input.continuityTiming,
    continuityReasonSummary: input.continuityReasonSummary,
  })
}

function shouldOverrideVisibleSegmentWithRepairBeforeClosenessProjectAuthority(input: {
  continuityReasonSummary?: string | null
  companionshipMode?: string | null
  continuityTiming?: string | null
  body: Pick<AlicizationChatMetaEvent, 'runtimeDigest' | 'digitalLifeSpine'>
  lastVisibleSegmentFrame: AlicizationChatMetaDigitalLifeFrame | null | undefined
  lastSegment: AlicizationChatMetaSpeechTimelineSegment | null | undefined
}) {
  if (input.companionshipMode !== 'repair-before-closeness')
    return false
  if (input.continuityTiming !== 'next-open-window')
    return false
  if (!input.continuityReasonSummary)
    return false
  if (!/repair-before-closeness|repair before closeness|先修复再靠近|先把身体收稳|修复优先/u.test(input.continuityReasonSummary))
    return false
  const frameResidentMode = input.lastVisibleSegmentFrame?.face.rendererHints?.residentMode
    ?? input.lastVisibleSegmentFrame?.action.rendererHints?.residentMode
    ?? input.lastSegment?.rendererHints?.residentMode
    ?? null
  if (frameResidentMode !== 'measured-return')
    return false

  return hasRepairBeforeClosenessSummaryAuthority({
    runtimeDigest: input.body.runtimeDigest,
  })
}

function resolveVoiceAuthoritySource(input: {
  segmentId: string | null
  embodimentScript: AlicizationChatMetaEvent['embodimentScript'] | null | undefined
  fallbackIndex?: number | null
}) {
  const faceCue = resolveFaceCueForSegment({
    segmentId: input.segmentId,
    embodimentScript: input.embodimentScript,
    fallbackIndex: input.fallbackIndex,
  })
  if (typeof faceCue?.source === 'string' && faceCue.source.trim())
    return faceCue.source.trim()

  const lipsyncHint = resolveLipsyncHintForSegment({
    segmentId: input.segmentId,
    embodimentScript: input.embodimentScript,
    fallbackIndex: input.fallbackIndex,
  })
  if (typeof lipsyncHint?.source === 'string' && lipsyncHint.source.trim())
    return lipsyncHint.source.trim()

  return null
}

function shouldPromoteLipSyncContinuityForCueBridgeRealignment(input: {
  lastVisibleSegmentFrame: AlicizationChatMetaDigitalLifeFrame | null | undefined
  lastSegment: AlicizationChatMetaSpeechTimelineSegment | null | undefined
  lastFaceCue: ReturnType<typeof resolveFaceCueForSegment>
}) {
  if (!input.lastVisibleSegmentFrame || input.lastFaceCue?.source !== 'cue-bridge')
    return false

  if (input.lastVisibleSegmentFrame.lipSync.mode !== 'energy-phoneme-hybrid')
    return false

  const holdMs = Number(input.lastVisibleSegmentFrame.lipSync.continuityHoldMs)
  if (!Number.isFinite(holdMs) || holdMs < 320)
    return false

  const faceResidentMode = input.lastVisibleSegmentFrame.face.rendererHints?.residentMode
  const actionResidentMode = input.lastVisibleSegmentFrame.action.rendererHints?.residentMode
  const segmentResidentMode = input.lastSegment?.rendererHints?.residentMode
  const carriesLowerPressureSameHerLine
    = faceResidentMode === 'measured-return'
      || faceResidentMode === 'repair-before-closeness'
      || actionResidentMode === 'measured-return'
      || actionResidentMode === 'repair-before-closeness'
      || segmentResidentMode === 'measured-return'
      || segmentResidentMode === 'repair-before-closeness'
  if (!carriesLowerPressureSameHerLine) {
    return false
  }

  return true
}

function resolveResidentPresenceSummary(body: Pick<AlicizationChatMetaEvent, 'digitalLifeSpine' | 'runtimeDigest' | 'embodimentScript' | 'speechTimeline' | 'digitalLife'>) {
  const digitalLife = resolveAuthoritativeChatMetaDigitalLife(body)
  if ((body.speechTimeline?.segments.length ?? 0) > 0)
    return null

  if ((digitalLife?.frames.length ?? 0) > 0)
    return null

  const continuityLine = body.digitalLifeSpine?.continuitySignal?.summary?.trim() ?? ''
  const residentSnapshotFallback = resolveResidentPresenceSnapshotFallback(body)
  const operatingMode = body.digitalLifeSpine?.architecture?.operatingMode
    ?? residentSnapshotFallback.operatingMode
    ?? null
  const architectureSummary = body.digitalLifeSpine?.architecture?.summary?.trim() ?? ''
  const preferredStyle = body.digitalLifeSpine?.proactive?.preferredStyle
    ?? residentSnapshotFallback.preferredStyle
    ?? null
  const shouldSpeak = body.digitalLifeSpine?.proactive?.shouldSpeak
    ?? body.runtimeDigest?.shouldProactivelySpeak
    ?? residentSnapshotFallback.shouldSpeak
    ?? null
  const continuityArcStage = body.runtimeDigest?.activeLoop?.continuityArcStage ?? body.runtimeDigest?.projectState?.continuityArcStage ?? null
  const preferredTiming = resolveContinuityTiming({
    runtimeDigest: body.runtimeDigest,
  })
  const visibleReplyReasonCodes = readVisibleReplyReasonCodes(body)
  const carriesExplicitRepairFirstRestraint = body.runtimeDigest?.continuityRestraint === 'repair-before-closeness'
    || body.digitalLifeSpine?.proactive?.continuityRestraint === 'repair-before-closeness'
    || body.embodimentScript?.state?.residentMode === 'repair-before-closeness'
  const carriesRepairFirstPresenceDrift = visibleReplyReasonCodes.some(code =>
    /execution-callback.*room-first|repair-before-closeness|repair-first/i.test(code),
  )
  const explicitProjectContinuityCue = typeof body.runtimeDigest?.projectState?.continuityCue === 'string'
    && body.runtimeDigest.projectState.continuityCue.trim()
    ? body.runtimeDigest.projectState.continuityCue.trim()
    : null
  const sameHerInwardCarry = readSameHerInwardCarry(body)
  const repairBeforeClosenessSameHerReason = resolveRepairBeforeClosenessSameHerReason(body)
  const runtimeProjectStateAuditContinuitySummary = readRuntimeProjectStateAuditContinuitySummary(body)
  const runtimeProjectEmotionalClosureSameHerLine = readRuntimeProjectEmotionalClosureSameHerLine(body)
  const restProtectiveSameHerReason
    = runtimeProjectEmotionalClosureSameHerLine
      && /rest-protective|rest protective|fatigue-aware|protect rest|quiet companionship|休息保护|疲惫/u.test(runtimeProjectEmotionalClosureSameHerLine)
      ? runtimeProjectEmotionalClosureSameHerLine
      : null
  const runtimeProjectStateSameHerLivingLine = readRuntimeProjectStateSameHerLivingLine(body)
  const explicitSameHerProjectReason = [
    runtimeProjectStateAuditContinuitySummary,
    sameHerInwardCarry,
    typeof body.runtimeDigest?.projectState?.sameHerHoldDetail === 'string'
      ? body.runtimeDigest.projectState.sameHerHoldDetail.trim()
      : '',
    typeof body.runtimeDigest?.projectState?.nextClosureTarget === 'string'
      ? body.runtimeDigest.projectState.nextClosureTarget.trim()
      : '',
    typeof body.runtimeDigest?.projectState?.sameHerSelfLine === 'string'
      ? body.runtimeDigest.projectState.sameHerSelfLine.trim()
      : '',
    typeof body.runtimeDigest?.projectState?.sameHerDriftRisk === 'string'
      ? body.runtimeDigest.projectState.sameHerDriftRisk.trim()
      : '',
    typeof body.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine === 'string'
      ? body.digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.inwardLine.trim()
      : '',
    typeof body.digitalLifeSpine?.selfAuthority?.inwardLine === 'string'
      ? body.digitalLifeSpine.selfAuthority.inwardLine.trim()
      : '',
    typeof body.digitalLifeSpine?.embodiment?.autobiographicalSelf?.identityNarrative === 'string'
      ? body.digitalLifeSpine.embodiment.autobiographicalSelf.identityNarrative.trim()
      : '',
    typeof body.digitalLifeSpine?.embodiment?.autobiographicalSelf?.relationshipDoctrine === 'string'
      ? body.digitalLifeSpine.embodiment.autobiographicalSelf.relationshipDoctrine.trim()
      : '',
  ].find(candidate => isSameHerProjectClosureAuthority(candidate)) ?? null
  const carriesExplicitRestProtectiveRestraint = body.runtimeDigest?.continuityRestraint === 'rest-protective'
    || body.digitalLifeSpine?.proactive?.continuityRestraint === 'rest-protective'
  const defaultContinuityReason = runtimeProjectStateAuditContinuitySummary
    ?? explicitSameHerProjectReason
    ?? sameHerInwardCarry
    ?? repairBeforeClosenessSameHerReason
    ?? runtimeProjectEmotionalClosureSameHerLine
    ?? runtimeProjectStateSameHerLivingLine
    ?? (explicitProjectContinuityCue || (typeof body.runtimeDigest?.projectState?.preflightSummary === 'string'
      && body.runtimeDigest.projectState.preflightSummary.trim()
      ? body.runtimeDigest.projectState.preflightSummary.trim()
      : null))
  const continuityReason = carriesExplicitRepairFirstRestraint || carriesRepairFirstPresenceDrift
    ? (repairBeforeClosenessSameHerReason
      ?? runtimeProjectStateAuditContinuitySummary
      ?? explicitSameHerProjectReason
      ?? sameHerInwardCarry
      ?? runtimeProjectEmotionalClosureSameHerLine
      ?? runtimeProjectStateSameHerLivingLine
      ?? (explicitProjectContinuityCue || (typeof body.runtimeDigest?.projectState?.preflightSummary === 'string'
        && body.runtimeDigest.projectState.preflightSummary.trim()
        ? body.runtimeDigest.projectState.preflightSummary.trim()
        : null)))
    : carriesExplicitRestProtectiveRestraint || restProtectiveSameHerReason
      ? (restProtectiveSameHerReason
        ?? runtimeProjectStateAuditContinuitySummary
        ?? explicitSameHerProjectReason
        ?? sameHerInwardCarry
        ?? runtimeProjectEmotionalClosureSameHerLine
        ?? runtimeProjectStateSameHerLivingLine
        ?? (explicitProjectContinuityCue || (typeof body.runtimeDigest?.projectState?.preflightSummary === 'string'
          && body.runtimeDigest.projectState.preflightSummary.trim()
          ? body.runtimeDigest.projectState.preflightSummary.trim()
          : null)))
      : defaultContinuityReason
  const residentReasonTags = readResidentContinuityReasonTags(body)
  const carriesExplicitSameHerInwardResidentTag = residentReasonTags.some(tag => typeof tag === 'string' && tag.trim().toLowerCase() === 'same-her-inward-carry')
  const residentTimingCompanionshipReason = (residentMode: string | null) => {
    if (!residentMode)
      return null

    return resolveAlicizationCompanionshipReasonSummary({
      residentMode,
      digitalLifeSpineDigest: body.digitalLifeSpine ?? null,
      projectState: body.runtimeDigest?.projectState ?? null,
      reasonTags: residentReasonTags,
    })
  }
  const carriesMemorySelfEvolutionSameHerCadence = Boolean(
    (typeof body.digitalLifeSpine?.memory?.selfEvolution?.relationshipDoctrine === 'string'
      && body.digitalLifeSpine.memory.selfEvolution.relationshipDoctrine.trim())
    || (typeof body.digitalLifeSpine?.memory?.selfEvolution?.relationshipCadenceSummary === 'string'
      && body.digitalLifeSpine.memory.selfEvolution.relationshipCadenceSummary.trim())
    || (typeof body.digitalLifeSpine?.memory?.selfEvolution?.latestInflection === 'string'
      && body.digitalLifeSpine.memory.selfEvolution.latestInflection.trim())
    || (typeof body.digitalLifeSpine?.memory?.selfEvolution?.trustMeaning === 'string'
      && body.digitalLifeSpine.memory.selfEvolution.trustMeaning.trim())
    || (typeof body.digitalLifeSpine?.memory?.selfEvolution?.summary === 'string'
      && body.digitalLifeSpine.memory.selfEvolution.summary.trim()),
  )
  const inwardLine = typeof body.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine === 'string'
    ? body.digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.inwardLine.trim()
    : ''
  const hasExplicitSameHerInwardAuthority = Boolean(
    sameHerInwardCarry
    || explicitSameHerProjectReason
    || inwardLine,
  )
  const carriesSpecificMeasuredReturnSameHerAuthority = Boolean(
    (body.runtimeDigest?.continuityRestraint === 'measured-return'
      || body.digitalLifeSpine?.proactive?.continuityRestraint === 'measured-return')
    && (
      isSpecificMeasuredReturnSameHerAuthority(explicitSameHerProjectReason)
      || isSpecificMeasuredReturnSameHerAuthority(runtimeProjectEmotionalClosureSameHerLine)
      || isSpecificMeasuredReturnSameHerAuthority(body.runtimeDigest?.projectState?.sameHerHoldDetail ?? null)
    ),
  )
  const shouldPreferQuietAccompanimentResidentMode = Boolean(
    !carriesExplicitRepairFirstRestraint
    && !carriesRepairFirstPresenceDrift
    && !carriesSpecificMeasuredReturnSameHerAuthority
    && (
      carriesExplicitSameHerInwardResidentTag
      || (
        operatingMode === 'resident-presence'
        && preferredStyle === 'silent-observe'
        && hasExplicitSameHerInwardAuthority
      )
      || (
        (body.embodimentScript?.state?.residentMode === 'quiet-companionship'
          || body.embodimentScript?.state?.residentMode === 'quiet-accompaniment')
        && hasExplicitSameHerInwardAuthority
      )
    ),
  )
  const residentMode = body.embodimentScript?.state?.residentMode
    ?? (carriesExplicitRepairFirstRestraint
      ? 'repair-before-closeness'
      : null)
    ?? (carriesRepairFirstPresenceDrift
      ? 'repair-before-closeness'
      : null)
    ?? (repairBeforeClosenessSameHerReason
      ? 'repair-before-closeness'
      : null)
    ?? (carriesExplicitRestProtectiveRestraint || restProtectiveSameHerReason
      ? 'rest-protective'
      : null)
    ?? (shouldPreferQuietAccompanimentResidentMode
      ? 'quiet-accompaniment'
      : null)
    ?? (
      continuityLine.includes('measured-return')
      || architectureSummary.includes('measured-return')
      || preferredStyle === 'silent-observe'
      || (operatingMode === 'resident-presence' && continuityArcStage === 'same-thread-continuation')
        ? 'measured-return'
        : null
    )
  const residentCompanionshipReason = residentTimingCompanionshipReason(residentMode)
  const carriesCanonicalSameHerInwardResidentReason = typeof residentCompanionshipReason === 'string'
    && isStructuredMeasuredReturnInwardCarry(residentCompanionshipReason)
  const finerResidentTimingReason = hasRememberedSeamMoreRoomReasonTag(residentReasonTags)
    ? residentCompanionshipReason
    : null
  const shouldPreferFinerResidentTimingReason = Boolean(
    finerResidentTimingReason
    && continuityReason
    && !carriesExplicitRepairFirstRestraint
    && !carriesRepairFirstPresenceDrift
    && (
      continuityReason === explicitProjectContinuityCue
      || isCompactProjectRouteCarry(continuityReason)
      || continuityReason === body.runtimeDigest?.projectState?.preflightSummary?.trim()
    ),
  )
  const shouldPreferSelfEvolutionSameHerResidentReason = Boolean(
    residentCompanionshipReason
    && continuityReason
    && residentMode === 'measured-return'
    && !carriesExplicitRepairFirstRestraint
    && !carriesRepairFirstPresenceDrift
    && isCompactProjectRouteCarry(continuityReason)
    && carriesMemorySelfEvolutionSameHerCadence
    && carriesCanonicalSameHerInwardResidentReason,
  )
  const preferredContinuityReason = shouldPreferFinerResidentTimingReason || shouldPreferSelfEvolutionSameHerResidentReason
    ? residentCompanionshipReason
    : continuityReason
  const sanitizedPreferredContinuityReason = sanitizeStreamMetaContinuityReason(preferredContinuityReason)

  if (!continuityLine && !continuityArcStage && operatingMode !== 'resident-presence')
    return null

  return [
    operatingMode ? `presence=${operatingMode}` : null,
    continuityArcStage ? `thread=${continuityArcStage}` : null,
    residentMode ? `mode=${residentMode}` : null,
    preferredStyle ? `style=${preferredStyle}` : null,
    typeof shouldSpeak === 'boolean' ? `speak=${shouldSpeak ? 'true' : 'false'}` : null,
    preferredTiming ? `timing=${preferredTiming}` : null,
    sanitizedPreferredContinuityReason ? `reason=${sanitizedPreferredContinuityReason}` : null,
    continuityLine ? `line=${continuityLine}` : null,
  ].filter((value): value is string => Boolean(value)).join(' | ') || null
}

function shouldProjectEmbodimentFallbackSummaries(body: Pick<AlicizationChatMetaEvent, 'embodiment' | 'embodimentScript' | 'digitalLife' | 'runtimeDigest' | 'speechTimeline'>) {
  const digitalLife = resolveAuthoritativeChatMetaDigitalLife(body)
  if (body.speechTimeline?.segments.length || digitalLife?.frames.length)
    return false

  if (!body.embodiment)
    return false

  if (body.runtimeDigest?.shouldProactivelySpeak !== true) {
    const restraint = body.runtimeDigest?.continuityRestraint ?? null
    if (
      restraint === 'measured-return'
      || restraint === 'repair-before-closeness'
      || restraint === 'lower-pressure'
    ) {
      return false
    }
  }

  return body.runtimeDigest?.shouldProactivelySpeak === true
}

function shouldProjectResidentPresenceFallbackSummaries(body: Pick<AlicizationChatMetaEvent, 'digitalLifeSpine' | 'runtimeDigest' | 'speechTimeline' | 'digitalLife' | 'embodimentScript'>) {
  const digitalLife = resolveAuthoritativeChatMetaDigitalLife(body)
  if (body.speechTimeline?.segments.length || digitalLife?.frames.length)
    return false

  const inwardReason
    = typeof body.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine === 'string'
      ? body.digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.inwardLine.trim()
      : ''
  const residentTags = Array.isArray(body.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags)
    ? body.digitalLifeSpine.memory.personStateProjection.selfContinuityAuthority.sourceTags
    : []
  const residentPerformanceReason
    = typeof body.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority?.authoritySummary === 'string'
      ? body.runtimeDigest.currentConsciousFrame.selfContinuityAuthority.authoritySummary.trim()
      : ''

  return Boolean(
    body.digitalLifeSpine?.proactive?.selectedAction === 'wait'
    && (
      residentTags.includes('same-her-inward-carry')
      || /same-her continuity remains inward|reopen later|same living line inward|rest-protective|fatigue-aware/u.test(residentPerformanceReason)
      || /later opening|same living line inward|measured-return|rest-protective|fatigue-aware/u.test(inwardReason)
    ),
  )
}

function buildPreDialogueAwarenessFromRuntimeDigest(
  runtimeDigest: AlicizationRuntimeDigest | null | undefined,
): AlicizationChatMetaEvent['preDialogueAwareness'] {
  const projectState = runtimeDigest?.projectState ?? null
  if (!projectState)
    return null

  const summaryLine = readStringValue(projectState.preflightSummary).trim()
  const companionBriefingLine = readStringValue(
    (projectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
  ).trim()
  const companionNextClosureLine = readStringValue(projectState.nextClosureTarget).trim()
  const primaryOpenLoop = readStringValue(projectState.primaryOpenLoop).trim()
  const digestPreDialogueAwarenessLine = readStringValue(projectState.preDialogueAwarenessLine).trim()
  const digestRuntimeAwarenessLine = readStringValue(projectState.awarenessLine).trim()
  const digestCanonicalAwarenessLine = buildAlicizationProjectPreDialogueAwarenessLine({
    identity: readStringValue(projectState.identity).trim(),
    currentPhase: readStringValue(projectState.currentPhase).trim(),
    latestLandedProgress: readStringValue(projectState.latestLandedProgress).trim() || null,
    primaryOpenLoop: primaryOpenLoop || null,
    nextClosureTarget: companionNextClosureLine || null,
    sameHerSelfLine: readStringValue(projectState.sameHerSelfLine).trim() || null,
  }) ?? ''
  const projectStateForPresentation
    = digestRuntimeAwarenessLine
      && digestPreDialogueAwarenessLine
      && digestRuntimeAwarenessLine !== digestPreDialogueAwarenessLine
      && digestPreDialogueAwarenessLine === digestCanonicalAwarenessLine
      ? {
          ...projectState,
          preDialogueAwarenessLine: digestRuntimeAwarenessLine,
        }
      : projectState
  const memoryClosureSummary = readStringValue(projectState.memoryClosureSummary).trim()
  const emotionalClosureCue = readStringValue(
    (projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
  ).trim()
  const awarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: projectStateForPresentation as {
      preDialogueAwarenessLine?: unknown
      awarenessLine?: unknown
      companionBriefingLine?: unknown
      preDialogueAwarenessSummary?: unknown
      preflightSummary?: unknown
      landedProgressSummary?: unknown
      openClosureSummary?: unknown
      emotionalClosureSummary?: unknown
    },
  }) || companionBriefingLine || summaryLine
  const canonicalAwareness = buildAlicizationProjectPreDialogueAwareness({
    preflightSummary: summaryLine || null,
    runtimeProjectState: projectState as {
      identity?: unknown
      currentPhase?: unknown
      latestLandedProgress?: unknown
      preDialogueAwarenessLine?: unknown
      awarenessLine?: unknown
      companionHeadlineLine?: unknown
      companionBriefingLine?: unknown
      preDialogueAwarenessSummary?: unknown
      preflightSummary?: unknown
      emotionalClosureCue?: unknown
      sameHerSelfLine?: unknown
      sameHerDriftRisk?: unknown
      sameHerDriftRiskSummary?: unknown
    },
    primaryOpenLoop: primaryOpenLoop || null,
    nextClosureTarget: companionNextClosureLine,
  })
  const reasonPreview = [
    memoryClosureSummary,
    ...(canonicalAwareness?.reasonPreview ?? []),
  ].filter((value, index, collection): value is string => Boolean(value) && collection.indexOf(value) === index)

  const status = companionBriefingLine && companionNextClosureLine
    ? 'grounded'
    : summaryLine || reasonPreview.length > 0
      ? 'partial'
      : null
  if (!status)
    return null

  return {
    status,
    summaryLine: summaryLine || null,
    companionBriefingLine: companionBriefingLine || null,
    companionNextClosureLine: companionNextClosureLine || null,
    awarenessLine: awarenessLine || canonicalAwareness?.awarenessLine || null,
    emotionalClosureCue: canonicalAwareness?.emotionalClosureCue || emotionalClosureCue || null,
    reasonPreview,
  }
}

function buildEffectiveProjectStateForChatMeta(input: {
  runtimeDigest: AlicizationRuntimeDigest | null | undefined
  digitalLifeSpine: AlicizationChatMetaEvent['digitalLifeSpine'] | null | undefined
}): AlicizationRuntimeProjectStateDigest | null {
  const runtimeProjectState = input.runtimeDigest?.projectState
    && typeof input.runtimeDigest.projectState === 'object'
    ? input.runtimeDigest.projectState as Record<string, unknown>
    : null
  const spineProjectState = input.digitalLifeSpine?.runtime?.projectState
    && typeof input.digitalLifeSpine.runtime.projectState === 'object'
    ? input.digitalLifeSpine.runtime.projectState as Record<string, unknown>
    : null
  if (!runtimeProjectState && !spineProjectState)
    return null

  const {
    latestProgress: _runtimeLatestProgress,
    landedProgressSummary: _runtimeLandedProgressSummary,
    openClosureSummary: _runtimeOpenClosureSummary,
    nextClosureTargetSummary: _runtimeNextClosureTargetSummary,
    ...runtimeProjectStateWithoutLegacyAliases
  } = runtimeProjectState ?? {}
  const {
    latestProgress: _spineLatestProgress,
    landedProgressSummary: _spineLandedProgressSummary,
    openClosureSummary: _spineOpenClosureSummary,
    nextClosureTargetSummary: _spineNextClosureTargetSummary,
    ...spineProjectStateWithoutLegacyAliases
  } = spineProjectState ?? {}
  const runtimeEmotionalClosureCue = readStringValue(runtimeProjectState?.emotionalClosureCue).trim()
  const spineEmotionalClosureCue = readStringValue(spineProjectState?.emotionalClosureCue).trim()
  const runtimeEmotionalClosureSummary = readStringValue(runtimeProjectState?.emotionalClosureSummary).trim()
  const spineEmotionalClosureSummary = readStringValue(spineProjectState?.emotionalClosureSummary).trim()
  const runtimeSameHerHoldDetail = readStringValue(runtimeProjectState?.sameHerHoldDetail).trim()
  const spineSameHerHoldDetail = readStringValue(spineProjectState?.sameHerHoldDetail).trim()
  const runtimePreDialogueAwarenessLine = readStringValue(runtimeProjectState?.preDialogueAwarenessLine).trim()
  const spinePreDialogueAwarenessLine = readStringValue(spineProjectState?.preDialogueAwarenessLine).trim()
  const runtimeAwarenessLine = readStringValue(runtimeProjectState?.awarenessLine).trim()
  const spineAwarenessLine = readStringValue(spineProjectState?.awarenessLine).trim()
  const runtimeCompanionHeadlineLine = readStringValue(
    (runtimeProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
  ).trim()
  const spineCompanionHeadlineLine = readStringValue(
    (spineProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine,
  ).trim()
  const runtimeCompanionBriefingLine = readStringValue(
    (runtimeProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
  ).trim()
  const spineCompanionBriefingLine = readStringValue(
    (spineProjectState as { companionBriefingLine?: unknown } | null)?.companionBriefingLine,
  ).trim()
  const runtimePreDialogueAwarenessSummary = readStringValue(
    (runtimeProjectState as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary,
  ).trim()
  const spinePreDialogueAwarenessSummary = readStringValue(
    (spineProjectState as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary,
  ).trim()
  const runtimeContinuityCue = readStringValue(runtimeProjectState?.continuityCue).trim()
  const spineContinuityCue = readStringValue(spineProjectState?.continuityCue).trim()
  const runtimeLatestLandedProgress = readStringValue(runtimeProjectState?.latestLandedProgress).trim()
  const spineLatestLandedProgress = readStringValue(spineProjectState?.latestLandedProgress).trim()
  const runtimeSameHerDriftRiskSummary = readStringValue(
    (runtimeProjectState as { sameHerDriftRiskSummary?: unknown } | null)?.sameHerDriftRiskSummary,
  ).trim()
  const spineSameHerDriftRiskSummary = readStringValue(
    (spineProjectState as { sameHerDriftRiskSummary?: unknown } | null)?.sameHerDriftRiskSummary,
  ).trim()
  const effectiveIdentity
    = readStringValue(runtimeProjectState?.identity).trim()
      || readStringValue(spineProjectState?.identity).trim()
  const effectiveCurrentPhase
    = readStringValue(runtimeProjectState?.currentPhase).trim()
      || readStringValue(spineProjectState?.currentPhase).trim()
  const effectiveLatestLandedProgress
    = runtimeLatestLandedProgress
      || spineLatestLandedProgress
  const effectivePrimaryOpenLoop
    = readStringValue(runtimeProjectState?.primaryOpenLoop).trim()
      || readStringValue(spineProjectState?.primaryOpenLoop).trim()
  const effectiveNextClosureTarget
    = readStringValue(runtimeProjectState?.nextClosureTarget).trim()
      || readStringValue(spineProjectState?.nextClosureTarget).trim()
  const effectiveSameHerDriftRisk
    = readStringValue(runtimeProjectState?.sameHerDriftRisk).trim()
      || runtimeSameHerDriftRiskSummary
      || readStringValue(spineProjectState?.sameHerDriftRisk).trim()
      || spineSameHerDriftRiskSummary
  const effectiveSameHerSelfLine
    = readStringValue(runtimeProjectState?.sameHerSelfLine).trim()
      || readStringValue(spineProjectState?.sameHerSelfLine).trim()

  const effectiveAwarenessLine = resolveAlicizationProjectPreDialogueAwarenessLine({
    runtimeProjectState: runtimeProjectState
      ? {
          preDialogueAwarenessLine: runtimePreDialogueAwarenessLine,
          awarenessLine: runtimeAwarenessLine,
          companionHeadlineLine: runtimeCompanionHeadlineLine,
          companionBriefingLine: runtimeCompanionBriefingLine,
          preDialogueAwarenessSummary: runtimePreDialogueAwarenessSummary,
          preflightSummary: readStringValue(runtimeProjectState.preflightSummary).trim(),
          latestLandedProgress: effectiveLatestLandedProgress,
          primaryOpenLoop: effectivePrimaryOpenLoop,
          nextClosureTarget: effectiveNextClosureTarget,
          emotionalClosureSummary: runtimeEmotionalClosureSummary || runtimeEmotionalClosureCue,
          sameHerDriftRiskSummary: effectiveSameHerDriftRisk,
          sameHerSelfLine: readStringValue(runtimeProjectState.sameHerSelfLine).trim(),
          sameHerHoldDetail: readStringValue(runtimeProjectState.sameHerHoldDetail).trim(),
        }
      : null,
    fallbackProjectState: spineProjectState
      ? {
          preDialogueAwarenessLine: spinePreDialogueAwarenessLine,
          awarenessLine: spineAwarenessLine,
          companionHeadlineLine: spineCompanionHeadlineLine,
          companionBriefingLine: spineCompanionBriefingLine,
          preDialogueAwarenessSummary: spinePreDialogueAwarenessSummary,
          preflightSummary: readStringValue(spineProjectState.preflightSummary).trim(),
          latestLandedProgress: effectiveLatestLandedProgress,
          primaryOpenLoop: effectivePrimaryOpenLoop,
          nextClosureTarget: effectiveNextClosureTarget,
          emotionalClosureSummary: spineEmotionalClosureSummary || spineEmotionalClosureCue,
          sameHerDriftRiskSummary: effectiveSameHerDriftRisk,
          sameHerSelfLine: readStringValue(spineProjectState.sameHerSelfLine).trim(),
          sameHerHoldDetail: readStringValue(spineProjectState.sameHerHoldDetail).trim(),
        }
      : null,
  }) ?? null
  const canonicalPreDialogueAwarenessLine = buildAlicizationProjectPreDialogueAwarenessLine({
    identity: effectiveIdentity,
    currentPhase: effectiveCurrentPhase,
    latestLandedProgress: effectiveLatestLandedProgress || null,
    primaryOpenLoop: effectivePrimaryOpenLoop || null,
    nextClosureTarget: effectiveNextClosureTarget || null,
    sameHerSelfLine: effectiveSameHerSelfLine || null,
  }) ?? null

  const fallbackHoldDetail = [
    runtimeContinuityCue,
    spineContinuityCue,
    runtimeSameHerHoldDetail,
    spineSameHerHoldDetail,
    runtimePreDialogueAwarenessLine,
    spinePreDialogueAwarenessLine,
    runtimeCompanionBriefingLine,
    spineCompanionBriefingLine,
  ].find(candidate =>
    /repair-before-closeness|same-her hold|measured-return|same living line|先修复再靠近|慢一点回来|留白/iu.test(candidate),
  ) ?? null

  return {
    ...spineProjectStateWithoutLegacyAliases,
    ...runtimeProjectStateWithoutLegacyAliases,
    preflightSummary:
      readStringValue(runtimeProjectState?.preflightSummary).trim()
      || readStringValue(spineProjectState?.preflightSummary).trim()
      || null,
    identity:
      readStringValue(runtimeProjectState?.identity).trim()
      || readStringValue(spineProjectState?.identity).trim()
      || null,
    currentPhase:
      readStringValue(runtimeProjectState?.currentPhase).trim()
      || readStringValue(spineProjectState?.currentPhase).trim()
      || null,
    latestLandedProgress:
      effectiveLatestLandedProgress
      || null,
    memoryClosureSummary:
      readStringValue(runtimeProjectState?.memoryClosureSummary).trim()
      || readStringValue(spineProjectState?.memoryClosureSummary).trim()
      || null,
    primaryOpenLoop:
      effectivePrimaryOpenLoop
      || null,
    nextClosureTarget:
      effectiveNextClosureTarget
      || null,
    sameHerSelfLine:
      readStringValue(runtimeProjectState?.sameHerSelfLine).trim()
      || readStringValue(spineProjectState?.sameHerSelfLine).trim()
      || null,
    sameHerDriftRisk:
      effectiveSameHerDriftRisk
      || null,
    continuityRestraint:
      typeof runtimeProjectState?.continuityRestraint === 'string'
        ? runtimeProjectState.continuityRestraint as AlicizationRuntimeProjectStateDigest['continuityRestraint']
        : typeof spineProjectState?.continuityRestraint === 'string'
          ? spineProjectState.continuityRestraint as AlicizationRuntimeProjectStateDigest['continuityRestraint']
          : null,
    continuityArcStage:
      readStringValue(runtimeProjectState?.continuityArcStage).trim()
      || readStringValue(spineProjectState?.continuityArcStage).trim()
      || null,
    continuityCue:
      runtimeContinuityCue
      || spineContinuityCue
      || null,
    continuityPreferredTiming:
      typeof runtimeProjectState?.continuityPreferredTiming === 'string'
        ? runtimeProjectState.continuityPreferredTiming as AlicizationRuntimeProjectStateDigest['continuityPreferredTiming']
        : typeof spineProjectState?.continuityPreferredTiming === 'string'
          ? spineProjectState.continuityPreferredTiming as AlicizationRuntimeProjectStateDigest['continuityPreferredTiming']
          : null,
    continuityCadence:
      readStringValue(runtimeProjectState?.continuityCadence).trim()
      || readStringValue(spineProjectState?.continuityCadence).trim()
      || null,
    preferredBlinkCadence:
      typeof runtimeProjectState?.preferredBlinkCadence === 'string'
        ? runtimeProjectState.preferredBlinkCadence as AlicizationRuntimeProjectStateDigest['preferredBlinkCadence']
        : typeof spineProjectState?.preferredBlinkCadence === 'string'
          ? spineProjectState.preferredBlinkCadence as AlicizationRuntimeProjectStateDigest['preferredBlinkCadence']
          : null,
    preferredGazeMode:
      typeof runtimeProjectState?.preferredGazeMode === 'string'
        ? runtimeProjectState.preferredGazeMode as AlicizationRuntimeProjectStateDigest['preferredGazeMode']
        : typeof spineProjectState?.preferredGazeMode === 'string'
          ? spineProjectState.preferredGazeMode as AlicizationRuntimeProjectStateDigest['preferredGazeMode']
          : null,
    preferredVoiceMode:
      typeof runtimeProjectState?.preferredVoiceMode === 'string'
        ? runtimeProjectState.preferredVoiceMode as AlicizationRuntimeProjectStateDigest['preferredVoiceMode']
        : typeof spineProjectState?.preferredVoiceMode === 'string'
          ? spineProjectState.preferredVoiceMode as AlicizationRuntimeProjectStateDigest['preferredVoiceMode']
          : null,
    preferredPacingMode:
      typeof runtimeProjectState?.preferredPacingMode === 'string'
        ? runtimeProjectState.preferredPacingMode as AlicizationRuntimeProjectStateDigest['preferredPacingMode']
        : typeof spineProjectState?.preferredPacingMode === 'string'
          ? spineProjectState.preferredPacingMode as AlicizationRuntimeProjectStateDigest['preferredPacingMode']
          : null,
    preDialogueAwarenessLine:
      canonicalPreDialogueAwarenessLine
      || effectiveAwarenessLine
      || runtimePreDialogueAwarenessLine
      || spinePreDialogueAwarenessLine
      || null,
    awarenessLine:
      effectiveAwarenessLine
      || canonicalPreDialogueAwarenessLine
      || runtimeAwarenessLine
      || spineAwarenessLine
      || null,
    companionHeadlineLine:
      effectiveAwarenessLine
      || runtimeCompanionHeadlineLine
      || spineCompanionHeadlineLine
      || null,
    companionBriefingLine:
      runtimeCompanionBriefingLine
      || spineCompanionBriefingLine
      || null,
    preDialogueAwarenessSummary:
      runtimePreDialogueAwarenessSummary
      || spinePreDialogueAwarenessSummary
      || effectiveAwarenessLine
      || null,
    emotionalClosureCue:
      runtimeEmotionalClosureCue
      || spineEmotionalClosureCue
      || runtimeEmotionalClosureSummary
      || spineEmotionalClosureSummary
      || null,
    emotionalClosureSummary:
      runtimeEmotionalClosureSummary
      || spineEmotionalClosureSummary
      || runtimeEmotionalClosureCue
      || spineEmotionalClosureCue
      || null,
    sameHerHoldDetail:
      preferRicherProjectStateAuditText({
        current: runtimeSameHerHoldDetail,
        candidate: preferRicherProjectStateAuditText({
          current: spineSameHerHoldDetail,
          candidate: fallbackHoldDetail,
        }),
      })
      || null,
  } satisfies AlicizationRuntimeProjectStateDigest
}

function readChatMetaRecord(raw: unknown): Record<string, unknown> | null {
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
}

function readChatMetaEmotionalKernel(raw: unknown): AlicizationChatMetaEmotionalKernel | null {
  const candidate = readChatMetaRecord(raw)
  if (!candidate)
    return null
  if (candidate.version !== 'emotional-kernel-v1')
    return null
  if (
    !readStringValue(candidate.dominantEmotion).trim()
    || !readStringValue(candidate.initiativeMode).trim()
    || !readStringValue(candidate.memoryRecallMode).trim()
    || !readStringValue(candidate.embodimentTone).trim()
  ) {
    return null
  }
  return candidate as unknown as AlicizationChatMetaEmotionalKernel
}

function readNestedChatMetaRecord(raw: unknown, key: string): Record<string, unknown> | null {
  return readChatMetaRecord(readChatMetaRecord(raw)?.[key])
}

function scoreEmbodimentClosureLaneForChatMeta(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.toLowerCase() : ''
  if (!normalized)
    return 0

  const explicitLaneMatch = /\blane=([a-z+]+)-only\b/i.exec(normalized)
  if (explicitLaneMatch) {
    return explicitLaneMatch[1]
      .split('+')
      .map(part => part.trim())
      .filter(Boolean)
      .length
  }

  return [
    normalized.includes('body'),
    normalized.includes('face'),
    normalized.includes('motion'),
    normalized.includes('lipsync'),
    normalized.includes('voice'),
  ].filter(Boolean).length
}

function readChatMetaSelfContinuityAuthority(raw: unknown): AlicizationChatMetaSelfContinuityAuthority | null {
  const candidate = readChatMetaRecord(raw)
  if (!candidate)
    return null

  const hasAuthorityEvidence = [
    candidate.selfLine,
    candidate.relationshipLine,
    candidate.motiveLine,
    candidate.habitLine,
    candidate.inwardLine,
    candidate.authoritySummary,
    candidate.closenessPosture,
    candidate.currentBodyState,
  ].some(value => readStringValue(value).trim().length > 0)

  return hasAuthorityEvidence || Array.isArray(candidate.sourceTags)
    ? candidate as AlicizationChatMetaSelfContinuityAuthority
    : null
}

function normalizeChatMetaSelfContinuityAuthority(
  authority: AlicizationChatMetaSelfContinuityAuthority | null | undefined,
): AlicizationChatMetaSelfContinuityAuthority | null {
  if (!authority)
    return null

  return {
    sourceTags: Array.isArray(authority.sourceTags)
      ? authority.sourceTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
      : null,
    selfLine: readStringValue(authority.selfLine).trim() || null,
    relationshipLine: readStringValue(authority.relationshipLine).trim() || null,
    motiveLine: readStringValue(authority.motiveLine).trim() || null,
    habitLine: readStringValue(authority.habitLine).trim() || null,
    inwardLine: readStringValue(authority.inwardLine).trim() || null,
    authoritySummary: readStringValue(authority.authoritySummary).trim() || null,
    closenessPosture: readStringValue(authority.closenessPosture).trim() || null,
    currentBodyState: readStringValue(authority.currentBodyState).trim() || null,
  }
}

function readChatMetaAuthorityCurrentBodyState(
  authority: AlicizationChatMetaSelfContinuityAuthority | null | undefined,
) {
  return typeof authority?.currentBodyState === 'string'
    ? authority.currentBodyState.trim() || null
    : null
}

function preferStrongerChatMetaBodyState(
  current: string | null | undefined,
  candidate: string | null | undefined,
) {
  const normalizedCurrent = typeof current === 'string' ? current.trim() || null : null
  const normalizedCandidate = typeof candidate === 'string' ? candidate.trim() || null : null
  if (!normalizedCandidate)
    return normalizedCurrent
  if (!normalizedCurrent)
    return normalizedCandidate

  const currentScore = scoreEmbodimentClosureLaneForChatMeta(normalizedCurrent)
  const candidateScore = scoreEmbodimentClosureLaneForChatMeta(normalizedCandidate)
  return candidateScore > currentScore ? normalizedCandidate : normalizedCurrent
}

function resolveEffectiveRuntimeSelfContinuityAuthorityForChatMeta(input: {
  runtimeDigest: AlicizationRuntimeDigest | null | undefined
  digitalLifeSpine: AlicizationChatMetaEvent['digitalLifeSpine'] | null | undefined
}) {
  const spine = readChatMetaRecord(input.digitalLifeSpine)
  const runtimeSurface = readNestedChatMetaRecord(spine, 'runtimeSurface')
  const runtimeSurfaceMemory = readNestedChatMetaRecord(runtimeSurface, 'memory')
  const runtimeSurfacePerception = readNestedChatMetaRecord(runtimeSurface, 'perception')
  const runtimeSurfaceMemoryAuthority = normalizeChatMetaSelfContinuityAuthority(readChatMetaSelfContinuityAuthority(
    readChatMetaRecord(runtimeSurfaceMemory?.personStateProjection)?.selfContinuityAuthority,
  ))
  const currentAuthority = normalizeChatMetaSelfContinuityAuthority(
    input.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority ?? null,
  )
  const topLevelAuthority = normalizeChatMetaSelfContinuityAuthority(
    readChatMetaSelfContinuityAuthority(input.digitalLifeSpine?.selfAuthority),
  )
  const runtimePerceptionCurrentBodyState = readStringValue(runtimeSurfacePerception?.currentBodyState).trim() || null

  const authorityCandidates = [
    currentAuthority,
    runtimeSurfaceMemoryAuthority,
    topLevelAuthority,
  ]

  let preferredAuthority: AlicizationChatMetaSelfContinuityAuthority | null = null
  let preferredScore = 0
  let preferredCompletenessScore = -1

  for (const authority of authorityCandidates) {
    if (!authority)
      continue

    const authoritySummary = readStringValue(authority.authoritySummary).trim() || null
    const currentBodyState = readChatMetaAuthorityCurrentBodyState(authority)
    if (!authoritySummary && !currentBodyState)
      continue

    const score = Math.max(
      scoreEmbodimentClosureLaneForChatMeta(authoritySummary),
      scoreEmbodimentClosureLaneForChatMeta(currentBodyState),
    )
    const completenessScore
      = (authoritySummary ? 1 : 0)
        + (currentBodyState ? 2 : 0)

    if (
      !preferredAuthority
      || score > preferredScore
      || (score === preferredScore && completenessScore > preferredCompletenessScore)
    ) {
      preferredAuthority = authority
      preferredScore = score
      preferredCompletenessScore = completenessScore
    }
  }

  const preferredCurrentBodyState = [
    runtimePerceptionCurrentBodyState,
    readChatMetaAuthorityCurrentBodyState(currentAuthority),
    readChatMetaAuthorityCurrentBodyState(runtimeSurfaceMemoryAuthority),
    readChatMetaAuthorityCurrentBodyState(topLevelAuthority),
  ].reduce<string | null>((best, candidate) => preferStrongerChatMetaBodyState(best, candidate), null)

  if (!preferredAuthority && !preferredCurrentBodyState)
    return null

  const normalizedPreferredAuthority = normalizeChatMetaSelfContinuityAuthority(preferredAuthority)
  if (!normalizedPreferredAuthority)
    return null

  return {
    ...normalizedPreferredAuthority,
    currentBodyState: preferredCurrentBodyState,
  }
}

function resolveEffectiveEmotionalKernelForChatMeta(input: {
  runtimeDigest: AlicizationRuntimeDigest | null | undefined
  digitalLifeSpine: AlicizationChatMetaEvent['digitalLifeSpine'] | null | undefined
}): AlicizationChatMetaEmotionalKernel | null {
  const spine = readChatMetaRecord(input.digitalLifeSpine)
  const runtimeSurface = readNestedChatMetaRecord(spine, 'runtimeSurface')
  const runtimeSurfaceMemory = readNestedChatMetaRecord(runtimeSurface, 'memory')
  const runtimeSurfaceRaw = readNestedChatMetaRecord(runtimeSurface, 'raw')
  const runtimeSurfaceCognition = readNestedChatMetaRecord(runtimeSurface, 'cognition')
  const runtimeSurfaceDialogue = readNestedChatMetaRecord(runtimeSurface, 'dialogue')
  const derivedMindStateBundle = readNestedChatMetaRecord(runtimeSurfaceMemory, 'derivedMindStateBundle')
  const visualPresenceState = readNestedChatMetaRecord(derivedMindStateBundle, 'visualPresenceState')

  return [
    runtimeSurfaceMemory?.emotionalKernel,
    readNestedChatMetaRecord(runtimeSurfaceRaw, 'runtimeDigest')?.emotionalKernel,
    readNestedChatMetaRecord(runtimeSurfaceCognition, 'runtimeDigest')?.emotionalKernel,
    readNestedChatMetaRecord(runtimeSurfaceDialogue, 'runtimeDigest')?.emotionalKernel,
    derivedMindStateBundle?.emotionalKernel,
    visualPresenceState?.emotionalKernel,
    input.runtimeDigest?.emotionalKernel,
    spine?.emotionalKernel,
  ]
    .map(readChatMetaEmotionalKernel)
    .find((kernel): kernel is AlicizationChatMetaEmotionalKernel => kernel != null)
    ?? null
}

function buildEffectiveRuntimeDigestForChatMeta(input: {
  runtimeDigest: AlicizationRuntimeDigest | null | undefined
  digitalLifeSpine: AlicizationChatMetaEvent['digitalLifeSpine'] | null | undefined
}) {
  const effectiveProjectState = buildEffectiveProjectStateForChatMeta(input)
  const effectiveEmotionalKernel = resolveEffectiveEmotionalKernelForChatMeta(input)
  const effectiveSelfContinuityAuthority = resolveEffectiveRuntimeSelfContinuityAuthorityForChatMeta(input)
  const effectiveCurrentConsciousFrame = (() => {
    if (!input.runtimeDigest?.currentConsciousFrame && !effectiveSelfContinuityAuthority)
      return null

    return {
      ...(input.runtimeDigest?.currentConsciousFrame ?? { reasonTags: [] }),
      reasonTags: input.runtimeDigest?.currentConsciousFrame?.reasonTags ?? [],
      selfContinuityAuthority:
        effectiveSelfContinuityAuthority
        ?? input.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority
        ?? null,
    } satisfies AlicizationChatMetaCurrentConsciousFrame
  })()
  if (!effectiveProjectState && !effectiveEmotionalKernel && !effectiveSelfContinuityAuthority)
    return input.runtimeDigest ?? null
  if (!input.runtimeDigest) {
    return {
      version: 'alicization-runtime-digest-v1',
      dominantChannel: 'dialogue',
      projectState: effectiveProjectState,
      emotionalKernel: effectiveEmotionalKernel,
      currentConsciousFrame: effectiveCurrentConsciousFrame,
      shouldProactivelySpeak: false,
      shouldProactivelyAct: false,
      continuityPressure: 0,
      companionshipPressure: 0,
      channels: [],
      summary: readStringValue(effectiveProjectState?.preflightSummary).trim()
        || readStringValue(effectiveEmotionalKernel?.why).trim()
        || readStringValue(effectiveSelfContinuityAuthority?.authoritySummary).trim()
        || readStringValue(effectiveSelfContinuityAuthority?.currentBodyState).trim()
        || '',
    } satisfies AlicizationRuntimeDigest
  }
  return {
    ...input.runtimeDigest,
    projectState: effectiveProjectState,
    emotionalKernel: effectiveEmotionalKernel ?? input.runtimeDigest.emotionalKernel ?? null,
    currentConsciousFrame: effectiveCurrentConsciousFrame ?? input.runtimeDigest.currentConsciousFrame ?? null,
  } satisfies AlicizationRuntimeDigest
}

function buildCurrentConsciousFrameForStreamMetaGovernance(
  runtimeDigest: AlicizationRuntimeDigest | null | undefined,
): AlicizationCurrentConsciousFrameSnapshot | null {
  const reasonTags = runtimeDigest?.currentConsciousFrame?.reasonTags ?? []

  if (!runtimeDigest?.currentConsciousFrame && reasonTags.length === 0)
    return null

  return {
    reasonTags,
    projectState: runtimeDigest?.currentConsciousFrame?.projectState as AlicizationCurrentConsciousFrameSnapshot['projectState'],
  } as AlicizationCurrentConsciousFrameSnapshot
}

function repairDigitalLifePayloadForFreshRepairFirstAuthority(
  body: Pick<AlicizationChatMetaEvent, 'embodiment' | 'embodimentScript' | 'speechTimeline' | 'digitalLife' | 'digitalLifeSpine' | 'runtimeDigest'>,
): AlicizationChatMetaEvent['digitalLife'] {
  const digitalLife = resolveAuthoritativeChatMetaDigitalLife(body)
  if (!digitalLife?.frames.length)
    return digitalLife

  const lastSegment = body.speechTimeline?.segments.at(-1) ?? null
  const lastVisibleSegmentFrame = resolveFrameForLastVisibleSegment({
    digitalLife,
    segmentId: lastSegment?.id ?? null,
  })
  if (!lastVisibleSegmentFrame)
    return digitalLife

  const voiceCompanionshipHints = resolveVoiceCompanionshipHints({
    lastFrame: lastVisibleSegmentFrame,
    lastSegment,
    embodiment: body.embodiment,
    embodimentScript: body.embodimentScript,
    runtimeDigest: body.runtimeDigest,
  })
  const continuityTiming = resolveContinuityTiming({
    runtimeDigest: body.runtimeDigest,
  })
  const continuityReasonSummary = resolveContinuityReasonSummary(
    {
      runtimeDigest: body.runtimeDigest,
      digitalLifeSpine: body.digitalLifeSpine,
    },
    continuityTiming,
    voiceCompanionshipHints.companionshipMode,
  )
  const shouldPreferRepairFirstConflictFallback = shouldPreferFreshRepairFirstSummaryFallback({
    lastSegmentResidentMode: lastSegment?.rendererHints?.residentMode ?? null,
    embodimentResidentMode: body.embodiment?.rendererHints?.residentMode ?? null,
    embodimentScriptResidentMode: body.embodimentScript?.state.residentMode ?? null,
    voiceCompanionshipMode: voiceCompanionshipHints.companionshipMode ?? null,
    runtimeDigest: body.runtimeDigest,
  })
  const summaryFallbackResidentMode = resolveSummaryFallbackResidentMode({
    lastSegmentResidentMode: lastSegment?.rendererHints?.residentMode ?? null,
    embodimentResidentMode: body.embodiment?.rendererHints?.residentMode ?? null,
    embodimentScriptResidentMode: body.embodimentScript?.state.residentMode ?? null,
    voiceCompanionshipMode: voiceCompanionshipHints.companionshipMode ?? null,
    runtimeDigest: body.runtimeDigest,
  })
  const summaryFallbackBlinkCadence = shouldPreferRepairFirstConflictFallback
    ? body.embodiment?.rendererHints?.preferredBlinkCadence
    ?? (typeof body.runtimeDigest?.projectState?.preferredBlinkCadence === 'string'
      && body.runtimeDigest.projectState.preferredBlinkCadence.trim()
      ? body.runtimeDigest.projectState.preferredBlinkCadence.trim()
      : null)
    ?? (summaryFallbackResidentMode === 'repair-before-closeness' ? 'quiet' : voiceCompanionshipHints.preferredBlinkCadence)
    : (lastSegment?.rendererHints?.preferredBlinkCadence
      ?? body.embodiment?.rendererHints?.preferredBlinkCadence
      ?? voiceCompanionshipHints.preferredBlinkCadence)
  const summaryFallbackGazeMode = shouldPreferRepairFirstConflictFallback
    ? body.embodiment?.rendererHints?.preferredGazeMode
    ?? (typeof body.runtimeDigest?.projectState?.preferredGazeMode === 'string'
      && body.runtimeDigest.projectState.preferredGazeMode.trim()
      ? body.runtimeDigest.projectState.preferredGazeMode.trim()
      : null)
    ?? (summaryFallbackResidentMode === 'measured-return'
      || summaryFallbackResidentMode === 'repair-before-closeness'
      || summaryFallbackResidentMode === 'quiet-companionship'
      ? 'soften'
      : voiceCompanionshipHints.preferredGazeMode)
    : (lastSegment?.rendererHints?.preferredGazeMode
      ?? body.embodiment?.rendererHints?.preferredGazeMode
      ?? voiceCompanionshipHints.preferredGazeMode)

  const shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
    = shouldOverrideVisibleSegmentWithRepairBeforeClosenessProjectAuthority({
      continuityReasonSummary,
      companionshipMode: summaryFallbackResidentMode ?? voiceCompanionshipHints.companionshipMode ?? null,
      continuityTiming,
      body,
      lastVisibleSegmentFrame,
      lastSegment,
    })
  if (!shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority)
    return digitalLife

  const repairedBlinkCadence: NonNullable<NonNullable<AlicizationChatMetaEvent['digitalLife']>['rendererHints']>['preferredBlinkCadence']
    = summaryFallbackBlinkCadence === 'linger' || summaryFallbackBlinkCadence === 'normal' || summaryFallbackBlinkCadence === 'quiet'
      ? summaryFallbackBlinkCadence
      : 'quiet'
  const repairedGazeMode: NonNullable<NonNullable<AlicizationChatMetaEvent['digitalLife']>['rendererHints']>['preferredGazeMode']
    = summaryFallbackGazeMode === 'steady' || summaryFallbackGazeMode === 'soften' || summaryFallbackGazeMode === 'drift'
      ? summaryFallbackGazeMode
      : 'soften'
  const repairedRendererHints = {
    ...lastVisibleSegmentFrame.face.rendererHints ?? lastVisibleSegmentFrame.action.rendererHints ?? digitalLife.rendererHints,
    residentMode: 'repair-before-closeness',
    preferredBlinkCadence: repairedBlinkCadence,
    preferredGazeMode: repairedGazeMode,
  } satisfies NonNullable<NonNullable<AlicizationChatMetaEvent['digitalLife']>['rendererHints']>
  const repairedVoice = {
    ...lastVisibleSegmentFrame.voice,
    pitchDelta: body.embodiment?.speechStyle?.pitchDelta
      ?? digitalLife.voice.pitchDelta,
    rateMultiplier: body.embodiment?.speechStyle?.rateMultiplier
      ?? digitalLife.voice.rateMultiplier,
    energy: 0.46,
    cadence: 0.4,
  }
  const repairedActionRendererHints = {
    ...(lastVisibleSegmentFrame.action.rendererHints ?? repairedRendererHints),
    residentMode: 'repair-before-closeness',
    preferredBlinkCadence: repairedBlinkCadence,
    preferredGazeMode: repairedGazeMode,
  } satisfies NonNullable<AlicizationChatMetaDigitalLifeFrame['action']['rendererHints']>
  const repairedFrame: AlicizationChatMetaDigitalLifeFrame = {
    ...lastVisibleSegmentFrame,
    voice: repairedVoice,
    face: {
      ...lastVisibleSegmentFrame.face,
      emotion: 'concerned',
      facialCue: 'soft_concern',
      rendererHints: repairedRendererHints,
    },
    action: {
      ...lastVisibleSegmentFrame.action,
      rendererHints: repairedActionRendererHints,
    },
  }

  return {
    ...digitalLife,
    emotion: 'concerned',
    performance: {
      ...digitalLife.performance,
      baseEmotion: 'concerned',
      emotion: 'concerned',
      facialCue: 'soft_concern',
    },
    rendererHints: {
      ...digitalLife.rendererHints,
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: repairedBlinkCadence,
      preferredGazeMode: repairedGazeMode,
    },
    voice: {
      ...digitalLife.voice,
      pitchDelta: repairedVoice.pitchDelta,
      rateMultiplier: repairedVoice.rateMultiplier,
      energy: 0.46,
      cadence: 0.4,
    },
    face: {
      ...digitalLife.face,
      emotion: 'concerned',
      facialCue: 'soft_concern',
      rendererHints: repairedRendererHints,
    },
    action: {
      ...digitalLife.action,
      rendererHints: {
        ...(digitalLife.action.rendererHints ?? repairedRendererHints),
        residentMode: 'repair-before-closeness',
        preferredBlinkCadence: repairedBlinkCadence,
        preferredGazeMode: repairedGazeMode,
      } satisfies NonNullable<NonNullable<AlicizationChatMetaEvent['digitalLife']>['action']['rendererHints']>,
    },
    frames: digitalLife.frames.map(frame => frame.id === repairedFrame.id ? repairedFrame : frame),
  } satisfies NonNullable<AlicizationChatMetaEvent['digitalLife']>
}

function repairEmbodimentPayloadForFreshRepairFirstAuthority(
  body: Pick<AlicizationChatMetaEvent, 'embodiment' | 'embodimentScript' | 'speechTimeline' | 'digitalLife' | 'digitalLifeSpine' | 'runtimeDigest'>,
): AlicizationChatMetaEvent['embodiment'] {
  const embodiment = body.embodiment
  const digitalLife = resolveAuthoritativeChatMetaDigitalLife(body)
  if (!embodiment || !digitalLife?.frames.length)
    return embodiment

  const lastSegment = body.speechTimeline?.segments.at(-1) ?? null
  const lastVisibleSegmentFrame = resolveFrameForLastVisibleSegment({
    digitalLife,
    segmentId: lastSegment?.id ?? null,
  })
  if (!lastVisibleSegmentFrame)
    return embodiment

  const voiceCompanionshipHints = resolveVoiceCompanionshipHints({
    lastFrame: lastVisibleSegmentFrame,
    lastSegment,
    embodiment,
    embodimentScript: body.embodimentScript,
    runtimeDigest: body.runtimeDigest,
  })
  const continuityTiming = resolveContinuityTiming({
    runtimeDigest: body.runtimeDigest,
  })
  const continuityReasonSummary = resolveContinuityReasonSummary(
    {
      runtimeDigest: body.runtimeDigest,
      digitalLifeSpine: body.digitalLifeSpine,
    },
    continuityTiming,
    voiceCompanionshipHints.companionshipMode,
  )
  const summaryFallbackResidentMode = resolveSummaryFallbackResidentMode({
    lastSegmentResidentMode: lastSegment?.rendererHints?.residentMode ?? null,
    embodimentResidentMode: embodiment.rendererHints?.residentMode ?? null,
    embodimentScriptResidentMode: body.embodimentScript?.state.residentMode ?? null,
    voiceCompanionshipMode: voiceCompanionshipHints.companionshipMode ?? null,
    runtimeDigest: body.runtimeDigest,
  })
  const shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
    = shouldOverrideVisibleSegmentWithRepairBeforeClosenessProjectAuthority({
      continuityReasonSummary,
      companionshipMode: summaryFallbackResidentMode ?? voiceCompanionshipHints.companionshipMode ?? null,
      continuityTiming,
      body,
      lastVisibleSegmentFrame,
      lastSegment,
    })
  if (!shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority)
    return embodiment

  return {
    ...embodiment,
    emotion: 'concerned',
    performance: {
      ...embodiment.performance,
      baseEmotion: 'concerned',
      emotion: 'concerned',
      facialCue: 'soft_concern',
    },
    rendererHints: {
      ...embodiment.rendererHints,
      residentMode: 'repair-before-closeness',
      preferredBlinkCadence: embodiment.rendererHints?.preferredBlinkCadence ?? 'quiet',
      preferredGazeMode: embodiment.rendererHints?.preferredGazeMode ?? 'soften',
    },
  } satisfies NonNullable<AlicizationChatMetaEvent['embodiment']>
}

function repairEmbodimentScriptPayloadForFreshRepairFirstAuthority(
  body: Pick<AlicizationChatMetaEvent, 'embodiment' | 'embodimentScript' | 'speechTimeline' | 'digitalLife' | 'digitalLifeSpine' | 'runtimeDigest'>,
): AlicizationChatMetaEvent['embodimentScript'] {
  const embodimentScript = body.embodimentScript
  const digitalLife = resolveAuthoritativeChatMetaDigitalLife(body)
  if (!embodimentScript || !digitalLife?.frames.length)
    return embodimentScript

  const lastSegment = body.speechTimeline?.segments.at(-1) ?? null
  const lastVisibleSegmentFrame = resolveFrameForLastVisibleSegment({
    digitalLife,
    segmentId: lastSegment?.id ?? null,
  })
  if (!lastVisibleSegmentFrame)
    return embodimentScript

  const voiceCompanionshipHints = resolveVoiceCompanionshipHints({
    lastFrame: lastVisibleSegmentFrame,
    lastSegment,
    embodiment: body.embodiment,
    embodimentScript,
    runtimeDigest: body.runtimeDigest,
  })
  const continuityTiming = resolveContinuityTiming({
    runtimeDigest: body.runtimeDigest,
  })
  const continuityReasonSummary = resolveContinuityReasonSummary(
    {
      runtimeDigest: body.runtimeDigest,
      digitalLifeSpine: body.digitalLifeSpine,
    },
    continuityTiming,
    voiceCompanionshipHints.companionshipMode,
  )
  const summaryFallbackResidentMode = resolveSummaryFallbackResidentMode({
    lastSegmentResidentMode: lastSegment?.rendererHints?.residentMode ?? null,
    embodimentResidentMode: body.embodiment?.rendererHints?.residentMode ?? null,
    embodimentScriptResidentMode: embodimentScript.state.residentMode ?? null,
    voiceCompanionshipMode: voiceCompanionshipHints.companionshipMode ?? null,
    runtimeDigest: body.runtimeDigest,
  })
  const shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
    = shouldOverrideVisibleSegmentWithRepairBeforeClosenessProjectAuthority({
      continuityReasonSummary,
      companionshipMode: summaryFallbackResidentMode ?? voiceCompanionshipHints.companionshipMode ?? null,
      continuityTiming,
      body,
      lastVisibleSegmentFrame,
      lastSegment,
    })
  if (!shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority)
    return embodimentScript

  const repairedRendererHints = {
    ...embodimentScript.speechPlan.segments[0]?.rendererHints ?? body.embodiment?.rendererHints,
    residentMode: 'repair-before-closeness',
    preferredBlinkCadence: body.embodiment?.rendererHints?.preferredBlinkCadence ?? 'quiet',
    preferredGazeMode: body.embodiment?.rendererHints?.preferredGazeMode ?? 'soften',
  }

  return {
    ...embodimentScript,
    state: {
      ...embodimentScript.state,
      baseEmotion: 'concerned',
      residentMode: 'repair-before-closeness',
    },
    speechPlan: {
      ...embodimentScript.speechPlan,
      segments: embodimentScript.speechPlan.segments.map((segment, index) => index === 0
        ? {
            ...segment,
            rendererHints: repairedRendererHints,
          }
        : segment),
    },
  } satisfies NonNullable<AlicizationChatMetaEvent['embodimentScript']>
}

function repairSpeechTimelinePayloadForFreshRepairFirstAuthority(
  body: Pick<AlicizationChatMetaEvent, 'embodiment' | 'embodimentScript' | 'speechTimeline' | 'digitalLife' | 'digitalLifeSpine' | 'runtimeDigest'>,
): AlicizationChatMetaEvent['speechTimeline'] {
  const speechTimeline = body.speechTimeline
  const digitalLife = resolveAuthoritativeChatMetaDigitalLife(body)
  if (!speechTimeline?.segments.length || !digitalLife?.frames.length)
    return speechTimeline

  const lastSegment = speechTimeline.segments.at(-1) ?? null
  const lastVisibleSegmentFrame = resolveFrameForLastVisibleSegment({
    digitalLife,
    segmentId: lastSegment?.id ?? null,
  })
  if (!lastVisibleSegmentFrame)
    return speechTimeline

  const voiceCompanionshipHints = resolveVoiceCompanionshipHints({
    lastFrame: lastVisibleSegmentFrame,
    lastSegment,
    embodiment: body.embodiment,
    embodimentScript: body.embodimentScript,
    runtimeDigest: body.runtimeDigest,
  })
  const continuityTiming = resolveContinuityTiming({
    runtimeDigest: body.runtimeDigest,
  })
  const continuityReasonSummary = resolveContinuityReasonSummary(
    {
      runtimeDigest: body.runtimeDigest,
      digitalLifeSpine: body.digitalLifeSpine,
    },
    continuityTiming,
    voiceCompanionshipHints.companionshipMode,
  )
  const summaryFallbackResidentMode = resolveSummaryFallbackResidentMode({
    lastSegmentResidentMode: lastSegment?.rendererHints?.residentMode ?? null,
    embodimentResidentMode: body.embodiment?.rendererHints?.residentMode ?? null,
    embodimentScriptResidentMode: body.embodimentScript?.state.residentMode ?? null,
    voiceCompanionshipMode: voiceCompanionshipHints.companionshipMode ?? null,
    runtimeDigest: body.runtimeDigest,
  })
  const shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
    = shouldOverrideVisibleSegmentWithRepairBeforeClosenessProjectAuthority({
      continuityReasonSummary,
      companionshipMode: summaryFallbackResidentMode ?? voiceCompanionshipHints.companionshipMode ?? null,
      continuityTiming,
      body,
      lastVisibleSegmentFrame,
      lastSegment,
    })
  if (!shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority)
    return speechTimeline

  const repairedRendererHints = {
    ...lastSegment?.rendererHints ?? body.embodiment?.rendererHints,
    residentMode: 'repair-before-closeness',
    preferredBlinkCadence: body.embodiment?.rendererHints?.preferredBlinkCadence ?? 'quiet',
    preferredGazeMode: body.embodiment?.rendererHints?.preferredGazeMode ?? 'soften',
  }

  return {
    ...speechTimeline,
    segments: speechTimeline.segments.map((segment, index) => index === speechTimeline.segments.length - 1
      ? {
          ...segment,
          rendererHints: repairedRendererHints,
        }
      : segment),
  } satisfies NonNullable<AlicizationChatMetaEvent['speechTimeline']>
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
  const effectiveRuntimeDigest = buildEffectiveRuntimeDigestForChatMeta({
    runtimeDigest: input.runtimeDigest,
    digitalLifeSpine: input.digitalLifeSpine,
  })
  const authoritativeDigitalLife = resolveAuthoritativeChatMetaDigitalLife({
    digitalLife: input.digitalLife,
    embodimentScript: input.embodimentScript,
  })
  const projectState = effectiveRuntimeDigest?.projectState ?? null
  const preDialogueAwareness = buildPreDialogueAwarenessFromRuntimeDigest(effectiveRuntimeDigest)
  const repairedDigitalLifeSpine = repairContinuitySourceTagsFromRuntimeDigest({
    digitalLifeSpine: input.digitalLifeSpine,
    runtimeDigest: effectiveRuntimeDigest,
  })
  const repairedDigitalLife = repairDigitalLifePayloadForFreshRepairFirstAuthority({
    embodiment: input.embodiment,
    embodimentScript: input.embodimentScript,
    speechTimeline: input.speechTimeline,
    digitalLife: authoritativeDigitalLife,
    digitalLifeSpine: repairedDigitalLifeSpine,
    runtimeDigest: effectiveRuntimeDigest,
  })
  const repairedEmbodiment = repairEmbodimentPayloadForFreshRepairFirstAuthority({
    embodiment: input.embodiment,
    embodimentScript: input.embodimentScript,
    speechTimeline: input.speechTimeline,
    digitalLife: authoritativeDigitalLife,
    digitalLifeSpine: repairedDigitalLifeSpine,
    runtimeDigest: effectiveRuntimeDigest,
  })
  const repairedEmbodimentScript = repairEmbodimentScriptPayloadForFreshRepairFirstAuthority({
    embodiment: repairedEmbodiment,
    embodimentScript: input.embodimentScript,
    speechTimeline: input.speechTimeline,
    digitalLife: authoritativeDigitalLife,
    digitalLifeSpine: repairedDigitalLifeSpine,
    runtimeDigest: effectiveRuntimeDigest,
  })
  const repairedSpeechTimeline = repairSpeechTimelinePayloadForFreshRepairFirstAuthority({
    embodiment: repairedEmbodiment,
    embodimentScript: repairedEmbodimentScript,
    speechTimeline: input.speechTimeline,
    digitalLife: authoritativeDigitalLife,
    digitalLifeSpine: repairedDigitalLifeSpine,
    runtimeDigest: effectiveRuntimeDigest,
  })
  return {
    cardId: input.cardId,
    turnId: input.turnId,
    governance: input.governance,
    visibleReplyExecution: input.visibleReplyExecution ?? null,
    projectState: sanitizeStreamMetaObject(projectState, 520, 'projectState'),
    preDialogueAwareness: sanitizeStreamMetaObject(preDialogueAwareness, 520, 'preDialogueAwareness'),
    embodiment: sanitizeStreamMetaObject(repairedEmbodiment),
    embodimentScript: sanitizeStreamMetaObject(repairedEmbodimentScript),
    speechTimeline: sanitizeStreamMetaObject(repairedSpeechTimeline),
    digitalLife: sanitizeStreamMetaObject(repairedDigitalLife),
    digitalLifeSpine: sanitizeStreamMetaObject(repairedDigitalLifeSpine),
    residentPerformance: sanitizeStreamMetaObject(input.residentPerformance ?? null),
    runtimeDigest: sanitizeStreamMetaRuntimeDigest(effectiveRuntimeDigest),
  } satisfies AlicizationChatMetaEvent
}

export function buildAlicizationChatMetaSignature(body: Pick<AlicizationChatMetaEvent, 'visibleReplyExecution' | 'embodiment' | 'embodimentScript' | 'speechTimeline' | 'digitalLife' | 'digitalLifeSpine' | 'runtimeDigest' | 'residentPerformance'> & {
  governance?: AlicizationChatMetaEvent['governance']
}) {
  const digitalLife = resolveAuthoritativeChatMetaDigitalLife(body)
  const lastSegment = body.speechTimeline?.segments.at(-1)
  const lastFrame = digitalLife?.frames.at(-1)
  const lastVisibleSegmentFrame = resolveFrameForLastVisibleSegment({
    digitalLife,
    segmentId: lastSegment?.id ?? null,
  })
  const lastVisibleSegmentFrameIndex = lastVisibleSegmentFrame == null
    ? null
    : digitalLife?.frames.findIndex(frame => frame.id === lastVisibleSegmentFrame.id) ?? null
  const lastVisibleSegmentId = lastVisibleSegmentFrame?.id ?? lastSegment?.id ?? null
  const lastFaceCue = resolveFaceCueForSegment({
    segmentId: lastVisibleSegmentId,
    embodimentScript: body.embodimentScript,
    fallbackIndex: lastVisibleSegmentFrameIndex,
  })
  const lastLipsyncHint = resolveLipsyncHintForSegment({
    segmentId: lastVisibleSegmentId,
    embodimentScript: body.embodimentScript,
    fallbackIndex: lastVisibleSegmentFrameIndex,
  })
  const lastMotionCue = resolveMotionCueForSegment({
    segmentId: lastVisibleSegmentId,
    embodimentScript: body.embodimentScript,
    fallbackIndex: lastVisibleSegmentFrameIndex,
  })
  const lastVoiceAuthoritySource = resolveVoiceAuthoritySource({
    segmentId: lastVisibleSegmentId,
    embodimentScript: body.embodimentScript,
    fallbackIndex: lastVisibleSegmentFrameIndex,
  })
  const lastSegmentProsodySummary = lastSegment
    ? [
        Number.isFinite(lastSegment.prosodyWeight) ? `prosody=${Number(lastSegment.prosodyWeight).toFixed(2)}` : null,
        Number.isFinite(lastSegment.mouthWeight) ? `mouth=${Number(lastSegment.mouthWeight).toFixed(2)}` : null,
        Number.isFinite(lastSegment.headWeight) ? `head=${Number(lastSegment.headWeight).toFixed(2)}` : null,
      ].filter((value): value is string => Boolean(value)).join(' | ') || null
    : null
  const runtimeMemoryClosureIdentityKey = resolveRuntimeMemoryClosureIdentityKey(body.runtimeDigest)
  const baseLastSegmentRendererHintSummary = lastSegment
    ? [
        lastSegment.rendererHints?.residentMode ? `mode=${lastSegment.rendererHints.residentMode}` : null,
        lastSegment.rendererHints?.preferredBlinkCadence ? `blink=${lastSegment.rendererHints.preferredBlinkCadence}` : null,
        lastSegment.rendererHints?.preferredGazeMode ? `gaze=${lastSegment.rendererHints.preferredGazeMode}` : null,
        lastSegment.rendererHints?.preferredLipsyncMode ? `lipsync=${lastSegment.rendererHints.preferredLipsyncMode}` : null,
        lastSegment.rendererHints?.preferredMotionAliases?.[0] ? `motion=${lastSegment.rendererHints.preferredMotionAliases[0]}` : null,
        lastSegment.rendererHints?.reasonTags?.length ? `reason=${lastSegment.rendererHints.reasonTags.join(',')}` : null,
      ].filter((value): value is string => Boolean(value)).join(' | ') || null
    : null
  const lastSegmentRendererHintSummary = appendRuntimeMemoryClosureIdentitySummary(
    baseLastSegmentRendererHintSummary,
    runtimeMemoryClosureIdentityKey,
  )
  const voiceCompanionshipHints = resolveVoiceCompanionshipHints({
    lastFrame: lastVisibleSegmentFrame,
    lastSegment,
    embodiment: body.embodiment,
    embodimentScript: body.embodimentScript,
    runtimeDigest: body.runtimeDigest,
  })
  const continuityTiming = resolveContinuityTiming(body)
  const continuityReasonSummary = resolveContinuityReasonSummary(
    body,
    continuityTiming,
    voiceCompanionshipHints.companionshipMode,
  )
  const continuityReasonWithGrowth = continuityReasonSummary
  const shouldPreferRepairFirstConflictFallback = shouldPreferFreshRepairFirstSummaryFallback({
    lastSegmentResidentMode: lastSegment?.rendererHints?.residentMode ?? null,
    embodimentResidentMode: body.embodiment?.rendererHints?.residentMode ?? null,
    embodimentScriptResidentMode: body.embodimentScript?.state.residentMode ?? null,
    voiceCompanionshipMode: voiceCompanionshipHints.companionshipMode ?? null,
    runtimeDigest: body.runtimeDigest,
  })
  const summaryFallbackResidentMode = resolveSummaryFallbackResidentMode({
    lastSegmentResidentMode: lastSegment?.rendererHints?.residentMode ?? null,
    embodimentResidentMode: body.embodiment?.rendererHints?.residentMode ?? null,
    embodimentScriptResidentMode: body.embodimentScript?.state.residentMode ?? null,
    voiceCompanionshipMode: voiceCompanionshipHints.companionshipMode ?? null,
    runtimeDigest: body.runtimeDigest,
  })
  const summaryFallbackBlinkCadence = shouldPreferRepairFirstConflictFallback
    ? body.embodiment?.rendererHints?.preferredBlinkCadence
    ?? (typeof body.runtimeDigest?.projectState?.preferredBlinkCadence === 'string'
      && body.runtimeDigest.projectState.preferredBlinkCadence.trim()
      ? body.runtimeDigest.projectState.preferredBlinkCadence.trim()
      : null)
    ?? (summaryFallbackResidentMode === 'repair-before-closeness' ? 'quiet' : voiceCompanionshipHints.preferredBlinkCadence)
    : (lastSegment?.rendererHints?.preferredBlinkCadence
      ?? body.embodiment?.rendererHints?.preferredBlinkCadence
      ?? voiceCompanionshipHints.preferredBlinkCadence)
  const summaryFallbackGazeMode = shouldPreferRepairFirstConflictFallback
    ? body.embodiment?.rendererHints?.preferredGazeMode
    ?? (typeof body.runtimeDigest?.projectState?.preferredGazeMode === 'string'
      && body.runtimeDigest.projectState.preferredGazeMode.trim()
      ? body.runtimeDigest.projectState.preferredGazeMode.trim()
      : null)
    ?? (summaryFallbackResidentMode === 'measured-return'
      || summaryFallbackResidentMode === 'repair-before-closeness'
      || summaryFallbackResidentMode === 'quiet-companionship'
      ? 'soften'
      : voiceCompanionshipHints.preferredGazeMode)
    : (lastSegment?.rendererHints?.preferredGazeMode
      ?? body.embodiment?.rendererHints?.preferredGazeMode
      ?? voiceCompanionshipHints.preferredGazeMode)
  const shouldUseEmbodimentFallback = shouldProjectEmbodimentFallbackSummaries(body)
  const shouldUseResidentPresenceFallback = shouldProjectResidentPresenceFallbackSummaries(body)
  const shouldPromoteMeasuredReturnProjectClosureVoice
    = shouldPromoteMeasuredReturnProjectClosureVoiceFallback({
      body,
      companionshipMode: summaryFallbackResidentMode ?? voiceCompanionshipHints.companionshipMode ?? null,
      continuityTiming,
      continuityReasonSummary,
    })
  const shouldUseRepairFirstConflictFallback
    = shouldPreferRepairFirstConflictFallback
      && !lastVisibleSegmentFrame
      && Boolean(lastSegment)
  const repairBeforeClosenessFallbackReason
    = resolveRepairBeforeClosenessSameHerReason(body) ?? continuityReasonWithGrowth
  const normalizedEmbodiment = shouldUseEmbodimentFallback
    ? normalizeAlicizationDialogueEmbodimentEnvelope(body.embodiment)
    : null
  const fallbackSegmentId = body.embodiment?.variationToken?.trim()
    ? `segment-${body.embodiment.variationToken.trim()}`
    : null
  const shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
    = shouldOverrideVisibleSegmentWithRepairBeforeClosenessProjectAuthority({
      continuityReasonSummary,
      companionshipMode: summaryFallbackResidentMode ?? voiceCompanionshipHints.companionshipMode ?? null,
      continuityTiming,
      body,
      lastVisibleSegmentFrame,
      lastSegment,
    })
  const shouldExposeVoiceEmotionAuthority
    = shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
      || summaryFallbackResidentMode === 'repair-before-closeness'
      || continuityTiming === 'audible-body-carry'
  const lastVisibleSegmentVoiceEmotion = shouldExposeVoiceEmotionAuthority
    ? shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
      ? 'concerned'
      : body.embodiment?.emotion === 'concerned'
        && (
          lastVisibleSegmentFrame?.face.rendererHints?.residentMode === 'measured-return'
          || lastVisibleSegmentFrame?.face.rendererHints?.residentMode === 'repair-before-closeness'
          || lastSegment?.rendererHints?.residentMode === 'measured-return'
          || lastSegment?.rendererHints?.residentMode === 'repair-before-closeness'
          || body.embodimentScript?.state?.residentMode === 'measured-return'
          || body.embodimentScript?.state?.residentMode === 'repair-before-closeness'
        )
        ? 'concerned'
        : (lastVisibleSegmentFrame?.face.emotion ?? lastSegment?.emotion ?? body.embodiment?.emotion ?? null)
    : null
  const repairFirstFallbackVoiceEmotion = shouldExposeVoiceEmotionAuthority
    ? body.embodiment?.emotion === 'concerned'
    && (
      summaryFallbackResidentMode === 'repair-before-closeness'
      || body.embodimentScript?.state?.residentMode === 'repair-before-closeness'
    )
      ? 'concerned'
      : summaryFallbackResidentMode === 'repair-before-closeness'
        ? 'thinking'
        : (body.embodiment?.emotion ?? null)
    : null
  const lastSegmentVoiceEmotion = shouldExposeVoiceEmotionAuthority
    ? body.embodiment?.emotion === 'concerned'
    && (
      summaryFallbackResidentMode === 'measured-return'
      || summaryFallbackResidentMode === 'repair-before-closeness'
      || body.embodimentScript?.state?.residentMode === 'measured-return'
      || body.embodimentScript?.state?.residentMode === 'repair-before-closeness'
    )
      ? 'concerned'
      : (digitalLife?.face.emotion ?? lastSegment?.emotion ?? body.embodiment?.emotion ?? null)
    : null
  const residentPresenceVoiceEmotion = shouldExposeVoiceEmotionAuthority
    ? (body.embodiment?.emotion ?? 'thinking')
    : null
  const lastSegmentVoiceSummary = lastVisibleSegmentFrame
    ? buildAlicizationVoiceSummary({
        pitchDelta: lastVisibleSegmentFrame.voice.pitchDelta,
        rateMultiplier: lastVisibleSegmentFrame.voice.rateMultiplier,
        energy: lastVisibleSegmentFrame.voice.energy,
        cadence: lastVisibleSegmentFrame.voice.cadence,
        emotion: lastVisibleSegmentVoiceEmotion,
        companionshipMode: voiceCompanionshipHints.companionshipMode,
        continuityTiming,
        reasonSummary: continuityReasonWithGrowth,
        preferredBlinkCadence: voiceCompanionshipHints.preferredBlinkCadence,
        preferredGazeMode: voiceCompanionshipHints.preferredGazeMode,
        source: lastVoiceAuthoritySource,
        segmentId: lastVisibleSegmentFrame.id ?? lastSegment?.id ?? null,
      })
    : shouldUseRepairFirstConflictFallback
      ? buildAlicizationVoiceSummary({
          pitchDelta: body.embodiment?.speechStyle?.pitchDelta
            ?? (summaryFallbackResidentMode === 'measured-return'
              ? -3
              : normalizedEmbodiment?.speechStyle.pitchDelta ?? null),
          rateMultiplier: body.embodiment?.speechStyle?.rateMultiplier ?? normalizedEmbodiment?.speechStyle.rateMultiplier ?? null,
          energy: summaryFallbackResidentMode === 'repair-before-closeness' ? 0.46 : 0.55,
          cadence: summaryFallbackResidentMode === 'repair-before-closeness' ? 0.4 : 0.52,
          emotion: repairFirstFallbackVoiceEmotion,
          companionshipMode: summaryFallbackResidentMode,
          continuityTiming,
          reasonSummary: summaryFallbackResidentMode === 'repair-before-closeness'
            ? repairBeforeClosenessFallbackReason
            : continuityReasonWithGrowth,
          preferredBlinkCadence: summaryFallbackBlinkCadence,
          preferredGazeMode: summaryFallbackGazeMode,
          segmentId: lastSegment?.id ?? fallbackSegmentId,
        })
      : lastSegment
        ? buildAlicizationVoiceSummary({
            pitchDelta: shouldPromoteMeasuredReturnProjectClosureVoice
              ? (body.embodiment?.speechStyle?.pitchDelta ?? -3)
              : (digitalLife?.voice.pitchDelta ?? digitalLife?.speechStyle?.pitchDelta ?? null),
            rateMultiplier: digitalLife?.voice.rateMultiplier ?? digitalLife?.speechStyle?.rateMultiplier ?? null,
            energy: shouldPromoteMeasuredReturnProjectClosureVoice
              ? 0.55
              : digitalLife?.voice.energy ?? null,
            cadence: shouldPromoteMeasuredReturnProjectClosureVoice
              ? 0.52
              : digitalLife?.voice.cadence ?? null,
            emotion: lastSegmentVoiceEmotion,
            companionshipMode: summaryFallbackResidentMode,
            continuityTiming,
            reasonSummary: continuityReasonWithGrowth,
            preferredBlinkCadence: summaryFallbackBlinkCadence,
            preferredGazeMode: summaryFallbackGazeMode,
            source: lastVoiceAuthoritySource,
            segmentId: lastSegment.id ?? null,
          })
        : shouldUseResidentPresenceFallback
          ? buildAlicizationVoiceSummary({
              pitchDelta: body.embodiment?.speechStyle?.pitchDelta ?? -2,
              rateMultiplier: body.embodiment?.speechStyle?.rateMultiplier ?? 0.95,
              energy: 0.46,
              cadence: 0.4,
              emotion: residentPresenceVoiceEmotion,
              companionshipMode: summaryFallbackResidentMode ?? voiceCompanionshipHints.companionshipMode ?? 'quiet-companionship',
              continuityTiming,
              reasonSummary: continuityReasonWithGrowth,
              preferredBlinkCadence: summaryFallbackBlinkCadence ?? 'linger',
              preferredGazeMode: summaryFallbackGazeMode ?? 'soften',
              source: 'resident-authority',
              segmentId: fallbackSegmentId,
            })
          : shouldUseEmbodimentFallback
            ? buildAlicizationVoiceSummary({
                pitchDelta: body.embodiment?.speechStyle?.pitchDelta
                  ?? (summaryFallbackResidentMode === 'measured-return'
                    ? -3
                    : normalizedEmbodiment?.speechStyle.pitchDelta ?? null),
                rateMultiplier: normalizedEmbodiment?.speechStyle.rateMultiplier ?? null,
                energy: summaryFallbackResidentMode === 'repair-before-closeness' ? 0.46 : 0.55,
                cadence: summaryFallbackResidentMode === 'repair-before-closeness' ? 0.4 : 0.52,
                emotion: repairFirstFallbackVoiceEmotion,
                companionshipMode: summaryFallbackResidentMode,
                continuityTiming,
                reasonSummary: summaryFallbackResidentMode === 'repair-before-closeness'
                  ? repairBeforeClosenessFallbackReason
                  : continuityReasonWithGrowth,
                preferredBlinkCadence: summaryFallbackBlinkCadence,
                preferredGazeMode: summaryFallbackGazeMode,
                segmentId: fallbackSegmentId,
              })
            : null
  const promotedMeasuredReturnProjectClosureVoiceSummary = shouldOverrideVisibleSegmentVoiceWithMeasuredReturnProjectClosure({
    lastVoiceSummary: lastSegmentVoiceSummary,
    continuityReasonSummary,
    companionshipMode: summaryFallbackResidentMode ?? voiceCompanionshipHints.companionshipMode ?? null,
    continuityTiming,
    body,
  })
    ? buildAlicizationVoiceSummary({
        pitchDelta: body.embodiment?.speechStyle?.pitchDelta
          ?? (summaryFallbackResidentMode === 'measured-return' ? -3 : null),
        rateMultiplier: digitalLife?.voice.rateMultiplier
          ?? digitalLife?.speechStyle?.rateMultiplier
          ?? body.embodiment?.speechStyle?.rateMultiplier
          ?? null,
        energy: 0.55,
        cadence: 0.52,
        emotion: shouldExposeVoiceEmotionAuthority ? lastSegmentVoiceEmotion : null,
        companionshipMode: summaryFallbackResidentMode ?? voiceCompanionshipHints.companionshipMode ?? null,
        continuityTiming,
        reasonSummary: continuityReasonWithGrowth,
        preferredBlinkCadence: summaryFallbackBlinkCadence,
        preferredGazeMode: summaryFallbackGazeMode,
        source: lastVoiceAuthoritySource,
        segmentId: lastVisibleSegmentFrame?.id ?? lastSegment?.id ?? fallbackSegmentId,
      })
    : null
  const promotedRepairFirstProjectAuthorityVoiceSummary
    = shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
      ? buildAlicizationVoiceSummary({
          pitchDelta: body.embodiment?.speechStyle?.pitchDelta
            ?? digitalLife?.voice.pitchDelta
            ?? digitalLife?.speechStyle?.pitchDelta
            ?? null,
          rateMultiplier: body.embodiment?.speechStyle?.rateMultiplier
            ?? digitalLife?.voice.rateMultiplier
            ?? digitalLife?.speechStyle?.rateMultiplier
            ?? null,
          energy: 0.46,
          cadence: 0.4,
          emotion: 'concerned',
          companionshipMode: 'repair-before-closeness',
          continuityTiming,
          reasonSummary: continuityReasonWithGrowth,
          preferredBlinkCadence: summaryFallbackBlinkCadence ?? 'quiet',
          preferredGazeMode: summaryFallbackGazeMode ?? 'soften',
          segmentId: lastVisibleSegmentFrame?.id ?? lastSegment?.id ?? fallbackSegmentId,
        })
      : null
  const resolvedLastSegmentVoiceSummary
    = appendRuntimeMemoryClosureIdentitySummary(
      promotedRepairFirstProjectAuthorityVoiceSummary
      ?? promotedMeasuredReturnProjectClosureVoiceSummary
      ?? lastSegmentVoiceSummary,
      runtimeMemoryClosureIdentityKey,
    )
  const baseLastSegmentFaceSummary = lastVisibleSegmentFrame
    ? buildAlicizationFaceSummary({
        emotion:
          shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
            ? 'concerned'
            : body.embodiment?.emotion === 'concerned'
              && (
                lastVisibleSegmentFrame.face.rendererHints?.residentMode === 'measured-return'
                || lastVisibleSegmentFrame.face.rendererHints?.residentMode === 'repair-before-closeness'
                || lastSegment?.rendererHints?.residentMode === 'measured-return'
                || lastSegment?.rendererHints?.residentMode === 'repair-before-closeness'
                || body.embodimentScript?.state?.residentMode === 'measured-return'
                || body.embodimentScript?.state?.residentMode === 'repair-before-closeness'
              )
              ? 'concerned'
              : (lastVisibleSegmentFrame.face.emotion ?? lastSegment?.emotion ?? body.embodiment?.emotion ?? null),
        facialCue: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? 'soft_concern'
          : (lastVisibleSegmentFrame.face.facialCue ?? lastSegment?.facialCue ?? body.embodiment?.performance.facialCue ?? null),
        expressionMode: lastVisibleSegmentFrame.face.expressionMode,
        intensity: lastVisibleSegmentFrame.face.intensity,
        holdMs: lastVisibleSegmentFrame.face.holdMs,
        preUtteranceCue: lastFaceCue?.preUtteranceCue,
        postUtteranceCue: lastFaceCue?.postUtteranceCue,
        residentMode: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? 'repair-before-closeness'
          : (lastVisibleSegmentFrame.face.rendererHints?.residentMode
            ?? lastSegment?.rendererHints?.residentMode
            ?? voiceCompanionshipHints.companionshipMode),
        continuityTiming,
        reasonSummary: continuityReasonWithGrowth,
        preferredBlinkCadence: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? (summaryFallbackBlinkCadence ?? 'quiet')
          : (lastVisibleSegmentFrame.face.rendererHints?.preferredBlinkCadence
            ?? lastSegment?.rendererHints?.preferredBlinkCadence
            ?? voiceCompanionshipHints.preferredBlinkCadence),
        preferredGazeMode: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? (summaryFallbackGazeMode ?? 'soften')
          : (lastVisibleSegmentFrame.face.rendererHints?.preferredGazeMode
            ?? lastSegment?.rendererHints?.preferredGazeMode
            ?? voiceCompanionshipHints.preferredGazeMode),
        source: lastFaceCue?.source ?? null,
        confidence: lastFaceCue?.confidence ?? null,
        segmentId: lastVisibleSegmentFrame.id ?? lastFaceCue?.segmentId ?? lastSegment?.id ?? null,
      })
    : shouldUseRepairFirstConflictFallback
      ? buildAlicizationFaceSummary({
          emotion: body.embodiment?.emotion === 'concerned'
            && (
              summaryFallbackResidentMode === 'repair-before-closeness'
              || body.embodimentScript?.state?.residentMode === 'repair-before-closeness'
            )
            ? 'concerned'
            : summaryFallbackResidentMode === 'repair-before-closeness'
              ? 'thinking'
              : (body.embodiment?.emotion ?? null),
          facialCue: body.embodiment?.performance.facialCue ?? lastSegment?.facialCue ?? null,
          expressionMode: 'hold',
          residentMode: summaryFallbackResidentMode,
          continuityTiming,
          reasonSummary: summaryFallbackResidentMode === 'repair-before-closeness'
            ? repairBeforeClosenessFallbackReason
            : continuityReasonWithGrowth,
          preferredBlinkCadence: summaryFallbackBlinkCadence,
          preferredGazeMode: summaryFallbackGazeMode,
          segmentId: lastSegment?.id ?? fallbackSegmentId,
        })
      : lastSegment
        ? buildAlicizationFaceSummary({
            emotion:
            body.embodiment?.emotion === 'concerned'
            && (
              summaryFallbackResidentMode === 'measured-return'
              || summaryFallbackResidentMode === 'repair-before-closeness'
              || body.embodimentScript?.state?.residentMode === 'measured-return'
              || body.embodimentScript?.state?.residentMode === 'repair-before-closeness'
            )
              ? 'concerned'
              : (digitalLife?.face.emotion ?? lastSegment?.emotion ?? body.embodiment?.emotion ?? null),
            facialCue: digitalLife?.face.facialCue ?? lastSegment?.facialCue ?? body.embodiment?.performance.facialCue ?? null,
            expressionMode: digitalLife?.face.expressionMode ?? null,
            intensity: digitalLife?.face.intensity ?? null,
            holdMs: digitalLife?.face.holdMs ?? lastFaceCue?.holdMs ?? lastSegment?.emotionHoldMs ?? null,
            preUtteranceCue: lastFaceCue?.preUtteranceCue,
            postUtteranceCue: lastFaceCue?.postUtteranceCue,
            residentMode: summaryFallbackResidentMode,
            continuityTiming,
            reasonSummary: continuityReasonWithGrowth,
            preferredBlinkCadence: summaryFallbackBlinkCadence,
            preferredGazeMode: summaryFallbackGazeMode,
            source: lastFaceCue?.source ?? null,
            confidence: lastFaceCue?.confidence ?? null,
            segmentId: lastFaceCue?.segmentId ?? lastSegment?.id ?? null,
          })
        : shouldUseEmbodimentFallback
          ? buildAlicizationFaceSummary({
              emotion: body.embodiment?.emotion === 'concerned'
                && (
                  summaryFallbackResidentMode === 'repair-before-closeness'
                  || body.embodimentScript?.state?.residentMode === 'repair-before-closeness'
                )
                ? 'concerned'
                : summaryFallbackResidentMode === 'repair-before-closeness'
                  ? 'thinking'
                  : (body.embodiment?.emotion ?? null),
              facialCue: body.embodiment?.performance.facialCue ?? null,
              expressionMode: 'hold',
              residentMode: summaryFallbackResidentMode,
              continuityTiming,
              reasonSummary: summaryFallbackResidentMode === 'repair-before-closeness'
                ? repairBeforeClosenessFallbackReason
                : continuityReasonWithGrowth,
              preferredBlinkCadence: summaryFallbackBlinkCadence,
              preferredGazeMode: summaryFallbackGazeMode,
              segmentId: fallbackSegmentId,
            })
          : shouldUseResidentPresenceFallback
            ? buildAlicizationFaceSummary({
                emotion: body.embodiment?.emotion ?? 'thinking',
                facialCue: body.embodiment?.performance.facialCue ?? null,
                expressionMode: 'hold',
                residentMode: summaryFallbackResidentMode ?? 'quiet-companionship',
                continuityTiming,
                reasonSummary: continuityReasonWithGrowth,
                preferredBlinkCadence: summaryFallbackBlinkCadence ?? 'linger',
                preferredGazeMode: summaryFallbackGazeMode ?? 'soften',
                segmentId: fallbackSegmentId,
              })
            : null
  const lastSegmentFaceSummary = appendRuntimeMemoryClosureIdentitySummary(
    baseLastSegmentFaceSummary,
    runtimeMemoryClosureIdentityKey,
  )
  const baseLastSegmentMotionSummary = lastVisibleSegmentFrame
    ? buildAlicizationMotionSummary({
        actionCue: lastVisibleSegmentFrame.action.actionCue,
        residentMode: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? 'repair-before-closeness'
          : (lastVisibleSegmentFrame.action.rendererHints?.residentMode
            ?? lastSegment?.rendererHints?.residentMode
            ?? voiceCompanionshipHints.companionshipMode),
        continuityTiming,
        reasonSummary: continuityReasonWithGrowth,
        preferredBlinkCadence: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? (summaryFallbackBlinkCadence ?? 'quiet')
          : (lastVisibleSegmentFrame.action.rendererHints?.preferredBlinkCadence
            ?? lastSegment?.rendererHints?.preferredBlinkCadence
            ?? voiceCompanionshipHints.preferredBlinkCadence),
        preferredGazeMode: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? (summaryFallbackGazeMode ?? 'soften')
          : (lastVisibleSegmentFrame.action.rendererHints?.preferredGazeMode
            ?? lastSegment?.rendererHints?.preferredGazeMode
            ?? voiceCompanionshipHints.preferredGazeMode),
        holdMs: lastVisibleSegmentFrame.action.holdMs,
        source: lastMotionCue?.source ?? null,
        confidence: lastMotionCue?.confidence ?? null,
        segmentId: lastVisibleSegmentFrame.id ?? lastSegment?.id ?? null,
      })
    : shouldUseRepairFirstConflictFallback
      ? buildAlicizationMotionSummary({
          actionCue: body.embodiment?.performance.actionCue ?? lastSegment?.actionCue ?? null,
          residentMode: summaryFallbackResidentMode,
          continuityTiming,
          reasonSummary: summaryFallbackResidentMode === 'repair-before-closeness'
            ? repairBeforeClosenessFallbackReason
            : continuityReasonWithGrowth,
          preferredBlinkCadence: summaryFallbackBlinkCadence,
          preferredGazeMode: summaryFallbackGazeMode,
          holdMs: 300,
          segmentId: lastSegment?.id ?? fallbackSegmentId,
        })
      : lastSegment
        ? buildAlicizationMotionSummary({
            actionCue: digitalLife?.action.actionCue ?? lastSegment?.actionCue ?? body.embodiment?.performance.actionCue ?? null,
            residentMode: summaryFallbackResidentMode,
            continuityTiming,
            reasonSummary: continuityReasonWithGrowth,
            preferredBlinkCadence: summaryFallbackBlinkCadence,
            preferredGazeMode: summaryFallbackGazeMode,
            holdMs: digitalLife?.action.holdMs ?? lastSegment?.actionHoldMs ?? lastMotionCue?.holdMs ?? null,
            source: lastMotionCue?.source ?? null,
            confidence: lastMotionCue?.confidence ?? null,
            segmentId: lastSegment.id ?? null,
          })
        : shouldUseEmbodimentFallback
          ? buildAlicizationMotionSummary({
              actionCue: body.embodiment?.performance.actionCue ?? null,
              residentMode: summaryFallbackResidentMode,
              continuityTiming,
              reasonSummary: summaryFallbackResidentMode === 'repair-before-closeness'
                ? repairBeforeClosenessFallbackReason
                : continuityReasonWithGrowth,
              preferredBlinkCadence: summaryFallbackBlinkCadence,
              preferredGazeMode: summaryFallbackGazeMode,
              holdMs: 300,
              segmentId: fallbackSegmentId,
            })
          : shouldUseResidentPresenceFallback
            ? buildAlicizationMotionSummary({
                actionCue: body.embodiment?.performance.actionCue ?? null,
                residentMode: summaryFallbackResidentMode ?? 'quiet-companionship',
                continuityTiming,
                reasonSummary: continuityReasonWithGrowth,
                preferredBlinkCadence: summaryFallbackBlinkCadence ?? 'linger',
                preferredGazeMode: summaryFallbackGazeMode ?? 'soften',
                holdMs: 300,
                segmentId: fallbackSegmentId,
              })
            : null
  const lastSegmentMotionSummary = appendRuntimeMemoryClosureIdentitySummary(
    baseLastSegmentMotionSummary,
    runtimeMemoryClosureIdentityKey,
  )
  const baseLastSegmentLipSyncSummary = lastVisibleSegmentFrame
    ? buildAlicizationLipsyncSummary({
        mode: lastVisibleSegmentFrame.lipSync.mode,
        phase: resolveLipSyncPhase((lastVisibleSegmentFrame.lipSync as { phase?: unknown }).phase),
        continuityHoldMs: shouldPromoteLipSyncContinuityForCueBridgeRealignment({
          lastVisibleSegmentFrame,
          lastSegment,
          lastFaceCue,
        })
          ? Math.max(Number(lastVisibleSegmentFrame.lipSync.continuityHoldMs) || 0, 360)
          : lastVisibleSegmentFrame.lipSync.continuityHoldMs,
        topViseme: resolveLipSyncTopViseme((lastVisibleSegmentFrame.lipSync as { topViseme?: unknown }).topViseme),
        hintTrail: resolveLipSyncHintTrail((lastVisibleSegmentFrame.lipSync as { hintTrail?: unknown }).hintTrail),
        hintViseme: typeof (lastVisibleSegmentFrame.lipSync as { hintViseme?: unknown }).hintViseme === 'string'
          ? (lastVisibleSegmentFrame.lipSync as { hintViseme?: string }).hintViseme?.trim()
          : null,
        companionshipMode: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? 'repair-before-closeness'
          : (lastVisibleSegmentFrame.face.rendererHints?.residentMode
            ?? lastVisibleSegmentFrame.action.rendererHints?.residentMode
            ?? lastSegment?.rendererHints?.residentMode
            ?? voiceCompanionshipHints.companionshipMode),
        continuityTiming,
        reasonSummary: continuityReasonWithGrowth,
        preferredBlinkCadence: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? (summaryFallbackBlinkCadence ?? 'quiet')
          : (lastVisibleSegmentFrame.face.rendererHints?.preferredBlinkCadence
            ?? lastVisibleSegmentFrame.action.rendererHints?.preferredBlinkCadence
            ?? lastSegment?.rendererHints?.preferredBlinkCadence
            ?? voiceCompanionshipHints.preferredBlinkCadence),
        preferredGazeMode: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? (summaryFallbackGazeMode ?? 'soften')
          : (lastVisibleSegmentFrame.face.rendererHints?.preferredGazeMode
            ?? lastVisibleSegmentFrame.action.rendererHints?.preferredGazeMode
            ?? lastSegment?.rendererHints?.preferredGazeMode
            ?? voiceCompanionshipHints.preferredGazeMode),
        visemeBias: lastVisibleSegmentFrame.lipSync.visemeBias,
        energyBias: lastVisibleSegmentFrame.lipSync.energyBias,
        mouthScale: lastVisibleSegmentFrame.lipSync.mouthScale,
        source: lastLipsyncHint?.source ?? null,
        confidence: lastLipsyncHint?.confidence ?? null,
        segmentId: lastVisibleSegmentFrame.id ?? lastLipsyncHint?.segmentId ?? lastSegment?.id ?? null,
      })
    : shouldUseRepairFirstConflictFallback
      ? buildAlicizationLipsyncSummary({
          mode: summaryFallbackResidentMode === 'repair-before-closeness'
            ? 'closed'
            : 'energy-phoneme-hybrid',
          continuityHoldMs: 300,
          companionshipMode: summaryFallbackResidentMode,
          continuityTiming,
          reasonSummary: summaryFallbackResidentMode === 'repair-before-closeness'
            ? repairBeforeClosenessFallbackReason
            : continuityReasonWithGrowth,
          preferredBlinkCadence: summaryFallbackBlinkCadence,
          preferredGazeMode: summaryFallbackGazeMode,
          segmentId: lastSegment?.id ?? fallbackSegmentId,
        })
      : lastSegment
        ? buildAlicizationLipsyncSummary({
            mode: digitalLife?.lipSync.mode ?? body.embodimentScript?.lipsyncPlan.mode ?? null,
            phase: resolveLipSyncPhase((digitalLife?.lipSync as { phase?: unknown } | null | undefined)?.phase),
            continuityHoldMs: digitalLife?.lipSync.continuityHoldMs ?? null,
            hintViseme: typeof (lastLipsyncHint as { viseme?: unknown } | null | undefined)?.viseme === 'string'
              ? (lastLipsyncHint as { viseme?: string }).viseme?.trim() ?? null
              : null,
            companionshipMode: summaryFallbackResidentMode,
            continuityTiming,
            reasonSummary: continuityReasonWithGrowth,
            preferredBlinkCadence: summaryFallbackBlinkCadence,
            preferredGazeMode: summaryFallbackGazeMode,
            visemeBias: digitalLife?.lipSync.visemeBias ?? null,
            energyBias: digitalLife?.lipSync.energyBias ?? null,
            mouthScale: digitalLife?.lipSync.mouthScale ?? null,
            source: lastLipsyncHint?.source ?? null,
            confidence: lastLipsyncHint?.confidence ?? null,
            segmentId: lastLipsyncHint?.segmentId ?? lastSegment?.id ?? null,
          })
        : shouldUseEmbodimentFallback
          ? buildAlicizationLipsyncSummary({
              mode: summaryFallbackResidentMode === 'repair-before-closeness'
                ? 'closed'
                : 'energy-phoneme-hybrid',
              continuityHoldMs: 300,
              companionshipMode: summaryFallbackResidentMode,
              continuityTiming,
              reasonSummary: summaryFallbackResidentMode === 'repair-before-closeness'
                ? repairBeforeClosenessFallbackReason
                : continuityReasonWithGrowth,
              preferredBlinkCadence: summaryFallbackBlinkCadence,
              preferredGazeMode: summaryFallbackGazeMode,
              segmentId: fallbackSegmentId,
            })
          : shouldUseResidentPresenceFallback
            ? buildAlicizationLipsyncSummary({
                mode: 'closed',
                continuityHoldMs: 300,
                companionshipMode: summaryFallbackResidentMode ?? 'quiet-companionship',
                continuityTiming,
                reasonSummary: continuityReasonWithGrowth,
                preferredBlinkCadence: summaryFallbackBlinkCadence ?? 'linger',
                preferredGazeMode: summaryFallbackGazeMode ?? 'soften',
                segmentId: fallbackSegmentId,
              })
            : null
  const lastSegmentLipSyncSummary = appendRuntimeMemoryClosureIdentitySummary(
    baseLastSegmentLipSyncSummary,
    runtimeMemoryClosureIdentityKey,
  )
  const baseLastSegmentBodyContinuitySummary = lastVisibleSegmentFrame
    ? buildResidentBodyContinuitySummary({
        frameMode: lastVisibleSegmentFrame.mode ?? digitalLife?.mode ?? null,
        motor: lastVisibleSegmentFrame.motor as unknown as Record<string, unknown> | null | undefined,
        residentMode: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? 'repair-before-closeness'
          : (lastVisibleSegmentFrame.face.rendererHints?.residentMode
            ?? lastVisibleSegmentFrame.action.rendererHints?.residentMode
            ?? lastSegment?.rendererHints?.residentMode
            ?? voiceCompanionshipHints.companionshipMode),
        continuityTiming,
        reasonSummary: continuityReasonWithGrowth,
        preferredBlinkCadence: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? (summaryFallbackBlinkCadence ?? 'quiet')
          : (lastVisibleSegmentFrame.face.rendererHints?.preferredBlinkCadence
            ?? lastVisibleSegmentFrame.action.rendererHints?.preferredBlinkCadence
            ?? lastSegment?.rendererHints?.preferredBlinkCadence
            ?? voiceCompanionshipHints.preferredBlinkCadence),
        preferredGazeMode: shouldOverrideVisibleSegmentWithRepairFirstProjectAuthority
          ? (summaryFallbackGazeMode ?? 'soften')
          : (lastVisibleSegmentFrame.face.rendererHints?.preferredGazeMode
            ?? lastVisibleSegmentFrame.action.rendererHints?.preferredGazeMode
            ?? lastSegment?.rendererHints?.preferredGazeMode
            ?? voiceCompanionshipHints.preferredGazeMode),
        segmentId: lastVisibleSegmentFrame.id ?? lastSegment?.id ?? null,
      })
    : lastSegment
      ? buildResidentBodyContinuitySummary({
          frameMode: digitalLife?.mode ?? null,
          motor: digitalLife?.motor as unknown as Record<string, unknown> | null | undefined,
          residentMode: summaryFallbackResidentMode,
          continuityTiming,
          currentBodyState: body.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority?.currentBodyState ?? null,
          reasonSummary: continuityReasonWithGrowth,
          preferredBlinkCadence: summaryFallbackBlinkCadence,
          preferredGazeMode: summaryFallbackGazeMode,
          segmentId: lastSegment.id ?? fallbackSegmentId,
        })
      : shouldUseResidentPresenceFallback
        ? buildResidentBodyContinuitySummary({
            frameMode: digitalLife?.mode ?? null,
            motor: digitalLife?.motor as unknown as Record<string, unknown> | null | undefined,
            residentMode: summaryFallbackResidentMode ?? 'quiet-companionship',
            continuityTiming,
            currentBodyState: body.runtimeDigest?.currentConsciousFrame?.selfContinuityAuthority?.currentBodyState ?? null,
            reasonSummary: continuityReasonWithGrowth,
            preferredBlinkCadence: summaryFallbackBlinkCadence ?? 'linger',
            preferredGazeMode: summaryFallbackGazeMode ?? 'soften',
            segmentId: fallbackSegmentId,
          })
        : null
  const lastSegmentBodyContinuitySummary = appendRuntimeMemoryClosureIdentitySummary(
    baseLastSegmentBodyContinuitySummary,
    runtimeMemoryClosureIdentityKey,
  )
  const residentPresenceSummary = resolveResidentPresenceSummary(body)
  return JSON.stringify({
    decisionTraceId: body.governance?.decisionTraceId ?? null,
    visibleReplyExecutionMode: body.visibleReplyExecution?.mode ?? null,
    visibleReplyExecutionAuthority: body.visibleReplyExecution?.actualVisibleReplyAuthority ?? null,
    visibleReplyExecutionProviderMind: body.visibleReplyExecution?.providerMindExecuted ?? null,
    emotion: body.embodiment?.emotion ?? null,
    variationToken: body.embodiment?.variationToken ?? null,
    postureHint: body.embodiment?.postureHint ?? null,
    preferredExpressionAlias: body.embodiment?.rendererHints?.preferredExpressionAliases?.[0] ?? null,
    preferredMotionAlias: body.embodiment?.rendererHints?.preferredMotionAliases?.[0] ?? null,
    embodimentScriptVersion: body.embodimentScript?.version ?? null,
    embodimentScriptTurnId: body.embodimentScript?.turnId ?? null,
    embodimentScriptDecisionTraceId: body.embodimentScript?.decisionTraceId ?? null,
    embodimentScriptRendererTarget: body.embodimentScript?.rendererTarget ?? null,
    embodimentScriptResidentMode: body.embodimentScript?.state.residentMode ?? null,
    embodimentScriptDelivery: body.embodimentScript?.state.delivery ?? null,
    embodimentScriptFacePreUtteranceCue: body.embodimentScript?.facePlan.preUtteranceCue ?? null,
    embodimentScriptFacePostUtteranceCue: body.embodimentScript?.facePlan.postUtteranceCue ?? null,
    embodimentScriptMotionIdleBase: body.embodimentScript?.motionPlan.idleBase ?? null,
    embodimentScriptMotionAttentionMode: body.embodimentScript?.motionPlan.attentionMode ?? null,
    embodimentScriptLipSyncMode: body.embodimentScript?.lipsyncPlan.mode ?? null,
    embodimentScriptSegmentCount: body.embodimentScript?.speechPlan?.segments.length ?? 0,
    segmentCount: body.speechTimeline?.segments.length ?? 0,
    replyChars: body.speechTimeline?.reply.length ?? 0,
    lastSegmentEndOffset: lastSegment?.endOffset ?? null,
    lastSegmentEmotion: lastSegment?.emotion ?? null,
    lastSegmentEmotionHoldMs: lastSegment?.emotionHoldMs ?? null,
    lastSegmentSettleMode: lastSegment?.settleMode ?? null,
    lastSegmentLive2DFacialReleaseMs: lastSegment?.rendererSettle?.live2dFacialReleaseMs ?? null,
    lastSegmentVrmExpressionBlendMs: lastSegment?.rendererSettle?.vrmExpressionBlendMs ?? null,
    lastSegmentVrmActionFadeMs: lastSegment?.rendererSettle?.vrmActionFadeMs ?? null,
    lastSegmentLive2DMotionFollowThroughMs: lastSegment?.rendererSettle?.live2dMotionFollowThroughMs ?? null,
    lastSegmentPreferredExpressionAlias: lastSegment?.rendererHints?.preferredExpressionAliases?.[0] ?? null,
    lastSegmentPreferredMotionAlias: lastSegment?.rendererHints?.preferredMotionAliases?.[0] ?? null,
    lastSegmentPreferredLipsyncMode: lastSegment?.rendererHints?.preferredLipsyncMode ?? null,
    lastSegmentRendererReasonTags: lastSegment?.rendererHints?.reasonTags ?? null,
    lastSegmentResidentMode: lastSegment?.rendererHints?.residentMode ?? null,
    lastSegmentPreferredBlinkCadence: lastSegment?.rendererHints?.preferredBlinkCadence ?? null,
    lastSegmentPreferredGazeMode: lastSegment?.rendererHints?.preferredGazeMode ?? null,
    lastSegmentContinuityTiming: continuityTiming,
    lastSegmentProsodySummary,
    lastSegmentRendererHintSummary,
    lastSegmentVoiceSummary: resolvedLastSegmentVoiceSummary,
    lastSegmentFaceSummary,
    lastSegmentMotionSummary,
    lastSegmentLipSyncSummary,
    lastSegmentBodyContinuitySummary,
    residentPresenceSummary,
    lastActionCue: lastVisibleSegmentFrame?.action.actionCue
      ?? lastSegment?.actionCue
      ?? digitalLife?.action.actionCue
      ?? body.embodiment?.performance.actionCue
      ?? null,
    lastFacialCue: lastSegment?.facialCue ?? body.embodiment?.performance.facialCue ?? null,
    digitalLifeMode: digitalLife?.mode ?? null,
    digitalLifeVoicePitchDelta: digitalLife?.voice.pitchDelta ?? null,
    digitalLifeVoiceRateMultiplier: digitalLife?.voice.rateMultiplier ?? null,
    digitalLifeVoiceEnergy: digitalLife?.voice.energy ?? null,
    digitalLifeVoiceCadence: digitalLife?.voice.cadence ?? null,
    digitalLifeLipSyncMode: digitalLife?.lipSync.mode ?? null,
    digitalLifeLipSyncContinuityHoldMs: digitalLife?.lipSync.continuityHoldMs ?? null,
    digitalLifeFaceExpressionMode: digitalLife?.face.expressionMode ?? null,
    digitalLifeFaceHoldMs: digitalLife?.face.holdMs ?? null,
    digitalLifeActionMode: digitalLife?.action.actionMode ?? null,
    digitalLifeActionHoldMs: digitalLife?.action.holdMs ?? null,
    digitalLifeFrameCount: digitalLife?.frames.length ?? 0,
    digitalLifeLastFrameMode: lastFrame?.mode ?? null,
    digitalLifeLastFrameVoicePitchDelta: lastFrame?.voice.pitchDelta ?? null,
    digitalLifeLastFrameVoiceRateMultiplier: lastFrame?.voice.rateMultiplier ?? null,
    digitalLifeLastFrameVoiceEnergy: lastFrame?.voice.energy ?? null,
    digitalLifeLastFrameVoiceCadence: lastFrame?.voice.cadence ?? null,
    digitalLifeLastFrameFaceResidentMode: lastFrame?.face.rendererHints?.residentMode ?? null,
    digitalLifeLastFrameFaceBlinkCadence: lastFrame?.face.rendererHints?.preferredBlinkCadence ?? null,
    digitalLifeLastFrameFaceGazeMode: lastFrame?.face.rendererHints?.preferredGazeMode ?? null,
    digitalLifeLastFrameActionResidentMode: lastFrame?.action.rendererHints?.residentMode ?? null,
    digitalLifeLastFrameActionBlinkCadence: lastFrame?.action.rendererHints?.preferredBlinkCadence ?? null,
    digitalLifeLastFrameActionGazeMode: lastFrame?.action.rendererHints?.preferredGazeMode ?? null,
    digitalLifeLastActionMode: lastFrame?.action.actionMode ?? null,
    digitalLifeLastLipSyncMode: lastFrame?.lipSync.mode ?? null,
    digitalLifeLastFrameLipSyncContinuityHoldMs: lastFrame?.lipSync.continuityHoldMs ?? null,
    digitalLifeLastFrameFaceExpressionMode: lastFrame?.face.expressionMode ?? null,
    digitalLifeLastFrameFaceHoldMs: lastFrame?.face.holdMs ?? null,
    digitalLifeLastFrameActionHoldMs: lastFrame?.action.holdMs ?? null,
    digitalLifeLine: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.continuitySignal?.summary ?? null),
    digitalLifeOperatingMode: body.digitalLifeSpine?.architecture?.operatingMode ?? null,
    digitalLifeDominantSystem: body.digitalLifeSpine?.architecture?.dominantSystem ?? null,
    digitalLifeSceneScenario: body.digitalLifeSpine?.runtime.sceneScenario ?? null,
    digitalLifeDominantMode: body.digitalLifeSpine?.runtime.dominantMode ?? null,
    digitalLifeSelectedAction: body.digitalLifeSpine?.proactive?.selectedAction ?? null,
    digitalLifeProactivePreferredStyle: body.digitalLifeSpine?.proactive?.preferredStyle ?? null,
    digitalLifeProactiveShouldSpeak: body.digitalLifeSpine?.proactive?.shouldSpeak ?? null,
    digitalLifeMemorySummary: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.memory?.summary ?? null),
    digitalLifeLongHorizonSummary: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.memory?.longHorizonSummary ?? null),
    digitalLifeRememberedPreferenceSummary: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.memory?.rememberedPreferenceSummary ?? null),
    digitalLifeRememberedConstraintSummary: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.memory?.rememberedConstraintSummary ?? null),
    digitalLifeRememberedPlanSummary: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.memory?.rememberedPlanSummary ?? null),
    digitalLifeLongHorizonCueCount: body.digitalLifeSpine?.memory?.longHorizonCueCount ?? null,
    digitalLifeRecallMode: body.digitalLifeSpine?.memory?.recallMode ?? null,
    digitalLifeRecentEpisodeCount: body.digitalLifeSpine?.memory?.recentEpisodeCount ?? 0,
    digitalLifeReflectionPressure: body.digitalLifeSpine?.memory?.reflectionPressure ?? null,
    digitalLifeMotiveRulingDrive: body.digitalLifeSpine?.motive?.rulingDrive ?? null,
    digitalLifeMotiveLeadingGoal: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.motive?.leadingGoalSummary ?? null),
    digitalLifeMotiveLeadingAgendaKind: body.digitalLifeSpine?.motive?.leadingAgendaKind ?? null,
    digitalLifeMotiveLeadingAgendaSummary: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.motive?.leadingAgendaSummary ?? null),
    digitalLifeMotiveReturnPressure: body.digitalLifeSpine?.motive?.returnPressure ?? null,
    digitalLifeHabitMode: body.digitalLifeSpine?.habit?.dominantMode ?? null,
    digitalLifeHabitGroundingGate: body.digitalLifeSpine?.habit?.requiresGroundingBeforeSurface ?? null,
    digitalLifeHabitBusyBoundary: body.digitalLifeSpine?.habit?.blocksDirectSpeakWhenBusy ?? null,
    digitalLifeHabitProtectsRest: body.digitalLifeSpine?.habit?.protectsRestWindow ?? null,
    digitalLifeOutcomeLearningSummary: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.outcomeLearning?.summary ?? null),
    digitalLifeOutcomeLatestInflection: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.outcomeLearning?.latestInflection ?? null),
    digitalLifeOutcomeReflectionLesson: sanitizeStreamMetaContinuityReason(body.digitalLifeSpine?.outcomeLearning?.reflectionLesson ?? null),
    runtimeDigestDominantChannel: body.runtimeDigest?.dominantChannel ?? null,
    runtimeDigestShouldSpeak: body.runtimeDigest?.shouldProactivelySpeak ?? null,
    runtimeDigestShouldAct: body.runtimeDigest?.shouldProactivelyAct ?? null,
    runtimeDigestContinuityPressure: body.runtimeDigest?.continuityPressure ?? null,
    runtimeDigestCompanionshipPressure: body.runtimeDigest?.companionshipPressure ?? null,
    runtimeDigestRulingMotive: body.runtimeDigest?.rulingMotive ?? null,
    runtimeDigestHabitMode: body.runtimeDigest?.habitMode ?? null,
    runtimeDigestTruthDisciplinePressure: body.runtimeDigest?.truthDisciplinePressure ?? null,
    runtimeDigestBoundaryPressure: body.runtimeDigest?.boundaryPressure ?? null,
    runtimeDigestRestProtectionPressure: body.runtimeDigest?.restProtectionPressure ?? null,
    runtimeDigestReturnPressure: body.runtimeDigest?.returnPressure ?? null,
    runtimeDigestEmotionalClosureCue: sanitizeStreamMetaContinuityReason(body.runtimeDigest?.projectState?.emotionalClosureCue ?? body.runtimeDigest?.emotionalClosureCue ?? null),
    runtimeDigestActiveLoopPhase: body.runtimeDigest?.activeLoop?.phase ?? null,
    runtimeDigestActiveLoopHandoff: body.runtimeDigest?.activeLoop?.handoffTarget ?? null,
    runtimeDigestActiveLoopContinuityArcStage: body.runtimeDigest?.activeLoop?.continuityArcStage ?? null,
    runtimeDigestActiveLoopInitiativeBudget: body.runtimeDigest?.activeLoop?.initiativeBudget ?? null,
    runtimeDigestActiveLoopCoherence: body.runtimeDigest?.activeLoop?.coherence ?? null,
    runtimeDigestActiveLoopObservationHeavy: body.runtimeDigest?.activeLoop?.observationHeavy ?? null,
    runtimeDigestProjectPreflightSummary: '',
    runtimeDigestProjectCurrentPhase: '',
    runtimeDigestProjectMemoryClosureSummary: '',
    runtimeDigestProjectPrimaryOpenLoop: '',
    runtimeDigestProjectNextClosureTarget: '',
    runtimeDigestProjectContinuityArcStage: body.runtimeDigest?.projectState?.continuityArcStage ?? null,
    runtimeDigestProjectContinuityPreferredTiming: body.runtimeDigest?.projectState?.continuityPreferredTiming ?? null,
    runtimeDigestProjectContinuityCue: '',
    runtimeDigestCurrentConsciousFrameFocusAnchor: sanitizeStreamMetaContinuityReason(body.runtimeDigest?.currentConsciousFrame?.focusAnchor ?? null),
    runtimeDigestCurrentConsciousFrameContinuityArcStage: body.runtimeDigest?.currentConsciousFrame?.continuityArcStage ?? null,
    runtimeDigestCurrentConsciousFrameContinuityPreferredTiming: body.runtimeDigest?.currentConsciousFrame?.continuityPreferredTiming ?? null,
    runtimeDigestCurrentConsciousFrameReasonTags: body.runtimeDigest?.currentConsciousFrame?.reasonTags ?? null,
    runtimeDigestSummary: sanitizeStreamMetaRuntimeSummary(body.runtimeDigest?.summary ?? null),
  })
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
    const digitalLifeSpine = input.getDigitalLifeSpine?.() ?? null
    const runtimeDigest = input.getRuntimeDigest?.() ?? null
    const currentConsciousFrameForGovernance = buildCurrentConsciousFrameForStreamMetaGovernance(runtimeDigest)
    const meta = buildAlicizationChatStreamEmbodimentMeta({
      governance: input.getGovernance() ?? null,
      digitalLifeSpine,
      affectiveResidue: runtimeDigest?.affectiveResidue
        ?? runtimeDigest?.derivedMindStateBundle?.affectiveResidue
        ?? null,
      currentConsciousFrame: currentConsciousFrameForGovernance,
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
      embodimentScript: (meta as { embodimentScript?: AlicizationChatMetaEvent['embodimentScript'] | null }).embodimentScript ?? null,
      speechTimeline: meta.speechTimeline,
      digitalLife: meta.digitalLife,
      digitalLifeSpine: meta.digitalLifeSpine ?? digitalLifeSpine,
      residentPerformance: input.getResidentPerformance?.() ?? null,
      runtimeDigest,
    })
    const signature = buildAlicizationChatMetaSignature(emittedMeta)
    if (!options?.force && signature === lastSignature)
      return

    lastSignature = signature
    lastReply = meta.speechTimeline?.reply ?? readStringValue(reply).trim()
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
