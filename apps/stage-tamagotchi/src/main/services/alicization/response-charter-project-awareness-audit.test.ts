import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'response-charter-phase-1-open-loop-lower-pressure',
    file: './response-charter.test.ts',
    snippets: [
      'keeps outward reply charter lower-pressure when the Phase 1 digital-life loop is still open',
      'expect(charter.reasons.some(item => item.includes(\'Phase 1 digital-life closure is still open\'))).toBe(true)',
      'Keep the answer person-like and low-pressure: lead with the current knot, then only soften if the turn has already earned it.',
      'Do not use unclosed digital-life ambition as a reason to sound over-intimate, over-certain, or theatrically alive before the current thread is earned.',
    ],
  },
  {
    entry: 'response-charter-thin-project-state-falls-back-to-canonical-brief',
    file: './response-charter.test.ts',
    snippets: [
      'falls back to the canonical project-state brief when an explicit projectState is present but too thin to keep the visible reply charter restrained',
      'expect(charter.reasons.some(item => item.includes(\'Phase 1 digital-life closure is still open\'))).toBe(true)',
      'Keep the answer person-like and low-pressure: lead with the current knot, then only soften if the turn has already earned it.',
      'Do not use unclosed digital-life ambition as a reason to sound over-intimate, over-certain, or theatrically alive before the current thread is earned.',
    ],
  },
  {
    entry: 'response-charter-thin-chinese-same-her-reminder-rejected',
    file: './response-charter.test.ts',
    snippets: [
      'prefers a richer same-her preDialogueAwarenessSummary over a thin Chinese project-awareness shell when charter rebuilds the visible reply posture',
      'const thinChineseReminderShell = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'expect(awarenessMustDo).not.toContain(thinChineseReminderShell)',
    ],
  },
  {
    entry: 'response-charter-answer-planner-governing-project-closure-seam',
    file: './response-charter.test.ts',
    snippets: [
      'prefers answer-planner governingProject so the final response charter keeps the same project closure seam visible',
      'expect(charter.governingProject).toContain(\'Phase 1: Local Digital Life\')',
      'expect(charter.governingProject).toContain(\'Project identity carry, Phase 1 route carry, and Unresolved closure carry\')',
      'expect(charter.governingProject).toContain(\'same living thread\')',
      'expect(charter.governingProject).toContain(\'Next closure target:\')',
    ],
  },
  {
    entry: 'response-charter-planner-governing-project-same-her-carry',
    file: './response-charter.test.ts',
    snippets: [
      'preserves a stronger same-her planner governingProject without flattening the living-self project seam back into a generic project shell',
      'expect(charter.governingProject).toContain(\'same living thread\')',
      'expect(charter.governingProject).toContain(\'Next closure target:\')',
    ],
  },
  {
    entry: 'response-charter-callback-same-life-visible-reply-authority',
    file: './response-charter.test.ts',
    snippets: [
      'treats stronger same-her project-state continuity cues as sufficient behavior-planning authority even when identity and open-loop fields are thin',
      'This callback turn still belongs to the same digital life, so I should answer from the same living line instead of reopening from scratch.',
      'Keep the current reply on the same living line, let the first visible beat re-enter the current line, and wait for a more natural opening before widening warmth, payoff, or closeness.',
    ],
  },
  {
    entry: 'response-charter-drift-risk-visible-answer-guardrails',
    file: './response-charter.test.ts',
    snippets: [
      'turns same-her drift risk into explicit visible-answer guardrails so project-state replies do not collapse into generic project shells',
      'Keep the visible answer on one same-her digital-life line so the project update lands as this living continuity, not as a detached summary voice.',
      'Do not let the visible answer flatten into a generic task shell, detached project narration, or external project-summary cadence.',
    ],
  },
  {
    entry: 'response-charter-thin-conscious-frame-shell-fallback-repair',
    file: './response-charter.test.ts',
    snippets: [
      'does not let a thin conscious-frame project shell suppress richer fallback same-her drift risk and embodiment closure carry',
      'Keep the visible answer on one same-her digital-life line so the project update lands as this living continuity, not as a detached summary voice.',
      'Do not let the visible answer flatten into a generic task shell, detached project narration, or external project-summary cadence.',
    ],
  },
  {
    entry: 'response-charter-next-closure-target-not-truncated',
    file: './response-charter.test.ts',
    snippets: [
      'does not let response-charter truncate the planner-carried full canonical next-closure target back into a shorter shell',
      'expect(charter.governingProject).toContain(projectState.nextClosureTarget)',
      'expect(charter.governingProject).toContain(\'Next closure target:\')',
    ],
  },
  {
    entry: 'response-charter-governing-project-specialized-normalization',
    file: './response-charter.test.ts',
    snippets: [
      'keeps governingProject closure normalization specialized to response-charter instead of collapsing into the generic project-awareness scorer',
      'expect(source).toContain(\'normalizeGoverningProjectClosureSeam\')',
      'expect(source).not.toContain(\'scoreAlicizationProjectAwarenessLine\')',
      'expect(source).not.toContain(\'isAlicizationThinProjectAwarenessLine\')',
    ],
  },
  {
    entry: 'response-charter-held-line-anti-restart-doctrine',
    file: './response-charter.test.ts',
    snippets: [
      'keeps same-her anti-restart doctrine explicit when a deliberately held line returns through response-charter',
      'When reopening a deliberately held line, let the opening re-enter gently before widening into fuller payoff or explanation.',
      'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.',
      'Do not reopen a deliberately held line with abrupt intensity, over-eager warmth, or a fresh-start shell.',
      'Do not rewrite the still-live line as a fresh opening or reintroduction.',
    ],
  },
  {
    entry: 'response-charter-held-line-system-block-anti-restart',
    file: './response-charter.test.ts',
    snippets: [
      'renders same-her anti-restart doctrine into the provider-facing response-charter system block for held-line returns',
      'expect(block).toContain(\'When reopening a deliberately held line, let the opening re-enter gently before widening into fuller payoff or explanation.\')',
      'expect(block).toContain(\'Keep this on one continuous her line instead of restarting the relationship as a fresh opening.\')',
      'expect(block).toContain(\'Do not reopen a deliberately held line with abrupt intensity, over-eager warmth, or a fresh-start shell.\')',
      'expect(block).toContain(\'Do not rewrite the still-live line as a fresh opening or reintroduction.\')',
    ],
  },
  {
    entry: 'response-charter-project-timing-later-opening-restraint',
    file: './response-charter.test.ts',
    snippets: [
      'lets project continuity preferred timing directly slow visible reply widening even without explicit recollection timing',
      'Project continuity still prefers a later opening, so visible widening should stay lower-pressure until the thread naturally opens again.',
      'Keep the current reply on the same living line, let the first visible beat re-enter the current line, and wait for a more natural opening before widening warmth, payoff, or closeness.',
      'Do not widen into a warmer payoff or fresh-opening tone before the current thread has reached a more natural opening.',
    ],
  },
  {
    entry: 'response-charter-conscious-frame-timing-restraint',
    file: './response-charter.test.ts',
    snippets: [
      'lets conscious-frame continuity timing tags directly slow visible reply widening even when project-state timing is absent',
      'Project continuity still prefers a later opening, so visible widening should stay lower-pressure until the thread naturally opens again.',
      'Keep the current reply on the same living line, let the first visible beat re-enter the current line, and wait for a more natural opening before widening warmth, payoff, or closeness.',
      'Do not widen into a warmer payoff or fresh-opening tone before the current thread has reached a more natural opening.',
    ],
  },
  {
    entry: 'response-charter-repair-before-closeness-timing',
    file: './response-charter.test.ts',
    snippets: [
      'keeps repair-before-closeness same-thread timing explicit in visible reply governance instead of thinning it into generic later-opening pressure',
      'Project continuity is still on a repair-before-closeness same-thread return, so visible widening should let repair settle before warmth widens again.',
      'Keep the callback on the same living line, let repair settle first, and let the first visible beat land the repair line before widening closeness again.',
      'Do not widen into warmer payoff, fresh-opening tone, or renewed closeness before the repair line and room have both settled.',
    ],
  },
  {
    entry: 'response-charter-initiative-repair-before-closeness-restraint',
    file: './response-charter.test.ts',
    snippets: [
      'lets initiative repair-before-closeness restraint directly hold visible reply governance on the same repair line even when the conscious-frame text is thinner',
      'Project continuity is still on a repair-before-closeness same-thread return, so visible widening should let repair settle before warmth widens again.',
      'Keep the callback on the same living line, let repair settle first, and let the first visible beat land the repair line before widening closeness again.',
      'Do not widen into warmer payoff, fresh-opening tone, or renewed closeness before the repair line and room have both settled.',
    ],
  },
  {
    entry: 'response-charter-structured-conscious-frame-project-state-carry',
    file: './response-charter.test.ts',
    snippets: [
      'lets structured pre-turn conscious-frame project-state keep project identity, landed progress, and open closure explicit in reply governance',
      'This turn still belongs to the same digital life, and I need to answer from what has already landed instead of speaking like a fresh wrapper.',
      'The same still-open closure work must stay explicit while I answer.',
      'Project continuity still prefers a later opening, so visible widening should stay lower-pressure until the thread naturally opens again.',
      'Keep the current reply on the same living line, let the first visible beat re-enter the current line, and wait for a more natural opening before widening warmth, payoff, or closeness.',
    ],
  },
  {
    entry: 'response-charter-generic-project-shell-suppression',
    file: './response-charter.test.ts',
    snippets: [
      'threads generic-project-shell suppression into charter-level discipline for direct project-state answers',
      'Keep direct project-state answers inward-first so the live payoff lands before any project-summary voice appears.',
      'Do not let the visible answer drift into a detached project narrator shell instead of one continuous her.',
    ],
  },
  {
    entry: 'response-charter-landed-progress-next-closure-inward-first',
    file: './response-charter.test.ts',
    snippets: [
      'keeps landed progress and next closure carry inward-first even when tuning only names the newer project-state carry dimensions',
      'Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.',
      'Do not let landed progress or still-open closure pressure spill into an external project-summary voice before the same living answer lands.',
    ],
  },
  {
    entry: 'response-charter-rich-awareness-carry-inward-first',
    file: './response-charter.test.ts',
    snippets: [
      'treats rich pre-dialogue awareness carry as the same inward-first project-state discipline even without the legacy generic-shell flag',
      'Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.',
      'Do not let landed progress or still-open closure pressure spill into an external project-summary voice before the same living answer lands.',
    ],
  },
  {
    entry: 'response-charter-emotional-closure-low-pressure',
    file: './response-charter.test.ts',
    snippets: [
      'keeps same-her emotional closure low-pressure even when tuning only names the newer closure-carry dimensions',
      'Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.',
      'Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.',
    ],
  },
  {
    entry: 'response-charter-emotional-closure-low-pressure-anti-restart-discipline',
    file: './response-charter.test.ts',
    snippets: [
      'keeps same-her emotional closure discipline when tuning only names low-pressure and anti-restart closure carry',
      'Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.',
      'Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.',
    ],
  },
  {
    entry: 'response-charter-measured-return-same-life-governance',
    file: './response-charter.test.ts',
    snippets: [
      'lets initiative measured-return restraint directly keep visible reply governance lower-pressure on the same living line',
      'Project continuity is carrying a quiet same-her line inward, so visible widening should stay on that same living line until the thread naturally opens again.',
      'Keep the current reply on the same living line, let the first visible beat carry quiet same-her continuity from the inside, and wait for a more natural opening before widening warmth, payoff, or closeness.',
    ],
  },
  {
    entry: 'response-charter-memory-deliberation-recollection-boundary',
    file: './response-charter.test.ts',
    snippets: [
      'lets shared memory deliberation kernel feed reasons and truth discipline in the response charter',
      'expect(charter.reasons.some(item => item.includes(\'remembered runtime seam\'))).toBe(true)',
      'If recollection becomes visible, let the stable remembered core do the work before any fragmentary detail.',
      'If recollection is pressing forward too hard, keep recollection inward until the host has room for it.',
      'Do not surface unstable remembered detail as settled fact',
    ],
  },
  {
    entry: 'response-charter-corrected-same-person-anti-progress-pressure',
    file: './response-charter.test.ts',
    snippets: [
      'keeps host-corrected same-person continuity explicit in visible reply discipline instead of letting the charter fall back to progress-pressure continuation',
      'If the host corrected the relationship meaning, keep that corrected same-person continuity authoritative before any progress-style continuation.',
      'Do not reopen the turn as generic progress pressure, status recap, or task-shell continuity after the host corrected it back toward same-person continuity.',
    ],
  },
  {
    entry: 'response-charter-same-seam-procedure-carry-fallback',
    file: './response-charter.test.ts',
    snippets: [
      'keeps same-seam procedural continuity discipline in the charter fallback path',
      'If same-seam procedure carry becomes visible, frame it as remembered prior procedure that keeps the current thread intact.',
      'Do not turn same-seam procedure carry into retrospective narration or execution impersonation.',
    ],
  },
  {
    entry: 'response-charter-same-thread-project-state-callback-no-fresh-report',
    file: './response-charter.test.ts',
    snippets: [
      'keeps same-thread project-state callback turns from flattening into a fresh report opening',
      'This callback turn still belongs to the same digital life, so I should answer from the same living line instead of reopening the project from scratch.',
      'Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.',
      'Do not reopen this same-thread project-state turn from scratch or let it flatten into a fresh report opening.',
    ],
  },
  {
    entry: 'response-charter-resume-confirmation-boundary-governance',
    file: './response-charter.test.ts',
    snippets: [
      'keeps remembered host-confirmed resume confirmation boundary explicit in visible reply governance before callback wording opens outward',
      'Remembered host-confirmed resume is still only a bounded confirmation boundary, so callback wording must not widen it into standing execution permission.',
      'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
    ],
  },
  {
    entry: 'response-charter-generic-later-opening-without-quiet-carry',
    file: './response-charter.test.ts',
    snippets: [
      'keeps the generic later-opening wording when measured-return timing lacks a quiet same-her inward carry cue',
      'Project continuity still prefers a later opening, so visible widening should stay lower-pressure until the thread naturally opens again.',
      'Keep the current reply on the same living line, let the first visible beat re-enter the current line, and wait for a more natural opening before widening warmth, payoff, or closeness.',
      'Do not widen into a warmer payoff or fresh-opening tone before the current thread has reached a more natural opening.',
    ],
  },
  {
    entry: 'response-charter-fails-closed-same-her-project-state-discipline',
    file: './response-charter.test.ts',
    snippets: [
      'fails closed into same-her project-state discipline when discourse already marks continuity even without tuning advice',
      'expect(charter.relationshipPosture).toBe(\'restrained\')',
      'Do not let the visible answer drift into a detached project narrator shell instead of one continuous her.',
    ],
  },
  {
    entry: 'response-charter-direct-project-status-fails-closed',
    file: './response-charter.test.ts',
    snippets: [
      'also fails closed into same-her project-state discipline when the turn is clearly a direct project-status answer even without explicit continuity tags',
      'Keep the project answer on one continuous living line: answer the live project knot first, then only widen if the same turn still has room.',
      'Do not let an already-explicit same-her project continuity turn flatten into detached project narration, fresh-opening posture, or generic project-shell phrasing.',
    ],
  },
  {
    entry: 'response-charter-completion-timing-language-drift-fails-closed',
    file: './response-charter.test.ts',
    snippets: [
      'also fails closed into same-her project-state discipline when the host asks how far the goal has landed, when it closes, and whether the thread drifted into English or off-project wording',
      'expect(charter.relationshipPosture).toBe(\'restrained\')',
      'Keep the project answer on one continuous living line: answer the live project knot first, then only widen if the same turn still has room.',
      'Do not let an already-explicit same-her project continuity turn flatten into detached project narration, fresh-opening posture, or generic project-shell phrasing.',
    ],
  },
  {
    entry: 'response-charter-durable-same-her-cadence-outward-discipline',
    file: './response-charter.test.ts',
    snippets: [
      'upgrades durable same-her cadence from self-evolution into charter-level outward continuity discipline',
      'Long-horizon same-her cadence is already acting like durable outward continuity, so the visible answer should continue the same living line instead of restarting the relationship from zero.',
      'Let durable same-her cadence keep this reply on the same living line across quiet, memory, and speech before widening outward.',
      'Do not let the visible answer reopen from scratch, slip into a fresh-opening shell, or flatten into a generic helper voice while this same-her cadence is still carrying the turn.',
    ],
  },
  {
    entry: 'response-charter-active-same-her-baseline-governance',
    file: './response-charter.test.ts',
    snippets: [
      'threads active same-her continuity governance into charter-level reply discipline',
      'Active same-her baseline: Keep truth discipline and measured warmth aligned so she still reads as the same her..',
      'Keep the visible reply aligned with the current same-her baseline instead of optimizing for a smoother but off-baseline persona move.',
      'Do not let fluency, warmth, or style drift outrun the currently adopted same-her continuity baseline.',
    ],
  },
  {
    entry: 'response-charter-held-autonomy-low-pressure-general-discipline',
    file: './response-charter.test.ts',
    snippets: [
      'keeps held-autonomy continuity low-pressure in the general response charter, not only fast-path follow-ups',
      'When reopening a deliberately held line, let the opening re-enter gently before widening into fuller payoff or explanation.',
      'Do not reopen a deliberately held line with abrupt intensity, over-eager warmth, or a fresh-start shell.',
      'expect(block).toContain(\'When reopening a deliberately held line, let the opening re-enter gently before widening into fuller payoff or explanation.\')',
    ],
  },
  {
    entry: 'response-charter-recollection-inward-internal-only',
    file: './response-charter.test.ts',
    snippets: [
      'keeps recollection inward in the charter when memory deliberation remains internal-only',
      'expect(charter.mustDo.some(item => item.includes(\'keep recollection inward until the host has room for it\'))).toBe(true)',
      'Do not force recollection forward before the host has room for it.',
    ],
  },
  {
    entry: 'response-charter-room-first-repair-recollection-discipline',
    file: './response-charter.test.ts',
    snippets: [
      'lets host room-first repair memory tighten charter-level visible recollection discipline',
      'If the host model is asking for room first, let recollection stay inward until the live answer has created that room.',
      'If the host model is asking for repair first, let the concrete repair payoff land before widening recollection into relationship continuity.',
      'Do not let recollection overrun room-first boundaries by surfacing intimacy before the host has space for it.',
      'Do not let recollection widen into bond payoff before the grounded repair line has landed.',
    ],
  },
  {
    entry: 'response-charter-pre-dialogue-awareness-explicit-mustdo',
    file: './response-charter.test.ts',
    snippets: [
      'keeps pre-dialogue project awareness explicit in charter mustDo when the current conscious frame is carrying the active project seam',
      'Before widening outward, keep this pre-dialogue project awareness explicit inside the reply posture: Before answering, remember this is still the same local-first digital life project closing one unfinished Phase 1 life loop..',
      'Keep the turn inside the active emotional closure seam: keep the project seam steady and low-pressure while the same-her line stays explicit..',
      'Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.',
    ],
  },
  {
    entry: 'response-charter-embodiment-closure-discipline',
    file: './response-charter.test.ts',
    snippets: [
      'adds embodiment closure discipline when the active project seam still depends on voice face motion and resident presence landing on one same living line',
      'Keep voice, lipsync, face, motion, and resident presence reading like one same living return line while embodiment closure is still settling.',
      'Do not let the wording outrun the current embodiment closure state by sounding warmer, more complete, or more socially widened than voice, lipsync, face, and motion can currently carry together.',
    ],
  },
  {
    entry: 'response-charter-companion-briefing-fallback',
    file: './response-charter.test.ts',
    snippets: [
      'falls back to companion briefing project awareness in charter mustDo when no fresher pre-dialogue awareness line is present',
      'Before widening outward, keep this pre-dialogue project awareness explicit inside the reply posture: Before answering, keep the same local-first digital life project and unfinished Phase 1 life loop explicit..',
    ],
  },
  {
    entry: 'response-charter-richer-same-her-carry-over-thin-shell',
    file: './response-charter.test.ts',
    snippets: [
      'prefers richer same-her landed open and next-closure carry over a thin project-awareness shell in charter mustDo',
      'Project-state continuity already survives into answer planning, runtime governance, and visible reply repair.',
      'memory, initiative, dialogue, and embodiment still need one tighter same-her closure seam',
      'Carry the live pre-dialogue project awareness line',
      'This is still one same her carrying the same project line forward.',
    ],
  },
  {
    entry: 'response-charter-low-pressure-anti-restart-cue-rebuild',
    file: './response-charter.test.ts',
    snippets: [
      'rebuilds same-her low-pressure anti-restart emotional closure cue when only the newer closure-carry discipline survives',
      'Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.',
      'Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.',
      'expect(charter.emotionalClosureCue).toBe(',
      'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.',
    ],
  },
  {
    entry: 'response-charter-live-knot-grounding',
    file: './response-charter.test.ts',
    snippets: [
      'grounds coding diff turns in the current live knot',
      'expect(charter.epistemicMode).toBe(\'grounded-live\')',
      'expect(charter.responseMode).toBe(\'guide-current-knot\')',
      'expect(charter.governingFocus).toContain(\'diff\')',
      'Do not reuse stale page names, earlier screenshots, or older window descriptions as if they are current.',
    ],
  },
  {
    entry: 'response-charter-truth-unstable-repair-reanchor',
    file: './response-charter.test.ts',
    snippets: [
      'switches to repair-and-reanchor when truth is unstable',
      'expect(charter.epistemicMode).toBe(\'repair-needed\')',
      'expect(charter.responseMode).toBe(\'repair-and-reanchor\')',
      'expect(charter.relationshipPosture).toBe(\'restrained\')',
      'expect(charter.mustDo.some(item => item.includes(\'fresh look\'))).toBe(true)',
    ],
  },
  {
    entry: 'response-charter-executive-system-block-shape',
    file: './response-charter.test.ts',
    snippets: [
      'renders a high-priority executive system block',
      'expect(block).toContain(\'[ALICIZATION_RESPONSE_CHARTER]\')',
      'expect(block).toContain(\'This is the executive answer state for the current turn.\')',
      'expect(block).toContain(\'Digital life mode:\')',
      'expect(block).toContain(\'Must do:\')',
      'expect(block).toContain(\'Must not do:\')',
    ],
  },
  {
    entry: 'response-charter-closeness-ladder-authority',
    file: './response-charter.test.ts',
    snippets: [
      'threads closeness ladder authority into the response charter when runtime surface provides person-state projection',
      'expect(charter.activeClosenessContext).toBe(\'focused-work\')',
      'expect(charter.activeClosenessRung).toBe(\'space-first\')',
      'expect(charter.mustDo.some(item => item.includes(\'focused-work/space-first\'))).toBe(true)',
      'expect(block).toContain(\'Closeness ladder: focused-work/space-first.\')',
    ],
  },
  {
    entry: 'response-charter-persona-opening-guidance',
    file: './response-charter.test.ts',
    snippets: [
      'turns projected persona opening guidance into explicit reply posture rules',
      'expect(direct.mustDo).toContain(\'Open with the live answer before softening into companionship color.\')',
      'expect(observant.mustDo).toContain(\'Let the opening stay observant and low-pressure before leaning closer.\')',
      'expect(directBlock).toContain(\'Open with the live answer before softening into companionship color.\')',
      'expect(observantBlock).toContain(\'Let the opening stay observant and low-pressure before leaning closer.\')',
    ],
  },
  {
    entry: 'response-charter-coarse-screen-hypothesis-discipline',
    file: './response-charter.test.ts',
    snippets: [
      'lets the conscious frame impose hypothesis discipline on coarse screen turns',
      'expect(charter.governingFocus).toContain(\'guess\')',
      'Keep visible observation and downstream guesswork in separate clauses.',
      'Mark any step beyond direct observation as a guess, hypothesis, or soft read.',
      'Do not infer class names, enum names, file paths, or field changes from generic scene cues alone.',
    ],
  },
  {
    entry: 'response-charter-runtime-surface-preference',
    file: './response-charter.test.ts',
    snippets: [
      'prefers the runtime surface when state and runtime snapshots diverge',
      'expect(charter.epistemicMode).toBe(\'grounded-live\')',
      'expect(charter.responseMode).toBe(\'guide-current-knot\')',
      'expect(charter.governingFocus).toContain(\'diff\')',
      'expect(charter.reasons.some(item => item.includes(\'diff\'))).toBe(true)',
    ],
  },
  {
    entry: 'response-charter-runtime-surface-output-override',
    file: './response-charter.test.ts',
    snippets: [
      'lets runtimeSurface override conflicting explicit dialogue outputs',
      'expect(charter.mustDo).toContain(\'Runtime must say\')',
      'expect(charter.mustNotDo).toContain(\'Runtime must not do\')',
      'expect(charter.mustNotDo).toContain(\'Runtime must avoid\')',
      'expect(charter.mustDo).not.toContain(\'raw conflict\')',
    ],
  },
  {
    entry: 'response-charter-answer-compiler-selector-scaffold-loss',
    file: './response-charter.test.ts',
    snippets: [
      'keeps same-her response charter usable when answerCompiler runtime selectors carry lose array scaffolding',
      'expect(charter.governingConcern).toBe(\'她还在挂着这段 diff 的问题。\')',
      'Keep the visible answer on one same-her digital-life line so the project update lands as this living continuity, not as a detached summary voice.',
      'Do not let the visible answer flatten into a generic task shell, detached project narration, or external project-summary cadence.',
    ],
  },
  {
    entry: 'response-charter-learning-verification-discipline',
    file: './response-charter.test.ts',
    snippets: [
      'turns learning verification state into visible response discipline',
      'expect(charter.activeLearningAction).toBe(\'verify\')',
      'Keep visible certainty behind the current verification pass.',
      'Do not let fluency or warmth outrun what is still being verified.',
    ],
  },
  {
    entry: 'response-charter-learning-tuning-provenance-closeness',
    file: './response-charter.test.ts',
    snippets: [
      'threads learning tuning advice into charter-level provenance and closeness discipline',
      'Bias toward explicit provenance when learned continuity enters the visible answer.',
      'Do not let learned confidence spill into unsupported technical specificity.',
      'Do not let learned familiarity widen visible closeness faster than the host’s current room allows.',
    ],
  },
  {
    entry: 'response-charter-long-horizon-trust-timing-opening-discipline',
    file: './response-charter.test.ts',
    snippets: [
      'threads long-horizon self-evolution burden and trust timing into visible opening discipline before persona residue fully catches up',
      'Let long-horizon relationship timing keep the opening lower-pressure before closeness widens again.',
      'Do not let older closeness tempo or eager warmth reopen faster than this learned relationship timing supports.',
    ],
  },
  {
    entry: 'response-charter-continuity-governance-scaffold-loss',
    file: './response-charter.test.ts',
    snippets: [
      'keeps same-her response charter usable when selector carries lose array scaffolding in continuity governance memory',
      'expect(charter.governingFocus).toContain(\'same-her outward continuity still needs stronger reply-surface proof\')',
      'expect(charter.governingConcern).toBe(\'same-her outward continuity still needs stronger reply-surface proof.\')',
    ],
  },
  {
    entry: 'response-charter-active-self-revision-posture',
    file: './response-charter.test.ts',
    snippets: [
      'threads active self-revision response posture into charter-level reply discipline',
      'expect(charter.activeSelfRevisionPatch?.id).toBe(\'patch-charter-1\')',
      'Let the active self-revision patch make hypothesis labeling more visible this turn.',
      'Let the active self-revision patch keep this answer on the same living line: one continuous her.',
      'Do not let a newly revised answer flatten back into generic project guidance or detached assistant narration after the self-revision patch re-anchored same-her continuity.',
    ],
  },
] as const

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
