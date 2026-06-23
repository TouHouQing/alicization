import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'callback-runtime-recall-and-system-block-carry',
    file: './execution-callback-runtime.test.ts',
    snippets: [
      'keeps same-her project-state callback closure wording visible in callback recall and system block',
      'execution_callback_goal:Carry the same-her continuity line while finishing the still-open memory closure repair.',
      'Keep the callback on the same Phase 1 digital-life line and do not let it collapse into a detached result notice.',
    ],
  },
  {
    entry: 'host-confirmed-resume-confirmation-and-project-carry',
    file: './execution-callback-runtime.test.ts',
    snippets: [
      'carries host-confirmed resume confirmation boundaries into callback recall, system block, and continuity metadata',
      'does not let a thin stored thread shell outrank richer host-confirmed resume event project carry in callback project awareness',
      'host-confirmed-before-redispatch',
      'resume-before-dispatch',
    ],
  },
  {
    entry: 'blocked-dispatch-thin-event-shell-does-not-outrank-stored-same-her-carry',
    file: './execution-callback-runtime.test.ts',
    snippets: [
      'does not let a thin blocked-dispatch event runtime briefing erase a richer stored same-her callback carry',
      'Blocked callback continuity already survives later return-side reopen without dropping the same living line.',
      'project continuity exists',
      'generic next closure',
    ],
  },
  {
    entry: 'current-conscious-frame-dialogue-runtime-same-her-grounding',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'treats dialogue-runtime same-her continuity as explicit current-conscious project grounding before visible reply planning widens',
      'expect(frame?.reasonTags).toContain(\'continuity-arc:same-thread-continuation\')',
      'expect(frame?.reasonTags).toContain(\'continuity-timing:next-open-window\')',
      'expect(frame?.projectState?.sameHerHoldDetail).toBe(sameHerHoldDetail)',
      'expect(frame?.consciousNeed).toContain(\'The live project reminder still says one same returned-side Phase 1 line is still active.\')',
    ],
  },
  {
    entry: 'current-conscious-frame-callback-closure-carry-under-detours',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps same-her landed and still-open phase-1 closure carry explicit in callback conscious need and speaking intention under longer project-state detours',
      'expect(frame?.consciousNeed).toContain(\'same-her closure work\')',
      'expect(frame?.speakingIntention).toContain(\'same Phase 1 digital life\')',
      'expect(frame?.speakingIntention).toContain(\'still-open closure work\')',
      'expect(frame?.speakingIntention).toContain(\'same living continuity\')',
    ],
  },
  {
    entry: 'current-conscious-frame-callback-specific-project-awareness',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps callback-specific same-her project awareness explicit in conscious-frame project grounding instead of falling back to a generic shell',
      'This callback return still belongs to one same her carrying the same closure line forward.',
      'Do not let same-her callback continuity collapse into a generic callback shell or detached utility notice once the final visible reply is formed.',
      'expect(systemBlock).toContain(`Project same-her self line: ${callbackSameHerSelfLine}.`)',
    ],
  },
  {
    entry: 'current-conscious-frame-callback-fuller-authority-tail',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps fuller same-her authority and canonical next-closure tail explicit in speaking intention instead of truncating them back into a thinner callback shell',
      'expect(frame?.speakingIntention).toContain(\'generic assistant shell can take over\')',
      'expect(frame?.speakingIntention).toContain(\'Unresolved closure carry\')',
      'expect(frame?.speakingIntention).toContain(\'detached callback fluency can take over\')',
    ],
  },
  {
    entry: 'current-conscious-frame-execution-callback-doctrine',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'lets execution-callback doctrine shape the current conscious need and speaking intention',
      'expect(frame?.consciousNeed).toContain(\'leaving the host room\')',
      'expect(frame?.speakingIntention).toContain(\'room-giving\')',
      'expect(frame?.reasonTags).toContain(\'execution-callback-doctrine:lower-pressure\')',
    ],
  },
  {
    entry: 'current-conscious-frame-cadence-reconfirmation-doctrine',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'treats relationship cadence reconfirmation as lower-pressure execution-callback doctrine inside the current conscious frame',
      'Relationship cadence stayed on the same bounded-return line after reconfirmation.',
      'expect(frame?.consciousNeed).toContain(\'leaving the host room\')',
      'expect(frame?.reasonTags).toContain(\'execution-callback-doctrine:lower-pressure\')',
    ],
  },
  {
    entry: 'current-conscious-frame-thin-room-making-doctrine',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'treats thin affective room-making wording as lower-pressure execution-callback doctrine inside the current conscious frame',
      '结果回来以后，余韵还在，先留白，别立刻把温度放大。',
      'expect(frame?.reasonTags).toContain(\'execution-callback-doctrine:lower-pressure\')',
    ],
  },
  {
    entry: 'callback-delivery-gateway-project-state-carry',
    file: './runtime-execution-delivery.test.ts',
    snippets: [
      'keeps gateway-authored execution callback return on one same Phase 1 digital-life line when project-state self authority survives into embodiment handoff',
      'expect.stringContaining(\'[ALICIZATION_PROJECT_STATE]\')',
      'expect.stringContaining(\'Execution callback delivery must stay inside the same digital life project line\')',
    ],
  },
  {
    entry: 'execution-capability-project-briefing-callback-preflight',
    file: './main-chat-execution-surface.test.ts',
    snippets: [
      'includes canonical project briefing in execution capability system blocks when runtime context is available',
      'Execution guidance must stay inside the same digital life project',
      'project_preflight=Same Phase 1 digital life. The callback return still belongs to one living her rather than a generic execution shell.',
    ],
  },
  {
    entry: 'callback-payoff-person-state-authority-carry',
    file: './execution-delivery-surface.test.ts',
    snippets: [
      'lets person-state projection act as the single cautious delivery authority for execution callbacks',
      'keeps richer same-her doctrine and authority summary when fresher runtime self-line is thinner in callback payoff prompts',
      'next_closure_target=Keep extending cross-modal same-her proof across longer, noisier real-desktop runs',
    ],
  },
] as const

describe('execution callback runtime project awareness audit', () => {
  it('keeps one explicit route-level proof that execution callback runtime shaping preserves the same-her project line before callback speech lands', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'callback-runtime-recall-and-system-block-carry' }),
      expect.objectContaining({ entry: 'host-confirmed-resume-confirmation-and-project-carry' }),
      expect.objectContaining({ entry: 'blocked-dispatch-thin-event-shell-does-not-outrank-stored-same-her-carry' }),
      expect.objectContaining({ entry: 'current-conscious-frame-dialogue-runtime-same-her-grounding' }),
      expect.objectContaining({ entry: 'current-conscious-frame-callback-closure-carry-under-detours' }),
      expect.objectContaining({ entry: 'current-conscious-frame-callback-specific-project-awareness' }),
      expect.objectContaining({ entry: 'current-conscious-frame-callback-fuller-authority-tail' }),
      expect.objectContaining({ entry: 'current-conscious-frame-execution-callback-doctrine' }),
      expect.objectContaining({ entry: 'current-conscious-frame-cadence-reconfirmation-doctrine' }),
      expect.objectContaining({ entry: 'current-conscious-frame-thin-room-making-doctrine' }),
      expect.objectContaining({ entry: 'callback-delivery-gateway-project-state-carry' }),
      expect.objectContaining({ entry: 'execution-capability-project-briefing-callback-preflight' }),
      expect.objectContaining({ entry: 'callback-payoff-person-state-authority-carry' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the execution-callback runtime claim to current behavior tests instead of only broader execution-surface prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('canonicalizes execution-callback project awareness through the shared awareness builder before reducing it back to callback-facing summary carry', () => {
    const runtimeSource = readFileSync(new URL('./execution-callback-runtime.ts', import.meta.url), 'utf8')

    expect(runtimeSource).toContain('buildAlicizationProjectPreDialogueAwarenessLine({')
    expect(runtimeSource).toContain('resolveAlicizationProjectPreDialogueAwarenessLine({')
  })

  it('makes the current boundary explicit: callback runtime shaping and callback pre-speech conscious-frame grounding now have route-level project-awareness proof, while future execution families still need explicit registration', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const callbackRuntimeSource = readFileSync(new URL('./execution-callback-runtime.test.ts', import.meta.url), 'utf8')
    const deliverySource = readFileSync(new URL('./runtime-execution-delivery.test.ts', import.meta.url), 'utf8')
    const consciousFrameSource = readFileSync(new URL('./current-conscious-frame.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Execution callback generation and execution-first inline replies')
    expect(matrixSource).toContain('execution-callback-runtime-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(callbackRuntimeSource).toContain(
      'keeps same-her project-state callback closure wording visible in callback recall and system block',
    )
    expect(deliverySource).toContain(
      'keeps gateway-authored execution callback return on one same Phase 1 digital-life line when project-state self authority survives into embodiment handoff',
    )
    expect(consciousFrameSource).toContain(
      'keeps same-her landed and still-open phase-1 closure carry explicit in callback conscious need and speaking intention under longer project-state detours',
    )
    expect(consciousFrameSource).toContain(
      'keeps fuller same-her authority and canonical next-closure tail explicit in speaking intention instead of truncating them back into a thinner callback shell',
    )
  })
})
