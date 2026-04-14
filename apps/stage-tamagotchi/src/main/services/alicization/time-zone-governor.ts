import type { Message } from '@xsai/shared-chat'

import { parseJsonObjectFromText, readTransportContentAsText } from './runtime-transport-content'

const knownTimeZoneAliases = new Map<string, string>([
  ['北京时间', 'Asia/Shanghai'],
  ['东八区', 'Asia/Shanghai'],
  ['中国时间', 'Asia/Shanghai'],
  ['上海时间', 'Asia/Shanghai'],
  ['东京时间', 'Asia/Tokyo'],
  ['日本时间', 'Asia/Tokyo'],
  ['纽约时间', 'America/New_York'],
  ['洛杉矶时间', 'America/Los_Angeles'],
  ['伦敦时间', 'Europe/London'],
  ['utc', 'UTC'],
  ['gmt', 'UTC'],
])

const explicitTimeZoneControlPattern = /(?:时区|timezone|time\s*zone|按.+?时间|用.+?时间|设为|设置为|改为|改成|切换到|切到)/iu
const timezoneCandidatePattern = /\b(?:[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+|(?:UTC|GMT)\s*[+-]\s*\d{1,2}|UTC|GMT)\b/giu
const timezoneJsonHintPatterns = [
  /"(?:timezone|timeZone)"\s*:\s*"([^"]{1,96})"/g,
  /\b(?:timezone|timeZone)\s*[:=]\s*([A-Za-z_][A-Za-z0-9_./+-]{0,95})/g,
] as const

export type AlicizationResolvedTimeZoneSource
  = | 'user-explicit'
    | 'context-hint'
    | 'process-env'
    | 'runtime-intl'
    | 'utc-fallback'

export interface AlicizationResolvedTimeZone {
  timezone: string
  source: AlicizationResolvedTimeZoneSource
}

function sanitizeText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeCandidate(raw: unknown) {
  return sanitizeText(raw, 96).replace(/\s+/g, '')
}

function parseUtcOffsetToIana(raw: string) {
  const normalized = raw.toUpperCase().replace(/\s+/g, '')
  const match = normalized.match(/^(?:UTC|GMT)([+-]\d{1,2})$/)
  if (!match?.[1])
    return ''

  const offset = Number.parseInt(match[1], 10)
  if (!Number.isFinite(offset) || offset < -14 || offset > 14)
    return ''
  if (offset === 0)
    return 'UTC'

  const etcSign = offset > 0 ? '-' : '+'
  return `Etc/GMT${etcSign}${Math.abs(offset)}`
}

export function isValidIanaTimeZone(raw: unknown) {
  const candidate = normalizeCandidate(raw)
  if (!candidate)
    return false

  try {
    new Intl.DateTimeFormat('en-US', {
      timeZone: candidate,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())
    return true
  }
  catch {
    return false
  }
}

export function resolveAlicizationTimeZoneCandidate(raw: unknown) {
  const candidate = normalizeCandidate(raw)
  if (!candidate)
    return ''

  const alias = knownTimeZoneAliases.get(candidate.toLowerCase())
  if (alias && isValidIanaTimeZone(alias))
    return alias

  if (isValidIanaTimeZone(candidate))
    return candidate

  const fromOffset = parseUtcOffsetToIana(candidate)
  if (fromOffset && isValidIanaTimeZone(fromOffset))
    return fromOffset

  return ''
}

function collectTimeZoneHintsFromText(text: string) {
  const candidates: string[] = []
  const seen = new Set<string>()
  for (const pattern of timezoneJsonHintPatterns) {
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const candidate = normalizeCandidate(match[1] ?? '')
      if (!candidate || seen.has(candidate))
        continue
      seen.add(candidate)
      candidates.push(candidate)
    }
  }
  return candidates
}

function collectTimeZoneHintsFromObject(raw: unknown, sink: Set<string>, depth = 0) {
  if (!raw || typeof raw !== 'object' || depth > 5)
    return
  const record = raw as Record<string, unknown>
  for (const [key, value] of Object.entries(record)) {
    if (/^time(?:zone|Zone)$/u.test(key) && typeof value === 'string') {
      const candidate = normalizeCandidate(value)
      if (candidate)
        sink.add(candidate)
    }
    if (value && typeof value === 'object')
      collectTimeZoneHintsFromObject(value, sink, depth + 1)
  }
}

export function extractExplicitUserTimeZoneFromText(userTextRaw: unknown) {
  const userText = sanitizeText(userTextRaw, 600)
  if (!userText || !explicitTimeZoneControlPattern.test(userText))
    return ''

  const aliasHits: string[] = []
  for (const alias of knownTimeZoneAliases.keys()) {
    if (!/[^\x00-\x7F]/.test(alias))
      continue
    if (userText.includes(alias))
      aliasHits.push(alias)
  }
  for (const alias of aliasHits) {
    const resolved = resolveAlicizationTimeZoneCandidate(alias)
    if (resolved)
      return resolved
  }

  const candidateHits = userText.match(timezoneCandidatePattern) ?? []
  for (const rawCandidate of candidateHits) {
    const resolved = resolveAlicizationTimeZoneCandidate(rawCandidate)
    if (resolved)
      return resolved
  }

  return ''
}

function resolveContextHintTimeZone(messages: Message[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message)
      continue
    const text = sanitizeText(readTransportContentAsText(message.content), 2_000)
    if (!text)
      continue

    for (const hint of collectTimeZoneHintsFromText(text)) {
      const resolved = resolveAlicizationTimeZoneCandidate(hint)
      if (resolved)
        return resolved
    }

    const parsed = parseJsonObjectFromText(text)
    if (parsed && typeof parsed === 'object') {
      const candidates = new Set<string>()
      collectTimeZoneHintsFromObject(parsed, candidates)
      for (const hint of candidates) {
        const resolved = resolveAlicizationTimeZoneCandidate(hint)
        if (resolved)
          return resolved
      }
    }
  }
  return ''
}

export function resolveAlicizationTimeZoneFromMessages(messages?: Message[]): AlicizationResolvedTimeZone {
  const normalizedMessages = messages ?? []
  for (let index = normalizedMessages.length - 1; index >= 0; index -= 1) {
    const message = normalizedMessages[index]
    if (!message || message.role !== 'user')
      continue
    const userText = sanitizeText(readTransportContentAsText(message.content), 800)
    const explicit = extractExplicitUserTimeZoneFromText(userText)
    if (explicit) {
      return {
        timezone: explicit,
        source: 'user-explicit',
      }
    }
  }

  const contextHint = resolveContextHintTimeZone(normalizedMessages)
  if (contextHint) {
    return {
      timezone: contextHint,
      source: 'context-hint',
    }
  }

  const envTimezone = typeof process !== 'undefined'
    ? resolveAlicizationTimeZoneCandidate(process.env?.TZ)
    : ''
  if (envTimezone) {
    return {
      timezone: envTimezone,
      source: 'process-env',
    }
  }

  const intlTimezone = resolveAlicizationTimeZoneCandidate(Intl.DateTimeFormat().resolvedOptions().timeZone || '')
  if (intlTimezone) {
    return {
      timezone: intlTimezone,
      source: 'runtime-intl',
    }
  }

  return {
    timezone: 'UTC',
    source: 'utc-fallback',
  }
}

