import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'subconscious-autonomy-execution-bridge-request',
    file: './execution-preflight-audit.test.ts',
    snippets: [
      'requires subconscious autonomy execution bridge files to request canonical execution runtime context before background auto-dispatch opens outward',
      'expect(source).toContain(\'buildExecutionRuntimeContext: async ({\')',
      'expect(source).toContain(\'}) => await backgroundAgentTurn.buildExecutionRuntimeContext({\')',
      'expect(source).toContain(\'sensorySnapshot,\')',
    ],
  },
  {
    entry: 'autonomy-actuation-observe-dispatch-project-briefing',
    file: './autonomy-actuation.test.ts',
    snippets: [
      'plans and dispatches a proactive observe task through the selected channel',
      'turnId: expect.stringContaining(\'autonomy-task:default:1000:\')',
      'projectBriefing: expect.objectContaining({',
      'sameHerSelfLine: expect.stringContaining(\'Same Phase 1 digital life\')',
    ],
  },
  {
    entry: 'autonomy-actuation-workspace-write-dispatch-project-briefing',
    file: './autonomy-actuation.test.ts',
    snippets: [
      'auto-dispatches low-risk proactive code edits through workspace-write code agents',
      'sandbox: \'workspace-write\'',
      'projectBriefing: expect.objectContaining({',
      'preDialogueAwarenessLine: expect.stringContaining(\'Before answering, remember this is still the same local-first digital life project\')',
    ],
  },
  {
    entry: 'low-risk-autonomous-self-start-ownership-gate',
    file: './execution-autonomy-ownership-project-awareness-audit.test.ts',
    snippets: [
      'keeps one explicit route-level proof that low-risk autonomous execution self-start requires structural same-her thread ownership',
      'expect.objectContaining({ entry: \'low-risk-autonomous-self-start-ownership-gate\' })',
      'expect.objectContaining({ entry: \'codex-self-start-keeps-structural-autonomy\' })',
      'expect.objectContaining({ entry: \'claude-code-self-start-keeps-structural-autonomy\' })',
    ],
  },
] as const

describe('execution autonomy handoff project awareness audit', () => {
  it('keeps one explicit route-level proof that runtime-owned autonomous execution requests canonical execution context, carries same-her project briefing through actuation dispatch, and stays bounded by structural autonomous ownership before low-risk self-start can leave the desktop runtime', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'subconscious-autonomy-execution-bridge-request' }),
      expect.objectContaining({ entry: 'autonomy-actuation-observe-dispatch-project-briefing' }),
      expect.objectContaining({ entry: 'autonomy-actuation-workspace-write-dispatch-project-briefing' }),
      expect.objectContaining({ entry: 'low-risk-autonomous-self-start-ownership-gate' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the runtime-owned autonomous execution handoff claim to current preflight, actuation, and self-start ownership proofs instead of leaving the same-her bridge distributed across unrelated execution seams', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: runtime-owned autonomous execution handoff now has route-level project-awareness proof, while future execution-preflight and dispatch families still need explicit classification', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const coverageSource = readFileSync(new URL('./project-awareness-coverage-matrix.test.ts', import.meta.url), 'utf8')
    const preflightSource = readFileSync(new URL('./execution-preflight-audit.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('execution-autonomy-handoff-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('future execution-preflight families still need explicit classification')
    expect(matrixSource).toContain('future execution dispatch families still need explicit owner registration')
    expect(coverageSource).toContain('execution-autonomy-handoff-project-awareness-audit.test.ts')
    expect(preflightSource).toContain(
      'requires subconscious autonomy execution bridge files to request canonical execution runtime context before background auto-dispatch opens outward',
    )
  })
})
