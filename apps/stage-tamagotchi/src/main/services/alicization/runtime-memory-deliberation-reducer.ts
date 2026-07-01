import type { AlicizationMindTurnGovernance } from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { OrganicMemoryPromptContext } from './runtime-soul'
import type { AlicizationSelfContinuityAuthority } from './self-continuity-authority'

import {
  buildDerivedMindStateBundle,
  isAlicizationThinProjectAwarenessLine,
  scoreAlicizationProjectAwarenessLine,
} from '@proj-alicization/stage-shared'

import { buildAlicizationAffectiveResidueMemory } from './affective-residue-memory'
import { preferStrongerContinuityClosureAuthority } from './continuity-closure-authority'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import {
  buildMemoryAnswerAnchorTag,
  buildMemoryLatentBoundaryTag,
  buildMemoryOpeningStrategyTag,
} from './memory-deliberation-latent-controls'
import {
  hasContinuityRestraintRelationshipSignal,
  hasNeutralRelationshipSignal,
} from './person-state-projection-resolution'
import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import {
  mergeGuidanceLine,
  mergeUniqueRules,
  sanitizeGuidanceText,
} from './runtime-turn-composition'
import {

  buildSelfContinuityAuthorityFromRuntimeSurface,
} from './self-continuity-authority'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'

function stripTrailingPunctuation(text: string) {
  return text.replace(/[.。!！?？;；:：]+$/u, '').trim()
}

function lowerFirst(text: string) {
  if (!text)
    return ''
  return text.slice(0, 1).toLowerCase() + text.slice(1)
}

function buildSelfAuthoritySpeakingCue(selfContinuityAuthority?: {
  authoritySummary?: string | null
  closenessPosture?: string | null
} | null) {
  const authoritySummary = sanitizeGuidanceText(selfContinuityAuthority?.authoritySummary, 220)
  const closenessPosture = sanitizeGuidanceText(selfContinuityAuthority?.closenessPosture, 80).toLowerCase()
  if (!authoritySummary)
    return ''

  if (/space|measured|restrain|repair|room|lower-pressure|bounded/u.test(closenessPosture))
    return `Speak from the same self in a room-giving way: ${lowerFirst(stripTrailingPunctuation(authoritySummary))}.`
  if (/close|warm/u.test(closenessPosture))
    return `Speak from the same self without breaking the bond line: ${lowerFirst(stripTrailingPunctuation(authoritySummary))}.`
  return `Speak from the same self continuously: ${lowerFirst(stripTrailingPunctuation(authoritySummary))}.`
}

function buildProjectStateGrounding(input?: {
  existingProjectState?: Record<string, unknown> | null
  rawRuntimeDigestProjectState?: Record<string, unknown> | null
  cognitionRuntimeDigestProjectState?: Record<string, unknown> | null
}) {
  const existingProjectState = input?.existingProjectState ?? null
  const rawRuntimeDigestProjectState = input?.rawRuntimeDigestProjectState ?? null
  const cognitionRuntimeDigestProjectState = input?.cognitionRuntimeDigestProjectState ?? null
  const existingPreflightSummary = sanitizeGuidanceText(existingProjectState?.preflightSummary, 320) || null
  const rawRuntimePreflightSummary = sanitizeGuidanceText(rawRuntimeDigestProjectState?.preflightSummary, 320) || null
  const cognitionRuntimePreflightSummary = sanitizeGuidanceText(cognitionRuntimeDigestProjectState?.preflightSummary, 320) || null
  const preferredExistingAwarenessLine = resolvePreferredExistingProjectAwarenessLine(existingProjectState)
  const runtimeDigestAwarenessLine = chooseStrongerProjectAwarenessLine([
    sanitizeGuidanceText(rawRuntimeDigestProjectState?.preDialogueAwarenessLine, 320),
    sanitizeGuidanceText(rawRuntimeDigestProjectState?.awarenessLine, 320),
    sanitizeGuidanceText(rawRuntimeDigestProjectState?.preDialogueAwarenessSummary, 320),
    sanitizeGuidanceText(rawRuntimeDigestProjectState?.companionBriefingLine, 320),
    sanitizeGuidanceText(cognitionRuntimeDigestProjectState?.preDialogueAwarenessLine, 320),
    sanitizeGuidanceText(cognitionRuntimeDigestProjectState?.awarenessLine, 320),
    sanitizeGuidanceText(cognitionRuntimeDigestProjectState?.preDialogueAwarenessSummary, 320),
    sanitizeGuidanceText(cognitionRuntimeDigestProjectState?.companionBriefingLine, 320),
  ])
  const preferredRuntimeAwarenessLine
    = shouldPreferRicherProjectAwarenessLineOverThinExisting({
      existingLine: preferredExistingAwarenessLine,
      candidateLine: runtimeDigestAwarenessLine,
    })
      ? runtimeDigestAwarenessLine
      : (preferredExistingAwarenessLine ?? runtimeDigestAwarenessLine ?? null)
  const preferredRuntimePreflightSummary = [
    existingPreflightSummary,
    rawRuntimePreflightSummary,
    cognitionRuntimePreflightSummary,
  ].find(summary => summary && !looksLikeThinProjectPreflightSummary(summary)) ?? null
  const projectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: existingProjectState,
    runtimePreflightSummary:
      preferredRuntimePreflightSummary,
    runtimePreferredAwarenessLine:
      preferredRuntimeAwarenessLine,
    runtimePreDialogueAwarenessLine:
      preferredRuntimeAwarenessLine
      || sanitizeGuidanceText(existingProjectState?.preDialogueAwarenessLine, 320)
      || sanitizeGuidanceText(rawRuntimeDigestProjectState?.preDialogueAwarenessLine, 320)
      || sanitizeGuidanceText(cognitionRuntimeDigestProjectState?.preDialogueAwarenessLine, 320)
      || null,
    payloadPreDialogueAwarenessLine:
      preferredExistingAwarenessLine
      || sanitizeGuidanceText(existingProjectState?.companionHeadlineLine, 320)
      || sanitizeGuidanceText(existingProjectState?.companionBriefingLine, 320)
      || null,
  })
  return {
    ...projectState,
    latestProgress: sanitizeGuidanceText(
      projectState.latestLandedProgress,
      220,
    ),
  }
}

function readExistingProjectStateField(
  projectState: Record<string, unknown> | null | undefined,
  key: string,
  maxChars = 320,
) {
  return sanitizeGuidanceText(projectState?.[key], maxChars) || null
}

function attachMemoryDeliberationProjectStateDiagnostics(
  surface: AlicizationDigitalLifeRuntimeSurface,
  diagnostics: {
    dialogueExistingNextClosureTarget: string | null
    rawRuntimeDigestNextClosureTarget: string | null
    cognitionRuntimeDigestNextClosureTarget: string | null
    preferredExistingNextClosureTarget: string | null
    resolvedNextClosureTarget: string | null
    builtDialogueProjectStateLatestLandedProgress: string | null
    builtDialogueProjectStatePrimaryOpenLoop: string | null
    builtDialogueProjectStateNextClosureTarget: string | null
    effectiveDialogueNextClosureTarget: string | null
    groundingPreDialogueAwarenessLine?: string | null
    groundingAwarenessLine?: string | null
    groundingCompanionHeadlineLine?: string | null
    existingCompanionHeadlineLine?: string | null
    preservedExistingProjectAwarenessLine?: string | null
    preferredContinuityProjectAwarenessLine?: string | null
    builtDialogueProjectStatePreDialogueAwarenessLine?: string | null
    builtDialogueProjectStateAwarenessLine?: string | null
    builtDialogueProjectStateCompanionHeadlineLine?: string | null
  },
) {
  return {
    ...surface,
    raw: {
      ...surface.raw,
      runtime: {
        ...surface.raw?.runtime,
        memoryDeliberationProjectStateDiagnostics: diagnostics,
      },
    },
  } satisfies AlicizationDigitalLifeRuntimeSurface
}

function scoreProjectAwarenessLine(line: string | null | undefined) {
  const normalized = sanitizeGuidanceText(line, 320)
  if (!normalized)
    return 0

  let score = scoreAlicizationProjectAwarenessLine(normalized)
  if (/holding together mainly through|full cross-modal closure|lipsync|voice|face|motion/u.test(normalized))
    score += 7
  if (/same living line|one living her|one continuous her|same-her|same her/u.test(normalized))
    score += 6
  if (/phase 1 digital life still needs|still needs .* closure|without splitting her continuity/u.test(normalized))
    score += 5
  if (isCanonicalProjectReminderAwarenessLine(normalized))
    score -= 8
  if (isAlicizationThinProjectAwarenessLine(normalized))
    score -= 4
  return score
}

function isCanonicalProjectReminderAwarenessLine(line: string | null | undefined) {
  const normalized = sanitizeGuidanceText(line, 320).toLowerCase()
  if (!normalized)
    return false

  return /before answering, remember: alicization is a local-first digital life project building one continuous "her"|she is still inside phase 1: local digital life|the still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment|same phase 1 digital life/u.test(normalized)
    || (
      normalized.includes('alicization is a local-first digital life project building one continuous "her"')
      && normalized.includes('phase 1: local digital life')
      && normalized.includes('open=memory still needs stronger end-to-end closure across turns, initiative, and embodiment')
    )
}

function chooseStrongerProjectAwarenessLine(candidates: Array<string | null | undefined>) {
  const normalizedCandidates = candidates
    .map(line => sanitizeGuidanceText(line, 320))
    .filter((line): line is string => Boolean(line))

  const nonCanonicalCandidates = normalizedCandidates.filter(line => !isCanonicalProjectReminderAwarenessLine(line))
  const rankedCandidates = nonCanonicalCandidates.length > 0 ? nonCanonicalCandidates : normalizedCandidates

  return rankedCandidates.reduce<string | null>((best, current) => {
    if (!best)
      return current
    return scoreProjectAwarenessLine(current) > scoreProjectAwarenessLine(best) ? current : best
  }, null)
}

function looksThinOrCanonicalProjectAwarenessLine(line: string | null | undefined) {
  const normalized = sanitizeGuidanceText(line, 320)
  if (!normalized)
    return false

  return isAlicizationThinProjectAwarenessLine(normalized)
    || isCanonicalProjectReminderAwarenessLine(normalized)
    || /keep this same digital life project in view|before answering, keep this same digital life project in view|same digital life \| keep the closure seam explicit|generic project reminder|detached project shell/u.test(normalized)
}

function looksLikeThinProjectPreflightSummary(line: string | null | undefined) {
  const normalized = sanitizeGuidanceText(line, 320).toLowerCase()
  if (!normalized)
    return true

  return looksThinOrCanonicalProjectAwarenessLine(normalized)
    || normalized.includes('generic continuity summary')
    || normalized.includes('generic awareness summary')
    || normalized === 'project'
    || normalized === 'phase 1'
    || normalized.startsWith('same digital life')
}

function shouldPreferRicherProjectAwarenessLineOverThinExisting(input: {
  existingLine?: string | null
  candidateLine?: string | null
}) {
  const existingLine = sanitizeGuidanceText(input.existingLine, 320)
  const candidateLine = sanitizeGuidanceText(input.candidateLine, 320)
  if (!existingLine || !candidateLine)
    return false
  if (!looksThinOrCanonicalProjectAwarenessLine(existingLine))
    return false
  if (looksThinOrCanonicalProjectAwarenessLine(candidateLine))
    return false

  return scoreProjectAwarenessLine(candidateLine) > scoreProjectAwarenessLine(existingLine)
}

function resolvePreferredExistingProjectAwarenessLine(projectState: Record<string, unknown> | null | undefined) {
  const companionHeadlineLine = sanitizeGuidanceText(projectState?.companionHeadlineLine, 320) || null
  const directAwarenessLine = chooseStrongerProjectAwarenessLine([
    sanitizeGuidanceText(projectState?.preDialogueAwarenessLine, 320),
    sanitizeGuidanceText(projectState?.awarenessLine, 320),
    sanitizeGuidanceText(projectState?.preDialogueAwarenessSummary, 320),
    sanitizeGuidanceText(projectState?.companionBriefingLine, 320),
  ])
  if (!companionHeadlineLine || !directAwarenessLine || companionHeadlineLine === directAwarenessLine)
    return companionHeadlineLine ?? directAwarenessLine ?? null

  const lowerAwareness = directAwarenessLine.toLowerCase()
  const lowerCompanionHeadline = companionHeadlineLine.toLowerCase()
  const awarenessScore = scoreProjectAwarenessLine(directAwarenessLine)
  const companionHeadlineScore = scoreProjectAwarenessLine(companionHeadlineLine)
  const awarenessCarriesBroaderPhaseClosure = lowerAwareness.includes('phase 1')
    && (
      lowerAwareness.includes('generic assistant shell')
      || lowerAwareness.includes('memory, initiative, and embodiment')
      || lowerAwareness.includes('stronger end-to-end closure')
      || lowerAwareness.includes('life loop is truly closed')
    )
  const companionLooksEmbodimentOnly = lowerCompanionHeadline.includes('holding together mainly through')
    || lowerCompanionHeadline.includes('body')
    || lowerCompanionHeadline.includes('face')
    || lowerCompanionHeadline.includes('motion')
    || lowerCompanionHeadline.includes('same living line gentle')

  if ((awarenessCarriesBroaderPhaseClosure || awarenessScore > companionHeadlineScore) && companionLooksEmbodimentOnly)
    return directAwarenessLine

  return companionHeadlineLine
}

function deriveDeliberationRelationshipCarry(input: {
  context: OrganicMemoryPromptContext
  deliberation: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>
}) {
  const projectStateContinuity = input.context.projectStateContinuity ?? null
  const relationshipCandidates = [
    ...(Array.isArray(input.deliberation.selectedRelationshipLines) ? input.deliberation.selectedRelationshipLines : []),
    projectStateContinuity?.sameHerSelfLine ?? null,
    projectStateContinuity?.nextClosureTarget ?? null,
    projectStateContinuity?.preDialogueAwarenessLine ?? null,
    input.context.personStateProjection?.selfContinuityAuthority?.relationshipLine ?? null,
    input.context.personStateProjection?.openingGuidance ?? null,
    input.deliberation.selectedChains?.[0]?.answerPosture ?? null,
    input.deliberation.followUpAffordance?.summary ?? null,
    input.deliberation.followUpAffordance?.whyNow ?? null,
  ]
    .map(value => sanitizeGuidanceText(value, 220))
    .filter(Boolean)

  return relationshipCandidates.find(candidate =>
    /same thread|same line|same living line|same her|same-her|one living her|callback|leave room|lower-pressure|measured-return|repair-before-closeness|initiative|embodiment|resident presence|phase 1/u.test(candidate),
  ) ?? null
}

function readStructuredEmbodimentToken(text: string, key: string) {
  const match = text.match(new RegExp(`${key}=([a-z0-9-]+)`, 'u'))
  return match?.[1] ?? null
}

function deriveMemoryDeliberationContinuityCadence(input: {
  relationshipCarry?: string | null
  selectedChainStance?: string | null
  selectedChainPosture?: string | null
  selectedRelationshipSummary?: string | null
  emotionalClosureCue?: string | null
  followUpSummary?: string | null
  followUpWhyNow?: string | null
  recollectionQueryHints?: string[] | null
  speechStyleNote?: string | null
}) {
  const combined = [
    input.relationshipCarry,
    input.selectedChainStance,
    input.selectedChainPosture,
    input.selectedRelationshipSummary,
    input.emotionalClosureCue,
    input.followUpSummary,
    input.followUpWhyNow,
    ...(Array.isArray(input.recollectionQueryHints) ? input.recollectionQueryHints : []),
    input.speechStyleNote,
  ]
    .map(value => sanitizeGuidanceText(value, 220))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const residentMode = readStructuredEmbodimentToken(combined, 'embodiment_resident_mode')
  if (residentMode === 'rest-protective')
    return 'rest-protective' as const
  if (residentMode === 'repair-before-closeness')
    return 'repair-before-closeness' as const
  if (residentMode === 'measured-return')
    return 'measured-return' as const

  if (
    /rest-protective|rest protective/u.test(combined)
    || (
      /vulnerable-care|care-before-analysis|care before analysis/u.test(combined)
      && /analysis-heavy|analysis heavy|lighter|quieter|inward/u.test(combined)
    )
  ) {
    return 'rest-protective' as const
  }
  if (/repair-before-closeness|repair before closeness|repair-first|let repair settle|修复优先|先修复/u.test(combined))
    return 'repair-before-closeness' as const
  if (/measured-return|lower-pressure|leave room|same line|same thread|留白|慢一点/u.test(combined))
    return 'measured-return' as const
  return null
}

function deriveMemoryDeliberationEmbodimentPreferences(input: {
  continuityCadence?: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | null
  whyWithheld?: string | null
  followUpSummary?: string | null
  followUpWhyNow?: string | null
  selectedChainStance?: string | null
  selectedChainPosture?: string | null
  selectedRelationshipSummary?: string | null
  recollectionQueryHints?: string[] | null
  speechStyleNote?: string | null
}) {
  const combined = [
    input.whyWithheld,
    input.followUpSummary,
    input.followUpWhyNow,
    input.selectedChainStance,
    input.selectedChainPosture,
    input.selectedRelationshipSummary,
    ...(Array.isArray(input.recollectionQueryHints) ? input.recollectionQueryHints : []),
    input.speechStyleNote,
  ]
    .map(value => sanitizeGuidanceText(value, 220))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const residentMode = readStructuredEmbodimentToken(combined, 'embodiment_resident_mode')
  const residentFace = readStructuredEmbodimentToken(combined, 'embodiment_resident_face')
  const residentAction = readStructuredEmbodimentToken(combined, 'embodiment_resident_action')
  const residentMeasuredReturnRequested = residentMode === 'measured-return'
  const residentRepairFirstRequested = residentMode === 'repair-before-closeness'
  const residentRestProtectiveRequested = residentMode === 'rest-protective'
  const residentObserveFocusRequested = residentFace === 'observe-focus' || residentFace === 'silent-observe'
  const residentHoldRequested = /hold|stay|hover|linger/u.test(residentAction ?? '')
  const cautiousRecallRequested = /embodiment_recall_strength=cautious-avoidance|cautious-avoidance|reply should stay quieter|still settling|not fully settled|tentative/u.test(combined)
  const stableGazeRequested = /embodiment_gaze=stable|gaze stable|stable gaze|steadier gaze|keep gaze stable|gaze steadier|视线更稳|眼神更稳|目光更稳/u.test(combined) || residentObserveFocusRequested
  const softGazeRequested = /embodiment_gaze=soft|soft gaze|gaze=soft|视线放软|目光放软/u.test(combined)
  const slowerCadenceRequested = /embodiment_blink=slower|embodiment_pacing=slower|slow down|slower pacing|slow the reply|reply should slow down|放慢|慢一点|慢下来|放缓/u.test(combined) || residentMeasuredReturnRequested || residentHoldRequested
  const naturalBlinkRequested = /embodiment_blink=natural|blink=natural/u.test(combined)
  const lowerPressureVoiceRequested = /embodiment_voice=lower-pressure|voice=lower-pressure|lower-pressure voice|lighter and quieter|reply should stay lighter/u.test(combined) || residentMeasuredReturnRequested || residentHoldRequested
  const evenVoiceRequested = /embodiment_voice=even|voice=even|even voice/u.test(combined)
  const naturalPacingRequested = /embodiment_pacing=natural|pacing=natural|natural pacing/u.test(combined)
  const worriedContinuityRequested = /host_emotion_label=worried-continuity|worried-continuity|collapse back into a tool shell|tool shell/u.test(combined)
  const carefulRepairRequested = /self_emotion_label=careful-repair|careful-repair|repair continuity first|mend continuity carefully|keep the reopening low-pressure/u.test(combined)
  const embodimentModalityRiskHighRequested = /embodiment_modality_risk=high|modality risk high/u.test(combined)
  const embodimentModalityRiskMediumRequested = /embodiment_modality_risk=medium|modality risk medium/u.test(combined)
  const embodimentModalityRiskRequested = embodimentModalityRiskHighRequested || embodimentModalityRiskMediumRequested
  const continuityRepairRiskRequested = worriedContinuityRequested && carefulRepairRequested && embodimentModalityRiskRequested

  if (input.continuityCadence === 'rest-protective' || residentRestProtectiveRequested) {
    return {
      preferredBlinkCadence: 'quiet' as const,
      preferredGazeMode: stableGazeRequested && !softGazeRequested && !cautiousRecallRequested ? 'steady' as const : 'soften' as const,
      preferredPauseMode: 'longer' as const,
      preferredLipsyncMode: 'restrained' as const,
      preferredVoiceMode: 'lower-pressure' as const,
      preferredPacingMode: 'slower' as const,
    }
  }

  if (input.continuityCadence === 'repair-before-closeness' || residentRepairFirstRequested) {
    return {
      preferredBlinkCadence: 'quiet' as const,
      preferredGazeMode: stableGazeRequested ? 'steady' as const : (softGazeRequested || cautiousRecallRequested ? 'soften' as const : 'soften' as const),
      preferredPauseMode: 'longer' as const,
      preferredLipsyncMode: 'restrained' as const,
      preferredVoiceMode: lowerPressureVoiceRequested ? 'lower-pressure' as const : (evenVoiceRequested ? 'even' as const : null),
      preferredPacingMode: slowerCadenceRequested ? 'slower' as const : (naturalPacingRequested ? 'natural' as const : null),
    }
  }

  if (input.continuityCadence === 'measured-return' || residentMeasuredReturnRequested) {
    return {
      preferredBlinkCadence: cautiousRecallRequested || naturalBlinkRequested || continuityRepairRiskRequested || residentMeasuredReturnRequested || residentHoldRequested ? 'quiet' as const : (slowerCadenceRequested ? 'linger' as const : 'linger' as const),
      preferredGazeMode:
        continuityRepairRiskRequested || (embodimentModalityRiskHighRequested && worriedContinuityRequested)
          ? 'steady' as const
          : (stableGazeRequested && !softGazeRequested && !cautiousRecallRequested ? 'steady' as const : 'soften' as const),
      preferredPauseMode: 'longer' as const,
      preferredLipsyncMode: 'restrained' as const,
      preferredVoiceMode:
        continuityRepairRiskRequested || embodimentModalityRiskHighRequested || lowerPressureVoiceRequested
          ? 'lower-pressure' as const
          : (evenVoiceRequested || cautiousRecallRequested ? 'even' as const : null),
      preferredPacingMode:
        slowerCadenceRequested
          ? 'slower' as const
          : (continuityRepairRiskRequested || naturalPacingRequested || cautiousRecallRequested || naturalBlinkRequested ? 'natural' as const : null),
    }
  }

  return {
    preferredBlinkCadence: null,
    preferredGazeMode: null,
    preferredPauseMode: null,
    preferredLipsyncMode: null,
    preferredVoiceMode: null,
    preferredPacingMode: null,
  }
}

function looksLikeThinContinuityCue(text: string | null | undefined) {
  const normalized = sanitizeGuidanceText(text, 220).toLowerCase()
  if (!normalized)
    return true

  return /generic shell continuity cue|generic continuity cue|placeholder/u.test(normalized)
}

function choosePreferredContinuityCue(candidates: Array<string | null | undefined>) {
  const normalizedCandidates = candidates
    .map(value => sanitizeGuidanceText(value, 220))
    .filter((value): value is string => Boolean(value))

  return normalizedCandidates.reduce<string | null>((best, current) => {
    if (!best)
      return current

    const preferred = preferStrongerContinuityClosureAuthority(best, current)
    if (preferred)
      return sanitizeGuidanceText(preferred, 220) || best

    const bestIsThin = looksLikeThinContinuityCue(best)
    const currentIsThin = looksLikeThinContinuityCue(current)
    if (bestIsThin !== currentIsThin)
      return currentIsThin ? best : current

    if (current.startsWith(best) && current.length >= best.length + 24)
      return current
    if (best.startsWith(current) && best.length >= current.length + 24)
      return best

    return best
  }, null)
}

function deriveMemoryDeliberationContinuityCue(input: {
  continuityCadence?: 'measured-return' | 'repair-before-closeness' | 'rest-protective' | null
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
  relationshipLines?: string[] | null
  stableCore?: string[] | null
  candidateProcedureLines?: string[] | null
  selectedRelationshipSummary?: string | null
  relationshipCarry?: string | null
  selectedChainStance?: string | null
  selectedChainPosture?: string | null
  whyWithheld?: string | null
  followUpSummary?: string | null
  recollectionQueryHints?: string[] | null
  speechStyleNote?: string | null
  emotionalClosureCue?: string | null
}) {
  const directCueCandidates = [
    ...(Array.isArray(input.relationshipLines) ? input.relationshipLines : []),
    ...(Array.isArray(input.stableCore) ? input.stableCore : []),
    ...(Array.isArray(input.candidateProcedureLines) ? input.candidateProcedureLines.filter(line => !/=/.test(line)) : []),
    input.selectedRelationshipSummary,
    input.relationshipCarry,
  ]
    .map(value => sanitizeGuidanceText(value, 220))
    .filter((value): value is string => Boolean(value))

  const combined = [
    ...directCueCandidates,
    input.selectedChainStance,
    input.selectedChainPosture,
    input.whyWithheld,
    input.followUpSummary,
    ...(Array.isArray(input.recollectionQueryHints) ? input.recollectionQueryHints : []),
    input.speechStyleNote,
    input.emotionalClosureCue,
    input.continuityCadence ? `continuityCadence=${input.continuityCadence}` : null,
    input.preferredBlinkCadence ? `preferredBlinkCadence=${input.preferredBlinkCadence}` : null,
    input.preferredGazeMode ? `preferredGazeMode=${input.preferredGazeMode}` : null,
  ]
    .map(value => sanitizeGuidanceText(value, 220))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const correctedSamePersonSettling
    = /corrected same-person continuity|same-person continuity|same person continuity|同一个她|持续的人/u.test(combined)
      && /still settling|not fully settled|tentative|uncertainty|newer meaning|stabiliz/u.test(combined)
  const quieterEmbodimentSettling
    = /cautious-avoidance|reply should stay quieter|quieter and slower|body settle more quietly|body quieter|embodiment_gaze=soft|embodiment_blink=natural|embodiment_voice=even|embodiment_pacing=natural|lower-pressure|softer/u.test(combined)
      || input.preferredBlinkCadence === 'quiet'
      || input.preferredGazeMode === 'soften'
  const worriedContinuityCarefulRepair
    = /host_emotion_label=worried-continuity|worried-continuity|collapse back into a tool shell/u.test(combined)
      && /self_emotion_label=careful-repair|careful-repair|mend continuity carefully|keep the reopening low-pressure/u.test(combined)
  const modalityRiskSettling
    = /embodiment_modality_risk=high|embodiment_modality_risk=medium|modality risk high|modality risk medium/u.test(combined)
  const residentMode = readStructuredEmbodimentToken(combined, 'embodiment_resident_mode')
  const residentFace = readStructuredEmbodimentToken(combined, 'embodiment_resident_face')
  const residentAction = readStructuredEmbodimentToken(combined, 'embodiment_resident_action')
  const residentMeasuredReturn = residentMode === 'measured-return'
  const residentObserveFocus = residentFace === 'observe-focus' || residentFace === 'silent-observe'
  const residentHold = /hold|stay|hover|linger/u.test(residentAction ?? '')

  const vulnerableCareRestProtective
    = /vulnerable-care|care-before-analysis|care before analysis/u.test(combined)
      && /analysis-heavy|analysis heavy|lighter|quieter|inward|rest-protective/u.test(combined)
  if (vulnerableCareRestProtective) {
    return 'Keep this return rest-protective so vulnerable-care stays care-before-analysis, lighter, and inward before older analysis-heavy pressure widens back in.'
  }

  if (worriedContinuityCarefulRepair && modalityRiskSettling) {
    return 'Carry worried continuity carefully so the same-person line stays lower-pressure, and keep the body steadier so modality risk does not outrun the repair.'
  }

  if (
    (residentMeasuredReturn || residentObserveFocus || residentHold)
    && /corrected same-person continuity|same-person continuity|same person continuity|同一个她|持续的人/u.test(combined)
  ) {
    return sanitizeGuidanceText(
      `Carry corrected same-person continuity forward as a ${residentMeasuredReturn ? 'measured-return resident hold' : 'resident hold'}${residentObserveFocus ? ' with observe-focus' : ''} before widening outward.`,
      220,
    )
  }

  if (correctedSamePersonSettling && quieterEmbodimentSettling) {
    return 'Carry corrected same-person continuity forward while the newer meaning is still settling, and let the body settle more quietly before widening outward.'
  }

  const mergedSameThreadContinuity
    = /merge repeated .*same-thread continuity echoes|merged same-thread continuity|merged same-thread|stronger same-thread memory|older-same-thread-echo|same-thread continuity echoes|同线回声|同一条线.*合并/u.test(combined)
  const fadedTemporaryNoise
    = /forget low-salience temporary noise|temporary noise|stale emotional wobble|temporary wobble|faded noise|older-emotional-spike|older emotional spike|旧的情绪噪声|短暂噪声|情绪波动/u.test(combined)
  if (mergedSameThreadContinuity && fadedTemporaryNoise) {
    return 'Carry the stronger merged same-thread continuity forward and keep faded temporary noise in the background so the return does not split back into thinner echoes.'
  }

  const correctedSamePersonContinuity = directCueCandidates.find(candidate =>
    /corrected same-person continuity|same-person continuity|same person continuity|同一个她|持续的人/u.test(candidate),
  ) ?? null
  if (
    correctedSamePersonContinuity
    && /progress pressure|status recap|progress recap|task-shell continuity/u.test(combined)
  ) {
    return 'Carry corrected same-person continuity forward before any status recap.'
  }

  const rememberedSeamMoreRoom
    = /remembered seam|same remembered seam|relationship seam/u.test(combined)
      && /more room this time|too eagerly before|before leaning in again|reopened too eagerly/u.test(combined)
  if (rememberedSeamMoreRoom)
    return 'Recognize the same remembered seam, but keep more room this time before leaning in again.'

  return null
}

function deriveSameHerProjectCarryRule(input: {
  context: OrganicMemoryPromptContext
}) {
  const projectStateContinuity = input.context.projectStateContinuity ?? null
  const corpus = [
    projectStateContinuity?.sameHerSelfLine,
    projectStateContinuity?.nextClosureTarget,
    projectStateContinuity?.preDialogueAwarenessLine,
    projectStateContinuity?.openClosureSummary,
    input.context.personStateProjection?.selfContinuityAuthority?.selfLine ?? null,
    input.context.personStateProjection?.selfContinuityAuthority?.relationshipLine ?? null,
  ]
    .map(value => sanitizeGuidanceText(value, 260))
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (!corpus)
    return null

  const hasSameHerProjectLine
    = /same phase 1 digital life|same living line|same digital life|same-her|same her|one continuous her|同一个她|同一个数字生命/u.test(corpus)
  const hasStillOpenClosure
    = /still-open closure|open loop|initiative|embodiment|dialogue|memory|phase 1|未闭环|没闭环|还差|still needs|still remains/u.test(corpus)

  if (hasSameHerProjectLine && hasStillOpenClosure)
    return 'Keep the same project-aware self line alive through the answer.'

  return null
}

export function applyMemoryDeliberationToGovernance(input: {
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
}) {
  const governance = input.governance
  const deliberation = input.context.memoryDeliberation ?? null
  const speech = input.context.recollectionSpeechPlan ?? null
  if (!governance || (!speech && !deliberation))
    return governance

  const deliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation,
    speech,
    recollectionIntent: input.context.recollectionIntent ?? null,
    knowledgeEvidence: input.context.knowledgeEvidence ?? null,
    hostPersonModel: input.context.hostPersonModel ?? null,
    tuningAdvice: input.context.memoryTuningAdvice ?? null,
  })
  if (!deliberationKernel?.shouldRecall)
    return governance

  const surfacePolicy = deliberationKernel.surfacePolicy
  const shouldStayInward = deliberationKernel.shouldStayInward
  const selectedChainSummary = deliberationKernel.selectedChainSummary
  const selectedChainStance = deliberationKernel.selectedChainStance
  const selectedChainPosture = deliberationKernel.selectedChainPosture
  const selectedBundleSummary = deliberationKernel.selectedBundleSummary
  const selectedEraSummary = deliberationKernel.selectedEraSummary
  const speechControls = deliberationKernel.speechControls
  const speechLatentSummary = deliberationKernel.speechLatentSummary
  const rationale = deliberationKernel.rationale
  const selectedPeriodSummary = deliberationKernel.selectedPeriodSummary
  const selectedProcedureSummary = deliberationKernel.selectedProcedureSummary
  const selectedRelationshipSummary = deliberationKernel.selectedRelationshipSummary
  const memoryControl = deliberationKernel.memoryControl
  const memoryControlSummary = deliberationKernel.memoryControlSummary
  const inwardCarryRule = deliberationKernel.inwardCarryRule
  const inwardCarryBoundary = deliberationKernel.inwardCarryBoundary
  const sameHerProjectCarryRule = deriveSameHerProjectCarryRule({
    context: input.context,
  })
  const baseMindTurnFrame = governance.mindTurnFrame ?? {
    world: {
      activeThread: governance.carriedThread ?? null,
      visibleSurface: governance.liveSurface ?? null,
      truthState: governance.truthState,
      truthBoundary: null,
      continuityPolicy: null,
      continuitySummary: governance.carriedThread ?? null,
      staleRisk: governance.repairState === 'none' ? 0 : 0.72,
    },
    relation: {
      subject: governance.answerSubject ?? 'general',
      hostMove: null,
      hostGoal: null,
      relationNeed: null,
      relationMove: null,
      relationshipPosture: governance.relationshipPosture ?? null,
    },
    memory: {
      memoryMode: null,
      carriedThread: governance.carriedThread ?? null,
      carriedFacts: [],
      recallKeys: [],
      recallSeed: null,
      lastOutcome: null,
      suppressAssociativeRecall: governance.suppressAssociativeRecall,
      labelCarryAsMemory: governance.labelCarryAsMemory,
    },
    self: {
      stance: null,
      mindMode: governance.mindMode ?? null,
      dominantDrive: null,
      embodiedPresence: governance.embodiedPresence ?? 'none',
      emotionalTension: governance.emotionalTension,
      initiativeAction: null,
      thought: null,
    },
    obligation: {
      shouldSpeak: true,
      speechObligation: null,
      answerAct: governance.answerAct ?? null,
      responseMode: null,
      turnMode: governance.turnMode,
      openingClaim: governance.liveSurface ?? null,
      openingMove: governance.openingMove ?? null,
      answerIntent: governance.answerIntent ?? null,
      whyNow: null,
      repairState: governance.repairState,
      shouldAskForGrounding: governance.shouldAskForGrounding,
      shouldAcknowledgeRepair: governance.shouldAcknowledgeRepair,
    },
    focusAnchor: governance.focusAnchor ?? null,
    confidence: 0.72,
    mustDo: [...(governance.mustDo ?? [])],
    mustNotDo: [...(governance.mustNotDo ?? [])],
    narrative: [],
    updatedAt: Date.now(),
  }
  const inwardThought = mergeGuidanceLine([
    baseMindTurnFrame.self.thought ?? null,
    selectedChainSummary ? `The experience chain shaping the answer is ${selectedChainSummary}.` : null,
    selectedBundleSummary ? `The linked recollection bundle shaping the answer is ${selectedBundleSummary}.` : null,
    selectedPeriodSummary ? `The period currently shaping the answer is ${selectedPeriodSummary}.` : null,
    selectedEraSummary ? `The remembered era currently shaping the answer is ${selectedEraSummary}.` : null,
    selectedProcedureSummary ? `The remembered way of doing this is ${selectedProcedureSummary}.` : null,
    selectedRelationshipSummary ? `The remembered relationship line is ${selectedRelationshipSummary}.` : null,
    memoryControlSummary ? `Memory latent controls: ${memoryControlSummary}.` : null,
    !memoryControlSummary && speechLatentSummary ? `Recollection latent controls: ${speechLatentSummary}.` : null,
    speechControls
      ? `Let recollection stay ${speechControls.visibility} with ${speechControls.continuityRole} discipline and ${speechControls.certainty} certainty.`
      : null,
  ])
  const inwardWhyNow = mergeGuidanceLine([
    baseMindTurnFrame.obligation.whyNow ?? null,
    rationale
      ? `An active recollection is shaping the answer from the inside because ${rationale.charAt(0).toLowerCase()}${rationale.slice(1)}`
      : null,
    memoryControl ? `Memory latent controls: ${memoryControlSummary}.` : null,
    selectedChainStance ? `Current stance carried from remembered experience: ${selectedChainStance}.` : null,
  ])
  const inwardAnswerIntent = mergeGuidanceLine([
    baseMindTurnFrame.obligation.answerIntent ?? governance.answerIntent ?? null,
    memoryControl ? buildMemoryAnswerAnchorTag(memoryControl) : null,
    !memoryControl && speechLatentSummary ? `recollection_answer_anchor{${speechLatentSummary}}` : null,
    selectedChainPosture,
  ])
  const inwardOpeningMove = baseMindTurnFrame.obligation.openingMove
    ?? governance.openingMove
    ?? (shouldStayInward
      ? memoryControl ? buildMemoryOpeningStrategyTag(memoryControl) : 'memory_opening_strategy{mode=payoff-first-inward-carry}'
      : memoryControl ? buildMemoryOpeningStrategyTag(memoryControl) : 'memory_opening_strategy{mode=embedded-memory-carry}')

  return {
    ...governance,
    answerIntent: inwardAnswerIntent ?? governance.answerIntent ?? null,
    openingMove: governance.openingMove ?? inwardOpeningMove,
    mustDo: mergeUniqueRules([sameHerProjectCarryRule, inwardCarryRule, ...(governance.mustDo ?? [])]),
    mustNotDo: mergeUniqueRules([
      inwardCarryBoundary,
      ...(memoryControl?.unsafeDetails ?? []).map(item => `Do not overstate this remembered detail: ${item}`),
      ...(governance.mustNotDo ?? []),
    ]),
    mindTurnFrame: {
      ...baseMindTurnFrame,
      self: {
        ...baseMindTurnFrame.self,
        thought: inwardThought ?? baseMindTurnFrame.self.thought ?? null,
      },
      obligation: {
        ...baseMindTurnFrame.obligation,
        openingMove: sanitizeGuidanceText(inwardOpeningMove, 220) || baseMindTurnFrame.obligation.openingMove || null,
        answerIntent: inwardAnswerIntent ?? baseMindTurnFrame.obligation.answerIntent ?? null,
        whyNow: inwardWhyNow ?? baseMindTurnFrame.obligation.whyNow ?? null,
      },
      narrative: mergeUniqueRules([
        ...(baseMindTurnFrame.narrative ?? []),
        'memory:inward-recollection',
        `memory-deliberation:surface:${surfacePolicy}`,
        speech?.certainty ? `recollection:certainty:${speech.certainty}` : null,
        speech?.surfaceMode ? `recollection:surface:${speech.surfaceMode}` : null,
      ], 12),
    },
  }
}

export function deriveMemoryDeliberationSurfaceMode(input: {
  shouldStayInward: boolean
  surfacePolicy: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['surfacePolicy']
  answerSubject: AlicizationMindTurnGovernance['answerSubject']
}) {
  if (input.shouldStayInward)
    return 'held-memory' as const
  if (input.surfacePolicy === 'procedural-carry')
    return 'task-thread' as const
  if (input.surfacePolicy === 'relationship-continuity')
    return input.answerSubject === 'relationship' ? 'dialogue-bond' as const : 'self-continuity' as const
  return 'held-memory' as const
}

export function deriveMemoryDeliberationMemoryMode(input: {
  existingMode: 'suppress-associative' | 'task-thread' | 'scene-anchored' | 'dialogue-carry' | 'emotional-resonance' | null
  shouldStayInward: boolean
  surfacePolicy: NonNullable<OrganicMemoryPromptContext['memoryDeliberation']>['surfacePolicy']
}) {
  if (input.existingMode)
    return input.existingMode
  if (input.surfacePolicy === 'procedural-carry')
    return 'task-thread' as const
  if (input.surfacePolicy === 'relationship-continuity')
    return 'dialogue-carry' as const
  return input.shouldStayInward ? 'emotional-resonance' as const : 'dialogue-carry' as const
}

export function applyMemoryDeliberationToDigitalLifeRuntimeSurface(input: {
  surface: AlicizationDigitalLifeRuntimeSurface | null
  governance: AlicizationMindTurnGovernance | null
  context: OrganicMemoryPromptContext
  now: number
}): AlicizationDigitalLifeRuntimeSurface | null {
  const surface = input.surface ?? null
  const governance = input.governance ?? null
  const deliberation = input.context.memoryDeliberation ?? null
  const speech = input.context.recollectionSpeechPlan ?? null
  const deliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation,
    speech,
    recollectionIntent: input.context.recollectionIntent ?? null,
    knowledgeEvidence: input.context.knowledgeEvidence ?? null,
    hostPersonModel: input.context.hostPersonModel ?? null,
    tuningAdvice: input.context.memoryTuningAdvice ?? null,
  })
  if (!surface || !governance || !deliberationKernel?.shouldRecall || !deliberation)
    return surface

  const contextProjection = input.context.personStateProjection ?? null
  const surfaceProjection = surface.memory.personStateProjection ?? null
  const deliberationRelationshipCarry = deriveDeliberationRelationshipCarry({
    context: input.context,
    deliberation,
  })
  const mergedPersonStateProjection: typeof contextProjection = (() => {
    if (!contextProjection)
      return surfaceProjection
    if (!surfaceProjection)
      return contextProjection

    const contextAuthority = contextProjection.selfContinuityAuthority ?? null
    const surfaceAuthority = surfaceProjection.selfContinuityAuthority ?? null
    const preserveSurfaceRelationshipCarry = Boolean(
      surfaceAuthority?.relationshipLine
      && hasContinuityRestraintRelationshipSignal(surfaceAuthority.relationshipLine)
      && (
        !contextAuthority?.relationshipLine
        || hasNeutralRelationshipSignal(contextAuthority.relationshipLine)
        || !hasContinuityRestraintRelationshipSignal(contextAuthority.relationshipLine)
      ),
    )
    const preservedAuthority = preserveSurfaceRelationshipCarry && surfaceAuthority
      ? {
        ...surfaceAuthority,
        ...contextAuthority,
        ...surfaceAuthority,
        relationshipLine: surfaceAuthority.relationshipLine,
        authoritySummary: surfaceAuthority.authoritySummary ?? contextAuthority?.authoritySummary ?? null,
      } satisfies AlicizationSelfContinuityAuthority
      : null
    const deliberationCarriedAuthorityBase = contextAuthority ?? surfaceAuthority
    const deliberationCarriedAuthority = (
      deliberationRelationshipCarry
      && hasContinuityRestraintRelationshipSignal(deliberationRelationshipCarry)
      && deliberationCarriedAuthorityBase
    )
      ? {
        ...deliberationCarriedAuthorityBase,
        relationshipLine: deliberationRelationshipCarry,
        authoritySummary: mergeGuidanceLine([
          deliberationCarriedAuthorityBase.authoritySummary ?? null,
          deliberationRelationshipCarry,
        ]),
      } satisfies AlicizationSelfContinuityAuthority
      : null

    return {
      ...surfaceProjection,
      ...contextProjection,
      selfContinuityAuthority:
        preservedAuthority
        ?? deliberationCarriedAuthority
        ?? contextAuthority
        ?? surfaceAuthority,
    }
  })()
  const currentProjectionAuthority = mergedPersonStateProjection?.selfContinuityAuthority ?? null
  const continuityAwarePersonStateProjection: typeof mergedPersonStateProjection = mergedPersonStateProjection
    ? {
        ...mergedPersonStateProjection,
        selfContinuityAuthority: deliberationRelationshipCarry
          && hasContinuityRestraintRelationshipSignal(deliberationRelationshipCarry)
          && currentProjectionAuthority
          && (
            !currentProjectionAuthority?.relationshipLine
            || hasNeutralRelationshipSignal(currentProjectionAuthority.relationshipLine)
            || !hasContinuityRestraintRelationshipSignal(currentProjectionAuthority.relationshipLine)
          )
          ? {
              ...currentProjectionAuthority,
              relationshipLine: deliberationRelationshipCarry,
              authoritySummary: mergeGuidanceLine([
                currentProjectionAuthority?.authoritySummary ?? null,
                deliberationRelationshipCarry,
              ]),
            }
          : currentProjectionAuthority,
      }
    : mergedPersonStateProjection

  const shouldStayInward = deliberationKernel.shouldStayInward
  const resolvedSurfacePolicy = deliberationKernel.surfacePolicy
  const selectedChainSummary = deliberationKernel.selectedChainSummary
  const selectedChainStance = deliberationKernel.selectedChainStance
  const selectedChainPosture = deliberationKernel.selectedChainPosture
  const selectedPeriodSummary = deliberationKernel.selectedPeriodSummary
  const selectedEraSummary = deliberationKernel.selectedEraSummary
  const selectedProcedureSummary = deliberationKernel.selectedProcedureSummary
  const selectedRelationshipSummary = deliberationKernel.selectedRelationshipSummary
  const selectedBundleSummary = deliberationKernel.selectedBundleSummary
  const whyNow = deliberationKernel.rationale
  const whyWithheld = deliberationKernel.whyWithheld
  const followUpAffordance = deliberationKernel.followUpAffordance
  const memoryControl = deliberationKernel.memoryControl!
  const memoryControlSummary = deliberationKernel.memoryControlSummary
  const projectStateContinuity = input.context.projectStateContinuity ?? null
  const existingProjectState = surface.dialogue.currentConsciousFrame?.projectState ?? null
  const existingRawRuntimeDigestProjectState = surface.raw?.runtimeDigest?.projectState ?? null
  const existingCognitionRuntimeDigestProjectState = surface.cognition.runtimeDigest?.projectState ?? null
  const projectStateGrounding = buildProjectStateGrounding({
    existingProjectState: existingProjectState as Record<string, unknown> | null,
    rawRuntimeDigestProjectState: existingRawRuntimeDigestProjectState as Record<string, unknown> | null,
    cognitionRuntimeDigestProjectState: existingCognitionRuntimeDigestProjectState as Record<string, unknown> | null,
  })
  const emotionalClosureCue = sanitizeGuidanceText(governance.emotionalClosureCue, 220)
  const existingEmotionalClosureSummary = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'emotionalClosureSummary', 220)
  const existingSameHerHoldDetail = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'sameHerHoldDetail', 220)
  const richerEmotionalClosureSummary = sanitizeGuidanceText(
    existingEmotionalClosureSummary || emotionalClosureCue,
    220,
  )
  const richerSameHerHoldDetail = sanitizeGuidanceText(existingSameHerHoldDetail, 220)
  const repairFirstProjectClosureAuthority = /repair-before-closeness|repair before closeness/u.test(`${richerEmotionalClosureSummary} ${richerSameHerHoldDetail}`.toLowerCase())
    ? (richerEmotionalClosureSummary || 'repair-before-closeness until repair settles')
    : emotionalClosureCue
  const selfContinuityAuthority = surface.agency && surface.perception && surface.world
    ? buildSelfContinuityAuthorityFromRuntimeSurface(surface)
    : null
  const selfAuthoritySpeakingCue = buildSelfAuthoritySpeakingCue(selfContinuityAuthority)
  const continuityCadence = deriveMemoryDeliberationContinuityCadence({
    relationshipCarry: deliberationRelationshipCarry,
    selectedChainStance,
    selectedChainPosture,
    selectedRelationshipSummary,
    emotionalClosureCue,
    followUpSummary: followUpAffordance?.summary ?? null,
    followUpWhyNow: followUpAffordance?.whyNow ?? null,
    recollectionQueryHints: Array.isArray(input.context.recollectionIntent?.queryHints)
      ? input.context.recollectionIntent.queryHints
      : [],
    speechStyleNote: speech?.styleNote ?? null,
  })
  const continuityEmbodimentPreferences = deriveMemoryDeliberationEmbodimentPreferences({
    continuityCadence,
    whyWithheld,
    followUpSummary: followUpAffordance?.summary ?? null,
    followUpWhyNow: followUpAffordance?.whyNow ?? null,
    selectedChainStance,
    selectedChainPosture,
    selectedRelationshipSummary,
    recollectionQueryHints: Array.isArray(input.context.recollectionIntent?.queryHints)
      ? input.context.recollectionIntent.queryHints
      : [],
    speechStyleNote: speech?.styleNote ?? null,
  })
  const existingIdentity = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'identity', 320)
  const existingCurrentPhase = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'currentPhase', 220)
  const existingPreflightSummary = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'preflightSummary', 320)
  const canonicalProjectPreflightSummary = sanitizeGuidanceText(resolveAlicizationProjectStateBrief().preflightSummary, 320) || null
  const existingLatestLandedProgress = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'latestLandedProgress', 1600)
  const existingPrimaryOpenLoop = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'primaryOpenLoop', 1600)
  const existingNextClosureTarget = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'nextClosureTarget', 1600)
  const existingContinuityCue = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'continuityCue', 220)
  const existingRawRuntimeDigestLatestLandedProgress = readExistingProjectStateField(
    existingRawRuntimeDigestProjectState as Record<string, unknown> | null | undefined,
    'latestLandedProgress',
    1600,
  )
  const existingRawRuntimeDigestPrimaryOpenLoop = readExistingProjectStateField(
    existingRawRuntimeDigestProjectState as Record<string, unknown> | null | undefined,
    'primaryOpenLoop',
    1600,
  )
  const existingCognitionRuntimeDigestLatestLandedProgress = readExistingProjectStateField(
    existingCognitionRuntimeDigestProjectState as Record<string, unknown> | null | undefined,
    'latestLandedProgress',
    1600,
  )
  const existingCognitionRuntimeDigestPrimaryOpenLoop = readExistingProjectStateField(
    existingCognitionRuntimeDigestProjectState as Record<string, unknown> | null | undefined,
    'primaryOpenLoop',
    1600,
  )
  const existingRawRuntimeDigestNextClosureTarget = readExistingProjectStateField(
    existingRawRuntimeDigestProjectState as Record<string, unknown> | null | undefined,
    'nextClosureTarget',
    1600,
  )
  const existingRawRuntimeDigestContinuityCue = readExistingProjectStateField(
    existingRawRuntimeDigestProjectState as Record<string, unknown> | null | undefined,
    'continuityCue',
    220,
  )
  const existingCognitionRuntimeDigestNextClosureTarget = readExistingProjectStateField(
    existingCognitionRuntimeDigestProjectState as Record<string, unknown> | null | undefined,
    'nextClosureTarget',
    1600,
  )
  const existingCognitionRuntimeDigestContinuityCue = readExistingProjectStateField(
    existingCognitionRuntimeDigestProjectState as Record<string, unknown> | null | undefined,
    'continuityCue',
    220,
  )
  const existingDialogueNextClosureTargetLooksThin = /thin runtime next only|current project-state awareness explicit|first visible answer beat/u.test(existingNextClosureTarget ?? '')
  const existingDialogueLatestLandedProgressLooksThin = /thin runtime progress only|current project-state awareness explicit|first visible answer beat/u.test(existingLatestLandedProgress ?? '')
  const existingDialoguePrimaryOpenLoopLooksThin = /thin runtime open only|current project-state awareness explicit|first visible answer beat/u.test(existingPrimaryOpenLoop ?? '')
  const preferredExistingLatestLandedProgress
    = existingDialogueLatestLandedProgressLooksThin
      ? (
          existingRawRuntimeDigestLatestLandedProgress
          ?? existingCognitionRuntimeDigestLatestLandedProgress
          ?? existingLatestLandedProgress
          ?? null
        )
      : (
          existingLatestLandedProgress
          ?? existingRawRuntimeDigestLatestLandedProgress
          ?? existingCognitionRuntimeDigestLatestLandedProgress
          ?? null
        )
  const preferredExistingPrimaryOpenLoop
    = existingDialoguePrimaryOpenLoopLooksThin
      ? (
          existingRawRuntimeDigestPrimaryOpenLoop
          ?? existingCognitionRuntimeDigestPrimaryOpenLoop
          ?? existingPrimaryOpenLoop
          ?? null
        )
      : (
          existingPrimaryOpenLoop
          ?? existingRawRuntimeDigestPrimaryOpenLoop
          ?? existingCognitionRuntimeDigestPrimaryOpenLoop
          ?? null
        )
  const preferredExistingNextClosureTarget
    = existingDialogueNextClosureTargetLooksThin
      ? (
          existingRawRuntimeDigestNextClosureTarget
          ?? existingCognitionRuntimeDigestNextClosureTarget
          ?? existingNextClosureTarget
          ?? null
        )
      : (
          existingNextClosureTarget
          ?? existingRawRuntimeDigestNextClosureTarget
          ?? existingCognitionRuntimeDigestNextClosureTarget
          ?? null
        )
  const existingSameHerSelfLine = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'sameHerSelfLine', 320)
  const existingSameHerDriftRisk = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'sameHerDriftRisk', 320)
  const existingCompanionBriefingLine = readExistingProjectStateField(existingProjectState as Record<string, unknown> | null | undefined, 'companionBriefingLine', 1600)
  const existingCompanionHeadlineLine = sanitizeGuidanceText((existingProjectState as { companionHeadlineLine?: unknown } | null)?.companionHeadlineLine, 320)
  const existingPreDialogueAwarenessLine = sanitizeGuidanceText((existingProjectState as { preDialogueAwarenessLine?: unknown } | null)?.preDialogueAwarenessLine, 320)
  const existingAwarenessLine = sanitizeGuidanceText((existingProjectState as { awarenessLine?: unknown } | null)?.awarenessLine, 320)
  const existingPreDialogueAwarenessSummary = sanitizeGuidanceText((existingProjectState as { preDialogueAwarenessSummary?: unknown } | null)?.preDialogueAwarenessSummary, 320)
  const preferredContinuityProjectAwarenessLine = chooseStrongerProjectAwarenessLine([
    sanitizeGuidanceText(projectStateContinuity?.preDialogueAwarenessLine, 320),
    projectStateGrounding.preDialogueAwarenessLine,
    projectStateGrounding.awarenessLine,
    projectStateGrounding.companionHeadlineLine,
  ])
  const strongerExplicitExistingProjectAwarenessLine = chooseStrongerProjectAwarenessLine([
    existingPreDialogueAwarenessLine,
    existingAwarenessLine,
    existingPreDialogueAwarenessSummary,
  ])
  const strongerExistingProjectAwarenessLine
    = strongerExplicitExistingProjectAwarenessLine
      ?? chooseStrongerProjectAwarenessLine([
        existingCompanionHeadlineLine,
        existingPreDialogueAwarenessLine,
        existingAwarenessLine,
        existingPreDialogueAwarenessSummary,
      ])
  const shouldPromoteExistingCompanionHeadlineAsPrimaryAwareness
    = Boolean(existingCompanionHeadlineLine)
      && !isCanonicalProjectReminderAwarenessLine(existingCompanionHeadlineLine)
      && (
        !strongerExistingProjectAwarenessLine
        || scoreProjectAwarenessLine(existingCompanionHeadlineLine) >= scoreProjectAwarenessLine(strongerExistingProjectAwarenessLine) + 1
        || isCanonicalProjectReminderAwarenessLine(strongerExistingProjectAwarenessLine)
      )
  const strongerExistingProjectAwarenessIsCanonicalReminder
    = isCanonicalProjectReminderAwarenessLine(strongerExistingProjectAwarenessLine)
  const existingAwarenessFieldsLookThinOrCanonical
    = [
      existingPreDialogueAwarenessLine,
      existingAwarenessLine,
      existingPreDialogueAwarenessSummary,
    ].some(line => looksThinOrCanonicalProjectAwarenessLine(line))
  const shouldPreserveExistingProjectAwarenessLine
    = shouldPromoteExistingCompanionHeadlineAsPrimaryAwareness
      || (
        Boolean(strongerExistingProjectAwarenessLine)
        && !strongerExistingProjectAwarenessIsCanonicalReminder
        && scoreProjectAwarenessLine(strongerExistingProjectAwarenessLine) >= scoreProjectAwarenessLine(preferredContinuityProjectAwarenessLine) + 2
      )
  const preservedExistingProjectAwarenessLine
    = shouldPromoteExistingCompanionHeadlineAsPrimaryAwareness
      ? existingCompanionHeadlineLine
      : strongerExistingProjectAwarenessLine
  const shouldForceExistingCompanionHeadlineAsPrimaryAwareness
    = Boolean(existingCompanionHeadlineLine)
      && !isCanonicalProjectReminderAwarenessLine(existingCompanionHeadlineLine)
      && existingAwarenessFieldsLookThinOrCanonical
      && scoreProjectAwarenessLine(existingCompanionHeadlineLine) >= scoreProjectAwarenessLine(
        strongerExistingProjectAwarenessLine ?? preferredContinuityProjectAwarenessLine,
      )
  const existingProjectStateWithoutNextClosureTarget
    = existingProjectState
      ? {
          ...existingProjectState,
          nextClosureTarget: undefined,
        }
      : null
  const resolvedNextClosureTarget
    = preferredExistingNextClosureTarget
      ?? existingNextClosureTarget
      ?? projectStateGrounding.nextClosureTarget
      ?? null
  const preferredExistingContinuityCue = choosePreferredContinuityCue([
    existingContinuityCue,
    existingRawRuntimeDigestContinuityCue,
    existingCognitionRuntimeDigestContinuityCue,
  ])
  const memoryDeliberationContinuityCue = deriveMemoryDeliberationContinuityCue({
    continuityCadence,
    preferredBlinkCadence: continuityEmbodimentPreferences.preferredBlinkCadence,
    preferredGazeMode: continuityEmbodimentPreferences.preferredGazeMode,
    relationshipLines: Array.isArray(deliberation.selectedRelationshipLines) ? deliberation.selectedRelationshipLines : [],
    stableCore: Array.isArray(deliberation.stableCore) ? deliberation.stableCore : [],
    candidateProcedureLines: Array.isArray(input.context.recollectionIntent?.recollectionAgenda?.candidateProcedureLines)
      ? input.context.recollectionIntent?.recollectionAgenda?.candidateProcedureLines
      : [],
    selectedRelationshipSummary,
    relationshipCarry: deliberationRelationshipCarry,
    selectedChainStance,
    selectedChainPosture,
    whyWithheld,
    followUpSummary: followUpAffordance?.summary ?? null,
    recollectionQueryHints: Array.isArray(input.context.recollectionIntent?.queryHints)
      ? input.context.recollectionIntent.queryHints
      : [],
    speechStyleNote: speech?.styleNote ?? null,
    emotionalClosureCue,
  })
  const resolvedContinuityCue = (
    preferredExistingContinuityCue
    && !looksLikeThinContinuityCue(preferredExistingContinuityCue)
  )
    ? preferredExistingContinuityCue
    : choosePreferredContinuityCue([
        preferredExistingContinuityCue,
        memoryDeliberationContinuityCue,
      ])
  const mapAnswerActToReplyMotive = (answerAct: AlicizationMindTurnGovernance['answerAct']) => {
    switch (answerAct) {
      case 'guide':
        return 'guide' as const
      case 'care':
        return 'care' as const
      case 'defer':
        return 'defer' as const
      case 'correct-stale-anchor':
      case 'ask-reground':
        return 'repair' as const
      default:
        return 'answer' as const
    }
  }
  const speakingIntention = mergeGuidanceLine([
    surface.dialogue.currentConsciousFrame?.speakingIntention ?? null,
    repairFirstProjectClosureAuthority
      ? `Keep the same living line emotionally continuous: ${lowerFirst(stripTrailingPunctuation(repairFirstProjectClosureAuthority))}.`
      : null,
    projectStateGrounding.primaryOpenLoop
      ? `Stay with the same digital life and do not let the answer lose the still-open closure work around ${projectStateGrounding.primaryOpenLoop}.`
      : null,
    projectStateGrounding.nextClosureTarget
      ? `Keep the next closure step pointed at ${projectStateGrounding.nextClosureTarget}.`
      : null,
    shouldStayInward
      ? 'Let remembered continuity shape the answer before any explicit memory mention.'
      : `Let remembered continuity guide the answer through ${resolvedSurfacePolicy}.`,
    `Memory latent controls: ${memoryControlSummary}.`,
  ])
  const consciousNeed = mergeGuidanceLine([
    surface.dialogue.currentConsciousFrame?.consciousNeed ?? null,
    repairFirstProjectClosureAuthority
      ? `Keep the emotional closure seam low-pressure: ${lowerFirst(stripTrailingPunctuation(repairFirstProjectClosureAuthority))}.`
      : null,
    projectStateGrounding.identity
      ? `This turn still belongs to ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.identity))}.`
      : null,
    projectStateGrounding.currentPhase
      ? `I am still working inside ${projectStateGrounding.currentPhase}.`
      : null,
    projectStateGrounding.latestProgress
      ? `What has already become real enough to build from is ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.latestProgress))}.`
      : null,
    selectedChainSummary ? `The recollection chain now shaping the answer is ${selectedChainSummary}.` : null,
    selectedBundleSummary ? `The recollection bundle now shaping the answer is ${selectedBundleSummary}.` : null,
    selectedPeriodSummary ? `The remembered period now shaping the answer is ${selectedPeriodSummary}.` : null,
    selectedEraSummary ? `The remembered era now shaping the answer is ${selectedEraSummary}.` : null,
    selectedProcedureSummary ? `The remembered procedure pressing forward is ${selectedProcedureSummary}.` : null,
    memoryControlSummary,
  ])
  const consciousTension = mergeGuidanceLine([
    surface.dialogue.currentConsciousFrame?.consciousTension ?? null,
    selectedRelationshipSummary ? `What is relationally live inside the recollection is ${selectedRelationshipSummary}.` : null,
    selectedChainStance ? `The remembered stance pulling on this answer is ${selectedChainStance}.` : null,
  ])
  const replyWhyNow = mergeGuidanceLine([
    surface.dialogue.replyDeliberation?.whyThisReplyNow ?? null,
    followUpAffordance?.whyNow ?? null,
    whyNow,
    projectStateGrounding.sameHerDriftRisk
      ? `Keep the answer from drifting into ${lowerFirst(stripTrailingPunctuation(projectStateGrounding.sameHerDriftRisk))}.`
      : null,
  ])
  const answerIntent = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.answerIntent ?? governance.answerIntent ?? null,
    buildMemoryAnswerAnchorTag(memoryControl),
    selectedChainPosture,
  ])
  const openingMove = mergeGuidanceLine([
    surface.dialogue.answerPlanner?.openingMove ?? governance.openingMove ?? null,
    buildMemoryOpeningStrategyTag(memoryControl),
  ], 220)
  const mindTurnFrame = (governance.mindTurnFrame ?? surface.cognition.mindTurnFrame ?? null) as AlicizationDigitalLifeRuntimeSurface['cognition']['mindTurnFrame']
  const nextMindTurnFrame: AlicizationDigitalLifeRuntimeSurface['cognition']['mindTurnFrame'] = mindTurnFrame
    ? {
        ...mindTurnFrame,
        narrative: mergeUniqueRules([
          ...(mindTurnFrame.narrative ?? []),
          'memory-deliberation',
          `memory-deliberation:surface:${resolvedSurfacePolicy}`,
        ], 12),
      }
    : mindTurnFrame
  const resolvedPreDialogueAwarenessLine
    = (shouldForceExistingCompanionHeadlineAsPrimaryAwareness || shouldPreserveExistingProjectAwarenessLine)
      ? preservedExistingProjectAwarenessLine
      : (
          shouldPreferRicherProjectAwarenessLineOverThinExisting({
            existingLine: existingPreDialogueAwarenessLine,
            candidateLine: preferredContinuityProjectAwarenessLine,
          })
            ? preferredContinuityProjectAwarenessLine
            : (existingPreDialogueAwarenessLine || preferredContinuityProjectAwarenessLine || null)
        )
  const resolvedAwarenessLine
    = (shouldForceExistingCompanionHeadlineAsPrimaryAwareness || shouldPreserveExistingProjectAwarenessLine)
      ? preservedExistingProjectAwarenessLine
      : (
          shouldPreferRicherProjectAwarenessLineOverThinExisting({
            existingLine: existingAwarenessLine,
            candidateLine: preferredContinuityProjectAwarenessLine,
          })
            ? preferredContinuityProjectAwarenessLine
            : (existingAwarenessLine || existingPreDialogueAwarenessLine || preferredContinuityProjectAwarenessLine || null)
        )
  const resolvedPreDialogueAwarenessSummary
    = (shouldForceExistingCompanionHeadlineAsPrimaryAwareness || shouldPreserveExistingProjectAwarenessLine)
      ? preservedExistingProjectAwarenessLine
      : (
          shouldPreferRicherProjectAwarenessLineOverThinExisting({
            existingLine: existingPreDialogueAwarenessSummary,
            candidateLine: preferredContinuityProjectAwarenessLine,
          })
            ? preferredContinuityProjectAwarenessLine
            : (existingPreDialogueAwarenessSummary || existingPreDialogueAwarenessLine || preferredContinuityProjectAwarenessLine || null)
        )
  const resolvedPreflightSummary
    = (
      looksLikeThinProjectPreflightSummary(existingPreflightSummary)
      || shouldPreferRicherProjectAwarenessLineOverThinExisting({
        existingLine: existingPreflightSummary,
        candidateLine: preferredContinuityProjectAwarenessLine,
      })
    )
      ? (canonicalProjectPreflightSummary || preferredContinuityProjectAwarenessLine || projectStateGrounding.preflightSummary || null)
      : (existingPreflightSummary || projectStateGrounding.preflightSummary || preferredContinuityProjectAwarenessLine || null)
  const nextMergedProjectState = {
    ...existingProjectStateWithoutNextClosureTarget,
    preflightSummary: resolvedPreflightSummary,
    preDialogueAwarenessLine: resolvedPreDialogueAwarenessLine,
    awarenessLine: resolvedAwarenessLine,
    preDialogueAwarenessSummary: resolvedPreDialogueAwarenessSummary,
    companionHeadlineLine:
      (shouldPromoteExistingCompanionHeadlineAsPrimaryAwareness || shouldForceExistingCompanionHeadlineAsPrimaryAwareness)
        ? existingCompanionHeadlineLine
        : (
            existingCompanionHeadlineLine && !isCanonicalProjectReminderAwarenessLine(existingCompanionHeadlineLine)
              ? existingCompanionHeadlineLine
              : null
          ),
    companionBriefingLine: existingCompanionBriefingLine ?? null,
    identity: (existingIdentity ?? projectStateGrounding.identity) || null,
    currentPhase: (existingCurrentPhase ?? projectStateGrounding.currentPhase) || null,
    latestProgress: projectStateGrounding.latestProgress || null,
    latestLandedProgress: (preferredExistingLatestLandedProgress ?? projectStateGrounding.latestLandedProgress) || null,
    primaryOpenLoop: (preferredExistingPrimaryOpenLoop ?? projectStateGrounding.primaryOpenLoop) || null,
    sameHerSelfLine: (existingSameHerSelfLine ?? projectStateGrounding.sameHerSelfLine) || null,
    sameHerDriftRisk: (existingSameHerDriftRisk ?? projectStateGrounding.sameHerDriftRisk) || null,
    emotionalClosureCue: emotionalClosureCue || null,
    emotionalClosureSummary: richerEmotionalClosureSummary || null,
    sameHerHoldDetail: richerSameHerHoldDetail || null,
    continuityCue: resolvedContinuityCue,
    continuityPreferredTiming:
      existingProjectState?.continuityPreferredTiming
      ?? followUpAffordance?.preferredTiming
      ?? null,
    continuityRestraint:
      existingProjectState?.continuityRestraint
      ?? continuityCadence
      ?? projectStateGrounding.continuityRestraint
      ?? null,
    continuityCadence:
      existingProjectState?.continuityCadence
      ?? continuityCadence
      ?? null,
    preferredBlinkCadence: existingProjectState?.preferredBlinkCadence ?? continuityEmbodimentPreferences.preferredBlinkCadence ?? null,
    preferredGazeMode: existingProjectState?.preferredGazeMode ?? continuityEmbodimentPreferences.preferredGazeMode ?? null,
    preferredPauseMode: existingProjectState?.preferredPauseMode ?? continuityEmbodimentPreferences.preferredPauseMode ?? null,
    preferredLipsyncMode: existingProjectState?.preferredLipsyncMode ?? continuityEmbodimentPreferences.preferredLipsyncMode ?? null,
    preferredVoiceMode: existingProjectState?.preferredVoiceMode ?? continuityEmbodimentPreferences.preferredVoiceMode ?? null,
    preferredPacingMode: existingProjectState?.preferredPacingMode ?? continuityEmbodimentPreferences.preferredPacingMode ?? null,
    nextClosureTarget: resolvedNextClosureTarget,
  }
  const nextCurrentConsciousFrame: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['currentConsciousFrame']> = {
    subject: surface.dialogue.currentConsciousFrame?.subject ?? governance.answerSubject ?? 'general',
    centerOfGravity: surface.dialogue.currentConsciousFrame?.centerOfGravity ?? mapAnswerActToReplyMotive(governance.answerAct),
    truthDiscipline: surface.dialogue.currentConsciousFrame?.truthDiscipline === 'dialogue-first' ? 'dialogue-first' : 'memory-labeled',
    consciousNeed: consciousNeed || surface.dialogue.currentConsciousFrame?.consciousNeed || memoryControlSummary || whyNow || '',
    consciousTension: consciousTension || surface.dialogue.currentConsciousFrame?.consciousTension || whyNow || '',
    speakingIntention: mergeGuidanceLine([
      speakingIntention || surface.dialogue.currentConsciousFrame?.speakingIntention || `Memory latent controls: ${memoryControlSummary}.` || whyNow || '',
      selfAuthoritySpeakingCue,
    ]) ?? '',
    focusAnchor: surface.dialogue.currentConsciousFrame?.focusAnchor ?? governance.focusAnchor ?? null,
    withheldImpulse: surface.dialogue.currentConsciousFrame?.withheldImpulse ?? (shouldStayInward
      ? 'Do not flatten remembered continuity into a narrated memory dump.'
      : 'Do not let recollection outrun the live payoff.'),
    shouldWithholdSpecificity: surface.dialogue.currentConsciousFrame?.shouldWithholdSpecificity ?? (memoryControl.unsafeDetails.length > 0 || memoryControl.conflictBurden !== 'none'),
    shouldSelfRevise: surface.dialogue.currentConsciousFrame?.shouldSelfRevise ?? shouldStayInward,
    confidence: Math.max(surface.dialogue.currentConsciousFrame?.confidence ?? 0, deliberation.confidence),
    reasonTags: mergeUniqueRules([
      ...(surface.dialogue.currentConsciousFrame?.reasonTags ?? []),
      'memory-deliberation',
      continuityCadence ? `memory-deliberation-cadence:${continuityCadence}` : null,
      selfContinuityAuthority?.closenessPosture
        ? `self-authority-closeness:${sanitizeGuidanceText(selfContinuityAuthority.closenessPosture, 64).toLowerCase()}`
        : null,
      projectStateGrounding.currentPhase ? `project-phase:${projectStateGrounding.currentPhase}` : null,
      projectStateGrounding.primaryOpenLoop ? `project-open-loop:${projectStateGrounding.primaryOpenLoop}` : null,
      projectStateGrounding.nextClosureTarget ? `project-next-closure:${projectStateGrounding.nextClosureTarget}` : null,
    ], 12),
    projectState: nextMergedProjectState,
    updatedAt: input.now,
  }
  const nextReplyDeliberation: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['replyDeliberation']> = {
    selectedMotive: surface.dialogue.replyDeliberation?.selectedMotive ?? mapAnswerActToReplyMotive(governance.answerAct),
    speakingFrom: deriveMemoryDeliberationSurfaceMode({
      shouldStayInward,
      surfacePolicy: resolvedSurfacePolicy,
      answerSubject: governance.answerSubject,
    }),
    memoryMode: deriveMemoryDeliberationMemoryMode({
      existingMode: surface.dialogue.replyDeliberation?.memoryMode ?? null,
      shouldStayInward,
      surfacePolicy: resolvedSurfacePolicy,
    }),
    openingBeat: openingMove || surface.dialogue.replyDeliberation?.openingBeat || whyNow || '',
    whyThisReplyNow: replyWhyNow || surface.dialogue.replyDeliberation?.whyThisReplyNow || whyNow || '',
    whyNotOtherCandidates: surface.dialogue.replyDeliberation?.whyNotOtherCandidates ?? [],
    withheldImpulses: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.withheldImpulses ?? []),
      followUpAffordance?.intrusionRisk === 'high'
        ? 'Do not force the remembered follow-up forward before the host has room for it.'
        : null,
      shouldStayInward
        ? 'Do not narrate the active recollection unless the live payoff truly needs it.'
        : 'Do not let recollection replace the live answer.',
      memoryControl.conflictBurden !== 'none'
        ? 'Do not overstate remembered detail while this recollection still carries conflict pressure.'
        : null,
      memoryControl.dominantProvenance === 'dreamt'
        ? 'Do not present dream residue as lived remembered fact.'
        : null,
      memoryControl.dominantProvenance === 'inferred'
        ? 'Do not present inferred continuity as settled remembered fact.'
        : null,
    ], 8),
    candidateMotives: surface.dialogue.replyDeliberation?.candidateMotives ?? [],
    shouldSpeak: surface.dialogue.replyDeliberation?.shouldSpeak ?? true,
    mustInclude: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.mustInclude ?? []),
      `memory_latent_controls=${memoryControlSummary}`,
      continuityCadence ? `memory_continuity_cadence=${continuityCadence}` : null,
      followUpAffordance?.summary ? `memory_follow_up_affordance=${followUpAffordance.summary}` : null,
    ], 8),
    mustAvoid: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.mustAvoid ?? []),
      buildMemoryLatentBoundaryTag(memoryControl),
      memoryControl.dominantProvenance === 'dreamt' ? 'Do not present dream residue as lived remembered fact.' : null,
      memoryControl.dominantProvenance === 'inferred' ? 'Do not present inferred continuity as settled remembered fact.' : null,
      ...memoryControl.unsafeDetails.map(item => `Do not state this remembered detail as settled fact: ${item}`),
    ], 8),
    confidence: Math.max(surface.dialogue.replyDeliberation?.confidence ?? 0, deliberation.confidence),
    narrative: mergeUniqueRules([
      ...(surface.dialogue.replyDeliberation?.narrative ?? []),
      'memory-deliberation',
      `memory-deliberation:surface:${resolvedSurfacePolicy}`,
      continuityCadence ? `memory-deliberation-cadence:${continuityCadence}` : null,
      followUpAffordance?.preferredTiming ? `memory-deliberation:followup:${followUpAffordance.preferredTiming}` : null,
    ], 10),
    updatedAt: input.now,
  }
  const nextAnswerPlanner: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['answerPlanner']> = {
    act: surface.dialogue.answerPlanner?.act ?? governance.answerAct ?? 'answer',
    evidenceMode: surface.dialogue.answerPlanner?.evidenceMode ?? governance.evidenceMode ?? 'continuity-carry',
    confidence: Math.max(surface.dialogue.answerPlanner?.confidence ?? 0, deliberation.confidence),
    governingFocus: mergeGuidanceLine([
      surface.dialogue.answerPlanner?.governingFocus ?? null,
      selectedChainSummary,
      selectedBundleSummary,
      selectedEraSummary,
      selectedPeriodSummary,
      selectedProcedureSummary,
      selectedRelationshipSummary,
      memoryControlSummary,
    ], 220) || memoryControlSummary || whyNow || '',
    openingMove: openingMove || surface.dialogue.answerPlanner?.openingMove || whyNow || '',
    answerIntent: answerIntent || surface.dialogue.answerPlanner?.answerIntent || whyNow || '',
    relationshipPosture: surface.dialogue.answerPlanner?.relationshipPosture ?? governance.relationshipPosture ?? 'warm',
    shouldAskForGrounding: surface.dialogue.answerPlanner?.shouldAskForGrounding ?? governance.shouldAskForGrounding,
    shouldAcknowledgeRepair: surface.dialogue.answerPlanner?.shouldAcknowledgeRepair ?? governance.shouldAcknowledgeRepair,
    selectedConcernEntryId: surface.dialogue.answerPlanner?.selectedConcernEntryId ?? null,
    selectedRepairId: surface.dialogue.answerPlanner?.selectedRepairId ?? null,
    selectedCommitmentId: surface.dialogue.answerPlanner?.selectedCommitmentId ?? null,
    selectedInquiryPlanId: surface.dialogue.answerPlanner?.selectedInquiryPlanId ?? null,
    selectedRuntimeThreadId: surface.dialogue.answerPlanner?.selectedRuntimeThreadId ?? null,
    selectedProjectId: surface.dialogue.answerPlanner?.selectedProjectId ?? null,
    selectedReflectionId: surface.dialogue.answerPlanner?.selectedReflectionId ?? null,
    executivePhase: surface.dialogue.answerPlanner?.executivePhase ?? null,
    selectedTruthFrame: surface.dialogue.answerPlanner?.selectedTruthFrame ?? null,
    mustDo: mergeUniqueRules([
      ...(surface.dialogue.answerPlanner?.mustDo ?? []),
      `memory_latent_controls=${memoryControlSummary}`,
      continuityCadence ? `memory_continuity_cadence=${continuityCadence}` : null,
      memoryControl.dominantProvenance === 'dreamt' ? 'If the recollection becomes explicit, frame it as dream residue rather than lived fact.' : null,
      memoryControl.dominantProvenance === 'inferred' ? 'If the recollection becomes explicit, frame it as inference or likely continuity rather than settled memory.' : null,
      memoryControl.dominantProvenance === 'reconstructed' ? 'If the recollection becomes explicit, keep it approximate and centered on the stable core.' : null,
    ], 10),
    mustNotDo: mergeUniqueRules([
      ...(surface.dialogue.answerPlanner?.mustNotDo ?? []),
      buildMemoryLatentBoundaryTag(memoryControl),
      ...memoryControl.unsafeDetails.map(item => `Do not over-assert this remembered detail: ${item}`),
    ], 10),
    narrative: mergeUniqueRules([
      ...(surface.dialogue.answerPlanner?.narrative ?? []),
      'memory-deliberation',
      `memory-deliberation:surface:${resolvedSurfacePolicy}`,
    ], 10),
    updatedAt: input.now,
  }
  const nextDialogueActKernel: NonNullable<AlicizationDigitalLifeRuntimeSurface['dialogue']['dialogueActKernel']> = {
    subject: surface.dialogue.dialogueActKernel?.subject ?? governance.answerSubject ?? 'general',
    hostGoal: surface.dialogue.dialogueActKernel?.hostGoal ?? (
      governance.answerAct === 'care'
        ? 'rest'
        : governance.answerSubject === 'relationship' || governance.answerSubject === 'alicization-self'
          ? 'chat'
          : 'resolve-problem'
    ),
    relationNeed: surface.dialogue.dialogueActKernel?.relationNeed ?? (
      resolvedSurfacePolicy === 'relationship-continuity'
        ? 'companionship'
        : governance.answerAct === 'care'
          ? 'care'
          : governance.answerAct === 'guide'
            ? 'guidance'
            : 'unclear'
    ),
    activeProject: surface.dialogue.dialogueActKernel?.activeProject ?? selectedProcedureSummary ?? selectedPeriodSummary ?? null,
    truthMode: surface.dialogue.dialogueActKernel?.truthMode ?? (
      shouldStayInward || resolvedSurfacePolicy === 'relationship-continuity'
        ? 'memory-only'
        : governance.evidenceMode ?? 'continuity-carry'
    ),
    speechAct: surface.dialogue.dialogueActKernel?.speechAct ?? governance.answerAct ?? nextAnswerPlanner.act,
    turnMode: surface.dialogue.dialogueActKernel?.turnMode ?? governance.turnMode,
    screenReferenceMode: surface.dialogue.dialogueActKernel?.screenReferenceMode ?? governance.screenReferenceMode ?? 'avoid',
    speakingFrom: nextReplyDeliberation.speakingFrom,
    selectedEvidence: surface.dialogue.dialogueActKernel?.selectedEvidence ?? [{
      kind: 'memory',
      source: 'reply-deliberation',
      summary: memoryControl.stableCore[0]
        || selectedEraSummary
        || selectedPeriodSummary
        || selectedChainSummary
        || selectedBundleSummary
        || selectedProcedureSummary
        || selectedRelationshipSummary
        || memoryControlSummary
        || whyNow
        || '',
      confidence: deliberation.confidence,
    }],
    openingClaim: surface.dialogue.dialogueActKernel?.openingClaim ?? selectedEraSummary ?? selectedPeriodSummary ?? selectedChainSummary ?? selectedBundleSummary ?? selectedProcedureSummary ?? selectedRelationshipSummary ?? whyNow ?? '',
    openingMove: openingMove || surface.dialogue.dialogueActKernel?.openingMove || whyNow || '',
    whyNow: replyWhyNow || surface.dialogue.dialogueActKernel?.whyNow || whyNow || '',
    mustSay: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.mustSay ?? []),
      answerIntent,
      `memory_latent_controls=${memoryControlSummary}`,
    ], 8),
    mustAvoid: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.mustAvoid ?? []),
      buildMemoryLatentBoundaryTag(memoryControl),
    ], 8),
    sourceTrace: mergeUniqueRules([
      ...(surface.dialogue.dialogueActKernel?.sourceTrace ?? []),
      'memory-deliberation',
      `memory-deliberation:surface:${resolvedSurfacePolicy}`,
    ], 10),
    confidence: Math.max(surface.dialogue.dialogueActKernel?.confidence ?? 0, deliberation.confidence),
    updatedAt: input.now,
  }
  const nextRuntimeDigestProjectState = {
    ...surface.raw?.runtimeDigest?.projectState,
    ...nextMergedProjectState,
    nextClosureTarget: resolvedNextClosureTarget,
  }
  const nextCognitionRuntimeDigestProjectState = {
    ...surface.cognition.runtimeDigest?.projectState,
    ...nextMergedProjectState,
    nextClosureTarget: resolvedNextClosureTarget,
  }

  return attachMemoryDeliberationProjectStateDiagnostics({
    ...surface,
    memory: {
      ...surface.memory,
      hostPersonModel: input.context.hostPersonModel ?? surface.memory.hostPersonModel ?? null,
      personalityContinuityState: input.context.personStateProjection?.personalityContinuityState
        ?? surface.memory.personalityContinuityState
        ?? null,
      personStateProjection: continuityAwarePersonStateProjection,
      recollectionPlan: input.context.recollectionPlan ?? surface.memory.recollectionPlan ?? null,
      recollectionSpeechPlan: input.context.recollectionSpeechPlan ?? surface.memory.recollectionSpeechPlan ?? null,
      memoryDeliberation: deliberation,
      knowledgeEvidence: input.context.knowledgeEvidence ?? surface.memory.knowledgeEvidence ?? null,
      selfEvolution: input.context.selfEvolution ?? surface.memory.selfEvolution ?? null,
      learningExecutionState: input.context.learningExecutionState ?? surface.memory.learningExecutionState ?? null,
      memoryStageReplay: input.context.memoryStageReplay ?? surface.memory.memoryStageReplay ?? null,
      memoryResolutionLedger: input.context.memoryResolutionLedger ?? surface.memory.memoryResolutionLedger ?? null,
      affectiveResidue: input.context.affectiveResidue ?? surface.memory.affectiveResidue ?? surface.memory.derivedMindStateBundle?.affectiveResidue ?? null,
      personMemoryCapsule: surface.memory.personMemoryCapsule ?? null,
      derivedMindStateBundle: buildDerivedMindStateBundle({
        source: 'main-runtime',
        producedAt: input.now,
        hostPersonModel: input.context.hostPersonModel ?? surface.memory.hostPersonModel ?? null,
        personStateProjection: continuityAwarePersonStateProjection as unknown as Record<string, unknown> | null,
        knowledgeEvidence: input.context.knowledgeEvidence ?? surface.memory.knowledgeEvidence ?? null,
        selfEvolution: input.context.selfEvolution ?? surface.memory.selfEvolution ?? null,
        affectiveResidue: input.context.affectiveResidue ?? buildAlicizationAffectiveResidueMemory({
          now: input.now,
          recentRelationshipOutcomes: input.context.recentRelationshipOutcomes ?? [],
          recentMemoryReflections: input.context.recentMemoryReflections ?? [],
          personStateEvolutionSummary: null,
          personalityContinuityState: input.context.personStateProjection?.personalityContinuityState ?? surface.memory.personalityContinuityState ?? null,
          hostPersonModel: input.context.hostPersonModel ?? surface.memory.hostPersonModel ?? null,
          relationshipDynamics: input.context.relationshipDynamics ?? null,
        }),
        learningExecutionState: input.context.learningExecutionState ?? surface.memory.learningExecutionState ?? null,
        recallLatencyPolicy: input.context.recallLatencyPolicy ?? surface.memory.derivedMindStateBundle?.recallLatencyPolicy ?? null,
        recollectionIntent: input.context.recollectionIntent as unknown as Record<string, unknown> | null,
        recollectionPlan: input.context.recollectionPlan ?? surface.memory.recollectionPlan ?? null,
        recollectionSpeechPlan: input.context.recollectionSpeechPlan ?? surface.memory.recollectionSpeechPlan ?? null,
        memoryDeliberation: deliberation as unknown as Record<string, unknown> | null,
      }),
    },
    cognition: {
      ...surface.cognition,
      mindTurnFrame: nextMindTurnFrame,
      runtimeDigest: surface.cognition.runtimeDigest
        ? {
            ...surface.cognition.runtimeDigest,
            projectState: nextCognitionRuntimeDigestProjectState,
          }
        : surface.cognition.runtimeDigest,
    },
    dialogue: {
      ...surface.dialogue,
      currentConsciousFrame: nextCurrentConsciousFrame,
      dialogueActKernel: nextDialogueActKernel,
      replyDeliberation: nextReplyDeliberation,
      answerPlanner: nextAnswerPlanner,
    },
    raw: {
      ...surface.raw,
      runtime: surface.raw?.runtime
        ? {
            ...surface.raw.runtime,
          }
        : surface.raw?.runtime,
      runtimeDigest: surface.raw?.runtimeDigest
        ? {
            ...surface.raw.runtimeDigest,
            projectState: nextRuntimeDigestProjectState,
          }
        : surface.raw?.runtimeDigest,
    },
  }, {
    dialogueExistingNextClosureTarget: existingNextClosureTarget,
    rawRuntimeDigestNextClosureTarget: existingRawRuntimeDigestNextClosureTarget,
    cognitionRuntimeDigestNextClosureTarget: existingCognitionRuntimeDigestNextClosureTarget,
    preferredExistingNextClosureTarget,
    resolvedNextClosureTarget,
    groundingPreDialogueAwarenessLine: sanitizeGuidanceText(projectStateGrounding.preDialogueAwarenessLine, 320) || null,
    groundingAwarenessLine: sanitizeGuidanceText(projectStateGrounding.awarenessLine, 320) || null,
    groundingCompanionHeadlineLine: sanitizeGuidanceText(projectStateGrounding.companionHeadlineLine, 320) || null,
    existingCompanionHeadlineLine: sanitizeGuidanceText(existingCompanionHeadlineLine, 320) || null,
    preservedExistingProjectAwarenessLine: sanitizeGuidanceText(preservedExistingProjectAwarenessLine, 320) || null,
    preferredContinuityProjectAwarenessLine: sanitizeGuidanceText(preferredContinuityProjectAwarenessLine, 320) || null,
    builtDialogueProjectStateLatestLandedProgress: sanitizeGuidanceText(nextMergedProjectState.latestLandedProgress, 1600) || null,
    builtDialogueProjectStatePrimaryOpenLoop: sanitizeGuidanceText(nextMergedProjectState.primaryOpenLoop, 1600) || null,
    builtDialogueProjectStateNextClosureTarget: sanitizeGuidanceText(nextMergedProjectState.nextClosureTarget, 1600) || null,
    builtDialogueProjectStatePreDialogueAwarenessLine: sanitizeGuidanceText(nextMergedProjectState.preDialogueAwarenessLine, 320) || null,
    builtDialogueProjectStateAwarenessLine: sanitizeGuidanceText(nextMergedProjectState.awarenessLine, 320) || null,
    builtDialogueProjectStateCompanionHeadlineLine: sanitizeGuidanceText(nextMergedProjectState.companionHeadlineLine, 320) || null,
    effectiveDialogueNextClosureTarget: nextCurrentConsciousFrame.projectState?.nextClosureTarget ?? null,
  })
}
