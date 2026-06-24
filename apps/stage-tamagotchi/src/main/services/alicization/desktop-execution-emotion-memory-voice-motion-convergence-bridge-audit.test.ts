import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'execution-afterglow-project-awareness',
    file: './execution-afterglow-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that execution-result afterglow learning preserves the same-her project line while callback restraint is still active',
      'expect.objectContaining({ entry: \'remembered-project-closure-quieter-callback-line\' })',
      'expect.objectContaining({ entry: \'live-drift-risk-and-afterglow-hold\' })',
    ],
  },
  {
    entry: 'execution-memory-closure-emotional-carry',
    file: './runtime-memory-closure.test.ts',
    snippets: [
      'persists richer emotional closure carry into the person-state memory ledger instead of flattening it to the canonical project brief',
      'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.',
      'Rest-protective companionship helped the same living line stay believable.',
    ],
  },
  {
    entry: 'desktop-execution-noisy-cross-modal-convergence-bridge',
    file: './desktop-execution-noisy-cross-modal-convergence-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue from longer repair-first reunion pressure into noisy-desktop voice-lane persistence, audible-body carry, later-turn multi-lane reunion, and broader cross-modal convergence instead of stopping before those outer same-her surfaces rejoin',
      'expect.objectContaining({ entry: \'noisy-desktop-voice-lane-persistence\' })',
      'expect.objectContaining({ entry: \'cross-modal-reunion-host-visible-progress\' })',
    ],
  },
  {
    entry: 'emotion-memory-voice-motion-convergence-chain',
    file: './emotion-memory-voice-motion-convergence-audit.test.ts',
    snippets: [
      'keeps one explicit same-her convergence chain from remembered emotional carry into longer noisy measured-return voice face motion lipsync and body recovery instead of stopping at adjacent route-chain proofs',
      'expect.objectContaining({ entry: \'host-visible-audible-body-living-line-rejoin\' })',
      'expect.objectContaining({ entry: \'second-pass-audible-body-living-line-handoff\' })',
      'expect.objectContaining({ entry: \'visible-reply-closure-contract-anchor\' })',
    ],
  },
] as const

describe('desktop execution emotion memory voice motion convergence bridge audit', () => {
  it('keeps one explicit compact cold proof that the desktop execution callback line can continue from afterglow restraint and emotional closure writeback into noisy cross-modal reunion and then into the tighter emotion-memory-voice-motion convergence chain instead of stopping before the more anthropomorphic recovery line forms', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'execution-afterglow-project-awareness' }),
      expect.objectContaining({ entry: 'execution-memory-closure-emotional-carry' }),
      expect.objectContaining({ entry: 'desktop-execution-noisy-cross-modal-convergence-bridge' }),
      expect.objectContaining({ entry: 'emotion-memory-voice-motion-convergence-chain' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-to-emotion-memory-voice-motion convergence claim to current afterglow, memory-closure, noisy-cross-modal, and convergence audits instead of only broader emotional or embodiment prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the desktop execution emotion-memory-voice-motion convergence bridge as repo truth while keeping full long-horizon convergence explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('desktop-execution-emotion-memory-voice-motion-convergence-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('desktop execution emotion-memory-voice-motion convergence bridge')

    expect(matrixSource).toContain('desktop-execution-emotion-memory-voice-motion-convergence-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop execution emotion-memory-voice-motion convergence bridge')
    expect(auditSource).toContain('desktop execution emotion-memory-voice-motion convergence bridge now also ties execution callback continuity from afterglow restraint and emotional closure writeback into the longer noisy measured-return voice/face/motion/lipsync/body recovery chain')
    expect(auditSource).toContain('still not full long-horizon emotion-memory-voice-motion convergence')
  })
})
