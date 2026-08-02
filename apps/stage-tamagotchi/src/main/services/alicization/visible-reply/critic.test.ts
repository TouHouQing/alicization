import { describe, expect, it } from 'vitest'

import {
  buildAlicizationVisibleReplyCriticArtifact,
  shouldBlockAlicizationVisibleReply,
} from './critic'

const providerExecution = {
  mode: 'provider-stream',
  expectedVisibleReplyAuthority: 'llm-mind',
  actualVisibleReplyAuthority: 'llm-mind',
  providerMindExecuted: true,
  reason: 'provider-stream',
} as const

describe('visible-reply-critic', () => {
  it('passes a provider-authored reply and emits no rewrite prose', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({ reply: '我看到了，先处理当前这个报错。' }),
      visibleReplyExecution: providerExecution as any,
      prepared: {
        replyRealization: { replyRealizationMode: 'provider-mind-required' },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(artifact).not.toHaveProperty('mustDrop')
    expect(artifact).not.toHaveProperty('mustPreserve')
    expect(artifact).not.toHaveProperty('repairReasonCodes')
    expect(shouldBlockAlicizationVisibleReply(artifact)).toBe(false)
  })

  it('blocks a local fallback on a provider-owned reply surface', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({ reply: 'local fallback' }),
      visibleReplyExecution: {
        ...providerExecution,
        mode: 'local-fallback',
        actualVisibleReplyAuthority: 'local-deterministic-fallback',
        providerMindExecuted: false,
      } as any,
      prepared: {
        replyRealization: { replyRealizationMode: 'provider-mind-required' },
      } as any,
    })

    expect(artifact.status).toBe('blocked')
    expect(artifact.reasonCodes).toContain('non-human-authored-visible-reply')
    expect(shouldBlockAlicizationVisibleReply(artifact)).toBe(true)
  })

  it('does not content-score or block a provider-authored reply', () => {
    const artifact = buildAlicizationVisibleReplyCriticArtifact({
      fullText: JSON.stringify({
        reply: '我记得上次也是这样。',
      }),
      visibleReplyExecution: providerExecution as any,
      prepared: {
        memoryTurnArtifact: { visibleMemoryGate: { status: 'inward-only' } },
      } as any,
    })

    expect(artifact.status).toBe('pass')
    expect(artifact.reasonCodes).toEqual([])
    expect(artifact).not.toHaveProperty('semanticJudge')
    expect(artifact).not.toHaveProperty('scores')
    expect(shouldBlockAlicizationVisibleReply(artifact)).toBe(false)
  })
})
