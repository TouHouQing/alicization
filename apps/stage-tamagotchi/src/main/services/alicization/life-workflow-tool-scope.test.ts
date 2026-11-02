import type { Tool } from '@xsai/shared-chat'

import { describe, expect, it, vi } from 'vitest'

import { boundLifeProviderRequest } from './life-provider-budget'
import { selectExplicitLifeWorkflowTools } from './life-workflow-tool-scope'

const operation = (name: string, description = ''): Tool => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties: {} } }, execute: vi.fn() })
describe('explicit life workflow capability projection', () => {
  it('keeps normal capability availability and preserves existing handler references for explicit learned use', () => {
    const tools = [operation('life_execute_work_plan'), operation('life_list_learned_procedures'), operation('life_use_learned_procedure'), operation('filesystem_write_file')]
    expect(selectExplicitLifeWorkflowTools(tools, '请继续帮我完成这件事。').tools).toBe(tools)
    expect(selectExplicitLifeWorkflowTools(tools, 'not_life_execute_work_plan_other').explicit).toBe(false)
    const selected = selectExplicitLifeWorkflowTools(tools, '请调用 life_use_learned_procedure，用新内容完成。')
    expect(selected.tools).toEqual([tools[1], tools[2]])
    expect(selected.tools![1].execute).toBe(tools[2].execute)
    expect(selectExplicitLifeWorkflowTools([tools[0]], 'life_use_learned_procedure').missing).toEqual(['life_use_learned_procedure', 'life_list_learned_procedures'])
  })
  it('fits complete identity, source facts and a new learned request without unrelated large adapter schemas', () => {
    const tools = [operation('life_list_learned_procedures'), operation('life_use_learned_procedure'), operation('unrelated_adapter', 'schema'.repeat(4400))]
    const messages = [{ role: 'system' as const, content: 'identity-and-life-proof'.repeat(1700) }, { role: 'user' as const, content: 'life_list_learned_procedures 然后 life_use_learned_procedure，必须保留我的全部新要求。' }]
    expect(() => boundLifeProviderRequest(messages, tools)).toThrow('PROVIDER_CONTEXT_BUDGET_EXCEEDED')
    expect(boundLifeProviderRequest(messages, selectExplicitLifeWorkflowTools(tools, messages[1].content).tools).messages).toEqual(messages)
  })
})
