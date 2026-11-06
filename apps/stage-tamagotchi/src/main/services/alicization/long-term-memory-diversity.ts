import type { RankedLongTermMemoryEvidence } from './long-term-memory-recall'

function terms(text: string) {
  const lower = text.toLocaleLowerCase()
  const result = new Set(lower.match(/[a-z\d_-]{2,}/gu) ?? [])
  for (const run of lower.match(/[\u4E00-\u9FFF]{2,}/gu) ?? []) {
    for (let index = 0; index + 2 <= run.length; index++)
      result.add(run.slice(index, index + 2))
  }
  return result
}

/** Diverse evidence keeps repeated paraphrases from crowding out life events. */
export function selectDiverseLongTermEvidence(ranked: RankedLongTermMemoryEvidence[], limit: number) {
  const pool = ranked.map(item => ({ item, terms: terms(item.candidate.summary) }))
  const chosen: typeof pool = []
  const similarity = (left: typeof pool[number], right: typeof pool[number]) => {
    if (!left.terms.size || !right.terms.size)
      return 0
    const shared = [...left.terms].filter(term => right.terms.has(term)).length
    return shared / (left.terms.size + right.terms.size - shared)
  }
  while (pool.length && chosen.length < limit) {
    const scored = pool.map((entry, index) => {
      const redundancy = Math.max(0, ...chosen.map(item => similarity(entry, item)))
      return { entry, index, score: entry.item.score - (redundancy >= 0.55 ? redundancy * 0.22 : 0), redundancy }
    }).sort((left, right) => right.score - left.score || left.index - right.index)
    const selected = scored[0]!
    pool.splice(selected.index, 1)
    // Repeated events and opposite/updated facts can look almost identical.
    // Diversify their ordering, never erase an event just for text similarity.
    if (selected.index > 0)
      selected.entry = { ...selected.entry, item: { ...selected.entry.item, rankReasons: [...selected.entry.item.rankReasons, 'diversity:complementary-evidence'] } }
    chosen.push(selected.entry)
  }
  return chosen.map(entry => entry.item)
}
