import { defineInvoke } from '@moeru/eventa'
import { bounds, startLoopGetBounds } from '@proj-alicization/electron-eventa'
import { tryOnMounted } from '@vueuse/core'
import { ref } from 'vue'

import { getElectronEventaContext } from './use-electron-eventa-context'

const windowBoundsX = ref(0)
const windowBoundsY = ref(0)
const windowBoundsWidth = ref(0)
const windowBoundsHeight = ref(0)
const windowBoundsReady = ref(false)

let initialized = false

function initializeWindowBoundsTracking() {
  if (initialized) {
    return
  }

  initialized = true
  const context = getElectronEventaContext()

  context.on(bounds, (event) => {
    if (!event || !event.body)
      return

    windowBoundsX.value = event.body.x
    windowBoundsY.value = event.body.y
    windowBoundsWidth.value = event.body.width
    windowBoundsHeight.value = event.body.height
    windowBoundsReady.value = event.body.width > 0 && event.body.height > 0
  })

  tryOnMounted(() => {
    void defineInvoke(context, startLoopGetBounds)().catch((error) => {
      console.warn('[electron-vueuse] Failed to start window bounds loop.', error)
    })
  })
}

export function useElectronWindowBounds() {
  initializeWindowBoundsTracking()

  return {
    x: windowBoundsX,
    y: windowBoundsY,
    width: windowBoundsWidth,
    height: windowBoundsHeight,
    isReady: windowBoundsReady,
  }
}
