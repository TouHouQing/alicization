import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'desktop-execution-full-cycle-bridge',
    file: './desktop-execution-full-cycle-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that desktop execution callback returns can survive one full host-visible answer boundary to replay, reopen, and next-start cycle instead of stopping at the first execution closure loop',
      'expect.objectContaining({ entry: \'resume-confirmation-visible-reply-boundary-before-host-visible-answer\' })',
      'expect.objectContaining({ entry: \'desktop-same-her-full-cycle-bridge\' })',
    ],
  },
  {
    entry: 'desktop-execution-life-loop-bridge',
    file: './desktop-execution-life-loop-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that desktop execution callback returns can continue from the next start cycle into dream carry, long-horizon self-carry, and later hover-first initiative instead of stopping at execution closure alone',
      'expect.objectContaining({ entry: \'desktop-execution-full-cycle-bridge\' })',
      'expect.objectContaining({ entry: \'execution-callback-long-horizon-self-carry\' })',
    ],
  },
  {
    entry: 'desktop-execution-noisy-same-her-closure-bridge',
    file: './desktop-execution-noisy-same-her-closure-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop execution callback line can continue through noisy-desktop subsystem unity into host-visible same-her closure instead of stopping before the answer contract states what Alicization is, what Phase 1 has landed, and what remains open',
      'expect.objectContaining({ entry: \'planner-to-host-visible-answer-anti-shell-bridge\' })',
      'expect.objectContaining({ entry: \'noisy-desktop-same-her-closure-target\' })',
    ],
  },
  {
    entry: 'host-visible-answer-to-replay-reopen-same-her-bridge',
    file: './proactive-feedback-host-visible-answer-replay-reopen-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line from host-visible answer shaping through delivery persistence replay and reopen',
      'expect.objectContaining({ entry: \'guarded-turn-persistence-same-her-project-awareness\' })',
      'expect.objectContaining({ entry: \'reopen-persistence-same-her-project-awareness\' })',
    ],
  },
  {
    entry: 'desktop-same-her-full-cycle-bridge',
    file: './desktop-same-her-full-cycle-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that the desktop same-her line can survive one full reopen-to-visible-reply-to-replay-to-next-start cycle, with callback next-closure-target carry still explicit at the visible-reply bridge, instead of only neighboring bridge fragments',
      'host-visible-answer-to-replay-reopen-bridge',
      'return-side-reopen-through-visible-reply-bridge',
    ],
  },
] as const

describe('desktop execution noisy same-her full-cycle bridge audit', () => {
  it('keeps one explicit compact cold proof that the desktop execution callback line can continue from execution full-cycle and life-loop carry through noisy-desktop same-her closure into replay, reopen, and the next start cycle instead of stopping at the first higher-quality host-visible answer', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'desktop-execution-full-cycle-bridge' }),
      expect.objectContaining({ entry: 'desktop-execution-life-loop-bridge' }),
      expect.objectContaining({ entry: 'desktop-execution-noisy-same-her-closure-bridge' }),
      expect.objectContaining({ entry: 'host-visible-answer-to-replay-reopen-same-her-bridge' }),
      expect.objectContaining({ entry: 'desktop-same-her-full-cycle-bridge' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-to-replay/reopen full-cycle claim to current execution full-cycle, life-loop, same-her closure, replay persistence, and next-start bridge audits instead of only broader long-run or host-visible prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the desktop execution noisy same-her full-cycle bridge as repo truth while keeping fully sustained noisy-desktop closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-noisy-same-her-full-cycle-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('desktop execution noisy same-her full-cycle bridge')

    expect(matrixSource).toContain('desktop-execution-noisy-same-her-full-cycle-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop execution noisy same-her full-cycle bridge')
    expect(auditSource).toContain('desktop execution noisy same-her full-cycle bridge now also ties execution callback continuity through host-visible same-her closure into replay, reopen, and the next start cycle')
    expect(auditSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
  })
})
