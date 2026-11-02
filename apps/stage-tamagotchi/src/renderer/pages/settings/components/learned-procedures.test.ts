import type { App } from 'vue'

import type { ProcedureCommand, ProcedureSummary } from '../../../../shared/procedure-contracts'

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { createRenderer, defineComponent, h, nextTick, ref, ssrContextKey } from 'vue'

import * as VueRuntime from 'vue'

import LearnedProcedures from './learned-procedures.vue'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('@proj-alicization/electron-vueuse', () => ({ useElectronEventaInvoke: () => invoke }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string, values?: unknown) => `${key}${values ? JSON.stringify(values) : ''}` }) }))
vi.mock('@proj-alicization/ui', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    Button: defineComponent({ setup: (_, { slots }) => () => h('button', slots.default?.()) }),
    Select: defineComponent({ props: ['modelValue', 'options'], emits: ['update:modelValue'], setup: (props, { emit }) => () => h('select', { value: props.modelValue, options: props.options, onInput: (value: string) => emit('update:modelValue', value) }) }),
  }
})
beforeAll(() => {
  const require = createRequire(resolve(import.meta.dirname, '../../../../../../../node_modules/.pnpm/node_modules/compiler-probe.cjs'))
  const compiler = require('@vue/compiler-sfc')
  const filename = resolve(import.meta.dirname, 'learned-procedures.vue')
  const { descriptor } = compiler.parse(readFileSync(filename, 'utf8'), { filename })
  const script = compiler.compileScript(descriptor, { id: filename })
  const template = compiler.compileTemplate({ id: filename, filename, source: descriptor.template.content, compilerOptions: { mode: 'function', bindingMetadata: script.bindings } })
  if (template.errors.length)
    throw new Error(template.errors.join(', '))
  LearnedProcedures.render = runInNewContext(`(function (Vue) {${template.code}})(Vue)`, { Vue: VueRuntime })
})
interface Node { type: string, text: string, props: Record<string, any>, children: Node[], parent: Node | null }
const node = (type: string, text = ''): Node => ({ type, text, props: {}, children: [], parent: null })
const renderer = createRenderer<Node, Node>({
  createElement: type => node(type),
  createText: text => node('#text', text),
  createComment: text => node('#comment', text),
  setText: (target, text) => { target.text = text },
  setElementText: (target, text) => {
    target.text = text
    target.children = []
  },
  parentNode: target => target.parent,
  nextSibling: target => target.parent?.children[target.parent.children.indexOf(target) + 1] ?? null,
  patchProp: (target, key, _previous, value) => { target.props[key] = value },
  insert: (child, parent, anchor) => {
    if (child.parent)
      child.parent.children.splice(child.parent.children.indexOf(child), 1)
    child.parent = parent
    const index = anchor ? parent.children.indexOf(anchor) : -1
    parent.children.splice(index < 0 ? parent.children.length : index, 0, child)
  },
  remove: (child) => {
    if (child.parent)
      child.parent.children.splice(child.parent.children.indexOf(child), 1)
    child.parent = null
  },
})
const apps: App[] = []
afterEach(() => {
  apps.splice(0).forEach(app => app.unmount())
  invoke.mockReset()
})
const find = (root: Node, type: string): Node[] => [...(root.type === type ? [root] : []), ...root.children.flatMap(child => find(child, type))]
const text = (root: Node): string => root.text + root.children.map(text).join('')
async function flush() {
  await Promise.resolve()
  await nextTick()
  await Promise.resolve()
  await nextTick()
}
function fixture(): ProcedureSummary[] {
  return [
    { candidateId: 'old', id: 'skill.old', version: '1'.repeat(64), operations: ['tool.filesystem_write_file'], parameters: [], sourceThreadId: 'old-thread', sourceValid: false, comparisonFamily: 'family', status: 'revoked', evaluating: false, evaluation: { status: 'passed', cases: [{ name: 'different-input-1', passed: true, evidenceHash: 'a'.repeat(64) }], completedAt: 1 } },
    { candidateId: 'new', id: 'skill.new', version: '2'.repeat(64), operations: ['tool.filesystem_write_file'], parameters: [], sourceThreadId: 'new-thread', sourceValid: true, comparisonFamily: 'family', status: 'candidate', evaluating: false, evaluation: null },
  ]
}

it('submits the selected baseline and shows a regression without offering activation; card switches clear the selection', async () => {
  let items = fixture()
  invoke.mockImplementation(async (input: ProcedureCommand) => {
    if (input.action === 'evaluate') {
      const samples = [1, 2].map(index => ({ inputHash: String(index).repeat(64), fulfilled: true, operations: 1, rework: 0, approvals: 0, elapsedMs: 10 }))
      items = items.map(item => item.candidateId === 'new' ? { ...item, evaluation: { status: 'failed', cases: [{ name: 'different-input-1', passed: true, evidenceHash: 'a'.repeat(64) }], completedAt: 2, comparison: { baselineCandidateId: 'old', baselineHash: '1'.repeat(64), verdict: 'regressed', baseline: samples, candidate: samples.map(sample => ({ ...sample, operations: 2 })) } } } : item)
    }
    return { status: input.action === 'list' ? 'listed' : 'failed', items }
  })
  const card = ref('alice')
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(LearnedProcedures, { cardId: card.value }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await flush()
  find(root, 'select')[0].props.onInput('old')
  await flush()
  await find(root, 'button').find(button => text(button).includes('procedures.evaluate'))!.props.onClick()
  await flush()
  expect(invoke).toHaveBeenLastCalledWith({ cardId: 'alice', action: 'evaluate', candidateId: 'new', baselineCandidateId: 'old' })
  expect(text(root)).toContain('comparison_verdict.regressed')
  expect(find(root, 'button').some(button => text(button).includes('procedures.activate'))).toBe(false)
  expect(find(root, 'div').find(item => Object.hasOwn(item.props, 'data-procedure-comparison'))?.props['data-procedure-comparison-baseline']).toBe('1'.repeat(64))
  card.value = 'bob'
  items = fixture()
  await flush()
  await find(root, 'button').find(button => text(button).includes('procedures.evaluate'))!.props.onClick()
  expect(invoke).toHaveBeenLastCalledWith({ cardId: 'bob', action: 'evaluate', candidateId: 'new' })
})
