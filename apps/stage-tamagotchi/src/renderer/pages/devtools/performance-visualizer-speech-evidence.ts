import type { SpeechAuthoritySegmentRow } from './performance-visualizer-speech-authority'

export type PerformanceVisualizerSpeechEvidenceKind
  = | 'prosody'
    | 'viseme'
    | 'micro-expression'
    | 'settle'

export type PerformanceVisualizerSpeechEvidenceFilter
  = | 'speech'
    | 'prosody'
    | 'viseme'
    | 'micro-expression'
    | 'authority-match'
    | 'authority-trust'

export interface PerformanceVisualizerSpeechEvidenceSnapshot {
  voiceSummary: string | null
  bodyContinuitySummary?: string | null
  embodimentClosureStage?: string | null
  prosodyAuthoritySummary: string | null
  authorityMatchSummary: string | null
  topVisemeSummary: string | null
  cueSummary: string | null
  cueIdentityPresent: boolean
  cueProsodyPresent: boolean
  personaStyleSummary: string | null
  timingSummary: string | null
  driverExecutionSummary: string | null
  visemeHintsSummary: string | null
}

function hasValue(value: string | null | undefined) {
  return typeof value === 'string' && value.trim().length > 0 && value !== 'n/a'
}

function extractEmbodimentClosureStage(...summaries: Array<string | null | undefined>) {
  for (const summary of summaries) {
    const normalized = typeof summary === 'string' ? summary.trim() : ''
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

export function hasSpeechProsodyEvidence(row: Pick<
  SpeechAuthoritySegmentRow,
  'voiceSummary' | 'bodyContinuitySummary' | 'embodimentClosureStage' | 'prosodyAuthoritySummary' | 'cueProsodyPresent' | 'personaStyleSummary' | 'timingSummary'
>) {
  return hasValue(row.voiceSummary)
    || hasValue(row.bodyContinuitySummary)
    || hasValue(row.embodimentClosureStage)
    || hasValue(row.prosodyAuthoritySummary)
    || Boolean(row.cueProsodyPresent)
    || hasValue(row.personaStyleSummary)
    || hasValue(row.timingSummary)
}

export function hasSpeechVisemeEvidence(row: Pick<
  SpeechAuthoritySegmentRow,
  'topVisemeSummary' | 'visemeHintsSummary'
>) {
  return hasValue(row.topVisemeSummary)
    || hasValue(row.visemeHintsSummary)
}

export function hasSpeechMicroExpressionEvidence(row: Pick<
  SpeechAuthoritySegmentRow,
  'cueIdentityPresent' | 'personaStyleSummary' | 'timingSummary'
>) {
  return Boolean(row.cueIdentityPresent)
    || hasValue(row.personaStyleSummary)
    || hasValue(row.timingSummary)
}

export function buildSpeechEvidenceSnapshot(speech: Pick<
  SpeechAuthoritySegmentRow,
  'voiceSummary'
  | 'bodyContinuitySummary'
  | 'embodimentClosureStage'
  | 'prosodyAuthoritySummary'
  | 'authorityMatchSummary'
  | 'topVisemeSummary'
  | 'cueSummary'
  | 'cueIdentityPresent'
  | 'cueProsodyPresent'
  | 'personaStyleSummary'
  | 'timingSummary'
  | 'driverExecutionSummary'
  | 'visemeHintsSummary'
> & {
  authorityBindingSummary?: string | null
  settleAuthoritySummary?: string | null
}): PerformanceVisualizerSpeechEvidenceSnapshot {
  return {
    voiceSummary: speech.voiceSummary,
    bodyContinuitySummary: speech.bodyContinuitySummary ?? null,
    embodimentClosureStage: speech.embodimentClosureStage
      ?? extractEmbodimentClosureStage(
        speech.authorityBindingSummary ?? null,
        speech.settleAuthoritySummary ?? null,
        speech.driverExecutionSummary,
        speech.bodyContinuitySummary,
      )
      ?? null,
    prosodyAuthoritySummary: speech.prosodyAuthoritySummary ?? null,
    authorityMatchSummary: speech.authorityMatchSummary,
    topVisemeSummary: speech.topVisemeSummary,
    cueSummary: speech.cueSummary ?? null,
    cueIdentityPresent: Boolean(speech.cueIdentityPresent),
    cueProsodyPresent: Boolean(speech.cueProsodyPresent),
    personaStyleSummary: speech.personaStyleSummary,
    timingSummary: speech.timingSummary,
    driverExecutionSummary: speech.driverExecutionSummary,
    visemeHintsSummary: speech.visemeHintsSummary,
  }
}

export function matchesSpeechEvidenceSnapshot(
  speech: PerformanceVisualizerSpeechEvidenceSnapshot,
  filter: PerformanceVisualizerSpeechEvidenceFilter,
) {
  switch (filter) {
    case 'speech':
      return hasSpeechProsodyEvidence(speech)
        || hasSpeechVisemeEvidence(speech)
        || hasSpeechMicroExpressionEvidence(speech)
        || hasValue(speech.driverExecutionSummary)
    case 'prosody':
      return hasSpeechProsodyEvidence(speech)
        || hasValue(speech.driverExecutionSummary)
    case 'authority-match':
      return hasValue(speech.authorityMatchSummary)
    case 'authority-trust':
      return false
    case 'viseme':
      return hasSpeechVisemeEvidence(speech)
    case 'micro-expression':
      return hasSpeechMicroExpressionEvidence(speech)
    default:
      return true
  }
}

export function collectSpeechEvidenceKinds(input: {
  speech: Pick<
    SpeechAuthoritySegmentRow,
    'voiceSummary'
    | 'bodyContinuitySummary'
    | 'embodimentClosureStage'
    | 'prosodyAuthoritySummary'
    | 'cueProsodyPresent'
    | 'topVisemeSummary'
    | 'cueIdentityPresent'
    | 'personaStyleSummary'
    | 'timingSummary'
    | 'visemeHintsSummary'
  >
  hasSettleEvidence?: boolean
}) {
  const evidenceKinds: PerformanceVisualizerSpeechEvidenceKind[] = []

  if (hasSpeechProsodyEvidence(input.speech))
    evidenceKinds.push('prosody')
  if (hasSpeechVisemeEvidence(input.speech))
    evidenceKinds.push('viseme')
  if (hasSpeechMicroExpressionEvidence(input.speech))
    evidenceKinds.push('micro-expression')
  if (input.hasSettleEvidence)
    evidenceKinds.push('settle')

  return evidenceKinds
}
