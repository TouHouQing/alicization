import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'desktop-execution-closure-loop-continuity',
    file: './desktop-execution-closure-loop-audit.test.ts',
    snippets: [
      'keeps one compact route-level proof that desktop execution continuity stays on one same-her Phase 1 line from execution briefing through callback reopen, feedback memory writeback, follow-up obligation, ledger reopen, live follow-up assembly, and later-turn host-visible return',
      'later-turn-host-visible-desktop-return',
      'session-runtime-to-host-visible-cross-modal-return',
    ],
  },
  {
    entry: 'resume-confirmation-visible-reply-boundary-before-host-visible-answer',
    file: './desktop-execution-closure-loop-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that a host-confirmed resume remains only a bounded same-her confirmation boundary from persisted callback state through answer planning, visible-reply governance, rewrite pressure, and final audit carry instead of reopening outward as standing execution permission',
      'expect.objectContaining({ entry: \'resume-confirmation-visible-reply-boundary-before-host-visible-answer\' })',
      'file: \'./execution-resume-confirmation-visible-reply-boundary-project-awareness-audit.test.ts\'',
    ],
  },
  {
    entry: 'confirmed-thread-resume-redispatch-before-reopen',
    file: './executor-runtime-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that confirmed execution-thread resume preserves same-her project awareness before redispatch opens outward again',
      'resume-confirmed-thread-project-triad-carry',
      'resume-legacy-blank-field-thin-shell-repair',
    ],
  },
  {
    entry: 'live-session-runtime-execution-follow-up-reopen',
    file: './execution-follow-up-session-runtime-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that live session-runtime follow-up assembly preserves the same-her Phase 1 project line for fresh and ledger-backed execution reopen paths',
      'session-runtime-fresh-callback-follow-up-project-boundary',
      'session-runtime-ledger-follow-up-project-boundary',
    ],
  },
  {
    entry: 'desktop-same-her-full-cycle-bridge',
    file: './desktop-same-her-full-cycle-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop same-her line can survive one full reopen-to-visible-reply-to-replay-to-next-start cycle, with callback next-closure-target carry still explicit at the visible-reply bridge, instead of only neighboring bridge fragments',
      'return-side-reopen-through-visible-reply-bridge',
      'host-visible-answer-to-replay-reopen-bridge',
    ],
  },
] as const

describe('desktop execution full-cycle bridge audit', () => {
  it('keeps one explicit compact cold proof that desktop execution callback returns can survive one full host-visible answer boundary to replay, reopen, and next-start cycle instead of stopping at the first execution closure loop', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'desktop-execution-closure-loop-continuity' }),
      expect.objectContaining({ entry: 'resume-confirmation-visible-reply-boundary-before-host-visible-answer' }),
      expect.objectContaining({ entry: 'confirmed-thread-resume-redispatch-before-reopen' }),
      expect.objectContaining({ entry: 'live-session-runtime-execution-follow-up-reopen' }),
      expect.objectContaining({ entry: 'desktop-same-her-full-cycle-bridge' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution full-cycle claim to current execution-loop, pre-host-visible-answer boundary, follow-up, resume, and next-start bridge audits instead of only broader execution or long-run continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the desktop execution full-cycle bridge as repo truth while keeping future execution families and fully sustained noisy-desktop closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-full-cycle-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('desktop execution full-cycle bridge')

    expect(matrixSource).toContain('desktop-execution-full-cycle-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop execution full-cycle bridge')
    expect(matrixSource).toContain('future execution dispatch families still need explicit owner registration')
    expect(auditSource).toContain('desktop execution full-cycle bridge now also ties execution callback reopen, host-visible return, replay, and the next start cycle')
    expect(auditSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
  })
})
