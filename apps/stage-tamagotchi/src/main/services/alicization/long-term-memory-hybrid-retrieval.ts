import type {
  LongTermMemoryEvidenceCandidate,
  LongTermMemoryQueryPlan,
  LongTermMemoryRecallIntent,
  LongTermMemoryTemporalFocus,
  RankedLongTermMemoryEvidence,
} from './long-term-memory-recall'
import type {
  LongTermMemoryChannelResults,
  LongTermMemoryRetrievalChannel,
} from './long-term-memory-rrf'

import { longTermMemoryEvidenceVersion } from './long-term-memory-recall'
import { reciprocalRankFusion } from './long-term-memory-rrf'

const dayMs = 24 * 60 * 60 * 1000

function normalizeText(raw: unknown, maxChars = 360) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
}

function normalizeComparableText(raw: unknown) {
  return normalizeText(raw, 260)
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
}

function clamp01(raw: unknown) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, value))
}

function uniqueTexts(values: Array<string | null | undefined>, maxItems = 10, maxChars = 120) {
  const result: string[] = []
  for (const value of values) {
    const normalized = normalizeText(value, maxChars)
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

function tokenize(raw: string) {
  return new Set(
    raw
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
      .split(/\s+/u)
      .map(token => token.trim())
      .filter(token => token.length >= 2),
  )
}

function candidateSearchText(candidate: LongTermMemoryEvidenceCandidate) {
  return uniqueTexts([
    candidate.summary,
    candidate.threadAnchor ?? '',
    ...(candidate.cues ?? []),
    ...(candidate.entities ?? []),
  ], 24, 220).join(' ')
}

function scoreTextOverlap(queryTexts: string[], candidate: LongTermMemoryEvidenceCandidate) {
  const haystackRaw = candidateSearchText(candidate)
  const haystackComparable = normalizeComparableText(haystackRaw)
  const haystackTokens = tokenize(haystackRaw)
  if (!haystackComparable && haystackTokens.size === 0)
    return { score: 0, matches: [] }

  let score = 0
  const matches: string[] = []
  for (const queryText of queryTexts) {
    const normalizedQuery = normalizeComparableText(queryText)
    if (normalizedQuery && haystackComparable.includes(normalizedQuery)) {
      score += 0.35
      matches.push(queryText)
    }

    const queryTokens = tokenize(queryText)
    if (queryTokens.size === 0)
      continue
    let overlap = 0
    for (const token of queryTokens) {
      if (haystackTokens.has(token)) {
        overlap += 1
        matches.push(token)
      }
    }
    score += overlap / Math.max(4, queryTokens.size)
  }

  return {
    score: Math.min(1, score),
    matches: uniqueTexts(matches, 8, 80),
  }
}

function scoreTemporalFocus(input: {
  candidate: LongTermMemoryEvidenceCandidate
  temporalFocus: LongTermMemoryTemporalFocus
  now: number
}) {
  const timestamp = input.candidate.occurredAt ?? input.candidate.updatedAt ?? null
  if (!timestamp)
    return 0
  const ageDays = Math.max(0, (input.now - timestamp) / dayMs)
  switch (input.temporalFocus) {
    case 'current':
      return ageDays <= 1 ? 0.12 : 0
    case 'recent':
      return ageDays <= 7 ? 0.14 : ageDays <= 30 ? 0.05 : 0
    case 'recent-or-mid':
      return ageDays <= 45 ? 0.12 : 0.03
    case 'cross-session':
      return ageDays >= 1 ? 0.08 : 0.02
    case 'distant':
      return ageDays >= 30 ? 0.1 : 0
    default:
      return 0
  }
}

function scoreThreadFit(input: {
  plan: LongTermMemoryQueryPlan
  candidate: LongTermMemoryEvidenceCandidate
}) {
  const hints = uniqueTexts(input.plan.threadHints, 6, 160)
  const anchors = uniqueTexts([
    input.candidate.threadAnchor ?? '',
    input.candidate.threadId ?? '',
  ], 4, 160)
  if (hints.length === 0 || anchors.length === 0)
    return { boost: 0, penalty: 0, matches: [] as string[] }

  const matches: string[] = []
  for (const hint of hints) {
    const normalizedHint = normalizeComparableText(hint)
    if (!normalizedHint)
      continue
    for (const anchor of anchors) {
      const normalizedAnchor = normalizeComparableText(anchor)
      if (!normalizedAnchor)
        continue
      if (normalizedAnchor.includes(normalizedHint) || normalizedHint.includes(normalizedAnchor))
        matches.push(anchor)
    }
  }

  if (matches.length > 0)
    return { boost: 0.24, penalty: 0, matches: uniqueTexts(matches, 4, 120) }

  const shouldPenalizeThreadMismatch = input.plan.targetKinds.includes('episode')
    || input.plan.targetKinds.includes('consolidation')
  return {
    boost: 0,
    penalty: shouldPenalizeThreadMismatch ? 0.24 : 0.08,
    matches: [] as string[],
  }
}

function inferEvidenceProvenance(candidate: LongTermMemoryEvidenceCandidate): RankedLongTermMemoryEvidence['provenance'] {
  if (candidate.provenance)
    return candidate.provenance
  if (candidate.origin === 'user-turn' || candidate.source === 'user-turn' || candidate.source === 'episodic_events')
    return 'observed'
  if (candidate.source === 'memory_reflections' || candidate.source === 'memory_consolidations')
    return 'inferred'
  return 'remembered'
}

function rankPositiveScores(input: {
  channel: LongTermMemoryRetrievalChannel
  scores: Array<{ candidateId: string, score: number, reason: string }>
}): LongTermMemoryChannelResults {
  return {
    channel: input.channel,
    results: input.scores
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score || left.candidateId.localeCompare(right.candidateId))
      .map((item, index) => ({
        candidateId: item.candidateId,
        rank: index + 1,
        reason: item.reason,
        score: item.score,
      })),
  }
}

export function buildLongTermMemoryHybridChannels(input: {
  intent: LongTermMemoryRecallIntent
  plan: LongTermMemoryQueryPlan
  candidates: LongTermMemoryEvidenceCandidate[]
  now: number
  semanticScores?: Record<string, number>
}): LongTermMemoryChannelResults[] {
  const queryTexts = uniqueTexts([
    input.plan.normalizedQuery,
    ...input.plan.keywordQueries,
    ...input.plan.phraseQueries,
    ...input.plan.charGramQueries,
    ...input.plan.semanticQueries,
    ...input.plan.episodicQueries,
    ...input.plan.entityHints,
    ...input.plan.procedureHints,
    ...input.plan.threadHints,
  ], 28, 180)

  const lexicalScores = input.candidates.map(candidate => ({
    candidateId: candidate.id,
    score: scoreTextOverlap(queryTexts, candidate).score,
    reason: 'query-overlap',
  }))
  const structuredScores = input.candidates.map((candidate) => {
    const kindFit = input.plan.targetKinds.includes(candidate.kind) ? 0.4 : 0
    const threadFit = scoreThreadFit({ plan: input.plan, candidate })
    const sensitivityFit = candidate.sensitivity === 'secret' ? -0.25 : candidate.sensitivity === 'private' ? -0.08 : 0
    return {
      candidateId: candidate.id,
      score: Math.max(0, kindFit + threadFit.boost - threadFit.penalty + sensitivityFit),
      reason: threadFit.boost > 0 ? 'thread-fit' : kindFit > 0 ? 'target-kind' : 'structured-fit',
    }
  })
  const semanticScores = Object.entries(input.semanticScores ?? {}).map(([candidateId, score]) => ({
    candidateId,
    score: clamp01(score),
    reason: 'semantic-score',
  }))
  const episodicScores = input.candidates.map(candidate => ({
    candidateId: candidate.id,
    score: (candidate.kind === 'episode' ? 0.45 : 0)
      + scoreTemporalFocus({
        candidate,
        temporalFocus: input.intent.temporalFocus,
        now: input.now,
      }),
    reason: 'episodic-temporal-fit',
  }))
  const consolidationScores = input.candidates.map(candidate => ({
    candidateId: candidate.id,
    score: candidate.kind === 'consolidation'
      ? 0.42 + clamp01(candidate.salience ?? 0.5) * 0.2
      : 0,
    reason: 'consolidation-fit',
  }))

  return [
    rankPositiveScores({ channel: 'lexical', scores: lexicalScores }),
    rankPositiveScores({ channel: 'structured', scores: structuredScores }),
    rankPositiveScores({ channel: 'semantic', scores: semanticScores }),
    rankPositiveScores({ channel: 'episodic', scores: episodicScores }),
    rankPositiveScores({ channel: 'consolidation', scores: consolidationScores }),
  ].filter(channel => channel.results.length > 0)
}

export function rankLongTermMemoryHybridEvidence(input: {
  intent: LongTermMemoryRecallIntent
  plan: LongTermMemoryQueryPlan
  candidates: LongTermMemoryEvidenceCandidate[]
  now: number
  limit?: number
  semanticScores?: Record<string, number>
}): RankedLongTermMemoryEvidence[] {
  const channels = buildLongTermMemoryHybridChannels(input)
  const fused = reciprocalRankFusion({ channels, k: 60 })
  const fusedById = new Map(fused.map(item => [item.candidateId, item]))
  const queryTexts = uniqueTexts([
    input.plan.normalizedQuery,
    ...input.plan.keywordQueries,
    ...input.plan.phraseQueries,
    ...input.plan.charGramQueries,
    ...input.plan.semanticQueries,
    ...input.plan.episodicQueries,
    ...input.plan.entityHints,
    ...input.plan.procedureHints,
    ...input.plan.threadHints,
  ], 28, 180)
  const limit = Math.max(1, Math.min(8, Math.floor(input.limit ?? 5)))

  return input.candidates
    .map((candidate) => {
      const fusedRank = fusedById.get(candidate.id)
      if (!fusedRank)
        return null

      const overlap = scoreTextOverlap(queryTexts, candidate)
      const threadFit = scoreThreadFit({ plan: input.plan, candidate })
      const temporalBoost = scoreTemporalFocus({
        candidate,
        temporalFocus: input.intent.temporalFocus,
        now: input.now,
      })
      const salience = clamp01(candidate.salience ?? 0.5)
      const confidence = clamp01(candidate.confidence)
      const sensitivityPenalty = candidate.sensitivity === 'secret' ? 0.28 : candidate.sensitivity === 'private' ? 0.12 : 0
      const score = clamp01(
        fusedRank.score * 7
        + overlap.score * 0.18
        + confidence * 0.22
        + salience * 0.14
        + threadFit.boost
        + temporalBoost
        - threadFit.penalty
        - sensitivityPenalty,
      )
      const rankReasons = uniqueTexts([
        ...fusedRank.channelReasons.map(reason => `rrf:${reason}`),
        salience >= 0.82 ? 'high-salience' : '',
        confidence >= 0.72 ? 'high-confidence' : '',
        temporalBoost > 0 ? 'temporal-fit' : '',
        threadFit.penalty > 0 ? 'wrong-thread-penalty' : '',
        sensitivityPenalty > 0 ? 'sensitivity-limited' : '',
      ], 10, 120)

      return {
        candidate,
        score,
        queryMatches: uniqueTexts([
          ...overlap.matches,
          ...threadFit.matches,
        ], 8, 80),
        rankReasons,
        scope: candidate.scope ?? {
          userId: 'unknown',
          cardId: null,
        },
        provenance: inferEvidenceProvenance(candidate),
        evidenceVersion: candidate.evidenceVersion ?? candidate.version ?? longTermMemoryEvidenceVersion,
        version: candidate.version ?? candidate.evidenceVersion ?? longTermMemoryEvidenceVersion,
      }
    })
    .filter((item): item is RankedLongTermMemoryEvidence => item !== null && item.score >= 0.18)
    .sort((left, right) => right.score - left.score || right.candidate.confidence - left.candidate.confidence)
    .slice(0, limit)
}
