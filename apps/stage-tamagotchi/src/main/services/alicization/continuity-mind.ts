export type AlicizationContinuityMindBodyState
  = | 'sleep'
    | 'idle'
    | 'noticing'
    | 'accompanying'
    | 'speaking'
    | 'warning'
    | 'recovering'

export interface AlicizationContinuityMindReduceInput {
  quietLineMs: number
  bodyState: AlicizationContinuityMindBodyState
  latestThreadSummary: string | null
  relationshipPressure: number
  personaAuthoritySummary?: string | null
  personaKernelSummary?: string | null
  latestUserTurnAt: number | null
  now: number
}

export interface AlicizationContinuityMindState {
  subjectiveNowSummary: string
  privateThoughtMode: 'quiet-companionship' | 'ambient-watch'
  shouldForceSpeech: boolean
  emotionalCarry: 'soft-covision' | 'calm-browse'
}

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

export function createAlicizationContinuityMind() {
  return {
    reduce(input: AlicizationContinuityMindReduceInput): AlicizationContinuityMindState {
      const latestThreadSummary = sanitizeText(input.latestThreadSummary, 160) || null
      const personaAuthoritySummary = sanitizeText(input.personaAuthoritySummary, 160) || null
      const personaKernelSummary = sanitizeText(input.personaKernelSummary, 160) || null
      const sustainedQuietCompanionship = input.bodyState === 'accompanying'
        && input.quietLineMs >= 120_000
        && input.relationshipPressure >= 0.2
        && (
          input.latestUserTurnAt == null
          || input.now - input.latestUserTurnAt >= 60_000
        )

      return {
        subjectiveNowSummary: sustainedQuietCompanionship
          ? `Still quietly accompanying the host through ${latestThreadSummary ?? 'the current focus'}${personaKernelSummary ? `, with ${personaKernelSummary}` : personaAuthoritySummary ? `, with ${personaAuthoritySummary}` : ''}.`
          : `Holding ambient awareness around ${latestThreadSummary ?? 'the current desktop moment'}${personaKernelSummary ? `, with ${personaKernelSummary}` : personaAuthoritySummary ? `, with ${personaAuthoritySummary}` : ''}.`,
        privateThoughtMode: sustainedQuietCompanionship ? 'quiet-companionship' : 'ambient-watch',
        shouldForceSpeech: false,
        emotionalCarry: sustainedQuietCompanionship ? 'soft-covision' : 'calm-browse',
      }
    },
  }
}
