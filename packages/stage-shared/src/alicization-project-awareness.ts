import { describeAlicizationEmbodimentClosureHeadline } from './alicization-embodiment-closure'
import { containsAlicizationFixedTemplateResidue } from './alicization-fixed-template-sanitizer'
import { formatAlicizationProjectStateAwarenessFields } from './alicization-project-state-awareness-format'

function sanitizeProjectAwarenessText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

const PROJECT_AWARENESS_RETURN_MAX_CHARS = 3200

function containsProjectAwarenessFixedTemplateResidue(raw: unknown) {
  const normalized = sanitizeProjectAwarenessText(raw, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  return Boolean(normalized) && (
    containsAlicizationFixedTemplateResidue(normalized)
    || /\bcontinuity=embodiment(?::|=|\b)|\bpending-rejoin=/iu.test(normalized)
    || /\bBefore (?:answering|speaking|acting)\b/iu.test(normalized)
  )
}

type AlicizationProjectAwarenessSource = {
  identity?: unknown
  currentPhase?: unknown
  preDialogueAwarenessLine?: unknown
  awarenessLine?: unknown
  companionHeadlineLine?: unknown
  companionBriefingLine?: unknown
  preDialogueAwarenessSummary?: unknown
  latestLandedProgress?: unknown
  latestProgress?: unknown
  primaryOpenLoop?: unknown
  emotionalClosureCue?: unknown
  landedProgressSummary?: unknown
  openClosureSummary?: unknown
  nextClosureTarget?: unknown
  nextClosureTargetSummary?: unknown
  sameHerSelfLine?: unknown
  sameHerHoldDetail?: unknown
  continuityCue?: unknown
  proactiveSameHerGap?: unknown
  sameHerDriftRisk?: unknown
  sameHerDriftRiskSummary?: unknown
  emotionalClosureSummary?: unknown
} | null | undefined

function hasMeaningfulStructuredProjectAwarenessFact(text: string) {
  return /(?:^|\|\s*)(?:identity|phase|landed|open|next|initiative_gap|emotional_closure|status|summary|embodiment_lanes|missing_lanes|pending_lanes|evidence|ref|trace|source|timing)=/iu.test(text)
}

function preserveStructuredProjectAwarenessFragments(text: string) {
  const fragments = text
    .split('|')
    .map(fragment => fragment.trim())
    .filter((fragment) => {
      if (!fragment || !/^[a-z][\w+-]*=/iu.test(fragment))
        return false
      if (/^(?:same_her|same-her|project_awareness|proactive_gap|continuity_anchor|continuity_hold|project_state_continuity|life_loop_continuity|cross_modal_continuity_proof|continuity|lane|pending_rejoin|visibility|affective_closure|observability)=/iu.test(fragment))
        return false
      return !containsProjectAwarenessFixedTemplateResidue(fragment)
    })

  const preserved = fragments
    .filter((fragment, index, list) => list.indexOf(fragment) === index)
    .join(' | ')

  return preserved && hasMeaningfulStructuredProjectAwarenessFact(preserved)
    ? preserved
    : ''
}

function neutralizeContinuityCarryText(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 640)
    .replace(/^\s*same-her hold\s*[:=]\s*/iu, '')
    .trim()
  if (!normalized)
    return ''

  const lower = normalized.toLowerCase()
  if (/repair-before-closeness|repair before closeness|repair-first|repair first/u.test(lower)) {
    return [
      'repair_before_closeness',
      /before closeness widens|closeness widens/u.test(lower) ? 'timing=before_closeness_widens' : '',
      /repair settles|repair settle/u.test(lower) ? 'until=repair_settles' : '',
    ].filter(Boolean).join('; ')
  }
  if (/rest-protective|rest protective|protect rest|rest protection/u.test(lower)) {
    return [
      'rest_protective',
      /fatigue-aware|fatigue aware/u.test(lower) ? 'timing=fatigue_aware' : '',
      /inward|内收/u.test(lower) ? 'direction=inward' : '',
    ].filter(Boolean).join('; ')
  }
  if (/measured-return|measured return|lower-pressure|low-pressure/u.test(lower)) {
    return [
      'measured_return',
      /lower-pressure|low-pressure/u.test(lower) ? 'pressure=lower' : '',
      /slower/u.test(lower) ? 'pacing=slower' : '',
      /longer/u.test(lower) ? 'pause=longer' : '',
      /restrained/u.test(lower) ? 'lipsync=restrained' : '',
    ].filter(Boolean).join('; ')
  }

  return containsProjectAwarenessFixedTemplateResidue(normalized) ? '' : normalized
}

function buildStructuredProjectAwarenessFromState(
  projectState: AlicizationProjectAwarenessSource,
  options?: {
    allowContinuityHoldOnly?: boolean
  },
) {
  if (!projectState)
    return ''

  const identity = (() => {
    const value = sanitizeProjectAwarenessText(projectState.identity, 640)
    return containsProjectAwarenessFixedTemplateResidue(value) || /alicization is .*local-first digital life project|local_desktop_life_loop/iu.test(value)
      ? ''
      : value
  })()
  const currentPhase = (() => {
    const value = sanitizeProjectAwarenessText(projectState.currentPhase, 640)
    return containsProjectAwarenessFixedTemplateResidue(value) || /local digital life|local_desktop_life_loop|第一阶段|阶段一/iu.test(value)
      ? ''
      : value
  })()
  const continuityAnchor = (() => {
    const sameHerSelfLine = sanitizeProjectAwarenessText(projectState.sameHerSelfLine, 640)
    if (containsProjectAwarenessFixedTemplateResidue(sameHerSelfLine) || /\blocal_desktop_life_loop\b|phase1_local_digital_life/iu.test(sameHerSelfLine))
      return ''
    return sameHerSelfLine
  })()
  const continuityHold = (() => {
    const value = sanitizeProjectAwarenessText(
      projectState.sameHerHoldDetail ?? projectState.continuityCue,
      640,
    )
    return neutralizeContinuityCarryText(value)
  })()
  const hasCoreProjectAwarenessFact = Boolean(
    identity
    || currentPhase
    || sanitizeProjectAwarenessText(
      projectState.latestLandedProgress
      ?? projectState.landedProgressSummary
      ?? projectState.latestProgress,
      640,
    )
    || sanitizeProjectAwarenessText(
      projectState.primaryOpenLoop
      ?? projectState.openClosureSummary,
      640,
    )
    || sanitizeProjectAwarenessText(
      projectState.nextClosureTarget
      ?? projectState.nextClosureTargetSummary,
      640,
    )
    || continuityAnchor
    || sanitizeProjectAwarenessText(projectState.sameHerDriftRiskSummary ?? projectState.sameHerDriftRisk, 640)
    || sanitizeProjectAwarenessText(projectState.proactiveSameHerGap, 640)
    || sanitizeProjectAwarenessText(projectState.emotionalClosureCue ?? projectState.emotionalClosureSummary, 640)
    || sanitizeProjectAwarenessText(projectState.preDialogueAwarenessSummary, 640),
  )

  if (!hasCoreProjectAwarenessFact && continuityHold && options?.allowContinuityHoldOnly !== true)
    return ''

  const structuredFacts = formatAlicizationProjectStateAwarenessFields({
    identity,
    currentPhase,
    latestLandedProgress:
      projectState.latestLandedProgress
      ?? projectState.landedProgressSummary
      ?? projectState.latestProgress,
    primaryOpenLoop:
      projectState.primaryOpenLoop
      ?? projectState.openClosureSummary,
    nextClosureTarget:
      projectState.nextClosureTarget
      ?? projectState.nextClosureTargetSummary,
    continuityAnchor,
    sameHerHoldDetail: continuityHold,
    continuityDriftRisk:
      projectState.sameHerDriftRiskSummary
      ?? projectState.sameHerDriftRisk,
    proactiveSameHerGap: projectState.proactiveSameHerGap,
    emotionalClosureCue:
      projectState.emotionalClosureCue
      ?? projectState.emotionalClosureSummary,
    summary: projectState.preDialogueAwarenessSummary,
    maxChars: PROJECT_AWARENESS_RETURN_MAX_CHARS,
  })

  if (hasMeaningfulStructuredProjectAwarenessFact(structuredFacts))
    return structuredFacts

  return buildStructuredProjectAwarenessFromLegacyLine(
    projectState.preDialogueAwarenessLine
    ?? projectState.awarenessLine
    ?? projectState.companionBriefingLine
    ?? projectState.companionHeadlineLine,
  )
}

function buildStructuredEmbodimentAwarenessFromLegacyLine(text: string) {
  const normalized = sanitizeProjectAwarenessText(text, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  const structuredHeadline = describeAlicizationEmbodimentClosureHeadline({
    authoritySummary: normalized,
  })
  if (
    hasMeaningfulStructuredProjectAwarenessFact(structuredHeadline)
    && !/(?:^|\|\s*)embodiment_lanes=unknown(?:\s*\||$)/iu.test(structuredHeadline)
  ) {
    return structuredHeadline
  }

  if (!/\bRight now (?:I am|the host-facing|this one living her|her)\b/iu.test(normalized))
    return ''

  if (/anthropomorphic emotional closure/iu.test(normalized)) {
    return [
      'emotional_closure=anthropomorphic_emotional_closure',
      /(?:same-her|continuity) inward-carry observability/iu.test(normalized)
        ? 'evidence=inward_carry'
        : '',
      /measured-return/iu.test(normalized)
        ? 'timing=measured_return'
        : '',
    ].filter(Boolean).join(' | ')
  }

  const lowerCased = normalized.toLowerCase()
  const allLanes = ['body', 'face', 'motion', 'lipsync', 'voice']
  const mentionedLanes = allLanes.filter((lane) => {
    const pattern = new RegExp(`\\b${lane}\\b`, 'iu')
    return pattern.test(lowerCased)
  })
  const pendingSource = lowerCased.match(/(?:while|but)\s+([^.!?。]+?)\s+(?:need|needs|still need|still needs|还要|需要)\s+(?:to\s+)?(?:rejoin|close|接回|闭环)/u)?.[1] ?? ''
  const pendingLanes = allLanes.filter((lane) => {
    const pattern = new RegExp(`\\b${lane}\\b`, 'iu')
    return pattern.test(pendingSource)
  })
  const activeLanes = mentionedLanes.filter(lane => !pendingLanes.includes(lane))
  if (!activeLanes.length && !pendingLanes.length)
    return ''

  const effectiveActiveLanes = activeLanes.length
    ? activeLanes
    : allLanes.filter(lane => !pendingLanes.includes(lane))
  return [
    `embodiment_lanes=${effectiveActiveLanes.join('+')}`,
    pendingLanes.length ? `missing_lanes=${pendingLanes.join('+')}` : '',
    `status=${pendingLanes.length ? 'partial' : 'closed'}`,
    /low-pressure|same line inward|inward-carry/iu.test(normalized)
      ? 'evidence=low-pressure-inward-carry'
      : 'evidence=legacy-headline-migrated',
  ].filter(Boolean).join(' | ')
}

function extractLegacySentenceAfterMarker(text: string, marker: RegExp) {
  const match = marker.exec(text)
  if (!match?.index && match?.index !== 0)
    return ''

  const start = match.index + match[0].length
  return sanitizeProjectAwarenessText(
    text.slice(start).split(/(?<=[.!?。！？])\s+/u)[0],
    420,
  )
}

function buildStructuredProjectAwarenessFromLegacyLine(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  if (!normalized)
    return ''

  const latestLandedProgress
    = extractLegacySentenceAfterMarker(normalized, /\b(?:What has already landed is|Landed:|Latest landed progress:)\s*/iu)
  const primaryOpenLoop
    = extractLegacySentenceAfterMarker(normalized, /\b(?:The still-open closure is|Still-open closure gap:|Open:)\s*/iu)
  const nextClosureTarget
    = extractLegacySentenceAfterMarker(normalized, /\b(?:This reply should keep moving toward|The next closure target is|Next closure target:)\s*/iu)
  if (!latestLandedProgress && !primaryOpenLoop && !nextClosureTarget)
    return ''

  const structuredFacts = formatAlicizationProjectStateAwarenessFields({
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
    maxChars: PROJECT_AWARENESS_RETURN_MAX_CHARS,
  })

  return hasMeaningfulStructuredProjectAwarenessFact(structuredFacts)
    ? structuredFacts
    : ''
}

function buildStructuredTemplateExclusionAwareness(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  if (!normalized || !containsProjectAwarenessFixedTemplateResidue(normalized))
    return ''

  return ''
}

function buildStructuredContinuityHoldFromLegacyLine(text: string) {
  const normalized = sanitizeProjectAwarenessText(text, 640)
  if (!/^same-her hold\s*[:=]/iu.test(normalized))
    return ''

  return buildStructuredProjectAwarenessFromState({
    sameHerHoldDetail: normalized,
  }, { allowContinuityHoldOnly: true })
}

function finalizeProjectAwarenessLine(input: {
  candidate: unknown
  runtimeProjectState?: AlicizationProjectAwarenessSource
  fallbackProjectState?: AlicizationProjectAwarenessSource
}) {
  const candidate = sanitizeProjectAwarenessText(
    input.candidate,
    PROJECT_AWARENESS_RETURN_MAX_CHARS,
  )
  if (!candidate)
    return ''

  const candidateContainsFixedTemplate = containsProjectAwarenessFixedTemplateResidue(candidate)
  if (!candidateContainsFixedTemplate && hasMeaningfulStructuredProjectAwarenessFact(candidate))
    return candidate

  const structuredFragments = preserveStructuredProjectAwarenessFragments(candidate)
  if (structuredFragments)
    return structuredFragments

  if (!candidateContainsFixedTemplate) {
    const structuredSummary = formatAlicizationProjectStateAwarenessFields({
      summary: candidate,
      maxChars: PROJECT_AWARENESS_RETURN_MAX_CHARS,
    })
    return hasMeaningfulStructuredProjectAwarenessFact(structuredSummary)
      ? structuredSummary
      : ''
  }

  return buildStructuredContinuityHoldFromLegacyLine(candidate)
    || buildStructuredProjectAwarenessFromLegacyLine(candidate)
    || buildStructuredEmbodimentAwarenessFromLegacyLine(candidate)
    || buildStructuredProjectAwarenessFromState(input.runtimeProjectState)
    || buildStructuredProjectAwarenessFromState(input.fallbackProjectState)
    || buildStructuredTemplateExclusionAwareness(candidate)
}

function looksLikeThinProjectAwarenessShell(text: string) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false
  if (/\b(?:detached project shell|detached project narration|project-summary voice|generic assistant|generic task shell|project shell)\b/i.test(normalized))
    return false

  return /\b(?:keep (?:(?:this|the) )?same digital life project in view|generic reminder|generic guidance|embodiment continuity risk)\b/i.test(normalized)
    || normalized === 'same digital life | keep the closure seam explicit'
    || normalized === 'same digital life | keep the desktop closure line explicit'
}

function carriesCanonicalFullReanchor(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('before answering, remember: alicization is a local-first digital life project building one continuous "her"')
    && normalized.includes('she is still inside phase 1: local digital life')
    && normalized.includes('the still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    && normalized.includes('same phase 1 digital life')
}

function carriesCanonicalCompactReanchor(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('alicization is a local-first digital life project building one continuous "her"')
    && normalized.includes('phase 1: local digital life')
    && normalized.includes('open=memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
}

function carriesCanonicalPhaseOneShell(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('before answering, remember: alicization is a local-first digital life project')
    && normalized.includes('she is still inside phase 1: local digital life')
    && normalized.includes('same phase 1 digital life')
}

function carriesGeneratedProjectAwarenessExpansion(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.startsWith('before answering, remember: alicization is a local-first digital life project building one continuous "her"')
    && normalized.includes('phase 1: local digital life')
    && (
      normalized.includes('what has already landed is')
      || normalized.includes('the still-open closure is')
      || normalized.includes('keep one continuous her explicit:')
    )
}

function carriesThinChinesePhaseOneShell(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  const carriesExplicitOpenLoopCue = /未闭环|没闭环|还没闭环|还差|收稳|收住|记忆|主动性|具身|执行|情绪|声音|表情|动作|唇型|open=|next=|same-her=|landed=|still-open/u.test(normalized)
  const carriesThinReminderShell
    = (
      /回答前先记住|先记住这是同一个她|先记住这是同一个 her/u.test(normalized)
      && normalized.includes('数字生命项目')
      && (/同一个她|同一个 her/u.test(normalized))
      && /别把这条线忘了|别把这条线弄丢/u.test(normalized)
    )

  return (
    /^开口前先记住：这还?是同一个/u.test(normalized)
    && normalized.includes('数字生命项目')
    && /phase 1|第一阶段|阶段一/u.test(normalized)
    && (/现在仍在|当前仍在|仍在 phase 1|仍在第一阶段|仍在阶段一|还在 phase 1|还在第一阶段|还在阶段一/u.test(normalized))
    && !carriesExplicitOpenLoopCue
  ) || (carriesThinReminderShell && !carriesExplicitOpenLoopCue)
}

function carriesLivedInSameHerLine(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320)
  if (!normalized)
    return false
  if (containsProjectAwarenessFixedTemplateResidue(normalized))
    return false

  const lower = normalized.toLowerCase()
  const carriesStructuredAuthority
    = /(?:^|\|\s*)(?:landed|open|next|status|summary|emotional_closure|embodiment_lanes|missing_lanes|pending_lanes|evidence|ref|trace|source)=/iu.test(normalized)
      || carriesStructuredEmbodimentContinuityProof(normalized)
  const carriesBehavioralContinuity
    = /继续|沿着|别飘回|不要退回|不要掉回|口吻|generic assistant|project shell|without splitting/u.test(normalized)
  const carriesEvidenceDomain
    = /记忆|主动性|具身|执行|情绪|对话|memory|initiative|embodiment|execution|emotion|dialogue|runtime|audit|trace|source|evidence/u.test(lower)

  return carriesStructuredAuthority || (carriesBehavioralContinuity && carriesEvidenceDomain)
}

function carriesStructuredEmbodimentContinuityProof(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, PROJECT_AWARENESS_RETURN_MAX_CHARS)
  if (!normalized)
    return false

  return /(?:^|\|\s*)embodiment_lanes=(?:body|face|motion|lipsync|voice)(?:\+(?:body|face|motion|lipsync|voice))*/i.test(normalized)
    || /signature=resident\|main-runtime\|accompanying\|quiet-accompaniment\|(?:still-voiced-face-motion-line|still-voiced-motion-line|still-voiced-face-line|still-voiced-face-lipsync-line|still-voiced-motion-lipsync-line)/i.test(normalized)
    || /(?:same-segment\s+)?(?:face\+motion|face\+voice|motion\+voice|face\+lipsync\+voice|motion\+lipsync\+voice|body\+lipsync\+voice)\s+recovery@/i.test(normalized)
}

function looksLikeProjectAwareReminderLine(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return (
    normalized.startsWith('before speaking')
    || normalized.startsWith('before answering')
  )
  && (
    normalized.includes('digital life project')
    || normalized.includes('same digital life project')
    || normalized.includes('one living digital life project')
  )
  && (
    normalized.includes('what has landed')
    || normalized.includes('life loop is still open')
    || normalized.includes('which life loop is still open')
    || normalized.includes('still-open life loop')
  )
}

function looksLikeLivedInSameHerHoldDetail(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('same-her hold')
    || normalized.includes('same remembered seam')
    || normalized.includes('measured-return')
    || normalized.includes('measured_return')
    || normalized.includes('repair-before-closeness')
    || normalized.includes('repair_before_closeness')
    || normalized.includes('rest-protective')
    || normalized.includes('rest_protective')
    || normalized.includes('lower-pressure')
    || normalized.includes('callback line')
    || normalized.includes('keep more room this time')
}

function resolveContinuityBehaviorMode(input: {
  continuityRestraint?: unknown
  continuityCadence?: unknown
}) {
  const continuityCadence = sanitizeProjectAwarenessText(input.continuityCadence, 120).toLowerCase()
  const continuityRestraint = sanitizeProjectAwarenessText(input.continuityRestraint, 64).toLowerCase()

  if (
    continuityCadence === 'repair-before-closeness'
    || continuityCadence === 'measured-return'
    || continuityCadence === 'rest-protective'
  ) {
    return continuityCadence
  }

  if (
    continuityRestraint === 'repair-before-closeness'
    || continuityRestraint === 'measured-return'
    || continuityRestraint === 'rest-protective'
  ) {
    return continuityRestraint
  }

  return null
}

function deriveSameHerHoldDetailFromContinuityBehavior(mode: string | null) {
  if (mode === 'repair-before-closeness')
    return 'continuity_hold=repair_before_closeness; timing=before_closeness_widens'
  if (mode === 'rest-protective')
    return 'continuity_hold=rest_protective; timing=fatigue_aware'
  if (mode === 'measured-return')
    return 'continuity_hold=measured_return; pressure=lower'
  return ''
}

function deriveContinuityCueFromBehavior(mode: string | null) {
  if (mode === 'repair-before-closeness')
    return 'continuity_cue=repair_before_closeness; until=repair_settles'
  if (mode === 'rest-protective')
    return 'continuity_cue=rest_protective; direction=inward'
  if (mode === 'measured-return')
    return 'continuity_cue=measured_return; direction=measured'
  return ''
}

function deriveCadenceAwareSameHerHoldDetail(input: {
  mode: string | null
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
}) {
  if (input.mode !== 'measured-return')
    return ''

  const preferredPauseMode = sanitizeProjectAwarenessText(input.preferredPauseMode, 32).toLowerCase()
  const preferredLipsyncMode = sanitizeProjectAwarenessText(input.preferredLipsyncMode, 32).toLowerCase()
  const preferredVoiceMode = sanitizeProjectAwarenessText(input.preferredVoiceMode, 32).toLowerCase()
  const preferredPacingMode = sanitizeProjectAwarenessText(input.preferredPacingMode, 32).toLowerCase()

  if (preferredVoiceMode === 'lower-pressure' && preferredPacingMode === 'slower')
    return 'continuity_hold=measured_return; pressure=lower; pacing=slower'

  if (preferredPauseMode === 'longer' && preferredLipsyncMode === 'restrained')
    return 'continuity_hold=measured_return; pause=longer; lipsync=restrained'

  return ''
}

function deriveCadenceAwareContinuityCue(input: {
  mode: string | null
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
}) {
  if (input.mode !== 'measured-return')
    return ''

  const preferredPauseMode = sanitizeProjectAwarenessText(input.preferredPauseMode, 32).toLowerCase()
  const preferredLipsyncMode = sanitizeProjectAwarenessText(input.preferredLipsyncMode, 32).toLowerCase()
  const preferredVoiceMode = sanitizeProjectAwarenessText(input.preferredVoiceMode, 32).toLowerCase()
  const preferredPacingMode = sanitizeProjectAwarenessText(input.preferredPacingMode, 32).toLowerCase()

  if (preferredVoiceMode === 'lower-pressure' && preferredPacingMode === 'slower')
    return 'continuity_cue=measured_return; pressure=lower; pacing=slower'

  if (preferredPauseMode === 'longer' && preferredLipsyncMode === 'restrained')
    return 'continuity_cue=measured_return; pause=longer; lipsync=restrained'

  return ''
}

function resolveEffectiveSameHerContinuityCarry(projectState: {
  sameHerHoldDetail?: unknown
  continuityCue?: unknown
  continuityRestraint?: unknown
  continuityCadence?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
} | null | undefined) {
  const continuityBehaviorMode = resolveContinuityBehaviorMode({
    continuityRestraint: projectState?.continuityRestraint,
    continuityCadence: projectState?.continuityCadence,
  })
  const sameHerHoldDetail
    = sanitizeProjectAwarenessText(projectState?.sameHerHoldDetail, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || deriveCadenceAwareSameHerHoldDetail({
        mode: continuityBehaviorMode,
        preferredPauseMode: projectState?.preferredPauseMode,
        preferredLipsyncMode: projectState?.preferredLipsyncMode,
        preferredVoiceMode: projectState?.preferredVoiceMode,
        preferredPacingMode: projectState?.preferredPacingMode,
      })
      || deriveSameHerHoldDetailFromContinuityBehavior(continuityBehaviorMode)
  const continuityCue
    = sanitizeProjectAwarenessText(projectState?.continuityCue, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || deriveCadenceAwareContinuityCue({
        mode: continuityBehaviorMode,
        preferredPauseMode: projectState?.preferredPauseMode,
        preferredLipsyncMode: projectState?.preferredLipsyncMode,
        preferredVoiceMode: projectState?.preferredVoiceMode,
        preferredPacingMode: projectState?.preferredPacingMode,
      })
      || deriveContinuityCueFromBehavior(continuityBehaviorMode)

  return {
    sameHerHoldDetail,
    continuityCue,
  }
}

function carriesEmbodiedSameHerLine(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320)
  if (!normalized)
    return false

  if (carriesStructuredEmbodimentContinuityProof(normalized))
    return true

  return /holding together mainly through|being carried mainly through|full cross-modal same-her line|one living her|one living digital life|voice|face|motion|lipsync|具身|声音|表情|动作|唇型/u.test(normalized)
}

function carriesBroaderProjectFrame(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320)
  if (!normalized)
    return false

  return /\b(?:project|digital life project|life loop|closure pressure|still-open|before speaking|before answering|what has landed|landed:|open=|next=|local-first digital life)\b/i.test(normalized)
    || /数字生命项目|闭环|主线|还差|未闭环|开口前|先记住|已落地/u.test(normalized)
}

function carriesExplicitLandedProgress(text: unknown) {
  return /\blanded:|latest landed|already survives|already survive/u.test(
    sanitizeProjectAwarenessText(text, 320),
  )
}

export function isAlicizationThinSamePhaseCarryLine(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.startsWith('same phase 1 digital life.')
    && normalized.includes('same living line')
    && (
      normalized.includes('some closure already landed')
      || (
        normalized.includes('reopen')
        && (
          normalized.includes('generic shell')
          || normalized.includes('fresh shell')
        )
      )
    )
    && !normalized.includes('before speaking')
    && !normalized.includes('what has landed')
    && !normalized.includes('life loop is still open')
}

function isSameHerInwardLowPressureHeadline(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return (
    normalized.includes('continuity=embodiment')
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

function buildCompactSameHerInwardLowPressureAwarenessLine(_companionBriefingLine: string) {
  return 'embodiment_lanes=body+face+motion | missing_lanes=lipsync+voice | status=partial | evidence=low-pressure-inward-carry'
}

function isAnthropomorphicHostFacingSameHerHeadline(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320).toLowerCase()
  if (!normalized)
    return false

  return normalized.includes('anthropomorphic emotional closure')
    && (normalized.includes('same-her inward-carry observability') || normalized.includes('continuity inward-carry observability'))
    && normalized.includes('measured-return')
}

function buildCompactAnthropomorphicHostFacingAwarenessLine(_companionBriefingLine: string) {
  return 'emotional_closure=anthropomorphic_emotional_closure | evidence=inward_carry | timing=measured_return'
}

function carriesStrongerSameHerContinuity(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320)
  if (!normalized)
    return false
  if (containsProjectAwarenessFixedTemplateResidue(normalized))
    return false

  return carriesLivedInSameHerLine(normalized)
    || carriesEmbodiedSameHerLine(normalized)
    || carriesExplicitLandedProgress(normalized)
}

function compareProjectAwarenessStrength(a: unknown, b: unknown) {
  const normalizedA = sanitizeProjectAwarenessText(a, 320)
  const normalizedB = sanitizeProjectAwarenessText(b, 320)
  if (!normalizedA && !normalizedB)
    return 0
  if (!normalizedA)
    return -1
  if (!normalizedB)
    return 1

  let scoreA = scoreAlicizationProjectAwarenessLine(normalizedA)
  let scoreB = scoreAlicizationProjectAwarenessLine(normalizedB)
  if (carriesCanonicalPhaseOneShell(normalizedA))
    scoreA -= 6
  if (carriesCanonicalPhaseOneShell(normalizedB))
    scoreB -= 6
  if (carriesGeneratedProjectAwarenessExpansion(normalizedA))
    scoreA -= 4
  if (carriesGeneratedProjectAwarenessExpansion(normalizedB))
    scoreB -= 4
  if (scoreA !== scoreB)
    return scoreA - scoreB

  const landedA = carriesExplicitLandedProgress(normalizedA) ? 1 : 0
  const landedB = carriesExplicitLandedProgress(normalizedB) ? 1 : 0
  if (landedA !== landedB)
    return landedA - landedB

  return normalizedA.length - normalizedB.length
}

function isPreservableNonCanonicalAwareness(text: unknown) {
  const normalized = sanitizeProjectAwarenessText(text, 320)
  if (!normalized)
    return false

  return !looksLikeThinProjectAwarenessShell(normalized)
    && !carriesCanonicalFullReanchor(normalized)
    && !carriesCanonicalCompactReanchor(normalized)
    && !carriesCanonicalPhaseOneShell(normalized)
    && !carriesGeneratedProjectAwarenessExpansion(normalized)
    && !carriesThinChinesePhaseOneShell(normalized)
}

function looksLikeWeakProjectAwarenessShell(awarenessLine: unknown) {
  const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, 320)
  if (!normalizedAwarenessLine)
    return false

  return carriesCanonicalFullReanchor(normalizedAwarenessLine)
    || carriesCanonicalCompactReanchor(normalizedAwarenessLine)
    || carriesCanonicalPhaseOneShell(normalizedAwarenessLine)
    || carriesGeneratedProjectAwarenessExpansion(normalizedAwarenessLine)
    || carriesThinChinesePhaseOneShell(normalizedAwarenessLine)
    || looksLikeThinProjectAwarenessShell(normalizedAwarenessLine)
    || /before answering, keep (?:(?:this|the) )?same digital life project in view|same digital life \| keep the closure seam explicit/iu.test(normalizedAwarenessLine)
}

export function scoreAlicizationProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return 0

  let score = normalized.length >= 120 ? 2 : normalized.length >= 72 ? 1 : 0
  const carriesFixedTemplateResidue = containsProjectAwarenessFixedTemplateResidue(normalized)
  if (carriesFixedTemplateResidue)
    score -= 8
  if (!carriesFixedTemplateResidue && /(?:^|\|\s*)(?:landed|open|next|status|summary|emotional_closure|embodiment_lanes|missing_lanes|pending_lanes|evidence|ref|trace|source)=/u.test(normalized))
    score += 3
  if (!carriesFixedTemplateResidue && /(?:^|\|\s*)(?:phase|landed|open|next|status)=|holding together mainly through|voice|face|motion|lipsync|具身|声音|表情|动作|唇型/u.test(normalized))
    score += 2
  if (carriesStructuredEmbodimentContinuityProof(normalized))
    score += 3
  if (/\blanded:|latest landed|already survives|already survive/u.test(normalized))
    score += 2
  if (/same thread|same line|continue|继续|沿着|别飘回|泛化助手|泛化工程|不要退回|不要压回/u.test(normalized))
    score += 2
  if (/keep the same digital life project in view|generic reminder|generic guidance|回答前先记住|先记住这是同一个她|先记住这是同一个 her|别把这条线忘了|别把这条线弄丢/u.test(normalized))
    score -= 2
  if (looksLikeThinProjectAwarenessShell(normalized) || carriesThinChinesePhaseOneShell(normalized))
    score -= 5
  return score
}

export function isAlicizationThinProjectAwarenessLine(value: string | null | undefined) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!normalized)
    return true

  return /keep the same digital life project in view|generic reminder|generic guidance|same digital life \|\s*keep(?: the)?(?: desktop)? closure(?: seam| line)? explicit/u.test(normalized)
    || carriesThinChinesePhaseOneShell(normalized)
}

export function resolveAlicizationProjectPreDialogueAwarenessLine(input?: {
  runtimeProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    primaryOpenLoop?: unknown
    emotionalClosureCue?: unknown
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTarget?: unknown
    openFocusSummary?: unknown
    nextFocusSummary?: unknown
    nextClosureTargetSummary?: unknown
    emotionalClosureSummary?: unknown
    sameHerSelfLine?: unknown
    sameHerHoldDetail?: unknown
    continuityCue?: unknown
    continuityRestraint?: unknown
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
    proactiveSameHerGap?: unknown
    sameHerDriftRisk?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
  fallbackProjectState?: {
    identity?: unknown
    currentPhase?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    primaryOpenLoop?: unknown
    emotionalClosureCue?: unknown
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTarget?: unknown
    openFocusSummary?: unknown
    nextFocusSummary?: unknown
    nextClosureTargetSummary?: unknown
    emotionalClosureSummary?: unknown
    sameHerSelfLine?: unknown
    sameHerHoldDetail?: unknown
    continuityCue?: unknown
    continuityRestraint?: unknown
    continuityPreferredTiming?: unknown
    continuityCadence?: unknown
    preferredPauseMode?: unknown
    preferredLipsyncMode?: unknown
    preferredVoiceMode?: unknown
    preferredPacingMode?: unknown
    proactiveSameHerGap?: unknown
    sameHerDriftRisk?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
}) {
  const preferEmbodimentClosureSummary = (summary: unknown, awarenessLine: unknown) => {
    const normalizedSummary = sanitizeProjectAwarenessText(summary, PROJECT_AWARENESS_RETURN_MAX_CHARS)
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
    if (!normalizedSummary)
      return ''
    if (!normalizedAwarenessLine)
      return normalizedSummary
    const summaryLooksStronger = /\b(?:holding together mainly through|being carried mainly through|full cross-modal same-her line|one living her|one living digital life)\b/i.test(normalizedSummary)
    const summaryCarriesStructuredEmbodimentProof = carriesStructuredEmbodimentContinuityProof(normalizedSummary)
    const awarenessLooksThinner = looksLikeThinProjectAwarenessShell(normalizedAwarenessLine)
    return (summaryLooksStronger || summaryCarriesStructuredEmbodimentProof) && awarenessLooksThinner
      ? normalizedSummary
      : ''
  }
  const preferStrongerSameHerHeadline = (headline: unknown, awarenessLine: unknown) => {
    const normalizedHeadline = sanitizeProjectAwarenessText(headline, 320)
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, 320)
    if (!normalizedHeadline)
      return ''
    if (!normalizedAwarenessLine)
      return normalizedHeadline
    const headlineLooksStronger = /\b(?:holding together mainly through|being carried mainly through|full cross-modal same-her line|one living her|one living digital life|same living line|one continuous her|without splitting her continuity|initiative and embodiment closure)\b/i.test(normalizedHeadline)
    const awarenessLooksThinner = looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine)
    return headlineLooksStronger && awarenessLooksThinner ? normalizedHeadline : ''
  }
  const preferSameHerDriftRiskSummary = (summary: unknown, awarenessLine: unknown) => {
    const normalizedSummary = sanitizeProjectAwarenessText(summary, 320)
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, 320)
    if (!normalizedSummary)
      return ''
    if (!normalizedAwarenessLine)
      return normalizedSummary
    const summaryCarriesAntiShellRisk
      = /\b(?:generic task shell|project-summary voice|detached project narration|generic assistant|generic guidance|task shell)\b/i.test(normalizedSummary)
    const awarenessLooksThinner = looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine)
    return summaryCarriesAntiShellRisk && awarenessLooksThinner ? normalizedSummary : ''
  }
  const preferProactiveSameHerGapSummary = (summary: unknown, awarenessLine: unknown) => {
    const normalizedSummary = sanitizeProjectAwarenessText(summary, 320)
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, 320)
    if (!normalizedSummary)
      return ''
    if (!normalizedAwarenessLine)
      return normalizedSummary
    const summaryCarriesProactiveContinuityGap
      = /\b(?:proactive|subconscious|next-session|next session|follow-through|follow through|same-her follow-through|same her follow-through)\b/i.test(normalizedSummary)
    const awarenessLooksThinner = looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine)
    return summaryCarriesProactiveContinuityGap && awarenessLooksThinner ? normalizedSummary : ''
  }
  const preferStrongerCompanionBriefingLine = (briefingLine: unknown, awarenessLine: unknown) => {
    const normalizedBriefingLine = sanitizeProjectAwarenessText(briefingLine, 320)
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(awarenessLine, 320)
    if (!normalizedBriefingLine)
      return ''
    if (!normalizedAwarenessLine)
      return normalizedBriefingLine

    const awarenessLooksThinner = looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine)
    const briefingScore = scoreAlicizationProjectAwarenessLine(normalizedBriefingLine)
    const awarenessScore = scoreAlicizationProjectAwarenessLine(normalizedAwarenessLine)
    const briefingCarriesBroaderProjectFrame = carriesBroaderProjectFrame(normalizedBriefingLine)
    const awarenessCarriesBroaderProjectFrame = carriesBroaderProjectFrame(normalizedAwarenessLine)
    const awarenessIsEmbodimentOnlyLead
      = carriesEmbodiedSameHerLine(normalizedAwarenessLine)
        && !awarenessCarriesBroaderProjectFrame
    const looksLikePureSameHerCarry
      = normalizedBriefingLine.toLowerCase().startsWith('same phase 1 digital life.')
        && !briefingCarriesBroaderProjectFrame
    return (awarenessLooksThinner || awarenessIsEmbodimentOnlyLead)
      && !carriesCanonicalFullReanchor(normalizedAwarenessLine)
      && !carriesCanonicalCompactReanchor(normalizedAwarenessLine)
      && !carriesCanonicalPhaseOneShell(normalizedAwarenessLine)
      && briefingCarriesBroaderProjectFrame
      && !looksLikePureSameHerCarry
      && (
        briefingScore >= awarenessScore
        || normalizedBriefingLine.length > normalizedAwarenessLine.length + 12
      )
      ? normalizedBriefingLine
      : ''
  }
  const preferCompactSameHerInwardLowPressureAwarenessLine = (input: {
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    sameHerSelfLine?: unknown
  }) => {
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(input.awarenessLine, 320)
    const normalizedCompanionHeadlineLine = sanitizeProjectAwarenessText(input.companionHeadlineLine, 320)
    const normalizedCompanionBriefingLine = sanitizeProjectAwarenessText(input.companionBriefingLine, 320)
    const normalizedSameHerSelfLine = sanitizeProjectAwarenessText(input.sameHerSelfLine, 320)
    const compactSameHerCarryLine = normalizedCompanionBriefingLine || normalizedSameHerSelfLine
    if (!normalizedAwarenessLine || !normalizedCompanionHeadlineLine || !compactSameHerCarryLine)
      return ''
    if (!looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine))
      return ''
    if (!isAlicizationThinSamePhaseCarryLine(compactSameHerCarryLine))
      return ''
    if (!isSameHerInwardLowPressureHeadline(normalizedCompanionHeadlineLine))
      return ''

    return buildCompactSameHerInwardLowPressureAwarenessLine(compactSameHerCarryLine)
  }
  const preferCompactAnthropomorphicHostFacingAwarenessLine = (input: {
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    sameHerSelfLine?: unknown
  }) => {
    const normalizedAwarenessLine = sanitizeProjectAwarenessText(input.awarenessLine, 320)
    const normalizedCompanionHeadlineLine = sanitizeProjectAwarenessText(input.companionHeadlineLine, 320)
    const normalizedCompanionBriefingLine = sanitizeProjectAwarenessText(input.companionBriefingLine, 320)
    const normalizedSameHerSelfLine = sanitizeProjectAwarenessText(input.sameHerSelfLine, 320)
    const compactSameHerCarryLine = normalizedCompanionBriefingLine || normalizedSameHerSelfLine
    if (!normalizedAwarenessLine || !normalizedCompanionHeadlineLine || !compactSameHerCarryLine)
      return ''
    if (!looksLikeWeakProjectAwarenessShell(normalizedAwarenessLine))
      return ''
    if (!isAlicizationThinSamePhaseCarryLine(compactSameHerCarryLine))
      return ''
    if (!isAnthropomorphicHostFacingSameHerHeadline(normalizedCompanionHeadlineLine))
      return ''

    return buildCompactAnthropomorphicHostFacingAwarenessLine(compactSameHerCarryLine)
  }

  const pick = (...values: unknown[]) => {
    for (const value of values) {
      const normalized = sanitizeProjectAwarenessText(value, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      if (normalized)
        return normalized
    }
    return ''
  }

  const pickExplicitProjectAwareness = (projectState?: {
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    companionBriefingLine?: unknown
    preDialogueAwarenessSummary?: unknown
    preflightSummary?: unknown
    sameHerSelfLine?: unknown
    proactiveSameHerGap?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null) => {
    if (!projectState)
      return ''

    const explicitAwarenessLine = projectState.preDialogueAwarenessLine ?? projectState.awarenessLine

    return pick(
      preferCompactAnthropomorphicHostFacingAwarenessLine({
        awarenessLine: explicitAwarenessLine,
        companionHeadlineLine: projectState.companionHeadlineLine,
        companionBriefingLine: projectState.companionBriefingLine,
        sameHerSelfLine: projectState.sameHerSelfLine,
      }),
      preferCompactSameHerInwardLowPressureAwarenessLine({
        awarenessLine: explicitAwarenessLine,
        companionHeadlineLine: projectState.companionHeadlineLine,
        companionBriefingLine: projectState.companionBriefingLine,
        sameHerSelfLine: projectState.sameHerSelfLine,
      }),
      preferEmbodimentClosureSummary(
        projectState.preDialogueAwarenessSummary,
        projectState.preDialogueAwarenessLine ?? projectState.awarenessLine ?? projectState.companionHeadlineLine,
      ),
      preferStrongerSameHerHeadline(
        projectState.companionHeadlineLine,
        projectState.preDialogueAwarenessLine ?? projectState.awarenessLine,
      ),
      preferStrongerCompanionBriefingLine(
        projectState.companionBriefingLine,
        projectState.preDialogueAwarenessLine ?? projectState.awarenessLine ?? projectState.companionHeadlineLine,
      ),
      explicitAwarenessLine,
      !sanitizeProjectAwarenessText(explicitAwarenessLine, 320)
        ? preferProactiveSameHerGapSummary(
            projectState.proactiveSameHerGap,
            projectState.preDialogueAwarenessLine ?? projectState.awarenessLine ?? projectState.companionHeadlineLine,
          )
        : '',
      !sanitizeProjectAwarenessText(explicitAwarenessLine, 320)
        ? preferSameHerDriftRiskSummary(
            projectState.sameHerDriftRiskSummary,
            projectState.preDialogueAwarenessLine ?? projectState.awarenessLine ?? projectState.companionHeadlineLine,
          )
        : '',
      projectState.preDialogueAwarenessLine,
      projectState.companionHeadlineLine,
      projectState.preDialogueAwarenessSummary,
      projectState.awarenessLine,
      projectState.companionBriefingLine,
      projectState.preflightSummary,
    )
  }

  const runtimeExplicitAwareness = pickExplicitProjectAwareness(input?.runtimeProjectState)
  const fallbackExplicitAwareness = pickExplicitProjectAwareness(input?.fallbackProjectState)

  const buildStructuredAwarenessSummary = (projectState?: {
    identity?: unknown
    currentPhase?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    primaryOpenLoop?: unknown
    openClosureSummary?: unknown
    nextClosureTarget?: unknown
    openFocusSummary?: unknown
    nextFocusSummary?: unknown
    nextClosureTargetSummary?: unknown
    emotionalClosureSummary?: unknown
    proactiveSameHerGap?: unknown
    sameHerDriftRiskSummary?: unknown
    preDialogueAwarenessSummary?: unknown
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
  } | null) => {
    if (!projectState)
      return ''
    return buildStructuredProjectAwarenessFromState(projectState)
  }

  const hasExplicitAwarenessLine = (projectState?: {
    preDialogueAwarenessLine?: unknown
    awarenessLine?: unknown
    companionHeadlineLine?: unknown
    preDialogueAwarenessSummary?: unknown
  } | null) => {
    return Boolean(
      sanitizeProjectAwarenessText(projectState?.preDialogueAwarenessLine, 320)
      || sanitizeProjectAwarenessText(projectState?.awarenessLine, 320)
      || sanitizeProjectAwarenessText(projectState?.companionHeadlineLine, 320)
      || sanitizeProjectAwarenessText(projectState?.preDialogueAwarenessSummary, 320),
    )
  }

  const carriesExplicitStructuredProjectFacts = (projectState?: {
    identity?: unknown
    currentPhase?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    landedProgressSummary?: unknown
    primaryOpenLoop?: unknown
    openClosureSummary?: unknown
    nextClosureTarget?: unknown
    nextClosureTargetSummary?: unknown
  } | null) => Boolean(
    sanitizeProjectAwarenessText(projectState?.identity, 320)
    || sanitizeProjectAwarenessText(projectState?.currentPhase, 320)
    || sanitizeProjectAwarenessText(projectState?.latestLandedProgress, 320)
    || sanitizeProjectAwarenessText(projectState?.latestProgress, 320)
    || sanitizeProjectAwarenessText(projectState?.landedProgressSummary, 320)
    || sanitizeProjectAwarenessText(projectState?.primaryOpenLoop, 320)
    || sanitizeProjectAwarenessText(projectState?.openClosureSummary, 320)
    || sanitizeProjectAwarenessText(projectState?.nextClosureTarget, 320)
    || sanitizeProjectAwarenessText(projectState?.nextClosureTargetSummary, 320),
  )

  const runtimeHasExplicitAwareness = hasExplicitAwarenessLine(input?.runtimeProjectState)
  const runtimeExplicitAwarenessIsWeakShell = looksLikeWeakProjectAwarenessShell(runtimeExplicitAwareness)
  const runtimeStructuredAwarenessSummary = buildStructuredAwarenessSummary(input?.runtimeProjectState)
  const runtimeStructuredAwarenessCarriesCoreProjectFacts
    = carriesExplicitStructuredProjectFacts(input?.runtimeProjectState)
      && /(?:^|\|\s*)(?:identity|phase|landed|open|next)=/iu.test(runtimeStructuredAwarenessSummary)
  const runtimePreflightSummary = sanitizeProjectAwarenessText(input?.runtimeProjectState?.preflightSummary, 320)
  const preferredRuntimePreflightAwarenessForWeakShell
    = runtimeExplicitAwarenessIsWeakShell
      && /(?:^|\|\s*)(?:identity|phase|landed|open|next|continuity_anchor|continuity_hold|continuity_drift_risk)=/iu.test(runtimePreflightSummary)
      && !containsProjectAwarenessFixedTemplateResidue(runtimePreflightSummary)
      && !looksLikeWeakProjectAwarenessShell(runtimePreflightSummary)
      ? runtimePreflightSummary
      : ''
  const fallbackStructuredAwarenessSummary = hasExplicitAwarenessLine(input?.fallbackProjectState)
    ? ''
    : buildStructuredAwarenessSummary(input?.fallbackProjectState)
  const fallbackHasExplicitNonSummaryAwareness = Boolean(
    sanitizeProjectAwarenessText(input?.fallbackProjectState?.preDialogueAwarenessLine, 320)
    || sanitizeProjectAwarenessText(input?.fallbackProjectState?.awarenessLine, 320)
    || sanitizeProjectAwarenessText(input?.fallbackProjectState?.companionHeadlineLine, 320)
    || sanitizeProjectAwarenessText(input?.fallbackProjectState?.companionBriefingLine, 320),
  )
  const fallbackIsMeaningfulExplicitAwareness = Boolean(fallbackExplicitAwareness)
    && isPreservableNonCanonicalAwareness(fallbackExplicitAwareness)
  const fallbackCarriesStrongerSameHerContinuity = carriesStrongerSameHerContinuity(fallbackExplicitAwareness)
  const preferredFallbackExplicitAwareness
    = (
      looksLikeWeakProjectAwarenessShell(runtimeExplicitAwareness)
      || (
        fallbackCarriesStrongerSameHerContinuity
        && scoreAlicizationProjectAwarenessLine(fallbackExplicitAwareness) >= scoreAlicizationProjectAwarenessLine(runtimeExplicitAwareness)
      )
    )
    && fallbackIsMeaningfulExplicitAwareness
      ? fallbackExplicitAwareness
      : !runtimeHasExplicitAwareness
        && runtimeExplicitAwareness === runtimePreflightSummary
        && fallbackIsMeaningfulExplicitAwareness
          ? fallbackExplicitAwareness
          : ''
  const preferredLandedProgressAwareFallback
    = fallbackIsMeaningfulExplicitAwareness
      && carriesExplicitLandedProgress(fallbackExplicitAwareness)
      && (
        !carriesExplicitLandedProgress(runtimeExplicitAwareness)
        || carriesCanonicalPhaseOneShell(runtimeExplicitAwareness)
      )
      ? fallbackExplicitAwareness
      : ''
  const shouldPreserveRuntimeExplicitAwarenessVerbatim
    = Boolean(runtimeExplicitAwareness)
      && isPreservableNonCanonicalAwareness(runtimeExplicitAwareness)
  const runtimeCarriesStrongerSameHerContinuity = carriesStrongerSameHerContinuity(runtimeExplicitAwareness)

  const strongerRuntimeSameHerHeadline
    = preferStrongerSameHerHeadline(
      input?.runtimeProjectState?.companionHeadlineLine,
      input?.runtimeProjectState?.preDialogueAwarenessLine ?? input?.runtimeProjectState?.awarenessLine,
    )
  const strongerFallbackSameHerHeadline
    = preferStrongerSameHerHeadline(
      input?.fallbackProjectState?.companionHeadlineLine,
      input?.fallbackProjectState?.preDialogueAwarenessLine ?? input?.fallbackProjectState?.awarenessLine,
    )
  const strongerRuntimeEmbodimentSummary
    = preferEmbodimentClosureSummary(
      input?.runtimeProjectState?.preDialogueAwarenessSummary,
      input?.runtimeProjectState?.preDialogueAwarenessLine ?? input?.runtimeProjectState?.awarenessLine ?? input?.runtimeProjectState?.companionHeadlineLine,
    )
  const strongerFallbackEmbodimentSummary
    = preferEmbodimentClosureSummary(
      input?.fallbackProjectState?.preDialogueAwarenessSummary,
      input?.fallbackProjectState?.preDialogueAwarenessLine ?? input?.fallbackProjectState?.awarenessLine ?? input?.fallbackProjectState?.companionHeadlineLine,
    )
  const runtimeEffectiveContinuityCarry = resolveEffectiveSameHerContinuityCarry(input?.runtimeProjectState ?? null)
  const fallbackEffectiveContinuityCarry = resolveEffectiveSameHerContinuityCarry(input?.fallbackProjectState ?? null)
  const strongerRuntimeSameHerHoldDetail = (() => {
    const holdDetail = runtimeEffectiveContinuityCarry.sameHerHoldDetail
    if (!looksLikeLivedInSameHerHoldDetail(holdDetail))
      return ''

    const explicitRuntimeCompanionBriefingLine
      = sanitizeProjectAwarenessText(input?.runtimeProjectState?.companionBriefingLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
    const explicitRuntimeAwarenessLine
      = sanitizeProjectAwarenessText(input?.runtimeProjectState?.preDialogueAwarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
        || sanitizeProjectAwarenessText(input?.runtimeProjectState?.awarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
        || ''
    if (!explicitRuntimeCompanionBriefingLine && !explicitRuntimeAwarenessLine)
      return holdDetail

    if (explicitRuntimeCompanionBriefingLine) {
      if (
        !looksLikeProjectAwareReminderLine(explicitRuntimeCompanionBriefingLine)
        && !looksLikeWeakProjectAwarenessShell(explicitRuntimeCompanionBriefingLine)
        && !isAlicizationThinSamePhaseCarryLine(explicitRuntimeCompanionBriefingLine)
      ) {
        return ''
      }

      return holdDetail
    }

    if (
      !looksLikeWeakProjectAwarenessShell(explicitRuntimeAwarenessLine)
      && !isAlicizationThinSamePhaseCarryLine(explicitRuntimeAwarenessLine)
    ) {
      return ''
    }

    return holdDetail
  })()
  const runtimeLivedInAwarenessCandidate
    = sanitizeProjectAwarenessText(input?.runtimeProjectState?.preDialogueAwarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.runtimeProjectState?.awarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.runtimeProjectState?.companionHeadlineLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.runtimeProjectState?.companionBriefingLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.runtimeProjectState?.sameHerSelfLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || runtimeEffectiveContinuityCarry.sameHerHoldDetail
      || runtimeEffectiveContinuityCarry.continuityCue
      || ''
  const fallbackLivedInAwarenessCandidate
    = sanitizeProjectAwarenessText(input?.fallbackProjectState?.preDialogueAwarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.fallbackProjectState?.awarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.fallbackProjectState?.companionHeadlineLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.fallbackProjectState?.companionBriefingLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || sanitizeProjectAwarenessText(input?.fallbackProjectState?.sameHerSelfLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
      || fallbackEffectiveContinuityCarry.sameHerHoldDetail
      || fallbackEffectiveContinuityCarry.continuityCue
      || ''
  const strongerRuntimeLivedInAwareness
    = carriesLivedInSameHerLine(runtimeLivedInAwarenessCandidate)
      ? runtimeLivedInAwarenessCandidate
      : ''
  const strongerFallbackLivedInAwareness
    = carriesLivedInSameHerLine(fallbackLivedInAwarenessCandidate)
      ? fallbackLivedInAwarenessCandidate
      : ''
  const preferredStrongerSameHerContinuityFallback
    = [
      preferredLandedProgressAwareFallback,
      strongerFallbackLivedInAwareness,
      strongerFallbackEmbodimentSummary,
      strongerFallbackSameHerHeadline,
      preferredFallbackExplicitAwareness,
    ]
      .map(value => sanitizeProjectAwarenessText(value, PROJECT_AWARENESS_RETURN_MAX_CHARS))
      .filter(Boolean)
      .reduce<string>((best, current) =>
        compareProjectAwarenessStrength(current, best) > 0 ? current : best, '')
  const preferredStrongerSameHerContinuityRuntime
    = [
      strongerRuntimeSameHerHoldDetail,
      carriesStrongerSameHerContinuity(input?.runtimeProjectState?.preDialogueAwarenessLine)
        ? sanitizeProjectAwarenessText(input?.runtimeProjectState?.preDialogueAwarenessLine, PROJECT_AWARENESS_RETURN_MAX_CHARS)
        : '',
      strongerRuntimeLivedInAwareness,
      strongerRuntimeEmbodimentSummary,
      strongerRuntimeSameHerHeadline,
    ]
      .map(value => sanitizeProjectAwarenessText(value, PROJECT_AWARENESS_RETURN_MAX_CHARS))
      .filter(Boolean)
      .reduce<string>((best, current) =>
        compareProjectAwarenessStrength(current, best) > 0 ? current : best, '')

  const fallbackShouldOverrideRuntimeExplicitAwareness
    = shouldPreserveRuntimeExplicitAwarenessVerbatim
      && Boolean(preferredStrongerSameHerContinuityFallback)
      && fallbackHasExplicitNonSummaryAwareness
      && carriesStrongerSameHerContinuity(preferredStrongerSameHerContinuityFallback)
      && !runtimeCarriesStrongerSameHerContinuity
      && compareProjectAwarenessStrength(
        preferredStrongerSameHerContinuityFallback,
        runtimeExplicitAwareness,
      ) > 0

  if (runtimeStructuredAwarenessCarriesCoreProjectFacts) {
    return finalizeProjectAwarenessLine({
      candidate: runtimeStructuredAwarenessSummary,
      runtimeProjectState: input?.runtimeProjectState,
      fallbackProjectState: input?.fallbackProjectState,
    }) || null
  }

  if (shouldPreserveRuntimeExplicitAwarenessVerbatim) {
    return finalizeProjectAwarenessLine({
      candidate: strongerRuntimeSameHerHoldDetail
        || (fallbackShouldOverrideRuntimeExplicitAwareness
          ? preferredStrongerSameHerContinuityFallback
          : runtimeExplicitAwareness),
      runtimeProjectState: input?.runtimeProjectState,
      fallbackProjectState: input?.fallbackProjectState,
    }) || null
  }

  const preferredContinuityLead
    = runtimeExplicitAwarenessIsWeakShell
      ? (
          preferredStrongerSameHerContinuityFallback
          && compareProjectAwarenessStrength(
            preferredStrongerSameHerContinuityFallback,
            preferredStrongerSameHerContinuityRuntime,
          ) > 0
            ? preferredStrongerSameHerContinuityFallback
            : preferredStrongerSameHerContinuityRuntime
        )
      : runtimeHasExplicitAwareness
        ? preferredStrongerSameHerContinuityRuntime
        : (
            compareProjectAwarenessStrength(preferredStrongerSameHerContinuityFallback, preferredStrongerSameHerContinuityRuntime) > 0
              ? preferredStrongerSameHerContinuityFallback
              : preferredStrongerSameHerContinuityRuntime
          )
  const shouldPreferFallbackStructuredAwarenessSummary
    = runtimeExplicitAwarenessIsWeakShell
      && !preferredContinuityLead
      && !preferredStrongerSameHerContinuityRuntime
      && !fallbackHasExplicitNonSummaryAwareness
      && Boolean(fallbackStructuredAwarenessSummary)

  return finalizeProjectAwarenessLine({
    candidate: pick(
      runtimeStructuredAwarenessCarriesCoreProjectFacts ? runtimeStructuredAwarenessSummary : null,
      preferredLandedProgressAwareFallback
      && !carriesExplicitLandedProgress(runtimeExplicitAwareness)
        ? preferredLandedProgressAwareFallback
        : null,
      preferredContinuityLead,
      preferredStrongerSameHerContinuityRuntime,
      runtimeHasExplicitAwareness ? null : preferredStrongerSameHerContinuityFallback,
      preferredRuntimePreflightAwarenessForWeakShell,
      shouldPreferFallbackStructuredAwarenessSummary ? fallbackStructuredAwarenessSummary : null,
      runtimeHasExplicitAwareness && !runtimeExplicitAwarenessIsWeakShell
        ? null
        : runtimeStructuredAwarenessSummary,
      preferStrongerCompanionBriefingLine(
        input?.runtimeProjectState?.companionBriefingLine,
        input?.runtimeProjectState?.preDialogueAwarenessLine ?? input?.runtimeProjectState?.awarenessLine ?? input?.runtimeProjectState?.companionHeadlineLine,
      ),
      input?.runtimeProjectState?.preDialogueAwarenessLine,
      input?.runtimeProjectState?.companionHeadlineLine,
      input?.runtimeProjectState?.preDialogueAwarenessSummary,
      input?.runtimeProjectState?.awarenessLine,
      input?.runtimeProjectState?.companionBriefingLine,
      input?.runtimeProjectState?.preflightSummary,
      preferredFallbackExplicitAwareness,
      shouldPreferFallbackStructuredAwarenessSummary ? null : fallbackStructuredAwarenessSummary,
      preferStrongerCompanionBriefingLine(
        input?.fallbackProjectState?.companionBriefingLine,
        input?.fallbackProjectState?.preDialogueAwarenessLine ?? input?.fallbackProjectState?.awarenessLine ?? input?.fallbackProjectState?.companionHeadlineLine,
      ),
      input?.fallbackProjectState?.preDialogueAwarenessLine,
      input?.fallbackProjectState?.companionHeadlineLine,
      input?.fallbackProjectState?.preDialogueAwarenessSummary,
      input?.fallbackProjectState?.awarenessLine,
      input?.fallbackProjectState?.companionBriefingLine,
      input?.fallbackProjectState?.preflightSummary,
    ),
    runtimeProjectState: input?.runtimeProjectState,
    fallbackProjectState: input?.fallbackProjectState,
  }) || null
}
