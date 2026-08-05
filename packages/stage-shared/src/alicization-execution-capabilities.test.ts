import type {
  AlicizationExecutionCapabilityChannel,
  AlicizationExecutionDispatchChannel,
  AlicizationExecutionRoutingChannel,
  AlicizationExecutorToolName,
  AlicizationKnownWebsiteResolution,
} from './alicization-execution-capabilities'

import { describe, expect, it } from 'vitest'

import * as capabilities from './alicization-execution-capabilities'
import * as legacyIntent from './alicization-execution-intent'

describe('alicization execution capabilities', () => {
  it('exposes only structured capability values at runtime', () => {
    expect(Object.keys(capabilities)).toEqual([
      'alicizationExecutionCapabilityChannels',
      'alicizationExecutorToolNames',
    ])
  })

  it('defines the capability channels independently from natural-language intent', () => {
    expect(capabilities.alicizationExecutionCapabilityChannels).toEqual([
      'cli',
      'codex',
      'claude-code',
      'openclaw',
      'openfang',
      'browser',
      'software',
      'desktop',
    ])
  })

  it('defines the executor tool names as a closed structured contract', () => {
    expect(capabilities.alicizationExecutorToolNames).toEqual([
      'executor_run_cli',
      'executor_run_codex',
      'executor_run_claude_code',
      'executor_run_local_visual',
      'executor_run_openclaw',
      'browser_open_url',
      'browser_search_web',
      'browser_read_page',
      'browser_click_element',
      'browser_type_text',
      'browser_navigate',
      'browser_scroll',
      'browser_wait',
      'desktop_inspect_scene',
      'desktop_list_interactables',
      'desktop_click_element',
      'desktop_type_text',
      'desktop_press_keys',
      'desktop_open_application',
      'desktop_wait',
    ])
  })

  it('keeps the temporary website resolver module on the shared execution contract', () => {
    expect(legacyIntent.alicizationExecutionCapabilityChannels)
      .toBe(capabilities.alicizationExecutionCapabilityChannels)
    expect(legacyIntent.alicizationExecutorToolNames)
      .toBe(capabilities.alicizationExecutorToolNames)
  })

  it('keeps dispatch and routing channels structurally constrained', () => {
    const capabilityChannel: AlicizationExecutionCapabilityChannel = 'openfang'
    const dispatchChannel: AlicizationExecutionDispatchChannel = 'cli'
    const routingChannels: AlicizationExecutionRoutingChannel[] = [
      dispatchChannel,
      'browser',
      'software',
      'desktop',
    ]
    const toolName: AlicizationExecutorToolName = 'executor_run_cli'
    const knownWebsite: AlicizationKnownWebsiteResolution = {
      label: 'GitHub',
      matchedAlias: 'github',
      site: 'github',
      url: 'https://github.com',
    }

    expect(capabilityChannel).toBe('openfang')
    expect(routingChannels).toEqual(['cli', 'browser', 'software', 'desktop'])
    expect(toolName).toBe('executor_run_cli')
    expect(knownWebsite.site).toBe('github')
  })
})
