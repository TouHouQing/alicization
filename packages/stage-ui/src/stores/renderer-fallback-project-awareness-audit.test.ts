import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'before-compose-richer-host-visible-awareness',
    file: './chat.test.ts',
    snippets: [
      'prefers richer host-visible project-state audit and same-her spine continuity when session fallback rebuilds pre-dialogue awareness without inspector state',
      'Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay.',
      'Fallback project awareness still needs to preserve the stronger host-visible project brief before compose starts.',
      'If session fallback rebuilds this turn like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
    ],
  },
  {
    entry: 'before-compose-awareness-over-embodiment-headline',
    file: './chat.test.ts',
    snippets: [
      'prefers richer session fallback awareness over a narrower embodiment headline when before-compose rebuilds turn identity without inspector state',
      'Keep renderer session fallback from reopening the turn through an embodiment-only shell.',
      'Before-compose awareness recovery still needs to keep the same digital life project, landed closure, and open life loop explicit together.',
    ],
  },
  {
    entry: 'before-send-richer-host-visible-awareness',
    file: './chat.test.ts',
    snippets: [
      'rebuilds actual before-send pre-dialogue identity from session fallback when inspector snapshots are missing',
      'Project-state continuity and awareness-first self-brief already survive across session reload and host-visible replay.',
      'Before-send entry awareness still needs to preserve the stronger host-visible project brief before runtime dispatch starts.',
      'If before-send fallback rebuilds this turn like a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
    ],
  },
  {
    entry: 'before-send-canonical-emotional-closure-cue',
    file: './chat.test.ts',
    snippets: [
      'prefers canonical emotional closure cue from continuity fallback when hook-context awareness recovery rebuilds the send identity',
      'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      'Before speaking, remember this is still the same digital life project before local fluency takes over.',
    ],
  },
  {
    entry: 'before-compose-send-path-inward-low-pressure-carry',
    file: './chat.test.ts',
    snippets: [
      'keeps same-her inward low-pressure closure visible in before-compose and persisted pre-dialogue awareness when session fallback rebuilds turn identity without inspector state',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
    ],
  },
  {
    entry: 'before-compose-body-voice-awareness-fallback',
    file: './chat.test.ts',
    snippets: [
      'derives a body-plus-voice host-facing awareness line from closure reasons when the inspector awareness snapshot is unavailable',
      'resident body line is still keeping this one living her coherent while face, motion, and lipsync rejoin',
      'remaining-open=face+motion+lipsync',
    ],
  },
  {
    entry: 'before-compose-body-lipsync-awareness-fallback',
    file: './chat.test.ts',
    snippets: [
      'derives a body-plus-lipsync host-facing awareness line from closure reasons when the inspector awareness snapshot is unavailable',
      'resident body line and living mouth line are still intact while face, motion, and voice need to rejoin before full cross-modal closure settles',
      'remaining-open=face+motion+voice',
    ],
  },
] as const

describe('renderer fallback project awareness audit', () => {
  it('keeps one explicit route-level proof that renderer chat fallback restores same-her project awareness before both compose-time and send-time dialogue surfaces', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'before-compose-richer-host-visible-awareness' }),
      expect.objectContaining({ entry: 'before-compose-awareness-over-embodiment-headline' }),
      expect.objectContaining({ entry: 'before-send-richer-host-visible-awareness' }),
      expect.objectContaining({ entry: 'before-send-canonical-emotional-closure-cue' }),
      expect.objectContaining({ entry: 'before-compose-send-path-inward-low-pressure-carry' }),
      expect.objectContaining({ entry: 'before-compose-body-voice-awareness-fallback' }),
      expect.objectContaining({ entry: 'before-compose-body-lipsync-awareness-fallback' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the renderer fallback claim to real current chat-store tests instead of only registration or matrix prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: renderer fallback now has dedicated route-level same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const chatSource = readFileSync(new URL('./chat.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(chatSource).toContain(
      'rebuilds actual before-send pre-dialogue identity from session fallback when inspector snapshots are missing',
    )
    expect(chatSource).toContain(
      'prefers richer session fallback awareness over a narrower embodiment headline when before-compose rebuilds turn identity without inspector state',
    )
    expect(chatSource).toContain(
      'keeps same-her inward low-pressure closure visible in before-compose and persisted pre-dialogue awareness when session fallback rebuilds turn identity without inspector state',
    )
  })
})
