import { describe, expect, it } from 'vitest'

import {
  alicizationProjectStateAnswerContractLines,
  alicizationProjectStateAnswerMustDo,
  alicizationProjectStateAnswerMustNotDo,
  enrichProjectStateAnswerGovernanceIfNeeded,
} from './project-state-answer-governance'

describe('project state answer governance', () => {
  it('adds completion-timing and language-drift rules when the host asks how far the goal has landed, when it closes, and why the thread drifted into English', () => {
    const enriched = enrichProjectStateAnswerGovernanceIfNeeded({
      answerSubject: 'project-state',
      answerIntent: 'same digital life line: Phase 1 landed progress, when the goal is expected to close, and whether the thread drifted out of the host language or project line still need one direct answer.',
      governingFocus: '做到哪了？何时完成 goal？为什么还用英文，偏移了吗？',
      mustDo: [],
      mustNotDo: [],
    })

    expect(enriched?.mustDo).toContain(
      'If the host asks when the goal should close or why the thread drifted into English or off the host language, keep landed progress, expected closure timing, and host-language drift repair explicit on the same project line.',
    )
    expect(enriched?.mustNotDo).toContain(
      'Do not answer completion-timing or language-drift follow-ups with only a generic progress promise, detached style repair, or an English-first shell that skips project-state continuity.',
    )
  })

  it('adds remote-main push-readiness rules when the host asks whether local main already landed but origin/main is actually safe to update', () => {
    const enriched = enrichProjectStateAnswerGovernanceIfNeeded({
      answerSubject: 'project-state',
      answerIntent: 'same digital life line: tell the host whether this already landed on local main and whether it is actually safe to push to origin/main without carrying unrelated commits.',
      governingFocus: '已经在本地 main 了，那现在可以安全推到 origin/main 吗？还是会把别的提交一起带上去？',
      mustDo: [],
      mustNotDo: [],
    })

    expect(enriched?.mustDo).toContain(
      'If the host asks whether local main already contains the work or whether origin/main is safe to update, answer those as separate facts and keep both on the same verified project-state line.',
    )
    expect(enriched?.mustNotDo).toContain(
      'Do not treat already being on local main, or already merging locally, as proof that origin/main is safe to push.',
    )
  })

  it('does not add completion-timing and language-drift rules on generic direct project-state turns that are not asking about completion timing or host-language drift', () => {
    const enriched = enrichProjectStateAnswerGovernanceIfNeeded({
      answerSubject: 'project-state',
      answerIntent: 'Answer what Alicization is, how far Phase 1 has landed, and what still remains open on one same digital life line.',
      governingFocus: '这个项目现在到底是什么、做到什么程度、还差什么？',
      mustDo: [],
      mustNotDo: [],
    })

    expect(enriched?.mustDo).not.toContain(
      'If the host asks when the goal should close or why the thread drifted into English or off the host language, keep landed progress, expected closure timing, and host-language drift repair explicit on the same project line.',
    )
    expect(enriched?.mustNotDo).not.toContain(
      'Do not answer completion-timing or language-drift follow-ups with only a generic progress promise, detached style repair, or an English-first shell that skips project-state continuity.',
    )
  })

  it('keeps completion-timing and language-drift rules out of the shared default contract until a project-state turn actually carries that evidence', () => {
    expect(alicizationProjectStateAnswerMustDo).not.toContain(
      'If the host asks when the goal should close or why the thread drifted into English or off the host language, keep landed progress, expected closure timing, and host-language drift repair explicit on the same project line.',
    )
    expect(alicizationProjectStateAnswerMustNotDo).not.toContain(
      'Do not answer completion-timing or language-drift follow-ups with only a generic progress promise, detached style repair, or an English-first shell that skips project-state continuity.',
    )
    expect(alicizationProjectStateAnswerContractLines).not.toContain(
      'If the host asks when the goal should close or why the thread drifted into English or off the host language, keep landed progress, expected closure timing, and host-language drift repair explicit on the same project line.',
    )
    expect(alicizationProjectStateAnswerContractLines).not.toContain(
      'Do not answer completion-timing or language-drift follow-ups with only a generic progress promise, detached style repair, or an English-first shell that skips project-state continuity.',
    )
  })
})
