export interface AlicizationRelationshipDynamicsState {
  hostAttitude: string
  previousHostAttitude: string | null
  obedienceDelta: number
  livelinessDelta: number
  sensibilityDelta: number
  source: string
  createdAt: number
}
