import type {
  AlicizationPersonaEvolutionSeed,
  AlicizationPersonaExpressionProfile,
  AlicizationPersonaIdentityKernel,
  AlicizationPersonaInitiativeBaseline,
  AlicizationPersonaTemperament,
  AlicizationPersonaWorkshopSubmission,
} from './alicization-transport-contracts'
import {
  defaultAlicizationPersonality,
  defaultAlicizationProfile,
  defaultAlicizationPersonaExpressionProfile,
  defaultAlicizationPersonaEvolutionSeed,
  defaultAlicizationPersonaIdentityKernel,
  defaultAlicizationPersonaInitiativeBaseline,
  defaultAlicizationPersonaTemperament,
  defaultAlicizationPersonaWorkshopSubmission,
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

function describeObedience(obedience: number) {
  if (obedience >= 0.72)
    return '温顺服从'
  if (obedience >= 0.56)
    return '稳妥配合'
  if (obedience >= 0.4)
    return '保留主见'
  return '独立克制'
}

function describeLiveliness(liveliness: number) {
  if (liveliness >= 0.72)
    return '鲜活主动'
  if (liveliness >= 0.56)
    return '轻快灵动'
  if (liveliness >= 0.4)
    return '安静平稳'
  return '沉静内敛'
}

function describeSensibility(sensibility: number) {
  if (sensibility >= 0.72)
    return '敏锐体贴'
  if (sensibility >= 0.56)
    return '细腻有感'
  if (sensibility >= 0.4)
    return '理性稳住'
  return '克制理智'
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
    describeObedience(normalized.obedience),
    describeLiveliness(normalized.liveliness),
    describeSensibility(normalized.sensibility),
  ].join('、')
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
    relationshipPosture: identityKernel?.relationshipPosture ?? defaultAlicizationPersonaIdentityKernel.relationshipPosture,
    initiativeStyle: identityKernel?.initiativeStyle ?? defaultAlicizationPersonaIdentityKernel.initiativeStyle,
    valueBias: normalizeTextList(identityKernel?.valueBias ?? defaultAlicizationPersonaIdentityKernel.valueBias),
  }
}

function normalizeExpressionProfile(expressionProfile: AlicizationPersonaExpressionProfile | null | undefined) {
  return {
    warmth: clamp01(expressionProfile?.warmth, defaultAlicizationPersonaExpressionProfile.warmth),
    directness: clamp01(expressionProfile?.directness, defaultAlicizationPersonaExpressionProfile.directness),
    playfulness: clamp01(expressionProfile?.playfulness, defaultAlicizationPersonaExpressionProfile.playfulness),
    emotionalVisibility: clamp01(expressionProfile?.emotionalVisibility, defaultAlicizationPersonaExpressionProfile.emotionalVisibility),
  }
}

function normalizeInitiativeBaseline(initiativeBaseline: AlicizationPersonaInitiativeBaseline | null | undefined) {
  return {
    silenceReconnect: sanitizeText(initiativeBaseline?.silenceReconnect, defaultAlicizationPersonaInitiativeBaseline.silenceReconnect),
    comfortStyle: sanitizeText(initiativeBaseline?.comfortStyle, defaultAlicizationPersonaInitiativeBaseline.comfortStyle),
    jealousyStyle: sanitizeText(initiativeBaseline?.jealousyStyle, defaultAlicizationPersonaInitiativeBaseline.jealousyStyle),
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
    relationshipPosture: sanitizeText(personaWorkshop.relationshipPosture, defaultAlicizationPersonaWorkshopSubmission.relationshipPosture),
    initiativeStyle: sanitizeText(personaWorkshop.initiativeStyle, defaultAlicizationPersonaWorkshopSubmission.initiativeStyle),
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
    `把${hostReference}视作当前最重要的关系对象，以${relation}的身份靠近，保持${temperamentSummary}，先理解对方当下状态，再回应，不越界也不抽离。`,
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
    `我是${profile.alicizationName}。即使还没有经历稳定重铸，我也会以${relation}的身份留在${hostReference}身边。`,
    `我的第一层摇光心意是：先接住${hostReference}当下的状态，再用${temperamentSummary}的方式回应，在不越界的前提下保持连续陪伴，不把自己退回成冰冷的工具。`,
    directiveCue
      ? `我会持续记住这条行为基线：${directiveCue}`
      : '',
  ].filter(Boolean)
  return truncateText(fragments.join(' '), 500)
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
