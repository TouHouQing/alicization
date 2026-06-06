import type { AlicizationGender } from '@proj-alicization/stage-ui/stores/alicization-bridge'

import {
  defaultAlicizationCardName,
  defaultAlicizationCustomDirectives,
  defaultAlicizationPersonality,
  defaultAlicizationProfile,
} from '@proj-alicization/stage-shared'

const soulPersonaNotesStart = '<!-- ALICIZATION_PERSONA_NOTES_START -->'
const soulPersonaNotesEnd = '<!-- ALICIZATION_PERSONA_NOTES_END -->'
// NOTICE: Read legacy markers so the settings panel can still display persona notes
// before the main runtime rewrites an older SOUL.md with Alicization anchors.
const legacySoulPersonaNotesStart = `<!-- ${['AL', 'ICE'].join('')}_PERSONA_NOTES_START -->`
const legacySoulPersonaNotesEnd = `<!-- ${['AL', 'ICE'].join('')}_PERSONA_NOTES_END -->`

export interface SoulForgeDraft {
  ownerName: string
  hostName: string
  alicizationName: string
  gender: AlicizationGender
  genderCustom: string
  relationship: string
  mindAge: number
  obedience: number
  liveliness: number
  sensibility: number
  customDirectives: string
}

export type SoulForgeTraitKey = keyof Pick<SoulForgeDraft, 'obedience' | 'liveliness' | 'sensibility'>

export interface SoulForgeTraitMeta {
  key: SoulForgeTraitKey
}

export const soulForgeTraitMetas: SoulForgeTraitMeta[] = [
  {
    key: 'obedience',
  },
  {
    key: 'liveliness',
  },
  {
    key: 'sensibility',
  },
]

export interface CreateDefaultSoulForgeDraftOptions {
  seedAlicizationName?: string
  ownerName?: string
  hostName?: string
  alicizationName?: string
  gender?: AlicizationGender
  relationship?: string
  mindAge?: number
  customDirectives?: string
}

function resolveDefaultAlicizationName(seedAlicizationName: string | undefined, fallbackName: string) {
  const trimmedSeed = seedAlicizationName?.trim()

  // NOTICE: The default card is named "Alicization", but the persona call name
  // is intentionally seeded as "小艾" unless the user gives the card another name.
  if (trimmedSeed && trimmedSeed !== defaultAlicizationCardName)
    return trimmedSeed

  return fallbackName
}

export function createDefaultSoulForgeDraft(options: CreateDefaultSoulForgeDraftOptions = {}): SoulForgeDraft {
  const {
    seedAlicizationName,
    ownerName = defaultAlicizationProfile.ownerName,
    hostName = defaultAlicizationProfile.hostName,
    alicizationName = defaultAlicizationProfile.alicizationName,
    gender = defaultAlicizationProfile.gender,
    relationship = defaultAlicizationProfile.relationship,
    mindAge = defaultAlicizationProfile.mindAge,
    customDirectives = defaultAlicizationCustomDirectives,
  } = options

  return {
    ownerName,
    hostName,
    alicizationName: resolveDefaultAlicizationName(seedAlicizationName, alicizationName),
    gender,
    genderCustom: '',
    relationship,
    mindAge,
    obedience: defaultAlicizationPersonality.obedience,
    liveliness: defaultAlicizationPersonality.liveliness,
    sensibility: defaultAlicizationPersonality.sensibility,
    customDirectives,
  }
}

export function clampSoulForgeUnit(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

function getSoulBodyFromContent(content: string) {
  if (!content.startsWith('---\n'))
    return content.trim()

  const secondMarkerIndex = content.indexOf('\n---\n', 4)
  if (secondMarkerIndex < 0)
    return content.trim()

  return content.slice(secondMarkerIndex + 5).trim()
}

function findPersonaNotesAnchors(body: string) {
  const markerPairs = [
    { start: soulPersonaNotesStart, end: soulPersonaNotesEnd },
    { start: legacySoulPersonaNotesStart, end: legacySoulPersonaNotesEnd },
  ]

  for (const markerPair of markerPairs) {
    const startIndex = body.indexOf(markerPair.start)
    const endIndex = body.indexOf(markerPair.end)
    if (startIndex >= 0 && endIndex > startIndex) {
      return {
        ...markerPair,
        startIndex,
        endIndex,
      }
    }
  }

  return null
}

export function extractPersonaNotesFromSoulContent(content: string) {
  const body = getSoulBodyFromContent(content)
  const anchors = findPersonaNotesAnchors(body)
  if (!anchors)
    return ''

  return body
    .slice(anchors.startIndex + anchors.start.length, anchors.endIndex)
    .trim()
}
