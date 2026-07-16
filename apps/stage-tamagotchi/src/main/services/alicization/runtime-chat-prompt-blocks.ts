import type { CommonContentPart } from '@xsai/shared-chat'

import type {
  AlicizationMindTurnGovernance,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationExecutiveAnswerBrief } from './executive-answer-brief'
import type { AlicizationResponseCharter } from './response-charter'
import type { AlicizationResponseSurfaceContract } from './response-surface-contract'

import { buildAlicizationProviderFactBlock } from '@proj-alicization/stage-shared'

import { getActiveAttentionAnchor, isSelfPerceptionTarget } from './attention-anchor'
import { buildDialogueMindFrameSystemBlock } from './dialogue-mind-frame'
import {
  buildPerceptionContinuityLines,
  describePerceptionTarget,
  formatObservationAge,
  getUsablePerceptionSceneResidue,
  isWeakGenericBrowserPerceptionTarget,
} from './runtime-perception-helpers'
import { sanitizeBriefText } from './runtime-realtime'

function parseFactLines(lines: string[]) {
  return Object.fromEntries(
    lines.flatMap((line) => {
      const separatorIndex = line.indexOf('=')
      if (separatorIndex <= 0)
        return []
      return [[
        line.slice(0, separatorIndex),
        line.slice(separatorIndex + 1),
      ]]
    }),
  )
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

  const continuityLines = buildPerceptionContinuityLines({
    now: input.now,
    state: input.state,
    suppressWeakGenericBrowserAnchor: input.suppressWeakGenericBrowserAnchor,
  })
  const continuity = parseFactLines(continuityLines)

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
    continuity.current_visible_surface = describePerceptionTarget(input.currentForeground)
    continuity.carried_task_continuity_target = describePerceptionTarget(carryResidue.focusTarget)
    continuity.carried_task_continuity_current_surface = 'false'
  }

  const invitedInspectionHint = input.state.invitedInspection
    ? sanitizeBriefText(input.state.invitedInspection.hintText, 160)
    : ''

  return buildAlicizationProviderFactBlock('alicization-perception', {
    scope: 'short-lived-desktop',
    claimAuthority: 'not-user-authored',
    inspectionMode: input.inspectionRequested ? 'invited-by-user' : 'passive-memory',
    continuity,
    currentForegroundSample: describePerceptionTarget(input.currentForeground),
    invitedInspectionHint: invitedInspectionHint || null,
  })
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
  const continuity = parseFactLines(buildPerceptionContinuityLines({
    now: input.now,
    state: input.state,
    suppressWeakGenericBrowserAnchor: input.suppressWeakGenericBrowserAnchor,
  }))
  const data: Record<string, unknown> = {
    invitedWorkspaceObservation: true,
    continuity,
    groundingMode: input.mode,
  }

  if (input.mode === 'grounded-screenshot') {
    data.previousScreenDescriptions = 'stale-by-default'
    data.groundedScreenshotAttached = true
  }
  else {
    const permissionDenied = input.unavailableReason === 'screen-capture-permission-denied'
    const degradedReasons = (input.captureDegradedReasons ?? []).filter(Boolean)
    data.screenCaptureGrounding = permissionDenied
      ? {
          status: 'unavailable',
          permissionStatus: input.permissionStatus ?? null,
        }
      : 'available'
    data.groundedScreenshotAttached = false
    data.shortLivedPerceptionContinuity = 'available'
    if (input.captureHealth && input.captureHealth !== 'healthy') {
      data.capturePathHealth = input.captureHealth
      data.degradedReasons = degradedReasons
      data.windowTitlesAndForegroundSamples = 'partial-evidence-not-fresh-screenshot-proof'
    }
  }

  if (input.permissionStatus)
    data.permissionStatus = input.permissionStatus
  if (input.unavailableReason)
    data.unavailableReason = input.unavailableReason
  if (input.captureDegradedReasons?.length)
    data.captureDegradedReasons = input.captureDegradedReasons

  return buildAlicizationProviderFactBlock('alicization-inspection', data)
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
