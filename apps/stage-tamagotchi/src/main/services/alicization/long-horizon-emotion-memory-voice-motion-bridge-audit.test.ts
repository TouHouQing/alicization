import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'long-horizon-to-conscious-frame-anti-shell-bridge',
    file: './proactive-feedback-long-horizon-conscious-frame-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can re-enter the next conscious frame and final reply planning after the long-horizon self-carry boundary',
      'long-horizon-to-conscious-frame anti-shell bridge',
      'answer-planner-final-reply-anti-shell-carry',
    ],
  },
  {
    entry: 'host-visible-answer-after-long-horizon-self-carry',
    file: './proactive-feedback-host-visible-answer-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line all the way into host-visible answer shaping after the long-horizon self-carry boundary',
      'visible-reply-final-gate-route',
      'host-visible-fast-path-answer-anti-shell-carry',
    ],
  },
  {
    entry: 'emotion-memory-voice-motion-convergence-chain',
    file: './emotion-memory-voice-motion-convergence-audit.test.ts',
    snippets: [
      'keeps one explicit same-her convergence chain from remembered emotional carry into longer noisy measured-return voice face motion lipsync and body recovery instead of stopping at adjacent route-chain proofs',
      'host-visible-audible-body-living-line-rejoin',
      'second-pass-audible-body-living-line-handoff',
    ],
  },
  {
    entry: 'desktop-execution-emotion-memory-voice-motion-convergence-bridge',
    file: './desktop-execution-emotion-memory-voice-motion-convergence-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue from afterglow restraint and emotional closure writeback into noisy cross-modal reunion and then into the tighter emotion-memory-voice-motion convergence chain instead of stopping before the more anthropomorphic recovery line forms',
      'desktop execution emotion-memory-voice-motion convergence bridge',
      'still not full long-horizon emotion-memory-voice-motion convergence',
    ],
  },
] as const

describe('long-horizon emotion-memory-voice-motion bridge audit', () => {
  it('keeps one explicit cold bridge from durable long-horizon self-carry into remembered emotional carry and noisy voice face motion lipsync body recovery instead of leaving those same-her routes as adjacent proof islands', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'long-horizon-to-conscious-frame-anti-shell-bridge' }),
      expect.objectContaining({ entry: 'host-visible-answer-after-long-horizon-self-carry' }),
      expect.objectContaining({ entry: 'emotion-memory-voice-motion-convergence-chain' }),
      expect.objectContaining({ entry: 'desktop-execution-emotion-memory-voice-motion-convergence-bridge' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the long-horizon emotion-memory-voice-motion bridge to current long-horizon, host-visible, and convergence audits instead of only project-state prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the long-horizon emotion-memory-voice-motion bridge as repo truth while keeping full long-horizon convergence explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.proof).toContain('long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-horizon-self-carry-hardening')?.responsibility).toContain('long-horizon emotion-memory-voice-motion bridge')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain('long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain('long-horizon emotion-memory-voice-motion bridge')

    expect(matrixSource).toContain('long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts')
    expect(matrixSource).toContain('long-horizon emotion-memory-voice-motion bridge')
    expect(auditSource).toContain('long-horizon emotion-memory-voice-motion bridge now also ties durable self-carry after the long-horizon boundary into remembered emotional carry and noisy voice/face/motion/lipsync/body recovery')
    expect(auditSource).toContain('still not full long-horizon emotion-memory-voice-motion convergence')
  })
})
