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

const legacySpeechGovernanceKeys = new Set([
  'projectState',
  'projectStateContinuity',
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
  'continuityRestraint',
  'continuityArcStage',
  'continuityPreferredTiming',
  'continuityCadence',
  'proactiveSameHerGap',
  'proactiveSameHerGapSummary',
  'openingPolicy',
  'opening_policy',
  'relationshipCadence',
  'relationship_cadence',
  'redacted_internal',
])

function isLegacySpeechGovernanceKey(key: string) {
  return key === 'preDialogueSendIdentity'
    || key === 'preDialogueAwareness'
    || key === 'preDialogueClosure'
    || key === 'visibleReplyRealization'
    || legacySpeechGovernanceKeys.has(key)
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

function normalizeSpeechMetadataRecord(
  metadata: SpeechIntentMetadata | null | undefined,
): SpeechIntentMetadata | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata))
    return null

  return sanitizeSpeechMetadataValue(metadata) as SpeechIntentMetadata
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

  const currentConsciousFrame = digest.currentConsciousFrame
  const activeLoop = digest.activeLoop

  let score = 0
  const frameSignals = [
    currentConsciousFrame?.signature,
    currentConsciousFrame?.focusAnchor,
    currentConsciousFrame?.consciousNeed,
    currentConsciousFrame?.speakingIntention,
  ]
  score += frameSignals.filter(Boolean).length * 6
  score += (currentConsciousFrame?.reasonTags.length ?? 0) * 2

  const activeLoopSignals = [
    activeLoop?.phase,
    activeLoop?.dominantChannel,
    activeLoop?.handoffTarget,
    activeLoop?.summary,
  ]
  score += activeLoopSignals.filter(Boolean).length * 4

  if (digest.emotionalKernel)
    score += 8

  score += digest.channels.length * 2
  score += JSON.stringify(digest).length
  return score
}

function mergeSpeechRuntimeDigest(input: {
  existing: unknown
  incoming?: unknown
}) {
  const existingDigest = normalizeSpeechRuntimeDigest(input.existing)
  const incomingDigest = normalizeSpeechRuntimeDigest(input.incoming)
  if (!existingDigest && !incomingDigest)
    return null

  const preferredDigest = countSpeechRuntimeDigestSignals(existingDigest) >= countSpeechRuntimeDigestSignals(incomingDigest)
    ? existingDigest
    : incomingDigest
  const secondaryDigest = preferredDigest === existingDigest ? incomingDigest : existingDigest
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
    ...(mergedDerivedMindStateBundle ? { derivedMindStateBundle: mergedDerivedMindStateBundle } : {}),
  })
}

export function attachEmbodimentScriptToSpeechMetadata(
  metadata: SpeechIntentMetadata | null | undefined,
  embodimentScript: unknown,
): SpeechIntentMetadata | null {
  if (!embodimentScript || typeof embodimentScript !== 'object' || Array.isArray(embodimentScript))
    return normalizeSpeechMetadataRecord(metadata)

  const normalizedEmbodimentScript = sanitizeSpeechMetadataValue(
    embodimentScript,
  )

  return {
    ...normalizeSpeechMetadataRecord(metadata),
    ...(normalizedEmbodimentScript
      ? { embodimentScript: normalizedEmbodimentScript }
      : {}),
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

  const mergedRuntimeDigest = mergeSpeechRuntimeDigest({
    existing: normalizedMetadata?.runtimeDigest,
    incoming: normalizedRuntimeDigest,
  })

  return normalizeSpeechMetadataRecord({
    ...normalizedMetadata,
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

  const mergedRuntimeDigest = mergeSpeechRuntimeDigest({
    existing: normalizedMetadata?.runtimeDigest,
    incoming: normalizedFallbackMetadata.runtimeDigest,
  })
  const {
    runtimeDigest: _fallbackRuntimeDigest,
    embodimentScript,
    ...fallbackFacts
  } = normalizedFallbackMetadata

  return attachEmbodimentScriptToSpeechMetadata(
    {
      ...fallbackFacts,
      ...normalizedMetadata,
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
