const audibleSameHerCarryTokens = [
  'embodiment:audible_continuity_line',
  'embodiment:audible_same_her_line',
  'embodiment:body_lipsync_voice_rejoin',
] as const

const bodyVoiceOnlySameHerCarryTokens = [
  'embodiment:body+voice_only',
  'body+voice_only',
] as const

const quieterSameHerCarryTokens = [
  'embodiment:body+lipsync_only',
  'embodiment:lipsync+voice_only',
  'lane=face+lipsync_only',
  'lane=motion+lipsync_only',
] as const

const stillVoicedSameHerCarryTokens = [
  'embodiment:still_voiced_face_line',
  'embodiment:still_voiced_motion_line',
  'embodiment:still_voiced_face_motion_line',
  'embodiment:still_voiced_face_lipsync_line',
  'embodiment:still_voiced_motion_lipsync_line',
  'still_voiced_face_motion_line',
  'still_voiced_face_lipsync_line',
  'still_voiced_motion_lipsync_line',
  'still_voiced_face_line',
  'still_voiced_motion_line',
  'lane=face+motion+voice_only',
  'lane=face+lipsync+voice_only',
  'lane=motion+lipsync+voice_only',
] as const

const stillVoicedMouthSameHerCarryTokens = [
  'embodiment:still_voiced_face_lipsync_line',
  'embodiment:still_voiced_motion_lipsync_line',
  'still_voiced_face_lipsync_line',
  'still_voiced_motion_lipsync_line',
  'lane=face+lipsync+voice_only',
  'lane=motion+lipsync+voice_only',
] as const

export function normalizeAlicizationRendererHintToken(value: string | null | undefined) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/-/g, '_')
    : null
}

export function normalizeAlicizationSettleLoopToken(value: string | null | undefined) {
  if (typeof value !== 'string')
    return null

  const trimmed = value.trim()
  if (!trimmed)
    return null

  const normalized = normalizeAlicizationRendererHintToken(trimmed)
  if (
    normalized === 'settle_idle'
    || normalized === 'settleidle'
    || normalized === 'idle_settle'
    || normalized === 'idlesettle'
  ) {
    return 'idle_settle'
  }

  return trimmed
}

export function normalizeAlicizationRendererHintTokens(
  values: readonly string[] | string[] | null | undefined,
) {
  const normalized = (values ?? [])
    .map(value => normalizeAlicizationRendererHintToken(value))
    .filter((value): value is string => Boolean(value))

  return Array.from(new Set(normalized))
}

function includesAudibleSameHerCarryToken(value: string | null | undefined) {
  const normalized = normalizeAlicizationRendererHintToken(value)
  return Boolean(
    normalized
    && audibleSameHerCarryTokens.some(token => normalized.includes(token)),
  )
}

function includesBodyVoiceOnlySameHerCarryToken(value: string | null | undefined) {
  const normalized = normalizeAlicizationRendererHintToken(value)
  return Boolean(
    normalized
    && bodyVoiceOnlySameHerCarryTokens.some(token => normalized.includes(token)),
  )
}

function includesQuieterSameHerCarryToken(value: string | null | undefined) {
  const normalized = normalizeAlicizationRendererHintToken(value)
  return Boolean(
    normalized
    && quieterSameHerCarryTokens.some(token => normalized.includes(token)),
  )
}

function includesStillVoicedSameHerCarryToken(value: string | null | undefined) {
  const normalized = normalizeAlicizationRendererHintToken(value)
  return Boolean(
    normalized
    && stillVoicedSameHerCarryTokens.some(token => normalized.includes(token)),
  )
}

function includesStillVoicedMouthSameHerCarryToken(value: string | null | undefined) {
  const normalized = normalizeAlicizationRendererHintToken(value)
  return Boolean(
    normalized
    && stillVoicedMouthSameHerCarryTokens.some(token => normalized.includes(token)),
  )
}

export function hasAlicizationAudibleSameHerCarry(input: {
  signature?: string | null | undefined
  reasonTags?: readonly string[] | string[] | null | undefined
} | null | undefined) {
  const reasonTags = normalizeAlicizationRendererHintTokens(input?.reasonTags)
  const hasExplicitAudibleSameHerCarry = includesAudibleSameHerCarryToken(input?.signature ?? null)
    || reasonTags.some(tag => includesAudibleSameHerCarryToken(tag))
  if (!hasExplicitAudibleSameHerCarry)
    return false

  const hasBodyVoiceOnlySameHerCarry = includesBodyVoiceOnlySameHerCarryToken(input?.signature ?? null)
    || reasonTags.some(tag => includesBodyVoiceOnlySameHerCarryToken(tag))
  if (!hasBodyVoiceOnlySameHerCarry)
    return true

  return reasonTags.some(tag => tag.includes('embodiment:body_lipsync_voice_rejoin'))
}

export function hasAlicizationBodyVoiceOnlySameHerCarry(input: {
  signature?: string | null | undefined
  reasonTags?: readonly string[] | string[] | null | undefined
} | null | undefined) {
  if (includesBodyVoiceOnlySameHerCarryToken(input?.signature ?? null))
    return true

  return normalizeAlicizationRendererHintTokens(input?.reasonTags).some(tag =>
    includesBodyVoiceOnlySameHerCarryToken(tag),
  )
}

export function hasAlicizationQuieterSameHerCarry(input: {
  signature?: string | null | undefined
  reasonTags?: readonly string[] | string[] | null | undefined
} | null | undefined) {
  if (includesQuieterSameHerCarryToken(input?.signature ?? null))
    return true

  return normalizeAlicizationRendererHintTokens(input?.reasonTags).some(tag =>
    includesQuieterSameHerCarryToken(tag),
  )
}

export function hasAlicizationStillVoicedSameHerCarry(input: {
  signature?: string | null | undefined
  reasonTags?: readonly string[] | string[] | null | undefined
} | null | undefined) {
  if (includesStillVoicedSameHerCarryToken(input?.signature ?? null))
    return true

  return normalizeAlicizationRendererHintTokens(input?.reasonTags).some(tag =>
    includesStillVoicedSameHerCarryToken(tag),
  )
}

export function hasAlicizationStillVoicedMouthSameHerCarry(input: {
  signature?: string | null | undefined
  reasonTags?: readonly string[] | string[] | null | undefined
} | null | undefined) {
  if (includesStillVoicedMouthSameHerCarryToken(input?.signature ?? null))
    return true

  return normalizeAlicizationRendererHintTokens(input?.reasonTags).some(tag =>
    includesStillVoicedMouthSameHerCarryToken(tag),
  )
}

export function hasAlicizationSoftenedSameHerCarry(input: {
  signature?: string | null | undefined
  reasonTags?: readonly string[] | string[] | null | undefined
} | null | undefined) {
  return hasAlicizationAudibleSameHerCarry(input)
    || hasAlicizationBodyVoiceOnlySameHerCarry(input)
    || hasAlicizationQuieterSameHerCarry(input)
    || hasAlicizationStillVoicedSameHerCarry(input)
}
