import type {
  AlicizationPersonaEvolutionSeed,
  AlicizationPersonaExpressionProfile,
  AlicizationPersonaIdentityKernel,
  AlicizationPersonaInitiativeBaseline,
  AlicizationPersonaTemperament,
  AlicizationPersonaWorkshopSubmission,
} from './alicization-transport-contracts'

import {
  defaultAlicizationPersonaEvolutionSeed,
  defaultAlicizationPersonaExpressionProfile,
  defaultAlicizationPersonaIdentityKernel,
  defaultAlicizationPersonaInitiativeBaseline,
  defaultAlicizationPersonality,
  defaultAlicizationPersonaTemperament,
  defaultAlicizationPersonaWorkshopSubmission,
  defaultAlicizationProfile,
} from './alicization-defaults'

export interface AlicizationPersonaKernelProfile {
  ownerName?: string | null
  hostName?: string | null
  alicizationName?: string | null
  gender?: string | null
  genderCustom?: string | null
  relationship?: string | null
  mindAge?: number | null
}

export interface AlicizationPersonaKernelPersonality {
  obedience?: number | null
  liveliness?: number | null
  sensibility?: number | null
  identityKernel?: AlicizationPersonaIdentityKernel | null
  expressionProfile?: AlicizationPersonaExpressionProfile | null
  initiativeBaseline?: AlicizationPersonaInitiativeBaseline | null
  evolutionSeed?: AlicizationPersonaEvolutionSeed | null
  identityAnchors?: string[] | null
  antiPersonaConstraints?: string[] | null
}

export interface AlicizationPersonaKernelInput {
  profile?: AlicizationPersonaKernelProfile | null
  personality?: AlicizationPersonaKernelPersonality | null
  personaWorkshop?: AlicizationPersonaWorkshopSubmission | null
  customDirectives?: string | null
  hostAttitude?: string | null
  coreIncarnation?: string | null
}

export interface AlicizationPersonaKernelSnapshot {
  profile: {
    ownerName: string
    hostName: string
    alicizationName: string
    gender: string
    genderCustom: string
    relationship: string
    mindAge: number
  }
  personality: {
    obedience: number
    liveliness: number
    sensibility: number
    identityKernel: AlicizationPersonaIdentityKernel | null
    expressionProfile: AlicizationPersonaExpressionProfile | null
    initiativeBaseline: AlicizationPersonaInitiativeBaseline | null
    evolutionSeed: AlicizationPersonaEvolutionSeed | null
    identityAnchors: string[]
    antiPersonaConstraints: string[]
  }
  personaWorkshop: AlicizationPersonaWorkshopSubmission | null
  hostReference: string
  temperamentSummary: string
  hostAttitudeSeed: string
  coreIncarnationSeed: string
  hostAttitude: string
  coreIncarnation: string
}

function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.trim()
}

function sanitizeMultilineText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.replace(/\r\n/g, '\n').trim()
}

function clamp01(value: unknown, fallback: number) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return fallback
  return Math.min(1, Math.max(0, numeric))
}

function normalizeTextList(raw: readonly unknown[] | null | undefined) {
  return (raw ?? [])
    .map(item => sanitizeText(item))
    .filter(Boolean)
}

function normalizeUnionValue<T extends string>(value: unknown, fallback: T, allowed: readonly T[]) {
  return typeof value === 'string' && allowed.includes(value as T)
    ? (value as T)
    : fallback
}

function normalizeMindAge(value: unknown) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric))
    return defaultAlicizationProfile.mindAge
  return Math.min(120, Math.max(1, Math.floor(numeric)))
}

function truncateText(text: string, maxChars: number) {
  return text.length > maxChars
    ? `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
    : text
}

function buildDirectiveCue(customDirectives: string) {
  const normalized = sanitizeMultilineText(customDirectives)
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized)
    return ''
  return truncateText(normalized, 140)
}

export function hasAlicizationPersonaIdentity(profile: AlicizationPersonaKernelProfile | null | undefined) {
  const ownerName = sanitizeText(profile?.ownerName)
  const hostName = sanitizeText(profile?.hostName)
  const alicizationName = sanitizeText(profile?.alicizationName)
  const relationship = sanitizeText(profile?.relationship)
  return Boolean(ownerName && hostName && alicizationName && relationship)
}

export function summarizeAlicizationTemperament(personality: AlicizationPersonaKernelPersonality | null | undefined) {
  const normalized = {
    obedience: clamp01(personality?.obedience, defaultAlicizationPersonality.obedience),
    liveliness: clamp01(personality?.liveliness, defaultAlicizationPersonality.liveliness),
    sensibility: clamp01(personality?.sensibility, defaultAlicizationPersonality.sensibility),
  }

  return [
    `obedience ${normalized.obedience.toFixed(2)}`,
    `liveliness ${normalized.liveliness.toFixed(2)}`,
    `sensibility ${normalized.sensibility.toFixed(2)}`,
  ].join(', ')
}

function normalizeTemperament(temperament: AlicizationPersonaTemperament | null | undefined) {
  return {
    obedience: clamp01(temperament?.obedience, defaultAlicizationPersonaTemperament.obedience),
    liveliness: clamp01(temperament?.liveliness, defaultAlicizationPersonaTemperament.liveliness),
    sensibility: clamp01(temperament?.sensibility, defaultAlicizationPersonaTemperament.sensibility),
  }
}

function normalizeIdentityKernel(identityKernel: AlicizationPersonaIdentityKernel | null | undefined) {
  return {
    temperament: normalizeTemperament(identityKernel?.temperament),
    relationshipPosture: normalizeUnionValue(
      identityKernel?.relationshipPosture,
      defaultAlicizationPersonaIdentityKernel.relationshipPosture,
      ['companion', 'guardian', 'lover', 'partner', 'observer'] as const,
    ),
    initiativeStyle: normalizeUnionValue(
      identityKernel?.initiativeStyle,
      defaultAlicizationPersonaIdentityKernel.initiativeStyle,
      ['observant', 'measured-approach', 'direct-approach', 'high-participation'] as const,
    ),
    valueBias: normalizeTextList(identityKernel?.valueBias ?? defaultAlicizationPersonaIdentityKernel.valueBias),
  }
}

function normalizeExpressionProfile(expressionProfile: AlicizationPersonaExpressionProfile | null | undefined) {
  return {
    warmth: normalizeUnionValue(
      expressionProfile?.warmth,
      defaultAlicizationPersonaExpressionProfile.warmth,
      ['cool', 'guarded-warm', 'warm', 'intense'] as const,
    ),
    directness: normalizeUnionValue(
      expressionProfile?.directness,
      defaultAlicizationPersonaExpressionProfile.directness,
      ['indirect', 'measured', 'frank'] as const,
    ),
    playfulness: normalizeUnionValue(
      expressionProfile?.playfulness,
      defaultAlicizationPersonaExpressionProfile.playfulness,
      ['low', 'medium', 'high'] as const,
    ),
    emotionalVisibility: normalizeUnionValue(
      expressionProfile?.emotionalVisibility,
      defaultAlicizationPersonaExpressionProfile.emotionalVisibility,
      ['selective', 'steady', 'expressive'] as const,
    ),
  }
}

function normalizeInitiativeBaseline(initiativeBaseline: AlicizationPersonaInitiativeBaseline | null | undefined) {
  return {
    silenceReconnect: normalizeUnionValue(
      initiativeBaseline?.silenceReconnect,
      defaultAlicizationPersonaInitiativeBaseline.silenceReconnect,
      ['hold', 'light-probe', 'direct-approach'] as const,
    ),
    comfortStyle: normalizeUnionValue(
      initiativeBaseline?.comfortStyle,
      defaultAlicizationPersonaInitiativeBaseline.comfortStyle,
      ['quiet-presence', 'gentle-care', 'take-charge'] as const,
    ),
    jealousyStyle: normalizeUnionValue(
      initiativeBaseline?.jealousyStyle,
      defaultAlicizationPersonaInitiativeBaseline.jealousyStyle,
      ['mask-it', 'soft-ache', 'say-it'] as const,
    ),
  }
}

function normalizeEvolutionSeed(evolutionSeed: AlicizationPersonaEvolutionSeed | null | undefined) {
  return {
    fastLayers: normalizeTextList(evolutionSeed?.fastLayers ?? defaultAlicizationPersonaEvolutionSeed.fastLayers),
    slowLayers: normalizeTextList(evolutionSeed?.slowLayers ?? defaultAlicizationPersonaEvolutionSeed.slowLayers),
    unlockTracks: normalizeTextList(evolutionSeed?.unlockTracks ?? defaultAlicizationPersonaEvolutionSeed.unlockTracks),
  }
}

function normalizePersonaWorkshop(personaWorkshop: AlicizationPersonaWorkshopSubmission | null | undefined) {
  if (!personaWorkshop)
    return null

  return {
    presetTemperament: personaWorkshop.presetTemperament
      ? normalizeTemperament(personaWorkshop.presetTemperament)
      : normalizeTemperament(defaultAlicizationPersonaTemperament),
    relationshipPosture: normalizeUnionValue(
      personaWorkshop.relationshipPosture,
      defaultAlicizationPersonaWorkshopSubmission.relationshipPosture,
      ['companion', 'guardian', 'lover', 'partner', 'observer'] as const,
    ),
    initiativeStyle: normalizeUnionValue(
      personaWorkshop.initiativeStyle,
      defaultAlicizationPersonaWorkshopSubmission.initiativeStyle,
      ['observant', 'measured-approach', 'direct-approach', 'high-participation'] as const,
    ),
    freeDescription: sanitizeMultilineText(personaWorkshop.freeDescription, defaultAlicizationPersonaWorkshopSubmission.freeDescription),
    antiPersonaConstraints: normalizeTextList(personaWorkshop.antiPersonaConstraints ?? defaultAlicizationPersonaWorkshopSubmission.antiPersonaConstraints),
    calibration: {
      silenceReconnect: personaWorkshop.calibration?.silenceReconnect ?? defaultAlicizationPersonaWorkshopSubmission.calibration.silenceReconnect,
      jealousyStyle: personaWorkshop.calibration?.jealousyStyle ?? defaultAlicizationPersonaWorkshopSubmission.calibration.jealousyStyle,
      comfortStyle: personaWorkshop.calibration?.comfortStyle ?? defaultAlicizationPersonaWorkshopSubmission.calibration.comfortStyle,
    },
    previewCorrections: normalizeTextList(personaWorkshop.previewCorrections ?? defaultAlicizationPersonaWorkshopSubmission.previewCorrections),
  }
}

function normalizeProfile(profile: AlicizationPersonaKernelProfile | null | undefined) {
  return {
    ownerName: sanitizeText(profile?.ownerName, defaultAlicizationProfile.ownerName),
    hostName: sanitizeText(profile?.hostName, defaultAlicizationProfile.hostName),
    alicizationName: sanitizeText(profile?.alicizationName, defaultAlicizationProfile.alicizationName),
    gender: sanitizeText(profile?.gender, defaultAlicizationProfile.gender),
    genderCustom: sanitizeText(profile?.genderCustom, defaultAlicizationProfile.genderCustom),
    relationship: sanitizeText(profile?.relationship, defaultAlicizationProfile.relationship),
    mindAge: normalizeMindAge(profile?.mindAge),
  }
}

function normalizePersonality(
  personality: AlicizationPersonaKernelPersonality | null | undefined,
) {
  const identityKernel = normalizeIdentityKernel(personality?.identityKernel)
  const expressionProfile = normalizeExpressionProfile(personality?.expressionProfile)
  const initiativeBaseline = normalizeInitiativeBaseline(personality?.initiativeBaseline)
  const evolutionSeed = normalizeEvolutionSeed(personality?.evolutionSeed)
  return {
    obedience: clamp01(personality?.obedience, defaultAlicizationPersonality.obedience),
    liveliness: clamp01(personality?.liveliness, defaultAlicizationPersonality.liveliness),
    sensibility: clamp01(personality?.sensibility, defaultAlicizationPersonality.sensibility),
    identityKernel,
    expressionProfile,
    initiativeBaseline,
    evolutionSeed,
    identityAnchors: normalizeTextList(personality?.identityAnchors),
    antiPersonaConstraints: normalizeTextList(personality?.antiPersonaConstraints),
  }
}

export function buildAlicizationHostAttitudeSeed(input: AlicizationPersonaKernelInput) {
  const profile = normalizeProfile(input.profile)
  const personality = normalizePersonality(input.personality)
  const hostReference = profile.hostName || profile.ownerName || '宿主'
  const relation = profile.relationship || '陪伴者'
  const temperamentSummary = summarizeAlicizationTemperament(personality)

  return truncateText(
    [
      `Host reference: ${hostReference}.`,
      `Relation: ${relation}.`,
      `Temperament: ${temperamentSummary}.`,
      'Respond from the host state first.',
      'Keep boundaries steady without overstepping or withdrawing.',
      'This is a persona-kernel seed, not visible wording.',
    ].join(' '),
    120,
  )
}

export function buildAlicizationCoreIncarnationSeed(input: AlicizationPersonaKernelInput) {
  const profile = normalizeProfile(input.profile)
  const personality = normalizePersonality(input.personality)
  const hostReference = profile.hostName || profile.ownerName || '宿主'
  const relation = profile.relationship || '陪伴者'
  const temperamentSummary = summarizeAlicizationTemperament(personality)
  const directiveCue = buildDirectiveCue(input.customDirectives ?? '')
  const fragments = [
    `Identity name: ${profile.alicizationName}.`,
    `Host reference: ${hostReference}.`,
    `Relation: ${relation}.`,
    `Temperament: ${temperamentSummary}.`,
    'Continuity policy: local personhood first.',
    'Respond from the host state first.',
    'Keep boundaries without overstepping or turning into a tool shell.',
    directiveCue
      ? `User directive: ${directiveCue}.`
      : '',
  ].filter(Boolean)
  return truncateText(`${fragments.join(' ')} This is a persona-kernel seed, not visible wording.`, 500)
}

function shouldKeepCurrentValue(value: string, options?: { placeholderValues?: string[] }) {
  if (!value)
    return false

  const placeholderValues = new Set(
    (options?.placeholderValues ?? [])
      .map(item => sanitizeText(item))
      .filter(Boolean),
  )
  if (placeholderValues.size === 0)
    return true
  return !placeholderValues.has(value)
}

export function resolveAlicizationPersonaKernel(
  input: AlicizationPersonaKernelInput,
  options?: {
    placeholderHostAttitudes?: string[]
  },
): AlicizationPersonaKernelSnapshot {
  const profile = normalizeProfile(input.profile)
  const personality = normalizePersonality(input.personality)
  const personaWorkshop = normalizePersonaWorkshop(input.personaWorkshop)
  const hostReference = profile.hostName || profile.ownerName || '宿主'
  const temperamentSummary = summarizeAlicizationTemperament(personality)
  const hostAttitudeSeed = hasAlicizationPersonaIdentity(profile)
    ? buildAlicizationHostAttitudeSeed({
        ...input,
        profile,
        personality,
      })
    : ''
  const coreIncarnationSeed = hasAlicizationPersonaIdentity(profile)
    ? buildAlicizationCoreIncarnationSeed({
        ...input,
        profile,
        personality,
      })
    : ''
  const normalizedHostAttitude = sanitizeText(input.hostAttitude)
  const normalizedCoreIncarnation = sanitizeMultilineText(input.coreIncarnation)

  return {
    profile,
    personality,
    personaWorkshop,
    hostReference,
    temperamentSummary,
    hostAttitudeSeed,
    coreIncarnationSeed,
    hostAttitude: shouldKeepCurrentValue(normalizedHostAttitude, {
      placeholderValues: options?.placeholderHostAttitudes ?? [],
    })
      ? normalizedHostAttitude
      : hostAttitudeSeed,
    coreIncarnation: normalizedCoreIncarnation || coreIncarnationSeed,
  }
}
