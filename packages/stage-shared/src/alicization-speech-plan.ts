export type AlicizationEmbodimentSpeechInterruptPolicy = 'hard-stop' | 'soft-settle'

import type { AlicizationDialogueEmbodimentRendererHints } from './alicization-dialogue-embodiment'
import type { AlicizationDialogueSpeechRendererSettleHints } from './alicization-dialogue-speech-timeline'
import type { AlicizationSpeechProsodyIntent } from './alicization-speech-prosody-contracts'

import { normalizeAlicizationSpeechProsodyIntent } from './alicization-speech-prosody-contracts'

export interface AlicizationEmbodimentSpeechSegment {
  id: string
  index: number
  text: string
  interruptPolicy: AlicizationEmbodimentSpeechInterruptPolicy
  preRollMs: number
  settleMs: number
  rendererSettle?: AlicizationDialogueSpeechRendererSettleHints | null
  rendererHints?: AlicizationDialogueEmbodimentRendererHints | null
  prosody?: AlicizationSpeechProsodyIntent
}

export interface AlicizationEmbodimentSpeechPlan {
  segments: AlicizationEmbodimentSpeechSegment[]
  interruptPolicy: AlicizationEmbodimentSpeechInterruptPolicy
  preRollMs: number
  settleMs: number
}

function normalizeText(raw: unknown, maxChars: number) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeNonNegativeInteger(raw: unknown, fallback = 0) {
  const value = Number(raw)
  if (!Number.isFinite(value))
    return fallback
  return Math.max(0, Math.floor(value))
}

function normalizeInterruptPolicy(raw: unknown): AlicizationEmbodimentSpeechInterruptPolicy {
  return raw === 'soft-settle' ? 'soft-settle' : 'hard-stop'
}

function dedupeCuePool(values: Array<string | null | undefined>) {
  const deduped: string[] = []
  const seen = new Set<string>()

  for (const value of values) {
    if (typeof value !== 'string')
      continue

    const normalized = value.trim()
    if (!normalized || seen.has(normalized))
      continue

    seen.add(normalized)
    deduped.push(normalized)
  }

  return deduped
}

function normalizeRendererHintAliases(raw: unknown) {
  if (!Array.isArray(raw))
    return []

  return dedupeCuePool(raw.map((value) => {
    return typeof value === 'string' ? value : null
  }))
}

function normalizeSegmentRendererHints(raw: unknown): AlicizationDialogueEmbodimentRendererHints | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const preferredExpressionAliases = normalizeRendererHintAliases(candidate.preferredExpressionAliases)
  const preferredMotionAliases = normalizeRendererHintAliases(candidate.preferredMotionAliases)
  if (preferredExpressionAliases.length === 0 && preferredMotionAliases.length === 0)
    return null

  return {
    preferredExpressionAliases: preferredExpressionAliases.length > 0 ? preferredExpressionAliases : undefined,
    preferredMotionAliases: preferredMotionAliases.length > 0 ? preferredMotionAliases : undefined,
  }
}

function clampRange(value: number, min: number, max: number, fallback: number = min) {
  if (!Number.isFinite(value))
    return fallback

  return Math.min(max, Math.max(min, value))
}

function normalizeRendererSettleHints(raw: unknown): AlicizationDialogueSpeechRendererSettleHints | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const live2dFacialReleaseMs = Math.round(clampRange(
    Number(candidate.live2dFacialReleaseMs),
    80,
    1600,
    320,
  ))
  const vrmExpressionBlendMs = Math.round(clampRange(
    Number(candidate.vrmExpressionBlendMs),
    60,
    960,
    240,
  ))
  const vrmActionFadeMs = Math.round(clampRange(
    Number(candidate.vrmActionFadeMs),
    80,
    1200,
    220,
  ))
  const live2dMotionFollowThroughMs = Math.round(clampRange(
    Number(candidate.live2dMotionFollowThroughMs),
    0,
    1200,
    220,
  ))

  return {
    live2dFacialReleaseMs,
    live2dMotionFollowThroughMs,
    vrmActionFadeMs,
    vrmExpressionBlendMs,
  }
}

function normalizeSpeechSegment(raw: unknown, fallbackIndex: number): AlicizationEmbodimentSpeechSegment | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  const id = normalizeText(candidate.id, 120)
  const text = normalizeText(candidate.text, 600)
  if (!id || !text)
    return null

  const hasProsody = candidate.prosody !== undefined
  const prosody = hasProsody
    ? normalizeAlicizationSpeechProsodyIntent(candidate.prosody)
    : null
  if (hasProsody && !prosody)
    return null

  return {
    id,
    index: normalizeNonNegativeInteger(candidate.index, fallbackIndex),
    text,
    interruptPolicy: normalizeInterruptPolicy(candidate.interruptPolicy),
    preRollMs: normalizeNonNegativeInteger(candidate.preRollMs),
    settleMs: normalizeNonNegativeInteger(candidate.settleMs, 160),
    rendererSettle: normalizeRendererSettleHints(candidate.rendererSettle),
    rendererHints: normalizeSegmentRendererHints(candidate.rendererHints),
    ...(prosody ? { prosody } : {}),
  }
}

export function normalizeAlicizationEmbodimentSpeechPlan(raw: unknown): AlicizationEmbodimentSpeechPlan | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const candidate = raw as Record<string, unknown>
  if (!Array.isArray(candidate.segments))
    return null

  const segments = candidate.segments
    .map((segment, index) => normalizeSpeechSegment(segment, index))
    .filter((segment): segment is AlicizationEmbodimentSpeechSegment => Boolean(segment))
  if (segments.length !== candidate.segments.length)
    return null

  return {
    segments,
    interruptPolicy: normalizeInterruptPolicy(candidate.interruptPolicy),
    preRollMs: normalizeNonNegativeInteger(candidate.preRollMs),
    settleMs: normalizeNonNegativeInteger(candidate.settleMs, 160),
  }
}
