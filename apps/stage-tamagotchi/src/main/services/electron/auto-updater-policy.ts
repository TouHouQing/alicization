export function shouldEnableAutoUpdater(input: {
  isDev: boolean
  isPackaged: boolean
  hasUpdateConfig: boolean
}) {
  return !input.isDev && input.isPackaged && input.hasUpdateConfig
}
