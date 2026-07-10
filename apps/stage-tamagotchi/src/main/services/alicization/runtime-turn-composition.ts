import type { AlicizationExecutionRoutingIntent } from '@proj-alicization/stage-shared'

import type { AlicizationRecallGovernorSnapshot } from '../../../shared/eventa'
import type { AlicizationAgentSessionContinuityInput } from './agent-runtime'
import type { AlicizationDialogueSessionMirror } from './dialogue-session-manager'
import type { AlicizationMemoryRetrievalBudgetClass } from './memory-retrieval-telemetry'

import {

  alicizationFixedTemplateReplacement,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

import {
  deriveCompactProjectStateNextFocusSummary,
  deriveCompactProjectStateOpenFocusSummary,
} from './project-state-focus'

function pushUniqueRule(target: string[], value: string) {
  const normalized = value.trim()
  if (!normalized || target.includes(normalized))
    return
  target.push(normalized)
}

export function mergeUniqueRules(values: Array<string | null | undefined>, maxItems = 16) {
  const merged: string[] = []
  for (const value of values) {
    if (typeof value !== 'string')
      continue
    pushUniqueRule(merged, value)
    if (merged.length >= maxItems)
      break
  }
  return merged
}

export function sanitizeGuidanceText(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  const sanitized = sanitizeAlicizationProviderFacingText(normalized, maxChars)
  return sanitized === alicizationFixedTemplateReplacement ? '' : sanitized
}

function sanitizeProjectStateSeedField(raw: unknown, maxChars = 220) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars).trim()
  if (!normalized)
    return ''
  if (
    /\bSame Phase 1 digital life\b/iu.test(normalized)
    || /^Before (?:answering|speaking|acting),\s*(?:remember|keep|stay on)\b/iu.test(normalized)
    || /\bWhat has already landed is\b/iu.test(normalized)
    || /\bThe still-open closure is\b/iu.test(normalized)
    || /\bThis reply should keep moving toward\b/iu.test(normalized)
    || /^same digital life\s*\|\s*keep(?: the)?(?: desktop)? closure(?: seam| line)? explicit\b/iu.test(normalized)
  ) {
    return ''
  }
  return normalized
}

export function mergeGuidanceLine(values: Array<string | null | undefined>, maxChars = 320) {
  const merged = mergeUniqueRules(values, values.length)
  return sanitizeGuidanceText(merged.join(' '), maxChars) || null
}

function resolvePreferredProjectOpenFocusSummary(input: {
  current?: string | null
  projectPrimaryOpenLoop?: string | null
  projectStateEmotionalClosureCue?: string | null
  projectStatePreflightSummary?: string | null
}) {
  const current = sanitizeGuidanceText(input.current ?? '', 220)
  if (current)
    return current

  const normalizedOpenLoop = sanitizeGuidanceText(input.projectPrimaryOpenLoop ?? '', 220)
  if (normalizedOpenLoop) {
    const fromOpenLoop = sanitizeGuidanceText(
      deriveCompactProjectStateOpenFocusSummary(normalizedOpenLoop, {
        emotionalClosureCue: input.projectStateEmotionalClosureCue ?? '',
      }) ?? '',
      220,
    )
    if (fromOpenLoop)
      return fromOpenLoop
  }

  const fromPreflight = sanitizeGuidanceText(
    deriveCompactProjectStateOpenFocusSummary(input.projectStatePreflightSummary ?? '') ?? '',
    220,
  )
  if (fromPreflight)
    return fromPreflight

  return sanitizeGuidanceText(
    deriveCompactProjectStateOpenFocusSummary('', {
      emotionalClosureCue: input.projectStateEmotionalClosureCue ?? '',
    }) ?? '',
    220,
  )
}

function resolvePreferredProjectNextFocusSummary(input: {
  current?: string | null
  projectNextClosureTarget?: string | null
  projectStateEmotionalClosureCue?: string | null
  projectPhase?: string | null
  projectStatePreflightSummary?: string | null
}) {
  return sanitizeGuidanceText(
    input.current
    || deriveCompactProjectStateNextFocusSummary(
      [
        input.projectNextClosureTarget,
        input.projectPhase,
        input.projectStatePreflightSummary,
      ].filter(Boolean).join(' '),
      {
        emotionalClosureCue: input.projectStateEmotionalClosureCue ?? '',
      },
    )
    || '',
    220,
  )
}

export function sanitizeToolPhaseSegment(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, '-').slice(0, 80)
}

function normalizeToolName(raw: unknown) {
  return typeof raw === 'string'
    ? raw.trim()
    : ''
}

export function filterMainGatewayToolsForRoutingIntent<T extends { function?: { name?: unknown } }>(
  tools: T[] | undefined,
  intent: AlicizationExecutionRoutingIntent | null,
) {
  if (!Array.isArray(tools) || tools.length === 0 || !intent)
    return tools

  const requiredToolNames = new Set(intent.requiredToolNames
    .map(name => normalizeToolName(name))
    .filter(Boolean))
  if (requiredToolNames.size === 0)
    return tools

  const filtered = tools.filter(entry => requiredToolNames.has(normalizeToolName(entry?.function?.name)))
  return filtered.length > 0
    ? filtered
    : tools
}

export function buildSessionMirrorRecollectionAfterthoughtSeed(mirror: AlicizationDialogueSessionMirror | null) {
  if (!mirror)
    return ''
  if (!mirror.recollectionSummary || !mirror.recollectionSurfaceSummary)
    return ''
  if (!mirror.recollectionSurfaceSummary.includes('afterthought=ripe'))
    return ''
  return [
    'mirror_recollection_afterthought:',
    mirror.recollectionSummary,
    mirror.recollectionSurfaceSummary,
  ].filter(Boolean).join(' ')
}

export function buildSessionMirrorRuntimeContinuitySeed(mirror: AlicizationDialogueSessionMirror | null) {
  if (!mirror)
    return ''
  if (!mirror.runtimeChannelSummary && !mirror.runtimeTransitionSummary && !mirror.continuityArcSummary && !mirror.continuityProjectSummary)
    return ''

  return [
    'mirror_runtime_continuity:',
    mirror.continuityArcSummary ? mirror.continuityArcSummary : '',
    mirror.continuityProjectSummary ? mirror.continuityProjectSummary : '',
    mirror.runtimeChannelSummary ? mirror.runtimeChannelSummary : '',
    mirror.runtimeTransitionSummary ? mirror.runtimeTransitionSummary : '',
  ].filter(Boolean).join(' ')
}

export function buildSessionContinuityRecallSeed(signals: AlicizationAgentSessionContinuityInput[]) {
  const afterglowSignals = signals
    .filter((signal) => {
      const source = typeof signal.metadata?.source === 'string' ? signal.metadata.source : ''
      return signal.label.startsWith('afterglow:')
        || source === 'autobiographical-afterglow'
    })
    .slice(-2)
  const heldAutonomySignals = signals
    .filter((signal) => {
      const source = typeof signal.metadata?.source === 'string' ? signal.metadata.source : ''
      const hasDeferredSameThreadAnchor = Boolean(
        typeof signal.metadata?.sourceThreadId === 'string' && sanitizeGuidanceText(signal.metadata.sourceThreadId, 120),
      ) || Boolean(
        typeof signal.metadata?.sourceThoughtThreadId === 'string' && sanitizeGuidanceText(signal.metadata.sourceThoughtThreadId, 120),
      ) || Boolean(
        typeof signal.metadata?.sourceConcernId === 'string' && sanitizeGuidanceText(signal.metadata.sourceConcernId, 120),
      ) || Boolean(
        typeof signal.metadata?.deferReason === 'string' && sanitizeGuidanceText(signal.metadata.deferReason, 120),
      ) || Boolean(
        typeof signal.metadata?.whyNow === 'string' && sanitizeGuidanceText(signal.metadata.whyNow, 180),
      )
      return signal.label.includes(':held-autonomy')
        || source === 'proactive-held-autonomy'
        || (
          source === 'proactive-deferred'
          && hasDeferredSameThreadAnchor
        )
    })
    .slice(-2)
  const cadenceReconfirmationSignals = signals
    .filter((signal) => {
      const source = typeof signal.metadata?.source === 'string' ? signal.metadata.source : ''
      return signal.label.includes(':cadence-reconfirmation')
        || source === 'relationship-cadence-reconfirmation'
    })
    .slice(-2)
  const projectAwareSignals = signals
    .filter((signal) => {
      const metadata = signal.metadata ?? {}
      const projectStatePreDialogueAwarenessLine = sanitizeGuidanceText(
        typeof metadata.projectStatePreDialogueAwarenessLine === 'string'
          ? metadata.projectStatePreDialogueAwarenessLine
          : '',
        220,
      )
      const projectStatePreflightSummary = sanitizeProjectStateSeedField(
        typeof metadata.projectStatePreflightSummary === 'string' ? metadata.projectStatePreflightSummary : '',
        220,
      )
      const projectPhase = sanitizeProjectStateSeedField(
        typeof metadata.projectPhase === 'string' ? metadata.projectPhase : '',
        140,
      )
      const projectPrimaryOpenLoop = sanitizeProjectStateSeedField(
        typeof metadata.projectPrimaryOpenLoop === 'string'
          ? metadata.projectPrimaryOpenLoop
          : typeof metadata.projectMemoryClosureSummary === 'string'
            ? metadata.projectMemoryClosureSummary
            : '',
        220,
      )
      const projectLatestLandedProgress = sanitizeProjectStateSeedField(
        typeof metadata.projectLatestLandedProgress === 'string'
          ? metadata.projectLatestLandedProgress
          : typeof metadata.projectLatestProgress === 'string'
            ? metadata.projectLatestProgress
            : '',
        220,
      )
      const projectNextClosureTarget = sanitizeProjectStateSeedField(
        typeof metadata.projectNextClosureTarget === 'string' ? metadata.projectNextClosureTarget : '',
        220,
      )
      const projectStateEmotionalClosureCue = sanitizeGuidanceText(
        typeof metadata.projectStateEmotionalClosureCue === 'string' ? metadata.projectStateEmotionalClosureCue : '',
        220,
      )
      const projectStateOpenFocusSummary = resolvePreferredProjectOpenFocusSummary({
        current:
          typeof metadata.projectStateOpenFocusSummary === 'string'
            ? metadata.projectStateOpenFocusSummary
            : '',
        projectPrimaryOpenLoop,
        projectStateEmotionalClosureCue,
        projectStatePreflightSummary,
      })
      const projectStateNextFocusSummary = resolvePreferredProjectNextFocusSummary({
        current:
          typeof metadata.projectStateNextFocusSummary === 'string'
            ? metadata.projectStateNextFocusSummary
            : '',
        projectNextClosureTarget,
        projectStateEmotionalClosureCue,
        projectPhase: typeof metadata.projectPhase === 'string' ? metadata.projectPhase : '',
        projectStatePreflightSummary,
      })
      return Boolean(
        projectStatePreDialogueAwarenessLine
        || projectStatePreflightSummary
        || projectPhase
        || projectLatestLandedProgress
        || projectPrimaryOpenLoop
        || projectNextClosureTarget
        || projectStateOpenFocusSummary
        || projectStateNextFocusSummary
        || projectStateEmotionalClosureCue,
      )
    })
    .slice(-2)

  if (
    afterglowSignals.length === 0
    && heldAutonomySignals.length === 0
    && cadenceReconfirmationSignals.length === 0
    && projectAwareSignals.length === 0
  ) {
    return ''
  }

  const afterglowLines = afterglowSignals.map((signal) => {
    const metadata = signal.metadata ?? {}
    const threadAnchor = sanitizeGuidanceText(
      typeof metadata.threadAnchor === 'string' ? metadata.threadAnchor : '',
      120,
    )
    const afterglowTag = sanitizeGuidanceText(
      typeof metadata.afterglowTag === 'string' ? metadata.afterglowTag : '',
      64,
    )
    return [
      'continuity_afterglow:',
      `label=${sanitizeGuidanceText(signal.label, 120)}`,
      `summary=${sanitizeGuidanceText(signal.summary ?? '', 180)}`,
      threadAnchor ? `thread=${threadAnchor}` : '',
      afterglowTag ? `kind=${afterglowTag}` : '',
    ].filter(Boolean).join(' ')
  })

  const heldAutonomyLines = heldAutonomySignals.map((signal) => {
    const metadata = signal.metadata ?? {}
    const sourceThreadId = sanitizeGuidanceText(
      typeof metadata.sourceThreadId === 'string' ? metadata.sourceThreadId : '',
      120,
    )
    const executionIntentKind = sanitizeGuidanceText(
      typeof metadata.executionIntentKind === 'string' ? metadata.executionIntentKind : '',
      64,
    )
    const executionIntentSummary = sanitizeGuidanceText(
      typeof metadata.executionIntentSummary === 'string' ? metadata.executionIntentSummary : '',
      180,
    )
    const deferReason = sanitizeGuidanceText(
      typeof metadata.deferReason === 'string' ? metadata.deferReason : '',
      120,
    )
    const whyNow = sanitizeGuidanceText(
      typeof metadata.whyNow === 'string' ? metadata.whyNow : '',
      180,
    )
    const projectStatePreDialogueAwarenessLine = sanitizeGuidanceText(
      typeof metadata.projectStatePreDialogueAwarenessLine === 'string'
        ? metadata.projectStatePreDialogueAwarenessLine
        : '',
      220,
    )
    const projectStatePreflightSummary = sanitizeGuidanceText(
      typeof metadata.projectStatePreflightSummary === 'string' ? metadata.projectStatePreflightSummary : '',
      220,
    )
    const projectStateEmotionalClosureCue = sanitizeGuidanceText(
      typeof metadata.projectStateEmotionalClosureCue === 'string' ? metadata.projectStateEmotionalClosureCue : '',
      220,
    )
    const projectStateSameHerSelfLine = sanitizeGuidanceText(
      typeof metadata.projectStateSameHerSelfLine === 'string' ? metadata.projectStateSameHerSelfLine : '',
      220,
    )
    const projectLatestLandedProgress = sanitizeGuidanceText(
      typeof metadata.projectLatestLandedProgress === 'string'
        ? metadata.projectLatestLandedProgress
        : typeof metadata.projectLatestProgress === 'string'
          ? metadata.projectLatestProgress
          : '',
      220,
    )
    const projectPrimaryOpenLoop = sanitizeGuidanceText(
      typeof metadata.projectPrimaryOpenLoop === 'string'
        ? metadata.projectPrimaryOpenLoop
        : typeof metadata.projectMemoryClosureSummary === 'string'
          ? metadata.projectMemoryClosureSummary
          : '',
      220,
    )
    const relationshipLine = sanitizeGuidanceText(
      typeof metadata.relationshipLine === 'string' ? metadata.relationshipLine : '',
      180,
    )
    const projectNextClosureTarget = sanitizeGuidanceText(
      typeof metadata.projectNextClosureTarget === 'string' ? metadata.projectNextClosureTarget : '',
      220,
    )
    const projectStateOpenFocusSummary = resolvePreferredProjectOpenFocusSummary({
      current:
        typeof metadata.projectStateOpenFocusSummary === 'string'
          ? metadata.projectStateOpenFocusSummary
          : '',
      projectPrimaryOpenLoop,
      projectStateEmotionalClosureCue,
      projectStatePreflightSummary,
    })
    const projectStateNextFocusSummary = resolvePreferredProjectNextFocusSummary({
      current:
        typeof metadata.projectStateNextFocusSummary === 'string'
          ? metadata.projectStateNextFocusSummary
          : '',
      projectNextClosureTarget,
      projectStateEmotionalClosureCue,
      projectStatePreflightSummary,
    })
    const crossModalContinuityGoal = [
      projectNextClosureTarget,
      projectStateEmotionalClosureCue,
      projectStatePreDialogueAwarenessLine,
      projectStateSameHerSelfLine,
    ].find(candidate => /cross-modal|same-her proof|same living her|same digital life/u.test(candidate)
      && /visible reply|voice|facial state|face|motion|lipsync|resident presence|embodiment|closure/u.test(candidate))
    ?? ''
    const preferredHeldAutonomyGoal = crossModalContinuityGoal || executionIntentSummary

    return [
      'continuity_held_autonomy:',
      `label=${sanitizeGuidanceText(signal.label, 120)}`,
      `summary=${sanitizeGuidanceText(signal.summary ?? '', 180)}`,
      sourceThreadId ? `thread=${sourceThreadId}` : '',
      executionIntentKind ? `intent=${executionIntentKind}` : '',
      preferredHeldAutonomyGoal ? `goal=${preferredHeldAutonomyGoal}` : '',
      deferReason ? `defer=${deferReason}` : '',
      whyNow ? `why_now=${whyNow}` : '',
      relationshipLine ? `line=${relationshipLine}` : '',
      'short_term_owner=WorkingMemory',
      'long_term_recall_owner=LongTermMemoryRecall',
      'template_awareness=withheld_from_held_autonomy_seed',
      projectLatestLandedProgress ? `runtime_landed=${projectLatestLandedProgress}` : '',
      projectPrimaryOpenLoop ? `runtime_unresolved=${projectPrimaryOpenLoop}` : '',
      projectStateOpenFocusSummary ? `continuity_open_focus=${projectStateOpenFocusSummary}` : '',
      projectStateNextFocusSummary ? `continuity_next_focus=${projectStateNextFocusSummary}` : '',
      projectStateEmotionalClosureCue ? `emotional_continuity=${projectStateEmotionalClosureCue}` : '',
    ].filter(Boolean).join(' ')
  })

  const cadenceReconfirmationLines = cadenceReconfirmationSignals.map((signal) => {
    const metadata = signal.metadata ?? {}
    const sourceThreadId = sanitizeGuidanceText(
      typeof metadata.sourceThreadId === 'string' ? metadata.sourceThreadId : '',
      120,
    )
    const cadenceMode = sanitizeGuidanceText(
      typeof metadata.cadenceMode === 'string' ? metadata.cadenceMode : '',
      64,
    )
    const relationshipLine = sanitizeGuidanceText(
      typeof metadata.relationshipLine === 'string' ? metadata.relationshipLine : '',
      180,
    )
    const whyNow = sanitizeGuidanceText(
      typeof metadata.whyNow === 'string' ? metadata.whyNow : '',
      180,
    )
    const bodyMode = sanitizeGuidanceText(
      typeof metadata.bodyMode === 'string' ? metadata.bodyMode : '',
      80,
    )
    const preferredBlinkCadence = sanitizeGuidanceText(
      typeof metadata.preferredBlinkCadence === 'string' ? metadata.preferredBlinkCadence : '',
      80,
    )
    const preferredGazeMode = sanitizeGuidanceText(
      typeof metadata.preferredGazeMode === 'string' ? metadata.preferredGazeMode : '',
      80,
    )

    return [
      'continuity_cadence_reconfirmation:',
      `label=${sanitizeGuidanceText(signal.label, 120)}`,
      `summary=${sanitizeGuidanceText(signal.summary ?? '', 180)}`,
      sourceThreadId ? `thread=${sourceThreadId}` : '',
      cadenceMode ? `cadence=${cadenceMode}` : '',
      relationshipLine ? `line=${relationshipLine}` : '',
      bodyMode ? `body=${bodyMode}` : '',
      preferredBlinkCadence ? `blink=${preferredBlinkCadence}` : '',
      preferredGazeMode ? `gaze=${preferredGazeMode}` : '',
      whyNow ? `why_now=${whyNow}` : '',
    ].filter(Boolean).join(' ')
  })

  const projectAwareLines = projectAwareSignals.map((signal) => {
    const metadata = signal.metadata ?? {}
    const projectStatePreDialogueAwarenessLine = sanitizeGuidanceText(
      typeof metadata.projectStatePreDialogueAwarenessLine === 'string'
        ? metadata.projectStatePreDialogueAwarenessLine
        : '',
      220,
    )
    const projectStatePreflightSummary = sanitizeProjectStateSeedField(
      typeof metadata.projectStatePreflightSummary === 'string' ? metadata.projectStatePreflightSummary : '',
      220,
    )
    const projectPhase = sanitizeProjectStateSeedField(
      typeof metadata.projectPhase === 'string' ? metadata.projectPhase : '',
      140,
    )
    const projectPrimaryOpenLoop = sanitizeProjectStateSeedField(
      typeof metadata.projectPrimaryOpenLoop === 'string'
        ? metadata.projectPrimaryOpenLoop
        : typeof metadata.projectMemoryClosureSummary === 'string'
          ? metadata.projectMemoryClosureSummary
          : '',
      220,
    )
    const projectLatestLandedProgress = sanitizeProjectStateSeedField(
      typeof metadata.projectLatestLandedProgress === 'string'
        ? metadata.projectLatestLandedProgress
        : typeof metadata.projectLatestProgress === 'string'
          ? metadata.projectLatestProgress
          : '',
      220,
    )
    const projectNextClosureTarget = sanitizeProjectStateSeedField(
      typeof metadata.projectNextClosureTarget === 'string' ? metadata.projectNextClosureTarget : '',
      220,
    )
    const projectStateEmotionalClosureCue = sanitizeGuidanceText(
      typeof metadata.projectStateEmotionalClosureCue === 'string' ? metadata.projectStateEmotionalClosureCue : '',
      220,
    )
    const projectStateOpenFocusSummary = resolvePreferredProjectOpenFocusSummary({
      current:
        typeof metadata.projectStateOpenFocusSummary === 'string'
          ? metadata.projectStateOpenFocusSummary
          : '',
      projectPrimaryOpenLoop,
      projectStateEmotionalClosureCue,
      projectStatePreflightSummary,
    })
    const projectStateNextFocusSummary = resolvePreferredProjectNextFocusSummary({
      current:
        typeof metadata.projectStateNextFocusSummary === 'string'
          ? metadata.projectStateNextFocusSummary
          : '',
      projectNextClosureTarget,
      projectStateEmotionalClosureCue,
      projectPhase,
      projectStatePreflightSummary,
    })
    return [
      'continuity_runtime_memory:',
      `label=${sanitizeGuidanceText(signal.label, 120)}`,
      `summary=${sanitizeProjectStateSeedField(signal.summary ?? '', 220)}`,
      'short_term_owner=WorkingMemory',
      'long_term_recall_owner=LongTermMemoryRecall',
      'template_awareness=withheld_from_runtime_memory_seed',
      projectPhase ? `runtime_phase=${projectPhase}` : '',
      projectPhase ? `phase=${projectPhase}` : '',
      projectLatestLandedProgress ? `runtime_landed=${projectLatestLandedProgress}` : '',
      projectLatestLandedProgress ? `landed=${projectLatestLandedProgress}` : '',
      projectPrimaryOpenLoop ? `runtime_unresolved=${projectPrimaryOpenLoop}` : '',
      projectPrimaryOpenLoop ? `open=${projectPrimaryOpenLoop}` : '',
      projectStateOpenFocusSummary ? `continuity_open_focus=${projectStateOpenFocusSummary}` : '',
      projectStateNextFocusSummary ? `continuity_next_focus=${projectStateNextFocusSummary}` : '',
      projectNextClosureTarget ? `continuity_next=${projectNextClosureTarget}` : '',
      projectNextClosureTarget ? `next=${projectNextClosureTarget}` : '',
      projectStateEmotionalClosureCue ? `emotional_continuity=${projectStateEmotionalClosureCue}` : '',
    ].filter(Boolean).join(' ')
  })

  return [
    ...afterglowLines,
    ...heldAutonomyLines,
    ...cadenceReconfirmationLines,
    ...projectAwareLines,
  ].join('\n')
}

export function deriveOrganicMemoryBudgetClass(
  recallGovernor: AlicizationRecallGovernorSnapshot | null | undefined,
): AlicizationMemoryRetrievalBudgetClass {
  const temporalFocus = recallGovernor?.recollectionIntent?.temporalFocus
  return temporalFocus === 'cross-session'
    || temporalFocus === 'distant'
    || temporalFocus === 'experience-matched'
    ? 'deep-recall-reply'
    : 'realtime-reply'
}
