import { sanitizeAlicizationMemoryEvidenceText } from '@proj-alicization/stage-shared'

const httpFailureStatusPattern
  = /^(?:http(?:\/\d(?:\.\d)?)?\s*)?[45]\d\d(?:\s*:\s*\S.*|\s+(?:bad request|unauthorized|payment required|forbidden|not found|request timeout|conflict|gone|payload too large|unsupported media type|unprocessable (?:content|entity)|too many requests|internal server error|not implemented|bad gateway|service unavailable|gateway timeout)|\s+from\s+(?:upstream|provider|api|server))?[.!]?$/iu

const runtimeFailureTokenPattern
  = /^(?:connect\s+)?(?:econnreset|econnrefused|etimedout|enotfound|eai_again)\b.*|^(?:provider-auth(?:\s+failed)?|local-runtime-unavailable|recall-failure)[.!]?$/iu

const directTimeoutPattern
  = /^(?:error\s*[:=-]\s*)?timeout(?:\s*[:=-]\s*\S.*|(?:\s+after\b.*)?)[.!]?$|^(?:request|provider|tool|embedding|connection|upstream)\s+timed?\s*out\b.*$/iu

const rateLimitFailurePattern
  = /^(?:rate[- ]?limited|rate[- ]?limit exceeded|rate[- ]?limit\s*[:=-]\s*\S.*)[.!]?$/iu

const explicitRuntimeFailurePattern
  = /^(?:embedding(?:\s+dimension)?\s+mismatch|request\s+rejected(?:\s+by\s+upstream)?|invalid\s+api\s+key|api\s+key\s+(?:invalid|rejected)|authentication\s+(?:failed|rejected))[.!]?$/iu

const directProviderFailurePatterns = [
  /^(?:embedding\s+)?provider failed[.!]?$/iu,
  /^(?:embedding\s+)?provider failed with http(?:\s+status)?\s*(?:code\s*)?[45]\d\d(?:\s*:\s*\S.*)?[.!]?$/iu,
  /^provider returned (?:http\s*)?[45]\d\d(?:\s*:\s*\S.*|\s+(?:bad request|unauthorized|forbidden|too many requests|internal server error|bad gateway|service unavailable|gateway timeout))?[.!]?$/iu,
  /^provider unavailable[.!]?$/iu,
  /^provider authentication failed[.!]?$/iu,
  /^provider request timed?\s*out(?:\s*:\s*\S.*)?[.!]?$/iu,
  /^provider request failed\s*:\s*\S.*$/iu,
  /^provider error\s*:\s*\S.*$/iu,
  /^provider timed?\s*out(?:\s+after\b.*)?[.!]?$/iu,
] as const

const directRequestFailurePatterns = [
  /^request rejected by upstream[.!]?$/iu,
  /^request timed?\s*out(?:\s+while\b.*|\s+after\b.*)?[.!]?$/iu,
  /^request failed\s*:\s*\S.*$/iu,
] as const

const directToolFailurePatterns = [
  /^(?:filesystem\s+)?tool(?:\s+call|\s+invocation)? timed?\s*out(?:\s+after\b.*)?[.!]?$/iu,
  /^(?:filesystem\s+)?tool(?:\s+call)? timeout[.!]?$/iu,
  /^(?:filesystem\s+)?tool(?:\s+call)? failed\s*:\s*\S.*$/iu,
  /^(?:filesystem\s+)?tool error\s*:\s*\S.*$/iu,
  /^(?:filesystem\s+)?tool execution (?:was\s+)?(?:failed|aborted|blocked|cancelled)[.!]?$/iu,
  /^(?:filesystem\s+)?tool invocation aborted[.!]?$/iu,
  /^(?:filesystem\s+)?tool failed with (?:permission|access) denied[.!]?$/iu,
  /^tool provider failed with http\s*[45]\d\d(?:\s*:\s*\S.*)?[.!]?$/iu,
  /^failed to (?:open|read|click|type|navigate|scroll|wait|list|press|persist|write|patch|edit)\b.*$/iu,
] as const

const directChineseInfrastructureFailurePattern
  = /^(?:provider|提供方|供应商|工具|请求|向量|调用|连接|响应|运行时|召回)\s*(?:(?:请求|调用|执行)\s*)?(?:失败|错误|出错|超时|中止|被拒绝|不可用)(?:\s*[：:]\s*\S.*)?[。.!！]?$/iu

const adjacentFailureDetailPattern
  = /^(?:(?:code|status)\s*[:=]\s*(?:[45]\d\d|\d{4,}|[\w-]*(?:invalid|error|fail|unauthorized|forbidden|rate|timeout|unavailable|mismatch|reject)[\w-]*)|(?:message|error)\s*[:=].*(?:invalid|fail(?:ed|ure)?|error|mismatch|reject(?:ed)?|unauthorized|forbidden|unavailable|timeout|aborted|refused|reset|exceeded)|invalid\b|unauthorized\b|forbidden\b|unavailable\b|aborted\b|refused\b|reset\b|exceeded\b)/iu

const structuredFailureDetailPattern
  = /["']?(?:code|status|message|error)["']?\s*[:=].*(?:[45]\d\d|\d{4}|invalid|fail(?:ed|ure)?|error|mismatch|reject(?:ed)?|unauthorized|forbidden|unavailable|timeout|aborted|refused|reset|exceeded)/iu

function isAdjacentFailureDetailClause(clause: string) {
  return adjacentFailureDetailPattern.test(clause)
}

function asFailureRecord(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null
  return raw as Record<string, unknown>
}

function readFailureScalar(raw: unknown) {
  if (typeof raw !== 'string' && typeof raw !== 'number')
    return ''
  return String(raw).trim().replace(/\s+/g, ' ')
}

function projectEmbeddedFailureJson(raw: string) {
  const jsonStart = raw.indexOf('{')
  const jsonEnd = raw.lastIndexOf('}')
  if (jsonStart < 0)
    return raw

  const prefix = raw.slice(0, jsonStart).trim().replace(/:\s*$/u, '')
  if (jsonEnd <= jsonStart)
    return prefix

  try {
    const payload = asFailureRecord(JSON.parse(raw.slice(jsonStart, jsonEnd + 1)))
    const nestedError = asFailureRecord(payload?.error)
    const code = readFailureScalar(
      payload?.code
      ?? payload?.status
      ?? nestedError?.code
      ?? nestedError?.status,
    )
    const message = readFailureScalar(
      payload?.message
      ?? (typeof payload?.error === 'string' ? payload.error : null)
      ?? nestedError?.message,
    )
    const details = [
      code ? `code=${code}` : '',
      message ? `message=${message}` : '',
    ].filter(Boolean).join('; ')

    if (!details)
      return prefix
    return prefix ? `${prefix}: ${details}` : details
  }
  catch {
    return prefix
  }
}

function sanitizeFailureClause(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return sanitizeAlicizationMemoryEvidenceText(raw.trim(), maxChars)
}

function splitFailureClauses(raw: string, maxChars: number) {
  const clauses = projectEmbeddedFailureJson(raw.trim())
    .replace(/\r\n?/g, '\n')
    .split(/\n+|\s*\|\s*|(?<=[.!?。！？])\s+/u)

  const structuredMessageIndex = clauses.findIndex(clause =>
    /(?:^|[;:]\s*)(?:message|error)=/iu.test(clause),
  )
  const projectedClauses = structuredMessageIndex >= 0
    ? [
        ...clauses.slice(0, structuredMessageIndex),
        clauses.slice(structuredMessageIndex).join(' '),
      ]
    : clauses

  return projectedClauses
    .map(clause => sanitizeFailureClause(clause, maxChars))
    .filter(Boolean)
}

function isTransparentRuntimeFailureClause(clause: string) {
  return httpFailureStatusPattern.test(clause)
    || runtimeFailureTokenPattern.test(clause)
    || directTimeoutPattern.test(clause)
    || rateLimitFailurePattern.test(clause)
    || explicitRuntimeFailurePattern.test(clause)
    || directProviderFailurePatterns.some(pattern => pattern.test(clause))
    || directRequestFailurePatterns.some(pattern => pattern.test(clause))
    || directToolFailurePatterns.some(pattern => pattern.test(clause))
    || directChineseInfrastructureFailurePattern.test(clause)
    || isAdjacentFailureDetailClause(clause)
}

function runtimeFailureDetailScore(failureText: string) {
  let score = failureText.length
  if (httpFailureStatusPattern.test(failureText))
    score += 240
  if (runtimeFailureTokenPattern.test(failureText))
    score += 180
  if (explicitRuntimeFailurePattern.test(failureText))
    score += 300
  if (structuredFailureDetailPattern.test(failureText))
    score += 120
  if (failureText.includes(':'))
    score += 40
  return score
}

export function sanitizeAlicizationTransparentRuntimeFailureText(raw: unknown, maxChars = 180) {
  if (typeof raw !== 'string')
    return ''

  const clauses = splitFailureClauses(raw, maxChars)
  const failureStart = clauses.findIndex(isTransparentRuntimeFailureClause)
  if (failureStart < 0)
    return ''

  const failureClauses = [clauses[failureStart]]
  for (const clause of clauses.slice(failureStart + 1)) {
    if (!isTransparentRuntimeFailureClause(clause) && !isAdjacentFailureDetailClause(clause))
      break
    failureClauses.push(clause)
  }

  return failureClauses.join(' ').slice(0, maxChars).trim()
}

export function pickAlicizationTransparentRuntimeFailureText(
  candidates: readonly unknown[],
  maxChars = 180,
) {
  return candidates
    .map(candidate => sanitizeAlicizationTransparentRuntimeFailureText(candidate, maxChars))
    .filter(Boolean)
    .sort((left, right) => runtimeFailureDetailScore(right) - runtimeFailureDetailScore(left))[0] ?? ''
}
