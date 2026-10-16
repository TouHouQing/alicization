import { Application } from '@pixi/app'
import { extensions } from '@pixi/extensions'
import { Ticker, TickerPlugin } from '@pixi/ticker'
import { Live2DFactory, Live2DModel } from 'pixi-live2d-display/cubism4'

import { disposeLive2DModel } from './live2d-model-load'

/**
 * Render a Live2D zip/file to an offscreen canvas and return a padded preview data URL.
 */
export async function renderLive2DModelPreview(file: File, cropImg: (canvas: HTMLCanvasElement) => HTMLCanvasElement) {
  Live2DModel.registerTicker(Ticker)
  extensions.add(TickerPlugin)

  const previewWidth = 384
  const previewHeight = 512
  const previewResolution = 2

  const offscreenCanvas = document.createElement('canvas')
  offscreenCanvas.width = previewWidth * previewResolution
  offscreenCanvas.height = previewHeight * previewResolution
  offscreenCanvas.style.position = 'absolute'
  offscreenCanvas.style.top = '0'
  offscreenCanvas.style.left = '0'
  offscreenCanvas.style.objectFit = 'cover'
  offscreenCanvas.style.display = 'block'
  offscreenCanvas.style.zIndex = '10000000000'
  offscreenCanvas.style.opacity = '0'
  offscreenCanvas.style.pointerEvents = 'none'
  document.body.appendChild(offscreenCanvas)

  let app: Application | undefined
  let modelInstance: Live2DModel | undefined
  try {
    app = new Application({
      view: offscreenCanvas,
      width: offscreenCanvas.width,
      height: offscreenCanvas.height,
      // Ensure the drawing buffer persists so toDataURL() can read pixels
      preserveDrawingBuffer: true,
      backgroundAlpha: 0,
      autoDensity: false,
      resolution: 1,
      autoStart: false,
    })
    app.stage.scale.set(previewResolution)
    app.ticker.stop()
    modelInstance = new Live2DModel()
    // The upstream ZIP loader checks its suffix case-sensitively.
    const sdkFile = file.name.endsWith('.zip') ? file : new File([file], file.name.replace(/\.zip$/i, '.zip'), { type: file.type, lastModified: file.lastModified })
    await Live2DFactory.setupLive2DModel(modelInstance, [sdkFile], { autoInteract: false })
    app.stage.addChild(modelInstance)

    const scale = Math.min(previewWidth * 0.92 / modelInstance.width, previewHeight * 0.96 / modelInstance.height)
    modelInstance.scale.set(scale)
    modelInstance.anchor.set(0.5, 1)
    modelInstance.x = previewWidth / 2
    modelInstance.y = previewHeight * 0.98

    await new Promise(resolve => setTimeout(resolve, 500))
    app.renderer.render(app.stage)

    const croppedCanvas = cropImg(offscreenCanvas)

    // padding to 12:16
    const paddingCanvas = document.createElement('canvas')
    paddingCanvas.width = croppedCanvas.width > croppedCanvas.height / 16 * 12 ? croppedCanvas.width : croppedCanvas.height / 16 * 12
    paddingCanvas.height = paddingCanvas.width / 12 * 16
    const paddingCanvasCtx = paddingCanvas.getContext('2d')!

    paddingCanvasCtx.drawImage(croppedCanvas, (paddingCanvas.width - croppedCanvas.width) / 2, (paddingCanvas.height - croppedCanvas.height) / 2, croppedCanvas.width, croppedCanvas.height)
    const paddingDataUrl = paddingCanvas.toDataURL()

    return paddingDataUrl
  }
  finally {
    try {
      if (modelInstance)
        disposeLive2DModel(modelInstance)
    }
    finally {
      try {
        app?.destroy(true)
      }
      finally {
        offscreenCanvas.remove()
      }
    }
  }
}
