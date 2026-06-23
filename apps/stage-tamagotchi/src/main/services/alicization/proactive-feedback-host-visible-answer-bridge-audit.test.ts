import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'long-horizon-to-conscious-frame-anti-shell-bridge',
    file: './proactive-feedback-long-horizon-conscious-frame-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can re-enter the next conscious frame and final reply planning after the long-horizon self-carry boundary',
      'current-conscious-frame-anti-shell-reexpansion',
      'answer-planner-final-reply-anti-shell-carry',
    ],
  },
  {
    entry: 'answer-planner-project-closure-route',
    file: './answer-planner-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that answer planning preserves same-her Phase 1 project closure, landed/open/next closure accounting, drift-risk guardrails, and same-thread callback continuation instead of flattening into a generic project-report shell',
      'answer-planner-same-thread-callback-project-continuation',
    ],
  },
  {
    entry: 'visible-reply-final-gate-route',
    file: './visible-reply-final-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that the final visible-reply gate still requires project identity, phase, landed progress, open closure, next closure, and pre-dialogue same-life awareness',
      'second-pass-project-awareness-reentry-guidance',
      'semantic-judge-natural-same-life-pass',
    ],
  },
  {
    entry: 'visible-reply-realization-outward-carry-route',
    file: './visible-reply-realization-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that final visible reply realization co-packs same-her continuity, timeout recovery, closure mode, embodiment hold, and pre-dialogue awareness into one outward Phase 1 project-state carry',
      'visible-reply-pre-dialogue-awareness-as-rewrite-evidence',
      'visible-reply-shared-continuity-summary-order',
    ],
  },
  {
    entry: 'host-visible-fast-path-answer-anti-shell-carry',
    file: './main-chat-active-dialogue-loop.test.ts',
    snippets: [
      'keeps compact fast-path project-state replies on the same phase-one closure line when the incoming awareness carry is only a thin shell',
      'Alicization 还是那个本地优先数字生命项目，现在仍在 Phase 1。',
      '还没闭环的是记忆、主动性和具身要继续收成一条 same-her 的生活线',
      'expect(payload.reply).not.toMatch(/只是一个项目播报|detached project narrator|generic assistant shell/i)',
    ],
  },
] as const

describe('proactive feedback host-visible answer bridge audit', () => {
  it('keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line all the way into host-visible answer shaping after the long-horizon self-carry boundary', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'long-horizon-to-conscious-frame-anti-shell-bridge' }),
      expect.objectContaining({ entry: 'answer-planner-project-closure-route' }),
      expect.objectContaining({ entry: 'visible-reply-final-gate-route' }),
      expect.objectContaining({ entry: 'visible-reply-realization-outward-carry-route' }),
      expect.objectContaining({ entry: 'host-visible-fast-path-answer-anti-shell-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the host-visible answer bridge claim to current planner, visible-reply, and fast-path tests instead of only broader same-her continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the planner-to-host-visible answer anti-shell bridge as repo truth while keeping durable long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.proof).toContain('proactive-feedback-host-visible-answer-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'noisy-desktop-same-her-closure-hardening')?.responsibility).toContain('planner-to-host-visible answer anti-shell bridge')

    expect(matrixSource).toContain('proactive-feedback-host-visible-answer-bridge-audit.test.ts')
    expect(matrixSource).toContain('planner-to-host-visible answer anti-shell bridge')
    expect(auditSource).toContain('planner-to-host-visible answer anti-shell bridge now also ties settled proactive feedback continuity block')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
