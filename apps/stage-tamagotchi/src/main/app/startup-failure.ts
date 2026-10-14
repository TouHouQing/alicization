import type { MessageBoxOptions } from 'electron'

import { errorMessageFrom } from '@moeru/std'

export function createStartupFailureHandler(options: {
  translate: (key: string) => string
  userDataPath: string
  logsPath: string
  hideWindows: () => void
  showMessage: (input: MessageBoxOptions) => Promise<{ response: number }>
  openPath: (path: string) => Promise<string>
  quit: () => void
  report: (error: unknown) => void
}) {
  let presenting: Promise<void> | null = null
  return (error: unknown) => {
    options.report(error)
    if (presenting)
      return presenting
    presenting = (async () => {
      options.hideWindows()
      const key = 'tamagotchi.electron.startup.failure.'
      const result = await options.showMessage({ type: 'error', title: options.translate(`${key}title`), message: options.translate(`${key}message`), detail: `${options.translate(`${key}detail`)}\n\n${(errorMessageFrom(error) ?? 'Unknown startup error').slice(0, 1200)}`, buttons: [options.translate(`${key}logs`), options.translate(`${key}data`), options.translate(`${key}close`)], defaultId: 0, cancelId: 2, noLink: true })
      if (result.response === 0 || result.response === 1) {
        const openError = await options.openPath(result.response === 0 ? options.logsPath : options.userDataPath)
        if (openError)
          options.report(new Error(openError))
      }
    })().catch(options.report).finally(options.quit)
    return presenting
  }
}
