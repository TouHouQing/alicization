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

function pickText(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = sanitizeText(value)
    if (normalized)
      return normalized
  }
  return ''
}

export function compilePersonaWorkshopAuthority(input: CompilePersonaWorkshopAuthorityInput): AlicizationPersonalityState {
  const personality = input.personality
  const workshop = input.personaWorkshop ?? null
  const temperament = {
    obedience: clamp01(workshop?.presetTemperament?.obedience ?? personality.identityKernel?.temperament?.obedience ?? personality.obedience),
    liveliness: clamp01(workshop?.presetTemperament?.liveliness ?? personality.identityKernel?.temperament?.liveliness ?? personality.liveliness),
    sensibility: clamp01(workshop?.presetTemperament?.sensibility ?? personality.identityKernel?.temperament?.sensibility ?? personality.sensibility),
  }

  const relationshipPosture = pickText(
    workshop?.relationshipPosture,
    personality.identityKernel?.relationshipPosture,
    defaultAlicizationPersonaIdentityKernel.relationshipPosture,
  )
  const initiativeStyle = pickText(
    workshop?.initiativeStyle,
    personality.identityKernel?.initiativeStyle,
    defaultAlicizationPersonaIdentityKernel.initiativeStyle,
  )
  const valueBias = pickText(
    personality.identityKernel?.valueBias,
    workshop?.freeDescription,
    workshop?.calibration,
  )

  const expressionProfile = {
    warmth: clamp01(personality.expressionProfile?.warmth ?? average([temperament.sensibility, personality.sensibility, defaultAlicizationPersonaExpressionProfile.warmth])),
    directness: clamp01(personality.expressionProfile?.directness ?? average([temperament.obedience, 1 - temperament.liveliness, defaultAlicizationPersonaExpressionProfile.directness])),
    playfulness: clamp01(personality.expressionProfile?.playfulness ?? average([temperament.liveliness, personality.liveliness, defaultAlicizationPersonaExpressionProfile.playfulness])),
    emotionalVisibility: clamp01(personality.expressionProfile?.emotionalVisibility ?? average([temperament.sensibility, personality.sensibility, defaultAlicizationPersonaExpressionProfile.emotionalVisibility])),
  }

  const silenceReconnect = pickText(
    workshop?.previewCorrections?.[0],
    personality.initiativeBaseline?.silenceReconnect,
    defaultAlicizationPersonaInitiativeBaseline.silenceReconnect,
  )
  const comfortStyle = pickText(
    workshop?.calibration,
    personality.initiativeBaseline?.comfortStyle,
    defaultAlicizationPersonaInitiativeBaseline.comfortStyle,
  )
  const jealousyStyle = pickText(
    normalizeTextList(workshop?.antiPersonaConstraints).join(' / '),
    personality.initiativeBaseline?.jealousyStyle,
    defaultAlicizationPersonaInitiativeBaseline.jealousyStyle,
  )

  const antiPersonaConstraints = dedupe([
    ...normalizeTextList(personality.antiPersonaConstraints),
    ...normalizeTextList(workshop?.antiPersonaConstraints),
  ])
  const identityAnchors = dedupe([
    ...normalizeTextList(personality.identityAnchors),
    ...normalizeTextList([
      workshop?.freeDescription,
      workshop?.calibration,
      workshop?.relationshipPosture,
      workshop?.initiativeStyle,
    ]),
  ])

  const evolutionSeed = {
    fastLayers: dedupe([
      ...normalizeTextList(personality.evolutionSeed?.fastLayers),
      ...normalizeTextList([
        workshop?.freeDescription,
        workshop?.previewCorrections?.[0],
      ]),
    ]),
    slowLayers: dedupe([
      ...normalizeTextList(personality.evolutionSeed?.slowLayers),
      ...normalizeTextList([workshop?.calibration]),
    ]),
    unlockTracks: dedupe([
      ...normalizeTextList(personality.evolutionSeed?.unlockTracks),
      ...normalizeTextList([
        workshop?.relationshipPosture,
        workshop?.initiativeStyle,
      ]),
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
