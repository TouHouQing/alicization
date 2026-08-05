import type { AlicizationChannelCapability, AlicizationExecutionChannel } from './claw-fabric'

import { describe, expect, it } from 'vitest'

import { alicizationExecutionChannels, buildClawFabricPlan } from './claw-fabric'

function createCapabilities(
  availableChannels: AlicizationExecutionChannel[],
  overrides: Partial<Record<AlicizationExecutionChannel, Partial<AlicizationChannelCapability>>> = {},
) {
  return alicizationExecutionChannels.map(channel => ({
    channel,
    available: availableChannels.includes(channel),
    enabled: availableChannels.includes(channel),
    ready: availableChannels.includes(channel),
    ...overrides[channel],
  })) satisfies AlicizationChannelCapability[]
}

describe('buildClawFabricPlan', () => {
  it('routes the structured browser channel over other available bodies', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'browser-automation',
        goal: 'Open the current browser tab and submit the visible form.',
        origin: 'user',
        effect: 'mutate',
        requestedChannel: 'browser',
        requiresVisualGrounding: true,
      },
      capabilities: createCapabilities(['browser', 'software', 'desktop']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('browser')
    expect(plan.preferredChannels).toEqual(['browser'])
    expect(plan.fallbackChannels).toEqual([])
  })

  it('routes a structured browser request for an otherwise unknown visual task', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'unknown',
        goal: 'Figure out the next step on the current webpage and keep the flow moving.',
        origin: 'user',
        effect: 'observe',
        requestedChannel: 'browser',
        requiresVisualGrounding: true,
      },
      capabilities: createCapabilities(['cli', 'codex', 'browser', 'openclaw']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('browser')
    expect(plan.preferredChannels[0]).toBe('browser')
  })

  it('routes a structured desktop request for an otherwise unknown visual task', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'unknown',
        goal: 'Figure out what is on the current screen and decide the next GUI step.',
        origin: 'user',
        effect: 'observe',
        requestedChannel: 'desktop',
        requiresVisualGrounding: true,
      },
      capabilities: createCapabilities(['cli', 'desktop', 'openclaw']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('desktop')
    expect(plan.preferredChannels[0]).toBe('desktop')
  })

  it('routes a structured codex request without proposing fallback bodies', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the current TypeScript module and explain the diff.',
        origin: 'user',
        effect: 'mutate',
        requestedChannel: 'codex',
        prefersPersistentSession: true,
      },
      capabilities: createCapabilities(['codex', 'claude-code', 'cli', 'desktop']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('codex')
    expect(plan.preferredChannels).toEqual(['codex'])
    expect(plan.fallbackChannels).toEqual([])
  })

  it('routes the structured claude-code channel without inferring a fallback chain', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-investigation',
        goal: 'Trace where the runtime loses the current turn context.',
        origin: 'user',
        effect: 'observe',
        requestedChannel: 'claude-code',
      },
      capabilities: createCapabilities(['claude-code', 'cli', 'desktop']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('claude-code')
    expect(plan.fallbackChannels).toEqual([])
  })

  it('carries channel outcomes and session continuity for the structured channel', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the current task-thread runtime regression.',
        origin: 'user',
        effect: 'mutate',
        requestedChannel: 'claude-code',
        prefersPersistentSession: true,
      },
      capabilities: createCapabilities(['codex', 'claude-code', 'cli']),
      experience: {
        sessionResumeChannel: 'claude-code',
        activeChannels: ['claude-code'],
        channelOutcomes: {
          'codex': {
            completed: 1,
            failed: 4,
          },
          'claude-code': {
            completed: 2,
            running: 1,
          },
        },
      },
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('claude-code')
    expect(plan.reasonTags).toEqual(expect.arrayContaining([
      'session-resume:claude-code',
      'session-resume-channel',
      'history-completed',
    ]))
    expect(plan.narrative.join(' ')).toContain('Routing stayed on the currently attached executor body')
  })

  it('does not infer a channel from free-form goal text', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'browser-automation',
        goal: 'Use OpenClaw to click the login button in the current web page.',
        origin: 'user',
        effect: 'mutate',
        requestedChannel: null,
        requiresVisualGrounding: true,
      },
      capabilities: createCapabilities(['browser', 'openclaw', 'software']),
    })

    expect(plan.state).toBe('blocked')
    expect(plan.selectedChannel).toBeNull()
    expect(plan.proposedChannel).toBeNull()
    expect(plan.preferredChannels).toEqual([])
    expect(plan.fallbackChannels).toEqual([])
    expect(plan.blockedReasonCodes).toContain('task-channel-required')
    expect(plan.reasonTags).not.toContain('goal-mentioned-channel')
  })

  it('does not let goal-affinity experience override the structured channel', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Fix the mind-turn continuity regression around thread routing.',
        origin: 'user',
        effect: 'mutate',
        requestedChannel: 'codex',
      },
      capabilities: createCapabilities(['codex', 'claude-code', 'cli']),
      experience: {
        goalAffinityChannel: 'claude-code',
        goalAffinityScore: 0.92,
        goalAffinityReason: 'similar-goal-history:claude-code:3',
        channelOutcomes: {
          'codex': {
            completed: 2,
          },
          'claude-code': {
            completed: 2,
          },
        },
      },
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('codex')
    expect(plan.proposedChannel).toBe('codex')
  })

  it('carries remembered procedure continuity for the structured channel', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the runtime continuity seam and verify it.',
        origin: 'user',
        effect: 'mutate',
        requestedChannel: 'claude-code',
      },
      capabilities: createCapabilities(['codex', 'claude-code', 'cli']),
      experience: {
        rememberedProcedures: [{
          id: 'procedural:runtime-seam',
          sourceKind: 'procedural',
          facet: null,
          label: 'runtime seam repair',
          approach: 'Use Claude Code first for the patch, then verify the seam before branching.',
          pitfalls: ['Do not branch before verify.'],
          traceSummary: 'runtime seam repair | steps: Use Claude Code first for the patch. -> verify the seam before branching.',
          confidence: 0.92,
          cues: ['patch', 'verify', 'runtime seam'],
          preferredChannel: 'claude-code',
          preferredChannelReason: 'remembered-procedure-mentioned-channel:claude-code',
        }],
      },
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('claude-code')
    expect(plan.reasonTags).toContain('remembered-procedure-channel')
    expect(plan.narrative.join(' ')).toContain('The structured route carries remembered procedure')
    expect(plan.narrative.join(' ')).toContain('steps:')
  })

  it('does not let advisor experience override the structured channel', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Refactor the runtime event orchestrator.',
        origin: 'user',
        effect: 'mutate',
        requestedChannel: 'codex',
      },
      capabilities: createCapabilities(['codex', 'claude-code']),
      experience: {
        advisorChannel: 'claude-code',
        advisorConfidence: 0.91,
        advisorReason: 'llm-assessor:prefers-claude-code-for-this-task',
      },
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('codex')
    expect(plan.proposedChannel).toBe('codex')
  })

  it('does not silently fall back when the caller explicitly pinned a requested channel', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-investigation',
        goal: 'Trace where the runtime loses the current turn context.',
        origin: 'user',
        effect: 'observe',
        requestedChannel: 'codex',
      },
      capabilities: createCapabilities(['claude-code', 'cli', 'desktop']),
    })

    expect(plan.state).toBe('blocked')
    expect(plan.selectedChannel).toBeNull()
    expect(plan.proposedChannel).toBeNull()
    expect(plan.blockedReasonCodes).toContain('channel-unavailable')
    expect(plan.blockedReasonCodes).toContain('requested-channel-mismatch')
  })

  it('requires affirmation before proactive mutating software control', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'software-automation',
        goal: 'Publish the current draft in the foreground app.',
        origin: 'proactive',
        effect: 'mutate',
        requestedChannel: 'software',
      },
      capabilities: createCapabilities(['software', 'desktop']),
    })

    expect(plan.state).toBe('needs-affirmation')
    expect(plan.selectedChannel).toBeNull()
    expect(plan.proposedChannel).toBe('software')
    expect(plan.affirmationReasonCodes).toContain('medium-risk-proactive-action-requires-affirmation')
  })

  it('allows low-risk proactive rollbackable code edits to self-start on code agents', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the current runtime regression with the smallest safe change.',
        origin: 'proactive',
        effect: 'mutate',
        justification: 'grounded',
        riskBudget: 'low',
        requestedChannel: 'codex',
      },
      capabilities: createCapabilities(['codex', 'claude-code']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('codex')
    expect(plan.affirmationReasonCodes).toEqual([])
  })

  it('still requires affirmation for medium-risk proactive code edits', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Refactor the current runtime knot more aggressively.',
        origin: 'proactive',
        effect: 'mutate',
        justification: 'grounded',
        riskBudget: 'medium',
        requestedChannel: 'codex',
      },
      capabilities: createCapabilities(['codex', 'claude-code']),
    })

    expect(plan.state).toBe('needs-affirmation')
    expect(plan.selectedChannel).toBeNull()
    expect(plan.affirmationReasonCodes).toContain('medium-risk-proactive-action-requires-affirmation')
  })

  it('does not propose desktop when no structured channel is present', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'browser-automation',
        goal: 'Dismiss the current modal on screen.',
        origin: 'user',
        effect: 'mutate',
        justification: 'weak',
        requestedChannel: null,
      },
      capabilities: createCapabilities(['desktop']),
    })

    expect(plan.state).toBe('blocked')
    expect(plan.selectedChannel).toBeNull()
    expect(plan.proposedChannel).toBeNull()
    expect(plan.blockedReasonCodes).toContain('task-channel-required')
  })

  it('allows explicit desktop requests when the operator already chose that body', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'desktop-automation',
        goal: 'Move the floating window to the left monitor.',
        origin: 'user',
        effect: 'mutate',
        permissionMode: 'explicit',
        justification: 'explicit',
        requestedChannel: 'desktop',
      },
      capabilities: createCapabilities(['desktop']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('desktop')
    expect(plan.proposedChannel).toBe('desktop')
  })

  it('blocks all routing while the kill switch is suspended', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'run-command',
        goal: 'Run the local test suite.',
        origin: 'user',
        effect: 'mutate',
      },
      capabilities: createCapabilities(['cli']),
      killSwitchSuspended: true,
    })

    expect(plan.state).toBe('blocked')
    expect(plan.selectedChannel).toBeNull()
    expect(plan.blockedReasonCodes).toContain('kill-switch-suspended')
  })
})
