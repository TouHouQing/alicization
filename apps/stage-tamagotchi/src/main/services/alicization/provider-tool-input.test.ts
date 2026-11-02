import { tool } from '@xsai/tool'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { adaptAlicizationProviderTools } from './provider-tool-compatibility'
import { projectProviderToolInput, withProviderToolInputProjection } from './provider-tool-input'

describe('local provider input projection lifecycle', () => {
  it('survives actual provider adapters while remaining absent from provider JSON and preserving the original input', async () => {
    const execute = vi.fn()
    const created = await tool({ name: 'literal_test', description: 'Test local projection', parameters: z.object({ text: z.string() }).strict(), execute })
    const projected = withProviderToolInputProjection(created, async input => ({ input: { ...input, text: 'Exact source bytes' }, projection: { sourceHash: 'hash', actionAdmitted: false } }))
    const adapted = adaptAlicizationProviderTools({ providerId: 'openai-compatible', tools: [{ ...projected, execute: created.execute }] })![0]
    expect(JSON.stringify(adapted)).not.toContain('Exact source bytes')
    const original = { text: 'Model bytes' }
    const record = vi.fn()
    expect(await projectProviderToolInput(adapted, original, new AbortController().signal, record)).toEqual({ text: 'Exact source bytes' })
    expect(original).toEqual({ text: 'Model bytes' })
    expect(record).toHaveBeenCalledWith({ sourceHash: 'hash', actionAdmitted: false })
    expect(execute).not.toHaveBeenCalled()
  })

  it('discards late projected arguments and evidence after cancellation', async () => {
    const controller = new AbortController()
    let complete!: () => void
    const created = await tool({ name: 'literal_test', description: 'Test cancellation', parameters: z.object({}).strict(), execute: vi.fn() })
    const projected = withProviderToolInputProjection(created, async (input) => {
      await new Promise<void>((resolve) => { complete = resolve })
      return { input, projection: { actionAdmitted: false } }
    })
    const record = vi.fn()
    const result = projectProviderToolInput(projected, {}, controller.signal, record)
    controller.abort()
    await expect(result).rejects.toThrow()
    complete()
    await Promise.resolve()
    expect(record).not.toHaveBeenCalled()
  })
})
