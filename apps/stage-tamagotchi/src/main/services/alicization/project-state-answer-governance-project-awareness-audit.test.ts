import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'governance-authority-closure-readiness-rules',
    file: './project-state-answer-governance.ts',
    snippets: [
      'If the host asks whether the work is merge-ready, complete, or closed, separate what is already verified from what is still unproven or still open.',
      'Do not claim merge-readiness, full closure, or goal completion unless the current evidence already proves it.',
      'carriesProjectStateClosureReadinessEvidence',
    ],
  },
  {
    entry: 'active-dialogue-fast-path-closure-readiness-follow-up',
    file: './main-chat-active-dialogue-loop.test.ts',
    snippets: [
      'treats merge-readiness and goal-closure follow-ups as the same project-state same-her line instead of a detached status shell',
      'project-state-closure-readiness-follow-up',
      'injects merge-readiness proof discipline into compact fast-path prompts when the project-state follow-up asks whether main merge or goal closure is actually ready',
    ],
  },
  {
    entry: 'executive-answer-brief-closure-readiness-governance',
    file: './executive-answer-brief.test.ts',
    snippets: [
      'treats merge-readiness and can-main questions as project-state direct-answer turns that must keep verified and still-open closure separate',
      'still treats merge-readiness follow-ups as project-state direct-answer turns even when focus was not explicitly pre-labeled as project-state',
      'Do not claim merge-readiness, full closure, or goal completion unless the current evidence already proves it.',
    ],
  },
  {
    entry: 'session-runtime-provider-facing-closure-readiness-governance',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'keeps merge-readiness and goal-closure governance rules when rebuilding a project-state contract',
      'keeps merge-readiness and goal-closure governance rules when normalizing a project-state contract',
      'Tell the host whether this can merge to main now and what still remains open before the goal is closed.',
    ],
  },
  {
    entry: 'host-visible-normalization-closure-readiness-boundary',
    file: './runtime-governance-project-awareness-route.test.ts',
    snippets: [
      'keeps merge-readiness project-state audit boundaries explicit when host-visible normalization rebuilds the reply payload',
      'Verified now: the runtime contract already keeps merge-readiness governance rules explicit through rebuild and normalization.',
      'Still open: host-visible continuity still needs to keep verified proof separate from what is still open before claiming merge readiness.',
    ],
  },
] as const

const completionTimelineAndLanguageDriftProofRows = [
  {
    entry: 'semantics-completion-timing-language-drift-classification',
    file: './dialogue-turn-semantics.test.ts',
    snippets: [
      'treats completion-timing and language-drift complaints as the same project-state continuity line instead of detached style repair',
      '计划什么时候完成这个 goal',
      '为什么一直用英文不用中文，是不是偏移了？',
    ],
  },
  {
    entry: 'active-dialogue-fast-path-completion-timing-language-drift-follow-up',
    file: './main-chat-active-dialogue-loop.test.ts',
    snippets: [
      'treats completion-timing and language-drift follow-ups as the same project-state same-her line instead of detached style repair',
      '做到哪了？何时完成goal？为什么还用英文，偏移了吗？',
      'project-state-same-her-continuity-required',
    ],
  },
  {
    entry: 'answer-planner-completion-timing-language-drift-fail-closed',
    file: './answer-planner.test.ts',
    snippets: [
      'also fails closed to the same-her project-state line during reply planning when the host asks how far the goal has landed, when it closes, and whether the thread drifted into English or off-project wording',
      'expect(planner.governingFocus).toContain(\'goal is expected to close\')',
      'expect(planner.answerIntent).toMatch(/same digital life line/i)',
    ],
  },
  {
    entry: 'response-charter-completion-timing-language-drift-fails-closed',
    file: './response-charter.test.ts',
    snippets: [
      'also fails closed into same-her project-state discipline when the host asks how far the goal has landed, when it closes, and whether the thread drifted into English or off-project wording',
      'Keep the project answer on one continuous living line: answer the live project knot first, then only widen if the same turn still has room.',
      'Do not let an already-explicit same-her project continuity turn flatten into detached project narration, fresh-opening posture, or generic project-shell phrasing.',
    ],
  },
  {
    entry: 'executive-answer-brief-completion-timing-language-drift-governance',
    file: './executive-answer-brief.test.ts',
    snippets: [
      'still treats completion-timing and language-drift follow-ups as project-state direct-answer turns even when focus was not explicitly pre-labeled as project-state',
      '做到哪了？何时完成 goal？为什么还用英文，偏移了吗？',
      'Answer project-state questions from one same-her continuity instead of a detached project narrator shell.',
    ],
  },
  {
    entry: 'session-runtime-provider-facing-completion-timing-language-drift-governance',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'keeps completion-timing and language-drift governance rules when rebuilding a project-state contract',
      'keeps completion-timing and language-drift governance rules when normalizing a project-state contract',
      'how far the goal has landed, when it is expected to close, and whether the thread drifted into English or off the same project line',
    ],
  },
  {
    entry: 'host-visible-normalization-completion-timing-language-drift-boundary',
    file: './runtime-governance-project-awareness-route.test.ts',
    snippets: [
      'keeps completion-timing and language-drift project-state audit boundaries explicit when host-visible normalization rebuilds the reply payload',
      'Verified now: the runtime contract already keeps current landed progress explicit through rebuild and normalization.',
      'Before answering how far this has landed, when the goal is expected to close, and why the thread drifted into English, remember what is already verified, what still remains open, and return on the same project line in the host language.',
    ],
  },
] as const

describe('project state answer governance project awareness audit', () => {
  it('keeps one explicit route-level proof that project-state answer governance preserves same-her merge-readiness boundaries across authority, fast-path follow-up classification, provider-facing rebuild, executive answer briefing, and host-visible normalization', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'governance-authority-closure-readiness-rules' }),
      expect.objectContaining({ entry: 'active-dialogue-fast-path-closure-readiness-follow-up' }),
      expect.objectContaining({ entry: 'executive-answer-brief-closure-readiness-governance' }),
      expect.objectContaining({ entry: 'session-runtime-provider-facing-closure-readiness-governance' }),
      expect.objectContaining({ entry: 'host-visible-normalization-closure-readiness-boundary' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the project-state answer-governance claim to current behavior tests instead of only shared registration or candidate-scan prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('keeps one explicit route-level proof that project-state answer governance preserves same-her completion-timing and language-drift follow-ups across semantics classification, fast-path follow-up classification, answer planning, response charter shaping, executive answer briefing, provider-facing runtime rebuild, and host-visible normalization', () => {
    expect(completionTimelineAndLanguageDriftProofRows).toEqual([
      expect.objectContaining({ entry: 'semantics-completion-timing-language-drift-classification' }),
      expect.objectContaining({ entry: 'active-dialogue-fast-path-completion-timing-language-drift-follow-up' }),
      expect.objectContaining({ entry: 'answer-planner-completion-timing-language-drift-fail-closed' }),
      expect.objectContaining({ entry: 'response-charter-completion-timing-language-drift-fails-closed' }),
      expect.objectContaining({ entry: 'executive-answer-brief-completion-timing-language-drift-governance' }),
      expect.objectContaining({ entry: 'session-runtime-provider-facing-completion-timing-language-drift-governance' }),
      expect.objectContaining({ entry: 'host-visible-normalization-completion-timing-language-drift-boundary' }),
    ])

    expect(completionTimelineAndLanguageDriftProofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the completion-timing and language-drift governance claim to current behavior tests instead of only merge-readiness proof or broader project-status prose', () => {
    for (const row of completionTimelineAndLanguageDriftProofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current project-state answer-governance routes now keep merge-readiness and closure-readiness follow-ups on the same same-her project-state line, while future project-status answer surfaces still remain open', () => {
    const governanceSource = readFileSync(new URL('./project-state-answer-governance.ts', import.meta.url), 'utf8')
    const activeDialogueSource = readFileSync(new URL('./main-chat-active-dialogue-loop.test.ts', import.meta.url), 'utf8')
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.test.ts', import.meta.url), 'utf8')
    const runtimeGovernanceSource = readFileSync(new URL('./runtime-governance-project-awareness-route.test.ts', import.meta.url), 'utf8')
    const executiveBriefSource = readFileSync(new URL('./executive-answer-brief.test.ts', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')

    expect(governanceSource).toContain('Do not claim merge-readiness, full closure, or goal completion unless the current evidence already proves it.')
    expect(activeDialogueSource).toContain('project-state-closure-readiness-follow-up')
    expect(sessionRuntimeSource).toContain('keeps completion-timing and language-drift governance rules when rebuilding a project-state contract')
    expect(runtimeGovernanceSource).toContain('mind-authored-project-state-merge-readiness')
    expect(runtimeGovernanceSource).toContain('mind-authored-project-state-completion-timing-language-drift')
    expect(executiveBriefSource).toContain('still treats completion-timing and language-drift follow-ups as project-state direct-answer turns even when focus was not explicitly pre-labeled as project-state')
    expect(coverageSource).toContain('project-state-answer-governance-project-awareness-audit.test.ts')
    expect(coverageSource).toContain('future project-status answer surfaces still need explicit classification')
    expect(coverageSource).toContain('completion-timing / language-drift follow-ups')
    expect(matrixSource).toContain('project-state-answer-governance-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('completion-timing / language-drift follow-ups')
    expect(matrixSource).toContain('semantics classification, answer planning, response charter shaping, executive answer briefing, provider-facing runtime rebuild, and host-visible normalization')
    expect(matrixSource).toContain('future project-status answer surfaces still need explicit classification')
  })
})
