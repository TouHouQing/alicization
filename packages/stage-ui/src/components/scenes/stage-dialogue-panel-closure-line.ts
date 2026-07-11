import type { StageQuickReplyClosureDiagnosticEntry } from './stage-quick-reply-closure'

import {
  containsAlicizationFixedTemplateResidue,
  isAlicizationThinProjectAwarenessLine,
} from '@proj-alicization/stage-shared'

const dialoguePanelInternalResiduePattern
  = /continuity evidence|renderer continuity|identity-continuity|phase1_local_digital_life|visibility=internal-structured|content=excluded|owner=|source=|continuity_anchor=|continuity=|pending=|pending[_-]rejoin=|recovery@|same[- ]her|same living line|one living her|one continuous her|同一个\s*her|同一个她|同一条数字生命线|数字生命主线|普通项目播报|下一步还要继续收住/iu

function normalizeVisibleClosureLine(line: string | null | undefined) {
  const trimmed = typeof line === 'string' ? line.trim() : ''
  if (!trimmed)
    return null
  if (containsAlicizationFixedTemplateResidue(trimmed))
    return null
  if (dialoguePanelInternalResiduePattern.test(trimmed))
    return null
  return trimmed
}

function applyProjectStateTone(line: string | null, status: string | undefined) {
  void status
  return normalizeVisibleClosureLine(line)
}

function isStrongerSameHerHeadline(line: string | null | undefined) {
  if (!line)
    return false

  const normalized = line.trim().toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('holding together mainly through')
    || (
      normalized.includes('holding together through face, motion, and voice together')
      && normalized.includes('still-voiced face-and-motion line')
    )
    || (
      normalized.includes('holding together through face, motion, lipsync, and voice together')
      && normalized.includes('visible identity-continuity line has already rejoined without body carry')
    )
    || normalized.includes('locked back onto the same living segment together')
    || normalized.includes('temporary visual alignment')
    || normalized.includes('full cross-modal identity-continuity line')
    || normalized.includes('one living her')
    || (
      normalized.includes('resident body lane')
      && normalized.includes('identity-continuity voice line')
    )
    || normalized.includes('body-only recovery@')
    || normalized.includes('body+lipsync+voice recovery@')
    || normalized.includes('audible-body rejoin@')
    || normalized.includes('still-voiced face line')
    || normalized.includes('still-voiced motion line')
    || normalized.includes('mainly through voice')
    || normalized.includes('mainly through face and voice')
    || normalized.includes('mainly through motion and voice')
    || normalized.includes('mainly through lipsync and voice')
    || normalized.includes('body and voice')
    || normalized.includes('body, lipsync, and voice')
    || normalized.includes('body, face, and motion')
    || normalized.includes('body, face, and motion authority have already re-formed on the same segment')
    || normalized.includes('resident body continuity and voice prosody')
    || normalized.includes('resident body continuity')
    || normalized.includes('resident-body continuity')
    || normalized.includes('identity-continuity body line')
    || normalized.includes('identity-continuity audible body line')
    || normalized.includes('living audio thread')
}

function mergeCompanionshipReasonLine(line: string | null, companionshipReasonLine: string | null) {
  const visibleLine = normalizeVisibleClosureLine(line)
  const visibleCompanionshipReasonLine = normalizeVisibleClosureLine(companionshipReasonLine)
  if (!visibleLine)
    return null
  if (!visibleCompanionshipReasonLine)
    return visibleLine

  const normalizedLine = visibleLine.toLowerCase()
  const normalizedReason = visibleCompanionshipReasonLine.toLowerCase()
  if (normalizedLine.includes(normalizedReason))
    return visibleLine

  return normalizeVisibleClosureLine(`${visibleLine} ${visibleCompanionshipReasonLine}`.trim())
}

function mergeSameHerDriftRiskLine(line: string | null, driftRiskLine: string | null) {
  const visibleLine = normalizeVisibleClosureLine(line)
  const visibleDriftRiskLine = normalizeVisibleClosureLine(driftRiskLine)
  if (!visibleLine || !visibleDriftRiskLine)
    return visibleLine

  const normalizedLine = visibleLine.toLowerCase()
  const normalizedRisk = visibleDriftRiskLine.toLowerCase()
  if (normalizedLine.includes(normalizedRisk))
    return visibleLine

  return normalizeVisibleClosureLine(`${visibleLine} ${visibleDriftRiskLine}`.trim())
}

function mergeProactiveSameHerGapLine(line: string | null, proactiveSameHerGapLine: string | null) {
  const visibleLine = normalizeVisibleClosureLine(line)
  const visibleGapLine = normalizeVisibleClosureLine(proactiveSameHerGapLine)
  if (!visibleLine || !visibleGapLine)
    return visibleLine

  const normalizedLine = visibleLine.toLowerCase()
  const normalizedGapLine = visibleGapLine.toLowerCase()
  if (normalizedLine.includes(normalizedGapLine))
    return visibleLine

  return normalizeVisibleClosureLine(`${visibleLine} ${visibleGapLine}`.trim())
}

function mergeProjectStateRepairSupportLines(
  line: string | null,
  sameHerDriftRiskLine: string | null,
  proactiveSameHerGapLine: string | null,
) {
  return mergeProactiveSameHerGapLine(
    mergeSameHerDriftRiskLine(line, sameHerDriftRiskLine),
    proactiveSameHerGapLine,
  )
}

function carriesExplicitSameHerContinuityEvidence(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('continuity=')
    && (
      normalized.includes('signature=')
      || normalized.includes('recovery@')
      || normalized.includes('pending-rejoin=')
    )
}

function isProjectStateRepairFocus(focus: string | null | undefined) {
  const normalizedFocus = typeof focus === 'string' ? focus.trim().toLowerCase() : ''
  if (!normalizedFocus)
    return false

  return normalizedFocus === 'project-state'
    || normalizedFocus === 'project-identity'
    || normalizedFocus === 'current-phase'
    || normalizedFocus === 'unresolved-open-loop'
}

function looksLikeThinLaneSameHerHeadline(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('holding together mainly through')
    && normalized.includes('full cross-modal identity-continuity line is not closed yet')
}

function scoreFallbackAwarenessLine(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return Number.NEGATIVE_INFINITY

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  const carriesSameHerMeasuredReturn
    = normalized.includes('identity-continuity hold')
      || (
        normalized.includes('measured-return')
        && (
          normalized.includes('lower-pressure')
          || normalized.includes('current continuity route')
          || normalized.includes('callback line')
        )
      )
  const carriesSameHerInwardLowPressure
    = normalized.includes('identity-continuity-inward-carry')
      || normalized.includes('quiet-companionship')
      || (
        normalized.includes('low-pressure')
        && (
          normalized.includes('same line inward')
          || normalized.includes('current continuity route')
          || normalized.includes('one living her')
          || normalized.includes('body, face, and motion')
        )
      )
  const carriesExplicitSameHerContinuityEvidence
    = normalized.includes('continuity=')
      && (
        normalized.includes('signature=')
        || normalized.includes('recovery@')
        || normalized.includes('pending-rejoin=')
      )
  if (carriesSameHerMeasuredReturn) {
    score += 3
  }
  if (carriesSameHerInwardLowPressure)
    score += 6
  if (carriesExplicitSameHerContinuityEvidence)
    score += 5
  if (normalized.includes('phase 1'))
    score += 3
  if (
    normalized.includes('digital life')
    || normalized.includes('one living digital life project')
    || normalized.includes('what has landed')
    || normalized.includes('still-open')
    || normalized.includes('current continuity route')
    || normalized.includes('未闭环')
    || normalized.includes('数字生命项目')
  ) {
    score += 2
  }
  if (
    normalized.includes('body')
    || normalized.includes('face')
    || normalized.includes('motion')
    || normalized.includes('lipsync')
    || normalized.includes('voice')
  ) {
    score -= 1
  }
  return score
}

function looksLikeThinProjectStateClosureLine(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return false

  return isAlicizationThinProjectAwarenessLine(line)
    || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
    || normalized.includes('generic closure summary')
}

function looksLikeThinSameHerClosureLine(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return true

  if (isStrongerSameHerHeadline(line))
    return false

  return isAlicizationThinProjectAwarenessLine(line)
    || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
    || normalized.includes('generic closure summary')
}

function resolvePreferredFallbackAwarenessLine(
  fallbackAwarenessLine: string | null | undefined,
  fallbackAwarenessCandidates: Array<string | null | undefined> | null | undefined,
) {
  const candidates = [
    fallbackAwarenessLine ?? null,
    ...(fallbackAwarenessCandidates ?? []),
  ]
    .map(candidate => candidate?.trim() || null)
    .filter((candidate, index, entries): candidate is string => Boolean(candidate) && entries.indexOf(candidate) === index)

  if (candidates.length === 0)
    return null

  return [...candidates].sort((left, right) => scoreFallbackAwarenessLine(right) - scoreFallbackAwarenessLine(left))[0] ?? null
}

function isSameHerFocusedFallbackAwarenessCandidate(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('identity-continuity')
    || normalized.includes('one living her')
    || normalized.includes('same line inward')
    || normalized.includes('continuity=')
    || normalized.includes('recovery@')
    || normalized.includes('pending-rejoin=')
    || normalized.includes('pause=')
    || normalized.includes('lipsyncmode=')
    || normalized.includes('voicemode=')
    || normalized.includes('pacing=')
    || (
      normalized.includes('body')
      && normalized.includes('lipsync')
      && normalized.includes('voice')
    )
}

function scoreSameHerFallbackAwarenessLine(line: string | null | undefined) {
  const baseScore = scoreFallbackAwarenessLine(line)
  if (!Number.isFinite(baseScore))
    return baseScore

  const normalized = line?.trim().toLowerCase() ?? ''
  const cadenceMarkerCount = [
    normalized.includes('pause='),
    normalized.includes('lipsyncmode='),
    normalized.includes('voicemode='),
    normalized.includes('pacing='),
  ].filter(Boolean).length

  return baseScore + (
    isSameHerFocusedFallbackAwarenessCandidate(line)
    && cadenceMarkerCount >= 2
      ? cadenceMarkerCount >= 4 ? 6 : 5
      : 0
  )
}

function resolvePreferredSameHerFallbackAwarenessLine(
  fallbackAwarenessLine: string | null | undefined,
  fallbackAwarenessCandidates: Array<string | null | undefined> | null | undefined,
) {
  const candidates = [
    fallbackAwarenessLine ?? null,
    ...(fallbackAwarenessCandidates ?? []),
  ]
    .map(candidate => candidate?.trim() || null)
    .filter((candidate, index, entries): candidate is string => Boolean(candidate) && entries.indexOf(candidate) === index)

  if (candidates.length === 0)
    return null

  const sameHerCandidates = candidates.filter(candidate => isSameHerFocusedFallbackAwarenessCandidate(candidate))

  const candidatePool = sameHerCandidates.length > 0 ? sameHerCandidates : candidates
  return [...candidatePool].sort((left, right) => scoreSameHerFallbackAwarenessLine(right) - scoreSameHerFallbackAwarenessLine(left))[0] ?? null
}

export function resolveStageDialoguePanelClosureLine(
  closureCue: (StageQuickReplyClosureDiagnosticEntry & { companionshipReasonLine?: string | null }) | null | undefined,
  options?: {
    fallbackAwarenessLine?: string | null
    fallbackAwarenessCandidates?: Array<string | null | undefined>
  },
) {
  const preferredFallbackAwarenessLine = resolvePreferredFallbackAwarenessLine(
    options?.fallbackAwarenessLine,
    options?.fallbackAwarenessCandidates,
  )
  const preferredSameHerFallbackAwarenessLine = resolvePreferredSameHerFallbackAwarenessLine(
    options?.fallbackAwarenessLine,
    options?.fallbackAwarenessCandidates,
  )
  if (!closureCue)
    return normalizeVisibleClosureLine(preferredFallbackAwarenessLine)

  const headline = typeof closureCue.headline === 'string' && closureCue.headline.trim()
    ? closureCue.headline.trim()
    : null
  const briefingHeadline = typeof closureCue.briefingHeadline === 'string' && closureCue.briefingHeadline.trim()
    ? closureCue.briefingHeadline.trim()
    : null
  const nextClosureLine = typeof closureCue.nextClosureLine === 'string' && closureCue.nextClosureLine.trim()
    ? closureCue.nextClosureLine.trim()
    : null
  const sameHerDriftRiskLine = typeof closureCue.sameHerDriftRiskLine === 'string' && closureCue.sameHerDriftRiskLine.trim()
    ? closureCue.sameHerDriftRiskLine.trim()
    : null
  const proactiveSameHerGapLine = typeof closureCue.proactiveSameHerGapLine === 'string' && closureCue.proactiveSameHerGapLine.trim()
    ? closureCue.proactiveSameHerGapLine.trim()
    : null
  const companionshipReasonLine = typeof closureCue.companionshipReasonLine === 'string' && closureCue.companionshipReasonLine.trim()
    ? closureCue.companionshipReasonLine.trim()
    : null
  const projectStateRepairFocused = isProjectStateRepairFocus(closureCue.routeQuery?.focus)
  const shouldPreferFallbackProjectStateCarry = projectStateRepairFocused
    && Boolean(preferredFallbackAwarenessLine)
    && (
      looksLikeThinProjectStateClosureLine(headline)
      || looksLikeThinProjectStateClosureLine(briefingHeadline)
    )
    && scoreFallbackAwarenessLine(preferredFallbackAwarenessLine) > Math.max(
      scoreFallbackAwarenessLine(headline),
      scoreFallbackAwarenessLine(briefingHeadline),
    )
  const shouldPreferFallbackSameHerCarry = closureCue.routeQuery?.focus === 'identity-continuity-continuity'
    && Boolean(preferredSameHerFallbackAwarenessLine)
    && (
      looksLikeThinSameHerClosureLine(headline)
      || looksLikeThinSameHerClosureLine(briefingHeadline)
    )
    && scoreSameHerFallbackAwarenessLine(preferredSameHerFallbackAwarenessLine) > Math.max(
      scoreSameHerFallbackAwarenessLine(headline),
      scoreSameHerFallbackAwarenessLine(briefingHeadline),
    )
  const shouldPreferProjectStateFallbackSameHerCarry = projectStateRepairFocused
    && Boolean(preferredSameHerFallbackAwarenessLine)
    && carriesExplicitSameHerContinuityEvidence(preferredSameHerFallbackAwarenessLine)
    && (
      looksLikeThinLaneSameHerHeadline(headline)
      || looksLikeThinLaneSameHerHeadline(briefingHeadline)
    )
    && scoreSameHerFallbackAwarenessLine(preferredSameHerFallbackAwarenessLine) > Math.max(
      scoreSameHerFallbackAwarenessLine(headline),
      scoreSameHerFallbackAwarenessLine(briefingHeadline),
    )
  const preferredProjectStateCarryLine = shouldPreferFallbackProjectStateCarry
    ? preferredFallbackAwarenessLine
    : null

  if (shouldPreferProjectStateFallbackSameHerCarry)
    return mergeCompanionshipReasonLine(preferredSameHerFallbackAwarenessLine, companionshipReasonLine)

  if (
    projectStateRepairFocused
    && headline
    && isStrongerSameHerHeadline(headline)
  ) {
    return mergeCompanionshipReasonLine(headline, companionshipReasonLine)
  }

  if (
    projectStateRepairFocused
    && headline
    && (headline.includes('same her') || headline.includes('同一个 her'))
  ) {
    const canExpandProjectStateRepair = headline.includes('数字生命项目')
      || headline.includes('同一个 her')

    if (canExpandProjectStateRepair && briefingHeadline && briefingHeadline !== headline) {
      const briefingTail = briefingHeadline.startsWith(headline)
        ? briefingHeadline.slice(headline.length).trim()
        : briefingHeadline

      if (briefingTail) {
        return mergeCompanionshipReasonLine(`${headline} ${briefingTail}`.trim(), companionshipReasonLine)
      }
    }

    if (canExpandProjectStateRepair && nextClosureLine && nextClosureLine !== headline) {
      return mergeProjectStateRepairSupportLines(
        mergeCompanionshipReasonLine(`${headline} ${nextClosureLine}`, companionshipReasonLine),
        sameHerDriftRiskLine,
        proactiveSameHerGapLine,
      )
    }

    return mergeProjectStateRepairSupportLines(
      mergeCompanionshipReasonLine(headline, companionshipReasonLine),
      sameHerDriftRiskLine,
      proactiveSameHerGapLine,
    )
  }

  if (projectStateRepairFocused) {
    if (preferredProjectStateCarryLine) {
      return mergeProjectStateRepairSupportLines(
        mergeCompanionshipReasonLine(applyProjectStateTone(preferredProjectStateCarryLine, closureCue.routeQuery?.status), companionshipReasonLine),
        sameHerDriftRiskLine,
        proactiveSameHerGapLine,
      )
    }
    if (briefingHeadline) {
      return mergeProjectStateRepairSupportLines(
        mergeCompanionshipReasonLine(applyProjectStateTone(briefingHeadline, closureCue.routeQuery?.status), companionshipReasonLine),
        sameHerDriftRiskLine,
        proactiveSameHerGapLine,
      )
    }
    if (headline) {
      return mergeProjectStateRepairSupportLines(
        mergeCompanionshipReasonLine(applyProjectStateTone(headline, closureCue.routeQuery?.status), companionshipReasonLine),
        sameHerDriftRiskLine,
        proactiveSameHerGapLine,
      )
    }
    if (nextClosureLine) {
      return mergeProjectStateRepairSupportLines(
        mergeCompanionshipReasonLine(applyProjectStateTone(nextClosureLine, closureCue.routeQuery?.status), companionshipReasonLine),
        sameHerDriftRiskLine,
        proactiveSameHerGapLine,
      )
    }
  }

  if (shouldPreferFallbackSameHerCarry)
    return mergeCompanionshipReasonLine(preferredSameHerFallbackAwarenessLine, companionshipReasonLine)

  const resolvedLine = headline
    ?? briefingHeadline
    ?? nextClosureLine
    ?? preferredFallbackAwarenessLine
    ?? null

  return mergeCompanionshipReasonLine(resolvedLine, companionshipReasonLine)
}
