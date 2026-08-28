import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('control button tooltip', () => {
  it('uses the slotted control as the tooltip trigger without nesting another button', () => {
    const source = readFileSync(new URL('./control-button-tooltip.vue', import.meta.url), 'utf8')

    expect(source).toMatch(/<TooltipTrigger\s+as-child\s*>/)
  })
})
