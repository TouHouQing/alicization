interface SelfEvolutionRepairActionRouteLike {
  surfaceKey: string
  targetType: 'evidence' | 'trace' | 'event' | 'snapshot'
  targetId: string
}

interface SelfEvolutionRepairScrollTargetLike {
  scrollTargetId: string
  targetType: 'evidence' | 'trace' | 'event' | 'snapshot'
  targetId: string
}

export function buildSelfEvolutionRepairFollowupNavigation(input: {
  executedRoute: SelfEvolutionRepairActionRouteLike | null
  refreshedRoute: SelfEvolutionRepairActionRouteLike | null
  refreshedScrollTarget: SelfEvolutionRepairScrollTargetLike | null
}) {
  if (input.refreshedRoute) {
    return {
      activeSurfaceKey: input.refreshedRoute.surfaceKey,
      scrollTargetId: input.refreshedScrollTarget?.scrollTargetId ?? null,
    }
  }

  if (input.executedRoute) {
    return {
      activeSurfaceKey: input.executedRoute.surfaceKey,
      scrollTargetId: null,
    }
  }

  return null
}
