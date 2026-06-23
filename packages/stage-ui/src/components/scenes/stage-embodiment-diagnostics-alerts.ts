import { normalizeAlicizationRendererHintToken } from '@proj-alicization/stage-shared'

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
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  reasonTags?: readonly string[] | null
  signature?: string | null
  status: 'aligned' | 'predicted-only' | 'actual-only' | 'drifted'
  driftKind: 'aligned' | 'resident-not-yet-applied' | 'runtime-only-visible' | 'alias-resolution-drift'
  faceDriverCue: string | null
  faceDriverSource: string | null
  faceDriverSegmentId?: string | null
  motionDriverCue: string | null
  motionDriverSource: string | null
  motionDriverSegmentId?: string | null
  bodyDriverSegmentId?: string | null
  lipsyncDriverSegmentId?: string | null
  voiceDriverSegmentId?: string | null
}

function formatExplicitSameHerContinuity(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const signature = typeof entry.signature === 'string'
    ? entry.signature.trim()
    : null
  const reasonTags = (entry.reasonTags ?? [])
    .map(tag => typeof tag === 'string' ? tag.trim() : '')
    .filter(Boolean)
  const explicitContinuityTags = [
    signature,
    ...reasonTags,
  ].filter((value): value is string =>
    value === 'embodiment:audible-same-her-line'
    || value === 'embodiment:body+voice-only'
    || value === 'embodiment:body-lipsync-voice-rejoin',
  )

  const normalizedHintTokens = [
    signature,
    ...reasonTags,
  ]
    .map(value => normalizeAlicizationRendererHintToken(value))
    .filter((value): value is string => Boolean(value))

  if (normalizedHintTokens.some(value =>
    value.includes('embodiment:still_voiced_face_motion_line')
    || value.includes('still_voiced_face_motion_line'),
  )) {
    explicitContinuityTags.push('embodiment:still-voiced-face-motion-line')
  }

  if (normalizedHintTokens.some(value =>
    value.includes('embodiment:still_voiced_face_lipsync_line')
    || value.includes('still_voiced_face_lipsync_line'),
  )) {
    explicitContinuityTags.push(
      'embodiment:still-voiced-face-lipsync-line',
      'embodiment:still-voiced-face-line',
    )
  }

  if (normalizedHintTokens.some(value =>
    value.includes('embodiment:still_voiced_face_line')
    || value.includes('still_voiced_face_line'),
  )) {
    explicitContinuityTags.push('embodiment:still-voiced-face-line')
  }

  if (normalizedHintTokens.some(value =>
    value.includes('embodiment:still_voiced_motion_lipsync_line')
    || value.includes('still_voiced_motion_lipsync_line'),
  )) {
    explicitContinuityTags.push(
      'embodiment:still-voiced-motion-lipsync-line',
      'embodiment:still-voiced-motion-line',
    )
  }

  if (normalizedHintTokens.some(value =>
    value.includes('embodiment:still_voiced_motion_line')
    || value.includes('still_voiced_motion_line'),
  )) {
    explicitContinuityTags.push('embodiment:still-voiced-motion-line')
  }

  if (explicitContinuityTags.length === 0)
    return null

  return `continuity=${[...new Set(explicitContinuityTags)].join('+')}`
}

function formatExplicitSameHerSignature(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const signature = typeof entry.signature === 'string'
    ? entry.signature.trim()
    : null

  return signature ? `signature=${signature}` : null
}

interface StageEmbodimentDiagnosticsRendererAlignment {
  live2d: StageEmbodimentDiagnosticsRendererAlignmentEntry | null
  vrm: StageEmbodimentDiagnosticsRendererAlignmentEntry | null
}

const alertTitleByCode: Record<string, string> = {
  'renderer-live2d-drift': 'Expression drift detected',
  'renderer-live2d-partial-recovery': 'Renderer partial recovery detected',
  'renderer-live2d-runtime-only': 'Runtime expression exceeded resident prediction',
  'renderer-live2d-pending': 'Renderer synchronization pending',
  'renderer-vrm-drift': 'Expression drift detected',
  'renderer-vrm-partial-recovery': 'Renderer partial recovery detected',
  'renderer-vrm-runtime-only': 'Runtime expression exceeded resident prediction',
  'renderer-vrm-pending': 'Renderer synchronization pending',
  'lipsync-mouth-proof-missing': 'Mouth execution proof missing',
  'cross-modal-mouth-dominance': 'Cross-modal embodiment drift detected',
  'cross-modal-partial-lane-dominance': 'Partial-lane continuity drift detected',
  'cross-modal-single-lane-dominance': 'Single-lane continuity drift detected',
}

function resolveAlertTitle(alert: StageEmbodimentDiagnosticsAlertEntry) {
  if (alert.code === 'renderer-live2d-partial-recovery' || alert.code === 'renderer-vrm-partial-recovery') {
    if (alert.message.includes('audible same-her line'))
      return 'Audible same-her line recovered before renderer'
    if (alert.message.includes('same-her voice line'))
      return 'Resident body and voice recovered before renderer'

    return 'Same-her continuity is re-forming before renderer sync'
  }

  if (alert.code === 'cross-modal-single-lane-dominance') {
    if (alert.message.includes('resident body lane'))
      return 'Resident body line is carrying same-her continuity'
  }

  if (alert.code === 'cross-modal-partial-lane-dominance') {
    if (alert.message.includes('audible same-her line') || alert.message.includes('audible same-her lane'))
      return 'Audible same-her line is carrying continuity'
    if (alert.message.includes('same-her voice line'))
      return 'Resident body and voice are carrying continuity'
  }

  return alertTitleByCode[alert.code] ?? (alert.severity === 'warn'
    ? 'Embodiment anomaly detected'
    : 'Embodiment synchronization notice')
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
    title: resolveAlertTitle(primary),
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
  const parts = [
    entry.faceDriverCue || entry.faceDriverSource
      ? `face ${entry.faceDriverCue ?? 'none'}@${entry.faceDriverSource ?? 'unknown'}`
      : null,
    entry.motionDriverCue || entry.motionDriverSource
      ? `motion ${entry.motionDriverCue ?? 'none'}@${entry.motionDriverSource ?? 'unknown'}`
      : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
}

function formatRuntimeOnlyVisibleSummary(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const actual = entry.actual ?? 'none'

  if (entry.reason === 'runtime-expression')
    return `runtime expression surfaced ${actual} before resident prediction`
  if (entry.reason === 'runtime-emotion')
    return `runtime emotion surfaced ${actual} before resident prediction`
  if (entry.reason === 'runtime-facial-cue')
    return `runtime facial cue surfaced ${actual} before resident prediction`

  return `runtime surfaced ${actual} before resident prediction`
}

function formatSameSegmentRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null

  if (!faceSegmentId || !motionSegmentId || faceSegmentId !== motionSegmentId)
    return null
  if (!entry.faceDriverCue || !entry.motionDriverCue)
    return null

  const bodySuffix = bodySegmentId && bodySegmentId === faceSegmentId
    ? '+body'
    : ''
  return `same-segment face+motion${bodySuffix} recovery@${faceSegmentId}`
}

function formatRemainingOpenClosure(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  if (
    bodySegmentId
    && faceSegmentId
    && motionSegmentId
    && bodySegmentId === faceSegmentId
    && bodySegmentId === motionSegmentId
    && entry.faceDriverCue
    && entry.motionDriverCue
  ) {
    return 'remaining-open=lipsync+voice'
  }

  return null
}

function formatAudibleBodyCarry(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const residentMode = typeof entry.residentMode === 'string'
    ? entry.residentMode.trim()
    : null
  const preferredBlinkCadence = typeof entry.preferredBlinkCadence === 'string'
    ? entry.preferredBlinkCadence.trim()
    : null
  const preferredGazeMode = typeof entry.preferredGazeMode === 'string'
    ? entry.preferredGazeMode.trim()
    : null

  if (
    residentMode === 'measured-return'
    && formatSameSegmentRecovery(entry)?.includes('face+motion+body')
    && formatRemainingOpenClosure(entry) === 'remaining-open=lipsync+voice'
    && (preferredBlinkCadence === 'linger' || preferredGazeMode === 'soften')
  ) {
    return 'timing=audible-body-carry'
  }

  return null
}

function formatBodyLipsyncCarry(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const residentMode = typeof entry.residentMode === 'string'
    ? entry.residentMode.trim()
    : null
  const preferredBlinkCadence = typeof entry.preferredBlinkCadence === 'string'
    ? entry.preferredBlinkCadence.trim()
    : null
  const preferredGazeMode = typeof entry.preferredGazeMode === 'string'
    ? entry.preferredGazeMode.trim()
    : null
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    residentMode === 'measured-return'
    && bodySegmentId
    && lipsyncSegmentId
    && bodySegmentId === lipsyncSegmentId
    && (!voiceSegmentId || voiceSegmentId !== bodySegmentId)
    && faceSegmentId !== bodySegmentId
    && motionSegmentId !== bodySegmentId
    && (preferredBlinkCadence === 'linger' || preferredGazeMode === 'soften')
  ) {
    return 'timing=body-lipsync-carry'
  }

  return null
}

function formatBodyOnlyRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !bodySegmentId
    || voiceSegmentId === bodySegmentId
    || lipsyncSegmentId === bodySegmentId
    || faceSegmentId === bodySegmentId
    || motionSegmentId === bodySegmentId
  ) {
    return null
  }

  return `body-only recovery@${bodySegmentId}`
}

function formatBodyVoiceRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !bodySegmentId
    || !voiceSegmentId
    || bodySegmentId !== voiceSegmentId
    || lipsyncSegmentId === bodySegmentId
    || faceSegmentId === bodySegmentId
    || motionSegmentId === bodySegmentId
  ) {
    return null
  }

  return `body+voice recovery@${bodySegmentId}`
}

function formatBodyLipsyncVoiceRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !bodySegmentId
    || !lipsyncSegmentId
    || !voiceSegmentId
    || bodySegmentId !== lipsyncSegmentId
    || bodySegmentId !== voiceSegmentId
    || faceSegmentId === bodySegmentId
    || motionSegmentId === bodySegmentId
  ) {
    return null
  }

  return `body+lipsync+voice recovery@${bodySegmentId}`
}

function formatAudibleBodyRejoin(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !bodySegmentId
    || !lipsyncSegmentId
    || !voiceSegmentId
    || bodySegmentId !== lipsyncSegmentId
    || bodySegmentId !== voiceSegmentId
    || faceSegmentId === bodySegmentId
    || motionSegmentId === bodySegmentId
  ) {
    return null
  }

  return `audible-body rejoin@${bodySegmentId}`
}

function formatBodyLipsyncRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !bodySegmentId
    || !lipsyncSegmentId
    || bodySegmentId !== lipsyncSegmentId
    || voiceSegmentId === bodySegmentId
    || faceSegmentId === bodySegmentId
    || motionSegmentId === bodySegmentId
  ) {
    return null
  }

  return `body+lipsync recovery@${bodySegmentId}`
}

function formatLipsyncVoiceRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !lipsyncSegmentId
    || !voiceSegmentId
    || lipsyncSegmentId !== voiceSegmentId
    || bodySegmentId
    || faceSegmentId === lipsyncSegmentId
    || motionSegmentId === lipsyncSegmentId
  ) {
    return null
  }

  return `lipsync+voice recovery@${lipsyncSegmentId}`
}

function formatFaceVoiceRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !faceSegmentId
    || !voiceSegmentId
    || faceSegmentId !== voiceSegmentId
    || bodySegmentId
    || lipsyncSegmentId === faceSegmentId
    || motionSegmentId === faceSegmentId
    || !entry.faceDriverCue
  ) {
    return null
  }

  return `face+voice recovery@${faceSegmentId}`
}

function formatMotionVoiceRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !motionSegmentId
    || !voiceSegmentId
    || motionSegmentId !== voiceSegmentId
    || bodySegmentId
    || lipsyncSegmentId === motionSegmentId
    || faceSegmentId === motionSegmentId
    || !entry.motionDriverCue
  ) {
    return null
  }

  return `motion+voice recovery@${motionSegmentId}`
}

function formatFaceMotionVoiceRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !faceSegmentId
    || !motionSegmentId
    || !voiceSegmentId
    || faceSegmentId !== motionSegmentId
    || faceSegmentId !== voiceSegmentId
    || bodySegmentId
    || lipsyncSegmentId === faceSegmentId
    || !entry.faceDriverCue
    || !entry.motionDriverCue
  ) {
    return null
  }

  return `face+motion+voice recovery@${faceSegmentId}`
}

function formatFaceLipsyncVoiceRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !faceSegmentId
    || !lipsyncSegmentId
    || !voiceSegmentId
    || faceSegmentId !== lipsyncSegmentId
    || faceSegmentId !== voiceSegmentId
    || bodySegmentId
    || motionSegmentId === faceSegmentId
    || !entry.faceDriverCue
  ) {
    return null
  }

  return `face+lipsync+voice recovery@${faceSegmentId}`
}

function formatMotionLipsyncVoiceRecovery(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !motionSegmentId
    || !lipsyncSegmentId
    || !voiceSegmentId
    || motionSegmentId !== lipsyncSegmentId
    || motionSegmentId !== voiceSegmentId
    || bodySegmentId
    || faceSegmentId === motionSegmentId
    || !entry.motionDriverCue
  ) {
    return null
  }

  return `motion+lipsync+voice recovery@${motionSegmentId}`
}

function formatPendingFaceMotionRejoin(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !bodySegmentId
    || !lipsyncSegmentId
    || !voiceSegmentId
    || bodySegmentId !== lipsyncSegmentId
    || bodySegmentId !== voiceSegmentId
    || faceSegmentId === bodySegmentId
    || motionSegmentId === bodySegmentId
  ) {
    return null
  }

  return 'pending-rejoin=face+motion'
}

function formatPendingFaceMotionLipsyncRejoin(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !bodySegmentId
    || !voiceSegmentId
    || bodySegmentId !== voiceSegmentId
    || lipsyncSegmentId === bodySegmentId
    || faceSegmentId === bodySegmentId
    || motionSegmentId === bodySegmentId
  ) {
    return null
  }

  return 'pending-rejoin=face+motion+lipsync'
}

function formatPendingFaceMotionLipsyncVoiceRejoin(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !bodySegmentId
    || voiceSegmentId === bodySegmentId
    || lipsyncSegmentId === bodySegmentId
    || faceSegmentId === bodySegmentId
    || motionSegmentId === bodySegmentId
  ) {
    return null
  }

  return 'pending-rejoin=face+motion+lipsync+voice'
}

function formatPendingBodyMotionRejoin(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  if (!formatFaceLipsyncVoiceRecovery(entry))
    return null

  return 'pending-rejoin=body+motion'
}

function formatPendingBodyMotionLipsyncRejoin(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  if (!formatFaceVoiceRecovery(entry))
    return null

  return 'pending-rejoin=body+motion+lipsync'
}

function formatPendingBodyLipsyncRejoin(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  if (!formatFaceMotionVoiceRecovery(entry))
    return null

  return 'pending-rejoin=body+lipsync'
}

function formatPendingBodyFaceRejoin(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  if (!formatMotionLipsyncVoiceRecovery(entry))
    return null

  return 'pending-rejoin=body+face'
}

function formatPendingBodyFaceLipsyncRejoin(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  if (!formatMotionVoiceRecovery(entry))
    return null

  return 'pending-rejoin=body+face+lipsync'
}

function formatPendingBodyFaceMotionRejoin(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !lipsyncSegmentId
    || !voiceSegmentId
    || lipsyncSegmentId !== voiceSegmentId
    || bodySegmentId
    || faceSegmentId === lipsyncSegmentId
    || motionSegmentId === lipsyncSegmentId
  ) {
    return null
  }

  return 'pending-rejoin=body+face+motion'
}

function formatAudibleLivingLineLaggingLanes(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const faceSegmentId = typeof entry.faceDriverSegmentId === 'string'
    ? entry.faceDriverSegmentId.trim()
    : null
  const motionSegmentId = typeof entry.motionDriverSegmentId === 'string'
    ? entry.motionDriverSegmentId.trim()
    : null
  const bodySegmentId = typeof entry.bodyDriverSegmentId === 'string'
    ? entry.bodyDriverSegmentId.trim()
    : null
  const lipsyncSegmentId = typeof entry.lipsyncDriverSegmentId === 'string'
    ? entry.lipsyncDriverSegmentId.trim()
    : null
  const voiceSegmentId = typeof entry.voiceDriverSegmentId === 'string'
    ? entry.voiceDriverSegmentId.trim()
    : null

  if (
    !bodySegmentId
    || !lipsyncSegmentId
    || !voiceSegmentId
    || bodySegmentId !== lipsyncSegmentId
    || bodySegmentId !== voiceSegmentId
  ) {
    return null
  }

  const laggingLanes = [
    faceSegmentId !== bodySegmentId ? 'face' : null,
    motionSegmentId !== bodySegmentId ? 'motion' : null,
  ].filter((lane): lane is 'face' | 'motion' => Boolean(lane))

  if (laggingLanes.length === 0)
    return null

  return `audible-living-line leads while ${laggingLanes.join('+')} lag@${bodySegmentId}`
}

function formatLaneFocusSummary(input: {
  active: string | null
  pending: string | null
}) {
  const parts = [
    input.active ? `${input.active} active` : null,
    input.pending ? `pending ${input.pending}` : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
}

function normalizePendingLaneFocus(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const pending = formatPendingFaceMotionRejoin(entry)
    ?? formatPendingFaceMotionLipsyncRejoin(entry)
    ?? formatPendingFaceMotionLipsyncVoiceRejoin(entry)
    ?? formatPendingBodyLipsyncRejoin(entry)
    ?? formatPendingBodyMotionRejoin(entry)
    ?? formatPendingBodyMotionLipsyncRejoin(entry)
    ?? formatPendingBodyFaceRejoin(entry)
    ?? formatPendingBodyFaceLipsyncRejoin(entry)
    ?? formatPendingBodyFaceMotionRejoin(entry)

  return pending?.replace('pending-rejoin=', '') ?? null
}

function buildRendererLaneFocusSummary(entry: StageEmbodimentDiagnosticsRendererAlignmentEntry) {
  const active = formatBodyLipsyncVoiceRecovery(entry)
    ? 'body+lipsync+voice'
    : formatBodyVoiceRecovery(entry)
      ? 'body+voice'
      : formatBodyLipsyncRecovery(entry)
        ? 'body+lipsync'
        : formatBodyOnlyRecovery(entry)
          ? 'resident-body'
          : formatLipsyncVoiceRecovery(entry)
            ? 'lipsync+voice'
            : formatFaceLipsyncVoiceRecovery(entry)
              ? 'face+lipsync+voice'
              : formatFaceMotionVoiceRecovery(entry)
                ? 'face+motion+voice'
                : formatFaceVoiceRecovery(entry)
                  ? 'face+voice'
                  : formatMotionLipsyncVoiceRecovery(entry)
                    ? 'motion+lipsync+voice'
                    : formatMotionVoiceRecovery(entry)
                      ? 'motion+voice'
                      : formatSameSegmentRecovery(entry)?.includes('face+motion+body')
                        ? 'body+face+motion'
                        : formatSameSegmentRecovery(entry)?.includes('face+motion')
                          ? 'face+motion'
                          : null
  const pending = normalizePendingLaneFocus(entry)

  return formatLaneFocusSummary({
    active,
    pending,
  })
}

function buildCrossModalSingleLaneFocusSummary(
  alert: StageEmbodimentDiagnosticsAlertEntry,
  authorityMismatchDisplay?: string | null,
) {
  const mismatch = authorityMismatchDisplay ?? ''
  const active = mismatch.includes('实际执行落点是口型和语音')
    ? 'lipsync+voice'
    : mismatch.includes('实际执行落点是表情和语音')
      ? 'face+voice'
      : mismatch.includes('实际执行落点是动作和语音')
        ? 'motion+voice'
        : mismatch.includes('实际执行落点是语音')
          ? 'voice'
          : alert.message.includes('resident body lane')
            ? 'resident-body'
            : 'single-lane'
  const pending = mismatch.includes('实际执行落点是口型和语音')
    ? 'body+face+motion'
    : mismatch.includes('实际执行落点是表情和语音')
      ? 'body+motion+lipsync'
      : mismatch.includes('实际执行落点是动作和语音')
        ? 'body+face+lipsync'
        : mismatch.includes('实际执行落点是语音')
          ? 'body+face+motion+lipsync'
          : alert.message.includes('resident body lane')
            ? 'face+motion+lipsync+voice'
            : 'cross-modal rejoin'

  return formatLaneFocusSummary({
    active,
    pending,
  })
}

function buildCrossModalPartialLaneFocusSummary(
  alert: StageEmbodimentDiagnosticsAlertEntry,
  rendererAlignment: StageEmbodimentDiagnosticsRendererAlignment,
  authorityMismatchDisplay?: string | null,
) {
  const live2dEntry = rendererAlignment.live2d
  const vrmEntry = rendererAlignment.vrm
  const mismatch = authorityMismatchDisplay ?? ''
  const survivingAudibleSameHerLine = Boolean(
    (live2dEntry && formatBodyLipsyncVoiceRecovery(live2dEntry))
    || (vrmEntry && formatBodyLipsyncVoiceRecovery(vrmEntry)),
  )
  const survivingBodyVoiceSameHerLine = Boolean(
    (live2dEntry && formatBodyVoiceRecovery(live2dEntry))
    || (vrmEntry && formatBodyVoiceRecovery(vrmEntry))
    || alert.message.includes('same-her voice line')
    || mismatch.includes('resident body 和 voice')
    || mismatch.includes('实际执行落点是体态、语音')
    || mismatch.includes('实际执行落点是体态和语音'),
  )
  const survivingAudibleVoiceLine = Boolean(
    (live2dEntry && formatLipsyncVoiceRecovery(live2dEntry))
    || (vrmEntry && formatLipsyncVoiceRecovery(vrmEntry)),
  )
  const survivingFaceLipsyncLine = Boolean(
    mismatch.includes('实际执行落点是表情和口型')
    || mismatch.includes('实际执行落点是口型和表情'),
  )
  const survivingMotionLipsyncLine = Boolean(
    mismatch.includes('实际执行落点是动作和口型')
    || mismatch.includes('实际执行落点是口型和动作'),
  )
  const survivingEmbodiedSameHerLine = Boolean(
    (live2dEntry && formatBodyLipsyncRecovery(live2dEntry))
    || (vrmEntry && formatBodyLipsyncRecovery(vrmEntry)),
  )
  const active = survivingAudibleSameHerLine
    || alert.message.includes('audible same-her line')
    || alert.message.includes('audible same-her lane')
    || mismatch.includes('resident body、lipsync 和 voice')
    ? 'resident-body+audible-line'
    : survivingBodyVoiceSameHerLine
      ? 'resident-body+voice'
      : survivingAudibleVoiceLine
        ? 'lipsync+voice'
        : survivingFaceLipsyncLine
          ? 'face+lipsync'
          : survivingMotionLipsyncLine
            ? 'motion+lipsync'
            : survivingEmbodiedSameHerLine
              ? 'resident-body+lipsync'
              : alert.message.includes('resident body lane')
                ? 'resident-body+one-lane'
                : 'two-lanes'
  const pending = survivingAudibleSameHerLine
    || alert.message.includes('audible same-her line')
    || alert.message.includes('audible same-her lane')
    || mismatch.includes('resident body、lipsync 和 voice')
    ? 'face+motion'
    : survivingBodyVoiceSameHerLine
      ? 'lipsync+face+motion'
      : survivingAudibleVoiceLine
        ? 'body+face+motion'
        : survivingFaceLipsyncLine
          ? 'body+motion+voice'
          : survivingMotionLipsyncLine
            ? 'body+face+voice'
            : survivingEmbodiedSameHerLine
              ? 'face+motion+voice'
              : alert.message.includes('resident body lane')
                ? 'full-cross-modal rejoin'
                : 'full-cross-modal rejoin'

  return formatLaneFocusSummary({
    active,
    pending,
  })
}

export function buildStageEmbodimentDiagnosticsAlertFocusSummary(
  alert: StageEmbodimentDiagnosticsAlertEntry,
  rendererAlignment: StageEmbodimentDiagnosticsRendererAlignment,
  authorityMismatchDisplay?: string | null,
) {
  if (alert.code === 'cross-modal-single-lane-dominance')
    return buildCrossModalSingleLaneFocusSummary(alert, authorityMismatchDisplay)

  if (alert.code === 'cross-modal-partial-lane-dominance')
    return buildCrossModalPartialLaneFocusSummary(alert, rendererAlignment, authorityMismatchDisplay)

  const entry = resolveAlertAlignmentEntry(alert.code, rendererAlignment)
  if (!entry)
    return null

  return buildRendererLaneFocusSummary(entry)
}

export function buildStageEmbodimentDiagnosticsAlertReasonSummary(
  alert: StageEmbodimentDiagnosticsAlertEntry,
  rendererAlignment: StageEmbodimentDiagnosticsRendererAlignment,
  authorityMismatchDisplay?: string | null,
) {
  if (alert.code === 'cross-modal-mouth-dominance') {
    const summary = '口型已执行，但表情或动作没有和同一段数字生命表达对齐，同一条 companionship 身体线正在变薄'
    return authorityMismatchDisplay
      ? `${summary} | ${authorityMismatchDisplay}`
      : summary
  }

  if (alert.code === 'cross-modal-single-lane-dominance') {
    const mismatch = authorityMismatchDisplay ?? ''
    const summary = mismatch.includes('实际执行落点是口型和语音')
      ? '当前只有 lipsync 和 voice 这条可听见的 same-her 生命线还和同一段数字生命表达对齐，跨模态连续性正在从这条活着的声音线收缩'
      : mismatch.includes('实际执行落点是表情和语音')
        ? '当前只有 face 和 voice 这条 same-her 生命线还和同一段数字生命表达对齐，跨模态连续性正在从这条仍在发声的表情线收缩'
        : mismatch.includes('实际执行落点是动作和语音')
          ? '当前只有 motion 和 voice 这条 same-her 生命线还和同一段数字生命表达对齐，跨模态连续性正在从这条仍在发声的动作线收缩'
          : mismatch.includes('实际执行落点是语音')
            ? '当前只有 voice 这条可听见的 same-her 生命线还和同一段数字生命表达对齐，跨模态连续性正在从这条活着的声音线收缩'
            : alert.message.includes('resident body lane')
              ? '当前只有 resident body 这条身体线还和同一段数字生命表达对齐，跨模态连续性正在从同一个 her 的身体主线收缩'
              : '当前只有一条身体通道还和同一段数字生命表达对齐，跨模态连续性正在从同一条 companionship 身体线收缩'
    return authorityMismatchDisplay
      ? `${summary} | ${authorityMismatchDisplay}`
      : summary
  }

  if (alert.code === 'cross-modal-partial-lane-dominance') {
    const live2dEntry = rendererAlignment.live2d
    const vrmEntry = rendererAlignment.vrm
    const survivingAudibleSameHerLine = Boolean(
      (live2dEntry && formatBodyLipsyncVoiceRecovery(live2dEntry))
      || (vrmEntry && formatBodyLipsyncVoiceRecovery(vrmEntry)),
    )
    const mismatch = authorityMismatchDisplay ?? ''
    const survivingBodyVoiceSameHerLine = Boolean(
      (live2dEntry && formatBodyVoiceRecovery(live2dEntry))
      || (vrmEntry && formatBodyVoiceRecovery(vrmEntry))
      || alert.message.includes('same-her voice line')
      || mismatch.includes('resident body 和 voice')
      || mismatch.includes('实际执行落点是体态、语音')
      || mismatch.includes('实际执行落点是体态和语音'),
    )
    const survivingAudibleVoiceLine = Boolean(
      (live2dEntry && formatLipsyncVoiceRecovery(live2dEntry))
      || (vrmEntry && formatLipsyncVoiceRecovery(vrmEntry)),
    )
    const survivingFaceLipsyncLine = Boolean(
      mismatch.includes('实际执行落点是表情和口型')
      || mismatch.includes('实际执行落点是口型和表情'),
    )
    const survivingMotionLipsyncLine = Boolean(
      mismatch.includes('实际执行落点是动作和口型')
      || mismatch.includes('实际执行落点是口型和动作'),
    )
    const survivingEmbodiedSameHerLine = Boolean(
      (live2dEntry && formatBodyLipsyncRecovery(live2dEntry))
      || (vrmEntry && formatBodyLipsyncRecovery(vrmEntry)),
    )
    const summary = survivingAudibleSameHerLine
      || alert.message.includes('audible same-her line')
      || alert.message.includes('audible same-her lane')
      ? '当前 resident body 这条身体线仍和可听见的 same-her 生命线一起托住同一段数字生命表达，但 face 和 motion 还没有重新接回这条活着的身体线'
      : survivingBodyVoiceSameHerLine
        ? '当前 resident body 这条身体线仍和 same-her 的声音线一起托住同一段数字生命表达，但 lipsync、face 和 motion 还没有重新接回这条活着的身体线'
        : survivingAudibleVoiceLine
          ? '当前可听见的 same-her 生命线仍由 lipsync 和 voice 一起托住，但 body、face 和 motion 还没有重新接回这一段数字生命表达'
          : survivingFaceLipsyncLine
            ? '当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线'
            : survivingMotionLipsyncLine
              ? '当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线'
              : survivingEmbodiedSameHerLine
                ? '当前 resident body 这条身体线仍和 lipsync 一起托住同一段数字生命表达，但完整跨模态身体线已经开始收缩'
                : alert.message.includes('resident body lane')
                  ? '当前 resident body 这条身体线仍和另一条通道一起托住同一段数字生命表达，但完整跨模态身体线已经开始收缩'
                  : '当前还有两条身体通道仍和同一段数字生命表达对齐，但完整跨模态身体线已经开始收缩'
    return authorityMismatchDisplay
      ? `${summary} | ${authorityMismatchDisplay}`
      : summary
  }

  const entry = resolveAlertAlignmentEntry(alert.code, rendererAlignment)
  if (!entry)
    return null

  const authority = formatDriverAuthority(entry)
  const sameSegmentRecovery = formatSameSegmentRecovery(entry)
  const bodyLipsyncVoiceRecovery = formatBodyLipsyncVoiceRecovery(entry)
  const audibleBodyRejoin = formatAudibleBodyRejoin(entry)
  const pendingFaceMotionRejoin = formatPendingFaceMotionRejoin(entry)
  const pendingFaceMotionLipsyncRejoin = formatPendingFaceMotionLipsyncRejoin(entry)
  const pendingFaceMotionLipsyncVoiceRejoin = formatPendingFaceMotionLipsyncVoiceRejoin(entry)
  const lipsyncVoiceRecovery = formatLipsyncVoiceRecovery(entry)
  const faceLipsyncVoiceRecovery = formatFaceLipsyncVoiceRecovery(entry)
  const faceVoiceRecovery = formatFaceVoiceRecovery(entry)
  const motionLipsyncVoiceRecovery = formatMotionLipsyncVoiceRecovery(entry)
  const motionVoiceRecovery = formatMotionVoiceRecovery(entry)
  const pendingBodyMotionRejoin = formatPendingBodyMotionRejoin(entry)
  const pendingBodyMotionLipsyncRejoin = formatPendingBodyMotionLipsyncRejoin(entry)
  const pendingBodyLipsyncRejoin = formatPendingBodyLipsyncRejoin(entry)
  const pendingBodyFaceRejoin = formatPendingBodyFaceRejoin(entry)
  const pendingBodyFaceLipsyncRejoin = formatPendingBodyFaceLipsyncRejoin(entry)
  const pendingBodyFaceMotionRejoin = formatPendingBodyFaceMotionRejoin(entry)
  const bodyVoiceRecovery = formatBodyVoiceRecovery(entry)
  const bodyOnlyRecovery = formatBodyOnlyRecovery(entry)
  const remainingOpenClosure = formatRemainingOpenClosure(entry)
  const bodyLipsyncCarry = formatBodyLipsyncCarry(entry)
  const audibleBodyCarry = formatAudibleBodyCarry(entry)
  const audibleLivingLineLaggingLanes = formatAudibleLivingLineLaggingLanes(entry)
  const explicitSameHerContinuity = formatExplicitSameHerContinuity(entry)
  const explicitSameHerSignature = formatExplicitSameHerSignature(entry)

  if (entry.driftKind === 'alias-resolution-drift') {
    const summary = `resident ${entry.predicted ?? 'none'} -> actual ${entry.actual ?? 'none'}`
    const parts = [summary, authority, explicitSameHerContinuity, explicitSameHerSignature, bodyLipsyncVoiceRecovery, audibleBodyRejoin, audibleLivingLineLaggingLanes, pendingFaceMotionRejoin, lipsyncVoiceRecovery, pendingBodyFaceMotionRejoin, faceLipsyncVoiceRecovery, pendingBodyMotionRejoin, faceVoiceRecovery, pendingBodyMotionLipsyncRejoin, motionLipsyncVoiceRecovery, pendingBodyFaceRejoin, motionVoiceRecovery, pendingBodyFaceLipsyncRejoin, bodyVoiceRecovery, pendingFaceMotionLipsyncRejoin, bodyOnlyRecovery, pendingFaceMotionLipsyncVoiceRejoin, sameSegmentRecovery, pendingBodyLipsyncRejoin, remainingOpenClosure, bodyLipsyncCarry, audibleBodyCarry].filter((value): value is string => Boolean(value))
    return parts.join(' | ')
  }

  if (entry.driftKind === 'resident-not-yet-applied') {
    const summary = `resident ${entry.predicted ?? 'none'} is waiting for renderer application`
    const parts = [summary, authority, explicitSameHerContinuity, explicitSameHerSignature, bodyLipsyncVoiceRecovery, audibleBodyRejoin, audibleLivingLineLaggingLanes, pendingFaceMotionRejoin, lipsyncVoiceRecovery, pendingBodyFaceMotionRejoin, faceLipsyncVoiceRecovery, pendingBodyMotionRejoin, faceVoiceRecovery, pendingBodyMotionLipsyncRejoin, motionLipsyncVoiceRecovery, pendingBodyFaceRejoin, motionVoiceRecovery, pendingBodyFaceLipsyncRejoin, bodyVoiceRecovery, pendingFaceMotionLipsyncRejoin, bodyOnlyRecovery, pendingFaceMotionLipsyncVoiceRejoin, sameSegmentRecovery, pendingBodyLipsyncRejoin, remainingOpenClosure, bodyLipsyncCarry, audibleBodyCarry].filter((value): value is string => Boolean(value))
    return parts.join(' | ')
  }

  if (entry.driftKind === 'runtime-only-visible') {
    const summary = formatRuntimeOnlyVisibleSummary(entry)
    const parts = [summary, authority, explicitSameHerContinuity, explicitSameHerSignature, bodyLipsyncVoiceRecovery, audibleBodyRejoin, audibleLivingLineLaggingLanes, pendingFaceMotionRejoin, lipsyncVoiceRecovery, pendingBodyFaceMotionRejoin, faceLipsyncVoiceRecovery, pendingBodyMotionRejoin, faceVoiceRecovery, pendingBodyMotionLipsyncRejoin, motionLipsyncVoiceRecovery, pendingBodyFaceRejoin, motionVoiceRecovery, pendingBodyFaceLipsyncRejoin, bodyVoiceRecovery, pendingFaceMotionLipsyncRejoin, bodyOnlyRecovery, pendingFaceMotionLipsyncVoiceRejoin, sameSegmentRecovery, pendingBodyLipsyncRejoin, remainingOpenClosure, bodyLipsyncCarry, audibleBodyCarry].filter((value): value is string => Boolean(value))
    return parts.join(' | ')
  }

  return null
}
