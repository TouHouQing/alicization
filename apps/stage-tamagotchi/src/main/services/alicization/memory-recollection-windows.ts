import type { AlicizationEpisodicEventRecord, AlicizationMemoryProvenance } from '../../../shared/eventa'
import type { OrganicMemoryPromptContext } from './runtime-soul'

import { pickDominantAlicizationMemoryProvenance } from '@proj-alicization/stage-shared'

type AlicizationMemoryRecollectionIntentSnapshot = NonNullable<OrganicMemoryPromptContext['recollectionIntent']>

export interface AlicizationMemoryRecollectionWindow {
  id: string
  label: string
  summary: string
  startedAt: number
  endedAt: number
  confidence: number
  dominantProvenance: AlicizationMemoryProvenance
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

function buildDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10)
}

const pickDominantProvenance = pickDominantAlicizationMemoryProvenance

export function buildMemoryRecollectionWindows(input: {
  intent: AlicizationMemoryRecollectionIntentSnapshot | null | undefined
  episodes?: AlicizationEpisodicEventRecord[] | null
  conversationHistory?: NonNullable<OrganicMemoryPromptContext['recalledConversationHistory']> | null
}): AlicizationMemoryRecollectionWindow[] {
  const intent = input.intent ?? null
  const episodes = input.episodes ?? []
  const conversations = input.conversationHistory ?? []
  if (!intent || (episodes.length === 0 && conversations.length === 0))
    return []

  const buckets = new Map<string, {
    startedAt: number
    endedAt: number
    labelHint: string
    episodeCount: number
    conversationCount: number
    score: number
    provenances: AlicizationMemoryProvenance[]
    cues: string[]
  }>()

  for (const event of episodes) {
    const keyBase = intent.temporalFocus === 'experience-matched'
      ? sanitizeText(event.threadAnchor || event.whereSummary || buildDayKey(event.occurredAt), 80) || buildDayKey(event.occurredAt)
      : buildDayKey(event.occurredAt)
    const bucket = buckets.get(keyBase) ?? {
      startedAt: event.occurredAt,
      endedAt: event.occurredAt,
      labelHint: sanitizeText(event.threadAnchor || event.whereSummary || '', 120),
      episodeCount: 0,
      conversationCount: 0,
      score: 0,
      provenances: [],
      cues: [],
    }
    bucket.startedAt = Math.min(bucket.startedAt, event.occurredAt)
    bucket.endedAt = Math.max(bucket.endedAt, event.occurredAt)
    bucket.episodeCount += 1
    bucket.score += event.salience * 0.6 + event.confidence * 0.25
    if (intent.searchProceduralExperience && (event.sourceKind === 'execution-proposal' || event.sourceKind === 'execution-result'))
      bucket.score += 0.18
    if (intent.mode === 'relationship-history' && event.relationshipMeaning)
      bucket.score += 0.12
    bucket.provenances.push(event.latestReconsolidation?.provenance ?? event.provenance)
    bucket.cues.push(...uniqueList([
      event.threadAnchor,
      event.whereSummary,
      event.whatHappened,
      event.relationshipMeaning,
      event.lesson,
    ], 4))
    if (!bucket.labelHint)
      bucket.labelHint = sanitizeText(event.threadAnchor || event.whereSummary || event.whatHappened, 120)
    buckets.set(keyBase, bucket)
  }

  for (const turn of conversations) {
    const keyBase = intent.temporalFocus === 'experience-matched'
      ? sanitizeText(turn.sessionId, 80) || buildDayKey(turn.createdAt)
      : buildDayKey(turn.createdAt)
    const bucket = buckets.get(keyBase) ?? {
      startedAt: turn.createdAt,
      endedAt: turn.createdAt,
      labelHint: '',
      episodeCount: 0,
      conversationCount: 0,
      score: 0,
      provenances: [],
      cues: [],
    }
    bucket.startedAt = Math.min(bucket.startedAt, turn.createdAt)
    bucket.endedAt = Math.max(bucket.endedAt, turn.createdAt)
    bucket.conversationCount += 1
    bucket.score += 0.16
    if (intent.mode === 'conversation-history')
      bucket.score += 0.1
    bucket.provenances.push('reconstructed')
    bucket.cues.push(...uniqueList([
      turn.userText,
      turn.assistantText,
    ], 2))
    if (!bucket.labelHint)
      bucket.labelHint = sanitizeText(turn.userText || turn.assistantText, 120)
    buckets.set(keyBase, bucket)
  }

  return [...buckets.entries()]
    .map(([id, bucket]) => {
      const labelBase = bucket.labelHint || buildDayKey(bucket.startedAt)
      return {
        id,
        label: sanitizeText(labelBase, 120),
        summary: sanitizeText(
          uniqueList([
            bucket.labelHint,
            bucket.cues[0],
            bucket.cues[1],
          ], 3).join(' | '),
          220,
        ),
        startedAt: bucket.startedAt,
        endedAt: bucket.endedAt,
        confidence: clamp01(Math.min(1, bucket.score / Math.max(1, bucket.episodeCount + bucket.conversationCount))),
        dominantProvenance: pickDominantProvenance(bucket.provenances),
        cues: uniqueList(bucket.cues, 5),
      } satisfies AlicizationMemoryRecollectionWindow
    })
    .sort((left, right) => {
      if (left.confidence !== right.confidence)
        return right.confidence - left.confidence
      return right.endedAt - left.endedAt
    })
    .slice(0, 4)
}
