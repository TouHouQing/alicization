import type { PerformanceVisualizerAuthorityDriver } from './performance-visualizer-driver-authority'
import type { PerformanceVisualizerSpeechEvidenceSnapshot } from './performance-visualizer-speech-evidence'

import { resolveAuthorityLaneTruth } from './performance-visualizer-authority-lane-truth'
import {

  resolveDriverMatchFlagFromSummary,
} from './performance-visualizer-driver-authority'
import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'
import {
  formatAuthorityBindingDisplay,
  formatSettleAuthorityDisplay,
  resolveExecutionSafetyGateDiagnostic,
  toAuthorityDisplayEntry,
} from './performance-visualizer-runtime-diagnostic-summary'
import { formatSpeechAuthorityFilterValue, formatSpeechCueMetadataValue, formatSpeechDriverExecutionSummary } from './performance-visualizer-speech-display'
import { formatTraceEmbodimentDisplaySummary } from './performance-visualizer-trace-embodiment'

export interface PerformanceVisualizerSpeechDiagnosticSummaryEntry {
  key:
    | 'authority'
    | 'authority-match'
    | 'closure-stage'
    | 'authority-trust'
    | 'continuity-signature'
    | 'execution-safety-gate'
    | 'continuity-reasons'
    | 'authority-mismatch'
    | 'renderer-drift'
    | 'voice'
    | 'prosody-authority'
    | 'visemes'
    | 'cue'
    | 'persona-style'
    | 'timing'
    | 'driver-execution'
    | 'trace-embodiment'
    | 'viseme-hints'
    | 'settle-authority'
  label: string
  value: string
  technicalValue?: string
}

interface BuildSpeechDiagnosticSummaryEntriesInput {
  authorityBindingSummary?: string | null
  authorityMatchSummary?: string | null
  authorityMatchedDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'> | null
  authorityVoiceSegmentMatched?: boolean | null
  authorityTrustSummary?: string | null
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
  rendererDriftSummary?: string | null
  settleAuthoritySummary?: string | null
  traceEmbodimentSummary?: string | null
  sameHerSignature?: string | null
  sameHerReasonTags?: string[] | null
  includeSettleAuthority?: boolean
  speechEvidence?: PerformanceVisualizerSpeechEvidenceSnapshot | null
}

function hasValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'n/a'
}

function formatList(values: string[] | null | undefined) {
  const normalized = (values ?? [])
    .map(value => value.trim())
    .filter(Boolean)
    .filter((value, index, items) => items.indexOf(value) === index)
  return normalized.length > 0 ? normalized.join(', ') : null
}

function normalizeSummaryText(value: string) {
  return value.trim()
}

function extractStructuredSegmentId(summary: string | null | undefined) {
  const normalized = typeof summary === 'string' ? summary.trim() : ''
  if (!normalized)
    return null

  const match = normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)
  return match?.[1]?.trim() ?? null
}

function resolveVoiceSegmentMatched(input: {
  authoritySegmentId: string | null | undefined
  voiceSummary: string | null | undefined
}) {
  const authoritySegmentId = extractStructuredSegmentId(input.authoritySegmentId ?? null) ?? input.authoritySegmentId?.trim() ?? null
  if (!authoritySegmentId)
    return null

  const voiceSegmentId = extractStructuredSegmentId(input.voiceSummary)
  if (!voiceSegmentId)
    return null

  return authoritySegmentId === voiceSegmentId
}

function extractEmbodimentClosureStage(...summaries: Array<string | null | undefined>) {
  for (const summary of summaries) {
    const normalized = summary?.trim() ?? ''
    if (!normalized)
      continue
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

function appendPendingRejoinDisplay(value: string) {
  if (value.includes('表情和动作还在重连这条身体线'))
    return value

  return `${value}，表情和动作还在重连这条身体线`
}

function appendPendingRejoinDisplayFromTechnicalValue(input: {
  value: string
  technicalValue?: string | null
}) {
  if (!input.technicalValue?.includes('pending-rejoin=face+motion'))
    return input.value

  return appendPendingRejoinDisplay(input.value)
}

function formatVoiceSummary(value: string) {
  if (!value.includes('|') || !value.includes('='))
    return value

  const parts = value.split('|').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0)
    return value

  const [language, ...metrics] = parts
  const labels: string[] = []

  for (const metric of metrics) {
    const [rawKey, rawValue] = metric.split('=').map(part => part.trim())
    if (!rawKey || !rawValue)
      continue
    if (rawKey === 'closure')
      labels.push(`收口 ${rawValue}`)
    else if (rawKey === 'precision')
      labels.push(`咬字 ${rawValue}`)
    else if (rawKey === 'reason')
      labels.push(`连续性原因 ${rawValue}`)
    else if (rawKey === 'provenance')
      labels.push(formatSpeechAuthorityFilterValue('settle-authority', rawValue))
    else if (rawKey === 'segment')
      labels.push(`片段 ${rawValue}`)
    else if (rawKey === 'source')
      labels.push(`来源 ${formatSpeechCueMetadataValue('source', rawValue)}`)
    else
      labels.push(`${rawKey} ${rawValue}`)
  }

  const languageLabel = language === 'zh-CN' ? '中文韵律' : language
  return labels.length > 0 ? `${languageLabel}，${labels.join('，')}` : languageLabel
}

export function formatProsodyAuthoritySummary(value: string) {
  if (!value.includes('|') || !value.includes('mode='))
    return value

  const parts = value.split('|').map(part => part.trim()).filter(Boolean)
  const labels: string[] = []
  for (const metric of parts) {
    const [rawKey, rawValue] = metric.split('=').map(part => part.trim())
    if (!rawKey || !rawValue)
      continue
    if (rawKey === 'mode')
      labels.push(`模式 ${rawValue}`)
    else if (rawKey === 'prosody')
      labels.push(`韵律 ${rawValue}`)
    else if (rawKey === 'mouth')
      labels.push(`口部 ${rawValue}`)
    else if (rawKey === 'head')
      labels.push(`头部 ${rawValue}`)
    else if (rawKey === 'visemePeak')
      labels.push(`峰值口型 ${rawValue}`)
    else if (rawKey === 'provenance')
      labels.push(formatSpeechAuthorityFilterValue('settle-authority', rawValue))
    else if (rawKey === 'source')
      labels.push(`来源 ${formatSpeechCueMetadataValue('source', rawValue)}`)
    else if (rawKey === 'segment')
      labels.push(`片段 ${rawValue}`)
    else
      labels.push(`${rawKey} ${rawValue}`)
  }

  return labels.join('，') || value
}

function formatVisemeName(value: string) {
  return value === 'closed' ? '闭口' : value
}

function formatVisemeSummary(value: string) {
  if (!value.includes(':'))
    return value

  const items = value.split(',').map(part => part.trim()).filter(Boolean)
  const formatted = items.map((item) => {
    const [name, weight] = item.split(':').map(part => part.trim())
    if (!name || !weight)
      return item
    return `${formatVisemeName(name)} ${weight}`
  })
  return formatted.length > 0 ? formatted.join('，') : value
}

function formatCueSummary(value: string) {
  if (!value.includes('|') || !value.includes('prosody='))
    return value

  const [identityRaw, metricsRaw] = value.split('|').map(part => part.trim())
  if (!identityRaw || !metricsRaw)
    return value

  const metrics = metricsRaw.split(' ').map(part => part.trim()).filter(Boolean)
  const formattedMetrics = metrics.map((metric) => {
    const [rawKey, rawValue] = metric.split('=').map(part => part.trim())
    if (!rawKey || !rawValue)
      return metric
    if (rawKey === 'prosody')
      return `韵律 ${rawValue}`
    if (rawKey === 'mouth')
      return `口部 ${rawValue}`
    if (rawKey === 'head')
      return `头部 ${rawValue}`
    if (rawKey === 'provenance')
      return formatSpeechAuthorityFilterValue('settle-authority', rawValue)
    if (rawKey === 'segment')
      return `片段 ${rawValue}`
    return `${rawKey} ${rawValue}`
  })

  return formattedMetrics.length > 0 ? `${identityRaw}，${formattedMetrics.join('，')}` : identityRaw
}

function formatPersonaStyleSummary(value: string) {
  if (!value.includes('|') || (!value.includes('prosody=') && !value.includes('beat=')))
    return value

  const [styleRaw, metricsRaw] = value.split('|').map(part => part.trim())
  if (!styleRaw || !metricsRaw)
    return value

  const metrics = metricsRaw.split(' ').map(part => part.trim()).filter(Boolean)
  const formattedMetrics = metrics.map((metric) => {
    const [rawKey, rawValue] = metric.split('=').map(part => part.trim())
    if (!rawKey || !rawValue)
      return metric
    if (rawKey === 'prosody')
      return `韵律 ${rawValue}`
    if (rawKey === 'beat')
      return `节拍 ${rawValue}`
    if (rawKey === 'mouth')
      return `口部 ${rawValue}`
    if (rawKey === 'head')
      return `头部 ${rawValue}`
    if (rawKey === 'provenance')
      return formatSpeechAuthorityFilterValue('settle-authority', rawValue)
    if (rawKey === 'segment')
      return `片段 ${rawValue}`
    return `${rawKey} ${rawValue}`
  })

  return formattedMetrics.length > 0 ? `${styleRaw}，${formattedMetrics.join('，')}` : styleRaw
}

function formatTimingSummary(value: string) {
  if (!value.includes('|') || (!value.includes('facial=') && !value.includes('action=') && !value.includes('emotion=')))
    return value

  const parts = value.split('|').map(part => part.trim()).filter(Boolean)
  if (parts.length === 0)
    return value

  const [durationsRaw, ...states] = parts
  const durations = durationsRaw.split(' ').map(part => part.trim()).filter(Boolean)
  const formattedDurations = durations.map((duration) => {
    const [rawKey, rawValue] = duration.split('=').map(part => part.trim())
    if (!rawKey || !rawValue)
      return duration
    const withUnit = rawValue === 'n/a' ? rawValue : `${rawValue}ms`
    if (rawKey === 'facial')
      return `表情 ${withUnit}`
    if (rawKey === 'action')
      return `动作 ${withUnit}`
    if (rawKey === 'emotion')
      return `情绪 ${withUnit}`
    return `${rawKey} ${rawValue}`
  })

  const formattedStates = states.map((state) => {
    if (state === 'segment-start')
      return '片段起始'
    if (state === 'cadence-peak')
      return '节拍峰值'
    if (state === 'soft-interrupt')
      return '软打断'
    if (state === 'hard-interrupt')
      return '硬打断'
    if (state === 'continue')
      return '继续'
    if (state === 'hold')
      return '保持'
    if (state === 'release')
      return '释放'
    if (state === 'linger')
      return '停留'
    return state
  })

  return [...formattedDurations, ...formattedStates].join('，')
}

function formatVisemeHintsSummary(value: string) {
  if (!value.includes(':') || !value.includes('@'))
    return value

  const hints = value.split('|').map(part => part.trim()).filter(Boolean)
  const formatted = hints.map((hint) => {
    const [nameAndWeight, remainderRaw] = hint.split('@').map(part => part.trim())
    const [name, weight] = nameAndWeight?.split(':').map(part => part.trim()) ?? []
    if (!name || !weight || !remainderRaw)
      return hint

    const remainderParts = remainderRaw.split(' ').map(part => part.trim()).filter(Boolean)
    const confidenceRaw = remainderParts[0]
    if (!confidenceRaw)
      return hint

    const metadata = new Map<string, string>()
    for (const part of remainderParts.slice(1)) {
      const separatorIndex = part.indexOf('=')
      if (separatorIndex <= 0)
        continue
      const key = part.slice(0, separatorIndex).trim()
      const rawValue = part.slice(separatorIndex + 1).trim()
      if (key && rawValue)
        metadata.set(key, rawValue)
    }

    const extras = [
      metadata.get('src') ? `来源 ${formatSpeechCueMetadataValue('source', metadata.get('src')!)}` : null,
      metadata.get('segment') ? `片段 ${metadata.get('segment')}` : null,
    ].filter((part): part is string => Boolean(part))

    return extras.length > 0
      ? `${formatVisemeName(name)} 权重 ${weight}（置信 ${confidenceRaw}，${extras.join('，')}）`
      : `${formatVisemeName(name)} 权重 ${weight}（置信 ${confidenceRaw}）`
  })
  return formatted.length > 0 ? formatted.join('，') : value
}

function appendLaneTruthToDescriptiveAuthoritySummary(input: {
  kind: 'authority-binding' | 'authority-match'
  summary: string | null | undefined
  matchSummary?: string | null
  matchedDrivers?: Array<PerformanceVisualizerAuthorityDriver> | null
  authorityMismatchSummary?: string | null
  voiceSegmentMatched?: boolean | null
}) {
  const summary = input.summary?.trim() ?? null
  if (!summary)
    return null

  const authorityLaneTruth = resolveAuthorityLaneTruth({
    matchSummary: input.matchSummary,
    matchedDrivers: input.matchedDrivers,
    authorityMismatchSummary: input.authorityMismatchSummary,
    voiceSegmentMatched: input.voiceSegmentMatched,
  })
  const voiceSegmentMatched = authorityLaneTruth.authority.voiceSegmentMatched
  const voiceLaneDisplay = voiceSegmentMatched == null
    ? null
    : voiceSegmentMatched ? '声音命中' : '声音未命中'
  const alreadyStructured = ['body', 'face', 'motion', 'lipsync'].some(driver =>
    resolveDriverMatchFlagFromSummary(summary, driver as PerformanceVisualizerAuthorityDriver) != null,
  )
  const structuredVoiceFlag = resolveDriverMatchFlagFromSummary(summary, 'voice')
  if (alreadyStructured) {
    if (input.kind === 'authority-binding' || voiceLaneDisplay == null || structuredVoiceFlag != null)
      return summary

    return `${summary} voice:${voiceSegmentMatched ? 'yes' : 'no'}`
  }

  const laneDisplay = [
    authorityLaneTruth.authority.bodySegmentMatched != null
      ? authorityLaneTruth.authority.bodySegmentMatched ? '身体命中' : '身体未命中'
      : null,
    authorityLaneTruth.authority.faceSegmentMatched == null
      ? '表情未知'
      : authorityLaneTruth.authority.faceSegmentMatched ? '表情命中' : '表情未命中',
    authorityLaneTruth.authority.motionSegmentMatched == null
      ? '动作未知'
      : authorityLaneTruth.authority.motionSegmentMatched ? '动作命中' : '动作未命中',
    authorityLaneTruth.authority.lipsyncSegmentMatched == null
      ? '口型未知'
      : authorityLaneTruth.authority.lipsyncSegmentMatched ? '口型命中' : '口型未命中',
    voiceLaneDisplay,
  ].filter((part): part is string => Boolean(part)).join(' / ')
  if (!laneDisplay || laneDisplay === '身体未知 / 表情未知 / 动作未知 / 口型未知')
    return summary
  if (summary.includes(laneDisplay))
    return summary

  return `${summary} | ${laneDisplay}`
}

function toDisplayValue(
  key: PerformanceVisualizerSpeechDiagnosticSummaryEntry['key'],
  value: string,
) {
  const normalized = normalizeSummaryText(value)
  const withTechnicalValue = (displayValue: string) =>
    displayValue === normalized
      ? { value: displayValue }
      : { value: displayValue, technicalValue: normalized }

  switch (key) {
    case 'authority':
      return toAuthorityDisplayEntry('authority-binding', normalized)
    case 'authority-match':
      return toAuthorityDisplayEntry('authority-match', normalized)
    case 'voice':
      return withTechnicalValue(formatVoiceSummary(normalized))
    case 'prosody-authority':
      return withTechnicalValue(formatProsodyAuthoritySummary(normalized))
    case 'visemes':
      return withTechnicalValue(formatVisemeSummary(normalized))
    case 'cue':
      return withTechnicalValue(formatCueSummary(normalized))
    case 'persona-style':
      return withTechnicalValue(formatPersonaStyleSummary(normalized))
    case 'timing':
      return withTechnicalValue(formatTimingSummary(normalized))
    case 'driver-execution':
      return withTechnicalValue(formatSpeechDriverExecutionSummary(normalized))
    case 'viseme-hints':
      return withTechnicalValue(formatVisemeHintsSummary(normalized))
    case 'trace-embodiment':
      return withTechnicalValue(formatTraceEmbodimentDisplaySummary(normalized) ?? normalized)
    case 'settle-authority':
      return toAuthorityDisplayEntry('settle-authority', normalized)
    default:
      return {
        value: normalized,
      }
  }
}

function resolveThinMeasuredReturnAuthorityDisplay(input: {
  summary: string
  kind: 'authority' | 'settle-authority'
  continuityHint?: string | null
}) {
  const normalizedHint = input.continuityHint?.trim().toLowerCase() ?? ''
  if (
    !normalizedHint.includes('measured-return')
    || (
      !normalizedHint.includes('较薄证据维持')
      && !normalizedHint.includes('thin measured-return')
      && !normalizedHint.includes('noisy-detour continuity line')
      && !normalizedHint.includes('thinner measured-return continuity line')
    )
  ) {
    return null
  }

  const baseDisplay = input.kind === 'authority'
    ? formatAuthorityBindingDisplay(input.summary)
    : formatSettleAuthorityDisplay(input.summary)
  if (!baseDisplay.value.includes('当前仅剩'))
    return null

  return {
    value: baseDisplay.value.replace(/当前仅剩[^，]+维持同一段连续性/u, '噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持'),
    technicalValue: baseDisplay.technicalValue,
  }
}

function preferAuthorityTrustContinuityHint(input: {
  authorityTrustSummary?: string | null
  authorityMismatchDisplay?: string | null
  authorityMismatchReasonSummary?: string | null
}) {
  const authorityTrustSummary = input.authorityTrustSummary?.trim() ?? null
  const normalizedTrust = authorityTrustSummary?.toLowerCase() ?? ''

  if (
    normalizedTrust.includes('repair-before-closeness')
    && normalizedTrust.includes('quieter blink')
    && normalizedTrust.includes('softened gaze')
  ) {
    return authorityTrustSummary
  }

  if (
    normalizedTrust.includes('measured-return')
    && (
      normalizedTrust.includes('较薄证据维持')
      || normalizedTrust.includes('thin measured-return')
      || normalizedTrust.includes('noisy-detour continuity line')
      || normalizedTrust.includes('thinner measured-return continuity line')
    )
  ) {
    return authorityTrustSummary
  }

  return input.authorityMismatchDisplay
    ?? input.authorityMismatchReasonSummary
    ?? authorityTrustSummary
    ?? null
}

function isRicherContinuityAuthorityTrustSummary(summary: string | null | undefined) {
  const normalized = summary?.trim().toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('仍带着“')
    || normalized.includes('关系余温')
    || normalized.includes('repair-before-closeness')
    || normalized.includes('same-turn-if-invited')
    || (
      normalized.includes('measured-return')
      && (
        normalized.includes('较薄证据维持')
        || normalized.includes('thin measured-return')
        || normalized.includes('thinner measured-return continuity line')
        || normalized.includes('回身线')
      )
    )
}

function resolveSpeechAuthorityTrustSummary(input: {
  authorityTrustSummary?: string | null
  authorityBindingSummary?: string | null
  settleAuthoritySummary?: string | null
  voiceSegmentMatched?: boolean | null
}) {
  const upstreamAuthorityTrustSummary = hasValue(input.authorityTrustSummary)
    ? normalizeSummaryText(input.authorityTrustSummary!)
    : null
  const fallbackAuthorityTrustSummary = resolveAuthorityTrustSummaryWithFallback({
    authorityTrustSummary: input.authorityTrustSummary,
    authorityBindingSummary: input.authorityBindingSummary,
    settleAuthoritySummary: input.settleAuthoritySummary,
    rendererTarget: null,
    voiceSegmentMatched: input.voiceSegmentMatched,
  })

  if (!upstreamAuthorityTrustSummary)
    return fallbackAuthorityTrustSummary
  if (!fallbackAuthorityTrustSummary || fallbackAuthorityTrustSummary === upstreamAuthorityTrustSummary)
    return upstreamAuthorityTrustSummary

  return isRicherContinuityAuthorityTrustSummary(fallbackAuthorityTrustSummary)
    && !isRicherContinuityAuthorityTrustSummary(upstreamAuthorityTrustSummary)
    ? fallbackAuthorityTrustSummary
    : upstreamAuthorityTrustSummary
}

export function buildSpeechDiagnosticSummaryEntries(
  input: BuildSpeechDiagnosticSummaryEntriesInput,
): PerformanceVisualizerSpeechDiagnosticSummaryEntry[] {
  const entries: PerformanceVisualizerSpeechDiagnosticSummaryEntry[] = []
  const authoritySegmentId = extractStructuredSegmentId(input.authorityBindingSummary)
    ?? extractStructuredSegmentId(input.settleAuthoritySummary)
    ?? null
  const voiceSegmentMatched = input.authorityVoiceSegmentMatched
    ?? resolveVoiceSegmentMatched({
      authoritySegmentId,
      voiceSummary: input.speechEvidence?.voiceSummary,
    })
  const authorityTrustSummary = resolveSpeechAuthorityTrustSummary({
    authorityTrustSummary: input.authorityTrustSummary,
    authorityBindingSummary: input.authorityBindingSummary,
    settleAuthoritySummary: input.settleAuthoritySummary,
    voiceSegmentMatched,
  })
  const continuityHint = preferAuthorityTrustContinuityHint({
    authorityTrustSummary,
    authorityMismatchDisplay: input.authorityMismatchDisplay,
    authorityMismatchReasonSummary: input.authorityMismatchReasonSummary,
  })
  const authorityBindingSummary = appendLaneTruthToDescriptiveAuthoritySummary({
    kind: 'authority-binding',
    summary: input.authorityBindingSummary,
    matchSummary: input.authorityMatchSummary,
    matchedDrivers: input.authorityMatchedDrivers,
    authorityMismatchSummary: input.authorityMismatchSummary,
    voiceSegmentMatched,
  }) ?? input.authorityBindingSummary ?? null
  const authorityMatchSummary = appendLaneTruthToDescriptiveAuthoritySummary({
    kind: 'authority-match',
    summary: input.authorityMatchSummary,
    matchSummary: input.authorityMatchSummary,
    matchedDrivers: input.authorityMatchedDrivers,
    authorityMismatchSummary: input.authorityMismatchSummary,
    voiceSegmentMatched,
  }) ?? input.authorityMatchSummary ?? null
  const pushEntry = (entry: PerformanceVisualizerSpeechDiagnosticSummaryEntry) => {
    entries.push(entry.technicalValue
      ? entry
      : {
          key: entry.key,
          label: entry.label,
          value: entry.value,
        })
  }

  if (hasValue(authorityBindingSummary)) {
    const summary = resolveThinMeasuredReturnAuthorityDisplay({
      summary: authorityBindingSummary!,
      kind: 'authority',
      continuityHint,
    }) ?? formatAuthorityBindingDisplay(authorityBindingSummary!, continuityHint)
    pushEntry({
      key: 'authority',
      label: '权威绑定',
      value: appendPendingRejoinDisplayFromTechnicalValue({
        value: summary.value,
        technicalValue: summary.technicalValue,
      }),
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(authorityMatchSummary)) {
    const summary = toDisplayValue('authority-match', authorityMatchSummary!)
    pushEntry({
      key: 'authority-match',
      label: '绑定命中',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  const embodimentClosureStage = extractEmbodimentClosureStage(
    input.speechEvidence?.embodimentClosureStage ?? null,
    authorityBindingSummary,
    input.settleAuthoritySummary,
    input.authorityMismatchDisplay,
    input.authorityMismatchReasonSummary,
    input.speechEvidence?.driverExecutionSummary ?? null,
  )
  if (hasValue(embodimentClosureStage)) {
    pushEntry({
      key: 'closure-stage',
      label: '闭环阶段',
      value: embodimentClosureStage!,
    })
  }
  if (hasValue(authorityTrustSummary)) {
    pushEntry({
      key: 'authority-trust',
      label: '权威可信性',
      value: authorityTrustSummary!,
    })
  }
  if (hasValue(input.sameHerSignature)) {
    pushEntry({
      key: 'continuity-signature',
      label: '同一人签名',
      value: input.sameHerSignature!,
    })
  }
  const executionSafetyGate = resolveExecutionSafetyGateDiagnostic(input.sameHerReasonTags)
  if (executionSafetyGate) {
    pushEntry({
      key: 'execution-safety-gate',
      label: '执行安全门',
      ...executionSafetyGate,
    })
  }
  const sameHerReasons = formatList(input.sameHerReasonTags)
  if (sameHerReasons) {
    pushEntry({
      key: 'continuity-reasons',
      label: '同一人线索',
      value: sameHerReasons,
    })
  }
  if (hasValue(input.authorityMismatchDisplay) || hasValue(input.authorityMismatchReasonSummary) || hasValue(input.authorityMismatchSummary)) {
    pushEntry({
      key: 'authority-mismatch',
      label: '权威漂移',
      value: input.authorityMismatchDisplay ?? input.authorityMismatchReasonSummary ?? input.authorityMismatchSummary ?? '',
    })
  }
  if (hasValue(input.rendererDriftSummary)) {
    pushEntry({
      key: 'renderer-drift',
      label: '显形归因',
      value: input.rendererDriftSummary!,
    })
  }
  if (hasValue(input.speechEvidence?.voiceSummary)) {
    const summary = toDisplayValue('voice', input.speechEvidence!.voiceSummary!)
    pushEntry({
      key: 'voice',
      label: '语音韵律',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(input.speechEvidence?.prosodyAuthoritySummary)) {
    const summary = toDisplayValue('prosody-authority', input.speechEvidence!.prosodyAuthoritySummary!)
    pushEntry({
      key: 'prosody-authority',
      label: '韵律权威',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(input.speechEvidence?.topVisemeSummary)) {
    const summary = toDisplayValue('visemes', input.speechEvidence!.topVisemeSummary!)
    pushEntry({
      key: 'visemes',
      label: '主口型',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(input.speechEvidence?.cueSummary)) {
    const summary = toDisplayValue('cue', input.speechEvidence!.cueSummary!)
    pushEntry({
      key: 'cue',
      label: '微表情线索',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(input.speechEvidence?.personaStyleSummary)) {
    const summary = toDisplayValue('persona-style', input.speechEvidence!.personaStyleSummary!)
    pushEntry({
      key: 'persona-style',
      label: '人设风格',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(input.speechEvidence?.timingSummary)) {
    const summary = toDisplayValue('timing', input.speechEvidence!.timingSummary!)
    pushEntry({
      key: 'timing',
      label: '时序节奏',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(input.speechEvidence?.driverExecutionSummary)) {
    const summary = toDisplayValue('driver-execution', input.speechEvidence!.driverExecutionSummary!)
    pushEntry({
      key: 'driver-execution',
      label: '驱动执行',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(input.traceEmbodimentSummary)) {
    const summary = toDisplayValue('trace-embodiment', input.traceEmbodimentSummary!)
    pushEntry({
      key: 'trace-embodiment',
      label: '轨迹落点',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(input.speechEvidence?.visemeHintsSummary)) {
    const summary = toDisplayValue('viseme-hints', input.speechEvidence!.visemeHintsSummary!)
    pushEntry({
      key: 'viseme-hints',
      label: '口型提示',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (input.includeSettleAuthority && hasValue(input.settleAuthoritySummary)) {
    const summary = resolveThinMeasuredReturnAuthorityDisplay({
      summary: input.settleAuthoritySummary!,
      kind: 'settle-authority',
      continuityHint,
    }) ?? toDisplayValue('settle-authority', input.settleAuthoritySummary!)
    pushEntry({
      key: 'settle-authority',
      label: '稳定段归因',
      value: appendPendingRejoinDisplayFromTechnicalValue({
        value: summary.value,
        technicalValue: summary.technicalValue,
      }),
      technicalValue: summary.technicalValue,
    })
  }

  return entries
}

export function buildSpeechDiagnosticSummaryLines(
  entries: PerformanceVisualizerSpeechDiagnosticSummaryEntry[],
) {
  return entries.map((entry) => {
    const value = entry.value
    switch (entry.key) {
      case 'authority':
        return `authority: ${value}`
      case 'authority-match':
        return `authority-match: ${value}`
      case 'execution-safety-gate':
        return `execution-safety-gate: ${value}`
      case 'authority-mismatch':
        return `authority-mismatch: ${value}`
      case 'renderer-drift':
        return `renderer-drift: ${value}`
      case 'voice':
        return `voice: ${value}`
      case 'prosody-authority':
        return `prosody-authority: ${value}`
      case 'visemes':
        return `visemes: ${value}`
      case 'cue':
        return `cue: ${value}`
      case 'persona-style':
        return `persona-style: ${value}`
      case 'timing':
        return `timing: ${value}`
      case 'driver-execution':
        return `driver-execution: ${value}`
      case 'trace-embodiment':
        return `trace-embodiment: ${value}`
      case 'viseme-hints':
        return `viseme-hints: ${value}`
      case 'settle-authority':
        return `settle-authority: ${value}`
      default:
        return `${entry.key}: ${value}`
    }
  })
}
