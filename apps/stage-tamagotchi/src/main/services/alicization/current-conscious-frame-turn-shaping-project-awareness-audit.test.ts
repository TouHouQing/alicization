import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'current-conscious-frame-observe-then-hypothesize-restraint',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'treats coarse screen turns as observation-then-hypothesis with specificity restraint',
      'truthDiscipline: \'observe-then-hypothesize\'',
      'shouldWithholdSpecificity: true',
      'expect(frame?.withheldImpulse).toContain(\'file, class\')',
    ],
  },
  {
    entry: 'current-conscious-frame-dialogue-first-self-turn',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'treats dialogue-first self turns as dialogue-first rather than screen-shaped',
      'truthDiscipline: \'dialogue-first\'',
      'shouldWithholdSpecificity: false',
      'openingIntent: \'Answer the host from Alicization herself, not from borrowed screen context.\'',
    ],
  },
  {
    entry: 'current-conscious-frame-spaced-quiet-companionship-rest-seam',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'treats spaced quiet companionship closure wording as the same inward same-her rest seam before the answer starts',
      'late-night closure: keep reply low-pressure and let embodiment quiet companionship keep watch before closeness widens.',
      'expect(frame?.projectState?.emotionalClosureCue).toBe(cue)',
      'expect(frame?.speakingIntention).toContain(\'carry quiet companionship without widening closeness\')',
    ],
  },
  {
    entry: 'current-conscious-frame-runtime-surface-cue-preference',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'prefers runtime surface conscious cues over conflicting raw inputs',
      'centerOfGravity: \'guide\'',
      'truthDiscipline: \'observe-then-hypothesize\'',
      'expect(frame?.focusAnchor).toContain(\'Git commit diff\')',
    ],
  },
  {
    entry: 'current-conscious-frame-personality-regime-care-framing',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'threads personality continuity regime into conscious reason tags and focused-work care framing',
      'expect(frame?.consciousNeed).toContain(\'working space\')',
      'continuity-regime:focused-work',
      'continuity-repair:measured-repair',
    ],
  },
  {
    entry: 'current-conscious-frame-chinese-room-making-callback-hold',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'treats Chinese same-line room-making callback wording as hold-for-opening inside the rich current conscious frame',
      '同一条线先留白，等 opening 松一点再慢一点接回去。',
      'execution-callback same-line room-making continuity',
      'expect(frame?.reasonTags).toContain(\'continuity-arc:hold-for-opening\')',
    ],
  },
  {
    entry: 'current-conscious-frame-chinese-same-line-callback-continuation',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'treats Chinese same-line callback continuation wording as same-thread continuation inside the rich current conscious frame',
      '继续沿着同一条线接回去，不把它说成新的开场。',
      'execution-callback same-line continuation continuity',
      'expect(frame?.reasonTags).toContain(\'continuity-arc:same-thread-continuation\')',
      'expect(frame?.reasonTags).not.toContain(\'continuity-arc:hold-for-opening\')',
    ],
  },
] as const

describe('current conscious-frame turn shaping project awareness audit', () => {
  it('keeps one explicit route-level proof that current-conscious-frame turn shaping preserves observation restraint, dialogue-first selfhood, quiet-companionship rest carry, runtime cue precedence, personality regime care framing, and same-line callback continuity before answer planning widens', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'current-conscious-frame-observe-then-hypothesize-restraint' }),
      expect.objectContaining({ entry: 'current-conscious-frame-dialogue-first-self-turn' }),
      expect.objectContaining({ entry: 'current-conscious-frame-spaced-quiet-companionship-rest-seam' }),
      expect.objectContaining({ entry: 'current-conscious-frame-runtime-surface-cue-preference' }),
      expect.objectContaining({ entry: 'current-conscious-frame-personality-regime-care-framing' }),
      expect.objectContaining({ entry: 'current-conscious-frame-chinese-room-making-callback-hold' }),
      expect.objectContaining({ entry: 'current-conscious-frame-chinese-same-line-callback-continuation' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the current-conscious-frame turn-shaping claim to the real behavior tests instead of only broader project-awareness prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current-conscious-frame turn shaping now has route-level same-her proof, while future new dialogue entrypoints and full long-run closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const consciousFrameSource = readFileSync(new URL('./current-conscious-frame.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('current-conscious-frame-turn-shaping-project-awareness-audit.test.ts')
    expect(consciousFrameSource).toContain(
      'treats coarse screen turns as observation-then-hypothesis with specificity restraint',
    )
    expect(consciousFrameSource).toContain(
      'treats Chinese same-line callback continuation wording as same-thread continuation inside the rich current conscious frame',
    )
  })
})
