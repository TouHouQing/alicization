import type {
  AlicizationPersonalityState,
  AlicizationPersonaWorkshopSubmission,
} from '../../../shared/eventa'

import {
  defaultAlicizationPersonaExpressionProfile,
  defaultAlicizationPersonaIdentityKernel,
  defaultAlicizationPersonaInitiativeBaseline,
} from '@proj-alicization/stage-shared'

interface CompilePersonaWorkshopAuthorityInput {
  personality: AlicizationPersonalityState
  personaWorkshop?: AlicizationPersonaWorkshopSubmission | null
}

type PersonaExpressionProfile = NonNullable<AlicizationPersonalityState['expressionProfile']>

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.trim()
}

function normalizeTextList(raw: readonly unknown[] | null | undefined) {
  return (raw ?? [])
    .map(item => sanitizeText(item))
    .filter(Boolean)
}

function dedupe(values: string[]) {
  return [...new Set(values.map(item => sanitizeText(item)).filter(Boolean))]
}

function average(values: number[]) {
  const valid = values.filter(value => Number.isFinite(value))
  if (valid.length === 0)
    return 0
  return valid.reduce((sum, value) => sum + value, 0) / valid.length
}

function pickFirst<T extends string>(allowed: readonly T[], ...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === 'string' && allowed.includes(value as T))
      return value as T
  }
  return allowed[0]
}

function resolveExpressionWarmth(score: number) {
  if (score >= 0.92)
    return 'intense' as const
  if (score >= 0.76)
    return 'warm' as const
  if (score >= 0.48)
    return 'guarded-warm' as const
  return 'cool' as const
}

function resolveExpressionDirectness(score: number) {
  if (score >= 0.82)
    return 'frank' as const
  if (score >= 0.4)
    return 'measured' as const
  return 'indirect' as const
}

function resolveExpressionPlayfulness(score: number) {
  if (score >= 0.72)
    return 'high' as const
  if (score >= 0.38)
    return 'medium' as const
  return 'low' as const
}

function resolveExpressionVisibility(score: number) {
  if (score >= 0.9)
    return 'expressive' as const
  if (score >= 0.5)
    return 'steady' as const
  return 'selective' as const
}

function expressionWarmthBaselineToScore(value: PersonaExpressionProfile['warmth']) {
  switch (value) {
    case 'intense':
      return 0.92
    case 'warm':
      return 0.76
    case 'guarded-warm':
      return 0.48
    default:
      return 0.22
  }
}

function expressionDirectnessBaselineToScore(value: PersonaExpressionProfile['directness']) {
  switch (value) {
    case 'frank':
      return 0.82
    case 'measured':
      return 0.52
    default:
      return 0.18
  }
}

function expressionPlayfulnessBaselineToScore(value: PersonaExpressionProfile['playfulness']) {
  switch (value) {
    case 'high':
      return 0.78
    case 'medium':
      return 0.5
    default:
      return 0.2
  }
}

function expressionVisibilityBaselineToScore(value: PersonaExpressionProfile['emotionalVisibility']) {
  switch (value) {
    case 'expressive':
      return 0.92
    case 'steady':
      return 0.6
    default:
      return 0.24
  }
}

export function compilePersonaWorkshopAuthority(input: CompilePersonaWorkshopAuthorityInput): AlicizationPersonalityState {
  const personality = input.personality
  const workshop = input.personaWorkshop ?? null
  const temperament = {
    obedience: clamp01(workshop?.presetTemperament?.obedience ?? personality.obedience ?? personality.identityKernel?.temperament?.obedience),
    liveliness: clamp01(workshop?.presetTemperament?.liveliness ?? personality.liveliness ?? personality.identityKernel?.temperament?.liveliness),
    sensibility: clamp01(workshop?.presetTemperament?.sensibility ?? personality.sensibility ?? personality.identityKernel?.temperament?.sensibility),
  }

  const relationshipPosture = pickFirst(
    ['companion', 'guardian', 'lover', 'partner', 'observer'] as const,
    workshop?.relationshipPosture,
    personality.identityKernel?.relationshipPosture,
    defaultAlicizationPersonaIdentityKernel.relationshipPosture,
  )
  const initiativeStyle = pickFirst(
    ['observant', 'measured-approach', 'direct-approach', 'high-participation'] as const,
    workshop?.initiativeStyle,
    personality.identityKernel?.initiativeStyle,
    defaultAlicizationPersonaIdentityKernel.initiativeStyle,
  )
  const valueBias = dedupe([
    ...normalizeTextList([workshop?.freeDescription]),
    ...normalizeTextList(personality.identityKernel?.valueBias),
  ])

  const warmthScore = clamp01(workshop?.presetTemperament?.sensibility != null
    ? average([
        workshop.presetTemperament.sensibility,
        temperament.sensibility,
        workshop.freeDescription ? 0.76 : expressionWarmthBaselineToScore(defaultAlicizationPersonaExpressionProfile.warmth),
      ])
    : average([
        temperament.sensibility,
        personality.sensibility,
        expressionWarmthBaselineToScore(defaultAlicizationPersonaExpressionProfile.warmth),
      ]))
  const directnessScore = clamp01(workshop?.presetTemperament?.obedience != null
    ? average([
        workshop.presetTemperament.obedience,
        1 - temperament.liveliness,
        expressionDirectnessBaselineToScore(defaultAlicizationPersonaExpressionProfile.directness),
      ])
    : average([
        temperament.obedience,
        1 - temperament.liveliness,
        expressionDirectnessBaselineToScore(defaultAlicizationPersonaExpressionProfile.directness),
      ]))
  const playfulnessScore = clamp01(workshop?.presetTemperament?.liveliness != null
    ? average([
        workshop.presetTemperament.liveliness,
        temperament.liveliness,
        expressionPlayfulnessBaselineToScore(defaultAlicizationPersonaExpressionProfile.playfulness),
      ])
    : average([
        temperament.liveliness,
        personality.liveliness,
        expressionPlayfulnessBaselineToScore(defaultAlicizationPersonaExpressionProfile.playfulness),
      ]))
  const visibilityScore = clamp01(workshop?.presetTemperament?.sensibility != null
    ? average([
        workshop.presetTemperament.sensibility,
        temperament.sensibility,
        workshop.freeDescription ? 0.6 : expressionVisibilityBaselineToScore(defaultAlicizationPersonaExpressionProfile.emotionalVisibility),
      ])
    : average([
        temperament.sensibility,
        personality.sensibility,
        expressionVisibilityBaselineToScore(defaultAlicizationPersonaExpressionProfile.emotionalVisibility),
      ]))

  const expressionProfile = {
    warmth: resolveExpressionWarmth(warmthScore),
    directness: resolveExpressionDirectness(directnessScore),
    playfulness: resolveExpressionPlayfulness(playfulnessScore),
    emotionalVisibility: resolveExpressionVisibility(visibilityScore),
  }

  const silenceReconnect = pickFirst(
    ['hold', 'light-probe', 'direct-approach'] as const,
    workshop?.calibration?.silenceReconnect,
    personality.initiativeBaseline?.silenceReconnect,
    defaultAlicizationPersonaInitiativeBaseline.silenceReconnect,
  )
  const comfortStyle = pickFirst(
    ['quiet-presence', 'gentle-care', 'take-charge'] as const,
    workshop?.calibration?.comfortStyle,
    personality.initiativeBaseline?.comfortStyle,
    defaultAlicizationPersonaInitiativeBaseline.comfortStyle,
  )
  const jealousyStyle = pickFirst(
    ['mask-it', 'soft-ache', 'say-it'] as const,
    workshop?.calibration?.jealousyStyle,
    personality.initiativeBaseline?.jealousyStyle,
    defaultAlicizationPersonaInitiativeBaseline.jealousyStyle,
  )

  const antiPersonaConstraints = dedupe([
    ...normalizeTextList(workshop?.antiPersonaConstraints),
    ...normalizeTextList(personality.antiPersonaConstraints),
  ])
  const identityAnchors = dedupe([
    ...normalizeTextList([
      workshop?.freeDescription,
      workshop?.calibration,
      workshop?.relationshipPosture,
      workshop?.initiativeStyle,
    ]),
    ...normalizeTextList(personality.identityAnchors),
  ])

  const evolutionSeed = {
    fastLayers: dedupe([
      ...normalizeTextList([
        workshop?.freeDescription,
        workshop?.previewCorrections?.[0],
      ]),
      ...normalizeTextList(personality.evolutionSeed?.fastLayers),
    ]),
    slowLayers: dedupe([
      ...normalizeTextList([workshop?.calibration]),
      ...normalizeTextList(personality.evolutionSeed?.slowLayers),
    ]),
    unlockTracks: dedupe([
      ...normalizeTextList([
        workshop?.relationshipPosture,
        workshop?.initiativeStyle,
      ]),
      ...normalizeTextList(personality.evolutionSeed?.unlockTracks),
    ]),
  }

  return {
    obedience: clamp01(personality.obedience),
    liveliness: clamp01(personality.liveliness),
    sensibility: clamp01(personality.sensibility),
    identityKernel: {
      temperament,
      relationshipPosture,
      initiativeStyle,
      valueBias,
    },
    expressionProfile,
    initiativeBaseline: {
      silenceReconnect,
      comfortStyle,
      jealousyStyle,
    },
    evolutionSeed,
    identityAnchors,
    antiPersonaConstraints,
  }
}
