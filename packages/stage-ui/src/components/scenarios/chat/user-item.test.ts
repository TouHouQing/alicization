import { expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'

import UserItem from './user-item.vue'

it.each(['desktop', 'mobile'] as const)('shows the exact user text as literal text on %s, including markup, paths and line breaks', async (variant) => {
  const content = '第一段 <safe> & 中文🙂\nC:\\work\\my_file.txt **原文**\n<script>window.userTextMustNeverExecute = true</script>'
  const html = await renderToString(createSSRApp(UserItem, { message: { role: 'user', content }, label: '你', variant }))
  expect(html).toContain('&lt;safe&gt; &amp; 中文🙂\nC:\\work\\my_file.txt **原文**')
  expect(html).toContain('&lt;script&gt;window.userTextMustNeverExecute = true&lt;/script&gt;')
  expect(html).not.toContain('<script>')
})
