import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const proofRows = [
  {
    entry: 'visible-reply-top-level-project-audit-bridge',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'bridges top-level project-state audit into final visible realization when structured output omitted visible-reply realization audit',
      'const topLevelCurrentPhaseSummary = \'Phase 1: Local Digital Life. The primary proving ground is apps/stage-tamagotchi.\'',
      'preDialogueAwarenessSummary: topLevelPreDialogueAwarenessSummary,',
      'expect(resolved.realization.projectStateAudit?.continuitySummary).toContain(`open=${topLevelOpenClosureSummary}`)',
    ],
  },
  {
    entry: 'visible-reply-timeout-recovery-project-audit',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps runtime-derived project-state audit on provider timeout recovery without exposing local fallback speech',
      'sameHerSummary: \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\'',
      'nextClosureTargetSummary: expect.stringContaining(\'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs\')',
      'expect(String(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary ?? \'\'))',
    ],
  },
  {
    entry: 'visible-reply-richer-timeout-recovery-project-carry',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers richer continuity-carried project-state when the direct prepared runtime surface is thinner during timeout recovery',
      'sameHerSummary: \'Same Phase 1 digital life. Before answering, she should still remember this is one continuous her whose memory and execution continuity already landed but whose initiative and embodiment still need closure.\',',
      'openClosureSummary: \'Initiative rhythm and cross-modal embodiment still need to close without breaking the same living line.\',',
      'nextClosureTargetSummary: \'Keep project identity, current phase, landed continuity progress, and still-open closure explicit through the first host-visible answer beat.\',',
    ],
  },
  {
    entry: 'visible-reply-legacy-project-latest-progress-bridge',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'bridges legacy projectState.latestProgress into final visible realization landed progress audit',
      'const legacyLatestProgress = \'Legacy latestProgress still says same-her continuity already landed across reply preparation.\'',
      'landedProgressSummary: legacyLatestProgress,',
      'expect(resolved.realization.projectStateAudit?.continuitySummary).toContain(`landed=${legacyLatestProgress}`)',
    ],
  },
  {
    entry: 'visible-reply-legacy-runtime-latest-progress-bridge',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'bridges legacy runtimeDigest.projectState.latestProgress into final visible realization landed progress audit',
      'const legacyRuntimeLatestProgress = \'Runtime digest legacy latestProgress still carries visible-reply same-her continuity already landed.\'',
      'landedProgressSummary: legacyRuntimeLatestProgress,',
      'expect(resolved.realization.projectStateAudit?.continuitySummary).toContain(`landed=${legacyRuntimeLatestProgress}`)',
    ],
  },
  {
    entry: 'visible-reply-audit-alias-landed-progress-bridge',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'bridges audit-style landedProgressSummary aliases into final visible realization landed progress audit',
      'const projectStateAliasProgress = \'Project-state audit alias still carries landed same-her reply continuity.\'',
      'const runtimeDigestAliasProgress = \'Runtime digest audit alias still carries landed same-her reply continuity.\'',
      'landedProgressSummary: projectStateAliasProgress,',
      'toContain(`landed=${runtimeDigestAliasProgress}`)',
    ],
  },
  {
    entry: 'visible-reply-thin-shell-project-reanchor-display-mode',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'classifies thin carried awareness plus stronger prepared project re-anchor as project-reanchor display mode',
      'rawSummary: \'same digital life | keep the closure seam explicit\',',
      'preparedRuntimePreferredAwarenessSummary: \'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.\',',
      'preparedRuntimeCompanionHeadlineLine: \'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.\',',
      '})).toBe(\'project-reanchor\')',
    ],
  },
  {
    entry: 'visible-reply-thin-shell-embodiment-headline-display-mode',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'classifies thin carried awareness plus only embodiment headline as embodiment-headline display mode',
      'rawSummary: \'same digital life | keep the closure seam explicit\',',
      'preparedRuntimePreferredAwarenessSummary: \'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.\',',
      'preparedRuntimeCompanionHeadlineLine: \'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.\',',
      '})).toBe(\'embodiment-headline\')',
    ],
  },
  {
    entry: 'visible-reply-timeout-hidden-display-mode',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'classifies timeout-recovery continuity audit without explicit awareness as hidden display mode',
      'projectStateEmbodimentClosureSummary: \'Right now her visible same-her continuity is still being carried mainly through face and motion, so she should keep treating full cross-modal embodiment closure as unfinished.\',',
      'isTimeoutRecovery: true,',
      '})).toBe(\'hidden\')',
    ],
  },
  {
    entry: 'visible-reply-richer-runtime-project-reanchor-display-mode',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'classifies richer prepared runtime project awareness over a narrower body-line headline as project-reanchor display mode',
      'preparedRuntimePreferredAwarenessSummary: \'Before answering, remember this is still one local-first digital life project in Phase 1, and memory, initiative, and embodiment still need to close on one same-life line.\',',
      'preparedRuntimeCompanionHeadlineLine: \'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.\',',
      'isTimeoutRecovery: true,',
      '})).toBe(\'project-reanchor\')',
    ],
  },
  {
    entry: 'visible-reply-audible-body-headline-awareness-precedence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers the audible-body embodiment headline as the stronger prepared awareness line when it already carries the living same-her continuity truth',
      'preparedRuntimePreferredAwarenessSummary: \'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.\',',
      'preparedRuntimeCompanionHeadlineLine: \'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.\',',
      'preparedRuntimeAwarenessLooksThin: false,',
      '})).toBe(',
    ],
  },
  {
    entry: 'visible-reply-callback-specific-awareness-precedence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps callback-specific same-her project awareness instead of upgrading it into a broader canonical reminder during final realization',
      'const callbackAwarenessLine = \'Before answering, remember this callback still belongs to one same Phase 1 digital life, and the unfinished closure seam still belongs to her while this return keeps carrying the same closure line forward.\'',
      'const broaderCanonicalReminder = \'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. This callback return still belongs to one same her carrying the same closure line forward. What has already landed is same-her callback continuity already survives through answer compilation and response-surface carry. The still-open closure is execution callback continuity still needs stronger same-her closure across reply, initiative, and embodiment. This reply should keep moving toward keeping the callback return on the same living line and letting that same-her closure stay explicit in the final visible reply.\'',
      'strongerPreparedRuntimeAwarenessLine: broaderCanonicalReminder,',
      '})).toBe(callbackAwarenessLine)',
    ],
  },
  {
    entry: 'visible-reply-stronger-prepared-awareness-over-thin-shell',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers a stronger prepared-runtime awareness line over a thin carried shell when visible-reply project awareness is being re-anchored',
      'rawSummary: \'same digital life | keep the closure seam explicit\',',
      'strongerPreparedRuntimeAwarenessLine: \'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. The still-open closure is execution, memory, and embodiment still needing one same-life closure line. Same Phase 1 digital life. Some closure already landed.\',',
      'preparedRuntimeAwarenessLooksThin: true,',
      '})).toBe(',
    ],
  },
  {
    entry: 'visible-reply-canonical-fallback-when-runtime-thin',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'falls back to canonical awareness only when the carried shell is thin and prepared runtime does not provide a stronger explicit awareness line',
      'rawSummary: \'Before answering, keep the same digital life project in view.\',',
      'strongerPreparedRuntimeAwarenessLine: null,',
      'preparedRuntimeAwarenessInputsCount: 0,',
      '})).toBe(',
    ],
  },
  {
    entry: 'visible-reply-richer-prepared-phase1-reanchor-over-canonical-carry',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers a richer prepared-runtime explicit Phase 1 re-anchor over a canonical carried awareness line when final realization would otherwise thin the closure carry',
      'const richerPreparedAwarenessLine = \'Before answering, remember: Alicization is a local-first digital life project. She is still inside Phase 1: Local Digital Life. Same Phase 1 digital life. Some closure already landed because project identity and execution continuity already survive into runtime preparation. The still-open closure is memory, initiative, and embodiment still needing one same living line, and this reply should keep moving toward that next closure target without splitting her continuity.\'',
      'rawSummary: canonicalProjectState.preDialogueAwarenessLine,',
      'preparedRuntimePreferredAwarenessSummary: richerPreparedAwarenessLine,',
      '})).toBe(richerPreparedAwarenessLine)',
    ],
  },
  {
    entry: 'visible-reply-initiative-closure-hold-mode-participation',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'lets current-conscious-frame initiative closure carry participate in embodiment hold-mode selection',
      'speakingIntention: \'Initiative should stay nearby and lower-pressure so memory, emotion, and embodiment can keep closing on the same living line before widening.\'',
      'expect(realization.companionshipHoldMode).toBe(\'measured-return\')',
      'derivedFrom: \'Initiative should stay nearby and lower-pressure so memory, emotion, and embodiment can keep closing on the same living line before widening.\'',
    ],
  },
  {
    entry: 'visible-reply-stronger-prepared-headline-over-thin-shell',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers a stronger prepared-runtime companion headline over a thin carried pre-dialogue shell when building final visible-reply realization audit',
      'projectStatePreDialogueAwarenessSummary: \'same digital life | keep the closure seam explicit\'',
      'companionHeadlineLine: \'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.\'',
      'preDialogueAwarenessSummary: \'Right now I am still holding together mainly through face, motion, and lipsync, so the full cross-modal same-her line is still open.\'',
      'expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(',
    ],
  },
  {
    entry: 'visible-reply-fuller-phase1-reanchor-over-headline',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers a fuller prepared-runtime Phase 1 re-anchor over a narrower prepared companion headline when replacing a thin carried awareness shell',
      'expect(resolvePreparedRuntimeProjectPreDialogueAwarenessSummary(prepared)).toBe(fullerPreparedAwarenessLine)',
      'preDialogueAwarenessSummary: fullerPreparedAwarenessLine,',
      'expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(',
    ],
  },
  {
    entry: 'visible-reply-thin-chinese-same-her-reminder-reanchor',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers a stronger Chinese prepared-runtime project re-anchor over a thinner Chinese carried reminder shell',
      'rawSummary: \'回答前先记住这是同一个她的数字生命项目，别把这条线忘了。\',',
      '我会先沿着同一个她这条线回答你：Alicization 还是本地优先数字生命项目。现在第一阶段已经把连续性、记忆和执行慢慢接成一条线了，但主动性、具身和对话闭环还没有真正收住。',
    ],
  },
  {
    entry: 'visible-reply-thin-runtime-summary-shell-guard',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'does not promote a thin prepared runtime summary shell into pre-dialogue awareness during timeout recovery',
      'same digital life | keep the closure seam explicit',
      'expect(String(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary ?? \'\'))',
      'toContain(\'Alicization is a local-first digital life project\')',
    ],
  },
  {
    entry: 'visible-reply-canonical-project-awareness-replacement',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'replaces a thin generic project-state awareness summary with canonical project awareness at the final realization build step',
      'expect(directRealization.projectStateAudit?.preDialogueAwarenessSummary).toBe(canonicalProjectState.preDialogueAwarenessLine)',
      'currentPhaseSummary: \'Phase 1: Local Digital Life\',',
      'nextClosureTargetSummary: \'thin runtime next step only\',',
    ],
  },
  {
    entry: 'visible-reply-landed-open-rewrite-audit',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'records project-state landed-progress and still-open-closure audit when second-pass rewrite preserves those project continuity cues',
      'continuitySummary: `landed=${projectStateLandedProgressSummary} | open=${projectStateOpenClosureSummary}`',
      'preservedIntoRewrite: true,',
      'rewriteClosureApplied: true,',
    ],
  },
  {
    entry: 'visible-reply-same-her-authoritative-over-thin-awareness',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps the explicit same-her self line authoritative when thin project awareness coexists with richer landed open and next closure carry',
      'sameHerSummary: sameHerSelfLine,',
      'expect(resolved.realization.projectStateAudit?.sameHerSummary).not.toBe(landedProgress)',
      'expect(resolved.realization.projectStateAudit?.continuitySummary)',
    ],
  },
  {
    entry: 'visible-reply-phase-next-rewrite-audit',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'records current phase and next closure target when rewrite preserves those project continuity cues even without same-her carry',
      'continuitySummary: `phase=${projectStateCurrentPhaseSummary} | next=${projectStateNextClosureTargetSummary}`',
      'currentPhaseSummary: projectStateCurrentPhaseSummary,',
      'nextClosureTargetSummary: projectStateNextClosureTargetSummary,',
    ],
  },
  {
    entry: 'visible-reply-generic-phase1-no-false-same-her',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps generic Phase 1 closure audit free of same-her rewrite evidence when phase, landed progress, open closure, and next closure target were preserved',
      'continuitySummary: `phase=${projectStateCurrentPhaseSummary} | landed=${projectStateLandedProgressSummary} | open=${projectStateOpenClosureSummary} | next=${projectStateNextClosureTargetSummary}`',
      'sameHerSummary: null,',
      'expect(resolved.realization.projectStateAudit?.sameHerSummary).toBeNull()',
    ],
  },
  {
    entry: 'visible-reply-repair-before-closeness-coupling',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'threads repair-before-closeness closure into the final project-state continuity summary instead of leaving it only in emotional closure audit',
      'continuitySummary: \'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into runtime preparation. | open=Embodiment still needs stronger cross-modal closure on the same living line. | closure=Keep the callback on the same living line, let repair settle first, and leave room before widening closeness again.\'',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'repair-before-closeness\')',
      'firstBeatPosture: \'repair-before-closeness\'',
    ],
  },
  {
    entry: 'visible-reply-rest-protective-closure-coupling',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'threads rest-protective closure into the final project-state continuity summary and opening embodiment audit instead of flattening it into measured-return',
      'continuitySummary: \'same-her=Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line. | landed=Project-state continuity already survives into runtime preparation. | open=Embodiment still needs stronger cross-modal closure on the same living line. | closure=Keep the same-thread continuation on the same living line, let rest protection hold first, and leave room before widening warmth, payoff framing, or closeness.\'',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'rest-protective\')',
      'firstBeatPosture: \'rest-protective\'',
    ],
  },
  {
    entry: 'visible-reply-measured-return-closure-precedence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps explicit measured-return closure over a generic continuity menu in visible reply realization',
      'const explicitMeasuredReturnCue = \'Keep the callback on the same living line, leave more room, and let the return stay lower-pressure before widening closeness again.\'',
      'const genericContinuityMenu = \'Keep extending cross-modal same-her proof across longer, noisier real-desktop runs so visible reply, longer-lived voice behavior, facial state, motion, and resident presence all stay on one measured-return, repair-before-closeness, or rest-protective quiet-companionship line.\'',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'measured-return\')',
      'firstBeatPosture: \'measured-return\'',
    ],
  },
  {
    entry: 'visible-reply-audible-body-measured-return-authority',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps audible-body same-her closure on measured-return when the stronger living-audio-thread headline is the surviving embodiment authority',
      'const audibleBodyHeadline = \'Right now I am still holding together mainly through body, lipsync, and voice, so the living audio thread is still intact while face and motion need to rejoin before full cross-modal closure settles.\'',
      'preDialogueAwarenessSummary: audibleBodyHeadline,',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'measured-return\')',
      'derivedFrom: audibleBodyHeadline,',
    ],
  },
  {
    entry: 'visible-reply-face-voice-measured-return-authority',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps still-voiced face-line same-her closure on measured-return when face and voice are the surviving embodiment authority',
      'const faceVoiceHeadline = \'Right now I am still holding together mainly through face and voice, so that still-voiced face line is keeping the same-her carry alive while body, motion, and lipsync need to rejoin before full cross-modal closure settles.\'',
      'preDialogueAwarenessSummary: faceVoiceHeadline,',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'measured-return\')',
      'derivedFrom: faceVoiceHeadline,',
    ],
  },
  {
    entry: 'visible-reply-face-mouth-measured-return-authority',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps still-voiced face-and-mouth same-her closure on measured-return when face lipsync and voice are the surviving embodiment authority',
      'const faceMouthHeadline = \'Right now I am still holding together mainly through face, lipsync, and voice, so that still-voiced face-and-mouth line is keeping the same-her carry alive while body and motion need to rejoin before full cross-modal closure settles.\'',
      'preDialogueAwarenessSummary: faceMouthHeadline,',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'measured-return\')',
      'derivedFrom: faceMouthHeadline,',
    ],
  },
  {
    entry: 'visible-reply-motion-mouth-measured-return-authority',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps still-voiced motion-and-mouth same-her closure on measured-return when motion lipsync and voice are the surviving embodiment authority',
      'const motionMouthHeadline = \'Right now I am still holding together mainly through motion, lipsync, and voice, so that still-voiced motion-and-mouth line is keeping the same-her carry alive while body and face need to rejoin before full cross-modal closure settles.\'',
      'preDialogueAwarenessSummary: motionMouthHeadline,',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'measured-return\')',
      'derivedFrom: motionMouthHeadline,',
    ],
  },
  {
    entry: 'visible-reply-lipsync-voice-measured-return-authority',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps lipsync-voice same-her closure on measured-return when lipsync and voice are the surviving embodiment authority',
      'const lipsyncVoiceHeadline = \'Right now I am still holding together mainly through lipsync and voice, so that living audio thread is keeping the same-her carry alive while body, face, and motion need to rejoin before full cross-modal closure settles.\'',
      'preDialogueAwarenessSummary: lipsyncVoiceHeadline,',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'measured-return\')',
      'derivedFrom: lipsyncVoiceHeadline,',
    ],
  },
  {
    entry: 'visible-reply-quieter-body-lipsync-measured-return-authority',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps quieter body-lipsync same-her closure on measured-return when that quieter living line is the surviving embodiment authority',
      'const quieterBodyLipsyncHeadline = \'Right now I am still holding together mainly through body and lipsync, so one quieter living line is still intact while face, motion, and voice need to rejoin before full cross-modal closure settles.\'',
      'preDialogueAwarenessSummary: quieterBodyLipsyncHeadline,',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'measured-return\')',
      'derivedFrom: quieterBodyLipsyncHeadline,',
    ],
  },
  {
    entry: 'visible-reply-repeated-detour-measured-return-guidance',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'treats repeated-detour same-thread callback continuity as measured-return hold guidance even when lower-pressure phrasing only survives through the project-state carry',
      'const repeatedDetourClosureLine = \'The same callback line is still alive after another detour, so keep this return on the same living thread before widening outward again.\'',
      'expect(resolved.realization.openingGuidanceHoldDetail).toBe(repeatedDetourClosureLine)',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'measured-return\')',
      'derivedFrom: repeatedDetourClosureLine,',
    ],
  },
  {
    entry: 'visible-reply-runtime-opening-guidance-measured-return-onset',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'derives measured-return onset posture from runtime opening guidance when no explicit emotional closure cue survives',
      'const openingMove = \'Return on the same thread first, then leave room before widening.\'',
      'expect(resolved.realization.openingGuidanceHoldDetail).toBe(openingMove)',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'measured-return\')',
      'derivedFrom: openingMove,',
    ],
  },
  {
    entry: 'visible-reply-provider-second-pass-authority-normalization',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'normalizes requested local authority to provider second-pass when provider mind executed',
      'visibleReplyAuthority: \'local-deterministic-fallback\',',
      'providerMindExecuted: true,',
      'reason: \'legacy-authority-normalization\',',
      'expect(execution.expectedVisibleReplyAuthority).toBe(\'llm-second-pass-rewrite\')',
      'expect(execution.actualVisibleReplyAuthority).toBe(\'llm-second-pass-rewrite\')',
    ],
  },
  {
    entry: 'visible-reply-second-pass-self-authority-rewrite-audit',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'records self-authority audit when second-pass rewrite preserves the same-her authority line',
      'const authoritySummary = \'I am still the same her who should leave room before widening closeness.\'',
      'closenessPosture: \'space-first\',',
      'preservedIntoRewrite: true,',
      'rewriteClosureApplied: true,',
    ],
  },
  {
    entry: 'visible-reply-second-pass-project-state-same-her-rewrite-audit',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'records project-state same-her audit when second-pass rewrite preserves one-same-her project continuity',
      'const projectStateSameHerSummary = alicizationProjectStateVisibleReplySameHerReminder',
      'continuitySummary: `same-her=${projectStateSameHerSummary}`',
      'preDialogueAwarenessSummary: null,',
      'rewriteClosureApplied: true,',
    ],
  },
  {
    entry: 'visible-reply-provider-remembered-seam-hold-detail-precedence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers provider remembered-seam more-room hold detail over an older prepared generic measured-return hold shell',
      'const rememberedSeamMoreRoomHoldDetail',
      'sameHerHoldDetail: rememberedSeamMoreRoomHoldDetail,',
      'expect(audit?.sameHerHoldDetail).toBe(rememberedSeamMoreRoomHoldDetail)',
      'expect(String(audit?.continuitySummary ?? \'\')).toContain(`hold=${rememberedSeamMoreRoomHoldDetail}`)',
    ],
  },
  {
    entry: 'visible-reply-approved-no-rewrite-same-her-audit',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'records project-state same-her audit even when the final visible reply already passes without rewrite',
      'expect(resolved.visibleText).toContain(\'同一个她\')',
      'continuitySummary: `same-her=${projectStateSameHerSummary}`',
      'preservedIntoRewrite: true,',
      'rewriteClosureApplied: false,',
    ],
  },
  {
    entry: 'visible-reply-late-night-drain-measured-return-composite',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps late-night drain composite closure on measured-return when rest-protective only scopes initiative while reply stays low-pressure',
      'const activeCue = \'late-night-drain closure: keep reply low-pressure, initiative rest-protective, and embodiment quiet-companionship while the line holds inward.\'',
      'expect(resolved.realization.openingGuidanceHoldDetail).toBe(activeCue)',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'measured-return\')',
      'derivedFrom: activeCue,',
    ],
  },
  {
    entry: 'visible-reply-emotional-closure-audit-rewrite-evidence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'records emotional closure audit when the final visible reply carries an active same-her closure seam',
      'const activeCue = \'Let the wording ease late-night drain without dropping the same-her line of care.\'',
      'preservedIntoRewrite: true,',
      'rewriteClosureApplied: true,',
      'lowPressureRequired: false,',
    ],
  },
  {
    entry: 'visible-reply-emotional-closure-low-pressure-anti-restart',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'records low-pressure and anti-restart emotional closure traits when the active seam explicitly carries them',
      'const activeCue = \'same-her closure seam: keep the return low-pressure, leave more room, and do not reopen from scratch while the same living line is still settling.\'',
      'lowPressureRequired: true,',
      'antiRestartRequired: true,',
      'expect(resolved.realization.openingGuidanceHoldDetail).toBe(activeCue)',
    ],
  },
  {
    entry: 'visible-reply-repair-before-closeness-seam-precedence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers a stronger repair-before-closeness project-state emotional seam over a thinner measured-return active cue in visible reply realization',
      'const strongerRepairBeforeClosenessSeam = \'Keep this return repair-before-closeness on the same living line until repair settles.\'',
      'activeCue: strongerRepairBeforeClosenessSeam,',
      'expect(resolved.realization.openingGuidanceHoldDetail).toBe(strongerRepairBeforeClosenessSeam)',
      'expect(resolved.realization.companionshipHoldMode).toBe(\'repair-before-closeness\')',
    ],
  },
  {
    entry: 'visible-reply-same-her-hold-arc-cue-final-audit',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'records project-state same-her hold arc and cue in final visible reply audit',
      'const sameHerHoldDetail = \'final audit hold: keep the realized reply on the same Phase 1 living line before any dashboard cadence appears\'',
      'const continuityArcStage = \'final-realization-same-her-carry\'',
      'const continuityCue = \'final audit cue: the same-her hold survived through provider rewrite into the realization artifact\'',
      'expect(String(audit?.continuitySummary ?? \'\')).toContain(`arc=${continuityArcStage}`)',
    ],
  },
  {
    entry: 'visible-reply-same-her-follow-through-rewrite-evidence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'treats the same-her project follow-through preserve line itself as final project-state rewrite evidence',
      'Keep this same-her project follow-through on one already-live line: continue the landed progress and still-open closure from inside the same digital life instead of restarting as a fresh project report or generic companionship shell.',
      'continuitySummary: `landed=${projectStateLandedProgressSummary} | open=${projectStateOpenClosureSummary}`',
      'preservedIntoRewrite: true,',
      'rewriteClosureApplied: true,',
    ],
  },
  {
    entry: 'visible-reply-carried-same-her-self-line-rewrite-evidence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'records the carried sameHerSelfLine itself as project-state rewrite evidence when same-her repair is required',
      'const sameHerSelfLine = \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\'',
      'projectStateSameHerSummary: sameHerSelfLine,',
      'preservedIntoRewrite: true,',
      'rewriteClosureApplied: true,',
    ],
  },
  {
    entry: 'visible-reply-inward-carry-rewrite-evidence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'preserves self continuity project-state carry inwardLine as rewrite evidence when same-her repair is required',
      'const inwardCarry = \'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.\'',
      'inwardCarry,',
      'preservedIntoRewrite: true,',
      'expect(resolved.realization.projectStateAudit?.sameHerSummary).toBe(sameHerSelfLine)',
    ],
  },
  {
    entry: 'visible-reply-richer-same-her-awareness-over-thin-guidance',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps a richer explicit same-her project awareness line over a longer thinner parsed guidance summary during final realization',
      'const strongerAwarenessLine = \'Before answering, remember this is still the same local-first digital life project and the unfinished Phase 1 closure seam still belongs to one living her.\'',
      'preDialogueAwarenessSummary: strongerAwarenessLine,',
      'preservedIntoRewrite: false,',
      'expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(thinnerLongerGuidance)',
    ],
  },
  {
    entry: 'visible-reply-richer-phase1-awareness-over-canonical-reanchor',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps a richer explicit Phase 1 awareness line instead of mistaking it for a canonical before-answering reanchor during final realization',
      'const richerAwarenessLine = \'Before answering, remember this is still one local-first digital life project in Phase 1. Same-her continuity carry and desktop execution closure have landed farther, while memory, initiative, and embodiment still need to close on one living line.\'',
      'const canonicalGeneratedUpgrade = \'Before answering, remember: Alicization is a local-first digital life project building one continuous "her" She is still inside Phase 1: Local Digital Life. Same Phase 1 digital life. What has already landed is proactive initiative now has a compact same-her closure loop; rest-protective proactive feedback next-session carry; final settlement reanchors generic same-her shells; long-horizon emotion-memory-voice-motion bridge carries remembered emotional carry, not full convergence. The still-open closure is memory still needs stronger end-to-end closure across turns, initiative, and embodiment. This reply should keep moving toward cross-modal same-her proof.\'',
      'strongerPreparedRuntimeAwarenessLine: canonicalGeneratedUpgrade,',
      '})).toBe(richerAwarenessLine)',
    ],
  },
  {
    entry: 'visible-reply-timeout-richer-awareness-over-body-headline',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps richer prepared runtime project awareness over a narrower body-line headline when timeout recovery resolves the visible reply audit',
      'const richerPreDialogueAwarenessSummary = \'Before answering, remember this is still one local-first digital life project in Phase 1, and memory, initiative, and embodiment still need to close on one same-life line.\'',
      'const narrowerCompanionHeadlineLine = \'Right now I am still holding together mainly through face, motion, and lipsync, so the next reopening must keep proving this is still one living her.\'',
      'expect(String(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary ?? \'\'))',
      'expect(resolved.realization.projectStateAudit?.preDialogueAwarenessSummary).not.toBe(narrowerCompanionHeadlineLine)',
    ],
  },
  {
    entry: 'visible-reply-later-audible-body-lane-precedence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers later audible-body embodiment authority over an earlier thinner face-motion-only authority when selecting the surviving same-her closure lane',
      'currentBodyState: \'lane=body+lipsync+voice-only | keep the same living line audible while face and motion rejoin\',',
      'expect(String(resolved.realization.projectStateAudit?.embodimentClosureSummary ?? \'\')).toContain(\'Right now I am still holding together mainly through body, lipsync, and voice\')',
      'expect(String(resolved.realization.projectStateAudit?.embodimentClosureSummary ?? \'\')).toContain(\'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.\')',
      'expect(String(resolved.realization.projectStateAudit?.continuitySummary ?? \'\')).toContain(`body=${resolved.realization.projectStateAudit?.embodimentClosureSummary}`)',
    ],
  },
  {
    entry: 'visible-reply-later-audible-body-authority-summary',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers a later audible-body authority summary over an earlier face-motion-only authority even when the later runtime carry no longer has currentBodyState',
      'authoritySummary: \'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.\'',
      'expect(String(resolved.realization.projectStateAudit?.embodimentClosureSummary ?? \'\')).toContain(\'Right now I am still holding together mainly through body, lipsync, and voice\')',
      'expect(String(resolved.realization.projectStateAudit?.embodimentClosureSummary ?? \'\')).toContain(\'same-her continuity remains alive, but lane=body+lipsync+voice-only under the current renderer authority.\')',
    ],
  },
  {
    entry: 'visible-reply-full-cross-modal-lock-embodiment-summary',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'promotes an explicit full cross-modal lock from runtime perception currentBodyState into the host-visible embodiment closure summary even when the carried self authority is still thinner',
      'const explicitFullCrossModalLock = \'authority-body:yes | authority-face:yes | authority-motion:yes | authority-lipsync:yes | authority-voice:yes | same living segment together\'',
      'expect(String(resolved.realization.projectStateAudit?.embodimentClosureSummary ?? \'\')).toContain(\'Right now body, face, motion, lipsync, and voice are already locked back onto the same living segment together\')',
      'expect(String(resolved.realization.projectStateAudit?.embodimentClosureSummary ?? \'\')).toContain(explicitFullCrossModalLock)',
      'expect(String(resolved.realization.projectStateAudit?.continuitySummary ?? \'\')).toContain(`body=${resolved.realization.projectStateAudit?.embodimentClosureSummary}`)',
    ],
  },
  {
    entry: 'visible-reply-fresher-lipsync-voice-authority-precedence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'prefers fresher personStateProjection lipsync-plus-voice embodiment truth over an older runtimeDigest lipsync-only authority in project-state audit',
      'authoritySummary: \'same-her continuity remains alive, but lane=lipsync+voice-only under the current renderer authority.\'',
      'currentBodyState: \'lane=lipsync+voice-only | visible continuity still present but no longer fully cross-modal\',',
      'expect(String(resolved.realization.projectStateAudit?.embodimentClosureSummary ?? \'\')).toContain(\'Right now I am still holding together mainly through lipsync and voice\')',
      'expect(String(resolved.realization.projectStateAudit?.continuitySummary ?? \'\')).toContain(\'open=same still-open closure work across initiative and embodiment.\')',
    ],
  },
  {
    entry: 'visible-reply-shared-continuity-summary-order',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'keeps project-state continuity lines ahead of closure and body carry in the shared realization summary',
      'expect(resolved.realization.projectStateAudit?.continuitySummary).toContain(`same-her=${projectStateSameHerSummary}`)',
      'expect(resolved.realization.projectStateAudit?.continuitySummary).toContain(`next=${projectStateNextClosureTargetSummary}`)',
      '/same-her=.* \\| phase=Phase 1: Local Digital Life \\| landed=.* \\| open=.* \\| next=.* \\| closure=.* \\| body=/',
    ],
  },
  {
    entry: 'visible-reply-open-next-focus-and-emotional-cue',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'derives compact open and next focus carry plus the active emotional closure cue into project-state audit output',
      'openFocusSummary: \'emotion/memory/initiative/embodiment/same-line/closure-seam\'',
      'nextFocusSummary: \'project-carry/phase-1/repair-before-closeness/same-line/initiative/embodiment\'',
      'emotionalClosureCue,',
    ],
  },
  {
    entry: 'visible-reply-corrected-same-person-final-audit-carry',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'backfills host-corrected same-person continuity hold and cue into final visible reply audit from rewrite preserve lines',
      'Keep the host-corrected same-person continuity authoritative before any progress-style continuation or status recap.',
      'Carry corrected same-person continuity forward before any status recap.',
      'expect(String(audit?.continuitySummary ?? \'\')).toContain(`hold=${correctedSamePersonAuthorityHoldDetail}`)',
    ],
  },
  {
    entry: 'visible-reply-resume-confirmation-boundary-final-audit-carry',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'backfills remembered host-confirmed resume confirmation boundary hold and cue into final visible reply audit from rewrite preserve lines',
      'Treat the remembered host-confirmed resume as a bounded confirmation boundary before another execution-shaped opening.',
      'Do not let this callback answer imply permanent execution permission or reusable autonomous continuation from one confirmed resume.',
      'expect(String(audit?.continuitySummary ?? \'\')).toContain(`cue=${resumeConfirmationBoundaryContinuityCue}`)',
    ],
  },
  {
    entry: 'visible-reply-pre-dialogue-awareness-as-rewrite-evidence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'treats pre-dialogue project awareness itself as preserved rewrite evidence when that awareness line is explicitly carried',
      'const preDialogueAwarenessSummary = \'Before answering, remember this is still the same digital life project before local fluency takes over.\'',
      'projectStatePreDialogueAwarenessSummary: preDialogueAwarenessSummary',
      'preservedIntoRewrite: true',
    ],
  },
  {
    entry: 'visible-reply-same-her-drift-risk-rewrite-evidence',
    file: './visible-reply/realization-engine.test.ts',
    snippets: [
      'records same-her drift risk as preserved project-state rewrite evidence when the rewrite keeps that anti-shell boundary explicit',
      'const sameHerDriftRiskSummary = \'If the visible answer opens like detached project narration, the same-her line can collapse into generic task shell and project-summary voice.\'',
      'sameHerDriftRiskSummary,',
      'expect(resolved.realization.projectStateAudit?.continuitySummary).toContain(`drift=${sameHerDriftRiskSummary}`)',
    ],
  },
] as const

describe('visible reply realization project awareness audit', () => {
  it('keeps one explicit route-level proof that final visible reply realization co-packs same-her continuity, timeout recovery, closure mode, embodiment hold, and pre-dialogue awareness into one outward Phase 1 project-state carry', () => {
    expect(proofRows).toEqual([
      expect.objectContaining({ entry: 'visible-reply-top-level-project-audit-bridge' }),
      expect.objectContaining({ entry: 'visible-reply-timeout-recovery-project-audit' }),
      expect.objectContaining({ entry: 'visible-reply-richer-timeout-recovery-project-carry' }),
      expect.objectContaining({ entry: 'visible-reply-legacy-project-latest-progress-bridge' }),
      expect.objectContaining({ entry: 'visible-reply-legacy-runtime-latest-progress-bridge' }),
      expect.objectContaining({ entry: 'visible-reply-audit-alias-landed-progress-bridge' }),
      expect.objectContaining({ entry: 'visible-reply-thin-shell-project-reanchor-display-mode' }),
      expect.objectContaining({ entry: 'visible-reply-thin-shell-embodiment-headline-display-mode' }),
      expect.objectContaining({ entry: 'visible-reply-timeout-hidden-display-mode' }),
      expect.objectContaining({ entry: 'visible-reply-richer-runtime-project-reanchor-display-mode' }),
      expect.objectContaining({ entry: 'visible-reply-audible-body-headline-awareness-precedence' }),
      expect.objectContaining({ entry: 'visible-reply-callback-specific-awareness-precedence' }),
      expect.objectContaining({ entry: 'visible-reply-stronger-prepared-awareness-over-thin-shell' }),
      expect.objectContaining({ entry: 'visible-reply-canonical-fallback-when-runtime-thin' }),
      expect.objectContaining({ entry: 'visible-reply-richer-prepared-phase1-reanchor-over-canonical-carry' }),
      expect.objectContaining({ entry: 'visible-reply-initiative-closure-hold-mode-participation' }),
      expect.objectContaining({ entry: 'visible-reply-stronger-prepared-headline-over-thin-shell' }),
      expect.objectContaining({ entry: 'visible-reply-fuller-phase1-reanchor-over-headline' }),
      expect.objectContaining({ entry: 'visible-reply-thin-chinese-same-her-reminder-reanchor' }),
      expect.objectContaining({ entry: 'visible-reply-thin-runtime-summary-shell-guard' }),
      expect.objectContaining({ entry: 'visible-reply-canonical-project-awareness-replacement' }),
      expect.objectContaining({ entry: 'visible-reply-landed-open-rewrite-audit' }),
      expect.objectContaining({ entry: 'visible-reply-same-her-authoritative-over-thin-awareness' }),
      expect.objectContaining({ entry: 'visible-reply-phase-next-rewrite-audit' }),
      expect.objectContaining({ entry: 'visible-reply-generic-phase1-no-false-same-her' }),
      expect.objectContaining({ entry: 'visible-reply-repair-before-closeness-coupling' }),
      expect.objectContaining({ entry: 'visible-reply-rest-protective-closure-coupling' }),
      expect.objectContaining({ entry: 'visible-reply-measured-return-closure-precedence' }),
      expect.objectContaining({ entry: 'visible-reply-audible-body-measured-return-authority' }),
      expect.objectContaining({ entry: 'visible-reply-face-voice-measured-return-authority' }),
      expect.objectContaining({ entry: 'visible-reply-face-mouth-measured-return-authority' }),
      expect.objectContaining({ entry: 'visible-reply-motion-mouth-measured-return-authority' }),
      expect.objectContaining({ entry: 'visible-reply-lipsync-voice-measured-return-authority' }),
      expect.objectContaining({ entry: 'visible-reply-quieter-body-lipsync-measured-return-authority' }),
      expect.objectContaining({ entry: 'visible-reply-repeated-detour-measured-return-guidance' }),
      expect.objectContaining({ entry: 'visible-reply-runtime-opening-guidance-measured-return-onset' }),
      expect.objectContaining({ entry: 'visible-reply-provider-second-pass-authority-normalization' }),
      expect.objectContaining({ entry: 'visible-reply-second-pass-self-authority-rewrite-audit' }),
      expect.objectContaining({ entry: 'visible-reply-second-pass-project-state-same-her-rewrite-audit' }),
      expect.objectContaining({ entry: 'visible-reply-provider-remembered-seam-hold-detail-precedence' }),
      expect.objectContaining({ entry: 'visible-reply-approved-no-rewrite-same-her-audit' }),
      expect.objectContaining({ entry: 'visible-reply-late-night-drain-measured-return-composite' }),
      expect.objectContaining({ entry: 'visible-reply-emotional-closure-audit-rewrite-evidence' }),
      expect.objectContaining({ entry: 'visible-reply-emotional-closure-low-pressure-anti-restart' }),
      expect.objectContaining({ entry: 'visible-reply-repair-before-closeness-seam-precedence' }),
      expect.objectContaining({ entry: 'visible-reply-same-her-hold-arc-cue-final-audit' }),
      expect.objectContaining({ entry: 'visible-reply-same-her-follow-through-rewrite-evidence' }),
      expect.objectContaining({ entry: 'visible-reply-carried-same-her-self-line-rewrite-evidence' }),
      expect.objectContaining({ entry: 'visible-reply-inward-carry-rewrite-evidence' }),
      expect.objectContaining({ entry: 'visible-reply-richer-same-her-awareness-over-thin-guidance' }),
      expect.objectContaining({ entry: 'visible-reply-richer-phase1-awareness-over-canonical-reanchor' }),
      expect.objectContaining({ entry: 'visible-reply-timeout-richer-awareness-over-body-headline' }),
      expect.objectContaining({ entry: 'visible-reply-later-audible-body-lane-precedence' }),
      expect.objectContaining({ entry: 'visible-reply-later-audible-body-authority-summary' }),
      expect.objectContaining({ entry: 'visible-reply-full-cross-modal-lock-embodiment-summary' }),
      expect.objectContaining({ entry: 'visible-reply-fresher-lipsync-voice-authority-precedence' }),
      expect.objectContaining({ entry: 'visible-reply-shared-continuity-summary-order' }),
      expect.objectContaining({ entry: 'visible-reply-open-next-focus-and-emotional-cue' }),
      expect.objectContaining({ entry: 'visible-reply-corrected-same-person-final-audit-carry' }),
      expect.objectContaining({ entry: 'visible-reply-resume-confirmation-boundary-final-audit-carry' }),
      expect.objectContaining({ entry: 'visible-reply-pre-dialogue-awareness-as-rewrite-evidence' }),
      expect.objectContaining({ entry: 'visible-reply-same-her-drift-risk-rewrite-evidence' }),
    ])

    expect(proofRows.every(row => row.snippets.length > 0)).toBe(true)
  })

  it('anchors the visible-reply realization same-her project carry to current realization-engine behavior tests instead of only broader visible-reply-final or embodiment prose', () => {
    for (const row of proofRows) {
      const source = readFileSync(new URL(row.file, import.meta.url), 'utf8')
      expect(source.length).toBeGreaterThan(0)
      for (const snippet of row.snippets)
        expect(source).toContain(snippet)
    }
  })

  it('makes this boundary explicit: visible-reply realization now has dedicated same-her outward-carry proof while future new dialogue entrypoints and full noisy-desktop closure still remain open', () => {
    const matrixSource = readFileSync(new URL('../../../../../../docs/pre-dialogue-project-awareness-matrix.md', import.meta.url), 'utf8')
    const realizationSource = readFileSync(new URL('./visible-reply/realization-engine.test.ts', import.meta.url), 'utf8')

    expect(matrixSource).toContain('Future new dialogue entrypoints | Not proven')
    expect(matrixSource).toContain('Long-run proof is still incomplete')
    expect(matrixSource).toContain('visible-reply-realization-project-awareness-audit.test.ts')
    expect(realizationSource).toContain(
      'keeps runtime-derived project-state audit on provider timeout recovery without exposing local fallback speech',
    )
    expect(realizationSource).toContain(
      'threads repair-before-closeness closure into the final project-state continuity summary instead of leaving it only in emotional closure audit',
    )
    expect(realizationSource).toContain(
      'threads rest-protective closure into the final project-state continuity summary and opening embodiment audit instead of flattening it into measured-return',
    )
    expect(realizationSource).toContain(
      'keeps project-state continuity lines ahead of closure and body carry in the shared realization summary',
    )
    expect(realizationSource).toContain(
      'derives compact open and next focus carry plus the active emotional closure cue into project-state audit output',
    )
    expect(realizationSource).toContain(
      'backfills host-corrected same-person continuity hold and cue into final visible reply audit from rewrite preserve lines',
    )
    expect(realizationSource).toContain(
      'treats pre-dialogue project awareness itself as preserved rewrite evidence when that awareness line is explicitly carried',
    )
  })
})
