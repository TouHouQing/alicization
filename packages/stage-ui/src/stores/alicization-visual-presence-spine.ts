import type {
  AlicizationDigitalLifeSpineDigest,
  AlicizationSelfEvolutionKernelSnapshot,
  AlicizationSensoryCacheSnapshot,
  AlicizationVisualPresenceStateSnapshot,
} from './alicization-bridge'

import {
  deriveAlicizationDialogueMemoryCarryPolicyFromDigest,
  deriveAlicizationResidentPerformanceSnapshot,
} from '@proj-alicization/stage-shared'

interface SilentPresenceAuthorityFields {
  continuityMode: 'ambient-covision' | 'quiet-accompaniment' | 'active-dialogue' | 'protective-watch' | 'rest-withdrawal'
  currentBodyState: AlicizationVisualPresenceStateSnapshot['currentBodyState']
  currentInwardPreoccupation: string | null
  quietLineMs: number
}

type AlicizationVisualPresenceStateWithAuthority = AlicizationVisualPresenceStateSnapshot
type AlicizationVisualPresenceStateWithRelationshipTiming = AlicizationVisualPresenceStateSnapshot & {
  relationshipTimingBias?: {
    relationshipDoctrine?: string | null
    latestInflection?: string | null
    burdenLine?: string | null
    trustMeaning?: string | null
    nextLearningAction?: AlicizationSelfEvolutionKernelSnapshot['nextLearningAction'] | 'hold' | null
    evolutionMomentum?: number | null
    learningReadiness?: number | null
    source?: 'outcome-learning' | 'autobiographical-self' | null
  } | null
}

function resolveRelationshipTimingNextLearningAction(
  action: string | null | undefined,
): 'record' | 'reflect' | 'verify' | 'revise' | 'internalize' | 'hold' | null {
  return action === 'record'
    || action === 'reflect'
    || action === 'verify'
    || action === 'revise'
    || action === 'internalize'
    || action === 'hold'
    ? action
    : null
}

function clamp01(value: number, fallback = 0) {
  if (Number.isNaN(value))
    return fallback
  return Math.min(1, Math.max(0, value))
}

function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.trim()
}

function sanitizeBriefText(raw: string, maxLength = 160) {
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function resolveNow(raw?: number | (() => number)) {
  if (typeof raw === 'function')
    return raw()
  if (typeof raw === 'number' && Number.isFinite(raw))
    return raw
  return Date.now()
}

export function ensureAlicizationVisualPresenceResidentPerformance(
  state: AlicizationVisualPresenceStateSnapshot,
): AlicizationVisualPresenceStateSnapshot {
  // NOTICE: Browser-side visual presence remains a projection/parity cache.
  // When main-runtime presence authority exists, this helper must only fill
  // renderer-facing resident performance gaps and must not synthesize a second
  // continuity or body-authority decision surface.
  return {
    ...state,
    residentPerformance: deriveAlicizationResidentPerformanceSnapshot({
      watchMode: state.watchMode,
      currentBodyState: state.currentBodyState,
      continuityMode: state.continuityMode,
      currentInwardPreoccupation: state.currentInwardPreoccupation,
      quietLineMs: state.quietLineMs,
      currentScene: state.currentScene,
      attention: state.attention,
      privateThought: state.privateThought,
      relationshipTimingBias: (state as AlicizationVisualPresenceStateWithRelationshipTiming).relationshipTimingBias ?? null,
      captureState: state.captureState,
      updatedAt: state.updatedAt,
    }, {
      fallbackUpdatedAt: state.updatedAt,
      source: 'browser-fallback',
    }),
  }
}

function createSyntheticSensorySnapshot(currentTs: number): AlicizationSensoryCacheSnapshot {
  const date = new Date(currentTs)
  return {
    sample: {
      collectedAt: currentTs,
      time: {
        iso: date.toISOString(),
        local: date.toISOString(),
        timezone: 'UTC',
      },
      cpu: {
        usagePercent: 0,
        windowMs: 0,
      },
      memory: {
        freeMB: 0,
        totalMB: 0,
        usagePercent: 0,
      },
      degraded: ['cpu-unavailable', 'memory-unavailable', 'battery-unavailable'],
    },
    stale: false,
    ageMs: 0,
    nextTickAt: null,
    running: false,
  }
}

function buildVisualTargetFromForeground(foreground?: AlicizationSensoryCacheSnapshot['sample']['foregroundWindow']) {
  if (!foreground)
    return null
  return {
    appName: sanitizeText(foreground.appName, ''),
    processName: sanitizeText(foreground.processName, ''),
    title: sanitizeText(foreground.title, ''),
    pid: Number.isFinite(Number(foreground.pid)) ? Number(foreground.pid) : null,
  }
}

function resolveVisualWatchModeFromSpine(raw: unknown): AlicizationVisualPresenceStateSnapshot['watchMode'] {
  return raw === 'symbiotic-vision' || raw === 'invited-inspection' || raw === 'recovering'
    ? raw
    : 'mnemonic-passive'
}

function resolveVisualScenarioFromSpine(raw: unknown): NonNullable<AlicizationVisualPresenceStateSnapshot['currentScene']>['scenario'] {
  return raw === 'coding' || raw === 'media' || raw === 'late-night-care'
    ? raw
    : 'general'
}

function resolvePresenceAuthorityFromSpine(input: {
  digest: AlicizationDigitalLifeSpineDigest
  previous: AlicizationVisualPresenceStateSnapshot | null
  shouldSpeak: boolean
}): SilentPresenceAuthorityFields {
  const previousAuthority = input.previous as AlicizationVisualPresenceStateWithAuthority | null
  if (
    input.digest.runtime.watchMode === 'recovering'
    && !input.shouldSpeak
  ) {
    return {
      currentBodyState: 'recovering' as const,
      continuityMode: 'protective-watch' as const,
      quietLineMs: Math.max(0, previousAuthority?.quietLineMs ?? 0),
      currentInwardPreoccupation: sanitizeBriefText(
        input.digest.memory?.summary
        || input.digest.runtime.sceneSummary
        || 'quiet recovery watch',
        180,
      ) || 'quiet recovery watch',
    }
  }

  if (
    input.digest.runtime.watchMode === 'symbiotic-vision'
    && !input.shouldSpeak
  ) {
    return {
      currentBodyState: 'accompanying' as const,
      continuityMode: 'quiet-accompaniment' as const,
      quietLineMs: Math.max(0, previousAuthority?.quietLineMs ?? 0),
      currentInwardPreoccupation: sanitizeBriefText(
        input.digest.memory?.summary
        || input.digest.runtime.sceneSummary
        || 'quiet companionship watch',
        180,
      ) || 'quiet companionship watch',
    }
  }

  return {
    currentBodyState: 'idle' as const,
    continuityMode: input.digest.architecture?.dominantSystem === 'dialogue'
      ? 'active-dialogue' as const
      : 'ambient-covision' as const,
    quietLineMs: Math.max(0, previousAuthority?.quietLineMs ?? 0),
    currentInwardPreoccupation: null,
  }
}

function resolveVisualWorkloadKindFromSpine(input: {
  previous: AlicizationVisualPresenceStateSnapshot | null
  scenario: ReturnType<typeof resolveVisualScenarioFromSpine>
  summary: string
}) {
  if (input.scenario === 'coding')
    return 'coding'
  if (input.scenario === 'media')
    return 'media'
  if (/\b(?:browser|tab|web)\b/i.test(input.summary))
    return 'browser'
  if (/\b(?:chat|conversation|dialogue)\b/i.test(input.summary))
    return 'chat'
  return input.previous?.currentScene?.workloadKind ?? 'unknown'
}

function resolveVisualContentKindFromSpine(input: {
  previous: AlicizationVisualPresenceStateSnapshot | null
  scenario: ReturnType<typeof resolveVisualScenarioFromSpine>
  summary: string
}) {
  if (/\bdiff\b/i.test(input.summary))
    return 'diff'
  if (/\b(?:error|fail|panic|exception)\b/i.test(input.summary))
    return 'error'
  if (/\b(?:doc|readme|markdown|spec)\b/i.test(input.summary))
    return 'doc'
  if (input.scenario === 'media')
    return /\b(?:music|song|audio)\b/i.test(input.summary) ? 'music' : 'video'
  if (/\b(?:chat|conversation|dialogue)\b/i.test(input.summary))
    return 'chat'
  return input.previous?.currentScene?.contentKind ?? 'unknown'
}

function resolvePrivateThoughtStyleFromSpine(
  digest: AlicizationDigitalLifeSpineDigest,
  memoryCarryPolicy: ReturnType<typeof deriveAlicizationDialogueMemoryCarryPolicyFromDigest>,
) {
  const style = digest.proactive?.preferredStyle
  if (style === 'light-nudge' || style === 'gentle-care' || style === 'firm-warning')
    return style
  if (memoryCarryPolicy.mode === 'reflective-repair')
    return 'gentle-care'
  return 'silent-observe'
}

function resolvePrivateThoughtStanceFromSpine(
  digest: AlicizationDigitalLifeSpineDigest,
  memoryCarryPolicy: ReturnType<typeof deriveAlicizationDialogueMemoryCarryPolicyFromDigest>,
) {
  const selectedAction = sanitizeText(digest.proactive?.selectedAction, '')
  if (selectedAction === 'warn')
    return 'warn'
  if (selectedAction === 'speak' || selectedAction === 'whisper')
    return 'accompany'
  if (selectedAction === 'hover' || selectedAction === 'recheck')
    return 'nudge'

  const style = resolvePrivateThoughtStyleFromSpine(digest, memoryCarryPolicy)
  if (style === 'gentle-care')
    return 'care'
  if (style === 'firm-warning')
    return 'warn'
  if (style === 'light-nudge')
    return 'nudge'
  if (digest.architecture?.dominantSystem === 'dialogue' && digest.architecture.operatingMode === 'speaking')
    return 'accompany'
  return 'observe'
}

function resolveEmbodiedPresenceFromSpine(
  digest: AlicizationDigitalLifeSpineDigest,
  memoryCarryPolicy: ReturnType<typeof deriveAlicizationDialogueMemoryCarryPolicyFromDigest>,
) {
  const preferredPresence = sanitizeText(
    digest.runtime.preferredPresence
    ?? digest.proactive?.preferredPresence
    ?? digest.continuitySignal?.preferredPresence
    ?? '',
    '',
  )
  if (preferredPresence === 'glance' || preferredPresence === 'attentive' || preferredPresence === 'hesitant' || preferredPresence === 'concerned')
    return preferredPresence

  const stance = resolvePrivateThoughtStanceFromSpine(digest, memoryCarryPolicy)
  if (stance === 'warn' || stance === 'care')
    return 'concerned'
  if (stance === 'nudge')
    return 'hesitant'
  return digest.runtime.watchMode === 'mnemonic-passive' ? 'glance' : 'attentive'
}

function resolveEmotionalTensionFromSpine(digest: AlicizationDigitalLifeSpineDigest) {
  if (digest.runtime.sceneScenario === 'late-night-care')
    return 'late-night-drain'
  if (digest.runtime.sceneScenario === 'coding') {
    return digest.proactive?.selectedAction === 'warn'
      || digest.architecture?.operatingMode === 'acting'
      ? 'tense-debug'
      : 'focused-flow'
  }
  if (digest.architecture?.dominantSystem === 'dialogue' && digest.architecture.operatingMode === 'speaking')
    return 'soft-covision'
  if (digest.runtime.watchMode === 'recovering')
    return 'restless-switching'
  return 'calm-browse'
}

function buildPrivateThoughtTextFromSpine(
  digest: AlicizationDigitalLifeSpineDigest,
  memoryCarryPolicy: ReturnType<typeof deriveAlicizationDialogueMemoryCarryPolicyFromDigest>,
) {
  const fallback = digest.memory?.summary
    || digest.memory?.recentEpisodeSummary
    || digest.memory?.recollectionSummary
    || digest.continuitySignal?.summary
    || digest.architecture?.summary
    || digest.runtime.sceneSummary
    || digest.runtime.activeThreadTitle
    || ''
  const carrySummary = memoryCarryPolicy.mode === 'quiet'
    ? ''
    : `carry=${memoryCarryPolicy.summary}`
  const carrySeed = memoryCarryPolicy.mode === 'quiet'
    ? ''
    : memoryCarryPolicy.recallSeed
      ? `carry_seed=${sanitizeBriefText(memoryCarryPolicy.recallSeed, 100)}`
      : ''
  return sanitizeBriefText([
    digest.memory?.summary,
    digest.memory?.recentEpisodeSummary,
    digest.memory?.recollectionSummary,
    digest.memory?.recollectionSurfaceSummary,
    digest.memory?.thoughtThreadSummary,
    carrySummary,
    carrySeed,
    fallback,
  ].filter(Boolean).join(' | '), 180)
}

function buildPrivateThoughtReasonTagsFromSpine(
  digest: AlicizationDigitalLifeSpineDigest,
  memoryCarryPolicy: ReturnType<typeof deriveAlicizationDialogueMemoryCarryPolicyFromDigest>,
) {
  const memoryCarryTags = memoryCarryPolicy.mode === 'quiet'
    ? []
    : [
        `memory-carry:${memoryCarryPolicy.mode}`,
        ...memoryCarryPolicy.reasonTags.map(reason => `carry:${sanitizeBriefText(reason, 36)}`),
      ]
  const tags = [
    'digital-life-spine',
    ...memoryCarryTags,
    digest.architecture?.dominantSystem ? `dominant:${digest.architecture.dominantSystem}` : '',
    digest.architecture?.operatingMode ? `mode:${digest.architecture.operatingMode}` : '',
    digest.runtime.sceneScenario ? `scene:${digest.runtime.sceneScenario}` : '',
    digest.runtime.answerIntent ? `answer:${sanitizeBriefText(digest.runtime.answerIntent, 40)}` : '',
    digest.proactive?.selectedAction ? `action:${sanitizeBriefText(digest.proactive.selectedAction, 40)}` : '',
    digest.memory?.recallMode ? `recall:${sanitizeBriefText(digest.memory.recallMode, 40)}` : '',
    digest.memory?.recollectionSummary ? `recollection:${sanitizeBriefText(digest.memory.recollectionSummary, 40)}` : '',
    digest.memory?.leadingGoalSummary ? `goal:${sanitizeBriefText(digest.memory.leadingGoalSummary, 40)}` : '',
  ].filter(Boolean)

  return [...new Set(tags)].slice(0, 8)
}

export function buildFallbackAlicizationVisualPresenceState(input?: {
  now?: number | (() => number)
  snapshot?: AlicizationSensoryCacheSnapshot | null
}): AlicizationVisualPresenceStateSnapshot {
  const currentTs = resolveNow(input?.now)
  const snapshot = input?.snapshot ?? createSyntheticSensorySnapshot(currentTs)
  const target = buildVisualTargetFromForeground(snapshot.sample.foregroundWindow)
  const summary = [target?.appName, target?.title].filter(Boolean).join(' - ')

  return ensureAlicizationVisualPresenceResidentPerformance({
    currentBodyState: 'idle',
    continuityMode: 'ambient-covision',
    quietLineMs: 0,
    currentInwardPreoccupation: null,
    watchMode: 'mnemonic-passive',
    currentScene: target
      ? {
          workloadKind: 'unknown',
          contentKind: 'unknown',
          scenario: 'general',
          summary: summary || undefined,
          source: 'foreground-window-heuristic',
          confidence: 0.3,
          target,
          beganAt: currentTs,
          lastSeenAt: currentTs,
        }
      : null,
    attention: target
      ? {
          target,
          source: 'foreground-window',
          confidence: 0.3,
          engagedAt: currentTs,
          lastConfirmedAt: currentTs,
          dwellMs: 0,
        }
      : null,
    workingMemoryEpisodes: [],
    privateThought: null,
    captureState: {
      permission: 'unknown',
      lastGroundedAt: null,
    },
    durabilityPulse: null,
    recentTransition: null,
    nextSuggestedProbeMs: 60_000,
    updatedAt: currentTs,
  })
}

export function buildAlicizationVisualPresenceStateFromSpineDigest(input: {
  digest: AlicizationDigitalLifeSpineDigest
  now?: number | (() => number)
  previous?: AlicizationVisualPresenceStateSnapshot | null
  snapshot?: AlicizationSensoryCacheSnapshot | null
}): AlicizationVisualPresenceStateSnapshot {
  const currentTs = resolveNow(input.now)
  const snapshot = input.snapshot ?? createSyntheticSensorySnapshot(currentTs)
  const base = input.previous ?? buildFallbackAlicizationVisualPresenceState({
    now: currentTs,
    snapshot,
  })
  const scenario = resolveVisualScenarioFromSpine(input.digest.runtime.sceneScenario)
  const target = base.currentScene?.target ?? base.attention?.target ?? buildVisualTargetFromForeground(snapshot.sample.foregroundWindow)
  const sceneSummary = sanitizeBriefText([
    input.digest.runtime.sceneSummary,
    input.digest.runtime.activeThreadTitle,
    input.digest.architecture?.summary,
  ].filter(Boolean).join(' | '), 180)
  const memoryCarryPolicy = deriveAlicizationDialogueMemoryCarryPolicyFromDigest({
    now: currentTs,
    digest: input.digest,
  })
  const confidence = clamp01(input.digest.proactive?.confidence ?? 0.68)
  const privateThoughtConfidence = memoryCarryPolicy.reflectionPressure != null
    ? clamp01(Math.max(confidence, memoryCarryPolicy.reflectionPressure))
    : confidence
  const shouldSpeak = input.digest.proactive?.shouldSpeak === true || memoryCarryPolicy.mode === 'reflective-repair'
  const suggestedStyle = resolvePrivateThoughtStyleFromSpine(input.digest, memoryCarryPolicy)
  const authority = resolvePresenceAuthorityFromSpine({
    digest: input.digest,
    previous: input.previous ?? null,
    shouldSpeak,
  })
  const priorResidentPerformance = input.previous?.residentPerformance ?? null
  const previousResidentSoftenedLine = priorResidentPerformance?.performance?.delivery === 'gentle'
    && priorResidentPerformance.performance.baseEmotion === 'thinking'
    && (
      priorResidentPerformance.performance.facialCue === 'soft-gaze'
      || priorResidentPerformance.performance.facialCue === 'relaxed'
      || priorResidentPerformance.performance.facialCue === 'half-lid'
    )

  const nextState: AlicizationVisualPresenceStateWithAuthority & AlicizationVisualPresenceStateWithRelationshipTiming = {
    ...base,
    watchMode: resolveVisualWatchModeFromSpine(
      input.digest.runtime.watchMode ?? input.digest.continuitySignal?.watchMode,
    ),
    currentBodyState: authority.currentBodyState,
    continuityMode: authority.continuityMode,
    quietLineMs: authority.quietLineMs,
    currentInwardPreoccupation: authority.currentInwardPreoccupation,
    currentScene: {
      workloadKind: resolveVisualWorkloadKindFromSpine({
        previous: input.previous ?? null,
        scenario,
        summary: sceneSummary,
      }),
      contentKind: resolveVisualContentKindFromSpine({
        previous: input.previous ?? null,
        scenario,
        summary: sceneSummary,
      }),
      scenario,
      summary: sceneSummary || base.currentScene?.summary,
      source: 'screen-semantic-summary',
      confidence: clamp01(Math.max(base.currentScene?.confidence ?? 0, confidence)),
      target,
      beganAt: base.currentScene?.scenario === scenario
        ? base.currentScene?.beganAt ?? currentTs
        : currentTs,
      lastSeenAt: currentTs,
    },
    attention: target
      ? {
          target,
          source: base.attention?.source ?? 'foreground-window',
          confidence: clamp01(Math.max(base.attention?.confidence ?? 0, confidence)),
          engagedAt: base.attention?.engagedAt ?? currentTs,
          lastConfirmedAt: currentTs,
          dwellMs: Math.max(0, currentTs - (base.attention?.engagedAt ?? currentTs)),
        }
      : base.attention,
    privateThought: {
      ...base.privateThought,
      stance: previousResidentSoftenedLine
        ? 'accompany'
        : resolvePrivateThoughtStanceFromSpine(input.digest, memoryCarryPolicy),
      confidence: privateThoughtConfidence,
      rationaleTags: buildPrivateThoughtReasonTagsFromSpine(input.digest, memoryCarryPolicy),
      thoughtText: previousResidentSoftenedLine
        ? sanitizeBriefText(
            input.digest.embodiment?.autobiographicalSelf?.identityNarrative
            || input.digest.embodiment?.autobiographicalSelf?.relationshipDoctrine
            || buildPrivateThoughtTextFromSpine(input.digest, memoryCarryPolicy),
            180,
          )
        : buildPrivateThoughtTextFromSpine(input.digest, memoryCarryPolicy),
      shouldSpeak,
      suggestedStyle,
      embodiedPresence: previousResidentSoftenedLine
        ? 'attentive'
        : resolveEmbodiedPresenceFromSpine(input.digest, memoryCarryPolicy),
      expiresAt: currentTs + (shouldSpeak ? 8_000 : 5_000),
      afterglowFromScenario: scenario === 'coding' || scenario === 'media'
        ? scenario
        : null,
      emotionalTension: previousResidentSoftenedLine
        ? 'soft-covision'
        : resolveEmotionalTensionFromSpine(input.digest),
      runtimeThreadId: input.digest.runtime.activeThreadId ?? base.privateThought?.runtimeThreadId ?? null,
      leadingGoalId: input.digest.proactive?.leadingGoalId ?? base.privateThought?.leadingGoalId ?? null,
    },
    relationshipTimingBias: input.digest.outcomeLearning?.summary
      || input.digest.outcomeLearning?.latestInflection
      || input.digest.embodiment?.autobiographicalSelf?.relationshipDoctrine
      || input.digest.embodiment?.autobiographicalSelf?.identityNarrative
      ? {
          relationshipDoctrine: input.digest.embodiment?.autobiographicalSelf?.relationshipDoctrine
            ?? input.digest.embodiment?.autobiographicalSelf?.identityNarrative
            ?? input.digest.outcomeLearning?.summary
            ?? null,
          latestInflection: input.digest.outcomeLearning?.latestInflection ?? null,
          burdenLine: null,
          trustMeaning: null,
          nextLearningAction: resolveRelationshipTimingNextLearningAction(
            input.digest.outcomeLearning?.nextLearningAction,
          ),
          evolutionMomentum: input.digest.outcomeLearning?.evolutionMomentum ?? null,
          learningReadiness: input.digest.outcomeLearning?.learningReadiness ?? null,
          source: input.digest.outcomeLearning?.summary || input.digest.outcomeLearning?.latestInflection
            ? 'outcome-learning'
            : 'autobiographical-self',
        }
      : null,
    updatedAt: input.digest.runtime.updatedAt ?? currentTs,
  }

  return ensureAlicizationVisualPresenceResidentPerformance(
    nextState as AlicizationVisualPresenceStateSnapshot,
  )
}
