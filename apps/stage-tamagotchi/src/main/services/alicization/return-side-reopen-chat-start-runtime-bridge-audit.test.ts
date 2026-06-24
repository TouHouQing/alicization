import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'return-side-reopen-pre-dialogue-send-identity-bridge',
    file: './return-side-reopen-pre-dialogue-send-identity-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that return-side reopen continuity can rematerialize into pre-dialogue send identity before the next outward turn re-enters chat-start execution',
      'renderer-fallback-before-send-awareness-route',
      'shared-pre-dialogue-send-identity-authority',
    ],
  },
  {
    entry: 'chat-start-payload-repair',
    file: './main-chat-start-awareness.test.ts',
    snippets: [
      'preserves richer transported project-state and emotional-kernel authority while repairing thin top-level send identity shells',
      'upgrades a generic carried next-closure shell to the richer transported same-her closure target before chat start continues',
      'always backfills the canonical project brief before a chat start turn can continue',
      'rebuilds a visible renderer-rejoin-without-body same-her headline from structured closure reasons when chat-start only carries a thin project reminder shell',
      'lane=face+motion+lipsync+voice-only | face+motion+lipsync+voice recovery@segment-live2d-visible-rejoin-no-body-1 | pending-rejoin=body',
      'visible same-her line has already rejoined without body carry while body still needs to rejoin before full cross-modal closure settles.',
    ],
  },
  {
    entry: 'chat-start-runtime-renormalization-route',
    file: './chat-start-runtime-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that deeper main-process chat-start runtime seams re-normalize same-her project awareness before execution or provider-facing reply preparation',
      'prelude-payload-identity-renormalization',
      'prelude-project-state-system-block-injection',
      'chat-start-renderer-rejoin-without-body-renormalization',
      'session-runtime-renderer-rejoin-without-body-provider-facing-rebuild',
      'session-runtime-project-triad-provider-facing-block',
      'future new dialogue entrypoints still remain open',
    ],
  },
  {
    entry: 'chat-start-result-settlement-route',
    file: './chat-start-result-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that chat-start result settlement preserves digital-life governance and spine carry when prepared or prelude paths race, thin, or fail',
      'prelude-rich-spine-fallback',
      'accepted-start-thin-spine-repair',
    ],
  },
] as const

describe('return-side reopen chat-start runtime bridge audit', () => {
  it('keeps one explicit cold proof bridge that return-side reopen continuity survives not only into pre-dialogue send identity, but also through payload repair, prelude payload identity repair, prelude project-state system-block repair, deeper chat-start runtime renormalization, and start-result settlement on the next outward turn', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'return-side-reopen-pre-dialogue-send-identity-bridge' }),
      expect.objectContaining({ entry: 'chat-start-payload-repair' }),
      expect.objectContaining({ entry: 'chat-start-runtime-renormalization-route' }),
      expect.objectContaining({ entry: 'chat-start-result-settlement-route' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the return-side reopen through chat-start/runtime claim to current bridge and runtime/result audits instead of only the broader chat-start chain prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the return-side-reopen-through-chat-start-runtime same-her bridge as repo truth while keeping the explicit renderer-rejoin-without-body stronger fact visible and future entrypoint drift explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.proof).toContain('return-side-reopen-chat-start-runtime-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.responsibility).toContain('return-side-reopen-through-chat-start-runtime same-her bridge')
    expect(coverage.find(item => item.id === 'chat-start-pre-dialogue-awareness-chain')?.responsibility).toContain('renderer-rejoin-without-body stronger same-her fact')

    expect(matrixSource).toContain('return-side-reopen-chat-start-runtime-bridge-audit.test.ts')
    expect(matrixSource).toContain('return-side-reopen-through-chat-start-runtime same-her bridge')
    expect(matrixSource).toContain('renderer-rejoin-without-body stronger same-her fact')
    expect(matrixSource).toContain('renderer-rejoin-without-body same-her headline can be rebuilt from structured closure reasons')
    expect(matrixSource).toContain('prepared runtime selection, provider-facing rebuild, and runtime normalization')
    expect(auditSource).toContain('return-side-reopen-through-chat-start-runtime same-her bridge now also ties payload repair, prelude payload identity repair, prelude project-state system-block repair, deeper chat-start runtime re-normalization, and start-result settlement')
    expect(auditSource).toContain('renderer-rejoin-without-body stronger same-her fact')
    expect(auditSource).toContain('chat-start can rebuild that visible same-her headline from structured closure reasons')
    expect(auditSource).toContain('session-runtime can keep that stronger headline through prepared runtime selection, provider-facing rebuild, and normalization')
    expect(auditSource).toContain('the repo still does not yet prove every future dialogue entrypoint will inherit the same chain automatically')
  })
})
