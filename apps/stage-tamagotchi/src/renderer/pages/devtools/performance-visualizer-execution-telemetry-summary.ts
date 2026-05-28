import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'

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

function deriveAuthorityTrustSummary(prosodyAuthoritySummary: string | null | undefined) {
  const summary = typeof prosodyAuthoritySummary === 'string' ? normalizeSummaryText(prosodyAuthoritySummary) : null
  if (!summary)
    return null

  if (
    summary.includes('provenance=authority-bound')
    && /(?:^|\s|\|)segment=([^\s|]+)/.test(summary)
  ) {
    return {
      value: '韵律权威链已重新绑定到当前片段，可直接进入长期基线。',
      technicalValue: summary,
    }
  }

  return null
}

function formatDriverTelemetrySummary(value: string, options?: { includeMode?: boolean }) {
  const parts = parsePipeSummary(value)
  if (parts.length === 0)
    return { value: normalizeSummaryText(value) }

  const [cue, ...detailParts] = parts
  const formattedDetails = detailParts.map((part) => {
    const labels = options?.includeMode
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
  telemetryRendererTarget: 'live2d' | 'vrm' | null
}): PerformanceVisualizerExecutionTelemetrySummaryEntry[] {
  const entries: PerformanceVisualizerExecutionTelemetrySummaryEntry[] = []
  const driverSummary = input.driverSummary
  const live2dExecution = input.live2dExecution

  if (hasValue(driverSummary?.rendererTarget))
    pushSummaryEntry(entries, { key: 'driver-renderer-target', label: '驱动渲染目标', value: driverSummary!.rendererTarget! })

  const authorityTrustSummary = hasValue(input.authorityTrustSummary)
    ? {
        value: input.authorityTrustSummary!,
        technicalValue: typeof input.prosodyAuthoritySummary === 'string'
          ? normalizeSummaryText(input.prosodyAuthoritySummary)
          : input.authorityTrustSummary!,
      }
    : deriveAuthorityTrustSummary(input.prosodyAuthoritySummary)
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
