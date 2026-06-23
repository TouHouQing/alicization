import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { PerformanceVisualizerRendererTarget } from './performance-visualizer-driver-authority'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { PerformanceVisualizerRuntimeAuthorityOverview } from './performance-visualizer-runtime-authority-overview'

import { deriveAuthorityTrustSummary } from './performance-visualizer-authority-trust'
import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'
import { formatRendererAlignmentSummary } from './performance-visualizer-speech-observability'

export interface PerformanceVisualizerTraceTimelineSummaryEntry {
  key:
    | 'event-kind'
    | 'event-trace-id'
    | 'event-summary'
    | 'event-created-at'
    | 'renderer-live2d-cause'
    | 'renderer-vrm-cause'
    | 'trace-id'
    | 'trace-thread'
    | 'trace-turn-mode'
    | 'trace-truth-state'
    | 'trace-repair-state'
    | 'trace-surface-policy'
    | 'trace-closure-state'
    | 'trace-authority-trust'
    | 'trace-suppression-tags'
  label: string
  value: string
  technicalValue?: string
}

export interface PerformanceVisualizerTraceTimelineBlockEntry {
  heading: string
  body: string
}

export interface PerformanceVisualizerTraceTimelineDetailBlockEntry extends PerformanceVisualizerTraceTimelineBlockEntry {
  details: string[]
}

export interface PerformanceVisualizerTraceTimelineAuthorityContext {
  prosodyAuthoritySummary?: string | null
  settleAuthoritySummary?: string | null
  authoritySegmentId?: string | null
  authorityRendererTarget?: PerformanceVisualizerRendererTarget
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  authorityMatchedDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
}

function hasValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'n/a'
}

function formatList(values: string[] | undefined) {
  const normalized = (values ?? []).map(value => value.trim()).filter(Boolean)
  return normalized.length > 0 ? normalized.join(', ') : null
}

function formatHeading(kind: string | null | undefined, createdAt: number | null | undefined) {
  return `${kind ?? 'n/a'} @ ${typeof createdAt === 'number' && Number.isFinite(createdAt) ? createdAt : 'n/a'}`
}

function formatBody(summary: string | null | undefined) {
  if (typeof summary !== 'string')
    return 'n/a'

  const normalized = summary.trim()
  return normalized && normalized !== 'n/a' ? normalized : 'n/a'
}

function pushSummaryEntry(
  entries: PerformanceVisualizerTraceTimelineSummaryEntry[],
  entry: PerformanceVisualizerTraceTimelineSummaryEntry,
) {
  entries.push(entry.technicalValue
    ? entry
    : {
        key: entry.key,
        label: entry.label,
        value: entry.value,
      })
}

function withTechnicalValue(displayValue: string, technicalValue: string) {
  const normalized = technicalValue.trim()
  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function formatTraceTurnModeDisplay(value: string) {
  if (value === 'care')
    return withTechnicalValue('关怀回合', value)
  if (value === 'accompany')
    return withTechnicalValue('陪伴回合', value)
  if (value === 'answer')
    return withTechnicalValue('回答回合', value)
  if (value === 'guide-current-knot')
    return withTechnicalValue('引导当前结点', value)
  if (value === 'screen-repair')
    return withTechnicalValue('屏幕修复回合', value)
  if (value === 'grounded-inspection')
    return withTechnicalValue('贴地核查回合', value)
  return { value }
}

function formatTraceTruthStateDisplay(value: string) {
  if (value === 'live-grounded')
    return withTechnicalValue('live-grounded（当前事实已贴地）', value)
  if (value === 'live-observed')
    return withTechnicalValue('live-observed（仍属当前观察）', value)
  if (value === 'remembered')
    return withTechnicalValue('remembered（来自延续记忆）', value)
  if (value === 'uncertain')
    return withTechnicalValue('uncertain（仍待重新贴地）', value)
  if (value === 'imagined')
    return withTechnicalValue('imagined（仅为想象推演）', value)
  return { value }
}

function formatTraceRepairStateDisplay(value: string) {
  if (value === 'none')
    return withTechnicalValue('无需修复', value)
  if (value === 'stale-anchor')
    return withTechnicalValue('需要纠正过期锚点', value)
  if (value === 'need-reground')
    return withTechnicalValue('需要重新贴地', value)
  return { value }
}

function formatTraceSurfacePolicyDisplay(value: string) {
  if (value === 'procedural-carry')
    return withTechnicalValue('procedural-carry（沿既有过程延续表达）', value)
  return { value }
}

function formatTraceClosureStateDisplay(value: string) {
  if (value === 'grounded-recall')
    return withTechnicalValue('grounded-recall（基于记忆回收落稳）', value)
  return { value }
}

export function buildRecentDrivingEventSummaryEntries(
  event: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingEvent'] | null | undefined,
  rendererAlignment?: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment'] | null,
  rendererDriftSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererDriftSummary'] | null,
): PerformanceVisualizerTraceTimelineSummaryEntry[] {
  if (!event)
    return []

  const entries: PerformanceVisualizerTraceTimelineSummaryEntry[] = []
  if (hasValue(event.kind))
    pushSummaryEntry(entries, { key: 'event-kind', label: '最近事件类型', value: event.kind! })
  if (hasValue(event.decisionTraceId))
    pushSummaryEntry(entries, { key: 'event-trace-id', label: '最近事件轨迹', value: event.decisionTraceId! })
  if (hasValue(event.summary))
    pushSummaryEntry(entries, { key: 'event-summary', label: '最近事件摘要', value: event.summary! })
  if (typeof event.createdAt === 'number' && Number.isFinite(event.createdAt)) {
    pushSummaryEntry(entries, { key: 'event-created-at', label: '最近事件时间', value: String(event.createdAt) })
  }

  const rendererAlignmentSummary = rendererDriftSummary
    ? {
        live2d: rendererDriftSummary.live2d,
        vrm: rendererDriftSummary.vrm,
      }
    : formatRendererAlignmentSummary(rendererAlignment)
  if (rendererAlignmentSummary.live2d) {
    pushSummaryEntry(entries, {
      key: 'renderer-live2d-cause',
      label: 'Live2D 显形归因',
      value: rendererAlignmentSummary.live2d,
    })
  }
  if (rendererAlignmentSummary.vrm) {
    pushSummaryEntry(entries, {
      key: 'renderer-vrm-cause',
      label: 'VRM 显形归因',
      value: rendererAlignmentSummary.vrm,
    })
  }

  return entries
}

export function buildRecentDrivingTraceRecordSummaryEntries(
  traceRecord: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceRecord'] | null | undefined,
  authorityContext?: PerformanceVisualizerTraceTimelineAuthorityContext | null,
): PerformanceVisualizerTraceTimelineSummaryEntry[] {
  if (!traceRecord)
    return []

  const entries: PerformanceVisualizerTraceTimelineSummaryEntry[] = [
    { key: 'trace-id', label: '决策轨迹', value: traceRecord.decisionTraceId },
  ]

  if (hasValue(traceRecord.activeThreadId))
    pushSummaryEntry(entries, { key: 'trace-thread', label: '活跃线程', value: traceRecord.activeThreadId! })
  if (hasValue(traceRecord.turnMode)) {
    pushSummaryEntry(entries, {
      key: 'trace-turn-mode',
      label: '回合模式',
      ...formatTraceTurnModeDisplay(traceRecord.turnMode!),
    })
  }
  if (hasValue(traceRecord.truthState)) {
    pushSummaryEntry(entries, {
      key: 'trace-truth-state',
      label: '真值状态',
      ...formatTraceTruthStateDisplay(traceRecord.truthState!),
    })
  }
  if (hasValue(traceRecord.repairState)) {
    pushSummaryEntry(entries, {
      key: 'trace-repair-state',
      label: '修复状态',
      ...formatTraceRepairStateDisplay(traceRecord.repairState!),
    })
  }
  if (hasValue(traceRecord.finalSurfacePolicy)) {
    pushSummaryEntry(entries, {
      key: 'trace-surface-policy',
      label: '表面策略',
      ...formatTraceSurfacePolicyDisplay(traceRecord.finalSurfacePolicy!),
    })
  }
  if (hasValue(traceRecord.closureState)) {
    pushSummaryEntry(entries, {
      key: 'trace-closure-state',
      label: '收口状态',
      ...formatTraceClosureStateDisplay(traceRecord.closureState!),
    })
  }
  const runtimeAuthorityTrustSummary = hasValue((traceRecord as any).authorityTrustSummary as string | null | undefined)
    ? (((traceRecord as any).authorityTrustSummary as string | null | undefined)?.trim() ?? null)
    : null
  const resolvedAuthorityTrustSummary = resolveAuthorityTrustSummaryWithFallback({
    authorityTrustSummary: runtimeAuthorityTrustSummary,
    settleAuthoritySummary: authorityContext?.settleAuthoritySummary ?? null,
    rendererTarget: authorityContext?.authorityRendererTarget ?? null,
    residentMode: authorityContext?.residentMode ?? null,
    preferredBlinkCadence: authorityContext?.preferredBlinkCadence ?? null,
    preferredGazeMode: authorityContext?.preferredGazeMode ?? null,
    prosodyAuthoritySummary: authorityContext?.prosodyAuthoritySummary ?? null,
    authoritySegmentId: authorityContext?.authoritySegmentId ?? null,
    authorityMatchedDrivers: authorityContext?.authorityMatchedDrivers ?? [],
    bodySegmentMatched: authorityContext?.bodySegmentMatched ?? null,
    faceSegmentMatched: authorityContext?.faceSegmentMatched ?? null,
    motionSegmentMatched: authorityContext?.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: authorityContext?.lipsyncSegmentMatched ?? null,
  }) ?? deriveAuthorityTrustSummary({
    prosodyAuthoritySummary: authorityContext?.prosodyAuthoritySummary ?? null,
    settleAuthoritySummary: authorityContext?.settleAuthoritySummary ?? null,
    authoritySegmentId: authorityContext?.authoritySegmentId ?? null,
    authorityRendererTarget: authorityContext?.authorityRendererTarget ?? null,
    residentMode: authorityContext?.residentMode ?? null,
    preferredBlinkCadence: authorityContext?.preferredBlinkCadence ?? null,
    preferredGazeMode: authorityContext?.preferredGazeMode ?? null,
    authorityMatchedDrivers: authorityContext?.authorityMatchedDrivers ?? [],
    bodySegmentMatched: authorityContext?.bodySegmentMatched ?? null,
    faceSegmentMatched: authorityContext?.faceSegmentMatched ?? null,
    motionSegmentMatched: authorityContext?.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: authorityContext?.lipsyncSegmentMatched ?? null,
  })

  if (hasValue(resolvedAuthorityTrustSummary)) {
    pushSummaryEntry(entries, {
      key: 'trace-authority-trust',
      label: '权威可信性',
      value: resolvedAuthorityTrustSummary!,
    })
  }
  const suppressionTags = formatList(traceRecord.suppressionTags)
  if (suppressionTags)
    pushSummaryEntry(entries, { key: 'trace-suppression-tags', label: '抑制标签', value: suppressionTags })

  return entries
}

export function buildRecentDrivingTraceRecordSummaryEntriesFromDiagnostics(input: {
  speechEmbodiment?: StageThreeRuntimeSpeechEmbodimentDiagnostics | null
  runtimeAuthorityOverview?: PerformanceVisualizerRuntimeAuthorityOverview | null
  playbackCueAuthorityView?: PerformanceVisualizerPlaybackCueAuthorityView | null
}): PerformanceVisualizerTraceTimelineSummaryEntry[] {
  const traceRecord = input.speechEmbodiment?.recentDrivingTraceRecord
  if (!traceRecord)
    return []

  return buildRecentDrivingTraceRecordSummaryEntries(
    {
      ...traceRecord,
      authorityTrustSummary: input.runtimeAuthorityOverview?.authorityTrustSummary
        ?? input.playbackCueAuthorityView?.authorityTrustSummary
        ?? null,
    } as typeof traceRecord & { authorityTrustSummary?: string | null },
    input.playbackCueAuthorityView
      ? {
          prosodyAuthoritySummary: input.playbackCueAuthorityView.prosodyAuthoritySummary ?? null,
          settleAuthoritySummary: input.playbackCueAuthorityView.settleAuthoritySummary ?? null,
          authoritySegmentId: input.playbackCueAuthorityView.authoritySegmentId ?? null,
          authorityRendererTarget: input.playbackCueAuthorityView.authorityRendererTarget ?? null,
          residentMode: input.playbackCueAuthorityView.residentMode ?? null,
          preferredBlinkCadence: input.playbackCueAuthorityView.preferredBlinkCadence ?? null,
          preferredGazeMode: input.playbackCueAuthorityView.preferredGazeMode ?? null,
          authorityMatchedDrivers: input.playbackCueAuthorityView.authorityMatchedDrivers,
          bodySegmentMatched: input.playbackCueAuthorityView.bodySegmentMatched ?? null,
          faceSegmentMatched: input.playbackCueAuthorityView.faceSegmentMatched ?? null,
          motionSegmentMatched: input.playbackCueAuthorityView.motionSegmentMatched ?? null,
          lipsyncSegmentMatched: input.playbackCueAuthorityView.lipsyncSegmentMatched ?? null,
        }
      : null,
  )
}

export function buildRecentDrivingTraceEventEntries(
  events: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceEvents'] | null | undefined,
): PerformanceVisualizerTraceTimelineBlockEntry[] {
  return (events ?? []).map(event => ({
    heading: formatHeading(event.kind, event.createdAt),
    body: formatBody(event.summary),
  }))
}

export function buildRecentDrivingTraceDetailEntries(
  details: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceDetails'] | null | undefined,
): PerformanceVisualizerTraceTimelineDetailBlockEntry[] {
  return (details ?? []).map(event => ({
    heading: formatHeading(event.kind, event.createdAt),
    body: formatBody(event.summary),
    details: event.details
      .map(detail => `${detail.label}: ${detail.value}`)
      .filter(detail => detail.trim().length > 0),
  }))
}
