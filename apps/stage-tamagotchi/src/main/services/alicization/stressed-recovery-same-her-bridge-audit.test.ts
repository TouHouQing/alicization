import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'one-shot-provider-project-awareness-anchor',
    file: './one-shot-provider-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that provider-facing one-shot generation preserves same-her project awareness before classification or appraisal text is generated',
      'injects project-state identity and closure dashboard into audited screen-semantic one-shot prompts before generation',
      'fails closed before provider generation if canonical project-state context is missing from assembled one-shot messages',
    ],
  },
  {
    entry: 'timeout-fallback-project-awareness-anchor',
    file: './timeout-fallback-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that timeout fallback preserves same-her project awareness when repaired authority, payload carry, runtime carry, or canonical backfill compete',
      'keeps project identity, landed progress, and still-open closure distinct together when timeout fallback rebuilds project state',
      'backfills canonical same-her continuity when timeout fallback rebuilds project state from a thin runtime digest shell',
    ],
  },
  {
    entry: 'background-recovery-project-awareness-anchor',
    file: './background-recovery-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that background recovery preserves same-her project awareness when payload briefing carry, runtime awareness carry, thin shells, and same-her headlines compete',
      'keeps richer runtime project awareness explicit during background recovery even when payload only carries a thin shell and no stronger companion headline',
      'prefers payload same-her headline over thinner payload awareness when background recovery backfills project-state closure',
    ],
  },
  {
    entry: 'run-lifecycle-project-awareness-anchor',
    file: './run-lifecycle-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that lifecycle timeout recovery finish and emit seams preserve same-her project awareness instead of closing on a detached shell',
      'bridges timeout-fallback top-level project-state audit into visible-reply realization during lifecycle recovery',
      'keeps a fuller project-and-phase awareness line when lifecycle recovery sees a narrower embodiment same-her summary nearby',
    ],
  },
] as const

describe('stressed recovery same-her bridge audit', () => {
  it('keeps one explicit colder bridge that one-shot provider fallback, timeout fallback, background recovery, and lifecycle finish all preserve one same-her project-awareness line before stressed recovery can speak outward again', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'one-shot-provider-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'timeout-fallback-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'background-recovery-project-awareness-anchor' }),
      expect.objectContaining({ entry: 'run-lifecycle-project-awareness-anchor' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the colder stressed-recovery same-her claim to current cold audits instead of only broader timeout or one-shot prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: stressed recovery now keeps one same-her line across one-shot, timeout fallback, background recovery, and lifecycle finish, but future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('stressed recovery same-her bridge')
    expect(matrixSource).toContain('stressed-recovery-same-her-bridge-audit.test.ts')
    expect(matrixSource).toContain('one-shot-provider-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('timeout-fallback-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('background-recovery-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('run-lifecycle-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(auditSource).toContain('stressed recovery same-her bridge')
    expect(auditSource).toContain('stressed recovery same-her bridge now ties one-shot provider fallback, timeout fallback, background recovery, and lifecycle finish onto one same-her project-awareness line')
  })
})
