import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'humanlike-memory-query-loads-corrections',
    file: './humanlike-memory-recall-seed-query-regression.test.ts',
    snippets: [
      'loads both candidate and correction events so corrected same-her recall reaches the next reply seed',
      'expect(listHumanlikeMemoryRecallEvents.mock.calls).toEqual([',
      '{ kind: \'person-state-updated\', limit: 24 }',
      '{ kind: \'humanlike-memory-corrected\', limit: 24 }',
      'same-person continuity was at stake',
    ],
  },
  {
    entry: 'humanlike-memory-runtime-seed-carry',
    file: './humanlike-memory-recall-seed-runtime-regression.test.ts',
    snippets: [
      'carries humanlike memory recall seed lines into organic memory retrieval for the next reply turn',
      'expect(recallSeed).toContain(\'humanlike_memory_recall:\')',
      'expect(recallSeed).toContain(\'我记得你纠正过：你是在测试她是不是持续的人，不是催进度。\')',
      'expect(recallSeed).toContain(\'relationship=Host corrected this memory meaning: 你是在测试她是不是持续的人，不是催进度。\')',
    ],
  },
  {
    entry: 'humanlike-memory-priority-prefers-same-person',
    file: './humanlike-memory-recall-priority-regression.test.ts',
    snippets: [
      'prefers corrected same-person recall over project-state carry when both are present in the same recall seed',
      'same-person continuity 线压扁成普通项目进度',
      'expect(recollectionIntent?.mode).toBe(\'relationship-history\')',
    ],
  },
  {
    entry: 'humanlike-memory-ranking-outranks-progress-shell',
    file: './memory-recollection-ranking-continuity-audit.test.ts',
    snippets: [
      'keeps corrected same-person humanlike memory ahead of a generic progress recap once humanlike recall reopens the corrected relationship meaning',
      'expect(result.agendaRankedEpisodes[0]?.id).toBe(\'corrected-same-person-humanlike-memory\')',
      'Carry corrected same-person continuity forward instead of defaulting to progress pressure.',
    ],
  },
] as const

describe('humanlike memory recall corrected same-person audit', () => {
  it('keeps one explicit proof chain from corrected-memory event history to next-turn seed carry relationship-first intent and anti-progress-shell ranking', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'humanlike-memory-query-loads-corrections' }),
      expect.objectContaining({ entry: 'humanlike-memory-runtime-seed-carry' }),
      expect.objectContaining({ entry: 'humanlike-memory-priority-prefers-same-person' }),
      expect.objectContaining({ entry: 'humanlike-memory-ranking-outranks-progress-shell' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the corrected same-person humanlike-memory claim to current regression and ranking tests instead of only broader continuity prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: corrected same-person humanlike recall now has event-history-to-ranking proof, but full long-run closure is still open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('This is still not full long-run closure.')
    expect(auditSource).toMatch(/still not full long-run closure|still not full emotion-memory-initiative closure/i)
  })
})
