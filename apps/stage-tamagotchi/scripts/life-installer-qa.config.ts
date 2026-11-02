import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { env } from 'node:process'
import { fileURLToPath } from 'node:url'

import configuration from '../electron-builder.config'

const { installerQaIdentity } = createRequire(import.meta.url)('./life-acceptance/installer-qa-identity.cjs')
const identity = installerQaIdentity({ workspace: fileURLToPath(new URL('../../..', import.meta.url)), runId: env.LIFE_QA_INSTALLER_ID })

// Separate installer identity protects the user's existing installation and
// shortcuts while exercising the same compiled runtime and NSIS data policy.
export default {
  ...configuration,
  appId: identity.appId,
  productName: identity.productName,
  directories: { ...configuration.directories, output: resolve(identity.release) },
  extraMetadata: { ...configuration.extraMetadata, name: identity.packageName, lifeQaInstallerId: identity.runId },
  win: { ...configuration.win, executableName: identity.executableName },
  nsis: {
    ...configuration.nsis,
    guid: identity.guid,
    artifactName: `Alicization-Life-QA-${identity.runId}.exe`,
    shortcutName: identity.productName,
    uninstallDisplayName: identity.productName,
    createDesktopShortcut: false,
    createStartMenuShortcut: false,
    runAfterFinish: false,
    perMachine: false,
    allowElevation: false,
    deleteAppDataOnUninstall: false,
  },
}
