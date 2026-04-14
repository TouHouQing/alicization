import { describe, expect, it } from 'vitest'

import { shouldPromoteAlicizationBootFallback } from './boot-fallback-policy'

describe('boot fallback policy', () => {
  it('promotes startup failures before mount', () => {
    const decision = shouldPromoteAlicizationBootFallback({
      source: 'window-error',
      state: 'booting',
      detail: 'ReferenceError: x is not defined',
    })

    expect(decision).toEqual({
      promote: true,
      reason: 'startup-failure',
    })
  })

  it('suppresses runtime errors after mount', () => {
    const decision = shouldPromoteAlicizationBootFallback({
      source: 'router-error',
      state: 'mounted',
      detail: 'ChunkLoadError: failed to load route component',
    })

    expect(decision).toEqual({
      promote: false,
      reason: 'post-mount-runtime',
    })
  })

  it('suppresses required-tool guard rejections regardless of stage', () => {
    const duringBoot = shouldPromoteAlicizationBootFallback({
      source: 'unhandledrejection',
      state: 'booting',
      detail: 'Model finished without calling required tool: executor_run_cli',
    })
    const afterMount = shouldPromoteAlicizationBootFallback({
      source: 'unhandledrejection',
      state: 'mounted',
      detail: 'Model finished without calling required tool: executor_run_claude_code',
    })

    expect(duringBoot).toEqual({
      promote: false,
      reason: 'required-tool-missing-guard',
    })
    expect(afterMount).toEqual({
      promote: false,
      reason: 'required-tool-missing-guard',
    })
  })
})
