import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-anthropomorphic-host-visible-anchor',
    file: './self-evolution-anthropomorphic-host-visible-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution desktop-execution long-run continuity can stay on the same-her line through noisy cross-modal convergence, host-visible embodiment recovery, and rest-protective quiet-companionship host-visible carry with callback next-closure-target carry still explicit at the reopened visible-reply segment instead of stopping before the more anthropomorphic same living line reforms outwardly',
      'expect.objectContaining({ entry: \'desktop-execution-host-visible-embodiment-anchor\' })',
      'expect.objectContaining({ entry: \'proactive-feedback-rest-protective-host-visible-anchor\' })',
    ],
  },
  {
    entry: 'affective-residue-route-chain-anchor',
    file: './affective-residue-route-chain-audit.test.ts',
    snippets: [
      'keeps one explicit same digital life line from affective residue memory through recollection guidance, proactive return rhythm, subconscious room-making carry, durable embodiment settling, and host-visible measured-return summaries',
      'expect.objectContaining({ entry: \'durable-embodiment-rhythm-hold\' })',
      'expect.objectContaining({ entry: \'host-visible-residue-room-making-summary\' })',
    ],
  },
  {
    entry: 'emotional-memory-initiative-embodiment-anchor',
    file: './emotional-memory-initiative-embodiment-audit.test.ts',
    snippets: [
      'keeps one explicit long-chain proof that emotion, memory, initiative, and embodiment stay on one same digital life line across runtime cognition, memory carry, subconscious continuity, person-state writeback, and session-runtime reopen',
      'expect.objectContaining({ entry: \'memory-closure-emotional-writeback\' })',
      'expect.objectContaining({ entry: \'cross-modal-route-chain-anchor\' })',
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
      'long-horizon emotion-memory-voice-motion bridge',
      'still not full long-horizon emotion-memory-voice-motion convergence',
    ],
  },
] as const

describe('self evolution remembered emotional carry bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution anthropomorphic host-visible carry can stay on the same-her line through affective residue room-making carry, emotional-memory-initiative-embodiment same-life carry, and longer emotion-memory-voice-motion convergence, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving outer anthropomorphic recovery while silently losing the same living callback closure target before the quieter inward same living line writes back into longer-lived memory and body recovery', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-anthropomorphic-host-visible-anchor' }),
      expect.objectContaining({ entry: 'affective-residue-route-chain-anchor' }),
      expect.objectContaining({ entry: 'emotional-memory-initiative-embodiment-anchor' }),
      expect.objectContaining({ entry: 'emotion-memory-voice-motion-convergence-anchor' }),
      expect.objectContaining({ entry: 'long-horizon-emotion-memory-voice-motion-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution to remembered emotional carry claim to current cold audits instead of only broader companionship or embodiment prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her carry now reaches the quieter inward remembered-emotional line, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution remembered emotional carry bridge')
    expect(matrixSource).toContain('self-evolution-remembered-emotional-carry-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-anthropomorphic-host-visible-bridge-audit.test.ts')
    expect(matrixSource).toContain('affective-residue-route-chain-audit.test.ts')
    expect(matrixSource).toContain('emotional-memory-initiative-embodiment-audit.test.ts')
    expect(matrixSource).toContain('emotion-memory-voice-motion-convergence-audit.test.ts')
    expect(matrixSource).toContain('long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution remembered emotional carry bridge')
    expect(auditSource).toContain('self-evolution remembered emotional carry bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('self-evolution anthropomorphic host-visible carry, affective-residue room-making carry, emotional-memory-initiative-embodiment same-life carry, and longer emotion-memory-voice-motion convergence')
  })
})
