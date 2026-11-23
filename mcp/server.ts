#!/usr/bin/env node
/**
 * UISandbox as an MCP server — the same engine the browser runs, no second
 * implementation (notes/lessons.md: one source, no mirror).
 *
 *   pnpm mcp                        stdio server (add to Claude/Cursor as a command)
 *   UISANDBOX_URL=http://localhost:5190 pnpm mcp    render tools against a local app
 *
 * Tools:
 *   load       { zipUrl | zipPath }         → project id, screens, values, the baseline (brand, fonts, families)
 *   screens    { id }                       → the screens
 *   set        { id, knobs }                → apply knobs (brand hex, dials, families, fonts, dark); what moved
 *   export     { id, format }               → sheet-css | sheet-json | patch | tokens-css | tokens-json | tailwind | shadcn | swift | android-xml | android-kotlin
 *   open       { id, screen? }              → THE SANDBOX ITSELF in the user's browser, served from 127.0.0.1 by this
 *                                             process (the web app ships in the package); what they turn flows back
 *   state      { id }                       → the knobs now, incl. what the user turned in the browser
 *   verify     { id, screen? }              → the 1:1 check in headless Chromium (raw vs identity), plus reach
 *   screenshot { id, screen?, width? }      → PNG (base64) of the screen with the current knobs
 *
 * `load`, `set`, `export` are pure Node over src/. `verify` and `screenshot`
 * drive the real app (UISANDBOX_URL, default https://uisandbox.org) with the
 * archive served from a route inside the headless browser — the same way the
 * hold-out runner measures, so the number an agent gets is the number a
 * visitor gets.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { readFileSync, existsSync, statSync, openSync, writeFileSync, unlinkSync } from 'node:fs'
import { basename, join, dirname, extname } from 'node:path'
import { homedir, tmpdir } from 'node:os'
import { createServer, request as httpRequest, type Server, type IncomingMessage, type ServerResponse } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { connect as netConnect } from 'node:net'
import { connect as tlsConnect } from 'node:tls'
import { zipSync } from '../src/export/zip'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { openZip, type Archive } from '../src/audit/intake/readZip'
import { buildProject, type SandboxProject } from '../src/sandbox/project'
import { deriveBaseline, type BaselineReport } from '../src/sandbox/baseline'
import { computeVars } from '../src/sandbox/mapping'
import { carryToken, differingKeys, isShownKnob, knobLabel } from '../src/state/carry'
import { buildTokens } from '../src/tokens/buildTokens'
import { formatCssColor } from '../src/sandbox/cssColor'
import { encode } from '../src/state/hash'
import { DEFAULT_DIALS, type Dials } from '../src/sandbox/dials'
import { genSheetCss, genSheetJson, genPatch } from '../src/export/genSheet'
import { genCss } from '../src/export/genCss'
import { genJson } from '../src/export/genJson'
import { genTailwind } from '../src/export/genTailwind'
import { genShadcn } from '../src/export/genShadcn'
import { genSwift } from '../src/export/genSwift'
import { genAndroidColorsXml, genAndroidKotlin } from '../src/export/genAndroid'
import type { Config } from '../src/tokens/types'
import { refusalFor } from '../src/sandbox/platform'

const APP_ENV = process.env.UISANDBOX_URL?.replace(/\/$/, '')

interface Loaded {
  id: string; name: string; bytes: Uint8Array<ArrayBuffer>; project: SandboxProject; report: BaselineReport; cfg: Config; archive: Archive; touchedInBrowser?: number
  /** A RUNNING dev server this project is (live mode), e.g. http://localhost:5173. */
  live?: string
  /** Who opened it: an agent (MCP `open`) or the terminal (`npx uisandbox-mcp open`). Decides where Send goes. */
  via?: 'agent' | 'cli'
  /** When the user last pressed Send in the sandbox, and whether that send was handed over yet. */
  sent?: number; delivered?: boolean
  /** The page's own account at the last Send: it saw the runtime and
   *  hot-reloaded styles this server never fetched (live mode above all). */
  pageReport?: { turned: Array<{ knob: string; from: unknown; to: unknown }>; moved: number; of: number; patch: string }
  /** When a headless page (quiet) last reported what it measured. */
  reportAt?: number
}
const projects = new Map<string, Loaded>()
/* Agents waiting in `wait_for_send`, per project: resolved by the next Send. */
const waiting = new Map<string, Array<() => void>>()
let seq = 0

const summarise = (p: Loaded) => {
  const b = p.report.baseline
  const fam = b.families
  const centre = (k: keyof NonNullable<typeof fam>['centre']) => { const c = fam?.centre[k]; return c ? formatCssColor({ ...c, a: 1 }) : undefined }
  const vars = computeVars(p.project.table, b, p.cfg, buildTokens(p.cfg))
  const identity = p.project.table.identityVars()
  const moved = Object.keys(vars).filter((k) => vars[k] !== identity[k]).length
  return {
    id: p.id, name: p.name, root: p.project.root || '/', base: p.project.base || '', platform: p.project.platform.kind,
    screens: p.project.screens.length, values: p.project.table.entries.length, cssKB: Math.round(p.project.cssBytes / 1024),
    baseline: {
      brand: b.cfg.cPrimary, fontDisplay: b.cfg.fontDisplay, fontBody: b.cfg.fontBody,
      families: { secondary: centre('secondary'), accent: centre('accent'), success: centre('success'), warning: centre('warning'), danger: centre('danger'), info: centre('info') },
      palette: fam?.palette?.length ?? 0, canvas: fam?.canvas ? formatCssColor({ ...fam.canvas, a: 1 }) : undefined,
      darkMode: p.project.scheme.hooks.length > 0 || p.project.scheme.media,
    },
    knobs: { cPrimary: p.cfg.cPrimary, fontDisplay: p.cfg.fontDisplay, fontBody: p.cfg.fontBody, ...p.cfg.sb },
    moved,
    notes: p.report.notes,
  }
}

/* What a Send hands over: what the user turned (in the panel's own names, from
   → to), how many of the build's values moved, and the patch that writes the
   result into their source. Ready to act on, not a dump to interpret. */
/** The patch held against the files it names, where they are on this machine
 *  (a Vite dev server names the absolute source path; a build, a path under
 *  the folder this runs in). A value the file does not hold as written is a
 *  framework default compiled in (Tailwind's own 0.25rem) or a computed one:
 *  said on its line, so an agent does not hunt for it (decision 217). Lines
 *  of a file that cannot be read are left as they were. */
function checkPatch(patch: string): string {
  let text: string | null = null
  return patch.split('\n').map((line) => {
    const h = line.match(/^## (.+)$/)
    if (h) {
      const name = h[1]!.trim()
      const path = [name, join(process.cwd(), name.replace(/^\//, ''))].find((x) => { try { return statSync(x).isFile() } catch { return false } })
      try { text = path ? readFileSync(path, 'utf8') : null } catch { text = null }
      return line
    }
    const m = line.match(/^\S+\s+(.+?)\s+→\s+/)
    if (!m || text === null || /^#/.test(line)) return line
    const from = m[1]!
    const bare = from.replace(/^0\./, '.')
    return text.includes(from) || text.includes(bare) || text.includes(from.replace(/^\./, '0.')) ? line : `${line}   # not in this file as written: a framework default or a computed value; set it where your theme overrides it, or leave it`
  }).join('\n')
}

const sentPayload = (p: Loaded) => {
  if (p.pageReport) {
    const r = p.pageReport
    return { sent: p.sent ? new Date(p.sent).toISOString() : null, project: p.name, turned: r.turned, moved: r.moved, of: r.of, patch: checkPatch(r.patch), next: nextStep(r.turned.length > 0) }
  }
  const base = p.report.baseline.cfg
  const at = (c: Config, k: string) => k.startsWith('sb.') ? (c.sb as unknown as Record<string, unknown>)[k.slice(3)] : (c as unknown as Record<string, unknown>)[k]
  const turned = differingKeys(base, p.cfg).filter(isShownKnob).map((k) => ({ knob: knobLabel(k), from: at(base, k) ?? 'as in the code', to: at(p.cfg, k) ?? 'as in the code' }))
  const vars = computeVars(p.project.table, p.report.baseline, p.cfg, buildTokens(p.cfg))
  const { moved } = summarise(p)
  return {
    sent: p.sent ? new Date(p.sent).toISOString() : null, project: p.name, turned, moved, of: p.project.table.entries.length,
    patch: checkPatch(genPatch(p.project.table, vars)),
    next: nextStep(turned.length > 0),
  }
}
const nextStep = (any: boolean) => any
  ? 'Show the user what they turned and the patch (each line: a literal in their CSS, the value it becomes, and where it sits; a file path names the file), and ask before you change any file. On a yes, apply it to the source, let the dev server reload or rebuild, and `verify` to show it still renders 1:1. For a design system and a SKILL.md in their kit\'s own names, ask them to press Export in the sandbox.'
  : 'They pressed Send without turning anything: nothing to apply.'

const INSTRUCTIONS = `UISandbox renders a BUILT web app 1:1 in a sandbox and turns every CSS literal into a knob that moves the app's own value; "1:1" is measured (a computed-style diff), not promised.

When to use it — and offer it without being asked:
- The user wants to TRY DESIGNS on the app they are building — "let me try some designs", "I'm not happy with how it looks", "try another style", "can I play with the colours / fonts / spacing", "show me a few looks": call \`try_designs\` (no arguments). It finds their app (the dev server running on this machine, else the build in this folder), opens UISandbox in their browser with it live, six looks side by side and every knob, and returns. Tell them to pick a look or turn the knobs and press **Send to your agent**; then \`wait_for_send\`, and show them the patch before changing any file. Offer it yourself when the conversation is about how an app looks: "Shall I open it in UISandbox so you can try a few looks?"
- The user is DEVELOPING an app and its dev server runs (npm run dev, localhost:3000/5173/…): \`load\` with \`devUrl\` (no build), \`open\`, tell them to turn the knobs and press **Send to your agent**, then \`wait_for_send\` and apply the patch it returns (its file paths are their source files). Their hot reload keeps working inside the sandbox, so they see your edit land.
- The user wants to LOOK at an app in a sandbox or PLAY with its design ("can I see this in a sandbox", "let me try some changes", "what would a different brand colour look like"): build the app if you are in its repo (npm run build / vite build / nuxi generate / next build with output: 'export'), zip the output folder (dist/, build/, out/ — never node_modules or source), \`load\` it, then \`open\`. The real, interactive sandbox opens in their browser from 127.0.0.1; nothing leaves the machine. Tell them it is open and that they press **Send to your agent** in the sandbox when they are done. Then call \`wait_for_send\`: it returns when they press it, with what they turned and the patch to apply (call it again if it reports the sandbox still open). If they come back in the chat instead ("export this" / "what did I change"), \`state\`, then \`export\` / \`verify\` / \`screenshot\`.
- The user wants ONE change tried ("try brand #e11d48", "rounder corners"): \`load\` → \`set\` → \`verify\` → \`screenshot\` → \`export\` (patch). Offer \`open\` after.
- The user is iterating on the look of an app you are working in: offer the sandbox proactively, once.

Rules: never claim more than \`verify\` and the reach meter report — quote the numbers; if a load is refused (iOS/Android/source-only), relay the reason and suggest building first; \`verify\`/\`screenshot\` need Chromium (npx playwright install chromium once) — \`open\`, \`load\`, \`set\`, \`export\` do not.`

const VERSION = '0.5.10'
const server = new McpServer({ name: 'uisandbox', version: VERSION }, { instructions: INSTRUCTIONS })

server.registerTool('load', {
  title: 'Load a built web app',
  description: 'Load a web app: a RUNNING dev server by its local address (devUrl, e.g. http://localhost:5173 — live mode: no build needed, hot reload passes through, best while the user is developing), or a BUILT app (a zip of its dist/build/out folder, or a repo zip carrying the build) by URL or local path. Returns the project id, screens, tokenised values and the baseline the knobs stand on. Refuses a build that cannot render (iOS/Android/source-only) with the reason. After a devUrl load, `open` it: the tokenised values and the knobs arrive in the browser as the app renders.',
  inputSchema: { devUrl: z.string().optional().describe('The address of a running dev server on this machine, e.g. http://localhost:3000'), zipUrl: z.string().url().optional().describe('URL of the zip (any URL the server can fetch, incl. GitHub /archive/…zip)'), zipPath: z.string().optional().describe('Local path to the zip') },
}, async ({ devUrl, zipUrl, zipPath }) => {
  if (!devUrl && !zipUrl && !zipPath) throw new Error('Give devUrl (a running dev server), zipUrl or zipPath.')
  let bytes: Uint8Array<ArrayBuffer>, name: string
  if (devUrl) {
    const p = await loadDev(devUrl)
    return { content: [{ type: 'text', text: JSON.stringify({ id: p.id, live: p.live, note: 'A running dev server, in live mode. Its styles are read as it renders, so the numbers here (values, brand) are only the page\'s static part. `open` it for the user (then `wait_for_send`); or turn knobs yourself: `set`, `export` (patch), `verify` and `screenshot` measure the running app in a headless browser (a few seconds each).' }, null, 2) }] }
  }
  if (zipPath) { const b = readFileSync(zipPath); bytes = new Uint8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer); name = basename(zipPath) }
  else { const res = await fetch(zipUrl!); if (!res.ok) throw new Error(`${res.status} fetching ${zipUrl}`); bytes = new Uint8Array(await res.arrayBuffer()); name = zipUrl!.split('/').pop() || 'archive.zip' }
  const archive = await openZip(new File([bytes], name.endsWith('.zip') ? name : `${name}.zip`, { type: 'application/zip' }))
  const project = await buildProject(archive)
  if (!project.platform.renders || !project.screens.length) {
    return { content: [{ type: 'text', text: JSON.stringify({ refused: true, reason: refusalFor(project.platform, { files: archive.entries.length }) }, null, 2) }], isError: true }
  }
  const report = await deriveBaseline(archive, project.table)
  const id = `p${(++seq).toString(36)}`
  const p: Loaded = { id, name: archive.rootName, bytes, project, report, cfg: report.baseline.cfg, archive }
  projects.set(id, p)
  return { content: [{ type: 'text', text: JSON.stringify(summarise(p), null, 2) }] }
})

const need = (id: string) => { const p = projects.get(id); if (!p) throw new Error(`No project ${id} — call load first.`); return p }

server.registerTool('screens', {
  title: 'List screens', description: 'The screens (HTML entries) of a loaded project.',
  inputSchema: { id: z.string() },
}, async ({ id }) => ({ content: [{ type: 'text', text: JSON.stringify(need(id).project.screens.map((s) => ({ path: s.path, label: s.label })), null, 2) }] }))

const knobSchema = {
  cPrimary: z.string().regex(/^#[0-9a-f]{6}$/i).optional().describe('Brand colour, #rrggbb'),
  fontDisplay: z.string().optional(), fontBody: z.string().optional(),
  radius: z.number().min(0).max(2).optional().describe('× their radii, 1 = as is'),
  space: z.number().min(0.6).max(1.5).optional(), type: z.number().min(0.8).max(1.4).optional(),
  lineHeight: z.number().min(0.85).max(1.35).optional(), tracking: z.number().min(-0.05).max(0.15).optional().describe('+em letter-spacing'),
  weight: z.number().int().min(-2).max(2).optional().describe('± steps of 100'),
  headWeight: z.number().int().min(0).max(900).multipleOf(100).optional().describe('Headings\' weight, picked (300 … 900); 0 = as in their code. Set on headings by selector, like fontDisplay: it shows in the sandbox and in verify/screenshot, and the patch has no line for it (tell the user to set it on their headings).'),
  borderWidth: z.number().min(0).max(3).optional(),
  borderTone: z.number().min(-0.15).max(0.15).optional(), shadow: z.number().min(0).max(2.5).optional(), motion: z.number().min(0).max(2.5).optional(),
  hue: z.number().min(-180).max(180).optional(), sat: z.number().min(0).max(2).optional(), contrast: z.number().min(-0.3).max(0.3).optional(),
  gradAngle: z.number().min(-180).max(180).optional(),
  cBackground: z.string().regex(/^#[0-9a-f]{6}$/i).optional().describe('Page background, #rrggbb'),
  cSecondary: z.string().optional(), cAccent: z.string().optional(), cSuccess: z.string().optional(), cWarning: z.string().optional(), cDanger: z.string().optional(), cInfo: z.string().optional(),
  dark: z.enum(['dark', 'light']).optional().describe("Switch their dark mode; omit for 'as is'"),
  reset: z.boolean().optional().describe('Back to their code first, then apply the rest'),
}
server.registerTool('set', {
  title: 'Turn the knobs',
  description: 'Apply knobs to a loaded project. Every dial has ×1 (or 0) = as in their code; colours are #rrggbb. Returns what moved (count and a sample of value → value).',
  inputSchema: { id: z.string(), knobs: z.object(knobSchema) },
}, async ({ id, knobs }) => {
  const p = need(id)
  const base = p.report.baseline.cfg
  const start = knobs.reset ? base : p.cfg
  const { cPrimary, fontDisplay, fontBody, reset: _r, ...dials } = knobs
  const sb: Dials = { ...DEFAULT_DIALS, ...start.sb, ...Object.fromEntries(Object.entries(dials).filter(([, v]) => v !== undefined)) } as Dials
  p.cfg = { ...start, ...(cPrimary ? { cPrimary: cPrimary as Config['cPrimary'] } : {}), ...(fontDisplay ? { fontDisplay } : {}), ...(fontBody ? { fontBody } : {}), sb }
  const vars = computeVars(p.project.table, p.report.baseline, p.cfg, buildTokens(p.cfg))
  const identity = p.project.table.identityVars()
  const changed = Object.keys(vars).filter((k) => vars[k] !== identity[k])
  const sample = changed.slice(0, 12).map((k) => `${identity[k]} → ${vars[k]}`)
  if (p.live) {
    const r = await liveReport(p)
    const lines = r.patch.split('\n').filter((l) => /→/.test(l) && !/^#/.test(l)).slice(0, 12).map((l) => l.replace(/^\S+\s+/, '').trim())
    return { content: [{ type: 'text', text: JSON.stringify({ moved: r.moved, of: r.of, sample: lines, knobs: summarise(p).knobs, measured: 'in the browser, on the running app' }, null, 2) }] }
  }
  return { content: [{ type: 'text', text: JSON.stringify({ moved: changed.length, of: Object.keys(vars).length, sample, knobs: summarise(p).knobs }, null, 2) }] }
})

server.registerTool('export', {
  title: 'Export',
  description: 'Export the current state: sheet-css (your values as CSS custom properties), sheet-json, patch (literal → value list), tokens-css / tokens-json / tailwind / shadcn (the --k-* design tokens), swift, android-xml, android-kotlin.',
  inputSchema: { id: z.string(), format: z.enum(['sheet-css', 'sheet-json', 'patch', 'tokens-css', 'tokens-json', 'tailwind', 'shadcn', 'swift', 'android-xml', 'android-kotlin']) },
}, async ({ id, format }) => {
  const p = need(id)
  // A live app's patch is measured in the browser: its CSS is written at runtime.
  if (p.live && format === 'patch') return { content: [{ type: 'text', text: checkPatch((await liveReport(p)).patch) }] }
  const vars = computeVars(p.project.table, p.report.baseline, p.cfg, buildTokens(p.cfg))
  const out = format === 'sheet-css' ? genSheetCss(p.project.table, vars) : format === 'sheet-json' ? genSheetJson(p.project.table, vars) : format === 'patch' ? genPatch(p.project.table, vars)
    : format === 'tokens-css' ? genCss(p.cfg) : format === 'tokens-json' ? genJson(p.cfg) : format === 'tailwind' ? genTailwind(p.cfg) : format === 'shadcn' ? genShadcn(p.cfg)
    : format === 'swift' ? genSwift(p.cfg) : format === 'android-xml' ? genAndroidColorsXml(p.cfg) : genAndroidKotlin(p.cfg)
  return { content: [{ type: 'text', text: out }] }
})

/* ── Live mode: a RUNNING dev server, behind this server's own origin ─────────
 * `uisandbox-mcp open http://localhost:3000`. A website cannot read another
 * origin's page, so the sandbox could not tokenise an app on localhost:3000.
 * Here the app is served from 127.0.0.1:<this port>/__dev/…, the same origin
 * as the sandbox, so it can: the page is snapshotted to start (its HTML and
 * the stylesheets it links), and every file after that is fetched live through
 * /__dev/, stylesheets rewritten on the way, scripts and API calls untouched.
 * The dev server's websocket (hot reload) is passed through as well. */
let liveOrigin: string | null = null
async function snapshotLive(target: string): Promise<{ bytes: Uint8Array<ArrayBuffer>; name: string }> {
  const u = new URL(target)
  let res: Response
  try { res = await fetch(u, { headers: { accept: 'text/html' } }) } catch { throw new Error(`Nothing answers at ${u.origin}. Is the dev server running?`) }
  if (!res.ok) throw new Error(`${target} answered ${res.status}.`)
  const html = await res.text()
  const files = [{ name: 'index.html', text: html }]
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!/rel=["']?stylesheet/i.test(m[0])) continue
    const href = m[0].match(/href=["']?([^"' >]+)/i)?.[1]
    if (!href) continue
    const abs = new URL(href, u)
    if (abs.origin !== u.origin) continue
    // as a <link> asks: a Vite dev server answers a bare .css request with a JS module
    try { const r = await fetch(abs, { headers: { accept: 'text/css,*/*;q=0.1' } }); if (r.ok) files.push({ name: abs.pathname.replace(/^\//, ''), text: await r.text() }) } catch { /* fetched live later */ }
  }
  const bytes = new Uint8Array(await zipSync(files).arrayBuffer()) as Uint8Array<ArrayBuffer>
  return { bytes, name: `${u.host.replace(/[^\w.-]+/g, '-')}.zip` }
}
function proxyToDev(req: IncomingMessage, res: ServerResponse, path: string): void {
  const t = new URL(path, liveOrigin!)
  const headers: Record<string, string | string[] | undefined> = { ...req.headers, host: t.host, 'accept-encoding': 'identity' }
  const send = t.protocol === 'https:' ? httpsRequest : httpRequest
  const up = send({ hostname: t.hostname, port: t.port || undefined, path: t.pathname + t.search, method: req.method, headers, rejectUnauthorized: false }, (r) => {
    const h = { ...r.headers, 'cache-control': 'no-store' }
    res.writeHead(r.statusCode ?? 502, h)
    r.pipe(res)
  })
  up.on('error', () => { if (!res.headersSent) { res.statusCode = 502; res.end(`The dev server at ${liveOrigin} did not answer.`) } else res.end() })
  req.pipe(up)
}
function proxyUpgrade(req: IncomingMessage, socket: import('node:stream').Duplex, head: Buffer): void {
  if (!liveOrigin) { socket.destroy(); return }
  const t = new URL(liveOrigin)
  const port = Number(t.port || (t.protocol === 'https:' ? 443 : 80))
  const up = t.protocol === 'https:' ? tlsConnect({ host: t.hostname, port, rejectUnauthorized: false }) : netConnect(port, t.hostname)
  up.on(t.protocol === 'https:' ? 'secureConnect' : 'connect', () => {
    const h = { ...req.headers, host: t.host }
    const lines = [`${req.method} ${req.url} HTTP/1.1`, ...Object.entries(h).flatMap(([k, v]) => (Array.isArray(v) ? v : v == null ? [] : [v]).map((x) => `${k}: ${x}`)), '', '']
    up.write(lines.join('\r\n'))
    if (head?.length) up.write(head)
    up.pipe(socket); socket.pipe(up)
  })
  up.on('error', () => socket.destroy()); socket.on('error', () => up.destroy())
}

/* ── The sandbox itself, locally: the web app the package ships, served with
 *    the archive on 127.0.0.1, opened in the user's browser. Nothing leaves the
 *    machine; the page posts its knob state back so `export`/`verify` can
 *    follow what the user turned by hand. ─────────────────────────────────── */
const here = dirname(fileURLToPath(import.meta.url))
const APP_DIR = [join(here, 'app'), join(here, '..', '..', 'dist'), join(here, '..', 'dist')].find((d) => existsSync(join(d, 'index.html')))
const MIME: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.zip': 'application/zip' }
let local: { server: Server; port: number } | null = null
async function localServer(): Promise<{ port: number }> {
  if (local) return local
  if (!APP_DIR) throw new Error('The UISandbox app is not bundled with this server (no dist/) — run `pnpm build` in the repo, or use UISANDBOX_URL.')
  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    // The page reports its knob state: POST /__state/<id> {cfg}
    const st = url.pathname.match(/^\/__state\/([a-z0-9]+)$/)
    if (st && req.method === 'POST') {
      let body = ''; req.on('data', (c) => { body += c })
      req.on('end', () => {
        try {
          const p = projects.get(st[1]!); const j = JSON.parse(body) as { cfg?: Config; report?: Loaded['pageReport'] }
          if (p && j.cfg) { p.cfg = j.cfg; p.touchedInBrowser = Date.now() }
          // a headless page's numbers (quiet): what it measured with the agent's knobs on
          if (p && j.report && Array.isArray(j.report.turned) && typeof j.report.patch === 'string') { p.pageReport = j.report; p.reportAt = Date.now() }
        } catch { /* ignore */ }
        res.statusCode = 204; res.end()
      })
      return
    }
    // Where Send goes (the page labels its button by it): GET /__session/<id>
    const se = url.pathname.match(/^\/__session\/([a-z0-9]+)$/)
    if (se) { const p = projects.get(se[1]!); res.setHeader('content-type', 'application/json'); if (!p) { res.statusCode = 404; res.end('{}'); return } res.end(JSON.stringify({ to: p.via === 'cli' ? 'terminal' : 'agent' })); return }
    // Send: POST /__send/<id> {cfg} — the user is done; hand it to whoever waits.
    const sd = url.pathname.match(/^\/__send\/([a-z0-9]+)$/)
    if (sd && req.method === 'POST') {
      let body = ''; req.on('data', (c) => { body += c })
      req.on('end', () => {
        const p = projects.get(sd[1]!)
        res.setHeader('content-type', 'application/json')
        if (!p) { res.statusCode = 404; res.end('{}'); return }
        try { const j = JSON.parse(body) as { cfg?: Config; report?: Loaded['pageReport'] }; if (j.cfg) { p.cfg = j.cfg; p.touchedInBrowser = Date.now() } if (j.report && Array.isArray(j.report.turned) && typeof j.report.patch === 'string') p.pageReport = j.report } catch { /* the last synced state stands */ }
        p.sent = Date.now(); p.delivered = false
        const ws = waiting.get(p.id) ?? []; waiting.delete(p.id); for (const w of ws) w()
        if (p.via === 'cli') printSent(p)
        res.end(JSON.stringify({ to: p.via === 'cli' ? 'terminal' : 'agent', waiting: ws.length }))
      })
      return
    }
    // Live mode: the dev server, on this origin.
    if (liveOrigin && url.pathname.startsWith('/__dev/')) { proxyToDev(req, res, url.pathname.slice('/__dev'.length) + url.search); return }
    const ar = url.pathname.match(/^\/__archive\/([a-z0-9]+)\.zip$/)
    if (ar) { const p = projects.get(ar[1]!); if (!p) { res.statusCode = 404; res.end('no such project'); return } res.setHeader('content-type', 'application/zip'); res.setHeader('cache-control', 'no-store'); res.setHeader('content-disposition', `attachment; filename="${p.name.replace(/[^\w.-]+/g, '-')}.zip"`); res.end(Buffer.from(p.bytes)); return }
    let file = join(APP_DIR!, decodeURIComponent(url.pathname))
    if (!file.startsWith(APP_DIR!)) { res.statusCode = 403; res.end(); return }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(APP_DIR!, 'index.html') // the SPA and the sandbox paths
    res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream')
    if (basename(file) === 'sw.js') res.setHeader('cache-control', 'no-cache')
    res.end(readFileSync(file))
  })
  server.on('upgrade', (req, socket, head) => proxyUpgrade(req, socket, head))
  // A fixed port first, a free one when another UISandbox holds it: an agent's
  // own browser (Claude desktop's pane) runs the sandbox only on a preview it
  // attached by origin, so one launch.json entry keeps working (decision 223).
  await new Promise<void>((r) => {
    const elsewhere = () => server.listen(0, '127.0.0.1', r)
    server.once('error', elsewhere)
    server.listen(SANDBOX_PORT, '127.0.0.1', () => { server.off('error', elsewhere); r() })
  })
  const port = (server.address() as { port: number }).port
  local = { server, port }
  return local
}
/** Send from a sandbox opened in the terminal: there is no agent to hand it
 *  to, so it is printed where the command runs. Nothing is written to disk. */
function printSent(p: Loaded): void {
  const s = sentPayload(p)
  p.delivered = true
  console.log(`\n── Sent from the sandbox · ${s.project} · ${s.turned.length ? s.turned.map((t) => `${t.knob}: ${t.from} → ${t.to}`).join(' · ') : 'nothing turned'}`)
  const lines = s.patch.split('\n').filter((l) => /→/.test(l) && !/^#/.test(l)).length
  console.log(`${s.moved} of ${s.of} values moved, in ${lines} patch line${lines === 1 ? '' : 's'} (a value used in two places can be one line). Each line: a literal in your CSS, what it becomes, and where it sits:\n`)
  console.log(s.patch)
}

function openInBrowser(url: string): void {
  const cmd = process.platform === 'darwin' ? ['open', url] : process.platform === 'win32' ? ['cmd', '/c', 'start', '', url] : ['xdg-open', url]
  if (process.env.UISANDBOX_NO_OPEN) return
  try { spawn(cmd[0]!, cmd.slice(1), { stdio: 'ignore', detached: true }).unref() } catch { /* the URL is returned anyway */ }
}

/* ── Finding the user's app, loading it, opening it: try_designs, the helper, the CLI ── */

/** The ports dev servers start on, and the runs around them: a project that took
 *  the next one up, or picked its own (Alexander's own site answers on 4320, next
 *  to Astro's 4321, and was not listed). A closed port refuses at once. */
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
const DEV_PORTS = [...new Set([5173, 3000, 4321, 4200, 8080, 1234, 6006, 8888, 3333, 9000, ...range(3000, 3010), ...range(4000, 4010), ...range(4173, 4174), ...range(4200, 4210), ...range(4300, 4330), ...range(5000, 5010), ...range(5170, 5180), ...range(8000, 8010), ...range(8080, 8090)])]
/** What package.json says about this project's dev server: an explicit port, or its framework's default. */
function portsFromPackage(dir: string): number[] {
  try {
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as { scripts?: Record<string, string>; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
    const out: number[] = []
    const m = String(pkg.scripts?.dev ?? pkg.scripts?.start ?? '').match(/(?:--port[ =]|-p\s+)(\d{2,5})/)
    if (m) out.push(Number(m[1]))
    const deps = { ...pkg.dependencies, ...pkg.devDependencies }
    if (deps.next || deps.nuxt || deps['@remix-run/dev']) out.push(3000)
    if (deps.astro) out.push(4321)
    if (deps['@angular/core']) out.push(4200)
    if (deps.vite || deps['@sveltejs/kit']) out.push(5173)
    return out
  } catch { return [] }
}
interface DevApp { url: string; port: number; title: string; fromProject: boolean }
/** The dev servers that answer on this machine now: a page of HTML on a usual port. */
async function findDevServers(dir = process.cwd()): Promise<DevApp[]> {
  const own = new Set<number>([HELPER_PORT, ...(local ? [local.port] : [])])
  const preferred = portsFromPackage(dir)
  // UISANDBOX_PORTS=4400,9000 adds ports of your own to look on
  const extra = (process.env.UISANDBOX_PORTS ?? '').split(',').map(Number).filter((n) => n > 0 && n < 65536)
  const ports = [...new Set([...preferred, ...extra, ...DEV_PORTS])].filter((p) => !own.has(p))
  const probe = async (port: number): Promise<DevApp | null> => {
    try {
      const r = await fetch(`http://localhost:${port}/`, { headers: { accept: 'text/html' }, signal: AbortSignal.timeout(800) })
      if (!/text\/html/i.test(r.headers.get('content-type') ?? '')) return null
      const html = await r.text()
      const title = (html.match(/<title[^>]*>([^<]{0,80})/i)?.[1] ?? '').trim()
      if (/^UISandbox\b/.test(title)) return null // the sandbox itself, served by a dev server
      return { url: `http://localhost:${port}`, port, title, fromProject: preferred.includes(port) }
    } catch { return null }
  }
  const found = (await Promise.all(ports.map(probe))).filter((x): x is DevApp => !!x)
  return found.sort((a, b) => Number(b.fromProject) - Number(a.fromProject))
}
/** The app meant when nobody names one: the dev server this project's package.json points at, or
 *  the only one running; several and none of them this project's: ask. None: null (then the build). */
async function theRunningApp(dir = process.cwd()): Promise<DevApp | { several: DevApp[] } | null> {
  const apps = await findDevServers(dir)
  if (apps.length > 1 && !apps[0]!.fromProject) return { several: apps }
  return apps[0] ?? null
}

/** A running dev server, as a live project. */
async function loadDev(devUrl: string, via?: Loaded['via']): Promise<Loaded> {
  const u = /^https?:/i.test(devUrl) ? devUrl : `http://${devUrl}`
  if (!/^(localhost|127\.0\.0\.1|\[::1\]|[\w-]+\.(localhost|test))$/i.test(new URL(u).hostname)) throw new Error('A dev server on this machine only (localhost, 127.0.0.1, *.localhost, *.test).')
  const { bytes, name } = await snapshotLive(u)
  const archive = await openZip(new File([bytes], name, { type: 'application/zip' }))
  const project = await buildProject(archive)
  if (!project.screens.length) project.screens.push({ path: 'index.html', label: '/', source: 'file' })
  const report = await deriveBaseline(archive, project.table)
  const id = `p${(++seq).toString(36)}`
  const p: Loaded = { id, name: new URL(u).host, bytes, project, report, cfg: report.baseline.cfg, archive, live: new URL(u).origin, via }
  projects.set(id, p)
  return p
}
/** The build in a folder (dist/, build/, out/… found inside it), or why it cannot render. */
async function loadFolder(dir: string, via?: Loaded['via']): Promise<Loaded | { refused: string }> {
  const { zipFolder } = await import('./zipdir')
  const bytes = await zipFolder(dir)
  const archive = await openZip(new File([bytes], `${basename(dir) || 'app'}.zip`, { type: 'application/zip' }))
  const project = await buildProject(archive)
  if (!project.platform.renders || !project.screens.length) return { refused: refusalFor(project.platform, { files: archive.entries.length }) }
  const report = await deriveBaseline(archive, project.table)
  const id = `p${(++seq).toString(36)}`
  const p: Loaded = { id, name: archive.rootName, bytes, project, report, cfg: report.baseline.cfg, archive, via }
  projects.set(id, p)
  return p
}
/** The address of the sandbox with this project in it, served from this process. One live app is
 *  proxied at a time (/__dev/ follows the last one opened). */
async function sandboxUrlFor(p: Loaded, opts: { screen?: string; carry?: string } = {}): Promise<string> {
  if (p.live) liveOrigin = p.live
  const { port } = await localServer()
  const hash = JSON.stringify(p.cfg) === JSON.stringify(p.report.baseline.cfg) ? '' : `#${encode(p.cfg)}`
  const carry = opts.carry?.replace(/[^A-Za-z0-9_-]/g, '')
  return `http://127.0.0.1:${port}/?load=${encodeURIComponent(`/__archive/${p.id}.zip`)}&sync=${p.id}${p.live ? '&live=1' : ''}${opts.screen ? `&screen=${encodeURIComponent(opts.screen)}` : ''}${carry ? `&carry=${carry}` : ''}${hash}`
}

/** Opened in an agent's own browser instead of the user's (decision 221): Claude desktop's pane
 *  runs the sandbox's service worker only for a preview it attached, not after a plain navigate. */
const paneHint = (url: string) => { const u = new URL(url); return `To show it in your own built-in browser instead (Claude desktop app): add {"name": "uisandbox", "url": "${u.origin}", "port": ${u.port}} to .claude/launch.json and preview_start it, then navigate that tab to the full address; a plain navigate cannot start its service worker.${Number(u.port) === SANDBOX_PORT ? ` The sandbox takes port ${SANDBOX_PORT} whenever it is free, so the entry keeps working next time.` : ` Port ${SANDBOX_PORT}, which the sandbox takes when free, was held by another UISandbox: this session's port is ${u.port}.`}` }

server.registerTool('try_designs', {
  title: 'Try designs on the user\'s app',
  description: 'The one call when the user wants to try designs on the app they are building: "let me try some designs", "I\'m not happy with how it looks", "try another style", "can I play with the colours / fonts / spacing", "show me a few looks". Finds their app on this machine (the dev server that runs, read from package.json or found on the usual ports; else the build in this folder), loads it live and opens UISandbox in their browser: their own app, six looks side by side, every knob, hot reload kept. No arguments needed. Then tell them to pick a look or turn the knobs and press "Send to your agent"; call wait_for_send, and show them the patch before you change any file.',
  inputSchema: { url: z.string().optional().describe('The app\'s address, when you know it (e.g. http://localhost:5173). Leave out to find it.'), carry: z.string().regex(/^[A-Za-z0-9_-]+$/).optional().describe('Knobs the user turned on a kit at uisandbox.org, as a prompt copied there names them') },
}, async ({ url, carry }) => {
  const reply = (o: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(o, null, 2) }] })
  let p: Loaded
  if (url) p = await loadDev(url, 'agent')
  else {
    const app = await theRunningApp()
    if (app && 'several' in app) return reply({ found: app.several.map((a) => ({ url: a.url, title: a.title })), next: 'More than one app runs on this machine. Ask the user which one, then call try_designs with its url.' })
    if (app) p = await loadDev(app.url, 'agent')
    else {
      const r = await loadFolder(process.cwd(), 'agent').catch((e: Error) => ({ refused: e.message }))
      if ('refused' in r) return reply({ found: [], next: 'No dev server answers on this machine and this folder holds no build that renders. Ask the user to start their dev server (npm run dev, or the project\'s own) and call try_designs again; or build it first.', why: r.refused })
      p = r
    }
  }
  const opened = await sandboxUrlFor(p, { carry })
  if (!argv.includes('--no-browser')) openInBrowser(opened)
  return reply({ opened, app: p.live ?? p.name, id: p.id, ownPane: paneHint(opened), next: 'UISandbox is open in their browser with their app. FIRST write one line to them, before any other call: it is open, pick one of the six looks or turn the knobs, and press "Send to your agent" when you like it. Only then call wait_for_send (id above): it waits for that press. Show them the patch it returns before you change any file.' })
})

/* ── The helper: what uisandbox.org asks, on this machine ────────────────────
 * A page on uisandbox.org cannot read the user's localhost (the browser sees
 * to that). This answers it, on a fixed port and to the sandbox's own pages
 * only: which dev servers run here (GET /apps), and open one (POST /open),
 * which returns the address of the sandbox with it, served from this process.
 * It runs inside the MCP server (so whenever Claude Code has it) and with
 * `npx uisandbox-mcp start` (or open). Chrome asks the user once whether
 * uisandbox.org may reach the local network. */
const HELPER_PORT = 47319
/** The sandbox's own port, when free (decision 223). */
const SANDBOX_PORT = 47320
const HELPER_ORIGIN = /^(https:\/\/(www\.)?uisandbox\.org|http:\/\/(localhost|127\.0\.0\.1)(:\d+)?)$/
/** A secret per process for the helper's own page: its links open an app, and a site elsewhere cannot guess them. */
const HELPER_TOKEN = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
/** The helper's own page, for a browser that will not let uisandbox.org ask it (Safari blocks an https page
 *  from reaching http://127.0.0.1; a top-level visit is fine): the running apps, one click each. */
async function helperPage(carry: string): Promise<string> {
  const apps = await findDevServers()
  const c = carry.replace(/[^A-Za-z0-9_-]/g, '')
  const rows = apps.map((a) => `<a class="app" href="/go?url=${encodeURIComponent(a.url)}&t=${HELPER_TOKEN}${c ? `&carry=${c}` : ''}"><span class="dot"></span><b>${esc(a.title || `localhost:${a.port}`)}</b><code>localhost:${a.port}</code></a>`).join('')
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UISandbox · your running apps</title>
<style>body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#f4f4f5;color:#18181b;display:grid;place-items:center;min-height:100vh}main{width:min(460px,92vw);background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:22px}h1{font-size:18px;margin:0 0 4px}p{margin:0 0 14px;color:#52525b;font-size:13.5px}.app{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:9px;color:inherit;text-decoration:none}.app:hover{background:#f4f4f5}.app b{flex:1;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dot{width:8px;height:8px;border-radius:99px;background:#22c55e}code{font-size:12px;color:#52525b}@media (prefers-color-scheme:dark){body{background:#0f0f12;color:#f4f4f5}main{background:#18181b;border-color:#27272a}p,code{color:#a1a1aa}.app:hover{background:#27272a}}</style>
<main><h1>Your running apps</h1><p>${apps.length ? 'Pick one: it opens live in UISandbox, every screen, hot reload kept.' : 'No dev server answers yet. Start yours (npm run dev) and reload this page.'}</p>${rows}</main>`
}
async function startHelper(via: Loaded['via']): Promise<boolean> {
  const srv = createServer(async (req, res) => {
    const here = new URL(req.url ?? '/', 'http://127.0.0.1')
    // The helper's own page and its links: visited, not fetched, so no Origin to check; the token guards the links.
    if (req.method === 'GET' && here.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(await helperPage(here.searchParams.get('carry') ?? '')); return }
    if (req.method === 'GET' && here.pathname === '/go') {
      if (here.searchParams.get('t') !== HELPER_TOKEN) { res.writeHead(403); res.end('This link is from another session: open http://127.0.0.1:' + HELPER_PORT + ' again.'); return }
      try { const p = await loadDev(here.searchParams.get('url') ?? '', via); res.writeHead(302, { location: await sandboxUrlFor(p, { carry: here.searchParams.get('carry') ?? undefined }) }); res.end() } catch (e) { res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }); res.end((e as Error).message) }
      return
    }
    const origin = String(req.headers.origin ?? '')
    const ok = HELPER_ORIGIN.test(origin)
    if (ok) { res.setHeader('access-control-allow-origin', origin); res.setHeader('vary', 'origin') }
    if (req.method === 'OPTIONS') {
      res.writeHead(ok ? 204 : 403, ok ? { 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type', 'access-control-allow-private-network': 'true', 'access-control-max-age': '600' } : {})
      res.end(); return
    }
    // Only the sandbox's own pages: a site elsewhere must not learn which apps run here, nor open them.
    if (!ok) { res.writeHead(403); res.end(); return }
    res.setHeader('content-type', 'application/json')
    const path = new URL(req.url ?? '/', 'http://127.0.0.1').pathname
    if (path === '/hello') { res.end(JSON.stringify({ uisandbox: VERSION })); return }
    if (path === '/apps') { res.end(JSON.stringify({ apps: await findDevServers() })); return }
    if (path === '/open' && req.method === 'POST') {
      let body = ''; req.on('data', (c) => { body += c })
      req.on('end', async () => {
        try {
          const j = JSON.parse(body) as { url?: string; carry?: string }
          const p = await loadDev(String(j.url ?? ''), via)
          res.end(JSON.stringify({ url: await sandboxUrlFor(p, { carry: j.carry }) }))
        } catch (e) { res.statusCode = 400; res.end(JSON.stringify({ error: (e as Error).message })) }
      })
      return
    }
    res.statusCode = 404; res.end('{}')
  })
  return new Promise((resolve) => { srv.once('error', () => resolve(false)); srv.listen(HELPER_PORT, '127.0.0.1', () => resolve(true)) })
}

server.registerTool('open', {
  title: 'Open the sandbox',
  description: 'Open UISandbox in the user\'s browser with this project loaded — the real, interactive sandbox: the whole app rendered 1:1, every knob there to turn by hand. Use this whenever the user wants to SEE or PLAY with the design themselves ("can I look at this in a sandbox", "let me try some changes"), not only read numbers. Served from 127.0.0.1 by this process; nothing leaves the machine. What the user turns in the browser flows back here: a later `export`, `verify` or `screenshot` uses it.',
  inputSchema: { id: z.string(), screen: z.string().optional().describe('Screen path to open first'), carry: z.string().regex(/^[A-Za-z0-9_-]+$/).optional().describe('The knobs the user turned on a kit at uisandbox.org, as the prompt they copied there names it: offered to them when the app opens') },
}, async ({ id, screen, carry }) => {
  const p = need(id)
  p.via = 'agent'
  const url = await sandboxUrlFor(p, { screen, carry })
  if (!argv.includes('--no-browser')) openInBrowser(url)
  return { content: [{ type: 'text', text: JSON.stringify({ opened: url, ownPane: paneHint(url), note: 'The sandbox is open in the browser. Tell the user to press "Send to your agent" there when they are done, then call `wait_for_send`: it returns when they press it, with what they turned and the patch to apply. `state` reads the knobs at any moment.' }, null, 2) }] }
})

server.registerTool('state', {
  title: 'Current knobs', description: 'The knobs as they stand now — including what the user turned by hand in an opened sandbox (and when).',
  inputSchema: { id: z.string() },
}, async ({ id }) => {
  const p = need(id)
  // A live app: the numbers above are the snapshot's static part; what the
  // browser measured last (set, export, verify on it) is the real count.
  const inBrowser = p.live && p.pageReport ? { moved: p.pageReport.moved, of: p.pageReport.of, at: p.reportAt ? new Date(p.reportAt).toISOString() : null, note: 'values and baseline above are the static part only; this is the running app, measured in the browser' } : undefined
  return { content: [{ type: 'text', text: JSON.stringify({ ...summarise(p), touchedInBrowser: p.touchedInBrowser ? new Date(p.touchedInBrowser).toISOString() : null, ...(inBrowser ? { inBrowser } : {}) }, null, 2) }] }
})

server.registerTool('wait_for_send', {
  title: 'Wait for the user to send it back',
  description: 'After `open`: wait until the user presses "Send to your agent" in the sandbox, then return what they turned (from → to, in the panel\'s own names), how many values moved, and the patch that writes it into their source. Returns at once if they already sent and you have not collected it. If the time runs out first it says the sandbox is still open: call it again (or ask them).',
  inputSchema: { id: z.string(), timeoutSeconds: z.number().int().min(5).max(1800).optional().describe('How long to wait (default 240)') },
}, async ({ id, timeoutSeconds }) => {
  const p = need(id)
  const handOver = () => { p.delivered = true; return { content: [{ type: 'text' as const, text: JSON.stringify(sentPayload(p), null, 2) }] } }
  if (p.sent && !p.delivered) return handOver()
  const got = await new Promise<boolean>((resolve) => {
    const done = () => { clearTimeout(t); resolve(true) }
    const t = setTimeout(() => { const ws = waiting.get(p.id) ?? []; waiting.set(p.id, ws.filter((w) => w !== done)); resolve(false) }, (timeoutSeconds ?? 240) * 1000)
    waiting.set(p.id, [...(waiting.get(p.id) ?? []), done])
  })
  if (got) return handOver()
  return { content: [{ type: 'text', text: JSON.stringify({ sent: false, stillOpen: true, touchedInBrowser: p.touchedInBrowser ? new Date(p.touchedInBrowser).toISOString() : null, hint: 'Nothing sent yet. Call wait_for_send again to keep waiting, or ask the user whether they are done.' }, null, 2) }] }
})

/* ── Render tools: the real app in headless Chromium ─────────────────────── */
async function drive(p: Loaded, screenPath: string | undefined, width: number, fn: (page: import('playwright').Page) => Promise<unknown>) {
  const BROWSER_HELP = 'verify and screenshot need Chromium: run `npx playwright install chromium` once (Playwright itself ships with uisandbox-mcp; only the browser is downloaded). load, set, export and open do not need it.'
  let chromium: typeof import('playwright').chromium
  try { ({ chromium } = await import('playwright')) } catch { throw new Error(BROWSER_HELP) }
  let browser: Awaited<ReturnType<typeof chromium.launch>>
  try { browser = await chromium.launch() } catch (e) { throw new Error(`${BROWSER_HELP}\n(${String((e as Error).message).split('\n')[0]})`) }
  try {
    const context = await browser.newContext({ viewport: { width, height: 900 } })
    const FIX = 'https://archive.uisandbox.invalid/a.zip'
    await context.route(FIX, (route) => route.fulfill({ status: 200, headers: { 'content-type': 'application/zip', 'access-control-allow-origin': '*' }, body: Buffer.from(p.bytes) }))
    const page = await context.newPage()
    // The app: UISANDBOX_URL if set, else the bundled app on 127.0.0.1 (offline, fast), else uisandbox.org.
    const APP = APP_ENV ?? (APP_DIR ? `http://127.0.0.1:${(await localServer()).port}` : 'https://uisandbox.org')
    // The knobs travel in the URL hash — the app's own state encoding. A live
    // app (a dev server) is opened as `open` opens it, through this server's
    // own address (only it reaches the dev server), and its knobs ride as
    // --carry does: put on after the page has read its runtime CSS, on the
    // baseline it measured there, not on the snapshot's (decision 217).
    // quiet: no What we found, no notes card over what is captured.
    const hash = JSON.stringify(p.cfg) === JSON.stringify(p.report.baseline.cfg) ? '' : `#${encode(p.cfg)}`
    let started = false
    if (p.live && !APP_ENV && APP_DIR) {
      liveOrigin = p.live
      const { port } = await localServer()
      const carry = carryToken('the agent', p.report.baseline.cfg, p.cfg)
      started = true
      await page.goto(`http://127.0.0.1:${port}/?load=${encodeURIComponent(`/__archive/${p.id}.zip`)}&sync=${p.id}&live=1&quiet=1${carry ? `&carry=${carry}` : ''}`, { waitUntil: 'domcontentloaded' })
    }
    if (!started) await page.goto(`${APP}/?load=${encodeURIComponent(FIX)}&quiet=1${hash}`, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!document.querySelector('.stage__foot') || !!document.querySelector('.intake__error'), null, { timeout: 180000 })
    if (await page.$('.intake__error')) throw new Error(await page.$eval('.intake__error', (e) => e.textContent || 'refused'))
    if (hash && !started) { await page.evaluate((h) => { location.hash = h }, hash); await page.waitForTimeout(600) }
    // a live app writes its CSS as it renders: let it, and the observer, settle
    if (started) await page.waitForTimeout(2500)
    if (screenPath) {
      // Pick the screen through the app's own picker state: navigate the frame.
      await page.evaluate((s) => { const f = document.querySelector('.stage__iframe') as HTMLIFrameElement | null; if (f) f.src = f.src.replace(/^[^?]*/, '/' + s.replace(/(^|\/)index\.html?$/i, '$1')) }, screenPath)
      await page.waitForTimeout(2500)
    } else await page.waitForTimeout(2000)
    return await fn(page)
  } finally { await browser.close() }
}

/** A live app's numbers, from a headless page with the agent's knobs on: the
 *  snapshot holds only its static part (a Vite app: none of its CSS), so
 *  `set` and `export` asked it read 0 of 0 and an empty patch. */
async function liveReport(p: Loaded): Promise<NonNullable<Loaded['pageReport']>> {
  const t0 = Date.now()
  await drive(p, undefined, 1280, async (page) => {
    for (let i = 0; i < 40 && !(p.reportAt && p.reportAt > t0); i++) await page.waitForTimeout(250)
  })
  if (!p.pageReport || !p.reportAt || p.reportAt <= t0) throw new Error('The live page did not report back. Is the dev server still running?')
  return p.pageReport
}

server.registerTool('verify', {
  title: 'Check 1:1',
  description: 'Run the 1:1 check in a real browser: the untouched build vs. the tokenised build with the identity sheet, computed styles of every element diffed. Also returns the reach meter. This is the same check a visitor runs on uisandbox.org.',
  inputSchema: { id: z.string(), screen: z.string().optional().describe('Screen path (from screens); default the first'), width: z.number().int().min(320).max(2560).optional() },
}, async ({ id, screen, width }) => {
  const p = need(id)
  const out = await drive(p, screen, width ?? 1280, async (page) => {
    await page.evaluate(() => { const c = Array.from(document.querySelectorAll('.stage__foot .chip')) as HTMLElement[]; (c.find((x) => /Check 1:1|1:1 /.test(x.textContent || '')) ?? c[c.length - 1]!).click() })
    const text = await page.waitForFunction(() => { const v = document.querySelector('.verify[aria-label="1:1 check"]'); const t = v?.textContent || ''; return /✓|✗|⚠/.test(t) ? t : null }, null, { timeout: 180000 }).then((h) => h.jsonValue())
    const foot = await page.evaluate(() => (document.querySelector('.stage__foot')?.textContent || '').replace(/\s+/g, ' '))
    const warnings = await page.evaluate(() => Array.from(document.querySelectorAll('.popcard--low')).map((h) => (h.textContent || '').replace(/\s+/g, ' ').slice(0, 300)))
    return { ok: /✓/.test(text as string), result: (text as string).replace(/\s+/g, ' ').replace(/Run again.*$/, '').trim(), reach: (foot.match(/reach \d+% colours · \d+% type · \d+% radii(?: · \d+ outside)?/) || [''])[0].trim(), warnings }
  })
  return { content: [{ type: 'text', text: JSON.stringify(out, null, 2) }] }
})

server.registerTool('screenshot', {
  title: 'Screenshot',
  description: 'A PNG of the screen as it renders with the current knobs (the sandbox frame only).',
  inputSchema: { id: z.string(), screen: z.string().optional(), width: z.number().int().min(320).max(2560).optional() },
}, async ({ id, screen, width }) => {
  const p = need(id)
  const png = await drive(p, screen, width ?? 1280, async (page) => {
    const frame = await page.$('.stage__iframe')
    return (await (frame ?? page).screenshot({ type: 'png' })).toString('base64')
  })
  return { content: [{ type: 'image', data: png as string, mimeType: 'image/png' }] }
})

/* ── Prompts: what a client shows as slash commands (/uisandbox:open …) ───── */
server.registerPrompt('open', {
  title: 'Open this app in UISandbox',
  description: 'Build the app in the current repo (or use a zip), load it and open the real sandbox in the browser to play with the design.',
  argsSchema: { zip: z.string().optional().describe('A zip path or URL; omit to build the current repo') },
}, ({ zip }) => ({ messages: [{ role: 'user', content: { type: 'text', text: zip
  ? `Load ${zip} in UISandbox and open the sandbox so I can look at the app and change the design by hand. Tell me when it is open and what you found (screens, brand, families). When I come back, read the state and export what I changed.`
  : `Open this app in UISandbox: build it first (the framework's build command), zip the output folder (dist/, build/ or out/ — not source), load it and open the sandbox so I can look at it and change the design by hand. Tell me when it is open and what you found (screens, brand, families). When I come back, read the state and export what I changed.` } }] }))
server.registerPrompt('try', {
  title: 'Try a design change and verify it',
  description: 'Load a build, apply knobs (brand, radius, fonts, spacing…), verify it is still 1:1, show a screenshot, give the patch.',
  argsSchema: { zip: z.string().optional().describe('A zip path or URL; omit to build the current repo'), change: z.string().describe('What to try, e.g. "brand #e11d48 and radius ×1.5"') },
}, ({ zip, change }) => ({ messages: [{ role: 'user', content: { type: 'text', text: `${zip ? `Load ${zip} in UISandbox` : 'Build this repo, zip the output and load it in UISandbox'}. Then try: ${change}. Verify it is still 1:1 (quote the numbers and the reach), show me a screenshot, and give me the patch. Offer to open the sandbox afterwards.` } }] }))

/* ── CLI: for a human, and for an agent that has no MCP ──────────────────────
 *   uisandbox-mcp open [url | folder | zip] [--detach] [--carry=…]
 *   uisandbox-mcp start      the helper only: uisandbox.org lists your running apps
 *   uisandbox-mcp stop       stops what --detach left running
 * --detach starts the sandbox on its own and returns as soon as it is open: an
 * agent then runs one command that finishes, not a process it has to keep
 * (a background npx was refused in auto mode, decision 220). `open` with
 * nothing after it opens the app that runs (try_designs' choice), else the
 * build in this folder: the agent's line needs no port (decision 221). */
const argv = process.argv.slice(2)
const PIDS = join(tmpdir(), 'uisandbox-mcp.pids')
const USAGE = `uisandbox-mcp: try designs on the app you are building, 1:1, in your own browser.

  npx uisandbox-mcp@latest open              the app running on this machine (else the build in this folder), live
  npx uisandbox-mcp@latest open <url>        that dev server, e.g. http://localhost:5173
  npx uisandbox-mcp@latest open <folder|zip> a build
  npx uisandbox-mcp@latest open --detach     the same, and the command returns (for an agent); the patch goes to a file
  npx uisandbox-mcp@latest stop              stops what --detach left running
  npx uisandbox-mcp@latest start             only the helper: uisandbox.org's "Connect a running app" lists your apps

As an MCP server (what an agent adds once): claude mcp add uisandbox -- npx -y uisandbox-mcp@latest`
if (argv[0] === 'help' || argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(0) }
// Typed in a terminal with nothing after it: a person, not an MCP client (those
// pipe stdin). As a server it would wait in silence; start the helper instead.
if (!argv.some((a) => !a.startsWith('--')) && !argv.includes('--stdio') && process.stdin.isTTY) argv.unshift('start')
if (argv[0] === 'stop') {
  let n = 0
  try { for (const pid of readFileSync(PIDS, 'utf8').split('\n').filter(Boolean)) { try { process.kill(Number(pid)); n++ } catch { /* gone already */ } } unlinkSync(PIDS) } catch { /* nothing recorded */ }
  console.log(n ? `Stopped ${n} UISandbox process${n === 1 ? '' : 'es'}.` : 'Nothing of UISandbox was running in the background.')
  process.exit(0)
}
if (argv[0] === 'open' && argv.includes('--detach')) {
  const log = join(tmpdir(), `uisandbox-mcp-${Date.now()}.log`)
  const out = openSync(log, 'a')
  const child = spawn(process.execPath, [...process.execArgv, process.argv[1]!, ...argv.filter((a) => a !== '--detach')], { detached: true, stdio: ['ignore', out, out] })
  child.unref()
  try { writeFileSync(PIDS, `${child.pid}\n`, { flag: 'a' }) } catch { /* stop will not know it; Ctrl-C in its own terminal still works */ }
  for (let i = 0; i < 240; i++) {
    await new Promise((r) => setTimeout(r, 250))
    const text = existsSync(log) ? readFileSync(log, 'utf8') : ''
    if (/UISandbox is open:/.test(text)) { console.log(text.replace(/\nCtrl-C to stop\.\s*$/, '').replace(/and the patch prints here\./, `and the patch is written to ${log}.`).trim() + `\nRunning on its own (pid ${child.pid}). After Send, the patch is in ${log}. When you are done: npx uisandbox-mcp@latest stop` + (/UISandbox is open: (\S+)/.exec(text) ? `\n${paneHint(/UISandbox is open: (\S+)/.exec(text)![1]!)}` : '')); process.exit(0) }
    if (child.exitCode !== null) { console.error(text.trim() || 'UISandbox stopped before it opened.'); process.exit(child.exitCode || 2) }
  }
  console.error(`UISandbox did not open within a minute. Its log: ${log}`); process.exit(2)
}
if (argv[0] === 'start') {
  const up = await startHelper('cli')
  console.log(up
    ? `UISandbox is ready on this machine. On uisandbox.org, "Connect a running app" now lists the apps your dev servers serve: pick one and it opens live.\nThe same list, in any browser and with nothing to allow: http://127.0.0.1:${HELPER_PORT}/\nOr open one straight away: npx uisandbox-mcp@latest open\nCtrl-C to stop.`
    : `Something already answers on 127.0.0.1:${HELPER_PORT}: UISandbox is probably running already (in Claude Code, or another terminal). uisandbox.org will find it, and so does http://127.0.0.1:${HELPER_PORT}/`)
  if (!up) process.exit(0)
  await new Promise(() => {})
}
if (argv[0] === 'open') {
  // `open` with no argument means the folder you are in: any repo works — the
  // build folder (dist/, build/, out/, public/, _site/…) is found inside it,
  // whatever the framework calls it. `--no-browser` prints the URL only.
  let target = argv.slice(1).find((a) => !a.startsWith('--'))
  // Nothing named: the app that runs, as try_designs finds it; else this folder's build.
  if (!target) {
    const app = await theRunningApp()
    if (app && 'several' in app) {
      console.error(`More than one app runs on this machine. Name the one you mean:\n${app.several.map((a) => `  npx uisandbox-mcp@latest open ${a.url}${a.title ? `   (${a.title})` : ''}`).join('\n')}`)
      process.exit(2)
    }
    if (app) console.log(`Found ${app.title || app.url} running at ${app.url}. Not that one? npx uisandbox-mcp@latest open <url or folder>`)
    else if ([homedir(), '/'].includes(process.cwd())) { console.error('No dev server answers on this machine. Start yours (npm run dev, or your project\'s own) and run this again; or run it inside your project, where it opens the build.'); process.exit(2) }
    target = app?.url ?? '.'
  }
  // An address (http://localhost:3000): live mode, the running app itself.
  const live = /^https?:\/\//i.test(target) || /^(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(target)
  let p: Loaded
  try {
    if (live) p = await loadDev(target, 'cli')
    else if (statSync(target).isDirectory()) { const r = await loadFolder(target, 'cli'); if ('refused' in r) { console.error(r.refused); process.exit(2) } p = r }
    else {
      const b = readFileSync(target), name = basename(target)
      const archive = await openZip(new File([new Uint8Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer)], name.endsWith('.zip') ? name : `${name}.zip`, { type: 'application/zip' }))
      const project = await buildProject(archive)
      if (!project.platform.renders || !project.screens.length) { console.error(refusalFor(project.platform, { files: archive.entries.length })); process.exit(2) }
      const report = await deriveBaseline(archive, project.table)
      const id = `p${(++seq).toString(36)}`
      p = { id, name: archive.rootName, bytes: new Uint8Array(b) as Uint8Array<ArrayBuffer>, project, report, cfg: report.baseline.cfg, archive, via: 'cli' }
      projects.set(id, p)
    }
  } catch (e) { console.error((e as Error).message); process.exit(2) }
  // `--carry=<token>`: what was turned on a kit at uisandbox.org, copied into
  // the line there (src/state/carry.ts); the page reads it, nothing else does.
  const url = await sandboxUrlFor(p, { carry: argv.find((a) => a.startsWith('--carry='))?.slice(8) })
  await startHelper('cli') // uisandbox.org's Connect a running app works while this runs
  if (!argv.includes('--no-browser')) openInBrowser(url)
  console.log(live
    ? `UISandbox is open: ${url}\nLive: ${p.live}, through this sandbox. Turn the knobs, press Send to the terminal, and the patch prints here.\nCtrl-C to stop.`
    : `UISandbox is open: ${url}\n${p.project.root ? `build found at ${p.project.root}/ · ` : ''}${p.project.screens.length} screens · ${p.project.table.entries.length} values · brand ${p.report.baseline.cfg.cPrimary}\nCtrl-C to stop.`)
  await new Promise(() => {})
}

const transport = new StdioServerTransport()
await server.connect(transport)
// Quietly: stdout is the MCP protocol here. The site's Connect a running app finds this.
void startHelper('agent')
