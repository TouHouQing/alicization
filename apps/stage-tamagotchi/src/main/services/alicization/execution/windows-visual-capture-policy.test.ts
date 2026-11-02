import { describe, expect, it, vi } from 'vitest'

import { assertWindowsVisualCapturePolicy } from './windows-visual-capture-policy'

function fixture() {
  const view = { cardId: 'alice', obligations: [{ id: 'goal', generation: 1, status: 'in-progress' }], execution: { slices: [{ ingressId: 'work', state: 'running', planId: 'plan', planRevision: 1 }], plans: [{ id: 'plan', revision: 1, rootObligationId: 'goal', obligationGeneration: 1, sourceEvidenceRefs: ['user:original'] }] } }
  const source = vi.fn(async () => ({ role: 'user', content: 'Please click the save button in the owned application.' }))
  const database = { readLifeState: async () => view, getLifeUserInput: source }
  const check = () => assertWindowsVisualCapturePolicy(database as never, 'alice', 'work')
  return { view, source, check }
}
describe('visual privacy inherits original host restrictions', () => {
  it('reads the persisted original input before allowing current window observation', async () => {
    const f = fixture(); await expect(f.check()).resolves.toBeUndefined()
    expect(f.source).toHaveBeenCalledWith('user:original')
  })
  it.each(['不要截图，直接使用语义控件。', 'Click save without screenshots.', 'no screen capture'])('preserves source restriction %s', async (content) => {
    const f = fixture(); f.source.mockResolvedValue({ role: 'user', content })
    await expect(f.check()).rejects.toMatchObject({ errorCode: 'LOCAL_VISUAL_CAPTURE_NOT_AUTHORIZED' })
  })
  it('refuses a different person or a stale plan revision before reading private source text', async () => {
    const f = fixture(); f.view.execution.plans[0].revision = 2
    await expect(f.check()).rejects.toThrow('CURRENT_WORK_SOURCE_REQUIRED')
    expect(f.source).not.toHaveBeenCalled()
  })
  it('requires the actual host source rather than a model-created description', async () => {
    const f = fixture(); f.view.execution.plans[0].sourceEvidenceRefs = ['observation:model-description']
    await expect(f.check()).rejects.toThrow('HOST_CAPTURE_SOURCE_REQUIRED')
    expect(f.source).not.toHaveBeenCalled()
  })
})
