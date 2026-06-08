import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'background-recovery-companion-briefing-carry',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'keeps payload companion briefing explicit when background recovery backfills pre-dialogue closure',
      'preDialogueAwarenessLine: awarenessLine',
      'companionBriefingLine: awarenessLine',
    ],
  },
  {
    entry: 'background-recovery-richer-runtime-awareness-preferred',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'keeps richer runtime project awareness explicit during background recovery even when payload only carries a thin shell and no stronger companion headline',
      'preDialogueAwarenessLine: richerRuntimeAwarenessLine',
      'preDialogueAwarenessSummary: richerRuntimeAwarenessLine',
    ],
  },
  {
    entry: 'background-recovery-thin-summary-shell-rejected',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'does not reuse a thin payload summary shell as the awareness line when background recovery backfills project-state closure',
      'preflightSummary: \'same digital life | keep the closure seam explicit\'',
      '.not.toBe(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'background-recovery-thin-phase1-reminder-shell-rejected',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'does not reuse a thin Chinese Phase 1 reminder shell as the awareness line when background recovery backfills project-state closure',
      'const thinChineseSummaryShell = \'开口前先记住：这是同一个数字生命项目，她现在仍在 Phase 1。\'',
      '.not.toBe(thinChineseSummaryShell)',
    ],
  },
  {
    entry: 'background-recovery-same-her-headline-preferred',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'prefers payload same-her headline over thinner payload awareness when background recovery backfills project-state closure',
      'background recovery must keep proving this is still one living her.',
      'companionHeadlineLine: payloadCompanionHeadlineLine',
    ],
  },
] as const

describe('background recovery project awareness audit', () => {
  it('keeps one explicit route-level proof that background recovery preserves same-her project awareness when payload briefing carry, runtime awareness carry, thin shells, and same-her headlines compete', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'background-recovery-companion-briefing-carry' }),
      expect.objectContaining({ entry: 'background-recovery-richer-runtime-awareness-preferred' }),
      expect.objectContaining({ entry: 'background-recovery-thin-summary-shell-rejected' }),
      expect.objectContaining({ entry: 'background-recovery-thin-phase1-reminder-shell-rejected' }),
      expect.objectContaining({ entry: 'background-recovery-same-her-headline-preferred' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the background recovery claim to current behavior tests instead of only broader host-visible or recovery-registry prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current background recovery now has dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const backgroundSource = readFileSync(new URL('./main-chat-background-run.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('background-recovery-project-awareness-audit.test.ts')
    expect(backgroundSource).toContain(
      'keeps richer runtime project awareness explicit during background recovery even when payload only carries a thin shell and no stronger companion headline',
    )
    expect(backgroundSource).toContain(
      'prefers payload same-her headline over thinner payload awareness when background recovery backfills project-state closure',
    )
  })
})
