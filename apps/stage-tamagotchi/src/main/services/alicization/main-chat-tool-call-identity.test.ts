import { describe, expect, it } from 'vitest'

import { createAlicizationMainChatToolCallIdentityRegistry } from './main-chat-tool-call-identity'

describe('main chat tool call identity registry', () => {
  it('keeps id-less streaming-start events separate by default', () => {
    const registry = createAlicizationMainChatToolCallIdentityRegistry()

    const firstId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolName: 'executor_run_codex',
    })
    const duplicateId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolName: 'executor_run_codex',
    })

    expect(duplicateId).not.toBe(firstId)
  })

  it('merges provider and executor aliases into one canonical id for one unique call', () => {
    const registry = createAlicizationMainChatToolCallIdentityRegistry()
    const argumentsPayload = {
      prompt: '检查当前工作区',
      effect: 'read-only',
    }

    const providerStreamingId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-tool-call-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const providerCallId = registry.resolveProviderToolCall({
      phase: 'call',
      toolCallId: 'provider-tool-call-2',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const executorId = registry.resolveExecutorToolCall({
      toolCallId: 'executor-tool-call-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })

    expect(providerCallId).toBe(providerStreamingId)
    expect(executorId).toBe(providerStreamingId)
  })

  it('merges drifting provider ids for a configured single-flight executor tool', () => {
    const registry = createAlicizationMainChatToolCallIdentityRegistry({
      singleFlightExecutorToolNames: ['executor_run_codex'],
    })
    const argumentsPayload = {
      prompt: '检查当前工作区',
      effect: 'read-only',
    }
    const result = {
      ok: true,
      summary: '检查完成',
    }

    const firstStreamingId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-streaming-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const driftingStreamingId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-streaming-2',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const providerCallId = registry.resolveProviderToolCall({
      phase: 'call',
      toolCallId: 'provider-call-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const executorId = registry.resolveExecutorToolCall({
      toolCallId: 'executor-call-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    registry.registerExecutorResult(result, 'executor-call-1')
    const resultId = registry.resolveToolResult({
      toolCallId: 'provider-result-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
      result,
    })

    expect(driftingStreamingId).toBe(firstStreamingId)
    expect(providerCallId).toBe(firstStreamingId)
    expect(executorId).toBe(firstStreamingId)
    expect(resultId).toBe(firstStreamingId)
    expect(registry.getToolName('provider-streaming-2')).toBe('executor_run_codex')
    expect(registry.getToolName('provider-call-1')).toBe('executor_run_codex')
    expect(registry.getToolName('executor-call-1')).toBe('executor_run_codex')
    expect(registry.getToolName('provider-result-1')).toBe('executor_run_codex')
  })

  it('reuses the single-flight identity for an id-less duplicate provider call', () => {
    const registry = createAlicizationMainChatToolCallIdentityRegistry({
      singleFlightExecutorToolNames: ['executor_run_codex'],
    })
    const argumentsPayload = {
      prompt: '检查当前工作区',
      effect: 'read-only',
    }

    const streamingId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const firstCallId = registry.resolveProviderToolCall({
      phase: 'call',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const duplicateCallId = registry.resolveProviderToolCall({
      phase: 'call',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })

    expect(firstCallId).toBe(streamingId)
    expect(duplicateCallId).toBe(streamingId)
  })

  it('does not rebind a settled provider id to a later single-flight call', () => {
    const registry = createAlicizationMainChatToolCallIdentityRegistry({
      singleFlightExecutorToolNames: ['executor_run_codex'],
    })
    const argumentsPayload = {
      prompt: '检查当前工作区',
      effect: 'read-only',
    }
    const settledId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-settled-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    registry.resolveToolResult({
      toolCallId: 'provider-settled-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
      result: { ok: true },
    })
    const activeId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-active-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const lateSettledId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-settled-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const lateSettledCallId = registry.resolveProviderToolCall({
      phase: 'call',
      toolCallId: 'provider-settled-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const lateSettledResultId = registry.resolveToolResult({
      toolCallId: 'provider-settled-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
      result: { ok: true },
    })

    expect(activeId).not.toBe(settledId)
    expect(lateSettledId).toBe(settledId)
    expect(lateSettledCallId).toBe(settledId)
    expect(lateSettledResultId).toBe(settledId)
    expect(registry.getToolName('provider-active-1')).toBe('executor_run_codex')
  })

  it('keeps concurrent same-tool calls separate when the alias is ambiguous', () => {
    const registry = createAlicizationMainChatToolCallIdentityRegistry()
    const argumentsPayload = {
      prompt: '检查当前工作区',
      effect: 'read-only',
    }

    const firstId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-concurrent-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const secondId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-concurrent-2',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })
    const executorId = registry.resolveExecutorToolCall({
      toolCallId: 'executor-concurrent-1',
      toolName: 'executor_run_codex',
      arguments: argumentsPayload,
    })

    expect(executorId).not.toBe(firstId)
    expect(executorId).not.toBe(secondId)
  })

  it('canonicalizes executor progress aliases to the one active tool call', () => {
    const registry = createAlicizationMainChatToolCallIdentityRegistry({
      singleFlightExecutorToolNames: ['executor_run_codex'],
    })
    const canonicalId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-codex-call-1',
      toolName: 'executor_run_codex',
      arguments: { prompt: '检查仓库' },
    })

    expect(registry.resolveProgressToolCall({
      toolCallId: 'executor-codex-progress-1',
      toolName: 'executor_run_codex',
    })).toBe(canonicalId)
    expect(registry.resolveProgressToolCall({
      toolCallId: 'executor-codex-progress-2',
      toolName: 'executor_run_codex',
    })).toBe(canonicalId)
    expect(registry.getToolName('executor-codex-progress-2')).toBe('executor_run_codex')
  })

  it('keeps late progress bound to a settled canonical id instead of creating a new call', () => {
    const registry = createAlicizationMainChatToolCallIdentityRegistry({
      singleFlightExecutorToolNames: ['executor_run_codex'],
    })
    const canonicalId = registry.resolveProviderToolCall({
      phase: 'streaming-start',
      toolCallId: 'provider-codex-settled-1',
      toolName: 'executor_run_codex',
      arguments: { prompt: '检查仓库' },
    })
    registry.resolveToolResult({
      toolCallId: canonicalId,
      toolName: 'executor_run_codex',
      arguments: { prompt: '检查仓库' },
      result: { ok: true },
    })

    expect(registry.resolveProgressToolCall({
      toolCallId: 'provider-codex-settled-1',
      toolName: 'executor_run_codex',
    })).toBe(canonicalId)
  })
})
