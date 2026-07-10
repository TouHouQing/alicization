import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  ['response-charter-phase-1-open-loop-lower-pressure', 'keeps outward reply charter lower-pressure when the Phase 1 digital-life loop is still open'],
  ['response-charter-thin-project-state-falls-back-to-canonical-brief', 'falls back to the canonical project-state brief when an explicit projectState is present but too thin to keep the visible reply charter restrained'],
  ['response-charter-thin-chinese-same-her-reminder-rejected', 'prefers a richer same-her preDialogueAwarenessSummary over a thin Chinese project-awareness shell when charter rebuilds the visible reply posture'],
  ['response-charter-answer-planner-governing-project-closure-seam', 'prefers answer-planner governingProject so the final response charter keeps the same project closure seam visible'],
  ['response-charter-planner-governing-project-same-her-carry', 'preserves a stronger same-her planner governingProject without flattening the living-self project seam back into a generic project shell'],
  ['response-charter-callback-same-life-visible-reply-authority', 'treats stronger same-her project-state continuity cues as sufficient behavior-planning authority even when identity and open-loop fields are thin'],
  ['response-charter-drift-risk-visible-answer-guardrails', 'turns same-her drift risk into explicit visible-answer guardrails so project-state replies do not collapse into generic project shells'],
  ['response-charter-thin-conscious-frame-shell-fallback-repair', 'does not let a thin conscious-frame project shell suppress richer fallback same-her drift risk and embodiment closure carry'],
  ['response-charter-next-closure-target-not-truncated', 'does not let response-charter truncate the planner-carried full canonical next-closure target back into a shorter shell'],
  ['response-charter-governing-project-specialized-normalization', 'keeps governingProject closure normalization specialized to response-charter instead of collapsing into the generic project-awareness scorer'],
  ['response-charter-held-line-anti-restart-doctrine', 'keeps same-her anti-restart doctrine explicit when a deliberately held line returns through response-charter'],
  ['response-charter-held-line-system-block-anti-restart', 'renders same-her anti-restart doctrine into the provider-facing response-charter system block for held-line returns'],
  ['response-charter-project-timing-later-opening-restraint', 'lets project continuity preferred timing directly slow visible reply widening even without explicit recollection timing'],
  ['response-charter-conscious-frame-timing-restraint', 'lets conscious-frame continuity timing tags directly slow visible reply widening even when project-state timing is absent'],
  ['response-charter-repair-before-closeness-timing', 'keeps repair-before-closeness same-thread timing explicit in visible reply governance instead of thinning it into generic later-opening pressure'],
  ['response-charter-initiative-repair-before-closeness-restraint', 'lets initiative repair-before-closeness restraint directly hold visible reply governance on the same repair line even when the conscious-frame text is thinner'],
  ['response-charter-structured-conscious-frame-project-state-carry', 'lets structured pre-turn conscious-frame project-state keep project identity, landed progress, and open closure explicit in reply governance'],
  ['response-charter-generic-project-shell-suppression', 'threads generic-project-shell suppression into charter-level discipline for direct project-state answers'],
  ['response-charter-landed-progress-next-closure-inward-first', 'keeps landed progress and next closure carry inward-first even when tuning only names the newer project-state carry dimensions'],
  ['response-charter-rich-awareness-carry-inward-first', 'treats rich pre-dialogue awareness carry as the same inward-first project-state discipline even without the legacy generic-shell flag'],
  ['response-charter-emotional-closure-low-pressure', 'keeps same-her emotional closure low-pressure even when tuning only names the newer closure-carry dimensions'],
  ['response-charter-emotional-closure-low-pressure-anti-restart-discipline', 'keeps same-her emotional closure discipline when tuning only names low-pressure and anti-restart closure carry'],
  ['response-charter-measured-return-same-life-governance', 'lets initiative measured-return restraint directly keep visible reply governance lower-pressure on the same living line'],
  ['response-charter-memory-deliberation-recollection-boundary', 'lets shared memory deliberation kernel feed reasons and truth discipline in the response charter'],
  ['response-charter-corrected-same-person-anti-progress-pressure', 'keeps host-corrected same-person continuity explicit in visible reply discipline instead of letting the charter fall back to progress-pressure continuation'],
  ['response-charter-same-seam-procedure-carry-fallback', 'keeps same-seam procedural continuity discipline in the charter fallback path'],
  ['response-charter-same-thread-project-state-callback-no-fresh-report', 'keeps same-thread project-state callback turns from flattening into a fresh report opening'],
  ['response-charter-resume-confirmation-boundary-governance', 'keeps remembered host-confirmed resume confirmation boundary explicit in visible reply governance before callback wording opens outward'],
  ['response-charter-generic-later-opening-without-quiet-carry', 'keeps the generic later-opening wording when measured-return timing lacks a quiet same-her inward carry cue'],
  ['response-charter-fails-closed-same-her-project-state-discipline', 'fails closed into same-her project-state discipline when discourse already marks continuity even without tuning advice'],
  ['response-charter-direct-project-status-fails-closed', 'also fails closed into same-her project-state discipline when the turn is clearly a direct project-status answer even without explicit continuity tags'],
  ['response-charter-completion-timing-language-drift-fails-closed', 'also fails closed into same-her project-state discipline when the host asks how far the goal has landed, when it closes, and whether the thread drifted into English or off-project wording'],
  ['response-charter-durable-same-her-cadence-outward-discipline', 'upgrades durable same-her cadence from self-evolution into charter-level outward continuity discipline'],
  ['response-charter-active-same-her-baseline-governance', 'threads active same-her continuity governance into charter-level reply discipline'],
  ['response-charter-held-autonomy-low-pressure-general-discipline', 'keeps held-autonomy continuity low-pressure in the general response charter, not only fast-path follow-ups'],
  ['response-charter-recollection-inward-internal-only', 'keeps recollection inward in the charter when memory deliberation remains internal-only'],
  ['response-charter-room-first-repair-recollection-discipline', 'lets host room-first repair memory tighten charter-level visible recollection discipline'],
  ['response-charter-pre-dialogue-awareness-explicit-mustdo', 'keeps pre-dialogue project awareness explicit in charter mustDo when the current conscious frame is carrying the active project seam'],
  ['response-charter-embodiment-closure-discipline', 'adds embodiment closure discipline when the active project seam still depends on voice face motion and resident presence landing on one same living line'],
  ['response-charter-companion-briefing-fallback', 'falls back to companion briefing project awareness in charter mustDo when no fresher pre-dialogue awareness line is present'],
  ['response-charter-richer-same-her-carry-over-thin-shell', 'prefers richer same-her landed open and next-closure carry over a thin project-awareness shell in charter mustDo'],
  ['response-charter-low-pressure-anti-restart-cue-rebuild', 'rebuilds same-her low-pressure anti-restart emotional closure cue when only the newer closure-carry discipline survives'],
  ['response-charter-live-knot-grounding', 'grounds coding diff turns in the current live knot'],
  ['response-charter-truth-unstable-repair-reanchor', 'switches to repair-and-reanchor when truth is unstable'],
  ['response-charter-executive-system-block-shape', 'renders a high-priority executive system block'],
  ['response-charter-closeness-ladder-authority', 'threads closeness ladder authority into the response charter when runtime surface provides person-state projection'],
  ['response-charter-persona-opening-guidance', 'turns projected persona opening guidance into explicit reply posture rules'],
  ['response-charter-coarse-screen-hypothesis-discipline', 'lets the conscious frame impose hypothesis discipline on coarse screen turns'],
  ['response-charter-runtime-surface-preference', 'prefers the runtime surface when state and runtime snapshots diverge'],
  ['response-charter-runtime-surface-output-override', 'lets runtimeSurface override conflicting explicit dialogue outputs'],
  ['response-charter-answer-compiler-selector-scaffold-loss', 'keeps same-her response charter usable when answerCompiler runtime selectors carry lose array scaffolding'],
  ['response-charter-learning-verification-discipline', 'turns learning verification state into visible response discipline'],
  ['response-charter-learning-tuning-provenance-closeness', 'threads learning tuning advice into charter-level provenance and closeness discipline'],
  ['response-charter-long-horizon-trust-timing-opening-discipline', 'threads long-horizon self-evolution burden and trust timing into visible opening discipline before persona residue fully catches up'],
  ['response-charter-continuity-governance-scaffold-loss', 'keeps same-her response charter usable when selector carries lose array scaffolding in continuity governance memory'],
  ['response-charter-active-self-revision-posture', 'threads active self-revision response posture into charter-level reply discipline'],
].map(([entry, snippet]) => ({
  entry,
  file: './response-charter.test.ts',
  snippets: [snippet],
})) as const

describe('response charter project awareness audit', () => {
  it('keeps one explicit route-level proof that response-charter preserves same-her project continuity, drift-risk guardrails, and lower-pressure callback carry before final visible wording is shaped', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'response-charter-phase-1-open-loop-lower-pressure' }),
      expect.objectContaining({ entry: 'response-charter-thin-project-state-falls-back-to-canonical-brief' }),
      expect.objectContaining({ entry: 'response-charter-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'response-charter-answer-planner-governing-project-closure-seam' }),
      expect.objectContaining({ entry: 'response-charter-planner-governing-project-same-her-carry' }),
      expect.objectContaining({ entry: 'response-charter-callback-same-life-visible-reply-authority' }),
      expect.objectContaining({ entry: 'response-charter-drift-risk-visible-answer-guardrails' }),
      expect.objectContaining({ entry: 'response-charter-thin-conscious-frame-shell-fallback-repair' }),
      expect.objectContaining({ entry: 'response-charter-next-closure-target-not-truncated' }),
      expect.objectContaining({ entry: 'response-charter-governing-project-specialized-normalization' }),
      expect.objectContaining({ entry: 'response-charter-held-line-anti-restart-doctrine' }),
      expect.objectContaining({ entry: 'response-charter-held-line-system-block-anti-restart' }),
      expect.objectContaining({ entry: 'response-charter-project-timing-later-opening-restraint' }),
      expect.objectContaining({ entry: 'response-charter-conscious-frame-timing-restraint' }),
      expect.objectContaining({ entry: 'response-charter-repair-before-closeness-timing' }),
      expect.objectContaining({ entry: 'response-charter-initiative-repair-before-closeness-restraint' }),
      expect.objectContaining({ entry: 'response-charter-structured-conscious-frame-project-state-carry' }),
      expect.objectContaining({ entry: 'response-charter-generic-project-shell-suppression' }),
      expect.objectContaining({ entry: 'response-charter-landed-progress-next-closure-inward-first' }),
      expect.objectContaining({ entry: 'response-charter-rich-awareness-carry-inward-first' }),
      expect.objectContaining({ entry: 'response-charter-emotional-closure-low-pressure' }),
      expect.objectContaining({ entry: 'response-charter-emotional-closure-low-pressure-anti-restart-discipline' }),
      expect.objectContaining({ entry: 'response-charter-measured-return-same-life-governance' }),
      expect.objectContaining({ entry: 'response-charter-memory-deliberation-recollection-boundary' }),
      expect.objectContaining({ entry: 'response-charter-corrected-same-person-anti-progress-pressure' }),
      expect.objectContaining({ entry: 'response-charter-same-seam-procedure-carry-fallback' }),
      expect.objectContaining({ entry: 'response-charter-same-thread-project-state-callback-no-fresh-report' }),
      expect.objectContaining({ entry: 'response-charter-resume-confirmation-boundary-governance' }),
      expect.objectContaining({ entry: 'response-charter-generic-later-opening-without-quiet-carry' }),
      expect.objectContaining({ entry: 'response-charter-fails-closed-same-her-project-state-discipline' }),
      expect.objectContaining({ entry: 'response-charter-direct-project-status-fails-closed' }),
      expect.objectContaining({ entry: 'response-charter-completion-timing-language-drift-fails-closed' }),
      expect.objectContaining({ entry: 'response-charter-durable-same-her-cadence-outward-discipline' }),
      expect.objectContaining({ entry: 'response-charter-active-same-her-baseline-governance' }),
      expect.objectContaining({ entry: 'response-charter-held-autonomy-low-pressure-general-discipline' }),
      expect.objectContaining({ entry: 'response-charter-recollection-inward-internal-only' }),
      expect.objectContaining({ entry: 'response-charter-room-first-repair-recollection-discipline' }),
      expect.objectContaining({ entry: 'response-charter-pre-dialogue-awareness-explicit-mustdo' }),
      expect.objectContaining({ entry: 'response-charter-embodiment-closure-discipline' }),
      expect.objectContaining({ entry: 'response-charter-companion-briefing-fallback' }),
      expect.objectContaining({ entry: 'response-charter-richer-same-her-carry-over-thin-shell' }),
      expect.objectContaining({ entry: 'response-charter-low-pressure-anti-restart-cue-rebuild' }),
      expect.objectContaining({ entry: 'response-charter-live-knot-grounding' }),
      expect.objectContaining({ entry: 'response-charter-truth-unstable-repair-reanchor' }),
      expect.objectContaining({ entry: 'response-charter-executive-system-block-shape' }),
      expect.objectContaining({ entry: 'response-charter-closeness-ladder-authority' }),
      expect.objectContaining({ entry: 'response-charter-persona-opening-guidance' }),
      expect.objectContaining({ entry: 'response-charter-coarse-screen-hypothesis-discipline' }),
      expect.objectContaining({ entry: 'response-charter-runtime-surface-preference' }),
      expect.objectContaining({ entry: 'response-charter-runtime-surface-output-override' }),
      expect.objectContaining({ entry: 'response-charter-answer-compiler-selector-scaffold-loss' }),
      expect.objectContaining({ entry: 'response-charter-learning-verification-discipline' }),
      expect.objectContaining({ entry: 'response-charter-learning-tuning-provenance-closeness' }),
      expect.objectContaining({ entry: 'response-charter-long-horizon-trust-timing-opening-discipline' }),
      expect.objectContaining({ entry: 'response-charter-continuity-governance-scaffold-loss' }),
      expect.objectContaining({ entry: 'response-charter-active-self-revision-posture' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the response-charter same-her project-awareness claim to current behavior tests instead of only broader recollection or visible-reply prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: response-charter now has dedicated same-her project-awareness proof while full long-run closure still remains open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')
    const charterSource = readFileSync(new URL('./response-charter.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('response-charter-project-awareness-audit.test.ts')
    expect(auditSource).toContain('response-charter-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(charterSource).toContain(
      'also fails closed into same-her project-state discipline when the host asks how far the goal has landed, when it closes, and whether the thread drifted into English or off-project wording',
    )
    expect(auditSource).toMatch(/still not fully closed|still not full Phase 1 closure|still .*fully sustained noisy-desktop convergence/i)
  })
})
