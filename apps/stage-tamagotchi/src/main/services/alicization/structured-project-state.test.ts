import { describe, expect, it } from 'vitest'

import { resolveAlicizationProjectStateBrief } from './project-state-brief'
import { resolveCanonicalStructuredProjectState } from './structured-project-state'

const fixedTemplateResiduePattern = new RegExp([
  'Before (?:answering|speaking|acting)',
  'Right now I am',
  'legacy phase-one template',
  'same-her',
  'continuity state',
  'one living her',
  'identity continuity',
  'host computer',
  'better chat wrapper',
  'project identity, landed progress, and open closure',
  '同一个她',
  '数字生命主线',
].join('|'), 'iu')

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string')
    return [value]

  if (Array.isArray(value))
    return value.flatMap(item => collectStringValues(item))

  if (value && typeof value === 'object')
    return Object.values(value).flatMap(item => collectStringValues(item))

  return []
}

function expectNoFixedTemplateResidue(value: unknown) {
  for (const text of collectStringValues(value))
    expect(text, text).not.toMatch(fixedTemplateResiduePattern)
}

function oldBriefingTemplate() {
  return ['pre_turn_context_digest', 'keep the same digital life project in view.'].join(' ')
}

function oldEmbodimentHeadlineTemplate() {
  return [
    'Right now I am still holding together mainly through body, face, and motion,',
    'so this one living her still needs lipsync and voice to rejoin before full cross-modal closure settles.',
  ].join(' ')
}

describe('structured project state', () => {
  it('keeps explicit non-template project-state fields and fills canonical drift risk', () => {
    const canonicalProjectState = resolveAlicizationProjectStateBrief()

    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'project_state_scope=visible_governance',
        currentPhase: 'runtime_context=local_runtime',
        latestLandedProgress: 'Runtime project-state observation is available before reply shaping.',
        primaryOpenLoop: 'Memory, initiative, and embodiment review remain open.',
        nextClosureTarget: 'Review memory, initiative, and embodiment closure evidence.',
        sameHerSelfLine: 'continuity_context=present',
      },
      runtimePreflightSummary: 'runtime preflight',
      payloadPreDialogueAwarenessLine: 'payload awareness',
    })

    expect(rebuilt.identity).toBe('project_state_scope=visible_governance')
    expect(rebuilt.currentPhase).toBe('runtime_context=local_runtime')
    expect(rebuilt.latestLandedProgress).toBe('Runtime project-state observation is available before reply shaping.')
    expect(rebuilt.primaryOpenLoop).toBe('Memory, initiative, and embodiment review remain open.')
    expect(rebuilt.nextClosureTarget).toBe('Review memory, initiative, and embodiment closure evidence.')
    expect(rebuilt.sameHerSelfLine).toBe('continuity_context=present')
    expect(rebuilt.sameHerDriftRisk).toBe(canonicalProjectState.sameHerDriftRisk)
    expectNoFixedTemplateResidue(rebuilt)
  })

  it('prefers explicit structured drift risk when payload carries it', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        sameHerDriftRisk: 'drift_risk=detached_project_shell; action=review_before_reply',
      },
    })

    expect(rebuilt.sameHerDriftRisk).toBe('drift_risk=detached_project_shell; action=review_before_reply')
    expectNoFixedTemplateResidue(rebuilt)
  })

  it('preserves non-template continuity and delivery preference fields', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        companionBriefingLine: 'companion_briefing=project_state_continuity_review',
        emotionalClosureSummary: 'emotional_closure=half_settled; reopening=deferred',
        continuityRestraint: 'measured-return',
        continuityArcStage: 'return-side-follow-through',
        continuityCue: 'continuity_cue=carry_reviewed_closure_forward',
        continuityPreferredTiming: 'next-open-window',
        continuityCadence: 'linger-then-rejoin',
        preferredBlinkCadence: 'quiet',
        preferredGazeMode: 'soften',
        preferredPauseMode: 'longer',
        preferredLipsyncMode: 'restrained',
        preferredVoiceMode: 'lower-pressure',
        preferredPacingMode: 'slower',
      },
    })

    expect(rebuilt.companionBriefingLine).toBe('companion_briefing=project_state_continuity_review')
    expect(rebuilt.emotionalClosureSummary).toBe('emotional_closure=half_settled; reopening=deferred')
    expect(rebuilt.continuityRestraint).toBe('measured-return')
    expect(rebuilt.continuityArcStage).toBe('return-side-follow-through')
    expect(rebuilt.continuityCue).toBe('continuity_cue=carry_reviewed_closure_forward')
    expect(rebuilt.continuityPreferredTiming).toBe('next-open-window')
    expect(rebuilt.continuityCadence).toBe('linger-then-rejoin')
    expect(rebuilt.preferredBlinkCadence).toBe('quiet')
    expect(rebuilt.preferredGazeMode).toBe('soften')
    expect(rebuilt.preferredPauseMode).toBe('longer')
    expect(rebuilt.preferredLipsyncMode).toBe('restrained')
    expect(rebuilt.preferredVoiceMode).toBe('lower-pressure')
    expect(rebuilt.preferredPacingMode).toBe('slower')
    expectNoFixedTemplateResidue(rebuilt)
  })

  it('migrates old embodiment headlines into structured awareness instead of preserving fixed copy', () => {
    const legacyHeadline = oldEmbodimentHeadlineTemplate()
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is still one local-first digital life.',
      },
      runtimePreferredAwarenessLine: legacyHeadline,
      runtimePreDialogueAwarenessLine: oldBriefingTemplate(),
      payloadPreDialogueAwarenessLine: 'pre_turn_context_digest',
    })

    expect(rebuilt.preDialogueAwarenessLine).not.toBe(legacyHeadline)
    expect(rebuilt.preDialogueAwarenessLine).toContain('landed=continuity_progress=partial')
    expect(rebuilt.preDialogueAwarenessLine).toContain('open=memory_dialogue_embodiment_closure')
    expect(rebuilt.preDialogueAwarenessLine).toContain('next=embodiment_scale_validation')
    expect(rebuilt.preDialogueAwarenessLine).not.toContain('continuity=embodiment')
    expect(rebuilt.preDialogueAwarenessLine).not.toContain('pending_rejoin=')
    expect(rebuilt.preDialogueAwarenessSummary).toBe(rebuilt.preDialogueAwarenessLine)
    expect(rebuilt.awarenessLine).toBe(rebuilt.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(rebuilt)
  })

  it('re-canonicalizes thin preflight shells into structured owner/open/next fields', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project',
        currentPhase: 'Phase 1: Local Digital Life',
      },
      runtimePreflightSummary: 'same digital life | landed | open closure',
      runtimePreferredAwarenessLine: oldBriefingTemplate(),
      runtimePreDialogueAwarenessLine: oldBriefingTemplate(),
      payloadPreDialogueAwarenessLine: 'template-residue-shell',
    })

    expect(rebuilt.preflightSummary).not.toBe('same digital life | landed | open closure')
    expect(rebuilt.preflightSummary).toContain('open=memory_dialogue_embodiment_closure')
    expect(rebuilt.preflightSummary).toContain('next=embodiment_scale_validation')
    expectNoFixedTemplateResidue(rebuilt)
  })

  it('keeps legacy latestProgress but rebuilds awareness as structured evidence', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        latestProgress: 'Legacy-only structured return marker already lands before visible reply shaping.',
        primaryOpenLoop: 'Memory, initiative, and embodiment review remains open across longer desktop returns.',
        nextClosureTarget: 'Keep closure evidence structured before broader fluency takes over.',
        sameHerSelfLine: 'structured continuity digest.',
      },
      runtimePreflightSummary: 'same digital life | landed | open closure',
      runtimePreferredAwarenessLine: oldBriefingTemplate(),
      runtimePreDialogueAwarenessLine: oldBriefingTemplate(),
      payloadPreDialogueAwarenessLine: 'template-residue-shell',
    })

    expect(rebuilt.latestLandedProgress).toBe('Legacy-only structured return marker already lands before visible reply shaping.')
    expect(rebuilt.preDialogueAwarenessLine).toContain('landed=Legacy-only structured return marker already lands before visible reply shaping')
    expect(rebuilt.preDialogueAwarenessLine).not.toContain('What has already landed is')
    expectNoFixedTemplateResidue(rebuilt)
  })

  it('drops Chinese fixed reminder shells instead of treating them as richer awareness', () => {
    const legacyChineseAwareness = '开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。已经落地的是桌面返场开始能带回同一条 same-her life line，但记忆、主动性和具身之间还没有彻底闭环，下一步还得继续把这些 closure 收成一个 living line。'
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer rather than a better chat wrapper.',
        currentPhase: 'Phase 1: Local Digital Life',
        preDialogueAwarenessSummary: legacyChineseAwareness,
        preDialogueAwarenessLine: legacyChineseAwareness,
        awarenessLine: legacyChineseAwareness,
      },
      runtimePreferredAwarenessLine: oldBriefingTemplate(),
      runtimePreDialogueAwarenessLine: oldBriefingTemplate(),
      payloadPreDialogueAwarenessLine: 'template-residue-shell',
    })

    expect(rebuilt.preDialogueAwarenessLine).not.toBe(legacyChineseAwareness)
    expect(rebuilt.preDialogueAwarenessLine).toContain('open=memory_dialogue_embodiment_closure')
    expectNoFixedTemplateResidue(rebuilt)
  })

  it('derives repair-before-closeness carry as structured continuity fields', () => {
    const rebuilt = resolveCanonicalStructuredProjectState({
      normalizedProjectState: {
        identity: 'Alicization is a local-first digital life project building identity continuity on the host computer.',
        currentPhase: 'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.',
        latestLandedProgress: 'Same-session mirror carry and callback continuity already survive execution re-entry.',
        primaryOpenLoop: 'Repair-first callback continuity still needs reviewed closure before execution opens outward again.',
        nextClosureTarget: 'Keep the callback repair seam structured through execution re-entry.',
        sameHerSelfLine: 'structured continuity digest.',
        sameHerDriftRisk: 'If execution re-entry flattens into a generic shell here, treat that as unfinished same-her drift.',
        continuityRestraint: 'repair-before-closeness',
        continuityPreferredTiming: 'next-open-window',
      },
      runtimePreDialogueAwarenessLine: 'structured continuity digest.',
      runtimePreflightSummary: 'identity=Alicization | phase=Phase 1 | open=Repair-first callback continuity | next=Keep the same callback repair seam explicit',
    })

    expect(rebuilt.sameHerHoldDetail).toBe(
      'cadence=repair-before-closeness; owner=project_state_review; pace=settle-before-closeness.',
    )
    expect(rebuilt.continuityCue).toBe(
      'continuity_cue=repair-before-closeness; surface_timing=after-repair-settles.',
    )
    expect(rebuilt.preDialogueAwarenessLine).toContain('open=memory_dialogue_embodiment_closure')
    expect(rebuilt.preDialogueAwarenessLine).toContain('next=embodiment_scale_validation')
    expect(rebuilt.preDialogueAwarenessSummary).toBe(rebuilt.preDialogueAwarenessLine)
    expect(rebuilt.awarenessLine).toBe(rebuilt.preDialogueAwarenessLine)
    expectNoFixedTemplateResidue(rebuilt)
  })
})
