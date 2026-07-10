import type { PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry } from './performance-visualizer-self-evolution-diagnostic-summary'

import { buildSelfEvolutionDiagnosticSummaryLines } from './performance-visualizer-self-evolution-diagnostic-summary'

export interface PerformanceVisualizerSelfEvolutionTriageCard {
  id: 'repair-owner' | 'first-check' | 'repair-path'
  label: string
  layer: string | null
  detail: string
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  rendererRejoinSurfaceKey?: 'authority:renderer-rejoin:speech' | 'authority:renderer-rejoin:live2d' | 'authority:renderer-rejoin:vrm' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
}

export interface PerformanceVisualizerSelfEvolutionTriageView {
  overviewLines: string[]
  triageCards: PerformanceVisualizerSelfEvolutionTriageCard[]
}

type PerformanceVisualizerSelfEvolutionTriageSummaryEntry
  = PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry & {
    key: PerformanceVisualizerSelfEvolutionTriageCard['id']
  }

function isSelfEvolutionTriageSummaryEntry(
  entry: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry,
): entry is PerformanceVisualizerSelfEvolutionTriageSummaryEntry {
  return entry.key === 'repair-owner'
    || entry.key === 'first-check'
    || entry.key === 'repair-path'
}

function splitLayerDetail(value: string) {
  const separatorIndex = value.indexOf(' | ')
  if (separatorIndex < 0) {
    return {
      layer: null,
      detail: value,
    }
  }

  return {
    layer: value.slice(0, separatorIndex).trim() || null,
    detail: value.slice(separatorIndex + 3).trim(),
  }
}

function resolveSurvivingVisibleLane(detail: string) {
  if (
    detail.includes('lane=face+lipsync+voice-only')
    || detail.includes('当前仅剩表情、口型、声音维持同一段连续性')
  ) {
    return 'face+lipsync+voice-only' as const
  }

  if (
    detail.includes('lane=motion+lipsync+voice-only')
    || detail.includes('当前仅剩动作、口型、声音维持同一段连续性')
  ) {
    return 'motion+lipsync+voice-only' as const
  }

  if (
    detail.includes('lane=face+lipsync-only')
    || detail.includes('当前只有 face 和 lipsync 这条 identity-continuity 生命线')
  ) {
    return 'face+lipsync-only' as const
  }

  if (
    detail.includes('lane=motion+lipsync-only')
    || detail.includes('当前只有 motion 和 lipsync 这条 identity-continuity 生命线')
  ) {
    return 'motion+lipsync-only' as const
  }

  return null
}

function resolveRendererRejoinSurfaceKey(detail: string) {
  if (resolveSurvivingVisibleLane(detail))
    return null
  if (detail.includes('VRM') || detail.includes('vrm'))
    return 'authority:renderer-rejoin:vrm' as const
  if (detail.includes('Live2D') || detail.includes('live2d'))
    return 'authority:renderer-rejoin:live2d' as const
  if (
    detail.includes('speech')
    || detail.includes('口型')
    || detail.includes('声音')
  ) {
    return 'authority:renderer-rejoin:speech' as const
  }
  return null
}

function resolveRendererRejoinSurfaceToken(detail: string) {
  if (resolveSurvivingVisibleLane(detail))
    return null
  if (detail.includes('VRM') || detail.includes('vrm'))
    return 'vrm'
  if (detail.includes('Live2D') || detail.includes('live2d'))
    return 'live2d'
  if (
    detail.includes('speech')
    || detail.includes('口型')
    || detail.includes('声音')
  ) {
    return 'speech'
  }
  return null
}

function inferBodyContinuityPhase(detail: string) {
  if (resolveSurvivingVisibleLane(detail))
    return 'renderer-rejoin-without-body' as const

  if (
    detail.includes('显形回接失身态')
    || (detail.includes('显形权威已经回接') && detail.includes('身体线没有继续托住同一段 living segment'))
  ) {
    return 'renderer-rejoin-without-body' as const
  }

  if (
    detail.includes('跨模态重锁态')
    || detail.includes('共同锁回同一段 living segment')
  ) {
    return 'full-cross-modal-lock' as const
  }

  if (
    detail.includes('身体独撑态')
    || detail.includes('独自托住同一段 living segment')
  ) {
    return 'body-only-hold' as const
  }

  if (
    detail.includes('authority-body:yes')
    || detail.includes('身体线已经先把这段 living segment 托住')
    || detail.includes('同一条连续身体线')
  ) {
    return 'body-carried-to-renderer-rejoin' as const
  }

  return null
}

function resolveBodyContinuityFirstCheck(params: {
  bodyContinuityPhase: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body'
  rendererSurfaceToken: 'live2d' | 'vrm' | 'speech' | null
  survivingVisibleLane: PerformanceVisualizerSelfEvolutionTriageCard['survivingVisibleLane']
}) {
  if (params.bodyContinuityPhase === 'body-only-hold')
    return 'body-only hold -> renderer recovery gap -> playback cue binding'

  if (params.bodyContinuityPhase === 'full-cross-modal-lock') {
    return params.rendererSurfaceToken
      ? `body and ${params.rendererSurfaceToken} same-segment lock -> playback cue binding -> lock stability audit`
      : 'body and renderer same-segment lock -> playback cue binding -> lock stability audit'
  }

  if (params.bodyContinuityPhase === 'renderer-rejoin-without-body') {
    if (params.survivingVisibleLane === 'face+lipsync+voice-only')
      return 'quieter face+lipsync+voice identity-continuity line still visible -> body motion pending rejoin -> body-loss audit'
    if (params.survivingVisibleLane === 'motion+lipsync+voice-only')
      return 'quieter motion+lipsync+voice identity-continuity line still visible -> body face pending rejoin -> body-loss audit'
    if (params.survivingVisibleLane === 'face+lipsync-only')
      return 'quieter face+lipsync identity-continuity line still visible -> body motion voice pending rejoin -> body-loss audit'
    if (params.survivingVisibleLane === 'motion+lipsync-only')
      return 'quieter motion+lipsync identity-continuity line still visible -> body face voice pending rejoin -> body-loss audit'
    return params.rendererSurfaceToken
      ? `${params.rendererSurfaceToken} renderer rejoin without body carry -> playback cue binding -> body-loss audit`
      : 'renderer rejoin without body carry -> playback cue binding -> body-loss audit'
  }

  return 'body authority carry -> renderer rejoin -> playback cue binding'
}

function resolveBodyContinuityRepairPath(params: {
  bodyContinuityPhase: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body'
  rendererSurfaceToken: 'live2d' | 'vrm' | 'speech' | null
  survivingVisibleLane: PerformanceVisualizerSelfEvolutionTriageCard['survivingVisibleLane']
}) {
  if (params.bodyContinuityPhase === 'body-only-hold')
    return 'continuity governance body-only-hold -> body authority carry -> renderer recovery gap -> cue bridge recovery'

  if (params.bodyContinuityPhase === 'full-cross-modal-lock') {
    return params.rendererSurfaceToken
      ? `continuity governance full-cross-modal-lock -> body-and-${params.rendererSurfaceToken}-same-segment-lock -> cue bridge stability`
      : 'continuity governance full-cross-modal-lock -> body-and-renderer-same-segment-lock -> cue bridge stability'
  }

  if (params.bodyContinuityPhase === 'renderer-rejoin-without-body') {
    if (params.survivingVisibleLane === 'face+lipsync+voice-only')
      return 'continuity governance quieter-face-lipsync-voice-identity-continuity-line -> body motion pending rejoin -> cue bridge body-loss audit'
    if (params.survivingVisibleLane === 'motion+lipsync+voice-only')
      return 'continuity governance quieter-motion-lipsync-voice-identity-continuity-line -> body face pending rejoin -> cue bridge body-loss audit'
    if (params.survivingVisibleLane === 'face+lipsync-only')
      return 'continuity governance quieter-face-lipsync-identity-continuity-line -> body motion voice pending rejoin -> cue bridge body-loss audit'
    if (params.survivingVisibleLane === 'motion+lipsync-only')
      return 'continuity governance quieter-motion-lipsync-identity-continuity-line -> body face voice pending rejoin -> cue bridge body-loss audit'
    return params.rendererSurfaceToken
      ? `continuity governance renderer-rejoin-without-body -> ${params.rendererSurfaceToken} rejoin without body carry -> cue bridge body-loss audit`
      : 'continuity governance renderer-rejoin-without-body -> renderer rejoin without body carry -> cue bridge body-loss audit'
  }

  if (params.rendererSurfaceToken === 'vrm')
    return 'continuity governance renderer rejoin -> body-led-same-segment-carry -> VRM authority recovery -> cue bridge recovery'
  if (params.rendererSurfaceToken === 'live2d')
    return 'continuity governance renderer rejoin -> body-led-same-segment-carry -> Live2D authority recovery -> cue bridge recovery'
  if (params.rendererSurfaceToken === 'speech')
    return 'continuity governance renderer rejoin -> body-led-same-segment-carry -> speech authority recovery -> cue bridge recovery'
  return 'continuity governance renderer rejoin -> body-led-same-segment-carry -> authority recovery -> cue bridge recovery'
}

export function buildSelfEvolutionTriageView(
  entries: PerformanceVisualizerSelfEvolutionDiagnosticSummaryEntry[],
): PerformanceVisualizerSelfEvolutionTriageView {
  const overviewEntries = entries.filter(entry => (
    entry.key !== 'repair-owner'
    && entry.key !== 'first-check'
    && entry.key !== 'repair-path'
  ))
  const triageCards: PerformanceVisualizerSelfEvolutionTriageCard[] = entries
    .filter(isSelfEvolutionTriageSummaryEntry)
    .map((entry) => {
      const rawValue = entry.technicalValue ?? entry.value
      const parts = splitLayerDetail(rawValue)
      return {
        id: entry.key,
        label: entry.label,
        layer: entry.key === 'repair-path' ? null : parts.layer,
        detail: entry.key === 'repair-path' ? rawValue : parts.detail,
        rendererRejoinSurfaceKey: null,
      }
    })

  const continuityEntry = entries.find(entry => (
    entry.key === 'continuity'
    && (entry.technicalValue ?? entry.value).includes('remembered-familiarity-memory-first')
  ))
  const bodyContinuityEntry = entries.find(entry => (
    entry.key === 'continuity'
    && inferBodyContinuityPhase(entry.technicalValue ?? entry.value) != null
  ))
  const companionshipContinuityEntry = entries.find(entry => (
    entry.key === 'continuity'
    && (entry.technicalValue ?? entry.value).includes('companionship-')
  ))
  const projectStateContinuityEntry = entries.find(entry => (
    entry.key === 'continuity'
    && (entry.technicalValue ?? entry.value).includes('project-state-continuity-drift')
  ))
  const companionshipDominantDriftEntry = entries.find(entry => (
    entry.key === 'dominant-drift'
    && (entry.technicalValue ?? entry.value).startsWith('transition-companionship:')
  ))

  if (continuityEntry && triageCards.length === 0) {
    triageCards.push(
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'identity-continuity continuity governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'candidate trajectory -> remembered familiarity restraint -> identity drift governance',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance remembered-familiarity-memory-first -> candidate trajectory identity-continuity room -> identity boundary bounded-growth',
      },
    )
  }
  else if (bodyContinuityEntry && triageCards.length === 0) {
    const bodyContinuityDetail = bodyContinuityEntry.technicalValue ?? bodyContinuityEntry.value
    const bodyContinuityPhase = inferBodyContinuityPhase(bodyContinuityDetail)
    const rendererRejoinSurfaceKey = resolveRendererRejoinSurfaceKey(bodyContinuityDetail)
    const rendererSurfaceToken = resolveRendererRejoinSurfaceToken(bodyContinuityDetail)
    const survivingVisibleLane = resolveSurvivingVisibleLane(bodyContinuityDetail)
    if (!bodyContinuityPhase)
      throw new Error('body continuity triage entry must resolve a structured phase')

    triageCards.push(
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'body continuity governance',
        bodyContinuityPhase,
        rendererRejoinSurfaceKey,
        ...(survivingVisibleLane
          ? { survivingVisibleLane }
          : {}),
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: resolveBodyContinuityFirstCheck({
          bodyContinuityPhase,
          rendererSurfaceToken,
          survivingVisibleLane,
        }),
        bodyContinuityPhase,
        rendererRejoinSurfaceKey,
        ...(survivingVisibleLane
          ? { survivingVisibleLane }
          : {}),
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: resolveBodyContinuityRepairPath({
          bodyContinuityPhase,
          rendererSurfaceToken,
          survivingVisibleLane,
        }),
        bodyContinuityPhase,
        rendererRejoinSurfaceKey,
        ...(survivingVisibleLane
          ? { survivingVisibleLane }
          : {}),
      },
    )
  }
  else if (projectStateContinuityEntry && triageCards.length === 0) {
    triageCards.push(
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'project-state continuity governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: 'continuity governance project-state-continuity-drift -> Project identity carry -> Phase 1 route carry -> Unresolved closure carry',
      },
    )
  }
  else if (companionshipContinuityEntry && companionshipDominantDriftEntry && triageCards.length === 0) {
    const technicalContinuity = companionshipContinuityEntry.technicalValue ?? companionshipContinuityEntry.value
    const companionshipMode = technicalContinuity.split('|')
      .map(part => part.trim())
      .find(part => part.startsWith('companionship-'))
      ?? 'companionship-unknown'

    triageCards.push(
      {
        id: 'repair-owner',
        label: '修复归属',
        layer: 'continuity',
        detail: 'relationship cadence governance',
      },
      {
        id: 'first-check',
        label: '首查点',
        layer: 'continuity',
        detail: 'companionship transition summary -> resident projection -> renderer authority',
      },
      {
        id: 'repair-path',
        label: '修复路径',
        layer: null,
        detail: `continuity governance ${companionshipMode} -> companionship transition settle cadence -> resident projection bounded-return`,
      },
    )
  }

  return {
    overviewLines: buildSelfEvolutionDiagnosticSummaryLines(overviewEntries),
    triageCards,
  }
}
