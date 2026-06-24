import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'thin-project-status-shell-rebuild',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'Answer what Alicization is before drifting into tone, metaphor, or adjacent status commentary.',
      'Make the latest landed Phase 1 progress explicit instead of replying with only aspiration or direction.',
      'Keep the still-open closure work explicit so the answer says what is not yet closed.',
      'Answer project-state questions from one same-her continuity instead of a detached project narrator shell.',
    ],
  },
  {
    entry: 'follow-through-turn-same-line-carry',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'keeps same-her Phase 1 project continuity alive for follow-through turns that only ask to stay on the same digital-life line',
      'turn-project-follow-through-same-line',
      'same digital-life follow-through line',
      'Keep the project-state opening low-pressure so the same-her line does not widen too fast.',
    ],
  },
  {
    entry: 'callback-follow-through-closure-carry',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'Callback follow-through already survives on the same local digital life thread before the next visible answer beat.',
      'Execution callback carry, initiative timing, and embodied follow-through still need to close on the same living line.',
      'Keep the callback result, landed progress, and still-open closure explicit on one same-her line before local fluency widens.',
      'If the callback return gets flattened into a detached project-status summary, treat that as unfinished same-her callback drift.',
    ],
  },
  {
    entry: 'host-visible-closure-still-open',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'same-her continuity remains alive, but lane=face+motion-only under the current renderer authority.',
      'embodimentClosureSummary: \'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.\'',
      'nextClosureTargetSummary: expect.stringMatching(/cross-modal same-her proof|visible reply|voice|face|motion|resident presence/i)',
    ],
  },
] as const

describe('session-runtime same-her follow-through audit', () => {
  it('keeps one explicit long-turn desktop proof that project identity, landed progress, and still-open closure stay on one same-her line through rebuild, follow-through, callback carry, and host-visible recovery', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'thin-project-status-shell-rebuild' }),
      expect.objectContaining({ entry: 'follow-through-turn-same-line-carry' }),
      expect.objectContaining({ entry: 'callback-follow-through-closure-carry' }),
      expect.objectContaining({ entry: 'host-visible-closure-still-open' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the long-turn follow-through claim to real current tests instead of only broad matrix wording', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: session-runtime and host-visible recovery now prove richer follow-through on one same-her line, but full noisy-desktop and cross-modal closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('Cross-modal embodiment-facing proof is still weaker than the core text/runtime proof under long-run noisy use, but it is now materially stronger than the original sparse route set.')
    expect(auditSource).toContain('the remaining higher-value proof gap is no longer ordinary chat/project-status carry, but whether body/voice/face/motion surfaces keep the same project identity, landed progress, and still-open closure framing as one lifeform under noisier return conditions')
  })
})
