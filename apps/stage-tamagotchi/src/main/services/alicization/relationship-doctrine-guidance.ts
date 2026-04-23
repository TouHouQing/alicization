import type { AlicizationProactiveStyle } from '../../../shared/eventa'
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
}) {
  const doctrineText = sanitizeText(
    input.authority?.relationshipLine
      || input.doctrineText
      || '',
    220,
  )
  const lower = doctrineText.toLowerCase()
  const contexts = input.contexts ?? []

  const repairBeforeCloseness = /repair before|先修复|修复.*先于|先修复再靠近|修复先于亲近/iu.test(lower)
  const truthBeforeWarmth = /truth|真实|reality|repair truth|真相|不让靠近越过真实|outrun truth|truth before/iu.test(lower)
  const leaveRoom = /space|room|pressure|crowd|lighter|leave room|空间|留白|压迫|轻一点|presence becomes pressure/iu.test(lower)
  const restIntervention = /rest deserves|rest window|休息值得|先休息|rest protection/iu.test(lower)

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
