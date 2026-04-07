import type { AlicizationExecutionRuntimeContext } from '@proj-alicization/stage-shared'

import type { AlicizationSensoryCacheSnapshot } from '../../../shared/eventa'

import { sanitizeText } from './runtime-soul'

interface AlicizationExecutionRuntimeContextActionDigestInput {
  kind: 'executor' | 'mcp' | 'runtime' | 'sensory'
  status: 'completed' | 'failed' | 'pending'
  label: string
  summary?: string | null
}

function sanitizeBoundedText(raw: unknown, maxChars: number) {
  const text = sanitizeText(raw)
  if (!text)
    return ''
  return text.slice(0, maxChars)
}

export function buildAlicizationExecutionRuntimeContext(input: {
  agentSessionId?: string | null
  cardId: string
  decisionTraceId?: string | null
  recentActions?: AlicizationExecutionRuntimeContextActionDigestInput[] | null
  sessionId?: string | null
  turnId: string
  sensorySnapshot: AlicizationSensoryCacheSnapshot
  getNow?: () => number
}): AlicizationExecutionRuntimeContext {
  const getNow = input.getNow ?? Date.now
  const foregroundWindow = input.sensorySnapshot.sample.foregroundWindow
  const capture = input.sensorySnapshot.capture

  return {
    generatedAt: getNow(),
    cardId: sanitizeText(input.cardId) || null,
    decisionTraceId: sanitizeText(input.decisionTraceId) || null,
    turnId: sanitizeText(input.turnId) || null,
    sessionId: sanitizeText(input.sessionId) || null,
    agentSessionId: sanitizeText(input.agentSessionId) || null,
    recentActions: Array.isArray(input.recentActions)
      ? input.recentActions
          .map(action => ({
            kind: action.kind,
            status: action.status,
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
      ageMs: Number.isFinite(input.sensorySnapshot.ageMs) ? Math.max(0, Math.floor(input.sensorySnapshot.ageMs)) : 0,
      foregroundWindow: foregroundWindow
        ? {
            appName: sanitizeText(foregroundWindow.appName) || undefined,
            processName: sanitizeText(foregroundWindow.processName) || undefined,
            title: sanitizeText(foregroundWindow.title, '') || undefined,
          }
        : null,
      capture: capture
        ? {
            health: capture.health ?? null,
            permission: capture.permission ?? null,
            sourceCount: typeof capture.sourceCount === 'number' ? capture.sourceCount : null,
            lastUpdatedAt: capture.lastUpdatedAt ?? null,
            lastError: sanitizeText(capture.lastError) || null,
            degradedReasons: [...new Set(capture.degradedReasons
              .map(reason => sanitizeText(reason))
              .filter(Boolean))],
          }
        : null,
    },
  }
}
