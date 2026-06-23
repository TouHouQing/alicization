import type { SelfEvolutionEvidencePanelInput } from './performance-visualizer-self-evolution-evidence'

import {
  resolveExecutionSafetyGateDiagnostic,
  toAuthorityDisplayEntry,
} from './performance-visualizer-runtime-diagnostic-summary'

export interface PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry {
  key:
    | 'status'
    | 'persona'
    | 'manifestation-cadence'
    | 'manifestation-bridge'
    | 'drift-start'
    | 'repair-owner'
    | 'first-check'
    | 'repair-path'
    | 'proactive'
    | 'resident'
    | 'renderer'
    | 'continuity'
    | 'execution-safety-gate'
    | 'adopted-anchor'
    | 'dominant-drift'
  label: string
  value: string
  technicalValue?: string
}

function hasValue(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'n/a'
}

function formatList(parts: Array<string | null | undefined>) {
  const normalized = parts
    .map(part => typeof part === 'string' ? part.trim() : '')
    .filter(Boolean)
  return normalized.length > 0 ? normalized.join(' | ') : null
}

function formatManifestationNode(style: string | null | undefined, presence: string | null | undefined, fallback: string) {
  const normalizedStyle = typeof style === 'string' ? style.trim() : ''
  const normalizedPresence = typeof presence === 'string' ? presence.trim() : ''
  if (!normalizedStyle && !normalizedPresence)
    return fallback
  return `${normalizedStyle || 'n/a'}/${normalizedPresence || 'n/a'}`
}

function firstSignal(values: Array<string | null | undefined>) {
  for (const value of values) {
    if (hasValue(value))
      return value!.trim()
  }
  return null
}

function toDisplayValue(value: string) {
  const normalized = value.trim()
  if (normalized.startsWith('renderer-drift:')) {
    const displayValue = `显形漂移：${normalized.slice('renderer-drift:'.length).trim()}`
    return displayValue === normalized
      ? { value: displayValue }
      : { value: displayValue, technicalValue: normalized }
  }
  if (normalized.startsWith('authority-mismatch:')) {
    const displayValue = `权威漂移：${normalized.slice('authority-mismatch:'.length).trim()}`
    return displayValue === normalized
      ? { value: displayValue }
      : { value: displayValue, technicalValue: normalized }
  }
  return { value: normalized }
}

function formatRepairPathDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/^persona drift /, '人格漂移 ')
    .replace(/^thought drift /, '思绪漂移 ')
    .replace(/^resident drift /, '驻留漂移 ')
    .replace(/^renderer drift /, '显形漂移 ')
    .replace(' -> thought trace ', ' -> 思绪轨迹 ')
    .replace(' -> resident trace ', ' -> 驻留轨迹 ')
    .replace(' -> authority trace ', ' -> 权威轨迹 ')
    .replace(' -> continuity anchor ', ' -> 连续性锚点 ')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function formatRepairOwnerDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bevolution\b/, '自我演化')
    .replace(/\bprivate thought governance\b/, '私有思绪治理')
    .replace(/\bresident projection\b/, '驻留投影')
    .replace(/\brenderer authority\b/, '显形权威')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function formatFirstCheckDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace('self-evolution kernel', '自我演化内核')
    .replace('active learning strategy', '主动学习策略')
    .replace('manifestation/action-ecology/persona-bias', '显形/行动生态/人格偏置')
    .replace('private thought governance', '私有思绪治理')
    .replace('opening guidance', '开场指引')
    .replace('visible reply blocking', '可见回复阻断')
    .replace('resident performance projection', '驻留表现投影')
    .replace('body authority', '身体权威')
    .replace('continuity tags', '连续性标签')
    .replace('renderer authority binding', '显形权威绑定')
    .replace('playback cues', '回放片段')
    .replace('driver execution', '驱动执行')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function formatStatusDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/^grounded\b/, '闭环稳定')
    .replace(/^drift\b/, '闭环漂移')
    .replace(/^partial\b/, '部分闭环')
    .replace(/^missing\b/, '闭环缺失')
    .replace(/\bdrift=none\b/, '漂移=无')
    .replace(/\bdrift=renderer\b/, '漂移=显形')
    .replace(/\bdrift=continuity\b/, '漂移=连续性')
    .replace(/\bdrift=proactive\b/, '漂移=主动性')
    .replace(/\bdrift=persona\b/, '漂移=人格')
    .replace(/\bdrift=mixed\b/, '漂移=混合')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function formatContinuityDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bactive-dialogue\b/, '主动对话')
    .replace(/\bcoding\b/, '编码中')
    .replace(/\bbounded-growth\b/, '有界成长')
    .replace(/\bboundary-violation\b/, '边界越线')
    .replace(/\bremembered-familiarity-memory-first\b/, '熟悉感记忆先行')
    .replace(/\bproject-state-same-her-continuity-required\b/, '项目状态必须继续守住同一个 her')
    .replace(/\bsemantic-judge:project-state-same-her-missing\b/, '项目状态回答一度丢失同一个 her 的明线')
    .replace(/\blane=face-only\b/, '当前仅剩表情维持同一段连续性')
    .replace(/\blane=body-only\b/, '当前仅剩身体维持同一段连续性')
    .replace(/\blane=motion-only\b/, '当前仅剩动作维持同一段连续性')
    .replace(/\blane=lipsync-only\b/, '当前仅剩口型维持同一段连续性')
    .replace(/\blane=voice-only\b/, '当前仅剩声音维持同一段连续性')
    .replace(/\blane=face\+lipsync-only\b/, '当前仅剩表情、口型维持同一段连续性')
    .replace(/\blane=body\+lipsync-only\b/, '当前仅剩身体、口型维持同一段连续性')
    .replace(/\blane=face\+motion-only\b/, '当前仅剩表情、动作维持同一段连续性')
    .replace(/\blane=motion\+lipsync-only\b/, '当前仅剩动作、口型维持同一段连续性')
    .replace(/\blane=face\+voice-only\b/, '当前仅剩表情、声音维持同一段连续性')
    .replace(/\blane=body\+voice-only\b/, '当前仅剩身体、声音维持同一段连续性')
    .replace(/\blane=motion\+voice-only\b/, '当前仅剩动作、声音维持同一段连续性')
    .replace(/\blane=lipsync\+voice-only\b/, '当前仅剩口型、声音维持同一段连续性')
    .replace(/\blane=face\+motion\+voice-only\b/, '当前仅剩表情、动作、声音维持同一段连续性')
    .replace(/\blane=face\+lipsync\+voice-only\b/, '当前仅剩表情、口型、声音维持同一段连续性')
    .replace(/\blane=motion\+lipsync\+voice-only\b/, '当前仅剩动作、口型、声音维持同一段连续性')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function resolveContinuityRendererSurface(params: {
  runtimeContinuityProjection: SelfEvolutionEvidencePanelInput['runtimeContinuityProjection']
  rendererTarget: string | null | undefined
}) {
  const runtimeRendererTarget = params.runtimeContinuityProjection?.rendererTarget
  const rendererRejoinSurfaceKey = params.runtimeContinuityProjection?.rendererRejoinSurfaceKey
  const resolvedRendererTarget = hasValue(params.rendererTarget)
    ? params.rendererTarget
    : hasValue(runtimeRendererTarget)
      ? runtimeRendererTarget
      : null

  if (resolvedRendererTarget === 'live2d')
    return 'Live2D'
  if (resolvedRendererTarget === 'vrm')
    return 'VRM'
  if (resolvedRendererTarget === 'speech')
    return 'speech'
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D'
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM'
  if (rendererRejoinSurfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech'
  return null
}

function hasRememberedFamiliarityMemoryFirst(input: SelfEvolutionEvidencePanelInput) {
  const lines = [
    ...(input.proactiveDecisionConsumptionSummary?.lines ?? []),
    ...(input.candidateTrajectorySummary?.lines ?? []),
    ...(input.identityDriftGovernanceSummary?.lines ?? []),
  ]

  return lines.some(line =>
    line.includes('memory-familiarity-restraint:')
    || line.includes('remembered-familiarity-trajectory:')
    || line.includes('remembered-familiarity-governance:'),
  )
}

function resolveRelationshipCadenceInternalization(input: SelfEvolutionEvidencePanelInput) {
  const learningReasons = input.selectedCandidateRuntimeAlignment?.learning?.reasons ?? []
  const cadenceReason = learningReasons.find(reason =>
    reason.includes('Relationship cadence internalization is active'),
  )
  if (cadenceReason) {
    if (
      cadenceReason.includes('same-turn-if-invited')
      && cadenceReason.includes('same callback line')
    ) {
      return 'Relationship cadence internalization is active, so same-turn-if-invited measured-return should stay on the same callback line instead of reading like a fresh reopening.'
    }
    return cadenceReason
  }

  const activeFocuses = input.selectedCandidateRuntimeAlignment?.learning?.activeFocuses ?? []
  if (activeFocuses.includes('internalize-relationship-cadence')) {
    return 'Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.'
  }

  return null
}

function hasProjectStateContinuityDrift(input: SelfEvolutionEvidencePanelInput) {
  return [
    ...(input.internalizationReadinessSummary?.lines ?? []),
    ...(input.preDialogueBriefingSummary?.lines ?? []),
  ].some(line =>
    line.includes('project-state continuity')
    || line.includes('Project same-her self line currently reads')
    || line.includes('sameHer=')
    || line.includes('project-state-same-her-continuity-required')
    || line.includes('semantic-judge:project-state-same-her-missing')
    || line.includes('pre-dialogue briefing drift')
    || line.includes('briefing drift')
    || line.includes('preDialogueBriefingDrift'),
  )
}

function resolveProjectStateSameHerRepairEvidence(input: SelfEvolutionEvidencePanelInput) {
  const lines = input.preDialogueBriefingSummary?.lines ?? []
  const repairs: string[] = []
  if (lines.some(line => line.includes('project-state-same-her-continuity-required')))
    repairs.push('project-state-same-her-continuity-required')
  if (lines.some(line => line.includes('semantic-judge:project-state-same-her-missing')))
    repairs.push('semantic-judge:project-state-same-her-missing')
  return repairs
}

function resolveProjectStateOpenClosureSummary(input: SelfEvolutionEvidencePanelInput) {
  const lines = input.preDialogueBriefingSummary?.lines ?? []
  const openLoopLine = lines.find(line => line.includes('Primary open life loop still centers on '))
  const nextClosureLine = lines.find(line => line.includes('Next closure target is still '))

  const summaries: string[] = []
  if (openLoopLine) {
    const openLoop = openLoopLine
      .replace(/^.*Primary open life loop still centers on /, '')
      .replace(/, so the next turn should.*$/i, '')
      .trim()
    if (openLoop)
      summaries.push(`当前未闭环项仍集中在 ${openLoop}`)
  }
  if (nextClosureLine) {
    const nextClosure = nextClosureLine
      .replace(/^.*Next closure target is still /, '')
      .replace(/, so the next turn should.*$/i, '')
      .trim()
    if (nextClosure)
      summaries.push(`下一步仍要继续收住 ${nextClosure}`)
  }
  return summaries
}

function formatPersonaDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bobserver\b/, '观察者')
    .replace(/\bobservant\b/, '善于观察')
    .replace(/\bsilent-observe\b/, '静默观察')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function formatProactiveDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bhold\b/, '保持')
    .replace(/\bopening-guidance:observe-first\b/, '开场指引：先观察')
    .replace(/\bbirth-anchored-restraint\b/, '初始锚定克制')
    .replace(/\brestraint-overridden\b/, '克制被覆盖')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function formatResidentDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\battentive\/accompany\b/, '专注陪伴')
    .replace(/\bthinking\/gentle\b/, '思考/温和')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function formatRendererDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bvrm\b/, 'VRM')
    .replace(/\blive2d\b/, 'Live2D')
    .replace(/\bbody:yes face:yes motion:yes lipsync:no\b \| (?=当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段)/, '')
    .replace(/\bface:yes motion:yes lipsync:yes\b/, '表情命中/动作命中/口型命中')
    .replace(/\bface:yes motion:yes lipsync:no\b/, '表情命中/动作命中/口型未命中')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function summarizeRendererAuthorityLaneTruth(
  rendererAuthorityProjection: SelfEvolutionEvidencePanelInput['rendererAuthorityProjection'],
) {
  if (!rendererAuthorityProjection)
    return null

  const matchedSignals = rendererAuthorityProjection.matchedSignals ?? []
  const driftingSignals = rendererAuthorityProjection.driftingSignals ?? []

  if (matchedSignals.includes('remaining-open=lipsync+voice')
    && matchedSignals.includes('authority-body:yes')
    && matchedSignals.includes('authority-face:yes')
    && matchedSignals.includes('authority-motion:yes')
    && driftingSignals.includes('authority-lipsync:no')) {
    return '当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段'
  }

  if (matchedSignals.includes('remaining-open=body+lipsync')
    && matchedSignals.includes('authority-face:yes')
    && matchedSignals.includes('authority-motion:yes')
    && matchedSignals.includes('authority-voice:yes')
    && driftingSignals.includes('authority-body:no')
    && driftingSignals.includes('authority-lipsync:no')) {
    return '当前仅剩表情、动作、声音维持同一段连续性，身体和口型还没有重新并回这一段'
  }

  const resolveLane = (driver: 'face' | 'motion' | 'lipsync') => {
    if (matchedSignals.includes(`authority-${driver}:yes`))
      return driver === 'face' ? '表情命中' : driver === 'motion' ? '动作命中' : '口型命中'
    if (driftingSignals.includes(`authority-${driver}:no`))
      return driver === 'face' ? '表情未命中' : driver === 'motion' ? '动作未命中' : '口型未命中'
    return driver === 'face' ? '表情未知' : driver === 'motion' ? '动作未知' : '口型未知'
  }

  const hasVoiceSignal = matchedSignals.includes('authority-voice:yes') || driftingSignals.includes('authority-voice:no')
  const summary = [
    resolveLane('face'),
    resolveLane('motion'),
    resolveLane('lipsync'),
    ...(hasVoiceSignal
      ? [matchedSignals.includes('authority-voice:yes') ? '声音命中' : '声音未命中']
      : []),
  ].join(' / ')
  if (summary === '表情未知 / 动作未知 / 口型未知')
    return null

  return summary
}

function summarizeRuntimeContinuityLaneTruth(
  runtimeContinuityProjection: SelfEvolutionEvidencePanelInput['runtimeContinuityProjection'],
  rendererTarget: string | null | undefined,
) {
  if (!runtimeContinuityProjection)
    return null

  const matchedSignals = runtimeContinuityProjection.matchedSignals ?? []
  const driftingSignals = runtimeContinuityProjection.driftingSignals ?? []
  const reasons = runtimeContinuityProjection.reasons ?? []
  const hasVoiceDrift = driftingSignals.includes('authority-voice:no')
  const bodyContinuityPhase = runtimeContinuityProjection.bodyContinuityPhase ?? null
  const rendererSurface = resolveContinuityRendererSurface({
    runtimeContinuityProjection,
    rendererTarget,
  })

  const hasSameSegmentCueBridgeRealignment = reasons.some(reason =>
    reason.includes('cue-bridge same-segment realignment as unified authority')
    || reason.includes('same-segment cue-bridge realignment as unified authority')
    || reason.includes('same-segment cue-bridge rebind')
    || reason.includes('same-segment recollection')
    || reason.includes('same measured-return body line'),
  )

  const hasThinMeasuredReturnContinuity = reasons.some(reason =>
    reason.includes('only runtime digest plus spine still expose the noisy-detour continuity line')
    || reason.includes('thinner measured-return same-her line visible')
    || reason.includes('thinner measured-return same-her line')
    || reason.includes('thin measured-return same-her line')
    || reason.includes('较薄证据维持')
    || reason.includes('thinner continuity evidence'),
  )

  const hasBodyLedContinuity = bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
    || reasons.some(reason =>
      reason.includes('body-led same-her continuity')
      || reason.includes('body-led partial recovery')
      || reason.includes('身体线先托住')
      || reason.includes('body still carries the living segment')
      || reason.includes('Body continuity still carries the same living segment while'),
    )
  const hasBodyOnlyHoldContinuity = bodyContinuityPhase === 'body-only-hold'
    || reasons.some(reason =>
      reason.includes('身体独撑态')
      || reason.includes('独自托住同一段 living segment')
      || reason.includes('only lane carrying this same living segment')
      || reason.includes('one continuous her being held inward'),
    )
  const hasCrossModalLockContinuity = bodyContinuityPhase === 'full-cross-modal-lock'
    || reasons.some(reason =>
      reason.includes('跨模态重锁态')
      || reason.includes('共同锁在同一段 living segment')
      || reason.includes('共同锁回同一段 living segment'),
    )
  const hasRendererRejoinWithoutBodyContinuity = bodyContinuityPhase === 'renderer-rejoin-without-body'
    || reasons.some(reason =>
      reason.includes('显形回接失身态')
      || (reason.includes('显形权威已经回接') && reason.includes('身体线没有继续托住同一段 living segment'))
      || (reason.includes('renderer recovery') && reason.includes('without body carry')),
    )

  const hasRepairBeforeClosenessContinuity = reasons.some(reason =>
    reason.includes('repair-before-closeness')
    && reason.includes('quieter blink')
    && reason.includes('softened gaze'),
  )

  if (!hasVoiceDrift
    && hasSameSegmentCueBridgeRealignment
    && matchedSignals.includes('authority-lipsync:yes')
    && !matchedSignals.includes('authority-face:yes')
    && !matchedSignals.includes('authority-motion:yes')) {
    return rendererSurface
      ? `同段 cue-bridge 回收后，${rendererSurface} 显形已重新并回同一条连续身体线`
      : '同段 cue-bridge 回收后，表情、动作、口型已重新并回同一条连续身体线'
  }

  if (!hasVoiceDrift && hasBodyOnlyHoldContinuity && matchedSignals.includes('authority-body:yes')) {
    return rendererSurface
      ? `身体线仍在独自托住同一段 living segment，当前还不能把 ${rendererSurface} 显形权威的回接视为已经成立`
      : '身体线仍在独自托住同一段 living segment，当前还不能把显形权威的回接视为已经成立'
  }

  if (!hasVoiceDrift && hasCrossModalLockContinuity) {
    return rendererSurface
      ? `身体线与 ${rendererSurface} 显形权威已经共同锁回同一段 living segment`
      : '身体线与显形权威已经共同锁回同一段 living segment'
  }

  if (!hasVoiceDrift && hasRendererRejoinWithoutBodyContinuity) {
    return rendererSurface
      ? `${rendererSurface} 显形权威已经回接，但身体线没有继续托住同一段 living segment`
      : '显形权威已经回接，但身体线没有继续托住同一段 living segment'
  }

  if (!hasVoiceDrift
    && hasThinMeasuredReturnContinuity
    && matchedSignals.includes('authority-lipsync:yes')
    && !matchedSignals.includes('authority-face:yes')
    && !matchedSignals.includes('authority-motion:yes')) {
    return '噪声 detour 后，这条 measured-return 连续身体线仍由较薄证据维持'
  }

  if (!hasVoiceDrift
    && hasBodyLedContinuity
    && matchedSignals.includes('authority-body:yes')
    && !matchedSignals.includes('authority-face:yes')
    && !matchedSignals.includes('authority-motion:yes')) {
    return rendererSurface
      ? `身体线已经先把这段 living segment 托住，${rendererSurface} 显形仍在补回同一条连续身体线`
      : '身体线已经先把这段 living segment 托住，表情、动作、口型仍在补回同一条连续身体线'
  }

  if (!hasVoiceDrift
    && hasRepairBeforeClosenessContinuity
    && matchedSignals.includes('authority-lipsync:yes')
    && !matchedSignals.includes('authority-face:yes')
    && !matchedSignals.includes('authority-motion:yes')) {
    return 'repair-before-closeness 仍停在修补线里，先守住 quieter blink / softened gaze'
  }

  if (!hasVoiceDrift
    && matchedSignals.includes('remaining-open=lipsync+voice')
    && matchedSignals.includes('authority-body:yes')
    && matchedSignals.includes('authority-face:yes')
    && matchedSignals.includes('authority-motion:yes')
    && driftingSignals.includes('authority-lipsync:no')) {
    return '当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段'
  }

  if (!hasVoiceDrift
    && matchedSignals.includes('remaining-open=body+lipsync')
    && matchedSignals.includes('authority-face:yes')
    && matchedSignals.includes('authority-motion:yes')
    && matchedSignals.includes('authority-voice:yes')
    && driftingSignals.includes('authority-body:no')
    && driftingSignals.includes('authority-lipsync:no')) {
    return '当前仅剩表情、动作、声音维持同一段连续性，身体和口型还没有重新并回这一段'
  }

  if (!hasVoiceDrift && matchedSignals.includes('lane=face+lipsync-only')) {
    return '当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线'
  }

  if (!hasVoiceDrift && matchedSignals.includes('lane=motion+lipsync-only')) {
    return '当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线'
  }

  if (!hasVoiceDrift && matchedSignals.includes('lane=face+lipsync+voice-only')) {
    return '当前仅剩表情、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、motion 还没有重新接回这条表情口型声音线'
  }

  if (!hasVoiceDrift && matchedSignals.includes('lane=motion+lipsync+voice-only')) {
    return '当前仅剩动作、口型、声音维持同一段连续性，可见 same-her continuity 还没有断开，但 body、face 还没有重新接回这条动作口型声音线'
  }

  const laneOnlySignal = matchedSignals.find(signal =>
    signal === 'lane=face-only'
    || signal === 'lane=body-only'
    || signal === 'lane=motion-only'
    || signal === 'lane=lipsync-only'
    || signal === 'lane=voice-only'
    || signal === 'lane=face+lipsync-only'
    || signal === 'lane=body+lipsync-only'
    || signal === 'lane=face+motion-only'
    || signal === 'lane=motion+lipsync-only'
    || signal === 'lane=face+voice-only'
    || signal === 'lane=body+voice-only'
    || signal === 'lane=motion+voice-only'
    || signal === 'lane=lipsync+voice-only'
    || signal === 'lane=body+lipsync+voice-only'
    || signal === 'lane=face+motion+voice-only'
    || signal === 'lane=face+lipsync+voice-only'
    || signal === 'lane=motion+lipsync+voice-only',
  )
  if (laneOnlySignal && !hasVoiceDrift) {
    if (laneOnlySignal === 'lane=face-only')
      return '当前仅剩表情维持同一段连续性'
    if (laneOnlySignal === 'lane=body-only')
      return '当前仅剩身体维持同一段连续性'
    if (laneOnlySignal === 'lane=motion-only')
      return '当前仅剩动作维持同一段连续性'
    if (laneOnlySignal === 'lane=lipsync-only')
      return '当前仅剩口型维持同一段连续性'
    if (laneOnlySignal === 'lane=voice-only')
      return '当前仅剩声音维持同一段连续性'
    if (laneOnlySignal === 'lane=face+lipsync-only')
      return '当前仅剩表情、口型维持同一段连续性'
    if (laneOnlySignal === 'lane=body+lipsync-only')
      return '当前仅剩身体、口型维持同一段连续性'
    if (laneOnlySignal === 'lane=face+motion-only')
      return '当前仅剩表情、动作维持同一段连续性'
    if (laneOnlySignal === 'lane=motion+lipsync-only')
      return '当前仅剩动作、口型维持同一段连续性'
    if (laneOnlySignal === 'lane=face+voice-only')
      return '当前仅剩表情、声音维持同一段连续性'
    if (laneOnlySignal === 'lane=body+voice-only')
      return '当前仅剩身体、声音维持同一段连续性'
    if (laneOnlySignal === 'lane=motion+voice-only')
      return '当前仅剩动作、声音维持同一段连续性'
    if (laneOnlySignal === 'lane=lipsync+voice-only')
      return '当前仅剩口型、声音维持同一段连续性'
    if (laneOnlySignal === 'lane=body+lipsync+voice-only')
      return '当前仅剩身体、口型、声音维持同一段连续性'
    if (laneOnlySignal === 'lane=face+motion+voice-only')
      return '当前仅剩表情、动作、声音维持同一段连续性'
    if (laneOnlySignal === 'lane=face+lipsync+voice-only')
      return '当前仅剩表情、口型、声音维持同一段连续性'
    if (laneOnlySignal === 'lane=motion+lipsync+voice-only')
      return '当前仅剩动作、口型、声音维持同一段连续性'
  }

  const hasVoiceEvidence = matchedSignals.includes('authority-voice:yes')
    || driftingSignals.includes('authority-voice:no')

  const resolveLane = (driver: 'face' | 'motion' | 'lipsync' | 'voice') => {
    if (matchedSignals.includes(`authority-${driver}:yes`)) {
      return driver === 'face'
        ? '表情命中'
        : driver === 'motion'
          ? '动作命中'
          : driver === 'lipsync'
            ? '口型命中'
            : '声音命中'
    }
    if (driftingSignals.includes(`authority-${driver}:no`)) {
      return driver === 'face'
        ? '表情未命中'
        : driver === 'motion'
          ? '动作未命中'
          : driver === 'lipsync'
            ? '口型未命中'
            : '声音未命中'
    }
    return driver === 'face'
      ? '表情未知'
      : driver === 'motion'
        ? '动作未知'
        : driver === 'lipsync'
          ? '口型未知'
          : '声音未知'
  }

  const summary = hasVoiceEvidence
    ? [resolveLane('face'), resolveLane('motion'), resolveLane('lipsync'), resolveLane('voice')].join(' / ')
    : [resolveLane('face'), resolveLane('motion'), resolveLane('lipsync')].join(' / ')
  if (summary === '表情未知 / 动作未知 / 口型未知 / 声音未知' || summary === '表情未知 / 动作未知 / 口型未知')
    return null

  return summary
}

function formatRendererProsodyAuthority(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return null

  let mode: string | null = null
  let source: string | null = null
  for (const part of normalized.split('|').map(part => part.trim()).filter(Boolean)) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0)
      continue
    const key = part.slice(0, separatorIndex).trim()
    const rawValue = part.slice(separatorIndex + 1).trim()
    if (key === 'mode')
      mode = rawValue
    else if (key === 'source')
      source = rawValue === 'prosody-authority' ? '韵律权威' : rawValue
  }

  if (!mode && !source)
    return null

  return {
    value: `韵律权威 ${mode ?? 'n/a'} | ${source ?? 'n/a'}`,
    technicalValue: normalized,
  }
}

function summarizeRepairProsodyAuthority(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return null

  let mode: string | null = null
  let segment: string | null = null
  for (const part of normalized.split('|').map(part => part.trim()).filter(Boolean)) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex < 0)
      continue
    const key = part.slice(0, separatorIndex).trim()
    const rawValue = part.slice(separatorIndex + 1).trim()
    if (key === 'mode')
      mode = rawValue
    else if (key === 'segment')
      segment = rawValue
  }

  if (!mode && !segment)
    return null

  return {
    technical: `prosody authority mode=${mode ?? 'n/a'} | segment=${segment ?? 'n/a'}`,
    display: `韵律权威 mode=${mode ?? 'n/a'} | segment=${segment ?? 'n/a'}`,
  }
}

function summarizeBaselineAnchorAudit(lines: string[] | null | undefined) {
  if (!Array.isArray(lines) || lines.length === 0)
    return null

  const anchorLine = lines.find(line => line.startsWith('anchor:'))
  const traceLine = lines.find(line => line.startsWith('trace:'))
  const prosodyAuthorityLine = lines.find(line => line.startsWith('prosody-authority:'))
  const bodyContinuityLine = lines.find(line => line.startsWith('body-continuity:'))

  if (!anchorLine || !traceLine)
    return null

  const candidateId = anchorLine.replace(/^anchor:\s*/, '').replace(/\s+is still the adopted default continuity anchor$/, '').trim()
  const snapshotMatch = traceLine.match(/snapshot=([^|]+)/)
  const ownerMatch = traceLine.match(/owner=([^|]+)/)
  const snapshotValue = snapshotMatch?.[1]?.trim() ?? 'n/a'
  const ownerValue = ownerMatch?.[1]?.trim() ?? 'n/a'
  const bodyContinuityValue = bodyContinuityLine
    ?.replace(/^body-continuity:\s*/, '')
    .replace(/^最新采纳说明：/, '')
    .trim()

  return {
    value: `${candidateId || 'n/a'} | snapshot=${snapshotValue} | owner=${ownerValue}${bodyContinuityValue ? ` | ${bodyContinuityValue}` : ''}${prosodyAuthorityLine ? ' | 韵律权威已回绑' : ''}`,
    technicalValue: `${candidateId || 'n/a'} | ${traceLine.replace(/^trace:\s*/, '').trim()}${bodyContinuityLine ? ` | ${bodyContinuityLine.trim()}` : ''}${prosodyAuthorityLine ? ` | ${prosodyAuthorityLine.trim()}` : ''}`,
  }
}

function formatManifestationBridgeDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bpersona\b/g, '人格')
    .replace(/\bthought\b/g, '思绪')
    .replace(/\bresident\b/g, '驻留')
    .replace(/\bsilent-observe\b/g, '静默观察')
    .replace(/\blight-nudge\b/g, '轻提醒')
    .replace(/\battentive\b/g, '专注')
    .replace(/\baccompany\b/g, '陪伴')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
}

function resolveDominantDrift(input: SelfEvolutionEvidencePanelInput): string | null {
  if (hasProjectStateContinuityDrift(input))
    return 'project-state-continuity-drift'

  const runtimeRendererDrift = input.runtimeContinuityProjection?.driftingSignals
    ?.find(signal => signal.startsWith('renderer-drift:'))
  if (runtimeRendererDrift)
    return runtimeRendererDrift

  const rendererDrift = input.rendererAuthorityProjection?.driftingSignals
    ?.find(signal => signal.startsWith('renderer-drift:'))
  if (rendererDrift)
    return rendererDrift

  const explicitAuthorityDrift = input.rendererAuthorityProjection?.authorityMismatchDisplay
    ?? input.rendererAuthorityProjection?.authorityMismatchSummary
  if (hasValue(explicitAuthorityDrift))
    return `authority-mismatch:${explicitAuthorityDrift}`

  const proactiveDrift = input.proactiveActionChain?.driftingSignals?.[0]
  if (hasValue(proactiveDrift))
    return proactiveDrift

  const personaDrift = input.personaBiasProvenance?.driftingSignals?.[0]
  if (hasValue(personaDrift))
    return personaDrift

  if (input.companionshipTransitionSummary?.status && input.companionshipTransitionSummary.status !== 'grounded') {
    const companionshipMode = input.companionshipTransitionSummary.companionshipHoldMode?.trim() || 'unknown'
    return `transition-companionship:${companionshipMode}`
  }

  return null
}

function resolveDriftKind(dominantDrift: string | null) {
  if (!dominantDrift)
    return 'none'
  if (dominantDrift.startsWith('renderer-drift:') || dominantDrift.startsWith('authority-mismatch:'))
    return 'renderer'
  if (dominantDrift.startsWith('runtime-') || dominantDrift.startsWith('transition-'))
    return 'continuity'
  if (dominantDrift.startsWith('runtime-selected-action:') || dominantDrift.startsWith('runtime-shouldSpeak:'))
    return 'proactive'
  if (dominantDrift.startsWith('persona:') || dominantDrift.startsWith('identityKernel.'))
    return 'persona'
  return 'mixed'
}

function normalizeStatus(values: Array<string | null | undefined>) {
  if (values.includes('missing'))
    return 'missing'
  if (values.includes('drift'))
    return 'drift'
  if (values.includes('partial'))
    return 'partial'
  if (values.includes('grounded'))
    return 'grounded'
  return null
}

function resolveDriftStart(input: SelfEvolutionEvidencePanelInput) {
  const personaDrift = firstSignal([
    input.proactiveManifestationChain?.driftingSignals?.[0],
    input.proactiveActionChain?.driftingSignals?.[0],
    input.personaBiasProvenance?.driftingSignals?.[0],
  ])
  if (personaDrift) {
    return {
      layer: 'persona',
      signal: personaDrift,
    } as const
  }

  const thoughtDrift = firstSignal([
    input.privateThoughtGovernanceChain?.driftingSignals?.[0],
  ])
  if (thoughtDrift) {
    return {
      layer: 'thought',
      signal: thoughtDrift,
    } as const
  }

  const residentDrift = firstSignal([
    input.residentPerformanceProjection?.driftingSignals?.[0],
  ])
  if (residentDrift) {
    return {
      layer: 'resident',
      signal: residentDrift,
    } as const
  }

  const rendererDrift = firstSignal([
    input.rendererAuthorityProjection?.driftingSignals?.find(signal =>
      signal.startsWith('renderer-drift:') || signal.startsWith('authority-mismatch:'),
    ),
    input.runtimeContinuityProjection?.driftingSignals?.find(signal =>
      signal.startsWith('renderer-drift:') || signal.startsWith('authority-mismatch:'),
    ),
  ])
  if (rendererDrift) {
    return {
      layer: 'renderer',
      signal: rendererDrift,
    } as const
  }

  return null
}

function resolveFirstCheck(driftStart: ReturnType<typeof resolveDriftStart>) {
  if (!driftStart)
    return null

  switch (driftStart.layer) {
    case 'persona':
      return 'self-evolution kernel -> active learning strategy -> manifestation/action-ecology/persona-bias'
    case 'thought':
      return 'private thought governance -> opening guidance -> visible reply blocking'
    case 'resident':
      return 'resident performance projection -> body authority -> continuity tags'
    case 'renderer':
      return 'renderer authority binding -> playback cues -> driver execution'
    default:
      return null
  }
}

function resolveRendererFirstCheck(
  driftStart: ReturnType<typeof resolveDriftStart>,
  rendererAuthorityProjection: SelfEvolutionEvidencePanelInput['rendererAuthorityProjection'],
) {
  const baseCheck = resolveFirstCheck(driftStart)
  if (driftStart?.layer !== 'renderer')
    return baseCheck

  const prosodyAuthority = summarizeRepairProsodyAuthority(rendererAuthorityProjection?.prosodyAuthoritySummary)
  if (!baseCheck || !prosodyAuthority)
    return baseCheck

  return `renderer authority binding -> ${prosodyAuthority.technical} -> playback cues -> driver execution`
}

function resolveRepairOwner(driftStart: ReturnType<typeof resolveDriftStart>) {
  if (!driftStart)
    return null

  switch (driftStart.layer) {
    case 'persona':
      return 'evolution'
    case 'thought':
      return 'private thought governance'
    case 'resident':
      return 'resident projection'
    case 'renderer':
      return 'renderer authority'
    default:
      return null
  }
}

function resolveRepairPath(
  input: SelfEvolutionEvidencePanelInput,
  driftStart: ReturnType<typeof resolveDriftStart>,
) {
  if (!driftStart)
    return null

  switch (driftStart.layer) {
    case 'persona': {
      const thoughtTrace = firstSignal([
        input.privateThoughtGovernanceChain?.visibleReplyRealizationReason,
        input.privateThoughtGovernanceChain?.visibleReplyBlockedReason,
      ])
      const continuityAnchor = firstSignal([
        input.runtimeContinuityProjection?.governorIntentionId,
        input.runtimeContinuityProjection?.traceEmbodimentDisplaySummary,
        input.runtimeContinuityProjection?.traceEmbodimentSummary,
      ])
      if (!thoughtTrace || !continuityAnchor)
        return null
      return `persona drift ${driftStart.signal} -> thought trace ${thoughtTrace} -> continuity anchor ${continuityAnchor}`
    }
    case 'thought': {
      const residentTrace = firstSignal([
        input.residentPerformanceProjection?.residentReasonTags?.[0],
        input.residentPerformanceProjection?.residentStance,
      ])
      const continuityAnchor = firstSignal([
        input.runtimeContinuityProjection?.governorIntentionId,
        input.runtimeContinuityProjection?.traceEmbodimentDisplaySummary,
        input.runtimeContinuityProjection?.traceEmbodimentSummary,
      ])
      if (!residentTrace || !continuityAnchor)
        return null
      return `thought drift ${driftStart.signal} -> resident trace ${residentTrace} -> continuity anchor ${continuityAnchor}`
    }
    case 'resident': {
      const authorityTrace = firstSignal([
        input.rendererAuthorityProjection?.authorityMismatchDisplay,
        input.rendererAuthorityProjection?.authorityMismatchSummary,
      ])
      const continuityAnchor = firstSignal([
        input.runtimeContinuityProjection?.traceEmbodimentDisplaySummary,
        input.runtimeContinuityProjection?.traceEmbodimentSummary,
        input.runtimeContinuityProjection?.governorIntentionId,
      ])
      if (!authorityTrace || !continuityAnchor)
        return null
      return `resident drift ${driftStart.signal} -> authority trace ${authorityTrace} -> continuity anchor ${continuityAnchor}`
    }
    case 'renderer': {
      const prosodyAuthority = summarizeRepairProsodyAuthority(input.rendererAuthorityProjection?.prosodyAuthoritySummary)
      const authorityTrace = firstSignal([
        prosodyAuthority?.technical,
        input.rendererAuthorityProjection?.authorityMismatchDisplay,
        input.rendererAuthorityProjection?.authorityMismatchSummary,
      ])
      const continuityAnchor = firstSignal([
        input.runtimeContinuityProjection?.traceEmbodimentDisplaySummary,
        input.runtimeContinuityProjection?.traceEmbodimentSummary,
        input.runtimeContinuityProjection?.governorIntentionId,
      ])
      if (!authorityTrace || !continuityAnchor)
        return null
      const authorityMismatchTrace = firstSignal([
        input.rendererAuthorityProjection?.authorityMismatchDisplay,
        input.rendererAuthorityProjection?.authorityMismatchSummary,
      ])
      if (prosodyAuthority && authorityMismatchTrace)
        return `renderer drift ${driftStart.signal} -> authority trace ${prosodyAuthority.technical} -> ${authorityMismatchTrace} -> continuity anchor ${continuityAnchor}`
      return `renderer drift ${driftStart.signal} -> authority trace ${authorityTrace} -> continuity anchor ${continuityAnchor}`
    }
    default:
      return null
  }
}

export function buildSelfEvolutionDiagnosticSummaryEntries(
  input: SelfEvolutionEvidencePanelInput,
): PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry[] {
  const entries: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry[] = []
  const dominantDrift = resolveDominantDrift(input)
  const driftStart = resolveDriftStart(input)
  const repairOwner = resolveRepairOwner(driftStart)
  const firstCheck = resolveRendererFirstCheck(driftStart, input.rendererAuthorityProjection)
  const repairPath = resolveRepairPath(input, driftStart)
  const status = normalizeStatus([
    input.personaBiasProvenance?.status,
    input.proactiveActionChain?.status,
    input.residentPerformanceProjection?.status,
    input.companionshipTransitionSummary?.status,
    input.rendererAuthorityProjection?.status,
    input.runtimeContinuityProjection?.status,
  ])

  const statusValue = formatList([
    status,
    `drift=${resolveDriftKind(dominantDrift)}`,
  ])
  if (statusValue) {
    const statusSummary = formatStatusDisplayValue(statusValue)
    const statusEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'status',
      label: '闭环状态',
      value: statusSummary.value,
    }
    if (statusSummary.technicalValue)
      statusEntry.technicalValue = statusSummary.technicalValue
    entries.push(statusEntry)
  }

  const personaValue = formatList([
    input.personaBiasProvenance?.relationshipPosture,
    input.personaBiasProvenance?.initiativeStyle,
    input.personaBiasProvenance?.preferredProactiveStyle,
  ])
  if (personaValue) {
    const personaSummary = formatPersonaDisplayValue(personaValue)
    const personaEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'persona',
      label: '人格基线',
      value: personaSummary.value,
    }
    if (personaSummary.technicalValue)
      personaEntry.technicalValue = personaSummary.technicalValue
    entries.push(personaEntry)
  }

  const relationshipCadenceInternalization = resolveRelationshipCadenceInternalization(input)
  const manifestationCadenceValue = formatList([
    input.personaBiasProvenance?.manifestationCadenceSummary,
    relationshipCadenceInternalization,
  ])
  if (manifestationCadenceValue) {
    entries.push({
      key: 'manifestation-cadence',
      label: '显形节奏',
      value: manifestationCadenceValue,
    })
  }

  const manifestationBridgeValue = (() => {
    const personaNode = formatManifestationNode(
      input.proactiveManifestationChain?.personaPreferredStyle ?? input.personaBiasProvenance?.preferredProactiveStyle,
      input.proactiveManifestationChain?.personaPreferredPresence,
      'n/a/n/a',
    )
    const thoughtNode = formatManifestationNode(
      input.privateThoughtGovernanceChain?.privateThoughtStyle,
      input.privateThoughtGovernanceChain?.privateThoughtPresence,
      'n/a/n/a',
    )
    const residentNode = formatManifestationNode(
      input.residentPerformanceProjection?.residentEmbodiedPresence,
      input.residentPerformanceProjection?.residentStance,
      'n/a/n/a',
    )
    if (
      personaNode === 'n/a/n/a'
      && thoughtNode === 'n/a/n/a'
      && residentNode === 'n/a/n/a'
    ) {
      return null
    }
    return `persona ${personaNode} -> thought ${thoughtNode} -> resident ${residentNode}`
  })()
  if (manifestationBridgeValue) {
    const manifestationBridgeSummary = formatManifestationBridgeDisplayValue(manifestationBridgeValue)
    const manifestationBridgeEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'manifestation-bridge',
      label: '显形链路',
      value: manifestationBridgeSummary.value,
    }
    if (manifestationBridgeSummary.technicalValue)
      manifestationBridgeEntry.technicalValue = manifestationBridgeSummary.technicalValue
    entries.push(manifestationBridgeEntry)
  }

  if (driftStart) {
    const driftSummary = toDisplayValue(driftStart.signal)
    const driftStartEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'drift-start',
      label: '起漂层',
      value: `${driftStart.layer} | ${driftSummary.value}`,
    }
    if (driftSummary.technicalValue)
      driftStartEntry.technicalValue = `${driftStart.layer} | ${driftSummary.technicalValue}`
    entries.push(driftStartEntry)
  }

  if (driftStart && repairOwner) {
    const repairOwnerSummary = formatRepairOwnerDisplayValue(repairOwner)
    const repairOwnerEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'repair-owner',
      label: '修复归属',
      value: `${driftStart.layer} | ${repairOwnerSummary.value}`,
    }
    if (repairOwnerSummary.technicalValue)
      repairOwnerEntry.technicalValue = `${driftStart.layer} | ${repairOwnerSummary.technicalValue}`
    entries.push(repairOwnerEntry)
  }

  if (driftStart && firstCheck) {
    const firstCheckSummary = formatFirstCheckDisplayValue(firstCheck)
    const firstCheckEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'first-check',
      label: '首查点',
      value: `${driftStart.layer} | ${firstCheckSummary.value}`,
    }
    if (firstCheckSummary.technicalValue)
      firstCheckEntry.technicalValue = `${driftStart.layer} | ${firstCheckSummary.technicalValue}`
    entries.push(firstCheckEntry)
  }

  if (repairPath) {
    const repairPathSummary = formatRepairPathDisplayValue(repairPath)
    const repairPathEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'repair-path',
      label: '修复路径',
      value: repairPathSummary.value,
    }
    if (repairPathSummary.technicalValue)
      repairPathEntry.technicalValue = repairPathSummary.technicalValue
    entries.push(repairPathEntry)
  }

  const proactiveValue = formatList([
    input.proactiveActionChain?.runtimeSelectedAction,
    typeof input.proactiveActionChain?.runtimeShouldSpeak === 'boolean'
      ? `shouldSpeak=${String(input.proactiveActionChain.runtimeShouldSpeak)}`
      : null,
    input.proactiveActionChain?.openingGuidanceHoldReason,
    input.proactiveDecisionConsumptionSummary?.decisionMode,
  ])
  if (proactiveValue) {
    const proactiveSummary = formatProactiveDisplayValue(proactiveValue)
    const proactiveEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'proactive',
      label: '主动落点',
      value: proactiveSummary.value,
    }
    if (proactiveSummary.technicalValue)
      proactiveEntry.technicalValue = proactiveSummary.technicalValue
    entries.push(proactiveEntry)
  }

  const residentValue = formatList([
    formatList([
      input.residentPerformanceProjection?.residentEmbodiedPresence,
      input.residentPerformanceProjection?.residentStance,
    ])?.replaceAll(' | ', '/'),
    formatList([
      input.residentPerformanceProjection?.residentBaseEmotion,
      input.residentPerformanceProjection?.residentDelivery,
    ])?.replaceAll(' | ', '/'),
  ])
  if (residentValue) {
    const residentSummary = formatResidentDisplayValue(residentValue)
    const residentEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'resident',
      label: '驻留投影',
      value: residentSummary.value,
    }
    if (residentSummary.technicalValue)
      residentEntry.technicalValue = residentSummary.technicalValue
    entries.push(residentEntry)
  }

  if (input.rendererAuthorityProjection?.rendererTarget || input.rendererAuthorityProjection?.authorityMatchSummary) {
    const rendererLaneTruth = summarizeRendererAuthorityLaneTruth(input.rendererAuthorityProjection)
    const authorityMatchDisplayEntry = input.rendererAuthorityProjection?.authorityMatchSummary
      ? toAuthorityDisplayEntry('authority-match', input.rendererAuthorityProjection.authorityMatchSummary)
      : null
    const rendererDisplayValue = rendererLaneTruth
      ? authorityMatchDisplayEntry && !authorityMatchDisplayEntry.technicalValue && authorityMatchDisplayEntry.value !== rendererLaneTruth
        ? formatList([
            input.rendererAuthorityProjection?.rendererTarget,
            authorityMatchDisplayEntry.value,
            rendererLaneTruth,
          ])
        : formatList([
            input.rendererAuthorityProjection?.rendererTarget,
            rendererLaneTruth,
          ])
      : formatList([
          input.rendererAuthorityProjection?.rendererTarget,
          input.rendererAuthorityProjection?.authorityMatchSummary,
        ])
    if (rendererDisplayValue) {
      const rendererSummary = formatRendererDisplayValue(
        rendererDisplayValue,
      )
      const rendererProsodyAuthority = formatRendererProsodyAuthority(
        (input.rendererAuthorityProjection as { prosodyAuthoritySummary?: string | null } | null | undefined)?.prosodyAuthoritySummary,
      )
      const rendererTechnicalValue = rendererLaneTruth
        ? formatList([
            input.rendererAuthorityProjection?.rendererTarget,
            input.rendererAuthorityProjection?.authorityMatchSummary,
            rendererLaneTruth,
          ])
        : rendererSummary.technicalValue
      const rendererEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
        key: 'renderer',
        label: '显形权威',
        value: rendererProsodyAuthority
          ? `${rendererSummary.value} | ${rendererProsodyAuthority.value}`
          : rendererSummary.value,
      }
      if (rendererProsodyAuthority) {
        rendererEntry.technicalValue = rendererTechnicalValue
          ? `${rendererTechnicalValue} | ${rendererProsodyAuthority.technicalValue}`
          : `${rendererDisplayValue} | ${rendererProsodyAuthority.technicalValue}`
      }
      else if (rendererTechnicalValue) {
        rendererEntry.technicalValue = rendererTechnicalValue
      }
      entries.push(rendererEntry)
    }
  }

  const continuityValue = formatList([
    input.runtimeContinuityProjection?.activeThreadId,
    input.runtimeContinuityProjection?.runtimeChannel,
    input.runtimeContinuityProjection?.runtimeScenario,
    input.identityDriftGovernanceSummary?.governanceMode,
    hasProjectStateContinuityDrift(input) ? 'project-state-continuity-drift' : null,
    input.companionshipTransitionSummary?.companionshipHoldMode
      ? `companionship-${input.companionshipTransitionSummary.companionshipHoldMode}`
      : null,
    hasRememberedFamiliarityMemoryFirst(input) ? 'remembered-familiarity-memory-first' : null,
  ])
  if (continuityValue) {
    const continuityLaneTruth = summarizeRuntimeContinuityLaneTruth(
      input.runtimeContinuityProjection,
      input.rendererAuthorityProjection?.rendererTarget,
    )
    const sameHerRepairEvidence = resolveProjectStateSameHerRepairEvidence(input)
    const projectStateOpenClosureSummary = resolveProjectStateOpenClosureSummary(input)
    const continuityWithRepairEvidence = formatList([
      continuityValue,
      ...sameHerRepairEvidence,
      ...projectStateOpenClosureSummary,
      continuityLaneTruth,
    ]) ?? continuityValue
    const continuitySummary = formatContinuityDisplayValue(
      continuityWithRepairEvidence,
    )
    const continuityEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'continuity',
      label: '连续线程',
      value: continuitySummary.value,
    }
    if (continuitySummary.technicalValue)
      continuityEntry.technicalValue = continuitySummary.technicalValue
    entries.push(continuityEntry)
  }

  const executionSafetyGateTags = Array.from(new Set([
    ...(input.residentPerformanceProjection?.residentReasonTags ?? []),
    ...(input.runtimeContinuityProjection?.rationaleTags ?? []),
  ].map(tag => tag.trim()).filter(Boolean)))
  const executionSafetyGate = resolveExecutionSafetyGateDiagnostic(executionSafetyGateTags)
  if (executionSafetyGate) {
    entries.push({
      key: 'execution-safety-gate',
      label: '执行安全门',
      ...executionSafetyGate,
    })
  }

  const adoptedAnchorSummary = summarizeBaselineAnchorAudit(
    (input as {
      baselineAnchorAuditSummary?: { lines?: string[] | null } | null
    }).baselineAnchorAuditSummary?.lines,
  )
  if (adoptedAnchorSummary) {
    entries.push({
      key: 'adopted-anchor',
      label: '已采纳锚点',
      value: adoptedAnchorSummary.value,
      technicalValue: adoptedAnchorSummary.technicalValue,
    })
  }

  if (dominantDrift) {
    const dominantDriftSummary = toDisplayValue(dominantDrift)
    const dominantDriftEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'dominant-drift',
      label: '主漂移',
      value: dominantDriftSummary.value,
    }
    if (dominantDriftSummary.technicalValue)
      dominantDriftEntry.technicalValue = dominantDriftSummary.technicalValue
    entries.push(dominantDriftEntry)
  }

  return entries
}

export function buildSelfEvolutionDiagnosticSummaryLines(
  entries: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry[],
) {
  return entries.map((entry) => {
    const value = entry.value
    switch (entry.key) {
      case 'status':
        return `status: ${value}`
      case 'persona':
        return `persona: ${value}`
      case 'manifestation-cadence':
        return `manifestation-cadence: ${value}`
      case 'manifestation-bridge':
        return `manifestation-bridge: ${value}`
      case 'drift-start':
        return `drift-start: ${value}`
      case 'repair-owner':
        return `repair-owner: ${value}`
      case 'first-check':
        return `first-check: ${value}`
      case 'repair-path':
        return `repair-path: ${value}`
      case 'proactive':
        return `proactive: ${value}`
      case 'resident':
        return `resident: ${value}`
      case 'renderer':
        return `renderer: ${value}`
      case 'continuity':
        return `continuity: ${value}`
      case 'execution-safety-gate':
        return `execution-safety-gate: ${value}`
      case 'adopted-anchor':
        return `adopted-anchor: ${value}`
      case 'dominant-drift':
        return `dominant-drift: ${value}`
      default:
        return `${entry.key}: ${value}`
    }
  })
}
