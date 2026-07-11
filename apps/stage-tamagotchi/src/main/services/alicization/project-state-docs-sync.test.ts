import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'

const oldProjectStateTemplatePattern
  = /local_desktop_life_loop|visibility=internal[-_]structured|surface=structured|content=excluded|pending[-_]rejoin|cross_modal_continuity_proof|project_state_continuity|life_loop_continuity|continuity_anchor=|continuity=embodiment|Same Phase 1|Before answering|Before speaking|Right now I am still holding|same-her|same her|same living line|one continuous her|What has already landed is|The still-open closure is|This reply should keep moving toward/iu

function readDoc(path: string) {
  return readFileSync(new URL(`../../../../../../docs/${path}`, import.meta.url), 'utf8')
}

function expectDocFreeOfOldTemplates(doc: string) {
  expect(doc).not.toMatch(oldProjectStateTemplatePattern)
}

describe('project-state docs sync', () => {
  it('keeps docs/project-state.md anchored to memory governance facts without old templates', () => {
    const brief = resolveAlicizationProjectStateBrief()
    const doc = readDoc('project-state.md')

    expect(doc).toContain('WorkingMemory')
    expect(doc).toContain('LongTermMemoryRecall')
    expect(doc).toContain('MemoryWorkbench')
    expect(doc).toContain('Failure surfaces must stay transparent')
    expect(doc).toContain('Do not train persona data from raw transcripts.')
    expect(doc).toContain('Do not mask provider, timeout, or tool failures with a fixed persona reply.')
    expect(brief.latestProgress).toContain('short_term_owner=WorkingMemory')
    expect(brief.latestProgress).toContain('long_term_recall_owner=LongTermMemoryRecall')
    expectDocFreeOfOldTemplates(doc)
  })

  it('keeps project-state audit docs short, actionable, and free of old templates', () => {
    const audit = readDoc('project-state-audit.md')
    const matrix = readDoc('pre-dialogue-project-awareness-matrix.md')

    for (const doc of [audit, matrix]) {
      expect(doc).toContain('WorkingMemory')
      expect(doc).toContain('LongTermMemoryRecall')
      expect(doc).toContain('Memory')
      expectDocFreeOfOldTemplates(doc)
    }
    expect(audit).toContain('Sanitizers may identify old template residue')
    expect(matrix).toContain('This matrix now records governance boundaries')
  })

  it('keeps canonical brief outputs free of old docs/cue templates', () => {
    const brief = resolveAlicizationProjectStateBrief()

    expect(JSON.stringify({
      latestProgress: brief.latestProgress,
      preflightSummary: brief.preflightSummary,
      preDialogueAwarenessLine: brief.preDialogueAwarenessLine,
      continuityProgressSummary: brief.continuityProgressSummary,
      memoryAnthropomorphismProgress: brief.memoryAnthropomorphismProgress,
      openLoops: brief.openLoops,
      nextClosureTarget: brief.nextClosureTarget,
    })).not.toMatch(oldProjectStateTemplatePattern)
  })
})
