import type {
  AlicizationOrganicMemorySnapshot,
  AlicizationSensoryCacheSnapshot,
} from './alicization-bridge'

import {
  normalizeAlicizationDigitalLifeSpineDigest,
  normalizeAlicizationRuntimeDigest,
} from './alicization-bridge'

interface BrowserSessionContinuitySummary {
  sessionId: string | null
  latestOrigin: 'user-turn' | 'subconscious-proactive' | 'system' | null
  continuityAnchor: string | null
  threadSummary: string | null
  recollectionSummary: string | null
  proactiveSummary: string | null
  executionSummary: string | null
}

interface BrowserProactiveFeedbackSummary {
  latestOutcome: { outcome: 'positive' | 'dismiss' | 'ignored' | 'reply-within-120s' } | null
  pendingCount: number
  shouldSuppressSpeak: boolean
  confidenceBias: number
  summary: string | null
}

function clamp01(value: number) {
  if (Number.isNaN(value))
    return 0
  return Math.min(1, Math.max(0, value))
}

function sanitizeText(raw: unknown, fallback = '') {
  if (typeof raw !== 'string')
    return fallback
  return raw.trim()
}

function sanitizeBriefText(raw: unknown, maxLength = 160) {
  if (typeof raw !== 'string')
    return ''
  const normalized = raw.trim().replace(/\s+/g, ' ')
  if (!normalized)
    return ''
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1).trimEnd()}…`
    : normalized
}

function hashContent(content: string) {
  let hash = 0
  for (let index = 0; index < content.length; index += 1)
    hash = ((hash << 5) - hash) + content.charCodeAt(index)
  return `${hash >>> 0}`
}

function inferBrowserDigestScenario(snapshot: AlicizationSensoryCacheSnapshot, recollectionForeground: AlicizationOrganicMemorySnapshot['recollectionForeground']) {
  const foregroundTitle = sanitizeText(snapshot.sample.foregroundWindow?.title ?? '', '')
  const foregroundApp = sanitizeText(snapshot.sample.foregroundWindow?.appName ?? '', '')
  const basis = `${foregroundTitle} ${foregroundApp} ${recollectionForeground?.summary ?? ''}`.toLowerCase()
  if (/runtime|cursor|patch|verify|test|diff|code|cli/iu.test(basis))
    return 'coding' as const
  if (/music|song|video|media/iu.test(basis))
    return 'media' as const
  if (/late|night|sleep|fatigue|rest|熬夜|疲惫/u.test(basis))
    return 'late-night-care' as const
  return 'general' as const
}

export function buildBrowserFallbackDigitalLifeSpineDigest(input: {
  now: () => number
  organicMemorySnapshot: AlicizationOrganicMemorySnapshot
  snapshot: AlicizationSensoryCacheSnapshot
  sessionContinuity: BrowserSessionContinuitySummary
  proactiveFeedback: BrowserProactiveFeedbackSummary
}) {
  const recollection = input.organicMemorySnapshot.recollectionForeground ?? null
  const scenario = inferBrowserDigestScenario(input.snapshot, recollection)
  const watchMode = recollection ? 'symbiotic-vision' as const : 'mnemonic-passive' as const
  const sessionThreadSummary = input.sessionContinuity.threadSummary
  const sceneSummary = sanitizeBriefText(
    recollection?.summary
    || sessionThreadSummary
    || input.snapshot.sample.foregroundWindow?.title
    || input.snapshot.sample.foregroundWindow?.appName
    || 'browser fallback continuity',
    180,
  )
  const threadTitle = sanitizeBriefText(
    recollection?.summary
    || sessionThreadSummary
    || input.organicMemorySnapshot.memoryConsolidations?.[0]?.summary
    || input.organicMemorySnapshot.recentEpisodicEvents?.[0]?.threadAnchor
    || input.snapshot.sample.foregroundWindow?.title
    || 'browser fallback continuity',
    180,
  )
  const preferredStyle = recollection?.surfaceSummary?.includes('surface=inward') || input.proactiveFeedback.shouldSuppressSpeak
    ? 'silent-observe'
    : 'light-nudge'
  const shouldSpeak = !recollection?.surfaceSummary?.includes('surface=inward')
    && !input.proactiveFeedback.shouldSuppressSpeak

  return normalizeAlicizationDigitalLifeSpineDigest({
    version: 'digital-life-spine-digest-v1',
    runtime: {
      watchMode,
      sceneScenario: scenario,
      sceneSummary,
      activeThreadId: null,
      activeThreadTitle: threadTitle,
      dominantMode: recollection ? 'remembering' : 'tracking',
      dominantDrive: recollection?.mode === 'execution-procedure' ? 'follow-through' : 'understand',
      answerIntent: recollection?.mode ?? null,
      preferredPresence: 'attentive',
      selectedAction: shouldSpeak ? 'speak' : 'wait',
      updatedAt: input.now(),
    },
    architecture: {
      operatingMode: recollection ? 'remembering' : 'observing',
      dominantSystem: recollection ? 'memory' : 'perception',
      supportingSystems: recollection ? ['perception', 'dialogue'] : ['memory'],
      governingFocus: sceneSummary,
      summary: recollection
        ? `mode=remembering | dominant=memory | focus=${sceneSummary}`
        : `mode=observing | dominant=perception | focus=${sceneSummary}`,
    },
    continuitySignal: {
      label: 'digital-life-line',
      summary: sanitizeBriefText(
        [
          input.proactiveFeedback.summary ? input.proactiveFeedback.summary : '',
          input.sessionContinuity.threadSummary ? `session=${input.sessionContinuity.threadSummary}` : '',
          `watch=${watchMode}`,
          `scene=${scenario}`,
        ].filter(Boolean).join(' | '),
        220,
      ),
      signature: `browser-fallback-spine:${hashContent(sceneSummary + (recollection?.summary ?? ''))}`,
      createdAt: input.now(),
      watchMode,
      sceneScenario: scenario,
      activeThreadId: null,
      dominantMode: recollection ? 'remembering' : 'tracking',
      dominantDrive: recollection?.mode === 'execution-procedure' ? 'follow-through' : 'understand',
      answerIntent: recollection?.mode ?? null,
      preferredPresence: 'attentive',
    },
    proactive: {
      selectedAction: shouldSpeak ? 'speak' : 'wait',
      preferredStyle,
      confidence: clamp01((recollection?.confidence ?? 0.48) + input.proactiveFeedback.confidenceBias),
      shouldSpeak,
      activeThreadId: input.sessionContinuity.sessionId,
      activeThreadTitle: threadTitle,
      dominantConcernKind: null,
      dominantConcernSummary: null,
      leadingGoalId: null,
      leadingGoalSummary: null,
      preferredPresence: 'attentive',
    },
    autonomy: null,
    motive: null,
    habit: null,
    outcomeLearning: null,
    embodiment: null,
    memory: {
      summary: sanitizeBriefText(
        [
          input.proactiveFeedback.summary ? input.proactiveFeedback.summary : '',
          input.sessionContinuity.threadSummary ? `session=${input.sessionContinuity.threadSummary}` : '',
          input.organicMemorySnapshot.memoryConsolidations?.[0]?.summary
            ? `durable=${input.organicMemorySnapshot.memoryConsolidations[0].summary}`
            : '',
          threadTitle ? `thread=${threadTitle}` : '',
        ].filter(Boolean).join(' | '),
        220,
      ) || null,
      recentEpisodeSummary: sanitizeBriefText(
        input.organicMemorySnapshot.recentEpisodicEvents?.[0]?.whatHappened ?? '',
        180,
      ) || null,
      recentEpisodeCount: input.organicMemorySnapshot.recentEpisodicEvents?.length ?? 0,
      focusBeliefStatement: null,
      focusBeliefConfidence: null,
      leadingGoalSummary: null,
      dominantConcernSummary: null,
      reflectionSummary: null,
      reflectionPressure: null,
      recallMode: recollection?.mode ?? 'working',
      recallSeed: sanitizeBriefText(threadTitle, 160) || null,
      recollectionSummary: recollection?.summary ?? null,
      recollectionSurfaceSummary: recollection?.surfaceSummary ?? null,
      recollectionConfidence: recollection?.confidence ?? null,
      thoughtThreadSummary: threadTitle || null,
      longHorizonSummary: sanitizeBriefText(
        input.organicMemorySnapshot.memoryConsolidations?.[0]?.summary ?? '',
        180,
      ) || null,
      rememberedPreferenceSummary: null,
      rememberedConstraintSummary: null,
      rememberedPlanSummary: null,
      longHorizonCueCount: input.organicMemorySnapshot.memoryConsolidations?.length ?? 0,
    },
  })
}

export function buildBrowserFallbackRuntimeDigest(input: {
  organicMemorySnapshot: AlicizationOrganicMemorySnapshot
  snapshot: AlicizationSensoryCacheSnapshot
  sessionContinuity: BrowserSessionContinuitySummary
  proactiveFeedback: BrowserProactiveFeedbackSummary
}) {
  const recollection = input.organicMemorySnapshot.recollectionForeground ?? null
  const internalOnly = recollection?.surfaceSummary?.includes('surface=inward') ?? false
  const continuityAnchor = input.sessionContinuity.continuityAnchor
  const memoryReadiness = clamp01(
    (recollection ? (internalOnly ? 0.36 : 0.5) + recollection.confidence * 0.22 : 0.12)
    + (continuityAnchor ? 0.08 : 0)
    + (input.sessionContinuity.recollectionSummary ? 0.06 : 0)
    + (input.sessionContinuity.executionSummary ? 0.04 : 0),
  )
  const dialogueReadiness = clamp01(
    (recollection && !internalOnly ? 0.22 + recollection.confidence * 0.28 : 0.12)
    + (continuityAnchor ? 0.08 : 0)
    + (input.sessionContinuity.latestOrigin === 'user-turn' ? 0.06 : 0)
    + input.proactiveFeedback.confidenceBias,
  )
  const anthropomorphicReadiness = clamp01(
    (recollection?.mode === 'relationship-history' ? 0.28 : 0.14)
    + (input.proactiveFeedback.latestOutcome?.outcome === 'positive' ? 0.08 : 0)
    + (recollection && !internalOnly ? 0.1 : 0),
  )
  const perceptionReadiness = clamp01(
    0.24
    + (sanitizeText(input.snapshot.sample.foregroundWindow?.title ?? '') ? 0.08 : 0)
    + (sanitizeText(input.snapshot.sample.foregroundWindow?.appName ?? '') ? 0.04 : 0),
  )
  const channels = [
    {
      id: 'active-memory',
      state: memoryReadiness >= 0.72 ? 'hot' as const : memoryReadiness >= 0.38 ? 'warm' as const : 'idle' as const,
      readiness: memoryReadiness,
      focus: sanitizeBriefText(input.sessionContinuity.recollectionSummary || input.sessionContinuity.threadSummary || '', 120) || null,
      summary: sanitizeBriefText([
        recollection?.summary ? `followup=${recollection.summary}` : '',
        input.sessionContinuity.threadSummary ? `session=${input.sessionContinuity.threadSummary}` : '',
      ].filter(Boolean).join(' | '), 220),
    },
    {
      id: 'active-dialogue',
      state: dialogueReadiness >= 0.72 ? 'hot' as const : dialogueReadiness >= 0.38 ? 'warm' as const : 'idle' as const,
      readiness: dialogueReadiness,
      focus: sanitizeBriefText(input.sessionContinuity.threadSummary || input.sessionContinuity.continuityAnchor || '', 120) || null,
      summary: sanitizeBriefText([
        input.sessionContinuity.threadSummary ? `followup=${input.sessionContinuity.threadSummary}` : '',
        recollection?.summary && !internalOnly ? `recollection=${recollection.summary}` : '',
      ].filter(Boolean).join(' | '), 220),
    },
    {
      id: 'anthropomorphic-mind',
      state: anthropomorphicReadiness >= 0.72 ? 'hot' as const : anthropomorphicReadiness >= 0.38 ? 'warm' as const : 'idle' as const,
      readiness: anthropomorphicReadiness,
      focus: sanitizeBriefText(input.proactiveFeedback.summary || input.sessionContinuity.proactiveSummary || '', 120) || null,
      summary: sanitizeBriefText([
        input.proactiveFeedback.summary,
        input.sessionContinuity.proactiveSummary,
      ].filter(Boolean).join(' | '), 220),
    },
    {
      id: 'active-perception',
      state: perceptionReadiness >= 0.72 ? 'hot' as const : perceptionReadiness >= 0.38 ? 'warm' as const : 'idle' as const,
      readiness: perceptionReadiness,
      focus: sanitizeBriefText(input.snapshot.sample.foregroundWindow?.title ?? input.snapshot.sample.foregroundWindow?.appName ?? '', 120) || null,
      summary: sanitizeBriefText([
        `scene=${sanitizeText(input.snapshot.sample.foregroundWindow?.title ?? input.snapshot.sample.foregroundWindow?.appName ?? '')}`,
      ].join(' '), 220),
    },
  ]
  const dominantChannel = internalOnly
    ? 'active-memory'
    : dialogueReadiness >= memoryReadiness
      ? 'active-dialogue'
      : 'active-memory'
  const shouldProactivelySpeak = !internalOnly
    && !input.proactiveFeedback.shouldSuppressSpeak
    && dialogueReadiness >= 0.48
  const continuityPressure = clamp01(
    memoryReadiness * 0.54
    + dialogueReadiness * 0.26
    + anthropomorphicReadiness * 0.2,
  )
  const companionshipPressure = clamp01(
    anthropomorphicReadiness * 0.58
    + dialogueReadiness * 0.22
    + (recollection && !internalOnly ? recollection.confidence * 0.18 : 0),
  )
  const summary = sanitizeBriefText([
    `dominant=${dominantChannel}`,
    recollection?.summary ? `recollection=${recollection.summary}` : '',
    input.proactiveFeedback.summary ? input.proactiveFeedback.summary : '',
    continuityAnchor ? `session=${continuityAnchor}` : '',
  ].filter(Boolean).join(' | '), 240)

  return normalizeAlicizationRuntimeDigest({
    version: 'alicization-runtime-digest-v1',
    dominantChannel,
    activeLoop: {
      version: 'alicization-active-loop-v1',
      phase: internalOnly ? 'integrate' : 'dialogue',
      dominantChannel,
      handoffTarget: internalOnly ? 'active-memory' : 'active-dialogue',
      dialogueReady: dialogueReadiness >= 0.48,
      controlReady: false,
      memoryCarry: Boolean(recollection),
      companionshipReady: anthropomorphicReadiness >= 0.38,
      observationHeavy: !recollection,
      initiativeBudget: clamp01(recollection?.confidence ?? 0.42),
      coherence: clamp01((memoryReadiness + dialogueReadiness) / 2),
      summary,
    },
    shouldProactivelySpeak,
    shouldProactivelyAct: false,
    continuityPressure,
    companionshipPressure,
    channels,
    summary,
  })
}
