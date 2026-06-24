import type { Plugin } from 'vue'
import type { RouteRecordRaw } from 'vue-router'

import Tres from '@tresjs/core'

import { autoAnimatePlugin } from '@formkit/auto-animate/vue'
import { errorMessageFrom } from '@moeru/std'
import { MotionPlugin } from '@vueuse/motion'
import { createPinia } from 'pinia'
import { setupLayouts } from 'virtual:generated-layouts'
import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

import App from './App.vue'

import { shouldPromoteAlicizationBootFallback } from './boot-fallback-policy'
import { i18n } from './modules/i18n'

import './modules/posthog'
import '@unocss/reset/tailwind.css'
import 'splitpanes/dist/splitpanes.css'
import 'vue-sonner/style.css'
import './styles/main.css'
import 'uno.css'
// Fonts
import '@proj-alicization/font-cjkfonts-allseto/index.css'
import '@proj-alicization/font-xiaolai/index.css'
import '@fontsource-variable/dm-sans'
import '@fontsource-variable/jura'
import '@fontsource-variable/quicksand'
import '@fontsource-variable/urbanist'
import '@fontsource-variable/comfortaa'
import '@fontsource/dm-mono'
import '@fontsource/dm-serif-display'
import '@fontsource/gugi'
import '@fontsource/kiwi-maru'
import '@fontsource/m-plus-rounded-1c'
import '@fontsource/sniglet'

const bootFallbackElement = document.getElementById('boot-fallback')
const bootFallbackMessageElement = document.getElementById('boot-fallback-message')
let bootFallbackState: 'booting' | 'mounted' | 'failed' = 'booting'

function resolveErrorMessage(error: unknown) {
  return errorMessageFrom(error) ?? String(error)
}

function setBootFallbackState(state: 'booting' | 'mounted' | 'failed', message?: string) {
  bootFallbackState = state
  if (!bootFallbackElement)
    return

  bootFallbackElement.setAttribute('data-state', state)
  if (bootFallbackMessageElement && message)
    bootFallbackMessageElement.textContent = message
}

function promoteBootFallbackFromRuntimeError(input: {
  source: Parameters<typeof shouldPromoteAlicizationBootFallback>[0]['source']
  detail: string
  title: string
}) {
  const decision = shouldPromoteAlicizationBootFallback({
    source: input.source,
    state: bootFallbackState,
    detail: input.detail,
  })
  if (!decision.promote) {
    console.warn(`[renderer] Boot fallback suppressed (${decision.reason})`, input.detail)
    return false
  }

  setBootFallbackState('failed', `${input.title}:\n${input.detail}`)
  return true
}

window.addEventListener('error', (event) => {
  const detail = resolveErrorMessage(event.error ?? event.message)
  promoteBootFallbackFromRuntimeError({
    source: 'window-error',
    detail,
    title: '渲染异常',
  })
})

window.addEventListener('unhandledrejection', (event) => {
  const detail = resolveErrorMessage(event.reason)
  if (import.meta.env.DEV && detail === 'An object could not be cloned.') {
    const stack = event.reason instanceof Error && typeof event.reason.stack === 'string'
      ? event.reason.stack
      : null
    console.error(`[renderer] Clone rejection raw stack: ${stack || detail}`)
  }
  const promoted = promoteBootFallbackFromRuntimeError({
    source: 'unhandledrejection',
    detail,
    title: 'Promise 未处理异常',
  })
  if (!promoted)
    event.preventDefault()
})

const pinia = createPinia()

const router = createRouter({
  history: createWebHashHistory(),
  // TODO: vite-plugin-vue-layouts is long deprecated, replace with another layout solution
  routes: setupLayouts(routes as RouteRecordRaw[]),
})

router.onError((error) => {
  const detail = resolveErrorMessage(error)
  promoteBootFallbackFromRuntimeError({
    source: 'router-error',
    detail,
    title: '路由加载失败',
  })
  console.error('[renderer] Router runtime error:', error)
})

try {
  const app = createApp(App)

  // NOTICE: Vue runtime errors in component setup/render are not guaranteed to
  // reach window.onerror. Promote them to startup fallback so "transparent blank
  // stage" always surfaces a concrete error for diagnosis.
  app.config.errorHandler = (error, _instance, info) => {
    const detail = resolveErrorMessage(error)
    promoteBootFallbackFromRuntimeError({
      source: 'vue-error',
      detail,
      title: `Vue 运行时异常 (${info})`,
    })
    console.error('[renderer] Vue runtime error:', info, error)
  }

  app
    .use(MotionPlugin)
    // TODO: Fix autoAnimatePlugin type error
    .use(autoAnimatePlugin as unknown as Plugin)
    .use(router)
    .use(pinia)
    .use(i18n)
    .use(Tres)
    .mount('#app')

  setBootFallbackState('mounted')
}
catch (error) {
  setBootFallbackState('failed', `渲染启动失败:\n${resolveErrorMessage(error)}`)
  throw error
}
