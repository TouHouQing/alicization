import type {
  AlicizationDigitalLifeSpineMemoryClosureTrace,
  AlicizationExecutionRuntimeContext,
  AlicizationExecutionRuntimeMemoryClosureExecution,
} from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'

import { sanitizeText } from './runtime-soul'

interface AlicizationExecutionRuntimeContextActionDigestInput {
  kind: 'executor' | 'mcp' | 'runtime' | 'sensory'
  status: 'completed' | 'failed' | 'pending'
  threadStatus?: 'planned' | 'needs-affirmation' | 'running' | 'paused' | 'blocked' | 'completed' | 'failed' | 'cancelled' | null
  label: string
  summary?: string | null
}

function sanitizeBoundedText(raw: unknown, maxChars: number) {
  const text = sanitizeText(raw)
  if (!text)
    return ''
  return text.slice(0, maxChars)
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

export function buildAlicizationExecutionRuntimeContext(input: {
  agentSessionId?: string | null
  affectiveResidue?: AlicizationExecutionRuntimeContext['affectiveResidue']
  cardId: string
  decisionTraceId?: string | null
  derivedMindStateBundle?: AlicizationExecutionRuntimeContext['derivedMindStateBundle']
  memoryClosureTrace?: AlicizationDigitalLifeSpineMemoryClosureTrace | null
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
