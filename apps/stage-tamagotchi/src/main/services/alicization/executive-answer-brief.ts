import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPerceptionState, AlicizationPerceptionTarget } from './attention-anchor'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationResponseCharter } from './response-charter'

import {
  buildAlicizationScreenSurfaceCue,
} from '@proj-alicization/stage-shared'

import {
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isSelfPerceptionTarget,
} from './attention-anchor'
import { sanitizeDialogueSurfaceText } from './dialogue-surface-text'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { deriveMindTruthContract } from './mind-truth-contract'

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizeCarryThreadCandidate(raw: unknown, maxChars = 220) {
  return sanitizeDialogueSurfaceText(raw, maxChars)
}

function describeTarget(input: {
  target?: AlicizationPerceptionTarget | null
  sceneSummary?: string | null
  scenario?: string | null
  workloadKind?: string | null
  contentKind?: string | null
}) {
  if (!input.target && !input.sceneSummary)
    return 'none'
  return buildAlicizationScreenSurfaceCue({
    rawCues: [input.sceneSummary],
    target: input.target ?? null,
    scenario: input.scenario ?? null,
    workloadKind: input.workloadKind ?? null,
    contentKind: input.contentKind ?? null,
  })
}

function targetSignature(target?: AlicizationPerceptionTarget | null) {
  if (!target)
    return ''
  return [
    sanitizeText(target.appName, 48),
    sanitizeText(target.processName, 48),
    sanitizeText(target.title, 120),
  ].filter(Boolean).join('::').toLowerCase()
}

function hasHeldAutonomyContinuity(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const labels = runtimeSurface?.dialogue.sessionMirror?.continuityLabels
  if (!Array.isArray(labels) || labels.length === 0)
    return false
  return labels.some(label => sanitizeText(label, 120).includes(':held-autonomy'))
}

export interface AlicizationExecutiveAnswerBrief {
  turnMode: 'grounded-inspection' | 'screen-repair' | 'guide-current-knot' | 'care' | 'accompany' | 'answer'
  liveSurface: string
  carriedThread: string | null
  truthState: ReturnType<typeof deriveMindTruthContract>['truthState']
  separateCarryFromSurface: boolean
  shouldCompactHistory: boolean
  maxRecentUserTurns: number
  mustDo: string[]
  mustNotDo: string[]
}

export function buildAlicizationExecutiveAnswerBrief(input: {
  now: number
  inspectionRequested: boolean
  groundedThisTurn: boolean
  currentForeground?: AlicizationPerceptionTarget | null
  perceptionState: AlicizationPerceptionState
  visualPresenceState: AlicizationVisualPresenceStateSnapshot
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  responseCharter: AlicizationResponseCharter
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
}) {
  const dialogueEncounter = input.dialogueEncounter ?? null
  const runtimeSurface = input.runtimeSurface ?? buildAlicizationDigitalLifeRuntimeSurface(input.visualPresenceState)
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const discourseState = runtimeSurface.dialogue.discourseState ?? input.discourseState ?? null
  const mindSynthesis = runtimeSurface.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const answerCompiler = runtimeSurface.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const truthContract = deriveMindTruthContract(runtimeSurface)
  const preferredScreenReferenceMode = answerCompiler?.screenReferenceMode
    ?? discourseState?.screenReferenceMode
    ?? dialogueFocus?.screenReferenceMode
    ?? null
  const liveSurfaceTarget = input.currentForeground
    ?? runtimeSurface.perception.attention?.target
    ?? runtimeSurface.perception.currentScene?.target
    ?? null
  const activeAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
  const residue = getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
  const carriedThreadCandidates = [
    sanitizeCarryThreadCandidate(residue?.summary ?? '', 220),
    sanitizeCarryThreadCandidate(runtimeSurface.world.worldModel?.activeThread?.summary ?? '', 220),
    sanitizeCarryThreadCandidate(runtimeSurface.dialogue.answerPlanner?.governingFocus ?? '', 220),
    sanitizeCarryThreadCandidate(runtimeSurface.perception.currentScene?.summary ?? '', 220),
  ].filter(Boolean)
  const liveSurfaceSignature = targetSignature(liveSurfaceTarget)
  const carryTarget = residue?.focusTarget ?? activeAnchor ?? null
  const carryTargetSignature = targetSignature(carryTarget)
  const carryFromNonSelfResidue = Boolean(
    liveSurfaceTarget
    && isSelfPerceptionTarget(liveSurfaceTarget)
    && carryTarget
    && !isSelfPerceptionTarget(carryTarget)
    && carryTargetSignature
    && carryTargetSignature !== liveSurfaceSignature,
  )
  const separateCarryFromSurface = carryFromNonSelfResidue
    || (
      Boolean(liveSurfaceTarget)
      && Boolean(runtimeSurface.perception.currentScene?.summary)
      && Boolean(liveSurfaceSignature)
      && targetSignature(runtimeSurface.perception.currentScene?.target) !== liveSurfaceSignature
    )
  const carriedThread = separateCarryFromSurface && preferredScreenReferenceMode !== 'avoid'
    ? carriedThreadCandidates[0] ?? null
    : null
  const truthState = input.groundedThisTurn && preferredScreenReferenceMode !== 'avoid'
    ? 'live-grounded' as const
    : truthContract.truthState
  const heldAutonomyContinuity = hasHeldAutonomyContinuity(runtimeSurface)

  const turnMode = (() => {
    if (answerCompiler)
      return answerCompiler.turnMode
    if (
      input.groundedThisTurn
      && preferredScreenReferenceMode !== 'avoid'
      && dialogueFocus?.subject !== 'alicization-self'
      && dialogueFocus?.subject !== 'relationship'
      && dialogueFocus?.subject !== 'host-state'
    ) {
      return 'grounded-inspection' as const
    }
    if (dialogueObligation?.kind === 'repair')
      return 'screen-repair' as const
    if (dialogueFocus?.subject === 'alicization-self')
      return 'answer' as const
    if (dialogueFocus?.subject === 'relationship')
      return 'accompany' as const
    if (dialogueFocus?.subject === 'host-state')
      return 'care' as const
    if (dialogueObligation?.kind === 'guide' || dialogueObligation?.kind === 'teach')
      return 'guide-current-knot' as const
    if (dialogueObligation?.kind === 'care')
      return 'care' as const
    if (dialogueObligation?.kind === 'accompany')
      return 'accompany' as const
    if (input.responseCharter.responseMode === 'repair-and-reanchor')
      return 'screen-repair' as const
    if (input.responseCharter.responseMode === 'guide-current-knot')
      return 'guide-current-knot' as const
    if (input.responseCharter.responseMode === 'care-with-boundary')
      return 'care' as const
    if (input.responseCharter.responseMode === 'accompany-lightly')
      return 'accompany' as const
    return 'answer' as const
  })()

  const shouldCompactHistory = input.groundedThisTurn
    || input.inspectionRequested
    || dialogueObligation?.mustStayTaskBound === true
    || turnMode === 'screen-repair'
    || turnMode === 'guide-current-knot'
    || truthState === 'remembered'
    || truthState === 'uncertain'
    || preferredScreenReferenceMode === 'avoid'

  const maxRecentUserTurns = preferredScreenReferenceMode === 'avoid'
    ? 3
    : input.groundedThisTurn || input.inspectionRequested
      ? 2
      : dialogueObligation?.mustStayTaskBound
        ? 2
        : turnMode === 'screen-repair' || turnMode === 'guide-current-knot'
          ? 3
          : 4

  const brief: AlicizationExecutiveAnswerBrief = {
    turnMode,
    liveSurface: describeTarget({
      target: liveSurfaceTarget,
      sceneSummary: runtimeSurface.perception.currentScene?.summary ?? null,
      scenario: runtimeSurface.perception.currentScene?.scenario ?? null,
      workloadKind: runtimeSurface.perception.currentScene?.workloadKind ?? null,
      contentKind: runtimeSurface.perception.currentScene?.contentKind ?? null,
    }),
    carriedThread: heldAutonomyContinuity
      ? sanitizeText(
        carriedThread
        ?? discourseState?.unresolvedCarry
        ?? runtimeSurface.dialogue.sessionMirror?.executionSummary
        ?? mindSynthesis?.commitments[0]?.summary
        ?? '',
        220,
      ) || null
      : carriedThread ?? (sanitizeText(discourseState?.unresolvedCarry ?? mindSynthesis?.commitments[0]?.summary ?? '', 220) || null),
    truthState,
    separateCarryFromSurface,
    shouldCompactHistory,
    maxRecentUserTurns,
    mustDo: [],
    mustNotDo: [],
  }

  return {
    brief,
    systemBlock: '',
  }
}
