import { containsAlicizationFixedTemplateResidue } from '@proj-alicization/stage-shared'
import { describe, expect, it } from 'vitest'

import { runtimeDeliveryReminderTestInternals } from './runtime-delivery-reminders'

describe('runtime delivery reminder project-state summary', () => {
  it('keeps project-state continuity lines structured without fixed template residue', () => {
    const continuitySummary = runtimeDeliveryReminderTestInternals.buildProjectStateContinuitySummary({
      sameHerSummary: 'One same living line stays continuous.',
      currentPhaseSummary: 'Phase 1: Local Digital Life',
      landedProgressSummary: 'Pre-dialogue carry now lands before the visible reminder turn.',
      openClosureSummary: 'Memory and initiative still need tighter same-her closure.',
      nextClosureTargetSummary: 'Keep the same-her project briefing explicit before local reminder detail takes over.',
      embodimentClosureSummary: 'Voice and motion still need stronger cross-modal alignment.',
    })

    expect(containsAlicizationFixedTemplateResidue(continuitySummary)).toBe(false)
    expect(continuitySummary).toContain('continuity_anchor=content=excluded; reason=continuity-residue; visibility=internal-structured')
    expect(continuitySummary).toContain('phase=local_desktop_life_loop')
    expect(continuitySummary).toContain('landed=Pre-dialogue carry now lands before the visible reminder turn.')
    expect(continuitySummary).toContain('open=open_loop=memory+initiative; status=unfinished')
    expect(continuitySummary).toContain('next=continuity_review_required')
    expect(continuitySummary).toContain('body=Voice and motion still need stronger cross-modal alignment.')
    expect(continuitySummary).not.toMatch(/same-her|same living line|Phase 1: Local Digital Life/iu)
  })

  it('sanitizes project-state audit fields before reminder metadata can be reused', () => {
    const audit = runtimeDeliveryReminderTestInternals.ensureProjectStateAudit({
      projectStateAudit: {
        sameHerSummary: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwarenessSummary: 'Before answering, remember this is still the same local-first digital life project.',
        continuitySummary: 'same-her=Same Phase 1 digital life. Some closure already landed.',
      },
      projectState: {
        currentPhase: 'Phase 1: Local Digital Life',
        latestLandedProgress: 'Project-state continuity already survives into reminder persistence.',
        primaryOpenLoop: 'Memory, initiative, and embodiment still need tighter same-her closure.',
        nextClosureTarget: 'Keep extending cross-modal same-her proof across longer reminder runs.',
        sameHerSelfLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
        preDialogueAwarenessLine: 'Before answering, keep Alicization grounded as the same local-first digital life project.',
      } as any,
    } as any)

    const serializedAudit = JSON.stringify(audit)
    expect(containsAlicizationFixedTemplateResidue(serializedAudit)).toBe(false)
    expect(audit.currentPhaseSummary).toBe('local_desktop_life_loop')
    expect(audit.continuitySummary).toContain('continuity_anchor=local_desktop_life_loop')
    expect(audit.continuitySummary).toContain('phase=local_desktop_life_loop')
    expect(audit.continuitySummary).toContain('open=open_loop=memory+initiative+embodiment; status=unfinished')
    expect(audit.continuitySummary).toContain('next=cross_modal_continuity_proof=extend_on_longer_noisy_desktop_runs')
    expect(serializedAudit).not.toMatch(/Before answering|same-her|same living line|local-first digital life project|Phase 1: Local Digital Life/iu)
  })
})
