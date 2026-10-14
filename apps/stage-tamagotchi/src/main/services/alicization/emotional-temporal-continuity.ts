import type { AlicizationEmotionalKernelSnapshot, AlicizationEmotionalTemporalState } from '@proj-alicization/stage-shared'

import { createHash } from 'node:crypto'

import * as v from 'valibot'

const bounded = v.pipe(v.number(), v.finite(), v.minValue(-1), v.maxValue(1))
const axesSchema = v.strictObject({ valence: bounded, arousal: bounded, initiativePressure: bounded })
const time = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(8_640_000_000_000_000))
const anchorTime = v.pipe(v.number(), v.integer(), v.minValue(-8_640_000_000_000_000), v.maxValue(8_640_000_000_000_000))
const schema = v.strictObject({ version: v.literal('emotion-temporal-v1'), eventKey: v.pipe(v.string(), v.minLength(1), v.maxLength(512)), anchoredAt: anchorTime, evaluatedAt: time, beforeEvent: axesSchema, eventDelta: axesSchema })
const baseline = { valence: 0.5, arousal: 0.2, initiativePressure: 0 }
const halfLife = { valence: 10 * 60_000, arousal: 5 * 60_000, initiativePressure: 5 * 60_000 }
type Axis = keyof typeof baseline
const axes = Object.keys(baseline) as Axis[]
const clamp = (value: number) => Math.max(0, Math.min(1, value))

export function normalizeEmotionalTemporalState(raw: unknown): AlicizationEmotionalTemporalState | null {
  if (raw == null)
    return null
  return v.parse(schema, raw)
}

export function continueTemporalEmotion(input: { proposed: AlicizationEmotionalKernelSnapshot, previous: AlicizationEmotionalTemporalState | null, now: number, turnId?: string }) {
  const now = v.parse(time, Math.floor(input.now))
  const previous = normalizeEmotionalTemporalState(input.previous)
  const eventKey = input.turnId ? `turn:${input.turnId}` : `context:${createHash('sha256').update(JSON.stringify(input.proposed)).digest('hex')}`
  const shift = previous ? Math.min(0, now - previous.evaluatedAt) : 0
  const anchor = previous ? previous.anchoredAt + shift : now
  const elapsed = Math.max(0, now - anchor)
  const decayed = (axis: Axis) => previous ? baseline[axis] + ((previous.beforeEvent[axis] - baseline[axis]) + previous.eventDelta[axis]) * Math.exp(-Math.LN2 * elapsed / halfLife[axis]) : baseline[axis]
  const output = { ...input.proposed }
  const next: AlicizationEmotionalTemporalState = previous?.eventKey === eventKey
    ? { ...previous, anchoredAt: anchor, evaluatedAt: now }
    : { version: 'emotion-temporal-v1', eventKey, anchoredAt: now, evaluatedAt: now, beforeEvent: { ...baseline }, eventDelta: { ...baseline } }
  for (const axis of axes) {
    if (!previous || previous.eventKey !== eventKey) {
      next.beforeEvent[axis] = clamp(decayed(axis))
      next.eventDelta[axis] = (input.proposed[axis] - baseline[axis]) * (previous ? 0.35 : 1)
      output[axis] = clamp(next.beforeEvent[axis] + next.eventDelta[axis])
    }
    else {
      // The same event is a reread, not another emotional impulse. UTC rollback
      // rebases the anchor while retaining its age; sleep naturally decays carry.
      output[axis] = clamp(decayed(axis))
    }
  }
  return { kernel: output, state: v.parse(schema, next) }
}
