import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationRuntimeProjectStateDigest,
} from './alicization-transport-contracts'

import { sanitizeAlicizationStructuredInternalText } from './alicization-fixed-template-sanitizer'

const measuredReturnInwardCarryReason
  = 'cadence=measured_return; direction=inward; widening=deferred; pressure=lower'

const repairBeforeClosenessReason
  = 'cadence=repair_before_closeness; target=callback; repair=settle_first; widening=deferred'

const rememberedBoundaryPreserveReason
  = 'relationship_cadence=remembered_boundary; room=preserve_before_widening'

const rememberedBoundaryMoreRoomReason
  = 'relationship_cadence=remembered_boundary; room=more; prior_reentry=eager'

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

function finalizeCompanionshipReason(value: string | null | undefined) {
  const normalized = normalizeCompanionshipReasonText(value)
  if (!normalized)
    return null

  const neutralized = normalized
    .replace(/\bcontinuity_hold=/giu, 'cadence=')
    .replace(/\bcontinuity_anchor=/giu, 'anchor=')
    .replace(/\bproject_state_continuity\b/giu, 'project_state_review')
    .replace(/\blife_loop_continuity\b/giu, 'life_loop_review')
    .replace(/\bcross_modal_continuity_proof\b/giu, 'embodiment_scale_validation')
    .replace(/\s*(?:[;|,]\s*)?visibility=internal(?:[-_][a-z0-9]+)?\.?/giu, '')
    .trim()

  return sanitizeAlicizationStructuredInternalText(neutralized, 360, '')
    .replace(/\bcontinuity_hold=/giu, 'cadence=')
    .replace(/\s*(?:[;|,]\s*)?visibility=internal(?:[-_][a-z0-9]+)?\.?/giu, '')
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

function hasStructuredContinuityCarryEvidence(value: string | null | undefined) {
  const normalized = normalizeCompanionshipReasonText(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return /(?:^|[\s|;])(?:cadence|continuity_hold|continuity_anchor|project_state_continuity|life_loop_continuity|memory_dialogue_embodiment_closure|cross_modal_continuity_proof|callback_continuity|relationship_cadence|closure_gap|open_loop|owner|evidence|trace|source)=/u.test(normalized)
    || /(?:^|[\s|;])local_desktop_life_loop(?:[\s|;]|$)/u.test(normalized)
}

function hasInwardRestraintEvidence(value: string | null | undefined) {
  const normalized = normalizeCompanionshipReasonText(value)?.toLowerCase() ?? ''
  if (!normalized)
    return false

  return /(?:^|[\s|;])(?:direction=inward|widening=deferred|pressure=lower|room=more|reopen_from_scratch=false|timing=next_open_window|(?:cadence|continuity_hold)=(?:measured_return|repair_before_closeness|rest_protective|quiet_companionship|inward)|relationship_cadence=remembered_boundary)/u.test(normalized)
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

  return hasStructuredContinuityCarryEvidence(merged) && hasInwardRestraintEvidence(merged)
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

  return hasStructuredContinuityCarryEvidence(merged) && hasInwardRestraintEvidence(merged)
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
    return `closure_gap=${gapLabels}; risk=project_shell; widening=deferred`
  }

  if (hasSameHerLine) {
    return `closure_gap=${gapLabels}; status=open; widening=deferred`
  }

  return `closure_gap=${gapLabels}; widening=deferred`
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
      return finalizeCompanionshipReason(runtimeProjectStateSameHerHoldDetail)
    }

    const concreteLifeLoopGapReason = extractConcreteLifeLoopGapReason({
      manifestationCadenceSummary,
      openingGuidance,
      relationshipDoctrine,
      latestInflection,
    })
    if (concreteLifeLoopGapReason) {
      return finalizeCompanionshipReason(concreteLifeLoopGapReason)
    }

    if (memoryDeliberationRepairCadence) {
      return finalizeCompanionshipReason('memory_deliberation=repair_before_closeness; repair=settle_first; widening=deferred')
    }

    if (sameHerInwardCarry) {
      return finalizeCompanionshipReason(repairBeforeClosenessReason)
    }

    return finalizeCompanionshipReason(
      relationshipDoctrine
      ?? runtimeProjectStateEmotionalClosureCue
      ?? openingGuidance
      ?? latestInflection
      ?? manifestationCadenceSummary
      ?? 'cadence=repair_before_closeness; repair=settle_first; widening=deferred',
    )
  }

  if (residentMode === 'measured-return') {
    if (
      runtimeProjectStateSameHerHoldDetail
      && rememberedSeamReopen
      && rememberedSeamReinterpretation
      && looksLikeGenericSameHerHoldDetail(runtimeProjectStateSameHerHoldDetail)
    ) {
      return finalizeCompanionshipReason(rememberedBoundaryMoreRoomReason)
    }

    if (runtimeProjectStateSameHerHoldDetail) {
      return finalizeCompanionshipReason(runtimeProjectStateSameHerHoldDetail)
    }

    const concreteLifeLoopGapReason = extractConcreteLifeLoopGapReason({
      manifestationCadenceSummary,
      openingGuidance,
      relationshipDoctrine,
      latestInflection,
    })
    if (concreteLifeLoopGapReason) {
      return finalizeCompanionshipReason(concreteLifeLoopGapReason)
    }

    if (memoryDeliberationMeasuredCadence) {
      return finalizeCompanionshipReason('memory_deliberation=measured_return; pressure=lower; widening=deferred')
    }

    const thinAffectiveResidueRoomMakingLine = extractThinAffectiveResidueRoomMakingLine({
      manifestationCadenceSummary,
      openingGuidance,
    })
    if (thinAffectiveResidueRoomMakingLine) {
      return finalizeCompanionshipReason(thinAffectiveResidueRoomMakingLine)
    }

    if (rememberedSeamReopen) {
      if (rememberedSeamReinterpretation) {
        return finalizeCompanionshipReason(rememberedBoundaryMoreRoomReason)
      }

      return finalizeCompanionshipReason(rememberedBoundaryPreserveReason)
    }

    if (sameHerInwardCarry) {
      return finalizeCompanionshipReason(measuredReturnInwardCarryReason)
    }

    return finalizeCompanionshipReason(
      manifestationCadenceSummary
      ?? openingGuidance
      ?? latestInflection
      ?? relationshipDoctrine
      ?? 'cadence=measured_return; pressure=lower; room=preserve',
    )
  }

  if (residentMode === 'quiet-companionship' && runtimeProjectStateSameHerHoldDetail) {
    return finalizeCompanionshipReason(runtimeProjectStateSameHerHoldDetail)
  }

  return finalizeCompanionshipReason(
    manifestationCadenceSummary
    ?? openingGuidance
    ?? latestInflection
    ?? relationshipDoctrine,
  )
}
