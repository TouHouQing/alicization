import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { SelfEvolutionRendererAuthorityProjection } from './performance-visualizer-self-evolution-renderer-authority'

import {
  buildTraceEmbodimentSummary,
  enrichTraceEmbodimentSummary,
  formatTraceEmbodimentDisplaySummary,
} from './performance-visualizer-trace-embodiment'

export interface SelfEvolutionRuntimeContinuityProjection {
  status: 'grounded' | 'partial' | 'missing'
  runtimeChannel: string | null
  runtimeSummary: string | null
  activeThreadId: string | null
  activeThreadTitle: string | null
  runtimeScenario: string | null
  runtimeScene: string | null
  transitionFromWatchMode: string | null
  transitionToWatchMode: string | null
  transitionFromScenario: string | null
  transitionReason: string | null
  governorDrive: string | null
  governorIntentionId: string | null
  focusBeliefId: string | null
  rationaleTags: string[]
  traceEmbodimentSummary: string | null
  traceEmbodimentDisplaySummary: string | null
  matchedSignals: string[]
  missingSignals: string[]
  driftingSignals: string[]
  reasons: string[]
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function pushUnique(values: Array<string | null | undefined>) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
  }
  return result
}

function summarizeProsodyAuthorityContinuity(value: string | null | undefined) {
  const normalized = normalizeText(value)
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

  return `Prosody authority still anchors ${mode ?? 'n/a'} on ${segment ?? 'n/a'}, so runtime continuity can attribute the mouth-driving divergence to the same speech segment instead of a detached renderer branch.`
}

export function buildSelfEvolutionRuntimeContinuityProjection(input: {
  rendererAuthorityProjection?: SelfEvolutionRendererAuthorityProjection | null
  speechEmbodiment?: StageThreeRuntimeSpeechEmbodimentDiagnostics | null
  traceEmbodimentSummary?: string | null
}): SelfEvolutionRuntimeContinuityProjection | null {
  const renderer = input.rendererAuthorityProjection
  const speech = input.speechEmbodiment
  const runtimeDynamics = speech?.runtimeDynamics ?? null
  const provenance = runtimeDynamics?.provenance ?? null
  const eventPointers = runtimeDynamics?.eventPointers ?? null
  const recentTransition = eventPointers?.recentTransition ?? null
  const localTraceEmbodimentSummary = buildTraceEmbodimentSummary({
    recentDrivingTraceRecord: speech?.recentDrivingTraceRecord ?? null,
    recentDrivingTraceDetails: speech?.recentDrivingTraceDetails ?? [],
  })
  const traceEmbodimentSummary = enrichTraceEmbodimentSummary({
    upstreamSummary: input.traceEmbodimentSummary,
    localSummary: localTraceEmbodimentSummary,
  })
  const traceEmbodimentDisplaySummary = formatTraceEmbodimentDisplaySummary(traceEmbodimentSummary)
  const prosodyAuthorityReason = summarizeProsodyAuthorityContinuity(
    (renderer as { prosodyAuthoritySummary?: string | null } | null | undefined)?.prosodyAuthoritySummary,
  )

  const hasSignal = Boolean(
    renderer
    || provenance
    || recentTransition
    || eventPointers?.runtimeThreadId
    || eventPointers?.governorDrive
    || eventPointers?.focusBeliefId
    || traceEmbodimentSummary,
  )

  if (!hasSignal)
    return null

  const runtimeChannel = normalizeText(provenance?.runtimeChannel)
  const runtimeSummary = normalizeText(provenance?.runtimeSummary)
  const activeThreadId = normalizeText(provenance?.activeThreadId ?? eventPointers?.runtimeThreadId)
  const activeThreadTitle = normalizeText(provenance?.activeThreadTitle)
  const runtimeScenario = normalizeText(provenance?.scenario)
  const runtimeScene = normalizeText(provenance?.scene)
  const transitionFromWatchMode = normalizeText(recentTransition?.fromWatchMode)
  const transitionToWatchMode = normalizeText(recentTransition?.toWatchMode)
  const transitionFromScenario = normalizeText(recentTransition?.fromScenario)
  const transitionReason = normalizeText(recentTransition?.reason)
  const governorDrive = normalizeText(eventPointers?.governorDrive)
  const governorIntentionId = normalizeText(eventPointers?.governorIntentionId)
  const focusBeliefId = normalizeText(eventPointers?.focusBeliefId)
  const rationaleTags = (eventPointers?.rationaleTags ?? [])
    .map(tag => normalizeText(tag))
    .filter((tag): tag is string => Boolean(tag))

  const matchedSignals = pushUnique([
    runtimeChannel ? `runtime-channel:${runtimeChannel}` : null,
    activeThreadId ? `runtime-thread:${activeThreadId}` : null,
    runtimeScenario ? `runtime-scenario:${runtimeScenario}` : null,
    runtimeScene ? `runtime-scene:${runtimeScene}` : null,
    transitionFromWatchMode ? `transition-from:${transitionFromWatchMode}` : null,
    transitionToWatchMode ? `transition-to:${transitionToWatchMode}` : null,
    governorDrive ? `governor-drive:${governorDrive}` : null,
    focusBeliefId ? `focus-belief:${focusBeliefId}` : null,
    traceEmbodimentSummary ? 'trace-embodiment' : null,
  ])

  const missingSignals = pushUnique([
    !runtimeChannel ? 'runtime-channel' : null,
    !activeThreadId ? 'runtime-thread' : null,
    !runtimeScenario ? 'runtime-scenario' : null,
    !runtimeScene ? 'runtime-scene' : null,
    !governorDrive ? 'governor-drive' : null,
    !traceEmbodimentSummary ? 'trace-embodiment' : null,
  ])

  const driftingSignals = pushUnique([
    renderer?.runtimeBodyState === 'settled' && transitionToWatchMode === 'symbiotic-vision'
      ? 'transition-to:symbiotic-vision'
      : null,
    renderer?.runtimeProfile === 'protective-watch' && governorDrive && governorDrive !== 'protect'
      ? `governor-drive:${governorDrive}`
      : null,
    ...(renderer?.driftingSignals ?? []).filter(signal => signal.startsWith('renderer-drift:')),
  ])

  return {
    status: missingSignals.length === 0 && driftingSignals.length === 0 ? 'grounded' : matchedSignals.length > 0 ? 'partial' : 'missing',
    runtimeChannel,
    runtimeSummary,
    activeThreadId,
    activeThreadTitle,
    runtimeScenario,
    runtimeScene,
    transitionFromWatchMode,
    transitionToWatchMode,
    transitionFromScenario,
    transitionReason,
    governorDrive,
    governorIntentionId,
    focusBeliefId,
    rationaleTags,
    traceEmbodimentSummary,
    traceEmbodimentDisplaySummary,
    matchedSignals,
    missingSignals,
    driftingSignals,
    reasons: pushUnique([
      (activeThreadId || runtimeChannel || runtimeScenario)
        ? `Runtime continuity still stays on thread ${activeThreadId ?? 'n/a'} with ${runtimeChannel ?? 'n/a'}/${runtimeScenario ?? 'n/a'} context, so the rendered authority output is attached to an ongoing life situation instead of a detached animation shell.`
        : null,
      (transitionFromWatchMode || transitionToWatchMode || transitionReason)
        ? `Recent transition still explains the move from ${transitionFromWatchMode ?? 'n/a'} to ${transitionToWatchMode ?? 'n/a'} because ${transitionReason ?? 'n/a'}, which preserves a causal line between the prior scene and the current embodied posture.`
        : null,
      renderer
        ? 'Upstream renderer authority is still carrying the same manifestation line, so runtime continuity can explain the current embodiment as one continuous person-state rather than a renderer-local improvisation.'
        : null,
      prosodyAuthorityReason,
      traceEmbodimentSummary
        ? 'Trace embodiment summary still closes the same care/grounded-recall line, so renderer authority is part of one continuous person-state rather than a fresh isolated output.'
        : null,
      renderer?.driftingSignals?.find(signal => signal.startsWith('renderer-drift:'))
        ? `Renderer continuity still carries ${(renderer.driftingSignals.find(signal => signal.startsWith('renderer-drift:')) ?? '').replace(/^renderer-drift:/, '')}, so the life thread can explain the visible divergence as a post-projection renderer event instead of a broken resident mind state.`
        : null,
    ]),
  }
}
