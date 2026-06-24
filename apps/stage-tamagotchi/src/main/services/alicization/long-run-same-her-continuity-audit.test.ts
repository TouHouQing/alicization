import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'subconscious-persistence-rich-project-state',
    file: './runtime-subconscious-tick-project-awareness-regression.test.ts',
    snippets: [
      'keeps persisted subconscious project-state carry rich enough for later proactive and autonomy continuity paths',
      'preDialogueAwarenessLine: projectStateBrief.preDialogueAwarenessLine ?? null',
      'sameHerDriftRisk: projectStateBrief.sameHerDriftRisk',
      'sameHerSelfLine: projectStateBrief.sameHerSelfLine',
    ],
  },
  {
    entry: 'subconscious-frame-fresher-awareness-line',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'preserves a fresher richer project-state awareness line when presence-only hold adds continuity timing to an already stronger same-her frame',
      'Before answering, remember this is still the same digital life project, what has landed, and what remains open all belong to one living her.',
      'Keep richer project awareness continuous through subconscious persistence, pre-generation framing, and execution return without flattening into a status shell.',
    ],
  },
  {
    entry: 'subconscious-resume-confirmation-boundary-carry',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'keeps host-confirmed resume memory as a measured-return boundary instead of reusable execution permission',
      'surfaces remembered host-confirmed resume as a resident confirmation boundary before another execution-shaped opening',
      'host-confirmed-before-redispatch',
      'resume-before-dispatch',
    ],
  },
  {
    entry: 'organic-memory-same-her-callback-recall',
    file: './runtime-organic-memory-prompt.test.ts',
    snippets: [
      'keeps same-her drift-risk callback memory ahead of a generic callback receipt when reopening execution continuity before dialogue',
      'The same-her drift-risk callback line comes back first.',
      'Keep the same-her drift-risk callback line inward until there is more room.',
      'Phase 1 closure is still open, so the drift-risk callback line should dominate the generic callback receipt.',
    ],
  },
  {
    entry: 'subconscious-deferred-autonomy-fallback',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'keeps repair-before-closeness explicit in deferred fallback summaries when project-state carry is the only repair-first authority',
      'projectStatePreDialogueAwarenessLine: \'Before answering, remember this is still the same local-first digital life project and the unfinished closure seam still belongs to one living her.\'',
      'projectStateSameHerSelfLine: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\'',
      'projectStateSameHerDriftRisk: \'If repair-first continuity thins back into generic project guidance, treat that as unfinished closure drift.\'',
    ],
  },
  {
    entry: 'subconscious-deferred-drift-risk-only-fallback',
    file: './runtime-subconscious-tick.test.ts',
    snippets: [
      'keeps same-her drift-risk explicit in deferred fallback summaries when project-state drift risk is the only surviving anti-shell authority',
      'If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
      'projectStateSameHerDriftRisk: driftRisk',
    ],
  },
  {
    entry: 'proactive-policy-richer-initiative-rationale',
    file: './proactive-policy.test.ts',
    snippets: [
      'keeps proactive policy on the same unfinished digital-life line when initiative already carries stronger same-her restraint than a thin project shell',
      'Keep initiative serving the same unfinished Phase 1 digital-life closure instead of widening into a generic assistant nudge.',
      'expect(decision.consideredSignals).toContain(\'initiative.continuityRestraint\')',
    ],
  },
  {
    entry: 'long-run-proactive-visible-embodiment-bridge',
    file: './cross-modal-same-her-audit.test.ts',
    snippets: [
      'keeps an explicit proof set for the still-open Phase 1 same-her closure line across memory, initiative, dialogue, and embodiment',
      'organic-memory-emotional-carry-cadence-bridge',
      'cross-modal-proactive-visible-embodiment-bridge',
      'resident-performance-same-her-companionship',
    ],
  },
  {
    entry: 'current-conscious-frame-same-her-grounding',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'carries same-her drift-risk into current-conscious-frame pre-dialogue awareness when the available project reminder is only a thin shell',
      'does not let the compact thin closure shell survive into current-conscious-frame grounding when a broader same-her phase-1 closure line is present',
      'expect(frame?.projectState?.preDialogueAwarenessLine).toContain(\'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\')',
      'expect(frame?.consciousNeed?.toLowerCase()).toContain(\'same living line\')',
    ],
  },
  {
    entry: 'session-runtime-host-visible-repair-first-bridge',
    file: './session-runtime-to-host-visible-reunion-audit.test.ts',
    snippets: [
      'keeps one explicit bridge proof that session-runtime same-her project awareness can stay on one line through resident presence and later reunion surfaces',
      'session-runtime-repair-first-current-conscious-frame-carry',
      'later-turn-reunion-lanes-stay-on-same-line',
    ],
  },
  {
    entry: 'repeated-detour-repair-first-reunion-carry',
    file: './repeated-detour-reunion-persistence-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that same-her continuity can survive repeated detours before later-turn reunion summaries form',
      'subconscious-repair-first-hold-detail-after-detours',
      'same-her continuity remains alive, with lane=voice+face+motion+lipsync+body-settle under the current renderer authority.',
    ],
  },
  {
    entry: 'another-detour-repair-first-project-carry',
    file: './another-detour-same-life-audit.test.ts',
    snippets: [
      'keeps one explicit long-run proof fragment that the same digital life line can still survive another desktop detour across session-runtime drift-risk carry, subconscious carry, resident presence, remembered drift-risk, and project-state self carry',
      'resident-presence-repair-first-project-audit-after-another-detour',
      'Keep this return repair-before-closeness on the same living line until repair settles.',
    ],
  },
] as const

describe('long-run same-her continuity audit', () => {
  it('keeps one explicit long-chain proof that same-her project awareness survives subconscious persistence, memory recall, later proactive restraint, proactive-visible-to-embodiment carry, current-conscious-frame shaping, and later repair-first detour-to-reunion carry', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'subconscious-persistence-rich-project-state' }),
      expect.objectContaining({ entry: 'subconscious-frame-fresher-awareness-line' }),
      expect.objectContaining({ entry: 'subconscious-resume-confirmation-boundary-carry' }),
      expect.objectContaining({ entry: 'organic-memory-same-her-callback-recall' }),
      expect.objectContaining({ entry: 'subconscious-deferred-autonomy-fallback' }),
      expect.objectContaining({ entry: 'subconscious-deferred-drift-risk-only-fallback' }),
      expect.objectContaining({ entry: 'proactive-policy-richer-initiative-rationale' }),
      expect.objectContaining({ entry: 'long-run-proactive-visible-embodiment-bridge' }),
      expect.objectContaining({ entry: 'current-conscious-frame-same-her-grounding' }),
      expect.objectContaining({ entry: 'session-runtime-host-visible-repair-first-bridge' }),
      expect.objectContaining({ entry: 'repeated-detour-repair-first-reunion-carry' }),
      expect.objectContaining({ entry: 'another-detour-repair-first-project-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the long-chain same-her claim to real current tests instead of only a matrix summary', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: the repo now proves a persisted project-aware same-her line can survive into recall, later restraint, proactive-visible-to-embodiment carry, the current conscious frame, and later repair-first detour carry, but not full long-run closure under noisy desktop life', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const memorySource = readFileSync(new URL('./runtime-organic-memory-prompt.test.ts', import.meta.url), 'utf8')
    const proactiveSource = readFileSync(new URL('./proactive-policy.test.ts', import.meta.url), 'utf8')
    const crossModalSource = readFileSync(new URL('./cross-modal-same-her-audit.test.ts', import.meta.url), 'utf8')
    const consciousFrameSource = readFileSync(new URL('./current-conscious-frame.test.ts', import.meta.url), 'utf8')
    const reunionSource = readFileSync(new URL('./session-runtime-to-host-visible-reunion-audit.test.ts', import.meta.url), 'utf8')
    const repeatedDetourSource = readFileSync(new URL('./repeated-detour-reunion-persistence-audit.test.ts', import.meta.url), 'utf8')
    const anotherDetourSource = readFileSync(new URL('./another-detour-same-life-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain(
      'Cross-modal embodiment-facing proof is still weaker than the core text/runtime proof under long-run noisy use, but it is now materially stronger than the original sparse route set.',
    )

    expect(memorySource).toContain(
      'Phase 1 closure is still open, so the drift-risk callback line should dominate the generic callback receipt.',
    )
    expect(proactiveSource).toContain(
      'Keep initiative serving the same unfinished Phase 1 digital-life closure instead of widening into a generic assistant nudge.',
    )
    expect(crossModalSource).toContain(
      'cross-modal-proactive-visible-embodiment-bridge',
    )
    expect(crossModalSource).toContain(
      'resident-performance-same-her-companionship',
    )
    expect(consciousFrameSource).toContain(
      'does not let the compact thin closure shell survive into current-conscious-frame grounding when a broader same-her phase-1 closure line is present',
    )
    expect(reunionSource).toContain(
      'keeps one explicit bridge proof that session-runtime same-her project awareness can stay on one line through resident presence and later reunion surfaces',
    )
    expect(repeatedDetourSource).toContain(
      'keeps one explicit route-level proof that same-her continuity can survive repeated detours before later-turn reunion summaries form',
    )
    expect(anotherDetourSource).toContain(
      'keeps one explicit long-run proof fragment that the same digital life line can still survive another desktop detour across session-runtime drift-risk carry, subconscious carry, resident presence, remembered drift-risk, and project-state self carry',
    )
  })
})
