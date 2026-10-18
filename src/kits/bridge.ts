/**
 * The page half of the bridge: UISandbox talking to somebody's RUNNING app.
 *
 * The app carries one script line (public/live.js, built from
 * live.template.js). The sandbox frames the app's address, the script answers
 * with the kit it sees, and — asked by name — with that kit's variables as the
 * app computes them. From those the export writes the app's design system in
 * its kit's own names, starting from the app's own values.
 *
 * What it cannot do, and why: an app on another origin cannot be tokenised —
 * there is no stylesheet the sandbox can read — so the knobs, Check 1:1 and the
 * reach meter do not run on it. Turning a live app is the one-screen layout's
 * job (phase 3), and it will use the `uicockpit:theme` message live.js already
 * takes.
 *
 * Ported from the page half of UIcockpit's bridge (page.template.html in
 * Ideelab/uicockpit at 37ed9bc: the message listener, appPayload, drawApp).
 */
import type { KitId } from './engine/detect.mjs'
import { kitVarNames, roleValuesFromVars } from './fromPage'
import { kitExport } from './kitExport'
import { pinToBuild, lightDeclarations } from './pin'

const KITS: readonly KitId[] = ['tailwind', 'daisyui', 'shadcn', 'bootstrap', 'material', 'radix', 'mantine', 'antd', 'openprops']

export interface AppHello { kit: KitId | null; title: string; href: string }

/** The line to paste into the app's <head>. Assembled, never written: a
 *  literal closing script tag inside an inline module ends the module where
 *  it stands, the lesson UIcockpit's drawApp carries. */
export function liveSnippet(origin: string): string {
  return '<script src="' + origin + '/live.js"><' + '/script>'
}

/** Why an address cannot be framed, or null. */
export function refuseAddress(raw: string, here: string): { url: string } | { why: string } {
  let s = raw.trim()
  if (!s) return { why: 'Paste the address your app runs on.' }
  if (!/^https?:\/\//i.test(s)) s = 'http://' + s
  let u: URL
  try { u = new URL(s) } catch { return { why: 'That is not an address a browser can open.' } }
  if (!/^https?:$/.test(u.protocol)) return { why: 'Only http and https addresses can be framed.' }
  // A frame on THIS origin, with scripts and its own origin allowed, could lift
  // its own sandbox and reach the page around it. Refused, rather than
  // sandboxed into uselessness: a running app is on its own address anyway.
  if (u.origin === here) return { why: 'That is UISandbox itself. Paste the address of the app you are building.' }
  return { url: u.href }
}

/** Frame the app and wait for its live.js to say hello. */
export function connectApp(frame: HTMLIFrameElement, url: string, timeout = 6000): Promise<AppHello> {
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => { clearTimeout(timer); removeEventListener('message', on); fn() }
    const on = (e: MessageEvent) => {
      // Only the frame we opened, and only its hello: a message is data from
      // somebody else's page, and is treated as such.
      if (e.source !== frame.contentWindow || e.data?.type !== 'uicockpit:ready') return
      const kit = KITS.includes(e.data.kit) ? (e.data.kit as KitId) : null
      done(() => resolve({ kit, title: String(e.data.title ?? '').slice(0, 200), href: String(e.data.href ?? url).slice(0, 2000) }))
    }
    const timer = setTimeout(() => done(() => reject(new Error('Nothing heard back. Is the script line in the page, and does the address load outside a frame?'))), timeout)
    addEventListener('message', on)
    frame.src = url
  })
}

let asked = 0
/** Ask the app for these variables, as it computes them. Sent to the app's
 *  own origin only, and answered by it to ours only. */
export function readAppVars(frame: HTMLIFrameElement, names: string[], timeout = 4000): Promise<Record<string, string>> {
  const win = frame.contentWindow
  if (!win) return Promise.reject(new Error('The app frame is gone.'))
  const origin = new URL(frame.src).origin
  const id = ++asked
  return new Promise((resolve, reject) => {
    const done = (fn: () => void) => { clearTimeout(timer); removeEventListener('message', on); fn() }
    const on = (e: MessageEvent) => {
      if (e.source !== win || e.origin !== origin || e.data?.type !== 'uicockpit:values' || e.data.id !== id) return
      const out: Record<string, string> = {}
      for (const [k, v] of Object.entries(e.data.values ?? {})) if (/^--[\w-]+$/.test(k) && typeof v === 'string') out[k] = v.slice(0, 2000)
      done(() => resolve(out))
    }
    const timer = setTimeout(() => done(() => reject(new Error('The app did not answer. Its live.js may be an old copy.'))), timeout)
    addEventListener('message', on)
    win.postMessage({ type: 'uicockpit:read', id, names }, origin)
  })
}

/** The running app's design system, in its kit's own names, from its own
 *  values. The same rule as a dropped build: the app's own variables win, and
 *  the engine's derivation fills only what the app does not define. */
export async function liveExport(frame: HTMLIFrameElement, kit: KitId, name: string): Promise<Record<string, string>> {
  const values = roleValuesFromVars(kit, await readAppVars(frame, kitVarNames(kit)))
  const overview = `These values were read off ${name} while it ran, through UISandbox's live bridge, not chosen. They are written here in the names this kit publishes, so they are the ones to build against.`
  const files = await kitExport(kit, values, name, { overview })
  const theme = files['theme.css']
  if (theme) files['theme.css'] = pinToBuild(theme, await readAppVars(frame, lightDeclarations(theme))).css
  return files
}
