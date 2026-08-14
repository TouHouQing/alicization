import type {
  AlicizationRuntimeToolCardProjection,
  AlicizationRuntimeToolEventType,
  AlicizationRuntimeToolProjectionUpdate,
} from '@proj-alicization/stage-shared'

import { AlicizationToolEventDeliveryError } from '@proj-alicization/stage-shared'

export function resolveChatToolCallProjection(input: {
  eventType: AlicizationRuntimeToolEventType
  toolCallId?: unknown
  toolName?: unknown
  projection?: AlicizationRuntimeToolProjectionUpdate
}): AlicizationRuntimeToolCardProjection | null {
  const toolCallId = typeof input.toolCallId === 'string'
    ? input.toolCallId.trim()
    : ''
  const toolName = typeof input.toolName === 'string'
    ? input.toolName.trim()
    : ''
  const projection = input.projection
  const card = projection && typeof projection === 'object'
    && projection.card
    && typeof projection.card === 'object'
    && !Array.isArray(projection.card)
    ? projection.card
    : null
  if (
    !toolCallId
    || !projection
    || !card
    || projection.factType !== input.eventType
    || typeof card.toolCallId !== 'string'
    || card.toolCallId !== toolCallId
  ) {
    throw new AlicizationToolEventDeliveryError(
      new Error(
        !projection
          ? 'Server tool event did not include a canonical runtime projection.'
          : 'Server tool event included an invalid canonical runtime projection.',
      ),
      {
        type: input.eventType,
        toolCallId,
        toolName,
      },
    )
  }

  if (projection.traceOnly && !projection.accepted)
    return null

  if (!projection.accepted || projection.traceOnly) {
    throw new AlicizationToolEventDeliveryError(
      new Error('Server tool event included an inconsistent canonical runtime projection.'),
      {
        type: input.eventType,
        toolCallId,
        toolName,
      },
    )
  }

  return card
}
