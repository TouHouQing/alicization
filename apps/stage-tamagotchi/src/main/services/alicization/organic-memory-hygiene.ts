function sanitizeText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.replace(/\s+/g, ' ').trim()
}

const operationalLogPattern = /set_reminder|task[_-]?id|trigger[_-]?at|mcp|tool[_-]?call|status\s*:|json|调用工具|任务id|闹钟/iu
const performativeResiduePattern = /撒娇|鼻音|湿湿|黏|抱抱|哄|依恋|红着脸|歪头|咬唇|膝盖|挪了挪|跪在这里|一眨眼都不敢走|主人最好了|没出息|乖乖|clingy|needy|whimper|snuggle|pet name|soft voice|wet voice|stage direction|blush/iu
const continuityThreadPattern = /问题|报错|错误|异常|diff|改动|修复|误读|重看|ground|grounding|scene|screen|线程|卡点|debug|bug|fix|error|follow[- ]?up|repair|recheck|verify|plan|promise|任务|代码|算法|commit|review|terminal|窗口|屏幕|画面/iu
const decorativeAffectionPattern = /[♡♥❤💕💗💖✨]/u

export function isOperationalLogLikeMemoryText(text: string) {
  return operationalLogPattern.test(text)
}

export function isPersonaResidueMemoryText(text: string) {
  const normalized = sanitizeText(text)
  if (!normalized)
    return false

  const performativeHits = [
    performativeResiduePattern.test(normalized),
    decorativeAffectionPattern.test(normalized),
  ].filter(Boolean).length
  const continuityHits = continuityThreadPattern.test(normalized) ? 1 : 0

  return performativeHits >= 2 || (performativeHits >= 1 && continuityHits === 0)
}

export function normalizeOrganicMemoryText(raw: unknown, maxChars: number) {
  const normalized = sanitizeText(raw)
  if (!normalized)
    return ''
  if (isOperationalLogLikeMemoryText(normalized))
    return ''
  if (isPersonaResidueMemoryText(normalized))
    return ''
  return normalized.slice(0, maxChars)
}

export function filterOrganicMemoryEntries<T extends { text: string }>(entries: T[]) {
  return entries.filter(entry => !isPersonaResidueMemoryText(entry.text))
}
