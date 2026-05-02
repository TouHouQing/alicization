import type {
  AlicizationEpisodicEventRecord,
  AlicizationHostPersonModelSnapshot,
  AlicizationMemoryFact,
  AlicizationMemoryProvenance,
  AlicizationMemorySource,
  AlicizationPersonaReinforcementEventRecord,
  AlicizationRelationshipOutcomeRecord,
  AlicizationSubconsciousFragmentSourceKind,
} from '../../../shared/eventa'
import type { AlicizationMemoryConsolidationRecord } from './memory-consolidation'
import type { AlicizationPersonStateUpdateSurface } from './person-state-update-surface'
import type { AlicizationRelationshipDynamicsState } from './relationship-dynamics-state'

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
const positiveMemoryPolarityPattern = /trust up|closer|lighter|gentle|useful|accepted|received|repair|soft|safe|靠近|变轻|被接住|有用|接受|修复|更稳/u
const negativeMemoryPolarityPattern = /trust down|intrusive|doubted|denied|pressure|heavy|failed|robotic|not this|boundary|down|拒绝|怀疑|压迫|打扰|失败|机械|不是这个|边界/u

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

function relationshipOutcomeStatements(outcomes: AlicizationRelationshipOutcomeRecord[]) {
  return outcomes.flatMap(outcome => uniqueTexts([
    outcome.summary,
    outcome.actionSummary,
    summarizeRelationshipShift({
      trustDelta: outcome.trustDelta,
      closenessDelta: outcome.closenessDelta,
      boundaryDelta: outcome.boundaryDelta,
      burdenDelta: outcome.burdenDelta,
      repairDelta: outcome.repairDelta,
    } as AlicizationEpisodicEventRecord['relationshipShift']),
  ], 4))
}

function personaReinforcementStatements(events: AlicizationPersonaReinforcementEventRecord[]) {
  return events.flatMap(event => uniqueTexts([
    event.summary,
    `${event.dimension}:${event.valence}:${event.delta >= 0 ? '+' : ''}${event.delta.toFixed(2)}`,
  ], 2))
}

function consolidationStatements(consolidations: AlicizationMemoryConsolidationRecord[]) {
  return consolidations.flatMap(record => uniqueTexts([
    record.summary,
    record.lesson,
    ...record.cues,
  ], 4))
}

function inferConsolidationContext(record: AlicizationMemoryConsolidationRecord) {
  const text = `${record.facet ?? ''} ${record.periodKey} ${record.summary} ${record.lesson ?? ''} ${record.cues.join(' ')}`.toLowerCase()
  if (lateNightPattern.test(text))
    return 'late-night'
  if (focusedContextPattern.test(text))
    return 'focused-work'
  if (executionContextPattern.test(text))
    return 'execution'
  if (openContextPattern.test(text) || closenessPattern.test(text))
    return 'open-window'
  return 'general'
}

function inferOutcomeContext(record: AlicizationRelationshipOutcomeRecord) {
  const text = `${record.actionSummary} ${record.summary}`.toLowerCase()
  if (lateNightPattern.test(text))
    return 'late-night'
  if (focusedContextPattern.test(text))
    return 'focused-work'
  if (executionContextPattern.test(text))
    return 'execution'
  if (openContextPattern.test(text) || closenessPattern.test(text))
    return 'open-window'
  return 'general'
}

function buildClosenessPreferencesFromConsolidations(consolidations: AlicizationMemoryConsolidationRecord[]) {
  const buckets = new Map<string, {
    score: number
    count: number
    strongest: AlicizationMemoryConsolidationRecord | null
  }>()

  for (const record of consolidations) {
    const key = inferConsolidationContext(record)
    const text = `${record.summary} ${record.lesson ?? ''} ${record.cues.join(' ')}`
    const delta = spacePattern.test(text)
      ? -0.12
      : closenessPattern.test(text)
        ? 0.12
        : repairPattern.test(text)
          ? -0.06
          : 0
    const current = buckets.get(key) ?? {
      score: 0,
      count: 0,
      strongest: null,
    }
    current.score += delta
    current.count += 1
    if (!current.strongest || record.confidence >= current.strongest.confidence)
      current.strongest = record
    buckets.set(key, current)
  }

  return [...buckets.entries()]
    .map(([context, bucket]) => ({
      context,
      preference: describePreference(
        context,
        clamp01(0.5 + bucket.score / Math.max(1, bucket.count)),
        bucket.strongest
          ? {
              id: bucket.strongest.id,
              whatHappened: bucket.strongest.summary,
              whatChanged: bucket.strongest.lesson,
              relationshipMeaning: bucket.strongest.summary,
              lesson: bucket.strongest.lesson,
            } as AlicizationEpisodicEventRecord
          : null,
      ),
      confidence: clamp01(Math.min(1, bucket.count / 4) * 0.45 + (bucket.strongest?.confidence ?? 0) * 0.45),
    }))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function buildClosenessPreferencesFromOutcomes(outcomes: AlicizationRelationshipOutcomeRecord[]) {
  const buckets = new Map<string, {
    score: number
    count: number
    strongest: AlicizationRelationshipOutcomeRecord | null
  }>()

  for (const record of outcomes) {
    const key = inferOutcomeContext(record)
    const delta = record.trustDelta
      + record.closenessDelta
      - Math.max(0, record.burdenDelta)
      - Math.max(0, -record.boundaryDelta)
    const current = buckets.get(key) ?? {
      score: 0,
      count: 0,
      strongest: null,
    }
    current.score += delta
    current.count += 1
    if (!current.strongest || Math.abs(delta) >= Math.abs((current.strongest.trustDelta ?? 0) + (current.strongest.closenessDelta ?? 0)))
      current.strongest = record
    buckets.set(key, current)
  }

  return [...buckets.entries()]
    .map(([context, bucket]) => ({
      context,
      preference: describePreference(
        context,
        clamp01(0.5 + bucket.score / Math.max(1, bucket.count)),
        bucket.strongest
          ? {
              id: bucket.strongest.id,
              whatHappened: bucket.strongest.summary,
              whatChanged: bucket.strongest.actionSummary,
              relationshipMeaning: bucket.strongest.summary,
              lesson: bucket.strongest.summary,
            } as AlicizationEpisodicEventRecord
          : null,
      ),
      confidence: clamp01(Math.min(1, bucket.count / 4) * 0.45 + Math.min(1, Math.abs(bucket.score)) * 0.35 + (bucket.strongest ? 0.12 : 0)),
    }))
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 4)
}

function buildClosenessPreferencesFromPersonStateUpdateSurface(surface: AlicizationPersonStateUpdateSurface | null | undefined) {
  const current = surface ?? null
  if (!current)
    return []
  const contexts = current.dominantContexts.length > 0
    ? current.dominantContexts
    : ['general']
  return contexts.slice(0, 4).map((context, index) => ({
    context,
    preference: current.preferenceHints[index] ?? current.preferenceHints[0] ?? 'Stay near, but keep the approach bounded and responsive to the host move.',
    confidence: clamp01(0.52 - index * 0.08 + Math.min(0.18, Math.abs(current.relationshipShift.trustDelta) + Math.abs(current.relationshipShift.closenessDelta))),
  }))
}

function mergeClosenessPreferences(input: {
  events: AlicizationHostPersonClosenessPreference[]
  consolidations: AlicizationHostPersonClosenessPreference[]
  outcomes?: AlicizationHostPersonClosenessPreference[]
  updates?: AlicizationHostPersonClosenessPreference[]
}) {
  const merged = new Map<string, AlicizationHostPersonClosenessPreference>()
  for (const item of [...input.events, ...input.consolidations, ...(input.outcomes ?? []), ...(input.updates ?? [])]) {
    const existing = merged.get(item.context)
    if (!existing || item.confidence >= existing.confidence)
      merged.set(item.context, item)
  }
  return [...merged.values()]
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5)
}

export function buildHostPersonModelSnapshot(input: {
  events: AlicizationEpisodicEventRecord[]
  facts: AlicizationMemoryFact[]
  consolidations?: AlicizationMemoryConsolidationRecord[]
  relationshipOutcomes?: AlicizationRelationshipOutcomeRecord[]
  reinforcementEvents?: AlicizationPersonaReinforcementEventRecord[]
  personStateUpdateSurface?: AlicizationPersonStateUpdateSurface | null
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
  const consolidations = [...(input.consolidations ?? [])]
    .sort((left, right) => {
      if (left.confidence !== right.confidence)
        return right.confidence - left.confidence
      return right.updatedAt - left.updatedAt
    })
    .slice(0, 10)
  const relationshipOutcomes = [...(input.relationshipOutcomes ?? [])]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 14)
  const reinforcementEvents = [...(input.reinforcementEvents ?? [])]
    .sort((left, right) => right.createdAt - left.createdAt)
    .slice(0, 16)
  const factLines = factStatements(facts)
  const consolidationLines = consolidationStatements(consolidations)
  const relationshipOutcomeLines = relationshipOutcomeStatements(relationshipOutcomes)
  const reinforcementLines = personaReinforcementStatements(reinforcementEvents)

  const routines = uniqueTexts([
    ...events.map(describeRoutine),
    ...consolidationLines.filter(line => routinePattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...relationshipOutcomeLines.filter(line => routinePattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...reinforcementLines.filter(line => routinePattern.test(line) || focusedContextPattern.test(line) || lateNightPattern.test(line)),
    ...factLines.filter(line => routinePattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line)),
  ], 5)
  const sensitivities = uniqueTexts([
    ...events.map(describeSensitivity),
    ...consolidationLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line) || repairPattern.test(line)),
    ...relationshipOutcomeLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line)),
    ...reinforcementLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line)),
    ...(input.personStateUpdateSurface?.sensitivityHints ?? []),
    ...factLines.filter(line => intrusivePattern.test(line) || roboticPattern.test(line) || spacePattern.test(line) || burdenPattern.test(line)),
  ], 6)
  const repairTriggers = uniqueTexts([
    ...events.map(describeRepairTrigger),
    ...consolidationLines.filter(line => repairPattern.test(line) || roboticPattern.test(line) || spacePattern.test(line)),
    ...relationshipOutcomeLines.filter(line => repairPattern.test(line) || roboticPattern.test(line) || spacePattern.test(line)),
    ...reinforcementLines.filter(line => repairPattern.test(line) || roboticPattern.test(line) || spacePattern.test(line)),
    ...(input.personStateUpdateSurface?.repairHints ?? []),
    ...factLines.filter(line => repairPattern.test(line) || roboticPattern.test(line)),
  ], 5)
  const recurrentBurdens = uniqueTexts([
    ...events.map(describeBurden),
    ...consolidationLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...relationshipOutcomeLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...reinforcementLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line) || executionContextPattern.test(line)),
    ...(input.personStateUpdateSurface?.burdenHints ?? []),
    ...factLines.filter(line => burdenPattern.test(line) || lateNightPattern.test(line) || focusedContextPattern.test(line)),
  ], 5)
  const preferredClosenessByContext = mergeClosenessPreferences({
    events: buildClosenessPreferences(events),
    consolidations: buildClosenessPreferencesFromConsolidations(consolidations),
    outcomes: buildClosenessPreferencesFromOutcomes(relationshipOutcomes),
    updates: buildClosenessPreferencesFromPersonStateUpdateSurface(input.personStateUpdateSurface ?? null),
  })
  const trustScore = (() => {
    let score = computeTrustScore(events, input.relationshipDynamics ?? null)
    for (const outcome of relationshipOutcomes) {
      score += outcome.trustDelta * 0.12
      score += outcome.closenessDelta * 0.05
      score -= Math.max(0, outcome.burdenDelta) * 0.03
      score -= Math.max(0, -outcome.boundaryDelta) * 0.04
      score += outcome.repairDelta * 0.03
    }
    for (const event of reinforcementEvents) {
      const direction = event.valence === 'reinforce' ? 1 : -1
      if (event.dimension === 'truthful-grounding' || event.dimension === 'gentle-repair')
        score += direction * event.delta * 0.05
      else if (event.dimension === 'companionship')
        score += direction * event.delta * 0.04
      else if (event.dimension === 'autonomy-respect')
        score += direction * event.delta * 0.02
    }
    if (input.personStateUpdateSurface) {
      score += input.personStateUpdateSurface.relationshipShift.trustDelta * 0.18
      score += input.personStateUpdateSurface.relationshipShift.closenessDelta * 0.06
      score -= Math.max(0, input.personStateUpdateSurface.relationshipShift.burdenDelta) * 0.05
      score -= Math.max(0, -input.personStateUpdateSurface.relationshipShift.boundaryDelta) * 0.06
      score += input.personStateUpdateSurface.relationshipShift.repairDelta * 0.04
      score += Number(input.personStateUpdateSurface.reinforcementBias['truthful-grounding'] ?? 0) * 0.06
      score += Number(input.personStateUpdateSurface.reinforcementBias.companionship ?? 0) * 0.04
      score += Number(input.personStateUpdateSurface.reinforcementBias['autonomy-respect'] ?? 0) * 0.02
    }
    return clamp01(score)
  })()
  const stage = trustStage(trustScore)
  const summary = sanitizeHumanlikeMemoryText([
    input.personStateUpdateSurface?.summary ? `update=${input.personStateUpdateSurface.summary}` : '',
    input.relationshipDynamics?.hostAttitude ? `attitude=${input.relationshipDynamics.hostAttitude}` : '',
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
      input.personStateUpdateSurface?.summary ?? null,
      input.relationshipDynamics?.hostAttitude ?? null,
      ...(input.personStateUpdateSurface?.narrative ?? []).slice(0, 4),
      ...consolidations.slice(0, 4).map(record => record.summary || record.lesson || record.periodKey),
      ...relationshipOutcomes.slice(0, 4).map(record => record.summary || record.actionSummary),
      ...reinforcementEvents.slice(0, 4).map(record => record.summary),
      ...preferredClosenessByContext.map(item => `${item.context}:${item.preference}`),
      ...events.slice(0, 4).map(event => event.relationshipMeaning || event.lesson || event.whatChanged || event.whatHappened),
    ], 8),
    updatedAt: Math.max(
      input.now,
      ...events.map(event => event.updatedAt),
      ...facts.map(fact => fact.updatedAt),
      ...consolidations.map(record => record.updatedAt),
      ...relationshipOutcomes.map(record => record.createdAt),
      ...reinforcementEvents.map(record => record.createdAt),
      input.personStateUpdateSurface?.updatedAt ?? 0,
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

function eventShiftDirection(event: AlicizationEpisodicEventRecord) {
  const shift = event.relationshipShift
  if (!shift)
    return 0
  return shift.trustDelta + shift.closenessDelta - Math.max(0, shift.burdenDelta) - Math.max(0, -shift.boundaryDelta)
}

function eventMemoryPolarity(event: AlicizationEpisodicEventRecord) {
  const text = `${event.whatHappened} ${event.whatChanged ?? ''} ${event.relationshipMeaning ?? ''} ${event.lesson ?? ''}`.toLowerCase()
  const positive = positiveMemoryPolarityPattern.test(text) ? 1 : 0
  const negative = negativeMemoryPolarityPattern.test(text) ? 1 : 0
  if (positive > negative)
    return 1
  if (negative > positive)
    return -1
  return 0
}

export function deriveMemoryContradictionSignal(input: {
  current: AlicizationEpisodicEventRecord
  strongerMatches: AlicizationEpisodicEventRecord[]
}) {
  const currentAnchor = `${input.current.threadAnchor ?? ''} ${input.current.whereSummary ?? ''}`.trim().toLowerCase()
  const currentShift = eventShiftDirection(input.current)
  const currentPolarity = eventMemoryPolarity(input.current)
  const conflictingIds: string[] = []
  let penalty = 0

  for (const candidate of input.strongerMatches) {
    const candidateAnchor = `${candidate.threadAnchor ?? ''} ${candidate.whereSummary ?? ''}`.trim().toLowerCase()
    const anchorOverlap = Boolean(
      currentAnchor
      && candidateAnchor
      && (
        currentAnchor === candidateAnchor
        || currentAnchor.includes(candidateAnchor)
        || candidateAnchor.includes(currentAnchor)
      ),
    )
    const sharedThread = Boolean(
      input.current.threadAnchor
      && candidate.threadAnchor
      && input.current.threadAnchor === candidate.threadAnchor,
    )
    const candidateShift = eventShiftDirection(candidate)
    const oppositeShift = Math.abs(currentShift) >= 0.04
      && Math.abs(candidateShift) >= 0.04
      && currentShift * candidateShift < 0
    const candidatePolarity = eventMemoryPolarity(candidate)
    const oppositePolarity = currentPolarity !== 0 && candidatePolarity !== 0 && currentPolarity !== candidatePolarity

    if (!(anchorOverlap || sharedThread))
      continue
    if (!(oppositeShift || oppositePolarity))
      continue

    conflictingIds.push(candidate.id)
    penalty += oppositeShift ? 0.06 : 0.04
  }

  return {
    conflictingIds,
    penalty: clamp01(penalty),
    unresolved: conflictingIds.length > 0,
    reason: conflictingIds.length > 0
      ? 'Conflicting remembered variants exist for the same thread, so keep this recall approximate rather than certain.'
      : '',
  }
}

export function computeMemoryRecencyWeight(timestamp: number, now: number, halfLifeDays = 21) {
  const ageDays = Math.max(0, (now - timestamp) / dayMs)
  return Math.exp(-ageDays / halfLifeDays)
}
