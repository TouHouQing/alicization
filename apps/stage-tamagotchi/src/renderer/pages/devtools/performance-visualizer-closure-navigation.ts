export interface PerformanceVisualizerClosureNavigationContext {
  source: string | null
  status: string | null
  focus: string | null
  eventFocus: string | null
}

export interface PerformanceVisualizerClosureNavigationState {
  shouldAutoFocusRepairPath: boolean
  preferredTriageCardId: 'repair-owner' | 'first-check' | 'repair-path' | null
  preferredScrollTargetId: string | null
  preferredTraceEventKind: string | null
}

function readRouteQueryValue(value: unknown) {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized || null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item !== 'string')
        continue

      const normalized = item.trim()
      if (normalized)
        return normalized
    }
  }

  return null
}

export function readPerformanceVisualizerClosureNavigationContext(query: Record<string, unknown>): PerformanceVisualizerClosureNavigationContext {
  return {
    source: readRouteQueryValue(query.source),
    status: readRouteQueryValue(query.status),
    focus: readRouteQueryValue(query.focus),
    eventFocus: readRouteQueryValue(query.eventFocus),
  }
}

export function buildPerformanceVisualizerClosureNavigationState(
  context: PerformanceVisualizerClosureNavigationContext,
): PerformanceVisualizerClosureNavigationState {
  if (context.source !== 'quick-reply-closure') {
    return {
      shouldAutoFocusRepairPath: false,
      preferredTriageCardId: null,
      preferredScrollTargetId: null,
      preferredTraceEventKind: null,
    }
  }

  const status = context.status?.toLowerCase() ?? null
  if (status === 'grounded' || status === 'closed') {
    return {
      shouldAutoFocusRepairPath: false,
      preferredTriageCardId: null,
      preferredScrollTargetId: null,
      preferredTraceEventKind: context.eventFocus,
    }
  }

  return {
    shouldAutoFocusRepairPath: true,
    preferredTriageCardId: 'repair-path',
    preferredScrollTargetId: 'self-evolution-snapshot:capture',
    preferredTraceEventKind: context.eventFocus,
  }
}
