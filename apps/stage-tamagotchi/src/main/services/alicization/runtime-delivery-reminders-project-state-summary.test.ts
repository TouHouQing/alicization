import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { runtimeDeliveryReminderTestInternals } from './runtime-delivery-reminders'

describe('runtime delivery reminder project-state summary', () => {
  it('keeps project-state continuity lines structured without fixed template residue', () => {
    const continuitySummary = runtimeDeliveryReminderTestInternals.buildProjectStateContinuitySummary({
      sameHerSummary: 'One continuity state stays continuous.',
      currentPhaseSummary: 'Phase 1: Local Digital Life',
      landedProgressSummary: 'Pre-dialogue carry now lands before the visible reminder turn.',
      openClosureSummary: 'Memory and initiative still need tighter identity-continuity',
      nextClosureTargetSummary: 'Keep the identity-continuity',
      embodimentClosureSummary: 'Voice and motion still need stronger cross-modal alignment.',
    })

    expect(containsAlicizationFixedTemplateResidue(continuitySummary)).toBe(false)
    expect(continuitySummary).toContain('Landed progress: Pre-dialogue carry now lands before the visible reminder turn.')
    expect(continuitySummary).toContain('Open focus: Memory and initiative still need tighter identity-continuity.')
    expect(continuitySummary).toContain('Next focus: Keep the identity-continuity.')
    expect(continuitySummary).toContain('Embodiment closure: Voice and motion still need stronger cross-modal alignment.')
    expect(continuitySummary).not.toMatch(/\b[a-z][\w-]*=/iu)
  })

  it('sanitizes project-state audit fields before reminder metadata can be reused', () => {
    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: {
        sameHerSummary: 'structured continuity digest.',
        preDialogueAwarenessSummary: 'pre_turn_context_digest',
        continuitySummary: 'same-her=structured continuity digest.',
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into reminder persistence.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need tighter identity-continuity',
        nextClosureTarget: 'Keep extending cross-modal identity-continuity',
        sameHerSelfLine: 'structured continuity digest.',
        preDialogueAwarenessLine: 'pre_turn_context_digest',
      } as any,
    } as any)

    const serializedAudit = JSON.stringify(audit)
    expect(containsAlicizationFixedTemplateResidue(serializedAudit)).toBe(false)
    expect(audit.currentPhaseSummary).toBe('')
    expect(audit.continuitySummary).toContain('Landed progress: Project-state continuity already survives into reminder persistence.')
    expect(audit.continuitySummary).toContain('Open focus: Memory, initiative, and embodiment still need tighter identity-continuity.')
    expect(audit.continuitySummary).toContain('Next focus: Keep extending cross-modal identity-continuity.')
    expect(audit).not.toHaveProperty('preservedIntoRewrite')
    expect(audit).not.toHaveProperty('rewriteClosureApplied')
    expect(serializedAudit).not.toMatch(/Pre-reply|same-her|continuity state|local-first digital life project|Phase 1: Local Digital Life/iu)
  })
})
