interface SelfEvolutionRepairNextActionLike {
  kind: string
  label: string
  detail: string
  targetType: 'evidence' | 'trace' | 'event' | 'snapshot'
  targetId: string
}

export function buildSelfEvolutionRepairActionRoute(
  nextAction: SelfEvolutionRepairNextActionLike | null,
) {
  if (!nextAction)
    return null

  return {
    surfaceKey: `${nextAction.targetType}:${nextAction.targetId}`,
    targetType: nextAction.targetType,
    targetId: nextAction.targetId,
  }
}
