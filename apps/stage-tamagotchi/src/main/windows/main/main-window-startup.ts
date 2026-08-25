export async function setupMainWindowBeforeRendererLoad(params: {
  setupInvokes: () => Promise<void>
  loadRenderer: () => Promise<void>
}) {
  await params.setupInvokes()
  await params.loadRenderer()
}
