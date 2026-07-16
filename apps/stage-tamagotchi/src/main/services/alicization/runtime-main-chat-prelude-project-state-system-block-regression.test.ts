import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime main chat prelude project-state isolation regression', () => {
  it('does not synthesize or require provider-facing project-state prompts before session preparation', () => {
    const preludeSource = readFileSync(new URL('./runtime-main-chat-prelude.ts', import.meta.url), 'utf8')

    expect(preludeSource).not.toContain('assertAlicizationCanonicalProjectState')
    expect(preludeSource).not.toContain('carriesAlicizationCanonicalProjectState')
    expect(preludeSource).not.toContain('buildAlicizationProviderFacingProjectStateExtraSystemBlocks')
    expect(preludeSource).not.toContain('shouldIncludeProjectStateProviderContext')
  })
})
