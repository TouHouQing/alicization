import { resolveAlicizationChatFailureSurface } from '@proj-alicization/stage-shared'

/** Missing independent review cannot certify a reply or undo accepted work. */
export class AlicizationReplyGroundingUnavailableError extends Error {
  readonly code = 'LIFE_REPLY_GROUNDING_UNAVAILABLE'
  readonly failureSurface = resolveAlicizationChatFailureSurface({ kind: 'provider-continuation-incomplete' })

  constructor() {
    super('Reply grounding is unavailable; existing work retains its own state and verification')
    this.name = 'AlicizationReplyGroundingUnavailableError'
  }
}
