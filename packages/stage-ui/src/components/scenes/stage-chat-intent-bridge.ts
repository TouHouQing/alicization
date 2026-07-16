import type {
  IntentHandle,
  IntentOptions,
  SpeechIntentMetadata,
} from '@proj-alicization/pipelines-audio'

import {
  normalizeAlicizationRuntimeDigest,
  sanitizeAlicizationProviderFacingText,
} from '@proj-alicization/stage-shared'

interface StageChatIntentBridgeOptions {
  openIntent: (options?: IntentOptions) => IntentHandle
}

interface StageChatIntentBridge {
  readonly current: IntentHandle | null
  prepare: (intentOptions: IntentOptions) => IntentHandle
  attachRuntimeMetadata: (input: {
    embodimentScript?: unknown
    runtimeDigest?: unknown
    speechSynthesis?: unknown
  }) => IntentHandle | null
  attachEmbodimentScript: (script: unknown) => IntentHandle | null
  writeLiteral: (text: string) => void
  writeSpecial: (special: string) => void
  writeFlush: () => void
  end: () => void
  cancel: (reason?: string) => void
}

const legacySpeechProjectStateCueKeys = new Set([
  'preDialogueAwarenessLine',
  'preDialogueAwarenessSummary',
  'awarenessLine',
  'companionHeadlineLine',
  'companionBriefingLine',
  'companionNextClosureLine',
  'sameHerSelfLine',
  'sameHerSummary',
  'sameHerHoldDetail',
  'sameHerDriftRisk',
  'sameHerDriftRiskLine',
  'sameHerDriftRiskSummary',
  'emotionalClosureCue',
  'emotionalClosureSummary',
  'continuityCue',
  'continuityAnchor',
  'continuityHold',
  'continuityDriftRisk',
  'proactiveSameHerGap',
  'proactiveSameHerGapSummary',
])

function isLegacySpeechGovernanceKey(key: string) {
  return key === 'preDialogueSendIdentity'
    || key === 'preDialogueAwareness'
    || key === 'preDialogueClosure'
    || key === 'visibleReplyRealization'
    || legacySpeechProjectStateCueKeys.has(key)
    || key.startsWith('companion')
    || key.startsWith('sameHer')
    || key.startsWith('emotionalClosure')
    || key.startsWith('proactiveSameHer')
}

function sanitizeSpeechMetadataValue(value: unknown, key = ''): unknown {
  if (isLegacySpeechGovernanceKey(key))
    return undefined
  if (typeof value === 'string')
    return sanitizeAlicizationProviderFacingText(value, 1600, '') || null
  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeSpeechMetadataValue(item, key))
      .filter(item => item !== undefined && item !== null)
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([entryKey]) => !isLegacySpeechGovernanceKey(entryKey))
        .map(([entryKey, item]) => [entryKey, sanitizeSpeechMetadataValue(item, entryKey)])
        .filter(([, item]) => item !== undefined && item !== null),
    )
  }
  return value
}

function normalizeSpeechProjectStateRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return null

  const normalized: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (isLegacySpeechGovernanceKey(key) || item == null)
      continue
    if (typeof item === 'string') {
      const text = normalizeSpeechProjectStateText(item)
      if (text)
        normalized[key] = text
      continue
    }
    const sanitized = sanitizeSpeechMetadataValue(item, key)
    if (sanitized !== undefined && sanitized !== null)
      normalized[key] = sanitized
  }
  return Object.keys(normalized).length > 0 ? normalized : null
}

function normalizeSpeechMetadataRecord(
  metadata: SpeechIntentMetadata | null | undefined,
): SpeechIntentMetadata | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return null

  return sanitizeSpeechMetadataValue(metadata) as SpeechIntentMetadata
}

function normalizeSpeechMetadataText(value: unknown) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  if (!normalized)
    return null

  return sanitizeAlicizationProviderFacingText(normalized, 800, '') || null
}

function normalizeSpeechMetadataNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : null
}

function normalizeSpeechSynthesisMetadata(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function normalizeSpeechRuntimeDigest(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? sanitizeSpeechMetadataValue(
      normalizeAlicizationRuntimeDigest(value),
    ) as ReturnType<typeof normalizeAlicizationRuntimeDigest>
    : null
}

function countSpeechRuntimeDigestSignals(digest: ReturnType<typeof normalizeAlicizationRuntimeDigest>) {
  if (!digest)
    return -1

  const projectState = digest.projectState
  const currentConsciousFrame = digest.currentConsciousFrame
  const activeLoop = digest.activeLoop

  let score = 0
  const projectStateSignals = [
    projectState?.preflightSummary,
    projectState?.identity,
    projectState?.currentPhase,
    projectState?.latestLandedProgress,
    projectState?.memoryClosureSummary,
    projectState?.primaryOpenLoop,
    projectState?.nextClosureTarget,
    projectState?.continuityRestraint,
    projectState?.continuityArcStage,
    projectState?.continuityPreferredTiming,
    projectState?.continuityCadence,
    projectState?.preferredBlinkCadence,
    projectState?.preferredGazeMode,
  ]
  score += projectStateSignals.filter(Boolean).length * 10

  const frameSignals = [
    currentConsciousFrame?.signature,
    currentConsciousFrame?.focusAnchor,
    currentConsciousFrame?.consciousNeed,
    currentConsciousFrame?.speakingIntention,
    currentConsciousFrame?.continuityArcStage,
    currentConsciousFrame?.continuityPreferredTiming,
    currentConsciousFrame?.continuityCadence,
  ]
  score += frameSignals.filter(Boolean).length * 6
  score += (currentConsciousFrame?.reasonTags.length ?? 0) * 2

  const activeLoopSignals = [
    activeLoop?.handoffTarget,
    activeLoop?.continuityArcStage,
    activeLoop?.continuityPreferredTiming,
    activeLoop?.summary,
  ]
  score += activeLoopSignals.filter(Boolean).length * 4

  if (digest.emotionalKernel)
    score += 8

  score += digest.channels.length * 2
  score += JSON.stringify(digest).length
  return score
}

function normalizeSpeechProjectStateText(value: unknown) {
  if (typeof value !== 'string')
    return ''

  const normalized = value.trim()
  if (!normalized)
    return ''

  return sanitizeAlicizationProviderFacingText(normalized, 800, '')
}

function mergeSpeechProjectState(
  existingValue: Record<string, unknown> | null,
  incomingValue: Record<string, unknown> | null,
) {
  const existing = normalizeSpeechProjectStateRecord(existingValue)
  const incoming = normalizeSpeechProjectStateRecord(incomingValue)
  if (!existing)
    return incoming
  if (!incoming)
    return existing

  const merged: Record<string, unknown> = { ...existing }
  for (const [key, incomingItem] of Object.entries(incoming)) {
    const existingItem = merged[key]
    if (typeof existingItem === 'string' && typeof incomingItem === 'string') {
      merged[key] = incomingItem.length > existingItem.length ? incomingItem : existingItem
      continue
    }
    if (existingItem == null)
      merged[key] = incomingItem
  }
  return merged
}

function mergeSpeechRuntimeDigest(input: {
  existing: unknown
  incoming?: unknown
  projectState?: Record<string, unknown> | null
  emotionalClosureCue?: string | null
}) {
  const existingDigest = normalizeSpeechRuntimeDigest(input.existing)
  const incomingDigest = normalizeSpeechRuntimeDigest(input.incoming)
  if (!existingDigest && !incomingDigest)
    return null

  const preferredDigest = countSpeechRuntimeDigestSignals(existingDigest) >= countSpeechRuntimeDigestSignals(incomingDigest)
    ? existingDigest
    : incomingDigest
  const secondaryDigest = preferredDigest === existingDigest ? incomingDigest : existingDigest
  const mergedProjectState = mergeSpeechProjectState(
    mergeSpeechProjectState(
      secondaryDigest?.projectState as Record<string, unknown> | null ?? null,
      preferredDigest?.projectState as Record<string, unknown> | null ?? null,
    ),
    input.projectState ?? null,
  )
  const mergedEmotionalClosureCue = normalizeSpeechMetadataText(input.emotionalClosureCue)
    ?? normalizeSpeechMetadataText(
      typeof mergedProjectState?.emotionalClosureCue === 'string'
        ? mergedProjectState.emotionalClosureCue
        : null,
    )
    ?? normalizeSpeechMetadataText(preferredDigest?.emotionalClosureCue)
    ?? normalizeSpeechMetadataText(secondaryDigest?.emotionalClosureCue)
    ?? null
  const mergedDerivedMindStateBundle = preferredDigest?.derivedMindStateBundle
    ?? secondaryDigest?.derivedMindStateBundle
    ?? null

  return normalizeAlicizationRuntimeDigest({
    ...secondaryDigest,
    ...preferredDigest,
    ...(secondaryDigest?.currentConsciousFrame || preferredDigest?.currentConsciousFrame
      ? {
          currentConsciousFrame: {
            ...secondaryDigest?.currentConsciousFrame,
            ...preferredDigest?.currentConsciousFrame,
          },
        }
      : {}),
    ...(mergedProjectState ? { projectState: mergedProjectState } : {}),
    ...(mergedEmotionalClosureCue ? { emotionalClosureCue: mergedEmotionalClosureCue } : {}),
    ...(mergedDerivedMindStateBundle ? { derivedMindStateBundle: mergedDerivedMindStateBundle } : {}),
  })
}

export function attachEmbodimentScriptToSpeechMetadata(
  metadata: SpeechIntentMetadata | null | undefined,
  embodimentScript: unknown,
): SpeechIntentMetadata | null {
  if (!embodimentScript || typeof embodimentScript !== 'object' || Array.isArray(embodimentScript))
    return normalizeSpeechMetadataRecord(metadata)

  return {
    ...normalizeSpeechMetadataRecord(metadata),
    embodimentScript,
  }
}

export function attachSpeechSynthesisToSpeechMetadata(
  metadata: SpeechIntentMetadata | null | undefined,
  speechSynthesis: unknown,
): SpeechIntentMetadata | null {
  const normalizedMetadata = normalizeSpeechMetadataRecord(metadata)
  const normalizedSpeechSynthesis = normalizeSpeechSynthesisMetadata(speechSynthesis)
  if (!normalizedSpeechSynthesis)
    return normalizedMetadata

  const existingSpeechSynthesis = normalizeSpeechSynthesisMetadata(normalizedMetadata?.speechSynthesis)
  const existingVoice = normalizeSpeechSynthesisMetadata(existingSpeechSynthesis?.voice)
  const incomingVoice = normalizeSpeechSynthesisMetadata(normalizedSpeechSynthesis.voice)
  const mergedVoice = existingVoice || incomingVoice
    ? {
        ...existingVoice,
        ...incomingVoice,
      }
    : undefined
  const mergedSpeechSynthesis: Record<string, unknown> = {
    ...existingSpeechSynthesis,
    ...normalizedSpeechSynthesis,
  }
  const pitchDelta = normalizeSpeechMetadataNumber(normalizedSpeechSynthesis.pitchDelta)
  const rateMultiplier = normalizeSpeechMetadataNumber(normalizedSpeechSynthesis.rateMultiplier)

  if (pitchDelta == null && existingSpeechSynthesis?.pitchDelta != null)
    mergedSpeechSynthesis.pitchDelta = existingSpeechSynthesis.pitchDelta
  if (pitchDelta != null)
    mergedSpeechSynthesis.pitchDelta = pitchDelta

  if (rateMultiplier == null && existingSpeechSynthesis?.rateMultiplier != null)
    mergedSpeechSynthesis.rateMultiplier = existingSpeechSynthesis.rateMultiplier
  if (rateMultiplier != null)
    mergedSpeechSynthesis.rateMultiplier = rateMultiplier

  if (mergedVoice)
    mergedSpeechSynthesis.voice = mergedVoice

  return {
    ...normalizedMetadata,
    speechSynthesis: mergedSpeechSynthesis,
  }
}

export function attachRuntimeDigestToSpeechMetadata(
  metadata: SpeechIntentMetadata | null | undefined,
  runtimeDigest: unknown,
): SpeechIntentMetadata | null {
  const normalizedMetadata = normalizeSpeechMetadataRecord(metadata)
  const normalizedRuntimeDigest = normalizeSpeechRuntimeDigest(runtimeDigest)
  if (!normalizedRuntimeDigest)
    return normalizedMetadata

  const mergedProjectState = mergeSpeechProjectState(
    normalizeSpeechProjectStateRecord(normalizedMetadata?.projectState),
    normalizeSpeechProjectStateRecord(normalizedRuntimeDigest.projectState),
  )
  const mergedRuntimeDigest = mergeSpeechRuntimeDigest({
    existing: normalizedMetadata?.runtimeDigest,
    incoming: normalizedRuntimeDigest,
    projectState: mergedProjectState,
  })

  return normalizeSpeechMetadataRecord({
    ...normalizedMetadata,
    ...(mergedProjectState ? { projectState: mergedProjectState } : {}),
    ...(mergedRuntimeDigest ? { runtimeDigest: mergedRuntimeDigest } : {}),
  })
}

export function attachFallbackDialogueMetadataToSpeechMetadata(
  metadata: SpeechIntentMetadata | null | undefined,
  fallbackMetadata: Record<string, unknown> | null | undefined,
): SpeechIntentMetadata | null {
  const normalizedMetadata = normalizeSpeechMetadataRecord(metadata)
  const normalizedFallbackMetadata = normalizeSpeechMetadataRecord(fallbackMetadata)
  if (!normalizedFallbackMetadata)
    return normalizedMetadata

  const mergedProjectState = mergeSpeechProjectState(
    normalizeSpeechProjectStateRecord(normalizedMetadata?.projectState),
    normalizeSpeechProjectStateRecord(normalizedFallbackMetadata.projectState),
  )
  const mergedRuntimeDigest = mergeSpeechRuntimeDigest({
    existing: normalizedMetadata?.runtimeDigest,
    incoming: normalizedFallbackMetadata.runtimeDigest,
    projectState: mergedProjectState,
  })
  const {
    projectState: _fallbackProjectState,
    runtimeDigest: _fallbackRuntimeDigest,
    embodimentScript,
    ...fallbackFacts
  } = normalizedFallbackMetadata

  return attachEmbodimentScriptToSpeechMetadata(
    {
      ...fallbackFacts,
      ...normalizedMetadata,
      ...(mergedProjectState ? { projectState: mergedProjectState } : {}),
      ...(mergedRuntimeDigest ? { runtimeDigest: mergedRuntimeDigest } : {}),
    },
    embodimentScript,
  )
}

export function createStageChatIntentBridge(options: StageChatIntentBridgeOptions): StageChatIntentBridge {
  let preparedOptions: IntentOptions | null = null
  let currentHandle: IntentHandle | null = null
  let currentMetadata: SpeechIntentMetadata | null = null
  let tokenEmissionStarted = false

  function syncHandle(handle: IntentHandle): IntentHandle
  function syncHandle(handle: null): null
  function syncHandle(handle: IntentHandle | null): IntentHandle | null
  function syncHandle(handle: IntentHandle | null) {
    currentHandle = handle
    return handle
  }

  function reopenPreparedIntent(reason: string) {
    if (!preparedOptions || tokenEmissionStarted)
      return currentHandle

    currentHandle?.cancel(reason)
    return syncHandle(options.openIntent({
      ...preparedOptions,
      metadata: currentMetadata,
    }))
  }

  function prepare(intentOptions: IntentOptions): IntentHandle {
    preparedOptions = {
      ...intentOptions,
      metadata: normalizeSpeechMetadataRecord(intentOptions.metadata),
    }
    currentMetadata = preparedOptions.metadata ?? null
    tokenEmissionStarted = false
    const handle = options.openIntent(preparedOptions)
    syncHandle(handle)
    return handle
  }

  function applyMetadataUpgrade(
    upgrade: (metadata: SpeechIntentMetadata | null) => SpeechIntentMetadata | null,
  ) {
    const upgradedMetadata = upgrade(currentMetadata)
    const metadataChanged = JSON.stringify(upgradedMetadata) !== JSON.stringify(currentMetadata)
    currentMetadata = upgradedMetadata

    if (!metadataChanged || !currentHandle || tokenEmissionStarted)
      return currentHandle

    return reopenPreparedIntent('metadata-upgrade')
  }

  function attachRuntimeMetadata(input: {
    embodimentScript?: unknown
    runtimeDigest?: unknown
    speechSynthesis?: unknown
  }) {
    return applyMetadataUpgrade((metadata) => {
      let upgradedMetadata = metadata
      if ('speechSynthesis' in input)
        upgradedMetadata = attachSpeechSynthesisToSpeechMetadata(upgradedMetadata, input.speechSynthesis)
      if ('runtimeDigest' in input)
        upgradedMetadata = attachRuntimeDigestToSpeechMetadata(upgradedMetadata, input.runtimeDigest)
      if ('embodimentScript' in input)
        upgradedMetadata = attachEmbodimentScriptToSpeechMetadata(upgradedMetadata, input.embodimentScript)
      return upgradedMetadata
    })
  }

  function attachEmbodimentScript(script: unknown) {
    return attachRuntimeMetadata({
      embodimentScript: script,
    })
  }

  function markTokenEmissionStarted() {
    tokenEmissionStarted = true
  }

  function writeLiteral(text: string) {
    markTokenEmissionStarted()
    currentHandle?.writeLiteral(text)
  }

  function writeSpecial(special: string) {
    markTokenEmissionStarted()
    currentHandle?.writeSpecial(special)
  }

  function writeFlush() {
    markTokenEmissionStarted()
    currentHandle?.writeFlush()
  }

  function end() {
    currentHandle?.end()
    currentHandle = null
    preparedOptions = null
    currentMetadata = null
    tokenEmissionStarted = false
  }

  function cancel(reason?: string) {
    currentHandle?.cancel(reason)
    currentHandle = null
    preparedOptions = null
    currentMetadata = null
    tokenEmissionStarted = false
  }

  return {
    get current() {
      return currentHandle
    },
    prepare,
    attachRuntimeMetadata,
    attachEmbodimentScript,
    writeLiteral,
    writeSpecial,
    writeFlush,
    end,
    cancel,
  }
}
