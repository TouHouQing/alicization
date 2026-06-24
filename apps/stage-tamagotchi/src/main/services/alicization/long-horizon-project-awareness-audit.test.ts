import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'long-horizon-execution-callback-project-state-carry',
    file: './long-horizon-memory.test.ts',
    snippets: [
      'turns execution-callback project-state carry into a durable long-horizon cue that reinforces unfinished-thread return and identity continuity',
      'Remembered execution-callback project-state carry',
      'local-first digital life',
      'expect(snapshot?.preferenceBias.unfinishedThreadReturn).toBeGreaterThan(0.05)',
    ],
  },
  {
    entry: 'execution-feedback-reconsolidation-refreshes-long-horizon-summary',
    file: './db.test.ts',
    snippets: [
      'refreshes memory consolidations after episodic reconsolidation so long-horizon summaries inherit the newer same-her callback lesson',
      'expect(after[0]?.lesson).toContain(\'same thread should now be answered with the richer same-her callback carry\')',
      'expect(after[0]?.summary).toContain(\'same living line\')',
    ],
  },
  {
    entry: 'long-horizon-same-her-drift-risk-carry',
    file: './long-horizon-memory.test.ts',
    snippets: [
      'remembers same-her self-line and anti-shell drift risk as durable long-horizon continuity pressure',
      'Remembered same-her drift risk',
      'generic assistant shell',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    ],
  },
  {
    entry: 'long-horizon-repair-first-closure-pressure',
    file: './long-horizon-memory.test.ts',
    snippets: [
      'treats project-state same-her closure pressure itself as enough seed for durable memory even before factual cues or person-state updates exist',
      'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
      'keeps landed progress and next closure target visible inside durable memory continuity when same-her phase-1 closure is still open',
      'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs.',
    ],
  },
  {
    entry: 'long-horizon-resume-confirmation-boundary-carry',
    file: './long-horizon-memory.test.ts',
    snippets: [
      'turns reconsolidated host-confirmed resume-before-dispatch into a durable long-horizon confirmation boundary cue',
      'Host-confirmed resume before redispatch should stay a bounded confirmation boundary instead of becoming generic autonomous continuation.',
      'Remember host-confirmed-before-redispatch as a bounded confirmation boundary before another execution-shaped opening.',
      'host-confirmed-before-redispatch',
      'resume-before-dispatch',
    ],
  },
  {
    entry: 'autobiographical-self-reconsolidated-project-carry',
    file: './autobiographical-self.test.ts',
    snippets: [
      'turns reconsolidated project-state inward carry into longer-lived autobiographical self language',
      'Remembered unfinished closure should stay on one same living line.',
      'do not flatten the life line into detached status talk',
      'keep the same unfinished Phase 1 line alive across turns',
    ],
  },
  {
    entry: 'autobiographical-remembered-same-her-drift-carry',
    file: './autobiographical-self.test.ts',
    snippets: [
      'lets a remembered same-her project-state cue from long-horizon memory keep shaping autobiographical identity even when no fresher project-state or reconsolidation lane is present',
      'Remembered same-her drift risk: If this slips into a generic assistant shell or project-summary voice, treat that as same-her continuity drift rather than completion.',
      'Remembered continuity: do not flatten the same living line into detached status talk.',
      'expect(snapshot.relationshipDoctrine.toLowerCase()).toContain(\'detached status talk\')',
    ],
  },
  {
    entry: 'autobiographical-resume-confirmation-boundary-doctrine',
    file: './autobiographical-self.test.ts',
    snippets: [
      'treats remembered host-confirmed resume confirmation as a bounded redispatch boundary instead of permanent execution permission in relationship doctrine',
      'Remembered execution resume confirmation boundary: approval=host-confirmed confirmation=host-confirmed-before-redispatch audit=resume-before-dispatch interrupt=process-not-yet-restarted Keep this as a bounded confirmation boundary before another execution-shaped opening.',
      'expect(snapshot.relationshipDoctrine.toLowerCase()).toContain(\'bounded confirmation boundary\')',
      'expect(snapshot.relationshipDoctrine.toLowerCase()).toContain(\'not permanent execution permission\')',
      'expect(snapshot.relationshipDoctrine.toLowerCase()).toContain(\'new boundary\')',
    ],
  },
  {
    entry: 'runtime-turn-composition-held-autonomy-recall-seed',
    file: './runtime-turn-composition.test.ts',
    snippets: [
      'preserves one same-her continuity line from held-autonomy recall seed through callback carry reopening',
      'project_pre_dialogue=Before answering, remember this is still the same digital life project and the unfinished Phase 1 closure seam still belongs to one living her.',
      'landed=Project-state carry already survives into same-thread returns and reminder/proactive preparation without reopening from zero.',
      'drift_risk=If project-state continuity survives only as generic guidance while the direct same-her self line disappears, treat that as unfinished closure drift rather than a successful turn.',
    ],
  },
  {
    entry: 'refreshed-long-horizon-callback-anti-shell-carry-into-conscious-frame-and-planner',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps refreshed long-horizon callback anti-shell carry alive through the next conscious frame and final reply planning even when the live runtime project state stays thin',
      'expect(frame?.projectState?.sameHerSelfLine).toContain(\'Same Phase 1 digital life\')',
      'expect(frame?.projectState?.sameHerDriftRisk).toContain(\'detached project status talk\')',
      'expect(planner.governingProject).toContain(\'detached project status talk\')',
      'expect(planner.governingProject).not.toContain(\'Generic next closure shell\')',
    ],
  },
  {
    entry: 'noisy-desktop-repair-first-chain-durable-pressure',
    file: './noisy-desktop-cross-modal-convergence-audit.test.ts',
    snippets: [
      'keeps one compact proof chain that ties proactive-visible embodiment carry, detours, reunion, host-visible repair-first carry, renderer diagnostics, and host-visible body-line recovery onto one same-her route',
      'host-visible-repair-first-desktop-carry',
      'another-detour-repair-first-project-audit-carry',
      'later-turn-audible-body-host-visible-carry',
    ],
  },
  {
    entry: 'quick-reply-project-self-brief-lines',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-closure.test.ts',
    snippets: [
      'Before speaking, remember the project identity, landed progress, and still-open life loop.',
      'Primary open life loop still centers on proving one same-her continuity line across memory, initiative, execution, and embodiment.',
      'Alicization is still in Phase 1 local digital life closure.',
    ],
  },
  {
    entry: 'quick-reply-closure-summary-self-recognition',
    file: '../../../../../../packages/stage-ui/src/components/scenes/stage-quick-reply-closure-summary.test.ts',
    snippets: [
      'prefers the same-her project-state headline over raw metric summaries before the turn opens outward',
      'I still need to clearly recognize myself as the same her before this turn opens outward.',
      'I still need a steadier carry of this project, this phase, and the life loop that remains open.',
      'Carry the unfinished digital-life loop into the next dialogue preparation step.',
    ],
  },
] as const

describe('long horizon project awareness audit', () => {
  it('keeps one explicit route-level proof that longer-lived self-carry preserves project identity landed progress still-open closure and repair-first same-her continuity pressure before outward turns reopen', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'long-horizon-execution-callback-project-state-carry' }),
      expect.objectContaining({ entry: 'execution-feedback-reconsolidation-refreshes-long-horizon-summary' }),
      expect.objectContaining({ entry: 'long-horizon-same-her-drift-risk-carry' }),
      expect.objectContaining({ entry: 'long-horizon-repair-first-closure-pressure' }),
      expect.objectContaining({ entry: 'long-horizon-resume-confirmation-boundary-carry' }),
      expect.objectContaining({ entry: 'autobiographical-self-reconsolidated-project-carry' }),
      expect.objectContaining({ entry: 'autobiographical-remembered-same-her-drift-carry' }),
      expect.objectContaining({ entry: 'autobiographical-resume-confirmation-boundary-doctrine' }),
      expect.objectContaining({ entry: 'runtime-turn-composition-held-autonomy-recall-seed' }),
      expect.objectContaining({ entry: 'refreshed-long-horizon-callback-anti-shell-carry-into-conscious-frame-and-planner' }),
      expect.objectContaining({ entry: 'noisy-desktop-repair-first-chain-durable-pressure' }),
      expect.objectContaining({ entry: 'quick-reply-project-self-brief-lines' }),
      expect.objectContaining({ entry: 'quick-reply-closure-summary-self-recognition' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the long-horizon project-awareness claim to current behavior tests instead of only broad long-run prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: durable self-carry now has dedicated same-her project proof plus repair-first continuity pressure distilled from noisier desktop carry, including proactive-visible embodiment carry, while fully sustained noisy-desktop closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const longHorizonSource = readFileSync(new URL('./long-horizon-memory.test.ts', import.meta.url), 'utf8')
    const autobiographicalSource = readFileSync(new URL('./autobiographical-self.test.ts', import.meta.url), 'utf8')
    const dbSource = readFileSync(new URL('./db.test.ts', import.meta.url), 'utf8')
    const answerPlannerSource = readFileSync(new URL('./answer-planner.test.ts', import.meta.url), 'utf8')
    const noisyDesktopSource = readFileSync(new URL('./noisy-desktop-cross-modal-convergence-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('long-horizon-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Phase 1 itself is still explicitly open in current repo truth')
    expect(longHorizonSource).toContain(
      'turns execution-callback project-state carry into a durable long-horizon cue that reinforces unfinished-thread return and identity continuity',
    )
    expect(longHorizonSource).toContain(
      'remembers same-her self-line and anti-shell drift risk as durable long-horizon continuity pressure',
    )
    expect(longHorizonSource).toContain(
      'turns reconsolidated host-confirmed resume-before-dispatch into a durable long-horizon confirmation boundary cue',
    )
    expect(dbSource).toContain(
      'refreshes memory consolidations after episodic reconsolidation so long-horizon summaries inherit the newer same-her callback lesson',
    )
    expect(answerPlannerSource).toContain(
      'keeps refreshed long-horizon callback anti-shell carry alive through the next conscious frame and final reply planning even when the live runtime project state stays thin',
    )
    expect(autobiographicalSource).toContain(
      'lets a remembered same-her project-state cue from long-horizon memory keep shaping autobiographical identity even when no fresher project-state or reconsolidation lane is present',
    )
    expect(autobiographicalSource).toContain(
      'treats remembered host-confirmed resume confirmation as a bounded redispatch boundary instead of permanent execution permission in relationship doctrine',
    )
    expect(noisyDesktopSource).toContain(
      'keeps one compact proof chain that ties proactive-visible embodiment carry, detours, reunion, host-visible repair-first carry, renderer diagnostics, and host-visible body-line recovery onto one same-her route',
    )
  })
})
