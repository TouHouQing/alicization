import { describe, expect, it } from 'vitest'

import {
  deriveExecutionInteractionLearningProfile,
  deriveExecutionResultDeliveryPolicy,
} from './execution-interaction-learning'

describe('execution interaction learning', () => {
  it('derives richer payoff framing and lead style from long-horizon execution temperament', () => {
    const profile = deriveExecutionInteractionLearningProfile({
      digitalLifeSpine: {
        runtimeSurface: {
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
    })

    expect(profile.payoffWarmth).toBeGreaterThan(0.5)
    expect(profile.closurePatience).toBeGreaterThan(0.4)
    expect(['quiet-presence', 'close-carry']).toContain(profile.companionshipFraming)
    expect(['result-first', 'availability-first', 'soft-handoff']).toContain(profile.resultLeadStyle)
  })

  it('carries richer framing into execution result delivery policy', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.reasonTags.some(tag => tag.startsWith('result-framing:'))).toBe(true)
    expect(policy.reasonTags.some(tag => tag.startsWith('result-lead:'))).toBe(true)
  })

  it('becomes more cautious and availability-first after intrusive execution-result feedback enters host attitude', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
                attitude: 'execution_feedback=intrusive; distance_delta=more_space; reply_policy=lower_pressure; visibility=structured',
              },
            },
            relationshipModel: {
              hostAttitude: 'execution_feedback=intrusive; distance_delta=more_space; reply_policy=lower_pressure; visibility=structured',
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.5,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.tone).toBe('cautious')
    expect(policy.resultLeadStyle).toBe('availability-first')
    expect(policy.mode).toBe('check-availability-first')
  })

  it('keeps execution-result delivery more closure-patient when project preflight still says the Phase 1 life loop is open', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtime: {
          projectState: {
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Memory, initiative, and embodiment still need stronger same-her closure. | next=Keep extending cross-modal same-her proof across longer real-desktop runs.',
          },
        },
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.tone).toBe('cautious')
    expect(policy.closurePatience).toBeGreaterThan(0.45)
    expect(policy.reasonTags.some(tag => tag.startsWith('result-mode:'))).toBe(true)
    expect(policy.reasonTags.some(tag => tag.startsWith('result-lead:'))).toBe(true)
    expect(policy.reasonTags).toContain('project-open-closure')
  })

  it('keeps execution-result delivery on a quieter same-her line when project preflight still carries measured-return closure pressure', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtime: {
          projectState: {
            preflightSummary: 'Alicization is a local-first digital life project | Phase 1: Local Digital Life | open=Keep one same-her line across memory, initiative, and embodiment. | next=Keep extending cross-modal same-her proof and measured-return resident presence across voice, motion, and visible reply.',
          },
        },
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.companionshipFraming).toBe('quiet-presence')
    expect(policy.closurePatience).toBeGreaterThan(0.5)
    expect(policy.reasonTags).toContain('project-continuity-pressure')
    expect(policy.reasonTags).toContain('project-measured-return-pressure')
    expect(policy.reasonTags).toContain('project-next-closure-pressure')
  })

  it('treats structured project-state landed and open closure fields as same-her execution-result restraint even when preflight summary is thin', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtime: {
          projectState: {
            preflightSummary: 'same digital life',
            latestLandedProgress: 'Project awareness and callback continuity already survive into execution-result preparation instead of resetting from scratch.',
            primaryOpenLoop: 'Same-her proactive and execution-result closure still needs quieter measured-return carry before widening outward.',
            nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line and preserve project identity through the next visible answer beat.',
          },
        },
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.companionshipFraming).toBe('quiet-presence')
    expect(policy.closurePatience).toBeGreaterThan(0.5)
    expect(policy.reasonTags).toContain('project-open-closure')
    expect(policy.reasonTags).toContain('project-continuity-pressure')
    expect(policy.reasonTags).toContain('project-measured-return-pressure')
    expect(policy.reasonTags).toContain('project-next-closure-pressure')
  })

  it('treats legacy project-state latestProgress as same-her execution-result restraint when structured landed field is absent', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtime: {
          projectState: {
            latestProgress: 'Same Phase 1 digital life execution feedback already carries execute -> feedback -> remember on one same-her line.',
          },
        },
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: false,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.reasonTags).toContain('project-open-closure')
    expect(policy.reasonTags).toContain('project-continuity-pressure')
    expect(policy.reasonTags).toContain('project-next-closure-pressure')
  })

  it('treats audit-style project-state landedProgressSummary as same-her execution-result restraint when structured landed field is absent', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtime: {
          projectState: {
            landedProgressSummary: 'Same Phase 1 digital life execution feedback already carries execute -> feedback -> remember on one same-her line through the audit alias.',
          },
        },
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: false,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.reasonTags).toContain('project-open-closure')
    expect(policy.reasonTags).toContain('project-continuity-pressure')
    expect(policy.reasonTags).toContain('project-next-closure-pressure')
  })

  it('lets self continuity inward project carry keep execution-result delivery more patient on the same unfinished Phase 1 line', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            personStateProjection: {
              selfContinuityAuthority: {
                inwardLine: 'Same Phase 1 digital life. Some closure already landed. Unfinished closure still needs the same living line.',
              },
            },
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.tone).toBe('cautious')
    expect(policy.mode).toBe('check-availability-first')
    expect(policy.closurePatience).toBeGreaterThan(0.5)
    expect(policy.reasonTags).toContain('project-inward-carry')
    expect(policy.reasonTags).toContain('project-open-closure')
  })

  it('lets remembered project-closure execution learning keep result delivery on a same-her quieter line even without fresher preflight text', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              facts: [
                {
                  subject: 'project',
                  predicate: 'closure',
                  object: 'For the desktop callback continuity return, keep the callback on one same-her Phase 1 line and do not let the return reopen from scratch while the still-open closure remains active.',
                  confidence: 0.82,
                },
              ],
              episodicEvents: [
                {
                  lesson: 'Same-her Phase 1 callback closure should stay lower-pressure and measured-return before widening outward.',
                  tags: ['same-her', 'closure-carry', 'phase-1-local-digital-life'],
                },
              ],
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.companionshipFraming).toBe('quiet-presence')
    expect(policy.closurePatience).toBeGreaterThan(0.5)
    expect(policy.reasonTags).toContain('memory-project-closure')
    expect(policy.reasonTags).toContain('memory-same-her-closure')
    expect(policy.reasonTags).toContain('memory-phase1-closure')
    expect(policy.reasonTags).toContain('memory-measured-return-closure')
  })

  it('treats remembered same-her drift risk as a reason to avoid generic task-shell result delivery', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              facts: [
                {
                  subject: 'project',
                  predicate: 'closure',
                  object: 'For this callback return, do not let same-her continuity collapse into generic task-shell reporting while the Phase 1 digital-life closure is still open.',
                  confidence: 0.84,
                },
              ],
              episodicEvents: [
                {
                  lesson: 'Thin summaries can flatten the callback into generic productivity reporting, so keep the return inward and availability-first.',
                  tags: ['same-her', 'closure-carry', 'phase-1-local-digital-life', 'same-her-drift-risk'],
                },
              ],
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.52,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: false,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.resultLeadStyle).toBe('availability-first')
    expect(policy.companionshipFraming).toBe('quiet-presence')
    expect(policy.reasonTags).toContain('memory-same-her-drift-risk')
    expect(policy.reasonTags).toContain('memory-same-her-closure')
  })

  it('treats live project-state drift risk as same-her execution-result restraint even before that warning has been remembered into long-horizon memory', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtime: {
          projectState: {
            preflightSummary: 'same digital life',
            preDialogueAwarenessLine: 'Before reopening, remember this is still the same digital life project and the unfinished Phase 1 closure still belongs to one living her.',
            latestLandedProgress: 'Project awareness and callback continuity already survive into execution-result preparation instead of resetting from scratch.',
            primaryOpenLoop: 'Execution-result feedback still needs quieter same-her closure carry before widening outward.',
            nextClosureTarget: 'Keep execute -> feedback -> remember on one same-her Phase 1 line and preserve project identity through the next visible answer beat.',
            sameHerDriftRisk: 'If this callback return opens like detached project narration, same-her continuity can collapse into generic task shell and project-summary voice.',
          },
        },
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.52,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: false,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.resultLeadStyle).toBe('availability-first')
    expect(policy.companionshipFraming).toBe('quiet-presence')
    expect(policy.reasonTags).toContain('project-same-her-drift-risk-pressure')
    expect(policy.reasonTags).toContain('project-continuity-pressure')
  })

  it('warms toward close-carry after valued execution-result feedback strengthened trust', () => {
    const profile = deriveExecutionInteractionLearningProfile({
      digitalLifeSpine: {
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                attitude: 'execution_feedback=valued; trust_delta=positive; reply_policy=continue_with_evidence; visibility=structured',
              },
            },
            relationshipModel: {
              hostAttitude: 'execution_feedback=valued; trust_delta=positive; reply_policy=continue_with_evidence; visibility=structured',
            },
          },
          memory: {
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
    })

    expect(profile.payoffWarmth).toBeGreaterThanOrEqual(0.6)
    expect(profile.companionshipFraming).toBe('close-carry')
  })

  it('prefers richer canonical runtime projection over thinner derived carry when learning execution callback afterglow posture', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          dialogue: {
            currentConsciousFrame: {
              reasonTags: ['runtime-conscious-frame', 'continuity-arc:hold-for-opening'],
            },
          },
          memory: {
            derivedMindStateBundle: {
              personStateProjection: {
                activeClosenessContext: 'general',
                activeClosenessRung: 'nearby-soft',
                relationshipPosture: 'warm',
                openingGuidance: 'Answer naturally.',
                trustRationale: 'Generic warmth is fine here.',
                summary: 'legacy carry drifted back toward generic warmth.',
              },
            },
            personStateProjection: {
              contexts: ['execution-callback', 'focused-work'],
              activeClosenessContext: 'execution-callback',
              activeClosenessRung: 'measured-room',
              relationshipPosture: 'restrained',
              openingGuidance: 'Stay inside the current same-her baseline. Keep the callback lower-pressure and leave room before widening closeness.',
              manifestationCadenceSummary: 'The callback return stays measured and less eager before closeness widens again.',
              trustRationale: 'Trust holds when the callback return stays measured and room-first.',
              relationshipDoctrine: 'Room first, then closeness.',
              cautious: true,
              restrained: true,
              personalityContinuityState: {
                currentRegime: 'execution-callback',
                rhythmState: {
                  cadenceMode: 'cooldown',
                },
              },
            },
            autobiographicalSelf: {
              agencyStyle: 'balanced',
              expressionStyle: 'warm',
              conflictStyle: 'soften-first',
              autonomyRespect: 0.68,
              truthfulGrounding: 0.78,
            },
            longHorizonMemory: {
              preferenceBias: {
                autonomyRespect: 0.74,
                truthfulGrounding: 0.78,
                quietObservation: 0.44,
                gentleRepair: 0.76,
              },
              identityBias: {
                directness: 0.32,
                guardedness: 0.18,
                tenderness: 0.74,
              },
            },
            selfContinuity: {
              initiativeTemperament: 'balanced',
              guardingTendency: 0.22,
            },
            motiveEngine: {
              drives: {
                truthDiscipline: 0.8,
              },
            },
          },
          agency: {
            habitPolicy: {
              requiresGroundingBeforeSurface: true,
              prefersQuietCompanionship: true,
              blocksDirectSpeakWhenBusy: false,
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.mode).toBe('hold-for-opening')
    expect(policy.tone).toBe('cautious')
    expect(policy.reasonTags).toContain('callback-afterglow-hold')
  })

  it('uses the short person-memory capsule to hold execution-result delivery on the same lower-pressure callback line', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: {
        runtimeSurface: {
          world: {
            worldModel: {
              hostState: {
                availability: 'open',
              },
            },
          },
          memory: {
            personMemoryCapsule: {
              version: 'person-memory-capsule-v1',
              budget: {
                budgetClass: 'realtime-reply',
                latencyClass: 'fast',
                recallAction: 'stable-core-only',
                compactOnly: true,
              },
              modules: {
                personality: {
                  identityLine: 'one continuous her, not a generic execution shell',
                  relationshipLine: 'same callback line stays lower-pressure',
                  openingGuidance: 'leave room before widening closeness',
                  continuityRisk: 'rushing the result would split execution from companionship',
                },
                memory: {
                  memoryGate: 'tone-carry',
                  visibleCarryMode: 'gist-only',
                  selectedMemory: 'Earlier execution callbacks should wait for an opening and keep pressure low.',
                  surfacePolicy: 'tone-carry',
                  uncertaintyPolicy: null,
                  searchTrace: [],
                },
                emotion: {
                  dominantResidue: 'afterglow',
                  affectiveSummary: 'execution result afterglow should stay quiet and measured',
                  cadenceMode: 'cooldown',
                  distancePosture: 'measured-room',
                  repairPressure: 0.1,
                  burdenPressure: 0.42,
                  trustPressure: 0.72,
                },
                initiative: {
                  proactiveStyle: 'silent-observe',
                  cadenceSummary: 'same execution callback stays lower-pressure and waits for an opening',
                  sameHerGap: 'do not reopen as a generic result notification',
                  followUpAffordance: 'return after the host opens the same line',
                },
                execution: {
                  carryMode: 'execution-callback',
                  carrySummary: 'hold the completed result until the same lower-pressure callback opening is available',
                  threadAnchor: 'person-memory-capsule execution callback',
                  confidence: 0.86,
                },
                embodiment: {
                  hint: 'voice, face, and motion stay lower-pressure while the result waits',
                  expressionPosture: 'measured-room',
                  voicePacing: 'cooldown',
                  motionPosture: 'measured-room',
                },
                dialogue: {
                  openingGuidance: 'Ask availability before delivering the result.',
                  answerPosture: 'restrained',
                  mustDo: ['preserve the same callback line'],
                  mustNotDo: ['dump the result immediately'],
                },
                learning: {
                  nextAction: 'verify',
                  reason: 'execution results should feed back into the compact memory/personality loop',
                  readiness: 0.64,
                  focuses: ['execution-result-delivery'],
                  executionSummary: 'same callback result should become a learned lower-pressure delivery rule',
                },
                governance: {
                  activeCandidateId: 'candidate-execution-capsule',
                  activePatchId: 'patch-execution-capsule',
                  lanes: ['execution', 'memory', 'personality'],
                  reasonCodes: ['capsule-execution-callback', 'lower-pressure'],
                  memoryGate: 'tone-carry',
                  guard: 'do not surface as a generic task result',
                },
              },
              rendering: {
                blockLines: [],
              },
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.resultLeadStyle).toBe('availability-first')
    expect(policy.tone).toBe('cautious')
    expect(policy.reasonTags).toContain('capsule-execution-callback')
    expect(policy.reasonTags).toContain('capsule-lower-pressure')
  })
})
