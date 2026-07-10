import type { AlicizationChatStartPayload } from './eventa'

import {
  containsAlicizationFixedTemplateResidue,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

type JsonSafeValue
  = | null
    | string
    | number
    | boolean
    | JsonSafeValue[]
    | { [key: string]: JsonSafeValue }

export interface AlicizationChatTransportSanitizationReport {
  changed: boolean
  droppedCount: number
  coercedCount: number
  droppedPaths: string[]
  coercedPaths: string[]
}

const maxReportedPaths = 12

const preDialogueSendIdentityTextKeys = [
  'summaryLine',
  'awarenessLine',
  'companionHeadlineLine',
  'companionBriefingLine',
  'companionNextClosureLine',
  'emotionalClosureCue',
] as const

function recordPath(target: string[], path: string) {
  if (target.length < maxReportedPaths)
    target.push(path)
}

function sanitizeScalar(value: unknown, path: string, report: AlicizationChatTransportSanitizationReport): JsonSafeValue | undefined {
  if (value === null)
    return null

  if (typeof value === 'string' || typeof value === 'boolean')
    return value

  if (typeof value === 'number') {
    if (Number.isFinite(value))
      return value
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return String(value)
  }

  if (typeof value === 'bigint') {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return value.toString()
  }

  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol') {
    report.changed = true
    report.droppedCount += 1
    recordPath(report.droppedPaths, path)
    return undefined
  }

  return null
}

function sanitizeJsonSafeValue(
  value: unknown,
  path: string,
  report: AlicizationChatTransportSanitizationReport,
  seen: WeakSet<object>,
): JsonSafeValue | undefined {
  const scalar = sanitizeScalar(value, path, report)
  if (scalar !== null || value == null || typeof value !== 'object')
    return scalar

  if (seen.has(value)) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return '[Circular]'
  }
  seen.add(value)

  if (Array.isArray(value)) {
    const next: JsonSafeValue[] = []
    value.forEach((entry, index) => {
      const sanitized = sanitizeJsonSafeValue(entry, `${path}[${index}]`, report, seen)
      if (sanitized !== undefined)
        next.push(sanitized)
    })
    return next
  }

  if (value instanceof Date) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return value.toISOString()
  }

  if (value instanceof URL) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return value.toString()
  }

  if (value instanceof Map) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    const next: Record<string, JsonSafeValue> = {}
    for (const [entryKey, entryValue] of value.entries()) {
      const key = typeof entryKey === 'string' ? entryKey : String(entryKey)
      const sanitized = sanitizeJsonSafeValue(entryValue, `${path}.${key}`, report, seen)
      if (sanitized !== undefined)
        next[key] = sanitized
    }
    return next
  }

  if (value instanceof Set) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    const next: JsonSafeValue[] = []
    let index = 0
    for (const entry of value.values()) {
      const sanitized = sanitizeJsonSafeValue(entry, `${path}[${index}]`, report, seen)
      if (sanitized !== undefined)
        next.push(sanitized)
      index += 1
    }
    return next
  }

  if (value instanceof RegExp) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return value.toString()
  }

  if (value instanceof Error) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return {
      name: value.name,
      message: value.message,
    }
  }

  if (value instanceof ArrayBuffer) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return Array.from(new Uint8Array(value))
  }

  if (ArrayBuffer.isView(value)) {
    report.changed = true
    report.coercedCount += 1
    recordPath(report.coercedPaths, path)
    return Array.from(new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength)))
  }

  const next: Record<string, JsonSafeValue> = {}
  for (const [entryKey, entryValue] of Object.entries(value)) {
    const sanitized = sanitizeJsonSafeValue(entryValue, `${path}.${entryKey}`, report, seen)
    if (sanitized !== undefined)
      next[entryKey] = sanitized
  }
  return next
}

function sanitizeToCloneSafeJson<T>(value: T, path: string): { value: T, report: AlicizationChatTransportSanitizationReport } {
  const report: AlicizationChatTransportSanitizationReport = {
    changed: false,
    droppedCount: 0,
    coercedCount: 0,
    droppedPaths: [],
    coercedPaths: [],
  }
  const sanitized = sanitizeJsonSafeValue(value, path, report, new WeakSet()) as T
  return {
    value: structuredClone(sanitized),
    report,
  }
}

function sanitizeProviderFacingTransportText(
  value: unknown,
  path: string,
  report: AlicizationChatTransportSanitizationReport,
  maxChars = 12000,
) {
  if (typeof value !== 'string')
    return value

  const sanitized = sanitizeAlicizationProviderFacingText(value, maxChars, '')
  if (sanitized && !containsAlicizationFixedTemplateResidue(sanitized))
    return sanitized

  report.changed = true
  report.droppedCount += 1
  recordPath(report.droppedPaths, path)
  return null
}

function sanitizeProviderFacingTransportTextArray(
  value: unknown,
  path: string,
  report: AlicizationChatTransportSanitizationReport,
) {
  if (!Array.isArray(value))
    return value

  const next: JsonSafeValue[] = []
  value.forEach((entry, index) => {
    const sanitized = sanitizeProviderFacingTransportText(entry, `${path}[${index}]`, report)
    if (sanitized != null)
      next.push(sanitized as JsonSafeValue)
  })
  if (next.length !== value.length)
    report.changed = true
  return next
}

function sanitizePreDialogueSendIdentityForTransport(
  payload: AlicizationChatStartPayload,
  report: AlicizationChatTransportSanitizationReport,
) {
  const identity = payload.preDialogueSendIdentity
  if (!identity || typeof identity !== 'object' || Array.isArray(identity))
    return payload

  const sanitizedIdentity = {
    ...identity,
  } as Record<string, unknown>

  for (const key of preDialogueSendIdentityTextKeys) {
    if (key in sanitizedIdentity) {
      sanitizedIdentity[key] = sanitizeProviderFacingTransportText(
        sanitizedIdentity[key],
        `payload.preDialogueSendIdentity.${key}`,
        report,
      )
    }
  }

  if ('reasonPreview' in sanitizedIdentity) {
    sanitizedIdentity.reasonPreview = sanitizeProviderFacingTransportTextArray(
      sanitizedIdentity.reasonPreview,
      'payload.preDialogueSendIdentity.reasonPreview',
      report,
    )
  }

  const projectState = sanitizedIdentity.projectState
  if (projectState && typeof projectState === 'object' && !Array.isArray(projectState)) {
    const sanitizedProjectState: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(projectState)) {
      sanitizedProjectState[key] = sanitizeProviderFacingTransportText(
        value,
        `payload.preDialogueSendIdentity.projectState.${key}`,
        report,
      )
    }
    sanitizedIdentity.projectState = sanitizedProjectState
  }

  return {
    ...payload,
    preDialogueSendIdentity: sanitizedIdentity as unknown as AlicizationChatStartPayload['preDialogueSendIdentity'],
  }
}

function describeContentKind(value: unknown): string {
  if (value == null)
    return 'null'
  if (Array.isArray(value))
    return 'array'
  if (value instanceof Date)
    return 'date'
  if (value instanceof Map)
    return 'map'
  if (value instanceof Set)
    return 'set'
  return typeof value
}

export function summarizeAlicizationChatStartPayloadForTransport(payload: AlicizationChatStartPayload) {
  const preDialogueSendIdentity = payload.preDialogueSendIdentity
  const hasPreDialogueSendIdentity = Boolean(
    preDialogueSendIdentity
    && typeof preDialogueSendIdentity === 'object'
    && !Array.isArray(preDialogueSendIdentity),
  )
  const preDialogueSendIdentityStatus = hasPreDialogueSendIdentity
    && typeof preDialogueSendIdentity?.status === 'string'
    ? preDialogueSendIdentity.status
    : null
  const hasPreDialogueSummaryLine = hasPreDialogueSendIdentity
    && typeof preDialogueSendIdentity?.summaryLine === 'string'
    && preDialogueSendIdentity.summaryLine.trim().length > 0
  const hasPreDialogueAwarenessLine = hasPreDialogueSendIdentity
    && typeof preDialogueSendIdentity?.awarenessLine === 'string'
    && preDialogueSendIdentity.awarenessLine.trim().length > 0
  const hasPreDialogueNextClosureLine = hasPreDialogueSendIdentity
    && typeof preDialogueSendIdentity?.companionNextClosureLine === 'string'
    && preDialogueSendIdentity.companionNextClosureLine.trim().length > 0
  const hasPreDialogueCompanionHeadlineLine = hasPreDialogueSendIdentity
    && typeof preDialogueSendIdentity?.companionHeadlineLine === 'string'
    && preDialogueSendIdentity.companionHeadlineLine.trim().length > 0
  const hasPreDialogueCompanionBriefingLine = hasPreDialogueSendIdentity
    && typeof preDialogueSendIdentity?.companionBriefingLine === 'string'
    && preDialogueSendIdentity.companionBriefingLine.trim().length > 0
  const hasPreDialogueEmotionalClosureCue = hasPreDialogueSendIdentity
    && typeof preDialogueSendIdentity?.emotionalClosureCue === 'string'
    && preDialogueSendIdentity.emotionalClosureCue.trim().length > 0
  const hasPreDialogueReasonPreview = hasPreDialogueSendIdentity
    && Array.isArray(preDialogueSendIdentity?.reasonPreview)
    && preDialogueSendIdentity.reasonPreview.some(reason => typeof reason === 'string' && reason.trim().length > 0)
  const hasPreDialogueProjectState = Boolean(
    hasPreDialogueSendIdentity
    && preDialogueSendIdentity?.projectState
    && typeof preDialogueSendIdentity.projectState === 'object'
    && !Array.isArray(preDialogueSendIdentity.projectState),
  )
  const hasPreDialogueProjectIdentity = hasPreDialogueProjectState
    && typeof preDialogueSendIdentity?.projectState?.identity === 'string'
    && preDialogueSendIdentity.projectState.identity.trim().length > 0
  const hasPreDialogueProjectPhase = hasPreDialogueProjectState
    && typeof preDialogueSendIdentity?.projectState?.currentPhase === 'string'
    && preDialogueSendIdentity.projectState.currentPhase.trim().length > 0
  const hasPreDialogueLatestLandedProgress = hasPreDialogueProjectState
    && (
      (typeof preDialogueSendIdentity?.projectState?.latestLandedProgress === 'string'
        && preDialogueSendIdentity.projectState.latestLandedProgress.trim().length > 0)
      || (typeof preDialogueSendIdentity?.projectState?.latestProgress === 'string'
        && preDialogueSendIdentity.projectState.latestProgress.trim().length > 0)
    )
  const hasPreDialoguePrimaryOpenLoop = hasPreDialogueProjectState
    && typeof preDialogueSendIdentity?.projectState?.primaryOpenLoop === 'string'
    && preDialogueSendIdentity.projectState.primaryOpenLoop.trim().length > 0
  const hasPreDialogueNextClosureTarget = hasPreDialogueProjectState
    && typeof preDialogueSendIdentity?.projectState?.nextClosureTarget === 'string'
    && preDialogueSendIdentity.projectState.nextClosureTarget.trim().length > 0
  const hasPreDialogueContinuitySummary = hasPreDialogueProjectState
    && typeof preDialogueSendIdentity?.projectState?.continuitySummary === 'string'
    && preDialogueSendIdentity.projectState.continuitySummary.trim().length > 0
  const hasPreDialogueSameHerSelfLine = hasPreDialogueProjectState
    && typeof preDialogueSendIdentity?.projectState?.sameHerSelfLine === 'string'
    && preDialogueSendIdentity.projectState.sameHerSelfLine.trim().length > 0
  const hasPreDialogueSameHerDriftRisk = hasPreDialogueProjectState
    && typeof preDialogueSendIdentity?.projectState?.sameHerDriftRisk === 'string'
    && preDialogueSendIdentity.projectState.sameHerDriftRisk.trim().length > 0
  const hasPreDialogueSameHerHoldDetail = hasPreDialogueProjectState
    && typeof preDialogueSendIdentity?.projectState?.sameHerHoldDetail === 'string'
    && preDialogueSendIdentity.projectState.sameHerHoldDetail.trim().length > 0
  const hasPreDialogueProactiveSameHerGap = hasPreDialogueProjectState
    && typeof preDialogueSendIdentity?.projectState?.proactiveSameHerGap === 'string'
    && preDialogueSendIdentity.projectState.proactiveSameHerGap.trim().length > 0
  return {
    providerConfigKeys: Object.keys(payload.providerConfig ?? {}),
    hasPreDialogueSendIdentity,
    preDialogueSendIdentityStatus,
    hasPreDialogueSummaryLine,
    hasPreDialogueAwarenessLine,
    hasPreDialogueNextClosureLine,
    hasPreDialogueCompanionHeadlineLine,
    hasPreDialogueCompanionBriefingLine,
    hasPreDialogueEmotionalClosureCue,
    hasPreDialogueReasonPreview,
    hasPreDialogueProjectState,
    hasPreDialogueProjectIdentity,
    hasPreDialogueProjectPhase,
    hasPreDialogueLatestLandedProgress,
    hasPreDialoguePrimaryOpenLoop,
    hasPreDialogueNextClosureTarget,
    hasPreDialogueContinuitySummary,
    hasPreDialogueSameHerSelfLine,
    hasPreDialogueSameHerDriftRisk,
    hasPreDialogueSameHerHoldDetail,
    hasPreDialogueProactiveSameHerGap,
    messageSchema: payload.messages.map(message => ({
      role: message.role,
      contentKind: describeContentKind(message.content),
      hasToolCallId: typeof message.toolCallId === 'string' && message.toolCallId.length > 0,
      hasToolName: typeof message.toolName === 'string' && message.toolName.length > 0,
    })),
  }
}

// NOTICE: Electron IPC uses structured clone, which rejects Vue/Pinia proxies and other non-plain objects.
// We normalize chat-start payloads into plain JSON-compatible data before crossing the renderer -> main boundary.
export function sanitizeAlicizationChatStartPayloadForTransport(payload: AlicizationChatStartPayload) {
  const result = sanitizeToCloneSafeJson(payload, 'payload')
  return {
    value: sanitizePreDialogueSendIdentityForTransport(result.value, result.report),
    report: result.report,
  }
}
