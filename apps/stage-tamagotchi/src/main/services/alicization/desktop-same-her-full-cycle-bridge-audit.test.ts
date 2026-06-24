import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'return-side-reopen-to-pre-dialogue-send-identity-bridge',
    file: './return-side-reopen-pre-dialogue-send-identity-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that return-side reopen continuity can rematerialize into pre-dialogue send identity before the next outward turn re-enters chat-start execution',
      'shared-pre-dialogue-send-identity-authority',
    ],
  },
  {
    entry: 'return-side-reopen-through-chat-start-runtime-bridge',
    file: './return-side-reopen-chat-start-runtime-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that return-side reopen continuity survives not only into pre-dialogue send identity, but also through payload repair, prelude payload identity repair, prelude project-state system-block repair, deeper chat-start runtime renormalization, and start-result settlement on the next outward turn',
      'chat-start-result-settlement-route',
    ],
  },
  {
    entry: 'return-side-reopen-through-visible-reply-bridge',
    file: './return-side-reopen-visible-reply-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that return-side reopen continuity, once re-entered through chat-start/runtime, can stay on the same-her project line through response-surface obligations, callback next-closure-target carry, final visible-reply gating, realization, host-visible normalization, and compact outward answer shaping',
      'response-surface-callback-next-closure-target-carry',
      'compact-host-visible-answer-shaping-route',
    ],
  },
  {
    entry: 'host-visible-answer-to-replay-reopen-bridge',
    file: './proactive-feedback-host-visible-answer-replay-reopen-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line from host-visible answer shaping through delivery persistence replay and reopen',
      'reopen-persistence-same-her-project-awareness',
    ],
  },
] as const

describe('desktop same-her full-cycle bridge audit', () => {
  it('keeps one explicit compact cold proof that the desktop same-her line can survive one full reopen-to-visible-reply-to-replay-to-next-start cycle, with callback next-closure-target carry still explicit at the visible-reply bridge, instead of only neighboring bridge fragments', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'return-side-reopen-to-pre-dialogue-send-identity-bridge' }),
      expect.objectContaining({ entry: 'return-side-reopen-through-chat-start-runtime-bridge' }),
      expect.objectContaining({ entry: 'return-side-reopen-through-visible-reply-bridge' }),
      expect.objectContaining({ entry: 'host-visible-answer-to-replay-reopen-bridge' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the full-cycle claim to current reopen, visible-reply, replay, and reopen-persistence bridge audits instead of only broader long-run continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the desktop same-her full-cycle bridge as repo truth while keeping longer noisy-desktop closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain('desktop-same-her-full-cycle-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('desktop same-her full-cycle bridge')

    expect(matrixSource).toContain('desktop-same-her-full-cycle-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop same-her full-cycle bridge')
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain('callback next-closure-target carry')
    expect(matrixSource).toContain('desktop same-her full-cycle bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('desktop same-her full-cycle bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
