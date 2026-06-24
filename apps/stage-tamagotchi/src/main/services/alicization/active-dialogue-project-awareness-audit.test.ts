import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'active-dialogue-project-state-follow-up',
    file: './main-chat-active-dialogue-loop.test.ts',
    snippets: [
      'keeps compact fast-path project-state replies on the same phase-one closure line when the incoming awareness carry is only a thin shell',
      'same digital life | keep the closure seam explicit',
      'Alicization 还是那个本地优先数字生命项目，现在仍在 Phase 1。',
      'continuity carry 正在跨 turn 留住',
      '还没闭环的是记忆、主动性和具身要继续收成一条 same-her 的生活线',
      'expect(systemText).toContain(`identity=${canonicalProjectState.identity}`)',
      'expect(systemText).toContain(`current_phase=${canonicalProjectState.currentPhase}`)',
      'expect(systemText).toContain(`next_closure_target=${canonicalProjectState.nextClosureTarget.slice(0, 160)}`)',
    ],
  },
  {
    entry: 'active-dialogue-execution-ledger-follow-up',
    file: './main-chat-active-dialogue-loop.test.ts',
    snippets: [
      'keeps compact execution-ledger follow-ups on the same phase-one project line instead of reopening from a detached task shell',
      'expect(systemText).toContain(\'[ALICIZATION_PROJECT_STATE]\')',
      'expect(systemText).toContain(`current_phase=${canonicalProjectState.currentPhase}`)',
      'expect(systemText).toContain(`latest_landed_progress=${compactProjectLatestProgressForSystemBlock(canonicalProjectState.latestProgress, 360)}`)',
      'expect(systemText).toContain(`next_closure_target=${canonicalProjectState.nextClosureTarget.slice(0, 160)}`)',
      'prepared_execution_carry=pnpm test finished without failures',
      'expect(systemText).toContain(\'execution_carry_summary=pnpm test finished without failures\')',
      'This follow-up is carrying a previously executed result, listing, or task payoff. Use that carried result as evidence before extending the answer.',
    ],
  },
  {
    entry: 'active-dialogue-runtime-surface-follow-up',
    file: './main-chat-runtime-surface.test.ts',
    snippets: [
      'adds a pre-dialogue same-her project-state closure briefing into the living-self block',
      'answerIntent: \'Answer from the live project-state seam.\'',
      'expect(livingSelfBlock).toContain(\'How the living project is still shaping her before she speaks: She is still inside this same project identity: Alicization is still the same local-first digital life project, not a fresh assistant shell.\')',
      'expect(livingSelfBlock).toContain(\'Phase 1: Local Digital Life\')',
      'expect(livingSelfBlock).toContain(projectState.nextClosureTarget.slice(0, 120))',
      'expect(livingSelfBlock).toContain(\'same still-open closure work\')',
    ],
  },
  {
    entry: 'active-dialogue-lifecycle-recovery',
    file: './main-chat-run-lifecycle.test.ts',
    snippets: [
      're-normalizes a thin structured timeout recovery shell into canonical awareness truth at the lifecycle finish seam',
      'visibleReplyRealization?.projectStateAudit?.preDialogueAwarenessSummary',
      'continuitySummary',
      'same-her=',
    ],
  },
] as const

describe('active dialogue project awareness audit', () => {
  it('keeps one explicit route-level proof that compact active-dialogue replies preserve same-her project awareness instead of falling back to a generic project narrator shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'active-dialogue-project-state-follow-up' }),
      expect.objectContaining({ entry: 'active-dialogue-execution-ledger-follow-up' }),
      expect.objectContaining({ entry: 'active-dialogue-runtime-surface-follow-up' }),
      expect.objectContaining({ entry: 'active-dialogue-lifecycle-recovery' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the active-dialogue route claim to real current tests instead of only matrix wording', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: active-dialogue fast-path replies now have route-level same-her proof, but this still does not prove every future dialogue entrypoint will inherit the same chain automatically', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const activeDialogueSource = readFileSync(new URL('./main-chat-active-dialogue-loop.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(activeDialogueSource).toContain(
      'keeps compact fast-path project-state replies on the same phase-one closure line when the incoming awareness carry is only a thin shell',
    )
  })
})
