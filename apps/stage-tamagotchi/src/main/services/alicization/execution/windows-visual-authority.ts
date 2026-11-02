import * as v from 'valibot'

import { windowsWindowIdentitySchema } from './windows-window-identity'

export const windowsVisualAuthoritySchema = v.strictObject({
  userSid: v.pipe(v.string(), v.regex(/^S-1-\d+(?:-\d+){1,15}$/u)),
  sessionId: v.pipe(v.number(), v.integer(), v.minValue(0)),
  integrityLevel: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(65535)),
  ownerWindowId: v.nullable(windowsWindowIdentitySchema.entries.windowId),
})
export type WindowsVisualAuthority = v.InferOutput<typeof windowsVisualAuthoritySchema>
