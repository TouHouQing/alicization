import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  buildAlicizationCodingAgentDelegationAuthority,
  normalizeAlicizationCodingAgentTask,
  validateAlicizationCodingAgentInvocation,
} from './coding-agent-task-contract'

describe('coding agent task contract', () => {
  it('does not classify execution from natural-language capability cues', () => {
    const source = readFileSync(new URL('./coding-agent-task-contract.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('userText')
    expect(source).not.toContain('normalizeCodingAgentMentionText')
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
      delegation: {
        confidence: 0.98,
        intentKind: 'execute',
        requestedAgent: 'codex',
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

  it('keeps an execution authority bound to structured intent rather than user wording', () => {
    expect(buildAlicizationCodingAgentDelegationAuthority({
      contextTurnId: 'turn-structured-auto',
      delegation: {
        confidence: 0.98,
        intentKind: 'execute',
        requestedAgent: 'auto',
        scope: 'investigation',
        source: 'structured-cognition',
        sourceTurnId: 'turn-structured-auto',
        verdict: 'delegate-coding-agent',
      },
    })).toMatchObject({
      allowed: true,
      allowedAgents: ['codex', 'claude-code'],
      turnId: 'turn-structured-auto',
      sourceTurnId: 'turn-structured-auto',
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
})
