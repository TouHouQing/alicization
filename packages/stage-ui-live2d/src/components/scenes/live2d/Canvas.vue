<script setup lang="ts">
import { Application } from '@pixi/app'
import { extensions } from '@pixi/extensions'
import { Ticker, TickerPlugin } from '@pixi/ticker'
import { Live2DModel } from 'pixi-live2d-display/cubism4'
import { nextTick, onBeforeMount, onErrorCaptured, onMounted, onUnmounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  width: number
  height: number
  resolution?: number
  maxFps?: number
}>(), {
  resolution: 2,
  maxFps: 0,
})

const emit = defineEmits<{ renderError: [code: string | null] }>()
const componentState = defineModel<'pending' | 'loading' | 'mounted'>('state', { default: 'pending' })
const containerRef = ref<HTMLDivElement>()
const isPixiCanvasReady = ref(false)
const pixiApp = ref<Application>()
const pixiAppCanvas = ref<HTMLCanvasElement>()
let disposed = false
let failureCode: string | null = null
let retryPending: Promise<void> | null = null
let removeContextLossListener: (() => void) | undefined

const live2dCanvasDebugStorageKey = 'devtools/embodiment-debug'

function isLive2DCanvasDebugEnabled() {
  try {
    return globalThis.localStorage?.getItem(live2dCanvasDebugStorageKey) === 'true'
  }
  catch {
    return false
  }
}

function logLive2DCanvasTrace(message: string, payload?: Record<string, unknown>) {
  if (!isLive2DCanvasDebugEnabled())
    return

  console.info('[stage-startup-trace][live2d-canvas]', {
    message,
    ...payload,
  })
}

function logLive2DCanvasError(message: string, payload?: Record<string, unknown>) {
  if (!isLive2DCanvasDebugEnabled())
    return

  console.error('[stage-startup-trace][live2d-canvas]', {
    message,
    ...payload,
  })
}

logLive2DCanvasTrace('setup-start')

onErrorCaptured((error, instance, info) => {
  logLive2DCanvasError('captured-error', {
    info,
    component: instance?.$?.type,
    error,
  })
})

function resolveMaxFps(limit?: number) {
  if (!limit || limit <= 0)
    return 0

  return Math.max(1, Math.round(limit))
}

function failRenderer(app: Application | undefined, code: string, error?: unknown) {
  if (disposed || (app && pixiApp.value !== app) || failureCode === code)
    return
  failureCode = code
  app?.ticker.stop()
  isPixiCanvasReady.value = false
  componentState.value = 'loading'
  console.error('[Live2D] Renderer unavailable.', { code, error })
  emit('renderError', code)
}

function destroyCanvas() {
  removeContextLossListener?.()
  removeContextLossListener = undefined
  // A failed destroy keeps its owner for the next retry. Model slots are
  // unpublished and flushed before this application is destroyed.
  pixiApp.value?.destroy(true)
  pixiApp.value = undefined
  pixiAppCanvas.value = undefined
}

function installRenderGuard(app: Application) {
  const guardedRender = () => {
    if (disposed || failureCode || pixiApp.value !== app)
      return
    try {
      app.render()
    }
    catch (error) {
      failRenderer(app, 'LIVE2D_RENDER_FAILED', error)
    }
  }

  app.ticker.remove(app.render, app)
  app.ticker.add(guardedRender)
  app.ticker.maxFPS = resolveMaxFps(props.maxFps)
}

async function initLive2DPixiStage(parent: HTMLDivElement) {
  componentState.value = 'loading'
  isPixiCanvasReady.value = false

  // https://guansss.github.io/pixi-live2d-display/#package-importing
  Live2DModel.registerTicker(Ticker)
  extensions.add(TickerPlugin)
  // We handle the interactions (e.g., mouse-based focusing at) manually
  // extensions.add(InteractionManager)

  pixiApp.value = new Application({
    width: props.width * props.resolution,
    height: props.height * props.resolution,
    backgroundAlpha: 0,
    preserveDrawingBuffer: true,
    autoDensity: false,
    resolution: 1,
  })

  installRenderGuard(pixiApp.value)
  pixiApp.value.stage.scale.set(props.resolution)

  pixiAppCanvas.value = pixiApp.value.view
  const owner = pixiApp.value
  const canvas = pixiAppCanvas.value
  const contextLost = (event: Event) => {
    event.preventDefault()
    failRenderer(owner, 'LIVE2D_CONTEXT_LOST')
  }
  canvas.addEventListener('webglcontextlost', contextLost)
  removeContextLossListener = () => canvas.removeEventListener('webglcontextlost', contextLost)

  // Set CSS styles to make canvas responsive to container
  pixiAppCanvas.value.style.width = '100%'
  pixiAppCanvas.value.style.height = '100%'
  pixiAppCanvas.value.style.objectFit = 'cover'
  pixiAppCanvas.value.style.display = 'block'

  parent.appendChild(pixiApp.value.view)

  isPixiCanvasReady.value = true
  componentState.value = 'mounted'
}

function retryRenderer() {
  if (disposed)
    return Promise.resolve()
  if (retryPending)
    return retryPending
  retryPending = (async () => {
    isPixiCanvasReady.value = false
    componentState.value = 'loading'
    pixiApp.value?.ticker.stop()
    emit('renderError', null)
    await nextTick()
    if (disposed)
      return
    try {
      destroyCanvas()
      failureCode = null
      if (containerRef.value)
        await initLive2DPixiStage(containerRef.value)
    }
    catch (error) {
      failRenderer(pixiApp.value, 'LIVE2D_RENDERER_INITIALIZATION_FAILED', error)
    }
  })().finally(() => { retryPending = null })
  return retryPending
}

function handleResize() {
  const owner = pixiApp.value
  if (owner && !failureCode && !disposed) {
    // Update the internal rendering resolution
    try {
      owner.renderer.resize(props.width * props.resolution, props.height * props.resolution)
      owner.stage.scale.set(props.resolution)
    }
    catch (error) {
      failRenderer(owner, 'LIVE2D_RENDER_FAILED', error)
    }
  }

  // The CSS styles handle the display size, so we don't need to manually set view dimensions
}

watch([() => props.width, () => props.height, () => props.resolution], handleResize)
watch(() => props.maxFps, (limit) => {
  if (pixiApp.value)
    pixiApp.value.ticker.maxFPS = resolveMaxFps(limit)
})

watch(componentState, (state) => {
  logLive2DCanvasTrace('component-state', {
    height: props.height,
    state,
    width: props.width,
  })
}, { immediate: true })

onMounted(async () => {
  logLive2DCanvasTrace('onMounted-enter')
  await retryRenderer()
  logLive2DCanvasTrace('onMounted-exit')
})

onBeforeMount(() => {
  logLive2DCanvasTrace('onBeforeMount')
})
onUnmounted(() => {
  disposed = true
  try {
    destroyCanvas()
  }
  catch (error) {
    console.error('[Live2D] Renderer cleanup failed.', error)
  }
})

async function captureFrame() {
  const frame = new Promise<Blob | null>((resolve) => {
    if (!isPixiCanvasReady.value || !pixiAppCanvas.value || !pixiApp.value)
      return resolve(null)

    try {
      pixiApp.value.render()
    }
    catch (error) {
      failRenderer(pixiApp.value, 'LIVE2D_RENDER_FAILED', error)
      return resolve(null)
    }

    pixiAppCanvas.value.toBlob(resolve)
  })

  return frame
}

function canvasElement() {
  return pixiAppCanvas.value
}

defineExpose({
  retryRenderer,
  captureFrame,
  canvasElement,
})

import.meta.hot?.dispose(() => {
  console.warn('[Dev] Reload on HMR dispose is active for this component. Performing a full reload.')
  window.location.reload()
})
</script>

<template>
  <div ref="containerRef" h-full w-full>
    <slot v-if="isPixiCanvasReady" :app="pixiApp" />
  </div>
</template>
