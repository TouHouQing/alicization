export type AlicizationBootFallbackState = 'booting' | 'mounted' | 'failed'

export type AlicizationBootFallbackErrorSource = 'window-error' | 'unhandledrejection' | 'router-error' | 'vue-error'

export interface AlicizationBootFallbackPromotionDecision {
  promote: boolean
  reason: 'startup-failure' | 'post-mount-runtime' | 'required-tool-missing-guard'
}

const requiredToolMissingPattern = /Model finished without calling required tool:/iu

export function shouldPromoteAlicizationBootFallback(input: {
  source: AlicizationBootFallbackErrorSource
  state: AlicizationBootFallbackState
  detail: string
}): AlicizationBootFallbackPromotionDecision {
  const detail = input.detail.trim()

  if (requiredToolMissingPattern.test(detail)) {
    return {
      promote: false,
      reason: 'required-tool-missing-guard',
    }
  }

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
