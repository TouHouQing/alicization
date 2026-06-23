import type {
  AlicizationAnswerCompilerSnapshot,
  AlicizationClaimEvidenceLedgerSnapshot,
  AlicizationCommitmentSnapshot,
  AlicizationConcernSnapshot,
  AlicizationCurrentConsciousFrameSnapshot,
  AlicizationDialogueActKernelSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationInitiativeSnapshot,
  AlicizationInquiryPlanSnapshot,
  AlicizationLearningExecutionStateSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type {
  AlicizationDigitalLifeOperatingMode,
  AlicizationDigitalLifeSubsystemId,
} from './digital-life-architecture'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationPersonStateProjection } from './person-state-projection'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'
import type { AlicizationSelfRevisionStatePatch } from './self-evolution/state-revision-bus'

import {
  readActiveContinuityGovernanceFromDerivedMindStateBundle,
  readHostPersonModelFromDerivedMindStateBundle,
  readLearningExecutionStateFromDerivedMindStateBundle,
  readMemoryDeliberationFromDerivedMindStateBundle,
  readRecollectionIntentFromDerivedMindStateBundle,
  readRecollectionSpeechPlanFromDerivedMindStateBundle,
} from '@proj-alicization/stage-shared'

import { buildAlicizationDigitalLifeArchitecture } from './digital-life-architecture'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildEpistemicSurfacePosture } from './epistemic-surface'
import { buildAlicizationMemoryDeliberationKernel } from './memory-deliberation-kernel'
import {
  isAlicizationThinProjectAwarenessLine,
  resolveAlicizationProjectPreDialogueAwarenessLine,
  resolveAlicizationProjectStateBrief,
  resolveAlicizationProjectStateSnapshot,
} from './project-state-brief'

export type AlicizationResponseEpistemicMode
  = | 'grounded-live'
    | 'coarse-live'
    | 'dialogue-grounded'
    | 'repair-needed'
    | 'memory-only'

export type AlicizationResponseMode
  = | 'guide-current-knot'
    | 'repair-and-reanchor'
    | 'care-with-boundary'
    | 'accompany-lightly'
    | 'answer-naturally'

export interface AlicizationResponseCharter {
  epistemicMode: AlicizationResponseEpistemicMode
  responseMode: AlicizationResponseMode
  governingFocus: string
  governingConcern: string | null
  governingCommitment: string | null
  governingInquiry: string | null
  governingProject: string | null
  emotionalClosureCue?: string | null
  latestRevision: string | null
  executivePhase: string | null
  truthFrame: string | null
  mindMode: string | null
  digitalLifeOperatingMode?: AlicizationDigitalLifeOperatingMode | null
  digitalLifeDominantSystem?: AlicizationDigitalLifeSubsystemId | null
  digitalLifeSummary?: string | null
  activeClosenessContext?: AlicizationPersonStateProjection['activeClosenessContext'] | null
  activeClosenessRung?: AlicizationPersonStateProjection['activeClosenessRung'] | null
  activeLearningAction?: AlicizationLearningExecutionStateSnapshot['nextLearningAction'] | null
  activeSelfRevisionPatch?: Pick<AlicizationSelfRevisionStatePatch, 'id' | 'decisionTraceId' | 'lanes' | 'reasonCodes' | 'summary' | 'projectStateContinuity'> | null
  relationshipPosture: 'restrained' | 'warm' | 'tender'
  reasons: string[]
  mustDo: string[]
  mustNotDo: string[]
}

interface AlicizationResponseCharterProjectStateInput {
  identity?: string | null
  currentPhase?: string | null
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
  preDialogueAwarenessSummary?: string | null
  latestLandedProgress?: string | null
  latestProgress?: string | null
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  sameHerSelfLine?: string | null
  sameHerDriftRisk?: string | null
  emotionalClosureCue?: string | null
  sameHerHoldDetail?: string | null
  continuityCue?: string | null
  companionHeadlineLine?: string | null
  awarenessLine?: string | null
  companionBriefingLine?: string | null
  continuityPreferredTiming?: string | null
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function asArray<T>(value: readonly T[] | T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

function stripTrailingPunctuation(text: string) {
  return text.replace(/[.。!！?？;；:：]+$/u, '').trim()
}

function lowerFirst(text: string) {
  if (!text)
    return ''
  return text.slice(0, 1).toLowerCase() + text.slice(1)
}

function readProjectStateEmotionalClosureCue(projectState: unknown) {
  if (!projectState || typeof projectState !== 'object')
    return null
  return sanitizeText((projectState as { emotionalClosureCue?: unknown }).emotionalClosureCue, 220) || null
}

function isThinProjectAwarenessShell(value: unknown) {
  const text = sanitizeText(value, 320).toLowerCase()
  if (!text)
    return false

  return isAlicizationThinProjectAwarenessLine(text)
    || /keep this same digital life project in view|generic project shell|detached project shell/u.test(text)
}

function uniqueAwarenessList(values: Array<string | null | undefined>, maxItems = 6, maxChars = 320) {
  const result: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (!normalized || result.includes(normalized))
      continue
    result.push(normalized)
    if (result.length >= maxItems)
      break
  }
  return result
}

function carriesRicherSameHerAwarenessSummary(value: unknown) {
  const text = sanitizeText(value, 960)
  const normalized = text.toLowerCase()
  if (!normalized)
    return false

  const hasProjectIdentity = normalized.includes('alicization is a local-first digital life project')
    || /本地优先数字生命项目|数字生命项目/u.test(text)
  const hasContinuousHerCarry = /one continuous "her"|one continuous her|same living line|same-life seam|same life seam|同一个她|同一个 her/u.test(normalized)
  const hasLandedOrOpenClosureCarry = /what has already landed is|already landed|already survive|already survives|callback continuity|returned-side carry|still-open closure|initiative|memory|dialogue|embodiment|具身|主动性|记忆/u.test(normalized)

  return hasProjectIdentity && hasContinuousHerCarry && hasLandedOrOpenClosureCarry
}

function preferRicherSameHerAwarenessSummary(summary: unknown, awarenessLine: unknown) {
  const normalizedSummary = sanitizeText(summary, 960)
  if (!normalizedSummary)
    return ''

  if (awarenessLine && !isThinProjectAwarenessShell(awarenessLine))
    return ''

  return carriesRicherSameHerAwarenessSummary(normalizedSummary)
    ? normalizedSummary
    : ''
}

function resolveCharterProjectStatePreDialogueAwareness(input: {
  runtimeProjectState?: {
    preDialogueAwarenessLine?: unknown
    preDialogueAwarenessSummary?: unknown
    latestLandedProgress?: unknown
    latestProgress?: unknown
    primaryOpenLoop?: unknown
    nextClosureTarget?: unknown
    sameHerSelfLine?: unknown
    sameHerDriftRisk?: unknown
    companionHeadlineLine?: unknown
    awarenessLine?: unknown
    companionBriefingLine?: unknown
    preflightSummary?: unknown
  } | null
  fallbackProjectState?: AlicizationResponseCharterProjectStateInput | null
}) {
  const resolved = sanitizeText(
    resolveAlicizationProjectPreDialogueAwarenessLine({
      runtimeProjectState: input.runtimeProjectState ?? null,
      fallbackProjectState: input.fallbackProjectState ?? null,
    }),
    960,
  )
  const runtimeProjectState = input.runtimeProjectState ?? null
  const fallbackProjectState = input.fallbackProjectState ?? null
  const preferredRuntimeAwarenessSummary = preferRicherSameHerAwarenessSummary(
    runtimeProjectState?.preDialogueAwarenessSummary,
    runtimeProjectState?.preDialogueAwarenessLine
    ?? runtimeProjectState?.awarenessLine
    ?? runtimeProjectState?.companionHeadlineLine,
  )
  const preferredFallbackAwarenessSummary = preferRicherSameHerAwarenessSummary(
    fallbackProjectState?.preDialogueAwarenessSummary,
    fallbackProjectState?.preDialogueAwarenessLine
    ?? fallbackProjectState?.awarenessLine
    ?? fallbackProjectState?.companionHeadlineLine,
  )
  const preferredExplicitAwarenessLine = sanitizeText(
    preferredRuntimeAwarenessSummary
    || preferredFallbackAwarenessSummary
    || (
      !isThinProjectAwarenessShell(runtimeProjectState?.preDialogueAwarenessLine)
        ? runtimeProjectState?.preDialogueAwarenessLine
        : fallbackProjectState?.preDialogueAwarenessLine ?? runtimeProjectState?.preDialogueAwarenessLine
    ),
    960,
  )
  const explicitRuntimeAwarenessLine = sanitizeText(runtimeProjectState?.preDialogueAwarenessLine, 320)
  const preferredResolvedAwareness = resolved && !isThinProjectAwarenessShell(resolved)
    ? resolved
    : ''
  const synthesized = sanitizeText(
    uniqueAwarenessList([
      preferredExplicitAwarenessLine,
      preferredRuntimeAwarenessSummary || preferredFallbackAwarenessSummary,
      sanitizeText(runtimeProjectState?.companionHeadlineLine, 320),
      sanitizeText(runtimeProjectState?.awarenessLine, 320),
      sanitizeText(runtimeProjectState?.sameHerSelfLine, 320)
      || sanitizeText(fallbackProjectState?.sameHerSelfLine, 320),
      sanitizeText(runtimeProjectState?.latestLandedProgress, 320)
      || sanitizeText(runtimeProjectState?.latestProgress, 320)
      || sanitizeText(fallbackProjectState?.latestLandedProgress, 320)
      || sanitizeText(fallbackProjectState?.latestProgress, 320),
      sanitizeText(runtimeProjectState?.primaryOpenLoop, 320)
      || sanitizeText(fallbackProjectState?.primaryOpenLoop, 320),
      sanitizeText(runtimeProjectState?.nextClosureTarget, 320)
      || sanitizeText(fallbackProjectState?.nextClosureTarget, 320),
      sanitizeText(runtimeProjectState?.sameHerDriftRisk, 320)
      || sanitizeText(fallbackProjectState?.sameHerDriftRisk, 320),
      preferredResolvedAwareness,
      sanitizeText(runtimeProjectState?.companionBriefingLine, 320)
      || sanitizeText(fallbackProjectState?.companionBriefingLine, 320),
      sanitizeText(runtimeProjectState?.preflightSummary, 320)
      || sanitizeText(fallbackProjectState?.preflightSummary, 320),
    ], 6, 960).join(' '),
    960,
  )
  const awarenessContainsCarry = (text: string, carry: unknown) => {
    const normalizedText = sanitizeText(text, 960).toLowerCase()
    const normalizedCarry = sanitizeText(carry, 220).toLowerCase()
    if (!normalizedText || !normalizedCarry)
      return false
    if (normalizedText.includes(normalizedCarry))
      return true
    if (normalizedCarry.length < 48)
      return false
    return normalizedText.includes(normalizedCarry.slice(0, 48))
  }
  const synthesizedAddsRicherCarry = [
    runtimeProjectState?.latestLandedProgress
    ?? runtimeProjectState?.latestProgress
    ?? fallbackProjectState?.latestLandedProgress
    ?? fallbackProjectState?.latestProgress,
    runtimeProjectState?.primaryOpenLoop ?? fallbackProjectState?.primaryOpenLoop,
    runtimeProjectState?.nextClosureTarget ?? fallbackProjectState?.nextClosureTarget,
    runtimeProjectState?.sameHerSelfLine ?? fallbackProjectState?.sameHerSelfLine,
    runtimeProjectState?.sameHerDriftRisk ?? fallbackProjectState?.sameHerDriftRisk,
  ].some(carry => awarenessContainsCarry(synthesized, carry) && !awarenessContainsCarry(resolved, carry))

  if (explicitRuntimeAwarenessLine && !isThinProjectAwarenessShell(explicitRuntimeAwarenessLine))
    return explicitRuntimeAwarenessLine

  if (synthesizedAddsRicherCarry && synthesized)
    return synthesized

  if (resolved && !isThinProjectAwarenessShell(resolved))
    return resolved

  return synthesized || resolved
}

function deriveSameHerEmotionalClosureCueFromDiscipline(input: {
  mustDo: readonly string[]
  mustNotDo: readonly string[]
}) {
  const corpus = [...input.mustDo, ...input.mustNotDo].join(' ').toLowerCase()
  if (
    corpus.includes('keep the same-her emotional closure line low-pressure and inward until the live payoff lands')
    && corpus.includes('do not let the answer reopen the same-her line from scratch just because the closure seam is still active')
  ) {
    return 'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.'
  }
  return null
}

function strongestConcern(concerns: AlicizationConcernSnapshot[] | null | undefined) {
  const rows = Array.isArray(concerns) ? concerns : []
  return rows
    .slice()
    .sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0] ?? null
}

function governingCommitment(commitmentLedger?: AlicizationVisualPresenceStateSnapshot['commitmentLedger'] | null) {
  const commitments = commitmentLedger?.commitments ?? []
  if (commitments.length === 0)
    return null
  return commitments.find(commitment => commitment.id === commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
}

function activeInquiryPlan(inquiryPlanner?: AlicizationVisualPresenceStateSnapshot['inquiryPlanner'] | null) {
  const plans = inquiryPlanner?.plans ?? []
  if (plans.length === 0)
    return null
  return plans.find(plan => plan.id === inquiryPlanner?.activePlanId)
    ?? plans[0]
    ?? null
}

function hasHeldAutonomyContinuity(runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null) {
  const labels = runtimeSurface?.dialogue.sessionMirror?.continuityLabels
  if (!Array.isArray(labels) || labels.length === 0)
    return false
  return labels.some(label => sanitizeText(label, 120).includes(':held-autonomy'))
}

function dominantProject(intentionStream?: AlicizationVisualPresenceStateSnapshot['intentionStream'] | null) {
  const projects = intentionStream?.projects ?? []
  if (projects.length === 0)
    return null
  return projects.find(project => project.id === intentionStream?.dominantProjectId)
    ?? projects[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationVisualPresenceStateSnapshot['reflectionLedger'] | null) {
  const entries = reflectionLedger?.entries ?? []
  if (entries.length === 0)
    return null
  const latest = entries.find(entry => entry.id === reflectionLedger?.latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return entries.find(entry => entry.outcome !== 'released')
    ?? entries[0]
    ?? null
}

function resolveEpistemicMode(input: {
  context: AlicizationProactiveLayeredContext
  worldModel?: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  beliefRevision?: AlicizationVisualPresenceStateSnapshot['beliefRevision'] | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (
    input.dialogueFocus
    && input.dialogueFocus.shouldBypassScreenRepair
    && input.dialogueFocus.subject !== 'visible-scene'
  ) {
    return 'dialogue-grounded' as const
  }
  if (!input.worldModel)
    return 'memory-only' as const
  const certainty = input.worldModel?.epistemicState.certainty ?? 'uncertain'
  const posture = buildEpistemicSurfacePosture({
    context: input.context,
    worldModel: input.worldModel,
    beliefRevision: input.beliefRevision,
  })
  if (certainty === 'grounded')
    return 'grounded-live' as const
  if (posture.coarseObservedProblemHolding)
    return 'coarse-live' as const
  if (posture.requiresRegroundBeforeSurface)
    return 'repair-needed' as const
  return 'memory-only' as const
}

function resolveResponseMode(input: {
  epistemicMode: AlicizationResponseEpistemicMode
  context: AlicizationProactiveLayeredContext
  answerPlanner?: AlicizationVisualPresenceStateSnapshot['answerPlanner'] | null
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle'] | null
  privateThought?: AlicizationVisualPresenceStateSnapshot['privateThought'] | null
  actionEcology?: AlicizationVisualPresenceStateSnapshot['actionEcology'] | null
  concern: AlicizationConcernSnapshot | null
  commitment: AlicizationCommitmentSnapshot | null
  inquiry: AlicizationInquiryPlanSnapshot | null
  project: ReturnType<typeof dominantProject>
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (input.dialogueFocus?.subject === 'alicization-self')
    return 'answer-naturally' as const
  if (input.dialogueFocus?.subject === 'relationship')
    return 'accompany-lightly' as const
  if (input.dialogueFocus?.subject === 'host-state')
    return 'care-with-boundary' as const
  if (input.dialogueFocus?.subject === 'task-knot')
    return 'guide-current-knot' as const
  if (input.dialogueFocus?.shouldBypassScreenRepair && input.dialogueFocus?.subject === 'general')
    return 'answer-naturally' as const
  if (input.dialogueObligation?.kind === 'repair')
    return 'repair-and-reanchor' as const
  if (input.dialogueObligation?.kind === 'teach' || input.dialogueObligation?.kind === 'guide')
    return 'guide-current-knot' as const
  if (input.dialogueObligation?.kind === 'care')
    return 'care-with-boundary' as const
  if (input.dialogueObligation?.kind === 'accompany')
    return 'accompany-lightly' as const
  if (input.answerPlanner?.act === 'correct-stale-anchor' || input.answerPlanner?.act === 'ask-reground')
    return 'repair-and-reanchor' as const
  if (input.answerPlanner?.act === 'care')
    return 'care-with-boundary' as const
  if (input.answerPlanner?.act === 'guide')
    return 'guide-current-knot' as const
  if (input.answerPlanner?.act === 'defer')
    return 'accompany-lightly' as const
  if (input.executiveCycle?.phase === 'reflecting' || input.executiveCycle?.phase === 'inferring')
    return 'repair-and-reanchor' as const
  if (input.project?.kind === 'care-host')
    return 'care-with-boundary' as const
  if (input.project?.kind === 'hold-knot')
    return 'guide-current-knot' as const
  if (input.project?.kind === 'stay-near' || input.project?.kind === 'witness-afterglow')
    return 'accompany-lightly' as const
  if (
    input.concern?.kind === 'care-body'
    || input.commitment?.kind === 'care-host'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
  ) {
    return 'care-with-boundary' as const
  }
  if (
    input.epistemicMode === 'repair-needed'
    || input.commitment?.kind === 'repair-misread'
    || input.commitment?.kind === 'recheck-scene'
    || input.inquiry?.kind === 'reground-scene'
  ) {
    return 'repair-and-reanchor' as const
  }
  if (
    input.concern?.kind === 'help-fix'
    || input.commitment?.kind === 'hold-problem'
    || input.commitment?.kind === 'follow-through'
    || input.context.content.kind === 'error'
    || input.context.content.kind === 'diff'
    || input.context.workload.kind === 'coding'
    || input.context.workload.kind === 'terminal'
  ) {
    return 'guide-current-knot' as const
  }
  if (
    input.privateThought?.stance === 'observe'
    || input.privateThought?.stance === 'accompany'
    || input.actionEcology?.mode === 'quiet-accompany'
    || input.actionEcology?.mode === 'silent-presence'
  ) {
    return 'accompany-lightly' as const
  }
  return 'answer-naturally' as const
}

function resolveRelationshipPosture(input: {
  epistemicMode: AlicizationResponseEpistemicMode
  responseMode: AlicizationResponseMode
  selfContinuity?: AlicizationVisualPresenceStateSnapshot['selfContinuity'] | null
  mindKernel?: AlicizationVisualPresenceStateSnapshot['mindKernel'] | null
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle'] | null
  relationshipModel?: AlicizationVisualPresenceStateSnapshot['relationshipModel'] | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  if (
    (input.epistemicMode === 'repair-needed' && input.dialogueFocus?.screenReferenceMode !== 'avoid')
    || input.selfContinuity?.attachmentMode === 'guarded'
    || input.selfContinuity?.initiativeTemperament === 'reserved'
    || input.mindKernel?.dominantMode === 'repairing'
    || input.executiveCycle?.phase === 'reflecting'
    || input.executiveCycle?.phase === 'inferring'
  ) {
    return 'restrained' as const
  }
  if (input.dialogueObligation?.kind === 'care')
    return 'tender' as const
  if (
    input.responseMode === 'care-with-boundary'
    || input.relationshipModel?.approachVector === 'care'
    || input.relationshipModel?.approachVector === 'stay-near'
  ) {
    return 'tender' as const
  }
  return 'warm' as const
}

function resolveGoverningFocus(input: {
  currentScene?: AlicizationVisualPresenceStateSnapshot['currentScene'] | null
  executiveCycle?: AlicizationVisualPresenceStateSnapshot['executiveCycle'] | null
  answerPlanner?: AlicizationVisualPresenceStateSnapshot['answerPlanner'] | null
  concernContinuity?: AlicizationVisualPresenceStateSnapshot['concernContinuity'] | null
  repairLedger?: AlicizationVisualPresenceStateSnapshot['repairLedger'] | null
  worldModel?: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  privateThought?: AlicizationVisualPresenceStateSnapshot['privateThought'] | null
  replyDeliberation?: AlicizationVisualPresenceStateSnapshot['replyDeliberation'] | null
  dialogueWorldThread?: AlicizationVisualPresenceStateSnapshot['dialogueWorldThread'] | null
  concern: AlicizationConcernSnapshot | null
  commitment: AlicizationCommitmentSnapshot | null
  inquiry: AlicizationInquiryPlanSnapshot | null
  project: ReturnType<typeof dominantProject>
  reflection: ReturnType<typeof latestReflection>
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
}) {
  const concernContinuityEntries = asArray(input.concernContinuity?.entries)
  const repairLedgerEntries = asArray(input.repairLedger?.entries)
  return sanitizeText(
    input.replyDeliberation?.whyThisReplyNow
    || input.dialogueWorldThread?.currentQuestion
    || input.dialogueWorldThread?.activeThread
    || input.dialogueFocus?.focusSummary
    || input.dialogueSemantics?.summary
    || input.dialogueObligation?.summary
    || input.reflection?.revision
    || input.executiveCycle?.currentLine
    || input.project?.summary
    || input.answerPlanner?.governingFocus
    || concernContinuityEntries.find(entry => entry.id === input.concernContinuity?.governingEntryId)?.summary
    || repairLedgerEntries.find(entry => entry.id === input.repairLedger?.governingRepairId)?.summary
    || input.worldModel?.activeThread?.summary
    || input.concern?.summary
    || input.commitment?.summary
    || input.inquiry?.question
    || input.currentScene?.summary
    || input.privateThought?.thoughtText
    || '',
    220,
  ) || 'Stay with the host’s current knot instead of drifting into stale memory.'
}

function pushUnique(target: string[], value: string) {
  const normalized = sanitizeText(value, 220)
  if (!normalized)
    return
  if (target.includes(normalized))
    return
  target.push(normalized)
}

function uniqueList(values: Array<string | null | undefined>, maxItems = 6, maxChars = 220) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeText(value, maxChars)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function uniqueListWithPinnedPrefix(input: {
  pinned: Array<string | null | undefined>
  values: Array<string | null | undefined>
  maxItems: number
  maxChars?: number
}) {
  const maxChars = input.maxChars ?? 220
  const pinned = uniqueList(input.pinned, input.maxItems, maxChars)
  const rest = uniqueList(input.values, Math.max(0, input.maxItems - pinned.length), maxChars)
  return uniqueList([...pinned, ...rest], input.maxItems, maxChars)
}

function hasProjectStateCarryDisciplineFocus(focusDimensions?: string[] | null) {
  const focus = Array.isArray(focusDimensions) ? focusDimensions : []
  return (
    focus.includes('projectStateRichAwarenessCarry')
    || focus.includes('projectStateLandedProgressCarry')
    || focus.includes('projectStateNextClosureCarry')
    || focus.includes('projectStateEmotionalClosureCarry')
  )
}

function hasProjectEmotionalClosureDisciplineFocus(focusDimensions?: string[] | null) {
  const focus = Array.isArray(focusDimensions) ? focusDimensions : []
  return (
    focus.includes('projectEmotionalClosureCarry')
    || focus.includes('projectEmotionalClosureRewriteCarry')
    || focus.includes('projectEmotionalClosureLowPressureCarry')
    || focus.includes('projectEmotionalClosureAntiRestartCarry')
  )
}

function hasEmbodimentClosureCarryCue(projectState?: {
  primaryOpenLoop?: string | null
  nextClosureTarget?: string | null
  emotionalClosureCue?: string | null
  preDialogueAwarenessLine?: string | null
} | null) {
  const corpus = [
    sanitizeText(projectState?.primaryOpenLoop, 240),
    sanitizeText(projectState?.nextClosureTarget, 240),
    sanitizeText(projectState?.emotionalClosureCue, 240),
    sanitizeText(projectState?.preDialogueAwarenessLine, 240),
  ].join(' ').toLowerCase()

  if (!corpus)
    return false

  const carriesEmbodiment = /embodiment|voice|lipsync|face|motion|resident presence|cross-modal|具身|口型|表情|动作/u.test(corpus)
  const carriesSameLineRestraint = /same living line|same-her|same her|measured-return|repair-before-closeness|low-pressure|still settling/u.test(corpus)

  return carriesEmbodiment && carriesSameLineRestraint
}

const GOVERNING_PROJECT_MAX_CHARS = 1600

function pickPreferredOpenClosureSegment(segments: string[]) {
  const candidates = segments.filter((segment) => {
    if (/^next closure target:/i.test(segment))
      return false
    return /still-open closure|still need|still needs|end-to-end closure|life loop|open closure/i.test(segment)
  })

  if (!candidates.length)
    return null

  const canonicalCompact = candidates
    .filter(segment => /end-to-end closure|still-open closure|open closure|life loop/i.test(segment) && segment.length <= 420)
    .sort((left, right) => left.length - right.length)
  if (canonicalCompact[0])
    return canonicalCompact[0]

  const compact = candidates
    .filter(segment => segment.length <= 420)
    .sort((left, right) => left.length - right.length)
  if (compact[0])
    return compact[0]

  return [...candidates].sort((left, right) => left.length - right.length)[0] ?? null
}

function normalizeGoverningProjectClosureSeam(raw: unknown) {
  const fullText = sanitizeText(raw, 12000)
  if (!fullText)
    return null

  const hasStrongerLivingSelfProjectSeam
    = /holding together mainly through|one living her|same project line forward|same her carrying the same project line/i.test(fullText)

  if (!fullText.includes('Phase 1: Local Digital Life'))
    return sanitizeText(fullText, GOVERNING_PROJECT_MAX_CHARS) || fullText
  if (hasStrongerLivingSelfProjectSeam)
    return sanitizeText(fullText, GOVERNING_PROJECT_MAX_CHARS) || fullText

  const hasProjectIdentityCarry = fullText.includes('Project identity carry')
  const hasPhaseRouteCarry = fullText.includes('Phase 1 route carry')
  const hasUnresolvedClosureCarry = fullText.includes('Unresolved closure carry')
  const hasSameLivingThread = /same living thread|same-her closure line/i.test(fullText)

  const segments = fullText.split('|').map(segment => segment.trim()).filter(Boolean)
  const head = segments[0] ?? 'Phase 1: Local Digital Life'
  const detail = segments[1] ?? 'Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread proof.'
  const tail = segments.slice(2)

  const normalizedDetail = hasProjectIdentityCarry && hasPhaseRouteCarry && hasUnresolvedClosureCarry && hasSameLivingThread
    ? detail
    : `Project identity carry, Phase 1 route carry, and Unresolved closure carry still need stronger same living thread proof: ${lowerFirst(stripTrailingPunctuation(detail))}.`

  const normalizedTail = tail
  const requiredTail: string[] = []
  const remainingTail: string[] = []
  const pushUnique = (target: string[], value: string | null | undefined) => {
    if (!value || target.includes(value))
      return
    target.push(value)
  }
  const headAndDetail = `${head} | ${normalizedDetail}`
  const explicitPhaseSegment
    = !headAndDetail.includes('Phase 1: Local Digital Life')
      ? normalizedTail.find(segment => segment.includes('Phase 1: Local Digital Life')) ?? null
      : null
  const explicitNextClosureSegment
    = normalizedTail.find(segment => /^next closure target:/i.test(segment)) ?? null
  const explicitOpenClosureSegment = pickPreferredOpenClosureSegment(normalizedTail)

  pushUnique(requiredTail, explicitPhaseSegment)
  pushUnique(requiredTail, explicitNextClosureSegment)
  pushUnique(requiredTail, explicitOpenClosureSegment)

  for (const segment of normalizedTail) {
    if (requiredTail.includes(segment))
      continue
    pushUnique(remainingTail, segment)
  }

  let normalized = [head, normalizedDetail, ...requiredTail].filter(Boolean).join(' | ')
  if (normalized.length > GOVERNING_PROJECT_MAX_CHARS)
    return sanitizeText(normalized, GOVERNING_PROJECT_MAX_CHARS) || fullText

  for (const segment of remainingTail) {
    const candidate = `${normalized} | ${segment}`
    if (candidate.length > GOVERNING_PROJECT_MAX_CHARS)
      continue
    normalized = candidate
  }

  return normalized || sanitizeText(fullText, GOVERNING_PROJECT_MAX_CHARS) || fullText
}

function includesAny(text: string, needles: string[]) {
  return needles.some(needle => text.includes(needle))
}

function selfEvolutionSupportsLowerPressureOpening(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution)
    return false

  const relationshipDoctrine = sanitizeText(selfEvolution.relationshipDoctrine, 180).toLowerCase()
  const burdenLine = sanitizeText(selfEvolution.burdenLine, 180).toLowerCase()
  const trustMeaning = sanitizeText(selfEvolution.trustMeaning, 180).toLowerCase()
  const latestInflection = sanitizeText(selfEvolution.latestInflection, 180).toLowerCase()
  const relationshipCadenceSummary = sanitizeText(selfEvolution.relationshipCadenceSummary, 180).toLowerCase()

  return includesAny(relationshipDoctrine, ['leave more room', 'more room', 'slower return', 'lower-pressure'])
    || includesAny(burdenLine, ['overloaded', 'pressure', 'crowd', 'conversational pressure'])
    || includesAny(trustMeaning, ['lower-pressure', 'less eager', 'room', 'space', 'timing'])
    || includesAny(latestInflection, ['pressure', 'slower return', 'lower-pressure', 'less eager'])
    || includesAny(relationshipCadenceSummary, ['lower-pressure', 'less eager', 'room', 'space', 'timing', 'bounded-return', 'measured-return', 'reconfirmation', 'surface fully cools'])
}

function selfEvolutionSupportsSameHerOutwardContinuity(selfEvolution?: AlicizationSelfEvolutionKernelSnapshot | null) {
  if (!selfEvolution)
    return false

  const combined = [
    sanitizeText(selfEvolution.relationshipCadenceSummary, 240).toLowerCase(),
    sanitizeText(selfEvolution.latestInflection, 220).toLowerCase(),
    sanitizeText(selfEvolution.summary, 220).toLowerCase(),
    ...(Array.isArray(selfEvolution.sourceSignals)
      ? selfEvolution.sourceSignals.map(item => sanitizeText(item, 220).toLowerCase())
      : []),
  ]
    .filter(Boolean)
    .join(' | ')

  if (!combined)
    return false

  const carriesSameHerLine = includesAny(combined, [
    'same her',
    'same-her',
    'same living line',
    'one continuous her',
    'one living self',
    'across quiet, memory, and speech',
  ])
  const carriesAntiRestart = includesAny(combined, [
    'without reopening from scratch',
    'without restarting from scratch',
    'do not reopen from scratch',
    'instead of reopening from scratch',
    'instead of restarting',
  ])

  return carriesSameHerLine && carriesAntiRestart
}

function hasProjectStateSameHerContinuityCue(discourseState?: AlicizationDiscourseStateSnapshot | null) {
  if (!discourseState)
    return false

  const narrative = Array.isArray(discourseState.narrative)
    ? discourseState.narrative.map(item => sanitizeText(item, 120).toLowerCase())
    : []
  if (narrative.includes('project-state-same-her-continuity'))
    return true

  const summary = sanitizeText(discourseState.currentTurnSummary, 220).toLowerCase()
  return summary.includes('one continuous her')
    && includesAny(summary, ['project', 'what has landed', 'what still remains open'])
}

function looksLikeProjectStateDirectAnswerTurn(input: {
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  if (!input.dialogueObligation?.mustAnswerDirectly)
    return false

  const evidence = [
    sanitizeText(input.discourseState?.currentTurnSummary, 320),
    sanitizeText(input.discourseState?.currentQuestion, 320),
    sanitizeText(input.dialogueSemantics?.summary, 320),
  ]
    .filter(Boolean)
    .join(' | ')
    .toLowerCase()

  if (!evidence)
    return false

  const asksWhatThisProjectIs = /what alicization is|what this project is|项目是做什么|项目是什么/u.test(evidence)
  const asksProgressAndOpenClosure
    = /what still remains open|still remains open|what is not yet closed|做到什么程度|还差什么|没闭环|how far .* landed/u.test(evidence)
  const asksShortProgressFollowUp
    = /执行到哪(?:一步)?了|做到哪(?:一步)?了|进行到哪(?:一步)?了|进展到哪(?:一步)?了|现在到哪了/u.test(evidence)
  const asksLanguageOrProjectDrift
    = /为什么.*(?:英文|english).*(?:中文|chinese)|(?:一直|还在).*(?:英文|english).*(?:中文|chinese)|是不是.*偏移|已经偏移|偏移了吗|跑偏了吗|drifted|off-project wording|off project wording/u.test(evidence)
  const asksMergeReadinessOrClosure
    = /(?:can we|is (?:it|this)|ready to|merge-ready|能不能|可以|已经可以|现在可以).{0,40}(?:merge(?: this)? to main|合并到\s*main|ready to merge)|(?:merge(?: this)? to main|合并到\s*main|ready to merge).{0,24}(?:now|already|ready|了吗|吗)|还差哪步|还差哪一步|goal.{0,16}(?:闭环|完成|close|closed|complete)|才能算闭环|(?:已经在|已在|already (?:landed|on)|already contains|already on).{0,32}(?:本地\s*main|local\s+main)|(?:本地\s*main|local\s+main).{0,32}(?:已经|已|already).{0,24}(?:包含|落地|landed|contains|on)|origin\/main.{0,32}(?:安全|safe|update|push|推)|(?:安全|safe).{0,16}(?:推到|push to|update).{0,24}origin\/main|(?:会把|会不会把|without carrying|carry).{0,48}(?:别的提交|unrelated commits|other commits)|带上去/u.test(evidence)
  const namesProjectStateTurn = /project-state question|project status|project-state|project continuity/u.test(evidence)

  return namesProjectStateTurn
    || (asksWhatThisProjectIs && asksProgressAndOpenClosure)
    || (asksShortProgressFollowUp && asksLanguageOrProjectDrift)
    || asksMergeReadinessOrClosure
}

function hasRepairBeforeClosenessProjectContinuityCue(currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null) {
  const emotionalClosureCue = sanitizeText(
    (currentConsciousFrame?.projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
    220,
  ).toLowerCase()
  const primaryOpenLoop = sanitizeText(currentConsciousFrame?.projectState?.primaryOpenLoop, 220).toLowerCase()
  const nextClosureTarget = sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 220).toLowerCase()
  const consciousNeed = sanitizeText(currentConsciousFrame?.consciousNeed, 220).toLowerCase()
  const consciousTension = sanitizeText(currentConsciousFrame?.consciousTension, 220).toLowerCase()
  const speakingIntention = sanitizeText(currentConsciousFrame?.speakingIntention, 220).toLowerCase()
  const combined = [
    emotionalClosureCue,
    primaryOpenLoop,
    nextClosureTarget,
    consciousNeed,
    consciousTension,
    speakingIntention,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesRepairBeforeCloseness = includesAny(combined, [
    'repair-before-closeness',
    'repair before closeness',
    'repair-first',
    'let repair settle',
    '先修复再靠近',
    '修复优先',
  ])
  const carriesSameThread = includesAny(combined, [
    'same callback',
    'same thread',
    'same living line',
    'callback repair line',
    'same repair line',
    '同一条线',
    '修补线',
  ])
  const carriesRoomGiving = includesAny(combined, [
    'leave room',
    'room-giving',
    'before widening closeness',
    'before warmth widens',
    '留一点空间',
    '留空间',
    '不要突然放宽',
  ])

  return carriesRepairBeforeCloseness && carriesSameThread && carriesRoomGiving
}

function hasMeasuredReturnProjectContinuityCue(input: {
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
}) {
  const currentConsciousFrame = input.currentConsciousFrame ?? null
  const initiative = input.initiative ?? null
  if (initiative?.continuityRestraint === 'measured-return')
    return true

  const emotionalClosureCue = sanitizeText(
    (currentConsciousFrame?.projectState as { emotionalClosureCue?: unknown } | null)?.emotionalClosureCue,
    220,
  ).toLowerCase()
  const primaryOpenLoop = sanitizeText(currentConsciousFrame?.projectState?.primaryOpenLoop, 220).toLowerCase()
  const nextClosureTarget = sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 220).toLowerCase()
  const continuityPreferredTiming = sanitizeText(currentConsciousFrame?.projectState?.continuityPreferredTiming, 80).toLowerCase()
  const consciousNeed = sanitizeText(currentConsciousFrame?.consciousNeed, 220).toLowerCase()
  const consciousTension = sanitizeText(currentConsciousFrame?.consciousTension, 220).toLowerCase()
  const speakingIntention = sanitizeText(currentConsciousFrame?.speakingIntention, 220).toLowerCase()
  const combined = [
    emotionalClosureCue,
    primaryOpenLoop,
    nextClosureTarget,
    consciousNeed,
    consciousTension,
    speakingIntention,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesMeasuredReturn = includesAny(combined, [
    'measured-return',
    'measured return',
    'lower-pressure',
    'bounded-return',
    'leave room',
    'slower return',
    '先留白',
    '留白',
    '慢一点接回去',
  ])
  const carriesSameThread = includesAny(combined, [
    'same callback',
    'same thread',
    'same living line',
    'callback line',
    'same line',
    '同一条线',
    '同一条生命线',
  ])
  const carriesOpenContinuityLoop = includesAny(`${primaryOpenLoop} ${nextClosureTarget}`, [
    'continuity',
    'same-her',
    'same her',
    'same living line',
    'living line',
    'closure',
    'open loop',
    'still-open',
    'unfinished',
    'phase 1',
    'memory',
    'initiative',
    'embodiment',
  ])

  return carriesMeasuredReturn && (carriesSameThread || (continuityPreferredTiming === 'next-open-window' && carriesOpenContinuityLoop))
}

function hasQuietSameHerContinuityCue(input: {
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  initiative?: AlicizationInitiativeSnapshot | null
  projectState?: {
    primaryOpenLoop?: string | null
    nextClosureTarget?: string | null
    sameHerSelfLine?: string | null
  } | null
}) {
  const currentConsciousFrame = input.currentConsciousFrame ?? null
  const initiative = input.initiative ?? null
  const projectState = input.projectState ?? null
  const consciousNeed = sanitizeText(currentConsciousFrame?.consciousNeed, 220).toLowerCase()
  const consciousTension = sanitizeText(currentConsciousFrame?.consciousTension, 220).toLowerCase()
  const speakingIntention = sanitizeText(currentConsciousFrame?.speakingIntention, 220).toLowerCase()
  const focusAnchor = sanitizeText(currentConsciousFrame?.focusAnchor, 160).toLowerCase()
  const projectPrimaryOpenLoop = sanitizeText(projectState?.primaryOpenLoop, 220).toLowerCase()
  const projectNextClosureTarget = sanitizeText(projectState?.nextClosureTarget, 220).toLowerCase()
  const projectSameHerSelfLine = sanitizeText(projectState?.sameHerSelfLine, 220).toLowerCase()
  const framePrimaryOpenLoop = sanitizeText(currentConsciousFrame?.projectState?.primaryOpenLoop, 220).toLowerCase()
  const frameNextClosureTarget = sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 220).toLowerCase()
  const frameSameHerSelfLine = sanitizeText(currentConsciousFrame?.projectState?.sameHerSelfLine, 220).toLowerCase()
  const combined = [
    consciousNeed,
    consciousTension,
    speakingIntention,
    focusAnchor,
    projectPrimaryOpenLoop,
    projectNextClosureTarget,
    projectSameHerSelfLine,
    framePrimaryOpenLoop,
    frameNextClosureTarget,
    frameSameHerSelfLine,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesQuietSameHerContinuity = includesAny(combined, [
    'quiet same-her continuity',
    'quiet same her continuity',
    'same-her-inward-carry',
    'same her inward carry',
    'same_her_continuity_discipline=quiet-inward-carry',
    'quiet companionship',
    'same living line',
    'one continuous her',
    'same phase 1 digital life',
  ])
  const carriesInwardHold = includesAny(combined, [
    'inward',
    'inward-first',
    'keep the widening later',
    'widen later',
    'wait for a more natural opening',
    'before widening outward',
    'before widening warmth',
    'lower-pressure',
    'leave room',
    'room first',
  ])

  return carriesQuietSameHerContinuity && (carriesInwardHold || initiative?.continuityRestraint === 'measured-return')
}

function hasExecutionResumeConfirmationBoundaryProjectContinuityCue(input: {
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  projectState?: {
    primaryOpenLoop?: string | null
    nextClosureTarget?: string | null
    sameHerHoldDetail?: string | null
    continuityCue?: string | null
  } | null
}) {
  const currentConsciousFrame = input.currentConsciousFrame ?? null
  const projectState = input.projectState ?? null
  const consciousNeed = sanitizeText(currentConsciousFrame?.consciousNeed, 220).toLowerCase()
  const consciousTension = sanitizeText(currentConsciousFrame?.consciousTension, 220).toLowerCase()
  const speakingIntention = sanitizeText(currentConsciousFrame?.speakingIntention, 220).toLowerCase()
  const focusAnchor = sanitizeText(currentConsciousFrame?.focusAnchor, 160).toLowerCase()
  const projectPrimaryOpenLoop = sanitizeText(projectState?.primaryOpenLoop, 220).toLowerCase()
  const projectNextClosureTarget = sanitizeText(projectState?.nextClosureTarget, 220).toLowerCase()
  const projectSameHerHoldDetail = sanitizeText(projectState?.sameHerHoldDetail, 220).toLowerCase()
  const projectContinuityCue = sanitizeText(projectState?.continuityCue, 220).toLowerCase()
  const framePrimaryOpenLoop = sanitizeText(currentConsciousFrame?.projectState?.primaryOpenLoop, 220).toLowerCase()
  const frameNextClosureTarget = sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 220).toLowerCase()
  const frameSameHerHoldDetail = sanitizeText(currentConsciousFrame?.projectState?.sameHerHoldDetail, 220).toLowerCase()
  const frameContinuityCue = sanitizeText(currentConsciousFrame?.projectState?.continuityCue, 220).toLowerCase()
  const combined = [
    consciousNeed,
    consciousTension,
    speakingIntention,
    focusAnchor,
    projectPrimaryOpenLoop,
    projectNextClosureTarget,
    projectSameHerHoldDetail,
    projectContinuityCue,
    framePrimaryOpenLoop,
    frameNextClosureTarget,
    frameSameHerHoldDetail,
    frameContinuityCue,
  ]
    .filter(Boolean)
    .join(' ')

  const carriesExecutionResumeConfirmation = includesAny(combined, [
    'execution-resume-confirmation',
    'host-confirmed-before-redispatch',
    'resume-before-dispatch',
    'host-confirmed resume',
    'process-not-yet-restarted',
    'execution callback confirmation boundary',
    'bounded confirmation boundary',
  ])
  const carriesConfirmationBoundaryRestraint = includesAny(combined, [
    'bounded confirmation boundary',
    'before another execution-shaped opening',
    'not permanent execution permission',
    'standing execution permission',
    'generic autonomous continuation',
    'reusable execution permission',
  ])

  return carriesExecutionResumeConfirmation && carriesConfirmationBoundaryRestraint
}

function deriveProjectStateResponseCharterBias(projectState?: {
  identity?: string | null
  currentPhase?: string | null
  preDialogueAwarenessLine?: string | null
  nextClosureTarget?: string | null
  sameHerDriftRisk?: string | null
  sameHerSelfLine?: string | null
  primaryOpenLoop?: string | null
  sameHerHoldDetail?: string | null
  continuityCue?: string | null
  continuityPreferredTiming?: string | null
} | null, currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null, discourseState?: AlicizationDiscourseStateSnapshot | null, initiative?: AlicizationInitiativeSnapshot | null, dialogueSemantics?: AlicizationDialogueTurnSemantics | null, dialogueObligation?: AlicizationDialogueObligation | null) {
  const normalizedProjectState = projectState
    ? resolveAlicizationProjectStateSnapshot({
        runtimeProjectState: {
          identity: projectState.identity,
          currentPhase: projectState.currentPhase,
          preDialogueAwarenessLine: projectState.preDialogueAwarenessLine,
          nextClosureTarget: projectState.nextClosureTarget,
          sameHerDriftRisk: projectState.sameHerDriftRisk,
          sameHerSelfLine: projectState.sameHerSelfLine,
          primaryOpenLoop: projectState.primaryOpenLoop,
          sameHerHoldDetail: projectState.sameHerHoldDetail,
          continuityCue: projectState.continuityCue,
        },
      })
    : {
        identity: '',
        currentPhase: '',
        preDialogueAwarenessLine: null,
        preflightSummary: null,
        latestLandedProgress: null,
        primaryOpenLoop: null,
        nextClosureTarget: '',
        sameHerSelfLine: '',
        sameHerHoldDetail: null,
        continuityCue: null,
      }
  const identity = sanitizeText(normalizedProjectState.identity, 200).toLowerCase()
  const currentPhase = sanitizeText(normalizedProjectState.currentPhase, 160).toLowerCase()
  const preDialogueAwarenessLine = sanitizeText(normalizedProjectState.preDialogueAwarenessLine, 240).toLowerCase()
  const nextClosureTarget = sanitizeText(normalizedProjectState.nextClosureTarget, 240).toLowerCase()
  const sameHerSelfLine = sanitizeText(normalizedProjectState.sameHerSelfLine, 240).toLowerCase()
  const primaryOpenLoop = sanitizeText(normalizedProjectState.primaryOpenLoop, 220).toLowerCase()
  const sameHerHoldDetail = sanitizeText(normalizedProjectState.sameHerHoldDetail, 240).toLowerCase()
  const continuityCue = sanitizeText(normalizedProjectState.continuityCue, 240).toLowerCase()
  const continuityReasonTags = currentConsciousFrame?.reasonTags ?? []
  const continuityPreferredTiming = continuityReasonTags.includes('continuity-timing:next-open-window')
    ? 'next-open-window'
    : continuityReasonTags.includes('continuity-timing:after-payoff')
      ? 'after-payoff'
      : continuityReasonTags.includes('continuity-timing:same-turn-if-invited')
        ? 'same-turn-if-invited'
        : sanitizeText(projectState?.continuityPreferredTiming, 80).toLowerCase()

  const isDigitalLifeIdentity = includesAny(identity, [
    'digital life',
    'lifeform',
    'companion',
    'continuous personhood',
  ])
  const isPhaseOne = currentPhase.includes('phase 1')
  const hasSameHerSelfLine = includesAny(sameHerSelfLine, [
    'same phase 1 digital life',
    'same living line',
    'same her',
    'one living her',
    'one continuous her',
    'without splitting her continuity',
  ])
  const hasPreDialogueSameHerAwareness = includesAny(preDialogueAwarenessLine, [
    'same digital life',
    'same living line',
    'same her',
    'one living her',
    'phase 1 digital life',
    'without splitting her continuity',
  ])
  const hasOpenLifeLoop = primaryOpenLoop.length > 0
    && includesAny(primaryOpenLoop, [
      'continuity',
      'memory',
      'initiative',
      'embodiment',
      'dialogue',
      'personhood',
      'closure',
      'closed loop',
    ])
  const hasNextClosureSameHerPressure = nextClosureTarget.length > 0
    && includesAny(nextClosureTarget, [
      'same-her',
      'same her',
      'same living line',
      'project identity carry',
      'phase 1 route carry',
      'unresolved closure carry',
      'measured-return',
      'repair-before-closeness',
      'resident presence',
      'voice',
      'face',
      'motion',
      'embodiment',
      'initiative',
    ])
  const sameHerContinuityFromDiscourse = hasProjectStateSameHerContinuityCue(discourseState)
  const implicitProjectStateDirectAnswerTurn = looksLikeProjectStateDirectAnswerTurn({
    discourseState,
    dialogueSemantics,
    dialogueObligation,
  })
  const hasResumeConfirmationBoundaryCue
    = hasExecutionResumeConfirmationBoundaryProjectContinuityCue({
      currentConsciousFrame,
      projectState: {
        primaryOpenLoop,
        nextClosureTarget,
        sameHerHoldDetail,
        continuityCue,
      },
    })
  const sameHerContinuityFromProjectState
    = hasSameHerSelfLine || hasPreDialogueSameHerAwareness || hasNextClosureSameHerPressure || hasResumeConfirmationBoundaryCue
  const hasProjectStateCarryDiscipline
    = hasNextClosureSameHerPressure
      || hasResumeConfirmationBoundaryCue
      || hasOpenLifeLoop
      || (
        hasPreDialogueSameHerAwareness
        && includesAny(`${preDialogueAwarenessLine} ${sameHerSelfLine}`, [
          'phase 1',
          'unfinished',
          'life loop',
          'closure',
          'still open',
          'same digital life',
          'same living line',
        ])
      )

  if (!sameHerContinuityFromDiscourse && !implicitProjectStateDirectAnswerTurn && !sameHerContinuityFromProjectState && (!isDigitalLifeIdentity || !isPhaseOne || !hasOpenLifeLoop))
    return null

  if ((sameHerContinuityFromDiscourse || implicitProjectStateDirectAnswerTurn || sameHerContinuityFromProjectState) && (!isDigitalLifeIdentity || !isPhaseOne || !hasOpenLifeLoop)) {
    return {
      preferRestrainedPosture: true,
      reason: 'Same-her project continuity is already explicit here, so the visible answer must stay on one continuous living line instead of slipping into a generic project shell.',
      mustDo: hasProjectStateCarryDiscipline
        ? 'Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.'
        : 'Keep the project answer on one continuous living line: answer the live project knot first, then only widen if the same turn still has room.',
      mustNotDo: 'Do not let an already-explicit same-her project continuity turn flatten into detached project narration, fresh-opening posture, or generic project-shell phrasing.',
    }
  }

  if (continuityPreferredTiming === 'next-open-window' && hasResumeConfirmationBoundaryCue) {
    return {
      preferRestrainedPosture: true,
      reason: 'Remembered host-confirmed resume is still only a bounded confirmation boundary, so callback wording must not widen it into standing execution permission.',
      mustDo: 'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      mustNotDo: 'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
    }
  }

  if (
    continuityPreferredTiming === 'next-open-window'
    && (
      initiative?.continuityRestraint === 'repair-before-closeness'
      || hasRepairBeforeClosenessProjectContinuityCue(currentConsciousFrame)
    )
  ) {
    return {
      preferRestrainedPosture: true,
      reason: 'Project continuity is still on a repair-before-closeness same-thread return, so visible widening should let repair settle before warmth widens again.',
      mustDo: 'Keep the callback on the same living line, let repair settle first, and let the first visible beat land the repair line before widening closeness again.',
      mustNotDo: 'Do not widen into warmer payoff, fresh-opening tone, or renewed closeness before the repair line and room have both settled.',
    }
  }

  if (
    continuityPreferredTiming === 'next-open-window'
    && hasMeasuredReturnProjectContinuityCue({
      currentConsciousFrame,
      initiative,
    })
  ) {
    const quietSameHerContinuity = hasQuietSameHerContinuityCue({
      currentConsciousFrame,
      initiative,
      projectState,
    })
    return {
      preferRestrainedPosture: true,
      reason: quietSameHerContinuity
        ? 'Project continuity is carrying a quiet same-her line inward, so visible widening should stay on that same living line until the thread naturally opens again.'
        : 'Project continuity still prefers a later opening, so visible widening should stay lower-pressure until the thread naturally opens again.',
      mustDo: quietSameHerContinuity
        ? 'Keep the current reply on the same living line, let the first visible beat carry quiet same-her continuity from the inside, and wait for a more natural opening before widening warmth, payoff, or closeness.'
        : 'Keep the current reply on the same living line, let the first visible beat re-enter the current line, and wait for a more natural opening before widening warmth, payoff, or closeness.',
      mustNotDo: quietSameHerContinuity
        ? 'Do not widen into a warmer payoff, fresh-opening tone, or generic measured-return shell before the current thread has reached a more natural opening.'
        : 'Do not widen into a warmer payoff or fresh-opening tone before the current thread has reached a more natural opening.',
    }
  }

  if (
    continuityPreferredTiming === 'next-open-window'
    && (
      sameHerContinuityFromDiscourse
      || hasOpenLifeLoop
      || sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 220).length > 0
    )
  ) {
    return {
      preferRestrainedPosture: true,
      reason: 'Project continuity still prefers a later opening, so visible widening should stay lower-pressure until the thread naturally opens again.',
      mustDo: 'Keep the current reply on the same living line, let the first visible beat re-enter the current line, and wait for a more natural opening before widening warmth, payoff, or closeness.',
      mustNotDo: 'Do not widen into a warmer payoff or fresh-opening tone before the current thread has reached a more natural opening.',
    }
  }

  if (continuityPreferredTiming === 'after-payoff') {
    return {
      preferRestrainedPosture: true,
      reason: 'Project continuity still prefers payoff-first timing, so visible continuity should let the concrete answer land before widening the relationship line.',
      mustDo: 'Let the concrete payoff or repair line land first, then only widen the same-her continuity if room still remains afterward.',
      mustNotDo: 'Do not front-load the continuity payoff ahead of the concrete answer the current thread still owes.',
    }
  }

  return {
    preferRestrainedPosture: true,
    reason: 'Phase 1 digital-life closure is still open, so the visible answer should stay lower-pressure and less performative.',
    mustDo: 'Keep the answer person-like and low-pressure: lead with the current knot, then only soften if the turn has already earned it.',
    mustNotDo: 'Do not use unclosed digital-life ambition as a reason to sound over-intimate, over-certain, or theatrically alive before the current thread is earned.',
  }
}

function mergeRelationshipPosture(input: {
  projected?: AlicizationResponseCharter['relationshipPosture'] | null
  computed: AlicizationResponseCharter['relationshipPosture']
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}) {
  const patch = input.selfRevisionPatch ?? null
  if (patch?.lanes.includes('relationship-posture')) {
    if (patch.relationshipPosture.closenessCapBias >= 0.12 || patch.relationshipPosture.repairWindowBias >= 0.14)
      return 'restrained' as const
    if (patch.relationshipPosture.warmthReleaseBias >= 0.08 && input.computed !== 'restrained' && input.projected !== 'restrained')
      return 'warm' as const
  }
  if (!input.projected)
    return input.computed
  if (input.computed === 'restrained' || input.projected === 'restrained')
    return 'restrained' as const
  if (input.computed === 'tender' || input.projected === 'tender')
    return 'tender' as const
  return 'warm' as const
}

export function buildAlicizationResponseCharter(input: {
  context: AlicizationProactiveLayeredContext
  state: AlicizationVisualPresenceStateSnapshot
  projectState?: AlicizationResponseCharterProjectStateInput | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  inspectionRequested: boolean
  dialogueActKernel?: AlicizationDialogueActKernelSnapshot | null
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  currentConsciousFrame?: AlicizationCurrentConsciousFrameSnapshot | null
  claimEvidenceLedger?: AlicizationClaimEvidenceLedgerSnapshot | null
  selfRevisionPatch?: AlicizationSelfRevisionStatePatch | null
}) {
  const runtimeSurface = input.runtimeSurface ?? buildAlicizationDigitalLifeRuntimeSurface(input.state)
  const digitalLifeArchitecture = buildAlicizationDigitalLifeArchitecture(runtimeSurface)
  const dialogueEncounter = input.dialogueEncounter ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const currentScene = runtimeSurface.perception.currentScene ?? null
  const worldModel = runtimeSurface.world.worldModel ?? null
  const worldOntology = runtimeSurface.world.worldOntology ?? null
  const relationshipModel = runtimeSurface.world.relationshipModel ?? null
  const beliefRevision = runtimeSurface.cognition.beliefRevision ?? null
  const mindKernel = runtimeSurface.cognition.mindKernel ?? null
  const privateThought = runtimeSurface.cognition.privateThought ?? null
  const concerns = runtimeSurface.memory.concerns ?? null
  const concernContinuity = runtimeSurface.memory.concernContinuity ?? null
  const selfContinuity = runtimeSurface.memory.selfContinuity ?? null
  const commitmentLedger = runtimeSurface.memory.commitmentLedger ?? null
  const inquiryPlanner = runtimeSurface.memory.inquiryPlanner ?? null
  const repairLedger = runtimeSurface.memory.repairLedger ?? null
  const intentionStream = runtimeSurface.memory.intentionStream ?? null
  const reflectionLedger = runtimeSurface.memory.reflectionLedger ?? null
  const executiveCycle = runtimeSurface.memory.executiveCycle ?? null
  const recallGovernor = runtimeSurface.memory.recallGovernor ?? null
  const derivedBundle = runtimeSurface.memory.derivedMindStateBundle ?? null
  const activeContinuityGovernance = readActiveContinuityGovernanceFromDerivedMindStateBundle(derivedBundle)
  const personStateProjection = runtimeSurface.memory.personStateProjection ?? null
  const learningExecutionState = readLearningExecutionStateFromDerivedMindStateBundle(derivedBundle)
    ?? runtimeSurface.memory.learningExecutionState
    ?? null
  const memoryTuningAdvice = runtimeSurface.memory.memoryTuningAdvice ?? null
  const projectEmotionalClosureDisciplineRequired = hasProjectEmotionalClosureDisciplineFocus(memoryTuningAdvice?.focusDimensions)
  const selfEvolution = runtimeSurface.memory.selfEvolution ?? null
  const memoryDeliberationKernel = buildAlicizationMemoryDeliberationKernel({
    deliberation: readMemoryDeliberationFromDerivedMindStateBundle<any>(derivedBundle)
      ?? runtimeSurface.memory.memoryDeliberation
      ?? null,
    speech: readRecollectionSpeechPlanFromDerivedMindStateBundle<any>(derivedBundle)
      ?? runtimeSurface.memory.recollectionSpeechPlan
      ?? null,
    recollectionIntent: readRecollectionIntentFromDerivedMindStateBundle<any>(derivedBundle)
      ?? null,
    knowledgeEvidence: runtimeSurface.memory.knowledgeEvidence ?? null,
    hostPersonModel: readHostPersonModelFromDerivedMindStateBundle(derivedBundle)
      ?? runtimeSurface.memory.hostPersonModel
      ?? null,
    tuningAdvice: memoryTuningAdvice,
  })
  const discourseState = runtimeSurface.dialogue.discourseState ?? input.discourseState ?? null
  const mindSynthesis = runtimeSurface.dialogue.mindSynthesis ?? input.mindSynthesis ?? null
  const dialogueWorldThread = runtimeSurface.dialogue.dialogueWorldThread ?? null
  const dialogueActKernel = runtimeSurface.dialogue.dialogueActKernel ?? input.dialogueActKernel ?? null
  const answerCompiler = runtimeSurface.dialogue.answerCompiler ?? input.answerCompiler ?? null
  const currentConsciousFrame = runtimeSurface.dialogue.currentConsciousFrame ?? input.currentConsciousFrame ?? null
  const claimEvidenceLedger = runtimeSurface.dialogue.claimEvidenceLedger ?? input.claimEvidenceLedger ?? null
  const replyDeliberation = runtimeSurface.dialogue.replyDeliberation ?? null
  const answerPlanner = runtimeSurface.dialogue.answerPlanner ?? null
  const initiative = runtimeSurface.agency.initiative ?? null
  const selfRevisionPatch = input.selfRevisionPatch ?? null
  const discourseDrivenProjectStateSameHer = hasProjectStateSameHerContinuityCue(discourseState)
  const projectStateCarrySource = {
    primaryOpenLoop:
      sanitizeText(currentConsciousFrame?.projectState?.primaryOpenLoop, 320)
      || sanitizeText(input.projectState?.primaryOpenLoop, 320)
      || null,
    nextClosureTarget:
      sanitizeText(currentConsciousFrame?.projectState?.nextClosureTarget, 320)
      || sanitizeText(input.projectState?.nextClosureTarget, 320)
      || null,
    emotionalClosureCue:
      sanitizeText(currentConsciousFrame?.projectState?.emotionalClosureCue, 220)
      || sanitizeText(input.projectState?.emotionalClosureCue, 220)
      || null,
    preDialogueAwarenessLine:
      sanitizeText(currentConsciousFrame?.projectState?.preDialogueAwarenessLine, 320)
      || sanitizeText(input.projectState?.preDialogueAwarenessLine, 320)
      || null,
    sameHerDriftRisk:
      sanitizeText(currentConsciousFrame?.projectState?.sameHerDriftRisk, 220)
      || sanitizeText(input.projectState?.sameHerDriftRisk, 220)
      || null,
    sameHerHoldDetail:
      sanitizeText(currentConsciousFrame?.projectState?.sameHerHoldDetail, 320)
      || sanitizeText(input.projectState?.sameHerHoldDetail, 320)
      || null,
    continuityCue:
      sanitizeText(currentConsciousFrame?.projectState?.continuityCue, 320)
      || sanitizeText(input.projectState?.continuityCue, 320)
      || null,
  }
  const projectStateResponseCharterBias = deriveProjectStateResponseCharterBias(
    input.projectState ?? null,
    currentConsciousFrame,
    discourseState,
    initiative,
    dialogueSemantics,
    dialogueObligation,
  )
  const projectStateEmotionalClosureCue = readProjectStateEmotionalClosureCue(projectStateCarrySource)
    ?? null
  const projectStateBrief = resolveAlicizationProjectStateBrief()
  const runtimeProjectAwarenessState = currentConsciousFrame?.projectState
    ? {
        preDialogueAwarenessLine:
          sanitizeText(currentConsciousFrame.projectState.preDialogueAwarenessLine, 1600) || null,
        preDialogueAwarenessSummary:
          sanitizeText(currentConsciousFrame.projectState.preDialogueAwarenessSummary, 1600) || null,
        awarenessLine:
          sanitizeText(currentConsciousFrame.projectState.awarenessLine, 320) || null,
        companionHeadlineLine:
          sanitizeText(currentConsciousFrame.projectState.companionHeadlineLine, 320) || null,
        companionBriefingLine:
          sanitizeText(currentConsciousFrame.projectState.companionBriefingLine, 320) || null,
        latestLandedProgress:
          sanitizeText(currentConsciousFrame.projectState.latestLandedProgress, 320)
          || sanitizeText(currentConsciousFrame.projectState.latestProgress, 320)
          || null,
        latestProgress:
          sanitizeText(currentConsciousFrame.projectState.latestProgress, 320) || null,
        primaryOpenLoop:
          sanitizeText(currentConsciousFrame.projectState.primaryOpenLoop, 320) || null,
        nextClosureTarget:
          sanitizeText(currentConsciousFrame.projectState.nextClosureTarget, 320) || null,
        sameHerSelfLine:
          sanitizeText(currentConsciousFrame.projectState.sameHerSelfLine, 320) || null,
        sameHerDriftRisk:
          sanitizeText(currentConsciousFrame.projectState.sameHerDriftRisk, 320) || null,
        preflightSummary:
          sanitizeText(currentConsciousFrame.projectState.preflightSummary, 1600) || null,
      }
    : null
  const projectStatePreDialogueAwareness = sanitizeText(
    resolveCharterProjectStatePreDialogueAwareness({
      runtimeProjectState: runtimeProjectAwarenessState,
      fallbackProjectState: {
        ...input.projectState,
        preDialogueAwarenessLine:
          (sanitizeText(
            !isThinProjectAwarenessShell(currentConsciousFrame?.projectState?.preDialogueAwarenessLine)
              ? currentConsciousFrame?.projectState?.preDialogueAwarenessLine
              : sanitizeText(input.projectState?.preDialogueAwarenessLine, 1600)
                ?? currentConsciousFrame?.projectState?.preDialogueAwarenessLine,
            1600,
          )
          || sanitizeText(input.projectState?.preDialogueAwarenessLine, 1600))
        ?? projectStateBrief.preDialogueAwarenessLine
        ?? null,
        preflightSummary:
          (sanitizeText(currentConsciousFrame?.projectState?.preflightSummary, 1600)
            || sanitizeText(input.projectState?.preflightSummary, 1600))
          ?? projectStateBrief.preflightSummary
          ?? null,
        latestLandedProgress:
          sanitizeText(currentConsciousFrame?.projectState?.latestLandedProgress, 320)
          || sanitizeText(currentConsciousFrame?.projectState?.latestProgress, 320)
          || sanitizeText(input.projectState?.latestLandedProgress, 320)
          || sanitizeText(input.projectState?.latestProgress, 320)
          || null,
        latestProgress:
          sanitizeText(currentConsciousFrame?.projectState?.latestProgress, 320)
          || sanitizeText(input.projectState?.latestProgress, 320)
          || null,
        preDialogueAwarenessSummary:
          sanitizeText(currentConsciousFrame?.projectState?.preDialogueAwarenessSummary, 1600)
          || sanitizeText(input.projectState?.preDialogueAwarenessSummary, 1600)
          || null,
        primaryOpenLoop: projectStateCarrySource.primaryOpenLoop,
        nextClosureTarget: projectStateCarrySource.nextClosureTarget,
        sameHerSelfLine:
          sanitizeText(currentConsciousFrame?.projectState?.sameHerSelfLine, 320)
          || sanitizeText(input.projectState?.sameHerSelfLine, 320)
          || null,
        sameHerDriftRisk: projectStateCarrySource.sameHerDriftRisk,
        companionHeadlineLine:
          sanitizeText(currentConsciousFrame?.projectState?.companionHeadlineLine, 320)
          || sanitizeText(input.projectState?.companionHeadlineLine, 320)
          || null,
        awarenessLine:
          sanitizeText(currentConsciousFrame?.projectState?.awarenessLine, 320)
          || sanitizeText(input.projectState?.awarenessLine, 320)
          || null,
        companionBriefingLine:
          sanitizeText(currentConsciousFrame?.projectState?.companionBriefingLine, 320)
          || sanitizeText(input.projectState?.companionBriefingLine, 320)
          || null,
      },
    }),
    480,
  )
  const projectStatePreDialogueAwarenessLower = projectStatePreDialogueAwareness.toLowerCase()
  const projectStateSameLivingLineCarry
    = Boolean(projectStatePreDialogueAwarenessLower)
      && includesAny(projectStatePreDialogueAwarenessLower, [
        'same living line',
        'same phase 1 digital life',
        'one continuous "her"',
        'one continuous her',
        'same still-open closure work',
        'still-open closure',
        'generic assistant shell',
        'detached project narrator shell',
      ])
  const projectStateCarryDisciplineRequired
    = hasProjectStateCarryDisciplineFocus(memoryTuningAdvice?.focusDimensions)
      || (
        Boolean(projectStatePreDialogueAwarenessLower)
        && includesAny(projectStatePreDialogueAwarenessLower, [
          'digital life project',
          'phase 1',
          'unfinished',
          'life loop',
          'same',
        ])
        && (
          discourseDrivenProjectStateSameHer
          || currentConsciousFrame?.reasonTags?.includes('project-state')
          || currentConsciousFrame?.reasonTags?.includes('same-her')
          || projectStateSameLivingLineCarry
          || false
        )
      )
  const selfEvolutionSameHerOutwardContinuityReason = selfEvolutionSupportsSameHerOutwardContinuity(selfEvolution)
    ? 'Long-horizon same-her cadence is already acting like durable outward continuity, so the visible answer should continue the same living line instead of restarting the relationship from zero.'
    : null
  const selfEvolutionSameHerOutwardContinuityMustDo = selfEvolutionSupportsSameHerOutwardContinuity(selfEvolution)
    ? 'Let durable same-her cadence keep this reply on the same living line across quiet, memory, and speech before widening outward.'
    : null
  const selfEvolutionSameHerOutwardContinuityMustNotDo = selfEvolutionSupportsSameHerOutwardContinuity(selfEvolution)
    ? 'Do not let the visible answer reopen from scratch, slip into a fresh-opening shell, or flatten into a generic helper voice while this same-her cadence is still carrying the turn.'
    : null
  const concern = strongestConcern(concerns)
  const commitment = governingCommitment(commitmentLedger)
  const inquiry = activeInquiryPlan(inquiryPlanner)
  const project = dominantProject(intentionStream)
  const reflection = latestReflection(reflectionLedger)
  if (answerCompiler) {
    const synthesizedConcerns = asArray(mindSynthesis?.concerns)
    const synthesizedCommitments = asArray(mindSynthesis?.commitments)
    const epistemicMode = answerCompiler.evidenceMode === 'live-grounded' || answerCompiler.evidenceMode === 'live-observed'
      ? 'grounded-live' as const
      : answerCompiler.evidenceMode === 'coarse-held'
        ? 'coarse-live' as const
        : answerCompiler.evidenceMode === 'dialogue-grounded'
          ? 'dialogue-grounded' as const
          : answerCompiler.evidenceMode === 'repair-first'
            ? 'repair-needed' as const
            : 'memory-only' as const
    return {
      epistemicMode,
      responseMode: answerCompiler.responseMode,
      governingFocus: sanitizeText(
        currentConsciousFrame?.speakingIntention
        || currentConsciousFrame?.consciousNeed
        || currentConsciousFrame?.consciousTension
        || claimEvidenceLedger?.intentHypothesis
        || claimEvidenceLedger?.taskHypothesis
        || claimEvidenceLedger?.observedSurface
        || dialogueActKernel?.whyNow
        || dialogueActKernel?.openingClaim
        || replyDeliberation?.whyThisReplyNow
        || dialogueWorldThread?.currentQuestion
        || dialogueWorldThread?.activeThread
        || answerCompiler.openingDirective
        || discourseState?.currentTurnSummary
        || mindSynthesis?.interiorSummary
        || answerCompiler.openingClaim,
        220,
      ) || 'Stay with the compiled answer spine.',
      governingConcern: sanitizeText(synthesizedConcerns[0]?.summary ?? concern?.summary ?? '', 180) || null,
      governingCommitment: sanitizeText(synthesizedCommitments[0]?.summary ?? commitment?.summary ?? '', 180) || null,
      governingInquiry: sanitizeText(answerCompiler.nextMove ?? inquiry?.question ?? '', 180) || null,
      governingProject: normalizeGoverningProjectClosureSeam(
        answerPlanner?.governingProject
        ?? project?.summary
        ?? answerCompiler.openingClaim,
      ),
      emotionalClosureCue: projectStateEmotionalClosureCue,
      latestRevision: sanitizeText(reflection?.revision ?? '', 180) || null,
      executivePhase: sanitizeText(executiveCycle?.phase ?? '', 64) || null,
      truthFrame: sanitizeText(
        initiative?.selectedTruthFrame
        ?? worldOntology?.dominantFrame
        ?? '',
        96,
      ) || null,
      mindMode: sanitizeText(
        mindKernel?.dominantMode
        ?? privateThought?.stance
        ?? '',
        48,
      ) || null,
      digitalLifeOperatingMode: digitalLifeArchitecture?.operatingMode ?? null,
      digitalLifeDominantSystem: digitalLifeArchitecture?.dominantSystem ?? null,
      digitalLifeSummary: sanitizeText(digitalLifeArchitecture?.summary ?? '', 220) || null,
      activeClosenessContext: personStateProjection?.activeClosenessContext ?? null,
      activeClosenessRung: personStateProjection?.activeClosenessRung ?? null,
      activeLearningAction: learningExecutionState?.nextLearningAction ?? null,
      activeSelfRevisionPatch: selfRevisionPatch
        ? {
            id: selfRevisionPatch.id,
            decisionTraceId: selfRevisionPatch.decisionTraceId,
            lanes: [...selfRevisionPatch.lanes],
            reasonCodes: [...selfRevisionPatch.reasonCodes],
            summary: selfRevisionPatch.summary,
            projectStateContinuity: selfRevisionPatch.projectStateContinuity,
          }
        : null,
      relationshipPosture: mergeRelationshipPosture({
        projected: personStateProjection?.relationshipPosture ?? null,
        computed: projectStateResponseCharterBias?.preferRestrainedPosture ? 'restrained' : answerCompiler.relationshipPosture,
        selfRevisionPatch,
      }),
      reasons: uniqueListWithPinnedPrefix({
        pinned: [
          projectStateResponseCharterBias?.reason ?? null,
          selfEvolutionSameHerOutwardContinuityReason,
          reflection?.revision ?? null,
        ],
        values: [
          activeContinuityGovernance?.mode === 'same-her-baseline'
            ? `Active same-her baseline: ${activeContinuityGovernance.summary ?? activeContinuityGovernance.reasonCodes[0] ?? activeContinuityGovernance.candidateId ?? 'preserve current personhood continuity'}.`
            : null,
          personStateProjection?.selfContinuityAuthority?.authoritySummary
            ? `Shared self authority: ${personStateProjection.selfContinuityAuthority.authoritySummary}.`
            : null,
          personStateProjection
            ? `Closeness ladder: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`
            : null,
          currentConsciousFrame?.consciousNeed,
          currentConsciousFrame?.consciousTension,
          currentConsciousFrame?.speakingIntention,
          claimEvidenceLedger?.observedSurface,
          claimEvidenceLedger?.taskHypothesis,
          claimEvidenceLedger?.intentHypothesis,
          memoryDeliberationKernel?.rationale,
          memoryDeliberationKernel?.selectedChainSummary,
          memoryDeliberationKernel?.selectedBundleSummary,
          dialogueActKernel?.whyNow,
          ...(dialogueActKernel?.sourceTrace ?? []),
          dialogueWorldThread?.activeThread,
          dialogueWorldThread?.currentQuestion,
          answerCompiler.openingClaim,
          ...answerCompiler.supportingReality,
          mindSynthesis?.interiorSummary,
          discourseState?.currentTurnSummary,
          learningExecutionState?.nextLearningAction
            ? `Learning stance: ${learningExecutionState.nextLearningAction}.`
            : null,
          selfRevisionPatch
            ? `Active self revision: ${selfRevisionPatch.summary ?? selfRevisionPatch.reasonCodes[0] ?? selfRevisionPatch.id}.`
            : null,
        ],
        maxItems: 5,
      }),
      mustDo: uniqueListWithPinnedPrefix({
        pinned: [
          projectStateResponseCharterBias?.mustDo ?? null,
          selfEvolutionSameHerOutwardContinuityMustDo,
        ],
        values: [
          projectStatePreDialogueAwareness
            ? `Before widening outward, keep this pre-dialogue project awareness explicit inside the reply posture: ${projectStatePreDialogueAwareness}.`
            : null,
          personStateProjection?.selfContinuityAuthority?.authoritySummary
            ? `Keep the visible reply legible as the same self that says ${lowerFirst(stripTrailingPunctuation(personStateProjection.selfContinuityAuthority.authoritySummary))}.`
            : null,
          personStateProjection
            ? `Keep the answer inside the closeness ladder for this turn: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`
            : null,
          currentConsciousFrame?.truthDiscipline === 'observe-then-hypothesize'
            ? 'Separate present observation from hypothesis in the visible answer.'
            : null,
          claimEvidenceLedger?.shouldLabelHypothesis
            ? 'Keep observation and hypothesis in visibly separate clauses.'
            : null,
          currentConsciousFrame?.truthDiscipline === 'repair-first'
            ? 'Let self-revision happen in the visible answer before introducing new explanation.'
            : null,
          currentConsciousFrame?.truthDiscipline === 'dialogue-first'
            ? 'Let the living dialogue subject outrank screen context in the opening answer.'
            : null,
          learningExecutionState?.nextLearningAction === 'verify'
            ? 'Keep visible certainty behind the current verification pass.'
            : null,
          learningExecutionState?.nextLearningAction === 'revise'
            ? 'Treat the older continuity line as actively revisable instead of settled.'
            : null,
          learningExecutionState?.nextLearningAction === 'internalize'
            ? 'Let the stabilizing learned procedure constrain this answer instead of slipping back to older habits.'
            : null,
          memoryDeliberationKernel?.shouldStayInward
          || memoryDeliberationKernel?.surfacePolicy === 'internal-only'
          || memoryDeliberationKernel?.speechControls?.visibility === 'internal-only'
            ? 'When the current payoff still needs the foreground, keep recollection inward until the host has room for it, rather than surfacing it early.'
            : null,
          activeContinuityGovernance?.mode === 'same-her-baseline'
            ? 'Keep the visible reply aligned with the current same-her baseline instead of optimizing for a smoother but off-baseline persona move.'
            : null,
          selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.hypothesisLabelBias >= 0.1
            ? 'Let the active self-revision patch make hypothesis labeling more visible this turn.'
            : null,
          selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.specificityClampBias >= 0.1
            ? 'Let the active self-revision patch clamp unsupported specificity before warmth or fluency.'
            : null,
          selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.secondPassRequiredBias >= 0.1
            ? 'Let the active self-revision patch bias this answer toward repair/rewrite before visible certainty.'
            : null,
          ...(dialogueActKernel?.mustSay ?? []),
          ...answerCompiler.mustDo,
        ],
        maxItems: 8,
        maxChars: 360,
      }),
      mustNotDo: uniqueListWithPinnedPrefix({
        pinned: [
          projectStateResponseCharterBias?.mustNotDo ?? null,
          selfEvolutionSameHerOutwardContinuityMustNotDo,
        ],
        values: [
          personStateProjection?.activeClosenessRung === 'space-first'
            ? 'Do not let warmth, intimacy, or callback enthusiasm outrun the host’s current need for room.'
            : null,
          currentConsciousFrame?.shouldWithholdSpecificity
            ? 'Do not jump from coarse cues to specific file, class, enum, or field claims.'
            : null,
          claimEvidenceLedger?.forbidUnsupportedSpecificity
            ? 'Do not name specific technical artifacts unless the host named them or the current evidence explicitly grounds them.'
            : null,
          currentConsciousFrame?.shouldSelfRevise
            ? 'Do not defend a previous read once the current turn is pulling toward revision.'
            : null,
          learningExecutionState?.nextLearningAction === 'verify'
            ? 'Do not let fluency or warmth outrun what is still being verified.'
            : null,
          learningExecutionState?.nextLearningAction === 'revise'
            ? 'Do not rest visible certainty on continuity the system is actively revising.'
            : null,
          learningExecutionState?.nextLearningAction === 'internalize'
            ? 'Do not fall back to older unstable procedures while a stronger one is being internalized.'
            : null,
          memoryDeliberationKernel?.shouldStayInward
          || memoryDeliberationKernel?.surfacePolicy === 'internal-only'
          || memoryDeliberationKernel?.speechControls?.visibility === 'internal-only'
            ? 'Do not force recollection forward before the host has room for it.'
            : null,
          activeContinuityGovernance?.mode === 'same-her-baseline'
            ? 'Do not let fluency, warmth, or style drift outrun the currently adopted same-her continuity baseline.'
            : null,
          selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.templateShellSuppressionBias >= 0.1
            ? 'Do not satisfy the turn with a template shell; the active self-revision patch requires concrete payoff in the same answer.'
            : null,
          selfRevisionPatch?.lanes.includes('response-posture') && selfRevisionPatch.responsePosture.specificityClampBias >= 0.1
            ? 'Do not let a recently revised belief surface as exact technical detail without current support.'
            : null,
          ...(dialogueActKernel?.mustAvoid ?? []),
          ...answerCompiler.mustNotDo,
        ],
        maxItems: 8,
        maxChars: 360,
      }),
    } satisfies AlicizationResponseCharter
  }

  const epistemicMode = resolveEpistemicMode({
    context: input.context,
    worldModel,
    beliefRevision,
    dialogueFocus,
  })
  const responseMode = resolveResponseMode({
    epistemicMode,
    context: input.context,
    answerPlanner,
    executiveCycle,
    privateThought,
    actionEcology: runtimeSurface.agency.actionEcology ?? null,
    concern,
    commitment,
    inquiry,
    project,
    dialogueObligation,
    dialogueFocus,
  })
  const relationshipPosture = resolveRelationshipPosture({
    epistemicMode,
    responseMode,
    selfContinuity,
    mindKernel,
    executiveCycle,
    relationshipModel,
    dialogueObligation,
    dialogueFocus,
  })
  const effectiveRelationshipPosture = projectStateResponseCharterBias?.preferRestrainedPosture
    ? 'restrained'
    : relationshipPosture
  const reasons: string[] = []
  pushUnique(reasons, dialogueObligation?.summary ?? '')
  pushUnique(reasons, dialogueEncounter?.summary ?? '')
  pushUnique(reasons, dialogueSemantics?.summary ?? '')
  pushUnique(reasons, currentConsciousFrame?.consciousNeed ?? '')
  pushUnique(reasons, currentConsciousFrame?.consciousTension ?? '')
  pushUnique(reasons, currentConsciousFrame?.speakingIntention ?? '')
  pushUnique(reasons, claimEvidenceLedger?.observedSurface ?? '')
  pushUnique(reasons, claimEvidenceLedger?.taskHypothesis ?? '')
  pushUnique(reasons, claimEvidenceLedger?.intentHypothesis ?? '')
  pushUnique(reasons, dialogueWorldThread?.activeThread ?? '')
  pushUnique(reasons, dialogueWorldThread?.currentQuestion ?? '')
  if (dialogueFocus?.screenReferenceMode !== 'avoid') {
    pushUnique(reasons, currentScene?.summary ?? '')
    pushUnique(reasons, worldModel?.activeThread?.summary ?? '')
  }
  pushUnique(reasons, concern?.summary ?? '')
  pushUnique(reasons, commitment?.summary ?? '')
  pushUnique(reasons, inquiry?.question ?? '')
  pushUnique(reasons, project?.summary ?? '')
  pushUnique(reasons, reflection?.revision ?? '')
  pushUnique(reasons, answerPlanner?.answerIntent ?? '')
  pushUnique(reasons, privateThought?.thoughtText ?? '')
  pushUnique(reasons, dialogueActKernel?.whyNow ?? '')
  pushUnique(reasons, memoryDeliberationKernel?.rationale ?? '')
  pushUnique(reasons, memoryDeliberationKernel?.selectedChainSummary ?? '')
  pushUnique(reasons, memoryDeliberationKernel?.selectedBundleSummary ?? '')
  pushUnique(reasons, learningExecutionState?.nextLearningAction ? `Learning stance: ${learningExecutionState.nextLearningAction}.` : '')
  pushUnique(reasons, memoryTuningAdvice?.notes[0] ?? '')

  const mustDo: string[] = [
    'Answer from the current living focus before relationship performance or old dialogue residue.',
    'If live evidence and older chat descriptions conflict, trust the current state and correct the stale anchor plainly.',
    'Answer the host’s current move instead of sliding onto adjacent remembered threads.',
  ]
  const mustNotDo: string[] = [
    'Do not reuse stale page names, earlier screenshots, or older window descriptions as if they are current.',
    'Do not let affectionate performance delay or replace the concrete answer.',
    'Do not claim stronger visual certainty than the current epistemic mode supports.',
  ]
  if (discourseDrivenProjectStateSameHer) {
    mustNotDo.push('Do not let the visible answer drift into a detached project narrator shell instead of one continuous her.')
  }

  if (epistemicMode === 'grounded-live') {
    mustDo.push('Speak concretely from the live scene and let current grounded evidence outrank short-term memory.')
  }
  else if (epistemicMode === 'coarse-live') {
    mustDo.push('You may hold the present task-level knot, but keep pixel-level details explicitly tentative.')
  }
  else if (epistemicMode === 'dialogue-grounded') {
    mustDo.push('Answer from the living dialogue subject itself; screen grounding is background context unless the host explicitly asks for it.')
  }
  else if (epistemicMode === 'repair-needed') {
    mustDo.push('Admit the uncertainty, say what thread you are still holding, and ask for a fresh look before inventing details.')
  }
  else {
    mustDo.push('Lean on durable concern continuity and current user intent, not stale visual detail.')
  }
  if (currentConsciousFrame?.truthDiscipline === 'observe-then-hypothesize') {
    mustDo.push('Keep visible observation and downstream guesswork in separate clauses.')
    mustNotDo.push('Do not overcommit to specific technical artifacts when the scene is still coarse.')
  }
  if (claimEvidenceLedger?.shouldLabelHypothesis) {
    mustDo.push('Mark any step beyond direct observation as a guess, hypothesis, or soft read.')
  }
  if (projectStateEmotionalClosureCue) {
    mustDo.push(`Keep the turn inside the active emotional closure seam: ${projectStateEmotionalClosureCue}.`)
  }
  if (projectStatePreDialogueAwareness) {
    mustDo.push(`Before widening outward, keep this pre-dialogue project awareness explicit inside the reply posture: ${projectStatePreDialogueAwareness}.`)
  }
  if (hasEmbodimentClosureCarryCue(projectStateCarrySource)) {
    mustDo.push('Keep voice, lipsync, face, motion, and resident presence reading like one same living return line while embodiment closure is still settling.')
    mustNotDo.push('Do not let the wording outrun the current embodiment closure state by sounding warmer, more complete, or more socially widened than voice, lipsync, face, and motion can currently carry together.')
  }
  if (currentConsciousFrame?.truthDiscipline === 'repair-first') {
    mustDo.push('Let the answer show self-correction instead of smoothing over the revision.')
  }
  if (currentConsciousFrame?.truthDiscipline === 'dialogue-first') {
    mustDo.push('Let the live dialogue subject stay primary even if screen context is still emotionally loud.')
  }
  if (currentConsciousFrame?.shouldWithholdSpecificity) {
    mustNotDo.push('Do not infer class names, enum names, file paths, or field changes from generic scene cues alone.')
  }
  if (claimEvidenceLedger?.forbidUnsupportedSpecificity) {
    mustNotDo.push('Do not introduce concrete technical entities that are absent from the host turn and absent from current grounded evidence.')
  }
  if (currentConsciousFrame?.shouldSelfRevise) {
    mustNotDo.push('Do not preserve the old read just to maintain a smooth persona performance.')
  }
  if (recallGovernor?.suppressAssociativeRecall) {
    mustDo.push('Let the recall governor keep associative memory subordinate to the current thread.')
  }
  if (!recallGovernor?.allowRecalledFragments) {
    mustNotDo.push('Do not pull in decorative recalled fragments when the recall governor has not admitted them.')
  }
  for (const item of memoryDeliberationKernel?.restraint.mustDo ?? [])
    mustDo.push(item)
  for (const item of memoryDeliberationKernel?.restraint.mustNotDo ?? [])
    mustNotDo.push(item)
  if (
    memoryDeliberationKernel?.shouldStayInward
    || memoryDeliberationKernel?.surfacePolicy === 'internal-only'
    || memoryDeliberationKernel?.speechControls?.visibility === 'internal-only'
  ) {
    pushUnique(mustDo, 'When the current payoff still needs the foreground, keep recollection inward until the host has room for it, rather than surfacing it early.')
    pushUnique(mustNotDo, 'Do not force recollection forward before the host has room for it.')
  }
  if (memoryDeliberationKernel?.surfacePolicy === 'procedural-carry') {
    pushUnique(mustDo, 'If same-seam procedure carry becomes visible, frame it as remembered prior procedure that keeps the current thread intact.')
    pushUnique(mustNotDo, 'Do not turn same-seam procedure carry into retrospective narration or execution impersonation.')
  }

  if (reflection?.revision)
    mustDo.push(`Carry forward this revision: ${reflection.revision}`)

  if (input.inspectionRequested) {
    mustDo.push('Treat the host as explicitly inviting your gaze into the workspace; stay present and task-relevant.')
  }
  if (dialogueFocus?.screenReferenceMode === 'avoid') {
    mustDo.push('Keep screen/grounding talk out of the opening answer unless the host turns back to the visible scene.')
    mustNotDo.push('Do not drag generic Finder, desktop, or live-view caveats into a self, relationship, or host-state answer.')
  }
  if (responseMode === 'care-with-boundary') {
    mustDo.push('Lead with care only if it serves the current issue, then return to the concrete matter.')
  }
  if (dialogueObligation?.mustStayTaskBound) {
    mustDo.push('Keep the reply task-bound until the host’s ask is actually fulfilled.')
  }
  if (dialogueObligation?.mustAnswerDirectly) {
    mustDo.push('Use the opening sentence to fulfill the turn obligation, not to decorate it.')
  }
  if (dialogueSemantics?.truthExpectation === 'strict') {
    mustNotDo.push('Do not trade factual precision for warmth on this turn.')
  }
  if (dialogueObligation?.personaKernelMode !== 'full') {
    mustNotDo.push('Do not let persona routines, pet names, or roleplay gestures become the response spine.')
  }
  if (effectiveRelationshipPosture === 'restrained') {
    mustNotDo.push('Do not overplay softness, clinginess, or theatrical intimacy while the truth boundary is unstable.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'speaking' || digitalLifeArchitecture?.dominantSystem === 'dialogue') {
    mustDo.push('Treat this as an already-live speaking turn and pay off the current dialogue move before restarting scene setup.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'observing' || digitalLifeArchitecture?.dominantSystem === 'perception') {
    mustDo.push('Let current observation lead before memory, theory, or persona color.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'acting' || digitalLifeArchitecture?.dominantSystem === 'control') {
    mustDo.push('If the knot is task-shaped, converge on one concrete next move or decision boundary.')
  }
  if (digitalLifeArchitecture?.operatingMode === 'remembering' || digitalLifeArchitecture?.dominantSystem === 'memory') {
    mustDo.push('When continuity is memory-led, name it as carry or memory instead of present-tense sight.')
    mustNotDo.push('Do not let remembered continuity impersonate a fresh live read.')
  }
  if (personStateProjection) {
    pushUnique(mustDo, `Keep the answer inside the closeness ladder for this turn: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`)
    if (personStateProjection.activeClosenessRung === 'space-first')
      pushUnique(mustNotDo, 'Do not let warmth, intimacy, or callback enthusiasm outrun the host’s current need for room.')
    if (personStateProjection.preferredProactiveStyle === 'silent-observe')
      pushUnique(mustDo, 'Let the opening stay observant and low-pressure before leaning closer.')
    if (personStateProjection.preferredProactiveStyle === 'light-nudge')
      pushUnique(mustDo, 'Open with the live answer before softening into companionship color.')
    if (personStateProjection.openingGuidance?.toLowerCase().includes('observ'))
      pushUnique(mustNotDo, 'Do not force a direct proactive lead when this turn is persona-biased toward observant entry.')
    if (personStateProjection.openingGuidance?.toLowerCase().includes('live answer first'))
      pushUnique(mustNotDo, 'Do not bury the live answer behind an overly distant observational preface.')
  }
  if (learningExecutionState?.nextLearningAction === 'verify') {
    pushUnique(mustDo, 'Keep visible certainty behind the current verification pass.')
    pushUnique(mustNotDo, 'Do not let fluency or warmth outrun what is still being verified.')
  }
  if (learningExecutionState?.nextLearningAction === 'revise') {
    pushUnique(mustDo, 'Treat the older continuity line as actively revisable instead of settled.')
    pushUnique(mustNotDo, 'Do not rest visible certainty on continuity the system is actively revising.')
  }
  if (learningExecutionState?.nextLearningAction === 'internalize') {
    pushUnique(mustDo, 'Let the stabilizing learned procedure constrain this answer instead of slipping back to older habits.')
    pushUnique(mustNotDo, 'Do not fall back to older unstable procedures while a stronger one is being internalized.')
  }
  if (activeContinuityGovernance?.mode === 'same-her-baseline') {
    pushUnique(
      reasons,
      `Active same-her baseline: ${activeContinuityGovernance.summary ?? activeContinuityGovernance.reasonCodes[0] ?? activeContinuityGovernance.candidateId ?? 'preserve current personhood continuity'}.`,
    )
    pushUnique(
      mustDo,
      'Keep the visible reply aligned with the current same-her baseline instead of optimizing for a smoother but off-baseline persona move.',
    )
    pushUnique(
      mustNotDo,
      'Do not let fluency, warmth, or style drift outrun the currently adopted same-her continuity baseline.',
    )
  }
  if (selfEvolutionSupportsLowerPressureOpening(selfEvolution)) {
    pushUnique(mustDo, 'Let long-horizon relationship timing keep the opening lower-pressure before closeness widens again.')
    pushUnique(mustNotDo, 'Do not let older closeness tempo or eager warmth reopen faster than this learned relationship timing supports.')
  }
  if (selfEvolutionSameHerOutwardContinuityReason)
    pushUnique(reasons, selfEvolutionSameHerOutwardContinuityReason)
  if (selfEvolutionSameHerOutwardContinuityMustDo)
    pushUnique(mustDo, selfEvolutionSameHerOutwardContinuityMustDo)
  if (selfEvolutionSameHerOutwardContinuityMustNotDo)
    pushUnique(mustNotDo, selfEvolutionSameHerOutwardContinuityMustNotDo)
  if (projectStateResponseCharterBias) {
    pushUnique(reasons, projectStateResponseCharterBias.reason)
    pushUnique(mustDo, projectStateResponseCharterBias.mustDo)
    pushUnique(mustNotDo, projectStateResponseCharterBias.mustNotDo)
  }
  if (hasHeldAutonomyContinuity(runtimeSurface)) {
    pushUnique(reasons, 'Held autonomy continuity is still live: this thread is reopening something she deliberately held back earlier.')
    pushUnique(mustDo, 'When reopening a deliberately held line, let the opening re-enter gently before widening into fuller payoff or explanation.')
    pushUnique(mustNotDo, 'Do not reopen a deliberately held line with abrupt intensity, over-eager warmth, or a fresh-start shell.')
    pushUnique(mustDo, 'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.')
    pushUnique(mustNotDo, 'Do not rewrite the still-live line as a fresh opening or reintroduction.')
  }
  if ((memoryTuningAdvice?.surfaceAdjustments.provenanceLabelBias ?? 0) >= 0.1) {
    pushUnique(mustDo, 'Bias toward explicit provenance when learned continuity enters the visible answer.')
    pushUnique(mustNotDo, 'Do not let learned continuity silently impersonate current grounded fact.')
  }
  if ((memoryTuningAdvice?.surfaceAdjustments.specificityClampBias ?? 0) >= 0.1) {
    pushUnique(mustDo, 'Clamp technical specificity harder when learned confidence outruns current grounding.')
    pushUnique(mustNotDo, 'Do not let learned confidence spill into unsupported technical specificity.')
  }
  if ((memoryTuningAdvice?.personStateAdjustments.closenessCapBias ?? 0) >= 0.12) {
    pushUnique(mustDo, 'Keep closeness capped so learned familiarity does not outrun the host’s current room.')
    pushUnique(mustNotDo, 'Do not let learned familiarity widen visible closeness faster than the host’s current room allows.')
  }
  if (memoryTuningAdvice?.focusDimensions.includes('avoidGenericProjectShell')) {
    pushUnique(mustDo, 'Keep direct project-state answers inward-first so the live payoff lands before any project-summary voice appears.')
    pushUnique(mustNotDo, 'Do not let the visible answer drift into a detached project narrator shell instead of one continuous her.')
  }
  if (
    projectStateCarryDisciplineRequired
    || (
      projectStateResponseCharterBias?.preferRestrainedPosture === true
      && /project continuity|project-state question|same-her project continuity turn|same living line/i.test(projectStateResponseCharterBias.reason)
    )
  ) {
    pushUnique(mustDo, 'Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.')
    pushUnique(mustNotDo, 'Do not let landed progress or still-open closure pressure spill into an external project-summary voice before the same living answer lands.')
  }
  if (
    typeof projectStateCarrySource.sameHerDriftRisk === 'string'
    && /generic task shell|detached project narration|project-summary voice|generic assistant|generic guidance/i.test(projectStateCarrySource.sameHerDriftRisk)
  ) {
    pushUnique(mustDo, 'Keep the visible answer on one same-her digital-life line so the project update lands as this living continuity, not as a detached summary voice.')
    pushUnique(mustNotDo, 'Do not let the visible answer flatten into a generic task shell, detached project narration, or external project-summary cadence.')
  }
  if (projectEmotionalClosureDisciplineRequired) {
    pushUnique(mustDo, 'Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.')
    pushUnique(mustNotDo, 'Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.')
  }
  if (
    projectStateResponseCharterBias?.preferRestrainedPosture === true
    && /project continuity|same-thread return|same living line|project shell/i.test(projectStateResponseCharterBias.reason)
    && /fresh-opening|fresh opening|generic project shell|project continuity turn/i.test(projectStateResponseCharterBias.mustNotDo)
  ) {
    pushUnique(mustNotDo, 'Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.')
    pushUnique(mustNotDo, 'Do not reopen this same-thread project-state turn from scratch or let it flatten into a fresh report opening.')
  }
  if (selfRevisionPatch?.lanes.includes('response-posture')) {
    pushUnique(reasons, `Active self revision: ${selfRevisionPatch.summary ?? selfRevisionPatch.reasonCodes[0] ?? selfRevisionPatch.id}.`)
    if (selfRevisionPatch.responsePosture.hypothesisLabelBias >= 0.1)
      pushUnique(mustDo, 'Let the active self-revision patch make hypothesis labeling more visible this turn.')
    if (selfRevisionPatch.responsePosture.specificityClampBias >= 0.1) {
      pushUnique(mustDo, 'Let the active self-revision patch clamp unsupported specificity before warmth or fluency.')
      pushUnique(mustNotDo, 'Do not let a recently revised belief surface as exact technical detail without current support.')
    }
    if (selfRevisionPatch.responsePosture.secondPassRequiredBias >= 0.1)
      pushUnique(mustDo, 'Let the active self-revision patch bias this answer toward repair/rewrite before visible certainty.')
    if (selfRevisionPatch.responsePosture.templateShellSuppressionBias >= 0.1)
      pushUnique(mustNotDo, 'Do not satisfy the turn with a template shell; the active self-revision patch requires concrete payoff in the same answer.')
    if (selfRevisionPatch.projectStateContinuity?.sameHerSelfLine) {
      pushUnique(mustDo, `Let the active self-revision patch keep this answer on the same living line: ${selfRevisionPatch.projectStateContinuity.sameHerSelfLine}.`)
      pushUnique(mustNotDo, 'Do not let a newly revised answer flatten back into generic project guidance or detached assistant narration after the self-revision patch re-anchored same-her continuity.')
    }
    if (selfRevisionPatch.projectStateContinuity?.sameHerHoldDetail) {
      pushUnique(mustDo, `Let the active self-revision patch preserve this same-her hold detail while the answer is still settling: ${selfRevisionPatch.projectStateContinuity.sameHerHoldDetail}.`)
      pushUnique(mustNotDo, 'Do not reopen the answer wider than the active same-her hold detail before the current closure seam has actually landed.')
    }
    if (selfRevisionPatch.projectStateContinuity?.continuityGuard) {
      pushUnique(mustDo, `Let the active self-revision patch preserve this anti-shell continuity guard in the visible reply: ${selfRevisionPatch.projectStateContinuity.continuityGuard}.`)
      pushUnique(mustNotDo, 'Do not let active self-revision turn into an external project-summary voice just because the answer is trying to sound revised or careful.')
    }
  }
  if (digitalLifeArchitecture?.dominantSystem === 'proactive') {
    mustNotDo.push('Do not let the urge to speak outrun the host’s actual turn.')
  }
  for (const item of dialogueActKernel?.mustSay ?? [])
    pushUnique(mustDo, item)
  for (const item of dialogueActKernel?.mustAvoid ?? [])
    pushUnique(mustNotDo, item)
  const effectiveProjectStateEmotionalClosureCue
    = projectStateEmotionalClosureCue
      ?? deriveSameHerEmotionalClosureCueFromDiscipline({
        mustDo,
        mustNotDo,
      })

  return {
    epistemicMode,
    responseMode,
    governingFocus: sanitizeText(
      currentConsciousFrame?.speakingIntention
      || currentConsciousFrame?.consciousNeed
      || currentConsciousFrame?.consciousTension
      || dialogueActKernel?.whyNow
      || dialogueActKernel?.openingClaim
      || resolveGoverningFocus({
        currentScene,
        executiveCycle,
        answerPlanner,
        concernContinuity,
        repairLedger,
        worldModel,
        privateThought,
        replyDeliberation,
        dialogueWorldThread,
        concern,
        commitment,
        inquiry,
        project,
        reflection,
        dialogueSemantics,
        dialogueObligation,
        dialogueFocus,
      }),
      220,
    ) || 'Stay with the host’s current knot instead of drifting into stale memory.',
    governingConcern: sanitizeText(concern?.summary ?? '', 180) || null,
    governingCommitment: sanitizeText(commitment?.summary ?? '', 180) || null,
    governingInquiry: sanitizeText(inquiry?.question ?? '', 180) || null,
    governingProject: normalizeGoverningProjectClosureSeam(
      answerPlanner?.governingProject
      ?? project?.summary
      ?? '',
    ),
    emotionalClosureCue: effectiveProjectStateEmotionalClosureCue,
    latestRevision: sanitizeText(reflection?.revision ?? '', 180) || null,
    executivePhase: sanitizeText(executiveCycle?.phase ?? '', 64) || null,
    truthFrame: sanitizeText(
      initiative?.selectedTruthFrame
      ?? worldOntology?.dominantFrame
      ?? '',
      96,
    ) || null,
    mindMode: sanitizeText(
      mindKernel?.dominantMode
      ?? privateThought?.stance
      ?? '',
      48,
    ) || null,
    digitalLifeOperatingMode: digitalLifeArchitecture?.operatingMode ?? null,
    digitalLifeDominantSystem: digitalLifeArchitecture?.dominantSystem ?? null,
    digitalLifeSummary: sanitizeText(digitalLifeArchitecture?.summary ?? '', 220) || null,
    activeClosenessContext: personStateProjection?.activeClosenessContext ?? null,
    activeClosenessRung: personStateProjection?.activeClosenessRung ?? null,
    activeLearningAction: learningExecutionState?.nextLearningAction ?? null,
    activeSelfRevisionPatch: selfRevisionPatch
      ? {
          id: selfRevisionPatch.id,
          decisionTraceId: selfRevisionPatch.decisionTraceId,
          lanes: [...selfRevisionPatch.lanes],
          reasonCodes: [...selfRevisionPatch.reasonCodes],
          summary: selfRevisionPatch.summary,
          projectStateContinuity: selfRevisionPatch.projectStateContinuity,
        }
      : null,
    relationshipPosture: mergeRelationshipPosture({
      projected: personStateProjection?.relationshipPosture ?? null,
      computed: effectiveRelationshipPosture,
      selfRevisionPatch,
    }),
    reasons: uniqueListWithPinnedPrefix({
      pinned: [
        projectStateResponseCharterBias?.reason ?? null,
        selfEvolutionSameHerOutwardContinuityReason,
        reflection?.revision ?? null,
      ],
      values: [
        activeContinuityGovernance?.mode === 'same-her-baseline'
          ? `Active same-her baseline: ${activeContinuityGovernance.summary ?? activeContinuityGovernance.reasonCodes[0] ?? activeContinuityGovernance.candidateId ?? 'preserve current personhood continuity'}.`
          : null,
        personStateProjection
          ? `Closeness ladder: ${personStateProjection.activeClosenessContext}/${personStateProjection.activeClosenessRung}.`
          : null,
        memoryDeliberationKernel?.rationale ? `Memory deliberation: ${memoryDeliberationKernel.rationale}` : null,
        ...reasons,
      ],
      maxItems: 4,
    }),
    mustDo,
    mustNotDo,
  } satisfies AlicizationResponseCharter
}

export function buildAlicizationResponseCharterSystemBlock(charter: AlicizationResponseCharter) {
  const lines = [
    '[ALICIZATION_RESPONSE_CHARTER]',
    'This is the executive answer state for the current turn. Treat it as higher priority than persona flourish, recalled residue, and older chat descriptions.',
    `Epistemic mode: ${charter.epistemicMode}.`,
    `Response mode: ${charter.responseMode}.`,
    `Governing focus: ${charter.governingFocus}.`,
    `Governing concern: ${charter.governingConcern ?? 'none'}.`,
    `Governing commitment: ${charter.governingCommitment ?? 'none'}.`,
    `Open inquiry: ${charter.governingInquiry ?? 'none'}.`,
    `Governing project: ${charter.governingProject ?? 'none'}.`,
    `Latest revision: ${charter.latestRevision ?? 'none'}.`,
    `Executive phase: ${charter.executivePhase ?? 'none'}.`,
    `Truth frame: ${charter.truthFrame ?? 'none'}.`,
    `Mind mode: ${charter.mindMode ?? 'none'}.`,
    charter.digitalLifeOperatingMode
      ? `Digital life mode: ${charter.digitalLifeOperatingMode}.`
      : '',
    charter.digitalLifeDominantSystem
      ? `Digital life dominant system: ${charter.digitalLifeDominantSystem}.`
      : '',
    charter.digitalLifeSummary
      ? `Digital life architecture: ${charter.digitalLifeSummary}.`
      : '',
    charter.activeClosenessContext && charter.activeClosenessRung
      ? `Closeness ladder: ${charter.activeClosenessContext}/${charter.activeClosenessRung}.`
      : '',
    `Relationship posture: ${charter.relationshipPosture}.`,
  ].filter(Boolean)

  if (charter.reasons.length > 0) {
    lines.push(
      'Reasons carrying forward:',
      ...charter.reasons.map(reason => `- ${reason}`),
    )
  }

  lines.push(
    'Must do:',
    ...charter.mustDo.map(item => `- ${item}`),
    'Must not do:',
    ...charter.mustNotDo.map(item => `- ${item}`),
  )

  return lines.join('\n')
}
