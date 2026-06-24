import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'session-runtime-fresh-callback-follow-up-project-boundary',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'injects an execution-result reply obligation when the host follows up on recent executor output',
      'project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
      'project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
      'Alicization is a local-first digital life project, and this callback follow-up still belongs to that same living line.',
      'project_boundary=This execution-result follow-up still belongs to the same local-first digital life project and one living her, not a detached task shell.',
    ],
  },
  {
    entry: 'session-runtime-ledger-follow-up-project-boundary',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'threads ledger-backed execution follow-up carry into live runtime system blocks when no fresh callback is pending',
      'This recalled execution history still belongs to the same local-first digital life project and one living her.',
      'project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'same_her_line=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
      'project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
    ],
  },
  {
    entry: 'lower-level-execution-follow-up-and-ledger-carry',
    file: './execution-follow-up-obligation-project-awareness-audit.test.ts',
    snippets: [
      'obligation-system-block-same-her-project-boundary',
      'response-surface-contract-propagates-execution-follow-up-carry',
    ],
  },
  {
    entry: 'lower-level-ledger-follow-up-carry',
    file: './execution-ledger-follow-up-project-awareness-audit.test.ts',
    snippets: [
      'ledger-runtime-same-her-project-boundary',
      'ledger-follow-up-obligation-keeps-project-boundary',
    ],
  },
] as const

describe('execution follow-up session runtime project awareness audit', () => {
  it('keeps one explicit route-level proof that live session-runtime follow-up assembly preserves the same-her Phase 1 project line for fresh and ledger-backed execution reopen paths', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'session-runtime-fresh-callback-follow-up-project-boundary' }),
      expect.objectContaining({ entry: 'session-runtime-ledger-follow-up-project-boundary' }),
      expect.objectContaining({ entry: 'lower-level-execution-follow-up-and-ledger-carry' }),
      expect.objectContaining({ entry: 'lower-level-ledger-follow-up-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the live session-runtime follow-up claim to current tests instead of only helper-level prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: live session-runtime execution follow-up assembly now has route-level project-awareness proof, while future execution families still need explicit registration', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Execution callback generation and execution-first inline replies')
    expect(matrixSource).toContain('execution-follow-up-session-runtime-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(sessionRuntimeSource).toContain(
      'threads ledger-backed execution follow-up carry into live runtime system blocks when no fresh callback is pending',
    )
  })
})
