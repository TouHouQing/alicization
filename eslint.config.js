import { defineConfig } from '@moeru/eslint-config'

const ALICIZATION_CORE_FILES = [
  'apps/stage-tamagotchi/src/main/services/alicization/**/*.{ts,tsx}',
  'apps/stage-tamagotchi/src/renderer/pages/settings/memory/**/*.{ts,tsx,vue}',
  'apps/stage-tamagotchi/src/renderer/pages/settings/modules/components/memory-*.{ts,tsx,vue}',
  'packages/stage-shared/src/alicization-*.{ts,tsx}',
  'packages/stage-ui/src/stores/alicization-*.{ts,tsx}',
]

export default defineConfig({
  masknet: false,
  preferArrow: false,
  perfectionist: false,
  sonarjs: false,
  sortPackageJsonScripts: false,
  typescript: true,
  unocss: true,
  vue: true,
}, {
  ignores: [
    'cspell.config.yaml',
    'cspell.config.yml',
    'crowdin.yaml',
    'crowdin.yml',
    // Keep reference prose and extracted fenced code out of production lint.
    '.agents/**',
    'docs/**',
    '**/*.md',
    '**/*.md/**',
    '**/assets/js/**',
    '**/assets/live2d/models/**',
    'apps/stage-tamagotchi/out/**',
    'apps/stage-tamagotchi/src/bindings/**',
    'apps/stage-tamagotchi/src-tauri/**',
    'apps/stage-tamagotchi-electron/out/**',
    'apps/stage-tamagotchi-electron/src/renderer/bindings/**',
    'apps/stage-pocket/ios/**',
    'apps/stage-pocket/android/**',
    'crates/**',
    '**/drizzle/**',
    '**/.astro/**',
  ],
}, {
  rules: {
    'pnpm/json-valid-catalog': 'off',
    'pnpm/json-enforce-catalog': 'off',
    'pnpm/yaml-enforce-settings': 'off',
    'antfu/import-dedupe': 'error',
    // TODO: remove this
    'depend/ban-dependencies': 'warn',
    'import/order': 'off',
    'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
    // 'sonarjs/cognitive-complexity': 'off',
    // 'sonarjs/no-commented-code': 'off',
    // 'sonarjs/pseudo-random': 'off',
    'style/padding-line-between-statements': 'error',
    'vue/prefer-separate-static-class': 'off',
    'yaml/plain-scalar': 'off',
    'markdown/require-alt-text': 'off',
  },
}, {
  files: [
    'apps/stage-tamagotchi/src/main/services/alicization/**/*.test.ts',
  ],
  rules: {
    'no-template-curly-in-string': 'off',
  },
}, {
  rules: {
    'perfectionist/sort-imports': [
      'error',
      {
        groups: [
          'type-builtin',
          'type-import',
          'type-internal',
          ['type-parent', 'type-sibling', 'type-index'],
          'default-value-builtin',
          'named-value-builtin',
          'value-builtin',
          'default-value-external',
          'named-value-external',
          'value-external',
          'default-value-internal',
          'named-value-internal',
          'value-internal',
          ['default-value-parent', 'default-value-sibling', 'default-value-index'],
          ['named-value-parent', 'named-value-sibling', 'named-value-index'],
          ['wildcard-value-parent', 'wildcard-value-sibling', 'wildcard-value-index'],
          ['value-parent', 'value-sibling', 'value-index'],
          'side-effect',
          'style',
        ],
        newlinesBetween: 1,
      },
    ],
  },
}, {
  files: [
    ...ALICIZATION_CORE_FILES,
    'apps/stage-tamagotchi/src/renderer/pages/devtools/performance-visualizer*.{ts,vue}',
  ],
  rules: {
    // Keep known Phase 1 lint debt visible while preserving a passable core gate.
    'antfu/curly': 'warn',
    'no-unmodified-loop-condition': 'warn',
    'node/prefer-global/buffer': 'warn',
    'node/prefer-global/process': 'warn',
    'perfectionist/sort-imports': 'warn',
    'perfectionist/sort-named-imports': 'warn',
    'prefer-const': 'warn',
    // Alicization relies on broad natural-language intent recognizers. Keep the
    // regexp plugin visible without forcing semantic rewrites for lint-only wins.
    'regexp/no-contradiction-with-assertion': 'warn',
    'regexp/no-dupe-disjunctions': 'warn',
    'regexp/no-misleading-capturing-group': 'warn',
    'regexp/no-super-linear-backtracking': 'warn',
    'regexp/no-unused-capturing-group': 'warn',
    'regexp/no-useless-assertions': 'warn',
    'regexp/no-useless-non-capturing-group': 'warn',
    'style/indent': 'warn',
    'style/indent-binary-ops': 'warn',
    'style/max-statements-per-line': 'warn',
    'style/no-mixed-operators': 'warn',
    'style/no-tabs': 'warn',
    'style/operator-linebreak': 'warn',
    'ts/no-use-before-define': 'warn',
    'unused-imports/no-unused-imports': 'warn',
  },
})
