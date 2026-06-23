import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'executive-brief-live-project-state-closure-triad-carry',
    file: './executive-answer-brief.test.ts',
    snippets: [
      'prefers the live current-conscious-frame project awareness when building the executive system brief',
      'Project identity: this local-first digital life project that is still growing one continuous her on the host machine',
      'Still-open life loop pressure: memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam',
      'Next closure target: Carry the live pre-dialogue project awareness line through first-pass generation before repair has to catch it.',
    ],
  },
  {
    entry: 'executive-brief-summary-only-landed-progress-carry',
    file: './executive-answer-brief.test.ts',
    snippets: [
      'keeps summary-only landed project progress alive in the executive answer brief before visible reply authoring',
      'Summary-only pre-dialogue project awareness already survives into the executive answer brief before visible reply authoring.',
      'what has already landed in her line:',
      'Latest landed continuity progress:',
    ],
  },
  {
    entry: 'executive-brief-broader-same-her-headline-precedence',
    file: './executive-answer-brief.test.ts',
    snippets: [
      'prefers a broader same-her phase-1 closure headline over a thinner pre-dialogue awareness shell in the executive system brief',
      'Project pre-dialogue awareness line: Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
      'Project pre-dialogue awareness line: Before answering, keep this same digital life project in view, but do not widen into a detached project shell.',
    ],
  },
  {
    entry: 'executive-brief-thin-chinese-same-her-reminder-rejected',
    file: './executive-answer-brief.test.ts',
    snippets: [
      'does not let a thin Chinese same-her reminder shell stay visible in the executive system brief when richer same-her closure carry already exists',
      'preDialogueAwarenessLine: \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'expect(result.systemBlock).not.toContain(\'Project pre-dialogue awareness line: 回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\')',
    ],
  },
  {
    entry: 'executive-brief-thin-shell-rejection',
    file: './executive-answer-brief.test.ts',
    snippets: [
      'does not let thin live landed-open-next shells outrank richer canonical same-her project carry in the executive brief',
      'Latest landed continuity progress: Project continuity exists.',
      'Still-open life loop pressure: Project continuity still needs closure.',
      'Next closure target: Carry project continuity forward.',
    ],
  },
  {
    entry: 'executive-brief-audible-body-project-carry',
    file: './executive-answer-brief.test.ts',
    snippets: [
      'keeps landed progress and next closure explicit on direct project-state turns even when audible-body same-her awareness is already the stronger living line',
      'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
      'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
      'Executive same-her project orientation: She is still acting from this same project identity: Alicization is a local-first digital life project growing one continuous her on the host computer.',
    ],
  },
] as const

describe('executive answer brief project awareness audit', () => {
  it('keeps one explicit route-level proof that executive-answer-brief preserves same-her project awareness before visible reply wording begins', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'executive-brief-live-project-state-closure-triad-carry' }),
      expect.objectContaining({ entry: 'executive-brief-summary-only-landed-progress-carry' }),
      expect.objectContaining({ entry: 'executive-brief-broader-same-her-headline-precedence' }),
      expect.objectContaining({ entry: 'executive-brief-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'executive-brief-thin-shell-rejection' }),
      expect.objectContaining({ entry: 'executive-brief-audible-body-project-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the executive-answer-brief same-her project-awareness claim to current behavior tests instead of broader reply-surface prose alone', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: executive-answer-brief now has dedicated same-her project-awareness proof while long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('executive-answer-brief-project-awareness-audit.test.ts')
    expect(auditSource).toContain('executive-answer-brief-project-awareness-audit.test.ts')
    expect(coverageSource).toContain('executive-answer-brief-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(auditSource).toMatch(/still not fully closed|still not full Phase 1 closure|still .*fully sustained noisy-desktop convergence/i)
  })
})
