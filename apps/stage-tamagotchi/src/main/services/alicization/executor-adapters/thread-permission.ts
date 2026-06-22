import type { AlicizationTaskThreadRecord } from '@proj-alicization/stage-shared'

import { resolveAlicizationAutonomousDialogueFamilyClassification } from '../runtime-structured-format'

export type AlicizationTaskPermissionMode = 'none' | 'implicit' | 'explicit'
export type AlicizationTaskEffect = 'observe' | 'mutate' | 'high-impact'

function readTaskMetadata(thread: AlicizationTaskThreadRecord) {
  const metadataTask = thread.metadata?.task
  return metadataTask && typeof metadataTask === 'object'
    ? metadataTask as {
      permissionMode?: unknown
      effect?: unknown
      riskBudget?: unknown
      justification?: unknown
    }
    : null
}

function hasAutonomousThreadOwnershipProof(thread: AlicizationTaskThreadRecord) {
  const autonomousDialogueFamily = resolveAlicizationAutonomousDialogueFamilyClassification({
    turnId: thread.turnId,
    origin: thread.origin,
  })

  return {
    autonomousDialogueFamily,
    hasStructuralOwnership: autonomousDialogueFamily.matchedBy.includes('turn-id-prefix'),
  }
}

export function resolveThreadPermissionMode(thread: AlicizationTaskThreadRecord): AlicizationTaskPermissionMode {
  const metadataTask = readTaskMetadata(thread)
  if (metadataTask) {
    const permissionMode = metadataTask.permissionMode
    if (permissionMode === 'explicit' || permissionMode === 'implicit' || permissionMode === 'none')
      return permissionMode
  }

  const { autonomousDialogueFamily } = hasAutonomousThreadOwnershipProof(thread)
  if (autonomousDialogueFamily.isAutonomous)
    return 'none'

  return thread.origin === 'user-turn' ? 'implicit' : 'none'
}

export function isLowRiskAutonomousCodeAgentSelfStartThread(thread: AlicizationTaskThreadRecord) {
  const metadataTask = readTaskMetadata(thread)
  if (!metadataTask)
    return false

  const { autonomousDialogueFamily, hasStructuralOwnership } = hasAutonomousThreadOwnershipProof(thread)
  if (!autonomousDialogueFamily.isAutonomous || !hasStructuralOwnership)
    return false

  return thread.kind === 'codebase-edit'
    && metadataTask.permissionMode === 'none'
    && metadataTask.effect === 'mutate'
    && metadataTask.riskBudget === 'low'
    && metadataTask.justification === 'grounded'
}
