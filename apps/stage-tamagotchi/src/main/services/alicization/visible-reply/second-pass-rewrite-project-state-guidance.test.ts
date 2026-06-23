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

  it('makes final semantic-judge project-state failures visible-output obligations instead of only inward context', () => {
    const guidance = secondPassRewriteTestInternals.buildProjectStateRewriteGuidance({
      projectStateRewriteRequired: true,
      projectStateSameHerRewriteRequired: true,
      sameThreadContinuationRewriteGuidanceRequired: false,
      sameHerProjectFollowThroughRewrite: false,
      projectStateSameHerSelfLine: 'Same Phase 1 digital life; this answer must land as one continuous her.',
      projectStateCarryInwardLine: 'Do not let the provider return only a short comfort sentence.',
      projectStateSameHerDriftRisk: 'If the visible reply omits same-her, Phase 1, and still-open closure, final settlement will block the turn.',
      projectStatePreDialogueAwarenessLine: 'Before speaking, keep the same local-first digital life project in view.',
      projectStateContinuitySummary: 'same-her=same digital life | phase=Phase 1: Local Digital Life | open=memory loop is still not closed | next=prove the real UI/Pinia/database memory loop',
    })

    expect(guidance).toContain('Final settlement will judge only the visible reply text after this rewrite.')
    expect(guidance).toContain('The visible reply itself must naturally include same-her continuity, Phase 1/current phase, still-open closure, and concrete current-turn payoff.')
    expect(guidance).toContain('Do not rely on thought, performance, projectState fields, or inward context to satisfy these items.')
  })
})
