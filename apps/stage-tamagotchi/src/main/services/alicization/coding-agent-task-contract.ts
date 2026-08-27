import type {
  AlicizationCodingAgentDelegationIntentKind,
  AlicizationCodingAgentDelegationRequestedAgent,
} from '../../../shared/eventa'

export type AlicizationCodingAgentTaskEffect = 'observe' | 'mutate' | 'high-impact'
export type AlicizationCodingAgentTaskKind = 'codebase-edit' | 'codebase-investigation'
export type AlicizationCodingAgentTaskSandbox = 'read-only' | 'workspace-write'

export interface AlicizationCodingAgentTaskInput {
  allowTools?: unknown
  effect?: unknown
  kind?: unknown
  sandbox?: unknown
}

export interface AlicizationNormalizedCodingAgentTask {
  allowTools: boolean
  effect: AlicizationCodingAgentTaskEffect
  kind: AlicizationCodingAgentTaskKind
  sandbox: AlicizationCodingAgentTaskSandbox
}

export type AlicizationCodingAgentName = 'codex' | 'claude-code' | 'cli'

export type AlicizationExplicitCodingAgentConstraint
  = | {
    kind: 'single'
    agent: AlicizationCodingAgentName
  }
  | {
    kind: 'none'
  }

export interface AlicizationCodingAgentInvocation {
  agent?: unknown
  args?: unknown
  command?: unknown
  kind?: unknown
  prompt?: unknown
  threadId?: unknown
}

export type AlicizationCodingAgentInvocationValidation
  = | {
    ok: true
    agent: AlicizationCodingAgentName
    prompt?: string
    command?: string
    threadId?: string
  }
  | {
    ok: false
    errorCode: 'CODING_AGENT_CHANNEL_MISMATCH'
      | 'CODING_AGENT_INVALID_INPUT'
      | 'CODING_AGENT_DELEGATION_REQUIRED'
    errorMessage: string
  }

export interface AlicizationCodingAgentDelegationAuthority {
  allowed: boolean
  allowedAgents: AlicizationCodingAgentName[]
  evidenceId: string
  turnId: string
  sourceTurnId: string
  allowInvestigation: boolean
  allowEdit: boolean
  allowCommand?: boolean
}

function normalizeCodingAgentMentionText(raw: unknown) {
  return typeof raw === 'string'
    ? raw
        .trim()
        .toLowerCase()
        .replace(/[‐‑‒–—−]/gu, '-')
        .replace(/\s+/g, ' ')
    : ''
}

function hasNegativeCodingAgentMention(text: string, aliases: string[]) {
  return aliases.some(alias => new RegExp(
    `(?:不要|别|不必|无需|without|instead of|not)\\s*(?:使用|用|调用|run|use)?\\s*${alias}`,
    'iu',
  ).test(text))
}

/**
 * Extract only an explicit channel constraint from the current user turn.
 *
 * This is deliberately narrower than a general intent classifier: it never
 * decides whether a task should execute. It only prevents a concrete named
 * Coding Agent from being silently replaced by another channel after the
 * model has already decided to execute.
 */
export function resolveAlicizationExplicitCodingAgentConstraint(
  userText: unknown,
): AlicizationExplicitCodingAgentConstraint {
  const text = normalizeCodingAgentMentionText(userText)
  if (!text)
    return { kind: 'none' }

  const candidates: Array<{
    agent: AlicizationCodingAgentName
    aliases: string[]
  }> = [
    { agent: 'codex', aliases: ['codex'] },
    { agent: 'claude-code', aliases: ['claude\\s+code', 'claude-code', 'claude'] },
    { agent: 'cli', aliases: ['cli', '命令行'] },
  ]
  const matches = candidates.filter(candidate =>
    candidate.aliases.some(alias => new RegExp(`(?:\\b|用|使用|调用|通过|让)${alias}(?:\\b|\\s|做|帮|来)`, 'iu').test(text))
    && !hasNegativeCodingAgentMention(text, candidate.aliases),
  )

  if (matches.length !== 1)
    return { kind: 'none' }

  return {
    kind: 'single',
    agent: matches[0]!.agent,
  }
}

export interface AlicizationCodingAgentDelegationSnapshotLike {
  confidence: number
  intentKind: AlicizationCodingAgentDelegationIntentKind
  requestedAgent: AlicizationCodingAgentDelegationRequestedAgent
  scope: 'none' | 'investigation' | 'edit' | 'command'
  sourceTurnId: string
  source: 'heuristic' | 'structured-cognition' | 'fallback'
  verdict: 'respond-directly' | 'clarify' | 'delegate-coding-agent'
}

export function buildAlicizationCodingAgentDelegationAuthority(input: {
  contextTurnId: string
  decisionTraceId?: string | null
  delegation?: AlicizationCodingAgentDelegationSnapshotLike | null
  userText?: string | null
}): AlicizationCodingAgentDelegationAuthority | null {
  const delegation = input.delegation
  if (
    !delegation
    || delegation.intentKind !== 'execute'
    || delegation.verdict !== 'delegate-coding-agent'
    || delegation.source !== 'structured-cognition'
    || delegation.confidence < 0.6
    || delegation.scope === 'none'
    || !delegation.requestedAgent
    || delegation.sourceTurnId !== input.contextTurnId
  ) {
    return null
  }

  const explicitConstraint = resolveAlicizationExplicitCodingAgentConstraint(input.userText)
  const allowedAgents: AlicizationCodingAgentName[] = explicitConstraint.kind === 'single'
    ? [explicitConstraint.agent]
    : delegation.requestedAgent === 'auto'
      ? delegation.scope === 'command'
        ? ['cli']
        : ['codex', 'claude-code']
      : [delegation.requestedAgent]

  return {
    allowed: true,
    allowedAgents,
    evidenceId: [
      input.decisionTraceId?.trim() || 'dialogue-cognition',
      input.contextTurnId,
      delegation.scope,
    ].join(':'),
    turnId: input.contextTurnId,
    sourceTurnId: delegation.sourceTurnId,
    allowInvestigation: delegation.scope === 'investigation' || delegation.scope === 'edit',
    allowEdit: delegation.scope === 'edit',
    allowCommand: delegation.scope === 'command',
  }
}

function normalizeInvocationText(raw: unknown) {
  return typeof raw === 'string' ? raw.trim() : ''
}

function hasOwn(input: AlicizationCodingAgentInvocation, key: keyof AlicizationCodingAgentInvocation) {
  return Object.prototype.hasOwnProperty.call(input, key)
}

export function validateAlicizationCodingAgentInvocation(
  input: AlicizationCodingAgentInvocation,
  authority?: {
    contextTurnId: string
    delegation: AlicizationCodingAgentDelegationAuthority | null
  },
): AlicizationCodingAgentInvocationValidation {
  const agent = input.agent === 'codex' || input.agent === 'claude-code' || input.agent === 'cli'
    ? input.agent
    : null
  if (!agent) {
    return {
      ok: false,
      errorCode: 'CODING_AGENT_INVALID_INPUT',
      errorMessage: 'Coding Agent invocation requires agent=codex, agent=claude-code, or agent=cli.',
    }
  }

  if (authority) {
    const delegation = authority.delegation
    if (
      !delegation?.allowed
      || !delegation.evidenceId.trim()
      || delegation.turnId !== authority.contextTurnId
    ) {
      return {
        ok: false,
        errorCode: 'CODING_AGENT_DELEGATION_REQUIRED',
        errorMessage: 'Coding Agent execution requires a turn-bound user delegation contract.',
      }
    }
    if (!delegation.allowedAgents.includes(agent)) {
      return {
        ok: false,
        errorCode: 'CODING_AGENT_CHANNEL_MISMATCH',
        errorMessage: `The current turn delegates to ${delegation.allowedAgents.join(', ')}, not ${agent}.`,
      }
    }
  }

  const prompt = normalizeInvocationText(input.prompt)
  const command = normalizeInvocationText(input.command)
  const threadId = normalizeInvocationText(input.threadId)
  const hasArgs = hasOwn(input, 'args')
    && (!Array.isArray(input.args) || input.args.length > 0)
  const hasKind = hasOwn(input, 'kind') && input.kind !== undefined

  if (agent === 'cli') {
    if (!command && !threadId) {
      return {
        ok: false,
        errorCode: 'CODING_AGENT_INVALID_INPUT',
        errorMessage: 'CLI Coding Agent invocation requires a non-empty command or threadId.',
      }
    }
    if (prompt || hasKind) {
      return {
        ok: false,
        errorCode: 'CODING_AGENT_INVALID_INPUT',
        errorMessage: 'CLI Coding Agent invocation cannot include prompt or kind.',
      }
    }
    if (authority && authority.delegation?.allowCommand !== true) {
      return {
        ok: false,
        errorCode: 'CODING_AGENT_DELEGATION_REQUIRED',
        errorMessage: 'The current turn does not authorize command execution.',
      }
    }
    return {
      ok: true,
      agent,
      ...(command ? { command } : {}),
      ...(threadId ? { threadId } : {}),
    }
  }

  if (!prompt && !threadId) {
    return {
      ok: false,
      errorCode: 'CODING_AGENT_INVALID_INPUT',
      errorMessage: `${agent} Coding Agent invocation requires a non-empty prompt or threadId.`,
    }
  }
  if (command || hasArgs) {
    return {
      ok: false,
      errorCode: 'CODING_AGENT_INVALID_INPUT',
      errorMessage: `${agent} Coding Agent invocation cannot include command or args.`,
    }
  }
  const kind = input.kind === 'codebase-edit'
    ? 'codebase-edit'
    : 'codebase-investigation'
  if (authority) {
    const allowed = kind === 'codebase-edit'
      ? authority.delegation?.allowEdit === true
      : authority.delegation?.allowInvestigation === true
    if (!allowed) {
      return {
        ok: false,
        errorCode: 'CODING_AGENT_DELEGATION_REQUIRED',
        errorMessage: `The current turn does not authorize ${kind}.`,
      }
    }
  }

  return {
    ok: true,
    agent,
    ...(prompt ? { prompt } : {}),
    ...(threadId ? { threadId } : {}),
  }
}

export function normalizeAlicizationCodingAgentTask(
  input: AlicizationCodingAgentTaskInput,
): AlicizationNormalizedCodingAgentTask {
  const kind: AlicizationCodingAgentTaskKind = input.kind === 'codebase-edit'
    ? 'codebase-edit'
    : 'codebase-investigation'

  if (kind === 'codebase-investigation') {
    return {
      kind,
      effect: 'observe',
      allowTools: false,
      sandbox: 'read-only',
    }
  }

  return {
    kind,
    effect: input.effect === 'high-impact' ? 'high-impact' : 'mutate',
    allowTools: input.allowTools !== false,
    sandbox: input.sandbox === 'read-only' ? 'read-only' : 'workspace-write',
  }
}
