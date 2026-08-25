import type { EventEmitter } from 'node:events'

export function registerAppExitSignalHandlers(
  processEvents: Pick<EventEmitter, 'on'>,
  handleAppExit: () => void | Promise<void>,
) {
  const exit = () => {
    void handleAppExit()
  }

  processEvents.on('SIGINT', exit)
  processEvents.on('SIGTERM', exit)
}
