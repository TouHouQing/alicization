import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'desktop-execution-life-loop-bridge',
    file: './desktop-execution-life-loop-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that desktop execution callback returns can continue from the next start cycle into dream carry, long-horizon self-carry, and later hover-first initiative instead of stopping at execution closure alone',
      'expect.objectContaining({ entry: \'execution-callback-next-dream-carry\' })',
      'expect.objectContaining({ entry: \'execution-callback-afterglow-later-hover-first-initiative\' })',
    ],
  },
  {
    entry: 'desktop-execution-noisy-same-her-full-cycle-bridge',
    file: './desktop-execution-noisy-same-her-full-cycle-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue from execution full-cycle and life-loop carry through noisy-desktop same-her closure into replay, reopen, and the next start cycle instead of stopping at the first higher-quality host-visible answer',
      'expect.objectContaining({ entry: \'desktop-execution-full-cycle-bridge\' })',
      'expect.objectContaining({ entry: \'desktop-execution-life-loop-bridge\' })',
      'expect.objectContaining({ entry: \'host-visible-answer-to-replay-reopen-same-her-bridge\' })',
      'expect.objectContaining({ entry: \'desktop-same-her-full-cycle-bridge\' })',
    ],
  },
  {
    entry: 'noisy-desktop-autonomous-dialogue-persistence',
    file: './noisy-desktop-autonomous-dialogue-persistence-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof fragment that noisy-desktop autonomous dialogue continuity stays on one same-her line from hover-first restraint through visible held beat, subconscious carry, and next-session feedback carry instead of reopening as separate proactive and callback shells',
      'expect.objectContaining({ entry: \'subconscious-held-autonomy-after-another-detour\' })',
      'expect.objectContaining({ entry: \'next-session-feedback-dream-carry\' })',
    ],
  },
  {
    entry: 'repeated-detour-repair-first-reunion-carry',
    file: './repeated-detour-reunion-persistence-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that same-her continuity can survive repeated detours before later-turn reunion summaries form',
      'audible-body-living-line-after-detours',
      'next-closure-target-stays-on-the-same-living-audio-thread',
    ],
  },
  {
    entry: 'another-detour-repair-first-project-carry',
    file: './another-detour-same-life-audit.test.ts',
    snippets: [
      'keeps one explicit long-run proof fragment that the same digital life line can still survive another desktop detour across session-runtime drift-risk carry, subconscious carry, resident presence, remembered drift-risk, and project-state self carry',
      'resident-presence-repair-first-project-audit-after-another-detour',
      'same callback repair seam still active after another detour',
    ],
  },
] as const

describe('desktop execution long-run same-her continuity bridge audit', () => {
  it('keeps one explicit compact cold proof that the desktop execution callback line can continue from life-loop carry past the higher-quality same-her full cycle into longer noisy-desktop detours and later repair-first reunion carry instead of stopping at one successful next-start loop', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'desktop-execution-life-loop-bridge' }),
      expect.objectContaining({ entry: 'desktop-execution-noisy-same-her-full-cycle-bridge' }),
      expect.objectContaining({ entry: 'noisy-desktop-autonomous-dialogue-persistence' }),
      expect.objectContaining({ entry: 'repeated-detour-repair-first-reunion-carry' }),
      expect.objectContaining({ entry: 'another-detour-repair-first-project-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-to-long-run same-her continuity claim to current life-loop, full-cycle, autonomous detour, repeated-detour reunion, and another-detour audits instead of only broader long-run prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the desktop execution long-run same-her continuity bridge as repo truth while keeping fully sustained noisy-desktop closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('desktop-execution-long-run-same-her-continuity-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('desktop execution long-run same-her continuity bridge')

    expect(matrixSource).toContain('desktop-execution-long-run-same-her-continuity-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop execution long-run same-her continuity bridge')
    expect(auditSource).toContain('desktop execution long-run same-her continuity bridge now also ties execution callback continuity beyond the higher-quality same-her full cycle into later noisy desktop detours')
    expect(auditSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
  })
})
