import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

describe('visible-reply project awareness scoring regression', () => {
  it('keeps second-pass scoring anchored on the shared project-awareness baseline before local embodiment bonuses', () => {
    const source = readFileSync(new URL('./second-pass-rewrite.ts', import.meta.url), 'utf8')

    expect(source).toContain('scoreAlicizationProjectAwarenessLine')
    expect(source).toContain('let score = scoreAlicizationProjectAwarenessLine(normalized)')
    expect(source).toContain('looksLikeStrongEmbodimentClosureCarry(normalized)')
  })

  it('keeps settlement scoring anchored on the shared project-awareness baseline before local same-her and chinese continuity bonuses', () => {
    const source = readFileSync(new URL('./settlement.ts', import.meta.url), 'utf8')

    expect(source).toContain('scoreAlicizationProjectAwarenessLine')
    expect(source).toContain('let score = scoreAlicizationProjectAwarenessLine(normalized)')
    expect(source).toContain('const thinProjectAwarenessShell = isThinProjectAwarenessLine(normalized)')
  })
})
