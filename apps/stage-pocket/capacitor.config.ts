import type { CapacitorConfig } from '@capacitor/cli'

import { argv, env } from 'node:process'

const serverURL = env.CAPACITOR_DEV_SERVER_URL

const appId = argv.includes('android') ? 'com.tohoqing.alicization_pocket' : 'com.tohoqing.alicization-pocket'

const config: CapacitorConfig = {
  appId,
  appName: 'Alicization',
  webDir: 'dist',
  server: serverURL
    ? {
        url: serverURL,
        cleartext: false,
      }
    : undefined,
}

export default config
