import { expect, it } from 'vitest'

import { isCreativeRequestWithoutVisualSource } from './runtime-creative-inspection-scope'

it.each([
  '请写一篇八百字的雨天绘画散文，细致描述窗边的光、纸张、颜料和雨声。',
  '请用六个短句描述一个安静的雨天画画的下午，不用分点，像平常聊天一样。',
  'Write a short story about a rainy afternoon by the window.',
  'Compose a poem about rain.',
  '雨の午後を描く短い物語を書いて。',
  '写个名为“屏幕与窗口”的短篇小说。',
])('does not acquire desktop perception for fictional writing: %s', (text) => {
  expect(isCreativeRequestWithoutVisualSource(text)).toBe(true)
})

it.each([
  '请根据当前屏幕上的照片写一篇雨天散文。',
  '看看这张图片，再写一篇故事。',
  'Write a poem based on this screenshot.',
  'Compose a story using the photo on my screen.',
  'この画面をもとに短い物語を書いて。',
  '看看当前窗口里的画有什么问题？',
])('keeps an explicit visual source or ordinary inspection available: %s', (text) => {
  expect(isCreativeRequestWithoutVisualSource(text)).toBe(false)
})
