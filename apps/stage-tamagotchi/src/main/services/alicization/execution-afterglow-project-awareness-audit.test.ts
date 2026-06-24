import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'open-loop-preflight-closure-patience',
    file: './execution-interaction-learning.test.ts',
    snippets: [
      'keeps execution-result delivery more closure-patient when project preflight still says the Phase 1 life loop is open',
      'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory, initiative, and embodiment still need stronger same-her closure. | next=Keep extending cross-modal same-her proof across longer real-desktop runs.',
      'expect(policy.reasonTags).toContain(\'project-open-closure\')',
    ],
  },
  {
    entry: 'thin-summary-structured-project-state-restraint',
    file: './execution-interaction-learning.test.ts',
    snippets: [
      'treats structured project-state landed and open closure fields as same-her execution-result restraint even when preflight summary is thin',
      'nextClosureTarget: \'Keep execute -> feedback -> remember on one same-her Phase 1 line and preserve project identity through the next visible answer beat.\'',
      'inwardLine: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\'',
    ],
  },
  {
    entry: 'remembered-project-closure-quieter-callback-line',
    file: './execution-interaction-learning.test.ts',
    snippets: [
      'lets remembered project-closure execution learning keep result delivery on a same-her quieter line even without fresher preflight text',
      'For the desktop callback continuity return, keep the callback on one same-her Phase 1 line and do not let the return reopen from scratch while the still-open closure remains active.',
      'expect(policy.reasonTags).toContain(\'memory-project-closure\')',
    ],
  },
  {
    entry: 'live-drift-risk-and-afterglow-hold',
    file: './execution-interaction-learning.test.ts',
    snippets: [
      'treats live project-state drift risk as same-her execution-result restraint even before that warning has been remembered into long-horizon memory',
      'prefers richer canonical runtime projection over thinner derived carry when learning execution callback afterglow posture',
      'expect(policy.reasonTags).toContain(\'project-same-her-drift-risk-pressure\')',
      'expect(policy.reasonTags).toContain(\'callback-afterglow-hold\')',
    ],
  },
] as const

describe('execution afterglow project awareness audit', () => {
  it('keeps one explicit route-level proof that execution-result afterglow learning preserves the same-her project line while callback restraint is still active', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'open-loop-preflight-closure-patience' }),
      expect.objectContaining({ entry: 'thin-summary-structured-project-state-restraint' }),
      expect.objectContaining({ entry: 'remembered-project-closure-quieter-callback-line' }),
      expect.objectContaining({ entry: 'live-drift-risk-and-afterglow-hold' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-afterglow project-awareness claim to current behavior tests instead of only broader execution prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: execution-result afterglow learning now has route-level project-awareness proof, while future execution families still need explicit registration', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const learningSource = readFileSync(new URL('./execution-interaction-learning.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Execution callback generation and execution-first inline replies')
    expect(matrixSource).toContain('execution-afterglow-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(learningSource).toContain(
      'lets remembered project-closure execution learning keep result delivery on a same-her quieter line even without fresher preflight text',
    )
    expect(learningSource).toContain(
      'prefers richer canonical runtime projection over thinner derived carry when learning execution callback afterglow posture',
    )
  })
})
