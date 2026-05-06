import { describe, expect, it } from 'vitest'

import {
  buildAlicizationVisibleReplyCriticArtifact,
  shouldForceAlicizationVisibleReplyRepair,
} from './critic'

describe('visible-reply-critic', () => {
  it('passes a compact provider-authored reply that respects the memory gate', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '先把你现在真正卡住的点接住，再看要不要往旧线索里延伸。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        governance: {
          screenReferenceMode: 'avoid',
          liveSurface: 'IntelliJ IDEA',
        },
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'inward-only',
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(false)
  })

  it('requires repair for shell opener, unsupported surface detail, and inward-only visible memory leakage', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我先直接回答你。我记得你刚才就在 IntelliJ IDEA 里改那个东西，上次也是这样。',
      }),
      visibleReplyExecution: {
        mode: 'provider-stream',
        expectedVisibleReplyAuthority: 'llm-mind',
        actualVisibleReplyAuthority: 'llm-mind',
        providerMindExecuted: true,
        reason: 'provider-stream',
      },
      prepared: {
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
        governance: {
          screenReferenceMode: 'avoid',
          liveSurface: 'Finder',
        },
        memoryTurnArtifact: {
          visibleMemoryGate: {
            status: 'inward-only',
          },
        },
      } as any,
    })

    expect(artifact.status).toBe('repair-required')
    expect(artifact.reasonCodes).toEqual(expect.arrayContaining([
      'dialogue-shell-opener',
      'unsupported-surface-specificity',
    ]))
    expect(artifact.reasonCodes.some(code => code.startsWith('visible-memory-gate-violation'))).toBe(true)
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })

  it('blocks non-human-authored local fallback on provider-required turns', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: '{"reply":"这句不该被放出来。"}',
      visibleReplyExecution: {
        mode: 'local-fallback',
        expectedVisibleReplyAuthority: 'llm-second-pass-rewrite',
        actualVisibleReplyAuthority: 'local-deterministic-fallback',
        providerMindExecuted: false,
        reason: 'timeout-recovered-local-fallback',
      },
      prepared: {
        replyRealization: {
          replyRealizationMode: 'provider-mind-required',
        },
      } as any,
    })

    expect(artifact.status).toBe('blocked')
    expect(artifact.reasonCodes).toContain('non-human-authored-visible-reply')
    expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(true)
  })
})
