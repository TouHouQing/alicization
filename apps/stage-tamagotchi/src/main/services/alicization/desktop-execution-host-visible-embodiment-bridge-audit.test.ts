import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'desktop-execution-emotion-memory-voice-motion-convergence-bridge',
    file: './desktop-execution-emotion-memory-voice-motion-convergence-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue from afterglow restraint and emotional closure writeback into noisy cross-modal reunion and then into the tighter emotion-memory-voice-motion convergence chain instead of stopping before the more anthropomorphic recovery line forms',
      'expect.objectContaining({ entry: \'desktop-execution-noisy-cross-modal-convergence-bridge\' })',
      'expect.objectContaining({ entry: \'emotion-memory-voice-motion-convergence-chain\' })',
    ],
  },
  {
    entry: 'embodiment-project-awareness-route',
    file: './embodiment-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that embodiment-facing body, voice, face, and motion surfaces preserve the same-her Phase 1 project line',
      'expect.objectContaining({ entry: \'stream-meta-current-conscious-frame-repair-first-bridge\' })',
      'expect.objectContaining({ entry: \'stream-meta-multi-lane-reunion-authority\' })',
    ],
  },
  {
    entry: 'later-turn-embodiment-host-visible-progress',
    file: './later-turn-embodiment-host-visible-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that host-visible same-her continuity survives into later-turn resident presence and embodiment lane summaries',
      'expect.objectContaining({ entry: \'audible-body-carry-stays-host-visible-over-longer-runs\' })',
      'expect.objectContaining({ entry: \'coordinator-repair-first-cross-modal-composition\' })',
    ],
  },
  {
    entry: 'cross-modal-reunion-host-visible-progress',
    file: './cross-modal-reunion-host-visible-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that later-turn host-visible continuity can move from partial lanes toward multi-lane reunion on one same-her line',
      'expect.objectContaining({ entry: \'full-body-line-settling-summary\' })',
      'expect.objectContaining({ entry: \'repair-first-multi-lane-unity\' })',
    ],
  },
] as const

describe('desktop execution host visible embodiment bridge audit', () => {
  it('keeps one explicit compact cold proof that the desktop execution callback line can continue from the colder emotion-memory-voice-motion convergence line into embodiment-facing host-visible resident presence, lane summaries, audible-body carry, and later reunion surfaces instead of stopping before the living body line reforms outwardly', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'desktop-execution-emotion-memory-voice-motion-convergence-bridge' }),
      expect.objectContaining({ entry: 'embodiment-project-awareness-route' }),
      expect.objectContaining({ entry: 'later-turn-embodiment-host-visible-progress' }),
      expect.objectContaining({ entry: 'cross-modal-reunion-host-visible-progress' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-to-host-visible embodiment claim to current convergence, embodiment, and host-visible reunion audits instead of only broader cross-modal prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the desktop execution host-visible embodiment bridge as repo truth while keeping fully sustained noisy-desktop embodiment closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('desktop-execution-host-visible-embodiment-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('desktop execution host-visible embodiment bridge')

    expect(matrixSource).toContain('desktop-execution-host-visible-embodiment-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop execution host-visible embodiment bridge')
    expect(auditSource).toContain('desktop execution host-visible embodiment bridge now also ties execution callback continuity from the colder emotion-memory-voice-motion convergence line into resident presence, lane-shrink diagnostics, audible-body carry, and later multi-lane reunion surfaces')
    expect(auditSource).toContain('still not full long-run closure proof under noisy desktop use')
  })
})
