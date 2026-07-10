import type { AlicizationHostPersonModelSnapshot } from '../../../shared/eventa'
import type {
  AlicizationMemoryDeliberationLatentControls,
} from './memory-deliberation-latent-controls'
import type { AlicizationTruthDisciplineFlags } from './truth-discipline'

export type AlicizationMemoryRestraintSurfaceMode
  = 'inward-only'
    | 'stable-core-only'
    | 'provenance-labeled'
    | 'free'

export interface AlicizationMemoryRestraintJudge {
  surfaceMode: AlicizationMemoryRestraintSurfaceMode
  provenanceMode:
    | 'none'
    | 'memory'
    | 'dream-residue'
    | 'inferred-pattern'
    | 'reconstructed-memory'
    | 'mixed-memory'
  shouldStayInward: boolean
  shouldOnlySurfaceStableCore: boolean
  shouldLabelProvenance: boolean
  shouldLabelHypothesis: boolean
  shouldSuppressSpecificity: boolean
  shouldDelayUntilAfterPayoff: boolean
  whyWithheld: string | null
  summary: string
  mustDo: string[]
  mustNotDo: string[]
}

export interface AlicizationMemorySocialBoundarySummary {
  trustStage: AlicizationHostPersonModelSnapshot['trustLadder']['stage'] | null
  preferredCloseness: string | null
  trustRationale: string | null
  roomFirstSignal: boolean
  boundaryFirstSignal: boolean
  repairFirstSignal: boolean
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 220)
    if (!normalized)
      continue
    if (result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function buildMemorySocialBoundarySummary(hostPersonModel: AlicizationHostPersonModelSnapshot | null | undefined): AlicizationMemorySocialBoundarySummary | null {
  const model = hostPersonModel ?? null
  if (!model)
    return null

  const preferredCloseness = sanitizeText(model.preferredClosenessByContext?.[0]?.preference, 160) || null
  const trustRationale = sanitizeText(model.trustLadder?.rationale, 220) || null
  const cueText = [preferredCloseness, trustRationale].filter(Boolean).join(' ')

  return {
    trustStage: model.trustLadder?.stage ?? null,
    preferredCloseness,
    trustRationale,
    roomFirstSignal: /room[-\s]?first|leave room|give space|work[-\s]?focus|respect.*space|先留空间|先给空间|工作优先/u.test(cueText),
    boundaryFirstSignal: /boundary|respect.*boundary|do not crowd|avoid pressure|边界|别逼|不要压/u.test(cueText),
    repairFirstSignal: /repair|grounded repair|specific repair|stabilize|修复|先修|先稳住/u.test(cueText),
  }
}

export function buildAlicizationMemoryRestraintJudge(input: {
  shouldRecall: boolean
  shouldStayInward: boolean
  memoryControl: AlicizationMemoryDeliberationLatentControls | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  socialBoundarySummary?: AlicizationMemorySocialBoundarySummary | null
  knowledgeEvidence?: {
    validationCount?: number | null
    contradictionCount?: number | null
    stronglyValidatedProcedureCount?: number | null
    contradictionHeavyFactCount?: number | null
  } | null
  followUpAffordance: {
    intrusionRisk?: 'low' | 'medium' | 'high'
    payoffDependency?: 'memory-only' | 'requires-current-payoff' | 'can-surface-softly'
  } | null
  truthDiscipline?: Pick<AlicizationTruthDisciplineFlags, 'shouldLabelHypothesis' | 'forbidUnsupportedSpecificity'> | null
}) {
  const memoryControl = input.memoryControl ?? null
  const socialBoundarySummary = input.socialBoundarySummary
    ?? buildMemorySocialBoundarySummary(input.hostPersonModel)
    ?? null
  const unsafeDetails = memoryControl?.unsafeDetails ?? []
  const stableCore = memoryControl?.stableCore ?? []
  const contradictionPressure = (input.knowledgeEvidence?.contradictionCount ?? 0)
    + (input.knowledgeEvidence?.contradictionHeavyFactCount ?? 0) * 2
  const validationRelief = (input.knowledgeEvidence?.validationCount ?? 0)
    + (input.knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0)
  const hostBoundaryPressure = Number(
    Boolean(socialBoundarySummary?.roomFirstSignal)
    || Boolean(socialBoundarySummary?.boundaryFirstSignal)
    || Boolean(socialBoundarySummary?.repairFirstSignal),
  )
  const shouldDelayUntilAfterPayoff = input.followUpAffordance?.payoffDependency === 'requires-current-payoff'
    || (
      hostBoundaryPressure > 0
      && input.followUpAffordance?.payoffDependency !== 'memory-only'
    )
  const provenanceMode = (() => {
    if (!memoryControl)
      return 'none' as const
    if (memoryControl.provenancePosture === 'dream-residue')
      return 'dream-residue' as const
    if (memoryControl.provenancePosture === 'inferred-pattern')
      return 'inferred-pattern' as const
    if (memoryControl.provenancePosture === 'reconstructed-memory')
      return 'reconstructed-memory' as const
    if (memoryControl.provenancePosture === 'mixed-memory')
      return 'mixed-memory' as const
    return 'memory' as const
  })()
  const shouldOnlySurfaceStableCore = !input.shouldStayInward && (
    unsafeDetails.length > 0
    || memoryControl?.detailAssertionBudget !== 'open'
    || memoryControl?.labelUncertainty === true
    || shouldDelayUntilAfterPayoff
    || contradictionPressure > validationRelief
    || hostBoundaryPressure > 0
  )
  const shouldLabelProvenance = provenanceMode !== 'memory' && provenanceMode !== 'none'
  const shouldLabelHypothesis = input.truthDiscipline?.shouldLabelHypothesis === true
    || memoryControl?.labelUncertainty === true
    || provenanceMode === 'inferred-pattern'
    || provenanceMode === 'reconstructed-memory'
    || provenanceMode === 'mixed-memory'
  const shouldSuppressSpecificity = input.truthDiscipline?.forbidUnsupportedSpecificity === true
    || memoryControl?.detailAssertionBudget !== 'open'
    || unsafeDetails.length > 0

  const whyWithheld = sanitizeText((() => {
    if (!input.shouldRecall)
      return 'withheld_reason=present_facing_turn; recollection_surface=false'
    if (input.shouldStayInward) {
      if (input.followUpAffordance?.intrusionRisk === 'high')
        return 'withheld_reason=intrusion_risk_high; host_room_required=true'
      if (socialBoundarySummary?.roomFirstSignal || socialBoundarySummary?.boundaryFirstSignal)
        return 'withheld_reason=host_boundary_room_first; recollection_role=contour_only'
      if (unsafeDetails.length > 0)
        return 'withheld_reason=unstable_detail; stable_core=internal_only'
      return 'withheld_reason=inward_recollection; visible_memory=false'
    }
    if (socialBoundarySummary?.repairFirstSignal)
      return 'withheld_reason=repair_first_payoff; stable_core_only=true; bond_widening=deferred'
    if (socialBoundarySummary?.roomFirstSignal || socialBoundarySummary?.boundaryFirstSignal)
      return 'withheld_reason=bond_room_first; stable_core_only=true'
    if (contradictionPressure > validationRelief + 1)
      return 'withheld_reason=contradiction_pressure; recollection_compression=required'
    if (shouldDelayUntilAfterPayoff)
      return 'withheld_reason=live_payoff_first; stable_core_only=true'
    if (unsafeDetails.length > 0)
      return 'withheld_reason=unstable_detail; stable_core_only=true'
    return ''
  })(), 220) || null

  const surfaceMode = input.shouldStayInward
    ? 'inward-only' as const
    : shouldOnlySurfaceStableCore
      ? 'stable-core-only' as const
      : shouldLabelProvenance || shouldLabelHypothesis
        ? 'provenance-labeled' as const
        : 'free' as const

  const mustDo = uniqueList([
    shouldOnlySurfaceStableCore
      ? 'If recollection becomes visible, let the stable remembered core do the work before any fragmentary detail.'
      : null,
    shouldLabelProvenance && provenanceMode === 'dream-residue'
      ? 'If recollection becomes explicit, frame it as dream residue rather than lived fact.'
      : null,
    shouldLabelProvenance && provenanceMode === 'inferred-pattern'
      ? 'If recollection becomes explicit, frame it as inference or likely continuity rather than settled memory.'
      : null,
    shouldLabelProvenance && provenanceMode === 'reconstructed-memory'
      ? 'If recollection becomes explicit, keep it approximate and centered on the stable core.'
      : null,
    shouldLabelHypothesis
      ? 'If recollection goes beyond direct remembered support, label it as tentative, approximate, or hypothesis-level.'
      : null,
    input.followUpAffordance?.intrusionRisk === 'high'
      ? 'If recollection is pressing forward too hard, keep recollection inward until the host has room for it.'
      : null,
    socialBoundarySummary?.roomFirstSignal || socialBoundarySummary?.boundaryFirstSignal
      ? 'If recollection becomes visible, keep it room-first and boundary-respecting rather than intimacy-seeking.'
      : null,
    socialBoundarySummary?.repairFirstSignal
      ? 'If recollection becomes visible, let present repair payoff land before widening into relationship continuity.'
      : null,
  ], 8)

  const mustNotDo = uniqueList([
    whyWithheld ? `Do not outrun this recollection boundary: ${whyWithheld}` : null,
    input.followUpAffordance?.intrusionRisk === 'high'
      ? 'Do not force recollection forward before the host has room for it.'
      : null,
    socialBoundarySummary?.roomFirstSignal || socialBoundarySummary?.boundaryFirstSignal
      ? 'Do not turn recollection into pressure when the host model is asking for room and boundary respect.'
      : null,
    socialBoundarySummary?.repairFirstSignal
      ? 'Do not widen recollection into relationship payoff before the concrete repair thread has landed.'
      : null,
    ...unsafeDetails.map(item => `Do not surface unstable remembered detail as settled fact: ${item}`),
  ], 10)

  const summary = uniqueList([
    `surface_mode=${surfaceMode}`,
    `provenance_mode=${provenanceMode}`,
    socialBoundarySummary?.roomFirstSignal ? 'host_room_first=yes' : null,
    socialBoundarySummary?.boundaryFirstSignal ? 'host_boundary_first=yes' : null,
    socialBoundarySummary?.repairFirstSignal ? 'host_repair_first=yes' : null,
    shouldLabelHypothesis ? 'label_hypothesis=yes' : 'label_hypothesis=no',
    shouldSuppressSpecificity ? 'suppress_specificity=yes' : 'suppress_specificity=no',
    whyWithheld ? `why_withheld=${whyWithheld}` : null,
    stableCore.length > 0 ? `stable_core=${stableCore[0]}` : null,
  ], 6).join(' | ')

  return {
    surfaceMode,
    provenanceMode,
    shouldStayInward: input.shouldStayInward,
    shouldOnlySurfaceStableCore,
    shouldLabelProvenance,
    shouldLabelHypothesis,
    shouldSuppressSpecificity,
    shouldDelayUntilAfterPayoff,
    whyWithheld,
    summary,
    mustDo,
    mustNotDo,
  } satisfies AlicizationMemoryRestraintJudge
}
