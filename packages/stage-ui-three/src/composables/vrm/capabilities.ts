import type {
  AlicizationEmotion,
  CharacterActionCapability,
  CharacterFacialCapability,
} from '@proj-alicization/stage-shared'

import { alicizationEmotionWhitelist, resolveStageEmbodimentVrmBaseExpressionName } from '@proj-alicization/stage-shared'

export interface VrmPresetFacialCapabilityDefinition {
  key: string
  label: string
  description: string
  expressionName: string
  affectsMouth: boolean
}

export interface VrmResolvedRuntimeCapabilitySnapshot {
  supportedExpressionNames: string[]
  supportedBaseEmotions: AlicizationEmotion[]
  supportedFacialCues: CharacterFacialCapability[]
  supportedActions: CharacterActionCapability[]
  supportsLookAt: boolean
  supportsVisemeLipSync: boolean
  supportsMicroDynamics: boolean
}

export const vrmVisemeExpressionNames = ['aa', 'ee', 'ih', 'oh', 'ou'] as const

const vrmExpressionAliasGroups = {
  aa: ['aa', 'a', 'viseme_aa', 'viseme_a', 'mouth_a', 'phoneme_a'],
  angry: ['angry', 'anger', 'mad'],
  blink: ['blink', 'blinkleft', 'blinkright'],
  ee: ['ee', 'e', 'viseme_ee', 'viseme_e', 'mouth_e', 'phoneme_e'],
  happy: ['happy', 'joy', 'fun', 'smile', 'warau', 'cheerful'],
  ih: ['ih', 'i', 'viseme_ih', 'viseme_i', 'mouth_i', 'phoneme_i'],
  neutral: ['neutral', 'default', 'idle'],
  oh: ['oh', 'o', 'viseme_oh', 'viseme_o', 'mouth_o', 'phoneme_o'],
  ou: ['ou', 'u', 'viseme_ou', 'viseme_u', 'mouth_u', 'phoneme_u'],
  relaxed: ['relaxed', 'calm', 'content'],
  sad: ['sad', 'sorrow', 'grief', 'cry'],
  surprised: ['surprised', 'surprise', 'shock', 'amazed'],
} as const

type VrmExpressionAliasCanonical = keyof typeof vrmExpressionAliasGroups

const vrmExpressionAliasToCanonical = new Map<string, VrmExpressionAliasCanonical>()

Object.entries(vrmExpressionAliasGroups).forEach(([canonicalName, aliases]) => {
  const canonical = canonicalName as VrmExpressionAliasCanonical
  aliases.forEach((alias) => {
    vrmExpressionAliasToCanonical.set(alias, canonical)
  })
})

function hasAnySupportedAlias(supportedExpressionNames: Set<string>, expressionName: string) {
  return resolveVrmExpressionAliasCandidates(expressionName)
    .some(candidate => supportedExpressionNames.has(candidate))
}

export const vrmStandardExpressionNames = new Set([
  'neutral',
  'happy',
  'angry',
  'sad',
  'relaxed',
  'surprised',
  'aa',
  'ih',
  'ou',
  'ee',
  'oh',
  'blink',
  'blinkleft',
  'blinkright',
  'lookup',
  'lookdown',
  'lookleft',
  'lookright',
])

export const vrmPresetFacialCapabilities: VrmPresetFacialCapabilityDefinition[] = [
  {
    key: 'smile',
    label: 'Smile',
    description: 'A brighter smile layered over the current emotion.',
    expressionName: 'happy',
    affectsMouth: true,
  },
  {
    key: 'frown',
    label: 'Frown',
    description: 'A softer downcast face for worry or regret.',
    expressionName: 'sad',
    affectsMouth: true,
  },
  {
    key: 'glare',
    label: 'Glare',
    description: 'Sharper eyes and brows for stern emphasis.',
    expressionName: 'angry',
    affectsMouth: true,
  },
  {
    key: 'relaxed',
    label: 'Relaxed',
    description: 'A looser expression for thinking, fatigue, or apology.',
    expressionName: 'relaxed',
    affectsMouth: false,
  },
  {
    key: 'shock',
    label: 'Shock',
    description: 'A wide-eyed surprised expression.',
    expressionName: 'surprised',
    affectsMouth: true,
  },
]

const vrmRuntimeActionCapabilities: CharacterActionCapability[] = [
  {
    key: 'steady_focus',
    label: 'Steady Focus',
    description: 'steady focused idle hold',
    source: 'builtin',
  },
  {
    key: 'observe_focus',
    label: 'Observe Focus',
    description: 'gentle observe focus',
    source: 'builtin',
  },
  {
    key: 'idle_settle',
    label: 'Idle Settle',
    description: 'quiet idle settle',
    source: 'builtin',
  },
]

export function normalizeVrmExpressionName(raw: unknown) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

export function resolveVrmExpressionAliasCandidates(expressionName: string) {
  const normalizedExpressionName = normalizeVrmExpressionName(expressionName)
  if (!normalizedExpressionName)
    return []

  const canonical = vrmExpressionAliasToCanonical.get(normalizedExpressionName)
  if (!canonical)
    return [normalizedExpressionName]

  return [...new Set([
    canonical,
    ...vrmExpressionAliasGroups[canonical],
  ].map(name => normalizeVrmExpressionName(name)).filter(Boolean))]
}

export function createVrmSupportedExpressionSet(expressionNames: Iterable<string>) {
  return new Set(
    [...expressionNames]
      .map(name => normalizeVrmExpressionName(name))
      .filter(Boolean),
  )
}

export function resolveSupportedVrmExpressionName(
  expressionNames: Iterable<string>,
  expressionName: string,
) {
  const supportedExpressionNames = createVrmSupportedExpressionSet(expressionNames)
  for (const candidate of resolveVrmExpressionAliasCandidates(expressionName)) {
    if (supportedExpressionNames.has(candidate))
      return candidate
  }

  return ''
}

export function resolveVrmBaseExpressionCandidates(
  baseEmotion: string,
  preferredExpressionCandidates?: Iterable<string>,
) {
  const preferredCandidates = preferredExpressionCandidates == null
    ? []
    : [...preferredExpressionCandidates]
        .map(name => normalizeVrmExpressionName(name))
        .filter(Boolean)

  return [...new Set([
    ...preferredCandidates,
    resolveStageEmbodimentVrmBaseExpressionName(baseEmotion),
  ])]
}

export function resolveVrmBaseExpressionName(
  baseEmotion: string,
  preferredExpressionCandidates?: Iterable<string>,
) {
  return resolveVrmBaseExpressionCandidates(baseEmotion, preferredExpressionCandidates)[0] ?? 'neutral'
}

export function resolveVrmPresetFacialCapability(key?: string | null) {
  if (!key)
    return undefined

  return vrmPresetFacialCapabilities.find(item => item.key === key)
}

export function supportsVrmBaseEmotion(
  expressionNames: Iterable<string>,
  baseEmotion: string,
  preferredExpressionCandidates?: Iterable<string>,
) {
  const supportedExpressionNames = createVrmSupportedExpressionSet(expressionNames)
  return resolveVrmBaseExpressionCandidates(baseEmotion, preferredExpressionCandidates)
    .some(candidate => hasAnySupportedAlias(supportedExpressionNames, candidate))
}

export function listVrmPresetFacialCapabilities(expressionNames: Iterable<string>) {
  const supportedExpressionNames = createVrmSupportedExpressionSet(expressionNames)
  return vrmPresetFacialCapabilities.filter(item =>
    hasAnySupportedAlias(supportedExpressionNames, item.expressionName),
  )
}

export function supportsVrmVisemeLipSync(expressionNames: Iterable<string>) {
  const supportedExpressionNames = createVrmSupportedExpressionSet(expressionNames)
  return vrmVisemeExpressionNames.every(name => hasAnySupportedAlias(supportedExpressionNames, name))
}

export function buildVrmRuntimeCapabilitySnapshot(input: {
  expressionNames: Iterable<string>
  supportsLookAt: boolean
}): VrmResolvedRuntimeCapabilitySnapshot {
  const supportedExpressionNames = [...createVrmSupportedExpressionSet(input.expressionNames)]
    .sort((left, right) => left.localeCompare(right))

  return {
    supportedExpressionNames,
    supportedBaseEmotions: alicizationEmotionWhitelist.filter(emotion =>
      supportsVrmBaseEmotion(supportedExpressionNames, emotion),
    ),
    supportedFacialCues: listVrmPresetFacialCapabilities(supportedExpressionNames).map(item => ({
      key: item.key,
      label: item.label,
      description: item.description,
      source: 'preset' as const,
      affectsMouth: item.affectsMouth,
    })),
    supportedActions: vrmRuntimeActionCapabilities.map(item => ({ ...item })),
    supportsLookAt: input.supportsLookAt,
    supportsVisemeLipSync: supportsVrmVisemeLipSync(supportedExpressionNames),
    supportsMicroDynamics: true,
  }
}
