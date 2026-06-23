import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../../stores/stage-three-runtime-diagnostics'
import type { SelfEvolutionRendererAuthorityProjection } from './performance-visualizer-self-evolution-renderer-authority'

import {
  buildTraceEmbodimentSummary,
  enrichTraceEmbodimentSummary,
  formatTraceEmbodimentDisplaySummary,
} from './performance-visualizer-trace-embodiment'

export interface SelfEvolutionRuntimeContinuityProjection {
  status: 'grounded' | 'partial' | 'drift' | 'missing'
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
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

function formatRendererRejoinSurfaceLabel(
  surfaceKey: SelfEvolutionRuntimeContinuityProjection['rendererRejoinSurfaceKey'],
  rendererTarget: SelfEvolutionRendererAuthorityProjection['rendererTarget'] | null | undefined,
) {
  if (surfaceKey === 'authority:renderer-rejoin:live2d' || rendererTarget === 'live2d')
    return 'Live2D'

  if (surfaceKey === 'authority:renderer-rejoin:vrm' || rendererTarget === 'vrm')
    return 'VRM'

  if (surfaceKey === 'authority:renderer-rejoin:speech' || rendererTarget === 'speech')
    return 'speech'

  return null
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

function summarizeRendererAuthorityLaneTruth(
  rendererAuthorityProjection: SelfEvolutionRendererAuthorityProjection | null | undefined,
) {
  if (!rendererAuthorityProjection)
    return null

  const matchedSignals = rendererAuthorityProjection.matchedSignals ?? []
  const driftingSignals = rendererAuthorityProjection.driftingSignals ?? []

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

function collectRendererAuthorityContinuitySignals(
  rendererAuthorityProjection: SelfEvolutionRendererAuthorityProjection | null | undefined,
  signalPrefix: 'authority-' | 'lane=' | 'remaining-open=' | 'same-her-frame:' | 'same-her-execution:',
) {
  if (!rendererAuthorityProjection)
    return []

  return pushUnique([
    ...(rendererAuthorityProjection.matchedSignals ?? []).filter(signal => signal.startsWith(signalPrefix)),
    ...(rendererAuthorityProjection.driftingSignals ?? []).filter(signal => signal.startsWith(signalPrefix)),
  ])
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
  const rendererAuthorityLaneTruth = summarizeRendererAuthorityLaneTruth(renderer)
  const rendererAuthorityContinuitySignals = collectRendererAuthorityContinuitySignals(renderer, 'authority-')
  const rendererAuthorityLaneSignals = collectRendererAuthorityContinuitySignals(renderer, 'lane=')
  const rendererAuthorityRemainingOpenSignals = collectRendererAuthorityContinuitySignals(renderer, 'remaining-open=')
  const rendererSameHerFrameSignals = collectRendererAuthorityContinuitySignals(renderer, 'same-her-frame:')
  const rendererSameHerExecutionSignals = collectRendererAuthorityContinuitySignals(renderer, 'same-her-execution:')
  const rendererRejoinSurface = formatRendererRejoinSurfaceLabel(
    renderer?.rendererRejoinSurfaceKey ?? null,
    renderer?.rendererTarget,
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
    ...rendererAuthorityContinuitySignals.filter(signal => signal.endsWith(':yes')),
    ...rendererAuthorityLaneSignals,
    ...rendererAuthorityRemainingOpenSignals,
    ...rendererSameHerFrameSignals.filter(signal => signal.endsWith(':aligned')),
    ...rendererSameHerExecutionSignals.filter(signal => signal.endsWith(':aligned')),
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
    ...rendererAuthorityContinuitySignals.filter(signal => signal.endsWith(':no')),
    ...rendererSameHerFrameSignals.filter(signal => !signal.endsWith(':aligned')),
    ...rendererSameHerExecutionSignals.filter(signal => !signal.endsWith(':aligned')),
    ...(renderer?.driftingSignals ?? []).filter(signal => signal.startsWith('renderer-drift:')),
  ])

  return {
    status: driftingSignals.length > 0
      ? 'drift'
      : missingSignals.length === 0
        ? 'grounded'
        : matchedSignals.length > 0
          ? 'partial'
          : 'missing',
    bodyContinuityPhase: renderer?.bodyContinuityPhase ?? null,
    rendererRejoinSurfaceKey: renderer?.rendererRejoinSurfaceKey ?? null,
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
      renderer?.bodyContinuityPhase === 'body-only-hold'
        ? 'Body continuity is still the only lane carrying this same living segment, so runtime continuity should keep reading the current embodiment as one continuous her being held inward rather than a renderer-neutral idle settle.'
        : null,
      renderer?.bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
        ? rendererRejoinSurface
          ? `Body continuity still carries the same living segment while ${rendererRejoinSurface} manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.`
          : 'Body continuity still carries the same living segment while manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.'
        : null,
      renderer?.bodyContinuityPhase === 'full-cross-modal-lock'
        ? rendererRejoinSurface
          ? `Body continuity and ${rendererRejoinSurface} manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.`
          : 'Body continuity and manifestation authority are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.'
        : null,
      renderer?.bodyContinuityPhase === 'renderer-rejoin-without-body'
        ? rendererRejoinSurface
          ? `Renderer lanes have rejoined on ${rendererRejoinSurface} manifestation, but the body line is no longer carrying that same living segment, so runtime continuity should keep treating the visible recovery as same-her drift risk rather than a completed embodiment repair.`
          : 'Renderer lanes have rejoined on manifestation authority, but the body line is no longer carrying that same living segment, so runtime continuity should keep treating the visible recovery as same-her drift risk rather than a completed embodiment repair.'
        : null,
      rendererAuthorityLaneTruth
        ? `Renderer authority continuity still keeps ${rendererAuthorityLaneTruth} on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.`
        : null,
      rendererSameHerFrameSignals.filter(signal => !signal.endsWith(':aligned')).length > 0
        ? `Runtime continuity still carries same-her frame drift signals ${rendererSameHerFrameSignals.filter(signal => !signal.endsWith(':aligned')).join(', ')}, so the current repair loop can keep the voice/lipsync mismatch attached to one digital-life thread instead of treating it as a separate renderer branch.`
        : null,
      rendererSameHerExecutionSignals.filter(signal => !signal.endsWith(':aligned')).length > 0
        ? `Runtime continuity still carries same-her execution drift signals ${rendererSameHerExecutionSignals.filter(signal => !signal.endsWith(':aligned')).join(', ')}, so the current repair loop can keep the Live2D execution mismatch attached to one digital-life thread instead of treating it as a separate renderer branch.`
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
