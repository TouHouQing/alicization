import type { App, Component } from 'vue'

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'

import Vue from '@vitejs/plugin-vue'

import { useAlicizationMemoryWorkbenchStore } from '@proj-alicization/stage-ui/stores/alicization-memory-workbench'
import { createPinia, setActivePinia } from 'pinia'
import { createServer } from 'vite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRenderer, defineComponent, h, nextTick } from 'vue'
import { createI18n } from 'vue-i18n'

import * as VueRuntime from 'vue'

interface TestNode {
  type: string
  text: string
  props: Record<string, unknown>
  children: TestNode[]
  parent: TestNode | null
}

interface SfcCompiler {
  compileScript: (descriptor: unknown, options: { id: string }) => {
    bindings: Record<string, string>
  }
  compileTemplate: (options: {
    id: string
    filename: string
    source: string
    compilerOptions: {
      mode: 'function'
      bindingMetadata: Record<string, string>
    }
  }) => {
    code: string
    errors: unknown[]
  }
  parse: (source: string, options: { filename: string }) => {
    descriptor: {
      script: unknown
      scriptSetup: unknown
      template: {
        content: string
      } | null
    }
  }
}

const appRoot = resolve(import.meta.dirname, '../../../../../..')
const repoRoot = resolve(appRoot, '../..')
const componentPath = resolve(import.meta.dirname, 'persona-training-runs.vue')
const componentUrl = '/src/renderer/pages/settings/modules/components/persona-training-runs.vue'
const requireFromWorkspace = createRequire(pathToFileURL(resolve(repoRoot, 'node_modules/.pnpm/node_modules/test.cjs')))
const compiler = requireFromWorkspace('@vue/compiler-sfc') as SfcCompiler
const mountedApps: App[] = []

const renderer = createRenderer<TestNode, TestNode>({
  patchProp(element, key, _previousValue, nextValue) {
    element.props[key] = nextValue
  },
  insert(child, parent, anchor) {
    child.parent = parent
    if (!anchor) {
      parent.children.push(child)
      return
    }
    const anchorIndex = parent.children.indexOf(anchor)
    parent.children.splice(anchorIndex, 0, child)
  },
  remove(child) {
    const parent = child.parent
    if (!parent)
      return
    const index = parent.children.indexOf(child)
    if (index >= 0)
      parent.children.splice(index, 1)
    child.parent = null
  },
  createElement(type) {
    return createTestNode(type)
  },
  createText(text) {
    return createTestNode('#text', text)
  },
  createComment(text) {
    return createTestNode('#comment', text)
  },
  setText(node, text) {
    node.text = text
  },
  setElementText(node, text) {
    node.text = text
    node.children = []
  },
  parentNode(node) {
    return node.parent
  },
  nextSibling(node) {
    const parent = node.parent
    if (!parent)
      return null
    const index = parent.children.indexOf(node)
    return parent.children[index + 1] ?? null
  },
})

const ButtonStub = defineComponent({
  name: 'Button',
  inheritAttrs: false,
  props: {
    disabled: Boolean,
    label: {
      type: String,
      required: true,
    },
    loading: Boolean,
  },
  setup(props, { attrs }) {
    return () => h('button', {
      ...attrs,
      'data-label': props.label,
      'disabled': props.disabled,
    }, props.label)
  },
})

let PersonaTrainingRuns: Component
let viteServer: Awaited<ReturnType<typeof createServer>>

function createTestNode(type: string, text = ''): TestNode {
  return {
    type,
    text,
    props: {},
    children: [],
    parent: null,
  }
}

function collectText(node: TestNode): string {
  return [node.text, ...node.children.map(collectText)].join('')
}

function findButton(node: TestNode, label: string): TestNode | null {
  if (node.type === 'button' && node.props['data-label'] === label)
    return node
  for (const child of node.children) {
    const match = findButton(child, label)
    if (match)
      return match
  }
  return null
}

function createRun(activation: Record<string, unknown>) {
  return {
    runId: 'run-1',
    cardId: 'default',
    datasetId: 'dataset-1',
    manifestHash: 'manifest-1',
    sourceRefs: [{
      sourceId: 'reflection-1',
      sourceKind: 'cleaned-long-term-reflection',
    }],
    basePersonaRevision: 'persona-core-v1',
    status: 'completed',
    stage: 'finalizing',
    progress: 1,
    progressMessage: null,
    failureReason: null,
    configSnapshot: null,
    artifact: {
      schemaVersion: 'alicization-persona-training-artifact-v1',
      artifactId: 'artifact-1',
      runId: 'run-1',
      kind: 'lora-adapter',
      path: '/tmp/artifact-1/adapter.bin',
      sha256: 'hash',
      sizeBytes: 12,
      baseModel: 'base-model-v1',
      compatibility: {
        status: 'compatible',
        baseModel: 'base-model-v1',
        reason: 'Base model and adapter format match.',
      },
      activation,
      finishedAt: 0,
    },
    error: null,
    queuedAt: 0,
    startedAt: 0,
    updatedAt: 0,
    finishedAt: 0,
    cancellationRequestedAt: null,
  } as const
}

async function mountPersonaTrainingRuns(options?: {
  increment?: Record<string, unknown>
  run?: ReturnType<typeof createRun>
}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useAlicizationMemoryWorkbenchStore()
  const run = options?.run ?? createRun({
    status: 'inactive',
    reason: 'Artifact activation pending at load: loader restart failed.',
  })
  store.personaTrainingRun = run as any
  store.personaTrainingRuns = [run] as any
  store.personaTrainingIncrements = options?.increment ? [options.increment] as any : []

  const refreshRuns = vi.spyOn(store, 'refreshPersonaTrainingRuns').mockResolvedValue(store.personaTrainingRuns)
  const refreshIncrements = vi.spyOn(store, 'refreshPersonaTrainingIncrements').mockResolvedValue(store.personaTrainingIncrements)
  const rollbackIncrement = vi.spyOn(store, 'rollbackPersonaTrainingIncrement').mockResolvedValue(null)
  const root = createTestNode('root')
  const app = renderer.createApp(PersonaTrainingRuns, { datasetId: 'dataset-1' })
  app.use(pinia)
  app.use(createI18n({
    fallbackWarn: false,
    legacy: false,
    locale: 'en',
    messages: { en: {} },
    missingWarn: false,
  }))
  app.provide(VueRuntime.ssrContextKey, { modules: new Set<string>() })
  app.mount(root)
  mountedApps.push(app)
  await nextTick()
  await Promise.resolve()

  return {
    refreshIncrements,
    refreshRuns,
    rollbackIncrement,
    root,
  }
}

beforeAll(async () => {
  viteServer = await createServer({
    root: appRoot,
    configFile: false,
    optimizeDeps: {
      noDiscovery: true,
    },
    plugins: [Vue()],
    server: {
      middlewareMode: true,
    },
  })
  const loadedComponent = (await viteServer.ssrLoadModule(componentUrl)).default
  const source = readFileSync(componentPath, 'utf8')
  const { descriptor } = compiler.parse(source, { filename: componentPath })
  if (!descriptor.template)
    throw new Error('persona-training-runs.vue is missing a template')
  const script = compiler.compileScript(descriptor, { id: 'persona-training-runs-test' })
  const template = compiler.compileTemplate({
    id: 'persona-training-runs-test',
    filename: componentPath,
    source: descriptor.template.content,
    compilerOptions: {
      mode: 'function',
      bindingMetadata: script.bindings,
    },
  })
  if (template.errors.length > 0)
    throw new Error(`failed to compile persona-training-runs.vue: ${template.errors.join(', ')}`)

  // NOTICE: Evaluate Vue's compiler output so the real SFC template can mount without changing Vitest config.
  const render = runInNewContext(`(function (Vue) {${template.code}})(Vue)`, {
    Vue: VueRuntime,
  })
  const originalSetup = loadedComponent.setup
  PersonaTrainingRuns = {
    ...loadedComponent,
    render,
    setup(props: unknown, context: unknown) {
      const setupState = originalSetup(props, context)
      const mountedSetupState = {
        ...setupState,
        Button: ButtonStub,
      }
      Object.defineProperty(mountedSetupState, '__isScriptSetup', {
        value: true,
      })
      return mountedSetupState
    },
  }
})

beforeEach(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  for (const app of mountedApps.splice(0))
    app.unmount()
})

afterAll(async () => {
  await viteServer.close()
})

describe('persona training runs', () => {
  it('shows artifact reasons and prevents rollback while cleanup is pending', async () => {
    const run = createRun({
      status: 'inactive',
      reason: 'Artifact activation pending at load: loader restart failed.',
    })
    const increment = {
      id: 'increment-1',
      kind: 'persona-lora-increment',
      cardId: 'default',
      datasetId: 'dataset-1',
      manifestHash: 'manifest-1',
      sourceRefs: [{
        sourceId: 'reflection-1',
        sourceKind: 'cleaned-long-term-reflection',
      }],
      basePersonaRevision: 'persona-core-v1',
      artifact: run.artifact,
      state: 'available',
      cleanup: {
        status: 'pending',
        stage: 'unload',
        lastError: 'Loader restart failed before unload.',
      },
      createdAt: 0,
      activatedAt: null,
      rolledBackAt: null,
      revokedAt: null,
    }
    const { rollbackIncrement, root } = await mountPersonaTrainingRuns({ increment, run })
    const text = collectText(root)

    expect(text).toContain('Base model and adapter format match.')
    expect(text).toContain('Artifact activation pending at load: loader restart failed.')
    expect(text).toContain('Loader restart failed before unload.')
    const rollbackButton = findButton(root, 'settings.pages.memory.workbench.actions.rollback_persona_increment')
    expect(rollbackButton).not.toBeNull()
    expect(rollbackButton?.props.disabled).toBe(true)
    expect(rollbackIncrement).not.toHaveBeenCalled()
  })

  it('shows the active loader receipt without rendering timestamp zero as the Unix epoch', async () => {
    const run = createRun({
      status: 'active',
      reason: 'Loader accepted the adapter.',
      loaderId: 'loader-local',
      receiptId: 'receipt-1',
      activatedAt: 0,
    })
    const { root } = await mountPersonaTrainingRuns({ run })
    const text = collectText(root)

    expect(text).toContain('Loader accepted the adapter.')
    expect(text).toContain('loader-local')
    expect(text).toContain('receipt-1')
    expect(text).not.toContain(new Date(0).toLocaleString())
  })

  it('refreshes runs and increments from the refresh button', async () => {
    const { refreshIncrements, refreshRuns, root } = await mountPersonaTrainingRuns()
    refreshRuns.mockClear()
    refreshIncrements.mockClear()
    const refreshButton = findButton(root, 'settings.pages.memory.workbench.actions.refresh_persona_training')

    expect(refreshButton).not.toBeNull()
    if (!refreshButton)
      throw new Error('persona training refresh button is missing')
    await (refreshButton.props.onClick as () => Promise<unknown>)()

    expect(refreshRuns).toHaveBeenCalledOnce()
    expect(refreshIncrements).toHaveBeenCalledOnce()
  })
})
