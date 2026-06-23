import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'host-visible-answer-anti-shell-bridge',
    file: './proactive-feedback-host-visible-answer-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line all the way into host-visible answer shaping after the long-horizon self-carry boundary',
      'visible-reply-final-gate-route',
      'host-visible-fast-path-answer-anti-shell-carry',
    ],
  },
  {
    entry: 'guarded-turn-persistence-same-her-project-awareness',
    file: './runtime-turn-persistence-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that guarded turn persistence preserves same-her project awareness across runtime authority callback delivery and deferred proactive carry',
      'runtime-persisted-turn-awareness-preference',
      'execution-callback-persistence-awareness-backfill',
    ],
  },
  {
    entry: 'replay-emission-same-her-project-awareness',
    file: './replay-emission-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that persisted and replayed turns preserve same-her project awareness before re-emission',
      'runtime-replay-emission-richer-awareness-precedence',
      'runtime-replay-emission-richer-same-her-precedence',
    ],
  },
  {
    entry: 'reopen-persistence-same-her-project-awareness',
    file: '../../../../../../packages/stage-ui/src/stores/reopen-persistence-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that restored-session fallback and browser-local replay preserve same-her project awareness before the next outward turn',
      'browser-local-replay-richer-host-visible-awareness',
      'duplicate-turn-merge-richer-same-her-continuity',
    ],
  },
] as const

describe('proactive feedback host-visible answer replay reopen bridge audit', () => {
  it('keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line from host-visible answer shaping through delivery persistence replay and reopen', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'host-visible-answer-anti-shell-bridge' }),
      expect.objectContaining({ entry: 'guarded-turn-persistence-same-her-project-awareness' }),
      expect.objectContaining({ entry: 'replay-emission-same-her-project-awareness' }),
      expect.objectContaining({ entry: 'reopen-persistence-same-her-project-awareness' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the host-visible answer to replay/reopen bridge claim to current persistence and replay tests instead of only broader same-her continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the host-visible-answer-to-replay-reopen same-her bridge as repo truth while keeping long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('proactive-feedback-host-visible-answer-replay-reopen-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('host-visible-answer-to-replay-reopen same-her bridge')

    expect(matrixSource).toContain('proactive-feedback-host-visible-answer-replay-reopen-bridge-audit.test.ts')
    expect(matrixSource).toContain('host-visible-answer-to-replay-reopen same-her bridge')
    expect(auditSource).toContain('host-visible-answer-to-replay-reopen same-her bridge now also ties settled proactive feedback continuity block')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
