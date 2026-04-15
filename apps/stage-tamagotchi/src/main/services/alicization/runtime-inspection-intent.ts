import type {
  AlicizationSystemProbeSample,
  AlicizationVisualPresenceStateSnapshot,
} from '../../../shared/eventa'
import type { AlicizationPerceptionState } from './attention-anchor'
import type { AlicizationProactiveLayeredContext } from './proactive-layered-context'

import {
  deriveAlicizationInspectionSignalProfile,
  inferAlicizationInspectionIntent,
} from '@proj-alicization/stage-shared'

import {
  detectInvitedInspectionIntent,
  getActiveAttentionAnchor,
  getActivePerceptionSceneResidue,
  isSelfPerceptionTarget,
} from './attention-anchor'
import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'
import { buildDialogueIngressGovernor } from './dialogue-ingress-governor'
import { buildDialogueTurnOwnership } from './dialogue-turn-ownership'
import { buildDialogueTurnSemantics } from './dialogue-turn-semantics'
import { resolveInspectionGroundingGate } from './inspection-grounding-gate'
import { resolveInspectionTurnState } from './inspection-turn-state-machine'
import {
  inferForegroundContentFromWindow,
  inferForegroundWorkloadFromWindow,
  inferScenarioFromContext,
  isLateNightWindow,
} from './proactive-layered-context'
import { sanitizeBriefText } from './runtime-realtime'
import { clamp01 } from './runtime-soul'
import { buildWorldModel } from './world-model'

interface CreateAlicizationInspectionIntentRuntimeOptions {
  normalizeOrganicRecallText: (raw: string) => string
  readLatestAssistantMessageText: (messages: Array<{ role?: string, content?: unknown }>) => string
  readTransportContentAsText: (content: unknown) => string
}

export function createAlicizationInspectionIntentRuntime(options: CreateAlicizationInspectionIntentRuntimeOptions) {
  const {
    normalizeOrganicRecallText,
    readLatestAssistantMessageText,
    readTransportContentAsText,
  } = options

  function hasStableSharedAttention(input: {
    now: number
    perceptionState?: AlicizationPerceptionState | null
    visualPresenceState?: AlicizationVisualPresenceStateSnapshot | null
  }) {
    const activeAnchor = input.perceptionState
      ? getActiveAttentionAnchor(input.perceptionState, input.now)
      : null
    const recentResidue = input.perceptionState
      ? getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
      : null
    const recentAttention = input.visualPresenceState?.attention
      && (input.now - (input.visualPresenceState.attention.lastConfirmedAt ?? input.now)) <= 3 * 60_000

    return Boolean(
      activeAnchor
      || recentResidue
      || recentAttention
      || input.visualPresenceState?.watchMode === 'invited-inspection'
      || input.visualPresenceState?.watchMode === 'symbiotic-vision',
    )
  }

  function appendInspectionIntentTargetPhrases(target?: {
    appName?: string
    processName?: string
    title?: string
  } | null) {
    return [
      normalizeOrganicRecallText(target?.appName ?? ''),
      normalizeOrganicRecallText(target?.processName ?? ''),
      normalizeOrganicRecallText(target?.title ?? ''),
    ].filter(Boolean)
  }

  function buildInspectionIntentContextPhrases(input: {
    now: number
    perceptionState: AlicizationPerceptionState
    visualPresenceState: AlicizationVisualPresenceStateSnapshot
  }) {
    const activeAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
    const recentResidue = getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
    const inspectionCarryActive = Boolean(
      input.perceptionState.invitedInspection
      && input.perceptionState.invitedInspection.activeUntil > input.now,
    )
    const visualCarryActive = inspectionCarryActive
      || input.visualPresenceState.watchMode === 'symbiotic-vision'
      || input.visualPresenceState.watchMode === 'recovering'
    return [
      ...appendInspectionIntentTargetPhrases(activeAnchor),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.currentScene?.target) : []),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.attention?.target) : []),
      ...appendInspectionIntentTargetPhrases(recentResidue?.focusTarget),
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.currentScene?.summary ?? '') : '',
      normalizeOrganicRecallText(recentResidue?.summary ?? ''),
      normalizeOrganicRecallText(input.perceptionState.invitedInspection?.hintText ?? ''),
    ].filter(Boolean)
  }

  function buildConcreteInspectionFocusPhrases(input: {
    now: number
    perceptionState: AlicizationPerceptionState
    visualPresenceState: AlicizationVisualPresenceStateSnapshot
  }) {
    const activeAnchor = getActiveAttentionAnchor(input.perceptionState, input.now)
    const inspectionCarryActive = Boolean(
      input.perceptionState.invitedInspection
      && input.perceptionState.invitedInspection.activeUntil > input.now,
    )
    const visualCarryActive = inspectionCarryActive
      || input.visualPresenceState.watchMode === 'symbiotic-vision'
      || input.visualPresenceState.watchMode === 'recovering'
    return [
      ...appendInspectionIntentTargetPhrases(activeAnchor),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.currentScene?.target) : []),
      ...(visualCarryActive ? appendInspectionIntentTargetPhrases(input.visualPresenceState.attention?.target) : []),
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.currentScene?.summary ?? '') : '',
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.worldModel?.activeThread?.title ?? '') : '',
      visualCarryActive ? normalizeOrganicRecallText(input.visualPresenceState.worldModel?.activeThread?.summary ?? '') : '',
    ].filter(Boolean)
  }

  function buildDialogueIngressContext(input: {
    now: number
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
    perceptionState?: AlicizationPerceptionState | null
    visualPresenceState?: AlicizationVisualPresenceStateSnapshot | null
  }): {
    context: AlicizationProactiveLayeredContext
    currentScene: AlicizationVisualPresenceStateSnapshot['currentScene']
    worldModel: AlicizationVisualPresenceStateSnapshot['worldModel'] | null
  } {
    const date = new Date(input.now)
    const lateNight = isLateNightWindow(date)
    const liveScene = input.visualPresenceState?.currentScene ?? null
    const liveForeground = input.currentForeground
      ?? liveScene?.target
      ?? input.visualPresenceState?.attention?.target
      ?? undefined
    const activeAnchor = input.perceptionState
      ? getActiveAttentionAnchor(input.perceptionState, input.now, 10 * 60_000)
      : null
    const recentResidue = input.perceptionState
      ? getActivePerceptionSceneResidue(input.perceptionState, input.now, 10 * 60_000)
      : null
    const carryTarget = recentResidue?.focusTarget
      ?? activeAnchor
      ?? input.visualPresenceState?.attention?.target
      ?? input.visualPresenceState?.worldModel?.focusTarget
      ?? undefined
    const preferCarryTarget = Boolean(
      liveForeground
      && isSelfPerceptionTarget(liveForeground)
      && carryTarget
      && !isSelfPerceptionTarget(carryTarget),
    )
    const effectiveTarget = preferCarryTarget ? carryTarget : liveForeground
    const workloadKind = preferCarryTarget
      ? recentResidue?.workloadKind
      ?? activeAnchor?.workloadKind
      ?? inferForegroundWorkloadFromWindow(effectiveTarget)
      : liveScene?.workloadKind
        ?? inferForegroundWorkloadFromWindow(effectiveTarget)
    const contentKind = preferCarryTarget
      ? recentResidue?.contentKind
      ?? inferForegroundContentFromWindow(effectiveTarget)
      : liveScene?.contentKind
        ?? recentResidue?.contentKind
        ?? inferForegroundContentFromWindow(effectiveTarget)
    const sceneSummary = (
      preferCarryTarget
        ? recentResidue?.summary
        : liveScene?.summary ?? recentResidue?.summary
    ) || sanitizeBriefText(effectiveTarget?.title ?? '', 160) || undefined
    const sceneSource: 'foreground-window-heuristic' | 'screen-semantic-summary' = preferCarryTarget && recentResidue?.source === 'screen-semantic-summary'
      ? 'screen-semantic-summary'
      : liveScene?.source === 'screen-semantic-summary'
        ? 'screen-semantic-summary'
        : 'foreground-window-heuristic'
    const foregroundWindow = effectiveTarget
      ? {
          appName: effectiveTarget.appName,
          processName: effectiveTarget.processName,
          title: effectiveTarget.title,
          pid: Number.isFinite(Number((effectiveTarget as { pid?: unknown }).pid))
            ? Math.max(1, Math.floor(Number((effectiveTarget as { pid?: unknown }).pid)))
            : null,
        }
      : undefined
    const currentScene = foregroundWindow
      ? {
          workloadKind,
          contentKind,
          scenario: inferScenarioFromContext({
            workload: workloadKind,
            content: contentKind,
            lateNight,
            lateNightActiveMinutes: lateNight ? 1 : 0,
            fatigue: input.visualPresenceState?.privateThought?.emotionalTension === 'late-night-drain' ? 60 : 0,
          }),
          summary: sceneSummary,
          source: sceneSource,
          confidence: preferCarryTarget
            ? Math.max(recentResidue?.confidence ?? activeAnchor?.confidence ?? 0.42, 0.42)
            : liveScene?.confidence ?? (foregroundWindow ? 0.36 : 0),
          target: foregroundWindow,
          beganAt: preferCarryTarget
            ? recentResidue?.observedAt ?? activeAnchor?.anchoredAt ?? input.now
            : liveScene?.beganAt ?? input.now,
          lastSeenAt: preferCarryTarget
            ? recentResidue?.observedAt ?? activeAnchor?.lastObservedAt ?? input.now
            : liveScene?.lastSeenAt ?? input.now,
        }
      : liveScene
    const context = {
      localTime: {
        hour: date.getHours(),
        minute: date.getMinutes(),
        isLateNight: lateNight,
      },
      system: {
        cpuUsage: 0,
        battery: { percent: null, charging: null },
        memory: { usagePercent: 0, freeMB: 0, totalMB: 0 },
        idleSeconds: null,
        inputActivity: 'unknown',
        fullscreenLikely: false,
        foregroundWindow,
        degradedSignals: [],
      },
      workload: {
        kind: workloadKind,
        confidence: currentScene?.workloadKind ? currentScene.confidence : 0.24,
        source: sceneSource,
        matchedLabels: [],
      },
      content: {
        kind: contentKind,
        confidence: currentScene?.contentKind ? currentScene.confidence : 0.18,
        source: sceneSource,
        matchedLabels: [],
        summary: currentScene?.summary,
      },
      relationship: {
        hostAttitude: '',
        boredom: 0,
        loneliness: 0,
        fatigue: input.visualPresenceState?.privateThought?.emotionalTension === 'late-night-drain' ? 60 : 0,
        minutesSinceLastUserTurn: 0,
        reminderBacklog: 0,
        lateNightActiveMinutes: lateNight ? 1 : 0,
        recentProactiveOutcomes: [],
      },
    } satisfies AlicizationProactiveLayeredContext
    const worldModel = currentScene
      ? buildWorldModel({
          now: input.now,
          context,
          watchMode: input.visualPresenceState?.watchMode ?? 'mnemonic-passive',
          scene: currentScene,
          attention: foregroundWindow
            ? {
                target: foregroundWindow,
                source: preferCarryTarget
                  ? recentResidue
                    ? 'recent-observation'
                    : activeAnchor
                      ? 'old-anchor'
                      : 'foreground-window'
                  : input.visualPresenceState?.attention?.source ?? 'foreground-window',
                confidence: currentScene.confidence,
                engagedAt: currentScene.beganAt,
                lastConfirmedAt: currentScene.lastSeenAt,
                dwellMs: Math.max(0, input.now - currentScene.beganAt),
                invalidationReason: null,
              }
            : input.visualPresenceState?.attention ?? null,
          recentTransition: input.visualPresenceState?.recentTransition ?? null,
          workingMemoryEpisodes: input.visualPresenceState?.workingMemoryEpisodes ?? [],
          previousModel: input.visualPresenceState?.worldModel ?? null,
        })
      : null

    return {
      context,
      currentScene,
      worldModel,
    }
  }

  function resolveInspectionIntentForChatTurn(input: {
    now: number
    userText: string
    messages: Array<{ role?: string, content?: unknown }>
    perceptionState: AlicizationPerceptionState
    visualPresenceState: AlicizationVisualPresenceStateSnapshot
    currentForeground?: AlicizationSystemProbeSample['foregroundWindow'] | null
  }) {
    const baseIntent = detectInvitedInspectionIntent(input.userText)
    const normalized = normalizeOrganicRecallText(input.userText).toLowerCase()
    const stableSharedAttention = hasStableSharedAttention({
      now: input.now,
      perceptionState: input.perceptionState,
      visualPresenceState: input.visualPresenceState,
    })
    const recentMessageWindow = input.messages.slice(-6)
    const recentUserInspection = recentMessageWindow.some((message, index) => {
      if (message?.role !== 'user')
        return false
      return inferAlicizationInspectionIntent({
        message: readTransportContentAsText(message.content),
        recentMessages: recentMessageWindow.slice(0, index),
        contextPhrases: buildInspectionIntentContextPhrases(input),
        sharedAttentionActive: stableSharedAttention,
      }).active
    })
    const inspectionContinuityActive = Boolean(
      recentUserInspection
      || (input.perceptionState.invitedInspection && input.perceptionState.invitedInspection.activeUntil > input.now)
      || input.perceptionState.recentSceneResidue?.source === 'invited-inspection',
    )
    const semanticIntent = inferAlicizationInspectionIntent({
      message: normalized,
      recentMessages: input.messages.slice(0, -1),
      contextPhrases: buildInspectionIntentContextPhrases(input),
      sharedAttentionActive: stableSharedAttention || inspectionContinuityActive,
    })
    const semanticIntentProfile = deriveAlicizationInspectionSignalProfile({
      reasonCodes: semanticIntent.reasonCodes,
      contextOverlap: semanticIntent.contextOverlap,
      confidence: semanticIntent.confidence,
    })
    const identityDialoguePivotSignal = Boolean(
      normalized
      && (
        /(?:这个人|那个人|这人|那人|说的就?是|没错|对啊?).{0,8}(?:就是你|是你)/u.test(normalized)
        || /(?:就是|正是)(?:你|妳)[啊呀呢嘛]?/u.test(normalized)
        || /\b(?:that(?:'s| is) you|it(?:'s| is) you|you(?:'re| are) the one|this person is you|that person is you)\b/i.test(normalized)
      ),
    )
    const semanticPremarkEligible = semanticIntentProfile.decisive
    const forceDialogueIdentityPivot = Boolean(
      inspectionContinuityActive
      && identityDialoguePivotSignal
      && !baseIntent.active
      && !semanticPremarkEligible,
    )
    const premarkInspectionOwnedTurn = !forceDialogueIdentityPivot
      && (baseIntent.active || (semanticIntent.active && semanticPremarkEligible))
    const ingressContext = buildDialogueIngressContext({
      now: input.now,
      currentForeground: input.currentForeground,
      perceptionState: input.perceptionState,
      visualPresenceState: input.visualPresenceState,
    })
    const ingressSemantics = buildDialogueTurnSemantics({
      userText: input.userText,
      previousAssistantText: readLatestAssistantMessageText(input.messages),
      context: ingressContext.context,
      currentScene: ingressContext.currentScene,
      worldModel: ingressContext.worldModel,
      subjectiveInference: input.visualPresenceState.subjectiveInference ?? null,
      relationshipModel: input.visualPresenceState.relationshipModel ?? null,
      privateThought: input.visualPresenceState.privateThought ?? null,
      // NOTICE: Inspection continuity should influence ingress governance, but it
      // must not pre-mark the turn itself as inspection-owned. Otherwise a plain
      // dialogue pivot can be coerced into task-knot before the governor gets a
      // chance to release the carry.
      inspectionRequested: premarkInspectionOwnedTurn,
    })
    const ingressGovernor = buildDialogueIngressGovernor({
      semantics: ingressSemantics,
      baseInspectionIntentActive: baseIntent.active,
      semanticInspectionIntentActive: semanticIntent.active,
      semanticInspectionIntentConfidence: semanticIntent.confidence,
      semanticInspectionReasonCodes: semanticIntent.reasonCodes,
      inspectionContinuityActive,
      sharedAttentionActive: stableSharedAttention,
    })
    const explicitInspectionIntent = baseIntent.active || semanticIntent.active
    const ownershipHint = {
      subject: ingressGovernor.turnOwner,
      screenReferenceMode: ingressGovernor.screenReferenceMode,
      confidence: ingressGovernor.confidence,
      reasonTags: ingressGovernor.reasonTags,
    }
    const ingressDialogueFirstSignal = Boolean(
      ingressSemantics.subjectPreference === 'alicization-self'
      || ingressSemantics.subjectPreference === 'relationship'
      || ingressSemantics.subjectPreference === 'host-state'
      || ingressSemantics.reasonTags.includes('dialogue-first-turn')
      || ingressSemantics.reasonTags.includes('scene-detached-turn'),
    )
    const ingressSceneBoundSignal = Boolean(
      ingressSemantics.subjectPreference === 'task-knot'
      || ingressSemantics.subjectPreference === 'visible-scene'
      || ingressSemantics.reasonTags.includes('scene-bound-turn')
      || ingressSemantics.reasonTags.includes('inspection-owned-turn'),
    )
    const resolveInspectionReleaseCause = (input: {
      stateDecision: ReturnType<typeof resolveInspectionTurnState>
      gateDecision: ReturnType<typeof resolveInspectionGroundingGate>
      reasonCodes: string[]
    }) => {
      if (!input.gateDecision.releaseCarry)
        return null

      const reasons = new Set([
        ...input.reasonCodes,
        ...input.stateDecision.reasonTags,
        ...input.gateDecision.reasonTags,
      ])
      if (reasons.has('identity-dialogue-pivot'))
        return 'identity-dialogue-pivot'
      if (
        reasons.has('dialogue-pivot-away-from-inspection')
        || reasons.has('dialogue-pivot-away')
        || reasons.has('grounding-gate:dialogue-first-ingress')
      ) {
        return 'dialogue-pivot-away-from-inspection'
      }
      if (reasons.has('grounding-gate:ingress-ineligible'))
        return 'ingress-ineligible'
      if (reasons.has('grounding-gate:already-dialogue-first'))
        return 'already-dialogue-first'
      if (reasons.has('release-inspection-carry'))
        return 'release-inspection-carry'
      return 'inspection-carry-released'
    }
    const buildInspectionOwnershipTransition = (input: {
      stateDecision: ReturnType<typeof resolveInspectionTurnState>
      gateDecision: ReturnType<typeof resolveInspectionGroundingGate>
      reasonCodes: string[]
    }) => {
      const ownershipBefore = buildDialogueTurnOwnership({
        semantics: ingressSemantics,
        worldModel: ingressContext.worldModel,
        inspectionRequested: input.stateDecision.inspectionRequested,
        inspectionState: input.stateDecision.state,
        releaseInspectionCarry: input.stateDecision.releaseCarry,
        ingressHint: ownershipHint,
      })
      const ownershipAfter = buildDialogueTurnOwnership({
        semantics: ingressSemantics,
        worldModel: ingressContext.worldModel,
        inspectionRequested: input.gateDecision.inspectionRequested,
        inspectionState: input.gateDecision.inspectionState,
        releaseInspectionCarry: input.gateDecision.releaseCarry,
        ingressHint: ownershipHint,
      })
      return {
        ownerBefore: ownershipBefore.subject,
        ownerAfter: ownershipAfter.subject,
        screenModeBefore: ownershipBefore.screenReferenceMode,
        screenModeAfter: ownershipAfter.screenReferenceMode,
        inspectionStateBefore: ownershipBefore.inspectionState,
        inspectionStateAfter: ownershipAfter.inspectionState,
        releaseCause: resolveInspectionReleaseCause({
          stateDecision: input.stateDecision,
          gateDecision: input.gateDecision,
          reasonCodes: input.reasonCodes,
        }),
      }
    }
    if (forceDialogueIdentityPivot) {
      const stateDecision = resolveInspectionTurnState({
        candidateInspectionActive: false,
        explicitInspectionIntent,
        continuityActive: inspectionContinuityActive,
        anchoredSceneContinuation: false,
        sharedAttentionContinuation: false,
        repairSignal: false,
        dialoguePivot: true,
        identityPivot: true,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
      })
      const gateDecision = resolveInspectionGroundingGate({
        inspectionRequested: stateDecision.inspectionRequested,
        inspectionState: stateDecision.state,
        releaseCarry: stateDecision.releaseCarry,
        explicitInspectionIntent,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
        ingressOwner: ingressGovernor.turnOwner,
        ingressDialogueFirstSignal,
        ingressSceneBoundSignal,
      })
      const reasonCodes = [
        'identity-dialogue-pivot',
        'dialogue-pivot-away-from-inspection',
        ...stateDecision.reasonTags,
        ...gateDecision.reasonTags,
        ...ingressGovernor.reasonTags,
      ].filter(Boolean)
      return {
        active: gateDecision.inspectionRequested,
        confidence: Math.max(semanticIntent.confidence, ingressGovernor.confidence, stateDecision.confidence, gateDecision.confidence, 0.52),
        reasonCodes,
        releaseCarry: gateDecision.releaseCarry,
        inspectionState: gateDecision.inspectionState,
        groundingGate: gateDecision,
        turnOwnershipHint: ownershipHint,
        ingress: ingressGovernor,
        ownershipTransition: buildInspectionOwnershipTransition({
          stateDecision,
          gateDecision,
          reasonCodes,
        }),
      }
    }
    if (!ingressGovernor.inspectionEligible) {
      const stateDecision = resolveInspectionTurnState({
        candidateInspectionActive: false,
        explicitInspectionIntent,
        continuityActive: inspectionContinuityActive,
        anchoredSceneContinuation: false,
        sharedAttentionContinuation: false,
        repairSignal: false,
        dialoguePivot: ingressGovernor.releaseInspectionCarry,
        identityPivot: false,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
      })
      const gateDecision = resolveInspectionGroundingGate({
        inspectionRequested: stateDecision.inspectionRequested,
        inspectionState: stateDecision.state,
        releaseCarry: stateDecision.releaseCarry,
        explicitInspectionIntent,
        ingressInspectionEligible: ingressGovernor.inspectionEligible,
        ingressOwner: ingressGovernor.turnOwner,
        ingressDialogueFirstSignal,
        ingressSceneBoundSignal,
      })
      const reasonCodes = [
        'dialogue-ingress-governor',
        ...stateDecision.reasonTags,
        ...gateDecision.reasonTags,
        ...ingressGovernor.reasonTags,
        ingressGovernor.releaseInspectionCarry ? 'dialogue-pivot-away-from-inspection' : '',
      ].filter(Boolean)
      return {
        active: gateDecision.inspectionRequested,
        confidence: Math.max(semanticIntent.confidence, ingressGovernor.confidence, stateDecision.confidence, gateDecision.confidence),
        reasonCodes,
        releaseCarry: gateDecision.releaseCarry,
        inspectionState: gateDecision.inspectionState,
        groundingGate: gateDecision,
        turnOwnershipHint: ownershipHint,
        ingress: ingressGovernor,
        ownershipTransition: buildInspectionOwnershipTransition({
          stateDecision,
          gateDecision,
          reasonCodes,
        }),
      }
    }
    const focusAlignment = measureDialogueFocusAlignment({
      message: normalized,
      contextPhrases: buildConcreteInspectionFocusPhrases(input),
    })
    const hasDirectVisualCue = semanticIntentProfile.explicitSceneDirective
      || semanticIntent.reasonCodes.includes('visual-plane-cue')
    const hasContinuationRepairCue = semanticIntent.reasonCodes.includes('deictic-cue')
      || semanticIntent.reasonCodes.includes('scene-shift-cue')
      || semanticIntent.reasonCodes.includes('recheck-cue')
      || semanticIntent.reasonCodes.includes('continuation-cue')
    const repairSignal = /重新|再|现在|自己|别猜|不要猜|不对|看准|看清|贴近|只看|认真/.test(normalized)
    const shortRepairTurn = normalized.length > 0 && normalized.length <= 28
    const anchoredSceneContinuation = Boolean(
      hasDirectVisualCue
      || (hasContinuationRepairCue && semanticIntentProfile.focusAnchored)
      || focusAlignment.overlapRatio >= 0.32
      || semanticIntent.contextOverlap >= 0.45,
    )
    const dialoguePivotFromInspection = Boolean(
      forceDialogueIdentityPivot
      || (
        inspectionContinuityActive
        && !baseIntent.active
        && !anchoredSceneContinuation
        && !repairSignal
      ),
    )
    const sharedAttentionContinuation = Boolean(
      stableSharedAttention
      && inspectionContinuityActive
      && shortRepairTurn
      && semanticIntent.sharedAttentionLikely
      && anchoredSceneContinuation
      && (
        semanticIntent.contextOverlap >= 0.24
        || focusAlignment.overlapRatio >= 0.24
        || semanticIntent.reasonCodes.includes('deictic-cue')
        || semanticIntent.reasonCodes.includes('scene-shift-cue')
        || semanticIntent.reasonCodes.includes('recheck-cue')
        || semanticIntent.reasonCodes.includes('continuation-cue')
      ),
    )
    const detachedTurnFromScene = Boolean(
      dialoguePivotFromInspection
      || (
        !baseIntent.active
        && semanticIntent.reasonCodes.includes('question-cue')
        && !hasDirectVisualCue
        && !hasContinuationRepairCue
        && focusAlignment.overlapRatio < 0.18
      ),
    )
    const semanticBoost = (
      (inspectionContinuityActive ? 0.22 : 0)
      + (semanticIntentProfile.actionable && semanticIntent.reasonCodes.includes('observe-cue') ? 0.2 : 0)
      + (semanticIntentProfile.actionable && semanticIntent.reasonCodes.includes('describe-cue') ? 0.16 : 0)
      + (semanticIntentProfile.focusAnchored && semanticIntent.reasonCodes.includes('visual-plane-cue') ? 0.18 : 0)
      + (stableSharedAttention ? 0.12 : 0)
      + (semanticIntent.reasonCodes.includes('context-overlap') ? 0.18 : 0)
      + (semanticIntent.reasonCodes.includes('question-cue') ? 0.08 : 0)
      + (semanticIntent.reasonCodes.includes('deictic-cue') ? 0.14 : 0)
      + (semanticIntent.reasonCodes.includes('scene-shift-cue') ? 0.18 : 0)
      + (semanticIntent.reasonCodes.includes('recheck-cue') ? 0.18 : 0)
      + (sharedAttentionContinuation ? 0.34 : 0)
      + (repairSignal ? 0.18 : 0)
      + (inspectionContinuityActive && shortRepairTurn ? 0.12 : 0)
    )
    const confidence = clamp01(Math.max(baseIntent.confidence, semanticIntent.confidence, semanticBoost))
    const activeHeuristic = !detachedTurnFromScene && (
      baseIntent.active
      || semanticIntentProfile.decisive
      || confidence >= 0.64
      || sharedAttentionContinuation
    )
    const stateDecision = resolveInspectionTurnState({
      candidateInspectionActive: activeHeuristic,
      explicitInspectionIntent,
      continuityActive: inspectionContinuityActive,
      anchoredSceneContinuation,
      sharedAttentionContinuation,
      repairSignal,
      dialoguePivot: dialoguePivotFromInspection,
      identityPivot: forceDialogueIdentityPivot,
      ingressInspectionEligible: ingressGovernor.inspectionEligible,
    })
    const gateDecision = resolveInspectionGroundingGate({
      inspectionRequested: stateDecision.inspectionRequested,
      inspectionState: stateDecision.state,
      releaseCarry: stateDecision.releaseCarry,
      explicitInspectionIntent,
      ingressInspectionEligible: ingressGovernor.inspectionEligible,
      ingressOwner: ingressGovernor.turnOwner,
      ingressDialogueFirstSignal,
      ingressSceneBoundSignal,
    })
    const reasonCodes = [
      baseIntent.active ? 'base-inspection-intent' : '',
      inspectionContinuityActive ? 'inspection-continuity' : '',
      stableSharedAttention ? 'shared-attention-stable' : '',
      semanticIntent.reasonCodes.includes('observe-cue') ? 'observation-verb' : '',
      semanticIntent.reasonCodes.includes('describe-cue') ? 'description-cue' : '',
      semanticIntent.reasonCodes.includes('visual-plane-cue') ? 'current-scene-reference' : '',
      ((semanticIntent.reasonCodes.includes('entity-dense') || semanticIntent.reasonCodes.includes('referentially-rich'))
        && anchoredSceneContinuation)
        ? 'scene-object-reference'
        : '',
      semanticIntent.reasonCodes.includes('context-overlap') ? 'scene-context-overlap' : '',
      semanticIntent.reasonCodes.includes('question-cue') ? 'scene-question' : '',
      semanticIntent.reasonCodes.includes('deictic-cue') ? 'scene-deictic-reference' : '',
      semanticIntent.reasonCodes.includes('scene-shift-cue') ? 'scene-change-reference' : '',
      semanticIntent.reasonCodes.includes('recheck-cue') ? 'scene-recheck' : '',
      sharedAttentionContinuation ? 'shared-attention-continuation' : '',
      repairSignal ? 'inspection-repair' : '',
      shortRepairTurn ? 'short-follow-up' : '',
      forceDialogueIdentityPivot ? 'identity-dialogue-pivot' : '',
      dialoguePivotFromInspection ? 'dialogue-pivot-away-from-inspection' : '',
      detachedTurnFromScene ? 'scene-detached-question' : '',
      ...stateDecision.reasonTags,
      ...gateDecision.reasonTags,
    ].filter(Boolean)
    const ownershipTransition = buildInspectionOwnershipTransition({
      stateDecision,
      gateDecision,
      reasonCodes,
    })

    return {
      active: gateDecision.inspectionRequested,
      confidence: Math.max(confidence, stateDecision.confidence, gateDecision.confidence),
      reasonCodes,
      releaseCarry: gateDecision.releaseCarry,
      inspectionState: gateDecision.inspectionState,
      groundingGate: gateDecision,
      turnOwnershipHint: ownershipHint,
      ingress: ingressGovernor,
      ownershipTransition,
    }
  }

  return {
    buildDialogueIngressContext,
    resolveInspectionIntentForChatTurn,
  }
}
