import {
  formatSelfEvolutionDisplayText,
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionFocusCardLabel,
  formatSelfEvolutionTraceEventLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

type SelfEvolutionBodyContinuityPhase
  = | 'body-only-hold'
    | 'body-carried-to-renderer-rejoin'
    | 'full-cross-modal-lock'
    | 'renderer-rejoin-without-body'
    | null

type SelfEvolutionRendererRejoinSurfaceKey
  = | 'authority:renderer-rejoin:speech'
    | 'authority:renderer-rejoin:live2d'
    | 'authority:renderer-rejoin:vrm'
    | null

type SelfEvolutionSurvivingVisibleLane
  = | 'face+lipsync-only'
    | 'motion+lipsync-only'
    | 'face+lipsync+voice-only'
    | 'motion+lipsync+voice-only'
    | null

interface SelfEvolutionFocusSnapshotRecord {
  version: string
  candidateId: string | null
  decisionTraceId: string | null
  activeThreadId: string | null
  selectedCardId: 'repair-owner' | 'first-check' | 'repair-path'
  explanation: string | null
  bodyContinuityPhase?: SelfEvolutionBodyContinuityPhase
  rendererRejoinSurfaceKey?: SelfEvolutionRendererRejoinSurfaceKey
  survivingVisibleLane?: SelfEvolutionSurvivingVisibleLane
  highlightedEvidencePanelIds: string[]
  highlightedTraceSectionIds: string[]
  recommendedTraceEventId: string | null
  capturedAt: number
}

function diffGained(current: string[], previous: string[]) {
  return current.filter(value => !previous.includes(value))
}

function diffLost(current: string[], previous: string[]) {
  return previous.filter(value => !current.includes(value))
}

function sortValues(values: string[]) {
  return [...values].sort((left, right) => left.localeCompare(right))
}

function hashPatternIdentity(value: string, seed: number) {
  let hash = seed >>> 0

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

function buildOpaquePatternKey(patternIdentity: string) {
  return `pattern:${hashPatternIdentity(patternIdentity, 0x811C9DC5)}${hashPatternIdentity(patternIdentity, 0x9E3779B9)}`
}

function formatSignedList(
  values: string[],
  formatter: (value: string) => string,
) {
  return values.map((value) => {
    const prefix = value.startsWith('+') || value.startsWith('-') ? value[0] : ''
    const payload = prefix ? value.slice(1) : value
    return `${prefix}${formatter(payload)}`
  }).join(' ')
}

function formatRendererRejoinSurfaceLabel(
  surfaceKey: SelfEvolutionRendererRejoinSurfaceKey,
) {
  if (surfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D 显形权威补回'
  if (surfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM 显形权威补回'
  if (surfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech 显形权威补回'
  return '显形权威补回'
}

function formatRendererRejoinSurfaceName(
  surfaceKey: SelfEvolutionRendererRejoinSurfaceKey,
) {
  if (surfaceKey === 'authority:renderer-rejoin:live2d')
    return 'Live2D'
  if (surfaceKey === 'authority:renderer-rejoin:vrm')
    return 'VRM'
  if (surfaceKey === 'authority:renderer-rejoin:speech')
    return 'speech'
  return null
}

function resolveBodyContinuityPhase(params: {
  currentBodyContinuityPhase: SelfEvolutionBodyContinuityPhase
  previousBodyContinuityPhase: SelfEvolutionBodyContinuityPhase
}) {
  return params.currentBodyContinuityPhase
    ?? params.previousBodyContinuityPhase
}

function resolveSurvivingVisibleLane(params: {
  currentSurvivingVisibleLane: SelfEvolutionSurvivingVisibleLane
  previousSurvivingVisibleLane: SelfEvolutionSurvivingVisibleLane
}) {
  return params.currentSurvivingVisibleLane
    ?? params.previousSurvivingVisibleLane
}

function formatSurvivingVisibleLaneSummary(
  survivingVisibleLane: SelfEvolutionSurvivingVisibleLane,
) {
  if (survivingVisibleLane === 'face+lipsync+voice-only')
    return '当前仅剩表情、口型、声音维持同一段连续性'
  if (survivingVisibleLane === 'motion+lipsync+voice-only')
    return '当前仅剩动作、口型、声音维持同一段连续性'
  if (survivingVisibleLane === 'face+lipsync-only')
    return '当前只有 face 和 lipsync 这条连续性线'
  if (survivingVisibleLane === 'motion+lipsync-only')
    return '当前只有 motion 和 lipsync 这条连续性线'
  return null
}

function formatBodyContinuityPatternLabel(params: {
  bodyContinuityPhase: SelfEvolutionBodyContinuityPhase
  rendererRejoinSurfaceKey: SelfEvolutionRendererRejoinSurfaceKey
  survivingVisibleLane: SelfEvolutionSurvivingVisibleLane
}) {
  const rendererRejoinSurface = formatRendererRejoinSurfaceName(params.rendererRejoinSurfaceKey)

  if (params.bodyContinuityPhase === 'body-carried-to-renderer-rejoin') {
    return rendererRejoinSurface
      ? `身体承接态 -> ${rendererRejoinSurface} 显形补回态`
      : formatSelfEvolutionDisplayText('body-carried-to-renderer-rejoin')
  }

  if (params.bodyContinuityPhase === 'full-cross-modal-lock') {
    return rendererRejoinSurface
      ? `跨模态重锁态（${rendererRejoinSurface}）`
      : formatSelfEvolutionDisplayText('full-cross-modal-lock')
  }

  if (params.bodyContinuityPhase === 'renderer-rejoin-without-body') {
    const survivingVisibleLaneSummary = formatSurvivingVisibleLaneSummary(params.survivingVisibleLane)
    if (survivingVisibleLaneSummary)
      return survivingVisibleLaneSummary

    return rendererRejoinSurface
      ? `显形回接失身态（${rendererRejoinSurface}）`
      : formatSelfEvolutionDisplayText('renderer-rejoin-without-body')
  }

  if (params.bodyContinuityPhase === 'body-only-hold')
    return formatSelfEvolutionDisplayText('body-only-hold')

  return params.rendererRejoinSurfaceKey
    ? `身体连续性承接 -> ${formatRendererRejoinSurfaceLabel(params.rendererRejoinSurfaceKey)}`
    : '身体连续性承接 -> 显形权威补回'
}

function isBodyContinuityPattern(params: {
  previousBodyContinuityPhase: SelfEvolutionBodyContinuityPhase
  currentBodyContinuityPhase: SelfEvolutionBodyContinuityPhase
  previousRecommendedTraceEventId: string | null
  currentRecommendedTraceEventId: string | null
  previousEvidenceIds: string[]
  currentEvidenceIds: string[]
  previousTraceSectionIds: string[]
  currentTraceSectionIds: string[]
}) {
  if (resolveBodyContinuityPhase(params)) {
    return true
  }

  const previousEvidence = new Set(params.previousEvidenceIds)
  const currentEvidence = new Set(params.currentEvidenceIds)
  const previousTraceSections = new Set(params.previousTraceSectionIds)
  const currentTraceSections = new Set(params.currentTraceSectionIds)
  const traceEventPair = new Set([
    params.previousRecommendedTraceEventId,
    params.currentRecommendedTraceEventId,
  ])

  return (
    previousEvidence.has('runtime-continuity-projection')
    && currentEvidence.has('runtime-continuity-projection')
    && (
      previousEvidence.has('renderer-authority-projection')
      || currentEvidence.has('renderer-authority-projection')
    )
    && (
      previousTraceSections.has('trace-timeline')
      || currentTraceSections.has('trace-timeline')
    )
    && (
      previousTraceSections.has('selected-trace-event')
      || currentTraceSections.has('selected-trace-event')
    )
    && traceEventPair.has('event-person-state')
    && traceEventPair.has('event-takeover')
  )
}

export function buildSelfEvolutionFocusHistoryPatterns(
  history: SelfEvolutionFocusSnapshotRecord[],
) {
  if (history.length < 2)
    return []

  const sortedHistory = [...history]
    .sort((left, right) => right.capturedAt - left.capturedAt)

  const patternMap = new Map<string, {
    patternKey: string
    bodyContinuityPattern: boolean
    bodyContinuityPhase: SelfEvolutionBodyContinuityPhase
    rendererRejoinSurfaceKey: SelfEvolutionRendererRejoinSurfaceKey
    survivingVisibleLane: SelfEvolutionSurvivingVisibleLane
    occurrenceCount: number
    summaryLine: string
    focusCardTransition: string
    traceEventTransition: string
    evidenceGained: string[]
    evidenceLost: string[]
    traceTargetsGained: string[]
    traceTargetsLost: string[]
    occurrences: Array<{
      currentCapturedAt: number
      previousCapturedAt: number
    }>
  }>()

  for (let index = 0; index < sortedHistory.length - 1; index += 1) {
    const current = sortedHistory[index]!
    const previous = sortedHistory[index + 1]!

    const evidenceGained = sortValues(diffGained(current.highlightedEvidencePanelIds, previous.highlightedEvidencePanelIds))
    const evidenceLost = sortValues(diffLost(current.highlightedEvidencePanelIds, previous.highlightedEvidencePanelIds))
    const traceTargetsGained = sortValues(diffGained(current.highlightedTraceSectionIds, previous.highlightedTraceSectionIds))
    const traceTargetsLost = sortValues(diffLost(current.highlightedTraceSectionIds, previous.highlightedTraceSectionIds))
    const focusCardTransition = `${previous.selectedCardId} -> ${current.selectedCardId}`
    const traceEventTransition = `${previous.recommendedTraceEventId ?? 'n/a'} -> ${current.recommendedTraceEventId ?? 'n/a'}`
    const bodyContinuityPhase = resolveBodyContinuityPhase({
      currentBodyContinuityPhase: current.bodyContinuityPhase ?? null,
      previousBodyContinuityPhase: previous.bodyContinuityPhase ?? null,
    })
    const survivingVisibleLane = resolveSurvivingVisibleLane({
      currentSurvivingVisibleLane: current.survivingVisibleLane ?? null,
      previousSurvivingVisibleLane: previous.survivingVisibleLane ?? null,
    })
    const rendererRejoinSurfaceKey = current.rendererRejoinSurfaceKey ?? previous.rendererRejoinSurfaceKey ?? null
    const bodyContinuityPattern = isBodyContinuityPattern({
      previousBodyContinuityPhase: previous.bodyContinuityPhase ?? null,
      currentBodyContinuityPhase: current.bodyContinuityPhase ?? null,
      previousRecommendedTraceEventId: previous.recommendedTraceEventId,
      currentRecommendedTraceEventId: current.recommendedTraceEventId,
      previousEvidenceIds: previous.highlightedEvidencePanelIds,
      currentEvidenceIds: current.highlightedEvidencePanelIds,
      previousTraceSectionIds: previous.highlightedTraceSectionIds,
      currentTraceSectionIds: current.highlightedTraceSectionIds,
    })

    const patternIdentity = [
      bodyContinuityPattern ? 'signature:body-continuity' : null,
      bodyContinuityPattern ? `phase:${bodyContinuityPhase ?? 'derived'}` : null,
      bodyContinuityPattern ? `surface:${rendererRejoinSurfaceKey ?? 'unknown'}` : null,
      bodyContinuityPattern && survivingVisibleLane ? `lane:${survivingVisibleLane}` : null,
      `focus:${focusCardTransition.replaceAll(' ', '')}`,
      `event:${traceEventTransition.replaceAll(' ', '')}`,
      `evidence:${evidenceGained.length > 0 || evidenceLost.length > 0
        ? [...evidenceGained.map(value => `+${value}`), ...evidenceLost.map(value => `-${value}`)].join(',')
        : 'none'}`,
      `trace:${traceTargetsGained.length > 0 || traceTargetsLost.length > 0
        ? [...traceTargetsGained.map(value => `+${value}`), ...traceTargetsLost.map(value => `-${value}`)].join(',')
        : 'none'}`,
    ].filter(Boolean).join('|')
    const patternKey = buildOpaquePatternKey(patternIdentity)

    const summaryParts = [
      bodyContinuityPattern
        ? formatBodyContinuityPatternLabel({
            bodyContinuityPhase,
            rendererRejoinSurfaceKey,
            survivingVisibleLane,
          })
        : null,
      `${formatSelfEvolutionFocusCardLabel(previous.selectedCardId)} -> ${formatSelfEvolutionFocusCardLabel(current.selectedCardId)}`,
      traceEventTransition !== 'n/a -> n/a'
        ? `${formatSelfEvolutionTraceEventLabel(previous.recommendedTraceEventId ?? 'n/a')} -> ${formatSelfEvolutionTraceEventLabel(current.recommendedTraceEventId ?? 'n/a')}`
        : null,
      evidenceGained.length > 0 || evidenceLost.length > 0
        ? formatSignedList([
            ...evidenceGained.map(value => `+${value}`),
            ...evidenceLost.map(value => `-${value}`),
          ], formatSelfEvolutionEvidencePanelLabel)
        : null,
      traceTargetsGained.length > 0 || traceTargetsLost.length > 0
        ? formatSignedList([
            ...traceTargetsGained.map(value => `+${value}`),
            ...traceTargetsLost.map(value => `-${value}`),
          ], formatSelfEvolutionTraceSectionLabel)
        : null,
    ].filter(Boolean) as string[]

    const existing = patternMap.get(patternIdentity)
    if (existing) {
      existing.occurrenceCount += 1
      existing.summaryLine = `${existing.occurrenceCount}次 ${summaryParts.join(' | ')}`
      existing.occurrences.push({
        currentCapturedAt: current.capturedAt,
        previousCapturedAt: previous.capturedAt,
      })
      continue
    }

    patternMap.set(patternIdentity, {
      patternKey,
      bodyContinuityPattern,
      bodyContinuityPhase,
      rendererRejoinSurfaceKey,
      survivingVisibleLane,
      occurrenceCount: 1,
      summaryLine: `1次 ${summaryParts.join(' | ')}`,
      focusCardTransition,
      traceEventTransition,
      evidenceGained,
      evidenceLost,
      traceTargetsGained,
      traceTargetsLost,
      occurrences: [{
        currentCapturedAt: current.capturedAt,
        previousCapturedAt: previous.capturedAt,
      }],
    })
  }

  return [...patternMap.values()]
    .sort((left, right) => right.occurrenceCount - left.occurrenceCount || left.patternKey.localeCompare(right.patternKey))
}
