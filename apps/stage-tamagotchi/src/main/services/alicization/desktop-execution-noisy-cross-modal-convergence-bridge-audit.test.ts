import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'desktop-execution-long-run-same-her-continuity-bridge',
    file: './desktop-execution-long-run-same-her-continuity-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue from life-loop carry past the higher-quality same-her full cycle into longer noisy-desktop detours and later repair-first reunion carry instead of stopping at one successful next-start loop',
      'expect.objectContaining({ entry: \'desktop-execution-life-loop-bridge\' })',
      'expect.objectContaining({ entry: \'desktop-execution-noisy-same-her-full-cycle-bridge\' })',
      'expect.objectContaining({ entry: \'repeated-detour-repair-first-reunion-carry\' })',
      'expect.objectContaining({ entry: \'another-detour-repair-first-project-carry\' })',
    ],
  },
  {
    entry: 'noisy-desktop-voice-lane-persistence',
    file: './noisy-desktop-voice-lane-persistence-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer noisy desktop voice-lane continuity stays on one same-her line through background rebuilds, repeated follow-ups, audible-body carry, and an extra silent-observe detour',
      'stream-meta-audible-body-living-audio-thread',
      'project-state-longer-voice-lane-gap-explicit',
    ],
  },
  {
    entry: 'cross-modal-reunion-host-visible-progress',
    file: './cross-modal-reunion-host-visible-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that later-turn host-visible continuity can move from partial lanes toward multi-lane reunion on one same-her line',
      'full-body-line-settling-summary',
      'repair-first-multi-lane-unity',
    ],
  },
  {
    entry: 'noisy-desktop-cross-modal-convergence-chain',
    file: './noisy-desktop-cross-modal-convergence-audit.test.ts',
    snippets: [
      'keeps one compact proof chain that ties proactive-visible embodiment carry, detours, reunion, host-visible repair-first carry, renderer diagnostics, and host-visible body-line recovery onto one same-her route',
      'expect.objectContaining({ entry: \'later-turn-audible-body-host-visible-carry\' })',
      'expect.objectContaining({ entry: \'renderer-diagnostics-drift-and-audible-recovery\' })',
      'expect.objectContaining({ entry: \'cross-modal-reunion-host-visible-progress\' })',
    ],
  },
] as const

describe('desktop execution noisy cross-modal convergence bridge audit', () => {
  it('keeps one explicit compact cold proof that the desktop execution callback line can continue from longer repair-first reunion pressure into noisy-desktop voice-lane persistence, audible-body carry, later-turn multi-lane reunion, and broader cross-modal convergence instead of stopping before those outer same-her surfaces rejoin', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'desktop-execution-long-run-same-her-continuity-bridge' }),
      expect.objectContaining({ entry: 'noisy-desktop-voice-lane-persistence' }),
      expect.objectContaining({ entry: 'cross-modal-reunion-host-visible-progress' }),
      expect.objectContaining({ entry: 'noisy-desktop-cross-modal-convergence-chain' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-to-noisy-cross-modal convergence claim to current long-run execution, voice-lane, reunion, and convergence audits instead of only broader cross-modal prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the desktop execution noisy cross-modal convergence bridge as repo truth while keeping fully sustained noisy-desktop convergence explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.proof).toContain('desktop-execution-noisy-cross-modal-convergence-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-cross-modal-convergence-hardening')?.responsibility).toContain('desktop execution noisy cross-modal convergence bridge')

    expect(matrixSource).toContain('desktop-execution-noisy-cross-modal-convergence-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop execution noisy cross-modal convergence bridge')
    expect(auditSource).toContain('desktop execution noisy cross-modal convergence bridge now also ties execution callback continuity beyond longer repair-first reunion pressure into noisy-desktop voice-lane persistence')
    expect(auditSource).toContain('That colder bridge now also makes explicit that the outer cross-modal recovery line is still inheriting the earlier execution life-loop carry')
    expect(auditSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
  })
})
