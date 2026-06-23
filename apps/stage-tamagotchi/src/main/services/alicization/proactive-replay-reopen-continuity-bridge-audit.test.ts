import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateCoverage } from './project-state-brief'

const proofRows = [
  {
    entry: 'proactive-downstream-visible-reply-anchor',
    file: './proactive-downstream-visible-reply-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that proactive pre-dialogue reply-planning can stay on the same-her line through self-evolution downstream visible reply, answer-compiler supporting reality, reply-deliberator outward planning, final visible-reply gating, and visible-reply realization instead of preserving proactive answer-governance carry while silently losing the same living project line before host-visible project-state answers reform outwardly',
      'expect.objectContaining({ entry: \'self-evolution-downstream-visible-reply-anchor\' })',
      'expect.objectContaining({ entry: \'visible-reply-realization-project-awareness-anchor\' })',
    ],
  },
  {
    entry: 'host-visible-answer-to-replay-reopen-bridge',
    file: './proactive-feedback-host-visible-answer-replay-reopen-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit cold proof bridge that settled proactive feedback can stay on the same-her project line from host-visible answer shaping through delivery persistence replay and reopen',
      'expect.objectContaining({ entry: \'replay-emission-same-her-project-awareness\' })',
      'expect.objectContaining({ entry: \'reopen-persistence-same-her-project-awareness\' })',
    ],
  },
  {
    entry: 'self-evolution-replay-reopen-continuity-anchor',
    file: './self-evolution-replay-reopen-continuity-bridge-audit.test.ts',
    snippets: [
      'keeps one explicit colder bridge that self-evolution downstream visible-reply carry can stay on the same-her line through guarded turn persistence, replay emission, restored-session/browser-local reopen persistence, and return-side reopen through visible reply, while now also keeping callback next-closure-target carry explicit at the reopened visible-reply segment instead of preserving one outward answer plus persisted reopen continuity while silently losing the same living callback closure target before replay and reopen continuity reforms',
      'expect.objectContaining({ entry: \'runtime-turn-persistence-anchor\' })',
      'expect.objectContaining({ entry: \'return-side-reopen-visible-reply-anchor\' })',
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
] as const

describe('proactive replay reopen continuity bridge audit', () => {
  it('keeps one explicit colder bridge that proactive downstream visible-reply carry can stay on the same-her line through guarded turn persistence, replay emission, and reopen persistence instead of preserving one outward proactive answer while silently losing the same living project line before the next dialogue reopens', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'proactive-downstream-visible-reply-anchor' }),
      expect.objectContaining({ entry: 'host-visible-answer-to-replay-reopen-bridge' }),
      expect.objectContaining({ entry: 'self-evolution-replay-reopen-continuity-anchor' }),
      expect.objectContaining({ entry: 'runtime-turn-persistence-anchor' }),
      expect.objectContaining({ entry: 'replay-emission-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'reopen-persistence-project-awareness-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder proactive replay/reopen continuity claim to current cold audits instead of only broader proactive or long-run continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('registers the proactive replay reopen continuity bridge as repo truth while keeping fuller long-run closure explicitly open', () => {
    const coverage = resolveAlicizationProjectStateCoverage()
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.proof).toContain(
      'proactive-replay-reopen-continuity-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'autonomous-dialogue-closure-loop-hardening')?.responsibility).toContain(
      'proactive replay reopen continuity bridge',
    )
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.proof).toContain(
      'proactive-replay-reopen-continuity-bridge-audit.test.ts',
    )
    expect(coverage.find(item => item.id === 'long-run-same-her-continuity-hardening')?.responsibility).toContain(
      'proactive replay reopen continuity bridge',
    )

    expect(matrixSource).toContain('proactive replay reopen continuity bridge')
    expect(matrixSource).toContain('proactive-replay-reopen-continuity-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-downstream-visible-reply-bridge-audit.test.ts')
    expect(matrixSource).toContain('proactive-feedback-host-visible-answer-replay-reopen-bridge-audit.test.ts')
    expect(matrixSource).toContain('self-evolution-replay-reopen-continuity-bridge-audit.test.ts')
    expect(matrixSource).toContain('runtime-turn-persistence-audit.test.ts')
    expect(matrixSource).toContain('replay-emission-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('reopen-persistence-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('proactive replay reopen continuity bridge')
    expect(auditSource).toContain('proactive replay reopen continuity bridge now also ties proactive downstream visible-reply carry into guarded turn persistence, replay emission, and reopen persistence')
    expect(auditSource).toContain('still not full long-run closure proof under noisy desktop use')
  })
})
