import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'lifecycle-timeout-recovery-finish-metadata',
    file: './main-chat-run-lifecycle.test.ts',
    snippets: [
      'preserves recovered visible reply execution metadata when finishing timeout recovery',
      'actualVisibleReplyAuthority: \'llm-second-pass-rewrite\'',
      'reason: \'semantic-judge:project-state-answer-gap\'',
    ],
  },
  {
    entry: 'lifecycle-timeout-recovery-canonical-backfill',
    file: './main-chat-run-lifecycle.test.ts',
    snippets: [
      'backfills canonical same-her project state when timeout recovery still returns plain text',
      'finishReason: \'timeout-recovered\'',
      'expect(recoveredStructured.projectState).toEqual(expect.objectContaining({',
    ],
  },
  {
    entry: 'lifecycle-thin-shell-recanonicalization',
    file: './main-chat-run-lifecycle.test.ts',
    snippets: [
      're-normalizes a thin structured timeout recovery shell into canonical awareness truth at the lifecycle finish seam',
      'same digital life | keep the desktop closure line explicit',
      'expect(emittedRecoveredStructured.projectState?.preDialogueAwarenessLine).toBe(canonicalProjectState.sameHerSelfLine)',
    ],
  },
  {
    entry: 'lifecycle-richer-same-her-audit-preserved',
    file: './main-chat-run-lifecycle.test.ts',
    snippets: [
      'preserves a richer same-her audit line when lifecycle recovery rewrites a thin project shell',
      'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.',
      'expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.continuitySummary).toContain(`same-her=${richerSameHerSummary}`)',
    ],
  },
  {
    entry: 'lifecycle-timeout-fallback-project-audit-bridge',
    file: './main-chat-run-lifecycle.test.ts',
    snippets: [
      'bridges timeout-fallback top-level project-state audit into visible-reply realization during lifecycle recovery',
      'One same her must stay explicit from pre-dialogue awareness into the fallback-visible answer boundary.',
      'expect(emittedRecoveredStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({',
      'expect(finishedStructured.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({',
    ],
  },
  {
    entry: 'lifecycle-timeout-fallback-embodiment-audit-preserved',
    file: './main-chat-run-lifecycle.test.ts',
    snippets: [
      'keeps timeout-fallback richer embodiment continuity audit on finish-visible reply realization even when lifecycle recovery rewrites a thin shell',
      'visible continuity still present but no longer fully cross-modal',
      'expect(finishedPayload.visibleReplyRealization?.projectStateAudit).toEqual(expect.objectContaining({',
      'continuitySummary: expect.stringContaining(\'body=\')',
    ],
  },
  {
    entry: 'lifecycle-broader-phase-awareness-over-narrower-body-line',
    file: './main-chat-run-lifecycle.test.ts',
    snippets: [
      'keeps a fuller project-and-phase awareness line when lifecycle recovery sees a narrower embodiment same-her summary nearby',
      'Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
      'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      'expect(finishedStructured.visibleReplyRealization?.projectStateAudit?.sameHerSummary).toBe(narrowerEmbodimentSummary)',
    ],
  },
] as const

describe('run lifecycle project awareness audit', () => {
  it('keeps one explicit route-level proof that lifecycle timeout recovery finish and emit seams preserve same-her project awareness instead of closing on a detached shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'lifecycle-timeout-recovery-finish-metadata' }),
      expect.objectContaining({ entry: 'lifecycle-timeout-recovery-canonical-backfill' }),
      expect.objectContaining({ entry: 'lifecycle-thin-shell-recanonicalization' }),
      expect.objectContaining({ entry: 'lifecycle-richer-same-her-audit-preserved' }),
      expect.objectContaining({ entry: 'lifecycle-timeout-fallback-project-audit-bridge' }),
      expect.objectContaining({ entry: 'lifecycle-timeout-fallback-embodiment-audit-preserved' }),
      expect.objectContaining({ entry: 'lifecycle-broader-phase-awareness-over-narrower-body-line' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the lifecycle recovery claim to current behavior tests instead of only broader host-visible or recovery prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current lifecycle recovery finish seams now have dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const lifecycleSource = readFileSync(new URL('./main-chat-run-lifecycle.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('run-lifecycle-project-awareness-audit.test.ts')
    expect(lifecycleSource).toContain(
      're-normalizes a thin structured timeout recovery shell into canonical awareness truth at the lifecycle finish seam',
    )
    expect(lifecycleSource).toContain(
      'keeps a fuller project-and-phase awareness line when lifecycle recovery sees a narrower embodiment same-her summary nearby',
    )
  })
})
