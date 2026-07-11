import type {
  AlicizationChatMetaEvent,
  AlicizationChatStartResult,
} from '../../../shared/eventa'
import type {
  AlicizationPreparedMainChatExecutionResult,
  AlicizationPreparedMainChatPrelude,
} from './main-chat-session-runtime'

import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'

import {
  deriveAlicizationDigitalLifeSpineFromSurface,
  projectAlicizationDigitalLifeSpineDigest,
} from './digital-life-spine'
import { buildAlicizationChatMetaPayload } from './main-chat-stream-meta'

type AlicizationMainChatStartGovernance = AlicizationChatMetaEvent['governance']
type AlicizationMainChatStartRuntimeDigest = NonNullable<AlicizationChatStartResult['runtimeDigest']>
type AlicizationMainChatStartProjectState = NonNullable<AlicizationMainChatStartRuntimeDigest['projectState']>
type AlicizationMainChatStartCurrentConsciousFrame = NonNullable<AlicizationMainChatStartRuntimeDigest['currentConsciousFrame']>

interface ResolveAlicizationMainChatStartResultOptions {
  cardId: string
  turnId: string
  preludePromise: Promise<AlicizationPreparedMainChatPrelude>
  preparationPromise: Promise<AlicizationPreparedMainChatExecutionResult>
  eagerPreparationBudgetMs: number
  buildEmbodimentMeta: (input: {
    governance: AlicizationMainChatStartGovernance
    digitalLifeSpine: AlicizationChatStartResult['digitalLifeSpine']
    turnId: string
  }) => {
    embodiment: AlicizationChatStartResult['embodiment']
    embodimentScript: AlicizationChatStartResult['embodimentScript']
    speechTimeline: AlicizationChatStartResult['speechTimeline']
    digitalLife: AlicizationChatStartResult['digitalLife']
  }
  setTimeoutImpl?: typeof setTimeout
  clearTimeoutImpl?: typeof clearTimeout
}

type AlicizationMainChatStartRuntimeSurface
  = | AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface']
    | AlicizationPreparedMainChatPrelude['perceptionAugmentation']['digitalLifeRuntimeSurface']

function resolveMainChatStartRuntimeDigest(
  runtimeSurface: AlicizationMainChatStartRuntimeSurface | null | undefined,
): AlicizationChatStartResult['runtimeDigest'] {
  if (!runtimeSurface)
    return null

  return runtimeSurface.raw?.runtimeDigest
    ?? runtimeSurface.cognition?.runtimeDigest
    ?? null
}

function hasUsableMainChatStartRuntimeSurface(
  runtimeSurface: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'] | null | undefined,
) {
  return Boolean(
    runtimeSurface?.perception
    && runtimeSurface?.world
    && runtimeSurface?.cognition
    && runtimeSurface?.memory
    && runtimeSurface?.dialogue
    && runtimeSurface?.agency,
  )
}

function isThinPreparedStartSpine(
  digitalLifeSpine: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeSpine'] | null | undefined,
) {
  return Boolean(
    digitalLifeSpine?.runtimeSurface
    && !hasUsableMainChatStartRuntimeSurface(
      digitalLifeSpine.runtimeSurface as AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'],
    ),
  )
}

function resolveMainChatStartDigitalLifeSpineDigest(input: {
  digitalLifeSpine?: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeSpine'] | null
  digitalLifeRuntimeSurface?: AlicizationPreparedMainChatExecutionResult['runtimeSurface']['digitalLifeRuntimeSurface'] | null
}) {
  if (input.digitalLifeSpine && !isThinPreparedStartSpine(input.digitalLifeSpine)) {
    try {
      return projectAlicizationDigitalLifeSpineDigest(input.digitalLifeSpine)
    }
    catch {
    }
  }

  // Concurrent work can leave a thin runtimeSurface-only spine snapshot while the
  // prepared runtime surface still contains the living continuity state we need.
  if (input.digitalLifeRuntimeSurface) {
    try {
      return projectAlicizationDigitalLifeSpineDigest(
        deriveAlicizationDigitalLifeSpineFromSurface(input.digitalLifeRuntimeSurface),
      )
    }
    catch {
    }
  }

  return null
}

function normalizeMainChatStartProjectText(raw: unknown, maxChars = 1600) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
  if (!normalized || containsAlicizationFixedTemplateResidue(normalized))
    return ''
  return normalized
}

function scoreMainChatStartProjectDetail(value: unknown, kind: 'awareness' | 'same-her', maxChars = 1600) {
  const normalized = normalizeMainChatStartProjectText(value, maxChars)
  if (!normalized)
    return Number.NEGATIVE_INFINITY

  const lower = normalized.toLowerCase()
  let score = normalized.length
  if (kind === 'same-her') {
    if (lower.includes('continuity hold:') || lower.includes('generic project continuity hold'))
      score += 1200
    if (lower.includes('project_anchor=') || lower.includes('continuity_owner='))
      score += 700
    if (lower.includes('do not reopen from scratch') || lower.includes('without reopening from scratch') || lower.includes('should not start from scratch'))
      score += 650
    if (lower.includes('same-thread-continuation') || lower.includes('same thread'))
      score += 500
    if (lower.includes('measured-return') || lower.includes('repair-before-closeness') || lower.includes('rest-protective') || lower.includes('lower-pressure'))
      score += 300
    if (lower.includes('runtime_personhood'))
      score += 160
    return score
  }

  if (lower.startsWith('before answering') || lower.startsWith('before speaking'))
    score -= 500
  if (lower.includes('identity=') && lower.includes('phase='))
    score += 500
  if (lower.includes('landed=') || lower.includes('open=') || lower.includes('next='))
    score += 280
  if (lower.includes('runtime_personhood'))
    score += 420
  if (lower.includes('still-open') || lower.includes('memory, initiative, and embodiment'))
    score += 180
  if (lower.includes('do not reopen from scratch') || lower.includes('should not start from scratch'))
    score += 220
  return score
}

function pickPreferredMainChatStartProjectDetail(input: {
  current?: unknown
  candidate?: unknown
  kind: 'awareness' | 'same-her'
  maxChars?: number
}) {
  const maxChars = input.maxChars ?? 1600
  const current = normalizeMainChatStartProjectText(input.current, maxChars)
  const candidate = normalizeMainChatStartProjectText(input.candidate, maxChars)
  if (!current)
    return candidate || null
  if (!candidate)
    return current
  if (current === candidate)
    return current

  const currentScore = scoreMainChatStartProjectDetail(current, input.kind, maxChars)
  const candidateScore = scoreMainChatStartProjectDetail(candidate, input.kind, maxChars)
  if (candidateScore !== currentScore)
    return candidateScore > currentScore ? candidate : current
  return candidate.length > current.length ? candidate : current
}

function pickPreferredMainChatStartContinuityArcStage(values: unknown[]) {
  const score = (value: unknown) => {
    const normalized = normalizeMainChatStartProjectText(value, 120)
    if (!normalized)
      return Number.NEGATIVE_INFINITY
    if (normalized === 'same-thread-continuation')
      return 4
    if (normalized === 'next-open-window')
      return 3
    if (normalized === 'hold-for-opening')
      return 2
    return 1
  }

  return values
    .map(value => ({
      value: normalizeMainChatStartProjectText(value, 120),
      score: score(value),
    }))
    .filter((candidate): candidate is { value: string, score: number } => Boolean(candidate.value))
    .sort((left, right) => right.score - left.score)[0]
    ?.value ?? null
}

function pickPreferredMainChatStartContinuityRestraint(values: unknown[]) {
  const score = (value: unknown) => {
    const normalized = normalizeMainChatStartProjectText(value, 64)
    if (!normalized)
      return Number.NEGATIVE_INFINITY
    if (normalized === 'repair-before-closeness')
      return 5
    if (normalized === 'rest-protective')
      return 4
    if (normalized === 'measured-return')
      return 3
    if (normalized === 'lower-pressure')
      return 2
    if (normalized === 'single-thread')
      return 1
    return 0
  }

  return values
    .map(value => ({
      value: normalizeMainChatStartProjectText(value, 64),
      score: score(value),
    }))
    .filter((candidate): candidate is { value: string, score: number } => Boolean(candidate.value))
    .sort((left, right) => right.score - left.score)[0]
    ?.value ?? null
}

function mergeMainChatStartProjectState(
  current: AlicizationMainChatStartProjectState | null | undefined,
  carry: AlicizationMainChatStartProjectState | null | undefined,
): AlicizationMainChatStartProjectState | null {
  if (!current)
    return carry ?? null
  if (!carry)
    return current

  return {
    ...current,
    preflightSummary: pickPreferredMainChatStartProjectDetail({
      current: current.preflightSummary,
      candidate: carry.preflightSummary,
      kind: 'awareness',
    }),
    preDialogueAwarenessLine: pickPreferredMainChatStartProjectDetail({
      current: current.preDialogueAwarenessLine,
      candidate: carry.preDialogueAwarenessLine,
      kind: 'awareness',
    }),
    preDialogueAwarenessSummary: pickPreferredMainChatStartProjectDetail({
      current: current.preDialogueAwarenessSummary,
      candidate: carry.preDialogueAwarenessSummary,
      kind: 'awareness',
    }),
    continuitySummary: pickPreferredMainChatStartProjectDetail({
      current: current.continuitySummary,
      candidate: carry.continuitySummary,
      kind: 'same-her',
    }),
    awarenessLine: pickPreferredMainChatStartProjectDetail({
      current: current.awarenessLine,
      candidate: carry.awarenessLine,
      kind: 'awareness',
    }),
    companionHeadlineLine: pickPreferredMainChatStartProjectDetail({
      current: current.companionHeadlineLine,
      candidate: carry.companionHeadlineLine,
      kind: 'awareness',
    }),
    companionBriefingLine: pickPreferredMainChatStartProjectDetail({
      current: current.companionBriefingLine,
      candidate: carry.companionBriefingLine,
      kind: 'awareness',
    }),
    identity: pickPreferredMainChatStartProjectDetail({
      current: current.identity,
      candidate: carry.identity,
      kind: 'awareness',
    }),
    currentPhase: pickPreferredMainChatStartProjectDetail({
      current: current.currentPhase,
      candidate: carry.currentPhase,
      kind: 'awareness',
      maxChars: 320,
    }),
    latestLandedProgress: pickPreferredMainChatStartProjectDetail({
      current: current.latestLandedProgress,
      candidate: carry.latestLandedProgress,
      kind: 'awareness',
    }),
    latestProgress: pickPreferredMainChatStartProjectDetail({
      current: current.latestProgress,
      candidate: carry.latestProgress,
      kind: 'awareness',
    }),
    landedProgressSummary: pickPreferredMainChatStartProjectDetail({
      current: current.landedProgressSummary,
      candidate: carry.landedProgressSummary,
      kind: 'awareness',
    }),
    memoryClosureSummary: pickPreferredMainChatStartProjectDetail({
      current: current.memoryClosureSummary,
      candidate: carry.memoryClosureSummary,
      kind: 'awareness',
    }),
    primaryOpenLoop: pickPreferredMainChatStartProjectDetail({
      current: current.primaryOpenLoop,
      candidate: carry.primaryOpenLoop,
      kind: 'awareness',
    }),
    nextClosureTarget: pickPreferredMainChatStartProjectDetail({
      current: current.nextClosureTarget,
      candidate: carry.nextClosureTarget,
      kind: 'same-her',
    }),
    sameHerSelfLine: pickPreferredMainChatStartProjectDetail({
      current: current.sameHerSelfLine,
      candidate: carry.sameHerSelfLine,
      kind: 'same-her',
    }),
    sameHerHoldDetail: pickPreferredMainChatStartProjectDetail({
      current: current.sameHerHoldDetail,
      candidate: carry.sameHerHoldDetail,
      kind: 'same-her',
    }),
    sameHerDriftRisk: pickPreferredMainChatStartProjectDetail({
      current: current.sameHerDriftRisk,
      candidate: carry.sameHerDriftRisk,
      kind: 'same-her',
    }),
    emotionalClosureCue: pickPreferredMainChatStartProjectDetail({
      current: current.emotionalClosureCue,
      candidate: carry.emotionalClosureCue,
      kind: 'same-her',
    }),
    proactiveSameHerGap: pickPreferredMainChatStartProjectDetail({
      current: current.proactiveSameHerGap,
      candidate: carry.proactiveSameHerGap,
      kind: 'same-her',
    }),
    continuityRestraint: pickPreferredMainChatStartContinuityRestraint([
      current.continuityRestraint,
      carry.continuityRestraint,
    ]),
    continuityArcStage: pickPreferredMainChatStartContinuityArcStage([
      current.continuityArcStage,
      carry.continuityArcStage,
    ]),
    continuityPreferredTiming: pickPreferredMainChatStartProjectDetail({
      current: current.continuityPreferredTiming,
      candidate: carry.continuityPreferredTiming,
      kind: 'awareness',
      maxChars: 160,
    }),
    continuityCadence: pickPreferredMainChatStartProjectDetail({
      current: current.continuityCadence,
      candidate: carry.continuityCadence,
      kind: 'awareness',
      maxChars: 160,
    }),
    continuityCue: pickPreferredMainChatStartProjectDetail({
      current: current.continuityCue,
      candidate: carry.continuityCue,
      kind: 'same-her',
    }),
    preferredBlinkCadence: current.preferredBlinkCadence ?? carry.preferredBlinkCadence ?? null,
    preferredGazeMode: current.preferredGazeMode ?? carry.preferredGazeMode ?? null,
    preferredVoiceMode: current.preferredVoiceMode ?? carry.preferredVoiceMode ?? null,
    preferredPacingMode: current.preferredPacingMode ?? carry.preferredPacingMode ?? null,
  }
}

function mergeMainChatStartCurrentConsciousFrame(input: {
  current: AlicizationMainChatStartCurrentConsciousFrame | null | undefined
  carry: AlicizationMainChatStartCurrentConsciousFrame | null | undefined
  mergedProjectState: AlicizationMainChatStartProjectState | null
}): AlicizationMainChatStartCurrentConsciousFrame | null {
  if (!input.current && !input.carry && !input.mergedProjectState)
    return null

  const currentReasonTags = Array.isArray(input.current?.reasonTags)
    ? input.current.reasonTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : []
  const carryReasonTags = Array.isArray(input.carry?.reasonTags)
    ? input.carry.reasonTags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
    : []
  const continuityArcStage = pickPreferredMainChatStartContinuityArcStage([
    input.current?.continuityArcStage,
    input.carry?.continuityArcStage,
    input.mergedProjectState?.continuityArcStage,
  ])
  const continuityPreferredTiming = pickPreferredMainChatStartProjectDetail({
    current: input.current?.continuityPreferredTiming,
    candidate: input.carry?.continuityPreferredTiming ?? input.mergedProjectState?.continuityPreferredTiming,
    kind: 'awareness',
    maxChars: 160,
  })
  const continuityCadence = pickPreferredMainChatStartProjectDetail({
    current: input.current?.continuityCadence,
    candidate: input.carry?.continuityCadence ?? input.mergedProjectState?.continuityCadence,
    kind: 'awareness',
    maxChars: 160,
  })

  return {
    ...input.carry,
    ...input.current,
    reasonTags: Array.from(new Set([
      ...currentReasonTags,
      ...carryReasonTags,
      ...(continuityArcStage ? [`continuity-arc:${continuityArcStage}`] : []),
      ...(continuityPreferredTiming ? [`continuity-timing:${continuityPreferredTiming}`] : []),
    ])).slice(0, 8),
    focusAnchor: input.current?.focusAnchor ?? input.carry?.focusAnchor ?? null,
    consciousNeed: input.current?.consciousNeed ?? input.carry?.consciousNeed ?? null,
    speakingIntention: input.current?.speakingIntention ?? input.carry?.speakingIntention ?? null,
    signature: input.current?.signature ?? input.carry?.signature ?? null,
    continuityArcStage,
    continuityPreferredTiming,
    continuityCadence,
  }
}

function mergePreparedStartRuntimeDigestWithPreludeCarry(input: {
  prepared: AlicizationMainChatStartRuntimeDigest | null | undefined
  prelude: AlicizationMainChatStartRuntimeDigest | null | undefined
}): AlicizationMainChatStartRuntimeDigest | null {
  if (!input.prepared)
    return input.prelude ?? null
  if (!input.prelude)
    return input.prepared

  const mergedProjectState = mergeMainChatStartProjectState(
    input.prepared.projectState ?? null,
    input.prelude.projectState ?? null,
  )
  const mergedCurrentConsciousFrame = mergeMainChatStartCurrentConsciousFrame({
    current: input.prepared.currentConsciousFrame ?? null,
    carry: input.prelude.currentConsciousFrame ?? null,
    mergedProjectState,
  })
  const mergedContinuityRestraint = pickPreferredMainChatStartContinuityRestraint([
    input.prepared.continuityRestraint,
    input.prelude.continuityRestraint,
    mergedProjectState?.continuityRestraint,
  ])
  const mergedEmotionalClosureCue = pickPreferredMainChatStartProjectDetail({
    current: input.prepared.emotionalClosureCue,
    candidate: input.prelude.emotionalClosureCue ?? mergedProjectState?.emotionalClosureCue,
    kind: 'same-her',
  })
  const mergedSummary = pickPreferredMainChatStartProjectDetail({
    current: input.prepared.summary,
    candidate: input.prelude.summary,
    kind: 'same-her',
    maxChars: 640,
  })

  // Keep prepared governance/runtime ownership, but let richer prelude continuity
  // survive when the accepted-start prepared digest is thinner than what already settled.
  return {
    ...input.prepared,
    projectState: mergedProjectState,
    currentConsciousFrame: mergedCurrentConsciousFrame,
    continuityRestraint: mergedContinuityRestraint,
    emotionalClosureCue: mergedEmotionalClosureCue,
    summary: mergedSummary ?? input.prepared.summary,
  }
}

function looksLikeThinMainChatStartPreDialogueAwarenessLine(raw: unknown) {
  const normalized = normalizeMainChatStartProjectText(raw, 320).toLowerCase()
  if (!normalized)
    return true

  return normalized === 'before answering, remember: this is still the same digital life project. same phase 1 digital life.'
    || (
      normalized.includes('same digital life project')
      && normalized.includes('same phase 1 digital life')
      && !normalized.includes('local-first digital life')
      && !normalized.includes('should not start from scratch')
      && !normalized.includes('do not reopen from scratch')
      && !normalized.includes('what has already landed')
      && !normalized.includes('still-open')
      && !normalized.includes('unfinished closure')
    )
}

function repairMainChatStartProjectStateAwareness(input: {
  projectState: AlicizationChatStartResult['projectState']
  runtimeDigest: AlicizationChatStartResult['runtimeDigest']
  preDialogueAwareness: AlicizationChatStartResult['preDialogueAwareness']
}) {
  const projectState = input.projectState
  if (!projectState) {
    return {
      projectState,
      runtimeDigest: input.runtimeDigest,
    }
  }

  const richerAwarenessCandidate = pickPreferredMainChatStartProjectDetail({
    current: projectState.awarenessLine ?? input.preDialogueAwareness?.awarenessLine,
    candidate: projectState.companionHeadlineLine ?? input.preDialogueAwareness?.companionBriefingLine,
    kind: 'awareness',
  })
  const currentPreDialogueAwarenessLine = normalizeMainChatStartProjectText(projectState.preDialogueAwarenessLine, 1600)
  const resolvedPreDialogueAwarenessLine = looksLikeThinMainChatStartPreDialogueAwarenessLine(currentPreDialogueAwarenessLine)
    ? pickPreferredMainChatStartProjectDetail({
        current: currentPreDialogueAwarenessLine,
        candidate: richerAwarenessCandidate,
        kind: 'awareness',
      })
    : currentPreDialogueAwarenessLine || richerAwarenessCandidate

  if (!resolvedPreDialogueAwarenessLine || resolvedPreDialogueAwarenessLine === currentPreDialogueAwarenessLine) {
    return {
      projectState,
      runtimeDigest: input.runtimeDigest,
    }
  }

  const nextProjectState = {
    ...projectState,
    preDialogueAwarenessLine: resolvedPreDialogueAwarenessLine,
  }
  const nextRuntimeDigest = input.runtimeDigest?.projectState
    ? {
        ...input.runtimeDigest,
        projectState: {
          ...input.runtimeDigest.projectState,
          preDialogueAwarenessLine: resolvedPreDialogueAwarenessLine,
        },
      }
    : input.runtimeDigest

  return {
    projectState: nextProjectState,
    runtimeDigest: nextRuntimeDigest,
  }
}

async function raceAlicizationMainChatPreparation(
  input: Pick<
    ResolveAlicizationMainChatStartResultOptions,
    'preparationPromise' | 'eagerPreparationBudgetMs' | 'setTimeoutImpl' | 'clearTimeoutImpl'
  >,
) {
  const setTimeoutImpl = input.setTimeoutImpl ?? setTimeout
  const clearTimeoutImpl = input.clearTimeoutImpl ?? clearTimeout

  return await new Promise<
    | {
      stage: 'prepared'
      governance: AlicizationMainChatStartGovernance
      digitalLifeSpine: AlicizationChatStartResult['digitalLifeSpine']
      runtimeDigest: AlicizationChatStartResult['runtimeDigest']
    }
    | { stage: 'failed', governance: null }
    | { stage: 'timeout', governance: null }
  >((resolve) => {
    const timer = setTimeoutImpl(() => resolve({
      stage: 'timeout',
      governance: null,
    }), Math.max(0, input.eagerPreparationBudgetMs))

    void input.preparationPromise
      .then(result => resolve({
        stage: 'prepared',
        governance: result.governance ?? null,
        digitalLifeSpine: resolveMainChatStartDigitalLifeSpineDigest({
          digitalLifeSpine: result.runtimeSurface?.digitalLifeSpine ?? null,
          digitalLifeRuntimeSurface: result.runtimeSurface?.digitalLifeRuntimeSurface ?? null,
        }),
        runtimeDigest: resolveMainChatStartRuntimeDigest(result.runtimeSurface?.digitalLifeRuntimeSurface ?? null),
      }))
      .catch(() => resolve({
        stage: 'failed',
        governance: null,
      }))
      .finally(() => clearTimeoutImpl(timer))
  })
}

export async function resolveAlicizationMainChatStartResult(
  input: ResolveAlicizationMainChatStartResultOptions,
): Promise<AlicizationChatStartResult> {
  let eagerPreludeGovernance: AlicizationMainChatStartGovernance = null
  let eagerPreludeDigitalLifeSpine: AlicizationChatStartResult['digitalLifeSpine'] = null
  let eagerPreludeRuntimeDigest: AlicizationChatStartResult['runtimeDigest'] = null
  let eagerPreludeSettled = false
  void input.preludePromise
    .then((result) => {
      eagerPreludeGovernance = result.perceptionAugmentation.chatGovernance.mindTurnGovernance ?? null
      eagerPreludeDigitalLifeSpine = resolveMainChatStartDigitalLifeSpineDigest({
        digitalLifeSpine: null,
        digitalLifeRuntimeSurface: result.perceptionAugmentation.digitalLifeRuntimeSurface ?? null,
      })
      eagerPreludeRuntimeDigest = resolveMainChatStartRuntimeDigest(
        result.perceptionAugmentation.digitalLifeRuntimeSurface ?? null,
      )
      eagerPreludeSettled = true
    })
    .catch(() => {
      eagerPreludeSettled = true
    })

  const eagerPreparation = await raceAlicizationMainChatPreparation(input)
  const eagerGovernance = eagerPreparation.stage === 'prepared'
    ? eagerPreparation.governance
    : eagerPreludeSettled
      ? eagerPreludeGovernance
      : null
  const eagerDigitalLifeSpine = eagerPreparation.stage === 'prepared'
    ? eagerPreparation.digitalLifeSpine
    : eagerPreludeSettled
      ? eagerPreludeDigitalLifeSpine
      : null
  const eagerRuntimeDigest = eagerPreparation.stage === 'prepared'
    ? mergePreparedStartRuntimeDigestWithPreludeCarry({
        prepared: eagerPreparation.runtimeDigest,
        prelude: eagerPreludeSettled ? eagerPreludeRuntimeDigest : null,
      })
    : eagerPreludeSettled
      ? eagerPreludeRuntimeDigest
      : null
  const eagerEmbodimentMeta = input.buildEmbodimentMeta({
    governance: eagerGovernance ?? null,
    digitalLifeSpine: eagerDigitalLifeSpine,
    turnId: input.turnId,
  })
  const eagerStartMeta = buildAlicizationChatMetaPayload({
    cardId: input.cardId,
    turnId: input.turnId,
    governance: eagerGovernance ?? null,
    embodiment: eagerEmbodimentMeta.embodiment,
    embodimentScript: eagerEmbodimentMeta.embodimentScript,
    speechTimeline: eagerEmbodimentMeta.speechTimeline,
    digitalLife: eagerEmbodimentMeta.digitalLife,
    digitalLifeSpine: eagerDigitalLifeSpine,
    runtimeDigest: eagerRuntimeDigest,
  })
  const repairedStartProjectAwareness = repairMainChatStartProjectStateAwareness({
    projectState: eagerStartMeta.projectState ?? null,
    runtimeDigest: eagerStartMeta.runtimeDigest ?? eagerRuntimeDigest ?? null,
    preDialogueAwareness: eagerStartMeta.preDialogueAwareness ?? null,
  })

  return {
    accepted: true,
    turnId: input.turnId,
    state: 'accepted',
    governance: eagerGovernance ?? null,
    projectState: repairedStartProjectAwareness.projectState ?? null,
    preDialogueAwareness: eagerStartMeta.preDialogueAwareness ?? null,
    embodiment: eagerEmbodimentMeta.embodiment,
    embodimentScript: eagerEmbodimentMeta.embodimentScript,
    speechTimeline: eagerEmbodimentMeta.speechTimeline,
    digitalLife: eagerEmbodimentMeta.digitalLife,
    digitalLifeSpine: eagerDigitalLifeSpine,
    runtimeDigest: repairedStartProjectAwareness.runtimeDigest ?? eagerRuntimeDigest ?? null,
  }
}
