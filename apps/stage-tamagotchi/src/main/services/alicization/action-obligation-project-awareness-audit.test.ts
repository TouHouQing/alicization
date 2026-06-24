import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'action-obligation-direct-project-status-answer',
    file: './main-chat-action-obligation.test.ts',
    snippets: [
      'prefers same-her conscious-frame answer stance over a thinner dialogue summary on direct project-status turns',
      'Keep the answer on one same-her digital-life line.',
      'expect(result.summary).toContain(\'same-her digital-life line\')',
      'expect(result.summary).not.toBe(\'Give a simple project update.\')',
    ],
  },
  {
    entry: 'action-obligation-continue-thread-project-carry',
    file: './main-chat-action-obligation.test.ts',
    snippets: [
      'keeps richer phase-1 same-her project continuity in continue-task summaries when the host asks to continue the same thread',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'Initiative and embodiment still need stronger same-life closure across longer callback turns.',
      'expect(result.reasonCodes).toContain(\'continuation-cue\')',
    ],
  },
  {
    entry: 'action-obligation-thin-shell-repair',
    file: './main-chat-action-obligation.test.ts',
    snippets: [
      'does not let a thin runtime project shell outrank richer canonical same-her closure in continue-task summaries',
      'Project continuity still needs closure.',
      'Carry project continuity forward.',
      'expect(result.summary).not.toContain(\'Project continuity still needs closure.\')',
    ],
  },
] as const

describe('action obligation project awareness audit', () => {
  it('keeps one explicit route-level proof that action obligation resolution preserves same-her project awareness for direct project-status answers and same-thread continuation turns instead of collapsing into a generic project shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'action-obligation-direct-project-status-answer' }),
      expect.objectContaining({ entry: 'action-obligation-continue-thread-project-carry' }),
      expect.objectContaining({ entry: 'action-obligation-thin-shell-repair' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the action-obligation claim to current behavior tests instead of only broader project awareness prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: action-obligation resolution now has dedicated same-her route proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const obligationSource = readFileSync(new URL('./main-chat-action-obligation.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('action-obligation-project-awareness-audit.test.ts')
    expect(obligationSource).toContain(
      'prefers same-her conscious-frame answer stance over a thinner dialogue summary on direct project-status turns',
    )
    expect(obligationSource).toContain(
      'keeps richer phase-1 same-her project continuity in continue-task summaries when the host asks to continue the same thread',
    )
    expect(obligationSource).toContain(
      'does not let a thin runtime project shell outrank richer canonical same-her closure in continue-task summaries',
    )
  })
})
