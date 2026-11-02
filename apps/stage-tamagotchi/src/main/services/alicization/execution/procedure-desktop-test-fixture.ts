import type { WorkPlan } from '../../../../shared/execution-contracts'

import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export function desktopProcedureExample() {
  const windowTitle = 'Private editor title'
  const path = join(tmpdir(), 'private-native-note.txt')
  const content = 'Private native editor content'
  const steps = [
    { id: 'read-entry', capabilityId: 'tool.desktop_list_interactables', input: { windowTitle, maxItems: 40 }, dependsOn: [], acceptanceCriterionIds: [] },
    { id: 'type', capabilityId: 'tool.desktop_type_text', input: { windowTitle, text: content, clearExisting: true, role: 'input', exactText: true }, inputBindings: [{ parameter: 'role', stepId: 'read-entry', path: ['elements'], select: { field: 'role', equals: 'input', valueField: 'role' } }], dependsOn: ['read-entry'], acceptanceCriterionIds: [] },
    { id: 'read-save', capabilityId: 'tool.desktop_list_interactables', input: { windowTitle, maxItems: 40 }, dependsOn: ['type'], acceptanceCriterionIds: [] },
    { id: 'save', capabilityId: 'tool.desktop_click_element', input: { windowTitle, text: 'Private save', role: 'button', exactText: true }, inputBindings: [{ parameter: 'text', stepId: 'read-save', path: ['elements'], select: { field: 'name', equals: 'Private save', valueField: 'name' } }], dependsOn: ['read-save'], acceptanceCriterionIds: ['bytes'] },
  ].map(step => ({ ...step, resourceIds: [], retryMode: 'reconcile-first' as const, state: 'pending' as const, attemptId: null, inputHash: 'source-admission' }))
  const plan: WorkPlan = { id: 'private-plan', cardId: 'alice', rootThreadId: 'private-task', rootObligationId: 'task:private-task', obligationGeneration: 1, revision: 1, acceptanceHash: 'unused-by-template', sourceEvidenceRefs: ['private-input'], steps }
  const criteria = [{ id: 'bytes', required: true, proofScope: 'bytes' as const, predicate: { kind: 'file-bytes' as const, path, sha256: createHash('sha256').update(content).digest('hex') } }]
  return { plan, criteria }
}
