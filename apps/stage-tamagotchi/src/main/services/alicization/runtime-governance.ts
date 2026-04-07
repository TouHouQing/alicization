import type { Buffer } from 'node:buffer'

import type { Message } from '@xsai/shared-chat'
import type { NativeImage } from 'electron'

import type {
  AlicizationConversationTurnInput,
  AlicizationDialogueEmbodimentEnvelope,
  AlicizationDialoguePerformancePayload,
  AlicizationDialogueRespondedPayload,
  AlicizationDialogueSpeechTimeline,
  AlicizationDialogueStructuredFormat,
  AlicizationDialogueStructuredPayload,
  AlicizationEmotion,
  AlicizationMindTurnEventInput,
  AlicizationMindTurnGovernance,
  AlicizationProactiveMetadata,
  AlicizationResidentPerformanceSnapshot,
  CharacterPerformanceCapabilitiesManifest,
} from '../../../shared/eventa'

import messages from '@proj-alicization/i18n/locales'

import { resolveLocalePreference } from '@proj-alicization/i18n'
import {
  buildAlicizationDialogueSpeechTimeline,
  buildAlicizationDigitalLifeEnvelope,
  buildMindGovernedFallbackSurface,
  isWeakAlicizationScreenSurfaceCue,
  normalizeAlicizationDigitalLifeEnvelope,
  normalizeAlicizationDigitalLifeSpineDigest,
  replyLeaksGovernedMindSurface,
  replyLooksCoherentSceneAnswer,
  replyLooksThinGovernedShell,
  resolveAlicizationDialogueEmbodiment,
  sanitizeCharacterPerformanceManifest,
  shouldDeferGovernedMindLocalRepair,
  shouldForceGovernedMindSurface,
  shouldPreserveDialogueFirstVisibleReply,
} from '@proj-alicization/stage-shared'
import { app } from 'electron'

import {
  clampAlicizationPerformancePayloadToManifest,
  normalizeAlicizationEmotion,
  normalizeAlicizationPerformancePayload,
} from '../../../shared/eventa'
import {
  extractTechnicalSpecificityClaims,
  normalizeClaimEvidenceLedger,
  normalizeTechnicalSpecificityCue,
} from './claim-evidence-ledger'
import { normalizeDialogueActKernel } from './dialogue-act-kernel'
import { anchorsMateriallyConflict, resolveDialogueAnchorCoherence } from './dialogue-anchor-coherence'
import { measureDialogueFocusAlignment } from './dialogue-focus-alignment'
import { sanitizeDialogueAnchorText } from './dialogue-surface-text'
import { ensureMindGovernanceDecisionTraceId, sanitizeMindGovernanceDecisionTraceId } from './mind-governance-trace'
import { normalizeMindTurnFrame } from './mind-turn-frame'
import { sanitizeBriefText, uniqueCarryAnchors } from './runtime-realtime'
import { clamp01, sanitizeText, supportedDialogueStructuredFormats } from './runtime-soul'
import { deriveAlicizationTruthDiscipline } from './truth-discipline'

export function createAbortError(reason?: string) {
  return new DOMException(`Alicization runtime aborted: ${reason ?? 'unknown'}`, 'AbortError')
}

export function isAbortError(error: unknown) {
  return typeof error === 'object'
    && error != null
    && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError'
}

export function isMainGatewayProgressEventType(rawType: unknown) {
  const eventType = sanitizeText(rawType)
  return eventType === 'text-delta'
    || eventType === 'tool-call'
    || eventType === 'tool-result'
    || eventType === 'finish'
    || eventType === 'error'
}

export function buildCompressedNativeImageDataUrl(input: {
  image: NativeImage
  maxWidth: number
  maxHeight: number
  jpegQuality: number
}) {
  const maybeImage = input.image as NativeImage & {
    isEmpty?: () => boolean
    getSize?: () => { width: number, height: number }
    resize?: (options: { width: number, height: number, quality?: string }) => NativeImage
    toJPEG?: (quality: number) => Buffer
    toDataURL?: () => string
  }
  if (typeof maybeImage.isEmpty !== 'function'
    || typeof maybeImage.getSize !== 'function'
    || typeof maybeImage.resize !== 'function'
    || typeof maybeImage.toJPEG !== 'function') {
    return typeof maybeImage.toDataURL === 'function'
      ? maybeImage.toDataURL()
      : ''
  }

  if (maybeImage.isEmpty())
    return ''

  const originalSize = maybeImage.getSize()
  const widthRatio = input.maxWidth > 0 ? input.maxWidth / Math.max(1, originalSize.width) : 1
  const heightRatio = input.maxHeight > 0 ? input.maxHeight / Math.max(1, originalSize.height) : 1
  const scale = Math.min(1, widthRatio, heightRatio)
  const targetWidth = Math.max(1, Math.round(originalSize.width * scale))
  const targetHeight = Math.max(1, Math.round(originalSize.height * scale))
  const resized = scale < 1
    ? maybeImage.resize({
        width: targetWidth,
        height: targetHeight,
        quality: 'better',
      })
    : maybeImage

  const jpeg = resized.toJPEG(input.jpegQuality)
  if (!jpeg || jpeg.length === 0)
    return ''

  return `data:image/jpeg;base64,${jpeg.toString('base64')}`
}

export function messageContainsVisualInput(messages: Message[]) {
  return messages.some(message =>
    Array.isArray(message.content)
    && message.content.some((part: any) => part?.type === 'image_url'),
  )
}

export function latestUserMessageContainsVisualInput(messages: Message[]) {
  const latestUserMessage = [...messages].reverse().find(message => message.role === 'user')
  if (!latestUserMessage || !Array.isArray(latestUserMessage.content))
    return false
  return latestUserMessage.content.some((part: any) => part?.type === 'image_url')
}

export function readStringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}

export function sanitizePerformanceManifest(raw: unknown): CharacterPerformanceCapabilitiesManifest | null {
  return sanitizeCharacterPerformanceManifest(raw)
}

export function parsePerformanceManifestFromMeta(raw: string | undefined): CharacterPerformanceCapabilitiesManifest | null {
  if (!raw)
    return null

  try {
    return sanitizePerformanceManifest(JSON.parse(raw))
  }
  catch {
    return null
  }
}

export function buildDefaultDialoguePerformancePayload(
  baseEmotion: AlicizationEmotion,
  overrides?: Partial<Pick<AlicizationDialoguePerformancePayload, 'facialCue' | 'actionCue' | 'delivery' | 'emphasis'>>,
) {
  const defaults: Record<AlicizationEmotion, { delivery: AlicizationDialoguePerformancePayload['delivery'], emphasis: 0 | 1 | 2 }> = {
    neutral: { delivery: 'calm', emphasis: 0 },
    happy: { delivery: 'energetic', emphasis: 1 },
    sad: { delivery: 'gentle', emphasis: 0 },
    angry: { delivery: 'firm', emphasis: 2 },
    concerned: { delivery: 'gentle', emphasis: 1 },
    tired: { delivery: 'calm', emphasis: 0 },
    apologetic: { delivery: 'hesitant', emphasis: 0 },
    surprised: { delivery: 'energetic', emphasis: 2 },
    thinking: { delivery: 'hesitant', emphasis: 0 },
  }
  const fallback = defaults[baseEmotion] ?? defaults.neutral

  return normalizeAlicizationPerformancePayload({
    baseEmotion,
    facialCue: overrides?.facialCue ?? null,
    actionCue: overrides?.actionCue ?? null,
    delivery: overrides?.delivery ?? fallback.delivery,
    emphasis: overrides?.emphasis ?? fallback.emphasis,
  }, baseEmotion)
}

export function alignDialoguePerformanceEmotion(
  performance: unknown,
  emotion: AlicizationEmotion,
): AlicizationDialoguePerformancePayload {
  const normalized = normalizeAlicizationPerformancePayload(performance, emotion)
  return {
    ...normalized,
    baseEmotion: emotion,
    emotion,
  }
}

function areDialoguePerformancesEqual(
  left: AlicizationDialoguePerformancePayload,
  right: AlicizationDialoguePerformancePayload,
) {
  return left.baseEmotion === right.baseEmotion
    && left.delivery === right.delivery
    && left.emphasis === right.emphasis
    && (left.actionCue ?? null) === (right.actionCue ?? null)
    && (left.facialCue ?? null) === (right.facialCue ?? null)
}

function resolveResidentFallbackDialoguePerformance(
  performance: AlicizationDialoguePerformancePayload,
  residentPerformance?: AlicizationDialoguePerformancePayload | null,
) {
  const candidate = normalizeAlicizationPerformancePayload(performance, performance.baseEmotion)
  if (!residentPerformance)
    return candidate

  const resident = normalizeAlicizationPerformancePayload(
    residentPerformance,
    residentPerformance.baseEmotion,
  )
  const candidateSparse = !candidate.actionCue || !candidate.facialCue
  const candidateNeutralBaseline = candidate.baseEmotion === 'neutral'
    && candidate.delivery === 'calm'
    && candidate.emphasis === 0
  if (!candidateSparse && !candidateNeutralBaseline)
    return candidate

  const mergedEmotion = candidateNeutralBaseline
    ? resident.baseEmotion
    : candidate.baseEmotion

  return normalizeAlicizationPerformancePayload({
    baseEmotion: mergedEmotion,
    emotion: mergedEmotion,
    facialCue: candidate.facialCue ?? resident.facialCue ?? null,
    actionCue: candidate.actionCue ?? resident.actionCue ?? null,
    delivery: candidateNeutralBaseline ? resident.delivery : candidate.delivery,
    emphasis: candidateNeutralBaseline ? resident.emphasis : candidate.emphasis,
  }, mergedEmotion)
}

function applyDialoguePerformanceSeedToEmbodiment(
  embodiment: AlicizationDialogueEmbodimentEnvelope,
  seededPerformance: AlicizationDialoguePerformancePayload,
): AlicizationDialogueEmbodimentEnvelope {
  const normalizedSeeded = normalizeAlicizationPerformancePayload(
    seededPerformance,
    seededPerformance.baseEmotion,
  )
  if (
    embodiment.emotion === normalizedSeeded.baseEmotion
    && areDialoguePerformancesEqual(embodiment.performance, normalizedSeeded)
  ) {
    return embodiment
  }

  return {
    ...embodiment,
    emotion: normalizedSeeded.baseEmotion,
    performance: {
      ...normalizedSeeded,
      baseEmotion: normalizedSeeded.baseEmotion,
      emotion: normalizedSeeded.baseEmotion,
    },
  }
}

export function normalizeDialogueStructuredFormat(raw: unknown, fallback?: AlicizationDialogueStructuredFormat) {
  const candidate = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  const normalized = supportedDialogueStructuredFormats.find(format => format === candidate)
  return normalized ?? fallback
}

export interface AlicizationChatStreamEmbodimentMeta {
  governance: AlicizationMindTurnGovernance | null
  embodiment: AlicizationDialogueEmbodimentEnvelope | null
  speechTimeline: AlicizationDialogueSpeechTimeline | null
  digitalLife: AlicizationDialogueStructuredPayload['digitalLife']
}

export function buildAlicizationChatStreamEmbodimentMeta(input: {
  governance?: unknown
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null
  residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  reply?: string
  thought?: string
  turnId?: string
}): AlicizationChatStreamEmbodimentMeta {
  const governance = normalizeMindTurnGovernance(input.governance)
  if (!governance) {
    return {
      governance: null,
      embodiment: null,
      speechTimeline: null,
      digitalLife: null,
    }
  }

  const reply = readStringValue(input.reply).trim()
  const thought = readStringValue(input.thought).trim()
  const resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
    governance,
    performanceManifest: input.performanceManifest,
    reply,
    thought,
    turnId: input.turnId,
  })
  const residentSeededPerformance = resolveResidentFallbackDialoguePerformance(
    resolvedEmbodiment.performance,
    input.residentPerformance?.performance,
  )
  const embodiment = applyDialoguePerformanceSeedToEmbodiment(
    resolvedEmbodiment,
    residentSeededPerformance,
  )
  const speechTimeline = buildAlicizationDialogueSpeechTimeline({
    reply,
    candidateEmotion: embodiment.emotion,
    candidatePerformance: embodiment.performance,
    embodiment,
    performanceManifest: input.performanceManifest,
  })

  return {
    governance,
    embodiment,
    speechTimeline,
    digitalLife: buildAlicizationDigitalLifeEnvelope({
      embodiment,
      speechTimeline,
      performanceManifest: input.performanceManifest,
    }),
  }
}

export function normalizeProactiveMetadata(raw: unknown): AlicizationProactiveMetadata | undefined {
  const candidate = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
  if (!candidate)
    return undefined
  const scenario = typeof candidate?.scenario === 'string'
    && ['coding', 'media', 'late-night-care', 'general'].includes(candidate.scenario)
    ? candidate.scenario as AlicizationProactiveMetadata['scenario']
    : null
  const style = typeof candidate?.style === 'string'
    && ['silent-observe', 'light-nudge', 'gentle-care', 'firm-warning'].includes(candidate.style)
    ? candidate.style as AlicizationProactiveMetadata['style']
    : null
  const urgency = typeof candidate?.urgency === 'string'
    && ['low', 'medium', 'high'].includes(candidate.urgency)
    ? candidate.urgency as AlicizationProactiveMetadata['urgency']
    : null
  if (!scenario || !style || !urgency)
    return undefined

  const rawReasonCodes = Array.isArray(candidate.reasonCodes) ? candidate.reasonCodes : []
  const reasonCodes = rawReasonCodes
    .filter((reasonCode): reasonCode is AlicizationProactiveMetadata['reasonCodes'][number] => {
      return typeof reasonCode === 'string' && [
        'busy-host',
        'fullscreen-host',
        'kill-switch-suspended',
        'global-cooldown-active',
        'attention-anchor-active',
        'recent-observation-memory',
        'invited-inspection-active',
        'scenario-bias-raised',
        'recent-ignored-penalty',
        'recent-dismiss-penalty',
        'recent-positive-feedback',
        'coding-focus',
        'media-playback',
        'late-night-activity',
        'late-night-fatigue',
        'high-loneliness',
        'high-boredom',
        'user-idle',
        'foreground-error',
        'foreground-diff',
        'reminder-backlog',
        'afterglow-opening',
        'durability-pulse',
        'durability-process-gone',
        'durability-anr-likely',
        'private-thought-observe-only',
        'private-thought-uncertain',
        'watch-mode-symbiotic',
        'watch-mode-invited-inspection',
        'watch-mode-recovering',
      ].includes(reasonCode)
    })

  const confidence = Number(candidate.confidence)
  const cooldownMs = Number(candidate.cooldownMs)
  const feedbackWindowMs = Number(candidate.feedbackWindowMs)
  const policyVersion = readStringValue(candidate.policyVersion).trim()
  if (!policyVersion || !Number.isFinite(confidence) || !Number.isFinite(cooldownMs) || !Number.isFinite(feedbackWindowMs))
    return undefined

  return {
    shouldInterrupt: candidate.shouldInterrupt === true,
    confidence: Number(clamp01(confidence).toFixed(2)),
    reasonCodes,
    urgency,
    style,
    cooldownMs: Math.max(1_000, Math.floor(cooldownMs)),
    scenario,
    policyVersion,
    feedbackWindowMs: Math.max(1_000, Math.floor(feedbackWindowMs)),
  }
}

export const mindTurnSpineMarkers = ['obligation=', 'truth=', 'focus=', 'move=', 'tone='] as const

export function hasMindTurnSpine(raw: string) {
  const normalized = raw.trim().toLowerCase()
  if (!normalized)
    return false
  return mindTurnSpineMarkers.every(marker => normalized.includes(marker))
}

export function normalizeMindTurnGovernance(raw: unknown): AlicizationMindTurnGovernance | null {
  const candidate = raw && typeof raw === 'object' && !Array.isArray(raw)
    ? raw as Record<string, unknown>
    : null
  if (!candidate)
    return null

  const turnMode = readStringValue(candidate.turnMode).trim()
  const truthState = readStringValue(candidate.truthState).trim()
  const personaKernelMode = readStringValue(candidate.personaKernelMode).trim()
  const openingStyle = readStringValue(candidate.openingStyle).trim()
  const relationshipPosture = readStringValue(candidate.relationshipPosture).trim()
  const repairState = readStringValue(candidate.repairState).trim()
  if (
    ![
      'grounded-inspection',
      'screen-repair',
      'guide-current-knot',
      'care',
      'accompany',
      'answer',
    ].includes(turnMode)
    || !['live-grounded', 'live-observed', 'remembered', 'imagined', 'uncertain'].includes(truthState)
    || !['full', 'backgrounded', 'muted'].includes(personaKernelMode)
    || ![
      'direct-observation',
      'direct-correction',
      'direct-answer',
      'gentle-care',
      'light-accompaniment',
    ].includes(openingStyle)
    || !['restrained', 'warm', 'tender'].includes(relationshipPosture)
    || !['none', 'stale-anchor', 'need-reground'].includes(repairState)
  ) {
    return null
  }

  const answerAct = readStringValue(candidate.answerAct).trim()
  const evidenceMode = readStringValue(candidate.evidenceMode).trim()
  const mindMode = readStringValue(candidate.mindMode).trim()
  const embodiedPresence = readStringValue(candidate.embodiedPresence).trim()
  const emotionalTension = readStringValue(candidate.emotionalTension).trim()
  const answerSubject = readStringValue(candidate.answerSubject).trim()
  const screenReferenceMode = readStringValue(candidate.screenReferenceMode).trim()
  const maxSentences = Number(candidate.maxSentences)
  const mustDo = Array.isArray(candidate.mustDo)
    ? candidate.mustDo.map(item => readStringValue(item).trim()).filter(Boolean).slice(0, 8)
    : []
  const mustNotDo = Array.isArray(candidate.mustNotDo)
    ? candidate.mustNotDo.map(item => readStringValue(item).trim()).filter(Boolean).slice(0, 8)
    : []
  const dialogueActKernel = normalizeDialogueActKernel(candidate.dialogueActKernel)
  const mindTurnFrame = normalizeMindTurnFrame(candidate.mindTurnFrame)
  const claimEvidence = normalizeClaimEvidenceLedger(candidate.claimEvidence)
  const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(candidate.decisionTraceId)

  return {
    decisionTraceId: decisionTraceId || null,
    turnMode: turnMode as AlicizationMindTurnGovernance['turnMode'],
    truthState: truthState as AlicizationMindTurnGovernance['truthState'],
    groundedThisTurn: candidate.groundedThisTurn === true,
    personaKernelMode: personaKernelMode as AlicizationMindTurnGovernance['personaKernelMode'],
    openingStyle: openingStyle as AlicizationMindTurnGovernance['openingStyle'],
    relationshipPosture: relationshipPosture as AlicizationMindTurnGovernance['relationshipPosture'],
    answerSubject: [
      'alicization-self',
      'relationship',
      'host-state',
      'task-knot',
      'visible-scene',
      'general',
    ].includes(answerSubject)
      ? answerSubject as AlicizationMindTurnGovernance['answerSubject']
      : null,
    screenReferenceMode: [
      'required',
      'helpful',
      'incidental',
      'avoid',
    ].includes(screenReferenceMode)
      ? screenReferenceMode as AlicizationMindTurnGovernance['screenReferenceMode']
      : null,
    answerAct: [
      'answer',
      'guide',
      'ask-reground',
      'correct-stale-anchor',
      'care',
      'defer',
    ].includes(answerAct)
      ? answerAct as AlicizationMindTurnGovernance['answerAct']
      : null,
    evidenceMode: [
      'live-grounded',
      'live-observed',
      'coarse-held',
      'dialogue-grounded',
      'continuity-carry',
      'repair-first',
    ].includes(evidenceMode)
      ? evidenceMode as AlicizationMindTurnGovernance['evidenceMode']
      : null,
    repairState: repairState as AlicizationMindTurnGovernance['repairState'],
    liveSurface: sanitizeBriefText(readStringValue(candidate.liveSurface), 220) || null,
    focusAnchor: sanitizeBriefText(readStringValue(candidate.focusAnchor), 220) || null,
    answerIntent: sanitizeBriefText(readStringValue(candidate.answerIntent), 220) || null,
    openingMove: sanitizeBriefText(readStringValue(candidate.openingMove), 220) || null,
    carriedThread: sanitizeBriefText(readStringValue(candidate.carriedThread), 220) || null,
    suppressAssociativeRecall: candidate.suppressAssociativeRecall === true,
    labelCarryAsMemory: candidate.labelCarryAsMemory === true,
    shouldAskForGrounding: candidate.shouldAskForGrounding === true,
    shouldAcknowledgeRepair: candidate.shouldAcknowledgeRepair === true,
    maxSentences: Number.isFinite(maxSentences)
      ? Math.max(1, Math.min(4, Math.floor(maxSentences)))
      : 2,
    mindMode: [
      'orienting',
      'tracking',
      'repairing',
      'accompanying',
      'guarding',
      'resting',
    ].includes(mindMode)
      ? mindMode as AlicizationMindTurnGovernance['mindMode']
      : null,
    embodiedPresence: [
      'none',
      'glance',
      'attentive',
      'hesitant',
      'concerned',
    ].includes(embodiedPresence)
      ? embodiedPresence as AlicizationMindTurnGovernance['embodiedPresence']
      : undefined,
    emotionalTension: [
      'tense-debug',
      'focused-flow',
      'soft-covision',
      'late-night-drain',
      'restless-switching',
      'calm-browse',
    ].includes(emotionalTension)
      ? emotionalTension as AlicizationMindTurnGovernance['emotionalTension']
      : undefined,
    dialogueActKernel,
    mindTurnFrame,
    claimEvidence,
    mustDo,
    mustNotDo,
  }
}

export function sanitizeMindThoughtToken(raw: string | null | undefined, fallback: string) {
  const normalized = sanitizeBriefText(raw ?? '', 64).toLowerCase().replace(/\s+/g, '-')
  return normalized || fallback
}

export function resolveMindGovernanceObligation(governance: AlicizationMindTurnGovernance) {
  switch (governance.answerAct ?? governance.mindTurnFrame?.obligation.answerAct) {
    case 'guide':
      return 'guide'
    case 'care':
      return 'care'
    case 'correct-stale-anchor':
    case 'ask-reground':
      return 'repair'
    case 'defer':
      return 'accompany'
    default:
      break
  }

  switch (governance.turnMode) {
    case 'guide-current-knot':
      return 'guide'
    case 'care':
      return 'care'
    case 'accompany':
      return 'accompany'
    case 'screen-repair':
      return 'repair'
    default:
      return 'answer'
  }
}

export function resolveMindGovernanceTruth(governance: AlicizationMindTurnGovernance) {
  if (governance.groundedThisTurn === true)
    return 'grounded'

  switch (governance.mindTurnFrame?.world.truthState ?? governance.truthState) {
    case 'live-grounded':
      return 'grounded'
    case 'live-observed':
      return 'coarse'
    case 'remembered':
      return 'memory'
    default:
      return 'uncertain'
  }
}

export function resolveMindGovernanceTone(governance: AlicizationMindTurnGovernance) {
  switch (governance.mindTurnFrame?.relation.relationshipPosture ?? governance.relationshipPosture) {
    case 'restrained':
      return 'restrained'
    case 'tender':
      return 'tender'
    default:
      return governance.turnMode === 'guide-current-knot' || governance.repairState !== 'none'
        ? 'direct'
        : 'warm'
  }
}

export function resolveMindGovernanceEmotion(governance: AlicizationMindTurnGovernance, rawEmotion: string) {
  const normalized = normalizeAlicizationEmotion(rawEmotion).emotion
  if (governance.repairState === 'stale-anchor')
    return 'apologetic' as const
  if (governance.repairState === 'need-reground')
    return 'thinking' as const
  if (governance.answerAct === 'care' || governance.turnMode === 'care')
    return 'concerned' as const
  if (
    governance.answerAct === 'guide'
    || governance.turnMode === 'guide-current-knot'
    || governance.turnMode === 'grounded-inspection'
  ) {
    return normalized === 'neutral' ? 'thinking' : normalized
  }
  if (normalized !== 'neutral')
    return normalized
  return (governance.mindTurnFrame?.relation.relationshipPosture ?? governance.relationshipPosture) === 'tender'
    ? 'concerned'
    : 'neutral'
}

export function buildGovernedMindThought(governance: AlicizationMindTurnGovernance, payload: AlicizationConversationTurnInput) {
  const focus = sanitizeMindThoughtToken(
    governance.mindTurnFrame?.focusAnchor
    || governance.mindTurnFrame?.world.visibleSurface
    || governance.mindTurnFrame?.memory.carriedThread
    || governance.mindTurnFrame?.obligation.answerIntent
    || governance.focusAnchor
    || (governance.screenReferenceMode === 'avoid' ? null : governance.liveSurface)
    || governance.answerIntent
    || governance.carriedThread
    || payload.userText,
    'current-user-turn',
  )
  const move = sanitizeMindThoughtToken(
    governance.mindTurnFrame?.obligation.openingMove
    || governance.mindTurnFrame?.obligation.answerIntent
    || governance.mindTurnFrame?.focusAnchor
    || governance.mindTurnFrame?.world.visibleSurface
    || governance.openingMove
    || governance.answerIntent
    || governance.focusAnchor
    || (governance.screenReferenceMode === 'avoid' ? null : governance.liveSurface),
    'stabilize-and-answer',
  )
  return [
    `obligation=${resolveMindGovernanceObligation(governance)}`,
    `truth=${resolveMindGovernanceTruth(governance)}`,
    `focus=${focus}`,
    `move=${move}`,
    `tone=${resolveMindGovernanceTone(governance)}`,
  ].join('; ')
}

export function readMindThoughtMarker(thought: string, marker: 'obligation=' | 'truth=' | 'tone=') {
  const escapedMarker = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = thought.match(new RegExp(`${escapedMarker}\\s*([^;\\n]+)`, 'i'))
  return match?.[1]?.trim().toLowerCase() ?? ''
}

export function thoughtConflictsWithMindGovernance(thought: string, governance: AlicizationMindTurnGovernance) {
  if (!hasMindTurnSpine(thought))
    return true

  return readMindThoughtMarker(thought, 'obligation=') !== resolveMindGovernanceObligation(governance)
    || readMindThoughtMarker(thought, 'truth=') !== resolveMindGovernanceTruth(governance)
    || (
      (governance.relationshipPosture === 'restrained' || governance.repairState !== 'none')
      && readMindThoughtMarker(thought, 'tone=') !== resolveMindGovernanceTone(governance)
    )
}

export type LocalizedMessageTree = Record<string, unknown>

export const governedMindFallbackLocale = resolveLocalePreference(
  typeof app.getLocale === 'function' ? app.getLocale() : undefined,
  'en',
)
export const governedMindLocalizedMessages = messages as Record<string, LocalizedMessageTree>
export const governedMindFallbackMessageFallbacks = {
  'en': {
    'mind-fallback.focus-default': 'the current thing',
    'mind-fallback.repair-stale-anchor': 'Let me correct that first: what I used before was a stale anchor, so I should not keep treating it as your current screen.',
    'mind-fallback.repair-need-reground': 'Let me hold the truth boundary first: I do not have a stable enough live view this turn, so I will not treat older memory as your current screen.',
    'mind-fallback.dialogue-boundary-memory': 'This turn I will stay with what you just said instead of forcing an old screen or thread back over it.',
    'mind-fallback.care-body': 'You do not have to sort it out first. I am here with you, and if you want, you can tell me what hit you this way.',
    'mind-fallback.accompany-body': 'I heard this clearly. If you want, stay here with me a little, or tell me the part that is catching on you.',
    'mind-fallback.answer-repair-body': 'What I meant is this: I should answer your current turn plainly, not keep dragging an old screen thread forward as if it were now.',
    'mind-fallback.answer-dialogue-body': 'So I will answer your current turn plainly and keep the reply on this line.',
    'mind-fallback.guide-opening': 'Let me lock onto the current point first: {focus}.',
    'mind-fallback.guide-opening-plain': 'Let me lock onto the current point first.',
    'mind-fallback.care-opening': 'Let me answer from your current state first: {focus}.',
    'mind-fallback.care-opening-plain': 'Let me answer your current state directly first.',
    'mind-fallback.accompany-opening': 'Let me hold this line with you first: {focus}.',
    'mind-fallback.accompany-opening-plain': 'Let me stay with this line directly first.',
    'mind-fallback.observation-opening': 'I can see this now: {focus}.',
    'mind-fallback.observation-opening-plain': 'I can see it clearly now.',
    'mind-fallback.answer-opening': 'Let me answer from what is in front of you first: {focus}.',
    'mind-fallback.answer-opening-plain': 'Let me answer directly.',
    'mind-fallback.carry-memory': 'I am still holding the previous line, {carry}, but that is carried continuity, not a claim about what is literally on your screen right now.',
    'mind-fallback.reground-note': 'If you want me to get specific about the current screen, I will reground on the fresh view from this turn.',
  },
  'zh-Hans': {
    'mind-fallback.focus-default': '当前这件事',
    'mind-fallback.repair-stale-anchor': '我先纠正一下：刚才那是旧锚点，不该继续当成你现在的画面。',
    'mind-fallback.repair-need-reground': '我先守住真实边界：这轮没有足够稳的实时画面根据，我不把旧记忆当成当前屏幕。',
    'mind-fallback.dialogue-boundary-memory': '这轮我先留在你刚才这句话里，不把旧画面或旧线程硬套回现在。',
    'mind-fallback.care-body': '你不用先把话整理好，我先陪你把这一下接住；如果你愿意，就把让你难受的那件事慢慢告诉我。',
    'mind-fallback.accompany-body': '我听见你这句了。你想让我安静陪着你一会儿，还是把卡住你的那一点慢慢说给我？',
    'mind-fallback.answer-repair-body': '我刚才那句真正的意思是：这轮我该先正面回答你，不该把旧画面或旧线程继续当成现在。',
    'mind-fallback.answer-dialogue-body': '那我就把这句正面说清，不把话题再滑回别的线。',
    'mind-fallback.guide-opening': '先抓当前这个点：{focus}。',
    'mind-fallback.guide-opening-plain': '先抓住当前这个点。',
    'mind-fallback.care-opening': '我先按你现在的状态说：{focus}。',
    'mind-fallback.care-opening-plain': '我先直接接住你这句。',
    'mind-fallback.accompany-opening': '我先陪你把这条线稳住：{focus}。',
    'mind-fallback.accompany-opening-plain': '我先直接接你这句。',
    'mind-fallback.observation-opening': '我现在看到的是：{focus}。',
    'mind-fallback.observation-opening-plain': '我现在能看清这一幕。',
    'mind-fallback.answer-opening': '先按你眼前这件事说：{focus}。',
    'mind-fallback.answer-opening-plain': '我直接说。',
    'mind-fallback.carry-memory': '我还记着上一条线是 {carry}，但那是我还在续持的线程，不是我断定你现在屏幕上的内容。',
    'mind-fallback.reground-note': '如果你要我具体到当前屏幕细节，我会按这次的新画面重新落地。',
  },
} as const

export function readGovernedMindMessage(path: string, locale: string) {
  const readFromTree = (tree: LocalizedMessageTree | undefined) => path
    .split('.')
    .reduce<unknown>((current, segment) => {
      if (!current || typeof current !== 'object' || Array.isArray(current))
        return undefined
      return (current as LocalizedMessageTree)[segment]
    }, tree)

  const localized = readFromTree(governedMindLocalizedMessages[locale])
  if (typeof localized === 'string')
    return localized

  const fallback = readFromTree(governedMindLocalizedMessages.en)
  return typeof fallback === 'string' ? fallback : null
}

export function formatGovernedMindMessage(template: string, params?: Record<string, unknown>) {
  if (!params)
    return template

  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in params))
      return `{${key}}`
    const value = params[key]
    return value == null ? '' : String(value)
  })
}

export function inferGovernedMindFallbackLocaleForUserText(userText?: string) {
  const normalized = sanitizeBriefText(userText ?? '', 240)
  if (!normalized)
    return governedMindFallbackLocale
  if (/[\u4E00-\u9FFF]/u.test(normalized))
    return 'zh-Hans'
  if (/[\u3040-\u30FF]/u.test(normalized))
    return 'ja'
  if (/[\uAC00-\uD7AF]/u.test(normalized))
    return 'ko'
  if (/[\u0400-\u04FF]/u.test(normalized))
    return 'ru'
  return governedMindFallbackLocale
}

export function translateGovernedMindFallback(path: string, params?: Record<string, unknown>, userText?: string) {
  const candidatePaths = [path, `chat.${path}`]
  const preferredLocale = inferGovernedMindFallbackLocaleForUserText(userText)
  for (const candidatePath of candidatePaths) {
    const localized = readGovernedMindMessage(candidatePath, preferredLocale)
    if (localized)
      return formatGovernedMindMessage(localized, params)
  }

  const localizedFallback
    = governedMindFallbackMessageFallbacks[preferredLocale as keyof typeof governedMindFallbackMessageFallbacks]?.[path as keyof typeof governedMindFallbackMessageFallbacks.en]
      ?? governedMindFallbackMessageFallbacks.en[path as keyof typeof governedMindFallbackMessageFallbacks.en]
  if (localizedFallback)
    return formatGovernedMindMessage(localizedFallback, params)

  return candidatePaths.at(-1) ?? path
}

export type DialogueScriptFamily = 'none' | 'mixed' | 'cjk' | 'cyrillic' | 'latin'

export function countScriptCharacters(raw: string, pattern: RegExp) {
  return raw.match(pattern)?.length ?? 0
}

export function inferDominantDialogueScript(raw: unknown): DialogueScriptFamily {
  const normalized = sanitizeBriefText(readStringValue(raw), 1_200)
  if (!normalized)
    return 'none'

  const cjkCount = countScriptCharacters(normalized, /[\u4E00-\u9FFF\u3040-\u30FF\uAC00-\uD7AF]/gu)
  const cyrillicCount = countScriptCharacters(normalized, /[\u0400-\u04FF]/gu)
  const latinCount = countScriptCharacters(normalized, /[A-Z]/gi)
  const total = cjkCount + cyrillicCount + latinCount
  if (total < 6)
    return 'none'

  const ranked = [
    { family: 'cjk', count: cjkCount },
    { family: 'cyrillic', count: cyrillicCount },
    { family: 'latin', count: latinCount },
  ].sort((left, right) => right.count - left.count)
  const primary = ranked[0]
  const secondary = ranked[1]
  if (!primary || primary.count === 0)
    return 'none'
  if (primary.count / total < 0.56)
    return 'mixed'
  if (secondary && secondary.count > 0 && (primary.count / secondary.count) < 1.35)
    return 'mixed'
  return primary.family as DialogueScriptFamily
}

export function countLatinWordTokens(raw: string) {
  return (raw.match(/[A-Z]+/gi) ?? []).length
}

export function replyScriptMismatchesUserTurn(input: {
  userText?: string
  reply: string
}) {
  const userText = sanitizeBriefText(input.userText ?? '', 480)
  const reply = sanitizeBriefText(input.reply, 1_400)
  if (!userText || !reply)
    return false

  const userScript = inferDominantDialogueScript(userText)
  const replyScript = inferDominantDialogueScript(reply)
  if (userScript === 'none' || userScript === 'mixed')
    return false
  if (replyScript === 'none' || replyScript === 'mixed')
    return false
  if (userScript === replyScript)
    return false

  const replyLength = [...reply].length
  if (replyLength < 18)
    return false

  const userLatinWords = countLatinWordTokens(userText)
  const replyLatinWords = countLatinWordTokens(reply)

  if (userScript === 'cjk' && replyScript === 'latin')
    return replyLatinWords >= 6 && userLatinWords <= 6
  if (userScript === 'cyrillic' && replyScript === 'latin')
    return replyLatinWords >= 6
  if (userScript === 'latin' && (replyScript === 'cjk' || replyScript === 'cyrillic'))
    return countLatinWordTokens(userText) >= 4

  return true
}

export function normalizeGovernedAnchorText(raw: unknown) {
  if (typeof raw !== 'string')
    return ''
  return raw.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function replyIncludesAnchorCue(reply: string, cue: unknown) {
  const normalizedReply = normalizeGovernedAnchorText(reply)
  const normalizedCue = normalizeGovernedAnchorText(cue)
  if (!normalizedReply || !normalizedCue)
    return false
  return normalizedReply.includes(normalizedCue)
}

export function excerptGovernedReply(raw: unknown, maxChars = 220) {
  const normalized = sanitizeBriefText(readStringValue(raw), maxChars)
  return normalized || null
}

function summarizeMindTurnEventDigitalLifeSpine(raw: unknown) {
  const spine = normalizeAlicizationDigitalLifeSpineDigest(raw)
  if (!spine)
    return null

  return {
    version: spine.version,
    runtime: {
      watchMode: spine.runtime.watchMode,
      sceneScenario: spine.runtime.sceneScenario,
      activeThreadId: spine.runtime.activeThreadId,
      dominantMode: spine.runtime.dominantMode,
      answerIntent: spine.runtime.answerIntent,
      selectedAction: spine.runtime.selectedAction,
      updatedAt: spine.runtime.updatedAt,
    },
    architecture: spine.architecture
      ? {
          operatingMode: spine.architecture.operatingMode,
          dominantSystem: spine.architecture.dominantSystem,
          supportingSystems: spine.architecture.supportingSystems,
        }
      : null,
    proactive: spine.proactive
      ? {
          selectedAction: spine.proactive.selectedAction,
          preferredStyle: spine.proactive.preferredStyle,
          confidence: spine.proactive.confidence,
          shouldSpeak: spine.proactive.shouldSpeak,
          dominantConcernKind: spine.proactive.dominantConcernKind,
          leadingGoalId: spine.proactive.leadingGoalId,
        }
      : null,
    memory: spine.memory
      ? {
          recallMode: spine.memory.recallMode,
          recallSeed: excerptGovernedReply(spine.memory.recallSeed, 64),
          leadingGoalSummary: excerptGovernedReply(spine.memory.leadingGoalSummary, 120),
          thoughtThreadSummary: excerptGovernedReply(spine.memory.thoughtThreadSummary, 120),
        }
      : null,
    continuitySignal: spine.continuitySignal
      ? {
          signature: excerptGovernedReply(spine.continuitySignal.signature, 120),
          watchMode: spine.continuitySignal.watchMode,
          sceneScenario: spine.continuitySignal.sceneScenario,
          dominantMode: spine.continuitySignal.dominantMode,
          answerIntent: spine.continuitySignal.answerIntent,
        }
      : null,
  }
}

export interface AlicizationGovernanceAnchorAuditCandidate {
  role: 'focus' | 'visible-surface' | 'scene' | 'opening-claim' | 'answer-intent' | 'project' | 'thread' | 'carry'
  text: string
}

export function collectGovernanceAnchorAuditCandidates(governance: AlicizationMindTurnGovernance): AlicizationGovernanceAnchorAuditCandidate[] {
  const candidates: Array<{ role: AlicizationGovernanceAnchorAuditCandidate['role'], text: unknown }> = [
    { role: 'focus', text: governance.focusAnchor },
    { role: 'focus', text: governance.mindTurnFrame?.focusAnchor },
    { role: 'visible-surface', text: governance.liveSurface },
    { role: 'visible-surface', text: governance.mindTurnFrame?.world.visibleSurface },
    { role: 'scene', text: governance.dialogueActKernel?.selectedEvidence[0]?.summary },
    { role: 'opening-claim', text: governance.dialogueActKernel?.openingClaim ?? governance.mindTurnFrame?.obligation.openingClaim },
    { role: 'answer-intent', text: governance.answerIntent },
    { role: 'answer-intent', text: governance.mindTurnFrame?.obligation.answerIntent },
    { role: 'project', text: governance.dialogueActKernel?.activeProject },
    { role: 'thread', text: governance.mindTurnFrame?.memory.carriedThread },
    { role: 'carry', text: governance.carriedThread },
  ]

  const result: AlicizationGovernanceAnchorAuditCandidate[] = []
  for (const candidate of candidates) {
    const normalized = sanitizeDialogueAnchorText(candidate.text, 220)
    if (!normalized)
      continue
    if (result.some(item => item.role === candidate.role && item.text === normalized))
      continue
    result.push({
      role: candidate.role,
      text: normalized,
    })
  }
  return result
}

export function summarizeGovernanceAnchorAuditCandidates(candidates: AlicizationGovernanceAnchorAuditCandidate[]) {
  return candidates.map(candidate => `${candidate.role}:${candidate.text}`)
}

export const dialogueFirstRoleplayPrefacePattern = /^(?:主人(?:[，。…!！\s]|$)|……欸～主人|欸～主人|宝贝|亲爱的)[，。…!！\s]*/u
export const dialogueFirstStaleCarryClausePattern = /(?:那个|刚才那个|上一个|之前那个|之前那条|上一条).{0,8}(?:枚举|页面|浏览器|模块|窗口|线程|diff|改动|case)|\b(?:that|the previous|the old|earlier)\s+(?:enum|page|browser|module|window|thread|diff|change)\b/iu
export const dialogueFirstProcessOnlyReplyPattern = /^(?:那?我[先就再会]?|先)[\p{Script=Han}\p{Letter}\p{Number}\s,，。.!！?？]{0,16}(?:[看听陪]|看看|留在|接住|回答|说清|说)[\p{Script=Han}\p{Letter}\p{Number}\s,，。.!！?？]{0,8}$/u

export function splitDialogueReplyClauses(reply: string) {
  const clauses = reply.match(/[^。！？!?；;\n]+[。！？!?；;]*/gu) ?? [reply]
  return clauses
    .map(clause => clause.trim())
    .filter(Boolean)
}

export function replyLooksProcessOnlyRepairShell(reply: string) {
  const normalized = sanitizeBriefText(reply, 120)
  if (!normalized)
    return false
  if (/[你妳累]|这句|现在|这个|这件事|问题|事情|情绪|难过|伤心/u.test(normalized))
    return false
  return dialogueFirstProcessOnlyReplyPattern.test(normalized)
}

export function clauseMentionsCue(clause: string, cues: string[]) {
  return cues.some(cue => replyIncludesAnchorCue(clause, cue))
}

export function replyUsesWeakGroundedSceneCue(reply: string, governance: AlicizationMindTurnGovernance) {
  if (governance.screenReferenceMode === 'avoid')
    return false

  const answerSubject = governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null
  const screenCentricTurn = answerSubject === 'task-knot'
    || answerSubject === 'visible-scene'
    || governance.turnMode === 'guide-current-knot'
    || governance.turnMode === 'grounded-inspection'
    || governance.turnMode === 'screen-repair'
  if (!screenCentricTurn)
    return false

  const weakShellMentionedInReply = /\b(?:screen\s*\d+|display\s*\d*|window\s*\d*|workspace|desktop|current screen|current view|entire screen)\b/iu.test(reply)

  const weakCandidates = [
    governance.focusAnchor,
    governance.answerIntent,
    governance.liveSurface,
    governance.mindTurnFrame?.focusAnchor,
    governance.mindTurnFrame?.world.visibleSurface,
    governance.mindTurnFrame?.obligation.openingClaim,
    governance.mindTurnFrame?.obligation.answerIntent,
    governance.dialogueActKernel?.openingClaim,
    governance.dialogueActKernel?.activeProject,
    governance.dialogueActKernel?.selectedEvidence[0]?.summary,
    governance.dialogueActKernel?.mustSay[0],
  ]
    .map(candidate => sanitizeBriefText(readStringValue(candidate), 220))
    .filter(Boolean)
    .filter(candidate => isWeakAlicizationScreenSurfaceCue(candidate))

  const weakCueMentioned = weakCandidates.some(candidate => replyIncludesAnchorCue(reply, candidate))
  if (governance.groundedThisTurn === true)
    return weakShellMentionedInReply || weakCueMentioned

  const truthState = governance.mindTurnFrame?.world.truthState ?? governance.truthState
  const uncertainTruth = truthState === 'uncertain' || truthState === 'remembered' || truthState === 'imagined'
  return uncertainTruth && (weakShellMentionedInReply || weakCueMentioned)
}

export function reconcileMindGovernanceAnchors(governance: AlicizationMindTurnGovernance, userText?: string) {
  const anchorCandidatesBefore = collectGovernanceAnchorAuditCandidates(governance)
  const coherence = resolveDialogueAnchorCoherence({
    subject: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? governance.dialogueActKernel?.subject ?? null,
    screenReferenceMode: governance.screenReferenceMode ?? null,
    truthState: governance.mindTurnFrame?.world.truthState ?? governance.truthState,
    groundedThisTurn: governance.groundedThisTurn === true,
    hostMove: governance.mindTurnFrame?.relation.hostMove ?? null,
    candidates: anchorCandidatesBefore,
  })
  const dominantAnchor = coherence.dominant
  const keepCoherent = (value: unknown) => {
    const normalized = sanitizeDialogueAnchorText(value, 220) || null
    if (!normalized)
      return null
    if (!dominantAnchor || !coherence.sceneAuthority)
      return normalized
    return anchorsMateriallyConflict(normalized, dominantAnchor) ? null : normalized
  }
  const dialogueFirstTurn = governance.screenReferenceMode === 'avoid'

  const nextFocusAnchor = keepCoherent(dominantAnchor ?? governance.focusAnchor)
    ?? keepCoherent(dialogueFirstTurn ? null : governance.mindTurnFrame?.world.visibleSurface)
    ?? keepCoherent(dialogueFirstTurn ? null : governance.liveSurface)
    ?? sanitizeDialogueAnchorText(userText, 220)
    ?? null
  const nextAnswerIntent = keepCoherent(governance.mindTurnFrame?.obligation.answerIntent)
    ?? keepCoherent(governance.answerIntent)
    ?? nextFocusAnchor
  const nextCarriedThread = keepCoherent(governance.mindTurnFrame?.memory.carriedThread)
    ?? keepCoherent(governance.carriedThread)

  const nextMindTurnFrame = governance.mindTurnFrame
    ? {
        ...governance.mindTurnFrame,
        focusAnchor: nextFocusAnchor,
        memory: {
          ...governance.mindTurnFrame.memory,
          carriedThread: nextCarriedThread,
        },
        obligation: {
          ...governance.mindTurnFrame.obligation,
          answerIntent: nextAnswerIntent,
        },
        narrative: [
          ...governance.mindTurnFrame.narrative,
          ...coherence.reasonTags.filter(tag => !governance.mindTurnFrame?.narrative.includes(tag)),
        ].slice(0, 10),
      }
    : governance.mindTurnFrame

  const changed = nextFocusAnchor !== (governance.focusAnchor ?? null)
    || nextAnswerIntent !== (governance.answerIntent ?? null)
    || nextCarriedThread !== (governance.carriedThread ?? null)
    || nextMindTurnFrame?.focusAnchor !== governance.mindTurnFrame?.focusAnchor
    || nextMindTurnFrame?.memory.carriedThread !== governance.mindTurnFrame?.memory.carriedThread
    || nextMindTurnFrame?.obligation.answerIntent !== governance.mindTurnFrame?.obligation.answerIntent

  const nextGovernance = {
    ...governance,
    focusAnchor: nextFocusAnchor,
    answerIntent: nextAnswerIntent,
    carriedThread: nextCarriedThread,
    mindTurnFrame: nextMindTurnFrame,
    mustDo: [
      ...governance.mustDo,
      ...coherence.reasonTags
        .map(tag => `anchor:${tag}`)
        .filter(tag => !governance.mustDo.includes(tag)),
    ].slice(0, 8),
  } satisfies AlicizationMindTurnGovernance
  const anchorCandidatesAfter = collectGovernanceAnchorAuditCandidates(nextGovernance)

  return {
    governance: nextGovernance,
    coherence,
    changed,
    anchorCandidatesBefore,
    anchorCandidatesAfter,
  }
}

export function detectReplyConflictingAnchors(
  reply: string,
  governance: AlicizationMindTurnGovernance,
  preferredDominant?: string | null,
) {
  const coherence = resolveDialogueAnchorCoherence({
    subject: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? governance.dialogueActKernel?.subject ?? null,
    screenReferenceMode: governance.screenReferenceMode ?? null,
    truthState: governance.mindTurnFrame?.world.truthState ?? governance.truthState,
    groundedThisTurn: governance.groundedThisTurn === true,
    hostMove: governance.mindTurnFrame?.relation.hostMove ?? null,
    candidates: [
      { role: 'focus', text: governance.focusAnchor },
      { role: 'answer-intent', text: governance.answerIntent },
      { role: 'carry', text: governance.carriedThread },
      { role: 'scene', text: governance.dialogueActKernel?.selectedEvidence[0]?.summary },
      { role: 'visible-surface', text: governance.liveSurface },
    ],
  })
  const dominantAnchor = sanitizeBriefText(readStringValue(preferredDominant ?? coherence.dominant), 220) || null
  if (!dominantAnchor)
    return { hasConflict: false, reason: '', coherence }

  const conflictingCandidates = [
    governance.focusAnchor,
    governance.answerIntent,
    governance.carriedThread,
    governance.dialogueActKernel?.selectedEvidence[0]?.summary,
    governance.liveSurface,
  ]
    .map((candidate) => {
      const normalized = typeof candidate === 'string' ? sanitizeBriefText(candidate, 220) : ''
      return normalized || null
    })
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter(candidate => anchorsMateriallyConflict(candidate, dominantAnchor))
    .filter((candidate, index, items) => items.findIndex(item => item === candidate) === index)

  if (conflictingCandidates.length === 0) {
    return {
      hasConflict: false,
      reason: '',
      coherence,
      dominantAnchor,
      conflictingCandidates: [] as string[],
      mentionedConflicts: [] as string[],
    }
  }

  const mentionsDominant = replyIncludesAnchorCue(reply, dominantAnchor)
  const mentionedConflicts = conflictingCandidates.filter(candidate => replyIncludesAnchorCue(reply, candidate))
  const hasConflict = mentionedConflicts.length > 0
    && (mentionsDominant || coherence.sceneAuthority || governance.groundedThisTurn === true)

  return {
    hasConflict,
    reason: hasConflict
      ? (coherence.sceneAuthority || governance.groundedThisTurn === true
          ? 'reply-split-brain-scene-thread'
          : 'reply-conflicting-anchors')
      : '',
    coherence,
    dominantAnchor,
    conflictingCandidates,
    mentionedConflicts,
  }
}

export function extractForeignTechnicalReplyCues(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
}) {
  const replyCues = extractTechnicalSpecificityClaims(input.reply, 12)
  if (replyCues.length === 0)
    return []

  const allowedAnchors = collectAllowedTechnicalSpecificityCues({
    governance: input.governance,
    userText: input.userText,
  })

  return replyCues.filter((cue) => {
    const normalizedCue = normalizeTechnicalSpecificityCue(cue)
    if (!normalizedCue)
      return false
    return !allowedAnchors.some(anchor => technicalSpecificityCueMatches(anchor, cue))
  })
}

export function technicalSpecificityCueMatches(left: string, right: string) {
  const normalizedLeft = normalizeTechnicalSpecificityCue(left)
  const normalizedRight = normalizeTechnicalSpecificityCue(right)
  if (!normalizedLeft || !normalizedRight)
    return false
  if (normalizedLeft === normalizedRight)
    return true
  const shorterLength = Math.max(1, Math.min(normalizedLeft.length, normalizedRight.length))
  return (
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
    && shorterLength / Math.max(normalizedLeft.length, normalizedRight.length) >= 0.68
  )
}

export function uniqueTechnicalSpecificityCues(values: Array<string | null | undefined>, maxItems = 12) {
  const items: string[] = []
  for (const value of values) {
    const normalized = sanitizeBriefText(value ?? '', 120)
    const normalizedCue = normalizeTechnicalSpecificityCue(normalized)
    if (!normalized || !normalizedCue)
      continue
    if (items.some(item => technicalSpecificityCueMatches(item, normalized)))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

export function collectAllowedTechnicalSpecificityCues(input: {
  governance: AlicizationMindTurnGovernance
  userText?: string
}) {
  return uniqueTechnicalSpecificityCues([
    ...(input.governance.claimEvidence?.allowedSpecificCues ?? []),
    ...extractTechnicalSpecificityClaims(input.userText, 8),
    ...extractTechnicalSpecificityClaims(input.governance.focusAnchor, 8),
    ...extractTechnicalSpecificityClaims(input.governance.answerIntent, 8),
    ...extractTechnicalSpecificityClaims(input.governance.liveSurface, 8),
    ...extractTechnicalSpecificityClaims(input.governance.mindTurnFrame?.focusAnchor, 8),
    ...extractTechnicalSpecificityClaims(input.governance.mindTurnFrame?.relation.hostMove, 8),
    ...extractTechnicalSpecificityClaims(input.governance.mindTurnFrame?.obligation.answerIntent, 8),
    ...extractTechnicalSpecificityClaims(input.governance.dialogueActKernel?.openingClaim, 8),
    ...extractTechnicalSpecificityClaims(input.governance.dialogueActKernel?.selectedEvidence[0]?.summary, 8),
  ], 12)
}

export function analyzeUnsupportedTechnicalSpecificity(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
}) {
  const replyCues = uniqueTechnicalSpecificityCues(
    extractTechnicalSpecificityClaims(input.reply, 12),
    12,
  )
  if (replyCues.length === 0) {
    return {
      replyCues: [] as string[],
      allowedCues: [] as string[],
      unsupportedCues: [] as string[],
      shouldOverride: false,
    }
  }

  const allowedCues = collectAllowedTechnicalSpecificityCues({
    governance: input.governance,
    userText: input.userText,
  })
  const unsupportedCues = replyCues.filter(cue => !allowedCues.some(allowed => technicalSpecificityCueMatches(allowed, cue)))
  const screenCentricTurn = input.governance.screenReferenceMode !== 'avoid'
    && (
      input.governance.answerSubject === 'task-knot'
      || input.governance.answerSubject === 'visible-scene'
      || input.governance.turnMode === 'guide-current-knot'
      || input.governance.turnMode === 'grounded-inspection'
      || input.governance.turnMode === 'screen-repair'
    )
  const truthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject: input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation.subject ?? null,
    screenReferenceMode: input.governance.screenReferenceMode ?? null,
    truthState: input.governance.truthState,
    turnMode: input.governance.turnMode,
    repairState: input.governance.repairState,
    evidenceMode: input.governance.evidenceMode ?? input.governance.claimEvidence?.evidenceMode ?? null,
    labelCarryAsMemory: input.governance.labelCarryAsMemory,
    suppressAssociativeRecall: input.governance.suppressAssociativeRecall,
    claimEvidenceLedger: input.governance.claimEvidence ?? null,
    currentConsciousFrame: null,
  })

  return {
    replyCues,
    allowedCues,
    unsupportedCues,
    truthDisciplineMode: truthDiscipline.mode,
    shouldOverride: unsupportedCues.length > 0
      && (
        truthDiscipline.forbidUnsupportedSpecificity
        || screenCentricTurn
      ),
  }
}

export function analyzeDialogueFirstVisibleReply(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
}) {
  const truthDiscipline = deriveAlicizationTruthDiscipline({
    answerSubject: input.governance.answerSubject ?? input.governance.mindTurnFrame?.relation.subject ?? null,
    screenReferenceMode: input.governance.screenReferenceMode ?? null,
    truthState: input.governance.truthState,
    turnMode: input.governance.turnMode,
    repairState: input.governance.repairState,
    evidenceMode: input.governance.evidenceMode ?? input.governance.claimEvidence?.evidenceMode ?? null,
    labelCarryAsMemory: input.governance.labelCarryAsMemory,
    suppressAssociativeRecall: input.governance.suppressAssociativeRecall,
    claimEvidenceLedger: input.governance.claimEvidence ?? null,
    currentConsciousFrame: null,
  })
  if (!truthDiscipline.dialogueFirst) {
    return {
      overlapRatio: 1,
      roleplayPreface: false,
      staleCarryReference: false,
      sceneCueMentions: [] as string[],
      foreignTechnicalCues: [] as string[],
      truthDisciplineMode: truthDiscipline.mode,
      contaminated: false,
    }
  }

  const focusAnchors = uniqueCarryAnchors([
    input.userText,
    input.governance.focusAnchor,
    input.governance.answerIntent,
    input.governance.mindTurnFrame?.relation.hostMove,
    input.governance.mindTurnFrame?.obligation.answerIntent,
  ], 8)
  const overlapRatio = focusAnchors.length === 0
    ? 0
    : measureDialogueFocusAlignment({
      message: input.reply,
      contextPhrases: focusAnchors,
    }).overlapRatio
  const sceneEvidenceCues = (input.governance.dialogueActKernel?.selectedEvidence ?? [])
    .filter((item) => {
      if (!item?.summary)
        return false
      if (item.kind === 'scene')
        return item.source === 'current-scene' || item.source === 'world-model' || item.source === 'appraisal'
      if (item.kind === 'project')
        return item.source === 'current-scene' || item.source === 'world-model'
      return false
    })
    .map(item => item.summary)
  const sceneCueMentions = uniqueCarryAnchors([
    input.governance.liveSurface,
    input.governance.mindTurnFrame?.world.visibleSurface,
    ...sceneEvidenceCues,
  ], 6).filter((cue) => {
    if (!replyIncludesAnchorCue(input.reply, cue))
      return false
    return measureDialogueFocusAlignment({
      message: cue,
      contextPhrases: focusAnchors,
    }).overlapRatio < 0.34
  })
  const roleplayPreface = /^(?:主人(?:[，。…!！\s]|$)|……欸～主人|欸～主人|宝贝|亲爱的)/u.test(input.reply.trim())
  const staleCarryReference = /(?:那个|刚才那个|上一个|之前那个|之前那条|上一条).{0,8}(?:枚举|页面|浏览器|模块|窗口|线程|diff|改动|case)|\b(?:that|the previous|the old|earlier)\s+(?:enum|page|browser|module|window|thread|diff|change)\b/iu.test(input.reply)
  const foreignTechnicalCues = extractForeignTechnicalReplyCues(input)

  return {
    overlapRatio,
    roleplayPreface,
    staleCarryReference,
    sceneCueMentions,
    foreignTechnicalCues,
    truthDisciplineMode: truthDiscipline.mode,
    contaminated: roleplayPreface
      || staleCarryReference
      || (sceneCueMentions.length > 0 && overlapRatio < 0.34)
      || foreignTechnicalCues.length > 0,
  }
}

export function repairDialogueFirstVisibleReply(input: {
  reply: string
  userText?: string
  governance: AlicizationMindTurnGovernance
  analysis: ReturnType<typeof analyzeDialogueFirstVisibleReply>
}) {
  if (!input.analysis.contaminated) {
    return {
      applied: false,
      reply: input.reply,
      analysis: input.analysis,
      reason: null as string | null,
      droppedClauses: [] as string[],
    }
  }

  const repairReasons: string[] = []
  const trimmedReply = input.reply.trim()
  const withoutPreface = trimmedReply.replace(dialogueFirstRoleplayPrefacePattern, '').trim()
  if (withoutPreface !== trimmedReply)
    repairReasons.push('removed-roleplay-preface')

  const contaminationCues = uniqueCarryAnchors([
    ...input.analysis.sceneCueMentions,
    ...input.analysis.foreignTechnicalCues,
  ], 10)
  const clauses = splitDialogueReplyClauses(withoutPreface || trimmedReply)
  const keptClauses: string[] = []
  const droppedClauses: string[] = []

  for (const clause of clauses) {
    if (!clause)
      continue
    const dropForStaleCarry = dialogueFirstStaleCarryClausePattern.test(clause)
    const dropForContaminationCue = contaminationCues.length > 0 && clauseMentionsCue(clause, contaminationCues)
    if (dropForStaleCarry || dropForContaminationCue) {
      droppedClauses.push(clause)
      if (dropForStaleCarry)
        repairReasons.push('pruned-stale-carry-clause')
      if (dropForContaminationCue)
        repairReasons.push('pruned-contaminated-anchor-clause')
      continue
    }
    keptClauses.push(clause)
  }

  const repairedReply = sanitizeBriefText(
    keptClauses.join(' ').replace(/\s+([。！？!?；;])/gu, '$1'),
    2_000,
  )
  if (!repairedReply || repairedReply === trimmedReply || replyLooksProcessOnlyRepairShell(repairedReply)) {
    return {
      applied: false,
      reply: input.reply,
      analysis: input.analysis,
      reason: repairReasons.length > 0 ? uniqueCarryAnchors(repairReasons, 4).join('|') : null,
      droppedClauses,
    }
  }

  const repairedAnalysis = analyzeDialogueFirstVisibleReply({
    reply: repairedReply,
    userText: input.userText,
    governance: input.governance,
  })
  if (repairedAnalysis.contaminated) {
    return {
      applied: false,
      reply: input.reply,
      analysis: input.analysis,
      reason: repairReasons.length > 0 ? uniqueCarryAnchors(repairReasons, 4).join('|') : null,
      droppedClauses,
    }
  }

  return {
    applied: true,
    reply: repairedReply,
    analysis: repairedAnalysis,
    reason: uniqueCarryAnchors(repairReasons, 4).join('|') || 'local-dialogue-first-repair',
    droppedClauses,
  }
}

export function resolveGovernanceTurnOwner(governance?: AlicizationMindTurnGovernance | null) {
  if (!governance)
    return null
  if (governance.screenReferenceMode === 'avoid')
    return 'dialogue'

  const subject = governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null
  if (
    subject === 'task-knot'
    || subject === 'visible-scene'
    || governance.turnMode === 'grounded-inspection'
    || governance.turnMode === 'screen-repair'
    || governance.turnMode === 'guide-current-knot'
  ) {
    return 'screen'
  }

  return 'dialogue'
}

export function isExplicitGovernanceRepairTurn(governance: AlicizationMindTurnGovernance) {
  return governance.repairState !== 'none'
    || governance.turnMode === 'screen-repair'
    || governance.answerAct === 'ask-reground'
    || governance.answerAct === 'correct-stale-anchor'
}

export function resolveGovernedFallbackPatternId(governance: AlicizationMindTurnGovernance, replyOverridden: boolean) {
  if (!replyOverridden)
    return 'none'
  if (governance.repairState === 'stale-anchor')
    return 'repair-stale-anchor'
  if (governance.repairState === 'need-reground')
    return 'repair-need-reground'
  if (governance.turnMode === 'guide-current-knot')
    return 'guide-current-knot'
  if (governance.turnMode === 'grounded-inspection')
    return 'grounded-inspection'
  if (governance.turnMode === 'care')
    return 'care'
  if (governance.turnMode === 'accompany')
    return 'accompany'
  return 'answer'
}

export function coerceConversationTurnToMindGovernedPayload(
  input: AlicizationConversationTurnInput,
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
) {
  const structuredPayload = input.structured && typeof input.structured === 'object'
    ? input.structured as Record<string, unknown>
    : {}
  const governance = normalizeMindTurnGovernance(input.governance ?? structuredPayload.governance)
  if (input.origin === 'subconscious-proactive' || !governance)
    return { payload: input, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

  const reply = readStringValue(structuredPayload.reply).trim()
    || sanitizeBriefText(readStringValue(input.assistantText), 2_000)
  if (!reply)
    return { payload: input, governance, tookOver: false, replyOverridden: false, reasons: [] as string[], audit: null as Record<string, unknown> | null }

  const thought = readStringValue(structuredPayload.thought).trim()
  const format = normalizeDialogueStructuredFormat(structuredPayload.format)
  const parsePath = readStringValue(structuredPayload.parsePath).trim().toLowerCase()
  const dialogueActKernel = normalizeDialogueActKernel(
    structuredPayload.dialogueActKernel ?? governance.dialogueActKernel,
  )
  const ownerBefore = resolveGovernanceTurnOwner(governance)
  const resolvedGovernance = dialogueActKernel
    ? {
        ...governance,
        dialogueActKernel,
      }
    : governance
  const tracedGovernance = {
    ...resolvedGovernance,
    decisionTraceId: ensureMindGovernanceDecisionTraceId(resolvedGovernance.decisionTraceId),
  } satisfies AlicizationMindTurnGovernance
  const governedAnchorRepair = reconcileMindGovernanceAnchors(tracedGovernance, input.userText)
  const coherentGovernance = {
    ...governedAnchorRepair.governance,
    decisionTraceId: ensureMindGovernanceDecisionTraceId(governedAnchorRepair.governance.decisionTraceId),
  } satisfies AlicizationMindTurnGovernance
  const normalizedEmotion = resolveMindGovernanceEmotion(
    coherentGovernance,
    readStringValue(structuredPayload.emotion).trim().toLowerCase(),
  )
  const thoughtConflict = thoughtConflictsWithMindGovernance(thought, coherentGovernance)
  const initialGovernedSurface = buildMindGovernedFallbackSurface({
    governance: coherentGovernance,
    userText: input.userText,
    translate: (path, params) => translateGovernedMindFallback(path, params, input.userText),
  })
  const strictGovernance = shouldForceGovernedMindSurface(coherentGovernance)
  const initialDialogueFirstVisibleReply = analyzeDialogueFirstVisibleReply({
    reply,
    userText: input.userText,
    governance: coherentGovernance,
  })
  const preserveDialogueFirstVisibleReply = shouldPreserveDialogueFirstVisibleReply(coherentGovernance)
  const dialogueFirstSoftRepair = preserveDialogueFirstVisibleReply
    ? repairDialogueFirstVisibleReply({
        reply,
        userText: input.userText,
        governance: coherentGovernance,
        analysis: initialDialogueFirstVisibleReply,
      })
    : {
        applied: false,
        reply,
        analysis: initialDialogueFirstVisibleReply,
        reason: null as string | null,
        droppedClauses: [] as string[],
      }
  const candidateReply = dialogueFirstSoftRepair.applied ? dialogueFirstSoftRepair.reply : reply
  const leakedGovernedSurface = replyLeaksGovernedMindSurface(candidateReply, coherentGovernance)
  const weakGroundedSceneCue = replyUsesWeakGroundedSceneCue(candidateReply, coherentGovernance)
  const unsupportedTechnicalSpecificity = analyzeUnsupportedTechnicalSpecificity({
    reply: candidateReply,
    userText: input.userText,
    governance: coherentGovernance,
  })
  const conflictingAnchors = detectReplyConflictingAnchors(
    candidateReply,
    resolvedGovernance,
    governedAnchorRepair.coherence.dominant ?? coherentGovernance.focusAnchor,
  )
  const scriptMismatch = replyScriptMismatchesUserTurn({
    userText: input.userText,
    reply: candidateReply,
  })
  const dialogueFirstVisibleReply = dialogueFirstSoftRepair.analysis
  const dialogueFirstOverrideRequired = Boolean(
    preserveDialogueFirstVisibleReply
    && dialogueFirstVisibleReply.contaminated,
  )
  const governedSurface = (dialogueFirstOverrideRequired && !initialGovernedSurface?.reply)
    ? buildMindGovernedFallbackSurface({
        governance: coherentGovernance,
        userText: input.userText,
        translate: (path, params) => translateGovernedMindFallback(path, params, input.userText),
        forceDialogueAnswerFallback: true,
      })
    : initialGovernedSurface
  const thinGovernedShell = governedSurface
    ? replyLooksThinGovernedShell(candidateReply, governedSurface.reply, coherentGovernance, governedSurface.thinShellCue)
    : false
  const coherentSceneReply = replyLooksCoherentSceneAnswer({
    reply: candidateReply,
    governance: coherentGovernance,
    userText: input.userText,
  })
  const hasMindThought = hasMindTurnSpine(thought)
  const missingMindThought = !hasMindThought
  const invalidFormat = format !== 'mind-turn-v1'
  const invalidParsePath = !['json', 'repair-json'].includes(parsePath)
  const contractFailed = structuredPayload.contractFailed === true
  const reasons = [
    contractFailed ? 'structured-contract-failed' : '',
    invalidFormat ? 'structured-format-repaired' : '',
    invalidParsePath ? 'structured-parsepath-repaired' : '',
    missingMindThought ? 'thought-missing-mind-spine' : '',
    thoughtConflict ? 'thought-governance-mismatch' : '',
    governedAnchorRepair.changed ? 'governance-anchor-coherence-repaired' : '',
    dialogueFirstSoftRepair.applied ? 'dialogue-first-visible-reply-soft-repaired' : '',
    strictGovernance ? 'strict-governance-surface' : '',
    leakedGovernedSurface ? 'reply-leaked-internal-governance' : '',
    weakGroundedSceneCue ? 'reply-used-weak-grounded-scene-cue' : '',
    unsupportedTechnicalSpecificity.unsupportedCues.length > 0 ? 'reply-introduced-unsupported-technical-specificity' : '',
    scriptMismatch ? 'reply-script-mismatch-with-user-turn' : '',
    conflictingAnchors.reason,
    dialogueFirstVisibleReply.contaminated && !dialogueFirstSoftRepair.applied ? 'dialogue-first-visible-reply-contaminated' : '',
    thinGovernedShell ? 'reply-thin-governed-shell' : '',
    shouldDeferGovernedMindLocalRepair(coherentGovernance) && !dialogueFirstSoftRepair.applied ? 'dialogue-first-repair-deferred' : '',
    structuredPayload.governance == null ? 'governance-snapshot-injected' : '',
  ].filter(Boolean)

  const hardOverrideRequired = Boolean(
    leakedGovernedSurface
    || weakGroundedSceneCue
    || unsupportedTechnicalSpecificity.shouldOverride
    || scriptMismatch
    || conflictingAnchors.hasConflict
    || dialogueFirstOverrideRequired,
  )
  const thinShellOverrideRequired = Boolean(thinGovernedShell && !preserveDialogueFirstVisibleReply)
  const strictOverrideRequired = strictGovernance
  const explicitRepairTurn = isExplicitGovernanceRepairTurn(coherentGovernance)
  const strictRepairReplySuppressed = Boolean(
    strictOverrideRequired
    && !hardOverrideRequired
    && !thinShellOverrideRequired
    && explicitRepairTurn
    && coherentSceneReply,
  )
  const softStrictOverrideSuppressed = Boolean(
    strictOverrideRequired
    && !hardOverrideRequired
    && (!explicitRepairTurn || strictRepairReplySuppressed),
  )
  if (softStrictOverrideSuppressed)
    reasons.push('soft-strict-governance-suppressed')
  if (strictRepairReplySuppressed)
    reasons.push('strict-repair-scene-reply-preserved')
  const shouldOverrideVisibleReply = Boolean(
    governedSurface?.reply
    && (
      hardOverrideRequired
      || thinShellOverrideRequired
      || (strictOverrideRequired && !softStrictOverrideSuppressed)
    ),
  )
  const replyKeptDespiteMismatch = Boolean(
    !shouldOverrideVisibleReply
    && (
      thoughtConflict
      || governedAnchorRepair.changed
      || dialogueFirstVisibleReply.contaminated
      || unsupportedTechnicalSpecificity.unsupportedCues.length > 0
      || conflictingAnchors.hasConflict
    ),
  )
  if (replyKeptDespiteMismatch)
    reasons.push('reply-kept-despite-mismatch')
  const overrideClass = shouldOverrideVisibleReply
    ? (hardOverrideRequired ? 'hard-override' : 'soft-override')
    : 'none'
  const fallbackPatternId = resolveGovernedFallbackPatternId(coherentGovernance, shouldOverrideVisibleReply)
  const hardFallbackReason = shouldOverrideVisibleReply && hardOverrideRequired
    ? [
        leakedGovernedSurface ? 'reply-leaked-internal-governance' : '',
        weakGroundedSceneCue ? 'reply-used-weak-grounded-scene-cue' : '',
        unsupportedTechnicalSpecificity.unsupportedCues.length > 0 ? 'reply-introduced-unsupported-technical-specificity' : '',
        scriptMismatch ? 'reply-script-mismatch-with-user-turn' : '',
        conflictingAnchors.reason,
        dialogueFirstOverrideRequired ? 'dialogue-first-visible-reply-contaminated' : '',
      ].find(Boolean) ?? 'hard-governance-fallback'
    : null
  const finalReply = shouldOverrideVisibleReply && governedSurface?.reply
    ? governedSurface.reply
    : candidateReply
  const finalThought = (missingMindThought || thoughtConflict)
    ? governedSurface?.thought ?? buildGovernedMindThought(coherentGovernance, input)
    : thought
  const finalEmotion = normalizeAlicizationEmotion(
    shouldOverrideVisibleReply && governedSurface
      ? governedSurface.emotion
      : normalizedEmotion,
  ).emotion
  const finalParsePath = (
    shouldOverrideVisibleReply
    || contractFailed
    || invalidFormat
    || invalidParsePath
    || missingMindThought
    || thoughtConflict
  )
    ? 'repair-json'
    : parsePath
  const normalizedAssistantText = finalReply || sanitizeBriefText(readStringValue(input.assistantText), 2_000)
  const tookOver = Boolean(
    shouldOverrideVisibleReply
    || structuredPayload.governance == null
    || finalThought !== thought
    || finalEmotion !== normalizeAlicizationEmotion(readStringValue(structuredPayload.emotion).trim().toLowerCase()).emotion
    || finalParsePath !== parsePath
    || invalidFormat
    || contractFailed
    || readStringValue(input.assistantText).trim() !== normalizedAssistantText,
  )
  const finalPerformance = alignDialoguePerformanceEmotion(structuredPayload.performance, finalEmotion)
  const finalEmbodiment = resolveAlicizationDialogueEmbodiment({
    candidateEmotion: finalEmotion,
    candidatePerformance: finalPerformance,
    governance: coherentGovernance,
    performanceManifest,
    reply: finalReply,
    thought: finalThought,
    turnId: input.turnId,
  })
  const finalSpeechTimeline = buildAlicizationDialogueSpeechTimeline({
    reply: finalReply,
    candidateEmotion: finalEmotion,
    candidatePerformance: finalPerformance,
    embodiment: finalEmbodiment,
    performanceManifest,
  })
  const finalDigitalLife = buildAlicizationDigitalLifeEnvelope({
    embodiment: finalEmbodiment,
    speechTimeline: finalSpeechTimeline,
    performanceManifest,
  })

  return {
    payload: {
      ...input,
      assistantText: normalizedAssistantText,
      governance: coherentGovernance,
      structured: {
        ...structuredPayload,
        thought: finalThought,
        emotion: finalEmotion,
        reply: finalReply,
        performance: finalPerformance,
        embodiment: finalEmbodiment,
        speechTimeline: finalSpeechTimeline,
        digitalLife: finalDigitalLife,
        format: 'mind-turn-v1',
        dialogueActKernel,
        parsePath: finalParsePath,
        contractFailed: false,
        governance: coherentGovernance,
      },
    },
    governance: coherentGovernance,
    tookOver,
    replyOverridden: shouldOverrideVisibleReply,
    overrideClass,
    fallbackPatternId,
    reasons,
    audit: {
      owner_before: ownerBefore,
      owner_after: resolveGovernanceTurnOwner(coherentGovernance),
      decision_trace_id_before: governance.decisionTraceId ?? null,
      decision_trace_id_after: coherentGovernance.decisionTraceId ?? null,
      subject_before: governance.answerSubject ?? governance.mindTurnFrame?.relation.subject ?? null,
      subject_after: coherentGovernance.answerSubject ?? coherentGovernance.mindTurnFrame?.relation.subject ?? null,
      screen_mode_before: governance.screenReferenceMode ?? null,
      screen_mode_after: coherentGovernance.screenReferenceMode ?? null,
      truth_state_before: governance.truthState,
      truth_state_after: coherentGovernance.truthState,
      repair_state_before: governance.repairState,
      repair_state_after: coherentGovernance.repairState,
      focus_anchor_before: governance.focusAnchor ?? null,
      focus_anchor_after: coherentGovernance.focusAnchor ?? null,
      live_surface_before: governance.liveSurface ?? null,
      live_surface_after: coherentGovernance.liveSurface ?? null,
      answer_intent_before: governance.answerIntent ?? null,
      answer_intent_after: coherentGovernance.answerIntent ?? null,
      carried_thread_before: governance.carriedThread ?? null,
      carried_thread_after: coherentGovernance.carriedThread ?? null,
      anchor_candidates_before: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesBefore),
      anchor_candidates_after: summarizeGovernanceAnchorAuditCandidates(governedAnchorRepair.anchorCandidatesAfter),
      dominant_anchor: conflictingAnchors.dominantAnchor ?? null,
      conflicting_anchor_candidates: conflictingAnchors.conflictingCandidates,
      mentioned_conflicting_anchors: conflictingAnchors.mentionedConflicts,
      dialogue_focus_overlap: Number(dialogueFirstVisibleReply.overlapRatio.toFixed(2)),
      roleplay_preface: dialogueFirstVisibleReply.roleplayPreface,
      stale_carry_reference: dialogueFirstVisibleReply.staleCarryReference,
      scene_cue_mentions: dialogueFirstVisibleReply.sceneCueMentions,
      foreign_technical_cues: dialogueFirstVisibleReply.foreignTechnicalCues,
      dialogue_truth_discipline_mode: dialogueFirstVisibleReply.truthDisciplineMode,
      reply_specificity_cues: unsupportedTechnicalSpecificity.replyCues,
      allowed_specificity_cues: unsupportedTechnicalSpecificity.allowedCues,
      unsupported_specificity_cues: unsupportedTechnicalSpecificity.unsupportedCues,
      specificity_truth_discipline_mode: unsupportedTechnicalSpecificity.truthDisciplineMode,
      claim_specificity_budget: coherentGovernance.claimEvidence?.specificityBudget ?? null,
      claim_observed_surface: coherentGovernance.claimEvidence?.observedSurface ?? null,
      claim_task_hypothesis: coherentGovernance.claimEvidence?.taskHypothesis ?? null,
      claim_intent_hypothesis: coherentGovernance.claimEvidence?.intentHypothesis ?? null,
      claim_should_label_hypothesis: coherentGovernance.claimEvidence?.shouldLabelHypothesis === true,
      claim_forbid_unsupported_specificity: coherentGovernance.claimEvidence?.forbidUnsupportedSpecificity === true,
      reply_before_excerpt: excerptGovernedReply(reply),
      reply_after_excerpt: excerptGovernedReply(finalReply),
      soft_repair_applied: dialogueFirstSoftRepair.applied,
      soft_repair_reason: dialogueFirstSoftRepair.reason,
      soft_repair_dropped_clauses: dialogueFirstSoftRepair.droppedClauses,
      hard_fallback_reason: hardFallbackReason,
      fallback_template_key: shouldOverrideVisibleReply ? fallbackPatternId : null,
      reply_kept_despite_mismatch: replyKeptDespiteMismatch,
    },
  }
}

export function buildMindTurnTraceEvents(input: {
  payload: AlicizationConversationTurnInput
  governedTurn: ReturnType<typeof coerceConversationTurnToMindGovernedPayload>
  createdAt: number
  dialoguePayload?: Omit<AlicizationDialogueRespondedPayload, 'cardId'> | null
}): AlicizationMindTurnEventInput[] {
  const governance = input.governedTurn.governance
  const decisionTraceId = sanitizeMindGovernanceDecisionTraceId(governance?.decisionTraceId)
  if (!decisionTraceId)
    return []

  const structured = input.payload.structured && typeof input.payload.structured === 'object'
    ? input.payload.structured as Record<string, unknown>
    : {}
  const persistedDigitalLifeSpine = summarizeMindTurnEventDigitalLifeSpine(structured.digitalLifeSpine)
  const turnId = sanitizeText(input.payload.turnId) || null
  const sessionId = sanitizeText(input.payload.sessionId) || null
  const origin = input.payload.origin === 'subconscious-proactive'
    ? 'subconscious-proactive'
    : 'user-turn'

  const events: AlicizationMindTurnEventInput[] = [{
    decisionTraceId,
    turnId,
    sessionId,
    origin,
    kind: 'governance-normalized',
    payload: {
      turnMode: governance?.turnMode ?? null,
      truthState: governance?.truthState ?? null,
      repairState: governance?.repairState ?? null,
      answerSubject: governance?.answerSubject ?? null,
      screenReferenceMode: governance?.screenReferenceMode ?? null,
      tookOver: input.governedTurn.tookOver,
      replyOverridden: input.governedTurn.replyOverridden,
      overrideClass: input.governedTurn.overrideClass ?? 'none',
      fallbackPatternId: input.governedTurn.fallbackPatternId ?? 'none',
      reasons: input.governedTurn.reasons,
      digitalLifeSpine: persistedDigitalLifeSpine,
    },
    createdAt: input.createdAt,
  }]

  if (input.governedTurn.tookOver && input.governedTurn.audit) {
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'takeover-audit',
      payload: input.governedTurn.audit,
      createdAt: input.createdAt,
    })
  }

  events.push({
    decisionTraceId,
    turnId,
    sessionId,
    origin,
    kind: 'persistence-written',
    payload: {
      format: readStringValue(structured.format).trim().toLowerCase() || null,
      parsePath: readStringValue(structured.parsePath).trim().toLowerCase() || null,
      emotion: readStringValue(structured.emotion).trim().toLowerCase() || null,
      rawEmotion: readStringValue(structured.rawEmotion).trim().toLowerCase() || null,
      replyExcerpt: excerptGovernedReply(readStringValue(structured.reply).trim()),
      assistantExcerpt: excerptGovernedReply(readStringValue(input.payload.assistantText).trim()),
      digitalLifeSpine: persistedDigitalLifeSpine,
    },
    createdAt: input.createdAt,
  })

  if (input.dialoguePayload) {
    const dialogueDigitalLifeSpine = summarizeMindTurnEventDigitalLifeSpine(
      ((input.dialoguePayload.structured as unknown) as Record<string, unknown>).digitalLifeSpine,
    ) ?? persistedDigitalLifeSpine
    events.push({
      decisionTraceId,
      turnId,
      sessionId,
      origin,
      kind: 'dialogue-emitted',
      payload: {
        origin: input.dialoguePayload.origin,
        isFallback: input.dialoguePayload.isFallback,
        format: input.dialoguePayload.structured.format,
        emotion: input.dialoguePayload.structured.emotion,
        rawEmotion: input.dialoguePayload.structured.rawEmotion,
        embodimentVariationToken: input.dialoguePayload.structured.embodiment?.variationToken ?? null,
        embodimentPostureHint: input.dialoguePayload.structured.embodiment?.postureHint ?? null,
        speechTimelineSegments: input.dialoguePayload.structured.speechTimeline?.segments.length ?? 0,
        digitalLifeSpine: dialogueDigitalLifeSpine,
        createdAt: input.dialoguePayload.createdAt,
      },
      createdAt: input.dialoguePayload.createdAt,
    })
  }

  return events
}

export function normalizeDialogueRespondedPayload(
  input: AlicizationConversationTurnInput,
  performanceManifest?: CharacterPerformanceCapabilitiesManifest | null,
  options?: {
    residentPerformance?: AlicizationResidentPerformanceSnapshot | null
  },
): Omit<AlicizationDialogueRespondedPayload, 'cardId'> | null {
  const normalizedSessionId = input.sessionId?.trim()
  if (!normalizedSessionId)
    return null

  const structuredPayload = input.structured && typeof input.structured === 'object' ? input.structured : {}
  const thought = readStringValue((structuredPayload as Record<string, unknown>).thought).trim()
  const rawEmotion = readStringValue((structuredPayload as Record<string, unknown>).emotion).trim().toLowerCase()
  const reply = readStringValue((structuredPayload as Record<string, unknown>).reply).trim()
    || input.assistantText?.trim()
    || ''
  const parsePath = readStringValue((structuredPayload as Record<string, unknown>).parsePath).trim().toLowerCase()
  const contractFailed = (structuredPayload as Record<string, unknown>).contractFailed === true
  const policyLocked = readStringValue((structuredPayload as Record<string, unknown>).policyLocked).trim()
  const governance = normalizeMindTurnGovernance(
    input.governance ?? (structuredPayload as Record<string, unknown>).governance,
  )
  const normalizedFormat = normalizeDialogueStructuredFormat(
    (structuredPayload as Record<string, unknown>).format,
    contractFailed ? 'fallback-v1' : undefined,
  )
  const format = governance && input.origin !== 'subconscious-proactive' && normalizedFormat === 'epoch1-v1'
    ? 'mind-turn-v1'
    : normalizedFormat
  const proactive = normalizeProactiveMetadata((structuredPayload as Record<string, unknown>).proactive)
  const dialogueActKernel = normalizeDialogueActKernel(
    (structuredPayload as Record<string, unknown>).dialogueActKernel ?? governance?.dialogueActKernel,
  )
  const normalizedEmotionResult = normalizeAlicizationEmotion(rawEmotion)
  const normalizedPerformance = normalizeAlicizationPerformancePayload(
    (structuredPayload as Record<string, unknown>).performance,
    normalizedEmotionResult.emotion,
  )
  const clampedPerformance = clampAlicizationPerformancePayloadToManifest(
    normalizedPerformance,
    performanceManifest,
    normalizedEmotionResult.emotion,
  )
  const residentSeededPerformance = resolveResidentFallbackDialoguePerformance(
    clampedPerformance.performance,
    options?.residentPerformance?.performance,
  )
  const residentSeeded = !areDialoguePerformancesEqual(
    clampedPerformance.performance,
    residentSeededPerformance,
  )
  const createdAt = input.createdAt ?? Date.now()
  const turnId = input.turnId?.trim() || `turn:${normalizedSessionId}:${createdAt}`
  const resolvedEmbodiment = resolveAlicizationDialogueEmbodiment({
    candidateEmotion: residentSeededPerformance.baseEmotion,
    candidatePerformance: residentSeededPerformance,
    governance,
    performanceManifest,
    reply,
    thought,
    turnId,
  })
  const embodiment = applyDialoguePerformanceSeedToEmbodiment(
    resolvedEmbodiment,
    residentSeededPerformance,
  )
  const speechTimeline = buildAlicizationDialogueSpeechTimeline({
    reply,
    candidateEmotion: embodiment.emotion,
    candidatePerformance: embodiment.performance,
    embodiment,
    performanceManifest,
  })
  const normalizedDigitalLife = normalizeAlicizationDigitalLifeEnvelope(
    (structuredPayload as Record<string, unknown>).digitalLife,
    embodiment.emotion,
  )
  const digitalLife = normalizedDigitalLife && !residentSeeded
    ? normalizedDigitalLife
    : buildAlicizationDigitalLifeEnvelope({
        embodiment,
        speechTimeline,
        performanceManifest,
      })
  const digitalLifeSpine = normalizeAlicizationDigitalLifeSpineDigest(
    (structuredPayload as Record<string, unknown>).digitalLifeSpine,
  )
  const isFallback = contractFailed || !['json', 'repair-json'].includes(parsePath)
  const origin = input.origin === 'subconscious-proactive'
    ? 'subconscious-proactive'
    : 'user-turn'

  return {
    turnId,
    sessionId: normalizedSessionId,
    origin,
    structured: {
      thought,
      emotion: embodiment.emotion,
      reply,
      performance: embodiment.performance,
      embodiment,
      speechTimeline,
      digitalLife,
      digitalLifeSpine,
      format,
      proactive,
      dialogueActKernel,
      governance,
      policyLocked: policyLocked || undefined,
      rawEmotion: normalizedEmotionResult.downgraded
        ? normalizedEmotionResult.rawEmotion
        : clampedPerformance.downgradedBaseEmotion,
    },
    isFallback,
    createdAt,
  }
}

export interface AlicizationRuntimeSetupOptions {
  userDataPathOverride?: string
  runtimeDebugLogEnabled?: boolean
}
