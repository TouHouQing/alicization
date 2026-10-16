import vue from '@vitejs/plugin-vue'
import Yaml from 'unplugin-yaml/vite'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [Yaml(), vue()],
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.git/**'],
  },
})
