import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'stream-meta-long-horizon-self-carry-bridge',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'quick-reply-project-self-brief-lines',
      'quick-reply-closure-summary-self-recognition',
    ],
  },
  {
    entry: 'stream-meta-runtime-project-frame',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'includes project-state identity and closure fields in stream meta signatures so runtime-authoritative turns expose the same project continuity frame',
      'runtimeDigestProjectPreflightSummary',
      'runtimeDigestProjectNextClosureTarget',
      'runtimeDigestProjectContinuityCue',
    ],
  },
  {
    entry: 'stream-meta-awareness-line-preference',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'prefers a stronger same-her embodiment headline over the compact thin closure shell in emitted pre-dialogue awareness meta',
      'preDialogueAwarenessSummary',
      '.not.toBe(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'stream-meta-prefers-visible-proactive-same-her-carry',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'prefers same-her inward carry from proactive visible utterance realization for resident presence reason summaries when explicit continuity cue is absent',
      'sameHerInwardCarry: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\'',
      '"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=quiet-accompaniment',
    ],
  },
  {
    entry: 'stream-meta-resident-performance-fallback',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'recovers same-her inward carry from resident performance tags when visible-reply repair metadata is absent',
      '\'same-her-inward-carry\'',
      'resident performance tags',
    ],
  },
  {
    entry: 'stream-meta-quiet-accompaniment-mode',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps resident presence explicitly in quiet-accompaniment mode when same-her inward carry is the active silent body line',
      'reasonTags: [\'resident-performance\', \'same-her-inward-carry\', \'quiet-companionship\', \'body:accompanying\']',
      'quiet same-her inward carry line',
    ],
  },
  {
    entry: 'stream-meta-drift-risk-only-segment-carry',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'keeps segment-level measured-return summaries on the remembered same-her drift-risk line when project-state drift risk is the only surviving continuity authority',
      'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
      'lastSegmentBodyContinuitySummary',
    ],
  },
] as const

describe('stream meta project awareness audit', () => {
  it('keeps one explicit route-level proof that stream meta preserves same-her project awareness before later visible turns rebuild from it', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'stream-meta-long-horizon-self-carry-bridge' }),
      expect.objectContaining({ entry: 'stream-meta-runtime-project-frame' }),
      expect.objectContaining({ entry: 'stream-meta-awareness-line-preference' }),
      expect.objectContaining({ entry: 'stream-meta-prefers-visible-proactive-same-her-carry' }),
      expect.objectContaining({ entry: 'stream-meta-resident-performance-fallback' }),
      expect.objectContaining({ entry: 'stream-meta-quiet-accompaniment-mode' }),
      expect.objectContaining({ entry: 'stream-meta-drift-risk-only-segment-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the stream-meta project-awareness claim to current behavior tests instead of only broader host-visible route prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: stream meta now has dedicated same-her proof, while future new dialogue entrypoints and full long-run closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const streamMetaSource = readFileSync(new URL('./main-chat-stream-meta.test.ts', import.meta.url), 'utf8')
    const longHorizonSource = readFileSync(new URL('./long-horizon-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('stream-meta-project-awareness-audit.test.ts')
    expect(streamMetaSource).toContain(
      'includes project-state identity and closure fields in stream meta signatures so runtime-authoritative turns expose the same project continuity frame',
    )
    expect(streamMetaSource).toContain(
      'keeps resident presence explicitly in quiet-accompaniment mode when same-her inward carry is the active silent body line',
    )
    expect(streamMetaSource).toContain(
      'keeps segment-level measured-return summaries on the remembered same-her drift-risk line when project-state drift risk is the only surviving continuity authority',
    )
    expect(longHorizonSource).toContain(
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
    )
  })
})
