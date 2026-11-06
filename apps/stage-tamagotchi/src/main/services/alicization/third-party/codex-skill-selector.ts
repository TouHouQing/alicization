// TypeScript adaptation of openai/codex, commit
// 84dfc209d2697876dc7693611473e91616b3223d (Apache-2.0):
// codex-rs/ext/skills/src/dynamic_skill_selector/{fielded_bm25,
// character_ngram,rrf_lexical_char}.rs.
// Changes: combine fielded BM25 with character ranking; expose bounded scores
// for local traceability. Licenses and modification notice are in resources/licenses.
import { Buffer } from 'node:buffer'

export interface SkillSelectionDocument {
  id: number
  name: string
  shortDescription: string
  description: string
}

const weights = [8, 4, 1] as const
const stopWords = new Set('a an and are as at be by do for from how i in is it me my of on or please that the this to use we what when where which with you your'.split(' '))

function bounded(value: string) {
  const bytes = Buffer.from(value)
  if (bytes.length <= 4096)
    return value
  let end = 4096
  while ((bytes[end]! & 0xC0) === 0x80)
    end--
  return bytes.subarray(0, end).toString('utf8')
}

function terms(value: string) {
  const words = bounded(value).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []
  // Local Chinese support: lexical matching also sees adjacent Han pairs when
  // the user writes a sentence without spaces; the original term is retained.
  return words.flatMap(word => [word, ...(word.match(/\p{Script=Han}{3,}/gu) ?? []).flatMap((run) => {
    const characters = [...run]
    return characters.slice(1).map((_, index) => characters.slice(index, index + 2).join(''))
  })])
}

function grams(input: string[]) {
  const output = new Set<string>()
  for (const term of input) {
    const characters = [...term]
    const minimum = characters.every(character => character.codePointAt(0)! <= 0x7F) && characters.length > 2 ? 3 : 2
    for (let size = minimum; size <= Math.min(5, characters.length); size++) {
      for (let start = 0; start <= characters.length - size; start++) {
        output.add(characters.slice(start, start + size).join(''))
        if (output.size === 512)
          return output
      }
    }
  }
  return output
}

/** Bounded local retrieval only. A selected document grants no execution authority. */
export function selectSkills(query: string, documents: readonly SkillSelectionDocument[], limit = 4) {
  const queryTerms = [...new Set(terms(query).filter(term => [...term].length >= 2 && !stopWords.has(term)))].slice(0, 64)
  if (!queryTerms.length || limit <= 0)
    return []
  const prepared = documents.slice(0, 1000).map(document => ({
    ...document,
    fields: [document.name, document.shortDescription, document.description].map(value => terms(value).slice(0, 256)),
  }))
  const averages = weights.map((_, index) => prepared.reduce((sum, doc) => sum + doc.fields[index]!.length, 0) / (prepared.length || 1))
  const frequencies = new Map<string, number>()
  for (const document of prepared) {
    for (const term of new Set(document.fields.flat()))
      frequencies.set(term, (frequencies.get(term) ?? 0) + 1)
  }
  const idf = (frequency: number) => Math.log(1 + (prepared.length - frequency + 0.5) / (frequency + 0.5))
  const lexical = prepared.map((document) => {
    let score = 0
    for (const term of queryTerms) {
      const frequency = frequencies.get(term) ?? 0
      if (!frequency)
        continue
      const weighted = document.fields.reduce((sum, field, index) => {
        const tf = field.filter(value => value === term).length
        return sum + weights[index]! * tf / (1 - 0.75 + 0.75 * (averages[index] ? field.length / averages[index]! : 1))
      }, 0)
      score += idf(frequency) * weighted * 2.2 / (weighted + 1.2)
    }
    return { id: document.id, name: document.name, score }
  }).filter(document => document.score > 0)
  const queryGrams = grams(queryTerms)
  const characterDocuments = prepared.map(document => ({ ...document, fields: document.fields.map(grams) }))
  const gramFrequencies = new Map<string, number>()
  for (const document of characterDocuments) {
    for (const gram of new Set(document.fields.flatMap(field => [...field])))
      gramFrequencies.set(gram, (gramFrequencies.get(gram) ?? 0) + 1)
  }
  const character = characterDocuments.map((document) => {
    let score = 0
    let matches = 0
    for (const gram of queryGrams) {
      const weight = document.fields.reduce((sum, field, index) => sum + (field.has(gram) ? weights[index]! : 0), 0)
      if (weight) {
        score += idf(gramFrequencies.get(gram)!) * weight
        matches++
      }
    }
    return { id: document.id, name: document.name, score, matches }
  }).filter(document => document.matches >= Math.min(3, queryGrams.size) && document.score > 0)
  const order = (a: { score: number, name: string, id: number }, b: typeof a) => b.score - a.score || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) || a.id - b.id
  const fused = new Map<number, { id: number, score: number, bestRank: number, channels: string[] }>()
  for (const [channel, ranking] of [['bm25', lexical.sort(order)], ['character', character.sort(order)]] as const) {
    ranking.slice(0, 50).forEach((document, index) => {
      const rank = index + 1
      const result = fused.get(document.id) ?? { id: document.id, score: 0, bestRank: rank, channels: [] }
      result.score += 1 / (60 + rank)
      result.bestRank = Math.min(result.bestRank, rank)
      result.channels.push(channel)
      fused.set(document.id, result)
    })
  }
  return [...fused.values()].sort((a, b) => b.score - a.score || a.bestRank - b.bestRank || a.id - b.id).slice(0, Math.min(50, limit))
}
