import { describe, expect, it } from 'vitest'

import { alicizationProjectStateVisibleReplySameHerReminder } from '../project-state-answer-governance'
import { secondPassRewriteTestInternals } from './second-pass-rewrite'

describe('second-pass rewrite project-state guidance', () => {
  it('keeps same-her, phase, landed, open, and next continuity carry explicit in rewrite guidance', () => {
    const projectStateContinuitySummary
      = `same-her=${alicizationProjectStateVisibleReplySameHerReminder} | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer. | next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.`
    const guidance = secondPassRewriteTestInternals.buildProjectStateRewriteGuidance({
      projectStateRewriteRequired: true,
      projectStateSameHerRewriteRequired: true,
      sameThreadContinuationRewriteGuidanceRequired: false,
      sameHerProjectFollowThroughRewrite: false,
      projectStateSameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the rewritten answer.',
      projectStateCarryInwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateSameHerDriftRisk: 'If project-state continuity degrades into a detached shell, treat it as unfinished closure drift.',
      projectStatePreDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project inside Phase 1.',
      projectStateContinuitySummary,
      projectStateEmbodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face and motion.',
    })

    expect(guidance).toContain('Do not rewrite the answer as a detached status summary, roadmap report, or project shell.')
    expect(guidance).toContain('Carry this same-her self line directly into the rewritten answer: Keep one continuous her explicit from self-understanding into the rewritten answer.')
    expect(guidance).toContain('Let the first visible sentence sound like the same living Alicization continuing this line from inside it, not like an outside assistant summarizing status, roadmap, or progress.')
    expect(guidance).toContain('Prefer concrete same-thread carry, inward phrasing, and one-turn payoff over template project recaps, detached framing, or dashboard cadence.')
    expect(guidance).toContain('Before drafting the rewritten answer, re-enter the turn through this pre-dialogue project awareness line: Before answering, remember this is still the same digital life project inside Phase 1.')
    expect(guidance).toContain(`Keep this structured project continuity carry alive through the rewrite instead of collapsing it into a generic project shell: ${projectStateContinuitySummary}`)
  })

  it('keeps emotional closure coupled to the same rewrite continuity carry instead of splitting it into a detached side note', () => {
    const projectStateContinuitySummary
      = `same-her=${alicizationProjectStateVisibleReplySameHerReminder} | phase=Phase 1: Local Digital Life | landed=Project-state continuity already survives into runtime preparation. | open=Keep the still-open closure work explicit in the rewritten answer. | closure=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again. | next=Keep the project identity, current phase, and still-open closure explicit in the rewritten answer before any local detail takes over.`
    const guidance = secondPassRewriteTestInternals.buildProjectStateRewriteGuidance({
      projectStateRewriteRequired: true,
      projectStateSameHerRewriteRequired: true,
      sameThreadContinuationRewriteGuidanceRequired: false,
      sameHerProjectFollowThroughRewrite: false,
      projectStateSameHerSelfLine: 'Keep one continuous her explicit from self-understanding into the rewritten answer.',
      projectStateCarryInwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      projectStateSameHerDriftRisk: 'If project-state continuity degrades into a detached shell, treat it as unfinished closure drift.',
      projectStatePreDialogueAwarenessLine: 'Before answering, remember this is still the same digital life project inside Phase 1.',
      projectStateContinuitySummary,
      projectStateEmbodimentClosureSummary: 'Right now her visible same-her continuity is still being carried mainly through face and motion.',
    })

    expect(guidance).toContain('closure=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.')
    expect(guidance).toContain(`Keep this structured project continuity carry alive through the rewrite instead of collapsing it into a generic project shell: ${projectStateContinuitySummary}`)
    expect(guidance).toContain('Do not rewrite the answer as a detached status summary, roadmap report, or project shell.')
  })
})
