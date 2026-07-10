import type { CommonContentPart } from '@xsai/shared-chat'

import type {
  AlicizationMindTurnGovernance,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

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

function sanitizeProviderBriefText(raw: unknown, maxChars: number) {
  return sanitizeAlicizationProviderFacingText(sanitizeBriefText(raw, maxChars), maxChars)
}

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
    'perception_scope=short_lived_desktop',
    'claim_authority=not_user_authored',
    `inspection_mode=${input.inspectionRequested ? 'invited-by-user' : 'passive-memory'}`,
    ...buildPerceptionContinuityLines({
      now: input.now,
      state: input.state,
      suppressWeakGenericBrowserAnchor: input.suppressWeakGenericBrowserAnchor,
    }),
    `current_foreground_sample=${describePerceptionTarget(input.currentForeground)}`,
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
      `current_visible_surface=${describePerceptionTarget(input.currentForeground)}`,
      `carried_task_continuity_target=${describePerceptionTarget(carryResidue.focusTarget)}`,
      'carried_task_continuity_current_surface=false',
    )
  }

  if (input.state.invitedInspection) {
    lines.push(
      `invited_inspection_hint=${sanitizeBriefText(input.state.invitedInspection.hintText, 160)}`,
    )
  }

  lines.push(
    'self_surface_inspection_policy=prefer_attention_anchor_or_recent_observation_for_code_diff_terminal_screen_asks',
    'visual_evidence_boundary=separate_attached_image_evidence_from_short_term_perception_inference',
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
    'invited_workspace_observation=true',
    ...buildPerceptionContinuityLines({
      now: input.now,
      state: input.state,
      suppressWeakGenericBrowserAnchor: input.suppressWeakGenericBrowserAnchor,
    }),
    `grounding_mode=${input.mode}`,
    'visible_reply_source=provider_authored',
  ]

  if (input.mode === 'grounded-screenshot') {
    lines.push(
      'reply_order=direct_observation,likely_inference,uncertainty_or_next_verification',
      'evidence_priority=current_screenshot_over_short_lived_perception_memory',
      'stale_perception_policy=correct_before_continuing',
      'previous_screen_descriptions=stale_by_default',
      'grounded_screenshot_attached=true',
    )
  }
  else {
    const permissionDenied = input.unavailableReason === 'screen-capture-permission-denied'
    const degradedReasons = (input.captureDegradedReasons ?? []).filter(Boolean)
    lines.push(
      permissionDenied
        ? `screen_capture_grounding=unavailable${input.permissionStatus ? `; permission_status=${input.permissionStatus}` : ''}`
        : 'grounded_screenshot_attached=false',
      'short_lived_perception_continuity=available',
      'evidence_policy=use_attention_anchor_or_recent_observation_when_present',
      'uncertainty_policy=label_no_grounded_screenshot',
      'blindness_claim_policy=only_when_no_usable_perception_evidence',
    )
    if (input.captureHealth && input.captureHealth !== 'healthy') {
      lines.push(
        `capture_path_health=${input.captureHealth}${degradedReasons.length > 0 ? `; degraded_reasons=${degradedReasons.join('|')}` : ''}`,
        'window_titles_and_foreground_samples=partial_evidence_not_fresh_screenshot_proof',
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
          summary: sanitizeProviderBriefText(state.currentScene.summary, 220),
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
      ? sanitizeProviderBriefText([
          state.worldModel.activeThread.kind,
          state.worldModel.activeThread.title,
          state.worldModel.activeThread.summary,
          state.worldModel.activeThread.unresolved ? 'unresolved' : 'settled',
        ].filter(Boolean).join(' | '), 220)
      : 'none'}.`,
    `Concern: ${currentConcern
      ? sanitizeProviderBriefText(`${currentConcern.kind} | ${currentConcern.summary}`, 220)
      : 'none'}.`,
    `Commitment: ${currentCommitment
      ? sanitizeProviderBriefText(`${currentCommitment.kind} | ${currentCommitment.summary}`, 220)
      : 'none'}.`,
    `Inquiry: ${currentInquiry
      ? sanitizeProviderBriefText(`${currentInquiry.kind} | ${currentInquiry.question} | ${currentInquiry.status}`, 220)
      : 'none'}.`,
    `Conversation state: ${state.conversationState
      ? JSON.stringify({
          jointThread: sanitizeProviderBriefText(state.conversationState.jointThread, 160),
          hostMove: sanitizeProviderBriefText(state.conversationState.hostMove, 160),
          continuityPolicy: state.conversationState.continuityPolicy,
          memoryMode: state.conversationState.memoryMode,
          shouldHoldThread: state.conversationState.shouldHoldThread,
          unansweredQuestion: sanitizeProviderBriefText(state.conversationState.unansweredQuestion ?? '', 140) || null,
        })
      : 'none'}.`,
    `Dialogue world thread: ${state.dialogueWorldThread
      ? JSON.stringify({
          activeThread: sanitizeProviderBriefText(state.dialogueWorldThread.activeThread, 160),
          currentQuestion: sanitizeProviderBriefText(state.dialogueWorldThread.currentQuestion ?? '', 140) || null,
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
          openingBeat: sanitizeProviderBriefText(state.replyDeliberation.openingBeat, 160),
          whyThisReplyNow: sanitizeProviderBriefText(state.replyDeliberation.whyThisReplyNow, 160),
        })
      : 'none'}.`,
    `Recall governor: ${state.recallGovernor
      ? JSON.stringify({
          mode: state.recallGovernor.mode,
          suppressAssociativeRecall: state.recallGovernor.suppressAssociativeRecall,
          allowActiveThoughts: state.recallGovernor.allowActiveThoughts,
          allowRecalledFragments: state.recallGovernor.allowRecalledFragments,
          rationale: sanitizeProviderBriefText(state.recallGovernor.rationale, 160),
        })
      : 'none'}.`,
    `Mind kernel: ${state.mindKernel
      ? JSON.stringify({
          dominantMode: state.mindKernel.dominantMode,
          dominantDrive: state.mindKernel.dominantDrive,
          narrative: asArray(state.mindKernel.narrative).map(item => sanitizeProviderBriefText(item, 180)).filter(Boolean),
        })
      : 'none'}.`,
    `Action ecology: ${state.actionEcology
      ? JSON.stringify({
          mode: state.actionEcology.mode,
          shouldSpeak: state.actionEcology.shouldSpeak,
          why: sanitizeProviderBriefText(state.actionEcology.why, 180),
          selectedThreadId: state.actionEcology.selectedThreadId,
        })
      : 'none'}.`,
    `Initiative: ${state.initiative
      ? JSON.stringify({
          selectedAction: state.initiative.selectedAction,
          confidence: state.initiative.confidence,
          why: sanitizeProviderBriefText(state.initiative.why, 180),
          preferredStyle: state.initiative.preferredStyle,
          preferredPresence: state.initiative.preferredPresence,
        })
      : 'none'}.`,
    `Answer plan: ${state.answerPlanner
      ? JSON.stringify({
          act: state.answerPlanner.act,
          evidenceMode: state.answerPlanner.evidenceMode,
          governingFocus: sanitizeProviderBriefText(state.answerPlanner.governingFocus, 180),
          openingMove: sanitizeProviderBriefText(state.answerPlanner.openingMove, 180),
          answerIntent: sanitizeProviderBriefText(state.answerPlanner.answerIntent, 180),
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
          consciousNeed: sanitizeProviderBriefText(state.currentConsciousFrame.consciousNeed, 160),
          consciousTension: sanitizeProviderBriefText(state.currentConsciousFrame.consciousTension, 160),
          speakingIntention: sanitizeProviderBriefText(state.currentConsciousFrame.speakingIntention, 160),
          focusAnchor: sanitizeProviderBriefText(state.currentConsciousFrame.focusAnchor ?? '', 140) || null,
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
          thoughtText: sanitizeProviderBriefText(privateThought.thoughtText, 180),
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
    'mind_digest_mode=compact_executive',
    'mind_turn_frame_authority=authoritative_reply_spine',
    'supporting_blocks_role=justify_refine_verify_frame',
    'grounded_screenshot_priority=current_screenshot_first',
    'visual_presence_role=continuity_context',
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
        'primary_visual_evidence=current_screenshot',
        input.staleHistoryRisk
          ? [
              'screen_recheck=generic',
              'previous_screen_descriptions=stale_by_default',
              'old_browser_page_reuse=blocked_unless_visible_now',
              'weak_browser_anchor=metadata_only',
              'old_tab_url_page_proof=false',
              'screenshot_memory_conflict_policy=reset_to_visible_now',
            ].join('\n')
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
