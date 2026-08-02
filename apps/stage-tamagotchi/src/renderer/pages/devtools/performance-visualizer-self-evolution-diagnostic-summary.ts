import type { SelfEvolutionEvidencePanelInput } from './performance-visualizer-self-evolution-evidence'

import {
  resolveExecutionSafetyGateDiagnostic,
  toAuthorityDisplayEntry,
} from './performance-visualizer-runtime-diagnostic-summary'

export interface PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry {
  key:
    | 'status'
    | 'persona'
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
  layer?: string | null
  detail?: string
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}

type AuthorityLane = 'body' | 'face' | 'motion' | 'lipsync' | 'voice'

const authorityLaneLabels: Record<AuthorityLane, string> = {
  body: '身体',
  face: '表情',
  motion: '动作',
  lipsync: '口型',
  voice: '声音',
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

function firstSignal(values: Array<string | null | undefined>) {
  return values.find(hasValue)?.trim() ?? null
}

function withTechnicalValue(value: string, technicalValue: string) {
  return value === technicalValue
    ? { value }
    : { value, technicalValue }
}

function formatManifestationNode(
  style: string | null | undefined,
  presence: string | null | undefined,
  fallback: string,
) {
  const normalizedStyle = typeof style === 'string' ? style.trim() : ''
  const normalizedPresence = typeof presence === 'string' ? presence.trim() : ''
  if (!normalizedStyle && !normalizedPresence)
    return fallback
  return `${normalizedStyle || 'n/a'}/${normalizedPresence || 'n/a'}`
}

function toDisplayValue(value: string) {
  const normalized = value.trim()
  if (normalized.startsWith('renderer-drift:')) {
    return {
      value: `显形漂移：${normalized.slice('renderer-drift:'.length).trim()}`,
      technicalValue: normalized,
    }
  }
  if (normalized.startsWith('authority-mismatch:')) {
    return {
      value: `权威漂移：${normalized.slice('authority-mismatch:'.length).trim()}`,
      technicalValue: normalized,
    }
  }
  return { value: normalized }
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
  return withTechnicalValue(displayValue, normalized)
}

function formatPersonaDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bobserver\b/, '观察者')
    .replace(/\bobservant\b/, '善于观察')
    .replace(/\bsilent-observe\b/, '静默观察')
  return withTechnicalValue(displayValue, normalized)
}

function formatProactiveDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bhold\b/, '保持')
    .replace(/\bbirth-anchored-restraint\b/, '初始锚定克制')
    .replace(/\brestraint-overridden\b/, '克制被覆盖')
  return withTechnicalValue(displayValue, normalized)
}

function formatResidentDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\battentive\/accompany\b/, '专注陪伴')
    .replace(/\bthinking\/gentle\b/, '思考/温和')
  return withTechnicalValue(displayValue, normalized)
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
  return withTechnicalValue(displayValue, normalized)
}

function formatRendererDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bvrm\b/g, 'VRM')
    .replace(/\blive2d\b/g, 'Live2D')
    .replace(/\bbodyPhase=/g, '身体阶段=')
    .replace(/\brejoinSurface=/g, '回接表面=')
  return withTechnicalValue(displayValue, normalized)
}

function formatContinuityDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bactive-dialogue\b/, '主动对话')
    .replace(/\bcoding\b/, '编码中')
    .replace(/\bbounded-growth\b/, '有界成长')
    .replace(/\bboundary-violation\b/, '边界越线')
    .replace(/\bremembered-familiarity-memory-first\b/, '熟悉感记忆先行')
    .replace(/\bbodyPhase=/, '身体阶段=')
    .replace(/\brejoinSurface=/, '回接表面=')
  return withTechnicalValue(displayValue, normalized)
}

function formatRepairOwnerDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/\bevolution\b/, '自我演化')
    .replace(/\bresident projection\b/, '驻留投影')
    .replace(/\brenderer authority\b/, '显形权威')
  return withTechnicalValue(displayValue, normalized)
}

function formatFirstCheckDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace('self-evolution kernel', '自我演化内核')
    .replace('active learning strategy', '主动学习策略')
    .replace('manifestation/action-ecology/persona-bias', '显形/行动生态/人格偏置')
    .replace('resident performance projection', '驻留表现投影')
    .replace('body authority', '身体权威')
    .replace('continuity tags', '连续性标签')
    .replace('renderer authority binding', '显形权威绑定')
    .replace('prosody authority', '韵律权威绑定')
    .replace('playback cues', '回放片段')
    .replace('driver execution', '驱动执行')
  return withTechnicalValue(displayValue, normalized)
}

function formatRepairPathDisplayValue(value: string) {
  const normalized = value.trim()
  const displayValue = normalized
    .replace(/^persona drift /, '人格漂移 ')
    .replace(/^resident drift /, '驻留漂移 ')
    .replace(/^renderer drift /, '显形漂移 ')
    .replace(' -> action trace ', ' -> 行动轨迹 ')
    .replace(' -> resident trace ', ' -> 驻留轨迹 ')
    .replace(' -> authority trace ', ' -> 权威轨迹 ')
    .replace(' -> continuity anchor ', ' -> 连续性锚点 ')
  return withTechnicalValue(displayValue, normalized)
}

function summarizeAuthorityLaneTruth(
  matchedSignals: string[] | null | undefined,
  driftingSignals: string[] | null | undefined,
) {
  const matched = matchedSignals ?? []
  const drifting = driftingSignals ?? []

  return (Object.keys(authorityLaneLabels) as AuthorityLane[])
    .map((lane) => {
      const state = matched.includes(`authority-${lane}:yes`)
        ? '命中'
        : drifting.includes(`authority-${lane}:no`)
          ? '未命中'
          : '未知'
      return `${authorityLaneLabels[lane]}${state}`
    })
    .join(' / ')
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
  }
}

function hasRememberedFamiliarityMemoryFirst(input: SelfEvolutionEvidencePanelInput) {
  const lines = [
    ...(input.proactiveDecisionConsumptionSummary?.lines ?? []),
    ...(input.candidateTrajectorySummary?.lines ?? []),
  ]
  return lines.some(line =>
    line.includes('memory-familiarity-restraint:')
    || line.includes('remembered-familiarity-trajectory:')
    || line.includes('remembered-familiarity-governance:'),
  )
}

function resolveDominantDrift(input: SelfEvolutionEvidencePanelInput): string | null {
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

  return null
}

function resolveDriftKind(dominantDrift: string | null) {
  if (!dominantDrift)
    return 'none'
  if (dominantDrift.startsWith('renderer-drift:') || dominantDrift.startsWith('authority-mismatch:'))
    return 'renderer'
  if (dominantDrift.startsWith('runtime-selected-action:') || dominantDrift.startsWith('runtime-shouldSpeak:'))
    return 'proactive'
  if (dominantDrift.startsWith('runtime-') || dominantDrift.startsWith('transition-'))
    return 'continuity'
  if (dominantDrift.startsWith('persona:'))
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

function normalizeBodyContinuityPhase(value: string | null | undefined) {
  if (
    value === 'body-only-hold'
    || value === 'body-carried-to-renderer-rejoin'
    || value === 'full-cross-modal-lock'
    || value === 'renderer-rejoin-without-body'
  ) {
    return value
  }
  return null
}

function normalizeRendererRejoinSurfaceKey(value: string | null | undefined) {
  if (
    value === 'authority:renderer-rejoin:speech'
    || value === 'authority:renderer-rejoin:live2d'
    || value === 'authority:renderer-rejoin:vrm'
  ) {
    return value
  }
  return null
}

function resolveDriftStart(input: SelfEvolutionEvidencePanelInput) {
  const personaDrift = firstSignal([
    input.proactiveManifestationChain?.driftingSignals?.[0],
    input.proactiveActionChain?.driftingSignals?.[0],
    input.personaBiasProvenance?.driftingSignals?.[0],
  ])
  if (personaDrift)
    return { layer: 'persona', signal: personaDrift } as const

  const residentDrift = firstSignal([
    input.residentPerformanceProjection?.driftingSignals?.[0],
  ])
  if (residentDrift)
    return { layer: 'resident', signal: residentDrift } as const

  const rendererDrift = firstSignal([
    input.rendererAuthorityProjection?.driftingSignals?.find(signal =>
      signal.startsWith('renderer-drift:') || signal.startsWith('authority-mismatch:'),
    ),
    input.runtimeContinuityProjection?.driftingSignals?.find(signal =>
      signal.startsWith('renderer-drift:') || signal.startsWith('authority-mismatch:'),
    ),
  ])
  if (rendererDrift)
    return { layer: 'renderer', signal: rendererDrift } as const

  return null
}

function resolveFirstCheck(driftStart: ReturnType<typeof resolveDriftStart>) {
  if (!driftStart)
    return null

  switch (driftStart.layer) {
    case 'persona':
      return 'self-evolution kernel -> active learning strategy -> manifestation/action-ecology/persona-bias'
    case 'resident':
      return 'resident performance projection -> body authority -> continuity tags'
    case 'renderer':
      return 'renderer authority binding -> playback cues -> driver execution'
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
    case 'resident':
      return 'resident projection'
    case 'renderer':
      return 'renderer authority'
  }
}

function resolveRepairPath(
  input: SelfEvolutionEvidencePanelInput,
  driftStart: ReturnType<typeof resolveDriftStart>,
) {
  if (!driftStart)
    return null

  const continuityAnchor = firstSignal([
    input.runtimeContinuityProjection?.governorIntentionId,
    input.runtimeContinuityProjection?.traceEmbodimentDisplaySummary,
    input.runtimeContinuityProjection?.traceEmbodimentSummary,
  ])
  if (!continuityAnchor)
    return null

  switch (driftStart.layer) {
    case 'persona': {
      const actionTrace = firstSignal([
        input.proactiveActionChain?.runtimeSelectedAction,
        input.proactiveActionChain?.matchedSignals?.[0],
      ])
      return actionTrace
        ? `persona drift ${driftStart.signal} -> action trace ${actionTrace} -> continuity anchor ${continuityAnchor}`
        : null
    }
    case 'resident': {
      const authorityTrace = firstSignal([
        input.rendererAuthorityProjection?.authorityMismatchDisplay,
        input.rendererAuthorityProjection?.authorityMismatchSummary,
      ])
      return authorityTrace
        ? `resident drift ${driftStart.signal} -> authority trace ${authorityTrace} -> continuity anchor ${continuityAnchor}`
        : null
    }
    case 'renderer': {
      const prosodyAuthority = summarizeRepairProsodyAuthority(input.rendererAuthorityProjection?.prosodyAuthoritySummary)
      const mismatch = firstSignal([
        input.rendererAuthorityProjection?.authorityMismatchDisplay,
        input.rendererAuthorityProjection?.authorityMismatchSummary,
      ])
      const authorityTrace = prosodyAuthority?.technical ?? mismatch
      if (!authorityTrace)
        return null
      return `renderer drift ${driftStart.signal} -> authority trace ${authorityTrace}${prosodyAuthority && mismatch ? ` -> ${mismatch}` : ''} -> continuity anchor ${continuityAnchor}`
    }
  }
}

function pushDisplayEntry(
  entries: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry[],
  entry: Omit<PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry, 'value' | 'technicalValue'>,
  summary: { value: string, technicalValue?: string },
) {
  entries.push({
    ...entry,
    value: summary.value,
    ...(summary.technicalValue ? { technicalValue: summary.technicalValue } : {}),
  })
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
  const bodyContinuityPhase = normalizeBodyContinuityPhase(
    input.rendererAuthorityProjection?.bodyContinuityPhase
    ?? input.runtimeContinuityProjection?.bodyContinuityPhase,
  )
  const rendererRejoinSurfaceKey = normalizeRendererRejoinSurfaceKey(
    input.rendererAuthorityProjection?.rendererRejoinSurfaceKey
    ?? input.runtimeContinuityProjection?.rendererRejoinSurfaceKey,
  )
  const status = normalizeStatus([
    input.personaBiasProvenance?.status,
    input.proactiveActionChain?.status,
    input.residentPerformanceProjection?.status,
    input.rendererAuthorityProjection?.status,
    input.runtimeContinuityProjection?.status,
  ])

  const statusValue = formatList([status, `drift=${resolveDriftKind(dominantDrift)}`])
  if (statusValue) {
    pushDisplayEntry(entries, { key: 'status', label: '闭环状态' }, formatStatusDisplayValue(statusValue))
  }

  const personaValue = formatList([
    input.personaBiasProvenance?.relationshipPosture,
    input.personaBiasProvenance?.initiativeStyle,
    input.personaBiasProvenance?.preferredProactiveStyle,
  ])
  if (personaValue) {
    pushDisplayEntry(entries, { key: 'persona', label: '人格基线' }, formatPersonaDisplayValue(personaValue))
  }

  const personaNode = formatManifestationNode(
    input.proactiveManifestationChain?.personaPreferredStyle ?? input.personaBiasProvenance?.preferredProactiveStyle,
    input.proactiveManifestationChain?.personaPreferredPresence,
    'n/a/n/a',
  )
  const residentNode = formatManifestationNode(
    input.residentPerformanceProjection?.residentEmbodiedPresence,
    input.residentPerformanceProjection?.residentStance,
    'n/a/n/a',
  )
  if (personaNode !== 'n/a/n/a' || residentNode !== 'n/a/n/a') {
    const value = `persona ${personaNode} -> resident ${residentNode}`
    pushDisplayEntry(
      entries,
      { key: 'manifestation-bridge', label: '显形链路' },
      formatManifestationBridgeDisplayValue(value),
    )
  }

  if (driftStart) {
    const driftSummary = toDisplayValue(driftStart.signal)
    entries.push({
      key: 'drift-start',
      label: '起漂层',
      value: `${driftStart.layer} | ${driftSummary.value}`,
      ...(driftSummary.technicalValue
        ? { technicalValue: `${driftStart.layer} | ${driftSummary.technicalValue}` }
        : {}),
    })
  }

  if (driftStart && repairOwner) {
    const summary = formatRepairOwnerDisplayValue(repairOwner)
    entries.push({
      key: 'repair-owner',
      label: '修复归属',
      layer: driftStart.layer,
      detail: repairOwner,
      bodyContinuityPhase,
      rendererRejoinSurfaceKey,
      value: `${driftStart.layer} | ${summary.value}`,
      ...(summary.technicalValue
        ? { technicalValue: `${driftStart.layer} | ${summary.technicalValue}` }
        : {}),
    })
  }

  if (driftStart && firstCheck) {
    const summary = formatFirstCheckDisplayValue(firstCheck)
    entries.push({
      key: 'first-check',
      label: '首查点',
      layer: driftStart.layer,
      detail: firstCheck,
      bodyContinuityPhase,
      rendererRejoinSurfaceKey,
      value: `${driftStart.layer} | ${summary.value}`,
      ...(summary.technicalValue
        ? { technicalValue: `${driftStart.layer} | ${summary.technicalValue}` }
        : {}),
    })
  }

  if (repairPath) {
    pushDisplayEntry(entries, {
      key: 'repair-path',
      label: '修复路径',
      layer: driftStart?.layer ?? null,
      detail: repairPath,
      bodyContinuityPhase,
      rendererRejoinSurfaceKey,
    }, formatRepairPathDisplayValue(repairPath))
  }

  const proactiveValue = formatList([
    input.proactiveActionChain?.runtimeSelectedAction,
    typeof input.proactiveActionChain?.runtimeShouldSpeak === 'boolean'
      ? `shouldSpeak=${String(input.proactiveActionChain.runtimeShouldSpeak)}`
      : null,
    input.proactiveDecisionConsumptionSummary?.decisionMode,
  ])
  if (proactiveValue) {
    pushDisplayEntry(entries, { key: 'proactive', label: '主动落点' }, formatProactiveDisplayValue(proactiveValue))
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
    pushDisplayEntry(entries, { key: 'resident', label: '驻留投影' }, formatResidentDisplayValue(residentValue))
  }

  if (input.rendererAuthorityProjection) {
    const projection = input.rendererAuthorityProjection
    const laneTruth = summarizeAuthorityLaneTruth(projection.matchedSignals, projection.driftingSignals)
    const authorityMatch = projection.authorityMatchSummary
      ? toAuthorityDisplayEntry('authority-match', projection.authorityMatchSummary)
      : null
    const rendererValue = formatList([
      projection.rendererTarget,
      projection.bodyContinuityPhase ? `bodyPhase=${projection.bodyContinuityPhase}` : null,
      projection.rendererRejoinSurfaceKey ? `rejoinSurface=${projection.rendererRejoinSurfaceKey}` : null,
      authorityMatch?.value && authorityMatch.value !== laneTruth ? authorityMatch.value : null,
      laneTruth,
    ])
    if (rendererValue) {
      const display = formatRendererDisplayValue(rendererValue)
      const prosody = formatRendererProsodyAuthority(projection.prosodyAuthoritySummary)
      const technicalValue = formatList([
        projection.rendererTarget,
        projection.bodyContinuityPhase ? `bodyPhase=${projection.bodyContinuityPhase}` : null,
        projection.rendererRejoinSurfaceKey ? `rejoinSurface=${projection.rendererRejoinSurfaceKey}` : null,
        projection.authorityMatchSummary,
        laneTruth,
        prosody?.technicalValue,
      ])
      entries.push({
        key: 'renderer',
        label: '显形权威',
        value: prosody ? `${display.value} | ${prosody.value}` : display.value,
        ...(technicalValue ? { technicalValue } : {}),
      })
    }
  }

  const continuityLaneTruth = input.runtimeContinuityProjection
    ? summarizeAuthorityLaneTruth(
        input.runtimeContinuityProjection.matchedSignals,
        input.runtimeContinuityProjection.driftingSignals,
      )
    : null
  const continuityValue = formatList([
    input.runtimeContinuityProjection?.activeThreadId,
    input.runtimeContinuityProjection?.runtimeChannel,
    input.runtimeContinuityProjection?.runtimeScenario,
    input.runtimeContinuityProjection?.bodyContinuityPhase
      ? `bodyPhase=${input.runtimeContinuityProjection.bodyContinuityPhase}`
      : null,
    input.runtimeContinuityProjection?.rendererRejoinSurfaceKey
      ? `rejoinSurface=${input.runtimeContinuityProjection.rendererRejoinSurfaceKey}`
      : null,
    continuityLaneTruth,
    hasRememberedFamiliarityMemoryFirst(input) ? 'remembered-familiarity-memory-first' : null,
  ])
  if (continuityValue) {
    pushDisplayEntry(entries, { key: 'continuity', label: '连续线程' }, formatContinuityDisplayValue(continuityValue))
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

  if (dominantDrift) {
    pushDisplayEntry(entries, { key: 'dominant-drift', label: '主漂移' }, toDisplayValue(dominantDrift))
  }

  return entries
}

export function buildSelfEvolutionDiagnosticSummaryLines(
  entries: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry[],
) {
  return entries.map(entry => `${entry.key}: ${entry.value}`)
}
