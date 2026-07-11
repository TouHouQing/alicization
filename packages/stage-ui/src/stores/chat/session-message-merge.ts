import type { ChatHistoryItem } from '../../types/chat'

import {
  alicizationFixedTemplateReplacement,
  formatAlicizationProjectStateAwarenessFields,
  isAlicizationThinProjectAwarenessLine,
  isAlicizationThinSamePhaseCarryLine as isThinSamePhaseCarryLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

function extractMessageContent(message: ChatHistoryItem) {
  if (typeof message.content === 'string')
    return message.content

  if (Array.isArray(message.content)) {
    return message.content.map((part) => {
      if (typeof part === 'string')
        return part
      if (part && typeof part === 'object' && 'text' in part)
        return String(part.text ?? '')
      return ''
    }).join('')
  }

  return ''
}

function structuredProjectFieldForKey(key: string, value: unknown) {
  switch (key) {
    case 'identity':
      return formatAlicizationProjectStateAwarenessFields({ identity: value })
    case 'currentPhase':
    case 'phase':
      return formatAlicizationProjectStateAwarenessFields({ currentPhase: value })
    case 'latestLandedProgress':
    case 'latestProgress':
    case 'landedProgressSummary':
      return formatAlicizationProjectStateAwarenessFields({ latestLandedProgress: value })
    case 'primaryOpenLoop':
    case 'openClosureSummary':
      return formatAlicizationProjectStateAwarenessFields({ primaryOpenLoop: value })
    case 'nextClosureTarget':
    case 'nextClosureTargetSummary':
    case 'companionNextClosureLine':
      return formatAlicizationProjectStateAwarenessFields({ nextClosureTarget: value })
    case 'sameHerSelfLine':
    case 'sameHerSummary':
      return formatAlicizationProjectStateAwarenessFields({ sameHerSelfLine: value })
    case 'sameHerHoldDetail':
    case 'companionBriefingLine':
      return formatAlicizationProjectStateAwarenessFields({ sameHerHoldDetail: value })
    case 'sameHerDriftRisk':
    case 'sameHerDriftRiskLine':
      return formatAlicizationProjectStateAwarenessFields({ sameHerDriftRisk: value })
    case 'emotionalClosureCue':
      return formatAlicizationProjectStateAwarenessFields({ emotionalClosureCue: value })
    case 'continuitySummary':
    case 'summaryLine':
    case 'awarenessLine':
    case 'companionHeadlineLine':
    case 'preDialogueAwarenessSummary':
      return formatAlicizationProjectStateAwarenessFields({ summary: value })
    default:
      return ''
  }
}

function sanitizeMergedStructuredProjectText(key: string, value: unknown, maxChars = 1600) {
  if (typeof value !== 'string')
    return value

  const normalized = value.trim().replace(/\s+/g, ' ').slice(0, Math.max(0, maxChars)).trim()
  if (!normalized)
    return value
  if ((key === 'currentPhase' || key === 'phase') && /\bphase\s*1\b|第一阶段|阶段一|project_phase=life_core/iu.test(normalized))
    return alicizationFixedTemplateReplacement

  const safe = sanitizeAlicizationProviderFacingText(normalized, maxChars, '')
  if (safe)
    return safe

  const structured = structuredProjectFieldForKey(key, normalized)
  return structured && structured !== alicizationFixedTemplateReplacement
    ? structured
    : alicizationFixedTemplateReplacement
}

function sanitizeMergedStructuredProjectPayload<T>(payload: T, parentKey = ''): T {
  if (typeof payload === 'string')
    return sanitizeMergedStructuredProjectText(parentKey, payload) as T
  if (Array.isArray(payload))
    return payload.map(item => sanitizeMergedStructuredProjectPayload(item, parentKey)) as T
  if (payload && typeof payload === 'object') {
    return Object.fromEntries(
      Object.entries(payload as Record<string, unknown>)
        .map(([key, value]) => [key, sanitizeMergedStructuredProjectPayload(value, key)]),
    ) as T
  }
  return payload
}

function normalizeMessageId(raw: unknown) {
  if (typeof raw !== 'string')
    return ''

  return raw.trim()
}

function extractStableTurnId(raw: unknown) {
  const normalized = normalizeMessageId(raw)
  if (!normalized)
    return ''

  const directMatch = normalized.match(/((?:chat|subconscious|reminder):[\w:-]+)/)
  return directMatch?.[1] ?? ''
}

function normalizeCreatedAt(raw: unknown) {
  return typeof raw === 'number' && Number.isFinite(raw)
    ? raw
    : null
}

function compareMessageOrder(left: ChatHistoryItem, right: ChatHistoryItem) {
  const leftCreatedAt = normalizeCreatedAt(left.createdAt) ?? 0
  const rightCreatedAt = normalizeCreatedAt(right.createdAt) ?? 0
  if (leftCreatedAt !== rightCreatedAt)
    return leftCreatedAt - rightCreatedAt

  const leftRole = String(left.role ?? '')
  const rightRole = String(right.role ?? '')
  if (leftRole !== rightRole) {
    if (leftRole === 'user')
      return -1
    if (rightRole === 'user')
      return 1
    return leftRole.localeCompare(rightRole)
  }

  return normalizeMessageId(left.id).localeCompare(normalizeMessageId(right.id))
}

function areMessageArraysStructurallyEqual(left: ChatHistoryItem[], right: ChatHistoryItem[]) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function getDuplicateToleranceMs(role: ChatHistoryItem['role']) {
  return role === 'assistant' ? 15_000 : 6_000
}

function getMessageRichnessScore(message: ChatHistoryItem) {
  let score = 0

  if (extractStableTurnId(message.id))
    score += 100

  const text = extractMessageContent(message).trim()
  if (text)
    score += Math.min(text.length, 80)

  if (message.role === 'assistant') {
    const assistant = message as Extract<ChatHistoryItem, { role: 'assistant' }>
    if (assistant.origin)
      score += 8
    if (assistant.structured?.reply?.trim())
      score += 16
    if (assistant.structured?.thought?.trim())
      score += 12
    score += assistant.slices?.length ?? 0
    score += assistant.tool_results?.length ?? 0
  }

  if (normalizeCreatedAt(message.createdAt) !== null)
    score += 1

  return score
}

function choosePreferredMessage(left: ChatHistoryItem, right: ChatHistoryItem) {
  const leftScore = getMessageRichnessScore(left)
  const rightScore = getMessageRichnessScore(right)
  if (rightScore > leftScore)
    return { primary: right, secondary: left }
  return { primary: left, secondary: right }
}

function cloneValue<T>(value: T): T {
  if (value === undefined)
    return value

  return JSON.parse(JSON.stringify(value)) as T
}

function preferNonEmpty<T>(preferred: T | null | undefined, fallback: T | null | undefined) {
  if (preferred === undefined || preferred === null)
    return fallback
  if (typeof preferred === 'string' && preferred.trim() === '')
    return fallback
  return preferred
}

function preferMergedAwarenessSummaryLine(
  preferred: string | null | undefined,
  fallback: string | null | undefined,
) {
  const preferredLine = preferNonEmpty(preferred, fallback)
  const fallbackLine = preferNonEmpty(fallback, preferred)
  if (typeof preferredLine !== 'string' || preferredLine.trim() === '')
    return fallbackLine ?? null
  if (typeof fallbackLine !== 'string' || fallbackLine.trim() === '')
    return preferredLine

  return isThinMergedAwarenessLine(preferredLine)
    && !isThinMergedAwarenessLine(fallbackLine)
    ? fallbackLine
    : preferredLine
}

function resolveMergedAwarenessSummaryLine(input: {
  preferredSummaryLine: string | null | undefined
  fallbackSummaryLine: string | null | undefined
  preferredAwarenessLine: string | null | undefined
  fallbackAwarenessLine: string | null | undefined
  preferredCompanionBriefingLine: string | null | undefined
  fallbackCompanionBriefingLine: string | null | undefined
}) {
  const mergedSummaryLine = preferMergedAwarenessSummaryLine(
    input.preferredSummaryLine,
    input.fallbackSummaryLine,
  )
  if (!isThinMergedAwarenessLine(mergedSummaryLine))
    return mergedSummaryLine

  return [
    preferNonEmpty(input.preferredAwarenessLine, null),
    preferNonEmpty(input.preferredCompanionBriefingLine, null),
    preferNonEmpty(input.fallbackAwarenessLine, null),
    preferNonEmpty(input.fallbackCompanionBriefingLine, null),
  ].find((value): value is string => Boolean(
    value
    && !isThinMergedAwarenessLine(value)
    && carriesBroaderMergedProjectFrame(value),
  )) ?? mergedSummaryLine
}

function isThinMergedAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return true

  return isAlicizationThinProjectAwarenessLine(normalized)
    || normalized.includes('generic continuity reminder')
    || normalized.includes('generic awareness reminder')
    || normalized.includes('generic awareness summary')
    || normalized.includes('generic same-her reminder')
}

function isSameHerInwardLowPressureHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return (
    normalized.includes('embodiment_status')
    && normalized.includes('low-pressure-inward-carry')
  ) || (
    normalized.includes('holding together mainly through')
    && normalized.includes('low-pressure')
    && (
      normalized.includes('same line inward')
      || normalized.includes('same living line')
      || normalized.includes('same-her-inward-carry')
      || normalized.includes('quiet-companionship')
    )
  )
}

function buildCompactSameHerInwardLowPressureAwarenessLine() {
  return 'embodiment_lanes=body+face+motion; missing_lanes=lipsync+voice; status=partial; evidence=low-pressure-inward-carry; source=companion_briefing'
}

function isAnthropomorphicHostFacingSameHerHeadline(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return false

  return normalized.includes('anthropomorphic emotional closure')
    && (normalized.includes('same-her inward-carry observability') || normalized.includes('continuity inward-carry observability'))
    && normalized.includes('measured-return')
}

function buildCompactAnthropomorphicHostFacingAwarenessLine() {
  return 'emotional_closure=anthropomorphic_emotional_closure; evidence=inward_carry; timing=measured_return; source=companion_briefing'
}

function carriesBroaderMergedProjectFrame(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim() : ''
  if (!normalized)
    return false

  return /\b(?:project|life loop|closure pressure|still-open|what has landed|what has already landed)\b/i.test(normalized)
    || /数字生命项目|闭环|主线/u.test(normalized)
}

function preferMergedCompanionBriefingLine(
  preferred: string | null | undefined,
  fallback: string | null | undefined,
) {
  const preferredLine = preferNonEmpty(preferred, fallback)
  const fallbackLine = preferNonEmpty(fallback, preferred)
  if (typeof preferredLine !== 'string' || preferredLine.trim() === '')
    return fallbackLine ?? null
  if (typeof fallbackLine !== 'string' || fallbackLine.trim() === '')
    return preferredLine

  return isThinMergedAwarenessLine(preferredLine)
    && carriesBroaderMergedProjectFrame(fallbackLine)
    ? fallbackLine
    : preferredLine
}

function isThinMergedNextClosureLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return true

  return normalized.includes('generic next target')
    || normalized.includes('generic next closure')
    || normalized.includes('generic closure shell')
    || normalized.includes('generic closure summary')
    || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
}

function preferMergedNextClosureLine(
  preferred: string | null | undefined,
  fallback: string | null | undefined,
) {
  const preferredLine = preferNonEmpty(preferred, fallback)
  const fallbackLine = preferNonEmpty(fallback, preferred)
  if (typeof preferredLine !== 'string' || preferredLine.trim() === '')
    return fallbackLine ?? null
  if (typeof fallbackLine !== 'string' || fallbackLine.trim() === '')
    return preferredLine

  return isThinMergedNextClosureLine(preferredLine)
    && !isThinMergedNextClosureLine(fallbackLine)
    ? fallbackLine
    : preferredLine
}

function mergeReasonPreview(
  preferred: string[] | null | undefined,
  fallback: string[] | null | undefined,
) {
  const merged: string[] = []
  const seen = new Set<string>()

  for (const reasons of [preferred, fallback]) {
    if (!Array.isArray(reasons))
      continue

    for (const rawReason of reasons) {
      if (typeof rawReason !== 'string')
        continue

      const reason = rawReason.trim()
      if (!reason)
        continue

      const key = reason.toLowerCase()
      if (seen.has(key))
        continue

      seen.add(key)
      merged.push(reason)
    }
  }

  return merged
}

function preferMergedSameHerHoldDetailLine(
  awarenessLine: string | null | undefined,
  companionBriefingLine: string | null | undefined,
  sameHerHoldDetail: string | null | undefined,
) {
  const normalizedHoldDetail = typeof sameHerHoldDetail === 'string' ? sameHerHoldDetail.trim() : ''
  if (!normalizedHoldDetail)
    return null

  const shouldPreferHoldDetail = (
    isThinMergedAwarenessLine(awarenessLine)
    || isThinMergedAwarenessLine(companionBriefingLine)
    || isThinSamePhaseCarryLine(awarenessLine)
    || isThinSamePhaseCarryLine(companionBriefingLine)
  )

  return shouldPreferHoldDetail
    ? normalizedHoldDetail
    : null
}

function resolveMergedSameHerInwardLowPressureAwarenessLine(input: {
  preferredAwarenessLine: string | null | undefined
  fallbackAwarenessLine: string | null | undefined
  preferredCompanionHeadlineLine: string | null | undefined
  fallbackCompanionHeadlineLine: string | null | undefined
  companionBriefingLine: string | null | undefined
}) {
  const companionBriefingLine = preferNonEmpty(input.companionBriefingLine, null)
  if (!companionBriefingLine)
    return null

  const preferredAwarenessLine = preferNonEmpty(input.preferredAwarenessLine, null)
  const fallbackAwarenessLine = preferNonEmpty(input.fallbackAwarenessLine, null)
  const preferredCompanionHeadlineLine = preferNonEmpty(input.preferredCompanionHeadlineLine, null)
  const fallbackCompanionHeadlineLine = preferNonEmpty(input.fallbackCompanionHeadlineLine, null)
  const repeatedHeadline = (
    (preferredAwarenessLine && preferredCompanionHeadlineLine && preferredAwarenessLine === preferredCompanionHeadlineLine)
    || (fallbackAwarenessLine && fallbackCompanionHeadlineLine && fallbackAwarenessLine === fallbackCompanionHeadlineLine)
  )
  const strongerHeadline = preferNonEmpty(preferredCompanionHeadlineLine, fallbackCompanionHeadlineLine)

  if (!repeatedHeadline || !strongerHeadline)
    return null
  if (!isThinSamePhaseCarryLine(companionBriefingLine))
    return null
  if (!isSameHerInwardLowPressureHeadline(strongerHeadline))
    return null

  return buildCompactSameHerInwardLowPressureAwarenessLine()
}

function resolveMergedAnthropomorphicHostFacingAwarenessLine(input: {
  preferredAwarenessLine: string | null | undefined
  fallbackAwarenessLine: string | null | undefined
  preferredCompanionHeadlineLine: string | null | undefined
  fallbackCompanionHeadlineLine: string | null | undefined
  companionBriefingLine: string | null | undefined
}) {
  const companionBriefingLine = preferNonEmpty(input.companionBriefingLine, null)
  if (!companionBriefingLine)
    return null

  const preferredAwarenessLine = preferNonEmpty(input.preferredAwarenessLine, null)
  const fallbackAwarenessLine = preferNonEmpty(input.fallbackAwarenessLine, null)
  const preferredCompanionHeadlineLine = preferNonEmpty(input.preferredCompanionHeadlineLine, null)
  const fallbackCompanionHeadlineLine = preferNonEmpty(input.fallbackCompanionHeadlineLine, null)
  const repeatedHeadline = (
    (preferredAwarenessLine && preferredCompanionHeadlineLine && preferredAwarenessLine === preferredCompanionHeadlineLine)
    || (fallbackAwarenessLine && fallbackCompanionHeadlineLine && fallbackAwarenessLine === fallbackCompanionHeadlineLine)
  )
  const strongerHeadline = preferNonEmpty(preferredCompanionHeadlineLine, fallbackCompanionHeadlineLine)

  if (!repeatedHeadline || !strongerHeadline)
    return null
  if (!isThinSamePhaseCarryLine(companionBriefingLine))
    return null
  if (!isAnthropomorphicHostFacingSameHerHeadline(strongerHeadline))
    return null

  return buildCompactAnthropomorphicHostFacingAwarenessLine()
}

function areMessagesEquivalent(left: ChatHistoryItem, right: ChatHistoryItem) {
  if (left.role !== right.role)
    return false

  const leftStableTurnId = extractStableTurnId(left.id)
  const rightStableTurnId = extractStableTurnId(right.id)
  if (leftStableTurnId && rightStableTurnId)
    return leftStableTurnId === rightStableTurnId

  if (left.role !== 'assistant' && left.role !== 'user')
    return false

  const leftText = extractMessageContent(left).trim()
  const rightText = extractMessageContent(right).trim()
  if (!leftText || leftText !== rightText)
    return false

  const leftCreatedAt = normalizeCreatedAt(left.createdAt)
  const rightCreatedAt = normalizeCreatedAt(right.createdAt)
  if (leftCreatedAt === null || rightCreatedAt === null)
    return false

  if (leftStableTurnId || rightStableTurnId)
    return Math.abs(leftCreatedAt - rightCreatedAt) <= getDuplicateToleranceMs(left.role)

  return leftCreatedAt === rightCreatedAt
}

function mergeEquivalentMessages(left: ChatHistoryItem, right: ChatHistoryItem): ChatHistoryItem {
  const { primary, secondary } = choosePreferredMessage(left, right)
  const merged = {
    ...cloneValue(secondary),
    ...cloneValue(primary),
  } as ChatHistoryItem

  const primaryStableTurnId = extractStableTurnId(primary.id)
  const secondaryStableTurnId = extractStableTurnId(secondary.id)
  merged.id = primaryStableTurnId
    || secondaryStableTurnId
    || normalizeMessageId(primary.id)
    || normalizeMessageId(secondary.id)
    || undefined
  if (!merged.id)
    delete merged.id

  const primaryCreatedAt = normalizeCreatedAt(primary.createdAt)
  const secondaryCreatedAt = normalizeCreatedAt(secondary.createdAt)
  merged.createdAt = primaryCreatedAt
    ?? secondaryCreatedAt
    ?? merged.createdAt
  if (merged.createdAt === undefined)
    delete merged.createdAt

  const primaryText = extractMessageContent(primary).trim()
  const secondaryText = extractMessageContent(secondary).trim()
  if (!primaryText && secondaryText)
    merged.content = cloneValue(secondary.content)

  if (merged.role === 'assistant') {
    const primaryAssistant = primary as Extract<ChatHistoryItem, { role: 'assistant' }>
    const secondaryAssistant = secondary as Extract<ChatHistoryItem, { role: 'assistant' }>
    const mergedAssistant = merged as Extract<ChatHistoryItem, { role: 'assistant' }>

    mergedAssistant.origin = primaryAssistant.origin ?? secondaryAssistant.origin
    mergedAssistant.slices = (primaryAssistant.slices?.length ?? 0) >= (secondaryAssistant.slices?.length ?? 0)
      ? cloneValue(primaryAssistant.slices) ?? []
      : cloneValue(secondaryAssistant.slices) ?? []
    mergedAssistant.tool_results = (primaryAssistant.tool_results?.length ?? 0) >= (secondaryAssistant.tool_results?.length ?? 0)
      ? cloneValue(primaryAssistant.tool_results) ?? []
      : cloneValue(secondaryAssistant.tool_results) ?? []

    const primaryStructuredScore = primaryAssistant.structured?.thought?.trim()
      || primaryAssistant.structured?.reply?.trim()
      ? 1
      : 0
    const secondaryStructuredScore = secondaryAssistant.structured?.thought?.trim()
      || secondaryAssistant.structured?.reply?.trim()
      ? 1
      : 0
    const preferredStructured = primaryStructuredScore >= secondaryStructuredScore
      ? cloneValue(primaryAssistant.structured)
      : cloneValue(secondaryAssistant.structured)
    const fallbackStructured = primaryStructuredScore >= secondaryStructuredScore
      ? cloneValue(secondaryAssistant.structured)
      : cloneValue(primaryAssistant.structured)
    const rawMergedProjectState = preferredStructured?.projectState && fallbackStructured?.projectState
      ? {
          ...fallbackStructured.projectState,
          ...preferredStructured.projectState,
        }
      : preferredStructured?.projectState ?? fallbackStructured?.projectState
    const mergedProjectState = rawMergedProjectState
      ? sanitizeMergedStructuredProjectPayload(rawMergedProjectState)
      : rawMergedProjectState
    const mergedCompanionBriefingLine = preferMergedCompanionBriefingLine(
      preferredStructured?.preDialogueAwareness?.companionBriefingLine,
      fallbackStructured?.preDialogueAwareness?.companionBriefingLine,
    ) ?? null
    const mergedHoldDetailLine = preferMergedSameHerHoldDetailLine(
      preferMergedAwarenessSummaryLine(
        preferredStructured?.preDialogueAwareness?.awarenessLine,
        fallbackStructured?.preDialogueAwareness?.awarenessLine,
      ) ?? null,
      mergedCompanionBriefingLine,
      mergedProjectState && typeof mergedProjectState === 'object' && 'sameHerHoldDetail' in mergedProjectState
        ? mergedProjectState.sameHerHoldDetail as string | null | undefined
        : null,
    )
    const mergedInwardLowPressureAwarenessLine = resolveMergedSameHerInwardLowPressureAwarenessLine({
      preferredAwarenessLine: preferredStructured?.preDialogueAwareness?.awarenessLine,
      fallbackAwarenessLine: fallbackStructured?.preDialogueAwareness?.awarenessLine,
      preferredCompanionHeadlineLine: preferredStructured?.preDialogueAwareness?.companionHeadlineLine,
      fallbackCompanionHeadlineLine: fallbackStructured?.preDialogueAwareness?.companionHeadlineLine,
      companionBriefingLine: mergedCompanionBriefingLine,
    })
    const mergedAnthropomorphicHostFacingAwarenessLine = resolveMergedAnthropomorphicHostFacingAwarenessLine({
      preferredAwarenessLine: preferredStructured?.preDialogueAwareness?.awarenessLine,
      fallbackAwarenessLine: fallbackStructured?.preDialogueAwareness?.awarenessLine,
      preferredCompanionHeadlineLine: preferredStructured?.preDialogueAwareness?.companionHeadlineLine,
      fallbackCompanionHeadlineLine: fallbackStructured?.preDialogueAwareness?.companionHeadlineLine,
      companionBriefingLine: mergedCompanionBriefingLine,
    })
    const resolvedMergedCompanionBriefingLine = mergedHoldDetailLine ?? mergedCompanionBriefingLine
    const mergedAwarenessSummaryLine = resolveMergedAwarenessSummaryLine({
      preferredSummaryLine: preferredStructured?.preDialogueAwareness?.summaryLine,
      fallbackSummaryLine: fallbackStructured?.preDialogueAwareness?.summaryLine,
      preferredAwarenessLine: preferredStructured?.preDialogueAwareness?.awarenessLine,
      fallbackAwarenessLine: fallbackStructured?.preDialogueAwareness?.awarenessLine,
      preferredCompanionBriefingLine: preferredStructured?.preDialogueAwareness?.companionBriefingLine,
      fallbackCompanionBriefingLine: fallbackStructured?.preDialogueAwareness?.companionBriefingLine,
    })
    mergedAssistant.structured = preferredStructured && fallbackStructured
      ? {
          ...fallbackStructured,
          ...preferredStructured,
          projectState: mergedProjectState,
          preDialogueClosure: preferredStructured.preDialogueClosure && fallbackStructured.preDialogueClosure
            ? sanitizeMergedStructuredProjectPayload({
                ...fallbackStructured.preDialogueClosure,
                ...preferredStructured.preDialogueClosure,
                summaryLine: preferNonEmpty(
                  preferredStructured.preDialogueClosure.summaryLine,
                  fallbackStructured.preDialogueClosure.summaryLine,
                ) ?? null,
                companionHeadlineLine: preferNonEmpty(
                  preferredStructured.preDialogueClosure.companionHeadlineLine,
                  fallbackStructured.preDialogueClosure.companionHeadlineLine,
                ) ?? null,
                sameHerDriftRiskLine: preferNonEmpty(
                  preferredStructured.preDialogueClosure.sameHerDriftRiskLine,
                  fallbackStructured.preDialogueClosure.sameHerDriftRiskLine,
                ) ?? null,
                companionBriefingLine: preferNonEmpty(
                  preferredStructured.preDialogueClosure.companionBriefingLine,
                  fallbackStructured.preDialogueClosure.companionBriefingLine,
                ) ?? null,
                companionNextClosureLine: preferMergedNextClosureLine(
                  preferredStructured.preDialogueClosure.companionNextClosureLine,
                  fallbackStructured.preDialogueClosure.companionNextClosureLine,
                ) ?? null,
                emotionalClosureCue: preferNonEmpty(
                  preferredStructured.preDialogueClosure.emotionalClosureCue,
                  fallbackStructured.preDialogueClosure.emotionalClosureCue,
                ) ?? null,
                briefingLines: (preferredStructured.preDialogueClosure.briefingLines?.length ?? 0) >= (fallbackStructured.preDialogueClosure.briefingLines?.length ?? 0)
                  ? cloneValue(preferredStructured.preDialogueClosure.briefingLines) ?? []
                  : cloneValue(fallbackStructured.preDialogueClosure.briefingLines) ?? [],
                reasons: (preferredStructured.preDialogueClosure.reasons?.length ?? 0) >= (fallbackStructured.preDialogueClosure.reasons?.length ?? 0)
                  ? cloneValue(preferredStructured.preDialogueClosure.reasons) ?? []
                  : cloneValue(fallbackStructured.preDialogueClosure.reasons) ?? [],
              })
            : sanitizeMergedStructuredProjectPayload(preferredStructured.preDialogueClosure ?? fallbackStructured.preDialogueClosure),
          preDialogueAwareness: preferredStructured.preDialogueAwareness && fallbackStructured.preDialogueAwareness
            ? sanitizeMergedStructuredProjectPayload({
                ...fallbackStructured.preDialogueAwareness,
                ...preferredStructured.preDialogueAwareness,
                summaryLine: mergedAwarenessSummaryLine ?? null,
                companionHeadlineLine: preferNonEmpty(
                  preferredStructured.preDialogueAwareness.companionHeadlineLine,
                  fallbackStructured.preDialogueAwareness.companionHeadlineLine,
                ) ?? null,
                companionBriefingLine: resolvedMergedCompanionBriefingLine,
                companionNextClosureLine: preferMergedNextClosureLine(
                  preferredStructured.preDialogueAwareness.companionNextClosureLine,
                  fallbackStructured.preDialogueAwareness.companionNextClosureLine,
                ) ?? null,
                awarenessLine: resolveAlicizationProjectPreDialogueAwarenessLine({
                  runtimeProjectState: {
                    identity: mergedProjectState && typeof mergedProjectState === 'object' && 'identity' in mergedProjectState
                      ? mergedProjectState.identity as string | null | undefined
                      : null,
                    currentPhase: mergedProjectState && typeof mergedProjectState === 'object' && 'currentPhase' in mergedProjectState
                      ? mergedProjectState.currentPhase as string | null | undefined
                      : null,
                    preDialogueAwarenessLine: mergedHoldDetailLine ?? mergedAnthropomorphicHostFacingAwarenessLine ?? mergedInwardLowPressureAwarenessLine ?? preferMergedAwarenessSummaryLine(
                      preferredStructured.preDialogueAwareness.awarenessLine,
                      fallbackStructured.preDialogueAwareness.awarenessLine,
                    ) ?? null,
                    awarenessLine: mergedHoldDetailLine ?? mergedAnthropomorphicHostFacingAwarenessLine ?? mergedInwardLowPressureAwarenessLine ?? preferMergedAwarenessSummaryLine(
                      preferredStructured.preDialogueAwareness.awarenessLine,
                      fallbackStructured.preDialogueAwareness.awarenessLine,
                    ) ?? null,
                    companionHeadlineLine: preferNonEmpty(
                      preferredStructured.preDialogueAwareness.companionHeadlineLine,
                      fallbackStructured.preDialogueAwareness.companionHeadlineLine,
                    ) ?? null,
                    companionBriefingLine: resolvedMergedCompanionBriefingLine,
                    preDialogueAwarenessSummary: mergedAwarenessSummaryLine ?? null,
                    latestLandedProgress: mergedProjectState && typeof mergedProjectState === 'object' && 'latestLandedProgress' in mergedProjectState
                      ? mergedProjectState.latestLandedProgress as string | null | undefined
                      : null,
                    latestProgress: mergedProjectState && typeof mergedProjectState === 'object' && 'latestProgress' in mergedProjectState
                      ? mergedProjectState.latestProgress as string | null | undefined
                      : null,
                    landedProgressSummary: mergedProjectState && typeof mergedProjectState === 'object' && 'latestLandedProgress' in mergedProjectState
                      ? mergedProjectState.latestLandedProgress as string | null | undefined
                      : null,
                    primaryOpenLoop: mergedProjectState && typeof mergedProjectState === 'object' && 'primaryOpenLoop' in mergedProjectState
                      ? mergedProjectState.primaryOpenLoop as string | null | undefined
                      : null,
                    openClosureSummary: mergedProjectState && typeof mergedProjectState === 'object' && 'primaryOpenLoop' in mergedProjectState
                      ? mergedProjectState.primaryOpenLoop as string | null | undefined
                      : null,
                    nextClosureTarget: mergedProjectState && typeof mergedProjectState === 'object' && 'nextClosureTarget' in mergedProjectState
                      ? mergedProjectState.nextClosureTarget as string | null | undefined
                      : null,
                    nextClosureTargetSummary: mergedProjectState && typeof mergedProjectState === 'object' && 'nextClosureTarget' in mergedProjectState
                      ? mergedProjectState.nextClosureTarget as string | null | undefined
                      : null,
                    sameHerSelfLine: mergedProjectState && typeof mergedProjectState === 'object' && 'sameHerSelfLine' in mergedProjectState
                      ? mergedProjectState.sameHerSelfLine as string | null | undefined
                      : null,
                    sameHerHoldDetail: mergedProjectState && typeof mergedProjectState === 'object' && 'sameHerHoldDetail' in mergedProjectState
                      ? mergedProjectState.sameHerHoldDetail as string | null | undefined
                      : null,
                    sameHerDriftRisk: mergedProjectState && typeof mergedProjectState === 'object' && 'sameHerDriftRisk' in mergedProjectState
                      ? mergedProjectState.sameHerDriftRisk as string | null | undefined
                      : null,
                    sameHerDriftRiskSummary: mergedProjectState && typeof mergedProjectState === 'object' && 'sameHerDriftRisk' in mergedProjectState
                      ? mergedProjectState.sameHerDriftRisk as string | null | undefined
                      : null,
                    emotionalClosureSummary: preferNonEmpty(
                      preferredStructured.preDialogueAwareness.emotionalClosureCue,
                      fallbackStructured.preDialogueAwareness.emotionalClosureCue,
                    ) ?? null,
                  },
                  fallbackProjectState: {
                    identity: mergedProjectState && typeof mergedProjectState === 'object' && 'identity' in mergedProjectState
                      ? mergedProjectState.identity as string | null | undefined
                      : null,
                    currentPhase: mergedProjectState && typeof mergedProjectState === 'object' && 'currentPhase' in mergedProjectState
                      ? mergedProjectState.currentPhase as string | null | undefined
                      : null,
                    preDialogueAwarenessLine: mergedHoldDetailLine ?? mergedAnthropomorphicHostFacingAwarenessLine ?? mergedInwardLowPressureAwarenessLine ?? preferNonEmpty(
                      fallbackStructured.preDialogueAwareness.awarenessLine,
                      preferredStructured.preDialogueAwareness.awarenessLine,
                    ) ?? null,
                    awarenessLine: mergedHoldDetailLine ?? mergedAnthropomorphicHostFacingAwarenessLine ?? mergedInwardLowPressureAwarenessLine ?? preferNonEmpty(
                      fallbackStructured.preDialogueAwareness.awarenessLine,
                      preferredStructured.preDialogueAwareness.awarenessLine,
                    ) ?? null,
                    companionHeadlineLine: preferNonEmpty(
                      fallbackStructured.preDialogueAwareness.companionHeadlineLine,
                      preferredStructured.preDialogueAwareness.companionHeadlineLine,
                    ) ?? null,
                    companionBriefingLine: resolvedMergedCompanionBriefingLine,
                    preDialogueAwarenessSummary: mergedAwarenessSummaryLine ?? null,
                    latestLandedProgress: mergedProjectState && typeof mergedProjectState === 'object' && 'latestLandedProgress' in mergedProjectState
                      ? mergedProjectState.latestLandedProgress as string | null | undefined
                      : null,
                    latestProgress: mergedProjectState && typeof mergedProjectState === 'object' && 'latestProgress' in mergedProjectState
                      ? mergedProjectState.latestProgress as string | null | undefined
                      : null,
                    landedProgressSummary: mergedProjectState && typeof mergedProjectState === 'object' && 'latestLandedProgress' in mergedProjectState
                      ? mergedProjectState.latestLandedProgress as string | null | undefined
                      : null,
                    primaryOpenLoop: mergedProjectState && typeof mergedProjectState === 'object' && 'primaryOpenLoop' in mergedProjectState
                      ? mergedProjectState.primaryOpenLoop as string | null | undefined
                      : null,
                    openClosureSummary: mergedProjectState && typeof mergedProjectState === 'object' && 'primaryOpenLoop' in mergedProjectState
                      ? mergedProjectState.primaryOpenLoop as string | null | undefined
                      : null,
                    nextClosureTarget: mergedProjectState && typeof mergedProjectState === 'object' && 'nextClosureTarget' in mergedProjectState
                      ? mergedProjectState.nextClosureTarget as string | null | undefined
                      : null,
                    nextClosureTargetSummary: mergedProjectState && typeof mergedProjectState === 'object' && 'nextClosureTarget' in mergedProjectState
                      ? mergedProjectState.nextClosureTarget as string | null | undefined
                      : null,
                    sameHerSelfLine: mergedProjectState && typeof mergedProjectState === 'object' && 'sameHerSelfLine' in mergedProjectState
                      ? mergedProjectState.sameHerSelfLine as string | null | undefined
                      : null,
                    sameHerHoldDetail: mergedProjectState && typeof mergedProjectState === 'object' && 'sameHerHoldDetail' in mergedProjectState
                      ? mergedProjectState.sameHerHoldDetail as string | null | undefined
                      : null,
                    sameHerDriftRisk: mergedProjectState && typeof mergedProjectState === 'object' && 'sameHerDriftRisk' in mergedProjectState
                      ? mergedProjectState.sameHerDriftRisk as string | null | undefined
                      : null,
                    sameHerDriftRiskSummary: mergedProjectState && typeof mergedProjectState === 'object' && 'sameHerDriftRisk' in mergedProjectState
                      ? mergedProjectState.sameHerDriftRisk as string | null | undefined
                      : null,
                    emotionalClosureSummary: preferNonEmpty(
                      fallbackStructured.preDialogueAwareness.emotionalClosureCue,
                      preferredStructured.preDialogueAwareness.emotionalClosureCue,
                    ) ?? null,
                  },
                }) ?? null,
                emotionalClosureCue: preferNonEmpty(
                  preferredStructured.preDialogueAwareness.emotionalClosureCue,
                  fallbackStructured.preDialogueAwareness.emotionalClosureCue,
                ) ?? null,
                reasonPreview: mergeReasonPreview(
                  preferredStructured.preDialogueAwareness.reasonPreview,
                  fallbackStructured.preDialogueAwareness.reasonPreview,
                ),
              })
            : sanitizeMergedStructuredProjectPayload(preferredStructured.preDialogueAwareness ?? fallbackStructured.preDialogueAwareness),
        }
      : preferredStructured ?? fallbackStructured
    mergedAssistant.categorization = primaryAssistant.categorization?.speech?.trim()
      ? cloneValue(primaryAssistant.categorization)
      : cloneValue(secondaryAssistant.categorization)
  }

  return merged
}

export function canonicalizeSessionMessages(messages: ChatHistoryItem[]) {
  const canonical: ChatHistoryItem[] = []

  for (const message of messages) {
    const duplicateIndex = canonical.findIndex(existing => areMessagesEquivalent(existing, message))
    if (duplicateIndex === -1) {
      canonical.push(cloneValue(message))
      continue
    }

    canonical[duplicateIndex] = mergeEquivalentMessages(canonical[duplicateIndex], message)
  }

  // NOTICE: SQLite conversation turns persist one shared created_at for both the
  // user prompt and the assistant reply of the same turn. When timestamps tie, the
  // user bubble must stay ahead of the assistant bubble or the chat visually flips.
  return canonical.sort(compareMessageOrder)
}

export function mergeLoadedSessionMessages(storedMessages: ChatHistoryItem[], currentMessages: ChatHistoryItem[]) {
  if (currentMessages.length === 0)
    return storedMessages

  const currentNonSystemMessages = currentMessages.filter((message, index) => index !== 0 || message.role !== 'system')
  if (currentNonSystemMessages.length === 0)
    return storedMessages

  const systemMessage = storedMessages[0]?.role === 'system'
    ? storedMessages[0]
    : currentMessages[0]?.role === 'system'
      ? currentMessages[0]
      : undefined

  const merged = canonicalizeSessionMessages([
    ...storedMessages,
    ...currentNonSystemMessages,
  ])
  if (areMessageArraysStructurallyEqual(merged, storedMessages))
    return storedMessages

  if (storedMessages.length === 0 && systemMessage && merged[0]?.role !== 'system')
    return canonicalizeSessionMessages([systemMessage, ...merged])

  return merged
}
