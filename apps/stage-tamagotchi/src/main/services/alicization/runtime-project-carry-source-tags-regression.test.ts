import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('runtime project carry cleanup regression', () => {
  it('does not rebuild person-state authority or proactive metadata from fixed continuity prose', () => {
    const source = readFileSync(new URL('./runtime.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('function inferRuntimeProjectCarrySourceTags')
    expect(source).not.toContain('Continue the active thread with lower pressure and preserve context.')
    expect(source).not.toContain('Continue proactively with lower pressure and preserve context.')
    expect(source).not.toContain('Return to the callback with lower pressure and preserve context.')
    expect(source).not.toContain('Quiet continuation on the active thread.')
    expect(source).not.toMatch(/openingGuidance == null[\s\S]*lower-pressure\|measured-return\|stay near/)
    expect(source).not.toContain(['same', 'her', 'inward', 'carry'].join('-'))
  })
})
