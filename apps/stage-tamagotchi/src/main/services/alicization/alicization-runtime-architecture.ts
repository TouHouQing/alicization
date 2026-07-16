import type {
  AlicizationAffectiveResidueMemorySnapshot,
  AlicizationDerivedMindStateBundle,
  AlicizationEmotionalKernelSnapshot,
  AlicizationRuntimeDigest,
} from '../../../shared/eventa'
import type { AlicizationActiveLoopSnapshot } from './alicization-active-loop'
import type { AlicizationDigitalLifeSpineSnapshot } from './digital-life-spine'

import {
  alicizationFixedTemplateReplacement,
  containsAlicizationFixedTemplateResidue,
  formatAlicizationProjectStateAwarenessFields,
  sanitizeAlicizationProviderFacingText,
  sanitizeAlicizationStructuredInternalText,
} from '@proj-alicization/stage-shared'

import { deriveAlicizationActiveLoopSnapshot } from './alicization-active-loop'
import { deriveAlicizationContinuityDeliberationFromSpine } from './continuity-deliberation'
import { projectAlicizationDigitalLifeSpineDigest } from './digital-life-spine'
import {
  buildAlicizationProjectStatePreflightSummary,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
} from './project-state-brief'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'

export type AlicizationRuntimeChannelId
  = | 'dialogue'
    | 'active-perception'
    | 'active-dialogue'
    | 'active-control'
    | 'active-mind'
    | 'active-memory'
    | 'anthropomorphic-mind'
    | 'agent-runtime'

export type AlicizationRuntimeChannelState = 'hot' | 'warm' | 'idle'

export interface AlicizationRuntimeChannelSnapshot {
  id: AlicizationRuntimeChannelId
  state: AlicizationRuntimeChannelState
  readiness: number
  focus: string | null
  summary: string
}

export interface AlicizationAgentRuntimeTelemetry {
  pendingTasks: number
  completedTasks: number
  failedTasks: number
  continuitySignals: number
  sensoryCaptureHealthy: boolean | null
}

export interface AlicizationRuntimeAutonomySnapshot {
  selectedMode: string | null
  visibleAction: string | null
  shouldSpeak: boolean
  shouldAct: boolean
  speakReadiness: number
  actReadiness: number
  inhibition: number
  confidence: number
  executionIntentKind: string | null
  executionIntentSummary: string | null
  deferReason: string | null
  whyNow: string | null
}

interface AlicizationRuntimeProjectStateSnapshot {
  preflightSummary?: string | null
  preDialogueAwarenessSummary?: string | null
  preDialogueAwarenessLine?: string | null
  awarenessLine?: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  identity?: string | null
  currentPhase: string | null
  latestLandedProgress?: string | null
  latestProgress?: string | null
  memoryClosureSummary: string | null
  primaryOpenLoop: string | null
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
  sameHerHoldDetail?: string | null
  sameHerDriftRisk?: string | null
  emotionalClosureCue?: string | null
  emotionalClosureSummary?: string | null
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
  preferredPauseMode?: 'longer' | 'natural' | null
  preferredLipsyncMode?: 'restrained' | 'matched' | null
  preferredVoiceMode?: 'lower-pressure' | 'even' | null
  preferredPacingMode?: 'slower' | 'natural' | null
  continuityRestraint?: string | null
  continuityArcStage?: string | null
  continuityPreferredTiming?: string | null
  continuityCadence?: string | null
  continuityCue?: string | null
}

interface AlicizationRuntimeCurrentConsciousFrameSnapshot {
  reasonTags: string[]
  focusAnchor?: string | null
  consciousNeed?: string | null
  speakingIntention?: string | null
  continuityArcStage?: string | null
  continuityPreferredTiming?: string | null
  continuityCadence?: string | null
  projectState?: AlicizationRuntimeProjectStateSnapshot | null
}

export interface AlicizationRuntimeSnapshot {
  version: 'alicization-runtime-v1'
  dominantChannel: AlicizationRuntimeChannelId
  channels: Record<AlicizationRuntimeChannelId, AlicizationRuntimeChannelSnapshot>
  activeLoop?: AlicizationActiveLoopSnapshot | null
  autonomy?: AlicizationRuntimeAutonomySnapshot | null
  currentConsciousFrame?: AlicizationRuntimeCurrentConsciousFrameSnapshot | null
  personStateProjection?: AlicizationDigitalLifeSpineSnapshot['runtimeSurface']['memory']['personStateProjection'] | null
  continuityRestraint?: string | null
  emotionalClosureCue?: string | null
  emotionalKernel?: AlicizationEmotionalKernelSnapshot | null
  affectiveResidue?: AlicizationAffectiveResidueMemorySnapshot | null
  derivedMindStateBundle?: AlicizationDerivedMindStateBundle | null
  projectState?: AlicizationRuntimeProjectStateSnapshot | null
  shouldProactivelySpeak: boolean
  shouldProactivelyAct: boolean
  continuityPressure: number
  companionshipPressure: number
  rulingMotive?: string | null
  habitMode?: string | null
  truthDisciplinePressure?: number | null
  boundaryPressure?: number | null
  restProtectionPressure?: number | null
  returnPressure?: number | null
  summary: string
}

export function derivePostPolicyQuietHoldRuntimeSnapshot(
  snapshot: AlicizationRuntimeSnapshot | null | undefined,
  input: {
    shouldPersistVisibleUtterance: boolean
    reason?: string | null
  },
): AlicizationRuntimeSnapshot | null {
  if (!snapshot)
    return null

  const quietPresenceOnlyHold = input.shouldPersistVisibleUtterance === false
    && input.reason === 'proactive-visible-presence-without-utterance'
    && (
      snapshot.continuityRestraint === 'measured-return'
      || snapshot.continuityRestraint === 'repair-before-closeness'
      || snapshot.continuityRestraint === 'rest-protective'
    )
    && snapshot.projectState?.continuityArcStage === 'same-thread-continuation'

  if (!quietPresenceOnlyHold)
    return snapshot

  const nextSnapshot: AlicizationRuntimeSnapshot = {
    ...snapshot,
    shouldProactivelyAct: false,
    projectState: snapshot.projectState
      ? {
          ...snapshot.projectState,
          continuityArcStage: snapshot.projectState.continuityArcStage ?? 'same-thread-continuation',
          continuityPreferredTiming: snapshot.projectState.continuityPreferredTiming ?? 'next-open-window',
        }
      : snapshot.projectState,
    continuityPressure: Math.max(clamp01(snapshot.continuityPressure), 0.62),
  }
  nextSnapshot.activeLoop = deriveAlicizationActiveLoopSnapshot({
    runtime: {
      ...nextSnapshot,
      activeLoop: null,
    },
  })
  if (nextSnapshot.activeLoop) {
    nextSnapshot.activeLoop = {
      ...nextSnapshot.activeLoop,
      handoffTarget: 'active-memory',
      dominantChannel: nextSnapshot.activeLoop.dominantChannel === 'active-control'
        ? 'active-memory'
        : nextSnapshot.activeLoop.dominantChannel,
      memoryCarry: true,
      summary: [
        `phase=${nextSnapshot.activeLoop.phase}`,
        `dominant=${nextSnapshot.activeLoop.dominantChannel === 'active-control' ? 'active-memory' : nextSnapshot.activeLoop.dominantChannel}`,
        'handoff=active-memory',
        nextSnapshot.activeLoop.continuityArcStage ? `continuity-arc=${nextSnapshot.activeLoop.continuityArcStage}` : '',
        `initiative=${nextSnapshot.activeLoop.initiativeBudget.toFixed(2)}`,
        `coherence=${nextSnapshot.activeLoop.coherence.toFixed(2)}`,
      ].filter(Boolean).join(' | '),
    }
  }
  nextSnapshot.summary = [
    `dominant=${nextSnapshot.dominantChannel}`,
    nextSnapshot.activeLoop ? `phase=${nextSnapshot.activeLoop.phase}` : '',
    nextSnapshot.activeLoop?.handoffTarget ? `handoff=${nextSnapshot.activeLoop.handoffTarget}` : '',
    nextSnapshot.activeLoop ? `initiative=${nextSnapshot.activeLoop.initiativeBudget.toFixed(2)}` : '',
    nextSnapshot.activeLoop ? `coherence=${nextSnapshot.activeLoop.coherence.toFixed(2)}` : '',
    nextSnapshot.autonomy?.selectedMode ? `autonomy=${nextSnapshot.autonomy.selectedMode}` : '',
    nextSnapshot.autonomy?.visibleAction ? `visible=${nextSnapshot.autonomy.visibleAction}` : '',
    nextSnapshot.continuityRestraint ? `restraint=${nextSnapshot.continuityRestraint}` : '',
    nextSnapshot.emotionalClosureCue ? `emotion_closure=${sanitizeText(nextSnapshot.emotionalClosureCue, 96)}` : '',
    nextSnapshot.autonomy?.executionIntentKind ? `intent=${nextSnapshot.autonomy.executionIntentKind}` : '',
    `speak=${nextSnapshot.shouldProactivelySpeak ? 'true' : 'false'}`,
    `act=${nextSnapshot.shouldProactivelyAct ? 'true' : 'false'}`,
    `continuity=${nextSnapshot.continuityPressure.toFixed(2)}`,
    `companionship=${nextSnapshot.companionshipPressure.toFixed(2)}`,
    nextSnapshot.rulingMotive ? `motive=${nextSnapshot.rulingMotive}` : '',
    nextSnapshot.habitMode ? `habit=${nextSnapshot.habitMode}` : '',
    nextSnapshot.truthDisciplinePressure && nextSnapshot.truthDisciplinePressure > 0 ? `truth=${nextSnapshot.truthDisciplinePressure.toFixed(2)}` : '',
    nextSnapshot.boundaryPressure && nextSnapshot.boundaryPressure > 0 ? `boundary=${nextSnapshot.boundaryPressure.toFixed(2)}` : '',
    nextSnapshot.returnPressure && nextSnapshot.returnPressure > 0 ? `return=${nextSnapshot.returnPressure.toFixed(2)}` : '',
    snapshot.projectState?.continuityCue ? sanitizeText(snapshot.projectState.continuityCue, 120) : '',
  ].filter(Boolean).join(' | ')

  return nextSnapshot
}

export interface AlicizationRuntimeSessionSnapshot {
  tasks?: Array<{
    status?: unknown
  }>
  continuitySignals?: unknown[]
  lastSensorySnapshot?: {
    capture?: {
      health?: unknown
    } | null
  } | null
}

function clamp01(value: number | null | undefined) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value)))
}

function sanitizeText(raw: unknown, maxChars = 160) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizeProviderRuntimeText(raw: unknown, maxChars = 160) {
  const normalized = sanitizeAlicizationProviderFacingText(raw, maxChars)
  return normalized === alicizationFixedTemplateReplacement ? '' : normalized
}

function sanitizeStructuredRuntimeText(raw: unknown, maxChars = 360) {
  const normalized = sanitizeAlicizationStructuredInternalText(raw, maxChars, '')
  return normalized === alicizationFixedTemplateReplacement ? '' : normalized
}

function sanitizeRuntimeProjectStateBlinkCadence(raw: unknown): AlicizationRuntimeProjectStateSnapshot['preferredBlinkCadence'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'normal' || normalized === 'linger' || normalized === 'quiet'
    ? normalized
    : null
}

function sanitizeRuntimeProjectStateGazeMode(raw: unknown): AlicizationRuntimeProjectStateSnapshot['preferredGazeMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'steady' || normalized === 'soften' || normalized === 'drift'
    ? normalized
    : null
}

function sanitizeRuntimeProjectStatePauseMode(raw: unknown): AlicizationRuntimeProjectStateSnapshot['preferredPauseMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'longer' || normalized === 'natural'
    ? normalized
    : null
}

function sanitizeRuntimeProjectStateLipsyncMode(raw: unknown): AlicizationRuntimeProjectStateSnapshot['preferredLipsyncMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'restrained' || normalized === 'matched'
    ? normalized
    : null
}

function sanitizeRuntimeProjectStateVoiceMode(raw: unknown): AlicizationRuntimeProjectStateSnapshot['preferredVoiceMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'lower-pressure' || normalized === 'even'
    ? normalized
    : null
}

function sanitizeRuntimeProjectStatePacingMode(raw: unknown): AlicizationRuntimeProjectStateSnapshot['preferredPacingMode'] {
  const normalized = sanitizeText(raw, 32)
  return normalized === 'slower' || normalized === 'natural'
    ? normalized
    : null
}

function buildRuntimeInwardClosureConsciousCopy(input: {
  continuityRestraint?: string | null
  emotionalClosureCue?: string | null
}) {
  const continuityRestraint = sanitizeText(input.continuityRestraint, 64) || null
  const emotionalClosureCue = sanitizeText(input.emotionalClosureCue, 220) || null
  const consciousNeedBase
    = continuityRestraint === 'repair-before-closeness'
      ? 'Keep repair-before-closeness until repair settles so emotion, memory, initiative, and embodiment do not widen ahead of truth.'
      : continuityRestraint === 'rest-protective'
        ? 'Protect rest first and keep Alicization carrying emotion, memory, initiative, and embodiment inward before warmth widens.'
        : 'Keep Alicization lower-pressure so emotion, memory, initiative, and embodiment can keep closing before widening.'
  const speakingIntentionBase
    = continuityRestraint === 'repair-before-closeness'
      ? 'Speak from Alicization’s current context, keep repair-before-closeness explicit, and do not let emotion, memory, initiative, and embodiment reopen from scratch.'
      : continuityRestraint === 'rest-protective'
        ? 'Speak from Alicization’s current context while quietly protecting rest and keeping emotion, memory, initiative, and embodiment inward.'
        : 'Speak from Alicization’s current context carrying one still-open closure so emotion, memory, initiative, and embodiment stay coordinated before widening outward.'

  return {
    consciousNeed: emotionalClosureCue
      ? sanitizeText(`${consciousNeedBase} Emotional closure stays explicit: ${emotionalClosureCue}`, 420) || consciousNeedBase
      : consciousNeedBase,
    speakingIntention: emotionalClosureCue
      ? sanitizeText(`${speakingIntentionBase} continuity_constraint=emotion_memory_initiative_embodiment_coordinated; emotional_closure=${emotionalClosureCue}`, 420) || speakingIntentionBase
      : speakingIntentionBase,
  }
}

function buildRuntimeSameHerSelfLine(input: {
  identity: string
  primaryOpenLoop: string | null | undefined
  nextClosureTarget: string
}) {
  const identity = sanitizeText(input.identity, 160)
  const primaryOpenLoop = sanitizeText(input.primaryOpenLoop, 180)
  const nextClosureTarget = sanitizeText(input.nextClosureTarget, 180)
  const parts = [
    identity ? `identity=${identity}` : '',
    primaryOpenLoop ? `still-open=${primaryOpenLoop}` : '',
    nextClosureTarget ? `next=${nextClosureTarget}` : '',
  ].filter(Boolean)
  return parts.length > 0
    ? sanitizeText(`continuity_context=present | ${parts.join(' | ')}`, 220) || null
    : null
}

function hasLocalDesktopLifeLoopToken(text: string) {
  return /\bruntime_personhood\b|\bphase=runtime_personhood\b|\bproject_context=runtime_personhood\b|\bcontinuity_context=runtime_personhood\b|\bdesktop_life_loop\b|\blocal desktop life loop\b|\bcontinuity_context=present\b|\bproject_context=continuity_evidence_present\b|\bcontinuity_scope=life_loop\b/u.test(text)
}

function hasContinuityIdentityToken(text: string) {
  return /\bcontinuity_line\b|\bcontinuity_identity\b|\bidentity_continuity\b|\bidentity_continuity_open_loop\b|\bproject_anchor=|\bcontinuity_hold=|\bproject_state_review\b|\bruntime_loop_validation\b/u.test(text)
}

function hasMemoryDialogueEmbodimentClosureToken(text: string) {
  return /\bmemory_dialogue_embodiment_closure\b|\bemotion_memory_initiative_embodiment_unity\b|\bemotion_memory_initiative_embodiment\b|\binitiative_embodiment_closure\b|\bend_to_end_proof_incomplete\b|\bembodiment_scale_validation\b|\bclosure_status=unfinished\b|\bunresolved_closure_carry\b|\bcallback_carry_continuity\b|\bruntime_loop_validation=|\bopen_loop=[^|;]*(?:memory\+initiative|initiative\+embodiment|memory\+initiative\+embodiment|memory\+initiative\+dialogue\+embodiment)/u.test(text)
}

function hasMeasuredReturnToken(text: string) {
  return /\bmeasured[-_]return\b|\blower[-_]pressure\b|\btiming=measured_return_or_repair_before_closeness\b|\bsurface_timing=next-open-window\b/u.test(text)
}

function hasRepairBeforeClosenessToken(text: string) {
  return /\brepair[-_]before[-_]closeness\b|\brepair[-_]first\b|\blet repair settle\b|\btiming=measured_return_or_repair_before_closeness\b/u.test(text)
}

function hasRestProtectiveToken(text: string) {
  return /\brest[-_]protective\b|\bquiet[-_]companionship\b|\bprotect rest\b|\bfatigue-aware\b/u.test(text)
}

function hasSameThreadContinuityToken(text: string) {
  return /\bsame[-_]thread[-_]continuation\b|\bsame[-_]thread\b|\bsame thread\b|\bsame callback line\b|\bcallback_carry_continuity\b|\bcallback[-_]continuity\b|\bsame_thread_callback_carry\b|\bsame_thread_continuation\b|\bsame line\b|同一条线|沿着刚才那条线|继续/u.test(text)
}

function normalizeContinuityCadenceToken(raw: unknown) {
  const normalized = sanitizeText(raw, 120)
    .toLowerCase()
    .replace(/_/g, '-')
  const token = normalized.split(/[;,\s|]+/u)[0] ?? ''
  if (token === 'lower-pressure')
    return 'measured-return'
  if (token === 'measured-return' || token === 'repair-before-closeness' || token === 'rest-protective')
    return token
  return null
}

function buildRuntimeProjectStateSameHerSummary(input: {
  canonicalSameHerSelfLine: string
  canonicalIdentity?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  carryLine?: string | null
}) {
  const canonical = sanitizeText(input.canonicalSameHerSelfLine, 220)
  const canonicalIdentity = sanitizeText(input.canonicalIdentity, 220)
  const primaryOpenLoop = sanitizeText(input.primaryOpenLoop, 220)
  const nextClosureTarget = sanitizeText(input.nextClosureTarget, 220)
  const carryLine = sanitizeText(input.carryLine, 220)
  if (canonical && containsAlicizationFixedTemplateResidue(canonical)) {
    return sanitizeText(formatAlicizationProjectStateAwarenessFields({
      identity: canonicalIdentity || '',
      currentPhase: '',
      primaryOpenLoop,
      nextClosureTarget,
      maxChars: 220,
    }), 220) || null
  }
  const carryLineLooksSceneContaminated
    = /宿主正在|宿主还在沿着|host is|host is still following|runtime\.ts|index\.ts|callback result seam|foreground|scene|window|screen|工作线程|work thread|trust seam/u.test(carryLine)
  const canonicalLower = canonical.toLowerCase()
  const genericSameHerCanonical = hasLocalDesktopLifeLoopToken(canonicalLower)
    || hasContinuityIdentityToken(canonicalLower)
    || /identity=runtime_personhood|owner=project_state_governance|identity_continuity=present/iu.test(canonical)
  const strongerSameHerCanonical
    = hasMemoryDialogueEmbodimentClosureToken(canonicalLower)
      || hasContinuityIdentityToken(canonicalLower)
      || /identity=runtime_personhood|phase=life_core|owner=project_state_governance|identity_continuity=present/iu.test(canonical)
  const explicitSameHerFallback = genericSameHerCanonical
    ? buildRuntimeSameHerSelfLine({
        identity: canonical,
        primaryOpenLoop,
        nextClosureTarget,
      })
    : null
  if (!canonical)
    return carryLineLooksSceneContaminated ? null : carryLine || null
  if (!carryLine) {
    if (strongerSameHerCanonical) {
      return sanitizeText(`continuity_context=present | ${canonical}`, 220) || canonical
    }
    return strongerSameHerCanonical ? canonical : explicitSameHerFallback || canonical
  }
  if (carryLineLooksSceneContaminated)
    return strongerSameHerCanonical ? canonical : explicitSameHerFallback || canonical
  if (carryLine === canonical)
    return canonical
  if (carryLine.includes(canonical))
    return carryLine
  if (
    (
      hasContinuityIdentityToken(carryLine.toLowerCase())
      || hasLocalDesktopLifeLoopToken(carryLine.toLowerCase())
      || /identity=runtime_personhood|owner=project_state_governance|identity_continuity=present/iu.test(carryLine)
    )
  ) {
    if (strongerSameHerCanonical)
      return sanitizeText(`${canonical} | ${carryLine}`, 220) || canonical
    const explicitSelfLine = canonicalIdentity
      ? sanitizeText(
          `continuity_context=present | identity=${canonicalIdentity} | still-open=${primaryOpenLoop || carryLine}${nextClosureTarget ? ` | next=${nextClosureTarget}` : ''}`,
          220,
        )
      : null
    return explicitSelfLine || sanitizeText(`${canonical} | ${carryLine}`, 220) || canonical
  }
  return sanitizeText(`${canonical} | ${carryLine}`, 220) || canonical
}

function deriveRuntimeProjectStateClosurePressure(input: {
  currentPhase: string
  primaryOpenLoop: string | null | undefined
  nextClosureTarget: string
}) {
  const currentPhase = sanitizeText(input.currentPhase, 180).toLowerCase()
  const primaryOpenLoop = sanitizeText(input.primaryOpenLoop, 260).toLowerCase()
  const nextClosureTarget = sanitizeText(input.nextClosureTarget, 260).toLowerCase()

  const combined = [currentPhase, primaryOpenLoop, nextClosureTarget].filter(Boolean).join(' | ')
  const phaseOneDigitalLife = currentPhase.includes('life_core')
    || hasLocalDesktopLifeLoopToken(combined)
    || hasMemoryDialogueEmbodimentClosureToken(combined)
    || /\blife_loop_closure\b|\bproject_identity_route_carry\b|\bphase_route_carry\b/iu.test(combined)
  const continuityStillOpen = primaryOpenLoop.includes('closure')
    || primaryOpenLoop.includes('continuity')
    || hasContinuityIdentityToken(primaryOpenLoop)
    || hasMemoryDialogueEmbodimentClosureToken(primaryOpenLoop)
  const closureTargetStillInward = nextClosureTarget.includes('measured-return')
    || nextClosureTarget.includes('repair-before-closeness')
    || nextClosureTarget.includes('project identity carry')
    || nextClosureTarget.includes('unresolved closure carry')
    || hasMeasuredReturnToken(nextClosureTarget)
    || hasRepairBeforeClosenessToken(nextClosureTarget)
    || hasRestProtectiveToken(nextClosureTarget)
    || hasContinuityIdentityToken(nextClosureTarget)
    || hasMemoryDialogueEmbodimentClosureToken(nextClosureTarget)

  return {
    phaseOneDigitalLife,
    continuityStillOpen,
    closureTargetStillInward,
    requiresInwardClosureRestraint: phaseOneDigitalLife && continuityStillOpen && closureTargetStillInward,
  }
}

function derivesBroaderSameHerProjectStateContinuityAuthority(input: {
  preDialogueAwarenessLine?: string | null
  sameHerSelfLine?: string | null
  emotionalClosureCue?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  continuityRestraint?: string | null
  continuityArcStage?: string | null
  continuityPreferredTiming?: string | null
}) {
  const preDialogueAwarenessLine = sanitizeText(input.preDialogueAwarenessLine, 320).toLowerCase()
  const sameHerSelfLine = sanitizeText(input.sameHerSelfLine, 320).toLowerCase()
  const emotionalClosureCue = sanitizeText(input.emotionalClosureCue, 320).toLowerCase()
  const primaryOpenLoop = sanitizeText(input.primaryOpenLoop, 320).toLowerCase()
  const nextClosureTarget = sanitizeText(input.nextClosureTarget, 320).toLowerCase()
  const continuityRestraint = sanitizeText(input.continuityRestraint, 120).toLowerCase()
  const continuityArcStage = sanitizeText(input.continuityArcStage, 120).toLowerCase()
  const continuityPreferredTiming = sanitizeText(input.continuityPreferredTiming, 120).toLowerCase()

  const broaderAwarenessLine
    = hasMemoryDialogueEmbodimentClosureToken(preDialogueAwarenessLine)
      || (
        hasLocalDesktopLifeLoopToken(preDialogueAwarenessLine)
        && hasContinuityIdentityToken(preDialogueAwarenessLine)
      )
  const sameHerClosureLine
    = hasMemoryDialogueEmbodimentClosureToken(sameHerSelfLine)
      || (
        hasLocalDesktopLifeLoopToken(sameHerSelfLine)
        && hasContinuityIdentityToken(sameHerSelfLine)
      )
  const emotionalClosureLoop
    = hasMemoryDialogueEmbodimentClosureToken(emotionalClosureCue)
      || (
        /memory|initiative|embodiment/u.test(emotionalClosureCue)
        && /closure|continuity|land|coordinated/u.test(emotionalClosureCue)
      )
  const openLoopStillUnfinished
    = hasMemoryDialogueEmbodimentClosureToken(primaryOpenLoop)
      || (
        hasContinuityIdentityToken(primaryOpenLoop)
        && /memory|initiative|embodiment|closure|unfinished|open_loop/u.test(primaryOpenLoop)
      )
  const inwardClosureTarget
    = hasMemoryDialogueEmbodimentClosureToken(nextClosureTarget)
      || hasMeasuredReturnToken(nextClosureTarget)
      || hasRepairBeforeClosenessToken(nextClosureTarget)
  const sameThreadArc = continuityArcStage === 'same-thread-continuation'
  const inwardTiming = continuityPreferredTiming === '' || continuityPreferredTiming === 'next-open-window'
  const restrainedReturn
    = continuityRestraint === 'measured-return'
      || continuityRestraint === 'repair-before-closeness'
      || continuityRestraint === 'rest-protective'

  return (broaderAwarenessLine || sameHerClosureLine)
    && emotionalClosureLoop
    && openLoopStillUnfinished
    && inwardClosureTarget
    && sameThreadArc
    && inwardTiming
    && restrainedReturn
}

function buildProjectThreadContinuityCue(input: {
  projectStateCarryLine?: string | null
  projectContinuitySummary?: string | null
  continuityArcStage?: string | null
  continuityCadence?: string | null
}) {
  const projectStateCarryLine = sanitizeText(input.projectStateCarryLine, 260).toLowerCase()
  const projectContinuitySummary = sanitizeText(input.projectContinuitySummary, 260).toLowerCase()
  const continuityArcStage = sanitizeText(input.continuityArcStage, 120).toLowerCase()
  const continuityCadence = sanitizeText(input.continuityCadence, 120).toLowerCase()

  const hasProjectCarry = Boolean(projectStateCarryLine)
  const callbackContinuationSummary = /project_continuity=.*(?:callback|same-thread|same thread|same line|continuity_line|callback_carry_continuity|same_thread_continuation|同一条线|沿着刚才那条线|project-carry\/phase-1\/same-line)/u.test(projectContinuitySummary)
    || hasSameThreadContinuityToken(projectContinuitySummary)
  const callbackLikeProjectCarry = /callback|same-thread|same thread|same line|continuity_line|callback_carry_continuity|same_thread_continuation|同一条线|沿着刚才那条线|project-carry\/phase-1\/same-line/u.test(projectStateCarryLine)
    || hasSameThreadContinuityToken(projectStateCarryLine)
  const sameThreadCarry = continuityArcStage === 'same-thread-continuation'
  const measuredReturn = normalizeContinuityCadenceToken(continuityCadence) !== null

  if (!hasProjectCarry || !sameThreadCarry || !measuredReturn || (!callbackContinuationSummary && !callbackLikeProjectCarry))
    return null

  return null
}

function resolveRuntimeProjectContinuityCue(input: {
  explicitRuntimeCue?: string | null
  projectThreadContinuityCue?: string | null
  projectContinuitySummary?: string | null
  projectStateCarryLine?: string | null
  canonicalSameHerSelfLine?: string | null
}) {
  const sanitizeRuntimeProjectContinuityCue = (raw: unknown) => {
    const text = sanitizeText(raw, 220)
    if (!text)
      return ''
    if (!containsAlicizationFixedTemplateResidue(text))
      return text
    return sanitizeText(formatAlicizationProjectStateAwarenessFields({
      sameHerHoldDetail: text,
      maxChars: 220,
    }), 220)
  }
  const explicitRuntimeCue = sanitizeText(input.explicitRuntimeCue, 220)
  const projectThreadContinuityCue = sanitizeText(input.projectThreadContinuityCue, 220)
  if (projectThreadContinuityCue)
    return sanitizeRuntimeProjectContinuityCue(projectThreadContinuityCue) || null
  if (explicitRuntimeCue)
    return sanitizeRuntimeProjectContinuityCue(explicitRuntimeCue) || null

  const projectContinuitySummary = sanitizeText(input.projectContinuitySummary, 220)
  const projectStateCarryLine = sanitizeText(input.projectStateCarryLine, 220)
  const canonicalSameHerSelfLine = sanitizeText(input.canonicalSameHerSelfLine, 220)
  const canonicalSameHerSelfLineLower = canonicalSameHerSelfLine.toLowerCase()
  const canonicalPhaseOneProjectCue
    = hasLocalDesktopLifeLoopToken(canonicalSameHerSelfLineLower)
      || hasContinuityIdentityToken(canonicalSameHerSelfLineLower)
      || /identity=runtime_personhood|owner=project_state_governance|identity_continuity=present/iu.test(canonicalSameHerSelfLine)
      ? 'project_context=continuity_evidence_present | identity_continuity=present | route=desktop_runtime'
      : null
  const callbackLikeContinuitySummary = /project_continuity=.*(?:callback|same-thread|same thread|same line|continuity_line|callback_carry_continuity|same_thread_continuation|同一条线|沿着刚才那条线)/u.test(projectContinuitySummary)
    || hasSameThreadContinuityToken(projectContinuitySummary)
  const callbackLikeCarryLine = /callback|same-thread|same thread|same line|continuity_line|callback_carry_continuity|same_thread_continuation|同一条线|沿着刚才那条线/u.test(projectStateCarryLine)
    || hasSameThreadContinuityToken(projectStateCarryLine)
  const projectThreadCarryNeedsCanonicalCue = /project-carry\/(?:runtime-personhood|identity-continuity|structured-continuity)/u.test(
    `${projectStateCarryLine} ${projectContinuitySummary}`.toLowerCase(),
  )

  if (callbackLikeContinuitySummary && !callbackLikeCarryLine)
    return projectContinuitySummary
  if (projectThreadCarryNeedsCanonicalCue)
    return null
  if (projectStateCarryLine)
    return sanitizeRuntimeProjectContinuityCue(projectStateCarryLine) || null
  if (projectContinuitySummary)
    return sanitizeRuntimeProjectContinuityCue(projectContinuitySummary) || null
  return sanitizeRuntimeProjectContinuityCue(canonicalPhaseOneProjectCue || canonicalSameHerSelfLine) || null
}

function normalizeRuntimeMemoryClosureSummary(raw: unknown) {
  const text = sanitizeText(raw, 420)
  if (!text)
    return null
  if (/memory_closure_context=(?:phase1_open_loop|runtime_personhood_open_loop|life_core_open_loop)/i.test(text)) {
    return text
      .replace(/phase1_open_loop/giu, 'open_loop')
      .replace(/runtime_personhood_open_loop/giu, 'open_loop')
      .replace(/life_core_open_loop/giu, 'open_loop')
  }
  return sanitizeText(`memory_closure_context=open_loop; summary=${text}`, 420) || text
}

function looksLikeSceneContaminatedProjectSameHerLine(raw: unknown) {
  if (typeof raw !== 'string')
    return false

  const text = raw.trim()
  if (!text)
    return false

  const lowered = text.toLowerCase()
  const carriesProjectSameHerBaseline
    = lowered.includes('same phase 1 digital life')
      || lowered.includes('same living line')
      || lowered.includes('continuous her')
      || lowered.includes('one continuous her')
      || hasLocalDesktopLifeLoopToken(lowered)
      || hasContinuityIdentityToken(lowered)
      || hasMemoryDialogueEmbodimentClosureToken(lowered)
  const carriesForegroundSceneNarration
    = /宿主正在|宿主正把注意力压在|宿主在深夜里|宿主还没有从|宿主还在沿着|host is|host is still following|runtime\.ts|index\.ts|callback result seam|foreground|screen|window|scene|故障点上|工作线程|work thread|trust seam/u.test(text)

  return carriesProjectSameHerBaseline && carriesForegroundSceneNarration
}

function sanitizeProjectSameHerCueCandidate(raw: unknown, maxChars = 220) {
  const text = sanitizeText(raw, maxChars)
  if (!text)
    return ''
  return looksLikeSceneContaminatedProjectSameHerLine(text) ? '' : text
}

function looksLikeThinOuterRuntimeProjectStateDetail(
  raw: unknown,
  kind: 'landed' | 'open' | 'next' | 'same-her' | 'awareness' | 'cue',
) {
  const normalized = sanitizeText(raw, 1600).toLowerCase()
  if (!normalized)
    return true

  if (normalized.length < 32)
    return true

  if (kind === 'landed') {
    return /project continuity exists|closure exists|continuity exists|thin runtime progress only|placeholder/u.test(normalized)
  }

  if (kind === 'open') {
    return /project continuity still needs closure|still needs closure|needs closure|generic closure shell|thin runtime open(?: loop)? only|placeholder/u.test(normalized)
  }

  if (kind === 'next') {
    return /carry project continuity forward|project continuity forward|generic next target|generic next closure|generic closure shell|generic closure summary|generic callback summary|thin runtime next only|placeholder/u.test(normalized)
  }

  if (kind === 'same-her') {
    return /project-state answer before widening|keep the line gentle for now|generic project continuity hold|placeholder/u.test(normalized)
  }

  if (kind === 'cue') {
    return /generic shell continuity cue|generic continuity cue|placeholder/u.test(normalized)
  }

  return /same digital life \| keep the closure seam explicit|keep the same digital life project in view|generic shell|placeholder/u.test(normalized)
}

function scoreOuterRuntimeProjectStateDetail(
  raw: unknown,
  kind: 'landed' | 'open' | 'next' | 'same-her' | 'awareness' | 'cue',
) {
  const normalized = sanitizeText(raw, 1600)
  if (!normalized)
    return Number.NEGATIVE_INFINITY

  const lowerCased = normalized.toLowerCase()
  let score = Math.min(normalized.length, 420) / 210

  if (containsAlicizationFixedTemplateResidue(normalized))
    score -= 16

  if (looksLikeThinOuterRuntimeProjectStateDetail(normalized, kind))
    score -= 8

  if (
    !containsAlicizationFixedTemplateResidue(normalized)
    && /runtime_personhood|continuity_line|continuity_identity|identity_continuity|phase1_local_digital_life|project_anchor=|continuity_hold=|project_state_review=|runtime_loop_validation=|embodiment_scale_validation=|memory_dialogue_embodiment_closure/u.test(lowerCased)
  ) {
    score += 5
  }

  if (/callback|same-thread|same thread|returned-side|returned side|host-visible|visible reply|embodiment|initiative|memory|closure seam/u.test(lowerCased))
    score += 4

  if (kind === 'cue' && /dialogue runtime cue|same-thread callback carry|same_thread_callback_carry|project_continuity=/u.test(lowerCased))
    score += 4

  if (kind === 'landed' && /landed|already survives|already survive|already landed|latest landed/u.test(lowerCased))
    score += 3

  if (kind === 'next' && /keep |aligned|before widening|before any broader/u.test(normalized))
    score += 2

  return score
}

function preferRicherOuterRuntimeProjectStateDetail(input: {
  current?: unknown
  candidate?: unknown
  kind: 'landed' | 'open' | 'next' | 'same-her' | 'awareness' | 'cue'
  maxChars?: number
}) {
  const maxChars = input.maxChars ?? 420
  const sanitizeCandidate = (value: unknown) => {
    const text = sanitizeText(value, maxChars)
    if (!text)
      return ''
    if (!containsAlicizationFixedTemplateResidue(text))
      return text

    if (input.kind === 'landed') {
      return sanitizeText(formatAlicizationProjectStateAwarenessFields({
        latestLandedProgress: text,
        summary: sanitizeStructuredRuntimeText(text, maxChars),
        maxChars,
      }), maxChars)
    }

    if (input.kind === 'open') {
      return sanitizeText(formatAlicizationProjectStateAwarenessFields({
        primaryOpenLoop: text,
        summary: sanitizeStructuredRuntimeText(text, maxChars),
        maxChars,
      }), maxChars)
    }

    if (input.kind === 'next') {
      return sanitizeText(formatAlicizationProjectStateAwarenessFields({
        nextClosureTarget: text,
        summary: sanitizeStructuredRuntimeText(text, maxChars),
        maxChars,
      }), maxChars)
    }

    if (input.kind === 'awareness') {
      return sanitizeText(formatAlicizationProjectStateAwarenessFields({
        identity: text,
        currentPhase: text,
        latestLandedProgress: text,
        primaryOpenLoop: text,
        nextClosureTarget: text,
        sameHerSelfLine: text,
        sameHerHoldDetail: text,
        sameHerDriftRisk: text,
        emotionalClosureCue: text,
        maxChars,
      }), maxChars)
    }

    if (input.kind === 'same-her') {
      return sanitizeText(formatAlicizationProjectStateAwarenessFields({
        sameHerSelfLine: text,
        sameHerHoldDetail: text,
        maxChars,
      }), maxChars)
    }

    if (input.kind === 'cue') {
      return sanitizeText(formatAlicizationProjectStateAwarenessFields({
        sameHerHoldDetail: text,
        maxChars,
      }), maxChars)
    }

    return ''
  }
  const current = sanitizeCandidate(input.current)
  const candidate = sanitizeCandidate(input.candidate)

  if (!current)
    return candidate || null
  if (!candidate)
    return current || null
  if (current === candidate)
    return current

  const currentThin = looksLikeThinOuterRuntimeProjectStateDetail(current, input.kind)
  const candidateThin = looksLikeThinOuterRuntimeProjectStateDetail(candidate, input.kind)
  if (currentThin && !candidateThin)
    return candidate
  if (candidateThin && !currentThin)
    return current

  if (candidate.startsWith(current) && candidate.length >= current.length + 24)
    return candidate
  if (current.startsWith(candidate) && current.length >= candidate.length + 24)
    return current

  const currentScore = scoreOuterRuntimeProjectStateDetail(current, input.kind)
  const candidateScore = scoreOuterRuntimeProjectStateDetail(candidate, input.kind)
  if (candidateScore >= currentScore + 2)
    return candidate

  return current
}

function extractRuntimeProjectStateCarryLine(spine: AlicizationDigitalLifeSpineSnapshot) {
  const authority = spine.runtimeSurface.memory?.personStateProjection?.selfContinuityAuthority ?? null
  const sourceTags = Array.isArray(authority?.sourceTags)
    ? authority.sourceTags
    : []
  if (!sourceTags.includes('project-state-carry'))
    return null

  const inwardLine = sanitizeText(authority?.inwardLine, 220)
  if (inwardLine && !looksLikeSceneContaminatedProjectSameHerLine(inwardLine))
    return inwardLine

  const projectState = (spine.runtimeSurface.dialogue.currentConsciousFrame as {
    projectState?: { continuityCue?: unknown, sameHerSelfLine?: unknown } | null
  } | null | undefined)?.projectState
  const projectStateCue = sanitizeProjectSameHerCueCandidate(projectState?.continuityCue, 220)
    || sanitizeProjectSameHerCueCandidate(projectState?.sameHerSelfLine, 220)
  if (projectStateCue)
    return projectStateCue

  return null
}

function deriveRuntimeProjectStateBodyLineHints(continuityRestraint: string | null | undefined) {
  if (continuityRestraint === 'rest-protective') {
    return {
      preferredBlinkCadence: 'quiet' as const,
      preferredGazeMode: 'soften' as const,
      preferredPauseMode: 'longer' as const,
      preferredLipsyncMode: 'restrained' as const,
      preferredVoiceMode: 'lower-pressure' as const,
      preferredPacingMode: 'slower' as const,
    }
  }
  if (continuityRestraint === 'repair-before-closeness') {
    return {
      preferredBlinkCadence: 'quiet' as const,
      preferredGazeMode: 'soften' as const,
      preferredPauseMode: 'longer' as const,
      preferredLipsyncMode: 'restrained' as const,
      preferredVoiceMode: 'lower-pressure' as const,
      preferredPacingMode: 'slower' as const,
    }
  }
  if (continuityRestraint === 'measured-return') {
    return {
      preferredBlinkCadence: 'linger' as const,
      preferredGazeMode: 'soften' as const,
      preferredPauseMode: 'longer' as const,
      preferredLipsyncMode: 'restrained' as const,
      preferredVoiceMode: 'lower-pressure' as const,
      preferredPacingMode: 'slower' as const,
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

function resolveRuntimeProjectStateBodyLineHints(input: {
  continuityRestraint: string | null | undefined
  preferredBlinkCadence?: unknown
  preferredGazeMode?: unknown
  preferredPauseMode?: unknown
  preferredLipsyncMode?: unknown
  preferredVoiceMode?: unknown
  preferredPacingMode?: unknown
}) {
  const defaultHints = deriveRuntimeProjectStateBodyLineHints(input.continuityRestraint)
  return {
    preferredBlinkCadence:
      sanitizeRuntimeProjectStateBlinkCadence(input.preferredBlinkCadence)
      ?? defaultHints.preferredBlinkCadence,
    preferredGazeMode:
      sanitizeRuntimeProjectStateGazeMode(input.preferredGazeMode)
      ?? defaultHints.preferredGazeMode,
    preferredPauseMode:
      sanitizeRuntimeProjectStatePauseMode(input.preferredPauseMode)
      ?? defaultHints.preferredPauseMode,
    preferredLipsyncMode:
      sanitizeRuntimeProjectStateLipsyncMode(input.preferredLipsyncMode)
      ?? defaultHints.preferredLipsyncMode,
    preferredVoiceMode:
      sanitizeRuntimeProjectStateVoiceMode(input.preferredVoiceMode)
      ?? defaultHints.preferredVoiceMode,
    preferredPacingMode:
      sanitizeRuntimeProjectStatePacingMode(input.preferredPacingMode)
      ?? defaultHints.preferredPacingMode,
  }
}

function resolveRuntimeProjectStateBodyLineRestraint(input: {
  continuityRestraint?: string | null
  continuityCadence?: string | null
  continuityArcStage?: string | null
  currentConsciousFrameCadence?: string | null
  currentConsciousFrameReasonTags?: string[] | null
  residentPerformanceReasonTags?: string[] | null
  residentPerformanceEmotionalTension?: string | null
  currentBodyState?: string | null
  continuityMode?: string | null
}) {
  const directRestraint = sanitizeText(input.continuityRestraint, 64) || null
  const cadence = sanitizeText(input.continuityCadence, 120) || sanitizeText(input.currentConsciousFrameCadence, 120) || null
  const cadenceLower = cadence?.toLowerCase() ?? ''
  const reasonTags = input.currentConsciousFrameReasonTags ?? []
  const residentReasonTags = input.residentPerformanceReasonTags ?? []
  const currentConsciousFrameSignalsRepairBeforeCloseness
    = reasonTags.some(tag => sanitizeText(tag, 96).includes('repair-before-closeness'))
  const residentSignalsRepairBeforeCloseness
    = residentReasonTags.some(tag => sanitizeText(tag, 96).includes('repair-before-closeness'))
  const currentConsciousFrameSignalsRestProtective = reasonTags.some((tag) => {
    const normalized = sanitizeText(tag, 96)
    return normalized.includes('rest-protective') || normalized.includes('quiet-companionship')
  })
  const residentSignalsRestProtective = residentReasonTags.some((tag) => {
    const normalized = sanitizeText(tag, 96)
    return normalized.includes('rest-protective') || normalized.includes('quiet-companionship')
  })
  const callbackRepairCarrySignalsRepairBeforeCloseness
    = /callback repair|repair line|let repair settle|repair-first|repair before closeness/u.test(cadenceLower)
  const currentBodyState = sanitizeText(input.currentBodyState, 96) || null
  const continuityMode = sanitizeText(input.continuityMode, 96) || null
  const bodyStateSignalsRepairBeforeCloseness
    = currentBodyState === 'recovering' && continuityMode === 'protective-watch'
  const bodyStateSignalsRestProtective
    = currentBodyState === 'accompanying' && continuityMode === 'quiet-accompaniment'

  if (
    directRestraint === 'measured-return'
    && (
      currentConsciousFrameSignalsRepairBeforeCloseness
      || residentSignalsRepairBeforeCloseness
      || callbackRepairCarrySignalsRepairBeforeCloseness
      || bodyStateSignalsRepairBeforeCloseness
    )
  ) {
    return 'repair-before-closeness'
  }
  if (directRestraint === 'rest-protective')
    return 'rest-protective'
  if (directRestraint === 'repair-before-closeness' || directRestraint === 'measured-return')
    return directRestraint

  if (cadence === 'rest-protective')
    return cadence
  if (cadence === 'repair-before-closeness' || cadence === 'measured-return')
    return cadence

  if (reasonTags.some(tag => sanitizeText(tag, 96).includes('repair-before-closeness')))
    return 'repair-before-closeness'
  if (currentConsciousFrameSignalsRestProtective)
    return 'rest-protective'
  if (reasonTags.some(tag => sanitizeText(tag, 96).includes('measured-return')))
    return 'measured-return'

  if (residentReasonTags.some(tag => sanitizeText(tag, 96).includes('repair-before-closeness')))
    return 'repair-before-closeness'
  if (residentSignalsRestProtective)
    return 'rest-protective'
  if (residentReasonTags.some(tag => sanitizeText(tag, 96).includes('measured-return')))
    return 'measured-return'

  const emotionalTension = sanitizeText(input.residentPerformanceEmotionalTension, 96) || null
  if (emotionalTension === 'late-night-drain') {
    return bodyStateSignalsRepairBeforeCloseness
      || currentConsciousFrameSignalsRepairBeforeCloseness
      || residentSignalsRepairBeforeCloseness
      || callbackRepairCarrySignalsRepairBeforeCloseness
      ? 'repair-before-closeness'
      : 'rest-protective'
  }
  if (emotionalTension === 'restless-switching')
    return 'measured-return'

  if (currentBodyState === 'recovering' && continuityMode === 'protective-watch')
    return 'repair-before-closeness'
  if (bodyStateSignalsRestProtective)
    return 'rest-protective'

  const arcStage = sanitizeText(input.continuityArcStage, 120) || null
  if (arcStage === 'same-thread-continuation' && cadence === 'rest-protective')
    return 'rest-protective'
  if (arcStage === 'same-thread-continuation' && cadence === 'measured-return')
    return 'measured-return'

  return null
}

function firstNonEmptyText(...values: unknown[]) {
  for (const value of values) {
    const text = sanitizeText(value)
    if (text)
      return text
  }
  return ''
}

function resolvePreferredContinuityArcStage(...values: Array<string | null | undefined>) {
  const normalized = values
    .map(value => sanitizeText(value, 120))
    .filter(Boolean)
  if (normalized.includes('same-thread-continuation'))
    return 'same-thread-continuation'
  if (normalized.includes('gentle-reopen'))
    return 'gentle-reopen'
  if (normalized.includes('hold-for-opening'))
    return 'hold-for-opening'
  if (normalized.includes('mirror-carry'))
    return 'mirror-carry'
  return ''
}

function deriveProjectionContinuityArcStage(spine: AlicizationDigitalLifeSpineSnapshot) {
  const summary = sanitizeText(spine.runtimeSurface.memory?.personStateProjection?.summary, 220).toLowerCase()
  const openingGuidance = sanitizeText(spine.runtimeSurface.memory?.personStateProjection?.openingGuidance, 220).toLowerCase()
  const cadenceSummary = sanitizeText(spine.runtimeSurface.memory?.personStateProjection?.manifestationCadenceSummary, 220).toLowerCase()
  const initiativeWhy = sanitizeText(spine.runtimeSurface.agency?.initiative?.why, 220).toLowerCase()
  const combined = [summary, openingGuidance, cadenceSummary, initiativeWhy].filter(Boolean).join(' | ')

  if (!combined)
    return null

  const sameThreadContinuation = /same callback line|same line|same thread|continue|continuing|continuity_line|callback_carry_continuity|same_thread_continuation|继续|同一条线|沿着刚才那条线/u.test(combined)
    || hasSameThreadContinuityToken(combined)
    || hasContinuityIdentityToken(combined)
  const alreadyContinuing = /already continuing|still continuing|still in motion|keep continuing|keeps continuing|still live after|already live after|closure_status=unfinished|status=unfinished|unresolved|已经在继续|继续往下/u.test(combined)
    || hasMemoryDialogueEmbodimentClosureToken(combined)
  const proactiveSameLineContinuation = /先别换线|刚才那条提醒|沿着刚才那条提醒继续|就沿着刚才那条提醒继续|不重新起势/u.test(combined)
  const measuredReturn = /measured-return|measured_return|lower-pressure|lower_pressure|lighter pressure|still holds|timing=measured_return_or_repair_before_closeness|不重开|别重开/u.test(combined)
    || hasMeasuredReturnToken(combined)
    || hasRepairBeforeClosenessToken(combined)
  const holdOnly = /hold-for-opening|later opening|wait to reopen|先别开口/u.test(combined)

  if (sameThreadContinuation && (alreadyContinuing || proactiveSameLineContinuation) && measuredReturn)
    return 'same-thread-continuation'
  if (holdOnly)
    return 'hold-for-opening'
  return null
}

function deriveContinuityCadence(input: {
  continuitySummary?: string | null
  continuityRestraint?: string | null
}) {
  const summary = sanitizeText(input.continuitySummary, 220).toLowerCase()
  const explicitCadence = /cadence=([^|]+)/.exec(summary)?.[1]?.trim() ?? ''
  if (explicitCadence)
    return normalizeContinuityCadenceToken(explicitCadence) ?? (sanitizeText(explicitCadence, 120) || null)

  const restraint = sanitizeText(input.continuityRestraint, 120).toLowerCase()
  const normalizedRestraint = normalizeContinuityCadenceToken(restraint)
  if (normalizedRestraint)
    return normalizedRestraint

  if (/rest-protective|rest_protective|quiet-companionship|quiet_companionship|protect rest|fatigue-aware|line holds inward/u.test(summary))
    return 'rest-protective'
  if (/repair-before-closeness|repair_before_closeness|repair first|let repair settle/u.test(summary))
    return 'repair-before-closeness'
  if (/measured-return|measured_return|lower-pressure|lower_pressure|lighter pressure|still holds|timing=measured_return_or_repair_before_closeness|不重开|别重开/u.test(summary))
    return 'measured-return'

  return null
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function deriveRuntimeEmotionalClosureCue(spine: AlicizationDigitalLifeSpineSnapshot) {
  const privateThought = spine.runtimeSurface.cognition?.privateThought ?? null
  const initiative = spine.runtimeSurface.agency?.initiative ?? null
  const continuityRestraint = sanitizeText(initiative?.continuityRestraint, 80).toLowerCase()
  const rationaleTags = asArray(privateThought?.rationaleTags).map(tag => sanitizeText(tag, 80).toLowerCase())
  const quietRestProtectiveEmbodiment = continuityRestraint === 'rest-protective'
    && (
      rationaleTags.includes('rest-protective')
      || rationaleTags.includes('rest-protective-companionship')
      || rationaleTags.includes('quiet-companionship')
    )

  if (
    privateThought?.emotionalTension === 'late-night-drain'
    || continuityRestraint === 'rest-protective'
  ) {
    return quietRestProtectiveEmbodiment
      ? 'late-night-drain closure: emotion stays low-pressure, reply stays low-pressure, initiative stays rest-protective, and embodiment stays quiet-companionship while the line holds inward.'
      : 'late-night-drain closure: emotion stays low-pressure, reply stays low-pressure, initiative stays rest-protective, and embodiment stays repair-before-closeness.'
  }

  if (
    privateThought?.emotionalTension === 'restless-switching'
    || continuityRestraint === 'single-thread'
  ) {
    return 'restless-switching closure: emotion, reply, initiative, and embodiment stay narrowed to one living thread instead of fragmenting outward.'
  }

  return null
}

function deriveRecollectionFollowUpCarry(spine: AlicizationDigitalLifeSpineSnapshot) {
  const continuity = deriveAlicizationContinuityDeliberationFromSpine(spine)
  if (continuity.kind === 'none' || !continuity.summary) {
    return {
      memoryWeight: 0,
      dialogueWeight: 0,
      companionshipWeight: 0,
      arcStage: 'none' as const,
      summary: null as string | null,
    }
  }
  const memoryWeight = continuity.kind === 'dialogue-carry'
    || continuity.kind === 'memory-follow-up'
    || continuity.kind === 'execution-callback'
    ? clamp01(continuity.pressure * 0.88)
    : 0
  const dialogueWeight = continuity.shouldSpeakNow
    ? clamp01(continuity.pressure * 0.82)
    : 0
  const companionshipWeight = continuity.kind === 'dialogue-carry'
    ? clamp01(continuity.pressure * 0.46)
    : continuity.kind === 'memory-follow-up'
      ? clamp01(continuity.pressure * 0.28)
      : continuity.kind === 'execution-callback'
        ? clamp01(continuity.pressure * 0.16)
        : 0
  return {
    memoryWeight,
    dialogueWeight,
    companionshipWeight,
    arcStage: continuity.arcStage,
    summary: continuity.summary,
  }
}

function toChannelState(readiness: number): AlicizationRuntimeChannelState {
  if (readiness >= 0.72)
    return 'hot'
  if (readiness >= 0.38)
    return 'warm'
  return 'idle'
}

function formatChannelState(state: AlicizationRuntimeChannelState) {
  if (state === 'hot')
    return 'HOT'
  if (state === 'warm')
    return 'WARM'
  return 'IDLE'
}

function pickFocusBelief(spine: AlicizationDigitalLifeSpineSnapshot) {
  const surface = spine.runtimeSurface
  const beliefs = asArray(surface.cognition?.beliefLedger?.beliefs)
  return beliefs.find(
    belief => belief.id === surface.cognition?.beliefLedger?.focusBeliefId,
  ) ?? beliefs[0] ?? null
}

function pickLeadingGoal(spine: AlicizationDigitalLifeSpineSnapshot) {
  const surface = spine.runtimeSurface
  const goals = asArray(surface.memory?.goalStack?.alicizationGoals)
  return goals.find(
    goal => goal.id === surface.memory?.goalStack?.leadingAlicizationGoalId,
  ) ?? goals[0] ?? null
}

function pickDominantConcern(spine: AlicizationDigitalLifeSpineSnapshot) {
  const concerns = asArray(spine.runtimeSurface.memory?.concerns)
  return concerns[0] ?? null
}

function pickForegroundRuntimeThread(spine: AlicizationDigitalLifeSpineSnapshot) {
  const runtime = spine.runtimeSurface.memory?.threadRuntime
  const threads = asArray(runtime?.threads)
  return threads.find(thread => thread.id === runtime?.foregroundThreadId)
    ?? threads[0]
    ?? null
}

function buildDialogueChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const dialogue = surface.dialogue ?? {}
  const encounter = dialogue.dialogueEncounter
  const answerPlanner = dialogue.answerPlanner
  const replyDeliberation = dialogue.replyDeliberation
  const currentConsciousFrame = dialogue.currentConsciousFrame
  const readiness = clamp01(Math.max(
    encounter?.confidence ?? 0,
    answerPlanner?.confidence ?? 0,
    replyDeliberation?.confidence ?? 0,
    currentConsciousFrame?.confidence ?? 0,
    replyDeliberation?.shouldSpeak ? 0.84 : 0,
  ))
  const focus = firstNonEmptyText(
    answerPlanner?.governingFocus,
    answerPlanner?.answerIntent,
    currentConsciousFrame?.focusAnchor,
    encounter?.summary,
  ) || null

  return {
    id: 'dialogue',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      answerPlanner?.answerIntent ? `intent=${sanitizeText(answerPlanner.answerIntent, 48)}` : '',
      replyDeliberation
        ? `speak=${replyDeliberation.shouldSpeak ? 'true' : 'false'}`
        : currentConsciousFrame?.speakingIntention
          ? `speak=${/silent-observe|withhold|quietly alive|without forcing speech/u.test(String(currentConsciousFrame.speakingIntention)) ? 'false' : 'true'}`
          : '',
      encounter?.subject ? `subject=${encounter.subject}` : '',
      focus ? `Focus: ${sanitizeText(focus, 72)}.` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildActivePerceptionChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const scene = surface.perception?.currentScene ?? null
  const attention = surface.perception?.attention ?? null
  const capture = surface.perception?.captureState ?? null
  const captureSignal = capture?.permission === 'granted' && capture.health === 'healthy'
    ? 0.82
    : capture?.permission === 'granted'
      ? 0.62
      : capture?.permission === 'prompt'
        ? 0.44
        : capture?.health === 'degraded'
          ? 0.3
          : 0.16
  const readiness = clamp01(Math.max(
    scene?.confidence ?? 0,
    attention?.confidence ?? 0,
    captureSignal,
    surface.perception?.watchMode === 'symbiotic-vision'
      ? 0.66
      : surface.perception?.watchMode === 'invited-inspection'
        ? 0.7
        : 0.3,
  ))
  const focus = firstNonEmptyText(
    scene?.summary,
    attention?.target?.title,
    attention?.target?.appName,
    scene?.scenario,
  ) || null

  return {
    id: 'active-perception',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      `watch=${surface.perception?.watchMode ?? 'unknown'}`,
      scene?.scenario ? `scene=${sanitizeText(scene.scenario, 48)}` : '',
      capture ? `capture=${capture.permission}/${capture.health}` : 'capture=unknown',
      focus ? `Focus: ${sanitizeText(focus, 72)}.` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildActiveDialogueChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const initiative = surface.agency?.initiative ?? null
  const privateThought = surface.cognition?.privateThought ?? null
  const concern = pickDominantConcern(spine)
  const relationshipModel = surface.world?.relationshipModel ?? null
  const recollectionFollowUp = deriveRecollectionFollowUpCarry(spine)
  const readiness = clamp01(Math.max(
    privateThought?.shouldSpeak ? privateThought.confidence : 0,
    initiative?.shouldSpeak ? Math.max(initiative.confidence, initiative.speakDrive ?? 0) : 0,
    concern ? Math.max(concern.tension, concern.careWeight) * 0.86 : 0,
    relationshipModel?.climate === 'attuned' ? 0.62 : relationshipModel?.climate === 'guarded' ? 0.28 : 0.42,
    recollectionFollowUp.dialogueWeight,
  ))
  const focus = firstNonEmptyText(
    privateThought?.thoughtText,
    initiative?.why,
    concern?.summary,
    recollectionFollowUp.summary,
  ) || null

  return {
    id: 'active-dialogue',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      initiative?.selectedAction ? `action=${initiative.selectedAction}` : '',
      initiative?.preferredStyle ? `style=${initiative.preferredStyle}` : '',
      initiative?.continuityRestraint ? `restraint=${initiative.continuityRestraint}` : '',
      privateThought?.stance ? `stance=${privateThought.stance}` : '',
      recollectionFollowUp.arcStage && recollectionFollowUp.arcStage !== 'none' ? `arc=${recollectionFollowUp.arcStage}` : '',
      recollectionFollowUp.summary ? `followup=${sanitizeText(recollectionFollowUp.summary, 72)}` : '',
      concern?.summary ? `concern=${sanitizeText(concern.summary, 72)}` : '',
      focus ? `Focus: ${sanitizeText(focus, 72)}.` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildActiveControlChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const initiative = surface.agency?.initiative ?? null
  const autonomy = surface.agency?.autonomy ?? null
  const actionEcology = surface.agency?.actionEcology ?? null
  const deliberationState = surface.agency?.deliberationState ?? null
  const runtimeThread = pickForegroundRuntimeThread(spine)
  const selectedAction = sanitizeText(initiative?.selectedAction, 32)
  const autonomyMode = sanitizeText(autonomy?.selectedMode, 32)
  const autonomyActioning = autonomyMode === 'prepare-act' || autonomyMode === 'act'
  const quietMeasuredReturnPresenceHold = (
    initiative?.continuityRestraint === 'measured-return'
    && initiative?.preferredStyle === 'silent-observe'
    && initiative?.shouldSpeak === false
    && autonomy?.shouldSpeak !== true
  )
  const readiness = clamp01(Math.max(
    actionEcology?.readiness ?? 0,
    deliberationState?.readiness ?? 0,
    autonomyActioning && !quietMeasuredReturnPresenceHold
      ? Math.max(
          autonomy?.actReadiness ?? 0,
          autonomy?.confidence ?? 0,
          autonomy?.shouldAct ? 0.92 : 0.74,
        )
      : 0,
    selectedAction && selectedAction !== 'wait' && selectedAction !== 'hover'
      ? initiative?.confidence ?? 0
      : 0,
    runtimeThread ? 0.56 : 0,
  ))
  const focus = firstNonEmptyText(
    autonomy?.executionIntent?.summary,
    autonomy?.whyNow,
    actionEcology?.why,
    runtimeThread?.summary,
    initiative?.why,
  ) || null

  return {
    id: 'active-control',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      autonomyMode ? `autonomy=${autonomyMode}` : '',
      selectedAction ? `action=${selectedAction}` : '',
      autonomy?.executionIntent?.kind ? `intent=${sanitizeText(autonomy.executionIntent.kind, 48)}` : '',
      actionEcology?.mode ? `ecology=${actionEcology.mode}` : '',
      runtimeThread ? `thread=${sanitizeText(runtimeThread.need, 56)}` : '',
      actionEcology ? `surface=${actionEcology.shouldSurface ? 'true' : 'false'}` : '',
      focus ? `Focus: ${sanitizeText(focus, 72)}.` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildRuntimeAutonomySnapshot(
  spine: AlicizationDigitalLifeSpineSnapshot,
): AlicizationRuntimeAutonomySnapshot | null {
  const autonomy = spine.runtimeSurface.agency?.autonomy ?? null
  if (!autonomy)
    return null

  return {
    selectedMode: sanitizeText(autonomy.selectedMode, 48) || null,
    visibleAction: sanitizeText(autonomy.visibleAction, 48) || null,
    shouldSpeak: autonomy.shouldSpeak === true,
    shouldAct: autonomy.shouldAct === true,
    speakReadiness: clamp01(autonomy.speakReadiness),
    actReadiness: clamp01(autonomy.actReadiness),
    inhibition: clamp01(autonomy.inhibition),
    confidence: clamp01(autonomy.confidence),
    executionIntentKind: sanitizeText(autonomy.executionIntent?.kind, 48) || null,
    executionIntentSummary: sanitizeText(autonomy.executionIntent?.summary, 220) || null,
    deferReason: sanitizeText(autonomy.deferReason, 160) || null,
    whyNow: sanitizeText(autonomy.whyNow, 220) || null,
  }
}

function buildActiveMindChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const activeThread = surface.world?.worldModel?.activeThread ?? null
  const subjectiveInference = surface.cognition?.subjectiveInference ?? null
  const mindKernel = surface.cognition?.mindKernel ?? null
  const focusBelief = pickFocusBelief(spine)
  const readiness = clamp01(Math.max(
    activeThread ? Math.max(activeThread.significance, activeThread.confidence) : 0,
    subjectiveInference?.confidence ?? 0,
    focusBelief ? Math.max(focusBelief.confidence, focusBelief.salience) : 0,
    mindKernel
      ? Math.max(
          mindKernel.worldPressure,
          mindKernel.epistemicPressure,
          mindKernel.relationalPressure,
          mindKernel.speakReadiness,
        )
      : 0,
  ))
  const focus = firstNonEmptyText(
    activeThread?.summary,
    subjectiveInference?.dominantInterpretation,
    focusBelief?.statement,
    mindKernel?.narrative?.[0],
  ) || null

  return {
    id: 'active-mind',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      mindKernel?.dominantMode ? `mode=${mindKernel.dominantMode}` : '',
      mindKernel?.dominantDrive ? `drive=${mindKernel.dominantDrive}` : '',
      activeThread ? `thread=${sanitizeText(activeThread.title, 64)}` : '',
      focus ? `Focus: ${sanitizeText(focus, 72)}.` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildActiveMemoryChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const leadingGoal = pickLeadingGoal(spine)
  const concern = pickDominantConcern(spine)
  const reflectionCount = surface.memory?.reflectionLedger?.entries.length ?? 0
  const recallGovernor = surface.memory?.recallGovernor ?? null
  const workingMemoryEpisodes = asArray(surface.memory?.workingMemoryEpisodes)
  const recollectionFollowUp = deriveRecollectionFollowUpCarry(spine)
  const readiness = clamp01(Math.max(
    leadingGoal ? Math.max(leadingGoal.urgency, leadingGoal.confidence) * 0.88 : 0,
    concern ? Math.max(concern.tension, concern.confidence) * 0.8 : 0,
    reflectionCount > 0 ? Math.min(0.74, 0.38 + reflectionCount * 0.06) : 0,
    workingMemoryEpisodes.length > 0 ? Math.min(0.68, 0.34 + workingMemoryEpisodes.length * 0.07) : 0,
    recallGovernor && recallGovernor.mode !== 'none' ? 0.64 : 0.2,
    recollectionFollowUp.memoryWeight,
  ))
  const focus = firstNonEmptyText(
    leadingGoal?.label,
    concern?.summary,
    recallGovernor?.recallSeed,
    workingMemoryEpisodes[0]?.summary,
    recollectionFollowUp.summary,
  ) || null

  return {
    id: 'active-memory',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      leadingGoal ? `goal=${sanitizeText(leadingGoal.label, 72)}` : '',
      concern ? `concern=${sanitizeText(concern.summary, 72)}` : '',
      recallGovernor ? `recall=${recallGovernor.mode}` : '',
      recollectionFollowUp.arcStage && recollectionFollowUp.arcStage !== 'none' ? `arc=${recollectionFollowUp.arcStage}` : '',
      recollectionFollowUp.summary ? `followup=${sanitizeText(recollectionFollowUp.summary, 72)}` : '',
      reflectionCount > 0 ? `reflections=${reflectionCount}` : '',
      workingMemoryEpisodes.length > 0 ? `episodes=${workingMemoryEpisodes.length}` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildAnthropomorphicMindChannel(spine: AlicizationDigitalLifeSpineSnapshot): AlicizationRuntimeChannelSnapshot {
  const surface = spine.runtimeSurface
  const relationshipModel = surface.world?.relationshipModel ?? null
  const selfState = surface.agency?.selfState ?? null
  const selfContinuity = surface.memory?.selfContinuity ?? null
  const privateThought = surface.cognition?.privateThought ?? null
  const recollectionFollowUp = deriveRecollectionFollowUpCarry(spine)
  const readiness = clamp01(Math.max(
    relationshipModel
      ? (
          relationshipModel.receptivity * 0.42
          + relationshipModel.sharedAttentionTrust * 0.36
          + relationshipModel.reciprocityExpectation * 0.22
        )
      : 0,
    selfState
      ? (
          selfState.feltCloseness * 0.48
          + selfState.protectiveness * 0.28
          + selfState.desireToSpeak * 0.24
        )
      : 0,
    selfContinuity
      ? (
          selfContinuity.relationshipTrust * 0.36
          + selfContinuity.carryOverDesire * 0.36
          + (1 - selfContinuity.misreadBurden) * 0.28
        )
      : 0,
    privateThought?.shouldSpeak ? privateThought.confidence * 0.72 : 0,
    recollectionFollowUp.companionshipWeight,
  ))
  const focus = firstNonEmptyText(
    privateThought?.thoughtText,
    selfState?.moodLabel,
    relationshipModel?.climate,
    selfContinuity?.attachmentMode,
    recollectionFollowUp.summary,
  ) || null

  return {
    id: 'anthropomorphic-mind',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      relationshipModel ? `relationship=${relationshipModel.climate}/${relationshipModel.approachVector}` : '',
      selfState ? `self=${selfState.stance}/${selfState.moodLabel}` : '',
      selfContinuity ? `attachment=${selfContinuity.attachmentMode}/${selfContinuity.initiativeTemperament}` : '',
      recollectionFollowUp.arcStage && recollectionFollowUp.arcStage !== 'none' ? `arc=${recollectionFollowUp.arcStage}` : '',
      recollectionFollowUp.summary ? `followup=${sanitizeText(recollectionFollowUp.summary, 72)}` : '',
      privateThought?.embodiedPresence ? `presence=${privateThought.embodiedPresence}` : '',
      focus ? `Focus: ${sanitizeText(focus, 72)}.` : '',
    ].filter(Boolean).join(' | '),
  }
}

function buildAgentRuntimeChannel(input: {
  telemetry?: AlicizationAgentRuntimeTelemetry | null
}): AlicizationRuntimeChannelSnapshot {
  const telemetry = input.telemetry
  const pendingTasks = Math.max(0, Math.floor(telemetry?.pendingTasks ?? 0))
  const completedTasks = Math.max(0, Math.floor(telemetry?.completedTasks ?? 0))
  const failedTasks = Math.max(0, Math.floor(telemetry?.failedTasks ?? 0))
  const continuitySignals = Math.max(0, Math.floor(telemetry?.continuitySignals ?? 0))
  const totalTasks = pendingTasks + completedTasks + failedTasks
  const activityScore = totalTasks > 0
    ? Math.min(1, 0.3 + totalTasks * 0.08)
    : 0.14
  const continuityScore = continuitySignals > 0
    ? Math.min(1, 0.22 + continuitySignals * 0.08)
    : 0.16
  const completionScore = clamp01(
    completedTasks * 0.08
    + pendingTasks * 0.04
    - failedTasks * 0.03,
  )
  const sensoryScore = telemetry?.sensoryCaptureHealthy === true
    ? 0.74
    : telemetry?.sensoryCaptureHealthy === false
      ? 0.36
      : 0.22
  const readiness = clamp01(Math.max(
    activityScore,
    continuityScore,
    completionScore,
    sensoryScore,
  ))
  const focus = pendingTasks > 0
    ? `pending:${pendingTasks}`
    : failedTasks > 0
      ? `failed:${failedTasks}`
      : completedTasks > 0
        ? `completed:${completedTasks}`
        : continuitySignals > 0
          ? `continuity:${continuitySignals}`
          : null

  return {
    id: 'agent-runtime',
    state: toChannelState(readiness),
    readiness,
    focus,
    summary: [
      `pending=${pendingTasks}`,
      `completed=${completedTasks}`,
      `failed=${failedTasks}`,
      `continuity=${continuitySignals}`,
      telemetry?.sensoryCaptureHealthy === null || telemetry?.sensoryCaptureHealthy === undefined
        ? 'capture=unknown'
        : `capture=${telemetry.sensoryCaptureHealthy ? 'healthy' : 'degraded'}`,
    ].join(' | '),
  }
}

function deriveDigestOnlyRuntimeSnapshot(input: {
  spine: AlicizationDigitalLifeSpineSnapshot
  agentRuntime?: AlicizationAgentRuntimeTelemetry | null
}): AlicizationRuntimeSnapshot {
  const digest = projectAlicizationDigitalLifeSpineDigest(input.spine)
  const runtime = digest?.runtime ?? null
  const proactive = digest?.proactive ?? null
  const continuity = digest?.continuitySignal ?? null
  const digestProjectionSummary = sanitizeText(digest?.memory?.personStateProjection?.summary, 220) || null
  const digestProjectContinuitySummary = digestProjectionSummary?.includes('project_continuity=')
    ? digestProjectionSummary
      .split('|')
      .map(part => sanitizeText(part, 220))
      .find(part => part.startsWith('project_continuity=')) ?? null
    : null
  const digestProjectionAuthority = digest?.memory?.personStateProjection?.selfContinuityAuthority ?? null
  const digestProjectionSourceTags = Array.isArray(digestProjectionAuthority?.sourceTags)
    ? digestProjectionAuthority.sourceTags
    : []
  const digestProjectStateCarryLine = digestProjectionSourceTags.includes('project-state-carry')
    ? sanitizeText(digestProjectionAuthority?.inwardLine, 220) || null
    : null
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const continuityArcStage = resolvePreferredContinuityArcStage(
    sanitizeText(runtime?.continuityArcStage, 120) || null,
    sanitizeText(proactive?.dominantConcernKind, 120) || null,
    /same-thread|same line|same-thread-continuation|continuation|继续/u.test(sanitizeText(continuity?.summary, 220).toLowerCase())
      ? 'same-thread-continuation'
      : null,
  ) || null
  const proactiveRestraintCandidate = sanitizeText((proactive as { continuityRestraint?: unknown } | null)?.continuityRestraint, 64) || null
  const digestEmotionalClosureCue = sanitizeText(
    (runtime as {
      projectState?: { emotionalClosureCue?: unknown } | null
      currentConsciousFrame?: { projectState?: { emotionalClosureCue?: unknown } | null } | null
    } | null)?.projectState?.emotionalClosureCue
    ?? (runtime as {
      projectState?: { emotionalClosureCue?: unknown } | null
      currentConsciousFrame?: { projectState?: { emotionalClosureCue?: unknown } | null } | null
    } | null)?.currentConsciousFrame?.projectState?.emotionalClosureCue,
    220,
  ) || null
  const continuityRestraint = resolveRuntimeProjectStateBodyLineRestraint({
    continuityRestraint: proactiveRestraintCandidate,
    continuityCadence: sanitizeText((runtime as { continuityCadence?: unknown } | null)?.continuityCadence, 120)
      || sanitizeText((runtime as { projectState?: { continuityCadence?: unknown } | null } | null)?.projectState?.continuityCadence, 120)
      || deriveContinuityCadence({
        continuitySummary: [digestProjectContinuitySummary, continuity?.summary].filter(Boolean).join(' | ') || null,
        continuityRestraint: proactiveRestraintCandidate,
      }),
    continuityArcStage,
    currentConsciousFrameCadence: sanitizeText((runtime as { currentConsciousFrame?: { continuityCadence?: unknown } | null } | null)?.currentConsciousFrame?.continuityCadence, 120) || null,
    currentConsciousFrameReasonTags: (runtime as { currentConsciousFrame?: { reasonTags?: string[] | null } | null } | null)?.currentConsciousFrame?.reasonTags ?? null,
    residentPerformanceReasonTags: (digest as { embodiment?: { residentPerformance?: { reasonTags?: string[] | null } | null } | null } | null)?.embodiment?.residentPerformance?.reasonTags ?? null,
    residentPerformanceEmotionalTension: sanitizeText((digest as { embodiment?: { residentPerformance?: { emotionalTension?: unknown } | null } | null } | null)?.embodiment?.residentPerformance?.emotionalTension, 96) || null,
    currentBodyState: sanitizeText((runtime as { currentBodyState?: unknown } | null)?.currentBodyState, 96) || null,
    continuityMode: sanitizeText((runtime as { continuityMode?: unknown } | null)?.continuityMode, 96) || null,
  })
  const continuityCadence = deriveContinuityCadence({
    continuitySummary: [digestProjectContinuitySummary, continuity?.summary].filter(Boolean).join(' | ') || null,
    continuityRestraint,
  })
  const projectStateBodyLineHints = resolveRuntimeProjectStateBodyLineHints({
    continuityRestraint,
    preferredBlinkCadence:
      (runtime as { projectState?: { preferredBlinkCadence?: unknown } | null, currentConsciousFrame?: { projectState?: { preferredBlinkCadence?: unknown } | null } | null } | null)?.currentConsciousFrame?.projectState?.preferredBlinkCadence
      ?? (runtime as { projectState?: { preferredBlinkCadence?: unknown } | null } | null)?.projectState?.preferredBlinkCadence
      ?? null,
    preferredGazeMode:
      (runtime as { projectState?: { preferredGazeMode?: unknown } | null, currentConsciousFrame?: { projectState?: { preferredGazeMode?: unknown } | null } | null } | null)?.currentConsciousFrame?.projectState?.preferredGazeMode
      ?? (runtime as { projectState?: { preferredGazeMode?: unknown } | null } | null)?.projectState?.preferredGazeMode
      ?? null,
    preferredPauseMode:
      (runtime as { projectState?: { preferredPauseMode?: unknown } | null, currentConsciousFrame?: { projectState?: { preferredPauseMode?: unknown } | null } | null } | null)?.currentConsciousFrame?.projectState?.preferredPauseMode
      ?? (runtime as { projectState?: { preferredPauseMode?: unknown } | null } | null)?.projectState?.preferredPauseMode
      ?? null,
    preferredLipsyncMode:
      (runtime as { projectState?: { preferredLipsyncMode?: unknown } | null, currentConsciousFrame?: { projectState?: { preferredLipsyncMode?: unknown } | null } | null } | null)?.currentConsciousFrame?.projectState?.preferredLipsyncMode
      ?? (runtime as { projectState?: { preferredLipsyncMode?: unknown } | null } | null)?.projectState?.preferredLipsyncMode
      ?? null,
    preferredVoiceMode:
      (runtime as { projectState?: { preferredVoiceMode?: unknown } | null, currentConsciousFrame?: { projectState?: { preferredVoiceMode?: unknown } | null } | null } | null)?.currentConsciousFrame?.projectState?.preferredVoiceMode
      ?? (runtime as { projectState?: { preferredVoiceMode?: unknown } | null } | null)?.projectState?.preferredVoiceMode
      ?? null,
    preferredPacingMode:
      (runtime as { projectState?: { preferredPacingMode?: unknown } | null, currentConsciousFrame?: { projectState?: { preferredPacingMode?: unknown } | null } | null } | null)?.currentConsciousFrame?.projectState?.preferredPacingMode
      ?? (runtime as { projectState?: { preferredPacingMode?: unknown } | null } | null)?.projectState?.preferredPacingMode
      ?? null,
  })
  const canonicalSameHerSelfLine = buildRuntimeProjectStateSameHerSummary({
    canonicalSameHerSelfLine: projectStateBrief.sameHerSelfLine,
    canonicalIdentity: projectStateBrief.identity,
    primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
    nextClosureTarget: projectStateBrief.nextClosureTarget,
    carryLine: digestProjectStateCarryLine,
  })
  const projectThreadContinuityCue = buildProjectThreadContinuityCue({
    projectStateCarryLine: digestProjectStateCarryLine,
    projectContinuitySummary: digestProjectContinuitySummary ?? continuity?.summary ?? null,
    continuityArcStage,
    continuityCadence,
  })
  const resolvedProjectContinuityCue = resolveRuntimeProjectContinuityCue({
    explicitRuntimeCue: (runtime as { continuityCue?: unknown } | null)?.continuityCue as string | null | undefined,
    projectThreadContinuityCue,
    projectContinuitySummary: digestProjectContinuitySummary ?? continuity?.summary ?? null,
    projectStateCarryLine: digestProjectStateCarryLine,
    canonicalSameHerSelfLine,
  })
  const shouldProactivelySpeak = proactive?.shouldSpeak === true
  const shouldProactivelyAct = false
  const derivedMindStateBundle = digest?.memory?.derivedMindStateBundle ?? null
  const affectiveResidue = digest?.memory?.affectiveResidue ?? derivedMindStateBundle?.affectiveResidue ?? null

  const channels: Record<AlicizationRuntimeChannelId, AlicizationRuntimeChannelSnapshot> = {
    'dialogue': {
      id: 'dialogue',
      state: 'idle',
      readiness: 0.18,
      focus: runtime?.activeThreadTitle ?? runtime?.sceneSummary ?? null,
      summary: runtime?.answerIntent ? `intent=${runtime.answerIntent}` : 'intent=quiet-carry',
    },
    'active-perception': {
      id: 'active-perception',
      state: toChannelState(runtime?.watchMode ? 0.66 : 0.18),
      readiness: runtime?.watchMode ? 0.66 : 0.18,
      focus: runtime?.sceneSummary ?? null,
      summary: [
        runtime?.watchMode ? `watch=${runtime.watchMode}` : '',
        runtime?.sceneScenario ? `scene=${runtime.sceneScenario}` : '',
      ].filter(Boolean).join(' | '),
    },
    'active-dialogue': {
      id: 'active-dialogue',
      state: toChannelState(shouldProactivelySpeak ? 0.62 : 0.74),
      readiness: shouldProactivelySpeak ? 0.62 : 0.74,
      focus: proactive?.dominantConcernSummary ?? continuity?.summary ?? runtime?.activeThreadTitle ?? null,
      summary: [
        runtime?.selectedAction ? `action=${runtime.selectedAction}` : '',
        proactive?.preferredStyle ? `style=${proactive.preferredStyle}` : '',
        continuityRestraint ? `restraint=${continuityRestraint}` : '',
        proactive?.dominantConcernSummary ? `Focus: ${sanitizeText(proactive.dominantConcernSummary, 72)}.` : '',
      ].filter(Boolean).join(' | '),
    },
    'active-control': {
      id: 'active-control',
      state: toChannelState(0.16),
      readiness: 0.16,
      focus: null,
      summary: 'control=digest-only-minimal',
    },
    'active-mind': {
      id: 'active-mind',
      state: toChannelState(0.58),
      readiness: 0.58,
      focus: runtime?.activeThreadTitle ?? runtime?.sceneSummary ?? null,
      summary: [
        runtime?.dominantMode ? `mode=${runtime.dominantMode}` : '',
        runtime?.dominantDrive ? `drive=${runtime.dominantDrive}` : '',
      ].filter(Boolean).join(' | '),
    },
    'active-memory': {
      id: 'active-memory',
      state: toChannelState(digest?.memory?.summary ? 0.68 : 0.24),
      readiness: digest?.memory?.summary ? 0.68 : 0.24,
      focus: digest?.memory?.summary ?? null,
      summary: [
        digest?.memory?.summary ? `memory=${sanitizeText(digest.memory.summary, 72)}` : '',
        digest?.memory?.recallMode ? `recall=${digest.memory.recallMode}` : '',
      ].filter(Boolean).join(' | '),
    },
    'anthropomorphic-mind': {
      id: 'anthropomorphic-mind',
      state: toChannelState(proactive?.preferredPresence === 'hesitant' ? 0.72 : 0.42),
      readiness: proactive?.preferredPresence === 'hesitant' ? 0.72 : 0.42,
      focus: proactive?.dominantConcernSummary ?? continuity?.summary ?? null,
      summary: [
        proactive?.preferredPresence ? `presence=${proactive.preferredPresence}` : '',
        continuity?.summary ? `followup=${sanitizeText(continuity.summary, 72)}` : '',
      ].filter(Boolean).join(' | '),
    },
    'agent-runtime': buildAgentRuntimeChannel({
      telemetry: input.agentRuntime,
    }),
  }

  const ranked = rankChannels(channels)
  const dominant = ranked[0]?.id ?? 'active-dialogue'
  const continuityPressure = clamp01(
    channels['active-memory'].readiness * 0.42
    + channels['active-mind'].readiness * 0.34
    + channels['anthropomorphic-mind'].readiness * 0.24,
  )
  const companionshipPressure = clamp01(
    channels['anthropomorphic-mind'].readiness * 0.68
    + channels['active-dialogue'].readiness * 0.2,
  )
  const summary = [
    `dominant=${dominant}`,
    continuityRestraint ? `restraint=${continuityRestraint}` : '',
    `speak=${shouldProactivelySpeak ? 'true' : 'false'}`,
    `act=${shouldProactivelyAct ? 'true' : 'false'}`,
    runtime?.activeThreadTitle ? `thread=${runtime.activeThreadTitle}` : '',
  ].filter(Boolean).join(' | ')
  const canonicalRuntimeProjectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: projectStateBrief.identity,
      currentPhase: projectStateBrief.currentPhase,
      latestLandedProgress: projectStateBrief.continuityProgressSummary
        ?? projectStateBrief.memoryAnthropomorphismProgress[projectStateBrief.memoryAnthropomorphismProgress.length - 1]
        ?? null,
      primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
      nextClosureTarget: projectStateBrief.nextClosureTarget,
      sameHerSelfLine: canonicalSameHerSelfLine,
      sameHerDriftRisk: projectStateBrief.sameHerDriftRisk,
    },
    runtimePreflightSummary: buildAlicizationProjectStatePreflightSummary({
      identity: projectStateBrief.identity,
      currentPhase: projectStateBrief.currentPhase,
      primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
      nextClosureTarget: projectStateBrief.nextClosureTarget,
    }),
    runtimePreDialogueAwarenessLine: resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
        companionHeadlineLine: canonicalSameHerSelfLine ?? null,
        awarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
        companionHeadlineLine: canonicalSameHerSelfLine ?? null,
        preflightSummary: buildAlicizationProjectStatePreflightSummary({
          identity: projectStateBrief.identity,
          currentPhase: projectStateBrief.currentPhase,
          primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
          nextClosureTarget: projectStateBrief.nextClosureTarget,
        }),
      },
    }) ?? projectStateBrief.preDialogueAwarenessLine ?? null,
  })
  const digestOnlyConsciousCopy = buildRuntimeInwardClosureConsciousCopy({
    continuityRestraint,
    emotionalClosureCue: digestEmotionalClosureCue,
  })

  return {
    version: 'alicization-runtime-v1',
    dominantChannel: dominant,
    channels,
    activeLoop: null,
    autonomy: null,
    currentConsciousFrame: continuityArcStage
      ? {
          reasonTags: [
            `continuity-arc:${continuityArcStage}`,
            'continuity-timing:next-open-window',
          ],
          focusAnchor: sanitizeText(proactive?.dominantConcernSummary, 160) || sanitizeText(continuity?.summary, 160) || null,
          consciousNeed: digestOnlyConsciousCopy.consciousNeed,
          speakingIntention: digestOnlyConsciousCopy.speakingIntention,
          continuityArcStage,
          continuityPreferredTiming: 'next-open-window',
          continuityCadence,
        }
      : null,
    continuityRestraint,
    emotionalClosureCue: null,
    affectiveResidue,
    derivedMindStateBundle,
    projectState: {
      ...canonicalRuntimeProjectState,
      memoryClosureSummary: normalizeRuntimeMemoryClosureSummary(
        projectStateBrief.continuityProgressSummary
        ?? projectStateBrief.memoryAnthropomorphismProgress[projectStateBrief.memoryAnthropomorphismProgress.length - 1]
        ?? '',
      ),
      preDialogueAwarenessLine: canonicalRuntimeProjectState.preDialogueAwarenessLine ?? projectStateBrief.preDialogueAwarenessLine ?? null,
      companionHeadlineLine: canonicalRuntimeProjectState.companionHeadlineLine ?? canonicalSameHerSelfLine ?? null,
      sameHerSelfLine: canonicalRuntimeProjectState.sameHerSelfLine ?? canonicalSameHerSelfLine ?? null,
      preferredBlinkCadence: projectStateBodyLineHints.preferredBlinkCadence,
      preferredGazeMode: projectStateBodyLineHints.preferredGazeMode,
      preferredPauseMode: projectStateBodyLineHints.preferredPauseMode,
      preferredLipsyncMode: projectStateBodyLineHints.preferredLipsyncMode,
      preferredVoiceMode: projectStateBodyLineHints.preferredVoiceMode,
      preferredPacingMode: projectStateBodyLineHints.preferredPacingMode,
      continuityRestraint,
      continuityArcStage,
      continuityPreferredTiming: continuityArcStage ? 'next-open-window' : null,
      continuityCadence,
      continuityCue: resolvedProjectContinuityCue,
    },
    shouldProactivelySpeak,
    shouldProactivelyAct,
    continuityPressure,
    companionshipPressure,
    rulingMotive: null,
    habitMode: null,
    truthDisciplinePressure: 0,
    boundaryPressure: 0,
    restProtectionPressure: 0,
    returnPressure: 0,
    summary,
  }
}

function rankChannels(channels: Record<AlicizationRuntimeChannelId, AlicizationRuntimeChannelSnapshot>) {
  const tieBreaker: Record<AlicizationRuntimeChannelId, number> = {
    'dialogue': 0,
    'active-control': 1,
    'active-mind': 2,
    'active-dialogue': 3,
    'anthropomorphic-mind': 4,
    'active-memory': 5,
    'active-perception': 6,
    'agent-runtime': 7,
  }

  return Object.values(channels)
    .slice()
    .sort((left, right) => {
      if (right.readiness !== left.readiness)
        return right.readiness - left.readiness
      return tieBreaker[left.id] - tieBreaker[right.id]
    })
}

export function deriveAlicizationAgentRuntimeTelemetryFromSession(
  session: AlicizationRuntimeSessionSnapshot | null | undefined,
): AlicizationAgentRuntimeTelemetry | null {
  if (!session)
    return null

  let pendingTasks = 0
  let completedTasks = 0
  let failedTasks = 0
  for (const task of session.tasks ?? []) {
    const status = sanitizeText(task?.status, 24)
    if (status === 'pending') {
      pendingTasks += 1
      continue
    }
    if (status === 'completed') {
      completedTasks += 1
      continue
    }
    if (status === 'failed')
      failedTasks += 1
  }

  const captureHealth = sanitizeText(session.lastSensorySnapshot?.capture?.health, 24)
  const sensoryCaptureHealthy = captureHealth
    ? captureHealth === 'healthy'
    : null

  return {
    pendingTasks,
    completedTasks,
    failedTasks,
    continuitySignals: Math.max(0, (session.continuitySignals ?? []).length),
    sensoryCaptureHealthy,
  }
}

export function deriveAlicizationRuntimeSnapshot(input: {
  spine: AlicizationDigitalLifeSpineSnapshot | null | undefined
  agentRuntime?: AlicizationAgentRuntimeTelemetry | null
}): AlicizationRuntimeSnapshot | null {
  const spine = input.spine
  if (!spine)
    return null
  if (!spine.runtimeSurface)
    return deriveDigestOnlyRuntimeSnapshot(input as { spine: AlicizationDigitalLifeSpineSnapshot, agentRuntime?: AlicizationAgentRuntimeTelemetry | null })

  const channels: Record<AlicizationRuntimeChannelId, AlicizationRuntimeChannelSnapshot> = {
    'dialogue': buildDialogueChannel(spine),
    'active-perception': buildActivePerceptionChannel(spine),
    'active-dialogue': buildActiveDialogueChannel(spine),
    'active-control': buildActiveControlChannel(spine),
    'active-mind': buildActiveMindChannel(spine),
    'active-memory': buildActiveMemoryChannel(spine),
    'anthropomorphic-mind': buildAnthropomorphicMindChannel(spine),
    'agent-runtime': buildAgentRuntimeChannel({
      telemetry: input.agentRuntime,
    }),
  }

  const ranked = rankChannels(channels)
  const dominant = ranked[0]?.id ?? 'active-mind'

  const initiative = spine.runtimeSurface.agency?.initiative ?? null
  const privateThought = spine.runtimeSurface.cognition?.privateThought ?? null
  const autonomyState = spine.runtimeSurface.agency?.autonomy ?? null
  const residentPerformance = spine.runtimeSurface.raw?.residentPerformance ?? null
  const currentBodyState = sanitizeText(spine.runtimeSurface.perception?.currentBodyState, 96) || null
  const continuityMode = sanitizeText(spine.runtimeSurface.perception?.continuityMode, 96) || null
  const autonomy = buildRuntimeAutonomySnapshot(spine)
  const selectedAction = sanitizeText(autonomyState?.visibleAction ?? initiative?.selectedAction, 32)
  const continuityRestraint = sanitizeText(initiative?.continuityRestraint, 48) || null
  const emotionalClosureCue = deriveRuntimeEmotionalClosureCue(spine)
  const emotionalKernel = spine.runtimeSurface.memory?.emotionalKernel ?? null
  const derivedMindStateBundle = spine.runtimeSurface.memory?.derivedMindStateBundle ?? null
  const affectiveResidue = spine.runtimeSurface.memory?.affectiveResidue
    ?? derivedMindStateBundle?.affectiveResidue
    ?? null
  const motiveEngine = spine.runtimeSurface.memory?.motiveEngine ?? null
  const habitPolicy = spine.runtimeSurface.agency?.habitPolicy ?? null
  const autonomyActioning = autonomyState?.selectedMode === 'prepare-act'
    || autonomyState?.selectedMode === 'act'
  const shouldProactivelyAct = autonomyState
    ? autonomyActioning || autonomyState.shouldAct === true
    : (
        channels['active-control'].readiness >= 0.64
        && selectedAction !== ''
        && selectedAction !== 'wait'
        && selectedAction !== 'hover'
      )
  const autonomySpeechLocked = Boolean(autonomyActioning && autonomyState?.shouldSpeak !== true)
  const shouldProactivelySpeak = autonomySpeechLocked
    ? false
    : Boolean(
        autonomyState?.shouldSpeak
        || privateThought?.shouldSpeak
        || initiative?.shouldSpeak
        || channels['active-dialogue'].readiness >= 0.58,
      )

  const baseContinuityPressure = clamp01(
    channels['active-memory'].readiness * 0.42
    + channels['active-mind'].readiness * 0.34
    + channels['anthropomorphic-mind'].readiness * 0.24,
  )
  const companionshipPressure = clamp01(
    channels['anthropomorphic-mind'].readiness * 0.68
    + channels['active-dialogue'].readiness * 0.2
    + (spine.runtimeSurface.agency?.selfState?.feltCloseness ?? 0) * 0.12,
  )
  const rulingMotive = sanitizeText(motiveEngine?.rulingDrive, 48) || null
  const habitMode = sanitizeText(habitPolicy?.dominantMode, 64) || null
  const truthDisciplinePressure = clamp01(motiveEngine?.drives.truthDiscipline ?? 0)
  const boundaryPressure = clamp01(
    (motiveEngine?.drives.boundaryRespect ?? 0) * 0.82
    + (habitPolicy?.blocksDirectSpeakWhenBusy ? 0.12 : 0)
    + (habitPolicy?.prefersQuietCompanionship ? 0.06 : 0),
  )
  const restProtectionPressure = clamp01(
    (motiveEngine?.drives.restProtection ?? 0) * 0.84
    + (habitPolicy?.protectsRestWindow ? 0.14 : 0),
  )
  const returnPressure = clamp01(
    motiveEngine?.returnPressure
    ?? motiveEngine?.drives.unfinishedThreadReturn
    ?? 0,
  )
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  let broaderSameHerProjectStateContinuityAuthority = false
  const projectStateClosurePressure = deriveRuntimeProjectStateClosurePressure({
    currentPhase: projectStateBrief.currentPhase,
    primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
    nextClosureTarget: projectStateBrief.nextClosureTarget,
  })
  const recollectionFollowUp = deriveRecollectionFollowUpCarry(spine)
  const continuityDeliberation = deriveAlicizationContinuityDeliberationFromSpine(spine)
  const projectionContinuityArcStage = deriveProjectionContinuityArcStage(spine)
  const personStateProjectionSummary = sanitizeText(
    spine.runtimeSurface.memory?.personStateProjection?.summary,
    220,
  )
  const projectStateCarryLine = extractRuntimeProjectStateCarryLine(spine)
  const currentConsciousFrame = spine.runtimeSurface.dialogue.currentConsciousFrame
  const dialogueRuntimeDigestProjectState = (spine.runtimeSurface.dialogue as {
    runtimeDigest?: {
      projectState?: {
        identity?: unknown
        currentPhase?: unknown
        preflightSummary?: unknown
        latestLandedProgress?: unknown
        latestProgress?: unknown
        landedProgressSummary?: unknown
        primaryOpenLoop?: unknown
        openClosureSummary?: unknown
        nextClosureTarget?: unknown
        nextClosureTargetSummary?: unknown
        sameHerSelfLine?: unknown
        sameHerDriftRisk?: unknown
        sameHerDriftRiskSummary?: unknown
        sameHerHoldDetail?: unknown
        emotionalClosureSummary?: unknown
        emotionalClosureCue?: unknown
        companionHeadlineLine?: unknown
        companionBriefingLine?: unknown
        awarenessLine?: unknown
        preDialogueAwarenessLine?: unknown
        continuityCue?: unknown
        continuityArcStage?: unknown
        continuityPreferredTiming?: unknown
        continuityCadence?: unknown
        preferredBlinkCadence?: unknown
        preferredGazeMode?: unknown
        preferredPauseMode?: unknown
        preferredLipsyncMode?: unknown
        preferredVoiceMode?: unknown
        preferredPacingMode?: unknown
      } | null
    } | null
  } | null)?.runtimeDigest?.projectState ?? null
  const currentConsciousFrameProjectState = (currentConsciousFrame as {
    projectState?: {
      identity?: unknown
      currentPhase?: unknown
      preflightSummary?: unknown
      latestLandedProgress?: unknown
      latestProgress?: unknown
      landedProgressSummary?: unknown
      primaryOpenLoop?: unknown
      openClosureSummary?: unknown
      nextClosureTarget?: unknown
      nextClosureTargetSummary?: unknown
      sameHerSelfLine?: unknown
      sameHerDriftRisk?: unknown
      sameHerDriftRiskSummary?: unknown
      sameHerHoldDetail?: unknown
      emotionalClosureSummary?: unknown
      companionHeadlineLine?: unknown
      companionBriefingLine?: unknown
      awarenessLine?: unknown
      preDialogueAwarenessLine?: unknown
      continuityCue?: unknown
      continuityArcStage?: unknown
      continuityPreferredTiming?: unknown
      continuityCadence?: unknown
      preferredBlinkCadence?: unknown
      preferredGazeMode?: unknown
      preferredPauseMode?: unknown
      preferredLipsyncMode?: unknown
      preferredVoiceMode?: unknown
      preferredPacingMode?: unknown
      emotionalClosureCue?: unknown
    } | null
  } | null)?.projectState ?? null
  const currentConsciousFrameSummaryAliasProjectState = currentConsciousFrameProjectState as {
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
  const dialogueRuntimeDigestSummaryAliasProjectState = dialogueRuntimeDigestProjectState as {
    landedProgressSummary?: unknown
    openClosureSummary?: unknown
    nextClosureTargetSummary?: unknown
    sameHerDriftRiskSummary?: unknown
  } | null
  const explicitCurrentConsciousFrameLatestLandedProgressInput = sanitizeText(
    currentConsciousFrameProjectState?.latestLandedProgress
    ?? currentConsciousFrameProjectState?.latestProgress,
    320,
  ) || ''
  const summaryCurrentConsciousFrameLatestLandedProgressInput = sanitizeText(
    currentConsciousFrameSummaryAliasProjectState?.landedProgressSummary,
    320,
  ) || ''
  const explicitCurrentConsciousFramePrimaryOpenLoopInput = sanitizeText(
    currentConsciousFrameProjectState?.primaryOpenLoop,
    320,
  ) || ''
  const summaryCurrentConsciousFramePrimaryOpenLoopInput = sanitizeText(
    currentConsciousFrameSummaryAliasProjectState?.openClosureSummary,
    320,
  ) || ''
  const explicitCurrentConsciousFrameNextClosureTargetInput = sanitizeText(
    currentConsciousFrameProjectState?.nextClosureTarget,
    420,
  ) || ''
  const summaryCurrentConsciousFrameNextClosureTargetInput = sanitizeText(
    currentConsciousFrameSummaryAliasProjectState?.nextClosureTargetSummary,
    420,
  ) || ''
  const explicitCurrentConsciousFrameSameHerDriftRiskInput = sanitizeText(
    currentConsciousFrameProjectState?.sameHerDriftRisk,
    320,
  ) || ''
  const summaryCurrentConsciousFrameSameHerDriftRiskInput = sanitizeText(
    currentConsciousFrameSummaryAliasProjectState?.sameHerDriftRiskSummary,
    320,
  ) || ''
  const liveCurrentConsciousFrameLatestLandedProgressInput
    = explicitCurrentConsciousFrameLatestLandedProgressInput || summaryCurrentConsciousFrameLatestLandedProgressInput
  const liveCurrentConsciousFramePrimaryOpenLoopInput
    = explicitCurrentConsciousFramePrimaryOpenLoopInput || summaryCurrentConsciousFramePrimaryOpenLoopInput
  const liveCurrentConsciousFrameNextClosureTargetInput
    = explicitCurrentConsciousFrameNextClosureTargetInput || summaryCurrentConsciousFrameNextClosureTargetInput
  const liveCurrentConsciousFrameSameHerDriftRiskInput
    = explicitCurrentConsciousFrameSameHerDriftRiskInput || summaryCurrentConsciousFrameSameHerDriftRiskInput
  const liveDialogueRuntimeDigestLatestLandedProgressInput = sanitizeText(
    dialogueRuntimeDigestProjectState?.latestLandedProgress
    ?? dialogueRuntimeDigestProjectState?.latestProgress
    ?? dialogueRuntimeDigestSummaryAliasProjectState?.landedProgressSummary,
    320,
  ) || ''
  const liveDialogueRuntimeDigestPrimaryOpenLoopInput = sanitizeText(
    dialogueRuntimeDigestProjectState?.primaryOpenLoop
    ?? dialogueRuntimeDigestSummaryAliasProjectState?.openClosureSummary,
    320,
  ) || ''
  const liveDialogueRuntimeDigestNextClosureTargetInput = sanitizeText(
    dialogueRuntimeDigestProjectState?.nextClosureTarget
    ?? dialogueRuntimeDigestSummaryAliasProjectState?.nextClosureTargetSummary,
    420,
  ) || ''
  const liveDialogueRuntimeDigestSameHerDriftRiskInput = sanitizeText(
    dialogueRuntimeDigestProjectState?.sameHerDriftRisk
    ?? dialogueRuntimeDigestSummaryAliasProjectState?.sameHerDriftRiskSummary,
    320,
  ) || ''
  const carriedRuntimeContinuityArcStage = sanitizeText(spine.runtime?.continuityArcStage, 120) || null
  const currentConsciousFrameProjectEmotionalClosureCue = sanitizeStructuredRuntimeText(
    (currentConsciousFrame as { projectState?: { emotionalClosureCue?: unknown } | null })?.projectState?.emotionalClosureCue,
    220,
  ) || null
  const dialogueRuntimeDigestProjectEmotionalClosureCue = sanitizeStructuredRuntimeText(
    dialogueRuntimeDigestProjectState?.emotionalClosureCue,
    220,
  ) || null
  const quietMeasuredReturnPresenceHold = (
    (
      continuityRestraint === 'measured-return'
      || continuityRestraint === 'repair-before-closeness'
      || continuityRestraint === 'lower-pressure'
      || continuityRestraint === 'rest-protective'
    )
    && initiative?.shouldSpeak === false
    && initiative?.preferredStyle === 'silent-observe'
    && autonomyState?.shouldSpeak !== true
  )
  const projectContinuitySummary = personStateProjectionSummary.includes('project_continuity=')
    ? personStateProjectionSummary
      .split('|')
      .map(part => sanitizeText(part, 220))
      .find(part => part.startsWith('project_continuity=')) ?? null
    : null
  const continuityArcStillInward = resolvePreferredContinuityArcStage(
    projectionContinuityArcStage,
    recollectionFollowUp.arcStage !== 'none' ? recollectionFollowUp.arcStage : null,
    continuityDeliberation.arcStage !== 'none' ? continuityDeliberation.arcStage : null,
    projectStateClosurePressure.requiresInwardClosureRestraint
    && (
      (
        autonomyState?.selectedMode === 'prepare-act'
        && (
          continuityRestraint === 'measured-return'
          || continuityRestraint === 'lower-pressure'
          || continuityRestraint === 'rest-protective'
        )
      )
      || quietMeasuredReturnPresenceHold
    )
      ? 'same-thread-continuation'
      : null,
    carriedRuntimeContinuityArcStage,
  )
  const closureRestraintWantsQuiet = projectStateClosurePressure.requiresInwardClosureRestraint
    && (
      continuityArcStillInward === 'same-thread-continuation'
      || continuityArcStillInward === 'hold-for-opening'
      || continuityRestraint === 'repair-before-closeness'
      || continuityRestraint === 'measured-return'
      || continuityRestraint === 'rest-protective'
      || continuityRestraint === 'single-thread'
    )
  let continuityPressure = baseContinuityPressure
  const runtimeProjectStateBodyLineRestraint = resolveRuntimeProjectStateBodyLineRestraint({
    continuityRestraint,
    continuityCadence: deriveContinuityCadence({
      continuitySummary: projectContinuitySummary,
      continuityRestraint,
    }),
    continuityArcStage: continuityArcStillInward || projectionContinuityArcStage || null,
    currentConsciousFrameCadence: sanitizeText(
      (currentConsciousFrame as { projectState?: { continuityCadence?: unknown } | null })?.projectState?.continuityCadence,
      120,
    ) || null,
    currentConsciousFrameReasonTags: currentConsciousFrame?.reasonTags ?? null,
    residentPerformanceReasonTags: residentPerformance?.reasonTags ?? null,
    residentPerformanceEmotionalTension: sanitizeText(residentPerformance?.emotionalTension, 96) || null,
    currentBodyState,
    continuityMode,
  })
  const projectStateBodyLineHints = resolveRuntimeProjectStateBodyLineHints({
    continuityRestraint: runtimeProjectStateBodyLineRestraint,
    preferredBlinkCadence:
      preferRicherOuterRuntimeProjectStateDetail({
        current: currentConsciousFrameProjectState?.preferredBlinkCadence ?? null,
        candidate: dialogueRuntimeDigestProjectState?.preferredBlinkCadence ?? null,
        kind: 'same-her',
        maxChars: 32,
      }) ?? currentConsciousFrameProjectState?.preferredBlinkCadence ?? dialogueRuntimeDigestProjectState?.preferredBlinkCadence ?? null,
    preferredGazeMode:
      preferRicherOuterRuntimeProjectStateDetail({
        current: currentConsciousFrameProjectState?.preferredGazeMode ?? null,
        candidate: dialogueRuntimeDigestProjectState?.preferredGazeMode ?? null,
        kind: 'same-her',
        maxChars: 32,
      }) ?? currentConsciousFrameProjectState?.preferredGazeMode ?? dialogueRuntimeDigestProjectState?.preferredGazeMode ?? null,
    preferredPauseMode:
      preferRicherOuterRuntimeProjectStateDetail({
        current: currentConsciousFrameProjectState?.preferredPauseMode ?? null,
        candidate: dialogueRuntimeDigestProjectState?.preferredPauseMode ?? null,
        kind: 'same-her',
        maxChars: 32,
      }) ?? currentConsciousFrameProjectState?.preferredPauseMode ?? dialogueRuntimeDigestProjectState?.preferredPauseMode ?? null,
    preferredLipsyncMode:
      preferRicherOuterRuntimeProjectStateDetail({
        current: currentConsciousFrameProjectState?.preferredLipsyncMode ?? null,
        candidate: dialogueRuntimeDigestProjectState?.preferredLipsyncMode ?? null,
        kind: 'same-her',
        maxChars: 32,
      }) ?? currentConsciousFrameProjectState?.preferredLipsyncMode ?? dialogueRuntimeDigestProjectState?.preferredLipsyncMode ?? null,
    preferredVoiceMode:
      preferRicherOuterRuntimeProjectStateDetail({
        current: currentConsciousFrameProjectState?.preferredVoiceMode ?? null,
        candidate: dialogueRuntimeDigestProjectState?.preferredVoiceMode ?? null,
        kind: 'same-her',
        maxChars: 32,
      }) ?? currentConsciousFrameProjectState?.preferredVoiceMode ?? dialogueRuntimeDigestProjectState?.preferredVoiceMode ?? null,
    preferredPacingMode:
      preferRicherOuterRuntimeProjectStateDetail({
        current: currentConsciousFrameProjectState?.preferredPacingMode ?? null,
        candidate: dialogueRuntimeDigestProjectState?.preferredPacingMode ?? null,
        kind: 'same-her',
        maxChars: 32,
      }) ?? currentConsciousFrameProjectState?.preferredPacingMode ?? dialogueRuntimeDigestProjectState?.preferredPacingMode ?? null,
  })
  const canonicalSameHerSelfLine = buildRuntimeProjectStateSameHerSummary({
    canonicalSameHerSelfLine: projectStateBrief.sameHerSelfLine,
    canonicalIdentity: projectStateBrief.identity,
    primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
    nextClosureTarget: projectStateBrief.nextClosureTarget,
    carryLine: projectStateCarryLine,
  })
  const currentConsciousFrameProjectContinuityCue
    = sanitizeProjectSameHerCueCandidate(
      preferRicherOuterRuntimeProjectStateDetail({
        current: (currentConsciousFrame as { projectState?: { continuityCue?: unknown } | null } | null)?.projectState?.continuityCue,
        candidate: dialogueRuntimeDigestProjectState?.continuityCue,
        kind: 'cue',
        maxChars: 220,
      }),
      220,
    )
    || sanitizeProjectSameHerCueCandidate(
      (currentConsciousFrame as { projectState?: { emotionalClosureSummary?: unknown } | null } | null)?.projectState?.emotionalClosureSummary,
      220,
    )
    || sanitizeProjectSameHerCueCandidate(
      dialogueRuntimeDigestProjectState?.emotionalClosureSummary,
      220,
    )
    || sanitizeProjectSameHerCueCandidate(
      (currentConsciousFrame as { projectState?: { emotionalClosureCue?: unknown } | null } | null)?.projectState?.emotionalClosureCue,
      220,
    )
    || sanitizeProjectSameHerCueCandidate(
      dialogueRuntimeDigestProjectEmotionalClosureCue,
      220,
    )
  const projectThreadContinuityCue = buildProjectThreadContinuityCue({
    projectStateCarryLine,
    projectContinuitySummary,
    continuityArcStage: continuityArcStillInward || null,
    continuityCadence: deriveContinuityCadence({
      continuitySummary: projectContinuitySummary,
      continuityRestraint,
    }),
  })
  const resolvedProjectContinuityCue = resolveRuntimeProjectContinuityCue({
    explicitRuntimeCue: currentConsciousFrameProjectContinuityCue,
    projectThreadContinuityCue,
    projectContinuitySummary,
    projectStateCarryLine,
    canonicalSameHerSelfLine,
  })
  const canonicalRuntimeProjectState = resolveCanonicalStructuredProjectState({
    normalizedProjectState: {
      identity: sanitizeText(currentConsciousFrameProjectState?.identity, 220)
        || sanitizeText(dialogueRuntimeDigestProjectState?.identity, 220)
        || projectStateBrief.identity,
      currentPhase: sanitizeText(currentConsciousFrameProjectState?.currentPhase, 160)
        || sanitizeText(dialogueRuntimeDigestProjectState?.currentPhase, 160)
        || projectStateBrief.currentPhase,
      latestLandedProgress: preferRicherOuterRuntimeProjectStateDetail({
        current: liveCurrentConsciousFrameLatestLandedProgressInput,
        candidate: liveDialogueRuntimeDigestLatestLandedProgressInput,
        kind: 'landed',
        maxChars: 320,
      })
      || (
        projectStateBrief.continuityProgressSummary
        ?? projectStateBrief.memoryAnthropomorphismProgress[projectStateBrief.memoryAnthropomorphismProgress.length - 1]
        ?? null
      ),
      primaryOpenLoop: preferRicherOuterRuntimeProjectStateDetail({
        current: liveCurrentConsciousFramePrimaryOpenLoopInput,
        candidate: liveDialogueRuntimeDigestPrimaryOpenLoopInput,
        kind: 'open',
        maxChars: 320,
      })
      || projectStateBrief.openLoops[0]
      || null,
      nextClosureTarget: preferRicherOuterRuntimeProjectStateDetail({
        current: liveCurrentConsciousFrameNextClosureTargetInput,
        candidate: liveDialogueRuntimeDigestNextClosureTargetInput,
        kind: 'next',
        maxChars: 420,
      })
      || projectStateBrief.nextClosureTarget,
      sameHerSelfLine: preferRicherOuterRuntimeProjectStateDetail({
        current: sanitizeText(currentConsciousFrameProjectState?.sameHerSelfLine, 220),
        candidate: sanitizeText(dialogueRuntimeDigestProjectState?.sameHerSelfLine, 220),
        kind: 'same-her',
        maxChars: 220,
      })
      || canonicalSameHerSelfLine,
      sameHerDriftRisk: preferRicherOuterRuntimeProjectStateDetail({
        current: liveCurrentConsciousFrameSameHerDriftRiskInput,
        candidate: liveDialogueRuntimeDigestSameHerDriftRiskInput,
        kind: 'open',
        maxChars: 320,
      })
      || projectStateBrief.sameHerDriftRisk,
      sameHerHoldDetail: preferRicherOuterRuntimeProjectStateDetail({
        current: sanitizeText(currentConsciousFrameProjectState?.sameHerHoldDetail, 220),
        candidate: sanitizeText(dialogueRuntimeDigestProjectState?.sameHerHoldDetail, 220),
        kind: 'same-her',
        maxChars: 220,
      }) || null,
      emotionalClosureSummary:
        preferRicherOuterRuntimeProjectStateDetail({
          current: sanitizeText(currentConsciousFrameProjectState?.emotionalClosureSummary, 220),
          candidate: sanitizeText(dialogueRuntimeDigestProjectState?.emotionalClosureSummary, 220),
          kind: 'cue',
          maxChars: 220,
        }) || null,
      companionHeadlineLine:
        preferRicherOuterRuntimeProjectStateDetail({
          current: sanitizeText(currentConsciousFrameProjectState?.companionHeadlineLine, 420),
          candidate: sanitizeText(dialogueRuntimeDigestProjectState?.companionHeadlineLine, 420),
          kind: 'awareness',
          maxChars: 420,
        }) || null,
      companionBriefingLine:
        preferRicherOuterRuntimeProjectStateDetail({
          current: sanitizeText(currentConsciousFrameProjectState?.companionBriefingLine, 420),
          candidate: sanitizeText(dialogueRuntimeDigestProjectState?.companionBriefingLine, 420),
          kind: 'awareness',
          maxChars: 420,
        }) || null,
    },
    runtimePreflightSummary: buildAlicizationProjectStatePreflightSummary({
      identity: projectStateBrief.identity,
      currentPhase: projectStateBrief.currentPhase,
      primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
      nextClosureTarget: projectStateBrief.nextClosureTarget,
    }),
    runtimePreDialogueAwarenessLine: resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: preferRicherOuterRuntimeProjectStateDetail({
          current: (currentConsciousFrame as { projectState?: { preDialogueAwarenessLine?: unknown } | null } | null)?.projectState?.preDialogueAwarenessLine ?? null,
          candidate: dialogueRuntimeDigestProjectState?.preDialogueAwarenessLine,
          kind: 'awareness',
          maxChars: 420,
        }) ?? null,
        companionHeadlineLine: preferRicherOuterRuntimeProjectStateDetail({
          current: (currentConsciousFrame as { projectState?: { companionHeadlineLine?: unknown } | null } | null)?.projectState?.companionHeadlineLine ?? null,
          candidate: dialogueRuntimeDigestProjectState?.companionHeadlineLine,
          kind: 'awareness',
          maxChars: 420,
        }) ?? null,
        awarenessLine: preferRicherOuterRuntimeProjectStateDetail({
          current: (currentConsciousFrame as { projectState?: { awarenessLine?: unknown } | null } | null)?.projectState?.awarenessLine ?? null,
          candidate: dialogueRuntimeDigestProjectState?.awarenessLine,
          kind: 'awareness',
          maxChars: 420,
        }) ?? null,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
        companionHeadlineLine: canonicalSameHerSelfLine ?? null,
        preflightSummary: buildAlicizationProjectStatePreflightSummary({
          identity: projectStateBrief.identity,
          currentPhase: projectStateBrief.currentPhase,
          primaryOpenLoop: projectStateBrief.openLoops[0] ?? null,
          nextClosureTarget: projectStateBrief.nextClosureTarget,
        }),
      },
    }) ?? projectStateBrief.preDialogueAwarenessLine ?? null,
  })
  const promotedContinuityPreferredTiming = (
    closureRestraintWantsQuiet
    && continuityArcStillInward === 'same-thread-continuation'
    && (
      continuityRestraint === 'measured-return'
      || continuityRestraint === 'repair-before-closeness'
      || continuityRestraint === 'lower-pressure'
      || continuityRestraint === 'rest-protective'
    )
    && (
      continuityDeliberation.preferredTiming === 'same-turn-if-invited'
      || quietMeasuredReturnPresenceHold
    )
    || (
      closureRestraintWantsQuiet
      && continuityArcStillInward === 'same-thread-continuation'
      && continuityRestraint === 'repair-before-closeness'
      && shouldProactivelySpeak === false
    )
  )
    ? 'next-open-window'
    : continuityDeliberation.preferredTiming !== 'internal-only'
      ? continuityDeliberation.preferredTiming
      : null
  broaderSameHerProjectStateContinuityAuthority = derivesBroaderSameHerProjectStateContinuityAuthority({
    preDialogueAwarenessLine: resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: {
        preDialogueAwarenessLine: preferRicherOuterRuntimeProjectStateDetail({
          current: (currentConsciousFrame as { projectState?: { preDialogueAwarenessLine?: unknown } | null } | null)?.projectState?.preDialogueAwarenessLine ?? null,
          candidate: dialogueRuntimeDigestProjectState?.preDialogueAwarenessLine,
          kind: 'awareness',
          maxChars: 420,
        }) ?? null,
        companionHeadlineLine: preferRicherOuterRuntimeProjectStateDetail({
          current: (currentConsciousFrame as { projectState?: { companionHeadlineLine?: unknown } | null } | null)?.projectState?.companionHeadlineLine ?? null,
          candidate: dialogueRuntimeDigestProjectState?.companionHeadlineLine,
          kind: 'awareness',
          maxChars: 420,
        }) ?? null,
        awarenessLine: preferRicherOuterRuntimeProjectStateDetail({
          current: (currentConsciousFrame as { projectState?: { awarenessLine?: unknown } | null } | null)?.projectState?.awarenessLine ?? null,
          candidate: dialogueRuntimeDigestProjectState?.awarenessLine,
          kind: 'awareness',
          maxChars: 420,
        }) ?? null,
      },
      fallbackProjectState: {
        preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null,
        companionHeadlineLine: canonicalSameHerSelfLine ?? null,
      },
    }),
    sameHerSelfLine: canonicalRuntimeProjectState.sameHerSelfLine ?? canonicalSameHerSelfLine,
    emotionalClosureCue:
      currentConsciousFrameProjectEmotionalClosureCue
      || dialogueRuntimeDigestProjectEmotionalClosureCue,
    primaryOpenLoop: preferRicherOuterRuntimeProjectStateDetail({
      current: sanitizeText(
        (currentConsciousFrame as { projectState?: { primaryOpenLoop?: unknown } | null } | null)?.projectState?.primaryOpenLoop,
        320,
      ),
      candidate: liveDialogueRuntimeDigestPrimaryOpenLoopInput,
      kind: 'open',
      maxChars: 320,
    }) || projectStateBrief.openLoops[0] || null,
    nextClosureTarget: preferRicherOuterRuntimeProjectStateDetail({
      current: sanitizeText(
        (currentConsciousFrame as { projectState?: { nextClosureTarget?: unknown } | null } | null)?.projectState?.nextClosureTarget,
        320,
      ),
      candidate: liveDialogueRuntimeDigestNextClosureTargetInput,
      kind: 'next',
      maxChars: 320,
    }) || projectStateBrief.nextClosureTarget,
    continuityRestraint,
    continuityArcStage: continuityArcStillInward || null,
    continuityPreferredTiming: promotedContinuityPreferredTiming,
  })
  continuityPressure = clamp01(
    baseContinuityPressure
    + (broaderSameHerProjectStateContinuityAuthority ? 0.36 : 0),
  )
  const projectStateShouldSuppressAct = closureRestraintWantsQuiet
    && autonomyState?.selectedMode === 'prepare-act'
    && selectedAction !== ''
    && selectedAction !== 'wait'
    && selectedAction !== 'hover'
    && continuityPressure < 0.94
  const quietSameHerHoldShouldSuppressAct = quietMeasuredReturnPresenceHold
    && continuityArcStillInward === 'same-thread-continuation'
  const projectStateShouldSuppressSpeak = closureRestraintWantsQuiet
    && shouldProactivelyAct === false
    && shouldProactivelySpeak === true
    && autonomyState?.shouldSpeak !== true
    && initiative?.shouldSpeak !== true
    && channels['active-dialogue'].readiness < 0.72
  const governedShouldProactivelyAct = (projectStateShouldSuppressAct || quietSameHerHoldShouldSuppressAct)
    ? false
    : shouldProactivelyAct
  const governedShouldProactivelySpeak = projectStateShouldSuppressSpeak
    ? false
    : shouldProactivelySpeak
  const syncContinuityTimingReasonTags = (
    reasonTags: readonly string[] | null | undefined,
    continuityPreferredTiming: string | null,
  ) => {
    const baseTags = (reasonTags ?? []).filter(tag => !tag.startsWith('continuity-timing:'))
    if (!continuityPreferredTiming)
      return baseTags.slice(0, 8)
    return [
      ...baseTags,
      `continuity-timing:${continuityPreferredTiming}`,
    ].slice(0, 8)
  }
  const finalizedProjectState = {
    ...canonicalRuntimeProjectState,
    memoryClosureSummary: normalizeRuntimeMemoryClosureSummary(
      projectStateBrief.continuityProgressSummary
      ?? projectStateBrief.memoryAnthropomorphismProgress[projectStateBrief.memoryAnthropomorphismProgress.length - 1]
      ?? '',
    ),
    preDialogueAwarenessLine: canonicalRuntimeProjectState.preDialogueAwarenessLine ?? projectStateBrief.preDialogueAwarenessLine ?? null,
    companionHeadlineLine: canonicalRuntimeProjectState.companionHeadlineLine ?? canonicalSameHerSelfLine ?? null,
    sameHerSelfLine: canonicalRuntimeProjectState.sameHerSelfLine ?? canonicalSameHerSelfLine ?? null,
    emotionalClosureCue:
      currentConsciousFrameProjectEmotionalClosureCue
      || dialogueRuntimeDigestProjectEmotionalClosureCue
      || emotionalClosureCue,
    preferredBlinkCadence: projectStateBodyLineHints.preferredBlinkCadence,
    preferredGazeMode: projectStateBodyLineHints.preferredGazeMode,
    preferredPauseMode: projectStateBodyLineHints.preferredPauseMode,
    preferredLipsyncMode: projectStateBodyLineHints.preferredLipsyncMode,
    preferredVoiceMode: projectStateBodyLineHints.preferredVoiceMode,
    preferredPacingMode: projectStateBodyLineHints.preferredPacingMode,
    continuityRestraint,
    continuityArcStage: continuityArcStillInward || null,
    continuityPreferredTiming: promotedContinuityPreferredTiming,
    continuityCadence: deriveContinuityCadence({
      continuitySummary: projectContinuitySummary,
      continuityRestraint,
    }),
    continuityCue: resolvedProjectContinuityCue,
  }
  const synthesizedCurrentConsciousFrameCopy = buildRuntimeInwardClosureConsciousCopy({
    continuityRestraint,
    emotionalClosureCue: finalizedProjectState.emotionalClosureCue,
  })
  const shouldSynthesizeCurrentConsciousFrame = !currentConsciousFrame && Boolean(
    continuityArcStillInward
    || finalizedProjectState.emotionalClosureCue
    || closureRestraintWantsQuiet,
  )
  const synthesizedCurrentConsciousFrame = shouldSynthesizeCurrentConsciousFrame
    ? {
        reasonTags: syncContinuityTimingReasonTags([
          continuityArcStillInward ? `continuity-arc:${continuityArcStillInward}` : null,
          continuityRestraint ? `continuity-restraint:${continuityRestraint}` : null,
          finalizedProjectState.emotionalClosureCue ? 'project-emotional-closure' : null,
        ].filter((tag): tag is string => Boolean(tag)), promotedContinuityPreferredTiming),
        focusAnchor:
          sanitizeText(privateThought?.thoughtText, 160)
          || sanitizeText(initiative?.why, 160)
          || sanitizeText(finalizedProjectState.primaryOpenLoop, 160)
          || sanitizeText(finalizedProjectState.nextClosureTarget, 160)
          || sanitizeText(finalizedProjectState.emotionalClosureCue, 160)
          || null,
        consciousNeed: synthesizedCurrentConsciousFrameCopy.consciousNeed,
        speakingIntention: synthesizedCurrentConsciousFrameCopy.speakingIntention,
        continuityArcStage: continuityArcStillInward || null,
        continuityPreferredTiming: promotedContinuityPreferredTiming,
        continuityCadence: finalizedProjectState.continuityCadence,
        projectState: {
          ...finalizedProjectState,
        },
      }
    : null
  const finalizedCurrentConsciousFrame = currentConsciousFrame
    ? {
        reasonTags: syncContinuityTimingReasonTags(
          currentConsciousFrame.reasonTags ?? [],
          promotedContinuityPreferredTiming,
        ),
        focusAnchor: sanitizeText(currentConsciousFrame.focusAnchor, 160) || null,
        consciousNeed: sanitizeText(currentConsciousFrame.consciousNeed, 420) || null,
        speakingIntention: sanitizeText(currentConsciousFrame.speakingIntention, 420) || null,
        continuityArcStage: (currentConsciousFrame.reasonTags ?? []).find(tag =>
          tag === 'continuity-arc:same-thread-continuation'
          || tag === 'continuity-arc:hold-for-opening'
          || tag === 'continuity-arc:gentle-reopen',
        )?.replace('continuity-arc:', '') ?? null,
        continuityPreferredTiming: promotedContinuityPreferredTiming,
        continuityCadence: sanitizeText(
          (currentConsciousFrame as { projectState?: { continuityCadence?: unknown } | null }).projectState?.continuityCadence,
          120,
        ) || null,
        projectState: {
          ...finalizedProjectState,
          latestLandedProgress: sanitizeText(
            (currentConsciousFrame as { projectState?: { latestLandedProgress?: unknown } | null }).projectState?.latestLandedProgress,
            220,
          ) || finalizedProjectState.latestLandedProgress,
          latestProgress: sanitizeText(
            (currentConsciousFrame as { projectState?: { latestProgress?: unknown, latestLandedProgress?: unknown } | null }).projectState?.latestProgress
            ?? (currentConsciousFrame as { projectState?: { latestProgress?: unknown, latestLandedProgress?: unknown } | null }).projectState?.latestLandedProgress,
            220,
          ) || finalizedProjectState.latestLandedProgress,
          primaryOpenLoop: sanitizeText(
            (currentConsciousFrame as { projectState?: { primaryOpenLoop?: unknown } | null }).projectState?.primaryOpenLoop,
            220,
          ) || finalizedProjectState.primaryOpenLoop,
          nextClosureTarget: sanitizeText(
            (currentConsciousFrame as { projectState?: { nextClosureTarget?: unknown } | null }).projectState?.nextClosureTarget,
            320,
          ) || finalizedProjectState.nextClosureTarget,
          emotionalClosureCue: currentConsciousFrameProjectEmotionalClosureCue,
          continuityArcStage: continuityArcStillInward || null,
          continuityPreferredTiming: promotedContinuityPreferredTiming,
          continuityCadence: sanitizeText(
            (currentConsciousFrame as { projectState?: { continuityCadence?: unknown } | null }).projectState?.continuityCadence,
            120,
          ) || finalizedProjectState.continuityCadence,
        },
      }
    : synthesizedCurrentConsciousFrame
  const baseSnapshot: AlicizationRuntimeSnapshot = {
    version: 'alicization-runtime-v1' as const,
    dominantChannel: dominant,
    channels,
    activeLoop: null,
    autonomy,
    currentConsciousFrame: finalizedCurrentConsciousFrame,
    personStateProjection: spine.runtimeSurface.memory?.personStateProjection ?? null,
    emotionalClosureCue,
    emotionalKernel,
    affectiveResidue,
    derivedMindStateBundle,
    projectState: finalizedProjectState,
    shouldProactivelySpeak: governedShouldProactivelySpeak,
    shouldProactivelyAct: governedShouldProactivelyAct,
    continuityRestraint,
    continuityPressure,
    companionshipPressure,
    rulingMotive,
    habitMode,
    truthDisciplinePressure,
    boundaryPressure,
    restProtectionPressure,
    returnPressure,
    summary: '',
  }
  const activeLoop = deriveAlicizationActiveLoopSnapshot({
    architecture: spine.architecture,
    runtime: baseSnapshot,
  })
  const summary = [
    `dominant=${dominant}`,
    activeLoop ? `phase=${activeLoop.phase}` : '',
    activeLoop?.handoffTarget ? `handoff=${activeLoop.handoffTarget}` : '',
    activeLoop ? `initiative=${activeLoop.initiativeBudget.toFixed(2)}` : '',
    activeLoop ? `coherence=${activeLoop.coherence.toFixed(2)}` : '',
    autonomy?.selectedMode ? `autonomy=${autonomy.selectedMode}` : '',
    autonomy?.visibleAction ? `visible=${autonomy.visibleAction}` : '',
    continuityRestraint ? `restraint=${continuityRestraint}` : '',
    emotionalClosureCue ? `emotion_closure=${sanitizeText(emotionalClosureCue, 96)}` : '',
    autonomy?.executionIntentKind ? `intent=${autonomy.executionIntentKind}` : '',
    `speak=${governedShouldProactivelySpeak ? 'true' : 'false'}`,
    `act=${governedShouldProactivelyAct ? 'true' : 'false'}`,
    `continuity=${continuityPressure.toFixed(2)}`,
    `companionship=${companionshipPressure.toFixed(2)}`,
    rulingMotive ? `motive=${rulingMotive}` : '',
    habitMode ? `habit=${habitMode}` : '',
    truthDisciplinePressure > 0 ? `truth=${truthDisciplinePressure.toFixed(2)}` : '',
    boundaryPressure > 0 ? `boundary=${boundaryPressure.toFixed(2)}` : '',
    returnPressure > 0 ? `return=${returnPressure.toFixed(2)}` : '',
    projectContinuitySummary ? sanitizeText(projectContinuitySummary, 120) : '',
  ].filter(Boolean).join(' | ')
  return {
    ...baseSnapshot,
    activeLoop,
    shouldProactivelySpeak: governedShouldProactivelySpeak,
    shouldProactivelyAct: governedShouldProactivelyAct,
    continuityPressure,
    companionshipPressure,
    summary,
  }
}

export function projectAlicizationRuntimeDigest(
  snapshot: AlicizationRuntimeSnapshot | null | undefined,
): AlicizationRuntimeDigest | null {
  if (!snapshot)
    return null

  const channels = rankChannels(snapshot.channels).map(channel => ({
    id: channel.id,
    state: channel.state,
    readiness: clamp01(channel.readiness),
    focus: sanitizeText(channel.focus, 120) || null,
    summary: sanitizeText(channel.summary, 220),
  }))

  return {
    version: 'alicization-runtime-digest-v1',
    dominantChannel: snapshot.dominantChannel,
    activeLoop: snapshot.activeLoop
      ? {
          version: 'alicization-active-loop-v1',
          phase: snapshot.activeLoop.phase,
          dominantChannel: snapshot.activeLoop.dominantChannel,
          handoffTarget: snapshot.activeLoop.handoffTarget,
          continuityArcStage: sanitizeText(snapshot.activeLoop.continuityArcStage, 120) || null,
          continuityPreferredTiming: sanitizeText(snapshot.activeLoop.continuityPreferredTiming, 120) || null,
          dialogueReady: snapshot.activeLoop.dialogueReady,
          controlReady: snapshot.activeLoop.controlReady,
          memoryCarry: snapshot.activeLoop.memoryCarry,
          companionshipReady: snapshot.activeLoop.companionshipReady,
          observationHeavy: snapshot.activeLoop.observationHeavy,
          initiativeBudget: clamp01(snapshot.activeLoop.initiativeBudget),
          coherence: clamp01(snapshot.activeLoop.coherence),
          summary: sanitizeText(snapshot.activeLoop.summary, 240),
        }
      : null,
    autonomy: snapshot.autonomy
      ? {
          selectedMode: sanitizeText(snapshot.autonomy.selectedMode, 48) || null,
          visibleAction: sanitizeText(snapshot.autonomy.visibleAction, 48) || null,
          shouldSpeak: snapshot.autonomy.shouldSpeak === true,
          shouldAct: snapshot.autonomy.shouldAct === true,
          speakReadiness: clamp01(snapshot.autonomy.speakReadiness),
          actReadiness: clamp01(snapshot.autonomy.actReadiness),
          inhibition: clamp01(snapshot.autonomy.inhibition),
          confidence: clamp01(snapshot.autonomy.confidence),
          executionIntentKind: sanitizeText(snapshot.autonomy.executionIntentKind, 48) || null,
          executionIntentSummary: sanitizeText(snapshot.autonomy.executionIntentSummary, 220) || null,
          deferReason: sanitizeText(snapshot.autonomy.deferReason, 160) || null,
          whyNow: sanitizeText(snapshot.autonomy.whyNow, 220) || null,
        }
      : null,
    currentConsciousFrame: snapshot.currentConsciousFrame
      ? {
          reasonTags: snapshot.currentConsciousFrame.reasonTags.slice(0, 8),
          focusAnchor: sanitizeText(snapshot.currentConsciousFrame.focusAnchor, 160) || null,
          consciousNeed: sanitizeText(snapshot.currentConsciousFrame.consciousNeed, 420) || null,
          speakingIntention: sanitizeText(snapshot.currentConsciousFrame.speakingIntention, 420) || null,
          continuityArcStage: sanitizeText(snapshot.currentConsciousFrame.continuityArcStage, 120) || null,
          continuityPreferredTiming: sanitizeText(snapshot.currentConsciousFrame.continuityPreferredTiming, 120) || null,
          continuityCadence: sanitizeText(snapshot.currentConsciousFrame.continuityCadence, 120) || null,
        }
      : null,
    continuityRestraint: sanitizeText(snapshot.continuityRestraint, 64) || null,
    emotionalClosureCue: sanitizeText(snapshot.emotionalClosureCue, 220) || null,
    emotionalKernel: snapshot.emotionalKernel
      ? {
          version: 'emotional-kernel-v1',
          dominantEmotion: snapshot.emotionalKernel.dominantEmotion,
          initiativeMode: snapshot.emotionalKernel.initiativeMode,
          memoryRecallMode: snapshot.emotionalKernel.memoryRecallMode,
          embodimentTone: snapshot.emotionalKernel.embodimentTone,
          valence: clamp01(snapshot.emotionalKernel.valence),
          arousal: clamp01(snapshot.emotionalKernel.arousal),
          guardedness: clamp01(snapshot.emotionalKernel.guardedness),
          closenessDrive: clamp01(snapshot.emotionalKernel.closenessDrive),
          repairNeed: clamp01(snapshot.emotionalKernel.repairNeed),
          initiativePressure: clamp01(snapshot.emotionalKernel.initiativePressure),
          reasonTags: snapshot.emotionalKernel.reasonTags
            .map(tag => sanitizeText(tag, 120))
            .filter(Boolean)
            .slice(0, 12),
          why: sanitizeText(snapshot.emotionalKernel.why, 220),
        }
      : null,
    affectiveResidue: snapshot.affectiveResidue ?? null,
    derivedMindStateBundle: snapshot.derivedMindStateBundle ?? null,
    projectState: snapshot.projectState
      ? {
          preflightSummary: sanitizeText((snapshot.projectState as any).preflightSummary, 480) || null,
          preDialogueAwarenessSummary: sanitizeText((snapshot.projectState as any).preDialogueAwarenessSummary, 480) || null,
          preDialogueAwarenessLine: sanitizeText((snapshot.projectState as any).preDialogueAwarenessLine, 480) || null,
          awarenessLine: sanitizeText((snapshot.projectState as any).awarenessLine, 480) || null,
          companionHeadlineLine: sanitizeText((snapshot.projectState as any).companionHeadlineLine, 480) || null,
          companionBriefingLine: sanitizeText((snapshot.projectState as any).companionBriefingLine, 480) || null,
          identity: sanitizeText((snapshot.projectState as any).identity, 320) || null,
          currentPhase: sanitizeText(snapshot.projectState.currentPhase, 220) || null,
          latestLandedProgress: sanitizeText((snapshot.projectState as any).latestLandedProgress, 320) || null,
          latestProgress: sanitizeText((snapshot.projectState as any).latestProgress, 320) || null,
          memoryClosureSummary: sanitizeText(snapshot.projectState.memoryClosureSummary, 420) || null,
          primaryOpenLoop: sanitizeText(snapshot.projectState.primaryOpenLoop, 320) || null,
          nextClosureTarget: sanitizeText((snapshot.projectState as any).nextClosureTarget, 480) || null,
          sameHerSelfLine: sanitizeText((snapshot.projectState as any).sameHerSelfLine, 220) || null,
          sameHerHoldDetail: sanitizeText((snapshot.projectState as any).sameHerHoldDetail, 220) || null,
          sameHerDriftRisk: sanitizeText((snapshot.projectState as any).sameHerDriftRisk, 320) || null,
          emotionalClosureCue: sanitizeText((snapshot.projectState as any).emotionalClosureCue, 220) || null,
          continuityRestraint: sanitizeText((snapshot.projectState as any).continuityRestraint, 64) || null,
          continuityArcStage: sanitizeText((snapshot.projectState as any).continuityArcStage, 120) || null,
          continuityPreferredTiming: sanitizeText((snapshot.projectState as any).continuityPreferredTiming, 120) || null,
          continuityCadence: sanitizeText((snapshot.projectState as any).continuityCadence, 120) || null,
          continuityCue: sanitizeText((snapshot.projectState as any).continuityCue, 220) || null,
          preferredBlinkCadence: snapshot.projectState.preferredBlinkCadence ?? null,
          preferredGazeMode: snapshot.projectState.preferredGazeMode ?? null,
          preferredPauseMode: snapshot.projectState.preferredPauseMode ?? null,
          preferredLipsyncMode: snapshot.projectState.preferredLipsyncMode ?? null,
          preferredVoiceMode: snapshot.projectState.preferredVoiceMode ?? null,
          preferredPacingMode: snapshot.projectState.preferredPacingMode ?? null,
        }
      : null,
    shouldProactivelySpeak: snapshot.shouldProactivelySpeak,
    shouldProactivelyAct: snapshot.shouldProactivelyAct,
    continuityPressure: clamp01(snapshot.continuityPressure),
    companionshipPressure: clamp01(snapshot.companionshipPressure),
    rulingMotive: sanitizeText(snapshot.rulingMotive, 48) || null,
    habitMode: sanitizeText(snapshot.habitMode, 64) || null,
    truthDisciplinePressure: clamp01(snapshot.truthDisciplinePressure),
    boundaryPressure: clamp01(snapshot.boundaryPressure),
    restProtectionPressure: clamp01(snapshot.restProtectionPressure),
    returnPressure: clamp01(snapshot.returnPressure),
    channels,
    summary: sanitizeText(snapshot.summary, 240),
  }
}

export function buildAlicizationRuntimeSystemBlock(
  snapshot: AlicizationRuntimeSnapshot | null | undefined,
) {
  if (!snapshot)
    return ''

  const ranked = rankChannels(snapshot.channels)
  const continuityRestraint = sanitizeText(snapshot.continuityRestraint, 48) || null
  const continuityTiming = sanitizeText(
    (snapshot.projectState as any)?.continuityPreferredTiming,
    120,
  ) || null
  const continuityCadence = sanitizeText(
    (snapshot.projectState as any)?.continuityCadence,
    120,
  ) || null
  const emotionalClosureCue = sanitizeProviderRuntimeText(
    snapshot.emotionalClosureCue
    ?? (snapshot.projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
    320,
  ) || null
  const projectState = snapshot.projectState as Record<string, unknown> | null | undefined
  const projectLandedProgress = sanitizeProviderRuntimeText(
    projectState?.latestLandedProgress ?? projectState?.latestProgress,
    360,
  )
  const projectMemoryClosure = sanitizeProviderRuntimeText(projectState?.memoryClosureSummary, 420)
  const projectOpenLoop = sanitizeProviderRuntimeText(projectState?.primaryOpenLoop, 360)
  const projectNextClosure = sanitizeProviderRuntimeText(projectState?.nextClosureTarget, 420)
  const projectSameHerLine = sanitizeProviderRuntimeText(projectState?.sameHerSelfLine, 260)
  const projectDriftRisk = sanitizeProviderRuntimeText(projectState?.sameHerDriftRisk, 320)

  return [
    '[ALICIZATION_RUNTIME_DIGEST]',
    'Alicization-inspired active life runtime projection for dialogue/perception/proactive/control/mind/memory/anthropomorphic cognition/agent execution.',
    `dominant_channel=${snapshot.dominantChannel}`,
    snapshot.activeLoop ? `active_loop_phase=${snapshot.activeLoop.phase}` : '',
    snapshot.activeLoop?.handoffTarget ? `active_loop_handoff=${snapshot.activeLoop.handoffTarget}` : '',
    snapshot.activeLoop ? `active_loop_initiative_budget=${snapshot.activeLoop.initiativeBudget.toFixed(2)}` : '',
    snapshot.activeLoop ? `active_loop_coherence=${snapshot.activeLoop.coherence.toFixed(2)}` : '',
    snapshot.activeLoop ? `active_loop_observation_heavy=${snapshot.activeLoop.observationHeavy ? 'true' : 'false'}` : '',
    snapshot.autonomy?.selectedMode ? `autonomy_mode=${snapshot.autonomy.selectedMode}` : '',
    snapshot.autonomy?.visibleAction ? `autonomy_visible_action=${snapshot.autonomy.visibleAction}` : '',
    snapshot.autonomy ? `autonomy_should_speak=${snapshot.autonomy.shouldSpeak ? 'true' : 'false'}` : '',
    snapshot.autonomy ? `autonomy_should_act=${snapshot.autonomy.shouldAct ? 'true' : 'false'}` : '',
    snapshot.autonomy ? `autonomy_speak_readiness=${clamp01(snapshot.autonomy.speakReadiness).toFixed(2)}` : '',
    snapshot.autonomy ? `autonomy_act_readiness=${clamp01(snapshot.autonomy.actReadiness).toFixed(2)}` : '',
    snapshot.autonomy?.executionIntentKind ? `autonomy_intent=${snapshot.autonomy.executionIntentKind}` : '',
    snapshot.autonomy?.deferReason ? `autonomy_defer=${snapshot.autonomy.deferReason}` : '',
    emotionalClosureCue ? `emotional_closure=${emotionalClosureCue}` : '',
    snapshot.projectState ? 'Memory continuity boundary: WorkingMemory owns short-term memory; LongTermMemoryRecall owns long-term recall; project-state visibility is governance-only.' : '',
    snapshot.projectState ? 'Visible governance entry: MemoryWorkbench. Template policy: no fixed persona templates.' : '',
    projectLandedProgress ? `Project landed progress: ${projectLandedProgress}.` : '',
    projectMemoryClosure ? `Project memory closure: ${projectMemoryClosure}.` : '',
    projectOpenLoop ? `Project open loop: ${projectOpenLoop}.` : '',
    projectNextClosure ? `Project next closure: ${projectNextClosure}.` : '',
    projectSameHerLine ? `Project continuity anchor: ${projectSameHerLine}.` : '',
    projectDriftRisk ? `Project drift risk: ${projectDriftRisk}.` : '',
    continuityTiming ? `Continuity timing: ${continuityTiming}.` : '',
    continuityCadence ? `Continuity cadence: ${continuityCadence}.` : '',
    (snapshot.projectState as any)?.continuityArcStage ? `continuity_arc=${sanitizeProviderRuntimeText((snapshot.projectState as any).continuityArcStage, 120)}` : '',
    (snapshot.projectState as any)?.continuityCue ? `continuity_cue=${sanitizeProviderRuntimeText((snapshot.projectState as any).continuityCue, 220)}` : '',
    `should_proactively_speak=${snapshot.shouldProactivelySpeak ? 'true' : 'false'}`,
    `should_proactively_act=${snapshot.shouldProactivelyAct ? 'true' : 'false'}`,
    `continuity_pressure=${snapshot.continuityPressure.toFixed(2)}`,
    `companionship_pressure=${snapshot.companionshipPressure.toFixed(2)}`,
    snapshot.rulingMotive ? `ruling_motive=${snapshot.rulingMotive}` : '',
    snapshot.habitMode ? `habit_mode=${snapshot.habitMode}` : '',
    continuityRestraint ? `initiative_restraint=${continuityRestraint}` : '',
    `truth_discipline_pressure=${clamp01(snapshot.truthDisciplinePressure).toFixed(2)}`,
    `boundary_pressure=${clamp01(snapshot.boundaryPressure).toFixed(2)}`,
    `rest_protection_pressure=${clamp01(snapshot.restProtectionPressure).toFixed(2)}`,
    `return_pressure=${clamp01(snapshot.returnPressure).toFixed(2)}`,
    'channels:',
    ...ranked.map(channel => [
      `- [${formatChannelState(channel.state)} ${channel.readiness.toFixed(2)}] ${channel.id}`,
      channel.summary ? ` :: ${sanitizeText(channel.summary, 220)}` : '',
      channel.focus ? ` :: focus=${sanitizeText(channel.focus, 120)}` : '',
    ].join('')),
    'Keep all channels on one coherent living loop. Do not split dialogue, mind, memory, and action into contradictory narratives in the same turn.',
  ].join('\n')
}
