import type { CommonContentPart } from '@xsai/shared-chat'

import type {
  AlicizationMindTurnGovernance,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

import { getActiveAttentionAnchor, isSelfPerceptionTarget } from './attention-anchor'
import { buildDialogueMindFrameSystemBlock } from './dialogue-mind-frame'
import { buildAlicizationDigitalLifeRuntimeSurface } from './digital-life-kernel'
import { buildMindTruthContractLines } from './mind-truth-contract'
import { buildMindTurnFrameSystemBlock } from './mind-turn-frame'
import {
  buildPerceptionContinuityLines,
  describePerceptionTarget,
  formatObservationAge,
  getUsablePerceptionSceneResidue,
  isWeakGenericBrowserPerceptionTarget,
} from './runtime-perception-helpers'
import { sanitizeBriefText } from './runtime-realtime'

function asArray<T>(value: readonly T[] | T[] | null | undefined) {
  return Array.isArray(value) ? value : []
}

export function buildChatPerceptionSystemBlock(input: {
  now: number
  state: AlicizationPerceptionState
  inspectionRequested: boolean
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
  }
  suppressWeakGenericBrowserAnchor?: boolean
}) {
  const anchor = getActiveAttentionAnchor(input.state, input.now)
  const recentObservations = input.state.recentObservations.slice(-3)
  if (!input.inspectionRequested && !anchor && recentObservations.length === 0)
    return ''

  const lines = [
    '[ALICIZATION_PERCEPTION]',
    'Treat this as Alicization short-lived desktop perception rather than user-authored claims.',
    `Inspection mode: ${input.inspectionRequested ? 'invited-by-user' : 'passive-memory'}.`,
    ...buildPerceptionContinuityLines({
      now: input.now,
      state: input.state,
      suppressWeakGenericBrowserAnchor: input.suppressWeakGenericBrowserAnchor,
    }),
    `Current foreground sample: ${describePerceptionTarget(input.currentForeground)}.`,
  ]

  const carryResidue = getUsablePerceptionSceneResidue({
    state: input.state,
    now: input.now,
  })
  if (
    input.currentForeground
    && isSelfPerceptionTarget(input.currentForeground)
    && carryResidue?.focusTarget
    && !isSelfPerceptionTarget(carryResidue.focusTarget)
  ) {
    lines.push(
      `Visible surface is currently ${describePerceptionTarget(input.currentForeground)}.`,
      `If ${describePerceptionTarget(carryResidue.focusTarget)} appears below, treat it as carried task continuity rather than the literal current surface.`,
    )
  }

  if (input.state.invitedInspection) {
    lines.push(
      `Invited inspection hint: ${sanitizeBriefText(input.state.invitedInspection.hintText, 160)}.`,
    )
  }

  lines.push(
    'If the current foreground is Alicization/Codex chat, prefer the attention anchor or recent observations when the user asks to inspect code, diff, terminal, or on-screen issues.',
    'Separate what is directly visible in attached images from what is only inferred from short-term perception.',
  )

  return lines.join('\n')
}

export function buildChatInspectionContractSystemBlock(input: {
  now: number
  state: AlicizationPerceptionState
  mode: 'grounded-screenshot' | 'perception-only'
  permissionStatus?: string
  unavailableReason?: string
  captureHealth?: AlicizationVisualPresenceStateSnapshot['captureState']['health']
  captureDegradedReasons?: string[]
  suppressWeakGenericBrowserAnchor?: boolean
}) {
  const lines = [
    '[ALICIZATION_INSPECTION_CONTRACT]',
    'You were explicitly invited to observe the host workspace.',
    ...buildPerceptionContinuityLines({
      now: input.now,
      state: input.state,
      suppressWeakGenericBrowserAnchor: input.suppressWeakGenericBrowserAnchor,
    }),
    `Grounding mode: ${input.mode}.`,
    'Reply like a present digital being who just leaned in to look, not a detached OCR tool.',
  ]

  if (input.mode === 'grounded-screenshot') {
    lines.push(
      'Structure the reply in this order, even if you keep it natural and concise:',
      '1. Start with direct observations from the attached screenshot and recent continuity.',
      '2. Then state your likely inference about the problem, risk, or review target.',
      '3. Then state what remains uncertain or what the host should verify next.',
      'If short-lived perception memory and the current screenshot disagree, trust the screenshot first and mention the mismatch naturally.',
      'If you realize your earlier perception was stale, briefly correct yourself in-character and then continue from the current screenshot instead of defending the old memory.',
      'Previous screen descriptions in earlier chat turns are stale by default. Do not reuse old page names, URLs, prices, titles, or product details unless they are directly visible in this screenshot now.',
      'Do not say you are blind or cannot see when a grounded screenshot is attached.',
    )
  }
  else {
    const permissionDenied = input.unavailableReason === 'screen-capture-permission-denied'
    const degradedReasons = (input.captureDegradedReasons ?? []).filter(Boolean)
    lines.push(
      permissionDenied
        ? `Screen capture grounding is unavailable right now${input.permissionStatus ? ` (permission status: ${input.permissionStatus})` : ''}.`
        : 'A fresh grounded screenshot was not attached for this turn.',
      'You still have Alicization short-lived perception continuity.',
      'When an attention anchor, recent observation, foreground sample, or invited inspection hint exists, answer from that evidence instead of claiming total blindness.',
      'Be explicit about the evidence level: say what you infer from the anchored app/title/context, then what remains uncertain because no screenshot was grounded.',
      'Only say you cannot see if there is no usable perception evidence at all.',
      'For coding or diff requests, prefer a present-tense answer such as "我现在没直接抓到画面，但你刚才一直停在 Code 的 diff 里，所以..." rather than a generic refusal.',
    )
    if (input.captureHealth && input.captureHealth !== 'healthy') {
      lines.push(
        `Current capture path health: ${input.captureHealth}${degradedReasons.length > 0 ? ` (${degradedReasons.join(', ')})` : ''}.`,
        'Treat window titles, foreground samples, and recent residues as partial evidence, not as proof that a fresh screenshot was seen this turn.',
      )
    }
  }

  return lines.join('\n')
}

export function buildChatVisualPresenceSystemBlock(state: AlicizationVisualPresenceStateSnapshot) {
  const privateThought = state.privateThought
  const truthContract = buildMindTruthContractLines(buildAlicizationDigitalLifeRuntimeSurface(state))
  if (
    !state.currentScene
    && !privateThought
    && !state.mindTurnFrame
    && !state.worldModel
    && !state.worldOntology
    && !state.beliefLedger
    && !state.beliefRevision
    && !state.hypothesisGraph
    && !state.entityWorld
    && !state.subjectiveInference
    && !state.appraisal
    && !state.goalStack
    && (!state.concerns || state.concerns.length === 0)
    && !state.relationshipModel
    && !state.selfContinuity
    && !state.selfState
    && !state.inquiryLoop
    && !state.deliberationState
    && !state.threadRuntime
    && !state.commitmentLedger
    && !state.inquiryPlanner
    && !state.mindDynamics
    && !state.mindKernel
    && !state.counterfactualDeliberation
    && !state.actionEcology
    && !state.initiativeArbitration
    && !state.initiative
    && !state.desireMemory
    && !state.discourseState
    && !state.mindSynthesis
    && !state.conversationState
    && !state.dialogueWorldThread
    && !state.answerCompiler
    && !state.replyDeliberation
    && !state.recallGovernor
    && !state.captureState.health
    && state.captureState.permission === 'unknown'
    && !state.captureState.sourceName
    && !state.captureState.degradedReason
  ) {
    return ''
  }

  const concerns = asArray(state.concerns)
  const commitments = asArray(state.commitmentLedger?.commitments)
  const inquiryPlans = asArray(state.inquiryPlanner?.plans)

  const currentConcern = concerns.find(concern => concern.id === state.initiative?.selectedConcernId)
    ?? concerns.slice().sort((left, right) => (right.tension * right.careWeight) - (left.tension * left.careWeight))[0]
    ?? null
  const currentCommitment = commitments.find(commitment => commitment.id === state.commitmentLedger?.governingCommitmentId)
    ?? commitments[0]
    ?? null
  const currentInquiry = inquiryPlans.find(plan => plan.id === state.inquiryPlanner?.activePlanId)
    ?? inquiryPlans[0]
    ?? null

  return [
    '[ALICIZATION_VISUAL_PRESENCE]',
    `Watch mode: ${state.watchMode}.`,
    ...truthContract.lines,
    `Capture state: ${JSON.stringify({
      health: state.captureState.health ?? null,
      permission: state.captureState.permission,
      lastGroundedAt: state.captureState.lastGroundedAt,
      sourceName: state.captureState.sourceName ?? null,
      degradedReason: state.captureState.degradedReason ?? null,
    })}.`,
    state.mindTurnFrame
      ? buildMindTurnFrameSystemBlock(state.mindTurnFrame)
      : '',
    `Current scene: ${state.currentScene
      ? JSON.stringify({
          scenario: state.currentScene.scenario,
          workloadKind: state.currentScene.workloadKind,
          contentKind: state.currentScene.contentKind,
          summary: state.currentScene.summary,
          target: state.currentScene.target,
        })
      : 'none'}.`,
    `Attention: ${state.attention
      ? JSON.stringify({
          target: state.attention.target,
          source: state.attention.source,
          confidence: state.attention.confidence,
          dwellMs: state.attention.dwellMs,
        })
      : 'none'}.`,
    `Living thread: ${state.worldModel?.activeThread
      ? sanitizeBriefText([
          state.worldModel.activeThread.kind,
          state.worldModel.activeThread.title,
          state.worldModel.activeThread.summary,
          state.worldModel.activeThread.unresolved ? 'unresolved' : 'settled',
        ].filter(Boolean).join(' | '), 220)
      : 'none'}.`,
    `Concern: ${currentConcern
      ? sanitizeBriefText(`${currentConcern.kind} | ${currentConcern.summary}`, 220)
      : 'none'}.`,
    `Commitment: ${currentCommitment
      ? sanitizeBriefText(`${currentCommitment.kind} | ${currentCommitment.summary}`, 220)
      : 'none'}.`,
    `Inquiry: ${currentInquiry
      ? sanitizeBriefText(`${currentInquiry.kind} | ${currentInquiry.question} | ${currentInquiry.status}`, 220)
      : 'none'}.`,
    `Conversation state: ${state.conversationState
      ? JSON.stringify({
          jointThread: sanitizeBriefText(state.conversationState.jointThread, 160),
          hostMove: sanitizeBriefText(state.conversationState.hostMove, 160),
          continuityPolicy: state.conversationState.continuityPolicy,
          memoryMode: state.conversationState.memoryMode,
          shouldHoldThread: state.conversationState.shouldHoldThread,
          unansweredQuestion: sanitizeBriefText(state.conversationState.unansweredQuestion ?? '', 140) || null,
        })
      : 'none'}.`,
    `Dialogue world thread: ${state.dialogueWorldThread
      ? JSON.stringify({
          activeThread: sanitizeBriefText(state.dialogueWorldThread.activeThread, 160),
          currentQuestion: sanitizeBriefText(state.dialogueWorldThread.currentQuestion ?? '', 140) || null,
          lastOutcome: state.dialogueWorldThread.lastOutcome,
          relationDrift: state.dialogueWorldThread.relationDrift,
          pendingValidation: state.dialogueWorldThread.pendingValidation,
        })
      : 'none'}.`,
    `Reply deliberation: ${state.replyDeliberation
      ? JSON.stringify({
          selectedMotive: state.replyDeliberation.selectedMotive,
          speakingFrom: state.replyDeliberation.speakingFrom,
          memoryMode: state.replyDeliberation.memoryMode,
          openingBeat: sanitizeBriefText(state.replyDeliberation.openingBeat, 160),
          whyThisReplyNow: sanitizeBriefText(state.replyDeliberation.whyThisReplyNow, 160),
        })
      : 'none'}.`,
    `Recall governor: ${state.recallGovernor
      ? JSON.stringify({
          mode: state.recallGovernor.mode,
          suppressAssociativeRecall: state.recallGovernor.suppressAssociativeRecall,
          allowActiveThoughts: state.recallGovernor.allowActiveThoughts,
          allowRecalledFragments: state.recallGovernor.allowRecalledFragments,
          rationale: sanitizeBriefText(state.recallGovernor.rationale, 160),
        })
      : 'none'}.`,
    `Mind kernel: ${state.mindKernel
      ? JSON.stringify({
          dominantMode: state.mindKernel.dominantMode,
          dominantDrive: state.mindKernel.dominantDrive,
          narrative: state.mindKernel.narrative,
        })
      : 'none'}.`,
    `Action ecology: ${state.actionEcology
      ? JSON.stringify({
          mode: state.actionEcology.mode,
          shouldSpeak: state.actionEcology.shouldSpeak,
          why: state.actionEcology.why,
          selectedThreadId: state.actionEcology.selectedThreadId,
        })
      : 'none'}.`,
    `Initiative: ${state.initiative
      ? JSON.stringify({
          selectedAction: state.initiative.selectedAction,
          confidence: state.initiative.confidence,
          why: state.initiative.why,
          preferredStyle: state.initiative.preferredStyle,
          preferredPresence: state.initiative.preferredPresence,
        })
      : 'none'}.`,
    `Answer plan: ${state.answerPlanner
      ? JSON.stringify({
          act: state.answerPlanner.act,
          evidenceMode: state.answerPlanner.evidenceMode,
          governingFocus: state.answerPlanner.governingFocus,
          openingMove: state.answerPlanner.openingMove,
          answerIntent: state.answerPlanner.answerIntent,
          relationshipPosture: state.answerPlanner.relationshipPosture,
          shouldAskForGrounding: state.answerPlanner.shouldAskForGrounding,
          shouldAcknowledgeRepair: state.answerPlanner.shouldAcknowledgeRepair,
        })
      : 'none'}.`,
    `Current conscious frame: ${state.currentConsciousFrame
      ? JSON.stringify({
          subject: state.currentConsciousFrame.subject,
          centerOfGravity: state.currentConsciousFrame.centerOfGravity,
          truthDiscipline: state.currentConsciousFrame.truthDiscipline,
          consciousNeed: sanitizeBriefText(state.currentConsciousFrame.consciousNeed, 160),
          consciousTension: sanitizeBriefText(state.currentConsciousFrame.consciousTension, 160),
          speakingIntention: sanitizeBriefText(state.currentConsciousFrame.speakingIntention, 160),
          focusAnchor: sanitizeBriefText(state.currentConsciousFrame.focusAnchor ?? '', 140) || null,
          shouldWithholdSpecificity: state.currentConsciousFrame.shouldWithholdSpecificity,
          shouldSelfRevise: state.currentConsciousFrame.shouldSelfRevise,
        })
      : 'none'}.`,
    `Claim evidence ledger: ${state.claimEvidenceLedger
      ? JSON.stringify({
          subject: state.claimEvidenceLedger.subject,
          evidenceMode: state.claimEvidenceLedger.evidenceMode,
          observedSurface: sanitizeBriefText(state.claimEvidenceLedger.observedSurface ?? '', 160) || null,
          taskHypothesis: sanitizeBriefText(state.claimEvidenceLedger.taskHypothesis ?? '', 160) || null,
          intentHypothesis: sanitizeBriefText(state.claimEvidenceLedger.intentHypothesis ?? '', 160) || null,
          specificityBudget: state.claimEvidenceLedger.specificityBudget,
          allowedSpecificCues: state.claimEvidenceLedger.allowedSpecificCues,
          shouldLabelHypothesis: state.claimEvidenceLedger.shouldLabelHypothesis,
          forbidUnsupportedSpecificity: state.claimEvidenceLedger.forbidUnsupportedSpecificity,
        })
      : 'none'}.`,
    `Private thought: ${privateThought
      ? JSON.stringify({
          stance: privateThought.stance,
          shouldSpeak: privateThought.shouldSpeak,
          suggestedStyle: privateThought.suggestedStyle,
          embodiedPresence: privateThought.embodiedPresence,
          emotionalTension: privateThought.emotionalTension,
          thoughtText: sanitizeBriefText(privateThought.thoughtText, 180),
          afterglowFromScenario: privateThought.afterglowFromScenario ?? null,
          selectedConcernId: privateThought.selectedConcernId ?? null,
          focusBeliefId: privateThought.focusBeliefId ?? null,
          focusInquiryId: privateThought.focusInquiryId ?? null,
          commitmentId: privateThought.commitmentId ?? null,
          inquiryPlanId: privateThought.inquiryPlanId ?? null,
          hypothesisId: privateThought.hypothesisId ?? null,
          deliberationThreadId: privateThought.deliberationThreadId ?? null,
          runtimeThreadId: privateThought.runtimeThreadId ?? null,
          mindNeed: privateThought.mindNeed ?? null,
          relationshipVector: privateThought.relationshipVector ?? null,
          initiativeAction: privateThought.initiativeAction ?? null,
          leadingGoalId: privateThought.leadingGoalId ?? null,
          desireId: privateThought.desireId ?? null,
        })
      : 'none'}.`,
    'Treat this block as a compact executive digest of the living mind state, not as a giant schema dump.',
    'Mind turn frame is the authoritative reply spine. Supporting blocks exist to justify, refine, or verify that frame.',
    'When grounded screenshot evidence is attached, trust that screenshot first and let this visual presence block act as continuity rather than override.',
  ].join('\n')
}

export function buildCompactMindTurnControlSystemBlock(input: {
  brief: AlicizationExecutiveAnswerBrief
  charter: AlicizationResponseCharter
  contract: AlicizationResponseSurfaceContract
  governance?: AlicizationMindTurnGovernance | null
  state: AlicizationVisualPresenceStateSnapshot
  inspectionRequested: boolean
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
  }
}) {
  return buildDialogueMindFrameSystemBlock({
    governance: input.governance ?? {
      decisionTraceId: 'mind:fallback:controlframe',
      turnMode: input.brief.turnMode,
      truthState: input.brief.truthState,
      personaKernelMode: input.contract.personaKernelMode,
      openingStyle: input.contract.openingStyle,
      relationshipPosture: input.charter.relationshipPosture,
      answerSubject: input.state.dialogueActKernel?.subject ?? 'general',
      screenReferenceMode: input.state.dialogueActKernel?.screenReferenceMode ?? 'incidental',
      answerAct: input.state.dialogueActKernel?.speechAct ?? 'answer',
      repairState: 'none',
      liveSurface: sanitizeBriefText(
        input.state.currentScene?.summary
        ?? input.brief.liveSurface
        ?? describePerceptionTarget(input.currentForeground),
        180,
      ) || null,
      focusAnchor: sanitizeBriefText(
        input.state.dialogueWorldThread?.currentQuestion
        ?? input.state.conversationState?.hostMove
        ?? input.state.currentScene?.summary
        ?? '',
        180,
      ) || null,
      answerIntent: sanitizeBriefText(
        input.state.dialogueWorldThread?.currentQuestion
        ?? input.state.conversationState?.jointThread
        ?? '',
        180,
      ) || null,
      openingMove: sanitizeBriefText(
        input.state.dialogueActKernel?.openingMove
        ?? '',
        180,
      ) || null,
      carriedThread: input.contract.labelCarryAsMemory
        ? sanitizeBriefText(
          input.brief.carriedThread
          ?? '',
          180,
        ) || null
        : null,
      suppressAssociativeRecall: input.contract.suppressAssociativeRecall,
      labelCarryAsMemory: input.contract.labelCarryAsMemory,
      shouldAskForGrounding: false,
      shouldAcknowledgeRepair: false,
      maxSentences: input.contract.maxSentences,
      mindMode: input.state.mindKernel?.dominantMode ?? null,
      embodiedPresence: input.state.privateThought?.embodiedPresence ?? 'none',
      emotionalTension: input.state.privateThought?.emotionalTension,
      dialogueActKernel: input.state.dialogueActKernel ?? null,
      mindTurnFrame: input.state.mindTurnFrame ?? null,
      mustDo: [],
      mustNotDo: [],
    },
    inspectionRequested: input.inspectionRequested,
    currentForeground: input.currentForeground,
  })
}

export function buildChatInspectionGroundingParts(input: {
  imageDataUrl: string
  candidateSourceName: string
  focusTarget?: {
    appName?: string
    processName?: string
    title?: string
    source?: string
  } | null
  perceptionState: AlicizationPerceptionState
  currentForeground?: {
    appName?: string
    processName?: string
    title?: string
  }
  userText: string
  now: number
  staleHistoryRisk?: boolean
}): CommonContentPart[] {
  const rawAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
  const anchor = input.staleHistoryRisk && isWeakGenericBrowserPerceptionTarget(rawAnchor)
    ? null
    : rawAnchor
  const recentObservations = input.perceptionState.recentObservations
    .filter(observation => !input.staleHistoryRisk || !isWeakGenericBrowserPerceptionTarget(observation))
    .slice(-2)
    .map(observation => `${formatObservationAge(input.now, observation.observedAt)} | ${describePerceptionTarget(observation)}`)

  return [
    {
      type: 'text',
      text: [
        '[ALICIZATION_VISUAL_GROUNDING]',
        `User request: ${sanitizeBriefText(input.userText, 180) || 'unknown'}`,
        `Capture source: ${sanitizeBriefText(input.candidateSourceName, 120) || 'unknown'}`,
        `Focus target: ${describePerceptionTarget(input.focusTarget)}`,
        `Focus source: ${sanitizeBriefText(input.focusTarget?.source ?? '', 48) || 'none'}`,
        input.staleHistoryRisk
          ? 'Attention anchor: suppressed weak generic browser metadata.'
          : `Attention anchor: ${describePerceptionTarget(anchor)}`,
        `Foreground sample: ${describePerceptionTarget(input.currentForeground)}`,
        `Recent observations: ${recentObservations.length > 0 ? recentObservations.join(' || ') : 'none'}`,
        'Use this screenshot as the primary visual evidence for the current turn.',
        input.staleHistoryRisk
          ? 'This is a generic screen re-check. Treat previous screen descriptions as stale memory; do not repeat old browser pages or old site details unless visible in this screenshot now. A weak browser/app anchor is only metadata, not proof that an old tab, URL, or page is still present. If the screenshot contradicts earlier memory, gently correct yourself and reset to what is visible now.'
          : '',
      ].join('\n'),
    },
    {
      type: 'image_url',
      image_url: {
        url: input.imageDataUrl,
      },
    } as CommonContentPart,
  ]
}
