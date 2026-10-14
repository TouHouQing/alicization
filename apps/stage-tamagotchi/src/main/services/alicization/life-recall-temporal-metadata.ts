import * as v from 'valibot'

const time = v.pipe(v.number(), v.integer(), v.minValue(0))
const schema = v.strictObject({
  sourceVersion: v.pipe(v.string(), v.regex(/^[1-9]\d*$/u), v.maxLength(16)),
  temporalScope: v.strictObject({
    version: v.pipe(v.number(), v.integer(), v.minValue(1)),
    perspective: v.picklist(['current', 'historical']),
    provenance: v.picklist(['observed', 'reported', 'remembered', 'inferred', 'imagined', 'fictional']),
    recordedFrom: time,
    recordedTo: v.nullable(time),
    validFrom: v.nullable(time),
    validTo: v.nullable(time),
  }),
})

export function parseLifeRecallTemporalMetadata(record: Record<string, unknown>) {
  if (record.sourceVersion === undefined && record.temporalScope === undefined)
    return {}
  const result = v.parse(schema, { sourceVersion: record.sourceVersion, temporalScope: record.temporalScope })
  const scope = result.temporalScope
  if (String(scope.version) !== result.sourceVersion || scope.recordedTo != null && scope.recordedTo < scope.recordedFrom || scope.validFrom != null && scope.validTo != null && scope.validTo < scope.validFrom)
    throw new TypeError('Memory temporal evidence has inconsistent version or intervals')
  return result
}
