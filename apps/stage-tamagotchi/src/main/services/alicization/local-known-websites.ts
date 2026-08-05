export interface AlicizationLocalKnownWebsiteResolution {
  label: string
  matchedAlias: string
  site: string
  url: string
}

const localKnownWebsiteCatalog = [
  {
    site: 'weibo',
    label: '微博',
    url: 'https://weibo.com',
    aliases: ['微博', 'weibo', '新浪微博'],
  },
  {
    site: 'baidu',
    label: '百度',
    url: 'https://www.baidu.com',
    aliases: ['百度', 'baidu'],
  },
  {
    site: 'google',
    label: 'Google',
    url: 'https://www.google.com',
    aliases: ['谷歌', 'google'],
  },
  {
    site: 'github',
    label: 'GitHub',
    url: 'https://github.com',
    aliases: ['github', 'git hub', 'git-hub'],
  },
  {
    site: 'bilibili',
    label: 'Bilibili',
    url: 'https://www.bilibili.com',
    aliases: ['b站', '哔哩哔哩', 'bilibili', 'bili'],
  },
  {
    site: 'zhihu',
    label: '知乎',
    url: 'https://www.zhihu.com',
    aliases: ['知乎', 'zhihu'],
  },
] as const

function normalizeSiteParameter(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/gu, ' ')
}

export function resolveAlicizationKnownWebsiteBySite(
  rawSite: string,
): AlicizationLocalKnownWebsiteResolution | null {
  const normalizedSite = normalizeSiteParameter(rawSite)
  if (!normalizedSite)
    return null

  for (const entry of localKnownWebsiteCatalog) {
    const matchedAlias = entry.aliases.find((alias) => {
      return normalizeSiteParameter(alias) === normalizedSite
    })
    if (!matchedAlias)
      continue

    return {
      label: entry.label,
      matchedAlias,
      site: entry.site,
      url: entry.url,
    }
  }

  return null
}
