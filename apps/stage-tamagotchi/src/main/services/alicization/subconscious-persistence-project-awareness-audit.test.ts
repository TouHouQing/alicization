import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'subconscious-persistence-rich-project-state-carry',
    file: './runtime-subconscious-tick-project-awareness-regression.test.ts',
    snippets: [
      'keeps persisted subconscious project-state carry rich enough for later proactive and autonomy continuity paths',
      'expect(persistenceBlock).toContain(\'preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null\')',
      'expect(persistenceBlock).toContain(\'sameHerSelfLine: projectStateBrief.sameHerSelfLine\')',
    ],
  },
  {
    entry: 'presence-only-hold-host-confirmed-resume-boundary',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'keeps host-confirmed resume memory as a measured-return boundary instead of reusable execution permission',
      'surfaces remembered host-confirmed resume as a resident confirmation boundary before another execution-shaped opening',
      'host-confirmed-before-redispatch',
      'resume-before-dispatch',
    ],
  },
  {
    entry: 'presence-only-hold-canonical-project-awareness-backfill',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'backfills canonical phase-one project awareness when a presence-only same-line hold inherits a thin project-state shell',
      'sameHerHoldDetail: \'same-her hold: measured-return is still keeping this callback line lower-pressure before it widens again.\'',
      'expect(String(frame?.projectState?.nextClosureTarget ?? \'\')).toContain(\'Keep extending cross-modal same-her proof\')',
    ],
  },
  {
    entry: 'presence-only-hold-richer-awareness-precedence',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'preserves a fresher richer project-state awareness line when presence-only hold adds continuity timing to an already stronger same-her frame',
      'Keep richer project awareness continuous through subconscious persistence, pre-generation framing, and execution return without flattening into a status shell.',
      'expect(String(frame?.projectState?.preflightSummary ?? \'\')).toContain(\'same-her Phase 1 closure line\')',
    ],
  },
  {
    entry: 'deferred-fallback-thin-shell-recanonicalization',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'falls back to canonical project awareness and same-her carry when deferred fallback project state is only the thin closure shell',
      'turnId: \'subconscious:default:deferred-thin-shell\'',
      'expect(String(signal?.metadata?.projectStatePreDialogueAwarenessLine ?? \'\')).not.toContain(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'deferred-fallback-repair-first-carry',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'keeps repair-before-closeness explicit in deferred fallback summaries when project-state carry is the only repair-first authority',
      'projectStateEmotionalClosureCue: cue',
      'summary: expect.stringMatching(/repair-before-closeness|repair first|先修复/u)',
    ],
  },
  {
    entry: 'held-autonomy-fallback-repair-first-carry',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'keeps held-autonomy fallback summaries on repair-before-closeness when project-state carry is the only surviving repair-first authority',
      'label: \'proactive:follow-through:held-autonomy\'',
      'executionIntentSummary: \'re-open the unresolved runtime break and see what still blocks it\'',
    ],
  },
] as const

describe('subconscious persistence project awareness audit', () => {
  it('keeps one explicit route-level proof that subconscious persistence, presence-only hold, and deferred autonomy carry preserve same-her project awareness between visible turns', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'subconscious-persistence-rich-project-state-carry' }),
      expect.objectContaining({ entry: 'presence-only-hold-host-confirmed-resume-boundary' }),
      expect.objectContaining({ entry: 'presence-only-hold-canonical-project-awareness-backfill' }),
      expect.objectContaining({ entry: 'presence-only-hold-richer-awareness-precedence' }),
      expect.objectContaining({ entry: 'deferred-fallback-thin-shell-recanonicalization' }),
      expect.objectContaining({ entry: 'deferred-fallback-repair-first-carry' }),
      expect.objectContaining({ entry: 'held-autonomy-fallback-repair-first-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the subconscious persistence claim to current behavior tests instead of only broad later-turn prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current subconscious persistence and deferred carry now have dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const subconsciousSource = readFileSync(new URL('./runtime-subconscious-tick.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('subconscious-persistence-project-awareness-audit.test.ts')
    expect(subconsciousSource).toContain(
      'backfills canonical phase-one project awareness when a presence-only same-line hold inherits a thin project-state shell',
    )
    expect(subconsciousSource).toContain(
      'keeps held-autonomy fallback summaries on repair-before-closeness when project-state carry is the only surviving repair-first authority',
    )
  })
})
