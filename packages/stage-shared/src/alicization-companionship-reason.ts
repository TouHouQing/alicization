import type { AlicizationDigitalLifeSpineDigest } from './alicization-transport-contracts'

function readCompanionshipFact(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  return raw.trim() || null
}

function firstCompanionshipFact(values: unknown[]) {
  for (const value of values) {
    const fact = readCompanionshipFact(value)
    if (fact)
      return fact
  }
  return null
}

export function resolveAlicizationCompanionshipReasonSummary(input: {
  residentMode: string | null | undefined
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined
}) {
  if (!readCompanionshipFact(input.residentMode))
    return null

  const digest = input.digitalLifeSpineDigest
  const memory = digest?.memory
  const personaBias = digest?.proactive?.personaBias
  const relationshipDoctrine
    = digest?.embodiment?.autobiographicalSelf?.relationshipDoctrine
      ?? memory?.selfEvolution?.relationshipDoctrine
  const latestInflection
    = digest?.outcomeLearning?.latestInflection
      ?? memory?.selfEvolution?.latestInflection
  const affectiveResidueSummary = memory?.affectiveResidue?.summary

  if (input.residentMode === 'repair-before-closeness') {
    return firstCompanionshipFact([
      relationshipDoctrine,
      affectiveResidueSummary,
      latestInflection,
      personaBias?.whySummary,
      memory?.recentEpisodeSummary,
      memory?.summary,
    ])
  }

  return firstCompanionshipFact([
    personaBias?.whySummary,
    affectiveResidueSummary,
    latestInflection,
    relationshipDoctrine,
    memory?.recentEpisodeSummary,
    memory?.summary,
  ])
}
