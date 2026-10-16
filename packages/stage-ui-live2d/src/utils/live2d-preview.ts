import cropImg from '@lemonneko/crop-empty-pixels'

import { renderLive2DModelPreview } from './live2d-preview-renderer'

export function loadLive2DModelPreview(file: File) {
  return renderLive2DModelPreview(file, cropImg)
}
