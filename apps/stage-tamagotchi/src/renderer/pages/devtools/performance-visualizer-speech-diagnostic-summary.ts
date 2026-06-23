import type { PerformanceVisualizerSpeechEvidenceSnapshot } from './performance-visualizer-speech-evidence'

import { toAuthorityDisplayEntry } from './performance-visualizer-runtime-diagnostic-summary'
import { formatSpeechAuthorityFilterValue, formatSpeechCueMetadataValue, formatSpeechDriverExecutionSummary } from './performance-visualizer-speech-display'
import { formatTraceEmbodimentDisplaySummary } from './performance-visualizer-trace-embodiment'

export interface PerformanceVisualizerSpeechDiagnosticSummaryEntry {
  key:
    | 'authority'
    | 'authority-match'
    | 'authority-trust'
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
  authorityTrustSummary?: string | null
  authorityMismatchSummary?: string | null
  authorityMismatchReasonSummary?: string | null
  authorityMismatchDisplay?: string | null
  rendererDriftSummary?: string | null
  settleAuthoritySummary?: string | null
  traceEmbodimentSummary?: string | null
  includeSettleAuthority?: boolean
  speechEvidence?: PerformanceVisualizerSpeechEvidenceSnapshot | null
}

function hasValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'n/a'
}

function normalizeSummaryText(value: string) {
  return value.trim()
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

function formatProsodyAuthoritySummary(value: string) {
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

export function buildSpeechDiagnosticSummaryEntries(
  input: BuildSpeechDiagnosticSummaryEntriesInput,
): PerformanceVisualizerSpeechDiagnosticSummaryEntry[] {
  const entries: PerformanceVisualizerSpeechDiagnosticSummaryEntry[] = []
  const pushEntry = (entry: PerformanceVisualizerSpeechDiagnosticSummaryEntry) => {
    entries.push(entry.technicalValue
      ? entry
      : {
          key: entry.key,
          label: entry.label,
          value: entry.value,
        })
  }

  if (hasValue(input.authorityBindingSummary)) {
    const summary = toDisplayValue('authority', input.authorityBindingSummary!)
    pushEntry({
      key: 'authority',
      label: '权威绑定',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(input.authorityMatchSummary)) {
    const summary = toDisplayValue('authority-match', input.authorityMatchSummary!)
    pushEntry({
      key: 'authority-match',
      label: '绑定命中',
      value: summary.value,
      technicalValue: summary.technicalValue,
    })
  }
  if (hasValue(input.authorityTrustSummary)) {
    pushEntry({
      key: 'authority-trust',
      label: '权威可信性',
      value: input.authorityTrustSummary!,
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
    const summary = toDisplayValue('settle-authority', input.settleAuthoritySummary!)
    pushEntry({
      key: 'settle-authority',
      label: '稳定段归因',
      value: summary.value,
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
