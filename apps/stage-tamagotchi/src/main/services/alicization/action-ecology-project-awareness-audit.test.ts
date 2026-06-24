import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'action-ecology-open-phase1-loop-restraint',
    file: './action-ecology.test.ts',
    snippets: [
      'keeps outward action lower-pressure when the Phase 1 digital-life loop is still open',
      'expect(ecology.mode).toBe(\'quiet-accompany\')',
      'expect(ecology.shouldSpeak).toBe(false)',
      'expect(ecology.why).toContain(\'Phase 1 still has open digital-life closure work\')',
    ],
  },
  {
    entry: 'action-ecology-thin-project-state-fallback',
    file: './action-ecology.test.ts',
    snippets: [
      'falls back to the canonical project-state brief when an explicit projectState is present but still too thin to carry the Phase 1 digital-life closure line',
      'sameHerSelfLine: \'\'',
      'expect(ecology.suggestedStyle).toBe(\'silent-observe\')',
      'expect(ecology.why).toContain(\'Phase 1 still has open digital-life closure work\')',
    ],
  },
  {
    entry: 'action-ecology-ripe-same-her-return',
    file: './action-ecology.test.ts',
    snippets: [
      'keeps a ripe same-her closure return in quiet measured companionship when the next closure target still says reopen gently',
      'expect(ecology.embodiedPresence).toBe(\'attentive\')',
      'expect(ecology.why).toContain(\'same-her closure line\')',
      'expect(ecology.why).toContain(\'cross-modal same-her proof\')',
    ],
  },
  {
    entry: 'action-ecology-living-line-over-thin-open-loop',
    file: './action-ecology.test.ts',
    snippets: [
      'still keeps outward action lower-pressure when the explicit open-loop wording is thinner but same-her unfinished closure is already carried on the living line',
      'openClosureSummary: \'Same-her continuity is still settling on the same living line before widening outward.\'',
      'emotionalClosureSummary: \'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.\'',
      'expect(baseline.why).toContain(\'Phase 1 still has open digital-life closure work\')',
    ],
  },
  {
    entry: 'action-ecology-landed-progress-carry',
    file: './action-ecology.test.ts',
    snippets: [
      'keeps outward action lower-pressure when landed progress already carries the unfinished same-her initiative and embodiment line',
      'latestLandedProgress: \'Project identity carry and same-her continuity already survive across turns, but initiative and embodiment still need stronger closure on the same living line before widening outward.\'',
      'expect(ecology.shouldSpeak).toBe(false)',
      'expect(ecology.suggestedStyle).toBe(\'silent-observe\')',
    ],
  },
  {
    entry: 'action-ecology-sparse-selector-same-her-carry',
    file: './action-ecology.test.ts',
    snippets: [
      'keeps same-her action ecology alive when selector carries lose array scaffolding',
      'threadRuntime: {',
      'expect(ecology.why).toContain(\'same-her closure line\')',
      'expect(ecology.why).toContain(\'cross-modal same-her proof\')',
    ],
  },
  {
    entry: 'action-ecology-stronger-same-living-line-direction',
    file: './action-ecology.test.ts',
    snippets: [
      'keeps the stronger same-living-line closure direction visible when richer landed and open summaries already carry the Phase 1 project seam',
      'latestLandedProgress: \'Project identity carry, Phase 1 route carry, and unresolved closure carry already survive across runtime preparation before the turn widens outward.\'',
      'nextClosureTarget: \'Keep project identity carry, Phase 1 route carry, and unresolved closure carry on one measured-return same living line so visible reply, voice behavior, facial state, motion, and resident presence do not split apart.\'',
      'expect(ecology.why).toContain(\'same living line\')',
    ],
  },
] as const

describe('action ecology project awareness audit', () => {
  it('keeps one explicit route-level proof that action ecology preserves same-her Phase 1 closure pressure, canonical fallback, and measured-return quiet companionship instead of widening outward from a thinner project shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'action-ecology-open-phase1-loop-restraint' }),
      expect.objectContaining({ entry: 'action-ecology-thin-project-state-fallback' }),
      expect.objectContaining({ entry: 'action-ecology-ripe-same-her-return' }),
      expect.objectContaining({ entry: 'action-ecology-living-line-over-thin-open-loop' }),
      expect.objectContaining({ entry: 'action-ecology-landed-progress-carry' }),
      expect.objectContaining({ entry: 'action-ecology-sparse-selector-same-her-carry' }),
      expect.objectContaining({ entry: 'action-ecology-stronger-same-living-line-direction' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the action-ecology same-her companionship claim to current behavior tests instead of only broader initiative or embodiment prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: action ecology now has dedicated same-her route proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const ecologySource = readFileSync(new URL('./action-ecology.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('action-ecology-project-awareness-audit.test.ts')
    expect(ecologySource).toContain('keeps outward action lower-pressure when the Phase 1 digital-life loop is still open')
    expect(ecologySource).toContain(
      'falls back to the canonical project-state brief when an explicit projectState is present but still too thin to carry the Phase 1 digital-life closure line',
    )
    expect(ecologySource).toContain(
      'keeps a ripe same-her closure return in quiet measured companionship when the next closure target still says reopen gently',
    )
    expect(ecologySource).toContain(
      'keeps the stronger same-living-line closure direction visible when richer landed and open summaries already carry the Phase 1 project seam',
    )
  })
})
