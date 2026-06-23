import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type {
  PerformanceVisualizerAuthorityDriver,
  PerformanceVisualizerRendererTarget,
} from './performance-visualizer-driver-authority'
import type { PerformanceVisualizerPlaybackCueAuthorityView } from './performance-visualizer-playback-cue'
import type { PerformanceVisualizerRuntimeAuthorityOverview } from './performance-visualizer-runtime-authority-overview'

import { deriveAuthorityTrustSummary as deriveSharedAuthorityTrustSummary } from './performance-visualizer-authority-trust'
import {
  formatResolvedProsodyAuthoritySummary,
  resolveProsodyAuthorityFromSources,
} from './performance-visualizer-prosody-authority'
import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'

export interface PerformanceVisualizerExecutionTelemetrySummaryEntry {
  key:
    | 'resident-profile'
    | 'resident-variation'
    | 'resident-face'
    | 'resident-action'
    | 'resident-action-intensity'
    | 'resident-breath-drive'
    | 'resident-focus-drive'
    | 'resident-watch-mode'
    | 'resident-body-state'
    | 'resident-continuity'
    | 'resident-thought'
    | 'resident-tension'
    | 'resident-runtime-channel'
    | 'resident-runtime-summary'
    | 'resident-thread'
    | 'resident-presence'
    | 'resident-selected-action'
    | 'resident-persona-bias'
    | 'resident-opening-guidance'
    | 'resident-scene'
    | 'resident-transition'
    | 'resident-rationale-tags'
    | 'resident-focus-belief'
    | 'resident-focus-inquiry'
    | 'resident-commitment'
    | 'resident-runtime-thread-id'
    | 'resident-governor-drive'
    | 'resident-governor-intention'
    | 'resident-thought-thread'
    | 'driver-renderer-target'
    | 'driver-authority-trust'
    | 'driver-face'
    | 'driver-motion'
    | 'driver-lipsync'
    | 'live2d-expression'
    | 'live2d-motion'
    | 'live2d-cue'
    | 'expression-aliases'
    | 'motion-aliases'
    | 'live2d-settle'
    | 'telemetry-renderer-target'
  label: string
  value: string
  technicalValue?: string
}

function hasValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'n/a'
}

function formatMaybeNumber(value: number | null | undefined, digits = 2) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(digits)
    : null
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

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function extractStructuredSegmentId(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  const match = normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)
  return normalizeText(match?.[1])
}

function shouldSuppressProsodyOnlyVoicePromotion(input: {
  prosodyAuthoritySummary: string | null
  authoritySegmentId?: string | null
  authorityMatchedDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
  bodySegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
}) {
  if (typeof input.voiceSegmentMatched === 'boolean')
    return false

  const summary = input.prosodyAuthoritySummary
  const authoritySegmentId = normalizeText(input.authoritySegmentId)
  if (!summary || !authoritySegmentId)
    return false

  const prosodySegmentId = extractStructuredSegmentId(summary)
  if (
    !summary.includes('provenance=authority-bound')
    || !prosodySegmentId
    || prosodySegmentId !== authoritySegmentId
  ) {
    return false
  }

  const bodyMatched = input.bodySegmentMatched === true
    && input.authorityMatchedDrivers?.includes('body')
  const lipsyncMatched = input.lipsyncSegmentMatched === true
    && input.authorityMatchedDrivers?.includes('lipsync')

  return Boolean(bodyMatched && !lipsyncMatched)
}

function resolveMatchedDriversFromLaneTruth(input: {
  matchedDrivers: PerformanceVisualizerAuthorityDriver[]
  bodySegmentMatched: boolean | null
  faceSegmentMatched: boolean | null
  motionSegmentMatched: boolean | null
  lipsyncSegmentMatched: boolean | null
  voiceSegmentMatched: boolean | null
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

function pushSummaryEntry(
  entries: PerformanceVisualizerExecutionTelemetrySummaryEntry[],
  entry: PerformanceVisualizerExecutionTelemetrySummaryEntry,
) {
  entries.push(entry.technicalValue
    ? entry
    : {
        key: entry.key,
        label: entry.label,
        value: entry.value,
      })
}

function parsePipeSummary(value: string) {
  return normalizeSummaryText(value).split('|').map(part => part.trim()).filter(Boolean)
}

function formatKeyValuePart(part: string, labels: Record<string, string>) {
  const separatorIndex = part.indexOf('=')
  if (separatorIndex < 0)
    return null

  const key = part.slice(0, separatorIndex).trim()
  const rawValue = part.slice(separatorIndex + 1).trim()
  if (!key || !rawValue)
    return null

  return `${labels[key] ?? key} ${rawValue}`
}

function withTechnicalValue(displayValue: string, technicalValue: string) {
  const normalizedTechnicalValue = normalizeSummaryText(technicalValue)
  return displayValue === normalizedTechnicalValue
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalizedTechnicalValue }
}

function deriveAuthorityTrustSummary(input: {
  prosodyAuthoritySummary: string | null | undefined
  settleAuthoritySummary?: string | null | undefined
  authoritySegmentId?: string | null
  authorityRendererTarget?: PerformanceVisualizerRendererTarget
  authorityMatchedDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  live2dExpressionName?: string | null
  live2dMotionGroup?: string | null
}) {
  const summary = typeof input.prosodyAuthoritySummary === 'string'
    ? normalizeSummaryText(input.prosodyAuthoritySummary)
    : null
  const trustSummary = shouldSuppressProsodyOnlyVoicePromotion({
    prosodyAuthoritySummary: summary,
    authoritySegmentId: input.authoritySegmentId ?? null,
    authorityMatchedDrivers: input.authorityMatchedDrivers ?? [],
    bodySegmentMatched: input.bodySegmentMatched ?? null,
    lipsyncSegmentMatched: input.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched: input.voiceSegmentMatched ?? null,
  })
    ? null
    : summary

  if (
    input.authorityRendererTarget === 'live2d'
    && input.authoritySegmentId
    && input.residentMode === 'repair-before-closeness'
    && input.faceSegmentMatched === true
    && input.motionSegmentMatched === true
    && input.lipsyncSegmentMatched === true
    && input.authorityMatchedDrivers?.includes('face')
    && input.authorityMatchedDrivers?.includes('motion')
    && input.authorityMatchedDrivers?.includes('lipsync')
    && input.live2dExpressionName === 'RecoverSoft'
    && input.live2dMotionGroup === 'StillnessGuard'
  ) {
    return {
      value: 'Live2D 这段 authority 仍停在 repair-before-closeness 的回身线里，这次只是 later callback 的轻声接回，不是重新打开一段新的靠近。',
      technicalValue: summary ?? 'Live2D 这段 authority 仍停在 repair-before-closeness 的回身线里，这次只是 later callback 的轻声接回，不是重新打开一段新的靠近。',
    }
  }

  const value = deriveSharedAuthorityTrustSummary({
    prosodyAuthoritySummary: trustSummary,
    settleAuthoritySummary: typeof input.settleAuthoritySummary === 'string'
      ? normalizeSummaryText(input.settleAuthoritySummary)
      : null,
    authoritySegmentId: input.authoritySegmentId ?? null,
    authorityRendererTarget: input.authorityRendererTarget ?? null,
    residentMode: input.residentMode ?? null,
    preferredBlinkCadence: input.preferredBlinkCadence ?? null,
    preferredGazeMode: input.preferredGazeMode ?? null,
    authorityMatchedDrivers: input.authorityMatchedDrivers ?? [],
    bodySegmentMatched: input.bodySegmentMatched ?? null,
    faceSegmentMatched: input.faceSegmentMatched ?? null,
    motionSegmentMatched: input.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: input.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched: input.voiceSegmentMatched ?? null,
  })

  return value
    ? {
        value,
        technicalValue: summary ?? value,
      }
    : null
}

function formatDriverTelemetrySummary(value: string, options?: { includeMode?: boolean }) {
  const parts = parsePipeSummary(value)
  if (parts.length === 0)
    return { value: normalizeSummaryText(value) }

  const [cue, ...detailParts] = parts
  const formattedDetails = detailParts.map((part) => {
    const labels: Record<string, string> = options?.includeMode
      ? {
          src: '来源',
          conf: '置信',
          segment: '片段',
          mode: '模式',
        }
      : {
          src: '来源',
          conf: '置信',
          segment: '片段',
        }
    return formatKeyValuePart(part, labels) ?? part
  })
  const displayValue = [cue, ...formattedDetails].join('，')
  return withTechnicalValue(displayValue, value)
}

function formatLive2DExpressionSummary(value: string) {
  const parts = parsePipeSummary(value)
  if (parts.length === 0)
    return { value: normalizeSummaryText(value) }

  const [name, ...detailParts] = parts
  const formattedDetails = detailParts.map(part => formatKeyValuePart(part, {
    reason: '原因',
    score: '分数',
    segment: '片段',
  }) ?? part)
  const displayValue = [name, ...formattedDetails].join('，')
  return withTechnicalValue(displayValue, value)
}

function formatLive2DSettleSummary(value: string) {
  const parts = parsePipeSummary(value)
  if (parts.length === 0)
    return { value: normalizeSummaryText(value) }

  const formattedDetails = parts.map(part => formatKeyValuePart(part, {
    facialRelease: '表情回收',
    motionFollow: '动作跟随',
  }) ?? part)
  const displayValue = formattedDetails.join('，')
  return withTechnicalValue(displayValue, value)
}

function formatResidentThoughtSummary(value: string) {
  const normalized = normalizeSummaryText(value)
  const [stance, shouldSpeak] = normalized.split('/').map(part => part.trim())
  if (!stance && !shouldSpeak)
    return { value: normalized }

  const displayValue = `姿态 ${stance || 'n/a'}，是否发声 ${shouldSpeak || 'n/a'}`
  return withTechnicalValue(displayValue, value)
}

function formatResidentThreadSummary(value: string) {
  const normalized = normalizeSummaryText(value)
  const [threadId, title] = normalized.split('/').map(part => part.trim())
  if (!threadId && !title)
    return { value: normalized }

  const displayValue = `${threadId || 'n/a'}，标题 ${title || 'n/a'}`
  return withTechnicalValue(displayValue, value)
}

function formatResidentSceneSummary(value: string) {
  const normalized = normalizeSummaryText(value)
  const [scenario, scene] = normalized.split('/').map(part => part.trim())
  if (!scenario && !scene)
    return { value: normalized }

  const displayValue = `场景 ${scenario || 'n/a'}，界面 ${scene || 'n/a'}`
  return withTechnicalValue(displayValue, value)
}

function formatResidentTransitionSummary(value: string) {
  const parts = parsePipeSummary(value)
  if (parts.length === 0)
    return { value: normalizeSummaryText(value) }

  const [transition, reason, duration] = parts
  const detailParts = [
    transition ?? 'n/a',
    `原因 ${reason ?? 'n/a'}`,
    `耗时 ${duration ?? 'n/a'}`,
  ]
  const displayValue = detailParts.join('，')
  return withTechnicalValue(displayValue, value)
}

function formatResidentTelemetrySummary(
  key: PerformanceVisualizerExecutionTelemetrySummaryEntry['key'],
  value: string,
) {
  switch (key) {
    case 'resident-thought':
      return formatResidentThoughtSummary(value)
    case 'resident-thread':
      return formatResidentThreadSummary(value)
    case 'resident-scene':
      return formatResidentSceneSummary(value)
    case 'resident-transition':
      return formatResidentTransitionSummary(value)
    default:
      return { value: normalizeSummaryText(value) }
  }
}

export function buildResidentRuntimeTelemetrySummaryEntries(
  runtimeDynamics: StageThreeRuntimeSpeechEmbodimentDiagnostics['runtimeDynamics'] | null | undefined,
): PerformanceVisualizerExecutionTelemetrySummaryEntry[] {
  if (!runtimeDynamics)
    return []

  const provenance = runtimeDynamics.provenance
  const eventPointers = runtimeDynamics.eventPointers
  const entries: PerformanceVisualizerExecutionTelemetrySummaryEntry[] = []

  pushSummaryEntry(entries, { key: 'resident-profile', label: '驻留档位', value: runtimeDynamics.profile })
  if (hasValue(runtimeDynamics.variationToken))
    pushSummaryEntry(entries, { key: 'resident-variation', label: '驻留变体', value: runtimeDynamics.variationToken! })
  if (hasValue(runtimeDynamics.residentFacialCue))
    pushSummaryEntry(entries, { key: 'resident-face', label: '驻留表情', value: runtimeDynamics.residentFacialCue! })
  if (hasValue(runtimeDynamics.residentActionCue))
    pushSummaryEntry(entries, { key: 'resident-action', label: '驻留动作', value: runtimeDynamics.residentActionCue! })
  const actionIntensity = formatMaybeNumber(runtimeDynamics.actionIntensity)
  if (actionIntensity)
    pushSummaryEntry(entries, { key: 'resident-action-intensity', label: '动作强度', value: actionIntensity })
  const breathDrive = formatMaybeNumber(runtimeDynamics.breathDrive)
  if (breathDrive)
    pushSummaryEntry(entries, { key: 'resident-breath-drive', label: '呼吸驱动', value: breathDrive })
  const focusDrive = formatMaybeNumber(runtimeDynamics.focusDrive)
  if (focusDrive)
    pushSummaryEntry(entries, { key: 'resident-focus-drive', label: '专注驱动', value: focusDrive })
  if (hasValue(provenance?.watchMode))
    pushSummaryEntry(entries, { key: 'resident-watch-mode', label: '驻留观察模式', value: provenance.watchMode! })
  if (hasValue(provenance?.bodyState))
    pushSummaryEntry(entries, { key: 'resident-body-state', label: '驻留体态', value: provenance.bodyState! })
  if (hasValue(provenance?.continuityMode))
    pushSummaryEntry(entries, { key: 'resident-continuity', label: '连续性模式', value: provenance.continuityMode! })
  if (hasValue(provenance?.thoughtStance) || typeof provenance?.thoughtShouldSpeak === 'boolean') {
    const technicalValue = `${provenance?.thoughtStance ?? 'n/a'} / ${typeof provenance?.thoughtShouldSpeak === 'boolean' ? String(provenance.thoughtShouldSpeak) : 'n/a'}`
    pushSummaryEntry(entries, {
      key: 'resident-thought',
      label: '思绪立场',
      ...formatResidentTelemetrySummary('resident-thought', technicalValue),
    })
  }
  if (hasValue(provenance?.thoughtTension))
    pushSummaryEntry(entries, { key: 'resident-tension', label: '情绪张力', value: provenance.thoughtTension! })
  if (hasValue(provenance?.runtimeChannel))
    pushSummaryEntry(entries, { key: 'resident-runtime-channel', label: '运行通道', value: provenance.runtimeChannel! })
  if (hasValue(provenance?.runtimeSummary))
    pushSummaryEntry(entries, { key: 'resident-runtime-summary', label: '运行摘要', value: provenance.runtimeSummary! })
  if (hasValue(provenance?.activeThreadId) || hasValue(provenance?.activeThreadTitle)) {
    const technicalValue = `${provenance?.activeThreadId ?? 'n/a'} / ${provenance?.activeThreadTitle ?? 'n/a'}`
    pushSummaryEntry(entries, {
      key: 'resident-thread',
      label: '活跃线程',
      ...formatResidentTelemetrySummary('resident-thread', technicalValue),
    })
  }
  if (hasValue(provenance?.preferredPresence))
    pushSummaryEntry(entries, { key: 'resident-presence', label: '偏好存在感', value: provenance.preferredPresence! })
  if (hasValue(provenance?.selectedAction))
    pushSummaryEntry(entries, { key: 'resident-selected-action', label: '已选动作', value: provenance.selectedAction! })
  if (hasValue(provenance?.personaBiasSummary))
    pushSummaryEntry(entries, { key: 'resident-persona-bias', label: '人设偏压', value: provenance.personaBiasSummary! })
  if (hasValue(provenance?.personaOpeningGuidance))
    pushSummaryEntry(entries, { key: 'resident-opening-guidance', label: '开场指导', value: provenance.personaOpeningGuidance! })
  if (hasValue(provenance?.scenario) || hasValue(provenance?.scene)) {
    const technicalValue = `${provenance?.scenario ?? 'n/a'} / ${provenance?.scene ?? 'n/a'}`
    pushSummaryEntry(entries, {
      key: 'resident-scene',
      label: '场景落点',
      ...formatResidentTelemetrySummary('resident-scene', technicalValue),
    })
  }
  if (eventPointers?.recentTransition) {
    const transition = eventPointers.recentTransition
    const technicalValue = `${transition.fromWatchMode ?? 'n/a'} -> ${transition.toWatchMode ?? 'n/a'} | ${transition.reason ?? 'n/a'} | ${transition.durationMs}ms`
    pushSummaryEntry(entries, {
      key: 'resident-transition',
      label: '最近切换',
      ...formatResidentTelemetrySummary('resident-transition', technicalValue),
    })
  }
  const rationaleTags = formatList(eventPointers?.rationaleTags)
  if (rationaleTags)
    pushSummaryEntry(entries, { key: 'resident-rationale-tags', label: '理由标签', value: rationaleTags })
  if (hasValue(eventPointers?.focusBeliefId))
    pushSummaryEntry(entries, { key: 'resident-focus-belief', label: '焦点信念', value: eventPointers!.focusBeliefId! })
  if (hasValue(eventPointers?.focusInquiryId))
    pushSummaryEntry(entries, { key: 'resident-focus-inquiry', label: '焦点追问', value: eventPointers!.focusInquiryId! })
  if (hasValue(eventPointers?.commitmentId))
    pushSummaryEntry(entries, { key: 'resident-commitment', label: '承诺链路', value: eventPointers!.commitmentId! })
  if (hasValue(eventPointers?.runtimeThreadId))
    pushSummaryEntry(entries, { key: 'resident-runtime-thread-id', label: '运行线程 ID', value: eventPointers!.runtimeThreadId! })
  if (hasValue(eventPointers?.governorDrive))
    pushSummaryEntry(entries, { key: 'resident-governor-drive', label: '治理驱动', value: eventPointers!.governorDrive! })
  if (hasValue(eventPointers?.governorIntentionId))
    pushSummaryEntry(entries, { key: 'resident-governor-intention', label: '治理意图', value: eventPointers!.governorIntentionId! })
  if (hasValue(eventPointers?.selectedThoughtThreadId))
    pushSummaryEntry(entries, { key: 'resident-thought-thread', label: '思绪线程', value: eventPointers!.selectedThoughtThreadId! })

  return entries
}

export function buildDriverExecutionTelemetrySummaryEntries(input: {
  driverSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverSummary'] | null | undefined
  live2dExecution: StageThreeRuntimeSpeechEmbodimentDiagnostics['live2dExecution'] | null | undefined
  authorityTrustSummary?: string | null
  prosodyAuthoritySummary?: string | null
  settleAuthoritySummary?: string | null
  authoritySegmentId?: string | null
  authorityMatchedDrivers?: Array<'body' | 'face' | 'motion' | 'lipsync' | 'voice'>
  bodySegmentMatched?: boolean | null
  faceSegmentMatched?: boolean | null
  motionSegmentMatched?: boolean | null
  lipsyncSegmentMatched?: boolean | null
  voiceSegmentMatched?: boolean | null
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  telemetryRendererTarget: PerformanceVisualizerRendererTarget
}): PerformanceVisualizerExecutionTelemetrySummaryEntry[] {
  const entries: PerformanceVisualizerExecutionTelemetrySummaryEntry[] = []
  const driverSummary = input.driverSummary
  const live2dExecution = input.live2dExecution
  const resolvedAuthorityMatchedDrivers = resolveMatchedDriversFromLaneTruth({
    matchedDrivers: input.authorityMatchedDrivers ?? [],
    bodySegmentMatched: input.bodySegmentMatched ?? null,
    faceSegmentMatched: input.faceSegmentMatched ?? null,
    motionSegmentMatched: input.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: input.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched: input.voiceSegmentMatched ?? null,
  })

  if (hasValue(driverSummary?.rendererTarget))
    pushSummaryEntry(entries, { key: 'driver-renderer-target', label: '驱动渲染目标', value: driverSummary!.rendererTarget! })

  const specializedAuthorityTrustSummary = deriveAuthorityTrustSummary({
    prosodyAuthoritySummary: input.prosodyAuthoritySummary,
    settleAuthoritySummary: input.settleAuthoritySummary,
    authoritySegmentId: input.authoritySegmentId ?? null,
    authorityRendererTarget: input.telemetryRendererTarget,
    residentMode: input.residentMode ?? null,
    preferredBlinkCadence: input.preferredBlinkCadence ?? null,
    preferredGazeMode: input.preferredGazeMode ?? null,
    authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
    bodySegmentMatched: input.bodySegmentMatched ?? null,
    faceSegmentMatched: input.faceSegmentMatched ?? null,
    motionSegmentMatched: input.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: input.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched: input.voiceSegmentMatched ?? null,
    live2dExpressionName: live2dExecution?.activeExpression?.name ?? null,
    live2dMotionGroup: live2dExecution?.activeMotion?.group ?? null,
  })
  const resolvedAuthorityTrustSummary = resolveAuthorityTrustSummaryWithFallback({
    authorityTrustSummary: hasValue(input.authorityTrustSummary)
      ? normalizeSummaryText(input.authorityTrustSummary!)
      : null,
    settleAuthoritySummary: input.settleAuthoritySummary,
    rendererTarget: input.telemetryRendererTarget,
    residentMode: input.residentMode ?? null,
    preferredBlinkCadence: input.preferredBlinkCadence ?? null,
    preferredGazeMode: input.preferredGazeMode ?? null,
    prosodyAuthoritySummary: input.prosodyAuthoritySummary,
    authoritySegmentId: input.authoritySegmentId ?? null,
    authorityMatchedDrivers: resolvedAuthorityMatchedDrivers,
    bodySegmentMatched: input.bodySegmentMatched ?? null,
    faceSegmentMatched: input.faceSegmentMatched ?? null,
    motionSegmentMatched: input.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: input.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched: input.voiceSegmentMatched ?? null,
  })
  const preferredAuthorityTrustSummary = hasValue(input.authorityTrustSummary)
    ? resolvedAuthorityTrustSummary
    : specializedAuthorityTrustSummary?.value ?? resolvedAuthorityTrustSummary
  const authorityTrustSummary = preferredAuthorityTrustSummary
    ? {
        value: preferredAuthorityTrustSummary,
        technicalValue: typeof input.prosodyAuthoritySummary === 'string'
          ? normalizeSummaryText(input.prosodyAuthoritySummary)
          : preferredAuthorityTrustSummary,
      }
    : null
  if (authorityTrustSummary) {
    pushSummaryEntry(entries, {
      key: 'driver-authority-trust',
      label: '驱动权威可信性',
      value: authorityTrustSummary.value,
      technicalValue: authorityTrustSummary.technicalValue,
    })
  }

  if (driverSummary?.face && hasValue(driverSummary.face.cue)) {
    const technicalValue = `${driverSummary.face.cue} | src=${driverSummary.face.source ?? 'n/a'} | conf=${formatMaybeNumber(driverSummary.face.confidence) ?? 'n/a'} | segment=${driverSummary.face.segmentId ?? 'n/a'}`
    pushSummaryEntry(entries, {
      key: 'driver-face',
      label: '表情驱动',
      ...formatDriverTelemetrySummary(technicalValue),
    })
  }
  if (driverSummary?.motion && hasValue(driverSummary.motion.cue)) {
    const technicalValue = `${driverSummary.motion.cue} | src=${driverSummary.motion.source ?? 'n/a'} | conf=${formatMaybeNumber(driverSummary.motion.confidence) ?? 'n/a'} | segment=${driverSummary.motion.segmentId ?? 'n/a'}`
    pushSummaryEntry(entries, {
      key: 'driver-motion',
      label: '动作驱动',
      ...formatDriverTelemetrySummary(technicalValue),
    })
  }
  if (driverSummary?.lipsync && hasValue(driverSummary.lipsync.cue)) {
    const technicalValue = `${driverSummary.lipsync.cue} | src=${driverSummary.lipsync.source ?? 'n/a'} | conf=${formatMaybeNumber(driverSummary.lipsync.confidence) ?? 'n/a'} | segment=${driverSummary.lipsync.segmentId ?? 'n/a'} | mode=${driverSummary.lipsync.mode ?? 'n/a'}`
    pushSummaryEntry(entries, {
      key: 'driver-lipsync',
      label: '口型驱动',
      ...formatDriverTelemetrySummary(technicalValue, { includeMode: true }),
    })
  }

  if (live2dExecution?.activeExpression && hasValue(live2dExecution.activeExpression.name)) {
    const technicalValue = `${live2dExecution.activeExpression.name} | reason=${live2dExecution.activeExpression.reason ?? 'n/a'} | score=${formatMaybeNumber(live2dExecution.activeExpression.score) ?? 'n/a'} | segment=${live2dExecution.activeExpression.segmentId ?? 'n/a'}`
    pushSummaryEntry(entries, {
      key: 'live2d-expression',
      label: 'Live2D 表情执行',
      ...formatLive2DExpressionSummary(technicalValue),
    })
  }
  if (live2dExecution?.activeMotion && hasValue(live2dExecution.activeMotion.group)) {
    const technicalValue = `${live2dExecution.activeMotion.group} / ${live2dExecution.activeMotion.index ?? 'n/a'} | segment=${live2dExecution.activeMotion.segmentId ?? 'n/a'}`
    pushSummaryEntry(entries, {
      key: 'live2d-motion',
      label: 'Live2D 动作执行',
      ...formatDriverTelemetrySummary(technicalValue),
    })
  }
  if (live2dExecution?.cue && (hasValue(live2dExecution.cue.emotion) || hasValue(live2dExecution.cue.facialCue))) {
    pushSummaryEntry(entries, {
      key: 'live2d-cue',
      label: 'Live2D 线索',
      value: `${live2dExecution.cue.emotion ?? 'n/a'} / ${live2dExecution.cue.facialCue ?? 'n/a'}`,
    })
  }
  const preferredExpressionAliases = formatList(live2dExecution?.cue?.preferredExpressionAliases)
  if (preferredExpressionAliases) {
    pushSummaryEntry(entries, {
      key: 'expression-aliases',
      label: '表情别名偏好',
      value: preferredExpressionAliases,
    })
  }
  const preferredMotionAliases = formatList(live2dExecution?.cue?.preferredMotionAliases)
  if (preferredMotionAliases) {
    pushSummaryEntry(entries, {
      key: 'motion-aliases',
      label: '动作别名偏好',
      value: preferredMotionAliases,
    })
  }
  const live2dFacialReleaseMs = formatMs(live2dExecution?.cue?.live2dFacialReleaseMs)
  const live2dMotionFollowThroughMs = formatMs(live2dExecution?.cue?.live2dMotionFollowThroughMs)
  if (live2dFacialReleaseMs || live2dMotionFollowThroughMs) {
    const technicalValue = `facialRelease=${live2dFacialReleaseMs ?? 'n/a'} | motionFollow=${live2dMotionFollowThroughMs ?? 'n/a'}`
    pushSummaryEntry(entries, {
      key: 'live2d-settle',
      label: 'Live2D 稳定参数',
      ...formatLive2DSettleSummary(technicalValue),
    })
  }
  if (hasValue(input.telemetryRendererTarget))
    pushSummaryEntry(entries, { key: 'telemetry-renderer-target', label: 'Telemetry 渲染目标', value: input.telemetryRendererTarget! })

  return entries
}

export function buildDriverExecutionTelemetrySummaryEntriesFromDiagnostics(input: {
  speechEmbodiment?: StageThreeRuntimeSpeechEmbodimentDiagnostics | null
  runtimeAuthorityOverview?: PerformanceVisualizerRuntimeAuthorityOverview | null
  playbackCueAuthorityView?: PerformanceVisualizerPlaybackCueAuthorityView | null
}): PerformanceVisualizerExecutionTelemetrySummaryEntry[] {
  const speechEmbodiment = input.speechEmbodiment ?? null
  const runtimeAuthorityOverview = input.runtimeAuthorityOverview ?? null
  const playbackCueAuthorityView = input.playbackCueAuthorityView ?? null
  const playbackTelemetry = speechEmbodiment?.playbackTelemetry ?? null
  const driverAuthority = playbackTelemetry?.driverAuthority ?? null
  const telemetryProsodyAuthority = resolveProsodyAuthorityFromSources(playbackTelemetry)
  const telemetryProsodyAuthoritySummary = normalizeText((playbackTelemetry?.prosodyAuthority as { summary?: string | null } | null | undefined)?.summary)
    ?? formatResolvedProsodyAuthoritySummary(telemetryProsodyAuthority)
  const activeAuthoritySegmentId = normalizeText(playbackCueAuthorityView?.authoritySegmentId)
    ?? normalizeText(runtimeAuthorityOverview?.authoritySegmentId)
    ?? normalizeText(driverAuthority?.segmentId)
    ?? normalizeText(playbackTelemetry?.cue?.id)
    ?? normalizeText(telemetryProsodyAuthority?.segmentId)
    ?? null
  const upstreamAuthoritySegmentId = normalizeText(speechEmbodiment?.authoritySummary?.segmentId)
  const upstreamAuthorityScopedAway = Boolean(
    activeAuthoritySegmentId
    && upstreamAuthoritySegmentId
    && upstreamAuthoritySegmentId !== activeAuthoritySegmentId,
  )
  const upstreamProsodyAuthoritySummary = normalizeText(speechEmbodiment?.authoritySummary?.prosodyAuthoritySummary)
  const upstreamProsodyAuthoritySegmentId = extractStructuredSegmentId(upstreamProsodyAuthoritySummary)
  const scopedUpstreamProsodyAuthoritySummary = upstreamAuthorityScopedAway
    ? null
    : upstreamProsodyAuthoritySummary && activeAuthoritySegmentId && upstreamProsodyAuthoritySegmentId && upstreamProsodyAuthoritySegmentId !== activeAuthoritySegmentId
      ? null
      : upstreamProsodyAuthoritySummary
  const upstreamSettleAuthoritySummary = normalizeText(speechEmbodiment?.authoritySummary?.settleSummary)
  const upstreamSettleAuthoritySegmentId = extractStructuredSegmentId(upstreamSettleAuthoritySummary)
  const scopedUpstreamSettleAuthoritySummary = upstreamAuthorityScopedAway
    ? null
    : upstreamSettleAuthoritySummary && activeAuthoritySegmentId && upstreamSettleAuthoritySegmentId && upstreamSettleAuthoritySegmentId !== activeAuthoritySegmentId
      ? null
      : upstreamSettleAuthoritySummary

  return buildDriverExecutionTelemetrySummaryEntries({
    driverSummary: speechEmbodiment?.driverSummary,
    live2dExecution: speechEmbodiment?.live2dExecution,
    authorityTrustSummary: runtimeAuthorityOverview?.authorityTrustSummary
      ?? playbackCueAuthorityView?.authorityTrustSummary
      ?? null,
    prosodyAuthoritySummary: playbackCueAuthorityView?.prosodyAuthoritySummary
      ?? runtimeAuthorityOverview?.prosodyAuthoritySummary
      ?? scopedUpstreamProsodyAuthoritySummary
      ?? telemetryProsodyAuthoritySummary
      ?? null,
    settleAuthoritySummary: playbackCueAuthorityView?.settleAuthoritySummary
      ?? runtimeAuthorityOverview?.settleAuthoritySummary
      ?? scopedUpstreamSettleAuthoritySummary
      ?? null,
    authoritySegmentId: playbackCueAuthorityView?.authoritySegmentId
      ?? runtimeAuthorityOverview?.authoritySegmentId
      ?? (upstreamAuthorityScopedAway ? null : upstreamAuthoritySegmentId)
      ?? driverAuthority?.segmentId
      ?? playbackTelemetry?.cue?.id
      ?? telemetryProsodyAuthority?.segmentId
      ?? null,
    authorityMatchedDrivers: playbackCueAuthorityView?.authorityMatchedDrivers
      ?? driverAuthority?.matchedDrivers
      ?? [],
    bodySegmentMatched: playbackCueAuthorityView?.bodySegmentMatched
      ?? driverAuthority?.bodySegmentMatched
      ?? null,
    faceSegmentMatched: playbackCueAuthorityView?.faceSegmentMatched
      ?? driverAuthority?.faceSegmentMatched
      ?? null,
    motionSegmentMatched: playbackCueAuthorityView?.motionSegmentMatched
      ?? driverAuthority?.motionSegmentMatched
      ?? null,
    lipsyncSegmentMatched: playbackCueAuthorityView?.lipsyncSegmentMatched
      ?? driverAuthority?.lipsyncSegmentMatched
      ?? null,
    voiceSegmentMatched: playbackCueAuthorityView?.voiceSegmentMatched
      ?? runtimeAuthorityOverview?.voiceSegmentMatched
      ?? null,
    residentMode: playbackCueAuthorityView?.residentMode ?? null,
    preferredBlinkCadence: playbackCueAuthorityView?.preferredBlinkCadence ?? null,
    preferredGazeMode: playbackCueAuthorityView?.preferredGazeMode ?? null,
    telemetryRendererTarget: playbackTelemetry?.rendererTarget
      ?? playbackCueAuthorityView?.authorityRendererTarget
      ?? runtimeAuthorityOverview?.rendererTarget
      ?? null,
  })
}
