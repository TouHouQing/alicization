/// <reference types="unplugin-yaml/types" />

import type { AlicizationSafetyPermissionRequest } from '../../shared/eventa'

import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { createI18n } from 'vue-i18n'
import { renderToString } from 'vue/server-renderer'

import settings from '../../../../../packages/i18n/src/locales/zh-Hans/tamagotchi/settings.yaml'
import Preview from './alicization-window-action-preview.vue'

const image: NonNullable<AlicizationSafetyPermissionRequest['interfaceImagePreview']> = { dataUrl: 'data:image/png;base64,AQID', sha256: 'a'.repeat(64), width: 100, height: 100, markers: [{ x: 25, y: 50, label: '1' }] }
const render = (value = image) => renderToString(createSSRApp(() => h(Preview, { image: value })).use(createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': { tamagotchi: { settings } } } })))
describe('window permission preview shows the same image and target', () => {
  it('describes the approved mouse operation in the actual application locale', async () => {
    expect(await render({ ...image, action: { kind: 'click', button: 'left' } })).toContain('使用鼠标左键点击标记 1。')
    expect(await render({ ...image, action: { kind: 'drag' } })).toContain('从标记 1 拖动到标记 2。')
    expect(await render({ ...image, action: { kind: 'scroll', direction: 'down', notches: 3 } })).toContain('在标记 1 处向下滚动 3 格。')
  })
  it('renders the bounded local PNG with the marker at its image pixel center', async () => {
    const html = await render()
    expect(html).toContain('data-window-action-preview')
    expect(html).toContain('src="data:image/png;base64,AQID"')
    expect(html).toContain('left:25.5%;top:50.5%;')
    expect(html).toContain('data-window-target-marker')
  })
  it.each(['https://example.com/private-image.png', 'data:image/svg+xml;base64,AQID', 'javascript:untrusted'])('does not load an arbitrary URL %s', async (dataUrl) => {
    expect(await render({ ...image, dataUrl })).not.toContain('<img')
  })
  it('escapes a marker caption and omits a point outside the actual image', async () => {
    const html = await render({ ...image, markers: [{ x: 1, y: 1, label: '<script>untrusted</script>' }, { x: 100, y: 1, label: 'outside' }] })
    expect(html).toContain('&lt;script&gt;untrusted&lt;/script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('outside')
  })
})
