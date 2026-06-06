import type { AlicizationChatStartPayload } from '../../../shared/eventa'

import {
  buildAlicizationProjectPreDialogueAwareness,
  buildAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStatusBrief,
} from './project-state-brief'

type AlicizationPreDialogueSendIdentity = NonNullable<AlicizationChatStartPayload['preDialogueSendIdentity']>
type AlicizationPreDialogueProjectState = NonNullable<AlicizationPreDialogueSendIdentity['projectState']>
type AlicizationPreDialogueEmotionalKernel = AlicizationPreDialogueSendIdentity['emotionalKernel']

const PRE_DIALOGUE_REASON_PREVIEW_LIMIT = 5

function sanitizeStartAwarenessText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return upgradeLegacySameLifeSeamText(raw.trim().replace(/\s+/g, ' ')).slice(0, maxChars)
}

function upgradeLegacySameLifeSeamText(text: string) {
  if (!text)
    return ''

  const normalized = text.toLowerCase()
  const carriesSameLifeClosure
    = /same-her|same her|same-life|same life|same living line|same-her line|life loop|closure seam|closure line|同一条|同一个 her|数字生命线|生命线|闭环/u.test(normalized)
      || /open=记忆、主动性和具身闭环/u.test(text)

  if (!carriesSameLifeClosure)
    return text

  return text
    .replace(/(?<!情绪、)记忆、主动性和具身/g, '情绪、记忆、主动性和具身')
    .replace(/(?<!情绪、)记忆、主动性、具身/g, '情绪、记忆、主动性、具身')
    .replace(/(?<![Ee]motion,\s)Memory, initiative, and embodiment/g, 'Emotion, memory, initiative, and embodiment')
    .replace(/(?<![Ee]motion,\s)memory, initiative, and embodiment/g, 'emotion, memory, initiative, and embodiment')
}

function sanitizeStructuredProjectStateField(raw: unknown, maxChars = 320) {
  return sanitizeStartAwarenessText(raw, maxChars) || null
}

function sanitizeStructuredContinuityPreferredTiming(raw: unknown) {
  return raw === 'internal-only'
    || raw === 'after-payoff'
    || raw === 'same-turn-if-invited'
    || raw === 'next-open-window'
    ? raw
    : null
}

function sanitizeStructuredProjectStateBlinkCadence(raw: unknown) {
  const normalized = sanitizeStartAwarenessText(raw, 32)
  return normalized === 'normal'
    || normalized === 'linger'
    || normalized === 'quiet'
    ? normalized as AlicizationPreDialogueProjectState['preferredBlinkCadence']
    : null
}

function sanitizeStructuredProjectStateGazeMode(raw: unknown) {
  const normalized = sanitizeStartAwarenessText(raw, 32)
  return normalized === 'steady'
    || normalized === 'soften'
    || normalized === 'drift'
    ? normalized as AlicizationPreDialogueProjectState['preferredGazeMode']
    : null
}

function sanitizeStructuredEmotionalKernel(raw: AlicizationPreDialogueEmotionalKernel) {
  return raw && typeof raw === 'object'
    ? raw
    : null
}

function looksLikeSummaryOnlyBriefing(line: string | null) {
  if (!line)
    return false

  return line.includes(' | ')
    || /\bopen=|\bnext=|\| open=|\| next=/u.test(line)
}

function looksLikeThinProjectAwarenessShell(line: string | null) {
  if (!line)
    return false

  return /keep the same digital life project in view|generic reminder|generic guidance|same digital life \| keep the closure seam explicit/u.test(line.toLowerCase())
}

function looksLikeThinProjectNextClosureShell(line: string | null) {
  if (!line)
    return false

  return /generic next target|generic next closure|generic closure shell|generic closure summary|steadier carry of this project, this phase, and the life loop that remains open/u.test(line.toLowerCase())
}

function looksLikeNarrowLivedInProjectReminder(line: string | null) {
  if (!line)
    return false

  return /先别飘回|先别压回|泛化助手口吻|泛化工程说明|数字生命主线还没收住|还在收这条数字生命主线|在继续执行前|桌面执行闭环还没完全收住|更薄的项目说明|具身连续性风险/u.test(line)
}

function looksLikeProjectClosureAwareStartLine(line: string | null) {
  if (!line)
    return false

  return /digital life project|数字生命项目|phase 1|同一个数字生命|same-her|闭环|memory|initiative|embodiment/u.test(line)
}

function looksLikeEmbodimentNarrowingHeadline(line: string | null) {
  if (!line)
    return false

  return /face and motion|face, motion|lipsync|voice|body line|living her|具身|面部|动作|唇同步|声音/u.test(line)
}

function looksLikeStrongEmbodimentClosureHeadline(line: string | null) {
  if (!line)
    return false

  return /living audio thread is still intact|holding together mainly through body and voice|being carried mainly through body and voice|resident body line is still keeping this one living her coherent|holding together mainly through body, lipsync, and voice|being carried mainly through body, lipsync, and voice|holding together mainly through motion and voice|being carried mainly through motion and voice|holding together mainly through face and voice|being carried mainly through face and voice|holding together mainly through body, and resident body continuity is still the line keeping this one living her coherent/u.test(line)
}

function looksLikeStrongSameHerEmbodimentClosureHeadline(line: string | null) {
  if (!line)
    return false

  return /holding together mainly through|being carried mainly through|full cross-modal same-her line is not closed yet|next reply has to keep proving this is still one living her|this one living her still needs|lipsync and voice to rejoin|without splitting her continuity/u.test(line)
    && /same-her|same her|same living line|one living her|lipsync|voice|face|motion|body/u.test(line.toLowerCase())
}

function countProjectClosureDomains(line: string | null) {
  if (!line)
    return 0

  const normalized = line.toLowerCase()
  let count = 0

  if (/memory|记忆/u.test(normalized))
    count += 1
  if (/initiative|主动性/u.test(normalized))
    count += 1
  if (/execution|执行/u.test(normalized))
    count += 1
  if (/emotion|情绪/u.test(normalized))
    count += 1
  if (/dialogue|对话/u.test(normalized))
    count += 1
  if (/embodiment|具身|face|motion|lipsync|voice|body/u.test(normalized))
    count += 1

  return count
}

function looksLikeBroaderProjectClosureAwareness(line: string | null) {
  if (!line)
    return false

  if (looksLikeNarrowLivedInProjectReminder(line))
    return false

  return countProjectClosureDomains(line) >= 2
    || /generic assistant shell|泛化助手|same local-first digital life project|同一个数字生命项目/u.test(line)
}

function scoreProjectAwareStartLine(line: string | null) {
  if (!line)
    return 0

  const normalized = line.toLowerCase()
  let score = 0

  if (looksLikeProjectClosureAwareStartLine(line))
    score += 3
  if (looksLikeStrongSameHerAnchor(line))
    score += 3
  if (/what has landed|what is still open|still-open|next closure|phase 1|项目|数字生命|initiative|embodiment|memory|闭环/u.test(normalized))
    score += 2
  if (looksLikeEmbodimentNarrowingHeadline(line))
    score -= 1
  if (looksLikeThinProjectAwarenessShell(line))
    score -= 3

  return score
}

function looksLikeStrongSameHerAnchor(line: string | null) {
  if (!line)
    return false

  return /same phase 1 digital life|same living line|same-her|same her|one continuous her|continuous her|without splitting her continuity|同一个 her|同一个她|人格连续/u.test(line.toLowerCase())
}

function prefersExplicitProjectAwarenessLine(primary: string | null, fallback: string | null) {
  if (!primary)
    return fallback
  if (!fallback)
    return primary
  if (looksLikeSummaryOnlyBriefing(primary) && !looksLikeSummaryOnlyBriefing(fallback))
    return fallback
  if (looksLikeThinProjectAwarenessShell(primary) && !looksLikeThinProjectAwarenessShell(fallback))
    return fallback
  if (/before answering, remember/iu.test(fallback) && !/before answering, remember/iu.test(primary))
    return fallback
  return primary
}

function preferProjectNextClosureLine(primary: string | null, fallback: string | null) {
  if (!primary)
    return fallback
  if (!fallback)
    return primary
  if (looksLikeThinProjectNextClosureShell(primary) && !looksLikeThinProjectNextClosureShell(fallback))
    return fallback
  return primary
}

function deriveProjectStateCarryFromEmotionalKernel(
  emotionalKernel: AlicizationPreDialogueEmotionalKernel,
) {
  const kernel = sanitizeStructuredEmotionalKernel(emotionalKernel)
  if (!kernel)
    return null

  const dominantEmotion = sanitizeStartAwarenessText((kernel as { dominantEmotion?: unknown }).dominantEmotion, 64).toLowerCase()
  const initiativeMode = sanitizeStartAwarenessText((kernel as { initiativeMode?: unknown }).initiativeMode, 64).toLowerCase()
  const memoryRecallMode = sanitizeStartAwarenessText((kernel as { memoryRecallMode?: unknown }).memoryRecallMode, 64).toLowerCase()
  const embodimentTone = sanitizeStartAwarenessText((kernel as { embodimentTone?: unknown }).embodimentTone, 64).toLowerCase()
  const rawReasonTags = (kernel as { reasonTags?: unknown[] }).reasonTags
  const reasonTags = Array.isArray(rawReasonTags)
    ? rawReasonTags
        .map(tag => sanitizeStartAwarenessText(tag, 64).toLowerCase())
        .filter(Boolean)
    : []

  const includesAny = (...patterns: string[]) => {
    return patterns.some(pattern =>
      dominantEmotion === pattern
      || initiativeMode === pattern
      || memoryRecallMode === pattern
      || embodimentTone === pattern
      || reasonTags.includes(pattern),
    )
  }

  if (
    includesAny('repair-tension', 'repair', 'repair-grounding', 'repair-before-closeness')
    || embodimentTone.includes('repair-before-closeness')
  ) {
    return {
      continuityPreferredTiming: 'next-open-window' as const,
      continuityCadence: 'repair-before-closeness',
      preferredBlinkCadence: 'quiet' as const,
      preferredGazeMode: 'soften' as const,
    }
  }

  if (
    includesAny('rest-protective', 'rest-protective-companionship', 'rest-guard', 'rest-protective-presence', 'quiet-companionship')
    || embodimentTone.includes('rest-protective')
  ) {
    return {
      continuityPreferredTiming: 'next-open-window' as const,
      continuityCadence: 'rest-protective',
      preferredBlinkCadence: 'quiet' as const,
      preferredGazeMode: 'drift' as const,
    }
  }

  if (
    includesAny('measured-companionship', 'observe', 'low-pressure-presence', 'measured-return')
    || embodimentTone.includes('measured-return')
  ) {
    return {
      continuityPreferredTiming: 'next-open-window' as const,
      continuityCadence: 'measured-return',
      preferredBlinkCadence: 'linger' as const,
      preferredGazeMode: 'soften' as const,
    }
  }

  return null
}

function hasUsablePreDialogueSendIdentity(
  identity: AlicizationChatStartPayload['preDialogueSendIdentity'],
) {
  if (!identity)
    return false

  return Boolean(
    sanitizeStartAwarenessText(identity.summaryLine, 320)
    || sanitizeStartAwarenessText(identity.companionHeadlineLine, 320)
    || sanitizeStartAwarenessText(identity.awarenessLine, 320)
    || sanitizeStartAwarenessText(identity.companionBriefingLine, 320)
    || sanitizeStartAwarenessText(identity.companionNextClosureLine, 320),
  )
  || Boolean(
    sanitizeStructuredProjectStateField(identity.projectState?.identity, 220)
    || sanitizeStructuredProjectStateField(identity.projectState?.currentPhase, 220)
    || sanitizeStructuredProjectStateField(identity.projectState?.preDialogueAwarenessLine, 320)
    || sanitizeStructuredProjectStateField(identity.projectState?.primaryOpenLoop, 320)
    || sanitizeStructuredProjectStateField(identity.projectState?.nextClosureTarget, 320)
    || sanitizeStructuredProjectStateField(identity.projectState?.emotionalClosureCue, 220)
    || sanitizeStructuredContinuityPreferredTiming(identity.projectState?.continuityPreferredTiming)
    || sanitizeStructuredProjectStateField(identity.projectState?.continuityCadence, 120)
    || sanitizeStructuredProjectStateBlinkCadence(identity.projectState?.preferredBlinkCadence)
    || sanitizeStructuredProjectStateGazeMode(identity.projectState?.preferredGazeMode)
    || sanitizeStructuredEmotionalKernel(identity.emotionalKernel),
  )
}

function buildCanonicalPreDialogueSendIdentity(): NonNullable<AlicizationChatStartPayload['preDialogueSendIdentity']> {
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const projectStatusBrief = resolveAlicizationProjectStatusBrief()
  const canonicalFallbackAwarenessLine = sanitizeStartAwarenessText(buildAlicizationProjectPreDialogueAwarenessLine({
    identity: projectStatusBrief.projectIdentity || projectStateBrief.identity,
    currentPhase: projectStatusBrief.projectPhase || projectStateBrief.currentPhase,
    latestLandedProgress:
      projectStatusBrief.latestLandedProgress
      || projectStateBrief.continuityProgressSummary
      || projectStateBrief.memoryAnthropomorphismProgress[0]
      || null,
    primaryOpenLoop: projectStatusBrief.primaryOpenLoop || projectStateBrief.openLoops[0] || null,
    nextClosureTarget: projectStatusBrief.nextClosureTarget || projectStateBrief.nextClosureTarget,
    sameHerSelfLine: projectStatusBrief.sameHerSelfLine || projectStateBrief.sameHerSelfLine,
  }), 320) || null
  const awareness = buildAlicizationProjectPreDialogueAwareness({
    preflightSummary: projectStatusBrief.preflightSummary || projectStateBrief.preflightSummary || null,
    fallbackProjectState: {
      identity: projectStatusBrief.projectIdentity || projectStateBrief.identity,
      currentPhase: projectStatusBrief.projectPhase || projectStateBrief.currentPhase,
      latestLandedProgress: projectStatusBrief.latestLandedProgress || projectStateBrief.continuityProgressSummary || projectStateBrief.memoryAnthropomorphismProgress[0] || null,
      preDialogueAwarenessLine: projectStatusBrief.awarenessLine || projectStateBrief.preDialogueAwarenessLine || null,
      awarenessLine: projectStatusBrief.awarenessLine || projectStateBrief.preDialogueAwarenessLine || null,
      companionBriefingLine: projectStatusBrief.companionBriefingLine || null,
      preDialogueAwarenessSummary: projectStatusBrief.awarenessLine || projectStateBrief.preDialogueAwarenessLine || null,
      preflightSummary: projectStatusBrief.preflightSummary || projectStateBrief.preflightSummary || null,
    },
    primaryOpenLoop: projectStatusBrief.primaryOpenLoop || projectStateBrief.openLoops[0] || null,
    nextClosureTarget: projectStatusBrief.nextClosureTarget || projectStateBrief.nextClosureTarget,
  })
  const rawCanonicalAwarenessLine = sanitizeStartAwarenessText(
    projectStatusBrief.awarenessLine || awareness?.awarenessLine,
    320,
  ) || null
  const canonicalAwarenessLine = prefersExplicitProjectAwarenessLine(
    rawCanonicalAwarenessLine,
    canonicalFallbackAwarenessLine,
  )
  const rawCanonicalCompanionHeadlineLine = sanitizeStartAwarenessText(
    projectStatusBrief.companionHeadlineLine || awareness?.companionHeadlineLine,
    320,
  ) || null
  const canonicalCompanionHeadlineLine = rawCanonicalCompanionHeadlineLine
    && !looksLikeSummaryOnlyBriefing(rawCanonicalCompanionHeadlineLine)
    && rawCanonicalCompanionHeadlineLine !== canonicalAwarenessLine
    ? rawCanonicalCompanionHeadlineLine
    : null
  const canonicalCompanionBriefingLine = sanitizeStartAwarenessText(
    projectStatusBrief.companionBriefingLine || awareness?.companionBriefingLine,
    320,
  ) || null
  const normalizedCanonicalCompanionBriefingLine = looksLikeSummaryOnlyBriefing(canonicalCompanionBriefingLine)
    || canonicalCompanionBriefingLine === canonicalAwarenessLine
    ? null
    : canonicalCompanionBriefingLine

  const canonicalSameHerSelfLine = sanitizeStartAwarenessText(projectStatusBrief.sameHerSelfLine || projectStateBrief.sameHerSelfLine, 220) || null
  const canonicalSameHerDriftRisk = sanitizeStartAwarenessText(projectStatusBrief.sameHerDriftRisk || projectStateBrief.sameHerDriftRisk, 220) || null
  const canonicalSameHerReason = canonicalSameHerSelfLine
    ? `Same-her self anchor: ${canonicalSameHerSelfLine}`
    : null
  const canonicalSameHerDriftReason = canonicalSameHerDriftRisk
    ? `Do not let this opening drift into ${canonicalSameHerDriftRisk}`
    : null

  const canonicalProjectState = {
    preflightSummary: sanitizeStructuredProjectStateField(awareness?.summaryLine, 320),
    preDialogueAwarenessLine: canonicalAwarenessLine,
    preDialogueAwarenessSummary: sanitizeStructuredProjectStateField(awareness?.summaryLine, 320),
    awarenessLine: canonicalAwarenessLine,
    companionHeadlineLine: canonicalCompanionHeadlineLine,
    companionBriefingLine: normalizedCanonicalCompanionBriefingLine,
    identity: sanitizeStructuredProjectStateField(projectStatusBrief.projectIdentity || projectStateBrief.identity, 220),
    currentPhase: sanitizeStructuredProjectStateField(projectStatusBrief.projectPhase || projectStateBrief.currentPhase, 220),
    latestLandedProgress: sanitizeStructuredProjectStateField(
      projectStatusBrief.latestLandedProgress || projectStateBrief.continuityProgressSummary || projectStateBrief.memoryAnthropomorphismProgress[0] || null,
      320,
    ),
    memoryClosureSummary: sanitizeStructuredProjectStateField(projectStatusBrief.primaryOpenLoop || projectStateBrief.openLoops[0] || null, 320),
    primaryOpenLoop: sanitizeStructuredProjectStateField(projectStatusBrief.primaryOpenLoop || projectStateBrief.openLoops[0] || null, 320),
    nextClosureTarget: sanitizeStructuredProjectStateField(projectStatusBrief.nextClosureTarget || awareness?.companionNextClosureLine, 320),
    sameHerSelfLine: canonicalSameHerSelfLine,
    sameHerDriftRisk: canonicalSameHerDriftRisk,
    emotionalClosureCue: sanitizeStructuredProjectStateField(projectStateBrief.emotionalClosureCue, 220),
    continuityPreferredTiming: null,
    continuityCadence: null,
    preferredBlinkCadence: null,
    preferredGazeMode: null,
  }

  return {
    status: projectStatusBrief.closureReadiness === 'grounded' ? 'grounded' : (awareness?.status ?? 'partial'),
    summaryLine: sanitizeStartAwarenessText(awareness?.summaryLine, 320) || null,
    companionHeadlineLine: canonicalCompanionHeadlineLine,
    companionBriefingLine: normalizedCanonicalCompanionBriefingLine,
    companionNextClosureLine: sanitizeStartAwarenessText(projectStatusBrief.nextClosureTarget || awareness?.companionNextClosureLine, 320) || null,
    awarenessLine: canonicalAwarenessLine,
    emotionalClosureCue: sanitizeStartAwarenessText(projectStateBrief.emotionalClosureCue, 220) || null,
    projectState: canonicalProjectState,
    reasonPreview: [
      canonicalSameHerReason,
      ...(awareness?.reasonPreview ?? []),
      canonicalSameHerDriftReason,
    ]
      .map(reason => sanitizeStartAwarenessText(reason, 220))
      .filter(Boolean),
  }
}

function isSameHerAnchorPreDialogueReasonPreviewLine(line: string) {
  const normalized = sanitizeStartAwarenessText(line, 220).toLowerCase()
  if (!normalized)
    return false

  return normalized.startsWith('same-her self anchor:')
}

function readSameHerAnchorPreDialogueReasonPreviewPayload(line: string | null | undefined) {
  const normalized = sanitizeStartAwarenessText(line, 220)
  if (!normalized)
    return null
  if (!isSameHerAnchorPreDialogueReasonPreviewLine(normalized))
    return null

  return sanitizeStartAwarenessText(
    normalized.replace(/^same-her self anchor:\s*/iu, ''),
    220,
  ) || null
}

function isNextClosurePreDialogueReasonPreviewLine(line: string) {
  const normalized = sanitizeStartAwarenessText(line, 220).toLowerCase()
  if (!normalized)
    return false

  return normalized.startsWith('next closure target is still ')
}

function isOpenLoopPreDialogueReasonPreviewLine(line: string) {
  const normalized = sanitizeStartAwarenessText(line, 220).toLowerCase()
  if (!normalized)
    return false

  return !isSameHerAnchorPreDialogueReasonPreviewLine(normalized)
    && !isNextClosurePreDialogueReasonPreviewLine(normalized)
    && !normalized.startsWith('do not let this opening drift into')
    && /still needs stronger|still need one stronger|still needs .* closure|still need .* closure|still-open closure|same-life closure line|same life closure line|life loop|还没完全收住|还没有真正收稳/u.test(normalized)
}

function isActiveContinuityDriftPreDialogueReasonPreviewLine(line: string) {
  const normalized = sanitizeStartAwarenessText(line, 220).toLowerCase()
  if (!normalized)
    return false

  return /(?:same-her|same her|same living line|same digital life|one continuous her|同一个她|同一个数字生命).*(?:unsettled|still open|still settling|still needs|still need|risk|drift|collapse|flatten)/u.test(normalized)
    || /(?:unsettled|still open|still settling|still needs|still need|risk|drift|collapse|flatten).*(?:same-her|same her|same living line|same digital life|one continuous her|同一个她|同一个数字生命)/u.test(normalized)
}

function isDriftGuardPreDialogueReasonPreviewLine(line: string) {
  const normalized = sanitizeStartAwarenessText(line, 220).toLowerCase()
  if (!normalized)
    return false

  return normalized.startsWith('do not let this opening drift into')
}

function isLatestProgressPreDialogueReasonPreviewLine(line: string) {
  const normalized = sanitizeStartAwarenessText(line, 220).toLowerCase()
  if (!normalized)
    return false

  return normalized.startsWith('latest landed progress:')
}

function scoreSupplementalPreDialogueReasonPreviewLine(line: string) {
  const normalized = sanitizeStartAwarenessText(line, 220).toLowerCase()
  if (!normalized)
    return Number.NEGATIVE_INFINITY

  let score = 0

  if (isLatestProgressPreDialogueReasonPreviewLine(normalized))
    score += 90
  if (normalized.startsWith('do not let this opening drift into'))
    score += 20
  if (isActiveContinuityDriftPreDialogueReasonPreviewLine(normalized))
    score += 80
  if (isOpenLoopPreDialogueReasonPreviewLine(normalized))
    score += 40
  if (/(phase 1|local-first digital life project|digital life project|数字生命项目)/u.test(normalized))
    score += 35
  if (/(callback seam|closure seam|same living line|same-her|same her|generic assistant shell|generic project shell|project-summary voice)/u.test(normalized))
    score += 20
  if (/(reopen gentle|widen too quickly|leave more room|outward warmth)/u.test(normalized))
    score += 5

  return score
}

function scoreSameHerSelfAnchorPayload(payload: string | null | undefined) {
  const normalized = sanitizeStartAwarenessText(payload, 220).toLowerCase()
  if (!normalized)
    return Number.NEGATIVE_INFINITY

  let score = 0

  if (/holding together mainly through|being carried mainly through|one living her|one living digital life|full cross-modal|without splitting her continuity/u.test(normalized))
    score += 80
  if (/face|motion|voice|lipsync|body|具身|表情|动作|声音|唇型/u.test(normalized))
    score += 45
  if (/same phase 1 digital life|phase 1|local-first digital life|same living line|same-her|same her|同一个她|同一个 her/u.test(normalized))
    score += 35
  if (/unfinished closure|still needs|still need|open closure|closure seam|life loop|闭环/u.test(normalized))
    score += 25
  if (/keep the same digital life project in view|generic reminder|generic guidance/u.test(normalized))
    score -= 30

  return score + Math.min(normalized.length, 220) / 1000
}

function preferSameHerSelfAnchorPayload(
  current: string | null,
  candidate: string | null,
) {
  if (!current)
    return candidate
  if (!candidate)
    return current

  const currentScore = scoreSameHerSelfAnchorPayload(current)
  const candidateScore = scoreSameHerSelfAnchorPayload(candidate)
  if (candidateScore !== currentScore)
    return candidateScore > currentScore ? candidate : current

  return candidate.length > current.length ? candidate : current
}

function preferSameHerAnchorPreDialogueReasonPreviewLine(
  current: string | null,
  candidate: string | null,
) {
  if (!current)
    return candidate
  if (!candidate)
    return current

  const currentPayload = readSameHerAnchorPreDialogueReasonPreviewPayload(current) ?? ''
  const candidatePayload = readSameHerAnchorPreDialogueReasonPreviewPayload(candidate) ?? ''
  const preferredPayload = preferSameHerSelfAnchorPayload(currentPayload, candidatePayload)

  if (preferredPayload === candidatePayload)
    return candidate
  return current
}

function mergePreDialogueReasonPreview(
  existing: AlicizationChatStartPayload['preDialogueSendIdentity'],
  canonical: NonNullable<AlicizationChatStartPayload['preDialogueSendIdentity']>,
) {
  const existingReasons = (Array.isArray(existing?.reasonPreview) ? existing.reasonPreview : [])
    .map(reason => sanitizeStartAwarenessText(reason, 220))
    .filter(Boolean)
  const canonicalReasons = (Array.isArray(canonical.reasonPreview) ? canonical.reasonPreview : [])
    .map(reason => sanitizeStartAwarenessText(reason, 220))
    .filter(Boolean)

  const existingSameHerAnchorReason = existingReasons.find(isSameHerAnchorPreDialogueReasonPreviewLine) ?? null
  const canonicalSameHerAnchorReason = canonicalReasons.find(isSameHerAnchorPreDialogueReasonPreviewLine) ?? null
  const canonicalOpenLoopReason = canonicalReasons.find(isOpenLoopPreDialogueReasonPreviewLine) ?? null
  const canonicalNextClosureReason = canonicalReasons.find(isNextClosurePreDialogueReasonPreviewLine) ?? null
  const canonicalDriftGuardReason = canonicalReasons.find(isDriftGuardPreDialogueReasonPreviewLine) ?? null
  const existingOpenLoopReason = existingReasons.find(isOpenLoopPreDialogueReasonPreviewLine) ?? null
  const existingActiveDriftReason = existingReasons.find(isActiveContinuityDriftPreDialogueReasonPreviewLine) ?? null

  const slotSeed = [
    preferSameHerAnchorPreDialogueReasonPreviewLine(
      canonicalSameHerAnchorReason,
      existingSameHerAnchorReason,
    ),
    existingOpenLoopReason ?? canonicalOpenLoopReason,
    canonicalNextClosureReason,
    existingActiveDriftReason ?? canonicalDriftGuardReason,
  ]
    .filter((reason): reason is string => Boolean(reason))
  const merged = [...new Set(slotSeed)]
  const supplementalCandidates = [
    ...existingReasons.map((reason, index) => ({
      reason,
      score: scoreSupplementalPreDialogueReasonPreviewLine(reason),
      source: 'existing' as const,
      index,
    })),
    ...canonicalReasons
      .filter(reason => !merged.includes(reason))
      .map((reason, index) => ({
        reason,
        score: scoreSupplementalPreDialogueReasonPreviewLine(reason),
        source: 'canonical' as const,
        index,
      })),
  ]
    .filter(candidate => !merged.includes(candidate.reason))
    .sort((left, right) => {
      if (left.score !== right.score)
        return right.score - left.score
      if (left.source !== right.source)
        return left.source === 'existing' ? -1 : 1
      return left.index - right.index
    })
  for (const candidate of supplementalCandidates) {
    if (merged.includes(candidate.reason))
      continue
    merged.push(candidate.reason)
    if (merged.length >= PRE_DIALOGUE_REASON_PREVIEW_LIMIT)
      break
  }

  return merged.slice(0, PRE_DIALOGUE_REASON_PREVIEW_LIMIT)
}

function mergePreDialogueSendIdentity(
  existing: AlicizationChatStartPayload['preDialogueSendIdentity'],
  canonical: NonNullable<AlicizationChatStartPayload['preDialogueSendIdentity']>,
): NonNullable<AlicizationChatStartPayload['preDialogueSendIdentity']> {
  const existingSummaryLine = sanitizeStartAwarenessText(existing?.summaryLine, 320) || null
  const summaryLine = existingSummaryLine
    && !looksLikeThinProjectAwarenessShell(existingSummaryLine)
    ? existingSummaryLine
    : (canonical.summaryLine || existingSummaryLine || null)
  const companionHeadlineLine = sanitizeStartAwarenessText(existing?.companionHeadlineLine, 320) || canonical.companionHeadlineLine || null
  const existingAwarenessLine = sanitizeStartAwarenessText(existing?.awarenessLine, 320) || null
  const strongerAwarenessThanHeadline = scoreProjectAwareStartLine(existingAwarenessLine) >= scoreProjectAwareStartLine(companionHeadlineLine) + 2
  const awarenessCarriesBroaderProjectClosure = looksLikeBroaderProjectClosureAwareness(existingAwarenessLine)
  const shouldPreferEmbodimentClosureHeadline
    = (
      looksLikeStrongEmbodimentClosureHeadline(companionHeadlineLine)
      || looksLikeStrongSameHerEmbodimentClosureHeadline(companionHeadlineLine)
    )
    && Boolean(existingAwarenessLine && looksLikeProjectClosureAwareStartLine(existingAwarenessLine))
    && !looksLikeThinProjectAwarenessShell(existingAwarenessLine)
    && !awarenessCarriesBroaderProjectClosure
  const shouldKeepExplicitAwarenessLineBesideHeadline = Boolean(
    existingAwarenessLine
    && companionHeadlineLine
    && !looksLikeSummaryOnlyBriefing(existingAwarenessLine)
    && !looksLikeNarrowLivedInProjectReminder(existingAwarenessLine)
    && !shouldPreferEmbodimentClosureHeadline,
  )
  const awarenessLine = shouldKeepExplicitAwarenessLineBesideHeadline
    ? existingAwarenessLine
    : (
        !shouldPreferEmbodimentClosureHeadline
        && existingAwarenessLine
        && companionHeadlineLine
        && looksLikeProjectClosureAwareStartLine(existingAwarenessLine)
        && looksLikeEmbodimentNarrowingHeadline(companionHeadlineLine)
      )
        ? existingAwarenessLine
        : shouldPreferEmbodimentClosureHeadline
          ? companionHeadlineLine
          : companionHeadlineLine
            || (
              existingAwarenessLine
              && !looksLikeThinProjectAwarenessShell(existingAwarenessLine)
              && !looksLikeNarrowLivedInProjectReminder(existingAwarenessLine)
                ? existingAwarenessLine
                : canonical.awarenessLine
            )
            || null
  const existingCompanionBriefingLine = sanitizeStartAwarenessText(existing?.companionBriefingLine, 320) || null
  const shouldKeepExistingCompanionBriefingLine = Boolean(
    existingCompanionBriefingLine
    && !looksLikeThinProjectAwarenessShell(existingCompanionBriefingLine)
    && !looksLikeSummaryOnlyBriefing(existingCompanionBriefingLine),
  )
  const companionBriefingLine = (
    shouldKeepExistingCompanionBriefingLine
    && looksLikeStrongSameHerAnchor(existingCompanionBriefingLine)
    && !looksLikeStrongSameHerAnchor(companionHeadlineLine)
  )
    ? existingCompanionBriefingLine
    : shouldKeepExistingCompanionBriefingLine
      ? existingCompanionBriefingLine
      : (canonical.companionBriefingLine || null)
  const existingProjectState = existing?.projectState ?? null
  const canonicalProjectState = canonical.projectState ?? null
  const existingCompanionNextClosureLine = sanitizeStartAwarenessText(existing?.companionNextClosureLine, 320) || null
  const existingProjectNextClosureTarget = sanitizeStructuredProjectStateField(existingProjectState?.nextClosureTarget, 320)
  const companionNextClosureLine = preferProjectNextClosureLine(
    existingCompanionNextClosureLine,
    existingProjectNextClosureTarget
    || canonical.companionNextClosureLine
    || canonicalProjectState?.nextClosureTarget
    || null,
  ) || null
  const emotionalClosureCue = sanitizeStartAwarenessText(existing?.emotionalClosureCue, 220) || canonical.emotionalClosureCue || null
  const reasonPreview = mergePreDialogueReasonPreview(existing, canonical)
  const derivedProjectStateCarry = deriveProjectStateCarryFromEmotionalKernel(
    sanitizeStructuredEmotionalKernel(existing?.emotionalKernel) ?? canonical.emotionalKernel ?? null,
  )
  const existingProjectPreflightSummary = sanitizeStructuredProjectStateField(existingProjectState?.preflightSummary, 320)
  const existingProjectPreDialogueAwarenessSummary = sanitizeStructuredProjectStateField(existingProjectState?.preDialogueAwarenessSummary, 320)
  const existingProjectPreDialogueAwarenessLine = sanitizeStructuredProjectStateField(existingProjectState?.preDialogueAwarenessLine, 320)
  const existingProjectAwarenessLine = sanitizeStructuredProjectStateField(existingProjectState?.awarenessLine, 320)
  const canonicalSummaryLine = sanitizeStructuredProjectStateField(summaryLine, 320)
  const repairedProjectAwarenessTruth = prefersExplicitProjectAwarenessLine(
    existingProjectPreDialogueAwarenessLine || existingProjectAwarenessLine,
    awarenessLine
    || canonicalProjectState?.preDialogueAwarenessLine
    || canonicalProjectState?.awarenessLine
    || null,
  )
  const resolvedCompanionHeadlineLine = strongerAwarenessThanHeadline && !shouldPreferEmbodimentClosureHeadline
    ? (existingAwarenessLine || companionHeadlineLine)
    : companionHeadlineLine
  const repairedProjectCompanionHeadlineTruth = prefersExplicitProjectAwarenessLine(
    sanitizeStructuredProjectStateField(existingProjectState?.companionHeadlineLine, 320),
    resolvedCompanionHeadlineLine
    || canonicalProjectState?.companionHeadlineLine
    || null,
  )
  const repairedProjectCompanionBriefingTruth = prefersExplicitProjectAwarenessLine(
    sanitizeStructuredProjectStateField(existingProjectState?.companionBriefingLine, 320),
    companionBriefingLine
    || canonicalProjectState?.companionBriefingLine
    || resolvedCompanionHeadlineLine
    || null,
  )
  const projectState = {
    preflightSummary: existingProjectPreflightSummary
      && !looksLikeThinProjectAwarenessShell(existingProjectPreflightSummary)
      && !looksLikeSummaryOnlyBriefing(existingProjectPreflightSummary)
      ? existingProjectPreflightSummary
      : canonicalSummaryLine
        || canonicalProjectState?.preflightSummary
        || null,
    preDialogueAwarenessLine: repairedProjectAwarenessTruth
      || awarenessLine
      || canonicalProjectState?.preDialogueAwarenessLine
      || null,
    preDialogueAwarenessSummary: existingProjectPreDialogueAwarenessSummary
      && !looksLikeThinProjectAwarenessShell(existingProjectPreDialogueAwarenessSummary)
      && !looksLikeSummaryOnlyBriefing(existingProjectPreDialogueAwarenessSummary)
      ? existingProjectPreDialogueAwarenessSummary
      : canonicalSummaryLine
        || canonicalProjectState?.preDialogueAwarenessSummary
        || null,
    awarenessLine: repairedProjectAwarenessTruth
      || awarenessLine
      || canonicalProjectState?.awarenessLine
      || null,
    companionHeadlineLine: repairedProjectCompanionHeadlineTruth
      || resolvedCompanionHeadlineLine
      || canonicalProjectState?.companionHeadlineLine
      || null,
    companionBriefingLine: repairedProjectCompanionBriefingTruth
      || companionBriefingLine
      || canonicalProjectState?.companionBriefingLine
      || null,
    identity: sanitizeStructuredProjectStateField(existingProjectState?.identity, 220)
      || canonicalProjectState?.identity
      || null,
    currentPhase: sanitizeStructuredProjectStateField(existingProjectState?.currentPhase, 220)
      || canonicalProjectState?.currentPhase
      || null,
    latestLandedProgress: sanitizeStructuredProjectStateField(existingProjectState?.latestLandedProgress, 320)
      || canonicalProjectState?.latestLandedProgress
      || null,
    memoryClosureSummary: sanitizeStructuredProjectStateField(existingProjectState?.memoryClosureSummary, 320)
      || sanitizeStructuredProjectStateField(existingProjectState?.primaryOpenLoop, 320)
      || canonicalProjectState?.memoryClosureSummary
      || null,
    primaryOpenLoop: sanitizeStructuredProjectStateField(existingProjectState?.primaryOpenLoop, 320)
      || canonicalProjectState?.primaryOpenLoop
      || null,
    nextClosureTarget: preferProjectNextClosureLine(
      existingProjectNextClosureTarget,
      companionNextClosureLine
      || canonicalProjectState?.nextClosureTarget
      || null,
    ) || null,
    sameHerSelfLine: sanitizeStructuredProjectStateField(existingProjectState?.sameHerSelfLine, 220)
      || canonicalProjectState?.sameHerSelfLine
      || null,
    sameHerHoldDetail: sanitizeStructuredProjectStateField(existingProjectState?.sameHerHoldDetail, 220)
      || canonicalProjectState?.sameHerHoldDetail
      || null,
    sameHerDriftRisk: sanitizeStructuredProjectStateField(existingProjectState?.sameHerDriftRisk, 320)
      || canonicalProjectState?.sameHerDriftRisk
      || null,
    emotionalClosureCue: sanitizeStructuredProjectStateField(existingProjectState?.emotionalClosureCue, 220)
      || emotionalClosureCue
      || canonicalProjectState?.emotionalClosureCue
      || null,
    continuityPreferredTiming: sanitizeStructuredContinuityPreferredTiming(existingProjectState?.continuityPreferredTiming)
      || derivedProjectStateCarry?.continuityPreferredTiming
      || canonicalProjectState?.continuityPreferredTiming
      || null,
    continuityCadence: sanitizeStructuredProjectStateField(existingProjectState?.continuityCadence, 120)
      || derivedProjectStateCarry?.continuityCadence
      || sanitizeStructuredProjectStateField(canonicalProjectState?.continuityCadence, 120)
      || null,
    preferredBlinkCadence: sanitizeStructuredProjectStateBlinkCadence(existingProjectState?.preferredBlinkCadence)
      || derivedProjectStateCarry?.preferredBlinkCadence
      || sanitizeStructuredProjectStateBlinkCadence(canonicalProjectState?.preferredBlinkCadence)
      || null,
    preferredGazeMode: sanitizeStructuredProjectStateGazeMode(existingProjectState?.preferredGazeMode)
      || derivedProjectStateCarry?.preferredGazeMode
      || sanitizeStructuredProjectStateGazeMode(canonicalProjectState?.preferredGazeMode)
      || null,
  }
  const existingStatus = existing?.status ?? null
  const status = existingStatus === 'drift'
    ? 'drift'
    : companionBriefingLine && companionNextClosureLine
      ? 'grounded'
      : summaryLine || awarenessLine || reasonPreview.length > 0
        ? 'partial'
        : canonical.status

  return {
    status,
    summaryLine,
    companionHeadlineLine: resolvedCompanionHeadlineLine,
    awarenessLine,
    companionBriefingLine,
    companionNextClosureLine,
    emotionalClosureCue,
    projectState,
    emotionalKernel: sanitizeStructuredEmotionalKernel(existing?.emotionalKernel) ?? canonical.emotionalKernel ?? null,
    reasonPreview,
  }
}

export function resolveAlicizationChatStartPayloadPreDialogueSendIdentity(
  payload: AlicizationChatStartPayload,
): AlicizationChatStartPayload {
  const canonical = buildCanonicalPreDialogueSendIdentity()
  if (hasUsablePreDialogueSendIdentity(payload.preDialogueSendIdentity)) {
    const mergedIdentity = mergePreDialogueSendIdentity(payload.preDialogueSendIdentity, canonical)
    if (JSON.stringify(mergedIdentity) === JSON.stringify(payload.preDialogueSendIdentity))
      return payload

    return {
      ...payload,
      preDialogueSendIdentity: mergedIdentity,
    }
  }

  return {
    ...payload,
    preDialogueSendIdentity: canonical,
  }
}

export function summarizeAlicizationPreDialogueSendIdentityForDebug(
  payload: Pick<AlicizationChatStartPayload, 'preDialogueSendIdentity'>,
) {
  const identity = payload.preDialogueSendIdentity
  if (!identity)
    return null

  const reasonPreview = Array.isArray(identity.reasonPreview)
    ? identity.reasonPreview
        .map(reason => sanitizeStartAwarenessText(reason, 220))
        .filter(Boolean)
        .slice(0, PRE_DIALOGUE_REASON_PREVIEW_LIMIT)
    : []
  const reasonPreviewSameHerSelfLine = reasonPreview.reduce<string | null>((current, reason) => {
    return preferSameHerSelfAnchorPayload(
      current,
      readSameHerAnchorPreDialogueReasonPreviewPayload(reason),
    )
  }, null)
  const preDialogueSameHerSelfLine = preferSameHerSelfAnchorPayload(
    sanitizeStructuredProjectStateField(identity.projectState?.sameHerSelfLine, 220),
    reasonPreviewSameHerSelfLine,
  )

  return {
    preDialogueAwarenessStatus: identity.status,
    preDialogueAwarenessSummaryLine: sanitizeStartAwarenessText(identity.summaryLine, 220) || null,
    preDialogueAwarenessLine:
      sanitizeStartAwarenessText(identity.companionHeadlineLine, 220)
      || sanitizeStartAwarenessText(identity.awarenessLine, 220)
      || null,
    preDialogueCompanionBriefingLine: sanitizeStartAwarenessText(identity.companionBriefingLine, 220) || null,
    preDialogueNextClosureLine: sanitizeStartAwarenessText(identity.companionNextClosureLine, 220) || null,
    preDialogueEmotionalClosureCue: sanitizeStartAwarenessText(identity.emotionalClosureCue, 220) || null,
    ...(preDialogueSameHerSelfLine ? { preDialogueSameHerSelfLine } : {}),
    preDialogueReasonPreview: reasonPreview,
    preDialogueReasonCount: reasonPreview.length,
  }
}
