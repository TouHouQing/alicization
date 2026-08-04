import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { env as processEnv } from 'node:process'

import VueI18n from '@intlify/unplugin-vue-i18n/vite'
import Vue from '@vitejs/plugin-vue'
import UnoCss from 'unocss/vite'
import Info from 'unplugin-info/vite'
import VueRouter from 'unplugin-vue-router/vite'
import Yaml from 'unplugin-yaml/vite'
import Inspect from 'vite-plugin-inspect'
import VitePluginVueDevTools from 'vite-plugin-vue-devtools'
import Layouts from 'vite-plugin-vue-layouts'
import VueMacros from 'vue-macros/vite'

import { Download } from '@proj-airi/unplugin-fetch'
import { DownloadLive2DSDK } from '@proj-airi/unplugin-live2d-sdk'
import { defineConfig } from 'electron-vite'

const appNodeModulesDir = resolve(join(import.meta.dirname, 'node_modules'))
const workspaceRoot = resolve(join(import.meta.dirname, '..', '..'))
const stageUIAssetsRoot = resolve(join(import.meta.dirname, '..', '..', 'packages', 'stage-ui', 'src', 'assets'))
const sharedCacheDir = resolve(join(import.meta.dirname, '..', '..', '.cache'))
const shouldEnableVueI18nPlugin = processEnv.ALICIZATION_SKIP_VUE_I18N_PLUGIN !== '1'
const pnpmStoreDir = resolve(join(homedir(), 'Library', 'pnpm', 'store'))
const onnxruntimeCommonPackageDir = resolve(join(appNodeModulesDir, 'onnxruntime-common'))
const onnxruntimeCommonEntry = resolve(join(onnxruntimeCommonPackageDir, 'dist', 'esm', 'index.js'))
const piniaPackageDir = resolve(join(appNodeModulesDir, 'pinia'))
const piniaModuleEntry = resolve(join(piniaPackageDir, 'dist', 'pinia.mjs'))
const vueI18nPackageDir = resolve(join(appNodeModulesDir, 'vue-i18n'))
const vueI18nModuleEntry = resolve(join(vueI18nPackageDir, 'dist', 'vue-i18n.runtime.mjs'))
const vueRouterPackageDir = resolve(join(appNodeModulesDir, 'vue-router'))
const vueRouterModuleEntry = resolve(join(vueRouterPackageDir, 'dist', 'vue-router.mjs'))
const threePackageDir = resolve(join(appNodeModulesDir, 'three'))
const threeModuleEntry = resolve(join(threePackageDir, 'build', 'three.module.js'))
const tresTemplateCompilerWhitelist = new Set([
  'TresCanvas',
  'TresCanvasContext',
  'TresLeches',
  'TresScene',
])
const templateCompilerOptions = {
  template: {
    compilerOptions: {
      isCustomElement: (tag: string) => {
        return (
          (((/^Tres[A-Z]/.test(tag) || tag.startsWith('tres-')) && !tresTemplateCompilerWhitelist.has(tag))
            || tag === 'primitive')
        )
      },
    },
  },
}

export default defineConfig({
  main: {
    build: {
      // NOTICE: electron-builder packs this app from pnpm's strict workspace layout, where the
      // app-local `node_modules` only contains direct dependency symlinks. When electron-vite
      // externalizes every production dependency, the packaged main process later resolves those
      // packages from `app.asar/node_modules`, but their transitive runtime deps can be missing
      // (`zod-to-json-schema`, `stackframe`, etc.). Bundle JS dependencies into main so packaged
      // runtime code no longer depends on pnpm's transitive symlink graph. Keep native/special
      // modules external so Electron can load them from disk.
      externalizeDeps: false,
      rollupOptions: {
        external: [
          'electron',
          'electron-click-drag-plugin',
          'sqlite3',
        ],
      },
    },
    plugins: [
      Yaml(),

      {
        // To replace `build.rolldownOptions`, as electron-vite still uses the deprecated
        // `rollupOptions`, using `rollupOptions` and `rolldownOptions` at the same
        // time may lead to unexpected merge results. Using `rollupOptions` to manipulate
        // `manualChunks` also did not work. Therefore, it was transformed into a plugin
        // declaration with the recommended `codeSplitting` option.
        name: 'manual-chunks',
        outputOptions(options) {
          options.codeSplitting = {
            groups: [
              {
                name(moduleId) {
                  // https://github.com/lobehub/lobehub/blob/6ecba929b738e1259e15d17e7643941e015324ee/apps/desktop/electron.vite.config.ts#L54
                  // Prevent debug package from being bundled into index.js to avoid side-effect pollution
                  if (moduleId.includes('node_modules/debug')) {
                    return 'vendor-debug'
                  }
                },
              },
              {
                name(moduleId) {
                  // https://github.com/lobehub/lobehub/blob/6ecba929b738e1259e15d17e7643941e015324ee/apps/desktop/electron.vite.config.ts#L54
                  // Prevent debug package from being bundled into index.js to avoid side-effect pollution
                  if (moduleId.includes('node_modules/h3')) {
                    return 'vendor-h3'
                  }
                },
              },
            ],
          }

          return options
        },
      },
      Info(),
    ],

    resolve: {
      alias: {
        '@proj-alicization/i18n': resolve(join(import.meta.dirname, '..', '..', 'packages', 'i18n', 'src')),
      },
    },
  },

  preload: {
    build: {
      lib: {
        entry: {
          'index': resolve(join(import.meta.dirname, 'src', 'preload', 'index.ts')),
          'beat-sync': resolve(join(import.meta.dirname, 'src', 'preload', 'beat-sync.ts')),
        },
      },
    },

    plugins: [],
  },

  renderer: {
    // Thanks to [@Maqsyo](https://github.com/Maqsyo)
    // https://github.com/alex8088/electron-vite/issues/99#issuecomment-1862671727
    base: './',

    build: {
      rolldownOptions: {
        input: {
          'main': resolve(join(import.meta.dirname, 'src', 'renderer', 'index.html')),
          'beat-sync': resolve(join(import.meta.dirname, 'src', 'renderer', 'beat-sync.html')),
        },
      },
    },

    optimizeDeps: {
      exclude: [
        // Internal Packages
        '@proj-alicization/stage-ui/*',
        '@proj-airi/drizzle-duckdb-wasm',
        '@proj-airi/drizzle-duckdb-wasm/*',
        '@proj-alicization/electron-screen-capture',

        // Static Assets: Models, Images, etc.
        'src/renderer/public/assets/*',

        // Live2D SDK
        '@framework/live2dcubismframework',
        '@framework/math/cubismmatrix44',
        '@framework/type/csmvector',
        '@framework/math/cubismviewmatrix',
        '@framework/cubismdefaultparameterid',
        '@framework/cubismmodelsettingjson',
        '@framework/effect/cubismbreath',
        '@framework/effect/cubismeyeblink',
        '@framework/model/cubismusermodel',
        '@framework/motion/acubismmotion',
        '@framework/motion/cubismmotionqueuemanager',
        '@framework/type/csmmap',
        '@framework/utils/cubismdebug',
        '@framework/model/cubismmoc',
      ],
    },

    resolve: {
      dedupe: ['pinia', 'vue-i18n', 'vue-router'],
      alias: [
        {
          find: /^pinia$/,
          replacement: piniaModuleEntry,
        },
        {
          find: /^vue-i18n$/,
          replacement: vueI18nModuleEntry,
        },
        {
          find: /^vue-router$/,
          replacement: vueRouterModuleEntry,
        },
        {
          find: '@proj-alicization/server-sdk',
          replacement: resolve(join(import.meta.dirname, '..', '..', 'packages', 'server-sdk', 'src')),
        },
        {
          find: '@proj-alicization/i18n',
          replacement: resolve(join(import.meta.dirname, '..', '..', 'packages', 'i18n', 'src')),
        },
        {
          find: '@proj-alicization/stage-ui',
          replacement: resolve(join(import.meta.dirname, '..', '..', 'packages', 'stage-ui', 'src')),
        },
        {
          find: '@proj-alicization/stage-pages',
          replacement: resolve(join(import.meta.dirname, '..', '..', 'packages', 'stage-pages', 'src')),
        },
        {
          find: '@proj-alicization/stage-shared',
          replacement: resolve(join(import.meta.dirname, '..', '..', 'packages', 'stage-shared', 'src')),
        },
        {
          find: '@proj-alicization/electron-vueuse',
          replacement: resolve(join(import.meta.dirname, '..', '..', 'packages', 'electron-vueuse', 'src')),
        },
        {
          find: /^onnxruntime-common$/,
          replacement: onnxruntimeCommonEntry,
        },
        {
          find: /^three$/,
          replacement: threeModuleEntry,
        },
      ],
    },

    server: {
      fs: {
        allow: [
          workspaceRoot,
          pnpmStoreDir,
        ],
      },
      warmup: {
        clientFiles: [
          `${resolve(join(import.meta.dirname, '..', '..', 'packages', 'stage-ui', 'src'))}/*.vue`,
          `${resolve(join(import.meta.dirname, '..', '..', 'packages', 'stage-pages', 'src'))}/*.vue`,
        ],
      },
    },

    worker: {
      format: 'es',
      rolldownOptions: {
        output: {
          codeSplitting: false,
        },
      },
    },

    plugins: [
      Info(),

      {
        name: 'proj-alicization:defines',
        config(ctx) {
          const define: Record<string, any> = {
            'import.meta.env.RUNTIME_ENVIRONMENT': '\'electron\'',
          }
          if (ctx.mode === 'development') {
            define['import.meta.env.URL_MODE'] = '\'server\''
          }
          if (ctx.mode === 'production') {
            define['import.meta.env.URL_MODE'] = '\'file\''
          }

          return { define }
        },
      },

      Inspect(),

      Yaml(),

      VueMacros({
        plugins: {
          vue: Vue({
            include: [/\.vue$/, /\.md$/],
            ...templateCompilerOptions,
          }),
          vueJsx: false,
        },
        betterDefine: false,
      }),

      VueRouter({
        dts: resolve(import.meta.dirname, 'src/renderer/typed-router.d.ts'),
        routesFolder: [
          {
            src: resolve(import.meta.dirname, '..', '..', 'packages', 'stage-pages', 'src', 'pages'),
            exclude: base => [
              ...base,
              '**/settings/connection/index.vue',
              '**/settings/system/general.vue',
              '**/settings/modules/mcp.vue',
            ],
          },
          resolve(import.meta.dirname, 'src', 'renderer', 'pages'),
        ],
        exclude: ['**/components/**'],
      }),

      VitePluginVueDevTools(),

      // https://github.com/JohnCampionJr/vite-plugin-vue-layouts
      Layouts({
        layoutsDirs: [
          resolve(import.meta.dirname, 'src', 'renderer', 'layouts'),
          resolve(import.meta.dirname, '..', '..', 'packages', 'stage-layouts', 'src', 'layouts'),
        ],
        pagesDirs: [resolve(import.meta.dirname, 'src', 'renderer', 'pages')],
      }),

      UnoCss(),

      ...(shouldEnableVueI18nPlugin
        ? [
            // https://github.com/intlify/bundle-tools/tree/main/packages/unplugin-vue-i18n
            VueI18n({
              runtimeOnly: true,
              compositionOnly: true,
              fullInstall: true,
            }),
          ]
        : []),

      DownloadLive2DSDK(),
      Download('https://dist.ayaka.moe/live2d-models/hiyori_free_zh.zip', 'hiyori_free_zh.zip', 'live2d/models', { parentDir: stageUIAssetsRoot, cacheDir: sharedCacheDir }),
      Download('https://dist.ayaka.moe/live2d-models/hiyori_pro_zh.zip', 'hiyori_pro_zh.zip', 'live2d/models', { parentDir: stageUIAssetsRoot, cacheDir: sharedCacheDir }),
      Download('https://dist.ayaka.moe/vrm-models/VRoid-Hub/AvatarSample-A/AvatarSample_A.vrm', 'AvatarSample_A.vrm', 'vrm/models/AvatarSample-A', { parentDir: stageUIAssetsRoot, cacheDir: sharedCacheDir }),
      Download('https://dist.ayaka.moe/vrm-models/VRoid-Hub/AvatarSample-B/AvatarSample_B.vrm', 'AvatarSample_B.vrm', 'vrm/models/AvatarSample-B', { parentDir: stageUIAssetsRoot, cacheDir: sharedCacheDir }),
    ],
  },
})
