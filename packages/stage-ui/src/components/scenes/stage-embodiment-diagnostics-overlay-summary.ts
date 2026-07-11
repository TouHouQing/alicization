import {
  buildAlicizationEmbodimentLoopSummary,
  buildAlicizationFaceSummary,
  buildAlicizationLipsyncSummary,
  buildAlicizationMotionSummary,
  normalizeAlicizationRendererHintToken,
  normalizeAlicizationSettleLoopToken,
} from '@proj-alicization/stage-shared'

interface StageEmbodimentLipSyncExecutionSurfaceInput {
  active: boolean
  dominantViseme: string | null
  dominantWeight: number | null
  segmentId: string | null
}

interface StageEmbodimentMotionExecutionSurfaceInput {
  cue?: string | null
  group?: string | null
  index?: number | null
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  segmentId: string | null
}

interface StageEmbodimentDriverAuthoritySummaryEntry {
  cue: string | null
  emotion?: string | null
  intensity?: number | null
  holdMs?: number | null
  continuityTiming?: string | null
  preUtteranceCue?: string | null
  postUtteranceCue?: string | null
  attentionMode?: string | null
  idleBase?: string | null
  playbackPhase?: 'idle' | 'playing' | null
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  preferredPauseMode?: string | null
  preferredLipsyncMode?: string | null
  preferredVoiceMode?: string | null
  preferredPacingMode?: string | null
  reasonTags?: readonly string[] | null
  reasonSummary?: string | null
  signature?: string | null
  source: string | null
  confidence: number | null
  segmentId: string | null
}

interface StageEmbodimentLipsyncDriverAuthoritySummaryEntry extends StageEmbodimentDriverAuthoritySummaryEntry {
  mode: string | null
  continuityHoldMs?: number | null
  topViseme?: string | null
  hintTrail?: string | null
  hintViseme?: string | null
}

interface StageEmbodimentBodyDriverAuthoritySummaryEntry {
  frameMode?: string | null
  stillness?: number | null
  gazeStability?: number | null
  breathAmplitude?: number | null
  expressivity?: number | null
  segmentId: string | null
}

interface StageEmbodimentDriverSurfaceSummaryInput {
  rendererTarget: 'live2d' | 'vrm' | null
  body?: StageEmbodimentBodyDriverAuthoritySummaryEntry | null
  face: StageEmbodimentDriverAuthoritySummaryEntry | null
  motion: StageEmbodimentDriverAuthoritySummaryEntry | null
  lipsync: StageEmbodimentLipsyncDriverAuthoritySummaryEntry | null
  voiceAuthority?: StageEmbodimentDriverAuthoritySummaryEntry | null
  voice?: string | null
}

interface StageEmbodimentRendererAlignmentSurfaceInput {
  predicted: string | null
  actual: string | null
  residentMode?: string | null
  preferredBlinkCadence?: string | null
  preferredGazeMode?: string | null
  reasonTags?: readonly string[] | null
  signature?: string | null
  status?: string | null
  driftKind?: string | null
  reason?: string | null
  faceDriverCue?: string | null
  faceDriverSource?: string | null
  faceDriverSegmentId?: string | null
  motionDriverCue?: string | null
  motionDriverSource?: string | null
  motionDriverSegmentId?: string | null
  bodyDriverSegmentId?: string | null
  lipsyncDriverSegmentId?: string | null
  voiceDriverSegmentId?: string | null
}

function buildExplicitSameHerContinuitySurface(input: {
  reasonTags?: readonly string[] | null
  signature?: string | null
}) {
  const signature = normalizeText(input.signature)
  const reasonTags = (input.reasonTags ?? [])
    .map(tag => normalizeText(tag))
    .filter((tag): tag is string => Boolean(tag))
  const continuityTags = [
    signature,
    ...reasonTags,
  ].filter((value): value is string =>
    value === 'embodiment:audible-continuity-line'
    || value === 'embodiment:body+voice-only'
    || value === 'embodiment:body-lipsync-voice-rejoin',
  )

  if (continuityTags.length > 0)
    return `continuity=${[...new Set(continuityTags)].join('+')}`

  const normalizedHintTokens = [
    signature,
    ...reasonTags,
  ]
    .map(value => normalizeAlicizationRendererHintToken(value))
    .filter((value): value is string => Boolean(value))

  const explicitContinuityTags: string[] = []

  if (normalizedHintTokens.some(value =>
    value.includes('embodiment:body+lipsync_only')
    || value.includes('body+lipsync_only'),
  )) {
    explicitContinuityTags.push('embodiment:body+lipsync-only')
  }

  if (normalizedHintTokens.some(value =>
    value.includes('embodiment:lipsync+voice_only')
    || value.includes('lipsync+voice_only'),
  )) {
    explicitContinuityTags.push('embodiment:lipsync+voice-only')
  }

  if (normalizedHintTokens.some(value =>
    value.includes('embodiment:still_voiced_face_motion_line')
    || value.includes('still_voiced_face_motion_line'),
  )) {
    explicitContinuityTags.push('embodiment:still-voiced-face-motion-line')
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

  if (explicitContinuityTags.length === 0)
    return null

  return `continuity=${[...new Set(explicitContinuityTags)].join('+')}`
}

function normalizeText(value: string | null | undefined) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
}

function parseDelimitedSummaryParts(summary: string | null | undefined) {
  const normalized = normalizeText(summary)
  if (!normalized)
    return null

  const parts = normalized.split('|').map(part => part.trim()).filter(Boolean)
  const fields = new Map<string, string>()
  let headline: string | null = null

  for (const part of parts) {
    const separatorIndex = part.indexOf('=')
    if (separatorIndex <= 0) {
      headline ??= part
      continue
    }

    const key = part.slice(0, separatorIndex).trim()
    const value = part.slice(separatorIndex + 1).trim()
    if (!key || !value || fields.has(key))
      continue

    fields.set(key, value)
  }

  return {
    headline,
    fields,
  }
}

function parseSummaryFiniteNumber(value: string | null | undefined) {
  if (!value)
    return null

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function resolveHostFacingLoopSurfaceInput(
  input: StageEmbodimentDriverSurfaceSummaryInput,
) {
  const bodySegmentId = normalizeText(input.body?.segmentId)
  const parsedVoiceSummary = parseDelimitedSummaryParts(input.voice)
  const voiceAuthoritySegmentId = normalizeText(input.voiceAuthority?.segmentId)
  const voiceSummarySegmentId = normalizeText(parsedVoiceSummary?.fields.get('seg'))
  const lipsyncSegmentId = normalizeText(input.lipsync?.segmentId)
  const faceSegmentId = normalizeText(input.face?.segmentId)
  const motionSegmentId = normalizeText(input.motion?.segmentId)
  const supportingSegmentIds = [
    bodySegmentId,
    faceSegmentId,
    motionSegmentId,
    lipsyncSegmentId,
  ].filter((value): value is string => Boolean(value))
  const countSupportingSegmentMatches = (segmentId: string | null) =>
    segmentId
      ? supportingSegmentIds.filter(value => value === segmentId).length
      : 0

  // Prefer the fresher voiced segment when parsed voice text and voice authority drift apart.
  const voiceSegmentId = (() => {
    if (voiceAuthoritySegmentId && voiceSummarySegmentId && voiceAuthoritySegmentId === voiceSummarySegmentId)
      return voiceAuthoritySegmentId

    const authoritySupportCount = countSupportingSegmentMatches(voiceAuthoritySegmentId)
    const summarySupportCount = countSupportingSegmentMatches(voiceSummarySegmentId)

    if (summarySupportCount > authoritySupportCount)
      return voiceSummarySegmentId

    if (authoritySupportCount > summarySupportCount)
      return voiceAuthoritySegmentId

    return voiceAuthoritySegmentId ?? voiceSummarySegmentId ?? null
  })()

  const voiceAlignedSegments = [
    bodySegmentId === voiceSegmentId ? bodySegmentId : null,
    faceSegmentId === voiceSegmentId ? faceSegmentId : null,
    motionSegmentId === voiceSegmentId ? motionSegmentId : null,
    lipsyncSegmentId === voiceSegmentId ? lipsyncSegmentId : null,
  ].filter((value): value is string => Boolean(value))

  const bodyAlignedSegments = bodySegmentId
    ? [
        faceSegmentId === bodySegmentId ? faceSegmentId : null,
        motionSegmentId === bodySegmentId ? motionSegmentId : null,
        lipsyncSegmentId === bodySegmentId ? lipsyncSegmentId : null,
      ].filter((value): value is string => Boolean(value))
    : []

  const repeatedSupportingSegmentId = (() => {
    const counts = new Map<string, number>()
    for (const segmentId of supportingSegmentIds)
      counts.set(segmentId, (counts.get(segmentId) ?? 0) + 1)

    const repeated = [...counts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((left, right) => right[1] - left[1])

    if (repeated.length !== 1)
      return null

    return repeated[0]?.[0] ?? null
  })()

  const livingLineSegmentId = voiceSegmentId && voiceAlignedSegments.length > 0
    ? voiceSegmentId
    : bodySegmentId && bodyAlignedSegments.length > 0
      ? bodySegmentId
      : repeatedSupportingSegmentId

  if (!livingLineSegmentId)
    return input

  const keepVoiceAuthority = voiceAuthoritySegmentId
    ? voiceAuthoritySegmentId === livingLineSegmentId
    : !voiceSegmentId || voiceSegmentId === livingLineSegmentId
  const keepVoice = voiceSummarySegmentId
    ? voiceSummarySegmentId === livingLineSegmentId
    : !voiceSegmentId || voiceSegmentId === livingLineSegmentId

  return {
    ...input,
    body: bodySegmentId === livingLineSegmentId ? input.body : null,
    face: faceSegmentId === livingLineSegmentId ? input.face : null,
    motion: motionSegmentId === livingLineSegmentId ? input.motion : null,
    lipsync: lipsyncSegmentId === livingLineSegmentId ? input.lipsync : null,
    voiceAuthority: keepVoiceAuthority ? input.voiceAuthority : null,
    voice: keepVoice ? input.voice : null,
  }
}

function normalizeNumber(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Number(value)
}

function normalizeIndex(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return null

  return Math.max(0, Math.floor(Number(value)))
}

function buildAuthoritySurface(cue: string | null, source: string | null, segmentId: string | null) {
  if (!cue && !source && !segmentId)
    return null

  const cuePart = normalizeAlicizationSettleLoopToken(cue) ?? cue ?? 'none'
  const sourcePart = source ?? 'none'
  const segmentPart = segmentId ? ` seg=${segmentId}` : ''
  return `${cuePart}@${sourcePart}${segmentPart}`.trim()
}

function formatRendererLaneFocusSurface(input: {
  active: string | null
  pending: string | null
}) {
  const parts = [
    input.active ? `focus=${input.active}` : null,
    input.pending ? `pending=${input.pending}` : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
}

function resolveRendererLaneFocusSurface(input: StageEmbodimentRendererAlignmentSurfaceInput) {
  const faceSegmentId = normalizeText(input.faceDriverSegmentId)
  const motionSegmentId = normalizeText(input.motionDriverSegmentId)
  const bodySegmentId = normalizeText(input.bodyDriverSegmentId)
  const lipsyncSegmentId = normalizeText(input.lipsyncDriverSegmentId)
  const voiceSegmentId = normalizeText(input.voiceDriverSegmentId)
  const hasFaceCue = Boolean(normalizeText(input.faceDriverCue))
  const hasMotionCue = Boolean(normalizeText(input.motionDriverCue))

  const active = bodySegmentId
    && lipsyncSegmentId
    && voiceSegmentId
    && bodySegmentId === lipsyncSegmentId
    && bodySegmentId === voiceSegmentId
    && faceSegmentId !== bodySegmentId
    && motionSegmentId !== bodySegmentId
    ? 'body+lipsync+voice'
    : bodySegmentId
      && faceSegmentId
      && motionSegmentId
      && bodySegmentId === faceSegmentId
      && bodySegmentId === motionSegmentId
      && hasFaceCue
      && hasMotionCue
      ? 'body+face+motion'
      : bodySegmentId
        && voiceSegmentId
        && bodySegmentId === voiceSegmentId
        && lipsyncSegmentId !== bodySegmentId
        && faceSegmentId !== bodySegmentId
        && motionSegmentId !== bodySegmentId
        ? 'body+voice'
        : lipsyncSegmentId
          && voiceSegmentId
          && lipsyncSegmentId === voiceSegmentId
          && !bodySegmentId
          && faceSegmentId !== lipsyncSegmentId
          && motionSegmentId !== lipsyncSegmentId
          ? 'lipsync+voice'
          : faceSegmentId
            && motionSegmentId
            && lipsyncSegmentId
            && voiceSegmentId
            && faceSegmentId === motionSegmentId
            && faceSegmentId === lipsyncSegmentId
            && faceSegmentId === voiceSegmentId
            && !bodySegmentId
            && hasFaceCue
            && hasMotionCue
            ? 'face+motion+lipsync+voice'
            : faceSegmentId
              && voiceSegmentId
              && faceSegmentId === voiceSegmentId
              && lipsyncSegmentId === faceSegmentId
              && !bodySegmentId
              && motionSegmentId !== faceSegmentId
              && hasFaceCue
              ? 'face+lipsync+voice'
              : faceSegmentId
                && lipsyncSegmentId
                && faceSegmentId === lipsyncSegmentId
                && !bodySegmentId
                && motionSegmentId !== faceSegmentId
                && voiceSegmentId !== faceSegmentId
                && hasFaceCue
                ? 'face+lipsync'
                : faceSegmentId
                  && voiceSegmentId
                  && faceSegmentId === voiceSegmentId
                  && !bodySegmentId
                  && lipsyncSegmentId !== faceSegmentId
                  && motionSegmentId !== faceSegmentId
                  && hasFaceCue
                  ? 'face+voice'
                  : faceSegmentId
                    && motionSegmentId
                    && voiceSegmentId
                    && faceSegmentId === motionSegmentId
                    && faceSegmentId === voiceSegmentId
                    && !bodySegmentId
                    && lipsyncSegmentId !== faceSegmentId
                    && hasFaceCue
                    && hasMotionCue
                    ? 'face+motion+voice'
                    : motionSegmentId
                      && voiceSegmentId
                      && motionSegmentId === voiceSegmentId
                      && lipsyncSegmentId === motionSegmentId
                      && !bodySegmentId
                      && faceSegmentId !== motionSegmentId
                      && hasMotionCue
                      ? 'motion+lipsync+voice'
                      : motionSegmentId
                        && lipsyncSegmentId
                        && motionSegmentId === lipsyncSegmentId
                        && !bodySegmentId
                        && faceSegmentId !== motionSegmentId
                        && voiceSegmentId !== motionSegmentId
                        && hasMotionCue
                        ? 'motion+lipsync'
                        : motionSegmentId
                          && voiceSegmentId
                          && motionSegmentId === voiceSegmentId
                          && !bodySegmentId
                          && lipsyncSegmentId !== motionSegmentId
                          && faceSegmentId !== motionSegmentId
                          && hasMotionCue
                          ? 'motion+voice'
                          : bodySegmentId
                            && voiceSegmentId !== bodySegmentId
                            && lipsyncSegmentId !== bodySegmentId
                            && faceSegmentId !== bodySegmentId
                            && motionSegmentId !== bodySegmentId
                            ? 'resident-body'
                            : faceSegmentId
                              && motionSegmentId
                              && faceSegmentId === motionSegmentId
                              && hasFaceCue
                              && hasMotionCue
                              ? 'face+motion'
                              : voiceSegmentId
                                && bodySegmentId !== voiceSegmentId
                                && lipsyncSegmentId !== voiceSegmentId
                                && motionSegmentId !== faceSegmentId
                                && faceSegmentId !== voiceSegmentId
                                && motionSegmentId !== voiceSegmentId
                                ? 'voice'
                                : null

  const pending = active === 'body+lipsync+voice'
    ? 'face+motion'
    : active === 'body+face+motion'
      ? 'lipsync+voice'
      : active === 'body+voice'
        ? 'face+motion+lipsync'
        : active === 'face+motion+lipsync+voice'
          ? 'body'
          : active === 'face+lipsync+voice'
            ? 'body+motion'
            : active === 'face+lipsync'
              ? 'body+motion+voice'
              : active === 'face+voice'
                ? 'body+motion+lipsync'
                : active === 'face+motion+voice'
                  ? 'body+lipsync'
                  : active === 'motion+lipsync+voice'
                    ? 'body+face'
                    : active === 'motion+lipsync'
                      ? 'body+face+voice'
                      : active === 'motion+voice'
                        ? 'body+face+lipsync'
                        : active === 'lipsync+voice'
                          ? 'body+face+motion'
                          : active === 'resident-body'
                            ? 'face+motion+lipsync+voice'
                            : active === 'face+motion'
                              ? 'body+lipsync+voice'
                              : active === 'voice'
                                ? 'body+face+motion+lipsync'
                                : null

  return {
    active,
    pending,
  }
}

function buildBodySurfaceSummary(input: StageEmbodimentBodyDriverAuthoritySummaryEntry | null | undefined) {
  if (!input)
    return null

  const frameMode = normalizeText(input.frameMode)
  const stillness = normalizeNumber(input.stillness)
  const gazeStability = normalizeNumber(input.gazeStability)
  const breathAmplitude = normalizeNumber(input.breathAmplitude)
  const expressivity = normalizeNumber(input.expressivity)
  const segmentId = normalizeText(input.segmentId)

  if (!frameMode && stillness == null && gazeStability == null && breathAmplitude == null && expressivity == null && !segmentId)
    return null

  return [
    frameMode ? `body=${frameMode}` : 'body',
    stillness != null ? `still=${stillness.toFixed(2)}` : null,
    gazeStability != null ? `gazeStable=${gazeStability.toFixed(2)}` : null,
    breathAmplitude != null ? `breath=${breathAmplitude.toFixed(2)}` : null,
    expressivity != null ? `express=${expressivity.toFixed(2)}` : null,
    segmentId ? `segment=${segmentId}` : null,
  ].filter((value): value is string => Boolean(value)).join(' ')
}

function buildEmbodimentClosureSurfaceSummary(input: StageEmbodimentDriverSurfaceSummaryInput) {
  const hasBody = Boolean(input.body && normalizeText(input.body.segmentId))
  const hasFace = Boolean(input.face?.cue && normalizeText(input.face.segmentId))
  const hasMotion = Boolean(input.motion?.cue && normalizeText(input.motion.segmentId))
  const hasLipsync = Boolean(input.lipsync?.cue && normalizeText(input.lipsync.segmentId))
  const hasVoice = Boolean(
    normalizeText(input.voice)
    || normalizeText(input.voiceAuthority?.segmentId)
    || normalizeText(input.voiceAuthority?.source),
  )

  if (hasBody && hasFace && hasMotion && hasLipsync && hasVoice)
    return 'closure=full-driver-rejoin'

  if (hasBody && hasLipsync && hasVoice && !hasFace && !hasMotion)
    return 'closure=audible-body-carry'

  if (hasBody && hasVoice && !hasFace && !hasMotion && !hasLipsync)
    return 'closure=body-carried-to-renderer-rejoin'

  if (hasBody && !hasFace && !hasMotion && !hasLipsync)
    return 'closure=body-only-hold'

  if (!hasBody && hasLipsync && hasVoice && !hasFace && !hasMotion)
    return 'closure=voice-lipsync-carry'

  return null
}

function buildVoiceAuthorityFallbackSurfaceSummary(
  voiceAuthority: StageEmbodimentDriverAuthoritySummaryEntry | null | undefined,
) {
  if (!voiceAuthority)
    return null

  const source = normalizeText(voiceAuthority.source)
  const segmentId = normalizeText(voiceAuthority.segmentId)
  const residentMode = normalizeText(voiceAuthority.residentMode)
  const preferredBlinkCadence = normalizeText(voiceAuthority.preferredBlinkCadence)
  const preferredGazeMode = normalizeText(voiceAuthority.preferredGazeMode)
  const preferredPauseMode = normalizeText(voiceAuthority.preferredPauseMode)
  const preferredLipsyncMode = normalizeText(voiceAuthority.preferredLipsyncMode)
  const preferredVoiceMode = normalizeText(voiceAuthority.preferredVoiceMode)
  const preferredPacingMode = normalizeText(voiceAuthority.preferredPacingMode)
  const reasonSummary = normalizeText(voiceAuthority.reasonSummary)
  const confidence = normalizeNumber(voiceAuthority.confidence)

  if (
    !source
    && !segmentId
    && !residentMode
    && !preferredBlinkCadence
    && !preferredGazeMode
    && !preferredPauseMode
    && !preferredLipsyncMode
    && !preferredVoiceMode
    && !preferredPacingMode
    && !reasonSummary
    && confidence == null
  ) {
    return null
  }

  return [
    'voice-authority',
    residentMode ? `companion=${residentMode}` : null,
    preferredBlinkCadence ? `blink=${preferredBlinkCadence}` : null,
    preferredGazeMode ? `gaze=${preferredGazeMode}` : null,
    preferredPauseMode ? `pause=${preferredPauseMode}` : null,
    preferredLipsyncMode ? `lipsyncMode=${preferredLipsyncMode}` : null,
    preferredVoiceMode ? `voiceMode=${preferredVoiceMode}` : null,
    preferredPacingMode ? `pacing=${preferredPacingMode}` : null,
    reasonSummary ? `reason=${reasonSummary}` : null,
    source ? `src=${source}` : null,
    confidence != null ? `conf=${confidence.toFixed(2)}` : null,
    segmentId ? `seg=${segmentId}` : null,
  ].filter((value): value is string => Boolean(value)).join(' | ')
}

function resolveDiagnosticsMotionAttentionMode(
  motion: StageEmbodimentDriverAuthoritySummaryEntry | null | undefined,
) {
  const attentionMode = normalizeText(motion?.attentionMode)
  if (!motion)
    return attentionMode

  const cue = normalizeText(motion.cue)
  const residentMode = normalizeText(motion.residentMode)
  const blink = normalizeText(motion.preferredBlinkCadence)
  const gaze = normalizeText(motion.preferredGazeMode)

  if (
    attentionMode === 'attentive'
    && cue === 'observe_focus'
    && residentMode === 'measured-return'
    && (blink === 'linger' || gaze === 'soften')
  ) {
    return 'ambient-covision'
  }

  return attentionMode
}

export function buildStageEmbodimentCompanionshipReasonSurfaceSummary(
  reasonSummary: string | null | undefined,
) {
  const normalized = normalizeText(reasonSummary)
  return normalized ? `reason=${normalized}` : null
}

export function buildStageEmbodimentContinuitySourceSurfaceSummary(input: {
  reasonTags?: readonly string[] | null
  signature?: string | null
}) {
  return buildExplicitSameHerContinuitySurface({
    reasonTags: input.reasonTags,
    signature: input.signature,
  })
}

export function buildStageEmbodimentContinuitySignatureSurfaceSummary(
  signature: string | null | undefined,
) {
  const normalized = normalizeText(signature)
  return normalized ? `signature=${normalized}` : null
}

export function buildStageEmbodimentLipSyncExecutionSurfaceSummary(
  input: StageEmbodimentLipSyncExecutionSurfaceInput | null | undefined,
) {
  if (!input)
    return null

  const dominantViseme = normalizeText(input.dominantViseme)
  const dominantWeight = normalizeNumber(input.dominantWeight)
  const segmentId = normalizeText(input.segmentId)
  if (!dominantViseme && dominantWeight == null && !segmentId)
    return null

  const dominant = dominantViseme
    ? dominantWeight != null
      ? `${dominantViseme}@${dominantWeight.toFixed(2)}`
      : dominantViseme
    : dominantWeight != null
      ? `weight@${dominantWeight.toFixed(2)}`
      : null

  return [
    dominant,
    input.active ? 'executing' : 'settling',
    segmentId ? `segment=${segmentId}` : null,
  ].filter((value): value is string => Boolean(value)).join(' | ')
}

export function buildStageEmbodimentMotionExecutionSurfaceSummary(
  input: StageEmbodimentMotionExecutionSurfaceInput | null | undefined,
) {
  if (!input)
    return null

  const cue = normalizeAlicizationSettleLoopToken(normalizeText(input.cue))
  const group = normalizeText(input.group)
  const index = normalizeIndex(input.index)
  const segmentId = normalizeText(input.segmentId)
  if (!cue && !group && index == null && !segmentId)
    return null

  const motion = cue
    ?? (group
      ? index != null
        ? `${group}#${index}`
        : group
      : index != null
        ? `index#${index}`
        : null)

  return [
    motion,
    normalizeText(input.residentMode) ? `mode=${normalizeText(input.residentMode)}` : null,
    normalizeText(input.preferredBlinkCadence) ? `blink=${normalizeText(input.preferredBlinkCadence)}` : null,
    normalizeText(input.preferredGazeMode) ? `gaze=${normalizeText(input.preferredGazeMode)}` : null,
    segmentId ? `segment=${segmentId}` : null,
  ].filter((value): value is string => Boolean(value)).join(' | ')
}

export function buildStageEmbodimentRendererAlignmentSurfaceSummary(
  input: StageEmbodimentRendererAlignmentSurfaceInput | null | undefined,
) {
  if (!input)
    return null

  const predicted = normalizeText(input.predicted)
  const actual = normalizeText(input.actual)
  const faceSegmentId = normalizeText(input.faceDriverSegmentId)
  const motionSegmentId = normalizeText(input.motionDriverSegmentId)
  const bodySegmentId = normalizeText(input.bodyDriverSegmentId)
  const lipsyncSegmentId = normalizeText(input.lipsyncDriverSegmentId)
  const voiceSegmentId = normalizeText(input.voiceDriverSegmentId)
  const faceAuthority = buildAuthoritySurface(
    normalizeText(input.faceDriverCue),
    normalizeText(input.faceDriverSource),
    faceSegmentId,
  )
  const motionAuthority = buildAuthoritySurface(
    normalizeText(input.motionDriverCue),
    normalizeText(input.motionDriverSource),
    motionSegmentId,
  )
  const bodyVoiceRecovery = bodySegmentId
    && voiceSegmentId
    && bodySegmentId === voiceSegmentId
    && lipsyncSegmentId !== bodySegmentId
    && faceSegmentId !== bodySegmentId
    && motionSegmentId !== bodySegmentId
    ? `body+voice recovery@${bodySegmentId}`
    : null
  const bodyLipsyncVoiceRecovery = bodySegmentId
    && lipsyncSegmentId
    && voiceSegmentId
    && bodySegmentId === lipsyncSegmentId
    && bodySegmentId === voiceSegmentId
    && faceSegmentId !== bodySegmentId
    && motionSegmentId !== bodySegmentId
    ? `body+lipsync+voice recovery@${bodySegmentId}`
    : null
  const lipsyncVoiceRecovery = lipsyncSegmentId
    && voiceSegmentId
    && lipsyncSegmentId === voiceSegmentId
    && !bodySegmentId
    && faceSegmentId !== lipsyncSegmentId
    && motionSegmentId !== lipsyncSegmentId
    ? `lipsync+voice recovery@${lipsyncSegmentId}`
    : null
  const bodyOnlyRecovery = bodySegmentId
    && voiceSegmentId !== bodySegmentId
    && lipsyncSegmentId !== bodySegmentId
    && faceSegmentId !== bodySegmentId
    && motionSegmentId !== bodySegmentId
    ? `body-only recovery@${bodySegmentId}`
    : null
  const faceMotionLipsyncVoiceRecovery = faceSegmentId
    && motionSegmentId
    && lipsyncSegmentId
    && voiceSegmentId
    && faceSegmentId === motionSegmentId
    && faceSegmentId === lipsyncSegmentId
    && faceSegmentId === voiceSegmentId
    && !bodySegmentId
    && normalizeText(input.faceDriverCue)
    && normalizeText(input.motionDriverCue)
    ? `face+motion+lipsync+voice recovery@${faceSegmentId}`
    : null
  const sameSegmentRecovery = faceSegmentId
    && motionSegmentId
    && faceSegmentId === motionSegmentId
    && !faceMotionLipsyncVoiceRecovery
    && normalizeText(input.faceDriverCue)
    && normalizeText(input.motionDriverCue)
    ? `same-segment face+motion${bodySegmentId === faceSegmentId ? '+body' : ''} recovery@${faceSegmentId}`
    : null
  const remainingOpenClosure = bodySegmentId
    && faceSegmentId
    && motionSegmentId
    && bodySegmentId === faceSegmentId
    && bodySegmentId === motionSegmentId
    && !voiceSegmentId
    && normalizeText(input.faceDriverCue)
    && normalizeText(input.motionDriverCue)
    ? 'remaining-open=lipsync+voice'
    : null
  const pendingFaceMotionRejoin = bodySegmentId
    && lipsyncSegmentId
    && voiceSegmentId
    && bodySegmentId === lipsyncSegmentId
    && bodySegmentId === voiceSegmentId
    && faceSegmentId !== bodySegmentId
    && motionSegmentId !== bodySegmentId
    ? 'partial=face+motion'
    : null
  const pendingFaceMotionLipsyncRejoin = bodySegmentId
    && voiceSegmentId
    && bodySegmentId === voiceSegmentId
    && lipsyncSegmentId !== bodySegmentId
    && faceSegmentId !== bodySegmentId
    && motionSegmentId !== bodySegmentId
    ? 'partial=face+motion+lipsync'
    : null
  const pendingFaceMotionLipsyncVoiceRejoin = bodySegmentId
    && voiceSegmentId !== bodySegmentId
    && lipsyncSegmentId !== bodySegmentId
    && faceSegmentId !== bodySegmentId
    && motionSegmentId !== bodySegmentId
    ? 'partial=face+motion+lipsync+voice'
    : null
  const audibleBodyRejoin = bodySegmentId
    && lipsyncSegmentId
    && voiceSegmentId
    && bodySegmentId === lipsyncSegmentId
    && bodySegmentId === voiceSegmentId
    && faceSegmentId !== bodySegmentId
    && motionSegmentId !== bodySegmentId
    ? `audible-body rejoin@${bodySegmentId}`
    : null
  const pendingFaceMotionVoiceRejoin = voiceSegmentId
    && bodySegmentId !== voiceSegmentId
    && lipsyncSegmentId !== voiceSegmentId
    && faceSegmentId !== voiceSegmentId
    && motionSegmentId !== voiceSegmentId
    ? 'partial=face+motion+voice'
    : null
  const pendingBodyFaceMotionRejoin = lipsyncSegmentId
    && voiceSegmentId
    && lipsyncSegmentId === voiceSegmentId
    && !bodySegmentId
    && faceSegmentId !== lipsyncSegmentId
    && motionSegmentId !== lipsyncSegmentId
    ? 'partial=body+face+motion'
    : null
  const pendingBodyLipsyncRejoin = faceSegmentId
    && motionSegmentId
    && voiceSegmentId
    && faceSegmentId === motionSegmentId
    && faceSegmentId === voiceSegmentId
    && !bodySegmentId
    && lipsyncSegmentId !== faceSegmentId
    && normalizeText(input.faceDriverCue)
    && normalizeText(input.motionDriverCue)
    ? 'partial=body+lipsync'
    : null
  const pendingBodyRejoin = faceSegmentId
    && motionSegmentId
    && lipsyncSegmentId
    && voiceSegmentId
    && faceSegmentId === motionSegmentId
    && faceSegmentId === lipsyncSegmentId
    && faceSegmentId === voiceSegmentId
    && !bodySegmentId
    && normalizeText(input.faceDriverCue)
    && normalizeText(input.motionDriverCue)
    ? 'partial=body'
    : null
  const explicitSameHerContinuity = buildExplicitSameHerContinuitySurface({
    reasonTags: input.reasonTags,
    signature: input.signature,
  })
  const explicitSameHerSignature = buildStageEmbodimentContinuitySignatureSurfaceSummary(
    input.signature,
  )

  const parts = [
    predicted || actual ? `${predicted ?? 'none'} -> ${actual ?? 'none'}` : null,
    normalizeText(input.residentMode) ? `mode=${normalizeText(input.residentMode)}` : null,
    normalizeText(input.preferredBlinkCadence) ? `blink=${normalizeText(input.preferredBlinkCadence)}` : null,
    normalizeText(input.preferredGazeMode) ? `gaze=${normalizeText(input.preferredGazeMode)}` : null,
    explicitSameHerContinuity,
    explicitSameHerSignature,
    normalizeText(input.status),
    normalizeText(input.driftKind),
    normalizeText(input.reason),
    faceAuthority ? `face=${faceAuthority}` : null,
    motionAuthority ? `motion=${motionAuthority}` : null,
    bodyVoiceRecovery,
    bodyLipsyncVoiceRecovery,
    lipsyncVoiceRecovery,
    bodyOnlyRecovery,
    faceMotionLipsyncVoiceRecovery,
    sameSegmentRecovery,
    audibleBodyRejoin,
    remainingOpenClosure,
    pendingFaceMotionLipsyncVoiceRejoin,
    pendingFaceMotionVoiceRejoin,
    pendingFaceMotionRejoin,
    pendingFaceMotionLipsyncRejoin,
    pendingBodyFaceMotionRejoin,
    pendingBodyLipsyncRejoin,
    pendingBodyRejoin,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
}

export function buildStageEmbodimentRendererLaneFocusSurfaceSummary(
  input: StageEmbodimentRendererAlignmentSurfaceInput | null | undefined,
) {
  if (!input)
    return null

  return formatRendererLaneFocusSurface(resolveRendererLaneFocusSurface(input))
}

export function buildStageEmbodimentDriverSurfaceSummary(
  input: StageEmbodimentDriverSurfaceSummaryInput | null | undefined,
) {
  if (!input)
    return null

  const livingLineInput = resolveHostFacingLoopSurfaceInput(input)
  const bodySummary = buildBodySurfaceSummary(livingLineInput.body)
  const faceSummary = livingLineInput.face?.cue
    ? buildAlicizationFaceSummary({
        emotion: livingLineInput.face.emotion,
        facialCue: livingLineInput.face.cue,
        intensity: livingLineInput.face.intensity,
        holdMs: livingLineInput.face.holdMs,
        preUtteranceCue: livingLineInput.face.preUtteranceCue,
        postUtteranceCue: livingLineInput.face.postUtteranceCue,
        residentMode: livingLineInput.face.residentMode,
        preferredBlinkCadence: livingLineInput.face.preferredBlinkCadence,
        preferredGazeMode: livingLineInput.face.preferredGazeMode,
        reasonSummary: livingLineInput.face.reasonSummary,
        source: livingLineInput.face.source,
        confidence: livingLineInput.face.confidence,
        segmentId: livingLineInput.face.segmentId,
      })
    : null
  const faceContinuitySource = buildStageEmbodimentContinuitySourceSurfaceSummary({
    reasonTags: livingLineInput.face?.reasonTags,
    signature: livingLineInput.face?.signature,
  })
  const faceContinuitySignature = buildStageEmbodimentContinuitySignatureSurfaceSummary(
    livingLineInput.face?.signature,
  )
  const motionSummary = livingLineInput.motion?.cue
    ? buildAlicizationMotionSummary({
        actionCue: livingLineInput.motion.cue,
        attentionMode: resolveDiagnosticsMotionAttentionMode(livingLineInput.motion),
        idleBase: livingLineInput.motion.idleBase,
        intensity: livingLineInput.motion.intensity,
        holdMs: livingLineInput.motion.holdMs,
        residentMode: livingLineInput.motion.residentMode,
        continuityTiming: livingLineInput.motion.continuityTiming,
        preferredBlinkCadence: livingLineInput.motion.preferredBlinkCadence,
        preferredGazeMode: livingLineInput.motion.preferredGazeMode,
        reasonSummary: livingLineInput.motion.reasonSummary,
        source: livingLineInput.motion.source,
        confidence: livingLineInput.motion.confidence,
        segmentId: livingLineInput.motion.segmentId,
      })
    : null
  const motionContinuitySource = buildStageEmbodimentContinuitySourceSurfaceSummary({
    reasonTags: livingLineInput.motion?.reasonTags,
    signature: livingLineInput.motion?.signature,
  })
  const motionContinuitySignature = buildStageEmbodimentContinuitySignatureSurfaceSummary(
    livingLineInput.motion?.signature,
  )
  const lipsyncSummary = livingLineInput.lipsync?.cue
    ? buildAlicizationLipsyncSummary({
        mode: livingLineInput.lipsync.mode,
        phase: livingLineInput.lipsync.playbackPhase,
        continuityHoldMs: livingLineInput.lipsync.continuityHoldMs ?? null,
        topViseme: livingLineInput.lipsync.topViseme ?? null,
        hintTrail: livingLineInput.lipsync.hintTrail ?? null,
        hintViseme: livingLineInput.lipsync.hintViseme ?? livingLineInput.lipsync.cue,
        companionshipMode: livingLineInput.lipsync.residentMode,
        continuityTiming: livingLineInput.lipsync.continuityTiming,
        preferredBlinkCadence: livingLineInput.lipsync.preferredBlinkCadence,
        preferredGazeMode: livingLineInput.lipsync.preferredGazeMode,
        reasonSummary: livingLineInput.lipsync.reasonSummary,
        source: livingLineInput.lipsync.source,
        confidence: livingLineInput.lipsync.confidence,
        segmentId: livingLineInput.lipsync.segmentId,
      })
    : null
  const lipsyncContinuitySource = buildStageEmbodimentContinuitySourceSurfaceSummary({
    reasonTags: livingLineInput.lipsync?.reasonTags,
    signature: livingLineInput.lipsync?.signature,
  })
  const lipsyncContinuitySignature = buildStageEmbodimentContinuitySignatureSurfaceSummary(
    livingLineInput.lipsync?.signature,
  )
  const voiceSummary = normalizeText(livingLineInput.voice)
    ?? buildVoiceAuthorityFallbackSurfaceSummary(livingLineInput.voiceAuthority)
  const voiceContinuitySource = buildStageEmbodimentContinuitySourceSurfaceSummary({
    reasonTags: livingLineInput.voiceAuthority?.reasonTags,
    signature: livingLineInput.voiceAuthority?.signature,
  })
  const voiceContinuitySignature = buildStageEmbodimentContinuitySignatureSurfaceSummary(
    livingLineInput.voiceAuthority?.signature,
  )

  const survivingLanes = [
    bodySummary ? 'body' : null,
    faceSummary ? 'face' : null,
    motionSummary ? 'motion' : null,
    lipsyncSummary ? 'lipsync' : null,
    voiceSummary ? 'voice' : null,
  ].filter((value): value is string => Boolean(value))
  const laneSummary = survivingLanes.length > 0 && survivingLanes.length < 5
    ? `lane=${survivingLanes.join('+')}-only`
    : null

  const parts = [
    bodySummary,
    faceSummary ? [faceSummary, faceContinuitySource, faceContinuitySignature].filter((value): value is string => Boolean(value)).join(' | ') : null,
    motionSummary ? [motionSummary, motionContinuitySource, motionContinuitySignature].filter((value): value is string => Boolean(value)).join(' | ') : null,
    lipsyncSummary ? [lipsyncSummary, lipsyncContinuitySource, lipsyncContinuitySignature].filter((value): value is string => Boolean(value)).join(' | ') : null,
    voiceSummary ? [voiceSummary, voiceContinuitySource, voiceContinuitySignature].filter((value): value is string => Boolean(value)).join(' | ') : null,
    buildEmbodimentClosureSurfaceSummary(livingLineInput),
    laneSummary,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
}

function buildStageEmbodimentLoopClosureCarrySummary(
  input: StageEmbodimentDriverSurfaceSummaryInput | null | undefined,
) {
  if (!input)
    return null

  const bodySegmentId = normalizeText(input.body?.segmentId)
  const faceSegmentId = normalizeText(input.face?.segmentId)
  const motionSegmentId = normalizeText(input.motion?.segmentId)
  const lipsyncSegmentId = normalizeText(input.lipsync?.segmentId)
  const hasVoice = Boolean(
    normalizeText(input.voice)
    || normalizeText(input.voiceAuthority?.segmentId)
    || normalizeText(input.voiceAuthority?.source),
  )
  const hasFaceCue = Boolean(normalizeText(input.face?.cue))
  const hasMotionCue = Boolean(normalizeText(input.motion?.cue))

  const faceMotionBodySameSegment = bodySegmentId
    && faceSegmentId
    && motionSegmentId
    && bodySegmentId === faceSegmentId
    && bodySegmentId === motionSegmentId
    && hasFaceCue
    && hasMotionCue

  if (!faceMotionBodySameSegment)
    return null

  const parts = [
    `same-segment face+motion+body recovery@${bodySegmentId}`,
    !lipsyncSegmentId && !hasVoice ? 'remaining-open=lipsync+voice' : null,
  ].filter((value): value is string => Boolean(value))

  return parts.length > 0 ? parts.join(' | ') : null
}

export function buildStageEmbodimentLoopSurfaceSummary(
  input: StageEmbodimentDriverSurfaceSummaryInput | null | undefined,
) {
  if (!input)
    return null

  const livingLineInput = resolveHostFacingLoopSurfaceInput(input)
  const authoritySummary = [
    buildStageEmbodimentDriverSurfaceSummary(livingLineInput),
    buildStageEmbodimentLoopClosureCarrySummary(livingLineInput),
  ].filter((value): value is string => Boolean(value)).join(' | ') || null
  const parsedVoiceSummary = parseDelimitedSummaryParts(livingLineInput.voice)
  const preferredBlinkCadence = livingLineInput.face?.preferredBlinkCadence
    ?? livingLineInput.motion?.preferredBlinkCadence
    ?? livingLineInput.lipsync?.preferredBlinkCadence
    ?? livingLineInput.voiceAuthority?.preferredBlinkCadence
    ?? null
  const preferredGazeMode = livingLineInput.face?.preferredGazeMode
    ?? livingLineInput.motion?.preferredGazeMode
    ?? livingLineInput.lipsync?.preferredGazeMode
    ?? livingLineInput.voiceAuthority?.preferredGazeMode
    ?? null
  const voiceCompanionshipMode = livingLineInput.voiceAuthority?.residentMode
    ?? livingLineInput.lipsync?.residentMode
    ?? livingLineInput.face?.residentMode
    ?? livingLineInput.motion?.residentMode
    ?? parsedVoiceSummary?.fields.get('companion')
    ?? null
  const voiceContinuityTiming = livingLineInput.voiceAuthority?.continuityTiming
    ?? livingLineInput.lipsync?.continuityTiming
    ?? livingLineInput.face?.continuityTiming
    ?? livingLineInput.motion?.continuityTiming
    ?? parsedVoiceSummary?.fields.get('timing')
    ?? null
  const voiceReasonSummary = livingLineInput.voiceAuthority?.reasonSummary
    ?? livingLineInput.lipsync?.reasonSummary
    ?? livingLineInput.face?.reasonSummary
    ?? livingLineInput.motion?.reasonSummary
    ?? parsedVoiceSummary?.fields.get('reason')
    ?? null
  const voiceSource = livingLineInput.voiceAuthority?.source
    ?? parsedVoiceSummary?.fields.get('src')
    ?? null
  const voiceSegmentId = livingLineInput.voiceAuthority?.segmentId
    ?? livingLineInput.lipsync?.segmentId
    ?? livingLineInput.face?.segmentId
    ?? livingLineInput.motion?.segmentId
    ?? parsedVoiceSummary?.fields.get('seg')
    ?? null

  return buildAlicizationEmbodimentLoopSummary({
    authoritySummary,
    currentBodyState: livingLineInput.body?.frameMode ?? livingLineInput.rendererTarget,
    emotion: livingLineInput.face?.emotion ?? null,
    facialCue: livingLineInput.face?.cue ?? null,
    expressionMode: livingLineInput.face?.preUtteranceCue ?? null,
    intensity: livingLineInput.face?.intensity ?? null,
    faceHoldMs: livingLineInput.face?.holdMs ?? null,
    preUtteranceCue: livingLineInput.face?.preUtteranceCue ?? null,
    postUtteranceCue: livingLineInput.face?.postUtteranceCue ?? null,
    faceResidentMode: livingLineInput.face?.residentMode ?? null,
    faceContinuityTiming: livingLineInput.face?.continuityTiming ?? null,
    preferredBlinkCadence,
    preferredGazeMode,
    faceReasonSummary: livingLineInput.face?.reasonSummary ?? null,
    faceSource: livingLineInput.face?.source ?? null,
    faceConfidence: livingLineInput.face?.confidence ?? null,
    faceSegmentId: livingLineInput.face?.segmentId ?? null,
    language: parsedVoiceSummary?.headline ?? null,
    pitchDelta: parseSummaryFiniteNumber(parsedVoiceSummary?.fields.get('pitch')),
    rateMultiplier: parseSummaryFiniteNumber(parsedVoiceSummary?.fields.get('rate')),
    energy: parseSummaryFiniteNumber(parsedVoiceSummary?.fields.get('energy')),
    cadence: parseSummaryFiniteNumber(parsedVoiceSummary?.fields.get('cadence')),
    closureBias: parseSummaryFiniteNumber(parsedVoiceSummary?.fields.get('closure')),
    consonantPrecision: parseSummaryFiniteNumber(parsedVoiceSummary?.fields.get('precision')),
    companionshipMode: voiceCompanionshipMode,
    voiceContinuityTiming,
    voiceReasonSummary,
    voiceSource,
    voiceSegmentId,
    mode: livingLineInput.lipsync?.mode ?? null,
    phase: livingLineInput.lipsync?.playbackPhase ?? null,
    continuityHoldMs: livingLineInput.lipsync?.continuityHoldMs ?? null,
    topViseme: livingLineInput.lipsync?.topViseme ?? null,
    hintTrail: livingLineInput.lipsync?.hintTrail ?? null,
    hintViseme: livingLineInput.lipsync?.hintViseme ?? null,
    lipsyncCompanionshipMode: livingLineInput.lipsync?.residentMode ?? null,
    lipsyncContinuityTiming: livingLineInput.lipsync?.continuityTiming ?? null,
    lipsyncReasonSummary: livingLineInput.lipsync?.reasonSummary ?? null,
    lipsyncVisemeBias: null,
    lipsyncEnergyBias: null,
    mouthScale: null,
    lipsyncSource: livingLineInput.lipsync?.source ?? null,
    lipsyncConfidence: livingLineInput.lipsync?.confidence ?? null,
    lipsyncSegmentId: livingLineInput.lipsync?.segmentId ?? null,
    actionCue: livingLineInput.motion?.cue ?? null,
    attentionMode: livingLineInput.motion?.attentionMode ?? null,
    idleBase: livingLineInput.motion?.idleBase ?? null,
    motionIntensity: livingLineInput.motion?.intensity ?? null,
    motionHoldMs: livingLineInput.motion?.holdMs ?? null,
    motionResidentMode: livingLineInput.motion?.residentMode ?? null,
    motionContinuityTiming: livingLineInput.motion?.continuityTiming ?? null,
    motionReasonSummary: livingLineInput.motion?.reasonSummary ?? null,
    motionSource: livingLineInput.motion?.source ?? null,
    motionConfidence: livingLineInput.motion?.confidence ?? null,
    motionSegmentId: livingLineInput.motion?.segmentId ?? null,
  })
}
