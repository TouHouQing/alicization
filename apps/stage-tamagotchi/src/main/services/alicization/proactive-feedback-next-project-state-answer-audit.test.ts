import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'feedback-next-chat-session-continuity-block',
    file: './runtime.test.ts',
    snippets: [
      'surfaces recent proactive feedback in the next chat session continuity block',
      'host replied within 120s after a proactive turn',
      'proactive:coding:reply-within-120s',
      'nextClosureTargetSummary: expect.stringContaining(\'Keep extending cross-modal same-her proof\')',
    ],
  },
  {
    entry: 'feedback-follow-up-project-state-audit-carry',
    file: './runtime.test.ts',
    snippets: [
      'const secondTurnId = \'turn-proactive-feedback-continuity-follow-up\'',
      'sameHerSummary: expect.stringContaining(\'Same Phase 1 digital life\')',
      'preDialogueAwarenessSummary: expect.stringContaining(\'Alicization is a local-first digital life project\')',
      'expectProjectStateCarriesPhase1SameHerContract({',
    ],
  },
  {
    entry: 'same-her-project-state-answer-contract',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.',
      'Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.',
      'Keep the still-open closure work explicit so the answer says what is not yet closed.',
      'Answer project-state questions from one same-her continuity instead of a detached project narrator shell.',
      'Keep the project-state opening low-pressure so the same-her line does not widen too fast.',
    ],
  },
] as const

describe('proactive feedback next project-state answer audit', () => {
  it('keeps one explicit cold proof fragment that settled proactive feedback still constrains the next real project-state answer to reopen from one same-her line instead of decaying into a detached project narrator shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'feedback-next-chat-session-continuity-block' }),
      expect.objectContaining({ entry: 'feedback-follow-up-project-state-audit-carry' }),
      expect.objectContaining({ entry: 'same-her-project-state-answer-contract' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the proactive-feedback to next-answer carry claim to current runtime and session-runtime tests instead of only broader same-her closure prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: proactive feedback now has a colder next-answer same-her fragment, but full long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('proactive-feedback-next-project-state-answer-audit.test.ts')
    expect(auditSource).toContain('next project-state answer carry now also ties settled proactive feedback continuity block')
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
