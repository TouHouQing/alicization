// TypeScript adaptation of NousResearch/hermes-agent (MIT), commit
// 013bde4786db7afbd72c44a1d15ee78876c9cb96, tools/tool_search_catalog.py:
// _entry_search_text, _gate_token, _required_term_coverage and search_catalog.
// Changes: Unicode/Han tokenization, deterministic ties, no stemming dependency,
// and bounded inputs. Schemas are described separately by the local life owner.
export interface HermesCatalogEntry {
  name: string
  description: string
  parameters: unknown
}

function tokens(text: string) {
  return (text.slice(0, 8192).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).flatMap((word) => {
    const han = [...word]
    return /^\p{Script=Han}{3,}$/u.test(word) ? [word, ...han.slice(1).map((_, i) => han.slice(i, i + 2).join(''))] : [word]
  })
}

export function searchHermesCatalog<T extends HermesCatalogEntry>(entries: T[], query: string, limit = 5) {
  const corpus = entries.slice(0, 1000).map((entry) => {
    const schema = entry.parameters as { properties?: Record<string, unknown> } | null
    // Index names and parameter roles, never arbitrary schema bodies or old values.
    const text = `${entry.name.replace(/^mcp__/u, '').replace(/[_.:-]/gu, ' ')} ${entry.description} ${Object.keys(schema?.properties ?? {}).join(' ')}`
    return { entry, terms: tokens(text) }
  })
  const queryTerms = [...new Set(tokens(query))].slice(0, 32)
  if (!queryTerms.length || limit <= 0)
    return []
  const frequencies = new Map<string, number>()
  for (const doc of corpus) {
    for (const term of new Set(doc.terms))
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1)
  }
  const idf = (term: string) => Math.log(1 + (corpus.length - (frequencies.get(term) ?? 0) + 0.5) / ((frequencies.get(term) ?? 0) + 0.5))
  const gate = queryTerms.reduce((a, b) => idf(a) >= idf(b) ? a : b)
  const answerable = queryTerms.filter(term => frequencies.has(term))
  const required = answerable.length < 4 ? 1 : Math.ceil(answerable.length / 2)
  const average = corpus.reduce((sum, doc) => sum + doc.terms.length, 0) / Math.max(1, corpus.length)
  return corpus.flatMap(({ entry, terms }) => {
    const exact = entry.name.toLowerCase() === query.trim().toLowerCase()
    if (!exact && (!terms.includes(gate) || answerable.filter(term => terms.includes(term)).length < required))
      return []
    const score = exact
      ? Number.POSITIVE_INFINITY
      : queryTerms.reduce((sum, term) => {
          const tf = terms.filter(item => item === term).length
          return sum + idf(term) * tf * 2.5 / (tf + 1.5 * (0.25 + 0.75 * terms.length / Math.max(average, 1)))
        }, 0)
    return [{ entry, score }]
  }).sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name, 'en')).slice(0, Math.min(10, limit)).map(result => result.entry)
}
