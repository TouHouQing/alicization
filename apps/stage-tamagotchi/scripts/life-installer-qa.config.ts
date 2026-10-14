import configuration from '../electron-builder.config'

// Separate installer identity protects the user's existing installation and
// shortcuts while exercising the same compiled runtime and NSIS data policy.
export default {
  ...configuration,
  appId: 'com.tohoqing.alicization.qa.life20261005',
  productName: 'AlicizationLifeQA20261005',
  directories: { ...configuration.directories, output: 'dist/life-installer-qa-20261005' },
  extraMetadata: { ...configuration.extraMetadata, name: 'alicization-life-installer-20261005' },
  win: { ...configuration.win, executableName: 'alicization-lifeqa-20261005' },
  nsis: {
    ...configuration.nsis,
    guid: 'e537ca18-7987-4af8-9e5b-10932803a1d1',
    artifactName: 'Alicization-Life-QA-20261005.exe',
    shortcutName: 'AlicizationLifeQA20261005',
    uninstallDisplayName: 'AlicizationLifeQA20261005',
    createDesktopShortcut: false,
    createStartMenuShortcut: false,
    runAfterFinish: false,
    perMachine: false,
  },
}
