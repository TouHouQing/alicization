import * as v from 'valibot'

const color = v.pipe(v.string(), v.regex(/^#[a-f\d]{6}$/iu))
const schema = v.strictObject({ title: v.pipe(v.string(), v.minLength(1), v.maxLength(80)), scene: v.picklist(['lantern', 'garden', 'rain', 'abstract']), palette: v.tuple([color, color, color]), arrangement: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(7)) })
export type LifeVisualDraft = v.InferOutput<typeof schema>
export const lifeVisualResponseFormat = { type: 'json_schema' as const, json_schema: { name: 'life_visual_study', strict: true, schema: { type: 'object', additionalProperties: false, required: ['title', 'scene', 'palette', 'arrangement'], properties: { title: { type: 'string', minLength: 1, maxLength: 80 }, scene: { type: 'string', enum: ['lantern', 'garden', 'rain', 'abstract'] }, palette: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'string', pattern: '^#[a-fA-F0-9]{6}$' } }, arrangement: { type: 'integer', minimum: 0, maximum: 7 } } } } }
export function parseLifeVisualDraft(text: string | null): LifeVisualDraft | null {
  if (!text)
    return null
  try { return v.parse(schema, JSON.parse(text)) }
  catch { return null }
}

const escape = (text: string) => text.replace(/[<>&"']/gu, character => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', '\'': '&apos;' })[character]!)

/**
 * Model chooses the composition and colors. The renderer owns SVG syntax,
 * so no generated script, URL or active document can enter an artwork.
 */
export function renderLifeVisualDraft(input: LifeVisualDraft, source: string) {
  const draft = v.parse(schema, input)
  const [background, accent, detail] = draft.palette
  const x = 220 + draft.arrangement * 34
  const shapes = draft.scene === 'lantern'
    ? `<path d="M0 470 Q240 330 640 420 V640 H0Z" fill="${detail}"/><rect x="${x - 32}" y="250" width="64" height="100" rx="16" fill="${accent}"/><path d="M${x - 20} 250 Q${x} 200 ${x + 20} 250" fill="none" stroke="${detail}" stroke-width="8"/><line x1="${x}" y1="350" x2="${x}" y2="460" stroke="${accent}" stroke-width="5"/>`
    : draft.scene === 'garden'
      ? Array.from({ length: 6 }, (_, index) => `<path d="M${80 + index * 95} 520 Q${120 + index * 85} 410 ${70 + index * 95} 280" fill="none" stroke="${detail}" stroke-width="9"/><circle cx="${70 + index * 95}" cy="${280 + index % 2 * 35}" r="${24 + draft.arrangement}" fill="${accent}"/>`).join('')
      : draft.scene === 'rain'
        ? Array.from({ length: 20 }, (_, index) => `<line x1="${30 + index % 8 * 78}" y1="${110 + Math.floor(index / 8) * 150}" x2="${10 + index % 8 * 78}" y2="${180 + Math.floor(index / 8) * 150}" stroke="${index % 3 ? accent : detail}" stroke-width="5" stroke-linecap="round"/>`).join('')
        : `<circle cx="${x}" cy="300" r="140" fill="${accent}"/><path d="M40 460 Q320 80 600 430 L500 530Z" fill="${detail}"/><circle cx="470" cy="170" r="45" fill="${detail}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><title>${escape(draft.title)}</title><desc>本地视觉练习；虚构画面，不代表现实经历。来源：${escape(source)}</desc><rect width="640" height="640" rx="24" fill="${background}"/>${shapes}</svg>\n`
}

export function isPassiveLifeSvg(text: string) {
  return text.startsWith('<svg xmlns="http://www.w3.org/2000/svg"') && /<\/svg>\s*$/u.test(text) && !/<(?:script|foreignObject|image|use|iframe|animate|set)\b|\bon\w+\s*=|href|url\s*\(|<!|<\?/iu.test(text) && !/<\/?(?!svg\b|title\b|desc\b|rect\b|path\b|circle\b|line\b|ellipse\b|polygon\b|polyline\b|g\b|text\b)[a-z]/iu.test(text)
}
