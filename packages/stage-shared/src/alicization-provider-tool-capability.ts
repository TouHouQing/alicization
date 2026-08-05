export type AlicizationProviderToolCapabilityObservationSource
  = | 'observed-provider-error'
    | 'observed-provider-success'

export interface AlicizationProviderToolCapabilityObservation {
  supported: boolean
  source: AlicizationProviderToolCapabilityObservationSource
  checkedAt: number
  lastError: string | null
}

export const alicizationProviderToolsUnsupportedErrorCode = 'provider-tools-unsupported'

export function normalizeAlicizationProviderToolCapabilityLastError(
  source: AlicizationProviderToolCapabilityObservationSource,
) {
  return source === 'observed-provider-error'
    ? alicizationProviderToolsUnsupportedErrorCode
    : null
}
