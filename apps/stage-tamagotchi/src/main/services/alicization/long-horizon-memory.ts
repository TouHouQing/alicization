import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationHostPersonModelSnapshot,
  AlicizationLongHorizonMemoryCueInfluence,
  AlicizationLongHorizonMemoryCueSnapshot,
  AlicizationLongHorizonMemorySnapshot,
  AlicizationMemoryFact,
  AlicizationSubjectiveSceneAppraisal,
  AlicizationWorldModelSnapshot,
} from '../../../shared/eventa'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationPersonStateUpdateSurface } from './person-state-update-surface'

import {
  containsAlicizationFixedTemplateResidue,
} from '@proj-alicization/stage-shared'

interface AlicizationExecutionCallbackCarrySnapshot {
  carryMode: 'lower-pressure' | 'trust-warming' | 'execution-callback' | 'repair-before-closeness'
  confidence: number
  source: 'session-continuity'
  summary: string
  threadAnchor?: string | null
  episodeId?: string | null
}

interface BuildAlicizationLongHorizonMemoryInput {
  now: number
  facts: AlicizationMemoryFact[]
  previous?: AlicizationLongHorizonMemorySnapshot | null
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  personStateUpdateSurface?: AlicizationPersonStateUpdateSurface | null
  executionCallbackCarry?: AlicizationExecutionCallbackCarrySnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  recentMemoryConsolidations?: AlicizationMemoryConsolidationRecord[] | null
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
const taskPattern = /明天|今天|今晚|下周|计划|继续|完成|跟进|别忘|记住|todo|plan|remember|follow up|later|finish|ship|return|open loop/iu
const bondPattern = /陪|陪伴|一起|靠近|聊天|共看|stay near|together|company|companionship|陪着|在这|陪你/iu
const dislikePredicatePattern = /dislike|dislikes|avoid|never|constraint|boundary|limit|讨厌|不喜欢|禁忌|限制/iu
const preferencePredicatePattern = /\b(?:like|likes|prefer|prefers|preference|habit|style)\b|喜欢|偏好|习惯|风格/iu
const planPredicatePattern = /plan|todo|promise|remember|follow-up|schedule|计划|约定|别忘|记住|继续/iu
const identityPredicatePattern = /identity|persona|self|principle|doctrine|风格|原则|脾气|人格|自我/iu
const executionSafetyGateRestraintPattern = /execution safety gate|execution-safety-gate|blocked-dispatch-restraint|blocked-before-dispatch|confirmation=required|no-process-started|ordinary proactive closeness|wait for confirmation|safety gate/iu
const executionResumeConfirmationPattern = /execution resume confirmation|execution-resume-confirmation|host-confirmed-before-redispatch|resume-before-dispatch|process-not-yet-restarted|confirmation boundary|redispatch|host-confirmed/iu

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

function sanitizeLongHorizonEvidenceText(raw: unknown, maxChars = 180) {
  const normalized = sanitizeText(raw, maxChars)
  if (!normalized)
    return ''
  if (!containsAlicizationFixedTemplateResidue(normalized, {
    provenance: 'internal-structured-fact',
  })) {
    return normalized
  }
  return ''
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 8) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, 180)
    if (!normalized)
      continue
    if (result.some(item => item.toLowerCase() === normalized.toLowerCase()))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function objectFrom(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function stringListFrom(raw: unknown, maxItems = 8) {
  if (!Array.isArray(raw))
    return []
  return uniqueList(
    raw.map(item => typeof item === 'string' ? item : ''),
    maxItems,
  )
}

function blend(previous: number, target: number, rate = 0.22) {
  return clamp01(previous * (1 - rate) + target * rate)
}

function parseEmbodimentExpression(raw: unknown) {
  const expression = objectFrom(raw)
  if (!expression)
    return null

  const face = sanitizeText(expression.face, 64)
  const gaze = sanitizeText(expression.gaze, 64)
  const blink = sanitizeText(expression.blink, 64)
  const voice = sanitizeText(expression.voice, 64)
  const pause = sanitizeText(expression.pause, 64)
  const lipsync = sanitizeText(expression.lipsync, 64)
  const pacing = sanitizeText(expression.pacing, 64)

  if (!face && !gaze && !blink && !voice && !pause && !lipsync && !pacing)
    return null

  return {
    face,
    gaze,
    blink,
    voice,
    pause,
    lipsync,
    pacing,
    summary: uniqueList([
      face ? `${face} face` : '',
      gaze ? `${gaze} gaze` : '',
      blink ? `${blink} blink` : '',
      voice ? `${voice} voice` : '',
      pause ? `${pause} pause` : '',
      lipsync ? `${lipsync} lipsync` : '',
      pacing ? `${pacing} pacing` : '',
    ], 8).join(', '),
  }
}

interface ParsedHumanlikeCarryConsolidationCue {
  record: AlicizationMemoryConsolidationRecord
  recallCertainty: string
  stablePreferenceHint: string
  embodimentExpressionSummary: string
  hostEmotionLabels: string[]
  selfEmotionLabels: string[]
  embodimentRecallStrength: string
  embodimentModalityRisk: string
  cueObject: string
}

function parseHumanlikeCarryConsolidationCue(record: AlicizationMemoryConsolidationRecord): ParsedHumanlikeCarryConsolidationCue | null {
  const metadata = objectFrom(record.metadata)
  const humanlikeCarry = objectFrom(metadata?.humanlikeCarry)
  if (
    !humanlikeCarry
    || record.dominantProvenance === 'shadow'
    || (record.derivedEventIds?.length ?? 0) === 0
  ) {
    return null
  }

  const recallCertainty = sanitizeText(humanlikeCarry?.recallCertainty, 48).toLowerCase()
  const embodimentExpression = parseEmbodimentExpression(humanlikeCarry?.embodimentExpression)
  const embodimentExpressionSummary = sanitizeText(embodimentExpression?.summary, 220)
  const affectivePerspective = objectFrom(humanlikeCarry?.affectivePerspective)
  const hostEmotionLabels = stringListFrom(affectivePerspective?.hostEmotionLabels, 4)
  const selfEmotionLabels = stringListFrom(affectivePerspective?.selfEmotionLabels, 4)
  const embodimentRecallProfile = objectFrom(humanlikeCarry?.embodimentRecallProfile)
  const embodimentRecallStrength = sanitizeText(embodimentRecallProfile?.recallStrength, 80)
  const embodimentModalityRisk = sanitizeText(embodimentRecallProfile?.modalityRisk, 80)
  const stablePreferenceHint = sanitizeLongHorizonEvidenceText(humanlikeCarry?.stablePreferenceHint, 220)

  const cueObject = uniqueList([
    hostEmotionLabels.length > 0 ? `host-emotion ${hostEmotionLabels.join(' ')}` : '',
    selfEmotionLabels.length > 0 ? `self-emotion ${selfEmotionLabels.join(' ')}` : '',
    embodimentRecallStrength ? `embodiment-recall ${embodimentRecallStrength}` : '',
    embodimentModalityRisk ? `modality risk ${embodimentModalityRisk}` : '',
    embodimentExpressionSummary ? `embodiment-expression ${embodimentExpressionSummary}` : '',
  ], 6).join(' ')
  if (!cueObject && !stablePreferenceHint)
    return null

  return {
    record,
    recallCertainty,
    embodimentExpressionSummary,
    hostEmotionLabels,
    selfEmotionLabels,
    embodimentRecallStrength,
    embodimentModalityRisk,
    stablePreferenceHint,
    cueObject,
  }
}

function consolidationProvenanceBoost(record: AlicizationMemoryConsolidationRecord) {
  switch (record.dominantProvenance) {
    case 'observed':
      return 0.14
    case 'remembered':
      return 0.1
    case 'inferred':
      return 0.05
    case 'reconstructed':
      return 0.03
    case 'dreamt':
      return 0.02
    default:
      return 0
  }
}

function consolidationEvidenceWeight(record: AlicizationMemoryConsolidationRecord, now: number) {
  const ageDays = Math.max(0, (now - record.updatedAt) / (24 * 60 * 60 * 1000))
  const recency = Math.exp(-ageDays / 28)
  const evidenceBoost = Math.min(0.12, (record.derivedEventIds?.length ?? 0) * 0.03)
  return clamp01(
    record.confidence * 0.68
    + recency * 0.16
    + evidenceBoost
    + consolidationProvenanceBoost(record),
  )
}

function inferConsolidationInfluenceTags(
  parsed: ParsedHumanlikeCarryConsolidationCue,
  kind: 'carry' | 'preference',
) {
  const tags = new Set<AlicizationLongHorizonMemoryCueInfluence>()
  if (parsed.record.facet === 'relationship-era')
    tags.add('bond')
  if (parsed.record.facet === 'task-era' || parsed.record.kind === 'procedural')
    tags.add('task')
  if (parsed.record.facet === 'self-era')
    tags.add('identity')
  if (kind === 'carry' && parsed.hostEmotionLabels.length > 0)
    tags.add('bond')
  if (
    kind === 'carry'
    && (
      parsed.selfEmotionLabels.length > 0
      || parsed.embodimentExpressionSummary
      || parsed.embodimentRecallStrength
    )
  ) {
    tags.add('identity')
  }
  if (kind === 'carry' && ['medium', 'high'].includes(parsed.embodimentModalityRisk.toLowerCase()))
    tags.add('boundary')
  if (parsed.recallCertainty === 'corrected')
    tags.add('truth')
  if (tags.size === 0)
    tags.add('truth')
  return [...tags]
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
  if (/玩笑|逗|有趣|轻松|可爱|tease|playful|fun|joke/iu.test(text))
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
  void tags
  return statement
}

function buildCurrentTurnExecutionCallbackCue(input: {
  now: number
  executionCallbackCarry?: AlicizationExecutionCallbackCarrySnapshot | null
}) {
  const carry = input.executionCallbackCarry ?? null
  if (!carry)
    return null

  const object = uniqueList([
    carry.summary,
    carry.threadAnchor ? `thread anchor: ${carry.threadAnchor}` : '',
    carry.episodeId ? `episode: ${carry.episodeId}` : '',
  ], 3).join(' ')
  if (!object)
    return null

  const influenceTags: AlicizationLongHorizonMemoryCueInfluence[] = [
    ...(carry.carryMode === 'trust-warming' ? ['bond' as const, 'identity' as const] : []),
    ...(carry.carryMode === 'repair-before-closeness' ? ['truth' as const] : []),
    ...(carry.carryMode === 'lower-pressure' || carry.carryMode === 'repair-before-closeness'
      ? ['boundary' as const]
      : []),
    'task',
  ]
  return {
    factId: 'derived:execution-callback-carry-current-turn',
    subject: 'relationship',
    predicate: 'execution-callback-carry-current-turn',
    object: sanitizeText(object, 180),
    confidence: clamp01(carry.confidence),
    weight: clamp01(
      carry.confidence * 0.68
      + 0.24
      + (carry.carryMode === 'lower-pressure' ? 0.12 : 0)
      + (carry.carryMode === 'repair-before-closeness' ? 0.1 : 0)
      + (carry.carryMode === 'trust-warming' ? 0.08 : 0)
      + (carry.threadAnchor ? 0.06 : 0),
    ),
    influenceTags: [...new Set(influenceTags)],
    summary: sanitizeText(object, 180),
    lastRecalledAt: input.now,
  } satisfies AlicizationLongHorizonMemoryCueSnapshot
}

function buildAffectiveResidueCadenceCue(input: {
  now: number
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
}) {
  const affectiveResidue = input.affectiveResidue ?? null
  const cadence = affectiveResidue?.relationshipCadence ?? null
  if (!cadence)
    return null

  const carriesMeasuredCadence
    = cadence.cadenceMode === 'measured-return'
      || cadence.shouldDelayWarmth
      || cadence.distancePosture === 'measured-room'
  if (!carriesMeasuredCadence)
    return null

  const object = uniqueList([
    cadence.summary,
    affectiveResidue?.summary,
    cadence.cadenceMode ? `cadence mode: ${cadence.cadenceMode}` : '',
    cadence.reasonTags?.length ? `reason tags: ${cadence.reasonTags.join(', ')}` : '',
    cadence.distancePosture ? `distance posture: ${cadence.distancePosture}` : '',
  ], 4).join(' ')
  if (!object)
    return null

  const influenceTags: AlicizationLongHorizonMemoryCueInfluence[] = [
    'bond',
    'task',
    ...(cadence.shouldDelayWarmth || cadence.distancePosture === 'measured-room' ? ['boundary' as const] : []),
    ...(cadence.cadenceMode === 'measured-return' ? ['identity' as const] : []),
  ]

  return {
    factId: 'derived:affective-residue-cadence',
    subject: 'relationship',
    predicate: 'affective-residue-cadence',
    object: sanitizeText(object, 180),
    confidence: clamp01(
      0.58
      + cadence.afterglowCarry * 0.18
      + cadence.repairRecovery * 0.1
      + cadence.companionshipDensity * 0.08
      + (cadence.shouldDelayWarmth ? 0.08 : 0)
      + (cadence.cadenceMode === 'measured-return' ? 0.08 : 0),
    ),
    weight: clamp01(
      0.56
      + cadence.afterglowCarry * 0.16
      + cadence.repairRecovery * 0.1
      + cadence.companionshipDensity * 0.08
      + (cadence.shouldDelayWarmth ? 0.12 : 0)
      + (cadence.distancePosture === 'measured-room' ? 0.08 : 0)
      + (cadence.cadenceMode === 'measured-return' ? 0.12 : 0),
    ),
    influenceTags: [...new Set(influenceTags)],
    summary: sanitizeText(object, 180),
    lastRecalledAt: input.now,
  } satisfies AlicizationLongHorizonMemoryCueSnapshot
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

function decayPreviousAnchorCueWeight(cue: AlicizationLongHorizonMemoryCueSnapshot) {
  return clamp01(cue.weight * 0.92)
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
      weight: decayPreviousAnchorCueWeight(previous),
    })
  }

  return [...merged.values()]
    .filter(cue => cue.weight >= 0.08)
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 6)
}

function buildDerivedAnchorCues(input: {
  now: number
  hostPersonModel?: AlicizationHostPersonModelSnapshot | null
  personStateUpdateSurface?: AlicizationPersonStateUpdateSurface | null
  executionCallbackCarry?: AlicizationExecutionCallbackCarrySnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  recentMemoryConsolidations?: AlicizationMemoryConsolidationRecord[] | null
}) {
  const cues: AlicizationLongHorizonMemoryCueSnapshot[] = []
  const hostPersonModel = input.hostPersonModel ?? null
  const surface = input.personStateUpdateSurface ?? null
  const affectiveResidue = input.affectiveResidue ?? surface?.affectiveResidue ?? null
  const recentMemoryConsolidations = Array.isArray(input.recentMemoryConsolidations)
    ? input.recentMemoryConsolidations
    : []
  const currentTurnExecutionCallbackCue = buildCurrentTurnExecutionCallbackCue({
    now: input.now,
    executionCallbackCarry: input.executionCallbackCarry ?? null,
  })
  const affectiveResidueCadenceCue = buildAffectiveResidueCadenceCue({
    now: input.now,
    affectiveResidue,
  })

  if (currentTurnExecutionCallbackCue)
    cues.push(currentTurnExecutionCallbackCue)
  if (affectiveResidueCadenceCue)
    cues.push(affectiveResidueCadenceCue)

  if (hostPersonModel?.preferredClosenessByContext?.length) {
    const preference = hostPersonModel.preferredClosenessByContext[0]
    const tags: AlicizationLongHorizonMemoryCueInfluence[] = ['bond']
    if (boundaryPattern.test(preference.preference))
      tags.push('boundary')
    cues.push({
      factId: `derived:host-closeness:${preference.context}`,
      subject: 'relationship',
      predicate: 'preferred-closeness',
      object: sanitizeText(`${preference.context}: ${preference.preference}`, 180),
      confidence: clamp01(preference.confidence),
      weight: clamp01(preference.confidence * 0.72 + (boundaryPattern.test(preference.preference) ? 0.12 : 0.08)),
      influenceTags: [...new Set(tags)],
      summary: sanitizeText(`${preference.context}: ${preference.preference}`, 180),
      lastRecalledAt: input.now,
    })
  }

  if (hostPersonModel?.trustLadder?.rationale) {
    cues.push({
      factId: `derived:trust-stage:${hostPersonModel.trustLadder.stage}`,
      subject: 'relationship',
      predicate: 'trust-rationale',
      object: sanitizeText(hostPersonModel.trustLadder.rationale, 180),
      confidence: clamp01(hostPersonModel.trustLadder.score),
      weight: clamp01(hostPersonModel.trustLadder.score * 0.6 + 0.18),
      influenceTags: ['bond', 'identity'],
      summary: sanitizeText(hostPersonModel.trustLadder.rationale, 180),
      lastRecalledAt: input.now,
    })
  }

  const hasLearnedPersonStateEvidence = surface
    ? (
        surface.sourceTrail.length > 0
        || Object.values(surface.relationshipShift).some(value => value !== 0)
        || Object.values(surface.reinforcementBias).some(value => Number(value) !== 0)
        || surface.preferenceHints.length > 0
        || surface.sensitivityHints.length > 0
        || surface.repairHints.length > 0
        || surface.burdenHints.length > 0
      )
    : false
  if (surface?.summary && hasLearnedPersonStateEvidence) {
    const text = sanitizeText(surface.summary, 220)
    const tags = new Set<AlicizationLongHorizonMemoryCueInfluence>()
    if (truthPattern.test(text) || repairPattern.test(text))
      tags.add('truth')
    if (boundaryPattern.test(text))
      tags.add('boundary')
    if (bondPattern.test(text))
      tags.add('bond')
    if (taskPattern.test(text))
      tags.add('task')
    if (carePattern.test(text))
      tags.add('care')
    if (tags.size === 0)
      tags.add('identity')
    cues.push({
      factId: 'derived:person-state-summary',
      subject: 'assistant',
      predicate: 'person-state-summary',
      object: text,
      confidence: 0.78,
      weight: clamp01(
        0.46
        + Math.max(0, surface.relationshipShift.trustDelta) * 0.32
        + Math.max(0, surface.relationshipShift.repairDelta) * 0.28
        + Math.max(0, surface.relationshipShift.boundaryDelta) * 0.22
        + Math.max(0, -surface.relationshipShift.burdenDelta) * 0.18,
      ),
      influenceTags: [...tags],
      summary: text,
      lastRecalledAt: input.now,
    })
  }

  const humanlikeCarryConsolidationCues = recentMemoryConsolidations.flatMap((record) => {
    const parsed = parseHumanlikeCarryConsolidationCue(record)
    if (!parsed)
      return []

    const evidenceWeight = consolidationEvidenceWeight(parsed.record, input.now)
    const carryCue = parsed.cueObject
      ? [{
        factId: `derived:consolidation-humanlike-carry:${parsed.record.id}`,
        subject: parsed.record.facet === 'relationship-era' ? 'relationship' : 'assistant',
        predicate: 'consolidation-humanlike-carry',
        object: sanitizeText(parsed.cueObject, 260),
        confidence: clamp01(parsed.record.confidence + consolidationProvenanceBoost(parsed.record)),
        weight: evidenceWeight,
        influenceTags: inferConsolidationInfluenceTags(parsed, 'carry'),
        summary: sanitizeText(parsed.cueObject, 180),
        lastRecalledAt: input.now,
      } satisfies AlicizationLongHorizonMemoryCueSnapshot]
      : []

    const stablePreferenceCue = parsed.stablePreferenceHint
      ? [{
        factId: `derived:consolidation-stable-preference:${parsed.record.id}`,
        subject: parsed.record.facet === 'relationship-era' ? 'relationship' : 'assistant',
        predicate: 'stable-preference-hint',
        object: sanitizeText(parsed.stablePreferenceHint, 220),
        confidence: clamp01(parsed.record.confidence + consolidationProvenanceBoost(parsed.record)),
        weight: evidenceWeight,
        influenceTags: inferConsolidationInfluenceTags(parsed, 'preference'),
        summary: sanitizeText(parsed.stablePreferenceHint, 180),
        lastRecalledAt: input.now,
      } satisfies AlicizationLongHorizonMemoryCueSnapshot]
      : []

    return [...carryCue, ...stablePreferenceCue]
  })

  cues.push(...humanlikeCarryConsolidationCues)

  const safetyGateCarryText = uniqueList(
    recentMemoryConsolidations.flatMap(record => [
      sanitizeText(record.summary, 220),
      sanitizeText(record.lesson, 220),
      ...record.cues.map(cue => sanitizeText(cue, 180)),
    ]).filter(line => executionSafetyGateRestraintPattern.test(line)),
    6,
  ).join(' ')
  if (safetyGateCarryText) {
    cues.push({
      factId: 'derived:execution-safety-gate-restraint',
      subject: 'relationship',
      predicate: 'execution-safety-gate',
      object: sanitizeText(safetyGateCarryText, 180),
      confidence: 0.84,
      weight: clamp01(
        0.68
        + (safetyGateCarryText.includes('blocked-before-dispatch') ? 0.16 : 0)
        + (safetyGateCarryText.includes('confirmation=required') ? 0.12 : 0)
        + (safetyGateCarryText.includes('no-process-started') ? 0.08 : 0)
        + (/ordinary proactive closeness|wait for confirmation/iu.test(safetyGateCarryText) ? 0.06 : 0),
      ),
      influenceTags: ['boundary', 'task', 'identity'],
      summary: sanitizeText(safetyGateCarryText, 180),
      lastRecalledAt: input.now,
    })
  }

  const resumeConfirmationCarryText = uniqueList(
    recentMemoryConsolidations.flatMap(record => [
      sanitizeText(record.summary, 220),
      sanitizeText(record.lesson, 220),
      ...record.cues.map(cue => sanitizeText(cue, 180)),
    ]).filter(line => executionResumeConfirmationPattern.test(line)),
    6,
  ).join(' ')
  if (resumeConfirmationCarryText) {
    cues.push({
      factId: 'derived:execution-resume-confirmation-boundary',
      subject: 'relationship',
      predicate: 'execution-resume-confirmation',
      object: sanitizeText(resumeConfirmationCarryText, 180),
      confidence: 0.84,
      weight: clamp01(
        0.68
        + (resumeConfirmationCarryText.includes('host-confirmed-before-redispatch') ? 0.18 : 0)
        + (resumeConfirmationCarryText.includes('resume-before-dispatch') ? 0.1 : 0)
        + (resumeConfirmationCarryText.includes('process-not-yet-restarted') ? 0.06 : 0),
      ),
      influenceTags: ['boundary', 'task', 'identity'],
      summary: sanitizeText(resumeConfirmationCarryText, 180),
      lastRecalledAt: input.now,
    })
  }

  return cues
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
      preferenceBias.gentleRepair += weight * (
        repairPattern.test(text) || /lived-in|genuinely received|relationship meaning|mechanical|robotic/i.test(text)
          ? 0.24
          : 0.16
      )
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
  const factualAnchorFacts = mergeAnchorFacts({
    now: input.now,
    currentFacts: input.facts,
    previous: input.previous ?? null,
  })
  const derivedAnchorCues = buildDerivedAnchorCues({
    now: input.now,
    hostPersonModel: input.hostPersonModel ?? null,
    personStateUpdateSurface: input.personStateUpdateSurface ?? null,
    executionCallbackCarry: input.executionCallbackCarry ?? null,
    affectiveResidue: input.affectiveResidue ?? input.personStateUpdateSurface?.affectiveResidue ?? null,
    recentMemoryConsolidations: input.recentMemoryConsolidations ?? null,
  })
  const anchorFacts = [
    ...factualAnchorFacts,
    ...derivedAnchorCues,
  ]
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 6)
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
    preferencePredicatePattern.test(cue.predicate))
  ?? pickCueSummary(anchorFacts, cue =>
    cue.influenceTags.includes('bond'))
  ?? previous.rememberedPreferenceSummary
  const rememberedConstraintSummary = pickCueSummary(anchorFacts, cue =>
    cue.influenceTags.includes('boundary') || dislikePredicatePattern.test(cue.predicate)) ?? previous.rememberedConstraintSummary
  const rememberedPlanSummary = pickCueSummary(anchorFacts, cue =>
    cue.influenceTags.includes('task') || planPredicatePattern.test(cue.predicate)) ?? previous.rememberedPlanSummary
  const summary = uniqueList([
    rememberedPreferenceSummary,
    rememberedConstraintSummary,
    rememberedPlanSummary,
    dominantCueSummary,
    previous.summary,
  ], 5).join(' | ')

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
