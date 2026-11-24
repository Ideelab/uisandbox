#!/usr/bin/env node
/**
 * The guides: one static page per question people bring to a search box or a
 * language model ("how do I try a new design on my app", "why does my app look
 * AI-generated", "is there a design MCP server"), and /guides/ listing them.
 * Static HTML for the same reason as the kit pages: a crawler and a model read
 * them without running the app (decision 230). The header, footer and styles
 * are the kit pages' own (scripts/kit-pages.mjs), so the two cannot drift.
 *
 *   node scripts/guide-pages.mjs     writes public/<slug>/index.html, public/guides/index.html
 *
 * Every claim here is one the app or the notes measure; a number is one that
 * was counted (the tells from src/sandbox/tells.ts, the frameworks from
 * decisions 202 and 204). src/kits/__tests__/guidePages.test.ts fails when
 * these pages are behind.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { head, footer, esc, SITE } from './kit-pages.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OPEN = 'npx uisandbox-mcp@latest open'
const cmd = (c) => `<pre class="kp__cmd"><code>${esc(c)}</code></pre>`
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()
const editor = { label: 'Open the editor', href: '/' }
const how = { label: 'How it works', href: '/about' }

export const GUIDES = [
  {
    slug: 'try-designs-on-your-app',
    title: 'Try a new design on your running app, in the browser · UISandbox',
    short: 'Try designs on your app',
    h1: 'Try a new design on the app you are running',
    description: 'Test a new look on your running app: one line opens your localhost app live in the browser, every colour, font and spacing a knob, then a patch. Free, MIT.',
    lead: 'Run one line next to your dev server and your app opens in UISandbox, live: every screen, hot reload kept. Turn its colour, type, shape and space, and every place a value is used follows. Keep what you like as a patch for your source, or close the tab and nothing happened.',
    ctas: [editor, how],
    body: `<h2>One line, next to your dev server</h2>
${cmd(OPEN)}
<p>It looks for a dev server on localhost and opens it in your own browser. When more than one runs, name it: <code>${OPEN} http://localhost:3000</code>. With no dev server running, it opens the build in the current folder instead. Measured live on Vite with React and on Next.js 15 (App Router), each with its own hot reload. Your agent can do the same for you: see <a href="/mcp/">the MCP server</a>.</p>
<h2>What you can try</h2>
<p>Press <em>6</em> over the screen and you see your own screen six ways, side by side: Classic, Compact, Soft, Sharp, Airy and Bold. They differ in corners, spacing, depth and type and never in colour, so you compare the style and not the paint. Pick one, then tune it. Colour, Type, Shape and Space come first; text size, line height, letter spacing, weight, border width, elevation, motion and grey tint are under More. Every dial has <em>×1 = as in your code</em> at its centre, and holding Space shows your original.</p>
<h2>It is your app, not a mock-up of it</h2>
<p>Every colour, size, radius, font and shadow literal in your CSS becomes a variable holding the very same value, so the page renders exactly as it did. A colour used 144 times is one knob, and turning it moves all 144. <em>Check 1:1</em> compares the computed styles of every element against the untouched page and names anything that differs. The reach meter says how much of what you see the knobs touch; images, canvas and video lie outside it.</p>
<h2>What you take home</h2>
<p><em>Copy for your AI</em> puts the design system and how to apply it in one paste, for Claude Code, Cursor, Codex, Lovable or v0. On your own app you also get a patch for your source files, or tokens for CSS, Tailwind, shadcn, Swift and Android. With the MCP server running, <em>Send to your agent</em> hands it straight back, and the agent shows you the patch before it changes a file.</p>`,
    faq: [
      ['Does my code change while I try things?', 'No. The sandbox works on what your dev server serves. Your files change only when you or your agent apply the patch.'],
      ['Does anything leave my machine?', 'No. The sandbox runs from 127.0.0.1 and renders in your browser. There is no account, no cookies and no analytics.'],
      ['Which apps work?', 'Anything a browser renders from HTML and CSS. Measured live so far: Vite with React, and Next.js 15. It cannot render iOS or Android projects (it exports Swift and Android constants instead) or WordPress themes, and it says so at the door.'],
      ['My app is on staging, or behind a login.', 'Drag <em>Take this screen along</em> to your bookmarks bar and click it on any screen your browser shows, a Lovable or v0 preview included. A zip, a folder or a public GitHub or GitLab repo work too.'],
    ],
  },
  {
    slug: 'design-in-the-browser',
    title: 'Design in the browser instead of on a canvas · UISandbox',
    short: 'Design in the browser',
    h1: 'Design on the app itself, not on a canvas',
    description: 'Try colour, type, corners and spacing on your running app in the browser, with its real data and every screen, not on a canvas mock-up. Keep it as code.',
    lead: 'A canvas is the right place to draw a screen that does not exist yet. Once the app runs, the mock-up and the code drift apart, and a new brand colour tried in a design tool is tried on a picture of your app. UISandbox puts the knobs on the app itself, in your browser.',
    ctas: [{ label: 'Try it on a kit', href: '/' }, { label: 'Try it on your app', href: '/try-designs-on-your-app/' }],
    body: `<h2>What the browser shows that a canvas does not</h2>
<p>Your real data, at its real length: the customer name that wraps, the table with 40 rows, the empty state nobody drew. Every screen, not the three that were mocked up. The hover and focus states your CSS already has, and your own dark mode, switched on your own hooks. The fonts as your users' browsers render them. Change the corner radius here and you see it on every card, input and button at once, because it is one value in your CSS.</p>
<h2>When a canvas is still the better tool</h2>
<p>UISandbox changes values: colour, type, shape and space. It does not move a button, redraw a layout or add a screen. For a new flow or a new page, sketch it on a canvas first. When the layout itself reads as generic (a centred hero with a badge, three identical icon cards), it says so to your agent as advice, because no knob can fix that.</p>
<h2>From the browser back to your design tool</h2>
<p>Nothing is lost on the way back. On a UI kit, the export ships W3C design tokens that Tokens Studio and Figma variables import, next to the kit's own theme file. On your own app you get tokens for CSS, Tailwind, shadcn, Swift and Android, or a patch for your source.</p>
<h2>Isn't this the browser's Inspect?</h2>
<p>Same instinct, different scale. DevTools changes one declaration on one element and forgets it when you reload. Here every literal becomes a variable first, so a colour moves everywhere it is used, and what you turn comes out as code. What Inspect does better: it is already open, and it changes the live page, scripts and all.</p>`,
    faq: [
      ['Do I need a Figma file?', 'No. You start from the app you are running, or from one of eight UI kits as they ship: shadcn/ui, Tailwind CSS, daisyUI, Bootstrap, Material 3, Radix Themes, Mantine and Ant Design.'],
      ['Is it a canvas tool?', 'No. There is no canvas to draw on. The stage is your app, rendered 1:1 in a sandboxed frame, and the knobs are on the left.'],
    ],
  },
  {
    slug: 'why-your-app-looks-ai-generated',
    title: 'Why your app looks AI-generated, and what fixes it · UISandbox',
    short: 'Why apps look AI-generated',
    h1: 'Why your app looks AI-generated',
    description: 'The generic AI look is measurable: Inter or Geist, an indigo brand, gradients and frosted glass. See which tells are on your screen and which a knob fixes.',
    lead: 'A model reaches for the safest default every time, and the defaults are the same for everyone. That is why so many apps an AI helped build look alike. The good news is that most of it can be measured, and some of it is one knob away.',
    ctas: [{ label: 'Check your own app', href: '/try-designs-on-your-app/' }, editor],
    body: `<h2>The tells UISandbox measures</h2>
<p>Only what the computed style of your screen can show, the way Adrian Krebs measured 1,590 Show HN pages for <a href="https://adriankrebs.ch/blog/design-slop" rel="noopener">design slop</a>: from the DOM, with no model judging a screenshot.</p>
<table class="kp__table">
<thead><tr><th>Tell</th><th>When it counts</th><th>A knob fixes it</th></tr></thead>
<tbody>
<tr><td>The default font</td><td>Inter, Geist, Space Grotesk or Instrument Serif as the body or heading font</td><td>Yes, Type</td></tr>
<tr><td>The default accent</td><td>An indigo or violet brand colour</td><td>Yes, Colour</td></tr>
<tr><td>shadcn as it ships</td><td>A near-black brand with Geist</td><td>Yes</td></tr>
<tr><td>Gradients as decoration</td><td>On two or more elements</td><td>No</td></tr>
<tr><td>Frosted glass</td><td>Any element with a backdrop filter</td><td>No</td></tr>
<tr><td>Coloured left borders</td><td>On two or more blocks</td><td>No</td></tr>
<tr><td>Emoji as icons</td><td>Two or more, in headings, list items, buttons, links or cards</td><td>No</td></tr>
<tr><td>Dark mode only</td><td>A dark page with no light scheme</td><td>No</td></tr>
</tbody>
</table>
<p>When you open your app, UISandbox lists which of these are on your screen, and which of them a knob fixes.</p>
<h2>What no knob can fix</h2>
<p>Layout reads as generic too: a centred hero with a small badge above the headline, three or four identical cards each with an icon in a tinted square, numbered 1-2-3 steps on a landing page. These are not reliably measured on an app screen, where a row of figures is often the point, so UISandbox does not claim them as findings. It passes them to your agent as things to avoid when it builds the next screen.</p>
<h2>See it on your own screen</h2>
${cmd(OPEN)}
<p>Run it next to your dev server, then press <em>6</em>: your own screen in six styles side by side. Pick one, change the font and the brand colour, and keep it as a design system your agent follows on every screen after this one.</p>`,
    faq: [
      ['Is Inter a bad font?', 'No. It is a good font that nearly every generated app now uses, so it reads as a default rather than a choice. Any font you picked on purpose fixes the tell.'],
      ['Will my agent keep the new look?', '<em>Copy for your AI</em> gives it the design system and how to apply it in one paste. On a UI kit the export adds a SKILL.md, so Claude Code, Cursor or Codex build the next screen in the kit\'s own classes.'],
    ],
  },
  {
    slug: 'mcp',
    title: 'A design MCP server for Claude Code, Cursor and Codex · UISandbox',
    short: 'Design MCP server',
    h1: 'Try designs from your agent: the UISandbox MCP server',
    description: 'An MCP server for Claude Code, Cursor and Codex: it opens your running app in a design sandbox, waits while you turn the knobs, and returns a patch. Free, MIT.',
    lead: 'Say "let me try some designs" to your agent. It opens your running app in UISandbox in your own browser, waits while you pick a look and turn the knobs, and gets back what you turned with a patch for your source. It shows you the patch before it changes a file.',
    ctas: [{ label: 'uisandbox-mcp on npm', href: 'https://www.npmjs.com/package/uisandbox-mcp' }, { label: 'Setup for every client', href: 'https://github.com/Ideelab/uisandbox/blob/main/mcp/README.md' }],
    body: `<h2>Add it once</h2>
<p>Claude Code:</p>
${cmd('claude mcp add uisandbox -- npx -y uisandbox-mcp@latest')}
<p>Or as a Claude Code plugin, the skill and the server in one: <code>/plugin marketplace add Ideelab/uisandbox</code>, then <code>/plugin install uisandbox@uisandbox</code>. Any other MCP client (Cursor, Codex, Claude Desktop) runs <code>npx -y uisandbox-mcp@latest</code> over stdio. It is listed on the <a href="https://registry.modelcontextprotocol.io/v0/servers?search=uisandbox" rel="noopener">MCP registry</a>.</p>
<h2>The tools</h2>
<table class="kp__table">
<thead><tr><th>Tool</th><th>What it does</th></tr></thead>
<tbody>
<tr><td><code>try_designs</code></td><td>Finds the app you are running and opens it live in your browser. No arguments.</td></tr>
<tr><td><code>wait_for_send</code></td><td>Returns when you press <em>Send to your agent</em>: what you turned, and the patch.</td></tr>
<tr><td><code>load</code>, <code>open</code></td><td>Load a build, a zip or a dev server, and open the real sandbox with it.</td></tr>
<tr><td><code>set</code>, <code>state</code>, <code>screens</code></td><td>Turn knobs from the agent, read where they stand, list the screens.</td></tr>
<tr><td><code>export</code></td><td>A patch, CSS or JSON tokens, Tailwind, shadcn, Swift or Android.</td></tr>
<tr><td><code>verify</code>, <code>screenshot</code></td><td>The 1:1 check and a render, in headless Chromium.</td></tr>
</tbody>
</table>
<h2>Without the MCP server</h2>
<p>An agent with only a shell runs the same thing and gets control back at once:</p>
${cmd(`${OPEN} --detach`)}
<p>It finds the dev server, opens the sandbox in your own browser and returns. Your agent's built-in browser cannot reach your localhost, so the sandbox opens in yours.</p>`,
    faq: [
      ['Does it send my code anywhere?', 'No. The server runs on your machine and serves the sandbox from 127.0.0.1. Nothing is uploaded, and there are no analytics.'],
      ['Does the agent change my files on its own?', 'No. After you press Send, the agent gets the patch with your own file names and shows it to you first. The skill tells it to change files only when you say yes.'],
    ],
  },
]

function guidePage(g) {
  const path = `/${g.slug}/`
  const ld = [
    { '@context': 'https://schema.org', '@type': 'TechArticle', headline: g.h1, description: g.description, url: `${SITE}${path}`, image: `${SITE}/og.png`, author: { '@type': 'Person', name: 'Alexander Kaan', url: 'https://github.com/AlexanderKaan' }, publisher: { '@type': 'Organization', name: 'Ideelab', url: 'https://ideelab.nl/' }, about: { '@type': 'SoftwareApplication', name: 'UISandbox', url: `${SITE}/`, applicationCategory: 'DesignApplication', operatingSystem: 'Web', offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: text(a) } })) },
  ]
  const extra = ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>\n`).join('')
  const btn = (c, i) => `<a class="kp__btn${i === 0 ? ' kp__btn--primary' : ''}" href="${esc(c.href)}"${/^https?:/.test(c.href) ? ' rel="noopener"' : ''}>${esc(c.label)}</a>`
  const others = GUIDES.filter((o) => o !== g).map((o) => `<li><a href="/${o.slug}/">${esc(o.h1)}</a></li>`).join('')
  return head({ title: g.title, description: g.description, path, image: '/og.png', extra }) + `<h1>${esc(g.h1)}</h1>
<p class="kp__lead">${esc(g.lead)}</p>
<div class="kp__ctas">${g.ctas.map(btn).join('')}</div>
${g.body}
<section class="kp__faq"><h2>Questions</h2>
${g.faq.map(([q, a]) => `<h3>${esc(q)}</h3>\n<p>${a}</p>`).join('\n')}
</section>
<h2>More guides</h2>
<ul class="kp__list">${others}<li><a href="/kits/">Theme editors for eight UI kits</a></li></ul>
` + footer()
}

function indexPage() {
  return head({ title: 'Guides · UISandbox', description: 'Try a new design on your running app, why apps an AI helped build look alike, design in the browser instead of on a canvas, and the MCP server for your agent.', path: '/guides/', image: '/og.png' }) + `<h1>Guides</h1>
<p class="kp__lead">UISandbox opens your running app in your browser with every colour, font, radius and spacing as a knob. These pages answer the questions people bring to it.</p>
<ul class="kp__kits">${GUIDES.map((g) => `<li><a href="/${g.slug}/"><b>${esc(g.h1)}</b><span>${esc(g.description.replace(/ Free, MIT\.$/, ''))}</span></a></li>`).join('')}</ul>
` + footer()
}

export const pages = () => [...GUIDES.map((g) => [`${g.slug}/index.html`, guidePage(g)]), ['guides/index.html', indexPage()]]

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [rel, html] of pages()) {
    mkdirSync(join(root, 'public', dirname(rel)), { recursive: true })
    writeFileSync(join(root, 'public', rel), html)
  }
  console.log(`${GUIDES.length} guides and /guides/`)
}
