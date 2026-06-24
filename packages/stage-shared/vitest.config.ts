import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root,
  test: {
    name: 'stage-shared',
    include: ['src/**/*.test.ts'],
  },
})
