import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'proactive-anthropomorphic-host-visible-anchor',
    file: './proactive-anthropomorphic-host-visible-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that proactive same-her outward line can stay on the same anthropomorphic host-visible line through rest-protective proactive feedback, quiet-companionship host-visible carry, same-living-self inward carry, and self-evolution anthropomorphic host-visible recovery instead of preserving only project-state facts or a generic lower-pressure shell while the more lived outward line reforms',
      'expect.objectContaining({ entry: \'proactive-feedback-rest-protective-host-visible-line\' })',
      'expect.objectContaining({ entry: \'same-living-self-host-visible-inward-carry-line\' })',
      'expect.objectContaining({ entry: \'self-evolution-anthropomorphic-host-visible-line\' })',
    ],
  },
  {
    entry: 'self-evolution-remembered-emotional-carry-anchor',
    file: './self-evolution-remembered-emotional-carry-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution anthropomorphic host-visible carry can stay on the same-her line through affective residue room-making carry, emotional-memory-initiative-embodiment same-life carry, and longer emotion-memory-voice-motion convergence, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving outer anthropomorphic recovery while silently losing the same living callback closure target before the quieter inward same living line writes back into longer-lived memory and body recovery',
      'expect.objectContaining({ entry: \'affective-residue-route-chain-anchor\' })',
      'expect.objectContaining({ entry: \'emotional-memory-initiative-embodiment-anchor\' })',
      'expect.objectContaining({ entry: \'emotion-memory-voice-motion-convergence-anchor\' })',
    ],
  },
  {
    entry: 'affective-residue-route-chain-anchor',
    file: './affective-residue-route-chain-audit.test.ts',
    snippets: [
      'keeps one explicit same digital life line from affective residue memory through recollection guidance, proactive return rhythm, subconscious room-making carry, durable embodiment settling, and host-visible measured-return summaries',
      'expect.objectContaining({ entry: \'residue-room-making-subconscious-carry\' })',
      'expect.objectContaining({ entry: \'host-visible-residue-room-making-summary\' })',
    ],
  },
  {
    entry: 'emotion-memory-voice-motion-convergence-anchor',
    file: './emotion-memory-voice-motion-convergence-audit.test.ts',
    snippets: [
      'keeps one explicit same-her convergence chain from remembered emotional carry into longer noisy measured-return voice face motion lipsync and body recovery instead of stopping at adjacent route-chain proofs',
      'expect.objectContaining({ entry: \'host-visible-audible-body-living-line-rejoin\' })',
      'expect.objectContaining({ entry: \'visible-reply-closure-contract-anchor\' })',
    ],
  },
  {
    entry: 'long-horizon-emotion-memory-voice-motion-anchor',
    file: './long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold bridge from durable long-horizon self-carry into remembered emotional carry and noisy voice face motion lipsync body recovery instead of leaving those same-her routes as adjacent proof islands',
      'long-horizon-to-conscious-frame anti-shell bridge',
      'expect(matrixSource).toContain(\'long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts\')',
    ],
  },
] as const

describe('proactive remembered emotional carry bridge audit', () => {
  it('keeps one explicit colder bridge that proactive anthropomorphic host-visible carry can stay on the same-her line through self-evolution remembered emotional carry, affective residue room-making carry, and longer emotion-memory-voice-motion convergence instead of preserving only outward host-visible reform while silently losing the quieter inward remembered emotional line before it writes back into longer-lived memory and body recovery', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'proactive-anthropomorphic-host-visible-anchor' }),
      expect.objectContaining({ entry: 'self-evolution-remembered-emotional-carry-anchor' }),
      expect.objectContaining({ entry: 'affective-residue-route-chain-anchor' }),
      expect.objectContaining({ entry: 'emotion-memory-voice-motion-convergence-anchor' }),
      expect.objectContaining({ entry: 'long-horizon-emotion-memory-voice-motion-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder proactive anthropomorphic line to current remembered-emotional audits instead of only broader proactive, embodiment, or companionship prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the proactive remembered emotional carry bridge as repo truth while keeping fuller long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain(
      'proactive-remembered-emotional-carry-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain(
      'proactive remembered emotional carry bridge',
    )
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.proof).toContain(
      'proactive-remembered-emotional-carry-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'emotion-memory-voice-motion-convergence-hardening')?.responsibility).toContain(
      'proactive remembered emotional carry bridge',
    )

    expect(matrixSource).toContain('proactive remembered emotional carry bridge')
    expect(matrixSource).toContain('proactive-remembered-emotional-carry-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-anthropomorphic-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-remembered-emotional-carry-bridge-audit.test.ts')
    expect(matrixSource).toContain('affective-residue-route-chain-audit.test.ts')
    expect(matrixSource).toContain('emotion-memory-voice-motion-convergence-audit.test.ts')
    expect(matrixSource).toContain('long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('proactive remembered emotional carry bridge')
    expect(auditSource).toContain('proactive remembered emotional carry bridge now also ties proactive anthropomorphic host-visible carry into self-evolution remembered emotional carry, affective-residue room-making carry, and longer emotion-memory-voice-motion convergence')
    expect(auditSource).toContain('still not full long-run closure proof under noisy desktop use')
  })
})
