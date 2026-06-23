import type {
  PerformanceVisualizerAuthorityDriver,
  PerformanceVisualizerRendererTarget,
} from './performance-visualizer-driver-authority'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'

import { deriveAuthorityTrustSummary } from './performance-visualizer-authority-trust'
import { resolveDriverMatchFlagFromSummary } from './performance-visualizer-driver-authority'
import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'
import { formatTraceEmbodimentDisplaySummary } from './performance-visualizer-trace-embodiment'

export interface PerformanceVisualizerRuntimeDiagnosticSummaryEntry {
  key:
    | 'cue-id'
    | 'renderer-target'
    | 'authority-segment'
    | 'matched-drivers'
    | 'authority-sources'
    | 'authority-binding'
    | 'authority-match'
    | 'embodiment-closure-stage'
    | 'authority-trust'
    | 'same-her-signature'
    | 'same-her-reasons'
    | 'same-her-continuity'
    | 'memory-closure-identity'
    | 'same-her-frame-summary'
    | 'same-her-frame-aligned'
    | 'same-her-frame-mismatch-drivers'
    | 'same-her-execution-summary'
    | 'same-her-execution-aligned'
    | 'same-her-execution-mismatch-drivers'
    | 'execution-safety-gate'
    | 'prosody-authority'
    | 'authority-mismatch'
    | 'settle-authority'
    | 'expression-aliases'
    | 'motion-aliases'
    | 'live2d-facial-release'
    | 'live2d-motion-follow'
    | 'vrm-action-fade'
    | 'vrm-expression-blend'
    | 'trace-id'
    | 'turn-mode'
    | 'truth-state'
    | 'repair-state'
    | 'surface-policy'
    | 'closure-state'
    | 'thread-id'
    | 'suppression-tags'
    | 'binding-state'
    | 'binding-target'
    | 'binding-drivers'
    | 'binding-sources'
    | 'latest-event'
    | 'trace-embodiment'
  label: string
  value: string
  technicalValue?: string
}

export interface PerformanceVisualizerTraceTelemetrySummary {
  cueId?: string | null
  decisionTraceId: string
  turnMode: string | null
  truthState: string | null
  repairState: string | null
  finalSurfacePolicy: string | null
  closureState: string | null
  activeThreadId: string | null
  suppressionTags: string[]
  latestEventSummary: string | null
  segmentBinding: {
    matched: boolean
    rendererTarget: PerformanceVisualizerRendererTarget
    matchedDrivers: PerformanceVisualizerAuthorityDriver[]
    matchedSources: string[]
    bodySegmentMatched?: boolean | null
    faceSegmentMatched?: boolean | null
    motionSegmentMatched?: boolean | null
    lipsyncSegmentMatched?: boolean | null
    voiceSegmentMatched?: boolean | null
  }
}

interface PerformanceVisualizerRuntimeAuthoritySummaryInput {
  rendererTarget?: PerformanceVisualizerRendererTarget
  authoritySegmentId?: string | null
  authorityBindingSummary?: string | null
  authorityMatchSummary?: string | null
  embodimentClosureStage?: string | null
  authorityTrustSummary?: string | null
  sameHerSignature?: string | null
  sameHerReasonTags?: string[] | null
  runtimeMemoryClosureIdentityKey?: string | null
  runtimeMemoryClosureIdentityReasonTags?: string[] | null
  prosodyAuthoritySummary?: string | null
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
  settleAuthoritySummary?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
  suppressDerivedAuthorityTrust?: boolean
}

function hasValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'n/a'
}

function formatList(values: string[] | undefined) {
  const normalized = (values ?? []).map(value => value.trim()).filter(Boolean)
  return normalized.length > 0 ? normalized.join(', ') : null
}

function formatMs(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value}ms`
    : null
}

export function resolveExecutionSafetyGateDiagnostic(reasonTags: string[] | null | undefined) {
  const safetyGateTags = (reasonTags ?? [])
    .map(tag => tag.trim())
    .filter(tag => tag.startsWith('execution-safety-gate:'))
  if (safetyGateTags.length === 0)
    return null

  const hasBlockedDispatch = safetyGateTags.some(tag =>
    /blocked-dispatch-restraint|blocked-before-dispatch/u.test(tag),
  )
  const hasConfirmationRequired = safetyGateTags.some(tag =>
    /confirmation-required|confirmation=required|implicit-or-explicit-confirmation-required/u.test(tag),
  )
  const hasNoProcessStarted = safetyGateTags.some(tag =>
    /no-process-started/u.test(tag),
  )
  const parts = [
    hasBlockedDispatch ? 'blocked dispatch 已被安全门拦住' : '执行安全门保持约束',
    hasConfirmationRequired ? '需要确认' : null,
    hasNoProcessStarted ? '没有启动进程' : null,
  ].filter((part): part is string => Boolean(part))

  return {
    value: `${parts.join('；')}。`,
    technicalValue: safetyGateTags.join(', '),
  }
}

function normalizeSummaryText(value: string) {
  return value.trim()
}

function normalizeAuthorityRendererTarget(value: string | null | undefined): PerformanceVisualizerRendererTarget {
  return value === 'live2d' || value === 'vrm' || value === 'speech' ? value : null
}

function formatAuthorityRendererTarget(value: string) {
  if (value === 'vrm')
    return 'VRM'
  if (value === 'live2d')
    return 'Live2D'
  if (value === 'speech')
    return 'speech'
  return value
}

function formatAuthorityDriver(value: string) {
  if (value === 'body')
    return '身体'
  if (value === 'face')
    return '表情'
  if (value === 'motion')
    return '动作'
  if (value === 'lipsync')
    return '口型'
  if (value === 'voice')
    return '声音'
  return value
}

function formatSameHerContinuityLaneTruth(value: string) {
  const normalizedLane = value.trim()
  if (normalizedLane === 'face+lipsync+voice-only') {
    return '当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线'
  }
  if (normalizedLane === 'motion+lipsync+voice-only') {
    return '当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线'
  }
  return null
}

function formatAuthorityMatchFlag(value: string) {
  if (value === 'yes')
    return '命中'
  if (value === 'no')
    return '未命中'
  if (value === 'n/a')
    return '未知'
  return value
}

function formatAuthorityMatchDisplay(value: string) {
  const normalized = normalizeSummaryText(value)
  const match = normalized.match(/^(?:body:(\S+)\s+)?face:(\S+)\s+motion:(\S+)\s+lipsync:(\S+)(?:\s+voice:(\S+))?$/)
  if (!match)
    return { value: normalized }

  const [, body, face, motion, lipsync, voice] = match
  return {
    value: [
      body ? `身体${formatAuthorityMatchFlag(body)}` : null,
      `表情${formatAuthorityMatchFlag(face)}`,
      `动作${formatAuthorityMatchFlag(motion)}`,
      `口型${formatAuthorityMatchFlag(lipsync)}`,
      voice ? `声音${formatAuthorityMatchFlag(voice)}` : null,
    ].filter((part): part is string => Boolean(part)).join(' / '),
    technicalValue: normalized,
  }
}

function parseAuthoritySummarySegments(value: string) {
  const parts = normalizeSummaryText(value).split('|').map(part => part.trim()).filter(Boolean)
  const fields = new Map<string, string>()
  let prefix: string | null = null

  for (const part of parts) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0) {
      if (prefix)
        return null
      prefix = part
      continue
    }
    const key = part.slice(0, separatorIndex).trim()
    const rawValue = part.slice(separatorIndex + 1).trim()
    if (!key || !rawValue)
      return null
    fields.set(key, rawValue)
  }

  return fields.size > 0
    ? {
        prefix,
        fields,
      }
    : null
}

function resolveAuthorityRendererTargetFromSummary(value: string | null | undefined) {
  if (!hasValue(value))
    return null

  const parsed = parseAuthoritySummarySegments(normalizeSummaryText(value!))
  return normalizeAuthorityRendererTarget(parsed?.fields.get('target') ?? null)
}

function resolveAuthorityMatchedDriversFromSummary(value: string | null | undefined) {
  if (!hasValue(value))
    return []

  const parsed = parseAuthoritySummarySegments(normalizeSummaryText(value!))
  const drivers = parsed?.fields.get('drivers')
  if (!drivers)
    return []

  return drivers
    .split(',')
    .map(driver => driver.trim())
    .filter((driver): driver is PerformanceVisualizerAuthorityDriver =>
      driver === 'body' || driver === 'face' || driver === 'motion' || driver === 'lipsync' || driver === 'voice',
    )
}

function resolveAuthorityMatchFlagFromSummaries(input: {
  primarySummary?: string | null
  fallbackSummary?: string | null
  driver: PerformanceVisualizerAuthorityDriver
}) {
  return resolveDriverMatchFlagFromSummary(input.primarySummary, input.driver)
    ?? resolveDriverMatchFlagFromSummary(input.fallbackSummary, input.driver)
    ?? null
}

function resolveMatchedDriversFromLaneTruth(input: {
  matchedDrivers: PerformanceVisualizerAuthorityDriver[]
  bodySegmentMatched: boolean | null
  faceSegmentMatched: boolean | null
  motionSegmentMatched: boolean | null
  lipsyncSegmentMatched: boolean | null
  voiceSegmentMatched?: boolean | null
}) {
  const resolved = [
    input.bodySegmentMatched === true ? 'body' : null,
    input.faceSegmentMatched === true ? 'face' : null,
    input.motionSegmentMatched === true ? 'motion' : null,
    input.lipsyncSegmentMatched === true ? 'lipsync' : null,
    input.voiceSegmentMatched === true ? 'voice' : null,
  ].filter((driver): driver is PerformanceVisualizerAuthorityDriver => Boolean(driver))

  return resolved.length > 0 ? resolved : input.matchedDrivers
}

function extractEmbodimentClosureStage(...summaries: Array<string | null | undefined>) {
  for (const summary of summaries) {
    if (!hasValue(summary))
      continue

    const normalized = normalizeSummaryText(summary!)
    if (
      /(?:^|\s|\|)timing=body-lipsync-carry(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+lipsync-only(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+voice-only(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+face\+motion-only(?:\s|\||$)/.test(normalized)
    ) {
      return 'body-carried-to-renderer-rejoin'
    }
    if (
      /(?:^|\s|\|)lane=body\+lipsync\+voice-only(?:\s|\||$)/.test(normalized)
    ) {
      return 'audible-body-carry'
    }
    if (
      normalized === 'face+lipsync-only'
      || normalized === 'motion+lipsync-only'
      || normalized === 'face+lipsync+voice-only'
      || normalized === 'motion+lipsync+voice-only'
      || normalized === 'face+motion+lipsync+voice-only'
    ) {
      return 'renderer-rejoin-without-body'
    }
    if (
      normalized === 'audible-body-carry'
      || normalized === 'full-driver-rejoin'
      || normalized === 'body-only-hold'
      || normalized === 'body-carried-to-renderer-rejoin'
      || normalized === 'full-cross-modal-lock'
      || normalized === 'renderer-rejoin-without-body'
      || normalized === 'voice-lipsync-carry'
    ) {
      return normalized
    }

    const match = normalized.match(/(?:^|\s|\|)(?:closure|lane)=(face\+lipsync-only|motion\+lipsync-only|face\+lipsync\+voice-only|motion\+lipsync\+voice-only|face\+motion\+lipsync\+voice-only|audible-body-carry|full-driver-rejoin|body-only-hold|body-carried-to-renderer-rejoin|full-cross-modal-lock|renderer-rejoin-without-body|voice-lipsync-carry)(?:\s|\||$)/)
    if (match?.[1]) {
      if (
        match[1] === 'face+lipsync-only'
        || match[1] === 'motion+lipsync-only'
        || match[1] === 'face+lipsync+voice-only'
        || match[1] === 'motion+lipsync+voice-only'
        || match[1] === 'face+motion+lipsync+voice-only'
      ) {
        return 'renderer-rejoin-without-body'
      }
      return match[1]
    }
  }

  return null
}

export function resolveAuthorityTrustSummaryFromSettleAuthority(input: {
  authorityTrustSummary?: string | null
  authorityBindingSummary?: string | null
  settleAuthoritySummary?: string | null
  rendererTarget?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
}) {
  if (!hasValue(input.settleAuthoritySummary)) {
    return hasValue(input.authorityTrustSummary)
      ? normalizeSummaryText(input.authorityTrustSummary!)
      : null
  }

  const settleAuthoritySummary = normalizeSummaryText(input.settleAuthoritySummary!)
  const settleAuthoritySegmentId = parseAuthoritySummarySegments(settleAuthoritySummary)?.fields.get('segment')?.trim() ?? null
  const authorityRendererTarget = normalizeAuthorityRendererTarget(input.rendererTarget)
    ?? resolveAuthorityRendererTargetFromSummary(input.authorityBindingSummary)
    ?? resolveAuthorityRendererTargetFromSummary(settleAuthoritySummary)
  if (!authorityRendererTarget) {
    return hasValue(input.authorityTrustSummary)
      ? normalizeSummaryText(input.authorityTrustSummary!)
      : null
  }

  const authorityMatchedDrivers = resolveAuthorityMatchedDriversFromSummary(input.authorityBindingSummary)
  const fallbackMatchedDrivers = resolveAuthorityMatchedDriversFromSummary(settleAuthoritySummary)
  const resolvedAuthorityMatchedDrivers = authorityMatchedDrivers.length > 0
    ? authorityMatchedDrivers
    : fallbackMatchedDrivers
  const bodySegmentMatched = resolveAuthorityMatchFlagFromSummaries({
    primarySummary: input.authorityBindingSummary,
    fallbackSummary: settleAuthoritySummary,
    driver: 'body',
  })
  const faceSegmentMatched = resolveAuthorityMatchFlagFromSummaries({
    primarySummary: input.authorityBindingSummary,
    fallbackSummary: settleAuthoritySummary,
    driver: 'face',
  })
  const motionSegmentMatched = resolveAuthorityMatchFlagFromSummaries({
    primarySummary: input.authorityBindingSummary,
    fallbackSummary: settleAuthoritySummary,
    driver: 'motion',
  })
  const lipsyncSegmentMatched = resolveAuthorityMatchFlagFromSummaries({
    primarySummary: input.authorityBindingSummary,
    fallbackSummary: settleAuthoritySummary,
    driver: 'lipsync',
  })
  const hasVoiceCarriedLane = /(?:^|\|\s*)lane=[^|]*voice-only(?:\s*\||$)/u.test(settleAuthoritySummary)
  const hasAudibleBodyPartialRejoin = settleAuthoritySummary.includes('lane=body+lipsync+voice-only')
    && settleAuthoritySummary.includes('pending-rejoin=face+motion')
  const hasThinAffectiveReason = /(?:^|\|\s*)reason=[^|]+$/u.test(settleAuthoritySummary)

  if (!hasThinAffectiveReason && !hasAudibleBodyPartialRejoin && !hasVoiceCarriedLane) {
    return hasValue(input.authorityTrustSummary)
      ? normalizeSummaryText(input.authorityTrustSummary!)
      : null
  }

  return deriveAuthorityTrustSummary({
    prosodyAuthoritySummary: null,
    settleAuthoritySummary,
    authoritySegmentId: settleAuthoritySegmentId,
    authorityRendererTarget,
    authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
    bodySegmentMatched,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    preferredBlinkCadence: input.preferredBlinkCadence ?? null,
    preferredGazeMode: input.preferredGazeMode ?? null,
  })
}

function formatAuthorityDriverList(value: string | undefined) {
  if (!value)
    return null
  if (value === 'n/a')
    return '无'

  const drivers = value
    .split(',')
    .map(driver => driver.trim())
    .filter(Boolean)
    .map(formatAuthorityDriver)

  return drivers.length > 0 ? drivers.join('、') : null
}

function formatAuthorityLaneDisplay(
  value: string | undefined,
  continuityHint?: string | null,
) {
  if (!value || value === 'n/a')
    return null

  const isVoiceCarriedLipsyncLane = value === 'lipsync-only' || value === 'lipsync+voice-only'
  const normalizedHint = continuityHint?.trim().toLowerCase() ?? ''
  if (
    isVoiceCarriedLipsyncLane
    && normalizedHint.includes('repair-before-closeness')
    && normalizedHint.includes('quieter blink')
    && normalizedHint.includes('softened gaze')
  ) {
    return 'repair-before-closeness 仍停在修补线里，先守住 quieter blink / softened gaze'
  }

  if (
    isVoiceCarriedLipsyncLane
    && normalizedHint.includes('measured-return')
    && (
      normalizedHint.includes('较薄证据维持')
      || normalizedHint.includes('thin measured-return')
      || normalizedHint.includes('noisy-detour continuity line')
      || normalizedHint.includes('thinner measured-return same-her line')
    )
  ) {
    return '噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持'
  }

  const normalizedLane = value.trim()
  const explicitSameHerLaneTruth = formatSameHerContinuityLaneTruth(normalizedLane)
  if (explicitSameHerLaneTruth)
    return explicitSameHerLaneTruth

  const laneMatch = normalizedLane.match(/^([a-z+]+)-only$/)
  if (!laneMatch)
    return null

  const lanes = laneMatch[1]
    .split('+')
    .map(lane => lane.trim())
    .filter((lane): lane is string => Boolean(lane))
    .map(formatAuthorityDriver)

  if (lanes.length === 0)
    return null
  if (lanes.length === 1)
    return `当前仅剩${lanes[0]}维持同一段连续性`

  return `当前仅剩${lanes.join('、')}维持同一段连续性`
}

export function formatAuthorityBindingDisplay(
  value: string,
  continuityHint?: string | null,
) {
  const normalized = normalizeSummaryText(value)
  const parsed = parseAuthoritySummarySegments(normalized)
  if (!parsed)
    return { value: normalized }

  const target = parsed.fields.get('target')
  const drivers = formatAuthorityDriverList(parsed.fields.get('drivers'))
  const rawSources = parsed.fields.get('sources')
  const sources = rawSources === 'n/a' ? '无' : rawSources
  const matches = parsed.fields.get('matches')
  const matchDisplay = matches ? formatAuthorityMatchDisplay(matches).value : null
  const lane = parsed.fields.get('lane')
  const remainingOpen = parsed.fields.get('remaining-open')
  const laneDisplay = (() => {
    const baseDisplay = formatAuthorityLaneDisplay(lane, continuityHint)
    if (lane === 'body+face+motion-only' && remainingOpen === 'lipsync+voice') {
      return baseDisplay
        ? `${baseDisplay}，口型和声音还没有重新并回这一段`
        : '当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段'
    }
    return baseDisplay
  })()
  const parts = [
    target ? `目标 ${formatAuthorityRendererTarget(target)}` : null,
    drivers ? `驱动 ${drivers}` : null,
    sources ? `来源 ${sources}` : null,
    matchDisplay ? `命中 ${matchDisplay}` : null,
    laneDisplay,
  ].filter((part): part is string => Boolean(part))

  if (parts.length === 0)
    return { value: normalized }

  const displayValue = parts.join('，')
  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

export function formatSettleAuthorityDisplay(value: string) {
  const normalized = normalizeSummaryText(value)
  const parsed = parseAuthoritySummarySegments(normalized)
  if (!parsed)
    return { value: normalized }

  const segment = parsed.fields.get('segment')
  const target = parsed.fields.get('target')
  const drivers = formatAuthorityDriverList(parsed.fields.get('drivers'))
  const sources = parsed.fields.get('sources')
  const lane = parsed.fields.get('lane')
  const remainingOpen = parsed.fields.get('remaining-open')
  const laneDisplay = (() => {
    const baseDisplay = formatAuthorityLaneDisplay(lane)
    if (lane === 'body+face+motion-only' && remainingOpen === 'lipsync+voice') {
      return baseDisplay
        ? `${baseDisplay}，口型和声音还没有重新并回这一段`
        : '当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段'
    }
    return baseDisplay
  })()
  const reason = parsed.fields.get('reason')
  const parts = [
    parsed.prefix,
    segment ? `片段 ${segment}` : null,
    target ? `目标 ${formatAuthorityRendererTarget(target)}` : null,
    drivers ? `驱动 ${drivers}` : null,
    sources ? `来源 ${sources}` : null,
    laneDisplay,
    reason ? `缘由 ${reason}` : null,
  ].filter((part): part is string => Boolean(part))

  if (parts.length === 0)
    return { value: normalized }

  const displayValue = parts.join('，')
  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

export function formatProsodyAuthorityDisplay(value: string) {
  const normalized = normalizeSummaryText(value)
  const parts = normalized.split('|').map(part => part.trim()).filter(Boolean)
  const labels: string[] = []

  for (const part of parts) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0)
      continue
    const key = part.slice(0, separatorIndex).trim()
    const rawValue = part.slice(separatorIndex + 1).trim()
    if (!key || !rawValue)
      continue
    if (key === 'mode')
      labels.push(`模式 ${rawValue}`)
    else if (key === 'prosody')
      labels.push(`韵律 ${rawValue}`)
    else if (key === 'mouth')
      labels.push(`口部 ${rawValue}`)
    else if (key === 'head')
      labels.push(`头部 ${rawValue}`)
    else if (key === 'visemePeak')
      labels.push(`峰值口型 ${rawValue}`)
    else if (key === 'provenance')
      labels.push(rawValue === 'authority-bound' ? '权威绑定' : rawValue === 'fallback-derived' ? '回退派生' : rawValue)
    else if (key === 'source')
      labels.push(`来源 ${rawValue === 'prosody-authority' ? '韵律权威' : rawValue}`)
    else if (key === 'segment')
      labels.push(`片段 ${rawValue}`)
  }

  if (labels.length === 0)
    return { value: normalized }

  const displayValue = labels.join('，')
  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

export function toAuthorityDisplayEntry(
  key: PerformanceVisualizerRuntimeDiagnosticSummaryEntry['key'],
  value: string,
) {
  switch (key) {
    case 'authority-binding':
      return formatAuthorityBindingDisplay(value)
    case 'authority-match':
      return formatAuthorityMatchDisplay(value)
    case 'prosody-authority':
      return formatProsodyAuthorityDisplay(value)
    case 'settle-authority':
      return formatSettleAuthorityDisplay(value)
    default:
      return { value: normalizeSummaryText(value) }
  }
}

function pushSummaryEntry(
  entries: PerformanceVisualizerRuntimeDiagnosticSummaryEntry[],
  entry: PerformanceVisualizerRuntimeDiagnosticSummaryEntry,
) {
  entries.push(entry.technicalValue
    ? entry
    : {
        key: entry.key,
        label: entry.label,
        value: entry.value,
      })
}

export function buildRuntimeAuthoritySummaryEntries(
  overview: PerformanceVisualizerRuntimeAuthoritySummaryInput | null | undefined,
): PerformanceVisualizerRuntimeDiagnosticSummaryEntry[] {
  if (!overview)
    return []

  const summaryAuthorityMatchedDrivers = resolveAuthorityMatchedDriversFromSummary(overview.authorityBindingSummary)
  const bodySegmentMatched = overview.bodySegmentMatched ?? resolveAuthorityMatchFlagFromSummaries({
    primarySummary: overview.authorityMatchSummary,
    fallbackSummary: overview.authorityBindingSummary ?? overview.settleAuthoritySummary ?? null,
    driver: 'body',
  })
  const faceSegmentMatched = overview.faceSegmentMatched ?? resolveAuthorityMatchFlagFromSummaries({
    primarySummary: overview.authorityMatchSummary,
    fallbackSummary: overview.authorityBindingSummary ?? overview.settleAuthoritySummary ?? null,
    driver: 'face',
  })
  const motionSegmentMatched = overview.motionSegmentMatched ?? resolveAuthorityMatchFlagFromSummaries({
    primarySummary: overview.authorityMatchSummary,
    fallbackSummary: overview.authorityBindingSummary ?? overview.settleAuthoritySummary ?? null,
    driver: 'motion',
  })
  const lipsyncSegmentMatched = overview.lipsyncSegmentMatched ?? resolveAuthorityMatchFlagFromSummaries({
    primarySummary: overview.authorityMatchSummary,
    fallbackSummary: overview.authorityBindingSummary ?? overview.settleAuthoritySummary ?? null,
    driver: 'lipsync',
  })
  const voiceSegmentMatched = overview.voiceSegmentMatched ?? resolveAuthorityMatchFlagFromSummaries({
    primarySummary: overview.authorityMatchSummary,
    fallbackSummary: overview.authorityBindingSummary ?? overview.settleAuthoritySummary ?? null,
    driver: 'voice',
  })
  const resolvedAuthorityMatchedDrivers = resolveMatchedDriversFromLaneTruth({
    matchedDrivers: summaryAuthorityMatchedDrivers,
    bodySegmentMatched,
    faceSegmentMatched,
    motionSegmentMatched,
    lipsyncSegmentMatched,
    voiceSegmentMatched,
  })
  const hasStructuredLaneTruth = resolvedAuthorityMatchedDrivers.length > 0
    || bodySegmentMatched != null
    || faceSegmentMatched != null
    || motionSegmentMatched != null
    || lipsyncSegmentMatched != null
    || voiceSegmentMatched != null
  const settleAuthorityTrustSummary = resolveAuthorityTrustSummaryFromSettleAuthority({
    authorityTrustSummary: null,
    authorityBindingSummary: overview.authorityBindingSummary,
    settleAuthoritySummary: overview.settleAuthoritySummary,
    rendererTarget: overview.rendererTarget,
    preferredBlinkCadence: overview.preferredBlinkCadence ?? null,
    preferredGazeMode: overview.preferredGazeMode ?? null,
  })
  const derivedAuthorityTrustSummary = overview.suppressDerivedAuthorityTrust
    ? null
    : resolveAuthorityTrustSummaryWithFallback({
        authorityTrustSummary: hasValue(overview.authorityTrustSummary)
          ? normalizeSummaryText(overview.authorityTrustSummary!)
          : null,
        authorityBindingSummary: overview.authorityBindingSummary,
        settleAuthoritySummary: overview.settleAuthoritySummary,
        rendererTarget: overview.rendererTarget,
        preferredBlinkCadence: overview.preferredBlinkCadence ?? null,
        preferredGazeMode: overview.preferredGazeMode ?? null,
        prosodyAuthoritySummary: overview.prosodyAuthoritySummary ?? null,
        authoritySegmentId: overview.authoritySegmentId ?? null,
        authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
        bodySegmentMatched,
        faceSegmentMatched,
        motionSegmentMatched,
        lipsyncSegmentMatched,
        voiceSegmentMatched,
      })
  const authorityTrustSummary = settleAuthorityTrustSummary
    ?? (!hasStructuredLaneTruth && hasValue(overview.authorityTrustSummary)
      ? normalizeSummaryText(overview.authorityTrustSummary!)
      : null)
    ?? derivedAuthorityTrustSummary
  const continuityHint = overview.authorityMismatchDisplay
    ?? overview.authorityMismatchReasonSummary
    ?? authorityTrustSummary
    ?? null
  const embodimentClosureStage = extractEmbodimentClosureStage(
    overview.embodimentClosureStage ?? null,
    overview.authorityBindingSummary ?? null,
    overview.settleAuthoritySummary ?? null,
    overview.authorityMismatchDisplay ?? null,
    overview.authorityMismatchReasonSummary ?? null,
    overview.authorityMismatchSummary ?? null,
  )

  const entries: PerformanceVisualizerRuntimeDiagnosticSummaryEntry[] = []
  if (hasValue(overview.rendererTarget))
    pushSummaryEntry(entries, { key: 'renderer-target', label: '渲染目标', value: overview.rendererTarget! })
  if (hasValue(overview.authoritySegmentId))
    pushSummaryEntry(entries, { key: 'authority-segment', label: '权威片段', value: overview.authoritySegmentId! })
  if (hasValue(overview.authorityBindingSummary)) {
    const normalized = normalizeSummaryText(overview.authorityBindingSummary!)
    const parsed = parseAuthoritySummarySegments(normalized)
    const display = parsed
      ? (() => {
          const target = parsed.fields.get('target')
          const drivers = formatAuthorityDriverList(parsed.fields.get('drivers'))
          const rawSources = parsed.fields.get('sources')
          const sources = rawSources === 'n/a' ? '无' : rawSources
          const matches = parsed.fields.get('matches')
          const matchDisplay = matches ? formatAuthorityMatchDisplay(matches).value : null
          const laneDisplay = formatAuthorityLaneDisplay(parsed.fields.get('lane'), continuityHint)
          const parts = [
            target ? `目标 ${formatAuthorityRendererTarget(target)}` : null,
            drivers ? `驱动 ${drivers}` : null,
            sources ? `来源 ${sources}` : null,
            matchDisplay ? `命中 ${matchDisplay}` : null,
            laneDisplay,
          ].filter((part): part is string => Boolean(part))

          if (parts.length === 0)
            return { value: normalized }

          const displayValue = parts.join('，')
          return displayValue === normalized
            ? { value: displayValue }
            : { value: displayValue, technicalValue: normalized }
        })()
      : toAuthorityDisplayEntry('authority-binding', overview.authorityBindingSummary!)
    pushSummaryEntry(entries, {
      key: 'authority-binding',
      label: '权威绑定',
      ...display,
    })
  }
  if (hasValue(overview.authorityMatchSummary)) {
    pushSummaryEntry(entries, {
      key: 'authority-match',
      label: '绑定命中',
      ...toAuthorityDisplayEntry('authority-match', overview.authorityMatchSummary!),
    })
  }
  if (hasValue(embodimentClosureStage)) {
    pushSummaryEntry(entries, {
      key: 'embodiment-closure-stage',
      label: '闭环阶段',
      value: embodimentClosureStage!,
    })
  }
  if (hasValue(authorityTrustSummary)) {
    pushSummaryEntry(entries, {
      key: 'authority-trust',
      label: '权威可信性',
      value: authorityTrustSummary!,
    })
  }
  if (hasValue(overview.sameHerSignature)) {
    pushSummaryEntry(entries, {
      key: 'same-her-signature',
      label: '同一人签名',
      value: overview.sameHerSignature!,
    })
  }
  const executionSafetyGate = resolveExecutionSafetyGateDiagnostic(overview.sameHerReasonTags)
  if (executionSafetyGate) {
    pushSummaryEntry(entries, {
      key: 'execution-safety-gate',
      label: '执行安全门',
      ...executionSafetyGate,
    })
  }
  const sameHerReasons = formatList(overview.sameHerReasonTags ?? undefined)
  if (sameHerReasons) {
    pushSummaryEntry(entries, {
      key: 'same-her-reasons',
      label: '同一人线索',
      value: sameHerReasons,
    })
  }
  if (hasValue(overview.runtimeMemoryClosureIdentityKey)) {
    const technicalValue = formatList(overview.runtimeMemoryClosureIdentityReasonTags ?? undefined)
    pushSummaryEntry(entries, {
      key: 'memory-closure-identity',
      label: '记忆闭环身份',
      value: overview.runtimeMemoryClosureIdentityKey!,
      ...(technicalValue ? { technicalValue } : {}),
    })
  }
  if (hasValue(overview.prosodyAuthoritySummary)) {
    pushSummaryEntry(entries, {
      key: 'prosody-authority',
      label: '韵律权威',
      ...toAuthorityDisplayEntry('prosody-authority', overview.prosodyAuthoritySummary!),
    })
  }
  if (hasValue(overview.authorityMismatchDisplay) || hasValue(overview.authorityMismatchReasonSummary) || hasValue(overview.authorityMismatchSummary)) {
    pushSummaryEntry(entries, {
      key: 'authority-mismatch',
      label: '权威漂移',
      value: overview.authorityMismatchDisplay ?? overview.authorityMismatchReasonSummary ?? overview.authorityMismatchSummary ?? '',
    })
  }
  if (hasValue(overview.settleAuthoritySummary)) {
    const normalized = normalizeSummaryText(overview.settleAuthoritySummary!)
    const parsed = parseAuthoritySummarySegments(normalized)
    const display = parsed
      ? (() => {
          const segment = parsed.fields.get('segment')
          const target = parsed.fields.get('target')
          const drivers = formatAuthorityDriverList(parsed.fields.get('drivers'))
          const sources = parsed.fields.get('sources')
          const laneDisplay = formatAuthorityLaneDisplay(parsed.fields.get('lane'), continuityHint)
          const reason = parsed.fields.get('reason')
          const parts = [
            parsed.prefix,
            segment ? `片段 ${segment}` : null,
            target ? `目标 ${formatAuthorityRendererTarget(target)}` : null,
            drivers ? `驱动 ${drivers}` : null,
            sources ? `来源 ${sources}` : null,
            laneDisplay,
            reason ? `缘由 ${reason}` : null,
          ].filter((part): part is string => Boolean(part))

          if (parts.length === 0)
            return { value: normalized }

          const displayValue = parts.join('，')
          return displayValue === normalized
            ? { value: displayValue }
            : { value: displayValue, technicalValue: normalized }
        })()
      : toAuthorityDisplayEntry('settle-authority', overview.settleAuthoritySummary!)
    pushSummaryEntry(entries, {
      key: 'settle-authority',
      label: '稳定段归因',
      ...display,
    })
  }
  return entries
}

export function buildPlaybackCueAuthoritySummaryEntries(
  view: PerformanceVisualizerPlaybackCueAuthorityView | null | undefined,
): PerformanceVisualizerRuntimeDiagnosticSummaryEntry[] {
  if (!view)
    return []

  const embodimentClosureStage = extractEmbodimentClosureStage(
    (view as { embodimentClosureStage?: string | null }).embodimentClosureStage ?? null,
    view.authorityBindingSummary ?? null,
    view.settleAuthoritySummary ?? null,
  )
  const entries: PerformanceVisualizerRuntimeDiagnosticSummaryEntry[] = [
    { key: 'cue-id', label: '当前片段', value: view.cueId },
  ]
  if (hasValue(view.authoritySegmentId))
    pushSummaryEntry(entries, { key: 'authority-segment', label: '权威片段', value: view.authoritySegmentId! })
  if (hasValue(view.authorityRendererTarget))
    pushSummaryEntry(entries, { key: 'renderer-target', label: '渲染目标', value: view.authorityRendererTarget! })
  const matchedDrivers = formatList(view.authorityMatchedDrivers)
  if (matchedDrivers)
    pushSummaryEntry(entries, { key: 'matched-drivers', label: '命中驱动', value: matchedDrivers })
  const authoritySources = formatList(view.authoritySources)
  if (authoritySources)
    pushSummaryEntry(entries, { key: 'authority-sources', label: '权威来源', value: authoritySources })
  if (hasValue(view.authorityBindingSummary)) {
    pushSummaryEntry(entries, {
      key: 'authority-binding',
      label: '权威绑定',
      ...toAuthorityDisplayEntry('authority-binding', view.authorityBindingSummary!),
    })
  }
  if (hasValue(view.authorityMatchSummary)) {
    pushSummaryEntry(entries, {
      key: 'authority-match',
      label: '绑定命中',
      ...toAuthorityDisplayEntry('authority-match', view.authorityMatchSummary!),
    })
  }
  if (hasValue(embodimentClosureStage)) {
    pushSummaryEntry(entries, {
      key: 'embodiment-closure-stage',
      label: '闭环阶段',
      value: embodimentClosureStage!,
    })
  }
  if (hasValue(view.authorityTrustSummary)) {
    pushSummaryEntry(entries, {
      key: 'authority-trust',
      label: '权威可信性',
      value: view.authorityTrustSummary!,
    })
  }
  if (hasValue((view as { signature?: string | null }).signature)) {
    pushSummaryEntry(entries, {
      key: 'same-her-signature',
      label: '同一人签名',
      value: (view as { signature?: string | null }).signature!,
    })
  }
  const sameHerReasons = formatList((view as { reasonTags?: string[] | null }).reasonTags ?? undefined)
  if (sameHerReasons) {
    pushSummaryEntry(entries, {
      key: 'same-her-reasons',
      label: '同一人线索',
      value: sameHerReasons,
    })
  }
  if (hasValue(view.prosodyAuthoritySummary)) {
    pushSummaryEntry(entries, {
      key: 'prosody-authority',
      label: '韵律权威',
      ...toAuthorityDisplayEntry('prosody-authority', view.prosodyAuthoritySummary!),
    })
  }
  if (hasValue(view.settleAuthoritySummary)) {
    pushSummaryEntry(entries, {
      key: 'settle-authority',
      label: '稳定段归因',
      ...toAuthorityDisplayEntry('settle-authority', view.settleAuthoritySummary!),
    })
  }
  const expressionAliases = formatList(view.preferredExpressionAliases)
  if (expressionAliases)
    pushSummaryEntry(entries, { key: 'expression-aliases', label: '表情偏好', value: expressionAliases })
  const motionAliases = formatList(view.preferredMotionAliases)
  if (motionAliases)
    pushSummaryEntry(entries, { key: 'motion-aliases', label: '动作偏好', value: motionAliases })
  const live2dFacialRelease = formatMs(view.live2dFacialReleaseMs)
  if (live2dFacialRelease)
    pushSummaryEntry(entries, { key: 'live2d-facial-release', label: 'Live2D 表情回收', value: live2dFacialRelease })
  const live2dMotionFollow = formatMs(view.live2dMotionFollowThroughMs)
  if (live2dMotionFollow)
    pushSummaryEntry(entries, { key: 'live2d-motion-follow', label: 'Live2D 动作跟随', value: live2dMotionFollow })
  const vrmActionFade = formatMs(view.vrmActionFadeMs)
  if (vrmActionFade)
    pushSummaryEntry(entries, { key: 'vrm-action-fade', label: 'VRM 动作淡出', value: vrmActionFade })
  const vrmExpressionBlend = formatMs(view.vrmExpressionBlendMs)
  if (vrmExpressionBlend)
    pushSummaryEntry(entries, { key: 'vrm-expression-blend', label: 'VRM 表情混合', value: vrmExpressionBlend })
  return entries
}

export function buildTraceTelemetrySummaryEntries(
  traceSummary: PerformanceVisualizerTraceTelemetrySummary | null | undefined,
  options?: {
    traceEmbodimentSummary?: string | null
  },
): PerformanceVisualizerRuntimeDiagnosticSummaryEntry[] {
  if (!traceSummary)
    return []

  const entries: PerformanceVisualizerRuntimeDiagnosticSummaryEntry[] = [
    { key: 'trace-id', label: '决策轨迹', value: traceSummary.decisionTraceId },
  ]
  if (hasValue(traceSummary.turnMode))
    entries.push({ key: 'turn-mode', label: '回合模式', value: traceSummary.turnMode! })
  if (hasValue(traceSummary.truthState))
    entries.push({ key: 'truth-state', label: '真值状态', value: traceSummary.truthState! })
  if (hasValue(traceSummary.repairState))
    entries.push({ key: 'repair-state', label: '修复状态', value: traceSummary.repairState! })
  if (hasValue(traceSummary.finalSurfacePolicy))
    entries.push({ key: 'surface-policy', label: '表面策略', value: traceSummary.finalSurfacePolicy! })
  if (hasValue(traceSummary.closureState))
    entries.push({ key: 'closure-state', label: '收口状态', value: traceSummary.closureState! })
  if (hasValue(traceSummary.activeThreadId))
    entries.push({ key: 'thread-id', label: '运行线程', value: traceSummary.activeThreadId! })
  const suppressionTags = formatList(traceSummary.suppressionTags)
  if (suppressionTags)
    entries.push({ key: 'suppression-tags', label: '抑制标签', value: suppressionTags })
  entries.push({ key: 'binding-state', label: '绑定状态', value: traceSummary.segmentBinding.matched ? 'matched' : 'unmatched' })
  if (hasValue(traceSummary.segmentBinding.rendererTarget))
    entries.push({ key: 'binding-target', label: '绑定目标', value: traceSummary.segmentBinding.rendererTarget! })
  const bindingDrivers = formatList(traceSummary.segmentBinding.matchedDrivers)
  if (bindingDrivers)
    entries.push({ key: 'binding-drivers', label: '命中驱动', value: bindingDrivers })
  const bindingSources = formatList(traceSummary.segmentBinding.matchedSources)
  if (bindingSources)
    entries.push({ key: 'binding-sources', label: '命中来源', value: bindingSources })
  if (hasValue(options?.traceEmbodimentSummary)) {
    const technicalValue = options!.traceEmbodimentSummary!
    const displayValue = formatTraceEmbodimentDisplaySummary(technicalValue) ?? technicalValue
    entries.push({
      key: 'trace-embodiment',
      label: '轨迹落点',
      value: displayValue,
      technicalValue: displayValue === technicalValue ? undefined : technicalValue,
    })
  }
  if (hasValue(traceSummary.latestEventSummary))
    entries.push({ key: 'latest-event', label: '最近事件', value: traceSummary.latestEventSummary! })
  return entries
}
