import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'one-shot-provider-wrapper-self-brief-injection',
    file: './runtime-main-gateway-one-shot.test.ts',
    snippets: [
      'injects project-state identity and closure dashboard into audited screen-semantic one-shot prompts before generation',
      'expect(screenSemanticSelfBrief).toContain(\'project_identity=Alicization is a local-first digital life project\')',
      'expect(screenSemanticSelfBrief).toContain(\'current_phase=Phase 1: Local Digital Life\')',
      'Screen semantic interpretation must stay inside the same digital life project line',
      'Do not let screen semantic interpretation collapse into a generic desktop classifier',
      'next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
    ],
  },
  {
    entry: 'one-shot-provider-wrapper-fail-close',
    file: './runtime-main-gateway-one-shot.test.ts',
    snippets: [
      'fails closed before provider generation if canonical project-state context is missing from assembled one-shot messages',
      'main-gateway.one-shot-missing-project-state-context',
      'projectStateAuditFamily: \'runtime-main-gateway-one-shot.ts:screen-semantic-and-scene-appraisal\'',
    ],
  },
  {
    entry: 'runtime-dispatch-owner-reminder-self-brief',
    file: './runtime.test.ts',
    snippets: [
      'Reminder delivery must stay inside the same digital life project line',
      'text.includes(\'project_identity=Alicization is a local-first digital life project\')',
      'text.includes(\'current_phase=Phase 1: Local Digital Life\')',
      'text.includes(\'pre_dialogue_awareness=\')',
      'text.includes(\'next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs\')',
    ],
  },
  {
    entry: 'runtime-dispatch-owner-proactive-self-brief',
    file: './runtime-proactive-prelude-project-awareness-regression.test.ts',
    snippets: [
      'injects a proactive-specific project self-brief before gateway generation so initiative stays on the same digital-life closure line',
      '[ALICIZATION_PROACTIVE_SELF_BRIEF]',
      'Proactive initiative must stay inside the same digital life project line',
      'Do not let proactive initiative collapse into a generic caring nudge',
    ],
  },
  {
    entry: 'mind-state-typed-consumer-self-brief-carry',
    file: './runtime-mind-state-project-awareness-regression.test.ts',
    snippets: [
      'const dialogueTurnSemanticsCall = gatewayCalls.find(call => call.source === \'dialogue-turn-semantics\')',
      'const subjectiveInferenceCall = gatewayCalls.find(call => call.source === \'subjective-inference\')',
      'expect(selfBrief).toContain(\'project_identity=Alicization is a local-first digital life project\')',
      'expect(selfBrief).toContain(\'current_phase=Phase 1: Local Digital Life\')',
      'expect(selfBrief).toContain(\'pre_dialogue_awareness=Before answering, remember:\')',
      'expect(selfBrief).toContain(\'same digital life project line\')',
    ],
  },
  {
    entry: 'execution-callback-typed-consumer-self-brief',
    file: './runtime-execution-delivery.test.ts',
    snippets: [
      'keeps same-her lower-pressure opening guidance on gateway-authored execution callback structured payloads',
      'expect.stringContaining(\'[ALICIZATION_EXECUTION_CALLBACK_SELF_BRIEF]\')',
      'expect.stringContaining(\'Execution callback delivery must stay inside the same digital life project line\')',
      'expect.stringContaining(\'Do not let execution callback delivery collapse into a detached result notice\')',
    ],
  },
  {
    entry: 'memory-planning-typed-consumer-self-brief',
    file: './memory-os/provider-planning.test.ts',
    snippets: [
      'expect(systems.every(system => system.includes(\'[ALICIZATION_MEMORY_PLANNING_SELF_BRIEF]\'))).toBe(true)',
      'expect(systems.every(system => system.includes(\'project_identity=Alicization is a local-first digital life project\'))).toBe(true)',
      'expect(systems.every(system => system.includes(\'current_phase=Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.\'))).toBe(true)',
      'expect(systems.every(system => system.includes(\'Memory planning must stay inside the same digital life project line\'))).toBe(true)',
      'expect(systems.every(system => system.includes(\'Do not let recollection planning collapse into generic retrieval orchestration\'))).toBe(true)',
      `expect(systems.every(system => system.includes('Alicization is a local-first digital life project building one continuous "her"'))).toBe(true)`,
    ],
  },
] as const

describe('provider consumer project awareness audit', () => {
  it('keeps one explicit route-level proof that current provider-facing wrapper, dispatch-owner, and typed audited consumers preserve same-her project awareness before generation', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'one-shot-provider-wrapper-self-brief-injection' }),
      expect.objectContaining({ entry: 'one-shot-provider-wrapper-fail-close' }),
      expect.objectContaining({ entry: 'runtime-dispatch-owner-reminder-self-brief' }),
      expect.objectContaining({ entry: 'runtime-dispatch-owner-proactive-self-brief' }),
      expect.objectContaining({ entry: 'mind-state-typed-consumer-self-brief-carry' }),
      expect.objectContaining({ entry: 'execution-callback-typed-consumer-self-brief' }),
      expect.objectContaining({ entry: 'memory-planning-typed-consumer-self-brief' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the provider-consumer claim to current behavior and gateway-call tests instead of only family registration', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: current provider-facing audited consumers now have dedicated same-her proof, while future new dialogue entrypoints still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const oneShotSource = readFileSync(new URL('./runtime-main-gateway-one-shot.test.ts', import.meta.url), 'utf8')
    const runtimeSource = readFileSync(new URL('./runtime.test.ts', import.meta.url), 'utf8')
    const proactivePreludeSource = readFileSync(new URL('./runtime-proactive-prelude-project-awareness-regression.test.ts', import.meta.url), 'utf8')
    const mindStateSource = readFileSync(new URL('./runtime-mind-state-project-awareness-regression.test.ts', import.meta.url), 'utf8')
    const executionSource = readFileSync(new URL('./runtime-execution-delivery.test.ts', import.meta.url), 'utf8')
    const memoryPlanningSource = readFileSync(new URL('./memory-os/provider-planning.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('provider-consumer-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('runtime-proactive-prelude-project-awareness-regression.test.ts')
    expect(auditSource).toContain('provider-dispatch-owner proactive self-brief')
    expect(oneShotSource).toContain(
      'injects project-state identity and closure dashboard into audited screen-semantic one-shot prompts before generation',
    )
    expect(runtimeSource).toContain(
      'Reminder delivery must stay inside the same digital life project line',
    )
    expect(proactivePreludeSource).toContain(
      'injects a proactive-specific project self-brief before gateway generation so initiative stays on the same digital-life closure line',
    )
    expect(mindStateSource).toContain(
      'const dialogueTurnSemanticsCall = gatewayCalls.find(call => call.source === \'dialogue-turn-semantics\')',
    )
    expect(executionSource).toContain(
      'keeps same-her lower-pressure opening guidance on gateway-authored execution callback structured payloads',
    )
    expect(memoryPlanningSource).toContain(
      'Memory planning must stay inside the same digital life project line',
    )
  })
})
