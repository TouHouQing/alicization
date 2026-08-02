import type { AlicizationMemoryRecollectionIntentLite } from './memory-episodic-retrieval'

import { extractOrganicRecallTerms, normalizeOrganicRecallText } from './runtime-organic-recall'

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

function scoreAgendaTimeScope(input: {
  ageDays: number
  recollectionIntent?: AlicizationMemoryRecollectionIntentLite | null
}) {
  const scopes = input.recollectionIntent?.recollectionAgenda?.candidateTimeScopes ?? []
  if (scopes.length === 0)
    return 0

  const matchScope = (scope: typeof scopes[number]['scope']) => {
    switch (scope) {
      case 'recent':
        return input.ageDays <= 1 ? 1 : input.ageDays <= 3 ? 0.56 : 0.08
      case 'recent-or-mid':
        return input.ageDays <= 14 ? 1 : input.ageDays <= 30 ? 0.62 : 0.14
      case 'cross-session':
        return input.ageDays >= 2 ? Math.min(1, 0.42 + input.ageDays / 21) : 0.1
      case 'experience-matched':
        return input.ageDays >= 1 ? Math.min(1, 0.36 + input.ageDays / 14) : 0.22
      case 'distant':
        return input.ageDays >= 14 ? Math.min(1, 0.34 + input.ageDays / 45) : 0.04
      default:
        return 0
    }
  }

  return Math.max(...scopes.map(scope => clamp01(scope.weight) * matchScope(scope.scope)))
}

function scoreAgendaProcedureLines(input: {
  haystack: string
  recollectionIntent?: AlicizationMemoryRecollectionIntentLite | null
}) {
  const lines = input.recollectionIntent?.recollectionAgenda?.candidateProcedureLines ?? []
  if (lines.length === 0)
    return 0
  const haystack = normalizeOrganicRecallText(input.haystack).slice(0, 600).toLowerCase()
  if (!haystack)
    return 0

  let overlap = 0
  for (const line of lines) {
    const normalized = normalizeOrganicRecallText(line).slice(0, 120).toLowerCase()
    if (!normalized)
      continue
    if (haystack.includes(normalized))
      overlap += normalized.length >= 8 ? 1 : 0.5
  }
  return clamp01(lines.length === 0 ? 0 : overlap / lines.length)
}

export interface AlicizationConversationTurnRecallRow {
  turnId: string | null
  sessionId: string
  userText: string | null
  assistantText: string | null
  structuredJson?: string | null
  createdAt: number
}

export function rankAlicizationConversationTurnsForRecall(input: {
  rows: AlicizationConversationTurnRecallRow[]
  query: string
  limit: number
  nowTs: number
  recollectionIntent?: AlicizationMemoryRecollectionIntentLite | null
}) {
  const query = normalizeOrganicRecallText(input.query).slice(0, 240)
  if (!query)
    return []

  const terms = extractOrganicRecallTerms(query)
  const recollectionIntent = input.recollectionIntent ?? null
  const retrospective = recollectionIntent?.temporalFocus === 'cross-session'
    || recollectionIntent?.mode === 'conversation-history'
    || recollectionIntent?.mode === 'relationship-history'
    || recollectionIntent?.mode === 'autobiographical-history'
  const ranked = input.rows
    .map((row) => {
      const userText = normalizeOrganicRecallText(row.userText ?? '').slice(0, 320)
      const assistantText = normalizeOrganicRecallText(row.assistantText ?? '').slice(0, 320)
      const combined = `${userText} ${assistantText}`.trim()
      if (!combined)
        return null
      const combinedLower = combined.toLowerCase()
      let lexicalScore = 0
      for (const term of terms) {
        const normalizedTerm = normalizeOrganicRecallText(term).slice(0, 120).toLowerCase()
        if (!normalizedTerm)
          continue
        if (combinedLower.includes(normalizedTerm))
          lexicalScore += normalizedTerm.length >= 6 ? 2.5 : 1
      }
      let intentScore = 0
      let exactHintMatches = 0
      for (const hint of recollectionIntent?.queryHints ?? []) {
        const normalizedHint = normalizeOrganicRecallText(hint).slice(0, 120).toLowerCase()
        if (!normalizedHint)
          continue
        if (combinedLower.includes(normalizedHint)) {
          intentScore += normalizedHint.length >= 10 ? 1.8 : 0.8
          exactHintMatches += 1
        }
      }
      const ageHours = Math.max(0, (input.nowTs - row.createdAt) / (60 * 60 * 1000))
      const ageDays = ageHours / 24
      const recencyScore = Math.exp(-ageHours / (24 * 7))
      const oldMemoryBoost = retrospective && ageHours >= 18 ? 0.28 : 0
      const antiRecentPenalty = retrospective && ageHours < 6 ? 0.2 : 0
      const experienceMatchedBoost = recollectionIntent?.temporalFocus === 'experience-matched' && ageHours >= 12 ? 0.16 : 0
      const agendaTimeBoost = scoreAgendaTimeScope({
        ageDays,
        recollectionIntent,
      }) * 0.18
      const agendaProcedureBoost = scoreAgendaProcedureLines({
        haystack: combined,
        recollectionIntent,
      }) * (0.08 + clamp01(recollectionIntent?.recollectionAgenda?.goalSimilarity ?? 0) * 0.12)
      const relationshipBoost = clamp01(recollectionIntent?.recollectionAgenda?.relationshipNeed ?? 0) >= 0.32
        && /relationship|bond|tone|repair|回应|关系|语气|修复/u.test(combined)
        ? clamp01(recollectionIntent?.recollectionAgenda?.relationshipNeed ?? 0) * 0.08
        : 0
      const retrospectiveContinuationBoost = retrospective
        && /然后|又聊了|继续|后面|接着|还没彻底收口|follow-up|continued|later that day|next turn|unfinished|payoff/u.test(combined)
        ? 0.14
        : 0
      const retrospectiveQueryLineBoost = retrospective && exactHintMatches > 0
        ? Math.min(0.12, exactHintMatches * 0.06)
        : 0
      const score = lexicalScore * 0.38
        + intentScore * 0.22
        + recencyScore * 0.12
        + oldMemoryBoost
        + experienceMatchedBoost
        + agendaTimeBoost
        + agendaProcedureBoost
        + relationshipBoost
        + retrospectiveContinuationBoost
        + retrospectiveQueryLineBoost
        - antiRecentPenalty
      return {
        turnId: row.turnId,
        sessionId: row.sessionId,
        userText,
        assistantText,
        createdAt: row.createdAt,
        score,
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .filter(row => row.score > (retrospective ? -0.01 : 0.08))
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return right.createdAt - left.createdAt
    })

  const results: Array<{
    turnId: string | null
    sessionId: string
    userText: string
    assistantText: string
    createdAt: number
  }> = []
  const seenDayKeys = new Set<string>()
  for (const row of ranked) {
    const dayKey = new Date(row.createdAt).toISOString().slice(0, 10)
    if (retrospective && seenDayKeys.has(dayKey))
      continue
    seenDayKeys.add(dayKey)
    results.push({
      turnId: row.turnId,
      sessionId: row.sessionId,
      userText: row.userText,
      assistantText: row.assistantText,
      createdAt: row.createdAt,
    })
    if (results.length >= input.limit)
      break
  }
  return results
}
