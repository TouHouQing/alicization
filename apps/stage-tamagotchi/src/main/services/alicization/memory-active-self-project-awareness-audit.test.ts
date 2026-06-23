import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'organic-memory-same-her-drift-risk-recall',
    file: './runtime-organic-memory-prompt.test.ts',
    snippets: [
      'keeps same-her drift-risk callback memory ahead of a generic callback receipt when reopening execution continuity before dialogue',
      'The same-her drift-risk callback line comes back first.',
      'Keep the same-her drift-risk callback line inward until there is more room.',
      'Phase 1 closure is still open, so the drift-risk callback line should dominate the generic callback receipt.',
    ],
  },
  {
    entry: 'current-conscious-frame-project-triad',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'threads project identity, current phase, and still-open life loop into the current conscious frame before the turn speaks',
      'expect(frame?.consciousNeed).toContain(\'local-first digital life project\')',
      'expect(frame?.projectState?.preflightSummary).toContain(\'Phase 1: Local Digital Life\')',
      'expect(frame?.reasonTags.some(tag => tag.startsWith(\'project-open-loop:\'))).toBe(true)',
    ],
  },
  {
    entry: 'current-conscious-frame-canonical-preflight-self-awareness',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'anchors every pre-turn conscious frame in canonical project preflight self-awareness before answering',
      'expect(frame?.consciousNeed).toContain(\'Before I answer, I need to stay inside alicization is a local-first digital life project\')',
      'expect(frame?.projectState?.nextClosureTarget).toContain(\'Keep extending cross-modal same-her proof\')',
      'expect(frame?.reasonTags).toEqual(expect.arrayContaining([',
    ],
  },
  {
    entry: 'current-conscious-frame-prefers-live-runtime-awareness',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'prefers live runtime project awareness when available so the pre-turn conscious frame tracks the current closure seam',
      'expect(frame?.projectState?.preflightSummary).toBe(\'I need to remember this is still the same digital life project before any local fluency takes over.\')',
      'expect(frame?.projectState?.identity).toBe(\'this local-first digital life project still carrying one continuous her on the host machine\')',
      'expect(buildCurrentConsciousFrameSystemBlock(frame)).toContain(\'Carry the live project awareness line through this answer before generic project narration takes over.\')',
    ],
  },
  {
    entry: 'current-conscious-frame-thin-runtime-shell-cannot-outrank-canonical-carry',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'does not let thin runtime landed-open-next shells outrank richer canonical same-her closure carry in conscious-frame project grounding',
      'expect(frame?.projectState?.latestProgress?.toLowerCase()).toContain(\'same-session mirror carry\')',
      'expect(frame?.projectState?.nextClosureTarget).toContain(\'Project identity carry\')',
      'expect(frame?.consciousNeed).not.toContain(\'Project continuity exists\')',
    ],
  },
  {
    entry: 'current-conscious-frame-canonical-continuity-fallback',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'falls back to canonical continuity progress and closure fields when non-callback turns only have thin runtime project shells',
      'expect(frame?.projectState?.latestProgress?.toLowerCase()).toContain(\'same-session mirror carry\')',
      'expect(frame?.projectState?.primaryOpenLoop).toContain(\'Memory still needs stronger end-to-end closure\')',
      'expect(frame?.projectState?.nextClosureTarget).toContain(\'Keep extending cross-modal same-her proof\')',
    ],
  },
  {
    entry: 'current-conscious-frame-generic-next-closure-shell-rejected',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'does not let a generic next-closure shell outrank richer canonical same-her closure carry in conscious-frame project grounding',
      'expect(frame?.projectState?.nextClosureTarget).not.toContain(\'Generic next closure shell\')',
      'expect(frame?.consciousNeed).not.toContain(\'steadier carry of this project\')',
      'expect(frame?.projectState?.primaryOpenLoop).toContain(\'Memory still needs stronger end-to-end closure\')',
    ],
  },
  {
    entry: 'current-conscious-frame-landed-next-closure',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'also keeps the latest landed progress and next closure target visible inside the current conscious frame before speaking',
      'expect(frame?.projectState?.latestProgress?.toLowerCase()).toContain(\'same-session mirror carry\')',
      'expect(frame?.projectState?.nextClosureTarget).toContain(\'Keep extending cross-modal same-her proof\')',
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
    entry: 'current-conscious-frame-resume-confirmation-boundary-grounding',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps remembered host-confirmed resume confirmation boundary explicit in conscious need and speaking intention before callback wording opens outward',
      'expect(frame?.consciousNeed).toContain(\'bounded confirmation boundary\')',
      'expect(frame?.consciousNeed).toContain(\'new execution boundary\')',
      'expect(frame?.speakingIntention).toContain(\'host-confirmed-before-redispatch\')',
      'expect(frame?.speakingIntention).toContain(\'not permanent execution permission\')',
    ],
  },
  {
    entry: 'current-conscious-frame-host-visible-summary-rebuild',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'rebuilds current-conscious-frame project grounding from summary-only host-visible project-state audit when richer landed-open-next truth survives there first',
      'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.',
      'expect(frame?.projectState?.primaryOpenLoop).toBe(\'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.\')',
      'expect(frame?.speakingIntention).toContain(\'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.\')',
    ],
  },
  {
    entry: 'current-conscious-frame-legacy-summary-alias-repair',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'does not let blank legacy project-state fields block richer summary aliases inside current-conscious-frame grounding',
      'Project-state carry now keeps richer same-her closure truth alive across the host-visible audit even when blank legacy fields try to thin it.',
      'expect(frame?.projectState?.nextClosureTarget).toBe(\'Keep extending the same-her closure proof through pre-dialogue carry so the answer opens from one living line instead of collapsing into a thin project shell.\')',
      'expect(frame?.speakingIntention).toContain(\'generic project shell\')',
    ],
  },
  {
    entry: 'current-conscious-frame-summary-only-self-line-anchor',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps the same-her self line as the pre-dialogue anchor when current-conscious-frame only retains structured landed-open-next summaries before speaking',
      'expect(frame?.projectState?.preDialogueAwarenessLine).toBe(sameHerSelfLine)',
      'expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain(\'Same-session mirror carry\')',
      'expect(frame?.consciousNeed?.toLowerCase()).toContain(\'same phase 1 digital life\')',
      'expect(frame?.consciousNeed?.toLowerCase()).toContain(\'same living line\')',
    ],
  },
  {
    entry: 'current-conscious-frame-explicit-pre-dialogue-self-line-write',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'writes an explicit pre-dialogue awareness line and same-her self line into the conscious frame project state',
      'expect(frame?.projectState?.preDialogueAwarenessLine).toBe(\'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.\')',
      'expect(frame?.projectState?.sameHerSelfLine).toBe(\'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\')',
      'expect(systemBlock).toContain(\'Project same-her drift risk: If the answer slips into generic project guidance, the same-her closure line has drifted.\')',
    ],
  },
  {
    entry: 'current-conscious-frame-companion-headline-over-thin-shell',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'does not let the compact thin closure shell survive into current-conscious-frame project grounding when a richer same-her companion headline is present',
      'expect(frame?.projectState?.preDialogueAwarenessLine).toContain(\'holding together mainly through voice, face, and motion\')',
      'expect(frame?.projectState?.preDialogueAwarenessLine).toContain(\'still one living her\')',
      'expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain(\'same digital life | keep the closure seam explicit\')',
    ],
  },
  {
    entry: 'current-conscious-frame-drift-risk-reshapes-speaking-intention',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'lets same-her drift-risk reshape speaking intention away from generic helpfulness when local opening cues stay thin',
      'expect(frame?.speakingIntention?.toLowerCase()).toContain(\'same phase 1 digital life\')',
      'expect(frame?.speakingIntention?.toLowerCase()).toContain(\'default helpfulness\')',
      'expect(frame?.speakingIntention?.toLowerCase()).toContain(\'generic project guidance\')',
      'expect(frame?.speakingIntention).not.toBe(\'Answer helpfully and directly.\')',
    ],
  },
  {
    entry: 'current-conscious-frame-fuller-project-awareness-over-embodiment-headline',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'keeps a fuller project-and-phase awareness line over a narrower embodiment companion headline in current-conscious-frame grounding',
      'expect(frame?.projectState?.preDialogueAwarenessLine).toContain(\'Alicization is a local-first digital life project.\')',
      'expect(frame?.projectState?.preDialogueAwarenessLine).not.toContain(\'holding together mainly through voice, face, and motion\')',
      'expect(frame?.consciousNeed?.toLowerCase()).toContain(\'phase 1\')',
    ],
  },
  {
    entry: 'current-conscious-frame-thin-shell-repair',
    file: './current-conscious-frame.test.ts',
    snippets: [
      'carries same-her drift-risk into current-conscious-frame pre-dialogue awareness when the available project reminder is only a thin shell',
      'does not let the compact thin closure shell survive into current-conscious-frame grounding when a broader same-her phase-1 closure line is present',
      'expect(frame?.projectState?.preDialogueAwarenessLine).toContain(\'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\')',
      'expect(frame?.consciousNeed?.toLowerCase()).toContain(\'same living line\')',
    ],
  },
] as const

describe('memory active self project awareness audit', () => {
  it('keeps one explicit route-level proof that same-her project awareness survives from memory reopening into the active self before the turn speaks', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'organic-memory-same-her-drift-risk-recall' }),
      expect.objectContaining({ entry: 'current-conscious-frame-project-triad' }),
      expect.objectContaining({ entry: 'current-conscious-frame-canonical-preflight-self-awareness' }),
      expect.objectContaining({ entry: 'current-conscious-frame-prefers-live-runtime-awareness' }),
      expect.objectContaining({ entry: 'current-conscious-frame-thin-runtime-shell-cannot-outrank-canonical-carry' }),
      expect.objectContaining({ entry: 'current-conscious-frame-canonical-continuity-fallback' }),
      expect.objectContaining({ entry: 'current-conscious-frame-generic-next-closure-shell-rejected' }),
      expect.objectContaining({ entry: 'current-conscious-frame-landed-next-closure' }),
      expect.objectContaining({ entry: 'current-conscious-frame-callback-specific-project-awareness' }),
      expect.objectContaining({ entry: 'current-conscious-frame-resume-confirmation-boundary-grounding' }),
      expect.objectContaining({ entry: 'current-conscious-frame-host-visible-summary-rebuild' }),
      expect.objectContaining({ entry: 'current-conscious-frame-legacy-summary-alias-repair' }),
      expect.objectContaining({ entry: 'current-conscious-frame-summary-only-self-line-anchor' }),
      expect.objectContaining({ entry: 'current-conscious-frame-explicit-pre-dialogue-self-line-write' }),
      expect.objectContaining({ entry: 'current-conscious-frame-companion-headline-over-thin-shell' }),
      expect.objectContaining({ entry: 'current-conscious-frame-drift-risk-reshapes-speaking-intention' }),
      expect.objectContaining({ entry: 'current-conscious-frame-fuller-project-awareness-over-embodiment-headline' }),
      expect.objectContaining({ entry: 'current-conscious-frame-thin-shell-repair' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the memory-to-active-self continuity claim to real current tests instead of only matrix wording', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: memory reopening and current-conscious-frame shaping now have route-level same-her proof, but this still does not prove full long-run closure under noisy desktop life', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const organicMemorySource = readFileSync(new URL('./runtime-organic-memory-prompt.test.ts', import.meta.url), 'utf8')
    const consciousFrameSource = readFileSync(new URL('./current-conscious-frame.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(organicMemorySource).toContain(
      'Phase 1 closure is still open, so the drift-risk callback line should dominate the generic callback receipt.',
    )
    expect(consciousFrameSource).toContain(
      'threads project identity, current phase, and still-open life loop into the current conscious frame before the turn speaks',
    )
    expect(consciousFrameSource).toContain(
      'keeps remembered host-confirmed resume confirmation boundary explicit in conscious need and speaking intention before callback wording opens outward',
    )
  })
})
