import type {
  AlicizationExecutionRuntimeContext,
  AlicizationExecutionRuntimeContextActionDigest,
  AlicizationExecutionRuntimeContextCapture,
  AlicizationExecutionRuntimeContextForegroundWindow,
  AlicizationExecutionRuntimeMemoryClosureExecution,
} from './alicization-transport-contracts'

import { buildAlicizationProviderFactBlock } from './alicization-provider-facts'
import { normalizeAlicizationDerivedMindStateBundle } from './alicization-transport-contracts'

function sanitizeText(raw: unknown, maxChars = 200) {
  if (typeof raw !== 'string')
    return ''
  return raw.trim().replace(/\s+/g, ' ').slice(0, maxChars)
}

function normalizeTimestamp(raw: unknown) {
  const numeric = Number(raw)
  return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : null
}

function normalizeRuntimeForegroundWindow(
  raw: unknown,
): AlicizationExecutionRuntimeContextForegroundWindow | null {
  if (!raw || typeof raw !== 'object')
    return null

  const value = raw as Record<string, unknown>
  const next = {
    appName: sanitizeText(value.appName, 120) || undefined,
    processName: sanitizeText(value.processName, 120) || undefined,
    title: sanitizeText(value.title, 200) || undefined,
  } satisfies AlicizationExecutionRuntimeContextForegroundWindow

  return next.appName || next.processName || next.title ? next : null
}

function normalizeRuntimeCapture(raw: unknown): AlicizationExecutionRuntimeContextCapture | null {
  if (!raw || typeof raw !== 'object')
    return null

  const value = raw as Record<string, unknown>
  const health = value.health === 'healthy' || value.health === 'degraded' || value.health === 'unavailable'
    ? value.health
    : null
  const permission = value.permission === 'granted' || value.permission === 'denied' || value.permission === 'prompt' || value.permission === 'unknown'
    ? value.permission
    : null
  const sourceCount = Number.isFinite(Number(value.sourceCount))
    ? Math.max(0, Math.floor(Number(value.sourceCount)))
    : null
  const degradedReasons = Array.isArray(value.degradedReasons)
    ? [...new Set(value.degradedReasons.map(reason => sanitizeText(reason, 80)).filter(Boolean))].slice(0, 8)
    : []

  return {
    health,
    permission,
    sourceCount,
    lastUpdatedAt: normalizeTimestamp(value.lastUpdatedAt),
    lastError: sanitizeText(value.lastError, 240) || null,
    degradedReasons,
  }
}

function normalizeRuntimeActions(raw: unknown): AlicizationExecutionRuntimeContextActionDigest[] {
  if (!Array.isArray(raw))
    return []

  return raw
    .map((item): AlicizationExecutionRuntimeContextActionDigest | null => {
      if (!item || typeof item !== 'object')
        return null

      const value = item as Record<string, unknown>
      const kind = value.kind === 'executor' || value.kind === 'mcp' || value.kind === 'runtime' || value.kind === 'sensory'
        ? value.kind
        : null
      const status = value.status === 'completed' || value.status === 'failed' || value.status === 'pending'
        ? value.status
        : null
      const threadStatus = value.threadStatus === 'planned'
        || value.threadStatus === 'needs-affirmation'
        || value.threadStatus === 'running'
        || value.threadStatus === 'paused'
        || value.threadStatus === 'blocked'
        || value.threadStatus === 'completed'
        || value.threadStatus === 'failed'
        || value.threadStatus === 'cancelled'
        ? value.threadStatus
        : null
      const label = sanitizeText(value.label, 120)
      const summary = sanitizeText(value.summary, 180) || null
      if (!kind || !status || !label)
        return null

      return {
        kind,
        status,
        threadStatus,
        label,
        summary,
      }
    })
    .filter((item): item is AlicizationExecutionRuntimeContextActionDigest => item !== null)
    .slice(0, 6)
}

function normalizeMemoryClosureExecution(raw: unknown): AlicizationExecutionRuntimeMemoryClosureExecution | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const value = raw as Record<string, unknown>
  if (value.authority !== 'memory-os')
    return null

  const carry = sanitizeText(value.carry, 220) || null
  const nextLearningAction = sanitizeText(value.nextLearningAction, 80) || null
  const activeLearningFocuses = Array.isArray(value.activeLearningFocuses)
    ? [...new Set(value.activeLearningFocuses.map(focus => sanitizeText(focus, 120)).filter(Boolean))].slice(0, 8)
    : []
  const reasonTags = Array.isArray(value.reasonTags)
    ? [...new Set(value.reasonTags.map(tag => sanitizeText(tag, 80)).filter(Boolean))].slice(0, 12)
    : []
  const closureStateCandidate = value.closureState && typeof value.closureState === 'object' && !Array.isArray(value.closureState)
    ? value.closureState as Record<string, unknown>
    : {}

  const normalized = {
    authority: 'memory-os',
    carry,
    nextLearningAction,
    shouldVerify: value.shouldVerify === true,
    shouldReflect: value.shouldReflect === true,
    activeLearningFocuses,
    reasonTags,
    closureState: {
      state: sanitizeText(closureStateCandidate.state, 80) || null,
      open: closureStateCandidate.open === true,
      revisionRequired: closureStateCandidate.revisionRequired === true,
      shouldLabelUncertainty: closureStateCandidate.shouldLabelUncertainty === true,
      visibleCarryMode: sanitizeText(closureStateCandidate.visibleCarryMode, 80) || null,
      retrievalQuality: sanitizeText(closureStateCandidate.retrievalQuality, 80) || null,
      conflictPressure: sanitizeText(closureStateCandidate.conflictPressure, 80) || null,
    },
  } satisfies AlicizationExecutionRuntimeMemoryClosureExecution

  return normalized.carry
    || normalized.nextLearningAction
    || normalized.shouldVerify
    || normalized.shouldReflect
    || normalized.activeLearningFocuses.length > 0
    || normalized.reasonTags.length > 0
    || Object.values(normalized.closureState).some(Boolean)
    ? normalized
    : null
}

function normalizeExecutionRuntimeAffectiveResidue(raw: unknown) {
  return normalizeAlicizationDerivedMindStateBundle({
    version: 'derived-mind-state-bundle-v1',
    source: 'browser-fallback',
    producedAt: 0,
    summary: 'execution-runtime-context-affective-residue',
    affectiveResidue: raw,
  })?.affectiveResidue ?? null
}

function normalizeExecutionRuntimeDerivedMindStateBundle(
  raw: unknown,
): AlicizationExecutionRuntimeContext['derivedMindStateBundle'] {
  const normalized = normalizeAlicizationDerivedMindStateBundle(raw)
  if (normalized)
    return normalized

  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return null

  const value = raw as Record<string, unknown>
  if (!('affectiveResidue' in value))
    return null

  return normalizeAlicizationDerivedMindStateBundle({
    ...value,
    version: 'derived-mind-state-bundle-v1',
    source: value.source === 'main-runtime' || value.source === 'browser-fallback'
      ? value.source
      : 'browser-fallback',
    producedAt: normalizeTimestamp(value.producedAt) ?? 0,
    summary: sanitizeText(value.summary, 220) || 'execution-runtime-context-derived-mind-state-bundle',
  })
}

export function normalizeAlicizationExecutionRuntimeContext(raw: unknown): AlicizationExecutionRuntimeContext | null {
  if (!raw || typeof raw !== 'object')
    return null

  const value = raw as Record<string, unknown>
  const sensoryValue = value.sensory
  if (!sensoryValue || typeof sensoryValue !== 'object')
    return null

  const sensory = sensoryValue as Record<string, unknown>
  const affectiveResidue = normalizeExecutionRuntimeAffectiveResidue(value.affectiveResidue)
  const derivedMindStateBundle = normalizeExecutionRuntimeDerivedMindStateBundle(value.derivedMindStateBundle)
  const memoryClosureExecution = normalizeMemoryClosureExecution(value.memoryClosureExecution)

  return {
    generatedAt: normalizeTimestamp(value.generatedAt) ?? Date.now(),
    cardId: sanitizeText(value.cardId, 120) || null,
    decisionTraceId: sanitizeText(value.decisionTraceId, 200) || null,
    turnId: sanitizeText(value.turnId, 160) || null,
    sessionId: sanitizeText(value.sessionId, 160) || null,
    agentSessionId: sanitizeText(value.agentSessionId, 160) || null,
    ...(affectiveResidue ? { affectiveResidue } : {}),
    ...(derivedMindStateBundle ? { derivedMindStateBundle } : {}),
    ...(memoryClosureExecution ? { memoryClosureExecution } : {}),
    recentActions: normalizeRuntimeActions(value.recentActions),
    sensory: {
      collectedAt: normalizeTimestamp(sensory.collectedAt),
      running: sensory.running !== false,
      stale: sensory.stale === true,
      ageMs: Number.isFinite(Number(sensory.ageMs))
        ? Math.max(0, Math.floor(Number(sensory.ageMs)))
        : 0,
      foregroundWindow: normalizeRuntimeForegroundWindow(sensory.foregroundWindow),
      capture: normalizeRuntimeCapture(sensory.capture),
    },
  }
}

export function buildAlicizationExecutionRuntimeContextBlock(raw: unknown) {
  const context = normalizeAlicizationExecutionRuntimeContext(raw)
  if (!context)
    return ''

  const capture = context.sensory.capture
  const regroundRequired = context.sensory.stale
    || capture?.health === 'degraded'
    || capture?.health === 'unavailable'

  return buildAlicizationProviderFactBlock('alicization-execution-runtime-context', {
    version: 'alicization-execution-runtime-context-v1',
    owners: {
      shortTerm: 'WorkingMemory',
      longTermRecall: 'LongTermMemoryRecall',
    },
    failureSurface: 'transparent',
    identifiers: {
      generatedAt: context.generatedAt,
      cardId: context.cardId ?? null,
      turnId: context.turnId ?? null,
      decisionTraceId: context.decisionTraceId ?? null,
      conversationSessionId: context.sessionId ?? null,
      agentSessionId: context.agentSessionId ?? null,
    },
    affective: context.affectiveResidue
      ? {
          dominantResidueKind: context.affectiveResidue.dominantResidueKind,
          afterglowPressure: context.affectiveResidue.afterglowPressure,
          repairPressure: context.affectiveResidue.repairPressure,
          burdenPressure: context.affectiveResidue.burdenPressure,
          trustPressure: context.affectiveResidue.trustPressure,
          restProtectivePressure: context.affectiveResidue.restProtectivePressure,
          cadenceMode: context.affectiveResidue.relationshipCadence.cadenceMode,
          shouldDelayWarmth: context.affectiveResidue.relationshipCadence.shouldDelayWarmth,
          shouldProtectRest: context.affectiveResidue.relationshipCadence.shouldProtectRest,
        }
      : null,
    memoryClosureExecution: context.memoryClosureExecution ?? null,
    recentActions: context.recentActions ?? [],
    sensory: {
      collectedAt: context.sensory.collectedAt,
      running: context.sensory.running,
      stale: context.sensory.stale,
      ageMs: context.sensory.ageMs,
      regroundRequired,
      foregroundWindow: context.sensory.foregroundWindow,
      capture,
    },
  })
}
