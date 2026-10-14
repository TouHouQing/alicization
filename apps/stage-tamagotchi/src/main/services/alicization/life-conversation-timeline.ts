import type { LifeStateView } from '../../../shared/life-contracts'

import { readLifeInputText } from './life-input-preview'

export async function readLifeConversationTimeline(view: LifeStateView, read: (id: string) => Promise<Record<string, unknown> | null>, conversationId?: string) {
  const events = view.ingress.filter(item => item.kind === 'user-turn' && item.source === 'dialogue' && (conversationId === undefined || item.payload.conversationId === conversationId)).slice(0, 12).sort((a, b) => a.occurredAt - b.occurredAt || a.observedAt - b.observedAt)
  const timeline = []
  for (const event of events) {
    let text: string | null | undefined
    try { text = readLifeInputText(await read(event.id)).text }
    catch { continue }
    if (text)
      timeline.push({ index: timeline.length, sourceId: event.id, inputHash: typeof event.payload.inputHash === 'string' ? event.payload.inputHash : null, occurredAt: event.occurredAt, text: text.slice(0, 400) })
  }
  return timeline
}

export function hasExplicitConversationSequence(text: string) {
  return /(?:我们|你|我)[\s\S]{0,30}(?:先|首先|接着|然后|后来)|(?:后来|更早|在此之前)[\s\S]{0,30}(?:我们|你|我)|\b(?:first|then|afterwards|subsequently|before|after)\b(?=[\s,;:!?]|$)/iu.test(text)
}

function unquoted(text: string) {
  // Keep source offsets so evidence quotes remain exact substrings of the draft.
  return text.replace(/```[\s\S]*?```|“[^”]*”|「[^」]*」|『[^』]*』|‘[^’]*’|"[^"\n]*"|(?<![\p{L}\p{N}])'[^'\n]*'(?![\p{L}\p{N}])/gu, quote => ' '.repeat(quote.length))
}

export function assertedConversationPairs(text: string) {
  const plain = unquoted(text)
  const pairs = [
    ...plain.matchAll(/(?:你|我们|我)[^。！？!?；;\n]{0,40}?(?:首先|先)([^。！？!?；;\n]{0,100}?)(?:后来|接着|然后|随后|之后)([^。！？!?；;\n]{0,100})/gu),
    ...plain.matchAll(/\b(?:you|we|i)\b[^.!?;\n]{0,60}?\b(?:first|initially)\b([^.!?;\n]{0,120}?)\b(?:then|later|afterwards|subsequently)\b([^.!?;\n]{0,120})/giu),
  ]
  const asserted = []
  for (const pair of pairs) {
    if (/下次|明天|后天|将来|以后|我会|我想|会先|如果|假如|\b(?:will|would|tomorrow|next time|if|plan to|want to|intend to)\b/iu.test(pair[0]))
      continue
    const conversationEvent = /[问说聊谈]|告诉|分享|鼓励|安慰|提到|邀请|\b(?:asked|said|told|talked|shared|invited|encouraged)\b/iu
    if (conversationEvent.test(pair[1]) && conversationEvent.test(pair[2]))
      asserted.push({ quote: text.slice(pair.index, pair.index + pair[0].length), earlierDescription: pair[1].split(/[，,]/u)[0].trim(), laterDescription: pair[2].split(/[，,]/u)[0].trim() })
  }
  const future = /下次|明天|后天|将来|以后|(?<![问询])我(?:会|想)|会先|如果|假如|\b(?:will|would|tomorrow|next time|if|plan to|want to|intend to)\b/iu
  // Later markers attach to the nearest attributed event, not the outer
  // question in "you asked; I answered that earlier A, and later B".
  const attributed = /(?:你|我们|我)(?:[也就还又]|刚才|当时|之前|曾经|先前|已经|确实|接着|后来|先|首先|特意|明确|认真|坦率地|直接|自己|回来以后|回来后|记得自己|向你|对你){0,5}(?:[问说聊谈]|告诉|分享|讨论|鼓励|安慰|提到|邀请|允许|要求|让我|让你|选了|选择了)|\b(?:you|we|i)\b[^,.!?;\n]{0,40}?\b(?:asked|said|told|talked|shared|invited|encouraged|allowed|requested)\b/iu
  const marker = /后来|接着|然后|随后|之后|更早|在此之前|再往前|再早些?(?:时候)?|先前|\b(?:then|later|afterwards|subsequently|earlier|before that)\b/giu
  let previous: { start: number, end: number, description: string } | undefined
  let pendingMarker: string | undefined
  for (const clause of plain.matchAll(/[^，,。！？!?；;\n]+[，,。！？!?；;]?/gu)) {
    const attribution = attributed.exec(clause[0]) ?? (previous ? /^(?:后来|接着|然后|随后|之后|更早|在此之前|再往前)[又也还]?(?:[问说聊谈]|告诉|分享|讨论|鼓励|安慰|提到|邀请|允许|要求|让我|让你)/u.exec(clause[0].trimStart()) : null)
    if (!attribution || future.test(clause[0])) {
      pendingMarker = /^\s*(?:更早(?:的时候|些)?|在此之前|再往前|再早些?(?:时候)?|先前)[，,\s]*$/u.test(clause[0]) ? clause[0] : undefined
      continue
    }
    const remainder = clause[0].slice(attribution.index + attribution[0].length).replace(/[，,。！？!?；;\s]/gu, '')
    // An empty "I answered," introduces reported content, not another event.
    if (!remainder)
      continue
    const current = { start: clause.index, end: clause.index + clause[0].length, description: clause[0].slice(attribution.index).replace(/[，,。！？!?；;]+$/gu, '').trim() }
    const prefix = clause[0].slice(0, attribution.index + attribution[0].length)
    const temporal = [...`${pendingMarker ?? ''}${prefix}`.matchAll(marker)].at(-1)
    pendingMarker = undefined
    if (previous && temporal && current.start - previous.end <= 640) {
      const reverse = /更早|在此之前|再往前|再早|先前|earlier|before that/iu.test(temporal[0])
      asserted.push({ quote: text.slice(previous.start, current.end).trim(), earlierDescription: reverse ? current.description : previous.description, laterDescription: reverse ? previous.description : current.description })
    }
    previous = current
  }
  return asserted
}

export function requiresPastConversationLinks(text: string, question: string) {
  return assertedConversationPairs(text).some(pair => /刚才|之前|回来|先前|当时|发生|记得|回顾|过去|\b(?:earlier|previously|returned|happened|remember|recap|past)\b/iu.test(`${question} ${pair.quote}`))
}

export interface LifeConversationLink {
  earlier: number
  later: number
  quote: string
  earlierEvidence: string
  laterEvidence: string
  meaningMatchesEvents: boolean
}

/** Exact unique source evidence identifies an event; a redundant numeric index is not authority. */
export function resolveLifeConversationLinks(links: LifeConversationLink[], timeline: Array<{ index: number, text: string }>) {
  const resolveIndex = (evidence: string, reported: number) => {
    const matches = evidence ? timeline.filter(event => event.text.includes(evidence)) : []
    return matches.length === 1 ? matches[0].index : reported
  }
  return links.map(link => ({ ...link, earlier: resolveIndex(link.earlierEvidence, link.earlier), later: resolveIndex(link.laterEvidence, link.later) }))
}

export function matchesLifeConversationLinks(links: LifeConversationLink[], timeline: Array<{ index: number, text: string }>, draft: string, requireCoverage = false) {
  const generic = new Set(['问我', '你说', '我说', '我们', '后来', '然后', '自己', '刚才', '今天', '现在', '不用', '可以', '一个'])
  const grams = (text: string) => {
    const plain = text.toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
    return new Set(Array.from({ length: Math.max(0, plain.length - 1) }, (_, offset) => plain.slice(offset, offset + 2)).filter(gram => !generic.has(gram)))
  }
  const sources = timeline.map(event => ({ index: event.index, grams: grams(event.text) }))
  const counts = new Map<string, number>()
  for (const source of sources) {
    for (const gram of source.grams)
      counts.set(gram, (counts.get(gram) ?? 0) + 1)
  }
  const matchesAnchoredSource = (description: string, index: number) => {
    const anchors = [...grams(description)].filter(gram => counts.get(gram) === 1)
    const scores = sources.map(source => ({ index: source.index, score: anchors.filter(gram => source.grams.has(gram)).length }))
    const selected = scores.find(source => source.index === index)?.score ?? 0
    // Reject only a clear competing source, allowing paraphrases with no unique
    // lexical anchor. This prevents sorting a false pair while keeping its quote.
    return Math.max(0, ...scores.map(source => source.score)) < selected + 2
  }
  // Mention order may contain flashbacks; only an asserted temporal relation has an ordering constraint.
  return links.length <= 12 && links.every(link =>
    Number.isInteger(link.earlier) && Number.isInteger(link.later)
    && link.earlier < link.later
    && timeline.some(item => item.index === link.earlier) && timeline.some(item => item.index === link.later)
    && link.quote.length > 0 && draft.includes(link.quote)
    && link.meaningMatchesEvents === true
    && link.earlierEvidence.length > 0 && timeline.find(item => item.index === link.earlier)!.text.includes(link.earlierEvidence)
    && link.laterEvidence.length > 0 && timeline.find(item => item.index === link.later)!.text.includes(link.laterEvidence)
    && assertedConversationPairs(link.quote).every(pair => matchesAnchoredSource(pair.earlierDescription, link.earlier) && matchesAnchoredSource(pair.laterDescription, link.later)),
  ) && (!requireCoverage || assertedConversationPairs(draft).every(pair => links.some((link) => {
    const quote = unquoted(link.quote)
    return quote.includes(pair.earlierDescription) && quote.includes(pair.laterDescription) && matchesAnchoredSource(pair.earlierDescription, link.earlier) && matchesAnchoredSource(pair.laterDescription, link.later)
  })))
}
