import type { CharacterFacialCapability } from './alicization-performance-contracts'

export type StageEmbodimentCanonicalEmotion
  = | 'neutral'
    | 'happy'
    | 'sad'
    | 'angry'
    | 'concerned'
    | 'tired'
    | 'apologetic'
    | 'surprised'
    | 'thinking'
    | 'awkward'
    | 'question'
    | 'curious'

export type StageEmbodimentLegacyEmotion
  = | 'happy'
    | 'sad'
    | 'angry'
    | 'think'
    | 'surprised'
    | 'awkward'
    | 'question'
    | 'curious'
    | 'neutral'

export type StageEmbodimentDelivery
  = | 'calm'
    | 'gentle'
    | 'firm'
    | 'energetic'
    | 'hesitant'
    | 'teasing'

export const stageEmbodimentCanonicalEmotions = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'concerned',
  'tired',
  'apologetic',
  'surprised',
  'thinking',
  'awkward',
  'question',
  'curious',
] as const satisfies readonly StageEmbodimentCanonicalEmotion[]

export interface StageEmbodimentSpeechStyleProfile {
  pitchDelta: number
  rateMultiplier: number
}

interface StageEmbodimentEmotionProfile {
  stageEmotion: StageEmbodimentLegacyEmotion
  speechStyle: StageEmbodimentSpeechStyleProfile
  live2dMotionAliases: string[]
  vrmBaseExpressionCandidates: string[]
  facialCueCandidates: string[]
  actionCueCandidates: string[]
}

interface StageEmbodimentDeliveryProfile {
  facialCueCandidates: string[]
  actionCueCandidates: string[]
}

interface StageEmbodimentLive2DFacialCapabilityDefinition extends CharacterFacialCapability {
  aliases?: string[]
}

function dedupeStrings(values: Array<string | null | undefined>) {
  const deduped: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized || seen.has(normalized))
      continue

    seen.add(normalized)
    deduped.push(normalized)
  }

  return deduped
}

const stageEmbodimentEmotionProfiles: Record<StageEmbodimentCanonicalEmotion, StageEmbodimentEmotionProfile> = {
  neutral: {
    stageEmotion: 'neutral',
    speechStyle: { pitchDelta: 0, rateMultiplier: 1 },
    live2dMotionAliases: ['Idle', 'Neutral', 'Default'],
    vrmBaseExpressionCandidates: ['neutral'],
    facialCueCandidates: ['relaxed', 'focus', 'soft-gaze'],
    actionCueCandidates: ['idle_settle', 'idle_gentle_nod', 'observe_focus'],
  },
  happy: {
    stageEmotion: 'happy',
    speechStyle: { pitchDelta: 8, rateMultiplier: 1.06 },
    live2dMotionAliases: ['Happy', 'Joy', 'Cheer', 'Smile'],
    vrmBaseExpressionCandidates: ['happy'],
    facialCueCandidates: ['smile', 'bright-smile', 'relaxed'],
    actionCueCandidates: ['cheer_raise_hand', 'raise_hand_excited', 'sway_relaxed'],
  },
  sad: {
    stageEmotion: 'sad',
    speechStyle: { pitchDelta: -20, rateMultiplier: 0.82 },
    live2dMotionAliases: ['Sad', 'Down', 'Gloom'],
    vrmBaseExpressionCandidates: ['sad', 'relaxed'],
    facialCueCandidates: ['frown', 'relaxed', 'downcast'],
    actionCueCandidates: ['idle_settle', 'comfort_sway', 'slow_nod'],
  },
  angry: {
    stageEmotion: 'angry',
    speechStyle: { pitchDelta: -12, rateMultiplier: 1.1 },
    live2dMotionAliases: ['Angry', 'Mad', 'Firm'],
    vrmBaseExpressionCandidates: ['angry'],
    facialCueCandidates: ['glare', 'focus', 'frown'],
    actionCueCandidates: ['steady_focus', 'inspect_focus', 'disdain_side_glance'],
  },
  concerned: {
    stageEmotion: 'question',
    speechStyle: { pitchDelta: 3, rateMultiplier: 1.02 },
    live2dMotionAliases: ['Question', 'Concerned', 'Concern', 'Observe'],
    vrmBaseExpressionCandidates: ['sad', 'relaxed'],
    facialCueCandidates: ['frown', 'soft-gaze', 'relaxed'],
    actionCueCandidates: ['idle_gentle_nod', 'comfort_sway', 'observe_focus'],
  },
  tired: {
    stageEmotion: 'sad',
    speechStyle: { pitchDelta: -20, rateMultiplier: 0.82 },
    live2dMotionAliases: ['Idle', 'Tired', 'Relax'],
    vrmBaseExpressionCandidates: ['relaxed', 'neutral'],
    facialCueCandidates: ['relaxed', 'half-lid', 'slow-blink'],
    actionCueCandidates: ['idle_settle', 'slow_sway', 'slow_nod'],
  },
  apologetic: {
    stageEmotion: 'awkward',
    speechStyle: { pitchDelta: -6, rateMultiplier: 0.92 },
    live2dMotionAliases: ['Awkward', 'Apology', 'Sorry', 'Shy'],
    vrmBaseExpressionCandidates: ['relaxed', 'sad'],
    facialCueCandidates: ['downcast', 'relaxed', 'frown'],
    actionCueCandidates: ['slow_nod', 'idle_settle', 'comfort_sway'],
  },
  surprised: {
    stageEmotion: 'surprised',
    speechStyle: { pitchDelta: 10, rateMultiplier: 1.1 },
    live2dMotionAliases: ['Surprise', 'Shock'],
    vrmBaseExpressionCandidates: ['surprised', 'happy'],
    facialCueCandidates: ['shock', 'wide-eye', 'glance'],
    actionCueCandidates: ['shock_freeze', 'raise_hand_excited', 'quick_glance'],
  },
  thinking: {
    stageEmotion: 'think',
    speechStyle: { pitchDelta: -2, rateMultiplier: 0.97 },
    live2dMotionAliases: ['Think', 'Thinking', 'Inspect', 'Observe'],
    vrmBaseExpressionCandidates: ['relaxed', 'neutral'],
    facialCueCandidates: ['focus', 'glance', 'relaxed'],
    actionCueCandidates: ['observe_focus', 'inspect_focus', 'pout_confused'],
  },
  awkward: {
    stageEmotion: 'awkward',
    speechStyle: { pitchDelta: -6, rateMultiplier: 0.92 },
    live2dMotionAliases: ['Awkward', 'Shy', 'Embarrassed'],
    vrmBaseExpressionCandidates: ['relaxed', 'sad'],
    facialCueCandidates: ['downcast', 'relaxed', 'frown'],
    actionCueCandidates: ['pout_confused', 'quick_glance', 'idle_settle'],
  },
  question: {
    stageEmotion: 'question',
    speechStyle: { pitchDelta: 3, rateMultiplier: 1.02 },
    live2dMotionAliases: ['Question', 'Concern', 'Observe'],
    vrmBaseExpressionCandidates: ['relaxed', 'surprised'],
    facialCueCandidates: ['glance', 'soft-gaze', 'focus'],
    actionCueCandidates: ['observe_focus', 'quick_glance', 'idle_gentle_nod'],
  },
  curious: {
    stageEmotion: 'curious',
    speechStyle: { pitchDelta: 4, rateMultiplier: 1.04 },
    live2dMotionAliases: ['Curious', 'Inspect', 'Observe'],
    vrmBaseExpressionCandidates: ['relaxed', 'surprised'],
    facialCueCandidates: ['focus', 'bright-smile', 'glance'],
    actionCueCandidates: ['inspect_focus', 'observe_focus', 'sway_relaxed'],
  },
}

const stageEmbodimentDeliveryProfiles: Record<StageEmbodimentDelivery, StageEmbodimentDeliveryProfile> = {
  calm: {
    facialCueCandidates: ['relaxed', 'focus'],
    actionCueCandidates: ['idle_settle', 'idle_gentle_nod', 'observe_focus'],
  },
  gentle: {
    facialCueCandidates: ['soft-gaze', 'frown', 'relaxed'],
    actionCueCandidates: ['idle_gentle_nod', 'comfort_sway', 'slow_nod'],
  },
  firm: {
    facialCueCandidates: ['focus', 'glare'],
    actionCueCandidates: ['steady_focus', 'inspect_focus', 'nod_once_firm'],
  },
  energetic: {
    facialCueCandidates: ['bright-smile', 'shock', 'smile'],
    actionCueCandidates: ['raise_hand_excited', 'cheer_raise_hand', 'sway_relaxed'],
  },
  hesitant: {
    facialCueCandidates: ['glance', 'frown', 'relaxed'],
    actionCueCandidates: ['pout_confused', 'quick_glance', 'idle_settle'],
  },
  teasing: {
    facialCueCandidates: ['smile', 'glance', 'pout'],
    actionCueCandidates: ['tsundere_pout', 'disdain_side_glance', 'sway_relaxed'],
  },
}

const stageEmbodimentLive2DFacialCapabilityDefinitions: StageEmbodimentLive2DFacialCapabilityDefinition[] = [
  {
    key: 'relaxed',
    label: 'Relaxed',
    description: 'Softer eyes and brows for calm, apology, or reflective turns.',
    source: 'preset',
    affectsMouth: false,
    aliases: ['calm'],
  },
  {
    key: 'focus',
    label: 'Focus',
    description: 'A more intent gaze with steadier brows for inspection or concentrated replies.',
    source: 'preset',
    affectsMouth: false,
    aliases: ['focused'],
  },
  {
    key: 'focused',
    label: 'Focused',
    description: 'Alias of focus for stricter cue preservation across runtime surfaces.',
    source: 'preset',
    affectsMouth: false,
    aliases: ['focus'],
  },
  {
    key: 'soft-gaze',
    label: 'Soft Gaze',
    description: 'Gentler eyes for care, reassurance, or light hesitation.',
    source: 'preset',
    affectsMouth: false,
  },
  {
    key: 'smile',
    label: 'Smile',
    description: 'A modest smile layered over the current emotional baseline.',
    source: 'preset',
    affectsMouth: true,
  },
  {
    key: 'bright-smile',
    label: 'Bright Smile',
    description: 'A stronger, more animated smile suited for cheerful or excited turns.',
    source: 'preset',
    affectsMouth: true,
  },
  {
    key: 'frown',
    label: 'Frown',
    description: 'A softer downturned mouth and brow for concern, sadness, or regret.',
    source: 'preset',
    affectsMouth: true,
  },
  {
    key: 'brow-furrow',
    label: 'Brow Furrow',
    description: 'Sharper brow tension for grounded correction, scrutiny, or firm concern.',
    source: 'preset',
    affectsMouth: false,
    aliases: ['furrow'],
  },
  {
    key: 'downcast',
    label: 'Downcast',
    description: 'Lowered lids and softened mouth for apology, fatigue, or vulnerability.',
    source: 'preset',
    affectsMouth: false,
  },
  {
    key: 'glare',
    label: 'Glare',
    description: 'Narrower eyes and firmer brows for stern or guarded moments.',
    source: 'preset',
    affectsMouth: false,
  },
  {
    key: 'glance',
    label: 'Glance',
    description: 'A quick sidelong emphasis for teasing, uncertainty, or curiosity.',
    source: 'preset',
    affectsMouth: false,
  },
  {
    key: 'shock',
    label: 'Shock',
    description: 'Open eyes and lifted brows for sudden surprise.',
    source: 'preset',
    affectsMouth: true,
  },
  {
    key: 'wide-eye',
    label: 'Wide Eye',
    description: 'Held widened eyes for alertness, surprise, or curious emphasis.',
    source: 'preset',
    affectsMouth: false,
  },
  {
    key: 'half-lid',
    label: 'Half Lid',
    description: 'Heavier eyelids for fatigue, skepticism, or subdued calm.',
    source: 'preset',
    affectsMouth: false,
  },
  {
    key: 'slow-blink',
    label: 'Slow Blink',
    description: 'A slower eyelid settle for tired, gentle, or affectionate beats.',
    source: 'preset',
    affectsMouth: false,
    aliases: ['blink'],
  },
  {
    key: 'blink',
    label: 'Blink',
    description: 'Alias of slow blink for surfaces that emit a generic blink cue.',
    source: 'preset',
    affectsMouth: false,
    aliases: ['slow-blink'],
  },
  {
    key: 'pout',
    label: 'Pout',
    description: 'A slightly compressed mouth for teasing, tsundere, or playful protest.',
    source: 'preset',
    affectsMouth: true,
  },
]

const stageEmbodimentEmotionAliases: Record<StageEmbodimentCanonicalEmotion, string[]> = {
  neutral: ['neutral', 'idle', 'default'],
  happy: ['happy', 'joy', 'cheerful'],
  sad: ['sad', 'sorrow', 'grief'],
  angry: ['angry', 'anger', 'mad'],
  concerned: ['concerned', 'care'],
  tired: ['tired', 'fatigued', 'sleepy'],
  apologetic: ['apologetic', 'sorry', 'apology'],
  surprised: ['surprised', 'surprise', 'shock'],
  thinking: ['thinking', 'think'],
  awkward: ['awkward', 'shy', 'embarrassed'],
  question: ['question', 'uncertain'],
  curious: ['curious', 'interest'],
}

const stageEmbodimentEmotionAliasMap = new Map<string, StageEmbodimentCanonicalEmotion>()

Object.entries(stageEmbodimentEmotionAliases).forEach(([emotion, aliases]) => {
  aliases.forEach((alias) => {
    stageEmbodimentEmotionAliasMap.set(alias, emotion as StageEmbodimentCanonicalEmotion)
  })
})

function normalizeIdentity(raw: unknown) {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

export function normalizeStageEmbodimentEmotion(raw: unknown): StageEmbodimentCanonicalEmotion {
  const normalized = normalizeIdentity(raw)
  return stageEmbodimentEmotionAliasMap.get(normalized) ?? 'neutral'
}

export function normalizeStageEmbodimentDelivery(raw: unknown): StageEmbodimentDelivery {
  switch (normalizeIdentity(raw)) {
    case 'gentle':
      return 'gentle'
    case 'firm':
      return 'firm'
    case 'energetic':
      return 'energetic'
    case 'hesitant':
      return 'hesitant'
    case 'teasing':
      return 'teasing'
    case 'calm':
    default:
      return 'calm'
  }
}

export function resolveStageEmbodimentStageEmotionName(rawEmotion: unknown): StageEmbodimentLegacyEmotion {
  return stageEmbodimentEmotionProfiles[normalizeStageEmbodimentEmotion(rawEmotion)].stageEmotion
}

export function resolveStageEmbodimentSpeechStyle(rawEmotion: unknown): StageEmbodimentSpeechStyleProfile {
  return stageEmbodimentEmotionProfiles[normalizeStageEmbodimentEmotion(rawEmotion)].speechStyle
}

export function resolveStageEmbodimentLive2DMotionAliases(rawEmotion: unknown) {
  return [
    ...stageEmbodimentEmotionProfiles[normalizeStageEmbodimentEmotion(rawEmotion)].live2dMotionAliases,
  ]
}

export function resolveStageEmbodimentPreferredLive2DMotionName(rawEmotion: unknown) {
  return resolveStageEmbodimentLive2DMotionAliases(rawEmotion)[0] ?? 'Idle'
}

export function resolveStageEmbodimentVrmBaseExpressionCandidates(rawEmotion: unknown) {
  return [
    ...stageEmbodimentEmotionProfiles[normalizeStageEmbodimentEmotion(rawEmotion)].vrmBaseExpressionCandidates,
  ]
}

export function resolveStageEmbodimentVrmBaseExpressionName(rawEmotion: unknown) {
  return resolveStageEmbodimentVrmBaseExpressionCandidates(rawEmotion)[0] ?? 'neutral'
}

export function resolveStageEmbodimentCueCandidates(input: {
  delivery?: unknown
  emotion?: unknown
}) {
  const emotionProfile = stageEmbodimentEmotionProfiles[normalizeStageEmbodimentEmotion(input.emotion)]
  const deliveryProfile = stageEmbodimentDeliveryProfiles[normalizeStageEmbodimentDelivery(input.delivery)]

  return {
    facialCueCandidates: dedupeStrings([
      ...emotionProfile.facialCueCandidates,
      ...deliveryProfile.facialCueCandidates,
    ]),
    actionCueCandidates: dedupeStrings([
      ...emotionProfile.actionCueCandidates,
      ...deliveryProfile.actionCueCandidates,
    ]),
  }
}

export function listStageEmbodimentLive2DFacialCapabilities(): CharacterFacialCapability[] {
  return stageEmbodimentLive2DFacialCapabilityDefinitions.map(({ aliases: _aliases, ...capability }) => ({
    ...capability,
  }))
}
