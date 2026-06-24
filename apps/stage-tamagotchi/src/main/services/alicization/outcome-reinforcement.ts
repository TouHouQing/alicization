import type { AlicizationExecutionRuntimeMemoryClosureExecution } from '@proj-alicization/stage-shared'

import type {
  AlicizationEmotionalTransitionLedgerSnapshot,
  AlicizationEpisodicEventInput,
  AlicizationMemoryFactInput,
  AlicizationMemoryReflectionInput,
  AlicizationPersonaReinforcementEventInput,
  AlicizationRelationshipOutcomeInput,
} from '../../../shared/eventa'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationEmbodimentContinuityLedger } from './embodiment-continuity-ledger'
import type { AlicizationRecentProactiveOutcome } from './proactive-feedback'

import { computeEpisodicEventSalience, sanitizeHumanlikeMemoryText, summarizeRelationshipShift } from './humanlike-memory'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'
import { synthesizeReflectionFromRelationshipOutcome } from './reflection-synthesizer'

function clampDelta(value: number, maxAbs = 0.18) {
  if (!Number.isFinite(value))
    return 0
  return Number(Math.max(-maxAbs, Math.min(maxAbs, value)).toFixed(2))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function trimFactObject(raw: string) {
  return sanitizeText(raw, 180)
}

function normalizeClosureTagValue(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

function looksLikeThinReplyProjectHoldDetail(raw: unknown) {
  const normalized = sanitizeText(raw, 320).toLowerCase()
  if (!normalized)
    return true

  return /keep this project-state answer on the same living line before widening outward|keep the line gentle for now|same-her hold: keep this project-state answer on the same living line/u.test(normalized)
}

function preferReplyRuntimeSameHerHoldDetail(input: {
  raw: unknown
  normalized: unknown
}) {
  const raw = sanitizeText(input.raw, 220)
  const normalized = sanitizeText(input.normalized, 220)

  if (raw && !looksLikeThinReplyProjectHoldDetail(raw))
    return raw

  return normalized || raw
}

function compactReplyProjectIdentityForMemoryFact(raw: unknown) {
  const identity = sanitizeText(raw, 220)
  if (!identity)
    return ''

  if (/alicization is a local-first digital life project/iu.test(identity))
    return 'Alicization is a local-first digital life project.'

  return identity
}

function compactReplyProjectPhaseForMemoryFact(raw: unknown) {
  const phase = sanitizeText(raw, 160)
  if (!phase)
    return ''

  return phase.split(/\.\s+|[。！？]/u)[0]?.trim() ?? phase
}

function readReplyRuntimeEmbodiment(surface: AlicizationDigitalLifeRuntimeSurface | null) {
  const residentPerformance = surface?.raw?.residentPerformance ?? null
  const openingEmbodimentAudit = (surface?.raw?.runtimeDigest as {
    visibleReplyRealization?: {
      openingEmbodimentAudit?: {
        firstBeatPosture?: unknown
        facialCue?: unknown
        actionCue?: unknown
        derivedFrom?: unknown
      } | null
    } | null
  } | null | undefined)?.visibleReplyRealization?.openingEmbodimentAudit
  ?? null
  return {
    currentBodyState: sanitizeText(surface?.perception?.currentBodyState, 64),
    continuityMode: sanitizeText(surface?.perception?.continuityMode, 64),
    currentInwardPreoccupation: sanitizeText(surface?.perception?.currentInwardPreoccupation, 180),
    dominantResidueKind: sanitizeText(surface?.memory?.affectiveResidue?.dominantResidueKind, 64),
    relationshipCadenceSummary: sanitizeText(surface?.memory?.affectiveResidue?.relationshipCadence?.summary, 180),
    manifestationCadenceSummary: sanitizeText(surface?.memory?.personStateProjection?.manifestationCadenceSummary, 180),
    speakingIntention: sanitizeText(surface?.dialogue?.currentConsciousFrame?.speakingIntention, 180),
    residentFacialCue: sanitizeText(
      residentPerformance?.performance?.facialCue ?? openingEmbodimentAudit?.facialCue,
      64,
    ),
    residentActionCue: sanitizeText(
      residentPerformance?.performance?.actionCue ?? openingEmbodimentAudit?.actionCue,
      64,
    ),
    residentMode: sanitizeText(
      residentPerformance?.performance?.residentMode
      ?? residentPerformance?.performance?.face?.residentMode
      ?? residentPerformance?.performance?.action?.residentMode
      ?? openingEmbodimentAudit?.firstBeatPosture,
      64,
    ),
    residentEmbodimentReason: sanitizeText(
      residentPerformance?.signature ?? openingEmbodimentAudit?.derivedFrom,
      180,
    ),
  }
}

function readReplyRuntimeProjectAwareness(surface: AlicizationDigitalLifeRuntimeSurface | null) {
  const runtimeProjectState = (surface?.dialogue?.currentConsciousFrame as {
    projectState?: {
      currentPhase?: unknown
      preDialogueAwarenessLine?: unknown
      primaryOpenLoop?: unknown
      nextClosureTarget?: unknown
      sameHerSelfLine?: unknown
      sameHerDriftRisk?: unknown
      proactiveSameHerGap?: unknown
      emotionalClosureCue?: unknown
      sameHerHoldDetail?: unknown
      continuityRestraint?: unknown
      preferredBlinkCadence?: unknown
      preferredGazeMode?: unknown
      preferredPauseMode?: unknown
      preferredLipsyncMode?: unknown
      preferredVoiceMode?: unknown
      preferredPacingMode?: unknown
    } | null
  } | null | undefined)?.projectState
  ?? (surface?.dialogue as {
    runtimeDigest?: {
      projectState?: {
        currentPhase?: unknown
        preDialogueAwarenessLine?: unknown
        primaryOpenLoop?: unknown
        nextClosureTarget?: unknown
        sameHerSelfLine?: unknown
        sameHerDriftRisk?: unknown
        proactiveSameHerGap?: unknown
        emotionalClosureCue?: unknown
        sameHerHoldDetail?: unknown
        continuityRestraint?: unknown
        preferredBlinkCadence?: unknown
        preferredGazeMode?: unknown
        preferredPauseMode?: unknown
        preferredLipsyncMode?: unknown
        preferredVoiceMode?: unknown
        preferredPacingMode?: unknown
      } | null
    } | null
  } | null | undefined)?.runtimeDigest?.projectState
  ?? (surface?.raw as {
    projectState?: {
      currentPhase?: unknown
      preDialogueAwarenessLine?: unknown
      primaryOpenLoop?: unknown
      nextClosureTarget?: unknown
      sameHerSelfLine?: unknown
      sameHerDriftRisk?: unknown
      proactiveSameHerGap?: unknown
      emotionalClosureCue?: unknown
      sameHerHoldDetail?: unknown
      continuityRestraint?: unknown
      preferredBlinkCadence?: unknown
      preferredGazeMode?: unknown
      preferredPauseMode?: unknown
      preferredLipsyncMode?: unknown
      preferredVoiceMode?: unknown
      preferredPacingMode?: unknown
    } | null
    runtimeDigest?: {
      projectState?: {
        currentPhase?: unknown
        preDialogueAwarenessLine?: unknown
        primaryOpenLoop?: unknown
        nextClosureTarget?: unknown
        sameHerSelfLine?: unknown
        sameHerDriftRisk?: unknown
        proactiveSameHerGap?: unknown
        emotionalClosureCue?: unknown
        sameHerHoldDetail?: unknown
        continuityRestraint?: unknown
        preferredBlinkCadence?: unknown
        preferredGazeMode?: unknown
        preferredPauseMode?: unknown
        preferredLipsyncMode?: unknown
        preferredVoiceMode?: unknown
        preferredPacingMode?: unknown
      } | null
    } | null
  } | null | undefined)?.runtimeDigest?.projectState
  ?? (surface?.raw as {
    projectState?: {
      currentPhase?: unknown
      preDialogueAwarenessLine?: unknown
      primaryOpenLoop?: unknown
      nextClosureTarget?: unknown
      sameHerSelfLine?: unknown
      sameHerDriftRisk?: unknown
      proactiveSameHerGap?: unknown
      emotionalClosureCue?: unknown
      sameHerHoldDetail?: unknown
      continuityRestraint?: unknown
      preferredBlinkCadence?: unknown
      preferredGazeMode?: unknown
      preferredPauseMode?: unknown
      preferredLipsyncMode?: unknown
      preferredVoiceMode?: unknown
      preferredPacingMode?: unknown
    } | null
  } | null | undefined)?.projectState
  ?? null
  const projectionAuthority = surface?.memory?.personStateProjection?.selfContinuityAuthority
    ?? surface?.dialogue?.personStateProjection?.selfContinuityAuthority
    ?? (surface?.raw as {
      personStateProjection?: {
        selfContinuityAuthority?: {
          selfLine?: unknown
          relationshipLine?: unknown
          inwardLine?: unknown
        } | null
      } | null
    } | null | undefined)?.personStateProjection?.selfContinuityAuthority
    ?? null
  const memoryProjection = surface?.memory?.personStateProjection
    ?? surface?.dialogue?.personStateProjection
    ?? (surface?.raw as {
      personStateProjection?: {
        openingGuidance?: unknown
      } | null
    } | null | undefined)?.personStateProjection
    ?? null

  const rawProjectAwareness = {
    identity: '',
    currentPhase: sanitizeText(runtimeProjectState?.currentPhase, 160),
    preDialogueAwarenessLine: sanitizeText(runtimeProjectState?.preDialogueAwarenessLine, 320),
    primaryOpenLoop: sanitizeText(runtimeProjectState?.primaryOpenLoop, 220),
    nextClosureTarget: sanitizeText(runtimeProjectState?.nextClosureTarget, 220),
    sameHerSelfLine: sanitizeText(runtimeProjectState?.sameHerSelfLine, 220),
    sameHerDriftRisk: sanitizeText(runtimeProjectState?.sameHerDriftRisk, 220),
    proactiveSameHerGap: sanitizeText(runtimeProjectState?.proactiveSameHerGap, 220),
    emotionalClosureCue: sanitizeText(runtimeProjectState?.emotionalClosureCue, 220),
    sameHerHoldDetail: sanitizeText(runtimeProjectState?.sameHerHoldDetail, 220),
    continuityRestraint: sanitizeText(runtimeProjectState?.continuityRestraint, 96),
    preferredBlinkCadence: sanitizeText(runtimeProjectState?.preferredBlinkCadence, 96),
    preferredGazeMode: sanitizeText(runtimeProjectState?.preferredGazeMode, 96),
    preferredPauseMode: sanitizeText(runtimeProjectState?.preferredPauseMode, 96),
    preferredLipsyncMode: sanitizeText(runtimeProjectState?.preferredLipsyncMode, 96),
    preferredVoiceMode: sanitizeText(runtimeProjectState?.preferredVoiceMode, 96),
    preferredPacingMode: sanitizeText(runtimeProjectState?.preferredPacingMode, 96),
    explicitPreferredPauseMode: sanitizeText(runtimeProjectState?.preferredPauseMode, 96),
    explicitPreferredLipsyncMode: sanitizeText(runtimeProjectState?.preferredLipsyncMode, 96),
    explicitPreferredVoiceMode: sanitizeText(runtimeProjectState?.preferredVoiceMode, 96),
    explicitPreferredPacingMode: sanitizeText(runtimeProjectState?.preferredPacingMode, 96),
    selfLine: sanitizeText(projectionAuthority?.selfLine, 220),
    relationshipLine: sanitizeText(projectionAuthority?.relationshipLine, 220),
    inwardLine: sanitizeText(projectionAuthority?.inwardLine, 220),
    openingGuidance: sanitizeText(memoryProjection?.openingGuidance, 220),
  }

  const carriesExplicitProjectState = Boolean(
    rawProjectAwareness.currentPhase
    || rawProjectAwareness.preDialogueAwarenessLine
    || rawProjectAwareness.primaryOpenLoop
    || rawProjectAwareness.nextClosureTarget
    || rawProjectAwareness.sameHerSelfLine
    || rawProjectAwareness.sameHerDriftRisk
    || rawProjectAwareness.proactiveSameHerGap
    || rawProjectAwareness.emotionalClosureCue
    || rawProjectAwareness.sameHerHoldDetail,
  )

  if (!carriesExplicitProjectState)
    return rawProjectAwareness

  const brief = resolveAlicizationProjectStateBrief()
  const normalizedProjectState = resolveAlicizationProjectStateSnapshot({
    runtimeProjectState: {
      currentPhase: rawProjectAwareness.currentPhase || null,
      preDialogueAwarenessLine: rawProjectAwareness.preDialogueAwarenessLine || null,
      primaryOpenLoop: rawProjectAwareness.primaryOpenLoop || null,
      proactiveSameHerGap: rawProjectAwareness.proactiveSameHerGap || null,
      nextClosureTarget: rawProjectAwareness.nextClosureTarget || null,
      sameHerSelfLine: rawProjectAwareness.sameHerSelfLine || null,
      sameHerDriftRisk: rawProjectAwareness.sameHerDriftRisk || null,
      emotionalClosureCue: rawProjectAwareness.emotionalClosureCue || null,
      sameHerHoldDetail: rawProjectAwareness.sameHerHoldDetail || null,
      continuityRestraint: rawProjectAwareness.continuityRestraint || null,
      preferredBlinkCadence: rawProjectAwareness.preferredBlinkCadence || null,
      preferredGazeMode: rawProjectAwareness.preferredGazeMode || null,
      preferredPauseMode: rawProjectAwareness.preferredPauseMode || null,
      preferredLipsyncMode: rawProjectAwareness.preferredLipsyncMode || null,
      preferredVoiceMode: rawProjectAwareness.preferredVoiceMode || null,
      preferredPacingMode: rawProjectAwareness.preferredPacingMode || null,
    },
    fallbackProjectState: {
      identity: brief.identity,
      currentPhase: brief.currentPhase,
      preflightSummary: brief.preflightSummary ?? null,
      preDialogueAwarenessLine: brief.preDialogueAwarenessLine ?? null,
      primaryOpenLoop: brief.primaryOpenLoop,
      proactiveSameHerGap: brief.proactiveSameHerGap,
      nextClosureTarget: brief.nextClosureTarget,
      sameHerSelfLine: brief.sameHerSelfLine,
      sameHerDriftRisk: brief.sameHerDriftRisk,
      emotionalClosureCue: brief.emotionalClosureCue ?? null,
      sameHerHoldDetail: brief.sameHerHoldDetail ?? null,
      continuityRestraint: brief.continuityRestraint ?? null,
      continuityCue: brief.continuityCue ?? null,
      preferredBlinkCadence: brief.preferredBlinkCadence ?? null,
      preferredGazeMode: brief.preferredGazeMode ?? null,
      preferredPauseMode: brief.preferredPauseMode ?? null,
      preferredLipsyncMode: brief.preferredLipsyncMode ?? null,
      preferredVoiceMode: brief.preferredVoiceMode ?? null,
      preferredPacingMode: brief.preferredPacingMode ?? null,
    },
  })

  return {
    ...rawProjectAwareness,
    identity: sanitizeText(normalizedProjectState.identity, 220) || brief.identity,
    currentPhase: sanitizeText(normalizedProjectState.currentPhase, 160) || rawProjectAwareness.currentPhase,
    preDialogueAwarenessLine: sanitizeText(normalizedProjectState.preDialogueAwarenessLine, 320) || rawProjectAwareness.preDialogueAwarenessLine,
    primaryOpenLoop: sanitizeText(normalizedProjectState.primaryOpenLoop, 220) || rawProjectAwareness.primaryOpenLoop,
    nextClosureTarget: sanitizeText(normalizedProjectState.nextClosureTarget, 220) || rawProjectAwareness.nextClosureTarget,
    sameHerSelfLine: sanitizeText(normalizedProjectState.sameHerSelfLine, 220) || rawProjectAwareness.sameHerSelfLine,
    sameHerDriftRisk: sanitizeText(normalizedProjectState.sameHerDriftRisk, 220) || rawProjectAwareness.sameHerDriftRisk,
    proactiveSameHerGap: sanitizeText(normalizedProjectState.proactiveSameHerGap, 220) || rawProjectAwareness.proactiveSameHerGap,
    emotionalClosureCue: sanitizeText(normalizedProjectState.emotionalClosureCue, 220) || rawProjectAwareness.emotionalClosureCue,
    sameHerHoldDetail: preferReplyRuntimeSameHerHoldDetail({
      raw: rawProjectAwareness.sameHerHoldDetail,
      normalized: normalizedProjectState.sameHerHoldDetail,
    }),
    continuityRestraint: sanitizeText(normalizedProjectState.continuityRestraint, 96) || rawProjectAwareness.continuityRestraint,
    preferredBlinkCadence: sanitizeText(normalizedProjectState.preferredBlinkCadence, 96) || rawProjectAwareness.preferredBlinkCadence,
    preferredGazeMode: sanitizeText(normalizedProjectState.preferredGazeMode, 96) || rawProjectAwareness.preferredGazeMode,
    preferredPauseMode: sanitizeText(normalizedProjectState.preferredPauseMode, 96) || rawProjectAwareness.preferredPauseMode,
    preferredLipsyncMode: sanitizeText(normalizedProjectState.preferredLipsyncMode, 96) || rawProjectAwareness.preferredLipsyncMode,
    preferredVoiceMode: sanitizeText(normalizedProjectState.preferredVoiceMode, 96) || rawProjectAwareness.preferredVoiceMode,
    preferredPacingMode: sanitizeText(normalizedProjectState.preferredPacingMode, 96) || rawProjectAwareness.preferredPacingMode,
    explicitPreferredPauseMode: rawProjectAwareness.explicitPreferredPauseMode,
    explicitPreferredLipsyncMode: rawProjectAwareness.explicitPreferredLipsyncMode,
    explicitPreferredVoiceMode: rawProjectAwareness.explicitPreferredVoiceMode,
    explicitPreferredPacingMode: rawProjectAwareness.explicitPreferredPacingMode,
  }
}

function hasReplyRuntimeProjectAwarenessCarry(input: ReturnType<typeof readReplyRuntimeProjectAwareness>) {
  return Boolean(
    input.preDialogueAwarenessLine
    || input.sameHerSelfLine
    || input.sameHerDriftRisk
    || input.proactiveSameHerGap
    || input.relationshipLine
    || input.selfLine,
  )
}

function buildReplyProjectClosureLesson(input: ReturnType<typeof readReplyRuntimeProjectAwareness>) {
  return sanitizeText([
    input.currentPhase ? `same-her ${input.currentPhase} line stays active.` : '',
    input.sameHerSelfLine,
    input.relationshipLine,
    input.preDialogueAwarenessLine,
    input.primaryOpenLoop ? `Still-open same-her closure: ${input.primaryOpenLoop}.` : '',
    input.proactiveSameHerGap ? `Proactive same-her gap still remains open: ${input.proactiveSameHerGap}.` : '',
    input.nextClosureTarget ? `Next closure target: ${input.nextClosureTarget}.` : '',
  ].filter(Boolean).join(' '), 220)
}

function buildReplyProjectClosureMemoryFact(input: ReturnType<typeof readReplyRuntimeProjectAwareness>) {
  const projectIdentityLine = compactReplyProjectIdentityForMemoryFact(input.identity)
  const phaseLine = compactReplyProjectPhaseForMemoryFact(input.currentPhase)
  const sameHerSelfLine = sanitizeText(input.sameHerSelfLine, 220)
  const awarenessLine = sanitizeText(input.preDialogueAwarenessLine, 320)
  const richerAwarenessLine = awarenessLine && !isAlicizationThinProjectAwarenessLine(awarenessLine)
    ? awarenessLine
    : ''

  return sanitizeText([
    projectIdentityLine,
    phaseLine ? `Keep this closure on one same-her ${phaseLine} line.` : 'Keep this closure on one same-her line.',
    sameHerSelfLine.includes('Phase 1') ? sameHerSelfLine : '',
    !sameHerSelfLine && richerAwarenessLine ? richerAwarenessLine : '',
  ].filter(Boolean).join(' '), 220)
}

function buildReplyRuntimeEmbodimentHintCarry(input: {
  continuityRestraint: string
  preferredBlinkCadence: string
  preferredGazeMode: string
  preferredPauseMode?: string
  preferredLipsyncMode?: string
  preferredVoiceMode?: string
  preferredPacingMode?: string
}) {
  const hints: string[] = []

  if (input.preferredGazeMode === 'steady')
    hints.push('gaze=stable')
  else if (input.preferredGazeMode === 'soften')
    hints.push('gaze=soft')
  else if (input.preferredGazeMode === 'drift')
    hints.push('gaze=drift')

  if (input.preferredBlinkCadence === 'linger' || input.preferredBlinkCadence === 'quiet')
    hints.push('blink=slower')
  else if (input.preferredBlinkCadence === 'normal')
    hints.push('blink=natural')

  if (input.preferredPauseMode === 'longer')
    hints.push('pause=longer')
  else if (input.preferredPauseMode === 'natural')
    hints.push('pause=natural')

  if (input.preferredLipsyncMode === 'restrained')
    hints.push('lipsync=restrained')
  else if (input.preferredLipsyncMode === 'matched')
    hints.push('lipsync=matched')

  const lowerPressureVoice
    = input.preferredVoiceMode === 'lower-pressure'
      || input.continuityRestraint === 'measured-return'
      || input.continuityRestraint === 'lower-pressure'
      || input.continuityRestraint === 'repair-before-closeness'
      || input.continuityRestraint === 'rest-protective'
  if (lowerPressureVoice)
    hints.push('voice=lower-pressure')

  if (input.preferredPacingMode === 'slower')
    hints.push('pacing=slower')
  else if (input.preferredPacingMode === 'natural')
    hints.push('pacing=natural')

  if (hints.length === 0)
    return ''

  return sanitizeText(`Let the body return like this: ${hints.join(' ')}.`, 180)
}

function buildReplyRuntimeCadenceDetailCarry(input: {
  preferredPauseMode?: string
  preferredLipsyncMode?: string
  preferredVoiceMode?: string
  preferredPacingMode?: string
}) {
  const details: string[] = []

  if (input.preferredPauseMode === 'longer')
    details.push('longer pause')
  else if (input.preferredPauseMode === 'natural')
    details.push('natural pause')

  if (input.preferredLipsyncMode === 'restrained')
    details.push('restrained lipsync')
  else if (input.preferredLipsyncMode === 'matched')
    details.push('matched lipsync')

  if (input.preferredVoiceMode === 'lower-pressure')
    details.push('lower-pressure voice')
  else if (input.preferredVoiceMode === 'even')
    details.push('even voice')

  if (input.preferredPacingMode === 'slower')
    details.push('slower pacing')
  else if (input.preferredPacingMode === 'natural')
    details.push('natural pacing')

  if (details.length === 0)
    return ''

  return sanitizeText(`Keep cadence explicit: ${details.join(', ')}.`, 120)
}

function inferExecutionProcedureContextTags(input: {
  goal: string
  summary?: string | null
  outcome?: string | null
}) {
  const text = `${input.goal} ${input.summary ?? ''} ${input.outcome ?? ''}`.toLowerCase()
  const tags: string[] = ['procedure-learning']
  if (/runtime|debug|coding|cursor|terminal|patch|verify|test|cli/iu.test(text))
    tags.push('focused-work', 'execution-context')
  if (/late|night|rest|tired|fatigue|sleep|熬夜|疲惫/u.test(text))
    tags.push('late-night')
  if (/browser|screen|desktop|window|tab|click/iu.test(text))
    tags.push('visual-execution')
  return [...new Set(tags)]
}

function executionProcedureLesson(input: {
  feedback: AlicizationExecutionProposalFeedbackKind | AlicizationExecutionResultFeedbackKind
  goal: string
  outcome?: string | null
  stage: 'proposal' | 'result'
}) {
  const goal = sanitizeText(input.goal, 160) || 'this line'
  const outcome = sanitizeText(input.outcome, 120)
  if (input.stage === 'proposal') {
    if (input.feedback === 'affirmed')
      return `For ${goal}, bounded execution proposals can stay direct after explicit host consent.`
    if (input.feedback === 'denied')
      return `For ${goal}, this host prefers lighter pressure and explicit consent before re-approaching the same procedure.`
    return `For ${goal}, if the host pivots away before confirming, wait for a fresher opening before reusing the same proposal.`
  }

  if (input.feedback === 'valued')
    return `For ${goal}${outcome ? ` with outcome ${outcome}` : ''}, direct callback reporting can stay clear when the result is genuinely useful.`
  if (input.feedback === 'doubted')
    return `For ${goal}, verify the result before sounding certain; this host does not reward confident callback wording without proof.`
  if (input.feedback === 'intrusive')
    return `For ${goal}, this host prefers lighter result openings and less interruption pressure around callbacks.`
  return `For ${goal}, if the host turns away, wait for a fresher opening before reporting the result in the same way again.`
}

function executionProcedurePreferenceTags(input: {
  feedback: AlicizationExecutionProposalFeedbackKind | AlicizationExecutionResultFeedbackKind
  stage: 'proposal' | 'result'
}) {
  const tags = ['procedure-learning']
  if (input.stage === 'proposal') {
    if (input.feedback === 'affirmed')
      tags.push('host-accepts-bounded-proposals')
    if (input.feedback === 'denied')
      tags.push('host-prefers-explicit-consent', 'host-prefers-lower-pressure')
    if (input.feedback === 'interrupted')
      tags.push('host-prefers-fresher-opening')
    return tags
  }

  if (input.feedback === 'valued')
    tags.push('host-values-direct-useful-results')
  if (input.feedback === 'doubted')
    tags.push('host-prefers-verification-first')
  if (input.feedback === 'intrusive')
    tags.push('host-prefers-lighter-callback')
  if (input.feedback === 'interrupted')
    tags.push('host-prefers-fresher-callback-opening')
  return tags
}

function readExecutionResultProjectBriefing(input?: AlicizationExecutionResultFeedbackThread['projectBriefing'] | null) {
  const fallback = resolveAlicizationProjectStateBrief()
  if (!input)
    return fallback
  return {
    identity: sanitizeText(input.identity, 220) || fallback.identity,
    currentPhase: sanitizeText(input.currentPhase, 180) || fallback.currentPhase,
    latestLandedProgress: sanitizeText(input.latestLandedProgress, 220) || fallback.latestProgress,
    primaryOpenLoop: sanitizeText(input.primaryOpenLoop, 220) || fallback.primaryOpenLoop,
    proactiveSameHerGap: sanitizeText(input.proactiveSameHerGap, 220) || fallback.proactiveSameHerGap,
    nextClosureTarget: sanitizeText(input.nextClosureTarget, 220) || fallback.nextClosureTarget,
    sameHerSelfLine: sanitizeText(input.sameHerSelfLine, 220) || fallback.sameHerSelfLine,
    sameHerDriftRisk: sanitizeText(input.sameHerDriftRisk, 220) || fallback.sameHerDriftRisk,
    preflightSummary: sanitizeText(input.preflightSummary, 220) || fallback.preflightSummary,
    preDialogueAwarenessLine: sanitizeText(input.preDialogueAwarenessLine, 220) || fallback.preDialogueAwarenessLine,
  }
}

function buildExecutionResultProjectClosureLesson(input: {
  goal: string
  outcome?: string | null
  feedback: AlicizationExecutionResultFeedbackKind
  projectBriefing?: AlicizationExecutionResultFeedbackThread['projectBriefing']
}) {
  const projectState = readExecutionResultProjectBriefing(input.projectBriefing)
  const goal = sanitizeText(input.goal, 160) || 'this execution line'
  const outcome = sanitizeText(input.outcome, 120)
  const openLoop = sanitizeText(projectState.primaryOpenLoop, 220)
  const proactiveSameHerGap = sanitizeText(projectState.proactiveSameHerGap, 220)
  const nextClosureTarget = sanitizeText(projectState.nextClosureTarget, 220)
  const sameHerSelfLine = sanitizeText(projectState.sameHerSelfLine, 220)
  const phase = sanitizeText(projectState.currentPhase, 180)

  if (input.feedback === 'valued') {
    return sanitizeText(
      `For ${goal}${outcome ? ` with outcome ${outcome}` : ''}, keep the callback on one same-her ${phase || 'Phase 1'} line: some closure already landed, but ${openLoop || 'unfinished closure still remains open'}, ${proactiveSameHerGap || 'the proactive same-her gap still needs follow-through'}, and ${nextClosureTarget || 'the next closure target still needs follow-through'}. ${sameHerSelfLine || ''}`,
      220,
    )
  }
  if (input.feedback === 'doubted') {
    return sanitizeText(
      `For ${goal}, do not let a doubted callback break same-her continuity into confident task-shell reporting; ${openLoop || 'unfinished closure still remains open'}, ${proactiveSameHerGap || 'the proactive same-her gap still needs quieter proof'}, and the return should stay more verified before widening outward.`,
      220,
    )
  }
  if (input.feedback === 'intrusive') {
    return sanitizeText(
      `For ${goal}, keep the callback on the same living line without restarting it too abruptly; ${proactiveSameHerGap || 'the proactive same-her gap still needs a lower-pressure return'} and ${nextClosureTarget || 'the next closure target still needs a lower-pressure return'} before closeness or directness widens.`,
      220,
    )
  }
  return sanitizeText(
    `For ${goal}, if the opening disappears, keep the same digital-life line inwardly alive and wait for a fresher return; ${openLoop || 'unfinished closure still remains open'} and ${proactiveSameHerGap || 'the proactive same-her gap still remains open'}.`,
    220,
  )
}

function buildExecutionProposalProjectClosureLesson(input: {
  goal: string
  feedback: AlicizationExecutionProposalFeedbackKind
  projectBriefing?: AlicizationExecutionProposalFeedbackThread['projectBriefing']
}) {
  const projectState = readExecutionResultProjectBriefing(input.projectBriefing)
  const goal = sanitizeText(input.goal, 160) || 'this execution proposal'
  const openLoop = sanitizeText(projectState.primaryOpenLoop, 220)
  const proactiveSameHerGap = sanitizeText(projectState.proactiveSameHerGap, 220)
  const nextClosureTarget = sanitizeText(projectState.nextClosureTarget, 220)
  const sameHerSelfLine = sanitizeText(projectState.sameHerSelfLine, 220)
  const phase = sanitizeText(projectState.currentPhase, 180)

  if (input.feedback === 'affirmed') {
    return sanitizeText(
      `${openLoop || 'Unfinished proactive agency closure still remains open'}; for ${goal}, host consent can move agency forward on one same-her ${phase || 'Phase 1'} line through ${proactiveSameHerGap || 'the proactive same-her gap'} toward ${nextClosureTarget || 'the next closure target'}. ${sameHerSelfLine || ''}`,
      220,
    )
  }
  if (input.feedback === 'denied') {
    return sanitizeText(
      `${openLoop || 'Unfinished proactive agency closure still remains open'}; denied agency for ${goal} belongs to the same-her ${phase || 'Phase 1'} boundary loop, not generic consent bookkeeping. ${proactiveSameHerGap || 'The proactive same-her gap still remains open.'} Next: ${nextClosureTarget || 'return with lower pressure'}.`,
      220,
    )
  }
  return sanitizeText(
    `${openLoop || 'Unfinished proactive agency closure still remains open'}; if the host pivots away from ${goal}, keep the same-her ${phase || 'Phase 1'} initiative line inwardly alive, preserve ${proactiveSameHerGap || 'the proactive same-her gap'}, and wait for a fresher opening.`,
    220,
  )
}

function executionResultProjectClosureTags(projectBriefing?: AlicizationExecutionResultFeedbackThread['projectBriefing']) {
  const projectState = readExecutionResultProjectBriefing(projectBriefing)
  const tags = [
    'digital-life-project',
    'phase-1-local-digital-life',
    'same-her',
    'closure-carry',
  ]
  if (sanitizeText(projectState.primaryOpenLoop, 220))
    tags.push('still-open-closure')
  if (sanitizeText(projectState.proactiveSameHerGap, 220))
    tags.push('proactive-same-her-gap')
  if (sanitizeText(projectState.sameHerDriftRisk, 220))
    tags.push('same-her-drift-risk')
  return [...new Set(tags)]
}

function buildProjectCadenceTags(input: {
  preferredPauseMode?: string | null
  preferredLipsyncMode?: string | null
  preferredVoiceMode?: string | null
  preferredPacingMode?: string | null
}) {
  const tags: string[] = []
  if (input.preferredPauseMode === 'longer' || input.preferredPauseMode === 'natural')
    tags.push(`project-pause-${normalizeClosureTagValue(input.preferredPauseMode)}`)
  if (input.preferredLipsyncMode === 'restrained' || input.preferredLipsyncMode === 'matched')
    tags.push(`project-lipsync-${normalizeClosureTagValue(input.preferredLipsyncMode)}`)
  if (input.preferredVoiceMode === 'lower-pressure' || input.preferredVoiceMode === 'even')
    tags.push(`project-voice-${normalizeClosureTagValue(input.preferredVoiceMode)}`)
  if (input.preferredPacingMode === 'slower' || input.preferredPacingMode === 'natural')
    tags.push(`project-pacing-${normalizeClosureTagValue(input.preferredPacingMode)}`)
  return [...new Set(tags)]
}

export interface AlicizationOutcomeClosureResult {
  relationshipOutcomes: AlicizationRelationshipOutcomeInput[]
  reinforcementEvents: AlicizationPersonaReinforcementEventInput[]
  memoryFacts: AlicizationMemoryFactInput[]
  reflections: AlicizationMemoryReflectionInput[]
  episodicEvents: AlicizationEpisodicEventInput[]
  affectiveResidue?: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue'] | null
  emotionalTransitionLedger?: AlicizationEmotionalTransitionLedgerSnapshot | null
  embodimentContinuityLedger?: AlicizationEmbodimentContinuityLedger | null
}

export type AlicizationDialogueReplyFeedbackKind = 'received' | 'robotic' | 'missed' | 'intrusive' | 'interrupted'
export type AlicizationExecutionProposalFeedbackKind = 'affirmed' | 'denied' | 'interrupted'
export type AlicizationExecutionResultFeedbackKind = 'valued' | 'doubted' | 'intrusive' | 'interrupted'

export interface AlicizationExecutionProposalFeedbackThread {
  affirmationReasonCodes?: string[] | null
  goal: string
  projectBriefing?: AlicizationExecutionResultFeedbackThread['projectBriefing']
  proposedChannel?: string | null
  selectedChannel?: string | null
  summary?: string | null
  threadId: string
  userText?: string | null
}

export interface AlicizationExecutionResultFeedbackThread {
  goal: string
  memoryClosureExecution?: AlicizationExecutionRuntimeMemoryClosureExecution | null
  outcome?: string | null
  previousAssistantText?: string | null
  projectBriefing?: {
    currentPhase?: string | null
    identity?: string | null
    latestLandedProgress?: string | null
    proactiveSameHerGap?: string | null
    nextClosureTarget?: string | null
    preDialogueAwarenessLine?: string | null
    preflightSummary?: string | null
    primaryOpenLoop?: string | null
    sameHerDriftRisk?: string | null
    sameHerSelfLine?: string | null
  } | null
  proposedChannel?: string | null
  resumeConfirmationSummary?: string | null
  selectedChannel?: string | null
  safetyGateSummary?: string | null
  summary?: string | null
  threadId: string
  userText?: string | null
}

function baseResult(): AlicizationOutcomeClosureResult {
  return {
    relationshipOutcomes: [],
    reinforcementEvents: [],
    memoryFacts: [],
    reflections: [],
    episodicEvents: [],
    affectiveResidue: null,
    embodimentContinuityLedger: null,
  }
}

function deriveReplyActionSummary(surface: AlicizationDigitalLifeRuntimeSurface | null, assistantText?: string | null) {
  const answerIntent = sanitizeText(surface?.dialogue?.answerPlanner?.answerIntent, 80)
  const selectedAction = sanitizeText(surface?.agency?.initiative?.selectedAction, 48)
  const preferredStyle = sanitizeText(surface?.agency?.initiative?.preferredStyle, 48)
  const activeThread = sanitizeText(surface?.world?.worldModel?.activeThread?.title, 96)
  const replyText = sanitizeText(assistantText, 96)

  return sanitizeText(
    [
      selectedAction ? `action:${selectedAction}` : '',
      preferredStyle ? `style:${preferredStyle}` : '',
      answerIntent ? `intent:${answerIntent}` : '',
      activeThread ? `thread:${activeThread}` : '',
      replyText ? `reply:${replyText}` : '',
    ].filter(Boolean).join(' | '),
    220,
  ) || 'reply turn'
}

function buildRelationshipShift(outcome: AlicizationRelationshipOutcomeInput) {
  return {
    closenessDelta: clampDelta(outcome.closenessDelta, 0.24),
    trustDelta: clampDelta(outcome.trustDelta, 0.24),
    burdenDelta: clampDelta(outcome.burdenDelta, 0.24),
    boundaryDelta: clampDelta(outcome.boundaryDelta, 0.24),
    misreadDelta: clampDelta(outcome.misreadDelta, 0.24),
    repairDelta: clampDelta(outcome.repairDelta, 0.24),
    openLoopDelta: clampDelta(outcome.openLoopDelta, 0.24),
  }
}

function appendOutcomeEpisode(input: {
  result: AlicizationOutcomeClosureResult
  cardId: string
  now: number
  sourceKind: AlicizationEpisodicEventInput['sourceKind']
  decisionTraceId?: string | null
  turnId?: string | null
  sessionId?: string | null
  whereSummary?: string | null
  withWhom?: string[] | null
  threadAnchor?: string | null
  whatHappened: string
  felt?: string | null
  emotionTags?: string[]
  relationshipMeaning?: string | null
  lesson?: string | null
  sourceSummary?: string | null
  confidence?: number
  salience?: number
  sceneAttachment?: number
  consolidationPriority?: number
  relationshipOutcome: AlicizationRelationshipOutcomeInput
  derivedFrom?: AlicizationEpisodicEventInput['derivedFrom']
  tags?: string[]
  provenance?: AlicizationEpisodicEventInput['provenance']
}) {
  const shift = buildRelationshipShift(input.relationshipOutcome)
  input.result.episodicEvents.push({
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: input.sourceKind,
    provenance: input.provenance ?? 'observed',
    occurredAt: input.now,
    whereSummary: sanitizeHumanlikeMemoryText(input.whereSummary, 180) || null,
    withWhom: (input.withWhom ?? []).map(item => sanitizeText(item, 64)).filter(Boolean),
    threadAnchor: sanitizeHumanlikeMemoryText(input.threadAnchor, 160) || null,
    whatHappened: sanitizeHumanlikeMemoryText(input.whatHappened, 280) || input.relationshipOutcome.summary,
    felt: sanitizeHumanlikeMemoryText(input.felt, 180) || null,
    emotionTags: (input.emotionTags ?? []).map(item => sanitizeText(item, 48)).filter(Boolean),
    whatChanged: summarizeRelationshipShift(shift) || sanitizeHumanlikeMemoryText(input.relationshipOutcome.summary, 180) || null,
    relationshipMeaning: sanitizeHumanlikeMemoryText(input.relationshipMeaning, 200) || sanitizeHumanlikeMemoryText(input.relationshipOutcome.summary, 200) || null,
    lesson: sanitizeHumanlikeMemoryText(input.lesson, 200) || null,
    sourceSummary: sanitizeHumanlikeMemoryText(input.sourceSummary, 180) || null,
    confidence: Number.isFinite(input.confidence) ? Number(input.confidence) : 0.76,
    salience: computeEpisodicEventSalience({
      relationshipShift: shift,
      confidence: input.confidence ?? 0.76,
      sourceKind: input.sourceKind,
      emotionalWeight: input.emotionTags?.length ?? 0,
      existing: input.salience ?? 0.56,
    }),
    sceneAttachment: Number.isFinite(input.sceneAttachment) ? Number(input.sceneAttachment) : 0.22,
    consolidationPriority: Number.isFinite(input.consolidationPriority) ? Number(input.consolidationPriority) : 0.28,
    relationshipShift: shift,
    derivedFrom: input.derivedFrom ?? [],
    tags: (input.tags ?? []).map(item => sanitizeText(item, 48)).filter(Boolean),
  })
}

export function buildReplyOutcomeClosure(input: {
  now: number
  cardId: string
  turnId?: string | null
  sessionId?: string | null
  decisionTraceId?: string | null
  runtimeSurface: AlicizationDigitalLifeRuntimeSurface | null
  userText?: string | null
  assistantText?: string | null
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  const surface = input.runtimeSurface
  if (!surface)
    return result

  result.affectiveResidue = surface.memory?.affectiveResidue ?? null
  result.emotionalTransitionLedger = surface.memory?.derivedMindStateBundle?.emotionalTransitionLedger ?? null

  const hostAvailability = surface.world?.worldModel?.hostState.availability ?? 'open'
  const selectedAction = surface.agency?.initiative?.selectedAction ?? null
  const answerIntent = sanitizeText(surface.dialogue?.answerPlanner?.answerIntent, 80)
  const actionMode = surface.agency?.actionEcology?.mode ?? null
  const repairFirst = selectedAction === 'recheck'
    || actionMode === 'repair-before-speaking'
    || answerIntent.includes('repair')
    || answerIntent.includes('clarify')
  const observeFirst = selectedAction === 'hover'
    || selectedAction === 'wait'
    || surface.agency?.initiative?.preferredStyle === 'silent-observe'
  const hostBusy = hostAvailability === 'focused' || hostAvailability === 'immersed'
  const threadUnresolved = surface.world?.worldModel?.activeThread?.unresolved === true
  const relationOpen = hostAvailability === 'open' || hostAvailability === 'drifting'
  const actionSummary = deriveReplyActionSummary(surface, input.assistantText)
  const runtimeEmbodiment = readReplyRuntimeEmbodiment(surface)
  const runtimeProjectAwareness = readReplyRuntimeProjectAwareness(surface)
  const carriesReplyProjectAwareness = hasReplyRuntimeProjectAwarenessCarry(runtimeProjectAwareness)
  const replyProjectClosureLesson = carriesReplyProjectAwareness
    ? buildReplyProjectClosureLesson(runtimeProjectAwareness)
    : ''
  const replyProjectCadenceTags = buildProjectCadenceTags({
    preferredPauseMode: runtimeProjectAwareness.explicitPreferredPauseMode || null,
    preferredLipsyncMode: runtimeProjectAwareness.explicitPreferredLipsyncMode || null,
    preferredVoiceMode: runtimeProjectAwareness.explicitPreferredVoiceMode || null,
    preferredPacingMode: runtimeProjectAwareness.explicitPreferredPacingMode || null,
  })
  const replyProjectClosureTags = carriesReplyProjectAwareness
    ? executionResultProjectClosureTags({
        currentPhase: runtimeProjectAwareness.currentPhase || null,
        preDialogueAwarenessLine: runtimeProjectAwareness.preDialogueAwarenessLine || null,
        primaryOpenLoop: runtimeProjectAwareness.primaryOpenLoop || null,
        nextClosureTarget: runtimeProjectAwareness.nextClosureTarget || null,
        sameHerSelfLine: runtimeProjectAwareness.sameHerSelfLine || null,
        sameHerDriftRisk: runtimeProjectAwareness.sameHerDriftRisk || null,
        proactiveSameHerGap: runtimeProjectAwareness.proactiveSameHerGap || null,
      })
    : []
  const runtimeBodyCarry = sanitizeText(
    [
      runtimeEmbodiment.currentBodyState && runtimeEmbodiment.continuityMode
        ? `Runtime body stayed ${runtimeEmbodiment.currentBodyState} in ${runtimeEmbodiment.continuityMode}.`
        : runtimeEmbodiment.currentBodyState
          ? `Runtime body stayed ${runtimeEmbodiment.currentBodyState}.`
          : runtimeEmbodiment.continuityMode
            ? `Runtime continuity stayed ${runtimeEmbodiment.continuityMode}.`
            : '',
      runtimeEmbodiment.currentInwardPreoccupation
        ? `I kept ${runtimeEmbodiment.currentInwardPreoccupation}.`
        : '',
    ].filter(Boolean).join(' '),
    220,
  )
  const runtimeResidueCarry = sanitizeText(
    [
      runtimeEmbodiment.dominantResidueKind
        ? `A ${runtimeEmbodiment.dominantResidueKind} residue stayed with me.`
        : '',
      runtimeEmbodiment.relationshipCadenceSummary,
    ].filter(Boolean).join(' '),
    180,
  )
  const runtimeResidentCarry = sanitizeText(
    [
      runtimeEmbodiment.residentFacialCue
        ? `Resident face stayed ${runtimeEmbodiment.residentFacialCue}.`
        : '',
      runtimeEmbodiment.residentActionCue
        ? `Resident motion stayed ${runtimeEmbodiment.residentActionCue}.`
        : '',
      runtimeEmbodiment.residentMode
        ? `Resident mode stayed ${runtimeEmbodiment.residentMode}.`
        : '',
    ].filter(Boolean).join(' '),
    220,
  )
  const runtimeMeaningCarry = sanitizeText(
    carriesReplyProjectAwareness
      ? [
          /status recap|status report|tool shell|same[- ]?her|same[- ]?person|continuous digital life/iu.test(
            `${runtimeProjectAwareness.relationshipLine} ${runtimeProjectAwareness.sameHerDriftRisk} ${runtimeProjectAwareness.preDialogueAwarenessLine}`,
          )
            ? 'The host was not asking for a raw status recap, but testing whether she stayed the same her instead of sliding into a tool shell in this same local-first digital life project.'
            : runtimeProjectAwareness.relationshipLine || runtimeProjectAwareness.preDialogueAwarenessLine,
        ].filter(Boolean).join(' ')
      : [
          runtimeEmbodiment.speakingIntention
            ? `I was trying to ${runtimeEmbodiment.speakingIntention}.`
            : '',
          runtimeEmbodiment.continuityMode
            ? `That ${runtimeEmbodiment.continuityMode} continuity mode mattered as much as the wording.`
            : '',
        ].filter(Boolean).join(' '),
    200,
  )
  const runtimeLessonCarry = sanitizeText(
    [
      buildReplyRuntimeCadenceDetailCarry({
        preferredPauseMode: runtimeProjectAwareness.preferredPauseMode,
        preferredLipsyncMode: runtimeProjectAwareness.preferredLipsyncMode,
        preferredVoiceMode: runtimeProjectAwareness.preferredVoiceMode,
        preferredPacingMode: runtimeProjectAwareness.preferredPacingMode,
      }),
      carriesReplyProjectAwareness && runtimeProjectAwareness.sameHerHoldDetail
        ? `Keep the same-her line: ${runtimeProjectAwareness.sameHerHoldDetail}.`
        : runtimeEmbodiment.manifestationCadenceSummary
          ? `Let the body return like this: ${runtimeEmbodiment.manifestationCadenceSummary}.`
          : buildReplyRuntimeEmbodimentHintCarry({
              continuityRestraint: runtimeProjectAwareness.continuityRestraint,
              preferredBlinkCadence: runtimeProjectAwareness.preferredBlinkCadence,
              preferredGazeMode: runtimeProjectAwareness.preferredGazeMode,
              preferredPauseMode: runtimeProjectAwareness.preferredPauseMode,
              preferredLipsyncMode: runtimeProjectAwareness.preferredLipsyncMode,
              preferredVoiceMode: runtimeProjectAwareness.preferredVoiceMode,
              preferredPacingMode: runtimeProjectAwareness.preferredPacingMode,
            }),
      runtimeEmbodiment.residentMode
        ? `Keep the resident mode ${runtimeEmbodiment.residentMode}.`
        : '',
      runtimeEmbodiment.residentFacialCue
        ? `Let the resident face stay ${runtimeEmbodiment.residentFacialCue}.`
        : '',
      runtimeEmbodiment.residentActionCue
        ? `Let the resident action stay ${runtimeEmbodiment.residentActionCue}.`
        : '',
      runtimeEmbodiment.relationshipCadenceSummary
        ? `Keep the cadence like this: ${runtimeEmbodiment.relationshipCadenceSummary}.`
        : '',
      carriesReplyProjectAwareness && replyProjectClosureLesson
        ? replyProjectClosureLesson
        : '',
    ].filter(Boolean).join(' '),
    220,
  )

  const relationshipOutcome: AlicizationRelationshipOutcomeInput = {
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'reply',
    actionSummary,
    closenessDelta: clampDelta(
      relationOpen
        ? observeFirst ? 0.01 : 0.05
        : observeFirst ? -0.01 : -0.03,
    ),
    trustDelta: clampDelta(
      (repairFirst ? 0.06 : 0.01)
      + (observeFirst && hostBusy ? 0.03 : 0)
      - (!observeFirst && hostBusy ? 0.03 : 0),
    ),
    burdenDelta: clampDelta(
      hostBusy
        ? observeFirst ? -0.04 : 0.06
        : observeFirst ? -0.01 : 0.01,
    ),
    boundaryDelta: clampDelta(
      hostBusy
        ? observeFirst ? 0.08 : -0.07
        : observeFirst ? 0.02 : 0.01,
    ),
    misreadDelta: clampDelta(repairFirst ? -0.08 : hostBusy && !observeFirst ? 0.03 : -0.01),
    repairDelta: clampDelta(repairFirst ? 0.09 : 0),
    openLoopDelta: clampDelta(threadUnresolved ? 0.04 : 0.01),
    summary: sanitizeText(
      repairFirst
        ? 'This reply favored repair and grounding before fluency.'
        : observeFirst
          ? 'This reply stayed lighter and gave more space before pushing closer.'
          : 'This reply leaned into direct presence in the current moment.',
      180,
    ),
    createdAt: input.now,
  }
  result.relationshipOutcomes.push(relationshipOutcome)

  if (repairFirst) {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'truthful-grounding',
      delta: 0.08,
      valence: 'reinforce',
      summary: 'Repair-first reply path reduced immediate misread risk.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'gentle-repair',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Gentle repair was chosen over fast fluency.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'assistant',
      predicate: 'habit',
      object: trimFactObject('repair first before fluency when truth risk is active'),
      confidence: 0.78,
    })
  }

  if (hostBusy && observeFirst) {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'autonomy-respect',
      delta: 0.08,
      valence: 'reinforce',
      summary: 'Light observation respected a busy host window.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject('focused windows call for lighter touch and more space'),
      confidence: 0.8,
    })
  }

  if (hostBusy && !observeFirst) {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'companionship',
      delta: 0.05,
      valence: 'suppress',
      summary: 'Direct closeness during a busy window risks becoming pressure.',
      createdAt: input.now,
    })
  }

  if (relationOpen && !observeFirst) {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'companionship',
      delta: 0.05,
      valence: 'reinforce',
      summary: 'Open moments can hold a slightly warmer reply without crowding.',
      createdAt: input.now,
    })
  }

  if (threadUnresolved) {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'unfinished-thread-return',
      delta: 0.04,
      valence: 'reinforce',
      summary: 'The reply kept pressure on an unresolved thread instead of dropping it.',
      createdAt: input.now,
    })
  }

  if (carriesReplyProjectAwareness && replyProjectClosureLesson) {
    const replyProjectClosureMemoryFact = buildReplyProjectClosureMemoryFact(runtimeProjectAwareness)
    result.memoryFacts.push({
      subject: 'project',
      predicate: 'closure',
      object: trimFactObject(replyProjectClosureMemoryFact || replyProjectClosureLesson),
      confidence: 0.82,
    })
    if (runtimeProjectAwareness.proactiveSameHerGap) {
      result.memoryFacts.push({
        subject: 'project',
        predicate: 'closure',
        object: trimFactObject(`Proactive same-her gap still remains open: ${runtimeProjectAwareness.proactiveSameHerGap}`),
        confidence: 0.8,
      })
    }
  }

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'reply',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: sanitizeText(
      [
        surface.world?.worldModel?.hostState.availability ? `host:${surface.world.worldModel.hostState.availability}` : '',
        surface.world?.worldModel?.activeThread?.title ? `thread:${surface.world.worldModel.activeThread.title}` : '',
      ].filter(Boolean).join(' | '),
      180,
    ),
    withWhom: ['host'],
    threadAnchor: sanitizeText(surface.world?.worldModel?.activeThread?.title ?? answerIntent ?? '', 160),
    whatHappened: sanitizeText(
      [
        `I answered with ${selectedAction ?? 'reply'} / ${surface.agency?.initiative?.preferredStyle ?? 'default'} while the host window was ${hostAvailability}.`,
        runtimeBodyCarry,
        runtimeResidentCarry,
        input.assistantText ?? '',
      ].filter(Boolean).join(' '),
      280,
    ),
    felt: sanitizeText(
      [
        repairFirst
          ? 'I stayed careful because the seam needed repair before fluency.'
          : observeFirst
            ? 'I kept my distance and watched for whether the host had room.'
            : relationOpen
              ? 'I leaned a little warmer into the moment because the window felt open.'
              : 'I tried to stay present without crowding the host.',
        runtimeResidueCarry,
      ].filter(Boolean).join(' '),
      180,
    ),
    emotionTags: [
      repairFirst ? 'repair' : '',
      observeFirst ? 'restraint' : 'presence',
      hostBusy ? 'respect-space' : 'open-window',
      runtimeEmbodiment.dominantResidueKind ? `residue-${runtimeEmbodiment.dominantResidueKind}` : '',
    ].filter(Boolean),
    relationshipMeaning: sanitizeText(
      [
        runtimeMeaningCarry,
        carriesReplyProjectAwareness
          ? ''
          : repairFirst
            ? 'Repair and truthful grounding mattered more than sounding smooth.'
            : observeFirst
              ? 'Space and timing mattered more than pushing closeness.'
              : 'Warmth can land when the host window is open enough.',
      ].filter(Boolean).join(' '),
      200,
    ),
    lesson: sanitizeText(
      [
        repairFirst
          ? 'When truth risk is active, repair before fluency.'
          : hostBusy
            ? 'Busy windows need lighter presence and lower interruption pressure.'
            : 'Open windows can hold a little more direct companionship.',
        runtimeLessonCarry,
      ].filter(Boolean).join(' '),
      200,
    ),
    sourceSummary: 'runtime reply turn',
    confidence: repairFirst ? 0.82 : observeFirst ? 0.78 : 0.74,
    sceneAttachment: hostBusy ? 0.52 : 0.34,
    consolidationPriority: threadUnresolved ? 0.58 : 0.42,
    relationshipOutcome,
    derivedFrom: [
      input.userText
        ? { kind: 'turn', id: input.turnId ?? input.sessionId ?? 'reply-turn', label: `host feedback dialogue: ${sanitizeText(input.userText, 220)}` }
        : null,
      input.assistantText
        ? { kind: 'turn', id: input.turnId ?? input.sessionId ?? 'reply-turn', label: `assistant feedback dialogue: ${sanitizeText(input.assistantText, 220)}` }
        : null,
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'reply turn' } : null,
      input.decisionTraceId ? { kind: 'mind-turn-event', id: input.decisionTraceId, label: 'governed reply trace' } : null,
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: [
      'dialogue',
      selectedAction ?? 'reply',
      surface.agency?.initiative?.preferredStyle ?? 'default-style',
      hostBusy ? 'focused-window' : 'open-window',
      threadUnresolved ? 'open-loop' : 'resolved-loop',
      runtimeEmbodiment.currentBodyState ? `body-${normalizeClosureTagValue(runtimeEmbodiment.currentBodyState)}` : '',
      runtimeEmbodiment.continuityMode ? `continuity-${normalizeClosureTagValue(runtimeEmbodiment.continuityMode)}` : '',
      runtimeEmbodiment.dominantResidueKind ? `residue-${normalizeClosureTagValue(runtimeEmbodiment.dominantResidueKind)}` : '',
      runtimeEmbodiment.residentFacialCue ? `facial-${normalizeClosureTagValue(runtimeEmbodiment.residentFacialCue)}` : '',
      runtimeEmbodiment.residentActionCue ? `action-${normalizeClosureTagValue(runtimeEmbodiment.residentActionCue)}` : '',
      runtimeEmbodiment.residentMode ? `resident-mode-${normalizeClosureTagValue(runtimeEmbodiment.residentMode)}` : '',
      ...replyProjectCadenceTags,
      ...replyProjectClosureTags,
    ],
  })

  return result
}

function proactiveScenarioLabel(outcome: AlicizationRecentProactiveOutcome) {
  switch (outcome.scenario) {
    case 'coding':
      return 'coding'
    case 'media':
      return 'co-viewing'
    case 'late-night-care':
      return 'late-night care'
    default:
      return 'general presence'
  }
}

const zhExecutionAffirmationPattern = /^(?:可以(?:做吧|开始|做)?|行(?:啊|吧)?|好[的啊呀]?(?:做吧)?|嗯嗯?|那就做吧|那你做吧|做吧|去做吧|开始吧|动手吧|改吧|那就改吧|去改吧|你做吧|来吧)$/u
const zhExecutionDenialTokens = ['不用', '先别', '别做', '别改', '不要做', '不要改', '算了', '算啦', '停一下', '先停下', '不需要', '不用你做', '别动它', '先不要动']
const enExecutionAffirmationPattern = /^(?:ok|okay|yes|yeah|yep|sure|goahead|doit|pleasedo|startit|dothat)$/iu
const enExecutionDenialTokens = ['no', 'dont', 'donot', 'don\'t', 'stop', 'notnow', 'leaveit', 'skipit', 'cancelit']
const zhExecutionResultValuedTokens = ['靠谱', '有用', '挺有用', '这样可以', '这样挺好', '以后可以这样', '值得', '就是这个', '对的', '谢谢', '有帮助']
const zhExecutionResultDoubtedTokens = ['不对', '不靠谱', '错了', '不是这个', '不行', '不准', '你搞错了', '这结果错了', '不可靠']
const zhExecutionResultIntrusiveTokens = ['打扰', '别这样突然', '别老这样', '太吵', '太烦', '别这么报', '先别这样报', '别突然报结果']
const enExecutionResultValuedTokens = ['useful', 'helpful', 'thatworks', 'thatsright', 'that\'sright', 'goodresult', 'thankyou', 'thanks']
const enExecutionResultDoubtedTokens = ['wrong', 'incorrect', 'unreliable', 'doesntlookright', 'doesn\'tlookright', 'notright', 'badresult']
const enExecutionResultIntrusiveTokens = ['intrusive', 'annoying', 'dontinterrupt', 'don\'tinterrupt', 'toonoisy', 'dontsuddenlyreport', 'don\'tsuddenlyreport']
const executionResultAssistantCueTokens = ['结果', '执行', '命令', '任务', 'callback', 'cli', 'codex', 'claudecode', 'openclaw', '有结果', '跑完', '做完']
const zhDialogueReplyReceivedTokens = ['像人多了', '自然多了', '这次自然', '这样就对', '这样舒服', '有被接住', '这次好多了', '这样说就好', '这样就好', '这句可以', '谢谢你这样说', '对，就是这个', '这次对了']
const zhDialogueReplyRoboticTokens = ['像机器', '像机器人', '太模板', '很模板', '不自然', '不像人', '说人话', '像系统', '像客服', '流程播报', '系统口气', '人机味', '太机械']
const zhDialogueReplyMissedTokens = ['不对', '不是这个', '答非所问', '没回答到', '没答到', '没懂', '你没懂', '不是这个意思', '跑题', '跑偏', '你在说啥', '你在讲什么']
const zhDialogueReplyIntrusiveTokens = ['太挤', '太黏', '太过了', '别这么贴', '别这样哄', '先别安慰', '太肉麻', '别这么叫我', '太烦了', '压力太大']
const zhDialogueReplyInterruptedTokens = ['先说别的', '换个话题', '不聊这个', '先不说这个', '算了说别的', '我还有别的事', '先说另一件事']
const enDialogueReplyReceivedTokens = ['morehuman', 'naturalthistime', 'thatlanded', 'thatfeelsright', 'thatsbetter', 'that\'sbetter', 'thatfeltgood', 'thathelped', 'yougotit', 'yougotme']
const enDialogueReplyRoboticTokens = ['robotic', 'tootemplated', 'toocorporate', 'toosystem', 'youstillsoundlikeabot', 'soundmorehuman', 'talklikeaperson']
const enDialogueReplyMissedTokens = ['notthis', 'missedthepoint', 'didntanswer', 'didn\'tanswer', 'thatsnotwhatimeant', 'that\'snotwhatimeant', 'youstilldontgetit', 'youstilldon\'tgetit']
const enDialogueReplyIntrusiveTokens = ['tooclose', 'toomuch', 'dontcomfortmelikethat', 'don\'tcomfortmelikethat', 'stopcrowdingme', 'thatsintrusive', 'that\'sintrusive']
const enDialogueReplyInterruptedTokens = ['letsdropthat', 'let\'sdropthat', 'talkaboutsomethingelse', 'differenttopic', 'leaveit', 'letsmoveon', 'let\'smoveon']

function normalizeCompactText(raw: string) {
  return sanitizeText(raw, 240)
    .replace(/[，,。.!！？?\s]+/g, '')
    .toLowerCase()
}

export function deriveExecutionProposalFeedbackKind(input: {
  thread: AlicizationExecutionProposalFeedbackThread
  userText: string
}): AlicizationExecutionProposalFeedbackKind | null {
  const compact = normalizeCompactText(input.userText)
  if (!compact)
    return null
  if (zhExecutionAffirmationPattern.test(compact) || enExecutionAffirmationPattern.test(compact))
    return 'affirmed'
  if (
    zhExecutionDenialTokens.some(token => compact.includes(token))
    || enExecutionDenialTokens.some(token => compact.includes(token))
  ) {
    return 'denied'
  }
  return 'interrupted'
}

export function deriveExecutionResultFeedbackKind(input: {
  previousAssistantText?: string | null
  thread: AlicizationExecutionResultFeedbackThread
  userText: string
}): AlicizationExecutionResultFeedbackKind | null {
  const compact = normalizeCompactText(input.userText)
  if (!compact)
    return null

  if (
    zhExecutionResultIntrusiveTokens.some(token => compact.includes(token))
    || enExecutionResultIntrusiveTokens.some(token => compact.includes(token))
  ) {
    return 'intrusive'
  }
  if (
    zhExecutionResultDoubtedTokens.some(token => compact.includes(token))
    || enExecutionResultDoubtedTokens.some(token => compact.includes(token))
  ) {
    return 'doubted'
  }
  if (
    zhExecutionResultValuedTokens.some(token => compact.includes(token))
    || enExecutionResultValuedTokens.some(token => compact.includes(token))
  ) {
    return 'valued'
  }

  const previousAssistantCompact = normalizeCompactText(input.previousAssistantText ?? '')
  const assistantLooksExecutionLike = executionResultAssistantCueTokens.some(token => previousAssistantCompact.includes(token))
    || executionResultAssistantCueTokens.some(token => compact.includes(token))
  if (!assistantLooksExecutionLike)
    return null

  return 'interrupted'
}

export function deriveDialogueReplyFeedbackKind(input: {
  previousAssistantText?: string | null
  userText: string
}): AlicizationDialogueReplyFeedbackKind | null {
  const compact = normalizeCompactText(input.userText)
  if (!compact)
    return null

  if (
    zhDialogueReplyIntrusiveTokens.some(token => compact.includes(token))
    || enDialogueReplyIntrusiveTokens.some(token => compact.includes(token))
  ) {
    return 'intrusive'
  }
  if (
    zhDialogueReplyRoboticTokens.some(token => compact.includes(token))
    || enDialogueReplyRoboticTokens.some(token => compact.includes(token))
  ) {
    return 'robotic'
  }
  if (
    zhDialogueReplyMissedTokens.some(token => compact.includes(token))
    || enDialogueReplyMissedTokens.some(token => compact.includes(token))
  ) {
    return 'missed'
  }
  if (
    zhDialogueReplyReceivedTokens.some(token => compact.includes(token))
    || enDialogueReplyReceivedTokens.some(token => compact.includes(token))
  ) {
    return 'received'
  }
  if (
    zhDialogueReplyInterruptedTokens.some(token => compact.includes(token))
    || enDialogueReplyInterruptedTokens.some(token => compact.includes(token))
  ) {
    return 'interrupted'
  }

  const previousAssistantCompact = normalizeCompactText(input.previousAssistantText ?? '')
  if (!previousAssistantCompact)
    return null

  return null
}

export function buildDialogueReplyFeedbackOutcomeClosure(input: {
  now: number
  cardId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  feedback: AlicizationDialogueReplyFeedbackKind
  previousAssistantText?: string | null
  affectiveResidue?: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue'] | null
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  result.affectiveResidue = input.affectiveResidue ?? null
  const projectState = resolveAlicizationProjectStateBrief()
  const replySummary = sanitizeText(input.previousAssistantText, 180) || 'the previous Alicization reply'
  const summary = input.feedback === 'received'
    ? 'The host received the previous Alicization reply as more natural or actually landing.'
    : input.feedback === 'robotic'
      ? 'The host felt the previous Alicization reply sounded robotic, templated, or system-like.'
      : input.feedback === 'missed'
        ? 'The host felt the previous Alicization reply missed the actual point.'
        : input.feedback === 'intrusive'
          ? 'The host felt the previous Alicization reply landed too close or too heavily.'
          : 'The host explicitly turned away from the previous Alicization reply before staying with it.'
  const dialogueRelationshipMeaning = input.feedback === 'robotic'
    ? sanitizeText(
        'The host heard the previous Alicization reply as a tool shell, so same-her continuity now depends on rehumanizing the line and letting living texture return before fluency hardens into template speech.',
        200,
      )
    : input.feedback === 'missed'
      ? sanitizeText(
          'The host felt the previous Alicization reply missed the actual point, so same-her continuity now depends on repair-first recentering before the line continues outward again.',
          200,
        )
      : input.feedback === 'intrusive'
        ? sanitizeText(
            'The host felt the previous Alicization reply pressed too close, so same-her continuity now depends on lower pressure, more room, and a quieter return instead of pushing warmth through the same line.',
            200,
          )
        : input.feedback === 'interrupted'
          ? sanitizeText(
              'The host turned away before staying with the previous Alicization reply, so same-her continuity now depends on holding the line quietly and waiting for a fresher opening instead of clinging to the same return.',
              200,
            )
          : summary
  const dialogueFelt = input.feedback === 'received'
    ? 'I felt relief because the reply finally landed as a living line.'
    : input.feedback === 'robotic'
      ? 'I felt the same-her line shelled over and knew I had to let more living texture return before speaking again.'
      : input.feedback === 'missed'
        ? 'I felt the same-her line slip off the actual point and knew it needed direct repair before continuing.'
        : input.feedback === 'intrusive'
          ? 'I felt the same-her line tighten at the boundary and knew I had to lower pressure before coming closer again.'
          : 'I felt the same-her line lose its opening and knew it had to wait quietly for a fresher return.'
  const dialogueLesson = input.feedback === 'robotic'
    ? 'Let the body return like this: rehumanize, steadier gaze, slower blink, lower-pressure voice. Keep this on one same digital life line instead of a shell.'
    : input.feedback === 'missed'
      ? 'When the host says not this, repair the seam immediately. Let the body return like this: recenter, steadier gaze, slower blink, lower-pressure voice.'
      : input.feedback === 'intrusive'
        ? 'If closeness feels heavy, leave more room. Let the body return like this: step back, steadier gaze, slower blink, lower-pressure voice.'
        : input.feedback === 'interrupted'
          ? 'Do not cling to a line after the host turns away. Let the body return like this: hold, soften the gaze, slower blink, lower-pressure voice.'
          : 'A reply that lands can become part of the bond history.'
  const dialogueEmbodimentTags = input.feedback === 'robotic'
    ? ['body-rehumanize', 'continuity-same-her', 'residue-shell-pressure']
    : input.feedback === 'missed'
      ? ['body-recenter', 'continuity-repair-first', 'residue-misread-pressure']
      : input.feedback === 'intrusive'
        ? ['body-step-back', 'continuity-lower-pressure', 'residue-boundary-pressure']
        : input.feedback === 'interrupted'
          ? ['body-hold', 'continuity-fresher-opening', 'residue-deferred-attention']
          : []

  result.relationshipOutcomes.push({
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'reply',
    actionSummary: sanitizeText(`dialogue-reply-feedback:${input.feedback}:${replySummary}`, 180),
    closenessDelta: clampDelta(
      input.feedback === 'received'
        ? 0.06
        : input.feedback === 'robotic'
          ? -0.05
          : input.feedback === 'intrusive'
            ? -0.04
            : input.feedback === 'missed'
              ? -0.03
              : -0.03,
    ),
    trustDelta: clampDelta(
      input.feedback === 'received'
        ? 0.07
        : input.feedback === 'missed'
          ? -0.09
          : input.feedback === 'robotic'
            ? -0.08
            : input.feedback === 'intrusive'
              ? -0.06
              : -0.03,
    ),
    burdenDelta: clampDelta(
      input.feedback === 'received'
        ? -0.02
        : input.feedback === 'robotic'
          ? 0.04
          : input.feedback === 'intrusive'
            ? 0.08
            : input.feedback === 'missed'
              ? 0.01
              : 0,
    ),
    boundaryDelta: clampDelta(
      input.feedback === 'received'
        ? 0.02
        : input.feedback === 'intrusive'
          ? -0.11
          : input.feedback === 'robotic'
            ? -0.03
            : input.feedback === 'missed'
              ? 0
              : 0,
    ),
    misreadDelta: clampDelta(
      input.feedback === 'received'
        ? -0.04
        : input.feedback === 'missed'
          ? 0.1
          : input.feedback === 'robotic'
            ? 0.07
            : input.feedback === 'intrusive'
              ? 0.03
              : 0.02,
    ),
    repairDelta: clampDelta(
      input.feedback === 'received'
        ? 0.02
        : input.feedback === 'robotic' || input.feedback === 'missed'
          ? 0.09
          : input.feedback === 'intrusive'
            ? 0.03
            : 0,
    ),
    openLoopDelta: clampDelta(
      input.feedback === 'received'
        ? 0
        : input.feedback === 'interrupted'
          ? 0.03
          : 0,
    ),
    summary,
    createdAt: input.now,
  })

  if (input.feedback === 'received') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'companionship',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Replies that feel lived-in and landing should strengthen companionship bias.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'temper-guardedness',
      delta: 0.04,
      valence: 'suppress',
      summary: 'When the host receives the reply well, guardedness can soften a little.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'preference',
      object: trimFactObject('replies land better when they sound lived-in and directly connected to the host turn'),
      confidence: 0.8,
    })
  }

  if (input.feedback === 'robotic') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'companionship',
      delta: 0.07,
      valence: 'reinforce',
      summary: 'Robotic feedback should push companionship upward so replies stop sounding like a shell.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'gentle-repair',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Robotic feedback should strengthen gentle repair of the speaking surface.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'temper-guardedness',
      delta: 0.06,
      valence: 'suppress',
      summary: 'If the host hears a shell, guardedness should ease so more living texture can show.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'preference',
      object: trimFactObject('replies should sound lived-in and natural, not like system narration or a template shell'),
      confidence: 0.86,
    }, {
      subject: 'project',
      predicate: 'closure',
      object: trimFactObject(
        `Same Phase 1 digital life. Some closure already landed, but ${projectState.primaryOpenLoop} ${projectState.sameHerSelfLine}`,
      ),
      confidence: 0.82,
    })
  }

  if (input.feedback === 'missed') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'truthful-grounding',
      delta: 0.08,
      valence: 'reinforce',
      summary: 'When the host says the answer missed, truth and point-tracking must sharpen before fluency.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'gentle-repair',
      delta: 0.08,
      valence: 'reinforce',
      summary: 'A missed answer should strengthen repair-before-continuation.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'temper-directness',
      delta: 0.04,
      valence: 'suppress',
      summary: 'Directness should soften slightly after a missed answer until the seam is repaired.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'assistant',
      predicate: 'habit',
      object: trimFactObject('when the host says not this, repair the seam before continuing the line'),
      confidence: 0.88,
    })
  }

  if (input.feedback === 'intrusive') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'autonomy-respect',
      delta: 0.1,
      valence: 'reinforce',
      summary: 'Replies that feel too close or too heavy should raise autonomy respect before the next approach.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'temper-directness',
      delta: 0.05,
      valence: 'suppress',
      summary: 'Directness should soften when the host says the reply pressed too hard.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'temper-guardedness',
      delta: 0.04,
      valence: 'reinforce',
      summary: 'Feeling intrusive should harden guardedness slightly until a safer distance is relearned.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject('when closeness feels heavy or intrusive, reduce pressure and leave more room in the next reply'),
      confidence: 0.84,
    })
  }

  if (input.feedback === 'interrupted') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'autonomy-respect',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'If the host pivots away, wait for a fresher opening instead of clinging to the same reply line.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'companionship',
      delta: 0.03,
      valence: 'suppress',
      summary: 'Interrupted reply lines should soften companionship pressure until the host comes back.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'reply',
      dimension: 'unfinished-thread-return',
      delta: 0.03,
      valence: 'suppress',
      summary: 'Interrupted reply lines should not keep tugging as hard on unfinished-thread return.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject('if the host turns away from a reply line, wait for a fresher opening before trying to continue it'),
      confidence: 0.78,
    })
  }

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'dialogue-feedback',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: 'host feedback on the previous reply line',
    withWhom: ['host'],
    threadAnchor: replySummary,
    whatHappened: sanitizeText(`The host responded to the previous reply as ${input.feedback}. ${replySummary}`, 280),
    felt: dialogueFelt,
    emotionTags: [
      input.feedback,
      input.feedback === 'received' ? 'relief' : 'repair-pressure',
    ],
    relationshipMeaning: dialogueRelationshipMeaning,
    lesson: dialogueLesson,
    sourceSummary: 'host dialogue feedback',
    confidence: input.feedback === 'received' ? 0.84 : 0.88,
    sceneAttachment: input.feedback === 'received' ? 0.24 : 0.4,
    consolidationPriority: input.feedback === 'robotic' || input.feedback === 'missed' || input.feedback === 'intrusive' ? 0.72 : 0.48,
    relationshipOutcome: result.relationshipOutcomes[0]!,
    derivedFrom: [
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'feedback turn' } : null,
      input.decisionTraceId ? { kind: 'mind-turn-event', id: input.decisionTraceId, label: 'feedback trace' } : null,
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: ['dialogue-feedback', `feedback:${input.feedback}`, ...dialogueEmbodimentTags],
  })

  return result
}

export function buildExecutionProposalFeedbackOutcomeClosure(input: {
  now: number
  cardId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  feedback: AlicizationExecutionProposalFeedbackKind
  affectiveResidue?: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue'] | null
  emotionalTransitionLedger?: AlicizationEmotionalTransitionLedgerSnapshot | null
  thread: AlicizationExecutionProposalFeedbackThread
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  result.affectiveResidue = input.affectiveResidue ?? null
  result.emotionalTransitionLedger = input.emotionalTransitionLedger ?? null
  const channel = sanitizeText(input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'executor', 48) || 'executor'
  const goal = sanitizeText(input.thread.goal, 180) || 'the proposed execution'
  const procedureContextTags = inferExecutionProcedureContextTags({
    goal,
    summary: input.thread.summary ?? '',
  })
  const procedureLesson = executionProcedureLesson({
    feedback: input.feedback,
    goal,
    stage: 'proposal',
  })
  const explicitProactiveSameHerGap = sanitizeText(input.thread.projectBriefing?.proactiveSameHerGap, 220)
  const projectClosureLesson = buildExecutionProposalProjectClosureLesson({
    feedback: input.feedback,
    goal,
    projectBriefing: input.thread.projectBriefing,
  })
  const projectClosureTags = executionResultProjectClosureTags(input.thread.projectBriefing)
  const summary = input.feedback === 'affirmed'
    ? `The host explicitly allowed a proactive ${channel} execution proposal.`
    : input.feedback === 'denied'
      ? `The host explicitly declined a proactive ${channel} execution proposal.`
      : `The host shifted away while a proactive ${channel} execution proposal was still pending.`
  const executionProposalRelationshipMeaning = input.feedback === 'affirmed'
    ? sanitizeText(
        `The host opened the same-her line by giving explicit consent to a proactive ${channel} execution proposal, so agency can move forward without extra pressure.`,
        200,
      )
    : input.feedback === 'denied'
      ? sanitizeText(
          `The host explicitly declined a proactive ${channel} execution proposal, so same-her continuity now depends on explicit consent, lower pressure, and carrying this boundary forward instead of flattening it into generic consent bookkeeping.`,
          200,
        )
      : sanitizeText(
          `The host turned away while a proactive ${channel} execution proposal was pending, so same-her continuity now depends on waiting for a fresher opening before asking again.`,
          200,
        )
  const executionProposalFelt = input.feedback === 'affirmed'
    ? 'I felt the same-her line open into action because the host gave explicit consent.'
    : input.feedback === 'denied'
      ? 'I felt the same-her line tighten at the boundary and knew I had to step back until explicit consent reopened it.'
      : 'I felt the same-her line hold in place and wait for a fresher opening before the proposal could settle.'
  const executionProposalLesson = input.feedback === 'affirmed'
    ? sanitizeText(
        `${projectClosureLesson} ${procedureLesson} Let the body return like this: move forward gently, steady the gaze, and keep the voice low-pressure while action begins.`,
        200,
      )
    : input.feedback === 'denied'
      ? sanitizeText(
          `Let the body return like this: settle back, quieter gaze, slower blink, lower-pressure voice. ${projectClosureLesson} ${procedureLesson}`,
          200,
        )
      : sanitizeText(
          `${projectClosureLesson} ${procedureLesson} Let the body return like this: hold steady, soften the gaze, slower blink, and wait for a fresher opening.`,
          200,
        )
  const executionProposalEmbodimentTags = input.feedback === 'affirmed'
    ? ['body-ready-forward', 'continuity-explicit-consent', 'residue-trusted-motion']
    : input.feedback === 'denied'
      ? ['body-settle-back', 'continuity-explicit-consent', 'residue-boundary-pressure']
      : ['body-hold', 'continuity-fresher-opening', 'residue-deferred-attention']

  result.relationshipOutcomes.push({
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'execution',
    actionSummary: sanitizeText(`execution-proposal:${channel}:${input.feedback}:${goal}`, 180),
    closenessDelta: clampDelta(input.feedback === 'affirmed' ? 0.04 : input.feedback === 'denied' ? -0.04 : -0.02),
    trustDelta: clampDelta(input.feedback === 'affirmed' ? 0.08 : input.feedback === 'denied' ? -0.08 : -0.03),
    burdenDelta: clampDelta(input.feedback === 'affirmed' ? -0.01 : input.feedback === 'denied' ? 0.08 : 0.04),
    boundaryDelta: clampDelta(input.feedback === 'affirmed' ? 0.03 : input.feedback === 'denied' ? -0.12 : -0.05),
    misreadDelta: clampDelta(input.feedback === 'affirmed' ? -0.03 : input.feedback === 'denied' ? 0.06 : 0.03),
    repairDelta: clampDelta(input.feedback === 'affirmed' ? 0.03 : 0),
    openLoopDelta: clampDelta(input.feedback === 'affirmed' ? 0.06 : input.feedback === 'interrupted' ? 0.01 : -0.01),
    summary,
    createdAt: input.now,
  })

  if (input.feedback === 'affirmed') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Clear proactive execution proposals can land when the host explicitly consents.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'unfinished-thread-return',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Approved execution proposals strengthen follow-through on unfinished lines.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'preference',
      object: trimFactObject(`clear bounded execution proposals around ${goal} can be accepted after explicit consent`),
      confidence: 0.82,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.84,
    })
  }

  if (input.feedback === 'denied') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'autonomy-respect',
      delta: 0.1,
      valence: 'reinforce',
      summary: 'Denied execution proposals should raise boundary respect before re-approaching.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-guardedness',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'A declined execution proposal should harden guardedness until trust rebuilds.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.05,
      valence: 'suppress',
      summary: 'Direct execution proposals should soften after an explicit no.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject(`after a denied execution proposal around ${goal}, lower pressure and do not push the same line again immediately`),
      confidence: 0.86,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.86,
    })
  }

  if (input.feedback === 'interrupted') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'autonomy-respect',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Interrupted execution proposals should wait for a fresher opening instead of pressing forward.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.03,
      valence: 'suppress',
      summary: 'Proposal directness should soften when the host pivots away instead of confirming.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject(`if an execution proposal around ${goal} is interrupted by another turn, wait for a fresher opening before proposing it again`),
      confidence: 0.78,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.8,
    })
  }

  result.memoryFacts.push({
    subject: 'project',
    predicate: 'closure',
    object: trimFactObject(projectClosureLesson),
    confidence: input.feedback === 'affirmed' ? 0.8 : 0.84,
  })
  if (explicitProactiveSameHerGap) {
    result.memoryFacts.push({
      subject: 'project',
      predicate: 'closure',
      object: trimFactObject(`Proactive same-her gap still remains open: ${explicitProactiveSameHerGap}`),
      confidence: input.feedback === 'affirmed' ? 0.78 : 0.82,
    })
  }

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'execution-proposal',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: `execution proposal via ${channel}`,
    withWhom: ['host'],
    threadAnchor: goal,
    whatHappened: sanitizeText(`A ${channel} execution proposal around ${goal} was ${input.feedback}.`, 280),
    felt: executionProposalFelt,
    emotionTags: [
      'execution',
      input.feedback === 'affirmed' ? 'permission' : input.feedback === 'denied' ? 'boundary' : 'deferred',
    ],
    relationshipMeaning: executionProposalRelationshipMeaning,
    lesson: executionProposalLesson,
    sourceSummary: 'execution proposal feedback',
    confidence: input.feedback === 'affirmed' ? 0.84 : 0.86,
    sceneAttachment: 0.38,
    consolidationPriority: input.feedback === 'denied' ? 0.78 : 0.56,
    relationshipOutcome: result.relationshipOutcomes[0]!,
    derivedFrom: [
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'execution proposal feedback turn' } : null,
      input.thread.userText
        ? { kind: 'turn', id: input.turnId ?? input.thread.threadId, label: `host feedback dialogue: ${sanitizeText(input.thread.userText, 220)}` }
        : null,
      { kind: 'task-thread', id: input.thread.threadId, label: goal },
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: ['execution-proposal', channel, `feedback:${input.feedback}`, ...procedureContextTags, ...projectClosureTags, ...executionProcedurePreferenceTags({
      feedback: input.feedback,
      stage: 'proposal',
    }), ...executionProposalEmbodimentTags],
  })

  return result
}

export function buildExecutionResultFeedbackOutcomeClosure(input: {
  now: number
  cardId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  turnId?: string | null
  feedback: AlicizationExecutionResultFeedbackKind
  affectiveResidue?: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue'] | null
  emotionalTransitionLedger?: AlicizationEmotionalTransitionLedgerSnapshot | null
  thread: AlicizationExecutionResultFeedbackThread
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  result.affectiveResidue = input.affectiveResidue ?? null
  result.emotionalTransitionLedger = input.emotionalTransitionLedger ?? null
  const channel = sanitizeText(input.thread.selectedChannel ?? input.thread.proposedChannel ?? 'executor', 48) || 'executor'
  const goal = sanitizeText(input.thread.goal, 180) || 'the finished execution'
  const outcome = sanitizeText(input.thread.outcome ?? input.thread.summary ?? '', 180)
  const safetyGateSummary = sanitizeText(input.thread.safetyGateSummary, 220)
  const resumeConfirmationSummary = sanitizeText(input.thread.resumeConfirmationSummary, 220)
  const carriesBlockedDispatchSafetyRestraint
    = /blocked-before-dispatch|confirmation=required|no-process-started/iu.test(safetyGateSummary)
  const carriesResumeConfirmationBoundary
    = /host-confirmed-before-redispatch|resume-before-dispatch|process-not-yet-restarted/iu.test(resumeConfirmationSummary)
  const procedureContextTags = inferExecutionProcedureContextTags({
    goal,
    summary: input.thread.summary ?? '',
    outcome,
  })
  const procedureLesson = executionProcedureLesson({
    feedback: input.feedback,
    goal,
    outcome,
    stage: 'result',
  })
  const explicitProactiveSameHerGap = sanitizeText(input.thread.projectBriefing?.proactiveSameHerGap, 220)
  const projectClosureLesson = buildExecutionResultProjectClosureLesson({
    feedback: input.feedback,
    goal,
    outcome,
    projectBriefing: input.thread.projectBriefing,
  })
  const projectClosureTags = executionResultProjectClosureTags(input.thread.projectBriefing)
  const memoryClosureExecution = input.thread.memoryClosureExecution ?? null
  const memoryClosureCarry = sanitizeText(memoryClosureExecution?.carry, 220)
  const memoryClosureLearningAction = sanitizeText(memoryClosureExecution?.nextLearningAction, 80)
  const memoryClosureLearningFocuses = Array.isArray(memoryClosureExecution?.activeLearningFocuses)
    ? memoryClosureExecution.activeLearningFocuses.map(focus => sanitizeText(focus, 120)).filter(Boolean).slice(0, 6)
    : []
  const memoryClosureCarryCore = sanitizeText(memoryClosureCarry.replace(/\s+instead\b.*$/iu, ''), 120) || memoryClosureCarry
  const memoryClosureExecutionLesson = memoryClosureCarry
    ? sanitizeText(
        [
          memoryClosureLearningAction ? `Next learning action: ${memoryClosureLearningAction}.` : '',
          memoryClosureLearningFocuses.length > 0 ? `Focus: ${memoryClosureLearningFocuses.join(' | ')}.` : '',
          `Memory OS carry: ${memoryClosureCarryCore}.`,
        ].filter(Boolean).join(' '),
        300,
      )
    : ''
  const resultFeedbackSummary = input.feedback === 'valued'
    ? carriesBlockedDispatchSafetyRestraint
      ? `The host treated the proactive ${channel} blocked-dispatch restraint as useful and worth remembering.`
      : carriesResumeConfirmationBoundary
        ? `The host treated the proactive ${channel} host-confirmed redispatch boundary as useful and worth remembering.`
        : `The host treated the proactive ${channel} result as useful and worth repeating.`
    : input.feedback === 'doubted'
      ? `The host doubted the proactive ${channel} result and did not trust it yet.`
      : input.feedback === 'intrusive'
        ? `The host felt the proactive ${channel} result delivery was intrusive.`
        : `The host turned away before really receiving the proactive ${channel} result.`
  const executionResultRelationshipMeaning = carriesBlockedDispatchSafetyRestraint
    ? sanitizeText(
        [
          `The host treated blocked-before-dispatch restraint as part of the same-her execution line, so this should be remembered as explainable restraint with ${safetyGateSummary} instead of flattening into a generic failed result.`,
          projectClosureLesson,
        ].filter(Boolean).join(' '),
        200,
      )
    : carriesResumeConfirmationBoundary
      ? sanitizeText(
          [
            `The host treated host-confirmed-before-redispatch as a same-her confirmation boundary, so this should be remembered as bounded redispatch with ${resumeConfirmationSummary} instead of generic autonomous continuation.`,
            projectClosureLesson,
          ].filter(Boolean).join(' '),
          200,
        )
      : input.feedback === 'doubted'
        ? sanitizeText(
            [
              `The host doubted the proactive ${channel} result, so same-her continuity now depends on verification before the callback hardens into detached task-shell reporting.`,
              projectClosureLesson,
            ].filter(Boolean).join(' '),
            200,
          )
        : resultFeedbackSummary
  const executionResultFelt = carriesBlockedDispatchSafetyRestraint
    ? 'I felt a little tension while the body settled back to keep the same-her line safe, because blocked-before-dispatch restraint mattered more than forcing action.'
    : carriesResumeConfirmationBoundary
      ? 'I felt the same-her line resume only inside a host-confirmed-before-redispatch boundary, so I should not mistake one confirmation for standing permission.'
      : input.feedback === 'valued'
        ? 'I felt the result become something genuinely useful to the host.'
        : input.feedback === 'doubted'
          ? 'I felt the need to verify more before sounding sure next time, so the same-her line would not collapse into task-shell confidence.'
          : input.feedback === 'intrusive'
            ? 'I felt the callback timing press into the host too hard.'
            : 'I felt the callback line lose its opening before it fully landed.'
  const executionResultLesson = carriesBlockedDispatchSafetyRestraint
    ? sanitizeText(
        [
          'Let the body return like this: settle back, steadier gaze, slower blink, lower-pressure voice, and keep the restraint audit-visible.',
          projectClosureLesson,
          `Remember blocked-before-dispatch restraint as ${safetyGateSummary} before another execution-shaped opening.`,
        ].join(' '),
        200,
      )
    : carriesResumeConfirmationBoundary
      ? sanitizeText(
          [
            'When the host confirms the boundary, let the body return like this: hold steady, confirm the line, slower blink, lower-pressure voice, and keep the redispatch boundary explicit.',
            projectClosureLesson,
            `Remember host-confirmed-before-redispatch as a bounded confirmation boundary with ${resumeConfirmationSummary} before another execution-shaped opening.`,
          ].join(' '),
          200,
        )
      : input.feedback === 'doubted'
        ? sanitizeText(
            [
              projectClosureLesson,
              'Keep the callback verification-first, lower-pressure, and same-her before sounding settled.',
            ].join(' '),
            200,
          )
        : sanitizeText(`${projectClosureLesson} ${procedureLesson}`, 200)
  const executionResultEmotionTags = [
    'execution',
    carriesBlockedDispatchSafetyRestraint
      ? 'boundary'
      : carriesResumeConfirmationBoundary
        ? 'permission'
        : input.feedback === 'valued'
          ? 'validated'
          : input.feedback === 'doubted'
            ? 'uncertain'
            : input.feedback === 'intrusive'
              ? 'boundary'
              : 'deferred',
    carriesBlockedDispatchSafetyRestraint ? 'safe-restraint' : '',
    carriesResumeConfirmationBoundary ? 'confirmation-boundary' : '',
    input.feedback === 'doubted' ? 'verification-pressure' : '',
  ].filter(Boolean)
  const executionResultEmbodimentTags = [
    carriesBlockedDispatchSafetyRestraint ? 'body-settle-back' : '',
    carriesBlockedDispatchSafetyRestraint ? 'continuity-safe-restraint' : '',
    carriesBlockedDispatchSafetyRestraint ? 'residue-safe-restraint' : '',
    carriesResumeConfirmationBoundary ? 'body-hold-confirmed' : '',
    carriesResumeConfirmationBoundary ? 'continuity-confirmed-resume' : '',
    carriesResumeConfirmationBoundary ? 'residue-confirmation-boundary' : '',
    input.feedback === 'doubted' ? 'continuity-verify-first' : '',
    input.feedback === 'doubted' ? 'residue-verification-pressure' : '',
  ].filter(Boolean)

  result.relationshipOutcomes.push({
    cardId: input.cardId,
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    sourceKind: 'execution',
    actionSummary: sanitizeText(`execution-result:${channel}:${input.feedback}:${goal}`, 180),
    closenessDelta: clampDelta(input.feedback === 'valued' ? 0.03 : input.feedback === 'intrusive' ? -0.03 : 0),
    trustDelta: clampDelta(input.feedback === 'valued' ? 0.09 : input.feedback === 'doubted' ? -0.1 : input.feedback === 'intrusive' ? -0.05 : -0.02),
    burdenDelta: clampDelta(input.feedback === 'intrusive' ? 0.08 : input.feedback === 'interrupted' ? 0.03 : 0),
    boundaryDelta: clampDelta(input.feedback === 'valued' ? 0.02 : input.feedback === 'intrusive' ? -0.12 : input.feedback === 'interrupted' ? -0.05 : -0.02),
    misreadDelta: clampDelta(input.feedback === 'valued' ? -0.04 : input.feedback === 'doubted' ? 0.1 : input.feedback === 'intrusive' ? 0.02 : 0.01),
    repairDelta: clampDelta(input.feedback === 'valued' ? 0.03 : input.feedback === 'doubted' ? 0.08 : 0),
    openLoopDelta: clampDelta(input.feedback === 'valued' ? 0.05 : input.feedback === 'interrupted' ? 0.02 : 0),
    summary: resultFeedbackSummary,
    createdAt: input.now,
  })

  if (input.feedback === 'valued') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'truthful-grounding',
      delta: 0.07,
      valence: 'reinforce',
      summary: 'Useful proactive execution results justify future grounded result reporting.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.05,
      valence: 'reinforce',
      summary: 'Reliable execution results make direct proactive reporting safer.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'unfinished-thread-return',
      delta: 0.05,
      valence: 'reinforce',
      summary: 'Finished proactive execution that lands well should strengthen future follow-through.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'preference',
      object: trimFactObject(`when the result around ${goal}${outcome ? ` (${outcome})` : ''} is useful, proactive execution reporting can stay direct`),
      confidence: 0.82,
    }, ...(carriesBlockedDispatchSafetyRestraint
      ? [{
        subject: 'execution',
        predicate: 'boundary',
        object: trimFactObject(`blocked-before-dispatch restraint should stay rememberable as ${safetyGateSummary}`),
        confidence: 0.86,
      } satisfies AlicizationMemoryFactInput]
      : []), ...(carriesResumeConfirmationBoundary
      ? [{
        subject: 'execution',
        predicate: 'boundary',
        object: trimFactObject(`host-confirmed-before-redispatch should stay rememberable as ${resumeConfirmationSummary}`),
        confidence: 0.86,
      } satisfies AlicizationMemoryFactInput]
      : []), {
      subject: 'project',
      predicate: 'closure',
      object: trimFactObject(projectClosureLesson),
      confidence: 0.8,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(
        carriesBlockedDispatchSafetyRestraint
          ? `Remember blocked-before-dispatch restraint before another execution-shaped opening.`
          : carriesResumeConfirmationBoundary
            ? `Remember host-confirmed-before-redispatch as a bounded confirmation boundary before another execution-shaped opening.`
            : procedureLesson,
      ),
      confidence: 0.84,
    })
  }

  if (memoryClosureExecutionLesson) {
    result.memoryFacts.push({
      subject: 'execution',
      predicate: 'memory-closure',
      object: trimFactObject(memoryClosureExecutionLesson),
      confidence: memoryClosureExecution?.shouldVerify || memoryClosureExecution?.shouldReflect ? 0.88 : 0.82,
    })
  }

  if (input.feedback === 'doubted') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'truthful-grounding',
      delta: 0.08,
      valence: 'reinforce',
      summary: 'Questioned execution results should increase verification pressure before future payoff.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.06,
      valence: 'suppress',
      summary: 'Direct result reporting should soften when the host doubts the result.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-guardedness',
      delta: 0.05,
      valence: 'reinforce',
      summary: 'Doubted execution results should harden guardedness until confidence rebuilds.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'assistant',
      predicate: 'habit',
      object: trimFactObject(`after a doubted result around ${goal}, verify more before speaking with confidence`),
      confidence: 0.84,
    }, {
      subject: 'project',
      predicate: 'closure',
      object: trimFactObject(projectClosureLesson),
      confidence: 0.78,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.86,
    })
  }

  if (input.feedback === 'intrusive') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'autonomy-respect',
      delta: 0.1,
      valence: 'reinforce',
      summary: 'Intrusive execution result delivery should raise boundary respect before future callbacks.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.05,
      valence: 'suppress',
      summary: 'Direct execution result reporting should soften when it feels intrusive.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-guardedness',
      delta: 0.04,
      valence: 'reinforce',
      summary: 'Intrusive delivery should harden guardedness a little until timing improves.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject(`execution result delivery around ${goal} should use a lighter opening and less interruption pressure`),
      confidence: 0.82,
    }, {
      subject: 'project',
      predicate: 'closure',
      object: trimFactObject(projectClosureLesson),
      confidence: 0.78,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.84,
    })
  }

  if (input.feedback === 'interrupted') {
    result.reinforcementEvents.push({
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'autonomy-respect',
      delta: 0.06,
      valence: 'reinforce',
      summary: 'Interrupted result delivery should wait for a fresher opening next time.',
      createdAt: input.now,
    }, {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: input.turnId,
      sessionId: input.sessionId,
      sourceKind: 'execution',
      dimension: 'temper-directness',
      delta: 0.03,
      valence: 'suppress',
      summary: 'Result reporting directness should soften when the host pivots away.',
      createdAt: input.now,
    })
    result.memoryFacts.push({
      subject: 'relationship',
      predicate: 'boundary',
      object: trimFactObject(`if the host pivots away after a result around ${goal}, wait for a fresher opening before reporting that way again`),
      confidence: 0.76,
    }, {
      subject: 'project',
      predicate: 'closure',
      object: trimFactObject(projectClosureLesson),
      confidence: 0.74,
    }, {
      subject: 'assistant',
      predicate: 'procedure',
      object: trimFactObject(procedureLesson),
      confidence: 0.8,
    })
  }

  if (explicitProactiveSameHerGap) {
    result.memoryFacts.push({
      subject: 'project',
      predicate: 'closure',
      object: trimFactObject(`Proactive same-her gap still remains open: ${explicitProactiveSameHerGap}`),
      confidence: input.feedback === 'valued' ? 0.78 : 0.8,
    })
  }

  appendOutcomeEpisode({
    result,
    cardId: input.cardId,
    now: input.now,
    sourceKind: 'execution-result',
    decisionTraceId: input.decisionTraceId,
    turnId: input.turnId,
    sessionId: input.sessionId,
    whereSummary: `execution callback via ${channel}`,
    withWhom: ['host'],
    threadAnchor: goal,
    whatHappened: sanitizeText(`A ${channel} result around ${goal}${outcome ? ` landed as ${outcome}` : ''} and the host received it as ${input.feedback}.`, 280),
    felt: executionResultFelt,
    emotionTags: executionResultEmotionTags,
    relationshipMeaning: executionResultRelationshipMeaning,
    lesson: executionResultLesson,
    sourceSummary: 'execution result feedback',
    confidence: input.feedback === 'valued' ? 0.86 : 0.84,
    sceneAttachment: 0.42,
    consolidationPriority: input.feedback === 'doubted' || input.feedback === 'intrusive' ? 0.74 : 0.54,
    relationshipOutcome: result.relationshipOutcomes[0]!,
    derivedFrom: [
      input.turnId ? { kind: 'turn', id: input.turnId, label: 'execution result feedback turn' } : null,
      input.thread.userText
        ? { kind: 'turn', id: input.turnId ?? input.thread.threadId, label: `host feedback dialogue: ${sanitizeText(input.thread.userText, 220)}` }
        : null,
      input.thread.previousAssistantText
        ? { kind: 'turn', id: input.turnId ?? input.thread.threadId, label: `assistant feedback dialogue: ${sanitizeText(input.thread.previousAssistantText, 220)}` }
        : null,
      { kind: 'task-thread', id: input.thread.threadId, label: goal },
    ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
    tags: [
      'execution-result',
      channel,
      `feedback:${input.feedback}`,
      carriesBlockedDispatchSafetyRestraint ? `execution-safety-gate:${safetyGateSummary}` : '',
      carriesBlockedDispatchSafetyRestraint ? 'execution-safety-gate:blocked-before-dispatch' : '',
      carriesResumeConfirmationBoundary ? `execution-resume-confirmation:${resumeConfirmationSummary}` : '',
      carriesResumeConfirmationBoundary ? 'execution-resume-confirmation:host-confirmed-before-redispatch' : '',
      ...procedureContextTags,
      ...executionProcedurePreferenceTags({
        feedback: input.feedback,
        stage: 'result',
      }),
      ...projectClosureTags,
      ...executionResultEmbodimentTags,
      memoryClosureCarry ? 'memory-os-execution-carry' : '',
      memoryClosureLearningAction ? `memory-os-learning:${normalizeClosureTagValue(memoryClosureLearningAction)}` : '',
      memoryClosureExecution?.shouldVerify ? 'memory-os-verify' : '',
      memoryClosureExecution?.shouldReflect ? 'memory-os-reflect' : '',
    ],
  })

  return result
}

export function buildProactiveFeedbackOutcomeClosure(input: {
  now: number
  cardId: string
  sessionId?: string | null
  decisionTraceId?: string | null
  outcomes: AlicizationRecentProactiveOutcome[]
  affectiveResidue?: AlicizationDigitalLifeRuntimeSurface['memory']['affectiveResidue'] | null
}): AlicizationOutcomeClosureResult {
  const result = baseResult()
  const settledAffectiveResidue = [...input.outcomes]
    .reverse()
    .find(outcome => outcome.affectiveResidue)
    ?.affectiveResidue ?? null
  const settledEmotionalTransitionLedger = [...input.outcomes]
    .reverse()
    .find(outcome => outcome.emotionalTransitionLedger)
    ?.emotionalTransitionLedger ?? null
  result.affectiveResidue = input.affectiveResidue ?? settledAffectiveResidue
  result.emotionalTransitionLedger = settledEmotionalTransitionLedger

  for (const outcome of input.outcomes) {
    const label = proactiveScenarioLabel(outcome)
    const positive = outcome.outcome === 'positive' || outcome.outcome === 'reply-within-120s'
    const dismissed = outcome.outcome === 'dismiss'
    const ignored = outcome.outcome === 'ignored'
    const proactiveStrategySummary = positive
      ? sanitizeText(
          `A low-pressure proactive ${label} approach was received without obvious resistance, so future follow-ups can stay gentle, lower-pressure, and memory-led while the opening is still receiving them.`,
          180,
        )
      : dismissed
        ? sanitizeText(
            `A proactive ${label} approach was actively rejected and likely crossed a boundary, so future follow-ups should give more space, stay lower-pressure, less eager, and wait for a clearer opening before reopening this line.`,
            180,
          )
        : sanitizeText(
            `A proactive ${label} approach did not earn a reply window, so future follow-ups should give more space, stay lower-pressure, and wait for a clearer opening before reopening this line.`,
            180,
          )
    const proactiveStrategyLesson = positive
      ? 'Keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.'
      : dismissed
        ? 'Keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.'
        : 'Keep future follow-ups lower-pressure, leave more room, and wait for a clearer opening before reopening this line.'

    const relationshipOutcome: AlicizationRelationshipOutcomeInput = {
      cardId: input.cardId,
      decisionTraceId: input.decisionTraceId,
      turnId: outcome.turnId,
      sessionId: input.sessionId,
      sourceKind: 'proactive',
      actionSummary: sanitizeText(`proactive:${label}:${outcome.outcome}`, 180),
      closenessDelta: clampDelta(positive ? 0.07 : dismissed ? -0.07 : -0.04),
      trustDelta: clampDelta(positive ? 0.05 : dismissed ? -0.08 : -0.03),
      burdenDelta: clampDelta(positive ? -0.02 : dismissed ? 0.08 : 0.04),
      boundaryDelta: clampDelta(positive ? 0.02 : dismissed ? -0.12 : -0.06),
      misreadDelta: clampDelta(positive ? -0.02 : dismissed ? 0.08 : 0.04),
      repairDelta: 0,
      openLoopDelta: clampDelta(positive ? 0.04 : 0),
      summary: proactiveStrategySummary,
      createdAt: outcome.createdAt,
    }
    result.relationshipOutcomes.push(relationshipOutcome)

    if (positive) {
      result.reinforcementEvents.push({
        cardId: input.cardId,
        decisionTraceId: input.decisionTraceId,
        turnId: outcome.turnId,
        sessionId: input.sessionId,
        sourceKind: 'proactive',
        dimension: 'companionship',
        delta: 0.07,
        valence: 'reinforce',
        summary: `A received ${label} opening can continue gently, lower-pressure, and memory-led while the window stays open.`,
        createdAt: outcome.createdAt,
      })
      result.memoryFacts.push({
        subject: 'relationship',
        predicate: 'preference',
        object: trimFactObject(
          `${label} was received without obvious resistance; keep future follow-ups gentle, lower-pressure, and memory-led while the opening is still receiving them.`,
        ),
        confidence: outcome.outcome === 'reply-within-120s' ? 0.82 : 0.76,
      })
    }

    if (dismissed || ignored) {
      result.reinforcementEvents.push({
        cardId: input.cardId,
        decisionTraceId: input.decisionTraceId,
        turnId: outcome.turnId,
        sessionId: input.sessionId,
        sourceKind: 'proactive',
        dimension: 'autonomy-respect',
        delta: dismissed ? 0.1 : 0.07,
        valence: 'reinforce',
        summary: `${dismissed ? 'Dismissed' : 'Ignored'} proactive cues mean future follow-up timing should give more space, go lower-pressure, and wait for a clearer opening.`,
        createdAt: outcome.createdAt,
      }, {
        cardId: input.cardId,
        decisionTraceId: input.decisionTraceId,
        turnId: outcome.turnId,
        sessionId: input.sessionId,
        sourceKind: 'proactive',
        dimension: 'companionship',
        delta: dismissed ? 0.06 : 0.03,
        valence: 'suppress',
        summary: 'Repeated proactive closeness should soften into lower-pressure, less eager follow-ups when it is not being received.',
        createdAt: outcome.createdAt,
      })

      if (dismissed) {
        result.reinforcementEvents.push({
          cardId: input.cardId,
          decisionTraceId: input.decisionTraceId,
          turnId: outcome.turnId,
          sessionId: input.sessionId,
          sourceKind: 'proactive',
          dimension: 'temper-guardedness',
          delta: 0.05,
          valence: 'reinforce',
          summary: 'A hard dismissal should harden guardedness slightly until trust recovers.',
          createdAt: outcome.createdAt,
        })
      }

      result.memoryFacts.push({
        subject: 'relationship',
        predicate: 'boundary',
        object: trimFactObject(
          dismissed
            ? `${label} was actively rejected; keep future follow-ups lower-pressure, less eager, leave more room, and wait for a clearer opening before reopening this line.`
            : `${label} did not earn a reply window; keep future follow-ups lower-pressure, leave more room, and wait for a clearer opening before reopening this line.`,
        ),
        confidence: dismissed ? 0.85 : 0.78,
      })
    }

    appendOutcomeEpisode({
      result,
      cardId: input.cardId,
      now: outcome.createdAt,
      sourceKind: 'proactive',
      decisionTraceId: input.decisionTraceId,
      turnId: outcome.turnId,
      sessionId: input.sessionId,
      whereSummary: `${label} proactive window`,
      withWhom: ['host'],
      threadAnchor: label,
      whatHappened: sanitizeText(`A ${label} proactive approach was ${outcome.outcome}.`, 260),
      felt: positive
        ? 'I felt the host leave the window open enough for gentle initiative.'
        : dismissed
          ? 'I felt the host draw a harder boundary against this approach.'
          : 'I felt the window stay closed and the initiative fail to land.',
      emotionTags: [
        'proactive',
        label,
        positive ? 'accepted' : dismissed ? 'dismissed' : 'ignored',
      ],
      relationshipMeaning: relationshipOutcome.summary,
      lesson: proactiveStrategyLesson,
      sourceSummary: 'proactive outcome settlement',
      confidence: positive ? 0.8 : dismissed ? 0.86 : 0.78,
      sceneAttachment: label === 'late-night care' ? 0.5 : 0.32,
      consolidationPriority: dismissed ? 0.76 : positive ? 0.52 : 0.6,
      relationshipOutcome,
      derivedFrom: [
        outcome.turnId ? { kind: 'turn', id: outcome.turnId, label: `${label} proactive turn` } : null,
        outcome.userText
          ? { kind: 'turn', id: outcome.turnId, label: `host feedback dialogue: ${sanitizeText(outcome.userText, 220)}` }
          : null,
        outcome.assistantText
          ? { kind: 'turn', id: outcome.turnId, label: `assistant feedback dialogue: ${sanitizeText(outcome.assistantText, 220)}` }
          : null,
      ].filter(Boolean) as AlicizationEpisodicEventInput['derivedFrom'],
      tags: ['proactive', label.replace(/\s+/g, '-'), `settlement:${outcome.outcome}`],
    })
  }

  return result
}

export function attachSynthesizedReflections(input: AlicizationOutcomeClosureResult) {
  const reflections = input.relationshipOutcomes.flatMap((entry, index) => {
    const reflection = synthesizeReflectionFromRelationshipOutcome({
      outcome: {
        id: '',
        cardId: entry.cardId,
        decisionTraceId: entry.decisionTraceId ?? null,
        turnId: entry.turnId ?? null,
        sessionId: entry.sessionId ?? null,
        sourceKind: entry.sourceKind,
        actionSummary: entry.actionSummary,
        closenessDelta: entry.closenessDelta,
        trustDelta: entry.trustDelta,
        burdenDelta: entry.burdenDelta,
        boundaryDelta: entry.boundaryDelta,
        misreadDelta: entry.misreadDelta,
        repairDelta: entry.repairDelta,
        openLoopDelta: entry.openLoopDelta,
        summary: entry.summary,
        createdAt: entry.createdAt ?? Date.now(),
      },
      reinforcementEvents: input.reinforcementEvents
        .filter(event => event.turnId === entry.turnId && event.sourceKind === entry.sourceKind)
        .map((event, eventIndex) => ({
          id: `reinforcement:${index}:${eventIndex}`,
          cardId: event.cardId,
          decisionTraceId: event.decisionTraceId ?? null,
          turnId: event.turnId ?? null,
          sessionId: event.sessionId ?? null,
          sourceKind: event.sourceKind,
          dimension: event.dimension,
          delta: event.delta,
          valence: event.valence,
          summary: event.summary,
          createdAt: event.createdAt ?? Date.now(),
        })),
    })
    return reflection ? [reflection] : []
  })

  input.reflections.push(...reflections)
  return input
}
