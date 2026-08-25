import { describe, expect, it } from 'vitest'

import {
  buildAlicizationCodingAgentDelegationAuthority,
  isAlicizationCodingAgentCapabilityQuestion,
  normalizeAlicizationCodingAgentTask,
  resolveAlicizationExplicitCodingAgentConstraint,
  validateAlicizationCodingAgentInvocation,
} from './coding-agent-task-contract'

describe('coding agent task contract', () => {
  it.each([
    ['用 Codex 帮我总结这个项目', 'codex'],
    ['请使用 Claude Code 检查这个仓库', 'claude-code'],
    ['请通过 CLI 执行 pnpm test', 'cli'],
  ])('locks an explicitly named channel without deciding execution intent: %s', (userText, agent) => {
    expect(resolveAlicizationExplicitCodingAgentConstraint(userText)).toEqual({
      kind: 'single',
      agent,
    })
  })

  it('does not treat a capability question as an execution decision', () => {
    expect(resolveAlicizationExplicitCodingAgentConstraint('你可以使用 Codex 做什么？')).toEqual({
      kind: 'single',
      agent: 'codex',
    })
  })

  it.each([
    'Codex 能做什么？',
    '我想了解你可以用 Codex 做哪些事。',
    '你可以介绍一下 Claude Code 有什么能力吗？',
    'Can you tell me what Codex can do?',
  ])('recognizes a Coding Agent capability question without treating it as execution: %s', (userText) => {
    expect(isAlicizationCodingAgentCapabilityQuestion(userText)).toBe(true)
  })

  it.each([
    '请用 Codex 检查这个项目。',
    '请用 Claude Code 修改这个文件。',
    '请通过 CLI 执行 pnpm test。',
  ])('does not classify an explicit Coding Agent task as a capability question: %s', (userText) => {
    expect(isAlicizationCodingAgentCapabilityQuestion(userText)).toBe(false)
  })

  it('ignores a negatively mentioned alternative channel', () => {
    expect(resolveAlicizationExplicitCodingAgentConstraint('用 Codex 检查项目，不要用 CLI')).toEqual({
      kind: 'single',
      agent: 'codex',
    })
  })

  it('does not guess when multiple channels are positively named', () => {
    expect(resolveAlicizationExplicitCodingAgentConstraint('Codex 和 Claude Code 都可以吗？')).toEqual({
      kind: 'none',
    })
  })

  it('defaults an underspecified coding request to read-only investigation', () => {
    expect(normalizeAlicizationCodingAgentTask({})).toEqual({
      kind: 'codebase-investigation',
      effect: 'observe',
      allowTools: false,
      sandbox: 'read-only',
    })
  })

  it('does not allow Claude Code tools for an observe-only investigation', () => {
    expect(normalizeAlicizationCodingAgentTask({
      kind: 'codebase-investigation',
      effect: 'observe',
      allowTools: true,
      sandbox: 'workspace-write',
    })).toEqual({
      kind: 'codebase-investigation',
      effect: 'observe',
      allowTools: false,
      sandbox: 'read-only',
    })
  })

  it('preserves an explicit edit task as a mutating workspace task', () => {
    expect(normalizeAlicizationCodingAgentTask({
      kind: 'codebase-edit',
      effect: 'mutate',
      allowTools: true,
      sandbox: 'workspace-write',
    })).toEqual({
      kind: 'codebase-edit',
      effect: 'mutate',
      allowTools: true,
      sandbox: 'workspace-write',
    })
  })

  it.each([
    {
      name: 'codex prompt',
      input: { agent: 'codex', prompt: 'inspect the project' },
    },
    {
      name: 'claude code prompt',
      input: { agent: 'claude-code', prompt: 'inspect the project' },
    },
    {
      name: 'cli command',
      input: { agent: 'cli', command: 'pnpm test' },
    },
    {
      name: 'codex resumed thread',
      input: { agent: 'codex', threadId: 'thread-1' },
    },
  ])('accepts a complete $name invocation', ({ input }) => {
    expect(validateAlicizationCodingAgentInvocation(input)).toMatchObject({
      ok: true,
    })
  })

  it.each([
    {
      name: 'missing codex prompt',
      input: { agent: 'codex' },
      errorCode: 'CODING_AGENT_INVALID_INPUT',
    },
    {
      name: 'missing cli command',
      input: { agent: 'cli' },
      errorCode: 'CODING_AGENT_INVALID_INPUT',
    },
    {
      name: 'cli with a prompt',
      input: { agent: 'cli', prompt: 'inspect the project' },
      errorCode: 'CODING_AGENT_INVALID_INPUT',
    },
    {
      name: 'codex with a command',
      input: { agent: 'codex', command: 'pnpm test' },
      errorCode: 'CODING_AGENT_INVALID_INPUT',
    },
    {
      name: 'claude code with cli-only arguments',
      input: { agent: 'claude-code', prompt: 'inspect the project', args: ['--verbose'] },
      errorCode: 'CODING_AGENT_INVALID_INPUT',
    },
  ])('rejects $name without claiming execution', ({ input, errorCode }) => {
    expect(validateAlicizationCodingAgentInvocation(input)).toEqual({
      ok: false,
      errorCode,
      errorMessage: expect.any(String),
    })
  })

  it('requires a turn-bound delegation contract before execution', () => {
    expect(validateAlicizationCodingAgentInvocation({
      agent: 'codex',
      prompt: 'inspect the project',
    }, {
      contextTurnId: 'turn-1',
      delegation: null,
    })).toEqual({
      ok: false,
      errorCode: 'CODING_AGENT_DELEGATION_REQUIRED',
      errorMessage: expect.any(String),
    })
  })

  it('rejects a Coding Agent channel that differs from the structured delegation', () => {
    expect(validateAlicizationCodingAgentInvocation({
      agent: 'claude-code',
      kind: 'codebase-investigation',
      prompt: 'inspect the project',
    }, {
      contextTurnId: 'turn-1',
      delegation: {
        allowed: true,
        evidenceId: 'cognition-1',
        turnId: 'turn-1',
        allowInvestigation: true,
        allowEdit: false,
        allowedAgents: ['codex'],
      } as any,
    })).toEqual({
      ok: false,
      errorCode: 'CODING_AGENT_CHANNEL_MISMATCH',
      errorMessage: expect.any(String),
    })
  })

  it('does not create execution authority for a capability question', () => {
    expect(buildAlicizationCodingAgentDelegationAuthority({
      contextTurnId: 'turn-capability',
      delegation: {
        confidence: 0.98,
        intentKind: 'capability-query',
        requestedAgent: 'codex',
        scope: 'investigation',
        source: 'structured-cognition',
        sourceTurnId: 'turn-capability',
        verdict: 'delegate-coding-agent',
      } as any,
    })).toBeNull()
  })

  it('allows an investigation only when the delegation contract matches the turn', () => {
    expect(validateAlicizationCodingAgentInvocation({
      agent: 'codex',
      kind: 'codebase-investigation',
      prompt: 'inspect the project',
    }, {
      contextTurnId: 'turn-1',
      delegation: {
        allowed: true,
        evidenceId: 'cognition-1',
        turnId: 'turn-1',
        sourceTurnId: 'turn-1',
        allowInvestigation: true,
        allowEdit: false,
        allowedAgents: ['codex'],
      },
    })).toMatchObject({
      ok: true,
      agent: 'codex',
    })
  })

  it('narrows an auto delegation to the explicitly named channel', () => {
    expect(buildAlicizationCodingAgentDelegationAuthority({
      contextTurnId: 'turn-explicit-codex',
      userText: '用 Codex 帮我检查这个项目',
      delegation: {
        confidence: 0.98,
        intentKind: 'execute',
        requestedAgent: 'auto',
        scope: 'investigation',
        source: 'structured-cognition',
        sourceTurnId: 'turn-explicit-codex',
        verdict: 'delegate-coding-agent',
      },
    })).toMatchObject({
      allowed: true,
      allowedAgents: ['codex'],
    })
  })

  it('limits auto command delegation to CLI', () => {
    expect(buildAlicizationCodingAgentDelegationAuthority({
      contextTurnId: 'turn-auto-command',
      delegation: {
        confidence: 0.98,
        intentKind: 'execute',
        requestedAgent: 'auto',
        scope: 'command',
        source: 'structured-cognition',
        sourceTurnId: 'turn-auto-command',
        verdict: 'delegate-coding-agent',
      },
    })).toMatchObject({
      allowed: true,
      allowedAgents: ['cli'],
      allowCommand: true,
      allowInvestigation: false,
      allowEdit: false,
    })
  })

  it('keeps CLI out of auto codebase delegation', () => {
    expect(buildAlicizationCodingAgentDelegationAuthority({
      contextTurnId: 'turn-auto-investigation',
      delegation: {
        confidence: 0.98,
        intentKind: 'execute',
        requestedAgent: 'auto',
        scope: 'investigation',
        source: 'structured-cognition',
        sourceTurnId: 'turn-auto-investigation',
        verdict: 'delegate-coding-agent',
      },
    })).toMatchObject({
      allowed: true,
      allowedAgents: ['codex', 'claude-code'],
      allowCommand: false,
      allowInvestigation: true,
      allowEdit: false,
    })
  })

  it('rejects a delegation snapshot from another turn', () => {
    expect(buildAlicizationCodingAgentDelegationAuthority({
      contextTurnId: 'turn-current',
      delegation: {
        confidence: 0.98,
        intentKind: 'execute',
        requestedAgent: 'codex',
        scope: 'investigation',
        source: 'structured-cognition',
        sourceTurnId: 'turn-previous',
        verdict: 'delegate-coding-agent',
      },
    })).toBeNull()
  })

  it('blocks an execution verdict when the user turn is only asking about Coding Agent capabilities', () => {
    expect(buildAlicizationCodingAgentDelegationAuthority({
      contextTurnId: 'turn-capability-misclassified',
      userText: '你可以使用 Codex 做什么？',
      delegation: {
        confidence: 0.98,
        intentKind: 'execute',
        requestedAgent: 'codex',
        scope: 'investigation',
        source: 'structured-cognition',
        sourceTurnId: 'turn-capability-misclassified',
        verdict: 'delegate-coding-agent',
      },
    })).toBeNull()
  })
})
