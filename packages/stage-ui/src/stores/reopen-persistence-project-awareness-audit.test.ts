import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'restored-session-project-awareness-backfill',
    file: './chat/session-store.test.ts',
    snippets: [
      'backfills pre-dialogue awareness from persisted rich project-state carry when restored assistant payloads do not already include it',
      'Before answering, remember: Alicization is a local-first digital life project',
      'Keep extending cross-modal same-her proof so anthropomorphic emotional closure, dialogue, and embodiment stay on one living line.',
    ],
  },
  {
    entry: 'restored-session-drift-boundary-preservation',
    file: './chat/session-store.test.ts',
    snippets: [
      'preserves persisted same-her drift risk when loading assistant structured payloads that already carry the boundary explicitly',
      'If this restored turn starts sounding like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
    ],
  },
  {
    entry: 'restored-session-thin-awareness-upgrade',
    file: './chat/session-store.test.ts',
    snippets: [
      'upgrades thin persisted pre-dialogue awareness from richer project-state carry when restored assistant payload already includes only a generic reminder shell',
      'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
      'same-her=Same Phase 1 digital life. Persisted replay should keep the same living line rather than reopen from a generic shell.',
    ],
  },
  {
    entry: 'imported-session-thin-awareness-upgrade',
    file: './chat/session-store.test.ts',
    snippets: [
      'upgrades thin imported pre-dialogue awareness from richer project-state carry instead of preserving a generic reminder shell',
      'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
      'same-her=Same Phase 1 digital life. Imported replay should keep the same living line rather than reopen from a generic shell.',
    ],
  },
  {
    entry: 'forked-session-thin-awareness-upgrade',
    file: './chat/session-store.test.ts',
    snippets: [
      'upgrades thin forked pre-dialogue awareness from richer project-state carry instead of preserving a generic reminder shell',
      'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
      'same-her=Same Phase 1 digital life. Forked replay should keep the same living line rather than reopen from a generic shell.',
    ],
  },
  {
    entry: 'restored-session-inward-low-pressure-same-her-carry',
    file: './chat/session-store.test.ts',
    snippets: [
      'keeps same-her inward low-pressure closure visible when restored awareness only carries the thinner same-phase briefing plus stronger embodiment headline',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
    ],
  },
  {
    entry: 'session-fallback-richer-host-visible-awareness',
    file: './chat.test.ts',
    snippets: [
      'prefers richer host-visible project-state audit and same-her spine continuity when session fallback rebuilds pre-dialogue awareness without inspector state',
      'Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay.',
      'Fallback project awareness still needs to preserve the stronger host-visible project brief before compose starts.',
    ],
  },
  {
    entry: 'session-fallback-inward-low-pressure-same-her-carry',
    file: './chat.test.ts',
    snippets: [
      'keeps same-her inward low-pressure closure visible in before-compose and persisted pre-dialogue awareness when session fallback rebuilds turn identity without inspector state',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
    ],
  },
  {
    entry: 'browser-local-replay-richer-host-visible-awareness',
    file: './alicization-browser-bridge.test.ts',
    snippets: [
      'prefers richer host-visible project-state audit and same-her spine continuity when browser continuity snapshots rebuild from stored turns',
      'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
      'Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
    ],
  },
  {
    entry: 'browser-local-replay-awareness-over-embodiment-headline',
    file: './alicization-browser-bridge.test.ts',
    snippets: [
      'prefers richer host-visible project awareness over a narrower embodiment headline when browser continuity snapshots rebuild pre-dialogue awareness',
      'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
      'Keep extending cross-modal same-her proof across browser-local replay.',
    ],
  },
  {
    entry: 'browser-local-replay-inward-low-pressure-same-her-carry',
    file: './alicization-browser-bridge.test.ts',
    snippets: [
      'keeps same-her inward low-pressure closure visible when browser-local continuity snapshots only carry the thinner same-phase briefing plus stronger embodiment headline',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
    ],
  },
  {
    entry: 'duplicate-turn-merge-richer-same-her-continuity',
    file: './chat/session-message-merge.test.ts',
    snippets: [
      'prefers richer same-her continuity summary over a generic awareness reminder when duplicate assistant messages are merged',
      'generic continuity reminder: keep project identity, landed progress, and open closure in view before replying.',
      'same-her=Same Phase 1 digital life. Duplicate-turn merge should keep the same living line rather than reopen from a fresh shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Duplicate-turn merge still needs to preserve the richer same-her project brief.',
    ],
  },
  {
    entry: 'duplicate-turn-merge-stable-thinner-richer-same-her-continuity',
    file: './chat/session-message-merge.test.ts',
    snippets: [
      'keeps richer same-her continuity summary when the stable duplicate is thinner than the legacy duplicate',
      'same-her=Same Phase 1 digital life. Stable duplicate merge should still keep the richer continuity line instead of the thinner stable shell. | landed=Project-state continuity already survives duplicate-turn replay. | open=Stable duplicate merge still needs to preserve the richer same-her project brief.',
      'Same Phase 1 digital life. Stable duplicate merge should still keep the richer continuity line instead of the thinner stable shell.',
    ],
  },
  {
    entry: 'duplicate-turn-merge-stable-thinner-richer-project-briefing',
    file: './chat/session-message-merge.test.ts',
    snippets: [
      'keeps richer project-aware companion briefing when the stable duplicate only keeps a generic same-her reminder',
      'generic same-her reminder that should not override the richer project briefing.',
      'Before speaking, remember what this digital life project is, what has already landed, and which life loop is still open before the next outward turn.',
    ],
  },
  {
    entry: 'duplicate-turn-merge-inward-low-pressure-same-her-carry',
    file: './chat/session-message-merge.test.ts',
    snippets: [
      'keeps same-her inward low-pressure closure visible when duplicate assistant merges only carry the thinner same-phase briefing plus stronger embodiment headline',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
    ],
  },
] as const

describe('reopen persistence project awareness audit', () => {
  it('keeps one explicit route-level proof that restored-session fallback and browser-local replay preserve same-her project awareness before the next outward turn', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'restored-session-project-awareness-backfill' }),
      expect.objectContaining({ entry: 'restored-session-drift-boundary-preservation' }),
      expect.objectContaining({ entry: 'restored-session-thin-awareness-upgrade' }),
      expect.objectContaining({ entry: 'imported-session-thin-awareness-upgrade' }),
      expect.objectContaining({ entry: 'forked-session-thin-awareness-upgrade' }),
      expect.objectContaining({ entry: 'restored-session-inward-low-pressure-same-her-carry' }),
      expect.objectContaining({ entry: 'session-fallback-richer-host-visible-awareness' }),
      expect.objectContaining({ entry: 'session-fallback-inward-low-pressure-same-her-carry' }),
      expect.objectContaining({ entry: 'browser-local-replay-richer-host-visible-awareness' }),
      expect.objectContaining({ entry: 'browser-local-replay-awareness-over-embodiment-headline' }),
      expect.objectContaining({ entry: 'browser-local-replay-inward-low-pressure-same-her-carry' }),
      expect.objectContaining({ entry: 'duplicate-turn-merge-richer-same-her-continuity' }),
      expect.objectContaining({ entry: 'duplicate-turn-merge-stable-thinner-richer-same-her-continuity' }),
      expect.objectContaining({ entry: 'duplicate-turn-merge-stable-thinner-richer-project-briefing' }),
      expect.objectContaining({ entry: 'duplicate-turn-merge-inward-low-pressure-same-her-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the reopen and persistence continuity claim to real current tests instead of only broader matrix wording', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: restored-session and browser-local replay now preserve project awareness on real reopen paths, but this still does not prove every future reopen surface automatically inherits the chain', () => {
    const matrixSource = readFileSync(new URL('../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const restoredSessionSource = readFileSync(new URL('./chat/session-store.test.ts', import.meta.url), 'utf8')
    const browserReplaySource = readFileSync(new URL('./alicization-browser-bridge.test.ts', import.meta.url), 'utf8')
    const mergeSource = readFileSync(new URL('./chat/session-message-merge.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')

    expect(restoredSessionSource).toContain(
      'backfills pre-dialogue awareness from persisted rich project-state carry when restored assistant payloads do not already include it',
    )
    expect(restoredSessionSource).toContain(
      'upgrades thin persisted pre-dialogue awareness from richer project-state carry when restored assistant payload already includes only a generic reminder shell',
    )
    expect(restoredSessionSource).toContain(
      'upgrades thin imported pre-dialogue awareness from richer project-state carry instead of preserving a generic reminder shell',
    )
    expect(restoredSessionSource).toContain(
      'upgrades thin forked pre-dialogue awareness from richer project-state carry instead of preserving a generic reminder shell',
    )
    expect(restoredSessionSource).toContain(
      'keeps same-her inward low-pressure closure visible when restored awareness only carries the thinner same-phase briefing plus stronger embodiment headline',
    )
    expect(restoredSessionSource).toContain(
      'keeps same-her inward low-pressure closure visible when restored awareness only carries the thinner same-phase briefing plus stronger embodiment headline',
    )
    expect(readFileSync(new URL('./chat.test.ts', import.meta.url), 'utf8')).toContain(
      'keeps same-her inward low-pressure closure visible in before-compose and persisted pre-dialogue awareness when session fallback rebuilds turn identity without inspector state',
    )
    expect(browserReplaySource).toContain(
      'prefers richer host-visible project-state audit and same-her spine continuity when browser continuity snapshots rebuild from stored turns',
    )
    expect(browserReplaySource).toContain(
      'keeps same-her inward low-pressure closure visible when browser-local continuity snapshots only carry the thinner same-phase briefing plus stronger embodiment headline',
    )
    expect(mergeSource).toContain(
      'prefers richer same-her continuity summary over a generic awareness reminder when duplicate assistant messages are merged',
    )
    expect(mergeSource).toContain(
      'keeps richer same-her continuity summary when the stable duplicate is thinner than the legacy duplicate',
    )
    expect(mergeSource).toContain(
      'keeps richer project-aware companion briefing when the stable duplicate only keeps a generic same-her reminder',
    )
    expect(mergeSource).toContain(
      'keeps same-her inward low-pressure closure visible when duplicate assistant merges only carry the thinner same-phase briefing plus stronger embodiment headline',
    )
  })
})
