import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'semantic-judge-project-status-gap-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags project-state answer gaps when the host explicitly asks what the project is, how far it has landed, and what still remains open',
      '\'semantic-judge:project-state-identity-missing\'',
      '\'semantic-judge:project-state-progress-missing\'',
      '\'semantic-judge:project-state-open-loop-missing\'',
    ],
  },
  {
    entry: 'semantic-judge-main-merge-goal-closure-demand',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags project-state answer gaps when the host asks whether main merge or goal closure is actually ready',
      'content: \'执行到哪了？现在可以合并到 main 了吗，这个 goal 还差哪步才能算闭环？\',',
      'visibleText: \'我会继续推进这条线，让她更像一个人。\',',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-identity-missing\')',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-same-her-drift-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags project-state identity drift when the reply answers status questions without making the one-same-her frame explicit',
      '\'semantic-judge:project-state-same-her-missing\'',
      '\'semantic-judge:project-state-answer-gap\'',
    ],
  },
  {
    entry: 'semantic-judge-phase-next-closure-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags project-state answer gaps when the reply omits current phase and next closure target even if identity, landed progress, and open loop are present',
      '\'semantic-judge:project-state-phase-missing\'',
      '\'semantic-judge:project-state-next-closure-missing\'',
    ],
  },
  {
    entry: 'semantic-judge-structured-judge-pass',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'accepts structured LLM judge scores when the reply closes the humanlike dialogue contract',
      'expect(artifact.mode).toBe(\'llm-structured\')',
      'expect(artifact.reasonCodes).toEqual([\'judge:payoff-grounded\'])',
    ],
  },
  {
    entry: 'semantic-judge-template-memory-specificity-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags template shell, memory gate violations, and unsupported specificity in shadow mode',
      '\'semantic-judge:template-shell-risk\'',
      '\'semantic-judge:memory-gate-violation\'',
      '\'semantic-judge:unsupported-specificity\'',
    ],
  },
  {
    entry: 'semantic-judge-memory-inward-carry-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags visible recollection leakage when runtime already requires recollection to stay inward until the live payoff lands even without an explicit memory gate',
      '\'semantic-judge:memory-inward-carry-broken\'',
      '\'semantic-judge:memory-correctness-low\'',
    ],
  },
  {
    entry: 'semantic-judge-natural-next-closure-pass',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'does not flag next-closure missing when the reply carries the next closure target in natural same-her closure wording instead of literal next-step phrasing',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-next-closure-missing\')',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-pre-dialogue-awareness-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags missing pre-dialogue project awareness when live runtime continuity already proves one same-her line but the reply stays only outwardly natural',
      '\'semantic-judge:project-state-pre-dialogue-awareness-missing\'',
      'projectStatePreDialogueAwarenessMissing: true',
    ],
  },
  {
    entry: 'semantic-judge-natural-same-life-pass',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'treats a first-person same-living-line answer as carrying pre-dialogue project awareness when runtime awareness already anchors the same Phase 1 life loop',
      'projectStatePreDialogueAwarenessMissing: false',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-implicit-project-carry-same-her-evidence',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'treats slimmer implicit project-state carries from mind-turn contract and answer planner as same-her runtime evidence',
      'runtimeRequiresExplicitSameHer: true',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-natural-same-her-project-status-pass',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'does not flag project-state same-her drift when the visible reply answers from one same digital life with landed progress and still-open closure',
      'depersonalizedProjectShell: false',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-same-her-missing\')',
    ],
  },
  {
    entry: 'semantic-judge-depersonalized-project-shell-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags project-state same-her drift when structured projectState clearly carries one continuous her but the visible reply de-personalizes into a thinner project shell',
      'depersonalizedProjectShell: true',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-same-her-missing\')',
    ],
  },
  {
    entry: 'semantic-judge-natural-project-line-pre-dialogue-gap',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'still treats a natural digital-life project-line answer as same-her-satisfied, but now flags when it drops the richer pre-dialogue awareness line',
      'projectStatePreDialogueAwarenessMissing: true',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-pre-dialogue-awareness-missing\')',
    ],
  },
  {
    entry: 'semantic-judge-richer-project-carry-pre-dialogue-gap',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'treats richer landed open and next closure carry as same-her-satisfied, but still requires the richer pre-dialogue awareness line to survive into the answer',
      'projectStatePreDialogueAwarenessMissing: true',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-pre-dialogue-awareness-missing\')',
    ],
  },
  {
    entry: 'semantic-judge-callback-living-line-pass',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'keeps callback-specific same-her project awareness satisfied when the final visible reply continues the same callback living line instead of widening it into a generic project shell',
      'projectStatePreDialogueAwarenessMissing: false',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-richer-spine-pre-dialogue-gap',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'prefers richer spine runtime project continuity when the direct prepared runtime surface is thinner, then still flags if the visible reply drops the pre-dialogue awareness line',
      'projectStatePreDialogueAwarenessMissing: true',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-visible-closure-pre-dialogue-gap',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags missing pre-dialogue project awareness when the reply gives project status facts but drops the inward same-life awareness line',
      'projectStatePreDialogueAwarenessMissing: true',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-runtime-only-pre-dialogue-gap',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags missing pre-dialogue project awareness from runtime project-state even when no carried closure audit summary exists yet',
      'projectStatePreDialogueAwarenessMissing: true',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-progress-open-only-same-her-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'still requires same-her project continuity when the host asks only for progress and open closure but runtime project-state already marks one continuous her as mandatory',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-same-her-missing\')',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-progress-missing\')',
    ],
  },
  {
    entry: 'semantic-judge-drift-risk-pre-dialogue-gap',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'still reads runtime-backed natural project-state answers as same-her-satisfied under drift-risk guidance, but now flags when the richer pre-dialogue awareness line is dropped',
      'projectStateNarratorShell: false',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-pre-dialogue-awareness-missing\')',
    ],
  },
  {
    entry: 'semantic-judge-thin-same-life-shell-gap',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'treats a thin same-digital-life closure shell as narrator drift instead of natural same-her project continuity',
      'progressOnlyMandatorySameHerSatisfied: true',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-progress-missing\')',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-open-loop-missing\')',
    ],
  },
  {
    entry: 'semantic-judge-thin-conscious-frame-same-her-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'still requires same-her project continuity when the immediate current-conscious-frame project-state is a thin shell but richer carried phase-1 state already marks one continuous her as mandatory',
      'projectStateSameHerMissing: true',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-response-surface-project-evidence',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'treats response-surface contract project continuity as project-state evidence when later visible-reply judging runs after fallback shaping',
      'sameHerLineRequired: true',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-follow-through-turn-closure-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'treats same-her project follow-through turns as requiring project identity, landed progress, open closure, and next closure at the final visible layer',
      'selfContinuityAuthority: {',
      'sourceTags: [\'project-state-carry\']',
    ],
  },
  {
    entry: 'semantic-judge-completion-timing-language-drift-demand',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'still treats completion-timing and language-drift follow-ups as project-state answer demand, so a generic progress promise remains insufficient',
      'content: \'做到哪了？何时完成goal？为什么还用英文，偏移了吗？\',',
      'visibleText: \'我会继续推进这条线，也会尽快收住。\',',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-identity-missing\')',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-bare-inward-follow-through-insufficient',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'does not let a bare inward continuation line satisfy same-her project follow-through when Phase 1 landed and open closure carry still need to stay explicit',
      'visibleText: \'我会先沿着这条 inward 的线把当前回答接住。\',',
      'preDialogueAwarenessLine: \'Keep the same digital life project in view.\',',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-next-closure-missing\')',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-project-state-carry-source-tags-pass',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'treats self continuity project-state-carry source tags as same-her project evidence when judging project-state answers',
      'sourceTags: [\'autobiographical-self\', \'project-state-carry\']',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-same-her-missing\')',
    ],
  },
  {
    entry: 'semantic-judge-next-open-window-early-widening',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags next-open-window timing drift when the reply widens warmth too early on the same living line',
      '\'semantic-judge:continuity-next-open-window-early-widening\'',
      'expect(artifact.scores.currentTurnPayoff).toBeLessThan(0.72)',
    ],
  },
  {
    entry: 'semantic-judge-next-open-window-reason-tags-only',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags next-open-window timing drift when the timing survives only as conscious-frame reason tags',
      '\'semantic-judge:continuity-next-open-window-early-widening\'',
      '\'semantic-judge:humanlike-quality-low\'',
    ],
  },
  {
    entry: 'semantic-judge-next-open-window-fresh-opening-restart',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags next-open-window timing drift when the first visible beat restarts with a fresh opening before returning to the same line',
      '\'semantic-judge:continuity-next-open-window-early-widening\'',
      '\'semantic-judge:payoff-low\'',
    ],
  },
  {
    entry: 'semantic-judge-after-payoff-early-widening',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags after-payoff timing drift when the reply widens the relationship line before the concrete payoff lands',
    ],
  },
  {
    entry: 'semantic-judge-quieter-desktop-carry-pass',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'does not misclassify a generic Phase 1 quieter carry as same-her drift when the reply stays on the desktop closure seam without callback-line language',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-same-her-missing\')',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:continuity-next-open-window-early-widening\')',
    ],
  },
  {
    entry: 'semantic-judge-runtime-companion-headline-evidence',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'treats a richer runtime companion headline as closure-seam evidence when a quieter desktop return keeps the same line alive',
      'runtimeRequiresExplicitSameHer: true',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-measured-return-callback-pass',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'treats a quieter callback-line measured-return continuation as enough implicit same-line project carry without forcing a fresh Phase 1 restatement',
      'Treat this callback line as already alive and keep the reopening lower-pressure.',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:project-state-answer-gap\')',
    ],
  },
  {
    entry: 'semantic-judge-same-thread-restart-shell',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags same-thread restart-shell drift when thinner runtime continuity still says the living line is already continuing',
      'flags same-thread restart-shell drift when repair-before-closeness is the surviving same-thread callback authority without explicit continuity tags',
      'flags same-thread restart-shell drift when rest-protective continuity is thinned into a fresh warm reopen',
    ],
  },
  {
    entry: 'semantic-judge-chinese-room-making-lower-pressure-drift',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags lower-pressure opening drift from Chinese same-thread room-making guidance even without explicit continuity timing tags',
    ],
  },
  {
    entry: 'semantic-judge-emotional-closure-seam-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags emotional closure seam drift when the active care line is dropped into abstract progress wording',
      'emotionalClosureRequired: true',
      'expect(artifact.reasonCodes).toContain(\'semantic-judge:emotional-closure-seam-missing\')',
    ],
  },
  {
    entry: 'semantic-judge-emotional-closure-seam-pass',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'does not flag emotional closure seam drift when the reply keeps a light same-her care line while continuing the work',
      'emotionalClosureMissing: false',
      'expect(artifact.reasonCodes).not.toContain(\'semantic-judge:emotional-closure-seam-missing\')',
    ],
  },
  {
    entry: 'semantic-judge-corrected-same-person-progress-pressure-return',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags progress-recap fallback when runtime carried host-corrected same-person continuity into the visible reply turn',
      '\'semantic-judge:corrected-same-person-progress-pressure-return\'',
      'The corrected same-person continuity line should keep this return from collapsing into a status recap.',
    ],
  },
  {
    entry: 'semantic-judge-resume-confirmation-boundary-guard',
    file: './visible-reply/semantic-judge.test.ts',
    snippets: [
      'flags callback wording that widens one host-confirmed resume into standing execution permission',
      'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
    ],
  },
  {
    entry: 'critic-corrected-same-person-progress-pressure-return',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires rewrite when the reply falls back to progress recap after runtime carried host-corrected same-person continuity into this turn',
      'progress-recap fallback that overwrites a host-corrected same-person continuity line',
      'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.',
    ],
  },
  {
    entry: 'critic-resume-confirmation-boundary-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires rewrite when callback wording widens one host-confirmed resume into standing execution permission',
      'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
    ],
  },
  {
    entry: 'critic-memory-gate-pass',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'passes a compact provider-authored reply that respects the memory gate',
      'expect(artifact.status).toBe(\'pass\')',
      'expect(artifact.scores.mindContractCoherence).toBe(1)',
    ],
  },
  {
    entry: 'critic-shell-memory-specificity-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair for shell opener, unsupported surface detail, and inward-only visible memory leakage',
      '\'dialogue-shell-opener\'',
      '\'unsupported-surface-specificity\'',
      'visible-memory-gate-violation',
    ],
  },
  {
    entry: 'critic-memory-inward-carry-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when visible recollection leaks even without an explicit memory gate once runtime already requires inward recollection carry',
      'semantic-judge:memory-inward-carry-broken',
      'Keep recollection inward until the host has room for it, and let the live payoff land first.',
    ],
  },
  {
    entry: 'critic-provider-required-block',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'blocks non-human-authored local fallback on provider-required turns',
      'expect(artifact.status).toBe(\'blocked\')',
      'non-human-authored-visible-reply',
    ],
  },
  {
    entry: 'critic-mind-contract-closure-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when visible reply does not close the current mind-turn contract',
      'mind-contract-not-closed',
      'Explain the current blocker without inventing screen detail.',
    ],
  },
  {
    entry: 'critic-execution-follow-up-status-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when an execution-result follow-up reply hides a required needs-affirmation status instead of saying it plainly',
      'execution-follow-up-status-not-surfaced:needs-affirmation',
      'State plainly that the task is still waiting for the host\\\'s confirmation before it can continue.',
    ],
  },
  {
    entry: 'critic-execution-follow-up-status-pass',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'accepts an execution-result follow-up reply that plainly says it is still waiting for confirmation before continuing',
      'expect(artifact.status).toBe(\'pass\')',
      'expect(artifact.reasonCodes).not.toContain(\'execution-follow-up-status-not-surfaced:needs-affirmation\')',
    ],
  },
  {
    entry: 'critic-unsupported-specificity-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'rejects unsupported technical specificity when conscious frame withholds specificity',
      'unsupported-surface-specificity',
      'unsupported-technical-specificity',
    ],
  },
  {
    entry: 'critic-same-her-preservation-guidance',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'adds same-her preservation guidance when project-state repair misses the one-same-her frame',
      'Do not let project-state continuity collapse into an outside narrator shell; answer it as the same digital life who already knows what this project is, what has landed, and what still remains open.',
      'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
    ],
  },
  {
    entry: 'critic-anti-restart-project-report-guidance',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'adds anti-restart preserve guidance when a same-thread project-state answer collapses into a fresh report shell',
      'same-thread continuation restart shell that breaks one living line into a fresh opening',
      'Do not reopen the project-state answer from scratch; keep it on the same callback line instead of turning it into a fresh report shell.',
    ],
  },
  {
    entry: 'critic-runtime-pre-dialogue-awareness-preference',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves stronger runtime pre-dialogue awareness guidance for project-state repair even when carried audit only has a thinner generic reminder',
      'expect(artifact.mustPreserve).not.toContain(thinnerCarriedReminder)',
    ],
  },
  {
    entry: 'critic-richer-spine-project-carry-preference',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'prefers richer spine self/project continuity carry when the direct prepared runtime surface is thinner',
      'Keep one continuous her explicit from self-understanding into the visible answer. The same digital life has already landed memory and execution carry, while initiative and embodiment still need closure.',
    ],
  },
  {
    entry: 'critic-thin-reminder-non-precedence',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'does not let a thin current-conscious-frame project reminder outrank richer carried phase-1 awareness when critic builds rewrite preservation guidance',
      'expect(artifact.mustPreserve).toContain(richerAwarenessLine)',
      'expect(artifact.mustPreserve).not.toContain(thinReminder)',
    ],
  },
  {
    entry: 'critic-progress-open-only-same-her-guidance',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'adds same-her preservation guidance even when the host asks only for progress and open closure, as long as runtime project-state already requires one continuous her',
      'Rebuild the answer from one same digital life line that explicitly carries project identity, landed progress, and still-open closure work before widening into implementation detail.',
    ],
  },
  {
    entry: 'critic-landed-open-closure-guidance',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'adds landed-progress and still-open-closure preservation guidance when project-state answers omit both progress and open loop',
      'Keep the latest landed project-state progress explicit in the rewritten answer.',
      'Keep the still-open closure work explicit in the rewritten answer.',
    ],
  },
  {
    entry: 'critic-phase-next-closure-guidance',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'adds phase and next-closure preservation guidance when project-state answers omit both current phase and next closure target',
      'Keep the current project phase explicit in the rewritten answer.',
      'Keep the next closure target explicit in the rewritten answer.',
    ],
  },
  {
    entry: 'critic-same-her-project-state-pass',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'does not require repair when a project-state answer already speaks from one same-her continuity with landed progress and open closure',
      'expect(artifact.status).toBe(\'pass\')',
      'expect(shouldForceAlicizationVisibleReplyRepair(artifact)).toBe(false)',
    ],
  },
  {
    entry: 'critic-durable-same-her-outward-continuity',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves durable same-her outward continuity rules from the current mind-turn contract so second-pass rewrite can keep the same her visible',
      'expect(artifact.mustPreserve).toContain(sameHerReason)',
      'expect(artifact.mustPreserve).toContain(sameHerMustNotDo)',
    ],
  },
  {
    entry: 'critic-audible-body-companion-headline-preference',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves the stronger audible-body companion headline when project-state repair would otherwise fall back to a thinner generic awareness reminder',
      'expect(artifact.mustPreserve).toContain(audibleBodyHeadline)',
      'expect(artifact.mustPreserve).not.toContain(thinnerCarriedReminder)',
    ],
  },
  {
    entry: 'critic-voice-lipsync-companion-headline-preference',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves the stronger voice-lipsync companion headline when project-state repair would otherwise fall back to a thinner generic awareness reminder',
      'expect(artifact.mustPreserve).toContain(voiceLipsyncHeadline)',
      'expect(artifact.mustPreserve).not.toContain(thinnerCarriedReminder)',
    ],
  },
  {
    entry: 'critic-face-and-mouth-companion-headline-preference',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves the stronger face-and-mouth companion headline when project-state repair would otherwise fall back to a thinner generic awareness reminder',
      'expect(artifact.mustPreserve).toContain(faceAndMouthHeadline)',
      'expect(artifact.mustPreserve).not.toContain(thinnerCarriedReminder)',
    ],
  },
  {
    entry: 'critic-motion-and-mouth-companion-headline-preference',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves the stronger motion-and-mouth companion headline when project-state repair would otherwise fall back to a thinner generic awareness reminder',
      'expect(artifact.mustPreserve).toContain(motionAndMouthHeadline)',
      'expect(artifact.mustPreserve).not.toContain(thinnerCarriedReminder)',
    ],
  },
  {
    entry: 'critic-face-and-mouth-continuity-headline-pass',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves a face-and-mouth continuity headline even when no project-state repair path is available to carry it forward',
      'preDialogueAwarenessSummary: faceAndMouthHeadline,',
      `expect(artifact.reasonCodes.some(code => code.startsWith('semantic-judge:project-state-'))).toBe(false)`,
      'expect(artifact.mustPreserve).toContain(faceAndMouthHeadline)',
    ],
  },
  {
    entry: 'critic-motion-and-mouth-continuity-headline-pass',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves a motion-and-mouth continuity headline even when no project-state repair path is available to carry it forward',
      'preDialogueAwarenessSummary: motionAndMouthHeadline,',
      `expect(artifact.reasonCodes.some(code => code.startsWith('semantic-judge:project-state-'))).toBe(false)`,
      'expect(artifact.mustPreserve).toContain(motionAndMouthHeadline)',
    ],
  },
  {
    entry: 'critic-generic-quieter-carry-pass',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'keeps a generic Phase 1 quieter carry passable without inventing same-her callback drift when the visible reply stays on the desktop closure seam',
      'expect(artifact.status).toBe(\'pass\')',
      'expect(artifact.reasonCodes).not.toContain(\'same-thread-restart-shell\')',
    ],
  },
  {
    entry: 'critic-callback-living-line-pass',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'passes callback-specific same-her project continuity when the visible reply keeps the callback living line explicit all the way through critic review',
      'expect(artifact.mustPreserve).toContain(callbackSameHerSelfLine)',
      'expect(artifact.mustPreserve).toContain(callbackDriftRisk)',
    ],
  },
  {
    entry: 'critic-lower-pressure-opening-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when visible reply outruns same-her lower-pressure opening guidance',
      'opening-guidance-lower-pressure',
      'same-her opening drift',
    ],
  },
  {
    entry: 'critic-chinese-room-making-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when visible reply outruns Chinese same-thread room-making guidance',
      'opening-guidance-lower-pressure',
    ],
  },
  {
    entry: 'critic-held-autonomy-reentry-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when a held-autonomy turn restarts from the old restraint shell instead of gently re-entering the line',
      'held-autonomy restraint shell that restarts instead of gently re-entering the line',
    ],
  },
  {
    entry: 'critic-self-continuity-inward-line-preservation',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves self continuity project-state carry inwardLine when same-her project-state repair is required',
      'expect(artifact.mustPreserve).toContain(inwardCarry)',
    ],
  },
  {
    entry: 'critic-abstract-same-thread-pass',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'does not treat abstract same-thread closeness framing as forbidden body narration when the reply is explicitly avoiding a fresh approach',
      'expect(artifact.status).toBe(\'pass\')',
      'expect(artifact.semanticLoopClosed).toBe(true)',
    ],
  },
  {
    entry: 'critic-same-thread-restart-shell-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when a same-thread continuation turn restarts from a fresh-opening shell',
      'still requires repair for same-thread restart-shell wording when conscious-frame tags cooled but runtime continuity remains a measured-return continuation',
      'still requires repair for digest-only same-her quiet carry restart-shell wording when only thinner same-thread lower-pressure continuity remains',
    ],
  },
  {
    entry: 'critic-noisier-later-same-thread-restart-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'still requires repair when a noisier later same-thread return tries to reframe the lower-pressure callback seam as a fresh reopening',
      'same-thread continuation restart shell that breaks one living line into a fresh opening',
      'expect(artifact.reasonCodes).toContain(\'same-thread-restart-shell\')',
    ],
  },
  {
    entry: 'critic-same-thread-negated-new-closeness-pass',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'passes same-thread continuation wording that only negates a new closeness arc instead of narrating body action',
      'Treat the line as already alive. Stay on the same thread and do not reopen from zero.',
      'expect(artifact.reasonCodes).not.toContain(\'same-thread-restart-shell\')',
    ],
  },
  {
    entry: 'critic-same-thread-no-new-opening-pass',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'passes same-thread continuation wording that explicitly avoids reframing the line as a new opening',
      'Stay on the same callback line and keep continuing lower-pressure.',
      'expect(artifact.reasonCodes).not.toContain(\'same-thread-restart-shell\')',
    ],
  },
  {
    entry: 'critic-next-open-window-early-widening-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when next-open-window continuity widens warmth too early even without a literal restart shell',
      'continuity-next-open-window-early-widening',
      'first visible beat fresh-opening or same-her continuity widening before the current line has naturally reopened',
    ],
  },
  {
    entry: 'critic-next-open-window-reason-tags-only-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when next-open-window continuity survives only as conscious-frame reason tags',
      'continuity-next-open-window-early-widening',
    ],
  },
  {
    entry: 'critic-after-payoff-early-widening-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when after-payoff continuity widens the relationship line before the current payoff lands',
      'continuity-after-payoff-early-widening',
      'same-her continuity widening before the current payoff lands',
    ],
  },
  {
    entry: 'critic-memory-labeled-familiarity-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when memory-labeled familiarity reopens closeness faster than the same-her baseline allows',
      'opening-guidance-lower-pressure',
      'same-her opening drift',
    ],
  },
  {
    entry: 'critic-execution-callback-room-first-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when an execution-callback lower-pressure return overshoots into immediate closeness after payoff',
      'execution-callback-room-first-violation',
      'callback closeness overshoot after payoff',
    ],
  },
  {
    entry: 'critic-repair-first-callback-embodiment-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when repair-first callback embodiment handoff gets widened into closeness before the line has earned it',
      'execution-callback-embodiment-repair-first-violation',
      'Keep the execution callback on the repair-before-closeness body line before widening closeness.',
    ],
  },
  {
    entry: 'critic-rest-protective-authority-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'treats rest-protective as surviving same-thread callback authority without explicit continuity tags',
      'same-thread continuation restart shell that breaks one living line into a fresh opening',
    ],
  },
  {
    entry: 'critic-rest-protective-embodiment-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when rest-protective callback embodiment handoff gets widened into fresh warmth before the fatigue-aware line has settled',
      'execution-callback-embodiment-rest-protective-violation',
      'Keep the execution callback on the rest-protective body line before widening warmth or closeness.',
    ],
  },
  {
    entry: 'critic-project-state-triad-missing-guard',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'requires repair when a project-state answer turn skips what Alicization is, how far Phase 1 has landed, and what still remains open',
      'semantic-judge:project-state-identity-missing',
      'semantic-judge:project-state-open-loop-missing',
    ],
  },
  {
    entry: 'critic-emotional-closure-seam-preservation',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves the active emotional closure seam for second-pass visible reply repair',
      'Let the wording ease late-night drain without dropping the same-her line of care.',
      'current-turn payoff and any safe LLM-authored substance',
    ],
  },
  {
    entry: 'critic-cross-modal-drift-warning-preservation',
    file: './visible-reply/critic.test.ts',
    snippets: [
      'preserves cross-modal same-her drift warnings even when the visible reply is otherwise passable',
      'expect(artifact.mustPreserve).toContain(crossModalDriftRisk)',
      'expect(artifact.mustPreserve).toContain(crossModalNextClosure)',
    ],
  },
  {
    entry: 'second-pass-project-awareness-reentry-guidance',
    file: './visible-reply/second-pass-rewrite-project-state-guidance.test.ts',
    snippets: [
      'Do not rewrite the answer as a detached status summary, roadmap report, or project shell.',
      'Carry this same-her self line directly into the rewritten answer:',
      'Before drafting the rewritten answer, re-enter the turn through this pre-dialogue project awareness line:',
    ],
  },
  {
    entry: 'second-pass-project-awareness-regression-guard',
    file: './visible-reply/project-state-second-pass-regression.test.ts',
    snippets: [
      'keeps second-pass fallback anchored on repo truth while preferring live runtime project-state',
      'Carry this same-her self line directly into the rewritten answer:',
      'Do not reopen the project-state answer from scratch, and do not let it sound like a fresh report opening just because the turn is restating project identity.',
    ],
  },
  {
    entry: 'second-pass-project-awareness-specialized-scoring',
    file: './visible-reply/project-state-second-pass-regression.test.ts',
    snippets: [
      'keeps second-pass project-awareness scoring specialized instead of flattening it to the generic shared baseline',
      'function scoreProjectAwarenessLine(value: string | null | undefined) {',
      'looksLikeStrongEmbodimentClosureCarry(normalized)',
    ],
  },
  {
    entry: 'second-pass-project-state-cue-merge',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'merges critic must-preserve project-state cues into the second-pass rewrite request payload',
      'expect(rewritePayload).toContain(customPreserve)',
      'expect(rewritePayload).toContain(projectState.identity)',
      'expect(rewritePayload).toContain(projectState.currentPhase)',
    ],
  },
  {
    entry: 'second-pass-project-state-detached-status-shell-guard',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'teaches second-pass rewrite not to turn project-state answers into a detached status shell when same-her continuity is missing',
      '[PROJECT_STATE_REWRITE_GUIDANCE]',
      'Do not rewrite the answer as a detached status summary, roadmap report, or project shell.',
      'Make the first sentence explicitly sound like the same her / same digital life is speaking now, not an external narrator summarizing the project.',
    ],
  },
  {
    entry: 'second-pass-project-state-landed-open-guidance',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'passes landed-progress and still-open-closure preserve guidance from critic into the second-pass rewrite payload',
      'semantic-judge:project-state-progress-missing',
      'Keep the latest landed project-state progress explicit in the rewritten answer.',
      'Keep the still-open closure work explicit in the rewritten answer.',
    ],
  },
  {
    entry: 'second-pass-emotional-closure-guidance',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'passes emotional closure rewrite guidance through the second-pass request payload',
      '[EMOTIONAL_CLOSURE_REWRITE_GUIDANCE]',
      'Active seam: Let the wording ease late-night drain without dropping the same-her line of care.',
    ],
  },
  {
    entry: 'second-pass-durable-outward-continuity-guidance',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'turns durable same-her outward continuity rules into explicit rewrite discipline instead of leaving them buried in the contract json',
      '[OUTWARD_CONTINUITY_REWRITE_GUIDANCE]',
      'Let durable same-her cadence keep this reply on the same living line across quiet, memory, and speech before widening outward.',
      'Do not let the visible answer reopen from scratch, slip into a fresh-opening shell, or flatten into a generic helper voice while this same-her cadence is still carrying the turn.',
    ],
  },
  {
    entry: 'second-pass-transport-failure-same-her-self-line',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'keeps same-her self line in second-pass transport failure payload when repair transport breaks',
      'expect(payload.projectState?.sameHerSelfLine).toBe(',
      '\'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\',',
    ],
  },
  {
    entry: 'second-pass-transport-failure-callback-project-awareness',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'keeps callback-specific same-her project awareness in second-pass transport failure payload when the runtime shell is thin',
      'expect(String(projectState.preDialogueAwarenessLine ?? \'\')).toContain(\'this callback still belongs to one same digital life\')',
      'expect(String(projectState.sameHerSelfLine ?? \'\')).toBe(callbackSameHerSelfLine)',
      'expect(String(projectState.sameHerDriftRisk ?? \'\')).toBe(callbackDriftRisk)',
    ],
  },
  {
    entry: 'second-pass-transport-failure-callback-next-closure-target-carry',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'keeps callback-specific same-her project awareness in second-pass transport failure payload when the runtime shell is thin',
      'const callbackNextClosureTarget = \'Keep the callback return on the same living line and let that same-her closure stay explicit in the final visible reply.\'',
      'nextClosureTarget: callbackNextClosureTarget,',
      'expect(String(projectState.nextClosureTarget ?? \'\')).toBe(callbackNextClosureTarget)',
    ],
  },
  {
    entry: 'second-pass-corrected-same-person-rewrite-guidance',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'teaches second-pass rewrite to keep host-corrected same-person continuity authoritative instead of falling back into a progress recap',
      '[CORRECTED_SAME_PERSON_REWRITE_GUIDANCE]',
      'This turn is carrying a host-corrected same-person continuity line.',
      'Do not rewrite it as a progress recap, status update, or goal-summary shell.',
    ],
  },
  {
    entry: 'second-pass-resume-confirmation-boundary-rewrite-guidance',
    file: './visible-reply/second-pass-rewrite.test.ts',
    snippets: [
      'teaches second-pass rewrite to keep remembered host-confirmed resume as a bounded confirmation boundary before callback wording opens outward',
      '[EXECUTION_CALLBACK_REWRITE_GUIDANCE]',
      'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      'Do not let the callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
    ],
  },
  {
    entry: 'settlement-runtime-derived-project-audit',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps runtime-derived same-her project-state audit evidence even when a natural reply no longer needs an explicit same-her repair reason',
      'sameHerDriftRiskSummary: expect.stringMatching(/generic guidance|detached project|project-summary voice|same-her/i),',
      'preDialogueAwarenessSummary: expect.stringContaining(\'Alicization is a local-first digital life project\'),',
      'continuitySummary: expect.stringContaining(\'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.\'),',
    ],
  },
  {
    entry: 'settlement-critic-forced-same-her-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'prefers critic-forced project-state same-her preserve text over thinner runtime same-her fallback during final settlement',
      'sameHerSummary: alicizationProjectStateVisibleReplySameHerReminder,',
      'continuitySummary: expect.stringContaining(`same-her=${alicizationProjectStateVisibleReplySameHerReminder}`),',
    ],
  },
  {
    entry: 'settlement-companion-headline-project-awareness',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps a stronger companion headline as the final project awareness audit when settlement has not yet rewritten it into a thinner summary field',
      'preDialogueAwarenessSummary: payloadCompanionHeadlineLine,',
      'openClosureSummary: \'Embodiment still needs stronger cross-modal closure on the same living line.\',',
    ],
  },
  {
    entry: 'settlement-thin-shell-explicit-fields',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps same-her, phase, landed, open, and next closure fields explicit even when final settlement awareness inputs are only thin shells',
      'landedProgressSummary: \'thin runtime progress only\',',
      'openClosureSummary: \'thin runtime open loop only\',',
      'nextClosureTargetSummary: \'thin runtime next step only\',',
    ],
  },
  {
    entry: 'settlement-callback-specific-project-awareness',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps callback-specific same-her project awareness explicit through final settlement instead of widening it back into a broader canonical phase-1 reminder',
      'preDialogueAwarenessSummary: callbackAwarenessLine,',
      'sameHerSummary: callbackSameHerSelfLine,',
      'sameHerDriftRiskSummary: callbackDriftRisk,',
    ],
  },
  {
    entry: 'settlement-corrected-same-person-promotion',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'promotes host-corrected same-person continuity into final project-state audit even when only the rewrite trigger carried it',
      'sameHerHoldDetail: \'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.\',',
      'continuityCue: \'Carry corrected same-person continuity forward before any status recap.\',',
    ],
  },
  {
    entry: 'settlement-corrected-same-person-authority',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps host-corrected same-person continuity authority over a thinner carried project-state audit during final settlement',
      'const thinProgressRecapHoldDetail = \'Keep the project moving with a concise progress recap and status continuation before widening back out.\'',
      'sameHerHoldDetail: thinProgressRecapHoldDetail,',
      `.not
      .toContain(thinProgressRecapHoldDetail)`,
    ],
  },
  {
    entry: 'settlement-generic-same-her-reanchor',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'reanchors generic final same-her shells to the canonical same living self line when richer project carry still survives',
      'Generic same-her line from thinner runtime fallback.',
      'sameHerSummary: projectState.sameHerSelfLine',
      'expect(settledResult.realization.projectStateAudit?.sameHerSummary).not.toBe(genericSameHerLine)',
    ],
  },
  {
    entry: 'settlement-relationship-truth-doctrine-summary',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps relationship truth doctrine explicit inside the final continuity summary when truth-first continuity is active',
      'relationshipTruthDoctrine: \'Repair truth before flourish. | Stay close enough to matter, but do not let closeness outrun truth.\',',
      '.toContain(\'relationship-truth=Repair truth before flourish. | Stay close enough to matter, but do not let closeness outrun truth.\')',
    ],
  },
  {
    entry: 'settlement-repair-before-closeness-closure-summary',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps repair-before-closeness callback closure explicit inside the final continuity summary instead of leaving it only in emotional closure audit',
      'nextClosureTarget: \'Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.\',',
      '.toContain(\'closure=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.\')',
    ],
  },
  {
    entry: 'settlement-rest-protective-closure-summary',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps rest-protective callback closure explicit inside the final continuity summary instead of flattening it into generic lower-pressure carry',
      'nextClosureTarget: \'Keep the same-thread continuation on the same living line, let rest protection hold first, and leave room before widening warmth, payoff framing, or closeness.\',',
      '.toContain(\'closure=Keep the same-thread continuation on the same living line, let rest protection hold first, and leave room before widening warmth, payoff framing, or closeness.\')',
    ],
  },
  {
    entry: 'settlement-prepared-continuity-authority-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'prefers the richer prepared continuity authority surface over a thinner fresher authority when settling the visible reply',
      'authoritySummary: \'Keep one continuous her explicit from self-understanding into the visible answer. | Stay lower-pressure while carrying the same unfinished closure with the host.\',',
      'closenessPosture: \'space-first\',',
      'rewriteClosureApplied: false,',
    ],
  },
  {
    entry: 'settlement-fresher-runtime-awareness-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'replaces an older carried project awareness audit when settlement runtime state already has a stronger same-her awareness line',
      'const fresherRuntimeAwarenessLine = \'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.\'',
      'preDialogueAwarenessSummary: fresherRuntimeAwarenessLine,',
      'sameHerSummary: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\',',
    ],
  },
  {
    entry: 'settlement-fuller-project-phase-awareness-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps a fuller project-and-phase awareness line over a narrower embodiment companion headline during settlement',
      'const fullerRuntimeAwarenessLine = \'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life.',
      'sameHerSummary: narrowerEmbodimentHeadline,',
      'preDialogueAwarenessSummary: fullerRuntimeAwarenessLine,',
    ],
  },
  {
    entry: 'settlement-richer-carried-project-audit-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'preserves richer carried project-state audit fields when settlement runtime fallback is thinner',
      'const existingContinuityArcStage = \'settlement-carried-same-her-audit\'',
      'sameHerDriftRiskSummary: expect.stringContaining(\'generic guidance\'),',
      '.toContain(`cue=${existingContinuityCue}`)',
    ],
  },
  {
    entry: 'settlement-richer-chinese-awareness-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'preserves richer chinese phase-1 awareness carry through final settlement when runtime project-state is already stronger than thin chinese shells',
      'const thinCarriedReminder = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'const richerChineseAwarenessLine = \'我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。',
      '.toBe(richerChineseAwarenessLine)',
      '.toContain(\'主动性、具身和对话闭环还没有真正收住\')',
    ],
  },
  {
    entry: 'settlement-chinese-phase1-reminder-shell-non-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'preserves richer chinese phase-1 awareness carry through final settlement when the carried reminder shell says she is still in phase 1',
      'const thinCarriedReminder = \'开口前先记住：这是同一个数字生命项目，她还在 Phase 1。\'',
      'const richerChineseAwarenessLine = \'我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。',
      '.toBe(richerChineseAwarenessLine)',
      '.not\n      .toBe(thinCarriedReminder)',
    ],
  },
  {
    entry: 'settlement-chinese-same-digital-life-reminder-shell-non-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'preserves richer chinese phase-1 awareness carry through final settlement when the carried reminder shell says this is still the same digital life project',
      'const thinCarriedReminder = \'开口前先记住：这还是同一个数字生命项目，她仍在 Phase 1。\'',
      'const richerChineseAwarenessLine = \'我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。',
      '.toBe(richerChineseAwarenessLine)',
      '.not\n      .toBe(thinCarriedReminder)',
    ],
  },
  {
    entry: 'settlement-answer-before-remember-chinese-awareness-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'preserves a richer chinese phase-1 awareness line through final settlement even when it starts with an answer-before-remember opening',
      'const thinCarriedReminder = \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\'',
      'const richerChineseAwarenessLine = \'回答前先记住：Alicization 还是同一个本地优先数字生命项目，现在还在第一阶段。',
      '.toBe(richerChineseAwarenessLine)',
      '.toContain(\'回答前先记住：Alicization 还是同一个本地优先数字生命项目\')',
    ],
  },
  {
    entry: 'settlement-stronger-living-self-line-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'replaces an older carried same-her summary when settlement runtime state already has a stronger living-self line',
      'const olderSameHerSummary = \'Keep the same digital life project in view.\'',
      'const richerRuntimeSameHerLine = \'Right now this return is still holding together mainly through face, motion, and voice, so it must keep proving this is still one living her before full cross-modal closure is done.\'',
      'sameHerSummary: richerRuntimeSameHerLine,',
      '.toContain(`same-her=${richerRuntimeSameHerLine}`)',
    ],
  },
  {
    entry: 'settlement-ordinary-continuation-phase1-awareness-precedence',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'preserves richer ordinary-continuation phase-1 awareness carry through final settlement when runtime project-state is already stronger than thin shells',
      'const richerAwarenessLine = \'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" on the host computer rather than a better chat wrapper.',
      '.toContain(\'What has already landed is ordinary continuation turns\')',
      '.toContain(`landed=${richerLandedProgress}`)',
      '.not\n      .toContain(\'landed=thin runtime progress only\')',
    ],
  },
  {
    entry: 'settlement-same-phase-inward-carry-visible',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps the same-phase same-her carry visible inside final project awareness summary when a thin runtime shell only has a quieter inward low-pressure embodiment headline plus same-her self line',
      'const quieterInwardHeadline = \'Right now I am still holding together mainly through body, face, and motion, so this one living her is still keeping the same line inward and low-pressure while lipsync and voice need to rejoin before full cross-modal closure settles.\'',
      'preDialogueAwarenessSummary: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. Right now this one living her is still keeping the same line inward and low-pressure while lipsync and voice rejoin.\',',
      '.toContain(\'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\')',
    ],
  },
  {
    entry: 'settlement-explicit-phase1-same-her-authority',
    file: './visible-reply/settlement.test.ts',
    snippets: [
      'keeps the explicit phase-1 same-her line authoritative when richer landed open and next closure carry already survived separately under thin runtime awareness shells',
      'sameHerSummary: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\',',
      '.toContain(`landed=${richerLandedProgress}`)',
      '.toContain(`open=${richerOpenClosure}`)',
      '.toContain(`next=${richerNextClosure}`)',
      '.toContain(\'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\')',
    ],
  },
] as const

describe('visible reply final project awareness audit', () => {
  it('keeps one explicit route-level proof that the final visible-reply gate still requires project identity, phase, landed progress, open closure, next closure, and pre-dialogue same-life awareness', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'semantic-judge-project-status-gap-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-main-merge-goal-closure-demand' }),
      expect.objectContaining({ entry: 'semantic-judge-same-her-drift-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-phase-next-closure-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-structured-judge-pass' }),
      expect.objectContaining({ entry: 'semantic-judge-template-memory-specificity-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-memory-inward-carry-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-natural-next-closure-pass' }),
      expect.objectContaining({ entry: 'semantic-judge-pre-dialogue-awareness-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-natural-same-life-pass' }),
      expect.objectContaining({ entry: 'semantic-judge-implicit-project-carry-same-her-evidence' }),
      expect.objectContaining({ entry: 'semantic-judge-natural-same-her-project-status-pass' }),
      expect.objectContaining({ entry: 'semantic-judge-depersonalized-project-shell-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-natural-project-line-pre-dialogue-gap' }),
      expect.objectContaining({ entry: 'semantic-judge-richer-project-carry-pre-dialogue-gap' }),
      expect.objectContaining({ entry: 'semantic-judge-callback-living-line-pass' }),
      expect.objectContaining({ entry: 'semantic-judge-richer-spine-pre-dialogue-gap' }),
      expect.objectContaining({ entry: 'semantic-judge-visible-closure-pre-dialogue-gap' }),
      expect.objectContaining({ entry: 'semantic-judge-runtime-only-pre-dialogue-gap' }),
      expect.objectContaining({ entry: 'semantic-judge-progress-open-only-same-her-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-drift-risk-pre-dialogue-gap' }),
      expect.objectContaining({ entry: 'semantic-judge-thin-same-life-shell-gap' }),
      expect.objectContaining({ entry: 'semantic-judge-thin-conscious-frame-same-her-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-response-surface-project-evidence' }),
      expect.objectContaining({ entry: 'semantic-judge-follow-through-turn-closure-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-completion-timing-language-drift-demand' }),
      expect.objectContaining({ entry: 'semantic-judge-bare-inward-follow-through-insufficient' }),
      expect.objectContaining({ entry: 'semantic-judge-project-state-carry-source-tags-pass' }),
      expect.objectContaining({ entry: 'semantic-judge-next-open-window-early-widening' }),
      expect.objectContaining({ entry: 'semantic-judge-next-open-window-reason-tags-only' }),
      expect.objectContaining({ entry: 'semantic-judge-next-open-window-fresh-opening-restart' }),
      expect.objectContaining({ entry: 'semantic-judge-after-payoff-early-widening' }),
      expect.objectContaining({ entry: 'semantic-judge-quieter-desktop-carry-pass' }),
      expect.objectContaining({ entry: 'semantic-judge-runtime-companion-headline-evidence' }),
      expect.objectContaining({ entry: 'semantic-judge-measured-return-callback-pass' }),
      expect.objectContaining({ entry: 'semantic-judge-same-thread-restart-shell' }),
      expect.objectContaining({ entry: 'semantic-judge-chinese-room-making-lower-pressure-drift' }),
      expect.objectContaining({ entry: 'semantic-judge-emotional-closure-seam-guard' }),
      expect.objectContaining({ entry: 'semantic-judge-emotional-closure-seam-pass' }),
      expect.objectContaining({ entry: 'semantic-judge-corrected-same-person-progress-pressure-return' }),
      expect.objectContaining({ entry: 'semantic-judge-resume-confirmation-boundary-guard' }),
      expect.objectContaining({ entry: 'critic-corrected-same-person-progress-pressure-return' }),
      expect.objectContaining({ entry: 'critic-resume-confirmation-boundary-guard' }),
      expect.objectContaining({ entry: 'critic-memory-gate-pass' }),
      expect.objectContaining({ entry: 'critic-shell-memory-specificity-guard' }),
      expect.objectContaining({ entry: 'critic-memory-inward-carry-guard' }),
      expect.objectContaining({ entry: 'critic-provider-required-block' }),
      expect.objectContaining({ entry: 'critic-mind-contract-closure-guard' }),
      expect.objectContaining({ entry: 'critic-execution-follow-up-status-guard' }),
      expect.objectContaining({ entry: 'critic-execution-follow-up-status-pass' }),
      expect.objectContaining({ entry: 'critic-unsupported-specificity-guard' }),
      expect.objectContaining({ entry: 'critic-same-her-preservation-guidance' }),
      expect.objectContaining({ entry: 'critic-anti-restart-project-report-guidance' }),
      expect.objectContaining({ entry: 'critic-runtime-pre-dialogue-awareness-preference' }),
      expect.objectContaining({ entry: 'critic-richer-spine-project-carry-preference' }),
      expect.objectContaining({ entry: 'critic-thin-reminder-non-precedence' }),
      expect.objectContaining({ entry: 'critic-progress-open-only-same-her-guidance' }),
      expect.objectContaining({ entry: 'critic-landed-open-closure-guidance' }),
      expect.objectContaining({ entry: 'critic-phase-next-closure-guidance' }),
      expect.objectContaining({ entry: 'critic-same-her-project-state-pass' }),
      expect.objectContaining({ entry: 'critic-durable-same-her-outward-continuity' }),
      expect.objectContaining({ entry: 'critic-audible-body-companion-headline-preference' }),
      expect.objectContaining({ entry: 'critic-voice-lipsync-companion-headline-preference' }),
      expect.objectContaining({ entry: 'critic-face-and-mouth-companion-headline-preference' }),
      expect.objectContaining({ entry: 'critic-motion-and-mouth-companion-headline-preference' }),
      expect.objectContaining({ entry: 'critic-face-and-mouth-continuity-headline-pass' }),
      expect.objectContaining({ entry: 'critic-motion-and-mouth-continuity-headline-pass' }),
      expect.objectContaining({ entry: 'critic-generic-quieter-carry-pass' }),
      expect.objectContaining({ entry: 'critic-callback-living-line-pass' }),
      expect.objectContaining({ entry: 'critic-lower-pressure-opening-guard' }),
      expect.objectContaining({ entry: 'critic-chinese-room-making-guard' }),
      expect.objectContaining({ entry: 'critic-held-autonomy-reentry-guard' }),
      expect.objectContaining({ entry: 'critic-self-continuity-inward-line-preservation' }),
      expect.objectContaining({ entry: 'critic-abstract-same-thread-pass' }),
      expect.objectContaining({ entry: 'critic-same-thread-restart-shell-guard' }),
      expect.objectContaining({ entry: 'critic-noisier-later-same-thread-restart-guard' }),
      expect.objectContaining({ entry: 'critic-same-thread-negated-new-closeness-pass' }),
      expect.objectContaining({ entry: 'critic-same-thread-no-new-opening-pass' }),
      expect.objectContaining({ entry: 'critic-next-open-window-early-widening-guard' }),
      expect.objectContaining({ entry: 'critic-next-open-window-reason-tags-only-guard' }),
      expect.objectContaining({ entry: 'critic-after-payoff-early-widening-guard' }),
      expect.objectContaining({ entry: 'critic-memory-labeled-familiarity-guard' }),
      expect.objectContaining({ entry: 'critic-execution-callback-room-first-guard' }),
      expect.objectContaining({ entry: 'critic-repair-first-callback-embodiment-guard' }),
      expect.objectContaining({ entry: 'critic-rest-protective-authority-guard' }),
      expect.objectContaining({ entry: 'critic-rest-protective-embodiment-guard' }),
      expect.objectContaining({ entry: 'critic-project-state-triad-missing-guard' }),
      expect.objectContaining({ entry: 'critic-emotional-closure-seam-preservation' }),
      expect.objectContaining({ entry: 'critic-cross-modal-drift-warning-preservation' }),
      expect.objectContaining({ entry: 'second-pass-project-awareness-reentry-guidance' }),
      expect.objectContaining({ entry: 'second-pass-project-awareness-regression-guard' }),
      expect.objectContaining({ entry: 'second-pass-project-awareness-specialized-scoring' }),
      expect.objectContaining({ entry: 'second-pass-project-state-cue-merge' }),
      expect.objectContaining({ entry: 'second-pass-project-state-detached-status-shell-guard' }),
      expect.objectContaining({ entry: 'second-pass-project-state-landed-open-guidance' }),
      expect.objectContaining({ entry: 'second-pass-emotional-closure-guidance' }),
      expect.objectContaining({ entry: 'second-pass-durable-outward-continuity-guidance' }),
      expect.objectContaining({ entry: 'second-pass-transport-failure-same-her-self-line' }),
      expect.objectContaining({ entry: 'second-pass-transport-failure-callback-project-awareness' }),
      expect.objectContaining({ entry: 'second-pass-transport-failure-callback-next-closure-target-carry' }),
      expect.objectContaining({ entry: 'second-pass-corrected-same-person-rewrite-guidance' }),
      expect.objectContaining({ entry: 'second-pass-resume-confirmation-boundary-rewrite-guidance' }),
      expect.objectContaining({ entry: 'settlement-runtime-derived-project-audit' }),
      expect.objectContaining({ entry: 'settlement-critic-forced-same-her-precedence' }),
      expect.objectContaining({ entry: 'settlement-companion-headline-project-awareness' }),
      expect.objectContaining({ entry: 'settlement-thin-shell-explicit-fields' }),
      expect.objectContaining({ entry: 'settlement-callback-specific-project-awareness' }),
      expect.objectContaining({ entry: 'settlement-corrected-same-person-promotion' }),
      expect.objectContaining({ entry: 'settlement-corrected-same-person-authority' }),
      expect.objectContaining({ entry: 'settlement-generic-same-her-reanchor' }),
      expect.objectContaining({ entry: 'settlement-relationship-truth-doctrine-summary' }),
      expect.objectContaining({ entry: 'settlement-repair-before-closeness-closure-summary' }),
      expect.objectContaining({ entry: 'settlement-rest-protective-closure-summary' }),
      expect.objectContaining({ entry: 'settlement-prepared-continuity-authority-precedence' }),
      expect.objectContaining({ entry: 'settlement-fresher-runtime-awareness-precedence' }),
      expect.objectContaining({ entry: 'settlement-fuller-project-phase-awareness-precedence' }),
      expect.objectContaining({ entry: 'settlement-richer-carried-project-audit-precedence' }),
      expect.objectContaining({ entry: 'settlement-richer-chinese-awareness-precedence' }),
      expect.objectContaining({ entry: 'settlement-chinese-phase1-reminder-shell-non-precedence' }),
      expect.objectContaining({ entry: 'settlement-chinese-same-digital-life-reminder-shell-non-precedence' }),
      expect.objectContaining({ entry: 'settlement-answer-before-remember-chinese-awareness-precedence' }),
      expect.objectContaining({ entry: 'settlement-stronger-living-self-line-precedence' }),
      expect.objectContaining({ entry: 'settlement-ordinary-continuation-phase1-awareness-precedence' }),
      expect.objectContaining({ entry: 'settlement-same-phase-inward-carry-visible' }),
      expect.objectContaining({ entry: 'settlement-explicit-phase1-same-her-authority' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the final visible-reply project-awareness claim to current tests instead of only broader downstream-reply prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes the current boundary explicit: final visible-reply gating now has dedicated project-awareness proof, but full long-run same-her closure is still open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const auditSource = readFileSync(new URL('../../../../../../docs/project-state-audit.md', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Downstream reply shaping preserves same-her project awareness instead of washing it out.')
    expect(matrixSource).toContain('visible-reply-final-project-awareness-audit.test.ts')
    expect(auditSource).toContain('visible-reply-final-project-awareness-audit.test.ts')
    expect(matrixSource).toContain('generic final same-her shells back to the canonical same living self line')
    expect(auditSource).toContain('generic final same-her shells back to the canonical same living self line')
    expect(auditSource).toMatch(/still not fully closed|still not full Phase 1 closure|still .*fully sustained noisy-desktop convergence/i)
  })
})
