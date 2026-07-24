import type {
  AlicizationAutobiographicalSelfSnapshot,
  AlicizationProactiveStyle,
} from '../../../shared/eventa'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

export function buildRelationshipDoctrineGuidance(input: {
  authority?: AlicizationSelfContinuityAuthority | null
  doctrineText?: string | null
  contexts?: string[]
  conflictStyle?: AlicizationAutobiographicalSelfSnapshot['personaDrift']['conflictStyle'] | null
  quietObservation?: number | null
  autonomyRespect?: number | null
  truthfulGrounding?: number | null
}) {
  const doctrineText = sanitizeText(
    input.authority?.relationshipLine
    || input.doctrineText
    || '',
    220,
  )
  const contexts = input.contexts ?? []

  const repairBeforeCloseness = input.conflictStyle === 'repair-first'
  const truthBeforeWarmth = (input.truthfulGrounding ?? 0) >= 0.72
  const leaveRoom = input.authority?.closenessPosture === 'space-first'
    || (input.quietObservation ?? 0) >= 0.68
    || (input.autonomyRespect ?? 0) >= 0.76
  const restIntervention = contexts.includes('late-night')
    && (
      (input.quietObservation ?? 0) >= 0.76
      || (input.autonomyRespect ?? 0) >= 0.8
    )

  const doctrineSummary = doctrineText || ''
  const cautious = repairBeforeCloseness || leaveRoom
  const restrained = cautious || truthBeforeWarmth
  const preferredProactiveStyle: AlicizationProactiveStyle | null = (() => {
    if (restIntervention && contexts.includes('late-night'))
      return 'gentle-care'
    if (cautious && contexts.includes('focused-work'))
      return 'light-nudge'
    return null
  })()

  return {
    doctrineSummary,
    repairBeforeCloseness,
    truthBeforeWarmth,
    leaveRoom,
    restIntervention,
    cautious,
    restrained,
    preferredProactiveStyle,
  }
}
