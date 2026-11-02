import type { VisualWindowCapture } from './visual-window-observation'

import * as v from 'valibot'

import { windowsPointerActionSchema } from './windows-pointer-types'

const id = v.pipe(v.string(), v.regex(/^visual-window:[a-f0-9-]{36}$/u))
const index = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1))
export const windowsVisualLocateSchema = v.strictObject({ windowTitle: v.pipe(v.string(), v.minLength(1), v.maxLength(180)), targets: v.pipe(v.array(v.pipe(v.string(), v.minLength(1), v.maxLength(500))), v.minLength(1), v.maxLength(2)) })
export const windowsVisualActSchema = v.variant('kind', [
  v.strictObject({ observationId: id, kind: v.literal('click'), button: v.picklist(['left', 'right', 'middle']), targetIndex: index }),
  v.strictObject({ observationId: id, kind: v.literal('drag'), targetIndex: index, toIndex: index }),
  v.strictObject({ observationId: id, kind: v.literal('scroll'), targetIndex: index, direction: v.picklist(['up', 'down']), notches: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(10)) }),
])
export type WindowsVisualLocateInput = v.InferOutput<typeof windowsVisualLocateSchema> & { abortSignal?: AbortSignal }
export type WindowsVisualActInput = v.InferOutput<typeof windowsVisualActSchema> & { abortSignal?: AbortSignal }

/** Only a point retained from this same approved image can become an action. */
export function resolveWindowsVisualAction(input: Omit<WindowsVisualActInput, 'abortSignal'>, native: VisualWindowCapture['native']) {
  const actual = v.parse(windowsVisualActSchema, input)
  const point = (index: number) => {
    const matches = native?.locations.filter(item => item.index === index) ?? []
    if (matches.length !== 1 || matches[0].state !== 'unique' || matches[0].confidence < 0.9 || !matches[0].point)
      throw new Error('WINDOWS_VISUAL_TARGET_NOT_UNAMBIGUOUS')
    return structuredClone(matches[0].point)
  }
  const from = point(actual.targetIndex)
  return v.parse(windowsPointerActionSchema, actual.kind === 'drag'
    ? { kind: actual.kind, from, to: point(actual.toIndex) }
    : actual.kind === 'click'
      ? { kind: actual.kind, button: actual.button, point: from }
      : { kind: actual.kind, point: from, direction: actual.direction, notches: actual.notches })
}
