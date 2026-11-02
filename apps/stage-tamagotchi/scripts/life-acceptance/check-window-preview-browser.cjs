const assert = require('node:assert/strict')
const fs = require('node:fs')
const { createRequire } = require('node:module')
const path = require('node:path')
const process = require('node:process')
const { pathToFileURL } = require('node:url')

const workspace = path.resolve(__dirname, '../../../..')
const req = createRequire(path.join(workspace, 'apps/stage-tamagotchi/package.json'))
assert.ok(process.argv[2], 'Pass a fresh directory inside the workspace output folder')
const root = path.resolve(process.argv[2])
assert.ok(root.startsWith(path.join(workspace, 'output') + path.sep))
assert.equal(fs.existsSync(root), false)
fs.mkdirSync(root)
const report = { format: 'actual-vue-window-preview-browser-v1', scope: 'Actual Vue component and repository UnoCSS in headless Chromium; independent of packaged-product acceptance', passed: false, cases: [], consoleErrors: [] }
const load = name => import(pathToFileURL(req.resolve(name)).href)
const modulePath = file => `/@fs/${path.join(workspace, file).replaceAll('\\', '/')}`
let server, browser
;(async () => {
  const [{ createServer }, { default: vue }, { default: UnoCSS }, { default: Yaml }] = await Promise.all([load('vite'), load('@vitejs/plugin-vue'), load('unocss/vite'), load('unplugin-yaml/vite')])
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>Owned image preview QA</title><body style="margin:0;padding:16px;font-family:Arial,sans-serif"><main id="app" style="width:336px;max-width:100%"></main><script type="module" src="/main.js"></script></body></html>')
  fs.writeFileSync(path.join(root, 'main.js'), `
import { createApp, h, ref } from 'vue'
import { createI18n } from 'vue-i18n'
import Preview from ${JSON.stringify(modulePath('apps/stage-tamagotchi/src/renderer/components/alicization-window-action-preview.vue'))}
import settings from ${JSON.stringify(modulePath('packages/i18n/src/locales/zh-Hans/tamagotchi/settings.yaml'))}
import ${JSON.stringify(`/@fs/${req.resolve('@unocss/reset/tailwind.css').replaceAll('\\', '/')}`)}
import 'virtual:uno.css'
const image=ref(null)
createApp({setup(){return ()=>image.value?h(Preview,{image:image.value}):null}}).use(createI18n({legacy:false,locale:'zh-CN',messages:{'zh-CN':{tamagotchi:{settings}}}})).mount('#app')
window.ownedPreviewQa={set(width,height,kind){const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const c=canvas.getContext('2d');c.fillStyle='#dceaf2';c.fillRect(0,0,width,height);c.fillStyle='#dc232d';c.fillRect(0,0,width/2,height/2);const markers=[{x:Math.floor(width/4),y:Math.floor(height/4),label:'1'}];if(kind==='drag')markers.push({x:Math.floor(width*3/4),y:Math.floor(height*3/4),label:'2'});image.value={width,height,dataUrl:canvas.toDataURL('image/png'),sha256:'a'.repeat(64),markers,action:kind==='click'?{kind,button:'left'}:kind==='drag'?{kind}:{kind,direction:'down',notches:3}};}}
`)
  server = await createServer({ configFile: false, root, cacheDir: path.join(root, '.vite'), logLevel: 'error', resolve: { alias: [{ find: /^vue$/u, replacement: req.resolve('vue/dist/vue.esm-bundler.js') }, { find: /^vue-i18n$/u, replacement: req.resolve('vue-i18n') }] }, plugins: [vue(), UnoCSS({ configFile: path.join(workspace, 'uno.config.ts') }), Yaml()], server: { host: '127.0.0.1', port: 0, fs: { allow: [workspace, fs.realpathSync(path.join(workspace, 'node_modules'))] } } })
  await server.listen()
  const chromium = req('playwright').chromium
  const installed = [chromium.executablePath(), ...[process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)']].filter(Boolean).flatMap(root => [path.join(root, 'Google/Chrome/Application/chrome.exe'), path.join(root, 'Microsoft/Edge/Application/msedge.exe')])].find(file => fs.existsSync(file))
  assert.ok(installed, 'Install a supported Chromium browser before running this read-only UI qualification')
  browser = await chromium.launch({ headless: true, executablePath: installed })
  report.browserVersion = browser.version()
  const page = await browser.newPage({ viewport: { width: 420, height: 740 }, deviceScaleFactor: 1 })
  page.on('pageerror', error => report.consoleErrors.push(error.message))
  await page.goto(server.resolvedUrls.local[0])
  await page.waitForFunction(() => window.ownedPreviewQa)
  for (const [width, height, kind] of [[320, 240, 'click'], [1600, 1200, 'drag'], [400, 1600, 'scroll']]) {
    await page.evaluate(({ width, height, kind }) => window.ownedPreviewQa.set(width, height, kind), { width, height, kind })
    await page.waitForFunction(() => {
      const image = document.querySelector('img')
      return image?.complete && image.naturalWidth > 0
    })
    const actual = await page.evaluate(() => {
      const image = document.querySelector('img')
      const bounds = image.getBoundingClientRect()
      const figure = document.querySelector('figure').getBoundingClientRect()
      const markers = [...document.querySelectorAll('[data-window-target-marker]')].map((marker) => {
        const box = marker.getBoundingClientRect()
        return { x: box.x + box.width / 2, y: box.y + box.height / 2, text: marker.textContent }
      })
      return { naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, width: bounds.width, height: bounds.height, left: bounds.left, top: bounds.top, figureWidth: figure.width, action: document.querySelector('[data-window-review-action]').textContent.trim(), markerCenters: markers, bodyWidth: document.body.scrollWidth }
    })
    const item = { width, height, kind, actual, passed: false }
    report.cases.push(item)
    await page.screenshot({ path: path.join(root, `${kind}.png`), fullPage: true })
    assert.equal(actual.naturalWidth, width)
    assert.equal(actual.naturalHeight, height)
    assert.ok(Math.abs(actual.width / actual.height - width / height) < 0.005, 'Preview image must preserve its real aspect ratio')
    assert.ok(actual.bodyWidth <= 420 && actual.figureWidth <= 336 && actual.height <= 257, 'Preview must fit the actual small permission layout')
    const source = [[Math.floor(width / 4), Math.floor(height / 4)], ...(kind === 'drag' ? [[Math.floor(width * 3 / 4), Math.floor(height * 3 / 4)]] : [])]
    assert.equal(actual.markerCenters.length, source.length)
    for (let index = 0; index < source.length; index++) {
      const target = source[index]
      const marker = actual.markerCenters[index]
      assert.ok(Math.abs(marker.x - (actual.left + (target[0] + 0.5) / width * actual.width)) < 1.5)
      assert.ok(Math.abs(marker.y - (actual.top + (target[1] + 0.5) / height * actual.height)) < 1.5)
    }
    assert.equal(actual.action, kind === 'click' ? '使用鼠标左键点击标记 1。' : kind === 'drag' ? '从标记 1 拖动到标记 2。' : '在标记 1 处向下滚动 3 格。')
    item.passed = true
  }
  assert.deepEqual(report.consoleErrors, [])
  report.passed = true
})().catch((error) => {
  report.failure = error.message
  process.exitCode = 1
}).finally(async () => {
  await browser?.close()
  await server?.close()
  const { createHash } = require('node:crypto')
  report.sourceHashes = ['apps/stage-tamagotchi/src/renderer/components/alicization-window-action-preview.vue', 'packages/i18n/src/locales/zh-Hans/tamagotchi/settings.yaml', 'uno.config.ts'].map(file => ({ path: file, sha256: createHash('sha256').update(fs.readFileSync(path.join(workspace, file))).digest('hex') }))
  report.finishedAt = new Date().toISOString()
  fs.writeFileSync(path.join(root, 'report.json'), JSON.stringify(report, null, 2))
  process.stdout.write(`${JSON.stringify(report)}\n`)
})
