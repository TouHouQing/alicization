import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'execution-first-inline-finished-payload-carry',
    file: './main-chat-background-run.test.ts',
    snippets: [
      'expectPhase1ProjectStateInvariant(',
      'expectPhase1RecoveryProjectStateInvariant(',
      'expect(String(input.structured.projectState?.preDialogueAwarenessLine ?? \'\')).toMatch(/数字生命项目|local-first digital life project|same living line|same-her|Phase 1|one living her|one continuous her|face, motion, and lipsync/i)',
    ],
  },
  {
    entry: 'dispatch-only-deferred-proactive-audit-carry',
    file: './runtime.test.ts',
    snippets: [
      'keeps richer pre-dialogue same-her awareness alive in deferred proactive audit payloads when visible proactive speech is withheld',
      'summary: \'continuity=same-her-baseline | before answering, keep the same Phase 1 digital life line explicit and lower-pressure.\'',
      'expect(String(visualPresenceState?.runtimeDigest?.projectState?.continuityCue ?? \'\')).toMatch(/same-thread|same line|callback|same living line|same-her|continuous her|same phase 1 digital life|keep the same living line inward|工作线程|local-first digital life project|phase stays phase 1/i)',
    ],
  },
  {
    entry: 'execution-callback-gateway-project-state-self-brief',
    file: './runtime-execution-delivery.test.ts',
    snippets: [
      'keeps same-her lower-pressure opening guidance on gateway-authored execution callback structured payloads',
      'expect.stringContaining(\'[ALICIZATION_PROJECT_STATE]\')',
      'expect.stringContaining(\'Execution callback delivery must stay inside the same digital life project line\')',
    ],
  },
  {
    entry: 'execution-callback-project-state-self-authority-handoff',
    file: './runtime-execution-delivery.test.ts',
    snippets: [
      'keeps gateway-authored execution callback return on one same Phase 1 digital-life line when project-state self authority survives into embodiment handoff',
      'openingGuidance: \'Stay inside the current same-her baseline. Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
      'expect((structured as any)?.proactive?.nextFocus).toBe(\'project-carry/phase-1/measured-return/same-line\')',
    ],
  },
  {
    entry: 'execution-delivery-surface-callback-payoff-route',
    file: './execution-delivery-surface.test.ts',
    snippets: [
      'lets person-state projection act as the single cautious delivery authority for execution callbacks',
      'keeps richer same-her doctrine and authority summary when fresher runtime self-line is thinner in callback payoff prompts',
      'next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
    ],
  },
  {
    entry: 'main-gateway-execution-capability-project-briefing-route',
    file: './main-chat-execution-surface.test.ts',
    snippets: [
      'includes canonical project briefing in execution capability system blocks when runtime context is available',
      'prefers same-her awareness over thinner preflight summaries in execution capability project briefing blocks',
      'expect(projectBriefingBlock).toContain(\'same_her_hold=\')',
      'expect(projectBriefingBlock).toContain(\'project_continuity=\')',
      'expect(projectBriefingBlock).toContain(\'Execution guidance must stay inside the same digital life project\')',
    ],
  },
  {
    entry: 'main-session-execution-capability-project-briefing-handoff',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'passes summary-only same-her project briefing through the main-session execution capability entrypoint before execution answers widen outward',
      'expect(projectBriefingSystemText).toContain(\'project_identity=Alicization is still the same local-first digital life project.\')',
      'expect(projectBriefingSystemText).toContain(\'project_phase=Phase 1: Local Digital Life\')',
      'expect(projectBriefingSystemText).toContain(`project_continuity_arc_stage=${runtimeArcStage}`)',
      'expect(projectBriefingSystemText).not.toContain(`project_awareness=${thinRuntimeAwarenessLine}`)',
    ],
  },
  {
    entry: 'main-session-direct-execution-project-briefing-route',
    file: './main-chat-session-runtime.test.ts',
    snippets: [
      'keeps canonical project briefing explicit before main-session direct execution routing opens outward',
      'expect(projectBriefingSystemText).toContain(\'[ALICIZATION_PROJECT_BRIEFING]\')',
      'expect(projectBriefingSystemText).toContain(`project_continuity_arc_stage=${runtimeArcStage}`)',
      'expect(routingGuardSystemText).toContain(\'[ALICIZATION_EXECUTION_ROUTING_GUARD]\')',
      'expect(projectBriefingIndex).toBeLessThan(routingGuardIndex)',
      'expect(projectBriefingSystemText).not.toContain(`project_awareness=${thinRuntimeAwarenessLine}`)',
    ],
  },
] as const

describe('execution surface project awareness audit', () => {
  it('keeps one explicit route-level proof that execution-first and callback-only surfaces preserve same-her project awareness before visible execution speech lands', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'execution-first-inline-finished-payload-carry' }),
      expect.objectContaining({ entry: 'dispatch-only-deferred-proactive-audit-carry' }),
      expect.objectContaining({ entry: 'execution-callback-gateway-project-state-self-brief' }),
      expect.objectContaining({ entry: 'execution-callback-project-state-self-authority-handoff' }),
      expect.objectContaining({ entry: 'execution-delivery-surface-callback-payoff-route' }),
      expect.objectContaining({ entry: 'main-gateway-execution-capability-project-briefing-route' }),
      expect.objectContaining({ entry: 'main-session-execution-capability-project-briefing-handoff' }),
      expect.objectContaining({ entry: 'main-session-direct-execution-project-briefing-route' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-surface continuity claim to real current tests instead of only broad matrix wording', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: execution-only dialogue surfaces now have route-level project-awareness proof, but this still does not prove every future execution family will inherit the same chain automatically', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const backgroundRunSource = readFileSync(new URL('./main-chat-background-run.test.ts', import.meta.url), 'utf8')
    const executionDeliverySource = readFileSync(new URL('./runtime-execution-delivery.test.ts', import.meta.url), 'utf8')
    const executionSurfaceSource = readFileSync(new URL('./main-chat-execution-surface.test.ts', import.meta.url), 'utf8')
    const sessionRuntimeSource = readFileSync(new URL('./main-chat-session-runtime.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')

    expect(backgroundRunSource).toContain('expectPhase1RecoveryProjectStateInvariant(')
    expect(executionDeliverySource).toContain(
      'keeps gateway-authored execution callback return on one same Phase 1 digital-life line when project-state self authority survives into embodiment handoff',
    )
    expect(executionSurfaceSource).toContain(
      'prefers same-her awareness over thinner preflight summaries in execution capability project briefing blocks',
    )
    expect(sessionRuntimeSource).toContain(
      'passes summary-only same-her project briefing through the main-session execution capability entrypoint before execution answers widen outward',
    )
    expect(sessionRuntimeSource).toContain(
      'keeps canonical project briefing explicit before main-session direct execution routing opens outward',
    )
  })
})
