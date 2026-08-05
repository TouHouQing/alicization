import { describe, expect, it } from 'vitest'

import {
  alicizationProviderToolsUnsupportedErrorCode,
  normalizeAlicizationProviderToolCapabilityLastError,
} from './alicization-provider-tool-capability'

describe('alicization provider tool capability', () => {
  it('maps provider rejection to a stable non-sensitive error code', () => {
    expect(normalizeAlicizationProviderToolCapabilityLastError('observed-provider-error'))
      .toBe(alicizationProviderToolsUnsupportedErrorCode)
  })

  it('clears stale errors after provider tool success', () => {
    expect(normalizeAlicizationProviderToolCapabilityLastError('observed-provider-success'))
      .toBeNull()
  })
})
