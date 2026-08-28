import { alicizationPrimaryConversationSessionId } from '@proj-alicization/stage-shared'
import { describe, expect, it, vi } from 'vitest'

import { createAlicizationAgentSessionMirrorRuntime } from './runtime-agent-session-mirror'

describe('runtime agent session mirror', () => {
  it('writes mirror state under the canonical card session even when a callback carries a legacy session id', () => {
    const ingestAgentSessionSnapshot = vi.fn(() => ({
      cardId: 'card-a',
      sessionId: alicizationPrimaryConversationSessionId('card-a'),
    } as any))
    const runtime = createAlicizationAgentSessionMirrorRuntime({
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      sanitizeBriefText: raw => raw.trim(),
      normalizeCardId: raw => typeof raw === 'string' ? raw.trim() : '',
      normalizeSessionId: raw => typeof raw === 'string' ? raw.trim() : '',
      getActiveSessionIdByCard: () => 'legacy-session',
      getLatestConversationSessionId: async () => 'legacy-session',
      openAgentTurn: async () => ({
        conversationSessionId: alicizationPrimaryConversationSessionId('card-a'),
        getSessionSnapshot: () => ({ id: 'agent-session-a' } as any),
        snapshot: () => ({ phaseOrder: [] }),
      } as any),
      buildMainGatewayAgentTurnId: () => 'turn-a',
      resolveAgentSessionContinuityContext: async () => ({
        digitalLifeRuntimeSurface: null,
        sessionContinuitySignals: [],
      }),
      buildTaskThreadSessionMirrorAction: () => ({ kind: 'runtime', label: 'task', status: 'completed' }),
      buildSceneResidueSessionMirrorAction: () => ({ kind: 'runtime', label: 'scene', status: 'completed' }),
      buildProactiveFeedbackSessionMirrorAction: () => ({ kind: 'runtime', label: 'feedback', status: 'completed' }),
      buildProactiveOutcomeContinuitySignal: () => ({ kind: 'proactive', label: 'feedback' }),
      buildReminderSessionMirrorAction: () => ({ kind: 'runtime', label: 'reminder', status: 'completed' }),
      dialogueSessionManager: {
        getSessionMirror: vi.fn(() => null),
        ingestAgentSessionSnapshot,
      },
    })

    runtime.syncAgentTurnSessionMirror({
      agentTurn: {
        conversationSessionId: alicizationPrimaryConversationSessionId('card-a'),
        getSessionSnapshot: () => ({ id: 'agent-session-a' } as any),
        snapshot: () => ({ phaseOrder: [] }),
      } as any,
      cardId: 'card-a',
      sessionId: 'legacy-session',
      source: 'execution-callback',
    })

    expect(ingestAgentSessionSnapshot).toHaveBeenCalledWith(expect.objectContaining({
      cardId: 'card-a',
      sessionId: alicizationPrimaryConversationSessionId('card-a'),
    }))
  })
})
