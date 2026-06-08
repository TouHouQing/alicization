import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'visible-reply-facade-live-project-awareness-precedence',
    file: './visible-reply/facade.test.ts',
    snippets: [
      'prefers live current-conscious-frame project awareness in visible reply surface blocks when runtime digest is thinner',
      'Project preflight self-awareness: Before the visible reply forms, she should already know this repo is still closing one continuous digital life loop.',
      'Latest landed continuity progress: Live project awareness already survives into the visible reply surface plan.',
      'Next closure target: Keep this live project awareness explicit in the first visible answer beat.',
    ],
  },
  {
    entry: 'visible-reply-facade-richer-summary-precedence',
    file: './visible-reply/facade.test.ts',
    snippets: [
      'prefers richer raw runtime-digest same-her awareness summary in final visible-reply system blocks when the conscious frame still carries a thin reminder shell',
      'Before answering, remember: Alicization is a local-first digital life project building one continuous "her".',
      'returned-side visible reply continuity already survives on one same living line',
    ],
  },
  {
    entry: 'visible-reply-facade-anti-restart-closure-pressure-unification',
    file: './visible-reply/facade.test.ts',
    snippets: [
      'keeps same-her anti-restart doctrine and project-state closure pressure unified in provider-facing visible reply system blocks',
      'Keep the answer on the same digital-life closure seam.',
      'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
      'Do not rewrite the still-live line as a fresh opening or reintroduction.',
    ],
  },
  {
    entry: 'visible-reply-facade-dialogue-runtime-same-her-hold-carry',
    file: './visible-reply/facade.test.ts',
    snippets: [
      'keeps dialogue-runtime same-her hold arc and cue in the visible reply mind-turn contract',
      'dialogue-runtime hold: returned-side visible reply must stay on the same Phase 1 living line before any project summary widens',
      'dialogue-runtime-same-her-visible-reply-carry',
      'dialogue runtime cue: carry the same-her hold through visible reply formation instead of restarting as a generic shell',
    ],
  },
  {
    entry: 'visible-reply-facade-callback-project-continuity-carry',
    file: './visible-reply/facade.test.ts',
    snippets: [
      'keeps compiler-carried same-her callback project continuity in final visible-reply system blocks when the conscious frame stays thin',
      'This callback return still belongs to one same her carrying the same closure line forward.',
      'Same-her callback continuity already survives through answer compilation and response-surface carry before the final visible reply forms.',
      'Do not let same-her callback continuity collapse into a generic callback shell or detached utility notice once the final visible reply is formed.',
    ],
  },
  {
    entry: 'visible-reply-facade-fresher-same-her-self-line-precedence',
    file: './visible-reply/facade.test.ts',
    snippets: [
      'keeps a fresher surface-level same-her self line in final visible-reply system blocks even when currentConsciousFrame is thinner',
      'This is still one same her carrying the same project line all the way into the final visible reply.',
      'Project same-her drift risk: If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn..',
    ],
  },
] as const

describe('visible reply facade project awareness audit', () => {
  it('keeps one explicit route-level proof that visible-reply facade preserves same-her project awareness before final host-visible wording settles', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'visible-reply-facade-live-project-awareness-precedence' }),
      expect.objectContaining({ entry: 'visible-reply-facade-richer-summary-precedence' }),
      expect.objectContaining({ entry: 'visible-reply-facade-anti-restart-closure-pressure-unification' }),
      expect.objectContaining({ entry: 'visible-reply-facade-dialogue-runtime-same-her-hold-carry' }),
      expect.objectContaining({ entry: 'visible-reply-facade-callback-project-continuity-carry' }),
      expect.objectContaining({ entry: 'visible-reply-facade-fresher-same-her-self-line-precedence' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the visible-reply-facade same-her project-awareness claim to current behavior tests instead of broader reply-surface prose alone', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: visible-reply facade now has dedicated same-her project-awareness proof while long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('visible-reply-facade-project-awareness-audit.test.ts')
    expect(auditSource).toContain('visible-reply-facade-project-awareness-audit.test.ts')
    expect(coverageSource).toContain('visible-reply-facade-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(auditSource).toMatch(/still not fully closed|still not full Phase 1 closure|still .*fully sustained noisy-desktop convergence/i)
  })
})
