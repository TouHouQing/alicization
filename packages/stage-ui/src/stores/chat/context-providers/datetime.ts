import type { ContextMessage } from '../../../types/chat'

import { ContextUpdateStrategy } from '@proj-alicization/server-sdk'
import { nanoid } from 'nanoid'

const DATETIME_CONTEXT_ID = 'system:datetime'

/**
 * Creates a context message containing the current datetime information.
 * This context is injected before each chat message to provide temporal awareness.
 */
export function createDatetimeContext(): ContextMessage {
  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'

  return {
    id: nanoid(),
    contextId: DATETIME_CONTEXT_ID,
    strategy: ContextUpdateStrategy.ReplaceSelf,
    text: JSON.stringify({
      iso: now.toISOString(),
      local: now.toLocaleString(),
      timezone,
      timezoneOffsetMinutes: -now.getTimezoneOffset(),
    }),
    createdAt: Date.now(),
  }
}
