import { describe, expect, it } from 'vitest'

import {
  deriveExecutionInteractionLearningProfile,
  deriveExecutionResultDeliveryPolicy,
} from './execution-interaction-learning'

function buildPreferenceSpine(options: {
  availability?: 'open' | 'focused' | 'immersed'
  hostAttitude?: string
} = {}) {
  return {
    runtimeSurface: {
      world: {
        worldModel: {
          hostState: {
            availability: options.availability ?? 'open',
            ...(options.hostAttitude ? { attitude: options.hostAttitude } : {}),
          },
        },
        ...(options.hostAttitude
          ? {
              relationshipModel: {
                hostAttitude: options.hostAttitude,
              },
            }
          : {}),
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
            companionship: 0.68,
            autonomyRespect: 0.74,
            truthfulGrounding: 0.78,
            quietObservation: 0.44,
            gentleRepair: 0.76,
            proactiveCare: 0.58,
            unfinishedThreadReturn: 0.42,
          },
          identityBias: {
            directness: 0.32,
            guardedness: 0.18,
            tenderness: 0.74,
            selfDirection: 0.5,
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
  }
}

describe('execution interaction learning', () => {
  it('derives payoff framing and lead style from numeric long-horizon preferences', () => {
    const profile = deriveExecutionInteractionLearningProfile({
      digitalLifeSpine: buildPreferenceSpine() as any,
    })

    expect(profile.payoffWarmth).toBeGreaterThan(0.5)
    expect(profile.closurePatience).toBeGreaterThan(0.4)
    expect(['quiet-presence', 'close-carry']).toContain(profile.companionshipFraming)
    expect(['result-first', 'availability-first', 'soft-handoff']).toContain(profile.resultLeadStyle)
  })

  it('carries numeric preference learning into execution result delivery policy', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: buildPreferenceSpine() as any,
      status: 'completed',
    })

    expect(policy.reasonTags.some(tag => tag.startsWith('result-framing:'))).toBe(true)
    expect(policy.reasonTags.some(tag => tag.startsWith('result-lead:'))).toBe(true)
  })

  it('becomes cautious and availability-first after structured intrusive feedback', () => {
    const policy = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: buildPreferenceSpine({
        hostAttitude: 'execution_feedback=intrusive; distance_delta=more_space; reply_policy=lower_pressure; visibility=structured',
      }) as any,
      status: 'completed',
    })

    expect(policy.tone).toBe('cautious')
    expect(policy.resultLeadStyle).toBe('availability-first')
    expect(policy.mode).toBe('check-availability-first')
  })

  it('warms toward close-carry after structured valued feedback', () => {
    const profile = deriveExecutionInteractionLearningProfile({
      digitalLifeSpine: buildPreferenceSpine({
        hostAttitude: 'execution_feedback=valued; trust_delta=positive; reply_policy=continue_with_evidence; visibility=structured',
      }) as any,
    })

    expect(profile.payoffWarmth).toBeGreaterThanOrEqual(0.6)
    expect(profile.companionshipFraming).toBe('close-carry')
  })

  it('does not infer feedback policy from free-form host attitude prose', () => {
    const baseline = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: buildPreferenceSpine() as any,
      status: 'completed',
    })
    const withFreeFormProse = deriveExecutionResultDeliveryPolicy({
      digitalLifeSpine: buildPreferenceSpine({
        hostAttitude: 'This result felt useful, but please leave more space next time.',
      }) as any,
      status: 'completed',
    })

    expect(withFreeFormProse).toEqual(baseline)
  })

  it('holds a callback result only from typed callback and cooldown state', () => {
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
              activeClosenessContext: 'execution-callback',
              personalityContinuityState: {
                currentRegime: 'execution-callback',
                rhythmState: {
                  cadenceMode: 'cooldown',
                },
              },
            },
          },
        },
      } as any,
      status: 'completed',
    })

    expect(policy.mode).toBe('hold-for-opening')
    expect(policy.reasonTags).toContain('callback-afterglow-hold')
  })
})
