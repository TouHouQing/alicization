import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

export type DeferredAutonomySummaryMode = 'deferred' | 'held-autonomy'
export type DeferredAutonomySummaryOwner = 'failure' | 'why-now' | 'execution-intent'
export const deferredAutonomyCanonicalVersion = 'deferred-autonomy-v1'

export interface DeferredAutonomyCanonicalSummaryValidation {
  executionIntentSummary: string | null
  failure: string | null
  isCanonicalVersion: boolean
  isValid: boolean
  summary: string | null
  summaryOwner: DeferredAutonomySummaryOwner | null
  whyNow: string | null
}

export interface ResolveDeferredAutonomySummaryInput {
  mode: DeferredAutonomySummaryMode
  whyNow?: unknown
  executionIntentSummary?: unknown
  explicitFailure?: unknown
  failureCandidates?: readonly unknown[]
  inferenceSources?: {
    whyNow?: unknown
    executionIntentSummary?: unknown
    failureCandidates?: readonly unknown[]
  }
}

export const deferredAutonomyContinuityBudgets = {
  source: 80,
  scenario: 120,
  turnId: 120,
  reasonCode: 120,
  threadId: 120,
  intentId: 64,
  deferReason: 240,
  whyNow: 560,
  executionIntentSummary: 560,
  failure: 560,
  outcome: 120,
  phase: 80,
  learningAction: 64,
} as const

export const deferredAutonomyProviderMetadataSchema = {
  textFields: {
    source: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.source,
      legacyMaxChars: deferredAutonomyContinuityBudgets.source,
      semantics: 'structural',
    },
    turnId: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.turnId,
      legacyMaxChars: 160,
      semantics: 'structural',
    },
    scenario: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.scenario,
      legacyMaxChars: deferredAutonomyContinuityBudgets.scenario,
      semantics: 'structural',
    },
    outcome: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.outcome,
      legacyMaxChars: deferredAutonomyContinuityBudgets.outcome,
      semantics: 'structural',
    },
    phase: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.phase,
      legacyMaxChars: deferredAutonomyContinuityBudgets.phase,
      semantics: 'structural',
    },
    learningAction: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.learningAction,
      legacyMaxChars: deferredAutonomyContinuityBudgets.learningAction,
      semantics: 'structural',
    },
    reason: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.reasonCode,
      legacyMaxChars: 220,
      semantics: 'structural',
    },
    reasonCode: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.reasonCode,
      legacyMaxChars: 220,
      semantics: 'structural',
    },
    deferReason: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.deferReason,
      legacyMaxChars: deferredAutonomyContinuityBudgets.deferReason,
      semantics: 'canonical-free-text',
    },
    threadId: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.threadId,
      legacyMaxChars: 160,
      semantics: 'structural',
    },
    intentId: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.intentId,
      legacyMaxChars: 80,
      semantics: 'structural',
    },
    sourceThreadId: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.threadId,
      legacyMaxChars: 160,
      semantics: 'structural',
    },
    sourceThoughtThreadId: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.threadId,
      legacyMaxChars: 160,
      semantics: 'structural',
    },
    sourceConcernId: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.threadId,
      legacyMaxChars: 160,
      semantics: 'structural',
    },
    executionIntentKind: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.intentId,
      legacyMaxChars: 80,
      semantics: 'structural',
    },
    executionIntentSummary: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.executionIntentSummary,
      legacyMaxChars: deferredAutonomyContinuityBudgets.executionIntentSummary,
      semantics: 'canonical-free-text',
    },
    targetThreadId: {
      canonicalMaxChars: deferredAutonomyContinuityBudgets.threadId,
      legacyMaxChars: 160,
      semantics: 'structural',
    },
  },
  failure: {
    canonicalMaxChars: deferredAutonomyContinuityBudgets.failure,
    legacyMaxChars: deferredAutonomyContinuityBudgets.failure,
    semantics: 'typed-failure',
  },
  learningFocuses: {
    itemCanonicalMaxChars: 120,
    itemLegacyMaxChars: 120,
    maxItems: 4,
  },
} as const

export interface BuildDeferredAutonomyCanonicalSignalInput {
  createdAt: number
  deferReason: string
  executionIntentKind: string
  executionIntentSummary: string
  failure: string | null
  intentId: string
  reasonCode: string
  scenario: string
  source: 'proactive-deferred' | 'proactive-held-autonomy'
  sourceConcernId: string
  sourceThreadId: string
  sourceThoughtThreadId: string
  summary: string | null
  summaryOwner: DeferredAutonomySummaryOwner | null
  targetThreadId: string
  threadId: string
  turnId: string
  whyNow: string
}

export interface DeferredAutonomyCanonicalSignalRecord {
  createdAt: number
  kind: 'proactive'
  label: string
  metadata: Record<string, unknown>
  signature: string
  state: 'observed' | 'pending'
  summary: string | null
}

export function buildDeferredAutonomyCanonicalSignal(
  input: BuildDeferredAutonomyCanonicalSignalInput,
): DeferredAutonomyCanonicalSignalRecord {
  const subject = input.source === 'proactive-deferred'
    ? input.scenario || 'general'
    : input.intentId || input.scenario || 'general'
  const deferReason = normalizeDeferredAutonomyCanonicalFreeText(
    input.deferReason,
    deferredAutonomyContinuityBudgets.deferReason,
  )
  const whyNow = normalizeDeferredAutonomyCanonicalFreeText(
    input.whyNow,
    deferredAutonomyContinuityBudgets.whyNow,
  )
  const executionIntentSummary = normalizeDeferredAutonomyCanonicalFreeText(
    input.executionIntentSummary,
    deferredAutonomyContinuityBudgets.executionIntentSummary,
  )
  const failure = normalizeDeferredAutonomyTypedFailure(input.failure)
  const summaryOwner = failure
    ? 'failure'
    : input.summaryOwner === 'failure'
      ? null
      : input.summaryOwner
  const summary = failure || (
    summaryOwner === 'why-now'
      ? whyNow
      : summaryOwner === 'execution-intent'
        ? executionIntentSummary
        : normalizeDeferredAutonomyCanonicalFreeText(
            input.summary,
            deferredAutonomyContinuityBudgets.whyNow,
          )
  )
  const structuredDeferReason = deferReason && deferReason !== failure
    ? deferReason
    : null

  return {
    kind: 'proactive',
    state: input.source === 'proactive-deferred' ? 'pending' : 'observed',
    label: `proactive:${subject}:${input.source === 'proactive-deferred' ? 'deferred' : 'held-autonomy'}`,
    summary: summary || null,
    signature: [
      input.source,
      input.turnId || 'turn',
      input.threadId || 'global',
      subject,
    ].join(':'),
    createdAt: input.createdAt,
    metadata: {
      canonicalVersion: deferredAutonomyCanonicalVersion,
      source: input.source,
      turnId: input.turnId || null,
      scenario: input.scenario || null,
      reason: input.reasonCode || null,
      reasonCode: input.reasonCode || null,
      threadId: input.threadId || null,
      intentId: input.intentId || null,
      executionIntentKind: input.executionIntentKind || null,
      deferredAt: input.createdAt,
      deferReason: structuredDeferReason,
      failure: failure || null,
      summaryOwner,
      whyNow: whyNow || null,
      executionIntentSummary: executionIntentSummary || null,
      sourceThreadId: input.sourceThreadId || null,
      sourceThoughtThreadId: input.sourceThoughtThreadId || null,
      sourceConcernId: input.sourceConcernId || null,
      targetThreadId: input.targetThreadId || null,
    },
  }
}

export function normalizeDeferredAutonomyRawText(value: unknown) {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, ' ')
    : ''
}

export function normalizeDeferredAutonomyCanonicalText(
  value: unknown,
  maxChars: number = deferredAutonomyContinuityBudgets.executionIntentSummary,
) {
  return normalizeDeferredAutonomyRawText(value).slice(0, maxChars)
}

const historicalContinuityGovernanceFingerprints = new Set([
  '40:fd39cad0',
  '46:48ddcc05',
])

const legacyPreviousGovernanceMarkerPattern
  = /(?:^|[^\p{L}\p{N}_])legacy_previous_governance(?:$|[^\p{L}\p{N}_])/iu

export function containsLegacyPreviousGovernanceMarker(raw: unknown) {
  return typeof raw === 'string'
    && legacyPreviousGovernanceMarkerPattern.test(raw)
}

function fingerprintHistoricalContinuityGovernanceText(raw: string) {
  const normalized = normalizeDeferredAutonomyRawText(raw).toLowerCase()
  let hash = 2_166_136_261
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619) >>> 0
  }
  return `${normalized.length}:${hash.toString(16).padStart(8, '0')}`
}

export function isHistoricalContinuityGovernanceText(raw: unknown) {
  if (typeof raw !== 'string')
    return false
  const normalized = normalizeDeferredAutonomyRawText(raw).toLowerCase()
  return historicalContinuityGovernanceFingerprints.has(
    fingerprintHistoricalContinuityGovernanceText(normalized),
  )
  || containsLegacyPreviousGovernanceMarker(normalized)
}

export function normalizeDeferredAutonomyCanonicalFreeText(
  value: unknown,
  maxChars: number = deferredAutonomyContinuityBudgets.executionIntentSummary,
) {
  const normalized = normalizeDeferredAutonomyRawText(value)
  if (!normalized || isHistoricalContinuityGovernanceText(normalized))
    return ''

  const direct = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  if (direct)
    return direct

  return normalized
    .split(/\s*(?:[。.!?！？]\s*|\|\s*|;\s*)/u)
    .map(fragment => sanitizeAlicizationProviderFacingText(
      fragment,
      Math.min(260, maxChars),
      '',
    ))
    .filter(Boolean)
    .join(' | ')
    .slice(0, maxChars)
}

export function normalizeDeferredAutonomyTypedFailure(value: unknown) {
  return normalizeDeferredAutonomyRawText(value)
    .slice(0, deferredAutonomyContinuityBudgets.failure)
}

export function normalizeDeferredAutonomyCanonicalDeferReason(raw: unknown) {
  return normalizeDeferredAutonomyCanonicalFreeText(
    raw,
    deferredAutonomyContinuityBudgets.deferReason,
  )
}

const directEnglishProviderFailurePatterns = [
  /^provider unavailable[.!]?$/iu,
  /^provider returned http\s+[45]\d{2}(?:\s*:\s*[^\r\n]{1,560})?[.!]?$/iu,
  /^provider authentication failed[.!]?$/iu,
  /^provider request timed out(?:\s*:\s*[^\r\n]{1,560})?[.!]?$/iu,
  /^provider request failed\s*:\s*[^\r\n]{1,560}[.!]?$/iu,
  /^(?:embedding\s+)?provider failed with http(?:\s+status)?\s*(?:code\s*)?[45]\d{2}(?:\s*:\s*[^\r\n]{1,560})?[.!]?$/iu,
  /^provider error\s*:\s*[^\r\n]{1,560}[.!]?$/iu,
  /^provider timed?\s*out[.!]?$/iu,
] as const

const directEnglishRequestFailurePatterns = [
  /^request timed?\s*out while contacting the provider[.!]?$/iu,
] as const

const directEnglishToolFailurePatterns = [
  /^(?:filesystem\s+)?tool call timed?\s*out(?:\s+after\s+\d+(?:\.\d+)?\s*(?:ms|milliseconds?|seconds?|minutes?))?[.!]?$/iu,
  /^(?:filesystem\s+)?tool call timeout[.!]?$/iu,
  /^(?:filesystem\s+)?tool call failed\s*:\s*[^\r\n]{1,560}[.!]?$/iu,
  /^(?:filesystem\s+)?tool error\s*:\s*[^\r\n]{1,560}[.!]?$/iu,
  /^(?:filesystem\s+)?tool timed?\s*out[.!]?$/iu,
  /^(?:filesystem\s+)?tool execution (?:was\s+)?(?:failed|aborted|blocked|cancelled)[.!]?$/iu,
  /^(?:filesystem\s+)?tool failed with (?:permission|access) denied[.!]?$/iu,
  /^(?:filesystem\s+)?tool (?:permission|access) denied[.!]?$/iu,
] as const

const directChineseInfrastructureFailurePatterns = [
  /^(?:provider|工具)\s*(?:(?:请求|调用|执行)\s*)?(?:失败|错误|出错|超时|中止|被拒绝)(?:\s*[：:]\s*[^。.!！?？\r\n]{1,560})?[。.!！]?$/iu,
  /^提供方(?:认证|鉴权)(?:失败|被拒绝)[。.!！]?$/u,
  /^上游不可用[。.!！]?$/u,
  /^上游返回\s*HTTP\s*[45]\d{2}[。.!！]?$/iu,
] as const

const operationalFailureDetailParts = [
  { pattern: /^upstream\b/iu, isEvidence: false },
  { pattern: /^(?:connection\s+)?reset(?:\s+by\s+peer)?\b/iu, isEvidence: true },
  { pattern: /^(?:connection\s+)?refused\b/iu, isEvidence: true },
  { pattern: /^(?:request\s+)?timed?\s*out\b/iu, isEvidence: true },
  { pattern: /^timeout\b/iu, isEvidence: true },
  { pattern: /^unavailable\b/iu, isEvidence: true },
  { pattern: /^(?:auth|authentication)\s+(?:failed|failure|denied)\b/iu, isEvidence: true },
  { pattern: /^(?:permission|access)\s+denied\b/iu, isEvidence: true },
  { pattern: /^(?:http(?:\s+status)?\s*(?:code\s*)?|status\s+)[45]\d{2}\b/iu, isEvidence: true },
  { pattern: /^(?:\d{1,3}\.){3}\d{1,3}:\d{1,5}\b/u, isEvidence: true },
  { pattern: /^https?:\/\/[^\s,;|]+/iu, isEvidence: true },
  { pattern: /^\/[^\s,;|]+/u, isEvidence: true },
  { pattern: /^[a-z]:\\[^\s,;|]+/iu, isEvidence: true },
  { pattern: /^上游/u, isEvidence: false },
  { pattern: /^返回\s*HTTP\s*[45]\d{2}/iu, isEvidence: true },
  { pattern: /^不可用/u, isEvidence: true },
  { pattern: /^(?:连接)?被重置/u, isEvidence: true },
  { pattern: /^连接被拒绝/u, isEvidence: true },
  { pattern: /^(?:连接|请求|调用)?超时/u, isEvidence: true },
  { pattern: /^(?:网络|服务|Provider)不可用/iu, isEvidence: true },
  { pattern: /^(?:认证|鉴权)(?:失败|被拒绝)/u, isEvidence: true },
  { pattern: /^(?:权限|访问)被拒绝/u, isEvidence: true },
  { pattern: /^HTTP\s*[45]\d{2}/iu, isEvidence: true },
] as const

function hasInferableDirectFailureDetail(text: string) {
  const separatorIndex = text.search(/[:：]/u)
  if (separatorIndex < 0)
    return true

  let remaining = text
    .slice(separatorIndex + 1)
    .trim()
    .replace(/[。.!！?？]+$/u, '')
  let hasEvidence = false
  while (remaining) {
    remaining = remaining
      .trimStart()
      .replace(/^(?:[,;|，；]\s*)+/u, '')
    if (!remaining)
      break

    const matchedPart = operationalFailureDetailParts
      .map(part => ({
        ...part,
        match: part.pattern.exec(remaining),
      }))
      .find(part => part.match)
    if (!matchedPart?.match)
      return false

    hasEvidence ||= matchedPart.isEvidence
    remaining = remaining.slice(matchedPart.match[0].length)
  }

  return hasEvidence
}

function isDirectInfrastructureFailure(text: string) {
  const matchesDirectFailureGrammar = [
    ...directEnglishProviderFailurePatterns,
    ...directEnglishRequestFailurePatterns,
    ...directEnglishToolFailurePatterns,
    ...directChineseInfrastructureFailurePatterns,
  ].some(pattern => pattern.test(text))
  return matchesDirectFailureGrammar && hasInferableDirectFailureDetail(text)
}

function uniqueTexts(texts: readonly string[]) {
  return Array.from(new Set(texts))
}

function normalizeInferredFailureCandidate(value: unknown) {
  const failureProbe = normalizeDeferredAutonomyCanonicalText(
    value,
    deferredAutonomyContinuityBudgets.failure + 1,
  )
  if (
    !failureProbe
    || failureProbe.length > deferredAutonomyContinuityBudgets.failure
    || !isDirectInfrastructureFailure(failureProbe)
  ) {
    return ''
  }
  return failureProbe
}

export function readDeferredAutonomySummaryOwner(raw: unknown): DeferredAutonomySummaryOwner | null {
  return raw === 'failure'
    || raw === 'why-now'
    || raw === 'execution-intent'
    ? raw
    : null
}

export function validateDeferredAutonomyCanonicalSummary(
  input: {
    canonicalVersion?: unknown
    executionIntentSummary?: unknown
    failure?: unknown
    summary?: unknown
    summaryOwner?: unknown
    whyNow?: unknown
  },
): DeferredAutonomyCanonicalSummaryValidation {
  const isCanonicalVersion = input.canonicalVersion === deferredAutonomyCanonicalVersion
  const failClosed = {
    executionIntentSummary: null,
    failure: null,
    isCanonicalVersion,
    isValid: false,
    summary: null,
    summaryOwner: null,
    whyNow: null,
  } satisfies DeferredAutonomyCanonicalSummaryValidation
  if (!isCanonicalVersion)
    return failClosed

  const summaryOwner = readDeferredAutonomySummaryOwner(input.summaryOwner)
  const hasUnknownSummaryOwner = input.summaryOwner != null
    && input.summaryOwner !== ''
    && !summaryOwner
  if (hasUnknownSummaryOwner)
    return failClosed

  const failure = normalizeDeferredAutonomyTypedFailure(input.failure)
  const summary = normalizeDeferredAutonomyRawText(input.summary)
  const whyNow = normalizeDeferredAutonomyRawText(input.whyNow)
  const executionIntentSummary = normalizeDeferredAutonomyRawText(input.executionIntentSummary)
  if (failure) {
    const safeWhyNow = whyNow.length <= deferredAutonomyContinuityBudgets.whyNow
      && !isHistoricalContinuityGovernanceText(whyNow)
      ? whyNow
      : ''
    const safeExecutionIntentSummary = executionIntentSummary.length
      <= deferredAutonomyContinuityBudgets.executionIntentSummary
      && !isHistoricalContinuityGovernanceText(executionIntentSummary)
      ? executionIntentSummary
      : ''
    return {
      executionIntentSummary: safeExecutionIntentSummary || null,
      failure,
      isCanonicalVersion: true,
      isValid: true,
      summary: failure,
      summaryOwner: 'failure',
      whyNow: safeWhyNow || null,
    }
  }

  if (
    summary.length > deferredAutonomyContinuityBudgets.whyNow
    || whyNow.length > deferredAutonomyContinuityBudgets.whyNow
    || executionIntentSummary.length > deferredAutonomyContinuityBudgets.executionIntentSummary
  ) {
    return failClosed
  }

  const safeWhyNow = isHistoricalContinuityGovernanceText(whyNow) ? '' : whyNow
  const safeExecutionIntentSummary = isHistoricalContinuityGovernanceText(executionIntentSummary)
    ? ''
    : executionIntentSummary
  if (summaryOwner === 'failure')
    return failClosed
  if (summaryOwner === 'execution-intent') {
    if (
      !safeExecutionIntentSummary
      || isHistoricalContinuityGovernanceText(summary)
      || summary !== executionIntentSummary
    ) {
      return failClosed
    }
    return {
      executionIntentSummary: safeExecutionIntentSummary,
      failure: null,
      isCanonicalVersion: true,
      isValid: true,
      summary,
      summaryOwner,
      whyNow: safeWhyNow || null,
    }
  }
  if (summaryOwner === 'why-now') {
    if (
      !safeWhyNow
      || isHistoricalContinuityGovernanceText(summary)
      || summary !== whyNow
    ) {
      return failClosed
    }
    return {
      executionIntentSummary: safeExecutionIntentSummary || null,
      failure: null,
      isCanonicalVersion: true,
      isValid: true,
      summary,
      summaryOwner,
      whyNow: safeWhyNow,
    }
  }

  if (summary || whyNow || executionIntentSummary)
    return failClosed

  return {
    ...failClosed,
    isValid: true,
  }
}

export function resolveDeferredAutonomySummary(input: ResolveDeferredAutonomySummaryInput) {
  const whyNow = normalizeDeferredAutonomyCanonicalFreeText(
    input.whyNow,
    deferredAutonomyContinuityBudgets.whyNow,
  )
  const executionIntentSummary = normalizeDeferredAutonomyCanonicalFreeText(
    input.executionIntentSummary,
    deferredAutonomyContinuityBudgets.executionIntentSummary,
  )
  const ownerTexts: Array<{
    owner: Exclude<DeferredAutonomySummaryOwner, 'failure'>
    text: string
    inferenceSource: unknown
  }> = input.mode === 'deferred'
    ? [
        {
          owner: 'why-now',
          text: whyNow,
          inferenceSource: input.inferenceSources?.whyNow ?? input.whyNow,
        },
        {
          owner: 'execution-intent',
          text: executionIntentSummary,
          inferenceSource: input.inferenceSources?.executionIntentSummary ?? input.executionIntentSummary,
        },
      ]
    : [
        {
          owner: 'execution-intent',
          text: executionIntentSummary,
          inferenceSource: input.inferenceSources?.executionIntentSummary ?? input.executionIntentSummary,
        },
        {
          owner: 'why-now',
          text: whyNow,
          inferenceSource: input.inferenceSources?.whyNow ?? input.whyNow,
        },
      ]
  const ownerFailures = ownerTexts
    .map(entry => normalizeInferredFailureCandidate(entry.inferenceSource))
    .filter(Boolean)
  const explicitFailure = normalizeDeferredAutonomyTypedFailure(
    input.explicitFailure,
  )
  const candidateFailures = (
    input.inferenceSources?.failureCandidates
    ?? input.failureCandidates
    ?? []
  )
    .map(normalizeInferredFailureCandidate)
    .filter(Boolean)
  const failure = normalizeDeferredAutonomyTypedFailure(
    uniqueTexts([
      explicitFailure,
      ...ownerFailures,
      ...candidateFailures,
    ].filter(Boolean)).join(' | '),
  ) || null
  if (failure) {
    return {
      summary: failure,
      failure,
      summaryOwner: 'failure' as const,
    }
  }

  const summaryEntry = ownerTexts.find(entry => Boolean(entry.text))
  return {
    summary: summaryEntry?.text ?? null,
    failure: null,
    summaryOwner: summaryEntry?.owner ?? null,
  }
}
