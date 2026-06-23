export interface PerformanceVisualizerClosureNavigationContext {
  source: string | null
  status: string | null
  focus: string | null
  eventFocus: string | null
  sameHerFocus: string | null
  sameHerClosureStage: string | null
}

export interface PerformanceVisualizerClosureNavigationState {
  shouldAutoFocusRepairPath: boolean
  preferredTriageCardId: 'repair-owner' | 'first-check' | 'repair-path' | null
  preferredScrollTargetId: string | null
  preferredTraceEventKind: string | null
}

function resolvePreferredTraceEventKind(
  eventFocus: string | null,
  fallback: string,
) {
  if (eventFocus === 'renderer-authority')
    return 'person-state-updated'

  return eventFocus ?? fallback
}

function readRouteQueryValue(value: unknown) {
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized || null
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string') {
        const normalized = item.trim()
        if (normalized)
          return normalized
      }
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
    sameHerFocus: readRouteQueryValue(query.sameHerFocus),
    sameHerClosureStage: readRouteQueryValue(query.sameHerClosureStage),
  }
}

export function buildPerformanceVisualizerClosureNavigationState(
  context: PerformanceVisualizerClosureNavigationContext,
): PerformanceVisualizerClosureNavigationState {
  const focus = context.focus?.toLowerCase() ?? null
  const status = context.status?.toLowerCase() ?? null
  const sameHerFocus = context.sameHerFocus?.toLowerCase() ?? null
  const sameHerClosureStage = context.sameHerClosureStage?.toLowerCase() ?? null
  const fromClosureEntry = context.source === 'quick-reply-closure'

  if (!fromClosureEntry) {
    return {
      shouldAutoFocusRepairPath: false,
      preferredTriageCardId: null,
      preferredScrollTargetId: null,
      preferredTraceEventKind: null,
    }
  }

  if (focus === 'same-her-continuity') {
    if (sameHerFocus === 'body-continuity') {
      if (sameHerClosureStage === 'body-only-hold') {
        return {
          shouldAutoFocusRepairPath: true,
          preferredTriageCardId: 'repair-owner',
          preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity-body-only-hold',
          preferredTraceEventKind: 'takeover-audit',
        }
      }

      if (sameHerClosureStage === 'body-carried-to-renderer-rejoin') {
        return {
          shouldAutoFocusRepairPath: true,
          preferredTriageCardId: 'repair-owner',
          preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity-body-carried-to-renderer-rejoin',
          preferredTraceEventKind: 'takeover-audit',
        }
      }

      if (sameHerClosureStage === 'full-cross-modal-lock') {
        return {
          shouldAutoFocusRepairPath: true,
          preferredTriageCardId: 'repair-owner',
          preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity-full-cross-modal-lock',
          preferredTraceEventKind: 'takeover-audit',
        }
      }

      if (sameHerClosureStage === 'audible-body-carry') {
        return {
          shouldAutoFocusRepairPath: true,
          preferredTriageCardId: 'repair-owner',
          preferredScrollTargetId: 'self-evolution-speech:observability-summary',
          preferredTraceEventKind: 'takeover-audit',
        }
      }

      return {
        shouldAutoFocusRepairPath: true,
        preferredTriageCardId: 'repair-owner',
        preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity-projection',
        preferredTraceEventKind: 'takeover-audit',
      }
    }

    if (sameHerClosureStage === 'voice-lipsync-carry') {
      return {
        shouldAutoFocusRepairPath: true,
        preferredTriageCardId: 'repair-owner',
        preferredScrollTargetId: 'self-evolution-authority:speech-hotspots',
        preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'person-state-updated'),
      }
    }

    if (sameHerClosureStage === 'voice-only-carry') {
      return {
        shouldAutoFocusRepairPath: true,
        preferredTriageCardId: 'repair-owner',
        preferredScrollTargetId: 'self-evolution-speech:observability-summary',
        preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'person-state-updated'),
      }
    }

    if (sameHerClosureStage === 'renderer-rejoin-without-body') {
      return {
        shouldAutoFocusRepairPath: true,
        preferredTriageCardId: 'repair-owner',
        preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity-renderer-rejoin-without-body',
        preferredTraceEventKind: 'takeover-audit',
      }
    }

    return {
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-owner',
      preferredScrollTargetId: 'self-evolution-evidence:renderer-authority-projection',
      preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'person-state-updated'),
    }
  }

  if (focus === 'emotional-closure') {
    return {
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-path',
      preferredScrollTargetId: 'self-evolution-evidence:proactive-decision-consumption',
      preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'takeover-audit'),
    }
  }

  if (focus === 'project-state') {
    return {
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'first-check',
      preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity',
      preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'takeover-audit'),
    }
  }

  if (focus === 'pre-dialogue-briefing') {
    return {
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'first-check',
      preferredScrollTargetId: 'self-evolution-evidence:runtime-continuity',
      preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'takeover-audit'),
    }
  }

  if (focus === 'project-identity') {
    return {
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'first-check',
      preferredScrollTargetId: 'self-evolution-evidence:candidate-trajectory-summary',
      preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'takeover-audit'),
    }
  }

  if (focus === 'current-phase') {
    return {
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'first-check',
      preferredScrollTargetId: 'self-evolution-evidence:identity-drift-governance-summary',
      preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'takeover-audit'),
    }
  }

  if (focus === 'unresolved-open-loop') {
    return {
      shouldAutoFocusRepairPath: true,
      preferredTriageCardId: 'repair-path',
      preferredScrollTargetId: 'self-evolution-evidence:proactive-decision-consumption-summary',
      preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'takeover-audit'),
    }
  }

  if (status === 'grounded' || status === 'closed') {
    return {
      shouldAutoFocusRepairPath: false,
      preferredTriageCardId: 'first-check',
      preferredScrollTargetId: 'self-evolution-snapshot:capture',
      preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'governance-normalized'),
    }
  }

  return {
    shouldAutoFocusRepairPath: true,
    preferredTriageCardId: 'repair-path',
    preferredScrollTargetId: 'self-evolution-snapshot:capture',
    preferredTraceEventKind: resolvePreferredTraceEventKind(context.eventFocus, 'takeover-audit'),
  }
}
