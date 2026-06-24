import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'motive-seed-phase1-pressure',
    file: './motive-engine-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that earliest motive seeding keeps same-her Phase 1 project pressure explicit before later initiative reasoning widens outward',
      'expect.objectContaining({ entry: \'mind-state-seed-motive-project-bridge\' })',
      'expect.objectContaining({ entry: \'motive-engine-phase1-open-loop-pressure\' })',
      'expect.objectContaining({ entry: \'motive-engine-autobiographical-project-carry\' })',
      'expect.objectContaining({ entry: \'motive-engine-canonical-project-state-fallback\' })',
    ],
  },
  {
    entry: 'proactive-entry-self-brief-before-generation',
    file: './proactive-prelude-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that proactive initiative starts from project-aware same-her self-brief authority before policy and visible hold continue the same Phase 1 line',
      'expect.objectContaining({ entry: \'proactive-entry-self-brief-block\' })',
      'expect.objectContaining({ entry: \'proactive-entry-self-brief-closure-triad\' })',
      'expect.objectContaining({ entry: \'proactive-policy-same-her-restraint\' })',
      'expect.objectContaining({ entry: \'proactive-visible-held-same-her-carry\' })',
    ],
  },
  {
    entry: 'proactive-restraint-policy-hover-first',
    file: './proactive-policy-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that proactive policy preserves same-her Phase 1 restraint, canonical project-state fallback, landed/open/next closure pressure, later-opening anti-shell guardrails, and lower-pressure hover-first continuity instead of widening into a generic assistant nudge',
      'expect.objectContaining({ entry: \'proactive-policy-phase1-open-loop-restraint\' })',
      'expect.objectContaining({ entry: \'proactive-policy-landed-progress-project-pressure\' })',
      'expect.objectContaining({ entry: \'proactive-policy-later-opening-hover-first\' })',
      'expect.objectContaining({ entry: \'proactive-policy-later-opening-anti-shell\' })',
      'expect.objectContaining({ entry: \'proactive-policy-next-closure-target-pressure\' })',
    ],
  },
  {
    entry: 'initiative-hover-first-same-her-restraint',
    file: './initiative-decision-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that initiative decision stays on the same-her Phase 1 line through self-explanation, callback restraint, canonical fallback, and hover-first arbitration instead of widening into a generic assistant nudge',
      'expect.objectContaining({ entry: \'initiative-phase1-landed-open-loop-self-explanation\' })',
      'expect.objectContaining({ entry: \'initiative-self-continuity-project-state-carry\' })',
      'expect.objectContaining({ entry: \'initiative-callback-project-carry-silent-observe\' })',
      'expect.objectContaining({ entry: \'arbiter-autobiographical-project-closure-hover-first\' })',
    ],
  },
  {
    entry: 'initiative-rejoins-current-conscious-frame',
    file: './initiative-current-conscious-frame-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that initiative restraint rejoins the active self on the same Phase 1 digital-life line before the turn speaks',
      'expect.objectContaining({ entry: \'initiative-active-loop-memory-handoff-bridge\' })',
      'expect.objectContaining({ entry: \'memory-closure-to-restraint-bridge\' })',
      'expect.objectContaining({ entry: \'current-conscious-frame-project-triad\' })',
      'expect.objectContaining({ entry: \'current-conscious-frame-emotional-closure-seam\' })',
      'expect.objectContaining({ entry: \'current-conscious-frame-thin-shell-repair\' })',
    ],
  },
  {
    entry: 'visible-proactive-held-beat-same-her-carry',
    file: './proactive-visible-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that proactive visible utterance realization preserves same-her project awareness before a held beat becomes outward-visible',
      'expect.objectContaining({ entry: \'visible-proactive-quiet-companionship-hold\' })',
      'expect.objectContaining({ entry: \'visible-proactive-later-opening-next-closure-hold\' })',
      'expect.objectContaining({ entry: \'stream-meta-prefers-visible-proactive-same-her-carry\' })',
      'expect.objectContaining({ entry: \'stream-meta-keeps-quiet-accompaniment-mode\' })',
    ],
  },
  {
    entry: 'subconscious-between-turn-autonomy-carry',
    file: './subconscious-persistence-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that subconscious persistence, presence-only hold, and deferred autonomy carry preserve same-her project awareness between visible turns',
      'expect.objectContaining({ entry: \'subconscious-persistence-rich-project-state-carry\' })',
      'expect.objectContaining({ entry: \'presence-only-hold-richer-awareness-precedence\' })',
      'expect.objectContaining({ entry: \'deferred-fallback-thin-shell-recanonicalization\' })',
      'expect.objectContaining({ entry: \'held-autonomy-fallback-repair-first-carry\' })',
    ],
  },
  {
    entry: 'proactive-feedback-into-next-session-dream',
    file: './proactive-feedback-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that settled proactive feedback preserves same-her project awareness into the next chat-session dream preparation and long-horizon repair-first self-carry instead of decaying into generic outcome bookkeeping',
      'expect.objectContaining({ entry: \'feedback-runtime-settlement-continuity-handoff\' })',
      'expect.objectContaining({ entry: \'feedback-next-chat-session-continuity-block\' })',
      'expect.objectContaining({ entry: \'feedback-dream-project-state-carry\' })',
      'expect.objectContaining({ entry: \'feedback-long-horizon-repair-first-self-carry\' })',
    ],
  },
  {
    entry: 'later-organic-learning-same-her-carry',
    file: './later-learning-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that later organic learning scheduling delayed payload shaping person-state surfacing and DB rehydration all preserve the same-her Phase 1 project line instead of decaying into a generic assistant shell after the dialogue turn ends',
      'expect.objectContaining({ entry: \'organic-learning-governor-project-carry\' })',
      'expect.objectContaining({ entry: \'delayed-learning-payload-thin-shell-repair\' })',
      'expect.objectContaining({ entry: \'person-state-surface-project-carry\' })',
      'expect.objectContaining({ entry: \'learning-task-db-rehydration-project-carry\' })',
    ],
  },
] as const

describe('autonomous dialogue closure loop audit', () => {
  it('keeps one compact route-level proof that autonomous proactive initiative stays on one same-her Phase 1 line from earliest motive pressure through self-brief, hover-first restraint, active-self rejoin, visible hold, between-turn carry, and later organic learning follow-through', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'motive-seed-phase1-pressure' }),
      expect.objectContaining({ entry: 'proactive-entry-self-brief-before-generation' }),
      expect.objectContaining({ entry: 'proactive-restraint-policy-hover-first' }),
      expect.objectContaining({ entry: 'initiative-hover-first-same-her-restraint' }),
      expect.objectContaining({ entry: 'initiative-rejoins-current-conscious-frame' }),
      expect.objectContaining({ entry: 'visible-proactive-held-beat-same-her-carry' }),
      expect.objectContaining({ entry: 'subconscious-between-turn-autonomy-carry' }),
      expect.objectContaining({ entry: 'proactive-feedback-into-next-session-dream' }),
      expect.objectContaining({ entry: 'later-organic-learning-same-her-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the compact autonomous same-her closure claim to current route-level audits instead of leaving motive, proactive, initiative, subconscious, feedback, and later learning proof as scattered islands', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: autonomous proactive continuity is easier to audit as one same-her Phase 1 line, but future runtime-owned dialogue families and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('autonomous-dialogue-closure-loop-audit.test.ts')
    expect(matrixSource).toContain('future runtime-owned dialogue families still need explicit registration')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('later-learning-project-awareness-audit.test.ts')
    expect(coverageSource).toContain('autonomous-dialogue-closure-loop-audit.test.ts')
    expect(coverageSource).toContain('autonomous proactive initiative stays on one same-her Phase 1 line from earliest motive pressure through self-brief, hover-first restraint, active-self rejoin, visible hold, between-turn carry, and later organic learning follow-through')
  })
})
