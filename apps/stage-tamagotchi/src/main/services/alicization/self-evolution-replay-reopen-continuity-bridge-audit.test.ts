import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-evolution-downstream-visible-reply-anchor',
    file: './self-evolution-downstream-visible-reply-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution reply-planning governance carry can stay on the same-her line through answer-compiler supporting reality, reply-deliberator outward planning, final visible-reply gating, and visible-reply realization, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving the downstream host-visible answer chain while silently losing the same living callback closure target before the outward answer reforms',
      'self-evolution same-her carry now reaches the downstream host-visible answer chain, but still does not prove full long-run closure',
      'reply-planning governance, supporting reality, outward reply planning, final visible-reply gating, and visible-reply realization',
    ],
  },
  {
    entry: 'runtime-turn-persistence-anchor',
    file: './runtime-turn-persistence-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that guarded turn persistence preserves same-her project awareness across runtime authority callback delivery and deferred proactive carry',
      'guarded persistence now has dedicated same-her continuity proof across persisted normalization callback delivery and deferred proactive carry, while future new persistence families still remain open',
      'expect.objectContaining({ entry: \'execution-callback-persistence-awareness-backfill\' })',
    ],
  },
  {
    entry: 'replay-emission-project-awareness-anchor',
    file: './replay-emission-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that persisted and replayed turns preserve same-her project awareness before re-emission',
      'replay emission now has route-level project-awareness proof, but this still does not prove every future replay family will inherit the same chain automatically',
      'expect.objectContaining({ entry: \'runtime-replay-emission-richer-awareness-precedence\' })',
    ],
  },
  {
    entry: 'reopen-persistence-project-awareness-anchor',
    file: '../../../../../../packages/stage-ui/src/stores/reopen-persistence-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that restored-session fallback and browser-local replay preserve same-her project awareness before the next outward turn',
      'restored-session and browser-local replay now preserve project awareness on real reopen paths, but this still does not prove every future reopen surface automatically inherits the chain',
      'expect.objectContaining({ entry: \'restored-session-project-awareness-backfill\' })',
    ],
  },
  {
    entry: 'return-side-reopen-visible-reply-anchor',
    file: './return-side-reopen-visible-reply-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that return-side reopen continuity, once re-entered through chat-start/runtime, can stay on the same-her project line through response-surface obligations, callback next-closure-target carry, final visible-reply gating, realization, host-visible normalization, and compact outward answer shaping',
      'response-surface-callback-next-closure-target-carry',
      'registers the return-side-reopen-through-visible-reply same-her bridge as repo truth while keeping future entrypoint drift explicitly open',
      'expect.objectContaining({ entry: \'host-visible-dialogue-normalization-route\' })',
    ],
  },
] as const

describe('self evolution replay reopen continuity bridge audit', () => {
  it('keeps one explicit colder bridge that self-evolution downstream visible-reply carry can stay on the same-her line through guarded turn persistence, replay emission, restored-session/browser-local reopen persistence, and return-side reopen through visible reply, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving one outward answer plus persisted reopen continuity while silently losing the same living callback closure target before replay and reopen continuity reforms', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-evolution-downstream-visible-reply-anchor' }),
      expect.objectContaining({ entry: 'runtime-turn-persistence-anchor' }),
      expect.objectContaining({ entry: 'replay-emission-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'reopen-persistence-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'return-side-reopen-visible-reply-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder self-evolution to replay-and-reopen continuity claim to current cold audits instead of only broader downstream-visible-reply or observability prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: self-evolution same-her carry now reaches persisted replay and reopen continuity, but still does not prove full long-run closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('self-evolution replay reopen continuity bridge')
    expect(matrixSource).toContain('self-evolution-downstream-visible-reply-bridge-audit.test.ts')
    expect(matrixSource).toContain('runtime-turn-persistence-audit.test.ts')
    expect(matrixSource).toContain('replay-emission-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('reopen-persistence-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('return-side-reopen-visible-reply-bridge-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('self-evolution replay reopen continuity bridge')
    expect(auditSource).toContain('self-evolution replay reopen continuity bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('downstream visible reply, guarded persistence, replay emission, reopen persistence, and return-side reopen through visible reply')
  })
})
