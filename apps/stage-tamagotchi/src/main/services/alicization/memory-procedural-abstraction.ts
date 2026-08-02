import type { AlicizationEpisodicEventRecord } from '../../../shared/eventa'
import type { OrganicMemoryPromptContext } from './runtime-soul'

type AlicizationMemoryRecollectionIntentSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionIntent']>

export interface AlicizationProceduralMemoryAbstraction {
  id: string
  label: string
  approach: string
  pitfalls: string[]
  situation?: string | null
  steps?: string[]
  failurePoints?: string[]
  repairMoves?: string[]
  result?: string | null
  traceSummary?: string | null
  lastExperiencedAt?: number | null
  confidence: number
  cues: string[]
}

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

function uniqueList(values: Array<string | null | undefined>, maxItems = 6) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value)
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

const pitfallCuePattern = /avoid|verify|boundary|pressure|intrusive|misread|don't|不要|别|先确认|核实|打扰|误读|边界|压力/u
const proceduralTags = new Set([
  'execution',
  'procedure',
  'procedure-learning',
  'procedural',
  'workflow',
  '执行',
  '流程',
  '程序记忆',
])

function isTypedProceduralEpisode(event: AlicizationEpisodicEventRecord) {
  if (event.sourceKind === 'execution-proposal' || event.sourceKind === 'execution-result')
    return true
  if (event.derivedFrom.some(reference => reference.kind === 'execution-event' || reference.kind === 'task-thread'))
    return true
  return event.tags.some(tag => proceduralTags.has(tag.trim().toLowerCase()))
}

export function buildProceduralMemoryAbstractions(input: {
  intent: AlicizationMemoryRecollectionIntentSnapshot | null | undefined
  episodes?: AlicizationEpisodicEventRecord[] | null
}): AlicizationProceduralMemoryAbstraction[] {
  const intent = input.intent ?? null
  const episodes = (input.episodes ?? []).filter(isTypedProceduralEpisode)
  if (!intent || !intent.searchProceduralExperience || episodes.length === 0)
    return []

  const buckets = new Map<string, {
    score: number
    approachs: string[]
    pitfalls: string[]
    cues: string[]
  }>()

  for (const event of episodes) {
    const key = sanitizeText(event.threadAnchor || event.whereSummary || event.sourceSummary || event.sourceKind, 80) || event.sourceKind
    const bucket = buckets.get(key) ?? {
      score: 0,
      approachs: [],
      pitfalls: [],
      cues: [],
    }
    bucket.score += event.salience * 0.58 + event.confidence * 0.26 + (event.recallCount > 0 ? 0.08 : 0)
    bucket.approachs.push(...uniqueList([
      event.lesson,
      event.whatChanged,
      event.relationshipMeaning,
      event.whatHappened,
    ], 3))
    bucket.pitfalls.push(...uniqueList([
      pitfallCuePattern.test(event.lesson ?? '') ? event.lesson : null,
      pitfallCuePattern.test(event.relationshipMeaning ?? '') ? event.relationshipMeaning : null,
      pitfallCuePattern.test(event.whatChanged ?? '') ? event.whatChanged : null,
    ], 3))
    bucket.cues.push(...uniqueList([
      event.threadAnchor,
      event.whereSummary,
      ...event.tags,
      ...event.emotionTags,
    ], 5))
    buckets.set(key, bucket)
  }

  return [...buckets.entries()]
    .map(([id, bucket]) => ({
      id,
      label: id,
      approach: sanitizeText(bucket.approachs[0] || bucket.cues[0] || id, 220),
      pitfalls: uniqueList(bucket.pitfalls, 3),
      confidence: clamp01(Math.min(1, bucket.score / Math.max(1, bucket.approachs.length))),
      cues: uniqueList(bucket.cues, 5),
    }) satisfies AlicizationProceduralMemoryAbstraction)
    .sort((left, right) => {
      if (left.confidence !== right.confidence)
        return right.confidence - left.confidence
      return right.cues.length - left.cues.length
    })
    .slice(0, 4)
}
