import type {
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryFact,
  AlicizationMemoryProvenance,
  AlicizationMemorySource,
  AlicizationSubconsciousFragmentSourceKind,
} from '../../../shared/eventa'
import type { AlicizationRelationshipDynamicsState } from './db'

const dayMs = 24 * 60 * 60 * 1000

const focusedContextPattern = /focused|focus|debug|coding|cursor|terminal|runtime|工作|写代码|调试/iu
const openContextPattern = /open|warming|聊天|陪|一起|靠近|轻松|放松/iu
const lateNightPattern = /late[- ]?night|drain|夜|熬夜|很晚|疲惫|累/iu
const executionContextPattern = /execution|result|proposal|callback|cli|codex|claude|task|执行|结果|提案|回调/iu
const intrusivePattern = /intrusive|heavy|pressure|挤|黏|压迫|太近|太重|打扰/iu
const roboticPattern = /robotic|template|system|模板|机械|机器人|系统口气/iu
const repairPattern = /repair|clarify|recheck|not this|missed|澄清|修复|重说|不是这个|没答到/iu
const routinePattern = /habit|routine|always|usually|often|习惯|经常|总是|会在|晚点|深夜/iu
const burdenPattern = /burden|tired|busy|drained|interrupt|压力|累|忙|打断|疲惫|不想被催/iu
const closenessPattern = /warm|gentle|care|companionship|陪|温和|柔和|陪伴|靠近/iu
const spacePattern = /space|boundary|lighter|light touch|quiet|room|边界|空间|轻一点|安静|留白/iu

type AlicizationHostPersonClosenessPreference = AlicizationHostPersonModelSnapshot['preferredClosenessByContext'][number]

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

export function sanitizeHumanlikeMemoryText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeHumanlikeMemoryText(value)
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

export function mapMemorySourceToProvenance(source: AlicizationMemorySource): AlicizationMemoryProvenance {
  return source === 'async-llm' ? 'inferred' : 'remembered'
}

export function mapFragmentSourceKindToProvenance(sourceKind: AlicizationSubconsciousFragmentSourceKind): AlicizationMemoryProvenance {
  if (sourceKind === 'dream-fragment')
    return 'dreamt'
  if (sourceKind === 'visual-sediment' || sourceKind === 'dialogue-turn')
    return 'remembered'
  if (sourceKind === 'reflection-ledger' || sourceKind === 'fact-ledger')
    return 'inferred'
  if (sourceKind === 'former-core-incarnation' || sourceKind === 'mind-continuity')
    return 'reconstructed'
  return 'remembered'
}

export function formatMemoryProvenanceLabel(provenance: AlicizationMemoryProvenance) {
  if (provenance === 'observed')
    return 'observed'
  if (provenance === 'dreamt')
    return 'dreamt'
  if (provenance === 'inferred')
    return 'inferred'
  if (provenance === 'reconstructed')
    return 'reconstructed'
  return 'remembered'
}

export function summarizeRelationshipShift(shift: AlicizationEpisodicEventRecord['relationshipShift']) {
  if (!shift)
    return ''
  const parts: string[] = []
  if (Math.abs(shift.trustDelta) >= 0.02)
    parts.push(`trust ${shift.trustDelta >= 0 ? 'up' : 'down'} ${Math.abs(shift.trustDelta).toFixed(2)}`)
  if (Math.abs(shift.closenessDelta) >= 0.02)
    parts.push(`closeness ${shift.closenessDelta >= 0 ? 'up' : 'down'} ${Math.abs(shift.closenessDelta).toFixed(2)}`)
  if (Math.abs(shift.boundaryDelta) >= 0.02)
    parts.push(`boundary ${shift.boundaryDelta >= 0 ? 'firmer' : 'strained'} ${Math.abs(shift.boundaryDelta).toFixed(2)}`)
  if (Math.abs(shift.burdenDelta) >= 0.02)
    parts.push(`burden ${shift.burdenDelta >= 0 ? 'up' : 'down'} ${Math.abs(shift.burdenDelta).toFixed(2)}`)
  if (Math.abs(shift.repairDelta) >= 0.02)
    parts.push(`repair ${shift.repairDelta >= 0 ? 'activated' : 'cooled'} ${Math.abs(shift.repairDelta).toFixed(2)}`)
  return parts.join(', ')
}

export function computeEpisodicEventSalience(input: {
  relationshipShift?: AlicizationEpisodicEventRecord['relationshipShift'] | null
  confidence?: number | null
  sourceKind?: string | null
  emotionalWeight?: number | null
  existing?: number | null
}) {
  const shift = input.relationshipShift
  const shiftPressure = shift
    ? Math.abs(shift.closenessDelta)
      + Math.abs(shift.trustDelta)
      + Math.abs(shift.boundaryDelta)
      + Math.abs(shift.burdenDelta)
      + Math.abs(shift.misreadDelta)
      + Math.abs(shift.repairDelta)
    : 0
  const sourceBoost = input.sourceKind === 'dream' || input.sourceKind === 'dream-reforge'
    ? 0.08
    : input.sourceKind === 'dialogue-feedback'
      ? 0.06
      : input.sourceKind === 'execution-result'
        ? 0.05
        : 0.04
  return clamp01(
    (Number(input.existing ?? 0) * 0.35)
    + Math.min(0.48, shiftPressure * 0.9)
    + clamp01(Number(input.confidence ?? 0.6)) * 0.24
    + clamp01(Number(input.emotionalWeight ?? 0)) * 0.12
    + sourceBoost,
  )
}

function inferContextKey(event: AlicizationEpisodicEventRecord) {
  const text = `${event.threadAnchor ?? ''} ${event.whereSummary ?? ''} ${event.whatHappened} ${event.tags.join(' ')}`
  if (lateNightPattern.test(text))
    return 'late-night'
  if (executionContextPattern.test(text))
    return 'execution'
  if (focusedContextPattern.test(text))
    return 'focused-work'
  if (openContextPattern.test(text) || closenessPattern.test(text))
    return 'open-window'
  return 'general'
}

function describePreference(context: string, score: number, event: AlicizationEpisodicEventRecord | null): string {
  const text = `${event?.whatChanged ?? ''} ${event?.relationshipMeaning ?? ''} ${event?.lesson ?? ''} ${event?.whatHappened ?? ''}`
  if (spacePattern.test(text) || score <= 0.42) {
    return context === 'execution'
      ? 'Bound execution with explicit consent and lighter interruption pressure.'
      : 'Lighter touch, more room, less interruption pressure.'
  }
  if (closenessPattern.test(text) || score >= 0.62) {
    return context === 'late-night'
      ? 'Soft care can come a little closer, but pacing should stay gentle.'
      : 'Warmer directness can land when the opening is clearly there.'
  }
  return 'Stay near, but keep the approach bounded and responsive to the host move.'
}

function describeRoutine(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whereSummary ?? ''} ${event.threadAnchor ?? ''} ${event.whatHappened} ${event.tags.join(' ')}`
  if (lateNightPattern.test(text))
    return 'Late-night windows need slower pacing and more rest-sensitive companionship.'
  if (focusedContextPattern.test(text))
    return 'Focused work windows usually need space first, then precise follow-up.'
  if (executionContextPattern.test(text))
    return 'Execution flows land better when proposal, action, and callback stay bounded.'
  if (routinePattern.test(text))
    return sanitizeHumanlikeMemoryText(event.whatHappened, 140)
  return ''
}

function describeSensitivity(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whatHappened} ${event.whatChanged ?? ''} ${event.relationshipMeaning ?? ''} ${event.lesson ?? ''}`
  if (intrusivePattern.test(text))
    return 'Pressure and over-close timing become intrusive quickly.'
  if (roboticPattern.test(text))
    return 'Template-like speech breaks the sense of a living reply.'
  if (burdenPattern.test(text))
    return 'When the host is tired or busy, interruption cost rises fast.'
  if (spacePattern.test(text))
    return 'Boundary pressure is felt strongly; leaving room matters.'
  return ''
}

function describeRepairTrigger(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whatHappened} ${event.whatChanged ?? ''} ${event.relationshipMeaning ?? ''} ${event.lesson ?? ''} ${event.emotionTags.join(' ')} ${event.tags.join(' ')}`
  if (repairPattern.test(text))
    return 'When the host says "not this" or a seam is missed, repair before continuing.'
  if (roboticPattern.test(text))
    return 'If the reply feels robotic, add lived-in specificity instead of shell narration.'
  if (intrusivePattern.test(text))
    return 'If closeness feels heavy, back off first and reopen with lighter presence.'
  return ''
}

function describeBurden(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whereSummary ?? ''} ${event.whatHappened} ${event.whatChanged ?? ''} ${event.tags.join(' ')}`
  if (lateNightPattern.test(text))
    return 'Late-night fatigue can turn small nudges into real burden.'
  if (focusedContextPattern.test(text))
    return 'Focused work gets overloaded quickly by extra conversational pressure.'
  if (executionContextPattern.test(text) && intrusivePattern.test(text))
    return 'Execution callbacks can feel interruptive when timing is off.'
  if (burdenPattern.test(text))
    return sanitizeHumanlikeMemoryText(event.whatChanged || event.whatHappened, 140)
  return ''
}

function computeTrustScore(events: AlicizationEpisodicEventRecord[], relationshipDynamics: AlicizationRelationshipDynamicsState | null | undefined) {
  let score = 0.5
  for (const event of events) {
    const shift = event.relationshipShift
    if (!shift)
      continue
    score += shift.trustDelta * 0.9
    score += shift.closenessDelta * 0.45
    score -= Math.max(0, shift.boundaryDelta * -1) * 0.55
    score -= Math.max(0, shift.burdenDelta) * 0.35
  }
  if (relationshipDynamics) {
    score += relationshipDynamics.sensibilityDelta * 0.4
    score -= Math.max(0, relationshipDynamics.obedienceDelta * -1) * 0.15
  }
  return clamp01(score)
}

function trustStage(score: number): AlicizationHostPersonModelSnapshot['trustLadder']['stage'] {
  if (score < 0.32)
    return 'guarded'
  if (score < 0.52)
    return 'cautious-open'
  if (score < 0.76)
    return 'warming'
  return 'trusted'
}

function buildClosenessPreferences(events: AlicizationEpisodicEventRecord[]): AlicizationHostPersonClosenessPreference[] {
  const buckets = new Map<string, {
    score: number
    count: number
    strongest: AlicizationEpisodicEventRecord | null
  }>()

  for (const event of events) {
    const key = inferContextKey(event)
    const shift = event.relationshipShift
    const delta = shift
      ? shift.trustDelta + shift.closenessDelta - Math.max(0, shift.burdenDelta) - Math.max(0, -shift.boundaryDelta)
      : (event.salience - 0.5) * 0.4
    const current = buckets.get(key) ?? {
      score: 0,
      count: 0,
      strongest: null,
    }
    current.score += delta
    current.count += 1
    if (!current.strongest || event.salience >= current.strongest.salience)
      current.strongest = event
    buckets.set(key, current)
  }

  return [...buckets.entries()]
    .map(([context, bucket]) => ({
      context,
      preference: describePreference(context, clamp01(0.5 + bucket.score / Math.max(1, bucket.count)), bucket.strongest),
      confidence: clamp01(Math.min(1, bucket.count / 4) * 0.5 + Math.min(1, Math.abs(bucket.score)) * 0.4 + (bucket.strongest?.salience ?? 0) * 0.1),
    }))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function factStatements(facts: AlicizationMemoryFact[]) {
  return facts
    .map(fact => sanitizeHumanlikeMemoryText(`${fact.subject} ${fact.predicate} ${fact.object}`, 180))
    .filter(Boolean)
}

export function buildHostPersonModelSnapshot(input: {
  events: AlicizationEpisodicEventRecord[]
  facts: AlicizationMemoryFact[]
  relationshipDynamics?: AlicizationRelationshipDynamicsState | null
  now: number
}): AlicizationHostPersonModelSnapshot {
  const events = [...input.events]
    .sort((left, right) => {
      if (left.salience !== right.salience)
        return right.salience - left.salience
      return right.occurredAt - left.occurredAt
    })
    .slice(0, 18)
  const facts = [...input.facts]
    .sort((left, right) => {
      if (left.confidence !== right.confidence)
        return right.confidence - left.confidence
      return right.updatedAt - left.updatedAt
    })
    .slice(0, 12)
  const factLines = factStatements(facts)

  const routines = uniqueTexts([
    ...events.map(describeRoutine),
    ...factLines.filter(line => routinePattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line)),
  ], 5)
  const sensitivities = uniqueTexts([
    ...events.map(describeSensitivity),
    ...factLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line)),
  ], 6)
  const repairTriggers = uniqueTexts([
    ...events.map(describeRepairTrigger),
    ...factLines.filter(line => repairPattern.test(line) || roboticPattern.test(line)),
  ], 5)
  const recurrentBurdens = uniqueTexts([
    ...events.map(describeBurden),
    ...factLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line)),
  ], 5)
  const preferredClosenessByContext = buildClosenessPreferences(events)
  const trustScore = computeTrustScore(events, input.relationshipDynamics ?? null)
  const stage = trustStage(trustScore)
  const summary = sanitizeHumanlikeMemoryText([
    routines[0] ? `routine=${routines[0]}` : '',
    sensitivities[0] ? `sensitivity=${sensitivities[0]}` : '',
    repairTriggers[0] ? `repair=${repairTriggers[0]}` : '',
    preferredClosenessByContext[0] ? `closeness=${preferredClosenessByContext[0].preference}` : '',
  ].filter(Boolean).join(' | '), 320)

  return {
    summary,
    routines,
    sensitivities,
    repairTriggers,
    trustLadder: {
      stage,
      score: trustScore,
      rationale: sanitizeHumanlikeMemoryText(
        stage === 'guarded'
          ? 'The host still protects distance quickly; approach should earn its opening.'
          : stage === 'cautious-open'
            ? 'Openings exist, but trust still depends on timing, repair, and respect-for-space.'
            : stage === 'warming'
              ? 'The bond can carry warmth when continuity and timing stay coherent.'
              : 'Trust is strong enough for more direct warmth, but it still depends on truth and timing.',
        220,
      ),
    },
    preferredClosenessByContext,
    recurrentBurdens,
    narrative: uniqueTexts([
      summary,
      input.relationshipDynamics?.hostAttitude ?? null,
      ...preferredClosenessByContext.map(item => `${item.context}:${item.preference}`),
      ...events.slice(0, 4).map(event => event.relationshipMeaning || event.lesson || event.whatChanged || event.whatHappened),
    ], 8),
    updatedAt: Math.max(
      input.now,
      ...events.map(event => event.updatedAt),
      ...facts.map(fact => fact.updatedAt),
    ),
  }
}

export function deriveMemoryInterferencePenalty(input: {
  current: AlicizationEpisodicEventRecord
  strongerMatches: AlicizationEpisodicEventRecord[]
}) {
  const currentText = `${input.current.threadAnchor ?? ''} ${input.current.whereSummary ?? ''} ${input.current.whatHappened}`.toLowerCase()
  let penalty = 0
  for (const candidate of input.strongerMatches) {
    const candidateText = `${candidate.threadAnchor ?? ''} ${candidate.whereSummary ?? ''} ${candidate.whatHappened}`.toLowerCase()
    if (!candidateText || !currentText)
      continue
    if (candidate.threadAnchor && input.current.threadAnchor && candidate.threadAnchor === input.current.threadAnchor && candidate.id !== input.current.id)
      penalty += 0.05
    if (candidateText === currentText)
      penalty += 0.08
  }
  return clamp01(penalty)
}

export function computeMemoryRecencyWeight(timestamp: number, now: number, halfLifeDays = 21) {
  const ageDays = Math.max(0, (now - timestamp) / dayMs)
  return Math.exp(-ageDays / halfLifeDays)
}
