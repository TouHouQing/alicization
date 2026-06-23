import type { StageEmbodimentPerformanceState } from '@proj-alicization/stage-shared'

export interface Live2DActionPulseBinding {
  actionKey: string
  motionName: string
  motionIndex: number
  label?: string
  description?: string
  source?: string
}

export interface Live2DActionPulseAvailableMotion {
  motionName: string
  motionIndex: number
  fileName: string
}

export interface ResolveLive2DActionPulseBindingOptions {
  state?: StageEmbodimentPerformanceState | null
  availableMotions?: Iterable<Live2DActionPulseAvailableMotion> | null
  motionMap?: Readonly<Record<string, string | undefined>> | null
}

function normalizeActionCue(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

function normalizeText(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeTextList(values: readonly string[] | null | undefined) {
  return [...new Set((values ?? [])
    .map(value => normalizeText(value).toLowerCase())
    .filter(Boolean))]
    .sort()
}

function normalizeOptionalNumber(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Math.max(0, Math.round(Number(value)))
}

function resolveActionPulseAliasCandidates(
  actionCue: string,
  state: StageEmbodimentPerformanceState | null | undefined,
) {
  const signatures = new Set<string>()
  const candidates: string[] = []

  ;[
    ...(state?.activeCue?.rendererHints?.preferredMotionAliases ?? []),
    state?.activeCue?.actionCue ?? null,
    state?.activeActionCue ?? null,
    state?.performance?.actionCue ?? null,
    actionCue,
  ].forEach((candidate) => {
    const normalized = normalizeActionCue(candidate)
    if (!normalized || signatures.has(normalized))
      return

    signatures.add(normalized)
    candidates.push(normalized)
  })

  return candidates
}

function resolveActionPulseFallbackMotion(
  actionCue: string,
  options: ResolveLive2DActionPulseBindingOptions | undefined,
) {
  const motions = [...(options?.availableMotions ?? [])]
  if (motions.length === 0)
    return undefined

  const motionMap = options?.motionMap ?? {}
  const aliases = resolveActionPulseAliasCandidates(actionCue, options?.state)
  if (aliases.length === 0)
    return undefined

  for (const alias of aliases) {
    const mappedMotion = motions.find(motion => normalizeActionCue(motionMap[motion.fileName]) === alias)
    if (mappedMotion)
      return mappedMotion

    const directMotion = motions.find(motion => normalizeActionCue(motion.motionName) === alias)
    if (directMotion)
      return directMotion
  }

  return undefined
}

export function buildLive2DActionPulseReplayKey(input: {
  binding: Live2DActionPulseBinding
  state: StageEmbodimentPerformanceState | null | undefined
}) {
  const motionName = normalizeText(input.binding.motionName)
  if (!motionName)
    return ''

  const motionIndex = Number.isFinite(input.binding.motionIndex)
    ? Math.max(0, Math.floor(Number(input.binding.motionIndex)))
    : '*'
  const rendererHints = input.state?.activeCue?.rendererHints

  return JSON.stringify([
    `${motionName}:${motionIndex}`,
    input.state?.activeActionCueSource ?? 'none',
    normalizeText(rendererHints?.residentMode).toLowerCase(),
    normalizeText(rendererHints?.preferredBlinkCadence).toLowerCase(),
    normalizeText(rendererHints?.preferredGazeMode).toLowerCase(),
    normalizeText(rendererHints?.signature).toLowerCase(),
    normalizeTextList(rendererHints?.reasonTags),
    normalizeTextList(rendererHints?.preferredMotionAliases),
    input.state?.driverAuthority?.bodySegmentMatched == null
      ? 'unknown'
      : input.state.driverAuthority.bodySegmentMatched ? 'matched' : 'renderer-only',
    normalizeOptionalNumber(input.state?.activeCue?.rendererSettle?.live2dMotionFollowThroughMs),
    normalizeOptionalNumber(input.state?.activeCue?.actionHoldMs),
  ])
}

export function resolveLive2DActionPulseBinding(
  bindings: Iterable<Live2DActionPulseBinding>,
  actionCue?: string | null,
  options?: ResolveLive2DActionPulseBindingOptions,
) {
  const normalizedCue = normalizeActionCue(actionCue)
  if (!normalizedCue)
    return undefined

  for (const binding of bindings) {
    if (normalizeActionCue(binding.actionKey) === normalizedCue)
      return binding
  }

  const fallbackMotion = resolveActionPulseFallbackMotion(normalizedCue, options)
  if (!fallbackMotion)
    return undefined

  return {
    actionKey: normalizedCue,
    motionName: fallbackMotion.motionName,
    motionIndex: fallbackMotion.motionIndex,
    source: 'runtime',
  }
}
