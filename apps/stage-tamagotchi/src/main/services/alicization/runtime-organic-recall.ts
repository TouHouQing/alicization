import type {
  AlicizationActiveThought,
  AlicizationSubconsciousFragment,
} from '../../../shared/eventa'

import { filterOrganicMemoryEntries } from './organic-memory-hygiene'
import { sanitizeMultilineText } from './runtime-soul'

export function normalizeOrganicRecallText(raw: string) {
  return sanitizeMultilineText(raw, '').replace(/\s+/g, ' ').trim()
}

export function shouldExtendContextualRecall(userText: string) {
  const compact = normalizeOrganicRecallText(userText).replace(/\s+/g, '')
  if (!compact)
    return false
  if (compact.length < 12)
    return true
  return /^(?:对啊|然后呢|继续|是吗|嗯+|哦+|好的|好吧|对|然后|继续说|还有呢|再说|细说|展开讲讲|行|ok|okay|yes|yeah|right|andthen)$/i.test(compact)
}

const retrospectiveRecallPattern = /几天前|前几天|前天|昨天|上周|前一阵|之前聊过|之前说过|还记得我们聊过|记不记得我们聊过|what did we talk about|what were we talking about|remember what we talked about|days ago|last week|earlier conversation/i

export function isRetrospectiveRecallQuery(text: string) {
  const normalized = normalizeOrganicRecallText(text)
  if (!normalized)
    return false
  return retrospectiveRecallPattern.test(normalized)
}

function escapeFts5Phrase(value: string) {
  return value.replace(/"/g, '""')
}

const organicRecallStopWords = new Set([
  '对啊',
  '然后呢',
  '继续',
  '是吗',
  '嗯',
  '哦',
  '好的',
  '好吧',
  '知道了',
  '继续说',
  '还有呢',
  '然后',
  '对',
  'yes',
  'yeah',
  'okay',
  'ok',
  'right',
  'then',
])

export function extractOrganicRecallTerms(text: string) {
  const normalized = normalizeOrganicRecallText(text)
  if (!normalized)
    return []

  const collected: string[] = []
  const push = (raw: string, maxChars = 48) => {
    const term = normalizeOrganicRecallText(raw).slice(0, maxChars)
    if (!term)
      return
    const lowered = term.toLowerCase()
    if (organicRecallStopWords.has(lowered))
      return
    if (collected.some(item => item.toLowerCase() === lowered))
      return
    collected.push(term)
  }

  for (const match of normalized.matchAll(/[“"「『《`']([^“"」』》`']{2,48})[”"」』》`']/g))
    push(match[1] ?? '')
  for (const match of normalized.matchAll(/[A-Z]:\\\S+|(?:\.{0,2}\/)?[\w.-]+(?:\/[\w./-]+)+/gi))
    push(match[0] ?? '', 80)
  for (const match of normalized.matchAll(/\bemotional_tension:[a-z-]{4,32}\b/g))
    push(match[0] ?? '', 48)
  for (const match of normalized.matchAll(/\b(?:ERR_[A-Z0-9_]+|[A-Z]{2,}[A-Z0-9_-]{1,31}|[A-Z]{2,}-\d{2,})\b/g))
    push(match[0] ?? '', 40)
  for (const match of normalized.matchAll(/\b[A-Z_][\w.:-]{1,31}\b/gi))
    push(match[0] ?? '', 40)
  for (const match of normalized.matchAll(/[\u4E00-\u9FFF]{2,16}/g))
    push(match[0] ?? '', 32)

  return collected.slice(0, 12)
}

export function buildFts5QueryFromTerms(terms: string[]) {
  if (terms.length === 0)
    return ''
  return terms
    .map(term => `"${escapeFts5Phrase(term)}"`)
    .join(' OR ')
}

export function buildDirectFts5Query(text: string) {
  const normalized = normalizeOrganicRecallText(text)
  if (!normalized)
    return ''
  return `"${escapeFts5Phrase(normalized.slice(0, 96))}"`
}

function scoreOrganicThoughtForPrompt(text: string, terms: string[]) {
  const normalized = normalizeOrganicRecallText(text).toLowerCase()
  if (!normalized || terms.length === 0)
    return 0

  let score = 0
  for (const term of terms) {
    const normalizedTerm = normalizeOrganicRecallText(term).toLowerCase()
    if (!normalizedTerm || !normalized.includes(normalizedTerm))
      continue
    score += normalizedTerm.length >= 6 ? 3 : 1
  }
  return score
}

export function selectPromptActiveThoughts(input: {
  activeThoughts: AlicizationActiveThought[]
  recallSeed?: string
  recalledFragments?: AlicizationSubconsciousFragment[]
}) {
  const activeThoughts = filterOrganicMemoryEntries(Array.isArray(input.activeThoughts) ? input.activeThoughts : [])
  if (activeThoughts.length <= 2 && !input.recallSeed)
    return activeThoughts

  const terms = [
    ...extractOrganicRecallTerms(input.recallSeed ?? ''),
    ...(input.recalledFragments ?? []).flatMap(fragment => extractOrganicRecallTerms(fragment.text)),
  ]
  const uniqueTerms = Array.from(new Set(
    terms
      .map(term => normalizeOrganicRecallText(term).toLowerCase())
      .filter(Boolean),
  ))
  if (uniqueTerms.length === 0)
    return input.recallSeed ? [] : activeThoughts.slice(0, 2)

  return activeThoughts
    .map(thought => ({
      thought,
      score: scoreOrganicThoughtForPrompt(thought.text, uniqueTerms),
    }))
    .filter(item => item.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      return right.thought.updatedAt - left.thought.updatedAt
    })
    .slice(0, 3)
    .map(item => item.thought)
}
