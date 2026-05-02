import { describe, expect, it, vi } from 'vitest'

import {
  buildDialogueFeedbackReconsolidationRationale,
  collectRecallTelemetryTexts,
  collectReplyMemoryCoherenceState,
  createAlicizationRuntimeMemoryReconsolidation,
} from './runtime-memory-reconsolidation'

describe('runtime memory reconsolidation', () => {
  it('collects recall telemetry and coherence state from mind events', () => {
    const recallTexts = collectRecallTelemetryTexts({
      whyNow: 'same seam again',
      inwardLine: 'return to the seam',
      visibleLine: 'stay on the same seam',
      selectedEpisodeSummaries: ['we repaired the runtime seam'],
      selectedRelationshipLines: ['leave more room'],
    }, (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback)
    const coherence = collectReplyMemoryCoherenceState({
      coherenceState: 'missed',
      surfacePolicy: 'internal-only',
      explicitSurfaceExpected: true,
      explicitSurfaceObserved: false,
      matchedCueKinds: ['episode', 'procedure'],
    }, (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback)

    expect(recallTexts).toEqual(expect.arrayContaining([
      'same seam again',
      'return to the seam',
    ]))
    expect(coherence).toEqual(expect.objectContaining({
      coherenceState: 'missed',
      surfacePolicy: 'internal-only',
      matchedCueKinds: ['episode', 'procedure'],
    }))
    expect(buildDialogueFeedbackReconsolidationRationale('robotic')).toContain('robotic')
  })

  it('reconsolidates dialogue feedback and appends a memory-reconsolidated mind event', async () => {
    const listMindTurnEvents = vi.fn(async () => [
      {
        kind: 'recall-attribution',
        payload: {
          whyNow: 'the host is reacting to the same seam',
          selectedEpisodeSummaries: ['上一轮像模板壳'],
        },
      },
      {
        kind: 'reply-memory-coherence',
        payload: {
          coherenceState: 'missed',
          matchedCueKinds: ['episode'],
        },
      },
    ])
    const searchEpisodicEvents = vi.fn(async () => [{ id: 'episode-1' }])
    const appendMindTurnEvents = vi.fn(async () => {})
    const appendAuditLog = vi.fn(async () => {})
    const runtime = createAlicizationRuntimeMemoryReconsolidation({
      sanitizeMindGovernanceDecisionTraceId: raw => typeof raw === 'string' ? raw.trim() : '',
      sanitizeText: (raw, fallback = '') => typeof raw === 'string' ? raw.trim() : fallback,
      errorMessageFrom: error => error instanceof Error ? error.message : String(error),
      appendAuditLog,
      alicizationDb: {
        listMindTurnEvents,
        searchEpisodicEvents,
        appendMindTurnEvents,
      },
    })

    await runtime.reconsolidateDialogueFeedbackMemoryTrace({
      cardId: 'card-1',
      decisionTraceId: 'trace-1',
      feedback: 'robotic',
      previousAssistantText: '上一句像模板壳。',
      userText: '你这句太模板了',
      sessionId: 'session-1',
      turnId: 'turn-1',
      at: 10,
    })

    expect(listMindTurnEvents).toHaveBeenCalledWith({
      decisionTraceId: 'trace-1',
      limit: 24,
    })
    expect(searchEpisodicEvents).toHaveBeenCalledWith(expect.objectContaining({
      carryAsMemory: true,
      reconsolidationDecisionTraceId: 'trace-1',
      recollectionIntent: expect.objectContaining({
        mode: 'relationship-history',
      }),
    }))
    expect(appendMindTurnEvents).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        kind: 'memory-reconsolidated',
        payload: expect.objectContaining({
          feedback: 'robotic',
          reconsolidatedCount: 1,
        }),
      }),
    ]))
    expect(appendAuditLog).not.toHaveBeenCalled()
  })
})
