import type { OrganicMemoryPromptContext } from './runtime-soul'

export interface AlicizationRecollectionSurfaceControls {
  shouldSurface: boolean
  visibility:
    | 'internal-only'
    | 'brief-before-payoff'
    | 'embedded-payoff'
    | 'brief-after-payoff'
  continuityRole:
    | 'memory-carry'
    | 'period-carry'
    | 'procedure-carry'
    | 'relationship-carry'
  certainty: 'firm' | 'approximate' | 'fragmentary'
  templateBoundary: 'guard-against-drafted-wording'
}

export function deriveRecollectionSurfaceControls(
  plan: OrganicMemoryPromptContext['recollectionSpeechPlan'] | null | undefined,
): AlicizationRecollectionSurfaceControls | null {
  const speechPlan = plan ?? null
  if (!speechPlan)
    return null

  const shouldSurface = speechPlan.shouldSurface
    && speechPlan.surfaceMode !== 'internal-only'
    && speechPlan.placement !== 'internal-only'

  const visibility: AlicizationRecollectionSurfaceControls['visibility'] = !shouldSurface
    ? 'internal-only'
    : speechPlan.placement === 'before-payoff'
      ? 'brief-before-payoff'
      : speechPlan.placement === 'after-payoff'
        ? 'brief-after-payoff'
        : 'embedded-payoff'

  const continuityRole: AlicizationRecollectionSurfaceControls['continuityRole']
    = speechPlan.surfaceMode === 'procedural-carry'
      ? 'procedure-carry'
      : speechPlan.surfaceMode === 'relationship-continuity'
        ? 'relationship-carry'
        : speechPlan.surfaceMode === 'gist-first'
          ? 'period-carry'
          : 'memory-carry'

  return {
    shouldSurface,
    visibility,
    continuityRole,
    certainty: speechPlan.certainty,
    templateBoundary: 'guard-against-drafted-wording',
  }
}
