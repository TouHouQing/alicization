import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationPreparedVisibleReplyExecution,
} from './facade'

describe('visible-reply-facade', () => {
  it('keeps normal visible reply authority on the provider path', () => {
    const execution = resolveAlicizationPreparedVisibleReplyExecution({
      prepared: {
        mindTurnContract: {
          expectedVisibleReplyAuthority: 'llm-mind',
          replyRealizationMode: 'provider-mind-required',
        },
        replyRealization: null,
        replyExecutionPlan: null,
        runtimeSurface: {},
        governance: {},
      } as any,
    })

    expect(execution.mode).toBe('provider-stream')
    expect(execution.providerMindExecuted).toBe(true)
    expect(execution.expectedVisibleReplyAuthority).toBe('llm-mind')
  })

  it('does not expose the retired visible reply posture planner', () => {
    const facadeSource = readFileSync(new URL('./facade.ts', import.meta.url), 'utf8')

    expect(facadeSource).not.toContain('buildAlicizationVisibleReplySurfacePlan')
    expect(facadeSource).not.toContain('systemBlocks')
  })
})
