import type { Plugin } from 'vite'

import { join, resolve } from 'node:path'
import { cwd } from 'node:process'

import Vue from '@vitejs/plugin-vue'
import Yaml from 'unplugin-yaml/vite'

import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const repoRoot = resolve(join(import.meta.dirname, '..', '..'))

  return ({
    plugins: [
      Yaml() as Plugin,
      Vue(),
    ],
    resolve: {
      alias: {
        '@proj-alicization/i18n': resolve(join(repoRoot, 'packages', 'i18n', 'src')),
        '@proj-alicization/stage-shared': resolve(join(repoRoot, 'packages', 'stage-shared', 'src')),
        '@lemonneko/crop-empty-pixels': resolve(join(repoRoot, 'node_modules', '.pnpm', 'node_modules', '@lemonneko', 'crop-empty-pixels', 'dist', 'index.js')),
        '@vue/devtools-api': resolve(join(repoRoot, 'node_modules', '.pnpm', 'node_modules', '@vue', 'devtools-api')),
        'vue': resolve(join(import.meta.dirname, 'node_modules', 'vue')),
      },
    },
    test: {
      include: ['src/**/*.test.ts'],
      env: loadEnv(mode, join(cwd(), 'packages', 'stage-ui'), ''),
      server: {
        deps: {
          inline: ['@pinia/testing', 'pinia', 'vue', '@vue/devtools-api'],
        },
      },
    },
  })
})
