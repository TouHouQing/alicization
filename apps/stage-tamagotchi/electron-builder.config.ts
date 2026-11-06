/* eslint-disable no-template-curly-in-string */

import type { Buffer } from 'node:buffer'

import type { Configuration } from 'electron-builder'

import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { createRequire, isBuiltin } from 'node:module'
import { basename, dirname, join } from 'node:path'
import { env } from 'node:process'

import { parse } from 'acorn'
import { getLoadablePath as getSqliteVecLoadablePath } from 'sqlite-vec'

const sqliteVecExtensionPath = getSqliteVecLoadablePath()

// Resolve the pinned template path without changing shared dependencies.
// NSIS keeps the standard installer/signing flow and shadows only multiUser.nsh.
const requireBuilder = createRequire(createRequire(import.meta.url).resolve('electron-builder'))
env.ALICIZATION_NSIS_UPSTREAM_TEMPLATES = join(dirname(requireBuilder.resolve('app-builder-lib')), '..', 'templates', 'nsis')

/** Reject a forgotten preload/main external before dependency filtering runs. */
export async function assertBundledJavaScriptRuntime(outputDirectory: string) {
  const native = new Set(['electron', 'electron-click-drag-plugin', 'sqlite3'])
  for (const surface of ['main', 'preload']) {
    const directory = join(outputDirectory, surface)
    const files = (await readdir(directory)).filter(file => /\.(?:mjs|js)$/u.test(file))
    if (!files.length || files.length > 128)
      throw new Error(`Packaged ${surface} has an invalid JavaScript entry budget`)
    for (const file of files) {
      const source = await readFile(join(directory, file), 'utf8')
      if (source.length > 32 * 1024 * 1024)
        throw new Error(`Packaged ${surface} JavaScript exceeds its audit budget`)
      const program = parse(source, { ecmaVersion: 'latest', sourceType: 'module' })
      for (const node of program.body) {
        if (!['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type))
          continue
        const dependency = (node as typeof node & { source?: { value?: unknown } }).source?.value
        if (typeof dependency === 'string' && !dependency.startsWith('.') && !isBuiltin(dependency) && !native.has(dependency))
          throw new Error(`Unbundled runtime dependency in ${surface}/${file}: ${dependency}. Bundle this JavaScript before packaging.`)
      }
    }
  }
}

/** Builder's default exclusions must not remove executable language-service data. */
export async function assertPackagedAgentRuntime(appDirectory: string, resourcesPath: string) {
  const requireBuilderLib = createRequire(requireBuilder.resolve('app-builder-lib'))
  const { extractFile } = requireBuilderLib('@electron/asar') as { extractFile: (archive: string, file: string) => Buffer }
  const archive = join(resourcesPath, 'app.asar')
  const runtime = join('out', 'main', 'agent-runtime')
  async function compare(directory: string) {
    for (const entry of await readdir(join(appDirectory, directory), { withFileTypes: true })) {
      const file = join(directory, entry.name)
      if (entry.isDirectory()) {
        await compare(file)
      }
      else if (!(await readFile(join(appDirectory, file))).equals(extractFile(archive, file))) {
        throw new Error(`Packaged Agent runtime differs from its compiled resource: ${file}`)
      }
    }
  }
  await compare(runtime)
}

export function assertPackagedSqlite3Runtime(
  resourcesPath: string,
  fileExists: (path: string) => boolean = existsSync,
) {
  const root = join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'sqlite3')
  const required = [
    join(root, 'lib', 'sqlite3.js'),
    join(root, 'lib', 'sqlite3-binding.js'),
    join(root, 'build', 'Release', 'node_sqlite3.node'),
  ]
  const missing = required.filter(path => !fileExists(path))
  if (missing.length > 0) {
    throw new Error([
      'Packaged macOS app is missing the unpacked sqlite3 runtime.',
      ...missing.map(path => `Missing: ${path}`),
      'The app cannot start until sqlite3 is rebuilt for Electron and unpacked outside app.asar.',
    ].join('\n'))
  }
}

export default {
  appId: 'com.tohoqing.alicization',
  productName: 'Alicization',
  directories: {
    output: 'dist',
    buildResources: 'build',
  },
  // // For self-publishing, testing, and distribution after modified the code without access to
  // // an Apple Developer account, comment and uncomment the following lines.
  // // Later on when you obtained one, you can set up the necessary certificates and provisioning
  // // profiles to enable these security features.
  // //
  // // https://www.bigbinary.com/blog/code-sign-notorize-mac-desktop-app
  // // https://kilianvalkhof.com/2019/electron/notarizing-your-electron-application/
  // afterSign: async (context) => {
  //   const { electronPlatformName, appOutDir } = context
  //   if (electronPlatformName !== 'darwin')
  //     return
  //   if (env.CI !== 'true') {
  //     console.warn('Skipping notarizing step. Packaging is not running in CI')
  //     return
  //   }

  //   const appName = context.packager.appInfo.productFilename
  //   await notarize({
  //     appPath: `${appOutDir}/${appName}.app`,
  //     teamId: env.APPLE_DEVELOPER_TEAM_ID!,
  //     appleId: env.APPLE_DEVELOPER_APPLE_ID!,
  //     appleIdPassword: env.APPLE_DEVELOPER_APPLE_APP_SPECIFIC_PASSWORD!,
  //   })
  // },
  files: [
    'out/**',
    'resources/**',
    'package.json',
    // Main/preload JS and renderer assets are bundled by electron-vite. Keep
    // only external native wrappers and their runtime loaders; shipping the
    // workspace source and browser dependency trees duplicates the same assets.
    // Preserve dependency root licenses/notices even when its JS is bundled.
    '!**/node_modules/!(sqlite3|bindings|file-uri-to-path|electron-click-drag-plugin|bufferutil|utf-8-validate|node-gyp-build|debug|superjson|@*)/**/!(LICENSE*|LICENCE*|NOTICE*|COPYING*|license*|licence*|notice*|copying*)',
    '!**/node_modules/@*/*/**/!(LICENSE*|LICENCE*|NOTICE*|COPYING*|license*|licence*|notice*|copying*)',
    '!**/.vscode/*',
    '!src/**/*',
    '!**/node_modules/**/{CHANGELOG.md,README.md,README,readme.md,readme}',
    '!**/node_modules/**/{.turbo,test,src,__tests__,tests,example,examples}',
    '**/node_modules/debug/**/*',
    '**/node_modules/superjson/**/*',
    '!electron.vite.config.{js,ts,mjs,cjs}',
    '!vite.config.{js,ts,mjs,cjs}',
    '!uno.config.{js,ts,mjs,cjs}',
    '!{.eslintcache,eslint.config.ts,.yaml,dev-app-update.yml,CHANGELOG.md,README.md}',
    '!{.env,.env.*,.npmrc,pnpm-lock.yaml}',
    '!{tsconfig.json}',
    // Standard libraries are runtime inputs to tsserver. The default root
    // matcher always excludes .d.ts, so use a dedicated file-set matcher.
    { from: 'out/main/agent-runtime/typescript/lib', to: 'out/main/agent-runtime/typescript/lib', filter: ['*.d.ts'] },
  ],
  asar: true,
  beforePack: context => assertBundledJavaScriptRuntime(join(context.packager.info.appDir, 'out')),
  asarUnpack: [
    '**/*.node',
    '**/node_modules/sqlite3/**/*',
    '**/node_modules/bindings/**/*',
    '**/node_modules/file-uri-to-path/**/*',
  ],
  extraResources: [
    {
      from: 'resources/third-party/ripgrep',
      to: join('tools', 'ripgrep'),
    },
    {
      from: sqliteVecExtensionPath,
      to: join('sqlite-vec', basename(sqliteVecExtensionPath)),
    },
  ],
  extraMetadata: {
    name: 'com.tohoqing.alicization',
    main: 'out/main/index.js',
    homepage: 'https://github.com/TouHouQing/alicization',
    repository: 'https://github.com/TouHouQing/alicization',
    license: 'MIT',
  },
  win: {
    executableName: 'alicization',
  },
  nsis: {
    include: 'build/nsis-startup.nsh',
    artifactName: '${productName}-${version}-windows-${arch}-setup.${ext}',
    shortcutName: '${productName}',
    uninstallDisplayName: '${productName}',
    createDesktopShortcut: 'always',
    deleteAppDataOnUninstall: false,
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
  mac: {
    entitlementsInherit: 'build/entitlements.mac.plist',
    extendInfo: [
      {
        NSMicrophoneUsageDescription: 'Alicization requires microphone access for voice interaction',
      },
      {
        NSCameraUsageDescription: 'Alicization requires camera access for vision understanding',
      },
    ],
    // For self-publishing, testing, and distribution after modified the code without access to
    // an Apple Developer account, comment and uncomment the following 4 lines.
    // Later on when you obtained one, you can set up the necessary certificates and provisioning
    // profiles to enable these security features.
    // hardenedRuntime: false,
    hardenedRuntime: env.CI === 'true',
    notarize: env.CI === 'true',
    executableName: 'alicization',
    // NOTICE: The packaged app icon is standardized from docs/content/public/alicization.png
    // and exported into build/icon.icns during asset refresh, so macOS should always read
    // the generated .icns file instead of the legacy layered .icon bundle.
    icon: 'icon.icns',
  },
  dmg: {
    artifactName: '${productName}-${version}-darwin-${arch}.${ext}',
  },
  linux: {
    target: [
      'deb',
      'rpm',
    ],
    category: 'Utility',
    synopsis: 'AI VTuber/Waifu chatbot app inspired by Neuro-sama.',
    description: 'Alicization is an AI VTuber/Waifu chatbot supporting Live2D/VRM avatars, featuring human-like interactions and modular stage-based rendering.',
    executableName: 'alicization',
    artifactName: '${productName}-${version}-linux-${arch}.${ext}',
    icon: 'build/icons/icon.png',
  },
  appImage: {
    artifactName: '${productName}-${version}-linux-${arch}.${ext}',
  },
  // Native dependencies such as sqlite3 must be rebuilt against Electron's ABI
  // during every package build. Skipping this step can ship a JS-only package
  // with no loadable node_sqlite3.node binding.
  npmRebuild: true,
  afterPack: async (context) => {
    const resourcesPath = context.electronPlatformName === 'darwin'
      ? join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents', 'Resources')
      : join(context.appOutDir, 'resources')
    await assertPackagedAgentRuntime(context.packager.info.appDir, resourcesPath)
    if (context.electronPlatformName !== 'darwin')
      return

    const appPath = join(
      context.appOutDir,
      `${context.packager.appInfo.productFilename}.app`,
      'Contents',
      'Resources',
    )
    assertPackagedSqlite3Runtime(appPath)
  },
  publish: {
    provider: 'github',
    owner: 'TouHouQing',
    repo: 'alicization',
  },
} satisfies Configuration
