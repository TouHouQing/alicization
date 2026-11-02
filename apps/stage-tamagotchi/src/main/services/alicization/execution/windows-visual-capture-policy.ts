import type { AlicizationDbService } from '../db'

import { assertExecutionCaptureAllowed } from '../execution-capture-policy'
import { readLifeInputText } from '../life-input-preview'

/** Re-read original host evidence; model target descriptions cannot grant sight. */
export async function assertWindowsVisualCapturePolicy(database: Pick<AlicizationDbService, 'readLifeState' | 'getLifeUserInput'>, cardId: string, turnId: string) {
  const view = await database.readLifeState()
  const slices = view.execution?.slices.filter(slice => slice.ingressId === turnId && slice.state === 'running') ?? []
  if (view.cardId !== cardId || slices.length !== 1)
    throw new Error('WINDOWS_VISUAL_CURRENT_WORK_SOURCE_REQUIRED')
  const slice = slices[0]
  const plan = view.execution?.plans.find(plan => plan.id === slice.planId && plan.revision === slice.planRevision)
  const goal = plan && view.obligations.find(goal => goal.id === plan.rootObligationId)
  if (!plan || !goal || goal.invalidatedBy || goal.generation !== plan.obligationGeneration || ['cancelled', 'superseded', 'failed', 'fulfilled'].includes(goal.status) || !plan.sourceEvidenceRefs.length || plan.sourceEvidenceRefs.length > 64)
    throw new Error('WINDOWS_VISUAL_CURRENT_WORK_SOURCE_REQUIRED')
  const sources = plan.sourceEvidenceRefs.filter(id => id.startsWith('user:'))
  if (!sources.length)
    throw new Error('WINDOWS_VISUAL_HOST_CAPTURE_SOURCE_REQUIRED')
  for (const id of sources) {
    const original = await database.getLifeUserInput(id)
    const text = readLifeInputText(original).text
    if (!text)
      throw new Error('WINDOWS_VISUAL_HOST_CAPTURE_SOURCE_UNAVAILABLE')
    assertExecutionCaptureAllowed(text)
  }
}
