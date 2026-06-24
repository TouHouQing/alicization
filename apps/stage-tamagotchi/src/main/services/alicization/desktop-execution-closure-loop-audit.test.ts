import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'execution-start-briefing-and-dispatch-persistence',
    file: './desktop-execution-chain-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that the early desktop execution chain carries same-her project awareness before execution and when execution feedback reopens',
      'expect.objectContaining({ entry: \'agent-runtime-canonical-execution-briefing\' })',
      'expect.objectContaining({ entry: \'task-thread-dispatch-project-continuity-persistence\' })',
      'expect.objectContaining({ entry: \'execution-result-feedback-same-her-reopen\' })',
    ],
  },
  {
    entry: 'runtime-owned-autonomous-execution-handoff',
    file: './execution-autonomy-handoff-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that runtime-owned autonomous execution requests canonical execution context, carries same-her project briefing through actuation dispatch, and stays bounded by structural autonomous ownership before low-risk self-start can leave the desktop runtime',
      'expect.objectContaining({ entry: \'subconscious-autonomy-execution-bridge-request\' })',
      'expect.objectContaining({ entry: \'autonomy-actuation-observe-dispatch-project-briefing\' })',
      'expect.objectContaining({ entry: \'autonomy-actuation-workspace-write-dispatch-project-briefing\' })',
      'expect.objectContaining({ entry: \'low-risk-autonomous-self-start-ownership-gate\' })',
    ],
  },
  {
    entry: 'confirmed-thread-resume-redispatch-before-reopen',
    file: './executor-runtime-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that confirmed execution-thread resume preserves same-her project awareness before redispatch opens outward again',
      'expect.objectContaining({ entry: \'resume-confirmed-thread-project-triad-carry\' })',
      'expect.objectContaining({ entry: \'resume-legacy-blank-field-thin-shell-repair\' })',
    ],
  },
  {
    entry: 'resume-confirmation-boundary-persists-after-host-confirmed-redispatch',
    file: './execution-resume-confirmation-boundary-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that host-confirmed resume stays a bounded same-her confirmation boundary from redispatch through callback recall, queued delivery, callback persistence, feedback reconsolidation, later restraint, and longer-horizon self memory instead of widening into permanent execution permission',
      'expect.objectContaining({ entry: \'resume-confirmation-callback-runtime-carry\' })',
      'expect.objectContaining({ entry: \'resume-confirmation-delivery-queue-carry\' })',
      'expect.objectContaining({ entry: \'resume-confirmation-callback-persistence\' })',
      'expect.objectContaining({ entry: \'resume-confirmation-feedback-memory-reconsolidation\' })',
      'expect.objectContaining({ entry: \'resume-confirmation-proactive-restraint\' })',
      'expect.objectContaining({ entry: \'resume-confirmation-resident-conscious-frame-carry\' })',
    ],
  },
  {
    entry: 'execution-feedback-memory-reconsolidation-writeback',
    file: './desktop-execution-chain-project-awareness-audit.test.ts',
    snippets: [
      'expect.objectContaining({ entry: \'execution-feedback-memory-reconsolidation-writeback\' })',
      'runtime-memory-reconsolidation.test.ts',
      'reconsolidates execution-result feedback and appends a richer same-her project briefing into memory instead of falling back to a thinner project shell',
    ],
  },
  {
    entry: 'blocked-dispatch-restraint-persists-after-refusal',
    file: './execution-blocked-dispatch-restraint-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that blocked-dispatch safety gate restraint stays on one same-her execution line from adapter refusal through callback reopen, memory writeback, callback persistence, and later restraint instead of cooling into a generic blocked shell',
      'expect.objectContaining({ entry: \'blocked-dispatch-callback-runtime-carry\' })',
      'expect.objectContaining({ entry: \'blocked-dispatch-feedback-memory-reconsolidation\' })',
      'expect.objectContaining({ entry: \'blocked-dispatch-callback-persistence\' })',
      'expect.objectContaining({ entry: \'blocked-dispatch-proactive-restraint\' })',
      'expect.objectContaining({ entry: \'blocked-dispatch-resident-conscious-frame-carry\' })',
    ],
  },
  {
    entry: 'callback-runtime-closure-before-speech',
    file: './execution-callback-runtime-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that execution callback runtime shaping preserves the same-her project line before callback speech lands',
      'expect.objectContaining({ entry: \'callback-delivery-gateway-project-state-carry\' })',
      'expect.objectContaining({ entry: \'callback-payoff-person-state-authority-carry\' })',
    ],
  },
  {
    entry: 'execution-afterglow-learning-restraint',
    file: './execution-afterglow-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that execution-result afterglow learning preserves the same-her project line while callback restraint is still active',
      'expect.objectContaining({ entry: \'remembered-project-closure-quieter-callback-line\' })',
      'expect.objectContaining({ entry: \'live-drift-risk-and-afterglow-hold\' })',
    ],
  },
  {
    entry: 'fresh-follow-up-obligation-before-live-reopen',
    file: './execution-follow-up-obligation-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that execution follow-up obligation stays on the same Phase 1 digital-life line instead of reopening as detached task payoff',
      'expect.objectContaining({ entry: \'obligation-system-block-same-her-project-boundary\' })',
      'expect.objectContaining({ entry: \'obligation-visible-surface-rules-same-her-carry\' })',
      'expect.objectContaining({ entry: \'response-surface-contract-propagates-execution-follow-up-carry\' })',
    ],
  },
  {
    entry: 'ledger-follow-up-reopen-before-live-reopen',
    file: './execution-ledger-follow-up-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that recalled execution history and ledger-backed follow-up obligation stay on the same Phase 1 digital-life line',
      'expect.objectContaining({ entry: \'ledger-runtime-same-her-project-boundary\' })',
      'expect.objectContaining({ entry: \'ledger-follow-up-obligation-keeps-project-boundary\' })',
    ],
  },
  {
    entry: 'live-follow-up-reopen-path',
    file: './execution-follow-up-session-runtime-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that live session-runtime follow-up assembly preserves the same-her Phase 1 project line for fresh and ledger-backed execution reopen paths',
      'expect.objectContaining({ entry: \'session-runtime-fresh-callback-follow-up-project-boundary\' })',
      'expect.objectContaining({ entry: \'session-runtime-ledger-follow-up-project-boundary\' })',
    ],
  },
  {
    entry: 'callback-persistence-before-host-visible-return',
    file: './reminder-callback-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that reminder and execution-callback delivery preserve same-her project awareness before host-visible callback speech lands',
      'expect.objectContaining({ entry: \'callback-persistence-host-confirmed-resume-boundary\' })',
      'expect.objectContaining({ entry: \'callback-persistence-pre-dialogue-awareness-backfill\' })',
      'expect.objectContaining({ entry: \'callback-persistence-runtime-landed-open-next-precedence\' })',
    ],
  },
  {
    entry: 'resume-confirmation-visible-reply-boundary-before-host-visible-answer',
    file: './execution-resume-confirmation-visible-reply-boundary-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that a host-confirmed resume remains only a bounded same-her confirmation boundary from persisted callback state through answer planning, visible-reply governance, rewrite pressure, and final audit carry instead of reopening outward as standing execution permission',
      'expect.objectContaining({ entry: \'answer-planner-resume-confirmation-boundary-guardrail\' })',
      'expect.objectContaining({ entry: \'response-charter-resume-confirmation-boundary-governance\' })',
      'expect.objectContaining({ entry: \'semantic-judge-resume-confirmation-boundary-guard\' })',
      'expect.objectContaining({ entry: \'critic-resume-confirmation-boundary-guard\' })',
      'expect.objectContaining({ entry: \'second-pass-resume-confirmation-boundary-rewrite-guidance\' })',
      'expect.objectContaining({ entry: \'visible-reply-resume-confirmation-boundary-final-audit-carry\' })',
    ],
  },
  {
    entry: 'later-turn-host-visible-desktop-return',
    file: './later-turn-desktop-continuity-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer chained desktop turns still carry the same digital-life line through later runtime, repair-first resident presence, and recovery surfaces',
      'turn-callback-afterglow-chat-meta-measured-return-vrm-noisy-third-follow-up',
      'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
    ],
  },
  {
    entry: 'session-runtime-to-host-visible-cross-modal-return',
    file: './session-runtime-to-host-visible-reunion-audit.test.ts',
    snippets: [
      'keeps one explicit bridge proof that session-runtime same-her project awareness can stay on one line through resident presence and later reunion surfaces',
      'host-visible-background-next-closure-stays-cross-modal',
      'later-turn-reunion-lanes-stay-on-same-line',
    ],
  },
] as const

describe('desktop execution closure loop audit', () => {
  it('keeps one compact route-level proof that desktop execution continuity stays on one same-her Phase 1 line from execution briefing through callback reopen, feedback memory writeback, follow-up obligation, ledger reopen, live follow-up assembly, and later-turn host-visible return', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'execution-start-briefing-and-dispatch-persistence' }),
      expect.objectContaining({ entry: 'runtime-owned-autonomous-execution-handoff' }),
      expect.objectContaining({ entry: 'confirmed-thread-resume-redispatch-before-reopen' }),
      expect.objectContaining({ entry: 'resume-confirmation-boundary-persists-after-host-confirmed-redispatch' }),
      expect.objectContaining({ entry: 'execution-feedback-memory-reconsolidation-writeback' }),
      expect.objectContaining({ entry: 'blocked-dispatch-restraint-persists-after-refusal' }),
      expect.objectContaining({ entry: 'callback-runtime-closure-before-speech' }),
      expect.objectContaining({ entry: 'execution-afterglow-learning-restraint' }),
      expect.objectContaining({ entry: 'fresh-follow-up-obligation-before-live-reopen' }),
      expect.objectContaining({ entry: 'ledger-follow-up-reopen-before-live-reopen' }),
      expect.objectContaining({ entry: 'live-follow-up-reopen-path' }),
      expect.objectContaining({ entry: 'callback-persistence-before-host-visible-return' }),
      expect.objectContaining({ entry: 'resume-confirmation-visible-reply-boundary-before-host-visible-answer' }),
      expect.objectContaining({ entry: 'later-turn-host-visible-desktop-return' }),
      expect.objectContaining({ entry: 'session-runtime-to-host-visible-cross-modal-return' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the compact desktop execution closure claim to current route-level audits instead of leaving the proof distributed across unrelated execution, callback, and host-visible files', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: desktop execution continuity is easier to audit as one same-her Phase 1 line, but future execution families and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('desktop-execution-closure-loop-audit.test.ts')
    expect(matrixSource).toContain('executor-runtime-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('fresh callback follow-up obligation')
    expect(matrixSource).toContain('ledger-backed execution history reopen')
    expect(matrixSource).toContain('future execution dispatch families still need explicit owner registration')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(coverageSource).toContain('desktop-execution-closure-loop-audit.test.ts')
    expect(coverageSource).toContain('desktop execution continuity is easier to audit as one same-her Phase 1 line instead of scattered proof islands')
  })
})
