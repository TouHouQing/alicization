import type { SpeechObservabilityView } from './performance-visualizer-speech-observability'

import {
  formatAuthorityBindingSummary,
  formatAuthorityMatchSummary,
  formatProsodyAuthoritySummary,
} from './performance-visualizer-speech-observability'
import { buildRuntimeAuthoritySummaryEntries } from './performance-visualizer-runtime-diagnostic-summary'
import { buildSpeechDiagnosticSummaryEntries } from './performance-visualizer-speech-diagnostic-summary'

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
    && /^n\/a\s*\/\s*n\/a\s*\|\s*prosody=n\/a\s+mouth=n\/a\s+head=n\/a(?:\s+provenance=[^\s]+\s+segment=[^\s]+)?$/i.test(value.trim())
}

function isPlaceholderOnlyVisemeValue(value: string | null | undefined) {
  if (!hasDisplayValue(value))
    return true

  return typeof value === 'string'
    && /^n\/a:n\/a@n\/a(?:\s+src=n\/a\s+segment=[^\s]+)?$/i.test(value.trim())
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

function deriveAuthorityTrustSummary(input: {
  prosodyAuthoritySummary: string | null
  authoritySegmentId: string | null
}) {
  if (!input.prosodyAuthoritySummary || !input.authoritySegmentId)
    return null

  if (
    input.prosodyAuthoritySummary.includes('provenance=authority-bound')
    && input.prosodyAuthoritySummary.includes(`segment=${input.authoritySegmentId}`)
  ) {
    return '韵律权威链已重新绑定到当前片段，可直接进入长期基线。'
  }

  return null
}

function resolveObservabilityProsodyAuthoritySummary(
  view: SpeechObservabilityView,
) {
  return view.speechEvidence?.prosodyAuthoritySummary
    ?? (view.playbackTelemetry?.driverAuthority?.prosodyAuthority
      ? formatProsodyAuthoritySummary(view.playbackTelemetry.driverAuthority.prosodyAuthority)
      : null)
    ?? (view.playbackTelemetry?.prosodyAuthority
      ? formatProsodyAuthoritySummary(view.playbackTelemetry.prosodyAuthority)
      : null)
    ?? null
}

function findAuthorityEntry(
  key: 'authority-binding' | 'authority-match' | 'authority-trust',
  view: SpeechObservabilityView,
) {
  const bindingSummary = view.authoritySummary?.bindingSummary
    ?? (view.authorityBinding ? formatAuthorityBindingSummary(view.authorityBinding) : null)
  const matchSummary = view.authoritySummary?.matchSummary
    ?? (view.authorityBinding ? formatAuthorityMatchSummary(view.authorityBinding) : null)
  const prosodyAuthoritySummary = resolveObservabilityProsodyAuthoritySummary(view)
  const authorityTrustSummary = view.authoritySummary?.authorityTrustSummary
    ?? deriveAuthorityTrustSummary({
      prosodyAuthoritySummary,
      authoritySegmentId: view.authoritySummary?.segmentId ?? view.authorityBinding?.segmentId ?? null,
    })
  const entry = buildRuntimeAuthoritySummaryEntries({
    rendererTarget: null,
    authoritySegmentId: view.authoritySummary?.segmentId ?? view.authorityBinding?.segmentId ?? null,
    authorityBindingSummary: bindingSummary,
    authorityMatchSummary: matchSummary,
    authorityTrustSummary,
    prosodyAuthoritySummary,
    authorityMismatchSummary: null,
    authorityMismatchReasonSummary: null,
    authorityMismatchDisplay: null,
    settleAuthoritySummary: null,
  }).find(item => item.key === key)

  return entry
    ? {
        value: entry.value,
        technicalValue: entry.technicalValue,
      }
    : null
}

export function buildSpeechObservabilityRows(
  view: SpeechObservabilityView,
): SpeechObservabilityRow[] {
  const rows: SpeechObservabilityRow[] = []

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
    const authorityTrustEntry = findAuthorityEntry('authority-trust', view)
    rows.push({
      section: 'authority',
      label: view.authoritySummary?.segmentId ?? view.authorityBinding.segmentId ?? 'authority',
      value: authorityBindingEntry?.value
        ?? view.authoritySummary?.bindingSummary
        ?? formatAuthorityBindingSummary(view.authorityBinding)
        ?? 'n/a',
      technicalValue: authorityBindingEntry?.technicalValue,
    })
    rows.push(buildRow({
      section: 'authority',
      label: 'authority-match',
      value: authorityMatchEntry?.value
        ?? view.authoritySummary?.matchSummary
        ?? formatAuthorityMatchSummary(view.authorityBinding)
        ?? 'n/a',
      technicalValue: authorityMatchEntry?.technicalValue,
    }))
    if (authorityTrustEntry) {
      rows.push(buildRow({
        section: 'authority',
        label: 'authority-trust',
        value: authorityTrustEntry.value,
        technicalValue: authorityTrustEntry.technicalValue,
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
