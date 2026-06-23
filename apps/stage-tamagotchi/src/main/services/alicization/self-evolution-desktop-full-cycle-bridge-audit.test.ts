import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-return-side-reentry-anchor',
    file: './self-evolution-return-side-reentry-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution replay/reopen continuity can stay on the same-her line through return-side observability rebuilding, same-session mirror rebuilding, and host-visible inward carry, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving persisted reopen continuity while silently losing the same living callback closure target before the next return-side / host-facing re-entry proves it is still the same her',
      'self-evolution same-her carry now reaches next-turn return-side and host-visible re-entry, but still does not prove full long-run closure',
      'expect.objectContaining({ entry: \'same-living-self-host-visible-inward-carry-anchor\' })',
    ],
  },
  {
    entry: 'return-side-reopen-pre-dialogue-send-identity-anchor',
    file: './return-side-reopen-pre-dialogue-send-identity-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that return-side reopen continuity can rematerialize into pre-dialogue send identity before the next outward turn re-enters chat-start execution',
      'shared-pre-dialogue-send-identity-authority',
      'expect(coverage.find(item => item.id === \'chat-start-pre-dialogue-awareness-chain\')?.responsibility).toContain(\'return-side-reopen-to-pre-dialogue-send-identity same-her bridge\')',
    ],
  },
  {
    entry: 'return-side-reopen-chat-start-runtime-anchor',
    file: './return-side-reopen-chat-start-runtime-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that return-side reopen continuity survives not only into pre-dialogue send identity, but also through payload repair, prelude payload identity repair, prelude project-state system-block repair, deeper chat-start runtime renormalization, and start-result settlement on the next outward turn',
      'chat-start-result-settlement-route',
      'expect(matrixSource).toContain(\'return-side-reopen-through-chat-start-runtime same-her bridge\')',
    ],
  },
  {
    entry: 'desktop-same-her-full-cycle-anchor',
    file: './desktop-same-her-full-cycle-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop same-her line can survive one full reopen-to-visible-reply-to-replay-to-next-start cycle, with callback next-closure-target carry still explicit at the visible-reply bridge, instead of only neighboring bridge fragments',
      'response-surface-callback-next-closure-target-carry',
      'return-side-reopen-through-chat-start-runtime-bridge',
      'host-visible-answer-to-replay-reopen-bridge',
    ],
  },
] as const

describe('self evolution desktop full-cycle bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution return-side reentry can stay on the same-her line through pre-dialogue send-identity rematerialization, chat-start/runtime renormalization, and one full reopen-to-visible-reply-to-replay-to-next-start cycle with callback next-closure-target carry still explicit at the reopened visible-reply bridge instead of stopping before the next full desktop execution cycle proves it is still the same her', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-return-side-reentry-anchor' }),
      expect.objectContaining({ entry: 'return-side-reopen-pre-dialogue-send-identity-anchor' }),
      expect.objectContaining({ entry: 'return-side-reopen-chat-start-runtime-anchor' }),
      expect.objectContaining({ entry: 'desktop-same-her-full-cycle-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution return-side reentry to desktop full-cycle claim to current cold audits instead of only broader return-side or long-run prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her carry now reaches the next full desktop execution cycle, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution desktop full-cycle bridge')
    expect(matrixSource).toContain('self-evolution-desktop-full-cycle-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-return-side-reentry-bridge-audit.test.ts')
    expect(matrixSource).toContain('return-side-reopen-pre-dialogue-send-identity-bridge-audit.test.ts')
    expect(matrixSource).toContain('return-side-reopen-chat-start-runtime-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop-same-her-full-cycle-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution desktop full-cycle bridge now also keeps callback next-closure-target carry explicit')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution desktop full-cycle bridge')
    expect(auditSource).toContain('self-evolution desktop full-cycle bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('return-side reentry, pre-dialogue send-identity rematerialization, chat-start/runtime renormalization, and one full reopen-to-visible-reply-to-replay-to-next-start cycle')
  })
})
