import type { AlicizationGender, AlicizationPersonalityState } from '@proj-airi/stage-ui/stores/alicization-bridge'

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

export interface SoulForgeTraitMeta {
  key: keyof AlicizationPersonalityState
  label: string
  description: string
  leftLabel: string
  rightLabel: string
}

export const soulForgeTraitMetas: SoulForgeTraitMeta[] = [
  {
    key: 'obedience',
    label: '服从度',
    description: '决定她在被要求行动时，是更倾向顶撞、拖延，还是顺势配合。',
    leftLabel: '桀骜不驯',
    rightLabel: '极致顺从',
  },
  {
    key: 'liveliness',
    label: '活泼度',
    description: '决定她的表达是更冷静克制，还是更主动外放、富有存在感。',
    leftLabel: '三无冰山',
    rightLabel: '元气爆发',
  },
  {
    key: 'sensibility',
    label: '感性度',
    description: '决定她面对互动时，是优先理性判断，还是更容易被情绪与氛围牵引。',
    leftLabel: '绝对理性',
    rightLabel: '情感泛滥',
  },
]

export function createDefaultSoulForgeDraft(seedAlicizationName?: string): SoulForgeDraft {
  return {
    ownerName: '主人',
    hostName: '主人',
    alicizationName: seedAlicizationName?.trim() || 'Alicization',
    gender: 'neutral',
    genderCustom: '',
    relationship: '数字共生体',
    mindAge: 15,
    obedience: 0.5,
    liveliness: 0.5,
    sensibility: 0.5,
    customDirectives: '',
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
