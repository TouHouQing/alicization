import type {
  AlicizationLongHorizonMemoryCueInfluence,
  AlicizationLongHorizonMemoryCueSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryFact,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'

export const alicizationLongHorizonMemoryMarker = '[ALICIZATION_LONG_HORIZON_MEMORY]'

interface BuildAlicizationLongHorizonMemoryInput {
  now: number
  facts: AlicizationMemoryFact[]
  previous?: AlicizationLongHorizonMemorySnapshot | null
}

interface BuildAlicizationLongHorizonMemoryQueryInput {
  userText?: string
  worldModel?: AlicizationWorldModelSnapshot | null
  appraisal?: AlicizationSubjectiveSceneAppraisal | null
  previous?: AlicizationLongHorizonMemorySnapshot | null
}

type PreferenceBiasKey = keyof AlicizationLongHorizonMemorySnapshot['preferenceBias']
type IdentityBiasKey = keyof AlicizationLongHorizonMemorySnapshot['identityBias']

const preferenceBiasKeys = [
  'companionship',
  'truthfulGrounding',
  'gentleRepair',
  'quietObservation',
  'proactiveCare',
  'playfulIntimacy',
  'autonomyRespect',
  'unfinishedThreadReturn',
] satisfies PreferenceBiasKey[]

const identityBiasKeys = [
  'guardedness',
  'tenderness',
  'directness',
  'selfDirection',
] satisfies IdentityBiasKey[]

const boundaryPattern = /空间|别(?:打扰|催)|不要(?:打扰|催|逼)|边界|限制|克制|focused?|focus|boundary|space|respect|自己来|安静|quiet|alone|intrude/iu
const carePattern = /休息|睡|睡觉|吃饭|喝水|休整|身体|照顾|照看|累|疲惫|care|rest|sleep|break|hydrate|body/iu
const truthPattern = /诚实|真实|准确|核实|验证|ground|verify|truth|honest|具体|直接|结构化|可执行|结论|不要猜|guess/iu
const repairPattern = /温和|轻一点|慢一点|soft|gentle|repair|澄清|解释清楚|先稳住|别太冲/iu
const playPattern = /玩笑|逗|有趣|轻松|可爱|tease|playful|fun|joke/iu
const taskPattern = /明天|今天|今晚|下周|计划|继续|完成|跟进|别忘|记住|todo|plan|remember|follow up|later|finish|ship|return|open loop/iu
const bondPattern = /陪|陪伴|一起|靠近|聊天|共看|stay near|together|company|companionship|陪着|在这|陪你/iu
const dislikePredicatePattern = /dislike|dislikes|avoid|never|constraint|boundary|limit|讨厌|不喜欢|禁忌|限制/iu
const preferencePredicatePattern = /like|likes|prefer|prefers|preference|habit|style|喜欢|偏好|习惯|风格/iu
const planPredicatePattern = /plan|todo|promise|remember|follow-up|schedule|计划|约定|别忘|记住|继续/iu
const identityPredicatePattern = /identity|persona|self|principle|doctrine|风格|原则|脾气|人格|自我/iu

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function blend(previous: number, target: number, rate = 0.22) {
  return clamp01(previous * (1 - rate) + target * rate)
}

function defaultLongHorizonMemory() {
  return {
    preferenceBias: {
      companionship: 0,
      truthfulGrounding: 0,
      gentleRepair: 0,
      quietObservation: 0,
      proactiveCare: 0,
      playfulIntimacy: 0,
      autonomyRespect: 0,
      unfinishedThreadReturn: 0,
    },
    identityBias: {
      guardedness: 0,
      tenderness: 0,
      directness: 0,
      selfDirection: 0,
    },
    anchorFacts: [],
    summary: '',
    dominantCueSummary: null,
    rememberedPreferenceSummary: null,
    rememberedConstraintSummary: null,
    rememberedPlanSummary: null,
    updatedAt: 0,
  } satisfies AlicizationLongHorizonMemorySnapshot
}

function normalizePredicate(raw: string) {
  return sanitizeText(raw, 64).toLowerCase()
}

function normalizeFactStatement(fact: Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object'>) {
  return sanitizeText(`${fact.subject} ${fact.predicate} ${fact.object}`, 220)
}

function computeFactWeight(fact: AlicizationMemoryFact, now: number) {
  const ageDays = Math.max(0, (now - fact.updatedAt) / (24 * 60 * 60 * 1000))
  const recency = Math.exp(-ageDays / 28)
  const accessBoost = Math.min(0.14, fact.accessCount / 40)
  const knowledgeStage = fact.knowledgeStage ?? 'working-understanding'
  const validationStatus = fact.validationStatus ?? 'unverified'
  const lifecycleBoost = knowledgeStage === 'internalized-long-horizon-knowledge'
    ? 0.16
    : knowledgeStage === 'validated-knowledge'
      ? 0.1
      : knowledgeStage === 'working-understanding'
        ? 0.03
        : -0.05
  const validationBoost = validationStatus === 'validated'
    ? 0.1
    : validationStatus === 'provisional'
      ? 0.04
      : validationStatus === 'superseded'
        ? -0.24
      : 0
  const validationCountBoost = Math.min(0.08, (fact.validationCount ?? 0) * 0.02)
  const contradictionPenalty = Math.min(0.1, (fact.contradictionCount ?? 0) * 0.04)
  const correctionBoost = (fact.supersedes?.length ?? 0) > 0 ? 0.05 : 0
  const conflictPenalty = (fact.conflictsWith?.length ?? 0) > 0 ? 0.03 : 0
  return clamp01(fact.confidence * 0.72 + recency * 0.18 + accessBoost + lifecycleBoost + validationBoost + validationCountBoost + correctionBoost - conflictPenalty - contradictionPenalty)
}

function inferCueInfluenceTags(fact: Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object'>) {
  const tags = new Set<AlicizationLongHorizonMemoryCueInfluence>()
  const subject = sanitizeText(fact.subject, 64).toLowerCase()
  const predicate = normalizePredicate(fact.predicate)
  const object = sanitizeText(fact.object, 220)
  const text = `${subject} ${predicate} ${object}`

  if (subject === 'relationship')
    tags.add('bond')
  if (subject === 'assistant' || subject === 'alicization' || identityPredicatePattern.test(predicate))
    tags.add('identity')

  if (bondPattern.test(text))
    tags.add('bond')
  if (boundaryPattern.test(text) || dislikePredicatePattern.test(predicate))
    tags.add('boundary')
  if (carePattern.test(text))
    tags.add('care')
  if (truthPattern.test(text))
    tags.add('truth')
  if (playPattern.test(text))
    tags.add('play')
  if ((taskPattern.test(text) || planPredicatePattern.test(predicate)) && !preferencePredicatePattern.test(predicate))
    tags.add('task')

  if (repairPattern.test(text))
    tags.add('truth')

  if (tags.size === 0) {
    if (planPredicatePattern.test(predicate))
      tags.add('task')
    else if (preferencePredicatePattern.test(predicate))
      tags.add('bond')
    else if (subject === 'assistant' || subject === 'alicization')
      tags.add('identity')
    else
      tags.add('truth')
  }

  return [...tags]
}

function describeCue(fact: Pick<AlicizationMemoryFact, 'subject' | 'predicate' | 'object'>, tags: AlicizationLongHorizonMemoryCueInfluence[]) {
  const statement = normalizeFactStatement(fact)
  const predicate = normalizePredicate(fact.predicate)
  const subject = sanitizeText(fact.subject, 48).toLowerCase()

  if (tags.includes('bond') || preferencePredicatePattern.test(predicate))
    return `Remembered preference: ${statement}`
  if (tags.includes('task') || planPredicatePattern.test(predicate))
    return `Remembered open loop: ${statement}`
  if (tags.includes('boundary') || dislikePredicatePattern.test(predicate))
    return `Remembered boundary: ${statement}`
  if (subject === 'assistant' || subject === 'alicization' || tags.includes('identity'))
    return `Remembered self-line: ${statement}`
  return `Remembered continuity: ${statement}`
}

function shouldCarryFactIntoLongHorizon(fact: AlicizationMemoryFact) {
  const stage = fact.knowledgeStage ?? 'working-understanding'
  const validation = fact.validationStatus ?? 'unverified'
  if (validation === 'superseded')
    return false
  if (stage === 'ephemeral-observation' && validation === 'unverified')
    return false
  return true
}

function mergeAnchorFacts(input: {
  now: number
  currentFacts: AlicizationMemoryFact[]
  previous?: AlicizationLongHorizonMemorySnapshot | null
}) {
  const merged = new Map<string, AlicizationLongHorizonMemoryCueSnapshot>()

  for (const fact of input.currentFacts) {
    if (!shouldCarryFactIntoLongHorizon(fact))
      continue
    const influenceTags = inferCueInfluenceTags(fact)
    const cue: AlicizationLongHorizonMemoryCueSnapshot = {
      factId: fact.id,
      subject: sanitizeText(fact.subject, 48),
      predicate: sanitizeText(fact.predicate, 48),
      object: sanitizeText(fact.object, 180),
      confidence: clamp01(fact.confidence),
      weight: computeFactWeight(fact, input.now),
      influenceTags,
      summary: describeCue(fact, influenceTags),
      lastRecalledAt: input.now,
    }
    const previous = merged.get(cue.factId)
    if (!previous || cue.weight >= previous.weight)
      merged.set(cue.factId, cue)
  }

  for (const previous of input.previous?.anchorFacts ?? []) {
    if (merged.has(previous.factId))
      continue
    merged.set(previous.factId, {
      ...previous,
      weight: clamp01(previous.weight * 0.92),
    })
  }

  return [...merged.values()]
    .filter(cue => cue.weight >= 0.08)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 6)
}

function buildBiasTargets(anchorFacts: AlicizationLongHorizonMemoryCueSnapshot[]) {
  const preferenceBias = {
    companionship: 0,
    truthfulGrounding: 0,
    gentleRepair: 0,
    quietObservation: 0,
    proactiveCare: 0,
    playfulIntimacy: 0,
    autonomyRespect: 0,
    unfinishedThreadReturn: 0,
  } satisfies AlicizationLongHorizonMemorySnapshot['preferenceBias']
  const identityBias = {
    guardedness: 0,
    tenderness: 0,
    directness: 0,
    selfDirection: 0,
  } satisfies AlicizationLongHorizonMemorySnapshot['identityBias']

  for (const cue of anchorFacts) {
    const weight = cue.weight
    const predicate = normalizePredicate(cue.predicate)
    const text = `${cue.subject} ${cue.predicate} ${cue.object}`
    const preferBoost = preferencePredicatePattern.test(predicate) ? 0.08 : 0
    const boundaryBoost = dislikePredicatePattern.test(predicate) ? 0.1 : 0

    if (cue.influenceTags.includes('bond')) {
      preferenceBias.companionship += weight * (0.26 + preferBoost)
      identityBias.tenderness += weight * 0.16
    }
    if (cue.influenceTags.includes('boundary')) {
      preferenceBias.autonomyRespect += weight * (0.32 + boundaryBoost)
      preferenceBias.quietObservation += weight * 0.24
      identityBias.guardedness += weight * 0.22
    }
    if (cue.influenceTags.includes('care')) {
      preferenceBias.proactiveCare += weight * 0.34
      preferenceBias.companionship += weight * 0.08
      identityBias.tenderness += weight * 0.24
    }
    if (cue.influenceTags.includes('truth')) {
      preferenceBias.truthfulGrounding += weight * 0.34
      preferenceBias.gentleRepair += weight * (repairPattern.test(text) ? 0.24 : 0.16)
      identityBias.directness += weight * 0.22
    }
    if (cue.influenceTags.includes('play')) {
      preferenceBias.playfulIntimacy += weight * 0.32
      preferenceBias.companionship += weight * 0.12
    }
    if (cue.influenceTags.includes('task')) {
      preferenceBias.unfinishedThreadReturn += weight * 0.38
      identityBias.selfDirection += weight * 0.26
    }
    if (cue.influenceTags.includes('identity')) {
      identityBias.directness += weight * (truthPattern.test(text) ? 0.12 : 0.04)
      identityBias.tenderness += weight * (carePattern.test(text) || bondPattern.test(text) ? 0.1 : 0)
      identityBias.guardedness += weight * (boundaryPattern.test(text) ? 0.1 : 0)
      identityBias.selfDirection += weight * (taskPattern.test(text) ? 0.08 : 0.04)
    }
  }

  for (const key of preferenceBiasKeys)
    preferenceBias[key] = clamp01(preferenceBias[key])
  for (const key of identityBiasKeys)
    identityBias[key] = clamp01(identityBias[key])

  return {
    preferenceBias,
    identityBias,
  }
}

function pickCueSummary(
  anchorFacts: AlicizationLongHorizonMemoryCueSnapshot[],
  matcher: (cue: AlicizationLongHorizonMemoryCueSnapshot) => boolean,
) {
  return anchorFacts.find(matcher)?.summary ?? null
}

export function buildAlicizationLongHorizonMemoryQuery(input: BuildAlicizationLongHorizonMemoryQueryInput) {
  return [
    sanitizeText(input.userText, 180),
    sanitizeText(input.appraisal?.currentKnot, 96),
    sanitizeText(input.appraisal?.situatedMeaning, 96),
    sanitizeText(input.worldModel?.activeThread?.title, 96),
    sanitizeText(input.worldModel?.activeThread?.summary, 180),
    sanitizeText(input.previous?.dominantCueSummary ?? '', 96),
    'user assistant relationship preference prefers likes dislikes plan constraint habit boundary remember style truth care focus rest continue',
    '偏好 喜欢 不喜欢 计划 约定 限制 边界 习惯 记住 风格 诚实 具体 休息 专注 继续',
    input.worldModel?.hostState?.availability === 'focused' || input.worldModel?.hostState?.availability === 'immersed'
      ? 'focus boundary concise direct do not interrupt'
      : 'companionship care rest stay near',
    input.worldModel?.activeThread?.unresolved
      ? 'follow up unfinished continue return open loop'
      : '',
  ]
    .filter(Boolean)
    .join(' | ')
}

export function buildAlicizationLongHorizonMemory(input: BuildAlicizationLongHorizonMemoryInput): AlicizationLongHorizonMemorySnapshot | null {
  const previous = input.previous ?? defaultLongHorizonMemory()
  const anchorFacts = mergeAnchorFacts({
    now: input.now,
    currentFacts: input.facts,
    previous: input.previous ?? null,
  })
  if (anchorFacts.length === 0 && !input.previous)
    return null

  const targets = buildBiasTargets(anchorFacts)
  const preferenceBias = preferenceBiasKeys.reduce((result, key) => {
    result[key] = blend(previous.preferenceBias[key], targets.preferenceBias[key], 0.26)
    return result
  }, {} as AlicizationLongHorizonMemorySnapshot['preferenceBias'])
  const identityBias = identityBiasKeys.reduce((result, key) => {
    result[key] = blend(previous.identityBias[key], targets.identityBias[key], 0.24)
    return result
  }, {} as AlicizationLongHorizonMemorySnapshot['identityBias'])

  const dominantCueSummary = anchorFacts[0]?.summary ?? previous.dominantCueSummary ?? null
  const rememberedPreferenceSummary = pickCueSummary(anchorFacts, cue =>
    cue.influenceTags.includes('bond') || preferencePredicatePattern.test(cue.predicate),
  ) ?? previous.rememberedPreferenceSummary
  const rememberedConstraintSummary = pickCueSummary(anchorFacts, cue =>
    cue.influenceTags.includes('boundary') || dislikePredicatePattern.test(cue.predicate),
  ) ?? previous.rememberedConstraintSummary
  const rememberedPlanSummary = pickCueSummary(anchorFacts, cue =>
    cue.influenceTags.includes('task') || planPredicatePattern.test(cue.predicate),
  ) ?? previous.rememberedPlanSummary
  const summary = [
    rememberedPreferenceSummary ? `preference=${sanitizeText(rememberedPreferenceSummary, 96)}` : '',
    rememberedConstraintSummary ? `boundary=${sanitizeText(rememberedConstraintSummary, 96)}` : '',
    rememberedPlanSummary ? `plan=${sanitizeText(rememberedPlanSummary, 96)}` : '',
  ].filter(Boolean).join(' | ')

  return {
    preferenceBias,
    identityBias,
    anchorFacts,
    summary,
    dominantCueSummary,
    rememberedPreferenceSummary,
    rememberedConstraintSummary,
    rememberedPlanSummary,
    updatedAt: input.now,
  }
}

export function buildLongHorizonMemorySystemBlock(surface: AlicizationDigitalLifeRuntimeSurface | null | undefined) {
  const memory = surface?.memory.longHorizonMemory ?? null
  if (!memory)
    return ''

  const anchorLines = memory.anchorFacts.length > 0
    ? memory.anchorFacts.slice(0, 4).map(cue => `- ${cue.summary} | weight=${cue.weight.toFixed(2)} | tags=${cue.influenceTags.join('/')}`)
    : ['- none']

  return [
    alicizationLongHorizonMemoryMarker,
    'This block describes which durable semantic memories are currently shaping Alicization\'s longer-horizon self, goals, and habits.',
    'Treat it as remembered continuity and accumulated preference pressure, never as proof of the live scene.',
    memory.summary
      ? `Memory line: ${memory.summary}`
      : 'Memory line: no strong long-horizon memory is currently shaping this turn.',
    memory.dominantCueSummary
      ? `Dominant remembered cue: ${memory.dominantCueSummary}`
      : 'Dominant remembered cue: none.',
    memory.rememberedPreferenceSummary
      ? `Remembered preference: ${memory.rememberedPreferenceSummary}`
      : 'Remembered preference: none.',
    memory.rememberedConstraintSummary
      ? `Remembered boundary: ${memory.rememberedConstraintSummary}`
      : 'Remembered boundary: none.',
    memory.rememberedPlanSummary
      ? `Remembered open loop: ${memory.rememberedPlanSummary}`
      : 'Remembered open loop: none.',
    `Preference imprint: companionship=${memory.preferenceBias.companionship.toFixed(2)}; truth=${memory.preferenceBias.truthfulGrounding.toFixed(2)}; repair=${memory.preferenceBias.gentleRepair.toFixed(2)}; observation=${memory.preferenceBias.quietObservation.toFixed(2)}; care=${memory.preferenceBias.proactiveCare.toFixed(2)}; play=${memory.preferenceBias.playfulIntimacy.toFixed(2)}; autonomy=${memory.preferenceBias.autonomyRespect.toFixed(2)}; unfinished=${memory.preferenceBias.unfinishedThreadReturn.toFixed(2)}.`,
    `Identity pressure: guarded=${memory.identityBias.guardedness.toFixed(2)}; tender=${memory.identityBias.tenderness.toFixed(2)}; direct=${memory.identityBias.directness.toFixed(2)}; self-direction=${memory.identityBias.selfDirection.toFixed(2)}.`,
    'Anchor memories:',
    ...anchorLines,
  ].join('\n')
}
