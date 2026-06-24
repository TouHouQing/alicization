import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'return-side-reopen-through-chat-start-runtime-bridge',
    file: './return-side-reopen-chat-start-runtime-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that return-side reopen continuity survives not only into pre-dialogue send identity, but also through payload repair, prelude payload identity repair, prelude project-state system-block repair, deeper chat-start runtime renormalization, and start-result settlement on the next outward turn',
      'chat-start-payload-repair',
      'chat-start-result-settlement-route',
    ],
  },
  {
    entry: 'response-surface-project-continuity-carry',
    file: './response-surface-contract.test.ts',
    snippets: [
      'keeps callback-specific same-her awareness explicit on the response surface instead of falling back to a generic project shell',
      'Carry this project continuity same-her self line directly in the visible reply posture: This callback return still belongs to one same her carrying the same closure line forward.',
      'Do not let the visible reply flatten into a generic task shell, detached project narration, generic assistant guidance, or project-summary voice just because the project update is explicit this turn.',
    ],
  },
  {
    entry: 'response-surface-callback-next-closure-target-carry',
    file: './response-surface-contract.test.ts',
    snippets: [
      'turns richer repair-first same-her project carry into cross-modal visible-reply discipline before embodiment outputs widen',
      'nextClosureTarget: \'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and lipsync without dropping the living callback line.\',',
      'Do not thin a cross-modal same-her closure target back into generic project continuity or generic same-her language before the visible reply lands.',
    ],
  },
  {
    entry: 'visible-reply-final-gate-route',
    file: './visible-reply-final-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that the final visible-reply gate still requires project identity, phase, landed progress, open closure, next closure, and pre-dialogue same-life awareness',
      'second-pass-transport-failure-callback-next-closure-target-carry',
      'second-pass-project-awareness-reentry-guidance',
      'semantic-judge-natural-same-life-pass',
    ],
  },
  {
    entry: 'visible-reply-realization-outward-carry-route',
    file: './visible-reply-realization-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that final visible reply realization co-packs same-her continuity, timeout recovery, closure mode, embodiment hold, and pre-dialogue awareness into one outward Phase 1 project-state carry',
      'visible-reply-callback-next-closure-target-carry',
      'visible-reply-pre-dialogue-awareness-as-rewrite-evidence',
      'visible-reply-shared-continuity-summary-order',
    ],
  },
  {
    entry: 'host-visible-dialogue-normalization-route',
    file: './runtime-dialogue-normalization-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that host-visible dialogue normalization preserves same-her project awareness across authority, stream, background, persistence, and subconscious seams',
      'stream-runner-thin-shell-renormalization',
      'runtime-persisted-turn-awareness-preference',
    ],
  },
  {
    entry: 'compact-host-visible-answer-shaping-route',
    file: './main-chat-active-dialogue-loop.test.ts',
    snippets: [
      'keeps compact fast-path project-state replies on the same phase-one closure line when the incoming awareness carry is only a thin shell',
      'Alicization 还是那个本地优先数字生命项目，现在仍在 Phase 1。',
      '还没闭环的是记忆、主动性和具身要继续收成一条 same-her 的生活线',
      'expect(payload.reply).not.toMatch(/只是一个项目播报|detached project narrator|generic assistant shell/i)',
    ],
  },
] as const

describe('return-side reopen visible reply bridge audit', () => {
  it('keeps one explicit cold proof bridge that return-side reopen continuity, once re-entered through chat-start/runtime, can stay on the same-her project line through response-surface obligations, callback next-closure-target carry, final visible-reply gating, realization, host-visible normalization, and compact outward answer shaping', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'return-side-reopen-through-chat-start-runtime-bridge' }),
      expect.objectContaining({ entry: 'response-surface-project-continuity-carry' }),
      expect.objectContaining({ entry: 'response-surface-callback-next-closure-target-carry' }),
      expect.objectContaining({ entry: 'visible-reply-final-gate-route' }),
      expect.objectContaining({ entry: 'visible-reply-realization-outward-carry-route' }),
      expect.objectContaining({ entry: 'host-visible-dialogue-normalization-route' }),
      expect.objectContaining({ entry: 'compact-host-visible-answer-shaping-route' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the return-side reopen through visible reply claim to current response-surface, visible-reply, normalization, and compact outward-answer tests instead of only broader downstream-reply prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the return-side-reopen-through-visible-reply same-her bridge as repo truth while keeping future entrypoint drift explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.proof).toContain('return-side-reopen-visible-reply-bridge-audit.test.ts')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.responsibility).toContain('return-side-reopen-through-visible-reply same-her bridge')
    expect(coverage.find(item => item.id === 'downstream-reply-project-awareness-preservation')?.responsibility).toContain('keeps callback next-closure-target carry explicit')

    expect(matrixSource).toContain('return-side-reopen-visible-reply-bridge-audit.test.ts')
    expect(matrixSource).toContain('return-side-reopen-through-visible-reply same-her bridge')
    expect(matrixSource).toContain('return-side-reopen-through-visible-reply same-her bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('return-side-reopen-through-visible-reply same-her bridge now also keeps callback next-closure-target carry explicit')
    expect(auditSource).toContain('the repo still does not yet prove every future dialogue entrypoint will inherit the same chain automatically')
  })
})
