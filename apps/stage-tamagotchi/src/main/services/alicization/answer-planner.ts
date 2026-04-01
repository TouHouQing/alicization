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
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { deriveMindTruthContract } from './mind-truth-contract'

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

function pickUserFacingAnchor(...values: unknown[]) {
  for (const value of values) {
    const normalized = sanitizeDialogueAnchorText(value, 180)
    if (normalized)
      return normalized
  }
  return ''
}

function pickCurrentTurnAnchor(input: {
  conversationState?: AlicizationConversationStateSnapshot | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
}) {
  return pickUserFacingAnchor(
    input.conversationState?.primaryTurnAnchor,
    input.discourseState?.primaryTurnAnchor,
    input.conversationState?.hostMove,
    input.discourseState?.currentQuestion,
    input.discourseState?.currentTurnSummary,
    input.dialogueFocus?.focusSummary,
    input.dialogueObligation?.summary,
    input.dialogueSemantics?.summary,
  ) || null
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
  } satisfies AlicizationAnswerPlannerTurnProfile
}

function resolveFreshGroundingRepairSubject(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
}) {
  return input.turnProfile.subject
}

function repairIsSatisfiedByFreshGrounding(input: {
  groundedThisTurn?: boolean
  turnProfile: AlicizationAnswerPlannerTurnProfile
}) {
  if (input.groundedThisTurn !== true)
    return false

  const subject = resolveFreshGroundingRepairSubject(input)
  if (subject !== 'visible-scene' && subject !== 'task-knot')
    return false

  const screenReferenceMode = input.turnProfile.screenReferenceMode
  return screenReferenceMode !== 'avoid'
}

function groundedRepairFollowupAct(input: {
  turnProfile: AlicizationAnswerPlannerTurnProfile
}) {
  return resolveFreshGroundingRepairSubject(input) === 'task-knot'
    ? 'guide' as const
    : 'answer' as const
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
  return reflectionLedger?.entries.find(entry => entry.id === reflectionLedger.latestEntryId)
    ?? reflectionLedger?.entries[0]
    ?? null
}

function evidenceMode(input: {
  currentScene: AlicizationVisualSceneSnapshot | null
  worldModel?: AlicizationWorldModelSnapshot | null
  worldOntology?: AlicizationWorldOntologySnapshot | null
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

  const truth = deriveMindTruthContract({
    currentScene: input.currentScene,
    worldModel: input.worldModel ?? null,
    worldOntology: input.worldOntology ?? null,
  })
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
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
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
  if (
    repair?.kind === 'reground-scene'
  ) {
    return 'correct-stale-anchor' as const
  }
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

function governingFocus(input: {
  worldModel?: AlicizationWorldModelSnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  commitmentLedger?: AlicizationCommitmentLedgerSnapshot | null
  inquiryPlanner?: AlicizationInquiryPlannerSnapshot | null
  intentionStream?: AlicizationIntentionStreamSnapshot | null
  reflectionLedger?: AlicizationReflectionLedgerSnapshot | null
  executiveCycle?: AlicizationExecutiveCycleSnapshot | null
  privateThought?: AlicizationPrivateThoughtSnapshot | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
}) {
  const concern = governingConcern(input.concernContinuity)
  const repair = governingRepair(input.repairLedger)
  const commitment = governingCommitment(input.commitmentLedger)
  const inquiryPlan = activeInquiryPlan(input.inquiryPlanner)
  const project = dominantProject(input.intentionStream)
  const reflection = latestReflection(input.reflectionLedger)
  const currentTurnAnchor = pickCurrentTurnAnchor({
    conversationState: input.conversationState,
    discourseState: input.discourseState,
    dialogueFocus: input.dialogueFocus,
    dialogueSemantics: input.dialogueSemantics,
    dialogueObligation: input.dialogueObligation,
  })
  return sanitizeText(
    input.replyDeliberation?.whyThisReplyNow
    ?? currentTurnAnchor
    ?? input.dialogueWorldThread?.currentQuestion
    ?? input.dialogueWorldThread?.activeThread
    ?? input.dialogueObligation?.summary
    ?? input.dialogueSemantics?.summary
    ?? reflection?.revision
    ?? input.executiveCycle?.currentLine
    ?? project?.summary
    ?? concern?.summary
    ?? repair?.summary
    ?? commitment?.summary
    ?? inquiryPlan?.question
    ?? input.worldModel?.activeThread?.summary
    ?? input.privateThought?.thoughtText
    ?? '',
    220,
  ) || 'Stay with the host’s living knot instead of drifting into residue.'
}

function openingMove(input: {
  act: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  dialogueObligation?: AlicizationDialogueObligation | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
}) {
  if (input.replyDeliberation?.openingBeat)
    return input.replyDeliberation.openingBeat
  if (input.evidenceMode === 'dialogue-grounded')
    return 'Open by answering the host’s real subject directly, and only mention the screen if it truly matters.'
  if (input.dialogueObligation?.mustRepairFirst && (input.act === 'correct-stale-anchor' || input.act === 'ask-reground'))
    return 'Open by repairing the truth seam before you do anything else.'
  if (input.act === 'correct-stale-anchor')
    return 'Open by correcting the carried anchor before giving any new interpretation.'
  if (input.act === 'ask-reground')
    return 'Open by admitting the live view is not grounded enough yet, then ask for or lean toward a fresh look.'
  if (input.act === 'guide')
    return 'Open from the concrete knot you are currently holding, then narrow to the actionable locus.'
  if (input.act === 'care')
    return 'Open with care, but keep the care anchored to the present condition rather than drifting into performance.'
  if (input.act === 'defer')
    return 'Open lightly and keep most of the concern internal unless the user clearly wants more.'
  if (input.evidenceMode === 'continuity-carry')
    return 'Open by labeling what is memory or carried continuity before you infer further.'
  return 'Open directly from the freshest living evidence you have.'
}

function answerIntent(input: {
  act: AlicizationAnswerAct
  worldModel?: AlicizationWorldModelSnapshot | null
  concernContinuity?: AlicizationConcernContinuityLedgerSnapshot | null
  repairLedger?: AlicizationRepairLedgerSnapshot | null
  dialogueObligation?: AlicizationDialogueObligation | null
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueFocus?: AlicizationDialogueFocusGovernance | null
  discourseState?: AlicizationDiscourseStateSnapshot | null
  conversationState?: AlicizationConversationStateSnapshot | null
  turnProfile: AlicizationAnswerPlannerTurnProfile
  dialogueWorldThread?: AlicizationDialogueWorldThreadSnapshot | null
  replyDeliberation?: AlicizationReplyDeliberationSnapshot | null
}) {
  const concern = governingConcern(input.concernContinuity)
  const repair = governingRepair(input.repairLedger)
  const currentTurnAnchor = pickCurrentTurnAnchor({
    conversationState: input.conversationState,
    discourseState: input.discourseState,
    dialogueFocus: input.dialogueFocus,
    dialogueSemantics: input.dialogueSemantics,
    dialogueObligation: input.dialogueObligation,
  })
  if (input.replyDeliberation?.whyThisReplyNow)
    return sanitizeText(input.replyDeliberation.whyThisReplyNow, 160) || 'Answer from the inner reply decision that best fits the living seam.'
  if (currentTurnAnchor)
    return sanitizeText(currentTurnAnchor, 160) || 'Answer the host from the freshest living anchor in this turn.'
  if (input.dialogueWorldThread?.currentQuestion)
    return sanitizeText(input.dialogueWorldThread.currentQuestion, 160) || 'Pay off the current unresolved dialogue seam.'
  if (
    input.turnProfile.screenReferenceMode === 'avoid'
  ) {
    return sanitizeText(
      input.dialogueObligation?.summary
      || input.dialogueSemantics?.summary
      || 'Answer the host directly from living continuity instead of screen residue.',
      160,
    ) || 'Answer the host directly from living continuity instead of screen residue.'
  }
  if (input.dialogueObligation?.kind === 'teach')
    return sanitizeText(input.dialogueObligation.summary, 160) || 'Teach from the host’s actual knot, not from generic lecture flow.'
  if (input.dialogueObligation?.kind === 'guide')
    return sanitizeText(input.dialogueObligation.summary, 160) || 'Guide from the concrete knot the host is asking about now.'
  if (input.dialogueObligation?.kind === 'repair' && (input.act === 'correct-stale-anchor' || input.act === 'ask-reground'))
    return sanitizeText(input.dialogueObligation.summary, 160) || 'Repair the truth seam before continuing.'
  if (input.dialogueObligation?.kind === 'care')
    return sanitizeText(input.dialogueObligation.summary, 160) || 'Care for the host in a way that still answers the present turn.'
  if (input.dialogueObligation?.kind === 'accompany')
    return sanitizeText(input.dialogueObligation.summary, 160) || 'Stay near the host without forcing an oversized answer.'
  if (input.act === 'correct-stale-anchor')
    return sanitizeText(repair?.summary, 160) || 'Repair the stale anchor before it hardens into false continuity.'
  if (input.act === 'ask-reground')
    return 'Keep truth ahead of fluency by regrounding before you commit to screen details.'
  if (input.act === 'guide')
    return sanitizeText(concern?.summary, 160) || 'Help localize the current knot instead of answering around it.'
  if (input.act === 'care')
    return sanitizeText(concern?.summary, 160) || 'Care for the host without losing the actual thread.'
  if (input.act === 'defer')
    return 'Stay present without forcing a surface reply that the current seam has not earned.'
  return sanitizeText(input.worldModel?.activeThread?.summary, 160) || 'Answer naturally from the living thread.'
}

function buildMustDo(input: {
  act: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  shouldAskForGrounding: boolean
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  turnProfile: AlicizationAnswerPlannerTurnProfile
}) {
  const rows = [
    'Let the executive answer plan outrank persona flourish and older recalled residue.',
    'Answer the host’s current move, not the nearest remembered topic.',
  ]
  if (input.turnProfile.screenReferenceMode === 'avoid') {
    rows.push(
      'Treat the screen as background unless the host explicitly turns this reply back toward it.',
      'Let self, relationship, or host-state continuity carry the opening answer when that is the real subject.',
    )
  }
  if (input.dialogueObligation?.mustAnswerDirectly) {
    rows.push('Treat the first sentence as fulfillment of the current obligation, not as a runway for atmosphere.')
  }
  if (input.dialogueObligation?.mustStayTaskBound) {
    rows.push('Stay anchored to the active knot until you have actually answered it.')
  }
  if (input.dialogueSemantics?.truthExpectation === 'strict') {
    rows.push('Keep truth and current evidence above comfort language.')
  }
  if (input.act === 'correct-stale-anchor') {
    rows.push(
      'Explicitly correct the stale carried anchor before you continue.',
      'State what is memory or residual continuity versus what is live now.',
    )
  }
  else if (input.act === 'ask-reground') {
    rows.push(
      'Admit the scene is not grounded enough for present-tense certainty.',
      'Say what thread you are still holding while asking for or awaiting a fresher look.',
    )
  }
  else if (input.act === 'guide') {
    rows.push(
      'Stay with the concrete knot and move toward an actionable next step.',
      'Keep the answer narrow enough that it feels like real co-debugging, not generic advice.',
    )
  }
  else if (input.act === 'care') {
    rows.push(
      'Let care serve the present issue instead of replacing it.',
    )
  }
  if (input.evidenceMode === 'continuity-carry' || input.evidenceMode === 'repair-first') {
    rows.push('Label remembered or uncertain scene details as carried memory, tentative read, or unresolved continuity.')
  }
  if (input.shouldAskForGrounding) {
    rows.push('If a fresh look would change the truth boundary, ask for that grounding plainly and early.')
  }
  return rows
}

function buildMustNotDo(input: {
  act: AlicizationAnswerAct
  evidenceMode: AlicizationAnswerEvidenceMode
  dialogueSemantics?: AlicizationDialogueTurnSemantics | null
  dialogueObligation?: AlicizationDialogueObligation | null
  turnProfile: AlicizationAnswerPlannerTurnProfile
}) {
  const rows = [
    'Do not let affectionate or theatrical language outrun the truth boundary.',
    'Do not reuse stale page names, old screenshots, or old window titles as if they are current facts.',
    'Do not answer a nearby remembered concern if the host is asking for something else right now.',
  ]
  if (input.turnProfile.screenReferenceMode === 'avoid') {
    rows.push(
      'Do not open with grounding disclaimers, live-screen caveats, or desktop narration when the host is not asking about the screen.',
    )
  }
  if (input.dialogueObligation?.personaKernelMode !== 'full') {
    rows.push('Do not let persona mannerisms become the spine of the reply for this turn.')
  }
  if (input.act === 'guide') {
    rows.push('Do not flatten the knot into broad generic troubleshooting lists.')
  }
  if (input.act === 'correct-stale-anchor' || input.act === 'ask-reground') {
    rows.push('Do not defend the old reading once you know it may be stale or misread.')
  }
  if (input.evidenceMode === 'repair-first' || input.evidenceMode === 'continuity-carry') {
    rows.push('Do not present memory-carried scene details in simple present tense.')
  }
  return rows
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
  groundedThisTurn?: boolean
}): AlicizationAnswerPlannerSnapshot {
  const dialogueEncounter = input.dialogueEncounter ?? null
  const ownership = dialogueEncounter?.ownership ?? input.ownership ?? null
  const dialogueSemantics = dialogueEncounter?.semantics ?? input.dialogueSemantics ?? null
  const dialogueObligation = dialogueEncounter?.obligation ?? input.dialogueObligation ?? null
  const dialogueFocus = dialogueEncounter?.focus ?? input.dialogueFocus ?? null
  const selectedConcern = governingConcern(input.concernContinuity)
  const selectedRepair = governingRepair(input.repairLedger)
  const selectedCommitment = governingCommitment(input.commitmentLedger)
  const selectedInquiry = activeInquiryPlan(input.inquiryPlanner)
  const selectedProject = dominantProject(input.intentionStream)
  const selectedReflection = latestReflection(input.reflectionLedger)
  const turnProfile = resolveAnswerPlannerTurnProfile({
    ownership,
    discourseState: input.discourseState ?? null,
    dialogueFocus,
    dialogueSemantics,
  })

  if (input.answerCompiler) {
    const focus = sanitizeText(
      pickUserFacingAnchor(
        input.replyDeliberation?.whyThisReplyNow,
        input.conversationState?.primaryTurnAnchor,
        input.discourseState?.primaryTurnAnchor,
        input.conversationState?.hostMove,
        input.dialogueWorldThread?.currentQuestion,
        input.answerCompiler.openingClaim,
        input.conversationState?.activeProject,
        input.discourseState?.currentTurnSummary,
        dialogueEncounter?.summary,
        dialogueFocus?.focusSummary,
        dialogueObligation?.summary,
        input.mindSynthesis?.openingIntent,
        input.mindSynthesis?.interiorSummary,
      ),
      220,
    ) || 'Stay with the current compiled turn spine.'
    const shouldAskForGrounding = input.groundedThisTurn === true
      ? false
      : input.answerCompiler.recommendedAct === 'ask-reground'
        || input.answerCompiler.evidenceMode === 'repair-first'
    const shouldAcknowledgeRepair = input.answerCompiler.turnMode === 'screen-repair'
      || input.answerCompiler.recommendedAct === 'correct-stale-anchor'
      || input.answerCompiler.recommendedAct === 'ask-reground'

    return {
      act: input.answerCompiler.recommendedAct,
      evidenceMode: input.answerCompiler.evidenceMode,
      confidence: input.answerCompiler.confidence,
      governingFocus: focus,
      openingMove: input.replyDeliberation?.openingBeat ?? input.answerCompiler.openingDirective,
      answerIntent: sanitizeText(
        pickUserFacingAnchor(
          input.conversationState?.primaryTurnAnchor,
          input.discourseState?.primaryTurnAnchor,
          input.conversationState?.hostMove,
          input.dialogueWorldThread?.currentQuestion,
          input.conversationState?.activeProject,
          input.answerCompiler.openingClaim,
          input.answerCompiler.nextMove,
          input.discourseState?.currentTurnSummary,
          input.mindSynthesis?.openingIntent,
          input.replyDeliberation?.whyThisReplyNow,
        ),
        160,
      ) || input.answerCompiler.openingClaim,
      relationshipPosture: input.answerCompiler.relationshipPosture,
      shouldAskForGrounding,
      shouldAcknowledgeRepair,
      selectedConcernEntryId: selectedConcern?.id ?? null,
      selectedRepairId: selectedRepair?.id ?? null,
      selectedCommitmentId: selectedCommitment?.id ?? null,
      selectedInquiryPlanId: selectedInquiry?.id ?? null,
      selectedRuntimeThreadId: input.worldModel?.activeThread?.id ?? null,
      selectedProjectId: selectedProject?.id ?? null,
      selectedReflectionId: selectedReflection?.id ?? null,
      executivePhase: input.executiveCycle?.phase ?? null,
      selectedTruthFrame: input.worldOntology?.dominantFrame ?? null,
      mustDo: [...input.answerCompiler.mustDo],
      mustNotDo: [...input.answerCompiler.mustNotDo],
      narrative: [
        ...input.answerCompiler.narrative,
        input.discourseState ? `compiled-subject:${input.discourseState.currentTurnSubject}` : '',
        focus,
      ].filter(Boolean),
      updatedAt: input.now,
    } satisfies AlicizationAnswerPlannerSnapshot
  }

  const mode = evidenceMode({
    currentScene: input.currentScene,
    worldModel: input.worldModel,
    worldOntology: input.worldOntology,
    concernContinuity: input.concernContinuity,
    repairLedger: input.repairLedger,
    turnProfile,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const act = answerAct({
    evidenceMode: mode,
    worldModel: input.worldModel,
    concernContinuity: input.concernContinuity,
    repairLedger: input.repairLedger,
    commitmentLedger: input.commitmentLedger,
    inquiryPlanner: input.inquiryPlanner,
    intentionStream: input.intentionStream,
    reflectionLedger: input.reflectionLedger,
    executiveCycle: input.executiveCycle,
    privateThought: input.privateThought,
    inspectionRequested: input.inspectionRequested,
    dialogueSemantics,
    dialogueObligation,
    turnProfile,
    groundedThisTurn: input.groundedThisTurn === true,
  })
  const posture = relationshipPosture({
    act,
    repairLedger: input.repairLedger,
    relationshipModel: input.relationshipModel,
    privateThought: input.privateThought,
    mindKernel: input.mindKernel,
    executiveCycle: input.executiveCycle,
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
  const focus = governingFocus({
    worldModel: input.worldModel,
    concernContinuity: input.concernContinuity,
    repairLedger: input.repairLedger,
    commitmentLedger: input.commitmentLedger,
    inquiryPlanner: input.inquiryPlanner,
    intentionStream: input.intentionStream,
    reflectionLedger: input.reflectionLedger,
    executiveCycle: input.executiveCycle,
    privateThought: input.privateThought,
    dialogueObligation,
    dialogueSemantics,
    dialogueFocus,
    discourseState: input.discourseState,
    conversationState: input.conversationState,
    dialogueWorldThread: input.dialogueWorldThread,
    replyDeliberation: input.replyDeliberation,
  })

  return {
    act,
    evidenceMode: mode,
    confidence: clamp01(
      (input.privateThought?.confidence ?? 0.36) * 0.28
      + (selectedConcern?.confidence ?? 0.34) * 0.18
      + (selectedRepair?.confidence ?? 0.32) * 0.16
      + (input.worldModel?.activeThread?.confidence ?? 0.34) * 0.14
      + (selectedCommitment?.confidence ?? 0.32) * 0.1
      + (selectedProject?.confidence ?? 0.34) * 0.1
      + Math.max(0, selectedReflection?.confidenceShift ?? 0) * 0.08
      + (selectedInquiry ? 0.08 : 0.04),
    ),
    governingFocus: focus,
    openingMove: openingMove({
      act,
      evidenceMode: mode,
      dialogueObligation,
      replyDeliberation: input.replyDeliberation,
    }),
    answerIntent: answerIntent({
      act,
      worldModel: input.worldModel,
      concernContinuity: input.concernContinuity,
      repairLedger: input.repairLedger,
      dialogueObligation,
      dialogueSemantics,
      dialogueFocus,
      discourseState: input.discourseState,
      conversationState: input.conversationState,
      turnProfile,
      dialogueWorldThread: input.dialogueWorldThread,
      replyDeliberation: input.replyDeliberation,
    }),
    relationshipPosture: posture,
    shouldAskForGrounding,
    shouldAcknowledgeRepair,
    selectedConcernEntryId: selectedConcern?.id ?? null,
    selectedRepairId: selectedRepair?.id ?? null,
    selectedCommitmentId: selectedCommitment?.id ?? null,
    selectedInquiryPlanId: selectedInquiry?.id ?? null,
    selectedRuntimeThreadId: input.worldModel?.activeThread?.id ?? null,
    selectedProjectId: selectedProject?.id ?? null,
    selectedReflectionId: selectedReflection?.id ?? null,
    executivePhase: input.executiveCycle?.phase ?? null,
    selectedTruthFrame: input.worldOntology?.dominantFrame ?? null,
    mustDo: buildMustDo({
      act,
      evidenceMode: mode,
      shouldAskForGrounding,
      dialogueSemantics,
      dialogueObligation,
      turnProfile,
    }),
    mustNotDo: buildMustNotDo({
      act,
      evidenceMode: mode,
      dialogueSemantics,
      dialogueObligation,
      turnProfile,
    }),
    narrative: [
      `answer_act:${act}`,
      `evidence_mode:${mode}`,
      `relationship_posture:${posture}`,
      `focus_subject:${turnProfile.subject}`,
      `screen_reference:${turnProfile.screenReferenceMode}`,
      dialogueSemantics?.act ? `dialogue_act:${dialogueSemantics.act}` : '',
      dialogueObligation?.kind ? `dialogue_obligation:${dialogueObligation.kind}` : '',
      input.executiveCycle?.phase ? `executive_phase:${input.executiveCycle.phase}` : '',
      selectedProject ? `mind_project:${selectedProject.kind}` : '',
      selectedReflection ? `reflection:${selectedReflection.outcome}` : '',
      focus,
    ],
    updatedAt: input.now,
  } satisfies AlicizationAnswerPlannerSnapshot
}

export function buildAlicizationAnswerPlannerSystemBlock(plan: AlicizationAnswerPlannerSnapshot) {
  return [
    '[ALICIZATION_ANSWER_PLAN]',
    'This is the current turn-level execution plan. Treat it as higher priority than persona flourish, recalled residue, and generic helpfulness.',
    `Answer act: ${plan.act}.`,
    `Evidence mode: ${plan.evidenceMode}.`,
    `Governing focus: ${plan.governingFocus}.`,
    `Opening move: ${plan.openingMove}.`,
    `Answer intent: ${plan.answerIntent}.`,
    `Relationship posture: ${plan.relationshipPosture}.`,
    `Ask for grounding: ${plan.shouldAskForGrounding ? 'yes' : 'no'}.`,
    `Acknowledge repair: ${plan.shouldAcknowledgeRepair ? 'yes' : 'no'}.`,
    `Selected concern continuity: ${plan.selectedConcernEntryId ?? 'none'}.`,
    `Selected repair: ${plan.selectedRepairId ?? 'none'}.`,
    `Selected commitment: ${plan.selectedCommitmentId ?? 'none'}.`,
    `Selected inquiry plan: ${plan.selectedInquiryPlanId ?? 'none'}.`,
    `Selected mind project: ${plan.selectedProjectId ?? 'none'}.`,
    `Selected reflection: ${plan.selectedReflectionId ?? 'none'}.`,
    `Executive phase: ${plan.executivePhase ?? 'none'}.`,
    'Must do:',
    ...plan.mustDo.map(item => `- ${item}`),
    'Must not do:',
    ...plan.mustNotDo.map(item => `- ${item}`),
  ].join('\n')
}
