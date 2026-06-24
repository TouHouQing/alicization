import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'runtime-turn-persistence-continuity',
    file: './runtime-turn-persistence-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that guarded turn persistence preserves same-her project awareness across runtime authority callback delivery and deferred proactive carry',
      'expect.objectContaining({ entry: \'runtime-persisted-turn-awareness-preference\' })',
      'expect.objectContaining({ entry: \'deferred-proactive-repair-first-persistence-carry\' })',
    ],
  },
  {
    entry: 'governance-canonical-normalization-authority',
    file: './runtime-governance.test.ts',
    snippets: [
      'adds project-state-carry to normalized payload spine authority when same-her project state is still explicit on a later same-thread return',
      'normalized.structured.digitalLifeSpine?.memory?.personStateProjection?.selfContinuityAuthority?.sourceTags ?? []',
      'toContain(\'project-state-carry\')',
    ],
  },
  {
    entry: 'stream-runner-thin-shell-renormalization',
    file: './main-chat-stream-runner.test.ts',
    snippets: [
      're-normalizes thin pre-dialogue project awareness at the stream runner boundary so direct callers cannot collapse host-visible audit back into a generic summary shell',
      'toContain(\'Alicization is a local-first digital life project\')',
      'toContain(\'Phase 1: Local Digital Life\')',
      'not.toBe(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'background-run-missing-awareness-backfill',
    file: './main-chat-background-run.test.ts',
    snippets: [
      're-normalizes missing pre-dialogue project awareness at the background execution boundary so direct callers cannot skip the same-her project brief',
      'expect(completionTrace?.preDialogueAwarenessDebug).toEqual(expectedAwarenessDebug)',
      'preDialogueAwarenessSummary: expect.stringContaining(\'local-first digital life project\')',
    ],
  },
  {
    entry: 'background-run-thin-shell-renormalization',
    file: './main-chat-background-run.test.ts',
    snippets: [
      're-normalizes thin pre-dialogue summary shells on the active-dialogue fast path instead of carrying them as awareness truth',
      'preDialogueAwarenessSummary: expectedAwarenessLine',
      'not.toBe(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'runtime-persisted-turn-awareness-preference',
    file: './runtime.test.ts',
    snippets: [
      'prefers a richer same-her project awareness line over a thin persisted reminder shell when normalizing persisted project state for a conversation turn',
      'Before answering, stay on the same living line: this Phase 1 digital life still needs initiative and embodiment closure without splitting her continuity.',
      'normalized?.visibleReplyRealization',
    ],
  },
  {
    entry: 'subconscious-presence-only-backfill',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'backfills canonical phase-one project awareness when a presence-only same-line hold inherits a thin project-state shell',
      'expect(String(frame?.projectState?.preDialogueAwarenessLine ?? \'\')).toContain(\'Alicization is a local-first digital life project\')',
      'expect(String(frame?.projectState?.preDialogueAwarenessLine ?? \'\')).toContain(\'Phase 1: Local Digital Life\')',
      'expect(String(frame?.projectState?.nextClosureTarget ?? \'\')).toContain(\'Keep extending cross-modal same-her proof\')',
    ],
  },
] as const

describe('runtime dialogue normalization project awareness audit', () => {
  it('keeps one explicit route-level proof that host-visible dialogue normalization preserves same-her project awareness across authority, stream, background, persistence, and subconscious seams', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'runtime-turn-persistence-continuity' }),
      expect.objectContaining({ entry: 'governance-canonical-normalization-authority' }),
      expect.objectContaining({ entry: 'stream-runner-thin-shell-renormalization' }),
      expect.objectContaining({ entry: 'background-run-missing-awareness-backfill' }),
      expect.objectContaining({ entry: 'background-run-thin-shell-renormalization' }),
      expect.objectContaining({ entry: 'runtime-persisted-turn-awareness-preference' }),
      expect.objectContaining({ entry: 'subconscious-presence-only-backfill' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the host-visible dialogue normalization claim to current behavior tests instead of only normalization registration or authority mapping', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current host-visible dialogue normalization routes now have dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const streamRunnerSource = readFileSync(new URL('./main-chat-stream-runner.test.ts', import.meta.url), 'utf8')
    const backgroundRunSource = readFileSync(new URL('./main-chat-background-run.test.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('runtime-dialogue-normalization-project-awareness-audit.test.ts')
    expect(streamRunnerSource).toContain(
      're-normalizes thin pre-dialogue project awareness at the stream runner boundary so direct callers cannot collapse host-visible audit back into a generic summary shell',
    )
    expect(backgroundRunSource).toContain(
      're-normalizes missing pre-dialogue project awareness at the background execution boundary so direct callers cannot skip the same-her project brief',
    )
    expect(runtimeSource).toContain(
      'prefers a richer same-her project awareness line over a thin persisted reminder shell when normalizing persisted project state for a conversation turn',
    )
  })
})
