import type { StageQuickReplyClosureDiagnosticEntry, StageQuickReplyPreDialogueClosureSnapshot } from './stage-quick-reply-closure'

import { isAlicizationThinProjectAwarenessLine } from '@proj-alicization/stage-shared'

function applyProjectStateTone(line: string | null, status: string | undefined) {
  if (!line)
    return null

  const normalizedStatus = status?.trim().toLowerCase()
  if (normalizedStatus === 'grounded')
    return `这条数字生命主线现在先稳住了。 ${line}`.trim()
  if (normalizedStatus === 'drift')
    return `这条数字生命主线刚刚有点松了，我先把它重新收回来。 ${line}`.trim()
  if (normalizedStatus === 'partial')
    return `我还在继续带着这条数字生命主线往前走。 ${line}`.trim()
  return line
}

function mergeNonDuplicateProjectStateLine(line: string | null, extraLine: string | null | undefined) {
  if (!line)
    return line

  const normalizedExtraLine = typeof extraLine === 'string' ? extraLine.trim() : ''
  if (!normalizedExtraLine)
    return line

  const normalizedLine = line.toLowerCase()
  const normalizedExtra = normalizedExtraLine.toLowerCase()
  if (normalizedLine.includes(normalizedExtra))
    return line

  return `${line} ${normalizedExtraLine}`.trim()
}

function normalizeProjectStateNextClosureLine(line: string | null | undefined) {
  const normalizedLine = typeof line === 'string' ? line.trim() : ''
  if (!normalizedLine)
    return null

  const normalizedEnglishLine = normalizedLine.replace(/^Next, help me close:\s*/i, '').trim()
  if (normalizedEnglishLine !== normalizedLine)
    return `下一步还要继续收住 ${normalizedEnglishLine}`.trim()

  if (/^下一步还要继续收住\s*/u.test(normalizedLine))
    return normalizedLine

  return `下一步还要继续收住 ${normalizedLine}`.trim()
}

function mergeProjectStateRepairBriefingTail(headline: string, briefingHeadline: string | null | undefined) {
  const normalizedBriefingHeadline = typeof briefingHeadline === 'string' ? briefingHeadline.trim() : ''
  if (!normalizedBriefingHeadline || normalizedBriefingHeadline === headline)
    return headline

  const briefingTail = normalizedBriefingHeadline.startsWith(headline)
    ? normalizedBriefingHeadline.slice(headline.length).trim()
    : normalizedBriefingHeadline

  if (!briefingTail)
    return headline

  return `${headline} ${briefingTail}`.trim()
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

function mergeProjectStateRepairSupportLines(
  line: string | null,
  diagnosticEntry: StageQuickReplyClosureDiagnosticEntry | null | undefined,
) {
  return mergeNonDuplicateProjectStateLine(
    mergeNonDuplicateProjectStateLine(
      mergeNonDuplicateProjectStateLine(
        line,
        normalizeProjectStateNextClosureLine(diagnosticEntry?.nextClosureLine),
      ),
      diagnosticEntry?.sameHerDriftRiskLine,
    ),
    diagnosticEntry?.proactiveSameHerGapLine,
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

function shouldAppendProjectStateRepairSupportLines(
  diagnosticEntry: StageQuickReplyClosureDiagnosticEntry | null | undefined,
) {
  const focus = diagnosticEntry?.routeQuery?.focus?.trim().toLowerCase()
  if (!focus)
    return false

  return focus !== 'project-state'
    || Boolean(diagnosticEntry?.sameHerDriftRiskLine?.trim())
    || Boolean(diagnosticEntry?.proactiveSameHerGapLine?.trim())
}

function isLaneShrinkageHeadline(line: string | null | undefined) {
  if (typeof line !== 'string')
    return false

  const normalized = line.trim().toLowerCase()
  if (!normalized)
    return false

  if (
    normalized.includes('locked back onto the same living segment together')
    || normalized.includes('temporary visual alignment')
  ) {
    return true
  }

  if (
    normalized.includes('same-her audible body line')
    && normalized.includes('surviving pre-dialogue carry')
  ) {
    return true
  }

  if (
    normalized.includes('holding together through face, motion, and voice together')
    && normalized.includes('still-voiced face-and-motion line')
  ) {
    return true
  }

  if (
    normalized.includes('holding together through face, motion, lipsync, and voice together')
    && normalized.includes('visible same-her line has already rejoined without body carry')
  ) {
    return true
  }

  if (
    normalized.includes('resident body lane')
    && normalized.includes('same-her voice line')
  ) {
    return true
  }

  return normalized.includes('right now i am still holding together mainly through')
    && (
      normalized.includes('full cross-modal same-her line is not closed yet')
      || normalized.includes('body-only recovery@')
      || normalized.includes('body+lipsync recovery@')
      || normalized.includes('body+lipsync+voice recovery@')
      || normalized.includes('audible-body rejoin@')
      || normalized.includes('still-voiced face line')
      || normalized.includes('still-voiced face-and-mouth line')
      || normalized.includes('still-voiced motion line')
      || normalized.includes('still-voiced motion-and-mouth line')
      || normalized.includes('mainly through voice')
      || normalized.includes('mainly through face and voice')
      || normalized.includes('mainly through face, lipsync, and voice')
      || normalized.includes('mainly through motion and voice')
      || normalized.includes('mainly through motion, lipsync, and voice')
      || normalized.includes('mainly through lipsync and voice')
      || normalized.includes('body and lipsync')
      || normalized.includes('body and voice')
      || normalized.includes('body, lipsync, and voice')
      || normalized.includes('body, face, and motion')
      || normalized.includes('body, face, and motion authority have already re-formed on the same segment')
      || normalized.includes('resident body continuity and voice prosody')
      || normalized.includes('resident body continuity')
      || normalized.includes('resident-body continuity')
      || normalized.includes('same-her body line')
      || normalized.includes('one living her')
      || normalized.includes('same-her audible body line')
      || normalized.includes('living audio thread')
      || normalized.includes('face and motion need to rejoin')
    )
}

function carriesAnthropomorphicSameHerClosureLine(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return false

  const mentionsInwardObservability
    = normalized.includes('same-her inward-carry observability')
      || normalized.includes('same-her-inward-carry')
      || normalized.includes('inward-carry')
      || normalized.includes('inward continuity')
      || normalized.includes('inner continuity')
  const mentionsAnthropomorphicEmotionalClosure
    = normalized.includes('anthropomorphic emotional closure')
      || (
        normalized.includes('emotional closure')
        && (
          normalized.includes('same-her')
          || normalized.includes('measured-return')
          || normalized.includes('repair-before-closeness')
          || normalized.includes('quiet-companionship')
        )
      )

  return mentionsAnthropomorphicEmotionalClosure && mentionsInwardObservability
}

function looksLikeThinLaneSameHerHeadline(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return false

  return normalized.includes('holding together mainly through')
    && normalized.includes('full cross-modal same-her line is not closed yet')
}

function scoreFallbackAwarenessLine(line: string | null | undefined) {
  const normalized = line?.trim().toLowerCase() ?? ''
  if (!normalized)
    return Number.NEGATIVE_INFINITY

  const isBareSameHerContinuityToken
    = normalized === 'same-her-inward-carry'
      || normalized === 'quiet-companionship'

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  const carriesSameHerMeasuredReturn
    = normalized.includes('same-her hold')
      || (
        normalized.includes('measured-return')
        && (
          normalized.includes('lower-pressure')
          || normalized.includes('same living line')
          || normalized.includes('callback line')
        )
      )
  const carriesSameHerInwardLowPressure
    = normalized.includes('same-her-inward-carry')
      || normalized.includes('quiet-companionship')
      || (
        normalized.includes('low-pressure')
        && (
          normalized.includes('same line inward')
          || normalized.includes('same living line')
          || normalized.includes('one living her')
          || normalized.includes('body, face, and motion')
        )
      )
  const carriesSameHerInwardObservability
    = normalized.includes('same-her inward-carry observability')
      || normalized.includes('same-her-inward-carry')
      || normalized.includes('inward-carry')
      || normalized.includes('inward continuity')
      || normalized.includes('inner continuity')
  const carriesAnthropomorphicEmotionalClosure
    = normalized.includes('anthropomorphic emotional closure')
      || (
        normalized.includes('emotional closure')
        && (
          normalized.includes('same-her')
          || normalized.includes('measured-return')
          || normalized.includes('repair-before-closeness')
          || normalized.includes('quiet-companionship')
        )
      )
  const carriesExplicitSameHerContinuityEvidence
    = normalized.includes('continuity=')
      && (
        normalized.includes('signature=')
        || normalized.includes('recovery@')
        || normalized.includes('pending-rejoin=')
      )
  if (
    carriesSameHerMeasuredReturn
  ) {
    score += 3
  }
  if (carriesSameHerInwardLowPressure)
    score += 6
  if (carriesSameHerInwardObservability)
    score += 6
  if (carriesAnthropomorphicEmotionalClosure)
    score += 5
  if (carriesExplicitSameHerContinuityEvidence)
    score += 5
  if (normalized.includes('phase 1'))
    score += 3
  if (
    normalized.includes('digital life')
    || normalized.includes('one living digital life project')
    || normalized.includes('what has landed')
    || normalized.includes('still-open')
    || normalized.includes('same living line')
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

  if (isBareSameHerContinuityToken)
    score -= 8

  return score
}

function shouldAppendHostFacingClosureNextStep(
  diagnosticEntry: StageQuickReplyClosureDiagnosticEntry | null | undefined,
  line: string | null | undefined,
) {
  return Boolean(normalizeProjectStateNextClosureLine(diagnosticEntry?.nextClosureLine))
    && carriesAnthropomorphicSameHerClosureLine(line)
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

  return normalized.includes('same-her')
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

  if (isLaneShrinkageHeadline(line) || carriesAnthropomorphicSameHerClosureLine(line))
    return false

  return isAlicizationThinProjectAwarenessLine(line)
    || normalized.includes('steadier carry of this project, this phase, and the life loop that remains open')
    || normalized.includes('generic closure summary')
}

export function resolveStageQuickReplyClosureSummary(
  snapshot: StageQuickReplyPreDialogueClosureSnapshot | null | undefined,
  diagnosticEntry: StageQuickReplyClosureDiagnosticEntry | null | undefined,
  options?: {
    fallbackAwarenessLine?: string | null
    fallbackAwarenessCandidates?: Array<string | null | undefined>
  },
) {
  if (!snapshot)
    return null

  const preferredFallbackAwarenessLine = resolvePreferredFallbackAwarenessLine(
    options?.fallbackAwarenessLine,
    options?.fallbackAwarenessCandidates,
  )
  const preferredSameHerFallbackAwarenessLine = resolvePreferredSameHerFallbackAwarenessLine(
    options?.fallbackAwarenessLine,
    options?.fallbackAwarenessCandidates,
  )
  const projectStateRepairFocused = isProjectStateRepairFocus(diagnosticEntry?.routeQuery?.focus)
  const projectStateHeadline = typeof diagnosticEntry?.headline === 'string'
    ? diagnosticEntry.headline.trim()
    : null
  const shouldPreferFallbackSameHerCarry = diagnosticEntry?.routeQuery?.focus === 'same-her-continuity'
    && Boolean(preferredSameHerFallbackAwarenessLine)
    && (
      looksLikeThinSameHerClosureLine(diagnosticEntry?.headline)
      || looksLikeThinSameHerClosureLine(diagnosticEntry?.briefingHeadline)
    )
    && scoreSameHerFallbackAwarenessLine(preferredSameHerFallbackAwarenessLine) > Math.max(
      scoreSameHerFallbackAwarenessLine(diagnosticEntry?.headline),
      scoreSameHerFallbackAwarenessLine(diagnosticEntry?.briefingHeadline),
    )
  const shouldPreferProjectStateFallbackSameHerCarry = projectStateRepairFocused
    && Boolean(preferredSameHerFallbackAwarenessLine)
    && carriesExplicitSameHerContinuityEvidence(preferredSameHerFallbackAwarenessLine)
    && (
      looksLikeThinLaneSameHerHeadline(diagnosticEntry?.headline)
      || looksLikeThinLaneSameHerHeadline(diagnosticEntry?.briefingHeadline)
    )
    && scoreSameHerFallbackAwarenessLine(preferredSameHerFallbackAwarenessLine) > Math.max(
      scoreSameHerFallbackAwarenessLine(diagnosticEntry?.headline),
      scoreSameHerFallbackAwarenessLine(diagnosticEntry?.briefingHeadline),
    )

  if (
    diagnosticEntry?.routeQuery?.focus === 'same-her-continuity'
    && typeof diagnosticEntry.headline === 'string'
    && diagnosticEntry.headline.trim()
    && isLaneShrinkageHeadline(diagnosticEntry.headline)
  ) {
    return diagnosticEntry.headline.trim()
  }

  if (shouldPreferFallbackSameHerCarry)
    return preferredSameHerFallbackAwarenessLine

  if (shouldPreferProjectStateFallbackSameHerCarry)
    return preferredSameHerFallbackAwarenessLine

  if (
    projectStateRepairFocused
    && diagnosticEntry
    && projectStateHeadline
  ) {
    const projectStateDiagnosticEntry = diagnosticEntry
    const headline = projectStateHeadline
    const briefingHeadline = typeof projectStateDiagnosticEntry.briefingHeadline === 'string' && projectStateDiagnosticEntry.briefingHeadline.trim()
      ? projectStateDiagnosticEntry.briefingHeadline.trim()
      : null
    const preferredProjectStateCarryLine = preferredFallbackAwarenessLine
      && (
        looksLikeThinProjectStateClosureLine(headline)
        || looksLikeThinProjectStateClosureLine(briefingHeadline)
      )
      && scoreFallbackAwarenessLine(preferredFallbackAwarenessLine) > Math.max(
        scoreFallbackAwarenessLine(headline),
        scoreFallbackAwarenessLine(briefingHeadline),
      )
      ? preferredFallbackAwarenessLine
      : null
    const shouldAppendSupportLines = shouldAppendProjectStateRepairSupportLines(projectStateDiagnosticEntry)
    if (isLaneShrinkageHeadline(headline)) {
      return headline
    }
    if (
      (
        headline.includes('同一个 her')
        || (
          headline.includes('same her')
          && (
            headline.includes('digital life project')
            || headline.includes('unfinished digital-life loop')
            || headline.includes('project progress')
            || headline.includes('open loop')
          )
        )
      )
      && typeof projectStateDiagnosticEntry.briefingHeadline === 'string'
      && projectStateDiagnosticEntry.briefingHeadline.trim()
    ) {
      return mergeProjectStateRepairBriefingTail(headline, projectStateDiagnosticEntry.briefingHeadline)
    }
    if (carriesAnthropomorphicSameHerClosureLine(headline)) {
      return headline
    }
    if (headline.toLowerCase().includes('same her')) {
      return headline
    }
    if (preferredProjectStateCarryLine) {
      return shouldAppendSupportLines || shouldAppendHostFacingClosureNextStep(projectStateDiagnosticEntry, preferredProjectStateCarryLine)
        ? mergeProjectStateRepairSupportLines(
            applyProjectStateTone(preferredProjectStateCarryLine, projectStateDiagnosticEntry.routeQuery?.status),
            projectStateDiagnosticEntry,
          )
        : applyProjectStateTone(preferredProjectStateCarryLine, projectStateDiagnosticEntry.routeQuery?.status)
    }
    if (briefingHeadline) {
      return shouldAppendSupportLines
        ? mergeProjectStateRepairSupportLines(
            applyProjectStateTone(briefingHeadline, projectStateDiagnosticEntry.routeQuery?.status),
            projectStateDiagnosticEntry,
          )
        : applyProjectStateTone(briefingHeadline, projectStateDiagnosticEntry.routeQuery?.status)
    }
    return shouldAppendSupportLines
      ? mergeProjectStateRepairSupportLines(
          applyProjectStateTone(headline, projectStateDiagnosticEntry.routeQuery?.status),
          projectStateDiagnosticEntry,
        )
      : applyProjectStateTone(headline, projectStateDiagnosticEntry.routeQuery?.status)
  }

  if (typeof diagnosticEntry?.briefingHeadline === 'string' && diagnosticEntry.briefingHeadline.trim()) {
    if (projectStateRepairFocused) {
      const projectStateBriefingLine = applyProjectStateTone(diagnosticEntry.briefingHeadline.trim(), diagnosticEntry.routeQuery?.status)
      return shouldAppendProjectStateRepairSupportLines(diagnosticEntry)
        ? mergeProjectStateRepairSupportLines(projectStateBriefingLine, diagnosticEntry)
        : projectStateBriefingLine
    }
    return diagnosticEntry.briefingHeadline.trim()
  }

  if (typeof snapshot.companionBriefingLine === 'string' && snapshot.companionBriefingLine.trim()) {
    if (projectStateRepairFocused) {
      const projectStateCompanionBriefingLine = applyProjectStateTone(snapshot.companionBriefingLine.trim(), diagnosticEntry?.routeQuery?.status)
      return shouldAppendProjectStateRepairSupportLines(diagnosticEntry)
        ? mergeProjectStateRepairSupportLines(projectStateCompanionBriefingLine, diagnosticEntry)
        : projectStateCompanionBriefingLine
    }
    return snapshot.companionBriefingLine.trim()
  }

  if (typeof diagnosticEntry?.headline === 'string' && diagnosticEntry.headline.trim())
    return diagnosticEntry.headline.trim()

  if (typeof snapshot.summaryLine === 'string' && snapshot.summaryLine.trim()) {
    if (projectStateRepairFocused) {
      const projectStateSummaryLine = applyProjectStateTone(snapshot.summaryLine.trim(), diagnosticEntry?.routeQuery?.status)
      return shouldAppendProjectStateRepairSupportLines(diagnosticEntry)
        ? mergeProjectStateRepairSupportLines(projectStateSummaryLine, diagnosticEntry)
        : projectStateSummaryLine
    }
    return snapshot.summaryLine.trim()
  }

  return null
}
