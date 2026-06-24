import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'session-runtime-afterglow-seed',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'feeds cross-session autobiographical afterglow continuity into the next turn recall seed',
      'expect(String(organicInput?.recallSeed ?? \'\')).toContain(\'continuity_afterglow:\')',
      'expect(String(organicInput?.recallSeed ?? \'\')).toContain(\'thread=runtime seam\')',
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
    entry: 'ranking-afterglow-same-her-carry',
    file: './memory-recollection-ranking-continuity-audit.test.ts',
    snippets: [
      'keeps same-her callback afterglow memory ahead of a generic callback receipt once afterglow continuity already says the line should reopen gently',
      'expect(result.agendaRankedEpisodes[0]?.id).toBe(\'same-her-callback-afterglow\')',
      'expect(result.clusterState.dominantSummary).toContain(\'same-her callback afterglow line inward\')',
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
    entry: 'response-charter-afterglow-same-life-return',
    file: './response-charter.test.ts',
    snippets: [
      'lets initiative measured-return restraint directly keep visible reply governance lower-pressure on the same living line',
      'Project continuity is carrying a quiet same-her line inward, so visible widening should stay on that same living line until the thread naturally opens again.',
      'Keep the current reply on the same living line, let the first visible beat carry quiet same-her continuity from the inside, and wait for a more natural opening before widening warmth, payoff, or closeness.',
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

describe('callback afterglow recollection same-life audit', () => {
  it('keeps one explicit proof chain from callback afterglow recall seed through recollection, ranking, and host-visible same-life governance', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'session-runtime-afterglow-seed' }),
      expect.objectContaining({ entry: 'recollection-intent-afterglow-same-her-carry' }),
      expect.objectContaining({ entry: 'ranking-afterglow-same-her-carry' }),
      expect.objectContaining({ entry: 'answer-planner-afterglow-same-life-return' }),
      expect.objectContaining({ entry: 'response-charter-afterglow-same-life-return' }),
      expect.objectContaining({ entry: 'runtime-governance-afterglow-same-life-return' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the callback-afterglow same-life claim to current behavior tests instead of only broader same-her prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: callback-afterglow recollection now has route-level same-life proof, but full long-run closure is still open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Recollection continuity is now also better locked through visible-reply governance')
    expect(matrixSource).toContain('callback-afterglow-recollection-same-life-audit.test.ts')
    expect(auditSource).toContain('callback-afterglow-recollection-same-life-audit.test.ts')
    expect(auditSource).toMatch(/does not yet prove fully sustained noisy-desktop convergence|still .*fully sustained noisy-desktop convergence/i)
  })
})
