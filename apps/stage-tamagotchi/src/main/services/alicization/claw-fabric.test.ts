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
    expect(plan.affirmationReasonCodes).toContain('proactive-side-effects-require-explicit-consent')
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
