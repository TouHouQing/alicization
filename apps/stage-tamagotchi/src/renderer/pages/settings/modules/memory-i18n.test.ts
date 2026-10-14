import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'

const workspace = fileURLToPath(new URL('../../../../../../../', import.meta.url))
const moduleDirectory = resolve(workspace, 'apps/stage-tamagotchi/src/renderer/pages/settings/modules')
const sources = [resolve(moduleDirectory, 'memory.vue'), ...readdirSync(resolve(moduleDirectory, 'components')).filter(file => file.endsWith('.vue')).map(file => resolve(moduleDirectory, 'components', file))]
const keys = [...new Set(sources.flatMap(file => [...readFileSync(file, 'utf8').matchAll(/\bt\('((?:settings\.pages\.memory|stage\.memory-workbench)[^']+)'/g)].map(match => match[1])))].sort()

describe('visible memory workbench translation contract', () => {
  for (const language of ['en', 'zh-Hans']) {
    it(`resolves every literal memory label in ${language}`, () => {
      const locale = resolve(workspace, 'packages/i18n/src/locales', language)
      const catalogue = { settings: parse(readFileSync(resolve(locale, 'settings.yaml'), 'utf8')), stage: parse(readFileSync(resolve(locale, 'stage.yaml'), 'utf8')) }
      const missing = keys.filter(key => typeof key.split('.').reduce<any>((value, segment) => value?.[segment], catalogue) !== 'string')
      expect(keys.length).toBeGreaterThan(150)
      expect(missing).toEqual([])
    })
  }
})
