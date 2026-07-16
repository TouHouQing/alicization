import type {
  AlicizationDigitalLifeSpineMemoryClosureTrace,
  AlicizationExecutionRuntimeContext,
  AlicizationExecutionRuntimeMemoryClosureExecution,
} from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'

import { sanitizeAlicizationProviderFacingText } from '@proj-alicization/stage-shared'

import { sanitizeText } from './runtime-soul'

interface AlicizationExecutionRuntimeContextActionDigestInput {
  kind: 'executor' | 'mcp' | 'runtime' | 'sensory'
  status: 'completed' | 'failed' | 'pending'
  threadStatus?: 'planned' | 'needs-affirmation' | 'running' | 'paused' | 'blocked' | 'completed' | 'failed' | 'cancelled' | null
  label: string
  summary?: string | null
}

interface AlicizationExecutionProjectBriefingInput {
  identity?: string | null
  currentPhase?: string | null
  latestLandedProgress?: string | null
  latestProgress?: string | null
  landedProgressSummary?: string | null
  primaryOpenLoop?: string | null
  openClosureSummary?: string | null
  nextClosureTarget?: string | null
  nextClosureTargetSummary?: string | null
  sameHerSelfLine?: string | null
  sameHerHoldDetail?: string | null
  continuityArcStage?: string | null
  continuityRestraint?: 'lower-pressure' | 'measured-return' | 'repair-before-closeness' | 'rest-protective' | 'single-thread' | null
  sameHerDriftRisk?: string | null
  sameHerDriftRiskSummary?: string | null
  proactiveSameHerGap?: string | null
  companionHeadlineLine?: string | null
  companionBriefingLine?: string | null
  emotionalClosureSummary?: string | null
  continuityCue?: string | null
  continuityPreferredTiming?: 'internal-only' | 'after-payoff' | 'same-turn-if-invited' | 'next-open-window' | null
  continuityCadence?: string | null
  preferredBlinkCadence?: 'normal' | 'linger' | 'quiet' | null
  preferredGazeMode?: 'steady' | 'soften' | 'drift' | null
  preferredPauseMode?: 'longer' | 'natural' | null
  preferredLipsyncMode?: 'restrained' | 'matched' | null
  preferredVoiceMode?: 'lower-pressure' | 'even' | null
  preferredPacingMode?: 'slower' | 'natural' | null
  preflightSummary?: string | null
  preDialogueAwarenessLine?: string | null
  preDialogueAwarenessSummary?: string | null
}

const placeholderValues = new Set([
  'none',
  'null',
  'unknown',
  'n/a',
  'na',
])

function sanitizeBoundedText(raw: unknown, maxChars: number) {
  const text = sanitizeText(raw)
  if (!text)
    return ''
  return text.slice(0, maxChars)
}

function sanitizeExecutionStatusFact(raw: unknown, maxChars: number) {
  const text = sanitizeBoundedText(raw, maxChars)
  if (!text || placeholderValues.has(text.toLowerCase()))
    return ''
  return sanitizeAlicizationProviderFacingText(text, maxChars)
}

function normalizeEnum<T extends string>(
  raw: unknown,
  values: readonly T[],
): T | null {
  const value = sanitizeBoundedText(raw, 64)
  return values.includes(value as T) ? value as T : null
}

function normalizeSlug(raw: unknown, maxChars = 120) {
  const value = sanitizeBoundedText(raw, maxChars)
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value) ? value : null
}

function compactExecutionRuntimeList(
  raw: readonly unknown[] | null | undefined,
  maxItems: number,
  maxChars: number,
) {
  if (!Array.isArray(raw))
    return []

  const items: string[] = []
  for (const item of raw) {
    const normalized = sanitizeBoundedText(item, maxChars)
    if (!normalized || items.includes(normalized))
      continue
    items.push(normalized)
    if (items.length >= maxItems)
      break
  }
  return items
}

function buildMemoryClosureExecutionFromTrace(
  trace: AlicizationDigitalLifeSpineMemoryClosureTrace | null | undefined,
): AlicizationExecutionRuntimeMemoryClosureExecution | null {
  if (!trace || trace.authority !== 'memory-os')
    return null

  const execution = trace.nextInfluence.execution
  const normalized = {
    authority: 'memory-os',
    carry: sanitizeBoundedText(execution.carry, 220) || null,
    nextLearningAction: sanitizeBoundedText(execution.nextLearningAction, 80) || null,
    shouldVerify: execution.shouldVerify === true,
    shouldReflect: execution.shouldReflect === true,
    activeLearningFocuses: compactExecutionRuntimeList(execution.activeLearningFocuses, 8, 120),
    reasonTags: compactExecutionRuntimeList(trace.reasonTags, 12, 80),
    closureState: {
      state: sanitizeBoundedText(trace.closureState.state, 80) || null,
      open: trace.closureState.open === true,
      revisionRequired: trace.closureState.revisionRequired === true,
      shouldLabelUncertainty: trace.closureState.shouldLabelUncertainty === true,
      visibleCarryMode: sanitizeBoundedText(trace.closureState.visibleCarryMode, 80) || null,
      retrievalQuality: sanitizeBoundedText(trace.closureState.retrievalQuality, 80) || null,
      conflictPressure: sanitizeBoundedText(trace.closureState.conflictPressure, 80) || null,
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

function normalizeExecutionProjectBriefing(
  raw: AlicizationExecutionProjectBriefingInput | null | undefined,
): AlicizationExecutionRuntimeContext['projectBriefing'] {
  if (!raw)
    return null

  const latestLandedProgress
    = sanitizeExecutionStatusFact(raw.latestLandedProgress, 320)
      || sanitizeExecutionStatusFact(raw.latestProgress, 320)
      || sanitizeExecutionStatusFact(raw.landedProgressSummary, 320)
      || null
  const primaryOpenLoop
    = sanitizeExecutionStatusFact(raw.primaryOpenLoop, 320)
      || sanitizeExecutionStatusFact(raw.openClosureSummary, 320)
      || null
  const nextClosureTarget
    = sanitizeExecutionStatusFact(raw.nextClosureTarget, 320)
      || sanitizeExecutionStatusFact(raw.nextClosureTargetSummary, 320)
      || null
  const continuityArcStage = normalizeSlug(raw.continuityArcStage)
  const continuityRestraint = normalizeEnum(raw.continuityRestraint, [
    'lower-pressure',
    'measured-return',
    'repair-before-closeness',
    'rest-protective',
    'single-thread',
  ] as const)
  const continuityPreferredTiming = normalizeEnum(raw.continuityPreferredTiming, [
    'internal-only',
    'after-payoff',
    'same-turn-if-invited',
    'next-open-window',
  ] as const)
  const continuityCadence = normalizeSlug(raw.continuityCadence)
  const preferredBlinkCadence = normalizeEnum(raw.preferredBlinkCadence, ['normal', 'linger', 'quiet'] as const)
  const preferredGazeMode = normalizeEnum(raw.preferredGazeMode, ['steady', 'soften', 'drift'] as const)
  const preferredPauseMode = normalizeEnum(raw.preferredPauseMode, ['longer', 'natural'] as const)
  const preferredLipsyncMode = normalizeEnum(raw.preferredLipsyncMode, ['restrained', 'matched'] as const)
  const preferredVoiceMode = normalizeEnum(raw.preferredVoiceMode, ['lower-pressure', 'even'] as const)
  const preferredPacingMode = normalizeEnum(raw.preferredPacingMode, ['slower', 'natural'] as const)

  const normalized = {
    identity: null,
    currentPhase: null,
    latestLandedProgress,
    primaryOpenLoop,
    nextClosureTarget,
    sameHerSelfLine: null,
    sameHerHoldDetail: null,
    continuityArcStage,
    sameHerDriftRisk: null,
    proactiveSameHerGap: null,
    companionBriefingLine: null,
    emotionalClosureSummary: null,
    continuityRestraint,
    continuityCue: null,
    continuityPreferredTiming,
    continuityCadence,
    preferredBlinkCadence,
    preferredGazeMode,
    preferredPauseMode,
    preferredLipsyncMode,
    preferredVoiceMode,
    preferredPacingMode,
    preflightSummary: null,
    preDialogueAwarenessLine: null,
    preDialogueAwarenessSummary: null,
  } satisfies NonNullable<AlicizationExecutionRuntimeContext['projectBriefing']>

  return Object.values(normalized).some(Boolean) ? normalized : null
}

export function buildAlicizationExecutionRuntimeContext(input: {
  agentSessionId?: string | null
  affectiveResidue?: AlicizationExecutionRuntimeContext['affectiveResidue']
  cardId: string
  decisionTraceId?: string | null
  derivedMindStateBundle?: AlicizationExecutionRuntimeContext['derivedMindStateBundle']
  memoryClosureTrace?: AlicizationDigitalLifeSpineMemoryClosureTrace | null
  projectBriefing?: AlicizationExecutionProjectBriefingInput | null
  recentActions?: AlicizationExecutionRuntimeContextActionDigestInput[] | null
  sessionId?: string | null
  turnId: string
  sensorySnapshot: AlicizationSensoryCacheSnapshot
  getNow?: () => number
}): AlicizationExecutionRuntimeContext {
  const getNow = input.getNow ?? Date.now
  const foregroundWindow = input.sensorySnapshot.sample.foregroundWindow
  const capture = input.sensorySnapshot.capture
  const affectiveResidue = input.affectiveResidue ?? null
  const derivedMindStateBundle = input.derivedMindStateBundle ?? null
  const memoryClosureExecution = buildMemoryClosureExecutionFromTrace(input.memoryClosureTrace)

  return {
    generatedAt: getNow(),
    cardId: sanitizeBoundedText(input.cardId, 120) || null,
    decisionTraceId: sanitizeBoundedText(input.decisionTraceId, 200) || null,
    turnId: sanitizeBoundedText(input.turnId, 160) || null,
    sessionId: sanitizeBoundedText(input.sessionId, 160) || null,
    agentSessionId: sanitizeBoundedText(input.agentSessionId, 160) || null,
    ...(affectiveResidue ? { affectiveResidue } : {}),
    ...(derivedMindStateBundle ? { derivedMindStateBundle } : {}),
    ...(memoryClosureExecution ? { memoryClosureExecution } : {}),
    projectBriefing: normalizeExecutionProjectBriefing(input.projectBriefing),
    recentActions: Array.isArray(input.recentActions)
      ? input.recentActions
          .map(action => ({
            kind: action.kind,
            status: action.status,
            threadStatus: action.threadStatus ?? null,
            label: sanitizeBoundedText(action.label, 120),
            summary: sanitizeBoundedText(action.summary, 180) || null,
          }))
          .filter(action => action.label)
          .slice(0, 6)
      : [],
    sensory: {
      collectedAt: input.sensorySnapshot.sample.collectedAt ?? null,
      running: input.sensorySnapshot.running !== false,
      stale: input.sensorySnapshot.stale === true,
      ageMs: Number.isFinite(input.sensorySnapshot.ageMs)
        ? Math.max(0, Math.floor(input.sensorySnapshot.ageMs))
        : 0,
      foregroundWindow: foregroundWindow
        ? {
            appName: sanitizeBoundedText(foregroundWindow.appName, 120) || undefined,
            processName: sanitizeBoundedText(foregroundWindow.processName, 120) || undefined,
            title: sanitizeBoundedText(foregroundWindow.title, 200) || undefined,
          }
        : null,
      capture: capture
        ? {
            health: capture.health ?? null,
            permission: capture.permission ?? null,
            sourceCount: typeof capture.sourceCount === 'number' ? capture.sourceCount : null,
            lastUpdatedAt: capture.lastUpdatedAt ?? null,
            lastError: sanitizeBoundedText(capture.lastError, 240) || null,
            degradedReasons: compactExecutionRuntimeList(capture.degradedReasons, 8, 80),
          }
        : null,
    },
  }
}
