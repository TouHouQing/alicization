import { describe, expect, it } from 'vitest'

import { buildSelfEvolutionEvidencePanels } from './performance-visualizer-self-evolution-evidence'

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
          'That lower-pressure hold specifically says remembered familiarity was restrained before closeness widened, keeping the same-her return inside the current room.',
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
        'reasons: Latest visible reply governance still blocks proactive wording by opening-guidance:lower-pressure, so the outer utterance gate is preserving the same restraint the inner line already holds., That lower-pressure hold specifically says remembered familiarity was restrained before closeness widened, keeping the same-her return inside the current room.',
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
          'Latest visible proactive hold says remembered familiarity must stay explicitly remembered before visible closeness widens, so the outer utterance gate is keeping the same-her return from jumping ahead of the current room.',
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
        'reasons: Latest visible proactive hold says remembered familiarity must stay explicitly remembered before visible closeness widens, so the outer utterance gate is keeping the same-her return from jumping ahead of the current room.',
      ],
    })
  })

  it('renders renderer authority mismatch display from the human-readable reason when drift exists', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      rendererAuthorityProjection: {
        status: 'partial',
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
          'status: partial',
          'rendererTarget: vrm',
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
        status: 'partial',
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
        matchedSignals: ['authority-face:yes', 'authority-motion:no'],
        missingSignals: [],
        driftingSignals: ['authority-mismatch:上游 authority 漂移展示'],
        reasons: ['上游 authority 漂移展示'],
      },
    } as any)

    expect(panels).toEqual([
      {
        id: 'renderer-authority-projection',
        title: 'renderer authority projection',
        lines: [
          'status: partial',
          'rendererTarget: vrm',
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
          'authorityMatchSummary: 上游 authority 命中',
          'authorityMismatchDisplay: 上游 authority 漂移展示',
          'matchedSignals: authority-face:yes, authority-motion:no',
          'missingSignals: n/a',
          'driftingSignals: authority-mismatch:上游 authority 漂移展示',
          'reasons: 上游 authority 漂移展示',
        ],
      },
    ])
  })

  it('serializes renderer drift inside runtime continuity evidence panels', () => {
    const panels = buildSelfEvolutionEvidencePanels({
      runtimeContinuityProjection: {
        status: 'partial',
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
          'renderer-drift:resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority',
        ],
        reasons: [
          'Renderer continuity still carries resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority, so the life thread can explain the visible divergence as a post-projection renderer event instead of a broken resident mind state.',
        ],
      },
    })

    expect(panels).toContainEqual({
      id: 'runtime-continuity-projection',
      title: 'runtime continuity projection',
      lines: expect.arrayContaining([
        'status: partial',
        'driftingSignals: renderer-drift:resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority',
        'reasons: Renderer continuity still carries resident Soft Gaze -> actual Focus Inspect | cue focused@prosody-authority, so the life thread can explain the visible divergence as a post-projection renderer event instead of a broken resident mind state.',
      ]),
    })
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
})
