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
})
