import { randomUUID } from 'node:crypto'

const decisionTraceIdPattern = /^mind:[a-z0-9]{1,24}:[a-f0-9]{8,32}$/u

function sanitizeText(raw: unknown, maxChars = 96) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, '').slice(0, maxChars)
}

export function sanitizeMindGovernanceDecisionTraceId(raw: unknown) {
  const normalized = sanitizeText(raw, 96).toLowerCase()
  if (!normalized)
    return ''
  return decisionTraceIdPattern.test(normalized)
    ? normalized
    : ''
}

export function createMindGovernanceDecisionTraceId(now = Date.now()) {
  const timeToken = Math.max(0, Math.floor(now)).toString(36)
  const uuidToken = randomUUID().replace(/-/g, '').slice(0, 12)
  return `mind:${timeToken}:${uuidToken}`
}

export function ensureMindGovernanceDecisionTraceId(raw: unknown, now = Date.now()) {
  return sanitizeMindGovernanceDecisionTraceId(raw)
    || createMindGovernanceDecisionTraceId(now)
}
