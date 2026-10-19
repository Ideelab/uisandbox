/**
 * "Take this screen along": the half that runs in the uisandbox tab.
 *
 * What arrives over postMessage is checked as untrusted (it is: any page the
 * user clicked the bookmarklet on), cleaned of anything that runs, and filed
 * as a build would be: one index.html per screen under the path it was taken
 * at, and the sheets and assets it shares with other screens under `_c/`, by
 * content. The project is then built from those files through the same
 * buildProject a dropped zip goes through; nothing here knows about knobs.
 */
import type { Archive, ZipEntry } from '../audit/intake/readZip'
import { mimeOf } from '../sandbox/project'

export interface CaptureStats {
  sheets: number; sheetsFromCssom: number; sheetsRefused: number
  styles: number; stylesFromCssom: number
  assets: number; assetsRefused: number
  shadowRoots: number; maybeClosedShadow: number
  canvases: number; canvasesBlank: number
  frames: number; scripts: number
}

export interface CapturedScreen {
  origin: string
  href: string
  title: string
  viewport: { w: number; h: number; dpr: number }
  html: string
  files: Array<{ path: string; blob: Blob }>
  refused: Array<{ url: string; why: string }>
  stats: CaptureStats
  captureMs: number
  bytes: number
  /** Milliseconds from the bookmarklet's send to this tab's receipt. */
  transferMs: number
}

const FILE = /^_c\/[a-z0-9]{2,24}\.[a-z0-9]{1,5}$/
const MAX_HTML = 8 * 1024 * 1024
const MAX_FILES = 4000
const MAX_BYTES = 400 * 1024 * 1024

/** The message, or why it is refused. `origin` is the sender's, from the event. */
export function readCapture(data: unknown, origin: string): CapturedScreen | string {
  const d = data as Record<string, unknown> | null
  if (!d || d.type !== 'uisandbox:capture' || d.v !== 1) return 'not a capture message'
  if (typeof d.html !== 'string' || !d.html) return 'no page in the message'
  if (d.html.length > MAX_HTML) return `the page is ${Math.round(d.html.length / 1048576)} MB of HTML, more than the 8 MB a page may be here`
  if (typeof d.href !== 'string') return 'no address in the message'
  let href: URL
  try { href = new URL(d.href) } catch { return 'the address in the message is not a URL' }
  // The page says where it was taken; the browser says who sent it. They agree, or nothing is taken.
  if (href.origin !== origin) return `the message came from ${origin} but says it was taken at ${href.origin}`
  if (!Array.isArray(d.files) || d.files.length > MAX_FILES) return 'the file list is missing or too long'
  let total = d.html.length
  const files: CapturedScreen['files'] = []
  for (const f of d.files as Array<Record<string, unknown>>) {
    if (!f || typeof f.path !== 'string' || !FILE.test(f.path) || !(f.blob instanceof Blob)) return 'a file in the message is not a captured file'
    total += f.blob.size
    files.push({ path: f.path, blob: f.blob })
  }
  if (total > MAX_BYTES) return `the screen is ${Math.round(total / 1048576)} MB, more than a tab can hold here`
  const vp = (d.viewport ?? {}) as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  const s = (d.stats ?? {}) as Record<string, unknown>
  const stats = Object.fromEntries(['sheets', 'sheetsFromCssom', 'sheetsRefused', 'styles', 'stylesFromCssom', 'assets', 'assetsRefused', 'shadowRoots', 'maybeClosedShadow', 'canvases', 'canvasesBlank', 'frames', 'scripts'].map((k) => [k, num(s[k])])) as unknown as CaptureStats
  const refused = (Array.isArray(d.refused) ? d.refused : []).slice(0, 200)
    .filter((r): r is { url: string; why: string } => !!r && typeof (r as { url?: unknown }).url === 'string' && typeof (r as { why?: unknown }).why === 'string')
    .map((r) => ({ url: r.url.slice(0, 300), why: r.why.slice(0, 120) }))
  return {
    origin, href: href.href, title: typeof d.title === 'string' ? d.title.slice(0, 200) : '',
    viewport: { w: num(vp.w), h: num(vp.h), dpr: num(vp.dpr) },
    html: d.html, files, refused, stats,
    captureMs: num(d.captureMs), bytes: total, transferMs: Math.max(0, Date.now() - num(d.sentAt)),
  }
}

const URL_ATTRS = ['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster']

/**
 * Anything that runs, gone, again, whatever the sender claims to have done:
 * scripts, handlers, javascript: URLs, <base>, a meta refresh or CSP, and the
 * address of every frame. Inside declarative shadow roots too (a template's
 * content is not reached by querySelectorAll on the document).
 */
export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const clean = (root: ParentNode) => {
    for (const el of Array.from(root.querySelectorAll('script, base, meta[http-equiv]'))) {
      if (el.localName === 'meta' && !/refresh|content-security-policy/i.test(el.getAttribute('http-equiv') ?? '')) continue
      el.remove()
    }
    for (const el of Array.from(root.querySelectorAll('*'))) {
      for (const a of Array.from(el.attributes)) {
        if (/^on/i.test(a.name)) el.removeAttribute(a.name)
        else if (URL_ATTRS.includes(a.name) && /^\s*(javascript|vbscript):/i.test(a.value)) el.removeAttribute(a.name)
      }
      if (/^(iframe|frame|embed|object)$/.test(el.localName)) for (const a of ['src', 'srcdoc', 'data']) el.removeAttribute(a)
      if (el.localName === 'template') clean((el as HTMLTemplateElement).content)
    }
  }
  clean(doc)
  const doctype = doc.doctype ? '<!DOCTYPE html>' : ''
  return doctype + doc.documentElement.outerHTML
}

/** Where a screen goes in the project: the path it was taken at, a second take of the same path beside it. */
export function screenPath(href: string, taken: Set<string>): string {
  const u = new URL(href)
  const segs = u.pathname.split('/').map((s) => { try { return decodeURIComponent(s) } catch { return s } })
    .map((s) => s.replace(/\.html?$/i, '').replace(/[^\w.-]+/g, '-').replace(/^\.+/, ''))
    .filter(Boolean)
  const base = segs.join('/')
  for (let n = 1; ; n++) {
    const dir = n === 1 ? base : `${base ? base + '/' : ''}take-${n}`
    const path = `${dir ? dir + '/' : ''}index.html`
    if (!taken.has(path)) return path
  }
}

/** The captured screens as an Archive, the one input buildProject takes. */
export function captureArchive(name: string, pages: Map<string, string>, files: Map<string, Blob>): Archive {
  const blobs = new Map<string, Blob>()
  for (const [p, html] of pages) blobs.set(p, new Blob([html], { type: mimeOf(p) }))
  for (const [p, b] of files) blobs.set(p, b)
  const entries: ZipEntry[] = [...blobs.entries()].map(([path, b]) => ({ path, size: b.size, compSize: b.size, method: 0, offset: 0 }))
  return {
    rootName: name,
    entries,
    readBlob: async (e) => blobs.get(e.path) ?? null,
    readText: async (e) => (await blobs.get(e.path)?.text()) ?? null,
  }
}

/** The bookmarklet: the capture function's own source, called with this origin. */
export function bookmarklet(source: string, origin: string): string {
  return 'javascript:' + encodeURIComponent(`void (${source})(${JSON.stringify(origin)})`)
}
/** The same, for a console that runs what is pasted (the fallback where a bookmarklet is refused). */
export function consoleLine(source: string, origin: string): string {
  return `(${source})(${JSON.stringify(origin)})`
}
