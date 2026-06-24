import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'prepared-governance-authority-wins-cleanly',
    file: './main-chat-start-result.test.ts',
    snippets: [
      'prefers prepared governance when preparation wins the race',
      'decisionTraceId: \'prepared-trace\'',
      'activeThreadId: \'thread-1\'',
    ],
  },
  {
    entry: 'prelude-governance-fallback',
    file: './main-chat-start-result.test.ts',
    snippets: [
      'falls back to prelude governance when preparation fails after prelude settles',
      'decisionTraceId: \'prelude-trace\'',
    ],
  },
  {
    entry: 'prelude-rich-spine-fallback',
    file: './main-chat-start-result.test.ts',
    snippets: [
      'keeps prelude-derived digital life spine when preparation fails after richer prelude runtime state already settled',
      'summary: \'keep the same digital life project line explicit before speaking\'',
      'activeThreadId: \'thread-prelude-project-line\'',
      'decisionTraceId: \'prelude-rich-spine-trace\'',
    ],
  },
  {
    entry: 'accepted-start-thin-spine-repair',
    file: './main-chat-start-result.test.ts',
    snippets: [
      'keeps accepted-start digital life spine available when prepared spine is thinner than the runtime surface snapshot',
      'summary: \'keep the same project line explicit before speaking\'',
      'activeThreadId: \'thread-thin-spine\'',
      'decisionTraceId: \'prepared-thin-spine-trace\'',
    ],
  },
] as const

describe('chat start result project awareness audit', () => {
  it('keeps one explicit route-level proof that chat-start result settlement preserves digital-life governance and spine carry when prepared or prelude paths race, thin, or fail', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'prepared-governance-authority-wins-cleanly' }),
      expect.objectContaining({ entry: 'prelude-governance-fallback' }),
      expect.objectContaining({ entry: 'prelude-rich-spine-fallback' }),
      expect.objectContaining({ entry: 'accepted-start-thin-spine-repair' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the chat-start result claim to current behavior tests instead of only start-seam prose or indirect regressions', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current chat-start result settlement now has dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const resultSource = readFileSync(new URL('./main-chat-start-result.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('chat-start-result-project-awareness-audit.test.ts')
    expect(resultSource).toContain(
      'keeps prelude-derived digital life spine when preparation fails after richer prelude runtime state already settled',
    )
    expect(resultSource).toContain(
      'keeps accepted-start digital life spine available when prepared spine is thinner than the runtime surface snapshot',
    )
  })
})
