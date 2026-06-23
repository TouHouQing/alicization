import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'recollection-intent-project-state-same-her-carry',
    file: './memory-search-retrieval-operators.test.ts',
    snippets: [
      'keeps Phase 1 project-state same-her closure visible when continuity project state already carries the unfinished line',
      'continuity_project_state: label=project-aware-return',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    ],
  },
  {
    entry: 'recollection-intent-afterthought-same-her-carry',
    file: './memory-search-retrieval-operators.test.ts',
    snippets: [
      'keeps inward same-her callback recollection carry visible when mirror recollection afterthought already marks it ripe',
      'mirror_recollection_afterthought: mode=execution-procedure',
      'Keep the same-her callback closure line inward until there is more room. surface=inward',
    ],
  },
  {
    entry: 'recollection-intent-afterglow-same-her-carry',
    file: './memory-search-retrieval-operators.test.ts',
    snippets: [
      'keeps same-her callback afterglow carry visible when continuity afterglow already says the line should reopen gently instead of from scratch',
      'continuity_afterglow: label=afterglow:execution-callback:lower-pressure',
      'Keep the same-her callback afterglow line inward until there is more room before widening outward again.',
    ],
  },
  {
    entry: 'recollection-intent-cadence-room-first-carry',
    file: './memory-search-retrieval-operators.test.ts',
    snippets: [
      'keeps cadence reconfirmation continuity visible when measured-return room-first carry is already in the recall seed',
      'continuity_cadence_reconfirmation: label=relationship:cadence-reconfirmation',
      'keep the relationship return measured until the surface fully cools',
    ],
  },
  {
    entry: 'ranking-project-state-same-her-carry',
    file: './memory-recollection-ranking-continuity-audit.test.ts',
    snippets: [
      'keeps project-state same-her closure memory ahead of a generic project recap once continuity project state already reopened the unfinished line',
      'expect(result.agendaRankedEpisodes[0]?.id).toBe(\'same-her-project-state-closure\')',
      'expect(result.clusterState.dominantSummary).toContain(\'Same Phase 1 digital life\')',
    ],
  },
  {
    entry: 'ranking-afterthought-same-her-carry',
    file: './memory-recollection-ranking-continuity-audit.test.ts',
    snippets: [
      'keeps inward same-her callback afterthought memory ahead of a generic callback receipt once the ripe recollection line is reopened',
      'expect(result.agendaRankedEpisodes[0]?.id).toBe(\'same-her-callback-afterthought\')',
      'expect(result.clusterState.dominantSummary).toContain(\'same-her callback closure line inward\')',
    ],
  },
  {
    entry: 'ranking-afterglow-same-her-carry',
    file: './memory-recollection-ranking-continuity-audit.test.ts',
    snippets: [
      'keeps same-her callback afterglow memory ahead of a generic callback receipt once afterglow continuity already says the line should reopen gently',
      'expect(result.agendaRankedEpisodes[0]?.id).toBe(\'same-her-callback-afterglow\')',
      'expect(result.clusterState.dominantSummary).toContain(\'same-her callback afterglow line inward\')',
    ],
  },
  {
    entry: 'ranking-cadence-room-first-carry',
    file: './memory-recollection-ranking-continuity-audit.test.ts',
    snippets: [
      'keeps measured-return room-first cadence memory ahead of warmth-first reopenings once cadence reconfirmation is explicit',
      'expect(result.agendaRankedEpisodes[0]?.id).toBe(\'measured-return-room-first\')',
      'expect(result.clusterState.dominantSummary).toContain(\'kept repair ahead of closeness\')',
    ],
  },
  {
    entry: 'answer-planner-same-life-project-closure',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps recalled same-her project-closure callback memory ahead of a generic callback shell in final reply planning',
      'expect(planner.openingMove).toContain(\'same living line first\')',
      'Keep the callback return shaped like the same local digital life thread, not a detached utility notice.',
    ],
  },
  {
    entry: 'answer-planner-corrected-same-person-return',
    file: './answer-planner-corrected-same-person-regression.test.ts',
    snippets: [
      'keeps corrected same-person continuity ahead of progress-pressure continuation in reply planning',
      'expect(planner.openingMove).toContain(\'corrected same-person line first\')',
      'expect(planner.answerIntent).toContain(\'corrected same-person continuity\')',
      'Do not let this answer flatten into a generic task shell, detached project-summary voice, or external status-report cadence.',
    ],
  },
  {
    entry: 'answer-planner-afterglow-same-life-return',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps digest-only same-her quiet carry authority in reply planning even when the runtime surface stays thin',
      'openingBeat: \'Stay on the same lower-pressure line first.\'',
      'Continue the same quiet line as the same her, with lower-pressure room-first restraint.',
    ],
  },
  {
    entry: 'current-conscious-frame-inward-recollection-carry',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps internal-only recollection inward inside the current conscious frame until the host has room for it',
      'When the current payoff still needs the foreground, keep recollection inward until the host has room for it.',
      'expect(frame?.speakingIntention?.toLowerCase()).toContain(\'live payoff\')',
    ],
  },
  {
    entry: 'current-conscious-frame-remembered-seam-more-room-reinterpretation',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'reinterprets remembered-seam conscious need when newer relationship learning says the earlier reopen was too eager',
      'expect(frame?.consciousNeed).toContain(\'keep more room this time\')',
      'expect(frame?.consciousNeed).toContain(\'same eagerness as before\')',
      'expect(frame?.reasonTags).toContain(\'remembered-seam:reinterpret-with-more-room\')',
    ],
  },
  {
    entry: 'current-conscious-frame-remembered-seam-hold-detail-carry',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'threads remembered-seam more-room continuity into project-state hold detail when the finer cue only survives in long-horizon memory',
      'The same remembered seam is back, but this time it needs more room.',
      'Recognize the same remembered seam, but this time keep more room before leaning in again.',
      'expect(frame?.projectState?.sameHerHoldDetail).toContain(\'keep more room this time\')',
    ],
  },
  {
    entry: 'current-conscious-frame-canonical-inwardline-memory-carry',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'prefers canonical inwardLine memory carry over the generic fallback when recollection should stay inward',
      'expect(frame?.consciousNeed?.toLowerCase()).toContain(\'keep this remembered seam inward until the live reunion lands\')',
      'expect(frame?.reasonTags).toContain(\'continuity-timing:next-open-window\')',
      'Keep this remembered seam inward until the live reunion lands and the host has more room.',
    ],
  },
  {
    entry: 'response-charter-same-life-visible-reply',
    file: './response-charter.test.ts',
    snippets: [
      'Keep the visible answer on one same-her digital-life line so the project update lands as this living continuity, not as a detached summary voice.',
      'Do not let the visible answer flatten into a generic task shell, detached project narration, or external project-summary cadence.',
      'one same living line',
    ],
  },
  {
    entry: 'response-charter-corrected-same-person-visible-reply',
    file: './response-charter.test.ts',
    snippets: [
      'keeps host-corrected same-person continuity explicit in visible reply discipline instead of letting the charter fall back to progress-pressure continuation',
      'If the host corrected the relationship meaning, keep that corrected same-person continuity authoritative before any progress-style continuation.',
      'Do not reopen the turn as generic progress pressure, status recap, or task-shell continuity after the host corrected it back toward same-person continuity.',
    ],
  },
  {
    entry: 'response-charter-afterglow-same-life-return',
    file: './response-charter.test.ts',
    snippets: [
      'lets initiative measured-return restraint directly keep visible reply governance lower-pressure on the same living line',
      'Project continuity is carrying a quiet same-her line inward, so visible widening should stay on that same living line until the thread naturally opens again.',
      'Keep the current reply on the same living line, let the first visible beat carry quiet same-her continuity from the inside, and wait for a more natural opening before widening warmth, payoff, or closeness.',
    ],
  },
  {
    entry: 'visible-reply-semantic-judge-inward-recollection-carry',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags visible recollection leakage when runtime already requires recollection to stay inward until the live payoff lands even without an explicit memory gate',
      'semantic-judge:memory-inward-carry-broken',
      'Keep recollection inward and let the live payoff land before remembered continuity comes forward.',
    ],
  },
  {
    entry: 'visible-reply-semantic-judge-corrected-same-person-progress-pressure-return',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags progress-recap fallback when runtime carried host-corrected same-person continuity into the visible reply turn',
      'semantic-judge:corrected-same-person-progress-pressure-return',
      'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
    ],
  },
  {
    entry: 'visible-reply-semantic-judge-resume-confirmation-boundary-return',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags callback wording that widens one host-confirmed resume into standing execution permission',
      'semantic-judge:resume-confirmation-boundary-widened',
      'One confirmed resume must not widen into permanent execution permission or generic autonomous continuation.',
    ],
  },
  {
    entry: 'visible-reply-critic-inward-recollection-carry',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when visible recollection leaks even without an explicit memory gate once runtime already requires inward recollection carry',
      'semantic-judge:memory-inward-carry-broken',
      'Keep recollection inward until the host has room for it, and let the live payoff land first.',
    ],
  },
  {
    entry: 'visible-reply-critic-corrected-same-person-progress-pressure-return',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires rewrite when the reply falls back to progress recap after runtime carried host-corrected same-person continuity into this turn',
      'semantic-judge:corrected-same-person-progress-pressure-return',
      'progress-recap fallback that overwrites a host-corrected same-person continuity line',
      'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.',
    ],
  },
  {
    entry: 'visible-reply-critic-resume-confirmation-boundary-return',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires rewrite when callback wording widens one host-confirmed resume into standing execution permission',
      'semantic-judge:resume-confirmation-boundary-widened',
      'callback wording that widens one host-confirmed resume into standing execution permission or reusable autonomous continuation',
      'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
    ],
  },
  {
    entry: 'runtime-governance-same-life-rewrite-preserve',
    file: './runtime-governance.test.ts',
    snippets: [
      'same-her=answer project-state status from one same-her continuity, not as a detached shell',
      'keep one measured-return, repair-before-closeness, or rest-protective quiet-companionship same living thread across renderer output',
      'opening-guidance-lower-pressure',
    ],
  },
  {
    entry: 'runtime-governance-resume-confirmation-boundary-preserve',
    file: './runtime-governance.test.ts',
    snippets: [
      'preserves host-confirmed resume confirmation boundary carry inside governed rewrite requests before generic callback guidance can widen it',
      'expect(governed.overrideClass).toBe(\'hard-override\')',
      'expect(mustPreserve.some(item => item.startsWith(\'hold=same-her hold: execution-resume-confirmation approval=host-confirmed\'))).toBe(true)',
      'expect(mustPreserve.some(item => item.includes(\'host-confirmed-before-redispatch\'))).toBe(true)',
      'expect(mustPreserve.some(item => item.includes(\'resume-before-dispatch\'))).toBe(true)',
    ],
  },
  {
    entry: 'runtime-governance-afterglow-same-life-return',
    file: './runtime-governance.test.ts',
    snippets: [
      'keeps measured-return embodiment authority when governance-normalized callback continuity is already on the same living line',
      'recallMode: \'callback-afterglow\'',
      'summary: \'Measured warmth is holding because the return should stay lower-pressure.\'',
    ],
  },
] as const

describe('recollection visible reply same-life audit', () => {
  it('keeps one explicit proof chain from recollection continuity carry through ranking and visible-reply governance so same-life closure does not collapse back into a generic shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'recollection-intent-project-state-same-her-carry' }),
      expect.objectContaining({ entry: 'recollection-intent-afterthought-same-her-carry' }),
      expect.objectContaining({ entry: 'recollection-intent-afterglow-same-her-carry' }),
      expect.objectContaining({ entry: 'recollection-intent-cadence-room-first-carry' }),
      expect.objectContaining({ entry: 'ranking-project-state-same-her-carry' }),
      expect.objectContaining({ entry: 'ranking-afterthought-same-her-carry' }),
      expect.objectContaining({ entry: 'ranking-afterglow-same-her-carry' }),
      expect.objectContaining({ entry: 'ranking-cadence-room-first-carry' }),
      expect.objectContaining({ entry: 'answer-planner-same-life-project-closure' }),
      expect.objectContaining({ entry: 'answer-planner-corrected-same-person-return' }),
      expect.objectContaining({ entry: 'answer-planner-afterglow-same-life-return' }),
      expect.objectContaining({ entry: 'current-conscious-frame-inward-recollection-carry' }),
      expect.objectContaining({ entry: 'current-conscious-frame-remembered-seam-more-room-reinterpretation' }),
      expect.objectContaining({ entry: 'current-conscious-frame-remembered-seam-hold-detail-carry' }),
      expect.objectContaining({ entry: 'current-conscious-frame-canonical-inwardline-memory-carry' }),
      expect.objectContaining({ entry: 'response-charter-same-life-visible-reply' }),
      expect.objectContaining({ entry: 'response-charter-corrected-same-person-visible-reply' }),
      expect.objectContaining({ entry: 'response-charter-afterglow-same-life-return' }),
      expect.objectContaining({ entry: 'visible-reply-semantic-judge-inward-recollection-carry' }),
      expect.objectContaining({ entry: 'visible-reply-semantic-judge-corrected-same-person-progress-pressure-return' }),
      expect.objectContaining({ entry: 'visible-reply-semantic-judge-resume-confirmation-boundary-return' }),
      expect.objectContaining({ entry: 'visible-reply-critic-inward-recollection-carry' }),
      expect.objectContaining({ entry: 'visible-reply-critic-corrected-same-person-progress-pressure-return' }),
      expect.objectContaining({ entry: 'visible-reply-critic-resume-confirmation-boundary-return' }),
      expect.objectContaining({ entry: 'runtime-governance-same-life-rewrite-preserve' }),
      expect.objectContaining({ entry: 'runtime-governance-resume-confirmation-boundary-preserve' }),
      expect.objectContaining({ entry: 'runtime-governance-afterglow-same-life-return' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the recollection-to-visible-reply same-life claim to current tests instead of only broader same-her prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: recollection continuity is now better locked through visible-reply governance, but full long-run convergence is still open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('It still needs stronger sustained proof across longer-lived desktop runs and more organic cross-modal drift.')
    expect(auditSource).toMatch(/does not yet prove fully sustained noisy-desktop convergence|still .*fully sustained noisy-desktop convergence/i)
  })
})
