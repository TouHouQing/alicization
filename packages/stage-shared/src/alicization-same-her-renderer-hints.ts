const audibleSameHerCarryTokens = [
  'embodiment:audible_same_her_line',
  'embodiment:body_lipsync_voice_rejoin',
  'embodiment:body+voice_only',
] as const

const quieterSameHerCarryTokens = [
  'embodiment:body+lipsync_only',
  'embodiment:lipsync+voice_only',
] as const

const stillVoicedSameHerCarryTokens = [
  'embodiment:still_voiced_face_line',
  'embodiment:still_voiced_motion_line',
  'still_voiced_face_line',
  'still_voiced_motion_line',
] as const

export function normalizeAlicizationRendererHintToken(value: string | null | undefined) {
  return typeof value === 'string'
    ? value.trim().toLowerCase().replace(/-/g, '_')
    : null
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

export function hasAlicizationAudibleSameHerCarry(input: {
  signature?: string | null | undefined
  reasonTags?: readonly string[] | string[] | null | undefined
} | null | undefined) {
  if (includesAudibleSameHerCarryToken(input?.signature ?? null))
    return true

  return normalizeAlicizationRendererHintTokens(input?.reasonTags).some(tag =>
    includesAudibleSameHerCarryToken(tag),
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

export function hasAlicizationSoftenedSameHerCarry(input: {
  signature?: string | null | undefined
  reasonTags?: readonly string[] | string[] | null | undefined
} | null | undefined) {
  return hasAlicizationAudibleSameHerCarry(input)
    || hasAlicizationQuieterSameHerCarry(input)
    || hasAlicizationStillVoicedSameHerCarry(input)
}
