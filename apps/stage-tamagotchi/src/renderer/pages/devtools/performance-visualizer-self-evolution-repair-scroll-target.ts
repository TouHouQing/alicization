interface SelfEvolutionRepairActionRouteLike {
  surfaceKey: string
  targetType: 'evidence' | 'trace' | 'event' | 'snapshot'
  targetId: string
}

export function buildSelfEvolutionRepairScrollTarget(
  route: SelfEvolutionRepairActionRouteLike | null,
) {
  if (!route)
    return null

  const scrollTargetId = route.targetType === 'evidence'
    ? `self-evolution-evidence:${route.targetId}`
    : route.targetType === 'trace'
      ? `self-evolution-trace:${route.targetId}`
      : route.targetType === 'event'
        ? `self-evolution-event:${route.targetId}`
        : route.targetId === 'baseline'
          ? 'self-evolution-snapshot:capture'
          : 'self-evolution-snapshot:history'

  return {
    scrollTargetId,
    targetType: route.targetType,
    targetId: route.targetId,
  }
}
