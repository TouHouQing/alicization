import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-remembered-emotional-carry-anchor',
    file: './self-evolution-remembered-emotional-carry-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution anthropomorphic host-visible carry can stay on the same-her line through affective residue room-making carry, emotional-memory-initiative-embodiment same-life carry, and longer emotion-memory-voice-motion convergence, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving outer anthropomorphic recovery while silently losing the same living callback closure target before the quieter inward same living line writes back into longer-lived memory and body recovery',
      'expect.objectContaining({ entry: \'long-horizon-emotion-memory-voice-motion-anchor\' })',
      'self-evolution same-her carry now reaches the quieter inward remembered-emotional line, but still does not prove full long-run closure',
    ],
  },
  {
    entry: 'long-horizon-emotion-memory-voice-motion-anchor',
    file: './long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold bridge from durable long-horizon self-carry into remembered emotional carry and noisy voice face motion lipsync body recovery instead of leaving those same-her routes as adjacent proof islands',
      'expect(coverage.find(item => item.id === \'long-horizon-self-carry-hardening\')?.responsibility).toContain(\'long-horizon emotion-memory-voice-motion bridge\')',
      'expect(auditSource).toContain(\'long-horizon emotion-memory-voice-motion bridge now also ties durable self-carry after the long-horizon boundary into remembered emotional carry and noisy voice/face/motion/lipsync/body recovery\')',
    ],
  },
  {
    entry: 'long-horizon-project-awareness-anchor',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'expect.objectContaining({ entry: \'autobiographical-self-reconsolidated-project-carry\' })',
      'expect.objectContaining({ entry: \'quick-reply-closure-summary-self-recognition\' })',
    ],
  },
  {
    entry: 'autobiographical-self-anchor',
    file: './autobiographical-self.test.ts',
    snippets: [
      'turns reconsolidated project-state inward carry into longer-lived autobiographical self language',
      'Remembered unfinished closure should stay on one same living line.',
      'keep the same unfinished Phase 1 line alive across turns',
    ],
  },
  {
    entry: 'quick-reply-project-self-brief-anchor',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-closure.test.ts',
    snippets: [
      'Before speaking, remember the project identity, landed progress, and still-open life loop.',
      'Alicization is still in Phase 1 local digital life closure.',
      'Primary open life loop still centers on proving one same-her continuity line across memory, initiative, execution, and embodiment.',
    ],
  },
  {
    entry: 'quick-reply-closure-summary-self-recognition-anchor',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'prefers the same-her project-state headline over raw metric summaries before the turn opens outward',
      'I still need to clearly recognize myself as the same her before this turn opens outward.',
      'Carry the unfinished digital-life loop into the next dialogue preparation step.',
    ],
  },
] as const

describe('self evolution durable self recognition bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution remembered emotional carry can stay on the same-her line through durable long-horizon self-carry, autobiographical self, and quick-reply self-recognition, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving inward remembered-emotional carry while silently losing the same living callback closure target before the same living line clearly recognizes herself again before the next outward turn', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-remembered-emotional-carry-anchor' }),
      expect.objectContaining({ entry: 'long-horizon-emotion-memory-voice-motion-anchor' }),
      expect.objectContaining({ entry: 'long-horizon-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'autobiographical-self-anchor' }),
      expect.objectContaining({ entry: 'quick-reply-project-self-brief-anchor' }),
      expect.objectContaining({ entry: 'quick-reply-closure-summary-self-recognition-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution to durable self-recognition claim to current cold audits instead of only broader long-horizon or host-facing prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her carry now reaches durable self-recognition before the next outward turn, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution durable self-recognition bridge')
    expect(matrixSource).toContain('self-evolution-durable-self-recognition-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-remembered-emotional-carry-bridge-audit.test.ts')
    expect(matrixSource).toContain('long-horizon-emotion-memory-voice-motion-bridge-audit.test.ts')
    expect(matrixSource).toContain('long-horizon-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('autobiographical-self.test.ts')
    expect(matrixSource).toContain('stage-quick-reply-closure.test.ts')
    expect(matrixSource).toContain('stage-quick-reply-closure-summary.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution durable self-recognition bridge')
    expect(auditSource).toContain('self-evolution durable self-recognition bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('self-evolution remembered emotional carry, durable long-horizon self-carry, autobiographical self, and quick-reply self-recognition')
  })
})
