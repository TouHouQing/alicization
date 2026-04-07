import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      'apps/server',
      'apps/stage-tamagotchi',
      'packages/stage-ui',
      'packages/stage-ui-live2d',
      'packages/stage-ui-three',
      'packages/stage-shared',
      'packages/electron-screen-capture',
      'packages/pipelines-audio',
      'packages/plugin-sdk',
      'packages/cap-vite',
      'packages/vite-plugin-warpdrive',
      'packages/audio-pipelines-transcribe',
      'packages/server-runtime',
    ],
  },
})
