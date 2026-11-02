import type { ProcedureSample } from './procedure-performance'
import type { ProcedureTemplate } from './procedure-template'

import { describe, expect, it } from 'vitest'

import * as v from 'valibot'

import { compareProcedureSamples, procedureComparisonFamily, procedureSampleSchema } from './procedure-performance'

const samples = (): ProcedureSample[] => [1, 2].map(index => ({ inputHash: String(index).repeat(64), fulfilled: true, operations: 3, rework: 0, approvals: 1, elapsedMs: 1000 }))

describe('paired procedure performance policy', () => {
  it('keeps compatible algorithm changes in one comparison domain and separates changed operation interfaces', () => {
    const baseline: ProcedureTemplate = { version: 1, parameters: [{ name: 'input1', kind: 'path', role: 'file' }], tools: [{ id: 'tool.filesystem_read_file', version: '1', interfaceHash: 'a'.repeat(64) }], criteria: [{ predicate: { kind: 'file-exists' } }], steps: [{ id: 'first' }] }
    const candidate = structuredClone(baseline)
    candidate.steps.push({ id: 'redundant' })
    expect(procedureComparisonFamily(candidate)).toBe(procedureComparisonFamily(baseline))
    candidate.tools[0].interfaceHash = 'b'.repeat(64)
    expect(procedureComparisonFamily(candidate)).not.toBe(procedureComparisonFamily(baseline))
  })

  it('rejects unmatched inputs and missing observations rather than treating absent work as cheap success', () => {
    const baseline = samples()
    expect(compareProcedureSamples(baseline, baseline.slice(0, 1))).toBe('incomparable')
    expect(compareProcedureSamples(baseline, [...baseline].reverse())).toBe('incomparable')
    expect(compareProcedureSamples([], [])).toBe('incomparable')
  })

  it.each(['operations', 'rework', 'approvals'] as const)('blocks a candidate that increases %s at the same completion rate', (field) => {
    const baseline = samples()
    const candidate = structuredClone(baseline)
    candidate[1][field]++
    expect(compareProcedureSamples(baseline, candidate)).toBe('regressed')
  })

  it('prioritizes independently completed work and records timing without using scheduler noise as approval evidence', () => {
    const baseline = samples()
    const candidate = samples()
    candidate[0].fulfilled = false
    candidate[0].operations = 0
    expect(compareProcedureSamples(baseline, candidate)).toBe('regressed')
    baseline[0].fulfilled = false
    candidate[0].fulfilled = true
    candidate[0].operations = 4
    expect(compareProcedureSamples(baseline, candidate)).toBe('improved')
    baseline[0].fulfilled = true
    candidate[0].operations = baseline[0].operations
    candidate[0].elapsedMs = 20000
    expect(compareProcedureSamples(baseline, candidate)).toBe('non-regressing')
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 1000001])('rejects unbounded or invalid observed counters (%s)', (operations) => {
    expect(() => v.parse(procedureSampleSchema, { ...samples()[0], operations })).toThrow()
  })
})
