export interface VrmPresetFacialCapabilityDefinition {
  key: string
  label: string
  description: string
  expressionName: string
  affectsMouth: boolean
}

export const vrmVisemeExpressionNames = ['aa', 'ee', 'ih', 'oh', 'ou'] as const

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

export function normalizeVrmExpressionName(raw: unknown) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

export function createVrmSupportedExpressionSet(expressionNames: Iterable<string>) {
  return new Set(
    [...expressionNames]
      .map(name => normalizeVrmExpressionName(name))
      .filter(Boolean),
  )
}

export function resolveVrmBaseExpressionName(baseEmotion: string) {
  switch (baseEmotion) {
    case 'happy':
      return 'happy'
    case 'sad':
      return 'sad'
    case 'angry':
      return 'angry'
    case 'surprised':
      return 'surprised'
    case 'concerned':
      return 'sad'
    case 'tired':
    case 'apologetic':
    case 'thinking':
      return 'relaxed'
    case 'neutral':
    default:
      return 'neutral'
  }
}

export function resolveVrmPresetFacialCapability(key?: string | null) {
  if (!key)
    return undefined

  return vrmPresetFacialCapabilities.find(item => item.key === key)
}

export function supportsVrmBaseEmotion(expressionNames: Iterable<string>, baseEmotion: string) {
  const supportedExpressionNames = createVrmSupportedExpressionSet(expressionNames)
  return supportedExpressionNames.has(resolveVrmBaseExpressionName(baseEmotion))
}

export function listVrmPresetFacialCapabilities(expressionNames: Iterable<string>) {
  const supportedExpressionNames = createVrmSupportedExpressionSet(expressionNames)
  return vrmPresetFacialCapabilities.filter(item =>
    supportedExpressionNames.has(normalizeVrmExpressionName(item.expressionName)),
  )
}

export function supportsVrmVisemeLipSync(expressionNames: Iterable<string>) {
  const supportedExpressionNames = createVrmSupportedExpressionSet(expressionNames)
  return vrmVisemeExpressionNames.every(name => supportedExpressionNames.has(name))
}
