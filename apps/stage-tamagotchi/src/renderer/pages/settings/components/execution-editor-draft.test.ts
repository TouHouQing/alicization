import type { App } from 'vue'

import type { TaskAcceptance, WorkPlan, WorkStepResult } from '../../../../shared/execution-contracts'
import type { LifeStateView } from '../../../../shared/life-contracts'

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

import { afterEach, beforeAll, expect, it, vi } from 'vitest'
import { createRenderer, defineComponent, h, nextTick, ref, ssrContextKey } from 'vue'

import * as VueRuntime from 'vue'

import CriteriaEditor from './execution-criteria-editor.vue'
import FutureStepsEditor from './execution-future-steps-editor.vue'
import StepEditor from './execution-step-editor.vue'
import WorkPlans from './execution-work-plans.vue'

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn(async (_input: unknown) => ({ state: 'revised' })) }))
vi.mock('@proj-alicization/electron-vueuse', () => ({ useElectronEventaInvoke: () => invoke }))
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }))
vi.mock('@proj-alicization/ui', async () => {
  const { defineComponent, h } = await import('vue')
  const field = (tag: string) => defineComponent({ props: ['modelValue', 'options'], emits: ['update:modelValue'], setup: (props, { emit }) => () => h(tag, { value: props.modelValue, options: props.options, onInput: (value: string) => emit('update:modelValue', value) }) })
  return { Input: field('input'), Textarea: field('textarea'), Select: field('select'), FieldCheckbox: field('checkbox'), Button: defineComponent({ props: ['label'], setup: props => () => h('button', props.label) }) }
})

beforeAll(() => {
  const require = createRequire(resolve(import.meta.dirname, '../../../../../../../node_modules/.pnpm/node_modules/compiler-probe.cjs'))
  const compiler = require('@vue/compiler-sfc')
  for (const [component, file] of [[StepEditor, 'execution-step-editor.vue'], [CriteriaEditor, 'execution-criteria-editor.vue'], [FutureStepsEditor, 'execution-future-steps-editor.vue'], [WorkPlans, 'execution-work-plans.vue']] as const) {
    const filename = resolve(import.meta.dirname, file)
    const { descriptor } = compiler.parse(readFileSync(filename, 'utf8'), { filename })
    const script = compiler.compileScript(descriptor, { id: file })
    const template = compiler.compileTemplate({ id: file, filename, source: descriptor.template.content, compilerOptions: { mode: 'function', bindingMetadata: script.bindings } })
    if (template.errors.length)
      throw new Error(template.errors.join(', '))
    // Mount the actual client template alongside Vitest's SSR-loaded setup.
    component.render = runInNewContext(`(function (Vue) {${template.code}})(Vue)`, { Vue: VueRuntime })
  }
})

interface TestNode { type: string, text: string, props: Record<string, any>, children: TestNode[], parent: TestNode | null }
const node = (type: string, text = ''): TestNode => ({ type, text, props: {}, children: [], parent: null })
const renderer = createRenderer<TestNode, TestNode>({
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
  invoke.mockClear()
})
function find(root: TestNode, type: string): TestNode[] {
  return [...(root.type === type ? [root] : []), ...root.children.flatMap(child => find(child, type))]
}
function planFixture(): WorkPlan {
  return {
    id: 'plan',
    cardId: 'alice',
    rootThreadId: 'thread',
    rootObligationId: 'goal',
    obligationGeneration: 1,
    revision: 1,
    acceptanceHash: 'original-contract',
    sourceEvidenceRefs: ['host-source'],
    steps: [{ id: 'read-source', dependsOn: [], input: { path: 'C:\\QA\\original.txt' }, inputBindings: [], capabilityId: 'tool.filesystem_read_file', inputHash: 'original-input', acceptanceCriterionIds: [], resourceIds: [], retryMode: 'read-only', state: 'pending', attemptId: null }],
  }
}
function acceptanceFixture(): TaskAcceptance {
  return {
    version: 1,
    cardId: 'alice',
    rootObligationId: 'goal',
    obligationGeneration: 1,
    revision: 1,
    sourceInputIds: ['host-source'],
    permittedResourceIds: [],
    permittedEffectPolicyId: 'local-read',
    stopConditions: [],
    contractHash: 'original-contract',
    criteria: [{ id: 'file', required: true, proofScope: 'structure', predicate: { kind: 'text-content', path: 'C:\\QA\\original.txt', includes: ['original text'] } }],
  }
}
async function submit(root: TestNode) {
  await find(root, 'form')[0].props.onSubmit({ preventDefault() {}, stopPropagation() {} })
  await nextTick()
}

async function mountCriteriaDraft(original: WorkPlan, contract = acceptanceFixture(), observed: WorkStepResult[] = []) {
  const plan = ref(structuredClone(original))
  const acceptance = ref(structuredClone(contract))
  const results = ref(observed)
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(CriteriaEditor, { plan: plan.value, acceptance: acceptance.value, results: results.value }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  return { root, plan, acceptance, results, future: () => find(root, 'section').find(section => Object.hasOwn(section.props, 'data-future-step-edits'))! }
}
const button = (root: TestNode, suffix: string) => find(root, 'button').find(item => item.text === `settings.life.execution.criteria.${suffix}`)!
const select = (root: TestNode, label: string) => find(root, 'select').find(item => item.props['aria-label'] === label)!

it('keeps graph and field drafts together across refresh and submits one host revision', async () => {
  const original = planFixture()
  original.steps.push({ ...structuredClone(original.steps[0]), id: 'save', capabilityId: 'tool.filesystem_write_file', retryMode: 'reconcile-first', input: { path: 'C:\\QA\\future.txt', content: 'future text' }, dependsOn: ['read-source'] })
  original.steps.push({ ...structuredClone(original.steps[0]), id: 'obsolete', dependsOn: ['save'] })
  const { root, plan, acceptance, future } = await mountCriteriaDraft(original)
  expect(find(root, 'div').filter(item => item.props.role === 'alert')).toHaveLength(0)
  select(future(), 'settings.life.execution.edit.step').props.onInput('save')
  await nextTick()
  button(root, 'graph_insert').props.onClick()
  await nextTick()
  const added = select(future(), 'settings.life.execution.edit.step').props.value
  expect(added).toMatch(/^step-/u)
  find(future(), 'input')[0].props.onInput('C:\\QA\\new-file.txt')
  find(future(), 'textarea')[0].props.onInput('new contents 中文🙂')
  await nextTick()
  expect(find(future(), 'input')[0].props.value, 'inserted draft immediately after typing').toBe('C:\\QA\\new-file.txt')
  select(future(), 'settings.life.execution.edit.step').props.onInput('obsolete')
  await nextTick()
  button(root, 'graph_remove').props.onClick()
  await nextTick()
  select(future(), 'settings.life.execution.edit.step').props.onInput(added)
  await nextTick()
  expect(select(future(), 'settings.life.execution.edit.step').props.value, 'selected inserted step after deletion').toBe(added)
  expect(find(future(), 'input')[0].props.value, 'inserted draft after deletion').toBe('C:\\QA\\new-file.txt')
  const dependencies = find(future(), 'checkbox')
  dependencies[0].props.onInput(true)
  await nextTick()
  find(future(), 'checkbox')[1].props.onInput(false)
  await nextTick()
  expect(select(future(), 'settings.life.execution.edit.step').props.value, 'selected inserted step after dependency changes').toBe(added)
  plan.value = structuredClone(original)
  acceptance.value = acceptanceFixture()
  await nextTick()
  expect(find(future(), 'input')[0].props.value).toBe('C:\\QA\\new-file.txt')
  expect(select(future(), 'settings.life.execution.edit.step').props.options.map((item: { value: string }) => item.value)).toEqual(['read-source', 'save', added])
  await submit(root)
  expect(invoke).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ expectedRevision: 1, expectedGeneration: 1, graphChanges: [
    { kind: 'insert-after', stepId: added, templateStepId: 'save', afterStepId: 'save' },
    { kind: 'remove', stepId: 'obsolete' },
    { kind: 'dependencies', stepId: added, dependsOn: ['save', 'read-source'] },
    { kind: 'dependencies', stepId: added, dependsOn: ['read-source'] },
  ], stepChanges: [{ stepId: added, changes: { path: 'C:\\QA\\new-file.txt', content: 'new contents 中文🙂' } }] }))
  plan.value = { ...structuredClone(original), revision: 2 }
  await nextTick()
  await submit(root)
  expect(invoke.mock.calls[1][0]).not.toHaveProperty('graphChanges')
  expect(invoke.mock.calls[1][0]).not.toHaveProperty('stepChanges')
})

it('updates acceptance read choices with graph edits and prevents removal of their current source', async () => {
  const contract = acceptanceFixture()
  contract.criteria = [{ id: 'copied', required: true, proofScope: 'bytes', predicate: { kind: 'file-matches-read', path: 'C:\\QA\\copy.txt', stepId: 'read-source' } }]
  const { root, future } = await mountCriteriaDraft(planFixture(), contract)
  button(root, 'graph_insert').props.onClick()
  await nextTick()
  const added = select(future(), 'settings.life.execution.edit.step').props.value
  const sources = () => select(root, 'settings.life.execution.criteria.read_step')
  expect(sources().props.options.map((item: { value: string }) => item.value)).toEqual(['read-source', added])
  select(future(), 'settings.life.execution.edit.step').props.onInput('read-source')
  await nextTick()
  button(root, 'graph_remove').props.onClick()
  await nextTick()
  expect(find(root, 'div').some(item => item.props.role === 'alert')).toBe(true)
  expect(sources().props.options).toHaveLength(2)
  sources().props.onInput(added)
  await nextTick()
  button(root, 'graph_remove').props.onClick()
  await nextTick()
  expect(sources().props.options.map((item: { value: string }) => item.value)).toEqual([added])
  await submit(root)
  expect(invoke).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ criteria: [expect.objectContaining({ predicate: expect.objectContaining({ stepId: added }) })], graphChanges: [expect.objectContaining({ kind: 'insert-after', stepId: added }), { kind: 'remove', stepId: 'read-source' }] }))
})

it('rejects a dependency cycle in the draft and retains protected work when cloning after it', async () => {
  const original = planFixture()
  original.steps.push({ ...structuredClone(original.steps[0]), id: 'successor', dependsOn: ['read-source'] })
  const { root, results, future } = await mountCriteriaDraft(original)
  expect(find(root, 'div').filter(item => item.props.role === 'alert')).toHaveLength(0)
  find(future(), 'checkbox')[0].props.onInput(true)
  await nextTick()
  expect(find(root, 'div').some(item => item.props.role === 'alert')).toBe(true)
  await submit(root)
  expect(invoke.mock.calls[0][0]).not.toHaveProperty('graphChanges')
  results.value = [{ planId: 'plan', planRevision: 1, stepId: 'read-source', attemptId: 'actual', inputHash: 'original-input', effectId: null, observationRefs: ['observed'], output: {}, state: 'verified', createdAt: 1 }]
  await nextTick()
  expect(select(future(), 'settings.life.execution.edit.step').props.options.map((item: { value: string }) => item.value)).toEqual(['successor'])
  select(root, 'settings.life.execution.criteria.graph_template').props.onInput('read-source')
  select(root, 'settings.life.execution.criteria.graph_after').props.onInput('read-source')
  await nextTick()
  button(root, 'graph_insert').props.onClick()
  await nextTick()
  await submit(root)
  expect(invoke.mock.calls[1][0]).toMatchObject({ graphChanges: [{ kind: 'insert-after', templateStepId: 'read-source', afterStepId: 'read-source' }] })
})

it('explains duplicate mutations without discarding the inserted step or its fields', async () => {
  const { root, future } = await mountCriteriaDraft(planFixture())
  button(root, 'graph_insert').props.onClick()
  await nextTick()
  find(future(), 'input')[0].props.onInput('C:\\QA\\new-source.txt')
  await nextTick()
  invoke.mockRejectedValueOnce(new Error('WORK_GRAPH_DUPLICATE_MUTATION'))
  await submit(root)
  expect(find(root, '#text').some(item => item.text.trim() === 'settings.life.execution.criteria.graph_new_target')).toBe(true)
  expect(find(future(), 'input')[0].props.value).toBe('C:\\QA\\new-source.txt')
  await submit(root)
  const { requestId: _firstRequest, ...first } = invoke.mock.calls[0][0] as Record<string, unknown>
  expect(invoke.mock.calls[1][0]).toMatchObject(first)
})

it('keeps multiple unfinished step drafts across refresh and submits them atomically with requirements', async () => {
  const original = planFixture()
  original.steps.push({ ...structuredClone(original.steps[0]), id: 'save-future', capabilityId: 'tool.filesystem_write_file', input: { path: 'C:\\QA\\future.txt', content: 'original content' } })
  original.steps.push({ ...structuredClone(original.steps[0]), id: 'already-observed' })
  const plan = ref(structuredClone(original))
  const acceptance = ref(acceptanceFixture())
  const results = ref<WorkStepResult[]>([{ planId: original.id, planRevision: original.revision, stepId: 'already-observed', state: 'verified', attemptId: 'observed', inputHash: 'original-input', effectId: 'actual-effect', observationRefs: ['actual-observation'], output: {}, createdAt: 1 }])
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(CriteriaEditor, { plan: plan.value, acceptance: acceptance.value, results: results.value }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  const future = () => find(root, 'section').find(section => Object.hasOwn(section.props, 'data-future-step-edits'))!
  expect(find(future(), 'select')[0].props.options.map((item: { value: string }) => item.value)).toEqual(['read-source', 'save-future'])
  find(future(), 'input')[0].props.onInput('C:\\QA\\new-source.txt')
  await nextTick()
  find(future(), 'select')[0].props.onInput('save-future')
  await nextTick()
  find(future(), 'input')[0].props.onInput('C:\\QA\\by-date\\future.txt')
  find(root, 'textarea')[0].props.onInput('revised required text')
  await nextTick()
  plan.value = structuredClone(original)
  acceptance.value = acceptanceFixture()
  results.value = [...results.value]
  await nextTick()
  expect(find(future(), 'input')[0].props.value).toBe('C:\\QA\\by-date\\future.txt')
  expect(find(root, 'textarea')[0].props.value).toBe('revised required text')
  await submit(root)
  expect(invoke).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ planId: original.id, expectedRevision: original.revision, criteria: [expect.objectContaining({ predicate: expect.objectContaining({ includes: ['revised required text'] }) })], stepChanges: [{ stepId: 'read-source', changes: { path: 'C:\\QA\\new-source.txt' } }, { stepId: 'save-future', changes: { path: 'C:\\QA\\by-date\\future.txt' } }] }))
  expect(original.steps[0].input.path).toBe('C:\\QA\\original.txt')
  const newer = structuredClone(original)
  newer.revision++
  plan.value = newer
  await nextTick()
  await submit(root)
  expect(invoke.mock.calls[1][0]).not.toHaveProperty('stepChanges')
})

it('clears the previous success before a new criteria edit and keeps it absent while the new save is pending', async () => {
  const view = { cardId: 'alice', obligations: [{ id: 'goal', generation: 1, status: 'blocked', summary: 'Current work', proof: { acceptance: acceptanceFixture() } }], execution: { plans: [planFixture()], results: [], slices: [] } } as unknown as LifeStateView
  const root = node('root')
  const refresh = vi.fn(async () => {})
  const app = renderer.createApp(defineComponent({ setup: () => () => h(WorkPlans, { view, refresh }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  const edit = () => find(root, 'button').find(button => button.text === 'settings.life.execution.criteria.title')!.props.onClick()
  const success = () => find(root, 'p').filter(paragraph => paragraph.props.role === 'status' && paragraph.text === 'settings.life.execution.criteria.saved')
  edit()
  await nextTick()
  await submit(root)
  await nextTick()
  expect(success()).toHaveLength(1)
  edit()
  await nextTick()
  expect(success()).toHaveLength(0)
  let finish!: (value: { state: string }) => void
  let refreshFinished!: () => void
  refresh.mockImplementationOnce(() => new Promise<void>(resolve => refreshFinished = resolve))
  invoke.mockImplementationOnce(() => new Promise(resolve => finish = resolve))
  const saving = submit(root)
  await nextTick()
  expect(success()).toHaveLength(0)
  finish({ state: 'revised' })
  await saving
  await nextTick()
  expect(success()).toHaveLength(0)
  refreshFinished()
  await vi.waitFor(() => expect(success()).toHaveLength(1))
})

it('preserves the actual step input and submitted payload across unrelated execution view refreshes', async () => {
  const plan = ref(planFixture())
  const results = ref<WorkStepResult[]>([])
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(StepEditor, { plan: plan.value, results: results.value }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  find(root, 'input')[0].props.onInput('C:\\QA\\corrected.txt')
  await nextTick()
  plan.value = structuredClone(planFixture())
  results.value = []
  await nextTick()
  expect(find(root, 'input')[0].props.value).toBe('C:\\QA\\corrected.txt')
  await submit(root)
  expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ planId: 'plan', expectedRevision: 1, stepId: 'read-source', changes: { path: 'C:\\QA\\corrected.txt' } }))
})

it('preserves edited acceptance fields across same-contract snapshots and submits those actual edits', async () => {
  const plan = ref(planFixture())
  const acceptance = ref(acceptanceFixture())
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(CriteriaEditor, { plan: plan.value, acceptance: acceptance.value }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  find(root, 'input')[0].props.onInput('C:\\QA\\corrected.txt')
  find(root, 'textarea')[0].props.onInput('new required text')
  await nextTick()
  plan.value = planFixture()
  acceptance.value = acceptanceFixture()
  await nextTick()
  expect(find(root, 'input')[0].props.value).toBe('C:\\QA\\corrected.txt')
  expect(find(root, 'textarea')[0].props.value).toBe('new required text')
  await submit(root)
  expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ criteria: [expect.objectContaining({ predicate: { kind: 'text-content', path: 'C:\\QA\\corrected.txt', includes: ['new required text'] } })] }))
})

it('reloads a new plan revision rather than carrying an obsolete path into another revision', async () => {
  const plan = ref(planFixture())
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(StepEditor, { plan: plan.value, results: [] }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  find(root, 'input')[0].props.onInput('C:\\QA\\unsaved.txt')
  await nextTick()
  const newer = planFixture()
  newer.revision = 2
  newer.steps[0].input.path = 'C:\\QA\\new-revision.txt'
  plan.value = newer
  await nextTick()
  expect(find(root, 'input')[0].props.value).toBe('C:\\QA\\new-revision.txt')
  await submit(root)
  expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ expectedRevision: 2, changes: { path: 'C:\\QA\\new-revision.txt' } }))
})

it('keeps an added requirement during refresh and reloads a genuinely changed contract', async () => {
  const plan = ref(planFixture())
  const acceptance = ref(acceptanceFixture())
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(CriteriaEditor, { plan: plan.value, acceptance: acceptance.value }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  find(root, 'button').find(button => button.text === 'settings.life.execution.criteria.add')!.props.onClick()
  await nextTick()
  expect(find(root, 'fieldset')).toHaveLength(2)
  acceptance.value = acceptanceFixture()
  await nextTick()
  expect(find(root, 'fieldset')).toHaveLength(2)
  const next = acceptanceFixture()
  next.contractHash = 'new-contract'
  next.obligationGeneration = 2
  acceptance.value = next
  await nextTick()
  expect(find(root, 'fieldset')).toHaveLength(1)
  await submit(root)
  expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ contractHash: 'new-contract', expectedGeneration: 2 }))
})

it('moves to the remaining editable step when a result becomes verified', async () => {
  const plan = planFixture()
  plan.steps.push({ ...plan.steps[0], id: 'other-source', input: { path: 'C:\\QA\\other.txt' } })
  const results = ref<WorkStepResult[]>([])
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(StepEditor, { plan, results: results.value }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  results.value = [{ planId: 'plan', planRevision: 1, stepId: 'read-source', attemptId: 'actual-attempt', inputHash: 'original-input', effectId: null, observationRefs: ['observation'], output: {}, state: 'verified', createdAt: 1 }]
  await nextTick()
  expect(find(root, 'input')[0].props.value).toBe('C:\\QA\\other.txt')
  await submit(root)
  expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ stepId: 'other-source', changes: { path: 'C:\\QA\\other.txt' } }))
})

it('does not carry a draft across cards even if plan IDs and revisions happen to match', async () => {
  const plan = ref(planFixture())
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(StepEditor, { plan: plan.value, results: [] }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  find(root, 'input')[0].props.onInput('C:\\QA\\private-draft.txt')
  await nextTick()
  plan.value = { ...planFixture(), cardId: 'other-card' }
  await nextTick()
  expect(find(root, 'input')[0].props.value).toBe('C:\\QA\\original.txt')
  await submit(root)
  expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ cardId: 'other-card', changes: { path: 'C:\\QA\\original.txt' } }))
})

it('edits the existing delegated command and literal argument vector without exposing permission or effect controls', async () => {
  const plan = planFixture()
  plan.steps[0] = { ...plan.steps[0], capabilityId: 'coding_agent.cli', input: { command: 'node', args: ['--version'], cwd: 'C:\\QA', effect: 'mutate', permissionMode: 'implicit' } }
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(StepEditor, { plan, results: [] }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  expect(find(root, 'textarea')).toHaveLength(2)
  expect(find(root, 'input')).toHaveLength(1)
  expect(find(root, 'textarea').map(field => field.props.maxlength)).toEqual([8000, 12000])
  const args = JSON.stringify(['-e', 'console.log("中文; literal")'])
  find(root, 'textarea')[1].props.onInput(args)
  await nextTick()
  await submit(root)
  expect(invoke).toHaveBeenCalledWith(expect.objectContaining({ changes: { command: 'node', cwd: 'C:\\QA', args } }))
})

it('submits only one revision while the first save is pending', async () => {
  let finish!: () => void
  invoke.mockImplementationOnce(() => new Promise((resolve) => {
    finish = () => resolve({ state: 'revised' })
  }))
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(StepEditor, { plan: planFixture(), results: [] }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  const form = find(root, 'form')[0]
  const event = () => ({ preventDefault() {}, stopPropagation() {} })
  const first = form.props.onSubmit(event())
  await nextTick()
  await form.props.onSubmit(event())
  expect(invoke).toHaveBeenCalledOnce()
  finish()
  await first
})

it('shows the actual native foreground blocker, distinguishes unknown effects and removes stale advice after refresh', async () => {
  const plan = planFixture()
  plan.steps[0] = { ...plan.steps[0], capabilityId: 'tool.desktop_click_element', input: { role: 'menu-item', text: 'Owned file options' } }
  const step = plan.steps[0]
  const view = ref({ cardId: 'alice', obligations: [{ id: 'goal', cardId: 'alice', threadId: 'thread', generation: 1, status: 'blocked', summary: 'Current native work', proof: { acceptance: acceptanceFixture() } }], effects: [{ id: 'effect', kind: 'execute', actionId: step.id, turnId: 'task-run:current', status: 'settled', payload: { capabilityId: step.capabilityId }, receipt: { outcome: 'failure', output: { ok: false, channel: 'desktop', operation: 'desktop_click_element', errorCode: 'WINDOWS_UIA_FOREGROUND_REQUIRED', requiresForeground: true, effectMayHaveOccurred: false, sideEffectState: 'none' } } }], execution: { plans: [plan], results: [{ planId: plan.id, planRevision: 1, stepId: step.id, inputHash: step.inputHash, effectId: 'effect', state: 'blocked', attemptId: 'attempt' }], slices: [{ planId: plan.id, planRevision: 1, attemptId: 'attempt', ingressId: 'task-run:current', state: 'waiting' }] } } as unknown as LifeStateView)
  const root = node('root')
  const app = renderer.createApp(defineComponent({ setup: () => () => h(WorkPlans, { view: view.value, refresh: async () => {} }) }))
  app.provide(ssrContextKey, { modules: new Set() })
  apps.push(app)
  app.mount(root)
  await nextTick()
  const hints = () => find(root, 'p').filter(paragraph => Object.hasOwn(paragraph.props, 'data-work-blocker'))
  expect(hints().map(hint => hint.text)).toEqual(['settings.life.execution.blocker.native-target-required'])
  expect(find(root, 'button').find(button => button.text === 'settings.life.execution.resume')!.props.disabled).toBe(true)
  const current = view.value.execution!.plans[0]
  current.steps[0].input.windowTitle = 'Exact accepted window'
  current.steps[0].dependsOn = ['observe']
  current.steps.unshift({ ...current.steps[0], id: 'observe', capabilityId: 'tool.desktop_list_interactables', input: { windowTitle: 'Exact accepted window' }, dependsOn: [] })
  view.value.execution!.results.push({ ...view.value.execution!.results[0], stepId: 'observe', effectId: null, state: 'verified' })
  await nextTick()
  expect(hints().map(hint => hint.text)).toEqual(['settings.life.execution.blocker.foreground-required'])
  const recheck = find(root, 'button').find(button => button.text === 'settings.life.execution.native_recheck')!
  expect(recheck.props.disabled).toBe(false)
  expect(find(root, 'button').some(button => button.text === 'settings.life.execution.resume')).toBe(false)
  await recheck.props.onClick()
  expect(invoke).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ cardId: 'alice', planId: plan.id, expectedRevision: 1, requestId: expect.any(String) }))
  const output = view.value.effects[0].receipt!.output as Record<string, unknown>
  output.errorCode = 'WINDOWS_UIA_OBSERVATION_REQUIRED'
  await nextTick()
  expect(hints().map(hint => hint.text)).toEqual(['settings.life.execution.blocker.observation-required'])
  const observeAgain = find(root, 'button').find(button => button.text === 'settings.life.execution.native_recheck')
  expect(observeAgain, 'A known no-input observation refusal must offer the explicit window recheck control').toBeDefined()
  expect(observeAgain!.props.disabled).toBe(false)
  expect(find(root, 'button').some(button => button.text === 'settings.life.execution.resume')).toBe(false)
  await observeAgain!.props.onClick()
  expect(invoke).toHaveBeenCalledTimes(2)
  current.steps[1].capabilityId = 'tool.desktop_locate_window'
  view.value.effects[0].payload.capabilityId = 'tool.desktop_locate_window'
  output.operation = 'desktop_locate_window'
  output.errorCode = 'WINDOWS_VISUAL_GROUNDING_UNAVAILABLE'
  await nextTick()
  expect(hints().map(hint => hint.text)).toEqual(['settings.life.execution.blocker.provider-unavailable'])
  const retryVision = find(root, 'button').find(button => button.text === 'settings.life.execution.native_recheck')!
  expect(retryVision.props.disabled).toBe(false)
  await retryVision.props.onClick()
  expect(invoke).toHaveBeenCalledTimes(3)
  view.value.execution!.results[0].state = 'awaiting-verification'
  view.value.effects[0].status = 'uncertain'
  await nextTick()
  expect(hints().map(hint => hint.text)).toEqual(['settings.life.execution.blocker.result-unknown'])
  expect(find(root, 'button').some(button => button.text === 'settings.life.execution.native_recheck')).toBe(false)
  expect(find(root, 'button').find(button => button.text === 'settings.life.execution.resume')!.props.disabled).toBe(true)
  view.value.execution!.results[0].state = 'verified'
  await nextTick()
  expect(hints()).toEqual([])
  view.value.execution!.results[0].state = 'blocked'
  view.value.effects[0].status = 'settled'
  view.value.execution!.plans[0].revision = 2
  await nextTick()
  expect(hints()).toEqual([])
})
