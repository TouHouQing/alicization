import { isAlicizationThinProjectAwarenessLine } from '@proj-alicization/stage-shared'

type PreDialogueAwarenessSnapshot = {
  summaryLine?: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  awarenessLine?: string | null
  companionNextClosureLine?: string | null
  reasonPreview?: string[] | null
} | null | undefined

type PreDialogueClosureSnapshot = {
  summaryLine?: string | null
  briefingLines?: string[] | null
  reasons?: string[] | null
} | null | undefined

function normalizeProactiveSameHerGapLine(line: string | null | undefined) {
  const normalizedLine = typeof line === 'string' ? line.trim() : ''
  if (!normalizedLine)
    return null

  const reasonMatch = /^Proactive same-her follow-through (?:still|currently) reads (.*?),(?:\s*so the next turn should|\s*which shows)/i.exec(normalizedLine)
  if (reasonMatch?.[1]?.trim()) {
    return normalizeProactiveSameHerGapLine(reasonMatch[1].trim())
  }

  const strippedLine = normalizedLine
    .replace(/^Proactive same-her gap:\s*/i, '')
    .replace(/^Proactive same-her follow-through:\s*/i, '')
    .trim()

  if (!strippedLine)
    return null

  const detailMatch = /^proactivesamehergap=\d+(?:\.\d+)?\s*\(\d+\/\d+\)\s*\|\s*checks whether (.*?)\.?$/i.exec(strippedLine)
  if (detailMatch?.[1]?.trim()) {
    return `${detailMatch[1]
      .trim()
      .replace(/\bstill stay on one same-her follow-through line\b/i, 'still need one same-her follow-through line')
      .replace(/\bstill stays on one same-her follow-through line\b/i, 'still needs one same-her follow-through line')
      .replace(/^\w/, char => char.toUpperCase())}.`
  }

  if (/^proactivesamehergap=\d+(?:\.\d+)?\s*\(\d+\/\d+\)$/i.test(strippedLine))
    return null

  return strippedLine
}

function resolveProactiveSameHerGapLine(snapshot: PreDialogueClosureSnapshot) {
  const briefingMatch = snapshot?.briefingLines?.find((line) => {
    const normalizedLine = line.trim()
    return /^Proactive same-her gap:/i.test(normalizedLine)
      || /^Proactive same-her follow-through:/i.test(normalizedLine)
  })
  const normalizedBriefingMatch = normalizeProactiveSameHerGapLine(briefingMatch)
  if (normalizedBriefingMatch)
    return normalizedBriefingMatch

  const reasonMatch = snapshot?.reasons?.find((reason) => {
    const normalizedReason = reason.trim()
    return /^Proactive same-her follow-through (?:still|currently) reads /i.test(normalizedReason)
  })

  return normalizeProactiveSameHerGapLine(reasonMatch)
}

function scoreQuickReplyProjectBriefLine(line: string) {
  const normalized = line.toLowerCase()
  const isBareSameHerContinuityToken
    = normalized === 'same-her-inward-carry'
      || normalized === 'quiet-companionship'
  const isNextClosureDirective
    = normalized.startsWith('next closure:')
      || normalized.startsWith('next, help me close:')
      || normalized.startsWith('下一步还要继续收住')
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
  const carriesProjectState
    = normalized.includes('before speaking')
      || normalized.includes('project identity')
      || normalized.includes('landed progress')
      || normalized.includes('what has landed')
      || normalized.includes('life loop is still open')
      || normalized.includes('still-open life loop')
      || normalized.includes('next closure')
  const carriesRichProjectReminder = carriesProjectState
    && (
      normalized.includes('what has landed')
      || normalized.includes('which life loop is still open')
      || normalized.includes('still-open embodiment seam')
      || normalized.includes('same-her seam')
      || normalized.includes('audible-body')
    )

  if (normalized.includes('phase 1'))
    score += 3
  if (carriesSameHerMeasuredReturn)
    score += 5
  if (carriesSameHerInwardLowPressure)
    score += 6
  if (carriesSameHerInwardObservability)
    score += 6
  if (carriesAnthropomorphicEmotionalClosure)
    score += 5
  if (carriesExplicitSameHerContinuityEvidence)
    score += 5
  if (
    normalized.includes('digital life')
    || normalized.includes('one living digital life project')
    || normalized.includes('what has landed')
    || normalized.includes('life loop is still open')
    || normalized.includes('same living line')
  ) {
    score += 2
  }
  if (carriesRichProjectReminder)
    score += 2
  if (
    !carriesSameHerInwardLowPressure
    && !carriesSameHerMeasuredReturn
    && !carriesProjectState
    && (
      normalized.includes('body')
      || normalized.includes('face')
      || normalized.includes('motion')
      || normalized.includes('lipsync')
      || normalized.includes('voice')
    )
  ) {
    score -= 1
  }
  if (isBareSameHerContinuityToken)
    score -= 8
  if (isNextClosureDirective)
    score -= 3

  return score
}

function isGenericProjectClosureSummaryLine(line: string) {
  const normalized = line.toLowerCase()

  return normalized.includes('alicization is still closing phase 1 local digital life continuity')
    || isAlicizationThinProjectAwarenessLine(line)
}

function uniqueNonEmptyLines(lines: Array<string | null | undefined>) {
  return lines.filter((line, index, entries): line is string => Boolean(line) && entries.indexOf(line) === index)
}

function matchesProjectBriefFilter(line: string) {
  const normalizedLine = line.toLowerCase()
  return normalizedLine.includes('alicization')
    || normalizedLine.includes('digital life')
    || normalizedLine.includes('phase 1')
    || normalizedLine.includes('project identity')
    || normalizedLine.includes('project awareness')
    || normalizedLine.includes('landed progress')
    || normalizedLine.includes('primary open life loop')
    || normalizedLine.includes('open life loop')
    || normalizedLine.includes('remaining-open=')
    || normalizedLine.includes('next closure')
    || normalizedLine.includes('same-her')
    || normalizedLine.includes('proactive same-her')
    || normalizedLine.includes('embodiment seam')
    || normalizedLine.includes('closure seam')
    || normalizedLine.includes('one living her')
    || normalizedLine.includes('one living digital life project')
    || normalizedLine.includes('same line inward')
    || normalizedLine.includes('same living line')
    || normalizedLine.includes('low-pressure')
    || normalizedLine.includes('quiet-companionship')
    || normalizedLine.includes('same-her-inward-carry')
    || normalizedLine.includes('same-her inward-carry observability')
    || normalizedLine.includes('inward-carry')
    || normalizedLine.includes('inward continuity')
    || normalizedLine.includes('inner continuity')
    || normalizedLine.includes('anthropomorphic emotional closure')
    || normalizedLine.includes('emotional closure')
    || normalizedLine.includes('visible proactive hold')
    || normalizedLine.includes('subconscious carry')
    || normalizedLine.includes('next-session feedback')
    || normalizedLine.includes('living audio thread')
    || normalizedLine.includes('living mouth line')
    || normalizedLine.includes('still-voiced face line')
    || normalizedLine.includes('still-voiced motion line')
    || normalizedLine.includes('living her coherent')
    || normalizedLine.includes('resident body continuity')
    || normalizedLine.includes('resident-body continuity')
    || normalizedLine.includes('resident-body+voice')
    || normalizedLine.includes('resident body line')
    || normalizedLine.includes('same-her voice line')
    || normalizedLine.includes('same-her body line')
    || normalizedLine.includes('same-her audible body line')
    || normalizedLine.includes('surviving pre-dialogue carry')
    || normalizedLine.includes('body continuity')
    || normalizedLine.includes('continuity=embodiment:audible-same-her-line')
    || normalizedLine.includes('continuity=embodiment:still-voiced-face-motion-line')
    || normalizedLine.includes('embodiment:still-voiced-face-lipsync-line')
    || normalizedLine.includes('continuity=embodiment:still-voiced-face-line')
    || normalizedLine.includes('embodiment:still-voiced-motion-lipsync-line')
    || normalizedLine.includes('continuity=embodiment:still-voiced-motion-line')
    || normalizedLine.includes('continuity=embodiment:body-lipsync-voice-rejoin')
    || normalizedLine.includes('signature=embodiment:audible-same-her-line')
    || normalizedLine.includes('focus=body+lipsync+voice')
    || normalizedLine.includes('focus=resident-body')
    || normalizedLine.includes('focus=body+face+motion')
    || normalizedLine.includes('focus=body+voice')
    || normalizedLine.includes('focus=face+motion')
    || normalizedLine.includes('focus=face+motion+voice')
    || normalizedLine.includes('focus=face+lipsync')
    || normalizedLine.includes('focus=face+lipsync+voice')
    || normalizedLine.includes('focus=face+voice')
    || normalizedLine.includes('focus=motion+lipsync')
    || normalizedLine.includes('focus=motion+lipsync+voice')
    || normalizedLine.includes('focus=motion+voice')
    || normalizedLine.includes('focus=lipsync+voice')
    || normalizedLine.includes('focus=voice')
    || normalizedLine.includes('lane=face+lipsync-only')
    || normalizedLine.includes('lane=motion+lipsync-only')
    || normalizedLine.includes('pending=face+motion')
    || normalizedLine.includes('pending=face+motion+lipsync')
    || normalizedLine.includes('pending=face+motion+lipsync+voice')
    || normalizedLine.includes('pending=lipsync+voice')
    || normalizedLine.includes('pending=body+motion+voice')
    || normalizedLine.includes('pending=body+motion+lipsync')
    || normalizedLine.includes('pending=body+face+voice')
    || normalizedLine.includes('pending=body+face+lipsync')
    || normalizedLine.includes('pending=body+lipsync')
    || normalizedLine.includes('pending=body+lipsync+voice')
    || normalizedLine.includes('pending=body+face+motion')
    || normalizedLine.includes('pending=body+face+motion+lipsync')
    || normalizedLine.includes('face+motion+voice recovery@')
    || normalizedLine.includes('face+lipsync+voice recovery@')
    || normalizedLine.includes('face+voice recovery@')
    || normalizedLine.includes('motion+lipsync+voice recovery@')
    || normalizedLine.includes('motion+voice recovery@')
    || normalizedLine.includes('body+lipsync+voice recovery@')
    || normalizedLine.includes('audible-body rejoin@')
    || normalizedLine.includes('face, motion, and lipsync continuity')
    || normalizedLine.includes('face, motion, lipsync, and voice continuity')
}

export function buildStageQuickReplyProjectBriefLines(
  preDialogueAwarenessSnapshot: PreDialogueAwarenessSnapshot,
  preDialogueClosureSnapshot: PreDialogueClosureSnapshot,
) {
  const awarenessCandidates = uniqueNonEmptyLines([
    preDialogueAwarenessSnapshot?.companionHeadlineLine ?? null,
    preDialogueAwarenessSnapshot?.awarenessLine ?? null,
    preDialogueAwarenessSnapshot?.summaryLine ?? null,
    preDialogueAwarenessSnapshot?.companionBriefingLine ?? null,
  ]).sort((left, right) => {
    const leftScore = scoreQuickReplyProjectBriefLine(left)
    const rightScore = scoreQuickReplyProjectBriefLine(right)
    if (rightScore !== leftScore)
      return rightScore - leftScore

    const leftGenericProjectClosureSummary = isGenericProjectClosureSummaryLine(left)
    const rightGenericProjectClosureSummary = isGenericProjectClosureSummaryLine(right)
    if (leftGenericProjectClosureSummary !== rightGenericProjectClosureSummary)
      return leftGenericProjectClosureSummary ? 1 : -1

    return 0
  })

  const lines = uniqueNonEmptyLines([
    ...awarenessCandidates,
    preDialogueAwarenessSnapshot?.companionNextClosureLine ?? null,
    ...(preDialogueAwarenessSnapshot?.reasonPreview ?? []),
    resolveProactiveSameHerGapLine(preDialogueClosureSnapshot),
    preDialogueClosureSnapshot?.summaryLine ?? null,
    ...(preDialogueClosureSnapshot?.briefingLines ?? []),
  ])

  return lines
    .filter(matchesProjectBriefFilter)
    .sort((left, right) => {
      const leftScore = scoreQuickReplyProjectBriefLine(left)
      const rightScore = scoreQuickReplyProjectBriefLine(right)
      if (rightScore !== leftScore)
        return rightScore - leftScore

      const leftGenericProjectClosureSummary = isGenericProjectClosureSummaryLine(left)
      const rightGenericProjectClosureSummary = isGenericProjectClosureSummaryLine(right)
      if (leftGenericProjectClosureSummary !== rightGenericProjectClosureSummary)
        return leftGenericProjectClosureSummary ? 1 : -1

      return 0
    })
}
