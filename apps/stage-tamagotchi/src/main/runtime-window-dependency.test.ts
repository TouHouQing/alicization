import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('alicization runtime startup dependency', () => {
  it('builds the main and utility windows only after the runtime IPC handlers are ready', () => {
    const source = readFileSync(new URL('../../src/main/index.ts', import.meta.url), 'utf8')

    expect(source).toMatch(/const chatWindow = injeca\.provide\('windows:chat', \{\s*dependsOn: \{[^}]*alicizationRuntime/)
    expect(source).toMatch(/const settingsWindow = injeca\.provide\('windows:settings', \{\s*dependsOn: \{[^}]*alicizationRuntime/)
    expect(source).toMatch(/const mainWindow = injeca\.provide\('windows:main', \{\s*dependsOn: \{[^}]*alicizationRuntime/)
  })
})
