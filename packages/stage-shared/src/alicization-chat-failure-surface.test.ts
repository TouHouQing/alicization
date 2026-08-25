import { describe, expect, it } from 'vitest'

import {
  extractAlicizationProviderRequestFailure,
  extractAlicizationToolExecutionFailure,
  isAlicizationToolExecutionFailureResult,
  resolveAlicizationChatFailureSurface,
} from './alicization-chat-failure-surface'

describe('alicization chat failure surface', () => {
  it('renders timeout as direct infrastructure failure instead of persona prose', () => {
    const surface = resolveAlicizationChatFailureSurface({
      kind: 'timeout',
      userText: '你好',
      timeout: {
        providerId: 'openai-compatible',
        model: 'gpt-5.4',
        phase: 'provider-first-event',
      },
    })

    expect(surface.reply).toBe('Provider 等待首个响应超时（openai-compatible / gpt-5.4）。')
    expect(surface.timeout).toEqual({
      providerId: 'openai-compatible',
      model: 'gpt-5.4',
      phase: 'provider-first-event',
    })
    expect(surface.nonHumanAuthoredStatus).toBe('direct-infra-repair:timeout')
    expect(surface.excludeFromPersonaLearning).toBe(true)
    expect(surface.visibleReplySource).toBe('infrastructure-failure')
    expect(surface.origin).toBe('failure-surface')
    expect(surface.allowLongTermCondensation).toBe(false)
    expect(surface.allowPersonaLearning).toBe(false)
    expect(surface.allowTraining).toBe(false)
  })

  it('routes schema, recall, and persistence failures to explicit transparent surfaces', () => {
    const cases = [
      {
        kind: 'provider-schema-unsupported',
        reply: '当前 Provider/模型不支持所需的输出模式。',
      },
      {
        kind: 'provider-output-invalid',
        reply: '模型输出格式异常，这轮回复已拦截。',
      },
      {
        kind: 'provider-continuation-timeout',
        reply: '工具已完成，但 Provider 等待最终回复超时（openai-compatible / gpt-5.4）。',
      },
      {
        kind: 'provider-continuation-incomplete',
        reply: '工具已完成，但 Provider 没有返回最终回复。',
      },
      {
        kind: 'recall-failure',
        reply: '本轮长期记忆召回失败。',
      },
      {
        kind: 'memory-persistence',
        reply: '本轮记忆持久化失败。',
      },
    ] as const

    for (const failure of cases) {
      const surface = resolveAlicizationChatFailureSurface({
        kind: failure.kind,
        userText: '请继续这一轮',
        ...(failure.kind === 'provider-continuation-timeout'
          ? {
              timeout: {
                providerId: 'openai-compatible',
                model: 'gpt-5.4',
                phase: 'provider-continuation' as const,
              },
            }
          : {}),
      })

      expect(surface.reply).toBe(failure.reply)
      expect(surface.reply).not.toMatch(/mind-repair|回复流失败/)
      expect(surface.nonHumanAuthoredStatus).toBe(`direct-infra-repair:${failure.kind}`)
      expect(surface.origin).toBe('failure-surface')
      expect(surface.allowLongTermCondensation).toBe(false)
      expect(surface.allowPersonaLearning).toBe(false)
      expect(surface.allowTraining).toBe(false)
      expect(surface.visibleReplySource).toBe('infrastructure-failure')
      expect(surface.excludeFromPersonaLearning).toBe(true)
      expect(surface.excludeFromMemoryCondensation).toBe(true)
    }
  })

  it('preserves safe Provider request diagnostics instead of collapsing HTTP 400 into stream failure', () => {
    const error = new Error(
      'Remote sent 400 response: {"error":{"message":"Upstream request failed.","type":"invalid_request_error"}}',
    )
    const providerRequest = extractAlicizationProviderRequestFailure(error)
    expect(providerRequest).toEqual({
      status: 400,
      code: 'invalid_request_error',
      message: 'Upstream request failed.',
    })
    if (!providerRequest)
      throw new Error('Expected Provider request diagnostics.')

    const surface = resolveAlicizationChatFailureSurface({
      kind: 'provider-request',
      userText: '你好',
      providerRequest: {
        ...providerRequest,
        providerId: 'openai-compatible',
        model: 'gpt-5.4-mini',
      },
    })

    expect(surface.reply).toContain('openai-compatible')
    expect(surface.reply).toContain('gpt-5.4-mini')
    expect(surface.reply).toContain('HTTP 400')
    expect(surface.reply).toContain('invalid_request_error')
    expect(surface.reply).toContain('Upstream request failed。')
    expect(surface.reply).not.toContain('failed.。')
    expect(surface.reply).not.toBe('回复流失败。')
    expect(surface.kind).toBe('provider-request')
    expect(surface.allowLongTermCondensation).toBe(false)
    expect(surface.allowPersonaLearning).toBe(false)
    expect(surface.allowTraining).toBe(false)
    expect(surface.providerRequest).toEqual({
      providerId: 'openai-compatible',
      model: 'gpt-5.4-mini',
      status: 400,
      code: 'invalid_request_error',
      message: 'Upstream request failed.',
    })
  })

  it('redacts credentials and user input from Provider request diagnostics', () => {
    const failure = extractAlicizationProviderRequestFailure(new Error(
      'Remote sent 400 response: {"error":{"message":"Authorization: Bearer secret-token api_key=private-key user_input=private-message","type":"invalid_request_error"}}',
    ))

    expect(failure?.message).not.toContain('secret-token')
    expect(failure?.message).not.toContain('private-key')
    expect(failure?.message).not.toContain('private-message')
    expect(failure?.message).toContain('[redacted]')
  })

  it('classifies executor circular, timeout, and missing-command failures with stable codes', () => {
    expect(extractAlicizationToolExecutionFailure(
      new Error('Circular runtime call detected: tool:executor:codex -> tool:executor:codex'),
    )).toEqual({
      toolName: 'codex',
      code: 'RUNTIME_CALL_CIRCULAR',
      message: 'Circular runtime call detected: tool:executor:codex -> tool:executor:codex',
    })

    const timeoutError = Object.assign(new Error('Command timed out after 120000ms'), {
      code: 'ETIMEDOUT',
    })
    expect(extractAlicizationToolExecutionFailure(timeoutError, 'executor_run_codex')).toMatchObject({
      toolName: 'codex',
      code: 'CODEX_TIMEOUT',
    })

    const missingCommandError = Object.assign(new Error('spawn codex ENOENT'), {
      code: 'ENOENT',
    })
    expect(extractAlicizationToolExecutionFailure(missingCommandError, 'executor_run_codex')).toMatchObject({
      toolName: 'codex',
      code: 'CODEX_COMMAND_NOT_FOUND',
    })

    const serializedTimeoutResult = JSON.stringify({
      status: 'failed',
      failureKind: 'tool-execution',
      toolName: 'executor_run_codex',
      errorCode: 'CODEX_TIMEOUT',
      errorMessage: 'Codex timed out after 120000ms.',
    })
    expect(isAlicizationToolExecutionFailureResult(serializedTimeoutResult)).toBe(true)
    expect(extractAlicizationToolExecutionFailure(serializedTimeoutResult)).toEqual({
      toolName: 'codex',
      code: 'CODEX_TIMEOUT',
      message: 'Codex timed out after 120000ms.',
    })

    expect(isAlicizationToolExecutionFailureResult({
      status: 'timeout',
      toolName: 'executor_run_codex',
      errorCode: 'CODEX_TIMEOUT',
      errorMessage: 'Codex timed out after 120000ms.',
    })).toBe(true)

    expect(extractAlicizationToolExecutionFailure(JSON.stringify({
      status: 'failed',
      failureKind: 'tool-execution',
      toolName: 'executor_run_codex',
      errorCode: 'CODEX_EMPTY_OUTPUT',
      errorMessage: 'Codex exited successfully without producing an assistant response.',
    }))).toEqual({
      toolName: 'codex',
      code: 'CODEX_EMPTY_OUTPUT',
      message: 'Codex exited successfully without producing an assistant response.',
    })

    const protocolIncompleteResult = JSON.stringify({
      status: 'failed',
      toolName: 'executor_run_codex',
      errorCode: 'CODEX_PROTOCOL_INCOMPLETE',
      errorMessage: 'Codex exited without emitting turn.completed or turn.failed.',
    })
    expect(isAlicizationToolExecutionFailureResult(protocolIncompleteResult)).toBe(true)
    expect(extractAlicizationToolExecutionFailure(protocolIncompleteResult)).toEqual({
      toolName: 'codex',
      code: 'CODEX_PROTOCOL_INCOMPLETE',
      message: 'Codex exited without emitting turn.completed or turn.failed.',
    })
  })

  it('does not leak an unknown legacy executor identity into the failure surface', () => {
    expect(extractAlicizationToolExecutionFailure(
      new Error('tool:executor:future-agent failed to execute'),
    )).toEqual({
      toolName: 'tool',
      code: 'TOOL_EXECUTION_FAILED',
      message: 'tool:executor:future-agent failed to execute',
    })
  })

  it.each([
    ['executor_run_coding_agent', 'coding_agent'],
    ['executor_run_codex', 'codex'],
    ['executor_run_cli', 'cli'],
    ['executor_run_claude_code', 'claude_code'],
    ['executor_run_local_visual', 'local_visual'],
    ['executor_run_openclaw', 'openclaw'],
  ])('projects internal adapter identity %s to canonical tool name %s', (adapterToolName, canonicalToolName) => {
    const failure = extractAlicizationToolExecutionFailure({
      status: 'failed',
      failureKind: 'tool-execution',
      toolName: adapterToolName,
      errorCode: 'TOOL_EXECUTION_FAILED',
      errorMessage: `Internal adapter ${adapterToolName} failed.`,
    })

    expect(failure).toEqual({
      toolName: canonicalToolName,
      code: 'TOOL_EXECUTION_FAILED',
      message: `Internal adapter ${adapterToolName} failed.`,
    })
    expect(failure?.toolName).not.toContain('executor_run_')
  })

  it('renders tool failures as infrastructure-only learning artifacts', () => {
    const surface = resolveAlicizationChatFailureSurface({
      kind: 'tool-execution',
      userText: '请用 Codex 检查仓库',
      toolExecution: {
        toolName: 'executor_run_codex',
        code: 'CODEX_COMMAND_NOT_FOUND',
        message: 'spawn codex ENOENT',
      },
    })

    expect(surface.reply).toContain('Codex')
    expect(surface.reply).toContain('CODEX_COMMAND_NOT_FOUND')
    expect(surface.reply).toContain('spawn codex ENOENT')
    expect(surface.toolExecution).toEqual({
      toolName: 'codex',
      code: 'CODEX_COMMAND_NOT_FOUND',
      message: 'spawn codex ENOENT',
    })
    expect(surface.toolExecution?.toolName).not.toContain('executor_run_')
    expect(surface.allowLongTermCondensation).toBe(false)
    expect(surface.allowPersonaLearning).toBe(false)
    expect(surface.allowTraining).toBe(false)
    expect(surface.excludeFromMemoryCondensation).toBe(true)
  })

  it('keeps authorization denial and cancellation outside tool execution failure classification', () => {
    expect(isAlicizationToolExecutionFailureResult({
      status: 'blocked',
      ok: false,
      errorCode: 'ALICIZATION_TOOL_DENIED_BY_HOST',
    })).toBe(false)
    expect(isAlicizationToolExecutionFailureResult({
      status: 'cancelled',
      ok: false,
      errorCode: 'ALICIZATION_TOOL_ABORTED',
    })).toBe(false)
    expect(isAlicizationToolExecutionFailureResult({
      status: 'failed',
      ok: false,
      errorCode: 'CODEX_TIMEOUT',
    })).toBe(true)
    expect(isAlicizationToolExecutionFailureResult({
      status: 'failed',
      ok: false,
      errorCode: 'FILESYSTEM_INVALID_PATH',
      summary: 'The requested path is invalid.',
    })).toBe(false)
    expect(isAlicizationToolExecutionFailureResult({
      status: 'failed',
      failureKind: 'tool-execution',
      errorCode: 'TOOL_EXECUTION_FAILED',
      toolName: 'executor_run_codex',
    })).toBe(true)
  })

  it('classifies every concrete Codex adapter failure code without requiring a duplicated failure kind', () => {
    for (const errorCode of [
      'CODEX_EXECUTE_FAILED',
      'CODEX_PROVIDER_UNAVAILABLE',
      'CODEX_EMPTY_OUTPUT',
      'CODEX_PROTOCOL_INCOMPLETE',
      'CODEX_PROCESS_REAP_FAILED',
      'CODEX_CONFIG_INVALID',
      'CODEX_PROFILE_INVALID',
    ]) {
      expect(isAlicizationToolExecutionFailureResult({
        status: 'failed',
        ok: false,
        errorCode,
        errorMessage: `${errorCode} diagnostic`,
        toolName: 'executor_run_codex',
      }), errorCode).toBe(true)
    }

    expect(isAlicizationToolExecutionFailureResult({
      status: 'cancelled',
      ok: false,
      errorCode: 'CODEX_ABORTED',
      toolName: 'executor_run_codex',
    })).toBe(false)
  })

  it('classifies an explicitly stopped executor result even when its provider-facing error code is not on a lexical allowlist', () => {
    const result = {
      status: 'failed',
      finalStatus: 'failed',
      continuationPolicy: 'stop',
      ok: false,
      errorCode: 'CODEX_PERMISSION_REQUIRED',
      errorMessage: 'Codex requires permission before it can continue.',
      toolName: 'executor_run_codex',
    }

    expect(isAlicizationToolExecutionFailureResult(result)).toBe(true)
    expect(extractAlicizationToolExecutionFailure(result)).toEqual({
      toolName: 'codex',
      code: 'CODEX_PERMISSION_REQUIRED',
      message: 'Codex requires permission before it can continue.',
    })
  })
})
