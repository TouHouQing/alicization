import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionEvidencePanels } from './performance-visualizer-self-evolution-evidence'

const legacyNote = '身体连续性仍主要由身体线独自托住同一段 living segment，虽然显形层还没有稳定补回，但这条 same-her 生命线本身没有断。'

describe('performance visualizer self evolution evidence', () => {
  it('builds persona provenance and proactive action chain panels from inspector evidence', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      proactiveDecisionConsumptionSummary: {
        status: 'grounded',
        decisionMode: 'birth-anchored-restraint',
        dominantDrift: null,
        lines: [
          'decision-consumption: birth observe-first restraint became persona hover and runtime hold',
          'manifestation-consumption: silent-observe | attentive',
          'counterfactual-consumption: selected=hover | tradeoff=presence-before-commentary',
          'rejected-alternative: speak stayed rejected because Current persona bias is observe-first, so speak breaks the preferred restraint posture.',
          'trust-meaning: trust deepens through steadiness before closeness',
        ],
      },
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        openingGuidance: 'Open by observing first and keep the approach lighter.',
        manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
        matchedSignals: [
          'identityKernel.relationshipPosture:observer',
          'identityKernel.initiativeStyle:observant',
          'initiativeBaseline.silenceReconnect:hold',
          'initiativeBaseline.comfortStyle:quiet-presence',
          'personStateProjection.preferredProactiveStyle:silent-observe',
          'personStateProjection.openingGuidance',
          'runtime.personaBias',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Consumed trace bundle personalityState identityKernel currently supports relationshipPosture=observer and initiativeStyle=observant.',
          'Consumed trace bundle initiativeBaseline currently supports silenceReconnect=hold and comfortStyle=quiet-presence.',
          'Consumed trace bundle personStateProjection currently supports preferredProactiveStyle=silent-observe and the current opening guidance.',
          'Runtime initiative personaBias matches the consumed trace bundle, so the current proactive restraint still resolves from the initialized persona baseline.',
        ],
      },
      proactiveActionChain: {
        status: 'grounded',
        personaPreferredAction: 'hover',
        runtimeSelectedAction: 'hold',
        runtimeShouldSpeak: false,
        openingGuidance: 'Open by observing first and keep the approach lighter.',
        openingGuidanceHoldReason: 'opening-guidance:observe-first',
        matchedSignals: [
          'persona-preferred-action:hover',
          'runtime-selected-action:hold',
          'runtime-shouldSpeak:false',
          'opening-guidance:observe-first',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Persona bias currently points toward an observe-first move, so hover/hold is the expected proactive posture.',
          'Runtime initiative currently resolves to selectedAction=hold with shouldSpeak=false, which stays inside that observe-first posture.',
          'Latest drilled takeover audit confirms visible proactive speech was withheld by opening-guidance:observe-first.',
        ],
      },
      proactiveManifestationChain: {
        status: 'grounded',
        personaPreferredStyle: 'silent-observe',
        personaPreferredPresence: 'attentive',
        counterfactualStyle: 'silent-observe',
        counterfactualPresence: 'attentive',
        actionEcologyStyle: 'silent-observe',
        actionEcologyPresence: 'attentive',
        initiativePreferredStyle: 'silent-observe',
        initiativePreferredPresence: 'attentive',
        matchedSignals: [
          'persona-preferred-style:silent-observe',
          'counterfactual-style:silent-observe',
          'counterfactual-presence:attentive',
          'action-ecology-style:silent-observe',
          'action-ecology-presence:attentive',
          'initiative-preferred-style:silent-observe',
          'initiative-preferred-presence:attentive',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Persona bias currently points toward silent-observe with attentive presence, so a quiet accompanied manifestation is expected.',
          'Counterfactual deliberation, action ecology, and initiative all preserve the same style/presence chain, so the current manifestation still expresses the initialized persona posture.',
        ],
      },
      privateThoughtGovernanceChain: {
        status: 'grounded',
        privateThoughtStance: 'accompany',
        privateThoughtShouldSpeak: false,
        privateThoughtStyle: 'silent-observe',
        privateThoughtPresence: 'attentive',
        privateThoughtText: 'The thread is still warm, but presence fits better than words for one more breath.',
        visibleReplyRealizationReason: 'proactive-opening-guidance-violation:observe-first',
        visibleReplyBlockedReason: 'opening-guidance:observe-first',
        matchedSignals: [
          'private-thought-stance:accompany',
          'private-thought-shouldSpeak:false',
          'private-thought-style:silent-observe',
          'private-thought-presence:attentive',
          'private-thought-counterfactual:cf-hover',
          'visible-reply-blocked:opening-guidance:observe-first',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Private thought currently stays in accompany mode with shouldSpeak=false, so the inner line still matches the observe-first persona posture.',
          'The private thought style/presence still stays silent-observe with attentive presence, preserving the same manifestation posture chosen by initiative.',
          'Latest visible reply governance still blocks proactive wording by opening-guidance:observe-first, so the outer utterance gate is preserving the same restraint the inner line already holds.',
        ],
      },
      residentPerformanceProjection: {
        status: 'grounded',
        residentSource: 'main-runtime',
        residentEmbodiedPresence: 'attentive',
        residentStance: 'accompany',
        residentEmotionalTension: 'soft-covision',
        residentBaseEmotion: 'thinking',
        residentDelivery: 'gentle',
        residentEmphasis: 1,
        residentReasonTags: [
          'resident-performance',
          'watch:symbiotic-vision',
          'body:accompanying',
          'continuity:quiet-accompaniment',
          'presence:attentive',
          'stance:accompany',
          'tension:soft-covision',
          'thought:counterfactual:hover',
        ],
        matchedSignals: [
          'resident-source:main-runtime',
          'resident-presence:attentive',
          'resident-stance:accompany',
          'resident-tension:soft-covision',
          'resident-baseEmotion:thinking',
          'resident-delivery:gentle',
          'resident-reason:continuity:quiet-accompaniment',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Resident performance still publishes attentive/accompany/soft-covision, so the desk-presence output is preserving the same inner line carried by private thought.',
          'Resident performance currently lands on baseEmotion=thinking and delivery=gentle, which matches a quiet accompaniment posture rather than a speech-forward interruption.',
          'Published resident reason tags still include continuity:quiet-accompaniment, so the runtime is explicitly projecting long-line desktop companionship instead of a generic idle shell.',
        ],
      },
      embodimentOutputProjection: {
        status: 'grounded',
        projectedBodyState: 'accompanying',
        projectedContinuityMode: 'quiet-accompaniment',
        projectedFacialCue: 'focus',
        projectedActionCue: 'steady_focus',
        projectedBaseEmotion: 'thinking',
        projectedDelivery: 'gentle',
        residentSignature: 'main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
        matchedSignals: [
          'projected-body:accompanying',
          'projected-continuity:quiet-accompaniment',
          'projected-facialCue:focus',
          'projected-actionCue:steady_focus',
          'projected-baseEmotion:thinking',
          'projected-delivery:gentle',
          'projected-signature',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Current body state accompanying with continuity quiet-accompaniment means the desktop shell should stay in a long-line accompaniment posture instead of switching into a speech-forward state.',
          'Resident performance currently projects facialCue=focus and actionCue=steady_focus, so the visible face and motion should stay quietly attentive rather than escalate into interruption.',
          'The resident signature still binds symbiotic-vision, quiet-accompaniment, and thinking/gentle output into one projection, so the rendered presence remains the same person as the current inner line.',
        ],
      },
      rendererAuthorityProjection: {
        status: 'grounded',
        rendererTarget: 'vrm',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:yes',
        authorityMismatchSummary: null,
        matchedSignals: [
          'renderer-target:vrm',
          'runtime-body:settled',
          'runtime-continuity:ambient-covision',
          'runtime-emotion:tired',
          'runtime-delivery:gentle',
          'runtime-facialCue:focused',
          'runtime-actionCue:observe_focus',
          'playback-facialCue:focused',
          'playback-actionCue:observe_focus',
          'driver-faceCue:focused',
          'driver-actionCue:observe_focus',
          'authority-face:yes',
          'authority-motion:yes',
          'authority-lipsync:yes',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Runtime dynamics still publish focused/observe_focus with tired/gentle output, so the renderer runtime is carrying the same embodiment projection rather than inventing a separate shell state.',
          'Playback cue and driver execution both still consume focused and observe_focus, so the visible face and action are the same ones projected by the resident line.',
          'Authority matching remains face:yes motion:yes lipsync:yes on vrm, which shows the bound renderer segment is the one the desktop runtime actually executed.',
        ],
      },
      runtimeContinuityProjection: {
        status: 'grounded',
        bodyContinuityPhase: null,
        rendererRejoinSurfaceKey: null,
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: 'symbiotic-vision',
        transitionToWatchMode: 'recovering',
        transitionFromScenario: 'chat',
        transitionReason: 'host fatigue detected during late-night care',
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering', 'late-night-fatigue'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 无，实际执行 无，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-rest-1',
          'runtime-scenario:coding',
          'runtime-scene:coding',
          'transition-from:symbiotic-vision',
          'transition-to:recovering',
          'governor-drive:protect',
          'focus-belief:belief-rest-1',
          'trace-embodiment',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Runtime continuity still stays on thread runtime-thread-rest-1 with active-dialogue/coding context, so the rendered authority output is attached to an ongoing life situation instead of a detached animation shell.',
          'Recent transition still explains the move from symbiotic-vision to recovering because host fatigue detected during late-night care, which preserves a causal line between the prior scene and the current embodied posture.',
          'Trace embodiment summary still closes the same care/grounded-recall line, so renderer authority is part of one continuous person-state rather than a fresh isolated output.',
        ],
      },
      rejectedActionAlternatives: {
        status: 'grounded',
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        dominantTradeoff: 'presence-before-commentary',
        alternatives: [
          {
            optionId: 'cf-speak',
            action: 'speak',
            identityFit: 0.26,
            timingFitness: 0.38,
            score: 0.43,
            driftReason: 'Current persona bias is observe-first, so speak breaks the preferred restraint posture.',
            why: 'The knot looks local enough that specific speech now would help more than hovering.',
          },
          {
            optionId: 'cf-warn',
            action: 'warn',
            identityFit: 0.18,
            timingFitness: 0.29,
            score: 0.31,
            driftReason: 'Current persona bias is not guardian-care, so warn overstates urgency for this personality posture.',
            why: 'Care pressure has crossed the line where silence would feel like neglect.',
          },
        ],
        reasons: [
          'Counterfactual deliberation currently selected hover under the dominant tradeoff presence-before-commentary.',
          'Rejected alternatives are ordered by highest remaining score so you can see what the current persona posture declined next.',
        ],
      },
    })

    expect(panels).toEqual([
      {
        id: 'proactive-decision-consumption-summary',
        title: 'proactive decision consumption summary',
        lines: [
          'status: grounded',
          'decisionMode: birth-anchored-restraint',
          'dominantDrift: n/a',
          'lines: decision-consumption: birth observe-first restraint became persona hover and runtime hold, manifestation-consumption: silent-observe | attentive, counterfactual-consumption: selected=hover | tradeoff=presence-before-commentary, rejected-alternative: speak stayed rejected because Current persona bias is observe-first, so speak breaks the preferred restraint posture., trust-meaning: trust deepens through steadiness before closeness',
        ],
      },
      {
        id: 'persona-bias-provenance',
        title: 'persona bias provenance',
        lines: [
          'status: grounded',
          'relationshipPosture: observer',
          'initiativeStyle: observant',
          'silenceReconnect: hold',
          'comfortStyle: quiet-presence',
          'preferredProactiveStyle: silent-observe',
          'openingGuidance: Open by observing first and keep the approach lighter.',
          'manifestationCadenceSummary: persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
          'matchedSignals: identityKernel.relationshipPosture:observer, identityKernel.initiativeStyle:observant, initiativeBaseline.silenceReconnect:hold, initiativeBaseline.comfortStyle:quiet-presence, personStateProjection.preferredProactiveStyle:silent-observe, personStateProjection.openingGuidance, runtime.personaBias',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: Consumed trace bundle personalityState identityKernel currently supports relationshipPosture=observer and initiativeStyle=observant., Consumed trace bundle initiativeBaseline currently supports silenceReconnect=hold and comfortStyle=quiet-presence., Consumed trace bundle personStateProjection currently supports preferredProactiveStyle=silent-observe and the current opening guidance., Runtime initiative personaBias matches the consumed trace bundle, so the current proactive restraint still resolves from the initialized persona baseline.',
        ],
      },
      {
        id: 'proactive-action-chain',
        title: 'proactive action chain',
        lines: [
          'status: grounded',
          'personaPreferredAction: hover',
          'runtimeSelectedAction: hold',
          'runtimeShouldSpeak: false',
          'openingGuidance: Open by observing first and keep the approach lighter.',
          'openingGuidanceHoldReason: opening-guidance:observe-first',
          'matchedSignals: persona-preferred-action:hover, runtime-selected-action:hold, runtime-shouldSpeak:false, opening-guidance:observe-first',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: Persona bias currently points toward an observe-first move, so hover/hold is the expected proactive posture., Runtime initiative currently resolves to selectedAction=hold with shouldSpeak=false, which stays inside that observe-first posture., Latest drilled takeover audit confirms visible proactive speech was withheld by opening-guidance:observe-first.',
        ],
      },
      {
        id: 'proactive-manifestation-chain',
        title: 'proactive manifestation chain',
        lines: [
          'status: grounded',
          'personaPreferredStyle: silent-observe',
          'personaPreferredPresence: attentive',
          'counterfactualStyle: silent-observe',
          'counterfactualPresence: attentive',
          'actionEcologyStyle: silent-observe',
          'actionEcologyPresence: attentive',
          'initiativePreferredStyle: silent-observe',
          'initiativePreferredPresence: attentive',
          'matchedSignals: persona-preferred-style:silent-observe, counterfactual-style:silent-observe, counterfactual-presence:attentive, action-ecology-style:silent-observe, action-ecology-presence:attentive, initiative-preferred-style:silent-observe, initiative-preferred-presence:attentive',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: Persona bias currently points toward silent-observe with attentive presence, so a quiet accompanied manifestation is expected., Counterfactual deliberation, action ecology, and initiative all preserve the same style/presence chain, so the current manifestation still expresses the initialized persona posture.',
        ],
      },
      {
        id: 'private-thought-governance-chain',
        title: 'private thought governance chain',
        lines: [
          'status: grounded',
          'privateThoughtStance: accompany',
          'privateThoughtShouldSpeak: false',
          'privateThoughtStyle: silent-observe',
          'privateThoughtPresence: attentive',
          'privateThoughtText: The thread is still warm, but presence fits better than words for one more breath.',
          'visibleReplyRealizationReason: proactive-opening-guidance-violation:observe-first',
          'visibleReplyBlockedReason: opening-guidance:observe-first',
          'matchedSignals: private-thought-stance:accompany, private-thought-shouldSpeak:false, private-thought-style:silent-observe, private-thought-presence:attentive, private-thought-counterfactual:cf-hover, visible-reply-blocked:opening-guidance:observe-first',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: Private thought currently stays in accompany mode with shouldSpeak=false, so the inner line still matches the observe-first persona posture., The private thought style/presence still stays silent-observe with attentive presence, preserving the same manifestation posture chosen by initiative., Latest visible reply governance still blocks proactive wording by opening-guidance:observe-first, so the outer utterance gate is preserving the same restraint the inner line already holds.',
        ],
      },
      {
        id: 'resident-performance-projection',
        title: 'resident performance projection',
        lines: [
          'status: grounded',
          'residentSource: main-runtime',
          'residentEmbodiedPresence: attentive',
          'residentStance: accompany',
          'residentEmotionalTension: soft-covision',
          'residentBaseEmotion: thinking',
          'residentDelivery: gentle',
          'residentEmphasis: 1',
          'residentReasonTags: resident-performance, watch:symbiotic-vision, body:accompanying, continuity:quiet-accompaniment, presence:attentive, stance:accompany, tension:soft-covision, thought:counterfactual:hover',
          'matchedSignals: resident-source:main-runtime, resident-presence:attentive, resident-stance:accompany, resident-tension:soft-covision, resident-baseEmotion:thinking, resident-delivery:gentle, resident-reason:continuity:quiet-accompaniment',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: Resident performance still publishes attentive/accompany/soft-covision, so the desk-presence output is preserving the same inner line carried by private thought., Resident performance currently lands on baseEmotion=thinking and delivery=gentle, which matches a quiet accompaniment posture rather than a speech-forward interruption., Published resident reason tags still include continuity:quiet-accompaniment, so the runtime is explicitly projecting long-line desktop companionship instead of a generic idle shell.',
        ],
      },
      {
        id: 'embodiment-output-projection',
        title: 'embodiment output projection',
        lines: [
          'status: grounded',
          'projectedBodyState: accompanying',
          'projectedContinuityMode: quiet-accompaniment',
          'projectedFacialCue: focus',
          'projectedActionCue: steady_focus',
          'projectedBaseEmotion: thinking',
          'projectedDelivery: gentle',
          'residentSignature: main-runtime|symbiotic-vision|accompanying|quiet-accompaniment|attentive|accompany|soft-covision|coding|doc|coding|Quietly staying with the host through deep focus.|thinking|gentle|1',
          'matchedSignals: projected-body:accompanying, projected-continuity:quiet-accompaniment, projected-facialCue:focus, projected-actionCue:steady_focus, projected-baseEmotion:thinking, projected-delivery:gentle, projected-signature',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: Current body state accompanying with continuity quiet-accompaniment means the desktop shell should stay in a long-line accompaniment posture instead of switching into a speech-forward state., Resident performance currently projects facialCue=focus and actionCue=steady_focus, so the visible face and motion should stay quietly attentive rather than escalate into interruption., The resident signature still binds symbiotic-vision, quiet-accompaniment, and thinking/gentle output into one projection, so the rendered presence remains the same person as the current inner line.',
        ],
      },
      {
        id: 'renderer-authority-projection',
        title: 'renderer authority projection',
        lines: [
          'status: grounded',
          'rendererTarget: vrm',
          'bodyContinuityPhase: n/a',
          'rendererRejoinSurfaceKey: n/a',
          'runtimeProfile: protective-watch',
          'runtimeBodyState: settled',
          'runtimeContinuityMode: ambient-covision',
          'runtimeResidentEmotion: tired',
          'runtimeResidentDelivery: gentle',
          'runtimeResidentFacialCue: focused',
          'runtimeResidentActionCue: observe_focus',
          'playbackCueFacialCue: focused',
          'playbackCueActionCue: observe_focus',
          'driverFaceCue: focused',
          'driverActionCue: observe_focus',
          'authorityMatchSummary: 表情命中 / 动作命中 / 口型命中',
          'authorityMismatchDisplay: n/a',
          'matchedSignals: renderer-target:vrm, runtime-body:settled, runtime-continuity:ambient-covision, runtime-emotion:tired, runtime-delivery:gentle, runtime-facialCue:focused, runtime-actionCue:observe_focus, playback-facialCue:focused, playback-actionCue:observe_focus, driver-faceCue:focused, driver-actionCue:observe_focus, authority-face:yes, authority-motion:yes, authority-lipsync:yes',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: Runtime dynamics still publish focused/observe_focus with tired/gentle output, so the renderer runtime is carrying the same embodiment projection rather than inventing a separate shell state., Playback cue and driver execution both still consume focused and observe_focus, so the visible face and action are the same ones projected by the resident line., Authority matching remains face:yes motion:yes lipsync:yes on vrm, which shows the bound renderer segment is the one the desktop runtime actually executed.',
        ],
      },
      {
        id: 'runtime-continuity-projection',
        title: 'runtime continuity projection',
        lines: [
          'status: grounded',
          'bodyContinuityPhase: n/a',
          'rendererRejoinSurfaceKey: n/a',
          'runtimeChannel: active-dialogue',
          'runtimeSummary: runtime alignment held',
          'activeThreadId: runtime-thread-rest-1',
          'activeThreadTitle: late-night care',
          'runtimeScenario: coding',
          'runtimeScene: coding',
          'transitionFromWatchMode: symbiotic-vision',
          'transitionToWatchMode: recovering',
          'transitionFromScenario: chat',
          'transitionReason: host fatigue detected during late-night care',
          'governorDrive: protect',
          'governorIntentionId: governor-intention-rest-1',
          'focusBeliefId: belief-rest-1',
          'rationaleTags: recovering, late-night-fatigue',
          'traceEmbodimentSummary: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 无，实际执行 无，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall',
          'traceEmbodimentDisplaySummary: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 无，实际执行 无，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall',
          'matchedSignals: runtime-channel:active-dialogue, runtime-thread:runtime-thread-rest-1, runtime-scenario:coding, runtime-scene:coding, transition-from:symbiotic-vision, transition-to:recovering, governor-drive:protect, focus-belief:belief-rest-1, trace-embodiment',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: Runtime continuity still stays on thread runtime-thread-rest-1 with active-dialogue/coding context, so the rendered authority output is attached to an ongoing life situation instead of a detached animation shell., Recent transition still explains the move from symbiotic-vision to recovering because host fatigue detected during late-night care, which preserves a causal line between the prior scene and the current embodied posture., Trace embodiment summary still closes the same care/grounded-recall line, so renderer authority is part of one continuous person-state rather than a fresh isolated output.',
        ],
      },
      {
        id: 'rejected-action-alternatives',
        title: 'rejected action alternatives',
        lines: [
          'status: grounded',
          'selectedOptionId: cf-hover',
          'selectedAction: hover',
          'dominantTradeoff: presence-before-commentary',
          'alternatives: cf-speak/speak score=0.43 identityFit=0.26 timingFitness=0.38 drift=Current persona bias is observe-first, so speak breaks the preferred restraint posture. why=The knot looks local enough that specific speech now would help more than hovering. | cf-warn/warn score=0.31 identityFit=0.18 timingFitness=0.29 drift=Current persona bias is not guardian-care, so warn overstates urgency for this personality posture. why=Care pressure has crossed the line where silence would feel like neglect.',
          'reasons: Counterfactual deliberation currently selected hover under the dominant tradeoff presence-before-commentary., Rejected alternatives are ordered by highest remaining score so you can see what the current persona posture declined next.',
        ],
      },
    ])
  })

  it('surfaces explicit body-led renderer rejoin facts in renderer-authority and runtime-continuity evidence panels', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:yes face:yes motion:no lipsync:no',
        authorityMismatchSummary: null,
        matchedSignals: ['authority-body:yes', 'authority-face:yes'],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [],
      },
      runtimeContinuityProjection: {
        status: 'partial',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'thread-1',
        activeThreadTitle: 'same her',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: null,
        focusBeliefId: 'belief-1',
        rationaleTags: [],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: ['runtime-channel:active-dialogue'],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
    })

    expect(panels.find(panel => panel.id === 'renderer-authority-projection')?.lines).toContain('bodyContinuityPhase: body-carried-to-renderer-rejoin')
    expect(panels.find(panel => panel.id === 'renderer-authority-projection')?.lines).toContain('rendererRejoinSurfaceKey: authority:renderer-rejoin:live2d')
    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain('bodyContinuityPhase: body-carried-to-renderer-rejoin')
    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain('rendererRejoinSurfaceKey: authority:renderer-rejoin:live2d')
  })

  it('keeps body-led identity-continuity', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-led-evidence-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-led-evidence-1',
        focusBeliefId: 'belief-body-led-evidence-1',
        rationaleTags: ['recovering', 'same-thread-continuation'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-led-evidence-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'lane=body-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority projection already shows body-led identity-continuity',
        ],
      },
    })

    expect(panels).toContainEqual({
      id: 'runtime-continuity-projection',
      title: 'runtime continuity projection',
      lines: [
        'status: partial',
        'bodyContinuityPhase: n/a',
        'rendererRejoinSurfaceKey: n/a',
        'runtimeChannel: active-dialogue',
        'runtimeSummary: runtime alignment held',
        'activeThreadId: runtime-thread-body-led-evidence-1',
        'activeThreadTitle: late-night care',
        'runtimeScenario: coding',
        'runtimeScene: coding',
        'transitionFromWatchMode: n/a',
        'transitionToWatchMode: n/a',
        'transitionFromScenario: n/a',
        'transitionReason: n/a',
        'governorDrive: protect',
        'governorIntentionId: governor-intention-body-led-evidence-1',
        'focusBeliefId: belief-body-led-evidence-1',
        'rationaleTags: recovering, same-thread-continuation',
        'continuityAuthoritySummary: 身体线已经先把这段 living segment 托住，表情、动作、口型仍在补回同一条连续身体线',
        'traceEmbodimentSummary: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        'traceEmbodimentDisplaySummary: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        'matchedSignals: runtime-channel:active-dialogue, runtime-thread:runtime-thread-body-led-evidence-1, runtime-scenario:coding, authority-body:yes, lane=body-only',
        'missingSignals: n/a',
        'driftingSignals: authority-face:no, authority-motion:no',
        'reasons: Renderer authority projection already shows body-led identity-continuity',
      ],
    })
  })

  it('does not hide voice authority drift behind body-led identity-continuity', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        rendererTarget: 'vrm',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-led-voice-evidence-1',
        activeThreadTitle: 'voice drift recovery',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-led-voice-evidence-1',
        focusBeliefId: 'belief-body-led-voice-evidence-1',
        rationaleTags: ['recovering', 'same-thread-continuation'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-led-voice-evidence-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'authority-lipsync:yes',
          'lane=body+lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: [
          'authority-face:no',
          'authority-motion:no',
          'authority-voice:no',
        ],
        reasons: [
          'Body continuity still carries the same living segment while VRM manifestation rejoins it, but voice authority has left the living segment and must stay visible.',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 表情未命中 / 动作未命中 / 口型命中 / 声音未命中',
    )
  })

  it('uses the concrete renderer target in runtime continuity evidence when body continuity is already rejoining through live2d authority', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-led-live2d-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-led-live2d-1',
        focusBeliefId: 'belief-body-led-live2d-1',
        rationaleTags: ['recovering', 'same-thread-continuation'],
        rendererTarget: 'live2d',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-led-live2d-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'lane=body-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority projection already shows body-led identity-continuity',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 身体线已经先把这段 living segment 托住，Live2D 显形权威仍在补回同一条连续身体线',
    )
  })

  it('uses the concrete renderer target in runtime continuity evidence when body continuity is already rejoining through speech authority', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-led-speech-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-led-speech-1',
        focusBeliefId: 'belief-body-led-speech-1',
        rationaleTags: ['recovering', 'same-thread-continuation'],
        rendererTarget: 'speech',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-led-speech-1',
          'runtime-scenario:coding',
          'authority-body:yes',
          'lane=body-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority projection already shows body-led identity-continuity',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 身体线已经先把这段 living segment 托住，speech 显形权威仍在补回同一条连续身体线',
    )
  })

  it('keeps audible body-carried identity-continuity', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        bodyContinuityPhase: 'body-carried-to-renderer-rejoin',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        rendererTarget: 'vrm',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same line still held',
        activeThreadId: 'runtime-thread-audible-body-evidence-1',
        activeThreadTitle: 'callback afterglow',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-audible-body-evidence-1',
        focusBeliefId: 'belief-audible-body-evidence-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-audible-body-evidence-1',
          'authority-body:yes',
          'authority-lipsync:yes',
          'authority-voice:yes',
          'lane=lipsync+voice-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Body continuity still carries the same living segment while VRM manifestation rejoins it, so runtime continuity can explain the renderer recovery as the same digital life re-entering full embodiment instead of a new identity branch.',
          'Renderer authority continuity still keeps 表情未命中 / 动作未命中 / 口型命中 / 声音命中 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 身体线已经先把这段 living segment 托住，VRM 显形权威仍在补回同一条连续身体线',
    )
  })

  it('keeps body-only-hold identity-continuity', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        bodyContinuityPhase: 'body-only-hold',
        rendererRejoinSurfaceKey: null,
        rendererTarget: 'live2d',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same body line still held',
        activeThreadId: 'runtime-thread-body-only-evidence-1',
        activeThreadTitle: 'held inward',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-only-evidence-1',
        focusBeliefId: 'belief-body-only-evidence-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-only-evidence-1',
          'authority-body:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Body continuity is still the only lane carrying this same living segment, so runtime continuity should keep reading the current embodiment as identity continuity being held inward rather than a renderer-neutral idle settle.',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 身体线仍在独自托住同一段 living segment，当前还不能把 Live2D 显形权威的回接视为已经成立',
    )
  })

  it('keeps legacy note-only body-only-hold continuity visible in runtime continuity evidence instead of falling back to a generic lane summary', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        matchedSignals: [
          'authority-body:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          legacyNote,
        ],
        rendererTarget: 'live2d',
        bodyContinuityPhase: null,
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 身体线仍在独自托住同一段 living segment，当前还不能把 Live2D 显形权威的回接视为已经成立',
    )
  })

  it('keeps cross-modal-lock identity-continuity', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'grounded',
        bodyContinuityPhase: 'full-cross-modal-lock',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:live2d',
        rendererTarget: 'live2d',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'lock held',
        activeThreadId: 'runtime-thread-lock-evidence-1',
        activeThreadTitle: 'same segment lock',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-lock-evidence-1',
        focusBeliefId: 'belief-lock-evidence-1',
        rationaleTags: ['continuity', 'lock'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-lock-evidence-1',
          'authority-body:yes',
          'authority-face:yes',
          'authority-motion:yes',
          'authority-lipsync:yes',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Body continuity and Live2D manifestation are now locked back onto the same living segment together, so runtime continuity can explain the renderer recovery as one explicit same-her embodiment line instead of a temporary visual alignment.',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 身体线与 Live2D 显形权威已经共同锁回同一段 living segment',
    )
  })

  it('keeps renderer-rejoin-without-body drift visible in runtime continuity evidence instead of flattening it into a generic lane summary', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'drift',
        bodyContinuityPhase: 'renderer-rejoin-without-body',
        rendererRejoinSurfaceKey: 'authority:renderer-rejoin:vrm',
        rendererTarget: 'vrm',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'visible recovery drift',
        activeThreadId: 'runtime-thread-body-loss-evidence-1',
        activeThreadTitle: 'visible recovery drift',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-loss-evidence-1',
        focusBeliefId: 'belief-body-loss-evidence-1',
        rationaleTags: ['continuity', 'body-loss'],
        traceEmbodimentSummary: null,
        traceEmbodimentDisplaySummary: null,
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-loss-evidence-1',
          'authority-face:yes',
          'authority-motion:yes',
          'authority-lipsync:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no'],
        reasons: [
          'Renderer lanes have rejoined on VRM manifestation, but the body line is no longer carrying that same living segment, so runtime continuity should keep treating the visible recovery as same-her drift risk rather than a completed embodiment repair.',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: VRM 显形权威已经回接，但身体线没有继续托住同一段 living segment',
    )
  })

  it('includes memory-familiarity restraint detail inside the private-thought governance evidence panel', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      privateThoughtGovernanceChain: {
        status: 'grounded',
        privateThoughtStance: 'accompany',
        privateThoughtShouldSpeak: false,
        privateThoughtStyle: 'silent-observe',
        privateThoughtPresence: 'attentive',
        privateThoughtText: '记忆里的熟悉感是真的，但这次先别顺着它往更近的地方走。',
        visibleReplyRealizationReason: 'proactive-opening-guidance-violation:lower-pressure',
        visibleReplyBlockedReason: 'opening-guidance:lower-pressure',
        matchedSignals: [
          'private-thought-stance:accompany',
          'private-thought-shouldSpeak:false',
          'visible-reply-blocked:opening-guidance:lower-pressure',
        ],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Latest visible reply governance still blocks proactive wording by opening-guidance:lower-pressure, so the outer utterance gate is preserving the same restraint the inner line already holds.',
          'That lower-pressure hold specifically says remembered familiarity was restrained before closeness widened, keeping the identity-continuity',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'private-thought-governance-chain')).toEqual({
      id: 'private-thought-governance-chain',
      title: 'private thought governance chain',
      lines: [
        'status: grounded',
        'privateThoughtStance: accompany',
        'privateThoughtShouldSpeak: false',
        'privateThoughtStyle: silent-observe',
        'privateThoughtPresence: attentive',
        'privateThoughtText: 记忆里的熟悉感是真的，但这次先别顺着它往更近的地方走。',
        'visibleReplyRealizationReason: proactive-opening-guidance-violation:lower-pressure',
        'visibleReplyBlockedReason: opening-guidance:lower-pressure',
        'matchedSignals: private-thought-stance:accompany, private-thought-shouldSpeak:false, visible-reply-blocked:opening-guidance:lower-pressure',
        'missingSignals: n/a',
        'driftingSignals: n/a',
        'reasons: Latest visible reply governance still blocks proactive wording by opening-guidance:lower-pressure, so the outer utterance gate is preserving the same restraint the inner line already holds., That lower-pressure hold specifically says remembered familiarity was restrained before closeness widened, keeping the identity-continuity',
      ],
    })
  })

  it('includes remembered-familiarity proactive hold explanation inside the private-thought governance evidence panel', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      privateThoughtGovernanceChain: {
        status: 'grounded',
        privateThoughtStance: 'accompany',
        privateThoughtShouldSpeak: false,
        privateThoughtStyle: 'silent-observe',
        privateThoughtPresence: 'attentive',
        privateThoughtText: '这份熟悉感可以留着，但现在先别把它直接变成更近的可见动作。',
        visibleReplyRealizationReason: 'active-self-revision-remembered-familiarity-restraint-holds-visible-utterance',
        visibleReplyBlockedReason: null,
        matchedSignals: [
          'private-thought-stance:accompany',
          'private-thought-shouldSpeak:false',
        ],
        missingSignals: ['visible-reply-blocked-reason'],
        driftingSignals: [],
        reasons: [
          'Latest visible proactive hold says remembered familiarity must stay explicitly remembered before visible closeness widens, so the outer utterance gate is keeping the identity-continuity',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'private-thought-governance-chain')).toEqual({
      id: 'private-thought-governance-chain',
      title: 'private thought governance chain',
      lines: [
        'status: grounded',
        'privateThoughtStance: accompany',
        'privateThoughtShouldSpeak: false',
        'privateThoughtStyle: silent-observe',
        'privateThoughtPresence: attentive',
        'privateThoughtText: 这份熟悉感可以留着，但现在先别把它直接变成更近的可见动作。',
        'visibleReplyRealizationReason: active-self-revision-remembered-familiarity-restraint-holds-visible-utterance',
        'visibleReplyBlockedReason: n/a',
        'matchedSignals: private-thought-stance:accompany, private-thought-shouldSpeak:false',
        'missingSignals: visible-reply-blocked-reason',
        'driftingSignals: n/a',
        'reasons: Latest visible proactive hold says remembered familiarity must stay explicitly remembered before visible closeness widens, so the outer utterance gate is keeping the identity-continuity',
      ],
    })
  })

  it('renders renderer authority mismatch display from the human-readable reason when drift exists', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      rendererAuthorityProjection: {
        status: 'drift',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        authorityMismatchSummary: '口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是表情、动作。',
        matchedSignals: ['authority-face:yes', 'authority-motion:yes'],
        missingSignals: [],
        driftingSignals: ['authority-lipsync:no'],
        reasons: ['口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是表情、动作。'],
      },
    })

    expect(panels).toEqual([
      {
        id: 'renderer-authority-projection',
        title: 'renderer authority projection',
        lines: [
          'status: drift',
          'rendererTarget: vrm',
          'bodyContinuityPhase: n/a',
          'rendererRejoinSurfaceKey: n/a',
          'runtimeProfile: protective-watch',
          'runtimeBodyState: settled',
          'runtimeContinuityMode: ambient-covision',
          'runtimeResidentEmotion: tired',
          'runtimeResidentDelivery: gentle',
          'runtimeResidentFacialCue: focused',
          'runtimeResidentActionCue: observe_focus',
          'playbackCueFacialCue: focused',
          'playbackCueActionCue: observe_focus',
          'driverFaceCue: focused',
          'driverActionCue: observe_focus',
          'authorityMatchSummary: 表情命中 / 动作命中 / 口型未命中',
          'authorityMismatchDisplay: 口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是表情、动作。',
          'matchedSignals: authority-face:yes, authority-motion:yes',
          'missingSignals: n/a',
          'driftingSignals: authority-lipsync:no',
          'reasons: 口型 authority 漂移，当前绑定来源是 prosody-authority、timeline-projection，实际执行落点是表情、动作。',
        ],
      },
    ])
  })

  it('prefers renderer authority mismatch display provided by the projection itself', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      rendererAuthorityProjection: {
        status: 'drift',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: '上游 authority 命中',
        authorityMismatchSummary: 'face-mismatch, lipsync-mismatch',
        authorityMismatchDisplay: '上游 authority 漂移展示',
        matchedSignals: ['authority-face:yes'],
        missingSignals: [],
        driftingSignals: ['authority-motion:no', 'authority-mismatch:上游 authority 漂移展示'],
        reasons: ['上游 authority 漂移展示'],
      },
    } as any)

    expect(panels).toEqual([
      {
        id: 'renderer-authority-projection',
        title: 'renderer authority projection',
        lines: [
          'status: drift',
          'rendererTarget: vrm',
          'bodyContinuityPhase: n/a',
          'rendererRejoinSurfaceKey: n/a',
          'runtimeProfile: protective-watch',
          'runtimeBodyState: settled',
          'runtimeContinuityMode: ambient-covision',
          'runtimeResidentEmotion: tired',
          'runtimeResidentDelivery: gentle',
          'runtimeResidentFacialCue: focused',
          'runtimeResidentActionCue: observe_focus',
          'playbackCueFacialCue: focused',
          'playbackCueActionCue: observe_focus',
          'driverFaceCue: focused',
          'driverActionCue: observe_focus',
          'authorityMatchSummary: 上游 authority 命中 | 表情命中 / 动作未命中 / 口型未知',
          'authorityMismatchDisplay: 上游 authority 漂移展示',
          'matchedSignals: authority-face:yes',
          'missingSignals: n/a',
          'driftingSignals: authority-motion:no, authority-mismatch:上游 authority 漂移展示',
          'reasons: 上游 authority 漂移展示',
        ],
      },
    ])
  })

  it('serializes renderer drift inside runtime continuity evidence panels', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'drift',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-rest-1',
        ],
        missingSignals: [],
        driftingSignals: [
          'renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
        ],
        reasons: [
          'Renderer continuity still carries resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge, so the life thread can explain the visible divergence as a post-projection renderer event instead of a broken resident mind state.',
        ],
      },
    })

    expect(panels).toContainEqual({
      id: 'runtime-continuity-projection',
      title: 'runtime continuity projection',
      lines: expect.arrayContaining([
        'status: drift',
        'driftingSignals: renderer-drift:resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge',
        'reasons: Renderer continuity still carries resident Soft Gaze -> actual Focus Inspect | face focused@prosody-authority | motion observe_focus@cue-bridge, so the life thread can explain the visible divergence as a post-projection renderer event instead of a broken resident mind state.',
      ]),
    })
  })

  it('keeps remaining-open lipsync and voice carry visible inside renderer authority evidence panels when body face and motion already rejoin on one segment', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      rendererAuthorityProjection: {
        status: 'partial',
        rendererTarget: 'live2d',
        runtimeProfile: 'measured-return',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'same-thread-continuation',
        runtimeResidentEmotion: 'thinking',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'soft-gaze',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'soft-gaze',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'soft-gaze',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'body:yes face:yes motion:yes lipsync:no',
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        matchedSignals: [
          'authority-body:yes',
          'authority-face:yes',
          'authority-motion:yes',
          'remaining-open=lipsync+voice',
        ],
        missingSignals: [],
        driftingSignals: ['authority-lipsync:no'],
        reasons: [],
      },
    })

    expect(panels.find(panel => panel.id === 'renderer-authority-projection')?.lines).toContain(
      'authorityMatchSummary: 身体命中 / 表情命中 / 动作命中 / 口型未命中 | 当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段',
    )
  })

  it('surfaces lane-level continuity authority truth inside runtime continuity evidence panels', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'drift',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-rest-1',
          'authority-face:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-motion:no'],
        reasons: [
          'Renderer authority continuity still keeps 表情命中 / 动作未命中 / 口型未知 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.',
        ],
      },
    })

    expect(panels).toContainEqual({
      id: 'runtime-continuity-projection',
      title: 'runtime continuity projection',
      lines: expect.arrayContaining([
        'status: drift',
        'continuityAuthoritySummary: 表情命中 / 动作未命中 / 口型未知',
        'matchedSignals: runtime-channel:active-dialogue, runtime-thread:runtime-thread-rest-1, authority-face:yes',
        'driftingSignals: authority-motion:no',
      ]),
    })
  })

  it('surfaces voice as part of runtime continuity lane truth inside runtime continuity evidence panels', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'drift',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-voice-evidence-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-voice-evidence-1',
        focusBeliefId: 'belief-voice-evidence-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-voice-evidence-1',
          'authority-lipsync:yes',
          'authority-voice:yes',
        ],
        missingSignals: [],
        driftingSignals: ['authority-face:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority continuity still keeps 表情未命中 / 动作未命中 / 口型命中 / 声音命中 on the same life thread, so runtime continuity can explain which embodiment lane stayed bound and which one drifted without collapsing the whole digital-life thread into a fake identity break.',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 表情未命中 / 动作未命中 / 口型命中 / 声音命中',
    )
  })

  it('keeps remaining-open lipsync and voice carry visible inside runtime continuity evidence panels when body face and motion already rejoin on one segment', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-body-face-motion-evidence-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-body-face-motion-evidence-1',
        focusBeliefId: 'belief-body-face-motion-evidence-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-body-face-motion-evidence-1',
          'authority-body:yes',
          'authority-face:yes',
          'authority-motion:yes',
          'remaining-open=lipsync+voice',
        ],
        missingSignals: [],
        driftingSignals: ['authority-lipsync:no'],
        reasons: [
          'Renderer authority continuity now explicitly keeps remaining-open=lipsync+voice visible, so higher-level continuity evidence should acknowledge that body face and motion have rejoined while lipsync and voice still remain open on the same living segment.',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 当前仅剩身体、表情、动作维持同一段连续性，口型和声音还没有重新并回这一段',
    )
  })

  it('keeps the quieter face+lipsync identity-continuity', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same line still held',
        activeThreadId: 'runtime-thread-face-lipsync-evidence-1',
        activeThreadTitle: 'quiet visible carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-face-lipsync-evidence-1',
        focusBeliefId: 'belief-face-lipsync-evidence-1',
        rationaleTags: ['recovering', 'quiet-visible-carry'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-face-lipsync-evidence-1',
          'runtime-scenario:coding',
          'authority-face:yes',
          'authority-lipsync:yes',
          'lane=face+lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority continuity still says the quieter face+lipsync carry is the surviving visible identity-continuity',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 当前只有 face 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、motion 和 voice 还没有重新接回这条表情口型线',
    )
  })

  it('keeps the quieter motion+lipsync identity-continuity', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same line still held',
        activeThreadId: 'runtime-thread-motion-lipsync-evidence-1',
        activeThreadTitle: 'quiet visible carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-motion-lipsync-evidence-1',
        focusBeliefId: 'belief-motion-lipsync-evidence-1',
        rationaleTags: ['recovering', 'quiet-visible-carry'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-motion-lipsync-evidence-1',
          'runtime-scenario:coding',
          'authority-motion:yes',
          'authority-lipsync:yes',
          'lane=motion+lipsync-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no', 'authority-face:no'],
        reasons: [
          'Renderer authority continuity still says the quieter motion+lipsync carry is the surviving visible identity-continuity',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 当前只有 motion 和 lipsync 这条 same-her 生命线还和同一段数字生命表达对齐，可见连续性还没有断开，但 body、face 和 voice 还没有重新接回这条动作口型线',
    )
  })

  it('keeps the quieter face+lipsync+voice identity-continuity', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same line still held',
        activeThreadId: 'runtime-thread-face-lipsync-voice-evidence-1',
        activeThreadTitle: 'quiet visible carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-face-lipsync-voice-evidence-1',
        focusBeliefId: 'belief-face-lipsync-voice-evidence-1',
        rationaleTags: ['recovering', 'quiet-visible-carry'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-face-lipsync-voice-evidence-1',
          'runtime-scenario:coding',
          'authority-face:yes',
          'authority-lipsync:yes',
          'authority-voice:yes',
          'lane=face+lipsync+voice-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no', 'authority-motion:no'],
        reasons: [
          'Renderer authority continuity still says the quieter face+lipsync+voice carry is the surviving visible identity-continuity',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 当前仅剩表情、口型、声音维持同一段连续性，可见 identity-continuity',
    )
  })

  it('keeps the quieter motion+lipsync+voice identity-continuity', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'same line still held',
        activeThreadId: 'runtime-thread-motion-lipsync-voice-evidence-1',
        activeThreadTitle: 'quiet visible carry',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-motion-lipsync-voice-evidence-1',
        focusBeliefId: 'belief-motion-lipsync-voice-evidence-1',
        rationaleTags: ['recovering', 'quiet-visible-carry'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达）',
        matchedSignals: [
          'runtime-channel:active-dialogue',
          'runtime-thread:runtime-thread-motion-lipsync-voice-evidence-1',
          'runtime-scenario:coding',
          'authority-motion:yes',
          'authority-lipsync:yes',
          'authority-voice:yes',
          'lane=motion+lipsync+voice-only',
        ],
        missingSignals: [],
        driftingSignals: ['authority-body:no', 'authority-face:no'],
        reasons: [
          'Renderer authority continuity still says the quieter motion+lipsync+voice carry is the surviving visible identity-continuity',
        ],
      },
    })

    expect(panels.find(panel => panel.id === 'runtime-continuity-projection')?.lines).toContain(
      'continuityAuthoritySummary: 当前仅剩动作、口型、声音维持同一段连续性，可见 identity-continuity',
    )
  })

  it('prefers Chinese-first authority and trace display text inside human-facing evidence panels', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      rendererAuthorityProjection: {
        status: 'grounded',
        rendererTarget: 'vrm',
        runtimeProfile: 'protective-watch',
        runtimeBodyState: 'settled',
        runtimeContinuityMode: 'ambient-covision',
        runtimeResidentEmotion: 'tired',
        runtimeResidentDelivery: 'gentle',
        runtimeResidentFacialCue: 'focused',
        runtimeResidentActionCue: 'observe_focus',
        playbackCueFacialCue: 'focused',
        playbackCueActionCue: 'observe_focus',
        driverFaceCue: 'focused',
        driverActionCue: 'observe_focus',
        authorityMatchSummary: 'face:yes motion:yes lipsync:no',
        authorityMismatchSummary: null,
        authorityMismatchDisplay: null,
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
      runtimeContinuityProjection: {
        status: 'grounded',
        runtimeChannel: 'active-dialogue',
        runtimeSummary: 'runtime alignment held',
        activeThreadId: 'runtime-thread-rest-1',
        activeThreadTitle: 'late-night care',
        runtimeScenario: 'coding',
        runtimeScene: 'coding',
        transitionFromWatchMode: null,
        transitionToWatchMode: null,
        transitionFromScenario: null,
        transitionReason: null,
        governorDrive: 'protect',
        governorIntentionId: 'governor-intention-rest-1',
        focusBeliefId: 'belief-rest-1',
        rationaleTags: ['recovering'],
        traceEmbodimentSummary: 'turn=care | closure=grounded-recall | surface=procedural-carry | authority=none | execution=none | scenario=late-night-fatigue | stance=observe-first | sourceTrail=fatigue, care, grounded-recall',
        traceEmbodimentDisplaySummary: '关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 无，实际执行 无，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [],
      },
    } as any)

    expect(panels).toContainEqual({
      id: 'renderer-authority-projection',
      title: 'renderer authority projection',
      lines: expect.arrayContaining([
        'authorityMatchSummary: 表情命中 / 动作命中 / 口型未命中',
      ]),
    })

    expect(panels).toContainEqual({
      id: 'runtime-continuity-projection',
      title: 'runtime continuity projection',
      lines: expect.arrayContaining([
        'traceEmbodimentSummary: 关怀回合，收口 grounded-recall（基于记忆回收落稳），表面策略 procedural-carry（沿既有过程延续表达），权威驱动 无，实际执行 无，场景 深夜疲劳照看，姿态 先观察后表达，来源链 fatigue -> care -> grounded-recall',
      ]),
    })
  })

  it('includes remembered-familiarity competition detail inside the rejected action alternatives panel', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      rejectedActionAlternatives: {
        status: 'grounded',
        selectedOptionId: 'cf-hover',
        selectedAction: 'hover',
        dominantTradeoff: 'presence-before-commentary',
        alternatives: [
          {
            optionId: 'cf-speak',
            action: 'speak',
            identityFit: 0.24,
            timingFitness: 0.44,
            score: 0.41,
            driftReason: 'Current persona bias is observe-first, so speak breaks the preferred restraint posture.',
            why: 'Speaking now might move faster, but it would narrow the room too early.',
          },
        ],
        reasons: [
          'Counterfactual deliberation currently selected hover under the dominant tradeoff presence-before-commentary.',
          'Counterfactual competition kept hover ahead because remembered familiarity was held as memory before visible closeness widened, so the more direct speak return was intentionally declined.',
          'Rejected alternatives are ordered by highest remaining score so you can see what the current persona posture declined next.',
        ],
      },
    })

    expect(panels).toEqual([
      {
        id: 'rejected-action-alternatives',
        title: 'rejected action alternatives',
        lines: [
          'status: grounded',
          'selectedOptionId: cf-hover',
          'selectedAction: hover',
          'dominantTradeoff: presence-before-commentary',
          'alternatives: cf-speak/speak score=0.41 identityFit=0.24 timingFitness=0.44 drift=Current persona bias is observe-first, so speak breaks the preferred restraint posture. why=Speaking now might move faster, but it would narrow the room too early.',
          'reasons: Counterfactual deliberation currently selected hover under the dominant tradeoff presence-before-commentary., Counterfactual competition kept hover ahead because remembered familiarity was held as memory before visible closeness widened, so the more direct speak return was intentionally declined., Rejected alternatives are ordered by highest remaining score so you can see what the current persona posture declined next.',
        ],
      },
    ])
  })

  it('includes remembered-familiarity restraint detail inside the proactive decision consumption summary panel', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      proactiveDecisionConsumptionSummary: {
        status: 'grounded',
        decisionMode: 'birth-anchored-restraint',
        dominantDrift: null,
        lines: [
          'decision-consumption: birth observe-first restraint became persona hover and runtime hold',
          'manifestation-consumption: silent-observe | attentive',
          'counterfactual-consumption: selected=hover | tradeoff=presence-before-commentary',
          'memory-familiarity-restraint: remembered familiarity stayed memory-first before visible closeness widened',
          'rejected-alternative: speak stayed rejected because Current persona bias is observe-first, so speak breaks the preferred restraint posture.',
          'trust-meaning: trust deepens through steadiness before closeness',
        ],
      },
    })

    expect(panels).toEqual([
      {
        id: 'proactive-decision-consumption-summary',
        title: 'proactive decision consumption summary',
        lines: [
          'status: grounded',
          'decisionMode: birth-anchored-restraint',
          'dominantDrift: n/a',
          'lines: decision-consumption: birth observe-first restraint became persona hover and runtime hold, manifestation-consumption: silent-observe | attentive, counterfactual-consumption: selected=hover | tradeoff=presence-before-commentary, memory-familiarity-restraint: remembered familiarity stayed memory-first before visible closeness widened, rejected-alternative: speak stayed rejected because Current persona bias is observe-first, so speak breaks the preferred restraint posture., trust-meaning: trust deepens through steadiness before closeness',
        ],
      },
    ])
  })

  it('includes remembered-familiarity governance detail inside the identity drift governance summary panel', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      identityDriftGovernanceSummary: {
        status: 'grounded',
        governanceMode: 'bounded-growth',
        dominantDrift: null,
        lines: [
          'governance: bounded growth is preserving identity',
          'identity-boundary: trust can deepen without violating observe-first room',
          'identity-anchors: host-steadiness | observe-first room',
          'remembered-familiarity-governance: familiarity stayed in memory first, so growth did not widen visible closeness past the same-her room',
          'trust-meaning: trust deepens through steadiness before closeness',
          'autobiographical-stability: 0.92 | trajectory=presence restraint',
        ],
      },
    })

    expect(panels).toEqual([
      {
        id: 'identity-drift-governance-summary',
        title: 'identity drift governance summary',
        lines: [
          'status: grounded',
          'governanceMode: bounded-growth',
          'dominantDrift: n/a',
          'lines: governance: bounded growth is preserving identity, identity-boundary: trust can deepen without violating observe-first room, identity-anchors: host-steadiness | observe-first room, remembered-familiarity-governance: familiarity stayed in memory first, so growth did not widen visible closeness past the same-her room, trust-meaning: trust deepens through steadiness before closeness, autobiographical-stability: 0.92 | trajectory=presence restraint',
        ],
      },
    ])
  })

  it('includes remembered-familiarity trajectory detail inside the candidate trajectory summary panel', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      candidateTrajectorySummary: {
        status: 'grounded',
        trajectoryLabel: 'restrained companionship is holding',
        dominantDrift: null,
        lines: [
          'trajectory: restrained companionship is holding',
          'status: grounded | drift=none',
          'personality-baseline: restrained | observe-first',
          'remembered-familiarity-trajectory: familiarity is staying memory-first while the same-her room holds',
          'learning-direction: expected=verify | runtime=verify | kernel=verify',
          'dominant-trajectory: presence restraint',
        ],
      },
    })

    expect(panels).toEqual([
      {
        id: 'candidate-trajectory-summary',
        title: 'candidate trajectory summary',
        lines: [
          'status: grounded',
          'trajectoryLabel: restrained companionship is holding',
          'dominantDrift: n/a',
          'lines: trajectory: restrained companionship is holding, status: grounded | drift=none, personality-baseline: restrained | observe-first, remembered-familiarity-trajectory: familiarity is staying memory-first while the same-her room holds, learning-direction: expected=verify | runtime=verify | kernel=verify, dominant-trajectory: presence restraint',
        ],
      },
    ])
  })

  it('includes companionship transition evidence when visible closeness is intentionally re-entering slowly', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      companionshipTransitionSummary: {
        status: 'grounded',
        companionshipHoldMode: 'measured-return',
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        live2dFacialReleaseMs: 620,
        vrmExpressionBlendMs: 410,
        vrmActionFadeMs: 330,
        summaryLine: 'mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms',
        reasons: [
          'Latest drilled takeover audit currently holds outer companionship in measured-return, so visible closeness should re-enter with that same relationship cadence.',
          'Cross-modal settle cadence now reads mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms, so Live2D and VRM are being kept on the same measured return path.',
        ],
      },
    })

    expect(panels).toEqual([
      {
        id: 'companionship-transition-summary',
        title: 'companionship transition summary',
        lines: [
          'status: grounded',
          'companionshipHoldMode: measured-return',
          'preferredExpressionAliases: CalmInspect',
          'preferredMotionAliases: ObserveSoft',
          'summaryLine: mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms',
          'reasons: Latest drilled takeover audit currently holds outer companionship in measured-return, so visible closeness should re-enter with that same relationship cadence., Cross-modal settle cadence now reads mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms, so Live2D and VRM are being kept on the same measured return path.',
        ],
      },
    ])
  })

  it('surfaces durable relationship rhythm inside real-time cadence evidence when measured return is already being internalized', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        openingGuidance: 'Open by observing first and keep the approach lighter.',
        manifestationCadenceSummary: 'persona prefers observe-first room, so visible return cadence should stay slower until the opening softens.',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.',
        ],
      },
      companionshipTransitionSummary: {
        status: 'grounded',
        companionshipHoldMode: 'measured-return',
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        live2dFacialReleaseMs: 620,
        vrmExpressionBlendMs: 410,
        vrmActionFadeMs: 330,
        summaryLine: 'mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms',
        reasons: [
          'Latest drilled takeover audit currently holds outer companionship in measured-return, so visible closeness should re-enter with that same relationship cadence.',
        ],
      },
    })

    expect(panels).toEqual([
      {
        id: 'companionship-transition-summary',
        title: 'companionship transition summary',
        lines: [
          'status: grounded',
          'companionshipHoldMode: measured-return',
          'preferredExpressionAliases: CalmInspect',
          'preferredMotionAliases: ObserveSoft',
          'summaryLine: mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms',
          'reasons: Latest drilled takeover audit currently holds outer companionship in measured-return, so visible closeness should re-enter with that same relationship cadence., Measured return is no longer only a temporary callback hold; it is being internalized as durable relationship rhythm for the same her.',
        ],
      },
      {
        id: 'persona-bias-provenance',
        title: 'persona bias provenance',
        lines: [
          'status: grounded',
          'relationshipPosture: observer',
          'initiativeStyle: observant',
          'silenceReconnect: hold',
          'comfortStyle: quiet-presence',
          'preferredProactiveStyle: silent-observe',
          'openingGuidance: Open by observing first and keep the approach lighter.',
          'manifestationCadenceSummary: persona prefers observe-first room, so visible return cadence should stay slower until the opening softens. | measured return is being kept as durable relationship rhythm',
          'matchedSignals: n/a',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: Relationship cadence internalization is active, so measured-return reconfirmation is now being treated as durable relationship rhythm rather than temporary callback restraint.',
        ],
      },
    ])
  })

  it('keeps invited measured-return cadence evidence on the same callback line instead of narrating it like a broad re-entry', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      personaBiasProvenance: {
        status: 'grounded',
        relationshipPosture: 'observer',
        initiativeStyle: 'observant',
        silenceReconnect: 'hold',
        comfortStyle: 'quiet-presence',
        preferredProactiveStyle: 'silent-observe',
        openingGuidance: 'Stay on the same callback line and let the next outward move remain hover-first.',
        manifestationCadenceSummary: 'same-turn-if-invited measured-return should stay quieter and more inward before widening again.',
        matchedSignals: [],
        missingSignals: [],
        driftingSignals: [],
        reasons: [
          'Relationship cadence internalization is active, so same-turn-if-invited measured-return should stay on the same callback line instead of reading like a fresh reopening.',
        ],
      },
      companionshipTransitionSummary: {
        status: 'grounded',
        companionshipHoldMode: 'measured-return',
        preferredExpressionAliases: ['CalmInspect'],
        preferredMotionAliases: ['ObserveSoft'],
        live2dFacialReleaseMs: 620,
        vrmExpressionBlendMs: 410,
        vrmActionFadeMs: 330,
        summaryLine: 'mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms',
        reasons: [
          'This return is same-turn-if-invited, so visible closeness should re-enter on the same callback line instead of opening outward from scratch.',
        ],
      },
    })

    expect(panels).toEqual([
      {
        id: 'companionship-transition-summary',
        title: 'companionship transition summary',
        lines: [
          'status: grounded',
          'companionshipHoldMode: measured-return',
          'preferredExpressionAliases: CalmInspect',
          'preferredMotionAliases: ObserveSoft',
          'summaryLine: mode=measured-return | live2dFace=620ms | vrmExpr=410ms | vrmAction=330ms',
          'reasons: This return is same-turn-if-invited, so visible closeness should re-enter on the same callback line instead of opening outward from scratch.',
        ],
      },
      {
        id: 'persona-bias-provenance',
        title: 'persona bias provenance',
        lines: [
          'status: grounded',
          'relationshipPosture: observer',
          'initiativeStyle: observant',
          'silenceReconnect: hold',
          'comfortStyle: quiet-presence',
          'preferredProactiveStyle: silent-observe',
          'openingGuidance: Stay on the same callback line and let the next outward move remain hover-first.',
          'manifestationCadenceSummary: same-turn-if-invited measured-return should stay quieter and more inward before widening again. | measured return is being kept on the same callback line',
          'matchedSignals: n/a',
          'missingSignals: n/a',
          'driftingSignals: n/a',
          'reasons: Relationship cadence internalization is active, so same-turn-if-invited measured-return should stay on the same callback line instead of reading like a fresh reopening.',
        ],
      },
    ])
  })

  it('includes project-state continuity internalization readiness inside evidence panels when identity-continuity', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      internalizationReadinessSummary: {
        status: 'partial',
        lines: [
          'identity-continuity',
          'Project identity carry is still weak, so she is not yet holding what this project is and who she is becoming with enough stability to internalize the patch.',
          'Phase 1 route carry is still weak, so the runtime may drift away from local digital life priorities instead of protecting the same-her roadmap.',
          'Unresolved closure carry is still weak, so unresolved project loops are not being carried forward reliably enough for durable identity-continuity',
          'keep this candidate in shadow until replay can carry project identity, the Phase 1 route, and unresolved closure work without dropping them across turns.',
        ],
      },
    } as any)

    expect(panels).toEqual([
      {
        id: 'internalization-readiness-summary',
        title: 'internalization readiness summary',
        lines: [
          'status: partial',
          'lines: identity-continuity',
        ],
      },
    ])
  })
})
