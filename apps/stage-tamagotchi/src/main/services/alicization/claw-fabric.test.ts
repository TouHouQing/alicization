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
  it('prefers browser automation over generic desktop claw', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'browser-automation',
        goal: 'Open the current browser tab and submit the visible form.',
        origin: 'user',
        effect: 'mutate',
        requiresVisualGrounding: true,
      },
      capabilities: createCapabilities(['browser', 'software', 'desktop']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('browser')
    expect(plan.preferredChannels.slice(0, 3)).toEqual(['browser', 'software', 'desktop'])
  })

  it('routes codebase work into code agents before shell or desktop fallback', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the current TypeScript module and explain the diff.',
        origin: 'user',
        effect: 'mutate',
        prefersPersistentSession: true,
      },
      capabilities: createCapabilities(['codex', 'claude-code', 'cli', 'desktop']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('codex')
    expect(plan.preferredChannels.slice(0, 4)).toEqual(['codex', 'claude-code', 'cli', 'desktop'])
  })

  it('falls back from codex to claude-code and cli when codex is unavailable', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-investigation',
        goal: 'Trace where the runtime loses the current turn context.',
        origin: 'user',
        effect: 'observe',
      },
      capabilities: createCapabilities(['claude-code', 'cli', 'desktop']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('claude-code')
    expect(plan.fallbackChannels.slice(0, 2)).toEqual(['cli', 'desktop'])
  })

  it('adapts routing using channel outcomes and session continuity hints', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the current task-thread runtime regression.',
        origin: 'user',
        effect: 'mutate',
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

  it('follows explicit channel cues from the task goal when no channel pin exists', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'browser-automation',
        goal: 'Use OpenClaw to click the login button in the current web page.',
        origin: 'user',
        effect: 'mutate',
        requiresVisualGrounding: true,
      },
      capabilities: createCapabilities(['browser', 'openclaw', 'software']),
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('openclaw')
    expect(plan.reasonTags).toContain('goal-mentioned-channel')
    expect(plan.narrative.join(' ')).toContain('Routing followed explicit channel cues')
  })

  it('uses goal-affinity continuity hints from similar historical tasks', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Fix the mind-turn continuity regression around thread routing.',
        origin: 'user',
        effect: 'mutate',
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
    expect(plan.selectedChannel).toBe('claude-code')
    expect(plan.reasonTags).toEqual(expect.arrayContaining([
      'goal-affinity:claude-code',
      'goal-affinity-channel',
    ]))
  })

  it('lets remembered procedure continuity bias routing before a fresh plan is authored', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Patch the runtime continuity seam and verify it.',
        origin: 'user',
        effect: 'mutate',
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
    expect(plan.narrative.join(' ')).toContain('Routing reused remembered procedure')
  })

  it('respects external advisor channel hints when confidence is high', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'codebase-edit',
        goal: 'Refactor the runtime event orchestrator.',
        origin: 'user',
        effect: 'mutate',
      },
      capabilities: createCapabilities(['codex', 'claude-code']),
      experience: {
        advisorChannel: 'claude-code',
        advisorConfidence: 0.91,
        advisorReason: 'llm-assessor:prefers-claude-code-for-this-task',
      },
    })

    expect(plan.state).toBe('routed')
    expect(plan.selectedChannel).toBe('claude-code')
    expect(plan.reasonTags).toEqual(expect.arrayContaining([
      'advisor:claude-code',
      'advisor-channel',
    ]))
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
      },
      capabilities: createCapabilities(['codex', 'claude-code']),
    })

    expect(plan.state).toBe('needs-affirmation')
    expect(plan.selectedChannel).toBeNull()
    expect(plan.affirmationReasonCodes).toContain('medium-risk-proactive-action-requires-affirmation')
  })

  it('keeps generic desktop fallback behind stronger justification', () => {
    const plan = buildClawFabricPlan({
      task: {
        kind: 'browser-automation',
        goal: 'Dismiss the current modal on screen.',
        origin: 'user',
        effect: 'mutate',
        justification: 'weak',
      },
      capabilities: createCapabilities(['desktop']),
    })

    expect(plan.state).toBe('needs-affirmation')
    expect(plan.selectedChannel).toBeNull()
    expect(plan.proposedChannel).toBe('desktop')
    expect(plan.affirmationReasonCodes).toContain('desktop-fallback-requires-explicit-or-grounded-justification')
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
