#!/usr/bin/env node
/**
 * dist/about.html: the built index.html with /about's own title, description,
 * canonical and text in the block a crawler reads before the app mounts
 * (decision 230). /about is a dialog over the editor (decision 211), so
 * without this a reader that runs no JavaScript (most language-model
 * crawlers) got the homepage's text at /about. Cloudflare serves about.html
 * at /about; the app boots from it exactly as from index.html and opens the
 * dialog, replacing this block on mount. Run by `pnpm build`, after vite.
 *
 * The text follows src/app/AboutDialog.tsx; change one, change the other.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
let html = readFileSync(join(dist, 'index.html'), 'utf8')

const title = 'How UISandbox works · Try designs on your running app, in the browser'
const description = 'How UISandbox opens your running app live in the browser, renders it 1:1 with every CSS value as a knob, checks that, and hands your agent a patch. Nothing leaves your machine.'
const body = `<div class="about-pre">
<h1>How UISandbox works</h1>
<p>What would your app look like in another brand colour, a bigger type scale, or dark mode? Find out on the real app in about a minute. Keep what you see as code, or close the tab and nothing happened.</p>
<h2>Bring your app</h2>
<p>Run <code>npx uisandbox-mcp@latest open</code> in your project, next to your dev server, or tell your agent to open it: your running app opens live, every screen, hot reload included. No app at hand? The editor opens on a kit, shadcn/ui as it ships, with seven more one pick away. Other ways in: the bookmark Take this screen along for a screen behind a login, a zip, a folder or a public GitHub or GitLab repo.</p>
<h2>Pick a look</h2>
<p>Your screen six ways, side by side: Classic, Compact, Soft, Sharp, Airy and Bold. They differ in corners, spacing, depth and type, never in colour, so you compare the style and not the paint.</p>
<h2>Tune it</h2>
<p>One knob moves every place a value is used: a colour used 144 times moves once. Colour, Type, Shape and Space come first, the rest is under More, and every dial has ×1 = as in your code at its centre. Every CSS literal becomes a variable with the same value, so it is your actual app and not a preview of one. Hold Space to see your original.</p>
<h2>Take it home</h2>
<p>Copy for your AI puts the design system and how to apply it in one paste. On a kit, the export keeps the design system and a SKILL.md in your repo, in the kit's own names; on your own app, you get your files patched in place, or tokens for CSS, Tailwind, shadcn, Swift and Android. With the MCP server, Send to your agent hands it straight back.</p>
<h2>Isn't this just Inspect?</h2>
<p>Same instinct, different scale. DevTools changes one declaration on one element, and forgets it when you reload. Here every literal becomes a variable first, so a colour moves everywhere it is used, and what you turn comes out as code. What Inspect does better: it is already open, and it changes the live page, scripts and all.</p>
<h2>How to check it yourself</h2>
<p>Check 1:1 renders the untouched and the tokenised page side by side and compares the computed styles of every element, shadow roots and nested frames included. Zero differences, or it names what differs. The reach meter says how much of what you see the knobs touch, and what lies outside: images, canvas, video. Native projects, WordPress themes and source without a build get a clear message at the door.</p>
<h2>Your files never leave your browser</h2>
<p>There is no server behind the sandbox, no account, no cookies and no analytics. Your files are read in the tab and served to the frame by a service worker; exports are made there too. The one exception is a public repo URL, which goes through uisandbox.org to fetch its zip. Nothing is stored.</p>
<h2>From your terminal, or from your agent</h2>
<p>The same engine runs as an MCP server and as a Claude Code skill. Add it with <code>claude mcp add uisandbox -- npx -y uisandbox-mcp@latest</code> and say "open this app in UISandbox". <a href="/mcp/">The MCP server and its tools</a>.</p>
<h2>Who made this</h2>
<p>Alexander Kaan at Ideelab. Every decision, including the ones that were undone, is in the repo's notes. MIT licensed.</p>
<p><a href="/">The editor</a> · <a href="/guides/">Guides</a> · <a href="/kits/">UI kits</a> · <a href="https://github.com/Ideelab/uisandbox">Source</a></p>
</div>`

const swap = (re, to) => {
  if (!re.test(html)) throw new Error(`about-static: ${re} is gone from dist/index.html`)
  html = html.replace(re, to)
}
const attr = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
swap(/<title>[^<]*<\/title>/, `<title>${attr(title)}</title>`)
swap(/(<meta name="description" content=")[^"]*/, `$1${attr(description)}`)
swap(/(<link rel="canonical" href=")[^"]*/, '$1https://uisandbox.org/about')
swap(/(<meta property="og:url" content=")[^"]*/, '$1https://uisandbox.org/about')
swap(/(<meta property="og:title" content=")[^"]*/, `$1${attr(title)}`)
swap(/(<meta property="og:description" content=")[^"]*/, `$1${attr(description)}`)
swap(/(<meta name="twitter:title" content=")[^"]*/, `$1${attr(title)}`)
swap(/(<meta name="twitter:description" content=")[^"]*/, `$1${attr(description)}`)
// The homepage's intro and stage text make way for /about's own.
swap(/<div class="intro">[\s\S]*?<\/div>\s*<main>[\s\S]*?<\/main>/, `<main><div class="stage stage--about">${body}</div></main>`)
swap(/<\/style>/, '.pre .stage--about{display:block;overflow:auto;font-size:14px;line-height:1.55}.pre .about-pre{max-width:68ch;margin:0 auto}.pre .about-pre h1{font-size:24px;margin:0 0 8px}.pre .about-pre h2{font-size:16px;margin:18px 0 4px}.pre .about-pre p{margin:0 0 8px}</style>')
if (/—/.test(body)) throw new Error('about-static: an em-dash in the copy')
writeFileSync(join(dist, 'about.html'), html)
console.log('dist/about.html')
