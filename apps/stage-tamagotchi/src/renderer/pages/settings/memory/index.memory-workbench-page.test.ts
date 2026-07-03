import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('memory workbench settings page', () => {
  it('is a dedicated settings memory page with all visible loop tabs', () => {
    const source = readFileSync(new URL('./index.vue', import.meta.url), 'utf8')

    expect(source).toContain('useAlicizationMemoryWorkbenchStore')
    expect(source).toContain("'working'")
    expect(source).toContain("'long-term'")
    expect(source).toContain("'review'")
    expect(source).toContain("'probe'")
    expect(source).toContain("'persona'")
    expect(source).toContain("'health'")
    expect(source).toContain('settings.pages.memory.workbench.title')
    expect(source).toContain('titleKey: settings.pages.memory.workbench.title')
    expect(source).toContain('settingsEntry: true')
  })

  it('keeps user-facing memory UI outside performance visualizer', () => {
    const source = readFileSync(new URL('../../devtools/performance-visualizer.vue', import.meta.url), 'utf8')

    expect(source).not.toContain('useAlicizationMemoryWorkbenchStore')
  })
})
