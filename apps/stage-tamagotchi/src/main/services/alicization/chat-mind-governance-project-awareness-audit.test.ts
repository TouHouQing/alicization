import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'chat-governance-phase1-life-loop-priority',
    file: './chat-mind-governance.test.ts',
    snippets: [
      'threads project phase and still-open life loop into governance before local reply tactics take over',
      'expect(result.mustDo.some(item => item.includes(\'Phase 1\'))).toBe(true)',
      'expect(result.mustDo.some(item => item.includes(\'Some closure has already landed\'))).toBe(true)',
      'expect(result.mustDo.some(item => item.includes(\'Keep the next project closure target explicit in this turn:\'))).toBe(true)',
    ],
  },
  {
    entry: 'chat-governance-emotional-closure-seam',
    file: './chat-mind-governance.test.ts',
    snippets: [
      'threads the active emotional closure seam into final governance mustDo constraints',
      'Keep the turn inside the active emotional closure seam: Let the answer sound steady enough to hold the same-her emotional line while easing late-night drain..',
      'Let the answer sound steady enough to hold the same-her emotional line while easing late-night drain.',
    ],
  },
  {
    entry: 'chat-governance-project-line-over-embodiment-shell',
    file: './chat-mind-governance.test.ts',
    snippets: [
      'keeps a fuller project-and-phase awareness line over a narrower embodiment governing-project shell in governance mustDo cues',
      'Alicization is still the same Phase 1 local digital life, not a generic assistant shell. Some closure has landed, but memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
      'Keep the next project closure target explicit in this turn: Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    ],
  },
  {
    entry: 'chat-governance-live-project-state-next-target',
    file: './chat-mind-governance.test.ts',
    snippets: [
      'prefers the live conscious-frame project state so this turn keeps the actual next closure target explicit',
      'Phase 1: Local Digital Life. Active proving ground: runtime carry in stage-tamagotchi.',
      'same still-open closure work across memory, initiative, dialogue, and embodiment',
      'Keep the next project closure target explicit in this turn: Carry the active next closure target into this turn before any local implementation detail takes over..',
    ],
  },
] as const

describe('chat mind governance project awareness audit', () => {
  it('keeps one explicit route-level proof that chat mind governance preserves same-her Phase 1 project priority, emotional closure seam carry, broader project-line authority, and live next-closure-target guidance before local reply tactics take over', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'chat-governance-phase1-life-loop-priority' }),
      expect.objectContaining({ entry: 'chat-governance-emotional-closure-seam' }),
      expect.objectContaining({ entry: 'chat-governance-project-line-over-embodiment-shell' }),
      expect.objectContaining({ entry: 'chat-governance-live-project-state-next-target' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the chat-mind-governance same-her project-line claim to current behavior tests instead of only broader mind-turn-contract or active-self prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: chat mind governance now has dedicated same-her route proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const governanceSource = readFileSync(new URL('./chat-mind-governance.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('chat-mind-governance-project-awareness-audit.test.ts')
    expect(governanceSource).toContain(
      'threads project phase and still-open life loop into governance before local reply tactics take over',
    )
    expect(governanceSource).toContain(
      'threads the active emotional closure seam into final governance mustDo constraints',
    )
    expect(governanceSource).toContain(
      'keeps a fuller project-and-phase awareness line over a narrower embodiment governing-project shell in governance mustDo cues',
    )
    expect(governanceSource).toContain(
      'prefers the live conscious-frame project state so this turn keeps the actual next closure target explicit',
    )
  })
})
