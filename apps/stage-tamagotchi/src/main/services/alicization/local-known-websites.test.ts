import { describe, expect, it } from 'vitest'

import { resolveAlicizationKnownWebsiteBySite } from './local-known-websites'

describe('local known websites', () => {
  it.each([
    ['weibo', 'weibo', 'https://weibo.com'],
    ['新浪微博', 'weibo', 'https://weibo.com'],
    ['git hub', 'github', 'https://github.com'],
    ['B站', 'bilibili', 'https://www.bilibili.com'],
  ])('normalizes structured site parameter %s', (site, expectedSite, expectedUrl) => {
    expect(resolveAlicizationKnownWebsiteBySite(site)).toEqual(expect.objectContaining({
      site: expectedSite,
      url: expectedUrl,
    }))
  })

  it('does not interpret a free-form chat request as a structured site parameter', () => {
    expect(resolveAlicizationKnownWebsiteBySite('帮我打开微博然后搜索 Alicization')).toBeNull()
  })
})
