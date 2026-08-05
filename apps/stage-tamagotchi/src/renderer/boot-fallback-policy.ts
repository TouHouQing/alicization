export type AlicizationBootFallbackState = 'booting' | 'mounted' | 'failed'

export type AlicizationBootFallbackErrorSource = 'window-error' | 'unhandledrejection' | 'router-error' | 'vue-error'

export interface AlicizationBootFallbackPromotionDecision {
  promote: boolean
  reason: 'startup-failure' | 'post-mount-runtime'
}

export function shouldPromoteAlicizationBootFallback(input: {
  source: AlicizationBootFallbackErrorSource
  state: AlicizationBootFallbackState
  detail: string
}): AlicizationBootFallbackPromotionDecision {
  if (input.state === 'mounted') {
    return {
      promote: false,
      reason: 'post-mount-runtime',
    }
  }

  return {
    promote: true,
    reason: 'startup-failure',
  }
}
