import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { PerformanceVisualizerRuntimeAuthorityOverview } from './performance-visualizer-runtime-authority-overview'

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
    | 'authority-trust'
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
    rendererTarget: 'live2d' | 'vrm' | null
    matchedDrivers: Array<'face' | 'motion' | 'lipsync'>
    matchedSources: string[]
  }
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

function normalizeSummaryText(value: string) {
  return value.trim()
}

function formatAuthorityRendererTarget(value: string) {
  if (value === 'vrm')
    return 'VRM'
  if (value === 'live2d')
    return 'Live2D'
  return value
}

function formatAuthorityDriver(value: string) {
  if (value === 'face')
    return '表情'
  if (value === 'motion')
    return '动作'
  if (value === 'lipsync')
    return '口型'
  return value
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
  const match = normalized.match(/^face:(\S+)\s+motion:(\S+)\s+lipsync:(\S+)$/)
  if (!match)
    return { value: normalized }

  const [, face, motion, lipsync] = match
  return {
    value: [
      `表情${formatAuthorityMatchFlag(face)}`,
      `动作${formatAuthorityMatchFlag(motion)}`,
      `口型${formatAuthorityMatchFlag(lipsync)}`,
    ].join(' / '),
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

export function formatAuthorityBindingDisplay(value: string) {
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
  const parts = [
    target ? `目标 ${formatAuthorityRendererTarget(target)}` : null,
    drivers ? `驱动 ${drivers}` : null,
    sources ? `来源 ${sources}` : null,
    matchDisplay ? `命中 ${matchDisplay}` : null,
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
  const parts = [
    parsed.prefix,
    segment ? `片段 ${segment}` : null,
    target ? `目标 ${formatAuthorityRendererTarget(target)}` : null,
    drivers ? `驱动 ${drivers}` : null,
    sources ? `来源 ${sources}` : null,
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
  overview: Pick<
    PerformanceVisualizerRuntimeAuthorityOverview,
    'rendererTarget'
    | 'authoritySegmentId'
    | 'authorityBindingSummary'
    | 'authorityMatchSummary'
    | 'authorityTrustSummary'
    | 'prosodyAuthoritySummary'
    | 'authorityMismatchSummary'
    | 'authorityMismatchReasonSummary'
    | 'authorityMismatchDisplay'
    | 'settleAuthoritySummary'
  > | null | undefined,
): PerformanceVisualizerRuntimeDiagnosticSummaryEntry[] {
  if (!overview)
    return []

  const entries: PerformanceVisualizerRuntimeDiagnosticSummaryEntry[] = []
  if (hasValue(overview.rendererTarget))
    pushSummaryEntry(entries, { key: 'renderer-target', label: '渲染目标', value: overview.rendererTarget! })
  if (hasValue(overview.authoritySegmentId))
    pushSummaryEntry(entries, { key: 'authority-segment', label: '权威片段', value: overview.authoritySegmentId! })
  if (hasValue(overview.authorityBindingSummary))
    pushSummaryEntry(entries, {
      key: 'authority-binding',
      label: '权威绑定',
      ...toAuthorityDisplayEntry('authority-binding', overview.authorityBindingSummary!),
    })
  if (hasValue(overview.authorityMatchSummary))
    pushSummaryEntry(entries, {
      key: 'authority-match',
      label: '绑定命中',
      ...toAuthorityDisplayEntry('authority-match', overview.authorityMatchSummary!),
    })
  if (hasValue(overview.authorityTrustSummary))
    pushSummaryEntry(entries, {
      key: 'authority-trust',
      label: '权威可信性',
      value: overview.authorityTrustSummary!,
    })
  if (hasValue(overview.prosodyAuthoritySummary))
    pushSummaryEntry(entries, {
      key: 'prosody-authority',
      label: '韵律权威',
      ...toAuthorityDisplayEntry('prosody-authority', overview.prosodyAuthoritySummary!),
    })
  if (hasValue(overview.authorityMismatchDisplay) || hasValue(overview.authorityMismatchReasonSummary) || hasValue(overview.authorityMismatchSummary)) {
    pushSummaryEntry(entries, {
      key: 'authority-mismatch',
      label: '权威漂移',
      value: overview.authorityMismatchDisplay ?? overview.authorityMismatchReasonSummary ?? overview.authorityMismatchSummary ?? '',
    })
  }
  if (hasValue(overview.settleAuthoritySummary))
    pushSummaryEntry(entries, {
      key: 'settle-authority',
      label: '稳定段归因',
      ...toAuthorityDisplayEntry('settle-authority', overview.settleAuthoritySummary!),
    })
  return entries
}

export function buildPlaybackCueAuthoritySummaryEntries(
  view: PerformanceVisualizerPlaybackCueAuthorityView | null | undefined,
): PerformanceVisualizerRuntimeDiagnosticSummaryEntry[] {
  if (!view)
    return []

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
  if (hasValue(view.authorityBindingSummary))
    pushSummaryEntry(entries, {
      key: 'authority-binding',
      label: '权威绑定',
      ...toAuthorityDisplayEntry('authority-binding', view.authorityBindingSummary!),
    })
  if (hasValue(view.authorityMatchSummary))
    pushSummaryEntry(entries, {
      key: 'authority-match',
      label: '绑定命中',
      ...toAuthorityDisplayEntry('authority-match', view.authorityMatchSummary!),
    })
  if (hasValue(view.authorityTrustSummary))
    pushSummaryEntry(entries, {
      key: 'authority-trust',
      label: '权威可信性',
      value: view.authorityTrustSummary!,
    })
  if (hasValue(view.prosodyAuthoritySummary))
    pushSummaryEntry(entries, {
      key: 'prosody-authority',
      label: '韵律权威',
      ...toAuthorityDisplayEntry('prosody-authority', view.prosodyAuthoritySummary!),
    })
  if (hasValue(view.settleAuthoritySummary))
    pushSummaryEntry(entries, {
      key: 'settle-authority',
      label: '稳定段归因',
      ...toAuthorityDisplayEntry('settle-authority', view.settleAuthoritySummary!),
    })
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
