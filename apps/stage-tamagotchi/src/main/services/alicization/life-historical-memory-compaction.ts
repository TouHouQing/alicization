import { Buffer } from 'node:buffer'

type JsonRecord = Record<string, unknown>

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : null
}

// Only historical narrative text is interned. Current state, evidence, source
// identifiers, chronology and top-level corrections retain their original form.
function visitHistoricalText(memory: JsonRecord, replace: (value: string) => unknown) {
  for (const raw of memory.compressedTimeline as unknown[]) {
    const episode = record(raw)
    if (!episode)
      continue
    for (const key of ['summary', 'thread']) {
      if (typeof episode[key] === 'string')
        episode[key] = replace(episode[key])
    }
    for (const key of ['commitments', 'corrections']) {
      const values = episode[key]
      if (Array.isArray(values))
        episode[key] = values.map(value => typeof value === 'string' ? replace(value) : value)
    }
  }
  for (const raw of Array.isArray(memory.recentDialogue) ? memory.recentDialogue : []) {
    const turn = record(raw)
    if (turn && typeof turn.text === 'string')
      turn.text = replace(turn.text)
  }
}

export function compactLifeHistoricalMemory(content: string) {
  if (content.length > 256_000)
    return null
  let envelope: JsonRecord | null
  try {
    envelope = record(JSON.parse(content))
  }
  catch {
    return null
  }
  const data = record(envelope?.data)
  const memory = record(data?.workingMemory)
  if (envelope?.type !== 'alicization-turn-memory-context' || !data || memory?.owner !== 'working-memory' || memory.version !== 'working-memory-owner-context-v1' || !Array.isArray(memory.compressedTimeline) || data.historicalTextDictionary !== undefined)
    return null
  for (const raw of memory.compressedTimeline) {
    const episode = record(raw)
    if (!episode || ['summary', 'thread'].some(key => episode[key] != null && typeof episode[key] !== 'string') || ['commitments', 'corrections'].some(key => episode[key] != null && (!Array.isArray(episode[key]) || episode[key].some(value => typeof value !== 'string'))))
      return null
  }

  if (memory.recentDialogue !== undefined && (!Array.isArray(memory.recentDialogue) || memory.recentDialogue.some(raw => typeof record(raw)?.text !== 'string')))
    return null
  const historical: string[] = []
  visitHistoricalText(memory, (value) => {
    historical.push(value)
    return value
  })
  // A literal reply may appear inside a speaker-attributed summary. Preserve
  // those wrappers and every source binding while sharing the exact substring.
  if (historical.length > 512)
    return null
  const candidates = [...new Set(historical.flatMap(value => [value, ...value.matchAll(/[^。！？.!?；;\r\n]+(?:[。！？.!?；;]|\r\n|[\r\n]|$)/gu)].map(part => typeof part === 'string' ? part : part[0])))].filter(value => Buffer.byteLength(value, 'utf8') >= 80)
  if (candidates.length > 1024)
    return null
  let values = candidates.filter((value) => {
    const count = historical.reduce((total, text) => total + text.split(value).length - 1, 0)
    return count > 1 && (count - 1) * Buffer.byteLength(value, 'utf8') > count * 40 + 32
  }).sort((a, b) => b.length - a.length)
  if (!values.length)
    return null
  for (;;) {
    const references = values.map(() => 0)
    const projected = JSON.parse(content) as JsonRecord
    const projectedData = record(projected.data)!
    const projectedMemory = record(projectedData.workingMemory)!
    visitHistoricalText(projectedMemory, (value) => {
      const exact = values.indexOf(value)
      if (exact >= 0) {
        references[exact]++
        return { h: exact }
      }
      const chunks: Array<string | number> = []
      let cursor = 0
      while (cursor < value.length) {
        let next = -1
        let selected = -1
        for (const [index, literal] of values.entries()) {
          const at = value.indexOf(literal, cursor)
          if (at >= 0 && (next < 0 || at < next)) {
            next = at
            selected = index
          }
        }
        if (selected < 0)
          break
        if (next > cursor)
          chunks.push(value.slice(cursor, next))
        chunks.push(selected)
        references[selected]++
        cursor = next + values[selected].length
      }
      if (!chunks.length)
        return value
      if (cursor < value.length)
        chunks.push(value.slice(cursor))
      return { h: chunks }
    })
    const used = values.filter((_, index) => references[index] > 1)
    if (used.length !== values.length) {
      values = used
      if (!values.length)
        return null
      continue
    }
    projectedData.historicalTextDictionary = {
      version: 'historical-text-dictionary-v2',
      rule: 'Only recentDialogue.text and compressedTimeline summary/thread/commitments/corrections: {h:n}=values[n]; {h:a}=concatenate its literal strings and values[index] exactly. Keep each speaker/source/time/claim scope; other fields literal.',
      values,
    }
    const compacted = JSON.stringify(projected)
    const savedBytes = Buffer.byteLength(content, 'utf8') - Buffer.byteLength(compacted, 'utf8')
    return savedBytes > 0 ? { content: compacted, dictionaryEntries: values.length, references: references.reduce((total, count) => total + count, 0), savedBytes } : null
  }
}
