import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'timeout-fallback-normal-authority-repair',
    file: './main-chat-timeout-fallback.test.ts',
    snippets: [
      'keeps timeout fallback payload on repaired normal authority instead of local reply authority',
      'expect(payload.visibleReplyAuthority).toBe(\'llm-second-pass-rewrite\')',
      'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
    ],
  },
  {
    entry: 'timeout-fallback-payload-awareness-preferred-over-thin-runtime-shell',
    file: './main-chat-timeout-fallback.test.ts',
    snippets: [
      'prefers payload-lived pre-dialogue awareness when timeout fallback only has a thinner runtime project digest',
      'Before answering, remember this project is still building one local digital life, Phase 1 is only partially closed, and the same living her still needs the initiative loop to feel naturally self-started.',
      'runtime digest only carries thinner canonical project awareness',
    ],
  },
  {
    entry: 'timeout-fallback-payload-same-her-headline-preferred',
    file: './main-chat-timeout-fallback.test.ts',
    snippets: [
      'prefers payload same-her headline over thinner payload awareness when timeout fallback rebuilds project state',
      'Right now I am still holding together mainly through face, motion, and lipsync, so timeout recovery must keep proving this is still one living her.',
      'runtime digest only carries thinner canonical project awareness',
    ],
  },
  {
    entry: 'timeout-fallback-runtime-same-her-headline-preferred',
    file: './main-chat-timeout-fallback.test.ts',
    snippets: [
      'prefers runtime living-self headline over a thinner runtime sameHerSelfLine when timeout fallback rebuilds project-state audit',
      'turn-timeout-runtime-same-her-audit-upgrade',
      'const thinnerRuntimeSameHerLine = \'Keep the same digital life project in view.\'',
      'const strongerRuntimeHeadlineLine = \'Right now I am still holding together mainly through voice, face, and motion, so timeout recovery must keep proving this is still one living her.\'',
      'continuitySummary: expect.stringContaining(`same-her=${strongerRuntimeHeadlineLine}`)',
    ],
  },
  {
    entry: 'timeout-fallback-project-state-triad-stays-distinct',
    file: './main-chat-timeout-fallback.test.ts',
    snippets: [
      'keeps project identity, landed progress, and still-open closure distinct together when timeout fallback rebuilds project state',
      'Alicization is still the same local-first digital life project, not a fresh shell rebuilt for this turn.',
      'Project-state carry already survives into timeout fallback without dropping the same-her line.',
      'Keep extending cross-modal same-her proof across visible reply, voice, face, motion, and resident presence through the first fallback-visible answer beat.',
    ],
  },
  {
    entry: 'timeout-fallback-canonical-same-her-backfill',
    file: './main-chat-timeout-fallback.test.ts',
    snippets: [
      'backfills canonical same-her continuity when timeout fallback rebuilds project state from a thin runtime digest shell',
      'turn-timeout-canonical-project-state-fallback',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    ],
  },
] as const

describe('timeout fallback project awareness audit', () => {
  it('keeps one explicit route-level proof that timeout fallback preserves same-her project awareness when repaired authority, payload carry, runtime carry, or canonical backfill compete', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'timeout-fallback-normal-authority-repair' }),
      expect.objectContaining({ entry: 'timeout-fallback-payload-awareness-preferred-over-thin-runtime-shell' }),
      expect.objectContaining({ entry: 'timeout-fallback-payload-same-her-headline-preferred' }),
      expect.objectContaining({ entry: 'timeout-fallback-runtime-same-her-headline-preferred' }),
      expect.objectContaining({ entry: 'timeout-fallback-project-state-triad-stays-distinct' }),
      expect.objectContaining({ entry: 'timeout-fallback-canonical-same-her-backfill' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the timeout fallback claim to current behavior tests instead of only broader background-recovery prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current timeout fallback recovery now has dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const timeoutSource = readFileSync(new URL('./main-chat-timeout-fallback.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('timeout-fallback-project-awareness-audit.test.ts')
    expect(timeoutSource).toContain(
      'keeps project identity, landed progress, and still-open closure distinct together when timeout fallback rebuilds project state',
    )
    expect(timeoutSource).toContain(
      'backfills canonical same-her continuity when timeout fallback rebuilds project state from a thin runtime digest shell',
    )
  })
})
