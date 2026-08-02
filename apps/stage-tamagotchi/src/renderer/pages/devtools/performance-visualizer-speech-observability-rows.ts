import type { SpeechObservabilityView } from './performance-visualizer-speech-observability'

import {
  formatResolvedProsodyAuthoritySummary,
  resolveProsodyAuthorityFromSources,
} from './performance-visualizer-prosody-authority'
import { resolveAuthorityTrustSummaryWithFallback } from './performance-visualizer-resolve-authority-trust'
import {
  buildRuntimeAuthoritySummaryEntries,
  formatAuthorityBindingDisplay,
} from './performance-visualizer-runtime-diagnostic-summary'
import {
  buildSpeechDiagnosticSummaryEntries,
} from './performance-visualizer-speech-diagnostic-summary'
import {
  formatAuthorityBindingSummary,
  formatAuthorityMatchSummary,
} from './performance-visualizer-speech-observability'

export interface SpeechObservabilityRow {
  section: 'articulation' | 'authority' | 'cue' | 'viseme'
  label: string
  value: string
  technicalValue?: string
}

function findEntryValue(
  key: Parameters<typeof buildSpeechDiagnosticSummaryEntries>[0]['speechEvidence'] extends infer T
    ? T extends null
      ? never
      : 'voice' | 'prosody-authority' | 'visemes' | 'cue' | 'persona-style' | 'timing' | 'driver-execution' | 'viseme-hints'
    : never,
  view: SpeechObservabilityView,
) {
  const entry = buildSpeechDiagnosticSummaryEntries({
    speechEvidence: view.speechEvidence,
  }).find(item => item.key === key)

  return entry
    ? {
        value: entry.value,
        technicalValue: entry.technicalValue,
      }
    : null
}

function buildRow(input: SpeechObservabilityRow) {
  return input.technicalValue
    ? input
    : {
        section: input.section,
        label: input.label,
        value: input.value,
      }
}

function hasDisplayValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'n/a'
}

function isPlaceholderOnlyCueValue(value: string | null | undefined) {
  if (!hasDisplayValue(value))
    return true

  return typeof value === 'string'
    && /^n\/a\s*\/\s*n\/a\s*\|\s*prosody=n\/a\s+mouth=n\/a\s+head=n\/a(?:\s+provenance=\S+\s+segment=\S+)?$/i.test(value.trim())
}

function isPlaceholderOnlyVisemeValue(value: string | null | undefined) {
  if (!hasDisplayValue(value))
    return true

  return typeof value === 'string'
    && /^n\/a:n\/a@n\/a(?:\s+src=n\/a\s+segment=\S+)?$/i.test(value.trim())
}

function isPlaceholderOnlyDriverExecutionValue(value: string | null | undefined) {
  if (!hasDisplayValue(value))
    return true

  return typeof value === 'string'
    && /^lipsync=n\/a\s+phase=n\/a$/i.test(value.trim())
}

function isPlaceholderOnlyPersonaStyleValue(value: string | null | undefined) {
  if (!hasDisplayValue(value))
    return true

  return typeof value === 'string'
    && /^n\/a\s*\|\s*prosody=n\/a\s+beat=n\/a\s+mouth=n\/a\s+head=n\/a$/i.test(value.trim())
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : null
}

function extractEmbodimentClosureStage(...summaries: Array<string | null | undefined>) {
  for (const summary of summaries) {
    const normalized = summary?.trim() ?? ''
    if (!normalized)
      continue
    if (
      /(?:^|\s|\|)timing=body-lipsync-carry(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+lipsync-only(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+voice-only(?:\s|\||$)/.test(normalized)
      || /(?:^|\s|\|)lane=body\+face\+motion-only(?:\s|\||$)/.test(normalized)
    ) {
      return 'body-carried-to-renderer-rejoin'
    }
    if (
      /(?:^|\s|\|)lane=body\+lipsync\+voice-only(?:\s|\||$)/.test(normalized)
    ) {
      return 'audible-body-carry'
    }
    if (
      normalized === 'face+lipsync-only'
      || normalized === 'motion+lipsync-only'
      || normalized === 'face+lipsync+voice-only'
      || normalized === 'motion+lipsync+voice-only'
      || normalized === 'face+motion+lipsync+voice-only'
    ) {
      return 'renderer-rejoin-without-body'
    }
    if (
      normalized === 'audible-body-carry'
      || normalized === 'full-driver-rejoin'
      || normalized === 'body-only-hold'
      || normalized === 'body-carried-to-renderer-rejoin'
      || normalized === 'full-cross-modal-lock'
      || normalized === 'renderer-rejoin-without-body'
      || normalized === 'voice-lipsync-carry'
    ) {
      return normalized
    }

    const match = normalized.match(/(?:^|\s|\|)(?:closure|lane)=(face\+lipsync-only|motion\+lipsync-only|face\+lipsync\+voice-only|motion\+lipsync\+voice-only|face\+motion\+lipsync\+voice-only|audible-body-carry|full-driver-rejoin|body-only-hold|body-carried-to-renderer-rejoin|full-cross-modal-lock|renderer-rejoin-without-body|voice-lipsync-carry)(?:\s|\||$)/)
    if (match?.[1]) {
      if (
        match[1] === 'face+lipsync-only'
        || match[1] === 'motion+lipsync-only'
        || match[1] === 'face+lipsync+voice-only'
        || match[1] === 'motion+lipsync+voice-only'
        || match[1] === 'face+motion+lipsync+voice-only'
      ) {
        return 'renderer-rejoin-without-body'
      }
      return match[1]
    }
  }

  return null
}

function extractStructuredSegmentId(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  const match = normalized.match(/(?:^|\s|\|)(?:segment|seg)=([^|\s]+)/)
  return normalizeText(match?.[1])
}

function matchesActiveSegment(segmentId: string | null | undefined, activeSegmentId: string | null) {
  const normalizedSegmentId = normalizeText(segmentId)
  return !activeSegmentId || !normalizedSegmentId || normalizedSegmentId === activeSegmentId
}

function structuredSummaryMatchesActiveSegment(summary: string | null | undefined, activeSegmentId: string | null) {
  const structuredSegmentId = extractStructuredSegmentId(summary)
  return !activeSegmentId || !structuredSegmentId || structuredSegmentId === activeSegmentId
}

function resolveScopedAuthoritySummary(view: SpeechObservabilityView) {
  const resolvedProsodyAuthority = resolveProsodyAuthorityFromSources(view.playbackTelemetry)
  const activeCueId = normalizeText(view.cueMicro?.cueId)
    ?? normalizeText(view.playbackTelemetry?.cue?.id)
    ?? normalizeText(view.playbackCue?.authorityView?.cueId)
    ?? normalizeText(view.authorityBinding?.segmentId)
    ?? null
  const activeSegmentId = normalizeText(view.authorityBinding?.segmentId)
    ?? normalizeText(view.playbackCue?.authorityView?.authoritySegmentId)
    ?? normalizeText(view.playbackTelemetry?.driverAuthority?.segmentId)
    ?? normalizeText(view.playbackTelemetry?.cue?.id)
    ?? normalizeText(resolvedProsodyAuthority?.segmentId)
    ?? null
  const authoritySummaryCueId = normalizeText(view.authoritySummary?.cueId)
  const authoritySummarySegmentId = normalizeText(view.authoritySummary?.segmentId)
  const authoritySummaryMatchesActiveCue = !activeCueId || !authoritySummaryCueId || authoritySummaryCueId === activeCueId
  const authoritySummaryMatchesActiveSegment = matchesActiveSegment(authoritySummarySegmentId, activeSegmentId)
  const authoritySummaryMatchesActiveScope = authoritySummaryMatchesActiveCue && authoritySummaryMatchesActiveSegment

  return {
    activeCueId,
    activeSegmentId,
    authoritySummaryCueId,
    authoritySummarySegmentId,
    segmentId: authoritySummaryMatchesActiveScope
      ? authoritySummarySegmentId ?? activeSegmentId
      : activeSegmentId,
    bindingSummary: authoritySummaryMatchesActiveScope
      ? view.authoritySummary?.bindingSummary ?? null
      : null,
    matchSummary: authoritySummaryMatchesActiveScope
      ? view.authoritySummary?.matchSummary ?? null
      : null,
    authorityTrustSummary: authoritySummaryMatchesActiveScope && structuredSummaryMatchesActiveSegment(
      view.authoritySummary?.authorityTrustSummary,
      activeSegmentId,
    )
      ? view.authoritySummary?.authorityTrustSummary ?? null
      : null,
    settleSummary: authoritySummaryMatchesActiveScope && structuredSummaryMatchesActiveSegment(
      view.authoritySummary?.settleSummary,
      activeSegmentId,
    )
      ? view.authoritySummary?.settleSummary ?? null
      : null,
    authorityMismatchSummary: authoritySummaryMatchesActiveScope
      ? view.authoritySummary?.authorityMismatchSummary ?? null
      : null,
    authorityMismatchReasonSummary: authoritySummaryMatchesActiveScope
      ? view.authoritySummary?.authorityMismatchReasonSummary ?? null
      : null,
    authorityMismatchDisplay: authoritySummaryMatchesActiveScope
      ? view.authoritySummary?.authorityMismatchDisplay ?? null
      : null,
  }
}

function resolveObservabilityProsodyAuthoritySummary(
  view: SpeechObservabilityView,
) {
  return view.speechEvidence?.prosodyAuthoritySummary
    ?? formatResolvedProsodyAuthoritySummary(resolveProsodyAuthorityFromSources(view.playbackTelemetry))
    ?? null
}

function formatConvergenceDisplay(view: SpeechObservabilityView) {
  const convergence = view.convergence
  if (!convergence)
    return null

  const missing = convergence.missingDrivers.length > 0
    ? convergence.missingDrivers.join(',')
    : 'none'

  return {
    value: `${convergence.state} | line=${convergence.line} | missing=${missing}`,
    technicalValue: convergence.summary,
  }
}

function findAuthorityEntry(
  key: 'authority-binding' | 'authority-match' | 'embodiment-closure-stage' | 'authority-trust' | 'continuity-signature' | 'continuity-reasons',
  view: SpeechObservabilityView,
) {
  const scopedAuthoritySummary = resolveScopedAuthoritySummary(view)
  const rawBindingSummary = scopedAuthoritySummary.bindingSummary
    ?? (view.authorityBinding ? formatAuthorityBindingSummary(view.authorityBinding) : null)
  const bindingDisplay = rawBindingSummary
    ? formatAuthorityBindingDisplay(rawBindingSummary)
    : null
  const closureStageBindingSummary = scopedAuthoritySummary.bindingSummary ?? null
  const matchSummary = scopedAuthoritySummary.matchSummary
    ?? (view.authorityBinding ? formatAuthorityMatchSummary(view.authorityBinding) : null)
  const prosodyAuthoritySummary = resolveObservabilityProsodyAuthoritySummary(view)
  const authorityTrustSummary = resolveAuthorityTrustSummaryWithFallback({
    authorityTrustSummary: scopedAuthoritySummary.authorityTrustSummary,
    authorityBindingSummary: rawBindingSummary ?? null,
    settleAuthoritySummary: scopedAuthoritySummary.settleSummary,
    rendererTarget: view.authorityBinding?.rendererTarget
      ?? view.playbackCue?.authorityView?.authorityRendererTarget
      ?? null,
    preferredBlinkCadence: view.playbackCue?.authorityView?.preferredBlinkCadence ?? null,
    preferredGazeMode: view.playbackCue?.authorityView?.preferredGazeMode ?? null,
    residentMode: view.playbackCue?.authorityView?.residentMode ?? null,
    prosodyAuthoritySummary,
    authoritySegmentId: scopedAuthoritySummary.segmentId ?? view.authorityBinding?.segmentId ?? null,
    authorityMatchedDrivers: view.authorityBinding?.matchedDrivers ?? [],
    faceSegmentMatched: view.authorityBinding?.faceSegmentMatched ?? null,
    motionSegmentMatched: view.authorityBinding?.motionSegmentMatched ?? null,
    lipsyncSegmentMatched: view.authorityBinding?.lipsyncSegmentMatched ?? null,
    voiceSegmentMatched: view.authorityBinding?.voiceSegmentMatched ?? null,
  }, [
    {
      authorityTrustSummary: view.playbackCue?.authorityView?.authorityTrustSummary ?? null,
      authorityBindingSummary: view.playbackCue?.authorityView?.authorityBindingSummary
        ?? rawBindingSummary
        ?? null,
      settleAuthoritySummary: view.playbackCue?.authorityView?.settleAuthoritySummary ?? null,
      rendererTarget: view.playbackCue?.authorityView?.authorityRendererTarget
        ?? view.authorityBinding?.rendererTarget
        ?? null,
      preferredBlinkCadence: view.playbackCue?.authorityView?.preferredBlinkCadence ?? null,
      preferredGazeMode: view.playbackCue?.authorityView?.preferredGazeMode ?? null,
      voiceSegmentMatched: view.playbackCue?.authorityView?.voiceSegmentMatched ?? null,
    },
  ])
  const speechSummaryEntry = buildSpeechDiagnosticSummaryEntries({
    authorityBindingSummary: key === 'embodiment-closure-stage'
      ? closureStageBindingSummary
      : rawBindingSummary ?? null,
    settleAuthoritySummary: scopedAuthoritySummary.settleSummary,
    authorityMatchSummary: matchSummary,
    authorityMatchedDrivers: view.authorityBinding?.matchedDrivers ?? [],
    authorityVoiceSegmentMatched: view.authorityBinding?.voiceSegmentMatched ?? null,
    authorityTrustSummary,
    authorityMismatchSummary: view.authorityMismatchSummary ?? scopedAuthoritySummary.authorityMismatchSummary,
    authorityMismatchReasonSummary: view.authorityMismatchReasonSummary ?? scopedAuthoritySummary.authorityMismatchReasonSummary,
    authorityMismatchDisplay: view.authorityMismatchDisplay ?? scopedAuthoritySummary.authorityMismatchDisplay,
    continuitySignature: view.playbackCue?.authorityView?.signature ?? null,
    continuityReasonTags: view.playbackCue?.authorityView?.reasonTags ?? null,
    speechEvidence: view.speechEvidence,
  }).find((item) => {
    if (key === 'authority-binding')
      return item.key === 'authority'
    if (key === 'embodiment-closure-stage')
      return item.key === 'closure-stage'
    return item.key === key
  })
  if (speechSummaryEntry) {
    return {
      value: speechSummaryEntry.value,
      technicalValue: speechSummaryEntry.technicalValue,
    }
  }
  const entry = buildRuntimeAuthoritySummaryEntries({
    rendererTarget: null,
    preferredBlinkCadence: null,
    preferredGazeMode: null,
    authoritySegmentId: scopedAuthoritySummary.segmentId ?? view.authorityBinding?.segmentId ?? null,
    authorityBindingSummary: key === 'embodiment-closure-stage'
      ? closureStageBindingSummary
      : bindingDisplay?.technicalValue ?? rawBindingSummary,
    authorityMatchSummary: matchSummary,
    embodimentClosureStage:
      extractEmbodimentClosureStage(
        view.embodimentClosureStage,
        key === 'embodiment-closure-stage'
          ? closureStageBindingSummary
          : bindingDisplay?.technicalValue ?? rawBindingSummary,
        scopedAuthoritySummary.settleSummary,
        view.authorityMismatchDisplay,
        view.authorityMismatchReasonSummary,
        view.speechEvidence?.driverExecutionSummary,
      ),
    authorityTrustSummary,
    prosodyAuthoritySummary,
    authorityMismatchSummary: scopedAuthoritySummary.authorityMismatchSummary,
    authorityMismatchReasonSummary: scopedAuthoritySummary.authorityMismatchReasonSummary,
    authorityMismatchDisplay: scopedAuthoritySummary.authorityMismatchDisplay,
    settleAuthoritySummary: scopedAuthoritySummary.settleSummary,
  }).find(item => item.key === key)

  return entry
    ? {
        value: key === 'authority-binding'
          ? entry.value
          : entry.value,
        technicalValue: key === 'authority-binding'
          ? (bindingDisplay?.technicalValue ?? entry.technicalValue)
          : entry.technicalValue,
      }
    : null
}

export function buildSpeechObservabilityRows(
  view: SpeechObservabilityView,
): SpeechObservabilityRow[] {
  const rows: SpeechObservabilityRow[] = []
  const scopedAuthoritySummary = resolveScopedAuthoritySummary(view)

  if (view.articulationSummary) {
    const voiceEntry = findEntryValue('voice', view)
    const prosodyAuthorityEntry = findEntryValue('prosody-authority', view)
    const visemeEntry = findEntryValue('visemes', view)
    const voiceValue = voiceEntry?.value ?? view.articulationSummary.voice ?? 'n/a'
    const prosodyAuthorityValue = prosodyAuthorityEntry?.value ?? view.speechEvidence?.prosodyAuthoritySummary ?? 'n/a'
    const visemeValue = visemeEntry?.value ?? view.articulationSummary.topVisemes ?? 'n/a'

    if (hasDisplayValue(voiceValue)) {
      rows.push(buildRow({
        section: 'articulation',
        label: 'voice',
        value: voiceValue,
        technicalValue: voiceEntry?.technicalValue,
      }))
    }
    if (hasDisplayValue(prosodyAuthorityValue)) {
      rows.push(buildRow({
        section: 'articulation',
        label: 'prosody-authority',
        value: prosodyAuthorityValue,
        technicalValue: prosodyAuthorityEntry?.technicalValue,
      }))
    }
    if (hasDisplayValue(visemeValue)) {
      rows.push(buildRow({
        section: 'articulation',
        label: 'visemes',
        value: visemeValue,
        technicalValue: visemeEntry?.technicalValue,
      }))
    }
  }

  if (view.authorityBinding) {
    const authorityMismatchSummary = view.authorityMismatchSummary
    const authorityBindingEntry = findAuthorityEntry('authority-binding', view)
    const authorityMatchEntry = findAuthorityEntry('authority-match', view)
    const convergenceEntry = formatConvergenceDisplay(view)
    const embodimentClosureStageEntry = findAuthorityEntry('embodiment-closure-stage', view)
    const authorityTrustEntry = findAuthorityEntry('authority-trust', view)
    const continuitySignatureEntry = findAuthorityEntry('continuity-signature', view)
    const continuityReasonsEntry = findAuthorityEntry('continuity-reasons', view)
    rows.push({
      section: 'authority',
      label: scopedAuthoritySummary.segmentId ?? view.authorityBinding.segmentId ?? 'authority',
      value: authorityBindingEntry?.value
        ?? (scopedAuthoritySummary.bindingSummary
          ? formatAuthorityBindingDisplay(scopedAuthoritySummary.bindingSummary).value
          : null)
        ?? scopedAuthoritySummary.bindingSummary
        ?? formatAuthorityBindingSummary(view.authorityBinding)
        ?? 'n/a',
      technicalValue: authorityBindingEntry?.technicalValue
        ?? (scopedAuthoritySummary.bindingSummary
          ? formatAuthorityBindingDisplay(scopedAuthoritySummary.bindingSummary).technicalValue
          : undefined),
    })
    rows.push(buildRow({
      section: 'authority',
      label: 'authority-match',
      value: authorityMatchEntry?.value
        ?? scopedAuthoritySummary.matchSummary
        ?? formatAuthorityMatchSummary(view.authorityBinding)
        ?? 'n/a',
      technicalValue: authorityMatchEntry?.technicalValue,
    }))
    if (convergenceEntry) {
      rows.push(buildRow({
        section: 'authority',
        label: 'convergence',
        value: convergenceEntry.value,
        technicalValue: convergenceEntry.technicalValue,
      }))
    }
    if (embodimentClosureStageEntry) {
      rows.push(buildRow({
        section: 'authority',
        label: 'closure-stage',
        value: embodimentClosureStageEntry.value,
        technicalValue: embodimentClosureStageEntry.technicalValue,
      }))
    }
    if (authorityTrustEntry) {
      rows.push(buildRow({
        section: 'authority',
        label: 'authority-trust',
        value: authorityTrustEntry.value,
        technicalValue: authorityTrustEntry.technicalValue,
      }))
    }
    if (continuitySignatureEntry) {
      rows.push(buildRow({
        section: 'authority',
        label: 'continuity-signature',
        value: continuitySignatureEntry.value,
        technicalValue: continuitySignatureEntry.technicalValue,
      }))
    }
    if (continuityReasonsEntry) {
      rows.push(buildRow({
        section: 'authority',
        label: 'continuity-reasons',
        value: continuityReasonsEntry.value,
        technicalValue: continuityReasonsEntry.technicalValue,
      }))
    }
    if (authorityMismatchSummary) {
      rows.push({
        section: 'authority',
        label: 'authority-mismatch',
        value: view.authorityMismatchDisplay ?? view.authorityMismatchReasonSummary ?? authorityMismatchSummary,
      })
    }
  }

  if (view.rendererAlignmentSummary.live2d) {
    rows.push({
      section: 'authority',
      label: 'renderer-live2d',
      value: view.rendererAlignmentSummary.live2d,
    })
  }

  if (view.rendererAlignmentSummary.vrm) {
    rows.push({
      section: 'authority',
      label: 'renderer-vrm',
      value: view.rendererAlignmentSummary.vrm,
    })
  }

  if (view.cueMicro && view.cueMicroSummary) {
    const cueEntry = findEntryValue('cue', view)
    const personaStyleEntry = findEntryValue('persona-style', view)
    const timingEntry = findEntryValue('timing', view)
    const driverExecutionEntry = findEntryValue('driver-execution', view)
    const cueValue = cueEntry?.value ?? view.cueMicroSummary.cue ?? 'n/a'
    if (!isPlaceholderOnlyCueValue(cueEntry?.technicalValue ?? view.cueMicroSummary.cue ?? cueValue)) {
      rows.push(buildRow({
        section: 'cue',
        label: view.cueMicro.cueId
          ?? view.authoritySummary?.cueId
          ?? view.authorityBinding?.segmentId
          ?? view.driverExecution?.lipsync?.segmentId
          ?? 'cue',
        value: cueValue,
        technicalValue: cueEntry?.technicalValue,
      }))
    }
    if (view.cueMicroSummary.personaStyle && !isPlaceholderOnlyPersonaStyleValue(personaStyleEntry?.technicalValue ?? view.cueMicroSummary.personaStyle)) {
      rows.push(buildRow({
        section: 'cue',
        label: 'persona-style',
        value: personaStyleEntry?.value ?? view.cueMicroSummary.personaStyle,
        technicalValue: personaStyleEntry?.technicalValue,
      }))
    }
    rows.push(buildRow({
      section: 'cue',
      label: 'timing',
      value: timingEntry?.value ?? view.cueMicroSummary.timing ?? 'n/a',
      technicalValue: timingEntry?.technicalValue,
    }))
    if (driverExecutionEntry && !isPlaceholderOnlyDriverExecutionValue(driverExecutionEntry.technicalValue ?? driverExecutionEntry.value)) {
      rows.push(buildRow({
        section: 'cue',
        label: 'driver-execution',
        value: driverExecutionEntry.value,
        technicalValue: driverExecutionEntry.technicalValue,
      }))
    }
  }
  else {
    const cueEntry = findEntryValue('cue', view)
    const personaStyleEntry = findEntryValue('persona-style', view)
    const timingEntry = findEntryValue('timing', view)
    const driverExecutionEntry = findEntryValue('driver-execution', view)
    const fallbackCueLabel = view.authoritySummary?.cueId
      ?? view.authorityBinding?.segmentId
      ?? view.driverExecution?.lipsync?.segmentId
      ?? 'cue'

    if (cueEntry && !isPlaceholderOnlyCueValue(cueEntry.technicalValue ?? cueEntry.value)) {
      rows.push(buildRow({
        section: 'cue',
        label: fallbackCueLabel,
        value: cueEntry.value,
        technicalValue: cueEntry.technicalValue,
      }))
    }
    if (personaStyleEntry && !isPlaceholderOnlyPersonaStyleValue(personaStyleEntry.technicalValue ?? personaStyleEntry.value)) {
      rows.push(buildRow({
        section: 'cue',
        label: 'persona-style',
        value: personaStyleEntry.value,
        technicalValue: personaStyleEntry.technicalValue,
      }))
    }
    if (timingEntry) {
      rows.push(buildRow({
        section: 'cue',
        label: 'timing',
        value: timingEntry.value,
        technicalValue: timingEntry.technicalValue,
      }))
    }
    if (driverExecutionEntry && !isPlaceholderOnlyDriverExecutionValue(driverExecutionEntry.technicalValue ?? driverExecutionEntry.value)) {
      rows.push(buildRow({
        section: 'cue',
        label: 'driver-execution',
        value: driverExecutionEntry.value,
        technicalValue: driverExecutionEntry.technicalValue,
      }))
    }
  }

  if (view.visemeHints.length > 0 || view.visemeHintsSummary) {
    const visemeHintsEntry = findEntryValue('viseme-hints', view)
    const firstSegmentId = view.cueMicro?.cueId
      ?? view.authoritySummary?.segmentId
      ?? view.authorityBinding?.segmentId
      ?? view.driverExecution?.lipsync?.segmentId
      ?? view.visemeHints[0]?.segmentId
      ?? 'segment'
    const visemeValue = visemeHintsEntry?.value ?? view.visemeHintsSummary ?? 'n/a'
    if (!isPlaceholderOnlyVisemeValue(visemeHintsEntry?.technicalValue ?? view.visemeHintsSummary ?? visemeValue)) {
      rows.push(buildRow({
        section: 'viseme',
        label: firstSegmentId,
        value: visemeValue,
        technicalValue: visemeHintsEntry?.technicalValue,
      }))
    }
  }

  return rows
}
