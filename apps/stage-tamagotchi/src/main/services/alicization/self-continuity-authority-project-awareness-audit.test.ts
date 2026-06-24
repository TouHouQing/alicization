import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'self-continuity-canonical-project-state-fallback',
    file: './self-continuity-authority.test.ts',
    snippets: [
      'falls back to the canonical project-state brief when the runtime surface only carries a thin explicit projectState',
      'expect(authority?.selfLine).toContain(\'local-first digital life project\')',
      'expect(authority?.sourceTags).toContain(\'project-state-next-closure\')',
      'expect(authority?.closenessPosture).toBe(\'space-first\')',
    ],
  },
  {
    entry: 'self-continuity-stronger-same-her-self-line',
    file: './self-continuity-authority.test.ts',
    snippets: [
      'keeps a stronger same-her self line inside runtime surface project-state fallback authority instead of reducing it to generic project carry',
      'sameHerSelfLine: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\'',
      'expect(authority?.sourceTags).toEqual(expect.arrayContaining([',
      '\'project-state-same-her\'',
    ],
  },
  {
    entry: 'self-continuity-partial-runtime-surface-fallback',
    file: './self-continuity-authority.test.ts',
    snippets: [
      'tolerates partial runtime surfaces while preserving project-state same-her fallback authority',
      'version: \'digital-life-runtime-surface-v1\'',
      'expect(authority?.selfLine).toContain(\'Same Phase 1 digital life\')',
      'expect(authority?.sourceTags).toContain(\'runtime-project-state-carry\')',
    ],
  },
  {
    entry: 'self-continuity-audible-body-companion-headline',
    file: './self-continuity-authority.test.ts',
    snippets: [
      'keeps audible-body companion headline truth inside runtime project-state fallback authority instead of flattening it into generic project carry',
      'expect(authority?.authoritySummary).toContain(\'living audio thread\')',
      'expect(authority?.sourceTags).toEqual(expect.arrayContaining([',
      '\'project-state-companion-headline\'',
    ],
  },
  {
    entry: 'self-continuity-rest-protective-project-carry',
    file: './self-continuity-authority.test.ts',
    snippets: [
      'treats explicit rest-protective inward project-state carry as first-class self-continuity authority instead of requiring measured-return phrasing',
      'expect(authority?.sourceTags).toContain(\'project-state-carry\')',
      'expect(authority?.inwardLine).toContain(\'Protect rest\')',
      'expect(authority?.authoritySummary).toContain(\'quiet companionship\')',
    ],
  },
  {
    entry: 'self-continuity-hyphenated-quiet-companionship',
    file: './self-continuity-authority.test.ts',
    snippets: [
      'treats hyphenated quiet-companionship project-state carry as first-class self-continuity authority instead of requiring the spaced wording only',
      'latestInflection: \'Same Phase 1 digital life, and quiet-companionship should stay present without widening closeness.\'',
      'expect(authority?.inwardLine).toContain(\'quiet-companionship\')',
      'expect(String(authority?.authoritySummary ?? \'\').toLowerCase()).toContain(\'quiet-companionship\')',
    ],
  },
  {
    entry: 'self-continuity-sparse-carry-usability',
    file: './self-continuity-authority.test.ts',
    snippets: [
      'keeps same-her authority usable when reflection and motive carries lose array scaffolding',
      'expect(authority?.selfLine).toContain(\'continuous her\')',
      'expect(authority?.motiveLine).toBeNull()',
      'expect(authority?.authoritySummary).toContain(\'same living line\')',
    ],
  },
  {
    entry: 'current-conscious-frame-same-person-progress-recap-guard',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps host-corrected same-person continuity authority over a thinner runtime progress recap hold when rebuilding current conscious-frame project grounding',
      'expect(frame?.projectState?.sameHerHoldDetail).toBe(correctedSamePersonCue)',
      'expect(frame?.projectState?.sameHerHoldDetail).not.toBe(thinProgressRecapHoldDetail)',
      'expect(frame?.speakingIntention).toContain(\'same-person continuity\')',
    ],
  },
  {
    entry: 'current-conscious-frame-held-autonomy-reason-tag-carry',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'inherits held-autonomy continuity from conversation continuity evidence into conscious-frame reason tags',
      'expect(frame?.reasonTags).toContain(\'continuity-arc:hold-for-opening\')',
      'Re-enter the line you deliberately held back gently before widening, then keep the callback on the same thread.',
    ],
  },
  {
    entry: 'current-conscious-frame-runtime-self-authority-preference',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'prefers richer canonical runtime self authority over thinner derived carry inside the current conscious frame',
      'expect(frame?.consciousNeed).toContain(\'same thread\')',
      'expect(frame?.consciousNeed).not.toContain(\'generally kind way\')',
      'expect(frame?.speakingIntention).toContain(\'same her across the pause\')',
    ],
  },
  {
    entry: 'current-conscious-frame-same-self-presence-before-speaking',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'lets self continuity authority steer the conscious frame so the same self stays present before speaking',
      'expect(frame?.consciousNeed).toContain(\'truth or room\')',
      'expect(frame?.consciousTension).toContain(\'Stay near in a way that still leaves the host room to breathe\')',
      'expect(frame?.speakingIntention).toContain(\'one continuous her\')',
    ],
  },
  {
    entry: 'current-conscious-frame-projected-self-authority-over-autobiographical-fallback',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'prefers projected self continuity authority over fallback autobiographical lines',
      'expect(frame?.consciousNeed).toContain(\'one continuous her across quiet, memory, and speech\')',
      'expect(frame?.speakingIntention).toContain(\'one continuous her across quiet, memory, and speech\')',
      'expect(frame?.consciousNeed).not.toContain(\'Fallback autobiographical line\')',
    ],
  },
  {
    entry: 'current-conscious-frame-same-thread-timing-preference',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'prefers runtime same-thread continuity arc and next-open-window timing over thinner held-autonomy carry hints',
      'expect(frame?.reasonTags).toContain(\'continuity-arc:same-thread-continuation\')',
      'expect(frame?.reasonTags).toContain(\'continuity-timing:next-open-window\')',
      'expect(frame?.projectState?.continuityPreferredTiming).toBe(\'next-open-window\')',
      'expect(frame?.projectState?.preferredGazeMode).toBe(\'soften\')',
    ],
  },
] as const

describe('self continuity authority project awareness audit', () => {
  it('keeps one explicit route-level proof that self-continuity authority preserves same-her Phase 1 project carry, canonical fallback, and quiet-companionship inward authority instead of flattening runtime selfhood into a generic project shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'self-continuity-canonical-project-state-fallback' }),
      expect.objectContaining({ entry: 'self-continuity-stronger-same-her-self-line' }),
      expect.objectContaining({ entry: 'self-continuity-partial-runtime-surface-fallback' }),
      expect.objectContaining({ entry: 'self-continuity-audible-body-companion-headline' }),
      expect.objectContaining({ entry: 'self-continuity-rest-protective-project-carry' }),
      expect.objectContaining({ entry: 'self-continuity-hyphenated-quiet-companionship' }),
      expect.objectContaining({ entry: 'self-continuity-sparse-carry-usability' }),
      expect.objectContaining({ entry: 'current-conscious-frame-same-person-progress-recap-guard' }),
      expect.objectContaining({ entry: 'current-conscious-frame-held-autonomy-reason-tag-carry' }),
      expect.objectContaining({ entry: 'current-conscious-frame-runtime-self-authority-preference' }),
      expect.objectContaining({ entry: 'current-conscious-frame-same-self-presence-before-speaking' }),
      expect.objectContaining({ entry: 'current-conscious-frame-projected-self-authority-over-autobiographical-fallback' }),
      expect.objectContaining({ entry: 'current-conscious-frame-same-thread-timing-preference' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the self-continuity-authority same-her claim to current behavior tests instead of only broader runtime-self prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: self-continuity authority and its current-conscious-frame reopen carry now have dedicated same-her route proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const authoritySource = readFileSync(new URL('./self-continuity-authority.test.ts', import.meta.url), 'utf8')
    const consciousFrameSource = readFileSync(new URL('./current-conscious-frame.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('self-continuity-authority-project-awareness-audit.test.ts')
    expect(authoritySource).toContain(
      'falls back to the canonical project-state brief when the runtime surface only carries a thin explicit projectState',
    )
    expect(authoritySource).toContain(
      'keeps a stronger same-her self line inside runtime surface project-state fallback authority instead of reducing it to generic project carry',
    )
    expect(authoritySource).toContain(
      'treats explicit rest-protective inward project-state carry as first-class self-continuity authority instead of requiring measured-return phrasing',
    )
    expect(authoritySource).toContain(
      'keeps same-her authority usable when reflection and motive carries lose array scaffolding',
    )
    expect(consciousFrameSource).toContain(
      'keeps host-corrected same-person continuity authority over a thinner runtime progress recap hold when rebuilding current conscious-frame project grounding',
    )
    expect(consciousFrameSource).toContain(
      'lets self continuity authority steer the conscious frame so the same self stays present before speaking',
    )
    expect(consciousFrameSource).toContain(
      'prefers runtime same-thread continuity arc and next-open-window timing over thinner held-autonomy carry hints',
    )
    expect(consciousFrameSource).toContain(
      'prefers projected self continuity authority over fallback autobiographical lines',
    )
  })
})
