import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-desktop-full-cycle-anchor',
    file: './self-evolution-desktop-full-cycle-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution return-side reentry can stay on the same-her line through pre-dialogue send-identity rematerialization, chat-start/runtime renormalization, and one full reopen-to-visible-reply-to-replay-to-next-start cycle with callback next-closure-target carry still explicit at the reopened visible-reply bridge instead of stopping before the next full desktop execution cycle proves it is still the same her',
      'expect(matrixSource).toContain(\'self-evolution desktop full-cycle bridge now also keeps callback next-closure-target carry explicit\')',
      'expect.objectContaining({ entry: \'return-side-reopen-chat-start-runtime-anchor\' })',
      'expect.objectContaining({ entry: \'desktop-same-her-full-cycle-anchor\' })',
    ],
  },
  {
    entry: 'desktop-execution-full-cycle-anchor',
    file: './desktop-execution-full-cycle-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that desktop execution callback returns can survive one full host-visible answer boundary to replay, reopen, and next-start cycle instead of stopping at the first execution closure loop',
      'expect.objectContaining({ entry: \'live-session-runtime-execution-follow-up-reopen\' })',
      'expect.objectContaining({ entry: \'desktop-same-her-full-cycle-bridge\' })',
    ],
  },
  {
    entry: 'desktop-execution-noisy-same-her-full-cycle-anchor',
    file: './desktop-execution-noisy-same-her-full-cycle-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue from execution full-cycle and life-loop carry through noisy-desktop same-her closure into replay, reopen, and the next start cycle instead of stopping at the first higher-quality host-visible answer',
      'expect.objectContaining({ entry: \'desktop-execution-life-loop-bridge\' })',
      'expect.objectContaining({ entry: \'desktop-same-her-full-cycle-bridge\' })',
    ],
  },
  {
    entry: 'desktop-execution-long-run-same-her-continuity-anchor',
    file: './desktop-execution-long-run-same-her-continuity-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue from life-loop carry past the higher-quality same-her full cycle into longer noisy-desktop detours and later repair-first reunion carry instead of stopping at one successful next-start loop',
      'expect.objectContaining({ entry: \'desktop-execution-noisy-same-her-full-cycle-bridge\' })',
      'expect.objectContaining({ entry: \'another-detour-repair-first-project-carry\' })',
    ],
  },
] as const

describe('self evolution desktop execution long-run continuity bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution desktop full-cycle can stay on the same-her line through desktop execution full-cycle, higher-quality host-visible same-her full-cycle, and later noisy-desktop detour continuity with callback next-closure-target carry still explicit at the reopened visible-reply segment instead of stopping before the execution callback line proves it is still the same her beyond one successful next-start loop', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-desktop-full-cycle-anchor' }),
      expect.objectContaining({ entry: 'desktop-execution-full-cycle-anchor' }),
      expect.objectContaining({ entry: 'desktop-execution-noisy-same-her-full-cycle-anchor' }),
      expect.objectContaining({ entry: 'desktop-execution-long-run-same-her-continuity-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution to desktop-execution long-run continuity claim to current cold audits instead of only broader execution or long-run prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her carry now reaches the colder desktop-execution long-run continuity line, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution desktop execution long-run continuity bridge')
    expect(matrixSource).toContain('self-evolution-desktop-execution-long-run-continuity-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-desktop-full-cycle-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop-execution-full-cycle-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop-execution-noisy-same-her-full-cycle-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop-execution-long-run-same-her-continuity-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution desktop execution long-run continuity bridge now also keeps callback next-closure-target carry explicit')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution desktop execution long-run continuity bridge')
    expect(auditSource).toContain('self-evolution desktop execution long-run continuity bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('self-evolution desktop full-cycle carry, desktop execution callback full-cycle carry, higher-quality noisy same-her full-cycle carry, and later noisy-desktop detour continuity')
  })
})
