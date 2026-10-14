import { describe, expect, it } from 'vitest'

import { parseLifeRecallTemporalMetadata } from './life-recall-temporal-metadata'

describe('temporal memory evidence boundary', () => {
  it('rejects contradictory versions, reversed time and unrecognized metadata', () => {
    const scope = { version: 1, perspective: 'historical', provenance: 'reported', recordedFrom: 100, recordedTo: 200, validFrom: null, validTo: null }
    expect(parseLifeRecallTemporalMetadata({ sourceVersion: '1', temporalScope: scope })).toEqual({ sourceVersion: '1', temporalScope: scope })
    expect(() => parseLifeRecallTemporalMetadata({ sourceVersion: '2', temporalScope: scope })).toThrow('inconsistent')
    expect(() => parseLifeRecallTemporalMetadata({ sourceVersion: '1', temporalScope: { ...scope, recordedTo: 50 } })).toThrow('inconsistent')
    expect(() => parseLifeRecallTemporalMetadata({ sourceVersion: '1', temporalScope: { ...scope, privateNotes: 'unexpected' } })).toThrow()
    expect(() => parseLifeRecallTemporalMetadata({ sourceVersion: '1' })).toThrow()
  })
})
