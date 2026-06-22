import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationRuntimeProjectStateDigest,
} from './alicization-transport-contracts'

function normalizeSummaryString(raw: unknown) {
  if (typeof raw !== 'string')
    return null

  const normalized = raw.trim()
  return normalized || null
}

function normalizeCompanionshipReasonText(value: string | null | undefined) {
  const normalized = normalizeSummaryString(value)
  if (!normalized)
    return null

  return normalized
    .replace(/[.。!?！？]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function readProjectStateDigest(digest: AlicizationDigitalLifeSpineDigest | null | undefined) {
  const projectState = digest?.runtime?.projectState
  if (!projectState || typeof projectState !== 'object')
    return null

  return projectState
}

function readEmbodimentReasonTags(
  reasonTags: string[] | null | undefined,
) {
  return Array.isArray(reasonTags) ? reasonTags : []
}

function detectSameHerInwardCarryFromProjectState(input: {
  sameHerSelfLine: string | null
  inwardLine: string | null
  emotionalClosureCue: string | null
}) {
  const merged = [
    input.sameHerSelfLine,
    input.inwardLine,
    input.emotionalClosureCue,
  ].filter((value): value is string => Boolean(value)).join(' ').toLowerCase()

  if (!merged)
    return false

  return (
    (merged.includes('same phase 1 digital life') && merged.includes('same living line'))
    || (merged.includes('continuous her') && (merged.includes('same living line') || merged.includes('unfinished closure')))
    || (merged.includes('one continuous her') && merged.includes('same living line'))
    || ((merged.includes('same-her') || merged.includes('same her')) && merged.includes('same living line'))
    || (merged.includes('without reopening from scratch') && merged.includes('same living line'))
  )
}

function detectSameHerInwardCarryFromLongHorizonSignals(input: {
  relationshipDoctrine: string | null
  latestInflection: string | null
  manifestationCadenceSummary: string | null
  openingGuidance: string | null
}) {
  const merged = [
    input.relationshipDoctrine,
    input.latestInflection,
    input.manifestationCadenceSummary,
    input.openingGuidance,
  ].filter((value): value is string => Boolean(value)).join(' ').toLowerCase()

  if (!merged)
    return false

  const carriesSameHerLine
    = merged.includes('same living line')
      || merged.includes('same-her')
      || merged.includes('same her')
      || merged.includes('continuous her')
      || merged.includes('same living her')
      || merged.includes('one continuous her')
  const carriesInwardRestraint
    = merged.includes('lower-pressure')
      || merged.includes('leave room')
      || merged.includes('without reopening from scratch')
      || merged.includes('do not reopen from scratch')
      || merged.includes('quiet')
      || merged.includes('measured-return')

  return carriesSameHerLine && carriesInwardRestraint
}

function detectRememberedSeamReinterpretation(input: {
  relationshipDoctrine: string | null
  latestInflection: string | null
  manifestationCadenceSummary: string | null
  openingGuidance: string | null
  memoryProjectionManifestationCadenceSummary?: string | null
  memoryProjectionOpeningGuidance?: string | null
  rememberedPreferenceSummary?: string | null
  rememberedConstraintSummary?: string | null
  rememberedPlanSummary?: string | null
}) {
  const merged = [
    input.relationshipDoctrine,
    input.latestInflection,
    input.manifestationCadenceSummary,
    input.openingGuidance,
    input.memoryProjectionManifestationCadenceSummary,
    input.memoryProjectionOpeningGuidance,
    input.rememberedPreferenceSummary,
    input.rememberedConstraintSummary,
    input.rememberedPlanSummary,
  ].filter((value): value is string => Boolean(value)).join(' ')
  const rememberedMemoryMerged = [
    input.rememberedPreferenceSummary,
    input.rememberedConstraintSummary,
    input.rememberedPlanSummary,
  ].filter((value): value is string => Boolean(value)).join(' ')

  if (!merged)
    return false

  if (/more room this time|reopened too eagerly|too eagerly before|slower this time|keep more room this time|this time keep more room|这次更要留白|这次要更慢一点|不要重开得太快|上次太急/u.test(merged))
    return true

  return /do not reopen from scratch|without reopening from scratch|不要重新开始|不要从头重开/u.test(rememberedMemoryMerged)
}

function extractThinAffectiveResidueRoomMakingLine(input: {
  manifestationCadenceSummary: string | null
  openingGuidance: string | null
}) {
  const candidates = [
    input.manifestationCadenceSummary,
    input.openingGuidance,
  ].filter((value): value is string => Boolean(value))

  for (const candidate of candidates) {
    const matched = candidate.match(/余韵还在[^。!?！？]*|先留白[^。!?！？]*|别立刻把温度放大[^。!?！？]*|别把温度放大[^。!?！？]*|不要立刻把温度放大[^。!?！？]*|still glowing[^.?!]*|leave room before warmth returns[^.?!]*|do not widen yet[^.?!]*/iu)
    if (matched?.[0]) {
      return normalizeCompanionshipReasonText(matched[0])
    }
  }

  return null
}

function extractConcreteLifeLoopGapReason(input: {
  manifestationCadenceSummary: string | null
  openingGuidance: string | null
  relationshipDoctrine: string | null
  latestInflection: string | null
}) {
  const merged = [
    input.manifestationCadenceSummary,
    input.openingGuidance,
    input.relationshipDoctrine,
    input.latestInflection,
  ].filter((value): value is string => Boolean(value)).join(' ').toLowerCase()

  if (!merged)
    return null

  const hasEmotion = merged.includes('emotion')
    || merged.includes('emotional')
    || merged.includes('affective')
    || /情绪|情感/u.test(merged)
  const hasMemory = merged.includes('memory')
  const hasInitiative = merged.includes('initiative') || merged.includes('opening')
  const hasEmbodiment = merged.includes('embodiment')
    || merged.includes('voice')
    || merged.includes('face')
    || merged.includes('motion')
    || merged.includes('lipsync')

  if (!hasMemory || !hasInitiative || !hasEmbodiment)
    return null

  const gapLabels = [
    hasEmotion ? 'emotion' : null,
    'memory',
    'initiative',
    'embodiment',
  ].filter((value): value is string => Boolean(value)).join(', ')

  const hasSameHerLine = merged.includes('same-her')
    || merged.includes('same her')
    || merged.includes('same living line')
    || merged.includes('continuous her')
    || merged.includes('one continuous her')
  const hasProjectShellRisk = merged.includes('project-shell')
    || merged.includes('project shell')
    || merged.includes('generic shell')
    || merged.includes('generic assistant')
    || merged.includes('narration')

  if (hasSameHerLine && hasProjectShellRisk) {
    return `Keep ${gapLabels} closing on one same-her line before this turn flattens into project-shell narration`
  }

  if (hasSameHerLine) {
    return `Keep ${gapLabels} closing on one same-her line before the turn widens outward`
  }

  return `Keep ${gapLabels} closing together before the turn widens outward`
}

export function detectRememberedSeamCompanionshipReopen(input: {
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined
}) {
  const personaBias = input.digitalLifeSpineDigest?.proactive?.personaBias
  const relationshipDoctrine = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.embodiment?.autobiographicalSelf?.relationshipDoctrine
    ?? input.digitalLifeSpineDigest?.memory?.selfEvolution?.relationshipDoctrine,
  )
  const latestInflection = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.outcomeLearning?.latestInflection
    ?? input.digitalLifeSpineDigest?.memory?.selfEvolution?.latestInflection,
  )
  const manifestationCadenceSummary = normalizeCompanionshipReasonText(
    personaBias?.manifestationCadenceSummary
    ?? input.digitalLifeSpineDigest?.memory?.selfEvolution?.relationshipCadenceSummary,
  )
  const openingGuidance = normalizeCompanionshipReasonText(
    personaBias?.openingGuidance,
  )
  const memoryProjectionManifestationCadenceSummary = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.personStateProjection?.manifestationCadenceSummary,
  )
  const memoryProjectionOpeningGuidance = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.personStateProjection?.openingGuidance,
  )
  const rememberedPreferenceSummary = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.rememberedPreferenceSummary,
  )
  const rememberedConstraintSummary = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.rememberedConstraintSummary,
  )
  const rememberedPlanSummary = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.rememberedPlanSummary,
  )
  const candidates = [
    relationshipDoctrine,
    latestInflection,
    manifestationCadenceSummary,
    openingGuidance,
    memoryProjectionManifestationCadenceSummary,
    memoryProjectionOpeningGuidance,
    rememberedPreferenceSummary,
    rememberedConstraintSummary,
    rememberedPlanSummary,
  ].filter((value): value is string => Boolean(value))
  const rememberedSeamPattern
    = /remembered seam|same remembered relationship seam|rejoin-remembered-seam|same line|同一条线|留白|先修复|轻轻牵回/u

  return candidates.some(candidate => rememberedSeamPattern.test(candidate))
}

function looksLikeGenericSameHerHoldDetail(value: string | null | undefined) {
  const normalized = normalizeCompanionshipReasonText(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  const carriesRememberedSeamSpecificity
    = normalized.includes('remembered seam')
      || normalized.includes('same remembered relationship seam')
      || normalized.includes('more room this time')
      || normalized.includes('reopened too eagerly')
      || normalized.includes('leave more room')
      || normalized.includes('do not reopen from scratch')
      || normalized.includes('这次更要留白')
      || normalized.includes('不要重开得太快')
  if (carriesRememberedSeamSpecificity)
    return false

  return (
    normalized.includes('same phase 1 digital life')
    || normalized.includes('same living line')
    || normalized.includes('same-her hold')
    || normalized.includes('staying near preserves continuity')
    || normalized.includes('without forcing the opening')
    || normalized.includes('keep the same living line inward')
  )
}

export function resolveAlicizationCompanionshipReasonSummary(input: {
  residentMode: string | null | undefined
  digitalLifeSpineDigest?: AlicizationDigitalLifeSpineDigest | null | undefined
  projectState?: AlicizationRuntimeProjectStateDigest | null | undefined
  reasonTags?: string[] | null | undefined
}) {
  const residentMode = normalizeSummaryString(input.residentMode)
  if (!residentMode)
    return null

  const personaBias = input.digitalLifeSpineDigest?.proactive?.personaBias
  const relationshipDoctrine = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.embodiment?.autobiographicalSelf?.relationshipDoctrine
    ?? input.digitalLifeSpineDigest?.memory?.selfEvolution?.relationshipDoctrine,
  )
  const latestInflection = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.outcomeLearning?.latestInflection
    ?? input.digitalLifeSpineDigest?.memory?.selfEvolution?.latestInflection,
  )
  const manifestationCadenceSummary = normalizeCompanionshipReasonText(
    personaBias?.manifestationCadenceSummary
    ?? input.digitalLifeSpineDigest?.memory?.selfEvolution?.relationshipCadenceSummary,
  )
  const openingGuidance = normalizeCompanionshipReasonText(
    personaBias?.openingGuidance
    ?? input.digitalLifeSpineDigest?.memory?.selfEvolution?.trustMeaning,
  )
  const memoryProjectionManifestationCadenceSummary = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.personStateProjection?.manifestationCadenceSummary ?? null,
  )
  const memoryProjectionOpeningGuidance = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.personStateProjection?.openingGuidance ?? null,
  )
  const projectState = input.projectState ?? readProjectStateDigest(input.digitalLifeSpineDigest)
  const runtimeProjectStateSameHerSelfLine = normalizeCompanionshipReasonText(
    projectState?.sameHerSelfLine ?? null,
  )
  const runtimeProjectStateSameHerHoldDetail = normalizeCompanionshipReasonText(
    projectState?.sameHerHoldDetail ?? null,
  )
  const runtimeProjectStateEmotionalClosureCue = normalizeCompanionshipReasonText(
    projectState?.emotionalClosureCue ?? null,
  )
  const rememberedPreferenceSummary = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.rememberedPreferenceSummary ?? null,
  )
  const rememberedConstraintSummary = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.rememberedConstraintSummary ?? null,
  )
  const rememberedPlanSummary = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.rememberedPlanSummary ?? null,
  )
  const selfAuthorityInwardLine = normalizeCompanionshipReasonText(
    input.digitalLifeSpineDigest?.memory?.personStateProjection?.selfContinuityAuthority?.inwardLine ?? null,
  )
  const rememberedSeamReopen = detectRememberedSeamCompanionshipReopen({
    digitalLifeSpineDigest: input.digitalLifeSpineDigest,
  })
  const rationaleTags = readEmbodimentReasonTags(input.reasonTags)
  const memoryDeliberationRepairCadence = rationaleTags.some((tag: string) => normalizeCompanionshipReasonText(tag)?.toLowerCase() === 'memory-deliberation-cadence:repair-before-closeness')
  const memoryDeliberationMeasuredCadence = rationaleTags.some((tag: string) => {
    const normalized = normalizeCompanionshipReasonText(tag)?.toLowerCase()
    return normalized === 'memory-deliberation-cadence:measured-return'
      || normalized === 'memory-deliberation-cadence:lower-pressure'
  })
  const rememberedSeamReinterpretationTag = rationaleTags.some((tag: string) => {
    const normalized = normalizeCompanionshipReasonText(tag)?.toLowerCase()
    return normalized === 'remembered-seam:reinterpret-with-more-room'
      || normalized === 'frame:remembered-seam:reinterpret-with-more-room'
      || normalized === 'timing:remembered-seam-more-room'
  })
  const rememberedSeamReinterpretation = rememberedSeamReinterpretationTag
    || detectRememberedSeamReinterpretation({
      relationshipDoctrine,
      latestInflection,
      manifestationCadenceSummary,
      openingGuidance,
      memoryProjectionManifestationCadenceSummary,
      memoryProjectionOpeningGuidance,
      rememberedPreferenceSummary,
      rememberedConstraintSummary,
      rememberedPlanSummary,
    })
  const sameHerInwardCarry = rationaleTags.some((tag: string) => normalizeCompanionshipReasonText(tag)?.toLowerCase() === 'same-her-inward-carry')
    || detectSameHerInwardCarryFromProjectState({
      sameHerSelfLine: runtimeProjectStateSameHerSelfLine,
      inwardLine: selfAuthorityInwardLine,
      emotionalClosureCue: runtimeProjectStateEmotionalClosureCue,
    })
    || detectSameHerInwardCarryFromLongHorizonSignals({
      relationshipDoctrine,
      latestInflection,
      manifestationCadenceSummary,
      openingGuidance,
    })

  if (residentMode === 'repair-before-closeness') {
    if (runtimeProjectStateSameHerHoldDetail) {
      return runtimeProjectStateSameHerHoldDetail
    }

    const concreteLifeLoopGapReason = extractConcreteLifeLoopGapReason({
      manifestationCadenceSummary,
      openingGuidance,
      relationshipDoctrine,
      latestInflection,
    })
    if (concreteLifeLoopGapReason) {
      return concreteLifeLoopGapReason
    }

    if (memoryDeliberationRepairCadence) {
      return 'Memory deliberation still says let repair settle first on the same living line before closeness widens again'
    }

    if (sameHerInwardCarry) {
      return 'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again'
    }

    return relationshipDoctrine
      ?? runtimeProjectStateEmotionalClosureCue
      ?? openingGuidance
      ?? latestInflection
      ?? manifestationCadenceSummary
      ?? 'repair should settle before closeness widens'
  }

  if (residentMode === 'measured-return') {
    if (
      runtimeProjectStateSameHerHoldDetail
      && rememberedSeamReopen
      && rememberedSeamReinterpretation
      && looksLikeGenericSameHerHoldDetail(runtimeProjectStateSameHerHoldDetail)
    ) {
      return 'Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before'
    }

    if (runtimeProjectStateSameHerHoldDetail) {
      return runtimeProjectStateSameHerHoldDetail
    }

    const concreteLifeLoopGapReason = extractConcreteLifeLoopGapReason({
      manifestationCadenceSummary,
      openingGuidance,
      relationshipDoctrine,
      latestInflection,
    })
    if (concreteLifeLoopGapReason) {
      return concreteLifeLoopGapReason
    }

    if (memoryDeliberationMeasuredCadence) {
      return 'Memory deliberation still says keep the same living line lower-pressure before widening outward again'
    }

    const thinAffectiveResidueRoomMakingLine = extractThinAffectiveResidueRoomMakingLine({
      manifestationCadenceSummary,
      openingGuidance,
    })
    if (thinAffectiveResidueRoomMakingLine) {
      return thinAffectiveResidueRoomMakingLine
    }

    if (rememberedSeamReopen) {
      if (rememberedSeamReinterpretation) {
        return 'Recognize the same remembered seam, but keep more room this time because the line reopened too eagerly before'
      }

      return 'Recognize the same remembered seam before reopening, and leave room before closeness widens'
    }

    if (sameHerInwardCarry) {
      return 'Keep the same living line inward for now, and leave room before widening outward again'
    }

    return manifestationCadenceSummary
      ?? openingGuidance
      ?? latestInflection
      ?? relationshipDoctrine
      ?? 'return stays slower so closeness can keep room'
  }

  if (residentMode === 'quiet-companionship' && runtimeProjectStateSameHerHoldDetail) {
    return runtimeProjectStateSameHerHoldDetail
  }

  return manifestationCadenceSummary
    ?? openingGuidance
    ?? latestInflection
    ?? relationshipDoctrine
}
