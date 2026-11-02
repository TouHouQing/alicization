import type { AlicizationDbService } from '../db'
import type { WindowsWindowIdentity } from './windows-window-identity'

import { visualSemanticWindowSource, visualWorkObservationSource } from '../../../../shared/visual-work-observation'
import { executionDigest } from './acceptance-compiler'

export interface WindowsVisualWorkWindowBinding {
  turnId: string
  effectId: string
  window: WindowsWindowIdentity & { title: string, ownerWindowId: string | null }
  observationId?: string
}

const object = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null
const identity = (value: Record<string, unknown>) => ({ windowId: value.windowId, processId: value.processId, processStartTicks: value.processStartTicks, windowClass: value.windowClass, desktop: value.desktop, ownerWindowId: value.ownerWindowId })

/** Compare the exact active life action to its committed semantic dependency. */
export async function assertWindowsVisualWorkWindow(database: Pick<AlicizationDbService, 'readLifeState' | 'getLifeEffect'>, cardId: string, binding: WindowsVisualWorkWindowBinding) {
  const view = await database.readLifeState()
  const slices = view.execution?.slices.filter(slice => slice.ingressId === binding.turnId && slice.state === 'running') ?? []
  const effect = await database.getLifeEffect(binding.effectId)
  if (view.cardId !== cardId || slices.length !== 1 || effect?.status !== 'dispatched' || effect.turnId !== binding.turnId)
    throw new Error('WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED')
  const slice = slices[0]
  const plan = view.execution?.plans.find(plan => plan.id === slice.planId && plan.revision === slice.planRevision)
  const goal = plan && view.obligations.find(goal => goal.id === plan.rootObligationId)
  const step = plan?.steps.find(step => step.id === effect.actionId && step.capabilityId === effect.payload.capabilityId)
  if (!plan || !goal || !step || goal.invalidatedBy || goal.generation !== plan.obligationGeneration || ['cancelled', 'superseded', 'failed', 'fulfilled'].includes(goal.status))
    throw new Error('WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED')
  const results = view.execution?.results ?? []
  const pointer = step.capabilityId === 'tool.desktop_pointer_action' ? visualWorkObservationSource(plan, step, results) : null
  const locate = step.capabilityId === 'tool.desktop_locate_window' ? step : pointer?.locate
  const source = locate && visualSemanticWindowSource(plan, locate, results)
  if (!locate || !source)
    throw new Error('WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED')
  async function readSource(id: string, inputHash: string) {
    const matches = results.filter(result => result.planId === plan!.id && result.planRevision === plan!.revision && result.stepId === id && result.inputHash === inputHash && result.state === 'verified')
    const original = matches.length === 1 && matches[0].effectId ? await database.getLifeEffect(matches[0].effectId) : null
    const output = object(original?.receipt?.output)
    if (original?.actionId !== id || original.status !== 'settled' || original.receipt?.outcome !== 'success' || output?.ok !== true || output.channel !== 'desktop')
      throw new Error('WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED')
    return { original, output }
  }
  const semantic = await readSource(source.id, source.inputHash)
  if (semantic.original.payload.capabilityId !== 'tool.desktop_list_interactables' || semantic.output.operation !== 'desktop_list_interactables'
    || semantic.output.title !== binding.window.title || executionDigest(identity(semantic.output)) !== executionDigest(identity({ ...binding.window }))) {
    throw new Error('WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED')
  }
  if (pointer) {
    const located = await readSource(locate.id, locate.inputHash)
    const parameters = object(effect.payload.parameters)
    if (located.original.payload.capabilityId !== 'tool.desktop_locate_window' || located.original.turnId !== binding.turnId || located.output.operation !== 'desktop_locate_window'
      || !binding.observationId || parameters?.observationId !== binding.observationId || located.output.observationId !== binding.observationId
      || located.output.title !== binding.window.title || executionDigest(identity(located.output)) !== executionDigest(identity({ ...binding.window }))) {
      throw new Error('WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED')
    }
  }
  else if (object(effect.payload.parameters)?.windowTitle !== binding.window.title) {
    throw new Error('WINDOWS_VISUAL_BOUND_WINDOW_REQUIRED')
  }
}
