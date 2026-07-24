import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('visible-reply project-state facade regression', () => {
  it('keeps canonical and runtime project-state governance outside the visible-reply surface plan', () => {
    const facadeSource = readFileSync(new URL('./facade.ts', import.meta.url), 'utf8')
    const charterSource = readFileSync(new URL('../response-charter.ts', import.meta.url), 'utf8')

    expect(facadeSource).not.toContain('project-state-brief')
    expect(facadeSource).not.toContain('resolveVisibleReplyProjectState')
    expect(facadeSource).not.toContain('buildAlicizationProjectPreDialogueAwarenessLine')
    expect(facadeSource).not.toContain('projectState,')
    expect(charterSource).not.toContain('input.projectState')
    expect(charterSource).not.toContain('currentConsciousFrame?.projectState')
  })
})
