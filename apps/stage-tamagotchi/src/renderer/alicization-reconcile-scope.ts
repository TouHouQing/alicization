export interface AlicizationRendererReconcileToken {
  cardId: string
  sessionId: string
  epoch: number
}

export function createAlicizationRendererReconcileKey(input: AlicizationRendererReconcileToken) {
  return `${input.cardId}::${input.sessionId}::${input.epoch}`
}

export function isAlicizationRendererReconcileCurrent(
  token: AlicizationRendererReconcileToken,
  current: AlicizationRendererReconcileToken,
) {
  return token.cardId === current.cardId
    && token.sessionId === current.sessionId
    && token.epoch === current.epoch
}
