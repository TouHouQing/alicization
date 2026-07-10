import type {
  IntentHandle,
  IntentOptions,
  SpeechIntentMetadata,
} from '@proj-alicization/pipelines-audio'

import type { AlicizationPreDialogueSendIdentity } from '../../stores/alicization-bridge'

import {
  alicizationFixedTemplateReplacement,
  isAlicizationThinProjectAwarenessLine,
  isAlicizationThinSamePhaseCarryLine,
  normalizeAlicizationRuntimeDigest,
  sanitizeAlicizationProviderFacingText,
  scoreAlicizationProjectAwarenessLine,
} from '@proj-alicization/stage-shared'

import { buildPreDialogueSendIdentityFromSnapshots } from '../../stores/chat/pre-dialogue-send-identity'

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

function normalizeSpeechMetadataRecord(
  metadata: SpeechIntentMetadata | null | undefined,
): SpeechIntentMetadata | null {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : null
}

function normalizePreDialogueReasonPreview(reasonPreview: AlicizationPreDialogueSendIdentity['reasonPreview']) {
  const normalized: string[] = []

  for (const reason of reasonPreview ?? []) {
    const trimmed = typeof reason === 'string' ? reason.trim() : ''
    if (!trimmed || normalized.includes(trimmed))
      continue
    normalized.push(trimmed)
  }

  return normalized
}

function normalizeSpeechMetadataTextArray(value: unknown) {
  const normalized: string[] = []
  if (!Array.isArray(value))
    return normalized

  for (const item of value) {
    const text = normalizeSpeechMetadataText(item)
    if (!text || normalized.includes(text))
      continue
    normalized.push(text)
  }

  return normalized
}

function normalizeSpeechMetadataText(value: unknown) {
  if (typeof value !== 'string')
    return null

  const normalized = value.trim()
  return normalized || null
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
    ? normalizeAlicizationRuntimeDigest(value)
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
    projectState?.preDialogueAwarenessLine,
    projectState?.identity,
    projectState?.currentPhase,
    projectState?.latestLandedProgress,
    projectState?.memoryClosureSummary,
    projectState?.primaryOpenLoop,
    projectState?.nextClosureTarget,
    projectState?.sameHerSelfLine,
    projectState?.sameHerHoldDetail,
    projectState?.sameHerDriftRisk,
    projectState?.proactiveSameHerGap,
    projectState?.emotionalClosureCue,
    projectState?.continuityRestraint,
    projectState?.continuityArcStage,
    projectState?.continuityPreferredTiming,
    projectState?.continuityCadence,
    projectState?.continuityCue,
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

  if (digest.emotionalClosureCue)
    score += 6
  if (digest.emotionalKernel)
    score += 8

  score += digest.channels.length * 2
  score += JSON.stringify(digest).length
  return score
}

function looksLikeThinSpeechProjectAwareness(value: unknown) {
  const normalized = normalizeSpeechMetadataText(value)
  if (!normalized)
    return false

  const lowered = normalized.toLowerCase()
  return isAlicizationThinProjectAwarenessLine(normalized)
    || isAlicizationThinSamePhaseCarryLine(normalized)
    || lowered.includes('generic continuity fallback')
    || lowered.includes('generic continuity reminder')
    || lowered.includes('generic awareness reminder')
    || lowered.includes('generic continuity reminder')
    || lowered.includes('generic next target')
    || lowered.includes('generic closure summary')
}

function mergeSpeechMetadataText(existing: unknown, incoming: unknown) {
  const existingText = normalizeSpeechMetadataText(existing)
  const incomingText = normalizeSpeechMetadataText(incoming)
  if (!incomingText)
    return existingText
  if (!existingText)
    return incomingText

  const existingLooksThin = looksLikeThinSpeechProjectAwareness(existingText)
  const incomingLooksThin = looksLikeThinSpeechProjectAwareness(incomingText)
  if (existingLooksThin && !incomingLooksThin)
    return incomingText
  if (incomingLooksThin && !existingLooksThin)
    return existingText

  const existingScore = scoreAlicizationProjectAwarenessLine(existingText)
  const incomingScore = scoreAlicizationProjectAwarenessLine(incomingText)
  if (existingScore !== incomingScore)
    return incomingScore > existingScore ? incomingText : existingText

  if (existingText.length !== incomingText.length)
    return incomingText.length > existingText.length ? incomingText : existingText

  return incomingText
}

function normalizeSpeechProjectStateText(value: unknown) {
  return typeof value === 'string'
    ? value.trim()
    : ''
}

function looksLikeThinSpeechProjectStateValue(field: string, value: unknown) {
  const normalized = normalizeSpeechProjectStateText(value)
  if (!normalized)
    return false

  const lowered = normalized.toLowerCase()
  switch (field) {
    case 'identity':
      return looksLikeThinSpeechProjectAwareness(normalized)
        || lowered === 'project continuity is active.'
        || lowered === 'project continuity is active'
        || lowered.includes('legacy project shell')
        || lowered.includes('generic project shell')
    case 'currentPhase':
      return /^phase\s*1$/iu.test(normalized)
    case 'latestLandedProgress':
      return lowered.includes('project continuity exists')
        || lowered.includes('closure exists')
        || lowered.includes('continuity exists')
        || lowered.includes('thin runtime progress only')
    case 'primaryOpenLoop':
      return lowered.includes('project continuity still needs closure')
        || lowered.includes('still needs closure')
        || lowered.includes('needs closure')
        || lowered.includes('thin runtime open only')
        || lowered.includes('thin runtime open loop only')
    case 'nextClosureTarget':
      return lowered.includes('carry project continuity forward')
        || lowered.includes('project continuity forward')
        || lowered.includes('thin runtime next only')
        || lowered.includes('generic next target')
        || lowered.includes('generic next closure')
        || lowered.includes('generic closure shell')
        || lowered.includes('generic closure summary')
        || lowered.includes('generic callback summary')
    case 'sameHerHoldDetail':
    case 'sameHerSelfLine':
      return isAlicizationThinSamePhaseCarryLine(normalized)
        || looksLikeThinSpeechProjectAwareness(normalized)
        || lowered.includes('generic continuity reminder')
    case 'preDialogueAwarenessLine':
    case 'preDialogueAwarenessSummary':
    case 'preflightSummary':
    case 'continuitySummary':
    case 'awarenessLine':
    case 'companionHeadlineLine':
    case 'companionBriefingLine':
    case 'sameHerDriftRisk':
    case 'proactiveSameHerGap':
      return looksLikeThinSpeechProjectAwareness(normalized)
    default:
      return false
  }
}

function scoreSpeechProjectStateValue(field: string, value: unknown) {
  const normalized = normalizeSpeechProjectStateText(value)
  if (!normalized)
    return Number.NEGATIVE_INFINITY
  const providerSafe = sanitizeAlicizationProviderFacingText(normalized, 800)
  if (
    !providerSafe
    || providerSafe === alicizationFixedTemplateReplacement
    || /local-first digital life project|continuous "?her"?|better chat wrapper|same-her|same living line|同一个\s*her|同一个她|数字生命主线/iu.test(normalized)
  ) {
    return Number.NEGATIVE_INFINITY
  }

  let score = scoreAlicizationProjectAwarenessLine(providerSafe)
  const lowered = providerSafe.toLowerCase()

  if (looksLikeThinSpeechProjectStateValue(field, providerSafe))
    score -= 6

  switch (field) {
    case 'identity':
      if (lowered.includes('phase1_local_digital_life'))
        score += 4
      if (lowered.includes('identity-continuity') || lowered.includes('project_state_continuity'))
        score += 2
      break
    case 'currentPhase':
      if (lowered.includes('phase 1:'))
        score += 3
      if (lowered.includes('local digital life'))
        score += 2
      break
    case 'latestLandedProgress':
      if (/\balready survives?\b/iu.test(normalized))
        score += 3
      if (/\bidentity\b|\blanded progress\b|still-open|voice boundary|playback/iu.test(normalized))
        score += 2
      break
    case 'primaryOpenLoop':
      if (/\blife loop\b|still-open|unresolved|voice|lipsync|embodiment|memory|initiative/iu.test(normalized))
        score += 3
      break
    case 'nextClosureTarget':
      if (/\bcontinuity\b|voice|lipsync|body|face|motion|embodiment|life loop/iu.test(normalized))
        score += 3
      break
    case 'sameHerHoldDetail':
      if (/before speaking|what has landed|life loop is still open|which life loop is still open/iu.test(normalized))
        score += 4
      break
    case 'sameHerSelfLine':
      if (/phase1 continuity|continuity line|continuous identity/iu.test(normalized))
        score += 2
      break
  }

  return score
}

function mergeSpeechProjectStateText(field: string, existing: unknown, incoming: unknown) {
  const existingText = normalizeSpeechProjectStateText(existing)
  const incomingText = normalizeSpeechProjectStateText(incoming)
  if (!incomingText)
    return existingText || null
  if (!existingText)
    return incomingText
  if (existingText === incomingText)
    return incomingText

  const existingLooksThin = looksLikeThinSpeechProjectStateValue(field, existingText)
  const incomingLooksThin = looksLikeThinSpeechProjectStateValue(field, incomingText)
  if (existingLooksThin && !incomingLooksThin)
    return incomingText
  if (incomingLooksThin && !existingLooksThin)
    return existingText

  const existingScore = scoreSpeechProjectStateValue(field, existingText)
  const incomingScore = scoreSpeechProjectStateValue(field, incomingText)
  if (existingScore !== incomingScore)
    return incomingScore > existingScore ? incomingText : existingText

  if (incomingText.length !== existingText.length)
    return incomingText.length > existingText.length ? incomingText : existingText

  return incomingText
}

function mergeSpeechProjectState(
  existingMetadata: Record<string, unknown> | null,
  incomingMetadata: Record<string, unknown> | null,
) {
  if (!existingMetadata)
    return incomingMetadata
  if (!incomingMetadata)
    return existingMetadata

  const merged: Record<string, unknown> = { ...existingMetadata }
  for (const [key, value] of Object.entries(incomingMetadata)) {
    if (value == null)
      continue
    if (typeof value === 'string') {
      const mergedValue = mergeSpeechProjectStateText(key, merged[key], value)
      if (mergedValue)
        merged[key] = mergedValue
      continue
    }
    merged[key] = value
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

function mergeSpeechMetadataClosure(
  existingClosure: Record<string, unknown> | null,
  incomingClosure: Record<string, unknown> | null,
) {
  if (!existingClosure) {
    return incomingClosure
      ? {
          ...incomingClosure,
          status: normalizeSpeechMetadataText(incomingClosure.status),
          summaryLine: normalizeSpeechMetadataText(incomingClosure.summaryLine),
          companionHeadlineLine: normalizeSpeechMetadataText(incomingClosure.companionHeadlineLine),
          sameHerDriftRiskLine: normalizeSpeechMetadataText(incomingClosure.sameHerDriftRiskLine),
          companionshipReasonLine: normalizeSpeechMetadataText(incomingClosure.companionshipReasonLine),
          companionBriefingLine: normalizeSpeechMetadataText(incomingClosure.companionBriefingLine),
          companionNextClosureLine: normalizeSpeechMetadataText(incomingClosure.companionNextClosureLine),
          emotionalClosureCue: normalizeSpeechMetadataText(incomingClosure.emotionalClosureCue),
          briefingLines: normalizeSpeechMetadataTextArray(incomingClosure.briefingLines),
          reasons: normalizeSpeechMetadataTextArray(incomingClosure.reasons),
        }
      : null
  }
  if (!incomingClosure)
    return existingClosure

  return {
    ...existingClosure,
    status: normalizeSpeechMetadataText(incomingClosure.status)
      ?? normalizeSpeechMetadataText(existingClosure.status)
      ?? null,
    summaryLine: mergeSpeechMetadataText(
      existingClosure.summaryLine,
      incomingClosure.summaryLine,
    ),
    companionHeadlineLine: mergeSpeechMetadataText(
      existingClosure.companionHeadlineLine,
      incomingClosure.companionHeadlineLine,
    ),
    sameHerDriftRiskLine: mergeSpeechMetadataText(
      existingClosure.sameHerDriftRiskLine,
      incomingClosure.sameHerDriftRiskLine,
    ),
    companionshipReasonLine: mergeSpeechMetadataText(
      existingClosure.companionshipReasonLine,
      incomingClosure.companionshipReasonLine,
    ),
    companionBriefingLine: mergeSpeechMetadataText(
      existingClosure.companionBriefingLine,
      incomingClosure.companionBriefingLine,
    ),
    companionNextClosureLine: mergeSpeechMetadataText(
      existingClosure.companionNextClosureLine,
      incomingClosure.companionNextClosureLine,
    ),
    emotionalClosureCue: mergeSpeechMetadataText(
      existingClosure.emotionalClosureCue,
      incomingClosure.emotionalClosureCue,
    ),
    briefingLines: normalizeSpeechMetadataTextArray([
      ...normalizeSpeechMetadataTextArray(existingClosure.briefingLines),
      ...normalizeSpeechMetadataTextArray(incomingClosure.briefingLines),
    ]),
    reasons: normalizeSpeechMetadataTextArray([
      ...normalizeSpeechMetadataTextArray(existingClosure.reasons),
      ...normalizeSpeechMetadataTextArray(incomingClosure.reasons),
    ]),
  }
}

export function attachPreDialogueSendIdentityToSpeechMetadata(
  metadata: SpeechIntentMetadata | null | undefined,
  preDialogueSendIdentity: AlicizationPreDialogueSendIdentity | null | undefined,
): SpeechIntentMetadata | null {
  const normalizedMetadata = normalizeSpeechMetadataRecord(metadata)
  if (!preDialogueSendIdentity || typeof preDialogueSendIdentity !== 'object')
    return normalizedMetadata

  const existingProjectState = normalizedMetadata?.projectState
    && typeof normalizedMetadata.projectState === 'object'
    && !Array.isArray(normalizedMetadata.projectState)
    ? normalizedMetadata.projectState as Record<string, unknown>
    : null
  const existingPreDialogueAwareness = normalizedMetadata?.preDialogueAwareness
    && typeof normalizedMetadata.preDialogueAwareness === 'object'
    && !Array.isArray(normalizedMetadata.preDialogueAwareness)
    ? normalizedMetadata.preDialogueAwareness as Record<string, unknown>
    : null
  const normalizedProjectState = preDialogueSendIdentity.projectState
    && typeof preDialogueSendIdentity.projectState === 'object'
    && !Array.isArray(preDialogueSendIdentity.projectState)
    ? { ...preDialogueSendIdentity.projectState }
    : null
  const normalizedPreDialogueAwareness = {
    status: preDialogueSendIdentity.status,
    summaryLine: preDialogueSendIdentity.summaryLine ?? null,
    companionHeadlineLine: preDialogueSendIdentity.companionHeadlineLine ?? null,
    companionBriefingLine: preDialogueSendIdentity.companionBriefingLine ?? null,
    companionNextClosureLine: preDialogueSendIdentity.companionNextClosureLine ?? null,
    awarenessLine: preDialogueSendIdentity.awarenessLine ?? null,
    emotionalClosureCue: preDialogueSendIdentity.emotionalClosureCue ?? null,
    reasonPreview: normalizePreDialogueReasonPreview(preDialogueSendIdentity.reasonPreview),
  }
  const hasNormalizedPreDialogueAwareness
    = normalizedPreDialogueAwareness.summaryLine
      || normalizedPreDialogueAwareness.companionHeadlineLine
      || normalizedPreDialogueAwareness.companionBriefingLine
      || normalizedPreDialogueAwareness.companionNextClosureLine
      || normalizedPreDialogueAwareness.awarenessLine
      || normalizedPreDialogueAwareness.emotionalClosureCue
      || normalizedPreDialogueAwareness.reasonPreview.length > 0

  if (!normalizedProjectState && !hasNormalizedPreDialogueAwareness)
    return normalizedMetadata

  const mergedProjectState = mergeSpeechProjectState(
    existingProjectState as Record<string, unknown> | null,
    normalizedProjectState as Record<string, unknown> | null,
  )
  const mergedPreDialogueAwareness = existingPreDialogueAwareness
    ? {
        ...existingPreDialogueAwareness,
        status: normalizedPreDialogueAwareness.status ?? existingPreDialogueAwareness.status ?? null,
        summaryLine: mergeSpeechMetadataText(
          existingPreDialogueAwareness.summaryLine,
          normalizedPreDialogueAwareness.summaryLine,
        ),
        companionHeadlineLine: mergeSpeechMetadataText(
          existingPreDialogueAwareness.companionHeadlineLine,
          normalizedPreDialogueAwareness.companionHeadlineLine,
        ),
        companionBriefingLine: mergeSpeechMetadataText(
          existingPreDialogueAwareness.companionBriefingLine,
          normalizedPreDialogueAwareness.companionBriefingLine,
        ),
        companionNextClosureLine: mergeSpeechMetadataText(
          existingPreDialogueAwareness.companionNextClosureLine,
          normalizedPreDialogueAwareness.companionNextClosureLine,
        ),
        awarenessLine: mergeSpeechMetadataText(
          existingPreDialogueAwareness.awarenessLine,
          normalizedPreDialogueAwareness.awarenessLine,
        ),
        emotionalClosureCue: mergeSpeechMetadataText(
          existingPreDialogueAwareness.emotionalClosureCue,
          normalizedPreDialogueAwareness.emotionalClosureCue,
        ),
        reasonPreview: normalizePreDialogueReasonPreview([
          ...((Array.isArray(existingPreDialogueAwareness.reasonPreview)
            ? existingPreDialogueAwareness.reasonPreview
            : []) as AlicizationPreDialogueSendIdentity['reasonPreview']),
          ...normalizedPreDialogueAwareness.reasonPreview,
        ]),
      }
    : hasNormalizedPreDialogueAwareness
      ? normalizedPreDialogueAwareness
      : null
  const mergedRuntimeDigest = mergeSpeechRuntimeDigest({
    existing: normalizedMetadata?.runtimeDigest,
    projectState: mergedProjectState as Record<string, unknown> | null,
    emotionalClosureCue: normalizeSpeechMetadataText(mergedPreDialogueAwareness?.emotionalClosureCue),
  })

  return {
    ...normalizedMetadata,
    ...(mergedProjectState ? { projectState: mergedProjectState } : {}),
    ...(mergedPreDialogueAwareness ? { preDialogueAwareness: mergedPreDialogueAwareness } : {}),
    ...(mergedRuntimeDigest ? { runtimeDigest: mergedRuntimeDigest } : {}),
  }
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

  const existingProjectState = normalizedMetadata?.projectState
    && typeof normalizedMetadata.projectState === 'object'
    && !Array.isArray(normalizedMetadata.projectState)
    ? normalizedMetadata.projectState as Record<string, unknown>
    : null
  const existingPreDialogueClosure = normalizedMetadata?.preDialogueClosure
    && typeof normalizedMetadata.preDialogueClosure === 'object'
    && !Array.isArray(normalizedMetadata.preDialogueClosure)
    ? normalizedMetadata.preDialogueClosure as Record<string, unknown>
    : null
  const existingPreDialogueAwareness = normalizedMetadata?.preDialogueAwareness
    && typeof normalizedMetadata.preDialogueAwareness === 'object'
    && !Array.isArray(normalizedMetadata.preDialogueAwareness)
    ? normalizedMetadata.preDialogueAwareness as Record<string, unknown>
    : null
  const mergedProjectState = mergeSpeechProjectState(
    mergeSpeechProjectState(
      existingProjectState,
      normalizedRuntimeDigest.projectState as Record<string, unknown> | null ?? null,
    ),
    normalizedRuntimeDigest.emotionalClosureCue
      ? {
          emotionalClosureCue: normalizedRuntimeDigest.emotionalClosureCue,
        }
      : null,
  )
  const rebuiltPreDialogueSendIdentity = mergedProjectState || existingPreDialogueClosure || existingPreDialogueAwareness
    ? buildPreDialogueSendIdentityFromSnapshots({
        projectStateContinuitySnapshot: mergedProjectState as any,
        preDialogueClosureSnapshot: existingPreDialogueClosure as any,
        preDialogueAwarenessSnapshot: existingPreDialogueAwareness as any,
        continuitySummary: normalizeSpeechMetadataText(
          typeof mergedProjectState?.preflightSummary === 'string'
            ? mergedProjectState.preflightSummary
            : typeof mergedProjectState?.latestLandedProgress === 'string'
              ? mergedProjectState.latestLandedProgress
              : null,
        ),
      })
    : null
  const metadataWithAwareness = rebuiltPreDialogueSendIdentity
    ? attachPreDialogueSendIdentityToSpeechMetadata(normalizedMetadata, rebuiltPreDialogueSendIdentity)
    : normalizedMetadata
  const mergedRuntimeDigest = mergeSpeechRuntimeDigest({
    existing: metadataWithAwareness?.runtimeDigest,
    incoming: normalizedRuntimeDigest,
    projectState: metadataWithAwareness?.projectState
      && typeof metadataWithAwareness.projectState === 'object'
      && !Array.isArray(metadataWithAwareness.projectState)
      ? metadataWithAwareness.projectState as Record<string, unknown>
      : null,
    emotionalClosureCue: normalizeSpeechMetadataText(
      metadataWithAwareness?.preDialogueAwareness
      && typeof metadataWithAwareness.preDialogueAwareness === 'object'
      && !Array.isArray(metadataWithAwareness.preDialogueAwareness)
        ? (metadataWithAwareness.preDialogueAwareness as Record<string, unknown>).emotionalClosureCue
        : metadataWithAwareness?.preDialogueClosure
          && typeof metadataWithAwareness.preDialogueClosure === 'object'
          && !Array.isArray(metadataWithAwareness.preDialogueClosure)
          ? (metadataWithAwareness.preDialogueClosure as Record<string, unknown>).emotionalClosureCue
          : null,
    ),
  })

  return {
    ...metadataWithAwareness,
    ...(mergedRuntimeDigest ? { runtimeDigest: mergedRuntimeDigest } : {}),
  }
}

export function attachFallbackDialogueMetadataToSpeechMetadata(
  metadata: SpeechIntentMetadata | null | undefined,
  fallbackMetadata: Record<string, unknown> | null | undefined,
): SpeechIntentMetadata | null {
  const normalizedMetadata = normalizeSpeechMetadataRecord(metadata)
  const normalizedFallbackMetadata = normalizeSpeechMetadataRecord(fallbackMetadata)
  if (!normalizedFallbackMetadata)
    return normalizedMetadata

  const fallbackProjectState = normalizedFallbackMetadata.projectState
    && typeof normalizedFallbackMetadata.projectState === 'object'
    && !Array.isArray(normalizedFallbackMetadata.projectState)
    ? normalizedFallbackMetadata.projectState as Record<string, unknown>
    : null
  const fallbackPreDialogueClosure = normalizedFallbackMetadata.preDialogueClosure
    && typeof normalizedFallbackMetadata.preDialogueClosure === 'object'
    && !Array.isArray(normalizedFallbackMetadata.preDialogueClosure)
    ? normalizedFallbackMetadata.preDialogueClosure as Record<string, unknown>
    : null
  const fallbackPreDialogueAwareness = normalizedFallbackMetadata.preDialogueAwareness
    && typeof normalizedFallbackMetadata.preDialogueAwareness === 'object'
    && !Array.isArray(normalizedFallbackMetadata.preDialogueAwareness)
    ? normalizedFallbackMetadata.preDialogueAwareness as Record<string, unknown>
    : null

  const rebuiltPreDialogueSendIdentity = fallbackProjectState || fallbackPreDialogueClosure || fallbackPreDialogueAwareness
    ? buildPreDialogueSendIdentityFromSnapshots({
        projectStateContinuitySnapshot: fallbackProjectState as any,
        preDialogueClosureSnapshot: fallbackPreDialogueClosure as any,
        preDialogueAwarenessSnapshot: fallbackPreDialogueAwareness as any,
        continuitySummary: normalizeSpeechMetadataText(fallbackProjectState?.continuitySummary ?? null),
      })
    : null
  const metadataWithAwareness = attachPreDialogueSendIdentityToSpeechMetadata(
    normalizedMetadata,
    rebuiltPreDialogueSendIdentity,
  )
  const existingPreDialogueClosure = metadataWithAwareness?.preDialogueClosure
    && typeof metadataWithAwareness.preDialogueClosure === 'object'
    && !Array.isArray(metadataWithAwareness.preDialogueClosure)
    ? metadataWithAwareness.preDialogueClosure as Record<string, unknown>
    : null
  const metadataWithClosure: SpeechIntentMetadata = {
    ...metadataWithAwareness,
    ...(fallbackProjectState
      ? {
          projectState: mergeSpeechProjectState(
            metadataWithAwareness?.projectState
            && typeof metadataWithAwareness.projectState === 'object'
            && !Array.isArray(metadataWithAwareness.projectState)
              ? metadataWithAwareness.projectState as Record<string, unknown>
              : null,
            fallbackProjectState,
          ),
        }
      : {}),
    ...(fallbackPreDialogueClosure
      ? {
          preDialogueClosure: mergeSpeechMetadataClosure(
            existingPreDialogueClosure,
            fallbackPreDialogueClosure,
          ),
        }
      : {}),
  }
  const mergedRuntimeDigest = mergeSpeechRuntimeDigest({
    existing: metadataWithClosure?.runtimeDigest,
    incoming: normalizedFallbackMetadata.runtimeDigest,
    projectState: metadataWithClosure?.projectState
      && typeof metadataWithClosure.projectState === 'object'
      && !Array.isArray(metadataWithClosure.projectState)
      ? metadataWithClosure.projectState as Record<string, unknown>
      : null,
    emotionalClosureCue: normalizeSpeechMetadataText(
      metadataWithClosure?.preDialogueAwareness
      && typeof metadataWithClosure.preDialogueAwareness === 'object'
      && !Array.isArray(metadataWithClosure.preDialogueAwareness)
        ? (metadataWithClosure.preDialogueAwareness as Record<string, unknown>).emotionalClosureCue
        : metadataWithClosure?.preDialogueClosure
          && typeof metadataWithClosure.preDialogueClosure === 'object'
          && !Array.isArray(metadataWithClosure.preDialogueClosure)
          ? (metadataWithClosure.preDialogueClosure as Record<string, unknown>).emotionalClosureCue
          : null,
    ),
  })

  return attachEmbodimentScriptToSpeechMetadata(
    {
      ...metadataWithClosure,
      ...(mergedRuntimeDigest ? { runtimeDigest: mergedRuntimeDigest } : {}),
    },
    normalizedFallbackMetadata.embodimentScript,
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
