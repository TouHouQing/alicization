import type { StageEmbodimentPresencePostureMode } from '@proj-alicization/stage-shared'

export interface VrmActionBinding {
  id: string
  fileName: string
  actionKey: string
  label: string
  description: string
  importedAt: number
  source: 'builtin' | 'external-vrma'
  file?: string | File
}

export interface VrmExternalAnimationBinding extends Omit<VrmActionBinding, 'source' | 'file'> {
  source: 'external-vrma'
  file?: File
}

export interface VrmCustomExpressionBinding {
  expressionName: string
  facialKey: string
  label: string
  description: string
  affectsMouth: boolean
  source: 'custom'
}

export interface VrmRuntimeCapabilitySnapshot {
  supportedExpressionNames: string[]
  supportsLookAt: boolean
  supportsVisemeLipSync: boolean
  supportsMicroDynamics: boolean
}

export interface VrmIdleActionPreference {
  binding: VrmActionBinding | null
  confidence: number
  mode: StageEmbodimentPresencePostureMode
}
