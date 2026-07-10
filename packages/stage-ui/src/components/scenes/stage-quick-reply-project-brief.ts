import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  isAlicizationThinProjectAwarenessLine,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

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

const fixedTemplateQuickReplyProjectBriefPattern
  = /Before (?:answering|speaking|acting)|Right now\b|Same Phase 1 digital life|same-her|same her|same living line|same line inward|one living her|one continuous her|local-first digital life project|one living digital life project|same digital life project|living audio thread|living mouth line|同一个她|同一个\s*her|数字生命主线|记住这次开口/iu

const internalStructuredQuickReplyProjectBriefPattern
  = /phase1_local_digital_life|local_desktop_life_loop|visibility=internal-structured|content=excluded|status=content-excluded|\bidentity-continuity\b|\bcontinuity_(?:identity|line)\b|\bcontinuity_anchor=|\bcontinuity=|\bpending(?:[_-]rejoin)?=|\bpending\s+[a-z+]/iu

function normalizeProactiveSameHerGapLine(line: string | null | undefined) {
  const normalizedLine = typeof line === 'string' ? line.trim() : ''
  if (!normalizedLine)
    return null

  const reasonMatch = /^Proactive identity-continuity follow-through (?:still|currently) reads (.*?),(?:\s*so the next turn should|\s*which shows)/i.exec(normalizedLine)
  if (reasonMatch?.[1]?.trim()) {
    return normalizeProactiveSameHerGapLine(reasonMatch[1].trim())
  }

  const strippedLine = normalizedLine
    .replace(/^Proactive identity-continuity gap:\s*/i, '')
    .replace(/^Proactive identity-continuity follow-through:\s*/i, '')
    .trim()

  if (!strippedLine)
    return null

  const detailMatch = /^proactivesamehergap=\d+(?:\.\d+)?\s*\(\d+\/\d+\)\s*\|\s*checks whether (.*?)\.?$/i.exec(strippedLine)
  if (detailMatch?.[1]?.trim()) {
    return `${detailMatch[1]
      .trim()
      .replace(/\bstill stay on one identity-continuity follow-through line\b/i, 'still need one identity-continuity follow-through line')
      .replace(/\bstill stays on one identity-continuity follow-through line\b/i, 'still needs one identity-continuity follow-through line')
      .replace(/^\w/, char => char.toUpperCase())}.`
  }

  if (/^proactivesamehergap=\d+(?:\.\d+)?\s*\(\d+\/\d+\)$/i.test(strippedLine))
    return null

  return strippedLine
}

function resolveProactiveSameHerGapLine(snapshot: PreDialogueClosureSnapshot) {
  const briefingMatch = snapshot?.briefingLines?.find((line) => {
    const normalizedLine = line.trim()
    return /^Proactive identity-continuity gap:/i.test(normalizedLine)
      || /^Proactive identity-continuity follow-through:/i.test(normalizedLine)
  })
  const normalizedBriefingMatch = normalizeProactiveSameHerGapLine(briefingMatch)
  if (normalizedBriefingMatch)
    return normalizedBriefingMatch

  const reasonMatch = snapshot?.reasons?.find((reason) => {
    const normalizedReason = reason.trim()
    return /^Proactive identity-continuity follow-through (?:still|currently) reads /i.test(normalizedReason)
  })

  return normalizeProactiveSameHerGapLine(reasonMatch)
}

function scoreQuickReplyProjectBriefLine(line: string) {
  const normalized = line.toLowerCase()
  const isBareSameHerContinuityToken
    = normalized === 'identity-continuity-inward-carry'
      || normalized === 'quiet-companionship'
  const isNextClosureDirective
    = normalized.startsWith('next closure:')
      || normalized.startsWith('next, help me close:')
      || normalized.startsWith('下一步还要继续收住')
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
          normalized.includes('current continuity route')
          || normalized.includes('body, face, and motion')
        )
      )
  const carriesSameHerInwardObservability
    = normalized.includes('identity-continuity inward-carry observability')
      || normalized.includes('identity-continuity-inward-carry')
      || normalized.includes('inward-carry')
      || normalized.includes('inward continuity')
      || normalized.includes('inner continuity')
  const carriesAnthropomorphicEmotionalClosure
    = normalized.includes('anthropomorphic emotional closure')
      || (
        normalized.includes('emotional closure')
        && (
          normalized.includes('identity-continuity')
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
      || normalized.includes('identity-continuity seam')
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
    || normalized.includes('what has landed')
    || normalized.includes('life loop is still open')
    || normalized.includes('current continuity route')
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

function normalizeQuickReplyProjectBriefResidueTerms(line: string) {
  return line
    .replace(/\bsame-her\b/giu, 'continuity_identity')
    .replace(/\bsame her\b/giu, 'continuity_identity')
    .replace(/\bsame living line\b/giu, 'continuity_line')
    .replace(/\bsame living segment\b/giu, 'continuity_segment')
    .replace(/\bsame line inward\b/giu, 'inward_continuity_line')
    .replace(/\bone living her\b/giu, 'continuity_identity')
    .replace(/\bone continuous her\b/giu, 'project_state_continuity')
    .replace(/\bliving audio thread\b/giu, 'audible continuity thread')
    .replace(/\bliving mouth line\b/giu, 'lipsync continuity lane')
    .replace(/同一个\s*her/giu, 'continuity_identity')
    .replace(/同一个她/gu, 'continuity_identity')
    .replace(/数字生命主线/gu, 'local_desktop_continuity')
    .trim()
}

function containsInternalStructuredQuickReplyProjectBriefField(line: string | null | undefined) {
  const normalized = line?.trim() ?? ''
  if (!normalized)
    return false

  return internalStructuredQuickReplyProjectBriefPattern.test(normalized)
}

function containsVisibleQuickReplyProjectBriefResidue(line: string | null | undefined) {
  const normalized = line?.trim() ?? ''
  if (!normalized)
    return false

  return fixedTemplateQuickReplyProjectBriefPattern.test(normalized)
    || containsAlicizationFixedTemplateResidue(normalized)
}

function sanitizeVisibleQuickReplyProjectBriefLine(line: string) {
  const rawLine = line.trim().replace(/\s+/g, ' ')
  if (!rawLine)
    return null

  if (containsInternalStructuredQuickReplyProjectBriefField(rawLine))
    return null

  const normalizedResidueTerms = normalizeQuickReplyProjectBriefResidueTerms(rawLine)
  if (normalizedResidueTerms !== rawLine)
    return preserveStructuredQuickReplyProjectBriefFragments(rawLine)

  const normalized = sanitizeAlicizationProviderFacingText(rawLine, 800)
  if (
    normalized
    && normalized !== alicizationFixedTemplateReplacement
    && !containsInternalStructuredQuickReplyProjectBriefField(normalized)
    && !containsVisibleQuickReplyProjectBriefResidue(normalized)
  ) {
    return normalized
  }

  return preserveStructuredQuickReplyProjectBriefFragments(rawLine)
}

function preserveStructuredQuickReplyProjectBriefFragments(line: string) {
  const fragments = line
    .split('|')
    .map((fragment) => {
      const rawFragment = fragment.trim()
      return {
        rawFragment,
        normalizedFragment: normalizeQuickReplyProjectBriefResidueTerms(rawFragment),
      }
    })
    .filter(({ rawFragment, normalizedFragment }) => {
      if (!rawFragment || !normalizedFragment)
        return false
      if (rawFragment !== normalizedFragment)
        return false
      if (containsInternalStructuredQuickReplyProjectBriefField(rawFragment))
        return false
      if (containsVisibleQuickReplyProjectBriefResidue(rawFragment))
        return false
      if (containsInternalStructuredQuickReplyProjectBriefField(normalizedFragment))
        return false
      if (containsVisibleQuickReplyProjectBriefResidue(normalizedFragment))
        return false
      return true
    })
    .map(({ normalizedFragment }) => normalizedFragment)
    .filter((fragment) => {
      if (!fragment)
        return false
      if (/^[a-z][\w+-]*=/iu.test(fragment))
        return true
      return /\brecovery@|\brejoin@|\bactive\b|\bpending(?: |-)?[a-z+]+|\bpending-rejoin=/iu.test(fragment)
        && !/Continuity evidence: |Continuity evidence: |Phase 1 continuity route|Right now (?:I am|the)|current continuity route/iu.test(fragment)
    })

  if (fragments.length)
    return fragments.filter((fragment, index, list) => list.indexOf(fragment) === index).join(' | ')

  return null
}

function matchesProjectBriefFilter(line: string) {
  const normalizedLine = line.toLowerCase()
  return normalizedLine.includes('phase1_local_digital_life')
    || normalizedLine.includes('project identity')
    || normalizedLine.includes('project awareness')
    || normalizedLine.includes('landed progress')
    || normalizedLine.includes('primary open life loop')
    || normalizedLine.includes('open life loop')
    || normalizedLine.includes('remaining-open=')
    || normalizedLine.includes('next closure')
    || normalizedLine.includes('identity-continuity')
    || normalizedLine.includes('proactive identity-continuity')
    || normalizedLine.includes('embodiment seam')
    || normalizedLine.includes('closure seam')
    || normalizedLine.includes('current continuity route')
    || normalizedLine.includes('low-pressure')
    || normalizedLine.includes('quiet-companionship')
    || normalizedLine.includes('identity-continuity-inward-carry')
    || normalizedLine.includes('identity-continuity inward-carry observability')
    || normalizedLine.includes('inward-carry')
    || normalizedLine.includes('inward continuity')
    || normalizedLine.includes('inner continuity')
    || normalizedLine.includes('anthropomorphic emotional closure')
    || normalizedLine.includes('emotional closure')
    || normalizedLine.includes('visible proactive hold')
    || normalizedLine.includes('subconscious carry')
    || normalizedLine.includes('next-session feedback')
    || normalizedLine.includes('still-voiced face line')
    || normalizedLine.includes('still-voiced motion line')
    || normalizedLine.includes('resident body continuity')
    || normalizedLine.includes('resident-body continuity')
    || normalizedLine.includes('resident-body+voice')
    || normalizedLine.includes('resident body line')
    || normalizedLine.includes('identity-continuity voice line')
    || normalizedLine.includes('identity-continuity body line')
    || normalizedLine.includes('identity-continuity audible body line')
    || normalizedLine.includes('surviving pre-dialogue carry')
    || normalizedLine.includes('body continuity')
    || normalizedLine.includes('continuity=embodiment:')
    || normalizedLine.includes('signature=resident|')
    || normalizedLine.includes('continuity=embodiment:audible-identity-continuity-line')
    || normalizedLine.includes('continuity=embodiment:still-voiced-face-motion-line')
    || normalizedLine.includes('embodiment:still-voiced-face-lipsync-line')
    || normalizedLine.includes('continuity=embodiment:still-voiced-face-line')
    || normalizedLine.includes('embodiment:still-voiced-motion-lipsync-line')
    || normalizedLine.includes('continuity=embodiment:still-voiced-motion-line')
    || normalizedLine.includes('continuity=embodiment:body-lipsync-voice-rejoin')
    || normalizedLine.includes('signature=embodiment:audible-identity-continuity-line')
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

function isCleanQuickReplyProjectBriefLine(line: string) {
  return matchesProjectBriefFilter(line)
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

  const sanitizedLines = lines
    .map(sanitizeVisibleQuickReplyProjectBriefLine)
    .filter((line): line is string => Boolean(line))
    .filter((line, index, entries) => entries.indexOf(line) === index)

  return sanitizedLines
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
