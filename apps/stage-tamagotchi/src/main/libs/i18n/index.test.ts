import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { build } from 'vite'
import { expect, it } from 'vitest'

it('resolves nested tray messages, interpolation and locale changes after production tree shaking', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'alicization-i18n-'))
  try {
    await build({
      configFile: false,
      logLevel: 'silent',
      ssr: { noExternal: true },
      build: {
        ssr: resolve(import.meta.dirname, 'index.ts'),
        outDir: directory,
        rollupOptions: { output: { format: 'es', entryFileNames: 'i18n.mjs' } },
      },
    })
    // NOTICE: An unbundled import initializes Intlify globally and hides this regression.
    const { createI18n } = await import(/* @vite-ignore */ pathToFileURL(resolve(directory, 'i18n.mjs')).href)
    const i18n = createI18n({
      locale: 'zh-Hans',
      messages: {
        'zh-Hans': { tamagotchi: { electron: { tray: { show: '显示', scale: '缩放 {value}%' } } } },
        'en': { tamagotchi: { electron: { tray: { show: 'Show', settings: 'Settings' } } } },
      },
    })
    expect(i18n.t('tamagotchi.electron.tray.show')).toBe('显示')
    expect(i18n.t('tamagotchi.electron.tray.scale', { value: 75 })).toBe('缩放 75%')
    expect(i18n.t('tamagotchi.electron.tray.settings')).toBe('Settings')
    i18n.locale('en')
    expect(i18n.t('tamagotchi.electron.tray.show')).toBe('Show')
  }
  finally {
    await rm(directory, { recursive: true, force: true })
  }
}, 30000)
