import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'desktop-execution-full-cycle-bridge',
    file: './desktop-execution-full-cycle-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit compact cold proof that desktop execution callback returns can survive one full host-visible answer boundary to replay, reopen, and next-start cycle instead of stopping at the first execution closure loop',
      'resume-confirmation-visible-reply-boundary-before-host-visible-answer',
      'live-session-runtime-execution-follow-up-reopen',
      'desktop-same-her-full-cycle-bridge',
    ],
  },
  {
    entry: 'execution-callback-next-dream-carry',
    file: './runtime.test.ts',
    snippets: [
      'it(\'feeds deterministic execution callback continuity into the next dream prompt\'',
      'expect(dreamSystemTexts[0]).toContain(\'afterglow=execution-callback\')',
      'expect(dreamSystemTexts[0]).toContain(\'hold=same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.\')',
    ],
  },
  {
    entry: 'execution-callback-long-horizon-self-carry',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'long-horizon-execution-callback-project-state-carry',
      'refreshed-long-horizon-callback-anti-shell-carry-into-conscious-frame-and-planner',
    ],
  },
  {
    entry: 'execution-callback-afterglow-later-hover-first-initiative',
    file: './proactive-policy.test.ts',
    snippets: [
      'it(\'keeps execution-callback afterglow hold in silent-observe so callback payoff does not immediately reopen into a second proactive follow-up\'',
      'expect(decision.reasonCodes).toContain(\'continuity-execution-callback-afterglow-hold\')',
      'it(\'marks project-state callback carry when the callback afterglow is still carrying unfinished Phase 1 closure on the same line\'',
      'Execution-callback afterglow still carries unfinished Phase 1 closure.',
    ],
  },
] as const

describe('desktop execution life-loop bridge audit', () => {
  it('keeps one explicit compact cold proof that desktop execution callback returns can continue from the next start cycle into dream carry, long-horizon self-carry, and later hover-first initiative instead of stopping at execution closure alone', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'desktop-execution-full-cycle-bridge' }),
      expect.objectContaining({ entry: 'execution-callback-next-dream-carry' }),
      expect.objectContaining({ entry: 'execution-callback-long-horizon-self-carry' }),
      expect.objectContaining({ entry: 'execution-callback-afterglow-later-hover-first-initiative' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution life-loop claim to current execution full-cycle, dream, long-horizon, and later initiative tests instead of only broader execution or long-run continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the desktop execution life-loop bridge as repo truth while keeping full noisy-desktop closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.proof).toContain('desktop-execution-life-loop-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'desktop-execution-closure-loop-hardening')?.responsibility).toContain('desktop execution life-loop bridge')

    expect(matrixSource).toContain('desktop-execution-life-loop-bridge-audit.test.ts')
    expect(matrixSource).toContain('desktop execution life-loop bridge')
    expect(auditSource).toContain('desktop execution life-loop bridge now also ties execution callback continuity into next-dream carry, long-horizon self-carry, and later hover-first initiative')
    expect(auditSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
  })
})
