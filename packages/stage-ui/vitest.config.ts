import { join, resolve } from 'node:path'
import { cwd } from 'node:process'

import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  return ({
    resolve: {
      alias: {
        '@proj-alicization/i18n': resolve(join(import.meta.dirname, '..', '..', 'packages', 'i18n', 'src')),
        '@proj-alicization/stage-shared': resolve(join(import.meta.dirname, '..', '..', 'packages', 'stage-shared', 'src')),
      },
    },
    test: {
      include: ['src/**/*.test.ts'],
      env: loadEnv(mode, join(cwd(), 'packages', 'stage-ui'), ''),
    },
  })
})
