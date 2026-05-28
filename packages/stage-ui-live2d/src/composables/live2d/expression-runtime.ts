import type {
  AlicizationEmotion,
  AlicizationPerformanceDelivery,
  CharacterFacialCapability,
  StageEmbodimentCanonicalEmotion,
} from '@proj-alicization/stage-shared'

import {
  alicizationEmotionWhitelist,
  listStageEmbodimentLive2DFacialCapabilities,
  normalizeStageEmbodimentEmotion,
  resolveStageEmbodimentCueCandidates,
  resolveStageEmbodimentLive2DMotionAliases,
} from '@proj-alicization/stage-shared'

export interface Live2DRuntimeCapabilitySnapshot {
  supportedExpressionNames: string[]
  supportedBaseEmotions: AlicizationEmotion[]
  supportedFacialCues: CharacterFacialCapability[]
}

export interface ResolveLive2DExpressionSelectionInput {
  delivery?: AlicizationPerformanceDelivery | string | null
  emotion?: AlicizationEmotion | string | null
  expressionIntensity?: number | null
  expressionNames: string[]
  facialCue?: string | null
  facialCueIntensity?: number | null
  preferredExpressionAliases?: string[] | null
}

export interface Live2DResolvedExpressionSelection {
  name: string
  reason: 'emotion' | 'facial-cue' | 'neutral' | 'preferred'
  score: number
}

const live2dFacialCueExpressionAliases: Record<string, string[]> = {
  blink: ['blink', 'sleep', 'tired'],
  'brow-furrow': ['brow', 'furrow', 'angry', 'stern', 'serious'],
  'bright-smile': ['bright', 'smile', 'happy', 'joy', 'cheer', 'grin'],
  downcast: ['downcast', 'sad', 'sorry', 'apology', 'apologetic'],
  focus: ['focus', 'focused', 'serious', 'inspect', 'observe', 'thinking'],
  'half-lid': ['half', 'lid', 'tired', 'sleep', 'relaxed'],
  frown: ['frown', 'sad', 'worry', 'concern', 'concerned'],
  glance: ['glance', 'side', 'curious', 'tease'],
  glare: ['glare', 'angry', 'mad', 'stern', 'firm'],
  pout: ['pout', 'shy', 'awkward', 'sulky', 'tsundere'],
  relaxed: ['relaxed', 'calm', 'neutral', 'soft', 'gentle'],
  shock: ['shock', 'surprise', 'surprised', 'wide'],
  smile: ['smile', 'happy', 'joy', 'cheer', 'grin'],
  'slow-blink': ['slow', 'blink', 'tired', 'gentle'],
  'soft-gaze': ['soft', 'gaze', 'gentle', 'care', 'comfort', 'warm'],
  'wide-eye': ['wide', 'eye', 'surprise', 'alert', 'shock'],
}

const live2dEmotionExpressionAliases: Record<StageEmbodimentCanonicalEmotion, string[]> = {
  neutral: ['neutral', 'normal', 'default', 'idle', 'calm', 'relaxed'],
  happy: ['happy', 'joy', 'cheer', 'smile', 'bright', 'grin'],
  sad: ['sad', 'downcast', 'frown', 'sorrow', 'melancholy'],
  angry: ['angry', 'mad', 'glare', 'stern', 'firm'],
  concerned: ['concern', 'concerned', 'worried', 'soft', 'care'],
  tired: ['tired', 'sleepy', 'drowsy', 'relaxed', 'half'],
  apologetic: ['sorry', 'apology', 'apologetic', 'shy', 'downcast'],
  awkward: ['awkward', 'shy', 'embarrassed', 'pout'],
  question: ['question', 'wonder', 'asking', 'tilt', 'query'],
  curious: ['curious', 'interest', 'glance', 'wonder', 'peek'],
  surprised: ['surprise', 'surprised', 'shock', 'wide', 'alert'],
  thinking: ['think', 'thinking', 'focus', 'focused', 'inspect', 'observe'],
}

function normalizeExpressionIdentity(raw: unknown) {
  return typeof raw === 'string'
    ? raw
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : ''
}

function tokenizeExpressionIdentity(raw: unknown) {
  const normalized = normalizeExpressionIdentity(raw)
  return normalized ? normalized.split(' ').filter(Boolean) : []
}

function uniqueTextList(values: Array<string | null | undefined>) {
  const seen = new Set<string>()
  const deduped: string[] = []

  values.forEach((value) => {
    const normalized = typeof value === 'string' ? value.trim() : ''
    if (!normalized)
      return

    const signature = normalized.toLowerCase()
    if (seen.has(signature))
      return

    seen.add(signature)
    deduped.push(normalized)
  })

  return deduped
}

function clampUnit(value: number, fallback: number) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(1, Math.max(0, value))
}

function createExpressionCatalog(expressionNames: string[]) {
  const catalog = uniqueTextList(expressionNames)
    .map((name) => {
      const normalizedName = normalizeExpressionIdentity(name)
      return normalizedName
        ? {
            name,
            normalizedName,
            tokens: tokenizeExpressionIdentity(normalizedName),
          }
        : null
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))

  return catalog
}

function scoreExpressionAliasMatch(
  expression: { normalizedName: string, tokens: string[] },
  aliases: string[],
) {
  let bestScore = 0

  aliases.forEach((alias) => {
    const normalizedAlias = normalizeExpressionIdentity(alias)
    if (!normalizedAlias)
      return

    const aliasTokens = tokenizeExpressionIdentity(normalizedAlias)
    if (expression.normalizedName === normalizedAlias) {
      bestScore = Math.max(bestScore, 4)
      return
    }

    if (expression.tokens.includes(normalizedAlias)) {
      bestScore = Math.max(bestScore, 3.4)
      return
    }

    if (expression.normalizedName.includes(normalizedAlias)) {
      bestScore = Math.max(bestScore, 2.8)
      return
    }

    if (aliasTokens.length > 0) {
      const matchingTokens = aliasTokens.filter(token => expression.tokens.includes(token)).length
      if (matchingTokens === aliasTokens.length) {
        bestScore = Math.max(bestScore, 2.6)
        return
      }
      if (matchingTokens > 0)
        bestScore = Math.max(bestScore, 1.2 + matchingTokens * 0.5)
    }
  })

  return bestScore
}

function resolveEmotionExpressionSearchAliases(
  emotion: StageEmbodimentCanonicalEmotion,
) {
  return uniqueTextList([
    emotion,
    ...resolveStageEmbodimentLive2DMotionAliases(emotion),
    ...live2dEmotionExpressionAliases[emotion],
  ])
}

function resolveEmotionCueBridgeAliases(
  emotion: StageEmbodimentCanonicalEmotion,
  delivery?: AlicizationPerformanceDelivery | string | null,
) {
  const cueCandidates = resolveStageEmbodimentCueCandidates({
    delivery,
    emotion,
  })

  return uniqueTextList(
    cueCandidates.facialCueCandidates.flatMap(key => live2dFacialCueExpressionAliases[key] ?? [key]),
  )
}

function resolveFacialCueExpressionSearchAliases(rawCue?: string | null) {
  const cueKey = typeof rawCue === 'string' ? rawCue.trim().toLowerCase() : ''
  if (!cueKey)
    return []

  return uniqueTextList([
    cueKey,
    ...(live2dFacialCueExpressionAliases[cueKey] ?? []),
  ])
}

function resolveBestExpressionMatch(input: {
  aliases: string[]
  catalog: ReturnType<typeof createExpressionCatalog>
}): { name: string, score: number } | null {
  let bestMatch: { name: string, score: number } | null = null

  input.catalog.forEach((expression) => {
    const score = scoreExpressionAliasMatch(expression, input.aliases)
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        name: expression.name,
        score,
      }
    }
  })

  return bestMatch
}

export function resolveLive2DExpressionSelection(
  input: ResolveLive2DExpressionSelectionInput,
): Live2DResolvedExpressionSelection | null {
  const catalog = createExpressionCatalog(input.expressionNames)
  if (catalog.length === 0)
    return null

  const preferredAliases = uniqueTextList(input.preferredExpressionAliases ?? [])
  if (preferredAliases.length > 0) {
    const preferredMatch = resolveBestExpressionMatch({
      aliases: preferredAliases,
      catalog,
    })

    if (preferredMatch && preferredMatch.score >= 0.9) {
      return {
        name: preferredMatch.name,
        reason: 'preferred',
        score: Number((8 + preferredMatch.score).toFixed(3)),
      }
    }
  }

  const emotion = normalizeStageEmbodimentEmotion(input.emotion)
  const emotionAliases = resolveEmotionExpressionSearchAliases(emotion)
  const emotionCueBridgeAliases = resolveEmotionCueBridgeAliases(emotion, input.delivery)
  const facialCueAliases = resolveFacialCueExpressionSearchAliases(input.facialCue)
  const neutralAliases = resolveEmotionExpressionSearchAliases('neutral')

  const expressionWeight = clampUnit(Number(input.expressionIntensity), 0.62)
  const cueWeight = facialCueAliases.length > 0
    ? clampUnit(Number(input.facialCueIntensity), 0.68)
    : 0

  let bestSelection: Live2DResolvedExpressionSelection | null = null

  for (const expression of catalog) {
    const emotionScore = scoreExpressionAliasMatch(expression, emotionAliases) * (emotion === 'neutral' ? 0.9 : 1.4 * expressionWeight)
    const emotionCueBridgeScore = scoreExpressionAliasMatch(expression, emotionCueBridgeAliases) * (emotion === 'neutral' ? 0.2 : 0.18 + expressionWeight * 0.18)
    const facialCueScore = scoreExpressionAliasMatch(expression, facialCueAliases) * (0.9 + cueWeight * 0.7)
    const neutralScore = scoreExpressionAliasMatch(expression, neutralAliases) * (emotion === 'neutral' && cueWeight <= 0 ? 1.3 : 0.35)
    const totalScore = emotionScore + emotionCueBridgeScore + facialCueScore + neutralScore
    if (!bestSelection || totalScore > bestSelection.score) {
      const reason = facialCueScore >= emotionScore + emotionCueBridgeScore && facialCueScore >= neutralScore
        ? 'facial-cue'
        : neutralScore >= emotionScore
          ? 'neutral'
          : 'emotion'
      bestSelection = {
        name: expression.name,
        reason,
        score: Number(totalScore.toFixed(3)),
      }
    }
  }

  if (!bestSelection)
    return null

  if (bestSelection.score < 2.2)
    return null

  return bestSelection
}

export function buildLive2DRuntimeCapabilitySnapshot(
  expressionNames: string[],
): Live2DRuntimeCapabilitySnapshot {
  const catalog = createExpressionCatalog(expressionNames)
  const supportedExpressionNames = catalog
    .map(item => item.name)
    .sort((left, right) => left.localeCompare(right))

  const supportedBaseEmotions = alicizationEmotionWhitelist.filter((emotion) => {
    const bestMatch = resolveBestExpressionMatch({
      aliases: resolveEmotionExpressionSearchAliases(emotion),
      catalog,
    })
    return (bestMatch?.score ?? 0) >= 2.2
  })

  const supportedFacialCues = listStageEmbodimentLive2DFacialCapabilities().filter((capability) => {
    const bestMatch = resolveBestExpressionMatch({
      aliases: resolveFacialCueExpressionSearchAliases(capability.key),
      catalog,
    })
    return (bestMatch?.score ?? 0) >= 2.2
  })

  return {
    supportedExpressionNames,
    supportedBaseEmotions,
    supportedFacialCues,
  }
}
