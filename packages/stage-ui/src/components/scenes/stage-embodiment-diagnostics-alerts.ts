export interface StageEmbodimentDiagnosticsAlertEntry {
  severity: 'info' | 'warn'
  code: string
  message: string
}

export interface StageEmbodimentDiagnosticsAlertBanner {
  tone: 'info' | 'warn'
  title: string
  primary: StageEmbodimentDiagnosticsAlertEntry
  additionalCount: number
}

interface StageEmbodimentDiagnosticsRendererAlignmentEntry {
  predicted: string | null
  actual: string | null
  reason: string | null
  status: 'aligned' | 'predicted-only' | 'actual-only' | 'drifted'
  driftKind: 'aligned' | 'resident-not-yet-applied' | 'runtime-only-visible' | 'alias-resolution-drift'
  driverCue: string | null
  driverSource: string | null
}

interface StageEmbodimentDiagnosticsRendererAlignment {
  live2d: StageEmbodimentDiagnosticsRendererAlignmentEntry | null
  vrm: StageEmbodimentDiagnosticsRendererAlignmentEntry | null
}

const alertTitleByCode: Record<string, string> = {
  'renderer-live2d-drift': 'Expression drift detected',
  'renderer-live2d-runtime-only': 'Runtime expression exceeded resident prediction',
  'renderer-live2d-pending': 'Renderer synchronization pending',
  'renderer-vrm-pending': 'Renderer synchronization pending',
}

export function resolveStageEmbodimentDiagnosticsAlertBanner(
  alerts: StageEmbodimentDiagnosticsAlertEntry[],
): StageEmbodimentDiagnosticsAlertBanner | null {
  if (alerts.length === 0)
    return null

  const sortedAlerts = [...alerts].sort((left, right) => {
    if (left.severity !== right.severity)
      return left.severity === 'warn' ? -1 : 1

    return 0
  })

  const primary = sortedAlerts[0]

  return {
    tone: primary.severity,
    title: alertTitleByCode[primary.code] ?? (primary.severity === 'warn'
      ? 'Embodiment anomaly detected'
      : 'Embodiment synchronization notice'),
    primary,
    additionalCount: Math.max(sortedAlerts.length - 1, 0),
  }
}

export function resolveStageEmbodimentDiagnosticsAlertToneClasses(
  tone: 'info' | 'warn',
) {
  if (tone === 'warn') {
    return [
      'border-amber-300/40',
      'bg-amber-500/14',
      'text-amber-100',
    ] as const
  }

  return [
    'border-sky-300/30',
    'bg-sky-500/10',
    'text-sky-100',
  ] as const
}

function resolveAlertAlignmentEntry(
  code: string,
  rendererAlignment: StageEmbodimentDiagnosticsRendererAlignment,
) {
  if (code.includes('live2d'))
    return rendererAlignment.live2d
  if (code.includes('vrm'))
    return rendererAlignment.vrm
  return null
}

function formatDriverAuthority(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  if (!entry.driverCue && !entry.driverSource)
    return null

  return `cue ${entry.driverCue ?? 'none'}@${entry.driverSource ?? 'unknown'}`
}

export function buildStageEmbodimentDiagnosticsAlertReasonSummary(
  alert: StageEmbodimentDiagnosticsAlertEntry,
  rendererAlignment: StageEmbodimentDiagnosticsRendererAlignment,
) {
  const entry = resolveAlertAlignmentEntry(alert.code, rendererAlignment)
  if (!entry)
    return null

  const authority = formatDriverAuthority(entry)

  if (entry.driftKind === 'alias-resolution-drift') {
    const summary = `resident ${entry.predicted ?? 'none'} -> actual ${entry.actual ?? 'none'}`
    return authority ? `${summary} | ${authority}` : summary
  }

  if (entry.driftKind === 'resident-not-yet-applied') {
    return `resident ${entry.predicted ?? 'none'} is waiting for renderer application`
  }

  if (entry.driftKind === 'runtime-only-visible') {
    const summary = `runtime surfaced ${entry.actual ?? 'none'} before resident prediction`
    return authority ? `${summary} | ${authority}` : summary
  }

  return null
}
