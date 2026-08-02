import {
  formatSelfEvolutionEventKindLabel,
  formatSelfEvolutionEvidencePanelLabel,
  formatSelfEvolutionTraceSectionLabel,
} from './performance-visualizer-self-evolution-focus-history-display'

interface SelfEvolutionRepairSession {
  completionPercent: number
  completedCount: number
  totalCount: number
  completedChecklist: string[]
  remainingChecklist: string[]
  summaryLines: string[]
  bodyContinuityPhase?: 'body-only-hold' | 'body-carried-to-renderer-rejoin' | 'full-cross-modal-lock' | 'renderer-rejoin-without-body' | null
  survivingVisibleLane?: 'face+lipsync-only' | 'motion+lipsync-only' | 'face+lipsync+voice-only' | 'motion+lipsync+voice-only' | null
  rendererTarget?: 'live2d' | 'vrm' | 'speech' | null
  rendererRejoinSurfaceKey?: string | null
}

interface SelfEvolutionRepairClosure {
  isClosed: boolean
  summaryLines: string[]
}

interface SelfEvolutionRepairNextAction {
  kind: string
  label: string
  detail: string
  targetType: 'evidence' | 'trace' | 'event' | 'snapshot'
  targetId: string
  preferredEventKind: string | null
  surfaceKeyOverride?: string
}

function resolveSurfaceKeyOverride(session: SelfEvolutionRepairSession) {
  if (
    session.rendererRejoinSurfaceKey
    && (
      session.bodyContinuityPhase === 'body-carried-to-renderer-rejoin'
      || session.bodyContinuityPhase === 'full-cross-modal-lock'
      || session.bodyContinuityPhase === 'renderer-rejoin-without-body'
    )
  ) {
    return session.rendererRejoinSurfaceKey
  }
  return undefined
}

function buildSessionFactLine(session: SelfEvolutionRepairSession) {
  return [
    `completion=${session.completedCount}/${session.totalCount} (${session.completionPercent}%)`,
    `bodyContinuityPhase=${session.bodyContinuityPhase ?? 'n/a'}`,
    `rendererRejoinSurfaceKey=${session.rendererRejoinSurfaceKey ?? 'n/a'}`,
    `survivingVisibleLane=${session.survivingVisibleLane ?? 'n/a'}`,
  ].join('; ')
}

export function buildSelfEvolutionRepairNextAction(input: {
  repairSession: SelfEvolutionRepairSession | null
  repairClosure: SelfEvolutionRepairClosure | null
}): SelfEvolutionRepairNextAction | null {
  const session = input.repairSession
  const closure = input.repairClosure
  if (!session || !closure)
    return null

  if (closure.isClosed) {
    return {
      kind: 'capture-baseline',
      label: 'Capture baseline snapshot',
      detail: `repairClosure.isClosed=true; ${buildSessionFactLine(session)}`,
      targetType: 'snapshot',
      targetId: 'baseline',
      preferredEventKind: null,
    }
  }

  if (session.remainingChecklist.length === 0) {
    return {
      kind: 'capture-snapshot',
      label: 'Capture validation snapshot',
      detail: `repairClosure.isClosed=false; remainingChecklist=none; ${buildSessionFactLine(session)}`,
      targetType: 'snapshot',
      targetId: 'validation',
      preferredEventKind: null,
    }
  }

  const nextItem = session.remainingChecklist[0]
  if (!nextItem)
    return null

  const separatorIndex = nextItem.indexOf(':')
  if (separatorIndex < 0)
    return null

  const targetType = nextItem.slice(0, separatorIndex)
  const targetId = nextItem.slice(separatorIndex + 1)
  const detail = `nextChecklistItem=${nextItem}; ${buildSessionFactLine(session)}`
  const surfaceKeyOverride = resolveSurfaceKeyOverride(session)

  if (targetType === 'evidence') {
    return {
      kind: 'inspect-evidence',
      label: `Inspect ${formatSelfEvolutionEvidencePanelLabel(targetId)}`,
      detail,
      targetType,
      targetId,
      preferredEventKind: null,
      surfaceKeyOverride,
    }
  }

  if (targetType === 'trace') {
    return {
      kind: 'inspect-trace',
      label: `Inspect ${formatSelfEvolutionTraceSectionLabel(targetId)}`,
      detail,
      targetType,
      targetId,
      preferredEventKind: null,
      surfaceKeyOverride,
    }
  }

  if (targetType === 'event') {
    return {
      kind: 'inspect-event',
      label: `Inspect ${formatSelfEvolutionEventKindLabel(targetId)}`,
      detail,
      targetType,
      targetId,
      preferredEventKind: null,
    }
  }

  return null
}
