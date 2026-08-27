import type { UseMouseOptions } from '@vueuse/core'

import { defineInvoke } from '@moeru/eventa'
import { cursorScreenPoint, startLoopGetCursorScreenPoint } from '@proj-alicization/electron-eventa'
import { tryOnMounted, useMouse } from '@vueuse/core'
import { ref } from 'vue'

import { getElectronEventaContext } from './use-electron-eventa-context'

let sharedEventTarget: EventTarget | undefined
let startedTracking = false
const cursorScreenPointReady = ref(false)

export function useElectronMouseEventTarget() {
  const context = getElectronEventaContext()

  if (!sharedEventTarget) {
    sharedEventTarget = new EventTarget()

    context.on(cursorScreenPoint, (event) => {
      if (!event?.body || !Number.isFinite(event.body.x) || !Number.isFinite(event.body.y))
        return

      cursorScreenPointReady.value = true
      const e = new MouseEvent('mousemove', { screenX: event.body?.x, screenY: event.body?.y })
      sharedEventTarget?.dispatchEvent(e)
    })
  }

  tryOnMounted(() => {
    if (startedTracking)
      return

    startedTracking = true
    void defineInvoke(context, startLoopGetCursorScreenPoint)().catch((error) => {
      console.warn('[electron-vueuse] Failed to start cursor screen point loop.', error)
    })
  })

  return ref(sharedEventTarget)
}

export function useElectronMouse(options?: UseMouseOptions) {
  const eventTarget = useElectronMouseEventTarget()
  return {
    ...useMouse({ ...options, target: eventTarget, type: 'screen' }),
    isReady: cursorScreenPointReady,
  }
}
