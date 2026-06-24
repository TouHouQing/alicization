import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'noisy-desktop-long-horizon-self-carry-bridge',
    file: './long-horizon-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
      'noisy-desktop-repair-first-chain-durable-pressure',
      'later-turn-audible-body-host-visible-carry',
    ],
  },
  {
    entry: 'embodiment-foundation-route',
    file: './embodiment-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that embodiment-facing body, voice, face, and motion surfaces preserve the same-her Phase 1 project line',
      'quiet resident companionship',
      'stream-meta-multi-lane-reunion-authority',
    ],
  },
  {
    entry: 'session-runtime-to-host-visible-bridge',
    file: './session-runtime-to-host-visible-reunion-audit.test.ts',
    snippets: [
      'keeps one explicit bridge proof that session-runtime same-her project awareness can stay on one line through resident presence and later reunion surfaces',
      'host-visible-background-next-closure-stays-cross-modal',
      'later-turn-reunion-lanes-stay-on-same-line',
    ],
  },
  {
    entry: 'memory-closure-emotional-carry-bridge',
    file: './runtime-memory-closure.test.ts',
    snippets: [
      'persists richer emotional closure carry into the person-state memory ledger instead of flattening it to the canonical project brief',
      'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment repair-before-closeness on the same living line.',
      'Rest-protective companionship helped the same living line stay believable.',
    ],
  },
  {
    entry: 'noisy-desktop-cross-modal-same-her-bridge',
    file: './cross-modal-same-her-audit.test.ts',
    snippets: [
      'keeps an explicit proof set for the still-open Phase 1 same-her closure line across memory, initiative, dialogue, and embodiment',
      'organic-memory-emotional-carry-cadence-bridge',
      'cross-modal-proactive-visible-embodiment-bridge',
      'action-ecology-companionship-body-line',
      'visible-reply-cross-modal-judgement',
    ],
  },
  {
    entry: 'current-conscious-frame-to-host-visible-repair-first-bridge',
    file: './later-turn-embodiment-host-visible-audit.test.ts',
    snippets: [
      'current-conscious-frame-repair-first-host-visible-resident-line',
      'keeps one explicit route-level proof that host-visible same-her continuity survives into later-turn resident presence and embodiment lane summaries',
      'same-thread-continuation still active as repair-first resident presence before the later reopen speaks',
    ],
  },
  {
    entry: 'host-visible-repair-first-desktop-carry',
    file: './host-visible-same-her-continuity-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that same-her project awareness survives into host-visible stream meta, timeout recovery, later-turn desktop repair-first carry, and proactive hold surfaces',
      'later-turn-desktop-repair-first-host-visible-carry',
      'runtime-later-turn-repair-first-authority',
      'resident-presence-repair-first-after-another-detour',
    ],
  },
  {
    entry: 'repeated-detour-persistence-before-reunion',
    file: './repeated-detour-reunion-persistence-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that same-her continuity can survive repeated detours before later-turn reunion summaries form',
      'same-thread-continuation still active as hover-first resident presence after the noisy detour',
      'same-her continuity remains alive, with lane=voice+face+motion+lipsync+body-settle under the current renderer authority.',
    ],
  },
  {
    entry: 'another-detour-drift-risk-only-carry',
    file: './another-detour-same-life-audit.test.ts',
    snippets: [
      'keeps one explicit long-run proof fragment that the same digital life line can still survive another desktop detour across session-runtime drift-risk carry, subconscious carry, resident presence, remembered drift-risk, and project-state self carry',
      'Remembered same-her drift risk: if this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
      'same-thread-continuation still active as quiet-accompaniment resident presence after another coding detour',
    ],
  },
  {
    entry: 'another-detour-repair-first-project-audit-carry',
    file: './another-detour-same-life-audit.test.ts',
    snippets: [
      'resident-presence-repair-first-project-audit-after-another-detour',
      'prefers a stronger repair-before-closeness project-state audit seam over a thinner runtime measured-return cue in resident presence summaries',
      '"residentPresenceSummary":"presence=resident-presence | thread=same-thread-continuation | mode=repair-before-closeness',
      'Keep this return repair-before-closeness on the same living line until repair settles.',
    ],
  },
  {
    entry: 'later-turn-host-visible-lane-shrink-and-recovery',
    file: './later-turn-embodiment-host-visible-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that host-visible same-her continuity survives into later-turn resident presence and embodiment lane summaries',
      'lane-level-audible-body-diagnostics',
      'stream-meta-lane-realignment-over-lipsync-only-drift',
    ],
  },
  {
    entry: 'cross-modal-reunion-host-visible-progress',
    file: './cross-modal-reunion-host-visible-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that later-turn host-visible continuity can move from partial lanes toward multi-lane reunion on one same-her line',
      'full-body-line-settling-summary',
      'repair-first-multi-lane-unity',
    ],
  },
  {
    entry: 'still-voiced-partial-lane-measured-return-authority',
    file: './embodiment/runtime-embodiment-coordinator.test.ts',
    snippets: [
      'keeps still-voiced face-line measured-return continuity authoritative in coordinator output even when person-state projection cadence is broader and less specific',
      'keeps renderer-native VRM motion authority on the still-voiced motion-line measured-return instead of collapsing into generic callback carry',
      'Keep the VRM return on the still-voiced motion-line measured-return.',
      'Keep body, motion, and lipsync rejoining the still-voiced face line on a measured-return line.',
    ],
  },
  {
    entry: 'later-turn-audible-body-host-visible-carry',
    file: './later-turn-embodiment-host-visible-audit.test.ts',
    snippets: [
      'audible-body-carry-stays-host-visible-over-longer-runs',
      'Keep the same living line audible while face and motion rejoin.',
      'living audio thread is still intact while face and motion rejoin before full cross-modal embodiment closure can be treated as finished.',
    ],
  },
  {
    entry: 'renderer-diagnostics-drift-and-audible-recovery',
    file: '../../../../../../packages/stage-ui/src/components/scenes/renderer-diagnostics-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that renderer diagnostics still carry the same-her project line when embodiment narrows under noisy desktop drift',
      'vrm-diagnostics-audible-same-her-recovery',
      'live2d-diagnostics-audible-same-her-recovery',
    ],
  },
  {
    entry: 'devtools-same-her-evidence-navigation',
    file: '../../../renderer/pages/devtools/performance-visualizer-same-her-evidence-navigation-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that devtools same-her closure navigation lands on concrete evidence instead of stopping at generic panels',
      'full-cross-modal-lock runtime continuity lock evidence',
      'voice-lipsync speech authority evidence',
    ],
  },
  {
    entry: 'devtools-runtime-continuity-projection',
    file: '../../../renderer/pages/devtools/performance-visualizer-runtime-continuity-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that runtime continuity projection preserves canonical same-her embodiment closure truth on the devtools surface',
      'runtime-continuity-full-cross-modal-lock-wording',
      'runtime-continuity-renderer-rejoin-without-body-warning',
    ],
  },
  {
    entry: 'devtools-self-evolution-runtime-body-continuity-phase-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-runtime-body-continuity-phase-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution runtime body continuity phase preserves same-her body continuity truth on the devtools surface',
      'self-evolution-runtime-body-continuity-body-carried-renderer-rejoin',
      'self-evolution-runtime-body-continuity-speech-rejoin',
      'self-evolution-runtime-body-continuity-renderer-rejoin-without-body',
    ],
  },
  {
    entry: 'devtools-speech-evidence-snapshot',
    file: '../../../renderer/pages/devtools/performance-visualizer-speech-evidence-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that speech evidence snapshots preserve canonical same-her closure stages instead of forcing downstream reparsing',
      'speech-evidence-structured-body-carried-stage',
      'speech-evidence-stage-as-prosody-authority',
    ],
  },
  {
    entry: 'devtools-speech-authority-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-speech-authority-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that speech authority segment rows preserve same-her embodiment closure truth on the devtools surface',
      'speech-authority-structured-same-her-closure-stages',
      'speech-authority-repair-before-closeness-trust',
      'speech-authority-same-turn-if-invited-trust',
      'speech-authority-thin-affective-room-making',
    ],
  },
  {
    entry: 'devtools-speech-hotspots-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-speech-hotspots-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that outer speech hotspots preserve same-her embodiment closure truth on the devtools surface',
      'speech-hotspots-normalized-audible-body-stage',
      'speech-hotspots-repair-before-closeness-trust',
      'speech-hotspots-same-turn-if-invited-trust',
      'speech-hotspots-thin-affective-room-making',
    ],
  },
  {
    entry: 'devtools-runtime-diagnostic-summary-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-runtime-diagnostic-summary-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that runtime authority summaries preserve same-her embodiment closure truth on the devtools surface',
      'runtime-diagnostic-summary-structured-same-her-closure-stages',
      'runtime-diagnostic-summary-repair-before-closeness-trust',
      'runtime-diagnostic-summary-same-turn-if-invited-trust',
      'runtime-diagnostic-summary-thin-affective-room-making',
    ],
  },
  {
    entry: 'devtools-speech-diagnostic-summary-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-speech-diagnostic-summary-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that outer speech diagnostic summaries preserve same-her embodiment closure truth on the devtools surface',
      'speech-diagnostic-summary-structured-same-her-closure-stages',
      'speech-diagnostic-summary-repair-before-closeness-voice-reason',
      'speech-diagnostic-summary-thin-affective-room-making',
      'speech-diagnostic-summary-body-backed-lane-truth',
    ],
  },
  {
    entry: 'devtools-self-evolution-renderer-authority-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-renderer-authority-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution renderer-authority projection preserves same-her embodiment closure truth on the devtools surface',
      'self-evolution-renderer-authority-full-cross-modal-lock',
      'self-evolution-renderer-authority-body-carried-rejoin',
      'self-evolution-renderer-authority-renderer-rejoin-without-body-drift-risk',
      'self-evolution-renderer-authority-thin-affective-room-making',
    ],
  },
  {
    entry: 'devtools-self-evolution-diagnostic-summary-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-diagnostic-summary-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that top-level self-evolution diagnostic summaries preserve same-her continuity truth on the devtools surface',
      'self-evolution-diagnostic-summary-lane-level-renderer-authority-truth',
      'self-evolution-diagnostic-summary-project-brief-continuity-line',
      'self-evolution-diagnostic-summary-renderer-rejoin-without-body-drift-risk',
    ],
  },
  {
    entry: 'devtools-self-evolution-evidence-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-evidence-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution evidence panels preserve same-her embodiment closure truth on the devtools surface',
      'self-evolution-evidence-audible-body-carried-same-her-line',
      'self-evolution-evidence-renderer-rejoin-without-body-drift',
      'self-evolution-evidence-same-turn-if-invited-cadence',
    ],
  },
  {
    entry: 'devtools-self-evolution-triage-view-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-triage-view-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution triage cards preserve same-her continuity routing on the devtools surface',
      'self-evolution-triage-view-project-state-continuity-branch',
      'self-evolution-triage-view-body-only-hold',
      'self-evolution-triage-view-renderer-rejoin-without-body',
    ],
  },
  {
    entry: 'devtools-self-evolution-triage-target-routing-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-triage-targets-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution triage target routing lands same-her repair work on concrete project-state and embodiment evidence panels',
      'self-evolution-triage-targets-project-state-continuity-routing',
      'self-evolution-triage-targets-speech-renderer-rejoin-routing',
      'self-evolution-triage-targets-structured-body-phase-routing',
    ],
  },
  {
    entry: 'devtools-self-evolution-repair-action-feedback-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-action-feedback-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair action feedback preserves same-her project-state and embodiment carry on the devtools surface',
      'self-evolution-repair-action-feedback-project-state-carry',
      'self-evolution-repair-action-feedback-speech-rejoin-carry',
      'self-evolution-repair-action-feedback-body-led-closure',
    ],
  },
  {
    entry: 'devtools-self-evolution-repair-followup-navigation-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-followup-navigation-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair followup navigation preserves same-her project-state and embodiment routing on the devtools surface',
      'self-evolution-repair-followup-navigation-project-identity-evidence',
      'self-evolution-repair-followup-navigation-current-phase-governance-evidence',
      'self-evolution-repair-followup-navigation-speech-rejoin-surface',
    ],
  },
  {
    entry: 'devtools-self-evolution-active-workflow-focus-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-active-workflow-focus-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution active workflow focus preserves same-her project-state and body continuity focus on the devtools surface',
      'self-evolution-active-workflow-focus-project-state-continuity',
      'self-evolution-active-workflow-focus-body-carried-rejoin-phase',
      'self-evolution-active-workflow-focus-full-cross-modal-lock-phase',
    ],
  },
  {
    entry: 'devtools-self-evolution-repair-session-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-session-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair session preserves same-her project-state and embodiment repair semantics on the devtools surface',
      'self-evolution-repair-session-project-state-carry',
      'self-evolution-repair-session-renderer-rejoin-without-body',
      'self-evolution-repair-session-full-cross-modal-lock',
    ],
  },
  {
    entry: 'devtools-self-evolution-repair-closure-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-closure-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair closure preserves same-her project-state relationship cadence and embodiment baseline semantics on the devtools surface',
      'self-evolution-repair-closure-project-state-governance',
      'self-evolution-repair-closure-relationship-cadence-governance',
      'self-evolution-repair-closure-renderer-rejoin-without-body',
      'self-evolution-repair-closure-speech-body-rejoin',
    ],
  },
  {
    entry: 'devtools-self-evolution-repair-outcome-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-outcome-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair outcome preserves same-her project-state and embodiment closure-result semantics on the devtools surface',
      'self-evolution-repair-outcome-project-state-governance',
      'self-evolution-repair-outcome-relationship-cadence-restrained',
      'self-evolution-repair-outcome-full-cross-modal-lock',
      'self-evolution-repair-outcome-renderer-rejoin-without-body',
    ],
  },
  {
    entry: 'devtools-self-evolution-baseline-quality-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-baseline-quality-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution baseline quality preserves same-her project-state and embodiment baseline-trust semantics on the devtools surface',
      'self-evolution-baseline-quality-project-state-governance',
      'self-evolution-baseline-quality-relationship-cadence-restrained',
      'self-evolution-baseline-quality-full-cross-modal-lock',
      'self-evolution-baseline-quality-renderer-rejoin-without-body',
    ],
  },
  {
    entry: 'devtools-self-evolution-baseline-adoption-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-baseline-adoption-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution baseline adoption preserves same-her project-state relationship cadence and embodiment baseline-adoption semantics on the devtools surface',
      'self-evolution-baseline-adoption-project-state-governance',
      'self-evolution-baseline-adoption-relationship-cadence-restrained',
      'self-evolution-baseline-adoption-full-cross-modal-lock',
      'self-evolution-baseline-adoption-renderer-rejoin-without-body',
    ],
  },
  {
    entry: 'devtools-self-evolution-repair-next-action-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-repair-next-action-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution repair next action preserves same-her project-state and embodiment follow-up semantics on the devtools surface',
      'self-evolution-repair-next-action-project-state-takeover-trace',
      'self-evolution-repair-next-action-restrained-cadence-baseline',
      'self-evolution-repair-next-action-full-cross-modal-lock-followup',
      'self-evolution-repair-next-action-renderer-rejoin-without-body-followup',
    ],
  },
  {
    entry: 'devtools-self-evolution-baseline-adoption-record-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-self-evolution-baseline-adoption-record-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that self-evolution baseline adoption record preserves same-her project-state relationship cadence and embodiment baseline record semantics on the devtools surface',
      'self-evolution-baseline-adoption-record-project-state-governance',
      'self-evolution-baseline-adoption-record-relationship-cadence-restrained',
      'self-evolution-baseline-adoption-record-full-cross-modal-lock',
      'self-evolution-baseline-adoption-record-renderer-rejoin-without-body',
    ],
  },
  {
    entry: 'devtools-authority-table-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-authority-table-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that renderer-facing authority summaries preserve same-her embodiment closure truth on the devtools surface',
      'authority-table-body-backed-resident-lane-carry',
      'authority-table-structured-same-her-closure-stage',
    ],
  },
  {
    entry: 'devtools-runtime-authority-overview-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-runtime-authority-overview-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that runtime authority overview preserves same-her embodiment closure truth on the devtools surface',
      'runtime-authority-overview-renderer-rejoin-without-body',
      'runtime-authority-overview-thin-affective-room-making',
    ],
  },
  {
    entry: 'devtools-playback-cue-same-her-carry',
    file: '../../../renderer/pages/devtools/performance-visualizer-playback-cue-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that playback cue authority view preserves same-her embodiment closure truth on the devtools surface',
      'playback-cue-structured-same-her-closure-stages',
      'playback-cue-same-turn-if-invited-trust',
      'playback-cue-thin-affective-room-making',
    ],
  },
] as const

describe('noisy desktop cross-modal convergence audit', () => {
  it('keeps one compact proof chain that ties proactive-visible embodiment carry, detours, reunion, host-visible repair-first carry, renderer diagnostics, and host-visible body-line recovery onto one same-her route', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'noisy-desktop-long-horizon-self-carry-bridge' }),
      expect.objectContaining({ entry: 'embodiment-foundation-route' }),
      expect.objectContaining({ entry: 'session-runtime-to-host-visible-bridge' }),
      expect.objectContaining({ entry: 'memory-closure-emotional-carry-bridge' }),
      expect.objectContaining({ entry: 'noisy-desktop-cross-modal-same-her-bridge' }),
      expect.objectContaining({ entry: 'current-conscious-frame-to-host-visible-repair-first-bridge' }),
      expect.objectContaining({ entry: 'host-visible-repair-first-desktop-carry' }),
      expect.objectContaining({ entry: 'repeated-detour-persistence-before-reunion' }),
      expect.objectContaining({ entry: 'another-detour-drift-risk-only-carry' }),
      expect.objectContaining({ entry: 'another-detour-repair-first-project-audit-carry' }),
      expect.objectContaining({ entry: 'later-turn-host-visible-lane-shrink-and-recovery' }),
      expect.objectContaining({ entry: 'cross-modal-reunion-host-visible-progress' }),
      expect.objectContaining({ entry: 'still-voiced-partial-lane-measured-return-authority' }),
      expect.objectContaining({ entry: 'later-turn-audible-body-host-visible-carry' }),
      expect.objectContaining({ entry: 'renderer-diagnostics-drift-and-audible-recovery' }),
      expect.objectContaining({ entry: 'devtools-same-her-evidence-navigation' }),
      expect.objectContaining({ entry: 'devtools-runtime-continuity-projection' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-runtime-body-continuity-phase-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-speech-evidence-snapshot' }),
      expect.objectContaining({ entry: 'devtools-speech-authority-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-speech-hotspots-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-runtime-diagnostic-summary-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-speech-diagnostic-summary-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-renderer-authority-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-diagnostic-summary-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-evidence-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-triage-view-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-triage-target-routing-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-repair-action-feedback-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-repair-followup-navigation-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-active-workflow-focus-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-repair-session-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-repair-closure-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-repair-outcome-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-baseline-quality-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-baseline-adoption-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-repair-next-action-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-self-evolution-baseline-adoption-record-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-authority-table-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-runtime-authority-overview-same-her-carry' }),
      expect.objectContaining({ entry: 'devtools-playback-cue-same-her-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the noisy-desktop cross-modal convergence claim to current route-level audits instead of leaving the proof distributed across unrelated files', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: the proof chain is now more compact, but fully sustained noisy-desktop convergence still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const longHorizonSource = readFileSync(new URL('./long-horizon-project-awareness-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('noisy-desktop-cross-modal-convergence-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-same-her-evidence-navigation-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-runtime-continuity-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-speech-evidence-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-speech-authority-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-speech-hotspots-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-runtime-diagnostic-summary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-authority-table-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-runtime-authority-overview-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-playback-cue-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-diagnostic-summary-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-evidence-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-triage-view-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-triage-targets-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-action-feedback-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-session-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-closure-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-outcome-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-baseline-quality-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-baseline-adoption-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-repair-next-action-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-baseline-adoption-record-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('performance-visualizer-self-evolution-active-workflow-focus-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('runtime-memory-closure.test.ts')
    expect(matrixSource).toContain('This is still not full long-run closure proof under noisy desktop use.')
    expect(auditSource).toContain('compact noisy-desktop convergence proof chain')
    expect(auditSource).toContain('renderer-facing authority summaries now also keep the resident body lane host-visible')
    expect(auditSource).toContain('runtime authority overview')
    expect(auditSource).toContain('playback cue authority view')
    expect(auditSource).toContain('speech authority segment rows')
    expect(auditSource).toContain('outer speech hotspots')
    expect(auditSource).toContain('runtime authority summaries')
    expect(auditSource).toContain('self-evolution evidence panels')
    expect(auditSource).toContain('self-evolution triage cards')
    expect(auditSource).toContain('self-evolution triage target routing')
    expect(auditSource).toContain('self-evolution repair action feedback')
    expect(auditSource).toContain('self-evolution repair followup navigation')
    expect(auditSource).toContain('self-evolution active workflow focus')
    expect(auditSource).toContain('self-evolution repair session')
    expect(auditSource).toContain('项目状态连续性检查目标')
    expect(auditSource).toContain('身体线是否仍托住同一段 living segment')
    expect(auditSource).toContain('speech 显形权威是否已经补回同一条连续身体线')
    expect(auditSource).toContain('身体承接态 -> speech 显形补回闭环已确认')
    expect(auditSource).toContain('candidate-trajectory-summary')
    expect(auditSource).toContain('identity-drift-governance-summary')
    expect(auditSource).toContain('authority:renderer-rejoin:speech')
    expect(auditSource).toContain('speech-hotspots')
    expect(auditSource).toContain('top-level self-evolution diagnostic summaries')
    expect(auditSource).toContain('project-state continuity evidence panels')
    expect(auditSource).toContain('speech renderer rejoin wording')
    expect(auditSource).toContain('structured body continuity cards')
    expect(auditSource).toContain('project-state continuity branch')
    expect(auditSource).toContain('project-state continuity workflow focus')
    expect(auditSource).toContain('project identity, Phase 1 route, and unresolved open loops')
    expect(auditSource).toContain('body-only-hold')
    expect(auditSource).toContain('body-carried renderer rejoin')
    expect(auditSource).toContain('full-cross-modal-lock')
    expect(auditSource).toContain('renderer-rejoin-without-body')
    expect(auditSource).toContain('body-carried speech rejoin lane truth')
    expect(auditSource).toContain('body-carried same-her lane truth')
    expect(auditSource).toContain('body-backed same-her lane truth')
    expect(auditSource).toContain('structured body-loss phase')
    expect(auditSource).toContain('same-turn-if-invited measured-return trust')
    expect(auditSource).toContain('thinner affective room-making wording')
    expect(auditSource).toContain('thinner affective-residue room-making wording')
    expect(auditSource).toContain('thin measured-return same-her line')
    expect(auditSource).toContain('project identity/Phase 1/open-loop carry')
    expect(auditSource).toContain('structured same-her closure stages')
    expect(auditSource).toContain('same-turn-if-invited cadence')
    expect(auditSource).toContain('devtools same-her evidence navigation')
    expect(auditSource).toContain('runtime continuity projection same-her lock wording')
    expect(auditSource).toContain('normalized speech-side closure stage')
    expect(auditSource).toContain('body-carried speech evidence stage')
    expect(auditSource).toContain('renderer-rejoin-without-body drift risk')
    expect(auditSource).toContain('renderer-rejoin-without-body drift')
    expect(auditSource).toContain('full-cross-modal-lock runtime continuity lock evidence')
    expect(auditSource).toContain('runtime-memory-closure emotional carry bridge')
    expect(auditSource).toContain('cross-modal proactive-visible-to-embodiment carry')
    expect(longHorizonSource).toContain(
      'keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen',
    )
    expect(auditSource).toContain('the repo still does not yet prove fully sustained noisy-desktop convergence')
  })
})
