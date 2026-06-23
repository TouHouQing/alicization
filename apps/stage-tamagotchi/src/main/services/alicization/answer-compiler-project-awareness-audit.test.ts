import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'answer-compiler-rich-pre-dialogue-awareness-carry',
    file: './answer-compiler.test.ts',
    snippets: [
      'prefers the canonical pre-dialogue awareness line from runtime digest over a weaker preflight shell when compiling supporting reality',
      'pre-dialogue project awareness:',
      'Alicization is a local-first digital life project',
      'Phase 1: Local Digital Life',
    ],
  },
  {
    entry: 'answer-compiler-structured-phase1-closure-triad-carry',
    file: './answer-compiler.test.ts',
    snippets: [
      'keeps a structured same-her phase-1 continuity carry in supporting reality when project-state audit already carries landed open and next closure together',
      'project identity: Alicization is a local-first digital life project',
      'current phase: Phase 1: Local Digital Life',
      'phase-one open loop:',
      'next closure target:',
    ],
  },
  {
    entry: 'answer-compiler-proactive-gap-pre-dialogue-carry',
    file: './answer-compiler.test.ts',
    snippets: [
      'keeps proactive same-her gap explicit in pre-dialogue project awareness when project-state audit still says proactive continuity is unfinished',
      'Visible proactive hold, subconscious carry, and next-session feedback still need one same-her follow-through line.',
      'pre-dialogue project awareness:',
    ],
  },
  {
    entry: 'answer-compiler-drift-risk-anti-shell-carry',
    file: './answer-compiler.test.ts',
    snippets: [
      'carries same-her drift-risk audit forward into pre-dialogue project awareness so later answers keep avoiding generic project shells',
      'turns same-her anti-shell drift risk into hard must-do and must-not-do answer constraints',
      'generic assistant shell',
      'project-summary voice',
    ],
  },
  {
    entry: 'answer-compiler-callback-same-her-closure-carry',
    file: './answer-compiler.test.ts',
    snippets: [
      'keeps recalled same-her project-closure callback memory ahead of a generic callback shell in compiled answer framing',
      'keeps same-her callback continuity in compiled framing when only the conscious frame still carries the living line',
      'Before answering, remember this callback still belongs to one same digital life',
    ],
  },
  {
    entry: 'answer-compiler-thin-chinese-same-her-reminder-rejected',
    file: './answer-compiler.test.ts',
    snippets: [
      'does not let a thin Chinese same-her reminder shell survive into supporting reality when same-her closure carry is already explicit',
      'preDialogueAwarenessLine: \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'expect(projectAwarenessLine).not.toContain(\'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\')',
    ],
  },
] as const

describe('answer compiler project awareness audit', () => {
  it('keeps one explicit route-level proof that answer-compiler preserves richer same-her project awareness before downstream reply wording lands', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'answer-compiler-rich-pre-dialogue-awareness-carry' }),
      expect.objectContaining({ entry: 'answer-compiler-structured-phase1-closure-triad-carry' }),
      expect.objectContaining({ entry: 'answer-compiler-proactive-gap-pre-dialogue-carry' }),
      expect.objectContaining({ entry: 'answer-compiler-drift-risk-anti-shell-carry' }),
      expect.objectContaining({ entry: 'answer-compiler-callback-same-her-closure-carry' }),
      expect.objectContaining({ entry: 'answer-compiler-thin-chinese-same-her-reminder-rejected' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the answer-compiler same-her project-awareness claim to current behavior tests instead of broader downstream-reply prose alone', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: answer-compiler now has dedicated same-her project-awareness proof while long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('answer-compiler-project-awareness-audit.test.ts')
    expect(auditSource).toContain('answer-compiler-project-awareness-audit.test.ts')
    expect(coverageSource).toContain('answer-compiler-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(auditSource).toMatch(/still not fully closed|still not full Phase 1 closure|still .*fully sustained noisy-desktop convergence/i)
  })
})
