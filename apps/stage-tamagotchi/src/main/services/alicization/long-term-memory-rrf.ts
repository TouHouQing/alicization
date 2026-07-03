export type LongTermMemoryRetrievalChannel =
  | 'lexical'
  | 'structured'
  | 'semantic'
  | 'episodic'
  | 'consolidation'

export interface LongTermMemoryChannelRank {
  candidateId: string
  rank: number
  reason: string
  score?: number
}

export interface LongTermMemoryChannelResults {
  channel: LongTermMemoryRetrievalChannel
  results: LongTermMemoryChannelRank[]
}

export interface FusedLongTermMemoryRank {
  candidateId: string
  score: number
  channelReasons: string[]
  channelScores: Partial<Record<LongTermMemoryRetrievalChannel, number>>
}

function normalizeRank(raw: unknown) {
  const rank = Math.floor(Number(raw))
  return Number.isFinite(rank) && rank > 0 ? rank : 1
}

export function reciprocalRankFusion(input: {
  channels: LongTermMemoryChannelResults[]
  k?: number
}): FusedLongTermMemoryRank[] {
  const k = Math.max(1, Math.floor(Number(input.k ?? 60)))
  const fused = new Map<string, FusedLongTermMemoryRank>()

  for (const channel of input.channels) {
    for (const result of channel.results) {
      const candidateId = String(result.candidateId ?? '').trim()
      if (!candidateId)
        continue

      const rank = normalizeRank(result.rank)
      const score = 1 / (k + rank)
      const current = fused.get(candidateId) ?? {
        candidateId,
        score: 0,
        channelReasons: [],
        channelScores: {},
      }

      current.score += score
      current.channelScores[channel.channel] = score
      if (result.reason)
        current.channelReasons.push(`${channel.channel}:${result.reason}`)
      fused.set(candidateId, current)
    }
  }

  return [...fused.values()]
    .map(item => ({
      ...item,
      channelReasons: [...new Set(item.channelReasons)],
    }))
    .sort((left, right) => right.score - left.score || left.candidateId.localeCompare(right.candidateId))
}
