import type {
  AlicizationAnswerAct,
  AlicizationAnswerCompilerSnapshot,
  AlicizationAnswerEvidenceMode,
  AlicizationAnswerPlannerSnapshot,
  AlicizationCommitmentLedgerSnapshot,
  AlicizationConcernContinuityLedgerSnapshot,
  AlicizationConversationStateSnapshot,
  AlicizationDialogueAnswerSubject,
  AlicizationDialogueScreenReferenceMode,
  AlicizationDialogueWorldThreadSnapshot,
  AlicizationDiscourseStateSnapshot,
  AlicizationExecutiveCycleSnapshot,
  AlicizationInquiryPlannerSnapshot,
  AlicizationIntentionStreamSnapshot,
  AlicizationMindKernelSnapshot,
  AlicizationMindSynthesisSnapshot,
  AlicizationPrivateThoughtSnapshot,
  AlicizationReflectionLedgerSnapshot,
  AlicizationRelationshipModelSnapshot,
  AlicizationRepairLedgerSnapshot,
  AlicizationReplyDeliberationSnapshot,
  AlicizationVisualSceneSnapshot,
  AlicizationWorldModelSnapshot,
  AlicizationWorldOntologySnapshot,
} from '../../../shared/eventa'
import type { AlicizationDialogueFocusGovernance } from './dialogue-focus-governor'
import type { AlicizationDialogueObligation } from './dialogue-obligation'
import type { AlicizationDialogueTurnEncounter } from './dialogue-turn-encounter'
import type { AlicizationDialogueTurnOwnership } from './dialogue-turn-ownership'
import type { AlicizationDialogueTurnSemantics } from './dialogue-turn-semantics'
import type { AlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import {
  alicizationFixedTemplateReplacement,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { deriveMindTruthContract } from './mind-truth-contract'
import {
  mergePreferredSelfContinuityAuthority,
  resolvePreferredPersonStateProjection,
  resolvePreferredSelfContinuityAuthority,
} from './person-state-projection-resolution'
import { buildSelfContinuityAuthorityFromRuntimeSurface } from './self-continuity-authority'

function clamp01(value: number) {
  if (!Number.isFinite(value))
    return 0
  return Math.max(0, Math.min(1, Number(value.toFixed(2))))
}

function sanitizeText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function sanitizePlannerProviderText(raw: unknown, maxChars = 220) {
  const normalized = sanitizeAlicizationProviderFacingText(raw, maxChars)
  return normalized === alicizationFixedTemplateReplacement ? '' : normalized
}

function joinDynamicText(values: unknown[], maxChars = 220) {
  const rows: string[] = []
  for (const value of values) {
    const normalized = sanitizePlannerProviderText(value, maxChars)
    if (!normalized || rows.includes(normalized))
      continue
    rows.push(normalized)
  }
  return sanitizeText(rows.join(' | '), maxChars)
}

function pickUserFacingAnchor(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function governingConcern(concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null) {
  return concernContinuity?.entries.find(entry => entry.id === concernContinuity.governingEntryId)
    ?? concernContinuity?.entries[0]
    ?? null
}

function governingRepair(repairLedger?: AlicizationRepairLedgerSnapshot | null) {
  return repairLedger?.entries.find(entry => entry.id === repairLedger.governingRepairId)
    ?? repairLedger?.entries[0]
    ?? null
}

function governingCommitment(commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null) {
  return commitmentLedger?.commitments.find(commitment => commitment.id === commitmentLedger.governingCommitmentId)
    ?? commitmentLedger?.commitments[0]
    ?? null
}

function activeInquiryPlan(inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null) {
  return inquiryPlanner?.plans.find(plan => plan.id === inquiryPlanner.activePlanId)
    ?? inquiryPlanner?.plans[0]
    ?? null
}

function dominantProject(intentionStream?: AlicizationIntentionStreamSnapshot | null) {
  return intentionStream?.projects.find(project => project.id === intentionStream.dominantProjectId)
    ?? intentionStream?.projects[0]
    ?? null
}

function latestReflection(reflectionLedger?: AlicizationReflectionLedgerSnapshot | null) {
  const latest = reflectionLedger?.entries.find(entry => entry.id === reflectionLedger.latestEntryId)
  if (latest && latest.outcome !== 'released')
    return latest

  return reflectionLedger?.entries.find(entry => entry.outcome !== 'released')
    ?? null
}

interface AlicizationAnswerPlannerTurnProfile {
  subject: AlicizationDialogueAnswerSubject
  screenReferenceMode: AlicizationDialogueScreenReferenceMode
  shouldBypassScreenRepair: boolean
}

function resolveAnswerPlannerTurnProfile(input: {
  ownership?: AlicizationDialogueTurnOwnership | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
}): AlicizationAnswerPlannerTurnProfile {
  const subject = input.ownership?.subject
    ?? input.discourseState?.currentTurnSubject
    ?? input.dialogueFocus?.subject
    ?? input.dialogueSemantics?.subjectPreference
    ?? 'general'

  const screenReferenceMode = input.ownership?.screenReferenceMode
    ?? input.discourseState?.screenReferenceMode
    ?? input.dialogueFocus?.screenReferenceMode
    ?? (subject === 'visible-scene'
      ? 'required'
      : subject === 'task-knot'
        ? 'helpful'
        : subject === 'relationship' || subject === 'alicization-self' || subject === 'host-state'
          ? 'avoid'
          : 'incidental')

  return {
    subject,
    screenReferenceMode,
    shouldBypassScreenRepair: input.dialogueFocus?.shouldBypassScreenRepair === true
      || (screenReferenceMode === 'avoid' && subject !== 'visible-scene'),
  }
}

function repairIsSatisfiedByFreshGrounding(input: {
  groundedThisTurn?: boolean
  turnProfile: AlicizationAnswerPlannerTurnProfile
}) {
  if (input.groundedThisTurn !== true)
    return false
  if (input.turnProfile.subject !== 'visible-scene' && input.turnProfile.subject !== 'task-knot')
    return false
  return input.turnProfile.screenReferenceMode !== 'avoid'
}

function groundedRepairFollowupAct(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
}) {
  return input.turnProfile.subject === 'task-knot'
    ? 'guide' as const
    : 'answer' as const
}

function evidenceMode(input: {
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  turnProfile: AlicizationAnswerPlannerTurnProfile
  groundedThisTurn?: boolean
}) {
  if (
    input.turnProfile.shouldBypassScreenRepair
    && input.turnProfile.subject !== 'visible-scene'
  ) {
    return 'dialogue-grounded' as const
  }
  if (input.groundedThisTurn === true)
    return 'live-grounded' as const

  const truth = deriveMindTruthContract(
    input.runtimeSurface ?? {
      currentScene: input.currentScene,
      worldModel: input.worldModel ?? null,
      worldOntology: input.worldOntology ?? null,
    },
  )
  if (input.repairLedger?.shouldConstrainPresentTense && (input.repairLedger?.repairPressure ?? 0) >= 0.44)
    return 'repair-first' as const
  if (truth.truthState === 'live-grounded')
    return 'live-grounded' as const
  if (truth.truthState === 'live-observed') {
    return input.worldModel?.activeThread?.unresolved
      ? 'coarse-held' as const
      : 'live-observed' as const
  }
  if (truth.truthState === 'remembered')
    return 'continuity-carry' as const
  if ((input.concernContinuity?.unresolvedCount ?? 0) > 0)
    return 'coarse-held' as const

  const sceneFocusedTurn = input.turnProfile.subject === 'task-knot'
    || input.turnProfile.subject === 'visible-scene'
  const screenReferenceRequired = input.turnProfile.screenReferenceMode === 'required'
    || input.turnProfile.screenReferenceMode === 'helpful'
  const sceneContextAvailable = Boolean(
    input.currentScene?.summary
    || input.currentScene?.target
    || input.worldModel?.activeThread,
  )
  if (sceneFocusedTurn || screenReferenceRequired || sceneContextAvailable)
    return 'coarse-held' as const
  return 'dialogue-grounded' as const
}

function answerAct(input: {
  evidenceMode: AlicizationAnswerEvidenceMode
  worldModel?: AlicizationWorldModelSnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  inspectionRequested: boolean
  dialogueObligation?: AlicizationDialogueObligation | null
  turnProfile: AlicizationAnswerPlannerTurnProfile
  groundedThisTurn?: boolean
}) {
  const concern = governingConcern(input.concernContinuity)
  const repair = governingRepair(input.repairLedger)
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  const project = dominantProject(input.intentionStream)
  const reflection = latestReflection(input.reflectionLedger)

  if (input.dialogueObligation?.kind === 'repair') {
    if (repairIsSatisfiedByFreshGrounding({
      groundedThisTurn: input.groundedThisTurn === true,
      turnProfile: input.turnProfile,
    })) {
      return groundedRepairFollowupAct({
        turnProfile: input.turnProfile,
      })
    }
    return input.evidenceMode === 'repair-first'
      ? 'ask-reground' as const
      : 'correct-stale-anchor' as const
  }
  if (input.dialogueObligation?.kind === 'teach' || input.dialogueObligation?.kind === 'guide')
    return 'guide' as const
  if (input.dialogueObligation?.kind === 'care')
    return 'care' as const
  if (input.dialogueObligation?.kind === 'accompany')
    return input.executiveCycle?.shouldAct ? 'answer' as const : 'defer' as const
  if (input.dialogueObligation?.kind === 'clarify')
    return 'ask-reground' as const

  if (input.turnProfile.shouldBypassScreenRepair && input.turnProfile.subject !== 'visible-scene') {
    if (input.turnProfile.subject === 'task-knot')
      return 'guide' as const
    if (input.turnProfile.subject === 'host-state')
      return 'care' as const
    if (input.turnProfile.subject === 'relationship')
      return input.executiveCycle?.shouldAct ? 'answer' as const : 'defer' as const
    return 'answer' as const
  }

  if (
    input.executiveCycle?.phase === 'reflecting'
    && (reflection?.outcome === 'missed' || reflection?.outcome === 'corrected' || reflection?.outcome === 'stalled')
  ) {
    return repair?.kind === 'stale-scene-anchor'
      ? 'correct-stale-anchor' as const
      : 'ask-reground' as const
  }
  if (repair?.kind === 'stale-scene-anchor' || repair?.kind === 'belief-contradiction')
    return 'correct-stale-anchor' as const
  if (
    !input.groundedThisTurn
    && (
      repair?.kind === 'reground-scene'
      || (
        input.evidenceMode === 'repair-first'
        && (input.inspectionRequested || inquiryPlan?.askForGrounding)
      )
    )
  ) {
    return 'ask-reground' as const
  }
  if (repair?.kind === 'reground-scene')
    return 'correct-stale-anchor' as const
  if (project?.kind === 'care-host')
    return 'care' as const
  if (project?.kind === 'hold-knot')
    return 'guide' as const
  if (project?.kind === 'stay-near' || project?.kind === 'witness-afterglow')
    return input.executiveCycle?.shouldAct ? 'answer' as const : 'defer' as const
  if (
    concern?.kind === 'care-body'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
    || input.worldModel?.activeThread?.kind === 'late-night-endurance'
  ) {
    return 'care' as const
  }
  if (
    concern?.kind === 'help-fix'
    || concern?.kind === 'unfinished-thread'
    || commitment?.kind === 'hold-problem'
    || commitment?.kind === 'follow-through'
    || inquiryPlan?.kind === 'localize-problem'
    || input.worldModel?.activeThread?.kind === 'debugging'
    || input.worldModel?.activeThread?.kind === 'change-review'
  ) {
    return 'guide' as const
  }
  if (
    !input.privateThought?.shouldSpeak
    && (
      input.privateThought?.stance === 'observe'
      || input.privateThought?.stance === 'accompany'
      || input.privateThought?.stance === 'uncertain'
    )
  ) {
    return 'defer' as const
  }
  return 'answer' as const
}

function relationshipPosture(input: {
  act: AlicizationAnswerAct
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  if (
    input.act === 'ask-reground'
    || input.act === 'correct-stale-anchor'
    || input.repairLedger?.shouldConstrainPresentTense
    || input.mindKernel?.dominantMode === 'repairing'
    || input.executiveCycle?.phase === 'reflecting'
    || input.executiveCycle?.phase === 'inferring'
  ) {
    return 'restrained' as const
  }
  if (input.dialogueObligation?.kind === 'care')
    return 'tender' as const
  if (
    input.act === 'care'
    || input.privateThought?.stance === 'care'
    || input.privateThought?.stance === 'warn'
    || input.relationshipModel?.approachVector === 'care'
    || input.relationshipModel?.approachVector === 'stay-near'
  ) {
    return 'tender' as const
  }
  return 'warm' as const
}

function pickCurrentTurnAnchor(input: {
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
}) {
  return pickUserFacingAnchor(
    input.conversationState?.primaryTurnAnchor,
    input.discourseState?.primaryTurnAnchor,
    input.conversationState?.hostMove,
    input.dialogueWorldThread?.currentQuestion,
    input.discourseState?.currentQuestion,
    input.conversationState?.unansweredQuestion,
    input.discourseState?.currentTurnSummary,
    input.dialogueFocus?.focusSummary,
    input.dialogueObligation?.summary,
    input.dialogueSemantics?.summary,
  )
}

function pickDynamicSelfAuthority(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
  selfContinuityAuthority?: {
    selfLine?: string | null
    relationshipLine?: string | null
    motiveLine?: string | null
    authoritySummary?: string | null
  } | null
}) {
  if (input.turnProfile.subject !== 'alicization-self' && input.turnProfile.subject !== 'relationship')
    return ''
  return joinDynamicText([
    input.selfContinuityAuthority?.authoritySummary,
    input.selfContinuityAuthority?.selfLine,
    input.selfContinuityAuthority?.relationshipLine,
    input.selfContinuityAuthority?.motiveLine,
  ])
}

function resolvePlannerFocus(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  selfContinuityAuthority?: {
    selfLine?: string | null
    relationshipLine?: string | null
    motiveLine?: string | null
    authoritySummary?: string | null
  } | null
  projectedFocus?: string | null
  selectedConcern?: { summary?: string | null } | null
  selectedRepair?: { summary?: string | null } | null
  selectedCommitment?: { summary?: string | null } | null
  selectedInquiry?: { question?: string | null } | null
  selectedProject?: { summary?: string | null } | null
  selectedReflection?: { revision?: string | null } | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
}) {
  const currentTurnAnchor = pickCurrentTurnAnchor(input)
  const primary = pickUserFacingAnchor(
    input.replyDeliberation?.whyThisReplyNow,
    currentTurnAnchor,
    input.dialogueWorldThread?.activeThread,
    input.selectedReflection?.revision,
    input.executiveCycle?.currentLine,
    input.selectedProject?.summary,
    input.selectedConcern?.summary,
    input.selectedRepair?.summary,
    input.selectedCommitment?.summary,
    input.selectedInquiry?.question,
    input.worldModel?.activeThread?.summary,
    input.privateThought?.thoughtText,
  )
  const selfAuthority = pickDynamicSelfAuthority({
    turnProfile: input.turnProfile,
    selfContinuityAuthority: input.selfContinuityAuthority,
  })
  return joinDynamicText([
    primary,
    selfAuthority,
    input.projectedFocus,
  ])
}

function resolvePlannerAnswerIntent(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  selfContinuityAuthority?: {
    selfLine?: string | null
    relationshipLine?: string | null
    motiveLine?: string | null
    authoritySummary?: string | null
  } | null
  projectedAnswer?: string | null
  selectedConcern?: { summary?: string | null } | null
  selectedRepair?: { summary?: string | null } | null
  worldModel?: AlicizationWorldModelSnapshot | null
}) {
  const currentTurnAnchor = pickCurrentTurnAnchor(input)
  const primary = pickUserFacingAnchor(
    currentTurnAnchor,
    input.replyDeliberation?.whyThisReplyNow,
    input.dialogueWorldThread?.currentQuestion,
    input.dialogueObligation?.summary,
    input.dialogueSemantics?.summary,
    input.selectedRepair?.summary,
    input.selectedConcern?.summary,
    input.worldModel?.activeThread?.summary,
  )
  const selfAuthority = pickDynamicSelfAuthority({
    turnProfile: input.turnProfile,
    selfContinuityAuthority: input.selfContinuityAuthority,
  })
  return joinDynamicText([
    primary,
    selfAuthority,
    input.projectedAnswer,
  ])
}

export function buildAnswerPlanner(input: {
  now: number
  context: AlicizationProactiveLayeredContext
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  relationshipModel?: AlicizationRelationshipModelSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  mindKernel?: AlicizationMindKernelSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  inspectionRequested: boolean
  dialogueEncounter?: AlicizationDialogueTurnEncounter | null
  ownership?: AlicizationDialogueTurnOwnership | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  mindSynthesis?: AlicizationMindSynthesisSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  answerCompiler?: AlicizationAnswerCompilerSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
  runtimeSurface?: AlicizationDigitalLifeRuntimeSurface | null
  groundedThisTurn?: boolean
}): AlicizationAnswerPlannerSnapshot {
  const runtimeSurface = input.runtimeSurface ?? null
  const currentScene = runtimeSurface?.perception?.currentScene ?? input.currentScene
  const worldModel = runtimeSurface?.world?.worldModel ?? input.worldModel ?? null
  const worldOntology = runtimeSurface?.world?.worldOntology ?? input.worldOntology ?? null
  const relationshipModel = runtimeSurface?.world?.relationshipModel ?? input.relationshipModel ?? null
  const privateThought = runtimeSurface?.cognition?.privateThought ?? input.privateThought ?? null
  const mindKernel = runtimeSurface?.cognition?.mindKernel ?? input.mindKernel ?? null
  const concernContinuity = runtimeSurface?.memory?.concernContinuity ?? input.concernContinuity ?? null
  const repairLedger = runtimeSurface?.memory?.repairLedger ?? input.repairLedger ?? null
  const commitmentLedger = runtimeSurface?.memory?.commitmentLedger ?? input.commitmentLedger ?? null
  const inquiryPlanner = runtimeSurface?.memory?.inquiryPlanner ?? input.inquiryPlanner ?? null
  const intentionStream = runtimeSurface?.memory?.intentionStream ?? input.intentionStream ?? null
  const reflectionLedger = runtimeSurface?.memory?.reflectionLedger ?? input.reflectionLedger ?? null
  const executiveCycle = runtimeSurface?.memory?.executiveCycle ?? input.executiveCycle ?? null
  const dialogueEncounter = input.dialogueEncounter ?? null
  const ownership = dialogueEncounter?.ownership ?? input.ownership ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const discourseState = runtimeSurface?.dialogue?.discourseState ?? input.discourseState ?? null
  const conversationState = runtimeSurface?.dialogue?.conversationState ?? input.conversationState ?? null
  const dialogueWorldThread = runtimeSurface?.dialogue?.dialogueWorldThread ?? input.dialogueWorldThread ?? null
  const answerCompiler = runtimeSurface?.dialogue?.answerCompiler ?? input.answerCompiler ?? null
  const replyDeliberation = runtimeSurface?.dialogue?.replyDeliberation ?? input.replyDeliberation ?? null
  const compiledActiveClosenessContext = answerCompiler?.activeClosenessContext ?? null
  const compiledActiveClosenessRung = answerCompiler?.activeClosenessRung ?? null
  const preferredPersonStateProjection = resolvePreferredPersonStateProjection({
    bundleProjection: runtimeSurface?.raw?.personStateProjection ?? null,
    runtimeProjection: runtimeSurface?.memory?.personStateProjection ?? null,
  })
  const projectedSelfContinuityAuthority = resolvePreferredSelfContinuityAuthority({
    bundleAuthority: runtimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: preferredPersonStateProjection?.selfContinuityAuthority ?? null,
  })
  const mergedSelfContinuityAuthority = mergePreferredSelfContinuityAuthority({
    bundleAuthority: runtimeSurface?.raw?.personStateProjection?.selfContinuityAuthority ?? null,
    runtimeAuthority: preferredPersonStateProjection?.selfContinuityAuthority ?? null,
  }) ?? projectedSelfContinuityAuthority
  ?? buildSelfContinuityAuthorityFromRuntimeSurface(runtimeSurface)
  const selfContinuityAuthority = mergedSelfContinuityAuthority
  const selectedConcern = governingConcern(concernContinuity)
  const selectedRepair = governingRepair(repairLedger)
  const selectedCommitment = governingCommitment(commitmentLedger)
  const selectedInquiry = activeInquiryPlan(inquiryPlanner)
  const selectedProject = dominantProject(intentionStream)
  const selectedReflection = latestReflection(reflectionLedger)
  const turnProfile = resolveAnswerPlannerTurnProfile({
    ownership,
    discourseState,
    dialogueFocus,
    dialogueSemantics,
  })
  const projectedFocus = joinDynamicText([
    preferredPersonStateProjection?.repairTriggerText,
    preferredPersonStateProjection?.sensitivityText,
  ])
  const projectedAnswer = joinDynamicText([
    preferredPersonStateProjection?.burdenText,
  ])
  const plannerFocus = resolvePlannerFocus({
    turnProfile,
    conversationState,
    discourseState,
    dialogueFocus,
    dialogueSemantics,
    dialogueObligation,
    dialogueWorldThread,
    replyDeliberation,
    selfContinuityAuthority,
    projectedFocus,
    selectedConcern,
    selectedRepair,
    selectedCommitment,
    selectedInquiry,
    selectedProject,
    selectedReflection,
    executiveCycle,
    worldModel,
    privateThought,
  })
  const plannerAnswerIntent = resolvePlannerAnswerIntent({
    turnProfile,
    conversationState,
    discourseState,
    dialogueFocus,
    dialogueSemantics,
    dialogueObligation,
    dialogueWorldThread,
    replyDeliberation,
    selfContinuityAuthority,
    projectedAnswer,
    selectedConcern,
    selectedRepair,
    worldModel,
  })
  const plannerOpeningMove = sanitizePlannerProviderText(replyDeliberation?.openingBeat, 220)

  if (answerCompiler) {
    const shouldAskForGrounding = input.groundedThisTurn === true
      ? false
      : answerCompiler.recommendedAct === 'ask-reground'
        || answerCompiler.evidenceMode === 'repair-first'
    const shouldAcknowledgeRepair = answerCompiler.turnMode === 'screen-repair'
      || answerCompiler.recommendedAct === 'correct-stale-anchor'
      || answerCompiler.recommendedAct === 'ask-reground'

    return {
      act: answerCompiler.recommendedAct,
      evidenceMode: answerCompiler.evidenceMode,
      confidence: answerCompiler.confidence,
      governingFocus: plannerFocus,
      governingProject: null,
      openingMove: plannerOpeningMove,
      answerIntent: plannerAnswerIntent || plannerFocus,
      relationshipPosture: answerCompiler.relationshipPosture,
      activeClosenessContext: compiledActiveClosenessContext,
      activeClosenessRung: compiledActiveClosenessRung,
      shouldAskForGrounding,
      shouldAcknowledgeRepair,
      selectedConcernEntryId: selectedConcern?.id ?? null,
      selectedRepairId: selectedRepair?.id ?? null,
      selectedCommitmentId: selectedCommitment?.id ?? null,
      selectedInquiryPlanId: selectedInquiry?.id ?? null,
      selectedRuntimeThreadId: worldModel?.activeThread?.id ?? null,
      selectedProjectId: selectedProject?.id ?? null,
      selectedReflectionId: selectedReflection?.id ?? null,
      executivePhase: executiveCycle?.phase ?? null,
      selectedTruthFrame: worldOntology?.dominantFrame ?? null,
      mustDo: [],
      mustNotDo: [],
      narrative: [],
      updatedAt: input.now,
    }
  }

  const mode = evidenceMode({
    currentScene,
    worldModel,
    worldOntology,
    runtimeSurface,
    concernContinuity,
    repairLedger,
    turnProfile,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const act = answerAct({
    evidenceMode: mode,
    worldModel,
    concernContinuity,
    repairLedger,
    commitmentLedger,
    inquiryPlanner,
    intentionStream,
    reflectionLedger,
    executiveCycle,
    privateThought,
    inspectionRequested: input.inspectionRequested,
    dialogueObligation,
    turnProfile,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const posture = relationshipPosture({
    act,
    repairLedger,
    relationshipModel,
    privateThought,
    mindKernel,
    executiveCycle,
    dialogueObligation,
  })
  const shouldAskForGrounding
    = input.groundedThisTurn === true
      ? false
      : act === 'ask-reground'
        || Boolean(selectedInquiry?.askForGrounding && (mode === 'repair-first' || mode === 'continuity-carry'))
  const shouldAcknowledgeRepair
    = input.groundedThisTurn === true && act !== 'correct-stale-anchor' && act !== 'ask-reground'
      ? false
      : act === 'correct-stale-anchor'
        || act === 'ask-reground'
        || Boolean(selectedRepair && selectedRepair.kind !== 'present-tense-boundary')

  return {
    act,
    evidenceMode: mode,
    confidence: clamp01(
      (privateThought?.confidence ?? 0.36) * 0.28
      + (selectedConcern?.confidence ?? 0.34) * 0.18
      + (selectedRepair?.confidence ?? 0.32) * 0.16
      + (worldModel?.activeThread?.confidence ?? 0.34) * 0.14
      + (selectedCommitment?.confidence ?? 0.32) * 0.1
      + (selectedProject?.confidence ?? 0.34) * 0.1
      + Math.max(0, selectedReflection?.confidenceShift ?? 0) * 0.08
      + (selectedInquiry ? 0.08 : 0.04),
    ),
    governingFocus: plannerFocus,
    governingProject: null,
    openingMove: plannerOpeningMove,
    answerIntent: plannerAnswerIntent || plannerFocus,
    relationshipPosture: posture,
    activeClosenessContext: compiledActiveClosenessContext,
    activeClosenessRung: compiledActiveClosenessRung,
    shouldAskForGrounding,
    shouldAcknowledgeRepair,
    selectedConcernEntryId: selectedConcern?.id ?? null,
    selectedRepairId: selectedRepair?.id ?? null,
    selectedCommitmentId: selectedCommitment?.id ?? null,
    selectedInquiryPlanId: selectedInquiry?.id ?? null,
    selectedRuntimeThreadId: worldModel?.activeThread?.id ?? null,
    selectedProjectId: selectedProject?.id ?? null,
    selectedReflectionId: selectedReflection?.id ?? null,
    executivePhase: executiveCycle?.phase ?? null,
    selectedTruthFrame: worldOntology?.dominantFrame ?? null,
    mustDo: [],
    mustNotDo: [],
    narrative: [],
    updatedAt: input.now,
  }
}
