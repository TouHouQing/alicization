import { describe, expect, it, vi } from 'vitest'

import {
  blockAlicizationRendererLocalVisibleReply,
  shouldBlockAlicizationRendererLocalVisibleReply,
} from './alicization-visible-reply-guard'

describe('alicization visible reply guard', () => {
  it('blocks renderer local visible replies for Alicization user turns', () => {
    expect(shouldBlockAlicizationRendererLocalVisibleReply({
      isAlicizationUserTurn: true,
    })).toBe(true)
    expect(shouldBlockAlicizationRendererLocalVisibleReply({
      isAlicizationUserTurn: false,
    })).toBe(false)
  })

  it('clears staged visible reply state while preserving non-status slices boundary', () => {
    const setRuntimeBlocked = vi.fn()
    const resetStagedResolution = vi.fn()
    const resetSpeechDraft = vi.fn()
    const resetFinalAssistantDisplayText = vi.fn()
    const buildingMessage = {
      content: 'local fallback text',
      slices: [
        { type: 'text', text: 'local fallback text' } as any,
        { type: 'execution-status', phase: 'tool-running', label: 'CLI 正在处理这件事', source: 'builtin' } as any,
      ],
      categorization: { speech: 'local fallback text' },
      structured: { reply: 'local fallback text' },
    }

    const result = blockAlicizationRendererLocalVisibleReply({
      buildingMessage,
      setRuntimeBlocked,
      resetStagedResolution,
      resetSpeechDraft,
      resetFinalAssistantDisplayText,
      createEmptyStreamingMessage: () => ({
        role: 'assistant',
        content: '',
        slices: [],
        tool_results: [],
      }),
    })

    expect(result.blocked).toBe(true)
    expect(setRuntimeBlocked).toBeCalledTimes(1)
    expect(resetStagedResolution).toBeCalledTimes(1)
    expect(resetSpeechDraft).toBeCalledTimes(1)
    expect(resetFinalAssistantDisplayText).toBeCalledTimes(1)
    expect(buildingMessage.content).toBe('')
    expect(buildingMessage.slices).toEqual([{ type: 'text', text: 'local fallback text' }])
    expect(buildingMessage.categorization).toBeUndefined()
    expect(buildingMessage.structured).toBeUndefined()
    expect(result.streamingMessage.content).toBe('')
  })
})
