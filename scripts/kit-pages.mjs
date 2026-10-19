#!/usr/bin/env node
/**
 * The kit pages: one static page per kit at /kits/<id>/, and /kits/ listing
 * them. Static HTML on purpose, so a search engine and a language model read
 * them without running the app.
 *
 *   node scripts/kit-pages.mjs        writes public/kits/<id>/index.html,
 *                                     public/kits/index.html, public/site.css
 *
 * Every fact on a page is read, never typed: the kit's own description,
 * version, licence and package from src/kits/engine/kits/<id>.json, its start
 * values from src/kits/looks.json, and the files its export ships from the
 * engine's own generate(). The footer comes from src/site/links.json, the same
 * file the app's footer reads; the tokens from chrome.css's @site block.
 * Screenshots (public/kits/<id>.jpg) are made by scripts/kit-shots.mjs.
 * src/kits/__tests__/kitPages.test.ts fails when these pages are behind.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generate } from '../src/kits/engine/generate.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(root, p), 'utf8')
const DOOR = JSON.parse(read('src/kits/door.json')).filter((k) => k.renders)
const LOOKS = JSON.parse(read('src/kits/looks.json'))
const LINKS = JSON.parse(read('src/site/links.json'))
const kitData = (id) => JSON.parse(read(`src/kits/engine/kits/${id}.json`))
const SITE = 'https://uisandbox.org'
/* The kits' own descriptions use em-dashes; the pages do not (a rule of the site's copy). */
const prose = (s) => { const t = String(s).replace(/\s+—\s+/g, ': ').replace(/—/g, ', '); return t.charAt(0).toUpperCase() + t.slice(1) }
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/* What each file the export ships is for, in a line. A file the engine
   writes and this map does not know is a test failure, not a silent gap. */
const FILES = {
  'theme.css': (n) => `the variables, in ${n}'s own names, as the knobs left them`,
  'DESIGN.md': () => 'the design system for people and agents: colours, type, spacing, what each is for',
  'SKILL.md': (n) => `for Claude Code, Cursor or Codex: build the next screen in ${n}'s own classes`,
  'tokens.json': () => 'W3C design tokens, which Tokens Studio and Figma variables import',
  'install.md': () => 'where each file goes, step by step',
  'MANIFEST.md': () => 'what could not be done, said rather than substituted',
  '_custom.scss': () => "Bootstrap's Sass entry, for the brand it compiles in",
  'components.json': () => "shadcn/ui's own config, so its CLI adds components in this theme",
  'antd.theme.ts': () => 'the theme object Ant Design reads, since it has no stylesheet to edit',
}
export function shippedFiles(id) {
  const look = LOOKS.find((l) => l.id === id)
  const kits = { [id]: kitData(id) }
  const files = generate(look?.values ?? {}, [id], kits)
  return Object.entries(files).filter(([n, v]) => typeof v === 'string' && !['AGENTS.md', 'CLAUDE.md', '.cursor/rules'].includes(n)).map(([n]) => n)
}
const fileLine = (path, name) => {
  const base = path.split('/').pop()
  const say = FILES[base]
  if (!say) throw new Error(`kit-pages: no line for ${path}; add it to FILES`)
  return `<li><code>${esc(path)}</code>: ${esc(say(name))}</li>`
}

const firstFamily = (stack) => {
  const f = String(stack).split(',')[0].trim().replace(/^["']|["']$/g, '')
  return /^(system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|sans-serif)$/i.test(f) ? 'the system stack' : f
}

function head({ title, description, path, image }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="website">
<meta property="og:site_name" content="UISandbox">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}${image}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/site.css">
</head>
<body>
<div class="kp">
<header class="kp__top"><a class="kp__brand" href="/"><img src="/favicon.svg" width="16" height="16" alt=""> UISandbox</a><nav><a href="/kits/">Kits</a><a href="/about">How it works</a><a href="https://github.com/Ideelab/uisandbox">Source</a></nav></header>
<main>
`
}

function footer() {
  const cols = LINKS.columns.map((c) => {
    const links = c.links === 'kits' ? [...DOOR.map((k) => ({ label: k.name, href: `/kits/${k.id}/` })), { label: 'All kits', href: '/kits/' }] : c.links
    return `<nav class="sitefoot__col" aria-label="${esc(c.title)}"><h2>${esc(c.title)}</h2><ul>${links.map((l) => `<li><a href="${esc(l.href)}"${/^https?:/.test(l.href) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.label)}</a></li>`).join('')}</ul></nav>`
  }).join('\n')
  const m = LINKS.maker
  return `</main>
<footer class="sitefoot" aria-label="About UISandbox">
<div class="sitefoot__inner">
<div class="sitefoot__brand"><a href="/" class="sitefoot__mark"><img src="/favicon.svg" width="18" height="18" alt=""> UISandbox Design System Generator</a><p>Play with your app's design, right in the browser. Your files never leave it.</p><a class="star" href="https://github.com/Ideelab/uisandbox" target="_blank" rel="noopener" aria-label="Star UISandbox on GitHub"><span class="star__main"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg> Star on GitHub</span></a></div>
${cols}
</div>
<div class="sitefoot__base">Made by <a href="${m.href}" target="_blank" rel="noopener author">${esc(m.name)}</a> at <a href="${m.orgHref}" target="_blank" rel="noopener">${esc(m.org)}</a> · © ${new Date().getFullYear()} ${esc(m.org)} · <a href="${m.licenceHref}" target="_blank" rel="noopener license">${esc(m.licence)}</a></div>
</footer>
</div>
</body>
</html>
`
}

export function kitPage(door) {
  const k = kitData(door.id)
  const look = LOOKS.find((l) => l.id === door.id)?.values ?? {}
  const name = door.name
  const version = k.version ? `${name} ${k.version}` : name
  const lightVars = Object.keys(k.modes?.light ?? {}).length
  const open = `/?load=${encodeURIComponent(`/kits/${door.id}.zip`)}`
  const files = shippedFiles(door.id)
  const description = `A ${name} theme editor on ${name}'s own components: turn its brand, type and corners live, then try it on your own app, and export a design system and a SKILL.md in ${name}'s own names. Free, open source, in your browser.`
  const facts = [
    ['Version', k.version ? esc(k.version) : 'follows its registry; no package version'],
    ['Licence', esc(k.license ?? 'see its home page')],
    ['Package', k.npm ? `<a href="https://www.npmjs.com/package/${esc(k.npm)}">${esc(k.npm)}</a>` : 'none: its CLI copies the components into your repo'],
    ['Runs in', esc(k.runsIn?.framework ?? 'any page, no framework asked')],
    ['Variables', `${lightVars} in its light mode${k.modes?.dark ? ', and its own dark mode' : ''}, read from its package`],
    look.brand && ['Brand as it ships', `<span class="kp__swatch" style="background:${esc(look.brand)}"></span><code>${esc(look.brand)}</code>`],
    look.fontBody && ['Body type', esc(firstFamily(look.fontBody))],
    look.radius && ['Corners', `<code>${esc(look.radius)}</code>`],
  ].filter(Boolean)
  return head({ title: `${name} theme editor · UISandbox`, description, path: `/kits/${door.id}/`, image: `/kits/${door.id}.jpg` }) + `<h1>${esc(name)} theme editor</h1>
<p class="kp__lead">${esc(prose(k.what))}. UISandbox builds ${esc(version)} from its own package and opens it in the editor: six screens in ${esc(name)}'s own components and its own defaults. Turn the brand, the type, the spacing and the corners, and every component follows. Nothing to install, nothing uploaded.</p>
<div class="kp__ctas"><a class="kp__btn kp__btn--primary" href="${open}">Open ${esc(name)} in the editor</a><a class="kp__btn" href="${open}&amp;tab=app">Try it on your own app</a></div>
<figure><img src="/kits/${door.id}.jpg" width="1280" height="800" alt="${esc(name)} in the UISandbox editor: the knobs on the left, ${esc(name)}'s own components on the right" loading="lazy"><figcaption>${esc(name)} as it ships, in the editor. A real screenshot.</figcaption></figure>
<h2>What is read from ${esc(name)}</h2>
<dl class="kp__facts">${facts.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl>
<h2>What you take with you</h2>
<p>Export writes ${esc(name)}'s design system in ${esc(name)}'s own names, starting from what you see:</p>
<ul class="kp__files">${files.map((f) => fileLine(f, name)).join('')}</ul>
<h2>On your own app</h2>
<p>If your app runs on ${esc(name)}, the sandbox recognises it from the rendered page and writes the design system in ${esc(name)}'s names from your app's own values. What you turned on the kit comes with you. The quickest way in is the one where nothing leaves your machine: run <code>npx uisandbox-mcp open</code> in your project, or ask your agent to "open this app in UISandbox". <a href="/about">How it works</a>.</p>
` + footer()
}

export function indexPage() {
  return head({ title: 'UI kit theme editors · UISandbox', description: `Theme editors for ${DOOR.map((k) => k.name).join(', ')}: each kit on its own components, its own defaults read from its package, a design system and a SKILL.md out. Free, open source, in your browser.`, path: '/kits/', image: '/og.png' }) + `<h1>Eight UI kits, on their own components</h1>
<p class="kp__lead">Each kit is built from its own package and opened in the editor as it ships. Turn it, try it on your own app, and take its design system with you in that kit's own names.</p>
<ul class="kp__kits">${DOOR.map((d) => { const k = kitData(d.id); return `<li><a href="/kits/${d.id}/"><b>${esc(d.name)}</b><span>${esc(prose(k.what))}</span></a></li>` }).join('')}</ul>
` + footer()
}

export function siteCss() {
  const chrome = read('src/styles/chrome.css')
  const i = chrome.indexOf('/* @site:start'), j = chrome.indexOf('/* @site:end */')
  if (i < 0 || j < 0) throw new Error('kit-pages: the @site block in chrome.css is gone')
  return `/* Generated by scripts/kit-pages.mjs from chrome.css (@site) and site.css. Do not edit. */\n${chrome.slice(chrome.indexOf('\n', i) + 1, j)}\n${read('src/styles/site.css')}`
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const d of DOOR) {
    mkdirSync(join(root, 'public/kits', d.id), { recursive: true })
    writeFileSync(join(root, 'public/kits', d.id, 'index.html'), kitPage(d))
    if (!existsSync(join(root, 'public/kits', `${d.id}.jpg`))) console.warn(`  no screenshot yet for ${d.id}: run scripts/kit-shots.mjs`)
  }
  writeFileSync(join(root, 'public/kits/index.html'), indexPage())
  writeFileSync(join(root, 'public/site.css'), siteCss())
  console.log(`${DOOR.length} kit pages, /kits/ and site.css`)
}
