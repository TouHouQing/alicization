import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'observation-fixed-project-state-residue-withheld',
    file: './project-state-observation.test.ts',
    snippets: [
      'withholds fixed project-state persona residue while preserving structured progress evidence',
      'Project-state continuity already survives into runtime preparation.',
      'Keep the still-open closure work explicit in the rebuilt continuity snapshot.',
      'expectNullish(observation?.projectState.sameHerSelfLine)',
    ],
  },
  {
    entry: 'observation-fixed-closure-copy-withheld',
    file: './project-state-observation.test.ts',
    snippets: [
      'withholds fixed pre-dialogue closure copy without dropping structured status and reasons',
      'segment=face-motion-body-rejoined-1',
      'remaining_open=lipsync+voice',
      'expectNullish(observation?.preDialogueClosure?.companionHeadlineLine)',
    ],
  },
  {
    entry: 'observation-empty-awareness-shell-backfill',
    file: './project-state-observation.test.ts',
    snippets: [
      'synthesizes structured awareness from an empty transported shell',
      'identity=project_state_owner=ProjectStateGovernance',
      'phase=runtime_context=local_runtime',
    ],
  },
  {
    entry: 'observation-continuity-behavior-without-persona-copy',
    file: './project-state-observation.test.ts',
    snippets: [
      'keeps continuity behavior fields without deriving fixed persona copy',
      'continuityRestraint',
      'continuityCadence',
    ],
  },
] as const

describe('project-state observation project awareness audit', () => {
  it('keeps route-level proof that return-side observation rebuilds structured continuity snapshots before later turns reopen', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'observation-fixed-project-state-residue-withheld' }),
      expect.objectContaining({ entry: 'observation-fixed-closure-copy-withheld' }),
      expect.objectContaining({ entry: 'observation-empty-awareness-shell-backfill' }),
      expect.objectContaining({ entry: 'observation-continuity-behavior-without-persona-copy' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the observation-to-continuity claim to current behavior tests instead of only return-side registration layers', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: project-state observation now has dedicated structured route proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const observationSource = readFileSync(new URL('./project-state-observation.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(observationSource).toContain(
      'withholds fixed pre-dialogue closure copy without dropping structured status and reasons',
    )
    expect(observationSource).toContain(
      'keeps continuity behavior fields without deriving fixed persona copy',
    )
  })
})
