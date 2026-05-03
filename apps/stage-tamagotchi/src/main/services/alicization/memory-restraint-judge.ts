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

export function buildAlicizationMemoryRestraintJudge(input: {
  shouldRecall: boolean
  shouldStayInward: boolean
  memoryControl: AlicizationMemoryDeliberationLatentControls | null
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
  const unsafeDetails = memoryControl?.unsafeDetails ?? []
  const stableCore = memoryControl?.stableCore ?? []
  const contradictionPressure = (input.knowledgeEvidence?.contradictionCount ?? 0)
    + (input.knowledgeEvidence?.contradictionHeavyFactCount ?? 0) * 2
  const validationRelief = (input.knowledgeEvidence?.validationCount ?? 0)
    + (input.knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0)
  const shouldDelayUntilAfterPayoff = input.followUpAffordance?.payoffDependency === 'requires-current-payoff'
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
      return 'The turn should stay present-facing, so recollection does not need to surface.'
    if (input.shouldStayInward) {
      if (input.followUpAffordance?.intrusionRisk === 'high')
        return 'The recollection is still too intrusive to surface before the host has room for it.'
      if (unsafeDetails.length > 0)
        return 'The stable core can shape the answer, but unstable remembered detail should stay inward.'
      return 'The recollection should contour the answer from the inside instead of becoming visible.'
    }
    if (contradictionPressure > validationRelief + 1)
      return 'The remembered knowledge is still contradiction-heavy, so recollection should stay compressed until it stabilizes.'
    if (shouldDelayUntilAfterPayoff)
      return 'The recollection should not outrun the live payoff; only the stable core may surface now.'
    if (unsafeDetails.length > 0)
      return 'Only the stable remembered core should surface; unstable remembered detail stays inward.'
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
  ], 8)

  const mustNotDo = uniqueList([
    whyWithheld ? `Do not outrun this recollection boundary: ${whyWithheld}` : null,
    input.followUpAffordance?.intrusionRisk === 'high'
      ? 'Do not force recollection forward before the host has room for it.'
      : null,
    ...unsafeDetails.map(item => `Do not surface unstable remembered detail as settled fact: ${item}`),
  ], 10)

  const summary = uniqueList([
    `surface_mode=${surfaceMode}`,
    `provenance_mode=${provenanceMode}`,
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
