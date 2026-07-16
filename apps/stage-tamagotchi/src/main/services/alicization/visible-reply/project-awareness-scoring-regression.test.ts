import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('visible-reply project awareness scoring regression', () => {
  it('keeps settlement free of project-awareness content scoring', () => {
    const source = readFileSync(new URL('./settlement.ts', import.meta.url), 'utf8')

    expect(source).not.toContain('scoreAlicizationProjectAwarenessLine')
    expect(source).not.toContain('isThinProjectAwarenessLine')
    expect(source).not.toContain('same-her')
  })
})
