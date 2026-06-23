import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'

export type TraceEmbodimentDriver = 'body' | 'face' | 'motion' | 'lipsync' | 'voice'

interface TraceEmbodimentSummaryInput {
  turnMode: string | null | undefined
  closureState: string | null | undefined
  finalSurfacePolicy: string | null | undefined
  authorityDrivers?: TraceEmbodimentDriver[]
  executionKinds?: TraceEmbodimentDriver[]
  scenario?: string | null
  stance?: string | null
  sourceTrail?: string | null
}

function findTraceDetailValue(
  details: NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceDetails']>,
  label: string,
) {
  for (const event of details) {
    for (const detail of event.details) {
      if (detail.label === label && detail.value.trim())
        return detail.value.trim()
    }
  }
  return null
}

function normalizeSummary(value: string | null | undefined) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function parseTraceEmbodimentSummaryParts(summary: string) {
  return summary
    .split('|')
    .map(part => part.trim())
    .filter(Boolean)
}

function parseTraceEmbodimentSummary(summary: string) {
  const parsed = new Map<string, string>()
  for (const part of parseTraceEmbodimentSummaryParts(summary)) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex <= 0)
      continue
    const key = part.slice(0, separatorIndex).trim()
    const value = part.slice(separatorIndex + 1).trim()
    if (key && value)
      parsed.set(key, value)
  }
  return parsed
}

function mapTurnMode(value: string) {
  if (value === 'care')
    return '关怀回合'
  return value
}

function mapClosureState(value: string) {
  if (value === 'grounded-recall')
    return 'grounded-recall（基于记忆回收落稳）'
  return value
}

function mapSurfacePolicy(value: string) {
  if (value === 'procedural-carry')
    return 'procedural-carry（沿既有过程延续表达）'
  return value
}

function mapScenario(value: string) {
  if (value === 'late-night-fatigue')
    return '深夜疲劳照看'
  return value
}

function mapStance(value: string) {
  if (value === 'observe-first')
    return '先观察后表达'
  return value
}

function mapDriverList(value: string, joiner: '、' | '+') {
  if (value === 'none')
    return '无'

  const mapped = value
    .split(joiner === '+' ? '+' : ',')
    .map(part => part.trim())
    .filter(Boolean)
    .map((item) => {
      if (item === 'body')
        return '身体'
      if (item === 'face')
        return '表情'
      if (item === 'motion')
        return '动作'
      if (item === 'lipsync')
        return '口型'
      if (item === 'voice')
        return '声音'
      return item
    })

  return mapped.join(joiner)
}

function mapSourceTrail(value: string) {
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .join(' -> ')
}

export function isGeneratedTraceEmbodimentSummary(summary: string | null | undefined): summary is string {
  return typeof summary === 'string' && summary.startsWith('turn=')
}

export function formatTraceEmbodimentDisplaySummary(summary: string | null | undefined) {
  if (!isGeneratedTraceEmbodimentSummary(summary))
    return normalizeSummary(summary)

  const parsed = parseTraceEmbodimentSummary(summary)
  const parts: string[] = []

  const turnMode = parsed.get('turn')
  if (turnMode)
    parts.push(mapTurnMode(turnMode))
  const closureState = parsed.get('closure')
  if (closureState)
    parts.push(`收口 ${mapClosureState(closureState)}`)
  const surfacePolicy = parsed.get('surface')
  if (surfacePolicy)
    parts.push(`表面策略 ${mapSurfacePolicy(surfacePolicy)}`)
  const authorityDrivers = parsed.get('authority')
  if (authorityDrivers)
    parts.push(`权威驱动 ${mapDriverList(authorityDrivers, '、')}`)
  const executionKinds = parsed.get('execution')
  if (executionKinds)
    parts.push(`实际执行 ${mapDriverList(executionKinds, '+')}`)
  const scenario = parsed.get('scenario')
  if (scenario)
    parts.push(`场景 ${mapScenario(scenario)}`)
  const stance = parsed.get('stance')
  if (stance)
    parts.push(`姿态 ${mapStance(stance)}`)
  const sourceTrail = parsed.get('sourceTrail')
  if (sourceTrail)
    parts.push(`来源链 ${mapSourceTrail(sourceTrail)}`)

  return parts.join('，')
}

function formatTraceEmbodimentSummary(input: TraceEmbodimentSummaryInput) {
  const authorityDrivers = input.authorityDrivers && input.authorityDrivers.length > 0
    ? input.authorityDrivers.join(', ')
    : 'none'
  const executionKinds = input.executionKinds && input.executionKinds.length > 0
    ? input.executionKinds.join('+')
    : 'none'

  const parts = [
    `turn=${input.turnMode ?? 'n/a'}`,
    `closure=${input.closureState ?? 'n/a'}`,
    `surface=${input.finalSurfacePolicy ?? 'n/a'}`,
    `authority=${authorityDrivers}`,
    `execution=${executionKinds}`,
  ]

  if (input.scenario)
    parts.push(`scenario=${input.scenario}`)
  if (input.stance)
    parts.push(`stance=${input.stance}`)
  if (input.sourceTrail)
    parts.push(`sourceTrail=${input.sourceTrail}`)

  return parts.join(' | ')
}

export function buildTraceEmbodimentSummary(
  traceContext?: Pick<
    StageThreeRuntimeSpeechEmbodimentDiagnostics,
    'recentDrivingTraceRecord' | 'recentDrivingTraceDetails'
  >,
) {
  const trace = traceContext?.recentDrivingTraceRecord
  if (!trace)
    return null

  const details = traceContext?.recentDrivingTraceDetails ?? []
  const scenario = findTraceDetailValue(details, 'scenario')
  const stance = findTraceDetailValue(details, 'stance')
  const sourceTrail = findTraceDetailValue(details, 'sourceTrail')
  return formatTraceEmbodimentSummary({
    turnMode: trace.turnMode,
    closureState: trace.closureState,
    finalSurfacePolicy: trace.finalSurfacePolicy,
    scenario,
    stance,
    sourceTrail,
  })
}

export function enrichTraceEmbodimentSummary(input: {
  upstreamSummary?: string | null
  localSummary?: string | null
}) {
  const upstreamSummary = normalizeSummary(input.upstreamSummary)
  const localSummary = normalizeSummary(input.localSummary)

  if (!upstreamSummary)
    return localSummary

  if (!localSummary)
    return upstreamSummary

  if (!isGeneratedTraceEmbodimentSummary(upstreamSummary) || !isGeneratedTraceEmbodimentSummary(localSummary))
    return upstreamSummary

  const upstreamParts = parseTraceEmbodimentSummaryParts(upstreamSummary)
  const localParts = parseTraceEmbodimentSummaryParts(localSummary)
  const mergedParts = [...upstreamParts]

  for (const part of localParts) {
    const key = part.split('=')[0]?.trim()
    if (!key)
      continue

    const alreadyPresent = upstreamParts.some(existing => existing.startsWith(`${key}=`))
    if (!alreadyPresent)
      mergedParts.push(part)
  }

  return mergedParts.join(' | ')
}

export function buildTraceAuthorityExecutionSummary(input: {
  turnMode: string | null | undefined
  closureState: string | null | undefined
  finalSurfacePolicy: string | null | undefined
  matchedDrivers: TraceEmbodimentDriver[]
  driverExecutionSummary: string | null
  traceEmbodimentSummary?: string | null
}) {
  const executionKinds: TraceEmbodimentDriver[] = []
  const driverExecutionSummary = input.driverExecutionSummary
  if (typeof driverExecutionSummary === 'string' && driverExecutionSummary.trim().length > 0) {
    if (driverExecutionSummary.includes('body='))
      executionKinds.push('body')
    if (driverExecutionSummary.includes('face='))
      executionKinds.push('face')
    if (driverExecutionSummary.includes('motion='))
      executionKinds.push('motion')
    if (driverExecutionSummary.includes('lipsync='))
      executionKinds.push('lipsync')
    if (driverExecutionSummary.includes('voice='))
      executionKinds.push('voice')
  }

  const enrichedTraceEmbodimentSummary = enrichTraceEmbodimentSummary({
    upstreamSummary: input.traceEmbodimentSummary,
    localSummary: formatTraceEmbodimentSummary({
      turnMode: input.turnMode,
      closureState: input.closureState,
      finalSurfacePolicy: input.finalSurfacePolicy,
    }),
  })
  const scenario = enrichedTraceEmbodimentSummary?.match(/(?:^|\s)\| scenario=([^|]+)/)?.[1]?.trim() ?? null
  const stance = enrichedTraceEmbodimentSummary?.match(/(?:^|\s)\| stance=([^|]+)/)?.[1]?.trim() ?? null
  const sourceTrail = enrichedTraceEmbodimentSummary?.match(/(?:^|\s)\| sourceTrail=([^|]+)/)?.[1]?.trim() ?? null

  return formatTraceEmbodimentSummary({
    turnMode: input.turnMode,
    closureState: input.closureState,
    finalSurfacePolicy: input.finalSurfacePolicy,
    authorityDrivers: input.matchedDrivers,
    executionKinds,
    scenario,
    stance,
    sourceTrail,
  })
}
