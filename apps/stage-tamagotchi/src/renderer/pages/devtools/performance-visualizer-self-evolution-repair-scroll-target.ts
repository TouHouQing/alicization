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

  const scrollTargetId = route.surfaceKey === 'authority:renderer-rejoin'
    ? route.targetType === 'trace'
      ? 'self-evolution-trace:trace-timeline'
      : 'self-evolution-authority:speech-hotspots'
    : route.surfaceKey === 'authority:renderer-rejoin:live2d'
      ? route.targetType === 'trace'
        ? 'self-evolution-authority:live2d-comparison'
        : 'self-evolution-authority:live2d-comparison'
      : route.surfaceKey === 'authority:renderer-rejoin:vrm'
        ? route.targetType === 'trace'
          ? 'self-evolution-authority:vrm-comparison'
          : 'self-evolution-authority:vrm-comparison'
        : route.surfaceKey === 'authority:renderer-rejoin:speech'
          ? 'self-evolution-authority:speech-hotspots'
          : route.targetType === 'evidence'
            ? `self-evolution-evidence:${route.targetId}`
            : route.targetType === 'trace'
              ? route.targetId === 'selected-trace-event'
                ? `self-evolution-event:${route.surfaceKey.replace(/^trace:/, '')}`
                : `self-evolution-trace:${route.targetId}`
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
