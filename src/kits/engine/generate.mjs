/**
 * ROLE VALUES → THE PACKAGE YOU DOWNLOAD.
 *
 * This is the deliverable, and the only thing that has to be true: unzip it,
 * follow install.md, and the kits you picked are wearing your values. A theme
 * editor that produces a pretty screen and a broken zip has produced nothing.
 *
 * Each kit gets its theme in ITS OWN form — Tailwind's @theme, daisyUI's
 * @plugin block, shadcn's :root, Bootstrap's variables plus a Sass line,
 * Material's tokens plus its generator. We do not normalise those into a shape
 * of ours; the whole point is that what you copy is what that kit expects.
 *
 * And the manifest carries what could NOT be done, by name. A package that
 * quietly leaves out a third of a theme is worse than one that says so.
 */
import { ROLES, MAP, KIND, route, coverage, darken } from './roles.mjs'
import { contrast } from './color.mjs'

const stamp = (kit) => `${kit.name}${kit.version ? ' ' + kit.version : ''}`
const decl = (vars, indent = '  ') => Object.entries(vars).map(([k, v]) => `${indent}${k}: ${v};`).join('\n')

/* ── one block per kit, in the form that kit reads ────────────────────────── */
const EMIT = {
  tailwind: (r, kit) => `/* ${stamp(kit)}: semantic names Tailwind does not ship.
   These generate utilities: bg-brand, text-ink, border-line, rounded-lg. */
@theme {
${decl(r.vars)}
}`,

  /* Two blocks, and the second one is not optional.
   *
   * shadcn's variables are SEMANTIC and unprefixed — --primary, --background,
   * --border. Tailwind generates utilities from its own --color-* namespace, so
   * `bg-primary` does not exist unless something bridges the two. shadcn's own
   * globals.css does it with @theme inline; we did not, and every shadcn
   * component in the preview rendered completely unstyled. The package had the
   * same hole, so anyone installing it would have seen the same nothing. */
  shadcn: (r, kit) => {
    /* THEIR defaults, ours over them — the same rule daisyUI needed. Our knobs
     * reach seven of shadcn's variables; its components read seventeen. Writing
     * only ours left --secondary, --accent and --destructive undefined, so
     * bg-secondary and hover:bg-accent were never generated and half its
     * variants rendered as bare text. */
    const all = { ...kit.modes.light, ...r.vars }
    const bridge = Object.fromEntries(Object.keys(all)
      .filter((n) => n !== '--radius')
      .map((n) => [n.replace(/^--/, '--color-'), `var(${n})`]))
    const radius = all['--radius']
    return `/* ${stamp(kit)}: the variables its components read, its published
   defaults with your values over them. The dark half is below. */
:root {
${decl(all)}
}

/* The bridge into Tailwind's namespace, so bg-primary and border-input exist.
   Without it the variables above are set and nothing reads them. */
@theme inline {
${decl(bridge)}${radius ? `
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);` : ''}
}

/* The base layer shadcn's own installation prescribes, and the third thing this
 * kit has needed that we were not sending.
 *
 * Its components use the BARE border utility, which in Tailwind v4 sets a
 * width and leaves the colour at currentColor. (No backticks in here: this
 * whole block is a JS template literal, and one backtick in a comment breaks
 * the file at a line far from the edit. Fourth time.) Without this rule every card,
 * input and table in a shadcn app draws its border in the TEXT colour — a
 * near-black hairline where a #e5e5e5 one belongs. It looked wrong on the wall
 * and it was wrong in the package we hand people. */
@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
}`
  },

  /* REPLACES the theme, so it must carry everything the kit needs.
   *
   * A daisyUI theme block with default:true is the whole theme — write only the
   * seven values we route and the rest are simply gone. That took a checkbox's
   * `border: var(--border) solid …` down to a zero-width border and made every
   * checkbox and switch on the wall invisible. Found by looking at the render,
   * not by reading the code.
   *
   * So the rule the whole product already claims applies to us too: their
   * defaults are the base, our values go on top. */
  daisyui: (r, kit) => `/* ${stamp(kit)}: a named theme, registered as the default.
   Their published defaults with your values over them: a theme block replaces
   the theme, so anything left out would be missing rather than inherited.
   SET data-theme="yourkit" ON YOUR <html>. A dark theme is registered below with
   prefersdark, which is the flag daisyUI's own dark theme uses to beat
   default:true the moment a visitor's OS is dark. Without one of ours there,
   theirs won and none of these values applied, which is exactly what happened
   the first time, and turned the whole wall its factory purple. */
@plugin "daisyui/theme" {
  name: "yourkit";
  default: true;
${decl(kit.plain?.light ?? {})}
${decl({ ...kit.modes.light, ...r.vars })}
}`,

  bootstrap: (r, kit) => `/* ${stamp(kit)}: what a running page can change.
   The brand is NOT here: see _custom.scss. \`var(--bs-primary)\` appears zero
   times in Bootstrap's own stylesheet, so setting it would change nothing. */
:root {
${decl(r.vars)}
}`,

  material: (r, kit) => `/* ${stamp(kit)}: the seed and the corner ramp.
   M3 computes its other 46 colour roles from the seed; generate them with
   @material/material-color-utilities rather than setting them by hand. */
:root {
${decl(r.vars)}
}`,

  /* Half of Radix is not CSS at all.
   *
   * Its accent, its corner radius and its type scale are not variables you set
   * -- they are attributes on the Theme root, chosen from sets Radix publishes.
   * Writing a hex into --accent-9 would leave the other eleven steps belonging
   * to the previous accent, so the choices are made where Radix makes them and
   * the block below carries only what really is a variable. */
  radix: (r, kit) => `/* ${stamp(kit)}: the half that IS a variable.
   The other half is on your <Theme>:
     ${attrLine(r) || '(no choices matched)'}
   Set those there, not here: Radix's accent is a twelve-step scale it ships,
   and one step written by hand is eleven steps out of step. */
${SCOPE.radix} {
${decl(r.vars)}
}`,

  mantine: (r, kit) => `/* ${stamp(kit)}: its variables, all settable at runtime.
   Its COMPONENT class names are content hashes (.m_77c9d27d is Button), so use
   its React components; these variables are what they read.
   The selector is theirs, not :root: Mantine's own block is
   :root[data-mantine-color-scheme='light'] and a plain :root loses the tie. */
${SCOPE.mantine} {
${decl(r.vars)}
}`,

  /* ANT DESIGN'S BLOCK IS THE LEFTOVERS, ON PURPOSE.
   * Everything routable there is a token you hand their generator, and that is
   * what the file below the export writes. What is left is the two the
   * generator has no input for — their three shadow strings — plus the values
   * themselves, so a reader can see what the theme resolved to without running
   * anything. Written under .antd, which is the scope their own cssVar option
   * puts them in. */
  antd: (r, kit) => `/* ${stamp(kit)}: the leftovers.
   Ant Design derives everything from the tokens in antd.theme.ts next to this
   file; do not write these by hand unless you mean to overrule its algorithm.
   The shadows are here because its token API takes no strength. */
.antd {
${decl(r.vars)}
}`,

  /* Open Props renders nothing, so this block exists to make YOUR css agree
   * with the kit above it: write var(--brand) or var(--size-3) by hand and it
   * lands on the same values the components use. */
  openprops: (r, kit) => `/* ${stamp(kit)}: variables only. Open Props ships no components.
   Loaded UNDER whatever renders, so your own CSS agrees with it. */
${SCOPE.openprops} {
${decl(r.vars)}
}`,
}

/** The attributes a choice-taking kit needs on its root, as markup. */
export const attrLine = (r) =>
  Object.entries(r.attrs ?? {}).map(([a, v]) => `${a}="${v}"`).join(' ')

/* ── the extra files some kits need ───────────────────────────────────────── */
const EXTRA = {
  bootstrap: (r, kit, values) => ({
    '_custom.scss': `// ${stamp(kit)}: the half a running page cannot change.
// Bootstrap compiles component colours, so the brand is a build-time variable.
// Import this INSTEAD of plain bootstrap.css:
//
//   @import "custom";
//
${r.needsBuild
  /* Only the ones with a value. A placeholder here is not a comment, it is a
   * syntax error — `$success: /* set me *\/;` made the whole Sass build fail,
   * and the build falls back to Bootstrap's shipped CSS when it does. So one
   * unset semantic colour silently took the BRAND down with it and the wall
   * showed Bootstrap's factory blue while the note claimed otherwise. */
  .filter((b) => values[b.role] != null && !String(b.sass).startsWith('--'))
  .map((b) => `${b.sass}: ${b.from ? b.from(values[b.role]) : values[b.role]};   // ${b.why}`).join('\n') || '// nothing here needs a build-time value'}

@import "bootstrap/scss/bootstrap";
`,
  }),
  antd: (r) => ({
    'antd.theme.ts': `// The theme, because Ant Design has no stylesheet to edit.
// Its 1,289 variables are computed from these by its own algorithm, so this
// object is the whole of your kit — a variable written by hand would move one
// value and leave the two hundred derived from it behind.
import type { ThemeConfig } from 'antd'

export const theme: ThemeConfig = {
  cssVar: { key: 'antd' },
  hashed: false,
  token: ${JSON.stringify(r.tokens ?? {}, null, 4).replace(/\n/g, '\n  ')},
}

// <ConfigProvider theme={theme}> around your app, and nothing else to import.
`,
  }),
  shadcn: () => ({
    'components.json': JSON.stringify({
      $schema: 'https://ui.shadcn.com/schema.json',
      style: 'new-york', rsc: true, tsx: true,
      tailwind: { config: '', css: 'app/globals.css', baseColor: 'neutral', cssVariables: true },
      aliases: { components: '@/components', ui: '@/components/ui', utils: '@/lib/utils' },
    }, null, 2) + '\n',
  }),
}

const INSTALL = {
  tailwind: (k) => [`npm install ${k.npm}@${k.version}`, `/* then in your CSS: */ @import "tailwindcss";`],
  daisyui: (k) => [`npm install ${k.npm}@${k.version}`, `/* in your CSS: */ @plugin "daisyui";`,
    `<!-- and on your <html>, or daisyUI's own dark theme wins whenever the -->`,
    `<!-- visitor's OS is dark: it registers with prefersdark, which beats  -->`,
    `<!-- our default:true. This is not optional.                          -->`,
    `<html data-theme="yourkit">`],
  bootstrap: (k) => [`npm install ${k.npm}@${k.version} sass`, `/* build _custom.scss instead of importing bootstrap.css */`],
  material: (k) => [`npm install ${k.npm}@${k.version} @material/material-color-utilities`,
    `<!-- Material's components are custom elements, not classes: import the -->`,
    `<!-- ones you use, or <md-filled-button> renders as an unknown tag.     -->`,
    `import '@material/web/button/filled-button.js'`,
    `import '@material/web/textfield/outlined-text-field.js'  // and so on`,
    `/* their typography classes ship in the package too: */`,
    `import { styles } from '@material/web/typography/md-typescale-styles.js'`],
  shadcn: (k) => [`npx shadcn@latest init`, `npx shadcn@latest add button card input dialog table  # whatever you picked`,
    ...(k.animates ? [`npm install ${k.animates.npm}@${k.animates.version}`,
      `/* in your globals.css, as shadcn's own init writes it: */`,
      `@import "tw-animate-css";`,
      `/* their menu, dialog, popover and tooltip name ten utilities that live  */`,
      `/* in that package and nowhere else. Without it those classes have no    */`,
      `/* rule and every one of those components appears with no entrance.      */`] : [])],
  antd: (k) => [`npm install ${k.npm}@${k.version}`,
    `<!-- No stylesheet. Ant Design generates its CSS from the theme object -->`,
    `<!-- in antd.theme.ts, so the provider IS the installation.            -->`,
    `import { ConfigProvider } from 'antd'`,
    `import { theme } from './antd.theme'`,
    `<ConfigProvider theme={theme}>`],
  radix: (k, r) => [`npm install ${k.npm}@${k.version}`, `import '@radix-ui/themes/styles.css'`,
    `<!-- the choices go on the Theme root, not in CSS: -->`,
    `<Theme ${attrLine(r) || 'accentColor="indigo"'}>`],
  mantine: (k) => [`npm install ${k.npm}@${k.version}`, `import '@mantine/core/styles.css'`,
    `<!-- use its React components; the class names in its stylesheet are -->`,
    `<!-- content hashes and are not an API you write by hand.           -->`,
    `<MantineProvider>`],
  openprops: (k) => [`npm install ${k.npm}@${k.version}`,
    `/* the scales, then your theme.css after them */`,
    `@import "open-props/style";`,
    `@import "open-props/normalize";`],
}

/**
 * @param values  role id → value, e.g. { brand: '#0B6E8A', radius: '12px' }
 * @param kitIds  which kits are switched on
 * @param kits    the fetched kit documents, keyed by id
 * @returns       path → file contents
 */
/**
 * Two kits can claim the same variable NAME with different meanings, and the
 * loser is whichever stylesheet is read second.
 *
 * shadcn's `--border` is a colour. daisyUI's `--border` is a width, and its
 * checkbox is `border: var(--border) solid …`. Enable both and shadcn's #dfe2e7
 * lands in a width slot: every checkbox and switch silently loses its outline.
 *
 * We hit this ourselves in the preview before any user could — which is the
 * only reason it is checked here rather than shipped. Nothing else compares
 * kits closely enough to notice.
 */
/**
 * The entries of generate() that are actual FILES. Keys beginning with `_` are
 * working data for the page (the per-kit blocks, the detected name clashes) and
 * are not written anywhere. This rule lived only in the page, so the build
 * proof wrote an object into a file and the whole end-to-end check died on it.
 */
export const plain = (files) => Object.fromEntries(
  Object.entries(files).filter(([k, v]) => !k.startsWith('_') && typeof v === 'string'))

/**
 * Parts of a screen a kit ships no component for. Filled in for Material
 * because it is the one kit here whose components are code: its package is the
 * authority on what exists, and what is absent from it is absent, full stop.
 */
export const COMPONENT_GAPS = {
  bootstrap: [
    ['footer', 'Bootstrap ships a navbar but no footer component; the one on the wall is its own utilities on plain markup'],
    ['chart', 'and no chart, so the bars are its own colour utilities on plain markup'],
    ['empty', 'and no empty state'],
  ],
  shadcn: [
    ['footer', 'shadcn ships no footer; the one on the wall is its own tokens on plain markup'],
    ['chart', 'its chart is Recharts in React, which cannot be a class name; the bars here are its own --chart-1 and --chart-2, the same five colours its installation ships'],
  ],
  radix: [
    ['navbar', 'Radix Themes ships no navigation bar; the one on the wall is rt-Link and rt-Heading in a flex row'],
    ['footer', 'and no footer either, the same with rt-Grid'],
    ['sidenav', 'and no sidebar: its TabNav runs horizontally, so the rail is rt-Text and rt-Badge rows on its own accent scale'],
    ['breadcrumb', 'and no breadcrumb, so rt-Link with a separator'],
    ['list', 'and no list; DataList is for a label and a value, which is what the key-and-value card really uses'],
    ['chart', 'and no chart, so the bars are its accent scale at steps 9 and 6'],
  ],
  mantine: [
    ['navbar', 'the header and footer come from AppShell, which normally positions them for a whole app shell; on the wall they sit in flow'],
    ['chart', 'charts live in @mantine/charts, a separate package this page does not load; the bars are its own primary colour'],
  ],
  daisyui: [
    ['chart', 'daisyUI ships no chart; the bars are its own primary colour on plain markup'],
    ['empty', 'and no empty state'],
  ],
  tailwind: [
    ['chart', 'Tailwind ships utilities, not components, so everything on this wall is composed, the chart included'],
  ],
  antd: [
    ['chart', 'Ant Design ships no chart; charts live in @ant-design/charts, a separate package, so the bars here are its own primary at two fills'],
    ['stack', 'their layout is Flex and Space, which are components; a column of ours is their spacing on a plain div'],
    ['sidenav', 'their Menu in inline mode is the sidebar, and it is theirs, but the rail on this wall has a count on one row, which their item API has no slot for, so that badge sits in the label'],
  ],
  material: [
    ['navbar', 'M3 has a top app bar in the specification; @material/web ships only a bottom navigation bar, so the header is its tokens on plain markup'],
    ['footer', 'no footer in the specification or the package'],
    ['mediacard', 'no media card: md-outlined-card has no image slot, so the picture area is a plain div on their surface tokens'],
    ['layout', 'Material publishes colour and shape tokens but no spacing scale, and ships no layout components, so spacing between elements is yours to decide'],
    ['table', '@material/web ships no data table, though the M3 spec describes one'],
    ['avatar', '@material/web ships no avatar; compose one from its shape and colour tokens'],
    ['alert', '@material/web ships no inline alert or banner; the closest is md-filled-card re-toned with its own container token'],
    ['breadcrumb', 'no breadcrumb in the specification or the package'],
    ['chart', 'and no chart, so the bars are its primary and primary-container tokens'],
    ['empty', 'and no empty state'],
    ['sidenav', 'M3 has a navigation drawer and @material/web ships it in labs, where it positions itself for a whole app shell; the rail on the wall is md-list, which is what a drawer is made of'],
  ],
}

/**
 * The four specimens that are not components anywhere.
 *
 * A colour card, a type scale, a corner ladder and an elevation ladder are how
 * a design system is DOCUMENTED, not what it ships — no kit here has a class
 * for one. They are drawn from each kit's own variables and its own text
 * components, and this line says so once rather than seven times.
 */
export const SPECIMENS = ['swatches', 'typespec', 'shapes', 'elevation']

/**
 * A face that has to be fetched, and the line that fetches it.
 *
 * The generator writes a webfont as `'Family', <generic>` and a system stack as
 * the kit published it, so the quote on the first family is the signal — it is
 * there because we put it there. A theme that names Fraunces and never says
 * where Fraunces comes from is a theme that renders as Times on the machine it
 * was not built on.
 */
export function webfonts(values) {
  const out = []
  for (const [role, value] of Object.entries(values ?? {})) {
    const m = /^'([^']+)'/.exec(String(value ?? ''))
    if (!m || out.some((f) => f.family === m[1])) continue
    out.push({ role, family: m[1] })
  }
  return out
}

export const fontLink = (families) => families.length
  ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${
      families.map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700`).join('&')}&display=swap">`
  : ''

/**
 * The selector a kit's own values must be beaten with.
 *
 * A theme block does not win by being ours; it wins by out-specifying theirs.
 * Mantine writes :root[data-mantine-color-scheme='light'] — a pseudo-class AND
 * an attribute — so a plain :root of ours lost every tie and the semantic
 * colours moved in the file and nowhere on the screen. Radix scopes to its
 * theme class. This is the third shape of the same lesson daisyUI taught with
 * data-theme, so it is written down once and used in both places: the file we
 * generate and the live block the preview injects.
 */
export const SCOPE = {
  mantine: ":root[data-mantine-color-scheme='light'], [data-mantine-color-scheme='light']",
  radix: '.radix-themes',
  openprops: ':where(html)',
}
export const scopeOf = (id) => SCOPE[id] ?? ':root'

/**
 * And the switch each kit uses to mean "the lights are off".
 *
 * Every one of these is theirs: shadcn keys on .dark, Bootstrap on
 * data-bs-theme, Mantine on data-mantine-color-scheme, Radix on .dark-theme,
 * Open Props on the media query. Picking one of our own would mean a dark block
 * their components never see.
 *
 * `null` means the kit publishes no dark mode at all, and we do not invent one.
 */
/* Kits that ship a stylesheet carrying their own dark values. Everything else
 * has to be handed its defaults, because our file is the only place they live. */
const OWN_DARK_STYLESHEET = new Set(['bootstrap', 'radix', 'mantine', 'material', 'openprops'])

export const DARK = {
  tailwind: null,
  daisyui: 'theme',                 // a second registered theme, not a selector
  shadcn: '.dark, [data-theme="dark"]',
  bootstrap: '[data-bs-theme="dark"]',
  material: '@media (prefers-color-scheme: dark)',
  radix: '.dark, .dark-theme',
  mantine: ":root[data-mantine-color-scheme='dark'], [data-mantine-color-scheme='dark']",
  openprops: '@media (prefers-color-scheme: dark)',
  /* Their dark is an ALGORITHM, not a selector: theme.darkAlgorithm run over
     the same seeds. There is no block of ours to write, so there is none. */
  antd: 'algorithm',
}

export function collisions(routed, kits) {
  const out = []
  for (const r of routed) {
    for (const name of Object.keys(r.vars)) {
      for (const other of routed) {
        if (other.kit === r.kit) continue
        const theirs = Object.assign({}, ...Object.values(kits[other.kit]?.modes ?? {}))
        if (!(name in theirs)) continue
        if (name in other.vars) continue          // both write it; same intent, no surprise
        out.push({ variable: name, written: r.kit, read: other.kit, theirValue: theirs[name] })
      }
    }
  }
  return out
}

/**
 * The dark half of a kit's block, in the kit's OWN switch.
 *
 * daisyUI is the odd one and the reason this is not a single template: a theme
 * there is registered, not selected, so its dark mode is a SECOND @plugin block
 * with prefersdark — which is also what made the light one lose every time a
 * visitor's OS was dark, the very first thing this project got wrong.
 */
function darkBlock(r, kit) {
  const at = DARK[r.kit]
  if (!at || !r.dark) return ''
  /* A KIT WHOSE DARK IS A FUNCTION, NOT A SELECTOR.
     Ant Design's dark mode is theme.darkAlgorithm run over the same seeds, so
     there is no block of ours to write and the theme file says so instead.
     Written as a selector it copied their 835 published dark values into our
     file — including a navy their Layout header carries as a literal, which is
     how the check that nothing here is a colour we chose found it. */
  if (at === 'algorithm') {
    return `/* ${kit.name} in the dark: an ALGORITHM, not a selector.
   theme.darkAlgorithm over the same tokens, set in antd.theme.ts:
     import { theme as antdTheme } from 'antd'
     <ConfigProvider theme={{ ...theme, algorithm: antdTheme.darkAlgorithm }}>
   Nothing to write here; a block of variables would overrule the generator. */`
  }
  const head = `/* ${kit.name} in the dark: your values through this kit's own
   published light-to-dark relationship, in the switch it actually reads. */`
  if (r.kit === 'daisyui') {
    return `${head}
@plugin "daisyui/theme" {
  name: "yourkitdark";
  prefersdark: true;
  color-scheme: dark;
${decl({ ...kit.modes.dark, ...r.dark })}
}`
  }
  /* THEIR dark defaults, ours over them — the same rule the light block needed.
   *
   * shadcn's variables exist nowhere but the file we generate: its components
   * are class strings that read --muted, --secondary, --accent. Writing only the
   * seven we route left every other name at its LIGHT value inside .dark, so an
   * avatar in dark mode was a near-white circle with near-white initials in it.
   * Kits with a stylesheet of their own already carry their dark values and are
   * left alone — re-stating them would put our extraction over their source. */
  const vars = OWN_DARK_STYLESHEET.has(r.kit) ? r.dark : { ...kit.modes.dark, ...r.dark }
  if (at.startsWith('@media')) {
    return `${head}
${at} {
  ${scopeOf(r.kit)} {
${decl(vars, '    ')}
  }
}`
  }
  return `${head}
${at} {
${decl(vars)}
}`
}

export function generate(values, kitIds, kits, opts = {}) {
  const routed = darken(route(values, kitIds, kits), kits)
  const files = {}

  /* keyed, not indexed: a kit now emits a light block AND a dark one, and
     zipping two arrays by position handed daisyUI shadcn's dark block. */
  const byKit = {}
  const blocks = routed.flatMap((r) => {
    const kit = kits[r.kit]
    if (!kit) throw new Error(`no fetched values for "${r.kit}", run fetch-kits.mjs`)
    const emit = EMIT[r.kit]
    if (!emit) throw new Error(`no emitter for "${r.kit}": a kit without one would ship an empty theme`)
    Object.assign(files, EXTRA[r.kit]?.(r, kit, values) ?? {})
    const pair = [emit(r, kit), darkBlock(r, kit)].filter(Boolean)
    byKit[r.kit] = pair.join('\n\n')
    return pair
  })

  files['theme.css'] = `/* YOUR DESIGN SYSTEM
 *
 * Generated from ${routed.length} kit${routed.length > 1 ? 's' : ''} and ${Object.keys(values).length} values.
 * Every variable below belongs to the kit that publishes it — nothing here is
 * ours. Read MANIFEST.md for what could not be set and why.
 */

${blocks.join('\n\n')}
`

  files['install.md'] = `# Install

${routed.map((r) => {
  const kit = kits[r.kit]
  /* WHAT YOU HAVE TO BE RUNNING, before the command to install it.
     Read from the kit's own peer dependencies. Someone who finds out on line
     one that this is React-only has lost a minute; someone who finds out after
     wiring a theme has lost an afternoon. */
  const run = kit.runsIn
  const line = run ? `> ${run.framework ? `**${run.framework} only.** ` : '**Any framework.** '}${run.what}.\n\n` : ''
  return `## ${kit.name}\n\n${line}\`\`\`bash\n${(INSTALL[r.kit]?.(kit, r) ?? []).join('\n')}\n\`\`\`\n`
}).join('\n')}
Then import \`theme.css\` after the kits, so your values win.
`

  files['MANIFEST.md'] = manifest(routed, kits, values, opts)
  /* One set of rules, under the three names different tools look for. Cursor
   * reads .cursor/rules, Claude Code reads CLAUDE.md, and AGENTS.md is the
   * convention the rest are converging on — same file, so none of them is
   * reading a stale copy of the other. */
  /* Three layers, which is the convention that settled in 2026: DESIGN.md holds
   * the tokens and the reasoning, AGENTS.md tells the agent to go and read it,
   * and the tool-specific files are the same pointer under the names Claude
   * Code and Cursor look for. A pointer is short on purpose — a rules file that
   * repeats the design system is a second copy that will go stale. */
  files['DESIGN.md'] = designMd(routed, kits, values, opts)
  /* The skill is the procedural half, under the path Claude Code loads by
   * itself. The pointer below names it for every tool that does not. */
  const skillPath = `.claude/skills/${slugOf(opts.name)}/SKILL.md`
  files[skillPath] = skillMd(routed, kits, values, opts)
  const pointer = `# ${opts.name ?? 'This project'}

Before writing or changing ANY user interface, be it a colour, a spacing, a
component or a screen, read \`DESIGN.md\` in this directory and follow it.

It carries the design system: the values, where each one comes from, what this
stack cannot express, and the rules for working inside it. It is generated, so
do not edit it by hand; change it where it was made and export again.

The working rules — composition, motion, icons, states, the self-checks — are
the skill at \`${skillPath}\`. Claude Code loads it on its own for UI work;
every other tool should read it like a second page of this file.

Two things it will tell you that are easy to get wrong:

- Never introduce a second UI library. This project is built on
  ${routed.map((r) => kits[r.kit].name).join(' + ')}.
- Never write a raw hex, radius or font size. Everything is a variable in
  \`theme.css\`.
`
  files['AGENTS.md'] = pointer
  files['CLAUDE.md'] = pointer
  files['.cursor/rules'] = pointer
  files['tokens.json'] = tokensJson(values, routed, kits)
  /* per-kit blocks too: anything showing ONE kit must load only that kit's
     block, or the collision above happens inside your own preview */
  files._blocks = byKit
  files._collisions = collisions(routed, kits)
  return files
}

/**
 * THE CONTRAST AUDIT, on the values someone actually set.
 *
 * Every editor in this space lets you build an unreadable theme and says
 * nothing. We already carry the maths, so the export can show each pair with
 * its ratio before anyone downloads it — and a pair that fails is named rather
 * than rounded away.
 *
 * Only pairs that REALLY MEET on screen. Auditing ink against a colour nothing
 * puts it on produces phantom failures, which this project has paid for once
 * already (a mid-grey on white that no component ever rendered).
 */
const PAIRS = [
  ['Body text on the page', 'ink', 'page', 4.5],
  ['Body text on a surface', 'ink', 'surface', 4.5],
  ['Muted text on the page', 'inkMuted', 'page', 4.5],
  ['Muted text on a surface', 'inkMuted', 'surface', 4.5],
  ['Button text on the brand', 'onBrand', 'brand', 4.5],
  ['The brand against the page', 'brand', 'page', 3],
  /* Named for what it IS, because this one fails for almost every kit's own
     default and a failure nobody can read is a failure nobody acts on. A card's
     border identifies nothing — the card has a background. The line round a
     text field is the only thing that says where the field is, and that is what
     1.4.11 puts at 3:1. Our own palette moved this line OFF 3:1 on purpose, to
     look like the kits really look; this is what that costs. */
  ['The line that shows where a field is', 'line', 'surface', 3],
]
export function auditContrast(values) {
  const out = []
  for (const [label, fg, bg, min] of PAIRS) {
    const a = values[fg], b = values[bg]
    if (!a || !b) continue
    const ratio = contrast(a, b)
    out.push({ label, fg, bg, ratio: Math.round(ratio * 100) / 100, min, passes: ratio >= min })
  }
  return out
}

/* Between that heading and the NEXT one. Slicing to the end of the file swept
   the contrast section in with it, so every pair appeared twice — once as a
   ratio and once as a thing that "could not be done". */
export const section = (md, heading) => {
  const from = md.indexOf(heading)
  if (from < 0) return []
  const rest = md.slice(from + heading.length)
  const to = rest.indexOf('\n## ')
  return (to < 0 ? rest : rest.slice(0, to)).split('\n').filter((l) => l.startsWith('- ')).map((l) => l.slice(2))
}

/** What you have, where it came from, and — the part nobody else prints — what could not be done. */
function manifest(routed, kits, values, opts = {}) {
  const rows = routed.map((r) => {
    const k = kits[r.kit]
    return `| ${k.name} | ${k.version ?? 'live'} | ${k.license ?? 'see project'} | ${k.runsIn?.framework ?? 'anything'} | ${Object.keys(r.vars).length} | ${k.source} |`
  })

  const caveats = routed.flatMap((r) => {
    const k = kits[r.kit]
    const out = []
    for (const b of r.needsBuild ?? []) out.push(`- **${k.name} · ${b.role}**: not settable at runtime. \`${b.sass}\` is in \`${b.where ?? '_custom.scss'}\`; ${b.why}.`)
    for (const [from, roles] of Object.entries(Object.groupBy(r.derived ?? [], (d) => d.from))) {
      const names = roles.map((d) => d.role).join(', ')
      out.push(from === 'brand'
        ? `- **${k.name} · ${names}**: computed by the kit from your brand colour. Generate the full scheme with its own tool rather than setting these by hand.`
        : `- **${k.name} · ${names}**: this kit ties that to \`${from}\`, so the ${from} knob already moved it. There is nothing separate to set.`)
    }
    if (r.unroutable?.length) out.push(`- **${k.name} · ${r.unroutable.join(', ')}**: this kit has no variable for that job, so the value was not written anywhere.`)
    if (r.unscaled?.length) out.push(`- **${k.name}**: ${r.unscaled.join(', ')} were left at their published values: no ratio could be read from a unitless input.`)
    if (r.added?.length) out.push(`- **${k.name} · ${r.added.join(', ')}**: this kit ships no semantic name for these, so they were ADDED. Reference them yourself (\`bg-brand\`, \`text-ink\`).`)
    /* Not every gap is a token that would not take a value. Some are parts of a
     * screen the kit ships no component for at all, and a theme that stays
     * silent about those is the reason people find out at build time. */
    for (const role of ROLES) {
      const t = MAP[r.kit]?.[role.id]
      if (t?.overrides && values[role.id]) out.push(`- **${k.name} · ${role.id}**: this kit derives that colour itself. Your value replaces ${t.overrides}; everything else in the scheme still comes from the seed.`)
    }
    if (r.noDarkMode) out.push(`- **${k.name} · dark mode**: this kit publishes no dark values of its own, so none were generated. Anything else would be a palette we invented.`)
    if (r.greyscale?.length) out.push(`- **${k.name} · dark mode for \`${r.greyscale.join('`, `')}\`**: this kit's own light-to-dark change does not fit your colour: carrying it through would cost more than half its chroma to stay inside sRGB, which washes it out rather than darkening it. ${k.name === 'shadcn/ui' ? 'shadcn ships no brand colour of its own — --primary is part of its neutral ramp and simply inverts — so it has never said what to do with a colour. ' : ''}Left unchanged; check it against the contrast list.`)
    for (const c of r.chosen ?? []) {
      out.push(`- **${k.name} · ${c.role}**: not a value this kit takes. You asked for \`${c.asked}\`; the nearest of its ${c.of} published ${c.attr.replace('data-', '')} settings is **${c.picked}** (\`${c.got}\`). ${c.why}.`)
    }
    return out
  })

  const clash = collisions(routed, kits)
  return `# Your design system

| Kit | Version | Licence | Runs in | Variables set | Read from |
|---|---|---|---|---|---|
${rows.join('\n')}

## What you set

${ROLES.filter((r) => values[r.id] != null).map((r) => `- \`${r.id}\`: ${values[r.id]}  *(${r.what})*`).join('\n')}

## What could not be done

${caveats.length ? caveats.join('\n') : 'Nothing. Every value reached every kit you enabled.'}

## What this stack is made of

${(() => {
  /* bottom-first, the way a stack really loads — the ids arrive in whatever
     order they were switched on, and "Open Props over daisyUI" is backwards. */
  const rank = (k) => (k.layer === 'tokens' ? 0 : k.layer === 'utility' ? 1 : 2)
  const kits_ = routed.map((r) => kits[r.kit]).sort((a, b) => rank(a) - rank(b))
  const top = (fn) => [...kits_].reverse().find(fn)
  const beh = top((k) => k.bands?.behaviour)
  const eng = top((k) => k.bands?.engine === 'own')
  const tok = kits_.filter((k) => (k.bands?.tokens ?? 0) > 0)
  const comp = [...kits_].reverse().find((k) => k.bands?.components)
  return [
    `- **Behaviour:** ${beh ? `\`${beh.bands.behaviour.by}\`, which ${beh.name} brings with it: ${beh.bands.behaviour.what}.`
      : 'nothing here brings any. These are classes, so the keyboard order, the focus management and the ARIA are yours to write.'}`,
    `- **Engine:** ${eng ? `${eng.name}${eng.layer === 'utility' ? ', compiled from what your markup uses' : ', its own stylesheet'}.` : 'none in this stack.'}`,
    `- **Tokens:** ${tok.length ? `${tok.at(-1).name}${tok.length > 1 ? `, over ${tok.slice(0, -1).map((k) => k.name).join(' and ')}` : ''}, and your values over all of it.` : 'none.'}`,
    `- **Components:** ${comp ? comp.name + '.' : 'none, so the parts are tokens on plain markup.'}`,
  ].join('\n') })()}

## Variables in here that nothing reads

${(() => {
  const on = new Set(routed.map((r) => r.kit))
  const rows = (opts.unread ?? []).filter((u) => on.has(u.kit))
  if (!rows.length) return 'Nothing. Every variable this theme writes is read by the kit it belongs to, or by your code.'
  return `Counted in each kit's own stylesheet, and in its component code where its
components are code rather than classes. These are written because the kit
publishes the name and a later release may read it. Yours to reference; the
kit will not.

${rows.map((u) => `- **${u.name} · ${u.role}**: ${u.names.map((n) => `\`${n}\``).join(' ')}${
  u.tokensOnly ? '. A token layer publishes for your code; its own stylesheet reads none of it.'
    : u.instead.length ? `. What it does read is ${u.instead.slice(0, 3).map((n) => `\`${n}\``).join(' ')}${u.instead.length > 3 ? ' and others' : ''}.` : '.'}`).join('\n')}` })()}

## What these kits have no component for

Not about your values: these are parts of a screen the kit itself does not
ship. Nothing here was substituted quietly. Where the wall shows one, it is
plain markup on that kit's own tokens.

${(() => { const gaps = routed.flatMap((r) => (COMPONENT_GAPS[r.kit] ?? [])
    .map(([part, why]) => `- **${kits[r.kit].name} · ${part}**: ${why}.`))
  return gaps.length ? gaps.join('\n') : 'Nothing. Every part of the wall is a component these kits ship.' })()}

## Contrast

${(() => { const a = auditContrast(values); const bad = a.filter((p) => !p.passes)
  return `${a.length - bad.length} of ${a.length} pairs clear their floor.\n\n` +
    a.map((p) => `- ${p.passes ? '✓' : '✗'} ${p.label}: **${p.ratio}:1**, needs ${p.min}`).join('\n') })()}

${clash.length ? `## Names two kits both use

These variables mean different things to different kits you enabled. Whichever
stylesheet loads second wins, and nothing warns.

${clash.map((c) => `- \`${c.variable}\`: written for **${kits[c.written].name}**, but **${kits[c.read].name}** also reads it (its own value: \`${c.theirValue}\`). Load their stylesheets in separate scopes, or drop one of the two.`).join('\n')}

` : ''}## The rule this was generated under

No value here was invented. Each kit's defaults were read from what it
publishes, and every variable written belongs to the kit that publishes it. Where
a kit could not take a value, this file says so rather than the package pretending.
`
}

/**
 * The file you hand a coding agent.
 *
 * The consumer of a design system is increasingly not a person clicking a
 * dashboard but an agent that was asked to build something and has nothing to
 * reach for. So the package carries a file written FOR that reader: what the
 * system is, in its own vocabulary, and the two or three things it must not do.
 */
/**
 * DESIGN.md, to Google Labs' published spec.
 *
 * The format is not ours to design. Google Labs specced it in April 2026 with a
 * fixed section order, a YAML front matter schema and a linter, and at least
 * three generators already emit it. So we conform, for the same reason we read
 * a kit's defaults instead of typing them: a shape someone else publishes and
 * validates is worth more than a shape of our own.
 *
 * What we bring to it is what nobody else can fill honestly. Their `components`
 * block is handwork for every other tool — you type that a button's background
 * is {colors.primary} — because they have no kit. We routed those values into
 * the kit ourselves, so we already know. And their `omitted` field, which
 * exists to record sections you left out ON PURPOSE, is exactly the place for
 * what a stack cannot express.
 *
 * SECTION ORDER IS PART OF THE SPEC and duplicate headings are an error, so the
 * order below is the order there: Overview, Colors, Typography, Layout,
 * Elevation & Depth, Shapes, Components, Do's and Don'ts.
 */

/* our role names → the names the spec recommends */
const SPEC_COLOR = {
  brand: 'primary', onBrand: 'on-primary', page: 'surface', surface: 'surface-container',
  ink: 'on-surface', inkMuted: 'on-surface-variant', line: 'outline',
  success: 'success', warning: 'warning', danger: 'error', focus: 'focus',
}

const yamlStr = (v) => `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

function designMd(routed, kits, values, { name = 'Design system', parts = [], overview = '' } = {}) {
  const has = (r) => values[r] != null && values[r] !== ''
  const stack = routed.map((r) => {
    const k = kits[r.kit]
    const role = k.layer === 'tokens' ? 'variables only' : k.standalone || k.layer === 'utility' ? 'base' : 'components'
    return `${k.name}${k.version ? ` ${k.version}` : ''} (${role})`
  }).join(' + ')
  const seen = routed.at(-1)
  const seenKit = kits[seen?.kit]

  /* ── front matter ─────────────────────────────────────────────────────── */
  const colors = ROLES.filter((r) => KIND[r.id] === 'colour' && has(r.id))
    .map((r) => `  ${SPEC_COLOR[r.id] ?? r.id}: ${yamlStr(values[r.id])}`)

  /* Only fields the user actually set. A Typography object with an invented
   * heading size would be the one thing this whole project refuses to do. */
  const typeBlock = (label, family, weight) => {
    const lines = []
    if (family) lines.push(`    fontFamily: ${yamlStr(family)}`)
    if (label === 'body-md' && has('baseText')) lines.push(`    fontSize: ${yamlStr(values.baseText)}`)
    if (weight) lines.push(`    fontWeight: ${weight}`)
    if (has('lineHeight')) lines.push(`    lineHeight: ${values.lineHeight}`)
    if (has('letterSpacing')) lines.push(`    letterSpacing: ${yamlStr(values.letterSpacing)}`)
    return lines.length ? [`  ${label}:`, ...lines] : []
  }
  const typography = [
    ...typeBlock('headline-lg', values.fontHeading, has('fontWeight') ? values.fontWeight : null),
    ...typeBlock('body-md', values.fontBody ?? values.fontHeading, null),
  ]

  const rounded = has('radius') ? [`  md: ${yamlStr(values.radius)}`] : []
  /* the step every spacing utility in this stack is a multiple of, if the kit
     let us write one */
  /* across the whole stack: it is Tailwind that carries the step, and shadcn —
     the layer you are looking at — inherits it. */
  const spaceVar = routed.flatMap((r) => Object.entries(r.vars))
    .find(([n]) => /^--spacing$|spacing-md$|^--size-3$/.test(n))
  const spacing = spaceVar ? [`  base: ${yamlStr(spaceVar[1])}`] : []

  /* The block that is handwork everywhere else. These are the roles the kit's
     own components read — which is what routing them MEANS. */
  const components = has('brand') ? [
    '  button-primary:',
    '    backgroundColor: "{colors.primary}"',
    ...(has('onBrand') ? ['    textColor: "{colors.on-primary}"'] : []),
    ...(rounded.length ? ['    rounded: "{rounded.md}"'] : []),
    ...(has('surface') ? [
      '  card:', '    backgroundColor: "{colors.surface-container}"',
      ...(has('ink') ? ['    textColor: "{colors.on-surface}"'] : []),
      ...(rounded.length ? ['    rounded: "{rounded.md}"'] : []),
    ] : []),
    ...(has('line') ? [
      '  input:',
      ...(has('surface') ? ['    backgroundColor: "{colors.surface-container}"'] : []),
      ...(has('ink') ? ['    textColor: "{colors.on-surface}"'] : []),
      ...(rounded.length ? ['    rounded: "{rounded.md}"'] : []),
    ] : []),
  ] : []

  /* omitted: the spec's own field for sections left out on purpose, which is
     the honest half of this tool given a standard place to live. */
  const omitted = []
  if (!typography.length) omitted.push(['typography', 'no family was chosen'])
  if (!rounded.length) omitted.push(['rounded', 'no radius was set'])
  if (!spacing.length) {
    const why = routed.map((r) => (coverage(r.kit).missing.includes('space') ? kits[r.kit].name : null)).filter(Boolean)
    omitted.push(['spacing', why.length ? `${why.join(' and ')} publishes no spacing scale` : 'this stack scales its own step rather than naming one'])
  }
  if (!components.length) omitted.push(['components', 'no brand colour was set, so no component could be described'])

  const front = [
    'version: alpha',
    `name: ${yamlStr(name)}`,
    `description: ${yamlStr(stack)}`,
    ...(omitted.length ? ['omitted:', ...omitted.map(([sec, why]) => `  - section: ${sec}\n    reason: ${yamlStr(why)}`)] : []),
    ...(colors.length ? ['colors:', ...colors] : []),
    ...(typography.length ? ['typography:', ...typography] : []),
    ...(rounded.length ? ['rounded:', ...rounded] : []),
    ...(spacing.length ? ['spacing:', ...spacing] : []),
    ...(components.length ? ['components:', ...components] : []),
  ].join('\n')

  /* ── the prose ────────────────────────────────────────────────────────── */
  const bad = auditContrast(values).filter((p) => !p.passes)
  const warnings = bad.map((p) => {
    const fg = ROLES.find((r) => r.id === p.fg)?.label ?? p.fg
    const bg = ROLES.find((r) => r.id === p.bg)?.label.toLowerCase() ?? p.bg
    const head = `${fg} is ${p.ratio}:1 against ${bg}, under the ${p.min}:1 it needs.`
    return p.min >= 4.5
      ? `${head} That pairing fails for body text. Darken one of them, or use it only at 24px, or 19px bold, where 3:1 is the bar.`
      : `${head} Use it for fills and decoration, never as the only thing marking a control apart from its background.`
  })

  const gaps = routed.flatMap((r) => (COMPONENT_GAPS[r.kit] ?? []).map(([part, why]) => [kits[r.kit].name, part, why]))
  const webs = webfonts(values)

  /* Elevation is not a mood here, it is a measurement: whether the stack
   * publishes a shadow scale at all, and where the knob sits. */
  const lifts = routed.some((r) => !coverage(r.kit).missing.includes('elevation'))
  const strength = parseFloat(values.elevation ?? '1')
  const depth = !lifts
    ? `Nothing in this stack publishes a shadow scale, so depth here is a border and a change of surface, never a drop shadow.`
    : strength <= 0.05
      ? `Shadows are turned off. Depth comes from the border and from the step between the page and a surface.`
      : `Depth comes from ${seenKit?.name ?? 'the kit'}'s own shadow scale at ${Math.round(strength * 100)}% of its published strength, together with a ${values.borderWidth ?? '1px'} border. Use both; do not invent a third.`

  return `---
${front}
---

# ${name}

## Overview

${overview.trim() || `No brand description was written. This system is defined by its values, not by a
mood: ${stack} with the colours, type and shape below.`}

## Colors

Every colour here is written into a variable ${stack.includes('+') ? 'those kits publish' : 'that kit publishes'};
none of them is a name invented for this file.
${warnings.length ? `\n${warnings.join('\n')}\n` : ''}
## Typography

${values.fontHeading ? `Headings are set in ${values.fontHeading}.\nBody text is set in ${values.fontBody ?? values.fontHeading}.` : 'No family was chosen; the kit\'s own stack is in use.'}
${webs.length ? `\n${webs.map((f) => `**${f.family}**`).join(' and ')} must be fetched. Put this in the document head,
or every measurement in this file is off:

\`\`\`html
${fontLink(webs.map((f) => f.family))}
\`\`\`
` : ''}
## Layout

${spacing.length
  ? `Every gap, padding and margin in this stack is a multiple of \`spacing.base\`. Use the
kit's own spacing utilities rather than a pixel value.`
  : `This stack names no spacing scale. Use the kit's own spacing utilities and keep them
consistent; do not introduce a scale of your own.`}

## Elevation & Depth

${depth}

## Shapes

${has('radius')
  ? `One radius, \`rounded.md\` at ${values.radius}. The kit scales its own smaller and larger
corners from it, so use its named radii rather than a literal.`
  : 'No radius was set; the kit\'s own corners are in use.'}

## Components

The components come from ${stack}. Use them. Do not write a new button, card or
input: one already exists, and the values above are what it reads.
${parts.length ? `\nThe wall this system was checked against covers: ${parts.join(', ')}.` : ''}
${gaps.length ? `\n${gaps.map(([, part, why]) => `- **${part}**: ${why}.`).join('\n')}` : ''}

## Do's and Don'ts

- **Never write a raw hex, radius or font size.** Every one of them is a variable
  in \`theme.css\`, in the vocabulary of the kit you are rendering with.
- **Never add a second UI library.** If something is missing, compose it from the
  components above and the values in this file.
${warnings.map((w) => `- ${w}`).join('\n')}
${gaps.map(([kit, part]) => `- **Do not install a dependency for a ${part}.** ${kit} ships none on purpose; build it from the parts above.`).join('\n')}
- **This project may already contain colours, radii and font sizes that are not in
  this file.** Replace them with the nearest role here. Do not keep a value because
  it is already in the code.
- **If this system cannot express something you need, say so** rather than inventing
  it. \`MANIFEST.md\` lists what could not be set and why.
`
}

/* ────────────────────────────────────────────────────────────────────────────
 * THE SKILL — the procedural half of the export.
 *
 * DESIGN.md says what is TRUE: the values, where they come from, what could
 * not be set. SKILL.md says what to DO: the order of work on a screen, how
 * controls sit next to each other, where motion comes from, which icons, and
 * the checks that catch drift. Claude Code loads .claude/skills/<name>/SKILL.md
 * on its own when the work is UI — the difference between a brief someone must
 * remember to paste and one that is simply there.
 *
 * Every kit-specific name below is published: a class their stylesheet
 * defines, an element their package registers, a component their docs install.
 * fidelity.mjs looks the class-shaped ones up in each kit's own compiled
 * sheet, so an invented citation fails that gate by name, like the wall does.
 */
export const SKILL_VOCAB = {
  tailwind: {
    ladder: 'compose button recipes from utilities and keep exactly one solid brand recipe; every other action steps down to outline or plain text',
    group: 'a flex container with one gap-* step; attached segments are a single rounded container',
    busy: '`animate-pulse` on a neutral block is the loading state; `animate-spin` marks a working control',
    motion: 'the `transition` utilities with its own ease vars; the only keyframes it ships are `spin`, `ping` and `pulse` — write no others',
    icons: 'Heroicons (`heroicons`, the 24/outline set) — the companion set from the same authors',
    sheetClasses: [],
  },
  daisyui: {
    ladder: 'one `btn-primary` per view; the rest are `btn-ghost`, `btn-outline` or plain `btn`',
    group: '`join` with `join-item` children when controls are one control; a flex gap when they are neighbours',
    busy: '`loading` inside the control that is working; `skeleton` for content that has not arrived',
    motion: 'its components carry their own transitions — add none on top',
    icons: 'daisyUI names no icon set; this system was proofed with Lucide — whichever set you pick, use one',
    sheetClasses: ['btn', 'btn-primary', 'btn-ghost', 'btn-outline', 'join', 'join-item', 'loading', 'skeleton'],
  },
  shadcn: {
    ladder: 'one Button `default` per view; the rest are `secondary`, `outline` or `ghost`, and destructive actions are `destructive`',
    group: 'a flex container with one gap-* step — shadcn/ui ships no group wrapper on purpose',
    busy: 'the Skeleton component for content that has not arrived; `animate-pulse` is what it runs on',
    motion: null, // written from kit.animates at generate time — their companion package, read, not typed
    icons: 'Lucide (`lucide-react`) — the set its own installer adds',
    sheetClasses: [],
  },
  bootstrap: {
    ladder: 'one `btn-primary` per view; the rest are `btn-outline-secondary` or `btn-link`',
    group: '`btn-group` when controls are one control; `btn-toolbar` with gap when they are neighbours',
    busy: '`spinner-border` inside the control that is working; `placeholder` with `placeholder-glow` for content that has not arrived',
    motion: 'its components carry their own transitions, and `fade` and `collapse` are its words for enter and leave — add no keyframes of yours',
    icons: 'Bootstrap Icons (`bootstrap-icons`) — the companion set from the same team',
    sheetClasses: ['btn', 'btn-primary', 'btn-outline-secondary', 'btn-link', 'btn-group', 'btn-toolbar', 'spinner-border', 'placeholder', 'placeholder-glow', 'fade', 'collapse'],
  },
  material: {
    ladder: 'one `md-filled-button` per view; the rest are `md-filled-tonal-button` and `md-text-button`',
    group: 'no group component exists; a flex gap, one step, and the filled one sits last in reading order',
    busy: '`md-circular-progress` inside or beside the control that is working',
    motion: 'its elements animate themselves to the M3 motion spec, and the package publishes no motion variables to retune — leave motion theirs',
    icons: 'Material Symbols (`@material-symbols/svg-400`, outlined) — the set the spec names',
    sheetClasses: [],
    elements: ['md-filled-button', 'md-filled-tonal-button', 'md-text-button', 'md-circular-progress'],
  },
  radix: {
    ladder: 'one Button `variant="solid"` per view; the rest are `soft` and `ghost`',
    group: 'a Flex with one gap step — Radix Themes ships no group wrapper',
    busy: 'the Spinner component inside the control that is working; Skeleton for content that has not arrived',
    motion: 'its components carry their own transitions — add none on top',
    icons: 'Radix Icons (`@radix-ui/react-icons`) — the companion set from the same team',
    sheetClasses: ['rt-Button', 'rt-Flex', 'rt-Spinner', 'rt-Skeleton'],
  },
  mantine: {
    ladder: 'one Button `variant="filled"` per view; the rest are `light`, `subtle` or `default`',
    group: 'the Group component with its own spacing prop; Stack for the vertical case',
    busy: 'the Loader component inside the control that is working; Skeleton for content that has not arrived',
    motion: 'its components carry their own transitions — add none on top',
    icons: 'Tabler (`@tabler/icons`) — the set its own docs reach for',
    sheetClasses: [],
    mantineClasses: ['Button', 'Group', 'Stack', 'Loader', 'Skeleton'],
  },
  antd: {
    ladder: 'one Button `type="primary"` per view; the rest are `default` and `type="text"`',
    group: 'the Space or Flex component with one size step — never margins between siblings',
    busy: 'the Spin component around what is working; its own `loading` prop on a Button',
    motion: 'its components move on their own motion tokens — add no CSS transitions on top',
    icons: "Ant Design's own icons (`@ant-design/icons`) — the only set its components expect",
    sheetClasses: [],
    antdClasses: ['ant-btn', 'ant-space', 'ant-flex', 'ant-spin'],
  },
  openprops: {
    ladder: 'Open Props ships variables, not components: keep one solid brand treatment and step everything else down to outline or text',
    group: 'a flex container with one gap from its own size scale',
    busy: 'compose it: an element on its own `--animation-*` entry',
    motion: 'the one kit here that publishes motion itself: `--ease-1` through `--ease-5`, the spring eases and the `--animation-*` set — compose from those and write no keyframes',
    icons: 'Open Props names no icon set; pick one and use one',
    sheetClasses: [],
  },
}

const slugOf = (name) => String(name ?? '').trim().toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'design-system'

/* The dark sentence, written FROM the DARK table rather than next to it, so
 * the skill can never disagree with the block theme.css actually carries. */
const darkLineOf = (id, kit) => {
  const d = DARK[id]
  if (d === null) return `${kit.name} ships the \`dark:\` variant but publishes no dark values; this export carries none for it. Leave dark off rather than inventing half of one.`
  if (d === 'theme') return `dark is its second theme block in \`theme.css\` — switch by setting \`data-theme\` on \`<html>\`, never by overriding colours.`
  if (d === 'algorithm') return `dark is \`theme.darkAlgorithm\` over the same seeds in \`antd.theme.ts\` — never a CSS override on top.`
  if (d.startsWith('@media')) return `dark follows the operating system through ${kit.name}'s own media block in \`theme.css\`.`
  return `the switch is \`${d.split(',')[0].trim()}\` on the root — their components listen for it; never write a parallel palette.`
}

export function skillMd(routed, kits, values, { name = 'Design system' } = {}) {
  const chosen = routed.map((r) => r.kit)
  const stack = routed.map((r) => stamp(kits[r.kit])).join(' + ')
  const slug = slugOf(name)
  const perKit = (field) => routed.map((r) => {
    const v = SKILL_VOCAB[r.kit]?.[field]
    if (field === 'motion' && !v && kits[r.kit]?.animates?.npm) {
      const a = kits[r.kit].animates
      return `- **${kits[r.kit].name}**: motion ships as its own companion, \`${a.npm}\` ${a.version} — use its entrance and exit classes and write no keyframes.`
    }
    return v ? `- **${kits[r.kit].name}**: ${v}.` : null
  }).filter(Boolean).join('\n')
  const darkLines = routed.map((r) => `- **${kits[r.kit].name}**: ${darkLineOf(r.kit, kits[r.kit])}`).join('\n')

  /* the spacing sentence DESIGN.md derives, reused so the two never diverge */
  const spaceVar = routed.flatMap((r) => Object.entries(r.vars))
    .find(([n]) => /^--spacing$|spacing-md$|^--size-3$/.test(n))
  const distance = spaceVar
    ? `This stack names a spacing step (\`${spaceVar[0]}\`: ${spaceVar[1]}). Inside a group use one step; between groups, two to three; between sections, four or more. Three distances, kept apart — a screen where every gap is equal has no structure to read.`
    : `This stack names no spacing scale, so pick three distances from the kit's own utilities and hold them: tight inside a group, wider between groups, widest between sections. A screen where every gap is equal has no structure to read.`

  /* every OTHER kit's package is a named foreign import — derived from the
   * same table the generator routes with, so the list is never stale. A kit a
   * chosen one RUNS ON is not foreign: daisyUI's engine is Tailwind, and
   * flagging `from 'tailwindcss'` in a daisyUI project would flag its own
   * build. bands.engine carries that relation, read from the packages. */
  const engines = new Set(routed.map((r) => kits[r.kit]?.bands?.engine).filter((e) => e && e !== 'own'))
  const foreign = Object.entries(kits)
    .filter(([id, k]) => !chosen.includes(id) && !engines.has(id) && k?.npm)
    .map(([, k]) => k.npm)

  const emptyGaps = routed.flatMap((r) => (COMPONENT_GAPS[r.kit] ?? [])
    .filter(([part]) => part === 'empty')
    .map(() => `${kits[r.kit].name} ships no empty-state component — compose one from its text styles and one quiet action, and keep it one move: say what is missing, offer the one way to fill it`))

  return `---
name: ${slug}
description: Use when building or changing any user interface in this project — a screen, a component, a dashboard, a style, a layout. Carries the composition rules, motion, icon and state discipline for ${stack}, on top of the design system in DESIGN.md.
---

# ${name} — the working skill

This project's design system is ${stack}, themed in \`theme.css\` and documented
in \`DESIGN.md\`. That file is the contract: read it once per session before any
UI work. This skill is the other half — not what is true, but what to do.

## The order of work

On any new screen or component, in this order:

1. **Regions before components.** Name the regions (navigation, header, content,
   detail) and set their distances first. A screen laid out back-to-front is
   polish on the wrong skeleton.
2. **The kit's component, or nothing.** Every part you need either exists in
   ${stack} — then use it, with the variables from \`theme.css\` — or it is named
   as a gap in \`DESIGN.md\`, with what to compose it from. Never a third source.
3. **States with the component, not after it.** A data view is not done with its
   happy path: empty, loading and error ship in the same change.
4. **Then the passes:** hierarchy (one primary action), distance (three steps,
   held), dark (the kit's own switch), and the self-check below.

## One primary action

A view earns one solid, brand-coloured action. Everything else steps down the
kit's own ladder:

${perKit('ladder')}

Two solid primaries side by side is the most common AI tell there is. When two
actions feel equally important, one of them is not.

## Controls side by side

${perKit('group')}

Separation is spacing, never boxes-in-boxes: a toolbar is controls sharing a
gap, not controls sharing a border.

## Visual distance

${distance}

Alignment is part of distance: one left edge per region, labels above inputs,
and numbers right-aligned in tables.

## Motion

Motion answers an interaction; it is never decoration. Opacity and transform
only — nothing that moves layout.

${perKit('motion')}

Everything respects \`prefers-reduced-motion\`; the kits' own components already
do, which is one more reason not to write your own.

## Icons

One set, the kit's own, at one size per context:

${perKit('icons')}

Never two sets on one screen. An icon-only control carries an \`aria-label\`,
and an icon next to a label is decoration — if it adds nothing, drop it.

## States

${perKit('busy')}
${emptyGaps.length ? `\n${emptyGaps.map((g) => `- ${g}.`).join('\n')}\n` : ''}
Focus stays visible on everything interactive: the kits ship their own focus
treatment, and removing an outline without replacing it fails the people who
navigate by keyboard.

## Dark

${darkLines}

## Self-check

Before calling UI work done, run these from the project root; every hit is a
finding:

\`\`\`bash
grep -rn --include='*.css' --include='*.tsx' --include='*.jsx' --include='*.html' -E '#[0-9a-fA-F]{3,8}\\b' src app 2>/dev/null | grep -v theme.css
\`\`\`

A raw hex outside \`theme.css\` is a value the system cannot see. Replace it
with the nearest variable.

\`\`\`bash
grep -rn --include='*.css' '@keyframes' src app 2>/dev/null
\`\`\`

${routed.some((r) => SKILL_VOCAB[r.kit]?.motion || kits[r.kit]?.animates) ? 'This stack already has a motion vocabulary; a new keyframe needs a reason the kit cannot give.' : 'Keep any keyframe you add to opacity and transform.'}
${foreign.length ? `
\`\`\`bash
grep -rn --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' -E "from ['\\"](${foreign.join('|')})(/|['\\"])" src app 2>/dev/null
\`\`\`

A second UI library never arrives as a decision; it arrives as one import. This
project is ${stack} — anything above is a foreign component.
` : ''}
And by eye, one pass: exactly one primary action per view · three distances,
held · every data view has its empty, loading and error state · dark via the
kit's own switch · focus visible everywhere.

---

Generated by [UIcockpit](https://uicockpit.com) from ${stack} — the values in
\`theme.css\`, the reasoning in \`DESIGN.md\`, what could not be done in
\`MANIFEST.md\`. Do not edit by hand; change it where it was made and export
again.
`
}

/**
 * The same values, machine-readable, in the W3C Design Tokens format.
 * Their spec, not a shape of ours — so a tool that reads design tokens can read
 * this one without being told about us.
 */
function tokensJson(values, routed, kits) {
  const group = (kind, type) => Object.fromEntries(ROLES
    .filter((r) => values[r.id] != null && (kind === 'other' ? KIND[r.id] !== 'colour' : KIND[r.id] === 'colour'))
    .map((r) => [r.id, { $type: type, $value: values[r.id], $description: r.what }]))
  return JSON.stringify({
    $description: `Generated from ${routed.map((r) => kits[r.kit].name).join(' + ')}. `
      + 'Every value belongs to the kit that publishes it.',
    color: group('colour', 'color'),
    size: Object.fromEntries(Object.entries(group('other', 'dimension')).map(([k, v]) => [k,
      /^[\d.]+$/.test(String(v.$value)) ? { ...v, $type: 'number' } : v])),
  }, null, 2) + '\n'
}
