import type { SelfEvolutionEvidencePanelInput } from './performance-visualizer-self-evolution-evidence'

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
    | 'adopted-anchor'
    | 'dominant-drift'
  label: string
  value: string
  technicalValue?: string
}

function hasValue(value: string | null | undefined) {
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

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
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
    .replace(/\bface:yes motion:yes lipsync:yes\b/, '表情命中/动作命中/口型命中')
    .replace(/\bface:yes motion:yes lipsync:no\b/, '表情命中/动作命中/口型未命中')

  return displayValue === normalized
    ? { value: displayValue }
    : { value: displayValue, technicalValue: normalized }
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

  if (!anchorLine || !traceLine)
    return null

  const candidateId = anchorLine.replace(/^anchor:\s*/, '').replace(/\s+is still the adopted default continuity anchor$/, '').trim()
  const snapshotMatch = traceLine.match(/snapshot=([^|]+)/)
  const ownerMatch = traceLine.match(/owner=([^|]+)/)
  const snapshotValue = snapshotMatch?.[1]?.trim() ?? 'n/a'
  const ownerValue = ownerMatch?.[1]?.trim() ?? 'n/a'

  return {
    value: `${candidateId || 'n/a'} | snapshot=${snapshotValue} | owner=${ownerValue}${prosodyAuthorityLine ? ' | 韵律权威已回绑' : ''}`,
    technicalValue: `${candidateId || 'n/a'} | ${traceLine.replace(/^trace:\s*/, '').trim()}${prosodyAuthorityLine ? ` | ${prosodyAuthorityLine.trim()}` : ''}`,
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
    return proactiveDrift ?? null

  const personaDrift = input.personaBiasProvenance?.driftingSignals?.[0]
  if (hasValue(personaDrift))
    return personaDrift ?? null

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

  if (hasValue(input.personaBiasProvenance?.manifestationCadenceSummary)) {
    entries.push({
      key: 'manifestation-cadence',
      label: '显形节奏',
      value: input.personaBiasProvenance!.manifestationCadenceSummary!,
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

  const rendererValue = formatList([
    input.rendererAuthorityProjection?.rendererTarget,
    input.rendererAuthorityProjection?.authorityMatchSummary,
  ])
  if (rendererValue) {
    const rendererSummary = formatRendererDisplayValue(rendererValue)
    const rendererProsodyAuthority = formatRendererProsodyAuthority(
      (input.rendererAuthorityProjection as { prosodyAuthoritySummary?: string | null } | null | undefined)?.prosodyAuthoritySummary,
    )
    const rendererEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'renderer',
      label: '显形权威',
      value: rendererProsodyAuthority
        ? `${rendererSummary.value} | ${rendererProsodyAuthority.value}`
        : rendererSummary.value,
    }
    if (rendererProsodyAuthority) {
      rendererEntry.technicalValue = rendererSummary.technicalValue
        ? `${rendererSummary.technicalValue} | ${rendererProsodyAuthority.technicalValue}`
        : `${rendererValue} | ${rendererProsodyAuthority.technicalValue}`
    }
    else if (rendererSummary.technicalValue) {
      rendererEntry.technicalValue = rendererSummary.technicalValue
    }
    entries.push(rendererEntry)
  }

  const continuityValue = formatList([
    input.runtimeContinuityProjection?.activeThreadId,
    input.runtimeContinuityProjection?.runtimeChannel,
    input.runtimeContinuityProjection?.runtimeScenario,
    input.identityDriftGovernanceSummary?.governanceMode,
    hasRememberedFamiliarityMemoryFirst(input) ? 'remembered-familiarity-memory-first' : null,
  ])
  if (continuityValue) {
    const continuitySummary = formatContinuityDisplayValue(continuityValue)
    const continuityEntry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry = {
      key: 'continuity',
      label: '连续线程',
      value: continuitySummary.value,
    }
    if (continuitySummary.technicalValue)
      continuityEntry.technicalValue = continuitySummary.technicalValue
    entries.push(continuityEntry)
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
      case 'adopted-anchor':
        return `adopted-anchor: ${value}`
      case 'dominant-drift':
        return `dominant-drift: ${value}`
      default:
        return `${entry.key}: ${value}`
    }
  })
}
