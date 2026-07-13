import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const repositoryRoot = resolve(import.meta.dirname, '../../../../../..')

function readRepositoryFile(path: string) {
  return readFileSync(resolve(repositoryRoot, path), 'utf8')
}

const memoryDialogueCoverage = [
  {
    boundary: 'working-memory-owner',
    file: 'apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-owner-context.ts',
    required: [
      'version: \'working-memory-owner-context-v1\'',
      'owner: \'working-memory\'',
    ],
  },
  {
    boundary: 'long-term-recall-owner',
    file: 'apps/stage-tamagotchi/src/main/services/alicization/long-term-memory-recall.ts',
    required: [
      'export interface LongTermMemoryRecallIntent',
      'rankReasons: string[]',
      '\'owner=LongTermMemoryRecall\'',
    ],
  },
  {
    boundary: 'typed-memory-provider-context',
    file: 'apps/stage-tamagotchi/src/main/services/alicization/main-chat-memory-context.ts',
    required: [
      'longTermRecall: AlicizationLongTermMemoryRecallProviderContext | null',
      'availableLongTermEvidenceIds: string[]',
      'const workingMemory = normalizeWorkingMemoryProviderContext(input.workingMemory)',
    ],
  },
  {
    boundary: 'provider-owned-tool-payoff',
    file: 'apps/stage-tamagotchi/src/main/services/alicization/execution-delivery-surface.ts',
    required: [
      'status: \'pending-provider-settlement\'',
      'reason: \'missing-provider-reply\'',
      'source: \'llm\'',
    ],
  },
  {
    boundary: 'transparent-failure-surface',
    file: 'packages/stage-shared/src/alicization-chat-failure-surface.ts',
    required: [
      'origin: \'failure-surface\'',
      'allowLongTermCondensation: false',
      'allowPersonaLearning: false',
      'allowTraining: false',
    ],
  },
  {
    boundary: 'failure-learning-exclusion',
    file: 'apps/stage-tamagotchi/src/main/services/alicization/life-core/working-memory-policy.ts',
    required: [
      'const providerAuthored = input.origin === \'provider\'',
      'allowLongTermCondensation: false',
      'allowPersonaLearning: false',
    ],
  },
] as const

describe('memory-owned dialogue coverage matrix', () => {
  it('anchors the user-facing dialogue loop to concrete owner and failure boundaries', () => {
    expect(memoryDialogueCoverage.map(row => row.boundary)).toEqual([
      'working-memory-owner',
      'long-term-recall-owner',
      'typed-memory-provider-context',
      'provider-owned-tool-payoff',
      'transparent-failure-surface',
      'failure-learning-exclusion',
    ])

    for (const row of memoryDialogueCoverage) {
      const source = readRepositoryFile(row.file)
      for (const requiredSnippet of row.required)
        expect(source, `${row.boundary}:${row.file}`).toContain(requiredSnippet)
    }
  })

  it('does not revive the removed project-state reply-governance coverage matrix', () => {
    const source = readRepositoryFile(
      'apps/stage-tamagotchi/src/main/services/alicization/project-awareness-coverage-matrix.test.ts',
    )

    const removedFixtureMarkers = [
      ['active', 'dialogue', 'fast', 'path'].join('-'),
      ['project', 'state', 'system', 'block', 'injection'].join('-'),
      ['visible', 'reply', 'same', 'her'].join('-'),
      ['Phase', '1', 'landed', 'progress'].join(' '),
      ['initiative', 'gap=proactive', 'continuity', 'loop'].join('_'),
    ]

    for (const marker of removedFixtureMarkers)
      expect(source).not.toContain(marker)
  })
})
