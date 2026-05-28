import type {
  AlicizationMemoryDecisionTraceRecord,
  AlicizationMindTurnEventRecord,
} from '@proj-alicization/stage-ui/stores/alicization-bridge'

import type { StageThreeRuntimeSpeechEmbodimentDiagnostics } from '../stores/stage-three-runtime-diagnostics'
import {
  buildTraceAuthorityExecutionSummary,
  buildTraceEmbodimentSummary,
  enrichTraceEmbodimentSummary,
} from './devtools/performance-visualizer-trace-embodiment'
import { buildTraceTelemetrySummary } from './devtools/performance-visualizer-trace-telemetry'

type RendererSpeechPlaybackTelemetry = NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['playbackTelemetry']>

function cloneCue<T>(value: T): T {
  if (!value || typeof value !== 'object')
    return value

  return JSON.parse(JSON.stringify(value)) as T
}

function cloneVisemeHints(value: unknown) {
  if (!Array.isArray(value))
    return []

  return value.map((hint) => {
    const candidate = hint && typeof hint === 'object' && !Array.isArray(hint)
      ? hint as Record<string, unknown>
      : null

    return {
      segmentId: typeof candidate?.segmentId === 'string' ? candidate.segmentId : null,
      viseme: typeof candidate?.viseme === 'string' ? candidate.viseme : null,
      weight: typeof candidate?.weight === 'number' && Number.isFinite(candidate.weight) ? candidate.weight : null,
      source: typeof candidate?.source === 'string' ? candidate.source : null,
      confidence: typeof candidate?.confidence === 'number' && Number.isFinite(candidate.confidence) ? candidate.confidence : null,
    }
  })
}

function appendFinalSurfacePolicy(
  value: string | null | undefined,
  finalSurfacePolicy: string | null | undefined,
) {
  const normalizedValue = typeof value === 'string' && value.trim()
    ? value.trim()
    : null
  const normalizedPolicy = typeof finalSurfacePolicy === 'string' && finalSurfacePolicy.trim()
    ? finalSurfacePolicy.trim()
    : null

  if (!normalizedValue || !normalizedPolicy)
    return normalizedValue

  if (normalizedValue.includes(`当前表面策略是 ${normalizedPolicy}`))
    return normalizedValue

  if (normalizedValue.endsWith('。'))
    return `${normalizedValue.slice(0, -1)}；当前表面策略是 ${normalizedPolicy}。`

  return `${normalizedValue}；当前表面策略是 ${normalizedPolicy}`
}

function deriveAuthorityTrustSummary(input: {
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}) {
  const authoritySummary = input.authoritySummary
  const authoritySegmentId = typeof authoritySummary?.segmentId === 'string' && authoritySummary.segmentId.trim()
    ? authoritySummary.segmentId.trim()
    : null
  const prosodyAuthority = input.playbackTelemetry?.prosodyAuthority
  const prosodySegmentId = typeof prosodyAuthority?.segmentId === 'string' && prosodyAuthority.segmentId.trim()
    ? prosodyAuthority.segmentId.trim()
    : null

  if (!authoritySegmentId || !prosodyAuthority || prosodyAuthority.provenance !== 'authority-bound')
    return null

  if (prosodySegmentId !== authoritySegmentId)
    return null

  return '韵律权威链已重新绑定到当前片段，可直接进入长期基线。'
}

function resolveRendererProsodyAuthority(
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined,
) {
  return playbackTelemetry?.driverAuthority?.prosodyAuthority
    ?? playbackTelemetry?.prosodyAuthority
    ?? null
}

function buildRendererProsodyAuthoritySummary(
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined,
) {
  const prosodyAuthority = resolveRendererProsodyAuthority(playbackTelemetry)
  if (!prosodyAuthority)
    return null

  return [
    `mode=${prosodyAuthority.mode ?? 'n/a'}`,
    `prosody=${Number.isFinite(prosodyAuthority.cueProsodyWeight) ? Number(prosodyAuthority.cueProsodyWeight).toFixed(2) : 'n/a'}`,
    `mouth=${Number.isFinite(prosodyAuthority.cueMouthWeight) ? Number(prosodyAuthority.cueMouthWeight).toFixed(2) : 'n/a'}`,
    `head=${Number.isFinite(prosodyAuthority.cueHeadWeight) ? Number(prosodyAuthority.cueHeadWeight).toFixed(2) : 'n/a'}`,
    `visemePeak=${Number.isFinite(prosodyAuthority.visemePeakWeight) ? Number(prosodyAuthority.visemePeakWeight).toFixed(2) : 'n/a'}`,
    `provenance=${prosodyAuthority.provenance}`,
    `source=${prosodyAuthority.source ?? 'n/a'}`,
    `segment=${prosodyAuthority.segmentId ?? 'n/a'}`,
  ].join(' | ')
}

function enrichAuthoritySummaryWithTracePolicy(
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined,
  recentDrivingTraceRecord: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceRecord'] | null | undefined,
) {
  if (!authoritySummary)
    return null

  const finalSurfacePolicy = recentDrivingTraceRecord?.finalSurfacePolicy ?? null
  if (!finalSurfacePolicy)
    return cloneCue(authoritySummary)

  return {
    ...cloneCue(authoritySummary),
    authorityMismatchReasonSummary: appendFinalSurfacePolicy(
      authoritySummary.authorityMismatchReasonSummary,
      finalSurfacePolicy,
    ),
    authorityMismatchDisplay: appendFinalSurfacePolicy(
      authoritySummary.authorityMismatchDisplay,
      finalSurfacePolicy,
    ),
  }
}

function enrichAuthoritySummaryWithTraceEmbodimentSummary(input: {
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  recentDrivingTraceRecord: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceRecord'] | null | undefined
  recentDrivingTraceDetails: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceDetails'] | null | undefined
  driverExecutionSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverExecutionSummary'] | null | undefined
}) {
  const authoritySummary = input.authoritySummary
  if (!authoritySummary)
    return null

  const traceRecord = input.recentDrivingTraceRecord
  if (!traceRecord)
    return cloneCue(authoritySummary)

  const localTraceEmbodimentSummary = buildTraceEmbodimentSummary({
    recentDrivingTraceRecord: traceRecord,
    recentDrivingTraceDetails: input.recentDrivingTraceDetails ?? [],
  })
  const authorityExecutionSummary = buildTraceAuthorityExecutionSummary({
    turnMode: traceRecord.turnMode,
    closureState: traceRecord.closureState,
    finalSurfacePolicy: traceRecord.finalSurfacePolicy,
    matchedDrivers: authoritySummary.matchedDrivers,
    driverExecutionSummary: input.driverExecutionSummary ?? null,
    traceEmbodimentSummary: localTraceEmbodimentSummary,
  })

  return {
    ...cloneCue(authoritySummary),
    traceEmbodimentSummary: enrichTraceEmbodimentSummary({
      upstreamSummary: authoritySummary.traceEmbodimentSummary,
      localSummary: authorityExecutionSummary,
    }),
  }
}

function enrichAuthoritySummaryWithTrust(input: {
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}) {
  if (!input.authoritySummary)
    return null

  return {
    ...cloneCue(input.authoritySummary),
    prosodyAuthoritySummary: buildRendererProsodyAuthoritySummary(input.playbackTelemetry),
    authorityTrustSummary: deriveAuthorityTrustSummary(input),
  }
}

function scopeAuthoritySummaryToPlaybackCue(input: {
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}) {
  const authoritySummary = input.authoritySummary
  if (!authoritySummary)
    return null

  const playbackCueId = typeof input.playbackTelemetry?.cue?.id === 'string' && input.playbackTelemetry.cue.id.trim()
    ? input.playbackTelemetry.cue.id.trim()
    : null
  const authoritySummaryCueId = typeof authoritySummary.cueId === 'string' && authoritySummary.cueId.trim()
    ? authoritySummary.cueId.trim()
    : null
  const authoritySummaryMatchesPlaybackCue = !authoritySummaryCueId || !playbackCueId || authoritySummaryCueId === playbackCueId
  if (authoritySummaryMatchesPlaybackCue)
    return cloneCue(authoritySummary)

  return {
    ...cloneCue(authoritySummary),
    bindingSummary: null,
    matchSummary: null,
    authorityMismatchSummary: null,
    authorityMismatchReasonSummary: null,
    authorityMismatchDisplay: null,
    settleSummary: null,
  }
}

function normalizeStructuredVoiceSummary(input: {
  summary: string | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}) {
  const summary = typeof input.summary === 'string' && input.summary.trim()
    ? input.summary.trim()
    : null
  if (!summary)
    return null

  if (!summary.includes('closure=') || summary.includes('provenance='))
    return summary

  const provenance = input.playbackTelemetry?.driverAuthority ? 'authority-bound' : 'fallback-derived'
  const segmentId = (
    input.playbackTelemetry?.driverAuthority?.segmentId
    ?? input.playbackTelemetry?.drivers?.lipsync?.segmentId
    ?? input.playbackTelemetry?.drivers?.face?.segmentId
    ?? input.playbackTelemetry?.drivers?.motion?.segmentId
  )?.trim() || 'n/a'
  const source = (
    input.playbackTelemetry?.drivers?.lipsync?.visemeHints?.[0]?.source
    ?? input.playbackTelemetry?.drivers?.face?.source
    ?? input.playbackTelemetry?.drivers?.motion?.source
  )?.trim() || 'n/a'

  return `${summary} | provenance=${provenance} | segment=${segmentId} | source=${source}`
}

function buildSpeechEvidenceSummary(input: {
  articulationSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['articulationSummary'] | null | undefined
  authoritySummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary'] | null | undefined
  cueMicroSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['cueMicroSummary'] | null | undefined
  driverExecutionSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverExecutionSummary'] | null | undefined
  visemeHintsSummary: StageThreeRuntimeSpeechEmbodimentDiagnostics['visemeHintsSummary'] | null | undefined
  playbackTelemetry: RendererSpeechPlaybackTelemetry | null | undefined
}): StageThreeRuntimeSpeechEmbodimentDiagnostics['speechEvidence'] {
  const cue = input.playbackTelemetry?.cue ?? null
  const playbackCueId = typeof cue?.id === 'string' && cue.id.trim()
    ? cue.id.trim()
    : null
  const authoritySummaryCueId = typeof input.authoritySummary?.cueId === 'string' && input.authoritySummary.cueId.trim()
    ? input.authoritySummary.cueId.trim()
    : null
  const cueMicroSummaryCueId = typeof input.cueMicroSummary?.cueId === 'string' && input.cueMicroSummary.cueId.trim()
    ? input.cueMicroSummary.cueId.trim()
    : null
  const authorityMatchSummary = (!playbackCueId || !authoritySummaryCueId || authoritySummaryCueId === playbackCueId)
    ? input.authoritySummary?.matchSummary ?? null
    : null
  const cueSummary = (!playbackCueId || !cueMicroSummaryCueId || cueMicroSummaryCueId === playbackCueId)
    ? input.cueMicroSummary?.cue ?? null
    : null
  const personaStyleSummary = (!playbackCueId || !cueMicroSummaryCueId || cueMicroSummaryCueId === playbackCueId)
    ? input.cueMicroSummary?.personaStyle ?? null
    : null
  const timingSummary = (!playbackCueId || !cueMicroSummaryCueId || cueMicroSummaryCueId === playbackCueId)
    ? input.cueMicroSummary?.timing ?? null
    : null
  const cueIdentityPresent = Boolean(
    (typeof cue?.facialCue === 'string' && cue.facialCue.trim())
    || (typeof cue?.actionCue === 'string' && cue.actionCue.trim()),
  )
  const cueProsodyPresent = Number.isFinite(cue?.prosodyWeight)
    || Number.isFinite(cue?.mouthWeight)
    || Number.isFinite(cue?.headWeight)

  const hasEvidence = Boolean(
    input.articulationSummary?.voice
    || input.articulationSummary?.topVisemes
    || authorityMatchSummary
    || cueSummary
    || personaStyleSummary
    || timingSummary
    || input.driverExecutionSummary
    || input.visemeHintsSummary
    || cueIdentityPresent
    || cueProsodyPresent,
  )

  if (!hasEvidence)
    return null

  return {
    voiceSummary: normalizeStructuredVoiceSummary({
      summary: input.articulationSummary?.voice ?? null,
      playbackTelemetry: input.playbackTelemetry ?? null,
    }),
    authorityMatchSummary,
    topVisemeSummary: input.articulationSummary?.topVisemes ?? null,
    cueSummary,
    cueIdentityPresent,
    cueProsodyPresent,
    personaStyleSummary,
    timingSummary,
    driverExecutionSummary: input.driverExecutionSummary ?? null,
    visemeHintsSummary: input.visemeHintsSummary ?? null,
  }
}

function formatRendererDriftEntry(
  entry: NonNullable<StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment']['live2d']>,
) {
  const authority = entry.driverCue || entry.driverSource
    ? ` | cue ${entry.driverCue ?? 'none'}@${entry.driverSource ?? 'unknown'}`
    : ''

  if (entry.driftKind === 'alias-resolution-drift')
    return `resident ${entry.predicted ?? 'none'} -> actual ${entry.actual ?? 'none'}${authority}`

  if (entry.driftKind === 'resident-not-yet-applied')
    return `resident ${entry.predicted ?? 'none'} is waiting for renderer application`

  if (entry.driftKind === 'runtime-only-visible')
    return `runtime surfaced ${entry.actual ?? 'none'} before resident prediction${authority}`

  return null
}

function buildRendererDriftSummary(
  alignment: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment'] | null | undefined,
  upstreamSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererDriftSummary'] | null,
): StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererDriftSummary'] {
  if (upstreamSummary) {
    const normalized = cloneCue(upstreamSummary)
    if (normalized.live2d || normalized.vrm || normalized.primary)
      return normalized
  }

  const live2d = alignment?.live2d ? formatRendererDriftEntry(alignment.live2d) : null
  const vrm = alignment?.vrm ? formatRendererDriftEntry(alignment.vrm) : null

  if (!live2d && !vrm)
    return null

  return {
    live2d,
    vrm,
    primary: live2d ?? vrm ?? null,
  }
}

export function summarizeMindTurnEvent(event: AlicizationMindTurnEventRecord): string | null {
  const payload = event.payload && typeof event.payload === 'object'
    ? event.payload as Record<string, unknown>
    : null
  if (!payload)
    return null

  const summary = typeof payload.summary === 'string' && payload.summary.trim()
    ? payload.summary.trim()
    : typeof payload.message === 'string' && payload.message.trim()
      ? payload.message.trim()
      : null
  if (summary)
    return summary

  if (event.kind === 'governance-normalized') {
    const turnMode = typeof payload.turnMode === 'string' ? payload.turnMode.trim() : ''
    const truthState = typeof payload.truthState === 'string' ? payload.truthState.trim() : ''
    const repairState = typeof payload.repairState === 'string' ? payload.repairState.trim() : ''
    return [turnMode && `turn=${turnMode}`, truthState && `truth=${truthState}`, repairState && `repair=${repairState}`]
      .filter(Boolean)
      .join(' | ') || null
  }

  if (event.kind === 'person-state-updated') {
    const sourceTrail = Array.isArray(payload.sourceTrail)
      ? payload.sourceTrail.filter(item => typeof item === 'string' && item.trim()).map(item => (item as string).trim())
      : []
    return sourceTrail.length > 0 ? sourceTrail.join(', ') : null
  }

  return null
}

export function resolveRecentDrivingEventFromMindTurnEvents(
  events: AlicizationMindTurnEventRecord[],
): StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingEvent'] {
  const priority: Record<AlicizationMindTurnEventRecord['kind'], number> = {
    'presence-pulse-dispatched': 3,
    'person-state-updated': 2,
    'governance-normalized': 1,
    'recall-attribution': 0,
    'memory-deliberation-judged': 0,
    'memory-recall-withheld': 0,
    'memory-stable-core-surfaced': 0,
    'memory-followup-deferred': 0,
    'memory-wrong-thread-suppressed': 0,
    'takeover-audit': 0,
    'persistence-written': 0,
    'dialogue-emitted': 0,
    'reply-memory-coherence': 0,
    'memory-facts-upserted': 0,
    'memory-reconsolidated': 0,
    'learning-executed': 0,
  }

  const selected = [...events]
    .sort((left, right) => {
      const priorityDelta = (priority[right.kind] ?? 0) - (priority[left.kind] ?? 0)
      if (priorityDelta !== 0)
        return priorityDelta
      if (left.createdAt !== right.createdAt)
        return right.createdAt - left.createdAt
      return left.id.localeCompare(right.id)
    })
    .find((event) => {
      return (priority[event.kind] ?? 0) > 0 && Boolean(summarizeMindTurnEvent(event))
    }) ?? null

  return selected
    ? {
        kind: selected.kind,
        decisionTraceId: selected.decisionTraceId,
        summary: summarizeMindTurnEvent(selected),
        createdAt: selected.createdAt,
      }
    : null
}

export function buildRecentDrivingTraceEventsFromMindTurnEvents(
  events: AlicizationMindTurnEventRecord[],
  decisionTraceId?: string | null,
): StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceEvents'] {
  const allowedKinds = new Set<AlicizationMindTurnEventRecord['kind']>([
    'governance-normalized',
    'presence-pulse-dispatched',
    'person-state-updated',
  ])
  const normalizedDecisionTraceId = typeof decisionTraceId === 'string' && decisionTraceId.trim()
    ? decisionTraceId.trim()
    : null

  return [...events]
    .filter((event) => {
      if (!allowedKinds.has(event.kind))
        return false
      if (!normalizedDecisionTraceId)
        return true
      return event.decisionTraceId === normalizedDecisionTraceId
    })
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
    .map(event => ({
      kind: event.kind,
      summary: summarizeMindTurnEvent(event),
      createdAt: event.createdAt,
    }))
    .filter(event => Boolean(event.summary))
}

export function buildRecentDrivingTraceDetailsFromMindTurnEvents(
  events: AlicizationMindTurnEventRecord[],
  decisionTraceId?: string | null,
): StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceDetails'] {
  const normalizedDecisionTraceId = typeof decisionTraceId === 'string' && decisionTraceId.trim()
    ? decisionTraceId.trim()
    : null

  return [...events]
    .filter((event) => {
      if (!normalizedDecisionTraceId)
        return false
      return event.decisionTraceId === normalizedDecisionTraceId
    })
    .sort((left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id))
    .map((event) => {
      const payload = event.payload && typeof event.payload === 'object'
        ? event.payload as Record<string, unknown>
        : null
      const details: Array<{ label: string, value: string }> = []

      if (event.kind === 'governance-normalized') {
        if (typeof payload?.turnMode === 'string' && payload.turnMode.trim())
          details.push({ label: 'turnMode', value: payload.turnMode.trim() })
        if (typeof payload?.truthState === 'string' && payload.truthState.trim())
          details.push({ label: 'truthState', value: payload.truthState.trim() })
        if (typeof payload?.repairState === 'string' && payload.repairState.trim())
          details.push({ label: 'repairState', value: payload.repairState.trim() })
      }
      else if (event.kind === 'presence-pulse-dispatched') {
        if (typeof payload?.summary === 'string' && payload.summary.trim())
          details.push({ label: 'summary', value: payload.summary.trim() })
        if (typeof payload?.scenario === 'string' && payload.scenario.trim())
          details.push({ label: 'scenario', value: payload.scenario.trim() })
        if (typeof payload?.stance === 'string' && payload.stance.trim())
          details.push({ label: 'stance', value: payload.stance.trim() })
      }
      else if (event.kind === 'person-state-updated') {
        const sourceTrail = Array.isArray(payload?.sourceTrail)
          ? payload.sourceTrail.filter(item => typeof item === 'string' && item.trim()).map(item => (item as string).trim())
          : []
        if (sourceTrail.length > 0)
          details.push({ label: 'sourceTrail', value: sourceTrail.join(', ') })
      }

      return {
        kind: event.kind,
        summary: summarizeMindTurnEvent(event),
        createdAt: event.createdAt,
        details,
      }
    })
    .filter(event => Boolean(event.summary))
}

export function buildRecentDrivingTraceRecordSummaryFromMemoryDecisionTraces(
  traces: AlicizationMemoryDecisionTraceRecord[],
  decisionTraceId?: string | null,
): StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceRecord'] {
  const normalizedDecisionTraceId = typeof decisionTraceId === 'string' && decisionTraceId.trim()
    ? decisionTraceId.trim()
    : null
  if (!normalizedDecisionTraceId)
    return null

  const selected = traces.find(trace => trace.decisionTraceId === normalizedDecisionTraceId) ?? null
  if (!selected)
    return null

  return {
    decisionTraceId: selected.decisionTraceId,
    activeThreadId: selected.activeThreadId ?? null,
    turnMode: selected.governance?.turnMode ?? null,
    truthState: selected.governance?.truthState ?? null,
    repairState: selected.governance?.repairState ?? null,
    finalSurfacePolicy: selected.memoryResolutionLedger?.finalSurfacePolicy ?? null,
    closureState: selected.memoryResolutionLedger?.closureState ?? null,
    suppressionTags: selected.memoryResolutionLedger?.suppressionTags
      ? [...selected.memoryResolutionLedger.suppressionTags]
      : [],
  }
}

export function buildRecentDrivingEventQueryInput(
  speechDiagnostics: StageThreeRuntimeSpeechEmbodimentDiagnostics | null,
) {
  if (!speechDiagnostics?.runtimeDynamics)
    return null

  const activeThreadId = speechDiagnostics.runtimeDynamics.provenance.activeThreadId?.trim()
  const runtimeThreadId = speechDiagnostics.runtimeDynamics.eventPointers.runtimeThreadId?.trim()
  const resolvedActiveThreadId = activeThreadId || runtimeThreadId || ''
  if (!resolvedActiveThreadId)
    return null

  return {
    activeThreadId: resolvedActiveThreadId,
    limit: 12,
  } as const
}

export function mapSpeechEmbodimentDiagnosticsForRenderer(
  speech: {
    phase?: StageThreeRuntimeSpeechEmbodimentDiagnostics['phase']
    playbackPhase?: StageThreeRuntimeSpeechEmbodimentDiagnostics['playbackPhase']
    speechEnergy?: number
    prosodyIntensity?: number
    emphasisLevel?: number
    cadencePulse?: number
    visemeIntensity?: number
    articulation?: StageThreeRuntimeSpeechEmbodimentDiagnostics['articulation']
    runtimeDynamics?: StageThreeRuntimeSpeechEmbodimentDiagnostics['runtimeDynamics']
    recentDrivingEvent?: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingEvent']
    recentDrivingTraceRecord?: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceRecord']
    recentDrivingTraceEvents?: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceEvents']
    recentDrivingTraceDetails?: StageThreeRuntimeSpeechEmbodimentDiagnostics['recentDrivingTraceDetails']
    traceSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['traceSummary']
    rendererAlignment?: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererAlignment']
    rendererDriftSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['rendererDriftSummary']
    articulationSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['articulationSummary']
    authoritySummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['authoritySummary']
    cueMicroSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['cueMicroSummary']
    driverSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverSummary']
    driverExecutionSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['driverExecutionSummary']
    live2dExecution?: StageThreeRuntimeSpeechEmbodimentDiagnostics['live2dExecution']
    visemeHintsSummary?: StageThreeRuntimeSpeechEmbodimentDiagnostics['visemeHintsSummary']
    playbackTelemetry?: {
      actualDurationMs?: number | null
      plannedDurationMs?: number | null
      driftMs?: number | null
      settleMs?: number | null
      stopReason?: string | null
      rendererTarget?: 'live2d' | 'vrm' | null
      driverAuthority?: {
        segmentId?: string | null
        rendererTarget?: 'live2d' | 'vrm' | null
        matchedDrivers?: Array<'face' | 'motion' | 'lipsync'>
        sources?: string[]
        faceSegmentMatched?: boolean
        motionSegmentMatched?: boolean
        lipsyncSegmentMatched?: boolean
      } | null
      cue?: {
        id?: string | null
        text?: string | null
        prosodyWeight?: number | null
        mouthWeight?: number | null
        headWeight?: number | null
        personaStyleSummary?: string | null
        facialHoldMs?: number | null
        actionHoldMs?: number | null
        emotionHoldMs?: number | null
        facialCue?: string | null
        actionCue?: string | null
        actionWindow?: string | null
        interruptMode?: string | null
        settleMode?: string | null
        rendererHints?: {
          preferredExpressionAliases?: string[]
          preferredMotionAliases?: string[]
        } | null
        rendererSettle?: {
          live2dFacialReleaseMs?: number | null
          live2dMotionFollowThroughMs?: number | null
          vrmActionFadeMs?: number | null
          vrmExpressionBlendMs?: number | null
        } | null
      } | null
      drivers?: RendererSpeechPlaybackTelemetry['drivers']
    } | null
  } | null | undefined,
): StageThreeRuntimeSpeechEmbodimentDiagnostics {
  if (!speech) {
    return {
      phase: 'idle',
      playbackPhase: 'idle',
      speechEnergy: 0,
      prosodyIntensity: 0,
      emphasisLevel: 0,
      cadencePulse: 0,
      visemeIntensity: 0,
      articulation: null,
      runtimeDynamics: null,
      recentDrivingEvent: null,
      recentDrivingTraceRecord: null,
      recentDrivingTraceEvents: [],
      recentDrivingTraceDetails: [],
      traceSummary: null,
      rendererAlignment: {
        live2d: null,
        vrm: null,
      },
      rendererDriftSummary: null,
      articulationSummary: null,
      authoritySummary: null,
      cueMicroSummary: null,
      driverSummary: null,
      driverExecutionSummary: null,
      live2dExecution: null,
      visemeHintsSummary: null,
      playbackTelemetry: null,
    }
  }

  return {
    phase: speech.phase ?? 'idle',
    playbackPhase: speech.playbackPhase ?? 'idle',
    speechEnergy: speech.speechEnergy ?? 0,
    prosodyIntensity: speech.prosodyIntensity ?? 0,
    emphasisLevel: speech.emphasisLevel ?? 0,
    cadencePulse: speech.cadencePulse ?? 0,
    visemeIntensity: speech.visemeIntensity ?? 0,
    articulation: speech.articulation ? cloneCue(speech.articulation) : null,
    runtimeDynamics: speech.runtimeDynamics ? cloneCue(speech.runtimeDynamics) : null,
    recentDrivingEvent: speech.recentDrivingEvent ? cloneCue(speech.recentDrivingEvent) : null,
    recentDrivingTraceRecord: speech.recentDrivingTraceRecord ? cloneCue(speech.recentDrivingTraceRecord) : null,
    recentDrivingTraceEvents: speech.recentDrivingTraceEvents
      ? speech.recentDrivingTraceEvents.map(event => cloneCue(event))
      : [],
    recentDrivingTraceDetails: speech.recentDrivingTraceDetails
      ? speech.recentDrivingTraceDetails.map(event => cloneCue(event))
      : [],
    traceSummary: speech.traceSummary
      ? cloneCue(speech.traceSummary)
      : buildTraceTelemetrySummary({
          cueId: speech.playbackTelemetry?.cue?.id
            ?? speech.authoritySummary?.cueId
            ?? null,
          traceContext: {
            recentDrivingEvent: speech.recentDrivingEvent ?? null,
            recentDrivingTraceRecord: speech.recentDrivingTraceRecord ?? null,
            recentDrivingTraceEvents: speech.recentDrivingTraceEvents ?? [],
            driverSummary: speech.driverSummary ?? null,
            playbackTelemetry: speech.playbackTelemetry ?? null,
          },
        }),
    rendererAlignment: speech.rendererAlignment
      ? cloneCue(speech.rendererAlignment)
      : {
          live2d: null,
          vrm: null,
        },
    rendererDriftSummary: buildRendererDriftSummary(
      speech.rendererAlignment ?? null,
      speech.rendererDriftSummary ?? null,
    ),
    articulationSummary: speech.articulationSummary ? cloneCue(speech.articulationSummary) : null,
    authoritySummary: enrichAuthoritySummaryWithTraceEmbodimentSummary({
      authoritySummary: enrichAuthoritySummaryWithTrust({
        authoritySummary: scopeAuthoritySummaryToPlaybackCue({
          authoritySummary: enrichAuthoritySummaryWithTracePolicy(
            speech.authoritySummary ?? null,
            speech.recentDrivingTraceRecord ?? null,
          ),
          playbackTelemetry: speech.playbackTelemetry ?? null,
        }),
        playbackTelemetry: speech.playbackTelemetry ?? null,
      }),
      recentDrivingTraceRecord: speech.recentDrivingTraceRecord ?? null,
      recentDrivingTraceDetails: speech.recentDrivingTraceDetails ?? [],
      driverExecutionSummary: speech.driverExecutionSummary ?? null,
    }),
    speechEvidence: buildSpeechEvidenceSummary({
      articulationSummary: speech.articulationSummary ?? null,
      authoritySummary: speech.authoritySummary ?? null,
      cueMicroSummary: speech.cueMicroSummary ?? null,
      driverExecutionSummary: speech.driverExecutionSummary ?? null,
      visemeHintsSummary: speech.visemeHintsSummary ?? null,
      playbackTelemetry: speech.playbackTelemetry ?? null,
    }),
    cueMicroSummary: speech.cueMicroSummary ? cloneCue(speech.cueMicroSummary) : null,
    driverSummary: speech.driverSummary ? cloneCue(speech.driverSummary) : null,
    driverExecutionSummary: speech.driverExecutionSummary ?? null,
    live2dExecution: speech.live2dExecution ? cloneCue(speech.live2dExecution) : null,
    visemeHintsSummary: speech.visemeHintsSummary ?? null,
    playbackTelemetry: speech.playbackTelemetry
      ? {
          actualDurationMs: speech.playbackTelemetry.actualDurationMs ?? null,
          plannedDurationMs: speech.playbackTelemetry.plannedDurationMs ?? null,
          driftMs: speech.playbackTelemetry.driftMs ?? null,
          settleMs: speech.playbackTelemetry.settleMs ?? null,
          stopReason: speech.playbackTelemetry.stopReason ?? null,
          rendererTarget: speech.playbackTelemetry.rendererTarget ?? null,
          driverAuthority: speech.playbackTelemetry.driverAuthority
            ? {
                segmentId: speech.playbackTelemetry.driverAuthority.segmentId ?? null,
                rendererTarget: speech.playbackTelemetry.driverAuthority.rendererTarget ?? null,
                matchedDrivers: speech.playbackTelemetry.driverAuthority.matchedDrivers
                  ? [...speech.playbackTelemetry.driverAuthority.matchedDrivers]
                  : [],
                sources: speech.playbackTelemetry.driverAuthority.sources
                  ? [...speech.playbackTelemetry.driverAuthority.sources]
                  : [],
                faceSegmentMatched: speech.playbackTelemetry.driverAuthority.faceSegmentMatched ?? false,
                motionSegmentMatched: speech.playbackTelemetry.driverAuthority.motionSegmentMatched ?? false,
                lipsyncSegmentMatched: speech.playbackTelemetry.driverAuthority.lipsyncSegmentMatched ?? false,
                prosodyAuthority: speech.playbackTelemetry.driverAuthority.prosodyAuthority
                  ? {
                      segmentId: speech.playbackTelemetry.driverAuthority.prosodyAuthority.segmentId ?? null,
                      provenance: speech.playbackTelemetry.driverAuthority.prosodyAuthority.provenance,
                      source: speech.playbackTelemetry.driverAuthority.prosodyAuthority.source ?? null,
                      mode: speech.playbackTelemetry.driverAuthority.prosodyAuthority.mode ?? null,
                      cueProsodyWeight: speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueProsodyWeight ?? null,
                      cueMouthWeight: speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueMouthWeight ?? null,
                      cueHeadWeight: speech.playbackTelemetry.driverAuthority.prosodyAuthority.cueHeadWeight ?? null,
                      visemePeakWeight: speech.playbackTelemetry.driverAuthority.prosodyAuthority.visemePeakWeight ?? null,
                    }
                  : null,
              }
            : null,
          cue: speech.playbackTelemetry.cue
            ? {
                id: speech.playbackTelemetry.cue.id ?? null,
                text: speech.playbackTelemetry.cue.text ?? null,
                prosodyWeight: speech.playbackTelemetry.cue.prosodyWeight ?? null,
                mouthWeight: speech.playbackTelemetry.cue.mouthWeight ?? null,
                headWeight: speech.playbackTelemetry.cue.headWeight ?? null,
                personaStyleSummary: speech.playbackTelemetry.cue.personaStyleSummary ?? null,
                facialHoldMs: speech.playbackTelemetry.cue.facialHoldMs ?? null,
                actionHoldMs: speech.playbackTelemetry.cue.actionHoldMs ?? null,
                emotionHoldMs: speech.playbackTelemetry.cue.emotionHoldMs ?? null,
                facialCue: speech.playbackTelemetry.cue.facialCue ?? null,
                actionCue: speech.playbackTelemetry.cue.actionCue ?? null,
                actionWindow: speech.playbackTelemetry.cue.actionWindow ?? null,
                interruptMode: speech.playbackTelemetry.cue.interruptMode ?? null,
                settleMode: speech.playbackTelemetry.cue.settleMode ?? null,
                rendererHints: speech.playbackTelemetry.cue.rendererHints
                  ? {
                      preferredExpressionAliases: speech.playbackTelemetry.cue.rendererHints.preferredExpressionAliases
                        ? [...speech.playbackTelemetry.cue.rendererHints.preferredExpressionAliases]
                        : undefined,
                      preferredMotionAliases: speech.playbackTelemetry.cue.rendererHints.preferredMotionAliases
                        ? [...speech.playbackTelemetry.cue.rendererHints.preferredMotionAliases]
                        : undefined,
                    }
                  : null,
                rendererSettle: speech.playbackTelemetry.cue.rendererSettle
                  ? {
                      live2dFacialReleaseMs: speech.playbackTelemetry.cue.rendererSettle.live2dFacialReleaseMs ?? null,
                      live2dMotionFollowThroughMs: speech.playbackTelemetry.cue.rendererSettle.live2dMotionFollowThroughMs ?? null,
                      vrmActionFadeMs: speech.playbackTelemetry.cue.rendererSettle.vrmActionFadeMs ?? null,
                      vrmExpressionBlendMs: speech.playbackTelemetry.cue.rendererSettle.vrmExpressionBlendMs ?? null,
                    }
                  : null,
              }
            : null,
          drivers: speech.playbackTelemetry.drivers
            ? {
                face: speech.playbackTelemetry.drivers.face
                  ? {
                      emotion: speech.playbackTelemetry.drivers.face.emotion ?? null,
                      facialCue: speech.playbackTelemetry.drivers.face.facialCue ?? null,
                      intensity: speech.playbackTelemetry.drivers.face.intensity ?? null,
                      holdMs: speech.playbackTelemetry.drivers.face.holdMs ?? null,
                      source: speech.playbackTelemetry.drivers.face.source ?? null,
                      confidence: speech.playbackTelemetry.drivers.face.confidence ?? null,
                      preUtteranceCue: speech.playbackTelemetry.drivers.face.preUtteranceCue ?? null,
                      postUtteranceCue: speech.playbackTelemetry.drivers.face.postUtteranceCue ?? null,
                      segmentId: speech.playbackTelemetry.drivers.face.segmentId ?? null,
                    }
                  : null,
                lipsync: speech.playbackTelemetry.drivers.lipsync
                  ? {
                      mode: speech.playbackTelemetry.drivers.lipsync.mode ?? null,
                      playbackPhase: speech.playbackTelemetry.drivers.lipsync.playbackPhase ?? null,
                      segmentId: speech.playbackTelemetry.drivers.lipsync.segmentId ?? null,
                      visemeHints: cloneVisemeHints(speech.playbackTelemetry.drivers.lipsync.visemeHints),
                    }
                  : null,
                motion: speech.playbackTelemetry.drivers.motion
                  ? {
                      idleBase: speech.playbackTelemetry.drivers.motion.idleBase ?? null,
                      attentionMode: speech.playbackTelemetry.drivers.motion.attentionMode ?? null,
                      actionCue: speech.playbackTelemetry.drivers.motion.actionCue ?? null,
                      intensity: speech.playbackTelemetry.drivers.motion.intensity ?? null,
                      holdMs: speech.playbackTelemetry.drivers.motion.holdMs ?? null,
                      source: speech.playbackTelemetry.drivers.motion.source ?? null,
                      confidence: speech.playbackTelemetry.drivers.motion.confidence ?? null,
                      segmentId: speech.playbackTelemetry.drivers.motion.segmentId ?? null,
                    }
                  : null,
              }
            : null,
        }
      : null,
  }
}
