interface DesktopViewBootstrapPorts {
  restoreConversation: () => unknown | Promise<unknown>
  restoreModels: () => unknown | Promise<unknown>
  hydrateConfiguration: () => unknown | Promise<unknown>
  configurationReady: () => unknown | Promise<unknown>
  initializeLife: () => unknown | Promise<unknown>
}

/** Local views must restore even while the authoritative life snapshot waits. */
export async function initializeDesktopView(ports: DesktopViewBootstrapPorts) {
  await Promise.all([
    Promise.resolve().then(ports.restoreConversation),
    Promise.resolve().then(ports.restoreModels),
    Promise.resolve().then(ports.hydrateConfiguration).then(ports.configurationReady),
    Promise.resolve().then(ports.initializeLife),
  ])
}
