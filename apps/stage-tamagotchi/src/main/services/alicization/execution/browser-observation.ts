import type { BrowserNodeIdentity } from './browser-cdp'

import pageSource from '../life-windows-browser-page.js?raw'

export const browserPageScript = pageSource.replace(/^export /gmu, '')
export interface BrowserPageElement extends BrowserNodeIdentity {
  selector: string
  text: string
  tag: string
  type: string
  href: string | null
  disabled: boolean
  visibleText?: string
  password?: boolean
  formAction?: string | null
  formMethod?: string | null
  submitControl?: boolean
  formState?: string | null
  formPreview?: string | null
  sensitiveForm?: boolean
  multiple?: boolean
  frameUrl?: string
}
export interface BrowserPageObservation { url: string, title: string, readyState: string, text: string, html?: string, elements: BrowserPageElement[] }
