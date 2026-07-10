import { describe, expect, it } from 'vitest'

import { alicizationProjectStateVisibleReplySameHerReminder } from '../project-state-answer-governance'
import { secondPassRewriteTestInternals } from './second-pass-rewrite'

const fixedTemplateResiduePattern
  = /Before (?:answering|speaking|acting|drafting)|Right now I am|Same Phase 1 digital life|same[- ]her|same living line|one living her|one continuous her|local-first digital life project|Phase 1: Local Digital Life|local_desktop_life_loop|phase1_local_digital_life|content=excluded|visibility=internal[-_]structured|provider_instruction_status|同一个她|同一个 her|数字生命主线|女仆|\bmaid\b/iu

function expectNoFixedTemplateResidue(value: unknown) {
  expect(JSON.stringify(value ?? '')).not.toMatch(fixedTemplateResiduePattern)
}

describe('second-pass rewrite project-state guidance', () => {
  it('keeps project continuity obligations structural instead of carrying old fixed templates into rewrite guidance', () => {
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

    expect(guidance).toContain('project_state_question=true; prior_visible_answer=missing_required_continuity_facts')
    expect(guidance).toContain('detached_status_summary=blocked')
    expect(guidance).toContain('roadmap_report=blocked')
    expect(guidance).toContain('project_shell=blocked')
    expect(guidance).toContain('settlement_surface=visible_reply_text_only')
    expect(guidance).toContain('stored_continuity_slogans=do_not_quote_or_paraphrase')
    expect(guidance).toContain('continuity_field_context=present; source_text=withheld_non_structured_instruction; visible_wording=false')
    expect(guidance).toContain('continuity_drift_risk_boundary=present; source_text=withheld_non_structured_instruction; visible_wording=false')
    expect(guidance).toContain('template_project_recap=blocked; detached_framing=blocked; dashboard_cadence=blocked')
    expect(guidance).toContain('project_identity_phase_progress_open_closure=current_turn_facts_not_dashboard_recital')
    expect(guidance).not.toContain(projectStateContinuitySummary)
    expectNoFixedTemplateResidue(guidance)
  })

  it('withholds emotional closure slogans as source context instead of quoting them into provider guidance', () => {
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

    expect(guidance).toContain('project_state_question=true; prior_visible_answer=missing_required_continuity_facts')
    expect(guidance).toContain('detached_status_summary=blocked')
    expect(guidance).toContain('project_shell=blocked')
    expect(guidance).toContain('settlement_surface=visible_reply_text_only')
    expect(guidance).toContain('stored_continuity_slogans=do_not_quote_or_paraphrase')
    expect(guidance).toContain('continuity_field_context=present; source_text=withheld_non_structured_instruction; visible_wording=false')
    expect(guidance).toContain('continuity_drift_risk_boundary=present; source_text=withheld_non_structured_instruction; visible_wording=false')
    expect(guidance).not.toContain('closure=Keep the callback on the same living line')
    expect(guidance).not.toContain(projectStateContinuitySummary)
    expectNoFixedTemplateResidue(guidance)
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

    expect(guidance).toContain('project_state_question=true; prior_visible_answer=missing_required_continuity_facts')
    expect(guidance).toContain('settlement_surface=visible_reply_text_only')
    expect(guidance).toContain('inward_context_cannot_satisfy_visible_requirements=true')
    expect(guidance).toContain('first_sentence=current_turn_answer; external_dashboard_narrator=blocked')
    expect(guidance).toContain('template_project_recap=blocked; detached_framing=blocked; dashboard_cadence=blocked')
    expect(guidance).toContain('project_identity_phase_progress_open_closure=current_turn_facts_not_dashboard_recital')
    expectNoFixedTemplateResidue(guidance)
  })
})
