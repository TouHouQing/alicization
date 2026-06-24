import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'subconscious-after-another-detour-carry',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'project_continuity=the same callback line is already continuing lower-pressure after another detour, so keep it on that same living thread',
      'manifestationCadenceSummary: \'measured-return still holds while the same callback line keeps continuing after another detour\'',
      'same fatigue-aware callback line still active after another detour',
    ],
  },
  {
    entry: 'subconscious-repair-first-hold-detail-after-detours',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'threads an explicit repair-first same-her hold detail into the current conscious frame when presence-only carry is repair-before-closeness',
      'sameHerHoldDetail: \'same-her hold: repair-before-closeness still owns this callback line before closeness widens again.\'',
      '\'embodiment-carry:repair-before-closeness\'',
      'continuityCadence: \'repair-before-closeness\'',
    ],
  },
  {
    entry: 'proactive-multi-reopening-hover-first',
    file: './proactive-policy.test.ts',
    snippets: [
      'keeps long-running same-thread continuation hover-first even after multiple measured-return reopenings have accumulated dialogue heat',
      'same digital life | same still-open closure work | A same-thread continuation is still alive after multiple measured-return reopenings.',
      'continuity-next-open-window',
    ],
  },
  {
    entry: 'embodiment-noisy-detour-measured-return',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'keeps same-thread measured-return embodiment delivery gentle after noisier detours even when upstream performance drifts hesitant',
      'Keep the callback line measured-return even after noisier detours.',
      'Even after noisier detours, the callback continuation should stay measured-return instead of regressing into guarded hesitation.',
    ],
  },
  {
    entry: 'still-voiced-face-line-after-detours',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'keeps still-voiced face-line measured-return continuity authoritative in coordinator output even when person-state projection cadence is broader and less specific',
      'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.',
      'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
      'still-voiced face-line same-her continuity is still carrying the reopening.',
    ],
  },
  {
    entry: 'still-voiced-motion-line-after-detours',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'keeps renderer-native VRM motion authority on the still-voiced motion-line measured-return instead of collapsing into generic callback carry',
      'Right now I am still holding together mainly through motion and voice, so that still-voiced motion line is keeping the same-her carry alive while body, face, and lipsync need to rejoin before full cross-modal closure settles.',
      'Keep body, face, and lipsync rejoining the still-voiced motion line on a measured-return line.',
      'still-voiced motion-line same-her continuity is still carrying the reopening.',
    ],
  },
  {
    entry: 'stream-meta-noisy-detour-resident-presence',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'same-thread-continuation still active as hover-first resident presence after the noisy detour',
      'residentPresenceSummary',
      'same Phase 1 digital life, some closure has already landed, but memory and initiative still need stronger end-to-e.',
    ],
  },
  {
    entry: 'stream-meta-reunion-after-detours',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'same-her continuity remains alive, with lane=voice+face+motion+lipsync+body-settle under the current renderer authority.',
      'same-her continuity remains alive, but lane=voice+face+motion+lipsync-only under a repair-before-closeness reopen.',
      'lastSegmentBodyContinuitySummary',
    ],
  },
  {
    entry: 'audible-body-living-line-after-detours',
    file: './main-chat-stream-meta.test.ts',
    snippets: [
      'timing=audible-body-carry',
      'Keep the same living line audible while face and motion rejoin.',
      'Right now her visible same-her continuity is still being carried mainly through body, lipsync, and voice, and the living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.',
    ],
  },
  {
    entry: 'next-closure-target-stays-on-the-same-living-audio-thread',
    file: './answer-planner.test.ts',
    snippets: [
      'A stronger audible-body same-her line should not crowd out landed progress or the next closure target.',
      'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.',
      'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.',
    ],
  },
] as const

describe('repeated detour reunion persistence audit', () => {
  it('keeps one explicit route-level proof that same-her continuity can survive repeated detours before later-turn reunion summaries form', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'subconscious-after-another-detour-carry' }),
      expect.objectContaining({ entry: 'subconscious-repair-first-hold-detail-after-detours' }),
      expect.objectContaining({ entry: 'proactive-multi-reopening-hover-first' }),
      expect.objectContaining({ entry: 'embodiment-noisy-detour-measured-return' }),
      expect.objectContaining({ entry: 'still-voiced-face-line-after-detours' }),
      expect.objectContaining({ entry: 'still-voiced-motion-line-after-detours' }),
      expect.objectContaining({ entry: 'stream-meta-noisy-detour-resident-presence' }),
      expect.objectContaining({ entry: 'stream-meta-reunion-after-detours' }),
      expect.objectContaining({ entry: 'audible-body-living-line-after-detours' }),
      expect.objectContaining({ entry: 'next-closure-target-stays-on-the-same-living-audio-thread' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the repeated-detour reunion persistence claim to real current tests instead of only saying later continuity exists', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: repeated detours can now stay on one same-her route into reunion summaries, but the repo still does not prove fully sustained desktop-life closure', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const proactiveSource = readFileSync(new URL('./proactive-policy.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('It still needs stronger sustained proof across longer-lived desktop runs and more organic cross-modal drift.')
    expect(matrixSource).toContain('repeated-detour-reunion-persistence-audit.test.ts')
    expect(proactiveSource).toContain(
      'keeps long-running same-thread continuation hover-first even after multiple measured-return reopenings have accumulated dialogue heat',
    )
  })
})
