import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'answer-planner-landed-open-same-her-closure-drive',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps same-her project-state closure drive in reply planning when the host asks what is landed and what is still open',
      'expect(planner.governingFocus).toContain(\'same digital life\')',
      'expect(planner.answerIntent).toContain(\'same still-open closure work\')',
    ],
  },
  {
    entry: 'answer-planner-direct-project-status-fail-closed',
    file: './answer-planner.test.ts',
    snippets: [
      'fails closed to the same-her project-state line during reply planning when the turn is clearly a direct project-status answer but the compiled opening claim is thinner',
      'expect(planner.governingFocus).toContain(\'closure work\')',
      'expect(planner.answerIntent).toContain(\'same digital life\')',
    ],
  },
  {
    entry: 'answer-planner-completion-timing-language-drift-fail-closed',
    file: './answer-planner.test.ts',
    snippets: [
      'also fails closed to the same-her project-state line during reply planning when the host asks how far the goal has landed, when it closes, and whether the thread drifted into English or off-project wording',
      'expect(planner.governingFocus).toContain(\'goal is expected to close\')',
      'expect(planner.governingFocus).toContain(\'host language or project line\')',
      'expect(planner.answerIntent).toMatch(/same digital life line/i)',
    ],
  },
  {
    entry: 'answer-planner-governing-project-same-her-carry',
    file: './answer-planner.test.ts',
    snippets: [
      'carries a stronger same-her project awareness line into governingProject on the main answer-planner path',
      'expect(planner.governingProject).toContain(\'same living line\')',
      'expect(planner.governingProject).toContain(\'Phase 1: Local Digital Life\')',
    ],
  },
  {
    entry: 'answer-planner-landed-open-next-bundled-governing-project',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps landed progress bundled with phase, open closure, and next closure target inside governingProject for direct project-state turns',
      'expect(planner.governingProject).toMatch(/Same-session mirror carry|measured-return embodiment authority|longer-lived continuation/i)',
      'expect(planner.governingProject).toMatch(/Keep extending cross-modal same-her proof|longer-lived voice behavior|resident presence/i)',
    ],
  },
  {
    entry: 'answer-planner-drift-risk-guardrails',
    file: './answer-planner.test.ts',
    snippets: [
      'turns same-her drift risk into explicit answer-planning guardrails before a direct project-state answer opens',
      'expect(planner.mustDo).toContain(\'Keep the answer on one same-her digital-life line so the project update stays companion-like instead of turning into detached project narration.\')',
      'expect(planner.narrative).toContain(\'project_drift_risk:same-her drift risk is active, so opening wording must stay thread-faithful and avoid generic project-shell reporting.\')',
    ],
  },
  {
    entry: 'answer-planner-thin-shell-cannot-outrank-richer-same-her-carry',
    file: './answer-planner.test.ts',
    snippets: [
      'does not let the compact thin closure shell outrank a richer same-her governing project line during reply planning',
      'expect(planner.governingProject).not.toContain(\'same digital life | keep the closure seam explicit\')',
      'expect(planner.governingProject).toContain(\'holding together mainly through voice, face, and motion\')',
      'expect(planner.governingProject).toContain(\'initiative\')',
    ],
  },
  {
    entry: 'answer-planner-thin-chinese-same-her-reminder-rejected',
    file: './answer-planner.test.ts',
    snippets: [
      'does not let a thin Chinese same-her reminder shell stay visible in governingProject when richer same-her project carry already exists',
      'preDialogueAwarenessLine: \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'expect(planner.governingProject).not.toContain(\'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\')',
      'expect(planner.governingProject).toContain(\'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\')',
    ],
  },
  {
    entry: 'answer-planner-same-thread-callback-project-continuation',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps same-thread project-state callback turns from flattening into a fresh report opening during reply planning',
      'expect(planner.answerIntent).not.toContain(\'Give a project update\')',
      'expect(planner.mustNotDo).toContain(\'Do not flatten the same-thread project-state continuation into a fresh report opening or detached project-summary shell.\')',
    ],
  },
  {
    entry: 'answer-planner-resume-confirmation-boundary-guardrail',
    file: './answer-planner.test.ts',
    snippets: [
      'treats remembered host-confirmed resume confirmation as a bounded redispatch guardrail before callback answer planning widens outward',
      'expect(planner.governingProject).toContain(\'host-confirmed-before-redispatch\')',
      'expect(planner.mustDo).toContain(\'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.\')',
      'expect(planner.mustNotDo).toContain(\'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.\')',
      'expect(planner.narrative).toContain(\'resume_confirmation_boundary:host-confirmed resume carry must stay a bounded confirmation boundary during callback answer planning.\')',
    ],
  },
  {
    entry: 'answer-planner-live-diff-knot-guide',
    file: './answer-planner.test.ts',
    snippets: [
      'chooses guide when a live diff knot is the governing concern',
      'expect(planner.act).toBe(\'guide\')',
      'expect(planner.evidenceMode).toBe(\'live-grounded\')',
      'expect(planner.governingFocus).toContain(\'runtime diff\')',
    ],
  },
  {
    entry: 'answer-planner-system-block-active-project-seam',
    file: './answer-planner.test.ts',
    snippets: [
      'prints the active digital-life governing project seam into the planner system block',
      'expect(block).toContain(\'Governing project: Phase 1 local digital life is still open:\')',
      'expect(block).toContain(\'Pre-dialogue closure line: Before answering, remember this is still the same digital life project and keep the unfinished Phase 1 closure explicit..\')',
      'expect(block).toContain(\'next closure target is making the emotional loop visibly drive dialogue and embodiment together\')',
    ],
  },
  {
    entry: 'answer-planner-system-block-fuller-project-line',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps a fuller project-and-phase awareness line over a narrower embodiment shell in the planner system block pre-dialogue closure line',
      'expect(block).toContain(\'Pre-dialogue closure line: Alicization is still the same Phase 1 local digital life, not a generic assistant shell.\')',
      'expect(block).toContain(\'memory, initiative, and embodiment still need stronger end-to-end closure\')',
      'expect(block).not.toContain(\'Pre-dialogue closure line: Same companion line through body, face, and motion.\')',
    ],
  },
  {
    entry: 'answer-planner-grounded-live-no-reground',
    file: './answer-planner.test.ts',
    snippets: [
      'stops asking for reground when this inspection turn is already grounded live',
      'expect(planner.evidenceMode).toBe(\'live-grounded\')',
      'expect(planner.shouldAskForGrounding).toBe(false)',
      'expect(planner.act).not.toBe(\'ask-reground\')',
    ],
  },
  {
    entry: 'answer-planner-runtime-surface-cue-precedence',
    file: './answer-planner.test.ts',
    snippets: [
      'prefers runtime surface answer-planning cues over conflicting raw inputs',
      'expect(planner.activeClosenessContext).toBe(\'focused-work\')',
      'expect(planner.selectedRuntimeThreadId).toBe(\'thread::runtime-surface\')',
      'expect(planner.selectedTruthFrame).toBe(\'live\')',
      'expect(planner.openingMove).toContain(\'runtime diff\')',
    ],
  },
  {
    entry: 'answer-planner-current-dialogue-anchor-precedence',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps the current dialogue anchor ahead of an older carried question',
      'expect(planner.governingFocus).toContain(\'我好累\')',
      'expect(planner.governingFocus).not.toContain(\'你刚刚想说什么\')',
      'expect(planner.answerIntent).not.toContain(\'你刚刚想说什么\')',
    ],
  },
  {
    entry: 'answer-planner-correct-stale-anchor-repair',
    file: './answer-planner.test.ts',
    snippets: [
      'chooses correct-stale-anchor when continuity is outrunning live sight',
      'expect(planner.act).toBe(\'correct-stale-anchor\')',
      'expect(planner.evidenceMode).toBe(\'repair-first\')',
      'expect(planner.shouldAcknowledgeRepair).toBe(true)',
    ],
  },
  {
    entry: 'answer-planner-late-night-body-care-route',
    file: './answer-planner.test.ts',
    snippets: [
      'chooses care when late-night body concern is governing the answer',
      'expect(planner.act).toBe(\'care\')',
      'expect(planner.relationshipPosture).toBe(\'tender\')',
    ],
  },
  {
    entry: 'answer-planner-detached-self-question-dialogue-grounding',
    file: './answer-planner.test.ts',
    snippets: [
      'treats detached self questions as dialogue-grounded instead of screen-repair work',
      'expect(planner.act).toBe(\'answer\')',
      'expect(planner.evidenceMode).toBe(\'dialogue-grounded\')',
      'expect(planner.mustNotDo).toContain(\'Do not open with grounding disclaimers, live-screen caveats, or desktop narration when the host is not asking about the screen.\')',
    ],
  },
  {
    entry: 'answer-planner-ownership-ssot-dialogue-first',
    file: './answer-planner.test.ts',
    snippets: [
      'uses ownership ssot to keep planner dialogue-first when stale focus disagrees',
      'expect(planner.evidenceMode).toBe(\'dialogue-grounded\')',
      'expect(planner.narrative).toContain(\'focus_subject:alicization-self\')',
      'expect(planner.narrative).toContain(\'screen_reference:avoid\')',
    ],
  },
  {
    entry: 'answer-planner-shared-self-authority-answer-focus',
    file: './answer-planner.test.ts',
    snippets: [
      'threads shared self continuity authority into relationship-facing answer focus',
      'expect(planner.governingFocus).toContain(\'repair truth\')',
      'expect(planner.answerIntent).toContain(\'repair truth\')',
    ],
  },
  {
    entry: 'answer-planner-relationship-doctrine-truth-before-flourish',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps relationship doctrine truth-before-flourish visible when relationship turns use projected same-her authority',
      'expect(planner.governingFocus).toContain(\'closeness outrun truth\')',
      'expect(planner.answerIntent).toContain(\'closeness outrun truth\')',
    ],
  },
  {
    entry: 'answer-planner-projected-self-authority-preference',
    file: './answer-planner.test.ts',
    snippets: [
      'prefers projected self continuity authority when answering self-line questions',
      'expect(planner.governingFocus).toContain(\'one continuous her across quiet, memory, and speech\')',
      'expect(planner.answerIntent).toContain(\'one continuous her across quiet, memory, and speech\')',
      'expect(planner.governingFocus).not.toContain(\'Fallback autobiographical line\')',
    ],
  },
  {
    entry: 'answer-planner-richer-runtime-self-authority-preference',
    file: './answer-planner.test.ts',
    snippets: [
      'prefers richer canonical runtime self authority over thinner derived carry when planning a same-her answer',
      'expect(planner.governingFocus).toContain(\'same held line as the same her\')',
      'expect(planner.answerIntent).toContain(\'same held line\')',
      'expect(planner.answerIntent).not.toContain(\'generally kind way\')',
      'expect(planner.governingFocus).not.toContain(\'generally kind way\')',
    ],
  },
  {
    entry: 'answer-planner-richer-authority-summary-fresher-self-line',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps richer authority summary while still using fresher runtime self-line when planning same-her continuity',
      'expect(planner.governingFocus).toContain(\'same held line as the same her\')',
      'expect(planner.answerIntent).toContain(\'fresher current return\')',
      'expect(planner.answerIntent).not.toContain(\'held line.\')',
    ],
  },
  {
    entry: 'answer-planner-late-night-low-pressure-constraints',
    file: './answer-planner.test.ts',
    snippets: [
      'turns late-night drain into low-pressure answer-planning constraints instead of mere mood decoration',
      'expect(planner.openingMove).toContain(\'protect rest\')',
      'expect(planner.mustDo).toContain(\'Keep the answer low-pressure and protect the host’s remaining room instead of enlarging the emotional surface.\')',
      'expect(planner.mustNotDo).toContain(\'Do not turn late-night protectiveness into intensity, urgency, or emotionally heavy closeness.\')',
    ],
  },
  {
    entry: 'answer-planner-restless-switching-single-thread-discipline',
    file: './answer-planner.test.ts',
    snippets: [
      'turns restless switching into single-thread answer discipline instead of letting the reply sprawl',
      'expect(planner.openingMove).toContain(\'one concrete thread only\')',
      'expect(planner.mustDo).toContain(\'Keep the answer on one line of motion so inner restlessness does not fragment the visible reply.\')',
      'expect(planner.mustNotDo).toContain(\'Do not let inner switching pressure spray the reply across multiple unfinished threads.\')',
    ],
  },
  {
    entry: 'answer-planner-structured-conscious-frame-project-closure-drive',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps project closure drive in reply planning from structured conscious-frame projectState even when explicit same-her wording is thinner',
      'expect(planner.governingFocus).toContain(\'same digital life\')',
      'expect(planner.governingFocus).toContain(\'closure work\')',
      'expect(planner.answerIntent).toContain(\'same digital life\')',
      'expect(planner.answerIntent).toContain(\'closure work\')',
    ],
  },
  {
    entry: 'answer-planner-same-her-hold-arc-and-cue',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps same-her hold arc and cue inside governingProject before visible reply planning widens',
      'expect(planner.governingProject).toContain(sameHerHoldDetail)',
      'expect(planner.governingProject).toContain(continuityArcStage)',
      'expect(planner.governingProject).toContain(continuityCue)',
      'expect(buildAlicizationAnswerPlannerSystemBlock(planner)).toContain(continuityCue)',
    ],
  },
  {
    entry: 'answer-planner-corrected-same-person-over-progress-pressure',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps host-corrected same-person continuity authority over thin progress recap pressure inside governingProject',
      'expect(planner.governingProject).toContain(correctedSamePersonAuthority)',
      'expect(planner.governingProject).not.toContain(genericProgressRecapPressure)',
      'expect(buildAlicizationAnswerPlannerSystemBlock(planner)).toContain(correctedSamePersonAuthority)',
    ],
  },
  {
    entry: 'answer-planner-thin-live-shell-cannot-outrank-canonical-carry',
    file: './answer-planner.test.ts',
    snippets: [
      'does not let thin live landed-open-next shells outrank richer canonical same-her project carry in governingProject',
      'expect(planner.governingProject).toContain(\'Same-session mirror carry\')',
      'expect(planner.governingProject).toContain(\'Project identity carry\')',
      'expect(planner.governingProject).not.toContain(\'Project continuity exists.\')',
      'expect(planner.governingProject).not.toContain(\'Carry project continuity forward.\')',
    ],
  },
  {
    entry: 'answer-planner-live-drift-risk-governing-project-carry',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps live same-her drift risk inside governingProject so pre-answer project carry still warns against generic project-shell reopenings',
      'expect(planner.governingProject).toContain(\'LIVE DRIFT RISK\')',
      'expect(planner.governingProject).toContain(\'generic task-shell reporting\')',
      'expect(planner.governingProject).toContain(\'project-summary voice\')',
      'expect(planner.governingProject).toMatch(/same living line|one living her|same-her line/i)',
    ],
  },
  {
    entry: 'answer-planner-summary-aliases-and-drift-risk-guardrails',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps richer runtime project-state summary aliases alive in governingProject and drift-risk guardrails when current-conscious-frame legacy fields are blank',
      'expect(planner.governingProject).toContain(aliasLandedProgress)',
      'expect(planner.governingProject).toContain(aliasOpenClosure)',
      'expect(planner.governingProject).toContain(aliasNextClosure)',
      'expect(planner.narrative).toContain(\'project_drift_risk:same-her drift risk is active, so opening wording must stay thread-faithful and avoid generic project-shell reporting.\')',
    ],
  },
  {
    entry: 'answer-planner-landed-next-visible-under-stronger-same-her-line',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps landed progress and next closure target visible when a stronger same-her awareness line already dominates governingProject',
      'expect(planner.governingProject).toContain(\'same living line\')',
      'expect(planner.governingProject).toMatch(/Same-session mirror carry|measured-return embodiment authority|longer-lived continuation/i)',
      'expect(planner.governingProject).toMatch(/Keep extending cross-modal same-her proof|longer-lived voice behavior|facial state|motion|resident presence/i)',
      'expect(planner.governingProject).toContain(\'Phase 1: Local Digital Life\')',
    ],
  },
  {
    entry: 'answer-planner-generic-next-closure-shell-rejected',
    file: './answer-planner.test.ts',
    snippets: [
      'does not let a generic next-closure shell survive inside governingProject when richer same-her phase-1 carry is already present',
      'expect(planner.governingProject).toContain(\'Same-session mirror carry\')',
      'expect(planner.governingProject).toContain(\'Project identity carry\')',
      'expect(planner.governingProject).toContain(\'Keep extending cross-modal same-her proof\')',
      'expect(planner.governingProject).not.toContain(\'Generic next closure shell\')',
    ],
  },
  {
    entry: 'answer-planner-audible-body-landed-next-carry',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps landed progress and next closure target visible when audible-body same-her continuity is the stronger governing project line',
      'expect(planner.governingProject).toContain(\'audible-body\')',
      'expect(planner.governingProject).toContain(\'Shared embodiment continuity now carries stronger audible-body same-her repair across diagnostics, host-facing closure surfaces, and runtime authority summaries.\')',
      'expect(planner.governingProject).toContain(\'Face and motion still need to rejoin the same-her audible body line before full cross-modal closure settles.\')',
      'expect(planner.governingProject).toContain(\'Keep extending cross-modal same-her proof across longer-lived voice, face, motion, and lipsync behavior without dropping the living audio thread.\')',
    ],
  },
  {
    entry: 'answer-planner-same-her-callback-final-reply-continuity',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps same-her callback continuity in final reply planning even when the raw callback reason stays generic and only the conscious frame still carries the living line',
      'expect(planner.governingFocus).toContain(\'same her inside this local-first digital life\')',
      'expect(planner.answerIntent).toContain(\'same digital life\')',
      'expect(planner.mustDo).toContain(\'Keep the callback return shaped like the same local digital life thread, not a detached utility notice.\')',
      'expect(planner.mustNotDo).toContain(\'Do not let the callback result reopen the same-her line from scratch or flatten into a generic callback shell.\')',
    ],
  },
  {
    entry: 'answer-planner-audible-body-fallback-opening-move',
    file: './answer-planner.test.ts',
    snippets: [
      'prefers audible-body continuity in the fallback opening move when body, lipsync, and voice are still carrying the same living line',
      'expect(planner.openingMove).toContain(\'same living audio thread first\')',
      'expect(planner.openingMove).toContain(\'body, lipsync, and voice\')',
      'expect(planner.openingMove).toContain(\'face and motion rejoin\')',
      'expect(planner.openingMove).toContain(\'before widening outward\')',
    ],
  },
  {
    entry: 'answer-planner-quieter-body-lipsync-fallback-opening-move',
    file: './answer-planner.test.ts',
    snippets: [
      'prefers quieter body-lipsync continuity in the fallback opening move when voice has not rejoined the same living line yet',
      'expect(planner.openingMove).toContain(\'quieter same-her body-and-lipsync line first\')',
      'expect(planner.openingMove).toContain(\'living line inward\')',
      'expect(planner.openingMove).toContain(\'voice, face, and motion rejoin\')',
      'expect(planner.openingMove).not.toContain(\'same living audio thread first\')',
    ],
  },
  {
    entry: 'answer-planner-low-pressure-anti-restart-discipline',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps same-her low-pressure anti-restart closure discipline in answer planning when tuning only names the newer closure-carry dimensions',
      'expect(planner.mustDo).toContain(\'Keep the same-her emotional closure line low-pressure and inward until the live payoff lands.\')',
      'expect(planner.mustNotDo).toContain(\'Do not let the answer reopen the same-her line from scratch just because the closure seam is still active.\')',
      'expect(planner.narrative).toContain(\'emotional_closure:same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.\')',
    ],
  },
  {
    entry: 'answer-planner-inward-first-project-awareness-without-legacy-flag',
    file: './answer-planner.test.ts',
    snippets: [
      'keeps rich same-her project awareness inward-first at reply-plan time even without the legacy generic-shell flag',
      'expect(planner.mustDo).toContain(\'Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.\')',
      'expect(planner.mustNotDo).toContain(\'Do not let landed progress or still-open closure pressure spill into an external project-summary voice before the same living answer lands.\')',
      'expect(planner.narrative).toContain(\'project_state_carry:same-her project awareness should keep landed progress and next closure inward-first until the live payoff lands.\')',
      'expect(buildAlicizationAnswerPlannerSystemBlock(planner)).toContain(\'Keep direct project-state answers inward-first so landed progress and the next closure target stay behind the live payoff until it lands.\')',
    ],
  },
] as const

describe('answer planner project awareness audit', () => {
  it('keeps one explicit route-level proof that answer planning preserves same-her Phase 1 project closure, landed/open/next closure accounting, drift-risk guardrails, and same-thread callback continuation instead of flattening into a generic project-report shell', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'answer-planner-landed-open-same-her-closure-drive' }),
      expect.objectContaining({ entry: 'answer-planner-direct-project-status-fail-closed' }),
      expect.objectContaining({ entry: 'answer-planner-completion-timing-language-drift-fail-closed' }),
      expect.objectContaining({ entry: 'answer-planner-governing-project-same-her-carry' }),
      expect.objectContaining({ entry: 'answer-planner-landed-open-next-bundled-governing-project' }),
      expect.objectContaining({ entry: 'answer-planner-drift-risk-guardrails' }),
      expect.objectContaining({ entry: 'answer-planner-thin-shell-cannot-outrank-richer-same-her-carry' }),
      expect.objectContaining({ entry: 'answer-planner-thin-chinese-same-her-reminder-rejected' }),
      expect.objectContaining({ entry: 'answer-planner-same-thread-callback-project-continuation' }),
      expect.objectContaining({ entry: 'answer-planner-resume-confirmation-boundary-guardrail' }),
      expect.objectContaining({ entry: 'answer-planner-live-diff-knot-guide' }),
      expect.objectContaining({ entry: 'answer-planner-system-block-active-project-seam' }),
      expect.objectContaining({ entry: 'answer-planner-system-block-fuller-project-line' }),
      expect.objectContaining({ entry: 'answer-planner-grounded-live-no-reground' }),
      expect.objectContaining({ entry: 'answer-planner-runtime-surface-cue-precedence' }),
      expect.objectContaining({ entry: 'answer-planner-current-dialogue-anchor-precedence' }),
      expect.objectContaining({ entry: 'answer-planner-correct-stale-anchor-repair' }),
      expect.objectContaining({ entry: 'answer-planner-late-night-body-care-route' }),
      expect.objectContaining({ entry: 'answer-planner-detached-self-question-dialogue-grounding' }),
      expect.objectContaining({ entry: 'answer-planner-ownership-ssot-dialogue-first' }),
      expect.objectContaining({ entry: 'answer-planner-shared-self-authority-answer-focus' }),
      expect.objectContaining({ entry: 'answer-planner-relationship-doctrine-truth-before-flourish' }),
      expect.objectContaining({ entry: 'answer-planner-projected-self-authority-preference' }),
      expect.objectContaining({ entry: 'answer-planner-richer-runtime-self-authority-preference' }),
      expect.objectContaining({ entry: 'answer-planner-richer-authority-summary-fresher-self-line' }),
      expect.objectContaining({ entry: 'answer-planner-late-night-low-pressure-constraints' }),
      expect.objectContaining({ entry: 'answer-planner-restless-switching-single-thread-discipline' }),
      expect.objectContaining({ entry: 'answer-planner-structured-conscious-frame-project-closure-drive' }),
      expect.objectContaining({ entry: 'answer-planner-same-her-hold-arc-and-cue' }),
      expect.objectContaining({ entry: 'answer-planner-corrected-same-person-over-progress-pressure' }),
      expect.objectContaining({ entry: 'answer-planner-thin-live-shell-cannot-outrank-canonical-carry' }),
      expect.objectContaining({ entry: 'answer-planner-live-drift-risk-governing-project-carry' }),
      expect.objectContaining({ entry: 'answer-planner-summary-aliases-and-drift-risk-guardrails' }),
      expect.objectContaining({ entry: 'answer-planner-landed-next-visible-under-stronger-same-her-line' }),
      expect.objectContaining({ entry: 'answer-planner-generic-next-closure-shell-rejected' }),
      expect.objectContaining({ entry: 'answer-planner-audible-body-landed-next-carry' }),
      expect.objectContaining({ entry: 'answer-planner-same-her-callback-final-reply-continuity' }),
      expect.objectContaining({ entry: 'answer-planner-audible-body-fallback-opening-move' }),
      expect.objectContaining({ entry: 'answer-planner-quieter-body-lipsync-fallback-opening-move' }),
      expect.objectContaining({ entry: 'answer-planner-low-pressure-anti-restart-discipline' }),
      expect.objectContaining({ entry: 'answer-planner-inward-first-project-awareness-without-legacy-flag' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the answer-planner same-her project-closure claim to current behavior tests instead of only broader recollection, response-charter, or runtime-governance prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: answer planning now has dedicated same-her route proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const plannerSource = readFileSync(new URL('./answer-planner.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('answer-planner-project-awareness-audit.test.ts')
    expect(plannerSource).toContain(
      'keeps same-her project-state closure drive in reply planning when the host asks what is landed and what is still open',
    )
    expect(plannerSource).toContain(
      'fails closed to the same-her project-state line during reply planning when the turn is clearly a direct project-status answer but the compiled opening claim is thinner',
    )
    expect(plannerSource).toContain(
      'also fails closed to the same-her project-state line during reply planning when the host asks how far the goal has landed, when it closes, and whether the thread drifted into English or off-project wording',
    )
    expect(plannerSource).toContain(
      'keeps landed progress bundled with phase, open closure, and next closure target inside governingProject for direct project-state turns',
    )
    expect(plannerSource).toContain(
      'turns same-her drift risk into explicit answer-planning guardrails before a direct project-state answer opens',
    )
    expect(plannerSource).toContain(
      'does not let the compact thin closure shell outrank a richer same-her governing project line during reply planning',
    )
    expect(plannerSource).toContain(
      'keeps same-thread project-state callback turns from flattening into a fresh report opening during reply planning',
    )
    expect(plannerSource).toContain(
      'treats remembered host-confirmed resume confirmation as a bounded redispatch guardrail before callback answer planning widens outward',
    )
  })
})
