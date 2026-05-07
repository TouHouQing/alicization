import { describe, expect, it } from 'vitest'

import {
  resolveAlicizationRuntimeMindTurnStructuredFormat,
  resolveAlicizationStructuredFormatLane,
} from './runtime-structured-format'

describe('runtime structured format', () => {
  it('keeps mind-turn-v1 as the only normal governed user-turn format', () => {
    expect(resolveAlicizationRuntimeMindTurnStructuredFormat({
      rawFormat: 'mind-turn-v1',
      hasGovernance: true,
      origin: 'ui-user',
    })).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      lane: 'normal',
      legacyInputFormat: null,
    }))
  })

  it('migrates governed epoch1 payloads as legacy input instead of final output format', () => {
    expect(resolveAlicizationRuntimeMindTurnStructuredFormat({
      rawFormat: 'epoch1-v1',
      hasGovernance: true,
      origin: 'ui-user',
    })).toEqual(expect.objectContaining({
      format: 'mind-turn-v1',
      lane: 'legacy-input',
      legacyInputFormat: 'epoch1-v1',
    }))
  })

  it('classifies fallback-v1 as infra fallback rather than normal reply format', () => {
    expect(resolveAlicizationRuntimeMindTurnStructuredFormat({
      rawFormat: 'fallback-v1',
      contractFailed: true,
      hasGovernance: false,
      origin: 'ui-user',
    })).toEqual(expect.objectContaining({
      format: 'fallback-v1',
      lane: 'infra-fallback',
      legacyInputFormat: 'fallback-v1',
    }))
    expect(resolveAlicizationStructuredFormatLane('fallback-v1')).toBe('infra-fallback')
  })
})
