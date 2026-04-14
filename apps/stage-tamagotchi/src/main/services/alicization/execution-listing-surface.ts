import { sanitizeExecutionLedgerText } from './execution-ledger-shared'

const listedEntriesPattern = /^Listed\s+(desktop\s+entries|entries)\s+\((\d+)\):\s*(.+)$/iu
const listedExtraPattern = /(?:,\s*)?\+(\d+)\s+more\s*$/iu
const listedEncodedNamePattern = /^((?:%[0-9A-Fa-f]{2}){2,})\s*\((.+)\)$/u
const uriEncodedTokenPattern = /^(?:%[0-9A-Fa-f]{2}){2,}$/u
const shellListingLeakPattern = /(?:^|\s)(?:drwx|total\s+\d+)/iu
const shellListingMonthToken = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)'
const shellListingEntryPattern = new RegExp(
  `(?:^|\\s)([bcdlps-][rwxStTs-]{9}(?:[@+])?\\s+\\d+\\s+\\S+\\s+\\S+\\s+\\d+\\s+${shellListingMonthToken}\\s+\\d+\\s+(?:\\d{2}:\\d{2}|\\d{4})\\s+)(.+?)(?=(?:\\s+[bcdlps-][rwxStTs-]{9}(?:[@+])?\\s+\\d+\\s+\\S+\\s+\\S+\\s+\\d+\\s+${shellListingMonthToken}\\s+\\d+\\s+(?:\\d{2}:\\d{2}|\\d{4})\\s+)|$)`,
  'gu',
)
const shellListingSimpleRowPattern = /^(?!total\b)(.+)$/gimu

export interface AlicizationExecutionListingSummary {
  count: number
  extraCount: number
  items: string[]
  partial: boolean
  scope: 'desktop' | 'entries'
}

function sanitizeText(raw: unknown, maxLength: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function normalizeListingItemName(tokenRaw: string) {
  const token = sanitizeText(tokenRaw, 120)
  if (!token)
    return ''

  const encodedWithHint = token.match(listedEncodedNamePattern)
  if (encodedWithHint?.[2]) {
    const hinted = sanitizeText(encodedWithHint[2], 72)
    if (hinted)
      return hinted
  }

  if (uriEncodedTokenPattern.test(token)) {
    try {
      const decoded = sanitizeText(decodeURIComponent(token), 72)
      if (decoded)
        return decoded
    }
    catch {
      // Ignore decode errors and keep the raw token below.
    }
  }

  return sanitizeText(token, 72)
}

export function formatAlicizationExecutionListingPreviewName(nameRaw: string) {
  const name = sanitizeText(nameRaw, 72)
  if (!name)
    return ''
  return name.length > 28
    ? `${name.slice(0, 27)}…`
    : name
}

function parseProtocolListingSummary(detail: string): AlicizationExecutionListingSummary | null {
  const matched = detail.match(listedEntriesPattern)
  if (!matched)
    return null

  const [, scopeToken, countToken, bodyToken] = matched
  const count = Number.parseInt(countToken, 10)
  const scope: AlicizationExecutionListingSummary['scope'] = /desktop/i.test(scopeToken)
    ? 'desktop'
    : 'entries'

  let body = sanitizeText(bodyToken, 2_000)
  let extraCount = 0
  const extraMatch = body.match(listedExtraPattern)
  if (extraMatch?.[1]) {
    extraCount = Number.parseInt(extraMatch[1], 10)
    body = sanitizeText(body.slice(0, extraMatch.index ?? body.length), 2_000)
  }

  const items = [...new Set(body
    .split(/\s*,\s*/u)
    .map(normalizeListingItemName)
    .filter(Boolean))]

  return {
    count: Number.isFinite(count) && count > 0 ? count : items.length + extraCount,
    extraCount: Number.isFinite(extraCount) && extraCount > 0 ? extraCount : 0,
    items,
    partial: extraCount > 0,
    scope,
  }
}

function parseShellListingSummary(input: {
  detail: string
  goal?: string
}): AlicizationExecutionListingSummary | null {
  if (!shellListingLeakPattern.test(input.detail))
    return null

  const names: string[] = []
  for (const matched of input.detail.matchAll(shellListingEntryPattern)) {
    const name = normalizeListingItemName(matched[2] ?? '')
    if (!name || name === '.' || name === '..')
      continue
    names.push(name)
  }

  if (names.length === 0) {
    for (const matched of input.detail.matchAll(shellListingSimpleRowPattern)) {
      const row = sanitizeText(matched[1] ?? '', 240)
      if (!row || row === '.' || row === '..')
        continue
      names.push(normalizeListingItemName(row))
    }
  }

  const uniqueNames = [...new Set(names.filter(Boolean))]
  if (uniqueNames.length === 0)
    return null

  const scope: AlicizationExecutionListingSummary['scope'] = /desktop|桌面/iu.test(input.goal ?? '')
    ? 'desktop'
    : 'entries'

  return {
    count: uniqueNames.length,
    extraCount: 0,
    items: uniqueNames,
    partial: false,
    scope,
  }
}

export function resolveAlicizationExecutionListingSummary(input: {
  detail: string
  goal?: string
}) {
  const detail = sanitizeExecutionLedgerText(input.detail, 8_000)
  if (!detail)
    return null
  return parseShellListingSummary({
    detail,
    goal: input.goal,
  }) ?? parseProtocolListingSummary(detail)
}

export function buildAlicizationExecutionListingDisplayOrder(items: string[]) {
  const normalizedItems = [...new Set(items.map(item => sanitizeText(item, 72)).filter(Boolean))]
  const meaningfulItems = normalizedItems.filter(item => !item.startsWith('.') && item !== '.DS_Store' && item !== '.localized')
  if (meaningfulItems.length === 0)
    return normalizedItems

  const hiddenItems = normalizedItems.filter(item => !meaningfulItems.includes(item))
  return [
    ...meaningfulItems,
    ...hiddenItems,
  ]
}

export function parseAlicizationRequestedListingItemCount(textRaw: string) {
  const text = sanitizeText(textRaw, 120)
  if (!text)
    return null

  const arabicMatch = text.match(/(\d+)\s*(?:项|个|条|files?|entries?)/iu)
  if (arabicMatch?.[1]) {
    const parsed = Number.parseInt(arabicMatch[1], 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }

  const chineseMatch = text.match(/([一二两三四五六七八九十]+)\s*(?:项|个|条)/u)
  if (!chineseMatch?.[1])
    return null

  const raw = chineseMatch[1]
  const digits = new Map<string, number>([
    ['零', 0],
    ['一', 1],
    ['二', 2],
    ['两', 2],
    ['三', 3],
    ['四', 4],
    ['五', 5],
    ['六', 6],
    ['七', 7],
    ['八', 8],
    ['九', 9],
  ])
  if (raw === '十')
    return 10
  if (raw.startsWith('十')) {
    const units = digits.get(raw.slice(1)) ?? 0
    return 10 + units
  }
  if (raw.endsWith('十')) {
    const tens = digits.get(raw.slice(0, 1)) ?? 0
    return tens * 10
  }
  if (raw.includes('十')) {
    const [left, right] = raw.split('十')
    const tens = digits.get(left) ?? 0
    const units = digits.get(right) ?? 0
    return tens * 10 + units
  }
  return digits.get(raw) ?? null
}

export function wasAlicizationListingItemMentioned(itemRaw: string, assistantTextRaw: string) {
  const item = sanitizeText(itemRaw, 72)
  const assistantText = sanitizeText(assistantTextRaw, 2_000)
  if (!item || !assistantText)
    return false

  return assistantText.includes(item) || assistantText.includes(formatAlicizationExecutionListingPreviewName(item))
}
