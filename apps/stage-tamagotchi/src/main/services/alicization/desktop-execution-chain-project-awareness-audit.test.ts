import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'agent-runtime-canonical-execution-briefing',
    file: './agent-runtime.test.ts',
    snippets: [
      'builds execution runtime context with canonical project briefing before execution starts',
      'identity: expect.stringContaining(\'local-first digital life project\')',
      'preDialogueAwarenessLine: expect.stringContaining(\'Before answering, remember\')',
      'continuityArcStage: \'same-thread-continuation\'',
    ],
  },
  {
    entry: 'execution-runtime-context-sanitization-carry',
    file: './execution-runtime-context.test.ts',
    snippets: [
      'keeps explicit project identity, landed progress, open closure, and same-her awareness grouped together in execution runtime context before dispatch begins',
      'does not let a thin generic awareness shell erase richer open-loop and same-her execution briefing fields during runtime-context sanitization',
      'preDialogueAwarenessLine: \'same digital life | keep the closure seam explicit\'',
    ],
  },
  {
    entry: 'task-thread-dispatch-project-continuity-persistence',
    file: './task-thread-dispatcher.test.ts',
    snippets: [
      'persists execution runtime context onto the task thread metadata before dispatch',
      'nextClosureTarget: \'Keep extending same-her proof so Phase 1 route carry remains visible before execution and dialogue turns.\'',
      'expect(result.summary).toContain(\'project_continuity=\')',
    ],
  },
  {
    entry: 'main-session-dispatch-project-briefing-handoff',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'carries summary-only same-her project briefing through the main-session executor dispatch payload before CLI execution leaves the desktop runtime',
      'expect((dispatchedRuntimeContext as any)?.projectBriefing).toEqual(expect.objectContaining({',
      'latestLandedProgress: summaryOnlyLandedProgress',
      'primaryOpenLoop: summaryOnlyOpenClosure',
      'nextClosureTarget: summaryOnlyNextClosureTarget',
      'sameHerDriftRisk: summaryOnlySameHerDriftRisk',
    ],
  },
  {
    entry: 'autonomy-actuation-dispatch-project-briefing-handoff',
    file: './autonomy-actuation.test.ts',
    snippets: [
      'plans and dispatches a proactive observe task through the selected channel',
      'auto-dispatches low-risk proactive code edits through workspace-write code agents',
      'turnId: expect.stringContaining(\'autonomy-task:default:1000:\')',
      'projectBriefing: expect.objectContaining({',
      'preDialogueAwarenessLine: expect.stringContaining(\'Before answering, remember this is still the same local-first digital life project\')',
    ],
  },
  {
    entry: 'cli-external-runtime-context-block-carry',
    file: './executor-adapters/cli.test.ts',
    snippets: [
      'injects runtime context into the CLI environment and execution events',
      'project_preflight=identity=Alicization | phase=Phase 1 | open=cli execution project awareness',
      'project_awareness=Before CLI dispatch, remember this is still the same local-first digital life project.',
      'same-her hold: keep CLI execution grounded on the same living line before widening outward.',
      'same living line: CLI execution should carry this same Phase 1 digital life before widening outward.',
    ],
  },
  {
    entry: 'codex-external-runtime-context-block-carry',
    file: './executor-adapters/codex.test.ts',
    snippets: [
      'dispatches codex execution and records dispatch, step, and result events',
      'project_same_her_hold=',
      'project_continuity=',
    ],
  },
  {
    entry: 'claude-code-external-runtime-context-block-carry',
    file: './executor-adapters/claude-code.test.ts',
    snippets: [
      'dispatches claude code execution and records dispatch, step, and result events',
      'project_same_her_hold=',
      'project_continuity=',
    ],
  },
  {
    entry: 'openclaw-external-runtime-context-block-carry',
    file: './executor-adapters/openclaw.test.ts',
    snippets: [
      'dispatches openclaw execution and records dispatch, step, and result events',
      'project_same_her_hold=',
      'project_continuity=',
    ],
  },
  {
    entry: 'execution-result-feedback-same-her-reopen',
    file: './runtime-execution-feedback.test.ts',
    snippets: [
      're-normalizes missing pre-dialogue project awareness before settling execution feedback so auxiliary execution paths cannot skip the same-her project brief',
      'passes structured execution project briefing into result feedback closure so Phase 1 open-loop carry does not depend on thin summary text',
      'sameHerSelfLine: \'开口前先记住：这是同一个数字生命项目，她仍在 Phase 1，而且情绪、记忆、主动性和具身闭环还没有真正收稳。\'',
    ],
  },
  {
    entry: 'execution-feedback-memory-reconsolidation-writeback',
    file: './runtime-memory-reconsolidation.test.ts',
    snippets: [
      'reconsolidates execution-result feedback and appends a richer same-her project briefing into memory instead of falling back to a thinner project shell',
      'source: \'execution-result-feedback\'',
      'nextClosureTarget: \'继续把情绪、记忆、主动性和具身闭环收成同一条 same-her life loop。\'',
    ],
  },
  {
    entry: 'execution-delivery-restart-reopen-project-brief',
    file: './runtime.test.ts',
    snippets: [
      'restores generic Phase 1 pending execution delivery after restart without inventing same-her callback-line continuity wording',
      'identity: expect.stringContaining(\'local-first digital life project\')',
      'currentPhase: expect.stringContaining(\'Phase 1: Local Digital Life\')',
      'preDialogueAwarenessLine: expect.stringContaining(\'Before answering, remember\')',
      'preDialogueAwarenessSummary: expect.stringContaining(\'Alicization is a local-first digital life project\')',
    ],
  },
] as const

describe('desktop execution chain project awareness audit', () => {
  it('keeps one explicit route-level proof that the early desktop execution chain carries same-her project awareness before execution and when execution feedback reopens', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'agent-runtime-canonical-execution-briefing' }),
      expect.objectContaining({ entry: 'execution-runtime-context-sanitization-carry' }),
      expect.objectContaining({ entry: 'task-thread-dispatch-project-continuity-persistence' }),
      expect.objectContaining({ entry: 'main-session-dispatch-project-briefing-handoff' }),
      expect.objectContaining({ entry: 'autonomy-actuation-dispatch-project-briefing-handoff' }),
      expect.objectContaining({ entry: 'cli-external-runtime-context-block-carry' }),
      expect.objectContaining({ entry: 'codex-external-runtime-context-block-carry' }),
      expect.objectContaining({ entry: 'claude-code-external-runtime-context-block-carry' }),
      expect.objectContaining({ entry: 'openclaw-external-runtime-context-block-carry' }),
      expect.objectContaining({ entry: 'execution-result-feedback-same-her-reopen' }),
      expect.objectContaining({ entry: 'execution-feedback-memory-reconsolidation-writeback' }),
      expect.objectContaining({ entry: 'execution-delivery-restart-reopen-project-brief' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the desktop execution-chain claim to current behavior tests instead of only proof-map prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: the early desktop execution chain now has route-level project-awareness proof, while future execution families still need explicit registration', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const dispatchSource = readFileSync(new URL('./task-thread-dispatcher.test.ts', import.meta.url), 'utf8')
    const feedbackSource = readFileSync(new URL('./runtime-execution-feedback.test.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Execution callback generation and execution-first inline replies')
    expect(matrixSource).toContain('desktop-execution-chain-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('task-thread-dispatch-owner-audit.test.ts')
    expect(matrixSource).toContain('future execution dispatch families still need explicit owner registration')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(dispatchSource).toContain('persists execution runtime context onto the task thread metadata before dispatch')
    expect(feedbackSource).toContain(
      'passes structured execution project briefing into result feedback closure so Phase 1 open-loop carry does not depend on thin summary text',
    )
    expect(runtimeSource).toContain(
      'restores generic Phase 1 pending execution delivery after restart without inventing same-her callback-line continuity wording',
    )
  })
})
