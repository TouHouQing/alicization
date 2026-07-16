import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('execution callback provider facts', () => {
  it('keeps callback context data-only and free of reply-writing instructions', () => {
    const source = readFileSync(new URL('./execution-callback-runtime.ts', import.meta.url), 'utf8')

    expect(source).toContain('buildAlicizationProviderFactBlock(\'alicization-execution-callbacks\'')
    expect(source).not.toContain('Reference them naturally when relevant')
    expect(source).not.toContain('WorkingMemory owns short-term memory.')
    expect(source).not.toContain('LongTermMemoryRecall owns long-term recall.')
    expect(source).not.toContain('Failure surface: report provider, tool, and execution failures directly.')
    expect(source).not.toContain('Companion briefing:')
    expect(source).not.toContain('Hold policy:')
    expect(source).not.toContain('Proactive continuity gap:')
  })
})
