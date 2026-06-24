import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

interface ProviderEntryProjectStateProofRow {
  entry: string
  file: string
  snippets: readonly string[]
  runtimeFile?: string
  runtimeSnippets?: readonly string[]
}

const proofRows = [
  {
    entry: 'second-pass-provider-project-state-carry',
    file: './visible-reply/second-pass-rewrite-project-state-provider.test.ts',
    snippets: [
      'injects canonical project-state system context before second-pass one-shot generation',
      'content.includes(\'[ALICIZATION_PROJECT_STATE]\')',
      'content.includes(\'current_objective=\')',
    ],
    runtimeFile: './visible-reply/second-pass-rewrite.ts',
    runtimeSnippets: [
      'function buildSecondPassCanonicalProjectStateSystemMessages',
      '...canonicalProjectStateSystemMessages',
    ],
  },
  {
    entry: 'active-dialogue-fast-path-provider-project-state-carry',
    file: './main-chat-active-dialogue-fast-path-project-state-provider.test.ts',
    snippets: [
      'keeps canonical project-state context in compact fast-path provider messages',
      'passes compact fast-path provider messages through the one-shot project-state guard',
      'content.includes(\'project_preflight=\')',
    ],
  },
  {
    entry: 'execution-payoff-provider-project-state-carry',
    file: './execution-delivery-surface-project-state-provider.test.ts',
    snippets: [
      'keeps canonical project-state context in execution payoff provider prompts',
      'passes execution payoff provider prompts through the one-shot project-state guard',
      'content.includes(\'project_preflight=\')',
    ],
  },
  {
    entry: 'background-recovery-provider-project-state-carry',
    file: './main-chat-background-rules-project-state-provider.test.ts',
    snippets: [
      'keeps canonical project-state context intact through minimal recovery compaction and timeout one-shot recovery',
      'content.includes(\'current_objective=\')',
      'expect(canonicalProjectStateSystemMessage?.content).toBe(canonicalProjectStateBlock)',
    ],
  },
  {
    entry: 'visual-one-shot-provider-project-state-carry',
    file: './main-chat-stream-runner-visual-one-shot-project-state-provider.test.ts',
    snippets: [
      'passes visual one-shot provider messages through the one-shot project-state guard',
      'content.includes(\'project_preflight=\')',
      'content.includes(\'next_closure_target=\')',
    ],
  },
] as const satisfies readonly ProviderEntryProjectStateProofRow[]

describe('provider entry project-state proof', () => {
  it('keeps one explicit proof row for each real provider-facing route hardened in this project-state guard pass', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'second-pass-provider-project-state-carry' }),
      expect.objectContaining({ entry: 'active-dialogue-fast-path-provider-project-state-carry' }),
      expect.objectContaining({ entry: 'execution-payoff-provider-project-state-carry' }),
      expect.objectContaining({ entry: 'background-recovery-provider-project-state-carry' }),
      expect.objectContaining({ entry: 'visual-one-shot-provider-project-state-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors each provider-entry claim to the current behavior tests instead of only broader audit prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('keeps the only runtime seam in this pass explicit: second-pass rewrite now injects canonical project-state blocks before one-shot provider generation', () => {
    const secondPassRuntimeSource = readFileSync(new URL('./visible-reply/second-pass-rewrite.ts', import.meta.url), 'utf8')

    expect(secondPassRuntimeSource).toContain('function buildSecondPassCanonicalProjectStateSystemMessages')
    expect(secondPassRuntimeSource).toContain('...canonicalProjectStateSystemMessages')
  })

  it('keeps every listed provider-entry proof file present alongside the route-level runtime seam it is guarding', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)

      if (!('runtimeFile' in row) || !('runtimeSnippets' in row))
        continue

      const runtimeSource = readFileSync(new URL(row.runtimeFile, import.meta.url), 'utf8')
      expect(runtimeSource.length).toBeGreaterThan(0)
      for (const snippet of row.runtimeSnippets)
        expect(runtimeSource).toContain(snippet)
    }
  })
})
