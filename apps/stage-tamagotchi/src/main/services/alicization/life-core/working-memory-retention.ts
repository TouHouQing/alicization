import type { WorkingMemoryEpisodelet, WorkingMemoryTurn } from './working-memory'

import { Buffer } from 'node:buffer'

// Pi's budgeted backward selection and DSH's balanced boundaries inform this
// desktop policy. Companionship also needs recent ordinary conversation.
export const workingMemoryRetention = {
  maxRawMessages: 24,
  maxRawBytes: 14_000,
  minRecentExchanges: 2,
  maxStoredTurnChars: 8_000,
  maxTimelineItems: 24,
  maxEvidenceItems: 24,
} as const

export function workingMemoryExchangeId(turn: Pick<WorkingMemoryTurn, 'turnId'>) {
  return turn.turnId.replace(/:(?:user|alice)$/u, '')
}

export function findWorkingMemoryCut(turns: WorkingMemoryTurn[], options: { maxRawTurns?: number, maxRawBytes?: number } = {}) {
  const maximum = Math.max(2, Math.floor(options.maxRawTurns ?? workingMemoryRetention.maxRawMessages))
  const byteBudget = Math.max(256, options.maxRawBytes ?? workingMemoryRetention.maxRawBytes)
  let start = turns.length
  let bytes = 0
  let exchanges = 0
  while (start > 0) {
    let candidate = start - 1
    const id = workingMemoryExchangeId(turns[candidate]!)
    while (candidate > 0 && workingMemoryExchangeId(turns[candidate - 1]!) === id)
      candidate--
    const groupBytes = turns.slice(candidate, start).reduce((sum, turn) => sum + Buffer.byteLength(turn.text, 'utf8') + 64, 0)
    const protectedTail = exchanges < workingMemoryRetention.minRecentExchanges
    if (!protectedTail && (turns.length - candidate > maximum || bytes + groupBytes > byteBudget))
      break
    exchanges++
    bytes += groupBytes
    start = candidate
  }
  return start
}

const important = /不要|不是|不再|改成|纠正|记住|约定|答应|喜欢|讨厌|害怕|难过|开心|陪|生日|纪念|明天|下周|未完成|待办|失败|成功|完成|不要忘|remember|prefer|promise|instead|not\b|never|failed|pending/iu

export function workingMemoryMeaningScore(text: string) {
  if (/记住|纠正|不要再|约定|答应|承诺|remember|correction|promise/iu.test(text))
    return 0.98
  if (/生日|纪念|第一次|陪我|陪你|我们一起|关系|relationship|together|anniversary/iu.test(text))
    return 0.94
  if (/难过|害怕|开心|担心|孤独|感动|喜欢|讨厌|sad|afraid|lonely|happy|prefer/iu.test(text))
    return 0.88
  return 0.45
}

/** Extract complete source sentences, retaining late corrections and feelings. */
export function selectWorkingMemorySentences(text: string, maximum = 700, query = '') {
  const normalized = text.trim().replace(/\s+/gu, ' ')
  if (normalized.length <= maximum)
    return normalized
  const queryTerms = query.toLocaleLowerCase().match(/[\p{Letter}\p{Number}_-]{2,}/gu) ?? []
  const sentences = normalized.match(/.*?(?:[。！？!?；;]|\.(?=\s|$)|$)/gu)?.filter(Boolean) ?? [normalized]
  const ranked = sentences.map((sentence, index) => ({
    sentence: sentence.trim(),
    index,
    score: (important.test(sentence) ? 4 : 0)
      + (index === 0 ? 1 : 0)
      + (index === sentences.length - 1 ? 2 : 0)
      + queryTerms.filter(term => sentence.toLocaleLowerCase().includes(term)).length * 3,
  })).sort((left, right) => right.score - left.score || right.index - left.index)
  const selected: typeof ranked = []
  const selectedTexts = new Set<string>()
  let used = 0
  for (const item of ranked) {
    if (!item.sentence || selectedTexts.has(item.sentence))
      continue
    if (used + item.sentence.length + (selected.length ? 3 : 0) > maximum)
      continue
    selected.push(item)
    selectedTexts.add(item.sentence)
    used += item.sentence.length + (selected.length > 1 ? 3 : 0)
  }
  if (!selected.length) {
    // A single enormous sentence is an excerpt, never a fabricated summary.
    const tail = Math.floor((maximum - 3) / 2)
    return `${normalized.slice(0, maximum - tail - 3)} … ${normalized.slice(-tail)}`
  }
  return selected.sort((left, right) => left.index - right.index).map(item => item.sentence).join(' … ')
}

export function selectWorkingMemoryTimeline<T extends Pick<WorkingMemoryEpisodelet, 'importance' | 'createdAt' | 'thread' | 'corrections' | 'commitments'>>(snapshot: { compressedTimeline: T[], currentThread?: { title: string } | null, activeTask?: { summary: string } | null }, limit = 6) {
  const items = snapshot.compressedTimeline
  if (items.length <= limit)
    return items
  const query = `${snapshot.currentThread?.title ?? ''} ${snapshot.activeTask?.summary ?? ''}`.trim().toLocaleLowerCase()
  // Reserve the newest half; use the remaining slots for continuity rather
  // than letting small talk push every earlier important event out of view.
  const recent = items.slice(-Math.ceil(limit / 2))
  const older = items.slice(0, -recent.length).map(item => ({
    item,
    score: item.importance + (item.corrections.length ? 0.4 : 0)
      + (item.commitments.length ? 0.3 : 0)
      + (query && item.thread && query.includes(item.thread.toLocaleLowerCase()) ? 0.4 : 0),
  })).sort((left, right) => right.score - left.score || right.item.createdAt - left.item.createdAt)
  const selected = new Set([...older.slice(0, limit - recent.length).map(entry => entry.item), ...recent])
  return items.filter(item => selected.has(item))
}
