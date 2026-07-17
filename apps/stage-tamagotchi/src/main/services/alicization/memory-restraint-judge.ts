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

export type AlicizationMemoryRestraintReason
  = 'recall-not-selected'
    | 'owner-inward-policy'
    | 'intrusion-risk-high'
    | 'payoff-required'
    | 'unstable-detail'
    | 'detail-budget-limited'
    | 'uncertainty-required'
    | 'contradiction-pressure'

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
  withheldReasons: AlicizationMemoryRestraintReason[]
}

function pushReason(
  reasons: AlicizationMemoryRestraintReason[],
  reason: AlicizationMemoryRestraintReason,
) {
  if (!reasons.includes(reason))
    reasons.push(reason)
}

export function buildAlicizationMemoryRestraintJudge(input: {
  shouldRecall: boolean
  shouldStayInward: boolean
  memoryControl: AlicizationMemoryDeliberationLatentControls | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
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
  const contradictionPressure = (input.knowledgeEvidence?.contradictionCount ?? 0)
    + (input.knowledgeEvidence?.contradictionHeavyFactCount ?? 0) * 2
  const validationRelief = (input.knowledgeEvidence?.validationCount ?? 0)
    + (input.knowledgeEvidence?.stronglyValidatedProcedureCount ?? 0)
  const contradictionDominates = contradictionPressure > validationRelief + 1
  const shouldDelayUntilAfterPayoff
    = input.followUpAffordance?.payoffDependency === 'requires-current-payoff'
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
    || contradictionDominates
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
  const surfaceMode = input.shouldStayInward
    ? 'inward-only' as const
    : shouldOnlySurfaceStableCore
      ? 'stable-core-only' as const
      : shouldLabelProvenance || shouldLabelHypothesis
        ? 'provenance-labeled' as const
        : 'free' as const
  const withheldReasons: AlicizationMemoryRestraintReason[] = []

  if (!input.shouldRecall)
    pushReason(withheldReasons, 'recall-not-selected')
  if (input.shouldStayInward)
    pushReason(withheldReasons, 'owner-inward-policy')
  if (input.followUpAffordance?.intrusionRisk === 'high')
    pushReason(withheldReasons, 'intrusion-risk-high')
  if (shouldDelayUntilAfterPayoff)
    pushReason(withheldReasons, 'payoff-required')
  if (unsafeDetails.length > 0)
    pushReason(withheldReasons, 'unstable-detail')
  if (memoryControl?.detailAssertionBudget !== undefined && memoryControl.detailAssertionBudget !== 'open')
    pushReason(withheldReasons, 'detail-budget-limited')
  if (memoryControl?.labelUncertainty === true)
    pushReason(withheldReasons, 'uncertainty-required')
  if (contradictionDominates)
    pushReason(withheldReasons, 'contradiction-pressure')

  return {
    surfaceMode,
    provenanceMode,
    shouldStayInward: input.shouldStayInward,
    shouldOnlySurfaceStableCore,
    shouldLabelProvenance,
    shouldLabelHypothesis,
    shouldSuppressSpecificity,
    shouldDelayUntilAfterPayoff,
    withheldReasons,
  } satisfies AlicizationMemoryRestraintJudge
}
