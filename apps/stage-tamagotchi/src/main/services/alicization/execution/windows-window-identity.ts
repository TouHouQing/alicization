import * as v from 'valibot'

const identityText = v.pipe(v.string(), v.minLength(1), v.maxLength(256))

/** Common native window identity; foreground focus is a separate input concern. */
export const windowsWindowIdentitySchema = v.strictObject({
  windowId: v.pipe(v.string(), v.regex(/^[1-9]\d{0,18}$/u)),
  processId: v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(0x7FFF_FFFF)),
  processStartTicks: v.pipe(v.string(), v.regex(/^[1-9]\d{17,18}$/u)),
  windowClass: identityText,
  desktop: identityText,
})
export type WindowsWindowIdentity = v.InferOutput<typeof windowsWindowIdentitySchema>
