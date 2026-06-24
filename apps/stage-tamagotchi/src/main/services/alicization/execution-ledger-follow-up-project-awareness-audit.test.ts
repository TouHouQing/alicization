import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'ledger-runtime-same-her-project-boundary',
    file: './memory-ledger-runtime.test.ts',
    snippets: [
      'execution_project_identity:Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'execution_project_phase:Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'execution_same_her_line:Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'execution_same_her_hold:same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
      'execution_project_continuity:same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
      'execution_project_boundary:This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
      'project_identity=Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      'project_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
      'same_her_hold=same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
      'project_continuity=same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
      'project_boundary=This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
    ],
  },
  {
    entry: 'ledger-follow-up-obligation-keeps-project-boundary',
    file: './main-chat-execution-reply-obligation.test.ts',
    snippets: [
      'falls back to ledger-backed follow-up obligation when no fresh callback is pending',
      'Alicization is a local-first digital life project, and this callback follow-up still belongs to that same living line.',
      'project_boundary=This execution-result follow-up still belongs to the same local-first digital life project and one living her, not a detached task shell.',
    ],
  },
] as const

describe('execution ledger follow-up project awareness audit', () => {
  it('keeps one explicit route-level proof that recalled execution history and ledger-backed follow-up obligation stay on the same Phase 1 digital-life line', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'ledger-runtime-same-her-project-boundary' }),
      expect.objectContaining({ entry: 'ledger-follow-up-obligation-keeps-project-boundary' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-ledger follow-up claim to current tests instead of only broader execution prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: ledger-backed execution follow-up now has route-level project-awareness proof, while future execution families still need explicit registration', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const ledgerSource = readFileSync(new URL('./memory-ledger-runtime.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Execution callback generation and execution-first inline replies')
    expect(matrixSource).toContain('execution-ledger-follow-up-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(ledgerSource).toContain(
      'execution_project_identity:Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
    )
    expect(ledgerSource).toContain(
      'execution_project_phase:Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
    )
    expect(ledgerSource).toContain(
      'execution_same_her_hold:same-her hold: keep this project-state answer on the same living line before widening outward, because some closure already landed and the unfinished closure still belongs to one continuous "her".',
    )
    expect(ledgerSource).toContain(
      'execution_project_continuity:same living line: some closure already landed, so project-state carry should keep continuing as the same Phase 1 digital life before widening outward.',
    )
    expect(ledgerSource).toContain(
      'execution_project_boundary:This recalled execution history still belongs to the same local-first digital life project and one living her, not a detached task shell.',
    )
  })
})
