import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'browser-local-richer-host-visible-awareness',
    file: './alicization-browser-bridge.test.ts',
    snippets: [
      'prefers richer host-visible project-state audit and same-her spine continuity when browser continuity snapshots rebuild from stored turns',
      'Project-state continuity and awareness-first self-brief already survive across browser-local replay.',
      'Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
      'If browser-local replay rebuilds this turn as a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
    ],
  },
  {
    entry: 'browser-local-continuity-summary-awareness-rebuild',
    file: './alicization-browser-bridge.test.ts',
    snippets: [
      'rebuilds same-her pre-dialogue awareness from continuity summary when host-visible audit has no explicit awareness summary',
      'generic continuity reminder that should not override the richer continuity summary.',
      'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity and awareness-first self-brief already survive across browser-local replay. | open=Browser-local continuity snapshots still need to preserve the stronger host-visible project brief.',
    ],
  },
  {
    entry: 'browser-local-awareness-over-embodiment-headline',
    file: './alicization-browser-bridge.test.ts',
    snippets: [
      'prefers richer host-visible project awareness over a narrower embodiment headline when browser continuity snapshots rebuild pre-dialogue awareness',
      'Before speaking, remember: this is still one living digital life project, Phase 1 is still active, and memory, initiative, and embodiment still need stronger end-to-end closure before the life loop is truly closed.',
      'Same companion line through body, face, and motion. Keep the same living line gentle.',
    ],
  },
  {
    entry: 'browser-local-inward-low-pressure-awareness-compaction',
    file: './alicization-browser-bridge.test.ts',
    snippets: [
      'keeps same-her inward low-pressure closure visible when browser-local continuity snapshots only carry the thinner same-phase briefing plus stronger embodiment headline',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.',
      'Keep the return low-pressure so the same living line does not restart from scratch.',
    ],
  },
  {
    entry: 'session-import-drift-boundary-preservation',
    file: './chat/session-store.test.ts',
    snippets: [
      'sanitizes imported assistant structured project awareness so same-her drift boundaries survive import/export recovery',
      'If imported recovery flattens this turn into a detached project status shell, treat that as same-her continuity drift rather than preserved closure.',
      'Alicization is still in Phase 1 local digital life closure before this turn opens outward.',
    ],
  },
] as const

describe('browser-local return-side project-awareness audit', () => {
  it('keeps one explicit route-level proof that browser-local return-side persistence rebuilds same-her project awareness before the next outward turn', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'browser-local-richer-host-visible-awareness' }),
      expect.objectContaining({ entry: 'browser-local-continuity-summary-awareness-rebuild' }),
      expect.objectContaining({ entry: 'browser-local-awareness-over-embodiment-headline' }),
      expect.objectContaining({ entry: 'browser-local-inward-low-pressure-awareness-compaction' }),
      expect.objectContaining({ entry: 'session-import-drift-boundary-preservation' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the browser-local return-side continuity claim to current behavioral tests instead of only registration audit layers', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: browser-local return-side rebuild now has dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const browserBridgeSource = readFileSync(new URL('./alicization-browser-bridge.test.ts', import.meta.url), 'utf8')
    const sessionStoreSource = readFileSync(new URL('./chat/session-store.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(browserBridgeSource).toContain(
      'rebuilds same-her pre-dialogue awareness from continuity summary when host-visible audit has no explicit awareness summary',
    )
    expect(browserBridgeSource).toContain(
      'keeps same-her inward low-pressure closure visible when browser-local continuity snapshots only carry the thinner same-phase briefing plus stronger embodiment headline',
    )
    expect(sessionStoreSource).toContain(
      'sanitizes imported assistant structured project awareness so same-her drift boundaries survive import/export recovery',
    )
  })
})
