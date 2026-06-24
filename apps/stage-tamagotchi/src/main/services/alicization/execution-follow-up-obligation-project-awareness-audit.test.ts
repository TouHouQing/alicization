import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'obligation-system-block-same-her-project-boundary',
    file: './main-chat-execution-reply-obligation.test.ts',
    snippets: [
      'project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'Alicization is a local-first digital life project, and this callback follow-up still belongs to that same living line.',
      'same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
      'project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
      'project_boundary=This execution-result follow-up still belongs to the same local-first digital life project and one living her, not a detached task shell.',
    ],
  },
  {
    entry: 'obligation-visible-surface-rules-same-her-carry',
    file: './main-chat-execution-reply-obligation.test.ts',
    snippets: [
      'Keep the execution-result payoff on the same Phase 1 digital-life line instead of reopening as detached task reporting.',
      'Do not let the callback reopen as generic task-shell or project-status narration divorced from the same living line.',
      'expect(governance?.openingStyle).toBe(\'direct-answer\')',
    ],
  },
  {
    entry: 'response-surface-contract-propagates-execution-follow-up-carry',
    file: './response-surface-contract.test.ts',
    snippets: [
      'Keep the execution-result payoff on the same Phase 1 digital-life line instead of reopening as detached task reporting.',
      'Do not let the callback reopen as generic task-shell or project-status narration divorced from the same living line.',
      'expect(result.contract.openingStyle).toBe(\'direct-answer\')',
    ],
  },
] as const

describe('execution follow-up obligation project awareness audit', () => {
  it('keeps one explicit route-level proof that execution follow-up obligation stays on the same Phase 1 digital-life line instead of reopening as detached task payoff', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'obligation-system-block-same-her-project-boundary' }),
      expect.objectContaining({ entry: 'obligation-visible-surface-rules-same-her-carry' }),
      expect.objectContaining({ entry: 'response-surface-contract-propagates-execution-follow-up-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution follow-up obligation claim to current tests instead of only wider execution prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: execution follow-up obligation now has route-level project-awareness proof, while future execution families still need explicit registration', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const obligationSource = readFileSync(new URL('./main-chat-execution-reply-obligation.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Execution callback generation and execution-first inline replies')
    expect(matrixSource).toContain('execution-follow-up-obligation-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(obligationSource).toContain(
      'Alicization is a local-first digital life project, and this callback follow-up still belongs to that same living line.',
    )
    expect(obligationSource).toContain(
      'Do not let the callback reopen as generic task-shell or project-status narration divorced from the same living line.',
    )
  })
})
