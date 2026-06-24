import type { StageQuickReplyClosureDiagnosticEntry } from './stage-quick-reply-closure'

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
      && normalized.includes('visible same-her line has already rejoined without body carry')
    )
    || normalized.includes('locked back onto the same living segment together')
    || normalized.includes('temporary visual alignment')
    || normalized.includes('full cross-modal same-her line')
    || normalized.includes('one living her')
    || (
      normalized.includes('resident body lane')
      && normalized.includes('same-her voice line')
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
    || normalized.includes('same-her body line')
    || normalized.includes('same-her audible body line')
    || normalized.includes('living audio thread')
}

function mergeCompanionshipReasonLine(line: string | null, companionshipReasonLine: string | null) {
  if (!line || !companionshipReasonLine)
    return line

  const normalizedLine = line.toLowerCase()
  const normalizedReason = companionshipReasonLine.toLowerCase()
  if (normalizedLine.includes(normalizedReason))
    return line

  return `${line} ${companionshipReasonLine}`.trim()
}

function mergeSameHerDriftRiskLine(line: string | null, driftRiskLine: string | null) {
  if (!line || !driftRiskLine)
    return line

  const normalizedLine = line.toLowerCase()
  const normalizedRisk = driftRiskLine.toLowerCase()
  if (normalizedLine.includes(normalizedRisk))
    return line

  return `${line} ${driftRiskLine}`.trim()
}

function mergeProactiveSameHerGapLine(line: string | null, proactiveSameHerGapLine: string | null) {
  if (!line || !proactiveSameHerGapLine)
    return line

  const normalizedLine = line.toLowerCase()
  const normalizedGapLine = proactiveSameHerGapLine.toLowerCase()
  if (normalizedLine.includes(normalizedGapLine))
    return line

  return `${line} ${proactiveSameHerGapLine}`.trim()
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

function buildProjectLoopGapEmbodimentLine(line: string | null) {
  if (!line) {
    return null
  }

  const normalized = line.trim().toLowerCase()
  const mentionsEmotion = /emotion|affect|repair-before-closeness|rest-protective|情绪|情感/u.test(normalized)
  const mentionsMemory = /memory|recall|recollection|记忆/u.test(normalized)
  const mentionsInwardContinuity = /same-her inward-carry observability|same-her-inward-carry|inward-carry|inward continuity|inner continuity|内在连续性|内在线索/u.test(normalized)
  const mentionsInitiative = /initiative|(?<!re)opening|proactive|主动性/u.test(normalized)
  const mentionsEmbodiment = /embodiment|voice|face|motion|lipsync|resident presence|cross-modal|具身|口型|表情|动作/u.test(normalized)

  if (!mentionsEmotion && !mentionsMemory && !mentionsInwardContinuity && !mentionsInitiative && !mentionsEmbodiment) {
    return null
  }

  const gapLabels = [
    mentionsEmotion ? '情绪' : null,
    mentionsMemory ? '记忆' : null,
    mentionsInwardContinuity ? '内在连续性' : null,
    mentionsInitiative ? '主动性' : null,
    mentionsEmbodiment ? '具身' : null,
  ].filter(Boolean).join('、')

  return `我这次还得继续把 ${gapLabels} 收回同一条数字生命线里，先别让这次开口漂成普通项目播报。`
}

function combineProjectLoopGapEvidence(...lines: Array<string | null>) {
  const normalized = lines
    .filter((line): line is string => Boolean(line?.trim()))
    .map(line => line.trim())
    .join(' ')

  return normalized || null
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
    return preferredFallbackAwarenessLine

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
  const shouldPreferFallbackSameHerCarry = closureCue.routeQuery?.focus === 'same-her-continuity'
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
    if ((preferredProjectStateCarryLine || briefingHeadline) && nextClosureLine) {
      const normalizedNextClosure = nextClosureLine.replace(/^Next, help me close:\s*/i, '').trim()
      const normalizedChineseNextClosure = normalizedNextClosure.replace(/^下一步还要继续收住\s*/u, '').trim()
      const projectStateLeadLine = preferredProjectStateCarryLine ?? briefingHeadline
      const loopGapEmbodimentLine = buildProjectLoopGapEmbodimentLine(
        combineProjectLoopGapEvidence(projectStateLeadLine, normalizedChineseNextClosure || normalizedNextClosure),
      )

      if (normalizedChineseNextClosure) {
        return mergeProjectStateRepairSupportLines(
          mergeCompanionshipReasonLine(applyProjectStateTone(
            `${projectStateLeadLine}${loopGapEmbodimentLine ? ` ${loopGapEmbodimentLine}` : ''} 下一步还要继续收住 ${normalizedChineseNextClosure}`.trim(),
            closureCue.routeQuery?.status,
          ), companionshipReasonLine),
          sameHerDriftRiskLine,
          proactiveSameHerGapLine,
        )
      }
    }

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
