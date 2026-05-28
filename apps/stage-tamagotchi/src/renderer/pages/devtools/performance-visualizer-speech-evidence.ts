import type { SpeechAuthoritySegmentRow } from './performance-visualizer-speech-authority'

export type PerformanceVisualizerSpeechEvidenceKind =
  | 'prosody'
  | 'viseme'
  | 'micro-expression'
  | 'settle'

export type PerformanceVisualizerSpeechEvidenceFilter =
  | 'speech'
  | 'prosody'
  | 'viseme'
  | 'micro-expression'
  | 'authority-match'

export interface PerformanceVisualizerSpeechEvidenceSnapshot {
  voiceSummary: string | null
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

export function hasSpeechProsodyEvidence(row: Pick<
  SpeechAuthoritySegmentRow,
  'voiceSummary' | 'prosodyAuthoritySummary' | 'cueProsodyPresent' | 'personaStyleSummary' | 'timingSummary'
>) {
  return hasValue(row.voiceSummary)
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
>): PerformanceVisualizerSpeechEvidenceSnapshot {
  return {
    voiceSummary: speech.voiceSummary,
    prosodyAuthoritySummary: speech.prosodyAuthoritySummary,
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
